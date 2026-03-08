/**
 * Textbook Quiz & Final Examination Data
 *
 * Each chapter has a 5-question multiple-choice quiz.
 * Year 1 and Year 2 also have 15-question final exams that draw from
 * across all chapters in that year.
 *
 * All questions are keyed to the chapter IDs in electricalTextbook.ts.
 */

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;  // 0-based index into options[]
  explanation: string;
};

export type ChapterQuiz = {
  chapterId: string;
  questions: QuizQuestion[];
};

export type YearFinal = {
  year: 1 | 2;
  title: string;
  description: string;
  questions: QuizQuestion[];
};

// ─── Chapter Quizzes ─────────────────────────────────────────────────────────

const chapterQuizzes: ChapterQuiz[] = [
  // ── Ch 1: Atomic Theory & Electrical Charge ────────────────────────────────
  {
    chapterId: "atomic-theory",
    questions: [
      {
        id: "at-q1",
        question: "How many valence electrons does copper (a good conductor) have?",
        options: ["6", "4", "1", "8"],
        correctIndex: 2,
        explanation:
          "Copper has only 1 valence electron. This single loosely-held outer electron is free to drift from atom to atom when voltage is applied, which makes copper an excellent conductor.",
      },
      {
        id: "at-q2",
        question: "What is the unit of electrical charge?",
        options: ["Ampere (A)", "Coulomb (C)", "Volt (V)", "Farad (F)"],
        correctIndex: 1,
        explanation:
          "Electric charge is measured in coulombs (C). One coulomb equals the total charge of approximately 6.242 × 10¹⁸ electrons.",
      },
      {
        id: "at-q3",
        question: "Which particles are found in the nucleus of an atom?",
        options: [
          "Electrons and protons",
          "Protons and neutrons",
          "Electrons and neutrons",
          "Electrons, protons, and neutrons",
        ],
        correctIndex: 1,
        explanation:
          "The nucleus contains protons (positive charge) and neutrons (no charge). Electrons occupy shells around the nucleus.",
      },
      {
        id: "at-q4",
        question:
          "In conventional current flow, current is defined as moving from ___.",
        options: [
          "Negative terminal to positive terminal",
          "Positive terminal to negative terminal",
          "High resistance to low resistance",
          "Low potential to high potential",
        ],
        correctIndex: 1,
        explanation:
          "Conventional current is defined as flowing from the positive terminal to the negative terminal of the source — opposite to the direction of actual electron drift.",
      },
      {
        id: "at-q5",
        question: "Like charges ___ each other, while unlike charges ___ each other.",
        options: [
          "Attract; repel",
          "Repel; attract",
          "Repel; repel",
          "Attract; attract",
        ],
        correctIndex: 1,
        explanation:
          "Coulomb's Law states that like charges repel and unlike charges attract. This fundamental force drives the movement of electrons in a circuit.",
      },
    ],
  },

  // ── Ch 2: Voltage, Current & Resistance — Ohm's Law ───────────────────────
  {
    chapterId: "ohms-law",
    questions: [
      {
        id: "ol-q1",
        question:
          "A circuit has a source voltage of 12 V and a resistance of 4 Ω. What is the current?",
        options: ["48 A", "3 A", "0.33 A", "8 A"],
        correctIndex: 1,
        explanation:
          "Using Ohm's Law: I = V / R = 12 V ÷ 4 Ω = 3 A.",
      },
      {
        id: "ol-q2",
        question: "The unit of electrical resistance is the ___.",
        options: ["Siemens (S)", "Ohm (Ω)", "Watt (W)", "Henry (H)"],
        correctIndex: 1,
        explanation:
          "Resistance is measured in ohms (Ω), named after Georg Simon Ohm who formulated Ohm's Law.",
      },
      {
        id: "ol-q3",
        question:
          "What happens to the resistance of a conductor as its temperature increases?",
        options: [
          "Resistance decreases",
          "Resistance stays the same",
          "Resistance increases",
          "It depends only on the material",
        ],
        correctIndex: 2,
        explanation:
          "For most conductors, resistance increases with temperature. Higher temperatures cause more atomic vibrations, impeding electron flow.",
      },
      {
        id: "ol-q4",
        question: "A 100 Ω resistor carries 0.5 A. What is the voltage across it?",
        options: ["200 V", "0.005 V", "50 V", "0.5 V"],
        correctIndex: 2,
        explanation:
          "V = I × R = 0.5 A × 100 Ω = 50 V.",
      },
      {
        id: "ol-q5",
        question:
          "Which formula correctly expresses Ohm's Law solved for resistance?",
        options: ["R = V × I", "R = I / V", "R = V / I", "R = V + I"],
        correctIndex: 2,
        explanation:
          "From V = I × R, we can rearrange to R = V / I. This is one of the three forms of Ohm's Law.",
      },
    ],
  },

  // ── Ch 3: Series Circuits ──────────────────────────────────────────────────
  {
    chapterId: "series-circuits",
    questions: [
      {
        id: "sc-q1",
        question:
          "Three resistors (10 Ω, 20 Ω, 30 Ω) are connected in series. What is the total resistance?",
        options: ["5.45 Ω", "60 Ω", "20 Ω", "600 Ω"],
        correctIndex: 1,
        explanation:
          "In a series circuit, R_T = R₁ + R₂ + R₃ = 10 + 20 + 30 = 60 Ω.",
      },
      {
        id: "sc-q2",
        question: "In a series circuit, which quantity is the same through every component?",
        options: ["Voltage", "Resistance", "Power", "Current"],
        correctIndex: 3,
        explanation:
          "In a series circuit there is only one path for current, so the same current flows through every component: I_T = I₁ = I₂ = I₃.",
      },
      {
        id: "sc-q3",
        question:
          "A series circuit has a 24 V source, with voltage drops of 8 V and 10 V across two of the three resistors. What is the voltage across the third resistor?",
        options: ["6 V", "18 V", "4 V", "2 V"],
        correctIndex: 0,
        explanation:
          "By KVL, the sum of all voltage drops equals the source voltage: V₃ = 24 − 8 − 10 = 6 V.",
      },
      {
        id: "sc-q4",
        question: "What happens to total circuit current if one resistor in a series circuit increases in value?",
        options: [
          "Current increases",
          "Current stays the same",
          "Current decreases",
          "Current doubles",
        ],
        correctIndex: 2,
        explanation:
          "In a series circuit, total resistance increases when any resistor increases, so by Ohm's Law (I = V/R), current decreases.",
      },
      {
        id: "sc-q5",
        question:
          "Which of the following is a real-world application of a series circuit?",
        options: [
          "Household wiring (wall outlets)",
          "Parallel battery bank",
          "A string of old Christmas lights where one bulb out turns off the whole string",
          "Three-phase power distribution",
        ],
        correctIndex: 2,
        explanation:
          "Old-style Christmas light strings are wired in series. Because there is only one current path, a single open bulb breaks the circuit and extinguishes all lights.",
      },
    ],
  },

  // ── Ch 4: Parallel Circuits ────────────────────────────────────────────────
  {
    chapterId: "parallel-circuits",
    questions: [
      {
        id: "pc-q1",
        question:
          "Two 100 Ω resistors are connected in parallel. What is the total resistance?",
        options: ["200 Ω", "100 Ω", "50 Ω", "25 Ω"],
        correctIndex: 2,
        explanation:
          "For two equal resistors in parallel: R_T = R / n = 100 / 2 = 50 Ω. Or use 1/R_T = 1/100 + 1/100 → R_T = 50 Ω.",
      },
      {
        id: "pc-q2",
        question: "In a parallel circuit, which quantity is the same across every branch?",
        options: ["Current", "Resistance", "Voltage", "Power"],
        correctIndex: 2,
        explanation:
          "All branches in a parallel circuit share the same voltage — the source voltage applies directly across every parallel branch.",
      },
      {
        id: "pc-q3",
        question:
          "A parallel circuit draws 3 A in branch 1, 4 A in branch 2, and 5 A in branch 3. What is the total current from the source?",
        options: ["4 A", "12 A", "5 A", "60 A"],
        correctIndex: 1,
        explanation:
          "Total current is the sum of branch currents: I_T = 3 + 4 + 5 = 12 A. This follows from Kirchhoff's Current Law.",
      },
      {
        id: "pc-q4",
        question: "What happens when you add more branches to a parallel circuit?",
        options: [
          "Total resistance increases",
          "Total resistance decreases",
          "Total resistance stays the same",
          "Source voltage decreases",
        ],
        correctIndex: 1,
        explanation:
          "Adding branches provides more paths for current, which reduces total resistance. Total resistance in parallel is always less than the smallest individual branch resistance.",
      },
      {
        id: "pc-q5",
        question: "Why is household electrical wiring connected in parallel rather than series?",
        options: [
          "To make installations cheaper",
          "So each device receives full source voltage and operates independently",
          "Because series circuits draw too little current",
          "Parallel circuits are easier to wire",
        ],
        correctIndex: 1,
        explanation:
          "Parallel wiring ensures each device receives the full supply voltage (e.g., 120 V) and can be switched on/off independently without affecting other devices.",
      },
    ],
  },

  // ── Ch 5: Series-Parallel Circuits ────────────────────────────────────────
  {
    chapterId: "series-parallel-circuits",
    questions: [
      {
        id: "spc-q1",
        question:
          "When analysing a series-parallel circuit, what is the recommended first step?",
        options: [
          "Calculate total power",
          "Identify and simplify parallel groups into equivalent resistances",
          "Apply KCL at every node",
          "Measure all branch currents",
        ],
        correctIndex: 1,
        explanation:
          "The standard method is to redraw the circuit, replace each parallel group with its equivalent resistance, and then solve the resulting series circuit.",
      },
      {
        id: "spc-q2",
        question:
          "In a series-parallel circuit, R1 (10 Ω) is in series with a parallel combination of R2 (20 Ω) and R3 (20 Ω). What is the total resistance?",
        options: ["50 Ω", "20 Ω", "10 Ω", "30 Ω"],
        correctIndex: 1,
        explanation:
          "The parallel combination of 20 Ω ∥ 20 Ω = 10 Ω. R_T = R1 + R_parallel = 10 + 10 = 20 Ω.",
      },
      {
        id: "spc-q3",
        question:
          "Once total resistance and current are found in a series-parallel circuit, how do you find the voltage across a parallel group?",
        options: [
          "Divide the source voltage by the number of branches",
          "Use V = I_T × R_equivalent for that group",
          "Add up all branch currents",
          "It is always equal to the source voltage",
        ],
        correctIndex: 1,
        explanation:
          "The voltage across a parallel group is V_group = I_series × R_equivalent_group, where I_series is the series current flowing through that group.",
      },
      {
        id: "spc-q4",
        question:
          "Which circuit type is used in most real-world electronics (e.g., a car's electrical system)?",
        options: [
          "Pure series",
          "Pure parallel",
          "Series-parallel combination",
          "Open circuit",
        ],
        correctIndex: 2,
        explanation:
          "Most practical circuits are series-parallel combinations. Loads may share a common series resistance (wire resistance, fuse) while operating in parallel.",
      },
      {
        id: "spc-q5",
        question:
          "In a series-parallel circuit, how does the current split when reaching a parallel section?",
        options: [
          "It splits equally regardless of resistance",
          "More current flows through higher resistance branches",
          "More current flows through lower resistance branches",
          "Current only flows through one branch",
        ],
        correctIndex: 2,
        explanation:
          "Current divides inversely proportional to resistance (current divider rule). Lower resistance branches carry more current.",
      },
    ],
  },

  // ── Ch 6: Power & Energy ───────────────────────────────────────────────────
  {
    chapterId: "power-energy",
    questions: [
      {
        id: "pe-q1",
        question: "A device draws 2 A from a 120 V source. What is its power consumption?",
        options: ["60 W", "240 W", "0.0167 W", "122 W"],
        correctIndex: 1,
        explanation:
          "P = V × I = 120 V × 2 A = 240 W.",
      },
      {
        id: "pe-q2",
        question: "The unit of electrical power is the ___.",
        options: ["Joule (J)", "Coulomb (C)", "Watt (W)", "Ohm (Ω)"],
        correctIndex: 2,
        explanation:
          "Electrical power is measured in watts (W). One watt equals one joule per second.",
      },
      {
        id: "pe-q3",
        question: "A 60 W light bulb runs for 5 hours. How much energy does it consume?",
        options: ["300 Wh", "12 Wh", "0.3 kWh", "Both A and C are correct"],
        correctIndex: 3,
        explanation:
          "Energy = Power × Time = 60 W × 5 h = 300 Wh = 0.3 kWh. Both A and C express the same value.",
      },
      {
        id: "pe-q4",
        question: "Which formula correctly calculates power using only current and resistance?",
        options: ["P = V² / R", "P = I² × R", "P = V / R", "P = R / I²"],
        correctIndex: 1,
        explanation:
          "P = I² × R is derived by substituting V = I × R into P = V × I.",
      },
      {
        id: "pe-q5",
        question: "A motor consumes 1500 W of electrical power and delivers 1200 W of mechanical output. What is its efficiency?",
        options: ["80%", "125%", "20%", "75%"],
        correctIndex: 0,
        explanation:
          "Efficiency = (P_out / P_in) × 100 = (1200 / 1500) × 100 = 80%.",
      },
    ],
  },

  // ── Ch 7: Kirchhoff's Laws ─────────────────────────────────────────────────
  {
    chapterId: "kirchhoffs-laws",
    questions: [
      {
        id: "kl-q1",
        question:
          "Kirchhoff's Current Law (KCL) states that at any node, the sum of currents entering equals ___.",
        options: [
          "Zero",
          "The source voltage divided by total resistance",
          "The sum of currents leaving",
          "The total circuit power",
        ],
        correctIndex: 2,
        explanation:
          "KCL is a statement of charge conservation: the total current entering a junction must equal the total current leaving it.",
      },
      {
        id: "kl-q2",
        question:
          "Kirchhoff's Voltage Law (KVL) states that around any closed loop, the algebraic sum of voltages is ___.",
        options: ["Equal to the source voltage", "Zero", "Positive", "Negative"],
        correctIndex: 1,
        explanation:
          "KVL is a statement of energy conservation. Voltage rises (sources) and voltage drops (loads) must balance: their algebraic sum around any closed loop is zero.",
      },
      {
        id: "kl-q3",
        question:
          "In a loop, a 12 V source has voltage drops of 4 V and 5 V across two resistors. What is the voltage across the third element in the loop?",
        options: ["3 V", "21 V", "1 V", "9 V"],
        correctIndex: 0,
        explanation:
          "KVL: 12 − 4 − 5 − V₃ = 0 → V₃ = 3 V.",
      },
      {
        id: "kl-q4",
        question:
          "At a node, three currents arrive: 2 A, 3 A, and 4 A. One current of 5 A leaves the node. What is the fourth current, and does it enter or leave?",
        options: [
          "4 A entering",
          "4 A leaving",
          "9 A leaving",
          "4 A, direction unknown",
        ],
        correctIndex: 1,
        explanation:
          "Sum entering = 2 + 3 + 4 = 9 A. Sum leaving must also equal 9 A. Since 5 A already leaves, the fourth current = 9 − 5 = 4 A leaving.",
      },
      {
        id: "kl-q5",
        question: "Kirchhoff's Laws apply to ___.",
        options: [
          "Only series circuits",
          "Only parallel circuits",
          "Only DC circuits",
          "Any linear electrical circuit, DC or AC",
        ],
        correctIndex: 3,
        explanation:
          "KCL and KVL are universal laws that apply to any electrical circuit — series, parallel, series-parallel, DC, or AC.",
      },
    ],
  },

  // ── Ch 8: Magnetism & Electromagnetism ────────────────────────────────────
  {
    chapterId: "magnetism",
    questions: [
      {
        id: "mag-q1",
        question: "Faraday's Law states that the magnitude of an induced EMF depends on ___.",
        options: [
          "The resistance of the conductor",
          "The rate of change of magnetic flux through the circuit",
          "The temperature of the conductor",
          "The length of the conductor only",
        ],
        correctIndex: 1,
        explanation:
          "Faraday's Law: EMF = −N × (dΦ/dt). The faster the flux changes or the more turns N there are, the greater the induced EMF.",
      },
      {
        id: "mag-q2",
        question:
          "The left-hand rule for a conductor carrying current gives the direction of ___.",
        options: [
          "Current flow",
          "The magnetic field (flux lines) around the conductor",
          "The induced EMF",
          "The force on a positive charge",
        ],
        correctIndex: 1,
        explanation:
          "The left-hand rule (for electron flow) or right-hand rule (for conventional current) determines the direction of magnetic field lines encircling a current-carrying conductor.",
      },
      {
        id: "mag-q3",
        question:
          "Lenz's Law states that an induced current will flow in a direction that ___.",
        options: [
          "Adds to the changing magnetic flux causing it",
          "Opposes the changing magnetic flux that caused it",
          "Is always clockwise",
          "Is proportional to the resistance",
        ],
        correctIndex: 1,
        explanation:
          "Lenz's Law is a consequence of energy conservation: the induced current creates a magnetic field that opposes the change in flux that produced it.",
      },
      {
        id: "mag-q4",
        question:
          "What is the name of the property that relates the strength of an electromagnet to turns of wire and current?",
        options: [
          "Reluctance",
          "Permeability",
          "Magnetomotive force (MMF)",
          "Inductance",
        ],
        correctIndex: 2,
        explanation:
          "Magnetomotive force (MMF) = N × I (ampere-turns). It is the driving force that produces magnetic flux in a magnetic circuit, analogous to EMF in an electric circuit.",
      },
      {
        id: "mag-q5",
        question: "When a current-carrying conductor is placed in a magnetic field, the force on the conductor is called ___.",
        options: [
          "Inductive reactance",
          "The motor effect (Lorentz force)",
          "Lenz's Law",
          "Faraday induction",
        ],
        correctIndex: 1,
        explanation:
          "The motor effect (Lorentz force) acts on a current-carrying conductor in a magnetic field: F = B × I × L. This principle is the basis of all electric motors.",
      },
    ],
  },

  // ── Ch 9: DC Measuring Instruments ────────────────────────────────────────
  {
    chapterId: "dc-instruments",
    questions: [
      {
        id: "dm-q1",
        question: "To measure current, an ammeter must be connected ___ with the load.",
        options: ["In parallel", "In series", "Between the two terminals of the source", "Across the load"],
        correctIndex: 1,
        explanation:
          "An ammeter is placed in series so that the full circuit current flows through it. An ideal ammeter has zero resistance to minimise disturbance to the circuit.",
      },
      {
        id: "dm-q2",
        question: "To measure voltage across a component, a voltmeter must be connected ___ with the component.",
        options: ["In series", "In parallel", "At the source terminals only", "In line with the fuse"],
        correctIndex: 1,
        explanation:
          "A voltmeter is placed in parallel (across) the component. An ideal voltmeter has infinite resistance so it draws negligible current from the circuit.",
      },
      {
        id: "dm-q3",
        question: "What is a shunt resistor used for in an ammeter?",
        options: [
          "To increase the meter's full-scale deflection current",
          "To extend the voltage range of the meter",
          "To provide an alternative low-resistance path so most current bypasses the sensitive movement",
          "To protect against electrostatic discharge",
        ],
        correctIndex: 2,
        explanation:
          "An ammeter shunt is a very low-resistance parallel resistor. Most of the measured current flows through the shunt rather than through the sensitive galvanometer movement, extending the current range.",
      },
      {
        id: "dm-q4",
        question:
          "A multiplier resistor is used in a voltmeter to ___.",
        options: [
          "Lower the meter's resistance",
          "Increase the range by dropping excess voltage in series with the movement",
          "Prevent reverse polarity damage",
          "Calibrate the meter",
        ],
        correctIndex: 1,
        explanation:
          "A multiplier (series) resistor drops the excess voltage so only a safe fraction appears across the galvanometer movement, allowing higher voltages to be measured.",
      },
      {
        id: "dm-q5",
        question:
          "Why should an ohmmeter NEVER be connected to a live (energised) circuit?",
        options: [
          "It will give incorrect readings and may damage the meter's internal battery and movement",
          "It will trip the circuit breaker",
          "It has no internal battery",
          "It will short-circuit the source",
        ],
        correctIndex: 0,
        explanation:
          "An ohmmeter uses its own internal battery to apply a test voltage. Connecting it to an energised circuit can damage the meter and produce wildly incorrect readings.",
      },
    ],
  },

  // ── Ch 10: AC Theory Fundamentals ─────────────────────────────────────────
  {
    chapterId: "ac-theory",
    questions: [
      {
        id: "ac-q1",
        question:
          "The RMS value of a sinusoidal voltage is approximately ___ of its peak value.",
        options: ["0.5", "0.637", "0.707", "1.414"],
        correctIndex: 2,
        explanation:
          "V_rms = V_peak / √2 ≈ 0.707 × V_peak. The RMS value is the equivalent DC voltage that would produce the same heating effect in a resistor.",
      },
      {
        id: "ac-q2",
        question: "The standard AC frequency used in North America is ___.",
        options: ["50 Hz", "60 Hz", "100 Hz", "400 Hz"],
        correctIndex: 1,
        explanation:
          "North American utilities supply AC at 60 Hz (60 cycles per second). Most of the rest of the world uses 50 Hz.",
      },
      {
        id: "ac-q3",
        question: "The period (T) of a 60 Hz AC signal is ___.",
        options: ["60 ms", "1 s", "16.67 ms", "6 ms"],
        correctIndex: 2,
        explanation:
          "T = 1 / f = 1 / 60 ≈ 0.01667 s = 16.67 ms. Period is the time for one complete cycle.",
      },
      {
        id: "ac-q4",
        question:
          "In a purely resistive AC circuit, what is the phase relationship between voltage and current?",
        options: [
          "Current leads voltage by 90°",
          "Voltage leads current by 90°",
          "They are in phase (0° difference)",
          "They are 180° out of phase",
        ],
        correctIndex: 2,
        explanation:
          "In a purely resistive circuit there is no energy-storage element. Voltage and current rise and fall together — they are in phase.",
      },
      {
        id: "ac-q5",
        question: "Which AC waveform parameter describes the time offset between two sinusoidal quantities?",
        options: ["Frequency", "Amplitude", "Phase angle", "Period"],
        correctIndex: 2,
        explanation:
          "Phase angle (φ) describes the angular difference between two sinusoidal quantities. It indicates which waveform leads or lags the other.",
      },
    ],
  },

  // ── Ch 11: Capacitance & Capacitors ───────────────────────────────────────
  {
    chapterId: "capacitance",
    questions: [
      {
        id: "cap-q1",
        question:
          "What happens to capacitive reactance (X_C) as frequency increases?",
        options: [
          "X_C increases",
          "X_C stays the same",
          "X_C decreases",
          "X_C becomes infinite",
        ],
        correctIndex: 2,
        explanation:
          "X_C = 1 / (2π f C). As frequency increases, X_C decreases. Capacitors are better conductors at higher frequencies.",
      },
      {
        id: "cap-q2",
        question:
          "In a purely capacitive AC circuit, the phase relationship between current and voltage is ___.",
        options: [
          "Current lags voltage by 90°",
          "They are in phase",
          "Current leads voltage by 90°",
          "Current leads voltage by 45°",
        ],
        correctIndex: 2,
        explanation:
          "In a capacitive circuit current leads voltage by 90°. The mnemonic 'ICE' helps: I (current) before C (capacitor) before E (EMF/voltage).",
      },
      {
        id: "cap-q3",
        question:
          "A 100 µF capacitor charges through a 10 kΩ resistor. What is the RC time constant?",
        options: ["1 ms", "0.1 s", "1 s", "10 s"],
        correctIndex: 2,
        explanation:
          "τ = R × C = 10 000 Ω × 100 × 10⁻⁶ F = 1 s.",
      },
      {
        id: "cap-q4",
        question:
          "How do you calculate the total capacitance of capacitors connected in parallel?",
        options: [
          "1/C_T = 1/C₁ + 1/C₂ + …",
          "C_T = C₁ + C₂ + …",
          "C_T = (C₁ × C₂) / (C₁ + C₂)",
          "C_T = C₁ × C₂ × …",
        ],
        correctIndex: 1,
        explanation:
          "Capacitors in parallel simply add: C_T = C₁ + C₂ + … (like resistors in series). This is because the plate areas effectively add together.",
      },
      {
        id: "cap-q5",
        question:
          "After how many time constants is a capacitor considered fully charged?",
        options: ["1", "3", "5", "10"],
        correctIndex: 2,
        explanation:
          "After 5τ a capacitor has reached approximately 99.3% of the source voltage and is considered fully charged for practical purposes.",
      },
    ],
  },

  // ── Ch 12: Inductance & Inductors ─────────────────────────────────────────
  {
    chapterId: "inductance",
    questions: [
      {
        id: "ind-q1",
        question:
          "What happens to inductive reactance (X_L) as frequency increases?",
        options: [
          "X_L decreases",
          "X_L stays the same",
          "X_L increases",
          "X_L becomes zero",
        ],
        correctIndex: 2,
        explanation:
          "X_L = 2π f L. As frequency increases, inductive reactance increases. Inductors block high frequencies more effectively.",
      },
      {
        id: "ind-q2",
        question:
          "In a purely inductive AC circuit, what is the phase relationship between current and voltage?",
        options: [
          "Current leads voltage by 90°",
          "They are in phase",
          "Current lags voltage by 90°",
          "Current lags voltage by 45°",
        ],
        correctIndex: 2,
        explanation:
          "In an inductive circuit current lags voltage by 90°. The mnemonic 'ELI' helps: E (EMF/voltage) before L (inductor) before I (current).",
      },
      {
        id: "ind-q3",
        question:
          "An inductor in DC steady state acts as a ___.",
        options: [
          "Open circuit",
          "Short circuit (pure conductor)",
          "Capacitor",
          "High-value resistor",
        ],
        correctIndex: 1,
        explanation:
          "In DC steady state, current is constant (di/dt = 0), so no EMF is induced. The inductor looks like a wire — a short circuit.",
      },
      {
        id: "ind-q4",
        question:
          "What is the RL time constant (τ) formula?",
        options: ["τ = R × L", "τ = L / R", "τ = R / L", "τ = √(R × L)"],
        correctIndex: 1,
        explanation:
          "τ = L / R. The RL time constant defines how quickly current builds up or decays in an RL circuit.",
      },
      {
        id: "ind-q5",
        question:
          "A flyback diode across an inductor coil is used to protect against ___.",
        options: [
          "Overcurrent",
          "Reverse polarity",
          "The inductive voltage spike when current is suddenly interrupted",
          "Capacitive discharge",
        ],
        correctIndex: 2,
        explanation:
          "When current through an inductor is suddenly switched off, energy stored in the magnetic field causes a large voltage spike (inductive kick). A flyback diode provides a safe path for this energy.",
      },
    ],
  },

  // ── Ch 13: Impedance, Reactance & Phase ───────────────────────────────────
  {
    chapterId: "impedance",
    questions: [
      {
        id: "imp-q1",
        question:
          "In a series RL circuit with R = 3 Ω and X_L = 4 Ω, what is the impedance Z?",
        options: ["7 Ω", "1 Ω", "5 Ω", "12 Ω"],
        correctIndex: 2,
        explanation:
          "Z = √(R² + X_L²) = √(9 + 16) = √25 = 5 Ω.",
      },
      {
        id: "imp-q2",
        question:
          "True power (P) in an AC circuit is measured in ___.",
        options: ["Volt-amperes (VA)", "Volt-amperes reactive (VAR)", "Watts (W)", "Henries (H)"],
        correctIndex: 2,
        explanation:
          "True (real) power is measured in watts. It represents power that is actually consumed and converted to heat or work.",
      },
      {
        id: "imp-q3",
        question:
          "Power factor (PF) is defined as ___.",
        options: [
          "P / S (True power / Apparent power)",
          "Q / S (Reactive power / Apparent power)",
          "S / P (Apparent power / True power)",
          "P × Q",
        ],
        correctIndex: 0,
        explanation:
          "PF = P / S = cos(φ). A power factor of 1 means all supplied power is being used as true power. A lower PF means more reactive power is circulating without doing useful work.",
      },
      {
        id: "imp-q4",
        question:
          "What does a lagging power factor indicate?",
        options: [
          "The circuit is purely resistive",
          "The circuit has a dominant capacitive load",
          "The circuit has a dominant inductive load",
          "The circuit is at resonance",
        ],
        correctIndex: 2,
        explanation:
          "A lagging power factor (current lags voltage) indicates an inductive-dominant load. Most industrial loads (motors, transformers) have a lagging power factor.",
      },
      {
        id: "imp-q5",
        question:
          "In an AC circuit with Z = 10 Ω applied to 100 V RMS, what is the RMS current?",
        options: ["10 A", "1 000 A", "10 A", "1 A"],
        correctIndex: 0,
        explanation:
          "Ohm's Law for AC: I = V / Z = 100 V / 10 Ω = 10 A.",
      },
    ],
  },

  // ── Ch 14: Resonance ──────────────────────────────────────────────────────
  {
    chapterId: "resonance",
    questions: [
      {
        id: "res-q1",
        question:
          "At series resonance, what is the relationship between inductive reactance and capacitive reactance?",
        options: [
          "X_L > X_C",
          "X_L = X_C",
          "X_L < X_C",
          "X_L = 0 and X_C = 0",
        ],
        correctIndex: 1,
        explanation:
          "At resonance X_L = X_C, so they cancel. The net reactance is zero and impedance equals resistance alone (minimum impedance).",
      },
      {
        id: "res-q2",
        question: "What is the resonant frequency formula for a series LC circuit?",
        options: [
          "f₀ = 2π / √(LC)",
          "f₀ = 1 / (2π √(LC))",
          "f₀ = √(LC) / (2π)",
          "f₀ = 2π × L × C",
        ],
        correctIndex: 1,
        explanation:
          "The resonant frequency is f₀ = 1 / (2π √(LC)). At this frequency X_L = X_C and impedance is minimised (series) or maximised (parallel).",
      },
      {
        id: "res-q3",
        question:
          "What happens to current at series resonance?",
        options: [
          "Current is minimum",
          "Current is maximum",
          "Current is zero",
          "Current equals the source voltage",
        ],
        correctIndex: 1,
        explanation:
          "At series resonance, impedance is at its minimum (= R only), so by Ohm's Law current is at its maximum: I = V / R.",
      },
      {
        id: "res-q4",
        question:
          "The bandwidth (BW) of a resonant circuit is defined as ___.",
        options: [
          "BW = f₀ × Q",
          "BW = f₀ / Q",
          "BW = Q / f₀",
          "BW = Q × R",
        ],
        correctIndex: 1,
        explanation:
          "BW = f₀ / Q. A higher Q (quality factor) means a narrower, more selective bandwidth — the circuit responds to a tighter frequency range.",
      },
      {
        id: "res-q5",
        question:
          "Resonance circuits are commonly used in ___.",
        options: [
          "DC power supplies only",
          "Radio tuning circuits to select a specific broadcast frequency",
          "Purely resistive heater circuits",
          "Voltage dividers",
        ],
        correctIndex: 1,
        explanation:
          "The classic application of resonance is radio tuning. Adjusting a variable capacitor or inductor tunes the resonant frequency to match a desired radio station frequency.",
      },
    ],
  },

  // ── Ch 15: Transformers ────────────────────────────────────────────────────
  {
    chapterId: "transformers",
    questions: [
      {
        id: "tr-q1",
        question:
          "A transformer has 200 primary turns and 50 secondary turns. If 120 V is applied to the primary, what is the secondary voltage?",
        options: ["480 V", "30 V", "240 V", "60 V"],
        correctIndex: 1,
        explanation:
          "V_S / V_P = N_S / N_P → V_S = 120 × (50/200) = 120 × 0.25 = 30 V. This is a step-down transformer (turns ratio 4:1).",
      },
      {
        id: "tr-q2",
        question: "An ideal transformer with a turns ratio of 1:10 (step-up). If the primary current is 5 A, what is the secondary current?",
        options: ["50 A", "0.5 A", "5 A", "25 A"],
        correctIndex: 1,
        explanation:
          "For an ideal transformer: I_S / I_P = N_P / N_S → I_S = 5 × (1/10) = 0.5 A. Stepping voltage up steps current down by the same ratio.",
      },
      {
        id: "tr-q3",
        question: "What principle of electromagnetic induction do transformers rely on?",
        options: [
          "Electrostatic induction",
          "Mutual induction between primary and secondary coils",
          "Self-induction only",
          "The Lorentz force on conductors",
        ],
        correctIndex: 1,
        explanation:
          "Transformers operate on mutual induction: a changing current in the primary winding creates a changing magnetic flux that induces an EMF in the secondary winding.",
      },
      {
        id: "tr-q4",
        question: "Why do transformers only work with AC, not DC?",
        options: [
          "DC has too high a frequency",
          "DC current would overheat the transformer",
          "A steady DC produces no changing flux, so no EMF is induced in the secondary",
          "Transformers only pass current in one direction",
        ],
        correctIndex: 2,
        explanation:
          "Transformer action requires a changing magnetic flux (dΦ/dt). DC creates a constant flux, so dΦ/dt = 0 and no secondary EMF is induced.",
      },
      {
        id: "tr-q5",
        question:
          "The efficiency of a practical transformer is reduced mainly by ___.",
        options: [
          "The turns ratio",
          "Copper (I²R) losses in windings and iron (eddy current & hysteresis) losses in the core",
          "The supply frequency",
          "The size of the primary",
        ],
        correctIndex: 1,
        explanation:
          "Real transformers have two main loss types: copper losses (I²R heat in the wire windings) and iron losses (eddy currents and magnetic hysteresis in the core).",
      },
    ],
  },

  // ── Ch 16: Semiconductors & Diodes ────────────────────────────────────────
  {
    chapterId: "semiconductors",
    questions: [
      {
        id: "sem-q1",
        question: "What is the name of the junction formed between a P-type and an N-type semiconductor?",
        options: ["Bipolar junction", "P-N junction", "Field-effect junction", "Zener junction"],
        correctIndex: 1,
        explanation:
          "When P-type and N-type semiconductor materials are joined, a P-N junction is formed. It is the fundamental building block of diodes, BJTs, LEDs, and solar cells.",
      },
      {
        id: "sem-q2",
        question:
          "A diode in forward bias acts like a ___.",
        options: [
          "Open switch",
          "Closed switch (low resistance path)",
          "High-value resistor",
          "Capacitor",
        ],
        correctIndex: 1,
        explanation:
          "In forward bias (anode positive relative to cathode), the diode conducts and has a small forward voltage drop (≈ 0.7 V for silicon). It behaves like a closed switch.",
      },
      {
        id: "sem-q3",
        question: "The forward voltage drop of a typical silicon diode is approximately ___.",
        options: ["0.3 V", "0.7 V", "1.4 V", "5 V"],
        correctIndex: 1,
        explanation:
          "Silicon diodes have a typical forward voltage drop of 0.6–0.7 V. Germanium diodes drop about 0.3 V. LEDs drop 1.5–3.5 V depending on colour.",
      },
      {
        id: "sem-q4",
        question: "N-type semiconductor material is created by doping silicon with a ___.",
        options: [
          "Trivalent element (e.g., boron) — adds holes",
          "Pentavalent element (e.g., phosphorus) — adds free electrons",
          "Divalent element — creates a pure semiconductor",
          "Metal oxide — adds conductance",
        ],
        correctIndex: 1,
        explanation:
          "N-type silicon is doped with pentavalent atoms (phosphorus, arsenic). The extra 5th valence electron becomes a free carrier, making electrons the majority carrier.",
      },
      {
        id: "sem-q5",
        question: "A half-wave rectifier circuit uses ___ diode(s) to convert AC to pulsating DC.",
        options: ["1", "2", "4", "6"],
        correctIndex: 0,
        explanation:
          "A half-wave rectifier uses a single diode. It passes only one half of the AC cycle. A full-wave bridge rectifier uses 4 diodes and passes both halves.",
      },
    ],
  },

  // ── Ch 17: Transistors (BJT) ───────────────────────────────────────────────
  {
    chapterId: "transistors",
    questions: [
      {
        id: "bjt-q1",
        question: "A BJT transistor has three terminals named ___.",
        options: [
          "Source, Gate, Drain",
          "Anode, Cathode, Gate",
          "Base, Collector, Emitter",
          "Positive, Negative, Common",
        ],
        correctIndex: 2,
        explanation:
          "A Bipolar Junction Transistor (BJT) has three terminals: Base (B), Collector (C), and Emitter (E). The base current controls the larger collector current.",
      },
      {
        id: "bjt-q2",
        question:
          "In a common-emitter BJT configuration, a small base current controls a ___ collector current.",
        options: [
          "Smaller",
          "Equal",
          "Much larger",
          "Alternating",
        ],
        correctIndex: 2,
        explanation:
          "The DC current gain (β or h_FE) of a BJT is typically 20–500. A small base current (µA) controls a much larger collector current (mA–A).",
      },
      {
        id: "bjt-q3",
        question: "In a BJT switch application, when the transistor is fully 'on' (saturated), it acts like a ___.",
        options: [
          "Open circuit between collector and emitter",
          "Closed switch (near-zero voltage across collector–emitter)",
          "Current source",
          "Voltage source",
        ],
        correctIndex: 1,
        explanation:
          "In saturation, V_CE is very small (< 0.2 V for silicon), so the transistor acts like a closed switch allowing maximum collector current to flow.",
      },
      {
        id: "bjt-q4",
        question: "The formula relating collector current to base current through DC gain is ___.",
        options: ["I_C = β × I_E", "I_C = β × I_B", "I_B = β × I_C", "I_E = β × I_B"],
        correctIndex: 1,
        explanation:
          "I_C = β × I_B. The DC current gain β (also written h_FE) is the ratio of collector current to base current.",
      },
      {
        id: "bjt-q5",
        question:
          "Which BJT configuration provides both voltage and current gain and is the most widely used amplifier configuration?",
        options: [
          "Common-base",
          "Common-collector (emitter follower)",
          "Common-emitter",
          "Common-drain",
        ],
        correctIndex: 2,
        explanation:
          "The common-emitter configuration provides both voltage and current gain (hence power gain) and is the most widely used BJT amplifier configuration.",
      },
    ],
  },

  // ── Ch 18: Electrical Safety & Codes ──────────────────────────────────────
  {
    chapterId: "safety-codes",
    questions: [
      {
        id: "sf-q1",
        question: "What level of current through the human body is considered potentially lethal?",
        options: [
          "1 mA",
          "10 mA",
          "1 A",
          "100 µA",
        ],
        correctIndex: 1,
        explanation:
          "Currents above about 50–100 mA through the chest can cause ventricular fibrillation and death. Even 10 mA can cause inability to let go (muscular contraction). The threshold is much lower than most people realise.",
      },
      {
        id: "sf-q2",
        question: "The Canadian Electrical Code (CEC) is published by ___.",
        options: [
          "The federal Department of Energy",
          "Standards Council of Canada / CSA Group",
          "The provincial electrical authority only",
          "IEEE",
        ],
        correctIndex: 1,
        explanation:
          "The Canadian Electrical Code (CEC, CSA C22.1) is published by the CSA Group. It sets minimum safety requirements for electrical installations and is adopted (often with amendments) by each Canadian province and territory.",
      },
      {
        id: "sf-q3",
        question:
          "The voltage drop formula for a single-phase circuit is ___.",
        options: [
          "VD = I × R_wire",
          "VD = 2 × I × R (round-trip wire resistance)",
          "VD = V_source / R_load",
          "VD = I² × R",
        ],
        correctIndex: 1,
        explanation:
          "Single-phase voltage drop: VD = 2 × I × R_wire (the factor 2 accounts for both the line conductor and the neutral/return conductor).",
      },
      {
        id: "sf-q4",
        question: "Ground Fault Circuit Interrupters (GFCIs) are required by the CEC in ___.",
        options: [
          "All circuits above 200 A",
          "Outdoor, bathroom, kitchen, and other wet-location receptacles",
          "Only industrial applications",
          "Three-phase distribution panels only",
        ],
        correctIndex: 1,
        explanation:
          "The CEC requires GFCI protection in locations where shock hazard is elevated by moisture: bathrooms, kitchens, garages, outdoors, pools, and similar wet locations.",
      },
      {
        id: "sf-q5",
        question:
          "What does the CEC maximum recommended voltage drop percentage for branch circuits typically not exceed?",
        options: ["1%", "3%", "5%", "10%"],
        correctIndex: 1,
        explanation:
          "The CEC recommends a maximum voltage drop of 3% for branch circuits and 5% for the combined feeder-plus-branch-circuit, ensuring adequate voltage at connected equipment.",
      },
    ],
  },
];

// ─── Year Finals ─────────────────────────────────────────────────────────────

const yearFinals: YearFinal[] = [
  {
    year: 1,
    title: "Year 1 Final Examination",
    description:
      "Comprehensive 15-question final covering all Year 1 DC Fundamentals topics: atomic theory, Ohm's Law, series/parallel circuits, power & energy, Kirchhoff's Laws, magnetism, and measuring instruments.",
    questions: [
      {
        id: "y1f-q1",
        question:
          "A copper wire is a good conductor because its atoms have how many valence electrons?",
        options: ["3", "5", "1", "8"],
        correctIndex: 2,
        explanation:
          "Copper has 1 valence electron. This single, loosely-held outer electron is free to drift between atoms under voltage, giving copper its excellent conductivity.",
      },
      {
        id: "y1f-q2",
        question:
          "A 9 V battery is connected to a 1.5 kΩ resistor. What current flows?",
        options: ["6 mA", "13.5 kA", "600 µA", "6 µA"],
        correctIndex: 0,
        explanation:
          "I = V / R = 9 V / 1500 Ω = 0.006 A = 6 mA.",
      },
      {
        id: "y1f-q3",
        question:
          "In a series circuit, what is always the same through every component?",
        options: ["Voltage", "Power", "Current", "Resistance"],
        correctIndex: 2,
        explanation:
          "There is only one path for current in a series circuit, so the same current flows through every element.",
      },
      {
        id: "y1f-q4",
        question:
          "Three 30 Ω resistors are in parallel. What is the total resistance?",
        options: ["90 Ω", "30 Ω", "10 Ω", "3 Ω"],
        correctIndex: 2,
        explanation:
          "For n identical resistors in parallel: R_T = R / n = 30 / 3 = 10 Ω.",
      },
      {
        id: "y1f-q5",
        question:
          "In a series-parallel circuit, R1 (5 Ω) is in series with R2 (10 Ω) ∥ R3 (10 Ω). What is the total resistance?",
        options: ["25 Ω", "15 Ω", "10 Ω", "5 Ω"],
        correctIndex: 2,
        explanation:
          "R2 ∥ R3 = 10 ∥ 10 = 5 Ω. R_T = R1 + 5 = 5 + 5 = 10 Ω.",
      },
      {
        id: "y1f-q6",
        question:
          "A 500 W electric heater runs for 3 hours. How much energy does it consume?",
        options: ["166.7 Wh", "1.5 kWh", "500 J", "1500 J"],
        correctIndex: 1,
        explanation:
          "Energy = Power × Time = 500 W × 3 h = 1500 Wh = 1.5 kWh.",
      },
      {
        id: "y1f-q7",
        question:
          "KCL states that the sum of currents entering a node equals the sum of currents ___.",
        options: ["Entering the source", "Leaving the node", "Stored in capacitors", "Dissipated as heat"],
        correctIndex: 1,
        explanation:
          "Kirchhoff's Current Law is a statement of charge conservation: currents in = currents out at any node.",
      },
      {
        id: "y1f-q8",
        question:
          "In a loop: source = 24 V, V₁ = 8 V, V₂ = 10 V. By KVL, what is V₃?",
        options: ["42 V", "18 V", "6 V", "2 V"],
        correctIndex: 2,
        explanation:
          "KVL: 24 − 8 − 10 − V₃ = 0 → V₃ = 6 V.",
      },
      {
        id: "y1f-q9",
        question:
          "What is the magnetic phenomenon where a changing flux in one coil induces an EMF in a nearby coil?",
        options: [
          "Self-inductance",
          "Mutual inductance",
          "The Hall effect",
          "Magnetic reluctance",
        ],
        correctIndex: 1,
        explanation:
          "Mutual inductance is the basis of transformer operation. A changing current in the primary creates changing flux that induces an EMF in the secondary.",
      },
      {
        id: "y1f-q10",
        question: "An ammeter must always be connected ___ in the circuit.",
        options: ["In parallel", "In series", "Across the source", "Between two nodes"],
        correctIndex: 1,
        explanation:
          "An ammeter is inserted in series so all the circuit current passes through it.",
      },
      {
        id: "y1f-q11",
        question:
          "Which formula correctly calculates power when only voltage and resistance are known?",
        options: ["P = V × R", "P = I × R", "P = V² / R", "P = I / R"],
        correctIndex: 2,
        explanation:
          "P = V² / R is derived by substituting I = V / R into P = V × I.",
      },
      {
        id: "y1f-q12",
        question:
          "A voltmeter's ideal internal resistance should be ___.",
        options: [
          "Zero, to draw maximum current",
          "Equal to the measured resistance",
          "Infinite, to draw negligible current",
          "Equal to the source impedance",
        ],
        correctIndex: 2,
        explanation:
          "An ideal voltmeter has infinite resistance so it does not disturb the circuit by drawing current.",
      },
      {
        id: "y1f-q13",
        question:
          "What is the efficiency of a motor that uses 2000 W of input power to produce 1600 W of output power?",
        options: ["80%", "125%", "20%", "400%"],
        correctIndex: 0,
        explanation:
          "Efficiency = (P_out / P_in) × 100 = (1600 / 2000) × 100 = 80%.",
      },
      {
        id: "y1f-q14",
        question:
          "In a parallel circuit with a 12 V source, branch 1 draws 1 A and branch 2 draws 3 A. What is the total power supplied?",
        options: ["12 W", "36 W", "48 W", "4 W"],
        correctIndex: 2,
        explanation:
          "I_T = 1 + 3 = 4 A. P_T = V × I_T = 12 × 4 = 48 W.",
      },
      {
        id: "y1f-q15",
        question:
          "The left-hand rule is used to find the direction of the ___ around a conductor.",
        options: [
          "Electric field",
          "Conventional current",
          "Magnetic field",
          "Voltage gradient",
        ],
        correctIndex: 2,
        explanation:
          "The left-hand rule (for electron flow convention) determines the circular direction of the magnetic field around a current-carrying conductor.",
      },
    ],
  },

  {
    year: 2,
    title: "Year 2 Final Examination",
    description:
      "Comprehensive 15-question final covering all Year 2 AC Theory & Devices topics: AC waveforms, capacitance, inductance, impedance, resonance, transformers, semiconductors, transistors, and electrical safety.",
    questions: [
      {
        id: "y2f-q1",
        question:
          "The RMS value of a sine wave is approximately what fraction of its peak value?",
        options: ["0.5", "0.637", "0.707", "1.414"],
        correctIndex: 2,
        explanation:
          "V_rms = V_p / √2 ≈ 0.707 × V_p. RMS is the effective AC value equivalent to DC in terms of heating power.",
      },
      {
        id: "y2f-q2",
        question:
          "A 200 µF capacitor is connected to 50 V DC. How much charge is stored?",
        options: ["4 mC", "10 mC", "400 µC", "0.25 C"],
        correctIndex: 1,
        explanation:
          "Q = C × V = 200 × 10⁻⁶ F × 50 V = 0.01 C = 10 mC.",
      },
      {
        id: "y2f-q3",
        question:
          "At 60 Hz, what is the capacitive reactance of a 100 µF capacitor?",
        options: ["26.5 Ω", "37.7 Ω", "6 280 Ω", "0.038 Ω"],
        correctIndex: 0,
        explanation:
          "X_C = 1 / (2π f C) = 1 / (2π × 60 × 0.0001) ≈ 26.5 Ω.",
      },
      {
        id: "y2f-q4",
        question:
          "At 60 Hz, what is the inductive reactance of a 50 mH inductor?",
        options: ["3.77 Ω", "18.85 Ω", "377 Ω", "1.885 Ω"],
        correctIndex: 1,
        explanation:
          "X_L = 2π f L = 2π × 60 × 0.05 ≈ 18.85 Ω.",
      },
      {
        id: "y2f-q5",
        question:
          "In a series RL circuit, R = 6 Ω and X_L = 8 Ω. What is the impedance Z?",
        options: ["14 Ω", "2 Ω", "10 Ω", "48 Ω"],
        correctIndex: 2,
        explanation:
          "Z = √(R² + X_L²) = √(36 + 64) = √100 = 10 Ω.",
      },
      {
        id: "y2f-q6",
        question:
          "At series resonance (X_L = X_C), the impedance of the circuit equals ___.",
        options: [
          "Zero",
          "X_L + X_C",
          "The resistance R alone",
          "Infinity",
        ],
        correctIndex: 2,
        explanation:
          "At resonance, X_L and X_C cancel. The remaining impedance is just resistance R, giving maximum current.",
      },
      {
        id: "y2f-q7",
        question:
          "A step-up transformer has N_P = 100 turns and N_S = 500 turns. If V_P = 240 V, what is V_S?",
        options: ["48 V", "1200 V", "240 V", "2400 V"],
        correctIndex: 1,
        explanation:
          "V_S / V_P = N_S / N_P → V_S = 240 × (500/100) = 240 × 5 = 1200 V.",
      },
      {
        id: "y2f-q8",
        question:
          "Why don't transformers work on DC?",
        options: [
          "DC has too high a frequency",
          "A constant DC produces no changing magnetic flux, so no secondary EMF is induced",
          "DC voltage is too low for transformer cores",
          "Transformers only work with reactive power",
        ],
        correctIndex: 1,
        explanation:
          "Transformer action requires dΦ/dt ≠ 0 (changing flux). DC creates steady flux (dΦ/dt = 0), so no EMF is induced in the secondary.",
      },
      {
        id: "y2f-q9",
        question:
          "A silicon diode in forward bias has an approximate voltage drop of ___.",
        options: ["0 V", "0.3 V", "0.7 V", "1.4 V"],
        correctIndex: 2,
        explanation:
          "Silicon P-N junctions forward-bias at approximately 0.6–0.7 V. This is the forward voltage drop used in circuit calculations.",
      },
      {
        id: "y2f-q10",
        question:
          "N-type silicon is created by doping with a pentavalent element (e.g., phosphorus), which adds ___.",
        options: ["Holes", "Free electrons", "Positive ions only", "Neutrons"],
        correctIndex: 1,
        explanation:
          "Pentavalent dopants have 5 valence electrons — one more than silicon needs for covalent bonding — so the extra electron becomes a free carrier.",
      },
      {
        id: "y2f-q11",
        question:
          "For a BJT in common-emitter configuration, I_B = 50 µA and β = 100. What is I_C?",
        options: ["0.5 µA", "5 mA", "50 A", "0.5 A"],
        correctIndex: 1,
        explanation:
          "I_C = β × I_B = 100 × 50 µA = 5000 µA = 5 mA.",
      },
      {
        id: "y2f-q12",
        question:
          "A power factor of 0.8 lagging means the circuit load is predominantly ___.",
        options: [
          "Resistive",
          "Capacitive",
          "Inductive",
          "At resonance",
        ],
        correctIndex: 2,
        explanation:
          "Lagging power factor indicates current lags voltage — a characteristic of inductive loads such as motors and transformers.",
      },
      {
        id: "y2f-q13",
        question:
          "According to the CEC, what is the maximum recommended voltage drop on a branch circuit?",
        options: ["1%", "3%", "5%", "10%"],
        correctIndex: 1,
        explanation:
          "The CEC recommends a maximum of 3% voltage drop on branch circuits to ensure adequate voltage at the load.",
      },
      {
        id: "y2f-q14",
        question:
          "An RC circuit has R = 2 kΩ and C = 50 µF. What is the time constant τ?",
        options: ["0.1 s", "100 ms", "40 ms", "Both A and B are correct"],
        correctIndex: 3,
        explanation:
          "τ = R × C = 2 000 Ω × 50 × 10⁻⁶ F = 0.1 s = 100 ms. Both A and B express the same value.",
      },
      {
        id: "y2f-q15",
        question:
          "Currents above approximately ___ mA through the human chest can cause ventricular fibrillation.",
        options: ["1 mA", "10 mA", "50–100 mA", "1 000 mA"],
        correctIndex: 2,
        explanation:
          "Currents in the 50–100 mA range are potentially lethal when they pass through the chest. Even much smaller currents (≥ 10 mA) can cause painful muscle contraction.",
      },
    ],
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export { chapterQuizzes, yearFinals };

/** Look up the quiz for a specific chapter */
export function getChapterQuiz(chapterId: string): ChapterQuiz | undefined {
  return chapterQuizzes.find((q) => q.chapterId === chapterId);
}

/** Look up the final exam for a specific year */
export function getYearFinal(year: 1 | 2): YearFinal | undefined {
  return yearFinals.find((f) => f.year === year);
}
