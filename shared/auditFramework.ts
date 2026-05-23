// Five Stones Technology — Workplace Violence Threat Assessment Framework
// Aligned with: OSHA Workplace Violence Prevention, CISA Risk Principles, NFPA 3000

// ─── Decision-Tree Response Model ────────────────────────────────────────────

/**
 * Step 1: Primary response — always shown first.
 * "Yes" = condition is met (good for positive polarity, bad for negative).
 * "No"  = condition is NOT met (bad for positive, good for negative).
 */
export const PRIMARY_RESPONSES = ["Yes", "No", "Unknown", "Not Applicable"] as const;
export type PrimaryResponse = typeof PRIMARY_RESPONSES[number];

// "Unavoidable" is now a condition type checkbox in Step 3, not a primary response.

/**
 * Step 2: Concern level — shown when the answer indicates a deficiency.
 * Positive polarity + "No" → concern level required.
 * Negative polarity + "Yes" → concern level required.
 * "Unknown" → concern level optional (defaults to "Unknown" in scoring).
 */
export const CONCERN_LEVELS = ["Minor", "Moderate", "Serious"] as const;
export type ConcernLevel = typeof CONCERN_LEVELS[number];

/**
 * Step 3: Condition type — contextual descriptor of the observed condition.
 */
export const CONDITION_TYPES = [
  "Physical Deficiency",
  "Policy Gap",
  "Training Gap",
  "Equipment Failure",
  "Procedural Gap",
  "Structural Constraint",
  "Visibility / Sightline Issue",
  "Lighting Deficiency",
  "Access Control Weakness",
  "Communication Gap",
  "Documentation Missing",
  "Unavoidable",
  "Other",
] as const;
export type ConditionType = typeof CONDITION_TYPES[number];

// Condition types that indicate a structural/permanent constraint (excluded from corrective actions)
export const UNAVOIDABLE_CONDITION_TYPES: readonly ConditionType[] = ["Structural Constraint", "Unavoidable"];

/**
 * Derive a numeric risk score from the decision-tree response.
 *
 * Positive polarity ("Yes" = good):
 *   Yes           → 0
 *   No + Minor    → 1
 *   No + Moderate → 2
 *   No + Serious  → 3
 *   No (no level) → 2  (default moderate)
 *   Unknown       → 1
 *   N/A           → null
 *   Unavoidable   → null
 *
 * Negative polarity ("Yes" = bad):
 *   No            → 0
 *   Yes + Minor   → 1
 *   Yes + Moderate→ 2
 *   Yes + Serious → 3
 *   Yes (no level)→ 2
 *   Unknown       → 1
 *   N/A           → null
 *   Unavoidable   → null
 */
export function getDecisionTreeScore(
  primaryResponse: PrimaryResponse | string,
  concernLevel: ConcernLevel | string | null | undefined,
  polarity: QuestionPolarity
): number | null {
  // Not Applicable → excluded from scoring; Unavoidable is now a condition type (handled via conditionTypes array)
  if (primaryResponse === "Not Applicable") return null;
  if (primaryResponse === "Unknown") return 1;

  const isDeficiency =
    (polarity === "positive" && primaryResponse === "No") ||
    (polarity === "negative" && primaryResponse === "Yes");

  if (!isDeficiency) return 0; // Yes on positive or No on negative = secure

  // Deficiency: score from concern level
  if (concernLevel === "Minor") return 1;
  if (concernLevel === "Moderate") return 2;
  if (concernLevel === "Serious") return 3;
  return 2; // default moderate if no level selected yet
}

// Legacy score maps kept for backward compatibility with old saved responses
export const RESPONSE_SCORES: Record<string, number | null> = {
  "Secure / Yes": 0,
  "Partial": 1,
  "Minor Concern": 1,
  "Moderate Concern": 2,
  "Serious Vulnerability": 3,
  "Unknown": 1,
  "Not Applicable": null,
  "Unavoidable": null,
  // Decision-tree aliases
  "Yes": 0,
  "No": 2,
  "Minor": 1,
  "Moderate": 2,
  "Serious": 3,
};

export const RISK_PRESENT_RESPONSE_SCORES: Record<string, number | null> = {
  "Yes — Present": 3,
  "Partially Present": 2,
  "Unlikely / Minimal": 1,
  "No — Not Present": 0,
  "Unknown": 1,
  "Not Applicable": null,
  "Unavoidable": null,
  // Decision-tree aliases
  "Yes": 3,
  "No": 0,
  "Minor": 1,
  "Moderate": 2,
  "Serious": 3,
};

export const CATEGORY_WEIGHTS: Record<string, number> = {
  "Exterior Environment": 0.15,
  "Access Control": 0.15,
  "Doors & Locks": 0.15,
  "Interior Layout & Visibility": 0.10,
  "Lockdown Capability": 0.15,
  "Communication Systems": 0.10,
  "Surveillance & Monitoring": 0.10,
  "Operational Policies": 0.05,
  "Staff Awareness & Training": 0.05,
};

export const RISK_LEVELS = [
  { label: "Low", min: 0, max: 20, color: "#22c55e" },
  { label: "Moderate", min: 21, max: 40, color: "#84cc16" },
  { label: "Elevated", min: 41, max: 60, color: "#f59e0b" },
  { label: "High", min: 61, max: 80, color: "#f97316" },
  { label: "Critical", min: 81, max: 100, color: "#ef4444" },
];

export const SEVERITY_LEVELS = [
  { label: "Low", min: 1, max: 4, color: "#22c55e" },
  { label: "Moderate", min: 5, max: 9, color: "#84cc16" },
  { label: "Elevated", min: 10, max: 14, color: "#f59e0b" },
  { label: "High", min: 15, max: 19, color: "#f97316" },
  { label: "Critical", min: 20, max: 25, color: "#ef4444" },
];

export const LIKELIHOOD_VALUES: Record<string, number> = {
  "Rare": 1, "Unlikely": 2, "Possible": 3, "Likely": 4, "Highly Likely": 5,
};

export const IMPACT_VALUES: Record<string, number> = {
  "Minimal": 1, "Limited": 2, "Significant": 3, "Severe": 4, "Critical": 5,
};

export const PREPAREDNESS_MODIFIERS: Record<string, number> = {
  "Strong controls": -1, "Average controls": 0, "Weak controls": 1, "No controls": 2,
};

export const PRIORITY_LEVELS: Record<string, string> = {
  "Critical": "Immediate",
  "High": "30 Day",
  "Elevated": "90 Day",
  "Moderate": "Long-Term",
  "Low": "Long-Term",
};

export const PRIORITY_ORDER = ["Immediate", "30 Day", "90 Day", "Long-Term"];

export const REMEDIATION_TIMELINES = ["30 days", "60 days", "90 days", "Long-Term"] as const;
export type RemediationTimeline = typeof REMEDIATION_TIMELINES[number];

export const FACILITY_TYPES = [
  { value: "small_office", label: "Small Office (< 5,000 sq ft)" },
  { value: "office", label: "Office / Corporate" },
  { value: "retail", label: "Retail" },
  { value: "healthcare", label: "Healthcare / Medical" },
  { value: "school", label: "School / Educational" },
  { value: "non_profit", label: "Non-Profit / Youth Facility" },
  { value: "manufacturing", label: "Manufacturing / Industrial" },
  { value: "government", label: "Government / Municipal" },
  { value: "other", label: "Other" },
];

export const PHOTO_TYPES = [
  { value: "front_entrance", label: "Front Entrance" },
  { value: "rear_entrance", label: "Rear Entrance" },
  { value: "parking", label: "Parking Area" },
  { value: "alley", label: "Alleyway / Concealed Area" },
  { value: "door_hardware", label: "Door Hardware / Locks" },
  { value: "camera", label: "Security Camera" },
  { value: "hallway", label: "Hallway / Interior" },
  { value: "emergency_exit", label: "Emergency Exit" },
  { value: "other", label: "Other" },
];

// ─── Audit Question Framework ─────────────────────────────────────────────────

/**
 * inputType determines how the question is rendered in the walkthrough UI:
 *   "scored"   — Standard risk response. Contributes to score.
 *   "info"     — Read-only display of facility profile data. Not scored.
 *
 * polarity determines the direction of the scoring scale:
 *   "positive" — "Secure / Yes" = 0 risk (good condition). Default for most questions.
 *   "negative" — "Yes — Present" = 3 risk (bad condition). Used when the question
 *                describes a hazard or vulnerability.
 *
 * Response options for "scored" questions:
 *   positive: Secure / Yes | Partial | Minor Concern | Moderate Concern | Serious Vulnerability | Unknown | N/A | Unavoidable
 *   negative: No — Not Present | Unlikely / Minimal | Partially Present | Yes — Present | Unknown | N/A | Unavoidable
 *
 * conditionalFollowUp: When a specific response is selected, show a follow-up sub-question.
 *   trigger: the response value that activates the follow-up
 *   followUpText: the text of the follow-up question shown to the auditor
 *   followUpType: "text" (free text) | "select" (dropdown) | "multiselect"
 *   followUpOptions: array of options if type is "select" or "multiselect"
 *
 * recommendedActionEnabled: if true, selecting any non-"Secure/Yes" response shows a
 *   "Recommended Action Notes" text box and a remediation timeline dropdown.
 *
 * sectionNote: optional auditor note displayed below the question (hover/tooltip).
 */

export type QuestionInputType = "scored" | "info";
export type QuestionPolarity = "positive" | "negative";
export type FollowUpType = "text" | "select" | "multiselect";

export interface ConditionalFollowUp {
  /** The response value(s) that trigger the follow-up */
  trigger: string | string[];
  followUpText: string;
  followUpType: FollowUpType;
  followUpOptions?: string[];
}

export interface AuditQuestion {
  id: string;
  text: string;
  facilityTypes: string[];
  photoPrompt?: boolean;
  inputType: QuestionInputType;
  polarity: QuestionPolarity;
  /** For "info" questions: which facility record field this maps to */
  facilityField?: string;
  /** Conditional follow-up sub-question triggered by a specific response */
  conditionalFollowUp?: ConditionalFollowUp;
  /** If true, show Recommended Action Notes + Timeline fields when response is not "Secure/Yes" or "N/A" */
  recommendedActionEnabled?: boolean;
  /** Optional tooltip/note shown to auditor below the question */
  sectionNote?: string;
}

export interface AuditCategory {
  id: string;
  name: string;
  /** Which primary section this category belongs to */
  section: "cpted_physical" | "eap_development" | "profile";
  weight: number;
  description: string;
  standardsRef: string;
  questions: AuditQuestion[];
}

// ─── Section Definitions ──────────────────────────────────────────────────────
export const AUDIT_SECTIONS = [
  {
    id: "cpted_physical",
    name: "Section 1: CPTED / Physical Security Assessment",
    color: "#3b82f6",
    description: "Evaluation of the physical environment, access controls, surveillance, and structural barriers that prevent or deter threats.",
  },
  {
    id: "eap_development",
    name: "Section 2: Emergency Action Plan Development",
    color: "#ef4444",
    description: "Assessment of emergency response readiness, communication systems, staff training, and documented policies.",
  },
] as const;

export const AUDIT_CATEGORIES: AuditCategory[] = [
  // ══════════════════════════════════════════════════════════════════════════
  // FACILITY PROFILE (not scored — drives conditional logic downstream)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: "facility_profile",
    name: "Facility Profile",
    section: "profile",
    weight: 0,
    description: "Facility characteristics pre-populated from the facility record. Review for accuracy before proceeding. These answers drive conditional question visibility throughout the assessment.",
    standardsRef: "OSHA General Duty Clause",
    questions: [
      { id: "fp_01", text: "Facility Type", facilityTypes: ["all"], inputType: "info", polarity: "positive", facilityField: "facilityType" },
      { id: "fp_02", text: "Approximate Square Footage", facilityTypes: ["all"], inputType: "info", polarity: "positive", facilityField: "squareFootage" },
      { id: "fp_03", text: "Number of Floors", facilityTypes: ["all"], inputType: "info", polarity: "positive", facilityField: "floors" },
      { id: "fp_04", text: "Maximum Occupancy", facilityTypes: ["all"], inputType: "info", polarity: "positive", facilityField: "maxOccupancy" },
      { id: "fp_05", text: "Normal Operating Hours", facilityTypes: ["all"], inputType: "info", polarity: "positive", facilityField: "operatingHours" },
      { id: "fp_06", text: "Evening or Night Operations", facilityTypes: ["all"], inputType: "info", polarity: "positive", facilityField: "eveningOperations" },
      { id: "fp_07", text: "Multi-Tenant Facility", facilityTypes: ["all"], inputType: "info", polarity: "positive", facilityField: "multiTenant" },
      { id: "fp_08", text: "Public Access Without Screening", facilityTypes: ["all"], inputType: "info", polarity: "positive", facilityField: "publicAccessWithoutScreening" },
      { id: "fp_09", text: "Number of Public Entrances", facilityTypes: ["all"], inputType: "info", polarity: "positive", facilityField: "publicEntrances" },
      { id: "fp_10", text: "Number of Staff-Only Entrances", facilityTypes: ["all"], inputType: "info", polarity: "positive", facilityField: "staffEntrances" },
      { id: "fp_11", text: "Alleyways Adjacent to Building", facilityTypes: ["all"], inputType: "info", polarity: "positive", facilityField: "hasAlleyways" },
      { id: "fp_12", text: "Concealed Areas on Property", facilityTypes: ["all"], inputType: "info", polarity: "positive", facilityField: "hasConcealedAreas" },
      { id: "fp_13", text: "Facility Used After Dark", facilityTypes: ["all"], inputType: "info", polarity: "positive", facilityField: "usedAfterDark" },
      { id: "fp_14", text: "Multi-Site Organization", facilityTypes: ["all"], inputType: "info", polarity: "positive", facilityField: "multiSite" },
      { id: "fp_15", text: "Emergency Coordinator Name & Contact", facilityTypes: ["all"], inputType: "info", polarity: "positive", facilityField: "emergencyCoordinator" },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1: CPTED / PHYSICAL SECURITY ASSESSMENT
  // ══════════════════════════════════════════════════════════════════════════

  // ─── EXTERIOR ENVIRONMENT ──────────────────────────────────────────────────
  {
    id: "exterior_environment",
    name: "Exterior Environment",
    section: "cpted_physical",
    weight: 0.15,
    description: "Assessment of the building's exterior visibility, approach vectors, concealment risks, and natural surveillance opportunities.",
    standardsRef: "CPTED Principles; CISA Physical Security",
    questions: [
      {
        id: "ee_01",
        text: "Is the building clearly visible from the street?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "ee_02",
        text: "Are there obstructions blocking visibility of the building entrance (e.g., hedges, signage, parked vehicles)?",
        facilityTypes: ["all"], inputType: "scored", polarity: "negative",
        recommendedActionEnabled: true,
      },
      {
        id: "ee_03",
        text: "Are there locations where someone could approach the building unseen (e.g., blind corners, dense landscaping, utility corridors)?",
        facilityTypes: ["all"], inputType: "scored", polarity: "negative",
        recommendedActionEnabled: true,
      },
      {
        id: "ee_04",
        text: "Are there nearby businesses or foot traffic that provide natural surveillance of the property?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "ee_05",
        text: "Are there areas where people could loiter or conceal themselves without being noticed (e.g., dumpsters, alcoves, dense bushes, utility boxes)?",
        facilityTypes: ["all"], inputType: "scored", polarity: "negative",
        photoPrompt: true,
        recommendedActionEnabled: true,
      },
      {
        id: "ee_06",
        text: "Are entrances clearly identifiable from the street with directional signage to the main entrance?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        photoPrompt: true,
        recommendedActionEnabled: true,
      },
      {
        id: "ee_07",
        text: "Are there rear or side areas not visible from the public street?",
        facilityTypes: ["all"], inputType: "scored", polarity: "negative",
        photoPrompt: true,
        recommendedActionEnabled: true,
      },
      {
        id: "ee_08",
        text: "Are there abandoned or poorly maintained buildings nearby that could attract criminal activity?",
        facilityTypes: ["all"], inputType: "scored", polarity: "negative",
        recommendedActionEnabled: true,
      },
      {
        id: "ee_09",
        text: "Are pedestrian walkways clearly defined and separated from vehicle areas?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "ee_10",
        text: "Are territorial markers present (fencing, signage, landscaping) to define ownership and deter unauthorized entry?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
    ],
  },

  // ─── LIGHTING & VISIBILITY ─────────────────────────────────────────────────
  {
    id: "lighting_visibility",
    name: "Lighting & Visibility",
    section: "cpted_physical",
    weight: 0.10,
    description: "Evaluation of exterior and interior lighting adequacy for deterrence, identification, and camera effectiveness.",
    standardsRef: "CPTED Principles; OSHA 3148",
    questions: [
      {
        id: "lv_01",
        text: "Is the main entrance adequately lit at night to allow face identification?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        photoPrompt: true,
        recommendedActionEnabled: true,
      },
      {
        id: "lv_02",
        text: "Are rear and side entrances illuminated after dark?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "lv_03",
        text: "Is lighting consistent across the property without dark gaps or deep shadow zones near entrances or pathways?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "lv_04",
        text: "Are light fixtures functioning properly (no burned-out or broken lights)?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "lv_05",
        text: "Are light fixtures protected from vandalism or easy disabling?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "lv_06",
        text: "Are motion-activated lights or timers/sensors used to ensure nighttime coverage is active?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
    ],
  },

  // ─── ACCESS CONTROL ────────────────────────────────────────────────────────
  {
    id: "access_control",
    name: "Access Control",
    section: "cpted_physical",
    weight: 0.15,
    description: "Review of entry management systems, visitor protocols, and credential controls.",
    standardsRef: "OSHA 3148; CISA ISC Standard",
    questions: [
      {
        id: "ac_01",
        text: "Is there a single designated public entrance that all visitors must use?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        photoPrompt: true,
        recommendedActionEnabled: true,
      },
      {
        id: "ac_02",
        text: "Are non-public doors restricted to authorized staff only and kept locked during operating hours?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "ac_03",
        text: "Can the public enter the building without any staff interaction or screening?",
        facilityTypes: ["all"], inputType: "scored", polarity: "negative",
        recommendedActionEnabled: true,
      },
      {
        id: "ac_04",
        text: "Is there a staffed reception or control point near the main entrance?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "ac_05",
        text: "Are visitors required to check in, identify themselves, and be escorted when entering?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "ac_06",
        text: "Are electronic access codes or key fobs used to control entry?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        conditionalFollowUp: {
          trigger: "Secure / Yes",
          followUpText: "Are access codes or credentials changed regularly and when staff depart?",
          followUpType: "select",
          followUpOptions: ["Yes — regularly updated", "Partial — updated only on departure", "No — rarely or never updated", "Unknown"],
        },
        recommendedActionEnabled: true,
      },
      {
        id: "ac_07",
        text: "Are physical keys issued to staff with a documented record of who holds them?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "ac_08",
        text: "Is access to the building limited and monitored outside normal operating hours?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        conditionalFollowUp: {
          trigger: ["Minor Concern", "Moderate Concern", "Serious Vulnerability"],
          followUpText: "Describe the after-hours access gap (e.g., unlocked doors, no alarm, shared access codes):",
          followUpType: "text",
        },
        recommendedActionEnabled: true,
      },
      {
        id: "ac_09",
        text: "Are entry points alarmed to detect unauthorized access?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "ac_10",
        text: "Are there formal procedures to revoke access when someone leaves the organization?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
    ],
  },

  // ─── DOORS & LOCKS ─────────────────────────────────────────────────────────
  {
    id: "doors_locks",
    name: "Doors & Locks",
    section: "cpted_physical",
    weight: 0.15,
    description: "Physical assessment of door construction, locking mechanisms, and resistance to forced entry.",
    standardsRef: "CISA Physical Security; NFPA 3000",
    questions: [
      {
        id: "dl_01",
        text: "Are exterior doors solid core or reinforced (not hollow-core)?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        photoPrompt: true,
        recommendedActionEnabled: true,
      },
      {
        id: "dl_02",
        text: "Do exterior doors close and latch automatically, and latch securely when closed?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "dl_03",
        text: "Can exterior doors be opened from outside without a key, code, or staff release?",
        facilityTypes: ["all"], inputType: "scored", polarity: "negative",
        conditionalFollowUp: {
          trigger: "Yes — Present",
          followUpText: "Which doors are unsecured? (Describe location and type):",
          followUpType: "text",
        },
        recommendedActionEnabled: true,
      },
      {
        id: "dl_04",
        text: "Do interior offices and private rooms have locking doors that can be locked from the inside without a key (e.g., thumb turn)?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "dl_05",
        text: "Are panic/crash bars installed on emergency exits and do emergency exit doors open outward as required?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "dl_06",
        text: "Are door frames reinforced to resist kick-in attacks, and are door hinges protected from tampering?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        photoPrompt: true,
        recommendedActionEnabled: true,
      },
      {
        id: "dl_07",
        text: "Are windows present in or adjacent to doors that could allow an intruder to reach the lock?",
        facilityTypes: ["all"], inputType: "scored", polarity: "negative",
        conditionalFollowUp: {
          trigger: "Yes — Present",
          followUpText: "Are these windows glazed with break-resistant material or protected with film?",
          followUpType: "select",
          followUpOptions: ["Yes — protected", "No — standard glass", "Unknown"],
        },
        recommendedActionEnabled: true,
      },
      {
        id: "dl_08",
        text: "Are exit doors protected from forced entry from outside, and are door locks regularly inspected and maintained?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
    ],
  },

  // ─── SURVEILLANCE & MONITORING ─────────────────────────────────────────────
  {
    id: "surveillance_monitoring",
    name: "Surveillance & Monitoring",
    section: "cpted_physical",
    weight: 0.10,
    description: "Camera system coverage, deterrence value, recording practices, and monitoring protocols.",
    standardsRef: "CISA Physical Security; OSHA 3148",
    questions: [
      {
        id: "sm_01",
        text: "Are security cameras installed at exterior entrances and approaches?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        photoPrompt: true,
        conditionalFollowUp: {
          trigger: "Secure / Yes",
          followUpText: "Do cameras provide clear coverage of all primary entrances, parking areas, and high-risk approaches?",
          followUpType: "select",
          followUpOptions: [
            "Full coverage — all key areas",
            "Partial — some gaps in coverage",
            "Limited — only main entrance covered",
            "Unknown",
          ],
        },
        recommendedActionEnabled: true,
      },
      {
        id: "sm_02",
        text: "Are cameras visible and positioned to act as a deterrent?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "sm_03",
        text: "Are cameras actively monitored in real time by staff or a security service?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "sm_04",
        text: "Are recordings retained for an adequate period (minimum 30 days recommended)?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        conditionalFollowUp: {
          trigger: "Secure / Yes",
          followUpText: "What is the current retention period?",
          followUpType: "select",
          followUpOptions: ["7 days or less", "8–14 days", "15–29 days", "30 days", "31–60 days", "60+ days", "Unknown"],
        },
        recommendedActionEnabled: true,
      },
      {
        id: "sm_05",
        text: "Are cameras protected from tampering, vandalism, or obstruction (foliage, signage, fixtures)?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "sm_06",
        text: "Are there significant camera blind spots at entrances or high-risk areas?",
        facilityTypes: ["all"], inputType: "scored", polarity: "negative",
        conditionalFollowUp: {
          trigger: "Yes — Present",
          followUpText: "Describe the blind spot locations:",
          followUpType: "text",
        },
        recommendedActionEnabled: true,
      },
    ],
  },

  // ─── PARKING AREAS ─────────────────────────────────────────────────────────
  {
    id: "parking_areas",
    name: "Parking Areas",
    section: "cpted_physical",
    weight: 0.05,
    description: "Safety conditions in parking areas including lighting, visibility, surveillance, and after-hours staff safety.",
    standardsRef: "OSHA 3153; CPTED Principles",
    questions: [
      {
        id: "pa_01",
        text: "Is there designated staff parking separate from public parking?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "pa_02",
        text: "Is the parking area visible from inside the building and from the street or public areas?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        photoPrompt: true,
        recommendedActionEnabled: true,
      },
      {
        id: "pa_03",
        text: "Are there concealed or isolated areas within the parking lot where someone could hide?",
        facilityTypes: ["all"], inputType: "scored", polarity: "negative",
        recommendedActionEnabled: true,
      },
      {
        id: "pa_04",
        text: "Are emergency call stations or intercoms available in parking areas?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "pa_05",
        text: "Are there documented procedures for staff walking to vehicles alone after dark or departing late at night?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "pa_06",
        text: "Is the parking area shared with other businesses, increasing uncontrolled access?",
        facilityTypes: ["all"], inputType: "scored", polarity: "negative",
        recommendedActionEnabled: true,
      },
    ],
  },

  // ─── INTERIOR LAYOUT & VISIBILITY ─────────────────────────────────────────
  {
    id: "interior_layout",
    name: "Interior Layout & Visibility",
    section: "cpted_physical",
    weight: 0.10,
    description: "Interior sightlines, blind spots, staff observation capability, and isolation risks.",
    standardsRef: "CPTED Principles; OSHA 3148",
    questions: [
      {
        id: "il_01",
        text: "Can staff see who enters the building from their primary work area?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "il_02",
        text: "Are there blind corners, hidden areas, or areas inside the building where someone could hide undetected?",
        facilityTypes: ["all"], inputType: "scored", polarity: "negative",
        photoPrompt: true,
        recommendedActionEnabled: true,
      },
      {
        id: "il_03",
        text: "Are interior spaces adequately lit throughout the building?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "il_04",
        text: "Are rooms visible through interior windows, allowing staff to observe activity in common areas?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "il_05",
        text: "Are there spaces where staff could become isolated from colleagues or assistance?",
        facilityTypes: ["all"], inputType: "scored", polarity: "negative",
        recommendedActionEnabled: true,
      },
      {
        id: "il_06",
        text: "Is there a central gathering or common area that could become a concentration risk during an emergency?",
        facilityTypes: ["all"], inputType: "scored", polarity: "negative",
        recommendedActionEnabled: true,
      },
      {
        id: "il_07",
        text: "Are staff offices easily accessible to visitors without escort?",
        facilityTypes: ["all"], inputType: "scored", polarity: "negative",
        recommendedActionEnabled: true,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2: EMERGENCY ACTION PLAN DEVELOPMENT
  // ══════════════════════════════════════════════════════════════════════════

  // ─── ESCAPE & EVACUATION ───────────────────────────────────────────────────
  {
    id: "escape_evacuation",
    name: "Escape & Evacuation",
    section: "eap_development",
    weight: 0.05,
    description: "Evaluation of emergency exit marking, route clarity, assembly points, and drill frequency.",
    standardsRef: "NFPA 3000; OSHA 29 CFR 1910.38",
    questions: [
      {
        id: "ev_01",
        text: "Are emergency exits clearly marked with illuminated signage and are exit lights functioning and tested regularly?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        photoPrompt: true,
        recommendedActionEnabled: true,
      },
      {
        id: "ev_02",
        text: "Are all exit routes free from obstruction, storage, or locked gates?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "ev_03",
        text: "Are evacuation maps posted in visible locations throughout the building?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "ev_04",
        text: "Do staff know the location of all emergency exits and are they accessible from all areas of the building?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        conditionalFollowUp: {
          trigger: ["Minor Concern", "Moderate Concern", "Serious Vulnerability"],
          followUpText: "What is the primary gap — staff knowledge, physical accessibility, or both?",
          followUpType: "select",
          followUpOptions: ["Staff knowledge gap", "Physical accessibility issue", "Both", "Unknown"],
        },
        recommendedActionEnabled: true,
      },
      {
        id: "ev_05",
        text: "Is there a designated outdoor assembly point that is clearly identified, visible, at a safe distance, and does not block emergency vehicle access?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        sectionNote: "Assembly points are for fire and medical emergencies only — NOT for active threat or severe weather scenarios.",
        recommendedActionEnabled: true,
      },
      {
        id: "ev_06",
        text: "Are emergency exit doors easy to open under stress without special knowledge or tools?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "ev_07",
        text: "Are evacuation drills conducted at least annually?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
    ],
  },

  // ─── LOCKDOWN CAPABILITY ───────────────────────────────────────────────────
  {
    id: "lockdown_capability",
    name: "Lockdown Capability",
    section: "eap_development",
    weight: 0.15,
    description: "Ability to rapidly secure the facility during an active threat, including safe room availability.",
    standardsRef: "NFPA 3000; CISA Active Shooter Preparedness",
    questions: [
      {
        id: "lk_01",
        text: "Can all exterior doors be locked quickly from inside during an active threat?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "lk_02",
        text: "Can interior rooms be secured from the inside without requiring a key (e.g., thumb turn, barricade device)?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "lk_03",
        text: "Are there rooms that could serve as secure safe rooms (solid walls, lockable door, no exterior windows)?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        conditionalFollowUp: {
          trigger: "Secure / Yes",
          followUpText: "How many designated safe rooms are available?",
          followUpType: "select",
          followUpOptions: ["1", "2", "3", "4+", "Unknown"],
        },
        recommendedActionEnabled: true,
      },
      {
        id: "lk_04",
        text: "Can lights be turned off quickly and can blinds, shades, or coverings block visibility into rooms from the outside?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "lk_05",
        text: "Can occupants move out of sight of doors and windows during a lockdown?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        conditionalFollowUp: {
          trigger: ["Minor Concern", "Moderate Concern", "Serious Vulnerability"],
          followUpText: "Are there windows that expose occupants to an exterior threat with no cover option?",
          followUpType: "select",
          followUpOptions: ["Yes — significant exposure", "Partial — some rooms have cover", "No — all rooms have cover options", "Unknown"],
        },
        recommendedActionEnabled: true,
      },
      {
        id: "lk_06",
        text: "Can occupants communicate silently (text, app) with each other and with emergency services during a lockdown?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
    ],
  },

  // ─── COMMUNICATION SYSTEMS ─────────────────────────────────────────────────
  {
    id: "communication_systems",
    name: "Communication Systems",
    section: "eap_development",
    weight: 0.10,
    description: "Emergency notification systems, staff communication tools, and documented contact protocols.",
    standardsRef: "NFPA 3000 — Responder Communication; OSHA 3148",
    questions: [
      {
        id: "cs_01",
        text: "Do all staff have reliable access to a phone or communication device during their shift?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "cs_02",
        text: "Are emergency numbers (911, building security, management) posted in visible locations?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "cs_03",
        text: "Is there a system for alerting all occupants simultaneously during an emergency?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        conditionalFollowUp: {
          trigger: "Secure / Yes",
          followUpText: "What type of mass notification system is in place?",
          followUpType: "select",
          followUpOptions: ["PA / intercom system", "Text/email alert system", "Phone tree", "Alarm system only", "Multiple systems", "Unknown"],
        },
        recommendedActionEnabled: true,
      },
      {
        id: "cs_04",
        text: "Can staff communicate with each other quickly without relying on a single system (redundant channels)?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "cs_05",
        text: "Are emergency contacts documented and accessible to all staff?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "cs_06",
        text: "If the organization operates multiple locations, can emergency communication be sent across all sites quickly?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        sectionNote: "Only applicable if this is a multi-site organization. Mark N/A if single-site.",
        recommendedActionEnabled: true,
      },
    ],
  },

  // ─── STAFF AWARENESS & TRAINING ────────────────────────────────────────────
  {
    id: "staff_training",
    name: "Staff Awareness & Training",
    section: "eap_development",
    weight: 0.05,
    description: "Staff readiness, training currency, and knowledge of emergency protocols.",
    standardsRef: "OSHA 3148 — Training & Communication Element",
    questions: [
      {
        id: "st_01",
        text: "Have staff received workplace violence awareness training within the past year?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "st_02",
        text: "Do staff know how to recognize and report suspicious behavior, and who to notify if a threat occurs?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "st_03",
        text: "Are staff trained in emergency evacuation procedures?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "st_04",
        text: "Do staff know where emergency equipment (AED, fire extinguisher, first aid) is located?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "st_05",
        text: "Are new employees trained on safety and emergency procedures during onboarding?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "st_06",
        text: "Are training records maintained to document completion and currency?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
    ],
  },

  // ─── INCIDENT RESPONSE PROCEDURES ─────────────────────────────────────────
  {
    id: "incident_response",
    name: "Incident Response Procedures",
    section: "eap_development",
    weight: 0.05,
    description: "Formal incident documentation, threat reporting processes, and post-incident review protocols.",
    standardsRef: "OSHA 3148 — Program Evaluation Element; NFPA 3000",
    questions: [
      {
        id: "ir_01",
        text: "Are incidents (threats, violence, near-misses) formally documented?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "ir_02",
        text: "Is there a clear, accessible process for staff to report threats or concerns without fear of retaliation?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "ir_03",
        text: "Are incidents reviewed after they occur to identify contributing factors and are corrective actions implemented and tracked?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "ir_04",
        text: "Are local law enforcement contacts established and documented?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
    ],
  },

  // ─── OPERATIONAL POLICIES ──────────────────────────────────────────────────
  {
    id: "operational_policies",
    name: "Operational Policies",
    section: "eap_development",
    weight: 0.05,
    description: "Review of documented workplace violence prevention policies, visitor management, and access control policies.",
    standardsRef: "OSHA 3148 — Management Commitment Element",
    questions: [
      {
        id: "op_01",
        text: "Is there a written workplace violence prevention policy that has been communicated to all staff?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "op_02",
        text: "Is there a written visitor management policy that is consistently enforced?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "op_03",
        text: "Are there documented safety procedures for staff who work alone or outside normal hours?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "op_04",
        text: "Are contractors and vendors required to sign in, be escorted, and are there notification procedures for their presence?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "op_05",
        text: "Are physical keys and access credentials controlled by documented policy?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "op_06",
        text: "Does the organization have a domestic violence / intimate partner violence (DV/IPV) preparedness policy to support affected employees and maintain workplace safety?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        conditionalFollowUp: {
          trigger: ["Minor Concern", "Moderate Concern", "Serious Vulnerability"],
          followUpText: "What is the current gap in DV/IPV preparedness?",
          followUpType: "select",
          followUpOptions: [
            "No policy exists",
            "Policy exists but not communicated to staff",
            "Policy exists but no response procedures",
            "No designated support contact",
            "Unknown",
          ],
        },
        recommendedActionEnabled: true,
      },
    ],
  },

  // ─── VULNERABLE POPULATIONS ────────────────────────────────────────────────
  {
    id: "vulnerable_populations",
    name: "Vulnerable Populations",
    section: "eap_development",
    weight: 0.05,
    description: "Special considerations for facilities serving children, elderly, individuals with disabilities, or distressed persons.",
    standardsRef: "OSHA 3148; NFPA 3000",
    questions: [
      {
        id: "vp_01",
        text: "Are children or youth present, and are there specific protocols to protect them during an emergency?",
        facilityTypes: ["non_profit", "school"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "vp_02",
        text: "Are elderly individuals present, and are evacuation procedures adapted for their needs?",
        facilityTypes: ["non_profit", "healthcare"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "vp_03",
        text: "Are individuals with disabilities present, and are emergency procedures accessible to them?",
        facilityTypes: ["all"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
      {
        id: "vp_04",
        text: "Are there individuals receiving services who may be in emotional distress or crisis?",
        facilityTypes: ["non_profit", "healthcare"], inputType: "scored", polarity: "negative",
        recommendedActionEnabled: true,
      },
      {
        id: "vp_05",
        text: "Are staff trained to de-escalate and safely manage distressed individuals?",
        facilityTypes: ["non_profit", "healthcare"], inputType: "scored", polarity: "positive",
        recommendedActionEnabled: true,
      },
    ],
  },

  // ─── EAP COORDINATOR CONTACTS ──────────────────────────────────────────────
  {
    id: "eap_coordinator",
    name: "EAP Coordinator Contacts",
    section: "eap_development",
    weight: 0,
    description: "Identify the emergency action plan coordinators for this facility. These contacts will be injected into the generated EAP.",
    standardsRef: "OSHA 29 CFR 1910.38",
    questions: [
      { id: "eap_01", text: "Primary EAP Coordinator", facilityTypes: ["all"], inputType: "info", polarity: "positive", facilityField: "eapCoordinatorPrimary" },
      { id: "eap_02", text: "Backup EAP Coordinator", facilityTypes: ["all"], inputType: "info", polarity: "positive", facilityField: "eapCoordinatorBackup" },
      { id: "eap_03", text: "After-Hours Emergency Contact", facilityTypes: ["all"], inputType: "info", polarity: "positive", facilityField: "eapCoordinatorAfterHours" },
    ],
  },
];

// ─── Scoring & Helper Functions ───────────────────────────────────────────────

export function getRiskLevel(percentage: number): { label: string; color: string } {
  for (const level of RISK_LEVELS) {
    if (percentage >= level.min && percentage <= level.max) {
      return { label: level.label, color: level.color };
    }
  }
  return { label: "Critical", color: "#ef4444" };
}

export function getSeverityLevel(score: number): { label: string; color: string } {
  for (const level of SEVERITY_LEVELS) {
    if (score >= level.min && score <= level.max) {
      return { label: level.label, color: level.color };
    }
  }
  return { label: "Critical", color: "#ef4444" };
}

/**
 * Returns the numeric risk score for a given response, accounting for question polarity.
 * Positive polarity: "Secure / Yes" = 0, "Partial" = 1, "Serious Vulnerability" = 3
 * Negative polarity: "No — Not Present" = 0, "Partially Present" = 2, "Yes — Present" = 3
 * "Unavoidable" and "Not Applicable" return null (excluded from scoring).
 */
export function getResponseScore(response: string, polarity: QuestionPolarity): number | null {
  if (polarity === "negative") {
    return RISK_PRESENT_RESPONSE_SCORES[response] ?? null;
  }
  return RESPONSE_SCORES[response] ?? null;
}

export function calculateCategoryScore(responses: { score: number | null }[]): {
  rawScore: number;
  maxScore: number;
  percentage: number;
  riskLevel: string;
  riskColor: string;
} {
  const answered = responses.filter((r) => r.score !== null);
  const rawScore = answered.reduce((sum, r) => sum + (r.score ?? 0), 0);
  const maxScore = answered.length * 3;
  const percentage = maxScore === 0 ? 0 : Math.round((rawScore / maxScore) * 100 * 10) / 10;
  const { label, color } = getRiskLevel(percentage);
  return { rawScore, maxScore, percentage, riskLevel: label, riskColor: color };
}

export function calculateOverallScore(
  categoryScores: Record<string, { percentage: number; weight: number }>
): { overallScore: number; overallRiskLevel: string; overallRiskColor: string } {
  const weightedCategories = Object.values(categoryScores).filter((c) => c.weight > 0);
  if (weightedCategories.length === 0) return { overallScore: 0, overallRiskLevel: "Low", overallRiskColor: "#22c55e" };
  const totalWeight = weightedCategories.reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = weightedCategories.reduce((sum, c) => sum + c.percentage * c.weight, 0);
  const overallScore = Math.round((weightedSum / totalWeight) * 10) / 10;
  const { label, color } = getRiskLevel(overallScore);
  return { overallScore, overallRiskLevel: label, overallRiskColor: color };
}

export function calculateThreatSeverity(
  likelihood: string,
  impact: string,
  preparedness: string
): { baseScore: number; modifier: number; finalScore: number; severityLevel: string; severityColor: string; priority: string } {
  const baseScore = (LIKELIHOOD_VALUES[likelihood] ?? 1) * (IMPACT_VALUES[impact] ?? 1);
  const modifier = PREPAREDNESS_MODIFIERS[preparedness] ?? 0;
  const finalScore = Math.max(1, Math.min(27, baseScore + modifier));
  const { label, color } = getSeverityLevel(finalScore);
  const priority = PRIORITY_LEVELS[label] ?? "Long-Term";
  return { baseScore, modifier, finalScore, severityLevel: label, severityColor: color, priority };
}

export function getQuestionsForFacility(facilityType: string): AuditCategory[] {
  return AUDIT_CATEGORIES.map((cat) => ({
    ...cat,
    questions: cat.questions.filter(
      (q) => q.facilityTypes.includes("all") || q.facilityTypes.includes(facilityType)
    ),
  })).filter((cat) => cat.questions.length > 0);
}

export function getCorrectiveActionRecommendation(questionText: string, response: string): string {
  const recommendations: Record<string, string> = {
    "Serious Vulnerability": "This item requires immediate corrective action. Develop and implement a remediation plan with clear accountability and a defined completion date.",
    "Yes — Present": "This hazard condition was observed and requires immediate corrective action. Develop and implement a remediation plan with clear accountability and a defined completion date.",
    "Moderate Concern": "This item represents a moderate risk. Schedule a review and implement improvements within the next 90 days.",
    "Partially Present": "This hazard condition is partially present. Schedule a review and implement improvements within the next 90 days.",
    "Partial": "This item is partially in place. Schedule a review and implement the remaining improvements within the next 60 days.",
    "Minor Concern": "This item is a low-level concern. Include in long-term facility improvement planning.",
    "Unlikely / Minimal": "This hazard condition is unlikely or minimal. Include in long-term facility improvement planning.",
    "Unknown": "The status of this item is unknown. Conduct a follow-up investigation to determine the actual condition and assign a risk rating.",
    "Unavoidable": "This condition has been identified as unavoidable due to facility constraints. Document the constraint and implement compensating controls where possible.",
  };
  return recommendations[response] ?? "Review this item and determine appropriate corrective action.";
}
