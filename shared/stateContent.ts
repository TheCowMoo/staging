/**
 * shared/stateContent.ts
 *
 * Phase 2 — State-by-State Workplace Violence Reference Layer
 * Phase 2b — Industry-Aware Overlay Support
 *
 * IMPORTANT: This file is for EDUCATIONAL REFERENCE ONLY.
 * It is NOT a legal compliance engine, rules enforcement system, or scoring system.
 * Content should not be presented as legal advice.
 *
 * State requirements vary and change over time. Always verify with authoritative
 * state agency sources and qualified legal counsel.
 *
 * Last reviewed: January 2026
 */

export interface StateLink {
  label: string;
  url: string;
  description?: string;
}

export interface StateGuidance {
  hasSpecificLaw: boolean;
  lawName?: string;
  summary: string;
  keyRequirements: string[];
  documentationRequired: string[];
  effectiveDate?: string;
  sourceLinks: StateLink[];
  notes: string;
  lastUpdated: string;
}

export interface StateEntry {
  name: string;
  general: StateGuidance;
  industries?: {
    healthcare?: StateGuidance;
    retail?: StateGuidance;
    publicSector?: StateGuidance;
  };
}

export type StateCode = keyof typeof stateContent;

export type IndustryKey = "general" | "healthcare" | "retail" | "publicSector";

export interface IndustryOption {
  key: IndustryKey;
  label: string;
}

export const INDUSTRY_OPTIONS: IndustryOption[] = [
  { key: "general",      label: "General Industry" },
  { key: "healthcare",   label: "Healthcare" },
  { key: "retail",       label: "Retail" },
  { key: "publicSector", label: "Public Sector / Government" },
];

/**
 * Resolve the best guidance for a given state + industry combination.
 * Falls back to general guidance if no industry-specific overlay exists.
 */
export function resolveStateGuidance(
  stateCode: string,
  industry: IndustryKey
): { guidance: StateGuidance; isIndustrySpecific: boolean } | null {
  const entry = stateContent[stateCode];
  if (!entry) return null;
  if (industry !== "general" && entry.industries?.[industry as keyof typeof entry.industries]) {
    return {
      guidance: entry.industries[industry as keyof typeof entry.industries]!,
      isIndustrySpecific: true,
    };
  }
  return { guidance: entry.general, isIndustrySpecific: false };
}

export const stateContent: Record<string, StateEntry> = {

  // ── Priority States with Specific Workplace Violence Laws ────────────────────

  CA: {
    name: "California",
    general: {
      hasSpecificLaw: true,
      lawName: "SB 553 — Workplace Violence Prevention",
      summary:
        "California SB 553 (effective July 1, 2024) requires most employers to establish, implement, and maintain a Workplace Violence Prevention Plan (WVPP). It is the most comprehensive state-level workplace violence prevention law in the United States and applies to nearly all California employers.",
      keyRequirements: [
        "Written Workplace Violence Prevention Plan (WVPP) required",
        "Employee training on WVPP required at hire and annually",
        "Violent incident log must be maintained",
        "Annual review of WVPP required",
        "Employee participation in plan development required",
        "Procedures for reporting, investigating, and responding to incidents required",
      ],
      documentationRequired: [
        "Written WVPP document",
        "Violent incident log",
        "Training records (dates, content, attendees)",
        "Annual review records",
        "Incident investigation records",
      ],
      effectiveDate: "July 1, 2024",
      sourceLinks: [
        {
          label: "Cal/OSHA Workplace Violence Prevention — General Industry",
          url: "https://www.dir.ca.gov/dosh/Workplace-Violence/General-Industry.html",
          description: "Official Cal/OSHA overview of SB 553 requirements",
        },
        {
          label: "Cal/OSHA Frequently Asked Questions",
          url: "https://www.dir.ca.gov/dosh/Workplace-Violence/FAQ.html",
          description: "Official FAQ covering employer obligations",
        },
        {
          label: "Cal/OSHA Workplace Violence Hub (Model Plan & Resources)",
          url: "https://www.dir.ca.gov/dosh/workplace-violence.html",
          description: "Cal/OSHA workplace violence hub — includes model plan template and guidance",
        },
        {
          label: "California SB 553 Full Text",
          url: "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240SB553",
          description: "Official enrolled bill text",
        },
      ],
      notes:
        "Applies to most California employers. Select an industry above to see sector-specific requirements under SB 553 and related standards.",
      lastUpdated: "2026-01",
    },
    industries: {
      healthcare: {
        hasSpecificLaw: true,
        lawName: "Cal/OSHA Healthcare Workplace Violence Prevention Standard (Title 8, §3342)",
        summary:
          "California healthcare employers have been subject to a dedicated workplace violence prevention standard since 2017, predating SB 553. This standard is more prescriptive than the general-industry WVPP and requires a separate written plan specifically for healthcare settings.",
        keyRequirements: [
          "Written Workplace Violence Prevention Plan specific to healthcare required",
          "Annual training for all patient-contact staff required",
          "Violent incident log maintained separately from OSHA 300 log",
          "Engineering controls (panic buttons, security cameras, controlled access) required where feasible",
          "Post-incident debriefing and trauma support required",
          "Annual plan review required",
        ],
        documentationRequired: [
          "Healthcare-specific WVPP document",
          "Violent incident log",
          "Training records",
          "Engineering control assessment records",
          "Post-incident review records",
        ],
        effectiveDate: "April 1, 2017 (healthcare standard); July 1, 2024 (SB 553 general layer)",
        sourceLinks: [
          {
            label: "Cal/OSHA Workplace Violence Hub (Healthcare Guidance)",
          url: "https://www.dir.ca.gov/dosh/workplace-violence.html",
          description: "Cal/OSHA workplace violence hub — includes healthcare-specific standard guidance",
          },
        ],
        notes: "Healthcare employers must comply with both the healthcare-specific standard and SB 553 general requirements.",
        lastUpdated: "2026-01",
      },
      retail: {
        hasSpecificLaw: true,
        lawName: "SB 553 — Retail-Specific Provisions",
        summary:
          "California SB 553 includes specific provisions for retail establishments. Retail employers must address robbery and customer/patron violence in their WVPP and are subject to the same general requirements as all other employers.",
        keyRequirements: [
          "WVPP must specifically address robbery prevention and customer/patron violence",
          "Employee training must include robbery response procedures",
          "Violent incident log must capture all retail-related incidents",
          "Annual review must assess retail-specific hazards",
        ],
        documentationRequired: [
          "Written WVPP with retail-specific hazard section",
          "Violent incident log",
          "Training records including robbery response",
          "Annual review records",
        ],
        effectiveDate: "July 1, 2024",
        sourceLinks: [
          {
            label: "Cal/OSHA SB 553 Overview (Retail Guidance)",
          url: "https://www.dir.ca.gov/dosh/Workplace-Violence/General-Industry.html",
          description: "General industry page includes retail-specific guidance",
          },
        ],
        notes: "Retail employers should ensure their WVPP explicitly addresses robbery, shoplifting escalation, and customer-facing violence scenarios.",
        lastUpdated: "2026-01",
      },
      publicSector: {
        hasSpecificLaw: true,
        lawName: "SB 553 — Public Sector Provisions",
        summary:
          "California public sector employers are covered by SB 553 with limited exceptions. State and local government agencies must develop and implement a WVPP under the same framework as private employers.",
        keyRequirements: [
          "Written WVPP required for all public sector employers",
          "Employee training required at hire and annually",
          "Violent incident log required",
          "Annual review required",
        ],
        documentationRequired: [
          "Written WVPP",
          "Violent incident log",
          "Training records",
          "Annual review records",
        ],
        effectiveDate: "July 1, 2024",
        sourceLinks: [
          {
            label: "Cal/OSHA Workplace Violence Prevention — General Industry",
          url: "https://www.dir.ca.gov/dosh/Workplace-Violence/General-Industry.html",
          description: "Applies to public sector employers under SB 553",
          },
        ],
        notes: "Some public safety functions (law enforcement, corrections) may have additional or separate requirements.",
        lastUpdated: "2026-01",
      },
    },
  },

  NY: {
    name: "New York",
    general: {
      hasSpecificLaw: true,
      lawName: "NY HERO Act (General Employer Framework)",
      summary:
        "New York's HERO Act (2021) established a general workplace safety framework for all private employers. It requires employers to adopt a model airborne infectious disease exposure prevention plan. Select an industry above to see sector-specific requirements including the Retail Worker Safety Act or the Public Employer Workplace Violence Prevention Law.",
      keyRequirements: [
        "All employers: adopt NY DOL model airborne disease prevention plan or equivalent",
        "Employee training on the adopted prevention plan required",
        "Workplace safety committee rights established for employees",
      ],
      documentationRequired: [
        "Adopted airborne disease prevention plan (HERO Act)",
        "Training records",
      ],
      effectiveDate: "2021 (HERO Act)",
      sourceLinks: [
        {
          label: "NY HERO Act Overview",
          url: "https://dol.ny.gov/ny-hero-act",
          description: "Official NY DOL HERO Act page — model plans and employer guidance",
        },
      ],
      notes:
        "General Industry view shows only the HERO Act framework applicable to all private employers. Select Public Sector / Government to see the Public Employer Workplace Violence Prevention Law. Select Retail to see the Retail Worker Safety Act.",
      lastUpdated: "2026-01",
    },
    industries: {
      retail: {
        hasSpecificLaw: true,
        lawName: "NY Retail Worker Safety Act (S8358B / A8947C)",
        summary:
          "New York's Retail Worker Safety Act, signed in September 2024, requires retail employers with 10 or more employees to adopt a workplace violence prevention policy and provide employee training. Employers with 500 or more retail employees statewide must also install panic buttons.",
        keyRequirements: [
          "Retail employers (10+ employees): written workplace violence prevention policy required",
          "Policy must be provided to employees at hire and annually",
          "Employee training on workplace violence prevention required at hire and annually",
          "Retail employers (500+ employees statewide): panic buttons required",
          "Policy must address de-escalation, emergency procedures, and reporting",
        ],
        documentationRequired: [
          "Written workplace violence prevention policy",
          "Training records (dates, content, attendees)",
          "Panic button installation records (if 500+ employees)",
          "Annual policy distribution records",
        ],
        effectiveDate: "March 4, 2025 (policy and training); June 2, 2025 (panic buttons for 500+ employers)",
        sourceLinks: [
          {
            label: "NY DOL Retail Worker Safety Act Overview",
          url: "https://dol.ny.gov/retail-worker-safety",
          description: "Official NY DOL overview and employer guidance",
          },
          {
            label: "NY DOL Retail Worker Safety Act FAQ",
          url: "https://dol.ny.gov/retail-worker-safety-act-frequently-asked-questions",
          description: "Frequently asked questions for retail employers",
          },
          {
            label: "NY Retail Worker Safety Act Full Text",
            url: "https://www.nysenate.gov/legislation/bills/2023/S8358/amendment/B",
            description: "Official enrolled bill text",
          },
        ],
        notes:
          "Applies to retail employers with 10 or more employees. The 500-employee threshold for panic buttons is based on total statewide retail headcount, not per-location. NY DOL model policy and training materials are available on the official DOL page.",
        lastUpdated: "2026-01",
      },
      publicSector: {
        hasSpecificLaw: true,
        lawName: "NY Public Employer Workplace Violence Prevention Law",
        summary:
          "New York public employers (state agencies, local governments, school districts) must comply with the Public Employer Workplace Violence Prevention Law, which requires a written program, risk evaluation, and employee training.",
        keyRequirements: [
          "Written workplace violence prevention program required",
          "Risk evaluation of workplace required",
          "Employee training required",
          "Incident reporting and investigation procedures required",
          "Joint labor-management committee involvement encouraged",
        ],
        documentationRequired: [
          "Written workplace violence prevention program",
          "Risk evaluation records",
          "Training records",
          "Incident reports",
        ],
        effectiveDate: "2006 (Public Employer Law); ongoing updates",
        sourceLinks: [
          {
            label: "NY Public Employer Workplace Violence Prevention",
          url: "https://dol.ny.gov/safety-and-health",
          description: "Official NY DOL guidance for public employers",
          },
        ],
        notes: "Applies to state agencies, local governments, and school districts. Private employers have more limited requirements under the HERO Act.",
        lastUpdated: "2026-01",
      },
      healthcare: {
        hasSpecificLaw: true,
        lawName: "NY Healthcare Workplace Violence Prevention (Public Health Law §2803-d)",
        summary:
          "New York healthcare facilities are subject to specific workplace violence prevention requirements under Public Health Law §2803-d, which requires hospitals and residential healthcare facilities to develop and implement prevention programs.",
        keyRequirements: [
          "Written workplace violence prevention program required",
          "Risk assessment of facility required",
          "Employee training required",
          "Incident reporting and tracking required",
          "Engineering controls required where feasible",
        ],
        documentationRequired: [
          "Written workplace violence prevention program",
          "Risk assessment records",
          "Training records",
          "Incident logs",
        ],
        effectiveDate: "Ongoing (various statutes)",
        sourceLinks: [
          {
            label: "NY DOL Healthcare Workplace Violence Guidance",
          url: "https://dol.ny.gov/safety-and-health",
          description: "NY DOL guidance including healthcare sector",
          },
        ],
        notes: "Healthcare facilities should also review OSHA's healthcare-specific guidelines and Joint Commission standards.",
        lastUpdated: "2026-01",
      },
    },
  },

  WA: {
    name: "Washington",
    general: {
      hasSpecificLaw: true,
      lawName: "WAC 296-817 — Workplace Violence Prevention",
      summary:
        "Washington State has a dedicated workplace violence prevention rule (WAC 296-817) that applies to employers in certain high-risk industries. The Washington Department of Labor & Industries (L&I) enforces these requirements alongside the General Duty Clause for all other employers.",
      keyRequirements: [
        "All employers: General Duty Clause applies — maintain a hazard-free workplace",
        "Covered industries: written workplace violence prevention program required",
        "Hazard assessment and risk evaluation required for covered employers",
        "Employee training required at hire and when new hazards arise",
        "Incident reporting and investigation procedures required",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Written workplace violence prevention program",
        "Hazard assessment records",
        "Training records",
        "Incident logs and investigation reports",
        "Annual review documentation",
      ],
      effectiveDate: "2013 (ongoing updates)",
      sourceLinks: [
        {
          label: "Washington L&I Workplace Violence Prevention",
          url: "https://www.lni.wa.gov/safety-health/safety-rules/rulemaking-stakeholder-information/workplace-violence-prevention-in-health-care",
          description: "Official L&I guidance and resources",
        },
        {
          label: "WAC 296-817 Full Rule",
          url: "https://apps.leg.wa.gov/WAC/default.aspx?cite=296-817",
          description: "Official rule text",
        },
      ],
      notes:
        "WAC 296-817 covers specific high-risk industries. Select an industry above to see whether sector-specific requirements apply. Other employers follow the General Duty Clause and L&I guidance.",
      lastUpdated: "2026-01",
    },
  },

  IL: {
    name: "Illinois",
    general: {
      hasSpecificLaw: false,
      summary:
        "Illinois does not have a general state workplace violence prevention law. Federal OSHA General Duty Clause applies to most employers. Healthcare employers are subject to the Illinois Workplace Violence Prevention Act (2019).",
      keyRequirements: [
        "General Duty Clause applies: maintain a hazard-free workplace",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        {
          label: "Illinois Department of Labor",
          url: "https://labor.illinois.gov/laws-rules/safety.html",
          description: "Illinois DOL workplace safety resources",
        },
      ],
      notes:
        "No general workplace violence law. Select an industry above to see sector-specific requirements.",
      lastUpdated: "2026-01",
    },
    industries: {
      healthcare: {
        hasSpecificLaw: true,
        lawName: "Illinois Workplace Violence Prevention Act (Healthcare)",
        summary:
          "Illinois has enacted specific workplace violence prevention requirements for healthcare settings. The Illinois Workplace Violence Prevention Act (2019) applies to healthcare employers and requires written prevention plans, training, and incident reporting.",
        keyRequirements: [
          "Written workplace violence prevention program required",
          "Hazard assessment required",
          "Employee training required",
          "Incident reporting and investigation required",
          "Engineering controls required where feasible",
        ],
        documentationRequired: [
          "Written workplace violence prevention program",
          "Hazard assessment records",
          "Training records",
          "Incident logs",
        ],
        effectiveDate: "2019 (healthcare sector)",
        sourceLinks: [
          {
            label: "Illinois Department of Labor",
            url: "https://labor.illinois.gov/laws-rules/safety.html",
            description: "Illinois DOL workplace safety resources",
          },
        ],
        notes:
          "Applies to healthcare employers. All other employers follow federal OSHA General Duty Clause.",
        lastUpdated: "2026-01",
      },
    },
  },

  NJ: {
    name: "New Jersey",
    general: {
      hasSpecificLaw: false,
      summary:
        "New Jersey does not have a general workplace violence prevention law for private employers. Federal OSHA General Duty Clause applies. Public employers and healthcare facilities have sector-specific requirements.",
      keyRequirements: [
        "General Duty Clause applies: maintain a hazard-free workplace",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        {
          label: "NJ Department of Labor",
          url: "https://www.nj.gov/labor/",
          description: "NJ DOL workplace safety resources",
        },
      ],
      notes:
        "No general workplace violence law for private employers. Select an industry above to see sector-specific requirements.",
      lastUpdated: "2026-01",
    },
    industries: {
      healthcare: {
        hasSpecificLaw: true,
        lawName: "NJ Healthcare Workplace Violence Prevention",
        summary:
          "New Jersey healthcare employers are subject to workplace violence prevention requirements enforced through the NJ Department of Health and federal OSHA healthcare guidelines.",
        keyRequirements: [
          "Written workplace violence prevention program required",
          "Hazard assessment required",
          "Employee training required",
          "Incident reporting and investigation required",
        ],
        documentationRequired: [
          "Written workplace violence prevention program",
          "Training records",
          "Incident reports",
        ],
        effectiveDate: "Ongoing",
        sourceLinks: [
          {
            label: "NJ DOH Healthcare Workplace Safety",
            url: "https://www.nj.gov/health/",
            description: "NJ Department of Health resources",
          },
        ],
        notes:
          "Healthcare employers should also follow OSHA's healthcare-specific guidelines.",
        lastUpdated: "2026-01",
      },
      publicSector: {
        hasSpecificLaw: true,
        lawName: "NJ Public Employees Occupational Safety and Health Act (PEOSH)",
        summary:
          "New Jersey public employers (state and local government) are covered by the NJ Public Employees Occupational Safety and Health (PEOSH) program, which requires workplace violence prevention programs for public employees.",
        keyRequirements: [
          "Written workplace violence prevention program required",
          "Employee training required",
          "Incident reporting and investigation required",
        ],
        documentationRequired: [
          "Written workplace violence prevention program",
          "Training records",
          "Incident reports",
        ],
        effectiveDate: "Ongoing",
        sourceLinks: [
          {
            label: "NJ PEOSH Workplace Violence Prevention",
            url: "https://www.nj.gov/labor/safetyandhealth/programs-services/peosh/",
            description: "NJ public employee safety program",
          },
        ],
        notes:
          "Applies to state and local government employers. Private employers follow federal OSHA General Duty Clause.",
        lastUpdated: "2026-01",
      },
    },
  },

  OR: {
    name: "Oregon",
    general: {
      hasSpecificLaw: false,
      summary:
        "Oregon OSHA enforces the General Duty Clause for most employers. Healthcare and social service employers are subject to additional sector-specific requirements under Oregon OSHA rules.",
      keyRequirements: [
        "General Duty Clause applies under Oregon OSHA",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        {
          label: "Oregon OSHA Workplace Violence Prevention",
          url: "https://osha.oregon.gov/Pages/topics/violence-in-the-workplace.aspx",
          description: "Oregon OSHA guidance and resources",
        },
      ],
      notes:
        "No general workplace violence law for all employers. Select an industry above to see sector-specific requirements.",
      lastUpdated: "2026-01",
    },
    industries: {
      healthcare: {
        hasSpecificLaw: true,
        lawName: "Oregon Workplace Violence Prevention (Healthcare and Social Services)",
        summary:
          "Oregon has enacted specific workplace violence prevention requirements for healthcare and social service employers. Oregon OSHA enforces these requirements under dedicated rules.",
        keyRequirements: [
          "Written workplace violence prevention program required",
          "Hazard assessment required",
          "Engineering and administrative controls required",
          "Employee training required",
          "Incident reporting and investigation required",
          "Annual program review required",
        ],
        documentationRequired: [
          "Written workplace violence prevention program",
          "Hazard assessment records",
          "Training records",
          "Incident logs",
          "Annual review records",
        ],
        effectiveDate: "2004 (healthcare); ongoing updates",
        sourceLinks: [
          {
            label: "Oregon OSHA Workplace Violence Prevention",
            url: "https://osha.oregon.gov/Pages/topics/violence-in-the-workplace.aspx",
            description: "Oregon OSHA guidance and resources",
          },
        ],
        notes:
          "Applies to healthcare and social service employers. All other employers follow Oregon OSHA General Duty Clause.",
        lastUpdated: "2026-01",
      },
    },
  },

  MD: {
    name: "Maryland",
    general: {
      hasSpecificLaw: false,
      summary:
        "Maryland operates a state OSHA plan (MOSH). No general workplace violence prevention law exists for all employers. Healthcare employers are subject to sector-specific requirements.",
      keyRequirements: [
        "General Duty Clause applies under MOSH",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        {
          label: "Maryland MOSH",
          url: "https://www.labor.maryland.gov/labor/mosh/",
          description: "Maryland OSHA program",
        },
      ],
      notes:
        "No general workplace violence law. Select an industry above to see sector-specific requirements.",
      lastUpdated: "2026-01",
    },
    industries: {
      healthcare: {
        hasSpecificLaw: true,
        lawName: "Maryland Workplace Violence Prevention (Healthcare)",
        summary:
          "Maryland has enacted workplace violence prevention requirements for healthcare employers. The Maryland Occupational Safety and Health (MOSH) program enforces these requirements.",
        keyRequirements: [
          "Written workplace violence prevention program required",
          "Hazard assessment required",
          "Employee training required",
          "Incident reporting and investigation required",
        ],
        documentationRequired: [
          "Written workplace violence prevention program",
          "Hazard assessment records",
          "Training records",
          "Incident logs",
        ],
        effectiveDate: "Ongoing",
        sourceLinks: [
          {
            label: "Maryland MOSH Workplace Violence",
            url: "https://www.labor.maryland.gov/labor/mosh/",
            description: "Maryland OSHA program",
          },
        ],
        notes:
          "Applies to healthcare employers. All other employers follow MOSH General Duty Clause.",
        lastUpdated: "2026-01",
      },
    },
  },

  MN: {
    name: "Minnesota",
    general: {
      hasSpecificLaw: false,
      summary:
        "Minnesota operates a state OSHA plan (Minnesota OSHA). No general workplace violence prevention law exists for all employers. Healthcare employers are subject to sector-specific requirements.",
      keyRequirements: [
        "General Duty Clause applies under Minnesota OSHA",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        {
          label: "Minnesota DLI Workplace Violence",
          url: "https://www.dli.mn.gov/business/workplace-safety-and-health/mnosha-wsc-workplace-violence-prevention",
          description: "Minnesota DLI workplace violence resources",
        },
      ],
      notes:
        "No general workplace violence law. Select an industry above to see sector-specific requirements.",
      lastUpdated: "2026-01",
    },
    industries: {
      healthcare: {
        hasSpecificLaw: true,
        lawName: "Minnesota Workplace Violence Prevention (Healthcare)",
        summary:
          "Minnesota has enacted specific workplace violence prevention requirements for healthcare employers. The Minnesota Department of Labor and Industry (DLI) enforces these requirements.",
        keyRequirements: [
          "Written workplace violence prevention program required",
          "Hazard assessment required",
          "Employee training required",
          "Incident reporting and investigation required",
          "Engineering controls required where feasible",
        ],
        documentationRequired: [
          "Written workplace violence prevention program",
          "Hazard assessment records",
          "Training records",
          "Incident logs",
        ],
        effectiveDate: "2019 (healthcare sector)",
        sourceLinks: [
          {
            label: "Minnesota DLI Workplace Violence",
            url: "https://www.dli.mn.gov/business/workplace-safety-and-health/mnosha-wsc-workplace-violence-prevention",
            description: "Minnesota DLI workplace violence resources",
          },
        ],
        notes:
          "Applies to healthcare employers. All other employers follow Minnesota OSHA General Duty Clause.",
        lastUpdated: "2026-01",
      },
    },
  },

  CT: {
    name: "Connecticut",
    general: {
      hasSpecificLaw: false,
      summary:
        "Connecticut does not have a general workplace violence prevention law for all employers. Federal OSHA General Duty Clause applies. Healthcare employers are subject to sector-specific requirements.",
      keyRequirements: [
        "General Duty Clause applies",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        {
          label: "Connecticut DOL Workplace Safety",
          url: "https://portal.ct.gov/dol",
          description: "Connecticut DOL safety resources",
        },
      ],
      notes:
        "No general workplace violence law. Select an industry above to see sector-specific requirements.",
      lastUpdated: "2026-01",
    },
    industries: {
      healthcare: {
        hasSpecificLaw: true,
        lawName: "Connecticut Workplace Violence Prevention (Healthcare)",
        summary:
          "Connecticut has enacted workplace violence prevention requirements for healthcare employers. The Connecticut Department of Labor (CTDOL) enforces these requirements.",
        keyRequirements: [
          "Written workplace violence prevention program required",
          "Hazard assessment required",
          "Employee training required",
          "Incident reporting and investigation required",
        ],
        documentationRequired: [
          "Written workplace violence prevention program",
          "Hazard assessment records",
          "Training records",
          "Incident logs",
        ],
        effectiveDate: "Ongoing",
        sourceLinks: [
          {
            label: "Connecticut DOL Workplace Safety",
            url: "https://portal.ct.gov/dol",
            description: "Connecticut DOL safety resources",
          },
        ],
        notes:
          "Applies to healthcare employers. All other employers follow federal OSHA General Duty Clause.",
        lastUpdated: "2026-01",
      },
    },
  },

  CO: {
    name: "Colorado",
    general: {
      hasSpecificLaw: false,
      summary:
        "Colorado OSHA enforces the General Duty Clause for most employers. Healthcare employers and late-night retail establishments are subject to additional sector-specific requirements.",
      keyRequirements: [
        "General Duty Clause applies under Colorado OSHA",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        {
          label: "Colorado OSHA Workplace Safety",
          url: "https://www.osha.gov/workplace-violence",
          description: "Colorado OSHA resources",
        },
      ],
      notes:
        "No general workplace violence law for all employers. Select an industry above to see sector-specific requirements.",
      lastUpdated: "2026-01",
    },
    industries: {
      healthcare: {
        hasSpecificLaw: true,
        lawName: "Colorado OSHA Workplace Violence Prevention (Healthcare)",
        summary:
          "Colorado has enacted specific workplace violence prevention requirements for healthcare employers. Colorado OSHA enforces these requirements.",
        keyRequirements: [
          "Written workplace violence prevention program required",
          "Hazard assessment required",
          "Employee training required",
          "Incident reporting and investigation required",
        ],
        documentationRequired: [
          "Written workplace violence prevention program",
          "Training records",
          "Incident reports",
        ],
        effectiveDate: "Ongoing",
        sourceLinks: [
          {
            label: "Colorado OSHA Workplace Safety",
            url: "https://www.osha.gov/workplace-violence",
            description: "Colorado OSHA resources",
          },
        ],
        notes:
          "Applies to healthcare employers. All other employers follow Colorado OSHA General Duty Clause.",
        lastUpdated: "2026-01",
      },
      retail: {
        hasSpecificLaw: true,
        lawName: "Colorado OSHA Workplace Violence Prevention (Late-Night Retail)",
        summary:
          "Colorado has enacted specific workplace violence prevention requirements for late-night retail establishments. Colorado OSHA enforces these requirements.",
        keyRequirements: [
          "Security measures and training required for late-night retail",
          "Hazard assessment required",
          "Employee training required",
          "Incident reporting and investigation required",
        ],
        documentationRequired: [
          "Security assessment records",
          "Training records",
          "Incident reports",
        ],
        effectiveDate: "Ongoing",
        sourceLinks: [
          {
            label: "Colorado OSHA Workplace Safety",
            url: "https://www.osha.gov/workplace-violence",
            description: "Colorado OSHA resources",
          },
        ],
        notes:
          "Applies to late-night retail establishments. All other retail employers follow Colorado OSHA General Duty Clause.",
        lastUpdated: "2026-01",
      },
    },
  },

  ME: {
    name: "Maine",
    general: {
      hasSpecificLaw: false,
      summary:
        "Maine does not have a general workplace violence prevention law for all employers. Federal OSHA General Duty Clause applies. Healthcare employers are subject to sector-specific requirements.",
      keyRequirements: [
        "General Duty Clause applies",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        {
          label: "Maine DOL Workplace Safety",
          url: "https://www.maine.gov/labor/workplace_safety/",
          description: "Maine DOL safety resources",
        },
      ],
      notes:
        "No general workplace violence law. Select an industry above to see sector-specific requirements.",
      lastUpdated: "2026-01",
    },
    industries: {
      healthcare: {
        hasSpecificLaw: true,
        lawName: "Maine Workplace Violence Prevention (Healthcare)",
        summary:
          "Maine has enacted workplace violence prevention requirements for healthcare employers. The Maine Department of Labor enforces these requirements alongside federal OSHA standards.",
        keyRequirements: [
          "Written workplace violence prevention program required",
          "Hazard assessment required",
          "Employee training required",
          "Incident reporting procedures required",
        ],
        documentationRequired: [
          "Written workplace violence prevention program",
          "Hazard assessment records",
          "Training records",
          "Incident reports",
        ],
        effectiveDate: "2019 (healthcare sector)",
        sourceLinks: [
          {
            label: "Maine DOL Workplace Safety",
            url: "https://www.maine.gov/labor/workplace_safety/",
            description: "Maine DOL safety resources",
          },
        ],
        notes:
          "Applies to healthcare employers. All other employers follow Maine DOL general duty guidance.",
        lastUpdated: "2026-01",
      },
    },
  },

  NV: {
    name: "Nevada",
    general: {
      hasSpecificLaw: false,
      summary:
        "Nevada operates a state OSHA plan (NV OSHA). No general workplace violence prevention law exists for all employers. Healthcare employers are subject to sector-specific requirements.",
      keyRequirements: [
        "General Duty Clause applies under NV OSHA",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        {
          label: "Nevada OSHA",
          url: "https://dir.nv.gov/OSHA/Home/",
          description: "NV OSHA resources",
        },
      ],
      notes:
        "No general workplace violence law. Select an industry above to see sector-specific requirements.",
      lastUpdated: "2026-01",
    },
    industries: {
      healthcare: {
        hasSpecificLaw: true,
        lawName: "Nevada Workplace Violence Prevention (Healthcare)",
        summary:
          "Nevada has enacted workplace violence prevention requirements for healthcare employers. The Nevada Occupational Safety and Health Administration (NV OSHA) enforces these requirements.",
        keyRequirements: [
          "Written workplace violence prevention program required",
          "Hazard assessment required",
          "Engineering controls required where feasible",
          "Employee training required",
          "Incident reporting and investigation required",
        ],
        documentationRequired: [
          "Written workplace violence prevention program",
          "Hazard assessment records",
          "Training records",
          "Incident logs",
        ],
        effectiveDate: "2018 (healthcare sector)",
        sourceLinks: [
          {
            label: "Nevada OSHA Workplace Violence",
            url: "https://dir.nv.gov/OSHA/Home/",
            description: "NV OSHA resources",
          },
        ],
        notes:
          "Applies to healthcare employers. All other employers follow NV OSHA general duty guidance.",
        lastUpdated: "2026-01",
      },
    },
  },

  VT: {
    name: "Vermont",
    general: {
      hasSpecificLaw: false,
      summary:
        "Vermont operates a state OSHA plan (VOSHA). No general workplace violence prevention law exists for all employers. Public employers are subject to sector-specific requirements.",
      keyRequirements: [
        "General Duty Clause applies under VOSHA",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        {
          label: "Vermont OSHA (VOSHA)",
          url: "https://labor.vermont.gov/vosha",
          description: "VOSHA resources",
        },
      ],
      notes:
        "No general workplace violence law. Select an industry above to see sector-specific requirements.",
      lastUpdated: "2026-01",
    },
    industries: {
      publicSector: {
        hasSpecificLaw: true,
        lawName: "Vermont Workplace Violence Prevention (Public Sector)",
        summary:
          "Vermont has enacted workplace violence prevention requirements for public employers. The Vermont Occupational Safety and Health Administration (VOSHA) enforces these requirements alongside federal OSHA standards.",
        keyRequirements: [
          "Written workplace violence prevention program required",
          "Risk assessment required",
          "Employee training required",
          "Incident reporting procedures required",
        ],
        documentationRequired: [
          "Written workplace violence prevention program",
          "Risk assessment records",
          "Training records",
          "Incident reports",
        ],
        effectiveDate: "Ongoing",
        sourceLinks: [
          {
            label: "Vermont OSHA Workplace Violence",
            url: "https://labor.vermont.gov/vosha",
            description: "VOSHA resources",
          },
        ],
        notes:
          "Applies to public employers. Private employers follow federal OSHA General Duty Clause.",
        lastUpdated: "2026-01",
      },
    },
  },

  // ── States Following Federal OSHA General Duty Clause ────────────────────────

  AL: {
    name: "Alabama",
    general: {
      hasSpecificLaw: false,
      summary:
        "Alabama does not have a specific state workplace violence prevention law. Employers are covered by federal OSHA's General Duty Clause, which requires employers to provide a workplace free from recognized hazards.",
      keyRequirements: [
        "General Duty Clause applies: maintain a hazard-free workplace",
        "Industry-specific OSHA standards may apply (healthcare, construction, etc.)",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply.",
      lastUpdated: "2026-01",
    },
  },

  AK: {
    name: "Alaska",
    general: {
      hasSpecificLaw: false,
      summary:
        "Alaska operates a state OSHA plan (Alaska OSHA) that must be at least as effective as federal OSHA. No specific workplace violence prevention law exists beyond the General Duty Clause.",
      keyRequirements: [
        "General Duty Clause applies under Alaska OSHA",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "Alaska OSHA", url: "https://labor.alaska.gov/lss/oshhome.htm" },
      ],
      notes: "State OSHA plan. No specific workplace violence law beyond General Duty Clause.",
      lastUpdated: "2026-01",
    },
  },

  AZ: {
    name: "Arizona",
    general: {
      hasSpecificLaw: false,
      summary:
        "Arizona operates a state OSHA plan (Arizona Division of Occupational Safety and Health — ADOSH). No specific workplace violence prevention law exists beyond the General Duty Clause.",
      keyRequirements: [
        "General Duty Clause applies under ADOSH",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "Arizona ADOSH", url: "https://www.osha.gov/stateplans/az" },
      ],
      notes: "State OSHA plan. No specific workplace violence law beyond General Duty Clause.",
      lastUpdated: "2026-01",
    },
  },

  AR: {
    name: "Arkansas",
    general: {
      hasSpecificLaw: false,
      summary:
        "Arkansas does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies.",
      keyRequirements: [
        "General Duty Clause applies",
        "Industry-specific OSHA standards may apply",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply.",
      lastUpdated: "2026-01",
    },
  },

  DC: {
    name: "District of Columbia",
    general: {
      hasSpecificLaw: false,
      summary:
        "The District of Columbia does not have a specific workplace violence prevention law. DC employers are covered by federal OSHA.",
      keyRequirements: [
        "Federal OSHA General Duty Clause applies",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "Federal OSHA jurisdiction. No DC-specific workplace violence law. Select an industry above to see sector-specific guidance.",
      lastUpdated: "2026-01",
    },
  },

  DE: {
    name: "Delaware",
    general: {
      hasSpecificLaw: false,
      summary:
        "Delaware operates a state OSHA plan (Delaware OSHA). No specific workplace violence prevention law exists beyond the General Duty Clause.",
      keyRequirements: [
        "General Duty Clause applies under Delaware OSHA",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "Delaware OSHA", url: "https://industrialaffairs.delaware.gov/" },
      ],
      notes: "State OSHA plan. No specific workplace violence law beyond General Duty Clause.",
      lastUpdated: "2026-01",
    },
  },

  FL: {
    name: "Florida",
    general: {
      hasSpecificLaw: false,
      summary:
        "Florida does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies to most employers.",
      keyRequirements: [
        "General Duty Clause applies",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No general workplace violence law. Select an industry above to see sector-specific requirements.",
      lastUpdated: "2026-01",
    },
    industries: {
      publicSector: {
        hasSpecificLaw: true,
        lawName: "Florida Marjory Stoneman Douglas High School Public Safety Act (Schools)",
        summary:
          "Florida public schools are subject to the Marjory Stoneman Douglas High School Public Safety Act (2018), which requires specific safety measures including threat assessment teams, active shooter drills, and mental health resources.",
        keyRequirements: [
          "Threat assessment team required at each school",
          "Active shooter drills required",
          "Mental health resources required",
          "School safety officers required",
          "Reporting and documentation of threats required",
        ],
        documentationRequired: [
          "Threat assessment records",
          "Drill records",
          "Safety officer records",
          "Incident reports",
        ],
        effectiveDate: "2018 (MSD Act)",
        sourceLinks: [
          { label: "Florida MSD Act (Schools)", url: "https://www.fldoe.org/safe-schools/" },
          { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
        ],
        notes: "Applies to Florida public schools. Other public employers follow federal OSHA General Duty Clause.",
        lastUpdated: "2026-01",
      },
    },
  },

  GA: {
    name: "Georgia",
    general: {
      hasSpecificLaw: false,
      summary:
        "Georgia does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies.",
      keyRequirements: [
        "General Duty Clause applies",
        "Industry-specific OSHA standards may apply",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply.",
      lastUpdated: "2026-01",
    },
  },

  HI: {
    name: "Hawaii",
    general: {
      hasSpecificLaw: false,
      summary:
        "Hawaii operates a state OSHA plan (Hawaii OSHA — HIOSH). No specific workplace violence prevention law exists beyond the General Duty Clause.",
      keyRequirements: [
        "General Duty Clause applies under HIOSH",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "Hawaii HIOSH", url: "https://labor.hawaii.gov/hiosh/" },
      ],
      notes: "State OSHA plan. No specific workplace violence law beyond General Duty Clause.",
      lastUpdated: "2026-01",
    },
  },

  ID: {
    name: "Idaho",
    general: {
      hasSpecificLaw: false,
      summary:
        "Idaho does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies.",
      keyRequirements: [
        "General Duty Clause applies",
        "Industry-specific OSHA standards may apply",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply.",
      lastUpdated: "2026-01",
    },
  },

  IN: {
    name: "Indiana",
    general: {
      hasSpecificLaw: false,
      summary:
        "Indiana does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies.",
      keyRequirements: [
        "General Duty Clause applies",
        "Industry-specific OSHA standards may apply",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply.",
      lastUpdated: "2026-01",
    },
  },

  IA: {
    name: "Iowa",
    general: {
      hasSpecificLaw: false,
      summary:
        "Iowa operates a state OSHA plan (Iowa OSHA). No specific workplace violence prevention law exists beyond the General Duty Clause.",
      keyRequirements: [
        "General Duty Clause applies under Iowa OSHA",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "Iowa OSHA", url: "https://www.iowadivisionoflabor.gov/iowa-osha" },
      ],
      notes: "State OSHA plan. No specific workplace violence law beyond General Duty Clause.",
      lastUpdated: "2026-01",
    },
  },

  KS: {
    name: "Kansas",
    general: {
      hasSpecificLaw: false,
      summary:
        "Kansas does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies.",
      keyRequirements: [
        "General Duty Clause applies",
        "Industry-specific OSHA standards may apply",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply.",
      lastUpdated: "2026-01",
    },
  },

  KY: {
    name: "Kentucky",
    general: {
      hasSpecificLaw: false,
      summary:
        "Kentucky operates a state OSHA plan (Kentucky Labor Cabinet). No specific workplace violence prevention law exists beyond the General Duty Clause.",
      keyRequirements: [
        "General Duty Clause applies under Kentucky OSHA",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "Kentucky Labor Cabinet", url: "https://elc.ky.gov/" },
      ],
      notes: "State OSHA plan. No specific workplace violence law beyond General Duty Clause.",
      lastUpdated: "2026-01",
    },
  },

  LA: {
    name: "Louisiana",
    general: {
      hasSpecificLaw: false,
      summary:
        "Louisiana does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies.",
      keyRequirements: [
        "General Duty Clause applies",
        "Industry-specific OSHA standards may apply",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply.",
      lastUpdated: "2026-01",
    },
  },

  MA: {
    name: "Massachusetts",
    general: {
      hasSpecificLaw: false,
      summary:
        "Massachusetts does not have a specific state workplace violence prevention law for general employers. Federal OSHA General Duty Clause applies.",
      keyRequirements: [
        "General Duty Clause applies",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "Massachusetts DPH Workplace Safety", url: "https://www.mass.gov/orgs/department-of-public-health" },
      ],
      notes: "No general workplace violence law. Select an industry above to see sector-specific guidance.",
      lastUpdated: "2026-01",
    },
  },

  MI: {
    name: "Michigan",
    general: {
      hasSpecificLaw: false,
      summary:
        "Michigan operates a state OSHA plan (Michigan OSHA — MIOSHA). No specific workplace violence prevention law exists beyond the General Duty Clause.",
      keyRequirements: [
        "General Duty Clause applies under MIOSHA",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "Michigan MIOSHA", url: "https://www.michigan.gov/leo/bureaus-agencies/ors/miosha" },
      ],
      notes: "State OSHA plan. No specific workplace violence law beyond General Duty Clause. Select an industry above to see sector-specific guidance.",
      lastUpdated: "2026-01",
    },
  },

  MS: {
    name: "Mississippi",
    general: {
      hasSpecificLaw: false,
      summary:
        "Mississippi does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies.",
      keyRequirements: [
        "General Duty Clause applies",
        "Industry-specific OSHA standards may apply",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply.",
      lastUpdated: "2026-01",
    },
  },

  MO: {
    name: "Missouri",
    general: {
      hasSpecificLaw: false,
      summary:
        "Missouri does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies.",
      keyRequirements: [
        "General Duty Clause applies",
        "Industry-specific OSHA standards may apply",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply.",
      lastUpdated: "2026-01",
    },
  },

  MT: {
    name: "Montana",
    general: {
      hasSpecificLaw: false,
      summary:
        "Montana operates a state OSHA plan (Montana Department of Labor and Industry). No specific workplace violence prevention law exists beyond the General Duty Clause.",
      keyRequirements: [
        "General Duty Clause applies under Montana OSHA",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "Montana DLI Safety", url: "https://dli.mt.gov/worker/" },
      ],
      notes: "State OSHA plan. No specific workplace violence law beyond General Duty Clause.",
      lastUpdated: "2026-01",
    },
  },

  NE: {
    name: "Nebraska",
    general: {
      hasSpecificLaw: false,
      summary:
        "Nebraska does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies.",
      keyRequirements: [
        "General Duty Clause applies",
        "Industry-specific OSHA standards may apply",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply.",
      lastUpdated: "2026-01",
    },
  },

  NH: {
    name: "New Hampshire",
    general: {
      hasSpecificLaw: false,
      summary:
        "New Hampshire does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies.",
      keyRequirements: [
        "General Duty Clause applies",
        "Industry-specific OSHA standards may apply",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply.",
      lastUpdated: "2026-01",
    },
  },

  NM: {
    name: "New Mexico",
    general: {
      hasSpecificLaw: false,
      summary:
        "New Mexico operates a state OSHA plan (New Mexico Environment Department — NMED). No specific workplace violence prevention law exists beyond the General Duty Clause.",
      keyRequirements: [
        "General Duty Clause applies under NMED OSHA",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "New Mexico OSHA", url: "https://www.env.nm.gov/occupational_health_safety/nm-announcements/" },
      ],
      notes: "State OSHA plan. No specific workplace violence law beyond General Duty Clause.",
      lastUpdated: "2026-01",
    },
  },

  NC: {
    name: "North Carolina",
    general: {
      hasSpecificLaw: false,
      summary:
        "North Carolina operates a state OSHA plan (NC DOL). No specific workplace violence prevention law exists beyond the General Duty Clause.",
      keyRequirements: [
        "General Duty Clause applies under NC OSHA",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "North Carolina DOL OSHA", url: "https://www.labor.nc.gov/safety-and-health" },
      ],
      notes: "State OSHA plan. No specific workplace violence law beyond General Duty Clause.",
      lastUpdated: "2026-01",
    },
  },

  ND: {
    name: "North Dakota",
    general: {
      hasSpecificLaw: false,
      summary:
        "North Dakota does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies.",
      keyRequirements: [
        "General Duty Clause applies",
        "Industry-specific OSHA standards may apply",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply.",
      lastUpdated: "2026-01",
    },
  },

  OH: {
    name: "Ohio",
    general: {
      hasSpecificLaw: false,
      summary:
        "Ohio is not a state-plan state and is covered directly by federal OSHA. Federal OSHA enforcement authority applies in full. No state-specific workplace violence prevention law exists beyond the federal General Duty Clause (Section 5(a)(1)). The Ohio Bureau of Workers' Compensation (BWC) administers workers' compensation separately but does not operate a state OSHA plan.",
      keyRequirements: [
        "Federal OSHA General Duty Clause applies directly (Ohio is not a state-plan state)",
        "OSHA 300 Log recordkeeping requirements apply for employers with 11+ employees",
        "Recommended: written workplace violence prevention program, training, and incident tracking",
      ],
      documentationRequired: [
        "OSHA 300 Log of Work-Related Injuries and Illnesses (if 11+ employees)",
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "Federal OSHA - Ohio Area Offices", url: "https://www.osha.gov/contactus/bystate/OH/areaoffice" },
        { label: "OSHA General Duty Clause", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "Ohio is covered by federal OSHA, not a state-plan state. Federal enforcement and recordkeeping requirements apply in full. Ohio BWC handles workers' compensation only.",
      lastUpdated: "2026-04",
    },
  },

  OK: {
    name: "Oklahoma",
    general: {
      hasSpecificLaw: false,
      summary:
        "Oklahoma does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies.",
      keyRequirements: [
        "General Duty Clause applies",
        "Industry-specific OSHA standards may apply",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply.",
      lastUpdated: "2026-01",
    },
  },

  PA: {
    name: "Pennsylvania",
    general: {
      hasSpecificLaw: false,
      summary:
        "Pennsylvania does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies.",
      keyRequirements: [
        "General Duty Clause applies",
        "Industry-specific OSHA standards may apply",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply.",
      lastUpdated: "2026-01",
    },
  },

  RI: {
    name: "Rhode Island",
    general: {
      hasSpecificLaw: false,
      summary:
        "Rhode Island does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies.",
      keyRequirements: [
        "General Duty Clause applies",
        "Industry-specific OSHA standards may apply",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply.",
      lastUpdated: "2026-01",
    },
  },

  SC: {
    name: "South Carolina",
    general: {
      hasSpecificLaw: false,
      summary:
        "South Carolina operates a state OSHA plan (SC OSHA). No specific workplace violence prevention law exists beyond the General Duty Clause.",
      keyRequirements: [
        "General Duty Clause applies under SC OSHA",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "South Carolina OSHA", url: "https://osha.llr.sc.gov/" },
      ],
      notes: "State OSHA plan. No specific workplace violence law beyond General Duty Clause.",
      lastUpdated: "2026-01",
    },
  },

  SD: {
    name: "South Dakota",
    general: {
      hasSpecificLaw: false,
      summary:
        "South Dakota does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies.",
      keyRequirements: [
        "General Duty Clause applies",
        "Industry-specific OSHA standards may apply",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply.",
      lastUpdated: "2026-01",
    },
  },

  TN: {
    name: "Tennessee",
    general: {
      hasSpecificLaw: false,
      summary:
        "Tennessee operates a state OSHA plan (Tennessee OSHA — TOSHA). No specific workplace violence prevention law exists beyond the General Duty Clause.",
      keyRequirements: [
        "General Duty Clause applies under TOSHA",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "Tennessee TOSHA", url: "https://www.tn.gov/workforce/employees/safety-health/tosha.html" },
      ],
      notes: "State OSHA plan. No specific workplace violence law beyond General Duty Clause.",
      lastUpdated: "2026-01",
    },
  },

  TX: {
    name: "Texas",
    general: {
      hasSpecificLaw: false,
      summary:
        "Texas does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies to all employers.",
      keyRequirements: [
        "General Duty Clause applies",
        "Industry-specific OSHA standards may apply",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply. Select an industry above to see sector-specific guidance.",
      lastUpdated: "2026-01",
    },
  },

  UT: {
    name: "Utah",
    general: {
      hasSpecificLaw: false,
      summary:
        "Utah operates a state OSHA plan (Utah OSHA). No specific workplace violence prevention law exists beyond the General Duty Clause.",
      keyRequirements: [
        "General Duty Clause applies under Utah OSHA",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "Utah OSHA", url: "https://laborcommission.utah.gov/divisions/uosh/" },
      ],
      notes: "State OSHA plan. No specific workplace violence law beyond General Duty Clause.",
      lastUpdated: "2026-01",
    },
  },

  VA: {
    name: "Virginia",
    general: {
      hasSpecificLaw: false,
      summary:
        "Virginia operates a state OSHA plan (Virginia OSHA — VOSH). No specific workplace violence prevention law exists beyond the General Duty Clause.",
      keyRequirements: [
        "General Duty Clause applies under VOSH",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "Virginia VOSH", url: "https://www.doli.virginia.gov/occupational-safety-health/" },
      ],
      notes: "State OSHA plan. No specific workplace violence law beyond General Duty Clause.",
      lastUpdated: "2026-01",
    },
  },

  WV: {
    name: "West Virginia",
    general: {
      hasSpecificLaw: false,
      summary:
        "West Virginia does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies.",
      keyRequirements: [
        "General Duty Clause applies",
        "Industry-specific OSHA standards may apply",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply.",
      lastUpdated: "2026-01",
    },
  },

  WI: {
    name: "Wisconsin",
    general: {
      hasSpecificLaw: false,
      summary:
        "Wisconsin does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies.",
      keyRequirements: [
        "General Duty Clause applies",
        "Industry-specific OSHA standards may apply",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply.",
      lastUpdated: "2026-01",
    },
  },

  WY: {
    name: "Wyoming",
    general: {
      hasSpecificLaw: false,
      summary:
        "Wyoming does not have a specific state workplace violence prevention law. Federal OSHA General Duty Clause applies.",
      keyRequirements: [
        "General Duty Clause applies",
        "Industry-specific OSHA standards may apply",
        "Recommended: written prevention plan, training, incident tracking",
      ],
      documentationRequired: [
        "Recommended: written workplace violence prevention plan",
        "Recommended: training records",
        "Recommended: incident logs",
      ],
      sourceLinks: [
        { label: "OSHA General Duty Clause Guidance", url: "https://www.osha.gov/laws-regs/oshact/section5-duties" },
      ],
      notes: "No state-specific law. Federal OSHA standards apply.",
      lastUpdated: "2026-01",
    },
  },
};

// ── Helper: sorted list of all states for the selector ───────────────────────
export const STATE_LIST = Object.entries(stateContent)
  .map(([code, entry]) => ({ code, name: entry.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

// ── Disclaimer text for the state layer ──────────────────────────────────────
export const STATE_DISCLAIMER =
  "State requirements vary and change over time. This information is for general guidance only and should not be considered legal advice. Always verify current requirements with your state's labor or OSHA agency and qualified legal counsel.";
