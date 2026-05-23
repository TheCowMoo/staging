/**
 * DrillScheduler — Unified ACTD Drill Engine
 *
 * Supports two drill types:
 *   micro    — 1–2 min, single decision point, outcome-based feedback
 *   extended — 10–15 min, multiple decision points, admin/facilitator use
 *
 * All output is non-prescriptive: tradeoffs and decision impact, not correct/wrong answers.
 */
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sparkles, ClipboardList, Calendar, Play, Clock, Building2,
  ChevronRight, CheckCircle2, Loader2, Eye, Brain, AlertCircle,
  Zap, Info, Users, GitBranch, MessageSquare, FileText, ChevronDown, ChevronUp,
  RefreshCw, BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import {
  ENVIRONMENTS, THREAT_TYPES, BEHAVIORAL_INDICATORS, RESPONSE_PRESSURES,
  RESPONSE_FOCUSES, COMPLEXITY_LEVELS,
  shortIndicatorLabel, shortComplexityLabel, shortPressureLabel, shortFocusLabel,
  type DrillEnvironment, type DrillThreatType, type DrillBehavioralIndicator,
  type DrillResponsePressure, type DrillResponseFocus, type DrillComplexityLevel,
} from "../../../shared/drillEngine";

// ─── Constants ────────────────────────────────────────────────────────────────
const DRILL_TYPES = [
  { value: "micro",    label: "Micro Drill",       duration: "1–2 min",   desc: "Single decision point. Outcome-based feedback. No movement required." },
  { value: "extended", label: "Extended Scenario", duration: "10–15 min", desc: "Multiple decision points. Admin/facilitator use. Tabletop or simulation." },
] as const;

const INDUSTRIES = [
  "Healthcare", "Education", "Corporate / Office", "Retail",
  "Manufacturing", "Government", "Hospitality", "Transportation", "Other",
];

const STATUS_COLORS: Record<string, string> = {
  scheduled:   "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed:   "bg-green-100 text-green-700",
  cancelled:   "bg-slate-100 text-slate-500",
};

// ─── TypeScript types ─────────────────────────────────────────────────────────
type GuidedResponse = {
  howAnExpertAssesses: string[];
  decisionMakingLens: string[];
  actionConsiderations: string[];
  commonHumanErrors: string[];
  performanceStandard: string;
};

type CompressedGuidedResponse = {
  howAnExpertReadsThis: string[];
  criticalDecision: string;
  mostLikelyMistake: string;
  bestNextMove: string;
};

type OutcomeEntry = {
  riskLevel?: "Low Risk" | "Moderate Risk" | "Elevated Risk" | "Introduces Additional Risk";
  consequence: string;
  tradeoff?: string;
  humanRealismNote?: string;
  coachingConnection?: string;
  likelyOutcome?: string;
  whyThisMatters?: string;
  isStrongest?: boolean;
  coachingNote?: string;
};

type ResponsePath = {
  pathLabel: string;
  description: string;
  riskLevel: string;
  guidanceNote: string;
  outcomeProgression?: string;
};

type DecisionCheckpoint = {
  prompt: string;
  placement: "early" | "mid";
};

type DecisionDoctrineEvaluation = {
  exposure_effect: "positive" | "neutral" | "negative";
  control_effect: "positive" | "neutral" | "negative";
  escalation_effect: "positive" | "neutral" | "negative";
  coordination_effect: "positive" | "neutral" | "negative";
  documentation_effect: "positive" | "neutral" | "negative";
  notes?: string[];
};

type GuidedCheckpointOption = {
  label: string;
  description: string;
  riskLevel?: string;   // legacy field — kept for backward compat
  riskLabel?: string;  // contextual qualifier reflecting personal risk, org risk, subject reaction
  outcome: string;
  tradeoff?: string;   // what was gained; what risk was introduced
  reasoning: string;
  doctrine_evaluation?: DecisionDoctrineEvaluation; // five-dimension doctrine evaluation
};

type EscalationVariants = {
  alertInitiated: string;    // situation when security/alert was initiated in checkpoint 1
  directIntervention: string; // situation when participant intervened directly
  noAction: string;          // situation when no action was taken
};

type GuidedCheckpoint = {
  phase: "initial" | "escalation";
  prompt: string;
  priorityFraming?: string;           // "Your priority: ..."
  escalationContext?: string | null;  // default fallback context
  escalationVariants?: EscalationVariants | null; // 3-variant continuity (escalation phase only)
  options: [GuidedCheckpointOption, GuidedCheckpointOption, GuidedCheckpointOption];
};

type RoleSpecificCue = {
  role: string;
  cue: string;
};

type TeamRole = {
  role: string;
  primaryAction: string;
  communicationTrigger: string;
};

type TimelineEntry = {
  timeMarker: string;
  event: string;
  expectedAction: string;
};

type DecisionBranch = {
  trigger: string;
  ifYes: string;
  ifNo: string;
  riskLabel?: string; // four-segment standardized label (Operational drills)
};

type Inject = {
  injectNumber: number;
  timeMarker: string;
  event: string;
  expectedDecision: string;
  facilitatorNote: string;
};

type ParticipantRole = {
  role: string;
  briefing: string;
  keyDecision: string;
};

type DrillContent = {
  title: string;
  drillType: string;
  durationMinutes: number;
  primaryThreatSignal?: string;
  decisionPressure?: string;
  behavioralCues?: string[];
  objective: string;
  scenario: string;
  actd: {
    assess: { whatToNotice: string[]; signalsThatMatter: string[] };
    commit: { decisionRequired: string; hesitationRisks: string[] };
    takeAction: { availableActions: string[]; adaptabilityNote: string };
    debrief: { whatToDocument: string[]; whatToImprove: string[] };
  };
  guidedResponse?: GuidedResponse | null;
  // Non-prescriptive decision impact (replaces correct/wrong outcome framing)
  decisionImpact?: {
    highCoordinationPath: string;
    moderateControlPath: string;
    highExposurePath: string;
  } | null;
  // Short debrief questions (awareness-focused, no grading)
  shortDebrief?: string[] | null;
  // Micro
  responseOptions?: string[] | null;
  outcomeMap?: Record<string, OutcomeEntry> | null;
  compressedGuidedResponse?: CompressedGuidedResponse | null;
  microDebriefQuestion?: string | null;
  // Guided (legacy)
  responsePaths?: ResponsePath[] | null;
  decisionCheckpoints?: DecisionCheckpoint[] | null;
  guidedCheckpoints?: GuidedCheckpoint[] | null;
  roleSpecificCues?: RoleSpecificCue[] | null;
  documentationSection?: { whatToCapture: string[]; timeframe: string } | null;
  // Operational (legacy)
  teamRoles?: TeamRole[] | null;
  scenarioTimeline?: TimelineEntry[] | null;
  communicationCheckpoints?: string[] | null;
  decisionBranches?: DecisionBranch[] | null;
  // Extended
  exerciseType?: "tabletop" | "walkthrough" | "simulation" | null;
  facilitatorSetup?: { roomSetup: string; materialsNeeded: string[]; preExerciseBriefing: string } | null;
  injects?: Inject[] | null;
  participantRoles?: ParticipantRole[] | null;
  criticalDecisions?: string[] | null;
  communicationsFlow?: { internalNotification: string; externalNotification: string; publicCommunication: string } | null;
  afterActionTemplate?: { strengthsPrompt: string; gapsPrompt: string; improvementActions: string; followUpDeadline: string } | null;
  // Common
  executionInstructions: string[];
  expectedOutcomes: string[];
  commonBreakdowns: string[];
  debriefQuestions: string[];
  regulatoryAlignment: string[];
};

// ─── Regulation full-citation map ─────────────────────────────────────────────
const REG_CITATIONS: Record<string, string> = {
  "OSHA": "OSHA 29 CFR 1910.38 — Emergency Action Plans; General Duty Clause §5(a)(1)",
  "DHS": "DHS CISA Workplace Violence Prevention for Critical Infrastructure",
  "CISA": "CISA Active Shooter Preparedness Program — Risk Assessment Principles",
  "NFPA 3000": "NFPA 3000 (2021) — Standard for an Active Shooter / Hostile Event Response Program",
  "Canada Labour Code": "Canada Labour Code Part II — Occupational Health and Safety",
  "CSA Z1002": "CSA Z1002-12 — Occupational Health and Safety — Hazard Identification and Elimination",
  "Ontario OHSA": "Ontario Occupational Health and Safety Act — Bill 168 Workplace Violence Prevention",
  "WorkSafeBC": "BC WorkSafeBC Violence Prevention in the Workplace Regulation",
  "Local Standards": "Applicable local/municipal emergency response ordinances",
};

function RegulationTag({ label }: { label: string }) {
  const citation = REG_CITATIONS[label] ?? label;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className="text-xs bg-blue-50 text-blue-700 border-blue-200 cursor-help gap-1 max-w-[180px] truncate">
            <Info className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {citation}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── normalizeReasoning: strip duplicate priority-alignment language from legacy content ───
/**
 * Ensures the priority-alignment phrase ("supports the priority", "partially supports",
 * "conflicts with the priority") appears ONLY in the first sentence.
 * Any subsequent sentence that restates priority alignment is removed.
 */
function normalizeReasoning(text: string): string {
  if (!text) return text;
  // Split into sentences on '. ' or '.' at end
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  if (sentences.length <= 1) return text;

  const PRIORITY_PATTERN = /supports the priority|partially supports the priority|conflicts with the priority|aligns with the priority|advances the priority|consistent with the priority|in line with the priority|reinforces the priority/i;

  const [first, ...rest] = sentences;
  // Keep only sentences that do NOT re-state priority alignment
  const filtered = rest.filter(s => !PRIORITY_PATTERN.test(s));
  return [first, ...filtered].join(" ").replace(/\s{2,}/g, " ").trim();
}

// ─── Guided Response Modal ───────────────────────────────────────────────────
const RISK_CONFIG: Record<string, { border: string; bg: string; badge: string; icon: React.ReactNode }> = {
  "Low Risk":                   { border: "border-green-300",  bg: "bg-green-50",  badge: "bg-green-100 text-green-800",  icon: <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /> },
  "Moderate Risk":              { border: "border-blue-300",   bg: "bg-blue-50",   badge: "bg-blue-100 text-blue-800",   icon: <AlertCircle className="h-4 w-4 text-blue-600 shrink-0" /> },
  "Elevated Risk":              { border: "border-amber-300",  bg: "bg-amber-50",  badge: "bg-amber-100 text-amber-800",  icon: <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" /> },
  "Introduces Additional Risk": { border: "border-red-300",    bg: "bg-red-50",    badge: "bg-red-100 text-red-800",    icon: <AlertCircle className="h-4 w-4 text-red-600 shrink-0" /> },
};

// ─── ACTD Phases Card (shared) ─────────────────────────────────────────────────
function ACTDPhasesCard({ actd, compact = false }: { actd: DrillContent["actd"]; compact?: boolean }) {
  const phases = [
    {
      phase: "ASSESS",
      color: "bg-blue-50 border-blue-200 text-blue-800",
      items: [...actd.assess.whatToNotice, ...actd.assess.signalsThatMatter],
    },
    {
      phase: "COMMIT",
      color: "bg-amber-50 border-amber-200 text-amber-800",
      items: [actd.commit.decisionRequired, ...actd.commit.hesitationRisks],
    },
    {
      phase: "TAKE ACTION",
      color: "bg-red-50 border-red-200 text-red-800",
      items: [...actd.takeAction.availableActions, actd.takeAction.adaptabilityNote],
    },
    {
      phase: "DEBRIEF",
      color: "bg-green-50 border-green-200 text-green-800",
      items: [...actd.debrief.whatToDocument],
    },
  ];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">ACTD Framework Application</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {phases.map(({ phase, color, items }) => (
          <div key={phase} className={`rounded-lg border px-3 py-2.5 ${color}`}>
            <p className="text-xs font-bold mb-1.5 tracking-wide">{phase}</p>
            <ul className="space-y-1">
              {(compact ? items.slice(0, 3) : items).map((item, i) => (
                <li key={i} className="text-xs flex gap-1.5 leading-relaxed">
                  <span className="mt-0.5 shrink-0">·</span>
                  <span className="break-words" style={{ overflowWrap: "anywhere" }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Guided Response Modal (full — for guided/operational/extended) ─────────────
function GuidedResponseModal({ open, onClose, guidedResponse, drillType }: {
  open: boolean;
  onClose: () => void;
  guidedResponse: GuidedResponse;
  drillType: string;
}) {
  const isMicro = drillType === "micro";
  const sections = [
    {
      icon: <Eye className="h-4 w-4 text-blue-600" />,
      title: "How an Expert Assesses",
      color: "border-blue-200 bg-blue-50",
      titleColor: "text-blue-800",
      items: guidedResponse.howAnExpertAssesses,
    },
    {
      icon: <Brain className="h-4 w-4 text-amber-600" />,
      title: "Decision-Making Lens",
      color: "border-amber-200 bg-amber-50",
      titleColor: "text-amber-800",
      items: guidedResponse.decisionMakingLens,
    },
    ...(!isMicro ? [{
      icon: <Zap className="h-4 w-4 text-red-600" />,
      title: "Action Considerations",
      color: "border-red-200 bg-red-50",
      titleColor: "text-red-800",
      items: guidedResponse.actionConsiderations,
    }] : []),
    {
      icon: <AlertCircle className="h-4 w-4 text-orange-600" />,
      title: "Common Human Errors",
      color: "border-orange-200 bg-orange-50",
      titleColor: "text-orange-800",
      items: guidedResponse.commonHumanErrors,
    },
  ];

  // For guided drills: show only the first bullet per section to keep reading time ~60–90 seconds
  const isGuided = drillType === "guided";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Expert Thinking Framework
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {isGuided
              ? "High-signal insights only. How an expert perceives and reasons through this scenario."
              : "This is not a checklist. It shows how an expert perceives and reasons through this scenario."}
          </p>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {sections.map(({ icon, title, color, titleColor, items }) => {
            // Guided drills: show only the first (highest-signal) bullet
            const displayItems = isGuided ? items.slice(0, 1) : items;
            return (
              <div key={title} className={`rounded-lg border p-3 ${color}`}>
                <div className={`flex items-center gap-2 font-semibold text-sm mb-1.5 ${titleColor}`}>
                  {icon}{title}
                </div>
                <ul className="space-y-1">
                  {displayItems.map((item, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="mt-0.5 shrink-0 text-muted-foreground">·</span>
                      <span className="break-words" style={{ overflowWrap: "anywhere" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="flex items-center gap-2 font-semibold text-sm text-green-800 mb-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Performance Standard
            </div>
            <p className="text-sm text-green-900 break-words" style={{ overflowWrap: "anywhere" }}>
              {guidedResponse.performanceStandard}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Accordion section helper ─────────────────────────────────────────────────
function AccordionSection({ title, icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {icon}{title}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

// ─── MICRO DRILL UI ────────────────────────────────────────────────────────────
function MicroDrillCard({ content, selectedOption, setSelectedOption, outcomeRevealed, setOutcomeRevealed, onExpertThinking }: {
  content: DrillContent;
  selectedOption: string | null;
  setSelectedOption: (o: string | null) => void;
  outcomeRevealed: boolean;
  setOutcomeRevealed: (v: boolean) => void;
  onExpertThinking: () => void;
}) {
  if (!content.responseOptions?.length) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-amber-500" /> Rapid Decision Point
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">Read the scenario above, then select your response. No movement required.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {content.responseOptions.map((option, i) => {
            const isSelected = selectedOption === option;
            return (
              <button
                key={i}
                onClick={() => { setSelectedOption(option); setOutcomeRevealed(false); }}
                className={`w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/40 hover:bg-accent/30"
                }`}
              >
                <span className="font-medium text-muted-foreground mr-2">{String.fromCharCode(65 + i)}.</span>
                <span className="break-words" style={{ overflowWrap: "anywhere" }}>{option}</span>
              </button>
            );
          })}
        </div>

        {selectedOption && !outcomeRevealed && (
          <Button size="sm" className="w-full" onClick={() => setOutcomeRevealed(true)}>
            <Eye className="h-3.5 w-3.5 mr-1.5" /> Reveal Outcome
          </Button>
        )}

        {selectedOption && outcomeRevealed && (() => {
          const outcome = content.outcomeMap?.[selectedOption];
          if (!outcome) return null;
          const riskLevel = outcome.riskLevel ?? (outcome.isStrongest ? "Low Risk" : "Elevated Risk");
          const cfg = RISK_CONFIG[riskLevel] ?? RISK_CONFIG["Moderate Risk"];
          return (
            <div className={`rounded-lg border p-3 space-y-3 ${cfg.border} ${cfg.bg}`}>
              <div className="flex items-center gap-2">
                {cfg.icon}
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{riskLevel}</span>
              </div>
              <p className="text-sm break-words leading-relaxed" style={{ overflowWrap: "anywhere" }}>{outcome.consequence}</p>
              {(outcome.humanRealismNote ?? outcome.coachingNote) && (
                <div className="rounded-md bg-white/70 border border-slate-200 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-600 mb-0.5">Human Realism</p>
                  <p className="text-xs text-slate-700 italic break-words" style={{ overflowWrap: "anywhere" }}>
                    {outcome.humanRealismNote ?? outcome.coachingNote}
                  </p>
                </div>
              )}
              {outcome.tradeoff && (
                <div className="rounded-md bg-white/70 border border-slate-200 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-600 mb-0.5">Tradeoff</p>
                  <p className="text-xs text-slate-700 break-words" style={{ overflowWrap: "anywhere" }}>{outcome.tradeoff}</p>
                </div>
              )}
              {outcome.coachingConnection && (
                <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                  <p className="text-xs font-semibold text-primary mb-0.5">Coaching Insight</p>
                  <p className="text-xs text-foreground break-words leading-relaxed" style={{ overflowWrap: "anywhere" }}>{outcome.coachingConnection}</p>
                </div>
              )}
              {outcome.likelyOutcome && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="text-xs font-semibold text-amber-800 mb-0.5 flex items-center gap-1">
                    <span>⏱</span> Likely Outcome (Next 60–120 Seconds)
                  </p>
                  <p className="text-xs text-amber-900 break-words leading-relaxed" style={{ overflowWrap: "anywhere" }}>{outcome.likelyOutcome}</p>
                  {outcome.whyThisMatters && (
                    <p className="text-xs text-amber-700 mt-1.5 italic border-t border-amber-200 pt-1.5">
                      <span className="font-semibold not-italic">Why This Matters: </span>{outcome.whyThisMatters}
                    </p>
                  )}
                </div>
              )}
              {content.compressedGuidedResponse && (
                <Button variant="outline" size="sm" className="w-full mt-1" onClick={onExpertThinking}>
                  <Brain className="h-3.5 w-3.5 mr-1.5" /> Expert Thinking
                </Button>
              )}
              {content.microDebriefQuestion && (
                <div className="rounded-md bg-white/60 border border-slate-200 px-3 py-2 mt-1">
                  <p className="text-xs font-semibold mb-1">Debrief Question</p>
                  <p className="text-xs break-words" style={{ overflowWrap: "anywhere" }}>{content.microDebriefQuestion}</p>
                </div>
              )}
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}

// ─── Guided Checkpoint Card (single checkpoint with gated options + compare mode) ─────────────────
function GuidedCheckpointCard({
  checkpoint,
  checkpointIndex,
  totalCheckpoints,
  selectedOption,
  onSelect,
  isLocked,
  priorSelection,
}: {
  checkpoint: GuidedCheckpoint;
  checkpointIndex: number;
  totalCheckpoints: number;
  selectedOption: string | null;
  onSelect: (label: string) => void;
  isLocked: boolean;
  priorSelection?: string | null; // the label selected in checkpoint 1 (for variant routing)
}) {
  const isEscalation = checkpoint.phase === "escalation";
  const revealed = selectedOption !== null;
  // Compare mode: after selection, user can expand other options to see their outcomes
  const [compareExpanded, setCompareExpanded] = useState<Set<string>>(new Set());

  const toggleCompare = (label: string) => {
    setCompareExpanded(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  // Derive a visual style tier from contextual riskLabel for color coding
  const getRiskStyle = (riskLabel: string | undefined, riskLevel: string | undefined) => {
    // Prefer legacy riskLevel for RISK_CONFIG lookup if present
    if (riskLevel && RISK_CONFIG[riskLevel]) return RISK_CONFIG[riskLevel];
    // Infer from contextual riskLabel keywords
    const label = (riskLabel ?? "").toLowerCase();
    if (label.includes("immediate") || label.includes("controlled") || label.includes("lower personal") || label.includes("preserves")) {
      return RISK_CONFIG["Low Risk"];
    }
    if (label.includes("higher control") || label.includes("uncertainty") || label.includes("delays") || label.includes("slower")) {
      return RISK_CONFIG["Moderate Risk"];
    }
    if (label.includes("exposure") || label.includes("escalat") || label.includes("loss of")) {
      return RISK_CONFIG["Elevated Risk"];
    }
    if (label.includes("additional risk") || label.includes("confrontat") || label.includes("without backup")) {
      return RISK_CONFIG["Introduces Additional Risk"];
    }
    return RISK_CONFIG["Moderate Risk"];
  };

  return (
    <Card className={`border-2 ${isEscalation ? "border-orange-300" : "border-blue-300"}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
            isEscalation ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"
          }`}>
            {isEscalation ? `⚠️ Escalation — Checkpoint ${checkpointIndex + 1} of ${totalCheckpoints}` : `Checkpoint ${checkpointIndex + 1} of ${totalCheckpoints}`}
          </span>
        </div>
        {/* Escalation context — show variant if available and prior selection known, else fallback */}
        {isEscalation && (() => {
          const variants = checkpoint.escalationVariants;
          let contextText: string | null = null;
          if (variants && priorSelection) {
            const lower = priorSelection.toLowerCase();
            // CAUSALITY ROUTING: match prior selection label to the correct escalation variant.
            // Coordination-first actions → alertInitiated variant
            const isAlertPath = lower.includes("alert") || lower.includes("security") ||
              lower.includes("notify") || lower.includes("call") || lower.includes("radio") ||
              lower.includes("report") || lower.includes("contact") || lower.includes("coordinat") ||
              lower.includes("observe") || lower.includes("monitor") || lower.includes("watch");
            // Direct control actions → directIntervention variant
            const isInterventionPath = lower.includes("verbal") || lower.includes("de-escalat") ||
              lower.includes("intervene") || lower.includes("approach") || lower.includes("block") ||
              lower.includes("position") || lower.includes("intercept") || lower.includes("confront") ||
              lower.includes("direct") || lower.includes("command") || lower.includes("engage") ||
              lower.includes("redirect") || lower.includes("challenge");
            if (isAlertPath) {
              contextText = variants.alertInitiated;
            } else if (isInterventionPath) {
              contextText = variants.directIntervention;
            } else {
              // Passive / delayed / no-action path
              contextText = variants.noAction;
            }
          }
          const displayText = contextText ?? checkpoint.escalationContext;
          return displayText ? (
            <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 mb-2">
              <p className="text-xs font-semibold text-orange-800 mb-0.5">Situation Update</p>
              <p className="text-xs text-orange-900 break-words leading-relaxed" style={{ overflowWrap: "anywhere" }}>
                {displayText}
              </p>
            </div>
          ) : null;
        })()}
        {/* Priority framing */}
        {checkpoint.priorityFraming && (
          <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 mb-2">
            <p className="text-xs font-semibold text-indigo-800 break-words" style={{ overflowWrap: "anywhere" }}>
              {checkpoint.priorityFraming}
            </p>
          </div>
        )}
        <CardTitle className="text-sm font-semibold text-foreground break-words" style={{ overflowWrap: "anywhere" }}>
          {checkpoint.prompt}
        </CardTitle>
        {!revealed && (
          <p className="text-xs text-muted-foreground mt-1">Select an option to continue. Outcomes are hidden until you choose.</p>
        )}
        {revealed && (
          <p className="text-xs text-muted-foreground mt-1">Primary path selected. Explore other approaches to compare outcomes.</p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {checkpoint.options.map((option, i) => {
          const isSelected = selectedOption === option.label;
          const isCompareOpen = !isSelected && compareExpanded.has(option.label);
          const cfg = getRiskStyle(option.riskLabel, option.riskLevel);

          return (
            <div key={i}>
              {/* Option button */}
              <button
                disabled={isLocked}
                onClick={() => {
                  if (!revealed && !isLocked) {
                    onSelect(option.label);
                  } else if (revealed && !isSelected) {
                    toggleCompare(option.label);
                  }
                }}
                className={`w-full text-left rounded-lg border px-3 py-2.5 transition-all ${
                  revealed && isSelected
                    ? `${cfg.border} ${cfg.bg} ring-2 ring-offset-1`
                    : revealed && isCompareOpen
                    ? "border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                    : revealed && !isSelected
                    ? "border-border bg-muted/20 hover:bg-muted/40 cursor-pointer"
                    : isLocked
                    ? "border-border bg-muted/20 opacity-40 cursor-not-allowed"
                    : "border-border hover:border-primary/50 hover:bg-accent/30 cursor-pointer"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xs font-bold text-muted-foreground shrink-0 mt-0.5">{String.fromCharCode(65 + i)}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold break-words" style={{ overflowWrap: "anywhere" }}>{option.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 break-words" style={{ overflowWrap: "anywhere" }}>{option.description}</p>
                    {/* Single-line label — always visible below description */}
                    {(option.riskLabel || option.riskLevel) && (
                      <p className="text-xs text-slate-500 mt-1 break-words" style={{ overflowWrap: "anywhere" }}>
                        {option.riskLabel ?? option.riskLevel}
                      </p>
                    )}
                  </div>
                  {revealed && !isSelected && (
                    <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                      {isCompareOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      <span className="text-xs">{isCompareOpen ? "Hide" : "Compare"}</span>
                    </span>
                  )}
                </div>
              </button>

              {/* Reveal panel: selected option — full outcome + tradeoff + reasoning */}
              {revealed && isSelected && (
                <div className={`mt-1.5 rounded-lg border p-3 space-y-2.5 ${cfg.border} ${cfg.bg}`}>
                  <div className="flex items-center gap-2">
                    {cfg.icon}
                    <span className="text-xs font-bold">What happens next</span>
                  </div>
                  <p className="text-sm break-words leading-relaxed" style={{ overflowWrap: "anywhere" }}>{option.outcome}</p>
                  {/* Tradeoff */}
                  {option.tradeoff && (
                    <div className="rounded-md border border-slate-200 bg-white/70 px-3 py-2">
                      <p className="text-xs font-semibold text-slate-700 mb-0.5 flex items-center gap-1">
                        <span className="text-slate-500">⇆</span> Tradeoff
                      </p>
                      <p className="text-xs text-slate-800 break-words leading-relaxed" style={{ overflowWrap: "anywhere" }}>{option.tradeoff}</p>
                    </div>
                  )}
                  {/* Expert Reasoning */}
                  <div className="rounded-md bg-white/70 border border-slate-200 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-700 mb-0.5 flex items-center gap-1">
                      <Brain className="h-3 w-3" /> Expert Reasoning
                    </p>
                    <p className="text-xs text-slate-800 break-words leading-relaxed" style={{ overflowWrap: "anywhere" }}>{normalizeReasoning(option.reasoning)}</p>
                  </div>
                </div>
              )}

              {/* Compare panel: non-selected options — shown when expanded */}
              {revealed && !isSelected && isCompareOpen && (
                <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-700 shrink-0">If you had chosen this…</span>
                    {(option.riskLabel || option.riskLevel) && (
                      <span className="text-xs text-slate-600" style={{ overflowWrap: "anywhere" }}>
                        {option.riskLabel ?? option.riskLevel}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-800 break-words leading-relaxed" style={{ overflowWrap: "anywhere" }}>{option.outcome}</p>
                  {option.tradeoff && (
                    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                      <p className="text-xs font-semibold text-slate-600 mb-0.5">⇆ Tradeoff</p>
                      <p className="text-xs text-slate-700 break-words" style={{ overflowWrap: "anywhere" }}>{option.tradeoff}</p>
                    </div>
                  )}
                  <div className="rounded-md bg-white border border-slate-200 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-600 mb-0.5 flex items-center gap-1"><Brain className="h-3 w-3" /> Expert Reasoning</p>
                    <p className="text-xs text-slate-700 break-words" style={{ overflowWrap: "anywhere" }}>{normalizeReasoning(option.reasoning)}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── GUIDED DRILL UI ───────────────────────────────────────────────────────────
function GuidedDrillCard({ content, onGuidedResponse }: {
  content: DrillContent;
  onGuidedResponse: () => void;
}) {
  // Track selected option per checkpoint index
  const [selections, setSelections] = useState<Record<number, string>>({});

  const checkpoints = content.guidedCheckpoints ?? [];
  const hasNewCheckpoints = checkpoints.length > 0;

  // INTERACTIVITY FIX: every checkpoint is independently selectable.
  // Checkpoint 2 is NEVER locked by Checkpoint 1 selection state.
  // Options only lock AFTER selection at that specific checkpoint.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isCheckpointUnlocked = (_idx: number) => true;

  // Role cues and docs are shown after checkpoint 1 is answered (or immediately if no checkpoints)
  const showRoleCuesAndDocs = !hasNewCheckpoints || !!selections[0];

  // Debrief: shown when all checkpoints are answered
  const allAnswered = hasNewCheckpoints && checkpoints.every((_, idx) => !!selections[idx]);

  // Restart: clear all selections
  const handleRestart = () => setSelections({});

  return (
    <div className="space-y-3">
      {/* New gated checkpoint flow */}
      {hasNewCheckpoints ? (
        <>
          {checkpoints.map((cp, idx) => (
            <GuidedCheckpointCard
              key={idx}
              checkpoint={cp}
              checkpointIndex={idx}
              totalCheckpoints={checkpoints.length}
              selectedOption={selections[idx] ?? null}
              onSelect={(label) => setSelections(prev => ({ ...prev, [idx]: label }))}
              isLocked={!isCheckpointUnlocked(idx)}
              priorSelection={idx > 0 ? (selections[idx - 1] ?? null) : null}
            />
          ))}

          {/* Drill Completion Debrief Card — shown after all checkpoints answered */}
          {allAnswered && (
            <Card className="border-2 border-indigo-300 bg-indigo-50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-indigo-900">
                    <BookOpen className="h-4 w-4 text-indigo-600" />
                    Drill Debrief Snapshot
                  </CardTitle>
                  <button
                    onClick={handleRestart}
                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 hover:text-indigo-900 border border-indigo-300 rounded-md px-2 py-1 hover:bg-indigo-100 transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" /> Restart Drill
                  </button>
                </div>
                <p className="text-xs text-indigo-700 mt-1">Your decision path for this drill. Review your choices and their risk profiles before the facilitator debrief.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {checkpoints.map((cp, idx) => {
                  const chosenLabel = selections[idx];
                  const chosenOption = cp.options.find(o => o.label === chosenLabel);
                  return (
                    <div key={idx} className="rounded-lg border border-indigo-200 bg-white/70 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                          cp.phase === "escalation" ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {cp.phase === "escalation" ? `⚠️ Escalation — CP${idx + 1}` : `Checkpoint ${idx + 1}`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 break-words" style={{ overflowWrap: "anywhere" }}>{cp.prompt}</p>
                      <div className="rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 space-y-1.5">
                        <p className="text-xs font-semibold text-indigo-800">Your choice: {chosenLabel}</p>
                        {chosenOption?.riskLabel && (
                          <p className="text-xs text-slate-600 break-words" style={{ overflowWrap: "anywhere" }}>{chosenOption.riskLabel}</p>
                        )}
                        {chosenOption?.reasoning && (
                          <p className="text-xs text-slate-700 mt-1 break-words leading-relaxed" style={{ overflowWrap: "anywhere" }}>
                            <span className="font-semibold">Expert Reasoning: </span>{normalizeReasoning(chosenOption.reasoning)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* Performance standard from expert thinking panel */}
                {content.guidedResponse?.performanceStandard && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                    <p className="text-xs font-semibold text-green-800 mb-0.5 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Performance Standard
                    </p>
                    <p className="text-xs text-green-900 break-words leading-relaxed" style={{ overflowWrap: "anywhere" }}>
                      {content.guidedResponse.performanceStandard}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        /* Legacy fallback: old responsePaths rendering for drills generated before this update */
        content.responsePaths && content.responsePaths.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <GitBranch className="h-4 w-4 text-blue-500" /> Response Paths
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {content.responsePaths.map((path, i) => {
                const cfg = RISK_CONFIG[path.riskLevel] ?? RISK_CONFIG["Moderate Risk"];
                return (
                  <div key={i} className={`rounded-lg border p-3 space-y-1.5 ${cfg.border} ${cfg.bg}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold break-words" style={{ overflowWrap: "anywhere" }}>{path.pathLabel}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>{path.riskLevel}</span>
                    </div>
                    <p className="text-xs text-foreground/80 break-words leading-relaxed" style={{ overflowWrap: "anywhere" }}>{path.description}</p>
                    {path.guidanceNote && (
                      <div className="rounded-md bg-white/60 border border-slate-200 px-2.5 py-1.5">
                        <p className="text-xs font-semibold text-slate-600 mb-0.5">Guidance Note</p>
                        <p className="text-xs text-slate-700 break-words" style={{ overflowWrap: "anywhere" }}>{path.guidanceNote}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )
      )}

      {/* Role-Specific Cues — shown after first checkpoint answered (or always for legacy drills) */}
      {showRoleCuesAndDocs && content.roleSpecificCues && content.roleSpecificCues.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Users className="h-4 w-4 text-violet-500" /> Role-Specific Decision Cues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {content.roleSpecificCues.map((cue, i) => (
                <div key={i} className="flex gap-3 rounded-md border border-violet-100 bg-violet-50 px-3 py-2">
                  <span className="text-xs font-bold text-violet-700 shrink-0 min-w-[80px] break-words">{cue.role}</span>
                  <span className="text-xs text-violet-900 break-words" style={{ overflowWrap: "anywhere" }}>{cue.cue}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documentation Section — shown after first checkpoint answered (or always for legacy drills) */}
      {showRoleCuesAndDocs && content.documentationSection && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-slate-500" /> Documentation Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-1">
              {content.documentationSection.whatToCapture.map((item, i) => (
                <li key={i} className="text-xs flex gap-1.5">
                  <span className="shrink-0 mt-0.5">·</span>
                  <span className="break-words" style={{ overflowWrap: "anywhere" }}>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground italic">Timeframe: {content.documentationSection.timeframe}</p>
          </CardContent>
        </Card>
      )}

      {/* Expert Thinking Panel — shown after both checkpoints answered (or always for legacy drills) */}
      {content.guidedResponse && (!hasNewCheckpoints || (!!selections[0] && !!selections[checkpoints.length - 1])) && (
        <Button variant="outline" size="sm" className="w-full" onClick={onGuidedResponse}>
          <Brain className="h-3.5 w-3.5 mr-1.5" /> View Expert Thinking Panel
        </Button>
      )}
    </div>
  );
}

// ─── OPERATIONAL DRILL UI ─────────────────────────────────────────────────────
function OperationalDrillCard({ content, onGuidedResponse }: {
  content: DrillContent;
  onGuidedResponse: () => void;
}) {
  return (
    <div className="space-y-3">
      {/* Team Roles */}
      {content.teamRoles && content.teamRoles.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Users className="h-4 w-4 text-blue-500" /> Team Roles & Responsibilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {content.teamRoles.map((role, i) => (
                <div key={i} className="rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-1">
                  <p className="text-xs font-bold text-blue-800 break-words">{role.role}</p>
                  <p className="text-xs text-blue-900 break-words" style={{ overflowWrap: "anywhere" }}>
                    <span className="font-semibold">Primary Action: </span>{role.primaryAction}
                  </p>
                  <p className="text-xs text-blue-700 break-words" style={{ overflowWrap: "anywhere" }}>
                    <span className="font-semibold">Communication Trigger: </span>{role.communicationTrigger}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scenario Timeline */}
      {content.scenarioTimeline && content.scenarioTimeline.length > 0 && (
        <AccordionSection title="Scenario Timeline" icon={<Clock className="h-4 w-4 text-amber-500" />} defaultOpen>
          <div className="space-y-2">
            {content.scenarioTimeline.map((entry, i) => (
              <div key={i} className="flex gap-3">
                <div className="shrink-0 w-16 text-xs font-bold text-amber-700 pt-0.5">{entry.timeMarker}</div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-xs font-medium break-words" style={{ overflowWrap: "anywhere" }}>{entry.event}</p>
                  <p className="text-xs text-muted-foreground break-words" style={{ overflowWrap: "anywhere" }}>
                    <span className="font-semibold">Expected: </span>{entry.expectedAction}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}

      {/* Communication Checkpoints */}
      {content.communicationCheckpoints && content.communicationCheckpoints.length > 0 && (
        <AccordionSection title="Communication Checkpoints" icon={<MessageSquare className="h-4 w-4 text-green-500" />} defaultOpen>
          <ul className="space-y-1.5">
            {content.communicationCheckpoints.map((cp, i) => (
              <li key={i} className="flex gap-2 text-xs">
                <span className="shrink-0 font-bold text-green-700">{i + 1}.</span>
                <span className="break-words" style={{ overflowWrap: "anywhere" }}>{cp}</span>
              </li>
            ))}
          </ul>
        </AccordionSection>
      )}

      {/* Decision Branches */}
      {content.decisionBranches && content.decisionBranches.length > 0 && (
        <AccordionSection title="Decision Branches" icon={<GitBranch className="h-4 w-4 text-red-500" />}>
          <div className="space-y-3">
            {content.decisionBranches.map((branch, i) => (
              <div key={i} className="rounded-md border border-slate-200 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-slate-700 break-words" style={{ overflowWrap: "anywhere" }}>
                  If: {branch.trigger}
                </p>
                {branch.riskLabel && (
                  <p className="text-xs text-slate-600 break-words" style={{ overflowWrap: "anywhere" }}>{branch.riskLabel}</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded bg-green-50 border border-green-200 px-2 py-1.5">
                    <p className="text-xs font-semibold text-green-700 mb-0.5">Yes →</p>
                    <p className="text-xs text-green-900 break-words" style={{ overflowWrap: "anywhere" }}>{branch.ifYes}</p>
                  </div>
                  <div className="rounded bg-red-50 border border-red-200 px-2 py-1.5">
                    <p className="text-xs font-semibold text-red-700 mb-0.5">No →</p>
                    <p className="text-xs text-red-900 break-words" style={{ overflowWrap: "anywhere" }}>{branch.ifNo}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}

      {content.guidedResponse && (
        <Button variant="outline" size="sm" className="w-full" onClick={onGuidedResponse}>
          <Brain className="h-3.5 w-3.5 mr-1.5" /> View Facilitator Guidance
        </Button>
      )}
    </div>
  );
}

// ─── EXTENDED SCENARIO UI ─────────────────────────────────────────────────────
function ExtendedScenarioCard({ content, onGuidedResponse }: {
  content: DrillContent;
  onGuidedResponse: () => void;
}) {
  return (
    <div className="space-y-3">
      {/* Exercise type + facilitator setup */}
      {(content.exerciseType || content.facilitatorSetup) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              Exercise Setup
              {content.exerciseType && (
                <Badge className="text-xs capitalize bg-slate-100 text-slate-700 border-slate-200 ml-1">
                  {content.exerciseType}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          {content.facilitatorSetup && (
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Room Setup</p>
                <p className="text-xs text-slate-700 break-words" style={{ overflowWrap: "anywhere" }}>{content.facilitatorSetup.roomSetup}</p>
              </div>
              {content.facilitatorSetup.materialsNeeded.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-1">Materials Needed</p>
                  <ul className="space-y-0.5">
                    {content.facilitatorSetup.materialsNeeded.map((m, i) => (
                      <li key={i} className="text-xs flex gap-1.5">
                        <span className="shrink-0">·</span>
                        <span className="break-words" style={{ overflowWrap: "anywhere" }}>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Pre-Exercise Briefing</p>
                <p className="text-xs text-slate-700 break-words leading-relaxed" style={{ overflowWrap: "anywhere" }}>{content.facilitatorSetup.preExerciseBriefing}</p>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Participant Roles */}
      {content.participantRoles && content.participantRoles.length > 0 && (
        <AccordionSection title="Participant Roles" icon={<Users className="h-4 w-4 text-violet-500" />} defaultOpen>
          <div className="space-y-2">
            {content.participantRoles.map((pr, i) => (
              <div key={i} className="rounded-lg border border-violet-100 bg-violet-50 p-3 space-y-1">
                <p className="text-xs font-bold text-violet-800">{pr.role}</p>
                <p className="text-xs text-violet-900 break-words" style={{ overflowWrap: "anywhere" }}>{pr.briefing}</p>
                <p className="text-xs text-violet-700 italic break-words" style={{ overflowWrap: "anywhere" }}>
                  <span className="font-semibold not-italic">Key Decision: </span>{pr.keyDecision}
                </p>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}

      {/* Injects */}
      {content.injects && content.injects.length > 0 && (
        <AccordionSection title="Scenario Injects" icon={<Zap className="h-4 w-4 text-amber-500" />} defaultOpen>
          <div className="space-y-3">
            {content.injects.map((inject, i) => (
              <div key={i} className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">
                    Inject {inject.injectNumber}
                  </span>
                  <span className="text-xs text-amber-700">{inject.timeMarker}</span>
                </div>
                <p className="text-xs font-medium text-amber-900 break-words" style={{ overflowWrap: "anywhere" }}>{inject.event}</p>
                <p className="text-xs text-amber-800 break-words" style={{ overflowWrap: "anywhere" }}>
                  <span className="font-semibold">Expected Decision: </span>{inject.expectedDecision}
                </p>
                <div className="rounded bg-white/60 border border-amber-200 px-2 py-1.5">
                  <p className="text-xs text-amber-700 italic break-words" style={{ overflowWrap: "anywhere" }}>
                    <span className="font-semibold not-italic">Facilitator Note: </span>{inject.facilitatorNote}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}

      {/* Critical Decisions */}
      {content.criticalDecisions && content.criticalDecisions.length > 0 && (
        <AccordionSection title="Critical Decision Points" icon={<AlertCircle className="h-4 w-4 text-red-500" />}>
          <ul className="space-y-1.5">
            {content.criticalDecisions.map((cd, i) => (
              <li key={i} className="flex gap-2 text-xs">
                <span className="shrink-0 font-bold text-red-600">{i + 1}.</span>
                <span className="break-words" style={{ overflowWrap: "anywhere" }}>{cd}</span>
              </li>
            ))}
          </ul>
        </AccordionSection>
      )}

      {/* Communications Flow */}
      {content.communicationsFlow && (
        <AccordionSection title="Communications Flow" icon={<MessageSquare className="h-4 w-4 text-green-500" />}>
          <div className="space-y-2">
            {[
              { label: "Internal Notification", value: content.communicationsFlow.internalNotification },
              { label: "External Notification", value: content.communicationsFlow.externalNotification },
              { label: "Public Communication", value: content.communicationsFlow.publicCommunication },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-md border border-green-100 bg-green-50 px-3 py-2">
                <p className="text-xs font-semibold text-green-700 mb-0.5">{label}</p>
                <p className="text-xs text-green-900 break-words" style={{ overflowWrap: "anywhere" }}>{value}</p>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}

      {/* After-Action Template */}
      {content.afterActionTemplate && (
        <AccordionSection title="After-Action Review Template" icon={<ClipboardList className="h-4 w-4 text-slate-500" />}>
          <div className="space-y-2">
            {[
              { label: "Strengths", value: content.afterActionTemplate.strengthsPrompt },
              { label: "Gaps Identified", value: content.afterActionTemplate.gapsPrompt },
              { label: "Improvement Actions", value: content.afterActionTemplate.improvementActions },
              { label: "Follow-Up Deadline", value: content.afterActionTemplate.followUpDeadline },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-600 mb-0.5">{label}</p>
                <p className="text-xs text-slate-700 break-words" style={{ overflowWrap: "anywhere" }}>{value}</p>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}

      {content.guidedResponse && (
        <Button variant="outline" size="sm" className="w-full" onClick={onGuidedResponse}>
          <Brain className="h-3.5 w-3.5 mr-1.5" /> View Expert Thinking Panel
        </Button>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function DrillScheduler() {
  const [, navigate] = useLocation();

  const [mode, setMode] = useState<"system" | "user">("system");
  const [drillType, setDrillType] = useState<"micro" | "extended">("micro");
  const [industry, setIndustry] = useState("none");
  const [jurisdiction, setJurisdiction] = useState("United States");
  const [facilityId, setFacilityId] = useState<number | undefined>();
  const [userPrompt, setUserPrompt] = useState("");
  // Parameterized scenario generator inputs
  const [environment, setEnvironment] = useState<DrillEnvironment>(ENVIRONMENTS[0]);
  const [threatType, setThreatType] = useState<DrillThreatType>(THREAT_TYPES[0]);
  const [behavioralIndicators, setBehavioralIndicators] = useState<DrillBehavioralIndicator[]>([]);
  const [responsePressure, setResponsePressure] = useState<DrillResponsePressure>(RESPONSE_PRESSURES[0]);
  const [responseFocus, setResponseFocus] = useState<DrillResponseFocus>(RESPONSE_FOCUSES[0]);
  const [complexityLevel, setComplexityLevel] = useState<DrillComplexityLevel>(COMPLEXITY_LEVELS[0]);

  const [generatedTemplateId, setGeneratedTemplateId] = useState<number | null>(null);
  const [generatedContent, setGeneratedContent] = useState<DrillContent | null>(null);
  const [guidedResponseOpen, setGuidedResponseOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [outcomeRevealed, setOutcomeRevealed] = useState(false);
  const [compressedGuidedOpen, setCompressedGuidedOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");

  const facilitiesQuery = trpc.facility.list.useQuery();
  const sessionsQuery = trpc.drill.listSessions.useQuery({});

  const generate = trpc.drill.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedTemplateId(data.templateId);
      setGeneratedContent(data.content as DrillContent);
      setSelectedOption(null);
      setOutcomeRevealed(false);
      setCompressedGuidedOpen(false);
      toast.success("Drill generated successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const schedule = trpc.drill.schedule.useMutation({
    onSuccess: (data) => {
      toast.success("Drill scheduled");
      sessionsQuery.refetch();
      navigate(`/drills/${data.sessionId}/run`);
    },
    onError: (e) => toast.error(e.message),
  });

  const selectedFacility = useMemo(() =>
    facilitiesQuery.data?.find(f => f.id === facilityId),
    [facilitiesQuery.data, facilityId]
  );

  const facilityContext = selectedFacility
    ? [
        `Name: ${selectedFacility.name}`,
        `Type: ${selectedFacility.facilityType ?? "Unknown"}`,
        selectedFacility.city ? `Location: ${selectedFacility.city}, ${selectedFacility.state ?? ""}` : null,
        selectedFacility.squareFootage ? `Size: ${selectedFacility.squareFootage} sq ft` : null,
        selectedFacility.floors ? `Floors: ${selectedFacility.floors}` : null,
        selectedFacility.maxOccupancy ? `Max occupancy: ${selectedFacility.maxOccupancy}` : null,
        selectedFacility.publicEntrances ? `Public entrances: ${selectedFacility.publicEntrances}` : null,
        selectedFacility.operatingHours ? `Operating hours: ${selectedFacility.operatingHours}` : null,
        selectedFacility.eveningOperations ? "Evening operations: yes" : null,
        selectedFacility.publicAccessWithoutScreening ? "Public access without screening: yes" : null,
        selectedFacility.multiTenant ? "Multi-tenant building: yes" : null,
      ].filter(Boolean).join("\n")
    : undefined;

  const handleGenerate = () => {
    generate.mutate({
      facilityId,
      drillType,
      industry: industry === "none" ? undefined : industry,
      jurisdiction,
      generationMode: mode,
      userPrompt: mode === "user" ? userPrompt : undefined,
      facilityContext,
      // Parameterized scenario generator inputs
      environment,
      threatType,
      behavioralIndicators: behavioralIndicators.length > 0 ? behavioralIndicators : undefined,
      responsePressure,
      responseFocus,
      complexityLevel,
    });
  };

  const handleSchedule = () => {
    if (!generatedTemplateId || !scheduleDate) return;
    const dt = new Date(`${scheduleDate}T${scheduleTime}:00`);
    schedule.mutate({ templateId: generatedTemplateId, facilityId, scheduledAt: dt });
  };

  return (
    <AppLayout>
      <div className="container max-w-5xl py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Drill Planner</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generate ACTD-based training drills and schedule them for your team.
            </p>
          </div>
          <Badge variant="outline" className="text-xs gap-1">
            <Sparkles className="h-3 w-3" /> ACTD Framework
          </Badge>
        </div>

        <Tabs defaultValue="generate">
          <TabsList>
            <TabsTrigger value="generate"><Sparkles className="h-3.5 w-3.5 mr-1.5" />Generate Drill</TabsTrigger>
            <TabsTrigger value="history"><ClipboardList className="h-3.5 w-3.5 mr-1.5" />Drill History</TabsTrigger>
          </TabsList>

          {/* ── Generate tab ── */}
          <TabsContent value="generate" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Configuration */}
              <div className="space-y-5">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Drill Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Generation mode */}
                    <div className="space-y-1">
                      <Label>Generation Mode</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {(["system", "user"] as const).map(m => (
                          <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={[
                              "px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition-colors",
                              mode === m ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-accent",
                            ].join(" ")}
                          >
                            {m === "system" ? "🏢 System-Generated" : "✏️ Custom Scenario"}
                            <p className="text-xs font-normal mt-0.5 text-muted-foreground">
                              {m === "system" ? "Based on facility profile & industry" : "You describe the scenario"}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Drill type */}
                    <div className="space-y-1">
                      <Label>Drill Type</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {DRILL_TYPES.map(dt => (
                          <button
                            key={dt.value}
                            onClick={() => setDrillType(dt.value as "micro" | "extended")}
                            className={[
                              "px-3 py-2.5 rounded-lg border text-left transition-colors",
                              drillType === dt.value ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                            ].join(" ")}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-sm font-medium">{dt.label}</span>
                              <Badge variant="outline" className="text-xs gap-1 shrink-0">
                                <Clock className="h-2.5 w-2.5" />{dt.duration}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{dt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ── Scenario Parameters ── */}
                    <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scenario Parameters</p>

                      {/* Environment */}
                      <div className="space-y-1">
                        <Label className="text-xs">Environment</Label>
                        <Select value={environment} onValueChange={v => setEnvironment(v as DrillEnvironment)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ENVIRONMENTS.map(e => <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Threat Type */}
                      <div className="space-y-1">
                        <Label className="text-xs">Threat Type</Label>
                        <Select value={threatType} onValueChange={v => setThreatType(v as DrillThreatType)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {THREAT_TYPES.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Behavioral Indicators (multi-select) */}
                      <div className="space-y-1">
                        <Label className="text-xs">Behavioral Indicators <span className="text-muted-foreground font-normal">(select up to 3)</span></Label>
                        <div className="flex flex-wrap gap-1.5">
                          {BEHAVIORAL_INDICATORS.map(b => {
                            const selected = behavioralIndicators.includes(b);
                            return (
                              <button
                                key={b}
                                onClick={() => {
                                  if (selected) {
                                    setBehavioralIndicators(prev => prev.filter(x => x !== b));
                                  } else if (behavioralIndicators.length < 3) {
                                    setBehavioralIndicators(prev => [...prev, b]);
                                  }
                                }}
                                className={[
                                  "text-xs px-2 py-1 rounded-full border transition-colors",
                                  selected
                                    ? "border-primary bg-primary/10 text-primary font-medium"
                                    : "border-border text-muted-foreground hover:bg-accent",
                                ].join(" ")}
                              >
                                {shortIndicatorLabel(b)}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Response Pressure */}
                      <div className="space-y-1">
                        <Label className="text-xs">Response Pressure</Label>
                        <Select value={responsePressure} onValueChange={v => setResponsePressure(v as DrillResponsePressure)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {RESPONSE_PRESSURES.map(p => (
                              <SelectItem key={p} value={p} className="text-xs">{shortPressureLabel(p)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Response Focus */}
                      <div className="space-y-1">
                        <Label className="text-xs">Response Focus</Label>
                        <Select value={responseFocus} onValueChange={v => setResponseFocus(v as DrillResponseFocus)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {RESPONSE_FOCUSES.map(f => (
                              <SelectItem key={f} value={f} className="text-xs">{shortFocusLabel(f)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Complexity Level */}
                      <div className="space-y-1">
                        <Label className="text-xs">Complexity Level</Label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {COMPLEXITY_LEVELS.map(c => (
                            <button
                              key={c}
                              onClick={() => setComplexityLevel(c as DrillComplexityLevel)}
                              className={[
                                "text-xs px-2 py-1.5 rounded-md border text-center transition-colors",
                                complexityLevel === c
                                  ? "border-primary bg-primary/10 text-primary font-medium"
                                  : "border-border text-muted-foreground hover:bg-accent",
                              ].join(" ")}
                            >
                              {shortComplexityLabel(c)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Facility */}
                    <div className="space-y-1">
                      <Label>Facility (optional)</Label>
                      <Select value={facilityId?.toString() ?? "none"} onValueChange={v => setFacilityId(v === "none" ? undefined : parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue placeholder="No specific facility" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No specific facility</SelectItem>
                          {facilitiesQuery.data?.map(f => (
                            <SelectItem key={f.id} value={f.id.toString()}>
                              <div className="flex items-center gap-1.5">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                {f.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Industry */}
                    <div className="space-y-1">
                      <Label>Industry</Label>
                      <Select value={industry} onValueChange={setIndustry}>
                        <SelectTrigger><SelectValue placeholder="Select industry…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select industry…</SelectItem>
                          {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Jurisdiction */}
                    <div className="space-y-1">
                      <Label>Jurisdiction</Label>
                      <Select value={jurisdiction} onValueChange={setJurisdiction}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="United States">United States (Federal OSHA / DHS)</SelectItem>
                          <SelectItem value="Canada">Canada (Federal — Canada Labour Code)</SelectItem>
                          <SelectItem value="Ontario">Ontario (OHSA Bill 168)</SelectItem>
                          <SelectItem value="British Columbia">British Columbia (WorkSafeBC)</SelectItem>
                          <SelectItem value="Other">Other / International</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Custom scenario input */}
                    {mode === "user" && (
                      <div className="space-y-1">
                        <Label>Scenario Description <span className="text-red-500">*</span></Label>
                        <Textarea
                          placeholder="Describe the scenario in your own words. Example: A visitor in the lobby becomes increasingly agitated and begins making verbal threats toward the receptionist."
                          value={userPrompt}
                          onChange={e => setUserPrompt(e.target.value)}
                          rows={4}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">Be specific — the AI will structure your scenario into a full ACTD drill.</p>
                      </div>
                    )}

                    <Button
                      className="w-full"
                      onClick={handleGenerate}
                      disabled={generate.isPending || (mode === "user" && !userPrompt.trim())}
                    >
                      {generate.isPending
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
                        : <><Sparkles className="h-4 w-4 mr-2" />Generate Drill</>
                      }
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Generated drill preview */}
              <div className="space-y-4 min-w-0">
                {!generatedContent && !generate.isPending && (
                  <div className="flex flex-col items-center justify-center h-64 rounded-xl border border-dashed text-muted-foreground text-sm gap-2">
                    <Sparkles className="h-8 w-8 opacity-20" />
                    <p>Configure and generate a drill to see the preview here.</p>
                  </div>
                )}
                {generate.isPending && (
                  <div className="flex flex-col items-center justify-center h-64 rounded-xl border text-muted-foreground text-sm gap-3">
                    <Loader2 className="h-8 w-8 animate-spin opacity-40" />
                    <p>Generating your ACTD drill…</p>
                  </div>
                )}

                {generatedContent && (
                  <div className="space-y-4 min-w-0">
                    {/* ── Title + meta card ── */}
                    <Card>
                      <CardContent className="pt-4 pb-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h2 className="font-bold text-base leading-snug break-words" style={{ overflowWrap: "anywhere" }}>
                              {generatedContent.title}
                            </h2>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <Badge variant="outline" className="text-xs capitalize">{generatedContent.drillType}</Badge>
                              <Badge variant="outline" className="text-xs gap-1">
                                <Clock className="h-2.5 w-2.5" />{generatedContent.durationMinutes} min
                              </Badge>
                              {generatedContent.exerciseType && (
                                <Badge className="text-xs capitalize bg-slate-100 text-slate-700 border-slate-200">
                                  {generatedContent.exerciseType}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        </div>

                        {/* Threat signals */}
                        {(generatedContent.primaryThreatSignal || generatedContent.decisionPressure) && (
                          <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 space-y-1">
                            {generatedContent.primaryThreatSignal && (
                              <p className="text-xs">
                                <span className="font-semibold text-slate-700">Primary Threat Signal:</span>{" "}
                                <span className="text-slate-600 break-words" style={{ overflowWrap: "anywhere" }}>{generatedContent.primaryThreatSignal}</span>
                              </p>
                            )}
                            {generatedContent.decisionPressure && (
                              <p className="text-xs">
                                <span className="font-semibold text-slate-700">Decision Pressure:</span>{" "}
                                <span className="text-slate-600 break-words" style={{ overflowWrap: "anywhere" }}>{generatedContent.decisionPressure}</span>
                              </p>
                            )}
                          </div>
                        )}

                        {/* Behavioral cues tag strip */}
                        {generatedContent.behavioralCues && generatedContent.behavioralCues.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Behavioral Cues</p>
                            <div className="flex flex-wrap gap-1">
                              {generatedContent.behavioralCues.map((cue, i) => (
                                <span key={i} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5 break-words max-w-full" style={{ overflowWrap: "anywhere" }}>
                                  {cue}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Regulation tags */}
                        {generatedContent.regulatoryAlignment?.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Aligned with</p>
                            <div className="flex flex-wrap gap-1">
                              {generatedContent.regulatoryAlignment.map(r => (
                                <RegulationTag key={r} label={r} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Objective */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Objective</p>
                          <p className="text-sm break-words leading-relaxed" style={{ overflowWrap: "anywhere" }}>{generatedContent.objective}</p>
                        </div>

                        {/* Scenario */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Scenario</p>
                          <p className="text-sm text-muted-foreground break-words leading-relaxed" style={{ overflowWrap: "anywhere" }}>
                            {generatedContent.scenario}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* ── Type-specific interaction card ── */}
                    {generatedContent.drillType === "micro" && (
                      <MicroDrillCard
                        content={generatedContent}
                        selectedOption={selectedOption}
                        setSelectedOption={setSelectedOption}
                        outcomeRevealed={outcomeRevealed}
                        setOutcomeRevealed={setOutcomeRevealed}
                        onExpertThinking={() => setCompressedGuidedOpen(true)}
                      />
                    )}
                    {/* Legacy guided/operational drills still render if loaded from history */}
                    {(generatedContent.drillType as string) === "guided" && (
                      <GuidedDrillCard
                        content={generatedContent}
                        onGuidedResponse={() => setGuidedResponseOpen(true)}
                      />
                    )}
                    {(generatedContent.drillType as string) === "operational" && (
                      <OperationalDrillCard
                        content={generatedContent}
                        onGuidedResponse={() => setGuidedResponseOpen(true)}
                      />
                    )}
                    {generatedContent.drillType === "extended" && (
                      <ExtendedScenarioCard
                        content={generatedContent}
                        onGuidedResponse={() => setGuidedResponseOpen(true)}
                      />
                    )}

                    {/* ── Decision Impact card (non-prescriptive) ── */}
                    {generatedContent.decisionImpact && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-1.5">
                            <GitBranch className="h-4 w-4 text-blue-500" /> Decision Impact
                            <span className="text-xs font-normal text-muted-foreground ml-1">(outcome trajectories — not graded)</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {[
                            { label: "High Coordination Path", color: "blue", value: generatedContent.decisionImpact.highCoordinationPath },
                            { label: "Moderate Control Path", color: "amber", value: generatedContent.decisionImpact.moderateControlPath },
                            { label: "High Exposure Path", color: "red", value: generatedContent.decisionImpact.highExposurePath },
                          ].map(({ label, color, value }) => (
                            <div key={label} className={`rounded-md border border-${color}-100 bg-${color}-50 px-3 py-2`}>
                              <p className={`text-xs font-semibold text-${color}-700 mb-0.5`}>{label}</p>
                              <p className="text-xs text-slate-700 break-words leading-relaxed" style={{ overflowWrap: "anywhere" }}>{value}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* ── Short Debrief card ── */}
                    {generatedContent.shortDebrief && generatedContent.shortDebrief.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-1.5">
                            <BookOpen className="h-4 w-4 text-slate-500" /> Debrief Questions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ol className="space-y-2">
                            {generatedContent.shortDebrief.map((q, i) => (
                              <li key={i} className="flex gap-2 text-xs">
                                <span className="shrink-0 font-bold text-slate-500">{i + 1}.</span>
                                <span className="break-words" style={{ overflowWrap: "anywhere" }}>{q}</span>
                              </li>
                            ))}
                          </ol>
                        </CardContent>
                      </Card>
                    )}

                    {/* ── ACTD phases card (all types) ── */}
                    <ACTDPhasesCard actd={generatedContent.actd} compact={generatedContent.drillType === "micro"} />

                    {/* ── Schedule card ── */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" /> Schedule This Drill
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Date</Label>
                            <Input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Time</Label>
                            <Input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            className="flex-1"
                            onClick={handleSchedule}
                            disabled={!scheduleDate || schedule.isPending}
                          >
                            {schedule.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calendar className="h-4 w-4 mr-2" />}
                            Schedule & Open Runner
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (!generatedTemplateId) return;
                              const now = new Date();
                              schedule.mutate({ templateId: generatedTemplateId, facilityId, scheduledAt: now });
                            }}
                            disabled={schedule.isPending}
                          >
                            <Play className="h-4 w-4 mr-1" /> Run Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── History tab ── */}
          <TabsContent value="history" className="mt-4">
            {sessionsQuery.isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading sessions…
              </div>
            ) : sessionsQuery.data?.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No drills scheduled yet</p>
                <p className="text-sm mt-1">Generate your first drill on the Generate tab</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessionsQuery.data?.map(session => (
                  <div
                    key={session.id}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl border bg-card hover:bg-accent/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/drills/${session.id}/run`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">Drill Session #{session.id}</span>
                        <Badge className={`text-xs capitalize ${STATUS_COLORS[session.status] ?? ""}`}>
                          {session.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Scheduled: {new Date(session.scheduledAt).toLocaleString()}
                        {session.completedAt && ` · Completed: ${new Date(session.completedAt).toLocaleString()}`}
                        {session.participantCount ? ` · ${session.participantCount} participants` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.status === "completed" ? (
                        <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); navigate(`/drills/${session.id}/debrief`); }}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> After-Action
                        </Button>
                      ) : (
                        <Button size="sm" onClick={e => { e.stopPropagation(); navigate(`/drills/${session.id}/run`); }}>
                          <Play className="h-3.5 w-3.5 mr-1" /> {session.status === "in_progress" ? "Resume" : "Start"}
                        </Button>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Guided Response Modal (guided/operational/extended) ── */}
      {generatedContent?.guidedResponse && (
        <GuidedResponseModal
          open={guidedResponseOpen}
          onClose={() => setGuidedResponseOpen(false)}
          guidedResponse={generatedContent.guidedResponse}
          drillType={generatedContent.drillType}
        />
      )}

      {/* ── Compressed Guided Response Modal (micro) ── */}
      {generatedContent?.compressedGuidedResponse && (
        <Dialog open={compressedGuidedOpen} onOpenChange={setCompressedGuidedOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Expert Thinking — 60-Second Debrief
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                How an expert reads this scenario in under a minute.
              </p>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              {generatedContent.compressedGuidedResponse.howAnExpertReadsThis?.length > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs font-bold text-blue-800 mb-2">How an Expert Reads This</p>
                  <ul className="space-y-1">
                    {generatedContent.compressedGuidedResponse.howAnExpertReadsThis.map((item, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="shrink-0 text-muted-foreground mt-0.5">·</span>
                        <span className="break-words" style={{ overflowWrap: "anywhere" }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-bold text-amber-800 mb-1">Critical Decision</p>
                <p className="text-sm break-words" style={{ overflowWrap: "anywhere" }}>{generatedContent.compressedGuidedResponse.criticalDecision}</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-bold text-red-800 mb-1">Most Likely Mistake</p>
                <p className="text-sm break-words" style={{ overflowWrap: "anywhere" }}>{generatedContent.compressedGuidedResponse.mostLikelyMistake}</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-xs font-bold text-green-800 mb-1">Best Next Move</p>
                <p className="text-sm break-words" style={{ overflowWrap: "anywhere" }}>{generatedContent.compressedGuidedResponse.bestNextMove}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
