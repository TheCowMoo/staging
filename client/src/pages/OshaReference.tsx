import { useState } from "react";
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
  ExternalLink,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clipboard,
  ChevronRight,
  BookOpen,
  Shield,
  ArrowRight,
  TrendingUp,
  ClipboardCheck,
  Link2,
  MapPin,
  Info,
  XCircle,
  Briefcase,
} from "lucide-react";
import {
  OSHA_AT_A_GLANCE,
  OSHA_PAGE_HEADER,
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

// ── Icon map for recordkeeping columns ───────────────────────────────────────
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

// Pillar accent colors for the five elements
const PILLAR_ACCENTS = [
  { border: "border-l-blue-500",   num: "bg-blue-500"   },
  { border: "border-l-violet-500", num: "bg-violet-500" },
  { border: "border-l-emerald-500",num: "bg-emerald-500"},
  { border: "border-l-amber-500",  num: "bg-amber-500"  },
  { border: "border-l-rose-500",   num: "bg-rose-500"   },
];

// Connection section icons
const CONNECTION_ICONS = [
  <TrendingUp size={18} key="trend" />,
  <FileText size={18} key="file" />,
  <ClipboardCheck size={18} key="clip" />,
];

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ id, children }: { id?: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-6">{children}</section>;
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ title, badge }: { title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
    </div>
  );
}

// ── Guidance block renderer ───────────────────────────────────────────────────
function GuidanceBlock({
  guidance,
  isIndustrySpecific,
}: {
  guidance: StateGuidance;
  isIndustrySpecific: boolean;
}) {
  return (
    <div className="space-y-4 mt-4">
      {/* Status badge */}
      <div className="flex items-center gap-3 flex-wrap">
        {guidance.hasSpecificLaw ? (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 text-xs font-medium">
            <CheckCircle2 size={11} className="mr-1" />
            Specific Law in Effect
          </Badge>
        ) : (
          <Badge className="bg-muted text-muted-foreground border border-border text-xs font-medium">
            <XCircle size={11} className="mr-1" />
            Federal OSHA Applies (No State-Specific Law)
          </Badge>
        )}
        {isIndustrySpecific && (
          <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border border-violet-200 dark:border-violet-700 text-xs font-medium">
            <Briefcase size={11} className="mr-1" />
            Industry-Specific Requirements
          </Badge>
        )}
        {guidance.lawName && (
          <span className="text-xs text-muted-foreground font-medium">{guidance.lawName}</span>
        )}
      </div>

      {/* Summary */}
      <p className="text-sm text-muted-foreground leading-relaxed">{guidance.summary}</p>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Key Requirements */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider">Key Requirements</p>
          <ul className="space-y-1.5">
            {guidance.keyRequirements.map((req) => (
              <li key={req} className="flex items-start gap-2 text-sm text-foreground/80">
                <ChevronRight size={12} className="text-primary mt-0.5 flex-shrink-0" />
                {req}
              </li>
            ))}
          </ul>
        </div>

        {/* Documentation Required */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-bold text-foreground uppercase tracking-wider">Documentation Required</p>
          <ul className="space-y-1.5">
            {guidance.documentationRequired.map((doc) => (
              <li key={doc} className="flex items-start gap-2 text-sm text-foreground/80">
                <FileText size={12} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                {doc}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {guidance.effectiveDate && (
          <span><span className="font-semibold text-foreground">Effective:</span> {guidance.effectiveDate}</span>
        )}
        <span><span className="font-semibold text-foreground">Last reviewed:</span> {guidance.lastUpdated}</span>
      </div>

      {/* Notes */}
      {guidance.notes && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border">
          <Info size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">{guidance.notes}</p>
        </div>
      )}

      {/* Source links */}
      {guidance.sourceLinks.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Official Sources</p>
          <div className="flex flex-wrap gap-2">
            {guidance.sourceLinks.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink size={11} />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── State Reference Panel ─────────────────────────────────────────────────────
function StateReferencePanel({
  stateCode,
  industryKey,
}: {
  stateCode: string;
  industryKey: IndustryKey;
}) {
  const result = resolveStateGuidance(stateCode, industryKey);
  if (!result) return null;

  const { guidance, isIndustrySpecific } = result;
  const stateName = stateContent[stateCode]?.name ?? stateCode;
  const industryLabel =
    INDUSTRY_OPTIONS.find((o) => o.key === industryKey)?.label ?? "General Industry";

  // Fallback notice: industry selected but no specific overlay exists
  const showFallbackNotice = industryKey !== "general" && !isIndustrySpecific;

  return (
    <div className="space-y-3">
      {/* Context label */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/5 border border-primary/20">
        <Info size={13} className="text-primary flex-shrink-0" />
        <p className="text-xs font-medium text-foreground">
          {industryKey === "general"
            ? <>Showing <span className="font-bold">general statewide guidance</span> for {stateName}.</>
            : <>Showing guidance for: <span className="font-bold">{stateName}</span> + <span className="font-bold">{industryLabel}</span></>
          }
        </p>
      </div>

      {/* Fallback notice */}
      {showFallbackNotice && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border">
          <Info size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            No {industryLabel}-specific law has been identified for {stateName}. Showing general statewide guidance.
            Consult your state agency and legal counsel for sector-specific requirements.
          </p>
        </div>
      )}

      <GuidanceBlock guidance={guidance} isIndustrySpecific={isIndustrySpecific} />
    </div>
  );
}

export default function OshaReference() {
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryKey>("general");

  // Build a lookup map from form name → form object for the grouped forms section
  const formsByName = Object.fromEntries(OSHA_FORMS.forms.map((f) => [f.name, f]));

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <Shield size={13} />
            <span>Resources</span>
            <ChevronRight size={12} />
            <span>OSHA Reference</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">{OSHA_PAGE_HEADER.title}</h1>
          <p className="text-base text-muted-foreground max-w-2xl">{OSHA_PAGE_HEADER.description}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {["OSHA General Duty Clause", "NFPA 3000", "CISA Framework", "ASIS/SHRM WVPI"].map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
        </div>

        {/* ── Disclaimer ──────────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            <span className="font-semibold text-amber-800 dark:text-amber-300">{OSHA_DISCLAIMER.heading}: </span>
            {OSHA_DISCLAIMER.body}
          </p>
        </div>

        {/* ── At-a-Glance ─────────────────────────────────────────────────── */}
        <Section id="at-a-glance">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-primary flex items-center gap-2">
                <CheckCircle2 size={20} />
                {OSHA_AT_A_GLANCE.heading}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{OSHA_AT_A_GLANCE.subheading}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="grid sm:grid-cols-2 gap-2">
                {OSHA_AT_A_GLANCE.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <CheckCircle2 size={14} className="text-primary flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              {/* Urgency line */}
              <div className="flex items-start gap-2 pt-1 border-t border-primary/15">
                <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 italic">
                  {OSHA_AT_A_GLANCE.urgencyLine}
                </p>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* ── State-by-State Reference ─────────────────────────────────────── */}
        <Section id="state-reference">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-foreground">State-by-State Reference</h2>
            <Badge variant="secondary" className="text-xs">Phase 2</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Select your state and industry to see jurisdiction-specific workplace violence prevention requirements.
            This is an educational reference layer — requirements vary and change over time.
          </p>

          {/* Selectors row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-1">
            {/* State selector */}
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-muted-foreground flex-shrink-0" />
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a state or territory…" />
                </SelectTrigger>
                <SelectContent>
                  {STATE_LIST.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Industry selector */}
            <div className="flex items-center gap-2">
              <Briefcase size={15} className="text-muted-foreground flex-shrink-0" />
              <Select
                value={selectedIndustry}
                onValueChange={(v) => setSelectedIndustry(v as IndustryKey)}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select Industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Helper text */}
          <p className="text-xs text-muted-foreground mb-3 pl-1">
            Guidance varies by industry. Select your industry to see relevant requirements.
          </p>

          {/* State disclaimer */}
          <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 mb-2">
            <AlertTriangle size={12} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">{STATE_DISCLAIMER}</p>
          </div>

          {/* State panel — shown when a state is selected */}
          {selectedState ? (
            <Card className="border-border mt-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <MapPin size={15} className="text-primary" />
                  {stateContent[selectedState]?.name} — Workplace Violence Prevention Reference
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StateReferencePanel
                  stateCode={selectedState}
                  industryKey={
                    selectedIndustry === ("other" as IndustryKey) ? "general" : selectedIndustry
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-24 rounded-lg border border-dashed border-border bg-muted/20 mt-3">
              <p className="text-sm text-muted-foreground">Select a state above to view jurisdiction-specific guidance.</p>
            </div>
          )}
        </Section>

        {/* ── OSHA Baseline ───────────────────────────────────────────────── */}
        <Section id="baseline">
          <SectionHeading title={OSHA_BASELINE_OVERVIEW.heading} />
          <p className="text-sm text-muted-foreground mb-4">{OSHA_BASELINE_OVERVIEW.intro}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {OSHA_BASELINE_OVERVIEW.keyPoints.map((kp) => (
              <div key={kp.label} className="rounded-lg border border-border bg-card p-4 space-y-1">
                <p className="text-sm font-semibold text-foreground">{kp.label}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{kp.text}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Five Core Program Elements — Pillar Cards ────────────────────── */}
        <Section id="five-elements">
          <SectionHeading title={OSHA_FIVE_ELEMENTS.heading} />
          <p className="text-sm text-muted-foreground mb-5">{OSHA_FIVE_ELEMENTS.intro}</p>
          <div className="space-y-3">
            {OSHA_FIVE_ELEMENTS.elements.map((el, i) => {
              const accent = PILLAR_ACCENTS[i] ?? PILLAR_ACCENTS[0];
              return (
                <div
                  key={el.number}
                  className={`flex gap-4 rounded-lg border border-border bg-card p-5 border-l-4 ${accent.border}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${accent.num}`}
                  >
                    {el.number}
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
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
        </Section>

        {/* ── Documentation Checklist ──────────────────────────────────────── */}
        <Section id="documentation">
          <SectionHeading title={OSHA_DOCUMENTATION.heading} />
          <p className="text-sm font-medium text-foreground mb-4 italic">{OSHA_DOCUMENTATION.intro}</p>
          <div className="space-y-2">
            {OSHA_DOCUMENTATION.documents.map((doc) => (
              <div key={doc.name} className="flex gap-3 rounded-lg border border-border bg-card px-4 py-3">
                <FileText size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{doc.name}</p>
                  <p className="text-sm text-muted-foreground">{doc.purpose}</p>
                  <p className="text-xs text-muted-foreground/70">{doc.whenNeeded}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Recordkeeping vs. Reporting ──────────────────────────────────── */}
        <Section id="recordkeeping">
          <SectionHeading title={OSHA_RECORDKEEPING.heading} />
          <p className="text-sm text-muted-foreground mb-4">{OSHA_RECORDKEEPING.intro}</p>
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
                        <ChevronRight size={11} className={`mt-0.5 flex-shrink-0 ${colors.icon}`} />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── Forms — Grouped by Purpose ───────────────────────────────────── */}
        <Section id="forms">
          <SectionHeading title={OSHA_FORMS.heading} badge="Official OSHA Forms" />
          <p className="text-sm text-muted-foreground mb-5">{OSHA_FORMS.subheading}</p>
          <div className="space-y-5">
            {OSHA_FORMS.groups.map((group) => {
              const groupForms = group.formNames.map((n) => formsByName[n]).filter(Boolean);
              return (
                <div key={group.label}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-bold text-foreground uppercase tracking-wider">{group.label}</p>
                    <span className="text-xs text-muted-foreground">— {group.description}</span>
                  </div>
                  <div className="grid sm:grid-cols-1 gap-2">
                    {groupForms.map((form) => (
                      <div key={form.name} className="flex gap-3 rounded-lg border border-border bg-card px-4 py-3">
                        <Download size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-foreground">{form.name}</p>
                              <p className="text-xs text-muted-foreground">{form.fullName}</p>
                            </div>
                            <a
                              href={form.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline flex-shrink-0 mt-0.5"
                            >
                              <Download size={11} />
                              PDF
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
        </Section>

        {/* ── How This Connects to Your Assessment ────────────────────────── */}
        <Section id="assessment-connection">
          <SectionHeading title={OSHA_ASSESSMENT_CONNECTION.heading} />
          <p className="text-sm text-muted-foreground mb-5">{OSHA_ASSESSMENT_CONNECTION.subheading}</p>
          <div className="space-y-3">
            {OSHA_ASSESSMENT_CONNECTION.connections.map((conn, i) => (
              <div key={conn.left} className="rounded-lg border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-primary">{CONNECTION_ICONS[i]}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground">{conn.left}</span>
                    <ArrowRight size={13} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-bold text-primary">{conn.right}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-7">{conn.detail}</p>
              </div>
            ))}
          </div>
          {/* Callout */}
          <div className="mt-4 flex items-start gap-3 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20">
            <Link2 size={15} className="text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium text-foreground italic">{OSHA_ASSESSMENT_CONNECTION.callout}</p>
          </div>
        </Section>

        {/* ── Official Resources ───────────────────────────────────────────── */}
        <Section id="resources">
          <SectionHeading title={OSHA_RESOURCES.heading} />
          <p className="text-xs text-muted-foreground mb-5">{OSHA_RESOURCES.disclaimer}</p>
          <div className="space-y-6">
            {OSHA_RESOURCES.resources.map((group) => (
              <div key={group.category}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.category}</p>
                <div className="space-y-2">
                  {group.links.map((link) => (
                    <div key={link.label} className="flex gap-3 rounded-lg border border-border bg-card px-4 py-3">
                      <ExternalLink size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {link.label}
                        </a>
                        <p className="text-xs text-muted-foreground">{link.description}</p>
                        {"whenToUse" in link && (link as { whenToUse: string }).whenToUse && (
                          <p className="text-xs text-muted-foreground/60 italic">
                            {(link as { whenToUse: string }).whenToUse}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Coming Next ──────────────────────────────────────────────────── */}
        <Section id="coming-next">
          <Card className="border-dashed border-border bg-muted/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-muted-foreground" />
                <CardTitle className="text-base text-muted-foreground">Coming Next</CardTitle>
                <Badge variant="outline" className="text-xs ml-auto">Phase 3</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Future enhancements to the jurisdiction reference layer:
              </p>
              <ul className="space-y-1">
                {[
                  "Effective date tracking and change alerts",
                  "Compliance gap mapping: your audit results vs. state requirements",
                  "Downloadable state-specific reference cards",
                  "Additional industry overlays (hospitality, construction, education)",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <ChevronRight size={11} className="mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </Section>

      </div>
    </AppLayout>
  );
}
