import { useAuth } from "@/_core/hooks/useAuth";

import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { WalkthroughModal } from "@/components/WalkthroughModal";
import {
  LayoutDashboard, Building2, ClipboardList,
  LogOut, Menu, X, ChevronLeft, ChevronRight, TrendingUp, AlertCircle, FilePlus,
  Network, Users, Shield, UserCog, Eye,
  MapPin, FileText, GraduationCap, Radio, Lock, ChevronDown, ChevronUp,
  Megaphone, ShieldAlert, BookMarked, ShieldCheck, Flag, Wand2, UserX,
  Star, Settings, History, Bell, BarChart3, Key,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { PrivacyPolicyModal } from "@/components/PrivacyPolicyModal";
import { NotificationBell } from "@/components/NotificationBell";
import { toast } from "sonner";

const LOGO_URL = "https://pursuitpathways.com/content/logo%20five%20stones.png";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** "coming-soon" = feature not built yet; "paid" = requires paid plan */
  locked?: "coming-soon" | "paid";
}

interface NavSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
  defaultOpen?: boolean;
}

const ROLE_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  ultra_admin: { label: "Ultra Admin", variant: "default" },
  admin:       { label: "Admin",       variant: "default" },
  super_admin: { label: "Super Admin", variant: "default" },
  auditor:     { label: "Auditor",     variant: "secondary" },
  user:        { label: "User",        variant: "secondary" },
  viewer:      { label: "Viewer",      variant: "outline" },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const accepted = localStorage.getItem("privacyPolicyAccepted") === "1";
    setPrivacyPolicyAccepted(accepted);
    if (!accepted) {
      const timer = window.setTimeout(() => setPrivacyModalOpen(true), 800);
      return () => window.clearTimeout(timer);
    }
  }, [isAuthenticated]);

  // Determine user role early for feature gating
  const effectiveRole = (user as any)?._isImpersonated
    ? ((user as any)?._realAdminRole ?? user?.role)
    : user?.role;
  const isUltraAdmin = effectiveRole === "ultra_admin" || !!(user as any)?._isImpersonated;

  // Fetch the user's org plan for UI gating
  const { data: orgPlan } = trpc.auth.myPlan.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: isAuthenticated,
  });
  // Ultra admins see everything unlocked — no paywall, no coming-soon blocks
  const isPaid = isUltraAdmin ? true : orgPlan === "paid";
  const utils = trpc.useUtils();
  const stopImpersonationMutation = trpc.adminUser.stopImpersonation.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      window.location.href = "/admin/users";
    },
  });

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    siteAssessments: true,
    visitorManagement: false,
    reporting: false,
    behavioralThreat: false,
    communication: false,
    trainingDrills: false,
    mappingTracking: false,
  });

  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
    onError: () => toast.error("Logout failed"),
  });

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src={LOGO_URL} alt="Five Stones Technology" className="h-40 w-auto max-w-[400px] object-contain animate-pulse" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm mx-auto px-6">
          <img src={LOGO_URL} alt="Five Stones Technology" className="h-40 w-auto max-w-[450px] object-contain mx-auto mb-6" />
          <p className="text-muted-foreground mb-2">Sign in to access your workplace safety assessments.</p>
          <Button asChild size="lg" className="w-full">
            <a href={getLoginUrl()}>Sign In to Continue</a>
          </Button>
        </div>
      </div>
    );
  }

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const isViewer = user?.role === "viewer";
  const isAdmin  = effectiveRole === "admin" || effectiveRole === "ultra_admin" || user?.role === "admin" || user?.role === "ultra_admin";
  const roleBadge = ROLE_BADGE[user?.role ?? "auditor"] ?? ROLE_BADGE.auditor;

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = location === item.href || (item.href !== "/dashboard" && item.href !== "/liability-scan" && item.href !== "/scan-history" && location.startsWith(item.href));

    // Ultra admins bypass all locks — show every nav item as clickable
    if (item.locked === "coming-soon" && !isUltraAdmin) {
      return (
        <div
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/50 cursor-not-allowed select-none"
          title="Coming soon"
          onClick={() => toast.info("This feature is coming soon. Stay tuned!")}
        >
          {item.icon}
          <span className="flex-1">{item.label}</span>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-900/40 text-amber-300 border border-amber-700/50 leading-none">Soon</span>
          <Lock size={10} className="text-sidebar-foreground/30 flex-shrink-0" />
        </div>
      );
    }

    if (item.locked === "paid" && !isPaid) {
      return (
        <div
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/40 cursor-not-allowed select-none"
          title="Upgrade to Pro to unlock"
          onClick={() =>
            toast.info("This feature requires a paid plan. Contact your administrator to upgrade.")
          }
        >
          {item.icon}
          <span className="flex-1">{item.label}</span>
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-sidebar-primary/20 text-sidebar-primary border border-sidebar-primary/30 leading-none flex items-center gap-0.5">
            <Star size={7} className="inline" /> Pro
          </span>
          <Lock size={10} className="text-sidebar-primary/40 flex-shrink-0" />
        </div>
      );
    }

    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "bg-sidebar-accent border border-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white"
        }`}
        onClick={() => setSidebarOpen(false)}
      >
        {item.icon}
        {item.label}
        {isActive && <ChevronRight size={14} className="ml-auto text-sidebar-primary" />}
      </Link>
    );
  };

  const SectionHeader = ({ section }: { section: NavSection }) => {
    const isOpen = openSections[section.id];
    const hasActive = section.items.some(
      (item) => !item.locked && (location === item.href || (item.href !== "/dashboard" && item.href !== "/liability-scan" && item.href !== "/scan-history" && location.startsWith(item.href)))
    );
    return (
      <div>
        <button
          onClick={() => toggleSection(section.id)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            hasActive
              ? "text-sidebar-primary bg-sidebar-accent/50"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-white"
          }`}
        >
          <span className={`flex-shrink-0 ${hasActive ? "text-sidebar-primary" : "text-sidebar-foreground/60"}`}>
            {section.icon}
          </span>
          <span className="flex-1 text-left">{section.label}</span>
          {isOpen ? (
            <ChevronUp size={14} className="text-sidebar-foreground/50 flex-shrink-0" />
          ) : (
            <ChevronDown size={14} className="text-sidebar-foreground/50 flex-shrink-0" />
          )}
        </button>
        {isOpen && (
          <div className="ml-3 pl-3 border-l border-sidebar-border mt-0.5 mb-1 space-y-0.5">
            {section.items.map((item) => (
              <NavLink key={item.href + item.label} item={item} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const NAV_SECTIONS: NavSection[] = [
    {
      id: "siteAssessments",
      label: "Site Assessments",
      icon: <MapPin size={18} />,
      defaultOpen: true,
      items: [
        { href: "/facilities/new", label: "Facility Setup Wizard",  icon: <Wand2 size={15} />,         locked: isPaid ? undefined : "paid" },
        { href: "/facilities",            label: "Facilities",             icon: <Building2 size={15} />,     locked: isPaid ? undefined : "paid" },
        { href: "/facility-mapping",      label: "Facility Mapping",       icon: <MapPin size={15} />,        locked: isPaid ? undefined : "paid" },
        { href: "/audits",                label: "Audit History",          icon: <ClipboardList size={15} />, locked: isPaid ? undefined : "paid" },
        { href: "/eap",                   label: "Emergency Action Plans", icon: <Shield size={15} />,        locked: isPaid ? undefined : "paid" },
      ],
    },
    {
      id: "mappingTracking",
      label: "Mapping And Tracking",
      icon: <MapPin size={18} />,
      items: [
        { href: "/facility-mapping", label: "Facility Mapping", icon: <MapPin size={15} />, locked: isPaid ? undefined : "paid" },
        { href: "/personnel-tracking", label: "Personnel Tracking", icon: <MapPin size={15} />, locked: isPaid ? undefined : "paid" },
      ],
    },
    {
      id: "visitorManagement",
      label: "Visitor Management",
      icon: <Users size={18} />,
      items: [
        { href: "/visitors", label: "Visitor Log", icon: <Users size={15} />, locked: isPaid ? undefined : "paid" },
        { href: "/admin/flagged-visitors", label: "Flagged Visitors", icon: <Flag size={15} />, locked: isPaid ? undefined : "paid" },
      ],
    },
    {
      id: "reporting",
      label: "Reporting",
      icon: <FileText size={18} />,
      items: [
        { href: "/report-incident", label: "Report an Incident", icon: <FilePlus size={15} />,    locked: isPaid ? undefined : "paid" },
        { href: "/incidents",       label: "Incident Reports",   icon: <AlertCircle size={15} />, locked: isPaid ? undefined : "paid" },
      ],
    },
    {
      id: "behavioralThreat",
      label: "Behavioral Threat",
      icon: <UserX size={18} />,
      items: [
        { href: "/btam",     label: "BTAM Cases",  icon: <ShieldAlert size={15} />, locked: isPaid ? undefined : "paid" },
        { href: "/btam/new", label: "New Referral", icon: <FilePlus size={15} />,    locked: isPaid ? undefined : "paid" },
      ],
    },
    {
      id: "communication",
      label: "Communication",
      icon: <Radio size={18} />,
      items: [
        { href: "/mass-notification", label: "Mass Notifications",         icon: <Megaphone size={15} />,   locked: isPaid ? undefined : "paid" },
        { href: "/ras",           label: "Response Activation System", icon: <AlertCircle size={15} />, locked: isPaid ? undefined : "paid" },
        { href: "/staff-checkin", label: "Staff Check-In",             icon: <Users size={15} />,       locked: isPaid ? undefined : "paid" },
      ],
    },
    {
      id: "trainingDrills",
      label: "Training and drills",
      icon: <GraduationCap size={18} />,
      items: [
        { href: "/training-modules", label: "Training Modules",                 icon: <BookMarked size={15} />,    locked: isPaid ? undefined : "paid" },
        { href: "/drills", label: "Drill Planner",                    icon: <ClipboardList size={15} />, locked: isPaid ? undefined : "paid" },
        { href: "/drills/after-action", label: "Drill After-Action",              icon: <TrendingUp size={15} />,    locked: isPaid ? undefined : "paid" },
        { href: "/ras", label: "Drill Response Activation System", icon: <AlertCircle size={15} />,   locked: isPaid ? undefined : "paid" },
      ],
    },
  ];

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`${mobile ? "flex flex-col h-full" : "hidden lg:flex flex-col h-screen fixed top-0 left-0"} w-64 sidebar-metallic`} style={{ zIndex: 2000 }}>
      <div className="flex items-center justify-center px-3 py-3 border-b border-sidebar-border">
          <img src={LOGO_URL} alt="Five Stones Technology" className="h-48 w-full object-contain" />
        {mobile && (
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-sidebar-foreground hover:text-white">
            <X size={18} />
          </button>
        )}
      </div>

      {isViewer && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
          <Eye size={14} className="text-amber-400 flex-shrink-0" />
          <p className="text-[11px] text-amber-300 font-medium leading-tight">
            Read-only access. Contact your admin to request Auditor access.
          </p>
        </div>
      )}

      {!isPaid && (
        <div className="mx-3 mt-3 px-3 py-2.5 rounded-lg bg-sidebar-accent/50 border border-sidebar-border flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <Star size={12} className="text-sidebar-primary flex-shrink-0" />
            <p className="text-[11px] text-sidebar-primary font-semibold leading-tight">Free Plan</p>
          </div>
          <p className="text-[10px] text-sidebar-foreground/60 leading-tight">
            Upgrade to unlock all modules: audits, EAP, BTAM, visitor management, and more.
          </p>
        </div>
      )}

      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        <NavLink item={{ href: "/liability-scan", label: "Readiness Scan",   icon: <ShieldAlert size={18} /> }} />
        <NavLink item={{ href: "/scan-history",    label: "Scan History",     icon: <History size={18} /> }} />
        <NavLink item={{ href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> }} />
        {NAV_SECTIONS.map((section) => (
          <SectionHeader key={section.id} section={section} />
        ))}
        <div className="pt-2 pb-1">
          <p className="text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-1">Resources</p>
        </div>
        <NavLink item={{ href: "/standards",      label: "Standards & Regs", icon: <ShieldCheck size={18} /> }} />
        {isAdmin && (
          <>
            <div className="pt-2 pb-1">
              <p className="text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-1">Admin</p>
            </div>
            <NavLink item={{ href: "/analytics",     label: "Analytics Dashboard", icon: <BarChart3 size={18} /> }} />
            <NavLink item={{ href: "/organizations", label: "Organizations",      icon: <Network size={18} /> }} />
            <NavLink item={{ href: "/admin/users",   label: "User Management",    icon: <UserCog size={18} /> }} />
            <NavLink item={{ href: "/admin/api-keys", label: "API Keys",          icon: <Key size={18} /> }} />
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/40">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name ?? "Auditor"}</p>
            <Badge variant={roleBadge.variant} className="text-[10px] h-4 px-1.5 mt-0.5">
              {roleBadge.label}
            </Badge>
          </div>
          <Link
            href="/settings"
            className="text-sidebar-foreground/60 hover:text-sidebar-primary transition-colors"
            title="Settings"
            onClick={() => setSidebarOpen(false)}
          >
            <Settings size={15} />
          </Link>
          <button
            onClick={() => logout.mutate()}
            className="text-sidebar-foreground/60 hover:text-destructive transition-colors"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {user && privacyPolicyAccepted === false && (
        <PrivacyPolicyModal
          open={privacyModalOpen}
          onAccept={() => {
            localStorage.setItem("privacyPolicyAccepted", "1");
            setPrivacyPolicyAccepted(true);
            setPrivacyModalOpen(false);
          }}
          onClose={() => setPrivacyModalOpen(false)}
        />
      )}
      {/* First-login walkthrough — only shown when user.hasSeenWalkthrough is false and the privacy policy has been accepted */}
      {user && privacyPolicyAccepted === true && (
        <WalkthroughModal
          user={{
            hasSeenWalkthrough: (user as any).hasSeenWalkthrough ?? false,
            role: user.role as any,
            name: user.name,
          }}
          isPaid={isPaid}
        />
      )}
      <Sidebar />
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64">
            <Sidebar mobile />
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64" style={{ pointerEvents: "auto" }}>
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-40">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu size={20} />
          </button>
          <img src={LOGO_URL} alt="Five Stones Technology" className="h-24 w-auto max-w-[320px] object-contain" />
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>
        {/* Impersonation Banner — shown on every page when Ultra Admin is acting as another user */}
        {!!(user as any)?._isImpersonated && (
          <div className="bg-purple-600 text-white px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium z-50 sticky top-0">
            <div className="flex items-center gap-2">
              <Shield size={15} />
              <span>
                Acting as: <strong>{user?.name ?? user?.email ?? "Unknown User"}</strong>
                {(user as any)._realAdminName && (
                  <span className="opacity-80 font-normal ml-2">
                    (your real account: {(user as any)._realAdminName ?? (user as any)._realAdminEmail})
                  </span>
                )}
              </span>
            </div>
            <button
              className="text-white/80 hover:text-white underline text-xs"
              onClick={async () => {
                try {
                  await stopImpersonationMutation.mutateAsync();
                } catch {}
              }}
              disabled={stopImpersonationMutation.isPending}
            >
              {stopImpersonationMutation.isPending ? "Stopping…" : "Stop Impersonation"}
            </button>
          </div>
        )}
        <main className="flex-1 overflow-auto bg-background">
          <div className="border-b border-border bg-card px-6 py-4 sticky top-0 z-20">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate("/dashboard");
              }
            }}
            className="inline-flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
          <NotificationBell />
        </div>
      </div>
      {children}
        </main>
        <footer className="border-t border-border bg-card px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Five Stones Technology. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <a href="mailto:info@fivestonestechnology.com" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
