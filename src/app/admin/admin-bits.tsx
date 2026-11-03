"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** Button that runs a server action, then refreshes. Shows the result inline. */
export function ActionButton({
  action,
  children,
  confirmText,
  className = "btn-ghost btn-sm",
  prompt,
}: {
  action: (input?: string) => Promise<{ ok: boolean; error?: string; message?: string }>;
  children: React.ReactNode;
  confirmText?: string;
  className?: string;
  prompt?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <span className="inline-flex items-center gap-2">
      <button
        className={className}
        disabled={pending}
        onClick={() => {
          let input: string | undefined;
          if (prompt) {
            const v = window.prompt(prompt);
            if (v === null) return;
            input = v;
          } else if (confirmText && !confirm(confirmText)) return;
          start(async () => {
            const r = await action(input);
            setMsg(r.ok ? r.message ?? "" : r.error ?? "Failed");
            router.refresh();
          });
        }}
      >
        {pending ? "…" : children}
      </button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </span>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}
