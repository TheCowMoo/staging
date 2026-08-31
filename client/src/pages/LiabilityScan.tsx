import { useState, useMemo, useCallback, useEffect } from "react";
// liabilityScanScoring removed — risk level is now derived directly from assessmentEngine classification
import { useLocation } from "wouter";
import { BackNavigation } from "@/components/BackNavigation";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  QUESTIONS,
  CATEGORY_LABELS,
  getJurisdictionRegulatoryBasis,
  type AnswerValue,
  type CategoryKey,
  type AssessmentOutput,
  type QuestionOption,
} from "../../../shared/assessmentEngine";
import { US_STATES, ONTARIO_PROVINCES } from "../../../shared/stateProvinces";
import { INDUSTRY_LIST } from "../../../shared/industryOverlayContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ClipboardList,
  FileText,
  Users,
  Zap,
  MapPin,
  Building2,
  Loader2,
} from "lucide-react";

// --- Assessment component library ---
import {
  HeroScoreCard,
  RiskMapBar,
  CategoryBreakdownSection,
  LiabilityGapsSection,
  ActionPlanSection,
  InterpretationCard,
  AdvisorInsightCard,
  ServiceCardsSection,
  FinalCTABanner,
  AssessmentCTAButton,
} from "@/components/assessment";
import type { GapItem } from "@/components/assessment";

// --- Session persistence ---
import {
  saveScanSession,
  saveScanId,
  markPlanVisited,
  loadScanSession,
  clearScanSession,
} from "@/lib/scanSession";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

// --- Category display order ---
// reporting_communication now includes q8, q9, q10 (RAS), q16 (Anonymous Reporting)
const CATEGORY_ORDER: CategoryKey[] = [
  "planning_documentation",
  "training_awareness",
  "reporting_communication",
  "response_readiness",
  "critical_risk_factors",
];

const CATEGORY_INTRO_BY_INDUSTRY: Record<string, Partial<Record<CategoryKey, string>>> = {
  Manufacturing: {
    planning_documentation:
      "Build a documented system that matches your plant, your people, and your real operating conditions.",
    training_awareness:
      "Help employees spot warning signs early and respond clearly under stress.",
    reporting_communication:
      "Make it easy to report concerns and move them from intake to action.",
    response_readiness:
      "A written plan is not enough. Your team needs practice and role clarity.",
    critical_risk_factors:
      "Address the risks that often stay hidden until after an incident.",
  },
  Retail: {
    planning_documentation:
      "Build a store-ready system for customer-facing environments and fast escalation.",
    training_awareness:
      "Prepare employees for threats that may start with customers, visitors, or outside the front door.",
    reporting_communication:
      "Give retail teams a simple way to report concerns and a clear way to get alerts.",
    response_readiness:
      "Customers do not wait for confusion to clear up. Your team needs practiced actions.",
    critical_risk_factors:
      "Address the risks retail teams face most often, from personal threats to public-facing violence.",
  },
  Government: {
    planning_documentation:
      "Build a documented program that supports safety, public service, and accountability.",
    training_awareness:
      "Train employees to manage public interaction, internal concerns, and high-stress situations.",
    reporting_communication:
      "Public-facing agencies need clear reporting and fast escalation paths.",
    response_readiness:
      "Response readiness depends on defined roles, practiced actions, and continuity.",
    critical_risk_factors:
      "Focus on targeted threats, known risks, and people of concern before an event escalates.",
  },
  "Higher Education": {
    planning_documentation:
      "Build a campus-ready system that matches open environments, student life, and coordinated response expectations.",
    training_awareness:
      "Higher ed readiness depends on awareness, role clarity, and repeated practice.",
    reporting_communication:
      "Campuses need clear reporting paths and fast, trusted alerting.",
    response_readiness:
      "In open environments, drilled coordination matters as much as written plans.",
    critical_risk_factors:
      "Address the behavior, threat, and intervention risks that often emerge before violence does.",
  },
  Healthcare: {
    planning_documentation:
      "Build a documented violence-prevention system that can be maintained, reviewed, and proven.",
    training_awareness:
      "Train staff to recognize escalation, violence risk, and role-specific response expectations.",
    reporting_communication:
      "Reporting and incident tracking are central to healthcare defensibility.",
    response_readiness:
      "Response readiness depends on practice, review, and role clarity under pressure.",
    critical_risk_factors:
      "Focus on the known factors that drive violence risk in care settings.",
  },
};

// --- Main page ---
// ── Hidden result sections — kept for future re-enable (flip flag to true to restore) ──
const SHOW_WHAT_THIS_MEANS = false;
const SHOW_OPERATIONAL_INTERPRETATION = false;
const SHOW_ACTION_ROADMAP = false;
const SHOW_SERVICE_CARDS = false;

export default function LiabilityScan() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // --- Restore from sessionStorage on mount ---
  const session = useMemo(() => loadScanSession(), []);

  const [jurisdiction, setJurisdiction] = useState(session.jurisdiction);
  const [industry, setIndustry] = useState(session.industry);
  const [organization, setOrganization] = useState(session.organization);
  const [employeeCount, setEmployeeCount] = useState(session.employeeCount);
  const [facilityLocation, setFacilityLocation] = useState(session.facilityLocation);
  const [lateNightOperations, setLateNightOperations] = useState<boolean | undefined>(session.lateNightOperations);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(session.answers);
  const [result, setResult] = useState<AssessmentOutput | null>(session.result);
  // Risk level is derived from result.classification — no separate scoring system
  const [savedScanId, setSavedScanId] = useState<number | null>(session.scanId);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const [scanLoadingDialogOpen, setScanLoadingDialogOpen] = useState(false);

  const classToStatus = (c: string) =>
    c === "Critical Exposure" ? "Immediate Readiness Priority"
    : c === "High Exposure" ? "Key Readiness Areas"
    : c === "Material Exposure" ? "Readiness Improvements Needed"
    : c === "Moderate Readiness" ? "Emerging Readiness"
    : "Strong Readiness";

  // Scroll to results if restoring a completed scan
  useEffect(() => {
    if (session.result) {
      setTimeout(() => {
        document.getElementById("scan-results")?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist engine-based classification to DB once scan is saved
  const updateTierScoresMutation = trpc.liabilityScan.updateTierScores.useMutation();
  useEffect(() => {
    if (!user || !savedScanId || !result) return;
    updateTierScoresMutation.mutate({
      scanId: savedScanId,
      scorePercent: result.score,
      defensibilityStatus: classToStatus(result.classification),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedScanId, result]);

  const saveScanMutation = trpc.liabilityScan.save.useMutation({
    onSuccess: (data) => {
      setSavedScanId(data.scanId);
      saveScanId(data.scanId);
      // Scan is persisted in DB — user can re-view results from the dashboard at any time.
    },
    onError: () => {
      // Non-blocking: scan still works without persistence
      console.warn("[LiabilityScan] Failed to persist scan result");
    },
  });

  const computeScoreMutation = trpc.liabilityScan.computeScore.useMutation();

  // Navigate to Defensibility Plan carrying full assessment context
  const handleDefensibilityPlan = useCallback(() => {
    if (!result) return;
    markPlanVisited();
    // Also push to history.state as a belt-and-suspenders fallback
    window.history.pushState(
      { planContext: { result, jurisdiction, industry } },
      "",
      "/defensibility-plan"
    );
    navigate("/defensibility-plan");
  }, [result, jurisdiction, industry, navigate]);

  const questionsByCategory = useMemo(() => {
    const map: Partial<Record<CategoryKey, typeof QUESTIONS>> = {};
    for (const cat of CATEGORY_ORDER) {
      map[cat] = QUESTIONS.filter((q) => q.category === cat);
    }
    return map;
  }, []);

  // Build a weight lookup for gap cards
  const weightById = useMemo(() => {
    const m: Record<string, number> = {};
    for (const q of QUESTIONS) m[q.id] = q.weight;
    return m;
  }, []);

  // Open the printable Executive Advisory Report page (replaces the old server-side PDF download)
  const handleExportReport = useCallback(() => {
    navigate("/scan-report");
  }, [navigate]);

  const totalAnswered = Object.keys(answers).length;
  const totalQuestions = QUESTIONS.length;
  const allAnswered = totalAnswered === totalQuestions;

  function handleAnswer(id: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function handleRun() {
    if (!allAnswered) return;

    setScanLoadingDialogOpen(true);
    try {
      const output = await computeScoreMutation.mutateAsync({
        answers,
        jurisdiction: jurisdiction || "Not specified",
        industry: industry || "Not specified",
      });

      setResult(output);
      setSavedScanId(null);
      // Persist to sessionStorage immediately so back-navigation restores state
      saveScanSession({
        result: output,
        answers,
        jurisdiction: jurisdiction || "Not specified",
        industry: industry || "Not specified",
        organization,
        employeeCount,
        facilityLocation,
        lateNightOperations: !!lateNightOperations,
        scanId: null,
      });

      // Auto-save for logged-in users (non-blocking)
      if (user) {
        saveScanMutation.mutate({
          score: output.score,
          classification: output.classification,
          riskMapLevel: output.riskMap.label,
          riskMapColor: output.riskMap.color,
          riskMapDescriptor: output.riskMap.descriptor,
          jurisdiction: jurisdiction || "Not specified",
          industry: industry || "Not specified",
          organization: organization || undefined,
          employeeCount: employeeCount || undefined,
          facilityLocation: facilityLocation || undefined,
          topGaps: output.topGaps,
          categoryBreakdown: output.categoryScores as unknown as Record<string, unknown>,
          immediateActions: output.immediateActionPlan,
          interpretation: output.interpretation,
          advisorSummary: output.advisorSummary,
          answers,
        });
      }
      setTimeout(() => {
        document.getElementById("scan-results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("[LiabilityScan] LLM computeScore failed", error);
      toast.error("Liability scan generation failed. Please try again.");
    } finally {
      setScanLoadingDialogOpen(false);
    }
  }

  function handleReset() {
    clearScanSession();
    setAnswers({});
    setResult(null);
    setSavedScanId(null);
    setShareUrl(null);
    setJurisdiction("");
    setIndustry("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Build enriched gap items for LiabilityGapsSection.
  // Override regulatoryBasis at render time using the current jurisdiction so that
  // saved/restored results always show jurisdiction-correct citations.
  const gapItems: GapItem[] = useMemo(() => {
    if (!result) return [];
    const jur = jurisdiction || "Not specified";
    return result.topGaps.map((gap) => {
      const dynBasis = getJurisdictionRegulatoryBasis(gap.id, jur);
      return {
        ...gap,
        weight: weightById[gap.id] ?? 0,
        ...(dynBasis.regulatoryBasis.length > 0 ? { regulatoryBasis: dynBasis.regulatoryBasis } : {}),
        ...(dynBasis.preparednessBasis.length > 0 ? { preparednessBasis: dynBasis.preparednessBasis } : {}),
      };
    });
  }, [result, weightById, jurisdiction]);

  // Build category data for CategoryBreakdownSection
  const categoryData = useMemo(() => {
    if (!result) return [];
    return [
      {
        catKey: "planning_documentation" as CategoryKey,
        label: CATEGORY_LABELS["planning_documentation"],
        score: result.categoryScores.planningDocumentation,
      },
      {
        catKey: "training_awareness" as CategoryKey,
        label: CATEGORY_LABELS["training_awareness"],
        score: result.categoryScores.trainingAwareness,
      },
      {
        catKey: "reporting_communication" as CategoryKey,
        label: CATEGORY_LABELS["reporting_communication"],
        score: result.categoryScores.reportingCommunication,
      },
      {
        catKey: "response_readiness" as CategoryKey,
        label: CATEGORY_LABELS["response_readiness"],
        score: result.categoryScores.responseReadiness,
      },
    ];
  }, [result]);

  // Determine whether user has already visited the Defensibility Plan
  // so we can switch the primary CTA label accordingly
  const planVisited = session.planVisited;

  // Service cards with anchored navigation to /how-we-help
  const serviceCards = useMemo(
    () => [
      {
        icon: <ClipboardList className="w-5 h-5" />,
        title: "Full Readiness Assessment",
        desc: "A structured, on-site evaluation of your organization's preparedness across all threat categories, documented for regulatory review and operational readiness.",
        onCTA: () => navigate("/how-we-help#full-liability-assessment"),
      },
      {
        icon: <FileText className="w-5 h-5" />,
        title: "Site-Specific Plan Development",
        desc: "Development of a customized Active Threat Response Plan and Emergency Action Plan aligned to your facility, industry, and jurisdiction.",
        onCTA: () => navigate("/how-we-help#site-specific-plan-development"),
      },
      {
        icon: <Users className="w-5 h-5" />,
        title: "Training & Drill Implementation",
        desc: "Delivery of evidence-based active threat training and facilitated drills, with documentation suitable for post-incident review.",
        onCTA: () => navigate("/how-we-help#training-drill-implementation"),
      },
    ],
    [navigate]
  );

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-10">
      {/* ── Back navigation ─────────────────────────────────────────────────── */}
      <BackNavigation to="/dashboard" label="Back to Dashboard" />
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "#0B1F33" }}
          >
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "Poppins, Inter, sans-serif" }}
            >
              Workplace Violence Readiness Scan
            </h1>
            <p className="text-muted-foreground text-sm">
              Identify workplace violence readiness gaps and assess your organization's preparedness posture.
            </p>
          </div>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
          <strong>Disclaimer:</strong> This is a preliminary workplace violence readiness scan designed to
          identify potential gaps and areas of exposure. It is not a formal audit or legal determination of compliance.
        </div>
      </div>

      {/* ── Context selectors ───────────────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            Assessment Context
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              Organization
            </label>
            <Input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Your organization name"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              Jurisdiction
            </label>
            <Select value={jurisdiction} onValueChange={setJurisdiction}>
              <SelectTrigger>
                <SelectValue placeholder="Select state / province…" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((s) => (
                  <SelectItem key={s.value} value={s.label}>{s.label}</SelectItem>
                ))}
                {ONTARIO_PROVINCES.map((p) => (
                  <SelectItem key={p.value} value={p.label}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
              <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              Industry
            </label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger>
                <SelectValue placeholder="Select industry…" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRY_LIST.map((ind) => (
                  <SelectItem key={ind.key} value={ind.label}>{ind.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                Number of employees
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={employeeCount}
                onChange={(e) => setEmployeeCount(e.target.value)}
                placeholder="e.g. 250"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                Facility / Location(s)
              </label>
              <Input
                type="text"
                value={facilityLocation}
                onChange={(e) => setFacilityLocation(e.target.value)}
                placeholder="e.g. Main Campus — 123 Main St, Springfield, IL"
              />
            </div>
              {industry === "Retail" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    Late-night operations
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!lateNightOperations}
                      onChange={(e) => setLateNightOperations(e.target.checked)}
                    />
                    <span className="text-sm text-muted-foreground">This location has late-night operations</span>
                  </div>
                </div>
              )}
        </CardContent>
      </Card>

      {/* New York Retail Worker Safety Act alert */}
      {industry === "Retail" && jurisdiction.includes("New York") && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
          <strong>State Notice:</strong> If your employer is covered by the New York Retail Worker Safety Act, ensure your Workplace Violence Prevention Policy and training meet the Act's requirements. Larger covered employers should also review silent-response readiness and escalation procedures.
        </div>
      )}

      {/* ── Question categories ─────────────────────────────────────────────── */}
      {CATEGORY_ORDER.map((catKey) => {
        const qs = questionsByCategory[catKey] ?? [];
        const catAnswered = qs.filter((q) => answers[q.id] !== undefined).length;
        return (
          <Card key={catKey} className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span style={{ fontFamily: "Poppins, Inter, sans-serif" }}>
                  {CATEGORY_LABELS[catKey]}
                </span>
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {catAnswered}/{qs.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {CATEGORY_INTRO_BY_INDUSTRY[industry]?.[catKey] ? (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {CATEGORY_INTRO_BY_INDUSTRY[industry]?.[catKey]}
                </p>
              ) : null}
              {qs.map((q, idx) => {
                const ans = answers[q.id];
                return (
                  <div key={q.id} className="space-y-2.5">
                    <p className="text-sm font-medium text-foreground leading-snug">
                      <span className="text-muted-foreground mr-2 font-normal">{idx + 1}.</span>
                      {q.text}
                    </p>
                    {q.helperText ? (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {q.helperText}
                      </p>
                    ) : null}
                    {q.options && q.options.length > 0 ? (
                      // Multi-option question: render as radio button group
                      <div className="flex flex-col gap-2">
                        {(q.options as QuestionOption[]).map((opt) => {
                          const isSelected = ans === opt.value;
                          const isFullCredit = opt.deductionFraction === 0;
                          const isNone = opt.deductionFraction === 1;
                          const selectedColor = isFullCredit
                            ? "bg-[#22C55E] text-white border-[#22C55E]"
                            : isNone
                            ? "bg-[#E5484D] text-white border-[#E5484D]"
                            : "bg-[#F59E0B] text-white border-[#F59E0B]";
                          return (
                            <button
                              key={opt.value}
                              onClick={() => handleAnswer(q.id, opt.value)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all text-left ${
                                isSelected
                                  ? `${selectedColor} shadow-sm`
                                  : "border-border text-muted-foreground hover:border-muted-foreground bg-transparent"
                              }`}
                            >
                              <span className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                                style={{
                                  borderColor: isSelected ? "white" : "currentColor",
                                  backgroundColor: isSelected ? "white" : "transparent",
                                }}
                              >
                                {isSelected && (
                                  <span className="w-2 h-2 rounded-full block"
                                    style={{
                                      backgroundColor: isFullCredit ? "#22C55E" : isNone ? "#E5484D" : "#F59E0B",
                                    }}
                                  />
                                )}
                              </span>
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      // Binary yes/no question
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAnswer(q.id, "yes")}
                          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                            ans === "yes"
                              ? "bg-[#22C55E] text-white border-[#22C55E] shadow-sm"
                              : "border-border text-muted-foreground hover:border-[#22C55E] hover:text-[#22C55E]"
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Yes
                        </button>
                        <button
                          onClick={() => handleAnswer(q.id, "no")}
                          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                            ans === "no"
                              ? "bg-[#E5484D] text-white border-[#E5484D] shadow-sm"
                              : "border-border text-muted-foreground hover:border-[#E5484D] hover:text-[#E5484D]"
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          No
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* ── Progress + Run button ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between py-2">
        <div className="space-y-1">
          <span className="text-sm font-medium text-foreground">
            {totalAnswered}/{totalQuestions} questions answered
          </span>
          <div className="h-1.5 w-48 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(totalAnswered / totalQuestions) * 100}%`,
                backgroundColor: "#3A5F7D",
              }}
            />
          </div>
        </div>
        <Button
          onClick={handleRun}
          disabled={!allAnswered || computeScoreMutation.isPending}
          size="lg"
          className="text-white font-semibold shadow-md hover:shadow-lg transition-shadow"
          style={{ backgroundColor: "#0B1F33" }}
        >
          {computeScoreMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Zap className="w-4 h-4 mr-2" />
          )}
          {computeScoreMutation.isPending ? "Running Scan..." : "Run Readiness Scan"}
        </Button>
      </div>

      <Dialog open={scanLoadingDialogOpen} onOpenChange={setScanLoadingDialogOpen}>
        <DialogContent showCloseButton={false} className="max-w-md">
          <DialogHeader>
              <DialogTitle>Generating your readiness scan</DialogTitle>
            <DialogDescription>
              This can take 30–45 seconds to complete. Please keep this window open while we generate your full scan results.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>

      {/* Scan email removed — results are persisted in DB and viewable from dashboard */}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* RESULTS                                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {result && (
        <div id="scan-results" className="space-y-8 pt-6 border-t border-border">

          {/* Results header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2
              className="text-xl font-bold text-foreground flex items-center gap-2"
              style={{ fontFamily: "Poppins, Inter, sans-serif" }}
            >
              <ShieldAlert className="w-5 h-5 text-[#E5484D]" />
              Scan Results
            </h2>
            <div className="flex items-center gap-2">

              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Start Over
              </Button>
            </div>
          </div>



          {/* ── Readiness score banner (engine-driven, single source of truth) ─ */}
          {(() => {
            const cls = result.classification;
            const isLow = cls === "Defensible Foundation";
            const isMod = cls === "Material Exposure";
            const isHigh = cls === "High Exposure";
            const isCrit = cls === "Critical Exposure";
            const riskLabel = isLow ? "Operationally Mature" : isMod ? "Partial Readiness" : isHigh ? "Readiness Gaps Detected" : "Readiness at Risk";
            const borderCls = isLow ? "border-green-500 bg-green-50 dark:bg-green-950/20"
              : isMod ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20"
              : isHigh ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
              : "border-red-700 bg-red-50 dark:bg-red-950/20";
            const iconCls = isLow ? "text-green-600" : isMod ? "text-amber-600" : isHigh ? "text-orange-600" : "text-red-700";
            const badgeCls = isLow ? "bg-green-600 text-white" : isMod ? "bg-amber-500 text-white" : isHigh ? "bg-orange-500 text-white" : "bg-red-700 text-white";
            const catScores = result.categoryScores;
            const lowCategories: string[] = [];
            if (catScores.planningDocumentation !== undefined && catScores.planningDocumentation < 50) lowCategories.push("planning and documentation");
            if (catScores.trainingAwareness !== undefined && catScores.trainingAwareness < 50) lowCategories.push("training practices");
            if (catScores.reportingCommunication !== undefined && catScores.reportingCommunication < 50) lowCategories.push("reporting and communication");
            if (catScores.responseReadiness !== undefined && catScores.responseReadiness < 50) lowCategories.push("response readiness");

            const descriptor = isLow
              ? "Your readiness systems are largely established. Continued attention to periodic review and state-specific requirements will help sustain this foundation."
              : isMod
              ? "Foundational elements exist but are not yet consistent enough to ensure reliable execution across all areas."
              : isHigh && lowCategories.length > 0
              ? `Your program would benefit from focused attention in ${lowCategories.join(", ")} to strengthen overall readiness.`
              : isHigh
              ? "Your program has several areas where focused improvement will strengthen organizational readiness."
              : isCrit && lowCategories.length > 0
              ? `Your program would benefit from structured development in ${lowCategories.join(", ")} to build a more dependable readiness posture.`
              : "Your program has structural gaps that need attention to build a dependable readiness posture.";
            return (
              <div className={`rounded-xl border-2 p-5 space-y-2 ${borderCls}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className={`w-5 h-5 ${iconCls}`} />
                    <span className="text-base font-bold text-slate-950 dark:text-white" style={{ fontFamily: "Poppins, Inter, sans-serif" }}>
                      Workplace Violence Readiness Score
                    </span>
                  </div>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${badgeCls}`}>
                    {riskLabel}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{descriptor}</p>
              </div>
            );
          })()}

          {/* ── Section 1: Hero Score Card ────────────────────────────────────── */}
          <HeroScoreCard
            score={result.score}
            classification={classToStatus(result.classification)}
            riskColor={result.riskMap.color}
            riskDescriptor={result.riskMap.descriptor}
            gapCount={result.topGaps.length}
            criticalGapCount={result.topGaps.filter((g) => g.severity === "CRITICAL").length}
            jurisdiction={jurisdiction}
            industry={industry}
            primaryLabel={planVisited ? "View Your Readiness Plan" : "Build Your Readiness Plan"}
            onPrimaryCTA={handleDefensibilityPlan}
            onSecondaryCTA={handleExportReport}
          />

          <div className="grid gap-4">
            <div className="rounded-xl border border-border p-5 bg-card space-y-3">
              <p className="text-sm font-semibold text-foreground">What this score means</p>
              <p className="text-sm text-muted-foreground">
                {result.interpretation}
              </p>
            </div>
          </div>

          {/* -- Sections 2-7: Collapsible Accordion (all results sections) */}
          <Accordion
            type="multiple"
            defaultValue={["risk-map"]}
            className="space-y-2"
          >
            {/* Risk Map */}
            <AccordionItem
              value="risk-map"
              className="border border-border rounded-xl overflow-hidden shadow-sm"
            >
              <AccordionTrigger className="px-5 py-3.5 bg-card hover:bg-muted/40 hover:no-underline font-semibold text-foreground text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E5484D] flex-shrink-0" />
                  Program Maturity Map
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-4 pt-2 bg-card">
                <RiskMapBar score={result.score} />
              </AccordionContent>
            </AccordionItem>

            {/* Category Breakdown */}
            <AccordionItem
              value="category-breakdown"
              className="border border-border rounded-xl overflow-hidden shadow-sm"
            >
              <AccordionTrigger className="px-5 py-3.5 bg-card hover:bg-muted/40 hover:no-underline font-semibold text-foreground text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#3A5F7D] flex-shrink-0" />
                  Category Breakdown
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-4 pt-2 bg-card">
                <CategoryBreakdownSection categories={categoryData} />
              </AccordionContent>
            </AccordionItem>

            {/* Top Readiness Gaps */}
            <AccordionItem
              value="top-gaps"
              className="border border-border rounded-xl overflow-hidden shadow-sm"
            >
              <AccordionTrigger className="px-5 py-3.5 bg-card hover:bg-muted/40 hover:no-underline font-semibold text-foreground text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E5484D] flex-shrink-0" />
                  Top Readiness Gaps
                  {gapItems.length > 0 && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({gapItems.length} identified)
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-4 pt-2 bg-card">
                <LiabilityGapsSection gaps={gapItems} />
              </AccordionContent>
            </AccordionItem>

            {/* What This Means */}
            {SHOW_WHAT_THIS_MEANS && (
              <AccordionItem
                value="interpretation"
                className="border border-border rounded-xl overflow-hidden shadow-sm"
              >
                <AccordionTrigger className="px-5 py-3.5 bg-card hover:bg-muted/40 hover:no-underline font-semibold text-foreground text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#3A5F7D] flex-shrink-0" />
                    What This Means
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-4 pt-2 bg-card">
                  <InterpretationCard text={result.interpretation} withCard={false} />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* ROI Calculator */}
            <a
              href="https://roi.pursuitpathways.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 font-semibold text-foreground text-sm shadow-sm"
            >
              ROI Calculator
            </a>

            {/* Advisor Insight */}
            {SHOW_OPERATIONAL_INTERPRETATION && (
              <AccordionItem
                value="advisor-insight"
                className="border border-border rounded-xl overflow-hidden shadow-sm"
              >
                <AccordionTrigger className="px-5 py-3.5 bg-card hover:bg-muted/40 hover:no-underline font-semibold text-foreground text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                    Operational Interpretation
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-4 pt-2 bg-card">
                  <AdvisorInsightCard
                    advisorSummary={result.advisorSummary}
                    topGaps={result.topGaps}
                    withCard={false}
                  />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Priority Action Plan */}
            {SHOW_ACTION_ROADMAP && (
              <AccordionItem
                value="priority-actions"
                className="border border-border rounded-xl overflow-hidden shadow-sm"
              >
                <AccordionTrigger className="px-5 py-3.5 bg-card hover:bg-muted/40 hover:no-underline font-semibold text-foreground text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#E5484D] flex-shrink-0" />
                    Action Roadmap
                    {result.immediateActionPlan.length > 0 && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        ({result.immediateActionPlan.length} actions)
                      </span>
                    )}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-4 pt-2 bg-card">
                  <ActionPlanSection
                    actions={result.immediateActionPlan}
                    sectionId="priority-actions"
                  />
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>

          {/* -- Section 8: Service Cards (gap-map-driven, pasted_content_36 §4-§6) */}
          {SHOW_SERVICE_CARDS && (
            <ServiceCardsSection
              topGaps={result.topGaps}
              onServiceCTA={(service) => navigate(`/how-we-help#${service}`)}
            />
          )}

          {/* ── Section 9: Final CTA ──────────────────────────────────────────── */}
          <FinalCTABanner onSecondary={handleExportReport} />

          {/* CRM payload is available via engine output for API/automation use — not shown in UI */}
        </div>
      )}
    </div>
  );
}
