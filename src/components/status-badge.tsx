const STYLES: Record<string, string> = {
  LIVE: "bg-ok/10 text-ok",
  DRAFT: "bg-paper-2 text-ink-2",
  PUBLISHING: "bg-warn/10 text-warn",
  QUEUED: "bg-warn/10 text-warn",
  RENDERING: "bg-warn/10 text-warn",
  UPLOADING: "bg-warn/10 text-warn",
  FAILED: "bg-bad/10 text-bad",
  UNPUBLISHED: "bg-paper-2 text-muted",
  SUSPENDED: "bg-bad/10 text-bad",
  SUPERSEDED: "bg-paper-2 text-muted",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STYLES[status] ?? "bg-paper-2 text-ink-2"}`}>
      {status === "LIVE" && <span className="size-1.5 rounded-full bg-ok" />}
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
