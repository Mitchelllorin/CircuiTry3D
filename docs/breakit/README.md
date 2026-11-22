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
node tools/probe/drive-100-arenadash.mjs
```

Drives the real UI at 360×640 against `localhost:3000`, and writes
`04-console.png`: the console with both faders, the switch and the bench
legends. (`05-failure.png` is the same bench after a throw — the card comes up
above the console and the switch reads "Run again".) It fails the run if the console is not mounted, if any W.I.R.E.
readout is covered, if either fader has less than 120px of throw, if a fader
legend is clipped, if the console overflows its cap, if the switch is off the
screen, or if a page error fires.

The strip this folder was named for — `drive-108-ramp-sweep.mjs`, and the
`01`/`02`/`03` shots — has been retired with the Ramp mode. "The Ramp" is the
console's load slider (the supply fader), not a third bench, so the strip no
longer exists on screen; the camera pose it was photographing is still covered
in code by `failureShot.test.ts` below.
