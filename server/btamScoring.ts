/**
 * BTAM WAVR-21-Derived Scoring Engine
 * Computes a concern level (low/moderate/high/imminent) from assessment factor scores.
 *
 * Factor values: 0 = absent, 1 = present, 2 = prominent
 * Pre-attack proximal factors (finalActBehaviors, surveillanceOfTarget, imminentCommunication)
 * carry 3× weight and any score of 2 triggers an automatic "imminent" classification.
 *
 * Protective factors (helpSeeking, socialSupport, futureOrientation) reduce the total score.
 */

export interface WavrFactors {
  // Motivational
  grievanceFixation: number;
  grievanceWithTarget: number;
  desperationHopelessness: number;
  // Psychological
  mentalHealthConcern: number;
  paranoidThinking: number;
  depressionWithdrawal: number;
  narcissisticInjury: number;
  // Behavioral
  concerningCommunications: number;
  weaponsInterest: number;
  pathwayBehaviors: number;
  leakage: number;
  // Historical
  priorViolenceHistory: number;
  priorMentalHealthCrisis: number;
  domesticViolenceHistory: number;
  // Situational
  recentStressor: number;
  socialIsolation: number;
  personalCrisis: number;
  // Protective (inverse)
  helpSeeking: number;
  socialSupport: number;
  futureOrientation: number;
  // Pre-attack proximal (3× weight, prominent = auto-imminent)
  finalActBehaviors: number;
  surveillanceOfTarget: number;
  imminentCommunication: number;
}

export interface WavrScoringResult {
  totalWeightedScore: number;
  computedConcernLevel: "low" | "moderate" | "high" | "imminent";
  topContributingFactors: string[];
  autoEscalated: boolean;
}

const STANDARD_FACTORS: (keyof WavrFactors)[] = [
  "grievanceFixation", "grievanceWithTarget", "desperationHopelessness",
  "mentalHealthConcern", "paranoidThinking", "depressionWithdrawal", "narcissisticInjury",
  "concerningCommunications", "weaponsInterest", "pathwayBehaviors", "leakage",
  "priorViolenceHistory", "priorMentalHealthCrisis", "domesticViolenceHistory",
  "recentStressor", "socialIsolation", "personalCrisis",
];

const PROTECTIVE_FACTORS: (keyof WavrFactors)[] = [
  "helpSeeking", "socialSupport", "futureOrientation",
];

const PROXIMAL_FACTORS: (keyof WavrFactors)[] = [
  "finalActBehaviors", "surveillanceOfTarget", "imminentCommunication",
];

const FACTOR_LABELS: Record<keyof WavrFactors, string> = {
  grievanceFixation: "Grievance Fixation",
  grievanceWithTarget: "Grievance Directed at Target",
  desperationHopelessness: "Desperation / Hopelessness",
  mentalHealthConcern: "Mental Health Concern",
  paranoidThinking: "Paranoid Thinking",
  depressionWithdrawal: "Depression / Withdrawal",
  narcissisticInjury: "Narcissistic Injury",
  concerningCommunications: "Concerning Communications",
  weaponsInterest: "Weapons Interest / Access",
  pathwayBehaviors: "Pathway Behaviors",
  leakage: "Leakage",
  priorViolenceHistory: "Prior Violence History",
  priorMentalHealthCrisis: "Prior Mental Health Crisis",
  domesticViolenceHistory: "Domestic Violence History",
  recentStressor: "Recent Significant Stressor",
  socialIsolation: "Social Isolation",
  personalCrisis: "Personal Crisis",
  helpSeeking: "Help-Seeking Behavior",
  socialSupport: "Social Support Network",
  futureOrientation: "Future Orientation",
  finalActBehaviors: "Final Act Behaviors",
  surveillanceOfTarget: "Surveillance of Target",
  imminentCommunication: "Imminent Threat Communication",
};

export function computeWavrScore(factors: WavrFactors): WavrScoringResult {
  // Check for auto-escalation: any proximal factor at 2 (prominent) → imminent
  const autoEscalated = PROXIMAL_FACTORS.some((f) => factors[f] >= 2);

  // Weighted total
  let total = 0;
  const contributions: { label: string; score: number }[] = [];

  for (const f of STANDARD_FACTORS) {
    const v = factors[f] ?? 0;
    total += v;
    if (v > 0) contributions.push({ label: FACTOR_LABELS[f], score: v });
  }

  for (const f of PROXIMAL_FACTORS) {
    const v = factors[f] ?? 0;
    const weighted = v * 3;
    total += weighted;
    if (v > 0) contributions.push({ label: FACTOR_LABELS[f], score: weighted });
  }

  // Protective factors reduce total (capped so total never goes below 0)
  for (const f of PROTECTIVE_FACTORS) {
    const v = factors[f] ?? 0;
    total = Math.max(0, total - v);
  }

  // Sort contributing factors by score descending, take top 5
  contributions.sort((a, b) => b.score - a.score);
  const topContributingFactors = contributions.slice(0, 5).map((c) => c.label);

  // Concern level thresholds (max possible ≈ 17×2 + 3×6 = 52)
  let computedConcernLevel: "low" | "moderate" | "high" | "imminent";
  if (autoEscalated) {
    computedConcernLevel = "imminent";
  } else if (total >= 28) {
    computedConcernLevel = "imminent";
  } else if (total >= 18) {
    computedConcernLevel = "high";
  } else if (total >= 8) {
    computedConcernLevel = "moderate";
  } else {
    computedConcernLevel = "low";
  }

  return { totalWeightedScore: total, computedConcernLevel, topContributingFactors, autoEscalated };
}
