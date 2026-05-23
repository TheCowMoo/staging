/**
 * gapMap.ts — Single source of truth for gap → service mapping
 *
 * Every assessment question that can produce a liability gap is mapped here.
 * This file drives:
 *   1. Advisor Insight (dynamic headline + bullets)
 *   2. Services Section ("Directly Addresses" + "Why This Is Required")
 *   3. PDF Report ("System Misalignment Identified" section)
 *   4. Service Prioritization Engine
 *
 * IMPORTANT: Question IDs and titles MUST match assessmentEngine.ts exactly.
 * Last synced: 2026-05 (16-question engine, q1–q16)
 *
 * Question map (current engine):
 *   q1  — Workplace Violence Prevention Policy
 *   q2  — Emergency Action Plan (EAP) with active threat procedures
 *   q3  — Site-specific risk assessment
 *   q4  — Threat recognition training (pre-incident indicators)
 *   q5  — Active threat response training (lockdown/lockout/escape/defend)
 *   q6  — Training frequency (onboarding + defined schedule)
 *   q7  — Internal reporting process for suspicious behavior
 *   q8  — Incident and near-miss documentation
 *   q9  — Anonymous/formal threat reporting mechanism (multi-option)
 *   q10 — Real-time alert / notification system (multi-option, CRITICAL)
 *   q11 — Emergency/active threat drills (regular, defined basis)
 *   q12 — Drill documentation and after-action review
 *   q13 — Defined roles and responsibilities during emergency
 *   q14 — Domestic violence / external personal threat management
 *   q15 — Threat assessment / behavioral intervention process (BIT)
 *   q16 — Insider threat measures (risk indicators, reporting, intervention)
 */

export type RiskLevel = "Critical" | "High" | "Moderate";
export type LiabilityImpact = "Operational Failure" | "Legal Exposure" | "Both";
export type ServiceKey =
  | "full-liability-assessment"
  | "site-specific-plan-development"
  | "training-drill-implementation";

export interface GapDefinition {
  /** Matches Question.id in assessmentEngine.ts */
  gap_id: string;
  gap_title: string;
  risk_level: RiskLevel;
  liability_impact: LiabilityImpact;
  /** Primary service that resolves this gap */
  recommended_service: ServiceKey;
  consequence_if_unresolved: string;
  defensibility_outcome_if_resolved: string;
}

export const GAP_MAP: GapDefinition[] = [
  // ── Planning & Documentation (q1–q3) ─────────────────────────────────────
  {
    gap_id: "q1",
    gap_title: "No documented Workplace Violence Prevention Policy",
    risk_level: "High",
    liability_impact: "Legal Exposure",
    recommended_service: "full-liability-assessment",
    consequence_if_unresolved:
      "Organization fails to meet the standard of due diligence to prevent workplace violence — a foundational element in civil liability defense.",
    defensibility_outcome_if_resolved:
      "Documented policy establishes the organization's commitment to prevention and satisfies the threshold for due diligence in regulatory and civil review.",
  },
  {
    gap_id: "q2",
    gap_title: "No documented Emergency Action Plan (EAP) with active threat procedures",
    risk_level: "Critical",
    liability_impact: "Both",
    recommended_service: "site-specific-plan-development",
    consequence_if_unresolved:
      "The absence of a documented EAP with active threat procedures is among the most significant liability exposures. OSHA 29 CFR 1910.38 requires a written EAP; post-incident reviews consistently cite this gap as evidence of institutional failure to protect.",
    defensibility_outcome_if_resolved:
      "A documented EAP with active threat scenarios demonstrates that the organization anticipated foreseeable risks and established a structured response — the legal standard for reasonable care.",
  },
  {
    gap_id: "q3",
    gap_title: "No site-specific risk assessment conducted or documented",
    risk_level: "Critical",
    liability_impact: "Both",
    recommended_service: "full-liability-assessment",
    consequence_if_unresolved:
      "Without a documented site-specific risk assessment, the organization cannot show it identified and evaluated foreseeable threats — a core element of negligence analysis and due diligence defense.",
    defensibility_outcome_if_resolved:
      "A formal, documented risk assessment creates a defensible record that the organization proactively identified and addressed its unique threat profile.",
  },
  // ── Training & Awareness (q4–q6) ─────────────────────────────────────────
  {
    gap_id: "q4",
    gap_title: "Employees not trained to recognize pre-incident threat indicators",
    risk_level: "High",
    liability_impact: "Both",
    recommended_service: "training-drill-implementation",
    consequence_if_unresolved:
      "Failure to train employees on threat recognition leaves the organization unable to demonstrate it took reasonable steps to prevent foreseeable harm. Post-incident litigation frequently cites this gap as evidence that warning signs were observable but unaddressed.",
    defensibility_outcome_if_resolved:
      "Documented threat recognition training demonstrates that the organization equipped its workforce to identify and report escalating risk before an incident occurs.",
  },
  {
    gap_id: "q5",
    gap_title: "Employees not trained in active threat response (lockdown/lockout, escape, defend)",
    risk_level: "Critical",
    liability_impact: "Both",
    recommended_service: "training-drill-implementation",
    consequence_if_unresolved:
      "Untrained employees in active threat scenarios increase exposure significantly. Post-incident litigation examines whether the organization provided actionable response training. Failure to do so results in increased exposure during regulatory enforcement and civil litigation.",
    defensibility_outcome_if_resolved:
      "Documented active threat response training directly reduces liability exposure by demonstrating that the organization actively prepared its workforce to execute plans under pressure.",
  },
  {
    gap_id: "q6",
    gap_title: "Training not conducted at onboarding or refreshed on a defined schedule",
    risk_level: "Moderate",
    liability_impact: "Legal Exposure",
    recommended_service: "training-drill-implementation",
    consequence_if_unresolved:
      "One-time or infrequent training without a defined refresh schedule is treated as an absence of sustained training. The organization fails to meet the regulatory standard for ongoing safety culture and is exposed when it cannot produce records of consistent reinforcement.",
    defensibility_outcome_if_resolved:
      "A documented training schedule with onboarding and recurring refresh cycles demonstrates ongoing commitment to preparedness and satisfies regulatory training frequency requirements.",
  },
  // ── Reporting & Communication (q7–q10) ───────────────────────────────────
  {
    gap_id: "q7",
    gap_title: "No clearly defined internal process for reporting suspicious behavior or security concerns",
    risk_level: "High",
    liability_impact: "Both",
    recommended_service: "site-specific-plan-development",
    consequence_if_unresolved:
      "Without a defined internal reporting chain, threat indicators have no pathway to supervisors or management. Post-incident reviews consistently find that employees observed warning signs but had no clear process for escalating them.",
    defensibility_outcome_if_resolved:
      "A documented internal reporting process demonstrates that the organization had a mechanism to identify and respond to escalating threats before they materialized.",
  },
  {
    gap_id: "q8",
    gap_title: "Incidents and near-misses not consistently documented or tracked",
    risk_level: "High",
    liability_impact: "Legal Exposure",
    recommended_service: "full-liability-assessment",
    consequence_if_unresolved:
      "Inconsistent documentation creates an evidentiary gap. In litigation, the inability to show a pattern of documented response suggests systemic negligence and an absence of organizational learning.",
    defensibility_outcome_if_resolved:
      "Consistent incident documentation creates a defensible paper trail demonstrating that the organization monitored, tracked, and responded to workplace safety concerns.",
  },
  {
    gap_id: "q9",
    gap_title: "No formal anonymous reporting mechanism for threats or concerning behavior",
    risk_level: "High",
    liability_impact: "Both",
    recommended_service: "site-specific-plan-development",
    consequence_if_unresolved:
      "Without an anonymous reporting mechanism, employees who observe threatening behavior may not report it due to fear of retaliation. This creates a systemic failure in early threat identification — the primary mechanism for preventing incidents before they occur.",
    defensibility_outcome_if_resolved:
      "A formal anonymous reporting mechanism demonstrates that the organization removed barriers to threat reporting and established an accessible, retaliation-free escalation pathway.",
  },
  {
    gap_id: "q10",
    gap_title: "No real-time emergency notification or alert system in place",
    risk_level: "Critical",
    liability_impact: "Both",
    recommended_service: "site-specific-plan-development",
    consequence_if_unresolved:
      "The absence of a real-time alert system means the organization fails to meet the infrastructure standard required to demonstrate employee protection capability during an active event. Delayed notification may be cited in post-incident litigation as evidence of inadequate preparedness.",
    defensibility_outcome_if_resolved:
      "A documented real-time alert system demonstrates operational readiness and satisfies the duty-to-warn standard in workplace violence prevention.",
  },
  // ── Response Readiness (q11–q13) ─────────────────────────────────────────
  {
    gap_id: "q11",
    gap_title: "Emergency or active threat drills not conducted on a regular, defined basis",
    risk_level: "High",
    liability_impact: "Both",
    recommended_service: "training-drill-implementation",
    consequence_if_unresolved:
      "Organizations that fail to produce drill records are treated as having no operational preparedness. Drills are the primary evidentiary standard that plans were tested and employees were equipped to respond — without them, the organization is exposed in both regulatory enforcement and civil litigation.",
    defensibility_outcome_if_resolved:
      "Documented drills demonstrate that the organization not only had plans in place but actively tested its workforce's ability to execute them.",
  },
  {
    gap_id: "q12",
    gap_title: "Drills not documented or reviewed for performance improvement",
    risk_level: "Moderate",
    liability_impact: "Legal Exposure",
    recommended_service: "training-drill-implementation",
    consequence_if_unresolved:
      "Undocumented drills carry no evidentiary weight in post-incident review. The organization fails to establish a record of operational readiness and continuous improvement — a standard required in regulatory defense and civil litigation.",
    defensibility_outcome_if_resolved:
      "After-action documentation of drills creates an auditable record of the organization's commitment to continuous preparedness improvement.",
  },
  {
    gap_id: "q13",
    gap_title: "Roles and responsibilities not clearly defined during emergency response",
    risk_level: "High",
    liability_impact: "Operational Failure",
    recommended_service: "site-specific-plan-development",
    consequence_if_unresolved:
      "Undefined roles during an emergency create confusion, delayed response, and direct liability. Regulators and courts examine whether the organization had a clear chain of command.",
    defensibility_outcome_if_resolved:
      "Documented role assignments demonstrate that the organization had a structured command and response framework aligned to its specific workforce and facility.",
  },
  // ── Critical Risk Factors (q14–q16) ──────────────────────────────────────
  {
    gap_id: "q14",
    gap_title: "Domestic violence or external personal threat risks not identified or managed",
    risk_level: "Critical",
    liability_impact: "Both",
    recommended_service: "full-liability-assessment",
    consequence_if_unresolved:
      "Domestic violence spillover is a leading cause of workplace homicide. Organizations that fail to identify and manage this risk when known face significant civil and regulatory exposure.",
    defensibility_outcome_if_resolved:
      "A documented domestic violence spillover protocol demonstrates awareness of a high-frequency risk category and establishes a proactive response framework.",
  },
  {
    gap_id: "q15",
    gap_title: "No defined process for identifying and managing individuals of concern (threat assessment / BIT)",
    risk_level: "High",
    liability_impact: "Both",
    recommended_service: "full-liability-assessment",
    consequence_if_unresolved:
      "Without a defined threat assessment or behavioral intervention process, the organization lacks a structured mechanism to identify and manage individuals who may pose a risk before an incident occurs. Post-incident reviews frequently examine whether warning signs were identified and acted upon.",
    defensibility_outcome_if_resolved:
      "A documented behavioral threat management process demonstrates that the organization had a structured, proactive mechanism to identify, assess, and intervene before an incident occurred.",
  },
  {
    gap_id: "q16",
    gap_title: "No measures in place to identify and prevent insider threats or internal violence",
    risk_level: "High",
    liability_impact: "Both",
    recommended_service: "full-liability-assessment",
    consequence_if_unresolved:
      "Insider threats and acts of internal violence are among the most preventable forms of workplace violence. Organizations without structured risk indicator monitoring, reporting pathways, and intervention protocols may face significant exposure when internal warning signs were present but unaddressed.",
    defensibility_outcome_if_resolved:
      "Documented insider threat measures demonstrate that the organization actively monitored internal risk indicators and had intervention protocols in place to address them before escalation.",
  },
];

/**
 * Get all gap definitions for a specific service key from an already-resolved gaps array.
 * Used by CTASection to show which gaps each service addresses.
 */
export function getGapsForService(
  resolvedGaps: Array<GapDefinition & { gap: string; status: string; impact: string }>,
  serviceKey: ServiceKey
): Array<GapDefinition & { gap: string; status: string; impact: string }> {
  return resolvedGaps.filter((g) => g.recommended_service === serviceKey);
}

/** Look up a gap definition by question ID. Returns undefined if not mapped. */
export function getGapDef(gapId: string): GapDefinition | undefined {
  return GAP_MAP.find((g) => g.gap_id === gapId);
}

/**
 * Get all gap definitions for a list of gap IDs (from AssessmentOutput.topGaps).
 * Preserves order and falls back to a minimal definition for unmapped IDs.
 */
export function resolveGaps(
  topGaps: Array<{ id: string; gap: string; impact: string; status: string }>
): Array<GapDefinition & { gap: string; status: string; impact: string }> {
  return topGaps.map((g) => {
    const def = getGapDef(g.id);
    if (def) {
      return { ...def, gap: g.gap, status: g.status, impact: g.impact };
    }
    // Fallback for unmapped IDs — use engine text directly
    return {
      gap_id: g.id,
      gap_title: g.gap,
      risk_level: "High" as RiskLevel,
      liability_impact: "Both" as LiabilityImpact,
      recommended_service: "full-liability-assessment" as ServiceKey,
      consequence_if_unresolved: g.impact,
      defensibility_outcome_if_resolved:
        "Addressing this gap will reduce liability exposure and strengthen the organization's defensibility posture.",
      gap: g.gap,
      status: g.status,
      impact: g.impact,
    };
  });
}

/**
 * Derive the highest-priority service recommendation from a set of resolved gaps.
 * Returns { service, rationale } where rationale explains why this service is the priority.
 * Priority order: site-specific-plan-development > full-liability-assessment > training-drill-implementation
 */
export function deriveServicePriority(
  gaps: Array<GapDefinition>
): { service: ServiceKey; rationale: string } {
  const priority: Record<ServiceKey, number> = {
    "site-specific-plan-development": 3,
    "full-liability-assessment": 2,
    "training-drill-implementation": 1,
  };
  let top: ServiceKey = "training-drill-implementation";
  for (const g of gaps) {
    if (priority[g.recommended_service] > priority[top]) {
      top = g.recommended_service;
    }
  }
  const rationales: Record<ServiceKey, string> = {
    "site-specific-plan-development":
      "Your results show critical gaps in documented plans and response procedures. A site-specific plan is the foundational document required before training or assessments can be defensible.",
    "full-liability-assessment":
      "Your results indicate gaps in risk identification and documentation. A full liability assessment establishes the evidentiary baseline required to build a defensible posture.",
    "training-drill-implementation":
      "Your planning and documentation framework is in place. The priority is now building and documenting employee readiness through structured training and drills.",
  };
  return { service: top, rationale: rationales[top] };
}

export const SERVICE_LABELS: Record<ServiceKey, string> = {
  "full-liability-assessment": "Full Liability Assessment",
  "site-specific-plan-development": "Site-Specific Plan Development",
  "training-drill-implementation": "Training & Drill Implementation",
};
