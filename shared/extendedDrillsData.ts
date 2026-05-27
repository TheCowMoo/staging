/**
 * Extended Facilitator-Led Drills (15 min each)
 *
 * Format:
 *   CoreCompetency - The single skill being trained
 *   scenarioSetup - What the trainer briefs participants on before the drill
 *   executionSteps - What happens during the 15 minutes
 *   goesWell - The ideal path through the drill
 *   somethingGoesWrong - The trainer-introduced complication
 *   defensivePivot - How the drill moves to solo or team defense
 *   debriefFocus - What the trainer leads discussion on afterward
 */

export interface ExtendedDrill {
  id: number;
  coreCompetency: string;
  title: string;
  scenarioSetup: string;
  executionSteps: string[];
  goesWell: string;
  somethingGoesWrong: string;
  defensivePivot: string;
  debriefFocus: string[];
  durationMinutes: number;
}

export const EXTENDED_DRILLS: ExtendedDrill[] = [
  {
    id: 1,
    coreCompetency: "Lockdown",
    title: "Lockdown: Single Floor, Clear Threat Signal",
    durationMinutes: 15,
    scenarioSetup:
      "Participants are told that a report has come in of an aggressive, armed individual entering the building at the main entrance. The threat is confirmed. No evacuation is possible. All participants are on one floor.",
    executionSteps: [
      "Trainer announces the threat verbally — no alarm, just a spoken alert as a colleague would deliver it (2 min)",
      "Participants must identify their nearest lockable space, move to it, and begin barricade procedures (4 min)",
      "Trainer observes for door locking, barricade technique, communication silence, and light management (3 min)",
      "Trainer calls time and initiates debrief (6 min)",
    ],
    goesWell:
      "All participants reach a room, lock or barricade the door, silence phones, move away from the door and windows, and stay quiet.",
    somethingGoesWrong:
      'Trainer announces mid-drill: "The door will not lock — the handle is broken." Participants must improvise a barricade using available furniture.',
    defensivePivot:
      'If the barricade fails or cannot hold, trainer announces: "The door is giving way. You cannot hold it." Participants must transition to a team or solo defensive stance — identify improvised tools, assign roles (who holds, who strikes), and commit to action.',
    debriefFocus: [
      "How quickly did people move versus freeze?",
      "Who took leadership and communicated the plan?",
      "When the lock failed, was the barricade instinct immediate or hesitant?",
    ],
  },
];