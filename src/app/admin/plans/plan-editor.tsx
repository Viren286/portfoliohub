"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updatePlanAction } from "../actions";

export function PlanEditor({ code, name, subscribers, price, json }: { code: string; name: string; subscribers: number; price: string; json: string }) {
  const router = useRouter();
  const [p, setP] = useState(price);
  const [j, setJ] = useState(json);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">{name}</h2>
        <span className="font-mono text-xs text-muted">{code} · {subscribers} subscribers</span>
      </div>
      <label className="mt-4 block"><span className="label">Price (₹ / month, empty = not for sale)</span><input className="input" value={p} onChange={(e) => setP(e.target.value)} inputMode="decimal" /></label>
      <label className="mt-4 block"><span className="label">Entitlements (JSON)</span><textarea className="textarea min-h-56 font-mono text-xs" value={j} onChange={(e) => setJ(e.target.value)} spellCheck={false} /></label>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn-ink btn-sm" disabled={pending} onClick={() => start(async () => { const r = await updatePlanAction(code, j, p); setMsg(r.ok ? "Saved" : r.error); router.refresh(); })}>Save</button>
        {msg && <span className={`text-xs ${msg === "Saved" ? "text-ok" : "text-bad"}`}>{msg}</span>}
      </div>
    </div>
  );
}
