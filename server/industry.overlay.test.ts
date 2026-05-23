/**
 * industry.overlay.test.ts
 *
 * Tests for the industryOverlayContent.ts data layer.
 * Verifies schema completeness, data integrity, and helper functions.
 */
import { describe, it, expect } from "vitest";
import {
  INDUSTRY_OVERLAYS,
  INDUSTRY_LIST,
  getIndustryOverlay,
  type IndustryOverlay,
} from "../shared/industryOverlayContent";

const EXPECTED_INDUSTRIES = [
  "healthcare",
  "education",
  "retail",
  "manufacturing",
  "corporate",
  "public_government",
];

const VALID_RISK_LEVELS = ["Low", "Moderate", "Elevated", "High", "Critical"];

describe("INDUSTRY_LIST", () => {
  it("contains all 6 expected industries", () => {
    expect(INDUSTRY_LIST).toHaveLength(6);
    const keys = INDUSTRY_LIST.map((i) => i.key);
    for (const expected of EXPECTED_INDUSTRIES) {
      expect(keys).toContain(expected);
    }
  });

  it("every entry has key, label, and icon", () => {
    for (const item of INDUSTRY_LIST) {
      expect(item.key).toBeTruthy();
      expect(item.label).toBeTruthy();
      expect(item.icon).toBeTruthy();
    }
  });
});

describe("INDUSTRY_OVERLAYS record", () => {
  it("contains all 6 industry keys", () => {
    for (const key of EXPECTED_INDUSTRIES) {
      expect(INDUSTRY_OVERLAYS).toHaveProperty(key);
    }
  });
});

describe("getIndustryOverlay helper", () => {
  it("returns the correct overlay for a valid key", () => {
    const overlay = getIndustryOverlay("healthcare");
    expect(overlay).not.toBeNull();
    expect(overlay?.industryKey).toBe("healthcare");
  });

  it("returns null for an unknown key", () => {
    expect(getIndustryOverlay("unknown_sector")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(getIndustryOverlay("")).toBeNull();
  });
});

describe("IndustryOverlay schema completeness", () => {
  for (const key of EXPECTED_INDUSTRIES) {
    describe(`industry: ${key}`, () => {
      let overlay: IndustryOverlay;

      it("exists and has top-level fields", () => {
        const o = getIndustryOverlay(key);
        expect(o).not.toBeNull();
        overlay = o!;
        expect(overlay.industry).toBeTruthy();
        expect(overlay.industryKey).toBe(key);
        expect(overlay.icon).toBeTruthy();
        expect(overlay.tagline).toBeTruthy();
      });

      it("has a valid risk_profile", () => {
        const o = getIndustryOverlay(key)!;
        const rp = o.risk_profile;
        expect(VALID_RISK_LEVELS).toContain(rp.risk_level);
        expect(rp.primary_violence_types.length).toBeGreaterThan(0);
        for (const vt of rp.primary_violence_types) {
          expect(vt.type).toBeTruthy();
          expect(vt.description).toBeTruthy();
        }
        expect(rp.common_sources.length).toBeGreaterThan(0);
        expect(rp.environmental_factors.length).toBeGreaterThan(0);
      });

      it("has at least 3 common_scenarios", () => {
        const o = getIndustryOverlay(key)!;
        expect(o.common_scenarios.length).toBeGreaterThanOrEqual(3);
      });

      it("has at least 3 high_risk_roles", () => {
        const o = getIndustryOverlay(key)!;
        expect(o.high_risk_roles.length).toBeGreaterThanOrEqual(3);
      });

      it("has controls_and_procedures with prevention, response, and post_incident", () => {
        const o = getIndustryOverlay(key)!;
        const cp = o.controls_and_procedures;
        expect(cp.prevention.length).toBeGreaterThan(0);
        expect(cp.response.length).toBeGreaterThan(0);
        expect(cp.post_incident.length).toBeGreaterThan(0);
        for (const item of [...cp.prevention, ...cp.response, ...cp.post_incident]) {
          expect(item.action).toBeTruthy();
          expect(item.detail).toBeTruthy();
        }
      });

      it("has at least 3 training_priorities", () => {
        const o = getIndustryOverlay(key)!;
        expect(o.training_priorities.length).toBeGreaterThanOrEqual(3);
        for (const tp of o.training_priorities) {
          expect(tp.topic).toBeTruthy();
          expect(tp.rationale).toBeTruthy();
        }
      });

      it("has at least 2 policy_emphasis entries", () => {
        const o = getIndustryOverlay(key)!;
        expect(o.policy_emphasis.length).toBeGreaterThanOrEqual(2);
        for (const pe of o.policy_emphasis) {
          expect(pe.policy).toBeTruthy();
          expect(pe.description).toBeTruthy();
        }
      });

      it("has at least 2 assessment_focus areas with questions", () => {
        const o = getIndustryOverlay(key)!;
        expect(o.assessment_focus.length).toBeGreaterThanOrEqual(2);
        for (const af of o.assessment_focus) {
          expect(af.area).toBeTruthy();
          expect(af.questions.length).toBeGreaterThan(0);
        }
      });
    });
  }
});

describe("INDUSTRY_LIST and INDUSTRY_OVERLAYS consistency", () => {
  it("every INDUSTRY_LIST key has a matching INDUSTRY_OVERLAYS entry", () => {
    for (const item of INDUSTRY_LIST) {
      expect(INDUSTRY_OVERLAYS).toHaveProperty(item.key);
    }
  });

  it("every INDUSTRY_OVERLAYS key appears in INDUSTRY_LIST", () => {
    const listKeys = new Set(INDUSTRY_LIST.map((i) => i.key));
    for (const key of Object.keys(INDUSTRY_OVERLAYS)) {
      expect(listKeys.has(key)).toBe(true);
    }
  });
});
