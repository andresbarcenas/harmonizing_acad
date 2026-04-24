export function getPublicMediaBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.trim() || process.env.MEDIA_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV !== "production") {
    const bucket = process.env.S3_BUCKET ?? "harmonizing-media";
    return `http://localhost:9010/${bucket}`;
  }

  return null;
}
