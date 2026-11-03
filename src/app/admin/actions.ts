"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TEMPLATES } from "@/templates";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { EntitlementsSchema } from "@/lib/plans";
import { setPortfolioSuspended } from "@/lib/publish";
import { isAdminUser, requireAdmin } from "@/lib/session";

type Result = { ok: true; message?: string } | { ok: false; error: string };

export async function suspendUserAction(userId: string, reason = ""): Promise<Result> {
  const admin = await requireAdmin();
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "User not found" };
  if (target.id === admin.id || isAdminUser({ ...target, twoFactorEnabled: target.twoFactorEnabled })) return { ok: false, error: "Admins can't be suspended here" };
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { banned: true, banReason: reason.slice(0, 300) || "Suspended by admin" } }),
    db.session.deleteMany({ where: { userId } }), // sign them out everywhere
  ]);
  const portfolios = await db.portfolio.findMany({ where: { userId, status: { not: "SUSPENDED" } } });
  for (const p of portfolios) await setPortfolioSuspended(admin.id, p.id, true);
  await audit(admin.id, "user.suspend", "user", userId, { reason, portfolios: portfolios.length });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function restoreUserAction(userId: string): Promise<Result> {
  const admin = await requireAdmin();
  await db.user.update({ where: { id: userId }, data: { banned: false, banReason: null, banExpires: null } });
  const portfolios = await db.portfolio.findMany({ where: { userId, status: "SUSPENDED" } });
  for (const p of portfolios) await setPortfolioSuspended(admin.id, p.id, false);
  await audit(admin.id, "user.restore", "user", userId);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function setUserPlanAction(userId: string, planCode: string): Promise<Result> {
  const admin = await requireAdmin();
  const plan = await db.plan.findUnique({ where: { code: planCode } });
  if (!plan || plan.code === "ADMIN") return { ok: false, error: "Unknown plan" };
  if (plan.code === "FREE") await db.subscription.deleteMany({ where: { userId } });
  else
    await db.subscription.upsert({
      where: { userId },
      update: { planId: plan.id, status: "ACTIVE", provider: "manual" },
      create: { userId, planId: plan.id, status: "ACTIVE", provider: "manual" },
    });
  await audit(admin.id, "user.plan", "user", userId, { plan: plan.code });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function suspendPortfolioAction(portfolioId: string, suspend: boolean): Promise<Result> {
  const admin = await requireAdmin();
  try {
    await setPortfolioSuspended(admin.id, portfolioId, suspend);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
  revalidatePath("/admin/portfolios");
  return { ok: true };
}

const TemplateUpdate = z.object({ id: z.string(), name: z.string().trim().min(1).max(80), description: z.string().trim().max(400), tier: z.enum(["FREE", "PRO"]), isEnabled: z.boolean() });

export async function updateTemplateAction(input: unknown): Promise<Result> {
  const admin = await requireAdmin();
  const p = TemplateUpdate.safeParse(input);
  if (!p.success) return { ok: false, error: "Invalid template settings" };
  const { id, ...data } = p.data;
  await db.template.update({ where: { id }, data });
  await audit(admin.id, "template.update", "template", id, data);
  revalidatePath("/admin/templates");
  return { ok: true };
}

/** Registers templates that exist in code (new templates or new versions) in the database. */
export async function syncTemplatesAction(): Promise<Result> {
  const admin = await requireAdmin();
  let added = 0;
  for (const t of Object.values(TEMPLATES)) {
    const existing = await db.template.findUnique({ where: { slug: t.slug } });
    const template =
      existing ??
      (await db.template.create({ data: { slug: t.slug, name: t.name, category: t.category, description: t.description, tier: t.tier, has3D: t.has3D, isEnabled: false } }));
    if (!existing) added++;
    const version = await db.templateVersion.upsert({
      where: { templateId_version: { templateId: template.id, version: t.version } },
      update: {},
      create: { templateId: template.id, version: t.version, manifest: { slug: t.slug, defaults: t.defaults } },
    });
    await db.template.update({ where: { id: template.id }, data: { currentVersionId: version.id } });
  }
  await audit(admin.id, "template.sync", "template", "*", { added });
  revalidatePath("/admin/templates");
  return { ok: true, message: added ? `${added} new template(s) registered (disabled until you enable them).` : "Templates are up to date." };
}

export async function updatePlanAction(code: string, entitlementsJson: string, priceRupees: string): Promise<Result> {
  const admin = await requireAdmin();
  let parsed: unknown;
  try {
    parsed = JSON.parse(entitlementsJson);
  } catch {
    return { ok: false, error: "Entitlements must be valid JSON" };
  }
  const e = EntitlementsSchema.safeParse(parsed);
  if (!e.success) return { ok: false, error: `Invalid entitlements: ${e.error.issues[0]?.path.join(".")} ${e.error.issues[0]?.message}` };
  const price = priceRupees.trim() === "" ? null : Math.round(Number(priceRupees) * 100);
  if (price !== null && (!Number.isFinite(price) || price < 0)) return { ok: false, error: "Invalid price" };
  await db.plan.update({ where: { code }, data: { entitlements: e.data, pricePaise: price } });
  await audit(admin.id, "plan.update", "plan", code, { entitlements: e.data, pricePaise: price });
  revalidatePath("/admin/plans");
  return { ok: true };
}
