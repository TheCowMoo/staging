/**
 * LiabilityGapCard
 * Expandable card showing a liability gap with consequence line, status badge, and impact tag.
 * Reusable across Results Page, Dashboard, and Report views.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ChevronDown, ChevronUp, Scale, ShieldCheck } from "lucide-react";
import { impactLevel, SEVERITY_BADGE } from "./brandUtils";
import type { AssessmentOutput } from "../../../../shared/assessmentEngine";

export type GapItem = AssessmentOutput["topGaps"][0] & { weight: number; preparednessBasis?: string[] };

interface LiabilityGapCardProps {
  gap: GapItem;
  index: number;
}

export function LiabilityGapCard({ gap, index }: LiabilityGapCardProps) {
  const [open, setOpen] = useState(false);
  // Single source of truth: prefer explicit severity tag, fall back to weight-derived tier
  const badge = gap.severity
    ? SEVERITY_BADGE[gap.severity]
    : impactLevel(gap.weight);
  const consequenceLine = gap.impact
    ? gap.impact.split(/[.!?]/)[0]?.trim() + "."
    : "Creates inability to demonstrate due diligence post-incident.";

  return (
    <div className="border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <button
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white mt-0.5"
            style={{ backgroundColor: "#3A5F7D" }}
          >
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-snug">{gap.gap}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 border border-red-200">
                {gap.status}
              </span>
              {/* Unified severity badge — same color for same tier everywhere */}
              <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed italic">{consequenceLine}</p>
          </div>
        </div>
        <div className="flex-shrink-0 ml-3">
          {open
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-border/60">
          <div className="mt-3 ml-10 space-y-3">
            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">Why It Matters</p>
              <p className="text-sm text-red-900 leading-relaxed">{gap.impact}</p>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Suggested Fix</p>
              <p className="text-sm text-blue-900 leading-relaxed">
                {gap.id === "q10"
                  ? "Implement a real-time alert system capable of immediate lockdown/lockout activation, role-based instruction delivery, and acknowledgment tracking."
                  : gap.id === "q16"
                  ? "Implement an anonymous reporting mechanism (hotline, app, or secure portal) that allows employees to report threats without identification or fear of retaliation."
                  : "Develop and document a formal control for this area. Engage a qualified safety advisor to implement a defensible, site-specific solution."}
              </p>
            </div>
            {gap.regulatoryBasis && gap.regulatoryBasis.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" />
                  Regulatory Basis
                </p>
                <ul className="space-y-1.5">
                  {gap.regulatoryBasis.map((citation, i) => (
                    <li key={i} className="text-sm text-slate-800 leading-relaxed flex items-start gap-2">
                      <span className="text-slate-400 mt-0.5 flex-shrink-0">—</span>
                      <span>{citation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {gap.preparednessBasis && gap.preparednessBasis.length > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Preparedness / Best-Practice Basis
                </p>
                <ul className="space-y-1.5">
                  {gap.preparednessBasis.map((citation, i) => (
                    <li key={i} className="text-sm text-emerald-900 leading-relaxed flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5 flex-shrink-0">—</span>
                      <span>{citation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface LiabilityGapsSectionProps {
  gaps: GapItem[];
  withCard?: boolean;
}

export function LiabilityGapsSection({ gaps, withCard = true }: LiabilityGapsSectionProps) {
  if (gaps.length === 0) return null;

  const content = (
    <div className="space-y-3">
      {gaps.map((gap, i) => (
        <LiabilityGapCard key={gap.id} gap={gap} index={i} />
      ))}
    </div>
  );

  if (!withCard) return content;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#E5484D]" />
          Top Readiness Gaps
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
