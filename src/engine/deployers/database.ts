/**
 * DatabaseDeployer: stores each immutable version's files in Postgres (SiteFile) and
 * a pointer per site (SitePointer). The platform serves them at /s/<slug>/.
 * Made for serverless hosting with no writable disk (e.g. Vercel + Neon) and early
 * traffic; switch DEPLOY_TARGET to "cloudflare" when you want edge hosting.
 */
import type { PrismaClient } from "@/generated/prisma/client";
import type { Deployer, PublishInput, PublishResult, SitePointer, SiteReader } from "./types";

export class DatabaseDeployer implements Deployer, SiteReader {
  readonly target = "database" as const;
  constructor(
    private readonly db: PrismaClient,
    private readonly appUrl: string,
  ) {}

  siteUrl(slug: string) {
    return `${this.appUrl}/s/${slug}/`;
  }

  async publish(input: PublishInput): Promise<PublishResult> {
    const total = input.files.reduce((n, f) => n + f.body.length, 0);
    // Files first, pointer last, in one transaction: the site switches only when every file exists.
    await this.db.$transaction([
      this.db.siteFile.createMany({
        data: input.files.map((f) => ({
          deploymentId: input.deploymentId,
          path: f.path,
          contentType: f.contentType,
          cacheControl: f.cacheControl,
          body: new Uint8Array(f.body),
        })),
        skipDuplicates: true,
      }),
      this.db.sitePointer.upsert({
        where: { slug: input.slug },
        update: { portfolioId: input.portfolioId, deploymentId: input.deploymentId, state: "live" },
        create: { slug: input.slug, portfolioId: input.portfolioId, deploymentId: input.deploymentId, state: "live" },
      }),
    ]);
    return { url: this.siteUrl(input.slug), storagePrefix: `db:${input.deploymentId}`, fileCount: input.files.length, totalBytes: total };
  }

  async setPointer(slug: string, _customDomain: string | null | undefined, p: SitePointer) {
    await this.db.sitePointer.upsert({
      where: { slug },
      update: { portfolioId: p.portfolioId, deploymentId: p.deploymentId, state: p.state },
      create: { slug, portfolioId: p.portfolioId, deploymentId: p.deploymentId, state: p.state },
    });
  }

  async unpublish(slug: string) {
    await this.db.sitePointer.deleteMany({ where: { slug } });
  }

  async readPointer(slug: string): Promise<SitePointer | null> {
    const p = await this.db.sitePointer.findUnique({ where: { slug } });
    return p ? { portfolioId: p.portfolioId, deploymentId: p.deploymentId, state: p.state as SitePointer["state"], updatedAt: p.updatedAt.toISOString() } : null;
  }

  async readFile(pointer: SitePointer, filePath: string) {
    const f = await this.db.siteFile.findUnique({ where: { deploymentId_path: { deploymentId: pointer.deploymentId, path: filePath } } });
    return f ? { body: Buffer.from(f.body), contentType: f.contentType, cacheControl: f.cacheControl } : null;
  }
}
