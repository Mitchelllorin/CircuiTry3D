/**
 * circuitExplainService.ts
 *
 * AI Circuit Explanation Engine for CircuiTry3D.
 *
 * Behavior:
 *  1. If VITE_EXPLAIN_API_URL is set, POST the circuit snapshot to
 *     `{VITE_EXPLAIN_API_URL}/explain-circuit` and return the AI-generated
 *     result.
 *  2. Otherwise fall back to a deterministic, rule-based explanation built
 *     entirely from the LegacyCircuitState data already present on the client.
 *
 * The response shape is identical whether it comes from the backend or the
 * local fallback so callers never need to branch.
 */

import type { LegacyCircuitState } from "../components/builder/types";

// ── Public types ──────────────────────────────────────────────────────────────

/** A structured explanation of how a circuit works. */
export interface ExplainResult {
  /** One-paragraph overview of the circuit. */
  summary: string;
  /** Description of how current flows through the circuit. */
  currentFlow: string;
  /** Per-component roles inferred from the component types present. */
  componentRoles: { component: string; role: string }[];
  /** Predicted steady-state behavior based on simulation metrics. */
  expectedBehavior: string;
  /** Common mistakes associated with this circuit topology. */
  commonMistakes: string[];
  /** Indicates where the explanation came from. */
  source: "ai" | "local" | "unavailable";
}

// ── Internal helpers ──────────────────────────────────────────────────────────

const EXPLAIN_ENDPOINT = import.meta.env.VITE_EXPLAIN_API_URL
  ? `${import.meta.env.VITE_EXPLAIN_API_URL}/explain-circuit`
  : null;

/** Attempt to call the remote AI endpoint.  Returns null on any failure. */
async function fetchAIExplanation(
  circuit: LegacyCircuitState,
): Promise<ExplainResult | null> {
  if (!EXPLAIN_ENDPOINT) return null;
  try {
    const response = await fetch(EXPLAIN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ circuit }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Omit<ExplainResult, "source">;
    return { ...data, source: "ai" };
  } catch {
    return null;
  }
}

// ── Component-role map ────────────────────────────────────────────────────────

const COMPONENT_ROLE_MAP: Record<string, string> = {
  battery: "Provides electromotive force (EMF) — the voltage source that drives current around the loop.",
  ac_source: "Generates an alternating voltage waveform, producing time-varying current through the circuit.",
  resistor: "Limits current flow and drops voltage proportional to its resistance (V = IR).",
  capacitor: "Stores charge and opposes changes in voltage; blocks DC in steady state.",
  "capacitor-ceramic": "Compact ceramic capacitor — stores charge and smooths voltage transients.",
  inductor: "Stores energy in a magnetic field and opposes changes in current.",
  led: "Light-emitting diode — emits light when forward-biased; also limits reverse voltage.",
  lamp: "Incandescent lamp — converts electrical energy to light and heat via a resistive filament.",
  motor: "Converts electrical energy to mechanical rotation (back-EMF reduces net current at speed).",
  speaker: "Converts electrical signals to sound via a voice coil and diaphragm.",
  diode: "Permits current in one direction only, acting as a one-way valve for charge flow.",
  "zener-diode": "Allows reverse breakdown at a stable voltage — used for voltage regulation.",
  photodiode: "Generates a small current proportional to incident light intensity.",
  thermistor: "Resistance changes with temperature; used for sensing or compensation.",
  crystal: "Vibrates at a precise frequency — used as a clock source in oscillator circuits.",
  bjt: "Bipolar Junction Transistor — amplifies or switches current via base drive.",
  "bjt-npn": "NPN BJT — conducts from collector to emitter when base current is positive.",
  "bjt-pnp": "PNP BJT — conducts from emitter to collector when base is pulled below emitter.",
  darlington: "Darlington pair — two cascaded BJTs for very high current gain.",
  mosfet: "Field-Effect Transistor — voltage-controlled switch or amplifier.",
  switch: "Mechanically opens or closes the circuit path.",
  fuse: "Sacrificial overcurrent protection — melts to break the circuit when rated current is exceeded.",
  relay: "Electromagnetic switch — a coil energises a magnetic armature that opens or closes an isolated set of contacts, letting a low-power signal control a high-power circuit.",
  "voltage-regulator": "Linear voltage regulator — accepts a higher unregulated input and outputs a stable lower voltage; excess energy is dissipated as heat (heat = (V_in − V_out) × I_out).",
  potentiometer: "Variable resistor — adjusts voltage or current continuously via a wiper.",
  opamp: "Operational amplifier — versatile analog building block for amplification and signal processing.",
  transformer: "Transfers AC energy between two inductively coupled coils; steps voltage up or down.",
  ground: "Reference potential (0 V) — provides the return path for current.",
};

function describeComponentRoles(
  byType: Record<string, number>,
): { component: string; role: string }[] {
  return Object.entries(byType)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => {
      const role = COMPONENT_ROLE_MAP[type] ?? "General circuit element.";
      const label =
        count > 1
          ? `${count}× ${type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`
          : type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return { component: label, role };
    });
}

// ── Topology analysis helpers ─────────────────────────────────────────────────

function hasComponent(byType: Record<string, number>, ...types: string[]): boolean {
  return types.some((t) => (byType[t] ?? 0) > 0);
}

function totalComponents(counts: LegacyCircuitState["counts"]): number {
  return counts.components;
}

function inferTopology(circuit: LegacyCircuitState): "empty" | "open" | "series" | "parallel" | "complex" {
  const { counts, metrics } = circuit;
  if (totalComponents(counts) === 0) return "empty";
  if (!metrics.isComplete) return "open";
  if (counts.junctions > 0) return "parallel";
  if (counts.components >= 3) return "complex";
  return "series";
}

// ── Local explanation builder ─────────────────────────────────────────────────

function buildLocalExplanation(circuit: LegacyCircuitState): ExplainResult {
  const { counts, metrics } = circuit;
  const { byType } = counts;
  const topology = inferTopology(circuit);
  const hasBattery = hasComponent(byType, "battery", "ac_source");
  const simRan = metrics.voltage > 0 || metrics.current > 0 || metrics.power > 0;

  // ── Summary ────────────────────────────────────────────────────────────────
  let summary: string;
  if (topology === "empty") {
    summary =
      "The workspace is empty. Add a battery and at least one component, then connect them with wires to build a circuit.";
  } else if (topology === "open") {
    const reason = metrics.reason ?? "incomplete wiring";
    summary = `The circuit is currently open (${reason}). Current cannot flow until all components are connected in a closed loop with a voltage source.`;
  } else if (topology === "series") {
    summary =
      `This is a series circuit with ${counts.components} component${counts.components !== 1 ? "s" : ""} ` +
      `connected end-to-end in a single loop. The same current flows through every element, and voltage drops ` +
      `are distributed across them proportionally.`;
  } else if (topology === "parallel") {
    summary =
      `This circuit has ${counts.junctions} junction${counts.junctions !== 1 ? "s" : ""}, indicating at least one ` +
      `parallel branch. Each branch carries its own share of the total current, while all branches share the ` +
      `same terminal voltage.`;
  } else {
    summary =
      `This is a complex circuit with ${counts.components} components, ${counts.wires} wires, and ` +
      `${counts.junctions} junction${counts.junctions !== 1 ? "s" : ""}. Multiple current paths exist — ` +
      `apply Kirchhoff's laws to analyse each branch.`;
  }

  // ── Current flow ──────────────────────────────────────────────────────────
  let currentFlow: string;
  if (topology === "empty") {
    currentFlow = "No current — the workspace is empty.";
  } else if (topology === "open") {
    currentFlow =
      "No current flows because the circuit loop is not closed. " +
      (hasBattery
        ? "Check that every component is connected with wires forming a complete path back to the battery."
        : "A voltage source (battery) is required to drive current.");
  } else {
    const directionNote = hasComponent(byType, "ac_source")
      ? "Because an AC source is present, current reverses direction each half-cycle."
      : "Conventional current flows from the positive terminal of the battery, through external components, and back to the negative terminal. Electron flow is opposite.";

    if (simRan && metrics.current > 0) {
      currentFlow =
        `Current of ${metrics.current.toFixed(3)} A flows through the circuit. ` + directionNote;
    } else {
      currentFlow =
        "Run the simulation to measure the exact current. " + directionNote;
    }
  }

  // ── Component roles ────────────────────────────────────────────────────────
  const componentRoles = describeComponentRoles(byType);

  // ── Expected behavior ──────────────────────────────────────────────────────
  let expectedBehavior: string;
  if (topology === "empty" || topology === "open") {
    expectedBehavior = "No observable behavior — the circuit is incomplete.";
  } else if (!simRan) {
    expectedBehavior =
      "Tap Run to simulate and compute voltage, current, resistance, and power values for this circuit.";
  } else {
    const parts: string[] = [];
    if (metrics.voltage > 0)
      parts.push(`Supply voltage: ${metrics.voltage.toFixed(2)} V`);
    if (metrics.current > 0)
      parts.push(`Circuit current: ${metrics.current.toFixed(3)} A`);
    if (metrics.resistance != null && metrics.resistance > 0)
      parts.push(`Total resistance: ${metrics.resistance.toFixed(2)} Ω`);
    if (metrics.power > 0)
      parts.push(`Total power dissipated: ${metrics.power.toFixed(3)} W`);
    if (hasComponent(byType, "led", "lamp"))
      parts.push("Light-emitting elements will be illuminated while current flows.");
    if (hasComponent(byType, "motor"))
      parts.push("The motor will spin; actual speed depends on back-EMF and load.");
    if (hasComponent(byType, "speaker"))
      parts.push("The speaker will emit a tone if driven by an AC or pulsed signal.");
    if (hasComponent(byType, "capacitor", "capacitor-ceramic"))
      parts.push("Capacitors charge toward supply voltage and block DC in steady state.");
    if (hasComponent(byType, "relay"))
      parts.push("The relay coil will energise and switch its contacts when sufficient current flows; add a flyback diode to suppress back-EMF.");
    if (hasComponent(byType, "voltage-regulator"))
      parts.push("The voltage regulator will output a stable lower voltage; heat dissipation scales with (V_in − V_out) × I_out.");
    if (metrics.wireWarning)
      parts.push(`⚠️ Wire warning: ${metrics.wireWarning}`);
    expectedBehavior = parts.length > 0 ? parts.join(". ") + "." : "Circuit is operating within normal parameters.";
  }

  // ── Common mistakes ────────────────────────────────────────────────────────
  const commonMistakes: string[] = [];
  if (!hasBattery) {
    commonMistakes.push("No voltage source — every circuit needs a battery or AC source to drive current.");
  }
  if (counts.wires === 0 && counts.components > 0) {
    commonMistakes.push("Components placed but not wired — switch to Wire mode (W) and connect them.");
  }
  if (topology === "open") {
    commonMistakes.push("Open circuit — trace each wire endpoint and make sure every node is connected.");
  }
  if (hasComponent(byType, "led") && !hasComponent(byType, "resistor")) {
    commonMistakes.push("LED without a current-limiting resistor — LEDs need a series resistor to avoid burnout.");
  }
  if (hasComponent(byType, "capacitor", "capacitor-ceramic") && !hasComponent(byType, "resistor")) {
    commonMistakes.push("Capacitor without a series resistor — the charge/discharge rate (RC time constant) depends on resistance.");
  }
  if (hasComponent(byType, "relay") && !hasComponent(byType, "diode", "zener-diode")) {
    commonMistakes.push("Relay coil without a flyback diode — the back-EMF spike when the coil de-energises can damage the driver transistor.");
  }
  if (hasComponent(byType, "voltage-regulator") && !hasBattery) {
    commonMistakes.push("Voltage regulator without a voltage source — connect a battery or supply with a higher voltage than the regulator's output.");
  }
  if (counts.junctions === 0 && counts.components > 3) {
    commonMistakes.push("Large series chain — consider whether some components should be in parallel branches instead.");
  }
  if (metrics.wireWarning) {
    commonMistakes.push(`Wire rating exceeded: ${metrics.wireWarning} — choose a heavier gauge or reduce current.`);
  }
  if (commonMistakes.length === 0) {
    commonMistakes.push("No obvious mistakes detected — run the simulation for a full electrical analysis.");
  }

  return {
    summary,
    currentFlow,
    componentRoles,
    expectedBehavior,
    commonMistakes,
    source: "local",
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a structured explanation for the given circuit snapshot.
 *
 * Tries the remote AI endpoint first (if `VITE_EXPLAIN_API_URL` is set),
 * then falls back to the deterministic local engine.
 */
export async function explainCircuit(
  circuit: LegacyCircuitState,
): Promise<ExplainResult> {
  const aiResult = await fetchAIExplanation(circuit);
  if (aiResult) return aiResult;
  return buildLocalExplanation(circuit);
}
