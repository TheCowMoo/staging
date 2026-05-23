/**
 * generateLabel.ts
 *
 * Generates contextual, doctrine-derived risk labels for response options.
 *
 * Labels must NEVER be simplistic ("correct", "wrong", "best answer", "Low Risk").
 * They must be derived from the doctrine evaluation object and reflect:
 *   a) Personal risk to the participant
 *   b) Organizational/system risk (notification chain, documentation, access)
 *   c) Behavioral reaction of the individual
 *
 * Labels are HIDDEN from participants until after selection.
 */

import type { DecisionDoctrineEvaluation } from "./decisionDoctrine";
import { doctrineScore, consequenceTier } from "./evaluateDecision";

// ─── Label Generation ──────────────────────────────────────────────────────────

export type LabelGenerationInput = {
  evaluation: DecisionDoctrineEvaluation;
  /**
   * Optional context hints to make the label more specific.
   * These are derived from the scenario and option description.
   */
  context?: {
    /** Is the participant in close proximity to the individual? */
    highProximity?: boolean;
    /** Has the response chain been activated? */
    coordinationActive?: boolean;
    /** Are bystanders present and at risk? */
    bystandersPresent?: boolean;
    /** Is the individual showing active behavioral escalation? */
    subjectEscalating?: boolean;
  };
};

/**
 * Generates a contextual risk label from a doctrine evaluation.
 *
 * The label is a compound phrase that names the tradeoff explicitly —
 * what is gained and what is introduced — derived from the five dimensions.
 *
 * Format: "[personal/exposure implication]; [org/system implication]; subject likely to [behavioral reaction]."
 *
 * Examples:
 *   "Maintains distance, delays containment; notification chain intact; subject may redirect attention."
 *   "Immediate control, high personal exposure; bypasses backup protocol; subject reaction unpredictable."
 *   "Delayed coordination, increased loss of visibility; documentation window narrows; subject gains ground."
 */
export function generateLabel(input: LabelGenerationInput): string {
  const { evaluation, context = {} } = input;
  const score = doctrineScore(evaluation);
  const tier = consequenceTier(score);

  // ── Part 1: Personal / Exposure implication ────────────────────────────────
  let personalPart: string;
  if (evaluation.exposure_effect === "positive" && evaluation.control_effect === "positive") {
    personalPart = "Reduces exposure, preserves spatial control";
  } else if (evaluation.exposure_effect === "positive" && evaluation.control_effect === "negative") {
    personalPart = "Reduces personal exposure, sacrifices environmental control";
  } else if (evaluation.exposure_effect === "negative" && evaluation.control_effect === "positive") {
    personalPart = context.highProximity
      ? "High personal exposure, immediate control"
      : "Elevated personal exposure, control partially maintained";
  } else {
    // both negative
    personalPart = context.highProximity
      ? "High personal exposure, loss of positional control"
      : "Increased exposure, reduced control of space";
  }

  // ── Part 2: Organizational / System implication ────────────────────────────
  let orgPart: string;
  if (evaluation.coordination_effect === "positive" && evaluation.documentation_effect === "positive") {
    orgPart = "response chain activated, documentation window preserved";
  } else if (evaluation.coordination_effect === "positive" && evaluation.documentation_effect === "negative") {
    orgPart = "response chain activated, documentation window narrows";
  } else if (evaluation.coordination_effect === "negative" && evaluation.documentation_effect === "positive") {
    orgPart = "isolated response, documentation intact but backup delayed";
  } else {
    // both negative
    orgPart = "backup protocol bypassed, documentation window at risk";
  }

  // ── Part 3: Subject behavioral reaction ────────────────────────────────────
  let subjectPart: string;
  if (evaluation.escalation_effect === "positive") {
    if (tier === "strong") {
      subjectPart = context.subjectEscalating
        ? "subject may hesitate or redirect under pressure"
        : "subject likely to redirect or comply";
    } else {
      subjectPart = "subject reaction uncertain but de-escalation possible";
    }
  } else {
    // escalation_effect negative
    if (context.subjectEscalating) {
      subjectPart = "subject likely to escalate or evade";
    } else {
      subjectPart = "subject reaction unpredictable, escalation risk elevated";
    }
  }

  return `${personalPart}; ${orgPart}; ${subjectPart}.`;
}

// ─── Forbidden Label Patterns ──────────────────────────────────────────────────

/**
 * Patterns that must NEVER appear in a generated label.
 * Used for validation in tests and prompt enforcement.
 */
export const FORBIDDEN_LABEL_PATTERNS = [
  /^correct$/i,
  /^wrong$/i,
  /^best answer$/i,
  /^low risk$/i,
  /^moderate risk$/i,
  /^elevated risk$/i,
  /^introduces additional risk$/i,
  /^safe$/i,
  /^no risk$/i,
  /^zero risk$/i,
  /^completely safe$/i,
  /^ideal$/i,
  /^perfect$/i,
];

/**
 * Validates that a label does not contain any forbidden patterns.
 * Returns true if the label is valid.
 */
export function isValidLabel(label: string): boolean {
  return !FORBIDDEN_LABEL_PATTERNS.some((pattern) => pattern.test(label.trim()));
}
