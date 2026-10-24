# Eltor Coptic Ministry

React/Vite web client, Flutter mobile client, and Express/MongoDB API for the church ministry. Both clients use the same backend API; MongoDB credentials stay in the backend and are never embedded in client apps.

## Local setup

Use Node.js 24.x LTS for both the frontend and backend.

1. Configure `backend\.env` from `backend\.env.example`. Set `MONGODB_URI` to the MongoDB connection string, `DB_NAME=eltor_coptic`, a strong `JWT_SECRET`, and the allowed frontend origins.
2. Configure the local web API URL:

   ```powershell
   Copy-Item frontend\.env.example frontend\.env
   ```

   Set `VITE_API_URL=http://localhost:8000/api` for local development. This URL is public configuration, not a database connection string.

3. Start the API and web app in separate terminals:

   ```powershell
   cd backend
   npm ci
   npm start
   ```

   ```powershell
   cd frontend
   npm ci
   npm run dev
   ```

## Mobile client

The Flutter source is in `Mobile/`. It includes the ministry pages and admin tools, and connects to the same API as the web client. The app defaults to `https://eltur-coptic-api-server.vercel.app/api`; you can also pass `--dart-define=API_BASE_URL=...` to override it. For local Android emulator development, run `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api` from `Mobile/`. For a production Android package, run `flutter build apk` from `Mobile/`.

## Grade access and administrators

Students choose one of six study groups during web or mobile registration: primary grades 1–3, primary grades 4–6, preparatory, secondary, university, or expatriates. They also record their interests. Active meeting groups can be configured under **إدارة المراحل والاجتماعات**; registration then requires the student to select one of those groups. Student content, activities, attendance, tasks, quiz results, and confession records are filtered by study group and, where configured, by meeting group in the API.

The `admin` role is the public administrator and can see and manage all six study groups. Each group has a distinct administrator role in the database: `admin_primary_1_3`, `admin_primary_4_6`, `admin_preparatory`, `admin_secondary`, `admin_university`, or `admin_expatriates`. The public administrator assigns one active administrator to each group and can limit that account to a meeting group. A stage administrator can only see and manage data inside its assigned group. These limits are enforced by backend queries and write checks, not only by the web navigation.

Existing students without a grade can select it once from their web profile. Older posts, group tasks, and quizzes without a saved audience are hidden from students until the public administrator reviews and saves an audience; individually assigned tasks remain visible only to their assigned students. The public administrator can re-scope older posts, trips, group tasks, and quizzes from their management pages. New content created by a grade administrator is automatically scoped to that administrator's grade/group. Existing admin accounts and student data are retained; the new Mongoose fields and indexes are created from the schemas when the API connects to MongoDB.

## Verification

```powershell
cd backend
npm test

cd ..\frontend
npm test
npm run lint
npm run build
```

The backend is ready when `http://localhost:8000/api/health` responds with `{"status":"ok","database":"mongodb"}`. In production the web app uses its same-origin `/api` proxy and browser session cookie; leave `VITE_API_URL` unset. Configure the mobile API with `API_BASE_URL` at build time. Never put `MONGODB_URI` or `JWT_SECRET` in either client.

## Deployment

Use two Vercel projects connected to this repository:

| Project | Vercel Root Directory | Production domain | Required settings |
|---|---|---|---|
| Web frontend | `frontend` (recommended), or repository root | `https://eltur-coptic.vercel.app` | With root `frontend`: build `npm run build`, output `dist`. Keep `VITE_API_URL` unset in production so `/api` stays same-origin and can use secure browser cookies. Set `VITE_SITE_URL` to the production website origin for canonical links and the sitemap. If the Root Directory is the repository root, the root `vercel.json` builds `frontend` and applies the SPA route fallback. |
| API backend | `backend` | `https://eltur-coptic-api-server.vercel.app` | Set `MONGODB_URI` (TLS enabled), `DB_NAME=eltor_coptic`, `JWT_SECRET` (at least 32 characters), `CRON_SECRET` (random and sensitive), `FRONTEND_URL=https://eltur-coptic.vercel.app`, and `CLIENT_ORIGIN=https://eltur-coptic.vercel.app`. Add `FIREBASE_PROJECT_ID` and sensitive `FIREBASE_SERVICE_ACCOUNT_JSON` for immediate ayah push alerts; Android also checks for updates in the background when Firebase is not configured. |

The web client defaults to its same-origin `/api` proxy. The backend allows the configured frontend origin and the production frontend domain. Keep `MONGODB_URI` and `JWT_SECRET` only in the backend Vercel project's environment variables. Both `frontend/vercel.json` and the repository-root `vercel.json` route unknown web paths to `index.html`, so direct navigation and refreshing a client-side page work when the web project uses either supported root directory above. Assign each domain to its matching Vercel project and redeploy after changing project settings or environment variables.

Build the mobile app separately from its source in `Mobile/`. The backend's `/api/mobile-app/download` endpoint needs `MOBILE_APP_DOWNLOAD_URL` set to a hosted package before it can serve a download link.

See `backend\README.md` for API routes, account setup, and production data-handling guidance.
See `backend\DATABASE_BACKUP.md` for the encrypted database backup and isolated restore procedure.
"# eltur-coptic" 
"# eltur-coptic" 
"# eltur-coptic" 
"# eltur-coptic" 
"# eltur-coptic" 
"# eltur-coptic" 
"# eltur-coptic" 
"# eltur-coptic" 
"# eltur-coptic" 
"# eltur-coptic" 
"# eltur-coptic" 
"# eltur-coptic" 
"# eltur-coptic" 
