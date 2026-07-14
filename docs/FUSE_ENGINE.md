# FUSE™ — Failure Understanding Simulation Engine  v2.0

> **FUSE™ is a proprietary, zero-dependency component failure detection and visualization engine built exclusively for CircuiTry3D.**
>
> Copyright © 2025 Mitchell Lorin / CircuiTry3D.  All Rights Reserved.  FUSE™ is a trademark of CircuiTry3D.
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

## Proprietary Technology Status

FUSE™ is CircuiTry3D's core intellectual property.  Its key protectable elements include:

1. **Component failure-profile system** — the per-family trigger/severity/visual architecture
2. **Insulation-class thermal cascade model** — real-time burnthrough detection across 11 insulation classes
3. **Gauge-accurate wire stress detection** — AWG-resolved ampacity and resistance physics
4. **Composition-aware material thresholds** — integration of material melting points and thermal mass from `ComponentCompositions`

### Licensing

Commercial licensing, OEM embedding, and developer API partnerships are available:
- **Contact:** licensing@circuitry3d.com
- **npm package:** `@circuitry3d/fuse-engine` *(future)*
- **SaaS API:** `POST /api/fuse/detect` *(future)*

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

| Key | Description | Used for |
|---|---|---|
| `char` | Orange fire flicker, rising smoke particles | Thermal overload, bearing seizure, phosphor degradation |
| `melt` | Molten orange-red drips falling under gravity | Drain current burnout, thermal runaway, BJT / MOSFET failure |
| `arc` | Blue-white electrical discharge, rapid flicker | Avalanche breakdown, contact arcing, ESD punch-through, insulation burnthrough |
| `burst` | Explosion debris cloud + fire layer + smoke layer | Capacitor dielectric breakdown, electrolyte boilover |
| `blowout` | White-hot flash → fade to black | LED junction burnout, fuse element melting, filament burnout |
| `vent` | Warm amber gas rising under buoyancy | Battery thermal venting, electrolyte decomposition |
| `glow` | Deep red thermal glow, slow pulse | Heatsink saturation, thermistor self-heating |
| `smoke` | Grey drift particles rising slowly | Winding burnout, coil failure, insulation carbonization, wire overcurrent |

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

FUSE™ ships with physics-accurate failure profiles for **21 component families** covering more than 35 named failure modes:

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
| **Wire** | Overcurrent / Conductor Heating, Insulation Burnthrough, Dielectric Overstress *(new in v2.0)* |
| **Generic** | Thermal Overload, Power Dissipation Limit |

---

## Physical Specification Tables  *(new in FUSE™ v2.0)*

FUSE™ v2.0 ships three canonical physical spec tables that make it the **single source of truth** for all component and wire physics across the entire application.

### `WIRE_INSULATION_SPECS`

Maps the 11 supported insulation classes to their full physical, visual, and electrical specifications.  This table is now loaded by `legacy.html` directly from `window.FailureEngine.WIRE_INSULATION_SPECS` — eliminating duplication between the FUSE engine and the 3D renderer.

| Class | Temp Limit | Max Voltage | Dielectric Strength | Description |
|---|---|---|---|---|
| `pvc80` | 80 °C | 600 V | 15 kV/mm | Standard PVC building / hook-up wire |
| `pvc105` | 105 °C | 600 V | 15 kV/mm | Thick PVC for control and battery leads |
| `xlpe125` | 125 °C | 600 V | 25 kV/mm | THHN / THWN-2 cross-linked polyethylene |
| `silicone200` | 200 °C | 600 V | 20 kV/mm | High-flex silicone for robotics / test leads |
| `ptfe260` | 260 °C | 600 V | 60 kV/mm | Thin-wall PTFE for aerospace and vacuum |
| `bare1200` | 1200 °C | 0 V | 0 kV/mm | No jacket — bare resistance wire |
| `epdm150` | 150 °C | 600 V | 30 kV/mm | EPDM rubber welding cable |
| `tpe105` | 105 °C | 300 V | 18 kV/mm | TPE for appliance cords |
| `fiberglass482` | 482 °C | 600 V | 5 kV/mm | Braided glass for kilns and furnaces |
| `kapton400` | 400 °C | 1000 V | 300 kV/mm | Polyimide for aerospace and cryogenics |
| `neoprene90` | 90 °C | 300 V | 10 kV/mm | Neoprene for marine / industrial cords |

Each entry also carries `densityKgPerM3`, `thermalConductivityWPerMK`, `necType`, and `description`.

### `WIRE_GAUGE_TABLE`

Physics-accurate per-gauge conductor data for all standard AWG sizes (30 AWG to 4/0 AWG).  All resistance values assume annealed copper at 20 °C per IEC 60228 / ASTM B3.  Ampacity values are NEC Table 310.16 (75 °C column).

```js
// Example entry — 14 AWG
{ awg: 14, conductorDiameterMm: 1.628, areaMm2: 2.082,
  resistanceOhmPerMeter: 0.00829, ampacityChassisA: 5.9, ampacityBundleA: 15 }
```

Wire failure detection in FUSE™ v2.0 automatically looks up `ampacityChassisA` from this table when `props.awg` is set, removing the dependency on the external `wireLibrary.ts` for physics calculations.

### `COMPONENT_PHYSICAL_SPECS`

Real-world physical and thermal reference data for all 23 component families (including `generic`).  Drives 3D rendering dimension hints, absolute maximum temperature thresholds, and the "what is physically happening" narrative in FUSE™ failure descriptions.

```js
// Example entry — resistor
{
  commonPackages: ['axial-0204', 'axial-0207', 'smd-0402', ...],
  typicalBodyMm:  { length: 3.5, diameter: 1.5 },
  junctionLimitC: 155,
  absoluteMaxTempC: 175,
  description: "Carbon film or metal film resistor on alumina ceramic substrate..."
}
```

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
            │     ├─ wire modes: auto-lookup WIRE_INSULATION_SPECS[props.insulationClass]
            │     └─ wire modes: auto-lookup WIRE_GAUGE_TABLE by props.awg
            ├─ enrich with COMPONENT_PHYSICAL_SPECS[family]
            ├─ enrich with ComponentCompositions material thresholds
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

## Version History

| Version | Changes |
|---|---|
| **2.0.0** | Physical spec tables (WIRE_INSULATION_SPECS, WIRE_GAUGE_TABLE, COMPONENT_PHYSICAL_SPECS). voltage_overstress wire mode. Wire overcurrent auto-resolves AWG ampacity. legacy.html sources WIRE_INSULATION_SPECS from FUSE (single source of truth). Proprietary copyright/trademark header. |
| **1.0.0** | Initial release: 18 component families, composition-aware detection, registerComponentType / registerFailureProfile runtime API. |

---

## Version History

| Version | Changes |
|---|---|
| **2.0.0** | Added `WIRE_INSULATION_SPECS`, `WIRE_GAUGE_TABLE`, and `COMPONENT_PHYSICAL_SPECS` physical spec tables. Added `voltage_overstress` wire failure mode. Wire overcurrent now auto-looks-up AWG ampacity. `legacy.html` now sources `WIRE_INSULATION_SPECS` from FUSE engine (single source of truth). Added proprietary copyright/trademark header. |
| **1.0.0** | Initial release: 18 component families, composition-aware detection, `registerComponentType` / `registerFailureProfile` runtime API. |

---

## Source Files

| File | Role |
|---|---|
| `public/js/component-failure-engine.js` | Core FUSE™ engine — physical spec tables, component families, failure profiles, `detectFailure()` |
| `public/js/component-compositions.js` | Material library and sub-component compositions — integrated via `loadCompositions()` |
| `public/legacy.html` | 3D Builder integration — `buildFailureMetrics()`, `applyAllWorkspaceFailures()`, `createWorkspaceParticles()` |
| `public/arena.html` | Component Arena integration — stress test runner, failure cards, Arena particle effects |
| `src/data/wireLibrary.ts` | React-side wire catalogue (gauges, manufacturers, presets) — UI layer above FUSE gauge physics |

---

## Related Documentation

- [COMPONENT_REFERENCE.md](./COMPONENT_REFERENCE.md) — Electrical component theory and specifications
- [CIRCUIT_SIMULATION_REFERENCE.md](./CIRCUIT_SIMULATION_REFERENCE.md) — DC solver and visualization system
- [circuit-error-outcomes.md](./circuit-error-outcomes.md) — Error handling and validation feedback
