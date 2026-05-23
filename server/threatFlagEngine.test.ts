import { describe, it, expect } from "vitest";
import { scanText } from "./threatFlagEngine";

describe("scanText", () => {
  it("returns empty result for empty input", () => {
    const result = scanText("");
    expect(result.flags).toHaveLength(0);
    expect(result.maxSeverity).toBeNull();
    expect(result.requiresEscalation).toBe(false);
  });

  it("detects a direct threat phrase", () => {
    const result = scanText("He said you'll be sorry for what you did.");
    expect(result.flags.length).toBeGreaterThan(0);
    const flag = result.flags.find((f) => f.id === "veiled_threat");
    expect(flag).toBeDefined();
    expect(flag?.severity).toBe("high");
    expect(result.requiresEscalation).toBe(true);
  });

  it("detects weapons interest", () => {
    const result = scanText("Employee mentioned they have a gun and have been practicing shooting at the shooting range.");
    const flag = result.flags.find((f) => f.id === "weapons_interest");
    expect(flag).toBeDefined();
    expect(flag?.severity).toBe("critical");
    expect(result.maxSeverity).toBe("critical");
  });

  it("detects leakage / final act behaviors", () => {
    const result = scanText("She said this is her last day and gave away her belongings to colleagues.");
    const leakage = result.flags.find((f) => f.id === "leakage_threat");
    const finalAct = result.flags.find((f) => f.id === "final_act");
    expect(leakage || finalAct).toBeDefined();
    expect(result.requiresEscalation).toBe(true);
  });

  it("detects social isolation", () => {
    const result = scanText("He has become a complete loner and avoids everyone at work.");
    const flag = result.flags.find((f) => f.id === "social_isolation");
    expect(flag).toBeDefined();
  });

  it("detects stalking behavior", () => {
    const result = scanText("She reported he has been following her and showed up at her home uninvited.");
    const flag = result.flags.find((f) => f.id === "stalking");
    expect(flag).toBeDefined();
    expect(flag?.wavrKey).toBe("surveillanceOfTarget");
  });

  it("detects desperation/hopelessness", () => {
    const result = scanText("He said he's at the end of his rope and there's no way out.");
    const flag = result.flags.find((f) => f.id === "desperation_hopelessness");
    expect(flag).toBeDefined();
    expect(flag?.severity).toBe("high");
  });

  it("detects intimidation", () => {
    const result = scanText("Employee threw objects and had a violent outburst in the break room.");
    const flag = result.flags.find((f) => f.id === "intimidation");
    expect(flag).toBeDefined();
  });

  it("is case-insensitive", () => {
    const result = scanText("HE SAID YOU'LL BE SORRY.");
    expect(result.flags.length).toBeGreaterThan(0);
  });

  it("returns highest severity correctly", () => {
    const result = scanText("He has a gun at the shooting range and said you'll be sorry.");
    expect(result.maxSeverity).toBe("critical");
  });

  it("returns triggered WAVR keys", () => {
    const result = scanText("He has a gun and has been following her to her home, showing up uninvited.");
    expect(result.triggeredWavrKeys).toContain("weaponsInterest");
    expect(result.triggeredWavrKeys).toContain("surveillanceOfTarget");
  });

  it("handles multiple texts concatenated", () => {
    const result = scanText(
      "Employee seemed withdrawn.",
      "Later said nothing matters anymore.",
      null,
      undefined
    );
    expect(result.flags.length).toBeGreaterThan(0);
  });
});
