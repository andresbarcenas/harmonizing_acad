import { db } from "../src/lib/db";
import {
  isPrivateMediaStorageKey,
  protectedMediaToBuffer,
  storePrivatePracticeVideoBuffer,
  storePrivateRepertoireAttachmentBuffer,
} from "../src/lib/storage";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const forceProduction = args.has("--force-production");
const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

if (isProduction && !forceProduction) {
  console.error("Refusing to run protected media migration in production without --force-production.");
  process.exit(1);
}

async function main() {
  const [videos, attachments] = await Promise.all([
    db.practiceVideo.findMany({
      where: { NOT: { storageKey: { startsWith: "private-media/" } } },
      select: { id: true, storageKey: true, originalName: true, studentId: true },
    }),
    db.repertoireAttachment.findMany({
      where: { NOT: { storageKey: { startsWith: "private-media/" } } },
      select: { id: true, storageKey: true, originalName: true, mimeType: true, repertoireItemId: true },
    }),
  ]);

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    videos: videos.length,
    attachments: attachments.length,
  }, null, 2));

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to copy media and update database records.");
    return;
  }

  let migratedVideos = 0;
  let migratedAttachments = 0;
  let failed = 0;

  for (const video of videos) {
    if (isPrivateMediaStorageKey(video.storageKey)) continue;
    try {
      const media = await protectedMediaToBuffer({
        storageKey: video.storageKey,
        mediaType: "video",
        fallbackContentType: "video/mp4",
      });
      if (!media) throw new Error("source video not found");
      const stored = await storePrivatePracticeVideoBuffer({
        buffer: media.buffer,
        contentType: media.contentType,
        originalName: video.originalName,
        studentProfileId: video.studentId,
      });
      await db.practiceVideo.update({ where: { id: video.id }, data: { storageKey: stored.storageKey } });
      migratedVideos += 1;
      console.log(`video ${video.id}: migrated`);
    } catch (error) {
      failed += 1;
      console.error(`video ${video.id}: failed`, error instanceof Error ? error.message : error);
    }
  }

  for (const attachment of attachments) {
    if (isPrivateMediaStorageKey(attachment.storageKey)) continue;
    try {
      const media = await protectedMediaToBuffer({
        storageKey: attachment.storageKey,
        mediaType: "repertoire",
        fallbackContentType: attachment.mimeType,
      });
      if (!media) throw new Error("source attachment not found");
      const stored = await storePrivateRepertoireAttachmentBuffer({
        buffer: media.buffer,
        contentType: media.contentType,
        originalName: attachment.originalName,
        repertoireItemId: attachment.repertoireItemId,
      });
      await db.repertoireAttachment.update({ where: { id: attachment.id }, data: { storageKey: stored.storageKey } });
      migratedAttachments += 1;
      console.log(`attachment ${attachment.id}: migrated`);
    } catch (error) {
      failed += 1;
      console.error(`attachment ${attachment.id}: failed`, error instanceof Error ? error.message : error);
    }
  }

  console.log(JSON.stringify({ migratedVideos, migratedAttachments, failed }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
