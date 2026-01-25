# Component Reference Guide

This document provides detailed theory and specifications for electronic components used in CircuiTry3D. Each component section includes physical principles, behavior characteristics, and practical application notes.

**Prerequisites:** [ELECTRICAL_THEORY_FUNDAMENTALS.md](./ELECTRICAL_THEORY_FUNDAMENTALS.md)

**Related Documentation:**
- [CIRCUIT_RULES.md](./CIRCUIT_RULES.md) — Platform-specific implementation rules
- [schematic-style-guidelines.md](./schematic-style-guidelines.md) — Symbol standards
- [FORMULAS_QUICK_REFERENCE.md](./FORMULAS_QUICK_REFERENCE.md) — Quick formula lookup

---

## Part 1: Resistors

### 1.1 What Resistors Do

Resistors are passive components that:
- **Limit current flow** — Protect sensitive components
- **Divide voltage** — Create reference voltages
- **Set bias points** — Configure transistor operating points
- **Convert energy** — Transform electrical energy to heat
- **Shape signals** — RC timing and filtering

### 1.2 Ohm's Law for Resistors

```
V = I × R    (Voltage across = Current through × Resistance)
I = V / R    (Current = Voltage / Resistance)
P = I² × R   (Power dissipated = Current² × Resistance)
P = V² / R   (Power dissipated = Voltage² / Resistance)
```

### 1.3 Resistor Types

| Type | Characteristics | Tolerance | Applications |
|------|-----------------|-----------|--------------|
| **Carbon Film** | Low cost, general purpose | 5% | Hobby, general electronics |
| **Metal Film** | Better precision, low noise | 1% | Audio, precision circuits |
| **Wire Wound** | High power handling | 1-5% | Power supplies, heaters |
| **SMD** | Surface mount, tiny | 1-5% | Modern PCB electronics |
| **Potentiometer** | Adjustable resistance | Variable | Volume controls, tuning |
| **Thermistor** | Temperature-dependent | — | Temperature sensing |
| **LDR/Photoresistor** | Light-dependent | — | Light sensing |

### 1.4 Resistor Color Code (4-Band)

**Reading Order:** Band 1 → Band 2 → Multiplier → Tolerance

| Color | Digit | Multiplier | Tolerance |
|-------|-------|------------|-----------|
| Black | 0 | ×1 | — |
| Brown | 1 | ×10 | ±1% |
| Red | 2 | ×100 | ±2% |
| Orange | 3 | ×1,000 | — |
| Yellow | 4 | ×10,000 | — |
| Green | 5 | ×100,000 | ±0.5% |
| Blue | 6 | ×1,000,000 | ±0.25% |
| Violet | 7 | ×10,000,000 | ±0.1% |
| Gray | 8 | — | ±0.05% |
| White | 9 | — | — |
| Gold | — | ×0.1 | ±5% |
| Silver | — | ×0.01 | ±10% |

**Mnemonic:** "**B**ad **B**oys **R**ace **O**ur **Y**oung **G**irls **B**ut **V**iolet **G**enerally **W**ins"

### 1.5 Reading Examples

**Brown-Black-Red-Gold:**
- Brown = 1, Black = 0, Red = ×100, Gold = ±5%
- **Value: 10 × 100 = 1,000Ω = 1kΩ ±5%**

**Yellow-Violet-Orange-Gold:**
- Yellow = 4, Violet = 7, Orange = ×1,000, Gold = ±5%
- **Value: 47 × 1,000 = 47kΩ ±5%**

**Red-Red-Brown-Gold:**
- Red = 2, Red = 2, Brown = ×10, Gold = ±5%
- **Value: 22 × 10 = 220Ω ±5%**

### 1.6 Standard Values (E12 Series)

Common 10% tolerance values per decade:
```
10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82
```

These repeat for each decade: 100Ω, 120Ω, 150Ω... 1kΩ, 1.2kΩ, 1.5kΩ... etc.

### 1.7 Power Ratings

| Rating | Size | Typical Use |
|--------|------|-------------|
| 1/8W (0.125W) | Very small | Low-current signals |
| 1/4W (0.25W) | Small | General electronics |
| 1/2W (0.5W) | Medium | Moderate current |
| 1W | Larger | Higher power circuits |
| 2W, 5W, 10W+ | Large | Power electronics |

**Design Rule:** Choose a resistor rated for **at least 2× the calculated power dissipation**.

### 1.8 Series and Parallel Resistors

**Series:** R_total = R₁ + R₂ + R₃ + ...

**Parallel:** 1/R_total = 1/R₁ + 1/R₂ + 1/R₃ + ...

**Two Parallel:** R_total = (R₁ × R₂) / (R₁ + R₂)

**CircuiTry3D Implementation:** Interactive color code reference at `src/components/practice/ResistorColorCode.tsx`

---

## Part 2: Capacitors

### 2.1 What Capacitors Do

Capacitors store electrical energy in an electric field between two conductive plates separated by an insulator (dielectric).

**Key Functions:**
- **Energy storage** — Store and release charge
- **DC blocking** — Block DC, pass AC
- **Smoothing** — Filter power supply ripple
- **Timing** — RC time constants
- **Coupling** — Transfer AC signals between stages

### 2.2 Capacitance

**Definition:** The ratio of stored charge to voltage

```
C = Q / V
```

Where:
- C = Capacitance (Farads, F)
- Q = Charge (Coulombs, C)
- V = Voltage (Volts, V)

**Common Values:** pF (picofarads), nF (nanofarads), μF (microfarads)

### 2.3 Capacitor Behavior

**DC Steady State:** Capacitor acts as an **open circuit** (no DC current flows after charging)

**AC Behavior:** Capacitor passes AC with reactance:
```
X_C = 1 / (2πfC)
```

Where:
- X_C = Capacitive reactance (Ohms)
- f = Frequency (Hz)
- C = Capacitance (Farads)

### 2.4 RC Time Constant

```
τ = R × C
```

- τ (tau) = Time constant (seconds)
- R = Resistance (Ohms)
- C = Capacitance (Farads)

**Charging/Discharging:**
- After 1τ: 63.2% of final value
- After 3τ: 95% of final value
- After 5τ: 99.3% (considered fully charged/discharged)

**Example:** 10kΩ resistor with 100μF capacitor
```
τ = 10,000Ω × 0.0001F = 1 second
Full charge ≈ 5 seconds
```

### 2.5 Capacitors in Series and Parallel

**Opposite of resistors!**

**Parallel:** C_total = C₁ + C₂ + C₃ + ...

**Series:** 1/C_total = 1/C₁ + 1/C₂ + 1/C₃ + ...

### 2.6 Capacitor Types

| Type | Characteristics | Polarity | Applications |
|------|-----------------|----------|--------------|
| **Ceramic** | Small values, non-polarized | No | High frequency, decoupling |
| **Electrolytic** | Large values, polarized | Yes | Power supply filtering |
| **Tantalum** | Stable, polarized | Yes | Precision circuits |
| **Film** | Precision, non-polarized | No | Audio, timing |

**Warning:** Polarized capacitors (electrolytic, tantalum) must be connected with correct polarity or they can fail catastrophically.

### 2.7 Energy Stored

```
E = ½CV²
```

Where E = Energy in Joules

**CircuiTry3D Implementation:** Capacitors are treated as open circuits in DC steady-state analysis.

---

## Part 3: Inductors

### 3.1 What Inductors Do

Inductors store energy in a magnetic field created by current flowing through a coil of wire.

**Key Functions:**
- **Energy storage** — Magnetic field storage
- **Current smoothing** — Oppose changes in current
- **Filtering** — Block high-frequency noise
- **Transformers** — Couple AC energy between windings

### 3.2 Inductance

**Definition:** The ratio of induced voltage to rate of current change

```
V = L × (di/dt)
```

Where:
- V = Induced voltage (Volts)
- L = Inductance (Henries, H)
- di/dt = Rate of current change (A/s)

**Common Values:** μH (microhenries), mH (millihenries), H (henries)

### 3.3 Inductor Behavior

**DC Steady State:** Inductor acts as a **short circuit** (ideal wire, 0Ω)

**AC Behavior:** Inductor opposes AC with reactance:
```
X_L = 2πfL
```

Where:
- X_L = Inductive reactance (Ohms)
- f = Frequency (Hz)
- L = Inductance (Henries)

### 3.4 RL Time Constant

```
τ = L / R
```

### 3.5 Inductors in Series and Parallel

**Same as resistors!**

**Series:** L_total = L₁ + L₂ + L₃ + ...

**Parallel:** 1/L_total = 1/L₁ + 1/L₂ + 1/L₃ + ...

### 3.6 Energy Stored

```
E = ½LI²
```

**CircuiTry3D Implementation:** Inductors are treated as ideal shorts (0Ω) in DC steady-state analysis.

---

## Part 4: Diodes

### 4.1 What Diodes Do

Diodes are semiconductor devices that allow current to flow in only one direction (one-way valve for electricity).

### 4.2 Diode Terminals

- **Anode (A):** Positive terminal (arrow points away from here)
- **Cathode (K):** Negative terminal (bar/line side)

**Forward Bias:** Anode more positive than Cathode → Current flows
**Reverse Bias:** Cathode more positive than Anode → No current (blocked)

### 4.3 Ideal vs. Real Diode

**Ideal Diode:**
- Forward: 0V drop, infinite current capacity
- Reverse: Infinite resistance, 0 current

**Real Diode:**
- Forward: ~0.7V drop (silicon), ~0.3V (Schottky), ~2-3V (LED)
- Reverse: Very high resistance until breakdown voltage

### 4.4 LED (Light Emitting Diode)

LEDs emit light when forward biased.

**Typical Values:**
| Color | Forward Voltage | Typical Current |
|-------|-----------------|-----------------|
| Red | 1.8-2.2V | 10-20mA |
| Yellow | 2.0-2.4V | 10-20mA |
| Green | 2.0-3.0V | 10-20mA |
| Blue | 3.0-3.5V | 10-20mA |
| White | 3.0-3.5V | 10-20mA |

**Current Limiting Resistor:**
```
R = (V_supply - V_LED) / I_LED
```

**Example:** Red LED (2V, 20mA) from 5V supply
```
R = (5V - 2V) / 0.020A = 150Ω
```

### 4.5 Common Diode Types

| Type | Forward Drop | Application |
|------|--------------|-------------|
| **Silicon (1N4001)** | 0.7V | General rectification |
| **Schottky** | 0.3V | High-speed switching |
| **Zener** | Rated voltage | Voltage regulation |
| **LED** | 1.8-3.5V | Indicators, lighting |

**CircuiTry3D Implementation:** Diodes require nonlinear solving (planned for future). See [circuit-error-outcomes.md](./circuit-error-outcomes.md) for reverse-bias handling.

---

## Part 5: Transistors

### 5.1 BJT (Bipolar Junction Transistor)

BJTs are current-controlled devices used for amplification and switching.

**Terminals:**
- **Base (B):** Control terminal
- **Collector (C):** High-current terminal (current flows in)
- **Emitter (E):** High-current terminal (current flows out)

**Types:**
- **NPN:** Current flows from Collector to Emitter when Base is positive
- **PNP:** Current flows from Emitter to Collector when Base is negative

### 5.2 BJT Relationships

```
I_E = I_C + I_B
I_C = β × I_B  (β = current gain, typically 50-300)
```

**Modes of Operation:**
| Mode | B-E Junction | C-B Junction | Use |
|------|--------------|--------------|-----|
| **Cutoff** | Reverse | Reverse | Off switch |
| **Active** | Forward | Reverse | Amplifier |
| **Saturation** | Forward | Forward | On switch |

### 5.3 MOSFET (Metal-Oxide-Semiconductor FET)

MOSFETs are voltage-controlled devices used for switching and amplification.

**Terminals:**
- **Gate (G):** Control terminal (voltage)
- **Drain (D):** Current in/out
- **Source (S):** Current in/out

**Types:**
- **N-Channel:** Conducts when Gate is positive relative to Source
- **P-Channel:** Conducts when Gate is negative relative to Source

**CircuiTry3D Implementation:** Transistors require nonlinear solving (planned for future development).

---

## Part 6: Batteries (Voltage Sources)

### 6.1 Ideal vs. Real Batteries

**Ideal Battery:**
- Maintains constant voltage regardless of current
- Zero internal resistance
- Unlimited energy capacity

**Real Battery:**
- Voltage drops under load (internal resistance)
- Limited energy capacity (Amp-hours)
- Voltage varies with state of charge

### 6.2 Internal Resistance

```
V_terminal = V_emf - (I × R_internal)
```

**CircuiTry3D Implementation:** Batteries are modeled as ideal voltage sources. See [CIRCUIT_RULES.md](./CIRCUIT_RULES.md) Rule C3D-006 for terminal orientation.

### 6.3 Common Battery Voltages

| Type | Nominal Voltage | Chemistry |
|------|-----------------|-----------|
| AA/AAA | 1.5V | Alkaline |
| AA/AAA | 1.2V | NiMH rechargeable |
| 9V | 9V | Alkaline |
| CR2032 | 3V | Lithium coin |
| Car | 12V | Lead-acid |
| Li-ion cell | 3.7V | Lithium-ion |

---

## Part 7: Switches

### 7.1 Switch Types

| Type | Positions | Applications |
|------|-----------|--------------|
| **SPST** | Single Pole, Single Throw | On/Off control |
| **SPDT** | Single Pole, Double Throw | Selector between two circuits |
| **DPST** | Double Pole, Single Throw | On/Off for two circuits |
| **DPDT** | Double Pole, Double Throw | Reversing, complex routing |

### 7.2 Switch States

- **Open (OFF):** Infinite resistance, no current flow
- **Closed (ON):** Zero resistance (ideal), current flows freely

**CircuiTry3D Implementation:** Switches are currently modeled as open circuits. Interactive state toggle is planned for future development.

---

## Part 8: Ground Symbol

### 8.1 Purpose

The ground symbol establishes the **0V reference point** for all voltage measurements in a circuit.

### 8.2 Types of Ground

| Symbol | Name | Use |
|--------|------|-----|
| Earth Ground | Actual earth connection | Safety, EMI |
| Chassis Ground | Equipment frame | Signal return |
| Signal Ground | Reference point | Circuit analysis |

**CircuiTry3D Implementation:** See [CIRCUIT_RULES.md](./CIRCUIT_RULES.md) Rule C3D-003 for ground requirements.

---

## Part 9: Lamps

### 9.1 Incandescent Lamps

- Resistance increases when hot (positive temperature coefficient)
- Cold resistance << hot resistance (inrush current)
- Power rating determines brightness

### 9.2 Lamp Model

In CircuiTry3D, lamps are modeled as **fixed resistors** for simplicity:
```
R_lamp = V_rated² / P_rated
```

**Example:** 12V, 5W lamp
```
R_lamp = (12V)² / 5W = 144/5 = 28.8Ω
```

---

## Part 10: Component Selection Guidelines

### 10.1 Resistor Selection

1. **Calculate required value** using Ohm's Law
2. **Choose nearest standard value** (E12 or E24 series)
3. **Calculate power dissipation:** P = I²R or V²/R
4. **Select power rating:** At least 2× calculated power
5. **Consider tolerance:** 5% for general use, 1% for precision

### 10.2 Capacitor Selection

1. **Determine required capacitance** from timing or filtering needs
2. **Check voltage rating:** At least 1.5× maximum circuit voltage
3. **Consider type:** Ceramic for HF, electrolytic for large values
4. **Check polarity:** Use non-polarized if voltage can reverse

### 10.3 LED Selection

1. **Choose color** based on application
2. **Note forward voltage** from datasheet
3. **Calculate current-limiting resistor:** R = (V_supply - V_f) / I_f
4. **Select resistor power rating:** P = I_f² × R

---

## Summary

This reference covers the components currently implemented and planned for CircuiTry3D:

| Component | DC Behavior | CircuiTry3D Status |
|-----------|-------------|-------------------|
| Resistor | V = IR | ✅ Fully implemented |
| Battery | Ideal V source | ✅ Fully implemented |
| Lamp | Fixed R | ✅ Fully implemented |
| Wire | Ideal short | ✅ Fully implemented |
| Ground | 0V reference | ✅ Fully implemented |
| Switch | Open/closed | ⏳ Open only (toggle planned) |
| Capacitor | Open circuit (DC) | ⏳ DC only (AC planned) |
| Inductor | Short circuit (DC) | ⏳ DC only (AC planned) |
| Diode/LED | Nonlinear | ⏳ Basic validation (nonlinear planned) |
| BJT/MOSFET | Nonlinear | ⏳ Planned |

**Implementation References:**
- Component metadata: `src/components/builder/constants.ts`
- Schematic symbols: `src/schematic/catalog.ts`
- 3D models: `src/schematic/threeFactory.ts`
- Wire materials: `src/data/wireLibrary.ts`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01 | Initial component reference document |
