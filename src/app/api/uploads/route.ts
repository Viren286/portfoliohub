import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type { FileKind } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { getEntitlements } from "@/lib/entitlements";
import { rateLimit } from "@/lib/rate-limit";
import { fileUrl, imageRef, processUpload, UploadError } from "@/lib/uploads";

const KINDS: FileKind[] = ["AVATAR", "PROJECT_IMAGE", "CERTIFICATE", "RESUME", "PROJECT_DOC", "OTHER"];

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Sign in to upload files" }, { status: 401 });
  if (session.user.banned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  const rl = await rateLimit(`upload:${session.user.id}`, 30, 60);
  if (!rl.ok) return NextResponse.json({ error: `Too many uploads. Try again in ${rl.retryAfter}s` }, { status: 429 });

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > (env.maxUploadMb + 1) * 1024 * 1024) return NextResponse.json({ error: `File is too large (max ${env.maxUploadMb} MB)` }, { status: 413 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart form upload" }, { status: 400 });
  }
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "") as FileKind;
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received" }, { status: 400 });
  if (!KINDS.includes(kind)) return NextResponse.json({ error: "Unknown upload kind" }, { status: 400 });

  try {
    const { e } = await getEntitlements(session.user);
    const saved = await processUpload({
      userId: session.user.id,
      kind,
      fileName: file.name,
      bytes: Buffer.from(await file.arrayBuffer()),
      quotaBytes: e.maxUploadMb * 1024 * 1024,
    });
    const image = imageRef(saved);
    return NextResponse.json({
      id: saved.id,
      kind: saved.kind,
      mimeType: saved.mimeType,
      fileName: saved.fileName,
      url: image?.src ?? fileUrl(saved),
      width: saved.width,
      height: saved.height,
    });
  } catch (err) {
    if (err instanceof UploadError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[upload] failed", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
