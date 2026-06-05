#!/usr/bin/env node
/**
 * Upload a course folder from local filesystem to S3 under the courses/ prefix.
 * Usage: node scripts/upload-course.cjs <folder-path>
 *
 * Example:
 *   node scripts/upload-course.cjs "C:\Users\Nathanael\Desktop\FiveStones\staging-main\Active Threat Response"
 *
 * This uploads the folder to s3://your-bucket/courses/Active Threat Response/
 * After uploading, the auto-discovery system will pick it up on the next
 * Training Modules page visit and register it with thumbnail detection.
 */
const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

// ─── Config ────────────────────────────────────────────────────────────
// Read credentials from environment variables (set in your shell or .env file)
const BUCKET = process.env.S3_BUCKET_NAME || "fivestones-pursuit-pathways";
const REGION = process.env.S3_REGION || "us-east-2";
const ACCESS_KEY = process.env.S3_ACCESS_KEY_ID || "";
const SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY || "";

const MIME_MAP = {
  ".html": "text/html",
  ".htm": "text/html",
  ".js": "application/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".xml": "text/xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".swf": "application/x-shockwave-flash",
};

async function main() {
  if (!ACCESS_KEY || !SECRET_KEY) {
    console.error("ERROR: S3 credentials not found. Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY in your environment.");
    console.error("Example: $env:S3_ACCESS_KEY_ID='your-key'; $env:S3_SECRET_ACCESS_KEY='your-secret'; node scripts/upload-course.cjs <folder>");
    process.exit(1);
  }

  const folderPath = process.argv[2];
  if (!folderPath) {
    console.error("Usage: node scripts/upload-course.cjs <folder-path>");
    console.error('Example: node scripts/upload-course.cjs "C:\\Users\\Nathanael\\Desktop\\FiveStones\\staging-main\\Active Threat Response"');
    process.exit(1);
  }

  const resolved = path.resolve(folderPath);
  if (!fs.existsSync(resolved)) {
    console.error("ERROR: Path not found: " + resolved);
    process.exit(1);
  }
  if (!fs.statSync(resolved).isDirectory()) {
    console.error("ERROR: Path is not a directory: " + resolved);
    process.exit(1);
  }

  const folderName = path.basename(resolved);
  const prefix = "courses/" + folderName;

  console.log("=== Upload Course to S3 ===");
  console.log("Local folder: " + resolved);
  console.log("S3 destination: s3://" + BUCKET + "/" + prefix + "/");
  console.log("");

  const client = new S3Client({ region: REGION, credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY } });

  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (stat.isFile()) files.push({ fullPath: full, size: stat.size });
    }
  }
  walk(resolved);

  const totalMB = (files.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1);
  console.log("Found " + files.length + " files to upload (" + totalMB + " MB total)");
  console.log("");

  let uploaded = 0;
  let failed = 0;
  const failedFiles = [];

  for (let i = 0; i < files.length; i++) {
    const { fullPath, size } = files[i];
    const relative = path.relative(resolved, fullPath).replace(/\\/g, "/");
    const s3Key = prefix + "/" + relative;
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";

    try {
      const content = fs.readFileSync(fullPath);
      await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: s3Key, Body: content, ContentType: contentType }));
      uploaded++;
      const pct = ((i + 1) / files.length * 100).toFixed(0);
      const sizeStr = size > 1024 * 1024 ? (size / 1024 / 1024).toFixed(1) + " MB" : (size / 1024).toFixed(1) + " KB";
      process.stdout.write("\r  [" + pct + "%] Uploaded " + relative + " (" + sizeStr + ")");
    } catch (err) {
      failed++;
      failedFiles.push({ file: relative, error: err.message });
      process.stdout.write("\r  [ERR] " + relative + ": " + err.message);
    }
  }

  console.log("\n");
  console.log("--- Results: " + uploaded + " uploaded, " + failed + " failed ---");
  if (failedFiles.length > 0) {
    console.log("Failed files:");
    for (const f of failedFiles) console.log("  - " + f.file + ": " + f.error);
  }

  // Check for thumbnail
  for (const thumb of ["course_thumbnail.webp", "course.webp"]) {
    try {
      await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: prefix + "/" + thumb }));
      console.log("THUMBNAIL: " + thumb + " detected -- course will show it on Training Modules page");
      break;
    } catch {}
  }

  console.log("\nUpload complete! Navigate to Training Modules in the app to see it.");
}

main().catch(err => { console.error("Fatal:", err.message || err); process.exit(1); });