import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { db } from "./db";
import { env } from "./env";

export interface PutOptions {
  contentType: string;
  cacheControl?: string;
  contentDisposition?: string;
}

/** Public asset storage for processed uploads (resized images, validated documents). */
export interface Storage {
  put(key: string, body: Buffer, opts: PutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}

class LocalStorage implements Storage {
  constructor(private root: string, private baseUrl: string) {}
  private file(key: string) {
    const p = path.join(this.root, key);
    if (!p.startsWith(this.root + path.sep)) throw new Error("Invalid storage key");
    return p;
  }
  async put(key: string, body: Buffer, opts: PutOptions) {
    const p = this.file(key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, body);
    await fs.writeFile(`${p}.meta.json`, JSON.stringify(opts));
  }
  async delete(key: string) {
    await fs.rm(this.file(key), { force: true });
    await fs.rm(`${this.file(key)}.meta.json`, { force: true });
  }
  publicUrl(key: string) {
    return `${this.baseUrl}/files/${key}`;
  }
  async read(key: string): Promise<{ body: Buffer; meta: PutOptions } | null> {
    try {
      const p = this.file(key);
      return { body: await fs.readFile(p), meta: JSON.parse(await fs.readFile(`${p}.meta.json`, "utf8")) };
    } catch {
      return null;
    }
  }
}

/** Stores uploads in Postgres (StoredObject). For serverless hosting without a disk or bucket. */
class DatabaseStorage implements Storage {
  async put(key: string, body: Buffer, opts: PutOptions) {
    const data = { contentType: opts.contentType, cacheControl: opts.cacheControl, contentDisposition: opts.contentDisposition, body: new Uint8Array(body) };
    await db.storedObject.upsert({ where: { key }, update: data, create: { key, ...data } });
  }
  async delete(key: string) {
    await db.storedObject.deleteMany({ where: { key } });
  }
  publicUrl(key: string) {
    return `${env.appUrl}/files/${key}`;
  }
  async read(key: string): Promise<{ body: Buffer; meta: PutOptions } | null> {
    const o = await db.storedObject.findUnique({ where: { key } });
    if (!o) return null;
    return {
      body: Buffer.from(o.body),
      meta: { contentType: o.contentType, cacheControl: o.cacheControl ?? undefined, contentDisposition: o.contentDisposition ?? undefined },
    };
  }
}

class R2Storage implements Storage {
  private s3 = new S3Client({
    region: "auto",
    endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.r2.accessKeyId, secretAccessKey: env.r2.secretAccessKey },
  });
  async put(key: string, body: Buffer, opts: PutOptions) {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: env.r2.assetsBucket,
        Key: key,
        Body: body,
        ContentType: opts.contentType,
        CacheControl: opts.cacheControl,
        ContentDisposition: opts.contentDisposition,
      }),
    );
  }
  async delete(key: string) {
    await this.s3.send(new DeleteObjectCommand({ Bucket: env.r2.assetsBucket, Key: key }));
  }
  publicUrl(key: string) {
    if (!env.r2.assetsPublicUrl) throw new Error("ASSETS_PUBLIC_URL is not set");
    return `${env.r2.assetsPublicUrl}/${key}`;
  }
}

let instance: Storage | null = null;
export function getStorage(): Storage {
  if (!instance)
    instance =
      env.storageDriver === "r2"
        ? new R2Storage()
        : env.storageDriver === "database"
          ? new DatabaseStorage()
          : new LocalStorage(path.join(env.dataDir, "uploads"), env.appUrl);
  return instance;
}

/** The store that /files/... serves from, when the platform itself hosts uploads. */
export function getServedStorage(): { read(key: string): Promise<{ body: Buffer; meta: PutOptions } | null> } {
  return env.storageDriver === "database" ? new DatabaseStorage() : new LocalStorage(path.join(env.dataDir, "uploads"), env.appUrl);
}
