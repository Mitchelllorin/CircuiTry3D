## Circuit Topology Notes

These notes summarise the schematic conventions we are following for the practice diagrams and landing artwork.

**Visual Reference:** See `src/assets/reference-circuits/` for authoritative example images.

---

### Series Circuits
- A single conductive loop shared by every component; no branching nodes.
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
