# SafeGuard — Liability Exposure Scan: Scoring & Classification Logic

**Document Type:** Technical Reference  
**Module:** `shared/assessmentEngine.ts`  
**Version:** v3 (Liability-First)  
**Last Updated:** April 2026

---

## Overview

The Liability Exposure Scan uses a **liability-first, deduction-based scoring model**. The score starts at 100 and points are subtracted for each missing workplace safety control. The final score determines a classification band that reflects the organization's defensibility posture in the event of a workplace violence incident, regulatory review, or civil litigation.

This document covers:
1. The total score calculation function
2. How each question answer is evaluated (YES/NO logic)
3. Where weights are applied
4. Conditional multipliers and co-occurrence penalties
5. The final classification logic
6. Category score calculation
7. Default values and fallbacks
8. Sample reference responses

---

## 1. Total Score Calculation

**Function:** `runAssessment()` in `shared/assessmentEngine.ts`

```ts
runAssessment(
  answers: Record<string, AnswerValue>,  // { q1: "yes" | "no", q2: "yes" | "no", ... }
  industry: string,
  jurisdiction: string
): AssessmentOutput
```

The function executes the following steps in order:

1. Start score at 100.
2. Subtract `question.weight` for every question answered `"no"` (or unanswered).
3. Apply conditional co-occurrence multipliers.
4. Apply score floor of 0.
5. Classify the score into a band.
6. Calculate per-category scores.
7. Build top gaps, interpretation, advisor summary, immediate action plan, and CRM payload.

---

## 2. YES/NO Evaluation Logic

```ts
let score = 100;
const missingIds = new Set<string>();

for (const q of QUESTIONS) {
  if (answers[q.id] !== "yes") {
    score -= q.weight;
    missingIds.add(q.id);
  }
}
```

**Rules:**
- The only passing answer is `"yes"`.
- An answer of `"no"` deducts the question's full weight.
- A missing/unanswered question (i.e., `answers[q.id]` is `undefined`) is treated identically to `"no"` — the condition `!== "yes"` catches both.
- There is no `"partial"` value or partial credit. Every question is binary.

---

## 3. Question Weights

Each question carries a `weight` value representing the number of points subtracted from 100 when that control is **not in place**. Questions are grouped into five categories.

### Category 1 — Planning & Documentation
**Maximum possible deduction: 60 points**

| Question ID | Control | Weight |
|---|---|---|
| q1 | Documented Workplace Violence Prevention Policy | 10 |
| q2 | Documented Active Threat / Active Shooter Response Plan | 20 |
| q3 | Emergency Action Plan (EAP) including active threat scenarios | 15 |
| q4 | Site-specific risk assessment conducted and documented | 15 |

### Category 2 — Training & Awareness
**Maximum possible deduction: 33 points**

| Question ID | Control | Weight |
|---|---|---|
| q5 | Employees trained to recognize pre-incident threat indicators | 10 |
| q6 | Employees trained in active threat response (lockdown/escape/defend) | 15 |
| q7 | Training conducted at onboarding and refreshed annually | 8 |

### Category 3 — Reporting, Escalation & Communication
**Maximum possible deduction: 30 points**

| Question ID | Control | Weight |
|---|---|---|
| q8 | Formal process for reporting threats and suspicious behavior | 10 |
| q9 | Incidents and near-misses consistently documented and tracked | 8 |
| q10 | Real-time emergency communication or alert system in place | 12 |

### Category 4 — Response Readiness & Continuous Improvement
**Maximum possible deduction: 23 points**

| Question ID | Control | Weight |
|---|---|---|
| q11 | Active threat or emergency drills conducted 1–2 times annually | 10 |
| q12 | Drills documented and reviewed for performance improvement | 5 |
| q13 | Roles and responsibilities clearly defined during emergency response | 8 |

### Category 5 — Critical Risk Factors
**Maximum possible deduction: 16 points**

| Question ID | Control | Weight |
|---|---|---|
| q14 | Domestic violence spillover risks identified and managed | 10 |
| q15 | Leadership actively connects safety to employee wellbeing and culture | 6 |

**Total maximum deduction from weights alone: 162 points.**  
The score is floored at 0 (see Section 5), so a score of 0 is the minimum regardless of total deductions.

---

## 4. Conditional Multipliers / Co-Occurrence Penalties

After all per-question deductions are applied, three additional penalties are evaluated based on **combinations of missing controls**. These reflect compounded risk when related systems are absent together.

```ts
const atPlanMissing    = missingIds.has("q2");   // No Active Threat Response Plan
const trainingMissing  = missingIds.has("q6");   // No active threat response training
const reportingMissing = missingIds.has("q8");   // No formal threat reporting process
const dvMissing        = missingIds.has("q14");  // No domestic violence spillover protocol
const drillsMissing    = missingIds.has("q11");  // No active threat drills
const rolesUnclear     = missingIds.has("q13");  // Undefined emergency roles

if (atPlanMissing && trainingMissing)   score -= 10;  // Penalty: No plan AND no training
if (reportingMissing && dvMissing)      score -= 10;  // Penalty: No reporting AND no DV protocol
if (drillsMissing && rolesUnclear)      score -= 5;   // Penalty: No drills AND undefined roles
```

**Multiplier summary:**

| Condition | Additional Deduction | Rationale |
|---|---|---|
| q2 missing AND q6 missing | −10 | No plan + no training = complete active threat preparedness failure |
| q8 missing AND q14 missing | −10 | No reporting + no DV protocol = highest-risk escalation pathway unaddressed |
| q11 missing AND q13 missing | −5 | No drills + undefined roles = no operational readiness whatsoever |

All three penalties are independent and **additive** — all three can fire simultaneously for a maximum additional deduction of **25 points**.

---

## 5. Score Floor

```ts
score = Math.max(0, score);
```

The score cannot go below 0 regardless of total deductions. This applies after all per-question deductions and co-occurrence penalties have been applied.

---

## 6. Classification Logic

```ts
export function classify(score: number): ClassificationLabel {
  if (score <= 40) return "Severe Exposure";
  if (score <= 65) return "High Exposure";
  if (score <= 85) return "Moderate Exposure";
  return "Defensible Position";         // score > 85
}
```

**Classification bands:**

| Score Range | Classification | Risk Color | Descriptor |
|---|---|---|---|
| 0 – 40 | Severe Exposure | Red | Significant liability exposure across multiple critical areas |
| 41 – 65 | High Exposure | Orange | Elevated exposure with critical gaps requiring immediate attention |
| 66 – 85 | Moderate Exposure | Yellow | Manageable exposure with identifiable improvement areas |
| 86 – 100 | Defensible Position | Green | Defensible with ongoing maintenance required |

---

## 7. Category Score Calculation

Each of the four primary scored categories produces an independent percentage score. The **Critical Risk Factors** category (q14, q15) is used for gap identification and the overall score, but is **not** included in the `CategoryScores` object returned in the output.

```ts
categoryScore = Math.round(
  (sum_of_weights_for_questions_answered_yes_in_category
    / category_maximum_weight) * 100
)
```

**Category maximums used as denominators:**

| Category | Max Weight (Denominator) |
|---|---|
| Planning & Documentation | 60 |
| Training & Awareness | 33 |
| Reporting & Communication | 30 |
| Response Readiness | 23 |

**Example:** If q1 (weight 10) and q2 (weight 20) are answered "yes" but q3 (15) and q4 (15) are "no", the Planning & Documentation score is `Math.round((10 + 20) / 60 * 100)` = **50**.

---

## 8. Default Values and Fallbacks

| Scenario | Behavior |
|---|---|
| Question not present in `answers` map | Treated as `"no"` — full weight deducted |
| `industry` is empty or `"Other"` | Industry context omitted from interpretation text |
| `jurisdiction` is empty | Location context omitted from advisor summary |
| All questions answered "yes" | Score = 100, classification = Defensible Position |
| All questions answered "no" + all multipliers fire | Score = max(0, 100 − 162 − 25) = 0, classification = Severe Exposure |
| `immediateActionPlan` with no missing questions | Returns 3 maintenance-focused default actions |

---

## 9. CRM Payload Format

The `runAssessment()` function returns a `crmPayload` field in the exact format required for VibeSuite / CRM integration:

```json
{
  "score": 72,
  "classification": "Moderate Exposure",
  "riskLevel": "yellow",
  "topGaps": [
    {
      "gap": "Do you have a documented Active Threat / Active Shooter Response Plan?",
      "status": "Not in Place",
      "impact": "The absence of an active threat plan is among the most significant liability exposures..."
    }
  ],
  "categoryScores": {
    "planningDocumentation": 83,
    "trainingAwareness": 76,
    "reportingCommunication": 100,
    "responseReadiness": 57
  },
  "industry": "Healthcare",
  "jurisdiction": "Ontario",
  "recommendedActions": [
    "Develop and formalize a Workplace Violence Prevention Policy and Active Threat Response Plan..."
  ]
}
```

**Top gaps** are sorted by question weight (descending) and capped at 5 items. All gaps carry `status: "Not in Place"` in the current version.

---

## 10. Sample Reference Responses

Three reference answer sets are exported from the engine for testing and demos:

### Defensible Position (score = 100)
All 15 questions answered `"yes"`. No deductions, no multipliers.

```ts
SAMPLE_RESPONSES_DEFENSIBLE = {
  q1: "yes", q2: "yes", q3: "yes", q4: "yes",
  q5: "yes", q6: "yes", q7: "yes",
  q8: "yes", q9: "yes", q10: "yes",
  q11: "yes", q12: "yes", q13: "yes",
  q14: "yes", q15: "yes",
}
// Score: 100 → Defensible Position
```

### High Exposure (score = 63)
Questions q7, q9, q11, q12, q15 answered `"no"`.  
Deductions: 8 + 8 + 10 + 5 + 6 = 37. No multipliers fire.

```ts
SAMPLE_RESPONSES_MODERATE = {
  q1: "yes", q2: "yes", q3: "yes", q4: "yes",
  q5: "yes", q6: "yes", q7: "no",
  q8: "yes", q9: "no",  q10: "yes",
  q11: "no", q12: "no", q13: "yes",
  q14: "yes", q15: "no",
}
// Score: 100 − 37 = 63 → High Exposure
```

### Severe Exposure (score = 0)
All 15 questions answered `"no"`. All three multipliers fire.  
Deductions: 162 (weights) + 25 (multipliers) = 187. Floored at 0.

```ts
SAMPLE_RESPONSES_HIGH_EXPOSURE = {
  q1: "no", q2: "no", q3: "no", q4: "no",
  q5: "no", q6: "no", q7: "no",
  q8: "no", q9: "no", q10: "no",
  q11: "no", q12: "no", q13: "no",
  q14: "no", q15: "no",
}
// Score: max(0, 100 − 187) = 0 → Severe Exposure
```

---

## 11. Complete Scoring Flow Summary

```
answers (Record<string, "yes" | "no">)
  │
  ▼
Start: score = 100
  │
  ▼
For each of 15 questions:
  └─ if answers[q.id] !== "yes" → score -= q.weight
  │                               add q.id to missingIds
  │
  ▼
Co-occurrence penalties:
  └─ q2 missing AND q6 missing   → score -= 10
  └─ q8 missing AND q14 missing  → score -= 10
  └─ q11 missing AND q13 missing → score -= 5
  │
  ▼
score = Math.max(0, score)
  │
  ▼
classify(score):
  ├─ score <= 40  → "Severe Exposure"
  ├─ score <= 65  → "High Exposure"
  ├─ score <= 85  → "Moderate Exposure"
  └─ score > 85   → "Defensible Position"
  │
  ▼
Build category scores, top gaps, interpretation,
advisor summary, immediate action plan, CRM payload
  │
  ▼
Return AssessmentOutput
```

---

*This document reflects the engine as implemented in `shared/assessmentEngine.ts`. Any changes to weights, thresholds, or multipliers must be updated here to maintain accuracy.*
