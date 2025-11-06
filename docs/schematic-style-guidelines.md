## Schematic Style Reference (3D Presentation)

Schematic Mode renders classic 2D circuit symbols as thin 3D extrusions. Every component must read exactly like the textbook references when viewed from above, while still offering depth cues and hover interactions. A global symbol standard selector (ANSI/IEEE or IEC) is available in the header; geometry must respect the active standard at all times.

- **Board & Lighting**
  - Use a neutral, low-saturation board colour so black strokes are easy to read.
  - Lighting should emphasise silhouettes without introducing coloured reflections or emissive glows.

- **Stroke Geometry**
  - Wires, component bodies, and symbol outlines are slender prisms/tubes coloured pure black (`#111111`).
  - Preview placements desaturate to a soft grey, and selection highlights switch to a single accent blue (`#2563EB`).

- **Nodes / Junctions**
  - Model junction dots as small black hemispheres/spheres positioned just above the board plane.
  - No bloom or emissive glow—clarity comes from silhouette only.

- **Symbol Profiles**
  - **Battery:** Two flat plates (long/short) with polarity sprites when the standard calls for them. Plate spacing follows the selected template; leads terminate on the outer faces.
  - **Resistor:** ANSI/IEEE renders the zig-zag with 4-5 complete peaks (oscillations) and tight spacing for clear visual recognition. IEC renders a rectangular body with proportional leads. Stroke thickness always matches the connected wires.
  - **Capacitor:** Two parallel plates with a standard-compliant gap. No dielectric block is rendered; the void communicates separation. Polarised markers are only shown when a standard requires them.
  - **Inductor:** Semi-circular turns aligned to the axis. Coil count, arc, and pitch adjust to the current standard profile.
  - **Lamp:** Circular disc with a thin ring and crossed conductors to match the standard lamp symbol.
  - **Switch:** Two posts with a single angled blade segment indicating the open switch gap.
  - **Ground:** Three progressively shorter bars stacked vertically beneath the node.

- **Labels**
  - Component sprites use black text on a semi-transparent white card for readability over the board.
  - Preview states dim label opacity; selected components keep the card but the geometry shifts to highlight blue.

- **Layouts**
  - Series, parallel, and combination presets follow the exact node placements and proportions from the provided references so students can recognise the topology instantly.

These guidelines apply to both preset practice scenes and the interactive builder to ensure consistency between learning material and student-created circuits.
