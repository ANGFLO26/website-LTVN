# Admin authentication v1 (QA-01)

Authentication uses JWT Bearer tokens and one administrative role. The existing database value `role = 'admin'` is the Admin v1 role. Legacy `editor` records remain unchanged and cannot log in or use Admin endpoints.

## Configuration

Set these in the API environment (see `.env.example`):

- `JWT_SECRET`: a private randomly generated secret of at least 32 bytes. There is no fallback secret. Generate one locally with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"` and store it outside source control.
- `JWT_TTL_SECONDS`: integer from 1 to 86400; for example, `3600` for one hour. There is no code default. All API instances must share the configured secret.

The API refuses to start when either value is missing/invalid. Use HTTPS in production. Tokens use HS256, issuer `ltvn-api` and audience `ltvn-admin`.

## Account prerequisite

Login requires an existing user with a known password matching a valid bcrypt `passwordHash`, `role = 'admin'`, `status = 'active'` and no `deletedAt` value. Email matching ignores case and surrounding whitespace. Passwords are compared without trimming; passwords exceeding bcrypt's 72-byte limit are rejected.

The current seed contains sample hash strings and the existing user-creation service has a placeholder hash fallback. These are not usable login credentials. This change does not modify that legacy data or creation flow, reset any password, create an account, run seed/migrations or alter schema. An authorized operator must provision a valid account separately before real login can be verified.

## Endpoint access

Public NestJS controller endpoints:

- `GET /api` (existing health greeting)
- `GET /api/machines` (published only; used by public website)
- `GET /api/machines/:idOrSlug` (published only)
- `GET /api/news-events` (published only; used by public website)
- `GET /api/news-events/:idOrSlug` (published only)
- `POST /api/contacts` (visitor submission)
- `POST /api/auth/login`

Public machine/news queries enforce `status = 'published'` in SQL. Draft, archived and missing records return 404 on public detail reads, for both UUID and slug. Sending an Admin token or query parameters to a public endpoint does not expand its visibility.

Admin reads use `GET /api/admin/machines`, `GET /api/admin/machines/:idOrSlug`, `GET /api/admin/news-events` and `GET /api/admin/news-events/:idOrSlug`. These require an active Admin token and include draft, published and archived records. The Admin frontend uses these collection routes; the public website continues using the public collection routes. Existing machine/news mutation URLs remain unchanged and protected.

All other controller endpoints require an active Admin token by default, including `GET /api/auth/me`, all users routes, contact reads/updates/deletes and all media/standards routes.

`AuthModule` registers an `APP_GUARD`. An endpoint is public only when marked `@Public()`. New controllers are protected automatically. Existing Swagger documentation at `/api/docs` is mounted separately as middleware and remains accessible; viewing documentation does not authorize API calls.

Every protected request verifies the token and reads the current account to reject inactive, deleted or non-admin accounts, including tokens issued before the account was disabled. Login failures use 401 without distinguishing missing user, incorrect password or ineligible account. Login and `/auth/me` return only the identity allowlist, never `passwordHash`.

## Admin frontend

The Admin shell mounts only after login or successful `/api/auth/me` verification on reload. The token is kept in memory and `sessionStorage` for the current browser tab. The API helper sends `Authorization: Bearer <token>`. Expiry or an API 401/403 clears the session and returns to Login. If storage is unavailable, the session lasts only until reload.

Logout clears the browser's token and unmounts the Admin shell. As with stateless JWT authentication, a previously copied token is not server-revoked by browser logout and remains valid until expiry unless the account is disabled/deleted or the signing secret is rotated. There is no refresh-token or server-side session table in v1.

QA-04's localStorage data fallback and save-success behavior remain unchanged. An authentication failure closes the Admin gate; other mutation/error behavior is outside this change.

## Scope and verification

QA-02 limits news `author` and contact `assignedUser` relations to `id` and `fullName`. QA-07 separates published public reads from Admin reads of all statuses. QA-08 validates public contact creation as described below. Legacy user creation, schema and the existing Admin save/fallback behavior remain unchanged.

### Public contact creation (QA-08)

`POST /api/contacts` stays public. A route-scoped NestJS `ValidationPipe` transforms `PublicContactDto`, trims strings, whitelists declared fields and rejects unknown properties with 400 before invoking the service. There is no global validation pipe; Admin update validation is unchanged.

- All six v1 fields are required: `fullName`, `companyName`, `phone`, `email`, `requestType`, `message`.
- `fullName` and `companyName`: 1–255 characters. `email`: valid email format, at most 255 characters. `message`: 1–5000 characters.
- `phone`: at most 50 characters, 7–15 digits, optional leading `+`, spaces, parentheses, dots and hyphens.
- All strings are trimmed before validation; missing, null, blank and wrong-type values are rejected.
- `requestType` must be one of the codes below. Public `subject` is rejected; only the server maps a validated code into the existing subject column.

| Public requestType | Stored subject |
| --- | --- |
| `quotation` | Yêu cầu báo giá |
| `product_consultation` | Tư vấn lựa chọn sản phẩm |
| `technical_support` | Hỗ trợ kỹ thuật |
| `maintenance_repair` | Bảo trì hoặc sửa chữa |
| `partnership` | Hợp tác |
| `other` | Liên hệ khác |

`companyName` maps directly to `company_name`, and phone maps directly to `phone`. The service explicitly maps visitor fields, sets `status = 'new'` and null assignment/admin-note/resolution fields. The database supplies the UUID and creation/update timestamps through existing defaults. No schema change is required; nullable legacy columns remain unchanged while the public DTO requires all six fields for new submissions.

The form has six required inputs, including a controlled request-type select. The former product-interest/optional-subject input is replaced by that required select. No email or company is fabricated. Frontend HTTP 400 handling remains limited to displaying a validation message; QA-05's broader success/error behavior and QA-09's submission locking remain separate work.

Tests use randomly generated credentials and secrets with isolated persistence; they do not access or mutate the real database:

```sh
npm run build:api
npm run build:admin
npm --prefix api test
npm --prefix api run test:e2e
npm --prefix api run lint
node scripts/qa01-auth-browser.mjs
```

The browser check requires the Admin build, starts an isolated localhost server and uses mocked HTTP responses. It verifies the gate/session/Bearer flow, not real database CRUD. API e2e tests exercise the actual global guard, JWT and bcrypt with persistence replaced by test fixtures.
