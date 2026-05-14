"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { InstrumentSelect } from "@/components/instrument-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getDictionary, type AppLocale } from "@/lib/i18n";
import { uploadProfileImageFile } from "@/lib/profile-upload";

export function TeacherEditForm({
  teacherId,
  initial,
  locale = "en",
}: {
  teacherId: string;
  initial: {
    userId: string;
    name: string;
    email: string;
    specialty: string;
    bio?: string | null;
    zoomLink?: string | null;
    meetLink?: string | null;
    profileImage?: string | null;
  };
  locale?: AppLocale;
}) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [profileImage, setProfileImage] = useState(initial.profileImage ?? "");

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      specialty: String(formData.get("specialty") ?? "").trim(),
      bio: String(formData.get("bio") ?? "").trim() || undefined,
      zoomLink: String(formData.get("zoomLink") ?? "").trim() || undefined,
      meetLink: String(formData.get("meetLink") ?? "").trim() || undefined,
      profileImage: profileImage.trim() || undefined,
    };

    const response = await fetch(`/api/admin/teachers/${teacherId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as
        | { error?: string | { formErrors?: string[]; fieldErrors?: Record<string, string[]> } }
        | null;
      if (typeof data?.error === "string") {
        setError(data.error);
      } else if (data?.error && typeof data.error === "object") {
        const firstFieldError = Object.values(data.error.fieldErrors ?? {}).find((messages) => messages?.length)?.[0];
        setError(firstFieldError ?? data.error.formErrors?.[0] ?? dictionary.admin.updateError);
      } else {
        setError(dictionary.admin.updateError);
      }
      setPending(false);
      return;
    }

    setSuccess(dictionary.admin.teacherUpdated);
    setPending(false);
    setOpen(false);
    router.refresh();
  }

  async function uploadImage() {
    if (!uploadFile) {
      setError(dictionary.forms.selectImage);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadProfileImageFile(uploadFile, {
        targetUserId: initial.userId,
        assign: true,
      });
      setProfileImage(uploaded.imageUrl);
      setSuccess(dictionary.forms.imageUpdated);
      setUploadFile(null);
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : dictionary.forms.imageUploadError);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-2">
      <Button size="sm" variant="outline" onClick={() => setOpen((value) => !value)}>
        {open ? dictionary.common.closeEdit : dictionary.common.edit}
      </Button>

      {open ? (
        <form action={onSubmit} className="mt-3 space-y-3 rounded-[1rem] border border-[var(--color-border)] bg-white/82 p-3">
          <div className="flex items-center gap-2">
            <Avatar
              src={profileImage || undefined}
              alt={initial.name}
              fallback={initial.name.slice(0, 1).toUpperCase()}
              className="h-9 w-9 text-[10px]"
            />
            <p className="text-xs text-[var(--color-ink-soft)]">{dictionary.forms.teacherEditHelp}</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Input name="name" defaultValue={initial.name} required />
            <Input name="email" type="email" defaultValue={initial.email} required />
          </div>
          <div className="grid gap-2 md:grid-cols-1">
            <InstrumentSelect name="specialty" defaultValue={initial.specialty} locale={locale} compact required aria-label={dictionary.forms.teacherSpecialty} />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Input name="zoomLink" type="url" defaultValue={initial.zoomLink ?? ""} placeholder="Zoom URL" />
            <Input name="meetLink" type="url" defaultValue={initial.meetLink ?? ""} placeholder="Google Meet URL" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id={`teacher-edit-file-${teacherId}`}
              name="file"
              type="file"
              accept="image/*"
              className="h-auto py-2"
              onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
            />
            <Button type="button" size="sm" variant="outline" disabled={uploading || !uploadFile} onClick={uploadImage}>
              {uploading ? dictionary.forms.uploading : dictionary.forms.uploadPhoto}
            </Button>
          </div>
          <Textarea name="bio" rows={2} defaultValue={initial.bio ?? ""} placeholder={dictionary.forms.teacherBioPlaceholder} />
          <Button type="submit" size="sm" variant="gold" disabled={pending}>
            {pending ? dictionary.common.saving : dictionary.forms.saveChanges}
          </Button>
          {error ? <p className="text-xs text-rose-700">{error}</p> : null}
          {success ? <p className="text-xs text-emerald-700">{success}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
