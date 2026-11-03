import "server-only";
import crypto from "node:crypto";
import path from "node:path";

function bool(v: string | undefined, fallback: boolean) {
  if (v === undefined || v === "") return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

const isProd = process.env.NODE_ENV === "production";

/**
 * Session-signing secret. Prefer BETTER_AUTH_SECRET. If it isn't set, derive one from the
 * database connection string (which contains a long random password that only the server
 * knows), so a fresh Vercel + Neon deploy works without anyone typing a secret.
 * Rotating the DB password then signs everyone out, which is acceptable.
 */
function authSecret(): string {
  if (process.env.BETTER_AUTH_SECRET) return process.env.BETTER_AUTH_SECRET;
  const seed = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!seed) return "";
  return crypto.createHash("sha256").update(`portfoliohub-auth-secret-v1:${seed}`).digest("base64url");
}

/** Server-side configuration. Secrets never leave the server (no NEXT_PUBLIC_ prefix). */
export const env = {
  isProd,
  appUrl: (process.env.APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  authSecret: authSecret(),
  databaseUrl: process.env.DATABASE_URL ?? "",

  /** Comma-separated founder emails. Admin access needs role=admin AND an email on this list. */
  adminEmails: (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  adminRequire2fa: bool(process.env.ADMIN_REQUIRE_2FA, true),
  requireEmailVerification: bool(process.env.REQUIRE_EMAIL_VERIFICATION, isProd),

  deployTarget: (process.env.DEPLOY_TARGET ?? "local") as "local" | "cloudflare" | "database",
  sitesDomain: process.env.SITES_DOMAIN ?? "portfoliohub.site",
  storageDriver: (process.env.STORAGE_DRIVER ?? "local") as "local" | "r2" | "database",
  /** Per-file upload cap. Vercel functions accept request bodies up to ~4.5 MB, so use 4 there. */
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 8),
  dataDir: path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR ?? ".data"),

  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    sitesBucket: process.env.R2_SITES_BUCKET ?? "portfoliohub-sites",
    assetsBucket: process.env.R2_ASSETS_BUCKET ?? "portfoliohub-assets",
    assetsPublicUrl: (process.env.ASSETS_PUBLIC_URL ?? "").replace(/\/$/, ""),
  },
  cloudflare: {
    accountId: process.env.CF_ACCOUNT_ID ?? process.env.R2_ACCOUNT_ID ?? "",
    apiToken: process.env.CF_API_TOKEN ?? "",
    kvNamespaceId: process.env.CF_KV_NAMESPACE_ID ?? "",
  },

  email: {
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    from: process.env.EMAIL_FROM ?? "PortfolioHub <no-reply@portfoliohub.com>",
  },
  oauth: {
    googleId: process.env.GOOGLE_CLIENT_ID ?? "",
    googleSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    githubId: process.env.GITHUB_CLIENT_ID ?? "",
    githubSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
  },
};

export function assertCloudflareConfigured() {
  const missing = [
    ["R2_ACCOUNT_ID", env.r2.accountId],
    ["R2_ACCESS_KEY_ID", env.r2.accessKeyId],
    ["R2_SECRET_ACCESS_KEY", env.r2.secretAccessKey],
    ["CF_API_TOKEN", env.cloudflare.apiToken],
    ["CF_KV_NAMESPACE_ID", env.cloudflare.kvNamespaceId],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) throw new Error(`Cloudflare deploy target is missing env vars: ${missing.join(", ")}`);
}
