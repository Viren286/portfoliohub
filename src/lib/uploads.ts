import "server-only";
import crypto from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import sharp, { type Metadata } from "sharp";
import type { FileKind, UploadedFile } from "@/generated/prisma/client";
import { db } from "./db";
import { env } from "./env";
import { getStorage } from "./storage";

export class UploadError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
const DOC_TYPES = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);

const RULES: Record<FileKind, { images: boolean; docs: boolean; maxBytes: number }> = {
  AVATAR: { images: true, docs: false, maxBytes: 8 * 1024 * 1024 },
  PROJECT_IMAGE: { images: true, docs: false, maxBytes: 8 * 1024 * 1024 },
  CERTIFICATE: { images: true, docs: true, maxBytes: 10 * 1024 * 1024 },
  RESUME: { images: false, docs: true, maxBytes: 10 * 1024 * 1024 },
  PROJECT_DOC: { images: false, docs: true, maxBytes: 10 * 1024 * 1024 },
  OTHER: { images: true, docs: true, maxBytes: 10 * 1024 * 1024 },
};

const WIDTHS = [400, 800, 1600];
const IMMUTABLE = "public, max-age=31536000, immutable";

/**
 * Validates and stores an upload. Never trusts the browser: the real type is
 * detected from the file's bytes, images are decoded and re-encoded (which strips
 * EXIF/GPS data and any embedded payload), and documents are served as downloads.
 */
export async function processUpload(opts: { userId: string; kind: FileKind; fileName: string; bytes: Buffer; quotaBytes: number }): Promise<UploadedFile> {
  const rule = RULES[opts.kind];
  if (!rule) throw new UploadError("Unknown upload type");
  if (opts.bytes.length === 0) throw new UploadError("The file is empty");
  const maxBytes = Math.min(rule.maxBytes, env.maxUploadMb * 1024 * 1024);
  if (opts.bytes.length > maxBytes) throw new UploadError(`File is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB)`);

  const used = await db.uploadedFile.aggregate({ where: { userId: opts.userId }, _sum: { sizeBytes: true } });
  if ((used._sum.sizeBytes ?? 0) + opts.bytes.length > opts.quotaBytes) throw new UploadError("Storage quota reached. Delete old files or upgrade your plan.", 413);

  const detected = await fileTypeFromBuffer(opts.bytes);
  const mime = detected?.mime ?? "";
  const sha = crypto.createHash("sha256").update(opts.bytes).digest("hex");
  const safeName = opts.fileName.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";
  const storage = getStorage();

  if (IMAGE_TYPES.has(mime)) {
    if (!rule.images) throw new UploadError("Please upload a PDF or DOCX file here");
    let meta: Metadata;
    try {
      meta = await sharp(opts.bytes, { limitInputPixels: 40_000_000 }).metadata();
    } catch {
      throw new UploadError("That image could not be read");
    }
    const srcWidth = meta.autoOrient?.width ?? meta.width ?? 0;
    if (!srcWidth) throw new UploadError("That image could not be read");
    const widths = WIDTHS.filter((w) => w <= srcWidth);
    if (!widths.length) widths.push(Math.max(1, srcWidth));
    const variants: Record<string, string> = {};
    let last: { key: string; width: number; height: number } | null = null;
    let totalBytes = 0;
    for (const w of widths) {
      const { data, info } = await sharp(opts.bytes, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer({ resolveWithObject: true });
      const key = `u/${opts.userId}/${sha.slice(0, 32)}/${w}.webp`;
      await storage.put(key, data, { contentType: "image/webp", cacheControl: IMMUTABLE });
      variants[String(w)] = key;
      totalBytes += data.length;
      last = { key, width: info.width, height: info.height };
    }
    return db.uploadedFile.upsert({
      where: { storageKey: last!.key },
      update: { kind: opts.kind },
      create: {
        userId: opts.userId,
        kind: opts.kind,
        storageKey: last!.key,
        mimeType: "image/webp",
        sizeBytes: totalBytes,
        sha256: sha,
        width: last!.width,
        height: last!.height,
        variants,
        fileName: safeName,
      },
    });
  }

  if (DOC_TYPES.has(mime)) {
    if (!rule.docs) throw new UploadError("Please upload an image (JPG, PNG, WebP or AVIF)");
    if (mime === "application/pdf" && !opts.bytes.subarray(0, 5).toString("latin1").startsWith("%PDF-")) throw new UploadError("That PDF looks corrupted");
    const ext = mime === "application/pdf" ? "pdf" : "docx";
    const key = `u/${opts.userId}/${sha.slice(0, 32)}.${ext}`;
    const downloadName = safeName.toLowerCase().endsWith(`.${ext}`) ? safeName : `${safeName}.${ext}`;
    await storage.put(key, opts.bytes, {
      contentType: mime,
      cacheControl: IMMUTABLE,
      contentDisposition: `attachment; filename="${downloadName.replace(/"/g, "")}"`,
    });
    return db.uploadedFile.upsert({
      where: { storageKey: key },
      update: { kind: opts.kind },
      create: { userId: opts.userId, kind: opts.kind, storageKey: key, mimeType: mime, sizeBytes: opts.bytes.length, sha256: sha, fileName: downloadName },
    });
  }

  throw new UploadError(rule.docs && !rule.images ? "Only PDF or DOCX files are accepted" : "Unsupported file type");
}

/** Image reference for the engine: 800w as src plus a srcset of every variant. */
export function imageRef(file: Pick<UploadedFile, "storageKey" | "variants" | "width" | "height" | "mimeType">, alt?: string) {
  const storage = getStorage();
  const variants = (file.variants ?? {}) as Record<string, string>;
  const entries = Object.entries(variants).sort((a, b) => Number(a[0]) - Number(b[0]));
  if (!file.mimeType.startsWith("image/")) return null;
  const main = variants["800"] ?? entries.at(-1)?.[1] ?? file.storageKey;
  return {
    src: storage.publicUrl(main),
    srcset: entries.map(([w, k]) => `${storage.publicUrl(k)} ${w}w`).join(", ") || null,
    width: file.width,
    height: file.height,
    alt: alt ?? null,
  };
}

export function fileUrl(file: Pick<UploadedFile, "storageKey">) {
  return getStorage().publicUrl(file.storageKey);
}
