# Affiliate setup — what you have to do

The code is finished and shipped. It does nothing until you do the steps below,
and that is deliberate: with no tracking id configured the buy links still work
and still open the shop, but they carry no tag, are not marked `sponsored`, and
show no disclosure. Shipping before approval is safe.

Everything in **Part 1** is done by you, in a browser, on Amazon's site. Nothing
in the code changes.

---

## Part 1 — Get an Amazon Associates account

**Amazon's rules change. Treat the details below as a map, not as gospel, and
read what the page in front of you actually says.**

### 1. Apply

Go to <https://affiliate-program.amazon.com> and sign up with your Amazon
account. You will be asked for:

- **Your website(s) and/or mobile app.** List the site *and* the app. For the
  app, give the Play Store listing URL:
  `https://play.google.com/store/apps/details?id=com.circuitry3d.app`
- **A profile / preferred store id** — this becomes your tracking id, and it is
  what you paste into the config in Part 2. It looks like `circuitry3d-20`
  (US ids end in `-20`).
- **How you drive traffic**, and confirmation you are not targeting children
  under 13. Say plainly what the app is: a 3D circuit-building and component
  testing app for students and hobbyists, and the links point at the real
  components a user has just tested.
- **Tax information** (a W-9 or W-8BEN) and how you want to be paid.

### 2. Get the mobile app approved separately

This is the step people miss. An app is not a website, and Amazon assesses it
on its own — look for **Mobile App / Mobile Application Assessment** in the
Associates dashboard once you are in, and submit the app there. Until the app
is approved, run the links on the **web build only** and leave the app's CI
variable unset.

### 3. Know the deadline you are on

An Associates account has to produce **qualifying sales in its first 180 days**
or it is closed (you can re-apply). Nothing in the app changes this — it just
means don't apply until the app is in front of people.

### 4. The rules that actually bite

- **The disclosure has to be there.** The app already renders it, but only when
  a tag is configured. Don't remove it.
- **No affiliate links in emails, PDFs, or off-platform messages.** Links live
  in the app and on the site.
- **Don't cloak or shorten** the links so the destination is hidden.
- **Don't state prices or claim availability** in your own text — those change,
  and stale prices are a violation. The app never does this; keep it that way.
- **One tag per marketplace.** A `.com` tag earns nothing on `.co.uk`.

---

## Part 2 — Put your tag in (5 minutes)

Once you have the id (`circuitry3d-20` or whatever you chose):

### Local development

```bash
cp .env.example .env
```

Then edit `.env`:

```
VITE_AMAZON_ASSOCIATES_TAG=circuitry3d-20
VITE_AMAZON_MARKETPLACE=www.amazon.com
```

Restart the dev server. `.env` is gitignored — your tag never gets committed.

### The live web build and the Android app

Both builds read the same variables from GitHub. Add them once:

**GitHub → your repo → Settings → Secrets and variables → Actions → the
"Variables" tab → New repository variable.**

| Name | Value |
| --- | --- |
| `VITE_AMAZON_ASSOCIATES_TAG` | `circuitry3d-20` |
| `VITE_AMAZON_MARKETPLACE` | `www.amazon.com` |

Use **Variables**, not Secrets. A tracking id travels in the URL of every link
it is attached to — it is public by design, and masking it only makes a failed
build harder to read.

The next push to `main` builds both with the tag in. Nothing else to do.

### Later: a second marketplace

Approved for the UK too? Add one more variable:

```
VITE_AMAZON_ASSOCIATES_TAGS=www.amazon.co.uk=circuitry3d-21
```

Comma separated for more. A marketplace with no entry gets an untagged link
rather than someone else's tag.

### Turning it all off

Set `VITE_AFFILIATE_ENABLED=false`. Links stay, tracking and disclosures go.
No UI changes, no rebuild of anything but the bundle.

---

## Part 3 — Checking it works

1. Open the Arena, run a test, open **Results**.
2. Each row has a **Find on Amazon** link, with a small `ad` marker beside it
   once a tag is live.
3. Click it. The URL should contain `tag=your-id` and
   `ascsubtag=ct3d-leaderboard`.
4. A disclosure line appears under the board and at the bottom of Settings.
   If a tag is configured and you do NOT see the disclosure, stop and fix it
   before shipping — that combination is the one that costs an account.

**Where the clicks show up.** The app keeps its own local count, so you can see
whether anyone is clicking before Amazon reports anything:

```js
// In the browser console, on the app:
JSON.parse(localStorage.getItem("circuitry:affiliate-clicks"))
```

`ascsubtag` tells you *which surface* earned, in the Associates reports. Today
every link is on the leaderboard (`ct3d-leaderboard`); the placements already
defined for when you add more are `part-editor`, `roster`, `result` and
`library`.

---

## What's in the code

| File | What it owns |
| --- | --- |
| `src/affiliate/config.ts` | Reads the environment. Decides whether links are affiliate at all. |
| `src/affiliate/partQuery.ts` | Turns a component into a search a shop can answer. Knows that `R1` is not a part number. |
| `src/affiliate/merchants.ts` | Amazon, Digi-Key, Mouser. Adding a merchant is a config change, not a refactor. |
| `src/affiliate/links.ts` | Builds the URL, the `rel`, and the sub-tag as ONE decision. |
| `src/affiliate/clickLog.ts` | Local, anonymous click count. Nothing is sent anywhere. |
| `src/affiliate/BuyLink.tsx` | The link and the disclosure, together so one cannot ship without the other. |
| `tests/affiliate.test.ts` | Covers the money-losing failures: missing tag, wrong marketplace, a designator leaking into a search, `sponsored` on an unpaid link. |

## Adding a link somewhere new

```tsx
import { BuyLink, AffiliateDisclosure } from "../../affiliate";

<BuyLink part={{ name, family, componentNumber, properties }} placement="roster" />
// ...and once per surface, below the links:
<AffiliateDisclosure />
```

`placement` must be one of the values in `AffiliatePlacement` — that is what
separates the earnings per surface in Amazon's reports. Keep the names stable;
renaming one splits its history.

## Beyond Amazon

`merchants.ts` already builds Digi-Key and Mouser search URLs. They are plain
reference links today. Both run affiliate programmes through networks; if you
join one, you are given a parameter to add to your links — put it in
`VITE_AFFILIATE_EXTRA_PARAMS` as `key=value` and those links become tagged,
`sponsored` and disclosed automatically, with no code change.

Worth knowing: Amazon converts best for the cheap generic parts this app
teaches with (a bag of resistors), while Digi-Key and Mouser are where the
*branded* catalog parts actually come from and carry far better data. If the
branded catalog becomes the centre of the app, that is when their programmes
start to matter.
