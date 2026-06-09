// KOMPASSI - Database Seed
// Creates demo tenants for FREE, PRO, and ENTERPRISE plans.
// Seeds admin users with hashed passwords for login.
// Run: npx prisma db seed

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

function generateApiKey(): string {
  const prefix = "kp_";
  const random = crypto.randomBytes(24).toString("base64url");
  return `${prefix}${random}`;
}

const tenants = [
  {
    name: "Startup Labs",
    slug: "startup-labs",
    plan: "FREE" as const,
    queriesPerDay: 50,
    users: [
      { email: "alice@startuplabs.dev", name: "Alice Chen", role: "ADMIN" },
      { email: "bob@startuplabs.dev", name: "Bob Kim", role: "MEMBER" },
    ],
  },
  {
    name: "DataWorks Inc",
    slug: "dataworks",
    plan: "PRO" as const,
    queriesPerDay: 1000,
    users: [
      {
        email: "carol@dataworks.io",
        name: "Carol Martinez",
        role: "ADMIN",
      },
      {
        email: "dave@dataworks.io",
        name: "Dave Patel",
        role: "MEMBER",
      },
    ],
  },
  {
    name: "GenTech Corp",
    slug: "gentech",
    plan: "ENTERPRISE" as const,
    queriesPerDay: 10000,
    users: [
      {
        email: "eve@gentech.com",
        name: "Eve Johansson",
        role: "ADMIN",
      },
      {
        email: "frank@gentech.com",
        name: "Frank Okafor",
        role: "MEMBER",
      },
      {
        email: "grace@gentech.com",
        name: "Grace Liu",
        role: "MEMBER",
      },
    ],
  },
];

async function main() {
  console.log(" Seeding KOMPASSI database...\n");

  // ─── Platform Superadmin ────────────────────────────────────────────
  // No tenant — sees all companies in the admin dashboard.
  const superadminPw = await hashPassword("kompassi123");
  await prisma.user.upsert({
    where: { email: "superadmin@kompassi.dev" },
    update: { password: superadminPw },
    create: {
      email: "superadmin@kompassi.dev",
      name: "Platform Admin",
      password: superadminPw,
      role: "SUPERADMIN",
    },
  });
  console.log("  Platform Superadmin");
  console.log("    Email:    superadmin@kompassi.dev");
  console.log("    Password: kompassi123");
  console.log("    Role:     SUPERADMIN (no tenant — sees everything)\n");

  for (const t of tenants) {
    const apiKey = generateApiKey();

    const tenant = await prisma.tenant.upsert({
      where: { slug: t.slug },
      update: {},
      create: {
        name: t.name,
        slug: t.slug,
        plan: t.plan,
        queriesPerDay: t.queriesPerDay,
        apiKey,
      },
    });

    console.log(`  ${t.name} (${t.plan})`);
    console.log(`    API Key: ${apiKey}`);
    console.log(`    ID:      ${tenant.id}`);

    for (const u of t.users) {
      const hashedPw = await hashPassword("kompassi123");

      await prisma.user.upsert({
        where: { email: u.email },
        update: { password: hashedPw },
        create: {
          email: u.email,
          name: u.name,
          password: hashedPw,
          role: u.role,
          tenantId: tenant.id,
        },
      });
    }
    console.log(`    Users:   ${t.users.map((u) => u.name).join(", ")}`);
    console.log(`    Default password for all users: kompassi123\n`);
  }

  console.log("Done. Login credentials:");
  console.log("  PLATFORM ADMIN (sees all companies):");
  console.log("    Email:    superadmin@kompassi.dev");
  console.log("    Password: kompassi123");
  console.log("    Goes to:  /admin/dashboard\n");
  console.log("  TENANT USERS (see only their company):");
  console.log("    Email:    alice@startuplabs.dev  (or any seeded user)");
  console.log("    Password: kompassi123");
  console.log("    Goes to:  /workspace\n");
  console.log("For API access (x-api-key header):");
  console.log("  Use the API keys printed above.\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
