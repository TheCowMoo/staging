/**
 * Assessment Component Library — barrel export
 * Import from "@/components/assessment" to access all reusable assessment UI components.
 *
 * Components:
 *  - HeroScoreCard       → Score ring + classification badge + CTAs
 *  - RiskMapBar          → Gradient risk map with "Your Position" indicator
 *  - CategoryBreakdownSection / CategoryBreakdownBar → Per-category bars with insight lines
 *  - LiabilityGapsSection / LiabilityGapCard → Expandable gap cards with consequence lines
 *  - ActionPlanSection   → Phased action plan with progress counter + checkbox state
 *  - InterpretationCard  → Sentence-split bullet interpretation block
 *  - AdvisorInsightCard  → Gold-accented advisor insight with critical failures list
 *  - ServiceCardsSection → 3-column service cards grid
 *  - FinalCTABanner      → Navy-gradient bottom CTA with classification-aware message
 *  - AssessmentCTAButton → Shared CTA button primitive (primary/gold/secondary/ghost/service variants)
 *  - brandUtils          → Shared color helpers (riskHex, scoreToColor, impactLevel, etc.)
 */

export { AssessmentCTAButton } from "./AssessmentCTAButton";
export type { CTAVariant, CTASize } from "./AssessmentCTAButton";

export { HeroScoreCard } from "./HeroScoreCard";

export { RiskMapBar } from "./RiskMapBar";

export {
  CategoryBreakdownBar,
  CategoryBreakdownSection,
  categoryInsight,
} from "./CategoryBreakdownBar";
export type { CategoryBarItem } from "./CategoryBreakdownBar";

export {
  LiabilityGapCard,
  LiabilityGapsSection,
} from "./LiabilityGapCard";
export type { GapItem } from "./LiabilityGapCard";

export {
  ActionPlanSection,
  ActionProgress,
  PhasedActionPlan,
} from "./ActionPlanSection";

export {
  InterpretationCard,
  AdvisorInsightCard,
} from "./InsightCard";

export {
  ServiceCardsSection,
  FinalCTABanner,
  DEFAULT_SERVICE_CARDS,
} from "./CTASection";
export type { ServiceCard } from "./CTASection";

export {
  riskHex,
  riskTextClass,
  riskBarColor,
  riskBadgeStyle,
  scoreToColor,
  impactLevel,
  BRAND,
  HEADING_FONT,
} from "./brandUtils";
export type { RiskColor } from "./brandUtils";
