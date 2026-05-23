/**
 * WalkthroughModal
 *
 * First-login feature walkthrough modal, tier-aware and role-aware.
 * Shown automatically when `user.hasSeenWalkthrough === false`.
 * Dismissed by clicking "Finish" or "Skip" — both call settings.markWalkthroughSeen.
 *
 * Tier logic:
 *   free plan  → shows Liability Scan walkthrough only
 *   paid plan  → shows full platform walkthrough based on user's role
 *
 * Role logic (paid plan):
 *   ultra_admin / super_admin / admin → all features
 *   auditor                           → scan, assessments, EAPs, reports
 *   user                              → RAS alerts, drills, incident reporting
 *   viewer                            → scan, reports (read-only)
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  ClipboardList,
  Bell,
  FileText,
  Users,
  BarChart2,
  Zap,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Lock,
  Building2,
  AlertTriangle,
  Settings,
} from "lucide-react";

// ─── Step definitions ─────────────────────────────────────────────────────────

type WalkthroughStep = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  feature: string;
  href?: string;
  badge?: string;
  color: string;
};

const WELCOME_STEP: WalkthroughStep = {
  id: "welcome",
  icon: <ShieldAlert className="w-8 h-8" />,
  title: "Welcome to Five Stones Workplace Safety",
  description:
    "This quick walkthrough will show you the features available on your plan. You can revisit this tour anytime from your Settings page.",
  feature: "Getting Started",
  color: "#0B1F33",
};

// ── Free tier steps ────────────────────────────────────────────────────────────
const FREE_STEPS: WalkthroughStep[] = [
  {
    id: "liability-scan",
    icon: <ShieldAlert className="w-8 h-8" />,
    title: "Workplace Violence Readiness Scan",
    description:
      "Your primary tool on the free plan. Answer 16 questions about your organization's safety posture and receive an instant readiness level, a structural score, and your top priorities for improvement.",
    feature: "Readiness Scan",
    href: "/liability-scan",
    badge: "Free",
    color: "#E5484D",
  },
  {
    id: "scan-results",
    icon: <BarChart2 className="w-8 h-8" />,
    title: "Understanding Your Results",
    description:
      "After running the scan you'll see: your readiness level badge, a Structural Score (0–100%), Tier 3 critical failures, and a ranked list of Top Priorities. A copy of your results is automatically emailed to you.",
    feature: "Scan Results",
    href: "/liability-scan",
    badge: "Free",
    color: "#3A5F7D",
  },
  {
    id: "upgrade",
    icon: <Lock className="w-8 h-8" />,
    title: "Unlock the Full Platform",
    description:
      "Upgrade to a paid plan to access Site Assessments, Emergency Action Plans (EAPs), Real-Time Alert System (RAS), Drills, Incident Reporting, BTAM, and more. Contact your administrator or visit the upgrade page.",
    feature: "Upgrade",
    color: "#C9A86A",
  },
];

// ── Paid — Admin / Super Admin / Ultra Admin steps ─────────────────────────────
const ADMIN_STEPS: WalkthroughStep[] = [
  {
    id: "liability-scan",
    icon: <ShieldAlert className="w-8 h-8" />,
    title: "Workplace Violence Readiness Scan",
    description:
      "Run a 16-question scan to assess your organization's readiness posture. Results include a readiness level, structural score, and prioritized action items. Results are saved to your account and emailed automatically.",
    feature: "Readiness Scan",
    href: "/liability-scan",
    color: "#E5484D",
  },
  {
    id: "site-assessments",
    icon: <Building2 className="w-8 h-8" />,
    title: "Site Assessments",
    description:
      "Conduct detailed facility assessments across 5 categories: Planning & Documentation, Training & Awareness, Reporting & Communication, Response Readiness, and Critical Risk Factors. Generate full audit reports and EAPs.",
    feature: "Site Assessments",
    href: "/facilities",
    color: "#3A5F7D",
  },
  {
    id: "eap",
    icon: <FileText className="w-8 h-8" />,
    title: "Emergency Action Plans (EAPs)",
    description:
      "Generate, edit, and export Emergency Action Plans directly from your site assessment data. EAPs are structured by section and can be exported as professional PDF documents.",
    feature: "EAPs",
    href: "/facilities",
    color: "#0B1F33",
  },
  {
    id: "ras",
    icon: <Bell className="w-8 h-8" />,
    title: "Real-Time Alert System (RAS)",
    description:
      "Trigger instant lockdown / lockout alerts to all staff. Track acknowledgments and responses in real time. Admins can view the full alert history and response log.",
    feature: "RAS Alerts",
    href: "/ras",
    color: "#E5484D",
  },
  {
    id: "drills",
    icon: <Zap className="w-8 h-8" />,
    title: "Drills",
    description:
      "Create, schedule, and run safety drills. Assign participants, track completion, and review results. Drill templates can be reused across facilities.",
    feature: "Drills",
    href: "/drills",
    color: "#3A5F7D",
  },
  {
    id: "incidents",
    icon: <AlertTriangle className="w-8 h-8" />,
    title: "Incident Reporting",
    description:
      "Staff can submit incident reports via a public portal. Admins can review, triage, and update the status of each report. Repeat incidents and flagged individuals are automatically surfaced.",
    feature: "Incidents",
    href: "/incidents",
    color: "#F59E0B",
  },
  {
    id: "user-management",
    icon: <Users className="w-8 h-8" />,
    title: "User Management",
    description:
      "Manage your team's roles and permissions. Assign Super Admin, Admin, Auditor, or User roles. Use optional permission flags to grant specific capabilities (e.g. trigger alerts, run drills) to individual members.",
    feature: "User Management",
    href: "/admin/users",
    color: "#0B1F33",
  },
  {
    id: "settings",
    icon: <Settings className="w-8 h-8" />,
    title: "Settings & Preferences",
    description:
      "Customize your experience: switch between light and dark mode, adjust font size, change your display name, manage notification preferences, and review your account security.",
    feature: "Settings",
    href: "/settings",
    color: "#64748B",
  },
];

// ── Paid — Auditor steps ───────────────────────────────────────────────────────
const AUDITOR_STEPS: WalkthroughStep[] = [
  {
    id: "liability-scan",
    icon: <ShieldAlert className="w-8 h-8" />,
    title: "Workplace Violence Readiness Scan",
    description:
      "Run or review the organization's Workplace Violence Readiness Scan. As an Auditor, you can view and edit scan results, add compliance notes, and export reports.",
    feature: "Readiness Scan",
    href: "/liability-scan",
    color: "#E5484D",
  },
  {
    id: "site-assessments",
    icon: <Building2 className="w-8 h-8" />,
    title: "Site Assessments",
    description:
      "Conduct and review facility assessments. You have full read and edit access to assessment responses, findings, and corrective action recommendations.",
    feature: "Site Assessments",
    href: "/facilities",
    color: "#3A5F7D",
  },
  {
    id: "eap",
    icon: <FileText className="w-8 h-8" />,
    title: "Emergency Action Plans (EAPs)",
    description:
      "Review and edit Emergency Action Plans. You can view all EAP sections, add audit findings, and export EAP documents as PDFs.",
    feature: "EAPs",
    href: "/facilities",
    color: "#0B1F33",
  },
  {
    id: "reports",
    icon: <BarChart2 className="w-8 h-8" />,
    title: "Reports & Exports",
    description:
      "Access and export all assessment reports, scan results, and EAP documents. Use the export function to generate PDF reports for compliance review.",
    feature: "Reports",
    color: "#3A5F7D",
  },
  {
    id: "settings",
    icon: <Settings className="w-8 h-8" />,
    title: "Settings & Preferences",
    description:
      "Customize your experience: switch between light and dark mode, adjust font size, change your display name, and manage notification preferences.",
    feature: "Settings",
    href: "/settings",
    color: "#64748B",
  },
];

// ── Paid — User (general staff) steps ─────────────────────────────────────────
const USER_STEPS: WalkthroughStep[] = [
  {
    id: "ras",
    icon: <Bell className="w-8 h-8" />,
    title: "RAS Alerts",
    description:
      "You will receive Real-Time Alert System (RAS) notifications when an emergency is triggered. Acknowledge alerts and update your location directly from the alert screen.",
    feature: "RAS Alerts",
    href: "/ras",
    color: "#E5484D",
  },
  {
    id: "drills",
    icon: <Zap className="w-8 h-8" />,
    title: "Drills",
    description:
      "You may be assigned to participate in safety drills. When a drill is active, you'll receive a notification. Follow the instructions and mark your participation complete.",
    feature: "Drills",
    href: "/drills",
    color: "#3A5F7D",
  },
  {
    id: "incidents",
    icon: <AlertTriangle className="w-8 h-8" />,
    title: "Incident Reporting",
    description:
      "Submit incident reports using the public incident portal or the in-app reporting form. Your report will be reviewed by your organization's safety team.",
    feature: "Incidents",
    href: "/incidents",
    color: "#F59E0B",
  },
  {
    id: "liability-scan",
    icon: <ShieldAlert className="w-8 h-8" />,
    title: "Workplace Violence Readiness Scan",
    description:
      "Your organization may ask you to complete a Workplace Violence Readiness Scan. This 16-question assessment helps identify safety gaps in your workplace.",
    feature: "Readiness Scan",
    href: "/liability-scan",
    color: "#0B1F33",
  },
  {
    id: "settings",
    icon: <Settings className="w-8 h-8" />,
    title: "Settings & Preferences",
    description:
      "Customize your experience: switch between light and dark mode, adjust font size, and manage your notification preferences.",
    feature: "Settings",
    href: "/settings",
    color: "#64748B",
  },
];

// ── Paid — Viewer steps ────────────────────────────────────────────────────────
const VIEWER_STEPS: WalkthroughStep[] = [
  {
    id: "liability-scan",
    icon: <ShieldAlert className="w-8 h-8" />,
    title: "Workplace Violence Readiness Scan",
    description:
      "As a Viewer, you have read-only access to the organization's Workplace Violence Readiness Scan results and reports.",
    feature: "Readiness Scan",
    href: "/liability-scan",
    color: "#E5484D",
  },
  {
    id: "reports",
    icon: <BarChart2 className="w-8 h-8" />,
    title: "Reports",
    description:
      "You can view all assessment reports and scan results. Contact your administrator if you need to export or edit any data.",
    feature: "Reports",
    color: "#3A5F7D",
  },
  {
    id: "settings",
    icon: <Settings className="w-8 h-8" />,
    title: "Settings & Preferences",
    description:
      "Customize your experience: switch between light and dark mode, adjust font size, and manage your notification preferences.",
    feature: "Settings",
    href: "/settings",
    color: "#64748B",
  },
];

// ─── Helper: resolve steps for user ──────────────────────────────────────────

type UserRole = "ultra_admin" | "super_admin" | "admin" | "auditor" | "user" | "viewer";

function resolveSteps(role: UserRole, isPaid: boolean): WalkthroughStep[] {
  if (!isPaid) return FREE_STEPS;
  if (role === "ultra_admin" || role === "super_admin" || role === "admin") return ADMIN_STEPS;
  if (role === "auditor") return AUDITOR_STEPS;
  if (role === "user") return USER_STEPS;
  return VIEWER_STEPS;
}

// ─── Component ────────────────────────────────────────────────────────────────

type WalkthroughModalProps = {
  user: {
    hasSeenWalkthrough: boolean;
    role: UserRole;
    name?: string | null;
  };
  isPaid: boolean;
};

export function WalkthroughModal({ user, isPaid }: WalkthroughModalProps) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const markSeenMutation = trpc.settings.markWalkthroughSeen.useMutation();

  // Open on first render if user hasn't seen the walkthrough
  useEffect(() => {
    if (!user.hasSeenWalkthrough) {
      // Small delay so the page finishes loading before showing the modal
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [user.hasSeenWalkthrough]);

  const steps: WalkthroughStep[] = [WELCOME_STEP, ...resolveSteps(user.role, isPaid)];
  const totalSteps = steps.length;
  const currentStep = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  function handleDismiss() {
    setOpen(false);
    markSeenMutation.mutate();
  }

  function handleNext() {
    if (isLast) {
      handleDismiss();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function handleBack() {
    if (!isFirst) setStepIndex((i) => i - 1);
  }

  function handleNavigate() {
    if (currentStep.href) {
      handleDismiss();
      navigate(currentStep.href);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDismiss(); }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Colored header band */}
        <div
          className="px-6 py-5 flex items-center gap-4"
          style={{ backgroundColor: currentStep.color }}
        >
          <div className="text-white opacity-90">{currentStep.icon}</div>
          <div>
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-0.5">
              {currentStep.feature}
            </p>
            <DialogTitle className="text-white text-lg font-bold leading-snug m-0 p-0">
              {currentStep.title}
            </DialogTitle>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <DialogDescription className="text-sm text-foreground leading-relaxed m-0">
            {currentStep.description}
          </DialogDescription>

          {/* Badge */}
          {currentStep.badge && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              Included in your {currentStep.badge} plan
            </span>
          )}

          {/* Navigate to feature button */}
          {currentStep.href && (
            <button
              onClick={handleNavigate}
              className="flex items-center gap-1.5 text-sm font-medium text-[#3A5F7D] hover:underline"
            >
              <BookOpen className="w-4 h-4" />
              Go to {currentStep.feature}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Progress dots + navigation */}
        <div className="px-6 pb-5 flex items-center justify-between gap-4">
          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStepIndex(i)}
                className={`rounded-full transition-all ${
                  i === stepIndex
                    ? "w-5 h-2 bg-[#0B1F33]"
                    : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                }`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={handleBack}>
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Back
              </Button>
            )}
            {isFirst && (
              <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-muted-foreground">
                Skip Tour
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
              style={{ backgroundColor: currentStep.color, color: "#fff" }}
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Finish
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Step counter */}
        <div className="px-6 pb-4 text-right">
          <span className="text-xs text-muted-foreground">
            {stepIndex + 1} / {totalSteps}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
