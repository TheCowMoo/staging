/**
 * DefensibilityPlan.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Receives assessment context from LiabilityScan via sessionStorage (primary)
 * or wouter location state (fallback for direct history.pushState navigation).
 *
 * State priority:
 *   1. sessionStorage pp_scan_result / pp_scan_jurisdiction / pp_scan_industry
 *   2. window.history.state.planContext (set by handleDefensibilityPlan)
 *   3. Empty state → show locked placeholder with "Start Scan" CTA
 */
import { useLocation } from "wouter";
import { useMemo, useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  ArrowLeft,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lock,
  FileText,
  Users,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { HeroScoreCard, AssessmentCTAButton } from "@/components/assessment";
import { BRAND, HEADING_FONT, riskHex } from "@/components/assessment/brandUtils";
import type { AssessmentOutput } from "../../../shared/assessmentEngine";
import { loadScanSession, clearScanSession, markPlanVisited } from "@/lib/scanSession";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlanContext {
  result: AssessmentOutput;
  jurisdiction: string;
  industry: string;
}

// ─── Phase definitions ────────────────────────────────────────────────────────
const PHASE_META = [
  {
    phase: 1,
    title: "Immediate Risk Mitigation",
    timeframe: "0–30 days",
    icon: AlertTriangle,
    color: "#E5484D",
    description:
      "Address critical gaps that create direct legal exposure. These actions must be completed before any formal audit or regulatory review.",
  },
  {
    phase: 2,
    title: "Policy & Documentation Build-Out",
    timeframe: "30–90 days",
    icon: FileText,
    color: BRAND.steel,
    description:
      "Establish the written framework that supports readiness in post-incident review. Policies, procedures, and documentation chains must be in place.",
  },
  {
    phase: 3,
    title: "Training, Drills & Ongoing Compliance",
    timeframe: "90–180 days",
    icon: Users,
    color: BRAND.gold,
    description:
      "Embed safety culture through recurring training cycles and documented drill programs. This phase converts policy into practice.",
  },
];

// ─── Resolve plan context ─────────────────────────────────────────────────────
function resolvePlanContext(): PlanContext | null {
  // 1. Try sessionStorage (survives back-navigation and refresh within the tab)
  const session = loadScanSession();
  if (session.result) {
    return {
      result: session.result,
      jurisdiction: session.jurisdiction,
      industry: session.industry,
    };
  }
  // 2. Try history.state (set by handleDefensibilityPlan in LiabilityScan)
  const histState = (window.history.state as { planContext?: PlanContext } | null)?.planContext;
  if (histState?.result) {
    return histState;
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DefensibilityPlan() {
  const [, navigate] = useLocation();

  // Scroll to top on mount so the page always loads at the beginning
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  // Mark that the user has visited this page so the scan CTA label updates
  useMemo(() => {
    markPlanVisited();
  }, []);

  const state = useMemo(() => resolvePlanContext(), []);

  // Export plan as a downloadable PDF via the server-side PDF endpoint
  const [exportLoading, setExportLoading] = useState(false);
  const handleExportPlan = useCallback(async () => {
    if (!state?.result) return;
    const { result, jurisdiction, industry } = state;
    setExportLoading(true);
    try {
      const payload = {
        score: result.score,
        classification: result.classification,
        riskMapColor: result.riskMap.color,
        riskMapDescriptor: result.riskMap.descriptor,
        jurisdiction,
        industry,
        topGaps: result.topGaps,
        interpretation: result.interpretation,
        advisorSummary: result.advisorSummary,
        immediateActions: result.immediateActionPlan,
        createdAt: Date.now(),
      };
      const res = await fetch("/api/liability-scan/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FiveStonesWPV_DefensibilityPlan.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  }, [state]);

  // Build phased actions from top gaps
  const phasedActions = useMemo(() => {
    if (!state?.result) return null;
    const gaps = state.result.topGaps;
<<<<<<< HEAD
    const rawActions = state.result.immediateActionPlan as unknown[];
    // Normalize each item — the LLM sometimes returns {priority, action} objects instead of strings
    const actions = rawActions.map((item): string => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        if (typeof obj.action === "string") {
          return obj.priority ? `${String(obj.priority)}: ${obj.action}` : obj.action;
        }
        const vals = Object.values(obj).filter((v) => typeof v === "string") as string[];
        if (vals.length > 0) return vals.join(" — ");
      }
      return String(item ?? "");
    });
=======
    const actions = state.result.immediateActionPlan;
    const getActionStr = (v: unknown): string => {
      if (typeof v === "string") return v;
      if (v && typeof v === "object" && "action" in v) return String((v as any).action);
      return String(v ?? "");
    };
>>>>>>> 18d2514 (Updated project)
    return {
      phase1: gaps.slice(0, 2).map((g, i) => ({
        action: getActionStr(actions[i]) || g.gap,
        gap: g.gap,
        impact: "Critical",
      })),
      phase2: gaps.slice(2, 4).map((g, i) => ({
        action: getActionStr(actions[i + 2]) || g.gap,
        gap: g.gap,
        impact: "High",
      })),
      phase3: gaps.slice(4).map((g, i) => ({
        action: getActionStr(actions[i + 4]) || g.gap,
        gap: g.gap,
        impact: "Medium",
      })),
    };
  }, [state]);

  // ── No context: show placeholder ────────────────────────────────────────────
  if (!state?.result) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ backgroundColor: BRAND.navy }}
        >
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground" style={HEADING_FONT}>
            Readiness Plan Builder
          </h1>
          <p className="text-muted-foreground text-base max-w-lg mx-auto leading-relaxed">
            This page generates a structured, phased readiness plan based on your Workplace Violence
            Readiness Scan results. Complete the scan first to unlock your personalized plan.
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-border p-8 space-y-4 bg-muted/30">
          <Lock className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            No assessment context found. Run the Workplace Violence Readiness Scan to generate your
            Readiness Plan.
          </p>
          <AssessmentCTAButton
            variant="primary"
            size="lg"
            iconLeft={<ClipboardList className="w-4 h-4" />}
            onClick={() => {
              clearScanSession();
              navigate("/liability-scan");
            }}
          >
            Start Readiness Scan
          </AssessmentCTAButton>
        </div>

        {/* Preview of what the plan includes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {PHASE_META.map((p) => {
            const Icon = p.icon;
            return (
              <Card key={p.phase} className="text-left">
                <CardContent className="pt-5 space-y-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: p.color + "20" }}
                  >
                    <Icon className="w-4 h-4" style={{ color: p.color }} />
                  </div>
                  <p className="text-sm font-semibold text-foreground" style={HEADING_FONT}>
                    Phase {p.phase}: {p.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.timeframe}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Full plan with assessment context ────────────────────────────────────────
  const { result, jurisdiction, industry } = state;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-10">

      {/* ── Back navigation ─────────────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/liability-scan")}
        className="text-muted-foreground hover:text-foreground -ml-1"
      >
        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
        Back to Scan Results
      </Button>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: BRAND.navy }}
          >
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={HEADING_FONT}>
              Your Readiness Plan
            </h1>
            <p className="text-muted-foreground text-sm">
              A structured, phased roadmap to close readiness gaps and achieve a stronger preparedness posture.
            </p>
          </div>
        </div>
      </div>

      {/* ── Hero score summary ───────────────────────────────────────────────── */}
      <HeroScoreCard
        score={result.score}
        classification={result.classification}
        riskColor={result.riskMap.color}
        riskDescriptor={result.riskMap.descriptor}
        gapCount={result.topGaps.length}
        jurisdiction={jurisdiction}
        industry={industry}
        primaryLabel={exportLoading ? "Generating PDF…" : "Export This Plan"}
        secondaryLabel="Back to Scan Results"
        onPrimaryCTA={handleExportPlan}
        onSecondaryCTA={() => navigate("/liability-scan")}
      />

      {/* ── Plan overview banner ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 text-white space-y-2"
        style={{ background: `linear-gradient(135deg, ${BRAND.navy} 0%, ${BRAND.steel} 100%)` }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" style={{ color: BRAND.gold }} />
          <p className="font-semibold text-base" style={HEADING_FONT}>
            What This Plan Does
          </p>
        </div>
        <p className="text-sm text-blue-100 leading-relaxed max-w-2xl">
          Most workplace violence assessments evaluate isolated components — policies, training, or
          compliance checklists. This plan addresses how those elements function together as a
          system. Each phase targets a specific layer of readiness, moving your organization from{" "}
          <span style={{ color: riskHex(result.riskMap.color) }}>{result.classification}</span> to a
          fully prepared posture — one that holds up under real-world conditions and
          post-incident scrutiny.
        </p>
      </div>

      {/* -- Phased action plan (Accordion) -------------------------------------------------- */}
      {phasedActions && (
        <Accordion type="multiple" defaultValue={["phase-1"]} className="space-y-2">
          {PHASE_META.map((meta) => {
            const Icon = meta.icon;
            const actions =
              meta.phase === 1
                ? phasedActions.phase1
                : meta.phase === 2
                ? phasedActions.phase2
                : phasedActions.phase3;

            return (
              <AccordionItem
                key={meta.phase}
                value={`phase-${meta.phase}`}
                className="border border-border rounded-xl overflow-hidden shadow-sm"
              >
                <div className="h-1.5 w-full" style={{ backgroundColor: meta.color }} />
                <AccordionTrigger className="px-5 py-3.5 bg-card hover:bg-muted/40 hover:no-underline">
                  <span className="flex items-center gap-3 text-left">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: meta.color + "18" }}
                    >
                      <Icon className="w-4 h-4" style={{ color: meta.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground" style={HEADING_FONT}>
                        Phase {meta.phase}: {meta.title}
                      </p>
                      <p className="text-xs font-normal text-muted-foreground mt-0.5">
                        {meta.timeframe} &middot; {actions.length > 0 ? `${actions.length} action${actions.length !== 1 ? "s" : ""}` : "No gaps"}
                      </p>
                    </div>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 pt-3 bg-card space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{meta.description}</p>
                  {actions.length > 0 ? (
                    <div className="space-y-3">
                      {actions.map((item, i) => (
                        <div
                          key={i}
                          className="flex gap-3 p-3 rounded-xl border border-border bg-muted/30"
                        >
                          <CheckCircle2
                            className="w-4 h-4 mt-0.5 flex-shrink-0"
                            style={{ color: meta.color }}
                          />
                          <div className="space-y-1 min-w-0">
                            <p className="text-sm font-medium text-foreground leading-snug">
                              {item.action}
                            </p>
                            <p className="text-xs text-muted-foreground leading-snug">
                              Gap: {item.gap}
                            </p>
                            <span
                              className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: meta.color + "18",
                                color: meta.color,
                              }}
                            >
                              {item.impact} Impact
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                      <p className="text-sm text-green-700 font-medium">
                        No critical gaps in this phase — strong posture maintained.
                      </p>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* ── Next steps CTA ──────────────────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: BRAND.gold }} />
            <p className="font-semibold text-base text-foreground" style={HEADING_FONT}>
              Ready to Implement This Plan?
            </p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Preparedness is not defined by what exists — it is defined by what works under pressure
            and holds up under scrutiny. Five Stones Technology provides hands-on support to implement
            each phase: from policy development and documentation to on-site training and drill
            facilitation. Our advisors work directly with your team to close gaps and build a fully
            auditable readiness record.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <AssessmentCTAButton
              variant="primary"
              size="lg"
              iconLeft={<ShieldCheck className="w-4 h-4" />}
              onClick={() => {
                // Navigate to the top of the service overview page
                navigate("/how-we-help");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              See How We Help
            </AssessmentCTAButton>
            <AssessmentCTAButton
              variant="secondary"
              size="lg"
              iconLeft={<FileText className="w-4 h-4" />}
              onClick={handleExportPlan}
              disabled={exportLoading}
            >
              {exportLoading ? "Generating PDF…" : "Export This Plan"}
            </AssessmentCTAButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
