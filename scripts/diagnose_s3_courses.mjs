#!/usr/bin/env node
/**
 * Diagnostic script to test S3 course auto-discovery.
 * Runs the same S3 listing logic as the training module system
 * and reports what it finds.
 */
import { S3Client, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";

// Load .env
import { config } from "dotenv";
config({ path: "../.env" });

const BUCKET = process.env.S3_BUCKET_NAME || "fivestones-pursuit-pathways";
const REGION = process.env.S3_REGION || "us-east-2";
const KEY = process.env.S3_ACCESS_KEY_ID || "";
const SECRET = process.env.S3_SECRET_ACCESS_KEY || "";
const ENDPOINT = process.env.S3_ENDPOINT || "";

if (!KEY || !SECRET) {
  console.error("ERROR: S3 credentials not found. Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY in .env");
  process.exit(1);
}

console.log("\n=== S3 Course Auto-Discovery Diagnostics ===\n");
console.log("Bucket:   " + BUCKET);
console.log("Region:   " + REGION);
console.log("Endpoint: " + (ENDPOINT || "(none — using AWS)"));

const clientConfig = {
  region: REGION,
  credentials: { accessKeyId: KEY, secretAccessKey: SECRET },
};
if (ENDPOINT) {
  clientConfig.endpoint = ENDPOINT;
  clientConfig.forcePathStyle = true;
}
const client = new S3Client(clientConfig);

const prefixes = (process.env.S3_COURSES_PREFIX || "courses").split(",").map(s => s.trim());

async function main() {
  for (const prefix of prefixes) {
    console.log("\n--- Scanning prefix: \"" + prefix + "/\" ---");

    try {
      const normalizedPrefix = prefix.replace(/^\/+/, "").replace(/\/+$/, "") + "/";
      const result = await client.send(new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: normalizedPrefix,
        Delimiter: "/",
      }));

      const dirs = (result.CommonPrefixes || [])
        .map(cp => cp.Prefix || "")
        .filter(Boolean)
        .map(p => p.replace(normalizedPrefix, "").replace(/\/+$/, ""));

      console.log("Directories found: " + (dirs.length ? dirs.join(", ") : "(none)"));
      console.log("Keys in root: " + ((result.Contents || []).length));

      // Check each directory for course files
      for (const dir of dirs) {
        const sp = normalizedPrefix + dir;
        console.log("\n  Directory: " + dir);

        const filesToCheck = [
          "course_link.txt",
          "course_thumbnail.webp",
          "course.webp",
          "story.html",
          "index.html",
        ];

        for (const file of filesToCheck) {
          const key = sp + "/" + file;
          try {
            await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
            console.log("    [OK] " + file + " — EXISTS");
          } catch (err) {
            console.log("    [  ] " + file + " — NOT FOUND");
          }
        }
      }

      // Show raw result structure
      console.log("\n  Raw CommonPrefixes: " + JSON.stringify(result.CommonPrefixes || []));
      if (result.Contents && result.Contents.length) {
        console.log("  First 5 keys: " + result.Contents.slice(0, 5).map(c => c.Key).join(", "));
      }

    } catch (err) {
      console.error("\n  ERROR listing prefix \"" + prefix + "/\":");
      console.error("  " + err.name + ": " + err.message);
      if (err.Code) console.error("  AWS Code: " + err.Code);
    }
  }

  // Also test listing the bucket root briefly
  console.log("\n--- Quick bucket root test ---");
  try {
  console.log(`\n--- Quick bucket root test ---`);
  try {
    const result = await client.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      MaxKeys: 5,
      Delimiter: "/",
    }));
    console.log(`Top-level prefixes found: ${(result.CommonPrefixes ?? []).length > 0 ? result.CommonPrefixes.map(c => c.Prefix).join(", ") : "(none, or no permissions)"}`);
    console.log(`Top-level files: ${(result.Contents ?? []).length}`);
  } catch (err) {
    console.error(`ERROR listing bucket root: ${err.name}: ${err.message}`);
  }
}

main().catch(console.error);
</write_to_file>
<task_progress>
- [x] Create standalone ResourceLinks page
- [x] Register route in App.tsx
- [x] Add nav item to AppLayout sidebar under Admin
- [x] Clean up unused import in OrgAdmin.tsx
- [x] Fix thumbnail detection for Storyline courses in trainingModuleRouter.ts
- [x] Fix thumbnail detection in trainingModuleUpload.ts
- [x] Add storageCheckFile helper to storage.ts
</task_progress>
</write_to_file>