/**
 * generateOutcome.ts
 *
 * Generates doctrine-shaped outcome text for response options.
 *
 * Every outcome must reflect doctrine consequences across all five dimensions.
 * Outcomes must NOT be generic — they must clearly reflect what the choice changes.
 *
 * Three mandatory elements in every outcome:
 *   1. How the INDIVIDUAL REACTS — active, not static
 *   2. What CHANGES in the environment or situation
 *   3. What REMAINS UNRESOLVED — even strong actions leave an open question
 *
 * Consequence tiers:
 *   STRONG (score 4–5): subject hesitates/redirects; situation moves toward containment; friction remains
 *   PLAUSIBLE (score 2–3): subject tests boundary or continues; uncertainty window opens; org timeline delayed
 *   POOR (score 0–1): subject escalates/evades; specific org consequence named
 */

import type { DecisionDoctrineEvaluation } from "./decisionDoctrine";
import { doctrineScore, consequenceTier } from "./evaluateDecision";

// ─── Outcome Generation Input ──────────────────────────────────────────────────

export type OutcomeGenerationInput = {
  evaluation: DecisionDoctrineEvaluation;
  /** The action taken (short label) */
  actionLabel: string;
  /** Scenario context hints */
  context?: {
    /** Is backup/security en route? */
    backupEnRoute?: boolean;
    /** Are bystanders present? */
    bystandersPresent?: boolean;
    /** Is the individual currently escalating? */
    subjectEscalating?: boolean;
    /** Has the documentation window already been compromised? */
    documentationCompromised?: boolean;
  };
};

// ─── Outcome Templates ─────────────────────────────────────────────────────────

/**
 * Generates a structured outcome object from a doctrine evaluation.
 *
 * Returns three components that must all appear in the final outcome text:
 *   - subjectReaction: how the individual responds
 *   - situationChange: what changes in the environment
 *   - unresolvedRisk: what remains open or uncertain
 */
export function generateOutcomeComponents(input: OutcomeGenerationInput): {
  subjectReaction: string;
  situationChange: string;
  unresolvedRisk: string;
  tier: "strong" | "plausible" | "poor";
} {
  const { evaluation, context = {} } = input;
  const score = doctrineScore(evaluation);
  const tier = consequenceTier(score);

  // ── Subject Reaction ───────────────────────────────────────────────────────
  let subjectReaction: string;
  if (tier === "strong") {
    if (evaluation.escalation_effect === "positive") {
      subjectReaction = context.subjectEscalating
        ? "The individual hesitates, visibly registering the response, and pauses their advance."
        : "The individual redirects attention, momentarily uncertain about their next move.";
    } else {
      subjectReaction = "The individual continues but at a slower pace, testing whether the response will hold.";
    }
  } else if (tier === "plausible") {
    if (evaluation.escalation_effect === "positive") {
      subjectReaction = "The individual's behavior is unpredictable — they may comply or test the boundary further.";
    } else {
      subjectReaction = "The individual continues to advance, interpreting the response as incomplete or uncertain.";
    }
  } else {
    // poor
    if (context.subjectEscalating) {
      subjectReaction = "The individual escalates — voice rising, physical space narrowing — interpreting the response as a provocation or an opportunity.";
    } else {
      subjectReaction = "The individual evades the response, gaining ground and moving deeper into the space without challenge.";
    }
  }

  // ── Situation Change ───────────────────────────────────────────────────────
  let situationChange: string;
  if (evaluation.coordination_effect === "positive") {
    situationChange = context.backupEnRoute
      ? "Backup is confirmed en route, and the response chain is active."
      : "The response chain has been activated — coordination is in motion, though backup has not yet arrived.";
  } else if (evaluation.control_effect === "positive") {
    situationChange = "Environmental control is partially maintained, but the response is isolated without backup.";
  } else {
    if (evaluation.documentation_effect === "negative") {
      situationChange = "The notification protocol has been bypassed and the documentation window has closed before a formal response is in place.";
    } else {
      situationChange = context.bystandersPresent
        ? "Bystanders are now moving, the environment is destabilizing, and the response chain has not been activated."
        : "The situation has moved faster than the response — the individual has more freedom of movement than before.";
    }
  }

  // ── Unresolved Risk ────────────────────────────────────────────────────────
  let unresolvedRisk: string;
  if (tier === "strong") {
    unresolvedRisk = evaluation.exposure_effect === "positive"
      ? "The situation is not resolved — you have bought time, not certainty. The next 60–90 seconds will determine whether the window holds."
      : "Personal exposure remains elevated. The situation is being managed, not closed.";
  } else if (tier === "plausible") {
    unresolvedRisk = evaluation.coordination_effect === "negative"
      ? "Without backup confirmed, the response depends entirely on the individual's next decision — a single point of failure."
      : "The uncertainty window is open. The individual's next move will determine whether this stabilizes or escalates.";
  } else {
    // poor
    unresolvedRisk = evaluation.documentation_effect === "negative"
      ? "The organization's incident response protocol is now bypassed — no formal notification has been made, and the documentation window has closed."
      : "The response chain has not been activated. This incident is now being managed without organizational support or a defensible record.";
  }

  return { subjectReaction, situationChange, unresolvedRisk, tier };
}

/**
 * Assembles the three outcome components into a single outcome string.
 * The three elements appear in order: subject reaction → situation change → unresolved risk.
 */
export function assembleOutcome(input: OutcomeGenerationInput): string {
  const { subjectReaction, situationChange, unresolvedRisk } =
    generateOutcomeComponents(input);
  return `${subjectReaction} ${situationChange} ${unresolvedRisk}`;
}

// ─── Tradeoff Generation ───────────────────────────────────────────────────────

/**
 * Generates a tradeoff statement from a doctrine evaluation.
 * Format: "Gained [X]; introduced [Y]."
 */
export function generateTradeoff(evaluation: DecisionDoctrineEvaluation): string {
  const gained: string[] = [];
  const introduced: string[] = [];

  if (evaluation.exposure_effect === "positive") {
    gained.push("reduced personal exposure");
  } else {
    introduced.push("elevated personal exposure");
  }

  if (evaluation.control_effect === "positive") {
    gained.push("maintained spatial control");
  } else {
    introduced.push("loss of environmental control");
  }

  if (evaluation.coordination_effect === "positive") {
    gained.push("activated response chain");
  } else {
    introduced.push("isolated response without backup");
  }

  if (evaluation.documentation_effect === "positive") {
    gained.push("preserved documentation window");
  } else {
    introduced.push("documentation window at risk");
  }

  if (evaluation.escalation_effect === "negative") {
    introduced.push("elevated escalation potential");
  }

  const gainedStr = gained.length > 0 ? gained.join(", ") : "no clear gain";
  const introducedStr = introduced.length > 0 ? introduced.join(", ") : "no additional risk introduced";

  return `Gained ${gainedStr}; introduced ${introducedStr}.`;
}

// ─── Outcome Validation ────────────────────────────────────────────────────────

/**
 * Validates that an outcome string contains all three required elements.
 * Used in tests and prompt enforcement.
 */
export function validateOutcome(outcome: string): {
  valid: boolean;
  missing: string[];
} {
  const lowerOutcome = outcome.toLowerCase();
  const missing: string[] = [];

  // Check for active subject reaction
  const subjectReactionWords = [
    "hesitates", "redirects", "evades", "escalates", "complies",
    "tests", "moves", "raises", "steps", "scanning", "noticed",
    "advancing", "confrontational", "agitated", "focused",
    "attention shifts", "shifts", "responds", "reacts", "redirected",
    "unpredictable", "triggers", "loses", "pauses", "continues",
    "interpreting", "gaining",
  ];
  const hasSubjectReaction = subjectReactionWords.some((w) => lowerOutcome.includes(w));
  if (!hasSubjectReaction) missing.push("active subject reaction");

  // Check for situation change
  const situationChangeWords = [
    "response chain", "backup", "en route", "activated", "notification",
    "bystander", "environment", "control", "protocol", "documentation",
    "window", "chain", "support", "coordination",
  ];
  const hasSituationChange = situationChangeWords.some((w) => lowerOutcome.includes(w));
  if (!hasSituationChange) missing.push("situation change");

  // Check for unresolved risk (friction)
  const unresolvedRiskWords = [
    "not resolved", "not yet", "uncertainty", "still", "window",
    "managing", "depends", "certainty", "determine", "single point",
    "bypassed", "closed", "without", "faster than",
  ];
  const hasUnresolvedRisk = unresolvedRiskWords.some((w) => lowerOutcome.includes(w));
  if (!hasUnresolvedRisk) missing.push("unresolved risk / friction");

  return { valid: missing.length === 0, missing };
}
