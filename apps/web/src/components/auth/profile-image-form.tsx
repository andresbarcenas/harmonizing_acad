"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDictionary, type AppLocale } from "@/lib/i18n";
import { uploadProfileImageFile } from "@/lib/profile-upload";

export function ProfileImageForm({
  initialImage,
  userName,
  locale = "en",
}: {
  initialImage?: string | null;
  userName: string;
  locale?: AppLocale;
}) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [imageUrl, setImageUrl] = useState(initialImage ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function uploadImage(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File) || !file.size) {
      setError(dictionary.forms.selectImage);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    let imageUrl = "";
    try {
      const uploaded = await uploadProfileImageFile(file);
      imageUrl = uploaded.imageUrl;
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : dictionary.forms.imageUploadError);
      setUploading(false);
      return;
    }

    setImageUrl(imageUrl);
    setSuccess(dictionary.forms.imageApplied);
    setUploading(false);
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Avatar
          src={imageUrl.trim() || undefined}
          alt={userName}
          fallback={userName.slice(0, 1).toUpperCase()}
          className="h-16 w-16 text-base"
        />
        <p className="text-sm text-[var(--color-ink-soft)]">{dictionary.forms.imageAutoApply}</p>
      </div>

      <form action={uploadImage} className="mt-4 rounded-xl border border-[var(--color-border)] bg-white/60 p-3">
        <label htmlFor="profile-image-file" className="text-xs font-semibold tracking-[0.08em] text-[var(--color-ink-soft)] uppercase">
          {dictionary.forms.uploadImageRecommended}
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input id="profile-image-file" name="file" type="file" accept="image/*" className="h-auto py-2" />
          <Button type="submit" variant="outline" size="sm" disabled={uploading}>
            {uploading ? dictionary.forms.uploading : dictionary.forms.upload}
          </Button>
        </div>
        <p className="mt-2 text-xs text-[var(--color-ink-soft)]">{dictionary.forms.imageTypes}</p>
      </form>

      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-emerald-700">{success}</p> : null}
    </div>
  );
}
