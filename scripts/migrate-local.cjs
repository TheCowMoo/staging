#!/usr/bin/env node
const mysql = require("mysql2/promise");

async function main() {
  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "Marketingcow1!",
    database: "safeguard",
  });

  console.log("Connected to local MySQL");

  await conn.execute(`CREATE TABLE IF NOT EXISTS training_modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orgId INT NULL,
    createdByUserId INT NOT NULL,
    courseTitle VARCHAR(255) NOT NULL,
    launchPath TEXT NOT NULL,
    thumbnailUrl TEXT NULL,
    playerType VARCHAR(50) NOT NULL DEFAULT "Articulate_Storyline_Web",
    trackingType VARCHAR(50) NOT NULL DEFAULT "None",
    storagePrefix VARCHAR(512) NOT NULL,
    sourceFileName VARCHAR(500) NULL,
    metaJson TEXT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_training_modules_orgId (orgId),
    INDEX idx_training_modules_createdByUserId (createdByUserId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  console.log("training_modules table OK");

  await conn.execute(`CREATE TABLE IF NOT EXISTS notifications (
    id int NOT NULL AUTO_INCREMENT,
    user_id int NOT NULL,
    org_id int,
    type varchar(64) NOT NULL,
    title varchar(255) NOT NULL,
    body text,
    link varchar(512),
    metadata json,
    \`read\` boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user_id (user_id),
    KEY idx_read (user_id, \`read\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  console.log("notifications table OK");

  await conn.end();
  console.log("Done!");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});