import mysql from "mysql2/promise";

(async () => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: "127.0.0.1",
      user: "root",
      password: "Marketingcow1!",
      database: "safeguard"
    });

    const columns = [
      { name: "rasRole", definition: "enum(\"admin\",\"responder\",\"staff\") DEFAULT NULL" },
      { name: "btamRole", definition: "enum(\"none\",\"tat_admin\",\"assessor\",\"reporter\",\"read_only\") DEFAULT \"none\"" },
      { name: "passwordHash", definition: "varchar(128) DEFAULT NULL" },
      { name: "passwordSalt", definition: "varchar(64) DEFAULT NULL" },
      { name: "emailVerified", definition: "boolean DEFAULT false NOT NULL" },
      { name: "emailVerifyToken", definition: "varchar(128) DEFAULT NULL" },
      { name: "passwordResetToken", definition: "varchar(128) DEFAULT NULL" },
      { name: "passwordResetExpiresAt", definition: "timestamp DEFAULT NULL" },
      { name: "ghlContactId", definition: "varchar(64) DEFAULT NULL" }
    ];

    for (const col of columns) {
      try {
        const [rows] = await connection.query("SHOW COLUMNS FROM users WHERE Field = ?", [col.name]);
        
        if (rows.length > 0) {
          console.log("✓ Column '" + col.name + "' already exists - SKIPPED");
        } else {
          await connection.query("ALTER TABLE users ADD COLUMN `" + col.name + "` " + col.definition);
          console.log("✓ Column '" + col.name + "' added successfully");
        }
      } catch (err) {
        console.log("✗ Column '" + col.name + "' - ERROR: " + err.message);
      }
    }

    console.log("\nAll operations completed.");
    await connection.end();
  } catch (err) {
    console.error("Connection error:", err.message);
    process.exit(1);
  }
})();
