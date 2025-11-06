import { CatalogEntry } from "./types";

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
    id: "resistor",
    kind: "resistor",
    name: "Resistor",
    description: "Zig-zag schematic resistor body with labelled leads.",
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
