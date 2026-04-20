# privacy — the version that tells the truth

**last updated:** fill in before publishing

this is a starter document. run it by counsel before going live. it reflects
what the app actually does as of this commit; update it whenever the data model
changes.

---

## what i collect and why

- **patreon identity.** when you connect patreon, i store your patreon user id,
  display name, avatar, and email. i use these to show you the right balance
  and let you sign back in. i store access + refresh tokens so i can keep your
  pledge data in sync — they are encrypted.
- **pledge state.** i mirror your pledge amount and status from patreon
  (current pledge, last charge date, active / paused / cancelled). this is how
  points get credited.
- **balance + redemptions.** every point in, every point out, and every reward
  you redeem is stored as a ledger row. this is the source of truth for your
  balance.
- **shipping address.** only when you redeem a physical reward, and only on
  that redemption. i don't keep a separate address book.
- **your birthday, if you give it to me.** used once a year to send the
  birthday bonus.
- **your dusk diary entries.** private by default. pages you mark "share with
  ebril" are read by her. nothing is read by advertisers, model trainers, or
  anyone outside the team.
- **your ritual reflections.** same as diary entries — private by default.
- **device + analytics signals.** page views, redemption events, tier changes.
  used to make the app better. never tied to ad networks. never sold.
- **push subscriptions, if you opt in.** we store the endpoint your browser or
  device gives us so we can send you notifications.

## who sees what

- **patreon.** receives nothing from us except the oauth redirect. everything
  else is a one-way read.
- **stripe.** handles payment card info for point packs and cash reward
  purchases. we never see your card number. stripe's privacy policy covers
  their side.
- **shopify.** if you click through to the merch shop, you leave our app and
  enter shopify. their policy applies there.
- **resend (email).** transactional emails — birthday, redemption status, point
  expiry. no marketing.
- **the team.** me and a small number of people who help me run this.

## what i don't do

- no ad tracking. no third-party pixels.
- no sale of your data.
- no training ml models on your diary entries.
- no location tracking beyond ip-level inference at the cdn edge.

## your rights

- **see everything.** email privacy@ebril.com and i'll send you a full export
  of your data within 30 days.
- **correct anything.** same email.
- **delete everything.** same email. deletion removes your identity, pledge
  mirror, diary, ritual claims, redemptions (we keep anonymized financial
  records where the law requires).
- **disconnect patreon.** in profile → settings, revoking the connection stops
  any further pledge sync.
- **turn off notifications.** on profile, the notifications toggle.

## children

this app is not for children under 13. if you're under 13 and somehow made it
here, please don't use it.

## international

i operate out of canada. data is stored in the us (vercel edge + neon
postgres). by using the app you consent to the data crossing borders.

## changes

if i change what i collect, i'll tell you in the app and by email before it
takes effect. no silent policy shifts.

## contact

privacy@ebril.com — this inbox is real and is read.
