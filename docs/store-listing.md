# Store listing — copula

Submission copy for App Store Connect and Google Play Console. Every string below is
already in her voice (lowercase, unhurried, intimate). Tweak before submission if she
wants to tighten anything; don't auto-translate without her sign-off.

The app is **free**. In-app top-ups (point packs) and merch checkout are optional;
everything core — moments, diary, rituals, voice notes, shows, clipping, rewards at
your earned tier — works without spending a cent.

---

## App name

- **Primary (both stores):** `copula`
- **Full display:** `copula — ebril's world`
- **iOS subtitle (30 chars max):** `ebril's world. come inside.`
- **Google Play short description (80 chars max):** `ebril's world. a small room for the people who live inside the songs.`

## Bundle / package id

- iOS: `com.ebril.copula`
- Android: `com.ebril.copula`

Match these to whatever the team registered in Apple Developer + Play Console.

---

## Long description (App Store + Play Store)

```
copula is ebril's world.

a small room for the people who live inside the songs — journal the ones that hold
you, make clips that carry them, hear the half-minute thoughts she never posts
anywhere else, keep cassettes for the moments you were there.

the app is free. no paywall you can't see around.

moments — short posts from ebril as they come. hold the ones that land.

dusk diary — write what a song made you feel. tag the track. keep it private or
share the page with her. a tiny bonus every day.

rituals — every so often she sets a moment. press play on this song at this hour.
claim it and something warm lands in your balance.

eras + directions — make a clip for a specific creative prompt (she calls them
directions), tag the song, send it. the good ones get held on the in-app wall.
the ones that carry the song past a view threshold earn a bigger thank-you.

voice notes — half-minute audio only inside. tier-gated for patreon supporters.

songs — every track with its own page: lyrics, a note from her, and the streaming
links that open the native spotify / apple / youtube apps on your phone.

shows — where she's playing next. scan the qr on the merch table and she'll know
you were there. points + a cassette keep the night with you.

rewards — the catalog grows. some are for vips only, some open to everyone. you
can also take certain pieces with money when points aren't there yet.

sign in with patreon. that's the only account you need.

— ebril
```

## Keywords (App Store — 100-char comma-separated)

```
ebril,copula,music,fan,diary,indie,folk,ambient,shoegaze,dusk,clipping,community,patreon,merch,concert
```

## Categories

- **Primary:** Music
- **Secondary:** Entertainment

## Age rating

- **iOS:** 4+ (no objectionable content; suitable for all ages)
- **Play:** Everyone

If the diary ever allows UGC beyond a single fan's private entries, revisit — both
stores escalate to Teen+ if users can post public content without moderation.

---

## "What's new" (release notes)

Template — fill with each release:

```
— tonight's ritual now shows your reflection back to you when you open the app.
— small quiet fixes. thank you for staying.
```

---

## Support + marketing URLs

- Marketing: `https://rewards.ebril.com`
- Support: `mailto:support@ebril.com` (or a HelpScout/Linear Portal link once set up)
- Privacy policy: `https://rewards.ebril.com/privacy` — see `docs/privacy-policy.md`
- Terms: `https://rewards.ebril.com/terms` — see `docs/terms.md`

Both URLs must be live and reachable before submission.

---

## In-app purchases (important)

The app uses **Stripe** for point-pack purchases and merch. Apple and Google will
both flag this because their rules require IAP for digital goods consumed inside
the app.

- **App Store:** Point packs that credit in-app currency are treated as digital
  content and must use Apple IAP per Section 3.1.1 of the App Review Guidelines.
  The cleanest path is to either (a) gate point-pack purchases to the web only and
  show a "buy points on ebril.com" link inside the native app, or (b) add
  StoreKit-backed packs in addition to Stripe.
- **Google Play:** Similar rule via Play Billing, but enforcement is softer for
  small creators. Merch redemption is physical goods and is Stripe-exempt.

Recommendation for first submission: hide the `/points/buy` route inside the
native app via a `capacitor.platform` check and surface a "top up on the web"
link instead. Merch (`/shop`) stays — Shopify checkout is a real-world good,
which both stores permit.

---

## Required declarations

### Apple privacy nutrition label

Data collected and linked to identity:

- **Identifiers** — user id, Patreon user id (for sign-in).
- **Contact info** — email (for transactional emails only).
- **User content** — diary entries, reflections on rituals (optional share).
- **Purchases** — redemption history, top-up receipts.
- **Usage data** — analytics events (page views, redemption events) used to
  improve the product.

Data **not** collected: precise location, contacts, browsing history outside the
app, health/fitness, financials beyond what Stripe handles.

### Google Play data safety form

Mirror of the above. Mark data as:

- **Collected + shared?** Patreon id + email are shared with Patreon (for auth).
  Stripe handles payment info and does not hand it back to us in plaintext.
- **Encrypted in transit?** Yes.
- **User can request deletion?** Yes — via `mailto:privacy@ebril.com`. Build an
  in-app delete flow before submission if possible.

---

## Store reviewer notes

Paste this in "App Review Information" on App Store and the equivalent on Play:

```
ebril is a loyalty + community app for fans of the musician ebril.

test account:
- sign in with the "sign in with patreon" button using the sandbox patreon
  account below.
- email: review+ebril@example.com
- password: [fill in before submission]

to test:
1. open the app. you'll see the landing page.
2. tap "come inside" — this starts patreon oauth.
3. after oauth, the home screen renders with your balance and tier.
4. tap "dusk diary" to write a test entry. one entry per day credits 10 points.
5. tap "rewards" to see the catalog. the first reward is a content unlock and is
   free-to-redeem with your test account's starting balance.
6. all payment flows use stripe test mode; no real charges.

patreon and stripe are handled server-side via the hosted backend at
rewards.ebril.com. the native app is a trusted webview into the same experience.
```

---

## Ranking + ASO notes

- The App Store + Play both weight the first 25 words of the description heavily;
  don't move the opening paragraph.
- "stranger in you" and the artist name itself are the strongest pull; include
  them in the keyword field once the app has review velocity (first 2–4 weeks).
- Avoid the word "fan club" — it triggers low-quality-app classifiers on both
  stores.
