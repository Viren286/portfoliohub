import { headers } from "next/headers";
import { z } from "zod";
import { renderPortfolio, EngineError } from "@/engine/generate";
import { CustomizationSchema } from "@/engine/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEntitlements } from "@/lib/entitlements";
import { env } from "@/lib/env";
import { formToPortfolioData, loadPortfolioData, ProfileFormSchema } from "@/lib/profile";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  templateSlug: z.string().max(60),
  customization: CustomizationSchema.optional(),
  /** Unsaved editor state; when omitted the saved profile is used. */
  form: ProfileFormSchema.optional(),
});

/**
 * Live preview: renders the user's own data inside any template with the same
 * engine used for publishing. Returned HTML is shown in a sandboxed iframe.
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });
  const rl = await rateLimit(`preview:${session.user.id}`, 120, 60);
  if (!rl.ok) return new Response("Too many preview requests", { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Invalid preview request", { status: 400 });
  const { templateSlug, customization, form } = parsed.data;

  const template = await db.template.findUnique({ where: { slug: templateSlug } });
  if (!template) return new Response("Unknown template", { status: 404 });

  try {
    const data = form ? await formToPortfolioData(session.user.id, form) : await loadPortfolioData(session.user.id, session.user.name);
    const { e } = await getEntitlements(session.user);
    const { html } = renderPortfolio(data, templateSlug, customization, {
      mode: "preview",
      appUrl: env.appUrl,
      showBranding: !e.removeBranding,
    });
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    const msg = err instanceof EngineError ? (err.code === "MISSING_NAME" ? "Add your name to see a preview." : err.message) : "Preview failed";
    return new Response(msg, { status: 422 });
  }
}
