import { getServedStorage } from "@/lib/storage";

/** Serves processed uploads when STORAGE_DRIVER=local or database (the platform hosts them itself). */
export async function GET(_req: Request, ctx: RouteContext<"/files/[...key]">) {
  const { key } = await ctx.params;
  const k = key.join("/");
  if (!/^u\/[\w-]+\/[\w./-]+$/.test(k) || k.includes("..") || k.endsWith(".meta.json")) return new Response("Not found", { status: 404 });
  const file = await getServedStorage().read(k);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.meta.contentType,
      "Cache-Control": file.meta.cacheControl ?? "public, max-age=3600",
      // Upload keys contain the file hash, so the CDN may keep them forever.
      ...(file.meta.cacheControl?.includes("immutable") ? { "CDN-Cache-Control": "public, max-age=31536000, immutable" } : {}),
      ...(file.meta.contentDisposition ? { "Content-Disposition": file.meta.contentDisposition } : {}),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
