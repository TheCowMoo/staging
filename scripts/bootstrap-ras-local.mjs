/**
 * bootstrap-ras-local.mjs — One-shot local RAS setup
 *
 * Creates everything needed for zero-config RAS desktop testing:
 *   1. Organization (if none exists)
 *   2. org_members row for the ultra_admin user
 *   3. Assigns rasRole = 'admin' to that user
 *   4. Generates an API key for the org
 *   5. Writes ras_settings.json with the real key pointed at localhost:3000
 *
 * Usage: node scripts/bootstrap-ras-local.mjs
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
  console.log("Connected to database\n");

  try {
    // ── Step 1: Find the ultra_admin user ──
    const [users] = await conn.execute(
      "SELECT id, name, email FROM users WHERE role = 'ultra_admin' ORDER BY id LIMIT 1"
    );
    if (!users[0]) {
      console.error("ERROR: No ultra_admin user found in database");
      process.exit(1);
    }
    const userId = users[0].id;
    console.log(`[1] Found user: #${userId} — ${users[0].email}`);

    // ── Step 2: Get or create organization ──
    let [orgs] = await conn.execute("SELECT id, name FROM organizations LIMIT 1");
    let orgId;
    if (!orgs[0]) {
      const orgName = "Local Test Org";
      const slug = "local-test-org";
      await conn.execute("INSERT INTO organizations (name, slug, createdAt) VALUES (?, ?, NOW())", [orgName, slug]);
      [orgs] = await conn.execute("SELECT id, name FROM organizations LIMIT 1");
      orgId = orgs[0].id;
      console.log(`[2] Created organization: #${orgId} — "${orgName}"`);
    } else {
      orgId = orgs[0].id;
      console.log(`[2] Found organization: #${orgId} — "${orgs[0].name}"`);
    }

    // ── Step 3: Ensure org_members row ──
    const [members] = await conn.execute(
      "SELECT id FROM org_members WHERE userId = ? AND orgId = ? LIMIT 1",
      [userId, orgId]
    );
    if (!members[0]) {
      await conn.execute(
        "INSERT INTO org_members (userId, orgId, orgRole, invitedAt) VALUES (?, ?, 'super_admin', NOW())",
        [userId, orgId]
      );
      console.log(`[3] Created org_members row: user #${userId} → org #${orgId}`);
    } else {
      console.log(`[3] org_members row already exists`);
    }

    // ── Step 4: Assign rasRole = admin ──
    const [userRows] = await conn.execute(
      "SELECT rasRole FROM users WHERE id = ? LIMIT 1", [userId]
    );
    const currentRole = userRows[0]?.rasRole;
    if (!currentRole) {
      await conn.execute("UPDATE users SET rasRole = 'admin' WHERE id = ?", [userId]);
      console.log(`[4] Assigned rasRole = 'admin' to user #${userId}`);
    } else {
      console.log(`[4] rasRole already set: "${currentRole}"`);
    }

    // ── Step 5: Generate API key (remove old ones for this org first) ──
    await conn.execute(
      "DELETE FROM api_keys WHERE orgId = ? AND label = 'RAS Desktop Alert'",
      [orgId]
    );

    const token = randomBytes(32).toString("hex");
    const hash = createHash("sha256").update(token).digest("hex");

    await conn.execute(
      "INSERT INTO api_keys (userId, orgId, label, keyHash, permissions, createdAt) VALUES (?, ?, 'RAS Desktop Alert', ?, '[]', NOW())",
      [userId, orgId, hash]
    );
    console.log(`[5] Generated fresh API key`);

    // ── Step 6: Write ras_settings.json ──
    const apiBaseUrl = "http://localhost:3000";
    const settings = {
      apiBaseUrl,
      apiKey: token,
      orgId,
      autoStart: false,
    };

    if (!existsSync(RAS_DIST)) {
      mkdirSync(RAS_DIST, { recursive: true });
    }

    const settingsPath = join(RAS_DIST, "ras_settings.json");
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    console.log(`\n[6] Written settings to: ${settingsPath}`);
    console.log(`\n═══════════════════════════════════════════`);
    console.log(`  ✅ RAS Desktop — READY TO GO`);
    console.log(`═══════════════════════════════════════════`);
    console.log(`  Double-click this file:`);
    console.log(`  ${join(RAS_DIST, "FiveStonesRASAlert.exe")}`);
    console.log(``);
    console.log(`  It will auto-connect to:`);
    console.log(`  URL:   ${apiBaseUrl}`);
    console.log(`  Org:   #${orgId}`);
    console.log(`  Role:  admin`);
    console.log(``);
    console.log(`  To test: start the server with "pnpm dev"`);
    console.log(`  then activate an alert from the web UI.`);
    console.log(`═══════════════════════════════════════════\n`);

  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});