/**
 * aiContext.ts
 *
 * Centralized context builders for AI prompts.
 * Provides scoring methodology context to ensure LLM-generated
 * content is grounded in the actual audit scoring framework.
 */

import {
  CATEGORY_WEIGHTS,
  RISK_LEVELS,
  PRIORITY_ORDER,
  PRIORITY_LEVELS,
  AUDIT_CATEGORIES,
} from "../../shared/auditFramework";

/**
 * Build a compact scoring methodology context string.
 * Injected into AI prompts that reference scores, risk levels, or priorities
 * so the LLM understands what the numbers mean and can write authoritatively.
 */
export function buildScoringContext(): string {
  const categoryWeightLines = Object.entries(CATEGORY_WEIGHTS)
    .map(([name, weight]) => `${name} (${(weight * 100).toFixed(0)}%)`)
    .join(" · ");

  const riskLevelLines = RISK_LEVELS
    .map((r) => `${r.label} ${r.min}–${r.max}%`)
    .join(" → ");

  return `SCORING METHODOLOGY — This context explains what the audit scores mean:

• Each question is scored 0–3 per the decision-tree model:
  0 = Secure / No concern (condition is satisfied)
  1 = Minor concern or Unknown
  2 = Moderate concern
  3 = Serious vulnerability
  "Not Applicable" and "Unavoidable" (permanent structural constraint) are excluded from scoring.

• Category score = weighted percentage of total possible points (0–100%).
  Higher percentage = more exposure / weaker posture in that category.

• Risk thresholds by overall score percentage:
  ${riskLevelLines}

• Category weights that are applied to calculate the overall facility risk score:
  ${categoryWeightLines}

• Priority-to-timeframe mapping for corrective actions:
  Score 3 (Serious) → ${PRIORITY_LEVELS["Critical"] ?? "Immediate"}
  Score 2 (Moderate) → ${PRIORITY_LEVELS["High"] ?? "30 Day"}
  Score 1 (Minor) → ${PRIORITY_LEVELS["Elevated"] ?? "90 Day"}
  Score 0 → No action needed

• "Unavoidable" findings are permanent structural constraints (e.g., a load-bearing
  column blocking sightlines). Do NOT recommend eliminating them — recommend
  compensating controls (mirrors, cameras, increased patrols) instead.

• Polarity rules: positive-polarity questions ("Is security good?") score higher when
  answered "No". Negative-polarity questions ("Is there a vulnerability?") score
  higher when answered "Yes". The LLM should use the raw scores semantically —
  a high-scoring positive question means a gap exists; a high-scoring negative
  question confirms a vulnerability is present.

• The ${Object.keys(CATEGORY_WEIGHTS).length} assessment categories are:
  ${Object.keys(CATEGORY_WEIGHTS).join(", ")}

When generating content, reference actual category scores and risk levels by name.
Ground every recommendation in specific score data. Do NOT write generic safety language.`;
}

/**
 * Build facility characteristics context string from a facility record.
 */
export function buildFacilityContext(facility: any): string {
  const lines = [
    `Name: ${facility.name}`,
    `Type: ${facility.facilityType}`,
    `Address: ${facility.address ?? ""}, ${facility.city ?? ""}, ${facility.state ?? ""}`,
  ];
  if (facility.squareFootage) lines.push(`Size: ${facility.squareFootage.toLocaleString()} sq. ft.`);
  if (facility.floors) lines.push(`Floors: ${facility.floors}`);
  if (facility.maxOccupancy) lines.push(`Max Occupancy: ${facility.maxOccupancy}`);
  if (facility.operatingHours) lines.push(`Operating Hours: ${facility.operatingHours}`);
  if (facility.eveningOperations) lines.push("Evening/after-hours operations: Yes");
  if (facility.multiTenant) lines.push("Multi-tenant building: Yes");
  if (facility.publicAccessWithoutScreening) lines.push("Public access without screening: Yes");
  if (facility.jurisdiction) lines.push(`Jurisdiction: ${facility.jurisdiction}`);
  return lines.join("\n");
}

/**
 * Build category scores context — a human-readable breakdown.
 */
export function buildCategoryScoresContext(categoryScores: Record<string, any>): string {
  if (!categoryScores || Object.keys(categoryScores).length === 0) return "No category scores available.";

  const entries = Object.entries(categoryScores)
    .filter(([, v]: any) => v?.percentage !== undefined)
    .sort(([, a]: any, [, b]: any) => b.percentage - a.percentage);

  if (entries.length === 0) return "No category scores available.";

  return entries.map(([name, v]: any) =>
    `${name}: ${v.percentage?.toFixed(1) ?? "?"}% (${v.riskLevel ?? "Unknown"})`
  ).join("\n");
}