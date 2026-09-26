# VPA ? Visual Performance and Arts Club

The existing public website and private **VPA Control Room** share database-managed content. The HTML/CSS/vanilla JavaScript design, animations, supplied photos, event layouts and gallery lightbox are preserved. Art 4 is the opening hero artwork; Arts 1?3 appear in Fine Arts. The Treasurer is Nekitha.

## Static Render deployment

Run `npm run build` and publish `dist/` on the existing Render Static Site. This exports all supplied public content, images and six event pages without a backend. It excludes admin routes, accounts and database files. Static content is rebuilt from the repository; local CMS edits are not automatically published to a Static Site.

Use `npm run build:server` for a separate Node deployment bundle in `server-dist/`. The following admin instructions apply to the local or hosted Node server.

## Run locally and create your account

Requires **Node.js 24.12 or newer** (uses the built-in SQLite module).

```sh
npm ci
npm run admin:create
npm run dev
```

The account command asks for your username and a hidden, confirmed password. Use at least 14 characters (maximum 72 UTF-8 bytes). There is no default password, public signup or seeded administrator. Account creation refuses a second account. For unattended provisioning, supply `ADMIN_USERNAME` and `ADMIN_PASSWORD` as temporary process environment variables, then remove them. Do not commit credentials.

Open **http://127.0.0.1:5173/admin** to sign in; the public website is at **http://127.0.0.1:5173/**. Use the configured origin exactly: `localhost` and `127.0.0.1` are different origins. Run `npm run admin:reset` to reset the existing administrator's password; it revokes all sessions.

Copy `.env.example` to `.env` if you need configuration. First startup creates the database, runs migrations and imports existing repository content. Later startups retain your edits. The artwork/name migration runs once. Scripts named `capture-seed` or `migrate-*` are historical source-conversion utilities: do not rerun them against the managed site.

## Using the Control Room

- **Dashboard:** real content counts, recent management activity and quick actions.
- **Events:** create/edit, search/filter, save draft, preview, publish/unpublish, mark completed and archive. Published events automatically have `/events/:slug` pages. An archived event and its associated gallery become private; records and photos are retained. Restore by editing its status and publishing again.
- **Media library:** bulk upload, search/category filters, alt text, connected placements, replacement and protected removal. Upload a poster here before choosing it in an event editor. Replacement updates all connected placements immediately, including the live site.
- **Gallery:** bulk upload with event/category assignment; choose existing photos; edit caption/alt text; feature; save privately or publish; drag or use arrow buttons to reorder. Removing a gallery entry keeps its media. Reordering and edits to published records take effect immediately.
- **Homepage:** hero photo, hero artwork, featured event and introductory text.
- **Art forms:** Music/Dance/Fine Arts featured images, descriptions, supporting photos and associated events.
- **Team:** names, roles, supplied portraits, display order and optional screenshot crop.
- **Content:** about, vision, mission and Instagram profile.

For homepage/art forms/team/content, **Save draft ? Preview saved changes ? Publish changes** preserves the live document until publication. Event and gallery Save draft makes that record private (it does not maintain a second live revision). Save before opening preview. Previews require an administrator session. Art-form supporting gallery photos are displayed in the public gallery; featured gallery photos sort first. The interface controls content, not layout, CSS or animations.

Unsaved changes prompt before leaving; repeated save/upload clicks are blocked. An expired session leaves editor text intact and offers sign-in in another tab. Retry saving after signing in. Confirmation is required for unpublishing, archival, replacement and removal.

## Architecture and database

`server.mjs` runs Express. `cms/application.mjs` owns routes, authorization, uploads and public delivery. Public pages consume `/content-data.js` or `/api/content`; individual public API routes also expose events, gallery, homepage, art forms and team. `/api/admin/*` provides authenticated writes. There is no frontend framework or animation dependency.

SQLite lives at `DATABASE_PATH`, with WAL, foreign keys and parameterized queries. `cms/migrations/001.sql` creates administrators, hashed sessions, login rate limits, events, media, gallery items, draft/published documents, explicit document/media/event references, migration history and basic activity. `cms/student-art.mjs` is migration 2. Media bytes are stored separately. Initial data comes only from existing content and supplied assets; six events, six office bearers and eleven gallery entries are seeded.

Dependencies: **Express** (routing), **bcryptjs** (password hashing), **Multer** (bounded multipart uploads), **Sharp** (image validation/optimization), **@aws-sdk/client-s3** (optional S3-compatible storage). Node's built-in SQLite is experimental in Node 24 and prints a runtime warning.

## Authentication and security

One CLI-provisioned account; bcrypt password hashes with cost 12. Cryptographically random session tokens are stored as hashes in the database, with an eight-hour default expiry. Cookies are HttpOnly/SameSite=Strict and Secure with a `__Host-` name in production. All administrator writes enforce authentication, same-origin requests and CSRF tokens; login also checks Origin. Login attempts are limited by username and IP (eight per 15 minutes). Logout and password reset revoke sessions.

Public data excludes drafts/archives and their associated gallery/media. Database, environment and upload directories are not static routes. Text is escaped, HTML editing is unavailable, SQL is parameterized, and uploads are decoded/re-encoded before delivery. Bundled assets are intentionally public; uploading a draft does not create a publicly accessible media URL until it is referenced by published content.

## Media and persistence

Uploads accept decoded JPEG, PNG, WebP and AVIF, up to 10 MB and 40 megapixels. Animated/unsupported/corrupt content and SVG uploads are rejected. Sharp produces WebP delivery variants bounded by 1600?2400 and 640?960, preserves aspect ratio and removes metadata from delivered derivatives. Originals are stored privately. Supplied bundled assets retain their original files; responsive derivatives apply to new/replacement uploads.

Stable media IDs connect placements to files. Replacement keeps the ID; delivery URLs change version to refresh caches. Referenced media cannot be removed, including references held by saved drafts or archived events. Unused media is soft-deleted; original/replaced files remain for recovery. There is no automatic storage garbage collection.

`STORAGE_DRIVER=local` uses `MEDIA_DIR`; production requires a mounted persistent volume. `STORAGE_DRIVER=s3` uses a private S3-compatible bucket through the server. S3 storage does **not** eliminate the need for persistent SQLite storage. The S3 adapter is implemented but has not been tested against a real account in this workspace.

## Environment

| Variable | Purpose |
| --- | --- |
| `APP_ORIGIN` | Exact browser origin, default `http://127.0.0.1:5173`; HTTPS required in production |
| `HOST`, `PORT` | Bind address/port; defaults `127.0.0.1`, `5173` |
| `NODE_ENV` | Set `production` on the hosted server |
| `DATABASE_PATH` | SQLite file, default `./data/vpa.sqlite`; use an absolute persistent path in production |
| `STORAGE_DRIVER` | `local` (default) or `s3` |
| `MEDIA_DIR` | Local images, default `./data/media`; persistent absolute path in production |
| `PERSISTENT_DATA_CONFIRMED` | Must be `true` in production, only after persistence is configured |
| `SESSION_HOURS` | Session lifetime, default 8, maximum 24 |
| `TRUST_PROXY` | Set to `1` only behind a single trusted reverse proxy; otherwise omit |
| `S3_BUCKET`, `S3_ENDPOINT`, `S3_REGION` | S3-compatible storage configuration; AWS endpoint may be omitted |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Server-only S3 credentials, or use the SDK's server credential provider |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Optional temporary CLI provisioning/reset input; interactive setup needs neither |

## Deploy and back up

The **CMS** requires a Node server. The public site also supports a standalone static export.

1. Choose a Node 24.12+ host with one application instance and persistent disk. Provision the domain/HTTPS reverse proxy. SQLite on a shared network drive or multiple independent replicas is not supported by this deployment design.
2. Run `npm ci`, `npm run check`, `npm test`, and `npm run build:server`. The `server-dist/` server bundle includes the public site, backend, admin and supplied assets. Run `npm ci --omit=dev` inside the deployed bundle.
3. Mount persistent storage outside the replaceable release directory. Set production environment variables, exact HTTPS origin, database/media paths and `HOST=0.0.0.0`. For S3, create a private bucket and server credentials limited to the required object access.
4. Set `PERSISTENT_DATA_CONFIRMED=true` after verifying the mounts survive redeploys. Configure `TRUST_PROXY` only for the actual trusted proxy topology.
5. Run `npm run admin:create` in the deployment environment, using the production database path. Start using `npm start` under the host's process supervisor. Visit `/admin` over HTTPS and verify uploads survive restart/redeploy.
6. Schedule database and media backups. Stop the application before copying the SQLite database (including any WAL files), or use a proper SQLite online backup. Back up the media directory or enable bucket versioning/backups. Restore database and matching media together; test recovery on a separate instance.

Hosting, domain/TLS, persistent volumes or bucket, production secrets, backup scheduling and your actual administrator password must be configured by the owner. They have not been provisioned automatically. Local test accounts are isolated and do not become production accounts. Build output never copies live data, `.env`, sessions or credentials.

## Verification

```sh
npm run check
npm test
npm run build
```

`check` syntax-checks application, backend, admin, scripts and tests. This JavaScript project has no TypeScript compiler or separate lint configuration. API tests use an isolated database and cover authentication/authorization, CSRF, rate limits, draft boundaries, uploads, slug uniqueness, escaped content, replacement, gallery associations/reorder, deletion protection, homepage publication, expiry and logout.

With a local Chrome debugging session on port 9222, run `node scripts/admin-browser-check.mjs`. It creates an isolated test server on 5198 and a random temporary administrator. It drives login ? draft event ? poster and bulk gallery upload ? private preview ? publish ? automatic public event page ? completed/past events ? image replacement ? homepage change. It also verifies reordering, protected deletion, session expiry preserving editor text, logout and all admin pages at 320/390/768/1440px. It never changes real club content.

With the normal server on 5173, `node quality-check.mjs` verifies public layouts, event tabs, spotlight, art-form interactions, gallery filters/lightbox/keyboard/touch swipe, menu, reduced motion, image loading, console and layout stability. Browser checks are local Chromium verification, not a cross-browser or physical-device certification. Test data and screenshots are ignored by Git.
