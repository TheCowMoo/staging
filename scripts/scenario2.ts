import { runAssessment, SAMPLE_RESPONSES_MODERATE } from "../shared/assessmentEngine";

const r = runAssessment(SAMPLE_RESPONSES_MODERATE, "Healthcare", "New York");

console.log("=== SCENARIO 2 OUTPUT ===");
console.log("score:", r.score);
console.log("classification:", r.classification);
console.log("riskMap.color:", r.riskMap.color, "| label:", r.riskMap.label);
console.log("categoryScores:", JSON.stringify(r.categoryScores, null, 2));
console.log("\ntopGaps:");
r.topGaps.forEach((g, i) =>
  console.log(" ", i + 1, ".", g.gap, "\n    status:", g.status)
);
console.log("\ninterpretation:", r.interpretation);
console.log("\nadvisorSummary:", r.advisorSummary);
