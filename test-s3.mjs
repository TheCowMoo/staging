/**
 * S3 Connection Test
 * Run on the server: node test-s3.mjs
 * Reads S3 credentials from environment variables (or .env via dotenv if available).
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListBucketsCommand } from "@aws-sdk/client-s3";
import { readFileSync, existsSync } from "fs";

// Load .env manually if present
const envPath = new URL(".env", import.meta.url).pathname;
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

const BUCKET   = process.env.S3_BUCKET_NAME;
const REGION   = process.env.S3_REGION || "us-east-1";
const KEY_ID   = process.env.S3_ACCESS_KEY_ID;
const SECRET   = process.env.S3_SECRET_ACCESS_KEY;
const ENDPOINT = process.env.S3_ENDPOINT || null;

console.log("\n── S3 Connection Test ──────────────────────────────────");
console.log(`  Bucket  : ${BUCKET || "(not set)"}`);
console.log(`  Region  : ${REGION}`);
console.log(`  Key ID  : ${KEY_ID ? KEY_ID.slice(0, 8) + "..." : "(not set)"}`);
console.log(`  Secret  : ${SECRET ? "****" + SECRET.slice(-4) : "(not set)"}`);
console.log(`  Endpoint: ${ENDPOINT || "(default AWS)"}`);
console.log("────────────────────────────────────────────────────────\n");

if (!BUCKET || !KEY_ID || !SECRET) {
  console.error("❌  Missing required env vars: S3_BUCKET_NAME, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY");
  process.exit(1);
}

const config = {
  region: REGION,
  credentials: { accessKeyId: KEY_ID, secretAccessKey: SECRET },
};
if (ENDPOINT) {
  config.endpoint = ENDPOINT;
  config.forcePathStyle = true;
}
const client = new S3Client(config);

const TEST_KEY  = `test-connection-${Date.now()}.txt`;
const TEST_BODY = Buffer.from("Five Stones S3 connection test — OK");

try {
  // 1. Upload a small test file
  process.stdout.write("  [1/3] Uploading test file... ");
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: TEST_KEY,
    Body: TEST_BODY,
    ContentType: "text/plain",
  }));
  console.log("✅  OK");

  // 2. Read it back
  process.stdout.write("  [2/3] Reading test file back... ");
  const getRes = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: TEST_KEY }));
  const chunks = [];
  for await (const chunk of getRes.Body) chunks.push(chunk);
  const content = Buffer.concat(chunks).toString("utf8");
  if (content !== TEST_BODY.toString()) throw new Error("Content mismatch");
  console.log("✅  OK");

  // 3. Delete it
  process.stdout.write("  [3/3] Deleting test file... ");
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: TEST_KEY }));
  console.log("✅  OK");

  console.log("\n✅  S3 connection successful! Bucket is reachable and read/write works.\n");
} catch (err) {
  console.error("\n❌  S3 test failed:", err.message || err);
  if (err.Code) console.error("    AWS Error Code:", err.Code);
  if (err.$metadata) console.error("    HTTP Status:", err.$metadata.httpStatusCode);
  console.log();
  process.exit(1);
}
