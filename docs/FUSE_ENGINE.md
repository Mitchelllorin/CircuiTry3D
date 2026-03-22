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

---

## Supported Component Families (v2.0 — 23 families, 35+ failure modes)

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
| **Wire** | Overcurrent / Conductor Heating, Insulation Burnthrough, Dielectric Overstress *(v2.0)* |
| **Generic** | Thermal Overload, Power Dissipation Limit |

---

## Physical Specification Tables *(new in FUSE™ v2.0)*

### `WIRE_INSULATION_SPECS` — 11 insulation classes with full physical data
### `WIRE_GAUGE_TABLE` — 20 AWG sizes (30 AWG → 4/0) with IEC 60228 resistance + NEC ampacity
### `COMPONENT_PHYSICAL_SPECS` — 23 families with package data, junction limits, absolute max temps

---

## Version History

| Version | Changes |
|---|---|
| **2.0.0** | Physical spec tables (WIRE_INSULATION_SPECS, WIRE_GAUGE_TABLE, COMPONENT_PHYSICAL_SPECS). voltage_overstress wire mode. Wire overcurrent auto-resolves AWG ampacity. legacy.html sources WIRE_INSULATION_SPECS from FUSE (single source of truth). Proprietary copyright/trademark header. |
| **1.0.0** | Initial release: 18 component families, composition-aware detection, registerComponentType / registerFailureProfile runtime API. |

---

## Source Files

| File | Role |
|---|---|
| `public/js/component-failure-engine.js` | Core FUSE™ engine |
| `public/js/component-compositions.js` | Material library |
| `public/legacy.html` | 3D Builder integration |
| `public/arena.html` | Component Arena integration |
| `src/data/wireLibrary.ts` | React-side wire catalogue (UI layer) |
