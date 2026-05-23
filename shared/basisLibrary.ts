/**
 * BASIS LIBRARY — Centralized Standard-to-Recommendation Mapping
 *
 * This module is the single source of truth for all regulatory basis citations
 * used across EAP generation, threat assessment outputs, and drill recommendations.
 *
 * RULES:
 * - Each recommendation category ALWAYS maps to the same standard(s).
 * - ACTD Framework is ONLY used for live incident decision-making (Sections 8, 9).
 * - ACTD is NEVER used for: plan maintenance, compliance basis, business continuity,
 *   version control, After-Action Reviews, or special populations.
 * - NFPA 3000 citations MUST include specific section numbers.
 * - NFPA 1600 is used for: business continuity, plan maintenance, recovery, family reunification.
 * - OSHA 1910.165 is used for: employee alarm systems, notification systems.
 */

export const BASIS = {
  // ─── OSHA ──────────────────────────────────────────────────────────────────
  OSHA_GENERAL_DUTY: "OSHA General Duty Clause (Section 5(a)(1))",
  OSHA_1910_38: "OSHA 29 CFR 1910.38",
  OSHA_1910_38_REPORTING: "OSHA 29 CFR 1910.38 — Reporting Procedures",
  OSHA_1910_38_EVACUATION: "OSHA 29 CFR 1910.38 — Evacuation Procedures & Exit Routes",
  OSHA_1910_38_CRITICAL_OPS: "OSHA 29 CFR 1910.38 — Critical Operations Before Evacuation",
  OSHA_1910_38_ACCOUNTABILITY: "OSHA 29 CFR 1910.38 — Employee Accountability",
  OSHA_1910_38_RESCUE: "OSHA 29 CFR 1910.38 — Rescue & Medical Duties",
  OSHA_1910_38_CONTACT: "OSHA 29 CFR 1910.38 — Named Contact Person",
  OSHA_1910_165: "OSHA 29 CFR 1910.165 — Employee Alarm Systems",
  OSHA_3185: "OSHA 3185 — Automated External Defibrillators (AED)",

  // ─── NFPA ──────────────────────────────────────────────────────────────────
  NFPA_3000_PLANNING: "NFPA 3000™ (PS) §6 — Planning",
  NFPA_3000_RISK: "NFPA 3000™ (PS) §7 — Risk Assessment",
  NFPA_3000_TRAINING: "NFPA 3000™ (PS) §10–14 — Training & Competency",
  NFPA_3000_RECOVERY: "NFPA 3000™ (PS) §17 — Recovery",
  NFPA_3000_FACILITY: "NFPA 3000™ (PS) §19 — Facility Preparedness",
  NFPA_3000_MULTIDISCIPLINARY: "NFPA 3000™ (PS) §6 — Multidisciplinary Planning Requirements",
  NFPA_1600_CONTINUITY: "NFPA 1600 — Business Continuity & Recovery",
  NFPA_1600_MAINTENANCE: "NFPA 1600 — Plan Maintenance & Review",
  NFPA_1600_REUNIFICATION: "NFPA 1600 — Family Reunification",
  NFPA_1600_COMMUNICATIONS: "NFPA 1600 — Crisis Communications",

  // ─── FEMA / NIMS / ICS ─────────────────────────────────────────────────────
  FEMA_NIMS_ICS: "FEMA NIMS / ICS",
  FEMA_NIMS_ROLES: "FEMA NIMS — Incident Command System (ICS) Role Alignment",

  // ─── AHA / Medical ─────────────────────────────────────────────────────────
  AHA_ILCOR_2020: "AHA/ILCOR 2020 Guidelines — CPR & Emergency Cardiovascular Care",

  // ─── ADA / Accessibility ───────────────────────────────────────────────────
  ADA_TITLE_III: "ADA Title III — Public Accommodations",
  SECTION_504: "Section 504, Rehabilitation Act — Accessibility Requirements",

  // ─── HIPAA (healthcare conditional) ────────────────────────────────────────
  HIPAA_45_CFR_164_510: "HIPAA 45 CFR §164.510 — Permitted Uses & Disclosures in Emergencies",

  // ─── ACTD (live incident decision-making ONLY) ─────────────────────────────
  ACTD_LIVE_INCIDENT:
    "ACTD Framework (aligned with CISA active threat preparedness principles) — Live Incident Decision-Making",
} as const;

export type BasisKey = keyof typeof BASIS;
export type BasisValue = (typeof BASIS)[BasisKey];

/**
 * CATEGORY-TO-BASIS MAPPING
 * Maps each EAP recommendation category to its required standard(s).
 * Used by the EAP generation prompt to ensure consistent citation across all outputs.
 */
export const CATEGORY_BASIS: Record<string, BasisValue[]> = {
  // Reporting & Communication
  reporting_procedures: [BASIS.OSHA_1910_38_REPORTING, BASIS.OSHA_1910_38_CONTACT],
  internal_reporting_chain: [BASIS.OSHA_1910_38_REPORTING],
  anonymous_reporting: [BASIS.OSHA_GENERAL_DUTY, BASIS.NFPA_3000_PLANNING],

  // Evacuation
  evacuation_routes: [BASIS.OSHA_1910_38_EVACUATION],
  evacuation_drills: [BASIS.OSHA_1910_38_EVACUATION, BASIS.NFPA_3000_TRAINING],
  assembly_points: [BASIS.OSHA_1910_38_EVACUATION],
  critical_ops_before_evacuation: [BASIS.OSHA_1910_38_CRITICAL_OPS],

  // Employee Accountability
  accountability: [BASIS.OSHA_1910_38_ACCOUNTABILITY, BASIS.FEMA_NIMS_ICS],

  // Rescue & Medical
  rescue_medical_duties: [BASIS.OSHA_1910_38_RESCUE],
  aed_placement: [BASIS.AHA_ILCOR_2020, BASIS.OSHA_3185],
  stop_the_bleed: [BASIS.NFPA_3000_TRAINING],
  mass_casualty_triage: [BASIS.FEMA_NIMS_ICS],

  // Employee Alarm System
  alarm_system: [BASIS.OSHA_1910_165],
  lockdown_notification: [BASIS.OSHA_1910_165, BASIS.OSHA_1910_38],
  distinct_signals: [BASIS.OSHA_1910_165],

  // Lockdown / Lockout
  lockdown_procedures: [BASIS.OSHA_1910_38, BASIS.NFPA_3000_FACILITY],
  lockout_procedures: [BASIS.OSHA_1910_38, BASIS.FEMA_NIMS_ICS],

  // Active Threat / ACTD (live incident ONLY)
  actd_response: [BASIS.ACTD_LIVE_INCIDENT],
  active_threat_training: [BASIS.NFPA_3000_TRAINING],
  active_threat_visual_aids: [BASIS.OSHA_1910_38],

  // Training & Drills
  training_curriculum: [BASIS.OSHA_1910_38, BASIS.NFPA_3000_TRAINING],
  micro_drills: [BASIS.NFPA_3000_TRAINING],
  extended_drills: [BASIS.NFPA_3000_TRAINING],
  tabletop_exercise: [BASIS.NFPA_3000_TRAINING, BASIS.FEMA_NIMS_ICS],
  after_action_review: [BASIS.NFPA_3000_TRAINING, BASIS.FEMA_NIMS_ICS],

  // Threat Assessment Team (TAT)
  tat_structure: [BASIS.NFPA_3000_MULTIDISCIPLINARY],
  behavioral_reporting: [BASIS.NFPA_3000_PLANNING, BASIS.OSHA_GENERAL_DUTY],
  pre_incident_intervention: [BASIS.NFPA_3000_RISK],

  // Family Reunification
  reunification_sites: [BASIS.FEMA_NIMS_ICS, BASIS.NFPA_1600_REUNIFICATION],
  family_notification: [BASIS.FEMA_NIMS_ICS, BASIS.NFPA_1600_REUNIFICATION],
  reunification_drills: [BASIS.NFPA_1600_REUNIFICATION],

  // Media & Communications
  media_spokesperson: [BASIS.FEMA_NIMS_ICS],
  message_templates: [BASIS.FEMA_NIMS_ICS, BASIS.NFPA_1600_COMMUNICATIONS],
  social_media_guidelines: [BASIS.FEMA_NIMS_ICS],

  // Business Continuity
  business_impact_analysis: [BASIS.NFPA_1600_CONTINUITY],
  alternate_operating_sites: [BASIS.NFPA_1600_CONTINUITY],
  data_backup_recovery: [BASIS.NFPA_1600_CONTINUITY],
  vendor_continuity: [BASIS.NFPA_1600_CONTINUITY],

  // Special Populations
  disability_assistance: [BASIS.ADA_TITLE_III, BASIS.SECTION_504],
  accessible_routes: [BASIS.ADA_TITLE_III, BASIS.OSHA_1910_38_EVACUATION],
  non_english_speakers: [BASIS.OSHA_1910_38, BASIS.ADA_TITLE_III],

  // Healthcare (conditional)
  hipaa_emergency_disclosure: [BASIS.HIPAA_45_CFR_164_510],

  // Plan Maintenance
  annual_review: [BASIS.OSHA_1910_38, BASIS.NFPA_1600_MAINTENANCE],
  trigger_events: [BASIS.OSHA_1910_38, BASIS.NFPA_1600_MAINTENANCE],
  version_control: [BASIS.FEMA_NIMS_ICS, BASIS.NFPA_1600_MAINTENANCE],
  distribution_list: [BASIS.OSHA_1910_38],

  // ICS Roles
  ics_roles: [BASIS.FEMA_NIMS_ROLES],
  site_lead_nims: [BASIS.FEMA_NIMS_ROLES],

  // Facility Preparedness
  floor_plans: [BASIS.NFPA_3000_FACILITY],
  risk_assessment: [BASIS.NFPA_3000_RISK],
  facility_profile: [BASIS.NFPA_3000_PLANNING],
  contact_directory: [BASIS.OSHA_1910_38_CONTACT],
};

/**
 * ACTD PERMITTED SECTIONS
 * ACTD Framework may ONLY be cited as a basis in these EAP sections.
 * All other sections must use the correct standard from CATEGORY_BASIS.
 */
export const ACTD_PERMITTED_SECTIONS = [
  "actd_response_framework",
  "active_threat_response",
] as const;

/**
 * ACTD PROHIBITED SECTIONS
 * ACTD Framework must NEVER be cited as a basis in these sections.
 * Replace with the correct standard from CATEGORY_BASIS.
 */
export const ACTD_PROHIBITED_SECTIONS = [
  "plan_maintenance",
  "business_continuity",
  "special_populations",
  "training_drills",
  "appendices",
  "after_action_review",
  "version_control",
  "trigger_events",
] as const;

/**
 * OSHA 1910.38 COMPLIANCE MAPPING
 * The six required elements of OSHA 29 CFR 1910.38 that must be explicitly
 * mapped in every EAP. Used to generate the compliance mapping section.
 */
export const OSHA_1910_38_ELEMENTS = [
  {
    element: "1. Reporting Procedures",
    basis: BASIS.OSHA_1910_38_REPORTING,
    description:
      "Procedures for reporting fires and other emergencies, including the method for notifying employees and emergency services.",
  },
  {
    element: "2. Evacuation Procedures & Exit Routes",
    basis: BASIS.OSHA_1910_38_EVACUATION,
    description:
      "Evacuation procedures and emergency escape route assignments, including floor plans or workplace maps clearly showing emergency escape routes.",
  },
  {
    element: "3. Critical Operations Before Evacuation",
    basis: BASIS.OSHA_1910_38_CRITICAL_OPS,
    description:
      "Procedures to account for all employees after evacuation, including procedures for employees who perform or shut down critical plant operations before evacuating.",
  },
  {
    element: "4. Employee Accountability",
    basis: BASIS.OSHA_1910_38_ACCOUNTABILITY,
    description:
      "Procedures to account for all employees after emergency evacuation has been completed.",
  },
  {
    element: "5. Rescue & Medical Duties",
    basis: BASIS.OSHA_1910_38_RESCUE,
    description:
      "Procedures for employees who perform rescue or medical duties, including the names or job titles of persons who may be contacted for further information or explanation of duties under the plan.",
  },
  {
    element: "6. Named Contact Person (by role/title)",
    basis: BASIS.OSHA_1910_38_CONTACT,
    description:
      "The name or job title of every employee who may be contacted by employees who need more information about the plan or an explanation of their duties under the plan.",
  },
] as const;

/**
 * NFPA 3000 SECTION REFERENCE TABLE
 * Maps each NFPA 3000 section to its topic for use in basis citations.
 */
export const NFPA_3000_SECTIONS = {
  "§6": "Planning",
  "§7": "Risk Assessment",
  "§10": "Training",
  "§11": "Competency",
  "§12": "Exercises",
  "§13": "Evaluation",
  "§14": "Corrective Action",
  "§17": "Recovery",
  "§19": "Facility Preparedness",
} as const;
