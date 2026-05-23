/**
 * industryOverlayContent.ts
 *
 * Industry-specific overlay layer for the Standards & Regulations module.
 * This data is province-agnostic and applies uniformly across all Canadian
 * provinces and territories. It is designed to sit on top of the existing
 * provincial legal content (PROVINCIAL_CONTENT) and is structured for
 * future integration with the Threat Assessment tool, EAP builder, and
 * Training & Drills module.
 *
 * Schema per industry:
 *   industry            — display label
 *   industryKey         — stable machine-readable key
 *   icon                — lucide-react icon name suggestion
 *   risk_profile        — primary violence types, common sources, risk level, environmental factors
 *   common_scenarios    — narrative scenario descriptions
 *   high_risk_roles     — job titles / roles with elevated exposure
 *   controls_and_procedures
 *     prevention        — proactive measures
 *     response          — active-incident procedures
 *     post_incident     — recovery and follow-up actions
 *   training_priorities — ordered list of training topics
 *   policy_emphasis     — key policy documents / commitments required
 *   assessment_focus    — areas auditors / assessors should prioritize
 *
 * Integration hooks (for downstream modules):
 *   Each item in controls_and_procedures, training_priorities, and
 *   assessment_focus carries an optional `integrationTag` that maps to
 *   an EAP section ID, an audit category key, or a training module slug.
 */

export type RiskLevel = "Low" | "Moderate" | "Elevated" | "High" | "Critical";

export interface ViolenceTypeEntry {
  type: string;        // e.g. "Type II — Client/Customer"
  description: string;
}

export interface ControlItem {
  action: string;
  detail: string;
  integrationTag?: string; // EAP section ID, audit category key, or training slug
}

export interface IndustryOverlay {
  industry: string;
  industryKey: string;
  icon: string; // lucide-react icon name
  tagline: string;
  risk_profile: {
    primary_violence_types: ViolenceTypeEntry[];
    common_sources: string[];
    risk_level: RiskLevel;
    environmental_factors: string[];
  };
  common_scenarios: string[];
  high_risk_roles: string[];
  controls_and_procedures: {
    prevention: ControlItem[];
    response: ControlItem[];
    post_incident: ControlItem[];
  };
  training_priorities: Array<{ topic: string; rationale: string; integrationTag?: string }>;
  policy_emphasis: Array<{ policy: string; description: string }>;
  assessment_focus: Array<{ area: string; questions: string[]; integrationTag?: string }>;
}

// ─── Healthcare ───────────────────────────────────────────────────────────────
const HEALTHCARE: IndustryOverlay = {
  industry: "Healthcare",
  industryKey: "healthcare",
  icon: "Stethoscope",
  tagline: "Patient and visitor-driven violence in high-acuity environments",
  risk_profile: {
    primary_violence_types: [
      {
        type: "Type II — Client/Patient",
        description: "Violence perpetrated by patients, residents, or their family members toward staff during care delivery.",
      },
      {
        type: "Type III — Worker-on-Worker",
        description: "Horizontal violence, bullying, and harassment between colleagues in high-stress clinical environments.",
      },
    ],
    common_sources: [
      "Patients experiencing acute psychiatric episodes or dementia",
      "Intoxicated or substance-affected individuals in emergency departments",
      "Frustrated family members or visitors",
      "Individuals in pain or experiencing medical distress",
      "Patients refusing treatment or attempting to elope",
    ],
    risk_level: "High",
    environmental_factors: [
      "Emergency departments with 24/7 open access",
      "Mental health and psychiatric units",
      "Long-term care and memory care facilities",
      "Isolated patient rooms with limited sightlines",
      "Night shifts with reduced staffing ratios",
      "High patient-to-staff ratios during peak periods",
    ],
  },
  common_scenarios: [
    "A patient in the emergency department becomes combative after a prolonged wait, striking a triage nurse.",
    "A resident with dementia in a long-term care facility physically assaults a personal support worker during bathing.",
    "A family member becomes verbally threatening and physically aggressive toward a physician after receiving a difficult diagnosis.",
    "A psychiatric patient attempts to elope and becomes violent when staff intervene.",
    "A visitor under the influence of alcohol threatens reception staff and refuses to leave.",
  ],
  high_risk_roles: [
    "Emergency Department Nurses and Physicians",
    "Psychiatric and Mental Health Nurses",
    "Personal Support Workers (PSW)",
    "Paramedics and Emergency Medical Technicians",
    "Security Officers",
    "Triage Staff",
    "Lone Community Health Workers",
    "Social Workers conducting home visits",
  ],
  controls_and_procedures: {
    prevention: [
      {
        action: "Implement Code White (Violent Patient) protocol",
        detail: "Establish a facility-wide Code White activation system with defined roles for security, clinical staff, and management. Conduct quarterly drills.",
        integrationTag: "eap-emergency-response",
      },
      {
        action: "Environmental design — reduce entrapment risk",
        detail: "Ensure all patient care areas have two exits, panic buttons, and clear sightlines. Remove objects that can be used as weapons from high-risk areas.",
        integrationTag: "audit-physical-security",
      },
      {
        action: "Behavioural flagging system",
        detail: "Implement a patient flagging system in the EMR to alert staff to prior violent incidents. Ensure flags are reviewed at handoff.",
        integrationTag: "audit-information-sharing",
      },
      {
        action: "De-escalation training for all patient-facing staff",
        detail: "Mandatory de-escalation training (minimum 4 hours) prior to patient contact, with annual refresher. Include verbal and non-verbal techniques.",
        integrationTag: "training-de-escalation",
      },
      {
        action: "Visitor management and access control",
        detail: "Restrict after-hours access to controlled entry points. Implement visitor sign-in with photo ID for high-risk units.",
        integrationTag: "audit-access-control",
      },
    ],
    response: [
      {
        action: "Activate Code White and summon security",
        detail: "Staff must be able to activate Code White without leaving the patient. Use duress alarms, overhead paging, or mobile panic devices.",
        integrationTag: "eap-emergency-response",
      },
      {
        action: "Apply safe restraint procedures",
        detail: "Only trained staff may apply physical restraints. Follow provincial restraint guidelines (e.g., Ontario PIECES framework, BC MHSU protocols). Document every application.",
        integrationTag: "eap-restraint-procedures",
      },
      {
        action: "Isolate and contain the situation",
        detail: "Remove non-essential personnel and other patients from the area. Designate a staff member to manage bystanders.",
        integrationTag: "eap-emergency-response",
      },
      {
        action: "Contact police if criminal threat is present",
        detail: "If the individual is armed, making criminal threats, or the situation cannot be controlled internally, call 911 immediately.",
        integrationTag: "eap-emergency-contacts",
      },
    ],
    post_incident: [
      {
        action: "Complete a Workplace Violence Incident Report within 24 hours",
        detail: "Document the incident, contributing factors, injuries, and immediate corrective actions. Submit to the JHSC and management.",
        integrationTag: "audit-incident-reporting",
      },
      {
        action: "Provide critical incident stress debriefing (CISD)",
        detail: "Offer psychological first aid and formal CISD to all staff involved within 72 hours. Ensure access to EAP counselling.",
        integrationTag: "training-psychological-support",
      },
      {
        action: "Conduct a root cause analysis",
        detail: "Investigate contributing factors (staffing, environment, patient history) and identify corrective actions. Present findings to JHSC.",
        integrationTag: "audit-incident-investigation",
      },
      {
        action: "Update patient flag and care plan",
        detail: "Ensure the patient's EMR flag is updated and the care plan reflects the incident. Brief incoming staff at next handoff.",
        integrationTag: "audit-information-sharing",
      },
    ],
  },
  training_priorities: [
    {
      topic: "De-escalation and verbal intervention techniques",
      rationale: "The primary tool for preventing Type II violence. Must be practical and scenario-based.",
      integrationTag: "training-de-escalation",
    },
    {
      topic: "Code White activation and response roles",
      rationale: "All staff must know how to activate and respond to a Code White without hesitation.",
      integrationTag: "training-code-white",
    },
    {
      topic: "Safe physical intervention and restraint",
      rationale: "Required for staff in psychiatric, ER, and long-term care settings. Must be provincially compliant.",
      integrationTag: "training-restraint",
    },
    {
      topic: "Recognizing early warning signs of escalation",
      rationale: "Early identification allows staff to intervene before violence occurs.",
      integrationTag: "training-threat-recognition",
    },
    {
      topic: "Incident reporting and documentation",
      rationale: "Accurate reporting drives system improvement and satisfies regulatory obligations.",
      integrationTag: "training-incident-reporting",
    },
    {
      topic: "Psychological first aid and peer support",
      rationale: "Supports staff recovery and reduces long-term psychological harm after incidents.",
      integrationTag: "training-psychological-support",
    },
  ],
  policy_emphasis: [
    {
      policy: "Workplace Violence Prevention Policy",
      description: "Must explicitly address Type II violence from patients/residents. Should reference Code White, restraint procedures, and zero-tolerance for violence against staff.",
    },
    {
      policy: "Patient Behavioural Flag Policy",
      description: "Defines criteria for flagging patients with a history of violence, how flags are communicated, and how they are reviewed and removed.",
    },
    {
      policy: "Restraint and Seclusion Policy",
      description: "Must align with provincial mental health legislation and accreditation standards (e.g., Accreditation Canada). Defines authorized restraint types, documentation, and monitoring requirements.",
    },
    {
      policy: "Lone Worker Safety Policy",
      description: "Applies to community health workers, home care staff, and others working without direct supervision. Must include check-in protocols and duress procedures.",
    },
    {
      policy: "Critical Incident Stress Management Policy",
      description: "Defines the employer's obligation to provide psychological support following a critical incident, including CISD and EAP access.",
    },
  ],
  assessment_focus: [
    {
      area: "Emergency Department Security",
      questions: [
        "Is there a staffed security presence in the ED at all times?",
        "Are duress alarms installed at triage and nursing stations?",
        "Is there a documented Code White protocol with defined roles?",
        "Are all ED staff trained in de-escalation within the past 12 months?",
      ],
      integrationTag: "audit-physical-security",
    },
    {
      area: "Psychiatric and Mental Health Unit Controls",
      questions: [
        "Are ligature risks identified and mitigated in all patient areas?",
        "Is there a documented safe restraint procedure in place?",
        "Are staff trained in safe physical intervention techniques?",
        "Is there a seclusion room with appropriate monitoring?",
      ],
      integrationTag: "audit-mental-health-controls",
    },
    {
      area: "Incident Reporting Culture",
      questions: [
        "Is there a no-reprisal policy for reporting workplace violence?",
        "Are near-miss incidents tracked alongside actual incidents?",
        "Are incident reports reviewed by the JHSC within 30 days?",
        "Is there a trend analysis process for recurring incidents?",
      ],
      integrationTag: "audit-incident-reporting",
    },
    {
      area: "Lone Worker Protections",
      questions: [
        "Do all lone workers have a check-in protocol?",
        "Are lone workers equipped with a personal duress device?",
        "Is there a documented escalation process if a lone worker fails to check in?",
      ],
      integrationTag: "audit-lone-worker",
    },
  ],
};

// ─── Education ────────────────────────────────────────────────────────────────
const EDUCATION: IndustryOverlay = {
  industry: "Education",
  industryKey: "education",
  icon: "GraduationCap",
  tagline: "Student, parent, and community-driven incidents in learning environments",
  risk_profile: {
    primary_violence_types: [
      {
        type: "Type II — Student/Client",
        description: "Violence from students (including those with behavioural or mental health challenges) toward staff or peers.",
      },
      {
        type: "Type II — Parent/Guardian",
        description: "Threatening or aggressive behaviour from parents or guardians during disputes over student matters.",
      },
      {
        type: "Type I — External Intruder",
        description: "Unauthorized individuals entering school property with intent to harm.",
      },
    ],
    common_sources: [
      "Students with unmanaged behavioural, emotional, or developmental needs",
      "Escalating disciplinary situations",
      "Custody disputes involving parents on school property",
      "Gang-related activity or community conflict spilling onto school grounds",
      "External intruders or unauthorized visitors",
      "Domestic violence situations involving staff or students",
    ],
    risk_level: "Elevated",
    environmental_factors: [
      "Open campuses with multiple entry points",
      "Large student populations with diverse needs",
      "Isolated classrooms and portable structures",
      "After-hours events with reduced supervision",
      "Social media escalation of conflicts",
      "Inadequate mental health support resources",
    ],
  },
  common_scenarios: [
    "A student with a history of behavioural challenges physically assaults a teacher during a classroom confrontation.",
    "An angry parent arrives at the school office and makes threatening statements toward the principal.",
    "An unauthorized individual is observed on school grounds during recess and refuses to leave.",
    "A fight between students escalates to involve weapons, triggering a lockdown.",
    "A student makes a credible threat of violence against classmates on social media, requiring a threat assessment.",
  ],
  high_risk_roles: [
    "Classroom Teachers (especially special education)",
    "Educational Assistants and Behaviour Technicians",
    "Principals and Vice-Principals",
    "School Social Workers and Counsellors",
    "Custodial and Support Staff",
    "Bus Drivers",
    "After-Hours Program Staff",
  ],
  controls_and_procedures: {
    prevention: [
      {
        action: "Implement a school-wide threat assessment protocol",
        detail: "Adopt a structured threat assessment process (e.g., WAVR-21, Ontario OSTA, BC ERASE). Train a multidisciplinary team including administration, counsellor, and community partners.",
        integrationTag: "audit-threat-assessment",
      },
      {
        action: "Controlled single-point-of-entry access",
        detail: "All visitors must enter through a single secured entrance, sign in with photo ID, and receive a visitor badge. All other doors must remain locked during school hours.",
        integrationTag: "audit-access-control",
      },
      {
        action: "Behavioural support and early intervention",
        detail: "Implement tiered behavioural support (e.g., PBIS). Ensure students with identified needs have a Behaviour Support Plan reviewed by the JHSC annually.",
        integrationTag: "audit-student-support",
      },
      {
        action: "Lockdown and hold-and-secure drill program",
        detail: "Conduct at minimum two lockdown drills per school year. Ensure all staff understand the difference between Lockdown, Hold-and-Secure, and Shelter-in-Place.",
        integrationTag: "training-lockdown",
      },
      {
        action: "Anonymous reporting system for students",
        detail: "Provide a confidential tip line or app (e.g., See Something Say Something) for students to report concerns about peers.",
        integrationTag: "audit-reporting-culture",
      },
    ],
    response: [
      {
        action: "Initiate lockdown or hold-and-secure as appropriate",
        detail: "Lockdown: imminent threat inside the building. Hold-and-Secure: threat outside the building. All staff must know the distinction and their role.",
        integrationTag: "eap-lockdown",
      },
      {
        action: "Notify administration and call 911 if required",
        detail: "Administration must be notified immediately. Police should be called for any credible external threat, weapon, or situation beyond staff control.",
        integrationTag: "eap-emergency-contacts",
      },
      {
        action: "Manage the immediate area — remove bystanders",
        detail: "Move students away from the incident area. Assign a staff member to supervise students while the incident is managed.",
        integrationTag: "eap-emergency-response",
      },
      {
        action: "Activate parent/guardian communication protocol",
        detail: "Use the school's mass notification system to communicate with parents during and after a significant incident. Provide clear, factual information.",
        integrationTag: "eap-communications",
      },
    ],
    post_incident: [
      {
        action: "Complete a Workplace Violence Incident Report",
        detail: "Document the incident within 24 hours. Submit to the school board safety officer and JHSC.",
        integrationTag: "audit-incident-reporting",
      },
      {
        action: "Conduct a threat assessment debrief",
        detail: "Convene the threat assessment team within 48 hours to review the incident, update the student's risk level, and identify support needs.",
        integrationTag: "audit-threat-assessment",
      },
      {
        action: "Provide staff and student psychological support",
        detail: "Activate the school's crisis response team. Provide counselling access for affected staff and students. Brief all staff before the next school day.",
        integrationTag: "training-psychological-support",
      },
      {
        action: "Review and update security measures",
        detail: "Identify any security gaps revealed by the incident. Update the school safety plan and communicate changes to staff.",
        integrationTag: "audit-physical-security",
      },
    ],
  },
  training_priorities: [
    {
      topic: "Lockdown and hold-and-secure procedures",
      rationale: "All staff must be able to execute lockdown procedures without hesitation. Drills must be realistic and debrief-based.",
      integrationTag: "training-lockdown",
    },
    {
      topic: "Threat assessment process and team roles",
      rationale: "Structured threat assessment is the most effective tool for preventing targeted school violence.",
      integrationTag: "training-threat-assessment",
    },
    {
      topic: "De-escalation with students and parents",
      rationale: "Most school violence is preceded by an escalating conflict. Early de-escalation prevents physical confrontation.",
      integrationTag: "training-de-escalation",
    },
    {
      topic: "Visitor management and access control",
      rationale: "Unauthorized access is a primary risk factor. All staff must enforce visitor protocols consistently.",
      integrationTag: "training-access-control",
    },
    {
      topic: "Recognizing and responding to behavioural warning signs",
      rationale: "Teachers and EAs are the first to observe concerning changes in student behaviour.",
      integrationTag: "training-threat-recognition",
    },
    {
      topic: "Incident reporting and documentation",
      rationale: "Accurate reporting enables trend analysis and satisfies school board and provincial reporting obligations.",
      integrationTag: "training-incident-reporting",
    },
  ],
  policy_emphasis: [
    {
      policy: "Safe Schools Policy / Code of Conduct",
      description: "Must define prohibited behaviours, progressive discipline, and the school's commitment to a safe learning environment. Must be communicated to students, parents, and staff annually.",
    },
    {
      policy: "Threat Assessment Protocol",
      description: "Defines the multidisciplinary team composition, assessment tools, risk levels, and intervention options. Must align with provincial guidelines (e.g., Ontario PPM 145, BC ERASE).",
    },
    {
      policy: "Visitor Management Policy",
      description: "Defines who may access the school, sign-in requirements, and procedures for managing unauthorized visitors.",
    },
    {
      policy: "Workplace Violence Prevention Policy",
      description: "Must explicitly address violence from students and parents toward staff. Should reference reporting obligations and support resources.",
    },
    {
      policy: "Critical Incident Response Plan",
      description: "Defines the school's response to major incidents including lockdowns, medical emergencies, and deaths. Must be reviewed annually.",
    },
  ],
  assessment_focus: [
    {
      area: "Access Control and Perimeter Security",
      questions: [
        "Is there a single controlled point of entry during school hours?",
        "Are all other exterior doors locked and alarmed?",
        "Is there a functioning visitor sign-in system with ID verification?",
        "Are cameras covering all entry points and monitored?",
      ],
      integrationTag: "audit-access-control",
    },
    {
      area: "Threat Assessment Capability",
      questions: [
        "Is there a trained threat assessment team in place?",
        "Has the team conducted at least one assessment in the past year?",
        "Is there a documented protocol for receiving and acting on tips?",
        "Are threat assessment records securely maintained?",
      ],
      integrationTag: "audit-threat-assessment",
    },
    {
      area: "Emergency Drill Compliance",
      questions: [
        "Have two lockdown drills been conducted this school year?",
        "Are drill records documented with date, duration, and debrief notes?",
        "Do all staff know the difference between Lockdown and Hold-and-Secure?",
      ],
      integrationTag: "training-lockdown",
    },
    {
      area: "Student Behavioural Support",
      questions: [
        "Do students with identified behavioural needs have a current Behaviour Support Plan?",
        "Are EAs and teachers trained in the specific strategies in each student's BSP?",
        "Is there a process for reviewing BSPs after a violent incident?",
      ],
      integrationTag: "audit-student-support",
    },
  ],
};

// ─── Retail ───────────────────────────────────────────────────────────────────
const RETAIL: IndustryOverlay = {
  industry: "Retail",
  industryKey: "retail",
  icon: "ShoppingCart",
  tagline: "Robbery, theft, and customer conflict in public-facing commercial environments",
  risk_profile: {
    primary_violence_types: [
      {
        type: "Type I — Criminal Intent",
        description: "Robbery, theft, and violence by individuals with no legitimate relationship to the business.",
      },
      {
        type: "Type II — Customer/Client",
        description: "Aggressive or threatening behaviour from customers during disputes, refusals of service, or policy enforcement.",
      },
    ],
    common_sources: [
      "Shoplifters confronted by staff",
      "Customers refused service (alcohol, age-restricted items)",
      "Disputes over returns, pricing, or wait times",
      "Individuals experiencing mental health crises",
      "Robbery or smash-and-grab incidents",
      "Domestic disputes spilling into the store",
    ],
    risk_level: "Elevated",
    environmental_factors: [
      "Late-night operations with minimal staffing",
      "Lone worker situations (single staff on shift)",
      "High-cash environments (convenience stores, pharmacies)",
      "Open floor plans with limited sight barriers",
      "Locations in high-crime areas or near transit hubs",
      "Alcohol sales environments",
    ],
  },
  common_scenarios: [
    "A loss prevention officer confronts a shoplifter who becomes physically aggressive and threatens staff.",
    "A customer becomes verbally abusive and threatening when refused a return without a receipt.",
    "A lone overnight cashier is robbed at gunpoint.",
    "A customer under the influence of alcohol refuses to leave and becomes threatening when asked.",
    "A smash-and-grab robbery occurs during business hours, endangering staff and customers.",
  ],
  high_risk_roles: [
    "Cashiers and Front-End Staff",
    "Loss Prevention Officers",
    "Overnight and Closing Staff",
    "Lone Workers (convenience stores, gas stations)",
    "Pharmacy Staff",
    "Supervisors and Managers on duty",
    "Delivery and Receiving Staff",
  ],
  controls_and_procedures: {
    prevention: [
      {
        action: "Non-engagement policy for theft and robbery",
        detail: "Staff must not physically intervene in theft or robbery situations. Establish a clear policy: observe, report, do not pursue. Communicate this to all staff.",
        integrationTag: "audit-policy-compliance",
      },
      {
        action: "Lone worker check-in protocol",
        detail: "Establish a mandatory check-in schedule for lone workers (e.g., every 2 hours). Define escalation steps if check-in is missed.",
        integrationTag: "audit-lone-worker",
      },
      {
        action: "Cash handling and safe procedures",
        detail: "Limit cash in registers. Use time-lock safes. Conduct cash drops regularly. Never count cash in view of customers.",
        integrationTag: "audit-cash-handling",
      },
      {
        action: "Environmental design — maximize visibility",
        detail: "Ensure CCTV covers all areas including blind spots. Use mirrors in high-risk areas. Maintain clear sightlines from the cash desk to the entrance.",
        integrationTag: "audit-physical-security",
      },
      {
        action: "Duress alarm and panic button installation",
        detail: "Install silent duress alarms at cash desks and customer service areas. Ensure all staff know how to activate them without alerting the aggressor.",
        integrationTag: "audit-physical-security",
      },
    ],
    response: [
      {
        action: "Do not resist — comply with robbery demands",
        detail: "Staff safety is the priority. Instruct staff to comply with demands, observe the individual, and activate the duress alarm when safe to do so.",
        integrationTag: "eap-robbery-response",
      },
      {
        action: "Activate duress alarm and call 911",
        detail: "Once the individual has left, call 911 immediately. Do not clean up or move anything until police arrive.",
        integrationTag: "eap-emergency-contacts",
      },
      {
        action: "Remove other customers and staff from the area",
        detail: "If safe to do so, move other customers and staff away from the incident area. Designate a staff member to manage bystanders.",
        integrationTag: "eap-emergency-response",
      },
      {
        action: "Preserve evidence",
        detail: "Do not touch the register, counter, or any items handled by the perpetrator. Secure CCTV footage immediately.",
        integrationTag: "eap-evidence-preservation",
      },
    ],
    post_incident: [
      {
        action: "Complete a Workplace Violence Incident Report",
        detail: "Document the incident within 24 hours. Include a description of the perpetrator, the sequence of events, and any injuries.",
        integrationTag: "audit-incident-reporting",
      },
      {
        action: "Provide psychological support to affected staff",
        detail: "Offer EAP counselling and allow staff to take time away from the floor. Do not require staff to return to the same role immediately after a traumatic incident.",
        integrationTag: "training-psychological-support",
      },
      {
        action: "Review and update security measures",
        detail: "Conduct a security review within 72 hours. Identify gaps and implement corrective actions. Consider increasing staffing during high-risk hours.",
        integrationTag: "audit-physical-security",
      },
      {
        action: "Notify the JHSC and management",
        detail: "Report the incident to the Joint Health and Safety Committee and senior management. Review at the next JHSC meeting.",
        integrationTag: "audit-incident-reporting",
      },
    ],
  },
  training_priorities: [
    {
      topic: "Non-engagement and robbery response",
      rationale: "Staff must understand the non-engagement policy and know how to respond safely during a robbery.",
      integrationTag: "training-robbery-response",
    },
    {
      topic: "De-escalation with difficult customers",
      rationale: "Most customer-driven incidents can be prevented with effective verbal de-escalation.",
      integrationTag: "training-de-escalation",
    },
    {
      topic: "Lone worker safety procedures",
      rationale: "Lone workers face disproportionate risk. Check-in protocols and duress procedures must be second nature.",
      integrationTag: "training-lone-worker",
    },
    {
      topic: "Cash handling and safe procedures",
      rationale: "Improper cash handling is a primary robbery risk factor.",
      integrationTag: "training-cash-handling",
    },
    {
      topic: "Incident reporting and documentation",
      rationale: "Accurate reporting enables trend analysis and satisfies regulatory obligations.",
      integrationTag: "training-incident-reporting",
    },
  ],
  policy_emphasis: [
    {
      policy: "Non-Engagement / No-Chase Policy",
      description: "Explicitly prohibits staff from physically intervening in theft or robbery. Must be communicated to all staff and included in onboarding.",
    },
    {
      policy: "Lone Worker Safety Policy",
      description: "Defines check-in requirements, duress procedures, and escalation steps for staff working alone.",
    },
    {
      policy: "Cash Handling Policy",
      description: "Defines cash limits, safe procedures, and prohibited behaviours (e.g., counting cash in view of customers).",
    },
    {
      policy: "Workplace Violence Prevention Policy",
      description: "Must address Type I and Type II violence. Should reference the non-engagement policy and reporting obligations.",
    },
  ],
  assessment_focus: [
    {
      area: "Lone Worker Protections",
      questions: [
        "Is there a documented check-in protocol for lone workers?",
        "Are lone workers equipped with a duress alarm or panic button?",
        "Is there a defined escalation process if a check-in is missed?",
        "Are lone worker risks assessed and documented?",
      ],
      integrationTag: "audit-lone-worker",
    },
    {
      area: "Physical Security and CCTV",
      questions: [
        "Does CCTV cover all cash handling areas and entry/exit points?",
        "Are duress alarms installed at all cash desks?",
        "Is the CCTV footage retained for a minimum of 30 days?",
        "Are all exterior lights functioning and adequate?",
      ],
      integrationTag: "audit-physical-security",
    },
    {
      area: "Staff Training and Policy Awareness",
      questions: [
        "Have all staff received robbery response training in the past 12 months?",
        "Can staff articulate the non-engagement policy?",
        "Are cash handling procedures posted and followed?",
      ],
      integrationTag: "training-robbery-response",
    },
  ],
};

// ─── Manufacturing / Industrial ───────────────────────────────────────────────
const MANUFACTURING: IndustryOverlay = {
  industry: "Manufacturing / Industrial",
  industryKey: "manufacturing",
  icon: "Factory",
  tagline: "Internal conflict and termination-related risk in high-hazard environments",
  risk_profile: {
    primary_violence_types: [
      {
        type: "Type III — Worker-on-Worker",
        description: "Violence between co-workers, including conflicts arising from workplace stress, grievances, or interpersonal disputes.",
      },
      {
        type: "Type III — Former Employee",
        description: "Violence by a terminated or disgruntled former employee returning to the workplace.",
      },
    ],
    common_sources: [
      "Workplace grievances and disciplinary actions",
      "Terminations and layoffs, especially mass layoffs",
      "Interpersonal conflicts between co-workers or supervisors",
      "Substance use on or near the worksite",
      "High-stress production environments with demanding quotas",
      "Disputes over safety practices or working conditions",
    ],
    risk_level: "Elevated",
    environmental_factors: [
      "Access to heavy machinery and industrial tools",
      "Shift work with fatigue-related stress",
      "Remote or isolated worksites",
      "High-noise environments that limit communication",
      "Contractor and sub-contractor workforce integration",
      "Limited HR presence on the shop floor",
    ],
  },
  common_scenarios: [
    "A worker who has just been terminated becomes threatening toward their supervisor and refuses to leave the facility.",
    "Two co-workers involved in an ongoing interpersonal dispute escalate to a physical altercation on the shop floor.",
    "A former employee returns to the facility and attempts to access the building after their access card has been deactivated.",
    "A worker under the influence of a substance becomes aggressive toward a safety officer who confronts them.",
    "A supervisor receives a threatening message from a worker who was recently disciplined.",
  ],
  high_risk_roles: [
    "Supervisors and Foremen",
    "Human Resources Personnel",
    "Security Officers",
    "Safety Officers and OHS Coordinators",
    "Workers in disciplinary or performance management processes",
    "Lone workers on night shifts",
    "Workers in remote or isolated areas of the facility",
  ],
  controls_and_procedures: {
    prevention: [
      {
        action: "Termination risk protocol",
        detail: "Develop a documented protocol for high-risk terminations. Include HR, security, and management. Deactivate access credentials before or at the time of notification. Have security present if risk is elevated.",
        integrationTag: "audit-termination-protocol",
      },
      {
        action: "Access control and credential management",
        detail: "Implement a formal process for immediately deactivating access credentials upon termination or suspension. Audit access logs monthly.",
        integrationTag: "audit-access-control",
      },
      {
        action: "Supervisor escalation training",
        detail: "Train all supervisors to recognize early warning signs of workplace violence and to escalate concerns to HR and security before situations deteriorate.",
        integrationTag: "training-threat-recognition",
      },
      {
        action: "Anonymous reporting mechanism",
        detail: "Provide a confidential reporting channel for workers to report concerns about co-workers without fear of reprisal.",
        integrationTag: "audit-reporting-culture",
      },
      {
        action: "Substance use policy and testing",
        detail: "Implement a clear substance use policy with defined consequences. Conduct post-incident and reasonable-cause testing in accordance with provincial requirements.",
        integrationTag: "audit-policy-compliance",
      },
    ],
    response: [
      {
        action: "Activate the facility's emergency response plan",
        detail: "All supervisors must know how to activate the emergency response plan. Designate a command post and assembly areas.",
        integrationTag: "eap-emergency-response",
      },
      {
        action: "Isolate the individual and secure the area",
        detail: "Remove other workers from the area. Do not attempt to physically restrain the individual unless trained to do so. Call security and 911 if required.",
        integrationTag: "eap-emergency-response",
      },
      {
        action: "Lockdown the facility if an armed or external threat is present",
        detail: "Implement the facility lockdown procedure. Secure all entry points. Account for all workers.",
        integrationTag: "eap-lockdown",
      },
      {
        action: "Notify HR and senior management",
        detail: "HR and senior management must be notified immediately for any serious incident. Document all communications.",
        integrationTag: "eap-communications",
      },
    ],
    post_incident: [
      {
        action: "Complete a Workplace Violence Incident Report",
        detail: "Document the incident within 24 hours. Submit to the JHSC and management.",
        integrationTag: "audit-incident-reporting",
      },
      {
        action: "Conduct a threat assessment review",
        detail: "Assess whether the individual poses an ongoing risk. Determine whether a restraining order or trespass notice is required.",
        integrationTag: "audit-threat-assessment",
      },
      {
        action: "Provide psychological support to affected workers",
        detail: "Offer EAP counselling and allow affected workers to take time away from the floor.",
        integrationTag: "training-psychological-support",
      },
      {
        action: "Review access control and security measures",
        detail: "Audit access logs, review CCTV footage, and identify any security gaps. Implement corrective actions within 30 days.",
        integrationTag: "audit-physical-security",
      },
    ],
  },
  training_priorities: [
    {
      topic: "Recognizing early warning signs of workplace violence",
      rationale: "Supervisors are the first line of detection for escalating worker behaviour.",
      integrationTag: "training-threat-recognition",
    },
    {
      topic: "Termination and disciplinary process safety",
      rationale: "High-risk terminations are a leading trigger for workplace violence. Supervisors and HR must be prepared.",
      integrationTag: "training-termination-safety",
    },
    {
      topic: "Supervisor escalation and reporting",
      rationale: "Supervisors must know when and how to escalate concerns before situations become dangerous.",
      integrationTag: "training-supervisor-escalation",
    },
    {
      topic: "Emergency response and lockdown procedures",
      rationale: "All workers must know how to respond to an active threat in the facility.",
      integrationTag: "training-lockdown",
    },
    {
      topic: "Incident reporting and documentation",
      rationale: "Accurate reporting enables trend analysis and satisfies regulatory obligations.",
      integrationTag: "training-incident-reporting",
    },
  ],
  policy_emphasis: [
    {
      policy: "Workplace Violence Prevention Policy",
      description: "Must explicitly address Type III violence. Should reference the termination protocol, reporting obligations, and zero-tolerance stance.",
    },
    {
      policy: "Termination and Disciplinary Risk Protocol",
      description: "Defines the process for managing high-risk terminations, including HR, security, and management roles.",
    },
    {
      policy: "Access Control Policy",
      description: "Defines the process for issuing, managing, and immediately deactivating access credentials.",
    },
    {
      policy: "Substance Use Policy",
      description: "Defines prohibited behaviours, testing requirements, and consequences for violations.",
    },
    {
      policy: "Threat Assessment Policy",
      description: "Defines the process for assessing and managing threats from current and former workers.",
    },
  ],
  assessment_focus: [
    {
      area: "Termination and Disciplinary Risk Management",
      questions: [
        "Is there a documented protocol for high-risk terminations?",
        "Are access credentials deactivated at the time of termination?",
        "Is security present for high-risk termination meetings?",
        "Are terminated employees escorted from the premises?",
      ],
      integrationTag: "audit-termination-protocol",
    },
    {
      area: "Access Control",
      questions: [
        "Is there a formal process for issuing and deactivating access credentials?",
        "Are access logs audited regularly?",
        "Are all entry points monitored by CCTV?",
        "Is there a trespass notice process for former employees?",
      ],
      integrationTag: "audit-access-control",
    },
    {
      area: "Supervisor Readiness",
      questions: [
        "Have all supervisors received workplace violence awareness training in the past 12 months?",
        "Do supervisors know how to escalate concerns to HR and security?",
        "Is there a documented process for supervisors to report concerning behaviour?",
      ],
      integrationTag: "training-supervisor-escalation",
    },
  ],
};

// ─── Corporate / Office ───────────────────────────────────────────────────────
const CORPORATE: IndustryOverlay = {
  industry: "Corporate / Office",
  industryKey: "corporate",
  icon: "Briefcase",
  tagline: "Internal threats and domestic violence spillover in professional environments",
  risk_profile: {
    primary_violence_types: [
      {
        type: "Type III — Worker-on-Worker",
        description: "Violence from current or former employees, including threats, harassment, and physical assault.",
      },
      {
        type: "Type IV — Domestic Violence Spillover",
        description: "Domestic violence that follows a victim into the workplace, putting the victim and co-workers at risk.",
      },
    ],
    common_sources: [
      "Disgruntled employees in disciplinary or performance management processes",
      "Terminations and restructuring events",
      "Domestic violence situations involving employees",
      "Stalking or harassment of employees by former partners",
      "Interpersonal conflicts and workplace harassment",
      "Threats made via email, social media, or in person",
    ],
    risk_level: "Moderate",
    environmental_factors: [
      "Open-plan offices with limited physical barriers",
      "Shared building access with multiple tenants",
      "Remote work creating gaps in situational awareness",
      "High-stress environments (finance, law, consulting)",
      "Limited security presence in smaller offices",
      "After-hours access for senior staff",
    ],
  },
  common_scenarios: [
    "A recently terminated employee sends threatening emails to their former manager and is seen in the building lobby.",
    "An employee discloses that their domestic partner has threatened to come to the office.",
    "A worker under performance management makes a veiled threat to their HR representative.",
    "An employee reports that a co-worker has been making increasingly hostile and threatening comments.",
    "A visitor who is a former employee's domestic partner arrives at reception demanding to see the employee.",
  ],
  high_risk_roles: [
    "Human Resources Personnel",
    "Managers and Supervisors",
    "Receptionists and Front Desk Staff",
    "Employees in disciplinary or performance management processes",
    "Employees who have disclosed domestic violence situations",
    "Security Personnel",
    "Senior Executives",
  ],
  controls_and_procedures: {
    prevention: [
      {
        action: "Threat assessment and management process",
        detail: "Implement a structured threat assessment process for evaluating and managing threats from employees, former employees, and third parties. Designate a threat management team.",
        integrationTag: "audit-threat-assessment",
      },
      {
        action: "Domestic violence workplace safety protocol",
        detail: "Develop a protocol for supporting employees experiencing domestic violence. Include safety planning, temporary access changes, and communication with security.",
        integrationTag: "audit-domestic-violence-protocol",
      },
      {
        action: "HR escalation pathway for concerning behaviour",
        detail: "Train all managers to recognize and report concerning behaviour. Establish a clear escalation pathway to HR and the threat management team.",
        integrationTag: "training-supervisor-escalation",
      },
      {
        action: "Visitor management and access control",
        detail: "All visitors must sign in with photo ID. Implement a policy for managing unwanted visitors. Ensure reception staff can discreetly alert security.",
        integrationTag: "audit-access-control",
      },
      {
        action: "Reporting culture — encourage early disclosure",
        detail: "Create a culture where employees feel safe reporting concerns about co-workers or their own safety situations without fear of reprisal.",
        integrationTag: "audit-reporting-culture",
      },
    ],
    response: [
      {
        action: "Activate the threat management team",
        detail: "For any credible threat, convene the threat management team immediately. Assess the threat level and implement appropriate controls.",
        integrationTag: "eap-threat-management",
      },
      {
        action: "Notify security and, if required, police",
        detail: "For imminent threats, call 911 immediately. For non-imminent threats, notify building security and implement access restrictions.",
        integrationTag: "eap-emergency-contacts",
      },
      {
        action: "Implement access restrictions for the individual of concern",
        detail: "Deactivate access credentials, issue a trespass notice, and brief reception and security with a photo of the individual.",
        integrationTag: "eap-access-restrictions",
      },
      {
        action: "Communicate with affected employees",
        detail: "Brief affected employees on the situation and the safety measures in place. Provide guidance on what to do if they see the individual.",
        integrationTag: "eap-communications",
      },
    ],
    post_incident: [
      {
        action: "Complete a Workplace Violence Incident Report",
        detail: "Document the incident within 24 hours. Submit to the JHSC and management.",
        integrationTag: "audit-incident-reporting",
      },
      {
        action: "Conduct a threat assessment debrief",
        detail: "Review the incident with the threat management team. Assess whether the individual poses an ongoing risk and update the safety plan accordingly.",
        integrationTag: "audit-threat-assessment",
      },
      {
        action: "Provide psychological support to affected employees",
        detail: "Offer EAP counselling to affected employees. Allow time away from the office if needed.",
        integrationTag: "training-psychological-support",
      },
      {
        action: "Review and update security measures",
        detail: "Identify any security gaps and implement corrective actions. Update the workplace safety plan.",
        integrationTag: "audit-physical-security",
      },
    ],
  },
  training_priorities: [
    {
      topic: "Threat assessment and management",
      rationale: "Corporate environments face a high proportion of Type III and IV threats that require structured assessment.",
      integrationTag: "training-threat-assessment",
    },
    {
      topic: "Recognizing and reporting concerning behaviour",
      rationale: "Managers and HR must be able to identify early warning signs and escalate appropriately.",
      integrationTag: "training-threat-recognition",
    },
    {
      topic: "Domestic violence workplace safety",
      rationale: "Domestic violence spillover is a significant and often underrecognized risk in corporate environments.",
      integrationTag: "training-domestic-violence",
    },
    {
      topic: "HR escalation and reporting culture",
      rationale: "A strong reporting culture is the most effective early warning system for workplace violence.",
      integrationTag: "training-supervisor-escalation",
    },
    {
      topic: "Active threat response (Run-Hide-Defend)",
      rationale: "All employees must know how to respond to an active threat in the workplace.",
      integrationTag: "training-active-threat",
    },
  ],
  policy_emphasis: [
    {
      policy: "Workplace Violence and Harassment Prevention Policy",
      description: "Must address Type III and IV violence. Should reference the threat assessment process, reporting obligations, and support resources.",
    },
    {
      policy: "Domestic Violence Workplace Safety Policy",
      description: "Defines the employer's commitment to supporting employees experiencing domestic violence and the safety measures available.",
    },
    {
      policy: "Threat Assessment and Management Policy",
      description: "Defines the threat management team composition, assessment process, and intervention options.",
    },
    {
      policy: "Visitor Management Policy",
      description: "Defines who may access the office, sign-in requirements, and procedures for managing unwanted visitors.",
    },
  ],
  assessment_focus: [
    {
      area: "Threat Assessment Capability",
      questions: [
        "Is there a designated threat management team?",
        "Has the team received formal threat assessment training?",
        "Is there a documented process for receiving and acting on threat reports?",
        "Are threat assessment records securely maintained?",
      ],
      integrationTag: "audit-threat-assessment",
    },
    {
      area: "Domestic Violence Preparedness",
      questions: [
        "Is there a documented domestic violence workplace safety protocol?",
        "Are HR and managers trained to support employees disclosing domestic violence?",
        "Is there a process for implementing temporary safety measures for affected employees?",
      ],
      integrationTag: "audit-domestic-violence-protocol",
    },
    {
      area: "Reporting Culture",
      questions: [
        "Is there a confidential reporting mechanism for employees?",
        "Is there a documented no-reprisal policy for reporting concerns?",
        "Are employees aware of how to report concerns about co-workers?",
      ],
      integrationTag: "audit-reporting-culture",
    },
  ],
};

// ─── Public / Government ──────────────────────────────────────────────────────
const PUBLIC_GOVERNMENT: IndustryOverlay = {
  industry: "Public / Government",
  industryKey: "public_government",
  icon: "Landmark",
  tagline: "High-volume public contact with emotionally escalated citizens",
  risk_profile: {
    primary_violence_types: [
      {
        type: "Type II — Client/Public",
        description: "Violence from members of the public during service delivery, including threats, verbal abuse, and physical assault.",
      },
      {
        type: "Type II — Bylaw / Enforcement",
        description: "Violence directed at enforcement officers during bylaw, licensing, or regulatory activities.",
      },
    ],
    common_sources: [
      "Citizens frustrated with service delays, denials, or decisions",
      "Individuals experiencing mental health crises or substance use issues",
      "Bylaw and licensing disputes",
      "Benefit or service denials (social services, licensing)",
      "Politically motivated threats against elected officials or staff",
      "Domestic disputes involving government services (child protection, housing)",
    ],
    risk_level: "Elevated",
    environmental_factors: [
      "High-volume public service counters",
      "Open public lobbies with limited physical barriers",
      "Field workers conducting inspections or enforcement",
      "After-hours emergency services",
      "Politically charged environments",
      "Lone workers conducting home visits or field inspections",
    ],
  },
  common_scenarios: [
    "A citizen denied a permit becomes verbally abusive and threatening toward a counter service worker.",
    "A bylaw officer conducting an inspection is threatened by the property owner.",
    "A social worker conducting a home visit encounters a client who becomes physically aggressive.",
    "A citizen sends threatening emails to a municipal councillor and their staff.",
    "A group of protesters becomes aggressive outside a government office during a contentious decision.",
  ],
  high_risk_roles: [
    "Counter Service and Intake Workers",
    "Bylaw and Licensing Officers",
    "Social Workers and Case Managers",
    "Building and Property Inspectors",
    "Elected Officials and their Staff",
    "Security Personnel",
    "Lone Field Workers",
    "Emergency Services Dispatch Staff",
  ],
  controls_and_procedures: {
    prevention: [
      {
        action: "Physical barrier and service counter design",
        detail: "Install physical barriers (e.g., plexiglass, counters) between staff and the public in high-risk service areas. Ensure staff have a clear exit route.",
        integrationTag: "audit-physical-security",
      },
      {
        action: "Lone worker safety protocol for field staff",
        detail: "Implement a mandatory check-in protocol for all field workers. Provide personal duress devices. Define escalation steps if check-in is missed.",
        integrationTag: "audit-lone-worker",
      },
      {
        action: "De-escalation training for all public-facing staff",
        detail: "Mandatory de-escalation training for all staff with public contact. Include techniques for managing emotionally escalated citizens.",
        integrationTag: "training-de-escalation",
      },
      {
        action: "Client flagging and risk communication",
        detail: "Implement a system for flagging clients with a history of threatening behaviour. Ensure flags are communicated to relevant staff before appointments.",
        integrationTag: "audit-information-sharing",
      },
      {
        action: "Duress alarm installation at all service counters",
        detail: "Install silent duress alarms at all public-facing service counters. Ensure all staff know how to activate them.",
        integrationTag: "audit-physical-security",
      },
    ],
    response: [
      {
        action: "Activate the duress alarm and summon security",
        detail: "Staff must be able to activate a duress alarm without alerting the individual. Security or a designated response team must respond within a defined timeframe.",
        integrationTag: "eap-emergency-response",
      },
      {
        action: "Use verbal de-escalation to manage the situation",
        detail: "Trained staff should attempt to de-escalate the situation verbally. Do not argue, threaten, or make promises that cannot be kept.",
        integrationTag: "eap-de-escalation",
      },
      {
        action: "Call 911 if the situation cannot be controlled",
        detail: "If the individual is armed, making criminal threats, or the situation cannot be controlled, call 911 immediately.",
        integrationTag: "eap-emergency-contacts",
      },
      {
        action: "Evacuate the public area if required",
        detail: "If the situation poses a risk to other members of the public, evacuate the area using the facility's emergency procedures.",
        integrationTag: "eap-evacuation",
      },
    ],
    post_incident: [
      {
        action: "Complete a Workplace Violence Incident Report",
        detail: "Document the incident within 24 hours. Submit to the JHSC and management.",
        integrationTag: "audit-incident-reporting",
      },
      {
        action: "Update the client flag",
        detail: "Ensure the client's record is updated to reflect the incident. Brief relevant staff before any future interactions.",
        integrationTag: "audit-information-sharing",
      },
      {
        action: "Provide psychological support to affected staff",
        detail: "Offer EAP counselling and allow affected staff to take time away from public-facing duties.",
        integrationTag: "training-psychological-support",
      },
      {
        action: "Review and update security measures",
        detail: "Identify any security gaps and implement corrective actions. Consider whether additional physical barriers or staffing changes are required.",
        integrationTag: "audit-physical-security",
      },
    ],
  },
  training_priorities: [
    {
      topic: "De-escalation with emotionally escalated citizens",
      rationale: "The primary tool for preventing Type II violence in public service environments.",
      integrationTag: "training-de-escalation",
    },
    {
      topic: "Lone worker safety procedures",
      rationale: "Field workers face disproportionate risk. Check-in protocols and duress procedures must be second nature.",
      integrationTag: "training-lone-worker",
    },
    {
      topic: "Recognizing and responding to mental health crises",
      rationale: "Many public service encounters involve individuals in mental health or substance use crises.",
      integrationTag: "training-mental-health-response",
    },
    {
      topic: "Incident reporting and documentation",
      rationale: "Accurate reporting enables trend analysis and satisfies regulatory obligations.",
      integrationTag: "training-incident-reporting",
    },
    {
      topic: "Active threat response (Run-Hide-Defend)",
      rationale: "All employees must know how to respond to an active threat in a public building.",
      integrationTag: "training-active-threat",
    },
  ],
  policy_emphasis: [
    {
      policy: "Workplace Violence Prevention Policy",
      description: "Must explicitly address Type II violence from the public. Should reference the client flagging system, reporting obligations, and zero-tolerance stance.",
    },
    {
      policy: "Lone Worker Safety Policy",
      description: "Defines check-in requirements, duress procedures, and escalation steps for field workers.",
    },
    {
      policy: "Client Behaviour Management Policy",
      description: "Defines prohibited behaviours, the client flagging process, and the process for managing clients who have been violent or threatening.",
    },
    {
      policy: "Threat Assessment Policy",
      description: "Defines the process for assessing and managing threats from members of the public, including politically motivated threats.",
    },
  ],
  assessment_focus: [
    {
      area: "Public Service Counter Security",
      questions: [
        "Are physical barriers installed between staff and the public in all high-risk service areas?",
        "Are duress alarms installed at all public-facing service counters?",
        "Is there a staffed security presence during peak service hours?",
        "Do all counter staff know how to activate the duress alarm?",
      ],
      integrationTag: "audit-physical-security",
    },
    {
      area: "Lone Worker Protections",
      questions: [
        "Is there a documented check-in protocol for all field workers?",
        "Are field workers equipped with a personal duress device?",
        "Is there a defined escalation process if a check-in is missed?",
        "Are lone worker risks assessed and documented?",
      ],
      integrationTag: "audit-lone-worker",
    },
    {
      area: "Client Flagging and Risk Communication",
      questions: [
        "Is there a system for flagging clients with a history of threatening behaviour?",
        "Are flags communicated to relevant staff before appointments?",
        "Is there a process for reviewing and removing flags?",
      ],
      integrationTag: "audit-information-sharing",
    },
  ],
};

// ─── Master export ─────────────────────────────────────────────────────────────

export const INDUSTRY_OVERLAYS: Record<string, IndustryOverlay> = {
  healthcare: HEALTHCARE,
  education: EDUCATION,
  retail: RETAIL,
  manufacturing: MANUFACTURING,
  corporate: CORPORATE,
  public_government: PUBLIC_GOVERNMENT,
};

export const INDUSTRY_LIST: Array<{ key: string; label: string; icon: string }> = [
  { key: "healthcare", label: "Healthcare", icon: "Stethoscope" },
  { key: "education", label: "Education (K-12 / Post-secondary)", icon: "GraduationCap" },
  { key: "retail", label: "Retail", icon: "ShoppingCart" },
  { key: "manufacturing", label: "Manufacturing / Industrial", icon: "Factory" },
  { key: "corporate", label: "Corporate / Office", icon: "Briefcase" },
  { key: "public_government", label: "Public / Government", icon: "Landmark" },
];

/**
 * Retrieve the industry overlay for a given industry key.
 * Returns null if the key is not found.
 */
export function getIndustryOverlay(industryKey: string): IndustryOverlay | null {
  return INDUSTRY_OVERLAYS[industryKey] ?? null;
}
