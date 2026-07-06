/**
 * generate-ras-key.mjs — Generates a RAS API key and writes ras_settings.json for the desktop app
 *
 * Usage: node scripts/generate-ras-key.mjs
 *
 * Reads DATABASE_URL from .env, creates an API key for the first org/admin,
 * and outputs the key + writes ras_settings.json for bundling.
 */
import "dotenv/config";
import { createHash, randomBytes } from "crypto";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const RAS_DIST = join(PROJECT_ROOT, "ras-desktop-alert", "dist");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL not set in .env");
    process.exit(1);
  }

  const conn = await mysql.createConnection(databaseUrl);

  try {
    // Get first org
    const [orgs] = await conn.execute("SELECT id, name FROM organizations LIMIT 1");
    if (!orgs[0]) {
      console.error("ERROR: No organizations found in database");
      process.exit(1);
    }
    const orgId = orgs[0].id;
    const orgName = orgs[0].name;
    console.log(`Org: #${orgId} — ${orgName}`);

    // Get first admin user
    const [admins] = await conn.execute(
      "SELECT id, name, email FROM users WHERE role IN ('admin', 'ultra_admin') LIMIT 1"
    );
    if (!admins[0]) {
      console.error("ERROR: No admin user found");
      process.exit(1);
    }
    const userId = admins[0].id;
    console.log(`Admin: #${userId} — ${admins[0].email}`);

    // Generate API key
    const token = randomBytes(32).toString("hex");
    const hash = createHash("sha256").update(token).digest("hex");
    const label = "RAS Desktop Alert";

    // Check if key already exists for this org
    const [existing] = await conn.execute(
      "SELECT id FROM api_keys WHERE orgId = ? AND label = ? LIMIT 1",
      [orgId, label]
    );

    let apiKey;
    if (existing[0]) {
      // Update existing key's hash
      await conn.execute("UPDATE api_keys SET keyHash = ?, revokedAt = NULL, updatedAt = NOW() WHERE id = ?", [hash, existing[0].id]);
      apiKey = token;
      console.log("Updated existing RAS API key");
    } else {
      await conn.execute(
        "INSERT INTO api_keys (userId, orgId, label, keyHash, permissions, createdAt) VALUES (?, ?, ?, ?, '[]', NOW())",
        [userId, orgId, label, hash]
      );
      apiKey = token;
      console.log("Created new RAS API key");
    }

    const apiBaseUrl = process.env.APP_BASE_URL || "https://staging.fivestonestechnology.com";

    // Write ras_settings.json
    const settings = {
      apiBaseUrl: apiBaseUrl.replace(/\/+$/, ""),
      apiKey: apiKey,
      orgId: orgId,
      autoStart: false,
    };

    if (!existsSync(RAS_DIST)) {
      mkdirSync(RAS_DIST, { recursive: true });
    }

    const settingsPath = join(RAS_DIST, "ras_settings.json");
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log(`\nSettings written to: ${settingsPath}`);
    console.log(`\n=== RAS Desktop Configuration ===`);
    console.log(`API Base URL: ${apiBaseUrl}`);
    console.log(`Org ID:       ${orgId}`);
    console.log(`API Key:      ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 8)}`);
    console.log(`Raw Key:      ${apiKey}`);
    console.log(`\nTo test the endpoint:`);
    console.log(`curl -H "X-Api-Key: ${apiKey}" "${apiBaseUrl}/api/ras/alerts/active?orgId=${orgId}"`);

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});