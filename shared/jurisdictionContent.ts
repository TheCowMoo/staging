/**
 * jurisdictionContent.ts — Canada Regulatory Reference Layer
 *
 * Single source of truth for all Canadian workplace violence prevention
 * regulatory content displayed on the Standards & Regulations page.
 * Mirrors the structure of oshaContent.ts for US content.
 *
 * Covers: Federal (CCOHS / Canada Labour Code), Ontario (OHSA / WSIB),
 * British Columbia (WorkSafeBC), Alberta (OHS Act), Quebec (CNESST).
 */

// ── At-a-Glance Checklist ─────────────────────────────────────────────────────
export const CANADA_AT_A_GLANCE = {
  heading: "At-a-Glance",
  subheading: "Core requirements for a defensible workplace violence prevention program under Canadian law",
  urgencyLine: "Federal and provincial obligations overlap — employers must satisfy both levels simultaneously.",
  items: [
    "Written workplace violence prevention policy (required federally and in most provinces)",
    "Documented workplace violence risk assessment",
    "Workplace harassment and violence prevention program",
    "Incident reporting and investigation process",
    "Employee training on recognizing and responding to violence",
    "Joint Health and Safety Committee (JHSC) involvement",
    "Annual program review and update",
    "WSIB/WCB reporting for injury-causing incidents (province-specific)",
  ],
};

// ── Page Header ───────────────────────────────────────────────────────────────
export const CANADA_PAGE_HEADER = {
  title: "Canadian Workplace Violence Prevention",
  subtitle: "Educational Reference — Federal & Provincial Baseline",
  description:
    "A decision-support reference for workplace violence prevention programs operating under Canadian law. Use this page to understand federal obligations under the Canada Labour Code and key provincial requirements across Ontario, BC, Alberta, and Quebec.",
};

// ── Disclaimer ────────────────────────────────────────────────────────────────
export const CANADA_DISCLAIMER = {
  heading: "Educational Reference Only",
  body: "This page provides general guidance based on Canadian federal and provincial legislation. It is not legal advice. Consult qualified legal counsel for compliance decisions specific to your organization and jurisdiction.",
};

// ── Federal Baseline Overview ─────────────────────────────────────────────────
export const CANADA_FEDERAL_OVERVIEW = {
  heading: "Federal Baseline — Canada Labour Code",
  intro:
    "Federally regulated workplaces (banking, telecommunications, interprovincial transportation, federal government) are governed by Part II of the Canada Labour Code and the Work Place Harassment and Violence Prevention Regulations (SOR/2020-130), which came into force in January 2021.",
  keyPoints: [
    {
      label: "Canada Labour Code — Part II",
      text: "Requires employers to take all reasonable precautions to ensure the health and safety of employees. Workplace violence is explicitly recognized as a workplace hazard under the Code.",
    },
    {
      label: "Work Place Harassment and Violence Prevention Regulations (2021)",
      text: "Mandates a joint workplace assessment, a written harassment and violence prevention program, defined response procedures, and resolution processes for all notices of occurrence.",
    },
    {
      label: "CCOHS (Canadian Centre for Occupational Health and Safety)",
      text: "CCOHS is the national resource for OHS guidance. While not a regulator, CCOHS publishes authoritative guidelines on workplace violence prevention that inform best practices across all sectors.",
    },
    {
      label: "Provincial Jurisdiction",
      text: "Approximately 90% of Canadian workers fall under provincial/territorial OHS jurisdiction. Each province has its own Occupational Health and Safety Act with specific workplace violence provisions.",
    },
    {
      label: "WSIB / WCB",
      text: "Workers' Compensation Boards (WSIB in Ontario, WCB in BC/Alberta) require reporting of workplace injuries and illnesses, including those resulting from violence. Failure to report can result in penalties.",
    },
  ],
};

// ── Core Program Elements ─────────────────────────────────────────────────────
export const CANADA_CORE_ELEMENTS = {
  heading: "Core Program Elements",
  intro: "Canadian federal and provincial frameworks consistently require these elements as the foundation of an effective workplace violence prevention program.",
  elements: [
    {
      number: 1,
      title: "Written Policy Statement",
      description: "A formal policy signed by senior leadership committing to a violence-free workplace. Must be posted prominently and communicated to all employees.",
      artifacts: ["Signed workplace violence prevention policy", "Posting confirmation records", "Employee acknowledgment records"],
    },
    {
      number: 2,
      title: "Workplace Risk Assessment",
      description: "A documented assessment of the risk of violence specific to the workplace, including physical environment, work practices, and worker interactions with the public.",
      artifacts: ["Risk assessment report", "JHSC review records", "Environmental walkthrough documentation"],
    },
    {
      number: 3,
      title: "Prevention Program",
      description: "A written program that includes measures and procedures to control identified risks, a system for reporting incidents, and a process for investigating and responding to incidents.",
      artifacts: ["Prevention program document", "Incident reporting procedures", "Investigation protocol"],
    },
    {
      number: 4,
      title: "Employee Training",
      description: "Training for all workers on recognizing workplace violence, the employer's prevention program, and how to report incidents. Training must be provided before a worker is exposed to risk.",
      artifacts: ["Training curriculum", "Attendance records", "Training completion certificates"],
    },
    {
      number: 5,
      title: "Incident Reporting & Investigation",
      description: "A clear process for workers to report incidents of violence without fear of reprisal. All reported incidents must be investigated and documented.",
      artifacts: ["Incident report forms", "Investigation records", "Corrective action documentation"],
    },
    {
      number: 6,
      title: "JHSC / Health and Safety Representative Involvement",
      description: "Joint Health and Safety Committees (workplaces with 20+ employees) or Health and Safety Representatives (smaller workplaces) must be involved in the development and review of the prevention program.",
      artifacts: ["JHSC meeting minutes", "Program review sign-off", "Recommendation tracking log"],
    },
  ],
};

// ── Provincial Reference Content ──────────────────────────────────────────────
export interface ProvincialGuidance {
  code: string;
  name: string;
  regulator: string;
  regulatorUrl: string;
  legislation: string;
  legislationUrl: string;
  hasSpecificLaw: boolean;
  summary: string;
  keyRequirements: string[];
  documentationRequired: string[];
  effectiveDate?: string;
  lastUpdated: string;
  notes?: string;
  sourceLinks: { label: string; url: string }[];
}

export const PROVINCIAL_CONTENT: Record<string, ProvincialGuidance> = {
  ON: {
    code: "ON",
    name: "Ontario",
    regulator: "Ministry of Labour, Immigration, Training and Skills Development",
    regulatorUrl: "https://www.ontario.ca/page/ministry-labour-immigration-training-skills-development",
    legislation: "Occupational Health and Safety Act (OHSA) — Bill 168 Amendments",
    legislationUrl: "https://www.ontario.ca/laws/statute/90o01",
    hasSpecificLaw: true,
    summary:
      "Ontario's OHSA was amended in 2010 (Bill 168) to include specific workplace violence and harassment provisions. Employers must develop and maintain a workplace violence program, conduct risk assessments, and have policies reviewed annually. WSIB administers workers' compensation for injury-causing incidents.",
    keyRequirements: [
      "Written workplace violence policy reviewed at least annually",
      "Written workplace harassment policy reviewed at least annually",
      "Workplace violence risk assessment conducted and documented",
      "Workplace violence program that includes measures and procedures",
      "Procedures for summoning immediate assistance",
      "Procedures for workers to report incidents and complaints",
      "Domestic violence provisions: employer must take reasonable precautions if aware of risk",
      "JHSC or health and safety representative involvement in program development",
    ],
    documentationRequired: [
      "Workplace violence policy (posted in the workplace)",
      "Workplace harassment policy (posted in the workplace)",
      "Risk assessment documentation",
      "Workplace violence program",
      "Incident reports and investigation records",
      "Training records for all workers",
      "JHSC review records",
    ],
    effectiveDate: "June 15, 2010",
    lastUpdated: "2024",
    notes:
      "WSIB (Workplace Safety and Insurance Board) covers workers injured as a result of workplace violence. Employers must report injuries to WSIB within 3 days if a worker is unable to earn full wages. Ontario's domestic violence provisions are among the most explicit in Canada.",
    sourceLinks: [
      { label: "OHSA — Bill 168 Amendments", url: "https://www.ontario.ca/laws/statute/90o01" },
      { label: "WSIB — Workplace Violence", url: "https://www.wsib.ca/en/businesses/workplace-health-safety/workplace-violence" },
      { label: "Ontario Workplace Violence Guide", url: "https://www.ontario.ca/page/workplace-violence" },
    ],
  },
  BC: {
    code: "BC",
    name: "British Columbia",
    regulator: "WorkSafeBC",
    regulatorUrl: "https://www.worksafebc.com",
    legislation: "Workers Compensation Act — OHS Regulation Part 4.27–4.31",
    legislationUrl: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-04-general-conditions#SectionNumber:4.27",
    hasSpecificLaw: true,
    summary:
      "British Columbia's OHS Regulation requires employers to conduct a risk assessment for workplace violence and implement a violence prevention program where risk is identified. WorkSafeBC provides extensive guidance and enforcement.",
    keyRequirements: [
      "Risk assessment to determine if workers are at risk of violence",
      "Violence prevention program if risk is identified",
      "Procedures for reporting and investigating incidents",
      "Training for workers on recognizing and responding to violence",
      "Procedures for obtaining immediate assistance",
      "Post-incident support for affected workers",
    ],
    documentationRequired: [
      "Risk assessment documentation",
      "Violence prevention program (if risk identified)",
      "Incident reports",
      "Training records",
      "Investigation records",
    ],
    effectiveDate: "2008",
    lastUpdated: "2024",
    notes:
      "WorkSafeBC is both the regulator and workers' compensation insurer in BC. High-risk industries (healthcare, social services, retail) are subject to additional scrutiny. WorkSafeBC has published sector-specific violence prevention guidelines.",
    sourceLinks: [
      { label: "WorkSafeBC — Violence Prevention", url: "https://www.worksafebc.com/en/health-safety/hazards-exposures/violence" },
      { label: "OHS Regulation Part 4.27", url: "https://www.worksafebc.com/en/law-policy/occupational-health-safety/searchable-ohs-regulation/ohs-regulation/part-04-general-conditions#SectionNumber:4.27" },
    ],
  },
  AB: {
    code: "AB",
    name: "Alberta",
    regulator: "Alberta OHS (Occupational Health and Safety)",
    regulatorUrl: "https://ohs.alberta.ca",
    legislation: "Occupational Health and Safety Act — Bill 30 (2018) Amendments",
    legislationUrl: "https://www.qp.alberta.ca/documents/Acts/O02P1.pdf",
    hasSpecificLaw: true,
    summary:
      "Alberta's OHS Act was significantly amended in 2018 (Bill 30) to include explicit workplace harassment and violence provisions. Employers must have a harassment and violence prevention plan, conduct investigations, and ensure workers are trained.",
    keyRequirements: [
      "Written harassment and violence prevention plan",
      "Hazard assessment for violence risks",
      "Procedures for reporting and investigating incidents",
      "Training for all workers on the prevention plan",
      "Designated recipient for harassment and violence complaints",
      "Confidentiality protections for complainants",
    ],
    documentationRequired: [
      "Harassment and violence prevention plan",
      "Hazard assessment records",
      "Incident and complaint records",
      "Investigation records",
      "Training records",
    ],
    effectiveDate: "June 1, 2018",
    lastUpdated: "2024",
    notes:
      "Alberta's 2018 amendments brought the province into alignment with other Canadian jurisdictions. The legislation applies to all workplaces with workers, including remote work situations.",
    sourceLinks: [
      { label: "Alberta OHS — Workplace Violence", url: "https://www.alberta.ca/workplace-harassment-violence" },
      { label: "OHS Act (Alberta)", url: "https://www.qp.alberta.ca/documents/Acts/O02P1.pdf" },
    ],
  },
  QC: {
    code: "QC",
    name: "Quebec",
    regulator: "CNESST (Commission des normes, de l'équité, de la santé et de la sécurité du travail)",
    regulatorUrl: "https://www.cnesst.gouv.qc.ca",
    legislation: "Act Respecting Occupational Health and Safety (LSST) — Bill 27 (2021)",
    legislationUrl: "https://www.legisquebec.gouv.qc.ca/en/document/cs/S-2.1",
    hasSpecificLaw: true,
    summary:
      "Quebec's LSST was modernized in 2021 (Bill 27) with significant updates to workplace psychological harassment and violence provisions. CNESST is the integrated regulator for labour standards, pay equity, and occupational health and safety.",
    keyRequirements: [
      "Prevention program (mandatory for high-risk sectors under Bill 27)",
      "Risk identification and analysis",
      "Psychological harassment prevention policy",
      "Procedures for reporting harassment and violence",
      "Designated person to receive complaints",
      "Investigation and corrective measures",
      "Joint health and safety committee involvement",
    ],
    documentationRequired: [
      "Prevention program (where required)",
      "Psychological harassment prevention policy",
      "Risk assessment records",
      "Complaint and investigation records",
      "Training records",
      "JHSC records",
    ],
    effectiveDate: "April 6, 2021",
    lastUpdated: "2024",
    notes:
      "Quebec's Bill 27 (2021) significantly expanded OHS obligations. Prevention programs are now mandatory for high-risk sectors. CNESST provides French-language resources and enforcement.",
    sourceLinks: [
      { label: "CNESST — Violence au travail", url: "https://www.cnesst.gouv.qc.ca/fr/prevention-securite/identifier-corriger-risques/liste-informations-prevention/violence-travail" },
      { label: "LSST (Quebec)", url: "https://www.legisquebec.gouv.qc.ca/en/document/cs/S-2.1" },
    ],
  },
  MB: {
    code: "MB",
    name: "Manitoba",
    regulator: "Manitoba Workplace Safety and Health",
    regulatorUrl: "https://www.gov.mb.ca/labour/safety/",
    legislation: "Workplace Safety and Health Act — Workplace Violence Regulation (2010)",
    legislationUrl: "https://web2.gov.mb.ca/laws/statutes/ccsm/w210e.php",
    hasSpecificLaw: true,
    summary:
      "Manitoba introduced specific workplace violence regulations in 2010. Employers must assess risk, develop a written violence prevention policy and program, and provide training.",
    keyRequirements: [
      "Written workplace violence prevention policy",
      "Risk assessment for workplace violence",
      "Violence prevention program",
      "Training for workers and supervisors",
      "Incident reporting and investigation procedures",
    ],
    documentationRequired: [
      "Violence prevention policy",
      "Risk assessment records",
      "Prevention program",
      "Training records",
      "Incident reports",
    ],
    lastUpdated: "2024",
    sourceLinks: [
      { label: "Manitoba — Workplace Violence", url: "https://www.gov.mb.ca/labour/safety/violence.html" },
    ],
  },
  SK: {
    code: "SK",
    name: "Saskatchewan",
    regulator: "Saskatchewan OHS (Occupational Health and Safety)",
    regulatorUrl: "https://www.saskatchewan.ca/business/safety-in-the-workplace",
    legislation: "Occupational Health and Safety Regulations, 1996 — Part III",
    legislationUrl: "https://publications.saskatchewan.ca/api/v1/products/1975/formats/2471/download",
    hasSpecificLaw: true,
    summary:
      "Saskatchewan's OHS Regulations require employers to assess the risk of violence and implement control measures. The province has specific provisions for high-risk workplaces.",
    keyRequirements: [
      "Violence risk assessment",
      "Written violence prevention policy",
      "Control measures based on assessment",
      "Training for workers",
      "Incident reporting procedures",
    ],
    documentationRequired: [
      "Risk assessment documentation",
      "Violence prevention policy",
      "Training records",
      "Incident reports",
    ],
    lastUpdated: "2024",
    sourceLinks: [
      { label: "Saskatchewan OHS — Violence", url: "https://www.saskatchewan.ca/business/safety-in-the-workplace/hazards-and-prevention/violence-in-the-workplace" },
    ],
  },
  NS: {
    code: "NS",
    name: "Nova Scotia",
    regulator: "Nova Scotia Department of Labour, Skills and Immigration",
    regulatorUrl: "https://novascotia.ca/lae/healthandsafety/",
    legislation: "Occupational Health and Safety Act — Violence in the Workplace Regulations",
    legislationUrl: "https://novascotia.ca/just/regulations/regs/ohsviolence.htm",
    hasSpecificLaw: true,
    summary:
      "Nova Scotia has specific Violence in the Workplace Regulations under the OHS Act. Employers must conduct risk assessments and implement prevention programs.",
    keyRequirements: [
      "Violence risk assessment",
      "Written violence prevention policy",
      "Violence prevention program",
      "Training for workers",
      "Incident reporting and investigation",
    ],
    documentationRequired: [
      "Risk assessment",
      "Violence prevention policy",
      "Prevention program",
      "Training records",
      "Incident reports",
    ],
    lastUpdated: "2024",
    sourceLinks: [
      { label: "Nova Scotia — Workplace Violence", url: "https://novascotia.ca/lae/healthandsafety/violence.asp" },
    ],
  },
  NB: {
    code: "NB",
    name: "New Brunswick",
    regulator: "WorkSafeNB",
    regulatorUrl: "https://www.worksafenb.ca",
    legislation: "Occupational Health and Safety Act — General Regulation",
    legislationUrl: "https://www.worksafenb.ca/safety-solutions/workplace-violence/",
    hasSpecificLaw: false,
    summary:
      "New Brunswick addresses workplace violence primarily through the General Duty clause of the OHS Act. WorkSafeNB provides guidance and enforcement. Employers are expected to assess and control violence risks.",
    keyRequirements: [
      "General duty to protect worker health and safety",
      "Violence risk assessment (best practice)",
      "Incident reporting under OHS Act",
      "Training for workers in high-risk environments",
    ],
    documentationRequired: [
      "Risk assessment (recommended)",
      "Incident reports",
      "Training records",
    ],
    lastUpdated: "2024",
    notes: "New Brunswick does not have a standalone workplace violence regulation. Employers should consult WorkSafeNB for sector-specific guidance.",
    sourceLinks: [
      { label: "WorkSafeNB — Workplace Violence", url: "https://www.worksafenb.ca/safety-solutions/workplace-violence/" },
    ],
  },
  NL: {
    code: "NL",
    name: "Newfoundland and Labrador",
    regulator: "WorkplaceNL",
    regulatorUrl: "https://workplacenl.ca",
    legislation: "Occupational Health and Safety Act",
    legislationUrl: "https://www.assembly.nl.ca/legislation/sr/statutes/o03.htm",
    hasSpecificLaw: false,
    summary:
      "Newfoundland and Labrador addresses workplace violence through the general provisions of the OHS Act. WorkplaceNL provides guidance for employers on violence prevention.",
    keyRequirements: [
      "General duty to protect worker health and safety",
      "Violence risk assessment (best practice)",
      "Incident reporting",
      "Training for workers",
    ],
    documentationRequired: [
      "Risk assessment (recommended)",
      "Incident reports",
      "Training records",
    ],
    lastUpdated: "2024",
    sourceLinks: [
      { label: "WorkplaceNL", url: "https://workplacenl.ca" },
    ],
  },
  PE: {
    code: "PE",
    name: "Prince Edward Island",
    regulator: "PEI Workers Compensation Board",
    regulatorUrl: "https://www.wcb.pe.ca",
    legislation: "Occupational Health and Safety Act",
    legislationUrl: "https://www.princeedwardisland.ca/en/legislation/occupational-health-and-safety-act",
    hasSpecificLaw: false,
    summary:
      "Prince Edward Island addresses workplace violence through the general provisions of the OHS Act. The WCB provides guidance for employers.",
    keyRequirements: [
      "General duty to protect worker health and safety",
      "Violence risk assessment (best practice)",
      "Incident reporting",
      "Training for workers",
    ],
    documentationRequired: [
      "Risk assessment (recommended)",
      "Incident reports",
      "Training records",
    ],
    lastUpdated: "2024",
    sourceLinks: [
      { label: "PEI WCB", url: "https://www.wcb.pe.ca" },
    ],
  },
  NT: {
    code: "NT",
    name: "Northwest Territories",
    regulator: "Workers' Safety and Compensation Commission (WSCC)",
    regulatorUrl: "https://www.wscc.nt.ca",
    legislation: "Safety Act",
    legislationUrl: "https://www.wscc.nt.ca/health-safety/safety-act",
    hasSpecificLaw: false,
    summary:
      "The Northwest Territories addresses workplace violence through the general duty provisions of the Safety Act. WSCC provides guidance and enforcement.",
    keyRequirements: [
      "General duty to protect worker health and safety",
      "Violence risk assessment (best practice)",
      "Incident reporting",
    ],
    documentationRequired: [
      "Risk assessment (recommended)",
      "Incident reports",
    ],
    lastUpdated: "2024",
    sourceLinks: [
      { label: "WSCC", url: "https://www.wscc.nt.ca" },
    ],
  },
  NU: {
    code: "NU",
    name: "Nunavut",
    regulator: "Workers' Safety and Compensation Commission (WSCC)",
    regulatorUrl: "https://www.wscc.nt.ca",
    legislation: "Safety Act (Nunavut)",
    legislationUrl: "https://www.wscc.nt.ca/health-safety/safety-act",
    hasSpecificLaw: false,
    summary:
      "Nunavut shares the WSCC with the Northwest Territories. Workplace violence is addressed through the general duty provisions of the Safety Act.",
    keyRequirements: [
      "General duty to protect worker health and safety",
      "Violence risk assessment (best practice)",
      "Incident reporting",
    ],
    documentationRequired: [
      "Risk assessment (recommended)",
      "Incident reports",
    ],
    lastUpdated: "2024",
    sourceLinks: [
      { label: "WSCC", url: "https://www.wscc.nt.ca" },
    ],
  },
  YT: {
    code: "YT",
    name: "Yukon",
    regulator: "Yukon Workers' Compensation Health and Safety Board (YWCHSB)",
    regulatorUrl: "https://www.wcb.yk.ca",
    legislation: "Occupational Health and Safety Act (Yukon)",
    legislationUrl: "https://laws.yukon.ca/cms/images/LEGISLATION/PRINCIPAL/2009/2009-0007/2009-0007.pdf",
    hasSpecificLaw: false,
    summary:
      "Yukon addresses workplace violence through the general provisions of the OHS Act. The YWCHSB provides guidance and enforcement.",
    keyRequirements: [
      "General duty to protect worker health and safety",
      "Violence risk assessment (best practice)",
      "Incident reporting",
    ],
    documentationRequired: [
      "Risk assessment (recommended)",
      "Incident reports",
    ],
    lastUpdated: "2024",
    sourceLinks: [
      { label: "Yukon WCHSB", url: "https://www.wcb.yk.ca" },
    ],
  },
};

// ── Province list for selector ────────────────────────────────────────────────
export const PROVINCE_LIST = Object.keys(PROVINCIAL_CONTENT).sort();

// ── CCOHS Resources ───────────────────────────────────────────────────────────
export const CANADA_RESOURCES = {
  heading: "Key Resources",
  items: [
    {
      title: "CCOHS — Workplace Violence",
      description: "Comprehensive guidance from the Canadian Centre for Occupational Health and Safety on prevention programs, risk assessment, and worker rights.",
      url: "https://www.ccohs.ca/oshanswers/psychosocial/violence.html",
      type: "Federal",
    },
    {
      title: "Canada Labour Code — Part II",
      description: "Full text of the federal occupational health and safety legislation governing federally regulated workplaces.",
      url: "https://laws-lois.justice.gc.ca/eng/acts/L-2/",
      type: "Federal",
    },
    {
      title: "Work Place Harassment and Violence Prevention Regulations",
      description: "The 2021 federal regulations (SOR/2020-130) establishing detailed requirements for federally regulated employers.",
      url: "https://laws-lois.justice.gc.ca/eng/regulations/SOR-2020-130/",
      type: "Federal",
    },
    {
      title: "Ontario OHSA — Workplace Violence",
      description: "Ontario Ministry of Labour guidance on Bill 168 requirements for workplace violence and harassment programs.",
      url: "https://www.ontario.ca/page/workplace-violence",
      type: "Provincial",
    },
    {
      title: "WorkSafeBC — Violence Prevention",
      description: "BC-specific guidance on violence prevention programs, risk assessment tools, and sector-specific resources.",
      url: "https://www.worksafebc.com/en/health-safety/hazards-exposures/violence",
      type: "Provincial",
    },
    {
      title: "CNESST — Violence au travail",
      description: "Quebec regulator guidance on workplace violence prevention under the modernized LSST (Bill 27, 2021).",
      url: "https://www.cnesst.gouv.qc.ca/fr/prevention-securite/identifier-corriger-risques/liste-informations-prevention/violence-travail",
      type: "Provincial",
    },
    {
      title: "Alberta OHS — Workplace Violence and Harassment",
      description: "Alberta OHS guidance on the 2018 Bill 30 requirements for harassment and violence prevention plans.",
      url: "https://www.alberta.ca/workplace-harassment-violence",
      type: "Provincial",
    },
  ],
};

// ── Assessment Connection ─────────────────────────────────────────────────────
export const CANADA_ASSESSMENT_CONNECTION = {
  heading: "How This Assessment Connects to Canadian Requirements",
  items: [
    {
      title: "Risk Assessment Documentation",
      description: "This audit generates a documented risk assessment that satisfies the written assessment requirements under Ontario OHSA, BC OHS Regulation, Alberta OHS Act, and the federal Work Place Harassment and Violence Prevention Regulations.",
    },
    {
      title: "Program Gap Identification",
      description: "Corrective action recommendations identify gaps in your prevention program, helping you build or strengthen the written program required under provincial legislation.",
    },
    {
      title: "EAP as Prevention Program Component",
      description: "The Emergency Action Plan generated by this platform addresses the response procedures, communication protocols, and worker protection measures required as part of a Canadian workplace violence prevention program.",
    },
  ],
};
