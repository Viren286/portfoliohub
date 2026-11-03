/** Step 9: SEO metadata, JSON-LD, sitemap, robots and the OpenGraph image. */
import type { ViewModel } from "./view-model";

export interface Seo {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  jsonLd: Record<string, unknown>;
}

const withSlash = (u: string) => (u.endsWith("/") ? u : u + "/");

function clip(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export function buildSeo(vm: ViewModel): Seo {
  const p = vm.data.personal;
  const title = p.headline ? `${vm.name} — ${p.headline}` : `${vm.name} — Portfolio`;
  const description = clip(
    (p.about ?? vm.intro ?? `${vm.name}'s portfolio${vm.data.projects.length ? ` with ${vm.data.projects.length} projects` : ""}.`).replace(/\s+/g, " "),
    160,
  );
  const sameAs = [p.githubUrl, p.linkedinUrl, ...p.socials.map((s) => s.url)].filter(Boolean);
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: vm.name,
    ...(p.headline ? { jobTitle: p.headline } : {}),
    ...(p.location ? { address: { "@type": "PostalAddress", addressLocality: p.location } } : {}),
    ...(vm.siteUrl ? { url: vm.siteUrl } : {}),
    ...(p.avatar && /^https?:/.test(p.avatar.src) ? { image: p.avatar.src } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(vm.data.education[0] ? { alumniOf: vm.data.education.map((e) => ({ "@type": "CollegeOrUniversity", name: e.institution })) } : {}),
    ...(vm.data.skills.length ? { knowsAbout: vm.data.skills.flatMap((g) => g.items).slice(0, 30) } : {}),
  };
  return {
    title: clip(title, 70),
    description,
    canonical: vm.siteUrl,
    ogImage: vm.siteUrl ? new URL("og.png", withSlash(vm.siteUrl)).toString() : undefined,
    jsonLd,
  };
}

export function robotsTxt(siteUrl?: string) {
  return `User-agent: *\nAllow: /\n${siteUrl ? `Sitemap: ${new URL("sitemap.xml", withSlash(siteUrl))}\n` : ""}`;
}

export function sitemapXml(siteUrl: string, lastmod: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${siteUrl}</loc><lastmod>${lastmod}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url></urlset>\n`;
}

const xmlEsc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

/** 1200x630 OpenGraph card as SVG; rasterised to PNG with sharp in the bundle step. */
export function ogSvg(vm: ViewModel): string {
  const name = xmlEsc(vm.name.slice(0, 40));
  const headline = xmlEsc((vm.intro ?? "Portfolio").slice(0, 70));
  const fg = vm.colors.onPrimary;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${vm.colors.primary}"/>
  <rect x="0" y="560" width="1200" height="70" fill="${vm.colors.secondary}"/>
  <text x="80" y="300" font-family="DejaVu Sans, Arial, sans-serif" font-size="88" font-weight="700" fill="${fg}">${name}</text>
  <text x="80" y="380" font-family="DejaVu Sans, Arial, sans-serif" font-size="38" fill="${fg}" opacity="0.85">${headline}</text>
  <text x="80" y="606" font-family="DejaVu Sans, Arial, sans-serif" font-size="24" fill="#FFFFFF" opacity="0.9">${vm.siteUrl ? xmlEsc(new URL(vm.siteUrl).host) : ""}</text>
</svg>`;
}
