/**
 * CTASection
 *  - ServiceCardsSection: gap-map-driven service cards (pasted_content_36 §4–§6)
 *    Shows "Directly Addresses" gaps per service, "Why This Is Required" block,
 *    and a service prioritization badge.
 *  - FinalCTABanner: navy-gradient bottom CTA with classification-aware message
 * Reusable across Results Page, Dashboard, and future modules.
 */
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Download, ShieldCheck, BookOpen, Building2, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";
import { AssessmentCTAButton } from "./AssessmentCTAButton";
import { riskHex, HEADING_FONT } from "./brandUtils";
import type { ReactNode } from "react";
import {
  resolveGaps,
  getGapsForService,
  deriveServicePriority,
  SERVICE_LABELS,
  type ServiceKey,
} from "../../../../shared/gapMap";
import type { AssessmentOutput } from "../../../../shared/assessmentEngine";

const SERVICE_ICONS: Record<ServiceKey, ReactNode> = {
  "full-liability-assessment": <BookOpen className="w-5 h-5" />,
  "site-specific-plan-development": <Building2 className="w-5 h-5" />,
  "training-drill-implementation": <Calendar className="w-5 h-5" />,
};

const SERVICE_COLORS: Record<ServiceKey, string> = {
  "full-liability-assessment": "#3A5F7D",
  "site-specific-plan-development": "#3A5F7D",
  "training-drill-implementation": "#C9A86A",
};

const SERVICE_DESCS: Record<ServiceKey, string> = {
  "full-liability-assessment":
    "A structured, on-site evaluation of your organization's readiness across all threat categories, documented for operational and regulatory confidence.",
  "site-specific-plan-development":
    "Development of a customized Active Threat Response Plan and Emergency Action Plan aligned to your facility, industry, and jurisdiction.",
  "training-drill-implementation":
    "Delivery of evidence-based active threat training and facilitated drills, with documentation suitable for post-incident review.",
};

type GapSummary = Pick<AssessmentOutput["topGaps"][0], "id" | "gap" | "impact" | "status">;

// ─── Service card data ────────────────────────────────────────────────────────
export interface ServiceCard {
  icon: ReactNode;
  title: string;
  desc: string;
  ctaLabel?: string;
  onCTA?: () => void;
}

export const DEFAULT_SERVICE_CARDS: ServiceCard[] = [
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: "Full Readiness Assessment",
    desc: "A structured, on-site evaluation of your organization's readiness across all threat categories, documented for operational and regulatory confidence.",
  },
  {
    icon: <Building2 className="w-5 h-5" />,
    title: "Site-Specific Plan Development",
    desc: "Development of a customized Active Threat Response Plan and Emergency Action Plan aligned to your facility, industry, and jurisdiction.",
  },
  {
    icon: <Calendar className="w-5 h-5" />,
    title: "Training & Drill Implementation",
    desc: "Delivery of evidence-based active threat training and facilitated drills, with documentation suitable for post-incident review.",
  },
];

interface ServiceCardsSectionProps {
  cards?: ServiceCard[];
  heading?: string;
  subheading?: string;
  /** When provided, enables gap-map-driven "Directly Addresses" blocks */
  topGaps?: GapSummary[];
  onServiceCTA?: (service: ServiceKey) => void;
}

const SERVICE_ORDER: ServiceKey[] = [
  "full-liability-assessment",
  "site-specific-plan-development",
  "training-drill-implementation",
];

export function ServiceCardsSection({
  cards,
  heading = "How to Improve Your Readiness",
  subheading = "Five Stones Technology delivers structured readiness solutions aligned to your organization's specific exposure profile.",
  topGaps,
  onServiceCTA,
}: ServiceCardsSectionProps) {
  // Gap-map-driven mode (pasted_content_36 §4–§6)
  if (topGaps && topGaps.length > 0) {
    const resolvedGaps = resolveGaps(
      topGaps as Array<{ id: string; gap: string; impact: string; status: string }>
    );
    const { service: priorityService, rationale } = deriveServicePriority(resolvedGaps);

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground" style={HEADING_FONT}>
            {heading}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{subheading}</p>
        </div>

        {/* Issue 6 — "What Your Results Require" system-connection block */}
        <div
          className="rounded-xl p-5 border space-y-3"
          style={{ borderColor: "#3A5F7D30", backgroundColor: "#3A5F7D08" }}
        >
          <p className="text-sm font-bold text-foreground" style={HEADING_FONT}>
            What Your Results Require
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your assessment identified gaps across planning, training, and documentation.
            A ready workplace violence program requires all three components to function as a connected system:
          </p>
          <ul className="space-y-1.5">
            {[
              "A documented assessment",
              "A site-specific plan",
              "Evidence of training and execution",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-xs font-medium text-foreground">
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#3A5F7D" }} />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground leading-relaxed">
            If any one of these is missing, the organization remains exposed.
          </p>
        </div>

        {/* §6 — Recommended Starting Point (dynamic) */}
        <div
          className="rounded-xl p-4 border-l-4 space-y-1"
          style={{ borderLeftColor: "#C9A86A", backgroundColor: "#C9A86A10" }}
        >
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#C9A86A" }}>
            Recommended Starting Point
          </p>
          <p className="text-sm font-semibold text-foreground">
            Based on your results, {SERVICE_LABELS[priorityService].toLowerCase()} is the priority.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">{rationale}</p>
        </div>

        {/* §4–§5 — Three service cards with gap lists */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SERVICE_ORDER.map((serviceKey) => {
            const isPriority = serviceKey === priorityService;
            const gapsForService = getGapsForService(resolvedGaps, serviceKey);
            const color = SERVICE_COLORS[serviceKey];

            // Red border for priority (immediate), green border for non-priority
            const borderColor = isPriority ? "#DC2626" : "#16A34A";
            return (
              <Card
                key={serviceKey}
                className="shadow-sm hover:shadow-md transition-shadow flex flex-col"
                style={{ border: `2px solid ${borderColor}` }}
              >
                <CardContent className="pt-5 pb-5 flex flex-col gap-3 h-full">
                  {/* Header */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {SERVICE_ICONS[serviceKey]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground leading-tight" style={HEADING_FONT}>
                        {SERVICE_LABELS[serviceKey]}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {SERVICE_DESCS[serviceKey]}
                  </p>

                  {/* Service sequence notice per pasted_content_37 §4 */}
                  {serviceKey === "site-specific-plan-development" && (
                    <div className="rounded-md px-2.5 py-1.5 text-xs font-medium" style={{ backgroundColor: "#3A5F7D15", color: "#3A5F7D" }}>
                      Planning must be established before training can be effective.
                    </div>
                  )}
                  {serviceKey === "training-drill-implementation" && (
                    <div className="rounded-md px-2.5 py-1.5 text-xs font-medium" style={{ backgroundColor: "#C9A86A15", color: "#8B6914" }}>
                      Training without a documented plan is not considered a complete readiness solution.
                    </div>
                  )}

                  {/* §4 — "Directly Addresses" gap list */}
                  {gapsForService.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" style={{ color }} />
                        Directly Addresses
                      </p>
                      <ul className="space-y-1">
                        {gapsForService.slice(0, 3).map((gap, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground leading-snug">
                            <span className="mt-1 w-1 h-1 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                            {gap.gap_title}
                          </li>
                        ))}
                        {gapsForService.length > 3 && (
                          <li className="text-xs text-muted-foreground/70 pl-2.5">
                            +{gapsForService.length - 3} more
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* §5 — "Why This Is Required" consequence block */}
                  {gapsForService.length > 0 && (
                    <div
                      className="rounded-lg p-2.5 space-y-1"
                      style={{ backgroundColor: color + "0D" }}
                    >
                      <p className="text-xs font-semibold flex items-center gap-1" style={{ color }}>
                        <AlertTriangle className="w-3 h-3" />
                        Why This Is Required
                      </p>
                      <p className="text-xs text-muted-foreground leading-snug">
                        {gapsForService[0].consequence_if_unresolved}
                      </p>
                    </div>
                  )}

                  <AssessmentCTAButton
                    variant="tertiary"
                    size="sm"
                    iconRight={<ArrowRight className="w-3 h-3" />}
                    onClick={() => onServiceCTA?.(serviceKey)}
                    fullWidth
                    className="mt-auto"
                  >
                    View Required Actions
                  </AssessmentCTAButton>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback: static cards (no gap data available)
  const displayCards = cards ?? DEFAULT_SERVICE_CARDS;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-foreground" style={HEADING_FONT}>
          {heading}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{subheading}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {displayCards.map((card, i) => (
          <Card key={i} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-5 flex flex-col gap-3 h-full">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: "#3A5F7D" }}
              >
                {card.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground mb-1" style={HEADING_FONT}>
                  {card.title}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
              <AssessmentCTAButton
                variant="tertiary"
                size="sm"
                iconRight={<ArrowRight className="w-3 h-3" />}
                onClick={card.onCTA}
                fullWidth
                className="mt-auto"
              >
                {card.ctaLabel ?? "View Required Actions"}
              </AssessmentCTAButton>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Final CTA banner ─────────────────────────────────────────────────────────
interface FinalCTABannerProps {
  classification: string;
  riskColor: string;
  supportingText?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
}

export function FinalCTABanner({
  classification,
  riskColor,
  supportingText = "Turn this assessment into a structured readiness roadmap.",
  primaryLabel = "Build Your Readiness Plan",
  secondaryLabel = "Export Report",
  onPrimary,
  onSecondary,
}: FinalCTABannerProps) {
  return (
    <div
      className="rounded-2xl p-8 text-white text-center space-y-4"
      style={{ background: "linear-gradient(135deg, #0B1F33 0%, #3A5F7D 100%)" }}
    >
      <p className="text-lg font-bold leading-snug" style={HEADING_FONT}>
        Your organization is <span style={{ color: riskHex(riskColor) }}>{classification}</span>.
      </p>
      <p className="text-sm text-blue-100 max-w-md mx-auto leading-relaxed">{supportingText}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
        <AssessmentCTAButton
          variant="primary"
          size="lg"
          iconLeft={<ShieldCheck className="w-4 h-4" />}
          onClick={onPrimary}
        >
          {primaryLabel}
        </AssessmentCTAButton>
        <AssessmentCTAButton
          variant="secondary"
          size="lg"
          darkBg
          iconLeft={<Download className="w-4 h-4" />}
          onClick={onSecondary}
        >
          {secondaryLabel}
        </AssessmentCTAButton>
      </div>
    </div>
  );
}
