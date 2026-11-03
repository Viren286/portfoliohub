export const RESERVED_SLUGS = new Set([
  "www", "app", "api", "admin", "administrator", "root", "mail", "email", "smtp", "imap", "pop", "ftp", "assets", "static",
  "cdn", "img", "images", "media", "files", "status", "help", "support", "docs", "blog", "dashboard", "account", "accounts",
  "login", "signin", "sign-in", "signup", "sign-up", "auth", "oauth", "billing", "pay", "payments", "secure", "security",
  "portfoliohub", "official", "team", "staff", "test", "dev", "staging", "preview", "s", "p", "about", "pricing", "abuse",
  "postmaster", "hostmaster", "webmaster", "noreply", "no-reply", "null", "undefined",
]);

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "");
}

export function slugProblem(slug: string): string | null {
  if (!SLUG_RE.test(slug)) return "Use 3–30 lowercase letters, numbers or hyphens (not at the start or end).";
  if (slug.includes("--")) return "Avoid double hyphens.";
  if (RESERVED_SLUGS.has(slug)) return "That name is reserved.";
  return null;
}
