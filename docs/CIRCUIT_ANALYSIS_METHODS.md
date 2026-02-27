# Circuit Analysis Methods

This document covers advanced circuit analysis techniques beyond basic Ohm's Law. These methods are essential for understanding complex circuits and form the mathematical foundation of CircuiTry3D's simulation engine.

**Prerequisites:** [ELECTRICAL_THEORY_FUNDAMENTALS.md](./ELECTRICAL_THEORY_FUNDAMENTALS.md)

**Related Documentation:**
- [CIRCUIT_RULES.md](./CIRCUIT_RULES.md) — Platform-specific implementation rules
- [CIRCUIT_SIMULATION_REFERENCE.md](./CIRCUIT_SIMULATION_REFERENCE.md) — DC solver technical details
- [COMPONENT_REFERENCE.md](./COMPONENT_REFERENCE.md) — Component-specific theory

---

## Part 1: Modified Nodal Analysis (MNA)

### 1.1 Overview

Modified Nodal Analysis is the algorithm CircuiTry3D uses to solve DC circuits. It's the industry-standard method used by professional circuit simulators like SPICE.

**Why MNA?**
- Handles any circuit topology (series, parallel, complex networks)
- Naturally incorporates both current and voltage sources
- Produces a linear system solvable by matrix methods
- Scales efficiently for large circuits

### 1.2 The MNA Process

**Step 1: Assign Node Numbers**
- Identify all unique nodes (connection points) in the circuit
- Choose one node as the **reference node** (ground, 0V)
- Number remaining nodes 1, 2, 3, ...

**Step 2: Set Up Unknown Variables**
- Node voltages: V₁, V₂, V₃, ... (relative to reference)
- Branch currents through voltage sources: I_source

**Step 3: Write KCL Equations**
At each non-reference node, sum of currents = 0:
```
For resistors: I = (V_node1 - V_node2) / R
For voltage sources: Add current variable
```

**Step 4: Write Voltage Constraints**
For each voltage source, enforce:
```
V_positive_node - V_negative_node = V_source
```

**Step 5: Solve the Linear System**
Arrange equations in matrix form: **[G][V] = [I]**

### 1.3 MNA Example

**Circuit:** 9V battery with two resistors (R1=100Ω, R2=200Ω) in series

```
     (+) V₁        V₂
      ●────R1────●────R2────●
      │   100Ω       200Ω   │
    ──┴──                 ──┴──
    9V ⊕                   GND (V=0)
    ──┬──                 ──┬──
      │                     │
      └─────────────────────┘
```

**Unknowns:** V₁, I_source

**Equations:**
1. KCL at V₁: I_source = (V₁ - V₂) / R1
2. KCL at V₂: (V₁ - V₂) / R1 = V₂ / R2
3. Voltage constraint: V₁ = 9V

**Solution:**
```
V₁ = 9V (battery positive terminal)
V₂ = 9V × (200/(100+200)) = 6V (voltage at junction)
I = (9V - 0V) / 300Ω = 30mA
```

**CircuiTry3D Implementation:** See `src/sim/dcSolver.ts` for the MNA solver.

---

## Part 2: Superposition Theorem

### 2.1 Statement

> **In a linear circuit with multiple independent sources, the voltage across (or current through) any element equals the algebraic sum of the voltages (or currents) due to each source acting alone.**

### 2.2 Application Process

1. **Consider one source at a time**
2. **Replace other voltage sources** with short circuits (0Ω)
3. **Replace other current sources** with open circuits (∞Ω)
4. **Calculate the contribution** from the active source
5. **Sum all contributions** for the final result

### 2.3 Superposition Example

**Circuit:** Two voltage sources (V1=10V, V2=5V) with three resistors

```
    V1(10V)       R1(100Ω)        V2(5V)
      ⊕────●────/\/\/\────●────⊕
           │              │
          R2(200Ω)      R3(200Ω)
           │              │
         ──┴──          ──┴──
          GND            GND
```

**Step 1: V1 acting alone (V2 = short)**
Calculate voltage at center node due to V1

**Step 2: V2 acting alone (V1 = short)**
Calculate voltage at center node due to V2

**Step 3: Sum contributions**
V_total = V_from_V1 + V_from_V2

### 2.4 When to Use Superposition

- Multiple independent sources in a circuit
- Understanding individual source contributions
- Troubleshooting which source affects a measurement

---

## Part 3: Thévenin's Theorem

### 3.1 Statement

> **Any linear circuit with voltage and current sources and resistances can be replaced by an equivalent circuit consisting of a single voltage source (V_th) in series with a single resistance (R_th).**

### 3.2 Finding Thévenin Equivalent

**Step 1: Find V_th (Thévenin Voltage)**
- Open-circuit the load terminals
- Calculate the voltage across the open terminals
- This is V_th

**Step 2: Find R_th (Thévenin Resistance)**
- **Method A:** Remove the load, turn off independent sources (voltage sources → short, current sources → open), find equivalent resistance looking into terminals
- **Method B:** Find short-circuit current I_sc, then R_th = V_th / I_sc

### 3.3 Thévenin Example

**Original Circuit:**
```
      ●────100Ω────●────●  A
      │            │    │
    12V ⊕       200Ω    Load
      │            │    │
      └────────────┴────●  B
```

**Find Thévenin equivalent between A and B:**

**V_th (open circuit voltage):**
- Current through 100Ω and 200Ω: I = 12V / (100+200) = 40mA
- V_th = 200Ω × 40mA = 8V

**R_th (source off, find resistance):**
- 12V source becomes short circuit
- R_th = 100Ω || 200Ω = (100×200)/(100+200) = 66.7Ω

**Thévenin Equivalent:**
```
    ●────66.7Ω────●  A
    │             │
  8V ⊕         Load
    │             │
    └─────────────●  B
```

### 3.4 Why Thévenin Matters

- Simplifies complex circuits for load analysis
- Determines maximum power transfer condition (R_load = R_th)
- Essential for understanding signal sources in electronics

---

## Part 4: Norton's Theorem

### 4.1 Statement

> **Any linear circuit can be replaced by an equivalent circuit consisting of a single current source (I_n) in parallel with a single resistance (R_n).**

### 4.2 Finding Norton Equivalent

**Step 1: Find I_n (Norton Current)**
- Short-circuit the load terminals
- Calculate the current through the short
- This is I_n

**Step 2: Find R_n (Norton Resistance)**
- Same as R_th in Thévenin
- R_n = R_th

### 4.3 Thévenin-Norton Conversion

Thévenin and Norton equivalents are interchangeable:

```
V_th = I_n × R_th
I_n = V_th / R_th
R_n = R_th
```

**From the previous example:**
- V_th = 8V, R_th = 66.7Ω
- I_n = 8V / 66.7Ω = 120mA
- R_n = 66.7Ω

---

## Part 5: Maximum Power Transfer

### 5.1 Theorem

> **Maximum power is transferred to a load when the load resistance equals the source (Thévenin) resistance.**

```
R_load = R_th for maximum power transfer
```

### 5.2 Maximum Power Value

When R_load = R_th:

```
P_max = V_th² / (4 × R_th)
```

Or equivalently:
```
P_max = I_n² × R_th / 4
```

### 5.3 Maximum Power Example

**Given:** V_th = 12V, R_th = 8Ω

**For maximum power:** R_load = 8Ω

**Maximum power:**
```
P_max = (12V)² / (4 × 8Ω) = 144 / 32 = 4.5W
```

### 5.4 Efficiency Consideration

At maximum power transfer, efficiency is only 50% (half the power is dissipated in R_th). This is acceptable for signal transfer but not for power distribution where efficiency matters more.

---

## Part 6: Mesh Current Analysis

### 6.1 Overview

Mesh analysis assigns mesh currents to each independent mesh and uses KVL to solve for them.

### 6.2 Mesh Analysis Process

1. **Identify meshes** (paths that don't contain other meshes)
2. **Assign mesh currents** (typically clockwise)
3. **Write KVL** around each mesh
4. **Solve** the system of equations

### 6.3 Mesh Analysis Example

**Circuit with two meshes:**
```
    ┌───R1(10Ω)───┬───R2(20Ω)───┐
    │             │             │
  12V ⊕    I₁→  R3(30Ω)  ←I₂   ⊕ 6V
    │             │             │
    └─────────────┴─────────────┘
```

**KVL for mesh 1 (I₁):**
```
-12V + I₁×10Ω + (I₁-I₂)×30Ω = 0
40I₁ - 30I₂ = 12
```

**KVL for mesh 2 (I₂):**
```
(I₂-I₁)×30Ω + I₂×20Ω + 6V = 0
-30I₁ + 50I₂ = -6
```

**Solve the system:**
```
I₁ = 0.364A
I₂ = -0.098A (flows counterclockwise)
```

---

## Part 7: Node Voltage Analysis

### 7.1 Overview

Node voltage analysis (the foundation of MNA) assigns voltages to each node and uses KCL to solve for them.

### 7.2 Node Analysis Process

1. **Select reference node** (ground)
2. **Assign node voltages** to remaining nodes
3. **Write KCL** at each non-reference node
4. **Solve** the system of equations

### 7.3 Node Analysis Example

**Circuit:**
```
      V₁              V₂
    ●────100Ω────●────200Ω────●
    │            │            │
  5V ⊕        50Ω           GND
    │            │            │
    └────────────┴────────────┘
```

**KCL at V₁:**
```
(5V - V₁)/R_int = (V₁ - V₂)/100Ω + V₁/50Ω
```

**KCL at V₂:**
```
(V₁ - V₂)/100Ω = V₂/200Ω
```

Solve for V₁ and V₂.

---

## Part 8: Circuit Simplification Techniques

### 8.1 Series-Parallel Reduction

**Series resistors:** R_total = R₁ + R₂ + R₃ + ...

**Parallel resistors:** 1/R_total = 1/R₁ + 1/R₂ + 1/R₃ + ...

**Two parallel resistors shortcut:** R_total = (R₁ × R₂) / (R₁ + R₂)

### 8.2 Delta-Wye (Δ-Y) Transformation

Some circuits can't be simplified with series-parallel alone. Delta-Wye conversion helps.

**Delta to Wye:**
```
R₁ = (R_ab × R_ca) / (R_ab + R_bc + R_ca)
R₂ = (R_ab × R_bc) / (R_ab + R_bc + R_ca)
R₃ = (R_bc × R_ca) / (R_ab + R_bc + R_ca)
```

**Wye to Delta:**
```
R_ab = (R₁×R₂ + R₂×R₃ + R₃×R₁) / R₃
R_bc = (R₁×R₂ + R₂×R₃ + R₃×R₁) / R₁
R_ca = (R₁×R₂ + R₂×R₃ + R₃×R₁) / R₂
```

### 8.3 Source Transformation

**Voltage source to current source:**
- V_s in series with R → I_s = V_s/R in parallel with R

**Current source to voltage source:**
- I_s in parallel with R → V_s = I_s×R in series with R

---

## Part 9: Practical Analysis Tips

### 9.1 Choosing the Right Method

| Circuit Type | Best Method |
|--------------|-------------|
| Simple series-parallel | Direct reduction |
| Multiple voltage sources | Superposition or Mesh |
| Multiple current sources | Superposition or Node |
| Finding load behavior | Thévenin/Norton |
| Computer simulation | MNA (automated) |

### 9.2 Common Mistakes to Avoid

1. **Wrong polarity signs** — Be consistent with current direction conventions
2. **Forgetting reference node** — Always establish ground (0V reference)
3. **Mixing up series and parallel** — Draw the circuit clearly first
4. **Unit errors** — Keep all values in base units (V, A, Ω) for calculations

### 9.3 Verification Techniques

1. **Check power balance:** P_supplied = P_dissipated
2. **Verify KCL at every node:** Currents in = Currents out
3. **Verify KVL around every path:** Voltage rises = Voltage drops
4. **Sanity check:** Are results physically reasonable?

---

## Summary

This document covers the primary circuit analysis methods used in electrical engineering and implemented in CircuiTry3D:

| Method | Primary Use |
|--------|-------------|
| **MNA** | General circuit solving (solver backbone) |
| **Superposition** | Multiple source analysis |
| **Thévenin/Norton** | Circuit simplification, load analysis |
| **Maximum Power Transfer** | Optimization problems |
| **Mesh Analysis** | Path-based manual solving |
| **Node Analysis** | Node-based manual solving |

**CircuiTry3D Implementation:**
- MNA solver: `src/sim/dcSolver.ts`
- Connectivity analysis: `src/sim/connectivity.ts`
- Validation: `src/sim/circuitValidator.ts`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01 | Initial circuit analysis methods document |
