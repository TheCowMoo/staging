/**
 * Pursuit Pathways EAP Framework
 * FEMA ICS/NIMS-Aligned Emergency Action Plan Data Model
 *
 * Standards Alignment:
 *   - FEMA National Incident Management System (NIMS)
 *   - FEMA Incident Command System (ICS) — Simplified for small/mid-sized organizations
 *   - NFPA 3000 Hostile Event Preparedness
 *   - OSHA Emergency Action Plan requirements (29 CFR 1910.38)
 *
 * Proprietary Framework:
 *   - ACTD: Assess · Commit · Take Action · Debrief
 *   - Take Action sub-options: Lockout/Lockdown · Escape · Defend
 *   (Replaces Run/Hide/Fight throughout this platform)
 */

// ── Facility Size Classification ──────────────────────────────────────────────

export type FacilitySize = "micro" | "small" | "medium" | "large" | "enterprise";

export function classifyFacilitySize(occupancy: number): FacilitySize {
  if (occupancy <= 10) return "micro";
  if (occupancy <= 50) return "small";
  if (occupancy <= 150) return "medium";
  if (occupancy <= 500) return "large";
  return "enterprise";
}

// ── ICS Role Definitions ──────────────────────────────────────────────────────

export interface ICSRole {
  id: string;
  title: string;
  icsEquivalent: string;
  description: string;
  responsibilities: string[];
  reportsTo: string | null;
  requiredFor: FacilitySize[];
  backupRequired: boolean;
}

export const ICS_ROLES: ICSRole[] = [
  {
    id: "site_lead",
    title: "Site Lead / Incident Lead",
    icsEquivalent: "Incident Commander",
    description:
      "The Site Lead has overall authority and responsibility for managing all emergency response activities. This person activates the Emergency Action Plan, directs all assigned roles, and serves as the primary point of contact for arriving emergency services.",
    responsibilities: [
      "Activate the Emergency Action Plan and notify staff of the emergency",
      "Assess the situation and determine the appropriate ACTD Take Action option (Lockout/Lockdown, Escape, or Defend)",
      "Direct all assigned emergency roles and coordinate their activities",
      "Communicate with 911 and brief arriving emergency responders",
      "Receive accountability reports from the Accountability Coordinator",
      "Authorize re-entry to the facility only after law enforcement or fire department all-clear",
      "Initiate post-incident debrief and after-action review",
    ],
    reportsTo: null,
    requiredFor: ["micro", "small", "medium", "large", "enterprise"],
    backupRequired: true,
  },
  {
    id: "secondary_lead",
    title: "Secondary Lead / Backup Incident Lead",
    icsEquivalent: "Deputy Incident Commander",
    description:
      "The Secondary Lead assumes command if the Site Lead is unavailable, incapacitated, or directly involved in the incident. This person supports the Site Lead during normal operations and is fully briefed on all EAP procedures.",
    responsibilities: [
      "Assume full Site Lead responsibilities if the primary Site Lead is unavailable",
      "Support the Site Lead during the incident response",
      "Monitor the status of all assigned roles and report to the Site Lead",
      "Assist with staff accountability and communication",
      "Document incident timeline and actions taken",
    ],
    reportsTo: "site_lead",
    requiredFor: ["small", "medium", "large", "enterprise"],
    backupRequired: false,
  },
  {
    id: "emergency_caller",
    title: "Emergency Caller (911)",
    icsEquivalent: "Communications Officer",
    description:
      "The Emergency Caller is the designated person responsible for contacting 911 and emergency services. Having a single designated caller prevents duplicate or conflicting calls to emergency dispatch and ensures critical information is communicated clearly.",
    responsibilities: [
      "Call 911 immediately upon direction from the Site Lead (or independently if Site Lead is unavailable)",
      "Provide: facility address, nature of emergency, number of people involved, your name and callback number",
      "Do not hang up until the dispatcher releases you",
      "Relay dispatcher instructions to the Site Lead",
      "Contact building management, security, and other required parties as directed",
      "Document the time of call and dispatcher instructions",
    ],
    reportsTo: "site_lead",
    requiredFor: ["micro", "small", "medium", "large", "enterprise"],
    backupRequired: true,
  },
  {
    id: "evacuation_coordinator",
    title: "Evacuation Coordinator",
    icsEquivalent: "Operations Section — Evacuation Group Supervisor",
    description:
      "The Evacuation Coordinator directs the orderly movement of all occupants to designated assembly points during an evacuation. This person ensures all areas are cleared and reports evacuation status to the Site Lead.",
    responsibilities: [
      "Direct all occupants to the nearest safe evacuation route",
      "Ensure all areas (offices, restrooms, conference rooms, storage areas) are cleared",
      "Assist individuals with disabilities or mobility limitations",
      "Lead occupants to the designated primary assembly point",
      "Report to the Site Lead when evacuation is complete or when areas cannot be cleared",
      "Do not re-enter the building for any reason without Site Lead authorization",
    ],
    reportsTo: "site_lead",
    requiredFor: ["micro", "small", "medium", "large", "enterprise"],
    backupRequired: true,
  },
  {
    id: "accountability_coordinator",
    title: "Accountability Coordinator",
    icsEquivalent: "Operations Section — Accountability Officer",
    description:
      "The Accountability Coordinator takes roll call at the assembly point using the current employee and visitor roster, identifies missing persons, and reports accountability status to the Site Lead. This is a critical life-safety function.",
    responsibilities: [
      "Bring the current employee roster and visitor log to the assembly point",
      "Take roll call of all staff and visitors at the assembly point",
      "Identify and report any missing persons to the Site Lead immediately",
      "Record the last known location of any missing persons",
      "Maintain the roster at the assembly point until all-clear is given",
      "Submit a final accountability report to the Site Lead and HR within 24 hours",
    ],
    reportsTo: "site_lead",
    requiredFor: ["small", "medium", "large", "enterprise"],
    backupRequired: false,
  },
  {
    id: "external_liaison",
    title: "External Coordinator / Responder Liaison",
    icsEquivalent: "Liaison Officer",
    description:
      "The External Coordinator meets arriving emergency responders at the designated entry point and provides a situational briefing. This role ensures responders have the information they need to act quickly and safely.",
    responsibilities: [
      "Proceed to the designated responder entry point upon arrival of emergency services",
      "Brief arriving responders on: nature of incident, building layout, number of occupants, location of threat, known injuries, and actions already taken",
      "Provide access to building systems (keys, access cards, floor plans, utility shutoffs)",
      "Transfer operational command to the arriving law enforcement or fire Incident Commander",
      "Remain available to support responders as needed",
      "Do not interfere with responder operations",
    ],
    reportsTo: "site_lead",
    requiredFor: ["medium", "large", "enterprise"],
    backupRequired: false,
  },
  {
    id: "floor_coordinator",
    title: "Floor / Area Coordinator",
    icsEquivalent: "Operations Section — Area Supervisor",
    description:
      "Floor or Area Coordinators are responsible for emergency response within their assigned zone. They direct occupants in their area, report status to the Evacuation Coordinator, and ensure no one is left behind.",
    responsibilities: [
      "Direct all occupants in your assigned floor or area to evacuate or shelter as directed",
      "Check all rooms, restrooms, and common areas in your zone",
      "Assist individuals with disabilities or mobility limitations",
      "Report zone status (cleared / not cleared / persons remaining) to the Evacuation Coordinator",
      "Proceed to the assembly point and report to the Accountability Coordinator",
    ],
    reportsTo: "evacuation_coordinator",
    requiredFor: ["large", "enterprise"],
    backupRequired: false,
  },
  {
    id: "first_aid_coordinator",
    title: "First Aid Coordinator",
    icsEquivalent: "Medical Unit Leader",
    description:
      "The First Aid Coordinator provides initial medical assistance to injured persons until EMS arrives. This role requires current first aid and CPR certification.",
    responsibilities: [
      "Respond to injured persons and provide first aid within your training level",
      "Do not move seriously injured persons unless they are in immediate danger",
      "Ensure AED and first aid kit are accessible and brought to the scene if safe to do so",
      "Report the number and condition of injured persons to the Site Lead and Emergency Caller",
      "Brief arriving EMS on injuries, treatment provided, and patient status",
      "Document all medical interventions for the incident report",
    ],
    reportsTo: "site_lead",
    requiredFor: ["medium", "large", "enterprise"],
    backupRequired: false,
  },
];

// ── Dynamic Role Assignment by Facility Size ──────────────────────────────────

export function getRolesForFacility(size: FacilitySize): ICSRole[] {
  return ICS_ROLES.filter((role) => role.requiredFor.includes(size));
}

export function getRequiredRoleCount(size: FacilitySize): number {
  const roles = getRolesForFacility(size);
  // Count backups for roles that require them
  const backupCount = roles.filter((r) => r.backupRequired).length;
  return roles.length + backupCount;
}

// ── ACTD Framework Definition ─────────────────────────────────────────────────

export const ACTD_FRAMEWORK = {
  name: "ACTD",
  fullName: "Assess · Commit · Take Action · Debrief",
  description:
    "The ACTD framework is a structured decision-making and response protocol for active threat and emergency situations. It provides a clear, sequential process that any staff member can follow, regardless of prior emergency training.",
  phases: [
    {
      id: "assess",
      name: "Assess",
      order: 1,
      description:
        "Gather information and recognize the threat. Situational awareness is the foundation of every effective emergency response.",
      keyActions: [
        "Recognize that an emergency or threat is occurring",
        "Identify the nature, location, and apparent severity of the threat",
        "Determine how many people are in the immediate area",
        "Identify available exits, shelter locations, and barriers",
        "Avoid tunnel vision — continue gathering information as the situation evolves",
      ],
      timeframe: "Seconds to 1–2 minutes",
    },
    {
      id: "commit",
      name: "Commit",
      order: 2,
      description:
        "Make a decisive commitment to act. Hesitation and indecision are the most dangerous responses to an emergency. Once you have assessed the situation, commit to a course of action and act on it immediately.",
      keyActions: [
        "Do not freeze — commit to action immediately after assessing",
        "Designate or confirm the Site Lead if not already established",
        "Communicate your decision to others in your area",
        "Activate the Emergency Action Plan",
        "Assign roles to available staff",
      ],
      timeframe: "Immediate — within seconds of assessment",
    },
    {
      id: "take_action",
      name: "Take Action",
      order: 3,
      description:
        "Execute one of three tactical responses based on your threat assessment. The choice of action depends on the nature of the threat, your location, and available options.",
      subOptions: [
        {
          id: "lockout_lockdown",
          name: "Lockout / Lockdown",
          description:
            "Secure the facility or area to deny entry to the threat. Use when the threat is outside the building or in another area of the building and you have time to secure your location.",
          steps: [
            "Lock and barricade all doors in your area",
            "Move away from doors and windows",
            "Turn off lights and silence all devices",
            "Stay low and out of sight",
            "Do not open the door for anyone — wait for law enforcement all-clear",
            "Call 911 if you have not already done so — text if calling is not safe",
            "Account for all persons in your secured area",
          ],
          whenToUse:
            "Threat is outside the building or in a different area; you have time to secure your location; evacuation routes are blocked or unsafe",
        },
        {
          id: "escape",
          name: "Escape",
          description:
            "Evacuate the building or area via the safest available route. Use when you have a clear, safe path away from the threat.",
          steps: [
            "Move quickly and quietly to the nearest safe exit",
            "Leave belongings behind — do not stop for anything",
            "Help others if you can do so without putting yourself at risk",
            "Do not use elevators",
            "Move away from the building — do not stop in parking lots or nearby areas",
            "Proceed to the designated assembly point",
            "Call 911 once you are safe",
            "Do not return to the building until law enforcement gives all-clear",
          ],
          whenToUse:
            "You have a clear, safe evacuation route; the threat is not between you and the exit; you can move without being detected",
        },
        {
          id: "defend",
          name: "Defend",
          description:
            "As an absolute last resort — when Lockout/Lockdown and Escape are not possible and your life is in immediate danger. Commit fully to defense using any available resource.",
          steps: [
            "This is a last resort — only when Lockout and Escape are not possible",
            "Act aggressively and with full commitment — do not hesitate",
            "Use available objects as improvised tools (fire extinguisher, furniture, etc.)",
            "Yell, create noise, and disorient the threat",
            "Work together with others if possible",
            "Do not stop until the threat is neutralized or you can safely escape",
          ],
          whenToUse:
            "Lockout/Lockdown is not possible; escape routes are blocked; the threat has entered your location and your life is in immediate danger",
        },
      ],
      timeframe: "Ongoing until threat is resolved or law enforcement takes control",
    },
    {
      id: "debrief",
      name: "Debrief",
      order: 4,
      description:
        "Post-incident accountability, reporting, recovery, and after-action review. The Debrief phase begins as soon as the immediate threat is resolved and continues through full organizational recovery.",
      keyActions: [
        "Account for all personnel at the assembly point",
        "Report missing persons to law enforcement immediately",
        "Provide medical assistance to injured persons",
        "Do not re-enter the facility until law enforcement gives all-clear",
        "Cooperate fully with law enforcement investigation",
        "Complete incident documentation within 24 hours",
        "Conduct after-action review within 72 hours",
        "Provide Critical Incident Stress Debriefing (CISD) resources to all staff",
        "Submit required regulatory reports (OSHA, insurance) within required timeframes",
        "Update the Emergency Action Plan based on lessons learned",
      ],
      timeframe: "Begins immediately after threat resolution; continues through full recovery",
    },
  ],
};

// ── All-Hazards Scenario Templates ────────────────────────────────────────────

export interface HazardScenario {
  id: string;
  name: string;
  category: "active_threat" | "medical" | "fire" | "weather" | "infrastructure" | "bomb_threat";
  description: string;
  immediateActions: string[];
  actdGuidance: string;
  externalNotifications: string[];
  recoverySteps: string[];
}

export const ALL_HAZARDS_SCENARIOS: HazardScenario[] = [
  {
    id: "active_threat",
    name: "Active Threat / Hostile Event",
    category: "active_threat",
    description:
      "An individual or group is actively causing or threatening to cause physical harm to persons within or near the facility. This includes armed intruder, workplace violence, and targeted attack scenarios.",
    immediateActions: [
      "Apply the ACTD protocol immediately: Assess the threat, Commit to action, Take Action (Lockout/Lockdown, Escape, or Defend), Debrief",
      "Call 911 — provide location, nature of threat, description of suspect, number of people involved",
      "Activate the Emergency Action Plan and notify all staff",
      "Site Lead assumes command and directs all assigned roles",
      "Do not attempt to negotiate with or confront the threat unless Defend is the only option",
    ],
    actdGuidance:
      "ACTD is the primary response protocol for active threat events. Assess the threat location and severity. Commit to action immediately. Choose Take Action option based on threat proximity: Lockout/Lockdown if threat is distant, Escape if a clear route exists, Defend only as a last resort. Debrief begins immediately after law enforcement secures the scene.",
    externalNotifications: ["911 (immediate)", "Building security/management", "HR and senior leadership"],
    recoverySteps: [
      "Wait for law enforcement all-clear before re-entry",
      "Account for all personnel",
      "Provide CISD resources to all staff",
      "Complete OSHA incident report if applicable",
      "Conduct after-action review within 72 hours",
    ],
  },
  {
    id: "medical_emergency",
    name: "Medical Emergency",
    category: "medical",
    description:
      "A staff member, visitor, or client experiences a serious medical event including cardiac arrest, severe injury, stroke, seizure, or other life-threatening condition.",
    immediateActions: [
      "Call 911 immediately — do not delay",
      "Send someone to meet EMS at the building entrance",
      "Begin CPR if the person is unresponsive and not breathing (if trained)",
      "Retrieve the AED if cardiac arrest is suspected",
      "Clear the area of bystanders",
      "Do not move the person unless they are in immediate danger",
    ],
    actdGuidance:
      "ACTD applies to medical emergencies: Assess the person's condition and call for help. Commit to providing aid. Take Action by calling 911, beginning first aid, and deploying the AED if needed. Debrief includes documenting the incident and reviewing the response.",
    externalNotifications: ["911 (immediate)", "Building management", "HR", "Next of kin (through proper channels)"],
    recoverySteps: [
      "Complete incident documentation",
      "Review first aid kit and AED status",
      "Provide support resources to staff who witnessed the event",
      "Submit OSHA 300 log entry if work-related",
    ],
  },
  {
    id: "fire",
    name: "Fire Event",
    category: "fire",
    description:
      "A fire, smoke condition, or fire alarm activation requiring evacuation or investigation of the facility.",
    immediateActions: [
      "Activate the fire alarm if not already activated",
      "Call 911 — do not assume the alarm system has notified the fire department",
      "Evacuate all occupants immediately via the nearest safe exit",
      "Do not use elevators",
      "Close doors as you exit to slow fire spread — do not lock them",
      "Assist individuals with disabilities to the nearest Area of Rescue Assistance",
      "Do not attempt to fight the fire unless you are trained and the fire is very small",
    ],
    actdGuidance:
      "For fire events, the Take Action decision is typically Escape. Assess whether evacuation routes are clear of smoke and fire. Commit to evacuation immediately. Escape via the nearest safe exit. Debrief at the assembly point with full accountability.",
    externalNotifications: ["911 (immediate)", "Fire department", "Building management", "Insurance carrier"],
    recoverySteps: [
      "Do not re-enter until fire department gives all-clear",
      "Account for all personnel at assembly point",
      "Document damage",
      "Activate business continuity plan",
    ],
  },
  {
    id: "severe_weather",
    name: "Severe Weather",
    category: "weather",
    description:
      "Severe weather events including tornado, hurricane, severe thunderstorm, or other weather emergencies requiring shelter-in-place or evacuation.",
    immediateActions: [
      "Monitor weather alerts via NOAA Weather Radio or emergency alert system",
      "For tornado warning: move all occupants to interior rooms on the lowest floor, away from windows",
      "For hurricane: follow local emergency management evacuation orders",
      "Account for all personnel in the shelter area",
      "Do not go outside until the all-clear is issued by weather authorities",
    ],
    actdGuidance:
      "For severe weather, the Take Action decision is typically Lockout/Lockdown (shelter-in-place). Assess the weather threat type and severity. Commit to sheltering immediately upon warning. Take Action by moving to the designated shelter area. Debrief after the all-clear to assess any damage or injuries.",
    externalNotifications: ["911 if injuries or damage", "Building management", "Local emergency management"],
    recoverySteps: [
      "Assess building for structural damage before re-occupying",
      "Document all damage",
      "Report injuries to OSHA if work-related",
      "Activate business continuity plan if needed",
    ],
  },
  {
    id: "bomb_threat",
    name: "Bomb Threat / Suspicious Package",
    category: "bomb_threat",
    description:
      "A verbal or written bomb threat is received, or a suspicious unattended package or device is discovered on or near the premises.",
    immediateActions: [
      "Do not touch, move, or attempt to open any suspicious package",
      "Call 911 immediately",
      "Evacuate the building — treat every bomb threat as real until law enforcement clears the scene",
      "Do not use cell phones or radios near a suspicious package (may trigger detonation)",
      "Provide law enforcement with the exact location of the suspicious package",
      "If a verbal threat is received: keep the caller on the line, note exact words, note background sounds, complete a Bomb Threat Checklist",
    ],
    actdGuidance:
      "For bomb threats, the Take Action decision is Escape (evacuation). Do not attempt Lockout/Lockdown — distance from the threat is the priority. Assess the threat credibility and location. Commit to evacuation immediately. Escape the building and move at least 300 feet away. Debrief with law enforcement.",
    externalNotifications: ["911 (immediate)", "Building management", "FBI if credible threat (1-800-CALL-FBI)"],
    recoverySteps: [
      "Do not re-enter until law enforcement gives all-clear",
      "Cooperate fully with law enforcement investigation",
      "Document the threat and response",
      "Review and update security procedures",
    ],
  },
  {
    id: "utility_failure",
    name: "Utility / Infrastructure Failure",
    category: "infrastructure",
    description:
      "Loss of power, gas leak, water main break, HVAC failure, or other infrastructure emergency that may require evacuation or shelter-in-place.",
    immediateActions: [
      "For gas leak: evacuate immediately, do not operate electrical switches, call 911 and the gas utility",
      "For power outage: activate emergency lighting, account for all personnel, assess whether operations can continue safely",
      "For structural damage: evacuate affected areas, call 911 if collapse risk exists",
      "Do not attempt to repair utility systems — contact qualified professionals",
    ],
    actdGuidance:
      "For utility failures, the Take Action decision depends on the type and severity: Escape for gas leaks or structural failures; Lockout/Lockdown (shelter-in-place) for power outages in safe conditions. Assess the specific hazard. Commit to the appropriate action. Debrief includes utility notification and damage documentation.",
    externalNotifications: ["911 if life safety risk", "Utility company", "Building management", "Facilities/maintenance"],
    recoverySteps: [
      "Do not restore power or utilities without qualified personnel",
      "Document all damage and losses",
      "Activate business continuity plan",
      "Notify insurance carrier",
    ],
  },
];

// ── Communication Protocol Templates ─────────────────────────────────────────

export const COMMUNICATION_PROTOCOLS = {
  internal: {
    primaryMethod: "Public address (PA) system or overhead announcement",
    backupMethod: "Phone tree / group text / email alert",
    plainLanguageRule:
      "Use plain language at all times — no codes, no jargon. Say exactly what is happening and what people should do.",
    announcementTemplates: {
      evacuation:
        "Attention all staff: This is [Site Lead name]. We have an emergency situation. Please evacuate the building immediately using the nearest exit. Do not use elevators. Proceed to the [primary assembly point location]. This is not a drill.",
      lockdown:
        "Attention all staff: This is [Site Lead name]. We are initiating a lockdown. Lock and secure your area immediately. Move away from doors and windows. Do not open the door for anyone. Await further instructions.",
      allClear:
        "Attention all staff: This is [Site Lead name]. The emergency situation has been resolved. Law enforcement has given the all-clear. You may [return to the building / resume normal operations] at this time. Thank you for your cooperation.",
    },
  },
  external: {
    emergencyCall: {
      number: "911",
      script:
        "I need to report an emergency at [full address]. We have [nature of emergency]. There are approximately [number] people in the building. My name is [name] and my callback number is [phone]. [Do not hang up until dispatcher releases you.]",
    },
    responderBriefing: {
      location: "Meet responders at [designated entry point — typically main entrance or parking lot]",
      information: [
        "Nature and location of the incident",
        "Number of occupants and their last known locations",
        "Description of any known threat or suspect",
        "Number and location of known injuries",
        "Actions already taken by staff",
        "Building layout and access information",
      ],
    },
  },
};

// ── Post-Incident Accountability and Recovery ─────────────────────────────────

export const POST_INCIDENT_PROCEDURES = {
  immediateAccountability: [
    "Accountability Coordinator takes roll call at the primary assembly point",
    "Report total accounted for and total missing to Site Lead",
    "Provide last known location of any missing persons to law enforcement",
    "Do not allow anyone to re-enter the building without Site Lead authorization",
    "Maintain accountability roster at the assembly point until all-clear",
  ],
  documentation: {
    within24Hours: [
      "Complete incident timeline (who, what, when, where)",
      "Document all actions taken by each assigned role",
      "Record all injuries, property damage, and losses",
      "Preserve any evidence (do not disturb the scene without law enforcement authorization)",
      "Collect written statements from all staff involved",
    ],
    within72Hours: [
      "Conduct formal after-action review with all assigned role holders",
      "Identify what worked well and what needs improvement",
      "Update the Emergency Action Plan based on lessons learned",
      "Submit OSHA incident report if required",
      "Notify insurance carrier",
    ],
  },
  employeeSupport: [
    "Provide access to Employee Assistance Program (EAP) resources",
    "Offer Critical Incident Stress Debriefing (CISD) for all staff involved",
    "Communicate clearly and regularly with all staff about the incident and recovery",
    "Allow staff to take time off if needed for psychological recovery",
    "Monitor for signs of post-traumatic stress in the weeks following the incident",
  ],
  regulatoryReporting: [
    "OSHA: Report work-related fatalities within 8 hours; hospitalizations within 24 hours (1-800-321-OSHA)",
    "Insurance: Notify carrier within required timeframe per policy",
    "Law enforcement: Cooperate fully with investigation",
    "Local emergency management: Notify if community resources were used",
  ],
};

// ── Training Requirements (NIMS-Aligned) ─────────────────────────────────────

export const TRAINING_REQUIREMENTS = {
  allStaff: [
    "ACTD Protocol (Assess, Commit, Take Action [Lockout/Lockdown, Escape, Defend], Debrief) — annual",
    "Emergency Action Plan overview — upon hire and annually",
    "Evacuation routes and assembly points — upon hire and when routes change",
    "How to call 911 and what information to provide — upon hire",
  ],
  assignedRoles: [
    "Site Lead / Secondary Lead: ICS-100 (Introduction to ICS) — free at training.fema.gov",
    "Site Lead / Secondary Lead: IS-700 (NIMS Overview) — free at training.fema.gov",
    "Evacuation Coordinator: Evacuation procedures and disability assistance — annual",
    "Accountability Coordinator: Roster management and roll call procedures — annual",
    "First Aid Coordinator: First Aid / CPR / AED certification — biennial",
    "Emergency Caller: 911 communication training — annual",
  ],
  exercises: [
    "Evacuation drill — minimum annually (recommended semi-annually)",
    "Lockdown drill — minimum annually",
    "Tabletop exercise for assigned role holders — annually",
    "Full-scale exercise — every 2–3 years",
  ],
  femaResources: [
    "IS-100.C: Introduction to ICS — https://training.fema.gov/is/courseoverview.aspx?code=IS-100.c",
    "IS-700.B: NIMS Overview — https://training.fema.gov/is/courseoverview.aspx?code=IS-700.b",
    "IS-907: Active Shooter — https://training.fema.gov/is/courseoverview.aspx?code=IS-907",
    "IS-5.A: An Introduction to Hazardous Materials — https://training.fema.gov/is/courseoverview.aspx?code=IS-5.a",
  ],
};
