import { CatalogEntry, PolarityConfig } from "./types";

export type CatalogPlacementMode = "single-point" | "two-point" | "three-point" | "multi-point";

/**
 * Polarity configuration for battery components.
 * Convention: start = negative terminal, end = positive terminal
 * Conventional current flows from positive (end) to negative (start) through external circuit.
 */
const BATTERY_POLARITY: PolarityConfig = {
  isPolaritySensitive: true,
  positiveTerminal: "end",
  allowsReverseCurrent: true, // Batteries can source current if connected in reverse (though not recommended)
  polarityDescription: "Positive terminal (+) at end, negative terminal (-) at start. Current flows from + to - through external circuit."
};

/**
 * Polarity configuration for diodes.
 * Convention: start = anode (+), end = cathode (-)
 * Current can only flow from anode to cathode (forward bias).
 * Reverse bias blocks current flow.
 */
const DIODE_POLARITY: PolarityConfig = {
  isPolaritySensitive: true,
  positiveTerminal: "start", // Anode is at start
  allowsReverseCurrent: false, // Diodes block reverse current
  forwardVoltageDrop: 0.7, // Silicon diode typical Vf
  polarityDescription: "Anode (+) at start, cathode (-) at end. Current flows only from anode to cathode. Blocks reverse current."
};

/**
 * Polarity configuration for zener diodes.
 * Convention: start = anode (+), end = cathode (-)
 * Zeners conduct forward like a diode and regulate in reverse breakdown (advanced).
 */
const ZENER_POLARITY: PolarityConfig = {
  isPolaritySensitive: true,
  positiveTerminal: "start",
  allowsReverseCurrent: false,
  forwardVoltageDrop: 0.7,
  polarityDescription: "Anode (+) at start, cathode (-) at end. Reverse breakdown regulation is an advanced behavior."
};

/**
 * Polarity configuration for photodiodes.
 * Convention: start = anode (+), end = cathode (-)
 */
const PHOTODIODE_POLARITY: PolarityConfig = {
  isPolaritySensitive: true,
  positiveTerminal: "start",
  allowsReverseCurrent: false,
  forwardVoltageDrop: 0.7,
  polarityDescription: "Anode (+) at start, cathode (-) at end. Photodiodes are often reverse-biased in sensor circuits."
};

/**
 * Polarity configuration for LEDs.
 * Convention: start = anode (+), end = cathode (-)
 * Current can only flow from anode to cathode (forward bias).
 * LEDs require correct polarity to emit light; reverse polarity blocks current.
 */
const LED_POLARITY: PolarityConfig = {
  isPolaritySensitive: true,
  positiveTerminal: "start", // Anode is at start
  allowsReverseCurrent: false, // LEDs block reverse current
  forwardVoltageDrop: 2.0, // Typical LED forward voltage (varies by color: red ~1.8V, blue ~3.0V)
  polarityDescription: "Anode (+) at start, cathode (-) at end. LED only lights when current flows from anode to cathode. Reverse connection blocks current."
};

/**
 * Polarity configuration for electrolytic capacitors.
 * Convention: start = negative terminal, end = positive terminal
 * Electrolytic capacitors are polarized and can be damaged by reverse voltage.
 */
const CAPACITOR_POLARITY: PolarityConfig = {
  isPolaritySensitive: true,
  positiveTerminal: "end",
  allowsReverseCurrent: false, // Reverse polarity can damage electrolytic capacitors
  polarityDescription: "Positive terminal at end, negative at start. Reverse polarity can damage electrolytic capacitors."
};

export const COMPONENT_CATALOG: CatalogEntry[] = [
  {
    id: "battery",
    kind: "battery",
    name: "Battery",
    description: "DC supply symbol with positive and negative plates.",
    placement: "two-point",
    icon: "DC",
    defaultLabelPrefix: "V",
    tags: ["source", "supply"],
    polarity: BATTERY_POLARITY
  },
  {
    id: "ac_source",
    kind: "ac_source",
    name: "AC Source",
    description: "Alternating current power source with sine wave symbol.",
    placement: "two-point",
    icon: "AC",
    defaultLabelPrefix: "AC",
    tags: ["source", "supply", "alternating"]
  },
  {
    id: "resistor",
    kind: "resistor",
    name: "Resistor",
    description: "Three zig-zag schematic resistor body with labelled leads.",
    placement: "two-point",
    icon: "R",
    defaultLabelPrefix: "R",
    tags: ["passive", "ohmic"]
  },
  {
    id: "capacitor",
    kind: "capacitor",
    name: "Capacitor",
    description: "Parallel-plate capacitor symbol with dielectric spacing.",
    placement: "two-point",
    icon: "C",
    defaultLabelPrefix: "C",
    tags: ["passive", "reactive"],
    polarity: CAPACITOR_POLARITY
  },
  {
    id: "capacitor-ceramic",
    kind: "capacitor-ceramic",
    name: "Ceramic Capacitor",
    description: "Non-polarized capacitor commonly used for coupling and decoupling.",
    placement: "two-point",
    icon: "CC",
    defaultLabelPrefix: "C",
    tags: ["passive", "reactive", "decoupling"]
  },
  {
    id: "inductor",
    kind: "inductor",
    name: "Inductor",
    description: "Coiled conductor symbol oriented along the connection axis.",
    placement: "two-point",
    icon: "L",
    defaultLabelPrefix: "L",
    tags: ["passive", "reactive"]
  },
  {
    id: "thermistor",
    kind: "thermistor",
    name: "Thermistor",
    description: "Temperature-dependent resistor used for sensing and compensation.",
    placement: "two-point",
    icon: "RT",
    defaultLabelPrefix: "RT",
    tags: ["sensor", "temperature", "resistive"]
  },
  {
    id: "crystal",
    kind: "crystal",
    name: "Crystal",
    description: "Quartz crystal resonator used for stable timing references.",
    placement: "two-point",
    icon: "Y",
    defaultLabelPrefix: "Y",
    tags: ["timing", "oscillator", "passive"]
  },
  {
    id: "lamp",
    kind: "lamp",
    name: "Lamp",
    description: "Circular lamp indicator with filament glow in 3D.",
    placement: "two-point",
    icon: "LA",
    defaultLabelPrefix: "LAMP",
    tags: ["indicator", "load"]
  },
  {
    id: "led",
    kind: "led",
    name: "LED",
    description: "Light-emitting diode with arrows indicating light emission.",
    placement: "two-point",
    icon: "LED",
    defaultLabelPrefix: "LED",
    tags: ["indicator", "semiconductor", "light"],
    polarity: LED_POLARITY
  },
  {
    id: "switch",
    kind: "switch",
    name: "Switch",
    description: "Single-pole switch blade with open gap representation.",
    placement: "two-point",
    icon: "SW",
    defaultLabelPrefix: "S",
    tags: ["control"]
  },
  {
    id: "diode",
    kind: "diode",
    name: "Diode",
    description: "Semiconductor diode with anode and cathode markings.",
    placement: "two-point",
    icon: "D",
    defaultLabelPrefix: "D",
    tags: ["semiconductor", "rectifier"],
    polarity: DIODE_POLARITY
  },
  {
    id: "zener-diode",
    kind: "zener-diode",
    name: "Zener Diode",
    description: "Zener diode used for voltage reference and regulation (advanced behavior).",
    placement: "two-point",
    icon: "DZ",
    defaultLabelPrefix: "DZ",
    tags: ["semiconductor", "regulation", "reference"],
    polarity: ZENER_POLARITY
  },
  {
    id: "photodiode",
    kind: "photodiode",
    name: "Photodiode",
    description: "Light-sensitive diode used for sensing and measurement.",
    placement: "two-point",
    icon: "PD",
    defaultLabelPrefix: "PD",
    tags: ["sensor", "light", "semiconductor"],
    polarity: PHOTODIODE_POLARITY
  },
  {
    id: "fuse",
    kind: "fuse",
    name: "Fuse",
    description: "Protective fuse element that breaks circuit on overload.",
    placement: "two-point",
    icon: "F",
    defaultLabelPrefix: "F",
    tags: ["protection", "safety"]
  },
  {
    id: "motor",
    kind: "motor",
    name: "Motor",
    description: "DC motor with rotating armature symbol.",
    placement: "two-point",
    icon: "M",
    defaultLabelPrefix: "M",
    tags: ["load", "actuator", "mechanical"]
  },
  {
    id: "speaker",
    kind: "speaker",
    name: "Speaker",
    description: "Audio speaker/buzzer for sound output.",
    placement: "two-point",
    icon: "SPK",
    defaultLabelPrefix: "SPK",
    tags: ["output", "audio", "indicator"]
  },
  {
    id: "bjt",
    kind: "bjt",
    name: "BJT Transistor",
    description: "Bipolar junction transistor with collector, base, and emitter terminals.",
    placement: "three-point",
    icon: "Q",
    defaultLabelPrefix: "Q",
    tags: ["semiconductor", "amplifier", "switch"]
  },
  {
    id: "bjt-npn",
    kind: "bjt-npn",
    name: "NPN Transistor",
    description: "NPN bipolar junction transistor - current flows from collector to emitter when base is positive.",
    placement: "three-point",
    icon: "NPN",
    defaultLabelPrefix: "Q",
    tags: ["semiconductor", "amplifier", "switch", "npn", "bipolar"]
  },
  {
    id: "bjt-pnp",
    kind: "bjt-pnp",
    name: "PNP Transistor",
    description: "PNP bipolar junction transistor - current flows from emitter to collector when base is negative.",
    placement: "three-point",
    icon: "PNP",
    defaultLabelPrefix: "Q",
    tags: ["semiconductor", "amplifier", "switch", "pnp", "bipolar"]
  },
  {
    id: "darlington",
    kind: "darlington",
    name: "Darlington Pair",
    description: "Two transistors connected for very high current gain (beta squared). Also known as 'super beta' or 'delta twins'.",
    placement: "three-point",
    icon: "DRL",
    defaultLabelPrefix: "Q",
    tags: ["semiconductor", "amplifier", "high-gain", "darlington", "power"]
  },
  {
    id: "mosfet",
    kind: "mosfet",
    name: "MOSFET",
    description: "Metal-oxide-semiconductor field-effect transistor. Voltage-controlled switch for high-efficiency power applications.",
    placement: "three-point",
    icon: "M",
    defaultLabelPrefix: "M",
    tags: ["semiconductor", "switch", "power", "field-effect", "voltage-controlled"]
  },
  {
    id: "potentiometer",
    kind: "potentiometer",
    name: "Potentiometer",
    description: "Variable resistor with three terminals and adjustable wiper.",
    placement: "three-point",
    icon: "POT",
    defaultLabelPrefix: "POT",
    tags: ["passive", "variable", "adjustable"]
  },
  {
    id: "opamp",
    kind: "opamp",
    name: "Op-Amp",
    description: "Operational amplifier with inverting, non-inverting inputs and output.",
    placement: "multi-point",
    icon: "OP",
    defaultLabelPrefix: "U",
    tags: ["analog", "amplifier", "ic"]
  },
  {
    id: "transformer",
    kind: "transformer",
    name: "Transformer",
    description: "Electromagnetic transformer with primary and secondary windings.",
    placement: "multi-point",
    icon: "T",
    defaultLabelPrefix: "T",
    tags: ["passive", "magnetic", "isolation"]
  },
  {
    id: "wire",
    kind: "wire",
    name: "Wire Segment",
    description: "Straight wire run connecting two snapped nodes.",
    placement: "two-point",
    icon: "--",
    tags: ["connection"]
  },
  {
    id: "ground",
    kind: "ground",
    name: "Ground",
    description: "Ground reference tri-line symbol placed at a node.",
    placement: "single-point",
    icon: "GND",
    tags: ["reference"]
  }
];

/**
 * Get polarity configuration for a component kind.
 * Returns undefined if the component is not polarity-sensitive.
 */
export function getPolarityConfig(kind: string): PolarityConfig | undefined {
  const entry = COMPONENT_CATALOG.find(c => c.kind === kind);
  return entry?.polarity;
}

/**
 * Check if a component type is polarity-sensitive.
 */
export function isPolaritySensitive(kind: string): boolean {
  const config = getPolarityConfig(kind);
  return config?.isPolaritySensitive ?? false;
}

/**
 * Get all polarity-sensitive component kinds.
 */
export function getPolaritySensitiveKinds(): string[] {
  return COMPONENT_CATALOG
    .filter(c => c.polarity?.isPolaritySensitive)
    .map(c => c.kind);
}
