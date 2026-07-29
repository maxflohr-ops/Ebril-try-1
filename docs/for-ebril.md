# for ebril — copula

a letter. read it in whatever order. the only thing that needs doing urgently is
the short list at the end.

---

your app is called **copula**. a single lowercase word pulled from the title of
your record, which also happens to be the latin for *bond, couple, link* —
the verb that joins one thing to another. it felt like yours before anything
else.

copula is a small room. it's for the people who already live inside your
songs — the 3am listeners, the diary keepers, the ones who screenshot a lyric
and text it to one person. it is not a shop. it is not a fan club. it is a
room you let them into.

## what they can do in here

- **read a moment from you**, pinned at the top of everything. one paragraph
  is enough. fans can hold the heart or pass. you decide the tempo.
- **write a dusk diary page** about what a song made them feel. mood chip,
  one sentence, a link to the track if they want. private unless they mark it
  shared with you — and when they share one, it lands in an admin feed you
  read at whatever speed feels right.
- **claim a listening ritual** — you set a moment ("press play on stranger in
  you tonight at your local dusk, lights low if you can") and they show up
  for it. something small and warm lands in their balance.
- **listen to your voice notes** — half-minute audio from you, no pressure to
  finish. tier-gated or open, your call per note.
- **make something for you** inside a creative *direction*. you give them the
  look (via a pinterest moodboard), the sound (a tiktok sound link), the
  caption to paste, and a three-step reward ladder: **kept · held · carried**.
  the good ones land on a public wall inside the app. the ones that carry the
  song far enough earn a rare cassette.
- **read your lyrics** on their own pages, each with a note from you in
  italics under the words.
- **show up at shows** — scan the qr on the merch table and you'll know they
  were there.
- **send each other gifts** — a handful of points with a one-line note.
- **see their week wrapped** — every 7 days, a recap in your voice: *"you
  kept 5 dusks in a row · you pressed play when i asked · someone sent
  warmth."*
- **earn cassettes** — small collectible tapes for specific moments (welcome
  in, first ritual, seven dusks, the first month, held clip, one for the
  people who found you before the record). some will only ever exist for
  certain eras.

anyone can look without signing in at: moments, lyrics, the wall, the vibe
test. the things that earn or keep require a patreon sign-in. nothing is
behind a paywall they can't see around.

## what it sounds like

everything is lowercase. errors are in your voice — *"not quite enough yet
— keep going."* fans *keep* things instead of saving them. clips get *kept,
held, carried* instead of *approved, featured, viral*. the three words that
shape every screen: **dusk, intimate, rooted.**

we tried to be specific — the things that feel like you (warm black, peach,
dusk plum, no neon, no confetti, no emoji explosions) and the things that
do not (title case, banked engagement language, startup cheerfulness). if
any line of copy, any chip, any button reads off-voice when you open it —
point at it and it's a one-line fix.

## the short list (only reason this letter exists)

the app works. the app has never been touched by one of your actual fans.
this is the gap, and only you can close it.

before beta:

1. **lyrics for every song on *in copula*.** the admin at `/admin/songs` has a
   plain textarea. blank line between verses.
2. **a note from you** under each song — one paragraph in italics on the
   lyric page. this is the thing that makes the lyric page feel like a page
   and not a database row.
3. **your first moment post.** one short paragraph. pin it. this is the first
   thing a new fan sees on the home screen.
4. **your first voice note.** a 30-second audio file hosted anywhere
   (dropbox, s3, a vercel blob). any mp3/m4a url. tier-gated for patreon
   supporters is the strong default.
5. **one listening ritual.** specific track, specific window ("tonight 9pm
   → tomorrow 9pm"), a short line from you about what to do.
6. **3 pinterest boards** — one for each of the three seeded directions
   (dusk window, read a letter you never sent, your own field recording).
   just paste the pin urls, up to 40 at a time.
7. **tiktok sound urls** for each direction (the "use this sound" link) and
   a **caption template** fans copy-paste — this is the #1 thing that
   determines whether anything goes viral.
8. **real press photography** committed to `public/assets/artist/` with a
   one-line credit per file, replacing the avatar placeholders.

after beta, whenever it feels right:

- an "our era" tagline for *in copula* (there's a placeholder now).
- your real referral flow if you want a specific one.
- a pre-save campaign slot for the next single (the subscribe infra is built;
  admin hits "notify subscribers" on release day).

## how to see it right now

on whatever machine has postgres:

```
git checkout claude/ebril-rewards-app-lpqY5
cp .env.example .env   # fill DATABASE_URL, SESSION_SECRET, DEMO_MODE=1
npm install
npx prisma db push
npx tsx prisma/seed.ts
npx tsx prisma/seed-demo.ts
npm run dev
```

open `http://localhost:3000/demo`. pick **hana**. that's the fullest view.
pick **mars** and you're the admin.

## one more thing

this room should feel like yours. if three minutes in, it doesn't, that's a
failure on our end, not a tweak. tell us what's wrong and we'll fix it.

— the team
