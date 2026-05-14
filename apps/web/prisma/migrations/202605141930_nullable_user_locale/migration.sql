-- Allow null locale so accounts can follow the browser's preferred language until a user saves a preference.
ALTER TABLE "User" ALTER COLUMN "locale" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "locale" DROP NOT NULL;
