"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateTemplateAction } from "../actions";

type T = { id: string; slug: string; name: string; description: string; tier: "FREE" | "PRO"; isEnabled: boolean; version: string; uses: number };

export function TemplateRow({ t }: { t: T }) {
  const router = useRouter();
  const [v, setV] = useState(t);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="card grid gap-4 p-5 md:grid-cols-[1fr_1.4fr_auto] md:items-center">
      <div>
        <input className="input font-medium" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} aria-label="Name" />
        <p className="mt-1.5 font-mono text-xs text-muted">{t.slug} · v{t.version} · {t.uses} portfolios</p>
      </div>
      <textarea className="textarea min-h-16 text-xs" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} aria-label="Description" />
      <div className="flex flex-wrap items-center gap-3">
        <select className="input w-24" value={v.tier} onChange={(e) => setV({ ...v, tier: e.target.value as T["tier"] })} aria-label="Tier">
          <option value="FREE">Free</option>
          <option value="PRO">Pro</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4" checked={v.isEnabled} onChange={(e) => setV({ ...v, isEnabled: e.target.checked })} /> Enabled
        </label>
        <button
          className="btn-ink btn-sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await updateTemplateAction(v);
              setMsg(r.ok ? "Saved" : r.error);
              router.refresh();
            })
          }
        >
          Save
        </button>
        {msg && <span className="text-xs text-muted">{msg}</span>}
      </div>
    </div>
  );
}
