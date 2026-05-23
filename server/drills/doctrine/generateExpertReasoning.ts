/**
 * generateExpertReasoning.ts
 *
 * Generates expert reasoning for response options.
 *
 * Expert reasoning must:
 *   - Explicitly reference doctrine dimensions (even if names are not shown to end users)
 *   - Be written as situational decision analysis, NOT policy summary
 *   - Avoid absolute tone words: "ideal", "perfect", "the correct"
 *   - Frame poor choices as understandable but consequential
 *   - Reflect the specific tradeoffs of the option, not generic safety advice
 *
 * Examples of doctrine-referenced reasoning:
 *   "This option preserves distance and activates coordination, but sacrifices immediate control."
 *   "This option restores control quickly, but increases personal exposure and escalation potential."
 *   "This option delays intervention, allowing the individual to gain ground and reducing visibility."
 */

import type { DecisionDoctrineEvaluation } from "./decisionDoctrine";
import { doctrineScore, consequenceTier } from "./evaluateDecision";

// ─── Reasoning Generation Input ───────────────────────────────────────────────

export type ReasoningGenerationInput = {
  evaluation: DecisionDoctrineEvaluation;
  actionLabel: string;
  context?: {
    /** Is this a role where physical intervention is appropriate? */
    physicalInterventionRole?: boolean;
    /** Is backup available or en route? */
    backupAvailable?: boolean;
    /** Is the individual showing behavioral escalation signals? */
    subjectEscalating?: boolean;
  };
};

// ─── Reasoning Templates ───────────────────────────────────────────────────────

/**
 * Generates expert reasoning from a doctrine evaluation.
 *
 * The reasoning explicitly names the doctrine tradeoffs in plain language,
 * without using the doctrine principle names directly.
 *
 * Returns 1–2 sentences of situational decision analysis.
 */
export function generateExpertReasoning(
  input: ReasoningGenerationInput
): string {
  const { evaluation, context = {} } = input;
  const score = doctrineScore(evaluation);
  const tier = consequenceTier(score);

  const parts: string[] = [];

  // ── Opening: what this option does well (or why it's understandable) ──────
  if (tier === "strong") {
    if (evaluation.exposure_effect === "positive" && evaluation.coordination_effect === "positive") {
      parts.push(
        "This option preserves distance and activates the response chain — effective in this context because it reduces direct exposure while keeping organizational support engaged."
      );
    } else if (evaluation.control_effect === "positive" && evaluation.coordination_effect === "positive") {
      parts.push(
        "This option maintains environmental control and activates coordination — a strong option given current conditions because it addresses both the immediate situation and the response chain."
      );
    } else if (evaluation.exposure_effect === "positive") {
      parts.push(
        "This option reduces personal exposure and creates time — appropriate given the information available, though it sacrifices some immediate control."
      );
    } else {
      parts.push(
        "This option is effective in this context, though it introduces personal exposure in exchange for faster situational control."
      );
    }
  } else if (tier === "plausible") {
    if (evaluation.escalation_effect === "positive") {
      parts.push(
        "This is a plausible response under stress — it attempts to manage the situation directly, but without activating the response chain, it creates a single point of failure."
      );
    } else {
      parts.push(
        "This response is understandable given the pressure of the moment, but it delays coordination and opens an uncertainty window that the individual may exploit."
      );
    }
  } else {
    // poor
    parts.push(
      "This is a natural instinct, but it introduces direct personal risk and bypasses the organizational response chain — leaving the incident without a defensible record or formal backup."
    );
  }

  // ── Closing: the specific doctrine tradeoff ────────────────────────────────
  const tradeoffs: string[] = [];

  if (evaluation.exposure_effect === "negative") {
    tradeoffs.push("increases personal exposure");
  }
  if (evaluation.control_effect === "negative") {
    tradeoffs.push("sacrifices environmental control");
  }
  if (evaluation.escalation_effect === "negative") {
    tradeoffs.push(
      context.subjectEscalating
        ? "accelerates escalation with an already-agitated individual"
        : "elevates escalation potential"
    );
  }
  if (evaluation.coordination_effect === "negative") {
    tradeoffs.push(
      context.backupAvailable
        ? "delays backup engagement despite support being available"
        : "isolates the response without backup"
    );
  }
  if (evaluation.documentation_effect === "negative") {
    tradeoffs.push("closes the documentation window before a formal record is established");
  }

  if (tradeoffs.length > 0 && tier !== "poor") {
    // For strong/plausible, add the tradeoff as a qualifying clause
    const tradeoffStr = tradeoffs.slice(0, 2).join(" and ");
    parts.push(`The tradeoff: it ${tradeoffStr}.`);
  } else if (tier === "poor" && tradeoffs.length > 0) {
    const tradeoffStr = tradeoffs.slice(0, 2).join(" and ");
    parts.push(`This choice ${tradeoffStr} — consequential even if the intent was protective.`);
  }

  return parts.join(" ");
}

// ─── Tone Validation ───────────────────────────────────────────────────────────

/**
 * Forbidden tone patterns in expert reasoning.
 * Reasoning must be situational analysis, not policy summary or absolute judgment.
 */
export const FORBIDDEN_REASONING_PATTERNS = [
  /\bideal\b/i,
  /\bperfect\b/i,
  /\bthe correct\b/i,
  /\bbest answer\b/i,
  /\bwrong answer\b/i,
  /\balways do\b/i,
  /\bnever do\b/i,
  /\byou should always\b/i,
  /\bpolicy requires\b/i,
  /\bthe rule is\b/i,
];

/**
 * Validates that expert reasoning does not use forbidden tone patterns.
 */
export function isValidReasoning(reasoning: string): boolean {
  return !FORBIDDEN_REASONING_PATTERNS.some((pattern) => pattern.test(reasoning));
}

/**
 * Validates that expert reasoning references at least one doctrine dimension
 * in plain language (without using the technical principle names).
 */
export function reasoningReferencesDoctrine(reasoning: string): boolean {
  const doctrineSignals = [
    "exposure", "control", "escalat", "coordination", "documentation",
    "backup", "response chain", "distance", "space", "record",
    "notification", "support", "protocol", "window", "defensible",
    "visibility", "ground", "intervention", "isolated", "chain",
  ];
  const lower = reasoning.toLowerCase();
  return doctrineSignals.some((signal) => lower.includes(signal));
}
