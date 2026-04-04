# Changelog

All notable changes to this project will be documented in this file.

## [0.0.1] - 2026-04-03

### Added
- Profile photo upload/update flow for students and teachers via MinIO-backed image uploads in Settings.
- Persistent top-right `Cerrar sesión` action in the shared app shell.
- App-wide version footer badge (`v0.0.1`) on authenticated and public entry surfaces.
- Teacher recurrent class scheduler with weekly recurrence, conflict detection, and student notifications.
- Admin edit workflows for both students and teachers, including profile updates and assignment-aware student editing.

### Changed
- Student and teacher onboarding now accept an optional profile image URL at creation time.
- Admin recent lists now show avatars and inline edit controls for faster operations.

## [0.1.0] - 2026-03-31

### Added
- Foundation architecture and premium design system with role-aware layout.
- Student dashboard experience, including plan, progress, assigned teacher, and WhatsApp plan management CTA.
- Scheduling and rescheduling workflow with pending approval state.
- Weekly practice video workflow for student uploads and teacher feedback.
- Messaging and in-app notifications between assigned student and teacher.
- Teacher and admin operational dashboards.
- Docker-first local development stack (`web`, `postgres`, `minio`, `mailhog`) with seed data.
