// ─────────────────────────────────────────────────────────────────────────────
// SafeGuard — Liability Scan Scoring Engine (Defensibility Model)
//
// Architecture:
//   • Structural Score  — points-based (Tier 1 + Tier 2 only, max 22 pts)
//   • Defensibility Status — trigger-based (Tier 3 failures)
//
// DO NOT compute scores in the frontend. Import and call scoreLiabilityScan()
// from server-side tRPC procedures only.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

export type Tier = "tier1" | "tier2" | "tier3";

export type StructuralLabel = "Strong Foundation" | "Moderate Gaps" | "High Gaps" | "Weak Structure";

export type DefensibilityStatus =
  | "Low Risk"
  | "Moderate Risk"
  | "High Risk"
  | "Critical Risk";

export type PrioritySeverity = "CRITICAL" | "HIGH" | "MODERATE";

export interface PriorityItem {
  questionId: string;
  title: string;
  severity: PrioritySeverity;
  regulatoryBasis: string;
  preparednessBasis: string;
  whyItMatters: string;
  recommendedAction: string;
}

export interface LiabilityScanResult {
  pointsEarned: number;
  totalPossible: number;
  scorePercent: number;
  structuralLabel: StructuralLabel;
  tier3Failures: string[];
  defensibilityStatus: DefensibilityStatus;
  topPriorities: PriorityItem[];
}

// ─── Question ID → Tier Map ───────────────────────────────────────────────────
//
// Stable IDs map to the existing question IDs in assessmentEngine.ts:
//   q1  = wpv_policy
//   q2  = eap_active_threat
//   q3  = site_risk_assessment
//   q4  = threat_indicator_training
//   q5  = active_threat_response_training
//   q6  = training_schedule
//   q7  = internal_reporting_process
//   q8  = incident_tracking
//   q9  = reporting_mechanism
//   q10 = real_time_alert_system
//   q11 = drill_frequency
//   q12 = drill_review
//   q13 = defined_roles
//   q14 = domestic_violence_risk
//   q15 = individuals_of_concern_process
//   q16 = insider_threat_measures

export const QUESTION_TIERS: Record<string, Tier> = {
  q1:  "tier2", // Workplace Violence Prevention Policy
  q2:  "tier3", // EAP with active threat procedures
  q3:  "tier2", // Site-specific risk assessment
  q4:  "tier2", // Threat indicator training
  q5:  "tier2", // Active threat response training
  q6:  "tier1", // Training cadence / schedule
  q7:  "tier2", // Internal reporting process
  q8:  "tier2", // Incident documentation / tracking
  q9:  "tier3", // Reporting mechanism (conditional Tier 3 trigger)
  q10: "tier3", // Real-time alert system (conditional Tier 3 trigger)
  q11: "tier2", // Drill frequency
  q12: "tier2", // Drill documentation / review
  q13: "tier3", // Roles and responsibilities defined
  q14: "tier1", // Domestic violence / external threat management
  q15: "tier2", // Individuals of concern / threat assessment process
  q16: "tier2", // Insider threat prevention measures
};

// ─── Tier 2 question IDs (2 pts each) ────────────────────────────────────────
const TIER2_IDS = Object.entries(QUESTION_TIERS)
  .filter(([, t]) => t === "tier2")
  .map(([id]) => id);

// ─── Tier 1 question IDs (1 pt each) ─────────────────────────────────────────
const TIER1_IDS = Object.entries(QUESTION_TIERS)
  .filter(([, t]) => t === "tier1")
  .map(([id]) => id);

// ─── Total possible points ────────────────────────────────────────────────────
// Tier 2: q1, q3, q4, q5, q7, q8, q11, q12, q15, q16 = 10 × 2 = 20 pts
// Tier 1: q6, q14 = 2 × 1 = 2 pts
// Multi-option (q9 reporting, q10 alert) max = 2 + 2 = 4 pts (but q9/q10 are Tier3 — points still count)
// Wait — per spec: Tier 3 questions carry NO points. q9 and q10 are Tier 3.
// Tier 2 (10 questions × 2) = 20 pts
// Tier 1 (2 questions × 1) = 2 pts
// Total = 22 pts ✓
export const TOTAL_POSSIBLE_POINTS = 22;

// ─── Multi-option scoring maps ────────────────────────────────────────────────
// q9: reporting_mechanism
export const REPORTING_MECHANISM_SCORES: Record<
  string,
  { points: number; tier3Failure: boolean }
> = {
  anon_full:         { points: 2, tier3Failure: false }, // Anonymous + formal
  anon_formal_only:  { points: 1, tier3Failure: false }, // Formal, not anonymous
  anon_informal:     { points: 0, tier3Failure: false }, // Informal only
  anon_none:         { points: 0, tier3Failure: true  }, // No mechanism → Tier 3 failure
};

// q10: real_time_alert_system
export const ALERT_SYSTEM_SCORES: Record<
  string,
  { points: number; tier3Failure: boolean }
> = {
  ras_full:    { points: 2, tier3Failure: false }, // Role-based + acknowledgement
  ras_basic:   { points: 1, tier3Failure: false }, // Basic mass notification
  ras_limited: { points: 0, tier3Failure: false }, // Limited / delayed methods
  ras_none:    { points: 0, tier3Failure: true  }, // No system → Tier 3 failure
};

// ─── Priority metadata ────────────────────────────────────────────────────────
// Each question that can appear in topPriorities has a canonical output block.
const PRIORITY_METADATA: Record<
  string,
  Omit<PriorityItem, "questionId" | "severity">
> = {
  q2: {
    title: "No Emergency Action Plan (EAP) with Active Threat Procedures",
    regulatoryBasis:
      "OSHA General Duty Clause (Section 5(a)(1)): Employers must address recognized hazards likely to cause death or serious physical harm. OSHA 29 CFR 1910.38 requires a written Emergency Action Plan for covered employers.",
    preparednessBasis:
      "NFPA 3000 and CISA active threat preparedness frameworks require a documented EAP as the foundation of any active threat response program.",
    whyItMatters:
      "Without a documented EAP that includes active threat procedures, employees have no defined response protocol. This is the single largest defensibility gap — its absence is consistently cited in post-incident litigation and regulatory review.",
    recommendedAction:
      "Develop and adopt a written Emergency Action Plan that includes active threat response procedures (lockdown, lockout, evacuation), communication protocols, and assigned roles. Review and update annually.",
  },
  q9: {
    title: "No Formal Reporting Mechanism for Threats or Concerning Behavior",
    regulatoryBasis:
      "OSHA General Duty Clause (Section 5(a)(1)): Employers must address recognized hazards. The absence of a reporting mechanism may be cited as evidence of inadequate hazard identification infrastructure. California SB 553 (effective July 1, 2024) requires covered employers to establish a Workplace Violence Prevention Plan including a procedure for employees to report workplace violence hazards without fear of retaliation.",
    preparednessBasis:
      "CISA active threat preparedness principles recommend anonymous reporting channels as a key element of pre-incident threat identification. NFPA 3000 preparedness concepts support early threat identification through accessible, confidential reporting mechanisms.",
    whyItMatters:
      "Without a formal reporting mechanism, employees who observe threatening or concerning behavior have no clear pathway to escalate concerns. Fear of retaliation is a recognized driver of non-reporting and a structural failure in early threat identification.",
    recommendedAction:
      "Implement a formal, accessible reporting mechanism — ideally anonymous (hotline, app, or secure portal) — that allows employees to report threats without identification or fear of retaliation.",
  },
  q10: {
    title: "No Real-Time Alert System for Active Threat Notification",
    regulatoryBasis:
      "OSHA General Duty Clause (Section 5(a)(1)): Employers must address recognized hazards. The absence of a real-time notification capability may be cited as failure to address a recognized hazard. Where an alarm system is used as part of the EAP, OSHA 29 CFR 1910.38 and 1910.165 apply.",
    preparednessBasis:
      "CISA active threat preparedness principles recommend real-time notification capability as a core element of coordinated response. NFPA 3000 addresses coordinated notification and lockdown/lockout procedures as preparedness requirements.",
    whyItMatters:
      "Without a real-time alert system, employees cannot receive immediate instructions during an active threat. Delayed or absent notification is consistently cited in post-incident litigation as evidence of inadequate preparedness.",
    recommendedAction:
      "Implement a real-time alert system capable of immediate lockdown/lockout activation, role-based instruction delivery, and acknowledgment tracking.",
  },
  q13: {
    title: "Roles and Responsibilities Not Defined for Emergency Response",
    regulatoryBasis:
      "OSHA General Duty Clause (Section 5(a)(1)): Employers must address recognized hazards. OSHA 29 CFR 1910.38 requires an EAP to designate and train employees who have special roles during an emergency.",
    preparednessBasis:
      "NFPA 3000 and ICS/NIMS frameworks require clearly defined roles and a chain of command as a prerequisite for effective emergency response.",
    whyItMatters:
      "Undefined roles during an emergency create confusion, delayed response, and direct liability. Regulators and courts examine whether the organization had a clear chain of command and whether employees knew their responsibilities.",
    recommendedAction:
      "Define and document emergency response roles (e.g., Incident Commander, Floor Warden, Accountability Coordinator) within the EAP. Train assigned personnel and conduct annual drills.",
  },
  q1: {
    title: "No Workplace Violence Prevention Policy",
    regulatoryBasis:
      "OSHA General Duty Clause (Section 5(a)(1)): Employers must address recognized hazards. A written policy is the foundational document establishing organizational commitment to workplace violence prevention.",
    preparednessBasis:
      "CISA and SHRM best practice frameworks identify a written Workplace Violence Prevention Policy as the baseline requirement for any prevention program.",
    whyItMatters:
      "Without a formal policy, the organization has no documented commitment to prevention, no defined prohibited behaviors, and no framework for consistent enforcement. This gap weakens defensibility across all other program elements.",
    recommendedAction:
      "Develop and adopt a written Workplace Violence Prevention Policy that defines prohibited behaviors, reporting procedures, investigation protocols, and consequences. Distribute to all employees and review annually.",
  },
  q3: {
    title: "No Site-Specific Risk Assessment Conducted",
    regulatoryBasis:
      "OSHA General Duty Clause (Section 5(a)(1)): Employers must identify and address recognized hazards. A site-specific risk assessment is the mechanism for identifying those hazards.",
    preparednessBasis:
      "CISA and NFPA 3000 preparedness frameworks require a site-specific risk assessment as the foundation for developing a tailored emergency response program.",
    whyItMatters:
      "Without a site-specific risk assessment, the organization cannot demonstrate that it identified its unique hazards. Generic programs that are not tailored to the facility's specific risks provide limited defensibility.",
    recommendedAction:
      "Conduct a formal, documented site-specific risk assessment covering physical security, operational vulnerabilities, and threat history. Update when significant changes occur and at least annually.",
  },
  q4: {
    title: "No Threat Indicator Training for Staff",
    regulatoryBasis:
      "OSHA General Duty Clause (Section 5(a)(1)): Employers must train employees to recognize and respond to recognized hazards.",
    preparednessBasis:
      "CISA behavioral threat management guidance and NFPA 3000 preparedness requirements identify threat indicator training as a core prevention element.",
    whyItMatters:
      "Employees who cannot recognize behavioral warning signs cannot report them. Threat indicator training is the primary mechanism for activating the reporting pipeline before an incident occurs.",
    recommendedAction:
      "Implement threat indicator training for all staff covering behavioral warning signs, escalation procedures, and the organization's reporting mechanism. Refresh annually.",
  },
  q5: {
    title: "No Active Threat Response Training",
    regulatoryBasis:
      "OSHA General Duty Clause (Section 5(a)(1)): Employers must train employees to respond to recognized hazards.",
    preparednessBasis:
      "NFPA 3000 and CISA active threat preparedness frameworks require documented active threat response training (e.g., ACTD, Run-Hide-Fight) as a core program element.",
    whyItMatters:
      "Without active threat response training, employees do not know how to respond during an incident. Untrained employees are more likely to freeze, take unsafe actions, or impede response efforts.",
    recommendedAction:
      "Implement documented active threat response training (e.g., ACTD framework) for all employees. Conduct at least annually and document completion.",
  },
  q7: {
    title: "No Defined Internal Reporting Process for Security Concerns",
    regulatoryBasis:
      "OSHA General Duty Clause (Section 5(a)(1)): Employers must address recognized hazards. A defined internal reporting chain is the mechanism for escalating threat indicators to management.",
    preparednessBasis:
      "CISA behavioral threat management guidance identifies a defined internal reporting chain as a prerequisite for effective threat identification and intervention.",
    whyItMatters:
      "Without a defined internal reporting process, threat indicators have no pathway to supervisors or management. Post-incident reviews consistently find that employees observed warning signs but had no clear process for escalating them.",
    recommendedAction:
      "Define and document a clear internal reporting chain for security concerns, including who to report to, how to report, and what happens after a report is made. Train all employees.",
  },
  q8: {
    title: "Incidents and Near-Misses Not Consistently Documented",
    regulatoryBasis:
      "OSHA 29 CFR 1904 (Recordkeeping): Covered employers must record and report work-related injuries and illnesses. Consistent incident documentation is also required to demonstrate a systematic approach to hazard management.",
    preparednessBasis:
      "NFPA 3000 and CISA preparedness frameworks identify incident documentation as a continuous improvement requirement and a key element of program defensibility.",
    whyItMatters:
      "Inconsistent documentation creates an evidentiary gap. In litigation, the inability to show a pattern of documented response suggests systemic negligence and undermines the organization's ability to demonstrate it took reasonable precautions.",
    recommendedAction:
      "Implement a consistent incident and near-miss documentation system. Ensure all incidents, near-misses, and threatening behaviors are recorded, reviewed, and used to improve the prevention program.",
  },
  q11: {
    title: "No Regular Emergency or Active Threat Drills",
    regulatoryBasis:
      "OSHA General Duty Clause (Section 5(a)(1)): Employers must address recognized hazards through training and practice. OSHA 29 CFR 1910.38 requires that employees be trained on the EAP.",
    preparednessBasis:
      "NFPA 3000 requires regular drills as a core program element. CISA preparedness guidance identifies drill frequency as a key indicator of operational readiness.",
    whyItMatters:
      "Organizations that fail to produce documented evidence of regular drills face significant exposure in post-incident reviews. Drills are evidence of operational commitment to safety and are the primary mechanism for identifying gaps in the response plan.",
    recommendedAction:
      "Establish a defined drill schedule (at minimum annually, ideally semi-annually). Conduct drills for all relevant scenarios (lockdown, evacuation, shelter-in-place) and document outcomes.",
  },
  q12: {
    title: "Drills Not Documented or Reviewed for Improvement",
    regulatoryBasis:
      "OSHA General Duty Clause (Section 5(a)(1)): Employers must demonstrate a systematic approach to hazard management, including continuous improvement of emergency response procedures.",
    preparednessBasis:
      "NFPA 3000 requires post-drill review and documentation as part of a continuous improvement posture. FEMA exercise guidance (HSEEP) requires an After Action Review (AAR) following every exercise.",
    whyItMatters:
      "Undocumented drills provide no defensibility. Without documentation and review, the organization cannot demonstrate that it identified and corrected gaps in its response capability.",
    recommendedAction:
      "Document all drills including date, participants, scenario, observations, and corrective actions. Conduct an After Action Review (AAR) following each drill and track corrective actions to completion.",
  },
  q15: {
    title: "No Defined Threat Assessment or Individuals of Concern Process",
    regulatoryBasis:
      "OSHA General Duty Clause (Section 5(a)(1)): Employers must address recognized hazards. A threat assessment process is the mechanism for identifying and managing individuals who may pose a risk.",
    preparednessBasis:
      "CISA behavioral threat management guidance and NFPA 3000 identify a formal threat assessment process as a core prevention element. ASIS/SHRM WVPI standard recommends a Behavioral Threat Assessment and Management (BTAM) program.",
    whyItMatters:
      "Without a defined threat assessment process, the organization lacks a structured mechanism to identify and manage individuals who may pose a risk before an incident occurs. Post-incident reviews frequently examine whether warning signs were identified and acted upon.",
    recommendedAction:
      "Establish a Behavioral Threat Assessment and Management (BTAM) process, including a multidisciplinary threat assessment team, defined criteria for escalation, and documented intervention protocols.",
  },
  q16: {
    title: "No Insider Threat Prevention Measures",
    regulatoryBasis:
      "OSHA General Duty Clause (Section 5(a)(1)): Employers must address recognized hazards, including internal threats. Insider threats are a recognized category of workplace violence hazard.",
    preparednessBasis:
      "CISA insider threat guidance and NFPA 3000 preparedness frameworks identify insider threat prevention as a core program element, including risk indicator monitoring, reporting pathways, and intervention protocols.",
    whyItMatters:
      "Insider threats and acts of internal violence are among the most preventable forms of workplace violence. Organizations without structured risk indicator monitoring, reporting pathways, and intervention protocols may face significant exposure when internal warning signs were present but unaddressed.",
    recommendedAction:
      "Implement insider threat prevention measures including employee risk indicator monitoring, clear reporting pathways, and documented intervention protocols. Integrate with the organization's threat assessment process.",
  },
  q6: {
    title: "No Defined Training Schedule or Cadence",
    regulatoryBasis:
      "OSHA General Duty Clause (Section 5(a)(1)): Employers must provide ongoing training to address recognized hazards. One-time training is insufficient to demonstrate an ongoing commitment to employee safety.",
    preparednessBasis:
      "NFPA 3000 and CISA preparedness frameworks require a defined training schedule as part of a sustainable prevention program.",
    whyItMatters:
      "One-time training without a defined refresh schedule is insufficient to demonstrate an ongoing commitment to employee safety and regulatory compliance. Training effectiveness degrades over time without reinforcement.",
    recommendedAction:
      "Establish a defined annual training schedule covering threat indicator recognition, reporting procedures, and active threat response. Document completion and track compliance.",
  },
  q14: {
    title: "Domestic Violence / External Threat Risks Not Managed",
    regulatoryBasis:
      "OSHA General Duty Clause (Section 5(a)(1)): Employers must address recognized hazards when known. Domestic violence spillover is a recognized workplace violence hazard.",
    preparednessBasis:
      "SHRM and CISA guidance identify domestic violence spillover as a leading cause of workplace homicide and recommend specific policies and procedures for managing this risk.",
    whyItMatters:
      "Domestic violence spillover is a leading cause of workplace homicide. Organizations that fail to identify and manage this risk when known face significant civil and regulatory exposure.",
    recommendedAction:
      "Develop a domestic violence and external threat management policy that includes procedures for employees to confidentially disclose risk, safety planning protocols, and coordination with law enforcement when appropriate.",
  },
};

// ─── Main Scoring Function ────────────────────────────────────────────────────

/**
 * Score a completed liability scan using the defensibility-based model.
 *
 * @param answers - Record of questionId → answer value (string | boolean)
 * @returns LiabilityScanResult with structural score, defensibility status, and top priorities
 */
export function scoreLiabilityScan(
  answers: Record<string, string | boolean>
): LiabilityScanResult {
  let pointsEarned = 0;
  const tier3Failures: string[] = [];
  // Track which Tier 2 questions scored 0 (for priority ordering)
  const tier2Zeros: string[] = [];

  // ── Score Tier 2 questions (2 pts each, binary yes/no) ────────────────────
  for (const id of TIER2_IDS) {
    const answer = answers[id];
    if (answer === true || answer === "yes") {
      pointsEarned += 2;
    } else {
      tier2Zeros.push(id);
    }
  }

  // ── Score Tier 1 questions (1 pt each, binary yes/no) ────────────────────
  for (const id of TIER1_IDS) {
    const answer = answers[id];
    if (answer === true || answer === "yes") {
      pointsEarned += 1;
    }
  }

  // ── Handle Tier 3 questions ───────────────────────────────────────────────
  // q2 (EAP): binary — "no" = Tier 3 failure, no points
  const q2Answer = answers["q2"];
  if (q2Answer !== true && q2Answer !== "yes") {
    tier3Failures.push("q2");
  }

  // q13 (defined_roles): binary — "no" = Tier 3 failure, no points
  const q13Answer = answers["q13"];
  if (q13Answer !== true && q13Answer !== "yes") {
    tier3Failures.push("q13");
  }

  // q9 (reporting_mechanism): multi-option — points DO NOT count toward structural score
  // (Tier 3 questions carry no points per spec)
  const q9Answer = String(answers["q9"] ?? "");
  const q9Score = REPORTING_MECHANISM_SCORES[q9Answer];
  if (q9Score?.tier3Failure) {
    tier3Failures.push("q9");
  }

  // q10 (real_time_alert_system): multi-option — no points toward structural score
  const q10Answer = String(answers["q10"] ?? "");
  const q10Score = ALERT_SYSTEM_SCORES[q10Answer];
  if (q10Score?.tier3Failure) {
    tier3Failures.push("q10");
  }

  // ── Structural score calculation ──────────────────────────────────────────
  const scorePercent = Math.round((pointsEarned / TOTAL_POSSIBLE_POINTS) * 100);

  let structuralLabel: StructuralLabel;
  if (scorePercent >= 85) {
    structuralLabel = "Strong Foundation";
  } else if (scorePercent >= 70) {
    structuralLabel = "Moderate Gaps";
  } else if (scorePercent >= 50) {
    structuralLabel = "High Gaps";
  } else {
    structuralLabel = "Weak Structure";
  }

  // ── Liability Risk Level (primary outcome, Tier 3 failure count driven) ─────
  // OVERRIDE RULE: ANY Tier 3 failure → cannot be Low Risk
  // 0 failures → Low Risk
  // 1–2 failures → Moderate Risk
  // 3 failures → High Risk
  // 4 failures → Critical Risk
  let defensibilityStatus: DefensibilityStatus;
  if (tier3Failures.length === 0) {
    defensibilityStatus = "Low Risk";
  } else if (tier3Failures.length <= 2) {
    defensibilityStatus = "Moderate Risk";
  } else if (tier3Failures.length === 3) {
    defensibilityStatus = "High Risk";
  } else {
    defensibilityStatus = "Critical Risk";
  }

  // ── Top priorities ────────────────────────────────────────────────────────
  // Order: Tier 3 failures first (CRITICAL), then Tier 2 zeros (HIGH/MODERATE)
  // Limit to 5 total
  const priorityIds: Array<{ id: string; severity: PrioritySeverity }> = [];

  // 1. All Tier 3 failures → CRITICAL
  for (const id of tier3Failures) {
    priorityIds.push({ id, severity: "CRITICAL" });
  }

  // 2. Tier 2 zeros → HIGH (limit remaining slots)
  const remaining = 5 - priorityIds.length;
  const tier2GapIds = tier2Zeros.slice(0, remaining);
  for (const id of tier2GapIds) {
    priorityIds.push({ id, severity: "HIGH" });
  }

  // 3. Tier 1 zeros if still room (MODERATE)
  const remaining2 = 5 - priorityIds.length;
  if (remaining2 > 0) {
    for (const id of TIER1_IDS) {
      if (priorityIds.length >= 5) break;
      const answer = answers[id];
      if (answer !== true && answer !== "yes") {
        priorityIds.push({ id, severity: "MODERATE" });
      }
    }
  }

  const topPriorities: PriorityItem[] = priorityIds
    .slice(0, 5)
    .map(({ id, severity }) => {
      const meta = PRIORITY_METADATA[id];
      if (!meta) {
        return {
          questionId: id,
          severity,
          title: `Gap: ${id}`,
          regulatoryBasis: "OSHA General Duty Clause (Section 5(a)(1))",
          preparednessBasis: "CISA / NFPA 3000 preparedness guidance",
          whyItMatters: "This control gap increases organizational liability exposure.",
          recommendedAction: "Address this gap as part of your corrective action plan.",
        };
      }
      return { questionId: id, severity, ...meta };
    });

  return {
    pointsEarned,
    totalPossible: TOTAL_POSSIBLE_POINTS,
    scorePercent,
    structuralLabel,
    tier3Failures,
    defensibilityStatus,
    topPriorities,
  };
}

// ─── Validation helper ────────────────────────────────────────────────────────

/** Returns true if the total possible points constant equals 22. */
export function validateTotalPossible(): boolean {
  const tier2Count = TIER2_IDS.length; // 10
  const tier1Count = TIER1_IDS.length; // 2
  const computed = tier2Count * 2 + tier1Count * 1;
  return computed === TOTAL_POSSIBLE_POINTS && TOTAL_POSSIBLE_POINTS === 22;
}
