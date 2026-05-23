/**
 * InsightCard
 * Two variants:
 *  - "advisor": gold left-border card with critical failures list + advisor summary text
 *  - "interpretation": sentence-split bullet block for liability interpretation text
 * Reusable across Results Page, Dashboard, and Report views.
 *
 * pasted_content_36 §2: AdvisorInsightCard is now fully driven by the gap map
 * so Advisor Insight, Services, and Report always share the same dataset.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { AssessmentOutput } from "../../../../shared/assessmentEngine";
import { resolveGaps, type GapDefinition } from "../../../../shared/gapMap";

// ─── Interpretation block ─────────────────────────────────────────────────────
interface InterpretationCardProps {
  text: string;
  withCard?: boolean;
}

export function InterpretationCard({ text, withCard = true }: InterpretationCardProps) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  const headline = sentences[0]?.trim() ?? text;
  const bullets = sentences.slice(1).filter(Boolean).map((s) => s.trim());

  const content = (
    <div className="space-y-3">
      <p className="text-base font-semibold text-foreground leading-snug">{headline}</p>
      {bullets.length > 0 && (
        <ul className="space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (!withCard) return content;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-primary" />
          What This Means
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

// ─── Advisor insight block ────────────────────────────────────────────────────
type GapSummary = Pick<AssessmentOutput["topGaps"][0], "id" | "gap" | "impact" | "status">;

interface AdvisorInsightCardProps {
  advisorSummary: string;
  topGaps?: GapSummary[];
  withCard?: boolean;
}

/** Color coding per pasted_content_36 §8: Red=Critical, Orange=High, Blue=Moderate */
function riskBadgeStyle(level: GapDefinition["risk_level"]) {
  if (level === "Critical")
    return { dot: "bg-[#E5484D]", badge: "bg-red-100 text-red-700 border border-red-200" };
  if (level === "High")
    return { dot: "bg-orange-500", badge: "bg-orange-100 text-orange-700 border border-orange-200" };
  return { dot: "bg-[#3A5F7D]", badge: "bg-blue-100 text-blue-700 border border-blue-200" };
}

export function AdvisorInsightCard({
  advisorSummary,
  topGaps = [],
  withCard = true,
}: AdvisorInsightCardProps) {
  // Resolve gaps through the single gap-map dataset (pasted_content_36 §9)
  const resolvedGaps = resolveGaps(
    topGaps as Array<{ id: string; gap: string; impact: string; status: string }>
  );
  const criticalCount = resolvedGaps.filter((g) => g.risk_level === "Critical").length;
  const exposureCount = criticalCount > 0 ? criticalCount : resolvedGaps.length;

  const content = (
    <div className="space-y-4">
      {/* §2 — Dynamic headline */}
      {resolvedGaps.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-foreground leading-snug">
            Your program currently has {exposureCount} critical readiness gap
            {exposureCount !== 1 ? "s" : ""}:
          </p>
          {/* §8 — Color-coded gap list */}
          <ul className="space-y-2">
            {resolvedGaps.slice(0, 5).map((gap, i) => {
              const style = riskBadgeStyle(gap.risk_level);
              return (
                <li key={i} className="flex items-center gap-2 text-sm leading-relaxed">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
                  <span className="flex-1 text-foreground">{gap.gap_title}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${style.badge}`}>
                    {gap.risk_level}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* §2 — Dynamic summary paragraph (references jurisdiction/industry/gaps via engine) */}
      {advisorSummary && (
        <p className="text-sm text-muted-foreground leading-relaxed">{advisorSummary}</p>
      )}

      {/* System-level framing (pasted_content_35 §2, preserved) */}
      <div className="space-y-2 pt-1 border-t border-border/50">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your responses suggest that elements of workplace violence preparedness may exist, but are
          not functioning as a fully aligned system.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          In practice, this often means organizations rely on policies or training that are not
          connected to real-world execution, facility conditions, or response expectations.
        </p>
        <p className="text-sm font-semibold text-foreground leading-snug">
          This creates operational risk in two critical areas:
        </p>
        <ul className="space-y-1.5">
          {["Coordinated response during an incident", "Consistent documentation and learning after an incident"].map(
            (b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                {b}
              </li>
            )
          )}
        </ul>
        {/* §2 — Mandatory closing statement */}
        <p
          className="text-sm font-semibold text-foreground leading-snug border-l-2 pl-3 py-1"
          style={{ borderColor: "#C9A86A" }}
        >
          This indicates that elements may exist, but are not functioning as a fully aligned,
          readiness-focused system.
        </p>
      </div>
    </div>
  );

  if (!withCard) return content;

  return (
    <Card className="shadow-sm border-l-4" style={{ borderLeftColor: "#C9A86A" }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" style={{ color: "#C9A86A" }} />
          <span style={{ color: "#C9A86A" }}>
            Operational Insight — System-Level Readiness Analysis
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
