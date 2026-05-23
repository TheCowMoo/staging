/**
 * SafeGuard Action Engine — Phase 3
 *
 * Converts audit category gap data into a prioritized list of recommended
 * corrective actions. Each audit category has its own dedicated action
 * template so that every elevated/high-risk category produces a distinct
 * recommended action.
 *
 * Rules:
 *  - High/Critical risk level  → HIGH priority action
 *  - Elevated risk level       → MEDIUM priority action
 *  - Moderate/Low              → excluded (no action generated)
 *  - State modifier            → HIGH_REGULATION_STATES force HIGH on key actions
 *  - Industry modifier         → healthcare/retail add industry-specific actions
 *  - Output cap                → max 7 actions, sorted high → medium → low
 *  - No legal advice language
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ActionPriority = "high" | "medium" | "low";

export interface RecommendedAction {
  id: string;
  title: string;
  priority: ActionPriority;
  description: string;
  rationale: string;
  /** Optional: consequence of not addressing this gap */
  impact?: string;
  sourceLink?: { label: string; url: string };
}

interface ActionTemplate {
  id: string;
  title: string;
  /** Base priority before state/industry modifiers */
  basePriority: ActionPriority;
  description: string;
  rationale: string;
  /** Optional: consequence of not addressing this gap */
  impact?: string;
  sourceLink?: { label: string; url: string };
  /** Exact category name(s) from auditFramework.ts that trigger this action */
  triggeredByCategories: string[];
  /**
   * Minimum risk level required to trigger.
   * "Elevated" = Elevated, High, or Critical
   * "High"     = High or Critical only
   */
  triggerThreshold: "Elevated" | "High" | "Critical";
  /** If true, elevate to HIGH when facility is in a high-regulation state */
  elevateInHighRegStates?: boolean;
  /** Elevate to HIGH when facility industry matches */
  elevateForIndustries?: string[];
  /** Only include this action when facility industry matches */
  industryOnly?: string[];
}

// ── State regulation tier ─────────────────────────────────────────────────────

/**
 * States with enacted workplace violence prevention laws that impose specific
 * obligations (policy, training, reporting). Gaps in these states are treated
 * as higher priority.
 */
const HIGH_REGULATION_STATES = new Set([
  "CA", "NY", "WA", "IL", "NJ", "OR", "MD", "MN", "CT", "CO",
  "ME", "NV", "VT", "TX", "FL",
]);

// ── Industry normalizer ───────────────────────────────────────────────────────

function facilityTypeToIndustry(facilityType?: string | null): string {
  if (!facilityType) return "general";
  const t = facilityType.toLowerCase();
  if (t.includes("health") || t.includes("hospital") || t.includes("clinic") || t.includes("medical")) return "healthcare";
  if (t.includes("retail") || t.includes("store") || t.includes("shop")) return "retail";
  if (t.includes("school") || t.includes("education") || t.includes("university") || t.includes("college")) return "education";
  if (t.includes("government") || t.includes("public") || t.includes("municipal")) return "publicSector";
  return "general";
}

// ── Action catalog — one template per audit category ─────────────────────────

const ACTION_CATALOG: ActionTemplate[] = [

  // ── Operational Policies ──────────────────────────────────────────────────
  {
    id: "wvp_policy",
    title: "Create a Workplace Violence Prevention Policy",
    basePriority: "high",
    description:
      "Develop and adopt a written Workplace Violence Prevention Policy that defines prohibited conduct, reporting channels, investigation procedures, and non-retaliation protections. Distribute to all staff and post in common areas.",
    rationale:
      "A documented policy is the foundation of any prevention program and is required by law in California (SB 553), New York, Washington, and other states. Without it, employers have no enforceable standard and employees have no clear reporting path.",
    impact:
      "Organizations without a written policy have no consistent standard for identifying, reporting, or responding to threats. This gap increases exposure and complicates post-incident review.",
    sourceLink: {
      label: "OSHA Workplace Violence Prevention Programs",
      url: "https://www.osha.gov/workplace-violence",
    },
    triggeredByCategories: ["Operational Policies"],
    triggerThreshold: "Elevated",
    elevateInHighRegStates: true,
  },

  // ── Staff Awareness & Training ────────────────────────────────────────────
  {
    id: "staff_training",
    title: "Implement Workplace Violence Awareness Training",
    basePriority: "high",
    description:
      "Deliver annual workplace violence prevention training to all employees covering threat recognition, de-escalation techniques, reporting procedures, and emergency response. Document attendance and maintain training records.",
    rationale:
      "Training is the primary mechanism for converting policy into behavior. OSHA guidelines and state laws (CA SB 553, NY HERO Act, WA RCW 49.19) require documented training. Untrained staff are significantly less likely to recognize or report early warning signs.",
    impact:
      "Without training, staff may not recognize pre-incident warning signs, may respond incorrectly during an event, and may fail to report threats that could have been addressed earlier.",
    sourceLink: {
      label: "OSHA Workplace Violence Prevention Programs",
      url: "https://www.osha.gov/workplace-violence",
    },
    triggeredByCategories: ["Staff Awareness & Training"],
    triggerThreshold: "Elevated",
    elevateInHighRegStates: true,
  },

  // ── Incident Response Procedures ──────────────────────────────────────────
  {
    id: "incident_reporting",
    title: "Establish Formal Incident Reporting Procedures",
    basePriority: "medium",
    description:
      "Create a written incident reporting procedure that covers all threat types — physical assault, verbal threats, harassment, and near-misses. Designate a reporting point of contact, establish a response timeline, and ensure non-retaliation protections are communicated.",
    rationale:
      "Incidents that go unreported cannot be analyzed or prevented. OSHA recordkeeping requirements (Forms 300/300A/301) apply to workplace violence injuries. Consistent reporting also supports trend analysis and corrective action tracking.",
    impact:
      "Without a reporting procedure, incidents go undocumented, patterns go undetected, and the organization loses the ability to demonstrate corrective action — a key factor in regulatory and post-incident review.",
    sourceLink: {
      label: "OSHA Recordkeeping Forms",
      url: "https://www.osha.gov/recordkeeping/forms",
    },
    triggeredByCategories: ["Incident Response Procedures"],
    triggerThreshold: "Elevated",
  },

  // ── Access Control ────────────────────────────────────────────────────────
  {
    id: "access_control_upgrade",
    title: "Strengthen Access Control Systems and Procedures",
    basePriority: "high",
    description:
      "Audit all entry points and implement layered access controls: key card or fob systems for restricted areas, visitor sign-in and escort procedures, and clear visual distinction between public and restricted zones. Review and update access lists regularly.",
    rationale:
      "Uncontrolled access is a primary vulnerability in workplace violence incidents. Effective access control limits unauthorized entry, creates accountability for who is on-site, and supports rapid lockdown when needed.",
    impact:
      "Gaps in access control allow unauthorized individuals to enter restricted areas undetected, reducing the organization's ability to prevent or contain an incident.",
    sourceLink: {
      label: "CISA Workplace Security Resources",
      url: "https://www.cisa.gov/resources-tools/resources/preventing-workplace-violence-security-awareness-considerations-infographic",
    },
    triggeredByCategories: ["Access Control"],
    triggerThreshold: "Elevated",
    elevateInHighRegStates: true,
  },

  // ── Doors & Locks ─────────────────────────────────────────────────────────
  {
    id: "doors_locks_remediation",
    title: "Remediate Door and Lock Deficiencies",
    basePriority: "high",
    description:
      "Inspect all interior and exterior doors for proper hardware, self-closing mechanisms, and functioning locks. Repair or replace deficient hardware. Ensure all emergency exit doors are alarmed and that no security doors are propped open. Establish a door audit schedule.",
    rationale:
      "Doors and locks are the first physical barrier against unauthorized entry. Deficiencies — broken hardware, propped doors, non-locking classrooms — directly enable intrusion and impede lockdown response.",
    impact:
      "Deficient door hardware can prevent effective lockdown and allow unauthorized entry. During an active threat, even a brief delay in securing a space significantly affects outcomes.",
    sourceLink: {
      label: "CISA School Safety Resources",
      url: "https://www.cisa.gov/topics/school-violence",
    },
    triggeredByCategories: ["Doors & Locks"],
    triggerThreshold: "Elevated",
  },

  // ── Surveillance & Monitoring ─────────────────────────────────────────────
  {
    id: "surveillance_upgrade",
    title: "Implement or Upgrade Surveillance and Monitoring Systems",
    basePriority: "medium",
    description:
      "Assess current camera coverage and identify blind spots at entry points, parking areas, stairwells, and isolated corridors. Install or upgrade cameras with adequate resolution and retention. Ensure monitoring is active during all operating hours and that footage is accessible to security personnel.",
    rationale:
      "Surveillance systems deter incidents, support post-incident investigation, and provide real-time situational awareness. Gaps in coverage leave high-risk areas unmonitored and reduce the ability to detect pre-attack behavior.",
    impact:
      "Lack of monitoring increases vulnerability in high-risk areas and limits the organization's ability to investigate incidents or demonstrate due diligence after the fact.",
    sourceLink: {
      label: "CISA Workplace Security Awareness Resources",
      url: "https://www.cisa.gov/resources-tools/resources/preventing-workplace-violence-security-awareness-considerations-infographic",
    },
    triggeredByCategories: ["Surveillance & Monitoring"],
    triggerThreshold: "Elevated",
  },

  // ── Lighting & Visibility ─────────────────────────────────────────────────
  {
    id: "lighting_remediation",
    title: "Improve Lighting Coverage in High-Risk Areas",
    basePriority: "medium",
    description:
      "Conduct a lighting audit of all exterior areas, parking lots, stairwells, corridors, and building perimeter. Replace burned-out fixtures, upgrade to motion-activated lighting in low-traffic areas, and ensure minimum foot-candle standards are met. Prioritize areas identified as blind spots.",
    rationale:
      "Poor lighting is a well-documented CPTED (Crime Prevention Through Environmental Design) risk factor. Inadequate lighting conceals threats, discourages reporting of suspicious activity, and increases the perceived risk of the environment for employees.",
    impact:
      "Inadequate lighting can delay threat detection, reduce deterrence, and create conditions that increase risk for employees during low-visibility hours.",
    sourceLink: {
      label: "CISA Physical Security — Environmental Design",
      url: "https://www.cisa.gov/topics/physical-security",
    },
    triggeredByCategories: ["Lighting & Visibility", "Exterior Environment"],
    triggerThreshold: "Elevated",
  },

  // ── Parking Areas ─────────────────────────────────────────────────────────
  {
    id: "parking_area_safety",
    title: "Enhance Parking Area Safety and Monitoring",
    basePriority: "medium",
    description:
      "Evaluate parking areas for lighting adequacy, camera coverage, emergency call station placement, and pedestrian pathway visibility. Implement or improve patrols during high-risk hours (early morning, late evening). Consider designated safe escort procedures for employees working late shifts.",
    rationale:
      "Parking areas are among the highest-risk zones for workplace violence incidents, particularly assaults and vehicle-related threats. CPTED principles identify parking lot design as a critical vulnerability factor.",
    impact:
      "Lack of monitoring and poor design in parking areas increases vulnerability for employees and visitors, particularly during early morning and late evening hours.",
    sourceLink: {
      label: "CISA Physical Security Resources",
      url: "https://www.cisa.gov/topics/physical-security",
    },
    triggeredByCategories: ["Parking Areas"],
    triggerThreshold: "Elevated",
  },

  // ── Interior Layout & Visibility ──────────────────────────────────────────
  {
    id: "interior_layout_visibility",
    title: "Improve Interior Sightlines and Eliminate Blind Spots",
    basePriority: "medium",
    description:
      "Conduct an interior walkthrough to identify areas with obstructed sightlines, isolated corridors, or spaces where staff cannot be seen or heard. Rearrange furniture or fixtures to improve natural surveillance, install convex mirrors in blind-spot areas, and ensure reception desks have clear views of entry points.",
    rationale:
      "Interior layout directly affects the ability of staff to observe and respond to threats. CPTED principles identify natural surveillance — the ability to see and be seen — as a primary deterrent. Blind spots and isolated areas increase vulnerability.",
    impact:
      "Poor layout and visibility create opportunities for concealment and escalation, reducing staff awareness and slowing response when an incident develops.",
    sourceLink: {
      label: "CISA Physical Security — Environmental Design",
      url: "https://www.cisa.gov/topics/physical-security",
    },
    triggeredByCategories: ["Interior Layout & Visibility"],
    triggerThreshold: "Elevated",
  },

  // ── Escape & Evacuation ───────────────────────────────────────────────────
  {
    id: "escape_evacuation",
    title: "Develop and Practice Evacuation Procedures",
    basePriority: "medium",
    description:
      "Create written evacuation procedures for all threat scenarios (fire, active threat, medical emergency). Post evacuation maps at all exits. Designate assembly points and accountability procedures. Conduct at least one evacuation drill annually and document outcomes.",
    rationale:
      "Evacuation procedures are required under OSHA's Emergency Action Plan standard (29 CFR 1910.38). Without practiced procedures, employees are more likely to panic, take incorrect routes, or fail to account for all personnel during an incident.",
    impact:
      "Unpracticed evacuation procedures increase the likelihood of disorganized response, delayed accountability, and preventable injuries during an emergency.",
    sourceLink: {
      label: "OSHA Emergency Action Plans",
      url: "https://www.osha.gov/emergency-preparedness/guides/emergency-action-plan",
    },
    triggeredByCategories: ["Escape & Evacuation"],
    triggerThreshold: "Elevated",
  },

  // ── Lockdown Capability ───────────────────────────────────────────────────
  {
    id: "lockdown_capability",
    title: "Develop and Conduct Lockdown and Shelter-in-Place Drills",
    basePriority: "high",
    description:
      "Establish a written lockdown protocol covering initiation criteria, communication chain, room-securing procedures, and all-clear signals. Train all staff on the protocol. Conduct at least one lockdown drill annually, debrief participants, and document findings for improvement.",
    rationale:
      "Lockdown capability is a critical life-safety function. Without a practiced protocol, response times increase and staff may take actions that inadvertently expose others to harm. Many states and accreditation bodies require documented lockdown drills.",
    impact:
      "Without a practiced lockdown protocol, staff response during an active threat is slower and less coordinated, increasing the window of exposure for everyone in the facility.",
    sourceLink: {
      label: "CISA Active Shooter Preparedness",
      url: "https://www.cisa.gov/topics/physical-security/active-shooter-preparedness",
    },
    triggeredByCategories: ["Lockdown Capability"],
    triggerThreshold: "Elevated",
    elevateInHighRegStates: true,
  },

  // ── Communication Systems ─────────────────────────────────────────────────
  {
    id: "communication_systems",
    title: "Implement Reliable Emergency Communication Systems",
    basePriority: "medium",
    description:
      "Assess current communication capabilities for emergency scenarios: mass notification systems, two-way radios, panic buttons, and intercom coverage. Identify gaps and implement redundant communication channels. Ensure all staff know how to initiate an emergency alert.",
    rationale:
      "Communication failures during incidents significantly increase harm. Reliable, redundant communication systems enable rapid notification of staff, coordination with first responders, and faster incident containment.",
    impact:
      "Communication gaps during an incident delay staff notification and first responder coordination, extending the duration and potential impact of the event.",
    sourceLink: {
      label: "CISA Emergency Communications Resources",
      url: "https://www.cisa.gov/topics/emergency-communications",
    },
    triggeredByCategories: ["Communication Systems"],
    triggerThreshold: "Elevated",
  },

  // ── Vulnerable Populations ────────────────────────────────────────────────
  {
    id: "vulnerable_populations",
    title: "Implement Protections for Vulnerable Individuals",
    basePriority: "medium",
    description:
      "Identify employees or clients who may be at elevated risk — including those with disclosed domestic violence situations, individuals with disabilities, or those in high-conflict roles. Develop individualized safety plans, ensure HR and security are trained to respond, and establish confidential reporting channels.",
    rationale:
      "Vulnerable individuals face disproportionate risk in workplace violence incidents and require tailored protections. Domestic violence spillover into the workplace is a recognized OSHA concern. Failure to address this population leaves a significant gap in the overall prevention program.",
    impact:
      "Without targeted protections, vulnerable individuals remain at elevated risk that general prevention measures do not adequately address, increasing the likelihood of a preventable incident.",
    sourceLink: {
      label: "OSHA Workplace Violence — Worker Protection",
      url: "https://www.osha.gov/workplace-violence/worker-protection",
    },
    triggeredByCategories: ["Vulnerable Populations"],
    triggerThreshold: "Elevated",
  },

  // ── Exterior Environment ──────────────────────────────────────────────────
  {
    id: "exterior_cpted",
    title: "Apply CPTED Principles to Exterior Environment",
    basePriority: "medium",
    description:
      "Conduct a CPTED (Crime Prevention Through Environmental Design) assessment of the building exterior: trim overgrown vegetation that provides concealment, ensure clear sightlines from the street, install perimeter fencing or bollards where appropriate, and mark visitor pathways clearly to direct foot traffic to controlled entry points.",
    rationale:
      "The exterior environment is the first line of defense. CPTED principles — natural surveillance, natural access control, and territorial reinforcement — reduce opportunity for pre-attack surveillance and unauthorized approach.",
    impact:
      "Poor exterior design and layout can create opportunities for concealment and pre-attack surveillance, reducing the organization's ability to detect and deter threats before they reach the building.",
    sourceLink: {
      label: "CISA Physical Security Resources",
      url: "https://www.cisa.gov/topics/physical-security",
    },
    triggeredByCategories: ["Exterior Environment"],
    triggerThreshold: "Elevated",
  },

  // ── Healthcare-specific (industry only) ───────────────────────────────────
  {
    id: "healthcare_patient_violence",
    title: "Implement Healthcare-Specific Patient Violence Controls",
    basePriority: "high",
    description:
      "Establish a patient violence prevention program that includes: behavioral risk screening on admission, de-escalation training for clinical staff, panic button systems in patient care areas, a zero-tolerance policy for patient-on-staff violence, and a post-incident support process. Review compliance with OSHA's healthcare workplace violence guidelines.",
    rationale:
      "Healthcare workers face the highest rates of workplace violence of any sector. OSHA's Guidelines for Preventing Workplace Violence for Healthcare and Social Service Workers (Publication 3148) provide a framework. States including CA, IL, NJ, OR, and MD have enacted specific healthcare workplace violence prevention laws.",
    impact:
      "Without healthcare-specific controls, clinical staff remain at elevated risk from patient-directed violence — the most common form of healthcare workplace violence — and the organization may be out of compliance with applicable state law.",
    sourceLink: {
      label: "OSHA Healthcare Workplace Violence Resources",
      url: "https://www.osha.gov/healthcare/workplace-violence",
    },
    triggeredByCategories: ["Staff Awareness & Training", "Operational Policies", "Access Control", "Incident Response Procedures"],
    triggerThreshold: "Elevated",
    industryOnly: ["healthcare"],
  },

  // ── Retail-specific (industry only) ───────────────────────────────────────
  {
    id: "retail_robbery_prevention",
    title: "Implement Retail Robbery and Escalation Prevention Measures",
    basePriority: "medium",
    description:
      "Train customer-facing staff in de-escalation and robbery response. Implement cash handling procedures that minimize visible cash, install panic buttons at registers, ensure adequate camera coverage of checkout areas, and review compliance with the NY Retail Worker Safety Act or CA SB 553 if operating in those states.",
    rationale:
      "Retail workers face elevated risk from robbery, shoplifting escalation, and customer-directed violence. NY's Retail Worker Safety Act (2025) and CA's SB 553 impose specific training and policy requirements on retail employers.",
    impact:
      "Without retail-specific controls, customer-facing staff are more exposed to escalation incidents and the organization may be non-compliant with state-specific retail safety laws.",
    sourceLink: {
      label: "OSHA Workplace Violence in Retail",
      url: "https://www.osha.gov/workplace-violence/retail",
    },
    triggeredByCategories: ["Staff Awareness & Training", "Operational Policies"],
    triggerThreshold: "Elevated",
    industryOnly: ["retail"],
  },

  // ── EAP Coordinator (last in catalog — lowest selection priority) ────────────
  {
    id: "eap_coordinator",
    title: "Designate an Emergency Action Plan Coordinator",
    basePriority: "low",
    description:
      "Formally designate an EAP Coordinator responsible for maintaining the emergency action plan, coordinating drills, liaising with local law enforcement and emergency services, and ensuring all staff know their roles. Document the designation in writing and include in the EAP.",
    rationale:
      "OSHA's Emergency Action Plan standard (29 CFR 1910.38) requires a designated coordinator for facilities with more than 10 employees. Without a named coordinator, EAP maintenance tends to lapse and drills are not conducted consistently.",
    impact:
      "Without a designated coordinator, emergency planning responsibilities fall to no one in particular — resulting in outdated plans, missed drills, and staff who are uncertain about their roles during an incident.",
    sourceLink: {
      label: "OSHA Emergency Action Plans",
      url: "https://www.osha.gov/emergency-preparedness/guides/emergency-action-plan",
    },
    triggeredByCategories: ["Operational Policies", "Staff Awareness & Training", "Incident Response Procedures"],
    triggerThreshold: "High",
  },
];

// ── Risk level threshold mapping ──────────────────────────────────────────────

const RISK_LEVEL_ORDER: Record<string, number> = {
  Low: 0, Moderate: 1, Elevated: 2, High: 3, Critical: 4,
};

function meetsThreshold(riskLevel: string, threshold: "Elevated" | "High" | "Critical"): boolean {
  return (RISK_LEVEL_ORDER[riskLevel] ?? 0) >= (RISK_LEVEL_ORDER[threshold] ?? 2);
}

/**
 * Derive base priority from the actual risk level of the triggering category.
 * High/Critical → high; Elevated → medium.
 */
function derivePriorityFromRisk(riskLevel: string, basePriority: ActionPriority): ActionPriority {
  if (riskLevel === "Critical" || riskLevel === "High") return "high";
  if (riskLevel === "Elevated") return basePriority === "high" ? "high" : "medium";
  return basePriority;
}

// ── Priority sort order ───────────────────────────────────────────────────────

const PRIORITY_SORT: Record<ActionPriority, number> = { high: 0, medium: 1, low: 2 };

// ── Main engine function ──────────────────────────────────────────────────────

export interface ActionEngineInput {
  /** categoryScores from reportData — key is category name, value has riskLevel */
  categoryScores: Record<string, { riskLevel: string; percentage: number }>;
  /** 2-letter state code from facility.state (e.g. "CA", "NY") */
  facilityState?: string | null;
  /** facilityType from facility.facilityType (e.g. "healthcare", "retail") */
  facilityType?: string | null;
}

/**
 * Result type returned by generateRecommendedActions.
 * isFallback is true when no Elevated/High categories exist and the engine
 * fell back to Moderate-level or foundational actions.
 */
export interface ActionEngineResult {
  actions: RecommendedAction[];
  /** True when fallback logic was used (no Elevated or High categories found) */
  isFallback: boolean;
}

// ── Foundational fallback actions (always safe to show) ───────────────────────

const FALLBACK_ACTIONS: RecommendedAction[] = [
  {
    id: "fallback_training",
    title: "Implement Workplace Violence Awareness Training",
    priority: "medium",
    description:
      "Deliver annual workplace violence prevention training to all employees covering threat recognition, de-escalation techniques, reporting procedures, and emergency response. Document attendance and maintain training records.",
    rationale:
      "Training is the primary mechanism for converting policy into behavior. Even in lower-risk environments, trained staff are significantly more likely to recognize and report early warning signs before incidents escalate.",
    sourceLink: {
      label: "OSHA Workplace Violence Prevention Programs",
      url: "https://www.osha.gov/workplace-violence",
    },
  },
  {
    id: "fallback_incident_reporting",
    title: "Establish Formal Incident Reporting Procedures",
    priority: "medium",
    description:
      "Create a written incident reporting procedure covering all threat types — physical assault, verbal threats, harassment, and near-misses. Designate a reporting point of contact, establish a response timeline, and ensure non-retaliation protections are communicated.",
    rationale:
      "Incidents that go unreported cannot be analyzed or prevented. Consistent reporting supports trend analysis and corrective action tracking, even in facilities with currently low risk scores.",
    sourceLink: {
      label: "OSHA Recordkeeping Forms",
      url: "https://www.osha.gov/recordkeeping/forms",
    },
  },
  {
    id: "fallback_policy",
    title: "Review and Update Workplace Violence Prevention Policy",
    priority: "low",
    description:
      "Review the existing workplace violence prevention policy for completeness and currency. Ensure it covers prohibited conduct, reporting channels, investigation procedures, and non-retaliation protections. Redistribute to all staff annually.",
    rationale:
      "A current, distributed policy is the foundation of any prevention program. Annual review ensures the policy reflects any regulatory changes and remains relevant to the facility's current operations.",
    sourceLink: {
      label: "OSHA Workplace Violence Prevention Programs",
      url: "https://www.osha.gov/workplace-violence",
    },
  },
];

/**
 * Generates a prioritized list of recommended actions from audit gap data.
 *
 * Fallback tiers (applied when no Elevated/High categories exist):
 *  1. Moderate categories → generate up to 3 actions from matching templates
 *  2. All Low → return 2 foundational actions (training + incident reporting)
 *
 * Always returns at least 1 action. Sorted high → medium → low.
 * No legal advice language. No scoring logic changes.
 */
export function generateRecommendedActions(input: ActionEngineInput): ActionEngineResult {
  const { categoryScores, facilityState, facilityType } = input;
  const stateCode = (facilityState ?? "").toUpperCase();
  const industry = facilityTypeToIndustry(facilityType);
  const isHighRegState = HIGH_REGULATION_STATES.has(stateCode);

  // Determine the highest risk level present across all categories
  const maxRiskLevel = Object.values(categoryScores).reduce((max, s) => {
    return Math.max(max, RISK_LEVEL_ORDER[s.riskLevel] ?? 0);
  }, 0);

  // Determine effective threshold based on what risk levels exist
  // High/Critical → use Elevated threshold (normal mode)
  // Elevated only → use Elevated threshold (normal mode)
  // Moderate only → use Moderate threshold (fallback mode)
  // All Low → skip template matching, use foundational actions
  const isFallback = maxRiskLevel < RISK_LEVEL_ORDER["Elevated"];
  const effectiveThreshold: "Elevated" | "High" | "Critical" =
    maxRiskLevel >= RISK_LEVEL_ORDER["Elevated"] ? "Elevated" : "Elevated";

  // All-Low scenario: return foundational actions immediately
  if (maxRiskLevel < RISK_LEVEL_ORDER["Moderate"]) {
    return {
      actions: FALLBACK_ACTIONS.slice(0, 2),
      isFallback: true,
    };
  }

  const selected: RecommendedAction[] = [];
  const seenIds = new Set<string>();

  for (const template of ACTION_CATALOG) {
    // Industry-only filter: skip if this action requires a specific industry
    if (template.industryOnly && !template.industryOnly.includes(industry)) continue;

    // Find the highest-risk triggering category
    let highestRisk = "";
    let highestRiskLevel = 0;
    for (const catName of template.triggeredByCategories) {
      const score = categoryScores[catName];
      if (!score) continue;
      const level = RISK_LEVEL_ORDER[score.riskLevel] ?? 0;
      if (level > highestRiskLevel) {
        highestRiskLevel = level;
        highestRisk = score.riskLevel;
      }
    }

    // In fallback (Moderate-only) mode, lower the threshold to Moderate
    const threshold = isFallback ? "Moderate" : template.triggerThreshold;
    const meetsIt = isFallback
      ? (RISK_LEVEL_ORDER[highestRisk] ?? 0) >= RISK_LEVEL_ORDER["Moderate"]
      : meetsThreshold(highestRisk, template.triggerThreshold);
    if (!meetsIt) continue;

    // Deduplication
    if (seenIds.has(template.id)) continue;

    // Determine final priority
    // In fallback mode, cap priority at medium (nothing is truly high if no Elevated exists)
    let priority: ActionPriority = isFallback
      ? "low"
      : derivePriorityFromRisk(highestRisk, template.basePriority);

    if (!isFallback) {
      // State modifier: elevate to high if in a high-regulation state
      if (template.elevateInHighRegStates && isHighRegState && priority !== "high") {
        priority = "high";
      }
      // Industry modifier: elevate to high if industry matches
      if (template.elevateForIndustries?.includes(industry) && priority !== "high") {
        priority = "high";
      }
    }

    seenIds.add(template.id);
    selected.push({
      id: template.id,
      title: template.title,
      priority,
      description: template.description,
      rationale: template.rationale,
      impact: template.impact,
      sourceLink: template.sourceLink,
    });
  }

  // Sort: by risk level of triggering category (lowest score = most urgent within tier),
  // then by priority label, then alphabetically for stability
  const categoryPercentage = (action: RecommendedAction): number => {
    // Find the lowest percentage among triggering categories for this action
    const template = ACTION_CATALOG.find(t => t.id === action.id);
    if (!template) return 100;
    return Math.min(
      ...template.triggeredByCategories
        .map(cat => categoryScores[cat]?.percentage ?? 100)
        .filter(p => p < 100)
    );
  };

  selected.sort((a, b) => {
    const pd = PRIORITY_SORT[a.priority] - PRIORITY_SORT[b.priority];
    if (pd !== 0) return pd;
    // Within same priority: lowest score (most urgent) first
    const pa = categoryPercentage(a);
    const pb = categoryPercentage(b);
    if (pa !== pb) return pa - pb;
    return a.title.localeCompare(b.title);
  });

  // In fallback mode: cap at 3 actions to avoid overwhelming with low-priority items
  // Normal mode: cap at 5 strategic actions (keeps Risk Dashboard focused)
  const cap = isFallback ? 3 : 5;
  const finalActions = selected.slice(0, cap);

  // Guarantee minimum: if template matching yielded nothing, use foundational actions
  if (finalActions.length === 0) {
    return { actions: FALLBACK_ACTIONS.slice(0, 2), isFallback: true };
  }

  return { actions: finalActions, isFallback };
}

/**
 * Returns a map of audit category name → recommended action title.
 * Used by the Corrective Actions tab to show which strategic recommendation
 * each operational finding supports.
 */
export function getCategoryToRecommendationMap(
  actions: RecommendedAction[]
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const action of actions) {
    const template = ACTION_CATALOG.find((t) => t.id === action.id);
    if (!template) continue;
    for (const cat of template.triggeredByCategories) {
      if (!map[cat]) map[cat] = action.title;
    }
  }
  return map;
}

// ── Priority display helpers ──────────────────────────────────────────────────

export function getActionPriorityLabel(priority: ActionPriority): string {
  return { high: "High Priority", medium: "Medium Priority", low: "Lower Priority" }[priority];
}

export function getActionPriorityColor(priority: ActionPriority): string {
  return { high: "#ef4444", medium: "#f59e0b", low: "#84cc16" }[priority];
}

export function getActionPriorityBadgeClass(priority: ActionPriority): string {
  return {
    high: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
    low: "bg-lime-100 text-lime-700 dark:bg-lime-950/40 dark:text-lime-400 border border-lime-200 dark:border-lime-800",
  }[priority];
}
