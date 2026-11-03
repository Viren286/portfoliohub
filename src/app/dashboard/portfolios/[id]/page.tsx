import { notFound } from "next/navigation";
import { renderPortfolio } from "@/engine/generate";
import type { Customization } from "@/engine/schema";
import { FONTS, SECTION_TITLES } from "@/engine/view-model";
import { getDeployer } from "@/engine/deployers";
import { TEMPLATES } from "@/templates";
import { db } from "@/lib/db";
import { getEntitlements } from "@/lib/entitlements";
import { env } from "@/lib/env";
import { loadPortfolioData } from "@/lib/profile";
import { requireUser } from "@/lib/session";
import { Studio } from "./studio";

export const metadata = { title: "Customize & publish" };

export default async function PortfolioPage(props: PageProps<"/dashboard/portfolios/[id]">) {
  const user = await requireUser();
  const { id } = await props.params;
  const portfolio = await db.portfolio.findUnique({
    where: { id },
    include: { template: true, deployments: { orderBy: { createdAt: "desc" }, take: 12 } },
  });
  if (!portfolio || portfolio.userId !== user.id) notFound();

  const { e, plan } = await getEntitlements(user);
  const templates = await db.template.findMany({ where: plan === "ADMIN" ? {} : { OR: [{ isEnabled: true }, { id: portfolio.templateId }] }, orderBy: { createdAt: "asc" } });

  // Which sections have content right now (so the section list can say "empty")
  const data = await loadPortfolioData(user.id, user.name);
  let available: string[] = [];
  try {
    available = renderPortfolio(data, portfolio.template.slug, {}, { mode: "preview", appUrl: env.appUrl, showBranding: false }).vm.sections.map((s) => s.key);
  } catch {
    available = [];
  }

  const deployer = getDeployer();
  const sections = (portfolio.sections ?? {}) as { order?: string[]; hidden?: string[] };

  return (
    <Studio
      portfolio={{
        id: portfolio.id,
        name: portfolio.name,
        slug: portfolio.slug,
        customDomain: portfolio.customDomain ?? "",
        templateSlug: portfolio.template.slug,
        status: portfolio.status,
        liveUrl: portfolio.liveUrl,
        liveDeploymentId: portfolio.liveDeploymentId,
        customization: (portfolio.customization ?? {}) as Customization,
        order: sections.order ?? [],
        hidden: sections.hidden ?? [],
      }}
      templates={templates.map((t) => ({
        slug: t.slug,
        name: t.name,
        tier: t.tier,
        locked: !e.templateTiers.includes(t.tier),
        defaults: TEMPLATES[t.slug]?.defaults ?? {},
      }))}
      deployments={portfolio.deployments.map((d) => ({
        id: d.id,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
        durationMs: d.durationMs,
        url: d.url,
        errorMessage: d.errorMessage,
        canRestore: d.status === "SUPERSEDED" && !!d.storagePrefix && d.target === deployer.target,
      }))}
      fonts={Object.entries(FONTS).map(([k, v]) => ({ key: k, label: v.label }))}
      sectionTitles={SECTION_TITLES}
      available={available}
      canCustomDomain={e.customDomains}
      siteHint={deployer.siteUrl(portfolio.slug, null)}
      emailVerified={user.emailVerified || !env.requireEmailVerification}
    />
  );
}
