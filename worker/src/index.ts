/**
 * PortfolioHub edge Worker: serves every published portfolio.
 *
 *   viren.portfoliohub.site/            -> KV "host:viren.portfoliohub.site" -> { portfolioId, deploymentId, state }
 *                                       -> R2 "sites/<portfolioId>/<deploymentId>/index.html"
 *
 * Each deployment is immutable, so responses are cached by deployment ID and a
 * republish never needs a cache purge: the pointer moves, the cache key changes.
 */
export interface Env {
  SITES: R2Bucket;
  POINTERS: KVNamespace;
  SITES_DOMAIN: string;
}

interface Pointer {
  portfolioId: string;
  deploymentId: string;
  state: "live" | "suspended";
}

const CSP = [
  "default-src 'none'",
  "img-src 'self' https: data:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "script-src 'self'",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

const page = (title: string, body: string, status: number) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.5 system-ui,sans-serif;background:#f4f1ea;color:#121211}main{max-width:420px;padding:32px;text-align:center}h1{font:400 40px/1.1 Georgia,serif;margin:0 0 12px}p{color:#77736a;margin:0}</style></head><body><main>${body}</main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );

const notFound = () => page("Not found", "<h1>Nothing here yet</h1><p>This portfolio doesn't exist or isn't published.</p>", 404);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });

    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    if (host === env.SITES_DOMAIN || host === `www.${env.SITES_DOMAIN}`) return Response.redirect("https://portfoliohub.com", 302);

    const pointer = await env.POINTERS.get<Pointer>(`host:${host}`, { type: "json", cacheTtl: 30 });
    if (!pointer) return notFound();
    if (pointer.state === "suspended") return page("Unavailable", "<h1>Unavailable</h1><p>This site is temporarily unavailable.</p>", 451);

    let path = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    if (path === "" || path.endsWith("/")) path += "index.html";
    if (path.includes("..") || path.startsWith("_")) return notFound();

    // Immutable per deployment: cache under a key that includes the deployment ID.
    const cacheKey = new Request(`https://cache.internal/${pointer.deploymentId}/${path}`);
    const cache = caches.default;
    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    const object = await env.SITES.get(`sites/${pointer.portfolioId}/${pointer.deploymentId}/${path}`);
    if (!object) return notFound();

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    if (path.endsWith(".html")) headers.set("Content-Security-Policy", CSP);
    const response = new Response(request.method === "HEAD" ? null : object.body, { headers });
    if (request.method === "GET") ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};
