# Electrical Formulas Quick Reference

A comprehensive formula lookup table for CircuiTry3D. Use this for quick calculations and problem-solving.

**Full explanations:** [ELECTRICAL_THEORY_FUNDAMENTALS.md](./ELECTRICAL_THEORY_FUNDAMENTALS.md)

---

## Ohm's Law (The Foundation)

| Find | Formula | Notes |
|------|---------|-------|
| **Voltage** | V = I × R | Voltage = Current × Resistance |
| **Current** | I = V / R | Current = Voltage / Resistance |
| **Resistance** | R = V / I | Resistance = Voltage / Current |

---

## Power Formulas (The Power Wheel)

| Find | Formula | Use When You Know |
|------|---------|-------------------|
| **Power** | P = V × I | Voltage and Current |
| **Power** | P = I² × R | Current and Resistance |
| **Power** | P = V² / R | Voltage and Resistance |
| **Voltage** | V = P / I | Power and Current |
| **Voltage** | V = √(P × R) | Power and Resistance |
| **Current** | I = P / V | Power and Voltage |
| **Current** | I = √(P / R) | Power and Resistance |
| **Resistance** | R = P / I² | Power and Current |
| **Resistance** | R = V² / P | Voltage and Power |

---

## Energy

| Formula | Description |
|---------|-------------|
| E = P × t | Energy = Power × Time |
| E = V × I × t | Energy from V, I, and time |
| E = ½CV² | Energy stored in capacitor |
| E = ½LI² | Energy stored in inductor |

**Units:** Joules (J) or Watt-hours (Wh); 1 kWh = 3,600,000 J

---

## Series Circuits

| Quantity | Formula |
|----------|---------|
| **Total Resistance** | R_total = R₁ + R₂ + R₃ + ... |
| **Current** | I_total = I₁ = I₂ = I₃ (same everywhere) |
| **Voltage** | V_total = V₁ + V₂ + V₃ (sum of drops) |

---

## Parallel Circuits

| Quantity | Formula |
|----------|---------|
| **Total Resistance** | 1/R_total = 1/R₁ + 1/R₂ + 1/R₃ + ... |
| **Two Resistors** | R_total = (R₁ × R₂) / (R₁ + R₂) |
| **N Equal Resistors** | R_total = R / N |
| **Voltage** | V_total = V₁ = V₂ = V₃ (same across all) |
| **Current** | I_total = I₁ + I₂ + I₃ (sum of branches) |

---

## Voltage Divider

```
V_out = V_in × (R₂ / (R₁ + R₂))
```

Where V_out is measured across R₂.

**Design formula (to find R₁):**
```
R₁ = R₂ × ((V_in / V_out) - 1)
```

---

## Current Divider

For two parallel resistors:
```
I₁ = I_total × (R₂ / (R₁ + R₂))
I₂ = I_total × (R₁ / (R₁ + R₂))
```

**Key insight:** More current flows through lower resistance.

---

## Capacitors

| Formula | Description |
|---------|-------------|
| C = Q / V | Capacitance = Charge / Voltage |
| Q = C × V | Charge = Capacitance × Voltage |
| X_C = 1 / (2πfC) | Capacitive reactance (AC) |
| τ = R × C | RC time constant |
| **Parallel** | C_total = C₁ + C₂ + C₃ |
| **Series** | 1/C_total = 1/C₁ + 1/C₂ + 1/C₃ |

**RC Charging:** After 5τ, capacitor is 99.3% charged.

---

## Inductors

| Formula | Description |
|---------|-------------|
| V = L × (di/dt) | Voltage = Inductance × rate of current change |
| X_L = 2πfL | Inductive reactance (AC) |
| τ = L / R | RL time constant |
| **Series** | L_total = L₁ + L₂ + L₃ |
| **Parallel** | 1/L_total = 1/L₁ + 1/L₂ + 1/L₃ |

---

## Wire Resistance

```
R = ρ × (L / A)
```

Where:
- ρ (rho) = Resistivity (Ω·m)
- L = Length (m)
- A = Cross-sectional area (m²)

---

## LED Current Limiting Resistor

```
R = (V_supply - V_LED) / I_LED
```

**Example:** 5V supply, 2V red LED, 20mA current
```
R = (5 - 2) / 0.020 = 150Ω
```

---

## Kirchhoff's Laws

**KCL (Current Law):**
```
ΣI_in = ΣI_out  (at any node)
```

**KVL (Voltage Law):**
```
ΣV = 0  (around any closed loop)
```

---

## Thévenin/Norton

| Conversion | Formula |
|------------|---------|
| Thévenin voltage | V_th = I_n × R_th |
| Norton current | I_n = V_th / R_th |
| Thévenin/Norton resistance | R_th = R_n |

**Maximum Power Transfer:** R_load = R_th

**Maximum Power:** P_max = V_th² / (4 × R_th)

---

## AC Circuits

| Formula | Description |
|---------|-------------|
| V_peak = V_rms × √2 | Peak from RMS |
| V_rms = V_peak / √2 | RMS from peak (≈ 0.707 × V_peak) |
| V_rms = V_peak × 0.707 | RMS approximation |
| f = 1 / T | Frequency = 1 / Period |
| Z = √(R² + X²) | Impedance magnitude |
| Z = √(R² + (X_L - X_C)²) | RLC impedance |

---

## Unit Prefixes

| Prefix | Symbol | Value | Example |
|--------|--------|-------|---------|
| pico | p | 10⁻¹² | 100pF |
| nano | n | 10⁻⁹ | 470nF |
| micro | μ | 10⁻⁶ | 100μF, 10μH |
| milli | m | 10⁻³ | 20mA, 5mH |
| (base) | — | 10⁰ | 5V, 2A, 100Ω |
| kilo | k | 10³ | 4.7kΩ, 5kHz |
| mega | M | 10⁶ | 1MΩ, 10MHz |
| giga | G | 10⁹ | 2GHz |

---

## Quick Conversions

```
1A = 1000mA = 1,000,000μA
1V = 1000mV
1kΩ = 1000Ω
1MΩ = 1,000,000Ω = 1000kΩ
1μF = 1000nF = 1,000,000pF
1mH = 1000μH
1kHz = 1000Hz
1MHz = 1,000,000Hz
```

---

## Common Component Values

### Standard Resistor Values (E12 Series)
```
10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82
```
(Repeat for each decade: ×1, ×10, ×100, ×1k, ×10k, etc.)

### Common LED Forward Voltages
| Color | V_f |
|-------|-----|
| Red | 1.8-2.2V |
| Yellow | 2.0-2.4V |
| Green | 2.0-3.0V |
| Blue | 3.0-3.5V |
| White | 3.0-3.5V |

### Common Battery Voltages
| Type | Voltage |
|------|---------|
| AA/AAA | 1.5V |
| 9V | 9V |
| Car | 12V |
| USB | 5V |
| Li-ion cell | 3.7V |

---

## Problem-Solving Checklist

1. **Draw the circuit** — Visualize what's connected
2. **Identify knowns** — What values do you have?
3. **Identify unknown** — What are you solving for?
4. **Choose formula** — Pick from tables above
5. **Check units** — Convert to base units (V, A, Ω, F, H)
6. **Calculate** — Plug in values
7. **Verify** — Does the answer make sense?

---

## CircuiTry3D Implementation

These formulas are implemented in:
- `src/utils/electrical.ts` — Metric formatting and calculations
- `src/sim/dcSolver.ts` — MNA circuit solver
- `src/components/practice/OhmsLawWheel.tsx` — Interactive W.I.R.E. wheel
- `src/data/practiceProblems.ts` — Practice problem solutions

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01 | Initial formulas quick reference |
