import { html, raw, when, ext, type SafeHtml } from "@/engine/html";
import type { CleanImage, CleanData } from "@/engine/normalize";
import type { ResolvedCustomization } from "@/engine/schema";
import type { IconLink, ViewModel } from "@/engine/view-model";
import { fmtMonth, hostOf } from "@/engine/view-model";

export interface TemplateDefinition {
  slug: string;
  name: string;
  category: string;
  description: string;
  tier: "FREE" | "PRO";
  has3D: boolean;
  version: string;
  defaults: Partial<ResolvedCustomization>;
  /** Markup that goes inside <body>. Must only render sections listed in vm.sections. */
  body(vm: ViewModel): SafeHtml;
  /** Template stylesheet. Engine-authored, so it is trusted. */
  css(vm: ViewModel): string;
}

const ICONS: Record<string, string> = {
  github:
    '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18"><path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>',
  linkedin:
    '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18"><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 14a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 10a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12m0 0-5-5m5 5 5-5M4 21h16"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 17 17 7M8 7h9v9"/></svg>',
};

export const icon = (name: keyof typeof ICONS | string) => raw(ICONS[name] ?? ICONS.link);

export function img(image: CleanImage, cls: string, sizes = "(max-width: 768px) 100vw, 50vw", eager = false): SafeHtml {
  return html`<img class="${cls}" src="${image.src}"${image.srcset ? html` srcset="${image.srcset}" sizes="${sizes}"` : ""}${
    image.width && image.height ? html` width="${image.width}" height="${image.height}"` : ""
  } alt="${image.alt ?? ""}" loading="${eager ? "eager" : "lazy"}" decoding="async">`;
}

/** Profile photo, or a designed initials monogram when there is none (never a broken image). */
export function avatar(vm: ViewModel, cls: string): SafeHtml | "" {
  if (!vm.c.showAvatar) return "";
  const a = vm.data.personal.avatar;
  if (a) return img(a, cls, "240px", true);
  return html`<div class="${cls} monogram" role="img" aria-label="${vm.name}"><span>${vm.initials}</span></div>`;
}

export function iconLinks(links: IconLink[], cls: string): SafeHtml | "" {
  if (!links.length) return "";
  return html`<ul class="${cls}">${links.map(
    (l) => html`<li><a href="${l.url}"${l.icon === "mail" ? "" : ext} aria-label="${l.label}" title="${l.label}">${icon(l.icon)}<span>${l.label}</span></a></li>`,
  )}</ul>`;
}

export function chips(items: string[], cls = "chips"): SafeHtml | "" {
  if (!items.length) return "";
  return html`<ul class="${cls}">${items.map((i) => html`<li>${i}</li>`)}</ul>`;
}

export function bullets(items: string[], cls = "bullets"): SafeHtml | "" {
  if (!items.length) return "";
  return html`<ul class="${cls}">${items.map((i) => html`<li>${i}</li>`)}</ul>`;
}

/** Link buttons for a project; renders nothing at all when a project has no links. */
export function projectLinks(p: CleanData["projects"][number], cls = "plinks"): SafeHtml | "" {
  if (!p.liveUrl && !p.repoUrl) return "";
  return html`<div class="${cls}">${when(p.liveUrl, (u) => html`<a class="plink live" href="${u}"${ext}>Live site ${icon("arrow")}</a>`)}${when(
    p.repoUrl,
    (u) => html`<a class="plink code" href="${u}"${ext}>${icon("github")} Code</a>`,
  )}</div>`;
}

export function entryMeta(e: { subtitle?: string; date?: string }): string {
  return [e.subtitle, fmtMonth(e.date)].filter(Boolean).join(" · ");
}

export { hostOf };

/** CSS shared by all templates: reveal animation, backgrounds, badge, accessibility helpers. */
export const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;font-family:var(--font-body);line-height:1.6;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
img{max-width:100%;display:block}
a{color:inherit}
:focus-visible{outline:2px solid var(--primary);outline-offset:3px;border-radius:4px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.skip{position:absolute;left:-9999px;top:8px;z-index:100;background:var(--primary);color:var(--on-primary);padding:8px 14px;border-radius:8px;text-decoration:none}
.skip:focus{left:8px}
.monogram{display:grid;place-items:center;background:var(--primary);color:var(--on-primary);font-family:var(--font-heading);font-weight:700;letter-spacing:.02em}
.ph-badge{position:fixed;right:14px;bottom:14px;z-index:50;font:500 12px/1 system-ui,sans-serif;padding:8px 12px;border-radius:999px;background:#111;color:#fff;text-decoration:none;opacity:.85;box-shadow:0 4px 18px rgba(0,0,0,.18)}
.ph-badge:hover{opacity:1}
.js .reveal{transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1)}
.js .reveal:not(.in){opacity:0;transform:translateY(14px)}
[data-anim="lively"].js .reveal:not(.in){transform:translateY(28px) scale(.985)}
[data-anim="none"] .reveal,.no-anim .reveal{opacity:1!important;transform:none!important;transition:none!important}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}.reveal{opacity:1!important;transform:none!important}}
body[data-bg="grid"]{background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:44px 44px}
body[data-bg="dots"]{background-image:radial-gradient(var(--grid) 1.2px,transparent 1.2px);background-size:22px 22px}
body[data-bg="glow"]{background-image:radial-gradient(60rem 30rem at 85% -10%,color-mix(in srgb,var(--primary) 22%,transparent),transparent 70%),radial-gradient(40rem 24rem at -10% 20%,color-mix(in srgb,var(--secondary) 18%,transparent),transparent 70%);background-attachment:fixed}
`;

/** Tiny progressive-enhancement script shipped with every site (served as /site.js). */
export const SITE_JS = `(()=>{var d=document.documentElement;d.classList.add('js');var a=d.getAttribute('data-anim');var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;if(a==='none'||reduce||!('IntersectionObserver'in window)){d.classList.add('no-anim');return}var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -6% 0px'});var els=document.querySelectorAll('.reveal');els.forEach(function(el,i){if(a==='lively')el.style.transitionDelay=Math.min((i%4)*70,210)+'ms';io.observe(el)});if(a==='lively'&&matchMedia('(pointer:fine)').matches){var s=document.querySelector('[data-spotlight]');if(s){addEventListener('pointermove',function(e){s.style.setProperty('--mx',e.clientX+'px');s.style.setProperty('--my',e.clientY+'px')},{passive:true})}document.querySelectorAll('[data-tilt]').forEach(function(c){c.addEventListener('pointermove',function(e){var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform='perspective(900px) rotateX('+(-y*3).toFixed(2)+'deg) rotateY('+(x*3).toFixed(2)+'deg) translateY(-2px)'});c.addEventListener('pointerleave',function(){c.style.transform=''})})}})();`;
