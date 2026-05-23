/**
 * HeroScoreCard
 * Two-column hero card: SVG score ring (left) + classification, insight, CTAs (right).
 * Reusable across Results Page, Dashboard, Report view, and Export views.
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ShieldCheck, Download, MapPin, Building2 } from "lucide-react";
import { AssessmentCTAButton } from "./AssessmentCTAButton";
import {
  riskHex,
  riskTextClass,
  riskBadgeStyle,
  HEADING_FONT,
} from "./brandUtils";

interface HeroScoreCardProps {
  score: number;
  classification: string;
  riskColor: string;
  riskDescriptor: string;
  gapCount: number;
  jurisdiction?: string;
  industry?: string;
  /** Scroll target id for the primary CTA */
  actionTargetId?: string;
  onPrimaryCTA?: () => void;
  onSecondaryCTA?: () => void;
  primaryLabel?: string;
  /** Set to null to hide the secondary CTA entirely */
  secondaryLabel?: string | null;
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const hex = riskHex(color);
  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      <svg width="160" height="160" className="rotate-[-90deg]">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#E2E8F0" strokeWidth="10" />
        <circle
          cx="80" cy="80" r={r} fill="none"
          stroke={hex} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={`text-4xl font-bold ${riskTextClass(color)}`}
          style={HEADING_FONT}
        >
          {score}
        </span>
        <span className="text-xs text-muted-foreground font-medium">/ 100</span>
      </div>
    </div>
  );
}

export function HeroScoreCard({
  score,
  classification,
  riskColor,
  riskDescriptor,
  gapCount,
  jurisdiction,
  industry,
  actionTargetId = "priority-actions",
  onPrimaryCTA,
  onSecondaryCTA,
  primaryLabel = "Build Your Readiness Plan",
  secondaryLabel = "Export Report",
}: HeroScoreCardProps) {
  function handlePrimary() {
    if (onPrimaryCTA) {
      onPrimaryCTA();
    } else {
      document.getElementById(actionTargetId)?.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <Card className="shadow-md overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {/* LEFT — score ring */}
          <div className="flex flex-col items-center justify-center py-8 px-6 border-b sm:border-b-0 sm:border-r border-border bg-muted/20">
            <ScoreRing score={score} color={riskColor} />
            <p className="mt-3 text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Readiness Score
            </p>
          </div>

          {/* RIGHT — classification + meta + CTAs */}
          <div className="flex flex-col justify-center py-8 px-6 space-y-4">
            <div>
              <Badge
                className="text-sm px-3 py-1 rounded-full font-semibold mb-2"
                style={riskBadgeStyle(riskColor)}
              >
                {classification}
              </Badge>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                {riskDescriptor}
              </p>
            </div>

            {(jurisdiction || industry) && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                {jurisdiction && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{jurisdiction}
                  </span>
                )}
                {industry && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />{industry}
                  </span>
                )}
              </div>
            )}

            {/* Supporting insight */}
            <p className="text-xs font-semibold text-[#E5484D] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {gapCount} critical gap{gapCount !== 1 ? "s" : ""} require immediate action to improve readiness.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              This score reflects how well your program currently supports planning, reporting, training, and response. Use the priority actions to turn gaps into a more reliable, documented readiness system.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <AssessmentCTAButton
                variant="primary"
                size="sm"
                iconLeft={<ShieldCheck className="w-3.5 h-3.5" />}
                onClick={handlePrimary}
              >
                {primaryLabel}
              </AssessmentCTAButton>
              {secondaryLabel !== null && (
                <AssessmentCTAButton
                  variant="secondary"
                  size="sm"
                  iconLeft={<Download className="w-3.5 h-3.5" />}
                  onClick={onSecondaryCTA}
                >
                  {secondaryLabel}
                </AssessmentCTAButton>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
