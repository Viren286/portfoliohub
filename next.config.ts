import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // The platform is almost entirely per-user (dashboard, editor, admin), so we use
  // classic dynamic rendering instead of Cache Components.
  cacheComponents: false,
  // Locally-served sites live at /s/<slug>/ and rely on the trailing slash for relative assets.
  skipTrailingSlashRedirect: true,
  serverExternalPackages: ["sharp", "@prisma/client", "pg"],
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  async headers() {
    return [{ source: "/((?!s/).*)", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
