import Link from "next/link";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requireAdmin } from "@/lib/session";
import { StatusBadge } from "@/components/status-badge";
import { Stat } from "./admin-bits";

const DAY = 24 * 3600 * 1000;
const fmtBytes = (n: number) => (n > 1e9 ? `${(n / 1e9).toFixed(2)} GB` : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`);

function timeWindows() {
  const now = Date.now();
  const d = new Date(now);
  return { now, since14: new Date(now - 14 * DAY), since7: new Date(now - 7 * DAY), monthStart: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)) };
}

export default async function AdminOverview() {
  await requireAdmin();
  const { now, since14, since7, monthStart } = timeWindows();

  const [users, verified, suspended, newUsers, portfolios, live, failedP, deploys7, ok7, avgDur, deploysMonth, storage, siteBytes, signups, failures, templateUse] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { emailVerified: true } }),
    db.user.count({ where: { banned: true } }),
    db.user.count({ where: { createdAt: { gte: since7 } } }),
    db.portfolio.count(),
    db.portfolio.count({ where: { status: "LIVE" } }),
    db.portfolio.count({ where: { status: "FAILED" } }),
    db.portfolioDeployment.count({ where: { createdAt: { gte: since7 } } }),
    db.portfolioDeployment.count({ where: { createdAt: { gte: since7 }, status: { in: ["LIVE", "SUPERSEDED"] } } }),
    db.portfolioDeployment.aggregate({ where: { createdAt: { gte: since7 }, durationMs: { not: null } }, _avg: { durationMs: true } }),
    db.portfolioDeployment.count({ where: { createdAt: { gte: monthStart } } }),
    db.uploadedFile.aggregate({ _sum: { sizeBytes: true } }),
    db.portfolioDeployment.aggregate({ _sum: { totalBytes: true } }),
    db.user.findMany({ where: { createdAt: { gte: since14 } }, select: { createdAt: true } }),
    db.portfolioDeployment.findMany({ where: { status: "FAILED" }, orderBy: { createdAt: "desc" }, take: 6, include: { portfolio: { select: { slug: true, id: true } } } }),
    db.template.findMany({ include: { _count: { select: { portfolios: true } } }, orderBy: { createdAt: "asc" } }),
  ]);

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now - (13 - i) * DAY);
    const key = d.toISOString().slice(0, 10);
    return { key, label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), n: signups.filter((s) => s.createdAt.toISOString().slice(0, 10) === key).length };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.n));
  const storageBytes = (storage._sum.sizeBytes ?? 0) + (siteBytes._sum.totalBytes ?? 0);
  const storageGb = storageBytes / 1e9;
  // Rough infra estimate from published rates (see docs/DEPLOYMENT.md): Vercel Pro $20, Workers Paid $5, R2 $0.015/GB over 10 GB.
  const estimate = 20 + (env.deployTarget === "cloudflare" ? 5 : 0) + Math.max(0, storageGb - 10) * 0.015;
  const successRate = deploys7 ? Math.round((ok7 / deploys7) * 100) : 100;

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Overview</p>
        <h1 className="display mt-2 text-5xl">Platform health</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Users" value={users} sub={`${newUsers} new this week · ${verified} verified`} />
        <Stat label="Live portfolios" value={live} sub={`${portfolios} total · ${failedP} failed`} />
        <Stat label="Deploys (7 days)" value={deploys7} sub={`${successRate}% success · avg ${((avgDur._avg.durationMs ?? 0) / 1000).toFixed(1)}s`} />
        <Stat label="Suspended accounts" value={suspended} />
        <Stat label="Storage used" value={fmtBytes(storageBytes)} sub="uploads + published versions" />
        <Stat label="Deploys this month" value={deploysMonth} sub={`target: ${env.deployTarget}`} />
        <Stat label="Est. infra cost / month" value={`$${estimate.toFixed(2)}`} sub="fixed plans + R2 storage over free tier" />
        <Stat label="Templates" value={templateUse.filter((t) => t.isEnabled).length} sub={`${templateUse.length} registered`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="card p-6">
          <h2 className="font-semibold">Signups, last 14 days</h2>
          <div className="mt-6 flex h-40 items-end gap-1.5" role="img" aria-label="Daily signups for the last 14 days">
            {days.map((d) => (
              <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] tabular-nums text-muted">{d.n || ""}</span>
                <div className="w-full rounded-t bg-ink" style={{ height: `${(d.n / maxDay) * 100}%`, minHeight: d.n ? 4 : 1, opacity: d.n ? 1 : 0.15 }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted"><span>{days[0].label}</span><span>{days[13].label}</span></div>
        </section>
        <section className="card p-6">
          <h2 className="font-semibold">Template usage</h2>
          <ul className="mt-4 space-y-3">
            {templateUse.map((t) => (
              <li key={t.id}>
                <div className="flex justify-between text-sm"><span>{t.name}{!t.isEnabled && <span className="ml-2 text-xs text-muted">disabled</span>}</span><span className="tabular-nums">{t._count.portfolios}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-paper-2"><div className="h-full rounded-full bg-signal" style={{ width: `${portfolios ? (t._count.portfolios / portfolios) * 100 : 0}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent failed deploys</h2>
          <Link href="/admin/portfolios" className="text-sm text-ink-2 underline underline-offset-4">All deploys</Link>
        </div>
        {failures.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No failures. 🎉</p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <tbody>
              {failures.map((f) => (
                <tr key={f.id} className="border-t border-line">
                  <td className="py-2 font-mono">{f.portfolio.slug}</td>
                  <td><StatusBadge status={f.status} /></td>
                  <td className="text-bad">{f.errorCode}: {f.errorMessage}</td>
                  <td className="text-right text-muted">{f.createdAt.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
