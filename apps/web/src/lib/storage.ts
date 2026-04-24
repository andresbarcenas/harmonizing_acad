import "server-only";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getPublicMediaBaseUrl } from "@/lib/media-url";
import { mediaBucket, minioClient } from "@/lib/minio";

export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;
export const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;

type StorageProvider = "s3" | "local";

function getStorageProvider(): StorageProvider {
  return process.env.STORAGE_PROVIDER === "local" ? "local" : "s3";
}

function sanitizeFilename(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function isAllowedVideoType(mimeType: string) {
  return ALLOWED_VIDEO_MIME_TYPES.includes(mimeType as (typeof ALLOWED_VIDEO_MIME_TYPES)[number]);
}

export function getVideoPublicUrl(storageKey: string) {
  if (getStorageProvider() === "local") {
    return `/uploads/videos/${storageKey}`;
  }

  const base = getPublicMediaBaseUrl() ?? `http://localhost:9010/${mediaBucket}`;
  return `${base}/${storageKey}`;
}

export async function storePracticeVideo(file: File, studentProfileId: string) {
  const safeName = sanitizeFilename(file.name);
  const key = `${studentProfileId}/${Date.now()}-${randomUUID()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (getStorageProvider() === "local") {
    const localRoot = process.env.LOCAL_STORAGE_DIR?.trim() || path.join(process.cwd(), "public", "uploads", "videos");
    const targetPath = path.join(localRoot, key);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, buffer);
    return { storageKey: key };
  }

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
