/** Response headers and fallback pages for published portfolio sites (shared by local serving). */

export const SITE_CSP = [
  "default-src 'none'",
  "img-src 'self' https: data:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "script-src 'self'",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

export function siteHeaders(filePath: string): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    ...(filePath.endsWith(".html") ? { "Content-Security-Policy": SITE_CSP } : {}),
  };
}

const shell = (title: string, body: string) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px/1.5 system-ui,sans-serif;background:#f4f1ea;color:#121211}main{max-width:420px;padding:32px;text-align:center}h1{font:400 40px/1.1 Georgia,serif;margin:0 0 12px}p{color:#77736a;margin:0}</style></head><body><main>${body}</main></body></html>`;

export const notFoundPage = () => shell("Not found", "<h1>Nothing here yet</h1><p>This portfolio doesn't exist or isn't published.</p>");
export const suspendedPage = () => shell("Unavailable", "<h1>Unavailable</h1><p>This site is temporarily unavailable.</p>");
