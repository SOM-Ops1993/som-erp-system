/**
 * One-time admin bootstrap script.
 * Run ONCE from the backend folder:
 *   node src/setup-admin.js
 *
 * Creates / resets the admin user with a proper PBKDF2 hash.
 */
import "dotenv/config";
import { hashPassword } from "./middleware/auth.js";
import prisma from "./db.js";

const ADMIN_USER = "admin";
const ADMIN_PASSWORD = "Admin@2026!";
const ADMIN_NAME = "System Administrator";
const ADMIN_EMAIL = "admin@somphytopharma.com";

async function main() {
  console.log("Generating password hash…");
  const hash = hashPassword(ADMIN_PASSWORD);

  const existing = await prisma.$queryRaw`
    SELECT user_id FROM users WHERE username = ${ADMIN_USER} LIMIT 1
  `;

  if (existing.length > 0) {
    await prisma.$executeRaw`
      UPDATE users SET
        password_hash = ${hash},
        full_name     = ${ADMIN_NAME},
        role          = 'admin',
        is_active     = true
      WHERE username = ${ADMIN_USER}
    `;
    console.log("✅ Admin user password updated.");
  } else {
    await prisma.$executeRaw`
      INSERT INTO users (username, password_hash, full_name, role, email, is_active)
      VALUES (${ADMIN_USER}, ${hash}, ${ADMIN_NAME}, 'admin', ${ADMIN_EMAIL}, true)
    `;
    console.log("✅ Admin user created.");
  }

  console.log("");
  console.log("  Username : admin");
  console.log("  Password : Admin@2026!");
  console.log("");
  console.log("Login at: http://localhost:5173/erp/login");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
