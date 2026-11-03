import { getSiteReader } from "@/engine/deployers";
import { siteHeaders, suspendedPage, notFoundPage } from "@/lib/site-pages";

/**
 * Serves sites published with the local deployer at /s/<slug>.
 * Mirrors the Cloudflare Worker: look up the pointer, then stream that exact version.
 */
export async function GET(req: Request, ctx: RouteContext<"/s/[slug]/[[...path]]">) {
  const { slug, path } = await ctx.params;
  const url = new URL(req.url);
  if (!path?.length && !url.pathname.endsWith("/")) return Response.redirect(new URL(`${url.pathname}/`, url), 308);
  const deployer = getSiteReader();
  const pointer = await deployer.readPointer(slug.toLowerCase());
  if (!pointer) return new Response(notFoundPage(), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  if (pointer.state === "suspended") return new Response(suspendedPage(), { status: 451, headers: { "Content-Type": "text/html; charset=utf-8" } });

  const filePath = path?.length ? path.join("/") : "index.html";
  const file = await deployer.readFile(pointer, filePath);
  if (!file) return new Response(notFoundPage(), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  return new Response(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": file.cacheControl,
      ...siteHeaders(filePath),
    },
  });
}
