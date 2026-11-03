import { describe, expect, it } from "vitest";
import { normalize, safeUrl } from "../normalize";
import { renderPortfolio, generatePortfolio, EngineError } from "../generate";
import { LocalDeployer } from "../deployers/local";
import { TEMPLATES } from "@/templates";
import { FIXTURES, full, hostile, nameOnly, noLinks } from "./fixtures";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const opts = { mode: "publish" as const, appUrl: "https://portfoliohub.com", siteUrl: "https://maya.portfoliohub.site", showBranding: true };

/** Rendering defects that must never appear on a generated site. */
function assertClean(html: string) {
  const text = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
  expect(text).not.toMatch(/\bundefined\b/);
  expect(text).not.toMatch(/>\s*null\s*</);
  expect(text).not.toMatch(/NaN/);
  expect(html).not.toMatch(/<h[1-3][^>]*>\s*<\/h[1-3]>/); // empty headings
  expect(html).not.toMatch(/href=""/);
  expect(html).not.toMatch(/src=""/);
  expect(html).not.toMatch(/<ul[^>]*>\s*<\/ul>/); // empty lists
  expect(html).not.toMatch(/<section[^>]*>\s*<h2>[^<]*<\/h2>\s*<div class="sec-body">\s*<\/div>/);
}

describe("template fixture matrix", () => {
  for (const [tname] of Object.entries(TEMPLATES)) {
    for (const [fname, data] of Object.entries(FIXTURES)) {
      it(`${tname} × ${fname}`, () => {
        const { html, vm } = renderPortfolio(data, tname, {}, opts);
        assertClean(html);
        expect(html).toContain("<!doctype html>");
        // every visible section has an anchor, and nothing else does
        for (const s of vm.sections) expect(html).toContain(`id="${s.key}"`);
      });
    }
  }
});

describe("section detection", () => {
  it("shows only sections that have data", () => {
    const { vm } = renderPortfolio(nameOnly, "minimal", {}, opts);
    expect(vm.sections).toEqual([]);
  });
  it("shows a project without a live URL and no broken Live button", () => {
    const { html, vm } = renderPortfolio(noLinks, "developer", {}, opts);
    expect(vm.sections.map((s) => s.key)).toEqual(["about", "projects"]);
    expect(html).toContain("Offline thing");
    expect(html).not.toContain("Live site");
  });
  it("respects hidden sections and custom order", () => {
    const { vm } = renderPortfolio(full, "minimal", { hiddenSections: ["hobbies", "awards"], sectionOrder: ["projects", "experience"] }, opts);
    const keys = vm.sections.map((s) => s.key);
    expect(keys.slice(0, 2)).toEqual(["projects", "experience"]);
    expect(keys).not.toContain("hobbies");
    expect(keys).not.toContain("awards");
  });
  it("uses an initials monogram when there is no photo", () => {
    const { html } = renderPortfolio({ personal: { fullName: "Aarav Mehta", about: "Hi" } }, "minimal", {}, opts);
    expect(html).toContain('class="avatar monogram"');
    expect(html).toContain(">AM<");
  });
});

describe("normalization and safety", () => {
  it("drops dangerous URLs and empty items", () => {
    const d = normalize(hostile);
    expect(d.personal.linkedinUrl).toBeUndefined();
    expect(d.personal.githubUrl).toBeUndefined();
    expect(d.personal.email).toBeUndefined();
    expect(d.personal.avatar).toBeUndefined();
    expect(d.personal.socials).toEqual([]);
    expect(d.projects.map((p) => p.name)).toEqual(["Real"]);
    expect(d.projects[0].liveUrl).toBeUndefined();
    expect(d.projects[0].repoUrl).toBeUndefined();
    expect(d.experience).toEqual([]);
    expect(d.education).toEqual([]);
    expect(d.skills).toEqual([]);
    expect(d.hobbies).toEqual([]);
  });
  it("escapes all user text in every template", () => {
    for (const t of Object.keys(TEMPLATES)) {
      const { html } = renderPortfolio(hostile, t, {}, opts);
      expect(html).not.toContain("<script>alert");
      expect(html).not.toContain("<img src=x");
      expect(html).not.toMatch(/href="(javascript|data|vbscript):/i);
      expect(html).toContain("&lt;script&gt;");
    }
  });
  it("adds https:// and dedupes skills case-insensitively", () => {
    expect(safeUrl("github.com/maya")).toBe("https://github.com/maya");
    expect(safeUrl("mailto:a@b.co")).toBe("mailto:a@b.co");
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    const d = normalize(full);
    expect(d.skills[0].items).toEqual(["TypeScript", "Go", "SQL"]);
  });
  it("orders current roles first", () => {
    expect(normalize(full).experience[0].current).toBe(true);
  });
  it("rejects bad input with a typed error", () => {
    expect(() => renderPortfolio({ personal: { fullName: "  " } }, "minimal", {}, opts)).toThrow(EngineError);
    expect(() => renderPortfolio(full, "nope", {}, opts)).toThrow(/Unknown template/);
    expect(() => renderPortfolio(full, "minimal", { primaryColor: "red" }, opts)).toThrow(EngineError);
  });
});

describe("SEO", () => {
  it("emits title, description, canonical, OG and JSON-LD", () => {
    const { html } = renderPortfolio(full, "editorial", {}, opts);
    expect(html).toContain("<title>Maya Krishnan — Full-stack engineer building calm, fast web apps</title>");
    expect(html).toContain('rel="canonical" href="https://maya.portfoliohub.site"');
    expect(html).toContain('property="og:image" content="https://maya.portfoliohub.site/og.png"');
    expect(html).toContain('"@type":"Person"');
  });
});

describe("generatePortfolio end to end (local deployer)", () => {
  it("builds, deploys, and switches the pointer atomically", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ph-"));
    const deployer = new LocalDeployer(dir, "http://localhost:3000");
    const stages: string[] = [];
    const res = await generatePortfolio(full, "developer", { animation: "none" }, {
      portfolioId: "p1",
      deploymentId: "d1",
      slug: "maya",
      appUrl: "http://localhost:3000",
      showBranding: false,
      deployer,
      onStage: (s) => {
        stages.push(s);
      },
    });
    expect(stages).toEqual(["RENDERING", "UPLOADING"]);
    expect(res.url).toBe("http://localhost:3000/s/maya/");
    expect(res.files.map((f) => f.path).sort()).toEqual(["index.html", "og.png", "robots.txt", "site.js", "sitemap.xml"]);
    const pointer = await deployer.readPointer("maya");
    expect(pointer).toMatchObject({ portfolioId: "p1", deploymentId: "d1", state: "live" });
    const page = await deployer.readFile(pointer!, "index.html");
    expect(page?.body.toString()).toContain("Maya Krishnan");
    expect(page?.body.toString()).not.toContain("Made with PortfolioHub");

    // second deploy, then roll back to the first
    await generatePortfolio(nameOnly, "minimal", {}, { portfolioId: "p1", deploymentId: "d2", slug: "maya", appUrl: "x", showBranding: true, deployer });
    expect((await deployer.readPointer("maya"))?.deploymentId).toBe("d2");
    await deployer.setPointer("maya", null, { ...pointer!, updatedAt: new Date().toISOString() });
    expect((await deployer.readPointer("maya"))?.deploymentId).toBe("d1");
  });
});
