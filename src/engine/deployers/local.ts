/**
 * LocalDeployer: writes immutable, versioned bundles to disk and serves them from
 * the app at /s/<slug>. Same model as the Cloudflare edge (files per deployment +
 * a hostname pointer), so local development exercises the real publish flow.
 * Suitable for development and single-server self-hosting.
 */
import fs from "node:fs/promises";
import path from "node:path";
import type { BundleFile, Deployer, PublishInput, PublishResult, SitePointer, SiteReader } from "./types";

export class LocalDeployer implements Deployer, SiteReader {
  readonly target = "local" as const;
  constructor(
    private readonly rootDir: string,
    private readonly appUrl: string,
  ) {}

  private pointerPath(slug: string) {
    return path.join(this.rootDir, "_pointers", `${slug}.json`);
  }

  siteUrl(slug: string) {
    return `${this.appUrl}/s/${slug}/`;
  }

  async publish(input: PublishInput): Promise<PublishResult> {
    const prefix = path.join("sites", input.portfolioId, input.deploymentId);
    const dir = path.join(this.rootDir, input.portfolioId, input.deploymentId);
    await fs.mkdir(dir, { recursive: true });
    let total = 0;
    for (const f of input.files) {
      const target = path.join(dir, f.path);
      if (!target.startsWith(dir + path.sep)) throw new Error(`Refusing to write outside the bundle: ${f.path}`);
      await fs.writeFile(target, f.body);
      total += f.body.length;
    }
    await fs.writeFile(path.join(dir, "_manifest.json"), JSON.stringify(input.files.map(manifestEntry)));
    // The pointer switch is last: the site only changes once every file is in place.
    await this.setPointer(input.slug, null, {
      portfolioId: input.portfolioId,
      deploymentId: input.deploymentId,
      state: "live",
      updatedAt: new Date().toISOString(),
    });
    return { url: this.siteUrl(input.slug), storagePrefix: prefix, fileCount: input.files.length, totalBytes: total };
  }

  async setPointer(slug: string, _customDomain: string | null | undefined, pointer: SitePointer) {
    const p = this.pointerPath(slug);
    await fs.mkdir(path.dirname(p), { recursive: true });
    const tmp = `${p}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(pointer));
    await fs.rename(tmp, p); // atomic switch
  }

  async unpublish(slug: string) {
    await fs.rm(this.pointerPath(slug), { force: true });
  }

  // ------------------------------------------------------------ serving (used by /s/[slug] route)

  async readPointer(slug: string): Promise<SitePointer | null> {
    try {
      return JSON.parse(await fs.readFile(this.pointerPath(slug), "utf8"));
    } catch {
      return null;
    }
  }

  async readFile(pointer: SitePointer, filePath: string): Promise<{ body: Buffer; contentType: string; cacheControl: string } | null> {
    const dir = path.join(this.rootDir, pointer.portfolioId, pointer.deploymentId);
    try {
      const manifest: ReturnType<typeof manifestEntry>[] = JSON.parse(await fs.readFile(path.join(dir, "_manifest.json"), "utf8"));
      const entry = manifest.find((m) => m.path === filePath);
      if (!entry) return null;
      return { body: await fs.readFile(path.join(dir, entry.path)), contentType: entry.contentType, cacheControl: entry.cacheControl };
    } catch {
      return null;
    }
  }
}

function manifestEntry(f: BundleFile) {
  return { path: f.path, contentType: f.contentType, cacheControl: f.cacheControl, bytes: f.body.length };
}
