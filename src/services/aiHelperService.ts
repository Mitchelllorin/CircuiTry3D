/**
 * aiHelperService.ts
 *
 * Rule-based AI helper for CircuiTry3D.
 * Answers questions about electrical concepts and in-app usage,
 * optionally enriched with live circuit state context.
 */

import type { LegacyCircuitState } from "../components/builder/types";

// ── Typed knowledge bank ────────────────────────────────────────────────────

export interface KnowledgeEntry {
  id: string;
  keywords: string[];
  answer: string;
  followUp?: string;
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // Ohm's Law
  {
    id: "ohm-law",
    keywords: ["ohm", "v=ir", "v = i", "voltage current resistance", "ohms law", "ohm's law"],
    answer:
      "Ohm's Law states V = I × R — Voltage equals Current multiplied by Resistance. Know any two values and the third falls out directly. In CircuiTry3D all four W.I.R.E. quantities (Watts, Current, Resistance, Voltage) are shown in the simulation readout.",
    followUp: "Try the Practice mode for step-by-step W.I.R.E. problems that apply Ohm's Law.",
  },
  // KCL
  {
    id: "kcl",
    keywords: ["kcl", "kirchhoff current", "current law", "current at junction", "node current"],
    answer:
      "Kirchhoff's Current Law (KCL): the sum of currents entering a node equals the sum leaving it. Charge is conserved — nothing accumulates at a junction.",
    followUp: "Place a junction in Build mode to see how CircuiTry3D splits current across branches.",
  },
  // KVL
  {
    id: "kvl",
    keywords: ["kvl", "kirchhoff voltage", "voltage law", "loop voltage", "mesh"],
    answer:
      "Kirchhoff's Voltage Law (KVL): the sum of all voltage drops around any closed path equals zero. This underpins mesh analysis — a systematic way to solve multi-branch circuits.",
    followUp: "Open the W.I.R.E. Worksheet in Practice mode to step through KVL problems.",
  },
  // Series circuits
  {
    id: "series",
    keywords: ["series", "series circuit", "series resistor", "total resistance series"],
    answer:
      "In a series circuit the same current flows through every component, and the total resistance is the sum of all individual resistances (R_total = R₁ + R₂ + …). Voltage divides across each component proportionally.",
    followUp: "Try chaining resistors in Build mode and watch the current reading change.",
  },
  // Parallel circuits
  {
    id: "parallel",
    keywords: ["parallel", "parallel circuit", "parallel resistor", "total resistance parallel"],
    answer:
      "In a parallel circuit every branch shares the same voltage, and total resistance is found via 1/R_total = 1/R₁ + 1/R₂ + … (always less than the smallest branch). Current splits across branches.",
    followUp: "For two parallel resistors use the shortcut: R_eq = (R₁ × R₂) / (R₁ + R₂).",
  },
  // Power
  {
    id: "power",
    keywords: ["power", "watt", "watts", "p=vi", "p = v", "power formula", "dissipation"],
    answer:
      "Power P = V × I (Watts = Volts × Amps). Equivalent forms: P = I² × R and P = V² / R. CircuiTry3D colour-codes Watts in blue in the W.I.R.E. display.",
    followUp: "The Practice mode Worksheet always solves for Watts last, using the other two known values.",
  },
  // Capacitors
  {
    id: "capacitor",
    keywords: ["capacitor", "capacitance", "farad", "capacitors in series", "capacitors in parallel"],
    answer:
      "A capacitor stores energy in an electric field between two plates. Series capacitors reduce total capacitance (1/C_eq = 1/C₁ + 1/C₂ + …), while parallel capacitors add (C_eq = C₁ + C₂ + …). Energy stored: E = ½CV².",
    followUp: "Use the Arena to compare capacitor charge/discharge behaviour interactively.",
  },
  // Inductors
  {
    id: "inductor",
    keywords: ["inductor", "inductance", "henry", "coil", "magnetic field"],
    answer:
      "An inductor stores energy in a magnetic field. It opposes changes in current (Lenz's Law). Energy stored: E = ½LI². Series inductors add; parallel inductors use the reciprocal rule.",
  },
  // Resistors
  {
    id: "resistor",
    keywords: ["resistor", "resistance", "ohm", "color code", "colour code", "band"],
    answer:
      "Resistors oppose current flow. Resistance is measured in Ohms (Ω). Colour bands encode the value: the tolerance band (gold = ±5%, silver = ±10%) is always on the right. CircuiTry3D's component library includes a reference table.",
  },
  // Short circuit
  {
    id: "short-circuit",
    keywords: ["short circuit", "short", "fuse", "overcurrent", "fault"],
    answer:
      "A short circuit connects two nodes through near-zero resistance, causing current to spike dramatically. Fuses interrupt the path before damage occurs. CircuiTry3D's FUSE™ engine simulates thermal runaway in real time — add a fuse to your design to see protection in action.",
  },
  // Ground
  {
    id: "ground",
    keywords: ["ground", "gnd", "earth", "reference", "zero volt"],
    answer:
      "Ground is the zero-volt reference node — all voltages in a circuit are measured relative to it. Always connect a ground before running the simulator in CircuiTry3D.",
  },
  // AC
  {
    id: "ac",
    keywords: ["ac", "alternating current", "ac circuit", "frequency", "hz", "hertz", "sinusoidal"],
    answer:
      "Alternating Current (AC) periodically reverses direction. The frequency (Hz) determines how many times per second. Household power in the US is 120 V at 60 Hz. Use the AC Source component in Build mode to simulate AC circuits.",
  },
  // DC
  {
    id: "dc",
    keywords: ["dc", "direct current", "battery", "dc circuit"],
    answer:
      "Direct Current (DC) flows in one direction only. Batteries, phone chargers, and most electronic circuits run on DC. CircuiTry3D's battery component provides a configurable DC voltage source.",
  },
  // Voltage divider
  {
    id: "voltage-divider",
    keywords: ["voltage divider", "divider", "v_out", "vout", "potential divider"],
    answer:
      "A voltage divider splits a source voltage using two resistors: V_out = V_in × R₂ / (R₁ + R₂). It's used in sensor interfaces, bias networks, and volume controls. CircuiTry3D's Build mode includes a voltage divider template in the quick-add menu.",
  },
  // How to wire
  {
    id: "wire-mode",
    keywords: ["wire", "wiring", "connect", "wire mode", "draw wire"],
    answer:
      "Press W or click the wire-strippers icon to enter Wire Mode. Click a component terminal, route through the workspace, and click the destination terminal to draw a wire. Switch routing styles (Manhattan, diagonal, free) via the Settings panel.",
  },
  // Simulation
  {
    id: "simulation",
    keywords: ["simulate", "simulation", "run sim", "play button", "run circuit"],
    answer:
      "Press the ▶ Play button (or Ctrl+Enter) to run the simulation. CircuiTry3D solves Ohm's Law across your entire circuit and displays W.I.R.E. metrics (Watts, Current, Resistance, Voltage) in real time. Current flow particles animate through the wires when the circuit is complete.",
  },
  // Add component
  {
    id: "add-component",
    keywords: ["add component", "place component", "add resistor", "add battery", "add part", "drag"],
    answer:
      "Open the Component Library (left panel) and click any component to add it to the workspace. Use the Quick-Add bar at the bottom of the canvas for the most common parts. You can also drag directly from the library.",
  },
  // Practice mode
  {
    id: "practice",
    keywords: ["practice", "worksheet", "exercise", "quiz", "wire problem"],
    answer:
      "Practice mode presents graded W.I.R.E. problems (series, parallel, power, and more). Each problem loads a preset circuit; fill in the worksheet blanks and submit. Hints are available if you get stuck.",
  },
  // Troubleshoot mode
  {
    id: "troubleshoot",
    keywords: ["troubleshoot", "debug", "fault", "find fault", "broken circuit", "not working"],
    answer:
      "Troubleshoot mode loads circuits with hidden faults — open wires, wrong component values, or short circuits. Use the measurement tool to probe nodes and identify the problem before checking your diagnosis. Binary-search probing (midpoint first) is the fastest strategy.",
  },
  // Current flow visualization
  {
    id: "current-flow",
    keywords: ["current flow", "particles", "animation", "visualise current", "flow animation"],
    answer:
      "Current flow particles animate through wires when the circuit is complete. Zoom in to see atomic-scale electron drift, and zoom deeper for quantum-level visualisations. Use the Current Flow button in the Settings panel to cycle styles.",
  },
  // Arena
  {
    id: "arena",
    keywords: ["arena", "test", "component test", "component arena"],
    answer:
      "The Arena is an advanced simulation workspace for testing components with configurable inputs and full analysis output. Open it via the Arena tab in the Builder sidebar or navigate to /#/arena.",
  },
  // Thévenin
  {
    id: "thevenin",
    keywords: ["thevenin", "thévenin", "equivalent circuit", "vth", "rth"],
    answer:
      "Thévenin's theorem says any linear two-terminal network can be replaced by a single voltage source (V_th) in series with a resistance (R_th). Find V_th with the output open-circuited, and R_th by zeroing all sources and measuring the terminal resistance.",
  },
  // Norton
  {
    id: "norton",
    keywords: ["norton", "norton's theorem", "norton equivalent", "in norton", "rn norton"],
    answer:
      "Norton's theorem is the current-source dual of Thévenin's: any linear two-terminal network can be replaced by a current source (I_N) in parallel with a resistance (R_N). I_N is the short-circuit current; R_N equals the Thévenin resistance. Convert between the two using I_N = V_th / R_th.",
  },
  // Maximum power transfer
  {
    id: "max-power-transfer",
    keywords: ["maximum power transfer", "max power", "load resistance", "matched impedance", "source resistance"],
    answer:
      "Maximum power is delivered to a load when its resistance equals the source (Thévenin) resistance: R_load = R_th. At this point efficiency is 50% — half the power is dissipated in R_th. Use this principle when designing audio output stages, RF systems, and antenna matching networks.",
  },
  // Superposition
  {
    id: "superposition",
    keywords: ["superposition", "multiple sources", "kill source"],
    answer:
      "Superposition: with multiple independent sources, zero out all but one, solve the circuit, and repeat for each source. The total response is the algebraic sum. To zero a voltage source replace it with a short; to zero a current source replace it with an open.",
  },
  // Diode
  {
    id: "diode",
    keywords: ["diode", "led", "zener", "rectify", "forward bias", "reverse bias"],
    answer:
      "A diode allows current in one direction (forward-biased) and blocks it in reverse. LEDs emit light when forward-biased. Zener diodes conduct in reverse above a specific breakdown voltage (used as voltage references). Add them from the Component Library.",
  },
  // Transistor
  {
    id: "transistor",
    keywords: ["transistor", "bjt", "mosfet", "npn", "pnp", "amplifier", "switch transistor"],
    answer:
      "Transistors are semiconductor switches and amplifiers. BJTs control collector current via base current; MOSFETs control drain current via gate voltage. CircuiTry3D includes NPN, PNP BJT, and MOSFET components in the library.",
  },
  // Darlington pair
  {
    id: "darlington",
    keywords: ["darlington", "darlington pair", "super beta", "high gain transistor", "beta squared"],
    answer:
      "A Darlington pair connects two BJTs in cascade so the first transistor's emitter drives the second's base. The composite current gain (β_total ≈ β₁ × β₂) can exceed 1000. Darlingtons are ideal for driving high-current loads (motors, solenoids, relays) from a low-current microcontroller output. Find the Darlington Pair component in the CircuiTry3D library.",
  },
  // Op-Amp
  {
    id: "opamp",
    keywords: ["opamp", "op-amp", "operational amplifier", "comparator", "inverting", "non-inverting", "virtual ground"],
    answer:
      "An op-amp is a high-gain differential amplifier. Key configurations: inverting amplifier (gain = −R_f/R_in), non-inverting amplifier (gain = 1 + R_f/R_in), voltage follower (gain = 1), and comparator. The virtual-ground rule applies when negative feedback is present: the inputs are forced to the same potential by the feedback loop.",
    followUp: "Add an Op-Amp from the Component Library and try the voltage follower configuration.",
  },
  // Relay
  {
    id: "relay",
    keywords: ["relay", "electromagnetic relay", "coil relay", "normally open", "normally closed", "no nc com"],
    answer:
      "A relay uses an electromagnetic coil to mechanically switch a set of contacts (Normally Open / Normally Closed). The coil circuit is electrically isolated from the switching circuit — ideal for controlling high-voltage loads with a low-voltage microcontroller. Always add a flyback diode across the coil to suppress the back-EMF spike when the coil de-energises.",
    followUp: "Find the Relay (K-prefix) in the Component Library. Connect the coil to a transistor driver for best results.",
  },
  // Voltage regulator
  {
    id: "voltage-regulator",
    keywords: ["voltage regulator", "lm7805", "ldo", "linear regulator", "regulated supply", "3.3v regulator", "5v regulator"],
    answer:
      "A linear voltage regulator (e.g., LM7805) accepts a higher input voltage and outputs a stable, lower regulated voltage. The dropout voltage is the minimum input-to-output difference needed for regulation (LDO regulators achieve <0.3 V). Heat dissipation = (V_in − V_out) × I_out — add a heatsink for high currents. CircuiTry3D simulates thermal shutdown when the regulator overheats.",
    followUp: "Find the Voltage Regulator (VR-prefix) in the Component Library. Always check V_in > V_out + V_dropout.",
  },
  // Potentiometer
  {
    id: "potentiometer",
    keywords: ["potentiometer", "pot", "variable resistor", "rheostat", "wiper", "trim pot", "trimpot"],
    answer:
      "A potentiometer is a three-terminal variable resistor with a wiper that slides between two end terminals. Used as a voltage divider (all three terminals) or a variable resistor (two terminals). Common uses: volume controls, position sensors, and bias adjustment. CircuiTry3D's Potentiometer component lets you set the wiper position from 0% to 100%.",
  },
  // Photodiode
  {
    id: "photodiode",
    keywords: ["photodiode", "photo diode", "light sensor", "photocurrent", "photodetector", "reverse biased sensor"],
    answer:
      "A photodiode generates a small reverse current proportional to incident light intensity (photoconductive mode) or produces a voltage with no bias (photovoltaic mode). Used in light sensors, optical communications, and solar cells. Add a Photodiode from the Component Library to build a light-sensing circuit.",
  },
  // Speaker / Buzzer
  {
    id: "speaker-buzzer",
    keywords: ["speaker", "buzzer", "audio", "sound", "impedance ohm speaker", "8 ohm"],
    answer:
      "A speaker converts electrical energy to sound. Its impedance (typically 4–16 Ω) limits current at audio frequencies. A piezo buzzer is self-oscillating and only needs a DC voltage. Always match amplifier output impedance to the speaker for maximum power transfer and avoid damage.",
  },
  // Thermistor
  {
    id: "thermistor",
    keywords: ["thermistor", "ntc", "ptc", "temperature sensor", "temperature dependent", "thermal resistance"],
    answer:
      "A thermistor is a temperature-sensitive resistor. NTC (Negative Temperature Coefficient) resistance decreases as temperature rises — used for temperature measurement and inrush current limiting. PTC (Positive Temperature Coefficient) resistance increases sharply above a trip temperature — used as self-resetting fuses. CircuiTry3D's FUSE™ engine models NTC self-heating deviation.",
  },
  // Crystal oscillator
  {
    id: "crystal-oscillator",
    keywords: ["crystal", "oscillator", "quartz", "clock signal", "resonator", "frequency stability", "mhz crystal"],
    answer:
      "A quartz crystal resonates at a precise frequency determined by its cut and dimensions. Crystal oscillators provide timing references for microcontrollers, clocks, and RF systems with typical accuracy of ±50 ppm or better. Overdrive (excess drive level) can cause microfractures and frequency drift — the FUSE™ engine simulates this failure mode.",
  },
  // Motor
  {
    id: "motor-dc",
    keywords: ["motor", "dc motor", "back emf", "stall current", "brushed motor", "motor control"],
    answer:
      "A DC motor converts electrical energy into rotation. Key parameters: stall current (peak current at zero RPM) and back-EMF (voltage generated as the motor spins, which reduces net current). Always use a transistor or H-bridge driver — motors draw far more current than a microcontroller pin can supply. Add a flyback diode to handle back-EMF spikes.",
    followUp: "Find the Motor component in the Component Library. Pair it with a MOSFET for efficient switching.",
  },
  // Transformer
  {
    id: "transformer",
    keywords: ["transformer", "turns ratio", "isolation", "step up", "step down", "primary secondary winding"],
    answer:
      "A transformer transfers energy between two electrically isolated coils via a shared magnetic field. The turns ratio N₁:N₂ determines voltage scaling (V₂ = V₁ × N₂/N₁) and current scaling (I₂ = I₁ × N₁/N₂). Transformers only work with AC. Use them for mains isolation, impedance matching, and voltage conversion.",
  },
  // AC Source
  {
    id: "ac-source",
    keywords: ["ac source", "signal generator", "sine wave source", "function generator", "ac supply", "amplitude frequency"],
    answer:
      "The AC Source component generates a sinusoidal voltage with configurable amplitude and frequency. It's the starting point for AC analysis, filter design, and amplifier simulations. RMS voltage = Peak / √2 ≈ 0.707 × Peak. Use it with capacitors and inductors to explore frequency-dependent impedance in CircuiTry3D.",
  },
  // Switch
  {
    id: "switch",
    keywords: ["switch", "toggle switch", "spst", "spdt", "contact bounce", "debounce", "normally open switch"],
    answer:
      "A switch mechanically opens or closes a conductive path. SPST (Single Pole Single Throw) has one input and one output. SPDT routes one input to either of two outputs. Real switches exhibit contact bounce — multiple rapid transitions at the moment of switching. Debounce with an RC filter (hardware) or a timer delay (software) to prevent false triggers.",
  },
  // RC filter
  {
    id: "rc-filter",
    keywords: ["rc filter", "low pass filter", "high pass filter", "cutoff frequency", "time constant", "rc circuit", "rc time"],
    answer:
      "An RC circuit's time constant τ = R × C determines how quickly the capacitor charges/discharges. For a low-pass filter, the −3 dB cutoff frequency f_c = 1 / (2π × R × C). Signals below f_c pass; signals above are attenuated. Swap R and C positions to make a high-pass filter. Build one in CircuiTry3D and change the frequency of the AC Source to see the effect.",
    followUp: "Try the Arena to plot frequency response for your RC filter.",
  },
  // RL circuit
  {
    id: "rl-circuit",
    keywords: ["rl circuit", "rl time constant", "inductive circuit", "rl filter", "inductor time"],
    answer:
      "In an RL circuit the time constant τ = L / R governs how quickly current builds up or decays. At t = τ, the current reaches ~63% of its final value. Inductors block rapid current changes — at high frequencies the inductive reactance X_L = 2π × f × L becomes large, making RL circuits useful as high-frequency chokes and low-pass filters.",
  },
  // Impedance
  {
    id: "impedance",
    keywords: ["impedance", "reactance", "capacitive reactance", "inductive reactance", "xc", "xl", "phasor", "complex impedance"],
    answer:
      "Impedance (Z) is the AC generalisation of resistance, combining resistance (R) and reactance (X): Z = R + jX. Capacitive reactance X_C = 1/(2πfC) decreases at higher frequencies. Inductive reactance X_L = 2πfL increases at higher frequencies. Impedance is the denominator in Ohm's Law for AC: V = I × Z.",
  },
  // Wire gauge / AWG
  {
    id: "wire-gauge",
    keywords: ["wire gauge", "awg", "american wire gauge", "wire size", "wire ampacity", "wire current rating", "conductor size"],
    answer:
      "Wire gauge (AWG in the US) determines a wire's resistance per unit length and current-carrying capacity (ampacity). Smaller AWG numbers = thicker wire = lower resistance = higher ampacity. AWG 22 handles ~300 mA; AWG 14 handles ~15 A. In CircuiTry3D select a wire profile in the Settings to model resistance and ampacity warnings in the simulation.",
    followUp: "Open the Wire Profile selector in the Settings panel. The W.I.R.E. readout will show utilisation %.",
  },
  // Wire insulation
  {
    id: "wire-insulation",
    keywords: ["wire insulation", "pvc wire", "ptfe wire", "silicone wire", "insulation rating", "insulation temperature", "wire jacket"],
    answer:
      "Wire insulation protects the conductor and limits operating temperature. Common types in CircuiTry3D: PVC (80–105 °C, low cost), XLPE (125 °C, good flexibility), Silicone (200 °C, high-temp), PTFE (260 °C, chemical resistant), Kapton (400 °C, aerospace). Exceeding the thermal limit causes insulation burnthrough — the FUSE™ engine simulates the arc risk.",
    followUp: "Select a wire profile from Settings to model insulation limits. A warning appears when limits are exceeded.",
  },
  // FUSE™ engine / component failures
  {
    id: "fuse-engine",
    keywords: ["fuse engine", "fuse™", "component failure", "thermal runaway", "failure simulation", "failure mode", "component damage"],
    answer:
      "CircuiTry3D's FUSE™ (Failure Under Simulated Electrical stress) engine models realistic component destruction. Each component family (resistor, capacitor, LED, MOSFET, BJT, relay, motor, fuse, and more) has physics-based failure triggers: thermal overload, overvoltage breakdown, overcurrent burnout, and insulation failure. Severity escalates from stressed → critical → destroyed. Visual effects (smoke, arc, blowout) show exactly where the failure occurs.",
    followUp: "Run a circuit that exceeds a component's rated power to see the FUSE™ engine in action.",
  },
  // Thermal management
  {
    id: "thermal-management",
    keywords: ["thermal", "heat", "heatsink", "derating", "junction temperature", "thermal resistance", "cooling", "thermal runaway"],
    answer:
      "Heat is the primary cause of component failure. Derate components: operate at 70–80% of rated power to double the lifespan. Thermal resistance (θ_JA, in °C/W) determines how hot a component gets: T_junction = T_ambient + P × θ_JA. Heatsinks reduce θ_JA. In CircuiTry3D, add a Heatsink component to power transistors and regulators — the FUSE™ engine adjusts the thermal trajectory accordingly.",
    followUp: "Watch the temperature rise in real time when you simulate a circuit near its power limit.",
  },
  // Protection circuits
  {
    id: "protection-circuits",
    keywords: ["protection", "flyback diode", "snubber", "transient", "overvoltage protection", "esd", "tvs diode", "crowbar", "clamp"],
    answer:
      "Protection circuits prevent damage from voltage transients and overcurrent. Key techniques: Flyback diode (freewheeling diode) across inductive loads to absorb back-EMF; TVS (Transient Voltage Suppressor) diode clamps voltage spikes; Fuse or PTC thermistor for overcurrent; capacitive decoupling near ICs to absorb supply noise. In CircuiTry3D, add a Fuse and a flyback Diode to any inductive load to demonstrate protection.",
  },
  // Component ratings and derating
  {
    id: "component-ratings",
    keywords: ["component rating", "derating", "tolerance", "maximum rating", "absolute maximum", "rated current", "rated voltage", "safety factor"],
    answer:
      "Every component has absolute maximum ratings (voltage, current, power, temperature) that must not be exceeded. Good practice is to derate — operate at 60–80% of the maximum rating for margin and long life. Tolerance (e.g., ±5% resistor) means the actual value may differ from the marked value. In CircuiTry3D the FUSE™ engine uses these ratings to determine failure onset.",
  },
  // 3D view navigation
  {
    id: "3d-navigation",
    keywords: ["3d view", "rotate", "zoom", "camera", "orbit", "pan", "3d navigation", "tilt", "perspective"],
    answer:
      "CircuiTry3D renders the circuit in an interactive 3D workspace. Orbit: drag with left mouse button (or one finger). Pan: right-click drag (or two-finger drag). Zoom: scroll wheel or pinch. Reset view: double-tap the canvas or press R. Zoom deeper into a wire to see electron-drift animations. Press Z to fit all components in view.",
  },
  // Save / load
  {
    id: "save-load",
    keywords: ["save", "load", "export", "import", "file", "project", "circuit file", "json"],
    answer:
      "Save your circuit from the File menu (or Ctrl+S). CircuiTry3D exports circuits as JSON files you can share or reload later. Use File → Open (Ctrl+O) to import a saved circuit. Cloud auto-save keeps a rolling history of recent changes so you can undo across sessions.",
  },
  // Schematic reading
  {
    id: "schematic",
    keywords: ["schematic", "schematic symbol", "circuit diagram", "read schematic", "wiring diagram", "schematic reading"],
    answer:
      "Schematics use standardised symbols to represent components: a zigzag for a resistor, parallel lines for a capacitor, a coil for an inductor, a triangle for an op-amp. Wires are straight lines; junctions are dots. CircuiTry3D shows a live schematic overlay of your 3D circuit — tap the Schematic button in the toolbar to switch views.",
  },
  // Help / getting started
  {
    id: "help",
    keywords: ["help", "start", "getting started", "how to", "tutorial", "guide", "new"],
    answer:
      "Welcome! To get started: (1) Open the Component Library → add a Battery and a Resistor. (2) Press W to enter Wire Mode and connect their terminals. (3) Press ▶ to simulate and see the W.I.R.E. readings. For a step-by-step walkthrough open the Guides panel (📚) and launch the Interactive Tutorial.",
  },
];

// ── Suggested starter questions ─────────────────────────────────────────────

export const SUGGESTED_QUESTIONS = [
  "How do I run a simulation?",
  "What is Ohm's Law?",
  "How do I add a component?",
  "What is the difference between series and parallel?",
  "How do I wire components together?",
  "What is the FUSE™ engine?",
  "How do I use a relay?",
  "What is an RC filter?",
];

// ── Context-aware greeting ───────────────────────────────────────────────────

export function buildGreeting(circuitState: LegacyCircuitState | null): string {
  if (!circuitState) {
    return "Hi! I'm your Circuit AI assistant. Ask me anything about circuit theory, Ohm's Law, or how to use CircuiTry3D.";
  }

  const { counts, metrics } = circuitState;

  if (counts.components === 0) {
    return "Hi! Your workspace is empty. Try adding a Battery and a Resistor from the Component Library, then connect them with wires!";
  }

  if (!metrics.isComplete) {
    const reason = metrics.reason ?? "open circuit";
    if (reason === "no-battery") {
      return `You have ${counts.components} component(s) but no power source. Add a Battery to complete the circuit!`;
    }
    if (reason === "no-wires") {
      return `You have ${counts.components} component(s) but no wires. Press W to enter Wire Mode and connect the terminals!`;
    }
    return `Almost there! Your circuit has ${counts.components} component(s) but is not yet complete (${reason}). Connect all terminals to close the circuit.`;
  }

  // Wire warning takes priority in the greeting
  if (metrics.wireWarning) {
    return `⚠️ Wire alert: ${metrics.wireWarning} Check the wire profile in Settings and consider upgrading the gauge or insulation.`;
  }

  if (Number.isFinite(metrics.voltage) && Number.isFinite(metrics.current)) {
    const ampPct =
      metrics.wireAmpacityUtilization != null && Number.isFinite(metrics.wireAmpacityUtilization)
        ? ` (wire at ${Math.round(metrics.wireAmpacityUtilization * 100)}% ampacity)`
        : "";
    return `Your circuit is live! It's running at ${fmt(metrics.voltage, "V")} and ${fmt(metrics.current, "A")}${ampPct}. Ask me anything about the results or circuit theory.`;
  }

  return "Your circuit looks good! Ask me anything about the readings or circuit theory.";
}

function fmt(value: number, unit: string): string {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(2)} k${unit}`;
  }
  if (Math.abs(value) >= 1) {
    return `${value.toFixed(3)} ${unit}`;
  }
  if (Math.abs(value) >= 0.001) {
    return `${(value * 1000).toFixed(2)} m${unit}`;
  }
  return `${(value * 1_000_000).toFixed(2)} µ${unit}`;
}

// ── Circuit-context enrichment ────────────────────────────────────────────────

function buildCircuitContext(circuitState: LegacyCircuitState | null): string {
  if (!circuitState || circuitState.counts.components === 0) {
    return "";
  }

  const { counts, metrics } = circuitState;
  const parts: string[] = [];

  // Component summary
  const typeEntries = Object.entries(counts.byType ?? {});
  if (typeEntries.length > 0) {
    const typeList = typeEntries.map(([t, n]) => `${n}× ${t}`).join(", ");
    parts.push(`Circuit: ${typeList} (${counts.wires} wire(s)).`);
  } else {
    parts.push(`Your current circuit has ${counts.components} component(s) and ${counts.wires} wire(s).`);
  }

  if (metrics.isComplete) {
    parts.push(
      `Simulation results: ${fmt(metrics.voltage, "V")}, ${fmt(metrics.current, "A")}, ${
        metrics.resistance != null ? fmt(metrics.resistance, "Ω") : "open circuit"
      }, ${fmt(metrics.power, "W")}.`,
    );
    // Ampacity utilisation
    if (
      metrics.wireAmpacityUtilization != null &&
      Number.isFinite(metrics.wireAmpacityUtilization) &&
      metrics.wireAmpacityUtilization > 0.5
    ) {
      parts.push(
        `Wire ampacity utilisation: ${Math.round(metrics.wireAmpacityUtilization * 100)}% — ${
          metrics.wireAmpacityUtilization >= 1
            ? "⚠️ over-rated! Increase wire gauge."
            : metrics.wireAmpacityUtilization >= 0.8
              ? "high — consider heavier gauge."
              : "approaching limit."
        }`,
      );
    }
    // Wire warning
    if (metrics.wireWarning) {
      parts.push(`⚠️ Wire warning: ${metrics.wireWarning}`);
    }
  } else if (metrics.reason) {
    parts.push(`The circuit is incomplete: ${metrics.reason}.`);
  }

  return parts.join(" ");
}

// ── Keyword scoring — length-weighted ────────────────────────────────────────
// Longer, more specific keyword phrases earn a higher score than short generic
// single words, so "ohm's law" outscores a bare "ohm" match.

function scoreEntry(entry: KnowledgeEntry, q: string): number {
  let score = 0;
  for (const kw of entry.keywords) {
    if (q.includes(kw)) {
      score += kw.length;
    }
  }
  return score;
}

// ── Component-type–aware hints ────────────────────────────────────────────────

// Checks that `q` contains `word` as a whole word (not as part of a longer word).
function hasWord(q: string, word: string): boolean {
  const re = new RegExp(`(?<![a-z])${word}(?![a-z])`, "i");
  return re.test(q);
}

function buildComponentTypeHint(circuitState: LegacyCircuitState | null, q: string): string | null {
  if (!circuitState) return null;
  const byType = circuitState.counts.byType ?? {};

  // LED advice — use whole-word match to avoid "misled", "tiled", etc.
  if ((byType.led ?? 0) > 0 && (hasWord(q, "led") || q.includes("light") || q.includes("bright"))) {
    return "Your circuit contains an LED. LEDs require a current-limiting resistor in series — typical forward current is 20 mA and forward voltage is ~2 V. Formula: R = (V_supply − V_f) / I_f.";
  }

  // Motor advice
  if ((byType.motor ?? 0) > 0 && (q.includes("motor") || q.includes("spin") || q.includes("back emf"))) {
    return "Your circuit has a DC Motor. Always use a transistor or MOSFET driver — motors draw high stall current. Add a flyback diode across the motor terminals to protect the driver from back-EMF spikes.";
  }

  // Relay advice
  if ((byType.relay ?? 0) > 0 && (q.includes("relay") || q.includes("coil") || q.includes("contact"))) {
    return "Your circuit includes a Relay. The coil draws continuous current when energised — connect it via a transistor driver and add a flyback diode to suppress the back-EMF when the coil switches off.";
  }

  // Capacitor charging question
  if (
    (byType.capacitor ?? 0) > 0 &&
    (q.includes("capacitor") || q.includes("charge") || q.includes("time constant"))
  ) {
    return "Your circuit has a Capacitor. The RC time constant τ = R × C (seconds) controls how quickly it charges to ~63% of the supply voltage. After 5τ, it is considered fully charged.";
  }

  return null;
}

// ── Core response engine ──────────────────────────────────────────────────────

export function getAIResponse(
  question: string,
  circuitState: LegacyCircuitState | null = null,
): string {
  const q = question.toLowerCase();

  // Greet
  if (
    q === "hi" ||
    q === "hello" ||
    q === "hey" ||
    q === "greetings" ||
    q.startsWith("hello") ||
    q.startsWith("hi ")
  ) {
    return buildGreeting(circuitState);
  }

  // Wire-warning shortcut — surface immediately if user asks specifically about
  // wire-related topics (avoid triggering on generic "current" questions)
  if (
    circuitState?.metrics.wireWarning &&
    (q.includes("warn") || q.includes("wire") || q.includes("ampacity") ||
      q.includes("gauge") || q.includes("insulation") || q.includes("overcurrent"))
  ) {
    const ctx = buildCircuitContext(circuitState);
    const ctxNote = ctx ? ` \n\n📡 Context: ${ctx}` : "";
    return `⚠️ Wire warning detected: ${circuitState.metrics.wireWarning} To fix this, open Settings → Wire Profile and select a heavier gauge or higher-rated insulation for your current level.${ctxNote}`;
  }

  // Circuit-specific numeric questions
  if (circuitState?.metrics.isComplete) {
    const { metrics } = circuitState;

    if (q.includes("voltage") || q.includes("volts") || q.includes("what is the e")) {
      if (Number.isFinite(metrics.voltage)) {
        return `Your circuit is currently running at ${fmt(metrics.voltage, "V")}. Voltage is the electrical potential difference — the "pressure" driving current through the circuit (E in W.I.R.E.).`;
      }
    }

    if (q.includes("current") || q.includes("amps") || q.includes("amperage") || q.includes("what is the i")) {
      if (Number.isFinite(metrics.current)) {
        const ampPct =
          metrics.wireAmpacityUtilization != null &&
          Number.isFinite(metrics.wireAmpacityUtilization) &&
          metrics.wireAmpacityUtilization > 0
            ? ` The wire is at ${Math.round(metrics.wireAmpacityUtilization * 100)}% of its ampacity rating.`
            : "";
        return `Your circuit is drawing ${fmt(metrics.current, "A")} of current. Current is the rate of charge flow through the circuit (I in W.I.R.E.).${ampPct}`;
      }
    }

    if (
      q.includes("resistance") ||
      q.includes("ohms") ||
      q.includes("what is the r")
    ) {
      if (metrics.resistance != null && Number.isFinite(metrics.resistance)) {
        return `Total circuit resistance is ${fmt(metrics.resistance, "Ω")}. Resistance opposes current flow — higher resistance means less current for the same voltage (R in W.I.R.E.).`;
      }
      if (metrics.resistance === null) {
        return "Your circuit shows infinite resistance — it is an open circuit. Make sure all terminals are connected with wires.";
      }
    }

    if (q.includes("power") || q.includes("watt")) {
      if (Number.isFinite(metrics.power)) {
        return `Your circuit is dissipating ${fmt(metrics.power, "W")} of power. Power = Voltage × Current, and it represents how fast energy is being converted (W in W.I.R.E.).`;
      }
    }
  }

  // Component-type-aware hints
  const typeHint = buildComponentTypeHint(circuitState, q);
  if (typeHint) {
    const ctx = buildCircuitContext(circuitState);
    const ctxNote = ctx ? ` \n\n📡 Context: ${ctx}` : "";
    return `${typeHint}${ctxNote}`;
  }

  // Knowledge base keyword matching — length-weighted score
  const scores = KNOWLEDGE_BASE.map((entry) => ({
    entry,
    score: scoreEntry(entry, q),
  }));
  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  if (best.score > 0) {
    const ctx = buildCircuitContext(circuitState);
    const base = best.entry.answer;
    const followUp = best.entry.followUp ? ` ${best.entry.followUp}` : "";
    const ctxNote = ctx ? ` \n\n📡 Context: ${ctx}` : "";
    return `${base}${followUp}${ctxNote}`;
  }

  // Generic fallback
  const ctx = buildCircuitContext(circuitState);
  const ctxNote = ctx ? ` \n\n📡 Context: ${ctx}` : "";
  return `Great question! I didn't find an exact match in my knowledge base, but I can help you explore it. Try asking about Ohm's Law, series vs parallel, power calculations, component failures, or how to use specific tools in CircuiTry3D.${ctxNote}`;
}
