# The Ramp — failure shot evidence

Mitchell's acceptance note for BREAK-IT.md section 4: *"tests passing is not
enough"*. So the shot is checked two ways, and both live here.

## In code (runs anywhere)

`src/components/arena/failureShot.test.ts` projects a part of nominal size
through the pose the scene actually uses (`failurePose`, shared with
`ArenaScene`) and asserts:

- the part centres in the **visible** canvas — the one above the strip, via the
  same `setViewOffset` inset the scene applies;
- without that inset it sits low, so the test fails if the inset is dropped;
- it is the subject of that band — a unit-scale part fills a little over half
  of it at the current close-up, which is measured and pinned rather than
  claimed; the numbers live in the test;
- the eye line is fixed, so every break frames the same way.

## On screen (needs the dev server)

```
node tools/probe/drive-108-ramp-sweep.mjs
```

Drives the real UI at 360×640 against `localhost:3000`, and writes:

| shot | what it shows |
| --- | --- |
| `01-ramp-strip.png` | The Ramp strip at rest: readouts, ramp, switch, three bars, presets |
| `02-mid-sweep.png` | A preset tapped, camera mid-flight, everything else fading |
| `03-failure-card.png` | The card up, strip stepped back, one part on stage |

It also fails the run if the strip is taller than a third of the screen, if the
canvas drops under two thirds, if a preset carries a maker's name, if the card
appears over the part's frame, or if a page error fires.

These images are not checked in yet — the script writes them on the first run
against a live server.
