export function BrowserChrome({ url, children, className = "", dark = false }: { url: string; children: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-xl border shadow-[0_30px_80px_-30px_rgba(18,18,17,.45)] ${dark ? "border-ink-2 bg-ink" : "border-line bg-card"} ${className}`}>
      <div className={`flex items-center gap-1.5 border-b px-3 py-2 ${dark ? "border-ink-2" : "border-line"}`}>
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className={`ml-3 truncate rounded-md px-2 py-0.5 font-mono text-[10px] ${dark ? "bg-ink-2 text-paper/70" : "bg-paper-2 text-muted"}`}>{url}</span>
      </div>
      {children}
    </div>
  );
}
