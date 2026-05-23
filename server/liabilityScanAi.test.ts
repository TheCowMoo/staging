import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "test-gemini-key";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

import { generateLiabilityScanResult } from "./liabilityScanAi";
import { invokeLLM } from "./_core/llm";
import { S3Client } from "@aws-sdk/client-s3";

describe("generateLiabilityScanResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockSend = vi.fn().mockResolvedValue({
      Body: {
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from("dummy document content");
        },
      },
    });
    vi.mocked(S3Client).mockImplementation(() => ({ send: mockSend }));
  });

  it("parses the AI response and returns a structured result", async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              score: 85,
              classification: "Moderate Exposure",
              riskMap: { color: "yellow", label: "Moderate Exposure", descriptor: "Manageable exposure with identifiable improvement areas." },
              topGaps: [
                {
                  id: "q9",
                  gap: "No formal reporting mechanism is in place.",
                  status: "Not in Place",
                  impact: "Employees cannot report threats anonymously, increasing the risk that warning signs are missed.",
                  severity: "HIGH",
                  sectionTag: "reporting_communication",
                },
              ],
              categoryScores: {
                planningDocumentation: 90,
                trainingAwareness: 80,
                reportingCommunication: 60,
                responseReadiness: 70,
              },
              interpretation: "Your organization has moderate exposure due to gaps in reporting and response readiness.",
              advisorSummary: "Focus on anonymous reporting, drill documentation, and defined emergency roles.",
              immediateActionPlan: ["Implement a formal anonymous reporting system."],
              ctaBlock: ["Full Liability Assessment — A structured, on-site evaluation of your organization's exposure."],
              crmPayload: {
                score: 85,
                classification: "Moderate Exposure",
                riskLevel: "yellow",
                topGaps: [
                  {
                    gap: "No formal reporting mechanism is in place.",
                    status: "Not in Place",
                    impact: "Employees cannot report threats anonymously, increasing the risk that warning signs are missed.",
                    severity: "HIGH",
                    sectionTag: "reporting_communication",
                  },
                ],
                categoryScores: {
                  planningDocumentation: 90,
                  trainingAwareness: 80,
                  reportingCommunication: 60,
                  responseReadiness: 70,
                },
                industry: "Retail",
                jurisdiction: "California",
                recommendedActions: ["Implement a formal anonymous reporting system."],
              },
            }),
          },
        },
      ],
    };

    const mockedInvokeLLM = vi.mocked(invokeLLM);
    mockedInvokeLLM.mockResolvedValue(mockResponse);

    const result = await generateLiabilityScanResult({
      answers: { q1: "yes", q2: "yes", q3: "yes", q4: "yes", q5: "yes", q6: "yes", q7: "yes", q8: "yes", q9: "anon_none", q10: "ras_full", q11: "yes", q12: "yes", q13: "yes", q14: "yes", q15: "yes", q16: "yes" },
      jurisdiction: "California",
      industry: "Retail",
    });

    expect(result.score).toBe(93);
    expect(result.classification).toBe("Defensible Position");
    expect(result.topGaps[0].id).toBe("q9");
  });
});
