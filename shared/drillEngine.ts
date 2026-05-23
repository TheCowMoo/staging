/**
 * drillEngine.ts — Parameterized Scenario Generator
 *
 * Provides modular inputs, varied user message construction, and TypeScript
 * types for the refactored drill generation system.
 *
 * Drill types:
 *   micro    — 1–2 min, single decision point, outcome-based feedback
 *   extended — 10–15 min, multiple decision points, admin-only
 *
 * All output is non-prescriptive: no correct/wrong labels, only tradeoffs
 * and decision impact framing.
 */

// ─── Parameter Definitions ─────────────────────────────────────────────────────

export const ENVIRONMENTS = [
  "Retail store",
  "Hospital / healthcare facility",
  "Corporate office",
  "Manufacturing floor",
  "School / educational campus",
  "Government building",
  "Hotel / hospitality",
  "Transportation hub",
  "Warehouse / distribution center",
  "Pharmacy",
  "Bank / financial institution",
  "Community center",
] as const;

export const THREAT_TYPES = [
  "Suspicious Person",
  "Unauthorized Access",
  "Escalating Behavior",
  "Domestic Spillover",
  "Weapon Suspicion",
  "Active Threat",
] as const;

export const BEHAVIORAL_INDICATORS = [
  "Evasion — avoiding staff, changing direction when approached",
  "Aggression — raised voice, threatening posture, verbal threats",
  "Deception — inconsistent answers, false credentials, implausible story",
  "Non-compliance — ignoring instructions, refusing to stop",
  "Boundary probing — testing access points, checking locked doors",
  "Accelerating movement — increasing pace toward restricted areas",
  "Fixation — repeated focus on a specific person or location",
  "Concealment — hiding hands, bulging clothing, covered face",
  "Pre-attack indicators — thousand-yard stare, hypervigilance, ritualistic behavior",
] as const;

export const RESPONSE_PRESSURES = [
  "Ambiguity — unclear whether the individual is a threat",
  "Time urgency — situation is moving faster than response",
  "Incomplete information — only partial picture available",
  "Social pressure — bystanders present, fear of overreacting",
  "Conflicting cues — some indicators benign, some alarming",
  "Role uncertainty — unclear who has authority to act",
  "Fear of escalation — concern that intervention will worsen situation",
  "Communication gap — unable to reach supervisor or security",
] as const;

export const RESPONSE_FOCUSES = [
  "Lockdown — shelter in place, secure perimeter",
  "Lockout — secure building, prevent entry",
  "Escape — evacuate, create distance",
  "Recognition — identify and report the threat",
  "Coordination — activate the response chain",
  "Containment — slow forward progression without direct confrontation",
] as const;

export const COMPLEXITY_LEVELS = [
  "Low — single actor, clear indicators, straightforward decision",
  "Moderate — ambiguous indicators, competing priorities, time pressure",
  "High — multiple actors, incomplete information, role conflict",
] as const;

// ─── Drill Parameter Types ─────────────────────────────────────────────────────

export type DrillEnvironment = typeof ENVIRONMENTS[number];
export type DrillThreatType = typeof THREAT_TYPES[number];
export type DrillBehavioralIndicator = typeof BEHAVIORAL_INDICATORS[number];
export type DrillResponsePressure = typeof RESPONSE_PRESSURES[number];
export type DrillResponseFocus = typeof RESPONSE_FOCUSES[number];
export type DrillComplexityLevel = typeof COMPLEXITY_LEVELS[number];

export interface DrillParameters {
  environment: DrillEnvironment;
  threatType: DrillThreatType;
  behavioralIndicators: DrillBehavioralIndicator[];
  responsePressure: DrillResponsePressure;
  responseFocus: DrillResponseFocus;
  complexityLevel: DrillComplexityLevel;
}

// ─── Drill Content Types (non-prescriptive output format) ─────────────────────

export interface DrillDecisionOption {
  label: string;
  description: string;
  riskLabel: string;
  /** What happens as a result — evolving, uncertain, not resolved */
  outcome: string;
  /** What was gained; what risk was introduced */
  tradeoff: string;
  /** How the option aligns with the training priority — no correct/wrong framing */
  reasoning: string;
  doctrine_evaluation?: {
    exposure_effect: "positive" | "neutral" | "negative";
    control_effect: "positive" | "neutral" | "negative";
    escalation_effect: "positive" | "neutral" | "negative";
    coordination_effect: "positive" | "neutral" | "negative";
    documentation_effect: "positive" | "neutral" | "negative";
    notes?: string[];
  };
}

export interface DrillCheckpoint {
  phase: "initial" | "escalation";
  prompt: string;
  priorityFraming: string;
  escalationContext?: string | null;
  escalationVariants?: {
    alertInitiated: string;
    directIntervention: string;
    noAction: string;
  } | null;
  options: [DrillDecisionOption, DrillDecisionOption, DrillDecisionOption];
}

/** Decision impact replaces correct/wrong outcome framing */
export interface DrillDecisionImpact {
  /** What changes in the situation based on the type of decision made */
  highCoordinationPath: string;
  /** What changes when a moderate control action is taken */
  moderateControlPath: string;
  /** What changes when a high-exposure direct action is taken */
  highExposurePath: string;
}

export interface DrillContent {
  title: string;
  drillType: "micro" | "extended";
  scenarioType: string;
  preIncidentIndicator: string;
  escalationMoment: string;
  roleBasedActions: Array<{ role: string; action: string; rationale: string }>;
  communicationRequirement: { sender: string; recipient: string; message: string; trigger: string };
  /** Non-prescriptive: describes what each path leads to, not which is correct */
  decisionImpact: DrillDecisionImpact;
  durationMinutes: number;
  primaryThreatSignal: string;
  decisionPressure: string;
  behavioralCues: string[];
  objective: string;
  scenario: string;
  actd: {
    assess: { whatToNotice: string[]; signalsThatMatter: string[] };
    commit: { decisionRequired: string; hesitationRisks: string[] };
    takeAction: { availableActions: string[]; adaptabilityNote: string };
    debrief: { whatToDocument: string[]; whatToImprove: string[] };
  };
  // Micro drill fields
  responseOptions?: string[] | null;
  outcomeMap?: Record<string, {
    riskLevel?: string;
    consequence: string;
    tradeoff?: string;
    humanRealismNote?: string;
    coachingConnection?: string;
    likelyOutcome?: string;
    whyThisMatters?: string;
  }> | null;
  compressedGuidedResponse?: {
    howAnExpertReadsThis: string[];
    criticalDecision: string;
    mostLikelyMistake: string;
    bestNextMove: string;
  } | null;
  microDebriefQuestion?: string | null;
  /** Short debrief — 2–3 questions, awareness-focused, no grading */
  shortDebrief: string[];
  // Extended scenario fields
  exerciseType?: "tabletop" | "walkthrough" | "simulation" | null;
  facilitatorSetup?: { roomSetup: string; materialsNeeded: string[]; preExerciseBriefing: string } | null;
  injects?: Array<{
    injectNumber: number;
    timeMarker: string;
    event: string;
    expectedDecision: string;
    facilitatorNote: string;
  }> | null;
  participantRoles?: Array<{ role: string; briefing: string; keyDecision: string }> | null;
  criticalDecisions?: string[] | null;
  communicationsFlow?: { internalNotification: string; externalNotification: string; publicCommunication: string } | null;
  afterActionTemplate?: { strengthsPrompt: string; gapsPrompt: string; improvementActions: string; followUpDeadline: string } | null;
  guidedCheckpoints?: DrillCheckpoint[] | null;
  // Common
  executionInstructions: string[];
  expectedOutcomes: string[];
  commonBreakdowns: string[];
  debriefQuestions: string[];
  regulatoryAlignment: string[];
}

// ─── User Message Builder ──────────────────────────────────────────────────────

/**
 * Builds a varied, parameter-driven user message for the LLM.
 * Combines all inputs to produce a non-repetitive prompt that drives
 * scenario diversity across generations.
 */
export function buildDrillUserMessage(
  drillType: "micro" | "extended",
  params: DrillParameters,
  industry?: string,
  jurisdiction?: string,
  facilityContext?: string,
  userPrompt?: string,
): string {
  const typeLabel = drillType === "micro" ? "Micro Drill (1–2 minutes, single decision point)" : "Extended Scenario (10–15 minutes, multiple decision points, admin/facilitator use)";

  const indicatorList = params.behavioralIndicators.length > 0
    ? params.behavioralIndicators.map(b => `  • ${b}`).join("\n")
    : "  • (not specified — select from available indicators)";

  const customSection = userPrompt
    ? `\nCUSTOM SCENARIO DESCRIPTION (from user):\n${userPrompt}\n\nUse the above description as the narrative seed. Apply all parameters below to structure it into a full drill.`
    : "";

  return `DRILL TYPE: ${typeLabel}

SCENARIO PARAMETERS:
  Environment: ${params.environment}
  Threat Type: ${params.threatType}
  Behavioral Indicators:
${indicatorList}
  Response Pressure: ${params.responsePressure}
  Response Focus: ${params.responseFocus}
  Complexity Level: ${params.complexityLevel}

INDUSTRY: ${industry ?? "General workplace"}
JURISDICTION: ${jurisdiction ?? "United States"}
${facilityContext ? `\nFACILITY CONTEXT:\n${facilityContext}` : ""}${customSection}

GENERATION INSTRUCTIONS:
1. Use the parameters above as the PRIMARY driver of the scenario — not just the industry or environment.
2. The behavioral indicators listed must appear as specific, observable behaviors in the scenario text.
3. The response pressure must be embedded in the decision point — the participant must feel the pressure, not just read about it.
4. The response focus (${params.responseFocus.split(" — ")[0]}) must be the primary training goal of this drill.
5. Complexity level (${params.complexityLevel.split(" — ")[0]}) must determine how many competing signals and role conflicts appear.
6. DO NOT repeat the structure or phrasing of previously generated drills. Vary the setting, the individual's approach, the escalation trigger, and the decision framing.
7. All output must be non-prescriptive: describe decision tradeoffs and outcome trajectories, NOT correct vs. wrong answers.`;
}

// ─── Parameter Display Helpers ─────────────────────────────────────────────────

export const DRILL_PARAMETER_LABELS: Record<keyof DrillParameters, string> = {
  environment: "Environment",
  threatType: "Threat Type",
  behavioralIndicators: "Behavioral Indicators",
  responsePressure: "Response Pressure",
  responseFocus: "Response Focus",
  complexityLevel: "Complexity Level",
};

/** Returns a short display label for a behavioral indicator (strips the description after " — ") */
export function shortIndicatorLabel(indicator: string): string {
  return indicator.split(" — ")[0];
}

/** Returns a short display label for a complexity level */
export function shortComplexityLabel(level: string): string {
  return level.split(" — ")[0];
}

/** Returns a short display label for a response pressure */
export function shortPressureLabel(pressure: string): string {
  return pressure.split(" — ")[0];
}

/** Returns a short display label for a response focus */
export function shortFocusLabel(focus: string): string {
  return focus.split(" — ")[0];
}
