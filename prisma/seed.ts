/**
 * Seeds plans and registers the templates that exist in code.
 * Safe to run repeatedly: `npm run db:seed`.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_PLANS } from "../src/lib/plans";
import { TEMPLATES } from "../src/templates";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  for (const [code, plan] of Object.entries(DEFAULT_PLANS)) {
    await db.plan.upsert({
      where: { code },
      update: {}, // never overwrite limits an admin has edited
      create: { code, name: plan.name, pricePaise: plan.pricePaise, entitlements: plan.entitlements },
    });
  }

  for (const t of Object.values(TEMPLATES)) {
    const template = await db.template.upsert({
      where: { slug: t.slug },
      update: { name: t.name, category: t.category, description: t.description, has3D: t.has3D },
      create: { slug: t.slug, name: t.name, category: t.category, description: t.description, tier: t.tier, has3D: t.has3D },
    });
    const version = await db.templateVersion.upsert({
      where: { templateId_version: { templateId: template.id, version: t.version } },
      update: {},
      create: { templateId: template.id, version: t.version, manifest: { slug: t.slug, defaults: t.defaults } },
    });
    await db.template.update({ where: { id: template.id }, data: { currentVersionId: version.id } });
  }
  console.log(`Seeded ${Object.keys(DEFAULT_PLANS).length} plans and ${Object.keys(TEMPLATES).length} templates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
