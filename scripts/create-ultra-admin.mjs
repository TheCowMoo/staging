import mysql from "mysql2/promise";
import { config } from "dotenv";

config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(url);

const email = "newuser@test.com";

try {
  // Check if user exists
  const [existing] = await conn.execute(
    "SELECT id, name, role FROM users WHERE email = ?",
    [email]
  );

  if (existing.length > 0) {
    const user = existing[0];
    console.log(`Found existing user: ${user.name} (${user.email}) with role: ${user.role}`);

    // Update role to ultra_admin
    await conn.execute(
      "UPDATE users SET role = 'ultra_admin' WHERE id = ?",
      [user.id]
    );

    console.log(`✅ Updated ${user.name} to ultra_admin role`);
  } else {
    console.log(`User ${email} not found. Creating new user...`);

    // Create new user with ultra_admin role
    const openId = `ultra_admin_${Date.now()}`;
    const tempPassword = `temp_${Math.random().toString(36).substring(2)}`;

    await conn.execute(`
      INSERT INTO users (openId, name, email, loginMethod, role, lastSignedIn, passwordHash, createdAt, updatedAt)
      VALUES (?, ?, ?, 'email', 'ultra_admin', NOW(), ?, NOW(), NOW())
    `, [openId, "New Ultra Admin User", email, tempPassword]);

    console.log(`✅ Created new user ${email} with ultra_admin role`);
  }
} catch (error) {
  console.error('Error updating user role:', error);
} finally {
  await conn.end();
}