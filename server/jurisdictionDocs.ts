import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";
import { stateContent } from "../shared/stateContent";

const JURISDICTION_DOC_KEYS = [
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

function getMarkdownSections(markdown: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = markdown.split(/\r?\n/);
  let currentTitle = "";
  let currentLines: string[] = [];

  const flush = () => {
    if (currentTitle && currentLines.length > 0) {
      sections[currentTitle] = currentLines.join("\n").trim();
    }
  };

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      flush();
      currentTitle = headingMatch[1].trim();
      currentLines = [line];
      continue;
    }
    if (currentTitle) {
      currentLines.push(line);
    }
  }
  flush();
  return sections;
}

interface GlossaryEntry {
  acronym: string;
  fullName: string;
  definition: string;
  category: string;
  jurisdiction: "us";
  url?: string;
}

function extractGlossaryTerms(markdown: string, stateName: string): GlossaryEntry[] {
  const terms: GlossaryEntry[] = [];
  const lines = markdown.split(/\r?\n/);
  let inKeyCitations = false;

  for (const line of lines) {
    if (line.includes("**Key Citations:**")) {
      inKeyCitations = true;
      continue;
    }
    if (inKeyCitations && line.startsWith("**")) {
      inKeyCitations = false;
      continue;
    }
    if (inKeyCitations && line.trim().startsWith("- ")) {
      const citation = line.trim().substring(2);
      // Extract acronym in parentheses
      const match = citation.match(/(.+?)\s*\(([^)]+)\)/);
      if (match) {
        const acronym = match[1].trim();
        const fullName = match[2].trim();
        terms.push({
          acronym,
          fullName,
          definition: `A key citation from ${stateName} workplace violence prevention requirements.`,
          category: "Regulatory",
          jurisdiction: "us",
        });
      }
    }
  }

  return terms;
}

function buildS3Client(): S3Client | null {
  if (!ENV.s3BucketName || !ENV.s3AccessKeyId || !ENV.s3SecretAccessKey) {
    return null;
  }

  const config: ConstructorParameters<typeof S3Client>[0] = {
    region: ENV.s3Region || "us-east-1",
    credentials: {
      accessKeyId: ENV.s3AccessKeyId,
      secretAccessKey: ENV.s3SecretAccessKey,
    },
  };

  if (ENV.s3Endpoint) {
    config.endpoint = ENV.s3Endpoint;
    config.forcePathStyle = true;
  }

  return new S3Client(config);
}

async function readLocalJurisdictionDoc(key: string): Promise<string | null> {
  try {
    const basePath = path.resolve(fileURLToPath(new URL("../docs/jurisdictions", import.meta.url)));
    const filePath = path.join(basePath, path.basename(key));
    return await fs.readFile(filePath, "utf8");
  } catch (err) {
    return null;
  }
}

async function fetchS3JurisdictionDoc(key: string): Promise<string | null> {
  const client = buildS3Client();
  if (!client) return null;
  try {
    const command = new GetObjectCommand({ Bucket: ENV.s3BucketName!, Key: key });
    const response = await client.send(command);
    const body = response.Body as any;
    const chunks: Uint8Array[] = [];
    if (body) {
      for await (const chunk of body) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
    }
    return Buffer.concat(chunks).toString("utf8");
  } catch (err) {
    return null;
  }
}

export async function loadStateJurisdictionSection(stateCode: string): Promise<{
  stateCode: string;
  stateName: string;
  markdown: string;
  source: "local" | "s3";
  key: string;
} | null> {
  const state = stateContent[stateCode as keyof typeof stateContent];
  if (!state) return null;
  const stateName = state.name;

  for (const key of JURISDICTION_DOC_KEYS) {
    const markdown = await readLocalJurisdictionDoc(key);
    if (!markdown) continue;
    const sections = getMarkdownSections(markdown);
    const section = sections[stateName];
    if (section) {
      return { stateCode, stateName, markdown: section, source: "local", key };
    }
  }

  const s3Client = buildS3Client();
  if (!s3Client) return null;

  for (const key of JURISDICTION_DOC_KEYS) {
    const markdown = await fetchS3JurisdictionDoc(key);
    if (!markdown) continue;
    const sections = getMarkdownSections(markdown);
    const section = sections[stateName];
    if (section) {
      return { stateCode, stateName, markdown: section, source: "s3", key };
    }
  }

  return null;
}

export async function loadJurisdictionGlossary(): Promise<GlossaryEntry[]> {
  const allTerms: GlossaryEntry[] = [];

  for (const key of JURISDICTION_DOC_KEYS) {
    const markdown = await readLocalJurisdictionDoc(key);
    if (!markdown) continue;
    const sections = getMarkdownSections(markdown);
    for (const [stateName, sectionMarkdown] of Object.entries(sections)) {
      const terms = extractGlossaryTerms(sectionMarkdown, stateName);
      allTerms.push(...terms);
    }
  }

  const s3Client = buildS3Client();
  if (s3Client) {
    for (const key of JURISDICTION_DOC_KEYS) {
      const markdown = await fetchS3JurisdictionDoc(key);
      if (!markdown) continue;
      const sections = getMarkdownSections(markdown);
      for (const [stateName, sectionMarkdown] of Object.entries(sections)) {
        const terms = extractGlossaryTerms(sectionMarkdown, stateName);
        allTerms.push(...terms);
      }
    }
  }

  // Remove duplicates based on acronym
  const uniqueTerms = allTerms.filter((term, index, self) =>
    index === self.findIndex(t => t.acronym === term.acronym)
  );

  return uniqueTerms;
}
