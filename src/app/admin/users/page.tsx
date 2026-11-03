import Link from "next/link";
import { db } from "@/lib/db";
import { isAdminUser, requireAdmin } from "@/lib/session";
import { ActionButton } from "../admin-bits";
import { restoreUserAction, setUserPlanAction, suspendUserAction } from "../actions";

export const metadata = { title: "Users" };

export default async function UsersPage(props: PageProps<"/admin/users">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const where = q ? { OR: [{ email: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } }] } : {};
  const [users, total, plans] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 50,
      take: 50,
      include: { subscription: { include: { plan: true } }, _count: { select: { portfolios: true, files: true } } },
    }),
    db.user.count({ where }),
    db.plan.findMany({ where: { code: { not: "ADMIN" } } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Users</p>
          <h1 className="display mt-2 text-5xl">{total} accounts</h1>
        </div>
        <form className="flex gap-2">
          <input className="input w-72" name="q" defaultValue={q} placeholder="Search name or email" />
          <button className="btn-ink">Search</button>
        </form>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
            <tr><th className="p-3">User</th><th>Status</th><th>Plan</th><th>Portfolios</th><th>Files</th><th>Joined</th><th className="p-3 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const admin = isAdminUser(u);
              return (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="p-3">
                    <p className="font-medium">{u.name}{admin && <span className="badge ml-2 bg-signal/10 text-signal-ink">admin</span>}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </td>
                  <td>
                    {u.banned ? <span className="badge bg-bad/10 text-bad" title={u.banReason ?? ""}>Suspended</span> : u.emailVerified ? <span className="badge bg-ok/10 text-ok">Verified</span> : <span className="badge bg-paper-2 text-ink-2">Unverified</span>}
                    {u.twoFactorEnabled && <span className="badge ml-1 bg-paper-2 text-ink-2">2FA</span>}
                  </td>
                  <td>{admin ? "Admin" : u.subscription?.plan.name ?? "Free"}</td>
                  <td className="tabular-nums"><Link className="underline underline-offset-4" href={`/admin/portfolios?user=${u.id}`}>{u._count.portfolios}</Link></td>
                  <td className="tabular-nums">{u._count.files}</td>
                  <td className="text-muted">{u.createdAt.toLocaleDateString("en-IN")}</td>
                  <td className="p-3 text-right">
                    {!admin && (
                      <div className="flex flex-wrap justify-end gap-2">
                        {plans
                          .filter((p) => p.code !== (u.subscription?.plan.code ?? "FREE"))
                          .map((p) => (
                            <ActionButton key={p.code} action={setUserPlanAction.bind(null, u.id, p.code)}>Set {p.name}</ActionButton>
                          ))}
                        {u.banned ? (
                          <ActionButton action={restoreUserAction.bind(null, u.id)} confirmText={`Restore ${u.email}?`}>Restore</ActionButton>
                        ) : (
                          <ActionButton action={suspendUserAction.bind(null, u.id)} prompt={`Suspend ${u.email}? Their sites go offline. Reason:`} className="btn btn-sm border border-bad/40 text-bad hover:bg-bad/5">
                            Suspend
                          </ActionButton>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 text-sm">
        {page > 1 && <Link className="btn-ghost btn-sm" href={`?q=${encodeURIComponent(q)}&page=${page - 1}`}>Previous</Link>}
        {page * 50 < total && <Link className="btn-ghost btn-sm" href={`?q=${encodeURIComponent(q)}&page=${page + 1}`}>Next</Link>}
      </div>
    </div>
  );
}
