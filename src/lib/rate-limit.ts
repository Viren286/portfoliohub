import "server-only";

/**
 * Fixed-window rate limiter.
 * In-memory by default (fine for one server); set UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN to share limits across serverless instances.
 */
const memory = new Map<string, { count: number; resetAt: number }>();

async function upstashIncr(key: string, windowSec: number): Promise<number | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(windowSec), "NX"],
    ]),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const out = (await res.json()) as { result: number }[];
  return out[0]?.result ?? null;
}

export async function rateLimit(key: string, max: number, windowSec: number): Promise<{ ok: boolean; retryAfter: number }> {
  const bucket = Math.floor(Date.now() / 1000 / windowSec);
  const fullKey = `rl:${key}:${bucket}`;
  const remote = await upstashIncr(fullKey, windowSec).catch(() => null);
  if (remote !== null) return { ok: remote <= max, retryAfter: windowSec };

  const now = Date.now();
  const entry = memory.get(fullKey);
  if (!entry || entry.resetAt < now) {
    memory.set(fullKey, { count: 1, resetAt: now + windowSec * 1000 });
    if (memory.size > 10_000) for (const [k, v] of memory) if (v.resetAt < now) memory.delete(k);
    return { ok: true, retryAfter: 0 };
  }
  entry.count++;
  return { ok: entry.count <= max, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
}
