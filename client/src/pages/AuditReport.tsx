import { trpc } from "@/lib/trpc";
import { useParams, Link } from "wouter";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Shield, BarChart3, AlertTriangle, FileText,
  Download, ClipboardList, BookOpen, CheckCircle2, Clock,
  Building2, Calendar, Plus, Sparkles, ChevronDown, ChevronRight,
  DollarSign, Wrench, BookMarked, Loader2, RefreshCw, Info, MessageSquarePlus, Image, Pencil,
  Zap, ChevronUp
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from "recharts";
import { getRiskBadgeClass, getRiskColor, getPriorityBadgeClass } from "@/lib/riskUtils";
import { Streamdown } from "streamdown";
import { LIKELIHOOD_VALUES, IMPACT_VALUES, PREPAREDNESS_MODIFIERS, PRIORITY_ORDER } from "../../../shared/auditFramework";
import { generateRecommendedActions, getCategoryToRecommendationMap, getActionPriorityBadgeClass, getActionPriorityLabel, type RecommendedAction } from "../../../shared/actionEngine";
import { toast } from "sonner";
import { HeroScoreCard } from "@/components/assessment";
import { NewAuditButton } from "@/components/NewAuditButton";

const LIKELIHOOD_OPTIONS = Object.keys(LIKELIHOOD_VALUES);
const IMPACT_OPTIONS = Object.keys(IMPACT_VALUES);
const PREPAREDNESS_OPTIONS = Object.keys(PREPAREDNESS_MODIFIERS);

// ── Types ─────────────────────────────────────────────────────────────────────
interface EAPSubsection {
  title: string;
  content: string;
}

interface EAPRecommendation {
  action: string;
  priority: string;
  basis: string;
}
interface EAPSection {
  id: string;
  title: string;
  content: string;
  subsections: EAPSubsection[];
  recommendations?: EAPRecommendation[];
}

interface AIRecommendation {
  questionId: string;
  category: string;
  question: string;
  response: string;
  score: number;
  conditionType: string;
  notes: string;
  priority: string;
  primaryRecommendation: string;
  compensatingControl: string;
  implementationDifficulty: string;
  estimatedCost: string;
  standardsReference: string;
  timeframe: string;
}

// ── Risk Level Tooltip Descriptions ──────────────────────────────────────────
const RISK_LEVEL_DESCRIPTIONS: Record<string, { summary: string; score: string; action: string }> = {
  "Low": {
    summary: "Minimal vulnerabilities identified. Current controls are generally adequate.",
    score: "0–20% weighted risk score",
    action: "Maintain current controls. Schedule routine review annually.",
  },
  "Moderate": {
    summary: "Some vulnerabilities present. Controls are partially effective but have gaps.",
    score: "21–40% weighted risk score",
    action: "Address identified gaps within 90 days. Prioritize high-visibility items.",
  },
  "Elevated": {
    summary: "Notable vulnerabilities that increase risk of an incident. Controls need improvement.",
    score: "41–60% weighted risk score",
    action: "Develop a corrective action plan. Address critical items within 30 days.",
  },
  "High": {
    summary: "Significant vulnerabilities present. Existing controls are inadequate for the threat environment.",
    score: "61–80% weighted risk score",
    action: "Immediate corrective actions required. Escalate to leadership. Consider interim compensating controls.",
  },
  "Critical": {
    summary: "Severe vulnerabilities with high potential for serious harm. Immediate intervention required.",
    score: "81–100% weighted risk score",
    action: "Emergency corrective actions required immediately. Consider facility access restrictions until resolved.",
  },
};

function RiskLevelBadge({ level, className }: { level: string; className?: string }) {
  const desc = RISK_LEVEL_DESCRIPTIONS[level];
  if (!desc) return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRiskBadgeClass(level)} ${className ?? ""}`}>{level}</span>;
  return (
    <span className="relative group inline-block">
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-help ${getRiskBadgeClass(level)} ${className ?? ""}`}>{level}</span>
      <span className="pointer-events-none absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg bg-gray-900 text-white text-xs p-3 text-left shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <span className="block font-semibold text-sm mb-1">{level} Risk</span>
        <span className="block mb-1.5 opacity-90">{desc.summary}</span>
        <span className="block opacity-75 mb-1 text-[10px]">Score range: {desc.score}</span>
        <span className="block font-medium opacity-90 text-[10px]">Recommended action: {desc.action}</span>
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}

// ── Helper Components ─────────────────────────────────────────────────────────
function DifficultyBadge({ level }: { level: string }) {
  const cls =
    level === "Low" ? "bg-green-100 text-green-800 border-green-200" :
    level === "Medium" ? "bg-amber-100 text-amber-800 border-amber-200" :
    "bg-red-100 text-red-800 border-red-200";
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${cls}`}>
      <Wrench size={9} /> {level}
    </span>
  );
}

function CostBadge({ cost }: { cost: string }) {
  const cls =
    cost === "No Cost" ? "bg-green-100 text-green-800 border-green-200" :
    cost?.includes("<$500") ? "bg-blue-100 text-blue-800 border-blue-200" :
    cost?.includes("$500") ? "bg-amber-100 text-amber-800 border-amber-200" :
    "bg-red-100 text-red-800 border-red-200";
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${cls}`}>
      <DollarSign size={9} /> {cost || "Unknown"}
    </span>
  );
}

const EAP_PRIORITY_COLORS: Record<string, string> = {
  Immediate: "bg-red-100 text-red-800 border-red-300",
  "30 Days": "bg-orange-100 text-orange-800 border-orange-300",
  "60 Days": "bg-amber-100 text-amber-800 border-amber-300",
  "90 Days": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Long-Term": "bg-blue-100 text-blue-800 border-blue-300",
};

function CollapsibleSection({ section, idx }: { section: EAPSection; idx: number }) {
  const [open, setOpen] = useState(idx < 2);
  const [subsOpen, setSubsOpen] = useState<Record<number, boolean>>({});
  const hasRecs = (section.recommendations?.length ?? 0) > 0;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-5 py-4 bg-muted/30 border-b border-border hover:bg-muted/50 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
          {idx + 1}
        </div>
        <h3 className="font-semibold text-foreground text-sm flex-1">{section.title}</h3>
        {hasRecs && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-medium mr-1">
            {section.recommendations!.length} rec{section.recommendations!.length !== 1 ? "s" : ""}
          </span>
        )}
        {open ? <ChevronDown size={15} className="text-muted-foreground flex-shrink-0" /> : <ChevronRight size={15} className="text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 py-4 space-y-4">
          <div className="text-sm text-foreground eap-prose">
            <Streamdown>{section.content}</Streamdown>
          </div>
          {section.subsections?.length > 0 && (
            <div className="space-y-2 pl-4 border-l-2 border-primary/20">
              {section.subsections.map((sub, si) => (
                <div key={si} className="rounded-lg overflow-hidden border border-border/60">
                  <button
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
                    onClick={() => setSubsOpen((prev) => ({ ...prev, [si]: !prev[si] }))}
                  >
                    <span className="text-xs font-semibold text-foreground">{sub.title}</span>
                    {subsOpen[si] ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
                  </button>
                  {subsOpen[si] && (
                    <div className="px-4 py-3 text-xs text-foreground eap-prose">
                      <Streamdown>{sub.content}</Streamdown>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {hasRecs && (
            <div className="mt-2 pt-3 border-t border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Section Recommendations</p>
              <div className="space-y-2">
                {section.recommendations!.map((rec, ri) => (
                  <div key={ri} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/60">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 mt-0.5 ${EAP_PRIORITY_COLORS[rec.priority] ?? "bg-gray-100 text-gray-800 border-gray-300"}`}>
                      {rec.priority}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{rec.action}</p>
                      {rec.basis && <p className="text-[10px] text-muted-foreground mt-0.5">Basis: {rec.basis}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Recommended Action Card ─────────────────────────────────────────────────
function RecommendedActionCard({ action }: { action: RecommendedAction }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${getActionPriorityBadgeClass(action.priority)}`}>
          {getActionPriorityLabel(action.priority)}
        </span>
        <span className="font-medium text-foreground text-sm flex-1">{action.title}</span>
        {expanded
          ? <ChevronUp size={14} className="text-muted-foreground flex-shrink-0" />
          : <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border">
          <p className="text-sm text-foreground leading-relaxed">{action.description}</p>
          <div className="bg-muted/40 rounded-lg px-3 py-2.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Why It Matters</p>
            <p className="text-xs text-foreground leading-relaxed">{action.rationale}</p>
          </div>
          {action.impact && (
            <div className="bg-amber-500/8 border border-amber-500/20 rounded-lg px-3 py-2.5">
              <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">If Not Addressed</p>
              <p className="text-xs text-foreground leading-relaxed">{action.impact}</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AuditReport() {
    const params = useParams<{ id: string }>();
    const rawId = parseInt(params.id ?? "", 10);
    const auditId = isNaN(rawId) ? 0 : rawId;

  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: reportData, isLoading } = trpc.report.generate.useQuery({ auditId });
  // Markdown is a large LLM response — only fetch when user clicks the download button
  const [fetchMarkdown, setFetchMarkdown] = useState(false);
  const { data: markdownData, isLoading: markdownLoading } = trpc.report.generateMarkdown.useQuery(
    { auditId },
    { enabled: fetchMarkdown }
  );
  const [eapGenerating, setEapGenerating] = useState(false);
  const [eapGenError, setEapGenError] = useState<string | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [topBarPdfDownloading, setTopBarPdfDownloading] = useState(false);
  const { data: eapData, isLoading: eapLoading, refetch: refetchEAP } = trpc.report.getEAP.useQuery(
    { auditId },
    {
      enabled: activeTab === "eap",
      refetchInterval: eapGenerating ? 3000 : false,
    }
  );
  const generateEAPMutation = trpc.report.generateEAP.useMutation({
    onSuccess: () => {
      setEapGenerating(false);
      setEapGenError(null);
      refetchEAP();
    },
    onError: (e) => {
      setEapGenerating(false);
      setEapGenError(e.message);
      toast.error("EAP generation failed: " + e.message);
    },
  });
  const handleGenerateEAP = () => {
    setEapGenerating(true);
    setEapGenError(null);
    generateEAPMutation.mutate({ auditId });
  };
  const { data: threats, refetch: refetchThreats } = trpc.threat.list.useQuery({ auditId });
  const { data: attachments } = trpc.attachment.list.useQuery({ auditId });
  const { data: correctiveChecks, refetch: refetchChecks } = trpc.correctiveCheck.list.useQuery({ auditId });
  const checkedSet = new Set((correctiveChecks ?? []).map((c) => c.questionId));
  const toggleCheck = trpc.correctiveCheck.toggle.useMutation({
    onSuccess: () => refetchChecks(),
    onError: (e) => toast.error(e.message),
  });

  const [aiRecs, setAiRecs] = useState<AIRecommendation[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedRec, setExpandedRec] = useState<string | null>(null);

  const [newThreat, setNewThreat] = useState({
    findingName: "", category: "", likelihood: "Possible",
    impact: "Significant", preparedness: "Average controls", description: "",
  });
  const [showThreatForm, setShowThreatForm] = useState(false);

  // ── Phase 4: Executive Summary ────────────────────────────────────────────
  const [execSummary, setExecSummary] = useState<{
    summary: string;
    topPriorities: string[];
    leadershipFocus: string;
    overallRisk: string;
    overallScore: string;
    generatedAt: string;
  } | null>(null);
  const [execSummaryLoading, setExecSummaryLoading] = useState(false);
  const [execSummaryError, setExecSummaryError] = useState<string | null>(null);

  // Load persisted executive summary from DB on mount
  const { data: persistedSummary, isLoading: persistedSummaryLoading } = trpc.eap.getExecutiveSummary.useQuery(
    { auditId: Number(auditId) },
    { enabled: !!auditId }
  );
  useEffect(() => {
    if (persistedSummary && !execSummary) {
      setExecSummary(persistedSummary);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedSummary]);

  const generateExecSummaryMutation = trpc.eap.generateExecutiveSummary.useMutation({
    onSuccess: (data) => {
      setExecSummary(data);
      setExecSummaryError(null);
      setExecSummaryLoading(false);
    },
    onError: (err) => {
      setExecSummaryError(err.message);
      setExecSummaryLoading(false);
      toast.error("Executive Summary generation failed. Please try again.");
    },
  });

  const handleGenerateExecSummary = () => {
    if (!auditId || execSummaryLoading) return;
    setExecSummaryLoading(true);
    setExecSummaryError(null);
    generateExecSummaryMutation.mutate({ auditId: Number(auditId) });
  };

  // Auto-generate Executive Summary on page load only if not already persisted in DB
  useEffect(() => {
    if (!auditId || execSummary || execSummaryLoading || persistedSummaryLoading) return;
    if (persistedSummary) return; // already loaded from DB
    const audit = reportData?.audit;
    if (!audit || audit.status !== "completed") return;
    setExecSummaryLoading(true);
    setExecSummaryError(null);
    generateExecSummaryMutation.mutate({ auditId: Number(auditId) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId, reportData?.audit?.status, persistedSummaryLoading]);

  const generateAIRecs = trpc.report.generateAIRecommendations.useMutation({
    onSuccess: (data) => {
      setAiRecs(data.recommendations as AIRecommendation[]);
      setAiLoading(false);
      toast.success(`${data.recommendations.length} AI recommendations generated`);
    },
    onError: (e) => {
      setAiLoading(false);
      toast.error("Failed to generate AI recommendations: " + e.message);
    },
  });

  const createThreat = trpc.threat.create.useMutation({
    onSuccess: () => {
      toast.success("Threat finding added");
      setShowThreatForm(false);
      setNewThreat({ findingName: "", category: "", likelihood: "Possible", impact: "Significant", preparedness: "Average controls", description: "" });
      refetchThreats();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleDownloadMarkdown = () => {
    if (!markdownData?.markdown) {
      // Trigger the fetch if not yet loaded
      setFetchMarkdown(true);
      toast.info("Generating report document… please wait a moment then click again.");
      return;
    }
    const blob = new Blob([markdownData.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FiveStonesWPV_Report_${reportData?.facility?.name?.replace(/\s+/g, "_") ?? "Facility"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  const reopenAudit = trpc.audit.reopen.useMutation({
    onSuccess: () => {
      toast.success("Audit reopened — you can now edit responses");
      window.location.href = `/audit/${auditId}`;
    },
    onError: (e) => toast.error(e.message),
  });

  const handleGenerateAI = () => {
    setAiLoading(true);
    generateAIRecs.mutate({ auditId });
  };

  if (isLoading) {
    return (

        <div className="p-6 flex items-center justify-center min-h-64">
          <div className="text-center">
            <Shield className="text-primary animate-pulse mx-auto mb-3" size={40} />
            <p className="text-muted-foreground text-sm">Generating report...</p>
          </div>
        </div>

    );
  }

  if (!reportData) {
    return (

        <div className="p-6 text-center">
          <p className="text-muted-foreground">Report data not available.</p>
        </div>

    );
  }

  const { facility, audit, categoryScores, correctiveActions, unavoidableConstraints } = reportData as any;
  const categoryScoresMap = categoryScores as Record<string, { percentage: number; riskLevel: string; rawScore: number; maxScore: number; weight: number }>;

  const barData = Object.entries(categoryScoresMap)
    .filter(([, v]) => v.maxScore > 0)
    .map(([name, v]) => ({
      name: name.length > 18 ? name.slice(0, 16) + "…" : name,
      score: v.percentage,
      riskLevel: v.riskLevel,
    }))
    .sort((a, b) => b.score - a.score);

  const radarData = barData.slice(0, 8).map((d) => ({ subject: d.name, A: d.score, riskLevel: d.riskLevel }));

  const actionsByPriority: Record<string, typeof correctiveActions> = {};
  for (const action of (correctiveActions as any[])) {
    if (!actionsByPriority[action.priority]) actionsByPriority[action.priority] = [];
    actionsByPriority[action.priority].push(action);
  }

  // Merge AI recs into corrective actions if available
  const actionsWithAI = (correctiveActions as any[]).map((a) => {
    const aiRec = aiRecs?.find((r) => r.questionId === a.questionId);
    return aiRec ? { ...a, ...aiRec } : a;
  });

  const actionsWithAIByPriority: Record<string, any[]> = {};
  for (const action of actionsWithAI) {
    if (!actionsWithAIByPriority[action.priority]) actionsWithAIByPriority[action.priority] = [];
    actionsWithAIByPriority[action.priority].push(action);
  }

  const eapSections = (eapData as any)?.sections as EAPSection[] | undefined;

  // ── Phase 3: Action Engine ────────────────────────────────────────────────
  const { actions: recommendedActions, isFallback: actionsFallback } = generateRecommendedActions({
    categoryScores: categoryScoresMap,
    facilityState: facility?.state ?? null,
    facilityType: facility?.facilityType ?? null,
  });
  const categoryToRecMap = getCategoryToRecommendationMap(recommendedActions);

  return (

      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/facilities/${facility?.id}`} className="flex items-center gap-1">
              <ArrowLeft size={15} /> Back to Facility
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <NewAuditButton facilityId={facility?.id} variant="outline" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("Reopen this audit to edit responses? The completed report will be cleared until you re-complete the audit.")) {
                  reopenAudit.mutate({ auditId });
                }
              }}
              disabled={reopenAudit.isPending}
              className="flex items-center gap-2"
            >
              <Pencil size={14} /> {reopenAudit.isPending ? "Reopening..." : "Edit Responses"}
            </Button>
            <Button variant="outline" size="sm" asChild className="flex items-center gap-2">
              <Link href={`/audit/${auditId}/feedback`}>
                <MessageSquarePlus size={14} /> Submit Feedback
              </Link>
            </Button>
            <Button onClick={handleDownloadMarkdown} variant="outline" size="sm" className="flex items-center gap-2" disabled={markdownLoading}>
              <Download size={14} /> {markdownLoading ? "Generating…" : "Download Summary (.md)"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={topBarPdfDownloading}
              onClick={async () => {
                if (topBarPdfDownloading) return;
                setTopBarPdfDownloading(true);
                const MAX_RETRIES = 2;
                let lastErr: Error | null = null;
                for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                  try {
                    const res = await fetch(`/api/eap/${auditId}/pdf`, { credentials: "include" });
                    if (!res.ok) {
                      const body = await res.json().catch(() => ({}));
                      throw new Error(body?.error ?? `Server error: ${res.status}`);
                    }
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `EAP_${reportData?.facility?.name?.replace(/\s+/g, "_") ?? "Facility"}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast.success("EAP PDF downloaded.");
                    lastErr = null;
                    break;
                  } catch (err: any) {
                    lastErr = err;
                    if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1500));
                  }
                }
                if (lastErr) toast.error("EAP PDF generation failed. Please try again.");
                setTopBarPdfDownloading(false);
              }}
            >
              {topBarPdfDownloading
                ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
                : <><Download size={14} /> Download EAP PDF</>}
            </Button>
          </div>
        </div>

        {/* Report Header Card — HeroScoreCard */}
        {(() => {
          // Map audit risk levels (Low/Moderate/Elevated/High/Critical) to
          // assessment color system (green/yellow/orange/red).
          // Audit score is a risk-exposure % (higher = worse), so we invert
          // it to a defensibility score for the ring display.
          const riskToColor: Record<string, string> = {
            Low: "green",
            Moderate: "yellow",
            Elevated: "orange",
            High: "orange",
            Critical: "red",
          };
          const riskLevel = audit?.overallRiskLevel ?? "Low";
          const riskColor = riskToColor[riskLevel] ?? "green";
          // Invert: 0% risk exposure → 100 defensibility, 100% → 0
          const rawScore = typeof audit?.overallScore === "number" ? audit.overallScore : 0;
          const displayScore = Math.round(100 - rawScore);
          const riskDesc = RISK_LEVEL_DESCRIPTIONS[riskLevel]?.summary ?? "";
          // Count high-priority corrective actions as "critical gaps"
          const criticalGapCount = (correctiveActions as any[] ?? []).filter(
            (a: any) => a.score === 3
          ).length;
          return (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={16} className="text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Threat Assessment Report</span>
                <span className="text-xs text-muted-foreground">— {facility?.name}</span>
              </div>
              <HeroScoreCard
                score={displayScore}
                classification={`${riskLevel} Risk`}
                riskColor={riskColor}
                riskDescriptor={riskDesc}
                gapCount={criticalGapCount}
                jurisdiction={facility?.jurisdiction ?? facility?.state ?? undefined}
                industry={facility?.facilityType?.replace(/_/g, " ") ?? undefined}
                primaryLabel="Build Your Readiness Plan"
                secondaryLabel="Export Report"
                onPrimaryCTA={() => {
                  window.location.href = "/liability-scan";
                }}
                onSecondaryCTA={() => setActiveTab("actions")}
              />
              <div className="flex flex-wrap gap-1.5 mt-3">
                {["OSHA Workplace Violence Prevention", "CISA Risk Principles (T×V×C)", "NFPA 3000 Hostile Event Preparedness"].map((s) => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{s}</span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 h-auto p-1 flex flex-wrap gap-1.5 bg-muted/60 rounded-xl">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg data-[state=active]:shadow-sm"><BarChart3 size={14} /> Risk Dashboard</TabsTrigger>
            <TabsTrigger value="threats" className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg data-[state=active]:shadow-sm"><AlertTriangle size={14} /> Threat Matrix</TabsTrigger>
            <TabsTrigger value="actions" className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg data-[state=active]:shadow-sm"><ClipboardList size={14} /> Corrective Actions</TabsTrigger>
            <TabsTrigger value="eap" className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg data-[state=active]:shadow-sm"><BookOpen size={14} /> Emergency Action Plan</TabsTrigger>
          </TabsList>

          {/* ── Risk Dashboard ── */}
          <TabsContent value="dashboard">
            {/* ── Executive Summary Card ── */}
            <div className="mb-5 bg-card border border-border rounded-xl overflow-hidden">
              {/* Header bar */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-primary" />
                  <h2 className="font-semibold text-foreground text-sm">Executive Summary</h2>
                  <span className="text-[10px] text-muted-foreground font-normal ml-1">AI-generated from audit data</span>
                </div>
                <div className="flex items-center gap-2">
                  {execSummary && (
                    <span className="text-[10px] text-muted-foreground">
                      Generated {new Date(execSummary.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant={execSummary ? "outline" : "default"}
                    className="h-7 text-xs px-3 gap-1.5"
                    onClick={handleGenerateExecSummary}
                    disabled={execSummaryLoading}
                  >
                    {execSummaryLoading ? (
                      <><Loader2 size={11} className="animate-spin" /> Generating&hellip;</>
                    ) : execSummary ? (
                      <><RefreshCw size={11} /> Regenerate</>
                    ) : (
                      <><Sparkles size={11} /> Generate Insight</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Body */}
              {!execSummary && !execSummaryLoading && !execSummaryError && (
                <div className="px-5 py-8 text-center">
                  <Sparkles size={28} className="text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-medium mb-1">No executive summary yet</p>
                  <p className="text-xs text-muted-foreground/70 max-w-sm mx-auto">
                    The executive summary will generate automatically once the audit data has loaded.
                  </p>
                </div>
              )}

              {execSummaryLoading && (
                <div className="px-5 py-8 text-center">
                  <Loader2 size={24} className="animate-spin text-primary mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Analysing audit data and generating summary&hellip;</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">This usually takes 5&ndash;10 seconds.</p>
                </div>
              )}

              {execSummaryError && !execSummaryLoading && (
                <div className="px-5 py-4 flex items-start gap-3">
                  <AlertTriangle size={15} className="text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{execSummaryError}</p>
                </div>
              )}

              {execSummary && !execSummaryLoading && (
                <div className="px-5 py-4 space-y-4">
                  {/* Summary paragraph */}
                  <p className="text-sm text-foreground leading-relaxed">{execSummary.summary}</p>

                  {/* Top priorities */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Priorities</p>
                    <ul className="space-y-1.5">
                      {execSummary.topPriorities.map((priority, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                          <span className="text-sm text-foreground">{priority}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Leadership focus */}
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-primary/5 border border-primary/15">
                    <Zap size={13} className="text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground font-medium">{execSummary.leadershipFocus}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid lg:grid-cols-2 gap-5 mb-5">
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="font-semibold text-foreground mb-4 text-sm">Risk Score by Category</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} />
                    <RechartsTooltip formatter={(v: number) => [`${v.toFixed(1)}%`, "Risk Score"]} />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={index} fill={getRiskColor(entry.riskLevel)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="font-semibold text-foreground mb-1 text-sm">Risk Profile (Top Categories)</h2>
                <p className="text-xs text-muted-foreground mb-3">Each axis = one risk category. Points further from the centre = higher risk score. Hover any point for details.</p>
                <ResponsiveContainer width="100%" height={255}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-xs">
                            <p className="font-semibold text-foreground mb-1">{d.subject}</p>
                            <p className="text-muted-foreground">Risk Score: <span className="font-mono font-bold text-foreground">{Number(d.A).toFixed(1)}%</span></p>
                            <p className="text-muted-foreground">Risk Level: <span className="font-semibold" style={{ color: getRiskColor(d.riskLevel) }}>{d.riskLevel}</span></p>
                            <p className="text-muted-foreground mt-1 text-[10px]">Higher % = greater vulnerability</p>
                          </div>
                        );
                      }}
                    />
                    <Radar name="Risk %" dataKey="A" stroke="#3b5bdb" fill="#3b5bdb" fillOpacity={0.25} dot={{ r: 4, fill: "#3b5bdb", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#3b5bdb" }} />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-x-4 gap-y-1">
                  {([['Low','#22c55e'],['Moderate','#84cc16'],['Elevated','#f59e0b'],['High','#f97316'],['Critical','#ef4444']] as [string,string][]).map(([label, color]) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-[10px] text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Risk Level</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(categoryScoresMap)
                    .sort(([, a], [, b]) => b.percentage - a.percentage)
                    .map(([name, data]) => (
                      <tr key={name} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{name}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${data.percentage}%`, backgroundColor: getRiskColor(data.riskLevel) }} />
                            </div>
                            <span className="text-xs font-mono text-foreground">{data.percentage.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <RiskLevelBadge level={data.riskLevel} />
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {data.weight > 0 ? `${(data.weight * 100).toFixed(0)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* ── Recommended Actions (Strategic Layer) ── */}
            {recommendedActions.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={16} className="text-primary" />
                  <h2 className="font-semibold text-foreground text-sm">Recommended Actions</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                    {recommendedActions.length} action{recommendedActions.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3 pl-0.5">
                  {actionsFallback
                    ? "Improvement opportunities based on current scores."
                    : "Strategic priorities based on identified gaps — sorted by severity."}
                  {" "}
                  <span className="text-muted-foreground/70">Expand each item to see rationale and impact.</span>
                </p>
                <div className="space-y-2">
                  {recommendedActions.map((action) => (
                    <RecommendedActionCard key={action.id} action={action} />
                  ))}
                </div>
                {/* Bridge to Corrective Actions tab */}
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <p className="text-[10px] text-muted-foreground">
                    Actions are derived from audit gap analysis. This is operational guidance, not legal advice.
                  </p>
                  <button
                    onClick={() => setActiveTab("actions")}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium flex-shrink-0 ml-3"
                  >
                    View Corrective Actions <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* ── Optional AI Guidance (subordinate, bottom of dashboard) ── */}
            <div className="mt-6 border border-dashed border-border rounded-xl p-4 bg-muted/30">
              <div className="flex items-start gap-3">
                <Sparkles size={15} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Optional AI Guidance</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-relaxed">
                    Generate supplemental context-aware guidance for each corrective finding — including compensating controls, implementation difficulty, estimated cost, and applicable standards references.
                  </p>
                  {/* Loading state — only shown here, not in Corrective Actions tab */}
                  {aiLoading && (
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Loader2 size={12} className="animate-spin flex-shrink-0" />
                      Analyzing {(correctiveActions as any[]).length} findings against facility context…
                    </div>
                  )}
                  {aiRecs && !aiLoading && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-green-700">
                      <CheckCircle2 size={12} className="flex-shrink-0" />
                      {aiRecs.length} supplemental recommendations applied to Corrective Actions.
                      <button onClick={handleGenerateAI} className="ml-1 flex items-center gap-0.5 hover:underline text-green-700">
                        <RefreshCw size={10} /> Regenerate
                      </button>
                    </div>
                  )}
                </div>
                {!aiLoading && (
                  <button
                    onClick={handleGenerateAI}
                    disabled={aiLoading}
                    className="flex-shrink-0 flex items-center gap-1.5 text-[11px] text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Sparkles size={11} />
                    {aiRecs ? "Regenerate" : "Generate Supplemental AI Guidance"}
                  </button>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Threat Severity Matrix ── */}
          <TabsContent value="threats">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Threat Severity Matrix</h2>
                <p className="text-xs text-muted-foreground mt-0.5">CISA Threat × Vulnerability × Consequence scoring model</p>
              </div>
              <Button size="sm" onClick={() => setShowThreatForm(!showThreatForm)} className="flex items-center gap-1.5">
                <Plus size={13} /> Add Finding
              </Button>
            </div>
            {showThreatForm && (
              <div className="bg-card border border-border rounded-xl p-5 mb-4">
                <h3 className="font-semibold text-sm text-foreground mb-4">New Threat Finding</h3>
                <div className="grid md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Threat Scenario Name *</label>
                    <input className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground" placeholder="e.g. Active Shooter — Main Entrance" value={newThreat.findingName} onChange={(e) => setNewThreat({ ...newThreat, findingName: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Category</label>
                    <input className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground" placeholder="e.g. Access Control" value={newThreat.category} onChange={(e) => setNewThreat({ ...newThreat, category: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Likelihood</label>
                    <select className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground" value={newThreat.likelihood} onChange={(e) => setNewThreat({ ...newThreat, likelihood: e.target.value })}>
                      {LIKELIHOOD_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Impact</label>
                    <select className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground" value={newThreat.impact} onChange={(e) => setNewThreat({ ...newThreat, impact: e.target.value })}>
                      {IMPACT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground block mb-1">Current Preparedness Level</label>
                    <select className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground" value={newThreat.preparedness} onChange={(e) => setNewThreat({ ...newThreat, preparedness: e.target.value })}>
                      {PREPAREDNESS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground block mb-1">Description (optional)</label>
                    <textarea className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground resize-none" rows={2} placeholder="Describe the specific threat scenario..." value={newThreat.description} onChange={(e) => setNewThreat({ ...newThreat, description: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => createThreat.mutate({ auditId, ...newThreat })} disabled={createThreat.isPending || !newThreat.findingName}>
                    {createThreat.isPending ? "Adding..." : "Add Finding"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowThreatForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
            {!threats?.length ? (
              <div className="text-center py-12 bg-card border border-border rounded-xl">
                <AlertTriangle size={36} className="mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground mb-3">No threat findings added yet.</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">Add specific threat scenarios to evaluate using the CISA Likelihood × Impact × Preparedness model.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Threat Scenario</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Likelihood</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Impact</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Severity</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {threats.map((t) => (
                      <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{t.findingName}</p>
                          {t.category && <p className="text-xs text-muted-foreground">{t.category}</p>}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">{t.likelihood}</td>
                        <td className="px-4 py-3 text-center text-xs text-muted-foreground">{t.impact}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-foreground">{t.finalScore}</td>
                        <td className="px-4 py-3 text-center">
                          <RiskLevelBadge level={t.severityLevel} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityBadgeClass(t.priority)}`}>{t.priority}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── Corrective Action Plan ── */}
          <TabsContent value="actions">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-foreground">Corrective Action Plan</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(correctiveActions as any[]).length} operational findings requiring action, grouped by timeline. Each item maps to a specific audit question that scored poorly.
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  For strategic priorities, see <button onClick={() => setActiveTab("dashboard")} className="underline hover:text-primary transition-colors">Risk Dashboard → Recommended Actions</button>.
                </p>
                {(correctiveActions as any[]).length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-48">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${Math.round((checkedSet.size / (correctiveActions as any[]).length) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {checkedSet.size}/{(correctiveActions as any[]).length} items completed
                    </span>
                  </div>
                )}
              </div>
            </div>

            {!(correctiveActions as any[]).length ? (
              <div className="text-center py-12 bg-card border border-border rounded-xl">
                <CheckCircle2 size={36} className="mx-auto mb-3 text-green-500/50" />
                <p className="text-sm text-muted-foreground">No corrective actions identified. All assessed items are secure.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {PRIORITY_ORDER.map((priority) => {
                  const actions = actionsWithAIByPriority[priority] ?? [];
                  if (!actions.length) return null;
                  const colorCls =
                    priority === "Immediate" ? "bg-red-50 border-red-200" :
                    priority === "30 Day" ? "bg-orange-50 border-orange-200" :
                    priority === "90 Day" ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200";
                  const textCls =
                    priority === "Immediate" ? "text-red-800" :
                    priority === "30 Day" ? "text-orange-800" :
                    priority === "90 Day" ? "text-amber-800" : "text-blue-800";
                  const iconCls =
                    priority === "Immediate" ? "text-red-600" :
                    priority === "30 Day" ? "text-orange-600" :
                    priority === "90 Day" ? "text-amber-600" : "text-blue-600";

                  const completedCount = actions.filter((a: any) => checkedSet.has(a.questionId)).length;
                  return (
                    <div key={priority} className="bg-card border border-border rounded-xl overflow-hidden">
                      <div className={`px-4 py-3 border-b border-border flex items-center gap-2 ${colorCls}`}>
                        <Clock size={14} className={iconCls} />
                        <span className={`text-sm font-semibold ${textCls} flex-1`}>{priority} — {actions.length} item{actions.length !== 1 ? "s" : ""}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          completedCount === actions.length ? "bg-green-100 text-green-700" : "bg-white/60 text-muted-foreground"
                        }`}>
                          {completedCount}/{actions.length} complete
                        </span>
                      </div>
                      <div className="divide-y divide-border">
                        {actions.map((action: any, idx: number) => {
                          const isExpanded = expandedRec === `${priority}-${idx}`;
                          const hasAI = !!action.primaryRecommendation;
                          const isChecked = checkedSet.has(action.questionId);
                          return (
                            <div key={idx} className={`px-4 py-4 transition-colors ${isChecked ? "bg-green-50/60" : ""}`}>
                              <div className="flex items-start gap-3">
                                {/* Checkbox */}
                                <button
                                  onClick={() => toggleCheck.mutate({ auditId, questionId: action.questionId })}
                                  className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    isChecked
                                      ? "bg-green-500 border-green-500 text-white"
                                      : "border-muted-foreground/40 hover:border-green-500"
                                  }`}
                                  title={isChecked ? "Mark as incomplete" : "Mark as complete"}
                                >
                                  {isChecked && <CheckCircle2 size={12} />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{action.category}</p>
                                    {categoryToRecMap[action.category] && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium truncate max-w-[180px]" title={categoryToRecMap[action.category]}>
                                        ↑ {categoryToRecMap[action.category]}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm font-medium text-foreground mb-2">{action.question}</p>
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRiskBadgeClass(
                                      action.score === 3 ? "Critical" : action.score === 2 ? "Elevated" : "Moderate"
                                    )}`}>
                                      {action.response}
                                    </span>
                                    {action.conditionType && (
                                      <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">{action.conditionType}</span>
                                    )}
                                    {hasAI && <DifficultyBadge level={action.implementationDifficulty} />}
                                    {hasAI && <CostBadge cost={action.estimatedCost} />}
                                  </div>
                                  {action.notes && (
                                    <p className="text-xs text-muted-foreground italic mb-2">Auditor notes: {action.notes}</p>
                                  )}

                                  {/* AI Recommendation */}
                                  {hasAI && (
                                    <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 overflow-hidden">
                                      <button
                                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-primary/10 transition-colors"
                                        onClick={() => setExpandedRec(isExpanded ? null : `${priority}-${idx}`)}
                                      >
                                        <Sparkles size={12} className="text-primary flex-shrink-0" />
                                        <span className="text-xs font-semibold text-primary">AI Recommendation</span>
                                        {isExpanded ? <ChevronDown size={12} className="text-primary ml-auto" /> : <ChevronRight size={12} className="text-primary ml-auto" />}
                                      </button>
                                      {isExpanded && (
                                        <div className="px-3 pb-3 space-y-3">
                                          <div>
                                            <p className="text-xs font-semibold text-foreground mb-1">Primary Recommendation</p>
                                            <p className="text-xs text-foreground leading-relaxed">{action.primaryRecommendation}</p>
                                          </div>
                                          {action.compensatingControl && (
                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                                              <p className="text-xs font-semibold text-amber-800 mb-1">Compensating Control</p>
                                              <p className="text-xs text-amber-900 leading-relaxed">{action.compensatingControl}</p>
                                            </div>
                                          )}
                                          {action.standardsReference && (
                                            <div className="flex items-start gap-1.5">
                                              <BookMarked size={11} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                                              <p className="text-[10px] text-muted-foreground">{action.standardsReference}</p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* ── Permanent Constraints ── */}
            {unavoidableConstraints?.length > 0 && (
              <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 bg-slate-100">
                  <Info size={14} className="text-slate-600" />
                  <span className="text-sm font-semibold text-slate-800">Permanent Facility Constraints</span>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">{unavoidableConstraints.length} item{unavoidableConstraints.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs text-slate-600 mb-3">These items were flagged as permanent or structural constraints that cannot be changed. They are <strong>excluded from corrective action recommendations</strong>. The Emergency Action Plan will plan compensating controls around these constraints instead of recommending their removal.</p>
                  <div className="divide-y divide-slate-200">
                    {unavoidableConstraints.map((c: any, i: number) => (
                      <div key={i} className="py-2.5 flex items-start gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-mono mt-0.5 flex-shrink-0">FIXED</span>
                        <div>
                          <p className="text-xs font-medium text-slate-800">{c.question}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{c.category} — {c.response}{c.notes ? " · " + c.notes : ""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── EAP Framework ── */}
          <TabsContent value="eap">
            {(eapLoading && !eapGenerating) ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 size={36} className="text-primary animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Loading EAP...</p>
                </div>
              </div>
            ) : eapGenerating ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 size={36} className="text-primary animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Generating facility-specific Emergency Action Plan...</p>
                  <p className="text-xs text-muted-foreground mt-1">Applying FEMA ICS/NIMS structure and ACTD framework — this may take 45–90 seconds</p>
                  <p className="text-xs text-muted-foreground mt-1 opacity-60">Please keep this page open while the plan is being generated.</p>
                </div>
              </div>
            ) : eapData ? (
              <div>
                {/* ── EAP Header ── */}
                <div className="bg-card border border-border rounded-xl p-5 mb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <BookOpen size={18} className="text-primary" />
                      </div>
                      <div>
                        <h2 className="font-bold text-foreground">{(eapData as any).planTitle ?? "Emergency Action Plan"}</h2>
                        <p className="text-xs text-muted-foreground">{eapData.facilityName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                      <Link href={`/audit/${auditId}/eap`}>
                        <Button size="sm" className="flex items-center gap-1.5">
                          <Pencil size={12} /> Full EAP Editor
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1.5"
                        disabled={pdfDownloading}
                        onClick={async () => {
                          if (pdfDownloading) return;
                          setPdfDownloading(true);
                          const MAX_RETRIES = 2;
                          let lastErr: Error | null = null;
                          for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                            try {
                              console.log(`[EAP PDF] Download attempt ${attempt}/${MAX_RETRIES}`);
                              const res = await fetch(`/api/eap/${auditId}/pdf`, { credentials: "include" });
                              if (!res.ok) {
                                const body = await res.json().catch(() => ({}));
                                throw new Error(body?.error ?? `Server error: ${res.status}`);
                              }
                              const blob = await res.blob();
                              console.log(`[EAP PDF] Download success — size=${blob.size} bytes`);
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `EAP_Audit_${auditId}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                              toast.success("EAP PDF downloaded successfully.");
                              lastErr = null;
                              break;
                            } catch (err: any) {
                              lastErr = err;
                              console.error(`[EAP PDF] Attempt ${attempt} failed:`, err);
                              if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1500));
                            }
                          }
                          if (lastErr) toast.error("Report generation failed. Please try again.");
                          setPdfDownloading(false);
                        }}
                      >
                        {pdfDownloading
                          ? <><Loader2 size={12} className="animate-spin" /> Generating…</>
                          : <><Download size={12} /> Download PDF</>}
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleGenerateEAP} disabled={eapGenerating} className="flex items-center gap-1.5">
                        {eapGenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Regenerate
                      </Button>
                    </div>
                  </div>

                  {/* Standards alignment badges */}
                  <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border">
                    {(["FEMA NIMS", "FEMA ICS", "NFPA 3000", "OSHA 29 CFR 1910.38", "OSHA WPV Prevention"] as string[]).map((std) => (
                      <span key={std} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-medium">{std}</span>
                    ))}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 font-medium">ACTD Framework</span>
                  </div>

                  {/* Dates + risk level */}
                  <div className="flex flex-wrap gap-6 mt-3 pt-3 border-t border-border">
                    {(eapData as any).effectiveDate && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Effective Date</p>
                        <p className="text-xs font-medium text-foreground">{(eapData as any).effectiveDate}</p>
                      </div>
                    )}
                    {(eapData as any).reviewDate && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Annual Review Due</p>
                        <p className="text-xs font-medium text-foreground">{(eapData as any).reviewDate}</p>
                      </div>
                    )}
                    {(eapData as any).facilitySize && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Facility Size Class</p>
                        <p className="text-xs font-medium text-foreground capitalize">{(eapData as any).facilitySize}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Audit Risk Level</p>
                      <RiskLevelBadge level={eapData.overallRiskLevel ?? ""} />
                    </div>
                  </div>

                  {/* High-risk categories */}
                  {eapData.highRiskCategories?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">High-Risk Categories Driving This EAP</p>
                      <div className="flex flex-wrap gap-1.5">
                        {eapData.highRiskCategories.map((c: string) => (
                          <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <strong className="text-amber-800">Important:</strong> This AI-generated EAP is facility-specific and based on your audit findings. Organizations must customize procedures to their specific staffing, floor plans, and local emergency services. Validate the final plan with local law enforcement and emergency management before distribution.
                    </p>
                  </div>
                </div>

                {/* ── ACTD Framework Banner ── */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-5 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={15} className="text-purple-700" />
                    <h3 className="font-semibold text-purple-900 text-sm">ACTD Response Framework</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 font-medium ml-auto">Proprietary Protocol</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { letter: "A", label: "Assess", desc: "Situational awareness — recognize the threat, gather information, determine severity", color: "bg-blue-100 text-blue-900 border-blue-300" },
                      { letter: "C", label: "Commit", desc: "Make a decisive commitment to act — activate the EAP and assign roles", color: "bg-yellow-100 text-yellow-900 border-yellow-300" },
                      { letter: "T", label: "Take Action", desc: "Lockout/Lockdown · Escape · Defend — choose the appropriate tactical response", color: "bg-orange-100 text-orange-900 border-orange-300" },
                      { letter: "D", label: "Debrief", desc: "Post-incident accountability, reporting, recovery, and after-action review", color: "bg-green-100 text-green-900 border-green-300" },
                    ].map(({ letter, label, desc, color }) => (
                      <div key={letter} className={`rounded-lg border p-3 ${color}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-black">{letter}</span>
                          <span className="text-xs font-bold">{label}</span>
                        </div>
                        <p className="text-[10px] leading-relaxed">{desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <p className="text-[10px] text-purple-700 font-medium">Take Action options: <span className="font-bold">LOCKOUT/LOCKDOWN</span> — Secure and deny entry · <span className="font-bold">ESCAPE</span> — Evacuate via safest route · <span className="font-bold">DEFEND</span> — Last resort when other options are not possible</p>
                  </div>
                </div>

                {/* ── ICS Roles Panel ── */}
                {(eapData as any).assignedRoles?.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-5 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield size={15} className="text-primary" />
                      <h3 className="font-semibold text-foreground text-sm">Assigned ICS Emergency Response Roles</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-medium ml-auto">FEMA ICS / NIMS</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Roles are dynamically assigned based on facility size classification (<span className="font-medium capitalize">{(eapData as any).facilitySize}</span>). Each role must have a designated primary holder and a trained backup.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {((eapData as any).assignedRoles as string[]).map((role: string, i: number) => (
                        <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{role}</p>
                            {i === 0 && <p className="text-[10px] text-muted-foreground">Primary incident commander — all roles report to this position</p>}
                            {i === 1 && <p className="text-[10px] text-muted-foreground">Assumes command if Site Lead is unavailable or incapacitated</p>}
                            {role.includes("911") && <p className="text-[10px] text-muted-foreground">Sole designated caller — prevents duplicate/conflicting 911 reports</p>}
                            {role.includes("Evacuation") && <p className="text-[10px] text-muted-foreground">Directs all personnel to assembly point via designated routes</p>}
                            {role.includes("Accountability") && <p className="text-[10px] text-muted-foreground">Conducts roll call at assembly point and reports to Site Lead</p>}
                            {role.includes("External") && <p className="text-[10px] text-muted-foreground">Meets and briefs arriving emergency responders</p>}
                            {role.includes("First Aid") && <p className="text-[10px] text-muted-foreground">Provides immediate first aid; must hold current CPR/AED certification</p>}
                            {role.includes("Floor") && <p className="text-[10px] text-muted-foreground">Coordinates evacuation within assigned floor or zone</p>}
                            {role.includes("Communications") && <p className="text-[10px] text-muted-foreground">Manages all internal and external communications during incident</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[10px] text-muted-foreground"><strong>ICS Principles:</strong> Unity of Command (one supervisor per person) · Span of Control (3–7 per supervisor) · Common Terminology (plain language only) · Integrated Communications (primary + backup methods)</p>
                    </div>
                  </div>
                )}

                {/* ── Executive Summary ── */}
                {(eapData as any).executiveSummary && (
                  <div className="bg-card border border-border rounded-xl p-5 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={15} className="text-primary" />
                      <h3 className="font-semibold text-foreground text-sm">Executive Summary</h3>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{(eapData as any).executiveSummary}</p>
                  </div>
                )}

                {/* ── EAP Sections ── */}
                {eapSections && eapSections.length > 0 && (
                  <div className="space-y-3">
                    {eapSections.map((section, idx) => (
                      <CollapsibleSection key={section.id ?? idx} section={section} idx={idx} />
                    ))}
                  </div>
                )}

                {/* ── Facility Photos & Documents ── */}
                {attachments && attachments.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-5 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Image size={15} className="text-primary" />
                      <h3 className="font-semibold text-foreground text-sm">Facility Photos & Documents</h3>
                      <span className="ml-auto text-xs text-muted-foreground">{attachments.length} file{attachments.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {(attachments as any[]).map((att) => (
                        <div key={att.id} className="border border-border rounded-lg overflow-hidden bg-muted/20">
                          {att.mimeType?.startsWith("image/") ? (
                            <a href={att.url} target="_blank" rel="noopener noreferrer">
                              <img src={att.url} alt={att.caption ?? att.filename} className="w-full h-32 object-cover hover:opacity-90 transition-opacity" />
                            </a>
                          ) : (
                            <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center h-32 gap-2 hover:bg-muted/40 transition-colors">
                              <FileText size={28} className="text-muted-foreground" />
                              <span className="text-xs text-muted-foreground text-center px-2 truncate w-full text-center">{att.filename}</span>
                            </a>
                          )}
                          <div className="p-2 border-t border-border">
                            <p className="text-[10px] font-medium text-foreground truncate">{att.caption ?? att.filename}</p>
                            {att.category && <p className="text-[10px] text-muted-foreground capitalize">{att.category.replace("_", " ")}</p>}
                            {att.aiAnalysis && (
                              <p className="text-[10px] text-blue-700 mt-1 line-clamp-2" title={att.aiAnalysis}>AI: {att.aiAnalysis}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-card border border-border rounded-xl">
                <BookOpen size={36} className="mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium text-foreground mb-2">No Emergency Action Plan generated yet</p>
                <p className="text-xs text-muted-foreground mb-5 max-w-sm mx-auto">Generate a facility-specific EAP based on your audit findings, applying FEMA ICS/NIMS structure and the ACTD framework.</p>
                {eapGenError && (
                  <p className="text-xs text-red-600 mb-4 max-w-sm mx-auto bg-red-50 border border-red-200 rounded-lg p-3">{eapGenError}</p>
                )}
                <Button onClick={handleGenerateEAP} disabled={eapGenerating} className="flex items-center gap-2 mx-auto">
                  {eapGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {eapGenerating ? "Generating EAP..." : "Generate Emergency Action Plan"}
                </Button>
                <p className="text-[10px] text-muted-foreground mt-3">This may take 45–90 seconds. Keep this page open.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

  );
}
