/**
 * Threat Keyword Dictionary
 *
 * Maps behavioral warning signs and WAVR-21 factor terminology to keyword/phrase
 * patterns. Each entry specifies:
 *   - wavrKey: the WAVR-21 factor key it maps to
 *   - warningSign: the numbered warning sign (1–10) it corresponds to
 *   - severity: "critical" | "high" | "moderate" | "low"
 *   - label: human-readable warning sign label
 *   - phrases: array of lowercase strings/substrings to match (case-insensitive)
 *
 * Warning sign ↔ WAVR-21 mapping:
 *  1. Direct/Veiled/Conditional Threats      → concerningCommunications, leakage, imminentCommunication
 *  2. Escalating Conflicts / Me-vs-Them      → grievanceFixation, grievanceWithTarget, narcissisticInjury
 *  3. Weapons Fascination                    → weaponsInterest
 *  4. Drastic Behavior/Personality Change    → depressionWithdrawal, mentalHealthConcern, paranoidThinking
 *  5. Inability to Accept Criticism/Blaming  → narcissisticInjury, grievanceFixation
 *  6. Social Isolation / Loner Behavior      → socialIsolation, depressionWithdrawal
 *  7. Personal Stressors / Desperation       → desperationHopelessness, personalCrisis, recentStressor
 *  8. Substance Abuse                        → mentalHealthConcern (behavioral impairment)
 *  9. Intimidation / Disruptive Behavior     → pathwayBehaviors, concerningCommunications
 * 10. Stalking / Romantic Obsession          → surveillanceOfTarget, pathwayBehaviors
 */

export type WavrKey =
  | "grievanceFixation"
  | "grievanceWithTarget"
  | "desperationHopelessness"
  | "mentalHealthConcern"
  | "paranoidThinking"
  | "depressionWithdrawal"
  | "narcissisticInjury"
  | "concerningCommunications"
  | "weaponsInterest"
  | "pathwayBehaviors"
  | "leakage"
  | "priorViolenceHistory"
  | "priorMentalHealthCrisis"
  | "domesticViolenceHistory"
  | "recentStressor"
  | "socialIsolation"
  | "personalCrisis"
  | "helpSeeking"
  | "socialSupport"
  | "futureOrientation"
  | "finalActBehaviors"
  | "surveillanceOfTarget"
  | "imminentCommunication";

export type ThreatSeverity = "critical" | "high" | "moderate" | "low";

export interface ThreatKeywordEntry {
  id: string;
  wavrKey: WavrKey;
  warningSign: number; // 1–10
  severity: ThreatSeverity;
  label: string;
  phrases: string[];
}

export const THREAT_KEYWORD_ENTRIES: ThreatKeywordEntry[] = [
  // ── Warning Sign 1: Direct, Veiled, or Conditional Threats ────────────────
  {
    id: "direct_threat",
    wavrKey: "concerningCommunications",
    warningSign: 1,
    severity: "critical",
    label: "Direct Threat",
    phrases: [
      "i will kill", "i'm going to kill", "i am going to kill",
      "i will hurt", "i'm going to hurt", "i am going to hurt",
      "i will shoot", "i'm going to shoot",
      "i will attack", "i'm going to attack",
      "you're dead", "you are dead", "you're going to die", "you are going to die",
      "i will end you", "i will destroy you",
      "someone is going to get hurt", "people will get hurt",
      "blood will be spilled", "there will be consequences",
      "watch your back", "you better watch out",
      "i have a gun", "i brought a weapon",
    ],
  },
  {
    id: "veiled_threat",
    wavrKey: "concerningCommunications",
    warningSign: 1,
    severity: "high",
    label: "Veiled or Conditional Threat",
    phrases: [
      "you'll be sorry", "you will be sorry",
      "this isn't over", "this is not over", "it's not over",
      "you'll regret", "you will regret",
      "everyone will pay", "they'll pay for this",
      "i'll make them pay", "i will make them pay",
      "they won't get away with this",
      "i know where you live", "i know where you work",
      "don't push me", "you don't want to push me",
      "keep pushing and see what happens",
      "i'm at my breaking point", "i am at my breaking point",
      "i can't take this anymore", "i cannot take this anymore",
      "i'm done playing nice", "i am done playing nice",
      "someone needs to be taught a lesson",
    ],
  },
  {
    id: "leakage_threat",
    wavrKey: "leakage",
    warningSign: 1,
    severity: "critical",
    label: "Leakage — Pre-Attack Communication",
    phrases: [
      "been planning", "have been planning",
      "thought about this for a long time",
      "know exactly what i'm going to do",
      "made up my mind", "have made up my mind",
      "this is my last day", "today is my last day",
      "won't be coming back", "will not be coming back",
      "said goodbye", "said my goodbyes",
      "gave away my belongings", "gave away my things",
      "nothing left to lose", "have nothing left to lose",
      "don't care what happens to me",
      "written a note", "wrote a letter",
      "final message", "last message",
    ],
  },
  {
    id: "imminent_communication",
    wavrKey: "imminentCommunication",
    warningSign: 1,
    severity: "critical",
    label: "Imminent Communication",
    phrases: [
      "today is the day", "it ends today", "it happens today",
      "i'm coming in", "i am coming in",
      "i'll be there soon", "i will be there soon",
      "on my way", "heading there now",
      "they'll see", "they will see",
      "i'm ready", "i am ready",
      "time is up", "their time is up",
    ],
  },

  // ── Warning Sign 2: Escalating Conflicts / Me-Against-Them ───────────────
  {
    id: "grievance_fixation",
    wavrKey: "grievanceFixation",
    warningSign: 2,
    severity: "high",
    label: "Grievance Fixation",
    phrases: [
      "unfairly treated", "treated unfairly",
      "they're out to get me", "they are out to get me",
      "everyone is against me", "nobody is on my side",
      "i'm being targeted", "i am being targeted",
      "they singled me out", "i was singled out",
      "they have it out for me",
      "this is discrimination", "this is harassment",
      "i've been wronged", "i have been wronged",
      "i deserve better", "i don't deserve this",
      "they ruined my life", "they destroyed my career",
      "i've been cheated", "i have been cheated",
      "this is retaliation", "they're retaliating",
      "me against them", "me vs them", "us vs them",
      "nobody cares about me", "no one cares",
      "i'm always the victim", "i am always the victim",
    ],
  },
  {
    id: "grievance_with_target",
    wavrKey: "grievanceWithTarget",
    warningSign: 2,
    severity: "high",
    label: "Grievance with Identified Target",
    phrases: [
      "because of [name]", "it's [name]'s fault", "blame [name]",
      "my supervisor", "my manager", "my boss",
      "they fired me", "they let me go",
      "they demoted me", "they passed me over",
      "he did this to me", "she did this to me",
      "they took everything from me",
      "i know who is responsible",
      "i know who to blame",
      "i have a list", "i know who deserves it",
    ],
  },
  {
    id: "narcissistic_injury",
    wavrKey: "narcissisticInjury",
    warningSign: 2,
    severity: "moderate",
    label: "Narcissistic Injury / Chronic Blaming",
    phrases: [
      "it's never my fault", "it is never my fault",
      "i never make mistakes",
      "they're jealous of me", "they are jealous of me",
      "i'm the only competent one", "i am the only competent one",
      "i don't make mistakes", "i do not make mistakes",
      "they're incompetent", "they are incompetent",
      "i refuse to accept", "i won't accept",
      "i'm being humiliated", "i am being humiliated",
      "they embarrassed me", "they disrespected me",
      "my reputation is ruined",
      "they made me look bad",
      "i will not be disrespected",
    ],
  },

  // ── Warning Sign 3: Weapons Fascination ───────────────────────────────────
  {
    id: "weapons_interest",
    wavrKey: "weaponsInterest",
    warningSign: 3,
    severity: "critical",
    label: "Weapons Interest / Access",
    phrases: [
      "have a gun", "has a gun", "owns a gun", "bought a gun", "purchased a gun",
      "have weapons", "has weapons", "own weapons",
      "have a knife", "carry a knife", "carries a knife",
      "have ammunition", "bought ammo", "has ammo",
      "practicing shooting", "been practicing shooting",
      "at the gun range", "shooting range",
      "know how to use a gun", "knows how to shoot",
      "access to firearms", "can get a gun",
      "mass shooting", "school shooting", "workplace shooting",
      "active shooter", "going postal",
      "those shooters had the right idea",
      "understand why they did it",
      "admire what they did",
      "brought a weapon", "weapon at work",
      "gun in my car", "knife in my bag",
      "firearms", "firearm",
    ],
  },

  // ── Warning Sign 4: Drastic Behavior/Personality Change ───────────────────
  {
    id: "depression_withdrawal",
    wavrKey: "depressionWithdrawal",
    warningSign: 4,
    severity: "moderate",
    label: "Depression / Withdrawal",
    phrases: [
      "withdrawn", "isolating himself", "isolating herself", "isolating themselves",
      "stopped talking to everyone", "stopped coming to events",
      "doesn't seem like themselves", "not themselves",
      "completely changed", "different person",
      "very quiet lately", "unusually quiet",
      "stopped caring", "given up",
      "hopeless", "helpless",
      "what's the point", "no point in anything",
      "i don't see a future", "i do not see a future",
      "i have no future", "no reason to go on",
      "i'm done", "i am done with everything",
      "checked out", "mentally checked out",
    ],
  },
  {
    id: "mental_health_concern",
    wavrKey: "mentalHealthConcern",
    warningSign: 4,
    severity: "moderate",
    label: "Mental Health Concern",
    phrases: [
      "mental breakdown", "nervous breakdown",
      "losing my mind", "losing their mind",
      "not in their right mind", "not in my right mind",
      "erratic behavior", "erratic",
      "unstable", "emotionally unstable",
      "out of control", "out of character",
      "delusional", "paranoid",
      "hearing voices", "seeing things",
      "psychotic", "psychosis",
      "manic", "mania",
      "severe mood swings", "extreme mood swings",
      "completely irrational",
    ],
  },
  {
    id: "paranoid_thinking",
    wavrKey: "paranoidThinking",
    warningSign: 4,
    severity: "high",
    label: "Paranoid Thinking",
    phrases: [
      "they're watching me", "they are watching me",
      "they're following me", "they are following me",
      "they're spying on me", "they are spying on me",
      "they're monitoring me", "they are monitoring me",
      "everyone is conspiring", "conspiracy against me",
      "they're all in on it", "they are all in on it",
      "i'm being surveilled", "i am being surveilled",
      "i'm being recorded", "i am being recorded",
      "they put something in my food",
      "they're trying to poison me",
      "i can't trust anyone", "i cannot trust anyone",
      "i don't trust anyone", "i do not trust anyone",
    ],
  },

  // ── Warning Sign 5: Inability to Accept Criticism / Chronic Blaming ───────
  // (covered by narcissistic_injury and grievance_fixation above)

  // ── Warning Sign 6: Social Isolation ─────────────────────────────────────
  {
    id: "social_isolation",
    wavrKey: "socialIsolation",
    warningSign: 6,
    severity: "moderate",
    label: "Social Isolation",
    phrases: [
      "no friends", "has no friends",
      "no one to talk to", "nobody to talk to",
      "completely alone", "all alone",
      "loner", "keeps to himself", "keeps to herself",
      "avoids everyone", "avoids all contact",
      "refuses to interact", "won't interact",
      "eats alone", "sits alone",
      "no social connections", "no support system",
      "cut off from everyone", "cut everyone off",
      "nobody understands me", "no one understands me",
      "i have nobody", "i have no one",
    ],
  },

  // ── Warning Sign 7: Personal Stressors / Desperation ─────────────────────
  {
    id: "desperation_hopelessness",
    wavrKey: "desperationHopelessness",
    warningSign: 7,
    severity: "high",
    label: "Desperation / Hopelessness",
    phrases: [
      "at the end of my rope", "at the end of their rope",
      "can't go on", "cannot go on",
      "i can't take it anymore", "i cannot take it anymore",
      "i give up", "i've given up",
      "no way out", "there's no way out",
      "trapped", "i feel trapped",
      "no options left", "out of options",
      "i've lost everything", "i have lost everything",
      "nothing matters anymore", "nothing matters",
      "life isn't worth living", "life is not worth living",
      "i don't want to be here anymore",
      "i do not want to be here anymore",
      "i want to die", "i wish i was dead",
      "suicidal", "suicide",
      "end it all", "end my life",
    ],
  },
  {
    id: "personal_crisis",
    wavrKey: "personalCrisis",
    warningSign: 7,
    severity: "moderate",
    label: "Personal Crisis / Severe Stressor",
    phrases: [
      "going through a divorce", "getting divorced", "divorce",
      "lost my home", "losing my home", "evicted", "eviction",
      "bankruptcy", "bankrupt", "severe debt", "financial ruin",
      "lost custody", "losing custody",
      "legal trouble", "facing charges", "going to jail", "going to prison",
      "lost my job", "just got fired", "just got laid off",
      "terminal illness", "dying", "cancer diagnosis",
      "death in the family", "lost a loved one",
      "restraining order", "protective order",
    ],
  },
  {
    id: "recent_stressor",
    wavrKey: "recentStressor",
    warningSign: 7,
    severity: "moderate",
    label: "Recent Major Stressor",
    phrases: [
      "recently fired", "recently laid off", "recently demoted",
      "just got divorced", "just separated",
      "recently lost", "just lost",
      "under enormous pressure", "under extreme pressure",
      "overwhelmed", "completely overwhelmed",
      "can't handle the stress", "cannot handle the stress",
      "breaking point", "reached my limit",
    ],
  },

  // ── Warning Sign 8: Substance Abuse ──────────────────────────────────────
  {
    id: "substance_abuse",
    wavrKey: "mentalHealthConcern",
    warningSign: 8,
    severity: "moderate",
    label: "Substance Abuse / Behavioral Impairment",
    phrases: [
      "drunk at work", "drinking at work", "alcohol at work",
      "smells like alcohol", "smells of alcohol",
      "intoxicated", "visibly intoxicated",
      "on drugs", "using drugs at work",
      "high at work", "appeared high",
      "slurring", "slurred speech",
      "stumbling", "unsteady",
      "substance abuse", "drug abuse",
      "addiction", "addicted",
      "came in drunk", "showed up drunk",
    ],
  },

  // ── Warning Sign 9: Intimidation / Disruptive Behavior ───────────────────
  {
    id: "intimidation",
    wavrKey: "pathwayBehaviors",
    warningSign: 9,
    severity: "high",
    label: "Intimidation / Disruptive Behavior",
    phrases: [
      "shouting", "screaming", "yelling",
      "threw an object", "threw objects", "throwing things",
      "slammed", "slammed a door", "slammed the desk",
      "punched", "punched a wall", "punched the desk",
      "aggressive behavior", "aggressive outburst",
      "threatening posture", "got in my face",
      "physical intimidation", "physically intimidating",
      "blocked my path", "blocked the exit",
      "grabbed me", "grabbed my arm",
      "pushed me", "shoved me",
      "bullying", "bullied",
      "cursing at", "swearing at",
      "rage", "uncontrollable rage", "fit of rage",
      "violent outburst", "violent episode",
    ],
  },

  // ── Warning Sign 10: Stalking / Romantic Obsession ───────────────────────
  {
    id: "stalking",
    wavrKey: "surveillanceOfTarget",
    warningSign: 10,
    severity: "high",
    label: "Stalking / Surveillance of Target",
    phrases: [
      "following me", "following her", "following him",
      "showed up at my home", "showed up at my house",
      "showed up uninvited", "appeared uninvited",
      "watching me", "watching her", "watching him",
      "surveillance", "surveilling",
      "tracking my location", "tracking her location",
      "knows my schedule", "knows where i live",
      "waiting outside", "waiting for me outside",
      "won't leave me alone", "will not leave me alone",
      "obsessed with me", "obsessed with her", "obsessed with him",
      "unwanted contact", "unwanted messages",
      "excessive calls", "excessive texts", "excessive emails",
      "romantic obsession", "obsessive interest",
      "stalking", "stalker",
    ],
  },
  {
    id: "pathway_behaviors",
    wavrKey: "pathwayBehaviors",
    warningSign: 9,
    severity: "high",
    label: "Pathway Behaviors (Pre-Attack Planning)",
    phrases: [
      "researching how to", "looked up how to",
      "practicing", "rehearsing",
      "scouting the location", "scouting the building",
      "casing the building", "casing the area",
      "acquiring weapons", "obtaining weapons",
      "stockpiling", "collecting weapons",
      "making a plan", "planning an attack",
      "target practice", "practicing shooting",
      "bought a gun recently", "purchased a firearm",
      "tested security", "probing security",
    ],
  },

  // ── WAVR-21 Specific: Final Act Behaviors ─────────────────────────────────
  {
    id: "final_act",
    wavrKey: "finalActBehaviors",
    warningSign: 1,
    severity: "critical",
    label: "Final Act Behaviors",
    phrases: [
      "giving away possessions", "gave away belongings", "gave away her belongings",
      "said goodbye to everyone", "said his goodbyes", "said her goodbyes",
      "settled his affairs", "settled her affairs", "put affairs in order",
      "wrote a will", "updated his will", "updated her will",
      "final letter", "goodbye letter", "farewell letter",
      "last wishes", "final wishes",
      "won't need this anymore", "don't need this anymore",
      "making arrangements", "made final arrangements",
      "this is the end", "it's all over",
      "last day", "gave away",
    ],
  },

  // ── WAVR-21 Specific: Prior Violence History ──────────────────────────────
  {
    id: "prior_violence",
    wavrKey: "priorViolenceHistory",
    warningSign: 9,
    severity: "high",
    label: "Prior Violence History",
    phrases: [
      "history of violence", "violent history",
      "has been violent before", "was violent before",
      "prior assault", "previous assault",
      "prior arrest for violence", "arrested for assault",
      "restraining order against", "order of protection",
      "convicted of assault", "convicted of battery",
      "domestic violence history", "history of domestic violence",
      "prior incident of violence",
    ],
  },

  // ── WAVR-21 Specific: Domestic Violence ──────────────────────────────────
  {
    id: "domestic_violence",
    wavrKey: "domesticViolenceHistory",
    warningSign: 7,
    severity: "high",
    label: "Domestic Violence",
    phrases: [
      "domestic violence", "domestic abuse",
      "abusive relationship", "abusive partner",
      "abusive spouse", "abusive husband", "abusive wife",
      "hits his partner", "hits her partner",
      "beats his wife", "beats her husband",
      "controlling relationship", "coercive control",
      "partner is afraid of him", "partner is afraid of her",
      "spouse is afraid",
    ],
  },
];

/**
 * Severity ranking for sorting / escalation logic
 */
export const SEVERITY_RANK: Record<ThreatSeverity, number> = {
  critical: 4,
  high: 3,
  moderate: 2,
  low: 1,
};

/**
 * Warning sign labels for display
 */
export const WARNING_SIGN_LABELS: Record<number, string> = {
  1: "Direct, Veiled, or Conditional Threats",
  2: "Escalating Conflicts / Me-Against-Them",
  3: "Weapons Fascination",
  4: "Drastic Behavior or Personality Change",
  5: "Inability to Accept Criticism / Chronic Blaming",
  6: "Social Isolation / Loner Behavior",
  7: "Personal Stressors / Desperation",
  8: "Substance Abuse / Behavioral Impairment",
  9: "Intimidation / Disruptive Behavior",
  10: "Stalking / Romantic Obsession",
};
