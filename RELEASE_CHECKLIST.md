# Release Checklist

## Current Status

- Web app has Capacitor config but native `ios/` and `android/` projects must exist before App Store or Google Play submission.
- Admin access is now gated by stored Firestore role plus `VITE_ADMIN_EMAILS`, but real protection still depends on Firestore security rules.
- Gemini integration has been removed from the client release.

## Required Environment

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_ADMIN_EMAILS` with the exact production admin emails.
3. Optionally move Firebase config to `VITE_FIREBASE_*` values for environment-specific releases.

## Backend Security Before Release

1. Firestore rules must block normal users from writing admin-only fields and collections.
2. Only allow approved admins to:
   - delete products
   - bulk delete products
   - approve or reject submissions
   - edit company-wide metadata
3. User profile documents should not let clients self-assign `role: "admin"`.
4. If possible, set admin role via Firebase Admin SDK custom claims or a trusted backend process.

## App Store / Play Store Readiness

1. Run `npm install`.
2. Run `npm run build`.
3. Run `npx cap add ios` and `npx cap add android` if native projects do not exist yet.
4. Run `npx cap sync`.
5. In iOS:
   - add camera usage description in `Info.plist`
   - add app icons and launch assets
   - verify privacy manifest requirements for included SDKs
   - verify signing, bundle identifier, version, build number
6. In Android:
   - verify camera permission in `AndroidManifest.xml`
   - configure adaptive icons
   - verify package name, versionCode, versionName, signing
   - complete Play Console Data safety form

## Functional QA

1. Test login, email verification, logout, password reset.
2. Test camera capture on real iPhone and Android devices.
3. Test manual submission, camera capture, and non-AI flows on real devices.
4. Test duplicate resolution and bulk delete with admin account.
5. Test offline/slow-network behavior and error messages.

## Submission Assets

1. Privacy Policy URL.
2. Support URL.
3. App screenshots for all required form factors.
4. Age rating answers.
5. Data collection disclosures for:
   - account email
   - uploaded product images
   - analytics events if enabled
