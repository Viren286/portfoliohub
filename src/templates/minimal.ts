/**
 * Minimalist Professional: a calm, CV-like single column. Section labels sit in a
 * narrow left rail; content reads like a well-set résumé.
 */
import { html, paragraphs, when, ext, type SafeHtml } from "@/engine/html";
import type { SectionKey } from "@/engine/schema";
import { fmtRange, fmtYears, fmtMonth, type ViewModel } from "@/engine/view-model";
import { avatar, bullets, chips, entryMeta, icon, iconLinks, img, projectLinks, BASE_CSS, type TemplateDefinition } from "./shared";

function section(vm: ViewModel, key: SectionKey): SafeHtml | "" {
  const d = vm.data;
  switch (key) {
    case "about":
      return paragraphs(d.personal.about);
    case "experience":
      return html`${d.experience.map(
        (x) => html`<article class="row-item reveal">
          <div class="row-head"><h3>${x.title}<span class="at"> · ${x.organization}</span></h3><span class="date">${fmtRange(x.startDate, x.endDate, x.current)}</span></div>
          ${when(x.employmentType, (t) => html`<p class="muted small">${t}</p>`)}
          ${bullets(x.responsibilities)}${bullets(x.achievements, "bullets wins")}
          ${chips(x.skills, "tags")}
        </article>`,
      )}`;
    case "projects":
      return html`${d.projects.map(
        (p) => html`<article class="project reveal${p.image ? " has-img" : ""}">
          <div class="project-text">
            <div class="row-head"><h3>${p.name}</h3>${when(p.category, (c) => html`<span class="date">${c}</span>`)}</div>
            ${when(p.summary, (s) => html`<p class="lead">${s}</p>`)}
            ${paragraphs(p.description, "body")}
            ${bullets(p.features)}
            ${when(p.contributions, (c) => html`<p class="muted small"><strong>My role:</strong> ${c}</p>`)}
            ${chips(p.technologies, "tags")}
            ${projectLinks(p)}
          </div>
          ${when(p.image, (i) => html`<figure class="project-img">${img(i, "", "(max-width: 760px) 100vw, 280px")}</figure>`)}
          ${p.screenshots.length ? html`<div class="shots">${p.screenshots.slice(0, 4).map((s) => img(s, "", "200px"))}</div>` : ""}
        </article>`,
      )}`;
    case "skills":
      return html`<dl class="skills">${d.skills.map((g) => html`<div class="reveal"><dt>${g.category}</dt><dd>${g.items.join(" · ")}</dd></div>`)}</dl>`;
    case "education":
      return html`${d.education.map(
        (e) => html`<article class="row-item reveal">
          <div class="row-head"><h3>${e.institution}</h3><span class="date">${fmtYears(e.startYear, e.endYear)}</span></div>
          ${when([e.degree, e.major].filter(Boolean).join(", "), (t) => html`<p>${t}${when(e.grade, (g) => html` <span class="muted">· ${g}</span>`)}</p>`)}
          ${when(e.coursework.length, () => html`<p class="muted small">Coursework: ${e.coursework.join(", ")}</p>`)}
          ${bullets(e.achievements)}
        </article>`,
      )}`;
    case "certifications":
      return html`<ul class="plain">${d.certifications.map(
        (c) => html`<li class="reveal"><span class="li-title">${c.credentialUrl ? html`<a href="${c.credentialUrl}"${ext}>${c.name}</a>` : c.name}</span>
          <span class="muted">${[c.issuer, fmtMonth(c.issuedOn)].filter(Boolean).join(" · ")}</span>
          ${when(c.fileUrl, (u) => html`<a class="small" href="${u}"${ext}>View certificate</a>`)}</li>`,
      )}</ul>`;
    case "awards":
    case "publications":
    case "positions":
    case "extracurriculars":
    case "volunteering":
      return html`<ul class="plain">${d[key].map(
        (e) => html`<li class="reveal"><span class="li-title">${e.url ? html`<a href="${e.url}"${ext}>${e.title}</a>` : e.title}</span>
          ${when(entryMeta(e), (m) => html`<span class="muted">${m}</span>`)}
          ${when(e.description, (t) => html`<span class="desc">${t}</span>`)}</li>`,
      )}</ul>`;
    case "testimonials":
      return html`${d.testimonials.map(
        (t) => html`<blockquote class="reveal"><p>“${t.quote}”</p><cite>${t.author}${when(t.role, (r) => html`, ${r}`)}</cite></blockquote>`,
      )}`;
    case "hobbies":
      return html`<p>${d.hobbies.join(" · ")}</p>`;
    case "contact": {
      const p = d.personal;
      return html`<div class="contact reveal">
        ${when(p.email, (e) => html`<a class="btn" href="mailto:${e}">${icon("mail")} ${e}</a>`)}
        ${when(p.phone, (ph) => html`<a class="btn ghost" href="tel:${ph.replace(/[^+\d]/g, "")}">${icon("phone")} ${ph}</a>`)}
        ${iconLinks(vm.links.filter((l) => l.icon !== "mail"), "links")}
      </div>`;
    }
  }
}

export const minimal: TemplateDefinition = {
  slug: "minimal",
  name: "Minimalist Professional",
  category: "Professional",
  description: "A calm, résumé-like single column with a quiet left rail. Reads beautifully, prints well.",
  tier: "FREE",
  has3D: false,
  version: "1.0.0",
  defaults: {
    primaryColor: "#0F766E",
    secondaryColor: "#334155",
    font: "inter",
    headingFont: "inter",
    mode: "light",
    background: "plain",
    cardStyle: "flat",
    animation: "subtle",
  },
  body(vm) {
    const p = vm.data.personal;
    return html`<a class="skip" href="#main">Skip to content</a>
<div class="wrap">
  <header class="hero reveal">
    ${avatar(vm, "avatar")}
    <div>
      <h1>${vm.name}</h1>
      ${when(vm.intro, (t) => html`<p class="headline">${t}</p>`)}
      <div class="meta">
        ${when(p.location, (l) => html`<span>${icon("pin")} ${l}</span>`)}
        ${when(p.resumeUrl, (u) => html`<a href="${u}"${ext}>${icon("download")} Résumé</a>`)}
      </div>
      ${iconLinks(vm.links, "links")}
    </div>
  </header>
  <main id="main">
    ${vm.sections.map((s) => html`<section id="${s.key}" class="sec"><h2>${s.title}</h2><div class="sec-body">${section(vm, s.key)}</div></section>`)}
  </main>
  <footer class="foot">© ${vm.name}</footer>
</div>`;
  },
  css(vm) {
    const dark = vm.c.mode === "dark";
    return `${BASE_CSS}
:root{--bg:${dark ? "#0E1012" : "#FCFCFA"};--fg:${dark ? "#E8E8E4" : "#1A1C1E"};--muted:${dark ? "#9AA0A6" : "#5F6670"};--line:${dark ? "#24282C" : "#E7E6E1"};--grid:${dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.05)"};--card:${dark ? "#15181B" : "#FFFFFF"}}
body{background-color:var(--bg);color:var(--fg);font-size:16px}
.wrap{max-width:880px;margin:0 auto;padding:72px 28px 40px}
h1,h2,h3{font-family:var(--font-heading);line-height:1.2;margin:0}
.hero{display:flex;gap:28px;align-items:center;margin-bottom:56px}
.avatar{width:96px;height:96px;border-radius:50%;object-fit:cover;flex:none}
.avatar.monogram{font-size:32px}
h1{font-size:clamp(2rem,5vw,2.9rem);font-weight:700;letter-spacing:-.02em}
.headline{font-size:1.15rem;color:var(--muted);margin:.35rem 0 .6rem}
.meta{display:flex;flex-wrap:wrap;gap:16px;color:var(--muted);font-size:.92rem}
.meta span,.meta a{display:inline-flex;align-items:center;gap:6px;text-decoration:none}
.meta a:hover{color:var(--primary)}
.links{list-style:none;display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:14px 0 0}
.links a{display:inline-flex;align-items:center;gap:7px;padding:6px 11px;border:1px solid var(--line);border-radius:999px;text-decoration:none;font-size:.88rem;color:var(--fg);transition:border-color .2s,color .2s}
.links a:hover{border-color:var(--primary);color:var(--primary)}
.sec{display:grid;grid-template-columns:170px 1fr;gap:28px;padding:34px 0;border-top:1px solid var(--line)}
.sec h2{font-size:.78rem;text-transform:uppercase;letter-spacing:.14em;color:var(--primary);font-weight:700;padding-top:4px}
.sec-body>p{margin:0 0 1em}
.row-item,.project{padding-bottom:22px;margin-bottom:22px;border-bottom:1px dashed var(--line)}
.row-item:last-child,.project:last-child{border-bottom:0;margin-bottom:0;padding-bottom:0}
.row-head{display:flex;justify-content:space-between;gap:16px;align-items:baseline}
h3{font-size:1.04rem;font-weight:650}
.at{color:var(--muted);font-weight:500}
.date{color:var(--muted);font-size:.86rem;white-space:nowrap;font-variant-numeric:tabular-nums}
.muted{color:var(--muted)}.small{font-size:.88rem}
.lead{margin:.3rem 0 .4rem;font-size:1rem}
.body{margin:.4rem 0;color:var(--fg)}
.bullets{margin:.5rem 0;padding-left:1.1rem}.bullets li{margin:.2rem 0}
.bullets.wins li::marker{color:var(--primary)}
.tags{list-style:none;display:flex;flex-wrap:wrap;gap:6px;padding:0;margin:.6rem 0 0}
.tags li{font-size:.78rem;padding:3px 9px;border-radius:6px;background:color-mix(in srgb,var(--primary) 10%,transparent);color:var(--fg)}
.project.has-img{display:grid;grid-template-columns:1fr 240px;gap:24px;align-items:start}
.project-img{margin:0;border-radius:10px;overflow:hidden;border:1px solid var(--line);aspect-ratio:4/3;background:var(--card)}
.project-img img{width:100%;height:100%;object-fit:cover}
.shots{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-top:10px}
.shots img{border-radius:8px;border:1px solid var(--line);aspect-ratio:16/10;object-fit:cover;width:100%}
.plinks{display:flex;gap:14px;margin-top:.7rem}
.plink{display:inline-flex;align-items:center;gap:6px;font-size:.9rem;font-weight:600;color:var(--primary);text-decoration:none}
.plink:hover{text-decoration:underline}
.skills{margin:0;display:grid;gap:12px}.skills div{display:grid;grid-template-columns:160px 1fr;gap:12px}
.skills dt{font-weight:600}.skills dd{margin:0;color:var(--muted)}
.plain{list-style:none;padding:0;margin:0;display:grid;gap:14px}
.plain li{display:flex;flex-direction:column;gap:2px}
.li-title{font-weight:600}.li-title a{text-decoration:none;border-bottom:1px solid var(--line)}.li-title a:hover{border-color:var(--primary)}
.desc{font-size:.95rem}
blockquote{margin:0 0 20px;padding-left:18px;border-left:3px solid var(--primary)}
blockquote p{margin:0 0 6px;font-size:1.05rem}cite{color:var(--muted);font-style:normal;font-size:.9rem}
.contact{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;background:var(--primary);color:var(--on-primary);text-decoration:none;font-weight:600;font-size:.95rem}
.btn.ghost{background:transparent;color:var(--fg);border:1px solid var(--line)}
.contact .links{margin:0}
.foot{border-top:1px solid var(--line);padding-top:24px;margin-top:24px;color:var(--muted);font-size:.85rem}
@media (max-width:760px){.wrap{padding:44px 20px 32px}.hero{flex-direction:column;align-items:flex-start;gap:18px}.sec{grid-template-columns:1fr;gap:14px}.project.has-img{grid-template-columns:1fr}.project-img{order:-1}.skills div{grid-template-columns:1fr;gap:2px}.row-head{flex-direction:column;gap:2px}}
@media print{.ph-badge,.links,.skip{display:none}.wrap{padding:0}.sec{break-inside:avoid}}
`;
  },
};
