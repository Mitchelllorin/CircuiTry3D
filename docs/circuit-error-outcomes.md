## Circuit build errors: standard rules & outcomes

This project uses `src/sim/circuitValidator.ts` to classify “incorrect build” situations into consistent **issue types**, and the UI uses those types to decide **outcomes** (what the circuit does) and **animations** (what the learner sees).

### Core rules

- **Open circuit (`open_circuit`)**
  - **Meaning**: There is no complete conductive loop from the source through the circuit and back.
  - **Outcome**: No sustained current flow; current animation stays off.
  - **UI/animation**: Highlight the affected elements (typically the battery + a load). Builder view may lightly pulse affected parts.

- **Short circuit (`short_circuit`)**
  - **Meaning**: Battery terminals are connected by an (ideal) 0Ω path (usually wire/inductor-only path), bypassing loads.
  - **Outcome**: Unsafe overcurrent in a real circuit; in the ideal model this is treated as an invalid state (prevents simulation/current animation).
  - **UI/animation**: Affected elements pulse red, and the schematic builder emits brief “spark” bursts at the fault positions.

- **Reverse polarity / reverse bias**
  - **Diode reverse bias (`diode_reverse_bias`)**
    - **Outcome**: Blocks current; diode will not conduct.
  - **LED reverse bias (`led_reverse_bias`)**
    - **Outcome**: LED will not light (no forward current).
  - **Electrolytic capacitor reversed (`capacitor_reverse_polarity`)**
    - **Outcome**: Unsafe; shown as an error (risk of damage in real life).
  - **UI/animation**: Affected component(s) pulse amber to call attention to the orientation issue.

### Animation gating

Current-flow particles are intentionally **disabled** unless the circuit is validated as **complete**. This prevents misleading “current flowing” visuals when the circuit is open, shorted, or otherwise invalid.

### Where to change behavior

- **Validation logic**: `src/sim/circuitValidator.ts`
- **DC solve checks (ideal-short detection)**: `src/sim/dcSolver.ts`
- **Schematic builder visuals** (highlights + fault effects): `src/pages/SchematicMode.tsx` + `src/schematic/threeFactory.ts`

