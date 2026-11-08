# Manufacturer Outreach

How to approach a component maker so the person who owns the part answers.

> Supersedes the manufacturer section of [ARENA_MARKETING.md](./ARENA_MARKETING.md), which
> pitches "brand exposure to future engineers". That is a marketing contact's metric. An
> engineer cannot act on it, and an engineer is the only person who can say yes to the
> thing worth having.

> **The attachment lives in [manufacturers/](./manufacturers/).** One printable page per
> maker — their figures cited, the bench result, what the app added, and the question. The
> email below is the door; that page is what makes walking through it worthwhile.

---

## The thesis

**Their part, modelled from their datasheet, run past its rating until it fails — and a
record of what it took.**

Not an ad. Not a card in a panel. A test. The difference matters because the first thing
an engineer does with any pitch is look for the part they are responsible for, and the
first thing they ask is whether it behaves correctly. Lead with that question and you
have their attention for as long as you want it.

---

## Why this lands, specifically

A manufacturer's engineer has three things they genuinely want and cannot easily buy:

| They want | Why it is hard to get | What this gives them |
|---|---|---|
| To know where their part gets **misapplied** | Warranty and returns data arrives late, aggregated, and after the damage | Every run past rating, logged with rated beside actual, against their part number |
| A **correct model** of their part in tools they don't control | Third-party simulators model the part badly and nobody tells them | A model they can inspect and correct, with the correction credited on the card |
| **First touch** with the person who will specify it later | Brand spend goes to people who already have opinions | A student's first hour with that part is spent watching it fail and reading why |

The third is what the current pitch sells. It is the weakest of the three. The first is
the one nobody else can offer, because nobody else keeps the record.

---

## The demo — 90 seconds, nothing staged

This already works. It is a probe in the repo, not a slide:

```
node tools/probe/drive-107-littelfuse-break.mjs
```

*(It launches the app and drives a browser. Run it deliberately, not in the background.)*

It produces `littelfuse-0218-built.png` and `littelfuse-0218-blown.png`.

**What it does, and why each step is the argument:**

1. **Finds the branded part in the Library** — `littelfuse-0218-250mxp`, a 5×20 mm
   time-lag glass cartridge, 250 mA / 250 VAC. Not a generic fuse wearing a logo: the card
   carries the maker, the part number and the datasheet rating.
2. **Spawns it into the workspace with the datasheet rating intact** — this is the step
   that used to be broken. The workspace sent current only and F.U.S.E. fell back to its
   own 1 A default, so a 250 mA part would sit happily at 1.1 A and blow as though it were
   something else. The probe is the regression test for exactly that failure.
3. **Wires it into a 9 V / 10 Ω loop** — measured 0.893 A through a 250 mA part,
   **3.6× its rating**.
4. **Runs it to destruction.** The element opens, the app reports `Fuse Element Melts` at
   severity 3, and the current drops to zero. On the datasheet's own numbers that overload
   should clear in 0.5405 / 0.797 ≈ **0.678 s** — but that is arithmetic, not a measurement:
   the probe polls for the failure text rather than timing the melt, and the engine opens on
   a **current threshold**, not on the published time-current curve. The part that fails is
   theirs; the timing is the model's weakest claim, and the email says so rather than
   leaning on it.
5. **And it holds at its rating.** The probe asserts the other side too: at 0.250 A the
   engine reports `failed: false`, severity 0. A model that blows a fuse at its own rating
   is worse than no model, and that half is the one an engineer checks first.
5. **Says what happened, in words.** Not "overload" — the mechanism, the numbers that
   produced it, and the margin it had.

Everything on screen is theirs: 250 mA, 250 VAC, 0.5405 A²s, 1.0495 Ω cold, 35 A
interrupting. Nothing rounded, nothing invented, and what the app adds is labelled as the
app's own judgement rather than quoted as theirs.

The pair is the argument — the fuse intact on the bench, and the same bench seconds later
with the element gone. Nobody in this industry needs the second one explained.

**State of the two files, checked 6 Nov 2026.** The probe passes 13 of 13 and writes both
shots at 412×915. The blown shot is the one that sells it: the element has thrown a bright
arc, the nameplate reads `F1 0.25A` with a FAILED badge and `Fuse Element Melts`, and the
current in the top readout has dropped to zero.

Two things to fix before either is attached to an email:

- **The failure toast covers the top toolbar.** In the blown shot the F.U.S.E. notice sits
  over the tool icons and the W/I/R/E/T readout row. It reads as a layout bug — because it
  is one — and an engineer will notice it before they notice the fuse.
- **The intact shot is framed too wide.** The part is a small white sliver in a large empty
  board, and `Littelfuse` appears nowhere on screen: the nameplate says `F1` and `0.25A`
  only. For an email that says "your fuse", the maker's name and part number need to be on
  the plate and the camera needs to be closer.

---

## The ask — three steps, ascending

Never open with the top one.

**1. Correct our model.** One question, one part, answerable in a reply:
*"We treat melting I²t as constant. For a time-lag 218 at 3.6× it is not. Where are we
wrong?"*
Costs them ten minutes. Starts a technical thread with the person who knows. It also
happens to be the only opening that cannot be deflected to marketing.

**2. Send us the parts you want tested.** Their choice, their curves, their problem parts.
A part they are already worried about is a part they will read a failure record about.

**3. Talk about the record.** Once a set of their parts is running, the conversation is
about data rather than placement: how often each part is pushed, how hard, what it took to
fail it, and where the margin actually sat.

---

## What they get back

Per part number, accumulated across runs:

- how many times it was run, and at what it was driven
- rated beside actual at the moment it left its safe zone
- what failed it, by name, and how long it held
- the margin: actual against derated rating, not against the headline number

This is the F.U.S.E. record. It is honest about being small today — a single app's
history on a device, not a population — and it is the reason a second conversation
happens. Say that plainly in the first email; a number you have to qualify later is worse
than a number you qualified up front.

**The export exists now.** The Arena's record tab (`Board | Runs | Record`) writes a
`fuse-log-*.json` bundle and takes one back in, merging by id. Attach a bundle or paste a
few rows into the email; do not promise a dashboard that does not exist.

---

## Email — Littelfuse follow-up

They were approached on 18 September. Seven weeks later, this adds rather than repeats: a
built model, a measured result, and one question only they can answer.

```
Subject: Your 0218.250 at 3.6× rating — two screenshots and one question

[NAME],

I wrote in September about putting real parts in front of electronics students.
Rather than follow up with the same note, I built your part and ran it.

The model is from the 218 series datasheet: 250 mA, 250 VAC, nominal melting
I²t 0.5405 A²s, 1.0495 Ω cold, 35 A interrupting. In a 9 V / 10 Ω loop it draws
0.893 A — 3.6× rating — and the element opens and stays open.

At 0.250 A it does not fail: severity 0, no event. Both sides are what make the
overload worth anything.

Now the part I cannot answer. Your I²t says that overload should clear in
0.5405 / 0.797 = 0.678 s. Our engine opens on a current threshold, not on your
time-current curve, so I can tell you it opens and I cannot tell you it opens at
your time. A 218 is time-lag; the curve is the thing that makes that mean
something at 3.6×. What should the model do instead?

Two screenshots attached: intact on the bench, and the same bench after.

The question: we treat melting I²t as constant. The 218 is time-lag, so at 3.6×
it clears later than that figure implies. Where is the model wrong, and what
should it do instead?

If it is useful, I will run a set of your parts and send the failure records —
each one carries the rated value, what it was actually driven to, and what took
it out. No charge and no placement deal attached to that; a wrong model of your
part in a teaching tool is worse for you than for me.

Twenty minutes if you would rather talk it through.

Mitchell
CircuiTry3D
info@circuitry3d.app
```

## Email — Vishay, first touch

Different opening, because the resistor is the part every student touches first and the
derating curve is the one place a model can quietly be wrong.

```
Subject: Your CRCW0603 in a classroom simulator — is our derating read right?

[NAME],

The first thing anyone builds in our circuit simulator is a resistor, and for a
while now the 0603s on the shelf have been Vishay CRCW — 100 Ω, 330 Ω, 1 kΩ and
10 kΩ, all 1%.

It is modelled from your datasheet — four values of CRCW e3, 0402 and 0603,
with the 0.10 W rating, ±1% tolerance and the 155 °C limit. Students see the
rating and the derated figure side by side while the part is being pushed,
because above ambient the part cannot do what the headline number says.

Where I would like your help is the curve. We used to derate from 25 °C, which
told students their resistor had less margin at 50 °C ambient than your sheet
gives it. It now derates from a 70 °C knee to zero at 155 °C, which is my
reading of the e3 series.

Two questions:

1. Confirm 70 °C and 155 °C for the e3 series, and that the curve is linear
   between them. I would rather match your sheet than a convention.
2. Which of your parts would you rather we carried? We hold the 1N4148W, SS14,
   SMAJ5.0A, SiSS52DN and the IHLP2525 already.

Happy to send the model parameters we hold for any of them so your team can
check them line by line.

Mitchell
CircuiTry3D
info@circuitry3d.app
```

---

## What not to claim

Every one of these has been in a draft at some point. All of them are how an engineer
stops reading.

- **No user numbers dressed up as traction.** About a thousand downloads in the first six
  months, mostly apprentices and their instructors. Say that; it is a real number and it is
  the right size for the ask being made.
- **No "physics-accurate" as a bare adjective.** The model is derived from published
  values and it is labelled as a model. The moment a claim outruns the evidence, the
  engineer starts checking the rest of it.
- **No implying field data.** The record is runs inside the app, not failures in the wild.
- **No rate card in the first email.** A placement price signals that the part is for sale,
  and a part for sale is not a part being questioned.
- **No asking them to validate the whole engine.** One part, one question.

---

## Working the list

| Account | State | Next move |
|---|---|---|
| **Littelfuse** | Approached 18 Sept | The follow-up above, with the two screenshots. Ask the I²t question. |
| **Vishay** | Not approached | The resistor email. CRCW e3 is carried at four values and now derates from their own 70 °C knee, so the curve is worth confirming rather than discovering. |
| **Bourns, Murata, onsemi, Infineon, TI** | In the catalog, not approached | One part each, chosen because it is already modelled. The question is always "where is our model of this part wrong?" |

A part already in the catalog is a part with a demo behind it. That is the only reason to
pick one account before another.

---

## The order that matters

1. ~~Get the failure toast off the toolbar.~~ Done: the workspace's F.U.S.E. toast is now
   bottom-right, clear of both rails, the wordmark, the toolbar and the W/I/R/E row, capped in
   height so a stack of them cannot climb back over it. The current reading stays visible at
   the moment it collapses, which is the frame worth attaching. Re-ran the probe: 13/13.
2. Send the Littelfuse follow-up with the [brief](./manufacturers/littelfuse.html) attached
   and the I²t question. The brief already concedes what the model cannot do, which is why
   the question reads as a request for help rather than a claim to be checked.
3. Offer the record in the reply, not the first email. The export exists; the bundle is real.

Everything else in this document is ready. The record and the screenshot are no longer the
missing pieces. One gap is left in the evidence: the workspace nameplate prints `F1 · 0.25A`
and not the maker, so a shot of the bench does not say "Littelfuse" unless you read the
catalog. The arena's bench plate now carries maker and MPN; the workspace plate needs the
same identity plumbed through `toWorkspaceProperties`, which is typed numeric and covered by
the parity test — a real job, not a one-liner. Until then, attach the arena-bench shot.
