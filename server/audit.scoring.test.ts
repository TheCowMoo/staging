import { describe, expect, it } from "vitest";
import {
  calculateCategoryScore,
  calculateOverallScore,
  calculateThreatSeverity,
  getQuestionsForFacility,
  AUDIT_CATEGORIES,
  PRIORITY_ORDER,
} from "../shared/auditFramework";

describe("calculateCategoryScore", () => {
  it("returns Low risk for all secure responses", () => {
    const responses = [{ score: 0 }, { score: 0 }, { score: 0 }];
    const result = calculateCategoryScore(responses);
    expect(result.riskLevel).toBe("Low");
    expect(result.percentage).toBe(0);
  });

  it("returns Critical risk for all serious vulnerabilities", () => {
    const responses = [{ score: 3 }, { score: 3 }, { score: 3 }];
    const result = calculateCategoryScore(responses);
    expect(result.riskLevel).toBe("Critical");
    expect(result.percentage).toBe(100);
  });

  it("excludes Not Applicable responses (null score) from calculation", () => {
    const responses = [{ score: 0 }, { score: null }, { score: 0 }];
    const result = calculateCategoryScore(responses);
    // Only 2 questions count, both score 0
    expect(result.percentage).toBe(0);
    expect(result.maxScore).toBe(6); // 2 questions × max 3
  });

  it("returns Moderate risk for ~30% score", () => {
    // 1 out of 3 questions has score 3, others 0 → 3/9 = 33%
    const responses = [{ score: 3 }, { score: 0 }, { score: 0 }];
    const result = calculateCategoryScore(responses);
    expect(result.riskLevel).toBe("Moderate");
    expect(result.percentage).toBeGreaterThan(20);
    expect(result.percentage).toBeLessThanOrEqual(40);
  });

  it("handles empty responses", () => {
    const result = calculateCategoryScore([]);
    expect(result.percentage).toBe(0);
    expect(result.maxScore).toBe(0);
  });
});

describe("calculateOverallScore", () => {
  it("calculates weighted overall score correctly", () => {
    const categoryScores = {
      "Access Control": { percentage: 50, weight: 0.5, riskLevel: "Elevated", rawScore: 5, maxScore: 10 },
      "Doors & Locks": { percentage: 50, weight: 0.5, riskLevel: "Elevated", rawScore: 5, maxScore: 10 },
    };
    const result = calculateOverallScore(categoryScores);
    expect(result.overallScore).toBe(50);
    expect(result.overallRiskLevel).toBe("Elevated");
  });

  it("returns Low for all zero scores", () => {
    const categoryScores = {
      "Access Control": { percentage: 0, weight: 1.0, riskLevel: "Low", rawScore: 0, maxScore: 10 },
    };
    const result = calculateOverallScore(categoryScores);
    expect(result.overallRiskLevel).toBe("Low");
  });
});

describe("calculateThreatSeverity", () => {
  it("calculates base score as likelihood × impact", () => {
    const result = calculateThreatSeverity("Possible", "Significant", "Average controls");
    // Possible=3, Significant=3, Average=0 → base=9, final=9
    expect(result.baseScore).toBe(9);
    expect(result.finalScore).toBe(9);
    expect(result.severityLevel).toBe("Moderate");
  });

  it("increases score with no controls", () => {
    const result = calculateThreatSeverity("Likely", "Severe", "No controls");
    // Likely=4, Severe=4 → base=16, modifier=+2, final=18
    expect(result.baseScore).toBe(16);
    expect(result.finalScore).toBe(18);
    expect(result.severityLevel).toBe("High");
  });

  it("decreases score with strong controls", () => {
    const result = calculateThreatSeverity("Likely", "Severe", "Strong controls");
    // Likely=4, Severe=4 → base=16, modifier=-1, final=15
    expect(result.finalScore).toBe(15);
    expect(result.severityLevel).toBe("High");
  });

  it("assigns Immediate priority for Critical severity", () => {
    const result = calculateThreatSeverity("Highly Likely", "Critical", "No controls");
    // 5×5=25, +2=27 (capped at 25) → Critical
    expect(result.severityLevel).toBe("Critical");
    expect(result.priority).toBe("Immediate");
  });
});

describe("getQuestionsForFacility", () => {
  it("returns categories with questions for a small_office", () => {
    const categories = getQuestionsForFacility("small_office");
    expect(categories.length).toBeGreaterThan(0);
    categories.forEach((cat) => {
      expect(cat.questions.length).toBeGreaterThan(0);
    });
  });

  it("returns categories with questions for healthcare", () => {
    const categories = getQuestionsForFacility("healthcare");
    expect(categories.length).toBeGreaterThan(0);
  });

  it("filters out categories with no applicable questions", () => {
    const categories = getQuestionsForFacility("small_office");
    categories.forEach((cat) => {
      expect(cat.questions.length).toBeGreaterThan(0);
    });
  });
});

describe("AUDIT_CATEGORIES", () => {
  it("has at least 10 categories defined", () => {
    expect(AUDIT_CATEGORIES.length).toBeGreaterThanOrEqual(10);
  });

  it("all questions have unique IDs", () => {
    const allIds = AUDIT_CATEGORIES.flatMap((c) => c.questions.map((q) => q.id));
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it("all questions have non-empty text", () => {
    AUDIT_CATEGORIES.forEach((cat) => {
      cat.questions.forEach((q) => {
        expect(q.text.length).toBeGreaterThan(0);
      });
    });
  });
});

describe("PRIORITY_ORDER", () => {
  it("has the correct priority sequence", () => {
    expect(PRIORITY_ORDER).toEqual(["Immediate", "30 Day", "90 Day", "Long-Term"]);
  });
});

describe("New response types: Partial and Unavoidable", () => {
  it("Partial response (score 1) is included in category score calculation", () => {
    // Partial has score 1 — should count toward the total
    const responses = [{ score: 1 }, { score: 0 }, { score: 0 }];
    const result = calculateCategoryScore(responses);
    // 1 out of max 9 → ~11%
    expect(result.rawScore).toBe(1);
    expect(result.maxScore).toBe(9);
    expect(result.riskLevel).toBe("Low");
  });

  it("Unavoidable response (null score) is excluded from category score calculation", () => {
    // Unavoidable has null score — same as N/A, excluded from denominator
    const responses = [{ score: null }, { score: 0 }, { score: 0 }];
    const result = calculateCategoryScore(responses);
    // Only 2 questions count
    expect(result.maxScore).toBe(6);
    expect(result.rawScore).toBe(0);
  });

  it("mix of Partial and Unavoidable responses calculates correctly", () => {
    // 1 Partial (score 1) + 1 Unavoidable (null) + 1 Secure (score 0)
    const responses = [{ score: 1 }, { score: null }, { score: 0 }];
    const result = calculateCategoryScore(responses);
    // Only 2 questions count (Unavoidable excluded)
    expect(result.maxScore).toBe(6);
    expect(result.rawScore).toBe(1);
  });
});

describe("AUDIT_CATEGORIES section structure", () => {
  it("all categories have a valid section property", () => {
    const validSections = ["cpted_physical", "eap_development", "profile"];
    AUDIT_CATEGORIES.forEach((cat) => {
      expect(validSections).toContain(cat.section);
    });
  });

  it("has at least one category in each primary section", () => {
    const sections = AUDIT_CATEGORIES.map((c) => c.section);
    expect(sections).toContain("cpted_physical");
    expect(sections).toContain("eap_development");
  });

  it("questions with conditionalFollowUp have required fields", () => {
    AUDIT_CATEGORIES.forEach((cat) => {
      cat.questions.forEach((q) => {
        if (q.conditionalFollowUp) {
          expect(q.conditionalFollowUp.trigger).toBeDefined();
          expect(q.conditionalFollowUp.followUpText.length).toBeGreaterThan(0);
          expect(q.conditionalFollowUp.followUpType).toBeDefined();
        }
      });
    });
  });

  it("questions with recommendedActionEnabled are scored questions", () => {
    AUDIT_CATEGORIES.forEach((cat) => {
      cat.questions.forEach((q) => {
        if (q.recommendedActionEnabled) {
          expect(q.inputType).toBe("scored");
        }
      });
    });
  });
});
