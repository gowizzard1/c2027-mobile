# IKM Campaign Team Mobile

Expo React Native application for authenticated Campaign Team members.

## Roles supported

- Social Media Team: campaign group, native sharing, approved share content
- Mobilizer Team: ward details, coordination group, aggregate weekly field reports
- Polling Agent Team: official station assignment, counted-result form with camera/gallery evidence upload
- All approved team members: account-level mobile-data support requests

## Setup

```bash
cd mobile
cp .env.example .env
npm start
```

Set the Railway backend URL in `.env`:

```text
EXPO_PUBLIC_API_URL=https://c2027-backend-production.up.railway.app
```

Run on a device/emulator:

```bash
npm run android
npm run ios
```

## Authentication

Team members activate their account through the existing campaign invite link on the web, then use the same email/password in the mobile app. The device token is stored in Expo SecureStore, not AsyncStorage.

## Production requirements

- Deploy the current multi-role account backend first.
- Configure private R2/S3 storage before Polling Agent result-form photo uploads can work.
- The app communicates directly with Railway, so `EXPO_PUBLIC_API_URL` must be the public Railway backend origin, without `/api` appended.

## Security notes

- Never embed admin or S3 credentials in the mobile app.
- Polling form evidence is submitted only to the protected backend API and remains admin-only.
- Public results remain web-only and include verified reports only.

## Build and publish Android APK

Install and sign in to EAS:

```bash
npm install -g eas-cli
eas login
```

Create an internally distributable Android APK:

```bash
cd mobile
eas build --platform android --profile preview
```

When the build completes, download the `.apk` artifact from the Expo build link.

Then publish it through the web admin:

```text
Admin → Mobile App
→ choose Android APK
→ upload compiled .apk
→ enter version and release notes
→ Publish release
→ Activate
```

The public app page is:

```text
https://www.maiywa.site/app
```

Only an active Android release appears as a download button there.

For iOS, build with EAS and publish through TestFlight/App Store, then add its TestFlight/App Store URL in the same Admin → Mobile App screen.
