import "server-only";
import { generatePortfolio, EngineError } from "@/engine/generate";
import { getDeployer } from "@/engine/deployers";
import type { Customization, SectionKey } from "@/engine/schema";
import { audit } from "./audit";
import { db } from "./db";
import { getEntitlements, unlimited } from "./entitlements";
import { env } from "./env";
import { loadPortfolioData } from "./profile";
import { rateLimit } from "./rate-limit";
import type { SessionUser } from "./session";

export class PublishError extends Error {
  constructor(message: string, public code = "PUBLISH_FAILED") {
    super(message);
  }
}

export function portfolioCustomization(p: { customization: unknown; sections: unknown }): Customization {
  const c = (p.customization ?? {}) as Customization;
  const s = (p.sections ?? {}) as { order?: SectionKey[]; hidden?: SectionKey[] };
  return { ...c, sectionOrder: s.order ?? c.sectionOrder, hiddenSections: s.hidden ?? c.hiddenSections };
}

/**
 * Builds and deploys a portfolio. The previous version stays live if anything fails.
 * Returns the deployment row (status LIVE or FAILED).
 */
export async function publishPortfolio(user: SessionUser, portfolioId: string) {
  const portfolio = await db.portfolio.findUnique({ where: { id: portfolioId }, include: { template: true } });
  if (!portfolio || portfolio.userId !== user.id) throw new PublishError("Portfolio not found", "NOT_FOUND");
  if (user.banned) throw new PublishError("Your account is suspended", "SUSPENDED");
  if (portfolio.status === "SUSPENDED") throw new PublishError("This portfolio has been suspended by an administrator", "SUSPENDED");
  if (env.requireEmailVerification && !user.emailVerified) throw new PublishError("Verify your email address before publishing", "EMAIL_UNVERIFIED");

  const { e, plan } = await getEntitlements(user);
  if (!portfolio.template.isEnabled && plan !== "ADMIN") throw new PublishError("This template is currently unavailable. Pick another one.", "TEMPLATE_DISABLED");
  if (!e.templateTiers.includes(portfolio.template.tier)) throw new PublishError("This template needs the Pro plan", "UPGRADE_REQUIRED");
  if (!unlimited(e.maxDeploysPerDay)) {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const count = await db.portfolioDeployment.count({ where: { triggeredById: user.id, createdAt: { gte: since } } });
    if (count >= e.maxDeploysPerDay) throw new PublishError(`Daily publish limit reached (${e.maxDeploysPerDay}/day on your plan)`, "LIMIT");
  }
  const rl = await rateLimit(`publish:${user.id}`, 6, 60);
  if (!rl.ok) throw new PublishError(`Slow down: try again in ${rl.retryAfter}s`, "RATE_LIMIT");

  const deployer = getDeployer();
  const deployment = await db.portfolioDeployment.create({
    data: { portfolioId, templateVersionId: portfolio.templateVersionId, target: deployer.target, triggeredById: user.id, status: "QUEUED" },
  });
  await db.portfolio.update({ where: { id: portfolioId }, data: { status: "PUBLISHING" } });
  const started = Date.now();

  try {
    const data = await loadPortfolioData(user.id, user.name);
    const result = await generatePortfolio(data, portfolio.template.slug, portfolioCustomization(portfolio), {
      portfolioId,
      deploymentId: deployment.id,
      slug: portfolio.slug,
      customDomain: e.customDomains ? portfolio.customDomain : null,
      appUrl: env.appUrl,
      showBranding: !e.removeBranding,
      deployer,
      onStage: async (stage) => {
        await db.portfolioDeployment.update({ where: { id: deployment.id }, data: { status: stage } });
      },
    });

    const [, done] = await db.$transaction([
      db.portfolioDeployment.updateMany({ where: { portfolioId, status: "LIVE", id: { not: deployment.id } }, data: { status: "SUPERSEDED" } }),
      db.portfolioDeployment.update({
        where: { id: deployment.id },
        data: {
          status: "LIVE",
          url: result.url,
          storagePrefix: result.storagePrefix,
          fileCount: result.fileCount,
          totalBytes: result.totalBytes,
          snapshot: result.snapshot as object,
          durationMs: Date.now() - started,
          finishedAt: new Date(),
        },
      }),
      db.portfolio.update({ where: { id: portfolioId }, data: { status: "LIVE", liveDeploymentId: deployment.id, liveUrl: result.url } }),
    ]);
    await bumpUsage(user.id, "deploys");
    return done;
  } catch (err) {
    const code = err instanceof EngineError ? err.code : "UNEXPECTED";
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[publish] failed", portfolioId, code, message);
    await db.$transaction([
      db.portfolioDeployment.update({
        where: { id: deployment.id },
        data: { status: "FAILED", errorCode: code, errorMessage: message.slice(0, 500), durationMs: Date.now() - started, finishedAt: new Date() },
      }),
      db.portfolio.update({ where: { id: portfolioId }, data: { status: portfolio.liveDeploymentId ? "LIVE" : "FAILED" } }),
    ]);
    throw new PublishError(code === "MISSING_NAME" ? "Add your name in the profile editor first" : `Publishing failed: ${message}`, code);
  }
}

/** Points the live site back at an earlier successful deployment. */
export async function rollbackPortfolio(user: SessionUser, portfolioId: string, deploymentId: string) {
  const portfolio = await db.portfolio.findUnique({ where: { id: portfolioId } });
  if (!portfolio || portfolio.userId !== user.id) throw new PublishError("Portfolio not found", "NOT_FOUND");
  if (portfolio.status === "SUSPENDED") throw new PublishError("This portfolio is suspended", "SUSPENDED");
  const target = await db.portfolioDeployment.findFirst({
    where: { id: deploymentId, portfolioId, status: { in: ["LIVE", "SUPERSEDED"] }, storagePrefix: { not: null } },
  });
  if (!target) throw new PublishError("That version can't be restored", "NOT_FOUND");
  const deployer = getDeployer();
  if (target.target !== deployer.target) throw new PublishError("That version was published to a different host", "TARGET_MISMATCH");
  await deployer.setPointer(portfolio.slug, portfolio.customDomain, { portfolioId, deploymentId, state: "live", updatedAt: new Date().toISOString() });
  await db.$transaction([
    db.portfolioDeployment.updateMany({ where: { portfolioId, status: "LIVE" }, data: { status: "SUPERSEDED" } }),
    db.portfolioDeployment.update({ where: { id: deploymentId }, data: { status: "LIVE" } }),
    db.portfolio.update({ where: { id: portfolioId }, data: { status: "LIVE", liveDeploymentId: deploymentId, liveUrl: target.url } }),
  ]);
}

export async function unpublishPortfolio(portfolio: { id: string; slug: string; customDomain: string | null }) {
  await getDeployer().unpublish(portfolio.slug, portfolio.customDomain);
  await db.$transaction([
    db.portfolioDeployment.updateMany({ where: { portfolioId: portfolio.id, status: "LIVE" }, data: { status: "SUPERSEDED" } }),
    db.portfolio.update({ where: { id: portfolio.id }, data: { status: "UNPUBLISHED", liveDeploymentId: null } }),
  ]);
}

/** Admin: flip a portfolio's edge pointer to "suspended" (visitors see a neutral page) or back. */
export async function setPortfolioSuspended(actorId: string, portfolioId: string, suspended: boolean) {
  const p = await db.portfolio.findUnique({ where: { id: portfolioId } });
  if (!p) throw new PublishError("Portfolio not found", "NOT_FOUND");
  if (p.liveDeploymentId) {
    await getDeployer().setPointer(p.slug, p.customDomain, {
      portfolioId: p.id,
      deploymentId: p.liveDeploymentId,
      state: suspended ? "suspended" : "live",
      updatedAt: new Date().toISOString(),
    });
  }
  await db.portfolio.update({
    where: { id: p.id },
    data: { status: suspended ? "SUSPENDED" : p.liveDeploymentId ? "LIVE" : "DRAFT" },
  });
  await audit(actorId, suspended ? "portfolio.suspend" : "portfolio.restore", "portfolio", p.id, { slug: p.slug });
}

async function bumpUsage(userId: string, metric: string) {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  await db.usageRecord.upsert({
    where: { userId_metric_periodStart: { userId, metric, periodStart } },
    update: { quantity: { increment: 1 } },
    create: { userId, metric, periodStart, quantity: 1 },
  });
}
