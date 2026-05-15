import "server-only";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { del, get, put } from "@vercel/blob";
import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";

import { getPublicMediaBaseUrl } from "@/lib/media-url";
import { mediaBucket, minioClient } from "@/lib/minio";

export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;
export const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
export const MAX_REPERTOIRE_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_REPERTOIRE_ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

type StorageProvider = "s3" | "local" | "vercel-blob";

function getStorageProvider(): StorageProvider {
  if (process.env.STORAGE_PROVIDER === "local") return "local";
  if (process.env.STORAGE_PROVIDER === "vercel-blob") return "vercel-blob";
  return "s3";
}

function sanitizeFilename(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function requireBlobToken(context: "protected media" | "profile image") {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    throw new Error(
      `Vercel Blob ${context} storage is not configured. Connect the intended Blob store to this Vercel project and ensure BLOB_READ_WRITE_TOKEN is set for the deployment environment.`,
    );
  }
  return token;
}

export function isPrivateMediaStorageKey(storageKey: string) {
  return storageKey.startsWith("private-media/");
}

export function isPrivateProfileImageStorageKey(storageKey: string) {
  return storageKey.startsWith("profile-images/profiles/");
}

export function isAllowedVideoType(mimeType: string) {
  return ALLOWED_VIDEO_MIME_TYPES.includes(mimeType as (typeof ALLOWED_VIDEO_MIME_TYPES)[number]);
}

export function isAllowedRepertoireAttachmentType(mimeType: string) {
  return ALLOWED_REPERTOIRE_ATTACHMENT_MIME_TYPES.includes(mimeType as (typeof ALLOWED_REPERTOIRE_ATTACHMENT_MIME_TYPES)[number]);
}

export function isAllowedProfileImageType(mimeType: string) {
  return mimeType.startsWith("image/");
}

export function getVideoPublicUrl(storageKey: string) {
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
    return storageKey;
  }

  if (getStorageProvider() === "local") {
    return `/uploads/videos/${storageKey}`;
  }

  const base = getPublicMediaBaseUrl() ?? `http://localhost:9010/${mediaBucket}`;
  return `${base}/${storageKey}`;
}

export function getRepertoireAttachmentPublicUrl(storageKey: string) {
  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
    return storageKey;
  }

  if (getStorageProvider() === "local") {
    return `/uploads/repertoire/${storageKey}`;
  }

  const base = getPublicMediaBaseUrl() ?? `http://localhost:9010/${mediaBucket}`;
  return `${base}/${storageKey}`;
}

export async function storePracticeVideo(file: File, studentProfileId: string) {
  const safeName = sanitizeFilename(file.name);
  const key = `${studentProfileId}/${Date.now()}-${randomUUID()}-${safeName}`;

  if (getStorageProvider() === "local") {
    const buffer = Buffer.from(await file.arrayBuffer());
    const localRoot = process.env.LOCAL_STORAGE_DIR?.trim() || path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads", "videos");
    const targetPath = path.join(localRoot, key);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, buffer);
    return { storageKey: key };
  }

  if (getStorageProvider() === "vercel-blob") {
    const blob = await put(`private-media/practice-videos/${key}`, file, {
      access: "private",
      contentType: file.type || "video/mp4",
      token: requireBlobToken("protected media"),
    });

    return { storageKey: blob.pathname };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  await minioClient.send(
    new PutObjectCommand({
      Bucket: mediaBucket,
      Key: key,
      Body: buffer,
      ContentType: file.type || "video/mp4",
    }),
  );

  return { storageKey: key };
}

export async function storeRepertoireAttachment(file: File, repertoireItemId: string) {
  const safeName = sanitizeFilename(file.name);
  const key = `repertoire/${repertoireItemId}/${Date.now()}-${randomUUID()}-${safeName}`;

  if (getStorageProvider() === "local") {
    const buffer = Buffer.from(await file.arrayBuffer());
    const localRoot = process.env.LOCAL_REPERTOIRE_STORAGE_DIR?.trim() || path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads", "repertoire");
    const localKey = key.replace(/^repertoire\//, "");
    const targetPath = path.join(localRoot, localKey);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, buffer);
    return { storageKey: localKey };
  }

  if (getStorageProvider() === "vercel-blob") {
    const blob = await put(`private-media/repertoire-attachments/${repertoireItemId}/${Date.now()}-${randomUUID()}-${safeName}`, file, {
      access: "private",
      contentType: file.type || "application/pdf",
      token: requireBlobToken("protected media"),
    });

    return { storageKey: blob.pathname };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  await minioClient.send(
    new PutObjectCommand({
      Bucket: mediaBucket,
      Key: key,
      Body: buffer,
      ContentType: file.type || "application/pdf",
    }),
  );

  return { storageKey: key };
}

export async function storePrivatePracticeVideoBuffer(input: {
  buffer: Buffer;
  contentType: string;
  originalName: string;
  studentProfileId: string;
}) {
  const safeName = sanitizeFilename(input.originalName);
  const key = `${input.studentProfileId}/${Date.now()}-${randomUUID()}-${safeName}`;

  if (getStorageProvider() === "vercel-blob") {
    const blob = await put(`private-media/practice-videos/${key}`, input.buffer, {
      access: "private",
      contentType: input.contentType || "video/mp4",
      token: requireBlobToken("protected media"),
    });
    return { storageKey: blob.pathname };
  }

  if (getStorageProvider() === "local") {
    const localRoot = process.env.LOCAL_STORAGE_DIR?.trim() || path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads", "videos");
    const targetPath = path.join(localRoot, key);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, input.buffer);
    return { storageKey: key };
  }

  await minioClient.send(new PutObjectCommand({ Bucket: mediaBucket, Key: key, Body: input.buffer, ContentType: input.contentType || "video/mp4" }));
  return { storageKey: key };
}

export async function storePrivateRepertoireAttachmentBuffer(input: {
  buffer: Buffer;
  contentType: string;
  originalName: string;
  repertoireItemId: string;
}) {
  const safeName = sanitizeFilename(input.originalName);
  const key = `repertoire/${input.repertoireItemId}/${Date.now()}-${randomUUID()}-${safeName}`;

  if (getStorageProvider() === "vercel-blob") {
    const blob = await put(`private-media/repertoire-attachments/${input.repertoireItemId}/${Date.now()}-${randomUUID()}-${safeName}`, input.buffer, {
      access: "private",
      contentType: input.contentType || "application/pdf",
      token: requireBlobToken("protected media"),
    });
    return { storageKey: blob.pathname };
  }

  if (getStorageProvider() === "local") {
    const localRoot = process.env.LOCAL_REPERTOIRE_STORAGE_DIR?.trim() || path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads", "repertoire");
    const localKey = key.replace(/^repertoire\//, "");
    const targetPath = path.join(localRoot, localKey);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, input.buffer);
    return { storageKey: localKey };
  }

  await minioClient.send(new PutObjectCommand({ Bucket: mediaBucket, Key: key, Body: input.buffer, ContentType: input.contentType || "application/pdf" }));
  return { storageKey: key };
}

export async function readProtectedMedia(input: {
  storageKey: string;
  mediaType: "video" | "repertoire";
  range?: string | null;
  fallbackContentType?: string;
}) {
  const storageKey = input.storageKey;
  const provider = getStorageProvider();

  if (provider === "vercel-blob" && isPrivateMediaStorageKey(storageKey)) {
    const result = await get(storageKey, {
      access: "private",
      token: requireBlobToken("protected media"),
      headers: input.range ? { Range: input.range } : undefined,
    });
    if (!result || !result.stream) return null;
    const contentRange = result.headers.get("content-range");
    const contentLength = result.headers.get("content-length") ?? String(result.blob.size ?? "");
    return {
      stream: result.stream,
      contentType: result.blob.contentType || input.fallbackContentType || "application/octet-stream",
      contentLength,
      contentRange,
      status: contentRange ? 206 : 200,
    };
  }

  if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
    const response = await fetch(storageKey, { headers: input.range ? { Range: input.range } : undefined });
    if (!response.ok && response.status !== 206) return null;
    return {
      stream: response.body,
      contentType: response.headers.get("content-type") || input.fallbackContentType || "application/octet-stream",
      contentLength: response.headers.get("content-length"),
      contentRange: response.headers.get("content-range"),
      status: response.status === 206 ? 206 : 200,
    };
  }

  if (provider === "local") {
    const localRoot = input.mediaType === "video"
      ? process.env.LOCAL_STORAGE_DIR?.trim() || path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads", "videos")
      : process.env.LOCAL_REPERTOIRE_STORAGE_DIR?.trim() || path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads", "repertoire");
    const targetPath = path.join(localRoot, storageKey);
    const fileStat = await stat(targetPath).catch(() => null);
    if (!fileStat) return null;
    const range = parseRange(input.range, fileStat.size);
    const nodeStream = range
      ? createReadStream(targetPath, { start: range.start, end: range.end })
      : createReadStream(targetPath);
    return {
      stream: Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>,
      contentType: input.fallbackContentType || "application/octet-stream",
      contentLength: String(range ? range.end - range.start + 1 : fileStat.size),
      contentRange: range ? `bytes ${range.start}-${range.end}/${fileStat.size}` : null,
      status: range ? 206 : 200,
    };
  }

  const object = await minioClient.send(new GetObjectCommand({
    Bucket: mediaBucket,
    Key: storageKey,
    Range: input.range ?? undefined,
  })).catch(() => null);
  if (!object?.Body) return null;
  const stream = "transformToWebStream" in object.Body
    ? object.Body.transformToWebStream()
    : Readable.toWeb(object.Body as Readable) as ReadableStream<Uint8Array>;
  return {
    stream,
    contentType: object.ContentType || input.fallbackContentType || "application/octet-stream",
    contentLength: object.ContentLength ? String(object.ContentLength) : null,
    contentRange: object.ContentRange ?? null,
    status: object.ContentRange ? 206 : 200,
  };
}

export async function protectedMediaToBuffer(input: {
  storageKey: string;
  mediaType: "video" | "repertoire";
  fallbackContentType?: string;
}) {
  const media = await readProtectedMedia(input);
  if (!media?.stream) return null;
  const chunks: Uint8Array[] = [];
  const reader = media.stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return {
    buffer: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))),
    contentType: media.contentType,
  };
}

export async function readPrivateProfileImage(input: {
  storageKey: string;
  fallbackContentType?: string;
}) {
  const provider = getStorageProvider();

  if (provider === "vercel-blob" && isPrivateProfileImageStorageKey(input.storageKey)) {
    const result = await get(input.storageKey, {
      access: "private",
      token: requireBlobToken("profile image"),
    });
    if (!result?.stream) return null;
    const contentLength = result.headers.get("content-length") ?? String(result.blob.size ?? "");
    return {
      stream: result.stream,
      contentType: result.blob.contentType || input.fallbackContentType || "image/jpeg",
      contentLength,
      status: 200,
    };
  }

  if (provider === "local") {
    const localRoot = process.env.LOCAL_PROFILE_STORAGE_DIR?.trim() || path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads", "profiles");
    const targetPath = path.join(localRoot, input.storageKey);
    const fileStat = await stat(targetPath).catch(() => null);
    if (!fileStat) return null;
    const nodeStream = createReadStream(targetPath);
    return {
      stream: Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>,
      contentType: input.fallbackContentType || "image/jpeg",
      contentLength: String(fileStat.size),
      status: 200,
    };
  }

  return null;
}

export async function deleteProtectedMedia(storageKey: string, mediaType: "video" | "repertoire") {
  if (!storageKey || storageKey.startsWith("http://") || storageKey.startsWith("https://")) return;
  const provider = getStorageProvider();
  if (provider === "vercel-blob" && isPrivateMediaStorageKey(storageKey)) {
    await del(storageKey, { token: requireBlobToken("protected media") }).catch(() => undefined);
    return;
  }
  if (provider === "local") {
    const localRoot = mediaType === "video"
      ? process.env.LOCAL_STORAGE_DIR?.trim() || path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads", "videos")
      : process.env.LOCAL_REPERTOIRE_STORAGE_DIR?.trim() || path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads", "repertoire");
    await unlink(path.join(localRoot, storageKey)).catch(() => undefined);
    return;
  }
  await minioClient.send(new DeleteObjectCommand({ Bucket: mediaBucket, Key: storageKey })).catch(() => undefined);
}

function parseRange(rangeHeader: string | null | undefined, size: number) {
  if (!rangeHeader) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) return null;
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

export async function storeProfileImage(file: File, userId: string) {
  const safeName = sanitizeFilename(file.name);
  const key = `profiles/${userId}/${Date.now()}-${randomUUID()}-${safeName}`;

  if (getStorageProvider() === "local") {
    const buffer = Buffer.from(await file.arrayBuffer());
    const localRoot = process.env.LOCAL_PROFILE_STORAGE_DIR?.trim() || path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads", "profiles");
    const localKey = key.replace(/^profiles\//, "");
    const targetPath = path.join(localRoot, localKey);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, buffer);
    return { imageUrl: `/uploads/profiles/${localKey}` };
  }

  if (getStorageProvider() === "vercel-blob") {
    const blob = await put(`profile-images/${key}`, file, {
      access: "private",
      contentType: file.type || "image/jpeg",
      token: requireBlobToken("profile image"),
    });

    return { imageUrl: `/api/media/profile-images/${encodeURIComponent(userId)}?key=${encodeURIComponent(blob.pathname)}` };
  }

  const mediaBase = getPublicMediaBaseUrl();
  if (!mediaBase) {
    throw new Error("S3 media base URL is not configured. Set MEDIA_BASE_URL or NEXT_PUBLIC_MEDIA_BASE_URL, or use STORAGE_PROVIDER=vercel-blob in production.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  await minioClient.send(
    new PutObjectCommand({
      Bucket: mediaBucket,
      Key: key,
      Body: buffer,
      ContentType: file.type || "image/jpeg",
    }),
  );

  return { imageUrl: `${mediaBase}/${key}` };
}
