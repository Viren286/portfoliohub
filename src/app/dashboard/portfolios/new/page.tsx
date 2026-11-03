import { redirect } from "next/navigation";
import { renderPortfolio } from "@/engine/generate";
import { db } from "@/lib/db";
import { getEntitlements, unlimited } from "@/lib/entitlements";
import { env } from "@/lib/env";
import { loadPortfolioData } from "@/lib/profile";
import { SAMPLES } from "@/lib/samples";
import { requireUser } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { NewPortfolioForm } from "./new-portfolio-form";

export const metadata = { title: "New portfolio" };

export default async function NewPortfolioPage() {
  const user = await requireUser();
  const { e, plan } = await getEntitlements(user);
  const count = await db.portfolio.count({ where: { userId: user.id } });
  if (!unlimited(e.maxPortfolios) && count >= e.maxPortfolios) redirect("/dashboard");

  const templates = await db.template.findMany({ where: plan === "ADMIN" ? {} : { isEnabled: true }, orderBy: { createdAt: "asc" } });
  const data = await loadPortfolioData(user.id, user.name);
  const hasContent = !!(data.projects?.length || data.experience?.length || data.personal.about || data.education?.length);
  const options = templates.map((t) => {
    const source = hasContent ? data : SAMPLES[t.slug]?.data ?? data;
    let html = "";
    try {
      html = renderPortfolio(source, t.slug, {}, { mode: "preview", appUrl: env.appUrl, showBranding: false }).html;
    } catch {
      html = "";
    }
    return { slug: t.slug, name: t.name, description: t.description, tier: t.tier, locked: !e.templateTiers.includes(t.tier), html };
  });

  const base = slugify(user.name) || "me";
  let suggestion = base.length >= 3 ? base : `${base}-portfolio`;
  for (let i = 2; await db.portfolio.findUnique({ where: { slug: suggestion }, select: { id: true } }); i++) suggestion = `${base}-${i}`.slice(0, 30);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <p className="eyebrow">New portfolio</p>
      <h1 className="display mt-2 text-5xl">Pick a design.</h1>
      <p className="mt-3 text-ink-2">{hasContent ? "These previews use your own details." : "Previews show sample content until you fill in your details."} You can switch designs any time.</p>
      <NewPortfolioForm options={options} suggestedSlug={suggestion} sitesDomain={env.deployTarget === "cloudflare" ? env.sitesDomain : null} appUrl={env.appUrl} defaultName={`${user.name.split(" ")[0]}'s portfolio`} />
    </div>
  );
}
