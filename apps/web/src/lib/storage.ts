import "server-only";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getPublicMediaBaseUrl } from "@/lib/media-url";
import { mediaBucket, minioClient } from "@/lib/minio";

export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;
export const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
export const MAX_REPERTOIRE_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024;
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

export function isAllowedVideoType(mimeType: string) {
  return ALLOWED_VIDEO_MIME_TYPES.includes(mimeType as (typeof ALLOWED_VIDEO_MIME_TYPES)[number]);
}

export function isAllowedRepertoireAttachmentType(mimeType: string) {
  return ALLOWED_REPERTOIRE_ATTACHMENT_MIME_TYPES.includes(mimeType as (typeof ALLOWED_REPERTOIRE_ATTACHMENT_MIME_TYPES)[number]);
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
    const blob = await put(`practice-videos/${key}`, file, {
      access: "public",
    });

    return { storageKey: blob.url };
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
    const blob = await put(key, file, {
      access: "public",
    });

    return { storageKey: blob.url };
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
