import { CatalogEntry } from "./types";

export type CatalogPlacementMode = "single-point" | "two-point" | "three-point" | "multi-point";

export const COMPONENT_CATALOG: CatalogEntry[] = [
  {
    id: "battery",
    kind: "battery",
    name: "Battery",
    description: "DC supply symbol with positive and negative plates.",
    placement: "two-point",
    icon: "DC",
    defaultLabelPrefix: "V",
    tags: ["source", "supply"]
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
    tags: ["passive", "reactive"]
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
    tags: ["indicator", "semiconductor", "light"]
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
    tags: ["semiconductor", "rectifier"]
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
