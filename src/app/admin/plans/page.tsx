import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { PlanEditor } from "./plan-editor";

export const metadata = { title: "Plans" };

export default async function AdminPlans() {
  await requireAdmin();
  const plans = await db.plan.findMany({ orderBy: { pricePaise: "asc" }, include: { _count: { select: { subscriptions: true } } } });
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Plans</p>
        <h1 className="display mt-2 text-5xl">Pricing &amp; limits</h1>
        <p className="mt-3 max-w-2xl text-ink-2">Limits are enforced on the server from these values, so changes apply immediately without a deploy. Use -1 for unlimited. Payment collection isn&rsquo;t connected yet; assign plans manually from Users.</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        {plans.map((p) => (
          <PlanEditor key={p.code} code={p.code} name={p.name} subscribers={p._count.subscriptions} price={p.pricePaise === null ? "" : String(p.pricePaise / 100)} json={JSON.stringify(p.entitlements, null, 2)} />
        ))}
      </div>
    </div>
  );
}
