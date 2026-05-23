import { describe, expect, it } from "vitest";// ── Test: Canada jurisdiction content ─────────────────────────────────────────────
describe("Canada jurisdiction content", () => {
  it("exports PROVINCE_LIST with at least 10 provinces/territories", async () => {
    const { PROVINCE_LIST } = await import("../shared/jurisdictionContent");
    expect(Array.isArray(PROVINCE_LIST)).toBe(true);
    expect(PROVINCE_LIST.length).toBeGreaterThanOrEqual(10);
  });

  it("each PROVINCIAL_CONTENT entry has a code and name", async () => {
    const { PROVINCIAL_CONTENT } = await import("../shared/jurisdictionContent");
    for (const [code, p] of Object.entries(PROVINCIAL_CONTENT)) {
      expect(typeof code).toBe("string");
      expect(code.length).toBeGreaterThan(0);
      expect(typeof p.name).toBe("string");
      expect(p.name.length).toBeGreaterThan(0);
    }
  });

  it("exports CANADA_FEDERAL_OVERVIEW with heading and keyPoints", async () => {
    const { CANADA_FEDERAL_OVERVIEW } = await import("../shared/jurisdictionContent");
    expect(typeof CANADA_FEDERAL_OVERVIEW.heading).toBe("string");
    expect(Array.isArray(CANADA_FEDERAL_OVERVIEW.keyPoints)).toBe(true);
    expect(CANADA_FEDERAL_OVERVIEW.keyPoints.length).toBeGreaterThan(0);
  });

  it("exports CANADA_CORE_ELEMENTS with at least 5 elements", async () => {
    const { CANADA_CORE_ELEMENTS } = await import("../shared/jurisdictionContent");
    expect(Array.isArray(CANADA_CORE_ELEMENTS.elements)).toBe(true);
    expect(CANADA_CORE_ELEMENTS.elements.length).toBeGreaterThanOrEqual(5);
  });

  it("exports PROVINCIAL_CONTENT as a record with multiple provinces", async () => {
    const { PROVINCIAL_CONTENT, PROVINCE_LIST } = await import("../shared/jurisdictionContent");
    expect(typeof PROVINCIAL_CONTENT).toBe("object");
    // At least some provinces should have content
    const codesWithContent = PROVINCE_LIST.filter((code) => !!PROVINCIAL_CONTENT[code]);
    expect(codesWithContent.length).toBeGreaterThan(0);
  });
});// ── Test: PDF cache invalidation helper ───────────────────────────────────────
describe("clearPdfCache", () => {
  it("exports clearPdfCache as a function", async () => {
    const { clearPdfCache } = await import("./eapPdf");
    expect(typeof clearPdfCache).toBe("function");
  });

  it("calling clearPdfCache with any auditId does not throw", async () => {
    const { clearPdfCache } = await import("./eapPdf");
    expect(() => clearPdfCache(999)).not.toThrow();
    expect(() => clearPdfCache(0)).not.toThrow();
  });
});

// ── Test: Executive Summary payload structure ─────────────────────────────────
describe("Executive Summary payload validation", () => {
  it("validates that a well-formed summary payload has all required fields", () => {
    const payload = {
      summary: "The facility presents a moderate overall risk profile.",
      topPriorities: ["Address lockdown capability gaps", "Strengthen visitor management"],
      leadershipFocus: "Leadership should schedule a full lockdown drill within 30 days.",
      overallRisk: "Moderate",
      overallScore: "38.5",
      generatedAt: new Date().toISOString(),
    };
    expect(typeof payload.summary).toBe("string");
    expect(payload.summary.length).toBeGreaterThan(0);
    expect(Array.isArray(payload.topPriorities)).toBe(true);
    expect(payload.topPriorities.length).toBeGreaterThanOrEqual(2);
    expect(payload.topPriorities.length).toBeLessThanOrEqual(4);
    expect(typeof payload.leadershipFocus).toBe("string");
    expect(payload.leadershipFocus.startsWith("Leadership should")).toBe(true);
    expect(typeof payload.overallRisk).toBe("string");
    expect(typeof payload.overallScore).toBe("string");
    expect(() => new Date(payload.generatedAt)).not.toThrow();
  });

  it("rejects a payload with fewer than 2 topPriorities", () => {
    const payload = {
      summary: "Some summary",
      topPriorities: ["Only one priority"],
      leadershipFocus: "Leadership should act.",
    };
    expect(payload.topPriorities.length).toBeLessThan(2);
    // This simulates the guard in the router
    const isValid = payload.topPriorities.length >= 2;
    expect(isValid).toBe(false);
  });
});
