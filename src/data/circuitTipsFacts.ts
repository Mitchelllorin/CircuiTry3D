export type TipOrFact = {
  id: string;
  kind: "tip" | "fact";
  text: string;
};

const CIRCUIT_TIPS_FACTS: TipOrFact[] = [
  // Kirchhoff's Laws
  {
    id: "kcl-1",
    kind: "fact",
    text: "Kirchhoff's Current Law: the current entering a junction must equal the current exiting — no charge is created or destroyed.",
  },
  {
    id: "kvl-1",
    kind: "fact",
    text: "Kirchhoff's Voltage Law: the sum of all voltage drops around any closed loop equals zero.",
  },
  // Ohm's Law
  {
    id: "ohm-1",
    kind: "fact",
    text: "Ohm's Law: V = I × R. Double the resistance with the same voltage and the current is cut in half.",
  },
  {
    id: "ohm-2",
    kind: "tip",
    text: "Tip: Use Ohm's Law triangle — cover the value you want and multiply or divide the other two.",
  },
  // Series circuits
  {
    id: "series-1",
    kind: "fact",
    text: "In a series circuit the same current flows through every component, but voltage splits across them.",
  },
  {
    id: "series-2",
    kind: "tip",
    text: "Tip: In a series circuit, total resistance is simply R₁ + R₂ + R₃ + …",
  },
  {
    id: "series-3",
    kind: "fact",
    text: "Christmas lights were traditionally wired in series — when one bulb burned out, the whole string went dark!",
  },
  // Parallel circuits
  {
    id: "parallel-1",
    kind: "fact",
    text: "In a parallel circuit, every branch shares the same voltage while current divides between branches.",
  },
  {
    id: "parallel-2",
    kind: "tip",
    text: "Tip: For two parallel resistors, use the product-over-sum shortcut: R_eq = (R₁ × R₂) / (R₁ + R₂).",
  },
  {
    id: "parallel-3",
    kind: "fact",
    text: "Adding more parallel branches always lowers the total resistance of a circuit.",
  },
  // Power
  {
    id: "power-1",
    kind: "fact",
    text: "Power (W) = Voltage (V) × Current (A). A 60 W bulb at 120 V draws exactly 0.5 A.",
  },
  {
    id: "power-2",
    kind: "tip",
    text: "Tip: Power can also be expressed as P = I² × R or P = V² / R — handy when only two W.I.R.E. values are known.",
  },
  // Resistors
  {
    id: "resistor-1",
    kind: "fact",
    text: "The resistor color code was standardised in 1952 — each band encodes a digit or multiplier.",
  },
  {
    id: "resistor-2",
    kind: "tip",
    text: "Tip: To read a 4-band resistor, hold the tolerance band (gold/silver) to the right, then read left to right.",
  },
  // Capacitors
  {
    id: "cap-1",
    kind: "fact",
    text: "A capacitor stores energy in an electric field and can release it almost instantly — that's how a camera flash works.",
  },
  {
    id: "cap-2",
    kind: "fact",
    text: "Capacitors in series behave like resistors in parallel: total capacitance falls below the smallest individual value.",
  },
  // Inductors
  {
    id: "inductor-1",
    kind: "fact",
    text: "An inductor opposes changes in current by storing energy in a magnetic field.",
  },
  // Ground and safety
  {
    id: "ground-1",
    kind: "tip",
    text: "Tip: Always connect a ground reference before measuring voltages — measurements are only meaningful relative to a reference point.",
  },
  // AC vs DC
  {
    id: "ac-1",
    kind: "fact",
    text: "AC (alternating current) changes direction many times per second — 60 Hz in North America, 50 Hz in Europe.",
  },
  {
    id: "dc-1",
    kind: "fact",
    text: "DC (direct current) flows in one direction only. Batteries supply DC; the wall outlet supplies AC.",
  },
  // Short circuits
  {
    id: "short-1",
    kind: "tip",
    text: "Tip: A short circuit creates a near-zero resistance path, causing current to spike dangerously. Always include a fuse or current limiter!",
  },
  // W.I.R.E.
  {
    id: "wire-1",
    kind: "tip",
    text: "W.I.R.E. reminder: Watts, current (I), Resistance, and voltage (E) — know any two and you can solve the rest.",
  },
  // Real-world examples
  {
    id: "real-1",
    kind: "fact",
    text: "Household wiring uses parallel circuits so each appliance gets full mains voltage independently.",
  },
  {
    id: "real-2",
    kind: "fact",
    text: "Electric eels generate up to 600 V using stacked biological 'batteries' wired in series.",
  },
  {
    id: "real-3",
    kind: "fact",
    text: "Lightning is a massive electrical discharge — a single bolt can carry 300 million volts.",
  },
];

export default CIRCUIT_TIPS_FACTS;
