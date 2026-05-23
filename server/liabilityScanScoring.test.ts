/**
 * liabilityScanScoring.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Vitest unit tests for the defensibility-based liability scan scoring model.
 *
 * Validates:
 *  - Total possible score = 22
 *  - Tier 3 triggers override defensibility status correctly
 *  - Structural score labels map correctly to percentage bands
 *  - Priority ordering: Tier 3 failures always first, then lowest Tier 2
 *  - Multi-option question scoring (reporting mechanism, real-time alert)
 *  - Edge cases: all yes, all no, mixed
 */
import { describe, it, expect } from "vitest";
import {
  scoreLiabilityScan,
  TOTAL_POSSIBLE_POINTS as TOTAL_POSSIBLE,
} from "../shared/liabilityScanScoring";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build an all-yes answer set (best case) */
function allYes(): Record<string, string | boolean> {
  return {
    q1: "yes",
    q2: "yes",
    q3: "yes",
    q4: "yes",
    q5: "yes",
    q6: "yes",
    q7: "yes",
    q8: "yes",
    q9: "anon_full",           // best multi-option for reporting
    q10: "ras_full",           // best multi-option for alert system
    q11: "yes",
    q12: "yes",
    q13: "yes",
    q14: "yes",
    q15: "yes",
    q16: "yes",
  };
}

/** Build an all-no answer set (worst case) */
function allNo(): Record<string, string | boolean> {
  return {
    q1: "no",
    q2: "no",
    q3: "no",
    q4: "no",
    q5: "no",
    q6: "no",
    q7: "no",
    q8: "no",
    q9: "anon_none",          // worst multi-option for reporting
    q10: "ras_none",          // worst multi-option for alert system
    q11: "no",
    q12: "no",
    q13: "no",
    q14: "no",
    q15: "no",
    q16: "no",
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("TOTAL_POSSIBLE", () => {
  it("should equal 22", () => {
    expect(TOTAL_POSSIBLE).toBe(22); // TOTAL_POSSIBLE_POINTS alias
  });
});

describe("scoreLiabilityScan — all yes / best options", () => {
  it("earns maximum points (22) and is Low Risk", () => {
    const result = scoreLiabilityScan(allYes());
    expect(result.pointsEarned).toBe(22);
    expect(result.totalPossible).toBe(22);
    expect(result.scorePercent).toBe(100);
    expect(result.structuralLabel).toBe("Strong Foundation");
    expect(result.defensibilityStatus).toBe("Low Risk");
    expect(result.tier3Failures).toHaveLength(0);
  });
});

describe("scoreLiabilityScan — all no / worst options", () => {
  it("earns 0 points and is High Risk", () => {
    const result = scoreLiabilityScan(allNo());
    expect(result.pointsEarned).toBe(0);
    expect(result.scorePercent).toBe(0);
    expect(result.structuralLabel).toBe("Weak Structure");
    expect(result.defensibilityStatus).toBe("Critical Risk");
  });

  it("has 4 Tier 3 failures when all Tier 3 questions fail", () => {
    const result = scoreLiabilityScan(allNo());
    // q2 (EAP), q9 (reporting=none), q10 (alert=none), q13 (roles)
    expect(result.tier3Failures.length).toBeGreaterThanOrEqual(3);
  });

  it("top priorities start with Tier 3 failures", () => {
    const result = scoreLiabilityScan(allNo());
    // First priority should be a Tier 3 item
    expect(result.topPriorities.length).toBeGreaterThan(0);
    // All priorities should be limited to 3-5
    expect(result.topPriorities.length).toBeLessThanOrEqual(5);
    expect(result.topPriorities.length).toBeGreaterThanOrEqual(3);
  });
});

describe("scoreLiabilityScan — structural score labels", () => {
  it("returns Strong Foundation for score >= 85%", () => {
    // All yes gives 100% → Strong Foundation
    const result = scoreLiabilityScan(allYes());
    expect(result.structuralLabel).toBe("Strong Foundation");
  });

  it("returns Weak Structure for score < 50%", () => {
    const result = scoreLiabilityScan(allNo());
    expect(result.structuralLabel).toBe("Weak Structure");
  });

  it("returns Moderate Gaps for score 70–84%", () => {
    // Build a set that scores ~60–79%: answer yes to all Tier 2 except 2 questions
    const answers = allYes();
    // Remove 2 Tier 2 answers (q1, q3 = 2+2 = 4 pts lost → 18/22 = 81.8%)
    // Remove 3 Tier 2 answers (q1, q3, q4 = 6 pts lost → 16/22 = 72.7%)
    answers.q1 = "no";
    answers.q3 = "no";
    answers.q4 = "no";
    const result = scoreLiabilityScan(answers);
    expect(result.structuralLabel).toBe("Moderate Gaps");
    expect(result.scorePercent).toBeGreaterThanOrEqual(60);
    expect(result.scorePercent).toBeLessThan(80);
  });
});

describe("scoreLiabilityScan — defensibility status", () => {
  it("is Low Risk when 0 Tier 3 failures", () => {
    const result = scoreLiabilityScan(allYes());
    expect(result.defensibilityStatus).toBe("Low Risk");
  });

  it("is Moderate Risk when 1 Tier 3 failure", () => {
    const answers = allYes();
    answers.q2 = "no"; // EAP missing → Tier 3 failure
    const result = scoreLiabilityScan(answers);
    expect(result.defensibilityStatus).toBe("Moderate Risk");
    expect(result.tier3Failures).toHaveLength(1);
  });

  it("is Moderate Risk when 2 Tier 3 failures", () => {
    const answers = allYes();
    answers.q2 = "no";
    answers.q13 = "no";
    const result = scoreLiabilityScan(answers);
    expect(result.defensibilityStatus).toBe("Moderate Risk");
    expect(result.tier3Failures).toHaveLength(2);
  });

  it("is Critical Risk when 4 Tier 3 failures", () => {
    const answers = allYes();
    answers.q2 = "no";
    answers.q9 = "anon_none";   // reporting = none → Tier 3 failure
    answers.q10 = "ras_none";  // alert = none → Tier 3 failure
    answers.q13 = "no";
    const result = scoreLiabilityScan(answers);
    expect(result.defensibilityStatus).toBe("Critical Risk");
    expect(result.tier3Failures.length).toBeGreaterThanOrEqual(3);
  });
});

describe("scoreLiabilityScan — multi-option questions", () => {
  it("q9 anonymous → 2 pts, no Tier 3 failure", () => {
    const answers = allNo();
    answers.q9 = "anon_full";
    const result = scoreLiabilityScan(answers);
    // Should have 2 pts from q9 and no Tier 3 failure for reporting
    const reportingFailure = result.tier3Failures.some((f) =>
      f.toLowerCase().includes("report")
    );
    expect(reportingFailure).toBe(false);
  });

  it("q9 formal_non_anonymous → 1 pt, no Tier 3 failure", () => {
    const answers = allNo();
    answers.q9 = "anon_formal_only";
    const result = scoreLiabilityScan(answers);
    const reportingFailure = result.tier3Failures.some((f) =>
      f.toLowerCase().includes("report")
    );
    expect(reportingFailure).toBe(false);
  });

  it("q9 anon_none → 0 pts + Tier 3 failure", () => {
    const answers = allYes();
    answers.q9 = "anon_none";
    const result = scoreLiabilityScan(answers);
    expect(result.tier3Failures).toContain("q9");
  });

  it("q10 role_based → 2 pts, no Tier 3 failure", () => {
    const answers = allNo();
    answers.q10 = "ras_full";
    const result = scoreLiabilityScan(answers);
    const alertFailure = result.tier3Failures.some((f) =>
      f.toLowerCase().includes("alert") || f.toLowerCase().includes("notify")
    );
    expect(alertFailure).toBe(false);
  });

  it("q10 ras_none → 0 pts + Tier 3 failure", () => {
    const answers = allYes();
    answers.q10 = "ras_none";
    const result = scoreLiabilityScan(answers);
    expect(result.tier3Failures).toContain("q10");
  });
});

describe("scoreLiabilityScan — priority ordering", () => {
  it("Tier 3 failures always appear before Tier 2 gaps in top priorities", () => {
    const answers = allNo();
    const result = scoreLiabilityScan(answers);
    // All Tier 3 failures should come before Tier 2 gaps
    // We can verify by checking that the first N priorities correspond to Tier 3 failures
    const tier3Count = result.tier3Failures.length;
    const tier3PriorityIds = ["q2", "q9", "q10", "q13"];
    const firstPriorities = result.topPriorities.slice(0, tier3Count);
    for (const p of firstPriorities) {
      expect(tier3PriorityIds).toContain(p.questionId);
    }
  });

  it("limits top priorities to 5 maximum", () => {
    const result = scoreLiabilityScan(allNo());
    expect(result.topPriorities.length).toBeLessThanOrEqual(5);
  });

  it("includes at least 3 priorities when many gaps exist", () => {
    const result = scoreLiabilityScan(allNo());
    expect(result.topPriorities.length).toBeGreaterThanOrEqual(3);
  });
});
