# FUSE™ — Failure Understanding Simulation Engine

> **FUSE™ is a proprietary, zero-dependency component failure detection and visualization engine built exclusively for CircuiTry3D.**
>
> No other circuit simulator on the market does what FUSE™ does.

---

## What FUSE™ Is

FUSE™ is a custom JavaScript library (`public/js/component-failure-engine.js`) that evaluates every component in a live circuit against a hand-crafted, physics-based failure profile — every single simulation tick.  It produces:

- A **failure name** (e.g. *Thermal Runaway*, *Avalanche Breakdown*, *Electrolyte Boilover*)
- A **severity score** from 0 to 3
- A **visual effect key** that drives the Three.js particle renderer
- A **physical description** of exactly what is happening inside the component at the atomic/material level

FUSE™ is shared across both platforms in CircuiTry3D:

| Platform | How FUSE™ is used |
|---|---|
| **3D Circuit Builder** (`/app`) | Runs on every sim tick; renders failure badges + multi-layer particle effects directly on the 3D component |
| **Component Arena** (`/arena`) | Runs stress tests and renders a full failure analysis card with the failure name, description, severity, and particle animations |

---

## Why FUSE™ Is a Genuine Differentiator

Every major circuit simulator — Falstad, TinkerCAD Circuits, Multisim, LTspice — shows you what a circuit does **when it works.**  None of them show you what happens **when it fails.**

FUSE™ fills that gap entirely.  When a student wires a circuit that overloads an LED or short-circuits a capacitor, they don't just get a warning message.  They see:

- The component **spark, smoke, melt, or explode** in the 3D view
- A badge on the nameplate showing **exactly how severe the failure is**
- In the Arena, a detailed card explaining *why* the failure happened and *what is physically happening inside the component right now*

That is a fundamentally different learning experience than any other tool offers.

---

## Severity Scale

| Level | Label | Meaning |
|---|---|---|
| 0 | **OK** | Component is operating within rated limits |
| 1 | **Stressed** | Approaching limits; performance may degrade |
| 2 | **Critical** | Limits exceeded; failure is imminent or occurring |
| 3 | **Destroyed** | Component is permanently damaged; circuit is broken |

---

## Visual Effect Types

FUSE™ maps each failure mode to a renderer visual key.  The 3D Builder and Arena both render these using layered Three.js `Points` particle systems with physics-accurate gravity, turbulence, opacity fade, and animated flicker.

| Key | Description | Used for |
|---|---|---|
| `char` | Orange fire flicker, rising smoke particles | Thermal overload, bearing seizure, phosphor degradation |
| `melt` | Molten orange-red drips falling under gravity | Drain current burnout, thermal runaway, BJT / MOSFET failure |
| `arc` | Blue-white electrical discharge, rapid flicker | Avalanche breakdown, contact arcing, ESD punch-through |
| `burst` | Explosion debris cloud + fire layer + smoke layer | Capacitor dielectric breakdown, electrolyte boilover |
| `blowout` | White-hot flash → fade to black | LED junction burnout, fuse element melting, filament burnout |
| `vent` | Warm amber gas rising under buoyancy | Battery thermal venting, electrolyte decomposition |
| `glow` | Deep red thermal glow, slow pulse | Heatsink saturation, thermistor self-heating |
| `smoke` | Grey drift particles rising slowly | Winding burnout, coil failure, insulation carbonization |

Additional effects exclusive to the **Component Arena**:

| Effect | Description |
|---|---|
| Flame | Sustained fire animation above the component |
| Explosion | Full burst with shockwave ring |
| Debris | Physical fragment particles |
| Shockwave flash | Full-screen flash on catastrophic failure |
| Camera shake | Workspace camera jolts on explosion-class events |

---

## Supported Component Families

FUSE™ ships with physics-accurate failure profiles for **18 component families** covering more than 30 named failure modes:

| Family | Named Failure Modes |
|---|---|
| **Resistor** | Thermal Overload, Temperature Limit Exceeded |
| **Capacitor** | Dielectric Breakdown, Electrolyte Boilover |
| **LED** | Junction Burnout, Phosphor Degradation |
| **Diode** | Forward Current Burnout, Reverse Avalanche |
| **Zener Diode** | Zener Punch-Through |
| **BJT** | Collector Current Burnout, Vce Avalanche Breakdown, Thermal Runaway |
| **MOSFET** | Drain Current Burnout, Avalanche Breakdown, Thermal Runaway / Second Breakdown |
| **Op-Amp** | Input Stage Latch-Up, Output Stage Burnout |
| **Voltage Regulator** | Thermal Shutdown / Burnout, Current Limit Latch-Off |
| **IC / Microcontroller** | Supply Overvoltage / ESD, Thermal Die Failure |
| **Battery** | Thermal Venting, Electrolyte Decomposition |
| **Switch** | Contact Arcing / Welding, Contact Overheating |
| **Relay** | Coil Burnout, Contact Welding |
| **Inductor** | Winding Insulation Failure |
| **Heatsink** | Thermal Saturation |
| **Fuse** | Fuse Element Melts |
| **Lamp** | Filament Burnout |
| **Motor** | Winding Burnout, Bearing Seizure |
| **Thermistor** | Self-Heating Deviation |
| **Transformer** | Winding Insulation Breakdown |
| **Crystal Oscillator** | Crystal Drive Overdrive |
| **Generic** | Thermal Overload, Power Dissipation Limit |

---

## How FUSE™ Works Technically

### The Detection Pipeline

```
Simulation tick
    └─► buildFailureMetrics(component, runtimeMetrics)
            ├─ powerDissipation  (W)
            ├─ currentRms        (A)
            ├─ operatingVoltage  (V)
            ├─ thermalRise       (°C above ambient)
            ├─ impedance         (Ω)
            └─ storedEnergy      (J)
                    │
                    ▼
        FailureEngine.detectFailure(component, metrics)
            ├─ resolveComponentFamily(component.type)
            ├─ look up COMPONENT_FAILURE_PROFILES[family]
            ├─ evaluate each mode's trigger(metrics, props)
            └─ return worst-case { failed, severity, name, visual, description, family }
                    │
                    ▼
        applyAllWorkspaceFailures()
            ├─ severity > 0  →  show nameplate badge
            ├─ severity ≥ 1.5  →  createWorkspaceParticles(component, visual)
            └─ severity ≥ 2  →  camera shake / explosion flash (burst/blowout modes)
```

### Zero Dependencies

`component-failure-engine.js` has **no runtime dependencies** — no Three.js, no DOM, no npm packages.  It is a plain IIFE that exports `window.FailureEngine` in a browser and `module.exports` in Node.js (for testing).  This means:

- It loads in any context: browser, Node.js test runner, future server-side validation
- It is trivially portable if CircuiTry3D ever adds a native app, a server-side grader, or a third-party API

### Extensibility

Third-party component types can register custom profiles at runtime using two public APIs:

```js
// Register a new component type → family mapping
FailureEngine.registerComponentType('my-sensor', 'ic');

// Register a custom failure profile for a type
FailureEngine.registerFailureProfile('my-sensor', {
  overheat: {
    name: "Sensor Meltdown",
    visual: "melt",
    physicalDescription: "...",
    trigger: (metrics) => metrics.thermalRise > 60,
    severity: (metrics) => Math.min((metrics.thermalRise - 60) / 20, 3),
  }
});
```

---

## How to Capitalize on FUSE™

### 1. Gate Full FUSE™ Analysis Behind Paid Plans

The most direct monetization path.  Free users see a generic "⚠ Overloaded" badge.  Paid users see the full failure name, severity score, physical description, and particle animations.

| Plan | FUSE™ Access |
|---|---|
| Free Sandbox | Severity badge only |
| Student Plan | Full failure name + visual effects |
| Educator License | Full analysis + physical descriptions + Arena access |
| Institutional | All of the above + custom component profiles |

### 2. Use It as the Primary Marketing Hook

FUSE™ answers a question every electronics teacher has: *"How do I show students what actually happens when they wire this wrong — without destroying real hardware?"*

That is a compelling, concrete, unique value proposition.  Lean into it:

- **Hero headline:** *"The only circuit simulator that shows you what happens when it fails."*
- **Demo video:** build a simple LED circuit, crank the voltage, watch the junction burn out in 3D
- **Comparison table:** list Falstad, TinkerCAD, Multisim — all "✗ No failure simulation" — CircuiTry3D — "✓ FUSE™ real-time failure detection"

### 3. Target the CTE / Safety Education Market

Career & Technical Education (CTE) programs, vocational schools, and electronics safety courses need to teach students what component failure looks like.  FUSE™ provides that without needing a lab full of sacrificial components.  This maps directly to:

- The **Institutional License** tier
- Grant-funded school purchases
- Safety compliance training programs

### 4. Surface FUSE™ as a Named Brand in the App

Every time FUSE™ triggers, say so.  In the failure badge, in the Arena header, in status messages:

- *"FUSE™ detected: Junction Burnout — severity 2/3"*
- *"Powered by FUSE™"* in the Arena footer
- The branded acronym reinforces that this is CircuiTry3D's proprietary technology, not a commodity feature

### 5. Open FUSE™ as a Developer API (Future)

Because `component-failure-engine.js` is zero-dependency and self-contained, you could package it as an npm module (`@circuitry3d/fuse-engine`) and license it to:

- Other educational platforms
- Hardware-in-the-loop simulation systems
- Electronics e-commerce sites (show "what happens if you misuse this component")

This turns a feature into a product line.

---

## Source Files

| File | Role |
|---|---|
| `public/js/component-failure-engine.js` | Core FUSE™ engine — component families, failure profiles, `detectFailure()` |
| `public/legacy.html` | 3D Builder integration — `buildFailureMetrics()`, `applyAllWorkspaceFailures()`, `createWorkspaceParticles()` |
| `public/arena.html` | Component Arena integration — stress test runner, failure cards, Arena particle effects |

---

## Related Documentation

- [COMPONENT_REFERENCE.md](./COMPONENT_REFERENCE.md) — Electrical component theory and specifications
- [CIRCUIT_SIMULATION_REFERENCE.md](./CIRCUIT_SIMULATION_REFERENCE.md) — DC solver and visualization system
- [circuit-error-outcomes.md](./circuit-error-outcomes.md) — Error handling and validation feedback
