/**
 * A tiny, safe HTML builder for generated sites.
 *
 * Every interpolated value is HTML-escaped unless it is already `SafeHtml`
 * (produced by `html` itself or explicitly by `raw`). Templates therefore cannot
 * accidentally inject user-provided markup: XSS is prevented by construction.
 */
export class SafeHtml {
  constructor(public readonly value: string) {}
  toString() {
    return this.value;
  }
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function esc(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined || v === false || v === true) return "";
  if (v instanceof SafeHtml) return v.value;
  if (Array.isArray(v)) return v.map(renderValue).join("");
  return esc(v);
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  let out = "";
  for (let i = 0; i < strings.length; i++) {
    out += strings[i];
    if (i < values.length) out += renderValue(values[i]);
  }
  return new SafeHtml(out);
}

/** Marks trusted, already-safe markup (only used for engine-authored strings such as icons and CSS). */
export const raw = (s: string) => new SafeHtml(s);

/** Renders `fn()` only when `cond` is truthy. */
export function when<T>(cond: T, fn: (v: NonNullable<T>) => SafeHtml): SafeHtml | "" {
  return cond ? fn(cond as NonNullable<T>) : "";
}

/** Plain text with blank-line paragraphs and single-line breaks, escaped. */
export function paragraphs(text: string | undefined, cls = ""): SafeHtml | "" {
  if (!text) return "";
  const parts = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return html`${parts.map(
    (p) => html`<p${cls ? raw(` class="${esc(cls)}"`) : ""}>${p.split("\n").map((line, i) => (i ? html`<br>${line}` : html`${line}`))}</p>`,
  )}`;
}

/** External link attributes: new tab, no opener, no referrer leak. */
export const ext = raw(' target="_blank" rel="noopener noreferrer"');
