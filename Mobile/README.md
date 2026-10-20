# Eltor Coptic mobile app

Flutter client for the shared Eltor Coptic API. The app does not connect to MongoDB directly and contains no local sample-data fallback.

## Run locally

Start the backend first and configure `backend\.env` with `MONGODB_URI`, `DB_NAME`, and `JWT_SECRET`. Then run:

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api
```

`10.0.2.2` is only for Android emulators. For a physical phone, run `./run_on_phone.ps1`; it uses the deployed API at `https://eltur-coptic-api-server.vercel.app/api` by default. To use a local backend, pass its LAN address, for example `./run_on_phone.ps1 -ApiBaseUrl http://192.168.1.7:8000/api`. Production builds also default to the deployed API; override the address at build time when needed:

```powershell
flutter build apk --dart-define=API_BASE_URL=https://eltur-coptic-api-server.vercel.app/api
```

Production API URLs must use HTTPS and the app rejects redirects so its bearer token cannot be forwarded to another host. The Android app requires API 23 or newer. Session tokens are stored with the platform secure-storage plugin; the cached profile contains only the fields needed to render the session.

For a signed Android release, create `Mobile/android/key.properties` locally with `storeFile`, `storePassword`, `keyAlias`, and `keyPassword`. Keep that file and its keystore out of source control. Without signing properties, Gradle does not reuse the debug key for a release.

On Windows, Flutter may require Developer Mode (or another symlink-enabled setup) before `flutter pub get` can finish installing plugin packages. The API endpoint should be configured through `--dart-define=API_BASE_URL=...`; keep the MongoDB connection string exclusively in `backend\.env`.

## Phone ayah notifications

The app uses Firebase Cloud Messaging for immediate alerts when Firebase is configured. On Android, it can still show ayah update notifications without Firebase: after notification permission is granted in the Notifications screen, WorkManager checks the public featured-ayah endpoint while the app is in the background. Android permits periodic work at intervals of 15 minutes or longer and may defer a check to conserve battery, so this fallback is not immediate.

Pass the Firebase client settings from the Firebase project to Flutter as build-time defines. These are client app identifiers; keep the service account only on the backend:

```powershell
flutter build apk `
  --dart-define=FIREBASE_API_KEY=<firebase-api-key> `
  --dart-define=FIREBASE_MESSAGING_SENDER_ID=<sender-id> `
  --dart-define=FIREBASE_PROJECT_ID=<project-id> `
  --dart-define=FIREBASE_ANDROID_APP_ID=<android-app-id>
```

For iOS, pass `FIREBASE_IOS_APP_ID=<ios-app-id>` and set `FIREBASE_IOS_BUNDLE_ID` to the exact bundle ID registered in Firebase (currently `com.example.project`).

For immediate push in production, set `FIREBASE_PROJECT_ID` and the sensitive `FIREBASE_SERVICE_ACCOUNT_JSON` backend environment variable, then redeploy the API. The service account JSON must be stored on one line. In the app, open Notifications and enable phone notifications; Android 13 and newer and iOS will ask for notification permission. Tapping an alert opens the latest featured ayah. Without Firebase, the Android background check is best effort and may be delayed by Android battery management; iOS background alerts still require Firebase push configuration.
