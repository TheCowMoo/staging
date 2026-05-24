import { useMemo, useState } from "react";
import type React from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
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
import type { CategoryKey } from "../../../shared/assessmentEngine";
import {
  CATEGORY_LABELS,
  getJurisdictionRegulatoryBasis,
  runAssessment,
  QUESTIONS,
} from "../../../shared/assessmentEngine";
import { BRAND, HEADING_FONT } from "@/components/assessment/brandUtils";
import type { AssessmentOutput } from "../../../shared/assessmentEngine";

// ─── Shared Results Page ──────────────────────────────────────────────────────
// Exact mirror of the LiabilityScan results section, accessible via share token.
// All sections rendered identically to the main scan page; action buttons are
// replaced by a Calendly CTA.
// Single source of truth: assessmentEngine classification (same as main scan page).
// ─────────────────────────────────────────────────────────────────────────────
export default function SharedResults() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  // ALL hooks declared unconditionally before any conditional returns
  const { data, isLoading, error } = trpc.liabilityScan.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );
  const [exportLoading, setExportLoading] = useState(false);

  // Build weight lookup map from QUESTIONS (same as main scan page's weightById)
  const weightById = useMemo(() => {
    const m: Record<string, number> = {};
    for (const q of QUESTIONS) m[q.id] = q.weight;
    return m;
  }, []);

  // Re-run engine from stored answers — single source of truth, mirrors main scan page exactly
  const liveResult: AssessmentOutput | null = useMemo(() => {
    if (!data?.scan?.answers || typeof data.scan.answers !== "object") return null;
    const ans = data.scan.answers as object;
    if (Object.keys(ans).length === 0) return null;
    const jur = (data.scan.jurisdiction as string | undefined) ?? "";
    const ind = (data.scan.industry as string | undefined) ?? "";
    try {
      return runAssessment(ans as Record<string, string>, jur, ind);
    } catch {
      return null;
    }
  }, [data]);

  // Category breakdown — identical 4-category mapping to LiabilityScan.tsx
  const categoryData = useMemo(() => {
    if (liveResult) {
      return [
        {
          catKey: "planning_documentation" as CategoryKey,
          label: CATEGORY_LABELS["planning_documentation"],
          score: liveResult.categoryScores.planningDocumentation,
        },
        {
          catKey: "training_awareness" as CategoryKey,
          label: CATEGORY_LABELS["training_awareness"],
          score: liveResult.categoryScores.trainingAwareness,
        },
        {
          catKey: "reporting_communication" as CategoryKey,
          label: CATEGORY_LABELS["reporting_communication"],
          score: liveResult.categoryScores.reportingCommunication,
        },
        {
          catKey: "response_readiness" as CategoryKey,
          label: CATEGORY_LABELS["response_readiness"],
          score: liveResult.categoryScores.responseReadiness,
        },
      ];
    }
    // Fallback: use stored categoryBreakdown if answers not available
    if (!data?.scan?.categoryBreakdown) return [];
    const bd = data.scan.categoryBreakdown as Record<string, number>;
    return [
      { catKey: "planning_documentation" as CategoryKey, label: CATEGORY_LABELS["planning_documentation"], score: bd["planningDocumentation"] ?? bd["planning_documentation"] ?? 0 },
      { catKey: "training_awareness" as CategoryKey, label: CATEGORY_LABELS["training_awareness"], score: bd["trainingAwareness"] ?? bd["training_awareness"] ?? 0 },
      { catKey: "reporting_communication" as CategoryKey, label: CATEGORY_LABELS["reporting_communication"], score: bd["reportingCommunication"] ?? bd["reporting_communication"] ?? 0 },
      { catKey: "response_readiness" as CategoryKey, label: CATEGORY_LABELS["response_readiness"], score: bd["responseReadiness"] ?? bd["response_readiness"] ?? 0 },
    ];
  }, [liveResult, data]);

  // Gap items — re-run from stored answers for exact parity with main scan page
  const gapItems: GapItem[] = useMemo(() => {
    if (!data?.scan) return [];
    const scan = data.scan;
    const jur = (scan.jurisdiction as string | undefined) ?? "";
    const ind = (scan.industry as string | undefined) ?? "";
    if (
      scan.answers &&
      typeof scan.answers === "object" &&
      Object.keys(scan.answers as object).length > 0
    ) {
      try {
        const liveRes = runAssessment(
          scan.answers as Record<string, string>,
          jur,
          ind
        );
        return liveRes.topGaps.map((gap) => {
          const dynBasis = getJurisdictionRegulatoryBasis(gap.id, jur);
          return {
            ...gap,
            weight: weightById[gap.id] ?? 0,
            ...(dynBasis.regulatoryBasis.length > 0
              ? { regulatoryBasis: dynBasis.regulatoryBasis }
              : {}),
            ...(dynBasis.preparednessBasis.length > 0
              ? { preparednessBasis: dynBasis.preparednessBasis }
              : {}),
          };
        });
      } catch {
        /* fall through */
      }
    }
    if (!scan.topGaps) return [];
    return (scan.topGaps as GapItem[]).map((g) => {
      const dynBasis = getJurisdictionRegulatoryBasis(g.id, jur);
      return {
        ...g,
        weight: weightById[g.id] ?? 0,
        ...(dynBasis.regulatoryBasis.length > 0
          ? { regulatoryBasis: dynBasis.regulatoryBasis }
          : {}),
        ...(dynBasis.preparednessBasis.length > 0
          ? { preparednessBasis: dynBasis.preparednessBasis }
          : {}),
      };
    });
  }, [data, weightById]);

  async function handleDownloadReport() {
    if (!data?.scan) return;
    const { scan } = data;
    setExportLoading(true);
    try {
      const result = liveResult;
      const payload = {
        score: result?.score ?? scan.score,
        classification: result?.classification ?? scan.classification,
        riskMapColor: (result?.riskMap?.color ?? scan.riskMapColor ?? "green") as string,
        riskMapDescriptor: result?.riskMap?.descriptor ?? scan.riskMapDescriptor ?? "",
        jurisdiction: scan.jurisdiction ?? "",
        industry: scan.industry ?? "",
        topGaps: gapItems.map((g) => ({
          ...g,
          weight: weightById[g.id] ?? 0,
        })),
        interpretation: result?.interpretation ?? scan.interpretation ?? "",
        advisorSummary: result?.advisorSummary ?? scan.advisorSummary ?? "",
        immediateActions:
          result?.immediateActionPlan ??
          (scan.immediateActions as string[]) ??
          [],
        scanId: scan.id,
        createdAt: scan.createdAt,
      };
      const res = await fetch("/api/liability-scan/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FiveStonesWPV_LiabilityScan_${scan.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* silent */
    } finally {
      setExportLoading(false);
    }
  }

  // Conditional renders — all hooks already declared above
  if (!token)
    return (
      <SharedErrorPage
        title="Invalid Link"
        message="This share link is missing a token."
      />
    );
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#F8F9FB" }}
      >
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#3A5F7D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your results...</p>
        </div>
      </div>
    );
  }
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("expired"))
      return (
        <SharedErrorPage
          title="Link Expired"
          message="This share link has expired. Please ask the sender to generate a new one."
          icon="clock"
        />
      );
    if (msg.includes("revoked"))
      return (
        <SharedErrorPage
          title="Link Revoked"
          message="This share link has been revoked by the sender."
          icon="warning"
        />
      );
    return (
      <SharedErrorPage
        title="Link Not Found"
        message="This share link is invalid or has been removed."
      />
    );
  }
  if (!data?.scan)
    return (
      <SharedErrorPage
        title="No Data"
        message="This scan result could not be loaded."
      />
    );

  const { scan, expiresAt } = data;
  const expiresDate = new Date(expiresAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Use live re-run as single source of truth — mirrors main scan page exactly
  // Fall back to stored values only when answers are unavailable
  const result = liveResult;
  const classification = result?.classification ?? (scan.classification as string) ?? "Moderate Exposure";
  const score = result?.score ?? (scan.score as number) ?? 0;
  const riskMapColor = (result?.riskMap?.color ?? scan.riskMapColor ?? "green") as "red" | "orange" | "yellow" | "green";
  const riskMapDescriptor = result?.riskMap?.descriptor ?? (scan.riskMapDescriptor as string) ?? "";
  const interpretation = result?.interpretation ?? (scan.interpretation as string) ?? "";
  const advisorSummary = result?.advisorSummary ?? (scan.advisorSummary as string) ?? "";
  const immediateActions = result?.immediateActionPlan ?? (scan.immediateActions as string[]) ?? [];
  const topGapsForAdvisor = result ? result.topGaps : ((scan.topGaps as AssessmentOutput["topGaps"]) ?? []);

  // Readiness score banner — same logic as LiabilityScan.tsx (engine classification as source of truth)
  const classToStatus = (c: string) =>
    c === "Critical Exposure" ? "Critical Readiness Failure"
    : c === "High Exposure" ? "Major Readiness Gaps"
    : c === "Material Exposure" ? "Significant Readiness Gaps"
    : c === "Moderate Readiness" ? "Emerging Readiness"
    : "Strong Readiness";
  const displayClassification = classToStatus(classification);
  const cls = classification;
  const isLow = cls === "Defensible Foundation";
  const isMod = cls === "Moderate Readiness";
  const isHigh = cls === "High Exposure";
  const isMaterial = cls === "Material Exposure";
  const riskLabel = isLow ? "Strong Readiness" : isMod ? "Emerging Readiness" : isMaterial ? "Significant Readiness Gaps" : isHigh ? "Major Readiness Gaps" : "Critical Readiness Failure";
  const borderCls = isLow
    ? "border-green-500 bg-green-50 dark:bg-green-950/20"
    : isMod
    ? "border-lime-500 bg-lime-50 dark:bg-lime-950/20"
    : isMaterial
    ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
    : isHigh
    ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
    : "border-red-700 bg-red-50 dark:bg-red-950/20";
  const iconCls = isLow ? "text-green-600" : isMod ? "text-lime-600" : isMaterial ? "text-yellow-600" : isHigh ? "text-orange-600" : "text-red-700";
  const badgeCls = isLow ? "bg-green-600 text-white" : isMod ? "bg-lime-600 text-white" : isMaterial ? "bg-yellow-500 text-white" : isHigh ? "bg-orange-500 text-white" : "bg-red-700 text-white";
  const descriptor = isLow
    ? "Core systems exist and are documented, with ongoing maintenance to preserve readiness."
    : isMod
    ? "Most core elements exist, but one or more weak sections could fail under scrutiny."
    : isMaterial
    ? "Important controls exist inconsistently or cannot be proven."
    : isHigh
    ? "Major gaps in reporting, planning, or response reduce defensibility."
    : "No connected system; readiness is mostly informal or absent.";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8F9FB" }}>
      {/* Header */}
      <header
        className="w-full py-4 px-6 flex items-center justify-between shadow-sm"
        style={{ backgroundColor: BRAND.navy }}
      >
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663305491116/6DTQVcKYnmAua9uKjjRgPe/5StonesTechnologylogodesign_0c2fc2be.png"
          alt="Five Stones Technology"
          className="h-10 object-contain"
        />
        <span className="text-xs text-white/60 hidden sm:block">
          Workplace Safety Assessment Platform
        </span>
      </header>

      {/* Expiry notice */}
      <div className="max-w-4xl mx-auto px-4 pt-5">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-border text-xs text-muted-foreground shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
          <span>
            This is a read-only shared report. Link expires on{" "}
            <strong className="text-foreground">{expiresDate}</strong>.
          </span>
        </div>
      </div>

      {/* Scan context */}
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-2">
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {scan.industry && (
            <span className="px-2.5 py-1 rounded-full bg-white border border-border">
              Industry:{" "}
              <strong className="text-foreground">{scan.industry}</strong>
            </span>
          )}
          {scan.jurisdiction && (
            <span className="px-2.5 py-1 rounded-full bg-white border border-border">
              Jurisdiction:{" "}
              <strong className="text-foreground">{scan.jurisdiction}</strong>
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-white border border-border">
            Completed:{" "}
            <strong className="text-foreground">
              {new Date(scan.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </strong>
          </span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 pb-16 space-y-6 pt-4">

        {/* ── Workplace Violence Readiness Score banner — engine-driven, mirrors LiabilityScan.tsx exactly ── */}
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

        {/* ── Section 1: Hero Score Card ── */}
        <HeroScoreCard
          score={score}
          classification={displayClassification}
          riskColor={riskMapColor}
          riskDescriptor={riskMapDescriptor}
          gapCount={gapItems.length}
          jurisdiction={scan.jurisdiction ?? ""}
          industry={scan.industry ?? ""}
          primaryLabel="Review Your Facility's Risk Gaps with a Specialist"
          onPrimaryCTA={() =>
            window.open(
              "https://calendly.com/dave-962/engagement-call?month=2026-04",
              "_blank",
              "noopener,noreferrer"
            )
          }
          secondaryLabel={null}
        />

        <div className="grid gap-4">
          <div className="rounded-xl border border-border p-5 bg-card space-y-3">
            <p className="text-sm font-semibold text-foreground">What this score means</p>
            <p className="text-sm text-muted-foreground">
              Your program includes some foundational elements, but the system is not yet complete enough to ensure consistent action, documentation, and follow-through.
            </p>
          </div>
          <div className="rounded-xl border border-border p-5 bg-card space-y-3">
            <p className="text-sm font-semibold text-foreground">Top 3 readiness gaps</p>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              {gapItems.slice(0, 3).map((gap, i) => (
                <li key={i}>{gap.gap}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border p-5 bg-card space-y-3">
            <p className="text-sm font-semibold text-foreground">Recommended starting point</p>
            <p className="text-sm text-muted-foreground">
              Start with a site-specific readiness assessment and action plan. This creates the structure needed for reporting, response, training, and review.
            </p>
          </div>
          <div className="rounded-xl border border-border p-5 bg-card space-y-4">
            <p className="text-sm font-semibold text-foreground">Your next step</p>
            <p className="text-sm text-muted-foreground">
              Take the next step to translate gaps into a structured improvement roadmap.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <AssessmentCTAButton
                variant="primary"
                size="lg"
                iconLeft={<ShieldCheck className="w-4 h-4" />}
                onClick={() =>
                  window.open(
                    "https://calendly.com/dave-962/engagement-call?month=2026-04",
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              >
                Review Readiness with a Specialist
              </AssessmentCTAButton>
              <AssessmentCTAButton
                variant="secondary"
                size="lg"
                onClick={() => window.print()}
              >
                Export Executive Summary
              </AssessmentCTAButton>
            </div>
          </div>
        </div>

        {/* ── Sections 2–7: Accordion — identical structure to LiabilityScan.tsx ── */}
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
              <RiskMapBar score={score} />
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
              <InterpretationCard text={interpretation} withCard={false} />
            </AccordionContent>
          </AccordionItem>

          {/* Advisor Insight */}
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
                advisorSummary={advisorSummary}
                topGaps={topGapsForAdvisor}
                withCard={false}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Priority Action Plan */}
          <AccordionItem
            value="priority-actions"
            className="border border-border rounded-xl overflow-hidden shadow-sm"
          >
            <AccordionTrigger className="px-5 py-3.5 bg-card hover:bg-muted/40 hover:no-underline font-semibold text-foreground text-sm">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E5484D] flex-shrink-0" />
                Action Roadmap
                {immediateActions.length > 0 && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({immediateActions.length} actions)
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-4 pt-2 bg-card">
              <ActionPlanSection
                actions={immediateActions}
                sectionId="priority-actions"
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Section 8: Service Cards */}
        <ServiceCardsSection topGaps={topGapsForAdvisor} />

        {/* Section 9: Final CTA — mirrors FinalCTABanner from LiabilityScan.tsx */}
        <FinalCTABanner
          classification={displayClassification}
          riskColor={riskMapColor}
          primaryLabel="Review Your Facility's Risk Gaps with a Specialist"
          onPrimary={() =>
            window.open(
              "https://calendly.com/dave-962/engagement-call?month=2026-04",
              "_blank",
              "noopener,noreferrer"
            )
          }
          onSecondary={handleDownloadReport}
          secondaryLabel={exportLoading ? "Generating PDF..." : "Download Report"}
        />
      </main>
    </div>
  );
}

// ─── Error state component ────────────────────────────────────────────────────
function SharedErrorPage({
  title,
  message,
  icon = "shield",
}: {
  title: string;
  message: string;
  icon?: "shield" | "clock" | "warning";
}) {
  const Icon =
    icon === "clock" ? Clock : icon === "warning" ? AlertTriangle : ShieldAlert;
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#F8F9FB" }}
    >
      <header
        className="w-full py-4 px-6 flex items-center gap-3 shadow-sm"
        style={{ backgroundColor: BRAND.navy }}
      >
        <img
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663305491116/6DTQVcKYnmAua9uKjjRgPe/5StonesTechnologylogodesign_0c2fc2be.png"
          alt="Five Stones Technology"
          className="h-10 object-contain"
        />
      </header>
      <div className="flex-1 flex items-center justify-center px-4">
        <Card className="max-w-md w-full shadow-md border-0">
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Icon className="w-6 h-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">{message}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
