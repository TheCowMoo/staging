/**
 * build-org-installer.mjs — Builds a per-org RAS Desktop Alert installer
 *
 * Usage: node scripts/build-org-installer.mjs --orgId 42 [--version 1.1.0]
 *
 * 1. Generates a dedicated API key for the org (label: "RAS Desktop Alert")
 * 2. Writes ras_settings.json with the org's API key, orgId, and API base URL
 * 3. Runs dotnet publish (self-contained, single-file EXE)
 * 4. Runs Inno Setup to produce FiveStonesRASAlert-Setup-Org{orgId}.exe
 * 5. Uploads to S3 at installers/ras-alert/{orgId}/v{version}/
 * 6. Cleans up build artifacts
 */

import { execSync } from "child_process";
import { createHash, randomBytes } from "crypto";
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const RAS_DIR = join(PROJECT_ROOT, "ras-desktop-alert");
const DIST_DIR = join(RAS_DIR, "dist");
const OUTPUT_DIR = join(PROJECT_ROOT, "dist");

// Parse args
const args = process.argv.slice(2);
const orgIdArg = args.find((a) => a.startsWith("--orgId="))?.split("=")[1] ?? args[args.indexOf("--orgId") + 1];
const versionArg = args.find((a) => a.startsWith("--version="))?.split("=")[1] ?? args[args.indexOf("--version") + 1] ?? "1.1.0";
const apiBaseUrl = args.find((a) => a.startsWith("--apiBaseUrl="))?.split("=")[1] ?? "https://staging.fivestonestechnology.com";

if (!orgIdArg) {
  console.error("Usage: node scripts/build-org-installer.mjs --orgId 42 [--version 1.1.0] [--apiBaseUrl https://...]");
  process.exit(1);
}

const orgId = parseInt(orgIdArg, 10);
if (isNaN(orgId)) {
  console.error(`Invalid orgId: ${orgIdArg}`);
  process.exit(1);
}

console.log(`\n=== Building RAS Desktop Alert Installer for Org ${orgId} ===\n`);
console.log(`  Version:   ${versionArg}`);
console.log(`  API URL:   ${apiBaseUrl}`);
console.log(`  Org ID:    ${orgId}`);

// ─── Step 1: Connect to DB, generate a dedicated API key ───────────────────
async function generateApiKey() {
  console.log("\n[1/5] Generating dedicated API key...");

  const dotenv = await import("dotenv");
  dotenv.config();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("  ERROR: DATABASE_URL not set in .env");
    process.exit(1);
  }

  const mysql = await import("mysql2/promise");
  const conn = await mysql.default.createConnection(databaseUrl);

  try {
    const [admins] = await conn.execute(
      `SELECT u.id, u.email, u.name FROM users u
       JOIN org_members om ON om.userId = u.id AND om.orgId = ?
       WHERE u.role IN ('admin', 'ultra_admin') LIMIT 1`,
      [orgId]
    );

    const adminUser = admins[0];
    const userId = adminUser?.id ?? null;

    // Generate API key
    const token = randomBytes(32).toString("hex");
    const hash = createHash("sha256").update(token).digest("hex");
    const label = "RAS Desktop Alert";

    await conn.execute(
      `INSERT INTO api_keys (userId, orgId, label, keyHash, permissions, createdAt)
       VALUES (?, ?, ?, ?, '[]', NOW())`,
      [userId, orgId, label, hash]
    );

    console.log(`  API key created for org ${orgId}`);
    return { apiKey: token };
  } finally {
    await conn.end();
  }
}

// ─── Step 2: Write ras_settings.json ────────────────────────────────────────
function writeSettingsFile(apiKey) {
  console.log("\n[2/5] Writing ras_settings.json...");

  if (!existsSync(DIST_DIR)) {
    mkdirSync(DIST_DIR, { recursive: true });
  }

  const settings = {
    apiBaseUrl: apiBaseUrl.replace(/\/+$/, ""),
    apiKey: apiKey,
    orgId: orgId,
    autoStart: false,
  };

  const settingsPath = join(DIST_DIR, "ras_settings.json");
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  console.log(`  Written: ${settingsPath}`);
}

// ─── Step 3: Build .NET self-contained EXE ──────────────────────────────────
function buildExe() {
  console.log("\n[3/5] Building self-contained EXE...");

  execSync(
    `dotnet publish -c Release -r win-x64 --self-contained true ` +
    `-p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true ` +
    `-p:DebugType=none -o ./dist`,
    { cwd: RAS_DIR, stdio: "inherit" }
  );

  const exePath = join(DIST_DIR, "FiveStonesRASAlert.exe");
  if (!existsSync(exePath)) {
    console.error("  ERROR: EXE not found after build!");
    process.exit(1);
  }

  const stats = readFileSync(exePath);
  console.log(`  EXE built: ${(stats.length / 1024 / 1024).toFixed(1)} MB`);
}

// ─── Step 4: Compile Inno Setup installer ───────────────────────────────────
function buildInstaller() {
  console.log("\n[4/5] Compiling installer...");

  // Find ISCC
  let isccPath = null;
  const candidates = [
    "C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe",
    "C:\\Program Files\\Inno Setup 6\\ISCC.exe",
  ];
  for (const c of candidates) {
    if (existsSync(c)) { isccPath = c; break; }
  }

  if (!isccPath) {
    console.error("  ERROR: Inno Setup 6 not found. Install from https://jrsoftware.org/isdl.php");
    process.exit(1);
  }

  const setupIssPath = join(RAS_DIR, "setup.iss");
  const installerName = `FiveStonesRASAlert-Setup-Org${orgId}.exe`;

  // Read current setup.iss, patch OutputBaseFilename
  let issContent = readFileSync(setupIssPath, "utf-8");
  issContent = issContent.replace(
    /OutputBaseFilename=FiveStonesRASAlert-Setup/,
    `OutputBaseFilename=FiveStonesRASAlert-Setup-Org${orgId}`
  );

  const patchedIssPath = join(DIST_DIR, "setup-patched.iss");
  writeFileSync(patchedIssPath, issContent);

  execSync(`"${isccPath}" "${patchedIssPath}" /Q`, { cwd: RAS_DIR, stdio: "inherit" });

  // Clean up patched file
  unlinkSync(patchedIssPath);

  const installerPath = join(OUTPUT_DIR, `${installerName}`);
  if (existsSync(installerPath)) {
    const stats = readFileSync(installerPath);
    console.log(`  Installer: ${installerPath} (${(stats.length / 1024 / 1024).toFixed(1)} MB)`);
  }
}

// ─── Step 5: Upload to S3 ───────────────────────────────────────────────────
async function uploadToS3() {
  console.log("\n[5/5] Uploading to S3...");

  const installerName = `FiveStonesRASAlert-Setup-Org${orgId}.exe`;
  const installerPath = join(OUTPUT_DIR, installerName);

  if (!existsSync(installerPath)) {
    console.error("  ERROR: Installer not found. Skipping upload.");
    return;
  }

  const { readFileSync: fsReadFileSync } = await import("fs");
  const S3_KEY = `installers/ras-alert/${orgId}/v${versionArg}/${installerName}`;

  try {
    const { storagePut } = await import(join(PROJECT_ROOT, "server/storage.ts"));
    const result = await storagePut(
      S3_KEY,
      fsReadFileSync(installerPath),
      "application/x-msdownload"
    );
    console.log(`  Uploaded to: s3://${result.key}`);
    console.log(`  Signed URL:  ${result.url}`);
    return result;
  } catch (err) {
    console.error(`  Upload failed (S3 may not be configured): ${err.message}`);
    console.log("  Installer is still available locally.");
    return null;
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  try {
    const { apiKey } = await generateApiKey();
    writeSettingsFile(apiKey);
    buildExe();
    buildInstaller();
    await uploadToS3();

    console.log("\n=== BUILD COMPLETE ===");
    console.log(`  Installer: ${join(OUTPUT_DIR, `FiveStonesRASAlert-Setup-Org${orgId}.exe`)}`);
    console.log(`  Org ID:    ${orgId}`);
    console.log(`  Version:   ${versionArg}`);
    console.log("");
  } catch (err) {
    console.error("\nBUILD FAILED:", err.message);
    process.exit(1);
  }
}

main();