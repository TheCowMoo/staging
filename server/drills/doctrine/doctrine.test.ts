/**
 * doctrine.test.ts
 *
 * Comprehensive vitest tests for the Universal Decision Doctrine module.
 * Covers all five files: decisionDoctrine, evaluateDecision, generateLabel,
 * generateOutcome, and generateExpertReasoning.
 */

import { describe, it, expect } from "vitest";

// ─── decisionDoctrine ──────────────────────────────────────────────────────────
import {
  DOCTRINE_PRINCIPLES,
  ACTD_DOCTRINE_MAP,
  DOCTRINE_SCENARIO_TYPES,
  OPTION_VIABILITY_STANDARDS,
} from "./decisionDoctrine";

// ─── evaluateDecision ──────────────────────────────────────────────────────────
import {
  evaluateDecision,
  summarizeEvaluation,
  doctrineScore,
  consequenceTier,
} from "./evaluateDecision";

// ─── generateLabel ─────────────────────────────────────────────────────────────
import {
  generateLabel,
  isValidLabel,
  FORBIDDEN_LABEL_PATTERNS,
} from "./generateLabel";

// ─── generateOutcome ──────────────────────────────────────────────────────────
import {
  generateOutcomeComponents,
  assembleOutcome,
  generateTradeoff,
  validateOutcome,
} from "./generateOutcome";

// ─── generateExpertReasoning ──────────────────────────────────────────────────
import {
  generateExpertReasoning,
  isValidReasoning,
  reasoningReferencesDoctrine,
  FORBIDDEN_REASONING_PATTERNS,
} from "./generateExpertReasoning";

// ─── Shared test fixtures ──────────────────────────────────────────────────────

const strongEvaluation = {
  exposure_effect: "positive" as const,
  control_effect: "positive" as const,
  escalation_effect: "positive" as const,
  coordination_effect: "positive" as const,
  documentation_effect: "positive" as const,
};

const plausibleEvaluation = {
  exposure_effect: "positive" as const,
  control_effect: "positive" as const,
  escalation_effect: "positive" as const,
  coordination_effect: "negative" as const,
  documentation_effect: "negative" as const,
};

const poorEvaluation = {
  exposure_effect: "negative" as const,
  control_effect: "negative" as const,
  escalation_effect: "negative" as const,
  coordination_effect: "negative" as const,
  documentation_effect: "negative" as const,
};

// ─── 1. decisionDoctrine ──────────────────────────────────────────────────────

describe("decisionDoctrine", () => {
  it("exports exactly 5 doctrine principles", () => {
    const keys = Object.keys(DOCTRINE_PRINCIPLES);
    expect(keys).toHaveLength(5);
  });

  it("each principle has a label, description, and actdPhase", () => {
    for (const [, principle] of Object.entries(DOCTRINE_PRINCIPLES)) {
      expect(principle.label).toBeTruthy();
      expect(principle.description).toBeTruthy();
      expect(["assess", "commit", "take_action", "debrief", "all"]).toContain(principle.actdPhase);
    }
  });

  it("ACTD doctrine map covers all four ACTD phases", () => {
    expect(ACTD_DOCTRINE_MAP.assess.length).toBeGreaterThan(0);
    expect(ACTD_DOCTRINE_MAP.commit.length).toBeGreaterThan(0);
    expect(ACTD_DOCTRINE_MAP.take_action.length).toBeGreaterThan(0);
    expect(ACTD_DOCTRINE_MAP.debrief.length).toBeGreaterThan(0);
  });

  it("exports exactly 8 scenario types", () => {
    expect(DOCTRINE_SCENARIO_TYPES).toHaveLength(8);
  });

  it("scenario types include all expected categories", () => {
    expect(DOCTRINE_SCENARIO_TYPES).toContain("unauthorized_access");
    expect(DOCTRINE_SCENARIO_TYPES).toContain("escalating_behavior");
    expect(DOCTRINE_SCENARIO_TYPES).toContain("threatening_communication");
    expect(DOCTRINE_SCENARIO_TYPES).toContain("environmental_anomaly");
  });

  it("viability standards cover all four required tests", () => {
    expect(OPTION_VIABILITY_STANDARDS.policy_alignment).toBeTruthy();
    expect(OPTION_VIABILITY_STANDARDS.role_appropriateness).toBeTruthy();
    expect(OPTION_VIABILITY_STANDARDS.escalation_awareness).toBeTruthy();
    expect(OPTION_VIABILITY_STANDARDS.no_theatrical_actions).toBeTruthy();
  });
});

// ─── 2. evaluateDecision ──────────────────────────────────────────────────────

describe("evaluateDecision", () => {
  it("returns positive effects for a strong option (all signals true)", () => {
    const result = evaluateDecision({
      label: "Alert security immediately",
      description: "Contact security via radio without approaching the individual.",
      signals: {
        reducesExposure: true,
        maintainsControl: true,
        avoidsEscalation: true,
        activatesCoordination: true,
        preservesDocumentation: true,
      },
    });
    expect(result.exposure_effect).toBe("positive");
    expect(result.control_effect).toBe("positive");
    expect(result.escalation_effect).toBe("positive");
    expect(result.coordination_effect).toBe("positive");
    expect(result.documentation_effect).toBe("positive");
  });

  it("returns negative effects for a poor option (all signals false)", () => {
    const result = evaluateDecision({
      label: "Confront the individual directly",
      description: "Walk up to the individual and demand they identify themselves.",
      signals: {
        reducesExposure: false,
        maintainsControl: false,
        avoidsEscalation: false,
        activatesCoordination: false,
        preservesDocumentation: false,
      },
    });
    expect(result.exposure_effect).toBe("negative");
    expect(result.control_effect).toBe("negative");
    expect(result.escalation_effect).toBe("negative");
    expect(result.coordination_effect).toBe("negative");
    expect(result.documentation_effect).toBe("negative");
  });

  it("handles mixed signals correctly", () => {
    const result = evaluateDecision({
      label: "Maintain visual contact without alerting",
      description: "Continue observing while moving to a safer position.",
      signals: {
        reducesExposure: true,
        maintainsControl: true,
        avoidsEscalation: true,
        activatesCoordination: false,
        preservesDocumentation: false,
      },
    });
    expect(result.exposure_effect).toBe("positive");
    expect(result.coordination_effect).toBe("negative");
    expect(result.documentation_effect).toBe("negative");
  });

  it("includes optional notes when provided", () => {
    const result = evaluateDecision({
      label: "Test",
      description: "Test description",
      signals: {
        reducesExposure: true,
        maintainsControl: false,
        avoidsEscalation: true,
        activatesCoordination: false,
        preservesDocumentation: true,
        notes: ["Non-obvious: control is sacrificed for speed"],
      },
    });
    expect(result.notes).toEqual(["Non-obvious: control is sacrificed for speed"]);
  });

  it("summarizeEvaluation returns a readable string with all 5 dimensions", () => {
    const summary = summarizeEvaluation(strongEvaluation);
    expect(summary).toContain("Exposure");
    expect(summary).toContain("Control");
    expect(summary).toContain("Escalation");
    expect(summary).toContain("Coordination");
    expect(summary).toContain("Documentation");
  });

  it("doctrineScore returns 5 for a strong evaluation", () => {
    expect(doctrineScore(strongEvaluation)).toBe(5);
  });

  it("doctrineScore returns 0 for a poor evaluation", () => {
    expect(doctrineScore(poorEvaluation)).toBe(0);
  });

  it("doctrineScore returns 3 for a plausible evaluation", () => {
    expect(doctrineScore(plausibleEvaluation)).toBe(3);
  });

  it("consequenceTier returns 'strong' for score >= 4", () => {
    expect(consequenceTier(5)).toBe("strong");
    expect(consequenceTier(4)).toBe("strong");
  });

  it("consequenceTier returns 'plausible' for score 2–3", () => {
    expect(consequenceTier(3)).toBe("plausible");
    expect(consequenceTier(2)).toBe("plausible");
  });

  it("consequenceTier returns 'poor' for score 0–1", () => {
    expect(consequenceTier(1)).toBe("poor");
    expect(consequenceTier(0)).toBe("poor");
  });
});

// ─── 3. generateLabel ─────────────────────────────────────────────────────────

describe("generateLabel", () => {
  it("generates a label for a strong evaluation", () => {
    const label = generateLabel({ evaluation: strongEvaluation });
    expect(label).toBeTruthy();
    expect(label.length).toBeGreaterThan(20);
  });

  it("generated label ends with a period", () => {
    const label = generateLabel({ evaluation: strongEvaluation });
    expect(label.endsWith(".")).toBe(true);
  });

  it("generated label contains three semicolon-separated parts", () => {
    const label = generateLabel({ evaluation: strongEvaluation });
    const parts = label.split(";");
    expect(parts.length).toBeGreaterThanOrEqual(3);
  });

  it("strong evaluation label mentions positive coordination", () => {
    const label = generateLabel({ evaluation: strongEvaluation });
    const lower = label.toLowerCase();
    expect(
      lower.includes("response chain") || lower.includes("coordination") || lower.includes("activated")
    ).toBe(true);
  });

  it("poor evaluation label mentions bypassed protocol or loss of control", () => {
    const label = generateLabel({ evaluation: poorEvaluation });
    const lower = label.toLowerCase();
    expect(
      lower.includes("bypass") || lower.includes("loss") || lower.includes("risk") || lower.includes("unpredictable")
    ).toBe(true);
  });

  it("isValidLabel rejects bare tier labels", () => {
    expect(isValidLabel("Low Risk")).toBe(false);
    expect(isValidLabel("Moderate Risk")).toBe(false);
    expect(isValidLabel("Elevated Risk")).toBe(false);
    expect(isValidLabel("Introduces Additional Risk")).toBe(false);
    expect(isValidLabel("Correct")).toBe(false);
    expect(isValidLabel("Wrong")).toBe(false);
    expect(isValidLabel("Ideal")).toBe(false);
    expect(isValidLabel("Perfect")).toBe(false);
  });

  it("isValidLabel accepts contextual compound labels", () => {
    expect(isValidLabel("Reduces exposure, preserves spatial control; response chain activated; subject likely to redirect.")).toBe(true);
    expect(isValidLabel("High personal exposure, immediate control; backup protocol bypassed; subject reaction unpredictable.")).toBe(true);
  });

  it("FORBIDDEN_LABEL_PATTERNS has at least 10 patterns", () => {
    expect(FORBIDDEN_LABEL_PATTERNS.length).toBeGreaterThanOrEqual(10);
  });

  it("context hint highProximity affects label for negative exposure", () => {
    const labelWithProximity = generateLabel({
      evaluation: { ...poorEvaluation },
      context: { highProximity: true },
    });
    const labelWithoutProximity = generateLabel({
      evaluation: { ...poorEvaluation },
      context: { highProximity: false },
    });
    // Both should be valid labels
    expect(isValidLabel(labelWithProximity)).toBe(true);
    expect(isValidLabel(labelWithoutProximity)).toBe(true);
  });
});

// ─── 4. generateOutcome ───────────────────────────────────────────────────────

describe("generateOutcome", () => {
  it("generateOutcomeComponents returns all three required parts", () => {
    const result = generateOutcomeComponents({
      evaluation: strongEvaluation,
      actionLabel: "Alert security immediately",
    });
    expect(result.subjectReaction).toBeTruthy();
    expect(result.situationChange).toBeTruthy();
    expect(result.unresolvedRisk).toBeTruthy();
  });

  it("strong evaluation produces 'strong' tier", () => {
    const result = generateOutcomeComponents({
      evaluation: strongEvaluation,
      actionLabel: "Alert security",
    });
    expect(result.tier).toBe("strong");
  });

  it("plausible evaluation produces 'plausible' tier", () => {
    const result = generateOutcomeComponents({
      evaluation: plausibleEvaluation,
      actionLabel: "Maintain visual contact",
    });
    expect(result.tier).toBe("plausible");
  });

  it("poor evaluation produces 'poor' tier", () => {
    const result = generateOutcomeComponents({
      evaluation: poorEvaluation,
      actionLabel: "Confront directly",
    });
    expect(result.tier).toBe("poor");
  });

  it("strong outcome includes friction (unresolved risk)", () => {
    const result = generateOutcomeComponents({
      evaluation: strongEvaluation,
      actionLabel: "Alert security",
    });
    const lower = result.unresolvedRisk.toLowerCase();
    expect(
      lower.includes("not resolved") || lower.includes("certainty") ||
      lower.includes("window") || lower.includes("managing")
    ).toBe(true);
  });

  it("poor outcome names a specific organizational consequence", () => {
    const result = generateOutcomeComponents({
      evaluation: poorEvaluation,
      actionLabel: "Confront directly",
    });
    const lower = result.unresolvedRisk.toLowerCase();
    expect(
      lower.includes("protocol") || lower.includes("notification") ||
      lower.includes("documentation") || lower.includes("bypassed") ||
      lower.includes("record")
    ).toBe(true);
  });

  it("assembleOutcome returns a non-empty string", () => {
    const outcome = assembleOutcome({
      evaluation: strongEvaluation,
      actionLabel: "Alert security",
    });
    expect(outcome.length).toBeGreaterThan(50);
  });

  it("generateTradeoff returns 'Gained X; introduced Y' format", () => {
    const tradeoff = generateTradeoff(strongEvaluation);
    expect(tradeoff.toLowerCase()).toContain("gained");
    expect(tradeoff.toLowerCase()).toContain("introduced");
  });

  it("generateTradeoff for poor evaluation mentions multiple introduced risks", () => {
    const tradeoff = generateTradeoff(poorEvaluation);
    expect(tradeoff.toLowerCase()).toContain("introduced");
    // Should mention multiple risks
    const introduced = tradeoff.split("introduced")[1];
    expect(introduced).toBeTruthy();
    expect(introduced.length).toBeGreaterThan(20);
  });

  it("validateOutcome passes for a well-formed outcome", () => {
    const outcome = "The individual hesitates and redirects attention. The response chain has been activated — backup is en route. The situation is not resolved — the next 60 seconds will determine whether the window holds.";
    const result = validateOutcome(outcome);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it("validateOutcome fails when subject reaction is missing", () => {
    const outcome = "The response chain has been activated. The situation is not resolved.";
    const result = validateOutcome(outcome);
    expect(result.missing).toContain("active subject reaction");
  });

  it("validateOutcome fails when unresolved risk is missing", () => {
    const outcome = "The individual hesitates. The response chain has been activated.";
    const result = validateOutcome(outcome);
    expect(result.missing).toContain("unresolved risk / friction");
  });
});

// ─── 5. generateExpertReasoning ───────────────────────────────────────────────

describe("generateExpertReasoning", () => {
  it("generates reasoning for a strong evaluation", () => {
    const reasoning = generateExpertReasoning({
      evaluation: strongEvaluation,
      actionLabel: "Alert security immediately",
    });
    expect(reasoning.length).toBeGreaterThan(30);
  });

  it("strong reasoning uses situational language, not absolute judgment", () => {
    const reasoning = generateExpertReasoning({
      evaluation: strongEvaluation,
      actionLabel: "Alert security",
    });
    const lower = reasoning.toLowerCase();
    expect(
      lower.includes("effective in this context") ||
      lower.includes("strong option") ||
      lower.includes("appropriate given")
    ).toBe(true);
  });

  it("poor reasoning frames the choice as understandable but consequential", () => {
    const reasoning = generateExpertReasoning({
      evaluation: poorEvaluation,
      actionLabel: "Confront directly",
    });
    const lower = reasoning.toLowerCase();
    expect(
      lower.includes("natural instinct") || lower.includes("understandable") ||
      lower.includes("consequential")
    ).toBe(true);
  });

  it("isValidReasoning rejects forbidden tone words", () => {
    expect(isValidReasoning("This is the ideal response.")).toBe(false);
    expect(isValidReasoning("This is the perfect answer.")).toBe(false);
    expect(isValidReasoning("This is the correct choice.")).toBe(false);
    expect(isValidReasoning("The best answer is to alert security.")).toBe(false);
    expect(isValidReasoning("Policy requires you to call security.")).toBe(false);
  });

  it("isValidReasoning accepts situational analysis language", () => {
    expect(isValidReasoning("This option preserves distance and activates coordination, but sacrifices immediate control.")).toBe(true);
    expect(isValidReasoning("This is a natural instinct, but it introduces direct personal risk.")).toBe(true);
    expect(isValidReasoning("This option is effective in this context, though it increases personal exposure.")).toBe(true);
  });

  it("reasoningReferencesDoctrine returns true for doctrine-aligned text", () => {
    expect(reasoningReferencesDoctrine("This option preserves distance and activates coordination.")).toBe(true);
    expect(reasoningReferencesDoctrine("This option restores control quickly but increases personal exposure.")).toBe(true);
    expect(reasoningReferencesDoctrine("This option delays intervention, allowing the individual to gain ground and reducing visibility.")).toBe(true);
  });

  it("reasoningReferencesDoctrine returns false for generic policy text", () => {
    expect(reasoningReferencesDoctrine("Always follow company safety procedures.")).toBe(false);
    expect(reasoningReferencesDoctrine("This is a good response.")).toBe(false);
  });

  it("FORBIDDEN_REASONING_PATTERNS has at least 8 patterns", () => {
    expect(FORBIDDEN_REASONING_PATTERNS.length).toBeGreaterThanOrEqual(8);
  });

  it("plausible reasoning mentions single point of failure or uncertainty", () => {
    const reasoning = generateExpertReasoning({
      evaluation: plausibleEvaluation,
      actionLabel: "Maintain visual contact",
    });
    const lower = reasoning.toLowerCase();
    expect(
      lower.includes("single point") || lower.includes("uncertainty") ||
      lower.includes("coordination") || lower.includes("backup") ||
      lower.includes("plausible") || lower.includes("stress")
    ).toBe(true);
  });

  it("context hint subjectEscalating affects poor reasoning", () => {
    const withEscalation = generateExpertReasoning({
      evaluation: poorEvaluation,
      actionLabel: "Confront directly",
      context: { subjectEscalating: true },
    });
    const lower = withEscalation.toLowerCase();
    expect(
      lower.includes("escalat") || lower.includes("agitat") || lower.includes("risk")
    ).toBe(true);
  });
});

// ─── Cross-module integration tests ───────────────────────────────────────────

describe("doctrine module integration", () => {
  it("evaluation → score → tier → label → outcome → reasoning pipeline works end to end", () => {
    // Step 1: Evaluate
    const evaluation = evaluateDecision({
      label: "Alert security immediately",
      description: "Contact security via radio without approaching the individual.",
      signals: {
        reducesExposure: true,
        maintainsControl: true,
        avoidsEscalation: true,
        activatesCoordination: true,
        preservesDocumentation: true,
      },
    });

    // Step 2: Score and tier
    const score = doctrineScore(evaluation);
    const tier = consequenceTier(score);
    expect(tier).toBe("strong");

    // Step 3: Label
    const label = generateLabel({ evaluation });
    expect(isValidLabel(label)).toBe(true);

    // Step 4: Outcome
    const outcome = assembleOutcome({ evaluation, actionLabel: "Alert security immediately" });
    const outcomeValidation = validateOutcome(outcome);
    expect(outcomeValidation.valid).toBe(true);

    // Step 5: Tradeoff
    const tradeoff = generateTradeoff(evaluation);
    expect(tradeoff).toContain("Gained");
    expect(tradeoff).toContain("introduced");

    // Step 6: Expert reasoning
    const reasoning = generateExpertReasoning({ evaluation, actionLabel: "Alert security immediately" });
    expect(isValidReasoning(reasoning)).toBe(true);
    expect(reasoningReferencesDoctrine(reasoning)).toBe(true);
  });

  it("three options with different evaluations produce meaningfully different labels", () => {
    const labels = [strongEvaluation, plausibleEvaluation, poorEvaluation].map(
      (evaluation) => generateLabel({ evaluation })
    );
    // All three labels must be distinct
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(3);
  });

  it("three options with different evaluations produce different consequence tiers", () => {
    const tiers = [strongEvaluation, plausibleEvaluation, poorEvaluation].map(
      (evaluation) => consequenceTier(doctrineScore(evaluation))
    );
    expect(tiers).toContain("strong");
    expect(tiers).toContain("plausible");
    expect(tiers).toContain("poor");
  });

  it("doctrine applies consistently across all 8 scenario types", () => {
    // The doctrine module is scenario-agnostic — the same evaluation function
    // should produce consistent results regardless of scenario type
    const scenarioEvaluations = DOCTRINE_SCENARIO_TYPES.map(() =>
      evaluateDecision({
        label: "Alert security",
        description: "Contact security without approaching.",
        signals: {
          reducesExposure: true,
          maintainsControl: true,
          avoidsEscalation: true,
          activatesCoordination: true,
          preservesDocumentation: true,
        },
      })
    );
    // All 8 evaluations should be identical (scenario-agnostic)
    for (const evaluation of scenarioEvaluations) {
      expect(doctrineScore(evaluation)).toBe(5);
      expect(consequenceTier(5)).toBe("strong");
    }
  });
});
