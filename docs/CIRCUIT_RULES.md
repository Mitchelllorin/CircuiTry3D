# CircuiTry3D Circuit Rules

This document defines the foundational rules that govern circuit behavior in CircuiTry3D. These rules combine standard electrical laws (Kirchhoff's and Ohm's Laws) with CircuiTry3D-specific implementation rules to ensure consistent, physically accurate, and educationally sound circuit simulation.

## Part 1: Standard Electrical Laws

### Ohm's Law

The fundamental relationship between voltage, current, and resistance:

```
V = I × R
I = V / R
R = V / I
```

Where:
- **V** (Voltage) is measured in Volts (V)
- **I** (Current) is measured in Amperes (A)
- **R** (Resistance) is measured in Ohms (Ω)

### Power Equations

Power dissipation and generation follow these relationships:

```
P = V × I
P = I² × R
P = V² / R
```

Where **P** (Power) is measured in Watts (W).

### Kirchhoff's Current Law (KCL)

> **"At any node (junction) in an electrical circuit, the sum of currents flowing into that node equals the sum of currents flowing out of that node."**

Mathematical form:
```
Σ I_in = Σ I_out
```
or equivalently:
```
Σ I = 0  (using sign convention: positive for in, negative for out)
```

**CircuiTry3D Implementation:**
- Applied at every junction and wire intersection
- Ensures current conservation throughout the circuit
- Prevents physically impossible current distributions
- **Junction nodes (amber dots) serve as explicit KCL application points for educational clarity**

### Kirchhoff's Voltage Law (KVL)

> **"Around any closed loop in a circuit, the algebraic sum of all voltage drops and rises equals zero."**

Mathematical form:
```
Σ V = 0  (around any closed loop)
```

**CircuiTry3D Implementation:**
- Enforced through voltage-source constraints
- Used in Modified Nodal Analysis (MNA) solver
- Ensures energy conservation in closed loops

---

## Part 2: CircuiTry3D Fundamental Rules

### Rule C3D-001: Open Circuit = Zero Current

> **"No current shall flow through any circuit path that is not part of a complete closed loop containing a power source."**

**Rationale:** This is a direct consequence of KCL and charge conservation. For current to flow, charges must have a complete path to return to their source.

**Implementation Requirements:**
1. Before calculating current flow, verify the circuit forms a closed loop
2. Detect and flag open circuits during validation
3. Set current to 0A for all elements not part of a closed loop
4. Current flow animation MUST NOT display when circuit is open

**Error Condition:** `OPEN_CIRCUIT`
- Severity: ERROR
- Message: "Open Circuit Detected - No complete path exists for current flow"

### Rule C3D-002: Short Circuit Protection

> **"A direct connection (zero resistance path) between battery terminals shall be flagged as an error and shall not allow infinite current calculation."**

**Rationale:** In an ideal model, V = IR with R = 0 implies I = ∞, which is physically meaningless and computationally problematic.

**Implementation Requirements:**
1. Detect when battery positive and negative terminals are connected only by wires (ideal shorts)
2. Flag as "invalid_ideal_short" status
3. Display warning: "Infinite current in ideal model"
4. Do not attempt to solve or animate current flow

**Error Condition:** `SHORT_CIRCUIT`
- Severity: ERROR
- Message: "Short Circuit Detected - Battery terminals connected by zero-resistance path"

### Rule C3D-003: Grounded Reference Requirement

> **"Every solvable circuit should have a ground reference node that defines the zero-voltage potential."**

**Rationale:** Node voltages are relative measurements. Without a reference point, absolute voltages are undefined.

**Implementation Requirements:**
1. Recommend (info severity) adding a ground element
2. If no ground is present, use battery negative terminal as reference
3. Display voltage values relative to the chosen reference

**Info Condition:** `MISSING_GROUND`
- Severity: INFO
- Message: "No ground reference - using battery negative as 0V reference"

### Rule C3D-004: Connection Tolerance

> **"Two terminals are considered electrically connected if they are within 0.6 grid units of each other."**

**Rationale:** Provides snap-to-connect behavior while maintaining precise layouts.

**Implementation Requirements:**
1. Use CONNECTION_TOLERANCE = 0.6 for all connection checks
2. Apply during wire routing, validation, and simulation
3. Display visual feedback when terminals are within snap range

```typescript
const CONNECTION_TOLERANCE = 0.6;
function areConnected(p1: Vec2, p2: Vec2): boolean {
  const dx = p1.x - p2.x;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dz * dz) <= CONNECTION_TOLERANCE;
}
```

### Rule C3D-005: Current Direction Convention

> **"Conventional current direction (positive to negative) is the primary reference. Electron flow visualization reverses this direction."**

**Rationale:** Aligns with standard electrical engineering practice while supporting physics education showing actual electron movement.

**Implementation Requirements:**
1. **Conventional current**: Positive charge flow from + to − (default)
2. **Electron flow**: Negative charge flow from − to + (visualization mode)
3. Current value signs use conventional direction
4. Animation system supports both visualization modes

### Rule C3D-006: Terminal Orientation

> **"Every two-terminal component has defined start and end terminals with consistent polarity interpretation."**

**Standard Orientations:**

| Component | Start Terminal | End Terminal | Current Direction (positive) |
|-----------|---------------|--------------|------------------------------|
| Battery   | Negative (−)  | Positive (+) | End → Start (through source) |
| Resistor  | Input         | Output       | Start → End |
| Lamp      | Input         | Output       | Start → End |
| Capacitor | Plate 1       | Plate 2      | N/A (DC steady-state) |
| Inductor  | Terminal 1    | Terminal 2   | Start → End (ideal short in DC) |
| Diode     | Anode (+)     | Cathode (−)  | Start → End (when forward biased) |
| Switch    | Terminal 1    | Terminal 2   | Start → End (when closed) |

### Rule C3D-007: Wire Segment Continuity

> **"Wires are ideal conductors. Each wire segment maintains the same current throughout its length, with segment current tracked individually."**

**Implementation Requirements:**
1. Model wire segments as 0V voltage sources for current tracking
2. Maintain current continuity across junctions
3. Track per-segment current for animation purposes

### Rule C3D-007a: Junction Node Standard

> **"Junction nodes are the CircuiTry3D standard for creating branch points in wire runs. Users can drop a junction anywhere on an existing wire to start new branches."**

**Node Types and Visual Indicators:**

| Node Type | Color | Priority | Purpose |
|-----------|-------|----------|---------|
| `componentPin` | Green | 3 (highest) | Fixed terminal on components |
| `junction` | Amber/Orange | 2 | Branch point for parallel/series-parallel circuits |
| `wireAnchor` | Cyan | 1 (lowest) | Free wire endpoint |

**Implementation Requirements:**
1. Clicking/tapping on any wire run creates a junction node at that point
2. Hovering over a wire shows a pulsing '+' indicator where a junction can be placed
3. Junctions can connect unlimited wires for multi-branch topologies
4. Nearby nodes merge automatically within MERGE_RADIUS (6px)
5. Node priority determines which type is preserved during merge

**Educational Purpose:**
- Junctions make KCL (Kirchhoff's Current Law) application points explicit
- Critical for "squares within squares" series-parallel circuit problems
- Enables step-by-step decomposition: identify series sections, then parallel sections

### Rule C3D-008: Floating Component Detection

> **"Components with fewer than 2 electrical connections shall be flagged as warnings."**

**Conditions:**
- 0 connections: "Floating Component - not connected to circuit"
- 1 connection: "Partially Connected - one terminal open"

**Severity:** WARNING (circuit may still solve, but result may be incomplete)

### Rule C3D-009: Power Source Requirement

> **"At least one power source (battery) is required for current flow."**

**Implementation Requirements:**
1. Detect circuits with loads but no power source
2. Set all currents to 0A when no power source present
3. Display warning to add battery

**Warning Condition:** `MISSING_POWER_SOURCE`
- Severity: WARNING
- Message: "No power source - add a battery to power the circuit"

### Rule C3D-010: Circuit Completion State

> **"Current flow animation and simulation shall only run when circuit validation returns 'complete' status."**

**Circuit States:**

| State | Definition | Current Flow | Animation |
|-------|------------|--------------|-----------|
| `incomplete` | Missing elements or connections | 0A | Disabled |
| `invalid` | Has errors (short/open circuit) | 0A | Disabled |
| `complete` | Valid closed loop with source and load | Calculated | Enabled |

**Implementation:**
```typescript
const validation = validateCircuit(elements);
if (validation.circuitStatus === 'complete') {
  const solution = solveDCCircuit(elements);
  flowAnimationSystem.setCircuitClosed(true);
  flowAnimationSystem.setCurrentIntensity(solution.totalCurrent);
} else {
  flowAnimationSystem.setCircuitClosed(false);
}
```

---

## Part 3: DC Steady-State Simplifications

### Capacitors
- Treated as open circuits in DC steady-state
- No current flows through capacitors after initial charging
- For AC/transient analysis (future): reactive behavior applies

### Inductors
- Treated as ideal shorts (0Ω) in DC steady-state
- Pass full current with no voltage drop
- For AC/transient analysis (future): reactive behavior applies

### Diodes and BJTs
- Not included in linear DC solver
- Future: implement nonlinear Newton-Raphson iteration

### Switches
- Currently treated as open circuit (no state tracking)
- Future: implement on/off state with UI toggle

---

## Part 4: Validation Check Order

The circuit validator runs checks in this order:

1. **Short Circuit Detection** (ERROR)
   - Direct wire between battery terminals
   - Ideal short path detected by solver

2. **Open Circuit Detection** (ERROR)
   - Battery and loads in separate connected components
   - No closed loop for current flow

3. **Floating Component Detection** (WARNING)
   - Components with 0 connections
   - Components with only 1 connection

4. **Floating Wire Detection** (WARNING)
   - Wire segments not connected to any components

5. **Missing Ground Reference** (INFO)
   - Battery present but no ground symbol

6. **Missing Power Source** (WARNING)
   - Components present but no battery

---

## Part 5: W.I.R.E. Metrics Integration

The W.I.R.E. system (Watts, Current, Resistance, Voltage) displays real-time circuit metrics following these rules:

### Metric Calculation Order
1. Extract known values from components (given resistance, source voltage)
2. Apply Ohm's Law to calculate unknown values
3. Calculate power using P = VI
4. Propagate values through series/parallel relationships

### Series Circuit Rules
- Current is the same through all components: I_total = I_1 = I_2 = ...
- Voltage divides: V_total = V_1 + V_2 + ...
- Resistance adds: R_total = R_1 + R_2 + ...

### Parallel Circuit Rules
- Voltage is the same across all branches: V_total = V_1 = V_2 = ...
- Current divides: I_total = I_1 + I_2 + ...
- Resistance follows: 1/R_total = 1/R_1 + 1/R_2 + ...

---

## Part 6: Error Message Standards

All validation messages follow this format:

```typescript
interface ValidationIssue {
  type: ValidationIssueType;        // e.g., 'open_circuit'
  severity: 'error' | 'warning' | 'info';
  message: string;                   // Short title
  description: string;               // Detailed explanation
  affectedElements: string[];        // IDs of affected components
  affectedPositions?: Vec2[];        // Locations to highlight
}
```

### Severity Guidelines
- **ERROR**: Circuit cannot function; must be fixed before simulation
- **WARNING**: Circuit may work partially; should be reviewed
- **INFO**: Suggestion for improvement; optional to address

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-XX | Initial rules document |

---

## References

- [CIRCUIT_SIMULATION_REFERENCE.md](./CIRCUIT_SIMULATION_REFERENCE.md) - Technical solver documentation
- [circuit-topology-reference.md](./circuit-topology-reference.md) - Topology detection algorithms
- [schematic-style-guidelines.md](./schematic-style-guidelines.md) - Symbol and layout standards
