# The beat — CircuiTry3D

The patrol. Same route, same order, every build, **including the parts nobody
touched**. Regressions do not live where you were working; they live where you
weren't looking.

**How it is walked** (from `C:\Dev\CLAUDE.md`):

- **Cold start, real device, 360×640.** Not a resumed session, not an emulator,
  not a desktop window dragged narrow. For this app the beat is the installed
  build (`com.circuitry3d.app`) or circuitry3d.app on the phone. The dev server
  at `http://rainmaker:3000` is for the fix pass afterward, not for the walk.
- **Every screen, every tab, every panel opened, every toggle flipped.** Not the
  diff.
- **Write it down, don't fix it.** Anything odd gets logged in *Notes from this
  walk* at the bottom and fixed after. Stopping to fix breaks the route, and the
  rest of the beat goes unwalked.
- **The route grows when a screen ships.** A new screen that isn't on the beat is
  a screen nobody will look at again.
- **Report the walk, not a verdict.** "Walked 54 of 54, six notes" beats
  "looks good."

---

## 1 · Cold start and the front door

1. Force-stop, then launch. The launcher icon on the home screen is the mark,
   sitting right in its mask — not cropped, not floating in a field.
2. Splash, then the landing page. The wordmark renders in 3D on its canvas:
   **Circui** blue, *Try* orange italic, **3D** green. If the canvas fails the
   flat CSS wordmark stands in — check that it does, and that you never see both.
3. The F.U.S.E.™ watermark sits in its corner, clear of the footer, at both
   orientations.
4. Footer links reach: Privacy Policy, Data Safety, Delete Account,
   Partnerships. Then "Online at circuitry3d.app · Android on Google Play".
5. **Launch App** → the builder. Back button from here: where does it go, and
   can you get out?

## 2 · The builder lands

6. First frame shows the real interface — rails in place, no empty shell waiting
   on an observer, no white flash.
7. The circuit sits centred in the space actually left over, not behind a rail.
   Open a rail and watch it recentre: React measures the occluding chrome and
   sends `set-view-insets` to the scene, so the camera re-aims. Confirm it
   re-aims, and that the move is a brief animation, not a jump.
8. Orbit and pinch on the canvas. The pivot stays under the finger. No
   persistent control sits where a two-finger gesture lands.

## 3 · The left rail — Components

9. The **Components** tab opens the left rail. Four sections: Components, Quick
   Actions, Schematic, Wire Modes.
10. Place one of each family so every geometry gets looked at: Battery, AC
    Source, Resistor, Capacitor, Ceramic Capacitor, Inductor, Flux Capacitor.
11. Semiconductors: Diode, Zener Diode, Photodiode, LED, Thermistor, Crystal,
    BJT, NPN Transistor, PNP Transistor, Darlington Pair, MOSFET.
12. The rest: Switch, Fuse, Potentiometer, Lamp, Motor, Speaker, Op-Amp,
    Transformer, Ground, Relay, Voltage Reg., Junction.
13. **Quick Actions** — Select Tool, Measure, Clear Workspace, Run Simulation.
    Clear Workspace is destructive: it confirms before it wipes.
14. **Schematic** — "Open the 3D schematic workspace" and Launch Builder. Go
    across and come back; the build survives the round trip.

## 4 · The component reel

15. Open the reel. Search a part by name. Filter by category: All, Power,
    Passive, Semi, Sensor, Mech, Node.
16. Every card shows its own shot, of that part — not a blank tile, not the
    wrong part. This is the one that went wrong before, so look at all of them.
17. Pin a part, unpin it. With nothing pinned the Pinned tab says so rather than
    sitting empty.
18. Search a string that matches nothing — "No matches", not a blank reel.

## 5 · Wiring

19. **Wire Modes** — Wire Mode, Cycle Wire Routing, Rotate Mode, Add Junction,
    Auto Arrange. Cycle the routing all the way round, including the schematic
    (Manhattan) 90° elbows.
20. Wire a series loop. Wire a parallel bus. Branch one with a junction rather
    than crossing wires.
21. Tap a placed part — the edit modal opens. Change a value, commit. Change a
    value and cancel; nothing moved.

## 6 · The right rail — Modes and View

22. The **Controls** tab opens the right rail. **Modes**: Toggle Current Flow
    (the status text tracks it), Polarity Indicators, Cycle Layout Mode,
    Measurement Tools.
23. **View**: Reset Camera, Fit to Screen, Toggle Grid, Toggle Labels.
24. Fit to Screen with a rail open, then with everything closed. Both times the
    whole circuit lands inside the free rectangle with room around it.
25. Every toggle's on-state differs in **shape**, not colour alone — a fill, a
    border, a check. Check it at a window if you can get to one.

26. **Explode** — the burst button at the foot of the right column opens the
    slider beside it. Drag it to the top: every part lifts straight up off the
    board and its leads stretch down to the wires it was connected to. Drag it
    back: they sit down exactly where they were, not a grid square off.
27. Hold it partway. Orbit, select a part, open its edit modal, run the sim,
    drag a part — every one still works, and the explode holds through all of
    it. Tap the canvas: the slider closes and the parts stay up. Only
    **Assemble**, or the slider at the bottom, brings them down.
28. Fit to Screen at 0% and again at 100% — the same framing both times, with
    the lifted parts inside it. The camera does not move while the slider does.

## 7 · The bottom bar — Insights

29. The **Insights** tab opens the bottom bar. **Analysis**: the four W.I.R.E.
    tiles — Watts, Amps, Ohms, Volts. Tap each for its calculation.
30. Run the simulation and watch the tiles move. Digits hold their columns as
    values update; they do not dance.
31. **Settings**: Workspace Skin, Flow Visualisation, Polarity Markers, Design
    Grid, Component Labels. Flip all five, both ways.
32. Workspace Skin — pick a skin, import a background, cancel out of it.
33. **Guides**: W.I.R.E. Guide, Keyboard Shortcuts, About CircuiTry3D, Help
    Center. Open each, close each.

## 8 · Nameplates

34. Cycle **Component Labels** through its three stops: off → names and values →
    names, values and live metrics. Third press is back to off, not a fourth
    stop.
35. With the sim running, rated sits beside actual, and the plate goes to warning
    colour **approaching** the limit, not after it.
36. Crowd parts together and watch what the plates do when they collide.

## 9 · Save, load, recover

37. Save a circuit. Load it back. Load with nothing saved — the empty state says
    so.
38. Kill the app mid-build and relaunch: the recovery banner offers the work
    back, and taking it returns the circuit intact.

## 10 · Practice and troubleshoot

39. **Practice**: Series Circuit, Parallel Circuit, Mixed Circuit, Combo
    Challenge. Then Random Practice Problem and the Table Method Guide.
40. **Troubleshoot** — work one fault through to the end.

## 11 · The Arena

41. **Component Arena Sync** carries the active build across. Sync with an empty
    workspace too, and with the biggest circuit you have.
42. The quick bar: **Parts**, **Board**, **Conditions**, **Results**.
43. **Bench** — put a part on the bench, set Supply and Series R, Run. Run again.
    Watch the instrumentation while it runs.
44. **Battle** — Solo and Throw. A winner is declared and the leaderboard takes
    it.
45. **Conditions** — every scenario: Lab Bench, Desert Heat, Arctic Cold,
    Orbit / Vacuum, Engine Bay, Overvolt Surge.
46. **Stress Test** and the fuse forecast. Take a part past its rating and watch
    it go — the failure reads as the part failing, and the plates keep reading
    through it.
47. The part editor and the roster picker, both directions. The catalog
    reference: every branded part says whose it is and where its figures came
    from.

## 12 · The rest of the doors

48. Learn, Arcade, Classroom, Community, Account, Pricing, Textbook, Gallery —
    open each from the workspace, and check the back route out of each.
49. Settings page. About → **More from the 3D family**: all eight siblings, one
    line each, linked to their own sites, with CircuiTry3D listed but not linked.
50. Legal: Privacy, Data Safety, Delete Account, Terms, App Access, Play Store
    compliance. Every one reachable from inside the app, not only the landing.
51. A route that does not exist → the not-found page, and a way back from it.

## 13 · Leaving and coming back

52. Background the app and return, at every state, including with a panel open
    and mid-simulation.
53. Rotate to landscape and back at the same states.
54. Android back button from a panel, from a modal, from a workspace mode, and at
    the root. It never leaves you somewhere you can't get out of.

---

## Then: driving for bugs

Not part of the route — a separate pass, same build. Hammer one control. Two at
once. Rotate mid-action. Background and return with a panel open. Slam explode to both ends,
fast, over and over, while orbiting. Select,
deselect, select something else with a panel open. Empty, exactly one, and
maximum data — an empty workspace, a single resistor, and the biggest circuit
you have. Interrupt it. Kill it dirty and relaunch. Back button everywhere
including the root. Throttle it and load the biggest circuit.

Anything found goes in the bug list **with the exact steps that produced it**. A
bug without repro steps is a rumour.

---

## Notes from this walk

_Date, device, build. One line per observation. Cleared after the notes are
turned into fixes._

### 2026-09-20 — route written and audited against the code. NOT a walk.

Every label on the route was checked against the source before the first real
walk, so a wrong name in the route cannot derail it. This is not the beat: the
beat is a cold start on the real phone at 360×640, and none of the below was
seen on a device. Six notes, logged not fixed, per the rule. Note 4 fixed since.

1. **Step 49 — "More from the 3D family" does not exist.** What exists is
   `StudioCredit` ("From the makers of"), mounted three places: Help modal →
   About, Builder → About, and the Settings page. `constants/urls.ts`
   `STUDIO_SITES` lists two of the eight siblings, and the landing footer
   (`public/landing.html:451`) repeats the same two. Both spell it
   **Automotive3D** where the wordmark grammar requires **AutoMotive3D** — Auto |
   Motive | 3D, and the capital is where the mark breaks. CircuiTry3D itself is
   not listed, so the set never reads as complete.

   This is the same defect, in the same component, as ThePrints3D note 1. It is
   one shared fix across the family, not two per-app ones.

2. **Explode — DECIDED 2026-09-21: both levels, one slider.** With nothing
   selected the circuit comes apart; with a part selected, that part opens up.
   The circuit's real axis is straight up off the board — the way you pull a
   part — with the leads stretching down to the traces.

   **Circuit level is built** (steps 26–28). The lift lives only on the mesh;
   `component.position` is never touched, so saves, undo, the solver and the
   arena export all keep reading the assembled board. Wires are routed flat at
   y = 0, so each lifted terminal gets a vertical lead down to its wire.

   **Part level is next:** `getComponent3DWithInternals()` and the
   `internalLayers` data are still unused, and are what it will run on.

   One placement call to check on the phone: ThePrints3D keeps its slider on
   screen permanently. This column had no room for that at 360×640, so here the
   persistent part is one button and the same vertical slider opens beside it.
   One extra tap, and it is the one place the two apps differ.

   Known and left for later: current-flow particles run along the flat wire
   only, not up the new leads; a part dragged while lifted follows the finger's
   point on the board, not the lifted part.

3. **Nameplate collision handling was never built.** Step 36 asks what the plates
   do when they collide; the answer in the code is nothing. There is no ranking,
   no tier-drop for the loser, no leader lines, no three-at-full cap and no dot
   clustering — `labelVisibility.ts` is a global tier and that is all. The tiers
   themselves are a deliberate three (off / names+values / +live metrics) rather
   than the rules' four, and the file argues its case in its own header: a name
   with no number is the stop nobody reaches for. That part is a decision, not a
   gap. The collision behaviour is the gap.

4. **FIXED 2026-09-21 — the glass had nothing under it when the blur was
   missing.** `builder-ui.css:27` sets `--glass-bg: rgba(11, 12, 34, 0.44)`,
   well under the 0.72 floor. That is argued, and the argument holds: the blur
   plus a `--glass-text-shadow` halo carry the text, and "See-through menus"
   off flips the UI to 0.95. But it all rests on the blur, and there were two
   holes in it:

   - **No fallback.** Zero `@supports not (backdrop-filter: …)` blocks, so
     where the engine has no blur the menus were a 44% wash over the model.
     Now one block takes `--glass-bg` and `--glass-bg-chrome` to 0.94 and the
     panel scrim to a flat 0.72 — the same flip as the user toggle, applied by
     the engine.
   - **12 of 18 real blur declarations had no `-webkit-` pair**, against the
     file's own header. All 18 are paired now. (The first count here said 14
     of 25; that included `backdrop-filter: none` lines, where pairing does
     nothing.)

   Where each hole actually bites, so the walk looks in the right place: the
   missing prefix is a **Safari** problem — iPhone and Mac visitors to
   circuitry3d.app on Safari before 18 — not an Android one; Chromium, and so
   the Android WebView, has taken the unprefixed property since 76. The missing
   fallback bites on an old or un-updated WebView and on Firefox before 103.
   Neither is the Play build on a current phone. Check it on an iPhone in
   Safari if one is to hand; on the Android walk, step 22 with the rail open
   over a bright part should look exactly as it did.

5. **Type and targets in the workspace chrome are under the minimums.**
   `builder-ui.css` has **80** `font-size` declarations below 13px, and tap
   targets at 28, 32, 36, 38, 42, 44 and 46px against a 48×48 floor. Check them
   with a thumb at steps 13, 23 and 31, not with a cursor.

6. **Twenty-three distinct z-index values, against the four that exist.**
   `-1 0 1 2 3 4 5 6 10 15 20 40 100 110 620 1000 1100 1200 1220 1250 1260 1310
   10000`. Some of that is stacking inside a single panel and harmless; 620, 1310
   and 10000 are things that were losing a fight. Worth untangling in one pass
   rather than a layer at a time, but not mid-walk.

**Not checked, and only a device can:** cold start and the splash, the launcher
icon in its mask, the 3D wordmark canvas and its fallback, gesture handling,
orientation, whether the camera really re-aims on `set-view-insets` when a rail
opens, the component shots on real cards, and every one of the bug-drive items.
