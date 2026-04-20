# email templates — copula handoff

Three drafts. Paste, tweak, send. Each one assumes the recipient has never
seen the project before.

---

## 1 · To Ebril

**Subject:** copula — your world, ready for you to walk through

> hi ebril,
>
> copula is ready for you to look at. it's the app we built for the people
> who live inside your songs — a small room, not a storefront.
>
> one letter, written for you, is attached: **docs/for-ebril.md**. it explains
> what everything is in plain words and ends with the only list that actually
> matters right now — the eight pieces of content you need to seed before we
> put this in front of real fans. nothing on the list is a ticket; each one is
> a form in the admin panel.
>
> to see it with your own eyes: run the demo (`docs/demo.md`, five minutes)
> and sign in as **hana**. that's the fullest view. every piece of copy that
> reads off-voice to you is a one-line fix — just point at it.
>
> the app works. the app has never been touched by a real fan. closing that
> gap is the only thing between here and launch.
>
> whenever you're ready,
> — [name]

---

## 2 · To management / UMG

**Subject:** copula — handoff, risks, timeline, and the ownership questions
that block launch

> hi [name],
>
> copula is the fan app we built around Ebril's world — free, native iOS +
> Android, patreon-linked. ready for a closed beta after one week of content
> seeding and legal review.
>
> one document is the handoff: **HANDOFF.md** at the repo root. open the
> "For managers / UMG" section — it has:
>
> 1. the business model in one paragraph,
> 2. a risk register in descending order of urgency (Apple's IAP policy is
>    the top item and needs a product decision, not a technical fix),
> 3. the run cost (<$50/mo baseline at pre-launch scale),
> 4. a four-phase timeline from content seed → beta → store review → public,
> 5. **five ownership questions that are contractual, not technical, and
>    block launch**: who owns the Patreon OAuth client, the Stripe account,
>    the domain, the Apple Developer team, the Play Console, and the on-call
>    rotation.
>
> legal starters for privacy + terms are in `docs/privacy-policy.md` and
> `docs/terms.md`. they reflect what the app actually does and need Canadian
> counsel review before we publish.
>
> the code branch is `claude/ebril-rewards-app-lpqY5`. the app runs; the
> app has not yet been used by a real human. that's the single most
> important fact for any launch decision.
>
> happy to talk through any of this.
>
> — [name]

---

## 3 · To the technical team

**Subject:** copula — branch + runbook + what's done and what isn't

> hi folks,
>
> copula is on branch `claude/ebril-rewards-app-lpqY5`. Next 14 App Router +
> TS + Prisma + Postgres, Patreon OAuth, Stripe checkout for point-packs and
> cash-buy merch, Shopify Storefront for the store, Capacitor 6 for the
> native shells, Sentry optional, Web Push optional, Resend optional — every
> external service no-ops gracefully when its env var is unset.
>
> start here: **HANDOFF.md**, "For the technical team" section. it has the
> stack summary, the env checklist (required vs optional — `ENCRYPTION_KEY`
> is the only optional-looking variable that's actually non-negotiable in
> prod), the cron schedule (`vercel.json`), the webhook surface, and the
> four-step what-to-do-first list.
>
> before opening the docs/ folder, two things to run in order:
>
> 1. `docs/demo.md` — stand up a full local copy in five minutes with the
>    Demo Mode auth bypass so you can tour every surface.
> 2. `docs/publishing.md` — iOS + Android submission runbook.
>
> what's known-not-done:
> - no real fan beta yet
> - Apple IAP path for point packs (product decision pending)
> - rate limit is in-process; swap for `@upstash/ratelimit` before going
>   multi-region
> - PWA icon artwork still placeholder-named
> - iOS + Android native projects need `npx cap add` when we're ready
> - no automated test suite — critical paths have manual verification notes
>   in commit messages
>
> access transfer (Patreon OAuth client, Stripe, Shopify, domain, Apple /
> Play accounts, Vercel + Neon) happens once management resolves the
> ownership questions in the HANDOFF doc.
>
> ping me for anything.
>
> — [name]

---

## how to send

- Forward this whole file, or copy the section you need.
- If you want PDFs of the longer docs, run them through any markdown → PDF
  tool (Pages, Marked, pandoc, Notion). The markdown is intentionally clean
  so conversion looks fine out of the box.
