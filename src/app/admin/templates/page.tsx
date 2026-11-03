import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ActionButton } from "../admin-bits";
import { syncTemplatesAction } from "../actions";
import { TemplateRow } from "./template-row";

export const metadata = { title: "Templates" };

export default async function AdminTemplates() {
  await requireAdmin();
  const templates = await db.template.findMany({ orderBy: { createdAt: "asc" }, include: { currentVersion: true, _count: { select: { portfolios: true } } } });
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Templates</p>
          <h1 className="display mt-2 text-5xl">Template library</h1>
          <p className="mt-3 max-w-2xl text-ink-2">Templates are code (in <code className="font-mono text-sm">src/templates</code>). Add a new one there, deploy, then press Sync to register it. New templates start disabled.</p>
        </div>
        <ActionButton action={syncTemplatesAction} className="btn-ink">Sync from code</ActionButton>
      </div>
      <div className="space-y-4">
        {templates.map((t) => (
          <TemplateRow key={t.id} t={{ id: t.id, slug: t.slug, name: t.name, description: t.description, tier: t.tier, isEnabled: t.isEnabled, version: t.currentVersion?.version ?? "–", uses: t._count.portfolios }} />
        ))}
      </div>
    </div>
  );
}
