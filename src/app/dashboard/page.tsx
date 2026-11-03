import Link from "next/link";
import { db } from "@/lib/db";
import { getEntitlements, unlimited } from "@/lib/entitlements";
import { requireUser } from "@/lib/session";
import { CopyButton } from "@/components/copy-button";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Your portfolios" };

const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function DashboardPage() {
  const user = await requireUser();
  const [portfolios, counts, profile, ent] = await Promise.all([
    db.portfolio.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { template: true, deployments: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    db.user.findUnique({
      where: { id: user.id },
      select: { _count: { select: { projects: true, experiences: true, education: true, skills: true } } },
    }),
    db.profile.findUnique({ where: { userId: user.id }, select: { headline: true, about: true, avatarFileId: true } }),
    getEntitlements(user),
  ]);
  const c = counts?._count;
  const checklist = [
    { done: !!profile?.headline, label: "Add a headline" },
    { done: !!profile?.about, label: "Write a short About" },
    { done: !!profile?.avatarFileId, label: "Upload a photo (optional)" },
    { done: (c?.projects ?? 0) > 0, label: "Add a project" },
    { done: (c?.skills ?? 0) > 0, label: "List your skills" },
  ];
  const progress = checklist.filter((x) => x.done).length;
  const canCreate = unlimited(ent.e.maxPortfolios) || portfolios.length < ent.e.maxPortfolios;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="display mt-2 text-5xl">Hi, {user.name.split(" ")[0]}.</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/profile" className="btn-ghost">Edit my details</Link>
          {canCreate ? (
            <Link href="/dashboard/portfolios/new" className="btn-ink">New portfolio</Link>
          ) : (
            <span className="text-sm text-muted">Plan limit reached ({ent.e.maxPortfolios})</span>
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          {portfolios.length === 0 ? (
            <div className="card flex flex-col items-start gap-4 p-10">
              <span className="display text-6xl italic text-signal">01</span>
              <h2 className="text-2xl font-semibold">Create your first portfolio</h2>
              <p className="max-w-lg text-ink-2">Fill in your details, choose a design, and publish. Your details are shared by all your portfolios, so you only type them once.</p>
              <div className="flex gap-3">
                <Link href="/dashboard/profile" className="btn-ghost">1. Fill in my details</Link>
                <Link href="/dashboard/portfolios/new" className="btn-signal">2. Pick a design</Link>
              </div>
            </div>
          ) : (
            <ul className="space-y-4">
              {portfolios.map((p) => (
                <li key={p.id} className="card flex flex-wrap items-center gap-6 p-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="truncate text-lg font-semibold">{p.name}</h2>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {p.template.name} · created {fmt(p.createdAt)}
                      {p.deployments[0] && ` · last publish ${fmt(p.deployments[0].createdAt)}`}
                    </p>
                    {p.liveUrl && p.status === "LIVE" && (
                      <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-mono text-sm text-signal-ink underline-offset-4 hover:underline">
                        {p.liveUrl.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {p.liveUrl && p.status === "LIVE" && <CopyButton text={p.liveUrl} />}
                    <Link href={`/dashboard/portfolios/${p.id}`} className="btn-ink btn-sm">Customize &amp; publish</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Your details</h3>
              <span className="text-sm text-muted">{progress}/{checklist.length}</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-2">
              <div className="h-full rounded-full bg-signal transition-all" style={{ width: `${(progress / checklist.length) * 100}%` }} />
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {checklist.map((x) => (
                <li key={x.label} className={`flex items-center gap-2 ${x.done ? "text-muted line-through" : "text-ink-2"}`}>
                  <span className={`grid size-4 place-items-center rounded-full border ${x.done ? "border-ok bg-ok text-white" : "border-line"}`}>{x.done && "✓"}</span>
                  {x.label}
                </li>
              ))}
            </ul>
            <Link href="/dashboard/profile" className="btn-ghost btn-sm mt-5 w-full">Open the editor</Link>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold">Plan</h3>
            <p className="mt-1 text-2xl font-semibold">{ent.plan === "ADMIN" ? "Founder (admin)" : ent.plan === "PRO" ? "Pro" : "Free"}</p>
            <ul className="mt-3 space-y-1 text-sm text-ink-2">
              <li>{unlimited(ent.e.maxPortfolios) ? "Unlimited" : ent.e.maxPortfolios} portfolio{ent.e.maxPortfolios === 1 ? "" : "s"}</li>
              <li>{ent.e.templateTiers.includes("PRO") ? "All templates" : "Free templates"}</li>
              <li>{ent.e.customDomains ? "Custom domains" : "portfoliohub.site address"}</li>
              <li>{unlimited(ent.e.maxDeploysPerDay) ? "Unlimited" : ent.e.maxDeploysPerDay} publishes / day</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
