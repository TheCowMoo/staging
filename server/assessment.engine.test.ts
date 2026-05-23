/**
 * assessment.engine.test.ts
 * Tests for shared/assessmentEngine.ts (v3 — liability-first engine)
 */
import { describe, it, expect } from "vitest";
import {
  runAssessment,
  classify,
  getRiskMap,
  QUESTIONS,
  CATEGORY_LABELS,
  SAMPLE_RESPONSES_DEFENSIBLE,
  SAMPLE_RESPONSES_MODERATE,
  SAMPLE_RESPONSES_HIGH_EXPOSURE,
  type AnswerValue,
  type CategoryKey,
} from "../shared/assessmentEngine";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function allAnswers(value: AnswerValue): Record<string, AnswerValue> {
  return Object.fromEntries(QUESTIONS.map((q) => [q.id, value]));
}

// ─── QUESTIONS array ──────────────────────────────────────────────────────────

describe("QUESTIONS array", () => {
  it("has at least 15 questions", () => expect(QUESTIONS.length).toBeGreaterThanOrEqual(15));

  it("every question has required fields", () => {
    for (const q of QUESTIONS) {
      expect(q.id).toBeTruthy();
      expect(q.text).toBeTruthy();
      expect(q.category).toBeTruthy();
      expect(typeof q.weight).toBe("number");
      expect(q.weight).toBeGreaterThan(0);
    }
  });

  it("question IDs are unique", () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all questions have valid category keys", () => {
    const validCategories: CategoryKey[] = [
      "planning_documentation",
      "training_awareness",
      "reporting_communication",
      "response_readiness",
      "critical_risk_factors",
    ];
    for (const q of QUESTIONS) {
      expect(validCategories).toContain(q.category);
    }
  });
});

// ─── CATEGORY_LABELS ──────────────────────────────────────────────────────────

describe("CATEGORY_LABELS", () => {
  it("has labels for all 5 categories", () => {
    const keys: CategoryKey[] = [
      "planning_documentation",
      "training_awareness",
      "reporting_communication",
      "response_readiness",
      "critical_risk_factors",
    ];
    for (const k of keys) {
      expect(CATEGORY_LABELS[k]).toBeTruthy();
    }
  });
});

// ─── classify ─────────────────────────────────────────────────────────────────

describe("classify()", () => {
  // Bands: 0–29 Severe | 30–54 High | 55–79 Moderate | 80–100 Defensible
  it("returns Defensible Position for score 80-100", () => {
    expect(classify(100)).toBe("Defensible Position");
    expect(classify(80)).toBe("Defensible Position");
  });
  it("returns Moderate Exposure for score 55-79", () => {
    expect(classify(79)).toBe("Moderate Exposure");
    expect(classify(55)).toBe("Moderate Exposure");
  });
  it("returns High Exposure for score 30-54", () => {
    expect(classify(54)).toBe("High Exposure");
    expect(classify(30)).toBe("High Exposure");
  });
  it("returns Severe Exposure for score 0-29", () => {
    expect(classify(29)).toBe("Severe Exposure");
    expect(classify(0)).toBe("Severe Exposure");
  });
});

// ─── getRiskMap ───────────────────────────────────────────────────────────────

describe("getRiskMap()", () => {
  it("returns green for Defensible Position", () => {
    expect(getRiskMap("Defensible Position").color).toBe("green");
  });
  it("returns yellow for Moderate Exposure", () => {
    expect(getRiskMap("Moderate Exposure").color).toBe("yellow");
  });
  it("returns orange for High Exposure", () => {
    expect(getRiskMap("High Exposure").color).toBe("orange");
  });
  it("returns red for Severe Exposure", () => {
    expect(getRiskMap("Severe Exposure").color).toBe("red");
  });
  it("every risk map has a descriptor", () => {
    for (const label of ["Defensible Position", "Moderate Exposure", "High Exposure", "Severe Exposure"] as const) {
      expect(getRiskMap(label).descriptor).toBeTruthy();
    }
  });
});

// ─── runAssessment — all yes (Defensible) ─────────────────────────────────────

describe("runAssessment — all yes (Defensible)", () => {
  const result = runAssessment(SAMPLE_RESPONSES_DEFENSIBLE, "Healthcare", "Ontario");

  it("returns score of 100", () => expect(result.score).toBe(100));
  it("classifies as Defensible Position", () => expect(result.classification).toBe("Defensible Position"));
  it("riskMap color is green", () => expect(result.riskMap.color).toBe("green"));
  it("has no top gaps", () => expect(result.topGaps).toHaveLength(0));
  it("has categoryScores object", () => {
    expect(typeof result.categoryScores.planningDocumentation).toBe("number");
    expect(typeof result.categoryScores.trainingAwareness).toBe("number");
    expect(typeof result.categoryScores.reportingCommunication).toBe("number");
    expect(typeof result.categoryScores.responseReadiness).toBe("number");
  });
  it("all category scores are 100", () => {
    expect(result.categoryScores.planningDocumentation).toBe(100);
    expect(result.categoryScores.trainingAwareness).toBe(100);
    expect(result.categoryScores.reportingCommunication).toBe(100);
    expect(result.categoryScores.responseReadiness).toBe(100);
  });
  it("has advisorSummary", () => expect(result.advisorSummary).toBeTruthy());
  it("has interpretation", () => expect(result.interpretation).toBeTruthy());
  it("has immediateActionPlan array", () => expect(Array.isArray(result.immediateActionPlan)).toBe(true));
  it("has ctaBlock array", () => expect(Array.isArray(result.ctaBlock)).toBe(true));
  it("has crmPayload with required fields", () => {
    expect(typeof result.crmPayload.score).toBe("number");
    expect(result.crmPayload.classification).toBeTruthy();
    expect(result.crmPayload.riskLevel).toBeTruthy();
    expect(Array.isArray(result.crmPayload.topGaps)).toBe(true);
    expect(typeof result.crmPayload.categoryScores).toBe("object");
    expect(result.crmPayload.industry).toBe("Healthcare");
    expect(result.crmPayload.jurisdiction).toBe("Ontario");
    expect(Array.isArray(result.crmPayload.recommendedActions)).toBe(true);
  });
});

// ─── runAssessment — SAMPLE_RESPONSES_MODERATE ───────────────────────────────

describe("runAssessment — SAMPLE_RESPONSES_MODERATE", () => {
  const result = runAssessment(SAMPLE_RESPONSES_MODERATE, "Retail", "New York");

  it("returns score < 100", () => expect(result.score).toBeLessThan(100));
  it("score is >= 0", () => expect(result.score).toBeGreaterThanOrEqual(0));
  it("has at least 1 top gap", () => expect(result.topGaps.length).toBeGreaterThan(0));
  it("each gap has required fields", () => {
    for (const gap of result.topGaps) {
      expect(gap.id).toBeTruthy();
      expect(gap.gap).toBeTruthy();
      expect(["Not in Place", "Incomplete", "Partial"]).toContain(gap.status);
      expect(gap.impact).toBeTruthy();
    }
  });
  it("classification is not Defensible", () => expect(result.classification).not.toBe("Defensible Position"));
  it("has immediateActionPlan with at least 1 item", () => {
    expect(result.immediateActionPlan.length).toBeGreaterThan(0);
  });
});

// ─── runAssessment — all no (Severe Exposure) ────────────────────────────────

describe("runAssessment — all no (Severe Exposure)", () => {
  const result = runAssessment(SAMPLE_RESPONSES_HIGH_EXPOSURE, "Manufacturing", "California");

  it("returns score of 0 or very low", () => expect(result.score).toBeLessThanOrEqual(10));
  it("classifies as Severe Exposure", () => expect(result.classification).toBe("Severe Exposure"));
  it("riskMap color is red", () => expect(result.riskMap.color).toBe("red"));
  it("has multiple top gaps", () => expect(result.topGaps.length).toBeGreaterThan(2));
  it("all category scores are 0", () => {
    expect(result.categoryScores.planningDocumentation).toBe(0);
    expect(result.categoryScores.trainingAwareness).toBe(0);
    expect(result.categoryScores.reportingCommunication).toBe(0);
    expect(result.categoryScores.responseReadiness).toBe(0);
  });
  it("has ctaBlock with at least 1 item", () => expect(result.ctaBlock.length).toBeGreaterThan(0));
});

// ─── CRM Payload format ───────────────────────────────────────────────────────

describe("CRM Payload format", () => {
  const result = runAssessment(SAMPLE_RESPONSES_MODERATE, "Education", "British Columbia");
  const crm = result.crmPayload;

  it("score is a number 0-100", () => {
    expect(crm.score).toBeGreaterThanOrEqual(0);
    expect(crm.score).toBeLessThanOrEqual(100);
  });
  it("classification is a non-empty string", () => expect(crm.classification.length).toBeGreaterThan(0));
  it("riskLevel is a non-empty string", () => expect(crm.riskLevel.length).toBeGreaterThan(0));
  it("topGaps is an array", () => expect(Array.isArray(crm.topGaps)).toBe(true));
  it("each topGap has gap, status, impact", () => {
    for (const g of crm.topGaps) {
      expect(g.gap).toBeTruthy();
      expect(["Not in Place", "Incomplete", "Partial"]).toContain(g.status);
      expect(g.impact).toBeTruthy();
    }
  });
  it("categoryScores has all 4 keys", () => {
    expect(typeof crm.categoryScores.planningDocumentation).toBe("number");
    expect(typeof crm.categoryScores.trainingAwareness).toBe("number");
    expect(typeof crm.categoryScores.reportingCommunication).toBe("number");
    expect(typeof crm.categoryScores.responseReadiness).toBe("number");
  });
  it("industry matches input", () => expect(crm.industry).toBe("Education"));
  it("jurisdiction matches input", () => expect(crm.jurisdiction).toBe("British Columbia"));
  it("recommendedActions is an array of strings", () => {
    expect(Array.isArray(crm.recommendedActions)).toBe(true);
    for (const a of crm.recommendedActions) expect(typeof a).toBe("string");
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("runAssessment — edge cases", () => {
  it("handles empty answers without throwing", () => {
    const result = runAssessment({}, "General", "Unknown");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.classification).toBeTruthy();
  });

  it("score is always clamped to 0-100", () => {
    const result = runAssessment({}, "General", "Unknown");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("industry and jurisdiction are passed through to crmPayload", () => {
    const result = runAssessment(allAnswers("yes"), "Corporate", "Texas");
    expect(result.crmPayload.industry).toBe("Corporate");
    expect(result.crmPayload.jurisdiction).toBe("Texas");
  });
});
