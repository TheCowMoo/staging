/**
 * server/drills/doctrine/index.ts
 *
 * Barrel export for the Universal Decision Doctrine module.
 *
 * Import from this file to access all doctrine utilities:
 *
 *   import {
 *     evaluateDecision,
 *     generateLabel,
 *     generateOutcomeComponents,
 *     assembleOutcome,
 *     generateTradeoff,
 *     generateExpertReasoning,
 *     doctrineScore,
 *     consequenceTier,
 *   } from "./server/drills/doctrine";
 */

// Types and config
export type {
  DoctrinePrinciple,
  DecisionEffect,
  DecisionDoctrineEvaluation,
  GeneratedOption,
  DrillScenario,
  DoctrineScenarioType,
} from "./decisionDoctrine";

export {
  DOCTRINE_PRINCIPLES,
  ACTD_DOCTRINE_MAP,
  DOCTRINE_SCENARIO_TYPES,
  OPTION_VIABILITY_STANDARDS,
} from "./decisionDoctrine";

// Evaluation
export type { OptionEvaluationInput } from "./evaluateDecision";
export {
  evaluateDecision,
  summarizeEvaluation,
  doctrineScore,
  consequenceTier,
} from "./evaluateDecision";

// Label generation
export type { LabelGenerationInput } from "./generateLabel";
export {
  generateLabel,
  isValidLabel,
  FORBIDDEN_LABEL_PATTERNS,
} from "./generateLabel";

// Outcome generation
export type { OutcomeGenerationInput } from "./generateOutcome";
export {
  generateOutcomeComponents,
  assembleOutcome,
  generateTradeoff,
  validateOutcome,
} from "./generateOutcome";

// Expert reasoning generation
export type { ReasoningGenerationInput } from "./generateExpertReasoning";
export {
  generateExpertReasoning,
  isValidReasoning,
  reasoningReferencesDoctrine,
  FORBIDDEN_REASONING_PATTERNS,
} from "./generateExpertReasoning";
