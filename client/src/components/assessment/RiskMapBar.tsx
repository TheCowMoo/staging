/**
 * RiskMapBar
 * Horizontal gradient risk map with "Your Position" label above the indicator dot.
 * Reusable across Results Page, Dashboard, and Report views.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown } from "lucide-react";

interface RiskMapBarProps {
  score: number;
  /** If true, wraps in a Card. Default: true */
  withCard?: boolean;
  contextLine?: string;
}

function RiskMapBarInner({
  score,
  contextLine = "Your current program has major gaps in planning, reporting, training, and documentation. This score does not mean you are failing — it means your program is incomplete and needs structure.",
}: {
  score: number;
  contextLine?: string;
}) {
  const pct = Math.max(2, Math.min(98, score));
  return (
    <div className="space-y-3">
      {/* "Your Position" label above indicator */}
      <div className="relative" style={{ height: "28px" }}>
        <div
          className="absolute flex flex-col items-center"
          style={{ left: `calc(${pct}% - 10px)` }}
        >
          <span className="text-xs font-semibold text-[#0B1F33] whitespace-nowrap">Your Position</span>
          <span className="text-[#0B1F33] text-xs">▼</span>
        </div>
      </div>

      {/* Gradient bar */}
      <div
        className="relative h-4 rounded-full overflow-hidden"
        style={{ background: "linear-gradient(to right, #E5484D 0%, #F59E0B 33%, #FACC15 66%, #22C55E 100%)" }}
      >
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 border-[#0B1F33] shadow-lg transition-all duration-700"
          style={{ left: `calc(${pct}% - 10px)` }}
        />
      </div>

      {/* Band labels */}
      <div className="flex justify-between text-xs text-muted-foreground font-medium px-0.5">
        <span>High Gaps</span>
        <span>Moderate Gaps</span>
        <span>Developing</span>
        <span>Operational Readiness</span>
      </div>

      {contextLine && (
        <p className="text-xs text-muted-foreground italic pt-1">{contextLine}</p>
      )}
    </div>
  );
}

export function RiskMapBar({ score, withCard = true, contextLine }: RiskMapBarProps) {
  if (!withCard) {
    return <RiskMapBarInner score={score} contextLine={contextLine} />;
  }
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-primary" />
          Program Maturity Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RiskMapBarInner score={score} contextLine={contextLine} />
      </CardContent>
    </Card>
  );
}
