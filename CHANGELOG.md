# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0.0] - 2026-03-30

### Added
- Full implementation plan for Lordhill Church SNS
- UI specification covering 7 screens, loading/empty/error states, and navigation model
- Database schema design (MySQL + Prisma) with soft delete support
- OAuth authentication flow (Google, Kakao, Naver) with Capacitor deep linking
- Security design: CORS, rate limiting, XSS prevention, CSRF, audit logging
- File upload strategy: Sharp image resize via worker thread, S3 presigned URL for video
- Test plan covering unit, integration, and E2E manual checklist
- Monthly cost estimate ($7-39/month for 40 users)
- Reviewed and approved via /autoplan (CEO + Design + Eng review pipeline)
