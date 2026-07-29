# Publishing — App Store + Google Play

Runbook for getting `ebril` live on both stores. The app is a Capacitor hybrid
wrap pointing at the hosted Next.js backend at `https://rewards.ebril.com`. The
same server handles Patreon OAuth, Stripe, cron jobs, and all API routes — the
native shell is a trusted webview into that experience with splash, status bar,
and safe-area handling.

## 0. Prerequisites

- Apple Developer Program membership (`$99/yr`, individual or company).
- Google Play Developer account (`$25` one-time).
- A Mac with Xcode 15+ and an iOS simulator.
- A machine with Android Studio Hedgehog+ and an Android emulator.
- Node 20+, `cocoapods` (`brew install cocoapods`).
- Our hosted backend live at a stable domain (default `rewards.ebril.com`).

## 1. First-time local setup

```bash
npm install
npx cap add ios
npx cap add android
```

Both commands generate `ios/` and `android/` folders at the repo root. Commit
them to git — they are the source of truth for the native projects.

Then open each once so the platform does its initial configuration:

```bash
npm run mobile:open:ios
npm run mobile:open:android
```

## 2. Icons + splash

1. Drop the licensed source image at `docs/store-assets/artist-source.png`
   (min 2732×2732, center-safe composition, warm color grade).
2. Generate all icon/splash sizes:

   ```bash
   npx @capacitor/assets generate \
     --assetPath docs/store-assets \
     --iconBackgroundColor "#15100E" \
     --iconBackgroundColorDark "#15100E" \
     --splashBackgroundColor "#15100E" \
     --splashBackgroundColorDark "#15100E"
   ```

   The tool reads `icon.png` + `splash.png` from `docs/store-assets/` and writes
   into `ios/App/App/Assets.xcassets/` and `android/app/src/main/res/`. If we
   only drop `icon.png`, Capacitor will generate a centered splash on the brand
   background automatically.

3. Run `npm run mobile:sync` to propagate changes.

> The repo ships `docs/store-assets/icon.svg` as a procedural fallback (warm
> dusk gradient + crescent + lowercase wordmark). It's safe to ship v1 with
> this if licensed photography isn't cropped yet — rasterize it with
> `rsvg-convert -w 1024 icon.svg > docs/store-assets/icon.png` or equivalent.

## 3. Server URL + production build

```bash
# .env before building
APP_BASE_URL=https://rewards.ebril.com

npm run build                 # builds the Next.js web app
npm run mobile:sync           # copies web assets + config into native projects
```

`capacitor.config.ts` reads `APP_BASE_URL` and wires the native shell to load
our hosted backend. Keep it pointed at production for release builds; flip to
`staging.rewards.ebril.com` for TestFlight and Play internal testing.

## 4. iOS submission

1. Open Xcode: `npm run mobile:open:ios`.
2. In the project settings:
   - Team: ebril's Apple Developer team.
   - Bundle identifier: `com.ebril.rewards`.
   - Version / build: bump for each submission.
   - Signing: let Xcode manage (or use Match/fastlane if the team has it).
3. Capabilities:
   - Associated Domains (for universal links): `applinks:rewards.ebril.com` if we
     ever want deep links from SMS/email.
   - Push Notifications (APNs) — off for v1; re-enable when we ship a native
     push path beyond web push.
4. `Product → Archive` → `Distribute App` → `App Store Connect`.
5. In App Store Connect:
   - Fill in metadata from `docs/store-listing.md`.
   - Upload screenshots (see `docs/icons-and-screenshots.md` for exact sizes).
   - Fill the privacy nutrition label per the same doc.
   - Add the reviewer notes (also in store-listing.md).
   - Submit for review.

Review times are 1–3 days normally, longer on first submission. Common
rejections to pre-empt:

- **Guideline 3.1.1 (IAP).** Hide `/points/buy` from the native build or
  implement StoreKit before submitting. See "In-app purchases" in store-listing.
- **Guideline 4.2 (minimum functionality).** The diary + rituals + rewards loop
  already satisfies this; if a reviewer pushes back, point them at the ritual
  flow specifically.
- **Guideline 5.1.1 (privacy).** Privacy policy URL must be live, not a stub.

## 5. Android submission

1. Open Android Studio: `npm run mobile:open:android`.
2. `Build → Generate Signed Bundle / APK → Android App Bundle`.
3. First run: create a keystore. **Back up the keystore and password in
   1Password immediately.** Losing it means losing the ability to update the app
   on Play without an account reset.
4. Upload the `.aab` at Play Console → Production → Create new release.
5. Fill the listing from `docs/store-listing.md`.
6. Complete the Data Safety form (see store-listing.md for the answers).
7. Request production review. Play review is usually 1–7 days on first
   submission.

## 6. After publishing

- Monitor crash rate. Capacitor rolls up Objective-C + Android crashes — add
  Sentry on the web layer to catch JS errors that bubble up.
- Watch review sentiment, especially around the Patreon sign-in flow — that is
  the most likely friction point.
- Ship updates via the same `build → cap sync → archive/build → upload` loop.
  There is no over-the-air content update needed because the native shell
  points at the hosted web app; any content or UI change we ship to the server
  reaches users the next time they open the app. Native shell updates are only
  required for plugin changes, version bumps, or store-metadata changes.

## 7. Rollback

- iOS: in App Store Connect, set a prior build to "Available for sale" and
  expedite via App Review if a regression ships to fans.
- Android: promote a prior release from Internal → Production.
- Web: same git branch, `vercel rollback` or equivalent. Because the native
  shell is a webview, web rollback reaches everyone instantly.
