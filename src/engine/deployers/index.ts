import "server-only";
import path from "node:path";
import { db } from "@/lib/db";
import { assertCloudflareConfigured, env } from "@/lib/env";
import { CloudflareDeployer } from "./cloudflare";
import { DatabaseDeployer } from "./database";
import { LocalDeployer } from "./local";
import type { Deployer, SiteReader } from "./types";

let cached: Deployer | null = null;

export function getDeployer(): Deployer {
  if (cached) return cached;
  if (env.deployTarget === "cloudflare") {
    assertCloudflareConfigured();
    cached = new CloudflareDeployer({
      accountId: env.cloudflare.accountId,
      r2AccessKeyId: env.r2.accessKeyId,
      r2SecretAccessKey: env.r2.secretAccessKey,
      sitesBucket: env.r2.sitesBucket,
      apiToken: env.cloudflare.apiToken,
      kvNamespaceId: env.cloudflare.kvNamespaceId,
      sitesDomain: env.sitesDomain,
    });
  } else if (env.deployTarget === "database") {
    cached = new DatabaseDeployer(db, env.appUrl);
  } else {
    cached = new LocalDeployer(path.join(env.dataDir, "sites"), env.appUrl);
  }
  return cached;
}

/** The store that /s/<slug>/ serves from, when the platform itself hosts the sites. */
export function getSiteReader(): SiteReader {
  if (env.deployTarget === "database") return new DatabaseDeployer(db, env.appUrl);
  return new LocalDeployer(path.join(env.dataDir, "sites"), env.appUrl);
}

export type { Deployer };
