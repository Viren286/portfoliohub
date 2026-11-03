# PortfolioHub

A website that builds websites. Users fill in their details once, pick a template, and get a live, professionally designed portfolio at `https://<name>.portfoliohub.site`.

```
User details ──▶ generatePortfolio(userData, template, customization) ──▶ static site ──▶ deploy ──▶ live URL
```

## What's in v1

| Area | Status |
| --- | --- |
| Landing page (hero with live template demos, gallery, how it works, pricing) | ✅ |
| Auth: email + password, email verification, password reset, optional Google/GitHub, TOTP two-step verification | ✅ |
| User dashboard: portfolios, status, live URL, copy, plan, profile checklist | ✅ |
| Profile editor: every section in the brief, all optional, reorderable, live preview | ✅ |
| Uploads: photo, résumé (PDF/DOCX), project thumbnails + screenshots, certificates; type-sniffed, re-encoded, size-limited, quota'd | ✅ |
| 3 templates (Minimalist Professional, Modern Developer, Premium Editorial) | ✅ |
| Studio: template switch, colours, fonts, light/dark, background, card style, animation, section order/visibility, intro text, desktop/mobile live preview | ✅ |
| Generation engine (validate → normalize → sections → view model → render → SEO → bundle → deploy) | ✅ |
| Real deployment: versioned bundles + atomic pointer switch, rollback, unpublish. Local target and Cloudflare R2 + KV + Worker target | ✅ |
| Admin console: stats, users (suspend/restore, set plan), portfolios & deploys (suspend), templates (enable, tier, sync), plans (edit limits live), audit log | ✅ |
| Plans as data (Free / Pro / Admin), payment-ready schema | ✅ (payments not connected) |
| 3D templates, the other 9 template designs, custom-domain automation, payments | Planned (v1.1+) |

## Quick start (local)

Requirements: Node 20+ (22 recommended) and PostgreSQL 15+.

```bash
npm install                     # also runs `prisma generate`
cp .env.example .env            # then edit DATABASE_URL, BETTER_AUTH_SECRET, ADMIN_EMAILS
npx prisma migrate deploy       # create tables
npm run db:seed                 # plans + templates
npm run dev                     # http://localhost:3000
```

Sign up, fill in **My details**, create a portfolio, press **Publish**. With `DEPLOY_TARGET=local` the site is served at `http://localhost:3000/s/<slug>/`.
Verification and reset emails print to the terminal until you add `RESEND_API_KEY`.

### Become the admin (founder)

1. Put your email in `ADMIN_EMAILS` and sign up with it.
2. `npm run admin:grant -- you@example.com`
3. Sign in → **Settings** → turn on two-step verification → open `/admin`.

Admin access requires all three: `role=admin` in the database, the email in `ADMIN_EMAILS`, and 2FA. Everything is checked on the server for every admin page and action. Anyone else gets a 404.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server / production build / production server |
| `npm test` | Engine tests: template × fixture matrix, XSS and URL safety, SEO, deploy + rollback |
| `npm run typecheck` / `lint` | TypeScript / ESLint |
| `npm run db:migrate` | Apply migrations (`prisma migrate deploy`) |
| `npm run db:seed` | Upsert plans and register templates from code |
| `npm run admin:grant -- <email>` | Grant admin role (email must be in `ADMIN_EMAILS`) |

## Project structure

```
src/
  engine/                 ← the portfolio generation engine (plain TypeScript, no framework code)
    schema.ts             ← Zod input object: PortfolioData + Customization
    normalize.ts          ← trims, drops empty items, safe URLs, sorting
    view-model.ts         ← visible sections, customization defaults, formatting
    html.ts               ← auto-escaping HTML builder (XSS-safe by construction)
    render.ts             ← full HTML document (meta, fonts, CSS variables, JSON-LD)
    seo.ts, bundle.ts     ← SEO metadata, sitemap, robots, OG image (sharp)
    generate.ts           ← generatePortfolio() / renderPortfolio()
    deployers/            ← LocalDeployer, CloudflareDeployer (R2 + KV), interface
    __tests__/            ← fixture matrix + safety tests
  templates/              ← one file per template + shared helpers
  lib/                    ← auth, db, env, storage, uploads, profile, publish, entitlements, rate limit
  app/                    ← Next.js routes: landing, auth, dashboard, admin, API, /s and /files serving
prisma/                   ← schema, migrations, seed
worker/                   ← Cloudflare Worker that serves all published sites
docs/DEPLOYMENT.md        ← production setup, step by step
```

## How generation works

`generatePortfolio(userData, templateSlug, customization, options)` in `src/engine/generate.ts`:

1. **Validate** with Zod (`PortfolioDataSchema`, `CustomizationSchema`).
2. **Normalize**: trim; empty → gone; `github.com/x` → `https://github.com/x`; `javascript:`/`data:` URLs dropped; skills de-duplicated; experience newest first.
3. **Detect sections**: only sections with content (and not hidden) are passed to the template.
4. **Pick the template** from the registry.
5. **View model**: template defaults + user customization; initials monogram when there's no photo; no link buttons when there are no links.
6. **Render** the HTML document with an escaping template builder.
7. **SEO**: title, description, canonical, OpenGraph image, JSON-LD `Person`, sitemap, robots.
8. **Bundle**: `index.html`, `site.js`, `og.png`, `robots.txt`, `sitemap.xml`.
9. **Deploy**: upload to `sites/<portfolioId>/<deploymentId>/`, then switch the host pointer. The previous version stays live if anything fails.
10. Returns `{ url, deploymentId, status }`.

Preview uses the same renderer, so what you see in the editor is what gets published.

### Adding a template

Create `src/templates/<slug>.ts` exporting a `TemplateDefinition` (`body(vm)` + `css(vm)`), add it to `src/templates/index.ts`, run `npm test` (it must pass the fixture matrix), deploy, then press **Sync from code** in Admin → Templates and enable it.

## Security notes

- User content is escaped by construction (`src/engine/html.ts`); only http/https/mailto URLs survive.
- Published sites get a strict CSP and live on a separate domain from the app (cookie and reputation isolation).
- Uploads: real type is detected from bytes, images are decoded and re-encoded with sharp (strips EXIF/GPS and payloads), SVG is refused, documents are served as downloads, per-plan storage quota.
- Auth: Better Auth with hashed passwords, rate-limited auth endpoints, TOTP 2FA, session revocation on suspend.
- Server-side authorization everywhere: every server action and route checks the session and ownership. Admin requires role + allowlist + 2FA.
- Secrets live only in server environment variables; nothing is prefixed `NEXT_PUBLIC_`.

See **docs/DEPLOYMENT.md** for going live.
