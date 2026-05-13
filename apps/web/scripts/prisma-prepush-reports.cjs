#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { spawnSync } = require("node:child_process");

const sql = String.raw`
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'RecurringTimezoneMode'
  ) THEN
    CREATE TYPE "RecurringTimezoneMode" AS ENUM ('STUDENT_TIME', 'TEACHER_TIME', 'CUSTOM_TIMEZONE');
  END IF;

  IF to_regclass('public."RecurringClassSeries"') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'RecurringClassSeries'
        AND column_name = 'timezoneMode'
    ) THEN
      ALTER TABLE "RecurringClassSeries" ADD COLUMN "timezoneMode" "RecurringTimezoneMode";
    END IF;

    UPDATE "RecurringClassSeries"
    SET "timezoneMode" = 'TEACHER_TIME'
    WHERE "timezoneMode" IS NULL;

    ALTER TABLE "RecurringClassSeries" ALTER COLUMN "timezoneMode" SET DEFAULT 'STUDENT_TIME';
    ALTER TABLE "RecurringClassSeries" ALTER COLUMN "timezoneMode" SET NOT NULL;
  END IF;

  IF to_regclass('public."ProgressReport"') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'ProgressReport'
        AND column_name = 'reportKey'
    ) THEN
      ALTER TABLE "ProgressReport" ADD COLUMN "reportKey" TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'ProgressReport_reportKey_key'
    ) THEN
      WITH ranked_reports AS (
        SELECT
          "id",
          CONCAT(
            "studentId", ':', COALESCE("teacherId", 'academy'), ':',
            TO_CHAR("startDate", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), ':',
            TO_CHAR("endDate", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
          ) AS base_key,
          ROW_NUMBER() OVER (
            PARTITION BY "studentId", COALESCE("teacherId", 'academy'), "startDate", "endDate"
            ORDER BY "createdAt", "id"
          ) AS row_number
        FROM "ProgressReport"
      )
      UPDATE "ProgressReport" report
      SET "reportKey" = CASE
        WHEN ranked_reports.row_number = 1 THEN ranked_reports.base_key
        ELSE CONCAT(ranked_reports.base_key, ':', report."id")
      END
      FROM ranked_reports
      WHERE report."id" = ranked_reports."id";
    ELSE
      WITH ranked_reports AS (
        SELECT
          "id",
          CONCAT(
            "studentId", ':', COALESCE("teacherId", 'academy'), ':',
            TO_CHAR("startDate", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), ':',
            TO_CHAR("endDate", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
          ) AS base_key,
          ROW_NUMBER() OVER (
            PARTITION BY "studentId", COALESCE("teacherId", 'academy'), "startDate", "endDate"
            ORDER BY "createdAt", "id"
          ) AS row_number
        FROM "ProgressReport"
      )
      UPDATE "ProgressReport" report
      SET "reportKey" = CASE
        WHEN ranked_reports.row_number = 1 THEN ranked_reports.base_key
        ELSE CONCAT(ranked_reports.base_key, ':', report."id")
      END
      FROM ranked_reports
      WHERE report."id" = ranked_reports."id"
        AND (report."reportKey" IS NULL OR report."reportKey" = '');
    END IF;

    ALTER TABLE "ProgressReport" ALTER COLUMN "reportKey" SET NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS "ProgressReport_reportKey_key" ON "ProgressReport"("reportKey");
  END IF;
END $$;
`;

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["prisma", "db", "execute", "--schema", "prisma/schema.prisma", "--stdin"], {
  input: sql,
  stdio: ["pipe", "inherit", "inherit"],
  env: process.env,
});

process.exit(result.status ?? 1);
