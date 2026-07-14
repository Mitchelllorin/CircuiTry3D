## Circuit Topology Notes

These notes summarise the schematic conventions we are following for the practice diagrams and landing artwork.

**Theory Foundation:** [ELECTRICAL_THEORY_FUNDAMENTALS.md](./ELECTRICAL_THEORY_FUNDAMENTALS.md) — Series/parallel circuit theory

**Related Documentation:**
- [CIRCUIT_RULES.md](./CIRCUIT_RULES.md) — Platform rules
- [schematic-style-guidelines.md](./schematic-style-guidelines.md) — Symbol standards

**Visual Reference:** See `src/assets/reference-circuits/` for authoritative example images.

**Centralized Layout Constants:** All layout specifications are defined in `src/schematic/visualConstants.ts`:
- `SERIES_LAYOUT` - Series circuit positioning and component distribution
- `PARALLEL_LAYOUT` - Parallel circuit branch spacing and rail positioning
- `COMBINATION_LAYOUT` - Series-parallel combination circuit layout
- `BATTERY_LAYOUT` - Unified battery positioning (scale: 0.85)

---

### Layout Standards - Critical Pillar

The following rules define how components are positioned in circuit diagrams. These standards ensure consistency across the entire application.

#### Component Centering
- All components are centered within their allocated space
- Use `centerComponent(start, end)` utility for center position calculation
- Symmetric margins on both sides of each component

#### Even Distribution
- Components are distributed evenly around the circuit path
- For N components on a segment: spacing = segmentLength / N
- Use `distributeEvenly()` utility for position calculations

#### Series Circuit Distribution (4+ components)
```
topCount = ceil(componentCount / 3)
bottomCount = ceil((componentCount - topCount) / 2)
rightCount = componentCount - topCount - bottomCount
```

#### Parallel Branch Distribution
- Branches are evenly spaced across available width
- Formula: branchX = railStart + spacing * (index + 1)
- Where spacing = (railEnd - railStart) / (branchCount + 1)

---

### Series Circuits
- A single conductive path shared by every component; no branching nodes.
- All components experience identical current, so the diagram emphasises one continuous path.
- Standard IEC/IEEE symbology uses zigzag resistors, open/closed switch symbols, and battery plates of unequal length to mark polarity (shorter line = negative).

**Layout Pattern:**
```
    ┌────R₁────R₂────┐
    │                │
  (+)                │
  Battery            │
  (−)                │
    │                │
    └────────────────┘
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
