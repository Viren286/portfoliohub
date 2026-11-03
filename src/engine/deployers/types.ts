export interface BundleFile {
  path: string; // e.g. "index.html", "og.png"
  contentType: string;
  body: Buffer;
  cacheControl: string;
}

export type PointerState = "live" | "suspended";

export interface SitePointer {
  portfolioId: string;
  deploymentId: string;
  state: PointerState;
  updatedAt: string;
}

export interface PublishInput {
  portfolioId: string;
  deploymentId: string;
  slug: string;
  customDomain?: string | null;
  files: BundleFile[];
}

export interface PublishResult {
  url: string;
  storagePrefix: string;
  fileCount: number;
  totalBytes: number;
}

/**
 * A deployment target. The engine produces a static bundle; a Deployer puts it
 * somewhere reachable and points the site's hostname(s) at that exact version.
 */
export interface Deployer {
  readonly target: "local" | "cloudflare" | "database";
  siteUrl(slug: string, customDomain?: string | null): string;
  publish(input: PublishInput): Promise<PublishResult>;
  /** Point the site at a previous version (rollback) or change its state (suspend/restore). */
  setPointer(slug: string, customDomain: string | null | undefined, pointer: SitePointer): Promise<void>;
  /** Take the site offline: remove its hostname pointer(s). Files are kept for audit/rollback. */
  unpublish(slug: string, customDomain?: string | null): Promise<void>;
}

/** Deployers that the platform itself serves (local disk, database) also implement this. */
export interface SiteReader {
  readPointer(slug: string): Promise<SitePointer | null>;
  readFile(pointer: SitePointer, filePath: string): Promise<{ body: Buffer; contentType: string; cacheControl: string } | null>;
}
