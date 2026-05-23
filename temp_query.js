import mysql from "mysql2/promise";

async function getMigrationTables() {
  const connection = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "Marketingcow1!",
    database: "safeguard"
  });

  try {
    const [tables] = await connection.execute("SHOW TABLES");
    console.log("Tables in safeguard database:");
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log("- " + tableName);
    });
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await connection.end();
  }
}

getMigrationTables();
