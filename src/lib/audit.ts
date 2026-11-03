import "server-only";
import { db } from "./db";

export async function audit(actorId: string, action: string, targetType: string, targetId: string, meta: Record<string, unknown> = {}) {
  await db.auditLog.create({ data: { actorId, action, targetType, targetId, meta: meta as object } });
}
