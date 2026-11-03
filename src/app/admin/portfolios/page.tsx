import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { StatusBadge } from "@/components/status-badge";
import { ActionButton } from "../admin-bits";
import { suspendPortfolioAction } from "../actions";

export const metadata = { title: "Portfolios" };

export default async function AdminPortfolios(props: PageProps<"/admin/portfolios">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const userId = typeof sp.user === "string" ? sp.user : undefined;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const [portfolios, deployments] = await Promise.all([
    db.portfolio.findMany({
      where: { ...(userId ? { userId } : {}), ...(status ? { status: status as never } : {}) },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { user: { select: { email: true } }, template: { select: { name: true } }, _count: { select: { deployments: true } } },
    }),
    db.portfolioDeployment.findMany({ orderBy: { createdAt: "desc" }, take: 25, include: { portfolio: { select: { slug: true } } } }),
  ]);
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Portfolios</p>
          <h1 className="display mt-2 text-5xl">Generated sites</h1>
        </div>
        <form className="flex gap-2">
          <select name="status" defaultValue={status ?? ""} className="input w-44">
            <option value="">All statuses</option>
            {["LIVE", "DRAFT", "PUBLISHING", "FAILED", "UNPUBLISHED", "SUSPENDED"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn-ink">Filter</button>
        </form>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
            <tr><th className="p-3">Site</th><th>Owner</th><th>Template</th><th>Status</th><th>Deploys</th><th>Updated</th><th className="p-3 text-right">Moderation</th></tr>
          </thead>
          <tbody>
            {portfolios.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="p-3">
                  <p className="font-medium">{p.name}</p>
                  {p.liveUrl ? <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-signal-ink hover:underline">{p.liveUrl.replace(/^https?:\/\//, "")}</a> : <span className="font-mono text-xs text-muted">{p.slug}</span>}
                </td>
                <td className="text-muted">{p.user.email}</td>
                <td>{p.template.name}</td>
                <td><StatusBadge status={p.status} /></td>
                <td className="tabular-nums">{p._count.deployments}</td>
                <td className="text-muted">{p.updatedAt.toLocaleDateString("en-IN")}</td>
                <td className="p-3 text-right">
                  {p.status === "SUSPENDED" ? (
                    <ActionButton action={suspendPortfolioAction.bind(null, p.id, false)}>Restore</ActionButton>
                  ) : (
                    <ActionButton action={suspendPortfolioAction.bind(null, p.id, true)} confirmText={`Take ${p.slug} offline?`} className="btn btn-sm border border-bad/40 text-bad hover:bg-bad/5">Suspend</ActionButton>
                  )}
                </td>
              </tr>
            ))}
            {portfolios.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted">No portfolios.</td></tr>}
          </tbody>
        </table>
      </div>

      <section>
        <h2 className="text-xl font-semibold">Latest deployments</h2>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
              <tr><th className="p-3">Site</th><th>Status</th><th>Target</th><th>Files</th><th>Duration</th><th>Error</th><th className="p-3">When</th></tr>
            </thead>
            <tbody>
              {deployments.map((d) => (
                <tr key={d.id} className="border-b border-line last:border-0">
                  <td className="p-3 font-mono">{d.portfolio.slug}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td>{d.target}</td>
                  <td className="tabular-nums">{d.fileCount ?? "–"}</td>
                  <td className="tabular-nums">{d.durationMs ? `${(d.durationMs / 1000).toFixed(1)}s` : "–"}</td>
                  <td className="max-w-xs truncate text-bad">{d.errorMessage}</td>
                  <td className="p-3 text-muted">{d.createdAt.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
