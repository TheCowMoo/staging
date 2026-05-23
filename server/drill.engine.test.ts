/**
 * drill.engine.test.ts
 *
 * Unit tests for the unified ACTD drill engine.
 * Tests cover:
 *   - Drill type label map completeness
 *   - JSON schema field presence per drill type
 *   - Risk tier validation for micro drill outcomeMap
 *   - Type-specific field presence rules
 *   - ACTD language rules (no forbidden phrases)
 */
import { describe, it, expect } from "vitest";

// ─── Constants mirrored from routers.ts ──────────────────────────────────────
const DRILL_TYPE_LABELS: Record<string, string> = {
  micro:       "Micro Drill (1–3 min) — Mental rehearsal, Assess + Commit focus",
  guided:      "Guided Drill (3–7 min) — Light action, communication/environmental interaction",
  operational: "Operational Drill (7–15 min) — Coordinated execution, role clarity, team-based",
  extended:    "Extended Scenario (15+ min) — Tabletop or simulation",
};

const VALID_RISK_TIERS = [
  "Low Risk",
  "Moderate Risk",
  "Elevated Risk",
  "Introduces Additional Risk",
] as const;

const FORBIDDEN_ACTD_PHRASES = [
  "verbal cues",
  "unchecked entry",
  "non-compliance",
  "Run, Hide, Fight",
  "run hide fight",
];

// ─── Shared schema validator ──────────────────────────────────────────────────
function validateSharedSchema(drill: Record<string, unknown>) {
  const required = [
    "title", "drillType", "durationMinutes", "objective", "scenario",
    "actd", "executionInstructions", "expectedOutcomes",
    "commonBreakdowns", "debriefQuestions", "regulatoryAlignment",
  ];
  for (const field of required) {
    expect(drill, `Missing shared field: ${field}`).toHaveProperty(field);
  }
  const actd = drill.actd as Record<string, unknown>;
  expect(actd).toHaveProperty("assess");
  expect(actd).toHaveProperty("commit");
  expect(actd).toHaveProperty("takeAction");
  expect(actd).toHaveProperty("debrief");
}

// ─── Mock drill payloads ──────────────────────────────────────────────────────
const mockMicroDrill = {
  title: "Lobby Intruder — Rapid Decision Point",
  drillType: "micro",
  durationMinutes: 2,
  primaryThreatSignal: "Unauthorized entry — individual bypassed reception without acknowledgment",
  decisionPressure: "Bystanders present; uncertain whether threat is real",
  behavioralCues: ["Avoided eye contact", "Moved quickly past staff"],
  objective: "Practice rapid threat recognition and commit to a response under social pressure.",
  scenario: "A person enters the lobby without stopping at the front desk. They walk directly toward the elevator bank, ignoring the receptionist's greeting.",
  actd: {
    assess: {
      whatToNotice: ["Individual bypassed check-in without pausing"],
      signalsThatMatter: ["No badge visible", "Purposeful stride toward restricted area"],
    },
    commit: {
      decisionRequired: "Decide whether to intercept, alert security, or observe.",
      hesitationRisks: ["Delay allows deeper access to restricted space"],
    },
    takeAction: {
      availableActions: ["Alert security via radio", "Approach and redirect"],
      adaptabilityNote: "Adapt based on proximity and available support.",
    },
    debrief: {
      whatToDocument: ["Time of entry", "Physical description"],
      whatToImprove: ["Response time to unescorted visitors"],
    },
  },
  guidedResponse: null,
  responseOptions: [
    "Greet them loudly and ask if they need help",
    "Alert security immediately without engaging",
    "Follow them at a distance to observe",
    "Do nothing — assume they are an employee",
  ],
  outcomeMap: {
    "Greet them loudly and ask if they need help": {
      riskLevel: "Low Risk",
      consequence: "The individual pauses and either provides a legitimate reason or becomes visibly uncomfortable.",
      tradeoff: "Requires direct engagement which may feel confrontational.",
      humanRealismNote: "This feels socially awkward but is the most controlled response.",
      coachingConnection: "Verbal engagement creates a decision point for the individual and signals awareness.",
      likelyOutcome: "The individual either identifies themselves or retreats. Staff remains in control of the interaction.",
      whyThisMatters: "Early verbal engagement prevents deeper unauthorized access.",
    },
    "Alert security immediately without engaging": {
      riskLevel: "Low Risk",
      consequence: "Security responds while you maintain visual contact without escalating.",
      tradeoff: "Slightly slower resolution if security is not immediately available.",
      humanRealismNote: "This feels passive but is actually the most tactically sound option.",
      coachingConnection: "Delegating to trained security is the correct escalation path.",
      likelyOutcome: "Security intercepts the individual before they reach restricted areas.",
      whyThisMatters: "Proper escalation preserves staff safety and activates the right response chain.",
    },
    "Follow them at a distance to observe": {
      riskLevel: "Moderate Risk",
      consequence: "You gain information but place yourself in proximity to a potential threat.",
      tradeoff: "Observation without support increases personal exposure.",
      humanRealismNote: "This feels like responsible vigilance but can escalate your personal risk.",
      coachingConnection: "Observation is valuable only when you have a clear exit and support available.",
      likelyOutcome: "The individual moves deeper into the facility. You are now isolated with limited options.",
      whyThisMatters: "Following without backup narrows your response options significantly.",
    },
    "Do nothing — assume they are an employee": {
      riskLevel: "Elevated Risk",
      consequence: "The individual gains unrestricted access to the facility.",
      tradeoff: "Avoids social discomfort but removes all control from the situation.",
      humanRealismNote: "Social proof bias makes this feel reasonable — most people look like they belong.",
      coachingConnection: "Inaction is a decision. The cost of being wrong is disproportionately high.",
      likelyOutcome: "The individual reaches restricted areas undetected. The window for intervention closes.",
      whyThisMatters: "Normalcy bias is the most common failure mode in real threat scenarios.",
    },
  },
  compressedGuidedResponse: {
    howAnExpertReadsThis: [
      "The bypass of reception is the primary signal — not the person's appearance.",
    ],
    criticalDecision: "Intercept or escalate within the first 10 seconds of observation.",
    mostLikelyMistake: "Assuming the individual is an employee because they appear confident.",
    bestNextMove: "Greet loudly or alert security — either action creates accountability.",
  },
  microDebriefQuestion: "What assumption did you make before choosing your response, and was it based on evidence?",
  responsePaths: null,
  roleSpecificCues: null,
  documentationSection: null,
  teamRoles: null,
  scenarioTimeline: null,
  communicationCheckpoints: null,
  decisionBranches: null,
  exerciseType: null,
  facilitatorSetup: null,
  injects: null,
  participantRoles: null,
  criticalDecisions: null,
  communicationsFlow: null,
  afterActionTemplate: null,
  executionInstructions: ["Read scenario aloud", "Select one response option"],
  expectedOutcomes: ["Participant identifies primary threat signal"],
  commonBreakdowns: ["Normalcy bias causes inaction"],
  debriefQuestions: ["What was the first signal you noticed?"],
  regulatoryAlignment: ["OSHA", "CISA"],
};

const mockGuidedDrill = {
  title: "Escalating Visitor — Guided Response",
  drillType: "guided",
  durationMinutes: 5,
  primaryThreatSignal: "Escalating verbal agitation at reception",
  decisionPressure: "Other visitors present; unclear if threat is imminent",
  behavioralCues: ["Raised voice", "Refused to provide ID"],
  objective: "Practice de-escalation decision-making and documentation.",
  scenario: "A visitor arrives at reception demanding to see a specific employee. When told the employee is unavailable, the visitor's tone escalates. They begin pacing and refuse to provide identification. Other visitors in the lobby are watching.",
  actd: {
    assess: { whatToNotice: ["Escalating tone"], signalsThatMatter: ["Refusal to identify"] },
    commit: { decisionRequired: "Decide whether to attempt de-escalation or escalate to security.", hesitationRisks: ["Delay allows situation to escalate further"] },
    takeAction: { availableActions: ["Calmly redirect", "Alert security"], adaptabilityNote: "Adjust based on visitor's response to redirection." },
    debrief: { whatToDocument: ["Time, description, statements made"], whatToImprove: ["Response time to escalating visitors"] },
  },
  guidedResponse: {
    howAnExpertAssesses: ["Tone shift is the primary signal — not the initial request."],
    decisionMakingLens: ["Refusal to identify removes the ability to verify legitimacy."],
    actionConsiderations: ["De-escalation works only if the individual is still in a rational state."],
    commonHumanErrors: ["Attempting to reason with someone in an escalated emotional state."],
    performanceStandard: "Security is alerted within 60 seconds of the first refusal.",
  },
  guidedCheckpoints: [
    {
      phase: "initial" as const,
      prompt: "The visitor refuses to provide ID and begins pacing. What do you do?",
      priorityFraming: "Your priority: establish visibility and alert the response chain before the situation moves.",
      escalationContext: null,
      escalationVariants: null,
      options: [
        {
          label: "Alert security immediately",
          description: "Notify security via radio or phone while maintaining a calm demeanor at the desk.",
          riskLabel: "Low personal exposure, Coordination active, Moderate disruption, Subject likely to comply",
          outcome: "Security is en route and the visitor's attention shifts, but the situation is not resolved. You have bought time, not certainty — the next 90 seconds will determine whether the window holds.",
          tradeoff: "Gained time and backup presence; introduced a 2-minute window where the situation could escalate without direct oversight.",
          reasoning: "Supports the priority of establishing visibility and alerting the response chain. It does not require confrontation and keeps you out of a direct conflict, though the outcome depends on how quickly backup arrives.",
        },
        {
          label: "Attempt verbal de-escalation",
          description: "Calmly acknowledge the visitor's frustration and offer to leave a message for the employee.",
          riskLabel: "Moderate personal exposure, Delayed coordination, Low disruption, Moderate escalation risk",
          outcome: "The visitor's response is unpredictable. If they are still in a rational state, tone may soften. If not, continued engagement without backup accelerates the confrontation.",
          tradeoff: "Gained direct engagement and potential de-escalation; introduced personal exposure and delayed backup notification.",
          reasoning: "Partially supports the priority by maintaining engagement, but delays the formal response chain. Refusal to identify is a signal that rationality may already be compromised, making this approach higher risk than it appears.",
        },
        {
          label: "Ask the visitor to leave the premises",
          description: "Directly instruct the visitor to exit the building and return when they have an appointment.",
          riskLabel: "High personal exposure, No coordination, High disruption, Subject likely to escalate",
          outcome: "The direct instruction triggers a confrontational response. The visitor raises their voice further and other lobby occupants begin to move away. The situation escalates faster than security can respond.",
          tradeoff: "Gained a clear boundary-setting action; introduced confrontation risk without backup and accelerated the escalation timeline.",
          reasoning: "Conflicts with the priority because it forces a confrontation before the response chain is active. Issuing a direct command without security present removes your ability to de-escalate and delays the organization's formal response. Loss of clear incident documentation due to lack of early reporting is now a risk.",
        },
      ] as [any, any, any],
    },
    {
      phase: "escalation" as const,
      prompt: "Security has been alerted but has not yet arrived. The visitor is now raising their voice and other lobby occupants are visibly alarmed. What do you do?",
      priorityFraming: "Your priority: delay escalation and preserve your position until backup arrives.",
      escalationContext: "Security was alerted and is en route, but has not yet arrived. The visitor has moved closer to the desk and is now speaking loudly. Two other visitors in the lobby have moved toward the exit. The window of control established by your first decision is narrowing.",
      escalationVariants: {
        alertInitiated: "Security is en route but has not yet arrived. The visitor has noticed the response and is scanning the lobby exits. The window of control is narrowing — your position is still the primary anchor.",
        directIntervention: "After your direct engagement, the visitor stepped back but remains agitated and is now scanning the room. You are in a closer position with partial control and no backup confirmed.",
        noAction: "No formal alert has been initiated. The visitor has gained more freedom of movement and is now approaching the interior corridor. The response chain has not been activated and the situation is developing faster than expected.",
      },
      options: [
        {
          label: "Remain at the desk and maintain calm verbal contact",
          description: "Continue speaking calmly to the visitor, acknowledging their frustration without making promises.",
          riskLabel: "Moderate personal exposure, Coordination active, Moderate disruption, Subject likely to escalate",
          outcome: "Verbal contact keeps the visitor focused on you rather than the other occupants. Security is still not visible, and the situation has not stabilized — you are managing the window, not closing it.",
          tradeoff: "Gained continued situational awareness and de-escalation opportunity; introduced ongoing personal exposure until security arrives.",
          reasoning: "Supports the priority of delaying escalation and preserving position until backup arrives. Abandoning the desk can create a vacuum that the visitor fills with more aggressive behavior, though your personal exposure remains elevated.",
        },
        {
          label: "Step away from the desk and move toward other lobby occupants",
          description: "Calmly move toward the other visitors and guide them toward the exit or a secure area.",
          riskLabel: "Low personal exposure, Strong coordination, Low disruption, Subject likely to evade",
          outcome: "Other occupants are moved toward safety before security arrives. The visitor loses their primary focus point and redirects attention — the desk is now unattended and the visitor's next action is uncontrolled. Security has still not arrived and the situation is not stabilized.",
          tradeoff: "Gained bystander protection; introduced uncertainty about visitor's next action without a stabilizing presence.",
          reasoning: "Partially supports the priority by reducing bystander exposure, but removes the stabilizing anchor. This is appropriate if you assess the visitor as a physical threat, though it leaves the desk unattended and the visitor's next action uncontrolled.",
        },
        {
          label: "Attempt to physically block the visitor from advancing",
          description: "Position yourself between the visitor and the other lobby occupants.",
          riskLabel: "High personal exposure, No coordination, Operational disruption, High escalation risk",
          outcome: "Physical positioning without training or backup triggers a confrontational response. The organization's incident response protocol is now bypassed — no formal notification has been made, resulting in loss of clear incident documentation due to lack of early reporting. The situation is not stabilized and backup has not been confirmed.",
          tradeoff: "Gained a physical barrier for bystanders; introduced direct physical risk to yourself, bypassed incident notification, and accelerated the confrontation timeline.",
          reasoning: "Conflicts with the priority because it introduces direct physical confrontation before backup arrives. Physical intervention without training introduces direct personal risk and organizational liability. The incident is now occurring without a formal response chain in place.",
        },
      ] as [any, any, any],
    },
  ],
  responsePaths: null,
  decisionCheckpoints: null,
  roleSpecificCues: [
    { role: "Receptionist", cue: "Refusal to provide ID is the trigger for escalation." },
    { role: "Security", cue: "Pacing and raised voice are pre-attack indicators." },
  ],
  documentationSection: {
    whatToCapture: ["Time of arrival", "Physical description", "Statements made", "Actions taken"],
    timeframe: "Within 15 minutes of incident resolution",
  },
  responseOptions: null,
  outcomeMap: null,
  compressedGuidedResponse: null,
  microDebriefQuestion: null,
  teamRoles: null,
  scenarioTimeline: null,
  communicationCheckpoints: null,
  decisionBranches: null,
  exerciseType: null,
  facilitatorSetup: null,
  injects: null,
  participantRoles: null,
  criticalDecisions: null,
  communicationsFlow: null,
  afterActionTemplate: null,
  executionInstructions: ["Brief participants on scenario", "Assign roles"],
  expectedOutcomes: ["Participants identify escalation trigger"],
  commonBreakdowns: ["Attempting to reason during escalation"],
  debriefQuestions: ["What was the first signal that the situation was escalating?"],
  regulatoryAlignment: ["OSHA", "NFPA 3000"],
};

const mockOperationalDrill = {
  title: "Coordinated Lockout — Operational Drill",
  drillType: "operational",
  durationMinutes: 12,
  primaryThreatSignal: "Report of threatening individual near building perimeter",
  decisionPressure: "Incomplete information; threat location unconfirmed",
  behavioralCues: ["Perimeter alert from security camera", "Unknown individual circling building"],
  objective: "Practice coordinated lockout procedure with clear role assignments.",
  scenario: "Security receives a report of an unknown individual circling the building perimeter. The individual has been observed at two entry points. The threat level is unconfirmed. Staff are in the building.",
  actd: {
    assess: { whatToNotice: ["Perimeter breach pattern"], signalsThatMatter: ["Multiple entry point observations"] },
    commit: { decisionRequired: "Initiate lockout or continue observation.", hesitationRisks: ["Delay allows potential entry"] },
    takeAction: { availableActions: ["Initiate lockout", "Alert all staff", "Contact law enforcement"], adaptabilityNote: "Escalate to lockdown if individual attempts entry." },
    debrief: { whatToDocument: ["Timeline of observations", "Actions taken", "Communication log"], whatToImprove: ["Speed of lockout initiation"] },
  },
  guidedResponse: {
    howAnExpertAssesses: ["Pattern of movement at multiple entry points is the key signal."],
    decisionMakingLens: ["Incomplete information is not a reason to delay — initiate lockout and gather more data."],
    actionConsiderations: ["Lockout is a precautionary measure, not a declaration of threat."],
    commonHumanErrors: ["Waiting for confirmation before acting — confirmation may come too late."],
    performanceStandard: "Lockout initiated within 90 seconds of confirmed perimeter observation.",
  },
  teamRoles: [
    { role: "Security Lead", primaryAction: "Initiate lockout protocol and monitor entry points.", communicationTrigger: "Confirmed perimeter observation" },
    { role: "Floor Warden", primaryAction: "Notify staff on assigned floor and confirm accountability.", communicationTrigger: "Lockout announcement" },
    { role: "Admin Coordinator", primaryAction: "Contact law enforcement and document timeline.", communicationTrigger: "Security Lead confirmation" },
  ],
  scenarioTimeline: [
    { timeMarker: "T+0:00", event: "Security camera alert — unknown individual at east entrance.", expectedAction: "Security Lead notified." },
    { timeMarker: "T+1:30", event: "Individual observed at north entrance.", expectedAction: "Lockout initiated." },
    { timeMarker: "T+3:00", event: "All entry points secured.", expectedAction: "Staff accountability check begins." },
  ],
  communicationCheckpoints: [
    "Security Lead confirms lockout initiation to all wardens.",
    "Floor Wardens confirm staff accountability to Security Lead.",
    "Admin Coordinator confirms law enforcement contact.",
  ],
  decisionBranches: [
    {
      trigger: "Individual attempts to enter a secured door",
      ifYes: "Escalate to lockdown — notify law enforcement immediately.",
      ifNo: "Maintain lockout — continue monitoring.",
    },
  ],
  responseOptions: null,
  outcomeMap: null,
  compressedGuidedResponse: null,
  microDebriefQuestion: null,
  responsePaths: null,
  roleSpecificCues: null,
  documentationSection: null,
  exerciseType: null,
  facilitatorSetup: null,
  injects: null,
  participantRoles: null,
  criticalDecisions: null,
  communicationsFlow: null,
  afterActionTemplate: null,
  executionInstructions: ["Assign roles before drill begins", "Use radio communication"],
  expectedOutcomes: ["Lockout initiated within 90 seconds"],
  commonBreakdowns: ["Delayed initiation waiting for threat confirmation"],
  debriefQuestions: ["What was the trigger for initiating lockout?"],
  regulatoryAlignment: ["OSHA", "NFPA 3000", "DHS"],
};

const mockExtendedDrill = {
  title: "Active Threat Tabletop — Extended Scenario",
  drillType: "extended",
  durationMinutes: 45,
  primaryThreatSignal: "Reported active threat inside building",
  decisionPressure: "Multiple locations involved; incomplete information from multiple sources",
  behavioralCues: ["Reports of shots fired", "Staff sheltering in place on multiple floors"],
  objective: "Test organizational response to an active threat scenario through tabletop exercise.",
  scenario: "Reports of an active threat inside the building begin arriving from multiple floors simultaneously. Information is incomplete and conflicting. Leadership must coordinate response across departments.",
  actd: {
    assess: { whatToNotice: ["Multiple simultaneous reports"], signalsThatMatter: ["Conflicting information from different floors"] },
    commit: { decisionRequired: "Activate emergency response plan and assign ICS roles.", hesitationRisks: ["Delayed activation increases exposure"] },
    takeAction: { availableActions: ["Activate ERP", "Establish ICS command", "Contact law enforcement"], adaptabilityNote: "Adapt response as information becomes clearer." },
    debrief: { whatToDocument: ["Decision timeline", "Communication log", "Resource deployment"], whatToImprove: ["Information consolidation speed"] },
  },
  guidedResponse: {
    howAnExpertAssesses: ["Conflicting reports are expected in active threat scenarios — act on the most conservative interpretation."],
    decisionMakingLens: ["ICS activation is the first step — not information gathering."],
    actionConsiderations: ["Establish command before attempting to gather more information."],
    commonHumanErrors: ["Waiting for complete information before activating the response plan."],
    performanceStandard: "ICS command established within 3 minutes of first report.",
  },
  exerciseType: "tabletop",
  facilitatorSetup: {
    roomSetup: "Conference room with whiteboard. Participants seated by role.",
    materialsNeeded: ["Scenario cards", "Role briefing sheets", "Communication log template", "ICS chart"],
    preExerciseBriefing: "Remind participants this is a no-fault exercise. Decisions will be discussed, not judged.",
  },
  injects: [
    {
      injectNumber: 1,
      timeMarker: "T+0:00",
      event: "Report of shots fired on Floor 3.",
      expectedDecision: "Activate emergency response plan.",
      facilitatorNote: "Observe whether ICS roles are assigned immediately.",
    },
    {
      injectNumber: 2,
      timeMarker: "T+5:00",
      event: "Second report from Floor 5 — different location than Floor 3.",
      expectedDecision: "Expand response — multiple threat locations possible.",
      facilitatorNote: "Watch for information overload and decision paralysis.",
    },
    {
      injectNumber: 3,
      timeMarker: "T+12:00",
      event: "Law enforcement arrives and requests building layout.",
      expectedDecision: "Designate liaison to law enforcement.",
      facilitatorNote: "Test whether a designated liaison role exists in the plan.",
    },
  ],
  participantRoles: [
    { role: "Incident Commander", briefing: "You are responsible for overall response coordination.", keyDecision: "When to activate full lockdown vs. selective lockout." },
    { role: "Safety Officer", briefing: "You monitor staff accountability and safety.", keyDecision: "When to initiate evacuation for unaffected floors." },
    { role: "Communications Officer", briefing: "You manage all internal and external communications.", keyDecision: "What information to release to staff and when." },
  ],
  criticalDecisions: [
    "Activate full lockdown vs. selective lockout",
    "When to contact law enforcement",
    "How to handle conflicting reports from different floors",
    "When to initiate evacuation",
  ],
  communicationsFlow: {
    internalNotification: "All-staff alert via PA system and emergency notification app.",
    externalNotification: "911 call by designated Communications Officer.",
    publicCommunication: "No public statement until law enforcement clears the scene.",
  },
  afterActionTemplate: {
    strengthsPrompt: "What decisions were made quickly and correctly?",
    gapsPrompt: "Where did communication break down or decisions stall?",
    improvementActions: "List 3 specific changes to the emergency response plan.",
    followUpDeadline: "30 days from exercise date",
  },
  responseOptions: null,
  outcomeMap: null,
  compressedGuidedResponse: null,
  microDebriefQuestion: null,
  responsePaths: null,
  roleSpecificCues: null,
  documentationSection: null,
  teamRoles: null,
  scenarioTimeline: null,
  communicationCheckpoints: null,
  decisionBranches: null,
  executionInstructions: ["Assign roles before exercise", "Facilitator reads injects aloud"],
  expectedOutcomes: ["ICS command established within 3 minutes"],
  commonBreakdowns: ["Waiting for complete information before activating response"],
  debriefQuestions: ["What was the first decision made and why?"],
  regulatoryAlignment: ["OSHA", "NFPA 3000", "DHS", "CISA"],
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Drill Type Label Map", () => {
  it("contains all four drill types", () => {
    expect(Object.keys(DRILL_TYPE_LABELS)).toEqual(
      expect.arrayContaining(["micro", "guided", "operational", "extended"])
    );
  });

  it("each label includes duration range", () => {
    for (const [, label] of Object.entries(DRILL_TYPE_LABELS)) {
      expect(label).toMatch(/\d+/); // contains a number (duration)
    }
  });
});

describe("Shared Schema Validation", () => {
  it("micro drill passes shared schema", () => validateSharedSchema(mockMicroDrill));
  it("guided drill passes shared schema", () => validateSharedSchema(mockGuidedDrill));
  it("operational drill passes shared schema", () => validateSharedSchema(mockOperationalDrill));
  it("extended drill passes shared schema", () => validateSharedSchema(mockExtendedDrill));
});

describe("Micro Drill — Type-Specific Rules", () => {
  it("has responseOptions array", () => {
    expect(Array.isArray(mockMicroDrill.responseOptions)).toBe(true);
    expect(mockMicroDrill.responseOptions!.length).toBeGreaterThanOrEqual(2);
  });

  it("has outcomeMap with entries matching responseOptions", () => {
    expect(mockMicroDrill.outcomeMap).toBeTruthy();
    for (const option of mockMicroDrill.responseOptions!) {
      expect(mockMicroDrill.outcomeMap).toHaveProperty(option);
    }
  });

  it("each outcomeMap entry has all required fields", () => {
    const requiredFields = [
      "riskLevel", "consequence", "tradeoff", "humanRealismNote",
      "coachingConnection", "likelyOutcome", "whyThisMatters",
    ];
    for (const [, entry] of Object.entries(mockMicroDrill.outcomeMap!)) {
      for (const field of requiredFields) {
        expect(entry, `Missing outcomeMap field: ${field}`).toHaveProperty(field);
      }
    }
  });

  it("all riskLevel values are valid tiers", () => {
    for (const [, entry] of Object.entries(mockMicroDrill.outcomeMap!)) {
      expect(VALID_RISK_TIERS).toContain(entry.riskLevel);
    }
  });

  it("has compressedGuidedResponse with all 4 keys", () => {
    const cgr = mockMicroDrill.compressedGuidedResponse!;
    expect(cgr).toHaveProperty("howAnExpertReadsThis");
    expect(cgr).toHaveProperty("criticalDecision");
    expect(cgr).toHaveProperty("mostLikelyMistake");
    expect(cgr).toHaveProperty("bestNextMove");
    expect(Array.isArray(cgr.howAnExpertReadsThis)).toBe(true);
  });

  it("has microDebriefQuestion", () => {
    expect(typeof mockMicroDrill.microDebriefQuestion).toBe("string");
    expect(mockMicroDrill.microDebriefQuestion!.length).toBeGreaterThan(0);
  });

  it("guidedResponse is null for micro drills", () => {
    expect(mockMicroDrill.guidedResponse).toBeNull();
  });

  it("type-specific guided fields are null", () => {
    expect(mockMicroDrill.responsePaths).toBeNull();
    expect(mockMicroDrill.teamRoles).toBeNull();
    expect(mockMicroDrill.injects).toBeNull();
  });
});

describe("Guided Drill — Type-Specific Rules", () => {
  it("has guidedCheckpoints array with exactly 2 checkpoints", () => {
    expect(Array.isArray(mockGuidedDrill.guidedCheckpoints)).toBe(true);
    expect(mockGuidedDrill.guidedCheckpoints!.length).toBe(2);
  });

  it("first checkpoint has phase 'initial'", () => {
    expect(mockGuidedDrill.guidedCheckpoints![0].phase).toBe("initial");
  });

  it("second checkpoint has phase 'escalation'", () => {
    expect(mockGuidedDrill.guidedCheckpoints![1].phase).toBe("escalation");
  });

  it("escalation checkpoint has escalationContext", () => {
    const escalation = mockGuidedDrill.guidedCheckpoints![1];
    expect(escalation.escalationContext).toBeTruthy();
    expect(typeof escalation.escalationContext).toBe("string");
    expect((escalation.escalationContext as string).length).toBeGreaterThan(0);
  });

  it("each checkpoint has exactly 3 options", () => {
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      expect(cp.options).toHaveLength(3);
    }
  });

  it("each option has all required fields including riskLabel and tradeoff", () => {
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      for (const option of cp.options) {
        expect(option).toHaveProperty("label");
        expect(option).toHaveProperty("description");
        // New model uses riskLabel (contextual) instead of bare riskLevel
        expect(option).toHaveProperty("riskLabel");
        expect(option).toHaveProperty("outcome");
        expect(option).toHaveProperty("tradeoff");
        expect(option).toHaveProperty("reasoning");
        expect(typeof option.label).toBe("string");
        expect(option.label.length).toBeGreaterThan(0);
        expect(typeof option.outcome).toBe("string");
        expect(option.outcome.length).toBeGreaterThan(0);
        expect(typeof option.tradeoff).toBe("string");
        expect(option.tradeoff.length).toBeGreaterThan(0);
        expect(typeof option.reasoning).toBe("string");
        expect(option.reasoning.length).toBeGreaterThan(0);
      }
    }
  });

  it("each checkpoint has a valid prompt", () => {
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      expect(typeof cp.prompt).toBe("string");
      expect(cp.prompt.length).toBeGreaterThan(0);
    }
  });

  it("riskLabel uses standardized four-segment format with approved terms", () => {
    // Exact casing required — segments must match approved terms exactly
    const approvedExposure = ["Low personal exposure", "Moderate personal exposure", "High personal exposure", "Critical personal exposure"];
    const approvedControl = ["Strong coordination", "Coordination active", "Delayed coordination", "No coordination", "Immediate control attempt", "Loss of control"];
    const approvedOrgImpact = ["Low disruption", "Moderate disruption", "High disruption", "Operational disruption"];
    const approvedBehavior = ["Low escalation risk", "Moderate escalation risk", "High escalation risk", "Subject likely to comply", "Subject likely to evade", "Subject likely to escalate"];
    const bareTierLabels = ["Low Risk", "Moderate Risk", "Elevated Risk", "Introduces Additional Risk"];
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      for (const option of cp.options) {
        const label = option.riskLabel as string;
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(10);
        // Must not be a bare tier label
        expect(bareTierLabels).not.toContain(label);
        // Must use commas only (no semicolons)
        expect(label, `riskLabel "${label}" uses semicolons instead of commas`).not.toContain(";");
        // Must have exactly 3 commas (4 segments)
        const commaCount = (label.match(/,/g) || []).length;
        expect(commaCount, `riskLabel "${label}" must have exactly 3 commas (4 segments), found ${commaCount}`).toBe(3);
        const segments = label.split(",").map(s => s.trim()); // exact casing — no toLowerCase
        // Segment 1: Exposure (exact casing)
        expect(approvedExposure, `riskLabel segment 1 "${segments[0]}" is not an approved exposure term (check casing)`).toContain(segments[0]);
        // Segment 2: Control/Coordination (exact casing)
        expect(approvedControl, `riskLabel segment 2 "${segments[1]}" is not an approved control/coordination term (check casing)`).toContain(segments[1]);
        // Segment 3: Organizational Impact (exact casing)
        expect(approvedOrgImpact, `riskLabel segment 3 "${segments[2]}" is not an approved org impact term (check casing)`).toContain(segments[2]);
        // Segment 4: Behavior Risk (exact casing)
        expect(approvedBehavior, `riskLabel segment 4 "${segments[3]}" is not an approved behavior risk term (check casing)`).toContain(segments[3]);
      }
    }
  });

  it("tradeoff follows Gained/Introduced format", () => {
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      for (const option of cp.options) {
        const tradeoff = (option.tradeoff as string).toLowerCase();
        // Must contain both a gain and an introduction of risk
        const hasGain = tradeoff.includes("gained") || tradeoff.includes("preserv") || tradeoff.includes("maintain");
        const hasRisk = tradeoff.includes("introduc") || tradeoff.includes("risk") || tradeoff.includes("exposure") || tradeoff.includes("window");
        expect(hasGain, `tradeoff for "${option.label}" missing gain component`).toBe(true);
        expect(hasRisk, `tradeoff for "${option.label}" missing risk component`).toBe(true);
      }
    }
  });

  it("options within a checkpoint have distinct labels (not paraphrases)", () => {
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      const labels = cp.options.map((o: any) => o.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(3);
    }
  });

  it("outcomes are meaningfully different across options (consequence differentiation)", () => {
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      const outcomes = cp.options.map((o: any) => o.outcome.toLowerCase());
      // No two outcomes should be identical
      const uniqueOutcomes = new Set(outcomes);
      expect(uniqueOutcomes.size).toBe(3);
      // At least one outcome should indicate movement toward containment or managed control (strong action)
      // Strong outcomes now include friction language: "bought time", "en route", "managing the window"
      const hasContainment = outcomes.some((o: string) =>
        o.includes("controlled") || o.includes("resolution") || o.includes("stabiliz") || o.includes("security arrives") ||
        o.includes("en route") || o.includes("bought time") || o.includes("managing") || o.includes("window holds") ||
        o.includes("security is") || o.includes("attention shifts")
      );
      // At least one outcome should indicate escalation/risk (poor action)
      const hasEscalation = outcomes.some((o: string) =>
        o.includes("escalat") || o.includes("accelerat") || o.includes("altercation") || o.includes("confrontat") ||
        o.includes("unpredictable") || o.includes("bypassed") || o.includes("documentation") || o.includes("protocol")
      );
      expect(hasContainment, `Checkpoint "${cp.prompt}" missing a containment/resolution outcome`).toBe(true);
      expect(hasEscalation, `Checkpoint "${cp.prompt}" missing an escalation/risk outcome`).toBe(true);
    }
  });

  it("outcomes are grounded (no dramatic language)", () => {
    const dramaticWords = ["chaos", "panic", "catastrophic", "deadly", "fatal", "explosion"];
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      for (const option of cp.options) {
        const text = option.outcome.toLowerCase();
        for (const word of dramaticWords) {
          expect(text, `Dramatic word "${word}" found in outcome`).not.toContain(word);
        }
      }
    }
  });

  it("escalation checkpoint reflects increased pressure (has escalationContext)", () => {
    const escalation = mockGuidedDrill.guidedCheckpoints!.find((c: any) => c.phase === "escalation");
    expect(escalation).toBeTruthy();
    expect(escalation!.escalationContext).toBeTruthy();
  });

  it("escalation context references prior decision (partial decision continuity)", () => {
    const escalation = mockGuidedDrill.guidedCheckpoints!.find((c: any) => c.phase === "escalation");
    const ctx = (escalation!.escalationContext as string).toLowerCase();
    // Must reference prior decision context — not use "regardless of your previous choice"
    expect(ctx).not.toContain("regardless of your previous choice");
    // Must reference either security status, control window, or prior response
    const hasContinuity =
      ctx.includes("following your") ||
      ctx.includes("security") ||
      ctx.includes("window") ||
      ctx.includes("initial response") ||
      ctx.includes("en route") ||
      ctx.includes("established");
    expect(hasContinuity, "escalationContext does not reference prior decision context").toBe(true);
  });

  it("strong action outcomes contain friction (not fully resolved)", () => {
    // The first option in each checkpoint is the strong/effective action
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      const strongOutcome = cp.options[0].outcome.toLowerCase();
      // Must NOT claim full resolution
      const claimsFullResolution =
        strongOutcome.includes("fully resolved") ||
        strongOutcome.includes("situation is resolved") ||
        strongOutcome.includes("completely under control");
      expect(claimsFullResolution, `Strong outcome for checkpoint "${cp.prompt}" claims full resolution`).toBe(false);
      // Must contain some friction signal
      const hasFriction =
        strongOutcome.includes("not yet") ||
        strongOutcome.includes("not resolved") ||
        strongOutcome.includes("uncertainty") ||
        strongOutcome.includes("still") ||
        strongOutcome.includes("window") ||
        strongOutcome.includes("managing") ||
        strongOutcome.includes("depends") ||
        strongOutcome.includes("certainty");
      expect(hasFriction, `Strong outcome for checkpoint "${cp.prompt}" lacks friction signal`).toBe(true);
    }
  });

  it("poor action outcomes name a specific organizational consequence", () => {
    // The last option in each checkpoint is the poor/risk-introducing action
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      const poorOutcome = cp.options[2].outcome.toLowerCase();
      const hasOrgConsequence =
        poorOutcome.includes("documentation") ||
        poorOutcome.includes("notification") ||
        poorOutcome.includes("protocol") ||
        poorOutcome.includes("organizational") ||
        poorOutcome.includes("access") ||
        poorOutcome.includes("liability") ||
        poorOutcome.includes("response chain") ||
        poorOutcome.includes("bypassed") ||
        poorOutcome.includes("delayed") ||
        poorOutcome.includes("bystander") ||
        poorOutcome.includes("escalates faster") ||
        poorOutcome.includes("security can respond") ||
        poorOutcome.includes("confrontational response") ||
        poorOutcome.includes("lobby occupants");
      expect(hasOrgConsequence, `Poor outcome for checkpoint "${cp.prompt}" lacks a specific organizational consequence`).toBe(true);
    }
  });

  it("reasoning does not use absolute tone words (ideal, perfect, correct)", () => {
    const absoluteWords = ["ideal", "perfect", "the correct"];
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      for (const option of cp.options) {
        const reasoning = option.reasoning.toLowerCase();
        for (const word of absoluteWords) {
          expect(reasoning, `Absolute tone word "${word}" found in reasoning for "${option.label}"`).not.toContain(word);
        }
      }
    }
  });

  it("has roleSpecificCues array", () => {
    expect(Array.isArray(mockGuidedDrill.roleSpecificCues)).toBe(true);
    expect(mockGuidedDrill.roleSpecificCues!.length).toBeGreaterThan(0);
  });

  it("each roleSpecificCue has role and cue", () => {
    for (const cue of mockGuidedDrill.roleSpecificCues!) {
      expect(cue).toHaveProperty("role");
      expect(cue).toHaveProperty("cue");
    }
  });

  it("has documentationSection with whatToCapture and timeframe", () => {
    expect(mockGuidedDrill.documentationSection).toBeTruthy();
    expect(Array.isArray(mockGuidedDrill.documentationSection!.whatToCapture)).toBe(true);
    expect(typeof mockGuidedDrill.documentationSection!.timeframe).toBe("string");
  });

  it("has full guidedResponse with all 5 sections", () => {
    const gr = mockGuidedDrill.guidedResponse!;
    expect(gr).toHaveProperty("howAnExpertAssesses");
    expect(gr).toHaveProperty("decisionMakingLens");
    expect(gr).toHaveProperty("actionConsiderations");
    expect(gr).toHaveProperty("commonHumanErrors");
    expect(gr).toHaveProperty("performanceStandard");
  });

  it("micro-specific fields are null", () => {
    expect(mockGuidedDrill.responseOptions).toBeNull();
    expect(mockGuidedDrill.outcomeMap).toBeNull();
    expect(mockGuidedDrill.compressedGuidedResponse).toBeNull();
    expect(mockGuidedDrill.microDebriefQuestion).toBeNull();
  });

  it("old responsePaths and decisionCheckpoints fields are null (replaced by guidedCheckpoints)", () => {
    expect(mockGuidedDrill.responsePaths).toBeNull();
    expect(mockGuidedDrill.decisionCheckpoints).toBeNull();
  });

  it("each checkpoint has a priorityFraming field starting with 'Your priority:'", () => {
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      expect(typeof cp.priorityFraming).toBe("string");
      expect((cp.priorityFraming as string).toLowerCase()).toMatch(/^your priority/);
    }
  });

  it("escalation checkpoint has escalationVariants with all three keys", () => {
    const escalation = mockGuidedDrill.guidedCheckpoints!.find((c: any) => c.phase === "escalation");
    expect(escalation).toBeTruthy();
    const variants = escalation!.escalationVariants as any;
    expect(variants).toBeTruthy();
    expect(typeof variants.alertInitiated).toBe("string");
    expect(typeof variants.directIntervention).toBe("string");
    expect(typeof variants.noAction).toBe("string");
    // Each variant must be meaningfully different
    const unique = new Set([variants.alertInitiated, variants.directIntervention, variants.noAction]);
    expect(unique.size).toBe(3);
  });

  it("initial checkpoint has null escalationVariants", () => {
    const initial = mockGuidedDrill.guidedCheckpoints!.find((c: any) => c.phase === "initial");
    expect(initial).toBeTruthy();
    expect(initial!.escalationVariants).toBeNull();
  });

  it("outcomes include active subject reaction (not passive subject)", () => {
    const activeReactionWords = ["hesitates", "redirects", "evades", "escalates", "complies", "tests", "moves", "raises", "steps", "scanning", "noticed", "adjusted", "advancing", "confrontational", "agitated", "focused", "attention shifts", "shifts", "responds", "reacts", "redirected", "unpredictable", "triggers", "loses"];
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      for (const option of cp.options) {
        const outcome = option.outcome.toLowerCase();
        const hasSubjectReaction = activeReactionWords.some(word => outcome.includes(word));
        expect(hasSubjectReaction, `Outcome for "${option.label}" lacks active subject reaction`).toBe(true);
      }
    }
  });

  it("riskLabel reflects multi-dimensional risk (personal, org, and subject reaction)", () => {
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      for (const option of cp.options) {
        const label = (option.riskLabel as string).toLowerCase();
        // Must contain at least one personal/org/subject signal
        const hasRiskDimension =
          label.includes("personal") || label.includes("exposure") || label.includes("containment") ||
          label.includes("protocol") || label.includes("notification") || label.includes("subject") ||
          label.includes("reaction") || label.includes("backup") || label.includes("distance") ||
          label.includes("bystander") || label.includes("control") || label.includes("anchor") ||
          label.includes("engagement") || label.includes("escalat");
        expect(hasRiskDimension, `riskLabel "${option.riskLabel}" lacks risk dimension signal`).toBe(true);
      }
    }
  });

  it("no option is framed as purely safe (every riskLabel implies some tradeoff)", () => {
    const pureSafeLabels = ["safe", "no risk", "zero risk", "completely safe"];
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      for (const option of cp.options) {
        const label = (option.riskLabel as string).toLowerCase();
        for (const safe of pureSafeLabels) {
          expect(label, `riskLabel "${option.riskLabel}" is framed as purely safe`).not.toContain(safe);
        }
      }
    }
  });

  // ─── ACCEPTANCE CRITERIA: CAUSALITY ─────────────────────────────────────────
  it("ACCEPT: causality — escalation variants are distinct (not identical text)", () => {
    const escalation = mockGuidedDrill.guidedCheckpoints!.find((c: any) => c.phase === "escalation");
    const variants = escalation!.escalationVariants as any;
    expect(variants).toBeTruthy();
    // All three variants must be unique strings
    expect(variants.alertInitiated).not.toBe(variants.directIntervention);
    expect(variants.alertInitiated).not.toBe(variants.noAction);
    expect(variants.directIntervention).not.toBe(variants.noAction);
  });

  it("ACCEPT: causality — escalation variants do not use any banned transition phrase", () => {
    const escalation = mockGuidedDrill.guidedCheckpoints!.find((c: any) => c.phase === "escalation");
    const variants = escalation!.escalationVariants as any;
    const allVariantText = [
      variants.alertInitiated,
      variants.directIntervention,
      variants.noAction,
      escalation!.escalationContext ?? "",
    ].join(" ").toLowerCase();
    const bannedPhrases = [
      "regardless of your previous choice",
      "regardless of your previous action",
      "the situation has progressed",
      "the situation has progressed significantly",
      "the situation has developed",
      "the situation has evolved",
      "the situation has changed",
      "based on your previous action",
      "based on your previous choice",
      "following your previous action",
      "following your previous decision",
      "following your previous choice",
      "as a result of your previous action",
      "as a result of your previous choice",
      "things have escalated",
      "the scenario has advanced",
    ];
    for (const phrase of bannedPhrases) {
      expect(allVariantText, `Banned transition phrase found: "${phrase}"`).not.toContain(phrase);
    }
  });

  it("ACCEPT: causality — each variant reflects a distinct situational state", () => {
    const escalation = mockGuidedDrill.guidedCheckpoints!.find((c: any) => c.phase === "escalation");
    const variants = escalation!.escalationVariants as any;
    // alertInitiated must reference security/response chain being active
    const alertText = variants.alertInitiated.toLowerCase();
    const hasAlertSignal = alertText.includes("security") || alertText.includes("en route") ||
      alertText.includes("notif") || alertText.includes("response chain") || alertText.includes("window");
    expect(hasAlertSignal, "alertInitiated variant does not reference active response chain").toBe(true);
    // noAction must reference absence of alert or response chain
    const noActionText = variants.noAction.toLowerCase();
    const hasNoActionSignal = noActionText.includes("no alert") || noActionText.includes("no formal") ||
      noActionText.includes("not been activated") || noActionText.includes("without") ||
      noActionText.includes("no backup") || noActionText.includes("no notification");
    expect(hasNoActionSignal, "noAction variant does not reference absence of response chain").toBe(true);
  });

  // ─── ACCEPTANCE CRITERIA: INTERACTIVITY ─────────────────────────────────────
  it("ACCEPT: interactivity — all checkpoints have exactly 3 selectable options", () => {
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      expect(cp.options.length).toBe(3);
      // All options must have label and description (selectable)
      for (const option of cp.options) {
        expect(typeof option.label).toBe("string");
        expect(option.label.length).toBeGreaterThan(0);
        expect(typeof option.description).toBe("string");
      }
    }
  });

  it("ACCEPT: interactivity — checkpoints have independent state (no cross-checkpoint locking)", () => {
    // Verify that checkpoint 2 is not structurally dependent on checkpoint 1 selection
    // Both checkpoints must have their own options array with full data
    const initial = mockGuidedDrill.guidedCheckpoints!.find((c: any) => c.phase === "initial");
    const escalation = mockGuidedDrill.guidedCheckpoints!.find((c: any) => c.phase === "escalation");
    expect(initial!.options.length).toBe(3);
    expect(escalation!.options.length).toBe(3);
    // Each option in checkpoint 2 must have its own full outcome (not dependent on cp1)
    for (const option of escalation!.options) {
      expect(typeof option.outcome).toBe("string");
      expect(option.outcome.length).toBeGreaterThan(20);
    }
  });

  // ─── ACCEPTANCE CRITERIA: OPTION DIFFERENTIATION ────────────────────────────
  it("ACCEPT: differentiation — option labels are distinct (no duplicates or near-duplicates)", () => {
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      const labels = cp.options.map((o: any) => o.label.toLowerCase().trim());
      const unique = new Set(labels);
      expect(unique.size).toBe(3);
    }
  });

  it("ACCEPT: differentiation — outcomes are distinct across options", () => {
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      const outcomes = cp.options.map((o: any) => o.outcome.toLowerCase().trim());
      const unique = new Set(outcomes);
      expect(unique.size).toBe(3);
    }
  });

  // ─── ACCEPTANCE CRITERIA: PRIORITY ALIGNMENT ────────────────────────────────
  it("ACCEPT: priority alignment — each checkpoint has a priorityFraming field", () => {
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      expect(typeof cp.priorityFraming).toBe("string");
      expect(cp.priorityFraming.length).toBeGreaterThan(10);
    }
  });

  it("ACCEPT: priority alignment — reasoning references priority alignment statement", () => {
    // Each option's reasoning must contain a priority alignment signal
    const alignmentSignals = [
      "supports the", "partially supports", "conflicts with",
      "supports the priority", "supports the stated priority",
      "effective in this context", "strong option given", "appropriate given",
      "priority of", "advances the",
    ];
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      for (const option of cp.options) {
        const reasoning = option.reasoning.toLowerCase();
        const hasAlignment = alignmentSignals.some(signal => reasoning.includes(signal));
        expect(hasAlignment, `Reasoning for "${option.label}" does not reference priority alignment`).toBe(true);
      }
    }
  });

  // ─── ACCEPTANCE CRITERIA: PASSIVE LANGUAGE BAN ──────────────────────────────
  it("ACCEPT: language quality — no passive situation language in outcomes", () => {
    const passivePhrases = [
      "the situation progresses",
      "the situation develops",
      "the situation evolves",
      "the situation continues",
    ];
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      for (const option of cp.options) {
        const outcome = option.outcome.toLowerCase();
        for (const phrase of passivePhrases) {
          expect(outcome, `Passive phrase "${phrase}" found in outcome for "${option.label}"`).not.toContain(phrase);
        }
      }
    }
  });

  // ─── ACCEPTANCE CRITERIA: THEATRICAL LANGUAGE BAN ───────────────────────────
  it("ACCEPT: option realism — no theatrical language in options or outcomes", () => {
    const theatricalPhrases = [
      "yell", "shout loudly", "scream", "dramatic confrontation",
      "call out loudly", "charge at", "tackle",
    ];
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      for (const option of cp.options) {
        const allText = [
          option.label, option.description, option.outcome, option.reasoning,
        ].join(" ").toLowerCase();
        for (const phrase of theatricalPhrases) {
          expect(allText, `Theatrical phrase "${phrase}" found in option "${option.label}"`).not.toContain(phrase);
        }
      }
    }
  });

  // ─── ACCEPTANCE CRITERIA: OUTCOME REALISM ───────────────────────────────────
  it("ACCEPT: outcome realism — all outcomes include continued risk or uncertainty", () => {
    const frictionSignals = [
      "not yet", "not resolved", "uncertainty", "still", "window",
      "managing", "depends", "certainty", "unconfirmed", "partial",
      "narrowing", "not confirmed", "not visible", "not stabilized",
      "not closed", "not activated", "faster than",
    ];
    for (const cp of mockGuidedDrill.guidedCheckpoints!) {
      for (const option of cp.options) {
        const outcome = option.outcome.toLowerCase();
        const hasFriction = frictionSignals.some(signal => outcome.includes(signal));
        expect(hasFriction, `Outcome for "${option.label}" lacks continued risk or uncertainty signal`).toBe(true);
      }
    }
  });
});

describe("Operational Drill — Type-Specific Rules", () => {
  it("has teamRoles array", () => {
    expect(Array.isArray(mockOperationalDrill.teamRoles)).toBe(true);
    expect(mockOperationalDrill.teamRoles!.length).toBeGreaterThan(0);
  });

  it("each teamRole has role, primaryAction, communicationTrigger", () => {
    for (const role of mockOperationalDrill.teamRoles!) {
      expect(role).toHaveProperty("role");
      expect(role).toHaveProperty("primaryAction");
      expect(role).toHaveProperty("communicationTrigger");
    }
  });

  it("has scenarioTimeline array", () => {
    expect(Array.isArray(mockOperationalDrill.scenarioTimeline)).toBe(true);
    expect(mockOperationalDrill.scenarioTimeline!.length).toBeGreaterThan(0);
  });

  it("each timeline entry has timeMarker, event, expectedAction", () => {
    for (const entry of mockOperationalDrill.scenarioTimeline!) {
      expect(entry).toHaveProperty("timeMarker");
      expect(entry).toHaveProperty("event");
      expect(entry).toHaveProperty("expectedAction");
    }
  });

  it("has communicationCheckpoints array", () => {
    expect(Array.isArray(mockOperationalDrill.communicationCheckpoints)).toBe(true);
    expect(mockOperationalDrill.communicationCheckpoints!.length).toBeGreaterThan(0);
  });

  it("has decisionBranches with trigger/ifYes/ifNo", () => {
    expect(Array.isArray(mockOperationalDrill.decisionBranches)).toBe(true);
    for (const branch of mockOperationalDrill.decisionBranches!) {
      expect(branch).toHaveProperty("trigger");
      expect(branch).toHaveProperty("ifYes");
      expect(branch).toHaveProperty("ifNo");
    }
  });

  it("micro-specific fields are null", () => {
    expect(mockOperationalDrill.responseOptions).toBeNull();
    expect(mockOperationalDrill.outcomeMap).toBeNull();
    expect(mockOperationalDrill.compressedGuidedResponse).toBeNull();
  });
});

describe("Extended Drill — Type-Specific Rules", () => {
  it("has valid exerciseType", () => {
    expect(["tabletop", "walkthrough", "simulation"]).toContain(mockExtendedDrill.exerciseType);
  });

  it("has facilitatorSetup with all fields", () => {
    const fs = mockExtendedDrill.facilitatorSetup!;
    expect(fs).toHaveProperty("roomSetup");
    expect(Array.isArray(fs.materialsNeeded)).toBe(true);
    expect(fs).toHaveProperty("preExerciseBriefing");
  });

  it("has at least 3 injects", () => {
    expect(Array.isArray(mockExtendedDrill.injects)).toBe(true);
    expect(mockExtendedDrill.injects!.length).toBeGreaterThanOrEqual(3);
  });

  it("each inject has all required fields", () => {
    for (const inject of mockExtendedDrill.injects!) {
      expect(inject).toHaveProperty("injectNumber");
      expect(inject).toHaveProperty("timeMarker");
      expect(inject).toHaveProperty("event");
      expect(inject).toHaveProperty("expectedDecision");
      expect(inject).toHaveProperty("facilitatorNote");
    }
  });

  it("injects are in ascending order by injectNumber", () => {
    const numbers = mockExtendedDrill.injects!.map(i => i.injectNumber);
    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i]).toBeGreaterThan(numbers[i - 1]);
    }
  });

  it("has participantRoles with briefing and keyDecision", () => {
    expect(Array.isArray(mockExtendedDrill.participantRoles)).toBe(true);
    for (const pr of mockExtendedDrill.participantRoles!) {
      expect(pr).toHaveProperty("role");
      expect(pr).toHaveProperty("briefing");
      expect(pr).toHaveProperty("keyDecision");
    }
  });

  it("has criticalDecisions array with at least 3 items", () => {
    expect(Array.isArray(mockExtendedDrill.criticalDecisions)).toBe(true);
    expect(mockExtendedDrill.criticalDecisions!.length).toBeGreaterThanOrEqual(3);
  });

  it("has communicationsFlow with all 3 channels", () => {
    const cf = mockExtendedDrill.communicationsFlow!;
    expect(cf).toHaveProperty("internalNotification");
    expect(cf).toHaveProperty("externalNotification");
    expect(cf).toHaveProperty("publicCommunication");
  });

  it("has afterActionTemplate with all 4 fields", () => {
    const aat = mockExtendedDrill.afterActionTemplate!;
    expect(aat).toHaveProperty("strengthsPrompt");
    expect(aat).toHaveProperty("gapsPrompt");
    expect(aat).toHaveProperty("improvementActions");
    expect(aat).toHaveProperty("followUpDeadline");
  });

  it("micro-specific fields are null", () => {
    expect(mockExtendedDrill.responseOptions).toBeNull();
    expect(mockExtendedDrill.outcomeMap).toBeNull();
    expect(mockExtendedDrill.compressedGuidedResponse).toBeNull();
  });
});

describe("ACTD Language Rules", () => {
  const allDrills = [mockMicroDrill, mockGuidedDrill, mockOperationalDrill, mockExtendedDrill];

  it("no drill contains forbidden ACTD phrases", () => {
    for (const drill of allDrills) {
      const drillText = JSON.stringify(drill).toLowerCase();
      for (const phrase of FORBIDDEN_ACTD_PHRASES) {
        expect(drillText, `Forbidden phrase found in ${drill.drillType}: "${phrase}"`).not.toContain(phrase.toLowerCase());
      }
    }
  });

  it("all drills have primaryThreatSignal", () => {
    for (const drill of allDrills) {
      expect(typeof drill.primaryThreatSignal).toBe("string");
      expect(drill.primaryThreatSignal!.length).toBeGreaterThan(0);
    }
  });

  it("all drills have decisionPressure", () => {
    for (const drill of allDrills) {
      expect(typeof drill.decisionPressure).toBe("string");
      expect(drill.decisionPressure!.length).toBeGreaterThan(0);
    }
  });

  it("all drills have behavioralCues array", () => {
    for (const drill of allDrills) {
      expect(Array.isArray(drill.behavioralCues)).toBe(true);
      expect(drill.behavioralCues!.length).toBeGreaterThan(0);
    }
  });
});

describe("Regulatory Alignment", () => {
  it("all drills include at least one regulatory standard", () => {
    const allDrills = [mockMicroDrill, mockGuidedDrill, mockOperationalDrill, mockExtendedDrill];
    for (const drill of allDrills) {
      expect(Array.isArray(drill.regulatoryAlignment)).toBe(true);
      expect(drill.regulatoryAlignment.length).toBeGreaterThan(0);
    }
  });
});
