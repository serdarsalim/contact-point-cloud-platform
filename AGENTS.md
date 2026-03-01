# AGENTS.md

## Project Name
Contact Point Cloud Template Platform

## Purpose
Build a cloud template platform for the Contact Point Chrome extension using Next.js + Prisma + Neon, while preserving existing local/manual template workflows in the extension.

The extension must support two parallel sources:
- Local templates (existing behavior, editable in extension)
- Cloud templates (managed in web app, read-only in extension)

## Current Status (2026-03-01)

### Implemented
- Next.js App Router + TypeScript scaffold is in place and actively used.
- Prisma schema and migrations are implemented for:
  - `User`, `Organization`, `OrganizationMember`, `OrganizationApiKey`, `Template`, `AuditLog`
  - Global `User.role` model (`SUPERADMIN` / `ADMIN`) has been added and migrated.
- Session auth is implemented for admin web routes.
- Bearer token auth is implemented for extension routes.
- Extension read APIs are implemented:
  - `GET /api/v1/extension/me`
  - `GET /api/v1/extension/templates?type=EMAIL|WHATSAPP|NOTE`
- API key lifecycle is implemented:
  - hash-only storage
  - one-time reveal on create/rotate
  - revoke/rotate flows
  - `lastUsedAt` updates on successful token-auth requests
- Org and admin management are implemented:
  - superadmin org create/delete
  - org admin create/delete
  - superadmin admin-password reset
  - block deletion of last org `ADMIN`
- First-login password change flow is implemented (`mustChangePassword`).
- Audit logging is implemented for key admin actions.
- Admin UI has been iterated and now includes:
  - context-aware navbar
  - superadmin all-org directory with left sidebar
  - org workspace with stats + admins
  - `+ New Admin` modal flow
  - redesigned templates workspace (sidebar + editor)
  - redesigned API token creation/list actions

### Current RBAC Decision (Important)
- `SUPERADMIN` is a **global user role** (`User.role = SUPERADMIN`) and is **not org membership-based**.
- `ADMIN` remains org-scoped via `OrganizationMember`.
- SUPERADMIN has full access across all orgs.

### Pending / Next
- Extension-side cloud integration (cache keys, merge strategy, source filter UI) is still pending in the extension repo.
- End-to-end smoke test runbook across extension + cloud backend still needs to be documented and executed.
- Optional hardening (rate limiting, stronger audit/reporting, additional guardrails) can be added next.

## Product Requirements

### Core Requirements
1. Keep existing local template workflow unchanged.
2. Add cloud template workflow as a second source.
3. Cloud templates are read-only in the extension.
4. Cloud templates are managed only in Next.js admin app.
5. No key/data mixing between local and cloud caches.
6. No cross-organization data leakage.

### Roles
Only two web roles are required:
- `SUPERADMIN`
  - Global role on `User` (not tied to one org membership)
  - Create/delete organizations
  - Assign/revoke org admins
  - View all orgs
  - Full access to templates and API keys across all orgs
- `ADMIN`
  - Manage templates for their org
  - Manage org API tokens for extension consumers

Extension users are not web-admin users; they use org API tokens only.

### Org Token Model
1. Admin creates tokens for people/devices.
2. Each token has a human-readable label, e.g. `Jane - SDR MacBook`.
3. Token grants read access to that org's cloud templates.
4. Token is pasted into extension settings.
5. Offboarding = revoke token.

Security requirements:
- Store only token hash (never raw token)
- Show full token only once at creation
- Keep `lastUsedAt`
- Support revoke/rotate
- Scope token to one organization
- Scope token to `templates:read` only

## Architecture

### Stack
- Next.js (App Router)
- Prisma ORM
- Neon Postgres
- Chrome extension (existing) consumes read-only cloud APIs

### Source of Truth by Workflow
- Local templates: `chrome.storage.local`
- Cloud templates: Neon via Next.js API

### Extension Behavior
1. Load local templates immediately.
2. Load cloud cached templates.
3. Fetch fresh cloud templates in background.
4. Merge in memory for picker/render.
5. Cloud failures must not block local flows.

## Data Model Blueprint (Prisma)

### Entities
- `User`
- `Organization`
- `OrganizationMember` (active org memberships for `ADMIN`)
- `OrganizationApiKey`
- `Template`

### Template Fields
- `id`
- `organizationId`
- `type` (`EMAIL`, `WHATSAPP`, `NOTE`)
- `name`
- `subject` (nullable; email only)
- `body`
- `createdAt`
- `updatedAt`

### Forward-Compatible Storage Hooks (No Upload in Phase 2)
Add later or now as nullable:
- `imageAssetId` (nullable)
- `imageAlt` (nullable)

This keeps future object storage integration additive without redesign.

## API Blueprint

### Extension-Facing (Token Auth)
- `GET /api/v1/extension/me`
  - Validates token
  - Returns org context
- `GET /api/v1/extension/templates?type=EMAIL|WHATSAPP|NOTE`
  - Returns templates for org from token context

Rules:
- Token auth only
- Read-only endpoints
- Derive org from token, never trust client org input

### Admin App APIs (Session/OAuth Auth)
- Org CRUD (`SUPERADMIN`, global role)
- Org membership/admin assignment (`SUPERADMIN` globally, `ADMIN` within accessible org)
- Template CRUD (`ADMIN` in own org; `SUPERADMIN` globally)
- API key create/list/revoke/rotate (`ADMIN` own org; `SUPERADMIN` all)

## Extension Storage-Key Strategy

### Keep Existing Local Keys Unchanged
- `popupEmailTemplates`
- `popupWhatsappTemplates`
- `popupNoteTemplates`

### Add Cloud Cache Keys (Org-Scoped)
- `popupCloudEmailTemplates::<orgId>`
- `popupCloudWhatsappTemplates::<orgId>`
- `popupCloudNoteTemplates::<orgId>`
- `popupCloudTemplatesMeta::<orgId>`
- `popupCloudAuth`

### In-Memory ID Prefixing
- Local IDs: `local_<id>`
- Cloud IDs: `cloud_<id>`

### Invariants
1. Local CRUD can only touch local keys.
2. Cloud sync can only touch cloud keys.
3. Merge by `(source, id)` only.
4. Never auto-overwrite local from cloud.

## UX Requirements
1. Template picker/source list supports `All | Local | Cloud` filters.
2. Cloud templates show badge: `Cloud`.
3. Cloud templates in extension are non-editable with helper text: `Managed in web app`.
4. Connection status visible in settings (`Connected org: <name>` or disconnected state).

## Phase 2 Project Plan

### Milestone 1: Backend Foundation
- Done

### Milestone 2: Org and Access Control
- Done (with global `SUPERADMIN` role model)

### Milestone 3: Cloud Template Management (Web)
- Done

### Milestone 4: API Key Lifecycle
- Done

### Milestone 5: Extension Cloud Read Integration
- Add settings fields for org token
- Add connection test (`/extension/me`)
- Pull cloud templates and cache with org-scoped keys
- Merge local + cloud in picker
- Keep cloud read-only in extension UI

### Milestone 6: Hardening and Rollout
- Error handling and retries
- Feature flag for cloud workflow
- Smoke tests and regression verification
- Docs and runbook for token offboarding

## Acceptance Criteria
1. Existing local template flows work unchanged.
2. Cloud templates load by valid org token.
3. Cloud templates cannot be edited from extension.
4. SUPERADMIN can create/delete orgs and assign admins.
5. ADMIN can manage templates only in own org.
6. Revoked tokens lose extension access immediately.
7. No cache or data bleed between orgs.
8. Local flows remain functional when cloud API is down.

## Out of Scope (Phase 2)
1. Image/file upload implementation
2. Realtime collaboration
3. Fine-grained end-user RBAC beyond SUPERADMIN/ADMIN

## Future Phase (Phase 3+) Notes
- Add `Asset` model and object storage provider (S3/R2/GCS)
- Add upload/download signed URL APIs
- Link templates to assets via nullable `imageAssetId`
- Preserve same RBAC and org-token model

## Kickoff Checklist
1. Repository and Next.js app initialized. Done.
2. Neon project + `DATABASE_URL` setup. In progress per environment.
3. Prisma schema + migrations implemented. Done.
4. RBAC scaffolding with seed users/roles implemented. Done.
5. Org + key management APIs/UI implemented. Done.
6. Extension read-only cloud endpoints implemented. Done.
7. Extension settings + cloud cache key isolation integration. Pending (extension repo).
8. Manual smoke tests across local/cloud flows. Pending full E2E pass.
