/**
 * Premium Editorial: a magazine spread. Oversized serif name, a masthead,
 * numbered chapters, alternating feature layouts for projects and pull quotes.
 */
import { html, paragraphs, when, ext, type SafeHtml } from "@/engine/html";
import type { SectionKey } from "@/engine/schema";
import { fmtRange, fmtYears, fmtMonth, type ViewModel } from "@/engine/view-model";
import { avatar, bullets, entryMeta, icon, iconLinks, img, projectLinks, BASE_CSS, type TemplateDefinition } from "./shared";

const num = (n: number) => String(n).padStart(2, "0");

function section(vm: ViewModel, key: SectionKey): SafeHtml | "" {
  const d = vm.data;
  switch (key) {
    case "about":
      return html`<div class="about reveal">${paragraphs(d.personal.about)}</div>`;
    case "experience":
      return html`<div class="ledger">${d.experience.map(
        (x) => html`<article class="ledger-row reveal">
          <div class="when">${fmtRange(x.startDate, x.endDate, x.current)}</div>
          <div class="what"><h3>${x.title}</h3><p class="org">${x.organization}${when(x.employmentType, (t) => html` <em>— ${t}</em>`)}</p>
            ${bullets(x.responsibilities)}${bullets(x.achievements, "bullets wins")}
            ${when(x.skills.length, () => html`<p class="kicker">${x.skills.join(" / ")}</p>`)}</div>
        </article>`,
      )}</div>`;
    case "projects":
      return html`<div class="features">${d.projects.map(
        (p, i) => html`<article class="feature reveal${i % 2 ? " flip" : ""}${p.image ? "" : " no-img"}">
          ${p.image ? html`<figure class="f-img">${img(p.image, "", "(max-width: 860px) 100vw, 55vw")}</figure>` : html`<div class="f-num" aria-hidden="true">${num(i + 1)}</div>`}
          <div class="f-text">
            <p class="kicker">${p.category ?? `Project ${num(i + 1)}`}</p>
            <h3>${p.name}</h3>
            ${when(p.summary, (s) => html`<p class="dek">${s}</p>`)}
            ${paragraphs(p.description)}
            ${bullets(p.features)}
            ${when(p.contributions, (c) => html`<p class="note"><span>My part</span>${c}</p>`)}
            ${when(p.technologies.length, () => html`<p class="kicker tech">${p.technologies.join(" · ")}</p>`)}
            ${projectLinks(p)}
          </div>
          ${p.screenshots.length ? html`<div class="strip">${p.screenshots.slice(0, 6).map((s) => img(s, "", "220px"))}</div>` : ""}
        </article>`,
      )}</div>`;
    case "skills":
      return html`<div class="columns">${d.skills.map(
        (g) => html`<div class="col reveal"><h3>${g.category}</h3><ul>${g.items.map((s) => html`<li>${s}</li>`)}</ul></div>`,
      )}</div>`;
    case "education":
      return html`<div class="ledger">${d.education.map(
        (e) => html`<article class="ledger-row reveal"><div class="when">${fmtYears(e.startYear, e.endYear)}</div>
          <div class="what"><h3>${e.institution}</h3>
          ${when([e.degree, e.major].filter(Boolean).join(", "), (t) => html`<p class="org">${t}${when(e.grade, (g) => html` <em>— ${g}</em>`)}</p>`)}
          ${when(e.coursework.length, () => html`<p class="kicker">${e.coursework.join(" / ")}</p>`)}
          ${bullets(e.achievements)}</div></article>`,
      )}</div>`;
    case "certifications":
      return html`<ul class="index">${d.certifications.map(
        (c) => html`<li class="reveal"><span class="i-title">${c.credentialUrl ? html`<a href="${c.credentialUrl}"${ext}>${c.name}</a>` : c.name}</span>
        <span class="i-dots" aria-hidden="true"></span><span class="i-meta">${[c.issuer, fmtMonth(c.issuedOn)].filter(Boolean).join(", ")}${when(
          c.fileUrl,
          (u) => html` · <a href="${u}"${ext}>certificate</a>`,
        )}</span></li>`,
      )}</ul>`;
    case "awards":
    case "publications":
    case "positions":
    case "extracurriculars":
    case "volunteering":
      return html`<ul class="index">${d[key].map(
        (e) => html`<li class="reveal${e.description ? " has-desc" : ""}"><span class="i-title">${e.url ? html`<a href="${e.url}"${ext}>${e.title}</a>` : e.title}</span>
        <span class="i-dots" aria-hidden="true"></span><span class="i-meta">${entryMeta(e)}</span>
        ${when(e.description, (t) => html`<span class="i-desc">${t}</span>`)}</li>`,
      )}</ul>`;
    case "testimonials":
      return html`${d.testimonials.map(
        (t) => html`<figure class="pull reveal"><blockquote>${t.quote}</blockquote><figcaption>— ${t.author}${when(t.role, (r) => html`, <em>${r}</em>`)}</figcaption></figure>`,
      )}`;
    case "hobbies":
      return html`<p class="hobbies reveal">${d.hobbies.join(", ")}.</p>`;
    case "contact": {
      const p = d.personal;
      return html`<div class="contact reveal">
        ${when(p.email, (e) => html`<a class="big-mail" href="mailto:${e}">${e}</a>`)}
        ${when(p.phone, (ph) => html`<p class="phone"><a href="tel:${ph.replace(/[^+\d]/g, "")}">${ph}</a></p>`)}
        ${iconLinks(vm.links.filter((l) => l.icon !== "mail"), "links")}
      </div>`;
    }
  }
}

export const editorial: TemplateDefinition = {
  slug: "editorial",
  name: "Premium Editorial",
  category: "Editorial",
  description: "A magazine spread: oversized serif headline, numbered chapters and feature-style project stories.",
  tier: "FREE",
  has3D: false,
  version: "1.0.0",
  defaults: {
    primaryColor: "#C2410C",
    secondaryColor: "#1C1917",
    font: "dm-sans",
    headingFont: "fraunces",
    mode: "light",
    background: "plain",
    cardStyle: "flat",
    animation: "subtle",
  },
  body(vm) {
    const p = vm.data.personal;
    return html`<a class="skip" href="#main">Skip to content</a>
<header class="mast"><div class="mast-in">
  <span class="mast-name">${vm.name}</span>
  <span class="mast-mid">Portfolio${when(p.location, (l) => html` — ${l}`)}</span>
  ${when(p.resumeUrl, (u) => html`<a class="mast-cta" href="${u}"${ext}>${icon("download")} Résumé</a>`)}
</div></header>
<section class="cover"><div class="cover-in">
  <div class="cover-text reveal">
    <p class="kicker">${vm.sections.length ? vm.sections.map((s) => s.title.split(" ")[0]).slice(0, 4).join(" · ") : "Portfolio"}</p>
    <h1>${vm.name}</h1>
    ${when(vm.intro, (t) => html`<p class="standfirst">${t}</p>`)}
    ${iconLinks(vm.links, "links")}
  </div>
  ${vm.c.showAvatar ? html`<figure class="portrait reveal">${avatar(vm, "avatar")}<figcaption>${vm.name}${when(p.headline, (h) => html`, <em>${h}</em>`)}</figcaption></figure>` : ""}
</div></section>
<main id="main">
  ${vm.sections.map(
    (s) => html`<section id="${s.key}" class="chapter"><div class="chapter-in">
      <header class="ch-head reveal"><span class="ch-num">${num(s.index)}</span><h2>${s.title}</h2></header>
      <div class="ch-body">${section(vm, s.key)}</div>
    </div></section>`,
  )}
</main>
<footer class="colophon"><div class="chapter-in"><span>${vm.name}</span><span>Set in ${vm.fonts.heading.label} &amp; ${vm.fonts.body.label}</span></div></footer>`;
  },
  css(vm) {
    const dark = vm.c.mode === "dark";
    return `${BASE_CSS}
:root{--bg:${dark ? "#12110F" : "#F6F1E7"};--paper:${dark ? "#1A1916" : "#FBF8F1"};--fg:${dark ? "#EDE6D8" : "#1C1917"};--muted:${dark ? "#A39C8E" : "#6B6358"};--line:${dark ? "#2C2A25" : "#D9D0BE"};--grid:${dark ? "rgba(255,255,255,.04)" : "rgba(28,25,23,.06)"}}
body{background-color:var(--bg);color:var(--fg);font-size:17px}
h1,h2,h3{font-family:var(--font-heading);font-weight:600;margin:0;line-height:1.05}
em{font-style:italic}
.kicker{font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:var(--primary);font-weight:600;margin:0 0 12px}
.mast{border-bottom:1px solid var(--fg)}
.mast-in{max-width:1200px;margin:0 auto;padding:14px 28px;display:flex;align-items:center;gap:20px;font-size:.8rem;letter-spacing:.06em;text-transform:uppercase}
.mast-name{font-weight:700}.mast-mid{color:var(--muted);margin-left:auto}
.mast-cta{display:inline-flex;align-items:center;gap:6px;text-decoration:none;border:1px solid var(--fg);padding:6px 12px;border-radius:999px}
.mast-cta:hover{background:var(--fg);color:var(--bg)}
.cover-in{max-width:1200px;margin:0 auto;padding:72px 28px 64px;display:grid;grid-template-columns:1.7fr 1fr;gap:56px;align-items:end;border-bottom:1px solid var(--line)}
.cover h1{font-size:clamp(3.2rem,10vw,8.4rem);letter-spacing:-.045em;line-height:.92;font-weight:600}
.standfirst{font-family:var(--font-heading);font-style:italic;font-size:clamp(1.25rem,2.4vw,1.75rem);line-height:1.3;color:var(--muted);margin:22px 0 26px;max-width:28ch}
.links{list-style:none;display:flex;flex-wrap:wrap;gap:18px;padding:0;margin:0}
.links a{display:inline-flex;align-items:center;gap:7px;text-decoration:none;font-size:.9rem;border-bottom:1px solid var(--line);padding-bottom:2px}
.links a:hover{border-color:var(--primary);color:var(--primary)}
.portrait{margin:0}
.avatar{width:100%;aspect-ratio:4/5;object-fit:cover;filter:grayscale(${vm.c.animation === "none" ? "0" : ".15"}) contrast(1.02)}
.avatar.monogram{font-size:clamp(4rem,9vw,7rem);font-style:italic;background:var(--fg);color:var(--bg)}
.portrait figcaption{font-size:.8rem;color:var(--muted);margin-top:10px;border-top:1px solid var(--line);padding-top:8px}
.chapter{border-bottom:1px solid var(--line)}
.chapter-in{max-width:1200px;margin:0 auto;padding:64px 28px;display:grid;grid-template-columns:260px 1fr;gap:48px}
.ch-head{position:sticky;top:24px;align-self:start}
.ch-num{display:block;font-family:var(--font-heading);font-size:4rem;line-height:1;color:var(--primary);font-weight:400;font-style:italic}
.ch-head h2{font-size:1.6rem;margin-top:8px;letter-spacing:-.01em}
.about{font-size:1.2rem;line-height:1.65;max-width:62ch}
.about p:first-child::first-letter{font-family:var(--font-heading);float:left;font-size:4.6em;line-height:.8;padding:6px 10px 0 0;color:var(--primary);font-weight:600}
.about p{margin:0 0 1em}
.ledger-row{display:grid;grid-template-columns:170px 1fr;gap:24px;padding:22px 0;border-top:1px solid var(--line)}
.ledger-row:first-child{border-top:0;padding-top:0}
.when{font-size:.82rem;color:var(--muted);font-variant-numeric:tabular-nums;padding-top:6px}
.what h3{font-size:1.45rem}.org{margin:4px 0 8px;color:var(--muted)}
.bullets{margin:.5rem 0;padding-left:1.1rem}.bullets li{margin:.25rem 0}.bullets.wins li::marker{color:var(--primary)}
.features{display:grid;gap:64px}
.feature{display:grid;grid-template-columns:1.2fr 1fr;gap:40px;align-items:center}
.feature.flip .f-img,.feature.flip .f-num{order:2}
.f-img{margin:0;overflow:hidden;background:var(--paper);border:1px solid var(--line)}
.f-img img{width:100%;aspect-ratio:4/3;object-fit:cover;transition:transform .8s ease}
.feature:hover .f-img img{transform:scale(1.03)}
.f-num{font-family:var(--font-heading);font-size:clamp(7rem,16vw,13rem);line-height:.8;color:transparent;-webkit-text-stroke:1.5px var(--primary);font-style:italic;text-align:center;padding:24px 0;border:1px solid var(--line);background:var(--paper)}
.f-text h3{font-size:clamp(1.8rem,3.4vw,2.6rem);letter-spacing:-.02em;margin-bottom:10px}
.dek{font-family:var(--font-heading);font-style:italic;font-size:1.2rem;color:var(--muted);margin:0 0 12px}
.f-text p{margin:0 0 .8em}
.note{border-left:2px solid var(--primary);padding-left:12px;font-size:.95rem}.note span{display:block;font-size:.7rem;letter-spacing:.16em;text-transform:uppercase;color:var(--primary);margin-bottom:2px}
.kicker.tech{color:var(--muted);letter-spacing:.08em;text-transform:none;font-size:.82rem;margin-top:6px}
.strip{grid-column:1/-1;display:flex;gap:10px;overflow-x:auto;padding-bottom:4px}
.strip img{height:150px;width:auto;border:1px solid var(--line)}
.plinks{display:flex;gap:18px;margin-top:14px}
.plink{display:inline-flex;align-items:center;gap:6px;font-weight:600;font-size:.92rem;text-decoration:none;border-bottom:2px solid var(--primary);padding-bottom:2px}
.plink.code{border-color:var(--line)}
.columns{columns:3 200px;column-gap:40px}
.col{break-inside:avoid;margin-bottom:28px}.col h3{font-size:1.15rem;font-style:italic;margin-bottom:8px;color:var(--primary)}
.col ul{list-style:none;margin:0;padding:0}.col li{padding:5px 0;border-bottom:1px solid var(--line)}
.index{list-style:none;margin:0;padding:0}
.index li{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:baseline;padding:12px 0}
.i-title{font-family:var(--font-heading);font-size:1.15rem}.i-title a{text-decoration:none}.i-title a:hover{color:var(--primary)}
.i-dots{border-bottom:1px dotted var(--muted);transform:translateY(-4px)}
.i-meta{color:var(--muted);font-size:.85rem;text-align:right}
.i-desc{grid-column:1/-1;font-size:.95rem;color:var(--muted)}
.pull{margin:0 0 40px}.pull blockquote{margin:0;font-family:var(--font-heading);font-size:clamp(1.5rem,3vw,2.2rem);line-height:1.25;font-style:italic}
.pull blockquote::before{content:"“";color:var(--primary)}.pull blockquote::after{content:"”";color:var(--primary)}
.pull figcaption{margin-top:12px;color:var(--muted)}
.hobbies{font-family:var(--font-heading);font-size:1.6rem;font-style:italic;margin:0}
.contact .big-mail{display:inline-block;font-family:var(--font-heading);font-size:clamp(1.8rem,5vw,3.6rem);letter-spacing:-.02em;text-decoration:none;border-bottom:3px solid var(--primary);margin-bottom:18px;word-break:break-all}
.phone a{text-decoration:none;color:var(--muted)}
.colophon{font-size:.8rem;color:var(--muted)}.colophon .chapter-in{display:flex;justify-content:space-between;padding:28px}
@media (max-width:860px){.cover-in{grid-template-columns:1fr;gap:32px}.portrait{max-width:280px}.chapter-in{grid-template-columns:1fr;gap:20px;padding:44px 22px}.ch-head{position:static}.ch-num{font-size:2.6rem}.feature,.feature.flip{grid-template-columns:1fr;gap:20px}.feature.flip .f-img,.feature.flip .f-num{order:0}.ledger-row{grid-template-columns:1fr;gap:4px}.mast-mid{display:none}.mast-cta{margin-left:auto}}
`;
  },
};
