/**
 * oshaContent.ts — OSHA Educational Reference Layer — Phase 1 Content Config
 *
 * Single source of truth for all content on the OSHA Workplace Violence Prevention
 * reference page. All content is static and typed. No database or backend required.
 *
 * Phase 2 (state-by-state overlay): add a companion stateContent.ts keyed by
 * two-letter state code, consumed by the same OshaReference page component.
 */

// ── At-a-Glance Checklist ─────────────────────────────────────────────────────

export const OSHA_AT_A_GLANCE = {
  heading: "At-a-Glance",
  subheading: "Core requirements for a defensible workplace violence prevention program",
  urgencyLine: "Gaps in these areas are commonly identified after incidents — not before.",
  items: [
    "Written workplace violence prevention plan",
    "Documented risk assessment",
    "Incident reporting process",
    "Incident log tracking (OSHA 300 Log)",
    "Employee training program",
    "Corrective action tracking",
    "Annual program review",
  ],
};

// ── Section A: Header / Purpose ───────────────────────────────────────────────

export const OSHA_PAGE_HEADER = {
  title: "OSHA Workplace Violence Prevention",
  subtitle: "Educational Reference — Federal Baseline",
  description:
    "A decision-support reference for workplace violence prevention programs. Use this page to understand federal OSHA expectations, core program elements, and required documentation.",
};

// ── Section B: Disclaimer ─────────────────────────────────────────────────────

export const OSHA_DISCLAIMER = {
  heading: "Educational Reference Only",
  body: "This page provides general guidance based on OSHA recommendations. It is not legal advice. Consult qualified legal counsel for compliance decisions specific to your organization.",
};

// ── Section C: OSHA Baseline Overview ────────────────────────────────────────

export const OSHA_BASELINE_OVERVIEW = {
  heading: "OSHA Baseline",
  intro:
    "No single federal standard covers workplace violence exclusively. OSHA enforces prevention obligations through the General Duty Clause and industry-specific guidelines.",
  keyPoints: [
    {
      label: "General Duty Clause",
      text: "Employers must provide a workplace free from recognized hazards likely to cause death or serious harm — including workplace violence where risk is known or foreseeable.",
    },
    {
      label: "Industry-Specific Guidelines",
      text: "OSHA has issued voluntary guidelines for high-risk sectors: healthcare, social services, late-night retail, and transportation.",
    },
    {
      label: "State Plan States",
      text: "22 states and 2 territories operate OSHA-approved State Plans. Some have adopted specific workplace violence rules beyond federal requirements (e.g., California SB 553).",
    },
    {
      label: "Enforcement",
      text: "OSHA enforces primarily through the General Duty Clause. Inspections are typically triggered by fatalities, hospitalizations, or formal complaints.",
    },
  ],
};

// ── Section D: Five Core Prevention Program Elements ─────────────────────────

export const OSHA_FIVE_ELEMENTS = {
  heading: "Five Core Program Elements",
  intro: "OSHA's guidelines consistently identify these five elements as the foundation of an effective prevention program.",
  elements: [
    {
      number: 1,
      title: "Management Commitment & Employee Participation",
      description: "Clear ownership and accountability for workplace safety, with employees involved in program development.",
      artifacts: ["Written prevention policy", "Employee acknowledgment records"],
    },
    {
      number: 2,
      title: "Worksite Analysis",
      description: "Ongoing process to identify conditions, tasks, and situations that place workers at risk.",
      artifacts: ["Risk assessment documentation", "Facility walkthrough records", "Incident trend analysis"],
    },
    {
      number: 3,
      title: "Hazard Prevention and Control",
      description: "Engineering, administrative, and work practice controls implemented to reduce identified risks.",
      artifacts: ["Corrective action log", "Control implementation records"],
    },
    {
      number: 4,
      title: "Safety and Health Training",
      description: "Role-appropriate training for all staff covering hazard recognition, de-escalation, and emergency response.",
      artifacts: ["Training log", "Training curriculum records", "Attendance records"],
    },
    {
      number: 5,
      title: "Recordkeeping and Program Evaluation",
      description: "Maintain incident records and use data to evaluate and improve the program annually.",
      artifacts: ["OSHA 300 Log", "OSHA 301 Incident Report", "Annual program review documentation"],
    },
  ],
};

// ── Section E: Must-Have Documentation ───────────────────────────────────────

export const OSHA_DOCUMENTATION = {
  heading: "Documentation Checklist",
  intro: "If you needed to demonstrate preparedness today, you should have:",
  documents: [
    {
      name: "Written Prevention Plan",
      purpose: "Formal statement of commitment, scope, responsibilities, and procedures.",
      whenNeeded: "Required under California SB 553; strongly recommended for all employers.",
    },
    {
      name: "Risk Assessment",
      purpose: "Documented evaluation of workplace conditions and tasks that may contribute to violence risk.",
      whenNeeded: "Recommended by OSHA; required under some state plans.",
    },
    {
      name: "Incident Report Form",
      purpose: "Record of each incident or near-miss: what happened, who was involved, contributing factors.",
      whenNeeded: "Required for OSHA recordable incidents; recommended for all incidents.",
    },
    {
      name: "Incident Log",
      purpose: "Running log of all incidents and near-misses used to identify patterns over time.",
      whenNeeded: "OSHA 300 Log required for employers with 11+ employees in most industries.",
    },
    {
      name: "Corrective Action Log",
      purpose: "Record of identified hazards, corrective actions taken, responsible parties, and target dates.",
      whenNeeded: "Recommended best practice; required under some state plans.",
    },
    {
      name: "Training Records",
      purpose: "Documentation of all training delivered: dates, topics, trainer, and employee attendance.",
      whenNeeded: "Required under California SB 553; strongly recommended under OSHA General Duty Clause.",
    },
    {
      name: "Annual Review Documentation",
      purpose: "Documented review of the entire prevention program evaluating effectiveness and needed updates.",
      whenNeeded: "Required under California SB 553; recommended best practice under OSHA guidelines.",
    },
  ],
};

// ── Section F: Recordkeeping vs. Reporting Explainer ─────────────────────────

export const OSHA_RECORDKEEPING = {
  heading: "Recordkeeping vs. Reporting",
  intro: "These are two separate obligations with different purposes and timelines.",
  columns: [
    {
      title: "Internal Incident Log",
      icon: "clipboard",
      color: "blue",
      description: "Your organization's own record of all incidents and near-misses.",
      keyPoints: [
        "Maintained internally — not submitted to OSHA",
        "Includes all incidents, not just OSHA recordables",
        "Used for trend analysis and program evaluation",
      ],
    },
    {
      title: "OSHA 300 Log (Recordkeeping)",
      icon: "file-text",
      color: "amber",
      description: "Federal requirement for employers with 11+ employees in most industries.",
      keyPoints: [
        "Covers work-related injuries/illnesses meeting recordability criteria",
        "Must be retained for 5 years",
        "300A Summary posted Feb 1 – Apr 30 annually",
        "Some industries must submit electronically via OSHA ITA",
      ],
    },
    {
      title: "Severe Injury / Fatality Reporting",
      icon: "alert-triangle",
      color: "red",
      description: "Certain events must be reported directly to OSHA within strict deadlines.",
      keyPoints: [
        "Fatality: report within 8 hours",
        "Inpatient hospitalization (1+ employees): report within 24 hours",
        "Amputation or loss of eye: report within 24 hours",
        "Report by phone to nearest OSHA office or 1-800-321-OSHA",
      ],
    },
  ],
};

// ── Section G: Official Resources ────────────────────────────────────────────

export const OSHA_RESOURCES = {
  heading: "Official OSHA Resources",
  disclaimer: "Links lead to external government sources. Provided for educational reference only.",
  resources: [
    {
      category: "Standards and Frameworks",
      links: [
        {
          label: "OSHA Workplace Violence Prevention Programs",
          url: "https://www.osha.gov/workplace-violence",
          description: "OSHA workplace violence prevention hub — programs, guidelines, and sector-specific resources.",
          whenToUse: "Structuring or benchmarking a formal prevention program.",
        },
      ],
    },
    {
      category: "OSHA Core References",
      links: [
        {
          label: "OSHA Workplace Violence Overview",
          url: "https://www.osha.gov/workplace-violence",
          description: "Main OSHA workplace violence page — start here for industry-specific guidance.",
          whenToUse: "First stop for any OSHA workplace violence question.",
        },
        {
          label: "OSHA Workplace Violence — Healthcare & Social Services",
          url: "https://www.osha.gov/healthcare/workplace-violence",
          description: "OSHA sector-specific guidance for healthcare and social service workplace violence prevention.",
          whenToUse: "Building or reviewing a prevention program for healthcare or social service employers.",
        },
        {
          label: "OSHA General Duty Clause (Section 5(a)(1))",
          url: "https://www.osha.gov/laws-regs/oshact/section5-duties",
          description: "The statutory basis for OSHA's workplace violence enforcement authority.",
          whenToUse: "Understanding the legal foundation for employer obligations.",
        },
        {
          label: "OSHA Recordkeeping Rule (29 CFR 1904)",
          url: "https://www.osha.gov/recordkeeping",
          description: "Full recordkeeping requirements including 300 Log, 301 Report, and 300A Summary.",
          whenToUse: "Setting up or auditing your injury and illness recordkeeping system.",
        },
        {
          label: "OSHA Injury Tracking Application (ITA)",
          url: "https://www.osha.gov/injuryreporting",
          description: "Electronic submission portal for required injury and illness data.",
          whenToUse: "Submitting required electronic records to OSHA.",
        },
      ],
    },
    {
      category: "Federal Agency Partners",
      links: [
        {
          label: "NIOSH Workplace Violence Research",
          url: "https://www.cdc.gov/niosh/topics/violence/default.html",
          description: "CDC/NIOSH research and resources on occupational violence prevention.",
          whenToUse: "Researching evidence-based prevention strategies.",
        },
        {
          label: "CISA Active Shooter Preparedness",
          url: "https://www.cisa.gov/topics/physical-security/active-shooter-preparedness",
          description: "CISA resources for active shooter and hostile event preparedness.",
          whenToUse: "Planning or reviewing emergency response protocols.",
        },
        {
          label: "CISA Preventing Workplace Violence Resources",
          url: "https://www.cisa.gov/resources-tools/resources/preventing-workplace-violence-security-awareness-considerations-infographic",
          description: "CISA prevention-focused workplace violence awareness resource.",
          whenToUse: "Reviewing prevention-focused guidance and awareness materials.",
        },
        {
          label: "FBI Workplace Violence Monograph",
          url: "https://www.fbi.gov/file-repository/stats-services-publications-workplace-violence-workplace-violence/view",
          description: "FBI publication on prevention, intervention, threat assessment, and crisis response.",
          whenToUse: "Reviewing threat data and active shooter statistics.",
        },
      ],
    },
  ],
};

// ── Section G2: OSHA Forms & Templates ───────────────────────────────────────

export const OSHA_FORMS = {
  heading: "Use These to Build or Fill Gaps",
  subheading: "Official OSHA forms — grouped by purpose",
  groups: [
    {
      label: "Incident Reporting",
      description: "Use when an incident occurs and must be formally documented.",
      formNames: ["OSHA Form 301"],
    },
    {
      label: "Recordkeeping",
      description: "Ongoing logs required year-round for employers with 11+ employees.",
      formNames: ["OSHA Form 300"],
    },
    {
      label: "Annual Documentation",
      description: "Required annual summary — post and submit by deadline.",
      formNames: ["OSHA Form 300A"],
    },
  ],
  forms: [
    {
      name: "OSHA Form 300",
      fullName: "Log of Work-Related Injuries and Illnesses",
      description: "The primary running log of all recordable work-related injuries and illnesses. Required for employers with 11+ employees in most industries.",
      whenToUse: "Maintain year-round. Record each qualifying incident within 7 days.",
      url: "https://www.osha.gov/recordkeeping/forms",
    },
    {
      name: "OSHA Form 301",
      fullName: "Injury and Illness Incident Report",
      description: "Detailed incident report for each recordable injury or illness. Captures what happened, how it happened, and the nature of the injury.",
      whenToUse: "Complete within 7 days of each recordable incident.",
      url: "https://www.osha.gov/recordkeeping/forms",
    },
    {
      name: "OSHA Form 300A",
      fullName: "Summary of Work-Related Injuries and Illnesses",
      description: "Annual summary of all recordable injuries and illnesses. Must be certified by a company executive and posted in the workplace.",
      whenToUse: "Post February 1 through April 30 each year. Submit electronically if required.",
      url: "https://www.osha.gov/recordkeeping/forms",
    },
  ],
};

// ── Section I: How This Connects to Your Assessment ─────────────────────────

export const OSHA_ASSESSMENT_CONNECTION = {
  heading: "How This Connects to Your Assessment",
  subheading: "Your audit results map directly to OSHA's prevention framework.",
  connections: [
    {
      left: "Audit Gaps",
      arrow: "→",
      right: "OSHA Program Elements",
      detail:
        "Every category flagged in your risk assessment corresponds to one or more of OSHA's five core program elements. A gap in Physical Security maps to Element 2 (Worksite Analysis). A gap in Training maps to Element 4.",
    },
    {
      left: "Documentation Gaps",
      arrow: "→",
      right: "Risk Score Impact",
      detail:
        "Missing documentation — no written plan, no incident log, no training records — directly increases your facility's risk score. Documentation is not administrative overhead; it is evidence of a functioning program.",
    },
    {
      left: "Corrective Actions",
      arrow: "→",
      right: "OSHA Alignment",
      detail:
        "Each corrective action generated in your report addresses a specific OSHA-recognized hazard. Completing and logging corrective actions is the primary mechanism for demonstrating program improvement to regulators.",
    },
  ],
  callout:
    "An audit without a corrective action log is an incomplete program. OSHA expects evidence of follow-through, not just assessment.",
};

// ── Section H: Coming Next — State-by-State Layer Placeholder ────────────────

export const OSHA_COMING_NEXT = {
  heading: "Coming Next: State-by-State Reference Layer",
  description:
    "Phase 2 will add a state-by-state workplace violence law matrix covering all 50 states. It will identify which states have enacted specific laws beyond federal OSHA, summarize key obligations, and link to authoritative state agency resources.",
  plannedFeatures: [
    "Interactive state selector with jurisdiction-specific summaries",
    "Comparison of state requirements vs. federal OSHA baseline",
    "Notable state laws highlighted (California SB 553, New York HERO Act, etc.)",
    "Links to state OSHA plan offices and state-specific forms",
    "Effective dates and compliance deadlines where applicable",
  ],
  architectureNote:
    "State overlay data will be added as a companion config file (shared/stateContent.ts) keyed by two-letter state code, consumed by the same OshaReference page component without structural changes.",
};
