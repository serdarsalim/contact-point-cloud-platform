# Contact Point Cloud Platform

Contact Point Cloud Platform is the web/admin backend for Contact Point Chrome extension cloud templates.

It provides organization-scoped template management and token-based read-only extension APIs, while keeping existing extension local templates unchanged.

## License

Proprietary software. All rights reserved.

## Stack

- Next.js (App Router, TypeScript)
- Prisma ORM
- Neon Postgres

## Implemented Phase 1 Scope

- Prisma data model for `User`, `Organization`, `OrganizationMember`, `OrganizationApiKey`, `Template`
- Session auth foundation for admin web routes (username/password + signed HTTP-only cookie)
- RBAC foundation for global `SUPERADMIN` and org-scoped `ADMIN`
- Extension bearer-token auth foundation
- Extension read-only APIs:
  - `GET /api/v1/extension/me`
  - `GET /api/v1/extension/templates?type=EMAIL|WHATSAPP|NOTE`
- Admin APIs skeleton:
  - Organizations (SUPERADMIN)
  - Organization admin assignment (SUPERADMIN global + ADMIN in own org)
  - Templates CRUD (ADMIN own org, SUPERADMIN global)
  - API key create/list/revoke/rotate (ADMIN own org, SUPERADMIN global)
  - User creation with generated password (SUPERADMIN)
- Admin pages skeleton under `/admin/*`
- Email template editor uses TinyMCE (links/images by URL), while WhatsApp/Note remain plain text
- Superadmin org workspace at `/admin/orgs/:orgId` for multi-admin management
- One-time reveal token creation and rotation behavior
- `lastUsedAt` updates on successful extension token-auth requests
- Basic audit logging for org/admin/template/API-key management actions
- First-login password change enforcement for generated admin passwords

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

Required env vars:

- `DATABASE_URL`
- `AUTH_SESSION_SECRET`
- `TOKEN_HASH_SALT`

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Apply DB migrations:

```bash
npm run prisma:deploy
```

5. Optional: seed bootstrap superadmin (global role) + optional bootstrap organization:

```bash
npm run prisma:seed
```

If an existing user must be promoted to global superadmin (without resetting password):

```bash
npm run superadmin:promote -- --username <username>
```

6. Run app:

```bash
npm run dev
```

If your Neon DB is not reachable yet, schema and migration files are already scaffolded in `prisma/` and can be applied later.

## RBAC Rules

### Roles

- `SUPERADMIN`
  - Global role on `User` (not tied to org membership)
  - Organization CRUD
  - Full template/API key/admin access across all organizations
  - Optionally create initial org admin during org creation
- `ADMIN`
  - Manage org admins, templates and API keys only for assigned organizations via `OrganizationMember`

### Enforcement

- Web admin routes require a valid session cookie.
- Admin APIs resolve org scope from global superadmin role or org membership checks.
- Admin assignment endpoints never allow granting `SUPERADMIN`.
- Removing the last `ADMIN` from an organization is blocked.
- Extension APIs never trust client-supplied org input; org is derived from bearer token.

## Token Lifecycle and Offboarding

### Creation

- Admin creates token with label (`Jane - SDR MacBook` style).
- Raw token is shown once in response.
- Only `tokenHash` is persisted in DB.
- Token is scoped to one organization and `templates:read`.

### Usage

- Extension sends bearer token to `/api/v1/extension/*` endpoints.
- Server hashes presented token and matches DB `tokenHash`.
- `lastUsedAt` is updated on successful requests.

### Revoke

- Revoke sets `revokedAt`.
- Revoked token immediately loses extension access.

### Rotate

- Existing token row is deleted.
- New token row is created.
- New raw token is shown once.

## Extension API Contract

### GET `/api/v1/extension/me`

Auth: `Authorization: Bearer <org-token>`

Success:

```json
{
  "organization": {
    "id": "org_id",
    "name": "Acme Inc",
    "slug": "acme-inc"
  },
  "token": {
    "id": "key_id",
    "label": "Jane - SDR MacBook",
    "prefix": "a1b2c3d4",
    "scopes": ["templates:read"]
  }
}
```

### GET `/api/v1/extension/templates?type=EMAIL|WHATSAPP|NOTE`

Auth: `Authorization: Bearer <org-token>`

Success:

```json
{
  "organizationId": "org_id",
  "source": "cloud",
  "templates": [
    {
      "id": "tmpl_id",
      "organizationId": "org_id",
      "type": "EMAIL",
      "name": "Intro",
      "subject": "Quick intro",
      "body": "Hello {{firstName}}",
      "imageAssetId": null,
      "imageAlt": null,
      "createdAt": "2026-03-01T00:00:00.000Z",
      "updatedAt": "2026-03-01T00:00:00.000Z"
    }
  ]
}
```

## Admin API Summary

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/change-password`
- `GET /api/admin/me`
- `GET/POST /api/admin/orgs`
- `PATCH/DELETE /api/admin/orgs/:orgId`
- `GET/POST/DELETE /api/admin/orgs/:orgId/admins`
- `POST /api/admin/orgs/:orgId/admins/:userId/reset-password`
- `GET/POST /api/admin/templates`
- `PATCH/DELETE /api/admin/templates/:templateId`
- `GET/POST /api/admin/api-keys`
- `POST /api/admin/api-keys/:keyId/revoke`
- `POST /api/admin/api-keys/:keyId/rotate`
- `GET/POST /api/admin/users`

## Notes for Chrome Extension Integration

- Local extension keys remain unchanged (`popupEmailTemplates`, `popupWhatsappTemplates`, `popupNoteTemplates`).
- Cloud data must stay org-scoped and separated by cloud cache keys in extension.
- Cloud templates are read-only in extension UI; edits happen only in this web app.
