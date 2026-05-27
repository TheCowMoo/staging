/**
 * Micro Training Drills Data
 *
 * 70 scenarios across 14 categories with two-step branching and considerations.
 * Each drill has:
 *   - A scenario description
 *   - Step 1 (Assess): Two choices (A/B)
 *   - Step 2 (Act): Response options based on Step 1 choice
 *   - Considerations: 2-3 reflection points
 *
 * Icon legend:
 *   🔒 = Lockdown | 🚪 = Lockout | 🏃 = Evacuate | 🛡️ = Defend
 *   📋 = Report Anonymously | 📞 = Report to Authority | ⏳ = Monitor / Follow Up
 *   ❌ = Do Nothing (passive choice — still a decision)
 */

export interface MicroDrillStep2Option {
  icon: string;
  label: string;
  description: string;
}

export interface MicroDrillScenario {
  id: number;
  category: string;
  categoryNumber: number;
  title: string;
  scenario: string;
  step1Question: string;
  step1A: { label: string; description: string };
  step1B: { label: string; description: string };
  step2A: MicroDrillStep2Option[];
  step2B: MicroDrillStep2Option[];
  considerations: string[];
}

export const MICRO_DRILLS: MicroDrillScenario[] = [
// ─── CATEGORY 1: Active Shooter — Real or Perceived ──────────────────────
  {
    id: 1,
    category: "Active Shooter — Real or Perceived",
    categoryNumber: 1,
    title: "Scenario 1",
    scenario: "Employees on the second floor hear what sounds like rapid, loud banging coming from the floor below. Some think it's a maintenance crew. Others aren't sure.",
    step1Question: "Is the threat confirmed or unconfirmed?",
    step1A: { label: "I believe it is a real threat", description: "Confirmed" },
    step1B: { label: "I am not sure yet", description: "Unconfirmed" },
    step2A: [
      { icon: "🔒", label: "Lockdown", description: "Secure your location immediately" },
      { icon: "🏃", label: "Evacuate", description: "Leave the building if safe to do so" },
      { icon: "🛡️", label: "Defend", description: "Prepare to defend if threat approaches" },
    ],
    step2B: [
      { icon: "🔒", label: "Lockdown as a precaution", description: "Secure your location while gathering info" },
      { icon: "⏳", label: "Monitor and gather more information", description: "Wait for more details before acting" },
      { icon: "📋", label: "Report what you heard anonymously", description: "Submit a report of what you observed" },
    ],
    considerations: [
      "Did you act on what you heard, or did you wait for others to react first? What caused the hesitation?",
      "If you chose to monitor, at what point would the situation have required you to escalate to a confirmed response?",
      "How would your decision have changed if you were alone versus surrounded by colleagues?",
    ],
  },
  {
    id: 2,
    category: "Active Shooter — Real or Perceived",
    categoryNumber: 1,
    title: "Scenario 2",
    scenario: "A coworker bursts through a side door, visibly panicked, saying they heard gunshots in the parking lot but isn't certain. No alarm has sounded.",
    step1Question: "Is the threat confirmed or unconfirmed?",
    step1A: { label: "I believe it is real based on my coworker's reaction", description: "Confirmed" },
    step1B: { label: "I am not sure — no alarm has sounded", description: "Unconfirmed" },
    step2A: [
      { icon: "🔒", label: "Lockdown", description: "Secure your location immediately" },
      { icon: "🚪", label: "Lockout (threat is external)", description: "Secure entry points, threat is in parking lot" },
      { icon: "🏃", label: "Evacuate away from the parking lot", description: "Exit away from the threat direction" },
      { icon: "🛡️", label: "Defend", description: "Prepare to defend if threat enters" },
    ],
    step2B: [
      { icon: "🔒", label: "Lockdown as a precaution", description: "Secure your location while waiting for official notification" },
      { icon: "⏳", label: "Monitor and wait for official notification", description: "Wait for alarm or official communication" },
      { icon: "📋", label: "Report what was heard", description: "Report the coworker's account to authorities" },
    ],
    considerations: [
      "How much weight did you give to your coworker's emotional state versus the absence of an alarm? Which should carry more influence?",
      "If the alarm never sounds, does that change your sense of responsibility to act?",
      "What would you do with others in the space who did not hear the coworker's warning?",
    ],
  },
  {
    id: 3,
    category: "Active Shooter — Real or Perceived",
    categoryNumber: 1,
    title: "Scenario 3",
    scenario: "During a busy shift, a loud pop and the sound of breaking glass is heard near the front entrance. Several people drop to the floor instinctively.",
    step1Question: "Is the threat confirmed or unconfirmed?",
    step1A: { label: "That sounded like a gunshot — I believe it is real", description: "Confirmed" },
    step1B: { label: "It could be something else — I am unsure", description: "Unconfirmed" },
    step2A: [
      { icon: "🔒", label: "Lockdown", description: "Secure your location immediately" },
      { icon: "🏃", label: "Evacuate away from the front entrance", description: "Exit away from the threat direction" },
      { icon: "🛡️", label: "Defend", description: "Prepare to defend if threat approaches" },
    ],
    step2B: [
      { icon: "🔒", label: "Lockdown as a precaution", description: "Secure your location while verifying" },
      { icon: "⏳", label: "Stay low and monitor", description: "Remain in place and observe" },
      { icon: "📋", label: "Report the sound and your location", description: "Submit a report of what you heard" },
    ],
    considerations: [
      "The instinct of those around you was to drop. Did you follow that instinct or override it? What does that tell you about your threat awareness?",
      "If you were near the front entrance, how would your response differ from someone in a back office?",
      "What is your plan for communicating with others in the space when you cannot speak loudly?",
    ],
  },
  {
    id: 4,
    category: "Active Shooter — Real or Perceived",
    categoryNumber: 1,
    title: "Scenario 4",
    scenario: "A manager receives a frantic text from an employee in another wing: 'I think someone has a gun. I can hear screaming.'",
    step1Question: "Is the threat confirmed or unconfirmed?",
    step1A: { label: "The text and screaming confirm it — this is real", description: "Confirmed" },
    step1B: { label: "I only have a text message — I cannot confirm", description: "Unconfirmed" },
    step2A: [
      { icon: "🔒", label: "Lockdown", description: "Secure your location immediately" },
      { icon: "🏃", label: "Evacuate away from that wing", description: "Exit away from the reported threat" },
      { icon: "🛡️", label: "Defend", description: "Prepare to defend if threat approaches" },
    ],
    step2B: [
      { icon: "🔒", label: "Lockdown as a precaution", description: "Secure your location while verifying" },
      { icon: "📞", label: "Contact security or emergency services immediately", description: "Notify authorities" },
      { icon: "⏳", label: "Attempt to verify before moving", description: "Try to confirm the situation" },
    ],
    considerations: [
      "As the manager receiving the text, do you have a responsibility to act on behalf of others even without visual confirmation?",
      "What would you communicate to the people in your immediate area, and how would you do it without creating panic?",
      "If you chose to verify before acting, how much time did that decision cost — and was it worth it?",
    ],
  },
  {
    id: 5,
    category: "Active Shooter — Real or Perceived",
    categoryNumber: 1,
    title: "Scenario 5",
    scenario: "Security cameras show an individual entering the building with what appears to be a long bag. They are moving quickly and not checking in at reception.",
    step1Question: "Is the threat confirmed or unconfirmed?",
    step1A: { label: "Their behavior and the bag are enough — treat as real", description: "Confirmed" },
    step1B: { label: "It could be a vendor or courier — I am unsure", description: "Unconfirmed" },
    step2A: [
      { icon: "🔒", label: "Lockdown", description: "Secure your location immediately" },
      { icon: "🏃", label: "Evacuate away from the entrance", description: "Exit away from the threat" },
      { icon: "🛡️", label: "Defend", description: "Prepare to defend if threat approaches" },
    ],
    step2B: [
      { icon: "🔒", label: "Lockdown as a precaution", description: "Secure your location while verifying" },
      { icon: "📞", label: "Alert security to intercept and verify", description: "Notify security to investigate" },
      { icon: "⏳", label: "Monitor camera feed", description: "Continue watching the situation" },
    ],
    considerations: [
      "How quickly can your organization move from camera observation to a building-wide action? Is that gap a vulnerability?",
      "What is the protocol when reception is bypassed — who owns the response at that point?",
      "If the individual turns out to be harmless, how does your organization debrief without discouraging future vigilance?",
    ],
  },
  {
    id: 6,
    category: "Active Shooter — Real or Perceived",
    categoryNumber: 1,
    title: "Scenario 6",
    scenario: "An employee hears what sounds like a single gunshot from outside the building while in a ground-floor office with large windows.",
    step1Question: "Is the threat confirmed or unconfirmed?",
    step1A: { label: "I believe that was a gunshot", description: "Confirmed" },
    step1B: { label: "I am not sure — it may have been a vehicle backfire", description: "Unconfirmed" },
    step2A: [
      { icon: "🔒", label: "Lockdown", description: "Secure your location immediately" },
      { icon: "🚪", label: "Lockout (threat is external)", description: "Secure entry points" },
      { icon: "🛡️", label: "Defend and move away from windows", description: "Take cover away from windows" },
    ],
    step2B: [
      { icon: "🚪", label: "Lockout as a precaution", description: "Secure entry points while verifying" },
      { icon: "⏳", label: "Move away from windows and monitor", description: "Take cover and observe" },
      { icon: "📋", label: "Report what you heard", description: "Submit a report of what you heard" },
    ],
    considerations: [
      "Large windows make you visible and vulnerable. Even in an unconfirmed situation, where is the safest position in your current space?",
      "How long would you wait before escalating an unconfirmed external sound to a confirmed threat response?",
      "Did you consider alerting others in the room, or did you focus only on your own response?",
    ],
  },
  {
    id: 7,
    category: "Active Shooter — Real or Perceived",
    categoryNumber: 1,
    title: "Scenario 7",
    scenario: "A fire alarm activates, but moments later a staff member near the exit sees a person outside holding what appears to be a firearm and refuses to exit.",
    step1Question: "Is the threat confirmed or unconfirmed?",
    step1A: { label: "I can see the person — this is real", description: "Confirmed" },
    step1B: { label: "The staff member may have been mistaken", description: "Unconfirmed" },
    step2A: [
      { icon: "🔒", label: "Lockdown — do not evacuate into the threat", description: "Shelter in place" },
      { icon: "🚪", label: "Lockout (armed individual is outside)", description: "Secure entry points" },
      { icon: "🛡️", label: "Defend if the threat enters", description: "Prepare to defend" },
    ],
    step2B: [
      { icon: "🔒", label: "Lockdown as a precaution — delay evacuation", description: "Secure location while verifying" },
      { icon: "📞", label: "Call emergency services to verify outside situation", description: "Contact authorities" },
      { icon: "⏳", label: "Monitor exits before proceeding", description: "Watch exits before deciding" },
    ],
    considerations: [
      "A fire alarm is trained as an unconditional evacuation cue. How difficult is it to override that conditioning in this scenario?",
      "Who in your organization has the authority to countermand a fire evacuation? Is that person always reachable?",
      "If others begin evacuating despite the warning, what do you do?",
    ],
  },
  {
    id: 8,
    category: "Active Shooter — Real or Perceived",
    categoryNumber: 1,
    title: "Scenario 8",
    scenario: "An employee receives a social media alert showing a photo of your building with a threatening caption posted 20 minutes ago. They show it to a supervisor.",
    step1Question: "Is the threat confirmed or unconfirmed?",
    step1A: { label: "The post is specific enough — treat as credible", description: "Confirmed" },
    step1B: { label: "It could be a prank or misidentified building", description: "Unconfirmed" },
    step2A: [
      { icon: "🔒", label: "Lockdown", description: "Secure your location immediately" },
      { icon: "🚪", label: "Lockout (threat origin is external)", description: "Secure entry points" },
      { icon: "🏃", label: "Evacuate", description: "Leave the building if safe to do so" },
    ],
    step2B: [
      { icon: "📞", label: "Report to security and management immediately", description: "Notify authorities" },
      { icon: "🔒", label: "Lockdown as a precaution", description: "Secure your location while verifying" },
      { icon: "⏳", label: "Preserve the post and monitor for updates", description: "Save evidence and watch for more" },
    ],
    considerations: [
      "Twenty minutes have already passed since the post. How does the time gap affect your urgency and your response choices?",
      "Do employees in your organization know to report social media threats to a supervisor immediately, or would most scroll past it?",
      "What is the process for preserving digital evidence while simultaneously initiating a safety response?",
    ],
  },
// ─── CATEGORY 2: Edged Weapon / Knife Attack ─────────────────────────────
  {
    id: 9,
    category: "Edged Weapon / Knife Attack",
    categoryNumber: 2,
    title: "Scenario 9",
    scenario: "A visibly agitated individual enters the lobby and reaches into their jacket. An employee near the front desk sees the handle of what appears to be a large knife.",
    step1Question: "Is the threat confirmed or unconfirmed?",
    step1A: { label: "I can see the weapon — this is confirmed", description: "Confirmed" },
    step1B: { label: "It may have been a tool or phone case — I am unsure", description: "Unconfirmed" },
    step2A: [
      { icon: "🔒", label: "Lockdown", description: "Secure your location immediately" },
      { icon: "🏃", label: "Evacuate away from the lobby", description: "Exit away from the threat" },
      { icon: "🛡️", label: "Defend", description: "Prepare to defend if threat approaches" },
    ],
    step2B: [
      { icon: "⏳", label: "Continue to observe from a safe distance", description: "Watch without engaging" },
      { icon: "📞", label: "Alert security discreetly", description: "Notify security quietly" },
      { icon: "🔒", label: "Lockdown as a precaution", description: "Secure your location while verifying" },
    ],
    considerations: [
      "The lobby is typically an open, exposed space. What barriers or positions exist near your front desk that provide cover?",
      "If you are the front desk employee, how do you alert the rest of the building without escalating the individual's agitation?",
      "What would you do if the individual approached the desk before you could act?",
    ],
  },
  {
    id: 10,
    category: "Edged Weapon / Knife Attack",
    categoryNumber: 2,
    title: "Scenario 10",
    scenario: "Two employees witness a physical altercation in the break room. One person produces a box cutter and holds it at their side while shouting.",
    step1Question: "Is the threat confirmed or unconfirmed?",
    step1A: { label: "I can see the box cutter — confirmed", description: "Confirmed" },
    step1B: { label: "I only heard it secondhand — unconfirmed", description: "Unconfirmed" },
    step2A: [
      { icon: "🏃", label: "Evacuate the break room immediately", description: "Leave the area right away" },
      { icon: "🔒", label: "Lockdown adjacent areas", description: "Secure nearby spaces" },
      { icon: "🛡️", label: "Defend if escape is blocked", description: "Fight back if cornered" },
    ],
    step2B: [
      { icon: "⏳", label: "Do not enter the break room", description: "Stay out of the area" },
      { icon: "📞", label: "Call security or management", description: "Notify authorities" },
      { icon: "📋", label: "Report what you heard", description: "Submit a report" },
    ],
    considerations: [
      "A box cutter held at the side rather than raised — does that change your urgency? Why or why not?",
      "Did the altercation involve two people you know? Does that affect how you responded?",
      "After evacuating, what is your responsibility to ensure others do not walk into the break room unaware?",
    ],
  },
  {
    id: 11,
    category: "Edged Weapon / Knife Attack",
    categoryNumber: 2,
    title: "Scenario 11",
    scenario: "A customer in a retail area becomes aggressive after a dispute. They pick up a box cutter from a display shelf and wave it in the air.",
    step1Question: "Is the threat confirmed or unconfirmed?",
    step1A: { label: "I can see the weapon being waved — confirmed", description: "Confirmed" },
    step1B: { label: "I only heard commotion from a distance — unconfirmed", description: "Unconfirmed" },
    step2A: [
      { icon: "🏃", label: "Evacuate the immediate area", description: "Leave the area right away" },
      { icon: "🔒", label: "Lockdown back-of-house areas", description: "Secure staff-only spaces" },
      { icon: "🛡️", label: "Defend if cornered", description: "Fight back if escape is blocked" },
    ],
    step2B: [
      { icon: "⏳", label: "Move to a safe vantage point", description: "Get to a safe position to observe" },
      { icon: "📞", label: "Alert a manager or security", description: "Notify authorities" },
      { icon: "📋", label: "Report what you observed", description: "Submit a report" },
    ],
    considerations: [
      "This threat originated from a product on your shelf. Does that change any protocols around accessible tools in your space?",
      "Customers and bystanders are in the area. How do you move people without causing a stampede or drawing the individual's attention to you?",
      "Once this person leaves the building, is the threat over? What follow-up is required?",
    ],
  },
  {
    id: 12,
    category: "Edged Weapon / Knife Attack",
    categoryNumber: 2,
    title: "Scenario 12",
    scenario: "An employee exits a stairwell and encounters a person standing still in the hallway holding a knife, staring at a closed office door.",
    step1Question: "Is the threat confirmed or unconfirmed?",
    step1A: { label: "I can see the knife — confirmed", description: "Confirmed" },
    step1B: { label: "It may be a utility knife — unconfirmed", description: "Unconfirmed" },
    step2A: [
      { icon: "🏃", label: "Retreat back into the stairwell quietly", description: "Silently go back" },
      { icon: "🔒", label: "Lockdown on another floor", description: "Secure a different floor" },
      { icon: "🛡️", label: "Defend if you are seen and approached", description: "Fight back if discovered" },
    ],
    step2B: [
      { icon: "⏳", label: "Retreat quietly and observe", description: "Pull back and watch" },
      { icon: "📞", label: "Call security immediately", description: "Notify authorities" },
      { icon: "🔒", label: "Lockdown as a precaution", description: "Secure your location while verifying" },
    ],
    considerations: [
      "The individual has not yet acted. That stillness and focus can be more dangerous than visible aggression — did that register for you?",
      "Someone is behind that closed office door. At what point does your responsibility to warn them override your need to stay hidden?",
      "What does your retreat look like if the stairwell door makes noise when closing?",
    ],
  },
  {
    id: 13,
    category: "Edged Weapon / Knife Attack",
    categoryNumber: 2,
    title: "Scenario 13",
    scenario: "During an outdoor shift change, a worker sees another individual brandish a knife in the adjacent parking lot before entering the building.",
    step1Question: "Is the threat confirmed or unconfirmed?",
    step1A: { label: "I saw it clearly — confirmed", description: "Confirmed" },
    step1B: { label: "It was dark and at a distance — unconfirmed", description: "Unconfirmed" },
    step2A: [
      { icon: "🔒", label: "Lockdown — prevent others from entering", description: "Secure the building" },
      { icon: "🚪", label: "Lockout (threat transitioning from external)", description: "Secure entry points" },
      { icon: "🏃", label: "Evacuate away from the entry point", description: "Exit away from the threat" },
      { icon: "🛡️", label: "Defend", description: "Prepare to defend" },
    ],
    step2B: [
      { icon: "📞", label: "Alert security and management immediately", description: "Notify authorities" },
      { icon: "🔒", label: "Lockdown as a precaution", description: "Secure your location while verifying" },
      { icon: "⏳", label: "Do not re-enter until confirmed clear", description: "Stay outside until safe" },
    ],
    considerations: [
      "Shift changes are predictable and high-density. Is this a vulnerability in your facility's security timing?",
      "If you are outside when this happens and others are still entering the building, how do you stop them without creating chaos?",
      "What is the fastest way to secure the entry point from the outside?",
    ],
  },
  {
    id: 14,
    category: "Edged Weapon / Knife Attack",
    categoryNumber: 2,
    title: "Scenario 14",
    scenario: "A disgruntled former employee is seen on a security feed entering through a side door. A co-worker reports they appeared to be concealing something under their clothing.",
    step1Question: "Is the threat confirmed or unconfirmed?",
    step1A: { label: "Their presence alone is a known risk — treat as confirmed", description: "Confirmed" },
    step1B: { label: "They may have been let back in for a legitimate reason — unconfirmed", description: "Unconfirmed" },
    step2A: [
      { icon: "🔒", label: "Lockdown", description: "Secure your location immediately" },
      { icon: "🏃", label: "Evacuate away from that wing", description: "Exit away from the threat" },
      { icon: "🛡️", label: "Defend", description: "Prepare to defend" },
    ],
    step2B: [
      { icon: "📞", label: "Alert security to intercept immediately", description: "Notify security" },
      { icon: "🔒", label: "Lockdown as a precaution", description: "Secure your location while verifying" },
      { icon: "⏳", label: "Monitor and do not approach", description: "Watch without engaging" },
    ],
    considerations: [
      "How was a former employee able to access a side door? What does this reveal about access credential management?",
      "Does your organization maintain a record of individuals who pose a potential risk, and is that list accessible to security in real time?",
      "If the individual is intercepted and it is a misunderstanding, how is that handled without legal exposure?",
    ],
  },
// ─── CATEGORY 3: Physical Assault / Hands-On Violence ────────────────────
  {
    id: 15,
    category: "Physical Assault / Hands-On Violence",
    categoryNumber: 3,
    title: "Scenario 15",
    scenario: "An argument between two employees escalates rapidly. One shoves the other into a wall and raises their fist.",
    step1Question: "Is the threat confirmed or unconfirmed?",
    step1A: { label: "I am watching it happen — confirmed", description: "Confirmed" },
    step1B: { label: "I heard it from another room — unconfirmed", description: "Unconfirmed" },
    step2A: [
      { icon: "🏃", label: "Evacuate the immediate area", description: "Leave the area right away" },
      { icon: "📞", label: "Call security or emergency services", description: "Notify authorities" },
      { icon: "🛡️", label: "Defend if you or others are directly threatened", description: "Fight back if necessary" },
    ],
    step2B: [
      { icon: "⏳", label: "Do not enter the area", description: "Stay out of the area" },
      { icon: "📞", label: "Alert a manager or security", description: "Notify authorities" },
      { icon: "📋", label: "Report what you heard", description: "Submit a report" },
    ],
    considerations: [
      "Did you know either of the employees involved? How did that affect your instinct to intervene or stay back?",
      "What is the difference between separating a fight and defending yourself? Where is that line?",
      "After the situation is contained, what documentation needs to happen and who is responsible for it?",
    ],
  },
  {
    id: 16,
    category: "Physical Assault / Hands-On Violence",
    categoryNumber: 3,
    title: "Scenario 16",
    scenario: "A customer becomes enraged at a service desk and grabs an employee by the collar, pulling them across the counter.",
    step1Question: "Is the threat confirmed or unconfirmed?",
    step1A: { label: "I can see it happening — confirmed", description: "Confirmed" },
    step1B: { label: "I heard yelling but did not see contact — unconfirmed", description: "Unconfirmed" },
    step2A: [
      { icon: "🏃", label: "Evacuate others from the immediate area", description: "Move people away" },
      { icon: "🛡️", label: "Defend the employee being grabbed", description: "Intervene to help" },
      { icon: "📞", label: "Call emergency services", description: "Notify authorities" },
    ],
    step2B: [
      { icon: "⏳", label: "Move closer safely to assess", description: "Approach carefully to see" },
      { icon: "📞", label: "Alert security", description: "Notify security" },
      { icon: "📋", label: "Report what you heard", description: "Submit a report" },
    ],
    considerations: [
      "The service desk employee is the one being harmed. Does your role — bystander, colleague, manager — change your obligation to act?",
      "What is the fastest way to create distance between the employee and the customer without escalating the physical contact further?",
      "What support does the employee need immediately after the incident, beyond a security report?",
    ],
  },
  {
    id: 17,
    category: "Physical Assault / Hands-On Violence",
    categoryNumber: 3,
    title: "Scenario 17",
    scenario: "A manager walking to their car after a late shift is approached aggressively by an unknown individual who grabs their bag and shoves them to the ground.",
    step1Question: "Is the threat confirmed or unconfirmed?",
    step1A: { label: "This is happening to me right now — confirmed", description: "Confirmed — Personal" },
    step1B: { label: "I witnessed it happening to someone else at a distance — unconfirmed", description: "Witnessed" },
    step2A: [
      { icon: "🏃", label: "Evacuate — get to safety immediately", description: "Escape to safety" },
      { icon: "🛡️", label: "Defend if you cannot escape", description: "Fight back if cornered" },
      { icon: "📞", label: "Call emergency services when safe", description: "Call for help once safe" },
    ],
    step2B: [
      { icon: "📞", label: "Call emergency services immediately", description: "Notify authorities" },
      { icon: "⏳", label: "Do not approach — observe and report", description: "Watch and document" },
      { icon: "🛡️", label: "Intervene only if it is safe to do so", description: "Help only if safe" },
    ],
    considerations: [
      "Parking lots after hours are consistent high-risk environments. Does your organization have a protocol for late-shift employees leaving alone?",
      "If this happened to you, would you know where the nearest camera or call station is in your parking area?",
      "After this event, what organizational changes to lot lighting, escort policy, or parking access would you recommend?",
    ],
  },
  {
    id: 18,
    category: "Physical Assault / Hands-On Violence",
    categoryNumber: 3,
    title: "Scenario 18",
    scenario: "During a shift change handoff, an employee is cornered in a storage room by a coworker who has been making escalating threats for weeks. The door is blocked.",
    step1Question: "Is the threat confirmed or unconfirmed?",
    step1A: { label: "I am the person cornered — confirmed", description: "Confirmed — Personal" },
    step1B: { label: "I was told about it after the fact — unconfirmed", description: "Reported After" },
    step2A: [
      { icon: "🛡️", label: "Defend", description: "Fight back to protect yourself" },
      { icon: "🏃", label: "Evacuate if a path becomes available", description: "Escape if possible" },
      { icon: "📞", label: "Call for help if you have your phone", description: "Call for assistance" },
    ],
    step2B: [
      { icon: "📋", label: "Report anonymously", description: "Submit an anonymous report" },
      { icon: "📞", label: "Report to HR or management", description: "Notify HR or management" },
      { icon: "⏳", label: "Follow up to ensure the employee is safe", description: "Check on the employee" },
    ],
    considerations: [
      "Escalating threats were reported in the weeks prior. At what point did the organization's response fail — and what was the missed intervention?",
      "Storage rooms and isolated spaces are high-risk encounter zones. Is there a policy about employees being in isolated spaces alone with someone who has made prior threats?",
      "If you were the cornered employee, did you have your phone accessible and was emergency contact information readily available?",
    ],
  },
  {
    id: 19,
    category: "Physical Assault / Hands-On Violence",
    categoryNumber: 3,
    title: "Scenario 19",
    scenario: "A visitor to the office becomes increasingly hostile in a conference room, stands up abruptly, and throws a chair toward the door.",
    step1Question: "Is the threat confirmed or unconfirmed?",
    step1A: { label: "I am in or near the room — confirmed", description: "Confirmed" },
    step1B: { label: "I only heard a loud crash — unconfirmed", description: "Unconfirmed" },
    step2A: [
      { icon: "🏃", label: "Evacuate the conference room", description: "Leave the room immediately" },
      { icon: "🔒", label: "Lockdown adjacent offices", description: "Secure nearby offices" },
      { icon: "🛡️", label: "Defend if blocked", description: "Fight back if escape is blocked" },
    ],
    step2B: [
      { icon: "⏳", label: "Do not enter the area", description: "Stay out of the area" },
      { icon: "📞", label: "Alert security", description: "Notify security" },
      { icon: "🔒", label: "Lockdown as a precaution", description: "Secure your location while verifying" },
    ],
    considerations: [
      "Visitors typically have not been briefed on emergency procedures. Who is responsible for managing and directing a visitor during an incident they themselves created?",
      "Conference rooms often have limited exits. Before your next meeting with an unknown visitor, do you know your exit options?",
      "What signals in the visitor's behavior prior to standing up should have prompted earlier de-escalation or security presence?",
    ],
  },
  {
    id: 20,
    category: "Physical Assault / Hands-On Violence",
    categoryNumber: 3,
    title: "Scenario 20",
    scenario: "Two individuals in the waiting area begin a physical fight. Other customers and employees are nearby and it is escalating quickly.",
    step1Question: "