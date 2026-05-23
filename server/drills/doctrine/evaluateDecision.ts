/**
 * evaluateDecision.ts
 *
 * Evaluates a response option against the five doctrine dimensions.
 *
 * This evaluation must be computed BEFORE:
 *   - labels are assigned
 *   - outcomes are generated
 *   - expert reasoning is written
 *
 * The evaluation drives all downstream generation — it is the source of truth
 * for whether an option is strong, plausible, or poor.
 */

import type {
  DecisionDoctrineEvaluation,
  DecisionEffect,
} from "./decisionDoctrine";

// ─── Evaluation Input ──────────────────────────────────────────────────────────

export type OptionEvaluationInput = {
  /** Short action label (e.g., "Alert security immediately") */
  label: string;
  /** What this action does in practice */
  description: string;
  /**
   * Analyst signals — used to derive dimension effects.
   * These are set by the LLM or by the evaluation heuristics below.
   */
  signals: {
    /** Does this action reduce personal or group exposure? */
    reducesExposure: boolean;
    /** Does this action maintain or restore environmental control? */
    maintainsControl: boolean;
    /** Does this action avoid provoking escalation? */
    avoidsEscalation: boolean;
    /** Does this action activate backup or the response chain early? */
    activatesCoordination: boolean;
    /** Does this action preserve the documentation window? */
    preservesDocumentation: boolean;
    /** Optional notes for non-obvious evaluations */
    notes?: string[];
  };
};

// ─── Evaluation Function ───────────────────────────────────────────────────────

/**
 * Evaluates a response option against all five doctrine dimensions.
 *
 * Returns a DecisionDoctrineEvaluation that drives label, outcome, and
 * expert reasoning generation.
 *
 * @param input - The option and its analyst signals
 * @returns A five-dimension doctrine evaluation
 */
export function evaluateDecision(
  input: OptionEvaluationInput
): DecisionDoctrineEvaluation {
  const { signals } = input;

  const exposure_effect: DecisionEffect = signals.reducesExposure
    ? "positive"
    : "negative";

  const control_effect: DecisionEffect = signals.maintainsControl
    ? "positive"
    : "negative";

  const escalation_effect: DecisionEffect = signals.avoidsEscalation
    ? "positive"
    : "negative";

  const coordination_effect: DecisionEffect = signals.activatesCoordination
    ? "positive"
    : "negative";

  const documentation_effect: DecisionEffect = signals.preservesDocumentation
    ? "positive"
    : "negative";

  return {
    exposure_effect,
    control_effect,
    escalation_effect,
    coordination_effect,
    documentation_effect,
    notes: signals.notes,
  };
}

// ─── Evaluation Summary ────────────────────────────────────────────────────────

/**
 * Returns a human-readable summary of the evaluation for debugging and
 * facilitator-facing display.
 */
export function summarizeEvaluation(
  evaluation: DecisionDoctrineEvaluation
): string {
  const dimensions: Array<[keyof DecisionDoctrineEvaluation, string]> = [
    ["exposure_effect", "Exposure"],
    ["control_effect", "Control"],
    ["escalation_effect", "Escalation"],
    ["coordination_effect", "Coordination"],
    ["documentation_effect", "Documentation"],
  ];

  const parts = dimensions
    .filter(([key]) => key !== "notes")
    .map(([key, label]) => {
      const effect = evaluation[key] as DecisionEffect;
      const symbol = effect === "positive" ? "↑" : effect === "negative" ? "↓" : "→";
      return `${label}: ${symbol}`;
    });

  return parts.join(" | ");
}

// ─── Doctrine Score ────────────────────────────────────────────────────────────

/**
 * Computes a numeric doctrine score (0–5) from an evaluation.
 * Used for consequence differentiation: strong (4–5), plausible (2–3), poor (0–1).
 *
 * This score is INTERNAL — it is never shown to participants.
 * It is used to ensure meaningful outcome differentiation across options.
 */
export function doctrineScore(evaluation: DecisionDoctrineEvaluation): number {
  const dimensions: Array<keyof Omit<DecisionDoctrineEvaluation, "notes">> = [
    "exposure_effect",
    "control_effect",
    "escalation_effect",
    "coordination_effect",
    "documentation_effect",
  ];

  return dimensions.reduce((score, key) => {
    const effect = evaluation[key] as DecisionEffect;
    return score + (effect === "positive" ? 1 : 0);
  }, 0);
}

/**
 * Classifies an option's doctrine score into a consequence tier.
 * Used to enforce meaningful differentiation across the three options.
 */
export function consequenceTier(
  score: number
): "strong" | "plausible" | "poor" {
  if (score >= 4) return "strong";
  if (score >= 2) return "plausible";
  return "poor";
}
