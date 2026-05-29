/**
 * Generate an API key for the Desktop Alert.
 * Usage: node scripts/generate-api-key.mjs <your-email> [orgId] [label]
 *
 * If no orgId is provided, the script will list your orgs.
 */
import mysql from "mysql2/promise";
import { config } from "dotenv";
import { createHash, randomBytes } from "crypto";

config();

const email = process.argv[2];
const orgId = process.argv[3] ? Number(process.argv[3]) : null;
const label = process.argv[4] || "RAS Desktop Alert";

if (!email) {
  console.error("Usage: node scripts/generate-api-key.mjs <email> [orgId] [label]");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set in .env");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

try {
  // Find user
  const [users] = await conn.execute(
    "SELECT id, name, email, role FROM users WHERE email = ?",
    [email]
  );

  if (users.length === 0) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  const user = users[0];
  console.log(`User: ${user.name} (${user.email}) — Role: ${user.role}`);
  console.log(`User ID: ${user.id}`);

  // If no orgId specified, list their orgs
  if (!orgId) {
    const [orgs] = await conn.execute(
      `SELECT o.id, o.name FROM org_members om
       JOIN organizations o ON o.id = om.orgId
       WHERE om.userId = ?`,
      [user.id]
    );

    if (orgs.length === 0) {
      console.log("This user is not a member of any organization.");
      console.log("Creating API key without orgId (works for single-org setups)...");
    } else {
      console.log("\nYour organizations:");
      for (const org of orgs) {
        console.log(`  Org ID: ${org.id} — ${org.name}`);
      }
      console.log(`\nTo generate: node scripts/generate-api-key.mjs "${email}" <orgId> "${label}"`);
      process.exit(0);
    }
  }

  // Generate the API key
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");

  await conn.execute(
    `INSERT INTO api_keys (userId, orgId, label, keyHash, permissions, createdAt)
     VALUES (?, ?, ?, ?, '[]', NOW())`,
    [user.id, orgId, label, hash]
  );

  console.log("\n✅ API Key Generated!");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Key:   ${token}`);
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Label: ${label}`);
  console.log(`  Org:   ${orgId || "none"}`);
  console.log("\nCopy this key and paste it into the RAS Desktop Alert's Settings dialog.");
  console.log("This key will NOT be shown again. Keep it secure.");
} catch (error) {
  console.error("Error:", error.message);
} finally {
  await conn.end();
}