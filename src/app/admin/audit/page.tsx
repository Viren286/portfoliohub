import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  await requireAdmin();
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const actors = new Map((await db.user.findMany({ where: { id: { in: [...new Set(logs.map((l) => l.actorId))] } }, select: { id: true, email: true } })).map((u) => [u.id, u.email]));
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Audit log</p>
        <h1 className="display mt-2 text-5xl">Every admin action</h1>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wider text-muted"><tr><th className="p-3">When</th><th>Who</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-line align-top last:border-0">
                <td className="whitespace-nowrap p-3 text-muted">{l.createdAt.toLocaleString("en-IN")}</td>
                <td>{actors.get(l.actorId) ?? l.actorId}</td>
                <td className="font-mono text-xs">{l.action}</td>
                <td className="font-mono text-xs">{l.targetType}:{l.targetId.slice(0, 12)}</td>
                <td className="max-w-md p-3 font-mono text-[11px] text-muted">{JSON.stringify(l.meta)}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted">Nothing yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
