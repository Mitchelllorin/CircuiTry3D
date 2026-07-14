## Schematic Style Reference (3D Presentation)

Schematic Mode renders classic 2D circuit symbols as thin 3D extrusions. Every component must read exactly like the textbook references when viewed from above, while still offering depth cues and hover interactions. A global symbol standard selector (ANSI/IEEE or IEC) is available in the header; geometry must respect the active standard at all times.

**Theory Foundation:** [ELECTRICAL_THEORY_FUNDAMENTALS.md](./ELECTRICAL_THEORY_FUNDAMENTALS.md) — Electrical theory reference

**Related Documentation:**
- [COMPONENT_REFERENCE.md](./COMPONENT_REFERENCE.md) — Component theory and specifications
- [circuit-topology-reference.md](./circuit-topology-reference.md) — Layout conventions
- [CIRCUIT_RULES.md](./CIRCUIT_RULES.md) — Platform rules

**Reference Images:** See `src/assets/reference-circuits/` for canonical visual examples of circuit layouts.

- **Standards Compliance**
  - 3D extrusions trace the IEC 60617, IEEE Std 315, and ANSI/ASME Y32.2 glyph geometry using fixed lead clearances and stroke widths encoded in `schematic/standards.ts`.
  - Component bodies reserve the same proportions regardless of placement span so the rendered silhouettes match their 2D references when viewed from above.

- **Symbol Profiles**
  - **Battery:** Two flat plates (long/short) with optional `+` / `−` sprites positioned near the respective terminals.
  - **Resistor:** Six-peak zig-zag made from connected straight segments with the same thickness as the leads.
  - **Capacitor:** Two parallel plates separated by a neutral dielectric block; leads must stop at the plate faces.
  - **Inductor:** Four semi-circular turns rendered as thin rings aligned to the wire axis.
  - **Lamp:** Circular disc with a thin ring and crossed conductors to match the standard lamp symbol.
  - **Switch:** Two posts with a single angled blade segment indicating the open switch gap.
  - **Ground:** Three progressively shorter bars stacked vertically beneath the node.

**CRITICAL: Circuit Layout Standards**
The following layout constants are the authoritative source for ALL circuit rendering:
- `LAYOUT_SPECS` - Base SVG dimensions and frame positioning
- `SERIES_LAYOUT` - Series circuit bounds, margins, and distribution formulas
- `PARALLEL_LAYOUT` - Parallel circuit bounds and branch spacing rules
- `COMBINATION_LAYOUT` - Combination circuit positioning and parallel section rules
- `BATTERY_LAYOUT` - Unified battery scale and positioning (USE EVERYWHERE)

```typescript
// Correct usage - import from centralized module:
import {
  LAYOUT_SPECS,
  SERIES_LAYOUT,
  PARALLEL_LAYOUT,
  COMBINATION_LAYOUT,
  BATTERY_LAYOUT
} from '../schematic';

// Battery scale - ALWAYS use this constant:
const batteryScale = BATTERY_LAYOUT.scale;  // 0.85

// Series distribution - use centralized formula:
const { getTopCount, getBottomCount, getRightCount } = SERIES_LAYOUT.distribution;

// Parallel branch spacing - use centralized constants:
const { marginOffset2D, startOffset2D } = PARALLEL_LAYOUT.spacing;
```

---

### Visual Reference Guide

CircuiTry3D circuits must match the appearance of standard textbook diagrams. The following specifications are derived from authoritative educational sources and should be applied consistently throughout the app.

**Implementation Note:** Do not use magic numbers in components. Import constants from the schematic module:
```typescript
import { SCHEMATIC_COLORS, STROKE_WIDTHS, RESISTOR_SPECS, formatResistance } from '../schematic';
```

---

### Board & Lighting

- Use a neutral, low-saturation board colour so black strokes are easy to read.
- Lighting should emphasise silhouettes without introducing coloured reflections or emissive glows.

---

### Stroke Geometry

- Wires, component bodies, and symbol outlines are slender prisms/tubes coloured pure black (`#111111`).
- Preview placements desaturate to a soft grey, and selection highlights switch to a single accent blue (`#2563EB`).
- Wire thickness: consistent throughout the circuit, matching component lead thickness.
- All corners use clean 90° angles (orthogonal routing) for schematic clarity.

---

### Nodes / Junctions

- Model junction dots as small black hemispheres/spheres positioned just above the board plane.
- Junction dots appear at every T-junction and crossing where wires connect electrically.
- No bloom or emissive glow—clarity comes from silhouette only.
- Junction diameter: visually distinct but not larger than wire thickness × 3.

---

### Symbol Profiles

#### Battery (Voltage Source)
- Two flat plates of unequal length: **longer plate = positive (+)**, **shorter plate = negative (−)**.
- Plate spacing follows the selected template; leads terminate on the outer faces.
- **Plates are PERPENDICULAR to the wire path** (horizontal plates for vertical battery orientation).
- Polarity markers (+ and −) displayed when the standard calls for them (ANSI/IEEE default).
- Position: typically on the left side of the circuit for series/parallel layouts.
- Label format: voltage value with unit (e.g., "24 V", "12 V", "5V").

#### Resistor (ANSI/IEEE Standard - CircuiTry3D)
- **Zigzag pattern**: 3 tight, complete peaks forming a sawtooth wave.
- The zigzag is drawn as a continuous polyline with sharp vertices.
- Stroke thickness matches connected wires exactly.
- Horizontal leads extend from both ends of the zigzag body.
- Label format: resistance value with omega symbol (e.g., "100Ω", "250Ω", "1kΩ").
- Label position: adjacent to the component (above for horizontal, beside for vertical).
- Subscript notation for identification: R₁, R₂, R₃, R₄, etc.

#### Resistor (IEC Standard)
- Rectangular body (solid outline, no fill).
- Proportional leads on both ends.
- Same labeling conventions as ANSI/IEEE.

#### Capacitor
- Two parallel plates with a standard-compliant gap.
- No dielectric block is rendered; the void communicates separation.
- Polarised markers shown only when a standard requires them.

#### Inductor
- Semi-circular turns (coils/loops) aligned to the component axis.
- Coil count, arc, and pitch adjust to the current standard profile.

#### Lamp
- Circular disc with a thin ring and crossed conductors.

#### Switch
- Two posts with a single angled blade segment indicating the open switch gap.

#### Ground
- Three progressively shorter horizontal bars stacked vertically beneath the node.

---

### Labels

- Component sprites use black text on a semi-transparent white card for readability.
- Preview states dim label opacity; selected components keep the card but geometry shifts to highlight blue.
- Font: sans-serif, bold for values, regular for subscripts.
- Subscript numbers for component identification (R₁, R₂, etc.) placed alongside or below the resistance value.

---

### Circuit Layout Standards

#### Series Circuit
- Single continuous path with no branching nodes.
- All components connected end-to-end in one path.
- Current flows through each component sequentially.
- Layout: rectangular path with battery on one side, components distributed along the path.

#### Parallel Circuit
- Two common nodes (supply rail and return rail).
- Each branch component connected across the same two nodes.
- Branch components rendered vertically between horizontal bus rails.
- Junction dots at every branch point.
- Layout: ladder structure with battery on left, branches extending horizontally.

#### Series-Parallel (Combination) Circuit
**This is the canonical layout that must be followed:**

Based on the reference image, combination circuits follow this pattern:
```
          ┌──R₁──┬──R₂──┐
          │      │      │
    (+)───┤      •      ├───┐
   24V    │      │      │   │
    (−)───┤      •      ├───┘
          │      │      │
          └──R₃──┴──R₄──┘
```

- **Structure**: Rectangular frame with parallel branches inside.
- **Battery position**: Left side, oriented vertically with + on top.
- **Parallel groupings**: Resistors arranged in matched pairs on top and bottom rails.
- **Junction nodes**: Clearly marked at every branch point with filled circles.
- **Wire routing**: All orthogonal (90° angles only), no diagonal lines.
- **Spacing**: Components evenly distributed with consistent gaps.

**Reference Example (from `combination-circuit-reference.jpg`):**
- 24V battery on left
- R₁ (100Ω) and R₂ (250Ω) on the upper path in parallel branches
- R₃ (350Ω) and R₄ (200Ω) on the lower path in parallel branches
- Four junction nodes connecting the parallel sections

---

### Implementation Checklist

When rendering any circuit in CircuiTry3D, verify:

1. **Resistor zigzags** have 3 tight peaks, clearly visible and uniform (CircuiTry3D standard)
2. **Battery plates** are perpendicular to the wire path (long = +, short = −)
3. **Junction dots** appear at all electrical connection points
4. **Wire routing** uses orthogonal (90°) paths only
5. **Labels** include subscript identifiers (R₁, R₂) and values with units (100Ω)
6. **Component spacing** is even and symmetric where the topology allows
7. **Overall layout** matches the canonical patterns shown in reference images
8. **All circuits have 4 components** (battery + 3 others) for the standard square loop
9. **No empty sides** - EVERY side of the circuit must have a component (Rule C3D-011)

---

### CircuiTry3D Standard: No Empty Circuit Sides (Rule C3D-011)

**This is a mandatory rule for all circuit designs in CircuiTry3D.**

Every side of a series circuit must have a component. There should be no side in a circuit where there is no component - wires-only paths are not allowed in the standard layout.

**Standard Square Loop (4 components minimum):**
```
        TL ●────────[TOP]────────● TR
           │                       │
           │                       │
    (+)────┤                     [RIGHT]  ← Component required
   Battery │                       │
    (−)────┤                       │
           │                       │
        BL ●───────[BOTTOM]──────● BR
                   ↑
           Component required
```

**Required Components by Position:**
- **LEFT (Battery)**: Always present - power source
- **TOP**: Load component (resistor, switch, LED, etc.) - horizontal
- **RIGHT**: Load component - vertical orientation
- **BOTTOM**: Load component - horizontal (return path)

**Why this rule matters:**
1. **Educational clarity**: Students understand that every path in a circuit has purpose
2. **Visual consistency**: All diagrams follow the same balanced layout
3. **Real-world relevance**: Actual circuits have components on all paths
4. **Simulation accuracy**: Empty sides can create ambiguous analysis scenarios

---

### Reference Assets

- `src/assets/reference-circuits/combination-circuit-reference.jpg` — Canonical series-parallel combination circuit with labeled resistors and voltage source
- `src/assets/reference-circuits/circuit-types-gallery-reference.jpg` — Gallery of series, parallel, and combination circuit examples from educational sources

These reference images serve as the authoritative visual guide for how circuits must appear throughout CircuiTry3D.
