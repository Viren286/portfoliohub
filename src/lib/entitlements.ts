import "server-only";
import { db } from "./db";
import { isAdminUser, type SessionUser } from "./session";
import { DEFAULT_PLANS, EntitlementsSchema, type Entitlements } from "./plans";

export type { Entitlements };

export async function getEntitlements(user: SessionUser): Promise<{ plan: string; e: Entitlements }> {
  const code = isAdminUser(user) ? "ADMIN" : await db.subscription
      .findUnique({ where: { userId: user.id }, include: { plan: true } })
      .then((s) => (s && s.status !== "CANCELED" && s.plan.isActive ? s.plan.code : "FREE"));
  const plan = await db.plan.findUnique({ where: { code } });
  const parsed = EntitlementsSchema.safeParse(plan?.entitlements);
  return { plan: code, e: parsed.success ? parsed.data : DEFAULT_PLANS[code as keyof typeof DEFAULT_PLANS]?.entitlements ?? DEFAULT_PLANS.FREE.entitlements };
}

export const unlimited = (n: number) => n < 0;
