# SafeGuard MVP Workplace Violence Liability Assessment Engine

**Version:** 1.0 — MVP  
**Status:** Logic complete, UI pending  
**File:** `shared/assessmentEngine.ts`

> This assessment is a preliminary workplace violence liability scan designed to identify potential gaps and areas of exposure. It is not a formal audit or legal determination of compliance.

---

## Overview

The SafeGuard MVP Assessment Engine is a structured scoring system that evaluates an organization's workplace violence prevention readiness across four categories. It is designed to power two delivery modes simultaneously:

**Mode 1 — Self-Serve UI (future):** A digital questionnaire where users answer 13 questions and receive an instant scored report.

**Mode 2 — Facilitator-Led Liability Scan (immediate use):** A structured conversation guide where an advisor walks a prospect through the same 13 questions and uses the Advisor Summary output to frame the findings in plain, direct language during demos and sales conversations.

Both modes use the same underlying engine and produce identical data — only the output format differs.

---

## Assessment Structure

The engine covers 13 questions across 4 categories. The maximum raw score is 26 (13 × 2). All final scores are normalized to a 0–100 scale.

| Category | Questions | Max Raw Score | Weight |
|---|---|---|---|
| Policy & Documentation | 4 | 8 | 31% |
| Training & Awareness | 3 | 6 | 23% |
| Reporting & Tracking | 3 | 6 | 23% |
| Response & Continuous Improvement | 3 | 6 | 23% |
| **Total** | **13** | **26** | **100%** |

---

## Scoring Model

Each question accepts one of three answer values:

| Answer | Points |
|---|---|
| Yes | 2 |
| Partial | 1 |
| No | 0 |

**Normalization formula:** `readinessScore = round((rawScore / 26) × 100)`

### Risk Classification Thresholds

| Score Range | Classification | Meaning |
|---|---|---|
| 80–100 | **Strong / Defensible** | Foundational program elements are in place. Organization can demonstrate due diligence. |
| 50–79 | **Moderate / Gaps Present** | Some elements exist but identifiable gaps create exposure. Commonly flagged in post-incident reviews. |
| 0–49 | **High Exposure** | Significant gaps across multiple areas. Limited defensibility if an incident occurs. |

---

## Full Question Set

### Category 1: Policy & Documentation

| ID | Question | Tags | Rationale |
|---|---|---|---|
| pd_01 | Do you have a written workplace violence prevention plan or policy? | Documentation | A written policy is the foundational requirement under OSHA General Duty Clause and most provincial legislation. Its absence is the single most common finding in post-incident reviews. |
| pd_02 | Have you completed a documented risk assessment specific to your workplace? | Documentation, RiskAssessment | A site-specific risk assessment demonstrates due diligence and is required under most Canadian provincial OHS regulations and recommended under OSHA guidelines. |
| pd_03 | Are your workplace violence policies reviewed and updated at least annually? | Documentation, ContinuousImprovement | Outdated policies are treated as equivalent to no policy in regulatory reviews. Annual review demonstrates active program management. |
| pd_04 | Are employees formally notified of the workplace violence prevention policy (e.g., signed acknowledgement, onboarding)? | Documentation, Training | Documented employee acknowledgement closes a common liability gap — organizations cannot demonstrate awareness without a record. |

### Category 2: Training & Awareness

| ID | Question | Tags | Rationale |
|---|---|---|---|
| ta_01 | Are employees trained on how to recognize warning signs and respond to workplace violence? | Training | Recognition and response training is the most direct line of defense. Untrained staff are both a safety risk and a liability exposure. |
| ta_02 | Is training conducted on a recurring basis (not just at onboarding)? | Training, ContinuousImprovement | One-time training is consistently insufficient in regulatory reviews. Recurring training demonstrates an active, maintained program. |
| ta_03 | Are supervisors and managers trained on de-escalation and their specific responsibilities under the violence prevention policy? | Training, Response | Supervisors are the first line of response. Failure to train supervisors separately is a common gap that increases organizational liability. |

### Category 3: Reporting & Tracking

| ID | Question | Tags | Rationale |
|---|---|---|---|
| rt_01 | Do employees know how to report incidents, near-misses, and concerns related to workplace violence? | Reporting | Awareness of reporting channels is a prerequisite for any incident tracking system. If employees do not know how to report, incidents go unrecorded. |
| rt_02 | Are incidents and near-misses consistently documented and tracked in a centralized system? | Reporting, Documentation | Consistent documentation creates the evidentiary record needed to demonstrate due diligence. Inconsistent tracking is one of the most common post-incident findings. |
| rt_03 | Is there a process to protect employees from retaliation when reporting incidents or concerns? | Reporting, Documentation | Anti-retaliation protections are required under most OHS frameworks. Their absence suppresses reporting and creates secondary liability exposure. |

### Category 4: Response & Continuous Improvement

| ID | Question | Tags | Rationale |
|---|---|---|---|
| ri_01 | Do you have defined procedures for responding to a workplace violence incident (including escalation and emergency contacts)? | Response | Defined response procedures reduce harm and demonstrate organizational preparedness. Their absence is a critical gap in any post-incident review. |
| ri_02 | Are incidents reviewed after they occur, with corrective actions documented and followed up? | Response, ContinuousImprovement | Post-incident review and corrective action is the hallmark of a mature program. Failure to review incidents is evidence of systemic neglect. |
| ri_03 | Is there a process to support affected employees after a workplace violence incident (e.g., EAP referral, critical incident support)? | Response | Post-incident support is both a duty of care obligation and a factor in limiting secondary harm and workers' compensation exposure. |

---

## Sample Output: Moderate / Gaps Present

The following example uses a mixed response set where the organization has some foundational elements but clear gaps in documentation review, supervisor training, anti-retaliation, and post-incident processes.

**Responses used:**

| Question | Answer | Points |
|---|---|---|
| pd_01 | Yes | 2 |
| pd_02 | Partial | 1 |
| pd_03 | No | 0 |
| pd_04 | Partial | 1 |
| ta_01 | Yes | 2 |
| ta_02 | Partial | 1 |
| ta_03 | No | 0 |
| rt_01 | Yes | 2 |
| rt_02 | Partial | 1 |
| rt_03 | No | 0 |
| ri_01 | Partial | 1 |
| ri_02 | No | 0 |
| ri_03 | Partial | 1 |
| **Total** | | **12 / 26** |

**Readiness Score:** 46 → **High Exposure** *(normalized: round(12/26 × 100) = 46)*

> **Note:** This example illustrates that a mix of "yes" and "partial" answers with several "no" responses can still result in High Exposure, reinforcing the importance of addressing gaps systematically.

### Readiness Score: 46 / 100 — High Exposure

**Category Breakdown:**

| Category | Score | Normalized |
|---|---|---|
| Policy & Documentation | 4 / 8 | 50% |
| Training & Awareness | 3 / 6 | 50% |
| Reporting & Tracking | 3 / 6 | 50% |
| Response & Continuous Improvement | 2 / 6 | 33% |

**Top Gaps (prioritized by severity):**

1. Policy review not conducted annually (pd_03 — No) — *Documentation, ContinuousImprovement*
2. Supervisor training not in place (ta_03 — No) — *Training, Response*
3. No anti-retaliation reporting process (rt_03 — No) — *Reporting, Documentation*
4. Post-incident review not formalized (ri_02 — No) — *Response, ContinuousImprovement*
5. Risk assessment only partially completed (pd_02 — Partial) — *Documentation, RiskAssessment*

**Liability Interpretation:**

> Based on your responses, your organization has significant gaps across multiple program areas. The absence of documented Documentation, ContinuousImprovement, Training represents substantial liability exposure. Organizations in this position are at elevated risk of regulatory findings, civil liability, and reputational harm following a workplace violence incident. Immediate action to establish foundational program elements is strongly recommended.

**Recommended Next Steps:**

1. Develop or update a written workplace violence prevention policy and ensure all employees receive and acknowledge it.
2. Establish a post-incident review process with documented corrective actions and annual policy review cycles.
3. Implement recurring workplace violence awareness and response training for all staff, with separate supervisor-level training.
4. Establish a clear, accessible incident and near-miss reporting process and communicate it to all employees.
5. Conduct a documented, site-specific workplace violence risk assessment and record findings.

---

## Sample Output: Strong / Defensible

**Scenario:** All questions answered "Yes."

**Readiness Score:** 100 / 100 — **Strong / Defensible**

**Liability Interpretation:**

> Based on your responses, your organization has strong foundational elements in place across policy, training, reporting, and response. Your current program positions you well from a defensibility standpoint. Continue to review and update your program annually to sustain this standard.

**Advisor Summary:**

> "Based on what you've shared, you're in a strong position — your score of 100 puts you in the Defensible range. You've got the foundational elements in place, which is genuinely uncommon. The priority now is keeping the program current and making sure documentation stays consistent."

---

## Advisor Summary Mode

The Advisor Summary is a spoken-language version of the output, written as if delivered verbally by a consultant during a discovery or demo conversation. It uses the same data as the standard output but frames findings in direct, conversational language.

### Advisor Summary — High Exposure (Score: 46)

> "Based on what you've shared, I want to be direct with you — your score of 46 puts you in a High Exposure position. That means there are significant gaps across multiple areas of your program. The most critical areas right now are documentation and continuous improvement. Without addressing these, your organization has limited defensibility if a workplace violence incident occurs. The good news is that these are fixable — but they need to be prioritized."

### Advisor Summary — Moderate / Gaps Present (Score: 62)

> "Based on what you've shared, you're currently in a Moderate Risk position — your score is 62. You've got some good foundations, but there are gaps that could create real exposure if something happens. The biggest gaps I see are around incident tracking and formal risk assessment. The categories where I see the most room to improve are Reporting & Tracking and Response & Continuous Improvement. That's typically where organizations run into issues when incidents are reviewed — either by regulators or in litigation."

### Advisor Summary — Strong / Defensible (Score: 88)

> "Based on what you've shared, you're in a strong position — your score of 88 puts you in the Defensible range. You've got the foundational elements in place, which is genuinely uncommon. The one area I'd keep an eye on is documentation — that's where even strong programs sometimes have gaps that surface under scrutiny."

---

## Data Structure for Future Integration

The engine's output is structured to support CRM tagging, category-level analytics, and future industry overlays. The `crmPayload` field is designed for direct integration with VibeSuite or similar CRM systems.

### CRM Payload Schema

```typescript
interface CrmPayload {
  readinessScore: number;           // 0–100 normalized score
  riskClassification: string;       // "Strong / Defensible" | "Moderate / Gaps Present" | "High Exposure"
  categoryScores: {
    policy_documentation: number;   // 0–100 normalized
    training_awareness: number;
    reporting_tracking: number;
    response_improvement: number;
  };
  topGapIds: string[];              // e.g., ["pd_03", "ta_03", "rt_03"]
  exposureTags: string[];           // e.g., ["Documentation", "Training", "Reporting"]
  assessedAt: string;               // ISO 8601 timestamp
}
```

### Example CRM Payload (High Exposure scenario)

```json
{
  "readinessScore": 46,
  "riskClassification": "High Exposure",
  "categoryScores": {
    "policy_documentation": 50,
    "training_awareness": 50,
    "reporting_tracking": 50,
    "response_improvement": 33
  },
  "topGapIds": ["pd_03", "ta_03", "rt_03", "ri_02", "pd_02"],
  "exposureTags": ["Documentation", "ContinuousImprovement", "Training", "Response", "Reporting", "RiskAssessment"],
  "assessedAt": "2026-04-10T16:00:00.000Z"
}
```

### Tag Reference

| Tag | Maps To | CRM Use |
|---|---|---|
| Documentation | Policy & Documentation gaps | Trigger "Policy Development" nurture sequence |
| RiskAssessment | Missing site-specific assessment | Flag for "Risk Assessment" service offering |
| Training | Training gaps | Trigger "Training" product sequence |
| Reporting | Reporting system gaps | Flag for "Incident Tracking" feature demo |
| Response | Response procedure gaps | Trigger "EAP / Response Planning" sequence |
| ContinuousImprovement | Review cycle gaps | Flag for "Program Audit" service offering |

### Future Industry Overlay Hook

The `runAssessment()` function accepts an optional `industryKey` parameter (e.g., `"healthcare"`, `"retail"`, `"manufacturing"`). In a future version, this will:

1. Apply industry-specific question weighting (e.g., weight `ta_03` supervisor training higher for healthcare)
2. Append industry-specific gap context to the Liability Interpretation
3. Map top gaps to the matching `controls_and_procedures` entries from `industryOverlayContent.ts`

---

## Facilitator Guide: Running a Liability Scan Conversation

The following script is designed for use in a 15–20 minute discovery or demo conversation. The advisor asks each question verbally, records the answer, and uses the Advisor Summary output to close the conversation.

**Opening:**
> "I'd like to walk you through a quick liability scan — 13 questions, takes about 10 minutes. At the end I'll give you a plain-language summary of where you stand. This isn't a formal audit — it's a way to identify where the gaps are before something happens."

**For each question, use the question text directly.** If the prospect is unsure, prompt: *"Would you say that's fully in place, partially in place, or not yet?"* — this maps directly to Yes / Partial / No.

**Closing (use Advisor Summary):**
Deliver the Advisor Summary verbatim or paraphrase it. Then:
> "Based on what I'm seeing, the priority areas for you are [top 2 gaps]. That's where I'd focus first. Would it be useful to walk through what addressing those would look like?"

---

## Disclaimer

This assessment is a preliminary workplace violence liability scan designed to identify potential gaps and areas of exposure. It is not a formal audit or legal determination of compliance.
