## Circuit Topology Notes

These notes summarise the schematic conventions we are following for the practice diagrams and landing artwork.

- **Series circuits**
  - A single conductive loop shared by every component; no branching nodes.
  - All components experience identical current, so the diagram emphasises one continuous path.
  - Standard IEC/IEEE symbology uses zigzag resistors, open/closed switch symbols, and battery plates of unequal length to mark polarity (shorter line = negative).

- **Parallel circuits**
  - Two common nodes (a supply rail and a return rail) with each branch connected across the same potential difference.
  - Branch components are rendered vertically between the rails; bus connections are orthogonal for clarity.
  - Junction dots appear where conductors meet to communicate shared nodes per Kirchhoff's Current Law.

- **Series-parallel (combination) circuits**
  - Composite networks collapse to layered series segments with embedded parallel branches.
  - For the ladder exemplar we depict: `R1` in series with a parallel leg (`R2 || R3`), followed by `R4` returning to the source.
  - Labels live outside the conductor path so the zigzag symbology remains legible.

**Reference texts**

- *IEC 60617* – Graphical symbols for electrical diagrams.
- *IEEE Std 91/Std 315* – Standard graphic symbols for logic diagrams.
- J. O'Malley, *Basic Circuit Analysis* (chapter on series, parallel, and combination reductions).
