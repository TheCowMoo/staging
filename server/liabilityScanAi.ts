import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import { QUESTIONS, type AnswerValue, type AssessmentOutput, runAssessment } from "../shared/assessmentEngine";
import type { JsonSchema, Message } from "./_core/llm";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: ENV.s3Region,
  credentials: {
    accessKeyId: ENV.s3AccessKeyId,
    secretAccessKey: ENV.s3SecretAccessKey,
  },
  endpoint: ENV.s3Endpoint || undefined,
  forcePathStyle: !!ENV.s3Endpoint,
});

const RAG_DOCUMENT_KEYS = [
  "COMPLIANCE_ROADMAP.md",
  "fema_research_notes.md",
  "Liability_Exposure_Scan_Scoring_Logic.md",
  "MVP_Assessment_Engine.md",
  "RECOMMENDATIONS_LOG.md",
  "PRIVACY_POLICY.md",
  "PROFESSIONAL_SERVICES_AGREEMENT.md",
  "SAAS_TERMS.md",
  "VAPID_KEY_ROTATION.md",
  "todo.md",
  "docs/jurisdictions/jurisdiction_a-f.md",
  "docs/jurisdictions/jurisdiction_g-l.md",
  "docs/jurisdictions/jurisdiction_n-m.md",
  "docs/jurisdictions/jurisdiction_o-r.md",
  "docs/jurisdictions/jurisdiction_w-s.md",
  "docs/jurisdictions/jurisdiction_alabama_florida.md",
  "docs/jurisdictions/jurisdiction_alabama_georgia.md",
  "docs/jurisdictions/jurisdiction_alaska_oklahoma.md",
  "docs/jurisdictions/jurisdiction_louisiana_mississippi.md",
  "docs/jurisdictions/jurisdiction_new_mexico.md",
];

export type LiabilityScanAiInput = {
  answers: Record<string, string | boolean>;
  jurisdiction: string;
  industry: string;
};

const LIABILITY_SCAN_RESPONSE_SCHEMA: JsonSchema = {
  name: "liability_scan_result",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "score",
      "classification",
      "riskMap",
      "topGaps",
      "categoryScores",
      "interpretation",
      "advisorSummary",
      "immediateActionPlan",
      "ctaBlock",
      "crmPayload",
    ],
    properties: {
      score: { type: "number", minimum: 0, maximum: 100 },
      classification: {
        type: "string",
        enum: ["Critical Exposure", "High Exposure", "Material Exposure", "Moderate Readiness", "Defensible Foundation"],
      },
      riskMap: {
        type: "object",
        additionalProperties: false,
        required: ["color", "label", "descriptor"],
        properties: {
          color: { type: "string", enum: ["red", "orange", "yellow", "yellow-green", "green"] },
          label: {
            type: "string",
            enum: ["Critical Exposure", "High Exposure", "Material Exposure", "Moderate Readiness", "Defensible Foundation"],
          },
          descriptor: { type: "string" },
        },
      },
      topGaps: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          required: ["id", "gap", "status", "impact"],
          properties: {
            id: { type: "string" },
            gap: { type: "string" },
            status: { type: "string", enum: ["Not in Place", "Incomplete", "Partial"] },
            impact: { type: "string" },
            severity: { type: "string", enum: ["CRITICAL", "HIGH"] },
            regulatoryBasis: { type: "array", items: { type: "string" } },
            preparednessBasis: { type: "array", items: { type: "string" } },
            sectionTag: {
              type: "string",
              enum: [
                "planning_documentation",
                "training_awareness",
                "reporting_communication",
                "response_readiness",
                "critical_risk_factors",
              ],
            },
          },
        },
      },
      categoryScores: {
        type: "object",
        additionalProperties: false,
        required: ["planningDocumentation", "trainingAwareness", "reportingCommunication", "responseReadiness"],
        properties: {
          planningDocumentation: { type: "number", minimum: 0, maximum: 100 },
          trainingAwareness: { type: "number", minimum: 0, maximum: 100 },
          reportingCommunication: { type: "number", minimum: 0, maximum: 100 },
          responseReadiness: { type: "number", minimum: 0, maximum: 100 },
        },
      },
      interpretation: { type: "string" },
      advisorSummary: { type: "string" },
      immediateActionPlan: { type: "array", items: { type: "string" } },
      ctaBlock: { type: "array", items: { type: "string" } },
      crmPayload: {
        type: "object",
        additionalProperties: true,
        required: [
          "score",
          "classification",
          "riskLevel",
          "topGaps",
          "categoryScores",
          "industry",
          "jurisdiction",
          "recommendedActions",
        ],
        properties: {
          score: { type: "number", minimum: 0, maximum: 100 },
          classification: {
            type: "string",
            enum: ["Critical Exposure", "High Exposure", "Material Exposure", "Moderate Readiness", "Defensible Foundation"],
          },
          riskLevel: { type: "string", enum: ["red", "orange", "yellow", "yellow-green", "green"] },
          topGaps: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: true,
              required: ["gap", "status", "impact"],
              properties: {
                gap: { type: "string" },
                status: { type: "string", enum: ["Not in Place", "Incomplete", "Partial"] },
                impact: { type: "string" },
                severity: { type: "string", enum: ["CRITICAL", "HIGH"] },
                regulatoryBasis: { type: "array", items: { type: "string" } },
                preparednessBasis: { type: "array", items: { type: "string" } },
                sectionTag: {
                  type: "string",
                  enum: [
                    "planning_documentation",
                    "training_awareness",
                    "reporting_communication",
                    "response_readiness",
                    "critical_risk_factors",
                  ],
                },
              },
            },
          },
          categoryScores: {
            type: "object",
            additionalProperties: false,
            required: ["planningDocumentation", "trainingAwareness", "reportingCommunication", "responseReadiness"],
            properties: {
              planningDocumentation: { type: "number", minimum: 0, maximum: 100 },
              trainingAwareness: { type: "number", minimum: 0, maximum: 100 },
              reportingCommunication: { type: "number", minimum: 0, maximum: 100 },
              responseReadiness: { type: "number", minimum: 0, maximum: 100 },
            },
          },
          industry: { type: "string" },
          jurisdiction: { type: "string" },
          recommendedActions: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

async function retrieveRagDocuments(): Promise<string> {
  console.log(`[liabilityScanAi] retrieving ${RAG_DOCUMENT_KEYS.length} RAG documents from S3`);
  const docs: string[] = [];
  for (const key of RAG_DOCUMENT_KEYS) {
    try {
      const command = new GetObjectCommand({
        Bucket: ENV.s3BucketName,
        Key: key,
      });
      const response = await s3Client.send(command);
      const body = response.Body as any;
      const chunks = [];
      if (body) {
        for await (const chunk of body) {
        chunks.push(chunk);
        }
      }
      const content = Buffer.concat(chunks).toString('utf8');
      docs.push(`--- Document: ${key} ---\n${content}\n`);
      console.log(`[liabilityScanAi] successfully retrieved ${key} (${content.length} chars)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[liabilityScanAi] Failed to retrieve ${key} from S3:`, message);
    }
  }
  console.log(`[liabilityScanAi] RAG retrieval complete, total docs: ${docs.length}`);
  return docs.join('\n');
}

const QUESTIONS_ORDER: string[] = [
  "q1",
  "q2",
  "q3",
  "q4",
  "q5",
  "q6",
  "q7",
  "q8",
  "q9",
  "q10",
  "q11",
  "q12",
  "q13",
  "q14",
  "q15",
  "q16",
];

const buildQuestionAnswerBlock = (answers: Record<string, string | boolean>) => {
  const questionMap = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
  return QUESTIONS_ORDER.map((id) => {
    const question = questionMap[id];
    const rawAnswer = answers[id];
    const answerLabel = question?.options?.find((opt) => opt.value === rawAnswer)?.label ?? String(rawAnswer ?? "");
    return `${id}: ${question?.text ?? "Unknown question"} => ${answerLabel}`;
  }).join("\n");
};

const buildLiabilityScanPrompt = (answers: Record<string, string | boolean>, jurisdiction: string, industry: string, ragContext: string): Message[] => {
  const questionDefinition = `
The liability scan questions are identified by stable IDs. Each top gap must include the original question ID so the client can map responses to the right section.
Use these categories for sectionTag values: planning_documentation, training_awareness, reporting_communication, response_readiness, critical_risk_factors.
`;

  const classificationGuidance = `
Classification must be one of: Critical Exposure, High Exposure, Material Exposure, Moderate Readiness, Defensible Foundation.
Risk colors must match the classification as follows:
- Critical Exposure => red
- High Exposure => orange
- Material Exposure => yellow
- Moderate Readiness => yellow-green
- Defensible Foundation => green
`;

  const aiGuidance = `
Use the AI model fully. Do not mimic or fallback to the legacy rule-based liability scan engine.
Focus on generating an analytical AI assessment that explains exposure, risk drivers, and priority gaps.
Do not use formulaic, checklist-style text or old engine phrasing.
`;

  return [
    {
      role: "system",
      content: [
        "You are an expert workplace violence liability exposure analyst.",
        "Produce a single JSON object using the exact schema requested by the user.",
        "Do not include any explanatory text outside the JSON object.",
      ],
    },
    {
      role: "user",
      content: [
        "Generate a liability exposure scan result from the provided answers, industry, and jurisdiction.",
        questionDefinition,
        classificationGuidance,
        aiGuidance,
        `Industry: ${industry}`,
        `Jurisdiction: ${jurisdiction}`,
        "Answers:",
        buildQuestionAnswerBlock(answers),
        "Relevant context from knowledge base:",
        ragContext,
        "Return the following fields exactly: score, classification, riskMap, topGaps, categoryScores, interpretation, advisorSummary, immediateActionPlan, ctaBlock, crmPayload.",
        "Each topGaps item must include id, gap, status, impact, and optionally severity, regulatoryBasis, preparednessBasis, sectionTag.",
        "The crmPayload.topGaps items should mirror topGaps, but do not need to include id.",
        "Use plain strings only. Do not use Markdown formatting or bullet characters in field values.",
      ],
    },
  ];
};

// --- New: three-layer prompt builders ------------------------------------
const buildRegulatoryResolverMessages = (country: string, state_or_province: string, osha_type: string, industry: string, facility_profile: string): Message[] => {
  const system = `You are the regulatory context resolver for a workplace violence readiness platform.\n\nYour job is to determine which legal and best-practice standards apply before readiness analysis begins.`;
  const user = `Inputs:\n- country: ${country}\n- state_or_province: ${state_or_province}\n- OSHA_jurisdiction_type: ${osha_type}\n- industry: ${industry}\n- facility_profile: ${facility_profile}\n\nRules:\n1. Start with the federal / national backstop when no stricter state rule applies.\n2. If a state-specific workplace violence law, retail worker law, healthcare violence-prevention mandate, or public-sector rule is stricter, apply that rule as the controlling overlay.\n3. Return only the standards that materially affect the assessment and recommendations.\n4. Distinguish mandatory legal requirements from best-practice backstops.\n5. Keep output concise and structured.\n\nReturn JSON with: controlling_authority, baseline_frameworks, state_overlays, industry_specific_mandates, special_flags`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
};

const buildAssessmentInterpreterMessages = (params: {
  industry: string;
  facility_profile: string;
  section_scores: Record<string, number>;
  overall_score: number;
  hard_stop_flags: string[];
  answers: Record<string, string | boolean>;
  regulatory_context: any;
  modifiers?: Record<string, string>;
}): Message[] => {
  const system = `You are the assessment interpreter for an industry-specific workplace violence readiness platform.`;
  const userParts = [
    `Evaluate the user's answers against the provided industry context and legal overlays.`,
    `Industry: ${params.industry}`,
    `Facility profile: ${params.facility_profile}`,
    `Section scores: ${JSON.stringify(params.section_scores)}`,
    `Overall score: ${params.overall_score}`,
    `Hard-stop flags: ${JSON.stringify(params.hard_stop_flags)}`,
    `Answers: ${buildQuestionAnswerBlock(params.answers)}`,
    `Regulatory context: ${JSON.stringify(params.regulatory_context)}`,
  ];
  if (params.modifiers) {
    userParts.push(`Modifiers: ${JSON.stringify(params.modifiers)}`);
  }
  userParts.push("Return JSON with: executive_summary, top_3_gaps, section_findings, defensibility_risk_statement, recommended_next_actions");
  return [
    { role: "system", content: system },
    { role: "user", content: userParts.join("\n\n") },
  ];
};

const buildOutputGeneratorMessages = (findings: any, industry: string, modifiers?: Record<string, string>): Message[] => {
  const system = `You are generating the final readiness results for a workplace violence prevention platform.`;
  const userParts = [
    `Use only the supplied structured findings (JSON).`,
    `Findings: ${JSON.stringify(findings)}`,
    `Industry: ${industry}`,
  ];
  if (modifiers) userParts.push(`Modifiers: ${JSON.stringify(modifiers)}`);
  userParts.push("Return JSON with: score_headline, score_summary, section_cards, priority_actions, CTA_block");
  return [
    { role: "system", content: system },
    { role: "user", content: userParts.join("\n\n") },
  ];
};

const cleanJsonString = (value: string): string => {
  let text = value.trim();

  const fencedMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```$/i);
  if (fencedMatch?.[1]) {
    text = fencedMatch[1].trim();
  }

  const firstJsonChar = text.search(/[\[{]/);
  if (firstJsonChar > 0) {
    text = text.slice(firstJsonChar).trim();
  }

  const lastJsonChar = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (lastJsonChar !== -1 && lastJsonChar < text.length - 1) {
    text = text.slice(0, lastJsonChar + 1).trim();
  }

  return text;
};

const parseLlmResponse = (content: unknown): any => {
  if (content === null || content === undefined) return null;

  if (typeof content === "string") {
    const cleaned = cleanJsonString(content);
    if (!cleaned) return null;

    try {
      return JSON.parse(cleaned);
    } catch (err) {
      const fallback = cleaned.replace(/\r/g, "");
      const jsonStart = fallback.search(/[\[{]/);
      if (jsonStart !== -1) {
        try {
          return JSON.parse(fallback.slice(jsonStart));
        } catch {
          // fall through and throw original parse error
        }
      }
      throw err;
    }
  }

  if (typeof content === "object") {
    return content;
  }

  return null;
};

const normalizeAnswers = (answers: Record<string, string | boolean>): Record<string, AnswerValue> => {
  return Object.fromEntries(
    Object.entries(answers).map(([key, value]) => {
      const normalized =
        value === true ? "yes" :
        value === false ? "no" :
        String(value ?? "").trim();
      return [key, normalized];
    })
  ) as Record<string, AnswerValue>;
};

/**
 * Normalize the LLM's recommended_next_actions to a flat string[].
 * The Layer-2 interpreter sometimes returns an array of objects like
 * { priority: "Immediate", action: "..." } instead of plain strings.
 * This helper converts any such objects to readable strings so they
 * can be safely stored and rendered as React children.
 */
function normalizeActionPlan(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      // Handle {priority, action} shape returned by some LLM responses
      if (typeof obj.action === "string") {
        return obj.priority ? `${obj.priority}: ${obj.action}` : obj.action;
      }
      // Fallback: join all string values
      const values = Object.values(obj).filter((v) => typeof v === "string");
      if (values.length > 0) return values.join(" — ");
    }
    return String(item ?? "");
  }).filter(Boolean);
}

const validateAiResult: (candidate: any) => asserts candidate is AssessmentOutput = (candidate) => {
  if (typeof candidate !== "object" || candidate === null) {
    throw new Error("AI response did not return a valid object");
  }
  if (typeof candidate.score !== "number") {
    throw new Error("AI response missing numeric score");
  }
  if (typeof candidate.classification !== "string") {
    throw new Error("AI response missing classification");
  }
  if (!Array.isArray(candidate.topGaps) || typeof candidate.interpretation !== "string") {
    throw new Error("AI response missing required liability scan sections");
  }
};

export async function generateLiabilityScanResult(
  input: LiabilityScanAiInput
): Promise<AssessmentOutput> {
  console.log(`[liabilityScanAi] Starting liability scan generation for jurisdiction: ${input.jurisdiction}, industry: ${input.industry}`);
  
  const normalizedAnswers = normalizeAnswers(input.answers);
  if (!ENV.openAiApiKey) {
    throw new Error(
      "AI keys are missing from configuration. Liability scans now require Gemini or OpenAI and will not run on the legacy engine."
    );
  }

  console.log("[liabilityScanAi] AI PATH TAKEN - Using Gemini for liability scan");

  const ragContext = await retrieveRagDocuments();
  // Precompute engine-based assessment so we can provide section scores and flags
  const engineResult = runAssessment(normalizedAnswers, input.industry || "Not specified", input.jurisdiction || "Not specified");

  // Build modifiers based on section scores and industry/state overlays
  const modifiers: Record<string, string> = {};
  const sectionScores = engineResult.categoryScores as unknown as Record<string, number>;
  if ((sectionScores.planningDocumentation ?? 100) < 50) {
    modifiers.focus_planning = "Emphasize missing written structure, site specificity, and inability to prove reasonable preparation.";
  }
  if ((sectionScores.trainingAwareness ?? 100) < 50) {
    modifiers.focus_training = "Emphasize weak employee awareness, inconsistent training cadence, and execution risk under stress.";
  }
  if ((sectionScores.reportingCommunication ?? 100) < 50) {
    modifiers.focus_reporting = "Emphasize early-warning failure, lack of formal intake, weak action trail, and communication breakdown risk.";
  }
  if ((sectionScores.responseReadiness ?? 100) < 50) {
    modifiers.focus_response = "Emphasize untested response, role confusion, and failure to validate the plan in practice.";
  }
  if ((engineResult.categoryScores as any).criticalRiskFactors < 50 || (engineResult as any).categoryScores?.criticalRiskFactors < 50) {
    modifiers.focus_critical = "Emphasize unmanaged individuals of concern, domestic violence spillover, insider threat exposure, and escalation risk.";
  }
  // Industry modifier
  const industryModifiers: Record<string, string> = {
    Manufacturing: "Use plant, shift, contractor, loading dock, warehouse, and floor-operations language. Prioritize site-specific workflow and documented follow-through.",
    Retail: "Use customer-facing, store, parking lot, public access, de-escalation, and rapid alerting language. Prioritize exterior exposure and notification clarity.",
    Government: "Use agency, public service, public access, continuity, and accountability language. Prioritize targeted threats and continuity of operations.",
    "Higher Education": "Use campus, students, faculty, staff, events, housing, and multidisciplinary review language. Prioritize threat assessment and open-environment coordination.",
    Healthcare: "Use care setting, patient, visitor, incident log, de-escalation, and written prevention program language. Prioritize incident tracking and state healthcare mandates.",
  };
  if (industryModifiers[input.industry]) modifiers.industry = industryModifiers[input.industry];

  // State overlay modifiers
  const stateCode = (input.jurisdiction || "").trim().split(/\s|—|-/)[0];
  if (stateCode === "CA") {
    modifiers.state_california = "emphasize documented workplace violence prevention program requirements and state-specific overlay controls.";
  }
  if (stateCode === "NY" && input.industry === "Retail") {
    modifiers.state_new_york_retail = "emphasize retail worker safety policy/training and silent response readiness requirements for covered employers.";
  }
  if (["TX", "TN", "ND"].includes(stateCode)) {
    modifiers.state_parking_law = "block property-wide ban recommendations; focus on building access, secured areas, and compliant policy boundaries.";
  }

  // Build messages for three-layer orchestration
  const regMsgs = buildRegulatoryResolverMessages("US", stateCode, "unknown", input.industry || "Not specified", "facility_profile_placeholder");
  const interpMsgs = buildAssessmentInterpreterMessages({
    industry: input.industry || "Not specified",
    facility_profile: "facility_profile_placeholder",
    section_scores: {
      planning_documentation: engineResult.categoryScores.planningDocumentation,
      training_awareness: engineResult.categoryScores.trainingAwareness,
      reporting_communication: engineResult.categoryScores.reportingCommunication,
      response_readiness: engineResult.categoryScores.responseReadiness,
      critical_risk_factors: (engineResult as any).categoryScores?.criticalRiskFactors ?? 100,
    },
    overall_score: engineResult.score,
    hard_stop_flags: engineResult.escalationFlags ?? [],
    answers: input.answers,
    regulatory_context: {},
    modifiers,
  });
  const outMsgs = buildOutputGeneratorMessages({}, input.industry || "Not specified", modifiers);

  console.log(`[liabilityScanAi] invoking three-layer AI orchestration; model=${ENV.llmModel} baseUrl=${ENV.llmBaseUrl || "openai default"}`);

  // --- Layer 1: Regulatory context resolver ---
  let regResponse;
  try {
    regResponse = await invokeLLM({ messages: regMsgs });
    console.log(`[liabilityScanAi] Layer1 response received`);
  } catch (err) {
    console.error(`[liabilityScanAi] Layer1 invokeLLM failed:`, err);
    throw err;
  }
  const regRaw = regResponse.choices?.[0]?.message?.content;
  let regParsed = null;
  try {
    regParsed = parseLlmResponse(regRaw) || {};
  } catch (err) {
    console.warn(`[liabilityScanAi] Layer1 parse failed, continuing with empty regulatory context`, err);
    regParsed = {};
  }

  // --- Layer 2: Assessment interpreter ---
  const interpMessagesFinal = buildAssessmentInterpreterMessages({
    industry: input.industry || "Not specified",
    facility_profile: "facility_profile_placeholder",
    section_scores: {
      planning_documentation: engineResult.categoryScores.planningDocumentation,
      training_awareness: engineResult.categoryScores.trainingAwareness,
      reporting_communication: engineResult.categoryScores.reportingCommunication,
      response_readiness: engineResult.categoryScores.responseReadiness,
      critical_risk_factors: (engineResult as any).categoryScores?.criticalRiskFactors ?? 100,
    },
    overall_score: engineResult.score,
    hard_stop_flags: engineResult.escalationFlags ?? [],
    answers: input.answers,
    regulatory_context: regParsed,
    modifiers,
  });

  let interpResponse;
  try {
    interpResponse = await invokeLLM({ messages: interpMessagesFinal });
    console.log(`[liabilityScanAi] Layer2 response received`);
  } catch (err) {
    console.error(`[liabilityScanAi] Layer2 invokeLLM failed:`, err);
    throw err;
  }
  const interpRaw = interpResponse.choices?.[0]?.message?.content;
  let interpParsed = null;
  try {
    interpParsed = parseLlmResponse(interpRaw) || {};
  } catch (err) {
    console.warn(`[liabilityScanAi] Layer2 parse failed, continuing with empty findings`, err);
    interpParsed = {};
  }

  // --- Layer 3: Output generator ---
  const outMessagesFinal = buildOutputGeneratorMessages(interpParsed, input.industry || "Not specified", modifiers);
  let outResponse;
  try {
    outResponse = await invokeLLM({ messages: outMessagesFinal });
    console.log(`[liabilityScanAi] Layer3 response received`);
  } catch (err) {
    console.error(`[liabilityScanAi] Layer3 invokeLLM failed:`, err);
    throw err;
  }
  const outRaw = outResponse.choices?.[0]?.message?.content;
  let outParsed = null;
  try {
    outParsed = parseLlmResponse(outRaw) || {};
  } catch (err) {
    console.warn(`[liabilityScanAi] Layer3 parse failed, using interpreter findings for text blocks`, err);
    outParsed = {};
  }

  // Assemble final AssessmentOutput by combining engine results with AI-generated narrative
  const finalOutput: AssessmentOutput = {
    score: engineResult.score,
    classification: engineResult.classification,
    riskMap: engineResult.riskMap,
    topGaps: engineResult.topGaps,
    categoryScores: engineResult.categoryScores,
    interpretation: (interpParsed?.executive_summary as string) || engineResult.interpretation,
    advisorSummary: (interpParsed?.defensibility_risk_statement as string) || engineResult.advisorSummary,
    immediateActionPlan: normalizeActionPlan(interpParsed?.recommended_next_actions) ?? engineResult.immediateActionPlan ?? [],
    ctaBlock: (outParsed?.CTA_block as string[]) || engineResult.ctaBlock,
    crmPayload: engineResult.crmPayload,
    escalationFlags: engineResult.escalationFlags,
  };

  // Validate shape lightly
  validateAiResult(finalOutput as any);
  return finalOutput;
}