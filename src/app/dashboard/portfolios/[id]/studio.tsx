"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { Customization, SectionKey } from "@/engine/schema";
import { SECTION_KEYS } from "@/engine/schema";
import { Alert, Spinner } from "@/components/form-bits";
import { CopyButton } from "@/components/copy-button";
import { StatusBadge } from "@/components/status-badge";
import { deletePortfolioAction, publishAction, rollbackAction, unpublishAction, updatePortfolioAction } from "../../actions";

type TemplateOpt = { slug: string; name: string; tier: string; locked: boolean; defaults: Partial<Customization> };
type Deployment = { id: string; status: string; createdAt: string; durationMs: number | null; url: string | null; errorMessage: string | null; canRestore: boolean };

const SWATCHES = ["#0F766E", "#2563EB", "#C2410C", "#A3E635", "#DB2777", "#7C3AED", "#111827", "#B45309", "#0EA5E9", "#16A34A"];
const STYLE_KEYS: (keyof Customization)[] = ["primaryColor", "secondaryColor", "font", "headingFont", "mode", "background", "cardStyle", "animation"];

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex rounded-xl border border-line bg-white p-1" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={value === o.v}
            onClick={() => onChange(o.v)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${value === o.v ? "bg-ink text-paper" : "text-ink-2 hover:text-ink"}`}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="group border-b border-line py-5 last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
        {title}
        <span className="text-muted transition group-open:rotate-45">+</span>
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}

export function Studio({
  portfolio,
  templates,
  deployments,
  fonts,
  sectionTitles,
  available,
  canCustomDomain,
  siteHint,
  emailVerified,
}: {
  portfolio: { id: string; name: string; slug: string; customDomain: string; templateSlug: string; status: string; liveUrl: string | null; liveDeploymentId: string | null; customization: Customization; order: string[]; hidden: string[] };
  templates: TemplateOpt[];
  deployments: Deployment[];
  fonts: { key: string; label: string }[];
  sectionTitles: Record<string, string>;
  available: string[];
  canCustomDomain: boolean;
  siteHint: string;
  emailVerified: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(portfolio.name);
  const [slug, setSlug] = useState(portfolio.slug);
  const [customDomain, setCustomDomain] = useState(portfolio.customDomain);
  const [templateSlug, setTemplateSlug] = useState(portfolio.templateSlug);
  const [overrides, setOverrides] = useState<Customization>(() =>
    Object.fromEntries(Object.entries(portfolio.customization).filter(([k]) => k !== "sectionOrder" && k !== "hiddenSections")),
  );
  const [order, setOrder] = useState<SectionKey[]>(() => {
    const o = portfolio.order.filter((k): k is SectionKey => (SECTION_KEYS as readonly string[]).includes(k));
    return [...o, ...SECTION_KEYS.filter((k) => !o.includes(k))];
  });
  const [hidden, setHidden] = useState<SectionKey[]>(portfolio.hidden as SectionKey[]);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [html, setHtml] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [saving, startSave] = useTransition();
  const [publishing, startPublish] = useTransition();
  const [stage, setStage] = useState("");

  const template = templates.find((t) => t.slug === templateSlug) ?? templates[0];
  const c = { ...template.defaults, ...overrides } as Required<Customization>;
  const set = <K extends keyof Customization>(k: K, v: Customization[K]) => setOverrides((o) => ({ ...o, [k]: v }));
  const customization: Customization = useMemo(() => ({ ...overrides, sectionOrder: order, hiddenSections: hidden }), [overrides, order, hidden]);
  const live = portfolio.status === "LIVE" && portfolio.liveUrl;
  const locked = portfolio.status === "SUSPENDED";

  // live preview (debounced)
  const payload = useMemo(() => JSON.stringify({ templateSlug, customization }), [templateSlug, customization]);
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, signal: ctrl.signal });
        const text = await res.text();
        if (res.ok) {
          setHtml(text);
          setPreviewError("");
        } else setPreviewError(text);
      } catch {
        /* aborted */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [payload]);

  const body = () => ({ id: portfolio.id, name, slug, templateSlug, customDomain, customization: overrides, sections: { order, hidden } });

  const save = () =>
    startSave(async () => {
      const res = await updatePortfolioAction(body());
      setMsg(res.ok ? { tone: "ok", text: "Design saved." } : { tone: "bad", text: res.error });
      if (res.ok) router.refresh();
    });

  const publish = () =>
    startPublish(async () => {
      setMsg(null);
      setStage("Saving design…");
      const saved = await updatePortfolioAction(body());
      if (!saved.ok) {
        setStage("");
        return setMsg({ tone: "bad", text: saved.error });
      }
      setStage("Building and deploying…");
      const res = await publishAction(portfolio.id);
      setStage("");
      setMsg(res.ok ? { tone: "ok", text: `Live at ${res.url}` } : { tone: "bad", text: res.error });
      router.refresh();
    });

  const move = (i: number, d: -1 | 1) =>
    setOrder((o) => {
      const n = [...o];
      const j = i + d;
      if (j < 0 || j >= n.length) return o;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  return (
    <div className="flex min-h-[calc(100vh-57px)] flex-col">
      {/* top bar */}
      <div className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4 px-6 py-3">
          <Link href="/dashboard" className="text-sm text-muted hover:text-ink">← Portfolios</Link>
          <h1 className="truncate text-lg font-semibold">{name}</h1>
          <StatusBadge status={portfolio.status} />
          {live && (
            <a href={portfolio.liveUrl!} target="_blank" rel="noopener noreferrer" className="hidden truncate font-mono text-sm text-signal-ink hover:underline md:inline">
              {portfolio.liveUrl!.replace(/^https?:\/\//, "")}
            </a>
          )}
          <div className="ml-auto flex items-center gap-2">
            {live && <CopyButton text={portfolio.liveUrl!} />}
            <Link href="/dashboard/profile" className="btn-ghost btn-sm">Edit details</Link>
            <button className="btn-ghost btn-sm" onClick={save} disabled={saving || locked}>{saving ? <Spinner /> : "Save"}</button>
            <button className="btn-signal btn-sm px-5" onClick={publish} disabled={publishing || locked || !emailVerified} title={!emailVerified ? "Verify your email first" : undefined}>
              {publishing ? <><Spinner /> {stage}</> : live ? "Republish" : "Publish"}
            </button>
          </div>
        </div>
        {(msg || locked || !emailVerified) && (
          <div className="mx-auto max-w-[1600px] px-6 pb-3">
            {locked ? <Alert>This portfolio was suspended by an administrator.</Alert> : !emailVerified && !msg ? <Alert tone="info">Verify your email (see the banner above) to publish.</Alert> : msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
          </div>
        )}
      </div>

      <div className="mx-auto grid w-full max-w-[1600px] flex-1 lg:grid-cols-[360px_1fr]">
        {/* controls */}
        <aside className="border-r border-line px-6 lg:h-[calc(100vh-120px)] lg:overflow-y-auto">
          <Panel title="Template">
            <div className="grid gap-2">
              {templates.map((t) => (
                <button
                  key={t.slug}
                  type="button"
                  disabled={t.locked}
                  onClick={() => {
                    setTemplateSlug(t.slug);
                    setOverrides((o) => Object.fromEntries(Object.entries(o).filter(([k]) => !STYLE_KEYS.includes(k as keyof Customization))));
                  }}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${templateSlug === t.slug ? "border-ink bg-white" : "border-line hover:border-ink-2"} disabled:opacity-50`}
                >
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-muted">{t.locked ? "Pro" : templateSlug === t.slug ? "Selected" : ""}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Colours">
            {(["primaryColor", "secondaryColor"] as const).map((k) => (
              <div key={k}>
                <span className="label">{k === "primaryColor" ? "Primary" : "Secondary"}</span>
                <div className="flex items-center gap-2">
                  <input type="color" value={c[k]} onChange={(e) => set(k, e.target.value.toUpperCase())} className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-white p-1" aria-label={`${k} colour`} />
                  <input className="input w-28 py-2 font-mono text-xs" value={c[k]} onChange={(e) => /^#[0-9a-fA-F]{6}$/.test(e.target.value) && set(k, e.target.value.toUpperCase())} />
                </div>
                {k === "primaryColor" && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {SWATCHES.map((s) => (
                      <button key={s} type="button" onClick={() => set("primaryColor", s)} className={`size-6 rounded-full border-2 ${c.primaryColor === s ? "border-ink" : "border-transparent"}`} style={{ background: s }} aria-label={`Use ${s}`} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Seg label="Mode" value={c.mode} onChange={(v) => set("mode", v)} options={[{ v: "light", l: "Light" }, { v: "dark", l: "Dark" }]} />
            <Seg label="Background" value={c.background} onChange={(v) => set("background", v)} options={[{ v: "plain", l: "Plain" }, { v: "grid", l: "Grid" }, { v: "dots", l: "Dots" }, { v: "glow", l: "Glow" }]} />
          </Panel>

          <Panel title="Typography">
            {(["headingFont", "font"] as const).map((k) => (
              <label key={k} className="block">
                <span className="label">{k === "font" ? "Body font" : "Heading font"}</span>
                <select className="input" value={c[k]} onChange={(e) => set(k, e.target.value as Customization["font"])}>
                  {fonts.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </label>
            ))}
          </Panel>

          <Panel title="Style & motion">
            <Seg label="Project cards" value={c.cardStyle} onChange={(v) => set("cardStyle", v)} options={[{ v: "flat", l: "Flat" }, { v: "bordered", l: "Bordered" }, { v: "elevated", l: "Elevated" }]} />
            <Seg label="Animation" value={c.animation} onChange={(v) => set("animation", v)} options={[{ v: "none", l: "None" }, { v: "subtle", l: "Subtle" }, { v: "lively", l: "Lively" }]} />
            <label className="flex items-center justify-between text-sm">
              Show profile photo
              <input type="checkbox" className="size-4 accent-[var(--color-signal)]" checked={c.showAvatar ?? true} onChange={(e) => set("showAvatar", e.target.checked)} />
            </label>
            <label className="flex items-center justify-between text-sm">
              Show social links
              <input type="checkbox" className="size-4 accent-[var(--color-signal)]" checked={c.showSocials ?? true} onChange={(e) => set("showSocials", e.target.checked)} />
            </label>
            <label className="block">
              <span className="label">Custom intro (replaces your headline on this site)</span>
              <textarea className="textarea min-h-16" maxLength={400} value={overrides.introText ?? ""} onChange={(e) => set("introText", e.target.value)} />
            </label>
            <button type="button" className="text-xs text-muted underline underline-offset-4 hover:text-ink" onClick={() => setOverrides((o) => ({ introText: o.introText, showAvatar: o.showAvatar, showSocials: o.showSocials }))}>
              Reset styling to template defaults
            </button>
          </Panel>

          <Panel title="Sections">
            <p className="text-xs text-muted">Order and visibility. Empty sections never show, even when switched on.</p>
            <ul className="space-y-1">
              {order.map((k, i) => {
                const has = available.includes(k) || (hidden.includes(k) && available.length === 0);
                const off = hidden.includes(k);
                return (
                  <li key={k} className={`flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-sm ${off ? "opacity-50" : ""}`}>
                    <span className="flex-1 truncate">{sectionTitles[k]}{!has && !off && <span className="ml-1.5 text-xs text-muted">(empty)</span>}</span>
                    <button type="button" className="px-1 text-muted hover:text-ink" onClick={() => move(i, -1)} aria-label={`Move ${sectionTitles[k]} up`}>↑</button>
                    <button type="button" className="px-1 text-muted hover:text-ink" onClick={() => move(i, 1)} aria-label={`Move ${sectionTitles[k]} down`}>↓</button>
                    <button type="button" className="w-12 text-right text-xs text-ink-2 hover:text-ink" onClick={() => setHidden((h) => (off ? h.filter((x) => x !== k) : [...h, k]))}>{off ? "Show" : "Hide"}</button>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel title="Address">
            <label className="block">
              <span className="label">Portfolio name</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
            </label>
            <label className="block">
              <span className="label">Web address</span>
              <input className="input font-mono" value={slug} disabled={!!portfolio.liveDeploymentId} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} maxLength={30} />
              <span className="mt-1.5 block text-xs text-muted">{portfolio.liveDeploymentId ? "Unpublish to change the address." : siteHint.replace(portfolio.slug, slug)}</span>
            </label>
            <label className="block">
              <span className="label">Custom domain {canCustomDomain ? "" : "(Pro)"}</span>
              <input className="input font-mono" placeholder="www.yourname.com" value={customDomain} disabled={!canCustomDomain} onChange={(e) => setCustomDomain(e.target.value.trim().toLowerCase())} />
              {canCustomDomain && customDomain && <span className="mt-1.5 block text-xs text-muted">Point a CNAME record for this domain at your sites domain, then republish.</span>}
            </label>
          </Panel>

          <Panel title="Versions">
            {deployments.length === 0 ? (
              <p className="text-sm text-muted">Nothing published yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {deployments.map((d) => (
                  <li key={d.id} className="rounded-lg border border-line bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={d.status} />
                      <span className="text-xs text-muted">{new Date(d.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                    </div>
                    {d.errorMessage && <p className="mt-1 text-xs text-bad">{d.errorMessage}</p>}
                    <div className="mt-1 flex items-center justify-between text-xs text-muted">
                      <span>{d.durationMs ? `${(d.durationMs / 1000).toFixed(1)}s` : ""}</span>
                      {d.canRestore && (
                        <button
                          className="font-medium text-ink underline underline-offset-4"
                          onClick={async () => {
                            const r = await rollbackAction(portfolio.id, d.id);
                            setMsg(r.ok ? { tone: "ok", text: "Restored that version." } : { tone: "bad", text: r.error });
                            router.refresh();
                          }}
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Danger zone">
            {live && (
              <button
                className="btn-ghost btn-sm w-full"
                onClick={async () => {
                  if (!confirm("Take your site offline? You can republish any time.")) return;
                  const r = await unpublishAction(portfolio.id);
                  setMsg(r.ok ? { tone: "ok", text: "Site taken offline." } : { tone: "bad", text: r.error });
                  router.refresh();
                }}
              >
                Unpublish
              </button>
            )}
            <button
              className="btn btn-sm w-full border border-bad/40 text-bad hover:bg-bad/5"
              onClick={async () => {
                if (!confirm("Delete this portfolio permanently? Your details stay saved.")) return;
                const r = await deletePortfolioAction(portfolio.id);
                if (r.ok) router.push("/dashboard");
                else setMsg({ tone: "bad", text: r.error });
              }}
            >
              Delete portfolio
            </button>
          </Panel>
        </aside>

        {/* preview */}
        <section className="flex flex-col bg-paper-2/60 p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Preview <span className="font-normal text-muted">· {template.name}</span></p>
            <Seg label="" value={device} onChange={setDevice} options={[{ v: "desktop", l: "Desktop" }, { v: "mobile", l: "Mobile" }]} />
          </div>
          <div className="flex flex-1 justify-center">
            <div className={`overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_80px_-40px_rgba(0,0,0,.4)] transition-all ${device === "mobile" ? "w-[390px]" : "w-full"}`} style={{ height: "calc(100vh - 210px)" }}>
              {previewError ? (
                <div className="grid size-full place-items-center p-10 text-center text-sm text-muted">
                  <div>
                    <p>{previewError}</p>
                    <Link href="/dashboard/profile" className="btn-ink btn-sm mt-4">Open my details</Link>
                  </div>
                </div>
              ) : (
                <iframe title="Site preview" srcDoc={html} sandbox="allow-scripts" className="size-full border-0" />
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
