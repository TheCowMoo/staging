import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ExternalLink,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clipboard,
  ChevronRight,
  Shield,
  ArrowRight,
  TrendingUp,
  ClipboardCheck,
  Link2,
  MapPin,
  Info,
  XCircle,
  Briefcase,
  Globe,
  Flag,
  Stethoscope,
  GraduationCap,
  ShoppingCart,
  Factory,
  Landmark,
  Users,
  AlertCircle,
  ShieldCheck,
  Target,
  BookMarked,
  Layers,
  BookOpen,
  Eye,
  Scale,
  ListChecks,
  Zap,
  TrendingDown,
  UploadCloud,
  Wand2,
  Activity,
  ArrowLeft,
} from "lucide-react";
import {
  OSHA_AT_A_GLANCE,
  OSHA_DISCLAIMER,
  OSHA_BASELINE_OVERVIEW,
  OSHA_FIVE_ELEMENTS,
  OSHA_DOCUMENTATION,
  OSHA_RECORDKEEPING,
  OSHA_RESOURCES,
  OSHA_FORMS,
  OSHA_ASSESSMENT_CONNECTION,
} from "../../../shared/oshaContent";
import {
  stateContent,
  STATE_LIST,
  STATE_DISCLAIMER,
  INDUSTRY_OPTIONS,
  resolveStateGuidance,
  type IndustryKey,
  type StateGuidance,
} from "../../../shared/stateContent";
import {
  CANADA_AT_A_GLANCE,
  CANADA_DISCLAIMER,
  CANADA_FEDERAL_OVERVIEW,
  CANADA_CORE_ELEMENTS,
  CANADA_RESOURCES,
  CANADA_ASSESSMENT_CONNECTION,
  PROVINCIAL_CONTENT,
  PROVINCE_LIST,
  type ProvincialGuidance,
} from "../../../shared/jurisdictionContent";
import {
  INDUSTRY_LIST,
  getIndustryOverlay,
  type IndustryOverlay,
} from "../../../shared/industryOverlayContent";

// ─────────────────────────────────────────────────────────────────────────────
// ENHANCEMENT 1 — PROGRAM EXPOSURE SNAPSHOT DATA
// ─────────────────────────────────────────────────────────────────────────────
type SnapshotData = {
  riskLevel: "Low" | "Elevated" | "High";
  commonGaps: string[];
  usExposure: string[];
  caExposure: string[];
  insightLine: string;
};

const INDUSTRY_SNAPSHOT: Record<string, SnapshotData> = {
  healthcare: {
    riskLevel: "High",
    commonGaps: [
      "No documented patient/visitor violence risk assessment",
      "Inconsistent incident reporting — near-misses go unrecorded",
      "Code White / violent patient protocol not drilled or posted",
    ],
    usExposure: [
      "OSHA General Duty Clause citations following patient-on-staff incidents",
      "Civil liability (negligence) claims from injured staff or patients",
      "Increased workers' compensation and insurance scrutiny",
    ],
    caExposure: [
      "WSIB/WCB reporting obligations for all violent incidents",
      "OHSA / provincial OHS Act compliance violations",
      "Civil liability exposure and regulatory investigation",
    ],
    insightLine: "Most organizations identify these gaps AFTER an incident — not before.",
  },
  education: {
    riskLevel: "Elevated",
    commonGaps: [
      "No written threat assessment protocol for student or community threats",
      "Inconsistent lockdown drill frequency and documentation",
      "Visitor management gaps — no sign-in or ID verification",
    ],
    usExposure: [
      "OSHA General Duty Clause citations following campus incidents",
      "Civil liability (negligence) claims from students, parents, or staff",
      "Increased insurance scrutiny and potential coverage gaps",
    ],
    caExposure: [
      "WSIB/WCB reporting obligations for staff injuries from violent incidents",
      "Provincial OHS Act violations for failure to protect workers",
      "Civil liability and school board regulatory scrutiny",
    ],
    insightLine: "Most organizations identify these gaps AFTER an incident — not before.",
  },
  retail: {
    riskLevel: "Elevated",
    commonGaps: [
      "No documented robbery or active threat response procedure",
      "Inconsistent incident reporting — theft and customer conflict go unlogged",
      "No corrective action tracking after near-miss events",
    ],
    usExposure: [
      "OSHA citations following robbery or customer violence incidents",
      "Civil liability (negligence) claims from injured employees",
      "Increased insurance scrutiny after unreported incidents surface",
    ],
    caExposure: [
      "WSIB/WCB reporting obligations for all violent incidents",
      "Provincial OHS Act violations for failure to protect retail workers",
      "Civil liability exposure and potential regulatory fines",
    ],
    insightLine: "Most organizations identify these gaps AFTER an incident — not before.",
  },
  manufacturing: {
    riskLevel: "Elevated",
    commonGaps: [
      "No workplace violence prevention policy specific to shift-change conflicts",
      "Termination and disciplinary procedures lack threat assessment step",
      "Incident logs incomplete — verbal threats not formally recorded",
    ],
    usExposure: [
      "OSHA General Duty Clause citations following internal violence incidents",
      "Civil liability (negligence) claims from injured workers",
      "Increased workers' compensation costs and insurance scrutiny",
    ],
    caExposure: [
      "WSIB/WCB reporting obligations for all violent incidents",
      "Provincial OHS Act violations for failure to address known hazards",
      "Civil liability exposure and potential regulatory investigation",
    ],
    insightLine: "Most organizations identify these gaps AFTER an incident — not before.",
  },
  corporate: {
    riskLevel: "Low",
    commonGaps: [
      "No domestic violence spillover policy or reporting pathway",
      "Termination procedures lack threat assessment or security escort protocol",
      "No corrective action tracking for threatening communications",
    ],
    usExposure: [
      "OSHA General Duty Clause citations following internal threat incidents",
      "Civil liability (negligence) claims from affected employees",
      "Reputational and insurance exposure following high-profile incidents",
    ],
    caExposure: [
      "WSIB/WCB reporting obligations for all violent incidents",
      "Provincial OHS Act violations for failure to address known hazards",
      "Civil liability exposure and potential regulatory scrutiny",
    ],
    insightLine: "Most organizations identify these gaps AFTER an incident — not before.",
  },
  public_government: {
    riskLevel: "Elevated",
    commonGaps: [
      "No documented de-escalation protocol for public-facing staff",
      "Inconsistent incident reporting — verbal threats and near-misses unrecorded",
      "No corrective action tracking after citizen-on-staff incidents",
    ],
    usExposure: [
      "OSHA General Duty Clause citations following public-contact incidents",
      "Civil liability (negligence) claims from injured employees",
      "Increased insurance scrutiny and potential coverage gaps",
    ],
    caExposure: [
      "WSIB/WCB reporting obligations for all violent incidents",
      "Provincial OHS Act violations for failure to protect public-sector workers",
      "Civil liability exposure and regulatory investigation",
    ],
    insightLine: "Most organizations identify these gaps AFTER an incident — not before.",
  },
};

const SNAPSHOT_RISK_COLORS: Record<string, { card: string; badge: string; icon: string }> = {
  Low:      { card: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-700", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700", icon: "text-emerald-600 dark:text-emerald-400" },
  Elevated: { card: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-700",     badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-700",     icon: "text-amber-600 dark:text-amber-400"   },
  High:     { card: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-700",   badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700",   icon: "text-orange-600 dark:text-orange-400" },
};

// Enhancement 2 — Documentation status types
type DocStatus = "Not Started" | "In Progress" | "Complete";
type DocTag = "Required" | "High Liability Exposure" | "Best Practice";

const DOC_TAGS: Record<string, DocTag> = {
  "Written Prevention Plan":    "Required",
  "Risk Assessment":            "Required",
  "Incident Report Form":       "High Liability Exposure",
  "Incident Log":               "High Liability Exposure",
  "Corrective Action Log":      "High Liability Exposure",
  "Training Records":           "Required",
  "Annual Review Documentation": "Best Practice",
};

const DOC_TAG_STYLES: Record<DocTag, string> = {
  "Required":              "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700",
  "High Liability Exposure": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700",
  "Best Practice":         "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700",
};

const DOC_TAG_DOTS: Record<DocTag, string> = {
  "Required":              "🔴",
  "High Liability Exposure": "🟠",
  "Best Practice":         "🟢",
};

// Enhancement 3 — What This Means For You
const INDUSTRY_INSIGHT: Record<string, string> = {
  healthcare: "In healthcare environments, incidents most commonly occur in emergency departments, psychiatric units, and during patient transfers — often when staffing is reduced or wait times are high. Without structured reporting, de-escalation training, and Code White protocols, these situations escalate quickly, resulting in staff injury, WSIB/WCB claims, and regulatory scrutiny. Organizations that lack documented risk assessments are consistently the most exposed when incidents are reviewed post-event.",
  education: "In educational environments, incidents most commonly occur during unstructured periods, at building entry points, and during disciplinary interactions — often involving students, parents, or community members. Without documented threat assessment protocols, visitor management systems, and staff training, situations escalate rapidly, leading to staff and student injury, liability exposure, and loss of community trust. Schools without drilled lockdown procedures face the highest scrutiny following incidents.",
  retail: "In retail environments, incidents most commonly occur during robbery attempts, customer conflict over policy enforcement, or low-staff periods such as opening and closing. Without documented response procedures, incident logs, and staff training, these situations escalate quickly — leading to employee injury, civil liability, and increased insurance scrutiny. Retailers that fail to track near-misses are consistently unable to demonstrate due diligence when incidents are reviewed.",
  manufacturing: "In manufacturing environments, incidents most commonly occur during shift changes, disciplinary actions, or terminations — particularly where internal conflict has gone unaddressed. Without documented workplace violence prevention policies, threat assessment steps in HR procedures, and corrective action tracking, situations escalate into serious injury or worse. Organizations without complete incident logs face the greatest regulatory and civil liability exposure when incidents are investigated.",
  corporate: "In corporate environments, incidents most commonly occur following terminations, performance management actions, or when domestic violence spills into the workplace. Without a domestic violence spillover policy, a secure termination protocol, and a clear reporting pathway for threatening communications, these situations escalate quickly — leading to employee injury, civil liability, and reputational damage. Organizations that lack documented corrective action tracking are consistently the most exposed during post-incident review.",
  public_government: "In public-sector environments, incidents most commonly occur during high-volume citizen contact periods, policy enforcement interactions, and in understaffed service areas. Without structured de-escalation protocols, documented incident reporting, and staff training, these situations escalate rapidly — resulting in employee injury, WSIB/WCB claims, and regulatory scrutiny. Public-sector organizations that fail to document near-misses and verbal threats face the greatest exposure when incidents are formally investigated.",
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const PILLAR_ACCENTS = [
  { border: "border-l-blue-500",    num: "bg-blue-500"    },
  { border: "border-l-violet-500",  num: "bg-violet-500"  },
  { border: "border-l-emerald-500", num: "bg-emerald-500" },
  { border: "border-l-amber-500",   num: "bg-amber-500"   },
  { border: "border-l-rose-500",    num: "bg-rose-500"    },
  { border: "border-l-teal-500",    num: "bg-teal-500"    },
];

const COLUMN_ICONS: Record<string, React.ReactNode> = {
  clipboard:        <Clipboard size={18} />,
  "file-text":      <FileText size={18} />,
  "alert-triangle": <AlertTriangle size={18} />,
};

const COLUMN_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  blue:  { bg: "bg-blue-50 dark:bg-blue-950/30",  border: "border-blue-200 dark:border-blue-800",  icon: "text-blue-600 dark:text-blue-400"  },
  amber: { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", icon: "text-amber-600 dark:text-amber-400" },
  red:   { bg: "bg-red-50 dark:bg-red-950/30",     border: "border-red-200 dark:border-red-800",     icon: "text-red-600 dark:text-red-400"     },
};

const RISK_LEVEL_COLORS: Record<string, string> = {
  Low:      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700",
  Moderate: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700",
  Elevated: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-700",
  High:     "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-700",
  Critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700",
};

// ─────────────────────────────────────────────────────────────────────────────
// ENHANCEMENT 1 — PROGRAM EXPOSURE SNAPSHOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function ProgramExposureSnapshot({
  jurisdiction,
  industryKey,
  region,
}: {
  jurisdiction: "us" | "canada";
  industryKey: string;
  region: string;
}) {
  const snapshot = INDUSTRY_SNAPSHOT[industryKey];
  if (!snapshot) return null;
  const colors = SNAPSHOT_RISK_COLORS[snapshot.riskLevel];
  const exposure = jurisdiction === "canada" ? snapshot.caExposure : snapshot.usExposure;

  return (
    <div className={`rounded-xl border-2 p-5 space-y-4 ${colors.card}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity size={16} className={colors.icon} />
          <span className="text-sm font-bold text-foreground">Program Exposure Snapshot</span>
          {region && (
            <span className="text-xs text-muted-foreground font-medium">· {region}</span>
          )}
        </div>
        <Badge className={`text-xs border font-semibold ${colors.badge}`}>
          {snapshot.riskLevel} Risk
        </Badge>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <TrendingDown size={13} className="text-muted-foreground" />
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">Most Common Gaps</p>
          </div>
          <ul className="space-y-1.5">
            {snapshot.commonGaps.map((gap) => (
              <li key={gap} className="flex items-start gap-2 text-sm text-foreground/80">
                <ChevronRight size={12} className={`mt-0.5 flex-shrink-0 ${colors.icon}`} />{gap}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-muted-foreground" />
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">Potential Exposure</p>
          </div>
          <ul className="space-y-1.5">
            {exposure.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
                <ChevronRight size={12} className={`mt-0.5 flex-shrink-0 ${colors.icon}`} />{item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="pt-1 border-t border-current/10">
        <p className="text-sm font-semibold text-foreground/90 italic">"{snapshot.insightLine}"</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED ACCORDION SECTION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

type SectionConfig = {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  visible: boolean;
  defaultOpen?: boolean;
  content: React.ReactNode;
};

function RegulationsSectionAccordion({
  sections,
}: {
  sections: SectionConfig[];
}) {
  const visible = sections.filter((s) => s.visible);
  const defaultOpen = visible
    .filter((s) => s.defaultOpen)
    .map((s) => s.id);

  return (
    <Accordion
      type="multiple"
      defaultValue={defaultOpen}
      className="space-y-2"
    >
      {visible.map((section) => (
        <AccordionItem
          key={section.id}
          value={section.id}
          className="rounded-lg border border-border bg-card overflow-hidden shadow-sm last:border-b"
        >
          <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 transition-colors [&[data-state=open]]:bg-muted/20">
            <div className="flex items-center gap-3 text-left">
              <span className="text-primary flex-shrink-0">{section.icon}</span>
              <div>
                <p className="text-sm font-bold text-foreground leading-snug">{section.title}</p>
                {section.subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5 font-normal">{section.subtitle}</p>
                )}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-1">
            {section.content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CONTENT BLOCKS (used by both US and Canada)
// ─────────────────────────────────────────────────────────────────────────────

function PillarList({ elements }: { elements: Array<{ number: number; title: string; description: string; artifacts: string[] }> }) {
  return (
    <div className="space-y-3 mt-2">
      {elements.map((el, i) => {
        const accent = PILLAR_ACCENTS[i] ?? PILLAR_ACCENTS[0];
        return (
          <div key={el.number} className={`flex gap-4 rounded-lg border border-border bg-background p-4 border-l-4 ${accent.border}`}>
            <div className={`w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${accent.num}`}>
              {el.number}
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground leading-snug">{el.title}</p>
              <p className="text-sm text-muted-foreground">{el.description}</p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {el.artifacts.map((a) => (
                  <Badge key={a} variant="secondary" className="text-xs font-normal">{a}</Badge>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SourceLinks({ links }: { links: Array<{ label: string; url: string }> }) {
  if (!links.length) return null;
  return (
    <div className="mt-4 space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Official Sources</p>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <ExternalLink size={11} />
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INDUSTRY OVERLAY CONTENT BLOCKS
// ─────────────────────────────────────────────────────────────────────────────

function OverlayRiskProfile({ overlay }: { overlay: IndustryOverlay }) {
  const riskColors = RISK_LEVEL_COLORS[overlay.risk_profile.risk_level] ?? RISK_LEVEL_COLORS.Moderate;
  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-center gap-2">
        <Badge className={`text-xs border ${riskColors}`}>{overlay.risk_profile.risk_level} Risk</Badge>
        <span className="text-xs text-muted-foreground italic">{overlay.tagline}</span>
      </div>
      <div>
        <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Primary Violence Types</p>
        <div className="space-y-2">
          {overlay.risk_profile.primary_violence_types.map((vt) => (
            <div key={vt.type} className="rounded-md border border-border bg-muted/20 px-3 py-2">
              <p className="text-xs font-semibold text-foreground">{vt.type}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{vt.description}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Common Sources</p>
          <ul className="space-y-1">
            {overlay.risk_profile.common_sources.map((s) => (
              <li key={s} className="flex items-start gap-1.5 text-xs text-foreground/80">
                <ChevronRight size={11} className="text-primary mt-0.5 flex-shrink-0" />{s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Environmental Factors</p>
          <ul className="space-y-1">
            {overlay.risk_profile.environmental_factors.map((f) => (
              <li key={f} className="flex items-start gap-1.5 text-xs text-foreground/80">
                <ChevronRight size={11} className="text-muted-foreground mt-0.5 flex-shrink-0" />{f}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* Fix 2: What This Means For You — interpretive insight box */}
      {INDUSTRY_INSIGHT[overlay.industryKey] && (
        <div className="rounded-xl border-l-4 border-primary bg-gradient-to-r from-primary/8 to-primary/3 dark:from-primary/15 dark:to-primary/5 px-5 py-4 space-y-2 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/15 dark:bg-primary/25 flex items-center justify-center flex-shrink-0">
              <Info size={13} className="text-primary" />
            </div>
            <p className="text-sm font-bold text-primary tracking-wide">What This Means For You</p>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed pl-8">{INDUSTRY_INSIGHT[overlay.industryKey]}</p>
        </div>
      )}
    </div>
  );
}
function OverlayScenarios({ overlay }: { overlay: IndustryOverlay }) {
  return (
    <ol className="mt-2 space-y-2">
      {overlay.common_scenarios.map((s, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
          <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}

function OverlayHighRiskRoles({ overlay }: { overlay: IndustryOverlay }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {overlay.high_risk_roles.map((role) => (
        <Badge key={role} variant="secondary" className="text-xs font-normal">{role}</Badge>
      ))}
    </div>
  );
}

function OverlayControls({ overlay }: { overlay: IndustryOverlay }) {
  return (
    <div className="mt-2 space-y-4">
      {([
        { key: "prevention",   label: "Prevention",   color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
        { key: "response",     label: "Response",     color: "text-orange-600 dark:text-orange-400",   bg: "bg-orange-50 dark:bg-orange-950/30"   },
        { key: "post_incident",label: "Post-Incident",color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-950/30"       },
      ] as const).map(({ key, label, color, bg }) => (
        <div key={key}>
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${color}`}>{label}</p>
          <div className="space-y-2">
            {overlay.controls_and_procedures[key].map((item) => (
              <div key={item.action} className={`rounded-md border border-border ${bg} px-3 py-2.5 space-y-1`}>
                <p className="text-xs font-semibold text-foreground">{item.action}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.detail}</p>
                {item.integrationTag && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono">{item.integrationTag}</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function OverlayTraining({ overlay }: { overlay: IndustryOverlay }) {
  return (
    <ol className="mt-2 space-y-2">
      {overlay.training_priorities.map((tp, i) => (
        <li key={tp.topic} className="flex items-start gap-3">
          <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-foreground">{tp.topic}</p>
            <p className="text-xs text-muted-foreground">{tp.rationale}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function OverlayPolicy({ overlay }: { overlay: IndustryOverlay }) {
  return (
    <div className="mt-2 space-y-2">
      {overlay.policy_emphasis.map((pe) => (
        <div key={pe.policy} className="rounded-md border border-border bg-muted/20 px-3 py-2.5 space-y-1">
          <p className="text-xs font-semibold text-foreground">{pe.policy}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{pe.description}</p>
        </div>
      ))}
    </div>
  );
}

function OverlayAssessment({ overlay }: { overlay: IndustryOverlay }) {
  return (
    <div className="mt-2 space-y-4">
      {overlay.assessment_focus.map((af) => (
        <div key={af.area}>
          <p className="text-xs font-bold text-foreground mb-2">{af.area}</p>
          <ul className="space-y-1">
            {af.questions.map((q) => (
              <li key={q} className="flex items-start gap-2 text-xs text-foreground/80">
                <CheckCircle2 size={11} className="text-rose-400 mt-0.5 flex-shrink-0" />{q}
              </li>
            ))}
          </ul>
          {af.integrationTag && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono mt-2">{af.integrationTag}</Badge>
          )}
        </div>
      ))}
    </div>
  );
}

type MarkdownBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "divider" };

function parseJurisdictionMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let currentParagraph: string[] = [];
  let currentList: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      blocks.push({ type: "paragraph", text: currentParagraph.join(" ").trim() });
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (currentList.length > 0) {
      blocks.push({ type: "list", items: currentList });
      currentList = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", text: headingMatch[1].trim() });
      continue;
    }

    const listMatch = line.match(/^[\-*+]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      currentList.push(listMatch[1].trim());
      continue;
    }

    currentParagraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function JurisdictionDocumentViewer({ markdown }: { markdown: string }) {
  const blocks = parseJurisdictionMarkdown(markdown);
  return (
    <div className="space-y-4 mt-2 text-sm text-muted-foreground">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <p key={index} className="text-sm font-semibold text-foreground">{block.text}</p>
          );
        }
        if (block.type === "paragraph") {
          return <p key={index}>{block.text}</p>;
        }
        if (block.type === "list") {
          return (
            <ul key={index} className="list-disc list-inside space-y-1">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          );
        }
        return <div key={index} className="border-t border-border" />;
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// US-SPECIFIC CONTENT BLOCKS
// ─────────────────────────────────────────────────────────────────────────────

function USAtAGlance() {
  return (
    <div className="space-y-4 mt-2">
      <p className="text-sm text-muted-foreground">{OSHA_AT_A_GLANCE.subheading}</p>
      <ul className="grid sm:grid-cols-2 gap-2">
        {OSHA_AT_A_GLANCE.items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CheckCircle2 size={14} className="text-primary flex-shrink-0" />{item}
          </li>
        ))}
      </ul>
      <div className="flex items-start gap-2 pt-2 border-t border-border">
        <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs font-medium text-amber-700 dark:text-amber-400 italic">{OSHA_AT_A_GLANCE.urgencyLine}</p>
      </div>
    </div>
  );
}

function USLegalBaseline() {
  return (
    <div className="space-y-4 mt-2">
      <p className="text-sm text-muted-foreground">{OSHA_BASELINE_OVERVIEW.intro}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {OSHA_BASELINE_OVERVIEW.keyPoints.map((kp) => (
          <div key={kp.label} className="rounded-lg border border-border bg-background p-4 space-y-1">
            <p className="text-sm font-semibold text-foreground">{kp.label}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{kp.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function USCoreElements() {
  return (
    <div className="space-y-2 mt-2">
      <p className="text-sm text-muted-foreground">{OSHA_FIVE_ELEMENTS.intro}</p>
      <PillarList elements={OSHA_FIVE_ELEMENTS.elements} />
    </div>
  );
}

function USDocumentation() {
  const [statuses, setStatuses] = useState<Record<string, DocStatus>>({});
  const setStatus = useCallback((name: string, val: DocStatus) => {
    setStatuses((prev) => ({ ...prev, [name]: val }));
  }, []);

  return (
    <div className="space-y-2 mt-2">
      <p className="text-sm font-medium text-foreground italic">{OSHA_DOCUMENTATION.intro}</p>
      <div className="space-y-2">
        {OSHA_DOCUMENTATION.documents.map((doc) => {
          const tag = DOC_TAGS[doc.name] ?? "Best Practice";
          const tagStyle = DOC_TAG_STYLES[tag];
          const dot = DOC_TAG_DOTS[tag];
          const status = statuses[doc.name] ?? "Not Started";
          return (
            <div key={doc.name} className="rounded-lg border border-border bg-background px-4 py-3 space-y-2">
              <div className="flex items-start gap-3">
                <FileText size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{doc.name}</p>
                    <Badge className={`text-xs border px-1.5 py-0 ${tagStyle}`}>{dot} {tag}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{doc.purpose}</p>
                  <p className="text-xs text-muted-foreground/70">{doc.whenNeeded}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap pl-5">
                <Select value={status} onValueChange={(v) => setStatus(doc.name, v as DocStatus)}>
                  <SelectTrigger className="h-7 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
                <button
                  onClick={() => {}}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-muted/50 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  title="Generate Template (coming soon)"
                >
                  <Wand2 size={11} />Generate Template
                </button>
                <button
                  onClick={() => {}}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-muted/50 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  title="Upload Existing (coming soon)"
                >
                  <UploadCloud size={11} />Upload Existing
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function USRecordkeeping() {
  return (
    <div className="space-y-3 mt-2">
      <p className="text-sm text-muted-foreground">{OSHA_RECORDKEEPING.intro}</p>
      <div className="grid sm:grid-cols-3 gap-3">
        {OSHA_RECORDKEEPING.columns.map((col) => {
          const colors = COLUMN_COLORS[col.color] ?? COLUMN_COLORS.blue;
          return (
            <div key={col.title} className={`rounded-lg border p-4 space-y-3 ${colors.bg} ${colors.border}`}>
              <div className="flex items-center gap-2">
                <span className={colors.icon}>{COLUMN_ICONS[col.icon]}</span>
                <p className="text-sm font-semibold text-foreground">{col.title}</p>
              </div>
              <p className="text-xs text-muted-foreground">{col.description}</p>
              <ul className="space-y-1">
                {col.keyPoints.map((pt) => (
                  <li key={pt} className="flex items-start gap-1.5 text-xs text-foreground/80">
                    <ChevronRight size={11} className={`mt-0.5 flex-shrink-0 ${colors.icon}`} />{pt}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function USStateGuidance({ stateCode, industryKey }: { stateCode: string; industryKey: IndustryKey }) {
  const result = resolveStateGuidance(stateCode, industryKey);
  if (!result) return null;
  const { guidance, isIndustrySpecific } = result;
  const stateName = stateContent[stateCode]?.name ?? stateCode;
  const industryLabel = INDUSTRY_OPTIONS.find((o) => o.key === industryKey)?.label ?? "General Industry";
  const showFallback = industryKey !== "general" && !isIndustrySpecific;
  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-center gap-3 flex-wrap">
        {guidance.hasSpecificLaw ? (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 text-xs">
            <CheckCircle2 size={11} className="mr-1" />Specific Law in Effect
          </Badge>
        ) : (
          <Badge className="bg-muted text-muted-foreground border border-border text-xs">
            <XCircle size={11} className="mr-1" />Federal OSHA Applies
          </Badge>
        )}
        {isIndustrySpecific && (
          <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border border-violet-200 dark:border-violet-700 text-xs">
            <Briefcase size={11} className="mr-1" />Industry-Specific Requirements
          </Badge>
        )}
        {guidance.lawName && <span className="text-xs text-muted-foreground font-medium">{guidance.lawName}</span>}
      </div>
      {showFallback && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border">
          <Info size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">No {industryLabel}-specific law identified for {stateName}. Showing general statewide guidance.</p>
        </div>
      )}
      <p className="text-sm text-muted-foreground leading-relaxed">{guidance.summary}</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-background p-4 space-y-2">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider">Key Requirements</p>
          <ul className="space-y-1.5">
            {guidance.keyRequirements.map((req) => (
              <li key={req} className="flex items-start gap-2 text-sm text-foreground/80">
                <ChevronRight size={12} className="text-primary mt-0.5 flex-shrink-0" />{req}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-background p-4 space-y-2">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider">Documentation Required</p>
          <ul className="space-y-1.5">
            {guidance.documentationRequired.map((doc) => (
              <li key={doc} className="flex items-start gap-2 text-sm text-foreground/80">
                <FileText size={12} className="text-muted-foreground mt-0.5 flex-shrink-0" />{doc}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {guidance.effectiveDate && <span><span className="font-semibold text-foreground">Effective:</span> {guidance.effectiveDate}</span>}
        <span><span className="font-semibold text-foreground">Last reviewed:</span> {guidance.lastUpdated}</span>
      </div>
      {guidance.notes && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border">
          <Info size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{guidance.notes}</p>
        </div>
      )}
      <SourceLinks links={guidance.sourceLinks} />
    </div>
  );
}

function USFormsAndResources() {
  const formsByName = Object.fromEntries(OSHA_FORMS.forms.map((f) => [f.name, f]));
  return (
    <div className="space-y-6 mt-2">
      {/* Forms */}
      <div>
        <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">{OSHA_FORMS.heading}</p>
        <p className="text-sm text-muted-foreground mb-4">{OSHA_FORMS.subheading}</p>
        <div className="space-y-4">
          {OSHA_FORMS.groups.map((group) => {
            const groupForms = group.formNames.map((n) => formsByName[n]).filter(Boolean);
            return (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider">{group.label}</p>
                  <span className="text-xs text-muted-foreground">— {group.description}</span>
                </div>
                <div className="space-y-2">
                  {groupForms.map((form) => (
                    <div key={form.name} className="flex gap-3 rounded-lg border border-border bg-background px-4 py-3">
                      <Download size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-foreground">{form.name}</p>
                            <p className="text-xs text-muted-foreground">{form.fullName}</p>
                          </div>
                          <a href={form.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline flex-shrink-0 mt-0.5">
                            <Download size={11} />PDF
                          </a>
                        </div>
                        <p className="text-sm text-muted-foreground">{form.description}</p>
                        <p className="text-xs text-muted-foreground/70 italic">{form.whenToUse}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Resources */}
      <div className="border-t border-border pt-5">
        <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">{OSHA_RESOURCES.heading}</p>
        <p className="text-xs text-muted-foreground mb-4">{OSHA_RESOURCES.disclaimer}</p>
        <div className="space-y-5">
          {OSHA_RESOURCES.resources.map((group) => (
            <div key={group.category}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.category}</p>
              <div className="space-y-2">
                {group.links.map((link) => (
                  <div key={link.label} className="flex gap-3 rounded-lg border border-border bg-background px-4 py-3">
                    <ExternalLink size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <a href={link.url} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline">{link.label}</a>
                      <p className="text-xs text-muted-foreground">{link.description}</p>
                      {"whenToUse" in link && (link as { whenToUse: string }).whenToUse && (
                        <p className="text-xs text-muted-foreground/60 italic">{(link as { whenToUse: string }).whenToUse}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function USAssessmentConnection() {
  const icons = [<TrendingUp size={18} key="t" />, <FileText size={18} key="f" />, <ClipboardCheck size={18} key="c" />];
  return (
    <div className="space-y-3 mt-2">
      <p className="text-sm text-muted-foreground">{OSHA_ASSESSMENT_CONNECTION.subheading}</p>
      {OSHA_ASSESSMENT_CONNECTION.connections.map((conn, i) => (
        <div key={conn.left} className="rounded-lg border border-border bg-background p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-primary">{icons[i]}</span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground">{conn.left}</span>
              <ArrowRight size={13} className="text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-bold text-primary">{conn.right}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed pl-7">{conn.detail}</p>
        </div>
      ))}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20">
        <Link2 size={15} className="text-primary mt-0.5 flex-shrink-0" />
        <p className="text-sm font-medium text-foreground italic">{OSHA_ASSESSMENT_CONNECTION.callout}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANADA-SPECIFIC CONTENT BLOCKS
// ─────────────────────────────────────────────────────────────────────────────

function CAAtAGlance() {
  return (
    <div className="space-y-4 mt-2">
      <p className="text-sm text-muted-foreground">{CANADA_AT_A_GLANCE.subheading}</p>
      <ul className="grid sm:grid-cols-2 gap-2">
        {CANADA_AT_A_GLANCE.items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CheckCircle2 size={14} className="text-primary flex-shrink-0" />{item}
          </li>
        ))}
      </ul>
      <div className="flex items-start gap-2 pt-2 border-t border-border">
        <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs font-medium text-amber-700 dark:text-amber-400 italic">{CANADA_AT_A_GLANCE.urgencyLine}</p>
      </div>
    </div>
  );
}

function CAFederalBaseline() {
  return (
    <div className="space-y-4 mt-2">
      <p className="text-sm text-muted-foreground">{CANADA_FEDERAL_OVERVIEW.intro}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {CANADA_FEDERAL_OVERVIEW.keyPoints.map((kp) => (
          <div key={kp.label} className="rounded-lg border border-border bg-background p-4 space-y-1">
            <p className="text-sm font-semibold text-foreground">{kp.label}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{kp.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CACoreElements() {
  return (
    <div className="space-y-2 mt-2">
      <p className="text-sm text-muted-foreground">{CANADA_CORE_ELEMENTS.intro}</p>
      <PillarList elements={CANADA_CORE_ELEMENTS.elements} />
    </div>
  );
}

function CAProvinceGuidance({ guidance }: { guidance: ProvincialGuidance }) {
  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-center gap-3 flex-wrap">
        {guidance.hasSpecificLaw ? (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 text-xs">
            <CheckCircle2 size={11} className="mr-1" />Specific Provincial Law in Effect
          </Badge>
        ) : (
          <Badge className="bg-muted text-muted-foreground border border-border text-xs">
            <XCircle size={11} className="mr-1" />General Duty Applies
          </Badge>
        )}
        <span className="text-xs text-muted-foreground font-medium">{guidance.legislation}</span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{guidance.summary}</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-background p-4 space-y-2">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider">Key Requirements</p>
          <ul className="space-y-1.5">
            {guidance.keyRequirements.map((req) => (
              <li key={req} className="flex items-start gap-2 text-sm text-foreground/80">
                <ChevronRight size={12} className="text-primary mt-0.5 flex-shrink-0" />{req}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-background p-4 space-y-2">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider">Documentation Required</p>
          <ul className="space-y-1.5">
            {guidance.documentationRequired.map((doc) => (
              <li key={doc} className="flex items-start gap-2 text-sm text-foreground/80">
                <FileText size={12} className="text-muted-foreground mt-0.5 flex-shrink-0" />{doc}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {guidance.effectiveDate && <span><span className="font-semibold text-foreground">Effective:</span> {guidance.effectiveDate}</span>}
        <span><span className="font-semibold text-foreground">Last reviewed:</span> {guidance.lastUpdated}</span>
      </div>
      {guidance.notes && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border">
          <Info size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{guidance.notes}</p>
        </div>
      )}
      <SourceLinks links={guidance.sourceLinks} />
    </div>
  );
}

function CAResources() {
  return (
    <div className="space-y-2 mt-2">
      {CANADA_RESOURCES.items.map((item) => (
        <div key={item.title} className="flex gap-3 rounded-lg border border-border bg-background px-4 py-3">
          <ExternalLink size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <a href={item.url} target="_blank" rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline">{item.title}</a>
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">{item.type}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CAAssessmentConnection() {
  const icons = [<TrendingUp size={18} key="t" />, <FileText size={18} key="f" />, <ClipboardCheck size={18} key="c" />];
  return (
    <div className="space-y-3 mt-2">
      {CANADA_ASSESSMENT_CONNECTION.items.map((item, i) => (
        <div key={item.title} className="rounded-lg border border-border bg-background p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-primary">{icons[i] ?? icons[0]}</span>
            <p className="text-sm font-bold text-foreground">{item.title}</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed pl-7">{item.description}</p>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function Standards() {
  const [, navigate] = useLocation();
  const [jurisdiction, setJurisdiction] = useState<"us" | "canada" | "glossary">("us");

  // Glossary state
  const [glossarySearch, setGlossarySearch] = useState("");
  const [glossaryJurFilter, setGlossaryJurFilter] = useState<"all" | "us" | "canada" | "both">("all");

  // US selectors
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryKey>("general");

  // Canada selectors
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedCanadaIndustry, setSelectedCanadaIndustry] = useState<string>("");

  // Derived data
  const usStateGuidance = useMemo(() => {
    if (!selectedState) return null;
    return resolveStateGuidance(selectedState, selectedIndustry);
  }, [selectedState, selectedIndustry]);

  const usOverlay = useMemo(() => {
    if (!selectedIndustry || selectedIndustry === "general") return null;
    // Map stateContent IndustryKey to industryOverlayContent key
    const keyMap: Record<string, string> = {
      healthcare: "healthcare",
      retail: "retail",
      publicSector: "public_government",
    };
    return getIndustryOverlay(keyMap[selectedIndustry] ?? selectedIndustry);
  }, [selectedIndustry]);

  const caProvince = selectedProvince ? PROVINCIAL_CONTENT[selectedProvince] : null;
  const stateDocQuery = trpc.jurisdictions.getStateDoc.useQuery(
    { stateCode: selectedState },
    { enabled: jurisdiction === "us" && !!selectedState }
  );
  const glossaryQuery = trpc.jurisdictions.getGlossary.useQuery();
  const caOverlay = useMemo(() => {
    if (!selectedCanadaIndustry) return null;
    return getIndustryOverlay(selectedCanadaIndustry);
  }, [selectedCanadaIndustry]);

  // Derived region labels for Program Exposure Snapshot
  const usRegionLabel = useMemo(() => {
    const parts: string[] = [];
    if (selectedState) parts.push(stateContent[selectedState]?.name ?? selectedState);
    if (selectedIndustry && selectedIndustry !== "general") {
      parts.push(INDUSTRY_OPTIONS.find((o) => o.key === selectedIndustry)?.label ?? "");
    }
    return parts.join(" · ");
  }, [selectedState, selectedIndustry]);

  const caRegionLabel = useMemo(() => {
    const parts: string[] = [];
    if (selectedProvince) parts.push(PROVINCIAL_CONTENT[selectedProvince]?.name ?? selectedProvince);
    if (selectedCanadaIndustry) {
      parts.push(INDUSTRY_LIST.find((i) => i.key === selectedCanadaIndustry)?.label ?? "");
    }
    return parts.join(" · ");
  }, [selectedProvince, selectedCanadaIndustry]);

  const usSnapshotKey = useMemo(() => {
    const keyMap: Record<string, string> = {
      healthcare: "healthcare",
      retail: "retail",
      publicSector: "public_government",
    };
    return keyMap[selectedIndustry] ?? selectedIndustry;
  }, [selectedIndustry]);

  // ── US Section Config ────────────────────────────────────────────────────
  const usSections: SectionConfig[] = useMemo(() => [
    {
      id: "us-exposure-snapshot",
      title: "Program Exposure Snapshot",
      subtitle: usSnapshotKey && usSnapshotKey !== "general" && INDUSTRY_SNAPSHOT[usSnapshotKey]
        ? `Based on your selection: ${usRegionLabel}, your environment is considered ${INDUSTRY_SNAPSHOT[usSnapshotKey].riskLevel} Risk.`
        : "",
      icon: <Activity size={16} />,
      visible: !!(usSnapshotKey && usSnapshotKey !== "general" && INDUSTRY_SNAPSHOT[usSnapshotKey]),
      defaultOpen: true,
      content: usSnapshotKey && INDUSTRY_SNAPSHOT[usSnapshotKey] ? (
        <ProgramExposureSnapshot jurisdiction="us" industryKey={usSnapshotKey} region={usRegionLabel} />
      ) : null,
    },
    {
      id: "us-at-a-glance",
      title: "At-a-Glance",
      subtitle: "Core requirements and immediate context",
      icon: <Eye size={16} />,
      visible: true,
      defaultOpen: !(usSnapshotKey && usSnapshotKey !== "general" && INDUSTRY_SNAPSHOT[usSnapshotKey]),
      content: <USAtAGlance />,
    },
    {
      id: "us-legal-baseline",
      title: "Legal / Regulatory Baseline",
      subtitle: "Federal OSHA obligations and enforcement framework",
      icon: <Scale size={16} />,
      visible: true,
      content: <USLegalBaseline />,
    },
    {
      id: "us-state-guidance",
      title: selectedState
        ? `${stateContent[selectedState]?.name ?? selectedState} — Jurisdiction-Specific Requirements`
        : "State-Specific Requirements",
      subtitle: selectedState
        ? `${INDUSTRY_OPTIONS.find((o) => o.key === selectedIndustry)?.label ?? "General Industry"} · Select state and industry above`
        : "Select a state above to view jurisdiction-specific guidance",
      icon: <MapPin size={16} />,
      visible: true,
      content: selectedState && usStateGuidance ? (
        <USStateGuidance stateCode={selectedState} industryKey={selectedIndustry} />
      ) : (
        <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-border bg-muted/20 mt-2">
          <p className="text-sm text-muted-foreground">Select a state above to view jurisdiction-specific guidance.</p>
        </div>
      ),
    },
    {
      id: "us-jurisdiction-source",
      title: "State Jurisdiction Source Notes",
      subtitle: selectedState ? "Source content from the jurisdiction docs mapped to this state" : "Select a state above to open the jurisdiction source notes",
      icon: <BookOpen size={16} />,
      visible: true,
      content: selectedState ? (
        stateDocQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading jurisdiction source...</div>
        ) : stateDocQuery.isError ? (
          <div className="text-sm text-muted-foreground">Unable to load jurisdiction details for this state.</div>
        ) : stateDocQuery.data ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</p>
              <p className="text-sm text-foreground">{stateDocQuery.data.source === "s3" ? "S3 jurisdiction document" : "Local jurisdiction document"}</p>
              <p className="text-xs text-muted-foreground">{stateDocQuery.data.key}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/50 p-4">
              <JurisdictionDocumentViewer markdown={stateDocQuery.data.markdown} />
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No jurisdiction notes available for this state.</div>
        )
      ) : (
        <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-border bg-muted/20 mt-2">
          <p className="text-sm text-muted-foreground">Select a state above to view the raw jurisdiction source.</p>
        </div>
      ),
    },
    {
      id: "us-core-elements",
      title: "Five Core Program Elements",
      subtitle: "OSHA's foundational prevention program structure",
      icon: <ListChecks size={16} />,
      visible: true,
      content: <USCoreElements />,
    },
    {
      id: "us-documentation",
      title: "Documentation Required",
      subtitle: "What you need to demonstrate program readiness",
      icon: <FileText size={16} />,
      visible: true,
      content: <USDocumentation />,
    },
    {
      id: "us-recordkeeping",
      title: "Recordkeeping vs. Reporting",
      subtitle: "Two separate obligations with different timelines",
      icon: <Clipboard size={16} />,
      visible: true,
      content: <USRecordkeeping />,
    },
    // Industry overlay sections — only visible when an industry is selected
    {
      id: "us-risk-profile",
      title: "Industry-Specific Risk Profile",
      subtitle: usOverlay ? `${usOverlay.industry} — ${usOverlay.risk_profile.risk_level} Risk` : "",
      icon: <AlertCircle size={16} />,
      visible: !!usOverlay,
      content: usOverlay ? <OverlayRiskProfile overlay={usOverlay} /> : null,
    },
    {
      id: "us-scenarios",
      title: "Common Scenarios",
      subtitle: usOverlay ? `Typical incidents in ${usOverlay.industry} environments` : "",
      icon: <BookMarked size={16} />,
      visible: !!usOverlay,
      content: usOverlay ? <OverlayScenarios overlay={usOverlay} /> : null,
    },
    {
      id: "us-high-risk-roles",
      title: "High-Risk Roles",
      subtitle: usOverlay ? `Roles with elevated exposure in ${usOverlay.industry}` : "",
      icon: <Users size={16} />,
      visible: !!usOverlay,
      content: usOverlay ? <OverlayHighRiskRoles overlay={usOverlay} /> : null,
    },
    {
      id: "us-controls",
      title: "Recommended Controls & Procedures",
      subtitle: "Prevention, response, and post-incident actions",
      icon: <ShieldCheck size={16} />,
      visible: !!usOverlay,
      content: usOverlay ? <OverlayControls overlay={usOverlay} /> : null,
    },
    {
      id: "us-training",
      title: "Training Priorities",
      subtitle: usOverlay ? `Ordered training focus for ${usOverlay.industry}` : "",
      icon: <GraduationCap size={16} />,
      visible: !!usOverlay,
      content: usOverlay ? <OverlayTraining overlay={usOverlay} /> : null,
    },
    {
      id: "us-policy",
      title: "Policy Emphasis",
      subtitle: "Key policy documents and commitments required",
      icon: <FileText size={16} />,
      visible: !!usOverlay,
      content: usOverlay ? <OverlayPolicy overlay={usOverlay} /> : null,
    },
    {
      id: "us-assessment-focus",
      title: "Assessment Focus Areas",
      subtitle: "What auditors should prioritize for this industry",
      icon: <Target size={16} />,
      visible: !!usOverlay,
      content: usOverlay ? <OverlayAssessment overlay={usOverlay} /> : null,
    },
    {
      id: "us-forms-resources",
      title: "Official Forms & Resources",
      subtitle: "OSHA forms, external links, and reference materials",
      icon: <Download size={16} />,
      visible: true,
      content: <USFormsAndResources />,
    },
    {
      id: "us-assessment-connection",
      title: "How This Connects to Your Assessment",
      subtitle: "Mapping audit results to OSHA's prevention framework",
      icon: <Link2 size={16} />,
      visible: true,
      content: <USAssessmentConnection />,
    },
  ], [selectedState, selectedIndustry, usStateGuidance, usOverlay, stateDocQuery.data, stateDocQuery.isError, stateDocQuery.isLoading]);

  // ── Canada Section Config ────────────────────────────────────────────────
  const caSections: SectionConfig[] = useMemo(() => [
    {
      id: "ca-exposure-snapshot",
      title: "Program Exposure Snapshot",
      subtitle: selectedCanadaIndustry && INDUSTRY_SNAPSHOT[selectedCanadaIndustry]
        ? `Based on your selection: ${caRegionLabel}, your environment is considered ${INDUSTRY_SNAPSHOT[selectedCanadaIndustry].riskLevel} Risk.`
        : "",
      icon: <Activity size={16} />,
      visible: !!(selectedCanadaIndustry && INDUSTRY_SNAPSHOT[selectedCanadaIndustry]),
      defaultOpen: true,
      content: selectedCanadaIndustry && INDUSTRY_SNAPSHOT[selectedCanadaIndustry] ? (
        <ProgramExposureSnapshot jurisdiction="canada" industryKey={selectedCanadaIndustry} region={caRegionLabel} />
      ) : null,
    },
    {
      id: "ca-at-a-glance",
      title: "At-a-Glance",
      subtitle: "Core requirements and immediate context",
      icon: <Eye size={16} />,
      visible: true,
      defaultOpen: !(selectedCanadaIndustry && INDUSTRY_SNAPSHOT[selectedCanadaIndustry]),
      content: <CAAtAGlance />,
    },
    {
      id: "ca-federal-baseline",
      title: "Federal Legal Baseline",
      subtitle: "Canada Labour Code and federal OHS framework",
      icon: <Scale size={16} />,
      visible: true,
      content: <CAFederalBaseline />,
    },
    {
      id: "ca-province-guidance",
      title: caProvince
        ? `${caProvince.name} — Provincial Requirements`
        : "Province-Specific Requirements",
      subtitle: caProvince
        ? `${caProvince.legislation}`
        : "Select a province above to view jurisdiction-specific guidance",
      icon: <MapPin size={16} />,
      visible: true,
      content: caProvince ? (
        <CAProvinceGuidance guidance={caProvince} />
      ) : (
        <div className="flex items-center justify-center h-16 rounded-lg border border-dashed border-border bg-muted/20 mt-2">
          <p className="text-sm text-muted-foreground">Select a province above to view jurisdiction-specific guidance.</p>
        </div>
      ),
    },
    {
      id: "ca-core-elements",
      title: "Core Program Elements",
      subtitle: "Foundation of a compliant Canadian prevention program",
      icon: <ListChecks size={16} />,
      visible: true,
      content: <CACoreElements />,
    },
    // Industry overlay sections — only visible when an industry is selected
    {
      id: "ca-risk-profile",
      title: "Industry-Specific Risk Profile",
      subtitle: caOverlay ? `${caOverlay.industry} — ${caOverlay.risk_profile.risk_level} Risk` : "",
      icon: <AlertCircle size={16} />,
      visible: !!caOverlay,
      content: caOverlay ? <OverlayRiskProfile overlay={caOverlay} /> : null,
    },
    {
      id: "ca-scenarios",
      title: "Common Scenarios",
      subtitle: caOverlay ? `Typical incidents in ${caOverlay.industry} environments` : "",
      icon: <BookMarked size={16} />,
      visible: !!caOverlay,
      content: caOverlay ? <OverlayScenarios overlay={caOverlay} /> : null,
    },
    {
      id: "ca-high-risk-roles",
      title: "High-Risk Roles",
      subtitle: caOverlay ? `Roles with elevated exposure in ${caOverlay.industry}` : "",
      icon: <Users size={16} />,
      visible: !!caOverlay,
      content: caOverlay ? <OverlayHighRiskRoles overlay={caOverlay} /> : null,
    },
    {
      id: "ca-controls",
      title: "Recommended Controls & Procedures",
      subtitle: "Prevention, response, and post-incident actions",
      icon: <ShieldCheck size={16} />,
      visible: !!caOverlay,
      content: caOverlay ? <OverlayControls overlay={caOverlay} /> : null,
    },
    {
      id: "ca-training",
      title: "Training Priorities",
      subtitle: caOverlay ? `Ordered training focus for ${caOverlay.industry}` : "",
      icon: <GraduationCap size={16} />,
      visible: !!caOverlay,
      content: caOverlay ? <OverlayTraining overlay={caOverlay} /> : null,
    },
    {
      id: "ca-policy",
      title: "Policy Emphasis",
      subtitle: "Key policy documents and commitments required",
      icon: <FileText size={16} />,
      visible: !!caOverlay,
      content: caOverlay ? <OverlayPolicy overlay={caOverlay} /> : null,
    },
    {
      id: "ca-assessment-focus",
      title: "Assessment Focus Areas",
      subtitle: "What auditors should prioritize for this industry",
      icon: <Target size={16} />,
      visible: !!caOverlay,
      content: caOverlay ? <OverlayAssessment overlay={caOverlay} /> : null,
    },
    {
      id: "ca-resources",
      title: "Official Sources & Resources",
      subtitle: "Federal and provincial reference materials",
      icon: <ExternalLink size={16} />,
      visible: true,
      content: <CAResources />,
    },
    {
      id: "ca-assessment-connection",
      title: "How This Connects to Your Assessment",
      subtitle: "Mapping audit results to Canadian requirements",
      icon: <Link2 size={16} />,
      visible: true,
      content: <CAAssessmentConnection />,
    },
  ], [caProvince, caOverlay]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <AppLayout>
       <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Back button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} />
          Dashboard
        </button>
        {/* Page Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <Shield size={13} />
            <span>Resources</span>
            <ChevronRight size={12} />
            <span>Standards &amp; Regulations</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Standards &amp; Regulations</h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            A decision-support reference for workplace violence prevention programs. Select your jurisdiction and industry to view applicable requirements, risk profiles, and recommended controls.
          </p>
        </div>

        {/* Jurisdiction Toggle */}
        <div className="flex items-center gap-2 p-1 rounded-lg bg-muted/50 border border-border w-fit">
          <button
            onClick={() => setJurisdiction("us")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              jurisdiction === "us"
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Flag size={14} />United States (OSHA)
          </button>
          <button
            onClick={() => setJurisdiction("canada")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              jurisdiction === "canada"
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe size={14} />Canada (CCOHS / WSIB)
          </button>
          <button
            onClick={() => setJurisdiction("glossary")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              jurisdiction === "glossary"
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen size={14} />Glossary
          </button>
        </div>

        {/* Disclaimer — only for US/Canada tabs */}
        {jurisdiction !== "glossary" && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <span className="font-semibold text-amber-800 dark:text-amber-300">
                {jurisdiction === "us" ? OSHA_DISCLAIMER.heading : CANADA_DISCLAIMER.heading}:{" "}
              </span>
              {jurisdiction === "us" ? OSHA_DISCLAIMER.body : CANADA_DISCLAIMER.body}
            </p>
          </div>
        )}

        {/* ── US CONTENT ─────────────────────────────────────────────────── */}
        {jurisdiction === "us" && (
          <>
            {/* Header tags */}
            <div className="flex flex-wrap gap-2">
              {["OSHA General Duty Clause", "NFPA 3000", "CISA Framework", "ASIS/SHRM WVPI"].map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>

            {/* Selectors */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Zap size={14} className="text-primary" />
                  Filter by State &amp; Industry
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={15} className="text-muted-foreground flex-shrink-0" />
                    <Select value={selectedState} onValueChange={setSelectedState}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select a state or territory…" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATE_LIST.map((s) => (
                          <SelectItem key={s.code} value={s.code}>{s.name} ({s.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase size={15} className="text-muted-foreground flex-shrink-0" />
                    <Select value={selectedIndustry} onValueChange={(v) => setSelectedIndustry(v as IndustryKey)}>
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Select Industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{STATE_DISCLAIMER}</p>
                {usOverlay && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-700">
                    <Layers size={13} className="text-violet-600 dark:text-violet-400 flex-shrink-0" />
                    <p className="text-xs font-medium text-violet-800 dark:text-violet-300">
                      Industry overlay active: <span className="font-bold">{usOverlay.industry}</span>
                      {selectedState ? ` · ${stateContent[selectedState]?.name}` : ""}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Accordion sections */}
            <RegulationsSectionAccordion sections={usSections} />
          </>
        )}

        {/* ── CANADA CONTENT ──────────────────────────────────────────────── */}
        {jurisdiction === "canada" && (
          <>
            {/* Header tags */}
            <div className="flex flex-wrap gap-2">
              {["Canada Labour Code", "CCOHS", "WSIB / WCB", "Provincial OHS Acts"].map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>

            {/* Selectors */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Zap size={14} className="text-primary" />
                  Filter by Province &amp; Industry
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={15} className="text-muted-foreground flex-shrink-0" />
                    <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                      <SelectTrigger className="w-72">
                        <SelectValue placeholder="Select a province or territory…" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVINCE_LIST.map((code) => {
                          const p = PROVINCIAL_CONTENT[code];
                          return (
                            <SelectItem key={code} value={code}>{code} — {p.name}</SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase size={15} className="text-muted-foreground flex-shrink-0" />
                    <Select value={selectedCanadaIndustry} onValueChange={setSelectedCanadaIndustry}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select Industry (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRY_LIST.map((ind) => (
                          <SelectItem key={ind.key} value={ind.key}>{ind.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Optionally select your industry to see a decision-support overlay with risk profiles, controls, and training priorities.
                </p>
                {caOverlay && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-700">
                    <Layers size={13} className="text-violet-600 dark:text-violet-400 flex-shrink-0" />
                    <p className="text-xs font-medium text-violet-800 dark:text-violet-300">
                      Industry overlay active: <span className="font-bold">{caOverlay.industry}</span>
                      {caProvince ? ` · ${caProvince.name}` : ""}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Accordion sections */}
            <RegulationsSectionAccordion sections={caSections} />
          </>
        )}

        {/* ── GLOSSARY CONTENT ──────────────────────────────────────────── */}
        {jurisdiction === "glossary" && (() => {
          type GlossaryJur = "us" | "canada" | "both";
          interface GlossaryEntry {
            acronym: string;
            fullName: string;
            definition: string;
            category: string;
            jurisdiction: GlossaryJur;
            url?: string;
          }
          const staticTerms: GlossaryEntry[] = [
            // ── US-only terms ──────────────────────────────────────────────
            { acronym: "OSHA", fullName: "Occupational Safety and Health Administration", definition: "A U.S. federal agency under the Department of Labor that sets and enforces workplace safety and health standards. OSHA's General Duty Clause (Section 5(a)(1)) requires employers to provide a workplace free from recognized hazards. OSHA 3148 provides specific guidance on workplace violence prevention programs.", category: "Regulatory", jurisdiction: "us", url: "https://www.osha.gov" },
            { acronym: "NFPA 3000", fullName: "National Fire Protection Association Standard 3000", definition: "The NFPA 3000 Standard for an Active Shooter / Hostile Event Response (ASHER) Program provides a framework for organizations to plan, train, and respond to active shooter and hostile events. It covers program management, response procedures, training, and recovery.", category: "Standards", jurisdiction: "us", url: "https://www.nfpa.org/codes-and-standards/nfpa-3000" },
            { acronym: "CISA", fullName: "Cybersecurity and Infrastructure Security Agency", definition: "A U.S. federal agency responsible for protecting the nation's critical infrastructure from physical and cyber threats. CISA provides resources, training, and guidance on workplace violence prevention, active shooter preparedness, and physical security assessments.", category: "Regulatory", jurisdiction: "us", url: "https://www.cisa.gov" },
            { acronym: "FEMA", fullName: "Federal Emergency Management Agency", definition: "A U.S. federal agency under the Department of Homeland Security that coordinates the federal government's role in preparing for, preventing, mitigating, responding to, and recovering from domestic disasters. FEMA developed and maintains NIMS and ICS.", category: "Emergency Management", jurisdiction: "us", url: "https://www.fema.gov" },
            { acronym: "OSHA 300", fullName: "OSHA Form 300 — Log of Work-Related Injuries and Illnesses", definition: "A mandatory recordkeeping form required by OSHA (29 CFR 1904) for employers with more than 10 employees. It documents all work-related injuries and illnesses that result in days away from work, restricted work, transfer to another job, medical treatment beyond first aid, loss of consciousness, or diagnosis of a significant injury or illness.", category: "Regulatory", jurisdiction: "us", url: "https://www.osha.gov/recordkeeping" },
            { acronym: "CFR", fullName: "Code of Federal Regulations", definition: "The codification of general and permanent rules published in the Federal Register by U.S. federal agencies. OSHA regulations are found in Title 29 CFR. Key workplace safety regulations include 29 CFR 1910 (General Industry) and 29 CFR 1904 (Recordkeeping).", category: "Regulatory", jurisdiction: "us" },
            { acronym: "NFPA", fullName: "National Fire Protection Association", definition: "A global nonprofit organization that develops and publishes fire, electrical, and life safety codes and standards. In addition to NFPA 3000, other relevant standards include NFPA 101 (Life Safety Code) for egress and evacuation requirements.", category: "Standards", jurisdiction: "us", url: "https://www.nfpa.org" },
            { acronym: "SHRM", fullName: "Society for Human Resource Management", definition: "The world's largest HR professional society, providing resources, research, and best practice guidance on workplace issues including domestic violence preparedness, workplace violence prevention policies, and employee safety programs.", category: "Professional Standards", jurisdiction: "us", url: "https://www.shrm.org" },
            { acronym: "SRO", fullName: "School Resource Officer", definition: "A law enforcement officer assigned to work in a school setting. SROs serve as a liaison between the school and law enforcement agencies and may be involved in emergency planning and active threat response.", category: "Physical Security", jurisdiction: "us" },
            { acronym: "ASHER", fullName: "Active Shooter / Hostile Event Response", definition: "The category of emergency response addressed by NFPA 3000. ASHER programs encompass planning, training, and operational procedures for responding to active shooter incidents and other hostile events in the workplace.", category: "Response Protocols", jurisdiction: "us" },
            // ── Canada-only terms ──────────────────────────────────────────
            { acronym: "CLC", fullName: "Canada Labour Code, Part II", definition: "Federal legislation governing occupational health and safety for federally regulated workplaces in Canada. Part II of the CLC requires employers to prevent workplace hazards, including violence. Employers must develop and implement a workplace violence prevention policy and program under CLC s. 125(1)(z.16).", category: "Canadian Standards", jurisdiction: "canada", url: "https://laws-lois.justice.gc.ca/eng/acts/L-2/" },
            { acronym: "CSA Z1002", fullName: "CSA Standard Z1002 - Workplace Violence Prevention", definition: "A Canadian national standard developed by the Canadian Standards Association (CSA Group) that provides a framework for identifying, assessing, and controlling workplace violence hazards. CSA Z1002 applies to all Canadian workplaces and aligns with provincial OHS legislation. It covers risk assessment, prevention programs, incident response, and post-incident support.", category: "Canadian Standards", jurisdiction: "canada", url: "https://www.csagroup.org/" },
            { acronym: "OHSA (ON)", fullName: "Ontario Occupational Health and Safety Act - Bill 168 Amendments", definition: "Ontario's Bill 168 (2010) amended the OHSA to require Ontario employers to develop a workplace violence and harassment policy, conduct risk assessments, implement prevention programs, and provide worker training. Employers must also have measures in place to protect workers from domestic violence that may carry over into the workplace.", category: "Canadian Standards", jurisdiction: "canada", url: "https://www.ontario.ca/laws/statute/90o01" },
            { acronym: "WorkSafeBC", fullName: "Workers' Compensation Board of British Columbia - Violence Prevention Regulations", definition: "British Columbia's OHS Regulation (Part 4.27) requires employers to identify the risk of workplace violence, implement procedures to prevent or minimize that risk, and inform workers of the nature and extent of the risk. WorkSafeBC enforces these requirements and provides inspection and enforcement authority.", category: "Canadian Standards", jurisdiction: "canada", url: "https://www.worksafebc.com" },
            { acronym: "CCOHS", fullName: "Canadian Centre for Occupational Health and Safety", definition: "A federal Crown corporation that provides occupational health and safety information and resources to Canadian employers and workers. CCOHS publishes guidance on workplace violence prevention, harassment, and psychological safety. It is a key reference for Canadian employers building compliant safety programs.", category: "Canadian Standards", jurisdiction: "canada", url: "https://www.ccohs.ca" },
            { acronym: "Bill C-65", fullName: "An Act to amend the Canada Labour Code (Harassment and Violence)", definition: "Federal Canadian legislation (2018) that amended the Canada Labour Code to strengthen protections against harassment and violence in federally regulated workplaces. Bill C-65 requires employers to conduct risk assessments, develop prevention plans, provide training, and establish response procedures. It covers all forms of harassment and violence, including domestic violence that enters the workplace.", category: "Canadian Standards", jurisdiction: "canada", url: "https://laws-lois.justice.gc.ca/eng/regulations/SOR-2020-130/index.html" },
            { acronym: "OHS (AB)", fullName: "Alberta Occupational Health and Safety Act - Violence Prevention", definition: "Alberta's OHS Act requires employers to assess the risk of violence in the workplace and develop a violence prevention plan if a risk is identified. The plan must include procedures for reporting incidents, investigating complaints, and protecting workers. Alberta OHS also requires employers to inform workers of the nature and extent of violence risk.", category: "Canadian Standards", jurisdiction: "canada", url: "https://www.alberta.ca/occupational-health-safety-act" },
            // ── Both jurisdictions ─────────────────────────────────────────
            { acronym: "NIMS", fullName: "National Incident Management System", definition: "A comprehensive, nationwide approach developed by FEMA that provides a common framework for managing incidents of all sizes and types. NIMS establishes standardized terminology, organizational structures, and operational procedures to enable effective coordination between agencies and organizations during emergencies.", category: "Emergency Management", jurisdiction: "both", url: "https://www.fema.gov/emergency-managers/nims" },
            { acronym: "ICS", fullName: "Incident Command System", definition: "A standardized, on-scene, all-hazards incident management approach that allows for the integration of facilities, equipment, personnel, procedures, and communications. ICS is a component of NIMS and establishes a clear chain of command with defined roles including Incident Commander, Operations Section Chief, and others.", category: "Emergency Management", jurisdiction: "both", url: "https://www.fema.gov/emergency-managers/nims/incident-command-system" },
            { acronym: "EAP", fullName: "Emergency Action Plan", definition: "A written document required by OSHA (29 CFR 1910.38) that describes the actions employees should take to ensure their safety during fire and other emergencies. In the context of workplace violence, an EAP outlines response procedures, evacuation routes, shelter-in-place protocols, communication systems, and assigned roles for emergency coordinators.", category: "Emergency Management", jurisdiction: "both" },
            { acronym: "ACTD", fullName: "Assess, Commit, Take Action, Debrief", definition: "The ACTD framework is the platform's preferred active threat response protocol. It replaces older Active Threat Response Training terminology with a structured decision-making model: (1) Assess the situation and your options; (2) Commit to a course of action; (3) Take Action decisively; (4) Debrief after the event to identify lessons learned and improve future response.", category: "Response Protocols", jurisdiction: "both" },
            { acronym: "CPTED", fullName: "Crime Prevention Through Environmental Design", definition: "A multi-disciplinary approach to deterring criminal behavior through environmental design. CPTED principles include natural surveillance (designing spaces to maximize visibility), natural access control (guiding people through a space), territorial reinforcement (defining ownership and boundaries), and maintenance (keeping spaces well-maintained to deter criminal activity).", category: "Physical Security", jurisdiction: "both" },
            { acronym: "AED", fullName: "Automated External Defibrillator", definition: "A portable medical device that analyzes heart rhythm and delivers an electric shock to restore normal rhythm in cases of sudden cardiac arrest. OSHA and NFPA recommend that AEDs be accessible in workplaces and that staff be trained in their use.", category: "Medical", jurisdiction: "both" },
            { acronym: "HVAC", fullName: "Heating, Ventilation, and Air Conditioning", definition: "Building mechanical systems that control temperature, humidity, and air quality. In security assessments, HVAC access points are evaluated as potential entry vectors and for the risk of chemical or biological agent introduction.", category: "Physical Security", jurisdiction: "both" },
            { acronym: "CCTV", fullName: "Closed-Circuit Television", definition: "A video surveillance system in which cameras transmit signals to a specific set of monitors. CCTV is a key component of physical security assessments, evaluated for coverage, recording capability, and monitoring protocols.", category: "Physical Security", jurisdiction: "both" },
            { acronym: "TAR", fullName: "Threat Assessment Report", definition: "A formal document produced by Five Stones Technology following a facility safety audit. The TAR summarizes risk findings across multiple assessment categories, assigns risk levels (Low through Critical), identifies corrective actions, and includes an Emergency Action Plan tailored to the specific facility.", category: "Platform", jurisdiction: "both" },
            { acronym: "AAR", fullName: "After Action Review", definition: "A structured debrief process conducted after an emergency event, drill, or exercise to evaluate what happened, why it happened, and how it can be improved. An AAR identifies strengths, gaps, and corrective actions to improve future response. Best practice is to conduct an AAR within 24\u201372 hours of the event while details are fresh. The AAR process is a core component of the ACTD framework\u2019s \u2018Debrief\u2019 phase and is required by NFPA 3000 and FEMA exercise guidance.", category: "Emergency Management", jurisdiction: "both" },
            { acronym: "BCP", fullName: "Business Continuity Plan", definition: "A documented plan that outlines how an organization will continue operating during and after an unplanned disruption or emergency. A BCP identifies critical business functions, defines recovery time objectives (RTOs), establishes alternate operating procedures, and assigns recovery responsibilities. BCPs complement Emergency Action Plans by addressing operational continuity beyond the immediate life-safety response \u2014 including IT recovery, supply chain continuity, and communication with stakeholders. ISO 22301 is the international standard for business continuity management systems.", category: "Emergency Management", jurisdiction: "both" },
          ];

          const dynamicTerms = glossaryQuery.data ?? [];
          const GLOSSARY_TERMS = [...staticTerms, ...dynamicTerms];

          const JUR_LABELS: Record<GlossaryJur, string> = { us: "US Only", canada: "Canada Only", both: "US & Canada" };
          const JUR_COLORS: Record<GlossaryJur, string> = {
            us: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700",
            canada: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700",
            both: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700",
          };
          const CATEGORY_COLORS: Record<string, string> = {
            "Regulatory": "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
            "Standards": "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
            "Emergency Management": "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
            "Physical Security": "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
            "Response Protocols": "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
            "Medical": "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700",
            "Professional Standards": "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-700",
            "Platform": "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700",
            "Canadian Standards": "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
          };

          const filtered = GLOSSARY_TERMS.filter((e) => {
            const q = glossarySearch.toLowerCase();
            const matchSearch = !q || e.acronym.toLowerCase().includes(q) || e.fullName.toLowerCase().includes(q) || e.definition.toLowerCase().includes(q);
            const matchJur = glossaryJurFilter === "all" || e.jurisdiction === glossaryJurFilter;
            return matchSearch && matchJur;
          }).sort((a, b) => a.acronym.localeCompare(b.acronym));

          return (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={18} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Acronym Glossary</h2>
                  <p className="text-xs text-muted-foreground">Definitions for regulatory, standards, and emergency management terms. Filter by jurisdiction to see terms applicable to your region.</p>
                </div>
              </div>

              {/* Search & Filter */}
              <Card className="border-border">
                <CardContent className="pt-4 space-y-3">
                  <Input
                    placeholder="Search acronyms, full names, or definitions..."
                    value={glossarySearch}
                    onChange={(e) => setGlossarySearch(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    {(["all", "us", "canada", "both"] as const).map((jur) => (
                      <button
                        key={jur}
                        onClick={() => setGlossaryJurFilter(jur)}
                        className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                          glossaryJurFilter === jur
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {jur === "all" ? "All Jurisdictions" : jur === "us" ? "\uD83C\uDDFA\uD83C\uDDF8 US Only" : jur === "canada" ? "\uD83C\uDDE8\uD83C\uDDE6 Canada Only" : "\uD83C\uDF0E US & Canada"}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Showing {filtered.length} of {GLOSSARY_TERMS.length} entries</p>
                </CardContent>
              </Card>

              {/* Entries */}
              <div className="space-y-3">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No entries match your search.</p>
                  </div>
                ) : (
                  filtered.map((entry) => (
                    <div key={entry.acronym} className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-lg font-bold text-foreground">{entry.acronym}</span>
                          <span className="text-sm text-muted-foreground">{entry.fullName}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${JUR_COLORS[entry.jurisdiction]}`}>
                            {JUR_LABELS[entry.jurisdiction]}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[entry.category] ?? "bg-muted text-muted-foreground border-border"}`}>
                            {entry.category}
                          </span>
                          {entry.url && (
                            <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors" title="Official resource">
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{entry.definition}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })()}

        {/* Coming Next */}
        <Card className="border-dashed border-border bg-muted/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BookOpen size={15} className="text-muted-foreground" />
              <CardTitle className="text-base text-muted-foreground">Coming Next</CardTitle>
              <Badge variant="outline" className="text-xs ml-auto">Phase 4</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Future enhancements to the decision-support engine:</p>
            <ul className="space-y-1">
              {[
                "Compliance gap mapping: your audit results vs. jurisdiction + industry requirements",
                "Effective date tracking and change alerts",
                "Downloadable jurisdiction + industry reference cards (PDF)",
                "US state industry overlays (matching Canada overlay depth)",
                "Quebec French-language resources (CNESST)",
                "Direct integration: push overlay controls into EAP builder and Training module",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ChevronRight size={11} className="mt-0.5 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
