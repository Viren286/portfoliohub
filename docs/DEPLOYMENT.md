# Deploying PortfolioHub to production

Target architecture:

- **Platform app** (landing, dashboard, admin, API) → **Vercel** at `portfoliohub.com`
- **Database** → **Neon** Postgres
- **Published portfolios** → **Cloudflare**: R2 bucket for files, Workers KV for host → version pointers, one Worker on `*.portfoliohub.site`
- **Uploads** → Cloudflare R2 assets bucket with a public custom domain
- **Email** → Resend

Budget roughly 1–2 hours the first time. Replace `portfoliohub.com` / `portfoliohub.site` with your real domains everywhere below.

---

## 1. Domains

Buy two domains (any registrar; Cloudflare Registrar is at-cost):

- `portfoliohub.com` for the platform
- `portfoliohub.site` for user sites. A *separate* domain isolates user content from your login cookies.

Add **both** to Cloudflare (Dashboard → Add a domain) and switch nameservers as instructed. The sites domain must be on Cloudflare for the Worker route; the platform domain can stay anywhere.

Later, once you have traffic, apply to add the sites domain to the Public Suffix List (https://github.com/publicsuffix/list) so browsers treat each subdomain as a separate site.

## 2. Database (Neon)

1. Create a project at https://neon.tech (region close to your users, e.g. AWS ap-south-1 Mumbai).
2. Copy the **pooled** connection string → `DATABASE_URL`.
3. From your machine:
   ```bash
   DATABASE_URL="postgres://…" npx prisma migrate deploy
   DATABASE_URL="postgres://…" npm run db:seed
   ```
4. Backups: Neon keeps point-in-time history (restore window depends on plan). For extra safety, schedule a nightly `pg_dump` to R2 or GitHub Actions artifacts.

## 3. Cloudflare: storage, pointers, Worker

### 3.1 R2 buckets
Dashboard → R2 → Create bucket:
- `portfoliohub-sites` (private; the Worker reads it)
- `portfoliohub-assets` (uploads). Settings → **Custom Domains** → connect `assets.portfoliohub.site` → this becomes `ASSETS_PUBLIC_URL=https://assets.portfoliohub.site`.

R2 → **Manage API tokens** → Create token with **Object Read & Write** on both buckets → gives `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. Your account ID is `R2_ACCOUNT_ID` / `CF_ACCOUNT_ID`.

### 3.2 KV namespace
Workers & Pages → KV → Create namespace `portfoliohub-pointers` → copy its ID → `CF_KV_NAMESPACE_ID`.

### 3.3 API token for KV writes
My Profile → API Tokens → Create Token → Custom: **Account · Workers KV Storage · Edit** → `CF_API_TOKEN`.

### 3.4 Deploy the Worker
```bash
cd worker
# edit wrangler.toml: the routes pattern/zone, SITES_DOMAIN, bucket name and KV id
npm install
npx wrangler login
npx wrangler deploy
```
In Cloudflare DNS for `portfoliohub.site`, add a proxied wildcard record so subdomains reach the Worker:
`AAAA  *  100::  (Proxied)`. Cloudflare issues the wildcard TLS certificate for `*.portfoliohub.site` automatically under Universal SSL (first-level subdomains).

Test: `curl -I https://anything.portfoliohub.site` → 404 page from the Worker.

## 4. Email (Resend)

1. https://resend.com → add and verify the `portfoliohub.com` domain (DNS records).
2. Create an API key → `RESEND_API_KEY`; set `EMAIL_FROM="PortfolioHub <no-reply@portfoliohub.com>"`.

## 5. Platform on Vercel

1. Push the repo to GitHub (private). Import it in Vercel. Use the **Pro** plan: Hobby forbids commercial use.
2. Environment variables (Production), from `.env.example`:
   ```
   DATABASE_URL, APP_URL=https://portfoliohub.com, BETTER_AUTH_URL=https://portfoliohub.com,
   BETTER_AUTH_SECRET (openssl rand -base64 32), ADMIN_EMAILS=you@…, ADMIN_REQUIRE_2FA=true,
   REQUIRE_EMAIL_VERIFICATION=true, DEPLOY_TARGET=cloudflare, SITES_DOMAIN=portfoliohub.site,
   STORAGE_DRIVER=r2, R2_*, ASSETS_PUBLIC_URL, CF_ACCOUNT_ID, CF_API_TOKEN, CF_KV_NAMESPACE_ID,
   RESEND_API_KEY, EMAIL_FROM
   ```
3. Build command `npm run build` (default). The `postinstall` script generates the Prisma client.
4. Add the domain `portfoliohub.com` in Vercel → Domains.
5. Deploy. Then sign up with your founder email, run `npm run admin:grant -- you@…` against the production `DATABASE_URL`, and enable 2FA in Settings.

### Optional
- **Google sign-in**: Google Cloud Console → OAuth client (Web) → redirect URI `https://portfoliohub.com/api/auth/callback/google`.
- **GitHub sign-in**: GitHub → Settings → Developer settings → OAuth Apps → callback `https://portfoliohub.com/api/auth/callback/github`.
- **Shared rate limits**: create an Upstash Redis database → `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

## 6. Smoke test

1. Sign up with a second email → verify via email link → fill details → upload photo and résumé → create portfolio → Publish.
2. Open `https://<slug>.portfoliohub.site`. Check: content, photo loads from `assets.`, résumé downloads, `og.png`, `sitemap.xml`.
3. Republish, then use **Restore** on the older version → the site switches back within ~60 s (KV propagation).
4. As admin: suspend that user → the site shows "Unavailable"; restore → it comes back.

## 7. Monitoring and maintenance

- **Admin → Overview**: signups, deploy success rate, failures, storage, estimated infra cost.
- **Vercel**: Logs and Observability for the app; set a spend limit under Billing.
- **Cloudflare**: Worker analytics (requests, errors), R2 usage.
- **Errors**: add Sentry (`npx @sentry/wizard -i nextjs`) when you have users.
- **Migrations**: change `prisma/schema.prisma` → `npx prisma migrate dev --name <change>` locally → commit → run `npm run db:migrate` against production before or as part of deploy.
- **Dependency updates**: monthly `npm outdated`; run `npm test && npm run build` before deploying.
- **Abuse**: every site footer can be reported (add a contact address); suspend from Admin → Portfolios. Suspension flips the edge pointer immediately.

## Custom domains (Pro, v1.1)

The data model, entitlement and deploy path already support `customDomain` (the Cloudflare deployer writes a pointer for it). To finish automation, enable **Cloudflare for SaaS** on the sites zone, set the fallback origin to the Worker, and call the Custom Hostnames API when a user saves a domain (first 100 hostnames are free, then $0.10/month each).
