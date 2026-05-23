/**
 * liability.scan.test.ts
 * Tests for the LiabilityScan page logic — verifies engine integration
 * Updated to match v3 engine schema (yes/no answers, new CategoryKey, CrmPayload)
 */
import { describe, it, expect } from "vitest";
import {
  runAssessment,
  QUESTIONS,
  SAMPLE_RESPONSES_DEFENSIBLE,
  SAMPLE_RESPONSES_MODERATE,
  SAMPLE_RESPONSES_HIGH_EXPOSURE,
  type AnswerValue,
} from "../shared/assessmentEngine";

// ─── Progress tracking helpers ────────────────────────────────────────────────

function countAnswered(answers: Record<string, AnswerValue>): number {
  return Object.keys(answers).filter((k) => QUESTIONS.some((q) => q.id === k)).length;
}

function progressPercent(answers: Record<string, AnswerValue>): number {
  return Math.round((countAnswered(answers) / QUESTIONS.length) * 100);
}

// ─── Progress tracking ────────────────────────────────────────────────────────

describe("Progress tracking", () => {
  it("0% progress for empty answers", () => {
    expect(progressPercent({})).toBe(0);
  });

  it("100% progress when all questions answered", () => {
    expect(progressPercent(SAMPLE_RESPONSES_DEFENSIBLE)).toBe(100);
  });

  it("partial progress for partially answered", () => {
    const partial: Record<string, AnswerValue> = {};
    const half = QUESTIONS.slice(0, Math.floor(QUESTIONS.length / 2));
    for (const q of half) partial[q.id] = "yes";
    const pct = progressPercent(partial);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(100);
  });
});

// ─── Scan completion guard ────────────────────────────────────────────────────

describe("Scan completion guard", () => {
  it("cannot run scan with 0 answers", () => {
    const answered = countAnswered({});
    expect(answered).toBe(0);
    expect(answered < QUESTIONS.length).toBe(true);
  });

  it("can run scan when all questions answered", () => {
    const answered = countAnswered(SAMPLE_RESPONSES_DEFENSIBLE);
    expect(answered).toBe(QUESTIONS.length);
  });
});

// ─── Results display — Defensible ────────────────────────────────────────────

describe("Results display — Defensible", () => {
  const result = runAssessment(SAMPLE_RESPONSES_DEFENSIBLE, "Healthcare", "Ontario");

  it("score is 100", () => expect(result.score).toBe(100));
  it("classification is Defensible Position", () => expect(result.classification).toBe("Defensible Position"));
  it("riskMap color is green", () => expect(result.riskMap.color).toBe("green"));
  it("topGaps is empty", () => expect(result.topGaps).toHaveLength(0));
  it("advisorSummary is present", () => expect(result.advisorSummary.length).toBeGreaterThan(10));
  it("interpretation is present", () => expect(result.interpretation.length).toBeGreaterThan(10));
  it("ctaBlock has items", () => expect(result.ctaBlock.length).toBeGreaterThan(0));
  it("immediateActionPlan is an array", () => expect(Array.isArray(result.immediateActionPlan)).toBe(true));
});

// ─── Results display — Moderate Exposure ─────────────────────────────────────

describe("Results display — Moderate Exposure", () => {
  const result = runAssessment(SAMPLE_RESPONSES_MODERATE, "Education", "British Columbia");

  it("score is between 0 and 100", () => {
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
  it("classification is not Defensible", () => expect(result.classification).not.toBe("Defensible Position"));
  it("has at least 1 top gap", () => expect(result.topGaps.length).toBeGreaterThan(0));
  it("each gap has id, gap, status, impact", () => {
    for (const g of result.topGaps) {
      expect(g.id).toBeTruthy();
      expect(g.gap).toBeTruthy();
      expect(["Not in Place", "Incomplete", "Partial"]).toContain(g.status);
      expect(g.impact).toBeTruthy();
    }
  });
  it("has immediateActionPlan items", () => expect(result.immediateActionPlan.length).toBeGreaterThan(0));
});

// ─── Results display — Severe Exposure ───────────────────────────────────────

describe("Results display — Severe Exposure", () => {
  const result = runAssessment(SAMPLE_RESPONSES_HIGH_EXPOSURE, "Retail", "California");

  it("score is very low", () => expect(result.score).toBeLessThanOrEqual(10));
  it("classifies as Severe Exposure", () => expect(result.classification).toBe("Severe Exposure"));
  it("riskMap color is red", () => expect(result.riskMap.color).toBe("red"));
  it("has multiple top gaps", () => expect(result.topGaps.length).toBeGreaterThan(2));
  it("all category scores are 0", () => {
    expect(result.categoryScores.planningDocumentation).toBe(0);
    expect(result.categoryScores.trainingAwareness).toBe(0);
    expect(result.categoryScores.reportingCommunication).toBe(0);
    expect(result.categoryScores.responseReadiness).toBe(0);
  });
});

// ─── Category scores panel ────────────────────────────────────────────────────

describe("Category scores panel", () => {
  it("all 4 category scores are present and numeric", () => {
    const result = runAssessment(SAMPLE_RESPONSES_MODERATE, "Manufacturing", "Texas");
    expect(typeof result.categoryScores.planningDocumentation).toBe("number");
    expect(typeof result.categoryScores.trainingAwareness).toBe("number");
    expect(typeof result.categoryScores.reportingCommunication).toBe("number");
    expect(typeof result.categoryScores.responseReadiness).toBe("number");
  });

  it("all category scores are 0-100", () => {
    const result = runAssessment(SAMPLE_RESPONSES_MODERATE, "Corporate", "Ontario");
    for (const val of Object.values(result.categoryScores)) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(100);
    }
  });
});

// ─── CRM payload ──────────────────────────────────────────────────────────────

describe("CRM payload", () => {
  it("has all required fields in exact format", () => {
    const result = runAssessment(SAMPLE_RESPONSES_MODERATE, "Healthcare", "New York");
    const crm = result.crmPayload;

    expect(typeof crm.score).toBe("number");
    expect(typeof crm.classification).toBe("string");
    expect(typeof crm.riskLevel).toBe("string");
    expect(Array.isArray(crm.topGaps)).toBe(true);
    expect(typeof crm.categoryScores).toBe("object");
    expect(typeof crm.categoryScores.planningDocumentation).toBe("number");
    expect(typeof crm.categoryScores.trainingAwareness).toBe("number");
    expect(typeof crm.categoryScores.reportingCommunication).toBe("number");
    expect(typeof crm.categoryScores.responseReadiness).toBe("number");
    expect(typeof crm.industry).toBe("string");
    expect(typeof crm.jurisdiction).toBe("string");
    expect(Array.isArray(crm.recommendedActions)).toBe(true);
  });

  it("topGaps in CRM have gap, status, impact fields", () => {
    const result = runAssessment(SAMPLE_RESPONSES_MODERATE, "Retail", "Ontario");
    for (const g of result.crmPayload.topGaps) {
      expect(g.gap).toBeTruthy();
      expect(["Not in Place", "Incomplete", "Partial"]).toContain(g.status);
      expect(g.impact).toBeTruthy();
    }
  });

  it("industry and jurisdiction are passed through", () => {
    const result = runAssessment(SAMPLE_RESPONSES_DEFENSIBLE, "Education", "Alberta");
    expect(result.crmPayload.industry).toBe("Education");
    expect(result.crmPayload.jurisdiction).toBe("Alberta");
  });

  it("recommendedActions are non-empty strings", () => {
    const result = runAssessment(SAMPLE_RESPONSES_MODERATE, "Manufacturing", "Ontario");
    for (const action of result.crmPayload.recommendedActions) {
      expect(typeof action).toBe("string");
      expect(action.length).toBeGreaterThan(5);
    }
  });
});
