/**
 * Grants the admin role to an existing account.
 *   npm run admin:grant -- you@example.com
 *
 * The account must already have signed up, and the email must also be listed in
 * ADMIN_EMAILS: the app checks both, so a stray DB edit alone grants nothing.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run admin:grant -- <email>");
  process.exit(1);
}
const allow = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
if (!allow.includes(email)) {
  console.error(`${email} is not in ADMIN_EMAILS. Add it to your environment first.`);
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
db.user
  .update({ where: { email }, data: { role: "admin" } })
  .then((u) => console.log(`✔ ${u.email} is now an admin. Sign in and enable 2FA in Settings to open /admin.`))
  .catch(() => {
    console.error(`No account with email ${email}. Sign up first.`);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
