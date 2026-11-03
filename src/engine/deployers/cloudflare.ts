/**
 * CloudflareDeployer: uploads each version to R2 under sites/<portfolioId>/<deploymentId>/
 * and then switches the Workers KV pointer `host:<hostname>` to that version.
 * The edge Worker (worker/src/index.ts) serves every portfolio from these two stores.
 */
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Deployer, PublishInput, PublishResult, SitePointer } from "./types";

export interface CloudflareConfig {
  accountId: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  sitesBucket: string;
  apiToken: string;
  kvNamespaceId: string;
  sitesDomain: string;
}

export class CloudflareDeployer implements Deployer {
  readonly target = "cloudflare" as const;
  private s3: S3Client;

  constructor(private readonly cfg: CloudflareConfig) {
    this.s3 = new S3Client({
      region: "auto",
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: cfg.r2AccessKeyId, secretAccessKey: cfg.r2SecretAccessKey },
    });
  }

  private hosts(slug: string, customDomain?: string | null) {
    return [`${slug}.${this.cfg.sitesDomain}`, ...(customDomain ? [customDomain.toLowerCase()] : [])];
  }

  siteUrl(slug: string, customDomain?: string | null) {
    return `https://${customDomain || `${slug}.${this.cfg.sitesDomain}`}`;
  }

  async publish(input: PublishInput): Promise<PublishResult> {
    const prefix = `sites/${input.portfolioId}/${input.deploymentId}`;
    let total = 0;
    // Upload with limited concurrency; files are small and few (≈5 per site).
    await Promise.all(
      input.files.map(async (f) => {
        await this.withRetry(() =>
          this.s3.send(
            new PutObjectCommand({
              Bucket: this.cfg.sitesBucket,
              Key: `${prefix}/${f.path}`,
              Body: f.body,
              ContentType: f.contentType,
              CacheControl: f.cacheControl,
            }),
          ),
        );
        total += f.body.length;
      }),
    );
    await this.setPointer(input.slug, input.customDomain, {
      portfolioId: input.portfolioId,
      deploymentId: input.deploymentId,
      state: "live",
      updatedAt: new Date().toISOString(),
    });
    return { url: this.siteUrl(input.slug, input.customDomain), storagePrefix: prefix, fileCount: input.files.length, totalBytes: total };
  }

  async setPointer(slug: string, customDomain: string | null | undefined, pointer: SitePointer) {
    for (const host of this.hosts(slug, customDomain)) {
      await this.withRetry(() => this.kv("PUT", `host:${host}`, JSON.stringify(pointer)));
    }
  }

  async unpublish(slug: string, customDomain?: string | null) {
    for (const host of this.hosts(slug, customDomain)) {
      await this.withRetry(() => this.kv("DELETE", `host:${host}`));
    }
  }

  private async kv(method: "PUT" | "DELETE", key: string, body?: string) {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.cfg.accountId}/storage/kv/namespaces/${this.cfg.kvNamespaceId}/values/${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${this.cfg.apiToken}`, ...(body ? { "Content-Type": "text/plain" } : {}) },
      body,
    });
    if (!res.ok && !(method === "DELETE" && res.status === 404)) {
      const text = await res.text().catch(() => "");
      throw new Error(`Cloudflare KV ${method} ${key} failed: ${res.status} ${text.slice(0, 200)}`);
    }
  }

  private async withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
    let last: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (e) {
        last = e;
        await new Promise((r) => setTimeout(r, 300 * 2 ** i));
      }
    }
    throw last;
  }
}
