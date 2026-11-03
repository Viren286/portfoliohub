/** Step 7: render a template + view model into a complete HTML document. */
import { html, raw } from "./html";
import type { Seo } from "./seo";
import type { ViewModel } from "./view-model";
import type { TemplateDefinition } from "@/templates";
import { SITE_JS } from "@/templates/shared";

function googleFontsHref(vm: ViewModel, template: TemplateDefinition): string | undefined {
  const families = new Set<string>();
  for (const f of [vm.fonts.body, vm.fonts.heading]) if (f.google) families.add(f.google);
  if (template.slug === "developer") families.add("JetBrains+Mono:wght@400;500;700");
  if (!families.size) return undefined;
  return `https://fonts.googleapis.com/css2?${[...families].map((f) => `family=${f}`).join("&")}&display=swap`;
}

export function renderDocument(template: TemplateDefinition, vm: ViewModel, seo: Seo): string {
  const fonts = googleFontsHref(vm, template);
  const css = `:root{--primary:${vm.colors.primary};--on-primary:${vm.colors.onPrimary};--secondary:${vm.colors.secondary};--font-body:${vm.fonts.body.stack};--font-heading:${vm.fonts.heading.stack}}\n${template.css(vm)}`;
  // JSON-LD: escape "<" so user text can never close the script element.
  const jsonLd = JSON.stringify(seo.jsonLd).replace(/</g, "\\u003c");
  const script =
    vm.mode === "preview" ? html`<script>${raw(SITE_JS)}</script>` : html`<script src="site.js" defer></script>`;

  const doc = html`<!doctype html>
<html lang="en" data-mode="${vm.c.mode}" data-anim="${vm.c.animation}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${seo.title}</title>
<meta name="description" content="${seo.description}">
<meta name="color-scheme" content="${vm.c.mode}">
<meta name="theme-color" content="${vm.c.mode === "dark" ? "#0A0B0D" : "#FFFFFF"}">
${seo.canonical ? html`<link rel="canonical" href="${seo.canonical}">` : ""}
<meta property="og:type" content="profile">
<meta property="og:title" content="${seo.title}">
<meta property="og:description" content="${seo.description}">
${seo.canonical ? html`<meta property="og:url" content="${seo.canonical}">` : ""}
${seo.ogImage ? html`<meta property="og:image" content="${seo.ogImage}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">` : ""}
<meta name="twitter:card" content="summary_large_image">
<meta name="generator" content="PortfolioHub">
${fonts ? html`<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${fonts}">` : ""}
<style>${raw(css.replace(/<\/style/gi, ""))}</style>
<script type="application/ld+json">${raw(jsonLd)}</script>
</head>
<body data-bg="${vm.c.background}" data-card="${vm.c.cardStyle}">
${template.body(vm)}
${vm.branding.show ? html`<a class="ph-badge" href="${vm.branding.url}" target="_blank" rel="noopener">${vm.branding.label}</a>` : ""}
${script}
</body>
</html>`;
  return doc.value;
}
