# Historical PDF Imports

Harmonizing can stage old teacher documents for any student before writing them into student progress records. The first pilot is `Consolidado Tommy.pdf`, but the workflow is intentionally generic for future onboarded students.

## Why staging exists

Historical PDFs are not clean databases. Some pages are dated exams, some are assignments, some are curriculum material, and some are image-only sheet music. The import flow therefore creates a review queue first:

1. Extract text from the PDF.
2. Classify each page with deterministic rules.
3. Store every page as a `HistoricalImportRow` with raw text, source page, confidence, and suggested payload.
4. Let an admin apply, skip, or mark each row as source-only.
5. Preserve source provenance on applied records.

The importer does not create fake `ClassSession` records unless a future version has reliable session dates.

## Student-agnostic import command

The canonical import script is:

```bash
docker compose exec web npm run import:student-history -- \
  --student-email "student@example.com" \
  --student-name "Student Name" \
  --teacher-email "maria@harmonizing.com" \
  --instrument "Piano" \
  --pdf "/imports/student-history.pdf"
```

Useful options:

- `--dry-run`: preview extraction counts without writing to the database.
- `--student-email`: student account to create or attach to.
- `--student-name`: display name used if the account needs to be created.
- `--teacher-email`: teacher assigned to the student if creating/ensuring assignment.
- `--instrument`: preferred instrument saved on the student profile and imported repertoire.
- `--timezone`: account timezone, defaults to `America/New_York`.
- `--locale`: account locale, defaults to `es`.
- `--phone`: optional phone for a newly created/updated student profile.
- `--bio`: optional import context note for the student profile.
- `--created-by-email`: admin user recorded as import creator, defaults to `admin@harmonizing.com`.
- `--note`: batch-level environment/review note.

If the student does not exist, the script creates a student account with temporary password `demo123`, assigns the selected teacher, and creates the standard active plan. If the student exists, the script updates the basic import-related profile fields and stages the PDF against that existing student.

## Local Tommy pilot

Seed data includes a local Tommy student account:

- Student: `tommy@harmonizing.com`
- Password: `demo123`
- Instrument: Piano
- Teacher: María

The Docker web container mounts the local imports directory at `/imports`:

```bash
HARMONIZING_IMPORTS_DIR=/Users/andresbarcenas/Downloads
```

With Docker running, stage Tommy's PDF from inside the web container:

```bash
docker compose exec web npm run import:tommy-history
```

Preview without writing rows:

```bash
docker compose exec web npm run import:tommy-history -- --dry-run
```

The Tommy shortcut looks for `/Users/andresbarcenas/Downloads/Consolidado Tommy.pdf` on the host and falls back to `/imports/Consolidado Tommy.pdf` in Docker.

## Admin review

Open:

```txt
/admin/imports
```

Admins can review a batch and choose per row:

- `Aplicar`: writes an approved record into progress data.
- `Solo fuente`: keeps provenance only for image-only/source pages.
- `Omitir`: intentionally skips a page.

## Mapping rules

- Exam pages become `ProgressReport` records when applied.
- Song lists become `RepertoireItem` records.
- `Tarea` and `Rutina` pages become reviewed historical `PracticeAssignment` records so they do not appear as current pending homework.
- Skill/theory/curriculum pages become `StudentLogEntry` records with `MILESTONE` or `NOTE` type.
- Image-only pages become source-only unless reviewed manually later.

Each applied row stores provenance in metadata or the import row itself:

- source filename
- source page
- import batch ID
- import row ID
- confidence score
- raw extracted text

## Production safety

- Re-running the same PDF is idempotent by student, filename, file hash, page, and row hash.
- Production import should use staging and admin review, not automatic apply.
- Historical assignments are marked `REVIEWED` to avoid confusing students with old homework.
- Teacher private notes are not inferred from the PDF; ambiguous observations are imported as neutral historical notes.
- For future production onboarding, prefer attaching imports to an existing student account created through `/admin/students` before staging the PDF.

## Manual test plan

1. Run `docker compose up --build`.
2. Run `docker compose exec web npm run import:tommy-history`.
3. Sign in as `admin@harmonizing.com / demo123`.
4. Open `/admin/imports` and select the Tommy batch.
5. Confirm the batch has 258 pages/rows.
6. Confirm extracted rows include early piano topics, homework/routines, repertoire lists, the 2022 exam, and the 2024 exam with grade `95.9`.
7. Apply one repertoire row and confirm Tommy's progress page shows songs.
8. Apply one homework/routine row and confirm it creates a reviewed historical assignment.
9. Apply the 2024 exam row and confirm Tommy sees a published historical report.
10. Re-run the import and confirm it does not duplicate rows already staged.
11. Run a generic dry run for a second student with `npm run import:student-history -- --dry-run --student-email another@example.com --student-name "Another Student" --pdf "/imports/another.pdf"`.
