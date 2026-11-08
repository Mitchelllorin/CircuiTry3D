# Part briefs

One page per manufacturer, plus the pitch that goes with it.

The email in [../MANUFACTURER_OUTREACH.md](../MANUFACTURER_OUTREACH.md) gets opened; this
is what makes it worth answering. It is short on purpose: a page the engineer can read in
ninety seconds while looking at their own part.

## The shape of every brief

| Section | What goes in it | The rule |
|---|---|---|
| The part | Maker, part number, package, family | As their sheet writes it, not as a shelf label |
| Their figures | Only ratings the maker publishes | Every one cited. No figure from a distributor page, none from memory |
| What the bench does | The measured run, and the arithmetic that predicts it | Numbers, units, and the run conditions |
| What is ours | Model constants, the failure name, the severity | Labelled as the app's own, never mixed into their column |
| The question | One thing only they can answer | Technical, answerable in a reply, and genuinely open |
| Also carried | Their other parts already in the catalog | A reason to reply about more than one part |

The last two sections are what turn a brochure into a conversation. A brief with no
question is a rate card with better typography.

## Files

| File | Maker | State |
|---|---|---|
| [littelfuse.html](./littelfuse.html) | Littelfuse | Ready to print. 0218.250MXP, measured end to end on the bench |
| [vishay.html](./vishay.html) | Vishay | Ready to print. CRCW e3 derating, the knee to confirm |

Each file is standalone: open it, print to A4 (or PDF), attach it. No server, no build.
The brand treatment is **flat**, because these are documents — blue / orange / green
wordmark on white, per the family's own rule for print.

## Adding the next maker

1. **Pick a part already modelled.** A part in the catalog is a part with a demo behind it.
   Bourns, Murata, YAGEO, onsemi, Infineon, TI and TE Connectivty all have entries.
2. **Copy the nearest brief** and replace the figures — but verify each one against the
   entry in `src/data/componentCatalog.ts`, because that is where the app's own model
   lives and a brief that disagrees with the app is worse than no brief.
3. **Find the one thing that is ours** in the model — a thermal resistance, a knee, a
   failure name — and put it in the "what is ours" column. This is the section that earns
   trust; every maker's engineer looks for it first.
4. **Write the question.** If the model is right, ask what it should do instead at the
   edge; if it is a reading of a curve, ask for the curve.
5. Print it, read it at arm's length, and cut anything that is not a figure, a condition or
   a question.

## What not to do

- Do not put a price on a brief. A part for sale is not a part being questioned.
- Do not round a rating to a tidier number. 0.5405 A²s is the figure that makes the run
  checkable; 0.5 A²s is a different fuse.
- Do not claim "physics-accurate". Say what was modelled, from what, and what the app added.
- Do not list a part the catalog does not carry. The reply will be "send us that one", and
  then it has to exist.
