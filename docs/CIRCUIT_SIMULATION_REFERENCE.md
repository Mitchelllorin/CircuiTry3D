# Circuit Simulation Reference (DC Wiring Logic)

This project’s wiring logic is split into two layers:

- **Topology (wires/nodes/junctions)**: determines *what is connected to what*.
- **Physics (Ohm + Kirchhoff)**: determines *what current/voltage can exist* given that connectivity.

This document defines the **standard rules** we use so current flow is correct and repeatable.

## Rule #1 (Standard Direction Convention)

We use **conventional current** as the default direction convention:

- **Conventional current flows from higher potential (+) to lower potential (−) through passive parts**.
- Electron flow is the opposite and is only a visualization mode.

### Element orientation rules

To keep “direction” deterministic, every two‑terminal element has an orientation:

- **Passive two-terminal parts** (`resistor`, `lamp`):
  - Current \(I\) is defined **positive** when it flows **`start → end`**.
  - \(I = (V_{start} - V_{end}) / R\)
- **Battery / DC source** (`battery`):
  - In our schematic geometry, `start` is the **negative** terminal and `end` is the **positive** terminal (this matches how the battery is drawn).
  - The source enforces \(V_{pos} - V_{neg} = V_s\).
  - Internally (through the source), the solver’s current variable is defined from **positive → negative** (standard MNA convention). A real battery *delivering power* will typically have a **negative** value under this convention.
- **Wires** (`wire`):
  - Each polyline segment `path[i] → path[i+1]` is modeled as an **ideal short (0 V source)** so we can still solve segment currents.
  - Segment current is **positive** when flowing **`path[i] → path[i+1]`**.

These conventions are implemented in `src/sim/dcSolver.ts`.

## Core Laws Used (DC)

### Ohm’s Law

\[
V = I R
\]

For resistive parts (resistors, lamps modeled as resistors):

- \(I = (V_a - V_b)/R\)
- \(P = VI = I^2R = V^2/R\)

### Kirchhoff’s Current Law (KCL)

At every node (junction), the algebraic sum of currents is zero:

\[
\sum_k I_k = 0
\]

This is what prevents “current flow in open circuits”: if there is no closed conductive path, the only KCL-consistent solution is \(I = 0\).

### Kirchhoff’s Voltage Law (KVL)

Around any closed loop, the algebraic sum of voltage changes is zero:

\[
\sum_k \Delta V_k = 0
\]

In practice we enforce KVL using voltage-source constraints and node voltages (Modified Nodal Analysis).

## Solver Method: Modified Nodal Analysis (MNA)

The DC solver uses **Modified Nodal Analysis**:

- Unknowns:
  - Node voltages (relative to a chosen reference node, usually Ground)
  - Currents through ideal voltage sources (including 0 V shorts for wires)
- Equations:
  - KCL at each node
  - Voltage constraints for each voltage source

This approach is robust for branched networks and guarantees:

- **Open circuit ⇒ 0 A**
- **Consistent direction signs** for every element and wire segment

## “Wire Wheel” / Conductor Resistance (Optional)

For real wiring, conductor resistance can be computed from geometry/material:

\[
R = \rho \frac{L}{A}
\]

Where:

- \( \rho \) is resistivity (Ω·m)
- \(L\) is length (m)
- \(A\) is cross-sectional area (m²)

This project includes an educational wire library with computed \(R\) per meter in:

- `src/data/wireLibrary.ts`

Right now, schematic wires are treated as ideal shorts for clarity and stable educational behavior. If/when we want “voltage drop on long wires”, the solver can be extended to stamp wire segments as resistors using the library’s `resistanceOhmPerMeter`.

## What's Explicitly Not Modeled (Yet)

To keep the solver deterministic and linear, these are currently treated as open/nonlinear and are not solved in DC:

- `diode` (nonlinear I–V)
- `bjt` (nonlinear multi-terminal)
- `capacitor` (open at DC steady state; transient would require time-domain solving)
- `switch` (needs an explicit open/closed state in the schematic model)

## Physics-Based Current Flow Visualization

The current flow animation system maps electrical quantities to visual properties that accurately represent real circuit behavior:

### Particle Speed ~ Drift Velocity

Particle movement speed scales with current magnitude using logarithmic scaling:

- **Low current (< 1mA)**: Slow, barely perceptible movement
- **Medium current (100mA)**: Moderate, clearly visible flow
- **High current (> 1A)**: Fast, energetic particle movement

This reflects how drift velocity increases with current: \( v_d = \frac{I}{nAq} \)

### Particle Density ~ Charge Carrier Count

More particles appear when current is higher, representing increased charge flow:

- Higher current = more visible "charge carriers" flowing through wires
- Particle count scales with \(\sqrt{I}\) to prevent visual overload at high currents
- Minimum of 2 particles per path ensures visibility even at low currents

### Particle Direction ~ Current Direction

- **Conventional current mode**: Particles flow positive → negative (standard engineering convention)
- **Electron flow mode**: Particles flow negative → positive (actual electron movement)

The animation direction is determined by the solved current sign from the MNA solver:
- Positive current through a wire segment = forward direction
- Negative current = reverse direction

### Per-Segment Current

Each wire segment can have different current values (important for parallel branches):

- The DC solver calculates current through every wire segment
- Animation uses these per-segment values for accurate visualization
- Parallel branches show different particle densities/speeds based on actual current division

### Power Dissipation Visualization (P = I²R)

Components glow based on their power dissipation:

| Power Level | Visual Effect | Color |
|-------------|---------------|-------|
| < 0.001 W | No glow | Gray |
| 0.001 - 0.01 W | Slight warmth | Gray-warm |
| 0.01 - 0.1 W | Warm glow | Orange |
| 0.1 - 0.5 W | Bright glow | Orange-red |
| 0.5 - 2 W | Hot glow | Red |
| > 2 W | Critical (overheating) | Bright red |

This helps students understand:
- Where energy is being dissipated in the circuit
- Why high-current paths through resistors generate heat
- The relationship between current, resistance, and power

### Voltage Potential Visualization

Node voltages are visualized using:

- **Color gradient**: Blue (negative) → Gray (0V) → Green (low) → Yellow → Red (high)
- **Height offset**: Higher voltage = higher visual position (represents potential energy)
- **Glow intensity**: Higher voltage magnitude = brighter indicator

This helps students visualize:
- Where potential energy is stored in the circuit
- Voltage drops across components
- The concept of electrical potential


