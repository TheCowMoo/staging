import mysql from "mysql2/promise";

async function run() {
  const conn = await mysql.createConnection("mysql://root:Marketingcow1!@127.0.0.1:3306/safeguard");
  await conn.execute(`CREATE TABLE IF NOT EXISTS api_keys (
    id int AUTO_INCREMENT NOT NULL PRIMARY KEY,
    userId int,
    orgId int,
    label varchar(255) NOT NULL,
    keyHash varchar(255) NOT NULL,
    permissions json,
    createdAt timestamp NOT NULL DEFAULT NOW()
  )`);
  console.log("Table created successfully");
  await conn.end();
}
run().catch(e => { console.error(e); process.exit(1); });