/**
 * Electrical Studies Textbook Data
 *
 * Covers Year 1 (DC Fundamentals) and Year 2 (AC Theory & Devices) content
 * aligned with SkilledTradesBC / Red Seal electrical apprenticeship curricula.
 * All formulas are enforced by the circuit simulator (dcSolver, circuitValidator).
 */

export type Formula = {
  name: string;
  expression: string;
  variables: Record<string, string>;
  example?: string;
};

export type TextbookSection = {
  id: string;
  title: string;
  body: string[];          // Paragraphs of explanatory text
  formulas?: Formula[];
  keyPoints?: string[];
  safetyNotes?: string[];
  realWorldExamples?: string[];
};

export type TextbookChapter = {
  id: string;
  number: number;
  year: 1 | 2;
  title: string;
  overview: string;
  sections: TextbookSection[];
};

export type TextbookData = {
  title: string;
  subtitle: string;
  edition: string;
  chapters: TextbookChapter[];
};

const textbook: TextbookData = {
  title: "Electrical Studies",
  subtitle: "Year 1 & Year 2 — DC Fundamentals, AC Theory & Practical Wiring",
  edition: "CircuiTry3D Reference Edition",
  chapters: [
    // ─────────────────────────────────────────────────────────────────────────
    //  YEAR 1 — DC FUNDAMENTALS
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "atomic-theory",
      number: 1,
      year: 1,
      title: "Atomic Theory & Electrical Charge",
      overview:
        "All matter is made of atoms. Understanding the structure of the atom — protons, neutrons, and electrons — is the starting point for understanding why electricity flows.",
      sections: [
        {
          id: "atomic-structure",
          title: "Atomic Structure",
          body: [
            "Every element is made of atoms. An atom consists of a nucleus (containing positively-charged protons and neutral neutrons) surrounded by negatively-charged electrons arranged in shells (energy levels).",
            "The number of protons in the nucleus defines the element (e.g., copper has 29 protons). Under normal conditions an atom is electrically neutral — the number of electrons equals the number of protons.",
            "Electrons in the outermost shell (valence shell) are the least tightly bound to the nucleus. In conductive materials such as copper, silver, and gold, there is only one valence electron — a free electron — that can drift from atom to atom when a voltage is applied.",
          ],
          keyPoints: [
            "Protons: positive charge (+1), fixed in nucleus",
            "Neutrons: no charge, fixed in nucleus",
            "Electrons: negative charge (−1), in shells around nucleus",
            "Valence electrons determine conductivity",
            "Conductors (copper, aluminium) have 1–3 valence electrons",
            "Insulators (rubber, PVC) have 5–8 valence electrons",
          ],
        },
        {
          id: "electrical-charge",
          title: "Electrical Charge",
          body: [
            "Electric charge (symbol Q) is measured in coulombs (C). One coulomb equals the charge of 6.242 × 10¹⁸ electrons.",
            "Like charges repel each other; unlike charges attract. This fundamental law (Coulomb's Law) governs how charged particles interact and is the force that drives current flow when a potential difference (voltage) is present.",
            "Static electricity is a buildup of electrical charge on a surface that is not free to flow. ESD (Electrostatic Discharge) can damage sensitive electronic components.",
          ],
          formulas: [
            {
              name: "Coulomb's Law",
              expression: "F = k × (Q₁ × Q₂) / r²",
              variables: {
                F: "Force between charges (N)",
                k: "Coulomb's constant (8.99 × 10⁹ N·m²/C²)",
                "Q₁": "Charge 1 (C)",
                "Q₂": "Charge 2 (C)",
                r: "Distance between charges (m)",
              },
            },
          ],
          safetyNotes: [
            "Always discharge capacitors before working on circuits — they can store lethal charge even after power is removed.",
            "Use anti-static wrist straps when handling PCBs and sensitive ICs.",
          ],
        },
        {
          id: "electron-theory",
          title: "Electron Flow vs. Conventional Current",
          body: [
            "Electron flow describes the actual movement of electrons from the negative terminal of a source, through the external circuit, to the positive terminal.",
            "Conventional current (used in most textbooks and circuit analysis) flows in the opposite direction — from positive to negative. This convention was established before the electron was discovered.",
            "In CircuiTry3D, the simulator uses conventional current direction: positive terminal of battery → through circuit → negative terminal. The current arrows shown on component models follow conventional current.",
          ],
          keyPoints: [
            "Electron flow: negative (−) → circuit → positive (+)",
            "Conventional current: positive (+) → circuit → negative (−)",
            "Ohm's Law and Kirchhoff's Laws work with conventional current",
            "CircuiTry3D uses conventional current throughout",
          ],
        },
      ],
    },

    {
      id: "ohms-law",
      number: 2,
      year: 1,
      title: "Voltage, Current & Resistance — Ohm's Law",
      overview:
        "The three fundamental quantities in a DC circuit are voltage (V), current (I), and resistance (R). Ohm's Law defines the relationship between them and is the single most important formula in electrical studies.",
      sections: [
        {
          id: "voltage",
          title: "Voltage (Electromotive Force)",
          body: [
            "Voltage (symbol V or E) is the electrical potential difference between two points. It is the force that pushes electrons through a conductor. Voltage is measured in volts (V).",
            "A battery converts chemical energy into electrical energy, producing a voltage (EMF — electromotive force) across its terminals. The positive terminal is at higher potential than the negative terminal.",
            "Voltage does not flow; it exists between two points. Current flows because of voltage.",
          ],
          formulas: [
            {
              name: "Ohm's Law — Voltage",
              expression: "V = I × R",
              variables: {
                V: "Voltage (volts, V)",
                I: "Current (amperes, A)",
                R: "Resistance (ohms, Ω)",
              },
              example: "A 2 A current through a 10 Ω resistor produces V = 2 × 10 = 20 V",
            },
          ],
        },
        {
          id: "current",
          title: "Current",
          body: [
            "Current (symbol I) is the rate of flow of electric charge past a point in a circuit. It is measured in amperes (A). One ampere equals one coulomb of charge passing per second.",
            "Current can only flow in a complete (closed) circuit. An open circuit (a break anywhere in the loop) stops current flow entirely.",
            "The ammeter is used to measure current and must always be connected in series with the load so that all current passes through it.",
          ],
          formulas: [
            {
              name: "Ohm's Law — Current",
              expression: "I = V / R",
              variables: {
                V: "Voltage (V)",
                I: "Current (A)",
                R: "Resistance (Ω)",
              },
              example: "Applying 12 V across a 4 Ω resistor: I = 12 / 4 = 3 A",
            },
            {
              name: "Charge and Current",
              expression: "Q = I × t",
              variables: {
                Q: "Charge (coulombs, C)",
                I: "Current (A)",
                t: "Time (seconds, s)",
              },
            },
          ],
        },
        {
          id: "resistance",
          title: "Resistance",
          body: [
            "Resistance (symbol R) is the opposition to the flow of current in a conductor. It is measured in ohms (Ω). All real conductors have some resistance; a perfect conductor would have zero resistance.",
            "Resistance depends on: material (resistivity ρ), length (L), cross-sectional area (A), and temperature. Resistance increases with length and temperature, and decreases with larger cross-sectional area.",
            "The voltmeter measures the voltage drop across a resistance and must always be connected in parallel with the component being measured.",
          ],
          formulas: [
            {
              name: "Ohm's Law — Resistance",
              expression: "R = V / I",
              variables: {
                R: "Resistance (Ω)",
                V: "Voltage (V)",
                I: "Current (A)",
              },
              example: "A 24 V source produces 6 A: R = 24 / 6 = 4 Ω",
            },
            {
              name: "Resistance from material properties",
              expression: "R = ρ × L / A",
              variables: {
                R: "Resistance (Ω)",
                ρ: "Resistivity of material (Ω·m)",
                L: "Length of conductor (m)",
                A: "Cross-sectional area (m²)",
              },
            },
          ],
          keyPoints: [
            "Resistors limit current flow in a circuit",
            "The W.I.R.E. table: Watts, (current) I, Resistance, EMF (Voltage)",
            "Resistor colour code: Black Brown Red Orange Yellow Green Blue Violet Grey White (0–9)",
            "Gold band = 5% tolerance; Silver = 10%; No band = 20%",
          ],
        },
        {
          id: "ohms-law-triangle",
          title: "The Ohm's Law Triangle",
          body: [
            "The Ohm's Law triangle is a memory aid: cover the unknown quantity and the remaining two quantities show you whether to multiply or divide.",
            "Place V on top, I and R on the bottom. Covering V gives V = I × R. Covering I gives I = V / R. Covering R gives R = V / I.",
          ],
          formulas: [
            {
              name: "Ohm's Law (all three forms)",
              expression: "V = I × R   |   I = V / R   |   R = V / I",
              variables: {
                V: "Voltage (V)",
                I: "Current (A)",
                R: "Resistance (Ω)",
              },
            },
          ],
          realWorldExamples: [
            "A standard household LED bulb draws about 0.09 A at 120 V — its equivalent resistance is R = 120 / 0.09 ≈ 1 333 Ω.",
            "The heating element in a 1 500 W electric kettle running on 120 V draws I = 1 500 / 120 = 12.5 A, requiring a 15 A circuit breaker.",
          ],
        },
      ],
    },

    {
      id: "series-circuits",
      number: 3,
      year: 1,
      title: "Series Circuits",
      overview:
        "In a series circuit all components are connected end-to-end in a single loop. Current has only one path. Understanding the voltage divider rule and total resistance is essential.",
      sections: [
        {
          id: "series-rules",
          title: "Rules for Series Circuits",
          body: [
            "A series circuit provides a single conductive path between the two terminals of the voltage source. If any component in the path opens (fails), the entire circuit stops functioning.",
            "There are three defining rules for series circuits that must hold true at all times.",
          ],
          keyPoints: [
            "Rule 1 — Current: Current is the same through every component. I_T = I₁ = I₂ = I₃ = …",
            "Rule 2 — Resistance: Total resistance is the sum of all individual resistances. R_T = R₁ + R₂ + R₃ + …",
            "Rule 3 — Voltage: The sum of all voltage drops equals the source voltage (KVL). V_S = V₁ + V₂ + V₃ + …",
          ],
          formulas: [
            {
              name: "Total Resistance (Series)",
              expression: "R_T = R₁ + R₂ + R₃ + …",
              variables: {
                R_T: "Total resistance (Ω)",
                "R₁": "Resistance of component 1 (Ω)",
              },
              example: "R₁ = 150 Ω, R₂ = 200 Ω, R₃ = 250 Ω → R_T = 600 Ω",
            },
            {
              name: "Voltage Divider Rule",
              expression: "V_x = V_S × (R_x / R_T)",
              variables: {
                V_x: "Voltage across component x (V)",
                V_S: "Source voltage (V)",
                R_x: "Resistance of component x (Ω)",
                R_T: "Total resistance (Ω)",
              },
              example: "V₁ = 24 × (150/600) = 6 V",
            },
          ],
          safetyNotes: [
            "In a series circuit a broken wire or blown fuse opens the entire circuit — always check for continuity when troubleshooting.",
          ],
          realWorldExamples: [
            "Old-style Christmas light strings wired in series: one blown bulb darkens the entire string.",
            "A fuse is placed in series with the load so that an overload opens the circuit and protects the wiring.",
          ],
        },
        {
          id: "wire-table-series",
          title: "W.I.R.E. Table for Series Circuits",
          body: [
            "The W.I.R.E. table (Watts · Current · Resistance · EMF/Voltage) is the standard worksheet format for solving circuits in BC electrical trades training.",
            "Fill in all known values first, then apply series rules to find unknown quantities. Total resistance, total current, individual voltage drops, and individual power dissipation are found in sequence.",
          ],
          keyPoints: [
            "Column headers: Component | Watts (P) | Current (I) | Resistance (R) | Voltage (V)",
            "In series: the Current column is identical for all rows",
            "Total Voltage (V_T) = sum of all component voltages",
            "Total Power (P_T) = sum of all component powers = V_T × I_T",
          ],
        },
      ],
    },

    {
      id: "parallel-circuits",
      number: 4,
      year: 1,
      title: "Parallel Circuits",
      overview:
        "In a parallel circuit each component is connected directly across the voltage source. Current divides between branches. Total resistance is always less than the smallest branch resistance.",
      sections: [
        {
          id: "parallel-rules",
          title: "Rules for Parallel Circuits",
          body: [
            "A parallel circuit provides multiple conductive paths between the source terminals. Current divides among the branches according to each branch's resistance (Kirchhoff's Current Law). If one branch opens, the remaining branches continue to operate.",
          ],
          keyPoints: [
            "Rule 1 — Voltage: Voltage is the same across every branch. V_T = V₁ = V₂ = V₃ = …",
            "Rule 2 — Current: Total current equals the sum of all branch currents. I_T = I₁ + I₂ + I₃ + …",
            "Rule 3 — Resistance: Total resistance is always less than the smallest branch resistance.",
          ],
          formulas: [
            {
              name: "Total Resistance (Two Branches — Product over Sum)",
              expression: "R_T = (R₁ × R₂) / (R₁ + R₂)",
              variables: {
                R_T: "Total resistance (Ω)",
                "R₁": "Branch 1 resistance (Ω)",
                "R₂": "Branch 2 resistance (Ω)",
              },
              example: "R₁ = 6 Ω, R₂ = 12 Ω → R_T = (6×12)/(6+12) = 72/18 = 4 Ω",
            },
            {
              name: "Total Resistance (Reciprocal Method)",
              expression: "1/R_T = 1/R₁ + 1/R₂ + 1/R₃ + …",
              variables: {
                R_T: "Total resistance (Ω)",
              },
            },
            {
              name: "Equal Resistors in Parallel",
              expression: "R_T = R / n",
              variables: {
                R: "Value of one resistor (Ω)",
                n: "Number of equal resistors",
              },
              example: "Three 30 Ω resistors in parallel: R_T = 30 / 3 = 10 Ω",
            },
            {
              name: "Current Divider Rule",
              expression: "I_x = I_T × (R_T / R_x)",
              variables: {
                I_x: "Current in branch x (A)",
                I_T: "Total current (A)",
                R_T: "Total parallel resistance (Ω)",
                R_x: "Resistance of branch x (Ω)",
              },
            },
          ],
          safetyNotes: [
            "Adding more branches to a parallel circuit increases total current demand from the source — always verify the source and wiring can handle the increased load.",
            "Household electrical wiring is parallel — each outlet receives the full supply voltage independently.",
          ],
          realWorldExamples: [
            "All outlets in a home are wired in parallel — each device receives the full 120 V (or 240 V) supply voltage.",
            "Connecting batteries in parallel increases capacity (amp-hours) without changing voltage.",
          ],
        },
      ],
    },

    {
      id: "series-parallel-circuits",
      number: 5,
      year: 1,
      title: "Combination (Series-Parallel) Circuits",
      overview:
        "Most practical circuits combine series and parallel connections. The W.I.R.E. solving method requires you to first collapse every parallel group into a single equivalent resistor, reducing the network to a simple series loop. Only then do you fill the W.I.R.E. table and trace back through the original branches to find individual component values.",
      sections: [
        {
          id: "combination-rules",
          title: "Rules for Combination Circuits",
          body: [
            "A combination circuit has components connected both in series and in parallel. Before applying Ohm's Law or the W.I.R.E. table, you must identify which portions are series paths and which are parallel branches.",
            "Series portions obey series rules: current (I) is the same through every series element, and voltage drops add up to the source voltage. Parallel portions obey parallel rules: voltage (E) is the same across every branch, and branch currents add up to the total current entering the junction.",
          ],
          keyPoints: [
            "Series rule — I is identical through every element on a single path: I_T = I_R1 = I_R2 = …",
            "Parallel rule — E is identical across every branch: E_branch_a = E_branch_b = …",
            "Collapse every parallel group into one equivalent resistor (R_eq) before applying series rules",
            "After collapsing, the whole network becomes a simple series circuit — solve it with R_T = R_1 + R_eq + …",
            "Trace back through the original branches after the series solve to find individual I and E values",
          ],
        },
        {
          id: "collapse-parallel",
          title: "Step 1 — Collapse Parallel Groups to Equivalent Resistors",
          body: [
            "Before filling the W.I.R.E. table you must replace every parallel group with a single equivalent resistor (R_eq). Use the product-over-sum formula for exactly two branches or the reciprocal formula for three or more branches.",
            "Work from the innermost parallel group outward. Each collapse removes one group from the schematic. Redraw after each collapse so you can see the simplified circuit clearly.",
          ],
          formulas: [
            {
              name: "Parallel Equivalent — Two Branches (Product over Sum)",
              expression: "R_eq = (R_a × R_b) / (R_a + R_b)",
              variables: {
                R_eq: "Equivalent resistance of the parallel pair (Ω)",
                R_a: "Branch 1 resistance (Ω)",
                R_b: "Branch 2 resistance (Ω)",
              },
              example:
                "R_a = 150 Ω, R_b = 300 Ω → R_eq = (150 × 300) / (150 + 300) = 45 000 / 450 = 100 Ω",
            },
            {
              name: "Parallel Equivalent — Three or More Branches (Reciprocal Method)",
              expression: "1/R_eq = 1/R_a + 1/R_b + 1/R_c + …",
              variables: {
                R_eq: "Equivalent parallel resistance (Ω)",
              },
              example:
                "1/R_eq = 1/60 + 1/30 = 1/60 + 2/60 = 3/60 → R_eq = 20 Ω",
            },
            {
              name: "Equal Resistors in Parallel",
              expression: "R_eq = R / n",
              variables: {
                R: "Value of one resistor (Ω)",
                n: "Number of equal branches",
              },
              example:
                "Four 200 Ω resistors in parallel: R_eq = 200 / 4 = 50 Ω",
            },
          ],
          keyPoints: [
            "Collapse the innermost parallel group first",
            "Replace the group with its single R_eq and redraw the schematic",
            "Repeat until only series elements remain",
            "Label each R_eq clearly (e.g. R₂₃ for the R₂ ∥ R₃ group) so the trace-back step is easy to follow",
            "R_eq is a working-space calculation — it does NOT appear as a column in the W.I.R.E. table",
          ],
        },
        {
          id: "series-solve",
          title: "Step 2 — Solve the Simplified Series Circuit",
          body: [
            "After collapsing all parallel groups the circuit is a simple series loop. Apply series rules: R_T equals the sum of all series resistances (including every R_eq). Then use Ohm's Law to find I_T. This single current flows through every element in the series path, including each equivalent resistor.",
          ],
          formulas: [
            {
              name: "Total Series Resistance (after collapsing parallel groups)",
              expression: "R_T = R_1 + R_eq + R_2 + … + R_n",
              variables: {
                R_T: "Total circuit resistance (Ω)",
                R_eq: "Equivalent resistance of any collapsed parallel group (Ω)",
              },
              example:
                "R₁ = 100 Ω, R₂₃(eq) = 100 Ω, R₄ = 75 Ω → R_T = 100 + 100 + 75 = 275 Ω",
            },
            {
              name: "Total Current",
              expression: "I_T = E_T / R_T",
              variables: {
                I_T: "Total circuit current (A)",
                E_T: "Source voltage (V)",
                R_T: "Total resistance (Ω)",
              },
              example: "E_T = 30 V, R_T = 275 Ω → I_T = 30 / 275 ≈ 0.109 A",
            },
          ],
        },
        {
          id: "traceback",
          title: "Step 3 — Trace Back to Find Branch Values",
          body: [
            "I_T flows through every series element. Multiply I_T by each series resistance (or R_eq) to get the voltage drop across that section. The voltage across a parallel group equals I_T × R_eq for that group.",
            "Inside each original parallel group, every branch has the same voltage (the group voltage found above). Divide that branch voltage by each branch resistance to find the individual branch currents.",
            "Verify with KCL: branch currents must sum to I_T at every junction. Verify with KVL: all voltage drops around any complete loop must sum to E_T.",
          ],
          formulas: [
            {
              name: "Voltage Drop Across Each Series Section",
              expression: "E_x = I_T × R_x",
              variables: {
                E_x: "Voltage drop across component or equivalent x (V)",
                I_T: "Total series current (A)",
                R_x: "Resistance of that component or equivalent (Ω)",
              },
              example: "I_T = 0.109 A, R₁ = 100 Ω → E_R1 = 0.109 × 100 = 10.9 V",
            },
            {
              name: "Branch Current (from parallel group voltage)",
              expression: "I_branch = E_group / R_branch",
              variables: {
                I_branch: "Current through one parallel branch (A)",
                E_group: "Voltage across the parallel group (V)",
                R_branch: "Resistance of that branch (Ω)",
              },
              example:
                "E_group = 10.9 V, R₂ = 150 Ω → I_R2 = 10.9 / 150 ≈ 0.073 A",
            },
          ],
          keyPoints: [
            "Voltage across a parallel group = I_T × R_eq for that group",
            "Use that group voltage with each branch's R to find each branch current (I = E / R)",
            "KCL check: branch currents into any junction must equal branch currents out",
            "KVL check: all voltage drops around any loop must sum to the source voltage",
          ],
        },
        {
          id: "wire-table-combination",
          title: "Using the W.I.R.E. Table for Combination Circuits",
          body: [
            "The W.I.R.E. table (Watts · Current · Resistance · Voltage) is the standard trades worksheet for recording and solving circuit values. The table has one column per real component plus a Circuit Totals column. R_eq values are working-space calculations only — they are NOT entered as columns in the table.",
            "Fill the W.I.R.E. table in this sequence: (1) enter all given values in their cells; (2) write R_T and E_T in the Totals column; (3) solve and enter I_T in the Totals-I cell; (4) for series-path components, copy I_T into their I cell; (5) for parallel-branch components, enter the shared branch voltage in their E cell, then solve I = E/R; (6) solve W = E × I for every component; (7) confirm that component watts sum to Totals-W.",
          ],
          keyPoints: [
            "Rows: W (Watts/Power, blue) · I (Current/Amps, yellow-orange) · R (Resistance/Ohms, green) · E (Voltage/Volts, red)",
            "Columns: one per real component (R₁, R₂, R₃, …) plus Circuit Totals",
            "Series elements share the same I — copy I_T into each series element's I cell",
            "Parallel branches share the same E — copy the group voltage into each branch's E cell",
            "Solve W = E × I last for each component after both E and I are known",
            "Final check: sum of all component W values must equal Totals-W",
          ],
          realWorldExamples: [
            "On a BC trades exam, given values are printed on the schematic. You collapse parallel groups in the working space, fill the W.I.R.E. table for every real component, then verify your answer in the Totals row.",
            "Automotive electrical systems use series-parallel combinations: the battery (series stacking) powers parallel circuits for lighting, engine control, and accessories.",
          ],
        },
        {
          id: "worked-example",
          title: "Worked Example: R₁ — (R₂ ∥ R₃) — R₄",
          body: [
            "Given: E_T = 30 V, R₁ = 100 Ω, R₂ = 150 Ω, R₃ = 300 Ω, R₄ = 75 Ω. R₂ and R₃ are in parallel; this parallel group is in series with R₁ and R₄.",
            "Collapse: R₂₃ = (150 × 300) / (150 + 300) = 45 000 / 450 = 100 Ω. Redrawn series circuit: R₁ (100 Ω) → R₂₃ (100 Ω) → R₄ (75 Ω).",
            "Series solve: R_T = 100 + 100 + 75 = 275 Ω. I_T = 30 / 275 ≈ 0.109 A.",
            "Voltage drops: E_R1 = 0.109 × 100 ≈ 10.9 V. E_R23 = 0.109 × 100 ≈ 10.9 V. E_R4 = 0.109 × 75 ≈ 8.2 V. KVL check: 10.9 + 10.9 + 8.2 = 30 V ✓",
            "Branch currents: I_R2 = 10.9 / 150 ≈ 0.073 A. I_R3 = 10.9 / 300 ≈ 0.036 A. KCL check: 0.073 + 0.036 ≈ 0.109 A = I_T ✓",
            "W.I.R.E. table — Watts column: W_R1 = 10.9 × 0.109 ≈ 1.19 W. W_R2 = 10.9 × 0.073 ≈ 0.80 W. W_R3 = 10.9 × 0.036 ≈ 0.39 W. W_R4 = 8.2 × 0.109 ≈ 0.89 W. Total W = 1.19 + 0.80 + 0.39 + 0.89 ≈ 3.27 W. Check: E_T × I_T = 30 × 0.109 ≈ 3.27 W ✓",
          ],
          keyPoints: [
            "Full methodology: Collapse parallel → redraw → solve series → trace back → fill W.I.R.E. table → verify with KVL and KCL",
            "The W.I.R.E. Totals column holds R_T, I_T, E_T, and W_T — the collapsed-circuit totals",
            "Never skip the KVL and KCL verification steps — they catch arithmetic errors before they reach the final answer",
          ],
        },
      ],
    },

    {
      id: "power-energy",
      number: 6,
      year: 1,
      title: "Power & Energy",
      overview:
        "Electrical power is the rate at which energy is converted. Power is measured in watts (W). Energy (work done) is measured in joules (J) or kilowatt-hours (kWh) for billing purposes.",
      sections: [
        {
          id: "power-formulas",
          title: "Power Formulas",
          body: [
            "Electrical power (P) is the product of voltage and current. Using Ohm's Law substitution, power can be expressed three ways.",
          ],
          formulas: [
            {
              name: "Power — Voltage × Current",
              expression: "P = V × I",
              variables: {
                P: "Power (watts, W)",
                V: "Voltage (V)",
                I: "Current (A)",
              },
              example: "A 12 V lamp drawing 2 A: P = 12 × 2 = 24 W",
            },
            {
              name: "Power — Current × Resistance",
              expression: "P = I² × R",
              variables: {
                P: "Power (W)",
                I: "Current (A)",
                R: "Resistance (Ω)",
              },
              example: "2 A through 6 Ω: P = 4 × 6 = 24 W",
            },
            {
              name: "Power — Voltage / Resistance",
              expression: "P = V² / R",
              variables: {
                P: "Power (W)",
                V: "Voltage (V)",
                R: "Resistance (Ω)",
              },
              example: "12 V across 6 Ω: P = 144 / 6 = 24 W",
            },
            {
              name: "Energy",
              expression: "W = P × t",
              variables: {
                W: "Energy (joules J; or kWh when P in kW and t in hours)",
                P: "Power (W or kW)",
                t: "Time (s or h)",
              },
              example: "1 500 W kettle running for 0.1 h: W = 1.5 kW × 0.1 h = 0.15 kWh",
            },
          ],
          keyPoints: [
            "Total power in any circuit = sum of all component powers",
            "Power is always positive (dissipated as heat, light, or motion)",
            "The watt is named after James Watt; 1 W = 1 J/s",
            "Utility companies bill in kilowatt-hours (kWh)",
          ],
          safetyNotes: [
            "Exceeding a resistor's power rating causes overheating and fire risk — always check wattage ratings.",
            "Wire gauge is chosen based on current-carrying capacity (ampacity) to prevent overheating.",
          ],
        },
        {
          id: "efficiency",
          title: "Efficiency",
          body: [
            "Efficiency is the ratio of useful output power to total input power. No real device is 100% efficient — some energy is always lost as heat.",
          ],
          formulas: [
            {
              name: "Efficiency",
              expression: "η = (P_out / P_in) × 100%",
              variables: {
                η: "Efficiency (%)",
                P_out: "Output power (W)",
                P_in: "Input power (W)",
              },
              example: "Motor input 500 W, mechanical output 425 W: η = (425/500)×100 = 85%",
            },
          ],
        },
      ],
    },

    {
      id: "kirchhoffs-laws",
      number: 7,
      year: 1,
      title: "Kirchhoff's Laws",
      overview:
        "Kirchhoff's Laws extend Ohm's Law to complex multi-loop circuits. KCL governs current at nodes; KVL governs voltage around loops. Together they allow any DC circuit to be solved systematically.",
      sections: [
        {
          id: "kcl",
          title: "Kirchhoff's Current Law (KCL)",
          body: [
            "KCL states: The algebraic sum of all currents entering a node (junction) equals zero. Equivalently, the sum of currents entering a node equals the sum of currents leaving it.",
            "This is a consequence of conservation of charge — charge cannot accumulate at a node in steady state.",
          ],
          formulas: [
            {
              name: "Kirchhoff's Current Law",
              expression: "ΣI_in = ΣI_out   (or   ΣI = 0 at any node)",
              variables: {
                ΣI_in: "Sum of currents entering the node (A)",
                ΣI_out: "Sum of currents leaving the node (A)",
              },
              example: "Node with I₁=2A and I₂=3A entering, then I₃=5A must leave",
            },
          ],
          keyPoints: [
            "KCL applies at every node (junction) in the circuit",
            "In a series circuit there is only one node pair — current is identical everywhere",
            "In a parallel circuit the total current splits at each node",
          ],
        },
        {
          id: "kvl",
          title: "Kirchhoff's Voltage Law (KVL)",
          body: [
            "KVL states: The algebraic sum of all voltages around any closed loop equals zero. This means the sum of voltage rises (sources) equals the sum of voltage drops (loads) around any loop.",
            "This is a consequence of conservation of energy — energy gained from sources must equal energy dissipated by loads.",
          ],
          formulas: [
            {
              name: "Kirchhoff's Voltage Law",
              expression: "ΣV = 0   (around any closed loop)",
              variables: {
                ΣV: "Algebraic sum of all voltages in the loop (V)",
              },
              example: "Loop: +24V source, −8V drop, −10V drop, −6V drop → 24−8−10−6 = 0 ✓",
            },
          ],
          realWorldExamples: [
            "Mesh analysis of complex circuits (e.g., bridge circuits, ladder networks) uses KVL to write a system of equations that are solved simultaneously.",
          ],
        },
      ],
    },

    {
      id: "magnetism",
      number: 8,
      year: 1,
      title: "Magnetism & Electromagnetism",
      overview:
        "Magnetism and electricity are deeply linked. Moving charges create magnetic fields; changing magnetic fields create voltage. This is the basis for motors, generators, transformers, and inductors.",
      sections: [
        {
          id: "magnetic-fields",
          title: "Magnetic Fields",
          body: [
            "A magnetic field is an invisible force field surrounding a magnet or a current-carrying conductor. Field lines exit the north pole and enter the south pole of a magnet.",
            "The right-hand rule: wrap your right hand around a conductor with the thumb pointing in the direction of conventional current; your fingers indicate the direction of the surrounding magnetic field.",
          ],
          keyPoints: [
            "Like poles repel; unlike poles attract",
            "Magnetic flux (Φ) is measured in webers (Wb)",
            "Magnetic flux density (B) is measured in teslas (T) — B = Φ / A",
            "Permeability (μ) describes how easily a material supports a magnetic field",
          ],
        },
        {
          id: "electromagnetic-induction",
          title: "Electromagnetic Induction — Faraday's & Lenz's Laws",
          body: [
            "Faraday's Law: When the magnetic flux linking a conductor changes, a voltage (EMF) is induced in the conductor. The induced EMF is proportional to the rate of change of flux.",
            "Lenz's Law: The direction of the induced current is such that its magnetic field opposes the change in flux that caused the induction. This is the basis of transformer and generator operation.",
          ],
          formulas: [
            {
              name: "Faraday's Law",
              expression: "e = −N × (ΔΦ / Δt)",
              variables: {
                e: "Induced EMF (V)",
                N: "Number of turns in the coil",
                "ΔΦ": "Change in magnetic flux (Wb)",
                "Δt": "Change in time (s)",
              },
            },
          ],
          realWorldExamples: [
            "An electric generator converts mechanical rotation into AC voltage via electromagnetic induction.",
            "Induction cooktops use rapidly changing magnetic fields to induce currents directly in metal cookware.",
          ],
        },
      ],
    },

    {
      id: "dc-instruments",
      title: "DC Measuring Instruments",
      number: 9,
      year: 1,
      overview:
        "Accurate measurement is essential in electrical work. Ammeters measure current in series; voltmeters measure voltage in parallel; ohmmeters measure resistance with power off.",
      sections: [
        {
          id: "ammeter",
          title: "Ammeter",
          body: [
            "An ammeter measures current in amperes. It must be connected in series with the circuit because it has very low internal resistance — if connected in parallel it would short-circuit the load.",
            "Digital multimeters (DMM) have separate current input jacks; always select the correct range and connect to the current terminals (A or mA) before making a measurement.",
          ],
          safetyNotes: [
            "NEVER connect an ammeter in parallel — it has near-zero resistance and will draw extreme current, potentially destroying the meter and starting a fire.",
            "Always start with the highest current range and step down to avoid burning out the meter's fuse.",
          ],
        },
        {
          id: "voltmeter",
          title: "Voltmeter",
          body: [
            "A voltmeter measures voltage (potential difference) in volts. It is connected in parallel with the component under test. A voltmeter has very high internal resistance to avoid disturbing the circuit.",
          ],
        },
        {
          id: "ohmmeter",
          title: "Ohmmeter",
          body: [
            "An ohmmeter measures resistance in ohms. It must only be used on de-energized circuits — never measure resistance in a live circuit.",
            "The ohmmeter supplies its own internal voltage to drive a test current; the displayed resistance is calculated from the resulting current.",
          ],
          safetyNotes: [
            "Always de-energize and discharge the circuit before measuring resistance.",
            "Resistance measurements in-circuit may be inaccurate due to parallel paths — isolate the component when possible.",
          ],
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  YEAR 2 — AC THEORY & DEVICES
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "ac-fundamentals",
      number: 10,
      year: 2,
      title: "AC Theory Fundamentals",
      overview:
        "Alternating current (AC) periodically reverses direction. AC is the form of electricity supplied by utilities worldwide because it can be efficiently stepped up and down in voltage by transformers.",
      sections: [
        {
          id: "ac-waveform",
          title: "The Sinusoidal Waveform",
          body: [
            "The most common AC waveform is a sine wave. It is produced by rotating an armature inside a magnetic field in a generator. The instantaneous value at any angle θ is v = V_peak × sin(θ).",
            "Key waveform parameters: Peak value (V_p), Peak-to-peak value (V_pp = 2 × V_p), Period (T — time for one full cycle in seconds), and Frequency (f — cycles per second in hertz).",
          ],
          formulas: [
            {
              name: "Instantaneous Voltage",
              expression: "v(t) = V_p × sin(2π f t)",
              variables: {
                "v(t)": "Instantaneous voltage (V)",
                V_p: "Peak voltage (V)",
                f: "Frequency (Hz)",
                t: "Time (s)",
              },
            },
            {
              name: "Frequency and Period",
              expression: "f = 1 / T",
              variables: {
                f: "Frequency (Hz)",
                T: "Period (s)",
              },
              example: "North American grid: f = 60 Hz → T = 1/60 ≈ 16.67 ms",
            },
            {
              name: "RMS Voltage (Sinusoidal)",
              expression: "V_rms = V_p / √2 ≈ 0.707 × V_p",
              variables: {
                V_rms: "RMS (effective) voltage (V)",
                V_p: "Peak voltage (V)",
              },
              example: "North American 120 V RMS → V_p = 120 × √2 ≈ 170 V peak",
            },
          ],
          keyPoints: [
            "RMS (Root Mean Square) value is the effective DC equivalent — it produces the same heating effect",
            "North America: 60 Hz, 120 V RMS (residential), 240 V RMS (dryers, ranges)",
            "Europe/international: 50 Hz, 230 V RMS",
            "V_avg of a full sine wave = 0; V_avg of a half-wave rectified sine = 0.637 × V_p",
          ],
        },
        {
          id: "phase-angle",
          title: "Phase Angle",
          body: [
            "Phase angle (φ) describes the time offset between two sinusoidal quantities. If voltage leads current by 90°, the circuit contains a pure capacitance; if current leads voltage by 90°, the circuit contains a pure inductance.",
            "In a purely resistive AC circuit, voltage and current are in phase (φ = 0°).",
          ],
          formulas: [
            {
              name: "Angular Frequency",
              expression: "ω = 2π f",
              variables: {
                ω: "Angular frequency (radians/second, rad/s)",
                f: "Frequency (Hz)",
              },
              example: "60 Hz → ω = 2π × 60 ≈ 377 rad/s",
            },
          ],
        },
      ],
    },

    {
      id: "capacitance",
      number: 11,
      year: 2,
      title: "Capacitance & Capacitors",
      overview:
        "A capacitor stores electrical energy in an electric field between two conducting plates separated by an insulating dielectric. Capacitors block DC and pass AC, making them essential in filtering, timing, and power factor correction.",
      sections: [
        {
          id: "capacitor-basics",
          title: "Capacitor Fundamentals",
          body: [
            "Capacitance (C) is the ability to store charge. It is measured in farads (F). Practical capacitors are typically in microfarads (µF) or picofarads (pF).",
            "When voltage is applied, charge Q accumulates: Q = C × V. Energy stored in a capacitor is W = ½ C V².",
            "In DC steady state, a capacitor blocks current (acts as an open circuit once fully charged). In AC circuits, capacitors pass current — the opposition to current flow is called capacitive reactance (X_C).",
          ],
          formulas: [
            {
              name: "Capacitance",
              expression: "C = Q / V",
              variables: {
                C: "Capacitance (farads, F)",
                Q: "Charge stored (coulombs, C)",
                V: "Voltage across capacitor (V)",
              },
            },
            {
              name: "Energy stored in a capacitor",
              expression: "W = ½ × C × V²",
              variables: {
                W: "Energy (joules, J)",
                C: "Capacitance (F)",
                V: "Voltage (V)",
              },
            },
            {
              name: "Capacitive Reactance",
              expression: "X_C = 1 / (2π f C)",
              variables: {
                X_C: "Capacitive reactance (Ω)",
                f: "Frequency (Hz)",
                C: "Capacitance (F)",
              },
              example: "C = 100 µF at 60 Hz: X_C = 1/(2π×60×0.0001) ≈ 26.5 Ω",
            },
            {
              name: "Capacitors in Series",
              expression: "1/C_T = 1/C₁ + 1/C₂ + 1/C₃ + …",
              variables: {
                C_T: "Total capacitance (F)",
              },
            },
            {
              name: "Capacitors in Parallel",
              expression: "C_T = C₁ + C₂ + C₃ + …",
              variables: {
                C_T: "Total capacitance (F)",
              },
            },
          ],
          keyPoints: [
            "Capacitors in series: total capacitance decreases (like resistors in parallel)",
            "Capacitors in parallel: total capacitance increases (like resistors in series)",
            "X_C decreases as frequency increases — capacitors pass high frequencies more easily",
            "X_C is 90° out of phase with voltage (current leads voltage by 90°)",
          ],
          safetyNotes: [
            "Large capacitors (e.g., in power supplies, motor start capacitors) can hold a dangerous charge long after power is removed — always discharge before handling.",
            "Electrolytic capacitors are polarized — connecting with reversed polarity can cause violent failure.",
          ],
        },
        {
          id: "rc-time-constant",
          title: "RC Time Constant",
          body: [
            "The RC time constant (τ = R × C) defines how quickly a capacitor charges or discharges through a resistance. After one time constant, a capacitor charges to approximately 63.2% of the supply voltage. After five time constants it is considered fully charged (99.3%).",
          ],
          formulas: [
            {
              name: "RC Time Constant",
              expression: "τ = R × C",
              variables: {
                τ: "Time constant (seconds, s)",
                R: "Resistance (Ω)",
                C: "Capacitance (F)",
              },
              example: "R = 10 kΩ, C = 100 µF → τ = 10 000 × 0.0001 = 1 s",
            },
            {
              name: "Capacitor Charging Voltage",
              expression: "v_C(t) = V_S × (1 − e^(−t/τ))",
              variables: {
                "v_C(t)": "Capacitor voltage at time t (V)",
                V_S: "Source voltage (V)",
                t: "Time (s)",
                τ: "Time constant (s)",
              },
            },
          ],
        },
      ],
    },

    {
      id: "inductance",
      number: 12,
      year: 2,
      title: "Inductance & Inductors",
      overview:
        "An inductor stores energy in a magnetic field surrounding a coil. Inductors resist changes in current flow. In DC steady state, an inductor acts as a short circuit (pure conductor). In AC circuits it opposes current through inductive reactance.",
      sections: [
        {
          id: "inductor-basics",
          title: "Inductor Fundamentals",
          body: [
            "Inductance (L) is measured in henries (H). A voltage is induced across an inductor whenever current through it changes: v = L × (di/dt). An inductor resists sudden changes in current.",
            "In DC steady state, the inductor current is constant (di/dt = 0), so no voltage is induced — the inductor looks like a piece of wire (short circuit). This is how dcSolver models inductors.",
            "In AC circuits, the inductor opposes current through inductive reactance (X_L). Current lags voltage by 90° in a pure inductor.",
          ],
          formulas: [
            {
              name: "Induced Voltage",
              expression: "v = L × (di / dt)",
              variables: {
                v: "Induced voltage (V)",
                L: "Inductance (H)",
                "di/dt": "Rate of change of current (A/s)",
              },
            },
            {
              name: "Energy Stored in an Inductor",
              expression: "W = ½ × L × I²",
              variables: {
                W: "Energy (J)",
                L: "Inductance (H)",
                I: "Current (A)",
              },
            },
            {
              name: "Inductive Reactance",
              expression: "X_L = 2π f L",
              variables: {
                X_L: "Inductive reactance (Ω)",
                f: "Frequency (Hz)",
                L: "Inductance (H)",
              },
              example: "L = 50 mH at 60 Hz: X_L = 2π × 60 × 0.05 ≈ 18.85 Ω",
            },
            {
              name: "Inductors in Series",
              expression: "L_T = L₁ + L₂ + L₃ + …  (no coupling)",
              variables: {
                L_T: "Total inductance (H)",
              },
            },
            {
              name: "Inductors in Parallel",
              expression: "1/L_T = 1/L₁ + 1/L₂ + …  (no coupling)",
              variables: {
                L_T: "Total inductance (H)",
              },
            },
          ],
          keyPoints: [
            "X_L increases as frequency increases — inductors block high frequencies",
            "Current lags voltage by 90° in a pure inductive circuit",
            "DC steady-state: inductor = short circuit (handled by dcSolver)",
            "RL time constant: τ = L / R",
          ],
          safetyNotes: [
            "Suddenly interrupting current through an inductor causes a large voltage spike (inductive kick) that can damage switches and transistors — use a flyback diode for protection.",
          ],
        },
      ],
    },

    {
      id: "impedance",
      number: 13,
      year: 2,
      title: "Impedance, Reactance & Phase",
      overview:
        "Impedance (Z) is the total opposition to AC current flow, combining resistance (R) and reactance (X) using phasor (vector) mathematics. Power factor describes how efficiently AC power is used.",
      sections: [
        {
          id: "impedance-basics",
          title: "Impedance",
          body: [
            "In AC circuits, resistance R (in phase) and reactance X (90° out of phase) combine as phasors. The impedance magnitude Z and phase angle φ are found using the Pythagorean theorem and trigonometry.",
          ],
          formulas: [
            {
              name: "Impedance Magnitude (Series RL)",
              expression: "Z = √(R² + X_L²)",
              variables: {
                Z: "Impedance (Ω)",
                R: "Resistance (Ω)",
                X_L: "Inductive reactance (Ω)",
              },
            },
            {
              name: "Impedance Magnitude (Series RC)",
              expression: "Z = √(R² + X_C²)",
              variables: {
                Z: "Impedance (Ω)",
                R: "Resistance (Ω)",
                X_C: "Capacitive reactance (Ω)",
              },
            },
            {
              name: "Phase Angle",
              expression: "φ = arctan(X / R)",
              variables: {
                φ: "Phase angle (degrees)",
                X: "Net reactance (X_L − X_C) (Ω)",
                R: "Resistance (Ω)",
              },
            },
            {
              name: "Ohm's Law for AC",
              expression: "I = V / Z",
              variables: {
                I: "Current (A)",
                V: "Voltage (V)",
                Z: "Impedance (Ω)",
              },
            },
          ],
        },
        {
          id: "power-factor",
          title: "Power Factor",
          body: [
            "In AC circuits, true (real) power P is dissipated only in resistive elements. Reactive power Q is stored and returned by reactive elements. Apparent power S is the product of RMS voltage and current.",
            "Power factor (PF) is the ratio of real power to apparent power. A PF of 1 (unity) means all power is usefully consumed. Motors and transformers often have lagging power factors due to inductance.",
          ],
          formulas: [
            {
              name: "True Power",
              expression: "P = V × I × cos(φ)   [W]",
              variables: {
                P: "Real (true) power (W)",
                V: "Voltage (V)",
                I: "Current (A)",
                "cos(φ)": "Power factor",
              },
            },
            {
              name: "Apparent Power",
              expression: "S = V × I   [VA]",
              variables: {
                S: "Apparent power (volt-amperes, VA)",
              },
            },
            {
              name: "Reactive Power",
              expression: "Q = V × I × sin(φ)   [VAR]",
              variables: {
                Q: "Reactive power (volt-amperes reactive, VAR)",
              },
            },
            {
              name: "Power Triangle",
              expression: "S² = P² + Q²",
              variables: {
                S: "Apparent power (VA)",
                P: "True power (W)",
                Q: "Reactive power (VAR)",
              },
            },
            {
              name: "Power Factor",
              expression: "PF = P / S = cos(φ)",
              variables: {
                PF: "Power factor (0 to 1)",
                P: "True power (W)",
                S: "Apparent power (VA)",
              },
            },
          ],
          realWorldExamples: [
            "Industrial facilities pay a power factor penalty if PF < 0.9 — they add capacitor banks to correct lagging PF caused by motors.",
            "UPS (Uninterruptible Power Supplies) and variable frequency drives are rated in kVA (apparent power), not just kW.",
          ],
        },
      ],
    },

    {
      id: "resonance",
      number: 14,
      year: 2,
      title: "Resonance",
      overview:
        "Resonance occurs in LC circuits when inductive and capacitive reactances are equal and cancel each other. At resonance, a series circuit has minimum impedance (maximum current); a parallel circuit has maximum impedance (minimum current).",
      sections: [
        {
          id: "series-resonance",
          title: "Series Resonance",
          body: [
            "In a series RLC circuit, resonance occurs at the frequency where X_L = X_C. At this frequency the net reactance is zero; impedance equals R and current is maximum.",
          ],
          formulas: [
            {
              name: "Resonant Frequency",
              expression: "f_r = 1 / (2π √(L × C))",
              variables: {
                f_r: "Resonant frequency (Hz)",
                L: "Inductance (H)",
                C: "Capacitance (F)",
              },
              example: "L = 10 mH, C = 100 µF: f_r = 1/(2π√(0.01 × 0.0001)) ≈ 159 Hz",
            },
            {
              name: "Quality Factor (Q)",
              expression: "Q = X_L / R = (1/R) × √(L/C)",
              variables: {
                Q: "Quality factor (dimensionless)",
                X_L: "Inductive reactance at resonance (Ω)",
                R: "Resistance (Ω)",
              },
            },
          ],
          realWorldExamples: [
            "Radio tuning circuits use resonance to select a specific broadcast frequency.",
            "Notch filters use parallel resonance to block a specific unwanted frequency.",
          ],
        },
      ],
    },

    {
      id: "transformers",
      number: 15,
      year: 2,
      title: "Transformers",
      overview:
        "A transformer transfers electrical energy between two circuits through electromagnetic induction. It can step voltage up or down with no moving parts and very high efficiency. Transformers only work with AC.",
      sections: [
        {
          id: "transformer-basics",
          title: "Transformer Principles",
          body: [
            "A transformer consists of two coils (primary and secondary) wound on a common iron core. AC in the primary creates a changing magnetic flux in the core, which induces an EMF in the secondary.",
            "The turns ratio (a = N_p / N_s) determines the voltage step-up or step-down ratio. An ideal transformer transfers power with 100% efficiency: P_primary = P_secondary.",
          ],
          formulas: [
            {
              name: "Transformer Voltage Ratio",
              expression: "V_p / V_s = N_p / N_s",
              variables: {
                V_p: "Primary voltage (V)",
                V_s: "Secondary voltage (V)",
                N_p: "Number of primary turns",
                N_s: "Number of secondary turns",
              },
              example: "Step-down: N_p=2400, N_s=240 → V_s = V_p × (240/2400) = V_p / 10",
            },
            {
              name: "Transformer Current Ratio",
              expression: "I_p / I_s = N_s / N_p",
              variables: {
                I_p: "Primary current (A)",
                I_s: "Secondary current (A)",
              },
            },
            {
              name: "Ideal Transformer Power",
              expression: "P_p = P_s   →   V_p × I_p = V_s × I_s",
              variables: {
                P_p: "Primary apparent power (VA)",
                P_s: "Secondary apparent power (VA)",
              },
            },
          ],
          keyPoints: [
            "Step-up transformer: V_s > V_p (N_s > N_p), I_s < I_p",
            "Step-down transformer: V_s < V_p (N_s < N_p), I_s > I_p",
            "Transformer losses: copper losses (I²R in windings) and iron core losses (hysteresis + eddy currents)",
            "Distribution transformers on utility poles step 12 kV down to 120/240 V for homes",
          ],
          safetyNotes: [
            "Never short-circuit the secondary of a transformer — the primary will draw excessive current.",
            "High-voltage transformer secondaries are lethal — always treat as live until proven otherwise.",
          ],
        },
      ],
    },

    {
      id: "semiconductors",
      number: 16,
      year: 2,
      title: "Semiconductors & Diodes",
      overview:
        "Semiconductors (silicon, germanium) have conductivity between conductors and insulators. By doping with impurities we create P-type and N-type materials. Joining them forms a P-N junction — the diode — which allows current to flow in only one direction.",
      sections: [
        {
          id: "pn-junction",
          title: "The P-N Junction",
          body: [
            "N-type semiconductor has excess free electrons (donors). P-type has excess holes (acceptors). When joined, electrons from the N-side fill holes on the P-side near the junction, creating a depletion region with a built-in barrier voltage.",
            "Forward bias (+ to P, − to N) reduces the barrier and allows current to flow. The forward voltage drop is ≈ 0.7 V for silicon diodes and ≈ 2 V for LEDs.",
            "Reverse bias (+ to N, − to P) widens the depletion region and blocks current (only a tiny leakage current flows). The maximum reverse voltage before breakdown is the Peak Inverse Voltage (PIV or PRV).",
          ],
          formulas: [
            {
              name: "Diode Simplified Model (Forward Bias)",
              expression: "V_diode ≈ 0.7 V (silicon)   |   V_LED ≈ 1.8–3.3 V",
              variables: {
                V_diode: "Forward voltage drop (V)",
              },
            },
            {
              name: "Current Limiting Resistor for LED",
              expression: "R = (V_S − V_LED) / I_LED",
              variables: {
                R: "Series resistor (Ω)",
                V_S: "Supply voltage (V)",
                V_LED: "LED forward voltage (V)",
                I_LED: "Desired LED current (typically 10–20 mA)",
              },
              example: "V_S=5V, V_LED=2V, I_LED=20mA: R = (5−2)/0.02 = 150 Ω",
            },
          ],
          keyPoints: [
            "Anode (+) to cathode (−) = forward bias = conducts",
            "Cathode (+) to anode (−) = reverse bias = blocks",
            "Zener diodes are designed to conduct in reverse at a precise breakdown voltage (used in voltage regulation)",
            "Rectifier diodes convert AC to pulsating DC",
          ],
          safetyNotes: [
            "Always use a current-limiting resistor with an LED — without one, the LED will be destroyed immediately.",
          ],
          realWorldExamples: [
            "Bridge rectifier: four diodes arranged to convert full-wave AC to pulsating DC in power supplies.",
            "Flyback diode: placed across an inductive load to absorb the voltage spike when current is switched off.",
          ],
        },
      ],
    },

    {
      id: "transistors",
      number: 17,
      year: 2,
      title: "Transistors (BJT)",
      overview:
        "The Bipolar Junction Transistor (BJT) is a three-terminal semiconductor device that acts as a current-controlled current amplifier or switch. Understanding the NPN transistor is foundational for electronics.",
      sections: [
        {
          id: "bjt-basics",
          title: "BJT Fundamentals",
          body: [
            "A BJT has three terminals: Base (B), Collector (C), and Emitter (E). In an NPN transistor, a small base current (I_B) controls a much larger collector current (I_C). The emitter current is the sum: I_E = I_B + I_C.",
            "The DC current gain (β or h_FE) is the ratio I_C / I_B. Typical β values range from 20 to 500 depending on the transistor.",
            "Operating regions: Cutoff (no current — switch OFF), Active (amplifier operation), and Saturation (maximum current — switch ON).",
          ],
          formulas: [
            {
              name: "BJT Current Relationships",
              expression: "I_E = I_B + I_C   |   I_C = β × I_B",
              variables: {
                I_E: "Emitter current (A)",
                I_B: "Base current (A)",
                I_C: "Collector current (A)",
                β: "DC current gain (h_FE)",
              },
              example: "β = 100, I_B = 20 µA → I_C = 100 × 0.00002 = 2 mA",
            },
            {
              name: "Base Resistor for Switching",
              expression: "R_B = (V_S − V_BE) / I_B",
              variables: {
                R_B: "Base resistor (Ω)",
                V_S: "Supply voltage at base input (V)",
                V_BE: "Base-emitter voltage ≈ 0.7 V (silicon NPN)",
                I_B: "Required base current (A)",
              },
            },
          ],
          keyPoints: [
            "NPN: current flows collector → emitter when base is driven high",
            "PNP: current flows emitter → collector when base is driven low",
            "V_BE (forward bias, NPN) ≈ 0.7 V",
            "V_CE(sat) ≈ 0.2 V in saturation (switch ON)",
          ],
          realWorldExamples: [
            "Transistor as switch: microcontroller output drives a base resistor to switch a relay or motor on/off.",
            "Audio amplifier: transistors in active region amplify weak microphone signals.",
          ],
        },
      ],
    },

    {
      id: "safety-codes",
      number: 18,
      year: 2,
      title: "Electrical Safety & Codes",
      overview:
        "Electrical safety is not optional — it is governed by codes and regulations designed to protect lives and property. In Canada, the Canadian Electrical Code (CEC) sets the minimum standards for all electrical installations.",
      sections: [
        {
          id: "effects-of-current",
          title: "Effects of Electrical Current on the Human Body",
          body: [
            "Current, not voltage, kills — but voltage drives current through the body's resistance. Severity depends on current magnitude, path through the body, and duration.",
          ],
          keyPoints: [
            "1 mA: Threshold of perception",
            "10–20 mA: Inability to let go (muscular freeze)",
            "50–100 mA: Ventricular fibrillation — potentially fatal",
            "100+ mA: Cardiac arrest, severe burns",
            "Body resistance: skin dry ≈ 100 kΩ; skin wet ≈ 1 kΩ; internal ≈ 300 Ω",
          ],
          safetyNotes: [
            "Treat every circuit as energized until you have personally verified it is de-energized.",
            "Lock Out / Tag Out (LOTO): always lock and tag the disconnect before working on equipment.",
            "Use a non-contact voltage tester before touching any conductor.",
            "Ground Fault Circuit Interrupters (GFCI) trip at ≈ 5 mA — use in wet locations.",
            "Arc Flash can cause burns, blindness, and death — wear appropriate PPE and observe safe working distances.",
          ],
        },
        {
          id: "cec-basics",
          title: "Canadian Electrical Code (CEC) Basics",
          body: [
            "The Canadian Electrical Code (CEC) — CSA C22.1 — is the national standard adopted by all provinces and territories (sometimes with amendments). SkilledTradesBC administers the Electrical apprenticeship program in British Columbia.",
            "Key CEC concepts include: conductor sizing (based on ampacity and voltage drop), overcurrent protection (fuses and breakers rated ≤ conductor ampacity), grounding and bonding, and wiring methods.",
          ],
          keyPoints: [
            "Rule 2-110: Conductor ampacity must be ≥ the connected load current",
            "Rule 14-100: Every circuit must be protected by an overcurrent device at its source",
            "Rule 10-400: All exposed metal parts must be bonded to the grounding system",
            "Voltage drop: CEC recommends ≤ 3% on branch circuits and ≤ 5% total from service entrance to load",
          ],
          realWorldExamples: [
            "SkilledTradesBC (skilledtradesbc.ca) certifies electricians, industrial electricians, and instrumentation & control technicians in British Columbia.",
            "The Red Seal Program allows certified tradespeople to work across all Canadian provinces without re-examination.",
          ],
        },
        {
          id: "voltage-drop",
          title: "Voltage Drop Calculations",
          body: [
            "Voltage drop occurs because all conductors have resistance. Excessive voltage drop reduces equipment performance and can cause overheating. The CEC limits voltage drop to ensure adequate voltage at the load.",
          ],
          formulas: [
            {
              name: "Voltage Drop (Single-Phase)",
              expression: "V_drop = 2 × I × R_conductor",
              variables: {
                V_drop: "Voltage drop (V)",
                I: "Load current (A)",
                R_conductor: "Resistance of one conductor (Ω)",
              },
            },
            {
              name: "Conductor Resistance",
              expression: "R = ρ × L / A",
              variables: {
                R: "Conductor resistance (Ω)",
                ρ: "Resistivity (Ω·m); copper ≈ 1.72 × 10⁻⁸ Ω·m",
                L: "Length (m)",
                A: "Cross-sectional area (m²)",
              },
            },
          ],
          keyPoints: [
            "Larger wire gauge (smaller AWG number or larger mm²) = lower resistance = less voltage drop",
            "Longer runs require larger conductors to maintain acceptable voltage drop",
            "Use voltage drop tables in the CEC appendix for quick calculations",
          ],
        },
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    //  PRACTICAL WIRING — HOME & CONSTRUCTION
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "home-wiring",
      number: 19,
      year: 2,
      title: "Home Wiring & Residential Circuits",
      overview:
        "Residential wiring brings electrical theory into the real world of homes and apartments. This chapter covers the service entrance, distribution panels, branch circuit types, protective devices, grounding, and the key code requirements every new electrician must know before touching a panel.",
      sections: [
        {
          id: "service-entrance",
          title: "The Service Entrance & Distribution Panel",
          body: [
            "The utility company delivers power to a home through the service entrance — typically three conductors: two ungrounded (hot) legs at 120 V each relative to neutral, and a neutral conductor. The two hot legs are 180° out of phase, giving 240 V between them for large appliances (dryers, ranges, water heaters).",
            "The main distribution panel (load centre or breaker box) contains the main breaker, a neutral bus bar, a grounding bus bar, and individual circuit breakers for each branch circuit. In Canada the panel is governed by CEC Section 26; in the United States by NEC Article 230 (service) and 408 (panelboards).",
            "The main breaker is the first point of overcurrent protection for the entire home. It is rated for the total service ampacity — commonly 100 A, 150 A, or 200 A in residential applications. Never exceed the service rating when adding circuits.",
          ],
          keyPoints: [
            "North American residential service: 120/240 V, single-phase, 60 Hz",
            "Two hot buses (L1, L2) + neutral bus + grounding bus in the panel",
            "Main breaker protects the entire service; individual breakers protect branch circuits",
            "Panel label must list the circuit directory — always keep it updated",
            "Service entrance conductors are the utility's responsibility up to and including the meter",
          ],
          safetyNotes: [
            "The lugs feeding the main breaker are ALWAYS live — even with the main breaker OFF. Only the utility company can de-energize them.",
            "Never work inside the main panel without confirming the main breaker is OFF and testing with a verified meter.",
            "Lock-out / Tag-out (LOTO) procedures are mandatory in commercial and industrial environments.",
          ],
          realWorldExamples: [
            "A 200 A, 40-space panel is the Canadian/US standard for new single-family construction — it provides room for future loads and electric vehicle circuits.",
            "When a panel is 'double-tapped' (two wires on one breaker terminal), it is a code violation unless the breaker is specifically rated for two conductors.",
          ],
        },
        {
          id: "branch-circuits",
          title: "Branch Circuit Types & Ratings",
          body: [
            "A branch circuit runs from the panel to one or more outlets or fixtures. The circuit rating is determined by the overcurrent device (breaker or fuse) protecting it — 15 A, 20 A, 30 A, and 50 A are the most common residential ratings.",
            "A 15 A circuit uses 14 AWG copper wire (or 2.5 mm² in metric). A 20 A circuit uses 12 AWG (3.5 mm²). Never install undersized wire on an oversized breaker — this creates a fire hazard because the wire will overheat before the breaker trips.",
            "Dedicated circuits serve a single appliance or outlet group (e.g., refrigerator, microwave, dishwasher, HVAC). Multiwire branch circuits (MWBC) share a neutral between two hot legs; the breaker must be a 2-pole or have a handle tie so both legs disconnect simultaneously.",
          ],
          formulas: [
            {
              name: "Maximum Continuous Load on a Branch Circuit",
              expression: "I_continuous_max = 0.80 × I_breaker",
              variables: {
                I_continuous_max: "Maximum continuous current draw (A)",
                I_breaker: "Overcurrent device rating (A)",
              },
              example: "20 A breaker: max continuous load = 0.80 × 20 = 16 A",
            },
            {
              name: "Number of Outlets per Circuit (Guideline)",
              expression: "N_max = I_breaker × 0.80 / I_per_outlet",
              variables: {
                N_max: "Maximum recommended outlets",
                I_breaker: "Breaker rating (A)",
                I_per_outlet: "Estimated load per outlet (typically 1.5 A for general use)",
              },
              example: "15 A breaker, 1.5 A/outlet: N_max = 12 / 1.5 = 8 outlets",
            },
          ],
          keyPoints: [
            "15 A circuit → 14 AWG wire (minimum); 20 A circuit → 12 AWG wire (minimum)",
            "Never use a larger breaker to 'fix' a tripping circuit — find the overload",
            "Kitchen and dining room require at least two 20 A small-appliance circuits (CEC/NEC)",
            "Bathrooms require at least one dedicated 20 A circuit",
            "Garage and outdoor receptacles must be on dedicated, GFCI-protected circuits",
          ],
          safetyNotes: [
            "Always verify wire gauge matches the breaker rating before energising a circuit.",
            "Aluminum wiring (common 1965–1973) requires special connectors and devices rated 'CO/ALR' — never use standard copper-rated devices on aluminum wiring.",
          ],
          realWorldExamples: [
            "A bedroom with five general-purpose outlets draws far less than 1.5 A × 5 = 7.5 A in practice, leaving ample headroom on a 15 A circuit.",
            "An electric vehicle Level 2 charger (7.2 kW @ 240 V = 30 A) requires a dedicated 40 A, 240 V circuit with 8 AWG wire.",
          ],
        },
        {
          id: "protective-devices",
          title: "GFCI, AFCI & Surge Protection",
          body: [
            "A Ground Fault Circuit Interrupter (GFCI) measures the difference between current flowing out on the hot conductor and returning on the neutral. If the difference exceeds about 5 mA (indicating current is flowing through a person or unintended path), the GFCI trips within 25 ms — fast enough to prevent electrocution.",
            "An Arc Fault Circuit Interrupter (AFCI) monitors the waveform of the current and detects the high-frequency signature of an arcing fault — the type of fault that causes house fires from damaged or pinched wires. AFCIs are now required on virtually all bedroom and living-area circuits in the CEC (2018+) and NEC (2014+).",
            "Combination AFCI+GFCI breakers provide both protections on a single device and are increasingly required in kitchens, bathrooms, garages, outdoors, and finished basements.",
          ],
          keyPoints: [
            "GFCI: protects people from ground-fault shock (trips at ~5 mA imbalance)",
            "AFCI: protects property from arc-fault fires",
            "GFCI required locations (CEC/NEC): bathrooms, kitchens, garages, outdoors, basements, crawl spaces, near pools/spas",
            "AFCI required locations: bedrooms, living rooms, hallways, closets, and most finished areas",
            "Test GFCI and AFCI devices monthly using the TEST button",
            "A GFCI receptacle can protect downstream receptacles when wired correctly (LOAD terminals)",
          ],
          safetyNotes: [
            "Never bypass or remove GFCI/AFCI protection — these devices save lives.",
            "If a GFCI trips repeatedly on a circuit, investigate the root cause (damaged insulation, moisture ingress) before resetting.",
          ],
          realWorldExamples: [
            "A hairdryer dropped into a bathtub: without GFCI the person would receive a lethal shock; with GFCI the circuit trips in under 25 ms.",
            "Nails or staples piercing wire insulation in walls cause arc faults that ignite nearby wood framing — AFCI detects this before a fire starts.",
          ],
        },
        {
          id: "grounding-bonding",
          title: "Grounding & Bonding",
          body: [
            "Grounding provides a low-impedance path from the electrical system to the earth, stabilising voltage and directing fault current safely away from people. Equipment grounding conductors (EGC — the bare copper or green wire) connect metal enclosures, conduit, and device cases to the grounding bus.",
            "The grounding electrode system (GES) connects the panel grounding bus to the earth via ground rods, water pipes, concrete-encased electrodes (Ufer ground), or a combination. CEC and NEC specify the minimum electrode configuration.",
            "Bonding ensures all metallic systems (plumbing, gas piping, HVAC ductwork, panel enclosure) are at the same electrical potential, eliminating dangerous voltage differences that could cause a shock if a person bridges two systems simultaneously.",
            "The neutral and ground are bonded together at only one point in a residential system — at the main service panel. In sub-panels, the neutral must be isolated from the ground bus to prevent multiple ground paths (which can cause stray currents and nuisance GFCI trips).",
          ],
          keyPoints: [
            "Grounding: connects to the earth to dissipate fault energy",
            "Bonding: connects metallic systems together to equalise potential",
            "EGC (bare copper / green): safety ground carried with every circuit",
            "Neutral-ground bond at main panel only — isolated at sub-panels",
            "Two ground rods minimum, ≥ 1.8 m (6 ft) apart and ≥ 2.4 m (8 ft) deep each",
            "Ground fault path must have low enough impedance to trip the breaker quickly",
          ],
          safetyNotes: [
            "Never cut or remove the equipment grounding conductor (green wire / bare copper) — it is the last line of defence against a shock from a faulty appliance.",
            "Three-to-two prong adapters ('cheater plugs') defeat the grounding system — avoid them.",
            "Floating or open neutrals are extremely dangerous — they can cause voltage imbalances that destroy appliances and create shock hazards.",
          ],
          realWorldExamples: [
            "A washing machine with a faulty motor that contacts the metal drum: the EGC carries the fault current to ground, tripping the breaker before anyone touches the drum.",
            "Bonding the gas pipe to the electrical panel prevents a voltage difference if a fault energises the pipe — critical near water heaters and stoves.",
          ],
        },
        {
          id: "wiring-methods-residential",
          title: "Wiring Methods in Residential Construction",
          body: [
            "Non-metallic sheathed cable (NM-B, trade name Romex®) is the most common wiring method in North American wood-frame homes. It consists of two or more insulated conductors plus a bare ground, wrapped in a plastic outer jacket. NM cable must be protected where exposed to physical damage.",
            "Armoured cable (AC, trade name BX) and metal-clad cable (MC) use a flexible metal armour jacket for physical protection and are required in some jurisdictions or wherever NM is not permitted (e.g., some commercial or multi-family applications).",
            "Electrical metallic tubing (EMT) and rigid conduit house individual conductors (THWN-2, XHHW) and are used in garages, basements, exposed locations, and commercial work. Conduit systems are easily modified and repaired by pulling new wire.",
          ],
          keyPoints: [
            "NM-B cable: 90°C rated conductors, PVC jacket — dry locations only, wood frame construction",
            "MC / AC cable: flexible metal jacket — damp/wet rated versions available",
            "EMT: lightweight steel tubing, easy to bend — most common in commercial work",
            "Rigid conduit (RMC / IMC): heavier wall — used for service entrances and exposed outdoor runs",
            "PVC conduit (Schedule 40/80): for underground and corrosive environments",
            "Maximum fill: conduit fill must not exceed 40% of conduit area for three or more conductors (NEC/CEC tables)",
          ],
          safetyNotes: [
            "Staple NM cable every 1.4 m (4.5 ft) and within 300 mm (12 in) of every box — loose cable can sag and be damaged.",
            "Protect NM cable with a metal plate wherever it passes through a stud or joist within 32 mm (1.25 in) of the face — to prevent nails or screws from piercing it.",
          ],
          realWorldExamples: [
            "Running NM-B from the panel to a bedroom: drill 25 mm holes through studs, secure with cable staples, and leave 150 mm (6 in) of conductor free inside each box.",
            "Garage circuits use EMT conduit on the surface of concrete block walls because NM cable is not permitted in exposed locations subject to physical damage.",
          ],
        },
      ],
    },

    {
      id: "construction-wiring",
      number: 20,
      year: 2,
      title: "Construction & Field Wiring — Techniques, Tips & Tricks",
      overview:
        "Book knowledge must translate into confident, code-compliant field work. This chapter bridges theory and practice: rough-in procedures, box-fill calculations, wire-pulling strategies, splicing techniques, device installation, and the professional habits that separate a competent tradesperson from a beginner.",
      sections: [
        {
          id: "rough-in",
          title: "Rough-In: Planning, Layout & Box Installation",
          body: [
            "Rough-in is the phase where all cable, conduit, and boxes are installed before walls are closed. Planning is everything — a forgotten circuit costs hours of drywall repair later. Walk the job with the blueprints, mark every box location with a pencil, and confirm with the general contractor before drilling.",
            "Outlet boxes are typically set at 300 mm (12 in) from finished floor to the centre of the box; switch boxes at 1200 mm (48 in). These are industry standards, not code minimums — confirm with the owner or inspector if unusual heights are required.",
            "Box fill calculations ensure the box is large enough for all conductors, devices, and fittings. Each conductor counts as one 'conductor equivalent' based on its AWG size; devices (switches, outlets) count as two; cable clamps count as one; and the EGC is counted once regardless of how many are present.",
          ],
          formulas: [
            {
              name: "Box Fill — Conductor Volume",
              expression: "V_total = Σ(n_i × v_i) ≤ V_box",
              variables: {
                V_total: "Total required volume (cm³ or in³)",
                "n_i": "Number of items of type i (conductors, devices, clamps)",
                "v_i": "Volume allowance per item (from NEC Table 314.16(B) or CEC Table 12-3)",
                V_box: "Box rated volume (stamped on box, cm³ or in³)",
              },
              example: "14 AWG: 2.0 in³ each; 12 AWG: 2.25 in³ each; device = 2 × largest conductor volume",
            },
          ],
          keyPoints: [
            "Measure twice, drill once — confirm stud spacing and any plumbing/HVAC in the wall cavity",
            "Standard residential outlet height: 300 mm (12 in); switch: 1200 mm (48 in) AFF (Above Finished Floor)",
            "Old-work (remodel) boxes have built-in clamps that grip the drywall — no screws to studs required",
            "New-work boxes nail or screw to studs, set flush with the planned finished wall surface",
            "Always install boxes plumb and level — a crooked box shows through a cover plate",
          ],
          safetyNotes: [
            "Before drilling through any wall, check with a stud finder and a wire/pipe detector — hitting a live cable or water pipe is a serious hazard.",
            "Wear safety glasses when drilling overhead — debris and metal chips fall directly toward your eyes.",
          ],
          realWorldExamples: [
            "Running a new 20 A kitchen circuit: locate the panel, plan the route through the basement ceiling, drill up through the bottom plate, drop into a new single-gang box nailed to a stud.",
            "When retrofitting an outlet in a finished wall, use an old-work box: cut the drywall to the template, feed cable from the attic or basement, and secure the box by tightening the built-in clamps.",
          ],
        },
        {
          id: "wire-pulling",
          title: "Wire Pulling & Cable Fishing Techniques",
          body: [
            "In new construction, cables are 'run' through open stud bays before drywall. In renovation work, cables must be 'fished' through closed walls using fish tape, fish sticks (glow rods), or a wire-fishing kit.",
            "The standard fishing sequence: drill entry and exit holes; drop a weighted string (or chain) from above, or push fish tape from below; attach cable to the fish tape with electrical tape wrapped tightly so the joint won't snag; pull smoothly and steadily, avoiding sharp tugs that can kink the cable.",
            "When pulling wire through conduit, use wire-pulling lubricant (cable lube, never grease or soap) on long runs to reduce friction and prevent insulation damage. Calculate the pulling tension and observe the maximum allowable pulling tension for the cable to avoid stretching conductors.",
            "For long conduit runs, install pull boxes every 90° of total bend — the NEC and CEC permit a maximum of 360° of total bend between pull points to prevent damage to wire insulation.",
          ],
          keyPoints: [
            "Fish tape: flat steel or fibreglass tape, pushed through conduit or wall cavity to pull back cable",
            "Glow rods: fibreglass push-and-lock sticks ideal for fishing inside finished walls and ceilings",
            "Always leave a 'pull string' (nylon twine) in conduit after pulling wire — it makes future wire additions easy",
            "Maximum conduit fill: 40% for 3+ conductors, 31% for 2 conductors, 53% for 1 conductor (NEC/CEC)",
            "Label both ends of every cable or conductor immediately after pulling — memory is unreliable",
          ],
          safetyNotes: [
            "Never fish wire near a fireplace, chimney, or heat source — insulation can melt and create a fire hazard.",
            "De-energise all nearby circuits before fishing in finished walls — you may unknowingly be adjacent to a live cable.",
            "Wear gloves when handling fish tape — the edges are sharp and tape under tension can snap back violently.",
          ],
          realWorldExamples: [
            "Adding a ceiling light: drill through the top plate into the attic, push a glow rod down the interior wall cavity, attach NM cable to the rod tip with tape, and pull up through the top plate to the attic, then route to the panel.",
            "EMT conduit run in a commercial space: pre-bend all offsets and elbows on the bench, string pull wire through each section before joining, then fish conductors in one pull using cable lube.",
          ],
        },
        {
          id: "splicing-terminations",
          title: "Splicing, Terminations & Device Wiring",
          body: [
            "All wire splices must be made inside an accessible junction box — no splices are permitted inside walls or ceilings. Use approved connectors: twist-on wire connectors (wire nuts), push-in connectors (WAGO-style or Ideal In-Sure), or compression-type connectors for larger conductors.",
            "Proper technique for wire nuts: strip 20–25 mm (¾–1 in) of insulation, twist conductors clockwise together with lineman's pliers before applying the wire nut (for copper), then twist the nut clockwise until tight. Tug each conductor individually to verify it cannot pull free.",
            "For device wiring, connect the black (hot) conductor to the brass-coloured screw, white (neutral) to the silver-coloured screw, and bare/green (ground) to the green screw. 'Black to brass, white to silver' is the universal memory aid.",
            "Back-stabbing (push-in holes on the back of cheap receptacles) is permitted by code but is notorious for intermittent failures and overheating. Use the screw terminals — wrap the conductor 3/4 of the way around the screw clockwise so tightening the screw draws the wire in rather than pushing it out.",
            "Pigtailing is the practice of adding a short tail from a shared splice to a device terminal, instead of connecting two conductors directly to one screw. Code requires pigtailing when more than one conductor would otherwise share a terminal not rated for two wires.",
          ],
          keyPoints: [
            "Black to brass screw (hot), white to silver screw (neutral), green/bare to green screw (ground)",
            "Always pigtail at outlets in the middle of a run — do not use the receptacle as a pass-through",
            "Tug-test every wire nut and push-in connector",
            "Strip length: 20–25 mm for wire nuts; follow the strip gauge on the device for terminals",
            "Use the correct wire nut size — the colour-coded chart on the package specifies the conductor combinations",
            "Aluminum conductors need anti-oxidant compound (Noalox) and AL-rated connectors",
          ],
          safetyNotes: [
            "Never make a splice outside a box — concealed splices are a leading cause of electrical fires.",
            "Overheated wire nuts indicate overloaded circuits or poor connections — both must be corrected immediately.",
            "Always de-energize the circuit AND verify with a non-contact voltage tester before touching any conductor.",
          ],
          realWorldExamples: [
            "Adding an outlet mid-run: open the nearest outlet box, pigtail to the existing hot and neutral, run NM cable to the new box, and connect the new device.",
            "WAGO lever-nut connectors are reusable and ideal for lighting fixtures where repeated adjustments may be needed during commissioning.",
          ],
        },
        {
          id: "testing-commissioning",
          title: "Testing, Commissioning & Troubleshooting",
          body: [
            "Before energising any new circuit, perform a visual inspection: confirm correct wire gauge, proper connector selection, no bare conductors outside boxes, no nicks or abrasions in insulation, and box fill compliance. Visual checks catch the majority of installation errors.",
            "Use a continuity tester or multimeter in resistance mode to verify the ground and neutral are correctly connected before power-up. A megohmmeter (Megger) is used to perform insulation resistance tests on longer runs — a healthy circuit should show > 1 MΩ insulation resistance at 500 V DC.",
            "After energising, use a multimeter or receptacle tester to confirm correct voltage and polarity at every outlet. A three-light receptacle tester shows correct wiring, open ground, open neutral, open hot, hot/ground reversed, and hot/neutral reversed in seconds.",
            "Troubleshooting follows a systematic process: (1) identify the symptom (no power, tripping breaker, GFCI won't reset), (2) isolate the circuit, (3) test from the source toward the load, (4) identify the fault, (5) repair and retest. Never guess — measure.",
          ],
          formulas: [
            {
              name: "Insulation Resistance Test (Minimum Pass)",
              expression: "R_insulation ≥ 1 MΩ (new installations) at 500 V DC",
              variables: {
                "R_insulation": "Insulation resistance measured by Megger (MΩ)",
              },
              example: "A 30 m NM cable run should read well above 100 MΩ if insulation is undamaged.",
            },
            {
              name: "Voltage at Outlet (Acceptable Range)",
              expression: "V_outlet = 114–126 V (North America, nominal 120 V)",
              variables: {
                V_outlet: "Measured voltage at receptacle (V)",
              },
              example: "If V_outlet < 110 V under load, check for loose connections or undersized wire.",
            },
          ],
          keyPoints: [
            "Test before energising: continuity of ground, no short between hot and neutral",
            "Use a non-contact voltage tester (NCV) as a first check — it never gives a false zero, only false positives",
            "Follow up NCV with a contact meter to confirm voltage and polarity",
            "A tripping breaker = overload or short circuit; a GFCI tripping = ground fault or leakage",
            "Label every circuit in the panel directory BEFORE the final inspection",
            "Document your work: as-built notes and photos are invaluable for future service",
          ],
          safetyNotes: [
            "Always assume a circuit is live until your own meter proves otherwise — never rely on someone else's lock-out.",
            "Test your meter on a known live source before using it to verify a de-energized circuit — a faulty meter can give a false zero reading.",
            "Keep a record of circuits you have locked out — if you must leave the job, tag all lock-outs clearly.",
          ],
          realWorldExamples: [
            "Receptacle with no power: check the panel for a tripped breaker, then test at the outlet with a multimeter — if voltage is present on the hot but not across hot/neutral, the neutral connection is open.",
            "Nuisance GFCI tripping: disconnect each downstream outlet one at a time while monitoring the GFCI — the circuit that eliminates the trip reveals the fault location (often moisture in an outdoor box).",
          ],
        },
        {
          id: "professional-tips",
          title: "Professional Tips & Field Best Practices",
          body: [
            "Organisation is speed: sort and label every cable at the panel before pulling. Colour-coded tape on conductors entering the same panel space saves hours at trim-out. Develop a personal labelling system and use it consistently on every job.",
            "Work safely, not just quickly. The seconds saved by skipping a lock-out or not testing a circuit are not worth the risk. Electricians who build safe habits early have long, productive careers; those who cut corners often do not.",
            "Respect the inspector. The electrical inspector is not your adversary — they are the last line of defence for the home's occupants. Understand the local amendments to the CEC or NEC in your jurisdiction, discuss grey areas proactively, and fix deficiencies promptly without argument.",
            "Keep your tools calibrated and in good condition. A multimeter with a low battery can give erratic readings. Test probes with cracked insulation are a shock hazard. Replace broken tools immediately.",
            "Continuous learning separates journeypersons from tradespeople: read the code book, attend manufacturer training sessions, pursue your Red Seal or master licence, and mentor apprentices — teaching reinforces your own understanding.",
          ],
          keyPoints: [
            "Label cables at the panel before pulling to avoid the 'mystery cable' problem",
            "Use consistent colour-coding: black/red = hot legs, white = neutral, green/bare = ground, grey = neutral in 277/480 V systems",
            "Never re-use wire nuts that have been removed — they may not grip securely the second time",
            "Keep a spare circuit in every panel for future use — adding circuits later is costly",
            "Photograph your rough-in before drywall — you will thank yourself at every future service call",
            "Learn to read the blueprint: understanding symbols and one-line diagrams is as important as hands-on skill",
          ],
          safetyNotes: [
            "Personal Protective Equipment (PPE): safety glasses, insulated gloves (Class 00 or 0 for residential voltages), hard hat on construction sites, CSA/ANSI-approved footwear.",
            "Arc Flash: even residential panels can deliver dangerous arc-flash energy — wear appropriate PPE when working on energised equipment, even at 120/240 V.",
            "If in doubt, call for help. No job is worth a fatality or serious injury. Experienced electricians and inspectors are resources, not judges.",
          ],
          realWorldExamples: [
            "Photographing stud bays before drywall: a quick phone photo of each wall section shows every cable's exact path — invaluable when hanging a TV years later.",
            "A consistent panel schedule kept in the panel door prevents accidental de-energization of the wrong circuit during service work — always update the directory when adding or relocating circuits.",
            "Mentoring an apprentice by explaining the 'why' behind every code rule (not just the 'what') creates safer, more competent electricians and reinforces your own code knowledge.",
          ],
        },
      ],
    },
  ],
};

export default textbook;

/** Convenience: flat array of all chapters */
export const allChapters: TextbookChapter[] = textbook.chapters;

/** Get chapters for a specific year */
export function getChaptersByYear(year: 1 | 2): TextbookChapter[] {
  return textbook.chapters.filter((ch) => ch.year === year);
}

/** Find a chapter by id */
export function findChapterById(id: string): TextbookChapter | undefined {
  return textbook.chapters.find((ch) => ch.id === id);
}

/** Find a section within a chapter */
export function findSection(chapterId: string, sectionId: string): TextbookSection | undefined {
  return findChapterById(chapterId)?.sections.find((s) => s.id === sectionId);
}
