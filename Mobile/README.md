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

## Phone ayah notifications

The app uses Firebase Cloud Messaging for alerts. Register the Android app in Firebase with application ID `com.example.project`. If you build for iOS, register the matching iOS bundle ID and enable Push Notifications and Background Modes (Remote notifications) in Xcode, then upload an APNs authentication key to the Firebase project.

Pass the Firebase client settings from the Firebase project to Flutter as build-time defines. These are client app identifiers; keep the service account only on the backend:

```powershell
flutter build apk `
  --dart-define=FIREBASE_API_KEY=<firebase-api-key> `
  --dart-define=FIREBASE_MESSAGING_SENDER_ID=<sender-id> `
  --dart-define=FIREBASE_PROJECT_ID=<project-id> `
  --dart-define=FIREBASE_ANDROID_APP_ID=<android-app-id>
```

For iOS, pass `FIREBASE_IOS_APP_ID=<ios-app-id>` and set `FIREBASE_IOS_BUNDLE_ID` to the exact bundle ID registered in Firebase (currently `com.example.project`).

For production, set `FIREBASE_PROJECT_ID` and the sensitive `FIREBASE_SERVICE_ACCOUNT_JSON` backend environment variable, then redeploy the API. The service account JSON must be stored on one line. In the app, open Notifications and enable phone notifications; Android 13 and newer and iOS will ask for notification permission. Tapping an alert opens the latest featured ayah. Phone push requires the Firebase client settings, a deployed backend with the service account configured, and permission from the user.
