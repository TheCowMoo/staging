import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
config();

const sql = `
CREATE TABLE IF NOT EXISTS \`alert_events\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`orgId\` int,
  \`facilityId\` int NOT NULL,
  \`alertType\` enum('lockdown','lockout') NOT NULL,
  \`alertStatus\` enum('active','response_in_progress','resolved') NOT NULL DEFAULT 'active',
  \`messageTitle\` varchar(255) NOT NULL,
  \`messageBody\` text NOT NULL,
  \`roleInstructions\` json,
  \`createdByUserId\` int NOT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  \`resolvedAt\` timestamp,
  CONSTRAINT \`alert_events_id\` PRIMARY KEY(\`id\`)
);

CREATE TABLE IF NOT EXISTS \`alert_recipients\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`alertEventId\` int NOT NULL,
  \`userId\` int NOT NULL,
  \`rasRoleAtTime\` enum('admin','responder','staff') NOT NULL,
  \`deliveryStatus\` enum('pending','delivered','failed') NOT NULL DEFAULT 'pending',
  \`deliveredAt\` timestamp,
  \`acknowledgedAt\` timestamp,
  \`responseStatus\` enum('acknowledged','responding'),
  \`responseUpdatedAt\` timestamp,
  CONSTRAINT \`alert_recipients_id\` PRIMARY KEY(\`id\`)
);

CREATE TABLE IF NOT EXISTS \`alert_status_updates\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`alertEventId\` int NOT NULL,
  \`statusType\` enum('active','response_in_progress','resolved') NOT NULL,
  \`shortMessage\` varchar(120),
  \`createdByUserId\` int NOT NULL,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT \`alert_status_updates_id\` PRIMARY KEY(\`id\`)
);

CREATE TABLE IF NOT EXISTS \`facility_alert_settings\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`facilityId\` int NOT NULL,
  \`orgId\` int,
  \`lockdownTemplate\` json,
  \`lockoutTemplate\` json,
  \`pushEnabled\` boolean NOT NULL DEFAULT true,
  \`escalationPreferences\` json,
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`facility_alert_settings_id\` PRIMARY KEY(\`id\`),
  CONSTRAINT \`facility_alert_settings_facilityId_unique\` UNIQUE(\`facilityId\`)
);

CREATE TABLE IF NOT EXISTS \`push_subscriptions\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`userId\` int NOT NULL,
  \`orgId\` int,
  \`subscription\` json NOT NULL,
  \`userAgent\` text,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`push_subscriptions_id\` PRIMARY KEY(\`id\`)
);

ALTER TABLE \`users\` ADD COLUMN IF NOT EXISTS \`rasRole\` enum('admin','responder','staff') DEFAULT NULL;
`;

const conn = await createConnection(process.env.DATABASE_URL);
const statements = sql.split(";").map(s => s.trim()).filter(s => s.length > 0);
for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    console.log("OK:", stmt.slice(0, 60).replace(/\n/g, " ") + "...");
  } catch (e) {
    console.error("FAIL:", e.message, "\nSQL:", stmt.slice(0, 80));
  }
}
await conn.end();
console.log("Migration complete.");
