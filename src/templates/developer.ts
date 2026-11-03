/**
 * Modern Developer: dark-first, terminal-flavoured hero, numbered nav, card grid
 * for projects, a timeline for experience, and an optional cursor spotlight.
 */
import { html, paragraphs, when, ext, type SafeHtml } from "@/engine/html";
import type { SectionKey } from "@/engine/schema";
import { fmtRange, fmtYears, fmtMonth, type ViewModel } from "@/engine/view-model";
import { avatar, bullets, chips, icon, iconLinks, img, projectLinks, BASE_CSS, type TemplateDefinition } from "./shared";

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function section(vm: ViewModel, key: SectionKey): SafeHtml | "" {
  const d = vm.data;
  switch (key) {
    case "about":
      return html`<div class="about reveal">${paragraphs(d.personal.about)}</div>`;
    case "experience":
      return html`<ol class="timeline">${d.experience.map(
        (x) => html`<li class="reveal">
          <span class="dot" aria-hidden="true"></span>
          <div class="tl-head"><h3>${x.title} <span class="org">@ ${x.organization}</span></h3>
          <span class="mono date">${fmtRange(x.startDate, x.endDate, x.current)}${when(x.employmentType, (t) => html` · ${t}`)}</span></div>
          ${bullets(x.responsibilities)}${bullets(x.achievements, "bullets wins")}${chips(x.skills, "chips mono")}
        </li>`,
      )}</ol>`;
    case "projects":
      return html`<div class="grid">${d.projects.map(
        (p, i) => html`<article class="card reveal" data-tilt>
          <div class="card-media">${
            p.image
              ? img(p.image, "", "(max-width: 760px) 100vw, 50vw")
              : html`<div class="gen" aria-hidden="true" style="--h:${(i * 47) % 360}"><span>${initialsOf(p.name)}</span></div>`
          }</div>
          <div class="card-body">
            <div class="card-top"><span class="mono idx">${String(i + 1).padStart(2, "0")}</span>${when(p.category, (c) => html`<span class="mono cat">${c}</span>`)}</div>
            <h3>${p.name}</h3>
            ${when(p.summary, (s) => html`<p class="summary">${s}</p>`)}
            ${paragraphs(p.description, "desc")}
            ${bullets(p.features)}
            ${when(p.contributions, (c) => html`<p class="role"><span class="mono">role:</span> ${c}</p>`)}
            ${chips(p.technologies, "chips mono")}
            ${projectLinks(p)}
          </div>
        </article>`,
      )}</div>`;
    case "skills":
      return html`<div class="skill-grid">${d.skills.map(
        (g) => html`<div class="skill reveal"><h3 class="mono">${g.category.toLowerCase().replace(/\s+/g, "_")}</h3>${chips(g.items, "chips")}</div>`,
      )}</div>`;
    case "education":
      return html`<div class="list">${d.education.map(
        (e) => html`<div class="list-item reveal"><div><h3>${e.institution}</h3>
          ${when([e.degree, e.major].filter(Boolean).join(" · "), (t) => html`<p>${t}</p>`)}
          ${when(e.coursework.length, () => html`<p class="muted">${e.coursework.join(" / ")}</p>`)}
          ${bullets(e.achievements)}</div>
          <div class="mono right">${fmtYears(e.startYear, e.endYear)}${when(e.grade, (g) => html`<br><span class="accent">${g}</span>`)}</div></div>`,
      )}</div>`;
    case "certifications":
      return html`<div class="list">${d.certifications.map(
        (c) => html`<div class="list-item reveal"><div><h3>${c.name}</h3>${when(c.issuer, (i) => html`<p class="muted">${i}</p>`)}
          <div class="plinks">${when(c.credentialUrl, (u) => html`<a class="plink" href="${u}"${ext}>Verify ${icon("arrow")}</a>`)}${when(
            c.fileUrl,
            (u) => html`<a class="plink" href="${u}"${ext}>Certificate ${icon("arrow")}</a>`,
          )}</div></div>
          <div class="mono right">${fmtMonth(c.issuedOn)}</div></div>`,
      )}</div>`;
    case "awards":
    case "publications":
    case "positions":
    case "extracurriculars":
    case "volunteering":
      return html`<div class="list">${d[key].map(
        (e) => html`<div class="list-item reveal"><div><h3>${e.url ? html`<a href="${e.url}"${ext}>${e.title}</a>` : e.title}</h3>
          ${when(e.subtitle, (s) => html`<p class="muted">${s}</p>`)}${when(e.description, (t) => html`<p>${t}</p>`)}</div>
          <div class="mono right">${fmtMonth(e.date)}</div></div>`,
      )}</div>`;
    case "testimonials":
      return html`<div class="quotes">${d.testimonials.map(
        (t) => html`<figure class="quote reveal"><blockquote>${t.quote}</blockquote><figcaption><strong>${t.author}</strong>${when(t.role, (r) => html` · ${r}`)}</figcaption></figure>`,
      )}</div>`;
    case "hobbies":
      return chips(d.hobbies, "chips big");
    case "contact": {
      const p = d.personal;
      return html`<div class="contact reveal">
        <p class="cta">${vm.firstName === vm.name ? "Let's build something." : `Let's build something, I'm ${vm.firstName}.`}</p>
        <div class="contact-row">
          ${when(p.email, (e) => html`<a class="btn" href="mailto:${e}">${icon("mail")} ${e}</a>`)}
          ${when(p.phone, (ph) => html`<a class="btn ghost" href="tel:${ph.replace(/[^+\d]/g, "")}">${icon("phone")} ${ph}</a>`)}
        </div>
        ${iconLinks(vm.links.filter((l) => l.icon !== "mail"), "links")}
      </div>`;
    }
  }
}

export const developer: TemplateDefinition = {
  slug: "developer",
  name: "Modern Developer",
  category: "Developer",
  description: "Dark-first with a terminal hero, numbered navigation, project cards and an experience timeline.",
  tier: "FREE",
  has3D: false,
  version: "1.0.0",
  defaults: {
    primaryColor: "#A3E635",
    secondaryColor: "#38BDF8",
    font: "dm-sans",
    headingFont: "space-grotesk",
    mode: "dark",
    background: "grid",
    cardStyle: "bordered",
    animation: "lively",
  },
  body(vm) {
    const p = vm.data.personal;
    const handle = (vm.name.split(/\s+/)[0] || "me").toLowerCase().replace(/[^a-z0-9]/g, "") || "me";
    const navSections = vm.sections.filter((s) => s.key !== "contact").slice(0, 6);
    return html`<a class="skip" href="#main">Skip to content</a>
<div class="spot" data-spotlight aria-hidden="true"></div>
<nav class="nav"><div class="nav-in">
  <a class="brand mono" href="#top">~/${handle}</a>
  ${when(navSections.length, () => html`<ul>${navSections.map((s) => html`<li><a href="#${s.key}"><span class="mono accent">${String(s.index).padStart(2, "0")}.</span> ${s.title.split(" ")[0]}</a></li>`)}</ul>`)}
  ${when(p.resumeUrl, (u) => html`<a class="nav-cta" href="${u}"${ext}>${icon("download")} Résumé</a>`)}
</div></nav>
<header class="hero" id="top">
  <div class="hero-in">
    <div class="term reveal">
      <div class="term-bar" aria-hidden="true"><i></i><i></i><i></i><span class="mono">${handle}@portfolio: ~</span></div>
      <div class="term-body mono">
        <p><span class="accent">$</span> whoami</p>
        <h1>${vm.name}</h1>
        ${when(vm.intro, (t) => html`<p><span class="accent">$</span> cat role.txt</p><p class="out">${t}</p>`)}
        ${when(p.location, (l) => html`<p><span class="accent">$</span> locate --me</p><p class="out">${l}</p>`)}
        <p class="cursor"><span class="accent">$</span> <span class="blink" aria-hidden="true">▍</span></p>
      </div>
    </div>
    <div class="hero-side reveal">
      ${avatar(vm, "avatar")}
      ${iconLinks(vm.links, "links")}
    </div>
  </div>
</header>
<main id="main">
  ${vm.sections.map(
    (s) => html`<section id="${s.key}" class="sec"><div class="sec-in"><h2 class="reveal"><span class="mono accent">${String(s.index).padStart(2, "0")}.</span> ${s.title}</h2>${section(vm, s.key)}</div></section>`,
  )}
</main>
<footer class="foot mono">built by ${vm.name}</footer>`;
  },
  css(vm) {
    const dark = vm.c.mode === "dark";
    const card = vm.c.cardStyle;
    return `${BASE_CSS}
:root{--bg:${dark ? "#0A0B0D" : "#F7F7F5"};--bg2:${dark ? "#111317" : "#FFFFFF"};--fg:${dark ? "#E6E8EB" : "#16181B"};--muted:${dark ? "#8B929C" : "#5C636D"};--line:${dark ? "#1F232A" : "#E3E4E1"};--grid:${dark ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.045)"};--mono:'JetBrains Mono',ui-monospace,Menlo,monospace}
body{background-color:var(--bg);color:var(--fg);font-size:16px}
.mono{font-family:var(--mono)}.accent{color:var(--primary)}.muted{color:var(--muted)}
h1,h2,h3{font-family:var(--font-heading);margin:0;line-height:1.15}
.spot{position:fixed;inset:0;pointer-events:none;z-index:0;background:radial-gradient(520px circle at var(--mx,-999px) var(--my,-999px),color-mix(in srgb,var(--primary) 9%,transparent),transparent 60%)}
.nav{position:sticky;top:0;z-index:20;backdrop-filter:blur(12px);background:color-mix(in srgb,var(--bg) 78%,transparent);border-bottom:1px solid var(--line)}
.nav-in{max-width:1120px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;gap:24px}
.brand{text-decoration:none;font-weight:700;color:var(--fg)}
.nav ul{list-style:none;display:flex;gap:20px;margin:0 0 0 auto;padding:0;font-size:.88rem}
.nav ul a{text-decoration:none;color:var(--muted)}.nav ul a:hover{color:var(--fg)}
.nav-cta{margin-left:auto;display:inline-flex;gap:6px;align-items:center;font-size:.85rem;padding:7px 12px;border:1px solid var(--primary);color:var(--primary);border-radius:8px;text-decoration:none}
.nav ul+.nav-cta{margin-left:0}
.nav-cta:hover{background:color-mix(in srgb,var(--primary) 12%,transparent)}
.hero{position:relative;z-index:1}
.hero-in{max-width:1120px;margin:0 auto;padding:96px 24px 72px;display:grid;grid-template-columns:1.5fr 1fr;gap:56px;align-items:center}
.term{background:var(--bg2);border:1px solid var(--line);border-radius:14px;overflow:hidden;box-shadow:0 30px 80px -30px rgba(0,0,0,${dark ? ".7" : ".2"})}
.term-bar{display:flex;align-items:center;gap:7px;padding:11px 14px;border-bottom:1px solid var(--line);font-size:.75rem;color:var(--muted)}
.term-bar i{width:11px;height:11px;border-radius:50%;background:var(--line)}.term-bar i:first-child{background:#FF5F57}.term-bar i:nth-child(2){background:#FEBC2E}.term-bar i:nth-child(3){background:#28C840}
.term-bar span{margin-left:8px}
.term-body{padding:26px 28px 22px;font-size:.92rem}
.term-body p{margin:0 0 6px}.term-body .out{color:var(--muted);margin-bottom:14px}
.term-body h1{font-family:var(--font-heading);font-size:clamp(2.2rem,5.5vw,3.8rem);letter-spacing:-.03em;margin:4px 0 18px;color:var(--fg)}
.blink{animation:blink 1.1s steps(1) infinite;color:var(--primary)}@keyframes blink{50%{opacity:0}}
.hero-side{display:flex;flex-direction:column;align-items:center;gap:22px}
.avatar{width:220px;height:220px;border-radius:24px;object-fit:cover;border:1px solid var(--line);box-shadow:0 0 0 6px color-mix(in srgb,var(--primary) 14%,transparent)}
.avatar.monogram{font-size:64px;font-family:var(--mono)}
.links{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.links a{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:9px;background:var(--bg2);border:1px solid var(--line);text-decoration:none;font-size:.85rem;color:var(--fg);transition:border-color .2s,transform .2s}
.links a:hover{border-color:var(--primary);transform:translateY(-1px)}
.sec{position:relative;z-index:1;padding:64px 0}
.sec-in{max-width:1120px;margin:0 auto;padding:0 24px}
.sec h2{font-size:clamp(1.5rem,3vw,2rem);margin-bottom:32px;display:flex;align-items:center;gap:12px}
.sec h2::after{content:"";flex:1;height:1px;background:var(--line);margin-left:12px}
.about{max-width:760px;font-size:1.08rem;color:var(--fg)}.about p{margin:0 0 1em}
.timeline{list-style:none;margin:0;padding:0 0 0 26px;border-left:1px solid var(--line);display:grid;gap:34px}
.timeline li{position:relative}
.dot{position:absolute;left:-32px;top:6px;width:11px;height:11px;border-radius:50%;background:var(--bg);border:2px solid var(--primary)}
.tl-head{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:baseline;margin-bottom:6px}
.tl-head h3{font-size:1.15rem}.org{color:var(--primary)}
.date{color:var(--muted);font-size:.8rem}
.bullets{margin:.4rem 0;padding-left:1.1rem;color:var(--muted)}.bullets li{margin:.25rem 0}.bullets li::marker{color:var(--primary)}
.bullets.wins{color:var(--fg)}
.chips{list-style:none;display:flex;flex-wrap:wrap;gap:6px;padding:0;margin:.8rem 0 0}
.chips li{font-size:.76rem;padding:4px 9px;border-radius:6px;background:color-mix(in srgb,var(--primary) 10%,transparent);color:var(--fg);border:1px solid color-mix(in srgb,var(--primary) 22%,transparent)}
.chips.mono li{font-family:var(--mono)}
.chips.big li{font-size:.9rem;padding:7px 13px}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:22px}
.card{background:var(--bg2);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;transition:transform .25s ease,border-color .25s,box-shadow .25s;${
      card === "elevated" ? "box-shadow:0 18px 50px -24px rgba(0,0,0,.55);border:1px solid transparent;" : card === "flat" ? "border:1px solid transparent;" : "border:1px solid var(--line);"
    }}
.card:hover{border-color:color-mix(in srgb,var(--primary) 45%,var(--line))}
.card-media{aspect-ratio:16/9;overflow:hidden;border-bottom:1px solid var(--line);background:var(--bg)}
.card-media img{width:100%;height:100%;object-fit:cover;transition:transform .6s ease}.card:hover .card-media img{transform:scale(1.04)}
.gen{width:100%;height:100%;display:grid;place-items:center;background:radial-gradient(circle at 30% 20%,color-mix(in srgb,var(--primary) 35%,transparent),transparent 55%),radial-gradient(circle at 80% 90%,color-mix(in srgb,var(--secondary) 35%,transparent),transparent 55%),linear-gradient(135deg,var(--bg2),var(--bg));}
.gen span{font-family:var(--mono);font-size:3.2rem;font-weight:700;color:color-mix(in srgb,var(--fg) 85%,transparent);letter-spacing:-.04em}
.card-body{padding:22px 22px 24px;display:flex;flex-direction:column;gap:6px;flex:1}
.card-top{display:flex;justify-content:space-between;font-size:.75rem;color:var(--muted)}
.card h3{font-size:1.25rem;margin-top:4px}
.summary{margin:2px 0 4px;color:var(--fg)}.desc{margin:4px 0;color:var(--muted);font-size:.95rem}
.role{font-size:.9rem;color:var(--muted);margin:4px 0}
.plinks{display:flex;gap:10px;margin-top:auto;padding-top:14px}
.plink{display:inline-flex;align-items:center;gap:6px;font-size:.85rem;font-weight:600;text-decoration:none;padding:7px 12px;border-radius:8px;border:1px solid var(--line);color:var(--fg)}
.plink.live{background:var(--primary);color:var(--on-primary);border-color:var(--primary)}
.plink:hover{filter:brightness(1.08)}
.skill-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
.skill{background:var(--bg2);border:1px solid var(--line);border-radius:14px;padding:18px}
.skill h3{font-size:.85rem;color:var(--primary);font-weight:600}
.list{display:grid;gap:0}
.list-item{display:flex;justify-content:space-between;gap:24px;padding:20px 0;border-bottom:1px solid var(--line)}
.list-item:first-child{padding-top:0}.list-item h3{font-size:1.08rem}.list-item p{margin:4px 0}
.list-item h3 a{text-decoration:none}.list-item h3 a:hover{color:var(--primary)}
.right{text-align:right;color:var(--muted);font-size:.8rem;white-space:nowrap}
.quotes{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}
.quote{margin:0;background:var(--bg2);border:1px solid var(--line);border-radius:14px;padding:22px}
.quote blockquote{margin:0 0 12px;font-size:1.02rem}.quote figcaption{color:var(--muted);font-size:.88rem}
.contact{text-align:center;padding:36px 0}
.cta{font-family:var(--font-heading);font-size:clamp(1.6rem,4vw,2.6rem);margin:0 0 22px}
.contact-row{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-bottom:18px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:12px 18px;border-radius:10px;background:var(--primary);color:var(--on-primary);text-decoration:none;font-weight:600}
.btn.ghost{background:transparent;border:1px solid var(--line);color:var(--fg)}
.foot{text-align:center;color:var(--muted);font-size:.78rem;padding:40px 0 56px;position:relative;z-index:1}
@media (max-width:860px){.hero-in{grid-template-columns:1fr;padding-top:56px}.hero-side{order:-1}.avatar{width:140px;height:140px}.grid{grid-template-columns:1fr}.nav ul{display:none}.nav-cta{margin-left:auto}}
@media (max-width:520px){.term-body{padding:20px}.list-item{flex-direction:column;gap:6px}.right{text-align:left}}
`;
  },
};
