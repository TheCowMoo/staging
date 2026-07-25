// ─────────────────────────────────────────────────────────────────────────────
// SafeGuard — Liability Exposure Scan Engine
// Liability-first scoring: start at 100, subtract for missing controls.
// DO NOT revert to readiness scoring.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ───────────────────────────────────────────────────────────────────

export type AnswerValue = "yes" | "no" | string;

// ─── Multi-option question support ───────────────────────────────────────────
// Some questions use 4-tier scoring instead of binary yes/no.
// Each option carries a deductionFraction (0 = full score, 1 = full deduction).
export interface QuestionOption {
  value: string;
  label: string;
  /** Fraction of q.weight to deduct. 0 = full credit, 1 = full deduction. */
  deductionFraction: number;
  /** Short label for gap card status when this option is selected */
  gapStatus: "Not in Place" | "Incomplete" | "Partial" | "In Place";
}

export type CategoryKey =
  | "planning_documentation"
  | "training_awareness"
  | "reporting_communication"
  | "response_readiness"
  | "critical_risk_factors";

export type ClassificationLabel =
  | "Critical Exposure"
  | "High Exposure"
  | "Material Exposure"
  | "Moderate Readiness"
  | "Defensible Foundation";

export type RiskColor = "red" | "orange" | "yellow" | "yellow-green" | "green";

export interface Question {
  id: string;
  text: string;
  category: CategoryKey;
  /** Points subtracted from 100 when this control is MISSING (answer = "no") */
  weight: number;
  /** Short liability-framing explanation shown in gap cards */
  liabilityImpact: string;
  /**
   * Severity tier used to enforce ranking priority in the top gaps list.
   * CRITICAL items always rank above HIGH items, which rank above untagged items,
   * regardless of effective deduction weight.
   * - CRITICAL: absence creates maximum liability exposure (e.g., no RAS)
   * - HIGH: absence creates significant but secondary liability exposure (e.g., no anonymous reporting)
   */
  severity?: "CRITICAL" | "HIGH";
  /** If present, renders as multi-option radio group instead of Yes/No */
  options?: QuestionOption[];
  /** Optional helper text shown beneath the question in the UI */
  helperText?: string;
  /** Report gap output when control is weak or missing (for multi-option questions) */
  reportGapOutput?: {
    exposureExplanation: string;
    realWorldConsequence: string;
    requiredFix: string;
  };
  /**
   * Regulatory citations shown in the gap card under "Regulatory Basis".
   * Each string is one citation line (no filler language).
   * Only cite standards or legal duties that DIRECTLY apply.
   * DO NOT cite OSHA 1910.165 or 1910.38 as active-threat-specific mandates.
   */
  regulatoryBasis?: string[];
  /**
   * Preparedness / Best-Practice citations shown under "Preparedness Basis".
   * Use for preparedness guidance, consensus standards, or internal frameworks
   * (e.g., CISA, NFPA 3000, internal doctrine).
   * This is SEPARATE from regulatory basis — never mix the two.
   */
  preparednessBasis?: string[];
}

export interface TopGap {
  id: string;
  gap: string;
  status: "Not in Place" | "Incomplete" | "Partial";
  impact: string;
  /** Severity tier carried through from the source question for UI display */
  severity?: "CRITICAL" | "HIGH";
  /** Regulatory citations shown under "Regulatory Basis" in the gap card */
  regulatoryBasis?: string[];
  /** Preparedness / Best-Practice citations shown under "Preparedness Basis" in the gap card */
  preparednessBasis?: string[];
  /** Optional tag for mapping AI-generated gap content to the right scan section */
  sectionTag?:
    | "planning_documentation"
    | "training_awareness"
    | "reporting_communication"
    | "response_readiness"
    | "critical_risk_factors";
}

export interface CategoryScores {
  planningDocumentation: number;
  trainingAwareness: number;
  reportingCommunication: number;
  responseReadiness: number;
}

export interface RiskMap {
  color: RiskColor;
  label: ClassificationLabel;
  descriptor: string;
}

/** Exact CRM payload format */
export interface CrmPayload {
  score: number;
  classification: ClassificationLabel;
  riskLevel: RiskColor;
  topGaps: Array<{
    gap: string;
    status: "Not in Place" | "Incomplete" | "Partial";
    impact: string;
    severity?: "CRITICAL" | "HIGH";
    regulatoryBasis?: string[];
    preparednessBasis?: string[];
    sectionTag?:
      | "planning_documentation"
      | "training_awareness"
      | "reporting_communication"
      | "response_readiness"
      | "critical_risk_factors";
  }>;
  categoryScores: CategoryScores;
  industry: string;
  jurisdiction: string;
  recommendedActions: string[];
  escalationFlags?: string[];
}

export interface AssessmentOutput {
  score: number;
  classification: ClassificationLabel;
  riskMap: RiskMap;
  topGaps: TopGap[];
  categoryScores: CategoryScores;
  interpretation: string;
  advisorSummary: string;
  immediateActionPlan: string[];
  ctaBlock: string[];
  crmPayload: CrmPayload;
  escalationFlags?: string[];
}

// ─── Questions ───────────────────────────────────────────────────────────────
// 15 questions across 5 categories.
// weight = points subtracted when control is MISSING.

export const QUESTIONS: Question[] = [
  // ─── Planning & Documentation (q1–q3) ────────────────────────────────────
  // Total possible deduction: 10+20+15 = 45
  {
    id: "q1",
    text: "Do you have a documented Workplace Violence Prevention Policy that defines prohibited behaviors, reporting expectations, and response protocols?",
    category: "planning_documentation",
    weight: 10,
    liabilityImpact:
      "Without a documented policy, the organization fails to meet the standard of due diligence to prevent workplace violence — a foundational element in civil liability defense.",
  },
  {
    id: "q2",
    text: "Do you have a documented Emergency Action Plan (EAP) that includes active threat response procedures (e.g., lockdown, lockout, evacuation, communication)?",
    category: "planning_documentation",
    weight: 20,
    liabilityImpact:
      "The absence of a documented EAP with active threat procedures may increase exposure significantly. OSHA 29 CFR 1910.38 requires a written EAP; the inclusion of active threat scenarios is a preparedness best practice. Post-incident reviews may cite this gap as evidence of inadequate preparedness.",
    regulatoryBasis: [
      "OSHA 29 CFR 1910.38: Employers with more than 10 employees must maintain a written Emergency Action Plan covering evacuation, reporting, and employee accountability procedures.",
      "OSHA General Duty Clause (Section 5(a)(1)): Employers must address recognized hazards likely to cause death or serious physical harm. Workplace violence and active threat scenarios are recognized hazards in many industries.",
    ],
    preparednessBasis: [
      "CISA active threat preparedness principles recommend a documented active threat response plan as a foundational preparedness element.",
      "NFPA 3000 (Standard for an Active Shooter / Hostile Event Response Program) requires a documented hostile event response program including lockdown, lockout, and escape procedures.",
    ],
  },
  {
    id: "q3",
    text: "Has a site-specific risk assessment been conducted and documented?",
    category: "planning_documentation",
    weight: 15,
    liabilityImpact:
      "Without a documented site-specific risk assessment, the organization fails to meet the standard of due diligence — a core requirement in both regulatory defense and insurance claims.",
  },

  // ─── Training & Awareness (q4–q6) ────────────────────────────────────────
  // Total possible deduction: 10+15+8 = 33
  {
    id: "q4",
    text: "Are employees trained to recognize pre-incident threat indicators and escalation behaviors?",
    category: "training_awareness",
    weight: 10,
    liabilityImpact:
      "Failure to train employees to recognize warning signs is frequently cited in post-incident litigation as evidence that harm was foreseeable and preventable.",
  },
  {
    id: "q5",
    text: "Are employees trained in active threat response (e.g., lockdown, lockout, escape, defend)?",
    category: "training_awareness",
    weight: 15,
    liabilityImpact:
      "Untrained employees in active threat scenarios may increase exposure. Post-incident litigation may examine whether the organization provided actionable response training. OSHA does not mandate a specific active shooter training standard, but the General Duty Clause requires employers to address recognized hazards, which includes providing employees with the means to respond.",
    regulatoryBasis: [
      "OSHA General Duty Clause (Section 5(a)(1)): Employers must address recognized hazards. Failure to provide active threat response training may be cited as evidence of inadequate hazard mitigation.",
    ],
    preparednessBasis: [
      "CISA active threat preparedness principles recommend Run-Hide-Fight or equivalent response training for all employees.",
      "NFPA 3000 requires training aligned with the organization's hostile event response program.",
    ],
  },
  {
    id: "q6",
    text: "Is training conducted at onboarding and refreshed on a defined and consistent schedule?",
    category: "training_awareness",
    weight: 8,
    liabilityImpact:
      "One-time training without a defined refresh schedule is insufficient to demonstrate an ongoing commitment to employee safety and regulatory compliance.",
  },

  // ─── Reporting & Communication (q7–q10) ──────────────────────────────────
  // Total possible deduction: 10+8+12+20 = 50
  {
    id: "q7",
    text: "Is there a clearly defined internal process for employees to report suspicious behavior or security concerns?",
    category: "reporting_communication",
    weight: 10,
    liabilityImpact:
      "Without a defined internal reporting chain, threat indicators have no pathway to supervisors or management. This is a system failure — not a gap. Post-incident reviews consistently find that employees observed warning signs but had no clear process for escalating them through the organization.",
  },
  {
    id: "q8",
    text: "Are incidents and near-misses consistently documented and tracked?",
    category: "reporting_communication",
    weight: 8,
    liabilityImpact:
      "Inconsistent documentation creates an evidentiary gap. In litigation, the inability to show a pattern of documented response suggests systemic negligence.",
  },
  // Reporting & Communication — Anonymous Threat Reporting (position 3)
  {
    id: "q9",
    text: "Does your organization provide a formal and accessible reporting mechanism for employees to report threats or concerning behavior?",
    category: "reporting_communication",
    weight: 12,
    severity: "HIGH",
    liabilityImpact:
      "Without an anonymous reporting mechanism, employees who observe threatening or concerning behavior may be less likely to report it. Fear of retaliation or identification is a recognized driver of non-reporting. This may increase exposure under the OSHA General Duty Clause and, where applicable, California SB 553, and may structurally increase the risk that threat indicators go undetected before an incident occurs.",
    options: [
      {
        value: "anon_full",
        label: "Yes — anonymous and formal system in place (hotline, app, or secure portal)",
        deductionFraction: 0,
        gapStatus: "In Place",
      },
      {
        value: "anon_formal_only",
        label: "Yes — formal reporting exists but not anonymous",
        deductionFraction: 0.4,
        gapStatus: "Partial",
      },
      {
        value: "anon_informal",
        label: "Informal only — manager-based, no formal system",
        deductionFraction: 0.75,
        gapStatus: "Incomplete",
      },
      {
        value: "anon_none",
        label: "No reporting mechanism in place",
        deductionFraction: 1,
        gapStatus: "Not in Place",
      },
    ],
    reportGapOutput: {
      exposureExplanation:
        "Without an anonymous reporting mechanism, employees who observe threatening or concerning behavior may not report it due to fear of retaliation or identification. This creates a systemic failure in early threat identification and escalation — the primary mechanism for preventing incidents before they occur.",
      realWorldConsequence:
        "Post-incident reviews frequently find that warning signs existed but were not reported. In organizations without anonymous reporting channels, fear of retaliation is a recognized driver of non-reporting. The absence of an anonymous mechanism may be cited as evidence of inadequate preparedness and may weaken defensibility where California SB 553 or equivalent state requirements apply.",
      requiredFix:
        "Implement an anonymous reporting mechanism (hotline, app, or secure portal) that allows employees to report threats without identification or fear of retaliation.",
    },
    regulatoryBasis: [
      "OSHA General Duty Clause (Section 5(a)(1)): Employers must address recognized hazards. The absence of a reporting mechanism may be cited as evidence of inadequate hazard identification infrastructure.",
      "California SB 553 (effective July 1, 2024): Covered employers must establish a Workplace Violence Prevention Plan including a procedure for employees to report workplace violence hazards without fear of retaliation.",
      "State-level equivalents to California SB 553 are emerging in multiple jurisdictions — organizations should verify applicable state requirements.",
    ],
    preparednessBasis: [
      "CISA active threat preparedness principles recommend anonymous reporting channels as a key element of pre-incident threat identification and behavioral threat management.",
      "NFPA 3000 preparedness concepts support early threat identification through accessible, confidential reporting mechanisms.",
    ],
  },
  {
    id: "q10",
    text: "Does your organization have a method to immediately notify employees of an active threat and provide clear instructions (e.g., lockdown, evacuation)?",
    category: "reporting_communication",
    weight: 20,
    severity: "CRITICAL",
    liabilityImpact:
      "OSHA does not maintain a specific active-threat notification standard. However, employers must address recognized hazards under the General Duty Clause. The absence of a real-time notification capability may increase exposure by delaying protective action and may weaken defensibility in post-incident review. If an employee alarm or notification system is used within the emergency action plan, the system should align with OSHA emergency action plan and employee alarm requirements.",
    options: [
      {
        value: "ras_full",
        label: "Yes — real-time system with role-based alerts and acknowledgement tracking",
        deductionFraction: 0,
        gapStatus: "In Place",
      },
      {
        value: "ras_basic",
        label: "Yes — basic mass notification (no role-based routing or tracking)",
        deductionFraction: 0.4,
        gapStatus: "Partial",
      },
      {
        value: "ras_limited",
        label: "Limited — email, PA announcement, or delayed methods only",
        deductionFraction: 0.75,
        gapStatus: "Incomplete",
      },
      {
        value: "ras_none",
        label: "No real-time alert system",
        deductionFraction: 1,
        gapStatus: "Not in Place",
      },
    ],
    reportGapOutput: {
      exposureExplanation:
        "OSHA does not maintain a specific active-threat notification standard. However, the absence of a real-time alert system may increase exposure by delaying employee protective action and may weaken the organization's defensibility under the General Duty Clause, which requires employers to address recognized hazards. If an alarm system is used as part of the emergency action plan, it should align with OSHA 29 CFR 1910.38 and 1910.165 requirements.",
      realWorldConsequence:
        "Delayed or absent notification during an active threat incident may be cited in post-incident litigation as evidence that the organization failed to take reasonable precautions. The absence of coordinated notification capability may undermine coordinated response and may be cited as evidence of inadequate preparedness.",
      requiredFix:
        "Implement a real-time alert system capable of immediate lockdown/lockout activation, role-based instruction delivery, and acknowledgment tracking.",
    },
    regulatoryBasis: [
      "OSHA General Duty Clause (Section 5(a)(1)): Employers must address recognized hazards likely to cause death or serious physical harm. The absence of an employee notification capability may be cited as failure to address a recognized hazard.",
      "If the organization uses an employee alarm system as part of its emergency action plan, OSHA 29 CFR 1910.38 and 1910.165 govern related EAP and alarm requirements — these are not active-threat-specific mandates.",
    ],
    preparednessBasis: [
      "CISA active threat preparedness principles recommend real-time notification capability as a core element of coordinated active threat response.",
      "NFPA 3000 (Standard for an Active Shooter / Hostile Event Response Program) addresses coordinated notification and lockdown/lockout procedures as preparedness requirements.",
    ],
  },

  // ─── Response Readiness (q11–q13) ────────────────────────────────────────
  // Total possible deduction: 10+5+8 = 23
  {
    id: "q11",
    text: "Are emergency or active threat drills conducted on a regular and defined basis?",
    category: "response_readiness",
    weight: 10,
    liabilityImpact:
      "Organizations that fail to produce documented evidence of regular drills face significant exposure in post-incident reviews. Drills are evidence of operational commitment to safety.",
  },
  {
    id: "q12",
    text: "Are drills documented and reviewed for performance improvement?",
    category: "response_readiness",
    weight: 5,
    liabilityImpact:
      "Undocumented drills provide no defensibility. Documentation of drill outcomes and corrective actions is required to demonstrate a continuous improvement posture.",
  },
  {
    id: "q13",
    text: "Are roles and responsibilities clearly defined during an emergency response?",
    category: "response_readiness",
    weight: 8,
    liabilityImpact:
      "Undefined roles during an emergency create confusion, delayed response, and direct liability. Regulators and courts examine whether the organization had a clear chain of command.",
  },

  // ─── Critical Risk Factors (q14–q16) ─────────────────────────────────────
  // Total possible deduction: 10+6+6 = 22
  {
    id: "q14",
    text: "Are domestic violence or external personal threat risks identified and managed when known?",
    category: "critical_risk_factors",
    weight: 10,
    liabilityImpact:
      "Domestic violence spillover is a leading cause of workplace homicide. Organizations that fail to identify and manage this risk when known face significant civil and regulatory exposure.",
  },
  {
    id: "q15",
    text: "Does your organization have a defined process for identifying and managing individuals of concern (e.g., threat assessment or behavioral intervention process)?",
    category: "critical_risk_factors",
    weight: 6,
    liabilityImpact:
      "Without a defined threat assessment or behavioral intervention process, the organization lacks a structured mechanism to identify and manage individuals who may pose a risk before an incident occurs. Post-incident reviews frequently examine whether warning signs were identified and acted upon.",
  },
  {
    id: "q16",
    text: "Does your organization have measures in place to identify and prevent insider threats or acts of internal violence (e.g., employee risk indicators, reporting pathways, intervention protocols)?",
    category: "critical_risk_factors",
    weight: 6,
    liabilityImpact:
      "Insider threats and acts of internal violence are among the most preventable forms of workplace violence. Organizations without structured risk indicator monitoring, reporting pathways, and intervention protocols may face significant exposure when internal warning signs were present but unaddressed.",
  },

];

// ─── Category weight totals (for percentage scoring) ─────────────────────────
// planning_documentation: q1(10)+q2(20)+q3(15) = 45
// training_awareness: q4(10)+q5(15)+q6(8) = 33
// reporting_communication: q7(10)+q8(8)+q9(12,HIGH)+q10(20,CRITICAL) = 50
// response_readiness: q11(10)+q12(5)+q13(8) = 23
// critical_risk_factors: q14(10)+q15(6)+q16(6) = 22
// TOTAL: 45+33+50+23+22 = 173
const CATEGORY_TOTALS: Record<CategoryKey, number> = {
  planning_documentation: 45,
  training_awareness: 33,
  reporting_communication: 50,
  response_readiness: 23,
  critical_risk_factors: 22,
};

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  planning_documentation: "Planning & Documentation",
  training_awareness: "Training & Awareness",
  reporting_communication: "Reporting & Communication",
  response_readiness: "Response Readiness",
  critical_risk_factors: "Critical Risk Factors",
};

// ─── Industry Weighting Table ───────────────────────────────────────────────
// Each industry emphasizes different sections based on regulatory risk and
// operational priorities. Weights are applied to section scores (0–100 each)
// to compute the overall assessment score.
// Weights must sum to 100% per industry.
export type IndustryType = "Manufacturing" | "Retail" | "Government" | "Higher Education" | "Healthcare";

interface IndustryWeights {
  planning_documentation: number;
  training_awareness: number;
  reporting_communication: number;
  response_readiness: number;
  critical_risk_factors: number;
}

export const INDUSTRY_WEIGHTS: Record<IndustryType, IndustryWeights> = {
  Manufacturing: {
    planning_documentation: 0.25,
    training_awareness: 0.15,
    reporting_communication: 0.20,
    response_readiness: 0.20,
    critical_risk_factors: 0.20,
  },
  Retail: {
    planning_documentation: 0.20,
    training_awareness: 0.15,
    reporting_communication: 0.25,
    response_readiness: 0.20,
    critical_risk_factors: 0.20,
  },
  Healthcare: {
    planning_documentation: 0.25,
    training_awareness: 0.15,
    reporting_communication: 0.20,
    response_readiness: 0.15,
    critical_risk_factors: 0.25,
  },
  Government: {
    planning_documentation: 0.25,
    training_awareness: 0.15,
    reporting_communication: 0.20,
    response_readiness: 0.20,
    critical_risk_factors: 0.20,
  },
  "Higher Education": {
    planning_documentation: 0.20,
    training_awareness: 0.20,
    reporting_communication: 0.20,
    response_readiness: 0.20,
    critical_risk_factors: 0.20,
  },
};

export const INDUSTRY_PROMPT_TAGS: Record<string, Record<string, string | string[]>> = {
  Retail: {
    industry: "retail",
    environment: "public-facing / parking lot / customer conflict / after-hours exposure",
    priority_risks: ["robbery", "customer aggression", "parking lot/exterior exposure", "rapid notification"],
    framework_focus: "customer-facing defensibility, store-specific readiness, action trail",
  },
  Government: {
    industry: "government",
    environment: "public service / public access / continuity of operations",
    priority_risks: ["targeted threats", "public counter exposure", "employee-specific threats"],
    framework_focus: "policy defensibility, response coordination, continuity",
  },
  "Higher Education": {
    industry: "higher_education",
    environment: "open campus / student population / events / housing / multidisciplinary response",
    priority_risks: ["individuals of concern", "behavioral escalation", "open access communication"],
    framework_focus: "campus coordination, threat assessment, documented exercises",
  },
  Manufacturing: {
    industry: "manufacturing",
  },
  Healthcare: {
    industry: "healthcare",
    environment: "patient care / visitor exposure / emergency or behavioral health risk",
    priority_risks: ["patient/visitor aggression", "incident logging", "documented program requirements"],
    framework_focus: "written prevention program, training, reporting, state-law overlays",
  },
};

// Helper function to get weights for any industry string (with fallback to default)
function getIndustryWeights(industry: string): IndustryWeights {
  const weights = INDUSTRY_WEIGHTS[industry as IndustryType];
  if (weights) return weights;
  // Default: equal weighting across all sections (20% each)
  return {
    planning_documentation: 0.20,
    training_awareness: 0.20,
    reporting_communication: 0.20,
    response_readiness: 0.20,
    critical_risk_factors: 0.20,
  };
}

// ─── Scoring constants ───────────────────────────────────────────────────────

/**
 * Sum of all question weights — the denominator for normalized scoring.
 * q1(10)+q2(20)+q3(15)+q4(10)+q5(15)+q6(8)+q7(10)+q8(8)+q9(12,HIGH)+q10(20,CRITICAL)+
 * q11(10)+q12(5)+q13(8)+q14(10)+q15(6)+q16(6) = 173
 * Computed dynamically so adding/changing questions auto-updates the denominator.
 */
export const MAX_POSSIBLE_DEDUCTION: number = QUESTIONS.reduce(
  (sum, q) => sum + q.weight,
  0
);

// ─── Industry-specific overrides
// Industry selection may change question wording, option labels, and weights
// without altering the 16-question architecture. Overrides are applied at
// runtime inside `runAssessment` by merging these values into the canonical
// `QUESTIONS` dataset. Only fields included here will be overridden.
const INDUSTRY_QUESTION_OVERRIDES: Record<
  string,
  Partial<Record<string, Partial<Question>>> // industry -> { qid -> partial overrides }
> = {
  Manufacturing: {
    q1: {
      text: "Do you have a documented workplace violence prevention policy for this facility that defines prohibited behavior, reporting expectations, investigation steps, and response expectations?",
      helperText: "Count “Yes” only if the policy is current, approved, and used at this location.",
    },
    q2: {
      text: "Do you have a documented Emergency Action Plan for this facility that includes active threat procedures for lockdown, lockout, evacuation, communication, and employee accountability?",
      helperText: "Count “Yes” only if the plan reflects your plant layout, shift structure, and real response conditions.",
    },
    q3: {
      text: "Has a site-specific workplace violence or active threat risk assessment been completed and documented for this facility, including areas such as entrances, parking, production, warehouse, breakrooms, loading docks, and visitor access?",
      helperText: "A generic corporate template does not qualify.",
    },
    q4: {
      text: "Are employees trained to recognize pre-incident warning signs, escalation behaviors, and concerning conduct from coworkers, visitors, contractors, or known outsiders?",
    },
    q5: {
      text: "Are employees trained on what to do during an active threat based on your plant environment, including lockdown, lockout, evacuation, escape, defend, or shelter actions as applicable?",
    },
    q6: {
      text: "Is this training provided at onboarding and refreshed on a defined, documented schedule for all shifts and worker groups?",
    },
    q7: {
      text: "Is there a clearly defined internal process for employees to report threatening behavior, security concerns, or suspicious activity?",
    },
    q8: {
      text: "Are workplace violence incidents, threats, and near-misses consistently documented, reviewed, and tracked to closure?",
    },
    q9: {
      text: "What reporting option do employees have to report threats or concerning behavior?",
      options: [
        {
          value: "anon_full",
          label: "Anonymous and formal system in place (hotline, app, secure portal, or documented intake workflow)",
          deductionFraction: 0,
          gapStatus: "In Place",
        },
        {
          value: "anon_formal_only",
          label: "Formal reporting exists but not anonymous",
          deductionFraction: 0.4,
          gapStatus: "Partial",
        },
        {
          value: "anon_informal",
          label: "Informal only — supervisor or manager based, no formal workflow",
          deductionFraction: 0.75,
          gapStatus: "Incomplete",
        },
        {
          value: "anon_none",
          label: "No reporting mechanism in place",
          deductionFraction: 1,
          gapStatus: "Not in Place",
        },
      ],
    },
    q10: {
      text: "How does your facility immediately notify employees of an active threat and provide clear instructions?",
      options: [
        {
          value: "ras_full",
          label: "Real-time system with role-based alerts and acknowledgement tracking",
          deductionFraction: 0,
          gapStatus: "In Place",
        },
        {
          value: "ras_basic",
          label: "Basic mass notification with no role-based routing or response tracking",
          deductionFraction: 0.4,
          gapStatus: "Partial",
        },
        {
          value: "ras_limited",
          label: "Limited methods only, such as email, PA, radio relay, or delayed messaging",
          deductionFraction: 0.75,
          gapStatus: "Incomplete",
        },
        {
          value: "ras_none",
          label: "No real-time alert system",
          deductionFraction: 1,
          gapStatus: "Not in Place",
        },
      ],
    },
    q11: {
      text: "Are workplace violence or active threat drills conducted on a regular, defined schedule?",
    },
    q12: {
      text: "Are drills documented, debriefed, and used to improve plans, roles, communication, or corrective actions?",
    },
    q13: {
      text: "Are roles and responsibilities clearly defined for plant leadership, supervisors, floor personnel, security, EHS, HR, and incident response support during an emergency?",
    },
    q14: {
      text: "Are domestic violence or known external personal threat risks identified and managed when the organization becomes aware of them?",
    },
    q15: {
      text: "Do you have a defined process for identifying and managing individuals of concern, including behavioral escalation, threat assessment, or coordinated intervention?",
    },
    q16: {
      text: "Do you have measures to identify and reduce insider threats or internal violence risks, including reporting paths, behavioral indicators, access concerns, and intervention protocols?",
    },
  },
  // Example: Retail-specific adjustments (stronger emphasis on RAS and reporting)
  Retail: {
    q1: {
      text: "Do you have a documented workplace violence prevention policy that defines prohibited behavior, reporting expectations, de-escalation expectations, and emergency response for employees in customer-facing settings?",
      helperText: "Count “Yes” only if the policy is location-specific, approved, and used by customer-facing staff.",
    },
    q2: {
      text: "Do you have a documented Emergency Action Plan that includes active threat procedures for customer areas, entrances, parking areas, employee-only spaces, and after-hours operations?",
      helperText: "Include procedures for public-facing areas and after-hours staffing patterns where applicable.",
    },
    q3: {
      text: "Has a site-specific risk assessment been completed and documented for this store or facility, including public access areas, parking, entrances, checkout areas, back-of-house spaces, and late-night conditions where applicable?",
      helperText: "Assessments must be site-specific — corporate templates without local adaptation do not qualify.",
    },
    q4: { text: "Are employees trained to recognize escalating customer behavior, suspicious conduct, stalking concerns, robbery indicators, and other pre-incident warning signs?" },
    q5: { text: "Are employees trained on active threat response for a public-facing retail environment, including customer communication, lockdown, evacuation, escape, or shelter decisions as applicable?" },
    q6: { text: "Is this training provided at onboarding and refreshed on a defined schedule for managers, sales floor staff, and support personnel?" },
    q7: { text: "Is there a clearly defined process for employees to report threatening customers, suspicious behavior, security concerns, or concerning interactions?" },
    q8: { text: "Are threats, disruptive incidents, near-misses, and violence-related events consistently documented and tracked?" },
    q9: {
      text: "What reporting option do employees have to report threats or concerning behavior?",
      options: [
        {
          value: "anon_full",
          label: "Anonymous and formal system in place (hotline, app, secure portal, or documented intake workflow)",
          deductionFraction: 0,
          gapStatus: "In Place",
        },
        {
          value: "anon_formal_only",
          label: "Formal reporting exists but not anonymous",
          deductionFraction: 0.4,
          gapStatus: "Partial",
        },
        {
          value: "anon_informal",
          label: "Informal only — manager based, no formal workflow",
          deductionFraction: 0.75,
          gapStatus: "Incomplete",
        },
        {
          value: "anon_none",
          label: "No reporting mechanism in place",
          deductionFraction: 1,
          gapStatus: "Not in Place",
        },
      ],
    },
    q10: {
      text: "How does your organization immediately notify employees of an active threat and provide clear instructions?",
      options: [
        {
          value: "ras_full",
          label: "Real-time system with role-based alerts and acknowledgement tracking",
          deductionFraction: 0,
          gapStatus: "In Place",
        },
        {
          value: "ras_basic",
          label: "Basic mass notification with no role-based routing or response tracking",
          deductionFraction: 0.4,
          gapStatus: "Partial",
        },
        {
          value: "ras_limited",
          label: "Limited methods only, such as email, PA announcement, or delayed messaging",
          deductionFraction: 0.75,
          gapStatus: "Incomplete",
        },
        {
          value: "ras_none",
          label: "No real-time alert system",
          deductionFraction: 1,
          gapStatus: "Not in Place",
        },
      ],
    },
    q11: { text: "Are emergency or active threat drills conducted on a regular, defined basis for this location or operating model?" },
    q12: { text: "Are drills documented and reviewed to improve response performance, communication, and customer protection actions?" },
    q13: { text: "Are roles and responsibilities clearly defined for store leadership, supervisors, floor staff, security, and after-hours personnel during an emergency?" },
    q14: { text: "Are domestic violence or known external personal threat risks identified and managed when known, including concerns that may enter the workplace through customers, former partners, or targeted individuals?" },
    q15: { text: "Does your organization have a defined process for identifying and managing individuals of concern, including repeat aggressors, trespassed persons, or escalating customers?" },
    q16: { text: "Do you have measures to identify and prevent insider threats or internal violence, including concerning employee behavior, reporting pathways, and intervention protocols?" },
  },
  Government: {
    q1: {
      text: "Do you have a documented workplace violence prevention policy that defines prohibited behavior, reporting expectations, response procedures, and escalation paths for employees, visitors, and members of the public?",
      helperText: "Count 'Yes' only if the policy covers public-facing interactions, escalation paths, and visitor management tailored to this facility.",
    },
    q2: {
      text: "Do you have a documented Emergency Action Plan that includes active threat procedures for your agency, building, or public-service environment?",
      helperText: "Include procedures that align to your facility layout, public access points, and continuity of service requirements.",
    },
    q3: {
      text: "Has a site-specific workplace violence or active threat risk assessment been completed and documented for this facility, including public access areas, service counters, waiting areas, entrances, and restricted spaces?",
      helperText: "Assessments should reflect the unique public-service access patterns at this site.",
    },
    q4: { text: "Are employees trained to recognize pre-incident warning signs, threatening behavior, escalation indicators, and concerning conduct from coworkers or members of the public?" },
    q5: { text: "Are employees trained on active threat response procedures appropriate to the facility, including lockdown, evacuation, shelter, communication, and role-specific actions?" },
    q6: { text: "Is this training provided at onboarding and refreshed on a defined, documented schedule?" },
    q7: { text: "Is there a clearly defined internal process for employees to report threats, harassment, suspicious behavior, or security concerns?" },
    q8: { text: "Are incidents, threats, and near-misses consistently documented and tracked to review or closure?" },
    q9: {
      text: "What reporting option do employees have to report threats or concerning behavior?",
      options: [
        { value: "anon_full", label: "Anonymous and formal system in place (hotline, app, secure portal, or documented intake workflow)", deductionFraction: 0, gapStatus: "In Place" },
        { value: "anon_formal_only", label: "Formal reporting exists but not anonymous", deductionFraction: 0.4, gapStatus: "Partial" },
        { value: "anon_informal", label: "Informal only — supervisor based, no formal workflow", deductionFraction: 0.75, gapStatus: "Incomplete" },
        { value: "anon_none", label: "No reporting mechanism in place", deductionFraction: 1, gapStatus: "Not in Place" },
      ],
    },
    q10: {
      text: "How does your organization immediately notify employees of an active threat and provide clear instructions?",
      options: [
        { value: "ras_full", label: "Real-time system with role-based alerts and acknowledgement tracking", deductionFraction: 0, gapStatus: "In Place" },
        { value: "ras_basic", label: "Basic mass notification with no role-based routing or response tracking", deductionFraction: 0.4, gapStatus: "Partial" },
        { value: "ras_limited", label: "Limited methods only, such as email, PA announcement, or delayed messaging", deductionFraction: 0.75, gapStatus: "Incomplete" },
        { value: "ras_none", label: "No real-time alert system", deductionFraction: 1, gapStatus: "Not in Place" },
      ],
    },
    q11: { text: "Are emergency or active threat drills conducted on a regular, defined basis?" },
    q12: { text: "Are drills documented, reviewed, and used to improve procedures or corrective actions?" },
    q13: { text: "Are roles and responsibilities clearly defined for leadership, supervisors, security, front-desk personnel, and continuity support during an emergency?" },
    q14: { text: "Are domestic violence or known external personal threat risks identified and managed when known?" },
    q15: { text: "Does your organization have a defined process for identifying and managing individuals of concern, including targeted harassment, threat assessment, or coordinated intervention?" },
    q16: { text: "Do you have measures to identify and reduce insider threats or internal violence risks, including employee warning signs, reporting paths, and intervention protocols?" },
  },
  "Higher Education": {
    q1: {
      text: "Do you have a documented workplace violence prevention policy that defines prohibited behavior, reporting expectations, intervention pathways, and response procedures for employees, students, visitors, and other campus stakeholders as applicable?",
      helperText: "Count 'Yes' only if the policy covers students, events, housing, and visitor interactions where applicable.",
    },
    q2: {
      text: "Do you have a documented Emergency Action Plan that includes active threat procedures for classrooms, offices, public spaces, events, housing, and campus communication?",
      helperText: "Include communication plans for events and housing where applicable.",
    },
    q3: {
      text: "Has a site-specific campus or facility risk assessment been completed and documented for this environment, including academic buildings, public spaces, housing, events, and access points where applicable?",
      helperText: "Assessments should reflect campus-specific access patterns and event profiles.",
    },
    q4: { text: "Are employees trained to recognize pre-incident warning signs, threatening behavior, behavioral escalation, and concerning conduct from students, employees, visitors, or known outsiders?" },
    q5: { text: "Are employees trained on active threat response for the campus environment, including lockdown, evacuation, shelter, communication, and role-specific protective actions?" },
    q6: { text: "Is this training provided at onboarding and refreshed on a defined schedule for faculty, staff, campus security, and applicable student-facing teams?" },
    q7: { text: "Is there a clearly defined process for employees to report threatening behavior, suspicious activity, harassment, or security concerns?" },
    q8: { text: "Are incidents, threats, concerning behavior reports, and near-misses consistently documented and tracked?" },
    q9: {
      text: "What reporting option do employees have to report threats or concerning behavior?",
      options: [
        { value: "anon_full", label: "Anonymous and formal system in place (hotline, app, secure portal, or documented intake workflow)", deductionFraction: 0, gapStatus: "In Place" },
        { value: "anon_formal_only", label: "Formal reporting exists but not anonymous", deductionFraction: 0.4, gapStatus: "Partial" },
        { value: "anon_informal", label: "Informal only — manager or supervisor based, no formal workflow", deductionFraction: 0.75, gapStatus: "Incomplete" },
        { value: "anon_none", label: "No reporting mechanism in place", deductionFraction: 1, gapStatus: "Not in Place" },
      ],
    },
    q10: {
      text: "How does your institution immediately notify employees of an active threat and provide clear instructions?",
      options: [
        { value: "ras_full", label: "Real-time system with role-based alerts and acknowledgement tracking", deductionFraction: 0, gapStatus: "In Place" },
        { value: "ras_basic", label: "Basic mass notification with no role-based routing or response tracking", deductionFraction: 0.4, gapStatus: "Partial" },
        { value: "ras_limited", label: "Limited methods only, such as email, PA, text cascade, or delayed messaging", deductionFraction: 0.75, gapStatus: "Incomplete" },
        { value: "ras_none", label: "No real-time alert system", deductionFraction: 1, gapStatus: "Not in Place" },
      ],
    },
    q11: { text: "Are emergency or active threat drills or exercises conducted on a regular, defined basis?" },
    q12: { text: "Are drills or exercises documented and reviewed to improve performance, communication, and corrective actions?" },
    q13: { text: "Are roles and responsibilities clearly defined for leadership, faculty, staff, campus security, student support, and incident management personnel during an emergency?" },
    q14: { text: "Are domestic violence or known external personal threat risks identified and managed when known?" },
    q15: { text: "Does your institution have a defined process for identifying and managing individuals of concern, including behavioral intervention, threat assessment, or multidisciplinary review?" },
    q16: { text: "Do you have measures to identify and reduce insider or internal violence risks, including concerning employee or student behavior, reporting pathways, and intervention protocols?" },
  },
  // Example: Healthcare-specific adjustments (higher regulatory weight)
  Healthcare: {
    q2: { weight: 24 },
    q3: { weight: 18 },
    q14: { weight: 12 },
  },
};


// ─── Classification ───────────────────────────────────────────────────────────
// Six-band model mapping 0–100 score to readiness maturity levels:
// 85–100  = Defensible Foundation   — Core systems exist and are documented
// 70–84   = Moderate Readiness      — Most core elements exist, but weak sections remain
// 50–69   = Material Exposure       — Important controls exist inconsistently
// 25–49   = High Exposure           — Major gaps in core systems
// 0–24    = Critical Exposure       — No connected system; readiness mostly informal

export function classify(score: number): ClassificationLabel {
  if (score >= 85) return "Defensible Foundation";
  if (score >= 70) return "Moderate Readiness";
  if (score >= 50) return "Material Exposure";
  if (score >= 25) return "High Exposure";
  return "Critical Exposure";
}

export function getRiskMap(classification: ClassificationLabel): RiskMap {
  const map: Record<ClassificationLabel, RiskMap> = {
    "Defensible Foundation": {
      color: "green",
      label: "Defensible Foundation",
      descriptor: "Core readiness systems are established and documented. Continued attention to state-specific requirements and periodic review will help sustain this foundation.",
    },
    "Moderate Readiness": {
      color: "yellow-green",
      label: "Moderate Readiness",
      descriptor: "Most core elements are in place. Focused attention on the remaining areas will strengthen overall system reliability and organizational confidence.",
    },
    "Material Exposure": {
      color: "yellow",
      label: "Material Exposure",
      descriptor: "Foundational elements exist but are not yet consistent enough to ensure reliable execution. Strengthening these areas will improve documentation, response capability, and organizational defensibility.",
    },
    "High Exposure": {
      color: "orange",
      label: "High Exposure",
      descriptor: "Important controls need attention to strengthen readiness. Prioritizing planning, training, and reporting improvements will build a more reliable and defensible system.",
    },
    "Critical Exposure": {
      color: "red",
      label: "Critical Exposure",
      descriptor: "Core readiness structures need significant development. Establishing foundational planning, reporting, and response systems is the priority for building organizational resilience.",
    },

  };
  return map[classification];
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

// ---------------------------------------------------------------------------
// Normalize any answer value to a canonical "yes" or "no" string.
// Handles: "YES", "Yes", true, false, undefined, null, " yes ", etc.
// ---------------------------------------------------------------------------
function normalizeAnswer(raw: unknown): string {
  if (typeof raw === "string") return raw.trim().toLowerCase();
  if (raw === true) return "yes";
  if (raw === false) return "no";
  return String(raw ?? "").trim().toLowerCase();
}

export function isYes(answer: unknown): boolean {
  return normalizeAnswer(answer) === "yes";
}

// ─── Jurisdiction-Aware Regulatory Basis ────────────────────────────────────
// Returns the correct regulatory citations for a given question and jurisdiction.
// The jurisdiction string is the label from stateProvinces.ts (e.g. "CA — California",
// "ON — Ontario"). Country is inferred from the 2-letter code prefix.

const CA_PROVINCE_CODES = new Set(["ON","AB","BC","MB","NB","NL","NS","PE","QC","SK","NT","NU","YT"]);
const US_STATE_CODES = new Set(["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"]);

function detectJurisdiction(jurisdiction: string): { country: "US" | "CA" | "unknown"; stateCode: string } {
  const code = (jurisdiction || "").trim().split(/[\s—-]/)[0].toUpperCase();
  if (US_STATE_CODES.has(code)) return { country: "US", stateCode: code };
  if (CA_PROVINCE_CODES.has(code)) return { country: "CA", stateCode: code };
  return { country: "unknown", stateCode: code };
}

export function getJurisdictionRegulatoryBasis(
  questionId: string,
  jurisdiction: string
): { regulatoryBasis: string[]; preparednessBasis: string[] } {
  const { country, stateCode } = detectJurisdiction(jurisdiction);

  const PREP_BASIS_Q10 = [
    "CISA active threat preparedness principles recommend real-time notification capability as a core element of coordinated active threat response.",
    "NFPA 3000 (Standard for an Active Shooter / Hostile Event Response Program) addresses coordinated notification and lockdown/lockout procedures as preparedness requirements.",
  ];

  if (questionId === "q10") {
    // Real-Time Alert System
    if (country === "US") {
      return {
        regulatoryBasis: [
          "OSHA General Duty Clause (Section 5(a)(1)): Employers must address recognized hazards. The absence of an employee notification capability may be cited as failure to address a recognized hazard.",
          "If the organization uses an employee alarm system as part of its emergency action plan, OSHA 29 CFR 1910.38 and 1910.165 govern related EAP and alarm requirements — these are not active-threat-specific mandates.",
        ],
        preparednessBasis: PREP_BASIS_Q10,
      };
    }
    if (country === "CA" && stateCode === "ON") {
      return {
        regulatoryBasis: [
          "Ontario Occupational Health and Safety Act (OHSA), Section 25(2)(h) requires employers to take every precaution reasonable in the circumstances for the protection of workers.",
          "OHSA Sections 32.0.1–32.0.8 require employers to develop a workplace violence policy and program, including measures to summon immediate assistance when workplace violence occurs or is likely to occur.",
        ],
        preparednessBasis: PREP_BASIS_Q10,
      };
    }
    if (country === "CA") {
      return {
        regulatoryBasis: [
          "Provincial Occupational Health and Safety legislation (general duty provision) requires employers to take every reasonable precaution to protect workers from recognized hazards, including workplace violence.",
          "Provincial workplace violence provisions require employers to establish procedures for workers to summon immediate assistance when violence occurs or is likely to occur.",
        ],
        preparednessBasis: PREP_BASIS_Q10,
      };
    }
    // Unknown jurisdiction
    return {
      regulatoryBasis: [
        "Applicable occupational health and safety legislation requires employers to establish emergency communication procedures to notify workers of active threats and coordinate an immediate response.",
      ],
      preparednessBasis: PREP_BASIS_Q10,
    };
  }

  const PREP_BASIS_Q16 = [
    "CISA active threat preparedness principles recommend anonymous reporting channels as a key element of pre-incident threat identification and behavioral threat management.",
    "NFPA 3000 preparedness concepts support early threat identification through accessible, confidential reporting mechanisms.",
  ];

  if (questionId === "q16") {
    // Anonymous Threat Reporting
    if (country === "US") {
      const refs: string[] = [
        "OSHA General Duty Clause (Section 5(a)(1)): Employers must address recognized hazards. The absence of a reporting mechanism may be cited as evidence of inadequate hazard identification infrastructure.",
      ];
      if (stateCode === "CA") {
        refs.push(
          "California SB 553 (effective July 1, 2024): Covered employers must establish a Workplace Violence Prevention Plan including a procedure for employees to report workplace violence hazards without fear of retaliation."
        );
      }
      refs.push(
        "State-level equivalents to California SB 553 are emerging in multiple jurisdictions — organizations should verify applicable state requirements."
      );
      return { regulatoryBasis: refs, preparednessBasis: PREP_BASIS_Q16 };
    }
    if (country === "CA" && stateCode === "ON") {
      return {
        regulatoryBasis: [
          "Ontario OHSA Section 32.0.6 requires employers to include in their workplace violence program a procedure for workers to report incidents of workplace violence to the employer or supervisor.",
          "Ontario OHSA Section 32.0.7 requires employers to investigate and address reports of workplace violence, including anonymous reports where practicable.",
          "Ontario Human Rights Code and OHSA reprisal provisions prohibit retaliation against workers who report workplace violence concerns.",
        ],
        preparednessBasis: PREP_BASIS_Q16,
      };
    }
    if (country === "CA") {
      return {
        regulatoryBasis: [
          "Provincial Occupational Health and Safety legislation requires employers to establish a procedure for workers to report incidents of workplace violence without fear of retaliation.",
          "Provincial workplace violence provisions require employers to investigate and address all reports of workplace violence or threatening behavior.",
        ],
        preparednessBasis: PREP_BASIS_Q16,
      };
    }
    // Unknown jurisdiction
    return {
      regulatoryBasis: [
        "Applicable occupational health and safety legislation requires employers to establish a procedure for workers to report threatening behavior without fear of retaliation.",
      ],
      preparednessBasis: PREP_BASIS_Q16,
    };
  }

  // Default: no jurisdiction-specific basis for other questions
  // If in the U.S. and no question-specific citation was returned above,
  // default to the OSHA General Duty Clause as the baseline regulatory reference
  // because federal OSHA represents the baseline standard-of-care where state
  // law is silent. Preparedness basis remains empty unless specified.
  if (country === "US") {
    return {
      regulatoryBasis: [
        "OSHA General Duty Clause (Section 5(a)(1)): Employers must address recognized hazards likely to cause death or serious physical harm; where state law is silent, federal OSHA represents the baseline standard-of-care.",
      ],
      preparednessBasis: [],
    };
  }

  return { regulatoryBasis: [], preparednessBasis: [] };
}

export function runAssessment(
  answers: Record<string, AnswerValue>,
  industry: string,
  jurisdiction: string
): AssessmentOutput {
  // Build effective question set by merging industry-specific overrides
  // (preserves the 16-question architecture while allowing per-industry
  // tweaks to wording, option labels, and weights).
  const industryOverrides = INDUSTRY_QUESTION_OVERRIDES[industry] ?? {};
  const effectiveQuestions: Question[] = QUESTIONS.map((q) => {
    const override = industryOverrides[q.id] as Partial<Question> | undefined;
    if (!override) return { ...q };
    // Shallow merge — callers can override text, weight, options, reportGapOutput, etc.
    return { ...q, ...override } as Question;
  });

  // 1. Compute 0–100 score for each question based on the answer
  // For binary questions: Yes = 100, No = 0
  // For multi-option questions: use the option's inverse deductionFraction (100 × (1 - deductionFraction))
  const questionScores: Record<string, number> = {};
  for (const q of effectiveQuestions) {
    if (q.options && q.options.length > 0) {
      const selectedValue = answers[q.id];
      const selectedOption = q.options.find((o) => o.value === selectedValue);
      if (selectedOption) {
        questionScores[q.id] = Math.round(100 * (1 - selectedOption.deductionFraction));
      } else {
        // No answer → 0 score (full deduction)
        questionScores[q.id] = 0;
      }
    } else {
      // Binary question
      questionScores[q.id] = isYes(answers[q.id]) ? 100 : 0;
    }
  }

  // 2. Compute section scores (0–100, averaged from questions in that section)
  const sectionScores: Record<CategoryKey, number> = {
    planning_documentation: 0,
    training_awareness: 0,
    reporting_communication: 0,
    response_readiness: 0,
    critical_risk_factors: 0,
  };
  const sectionQuestionCounts: Record<CategoryKey, number> = {
    planning_documentation: 0,
    training_awareness: 0,
    reporting_communication: 0,
    response_readiness: 0,
    critical_risk_factors: 0,
  };

  for (const q of effectiveQuestions) {
    sectionScores[q.category] += questionScores[q.id];
    sectionQuestionCounts[q.category] += 1;
  }

  // Average each section score
  for (const category of Object.keys(sectionScores) as CategoryKey[]) {
    if (sectionQuestionCounts[category] > 0) {
      sectionScores[category] = Math.round(sectionScores[category] / sectionQuestionCounts[category]);
    }
  }

  // 3. Compute overall score using industry weighting
  // Overall = Σ(sectionScore × industryWeight)
  const industryWeights = getIndustryWeights(industry);
  let score = 0;
  score += sectionScores.planning_documentation * industryWeights.planning_documentation;
  score += sectionScores.training_awareness * industryWeights.training_awareness;
  score += sectionScores.reporting_communication * industryWeights.reporting_communication;
  score += sectionScores.response_readiness * industryWeights.response_readiness;
  score += sectionScores.critical_risk_factors * industryWeights.critical_risk_factors;
  score = Math.round(score);
  score = Math.max(0, Math.min(100, score));

  // 4. Classification — tied solely to score ranges, no external override
  const classification = classify(score);
  const riskMap = getRiskMap(classification);

  // 5. Category scores (for UI display: same as section scores)
  const categoryScores: CategoryScores = {
    planningDocumentation: sectionScores.planning_documentation,
    trainingAwareness: sectionScores.training_awareness,
    reportingCommunication: sectionScores.reporting_communication,
    responseReadiness: sectionScores.response_readiness,
  };

  // 6. Top gaps (max 5, sorted by severity and question score inverse)
  // For multi-option questions, a question is a "gap" if score < 100.
  // For binary questions, a question is a "gap" if score < 100 (i.e., answer !== "yes").
  const missingQuestions = effectiveQuestions.filter((q) => {
    return questionScores[q.id] < 100;
  });

  // ORDER PRIORITY sort — enforces the mandated severity-tier readiness ranking:
  //   CRITICAL tier: EAP w/ active threat (q2), Risk Assessment (q3), Real-Time Alert System (q10)
  //   HIGH tier:     Anonymous Reporting (q9), Internal Reporting Chain (q7), Incident Documentation (q8)
  //   MODERATE tier: Training (q4, q5, q6) and all other questions
  // HIGH must always rank above MODERATE regardless of question score.
  const ORDER_PRIORITY: Record<string, number> = {
    q2: 100, // CRITICAL — EAP with active threat procedures
    q3: 90,  // CRITICAL — Site-specific risk assessment
    q10: 80, // CRITICAL — Real-Time Alert System (never below training or reporting)
    q9: 75,  // HIGH — Anonymous Reporting Mechanism (HIGH must rank above MODERATE training)
    q7: 74,  // HIGH — Internal Reporting Chain
    q8: 73,  // HIGH — Incident Documentation
    q4: 70,  // MODERATE — Training: threat recognition
    q5: 69,  // MODERATE — Training: active threat response
    q6: 68,  // MODERATE — Training: frequency
  };
  missingQuestions.sort((a, b) => {
    // Primary: ORDER_PRIORITY position (higher number = higher rank)
    const priorityA = ORDER_PRIORITY[a.id] ?? 0;
    const priorityB = ORDER_PRIORITY[b.id] ?? 0;
    if (priorityB !== priorityA) return priorityB - priorityA;
    // Secondary: inverse question score (lower score = higher rank)
    return questionScores[b.id] - questionScores[a.id];
  });

  // GUARANTEE: q9 (Anonymous Reporting, HIGH severity) must always appear in Top 5
  // when the answer is "anon_none" (no reporting mechanism), regardless of how many
  // higher-priority items are missing. If q9 is a gap but was cut off by the slice,
  // replace the 5th item with q9 to ensure legally relevant deficiencies are never omitted.
  const q9Question = effectiveQuestions.find((q) => q.id === "q9")!;
  const q9Answer = answers["q9"];
  const q9IsFullGap = q9Answer === "anon_none" || !q9Answer;
  const sliceBase = missingQuestions.slice(0, 5);
  const q9InSlice = sliceBase.some((q) => q.id === "q9");
  const q9IsMissing = missingQuestions.some((q) => q.id === "q9");
  let topGapsSource = sliceBase;
  if (q9IsFullGap && q9IsMissing && !q9InSlice) {
    // q9 is a full gap but was cut off — replace position 5 with q9
    topGapsSource = [...sliceBase.slice(0, 4), q9Question];
  }

  const topGaps: TopGap[] = topGapsSource.map((q) => {
    if (q.options && q.options.length > 0) {
      const selectedValue = answers[q.id];
      const selectedOption = q.options.find((o) => o.value === selectedValue);
      const gapStatus = selectedOption ? selectedOption.gapStatus : "Not in Place";
      // Use reportGapOutput if available and status is not "In Place"
      const impact = q.reportGapOutput
        ? `${q.reportGapOutput.exposureExplanation} ${q.reportGapOutput.realWorldConsequence}`
        : q.liabilityImpact;
      // Override regulatoryBasis with jurisdiction-aware citations when available
      const dynBasis = getJurisdictionRegulatoryBasis(q.id, jurisdiction);
      const finalReg = dynBasis.regulatoryBasis.length > 0 ? dynBasis.regulatoryBasis : q.regulatoryBasis;
      const finalPrep = dynBasis.preparednessBasis.length > 0 ? dynBasis.preparednessBasis : q.preparednessBasis;
      return {
        id: q.id,
        gap: q.text,
        status: (gapStatus === "In Place" ? "Incomplete" : gapStatus) as TopGap["status"],
        impact,
        ...(q.severity ? { severity: q.severity } : {}),
        ...(finalReg && finalReg.length > 0 ? { regulatoryBasis: finalReg } : {}),
        ...(finalPrep && finalPrep.length > 0 ? { preparednessBasis: finalPrep } : {}),
      };
    }
    // Binary question branch
    const dynBasisBin = getJurisdictionRegulatoryBasis(q.id, jurisdiction);
    const finalRegBin = dynBasisBin.regulatoryBasis.length > 0 ? dynBasisBin.regulatoryBasis : q.regulatoryBasis;
    const finalPrepBin = dynBasisBin.preparednessBasis.length > 0 ? dynBasisBin.preparednessBasis : q.preparednessBasis;
    return {
      id: q.id,
      gap: q.text,
      status: "Not in Place" as const,
      impact: q.liabilityImpact,
      ...(q.severity ? { severity: q.severity } : {}),
      ...(finalRegBin && finalRegBin.length > 0 ? { regulatoryBasis: finalRegBin } : {}),
      ...(finalPrepBin && finalPrepBin.length > 0 ? { preparednessBasis: finalPrepBin } : {}),
    };
  });

  // 6a. Escalation / hard-stop rules
  const { country, stateCode } = detectJurisdiction(jurisdiction);
  const escalationSet = new Set<string>();
  const banners: string[] = [];

  // No documented policy -> escalate Planning & Documentation
  if (!isYes(answers["q1"])) escalationSet.add("planning_documentation");

  // No documented EAP / active threat procedure -> escalate Planning & Documentation and Response Readiness
  if (!isYes(answers["q2"])) {
    escalationSet.add("planning_documentation");
    escalationSet.add("response_readiness");
  }

  // No formal reporting mechanism -> escalate Reporting & Communication
  const q9Val = answers["q9"] as string | undefined;
  if (!q9Val || q9Val === "anon_none") escalationSet.add("reporting_communication");

  // No real-time alert system -> escalate Reporting & Communication and Response Readiness
  const q10Val = answers["q10"] as string | undefined;
  if (!q10Val || q10Val === "ras_none") {
    escalationSet.add("reporting_communication");
    escalationSet.add("response_readiness");
  }

  // No process for individuals of concern -> escalate Critical Risk Factors
  if (!isYes(answers["q15"])) escalationSet.add("critical_risk_factors");

  // No insider threat controls -> escalate Critical Risk Factors
  if (!isYes(answers["q16"])) escalationSet.add("critical_risk_factors");

  // Healthcare-specific mandate escalation: if in a mandate state and missing incident log or program
  let fullAssessmentEscalation = false;
  if (industry === "Healthcare") {
    // For now, treat CA as an example mandate state; if missing incident logging (q8) or policy (q1), escalate
    if (country === "US" && stateCode === "CA" && (questionScores["q8"] < 100 || !isYes(answers["q1"]))) {
      fullAssessmentEscalation = true;
      banners.push("Healthcare mandate likely unmet: incident log or documented violence-prevention program missing — escalate full assessment.");
    }
  }

  // Retail New York warning banner
  if (industry === "Retail" && country === "US" && stateCode === "NY") {
    if (!isYes(answers["q1"]) || !isYes(answers["q5"]) || !q10Val || q10Val === "ras_none") {
      banners.push("New York retail requirements likely unmet: policy, training, or real-time alerting appears missing.");
    }
  }

  const escalationFlags = Array.from(escalationSet);

  // 7. Interpretation (readiness-focused)
  const interpretation = buildInterpretation(classification, missingQuestions, industry);

  // 8. Advisor summary
  const advisorSummary = buildAdvisorSummary(classification, missingQuestions, industry, jurisdiction);

  // 9. Immediate Action Plan
  const immediateActionPlan = buildImmediateActionPlan(missingQuestions);

  // 10. CTA block
  const ctaBlock = [
    "Full Liability Assessment — A structured, on-site evaluation of your organization's exposure across all threat categories, documented for legal and regulatory defensibility.",
    "Site-Specific Plan Development — Development of a customized Active Threat Response Plan and Emergency Action Plan aligned to your facility, industry, and jurisdiction.",
    "Training & Drill Implementation — Delivery of evidence-based active threat training and facilitated drills, with documentation suitable for post-incident review.",
  ];

  // 11. CRM payload
  const crmPayload: CrmPayload = {
    score,
    classification,
    riskLevel: riskMap.color,
    topGaps: topGaps.map((g) => ({
      gap: g.gap,
      status: g.status,
      impact: g.impact,
      ...(g.severity ? { severity: g.severity } : {}),
      ...(g.regulatoryBasis ? { regulatoryBasis: g.regulatoryBasis } : {}),
    })),
    categoryScores,
    industry,
    jurisdiction,
    recommendedActions: immediateActionPlan,
    escalationFlags: [...escalationFlags, ...banners],
  };

  return {
    score,
    classification,
    riskMap,
    topGaps,
    categoryScores,
    interpretation,
    advisorSummary,
    immediateActionPlan,
    ctaBlock,
    crmPayload,
    escalationFlags: [...escalationFlags, ...banners],
  };
}

// Utility: build effective questions for an industry (exported for reuse)
export function buildEffectiveQuestionsForIndustry(industry: string): Question[] {
  const industryOverrides = INDUSTRY_QUESTION_OVERRIDES[industry] ?? {};
  return QUESTIONS.map((q) => {
    const override = industryOverrides[q.id] as Partial<Question> | undefined;
    if (!override) return { ...q };
    return { ...q, ...override } as Question;
  });
}

// Exported assessment model metadata for dev tools and runtime reference
export const ASSESSMENT_MODEL = {
  assessment_version: "industry_v1",
  sections: [
    { key: "planning_documentation", title: "Planning & Documentation", question_count: 3, five_stones_map: ["policy", "plan"] },
    { key: "training_awareness", title: "Training & Awareness", question_count: 3, five_stones_map: ["review", "respond"] },
    { key: "reporting_communication", title: "Reporting & Communication", question_count: 4, five_stones_map: ["report", "respond"] },
    { key: "response_readiness", title: "Response Readiness", question_count: 3, five_stones_map: ["respond"] },
    { key: "critical_risk_factors", title: "Critical Risk Factors", question_count: 3, five_stones_map: ["policy", "report", "review"] },
  ],
  answer_scoring: {
    yes_no: { yes: 100, no: 0 },
    reporting_mechanism: { anonymous_formal: 100, formal_not_anonymous: 70, informal_manager_based: 35, none: 0 },
    alerting_system: { role_based_with_tracking: 100, basic_mass_notification: 70, limited_delayed: 35, none: 0 },
  },
  outcome_bands: [
    { min: 85, max: 100, label: "Defensible Foundation", color: "green" },
    { min: 70, max: 84, label: "Moderate Readiness", color: "yellow_green" },
    { min: 50, max: 69, label: "Material Exposure", color: "yellow" },
    { min: 25, max: 49, label: "High Exposure", color: "orange" },
    { min: 0, max: 24, label: "Critical Exposure", color: "red" },
  ],
};

// ─── Text builders ────────────────────────────────────────────────────────────

function buildInterpretation(
  classification: ClassificationLabel,
  missing: Question[],
  industry: string
): string {
  const missingCount = missing.length;
  const hasPlanningGap = missing.some((q) => q.category === "planning_documentation");
  const hasTrainingGap = missing.some((q) => q.category === "training_awareness");
  const hasReportingGap = missing.some((q) => q.category === "reporting_communication");

  const industryContext =
    industry && industry !== "Other"
      ? ` For organizations in the ${industry} sector, these areas carry increased attention from regulators and legal counsel.`
      : "";

  if (classification === "Critical Exposure") {
    return (
      `This assessment identifies ${missingCount} priority areas for building operational readiness.` +
      ` Foundational systems need attention — ${hasPlanningGap ? "planning and documented response procedures, " : ""}` +
      `${hasTrainingGap ? "consistent training practices, " : ""}` +
      `${hasReportingGap ? "and reliable reporting and escalation pathways, " : ""}` +
      `which together are essential for a dependable readiness posture.${industryContext}`
    );
  }

  if (classification === "High Exposure") {
    return (
      `This assessment identifies ${missingCount} areas where focused improvement will strengthen organizational readiness.` +
      `${hasPlanningGap ? " Strengthening planning and documentation will clarify roles and expectations. " : ""}` +
      `${hasTrainingGap ? " Expanding training coverage will better equip staff for real scenarios. " : ""}` +
      `${hasReportingGap ? " Formalizing reporting processes will ensure concerns are escalated and tracked. " : ""}` +
      `${industryContext}`
    );
  }

  if (classification === "Material Exposure") {
    return (
      `Foundational controls are present in several areas, but ${missingCount} items need attention to achieve consistent execution.` +
      ` Addressing these areas will strengthen operational reliability and the organization's ability to learn from incidents.${industryContext}`
    );
  }

  // Moderate Readiness
  if (classification === "Moderate Readiness") {
    return (
      `Most core readiness elements are in place, with ${missingCount} areas remaining for improvement.` +
      ` Continued attention to these items will further strengthen the organization's overall readiness posture.${industryContext}`
    );
  }

  // Defensible / highest band
  if (classification === "Defensible Foundation") {
    return (
      `Readiness systems are largely established. ${missingCount > 0 ? `There are ${missingCount} items to continue monitoring and maintaining.` : "Maintain regular review and training to sustain this foundation."}${industryContext}`
    );
  }
  // Fallback
  return `Readiness assessment complete.${industryContext}`;
}

function buildAdvisorSummary(
  classification: ClassificationLabel,
  missing: Question[],
  industry: string,
  jurisdiction: string
): string {
  const topMissing = missing
    .slice(0, 3)
    .map((q) => q.text.replace(/\?$/, ""))
    .join("; ");
  const locationContext = jurisdiction ? ` operating in ${jurisdiction}` : "";
  const industryContext = industry && industry !== "Other" ? ` in the ${industry} sector` : "";

  if (classification === "Critical Exposure") {
    return (
      `Your organization${locationContext}${industryContext} has important readiness areas to address. ` +
      `Priority focus areas: ${topMissing}. Establishing documented plans, consistent training, and reliable reporting systems will build a stronger foundation for operational resilience.`
    );
  }

  if (classification === "High Exposure") {
    return (
      `Your organization${locationContext}${industryContext} has clear opportunities to strengthen readiness. Key areas: ${topMissing}. Prioritizing these will improve operational consistency and build confidence in the organization's response capability.`
    );
  }

  if (classification === "Material Exposure") {
    return (
      `Your organization${locationContext}${industryContext} has foundational elements in place with ${missing.length} area${missing.length !== 1 ? "s" : ""} to strengthen. ${missing.length > 0 ? `Key focus areas: ${topMissing}. ` : ""}` +
      `Addressing these will build more reliable execution and a stronger defensibility posture.`
    );
  }
  if (classification === "Defensible Foundation") {
    return (
      `Your organization${locationContext}${industryContext} has a solid readiness foundation. ${missing.length > 0 ? `Continue monitoring: ${topMissing}. ` : ""}` +
      `Ongoing review, training, and documentation will sustain this posture.`
    );
  }
  return `Assessment complete for your organization${locationContext}${industryContext}.`;
}

function buildImmediateActionPlan(missing: Question[]): string[] {
  const actions: string[] = [];
  const has = (id: string) => missing.some((q) => q.id === id);

  // q1: WVPP, q2: EAP with active threat
  if (has("q1") || has("q2")) {
    actions.push(
      "Develop and formalize a Workplace Violence Prevention Policy and an Emergency Action Plan that includes active threat response procedures. These are the foundational documents required to establish any defensible posture — their absence is the single largest liability exposure in this assessment."
    );
  }

  // q3: site-specific risk assessment
  if (has("q3")) {
    actions.push(
      "Commission a site-specific risk assessment and document findings. Without this, the organization fails to meet the evidentiary standard for having identified and addressed its specific threat environment."
    );
  }

  // q4/q5/q6: training
  if (has("q4") || has("q5") || has("q6")) {
    actions.push(
      "Implement structured active threat training for all employees, covering threat recognition, escalation behaviors, and response protocols. Training must be documented, delivered at onboarding, and refreshed on a defined schedule to carry weight in post-incident review."
    );
  }

  // q7/q8: reporting chain and incident documentation
  if (has("q7") || has("q8")) {
    actions.push(
      "Establish a formal internal reporting chain and incident tracking process. These systems create the evidentiary record that demonstrates the organization responded to warning signs before an incident escalated."
    );
  }

  // q9: Anonymous Threat Reporting — generate action based on selected tier
  const q9Gap = missing.find((q) => q.id === "q9");
  if (q9Gap) {
    const q9 = QUESTIONS.find((q) => q.id === "q9");
    if (q9?.reportGapOutput) {
      actions.push(
        `Anonymous Threat Reporting: ${q9.reportGapOutput.requiredFix}`
      );
    }
  }

  // q10: RAS — generate action based on selected tier
  const q10Gap = missing.find((q) => q.id === "q10");
  if (q10Gap) {
    const q10 = QUESTIONS.find((q) => q.id === "q10");
    if (q10?.reportGapOutput) {
      actions.push(
        `Real-Time Alert System (RAS): ${q10.reportGapOutput.requiredFix}`
      );
    }
  }

  if (has("q11") || has("q12") || has("q13")) {
    actions.push(
      "Schedule and document active threat drills with defined roles and post-drill review. Drills without documentation provide no defensibility — the review and corrective action record is what matters in a post-incident examination."
    );
  }

  if (has("q14")) {
    actions.push(
      "Implement a domestic violence or external personal threat protocol. This is a leading cause of workplace violence incidents and a frequently overlooked liability gap — organizations that fail to identify and manage this risk when known face significant exposure."
    );
  }

  if (has("q15")) {
    actions.push(
      "Establish a defined threat assessment or behavioral intervention process. Without a structured mechanism to identify and manage individuals of concern, the organization lacks a critical pre-incident intervention capability."
    );
  }

  if (has("q16")) {
    actions.push(
      "Implement measures to identify and prevent insider threats, including employee risk indicator monitoring, accessible reporting pathways, and defined intervention protocols."
    );
  }

  if (actions.length === 0) {
    actions.push(
      "Conduct an annual review of all existing plans, policies, and training records to ensure they remain current and defensible.",
      "Schedule the next round of active threat drills and document outcomes with corrective action notes.",
      "Verify that all new employees have completed onboarding safety training and that records are retained."
    );
  }

  return actions;
}

// ─── Sample responses for testing ────────────────────────────────────────────

/** All controls in place -> Defensible Position */
export const SAMPLE_RESPONSES_DEFENSIBLE: Record<string, AnswerValue> = {
  q1: "yes",  // WVPP
  q2: "yes",  // EAP with active threat
  q3: "yes",  // Site risk assessment
  q4: "yes",  // Threat recognition training
  q5: "yes",  // Active threat response training
  q6: "yes",  // Onboarding + refresh schedule
  q7: "yes",  // Internal reporting chain
  q8: "yes",  // Incident documentation
  q9: "anon_full",  // Anonymous reporting — full mechanism
  q10: "ras_full",  // RAS — full system
  q11: "yes", // Drills conducted
  q12: "yes", // Drills documented
  q13: "yes", // Roles defined
  q14: "yes", // Domestic violence protocol
  q15: "yes", // Threat assessment process
  q16: "yes", // Insider threat measures
};

/** Several gaps -> Moderate Exposure */
export const SAMPLE_RESPONSES_MODERATE: Record<string, AnswerValue> = {
  q1: "yes",  q2: "yes",  q3: "yes",  q4: "yes",
  q5: "yes",  q6: "yes",  q7: "no",
  q8: "yes",  q9: "anon_formal_only",  q10: "ras_basic",
  q11: "no",  q12: "no",  q13: "yes",
  q14: "yes", q15: "no",  q16: "no",
};

/** Critical gaps -> Severe Exposure */
export const SAMPLE_RESPONSES_HIGH_EXPOSURE: Record<string, AnswerValue> = {
  q1: "no",  q2: "no",  q3: "no",  q4: "no",
  q5: "no",  q6: "no",  q7: "no",
  q8: "no",  q9: "anon_none",  q10: "ras_none",
  q11: "no", q12: "no", q13: "no",
  q14: "no", q15: "no", q16: "no",
};
