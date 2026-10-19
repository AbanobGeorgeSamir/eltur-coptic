# Eltor Coptic API

Node.js/Express API for the Eltor Coptic Sunday school and church service. MongoDB stores accounts, attendance, confession dates, lessons, tasks, quizzes, newsletters, and gallery entries.

## Local setup

1. Install Node.js 24.x LTS and run `npm ci` for a reproducible install.
2. Copy `.env.example` to `.env`.
3. Set `MONGODB_URI` to a MongoDB Atlas connection string, `JWT_SECRET` to a random secret of at least 32 characters, and `DB_NAME=eltor_coptic`.
4. Set `FRONTEND_URL` or `CLIENT_ORIGIN` to the frontend origin, then run `npm start`.

The API connects to `DB_NAME` (default `eltor_coptic`), regardless of the database path in the MongoDB URI. `npm test` runs syntax and HTTP/configuration tests without needing a live database. `npm run check:db` separately verifies the configured MongoDB connection.

## Authentication and accounts

- `POST /api/auth/register` creates a student account directly, without phone verification. Required fields: four-part `name`, a valid `grade` (`primary_1_3`, `primary_4_6`, `preparatory`, `secondary`, `university`, or `expatriates`), at least one interest (up to 500 characters), international `phone`, `password`, `fatherName`, `confessionFather`, `guardianPhone`, `address`, `birthDate`, `gender` (`male` or `female`), 14-digit `nationalId`, and `privacyAccepted: true`. If the selected grade has active meeting groups, `meetingGroup` is required. A no-space `.com` `email` is optional. `picture`, `isDeacon`, and `whatsappNumber` are supported.
- `POST /api/auth/parents/register` creates a pending parent account when a student's guardian phone matches the parent phone. A church administrator must verify the request and approve each linked student before family data is visible.
- `POST /api/auth/login` accepts `{ "name": "<username or email>", "password": "...", "grade": "<grade id>" }`. The website and mobile app require a grade selection for students and verify it against the stored profile. Use `grade: "legacy"` for an older student account that has no grade yet, or `grade: "other"` for a parent or administrator; these selections never change the stored grade or role. The API still accepts requests without `grade` for older client compatibility, and account permissions/content always come from the stored role and grade. Browser sessions use an HttpOnly, Secure, SameSite cookie; native bearer tokens are stored with platform secure storage. Sessions expire after 30 days and logout increments a server-side session version, revoking outstanding tokens for that account.
- Passwords use salted scrypt hashes with explicit cost parameters. Existing hashes are verified and upgraded to the current cost after the user's next successful login. Browser tokens are not kept in local storage; native bearer tokens are stored with the mobile platform's secure storage.
- `PATCH /api/users/me` edits a student's profile. An existing student without a grade can select one once here. Administrators can edit students in their scope through `PATCH /api/students/:id`.
- The `admin` role is the public administrator. It manages all study groups, meeting groups, and administrators. The web Admin Access page assigns one of six distinct roles to stage administrators: `admin_primary_1_3`, `admin_primary_4_6`, `admin_preparatory`, `admin_secondary`, `admin_university`, and `admin_expatriates`. The API permits only one active administrator per stage, and each can be scoped to its whole group or one meeting group. Stage administrators can only access users, content, activities, and results inside their assigned group. Student role selection is never accepted from registration input. On API connection, existing `grade_admin` accounts for the six new groups are migrated to their matching role; accounts still assigned to the former `primary` group remain supported.
- `npm run make-admin -- user@example.com` assigns the global `admin` role to a previously registered account during initial setup. Do not use it to create grade administrators.

## Ministry API

All listed routes are under `/api`; protected routes accept a bearer token from native clients or the HttpOnly browser session cookie. Unsafe cookie-authenticated browser requests must include an allowlisted `Origin` and `X-Requested-With: XMLHttpRequest`.

| Feature | Routes |
|---|---|
| Grades and meeting groups | `GET /grades`, `GET /meeting-groups?grade=...` (public registration choices), `GET/POST/PATCH /admin/meeting-groups` (admin) |
| Administrators | `GET/POST /administrators`, `PATCH /administrators/:id` (public administrator only) |
| Student groups | `GET /students`, `GET /students/unassigned`, `POST /students/:id/assign`, `PATCH /students/:id` (scoped admin) |
| Attendance | `GET /attendance`, `POST /attendance` (admin; one record or `{ "records": [...] }`) |
| Last confession | `GET /confessions`; students can submit their own date and admins can record dates for assigned students with `POST /confessions` |
| Bible, psalm, Agpeya, Sunday lessons, liturgy, newsletter, gallery | `GET /ministry/posts?type=...` (optional `page`/`limit`, max 30; use `upcoming=1` for dated liturgies), `POST/PATCH/DELETE /ministry/posts` (admin) |
| Tasks | `GET /tasks`, `POST /tasks` (admin; provide `studentIds`), `PATCH /tasks/:id/complete` (assigned student) |
| MCQ quizzes | `GET /quizzes`, `POST /quizzes` (admin), `POST /quizzes/:id/submit` (student), `GET /quiz-attempts` (own student attempts), `GET /quizzes/:id/results` (owner admin) |
| Parent view | `GET /parents/dashboard` (verified parent; linked by verified guardian phone) |
| Contact/privacy/download | `GET /contact`, `GET /privacy-policy`, `GET /mobile-app/download` |
| Ayah notifications | `GET /notifications`, `GET/PATCH /notification-preferences`, `POST/DELETE /push-token`; mobile inbox and phone alerts open the latest featured ayah |

The API applies grade and meeting-group filters and validates each write; web route visibility is not the security boundary. Student sessions only receive content and grade-group activity matching their registration scope. Parent accounts only see student records explicitly approved by an administrator. Older group posts, group tasks, and quizzes without an `audienceMode` are hidden from students until the public administrator reviews and saves an audience in the web management pages. Individual tasks remain visible only to their assigned student. MongoDB does not provide the row-level security model used by some SQL services; equivalent access checks are applied in server-side queries and write handlers.

## Vercel deployment

Import this repository as a separate Vercel project with `backend` as its Root Directory and select Node.js 24.x. Vercel uses `vercel.json` to route requests to the Express serverless function. Set these variables in the backend Vercel project's Environment Variables:

```text
MONGODB_URI=<your MongoDB Atlas connection string>
DB_NAME=eltor_coptic
JWT_SECRET=<random secret with at least 32 characters>
CRON_SECRET=<random secret with at least 16 characters>
FIREBASE_PROJECT_ID=<Firebase project ID>
FIREBASE_SERVICE_ACCOUNT_JSON=<service account JSON on one line>
FRONTEND_URL=https://eltur-coptic.vercel.app
CLIENT_ORIGIN=https://eltur-coptic.vercel.app
```

The Firebase service account must be allowed to send Firebase Cloud Messaging messages in the configured project. Store the JSON value as a sensitive backend environment variable; never put it in the Flutter app. The API registers signed-in devices at `POST/DELETE /api/push-token` and sends a push after a changed featured ayah is saved. Users who disabled ayah notifications are skipped. Without the Firebase variables, ayah updates and the in-app notification inbox continue to work, but no phone push is sent.

Use an Atlas network access rule that allows only the required Vercel connections and a database user scoped to the `eltor_coptic` database. Production MongoDB connections must use TLS. Set `CRON_SECRET` as a sensitive Vercel environment variable; the scheduled maintenance route uses a timing-safe secret comparison and rejects requests if it is unset. The production frontend origin is also included in the backend's exact CORS allowlist. Production rate-limit buckets are stored in MongoDB with HMAC-obscured keys and TTL cleanup so limits are shared across serverless instances. Configure Vercel Firewall as an additional perimeter control.

There are no third-party webhook endpoints in this API. The scheduled maintenance endpoint is authenticated with `CRON_SECRET`. The WhatsApp contact link defaults to `201223153437` (the international format for `01223153437`). Set `WHATSAPP_NUMBER` to override it and `MOBILE_APP_DOWNLOAD_URL` to an HTTPS-hosted app package. The backend does not contain a web/mobile frontend or build executable files; an actual mobile app binary must be built and hosted separately before its download endpoint can be enabled. A Windows `.exe` is not an installable Android/iOS app.

## Data handling

Student profile data includes personal identifiers and guardian contact information. Limit production administrator access, configure MongoDB backups and access controls, and use HTTPS. Uploaded images and PDFs are admin-only on upload, limited to 5 MB, identified by file signature, and stored with generated ObjectIds. Their media URLs are publicly readable because the current upload feature serves shared ministry posts; upload only files explicitly approved for public viewing. The app currently has no private-file workflow or private storage bucket. Ayah push alerts are preference-aware and are sent through Firebase Cloud Messaging when the backend Firebase service account is configured.

See [DATABASE_BACKUP.md](DATABASE_BACKUP.md) for the encrypted backup and isolated restore procedure. Production deployments should also enable Atlas automated backups or point-in-time recovery.

The current app uses its own salted scrypt password verifier and signed API sessions. Server authorization reloads the user and role from MongoDB for each protected request; browser-supplied IDs and roles are not authorization inputs. This is not a third-party identity provider. Moving existing accounts to a managed provider requires selecting the provider, configuring credentials/domains, and planning account migration; no provider credentials are present in this repository.
