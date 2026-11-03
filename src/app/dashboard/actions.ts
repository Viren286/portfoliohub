"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CustomizationSchema, SECTION_KEYS } from "@/engine/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEntitlements, unlimited } from "@/lib/entitlements";
import { ProfileFormSchema, saveProfile } from "@/lib/profile";
import { publishPortfolio, PublishError, rollbackPortfolio, unpublishPortfolio } from "@/lib/publish";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import { slugProblem } from "@/lib/slug";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export async function saveProfileAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const rl = await rateLimit(`save:${user.id}`, 30, 60);
  if (!rl.ok) return fail("You're saving very quickly. Wait a few seconds.");
  const parsed = ProfileFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Some fields are invalid");
  await saveProfile(user.id, parsed.data);
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function checkSlugAction(slug: string, portfolioId?: string): Promise<{ ok: boolean; message: string }> {
  await requireUser();
  const s = slug.trim().toLowerCase();
  const problem = slugProblem(s);
  if (problem) return { ok: false, message: problem };
  const taken = await db.portfolio.findFirst({ where: { slug: s, ...(portfolioId ? { id: { not: portfolioId } } : {}) }, select: { id: true } });
  return taken ? { ok: false, message: "That address is taken." } : { ok: true, message: "Available" };
}

const CreateSchema = z.object({ name: z.string().trim().min(1).max(60), slug: z.string().trim().toLowerCase(), templateSlug: z.string().max(60) });

export async function createPortfolioAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) return fail("Please fill in a name, an address and a template");
  const { name, slug, templateSlug } = parsed.data;

  const { e, plan } = await getEntitlements(user);
  const count = await db.portfolio.count({ where: { userId: user.id } });
  if (!unlimited(e.maxPortfolios) && count >= e.maxPortfolios)
    return fail(`Your ${plan.toLowerCase()} plan includes ${e.maxPortfolios} portfolio${e.maxPortfolios === 1 ? "" : "s"}. Edit your existing one, or upgrade for more.`);

  const problem = slugProblem(slug);
  if (problem) return fail(problem);
  const template = await db.template.findUnique({ where: { slug: templateSlug } });
  if (!template?.currentVersionId || (!template.isEnabled && plan !== "ADMIN")) return fail("That template isn't available");
  if (!e.templateTiers.includes(template.tier)) return fail("That template needs the Pro plan");

  try {
    const p = await db.portfolio.create({
      data: { userId: user.id, name, slug, templateId: template.id, templateVersionId: template.currentVersionId },
    });
    revalidatePath("/dashboard");
    return { ok: true, id: p.id };
  } catch {
    return fail("That address is taken. Try another.");
  }
}

const UpdateSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(60),
  slug: z.string().trim().toLowerCase(),
  templateSlug: z.string().max(60),
  customDomain: z.string().trim().toLowerCase().max(253).optional().default(""),
  customization: CustomizationSchema,
  sections: z.object({ order: z.array(z.enum(SECTION_KEYS)), hidden: z.array(z.enum(SECTION_KEYS)) }),
});

export async function updatePortfolioAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid settings");
  const d = parsed.data;
  const p = await db.portfolio.findUnique({ where: { id: d.id } });
  if (!p || p.userId !== user.id) return fail("Portfolio not found");

  const { e, plan } = await getEntitlements(user);
  const template = await db.template.findUnique({ where: { slug: d.templateSlug } });
  if (!template?.currentVersionId) return fail("Unknown template");
  if (template.id !== p.templateId) {
    if (!template.isEnabled && plan !== "ADMIN") return fail("That template isn't available");
    if (!e.templateTiers.includes(template.tier)) return fail("That template needs the Pro plan");
  }
  if (d.slug !== p.slug) {
    if (p.liveDeploymentId) return fail("Unpublish the site before changing its address");
    const problem = slugProblem(d.slug);
    if (problem) return fail(problem);
  }
  let customDomain: string | null = null;
  if (d.customDomain) {
    if (!e.customDomains) return fail("Custom domains are a Pro feature");
    if (!/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(d.customDomain)) return fail("That doesn't look like a valid domain");
    customDomain = d.customDomain;
  }

  try {
    await db.portfolio.update({
      where: { id: p.id },
      data: {
        name: d.name,
        slug: d.slug,
        customDomain,
        templateId: template.id,
        templateVersionId: template.id === p.templateId ? p.templateVersionId : template.currentVersionId,
        customization: d.customization,
        sections: d.sections,
      },
    });
  } catch {
    return fail("That address or domain is already in use");
  }
  revalidatePath(`/dashboard/portfolios/${p.id}`);
  return { ok: true };
}

export async function publishAction(id: string): Promise<ActionResult<{ url: string }>> {
  const user = await requireUser();
  try {
    const d = await publishPortfolio(user, id);
    revalidatePath(`/dashboard/portfolios/${id}`);
    revalidatePath("/dashboard");
    return { ok: true, url: d.url ?? "" };
  } catch (e) {
    revalidatePath(`/dashboard/portfolios/${id}`);
    return fail(e instanceof PublishError ? e.message : "Publishing failed. Please try again.");
  }
}

export async function rollbackAction(id: string, deploymentId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await rollbackPortfolio(user, id, deploymentId);
    revalidatePath(`/dashboard/portfolios/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e instanceof PublishError ? e.message : "Rollback failed");
  }
}

export async function unpublishAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const p = await db.portfolio.findUnique({ where: { id } });
  if (!p || p.userId !== user.id) return fail("Portfolio not found");
  if (p.status === "SUSPENDED") return fail("This portfolio is suspended");
  await unpublishPortfolio(p);
  revalidatePath(`/dashboard/portfolios/${id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deletePortfolioAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const p = await db.portfolio.findUnique({ where: { id } });
  if (!p || p.userId !== user.id) return fail("Portfolio not found");
  if (p.liveDeploymentId) await unpublishPortfolio(p);
  await db.portfolio.delete({ where: { id } });
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function resendVerificationAction(): Promise<ActionResult> {
  const user = await requireUser();
  if (user.emailVerified) return { ok: true };
  const rl = await rateLimit(`verify:${user.id}`, 3, 600);
  if (!rl.ok) return fail("We've sent a few already. Check your inbox (and spam).");
  await auth.api.sendVerificationEmail({ body: { email: user.email, callbackURL: "/dashboard" }, headers: await headers() });
  return { ok: true };
}
