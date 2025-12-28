## Schematic Style Reference (3D Presentation)

Schematic Mode renders classic 2D circuit symbols as thin 3D extrusions. Every component must read exactly like the textbook references when viewed from above, while still offering depth cues and hover interactions. A global symbol standard selector (ANSI/IEEE or IEC) is available in the header; geometry must respect the active standard at all times.

**Reference Images:** See `src/assets/reference-circuits/` for canonical visual examples of circuit layouts.

**Centralized Constants:** All visual specifications are defined in `src/schematic/visualConstants.ts`. Import from `src/schematic/index.ts` for consistent styling across the app.

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
- Polarity markers (+ and −) displayed when the standard calls for them (ANSI/IEEE default).
- Position: typically on the left side of the circuit for series/parallel layouts.
- Label format: voltage value with unit (e.g., "24 V", "12 V", "5V").

#### Resistor (ANSI/IEEE Standard)
- **Zigzag pattern**: 4–6 complete peaks forming a sawtooth wave.
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
- Single continuous loop with no branching nodes.
- All components connected end-to-end in one path.
- Current flows through each component sequentially.
- Layout: rectangular loop with battery on one side, components distributed along the path.

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

1. **Resistor zigzags** have 4–6 peaks, clearly visible and uniform
2. **Battery plates** show correct polarity (long = +, short = −)
3. **Junction dots** appear at all electrical connection points
4. **Wire routing** uses orthogonal (90°) paths only
5. **Labels** include subscript identifiers (R₁, R₂) and values with units (100Ω)
6. **Component spacing** is even and symmetric where the topology allows
7. **Overall layout** matches the canonical patterns shown in reference images

---

### Reference Assets

- `src/assets/reference-circuits/combination-circuit-reference.jpg` — Canonical series-parallel combination circuit with labeled resistors and voltage source
- `src/assets/reference-circuits/circuit-types-gallery-reference.jpg` — Gallery of series, parallel, and combination circuit examples from educational sources

These reference images serve as the authoritative visual guide for how circuits must appear throughout CircuiTry3D.
