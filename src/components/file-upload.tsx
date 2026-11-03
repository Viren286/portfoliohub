"use client";
import { useRef, useState } from "react";
import { Spinner } from "./form-bits";

export type UploadedInfo = { id: string; url: string; mimeType: string; fileName?: string | null };
type Kind = "AVATAR" | "PROJECT_IMAGE" | "CERTIFICATE" | "RESUME" | "PROJECT_DOC";

const ACCEPT: Record<Kind, string> = {
  AVATAR: "image/jpeg,image/png,image/webp,image/avif",
  PROJECT_IMAGE: "image/jpeg,image/png,image/webp,image/avif,image/gif",
  CERTIFICATE: "image/jpeg,image/png,image/webp,application/pdf",
  RESUME: "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  PROJECT_DOC: "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function uploadFile(file: File, kind: Kind): Promise<UploadedInfo> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);
  const res = await fetch("/api/uploads", { method: "POST", body: fd });
  const json = await res.json().catch(() => ({ error: "Upload failed" }));
  if (!res.ok) throw new Error(json.error ?? "Upload failed");
  return json;
}

/** Single-file upload slot. Shows a thumbnail for images and a file chip for documents. */
export function FileUpload({
  kind,
  value,
  onChange,
  label,
  hint,
  shape = "square",
}: {
  kind: Kind;
  value: UploadedInfo | null;
  onChange: (v: UploadedInfo | null) => void;
  label: string;
  hint?: string;
  shape?: "square" | "round" | "wide";
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isImage = value?.mimeType.startsWith("image/");
  const box = shape === "round" ? "size-20 rounded-full" : shape === "wide" ? "h-20 w-32 rounded-xl" : "size-20 rounded-xl";

  async function pick(f?: File) {
    if (!f) return;
    setBusy(true);
    setError("");
    try {
      onChange(await uploadFile(f, kind));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <span className="label">{label}</span>
      <div
        className="flex items-center gap-4"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          pick(e.dataTransfer.files?.[0]);
        }}
      >
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={`${box} grid shrink-0 place-items-center overflow-hidden border border-dashed border-line bg-white text-muted transition hover:border-ink`}
          aria-label={`Upload ${label}`}
        >
          {busy ? (
            <Spinner />
          ) : value && isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.url} alt="" className="size-full object-cover" />
          ) : value ? (
            <span className="px-2 text-center font-mono text-[10px] leading-tight text-ink">{value.mimeType.includes("pdf") ? "PDF" : "DOCX"}</span>
          ) : (
            <span className="text-2xl leading-none">+</span>
          )}
        </button>
        <div className="min-w-0 text-sm">
          {value ? (
            <div className="flex flex-wrap items-center gap-3">
              {!isImage && <a href={value.url} target="_blank" rel="noopener" className="truncate text-ink underline underline-offset-4">{value.fileName ?? "View file"}</a>}
              <button type="button" className="text-muted hover:text-ink" onClick={() => input.current?.click()}>Replace</button>
              <button type="button" className="text-muted hover:text-bad" onClick={() => onChange(null)}>Remove</button>
            </div>
          ) : (
            <p className="text-muted">{hint ?? "Click or drop a file"}</p>
          )}
          {error && <p className="mt-1 text-xs text-bad">{error}</p>}
        </div>
        <input ref={input} type="file" accept={ACCEPT[kind]} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
    </div>
  );
}
