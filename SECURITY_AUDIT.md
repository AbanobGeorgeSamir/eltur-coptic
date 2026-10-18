# Security audit and recovery record

**Reviewed:** 2026-10-19  
**Scope:** repository code, locally available test suites, Git history reachable in this checkout, and the MongoDB connection configured for the backup run. Vercel, Atlas, mobile store, and production log consoles were not available for inspection.

## Dependency refresh follow-up (2026-10-19)

- Node package manifests now require Node.js `24.x`; Vercel supports that LTS line and rolls out patch updates. Dependency checks and npm tests/builds were run with Node **24.21.0**. The workstation's system `node.exe` remains **24.11.0**.
- `npm outdated` returned no outdated packages in `backend/`, `frontend/`, or `Mobile/backend/`. The frontend `lucide-react` range and lock entry were advanced to **1.59.0**. Backend package versions were already current within their declared ranges.
- Flutter direct dependencies were current. `flutter pub upgrade --major-versions` updated `shared_preferences_android` to **2.5.0** and `shared_preferences_foundation` to **2.6.0**. Pub still reports newer transitive releases for `cross_file`, `material_color_utilities`, `cli_util`, and `test_api` as unresolvable under the current upstream/Flutter SDK constraints; no dependency overrides were added.
- Android build tooling is **AGP 9.4.0**, **Gradle 9.7.0**, and **Kotlin Gradle Plugin 2.4.21**. The Android debug APK built successfully with this toolchain.
- After the refresh, both npm audits reported zero vulnerabilities; backend and frontend tests passed (26 and 4), Flutter tests passed (10), Flutter analysis was clean, and the frontend production build succeeded. Frontend lint completed with existing React hook warnings.

## Implemented

- **Sessions and authorization:** protected API requests reload the user and role from MongoDB; browser-provided role/permission fields are not authorization inputs. Session versions are checked on requests, and logout increments the version to revoke outstanding sessions. Browser sessions use HttpOnly cookies with production Secure/SameSite settings and CSRF checks. Native clients use platform secure storage. Passwords use salted scrypt. MongoDB queries enforce the applicable grade, meeting-group, owner, and parent-approval scopes; MongoDB does not provide SQL-style row-level security.
- **CORS, rate limits, and scheduled endpoint:** CORS allows only configured application origins. Production rate-limit counters are stored in MongoDB with TTL cleanup and work across serverless instances; limiter identifiers are HMAC-obscured. The scheduled maintenance route requires the configured `CRON_SECRET` and compares it safely. There are no third-party webhook routes in this API, so webhook signature verification is not applicable to current endpoints.
- **Errors and logs:** clients receive safe error messages. Unexpected server errors are logged with only error name and HTTP method; request paths, stack traces, request bodies, tokens, and exception messages are omitted. Startup failures also avoid printing exception details.
- **Validation and uploads:** existing route schemas and business checks validate input; media uploads are administrator-only, limited to 5 MB, checked by file signature, assigned generated object IDs, and reject unsupported file content. The current upload feature serves shared ministry content with public media URLs. It has no private-file workflow or private storage bucket.
- **Secrets:** `.env` files, encrypted database archives/keys, and common mobile signing/Firebase secret files are ignored by Git. A pattern scan of Git history reachable from local refs found no matching credential patterns; only `.env.example` files are tracked among the secret-like filenames checked. No credentials were rotated because the scan found no exposure. This is not a provider-side inventory or a guarantee against every secret format.
- **Ayah update notifications:** administrator updates save the featured ayah and a uniquely keyed event in one MongoDB transaction. A repeated request ID is idempotent; unchanged content does not create another notification. Authenticated users can read their inbox and manage the ayah-update preference. Mobile inbox entries open the current updated ayah.
- **Database recovery:** `backend/DATABASE_BACKUP.md` documents encrypted backup and isolated restore. Backups are compressed and AES-256-GCM encrypted; the random key is protected with Windows DPAPI for the current Windows user. The script verifies restored counts and rebuilds indexes.

## Verification performed

- Created an encrypted backup of the configured remote `eltor_coptic` MongoDB database on **2026-10-18 21:29:58 UTC**. The archive and DPAPI-protected key are outside the repository under `%LOCALAPPDATA%\EltorCoptic\backups`. The remote database's identity as the production source was not independently confirmed from an infrastructure console.
- Restored that archive into a separate temporary local MongoDB replica-set environment: **13 collections and 54 documents** restored, count checks passed, and indexes were rebuilt. Started the API against the restored database; `/api/health` and `/api/featured-verse` both returned HTTP 200. The temporary restore instance was removed after the check.
- `backend`: `npm test` passed, **26 tests**. Additional MongoDB integration checks verified transactional ayah update/inbox delivery, preference opt-out, duplicate replay, student authorization denial, and shared rate limits across two limiter instances (10 accepted, next request HTTP 429).
- `frontend`: **4 tests passed**; lint completed with existing React hook warnings; production build completed with existing dynamic-import warnings.
- `Mobile`: **10 Flutter tests passed** and `flutter analyze` reported no issues. The notification screen test confirms tapping an inbox entry opens the updated ayah content.
- `npm audit --audit-level=high` reported no high/critical vulnerabilities for backend or frontend packages. An OSV batch scan of the refreshed lockfile's **112 resolved hosted Pub packages** reported no known vulnerabilities.
- History and built-frontend scans found no matching private-key/API-token patterns, Mongo connection strings, or server-only secret names in tracked history or generated frontend assets. These were pattern scans, not credential-provider scans.

## Remaining risks and follow-up

1. **Choose and deploy an identity provider.** The application still uses its own scrypt password verifier and JWT sessions rather than a managed, independently reviewed identity provider. Selecting a provider, configuring its domains/keys, and migrating existing accounts requires an operational decision and provider credentials. Until then, keep the current login endpoints rate-limited and monitor abuse.
2. **Enable background mobile push.** The implemented notification is a durable, preference-aware in-app inbox. Firebase Cloud Messaging or another push provider is not configured, so users do not receive OS notifications while the app is closed. Add provider credentials/token registration, delivery retries, and a tap-through test on real devices to complete that part of the requested flow.
3. **Confirm production recovery controls.** Repository access cannot verify Atlas snapshot/PITR schedules, retention, restore permissions, or network/database-user policies. Confirm them in Atlas and run a managed restore into a separate cluster. The tested portable backup is not point-in-time consistent during concurrent writes; Atlas snapshots/PITR should be the production recovery source. Copy the archive and DPAPI key to an approved protected offsite location; the key cannot be opened by a different Windows account or installation.
4. **Confirm storage classification.** Existing uploaded ministry media is publicly readable by design. Keep private or personal documents out of this feature. If private uploads are required, add a private bucket, server-side authorization, short-lived signed download URLs, content scanning, and access tests before use.
5. **Complete deployment-side checks.** Review Vercel environment variables and production logs, confirm exact allowed origins and TLS/network restrictions, and perform role-based tests against a staging deployment. No webhook endpoint currently exists; any future webhook must require signature, timestamp/expiry, and replay protection before processing.
6. **Review account and data operations.** Registration currently does not require phone verification. Validate the business need and add an appropriate verification/abuse control if unverified accounts are not acceptable. Plan a provider migration before disabling the current credential store.

## Runbooks

- Backup and restore: [backend/DATABASE_BACKUP.md](backend/DATABASE_BACKUP.md)
- Backend security and deployment details: [backend/README.md](backend/README.md)
