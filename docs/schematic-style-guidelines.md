## Schematic Style Reference

The schematic mode must render 2D diagrams that match classic textbook conventions as illustrated in the reference screenshots provided (series circuits, parallel circuits, and series-parallel combinations).

- **Canvas**
  - White or light background (#ffffff).
  - All wiring runs are rendered as black lines (#000000) with consistent stroke width (2px @ 1× scale).
  - Only right-angle routing (horizontal/vertical segments); no perspective or 3D shading.

- **Nodes / Junctions**
  - Use filled black circles (diameter ≈ 6px) at every electrical junction where three or more conductors meet.
  - No glow or gradients; the dot should sit centered on the wire intersection.

- **Battery (DC Source)**
  - Two parallel plates oriented perpendicular to the current path.
  - Positive terminal = longer line, negative terminal = shorter line.
  - Spacing between plates ≈ stroke width × 4.
  - Optional polarity labels `+` / `−` placed adjacent to terminals.

- **Resistor**
  - Use the US zig-zag symbol with 6 peaks.
  - Same stroke width as wires.
  - Labels (e.g., `R1`) centred near the resistor without overlapping conductors.

- **Series Layout**
  - Components aligned horizontally across the top span with the source placed on the left leg.
  - Return path closes the rectangle with no skew.

- **Parallel Layout**
  - Bus rails horizontal; branches vertical.
  - Branch spacing uniform; all components aligned to share the same start/end nodes.

- **Series-Parallel Combination**
  - Depict series elements on top branch and parallel branch stacked vertically, matching the ladder version shown in the reference.

- **Typography**
  - Use sans-serif font (e.g., `Inter`, `Arial`) for labels at 12–14px.
  - Text should render in black and sit on a transparent background.

These rules apply to both pre-built practice presets and the interactive builder so that every generated circuit matches the canonical diagrams the user supplied.
