# Flagship Feature Integration Audit

**Project:** CircuiTry3D  
**Date:** 2026-06-03  
**Scope:** Arena + F.U.S.E. + 3D Battle Interface end-to-end integration  
**Branch:** `main` (commit `e8e0669`)

---

## 1. Arena Component

### 1.1 File Inventory

| File | Purpose |
|------|---------|
| `src/components/arena/ArenaView.tsx` | Top-level view orchestrator (entry point) |
| `src/components/arena/ArenaScene.tsx` | Three.js 3D battle scene (vanilla Three.js, not R3F) |
| `src/components/arena/ArenaOverlay.tsx` | HUD overlay (battle log, health bars, combatant cards, winner banner) |
| `src/components/arena/useArenaBattle.ts` | Turn-based battle state machine hook |
| `src/components/arena/battleMath.ts` | Damage formulas, turn ordering, log entry creation |
| `src/components/arena/arenaData.ts` | Roster builder: converts session payload into `ArenaBattleAgent[]` |
| `src/components/arena/arenaStorage.ts` | Session persistence (localStorage / sessionStorage) |
| `src/components/arena/types.ts` | All Arena-specific TypeScript types |
| `src/components/arena/Component3DViewer.tsx` | Standalone single-component 3D viewer (used elsewhere, not in battle) |
| `src/context/ArenaContext.tsx` | React Context for arena iframe message bridge |
| `src/hooks/useMetricsSync.ts` (`useArenaSync`) | localStorage-based arena import/export |
| `src/types/manufacturer-component.ts` (lines 250-258) | `ArenaContextState`, `FuseAlertLevel`, `ArenaOutboundMessage` |
| `src/styles/arena.css` | Arena-specific CSS |

### 1.2 Component Structure

```
ArenaView (top-level)
├── Props: { variant: "page"|"embedded"|"workspace", onNavigateBack?, onOpenBuilder? }
├── State: sessionPayload, transitionPhase ("entering"|"active"|"exiting")
├── Hooks: useArenaBattle (battle FSM), useWorkspaceMode
│
├── <ArenaScene>        ← Three.js canvas + health-bar DOM overlay
│   Props: { agents, activeAgentId, highlight, transitionPhase, onExitTransitionComplete }
│
└── <ArenaOverlay>      ← HUD (battle log, combatant cards, winner banner)
    Props: { agents, battleLog, currentTurnAgentId, round, status, winnerName, ... }
```

### 1.3 Consumers

| Consumer | How it's used |
|----------|---------------|
| `src/pages/Builder.tsx` (line 3084) | `<ArenaView variant="embedded" onNavigateBack={closeArenaWorkspace} />` rendered inside the workspace panel when `activeWorkspacePanelMode === "arena"` |

The arena is opened via `openArenaWorkspace()` (Builder.tsx line 1629) which sets the workspace mode to `"arena"` and triggers `handleArenaSync()` to export component data from the builder iframe into localStorage.

### 1.4 Dead / Orphaned Code

- **`ArenaProvider` + `useArena()` (ArenaContext.tsx):** Defined but NEVER consumed anywhere in the app tree. Zero imports of `ArenaProvider`. This was designed for the iframe-bridge architecture (`public/arena.html`) but was never wired into the component tree.
- **`ArenaContextState.fuseAlertLevel`:** Referenced in the ArenaContext message handler but never read by any UI component.

### 1.5 TODOs / FIXMEs

No explicit TODO/FIXME comments found in `src/components/arena/`. One fallback comment at `Component3DViewer.tsx:211` — "Fallback: generic component placeholder".

---

## 2. F.U.S.E. (Failure Simulation Engine)

### 2.1 Engine Location & Architecture

The F.U.S.E. engine is a **standalone vanilla JS IIFE** at:
- **`public/js/component-failure-engine.js`** (1567 lines)

It exposes `window.FailureEngine` globally (browser) or `module.exports` (Node/vitest).

### 2.2 Public API Surface

```js
FailureEngine = {
  FUSE_VERSION,                      // Version string
  WIRE_INSULATION_SPECS,             // Physical wire specs
  WIRE_GAUGE_TABLE,                  // AWG gauge data
  COMPONENT_PHYSICAL_SPECS,          // Component physics
  COMPONENT_FAMILY_MAP,              // Type → family aliases
  COMPONENT_PROFILES,                // Default properties per type
  COMPONENT_FAILURE_PROFILES,        // Failure mode definitions per type

  resolveComponentFamily(type, props), // Normalizes component type
  detectFailure(component, metrics),   // Core detection (composition-aware)
  registerComponentType(type, spec),   // Runtime registration
  registerFailureProfile(type, modes), // Runtime profile extension
  loadCompositions(compositions, materials), // Load material data
  getCompositionThresholds(type),      // Query composition limits
  getWireGaugeData(gauge),             // Wire gauge lookup
};
```

### 2.3 Failure Types & Detection

`detectFailure(component, metrics)` returns:
```ts
{ failed: boolean, severity: 0-3, family, mode, name, visual, description }
```

**Failure visual modes** (used by arena.html animation system):
- `smoke` — thermal overload (generic)
- `arc` — electrical arcing (resistor/inductor over-voltage)
- `melt` — material melting (exceeds meltingPoint)
- `burst` — capacitor electrolyte explosion
- `vent` — battery thermal runaway / electrolyte decomposition
- `glow` — thermal saturation (heatsink/thermistor)
- `explosion` — catastrophic failure (severity ≥ 2.5)
- `flame` — sustained combustion
- `debris` — mechanical fragmentation

**Trigger conditions** are defined per component family in `COMPONENT_FAILURE_PROFILES`. Each mode has:
- `trigger(metrics, props)` → boolean
- `severity(metrics, props)` → 0-3 scale

**Composition-aware layer** (`detectFailureWithComposition`): When `loadCompositions()` has been called, `detectFailure` automatically checks material-level thermal limits (criticalLimitC) from the composition data.

### 2.4 Type Definitions (TS stubs)

`tests/failure-engine.types.ts` provides TypeScript declarations for the engine (used in tests only).

### 2.5 F.U.S.E. Wiring into Arena

**Current state — TWO COMPLETELY SEPARATE SYSTEMS:**

| System | Location | F.U.S.E. Integration | Status |
|--------|----------|---------------------|--------|
| **Legacy arena (iframe)** | `public/arena.html` | FULL — calls `FailureEngine.detectFailure()`, runs `triggerFailureAnimation()`, renders failure analysis, pushes results via `postToReact()` | Functional but lives in an iframe |
| **React Arena (3D battle)** | `src/components/arena/*` | NONE — no import or reference to FailureEngine. Battle damage is purely formulaic (voltage/current/resistance → ATK/DEF). | Incomplete |

**The iframe-based arena** (`public/arena.html`, 9234 lines) is a complete standalone Three.js app that:
1. Loads components from JSON import
2. Renders 3D component models on a split stage (A vs B)
3. Calls `FailureEngine.detectFailure()` with real electrical metrics
4. Animates failure visuals (smoke, arc, melt, explosion particles)
5. Posts results back to React via `postToReact({ type: "arena:metrics-update" | "arena:fuse-event" | "arena:status" })`

**The React arena** (`src/components/arena/`) is a NEW 3D battle system that:
1. Reads session payload from localStorage
2. Converts components into battle "agents" with ATK/DEF/HP
3. Renders agents in a 360° Three.js scene
4. Runs a turn-based auto-battle with random target selection
5. **Does NOT call F.U.S.E. at any point**
6. Damage is purely formula-based (`battleMath.ts:computeDamage`) without failure simulation

### 2.6 Where Wiring is Missing

1. **`useArenaBattle.ts`** — `advanceBattle()` never calls `detectFailure()`. Damage is synthetic.
2. **`ArenaScene.tsx`** — No failure visual system. No particle effects for smoke/arc/melt/burst.
3. **`ArenaContext.tsx`** — Message bridge exists but `ArenaProvider` is never mounted; even if mounted, no React arena component reads FUSE events.
4. **`battleMath.ts`** — `computeDamage()` uses voltage/current/resistance as ATK multipliers but doesn't evaluate actual failure modes.
5. **No import path** from the React code to `public/js/component-failure-engine.js` (it's a plain JS IIFE, not an ES module).

---

## 3. 3D Battle Interface (360°)

### 3.1 New 3D Battle Interface (React)

**Location:** `src/components/arena/ArenaScene.tsx`

**Technology:** Vanilla Three.js (dynamic `import('three')` + `import('three/examples/jsm/controls/OrbitControls.js')`). NOT React Three Fiber (R3F).

**Scene Setup:**
- `PerspectiveCamera` at FOV 45°, initial position `(0, 17, 24)` → cinematic sweep to `(11, 8.5, 11)`
- `OrbitControls` (enabled only during "active" phase): pan disabled, damping enabled, distance 8-26, polar angle π/5 to π/2.05
- **360° orbit** around center target `(0, 1.8, 0)` — true 360° rotation
- Background: `#020617` with FogExp2
- Floor: circular mesh (radius 15) with grid overlay (30×30, blue/orange)
- Boundary ring: torus at radius 11

**Agent Rendering:**
- Each agent is a `THREE.Group` placed at `ARENA_RADIUS = 7.5` from center, evenly spaced by `spawnAngle`
- Each group contains: pedestal (cylinder), component core (built from `Component3DLibrary` geometry), outline ring (torus)
- Component geometry is procedural: shapes (box/cylinder/sphere/cone/torus) + leads from the `COMPONENT_3D_LIBRARY` definitions

**Animation Loop:**
- Cinematic camera transition (entering: 1800ms lerp, exiting: 900ms reverse)
- Ring rotation, particle rotation
- Active agent: elevated + bob animation
- Attack flash: emissive intensity pulse on actor/target (260ms/400ms)
- Health bars: projected 3D→2D screen-space positioned DOM elements
- Agent defeat: scale reduced to 0.92, health bar "is-defeated" class

**What's Functional:**
- Full 3D scene initialization and rendering
- Cinematic camera entry/exit
- Orbit controls (360° rotation)
- Component model generation from library
- Health bar projection
- Attack flash animation
- Resize handling (ResizeObserver)
- Cleanup/disposal

**What's Stubbed/Placeholder:**
- No failure visual system (no smoke, arc, melt, explosion particles)
- No damage impact effects beyond flash
- No component deformation on failure
- No sound system
- No camera auto-follow to active combatant

### 3.2 Old 2D Split-Screen Battle Interface

**Status: NOT PRESENT in the React codebase.**

The `public/arena.html` iframe app uses a split-screen layout with components at positions `{ A: -1.65, B: 1.65 }` — this is the **old approach** (side-by-side comparison view with detailed metric panels). However:
- It's a standalone HTML file, not integrated into the React render tree
- It's accessed via iframe from `useBuilderFrame.ts` (`handleArenaSync → export-arena`)
- It is NOT a "2D" interface — it actually uses Three.js for 3D rendering, but with a fixed split layout rather than 360° orbiting
- The new React ArenaScene.tsx fully replaces this with a circular arena layout and orbit controls

**The old iframe system is still functional** and used as the test/analysis tool (non-battle), while the new React arena is the battle/gameplay interface.

### 3.3 Camera Setup Summary

| Aspect | New React Arena | Old iframe Arena |
|--------|----------------|------------------|
| Camera type | PerspectiveCamera (FOV 45) | PerspectiveCamera (FOV 62) |
| Controls | OrbitControls (360°) | Custom drag-to-rotate (limited) |
| Position | Orbit at distance 8-26 | Fixed at ~(0, 4, 12) |
| Target | Center (0, 1.8, 0) | Center (0, 0, 0) |
| POV | Full 360° orbit | Restricted orbit via touch/mouse drag |

---

## 4. Integration Gaps

### 4.1 Data Flow Gaps

| Gap | File(s) | Current State | Needed |
|-----|---------|---------------|--------|
| **F.U.S.E. not importable as ES module** | `public/js/component-failure-engine.js` | IIFE exporting to `window.FailureEngine` or `module.exports` | ES module wrapper or dynamic import shim so React code can call `detectFailure()` |
| **No failure results in battle state** | `src/components/arena/useArenaBattle.ts` | `computeDamage()` uses only ATK/DEF formula | Should call `detectFailure()` with component metrics + test variables to determine damage type and severity |
| **ArenaContext never mounted** | `src/context/ArenaContext.tsx` | Provider defined but zero consumers | Either mount `ArenaProvider` in the tree, or remove/refactor. Currently the iframe message bridge is dead code for the React arena. |
| **Composition data not loaded into FUSE at React level** | `src/data/componentCompositions.ts` | TypeScript data available | Need to call `FailureEngine.loadCompositions(COMPONENT_COMPOSITIONS, MATERIAL_LIBRARY)` before battle starts |
| **Test variables not passed to battle** | `src/components/arena/types.ts` | `ArenaSessionPayload.testVariables` exists but `useArenaBattle` ignores it | Battle should use testVariables (voltage, temperature, frequency) to compute realistic metrics for FUSE |

### 4.2 Rendering Gaps

| Gap | File(s) | Current State | Needed |
|-----|---------|---------------|--------|
| **No failure particle system** | `ArenaScene.tsx` | Only has floating ambient particles | Need smoke, arc, melt, burst, explosion, flame, debris particle systems (cf. `arena.html` lines 4625-4780) |
| **No failure material deformation** | `ArenaScene.tsx` | Components are static geometry | Need `applyFailureVisuals()` equivalent: color shifts, emissive changes, scale deformation (cf. `arena.html` lines 4980-5180) |
| **No shockwave/explosion flash** | `ArenaScene.tsx` | Attack flash is only emissive intensity | Need expanding ring meshes and point-light flashes for critical failures |
| **No component-specific 3D models for failure** | `Component3DLibrary.ts` | Basic shapes only (resistor body + leads) | arena.html has `buildComponent()` with type-specific construction (capacitor dome, IC package, etc.) — React scene uses same library but simplified |
| **No damage number popups** | `ArenaScene.tsx` / `ArenaOverlay.tsx` | Damage only appears in log text | Visual 3D floating damage numbers at impact point would enhance UX |

### 4.3 State / Lifecycle Gaps

| Gap | File(s) | Current State | Needed |
|-----|---------|---------------|--------|
| **Battle doesn't incorporate F.U.S.E. severity into outcome** | `useArenaBattle.ts` | Random target, formula damage | FUSE severity should affect damage multiplier, trigger special animations, potentially cause instant-defeat |
| **No "failure cascade" mechanic** | `useArenaBattle.ts` + `battleMath.ts` | Pure turn-based damage | When a component "fails" (severity ≥ 2), it should trigger visual destruction and removal from battle |
| **No arena session recovery** | `ArenaView.tsx` | Reads payload once on mount | If user navigates away and back, session state (battle progress) is lost — only starting roster is persisted |
| **Transition between iframe arena and React arena** | `useBuilderFrame.ts`, `ArenaView.tsx` | Two separate systems | Need clear decision: iframe for analysis-only, React for battle-only? Or unify? |

### 4.4 Missing Components

| Component | Purpose | Notes |
|-----------|---------|-------|
| **FUSE ES module bridge** | Import FailureEngine into React code | Could be a thin wrapper: `import('./component-failure-engine.js')` or proper TS port |
| **Failure visual system** | Particle emitters + material mutations for ArenaScene | The logic exists in arena.html (~600 lines); needs porting to the React Three.js scene |
| **Battle result overlay** | Win/loss screen with FUSE analysis | `arena.html` has `showBattleResultOverlay()` + `renderBattleResult()`; React ArenaOverlay only shows winner name |
| **Run history panel** | Historical battle results | `arena.html` tracks `state.runHistory` (capped at 20); React arena has no equivalent |
| **ArenaProvider integration** | Mount the context provider | Either wire into `App.tsx` provider tree or delete dead code |

### 4.5 Type Mismatches

| Issue | Location | Details |
|-------|----------|---------|
| **FailureEngine has no TS types in src/** | Only `tests/failure-engine.types.ts` | Need `src/types/failure-engine.d.ts` or equivalent for type-safe imports |
| **Arena agent metrics vs FUSE metrics** | `ArenaBattleAgentMetrics` has {voltage, current, resistance, power} but `detectFailure` expects {powerDissipation, currentRms, thermalRise, impedance, storedEnergy, ...} | Metric shape mismatch requires adapter |
| **ArenaOutboundMessage union type** | `src/types/manufacturer-component.ts` (line ~230) | Messages from iframe arena (fuse-event, metrics-update, status) are typed but never received by the React battle system |

---

## 5. Build / Runtime State

### 5.1 npm install

```
up to date, audited 372 packages in 15s
78 packages are looking for funding
11 vulnerabilities (2 moderate, 9 high)
```

### 5.2 npm run build (Vite production build)

**Result: SUCCESS** (`✓ built in 42.21s`)

Key output bundles:
- `three-vendor-jeZ2mjpG.js` — 718.42 kB (three.js)
- `index-ytzLpEgU.js` — 432.19 kB (main app)
- `Builder-D-rnn28q.js` — 367.01 kB (builder page)
- `OrbitControls-fnLG2s0Q.js` — 19.12 kB (arena orbit controls)

### 5.3 npm test (Vitest)

**Result: ALL PASS** — 22 test files, 462 tests, 0 failures.

Key arena tests:
- `tests/arenaBattle.test.ts` (3 tests) — roster building, damage computation, payload coercion
- `tests/arena-routing-guard.test.ts` (3 tests) — verifies no standalone `/arena` route, uses workspace panel
- `tests/componentFailureEngine.test.ts` — FailureEngine family resolution, detection, registration

### 5.4 TypeScript (tsc --noEmit)

**Result: 175 errors** (all in 3 files unrelated to arena):
- `src/schematic/threeFactory.ts` — 172 errors: literal type mismatch (`0.16` not assignable to `0.12`)
- `src/ui/wire-drawer.tsx` — 2 errors: unused `@ts-expect-error` + unused variable
- `src/utils/practiceSolver.ts` — 1 error: unused import

**No TypeScript errors in any arena files.**

### 5.5 npm run dev

**Result: SUCCESS** — Vite dev server starts on port 3001 (3000 was in use).
No runtime errors on startup. Arena route is accessed via Builder workspace panel (no standalone route).

---

## 6. Architectural Observations

### 6.1 Current Architecture (Dual System)

The codebase has **two parallel arena implementations** that were never unified:

```
┌─────────────────────────────────────────────────────┐
│ PUBLIC/ARENA.HTML (iframe)                           │
│ • Full 3D scene with Three.js                       │
│ • Split A/B comparison view                         │
│ • FUSE integration (detectFailure + animations)     │
│ • Metrics computation and display                   │
│ • Run history                                       │
│ • Battle result determination                       │
│ • postMessage bridge → React                        │
└─────────────┬───────────────────────────────────────┘
              │ postMessage (currently unused by React arena)
┌─────────────▼───────────────────────────────────────┐
│ SRC/COMPONENTS/ARENA/* (React)                       │
│ • 360° 3D battle scene with Three.js               │
│ • Multi-agent circular arena (not split A/B)        │
│ • Turn-based auto-battle with ATK/DEF/HP           │
│ • NO FUSE integration                              │
│ • NO failure visuals                               │
│ • Reads session payload from localStorage          │
└─────────────────────────────────────────────────────┘
```

### 6.2 Assessment

The React arena (`src/components/arena/`) is architecturally **sound** and on a good path:
- Clean component decomposition (View → Scene + Overlay)
- Proper separation of concerns (battle logic in hook, rendering in scene)
- Type-safe TypeScript throughout
- Three.js dynamic import for code-splitting
- Proper cleanup/disposal patterns
- ResizeObserver-based responsive rendering
- Cinematic camera transitions
- Agent placement system supports 2-6 combatants

However, it is **incomplete** — it has the shell of a battle but none of the physics-based failure simulation that makes it meaningful.

### 6.3 Recommendation: **Continue Current Approach + Port FUSE Bridge**

**Do NOT redesign.** The React arena architecture is correct. What's needed is:

1. **Create an ES module wrapper** for `component-failure-engine.js` (thin adapter, not a rewrite)
2. **Add FUSE detection into `useArenaBattle`** — after each "attack", run `detectFailure()` with the target's metrics to determine if a failure cascades
3. **Port the failure visual system** from `arena.html` (lines ~4600-5200) into ArenaScene.tsx as a utility module
4. **Remove or repurpose** the iframe bridge (`ArenaContext.tsx`) — the React arena doesn't need it since FUSE runs in-process

**Estimated effort:** Medium. The hardest part is porting the ~800 lines of failure animation code from vanilla JS to the React Three.js scene's render loop.

---

## 7. Risks & Unknowns

### 7.1 Unresolved Questions

| # | Question | Impact |
|---|----------|--------|
| 1 | Is the iframe arena (`public/arena.html`) still needed for non-battle analysis, or should all functionality move to React? | Determines whether to maintain both or deprecate iframe |
| 2 | Should FUSE severity directly influence battle damage (modifier) or trigger separate "failure events" (component destruction)? | Core game design decision |
| 3 | What's the intended relationship between the "compare" mode (iframe) and the "battle" mode (React)? Are they different features or replacing each other? | Feature scope |
| 4 | The 175 TypeScript errors in `threeFactory.ts` — are these from a recent refactor? They block strict CI but don't affect arena. | Build pipeline risk |
| 5 | Should the React arena support the same "test variables" (voltage, temperature) as the iframe arena, or derive them from the circuit state? | Data flow design |
| 6 | Is there a multiplayer/real-time component planned, or is this purely local auto-battle? | Architecture scope |
| 7 | The `Component3DLibrary` has basic shapes only — should arena components use more detailed models (e.g. GLTF/OBJ imports)? | Visual fidelity vs performance trade-off |

### 7.2 Technical Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Performance of failure particles on mobile (Capacitor) | High | Use `mobilePerformance.ts` utilities; cap particle count; LOD system |
| FailureEngine is vanilla JS — no tree-shaking, large payload | Medium | Lazy-load only when entering arena; consider extracting detection-only subset |
| Two parallel Three.js scenes (builder schematic + arena) competing for GPU | Medium | Ensure builder scene is fully disposed when arena opens |
| Loss of iframe arena's run-history and export features | Low | Port to React or accept that battle arena is a separate feature |

---

## Executive Summary

The Arena + F.U.S.E. + 3D battle integration is approximately **40% complete**:

- **Done:** React 3D battle scene (360° orbit, multi-agent, cinematic transitions, health system, turn-based combat, session import)
- **Done:** F.U.S.E. engine (fully operational in standalone form with 15+ failure modes, composition-aware detection)
- **NOT Done:** FUSE wired into React battle (the critical missing link)
- **NOT Done:** Failure visual system in React scene (particles, deformation, explosions)
- **NOT Done:** ArenaContext / message bridge integration

The build passes, all tests pass, and the dev server starts cleanly. The codebase is in good shape for the next phase of work.
