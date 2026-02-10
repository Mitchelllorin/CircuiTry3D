## Circuit Topology Notes

These notes summarise the schematic conventions we are following for the practice diagrams and landing artwork.

**Visual Reference:** See `src/assets/reference-circuits/` for authoritative example images.

---

## Standard Educational Layout (Square Loop)

**This is the canonical layout format used throughout CircuiTry3D.** All circuit designs in the application must follow these rules for visual consistency and educational clarity.

### Layout Rules

1. **Battery on the LEFT SIDE** (vertical orientation)
   - Positive terminal at top-left corner
   - Negative terminal at bottom-left corner
   - This matches the standard educational format used in schools and textbooks

2. **Components arranged around a SQUARE LOOP:**
   - **TOP RAIL**: First component(s) after battery positive (horizontal orientation)
   - **RIGHT SIDE**: Second component (if needed), vertical orientation
   - **BOTTOM RAIL**: Third/return component (if needed), horizontal orientation

3. **Junction nodes at CORNERS:**
   - Top-Left (TL): Connection from battery+ to top rail
   - Top-Right (TR): Connection from top rail to right side
   - Bottom-Right (BR): Connection from right side to bottom rail
   - Bottom-Left (BL): Connection from bottom rail to battery-

4. **Current flow direction** (conventional current):
   ```
   Battery+ → TL → TOP → TR → RIGHT → BR → BOTTOM → BL → Battery-
   ```

5. **No Empty Circuit Sides (Rule C3D-011):**
   - EVERY side of the circuit MUST have a component
   - Wires-only sides are NOT allowed in the standard layout
   - Series circuits require exactly 4 components (battery + 3 load components)
   - This is enforced by the circuit validator

### Standard Layout Diagram

```
        TL ●─────────[TOP]─────────● TR
           │                        │
           │                        │
    (+)────┤                       [R]  ← RIGHT (vertical)
   Battery │                        │
    (−)────┤                        │
           │                        │
        BL ●──────[BOTTOM]─────────● BR
```

### Code Reference

The standard layout constants are defined in `src/schematic/visualConstants.ts`:

- `CIRCUIT_LAYOUT_3D` — Coordinates for 3D rendering (legacy.html presets)
- `CIRCUIT_LAYOUT_2D` — Coordinates for 2D SVG diagrams
- `getStandardPlacements()` — Helper function for component positioning

### 3D Coordinates (for PRESET_CIRCUITS in legacy.html)

| Position | Coordinates (x, y, z) | Rotation |
|----------|----------------------|----------|
| Battery (left) | [-10, 0, 0] | π/2 (90°) |
| Top component | [0, 0, 6] | 0 (horizontal) |
| Right component | [10, 0, 0] | π/2 (90°) |
| Bottom component | [0, 0, -6] | 0 (horizontal) |

| Junction | Coordinates |
|----------|-------------|
| J_TL | [-10, 0, 6] |
| J_TR | [10, 0, 6] |
| J_BR | [10, 0, -6] |
| J_BL | [-10, 0, -6] |

---

### Series Circuits
- A single conductive loop shared by every component; no branching nodes.
- All components experience identical current, so the diagram emphasises one continuous path.
- Standard IEC/IEEE symbology uses zigzag resistors, open/closed switch symbols, and battery plates of unequal length to mark polarity (shorter line = negative).

**Layout Pattern (Standard Square Loop):**
```
    TL ●────────[R₁]────────● TR
       │                     │
    (+)│                    [R₂]  ← vertical
  Battery                    │
    (−)│                     │
       │                     │
    BL ●────────[R₃]────────● BR
```

---

### Parallel Circuits
- Two common nodes (a supply rail and a return rail) with each branch connected across the same potential difference.
- Branch components are rendered vertically between the rails; bus connections are orthogonal for clarity.
- Junction dots appear where conductors meet to communicate shared nodes per Kirchhoff's Current Law.

**Layout Pattern:**
```
    ┌───R₁───┐
    │        │
  (+)──●──●──●──┐
  Battery       │
  (−)──●──●──●──┘
    │        │
    └───R₂───┘
```

---

### Series-Parallel (Combination) Circuits
- Composite networks collapse to layered series segments with embedded parallel branches.
- For the ladder exemplar we depict: `R1` in series with a parallel leg (`R2 || R3`), followed by `R4` returning to the source.
- Labels live outside the conductor path so the zigzag symbology remains legible.

**Canonical Layout (from reference image):**
```
          ┌──R₁──┬──R₂──┐
          │      │      │
    (+)───┤      •      ├───┐
   24V    │      │      │   │
    (−)───┤      •      ├───┘
          │      │      │
          └──R₃──┴──R₄──┘
```

**Key visual requirements:**
- Rectangular frame structure with battery on left
- Parallel branches clearly separated with junction nodes (•) at connection points
- All wire routing orthogonal (90° angles only)
- Resistor values labeled with subscripts (R₁, R₂) and ohm values (100Ω, 250Ω)
- Consistent spacing between parallel branches

---

### Reference Texts

- *IEC 60617* – Graphical symbols for electrical diagrams.
- *IEEE Std 91/Std 315* – Standard graphic symbols for logic diagrams.
- J. O'Malley, *Basic Circuit Analysis* (chapter on series, parallel, and combination reductions).

### Reference Assets

- `src/assets/reference-circuits/combination-circuit-reference.jpg` — Canonical combination circuit example
- `src/assets/reference-circuits/circuit-types-gallery-reference.jpg` — Gallery of circuit topology examples
