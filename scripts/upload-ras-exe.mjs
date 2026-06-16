/**
 * upload-ras-exe.mjs — Upload pre-built RAS Desktop Alert EXE to S3
 *
 * Usage: node scripts/upload-ras-exe.mjs --orgId 2
 *
 * Uploads the already-compiled FiveStonesRASAlert.exe to S3
 * so the RASActivation page can serve it as a download.
 */

import { config } from "dotenv";
config();

import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

// Parse args — support both --orgId=2 and --orgId 2
const args = process.argv.slice(2);
let orgId = 0;
let versionArg = "1.1.0";
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--orgId=")) {
    orgId = parseInt(args[i].split("=")[1], 10);
  } else if (args[i] === "--orgId" && i + 1 < args.length) {
    orgId = parseInt(args[i + 1], 10);
  } else if (args[i].startsWith("--version=")) {
    versionArg = args[i].split("=")[1];
  } else if (args[i] === "--version" && i + 1 < args.length) {
    versionArg = args[i + 1];
  }
}

if (!orgId || isNaN(orgId)) {
  console.error("Usage: node scripts/upload-ras-exe.mjs --orgId 42 [--version 1.1.0]");
  process.exit(1);
}

const BUCKET = process.env.S3_BUCKET_NAME;
const REGION = process.env.S3_REGION || "us-east-2";
const ACCESS_KEY = process.env.S3_ACCESS_KEY_ID;
const SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY;

if (!BUCKET || !ACCESS_KEY || !SECRET_KEY) {
  console.error("ERROR: S3 credentials not found in .env. Ensure these are set:");
  console.error("  S3_BUCKET_NAME, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY");
  process.exit(1);
}

console.log(`\n=== Uploading RAS Desktop Alert EXE for Org ${orgId} ===\n`);
console.log(`  Version: ${versionArg}`);
console.log(`  Org ID:  ${orgId}`);
console.log(`  Bucket:  ${BUCKET}`);
console.log(`  Region:  ${REGION}`);

const exePath = join(PROJECT_ROOT, "ras-desktop-alert", "dist", "FiveStonesRASAlert.exe");
const exeName = "FiveStonesRASAlert.exe";

if (!existsSync(exePath)) {
  console.error(`ERROR: EXE not found at ${exePath}. Build it first with the build script.`);
  process.exit(1);
}

const exeSize = (readFileSync(exePath).length / 1024 / 1024).toFixed(1);
console.log(`  EXE: ${exePath} (${exeSize} MB)`);

const client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
});

async function upload() {
  try {
    const s3Key = `installers/ras-alert/${orgId}/v${versionArg}/${exeName}`;
    console.log(`  S3 key: ${s3Key}`);

    // Upload the EXE
    await client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: readFileSync(exePath),
      ContentType: "application/x-msdownload",
    }));
    console.log("  EXE uploaded.");

    // Generate a signed URL for download (7-day expiry)
    const signedUrl = await getSignedUrl(client, new GetObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
    }), { expiresIn: 7 * 24 * 3600 });
    console.log(`  Signed URL: ${signedUrl}`);

    // Upload build metadata
    const buildMeta = {
      url: signedUrl,
      orgId,
      version: versionArg,
      timestamp: new Date().toISOString(),
    };
    await client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: `installers/ras-alert/${orgId}/v${versionArg}/build-meta.json`,
      Body: JSON.stringify(buildMeta),
      ContentType: "application/json",
    }));
    console.log("  Metadata uploaded.");

    console.log(`\n=== UPLOAD COMPLETE ===`);
    console.log(`The installer is now available for org ${orgId}.`);
    console.log(`Refresh the RAS Activation page and click "Download Installer".`);
  } catch (err) {
    console.error(`\nUpload failed: ${err.message}`);
    process.exit(1);
  }
}

upload();