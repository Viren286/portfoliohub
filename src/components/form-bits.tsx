export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-xs text-bad">{children}</p>;
}

export function Alert({ tone = "bad", children }: { tone?: "bad" | "ok" | "info"; children?: React.ReactNode }) {
  if (!children) return null;
  const cls = tone === "bad" ? "border-bad/30 bg-bad/5 text-bad" : tone === "ok" ? "border-ok/30 bg-ok/5 text-ok" : "border-line bg-card text-ink-2";
  return <div role={tone === "bad" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</div>;
}

export function Spinner() {
  return <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />;
}
