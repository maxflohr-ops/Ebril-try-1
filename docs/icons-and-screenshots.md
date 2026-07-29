# Icons + screenshots — asset spec

Drop licensed photography into `docs/store-assets/` and `public/assets/`. The
paths below are what `@capacitor/assets` and the store listing expect.

## Source icon

- Path: `docs/store-assets/icon.png`
- Size: **1024×1024** (exact).
- Format: PNG, sRGB, no alpha, no rounded corners (the OS applies the shape).
- Composition: subject centered, ≥12% safe margin. iOS applies an 18% corner
  radius; Android applies an adaptive-icon circle mask to the inner 66%.
- Color grade: warm-black background (`#15100E`), desaturate skin tones by ~8%,
  lift shadows +10, gentle peach wash. Nothing neon, nothing high-contrast.

> A procedural fallback ships at `docs/store-assets/icon.svg` — rasterize with
> `rsvg-convert -w 1024 docs/store-assets/icon.svg > docs/store-assets/icon.png`
> if a licensed photo isn't cropped yet.

## Source splash

- Path: `docs/store-assets/splash.png`
- Size: **2732×2732** (exact; square).
- The safe zone is the center 1200×1200. Everything outside that will be
  cropped on narrow devices.
- If omitted, Capacitor centers the icon on the brand background — acceptable
  for v1.

## Generate platform assets

```bash
npx @capacitor/assets generate \
  --assetPath docs/store-assets \
  --iconBackgroundColor "#15100E" \
  --iconBackgroundColorDark "#15100E" \
  --splashBackgroundColor "#15100E" \
  --splashBackgroundColorDark "#15100E"
```

Commit the outputs under `ios/App/App/Assets.xcassets/` and
`android/app/src/main/res/`.

## Favicons + PWA icons (web)

Drop the matching PNG sizes into `public/`:

- `public/icon-192.png` — 192×192, maskable safe zone.
- `public/icon-512.png` — 512×512, maskable safe zone.
- `public/favicon.ico` — 32×32 + 16×16 multi-res.
- `public/apple-touch-icon.png` — 180×180.

These are already referenced by `public/manifest.webmanifest` and the
`app/layout.tsx` metadata.

---

## Store screenshots

Each store demands specific aspect ratios. The same artwork can be exported at
multiple sizes — just respect the safe zones.

### App Store Connect (required)

Upload five to ten per device. iOS will downsample larger ones.

| Device family     | Size            | Notes                                 |
| ----------------- | --------------- | ------------------------------------- |
| 6.7" iPhone       | 1290 × 2796 px  | Current flagship — required.          |
| 6.5" iPhone       | 1284 × 2778 px  | Required if the 6.7" isn't uploaded.  |
| 12.9" iPad Pro    | 2048 × 2732 px  | Required only if we ship to iPad.    |

### Google Play

| Asset              | Size             | Notes                              |
| ------------------ | ---------------- | ---------------------------------- |
| Phone screenshots  | 1080 × 1920 px   | 2–8 images. We use 5.              |
| Feature graphic    | 1024 × 500 px    | Required. Artist + wordmark.       |
| Icon               | 512 × 512 px     | Same source as iOS icon.           |

### Suggested screenshot sequence (both stores)

Write the overlay copy in Fraunces 500, lowercase, peach (`#D89B7A`) on warm-
black. Each caption lives in the top 20% of the frame.

1. **Home** — balance card mid-animation, tier plum gradient, caption:
   *"a small room for the people who live inside the songs."*
2. **Tonight's ritual** — ritual card mid-scroll with "press play on stranger in
   you" CTA, caption: *"tonight's listening ritual."*
3. **Dusk diary** — composer with `3am` chip selected, a short page in progress,
   caption: *"write what the song did."*
4. **Rewards** — catalog with a signed piece, a content unlock, and a call card.
   Caption: *"a shelf of things i made for you."*
5. **Find me** — FindMeCard with all platforms visible, caption:
   *"one tap to where i live."*

Put screenshots at `docs/store-assets/screens/ios-6.7/01-home.png` etc., then
upload directly to App Store Connect + Play Console. Don't check the full
2732-tall versions into git — commit a thumbnail only.

---

## Press photography drop slot

- Path: `public/assets/artist/press-01.jpg` (hero), `press-02.jpg` …
- Recommended: 2000px on the long edge, JPEG quality 82, sRGB, embedded
  copyright metadata.
- **Required metadata fields** (use `exiftool` or Lightroom):
  - `Credit` — photographer name.
  - `Rights` — license holder (e.g. "Universal Music Canada").
  - `License` — short license string we have rights under.
- Keep a `public/assets/artist/LICENSE.md` alongside the files listing
  photographer / rights / scope per image.

The app does not import these automatically — they are wired in through
`ExternalLink` rows (`kind: "website"` etc.) and by admin-entered reward image
URLs. A future pass can add a `HeroImage` model if we want full photo management
in-app.
