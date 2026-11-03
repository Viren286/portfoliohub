/** Step 10: turn a rendered site into the list of files a deployer uploads. */
import sharp from "sharp";
import type { BundleFile } from "./deployers/types";
import { ogSvg, robotsTxt, sitemapXml } from "./seo";
import type { ViewModel } from "./view-model";
import { SITE_JS } from "@/templates/shared";

const HTML_CACHE = "public, max-age=60, must-revalidate";
// Site file URLs stay the same across republishes, so nothing here may be cached as immutable.
const ASSET_CACHE = "public, max-age=3600";

export async function buildBundle(htmlDoc: string, vm: ViewModel, builtAt: Date): Promise<BundleFile[]> {
  const files: BundleFile[] = [
    { path: "index.html", contentType: "text/html; charset=utf-8", body: Buffer.from(htmlDoc), cacheControl: HTML_CACHE },
    { path: "site.js", contentType: "text/javascript; charset=utf-8", body: Buffer.from(SITE_JS), cacheControl: HTML_CACHE },
    { path: "robots.txt", contentType: "text/plain; charset=utf-8", body: Buffer.from(robotsTxt(vm.siteUrl)), cacheControl: HTML_CACHE },
  ];
  if (vm.siteUrl) {
    files.push({
      path: "sitemap.xml",
      contentType: "application/xml; charset=utf-8",
      body: Buffer.from(sitemapXml(vm.siteUrl, builtAt.toISOString().slice(0, 10))),
      cacheControl: HTML_CACHE,
    });
  }
  try {
    const png = await sharp(Buffer.from(ogSvg(vm))).png({ compressionLevel: 9 }).toBuffer();
    files.push({ path: "og.png", contentType: "image/png", body: png, cacheControl: ASSET_CACHE });
  } catch {
    // The OG image is a nice-to-have; a font/rasteriser problem must never fail a deploy.
  }
  return files;
}
