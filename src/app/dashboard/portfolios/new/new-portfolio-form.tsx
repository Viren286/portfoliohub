"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ScaledFrame } from "@/components/scaled-frame";
import { Alert, Spinner } from "@/components/form-bits";
import { checkSlugAction, createPortfolioAction } from "../../actions";

type Option = { slug: string; name: string; description: string; tier: string; locked: boolean; html: string };

export function NewPortfolioForm({ options, suggestedSlug, sitesDomain, appUrl, defaultName }: { options: Option[]; suggestedSlug: string; sitesDomain: string | null; appUrl: string; defaultName: string }) {
  const router = useRouter();
  const [template, setTemplate] = useState(options.find((o) => !o.locked)?.slug ?? "");
  const [slug, setSlug] = useState(suggestedSlug);
  const [name, setName] = useState(defaultName);
  const [slugMsg, setSlugMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    const t = setTimeout(async () => setSlugMsg(await checkSlugAction(slug)), 350);
    return () => clearTimeout(t);
  }, [slug]);

  const preview = sitesDomain ? `${slug || "you"}.${sitesDomain}` : `${appUrl.replace(/^https?:\/\//, "")}/s/${slug || "you"}`;

  return (
    <form
      className="mt-10"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await createPortfolioAction({ name, slug, templateSlug: template });
          if (!res.ok) return setError(res.error);
          router.push(`/dashboard/portfolios/${res.id}`);
        });
      }}
    >
      <div role="radiogroup" aria-label="Template" className="grid gap-6 md:grid-cols-3">
        {options.map((o) => (
          <button
            type="button"
            role="radio"
            aria-checked={template === o.slug}
            key={o.slug}
            disabled={o.locked}
            onClick={() => setTemplate(o.slug)}
            className={`group text-left transition ${o.locked ? "opacity-50" : ""}`}
          >
            <div className={`overflow-hidden rounded-2xl border-2 transition ${template === o.slug ? "border-signal shadow-[0_20px_50px_-25px_rgba(255,79,31,.6)]" : "border-line group-hover:border-ink-2"}`}>
              {o.html ? <ScaledFrame html={o.html} title={`${o.name} preview`} aspect={1.1} /> : <div className="aspect-[1/1.1] bg-paper-2" />}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-semibold">{o.name}</span>
              <span className="badge bg-paper-2 text-ink-2">{o.locked ? "Pro" : o.tier === "PRO" ? "Pro" : "Free"}</span>
            </div>
            <p className="mt-1 text-sm text-muted">{o.description}</p>
          </button>
        ))}
      </div>

      <div className="card mt-10 grid gap-6 p-6 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="block">
          <span className="label">Portfolio name (only you see this)</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
        </label>
        <label className="block">
          <span className="label">Web address</span>
          <input className="input font-mono" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} maxLength={30} required aria-describedby="slug-help" />
          <span id="slug-help" className={`mt-1.5 block text-xs ${slugMsg && !slugMsg.ok ? "text-bad" : "text-muted"}`}>
            {slugMsg && !slugMsg.ok ? slugMsg.message : <>Your site: <span className="font-mono text-ink">{preview}</span></>}
          </span>
        </label>
        <button className="btn-signal h-11 px-8" disabled={pending || !template || (slugMsg ? !slugMsg.ok : false)}>
          {pending ? <Spinner /> : "Create & customize"}
        </button>
      </div>
      <div className="mt-4"><Alert>{error}</Alert></div>
    </form>
  );
}
