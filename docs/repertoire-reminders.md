# Repertoire Attachments and Class Reminders

## Repertoire song sheets

Teachers and admins can attach song sheets or sheet music to a `RepertoireItem`. Attachments are stored through the same configurable media layer used by practice videos:

- Local/S3/MinIO: stores an object key and resolves it with `NEXT_PUBLIC_MEDIA_BASE_URL`.
- Vercel Blob: stores the public blob URL as the storage key.
- Local filesystem mode: stores files under `LOCAL_REPERTOIRE_STORAGE_DIR` and serves them from `/uploads/repertoire`.

Allowed attachment formats are PDF, JPG, PNG, and WEBP. The current upload limit is 20MB. Teachers can only manage attachments for assigned students; admins can manage all; students only see their own repertoire attachments from the progress portal.

## Instrument-specific after-class skills

The after-class workflow uses the lesson instrument to decide which skill categories appear:

- Piano lessons show `GENERAL` and `PIANO` skills.
- Singing/vocal lessons show `GENERAL` and `VOICE` skills.

`ClassSession.instrument` is used first. If it is missing or ambiguous, the workflow defaults to Piano and lets the teacher switch the lesson type before saving. The selected lesson type is persisted back to the class session. The save API also validates that submitted skill ratings match the selected lesson type, so hidden or mismatched skills cannot be posted manually.

## Resend class email reminders

Class reminders can be sent through Resend from `/api/cron/class-reminders`. The endpoint supports both `GET` and `POST`; production calls must include `Authorization: Bearer $CRON_SECRET`.

The endpoint is intentionally **not** scheduled in `apps/web/vercel.json` yet because Vercel Hobby projects only allow daily cron schedules. Keep reminders manual until the project is upgraded or a daily reminder strategy is chosen.

Required production env vars:

```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="Harmonizing Academy <classes@your-domain.com>"
CLASS_EMAIL_REMINDERS_ENABLED=true
CLASS_REMINDER_OFFSETS_MINUTES=1440,60
CLASS_REMINDER_WINDOW_MINUTES=20
CRON_SECRET=replace-with-a-long-random-secret
```

The sender in `RESEND_FROM_EMAIL` must be verified in Resend before production delivery. The default reminder offsets send one reminder about 24 hours before class and another about 1 hour before class.

Reminder delivery is idempotent through `ClassReminderDelivery` with a unique key across class, recipient, channel, and offset. Cancelled, completed, and no-show classes are ignored. Each successful email also creates an in-app class reminder notification.

## Manual test plan

1. Set Resend env vars locally or in Vercel.
2. Create a scheduled class inside one of the configured reminder windows.
3. Trigger `POST /api/cron/class-reminders` locally or manually with `Authorization: Bearer $CRON_SECRET`.
4. Confirm Resend receives one email for the student and one for the teacher.
5. Trigger the endpoint again and confirm no duplicate email is sent.
6. Cancel or complete a class and confirm no reminder is sent for it.
7. Attach a PDF/image to a repertoire item as teacher/admin.
8. Sign in as the student and confirm the attachment link appears in `/progress`.
