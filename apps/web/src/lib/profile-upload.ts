export async function uploadProfileImageFile(
  file: File,
  options?: { targetUserId?: string; assign?: boolean },
): Promise<{ imageUrl: string; assignedUserId?: string | null }> {
  const payload = new FormData();
  payload.append("file", file);
  if (options?.targetUserId) {
    payload.append("targetUserId", options.targetUserId);
  }
  if (options?.assign === false) {
    payload.append("assign", "false");
  }

  const response = await fetch("/api/uploads/profile-image", {
    method: "POST",
    body: payload,
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "No se pudo subir la imagen.");
  }

  const data = (await response.json()) as { imageUrl: string; assignedUserId?: string | null };
  return data;
}
