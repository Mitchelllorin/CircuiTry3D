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
    keywords: ["kvl", "kirchhoff voltage", "voltage law", "circuit voltage", "mesh"],
    answer:
      "Kirchhoff's Voltage Law (KVL): the sum of all voltage drops around any closed path equals zero. This underpins mesh analysis — a systematic way to solve multi-branch circuits.",
    followUp: "Open the W.I.R.E. Worksheet in Practice mode to step through KVL paths.",
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
    return `Almost there! Your circuit has ${counts.components} component(s) but is not yet complete (${reason}). Connect all terminals to complete the circuit.`;
  }

  if (Number.isFinite(metrics.voltage) && Number.isFinite(metrics.current)) {
    return `Your circuit is live! It's running at ${fmt(metrics.voltage, "V")} and ${fmt(metrics.current, "A")}. Ask me anything about the results or circuit theory.`;
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

  parts.push(
    `Your current circuit has ${counts.components} component(s) and ${counts.wires} wire(s).`,
  );

  if (metrics.isComplete) {
    parts.push(
      `Simulation results: ${fmt(metrics.voltage, "V")}, ${fmt(metrics.current, "A")}, ${
        metrics.resistance != null ? fmt(metrics.resistance, "Ω") : "open circuit"
      }, ${fmt(metrics.power, "W")}.`,
    );
  } else if (metrics.reason) {
    parts.push(`The circuit is incomplete: ${metrics.reason}.`);
  }

  return parts.join(" ");
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
        return `Your circuit is drawing ${fmt(metrics.current, "A")} of current. Current is the rate of charge flow through the circuit (I in W.I.R.E.).`;
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

  // Knowledge base keyword matching — score each entry
  const scores = KNOWLEDGE_BASE.map((entry) => {
    const matches = entry.keywords.filter((kw) => q.includes(kw)).length;
    return { entry, matches };
  });
  scores.sort((a, b) => b.matches - a.matches);

  const best = scores[0];
  if (best.matches > 0) {
    const ctx = buildCircuitContext(circuitState);
    const base = best.entry.answer;
    const followUp = best.entry.followUp ? ` ${best.entry.followUp}` : "";
    const ctxNote = ctx ? ` \n\n📡 Context: ${ctx}` : "";
    return `${base}${followUp}${ctxNote}`;
  }

  // Generic fallback
  const ctx = buildCircuitContext(circuitState);
  const ctxNote = ctx ? ` \n\n📡 Context: ${ctx}` : "";
  return `Great question! I didn't find an exact match in my knowledge base, but I can help you explore it. Try asking about Ohm's Law, series vs parallel, power calculations, or how to use specific tools in CircuiTry3D.${ctxNote}`;
}
