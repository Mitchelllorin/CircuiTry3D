## Schematic Style Reference (3D Presentation)

Schematic Mode renders classic 2D circuit symbols as thin 3D extrusions. Every component must read exactly like the textbook references when viewed from above, while still offering depth cues and hover interactions.

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
  - **Battery:** Two flat plates (long/short) with optional `+` / `−` sprites positioned near the respective terminals.
  - **Resistor:** Six-peak zig-zag made from connected straight segments with the same thickness as the leads.
  - **Capacitor:** Two parallel plates separated by a neutral dielectric block; leads must stop at the plate faces.
  - **Inductor:** Four semi-circular turns rendered as thin rings aligned to the wire axis.
  - **Lamp:** Circular disc with a thin ring and crossed conductors to match the standard lamp symbol.
  - **Switch:** Two posts with a single angled blade segment indicating the open switch gap.
  - **Ground:** Three progressively shorter bars stacked vertically beneath the node.

- **Standards Compliance**
  - Use the **Symbol Standard** selector in Schematic mode to toggle between *ANSI / IEEE Std 315* (zig-zag resistor) and *IEC 60617* (rectangular resistor) profiles.
  - Shared geometry (battery plates, capacitor plates, inductors, grounds, lamps, switches) follows the common definitions used across IEEE, IEC, and ANSI libraries.
  - Default exports use the ANSI/IEEE profile; team members targeting IEC deliverables should switch profiles before capturing renders or exporting.

- **Labels**
  - Component sprites use black text on a semi-transparent white card for readability over the board.
  - Preview states dim label opacity; selected components keep the card but the geometry shifts to highlight blue.

- **Layouts**
  - Series, parallel, and combination presets follow the exact node placements and proportions from the provided references so students can recognise the topology instantly.

These guidelines apply to both preset practice scenes and the interactive builder to ensure consistency between learning material and student-created circuits.
