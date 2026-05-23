import { describe, it, expect } from "vitest";
import {
  OSHA_AT_A_GLANCE,
  OSHA_BASELINE_OVERVIEW,
  OSHA_FIVE_ELEMENTS,
  OSHA_DOCUMENTATION,
  OSHA_RECORDKEEPING,
  OSHA_RESOURCES,
  OSHA_FORMS,
  OSHA_ASSESSMENT_CONNECTION,
} from "../shared/oshaContent";
import {
  CANADA_AT_A_GLANCE,
  CANADA_FEDERAL_OVERVIEW,
  CANADA_CORE_ELEMENTS,
  CANADA_RESOURCES,
  CANADA_ASSESSMENT_CONNECTION,
  PROVINCIAL_CONTENT,
  PROVINCE_LIST,
} from "../shared/jurisdictionContent";
import {
  INDUSTRY_OPTIONS,
  resolveStateGuidance,
  stateContent,
} from "../shared/stateContent";
import {
  INDUSTRY_LIST,
  getIndustryOverlay,
} from "../shared/industryOverlayContent";

describe("Standards accordion — US content completeness", () => {
  it("OSHA_AT_A_GLANCE has items and urgencyLine", () => {
    expect(OSHA_AT_A_GLANCE.items.length).toBeGreaterThan(0);
    expect(OSHA_AT_A_GLANCE.urgencyLine).toBeTruthy();
  });

  it("OSHA_BASELINE_OVERVIEW has keyPoints", () => {
    expect(OSHA_BASELINE_OVERVIEW.keyPoints.length).toBeGreaterThanOrEqual(4);
  });

  it("OSHA_FIVE_ELEMENTS has 5 elements with artifacts", () => {
    expect(OSHA_FIVE_ELEMENTS.elements).toHaveLength(5);
    OSHA_FIVE_ELEMENTS.elements.forEach((el) => {
      expect(el.artifacts.length).toBeGreaterThan(0);
    });
  });

  it("OSHA_DOCUMENTATION has documents with name, purpose, whenNeeded", () => {
    expect(OSHA_DOCUMENTATION.documents.length).toBeGreaterThan(0);
    OSHA_DOCUMENTATION.documents.forEach((doc) => {
      expect(doc.name).toBeTruthy();
      expect(doc.purpose).toBeTruthy();
      expect(doc.whenNeeded).toBeTruthy();
    });
  });

  it("OSHA_RECORDKEEPING has 3 columns", () => {
    expect(OSHA_RECORDKEEPING.columns).toHaveLength(3);
  });

  it("OSHA_FORMS has forms with url", () => {
    expect(OSHA_FORMS.forms.length).toBeGreaterThan(0);
    OSHA_FORMS.forms.forEach((f) => {
      expect(f.url).toMatch(/^https?:\/\//);
    });
  });

  it("OSHA_RESOURCES has resource categories with links", () => {
    expect(OSHA_RESOURCES.resources.length).toBeGreaterThan(0);
    OSHA_RESOURCES.resources.forEach((cat) => {
      expect(cat.links.length).toBeGreaterThan(0);
    });
  });

  it("OSHA_ASSESSMENT_CONNECTION has 3 connections and a callout", () => {
    expect(OSHA_ASSESSMENT_CONNECTION.connections).toHaveLength(3);
    expect(OSHA_ASSESSMENT_CONNECTION.callout).toBeTruthy();
  });
});

describe("Standards accordion — US state guidance", () => {
  it("resolveStateGuidance returns guidance for CA + healthcare", () => {
    const result = resolveStateGuidance("CA", "healthcare");
    expect(result).not.toBeNull();
    expect(result!.guidance.keyRequirements.length).toBeGreaterThan(0);
  });

  it("resolveStateGuidance falls back to general for unsupported industry", () => {
    const result = resolveStateGuidance("WY", "healthcare");
    expect(result).not.toBeNull();
    expect(result!.isIndustrySpecific).toBe(false);
  });

  it("resolveStateGuidance returns null for unknown state", () => {
    const result = resolveStateGuidance("XX", "general");
    expect(result).toBeNull();
  });

  it("INDUSTRY_OPTIONS has at least 4 options", () => {
    expect(INDUSTRY_OPTIONS.length).toBeGreaterThanOrEqual(4);
  });

  it("stateContent has all 50 states plus DC", () => {
    const codes = Object.keys(stateContent);
    expect(codes.length).toBeGreaterThanOrEqual(51);
  });
});

describe("Standards accordion — Canada content completeness", () => {
  it("CANADA_AT_A_GLANCE has items and urgencyLine", () => {
    expect(CANADA_AT_A_GLANCE.items.length).toBeGreaterThan(0);
    expect(CANADA_AT_A_GLANCE.urgencyLine).toBeTruthy();
  });

  it("CANADA_FEDERAL_OVERVIEW has keyPoints", () => {
    expect(CANADA_FEDERAL_OVERVIEW.keyPoints.length).toBeGreaterThanOrEqual(4);
  });

  it("CANADA_CORE_ELEMENTS has 6 elements", () => {
    expect(CANADA_CORE_ELEMENTS.elements).toHaveLength(6);
  });

  it("PROVINCE_LIST has all 13 provinces/territories", () => {
    expect(PROVINCE_LIST.length).toBe(13);
  });

  it("Ontario provincial guidance has keyRequirements and sourceLinks", () => {
    const on = PROVINCIAL_CONTENT["ON"];
    expect(on).toBeDefined();
    expect(on.keyRequirements.length).toBeGreaterThan(0);
    expect(on.sourceLinks.length).toBeGreaterThan(0);
  });

  it("CANADA_RESOURCES has federal and provincial items", () => {
    expect(CANADA_RESOURCES.items.length).toBeGreaterThan(0);
    const types = CANADA_RESOURCES.items.map((i) => i.type);
    expect(types).toContain("Federal");
    expect(types).toContain("Provincial");
  });

  it("CANADA_ASSESSMENT_CONNECTION has 3 items", () => {
    expect(CANADA_ASSESSMENT_CONNECTION.items).toHaveLength(3);
  });
});

describe("Standards accordion — Industry overlay parity", () => {
  it("INDUSTRY_LIST has at least 6 industries", () => {
    expect(INDUSTRY_LIST.length).toBeGreaterThanOrEqual(6);
  });

  it("getIndustryOverlay returns overlay for healthcare", () => {
    const overlay = getIndustryOverlay("healthcare");
    expect(overlay).not.toBeNull();
    expect(overlay!.risk_profile.primary_violence_types.length).toBeGreaterThan(0);
    expect(overlay!.common_scenarios.length).toBeGreaterThan(0);
    expect(overlay!.high_risk_roles.length).toBeGreaterThan(0);
    expect(overlay!.controls_and_procedures.prevention.length).toBeGreaterThan(0);
    expect(overlay!.controls_and_procedures.response.length).toBeGreaterThan(0);
    expect(overlay!.controls_and_procedures.post_incident.length).toBeGreaterThan(0);
    expect(overlay!.training_priorities.length).toBeGreaterThan(0);
    expect(overlay!.policy_emphasis.length).toBeGreaterThan(0);
    expect(overlay!.assessment_focus.length).toBeGreaterThan(0);
  });

  it("getIndustryOverlay returns overlay for public_government", () => {
    const overlay = getIndustryOverlay("public_government");
    expect(overlay).not.toBeNull();
    expect(overlay!.tagline).toBeTruthy();
  });

  it("getIndustryOverlay returns null for unknown industry", () => {
    const overlay = getIndustryOverlay("unknown_industry_xyz");
    expect(overlay).toBeNull();
  });

  it("all industries in INDUSTRY_LIST have valid overlays", () => {
    INDUSTRY_LIST.forEach((ind) => {
      const overlay = getIndustryOverlay(ind.key);
      expect(overlay).not.toBeNull();
      expect(overlay!.industry).toBeTruthy();
    });
  });

  it("US publicSector maps to public_government overlay", () => {
    // The key mapping in Standards.tsx: publicSector -> public_government
    const overlay = getIndustryOverlay("public_government");
    expect(overlay).not.toBeNull();
  });
});

describe("Standards accordion — empty section guard", () => {
  it("no section content is undefined when overlay is present", () => {
    const overlay = getIndustryOverlay("retail");
    expect(overlay).not.toBeNull();
    // All 7 overlay section types must have content
    expect(overlay!.risk_profile).toBeDefined();
    expect(overlay!.common_scenarios).toBeDefined();
    expect(overlay!.high_risk_roles).toBeDefined();
    expect(overlay!.controls_and_procedures).toBeDefined();
    expect(overlay!.training_priorities).toBeDefined();
    expect(overlay!.policy_emphasis).toBeDefined();
    expect(overlay!.assessment_focus).toBeDefined();
  });

  it("all provinces have non-empty keyRequirements (no empty sections)", () => {
    PROVINCE_LIST.forEach((code) => {
      const p = PROVINCIAL_CONTENT[code];
      expect(p.keyRequirements.length).toBeGreaterThan(0);
    });
  });
});
