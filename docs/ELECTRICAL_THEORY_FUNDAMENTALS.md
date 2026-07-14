# Electrical Theory Fundamentals

This document is the **authoritative source of truth** for electrical theory within CircuiTry3D. It provides instructor-level knowledge for implementing accurate circuit simulation, creating educational content, and ensuring all platform features align with established electrical engineering principles.

**Related Documentation:**
- [CIRCUIT_RULES.md](./CIRCUIT_RULES.md) — Platform-specific implementation rules
- [CIRCUIT_SIMULATION_REFERENCE.md](./CIRCUIT_SIMULATION_REFERENCE.md) — DC solver technical details
- [CIRCUIT_ANALYSIS_METHODS.md](./CIRCUIT_ANALYSIS_METHODS.md) — Advanced analysis techniques
- [COMPONENT_REFERENCE.md](./COMPONENT_REFERENCE.md) — Component-specific theory
- [FORMULAS_QUICK_REFERENCE.md](./FORMULAS_QUICK_REFERENCE.md) — Formula lookup table

---

## Part 1: Core Electrical Quantities

### 1.1 What is Electricity?

Electricity is the flow of electrons through a conductive material. At the atomic level, electrons in the outer shells of conductive materials (like copper) can move freely when energy is applied. This movement of charge carriers constitutes electric current.

**Key principle**: Electricity always seeks the path of least resistance to complete a circuit back to its source.

### 1.2 The Four Pillars: Voltage, Current, Resistance, and Power

CircuiTry3D uses the **W.I.R.E. system** (Watts, Current, Resistance, Voltage) to teach these fundamental quantities.

#### Voltage (V or E) — Electromotive Force

| Property | Value |
|----------|-------|
| **Definition** | The electrical pressure or potential difference that pushes electrons through a circuit |
| **Unit** | Volt (V) |
| **Analogy** | Water pressure in a pipe system |
| **Symbol** | V or E (electromotive force) |
| **Measured with** | Voltmeter (connected in parallel) |

**Key facts:**
- Voltage is always measured between two points (potential difference)
- A 9V battery has 9 volts of potential difference between its terminals
- Voltage can exist without current (an open circuit has voltage but no current flow)
- Common voltage levels: 1.5V (AA battery), 9V (9V battery), 12V (car battery), 120V/240V (household)

**CircuiTry3D Implementation:** See [CIRCUIT_RULES.md](./CIRCUIT_RULES.md) Rule C3D-003 for grounded reference requirements.

#### Current (I) — Electron Flow

| Property | Value |
|----------|-------|
| **Definition** | The rate of electron flow through a conductor |
| **Unit** | Ampere or Amp (A) |
| **Analogy** | Water flow rate (gallons per minute) |
| **Symbol** | I (from "Intensité" in French) |
| **Measured with** | Ammeter (connected in series) |

**Key facts:**
- 1 Ampere = 1 Coulomb of charge passing a point per second
- 1 Coulomb ≈ 6.24 × 10¹⁸ electrons
- Current requires a complete circuit to flow
- Conventional current flows from positive to negative; electron flow is the opposite
- Milliamps (mA) = 1/1000 of an amp; common in electronics

**CircuiTry3D Implementation:** See [CIRCUIT_RULES.md](./CIRCUIT_RULES.md) Rule C3D-005 for current direction conventions.

#### Resistance (R) — Opposition to Flow

| Property | Value |
|----------|-------|
| **Definition** | The opposition to current flow in a circuit |
| **Unit** | Ohm (Ω) |
| **Analogy** | Narrow section of pipe restricting water flow |
| **Symbol** | R |
| **Measured with** | Ohmmeter (circuit must be de-energized) |

**Key facts:**
- All materials have some resistance (even good conductors)
- Resistance converts electrical energy to heat
- Factors affecting resistance: material type, length, cross-sectional area, temperature
- Insulators have very high resistance; conductors have very low resistance

**Resistance of a conductor:**
```
R = ρ × (L / A)
```
Where:
- ρ (rho) = resistivity of the material (Ω·m)
- L = length of the conductor (m)
- A = cross-sectional area (m²)

**CircuiTry3D Implementation:** Wire material properties are defined in `src/data/wireLibrary.ts`.

#### Power (P) — Rate of Energy Use

| Property | Value |
|----------|-------|
| **Definition** | The rate at which electrical energy is consumed or produced |
| **Unit** | Watt (W) |
| **Symbol** | P |

**Key facts:**
- 1 Watt = 1 Joule per second
- Power in DC circuits: P = V × I
- Power companies bill in kilowatt-hours (kWh): 1 kWh = 1000 watts used for 1 hour
- Common ratings: LED bulb (9W), incandescent bulb (60W), space heater (1500W)

### 1.3 Energy vs. Power

| Concept | Definition | Unit | Formula |
|---------|-----------|------|---------|
| Power | Rate of energy use | Watts (W) | P = V × I |
| Energy | Total work done | Joules (J) or Watt-hours (Wh) | E = P × t |

---

## Part 2: Ohm's Law — The Foundation

### 2.1 Ohm's Law Statement

> **"The current flowing through a conductor is directly proportional to the voltage applied across it and inversely proportional to its resistance."**

This is the most important relationship in electronics and the foundation of circuit analysis.

### 2.2 The Ohm's Law Triangle

```
        V
       ───
      │   │
      I × R
```

**Three forms of Ohm's Law:**
1. **V = I × R** — Voltage equals Current times Resistance
2. **I = V / R** — Current equals Voltage divided by Resistance
3. **R = V / I** — Resistance equals Voltage divided by Current

### 2.3 Practical Examples

**Example 1:** A 12V battery powers a circuit with 4Ω resistance. What is the current?
```
I = V / R = 12V / 4Ω = 3A
```

**Example 2:** A circuit draws 2A from a 9V source. What is the resistance?
```
R = V / I = 9V / 2A = 4.5Ω
```

**Example 3:** 500mA flows through a 220Ω resistor. What is the voltage drop?
```
V = I × R = 0.5A × 220Ω = 110V
```

**CircuiTry3D Implementation:** The W.I.R.E. wheel component (`src/components/practice/OhmsLawWheel.tsx`) teaches all 12 formula variants interactively.

---

## Part 3: Power Formulas

### 3.1 The Power Wheel

Power can be calculated multiple ways depending on known values:

| Formula | Use When You Know |
|---------|-------------------|
| **P = V × I** | Voltage and Current |
| **P = I² × R** | Current and Resistance |
| **P = V² / R** | Voltage and Resistance |

### 3.2 Deriving Power Formulas

Starting from P = V × I and substituting Ohm's Law:
- Substitute V = IR: **P = (IR) × I = I²R**
- Substitute I = V/R: **P = V × (V/R) = V²/R**

### 3.3 Power Examples

**Example 1:** A 120V appliance draws 10A. What is the power consumption?
```
P = V × I = 120V × 10A = 1200W (or 1.2kW)
```

**Example 2:** A 100Ω resistor carries 200mA. What power does it dissipate?
```
P = I² × R = (0.2A)² × 100Ω = 0.04 × 100 = 4W
```

**Example 3:** A 60W bulb operates at 120V. What current does it draw?
```
I = P / V = 60W / 120V = 0.5A
```

**CircuiTry3D Implementation:** Power dissipation visualization is documented in [CIRCUIT_SIMULATION_REFERENCE.md](./CIRCUIT_SIMULATION_REFERENCE.md).

---

## Part 4: Kirchhoff's Laws

### 4.1 Kirchhoff's Current Law (KCL)

> **"The sum of currents entering a node equals the sum of currents leaving that node."**

At any junction: **ΣI_in = ΣI_out**

Or equivalently: **ΣI = 0** (using sign convention: positive for in, negative for out)

**Physical basis:** Charge conservation — electrons cannot accumulate at a point or disappear.

**Application:** If 5A enters a junction and splits into two branches, and one branch carries 2A, the other must carry 3A.

**CircuiTry3D Implementation:** KCL is enforced at every node during MNA solving. See [CIRCUIT_RULES.md](./CIRCUIT_RULES.md) for implementation details.

### 4.2 Kirchhoff's Voltage Law (KVL)

> **"The sum of all voltages around any closed path equals zero."**

Around any closed path: **ΣV = 0**

**Physical basis:** Energy conservation — a charge returning to its starting point must have the same potential energy.

**Application:** In a series circuit with a 12V source and two resistors, if one resistor drops 5V, the other must drop 7V (5 + 7 = 12).

**CircuiTry3D Implementation:** KVL is enforced through voltage-source constraints in MNA. See [CIRCUIT_SIMULATION_REFERENCE.md](./CIRCUIT_SIMULATION_REFERENCE.md).

### 4.3 Kirchhoff's Laws Interactive Reference

The interactive Kirchhoff's Laws component (`src/components/practice/KirchhoffLaws.tsx`) provides visual demonstrations with examples.

---

## Part 5: Series and Parallel Circuits

### 5.1 Series Circuits

Components connected end-to-end, forming a single path for current.

```
    ┌────R₁────R₂────┐
    │                │
  (+)                │
  Battery            │
  (−)                │
    │                │
    └────────────────┘
```

**Characteristics:**
| Property | Series Rule |
|----------|-------------|
| **Current** | Same through all components: I_total = I₁ = I₂ = I₃ |
| **Voltage** | Divides across components: V_total = V₁ + V₂ + V₃ |
| **Resistance** | Adds: R_total = R₁ + R₂ + R₃ |

**Series Resistor Example:**
Three resistors in series: 100Ω, 220Ω, 330Ω
```
R_total = 100 + 220 + 330 = 650Ω
```

### 5.2 Parallel Circuits

Components connected across the same two points, providing multiple paths.

```
    ┌───R₁───┐
    │        │
  (+)──●──●──●──┐
  Battery       │
  (−)──●──●──●──┘
    │        │
    └───R₂───┘
```

**Characteristics:**
| Property | Parallel Rule |
|----------|---------------|
| **Voltage** | Same across all components: V_total = V₁ = V₂ = V₃ |
| **Current** | Divides among branches: I_total = I₁ + I₂ + I₃ |
| **Resistance** | Formula: 1/R_total = 1/R₁ + 1/R₂ + 1/R₃ |

**Parallel Resistor Example:**
Two resistors in parallel: 100Ω and 100Ω
```
1/R_total = 1/100 + 1/100 = 2/100
R_total = 100/2 = 50Ω
```

**Shortcut for two parallel resistors:**
```
R_total = (R₁ × R₂) / (R₁ + R₂)
```

**Example:** 300Ω and 600Ω in parallel
```
R_total = (300 × 600) / (300 + 600) = 180,000 / 900 = 200Ω
```

### 5.3 Series-Parallel Combinations

Real circuits often combine series and parallel elements.

**Strategy:**
1. Identify parallel groups
2. Calculate equivalent resistance for each parallel group
3. Add series resistances
4. Repeat until simplified to single equivalent

**Example:** R1 (100Ω) in series with parallel combination of R2 (200Ω) and R3 (200Ω)
```
Step 1: R_parallel = (200 × 200) / (200 + 200) = 40,000 / 400 = 100Ω
Step 2: R_total = R1 + R_parallel = 100 + 100 = 200Ω
```

**CircuiTry3D Implementation:** See [circuit-topology-reference.md](./circuit-topology-reference.md) for visual layout standards.

---

## Part 6: Voltage and Current Dividers

### 6.1 Voltage Divider Formula

When resistors are in series, voltage divides proportionally:

```
V_out = V_in × (R₂ / (R₁ + R₂))
```

Where V_out is measured across R₂.

**Voltage Divider Example:**
Create 3.3V from a 5V supply for a sensor.
```
V_out / V_in = R₂ / (R₁ + R₂)
3.3 / 5 = 0.66

If R₂ = 10kΩ:
0.66 = 10k / (R₁ + 10k)
R₁ + 10k = 10k / 0.66 = 15.15k
R₁ = 5.15kΩ (use 5.1kΩ standard value)
```

### 6.2 Current Divider Formula

When resistors are in parallel, current divides inversely proportional to resistance:

```
I₁ = I_total × (R₂ / (R₁ + R₂))
```

**Key insight:** More current flows through the path of least resistance.

**Current Divider Example:**
1A total current splits between 30Ω and 60Ω parallel resistors.
```
I_30Ω = 1A × (60 / (30 + 60)) = 1A × (60/90) = 0.667A
I_60Ω = 1A × (30 / (30 + 60)) = 1A × (30/90) = 0.333A
```

---

## Part 7: DC vs. AC Fundamentals

### 7.1 DC vs AC Comparison

| Property | DC (Direct Current) | AC (Alternating Current) |
|----------|----|----|
| Direction | One direction | Alternates direction |
| Waveform | Constant level | Sinusoidal (usually) |
| Frequency | 0 Hz | 50/60 Hz (mains) |
| Transmission | Less efficient over distance | More efficient |
| Primary Use | Batteries, electronics | Power distribution |

### 7.2 AC Parameters

- **Frequency (f)**: Cycles per second, measured in Hertz (Hz)
- **Period (T)**: Time for one complete cycle; T = 1/f
- **Peak voltage (V_peak)**: Maximum instantaneous voltage
- **RMS voltage (V_rms)**: Equivalent DC voltage for power; V_rms = V_peak / √2 ≈ 0.707 × V_peak

**Example:** 120V AC (RMS) has a peak of:
```
V_peak = 120 × √2 ≈ 170V
```

### 7.3 Impedance (Z)

In AC circuits, opposition to current includes resistance and reactance:

```
Z = √(R² + X²)
```

Where X is reactance (capacitive or inductive).

**CircuiTry3D Current State:** The platform currently focuses on DC steady-state analysis. AC analysis is planned for future development.

---

## Part 8: Unit Prefixes and Conversions

### 8.1 Standard Metric Prefixes

| Prefix | Symbol | Multiplier | Example |
|--------|--------|------------|---------|
| pico | p | 10⁻¹² | 100pF capacitor |
| nano | n | 10⁻⁹ | 470nF capacitor |
| micro | μ | 10⁻⁶ | 100μF capacitor |
| milli | m | 10⁻³ | 20mA current |
| (base) | — | 10⁰ | 5V, 2A, 100Ω |
| kilo | k | 10³ | 4.7kΩ resistor |
| mega | M | 10⁶ | 1MΩ resistor |
| giga | G | 10⁹ | (rare in circuits) |

### 8.2 Common Conversions

```
1A = 1000mA = 1,000,000μA
1kΩ = 1000Ω
1MΩ = 1,000,000Ω = 1000kΩ
1μF = 1000nF = 1,000,000pF
```

**CircuiTry3D Implementation:** Metric formatting utilities are available in `src/utils/electrical.ts`.

---

## Part 9: Safety Considerations

### 9.1 Dangerous Current Levels

| Current | Effect on Human Body |
|---------|---------------------|
| 1 mA | Barely perceptible |
| 5 mA | Mild shock |
| 10-20 mA | Painful, muscle control lost |
| 50-100 mA | Potentially lethal (ventricular fibrillation) |
| >100 mA | Severe burns, cardiac arrest |

### 9.2 Safety Rules for Real Circuits

1. **Always de-energize** circuits before working on them
2. **Use one hand** when probing live circuits (prevents current path through heart)
3. **Respect capacitors** — they can hold charge after power is removed
4. **Never exceed component ratings**
5. **Use proper fusing** to protect circuits and prevent fires
6. **Verify absence of voltage** before touching conductors

### 9.3 Educational Context

CircuiTry3D is a simulation platform; real-world safety practices should always be emphasized when students transition from simulation to hands-on work.

---

## Part 10: Common Circuit Problems and Solutions

### 10.1 LED Current Limiting

**Problem:** Power an LED (2V forward voltage, 20mA max) from 5V

```
R = (V_supply - V_LED) / I_LED
R = (5V - 2V) / 0.020A = 150Ω
P = I² × R = (0.02)² × 150 = 0.06W (use 1/8W or 1/4W resistor)
```

### 10.2 Finding Unknown Resistance

**Problem:** A circuit draws 250mA from a 9V battery. Find the total resistance.

```
R = V / I = 9V / 0.25A = 36Ω
```

### 10.3 Power Consumption Cost

**Problem:** How much does it cost to run a 100W light bulb for 8 hours at $0.12/kWh?

```
Energy = 100W × 8h = 800Wh = 0.8kWh
Cost = 0.8kWh × $0.12 = $0.096 ≈ 10 cents
```

### 10.4 Voltage Divider Design

**Problem:** Create 3V from a 9V battery using a voltage divider.

```
V_out / V_in = R₂ / (R₁ + R₂)
3 / 9 = 1/3

If R₂ = 10kΩ:
R₁ = 2 × R₂ = 20kΩ

Verify: V_out = 9V × (10k / 30k) = 3V ✓
```

---

## Summary

This document establishes the electrical theory foundation for CircuiTry3D. All platform features, educational content, simulation logic, and practice problems should align with these principles:

**Core Laws:**
- Ohm's Law (V = IR)
- Power equations (P = VI = I²R = V²/R)
- Kirchhoff's Current Law (ΣI = 0 at nodes)
- Kirchhoff's Voltage Law (ΣV = 0 around closed paths)

**Circuit Analysis:**
- Series: same current, voltages add, resistances add
- Parallel: same voltage, currents add, 1/R_total = Σ(1/R)
- Voltage dividers and current dividers

**Implementation References:**
- Simulation solver: `src/sim/dcSolver.ts`
- Circuit validation: `src/sim/circuitValidator.ts`
- W.I.R.E. metrics: `src/utils/electrical.ts`
- Educational components: `src/components/practice/`

This document is the **authoritative source** for electrical theory within CircuiTry3D and should be referenced when developing new features, creating educational content, or validating simulation behavior.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01 | Initial comprehensive theory document |
