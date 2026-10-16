# Eltor Coptic mobile app

Flutter client for the shared Eltor Coptic API. The app does not connect to MongoDB directly and contains no local sample-data fallback.

## Run locally

Start the backend first and configure `backend\.env` with `MONGODB_URI`, `DB_NAME`, and `JWT_SECRET`. Then run:

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api
```

`10.0.2.2` is only for Android emulators. For a physical phone on this computer's Wi-Fi, run `./run_on_phone.ps1`; it checks the local API and uses the computer's active LAN address. The app defaults to the deployed API at `https://eltur-coptic-api-server.vercel.app/api`, so production builds connect without extra setup. Override that address at build time when needed:

```powershell
flutter build apk --dart-define=API_BASE_URL=https://eltur-coptic-api-server.vercel.app/api
```

Production API URLs must use HTTPS and the app rejects redirects so its bearer token cannot be forwarded to another host. The Android app requires API 23 or newer. Session tokens are stored with the platform secure-storage plugin; the cached profile contains only the fields needed to render the session.

For a signed Android release, create `Mobile/android/key.properties` locally with `storeFile`, `storePassword`, `keyAlias`, and `keyPassword`. Keep that file and its keystore out of source control. Without signing properties, Gradle does not reuse the debug key for a release.

On Windows, Flutter may require Developer Mode (or another symlink-enabled setup) before `flutter pub get` can finish installing plugin packages. The API endpoint should be configured through `--dart-define=API_BASE_URL=...`; keep the MongoDB connection string exclusively in `backend\.env`.
