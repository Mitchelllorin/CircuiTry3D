import { formatMetricValue, formatNumber } from "../utils/electrical";
import type { PracticeProblem } from "../model/practice";
import { XP_REWARD_BY_DIFFICULTY } from "./gamification";

const SERIES_IDS = ["R1", "R2", "R3"] as const;
const SERIES_IDS_2 = ["R1", "R2"] as const;
const SERIES_IDS_4 = ["R1", "R2", "R3", "R4"] as const;
const SERIES_IDS_5 = ["R1", "R2", "R3", "R4", "R5"] as const;

const practiceProblemSeeds: PracticeProblem[] = [
  {
    id: "series-square-01",
    title: "Series Circuit · Circuit Current",
    topology: "series",
    difficulty: "intro",
      prompt:
        "A series circuit consists of three resistors (R1 = 150 Ω, R2 = 200 Ω, R3 = 250 Ω) connected to a 24 V battery. Complete the W.I.R.E. table including all component values and circuit totals.",
    targetQuestion: "What is the total current flowing through this series circuit?",
    targetMetric: { componentId: "totals", key: "current" },
    conceptTags: ["series", "ohms-law", "wire-table"],
    diagram: "seriesRect",
    learningObjective: "Apply Ohm's Law to calculate current in a series circuit by first finding total resistance.",
    hints: [
      { text: "In a series circuit, current is the same through all components", formula: "I_T = I_1 = I_2 = I_3" },
      { text: "First find total resistance by adding all resistors", formula: "R_T = R_1 + R_2 + R_3" },
      { text: "Then use Ohm's Law with the source voltage", formula: "I = E / R" },
    ],
    tips: [
      "Always start by calculating total resistance in series circuits",
      "The current you find is the same everywhere in the circuit",
      "Voltage drops across components should sum to the source voltage",
    ],
    facts: [
      "Christmas lights were traditionally wired in series - when one bulb burned out, the whole string went dark!",
      "Series circuits are used in voltage dividers, a fundamental building block in electronics",
    ],
    realWorldExample: "A flashlight uses batteries in series to increase voltage. Two 1.5V AA batteries in series provide 3V.",
    source: {
      id: "battery",
      label: "Battery",
      role: "source",
      givens: { voltage: 24 },
      values: { voltage: 24 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 150 },
        values: { resistance: 150 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 200 },
        values: { resistance: 200 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 250 },
        values: { resistance: 250 },
      },
    ],
    network: {
      kind: "series",
      id: "series-square",
      children: SERIES_IDS.map((componentId) => ({ kind: "component", componentId })),
    },
    totalsGivens: {},
    presetHint: "series_basic",
    steps: [
      ({ components, totals }) => {
        const sumLine = SERIES_IDS.map((id) => `${formatNumber(components[id].resistance, 0)}Ω`).join(" + ");
        return {
          title: "Sum the series resistances",
          detail: `R_T = ${sumLine} = ${formatMetricValue(totals.resistance, "resistance")}`,
          formula: "R_T = R_1 + R_2 + R_3",
        };
      },
      ({ totals }) => ({
        title: "Solve for circuit current",
        detail: `I_T = E / R_T = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.resistance, "resistance")} = ${formatMetricValue(totals.current, "current")}`,
        formula: "I = E / R",
      }),
      ({ components, totals }) => {
        const detailLines = SERIES_IDS.map((id) => {
          const voltage = formatMetricValue(components[id].voltage, "voltage");
          const resistance = formatMetricValue(components[id].resistance, "resistance");
          return `${id}: V = I_T × R = ${formatMetricValue(totals.current, "current")} × ${resistance} = ${voltage}`;
        }).join("\n");
        return {
          title: "Distribute voltage drops",
          detail: detailLines,
          formula: "E_x = I_T × R_x",
        };
      },
      ({ components }) => {
        const detailLines = SERIES_IDS.map((id) => {
          const volts = formatMetricValue(components[id].voltage, "voltage");
          const amps = formatMetricValue(components[id].current, "current");
          const watts = formatMetricValue(components[id].watts, "watts");
          return `${id}: P = ${volts} × ${amps} = ${watts}`;
        }).join("\n");
        return {
          title: "Check power per resistor",
          detail: detailLines,
          formula: "P = E × I",
        };
      },
    ],
  },
  {
    id: "series-voltage-drop-02",
    title: "Series Circuit · Voltage Drop",
    topology: "series",
    difficulty: "standard",
    prompt:
      "Two resistors (R1 = 470 Ω, R2 = 330 Ω) are connected in series to a 12 V power supply. Complete the W.I.R.E. table to find all circuit values.",
    targetQuestion: "What is the voltage drop across R1?",
    targetMetric: { componentId: "R1", key: "voltage" },
    conceptTags: ["series", "voltage-divider", "kvl"],
    diagram: "seriesRect",
    learningObjective: "Use Kirchhoff's Voltage Law to find voltage drops across individual resistors in a series circuit.",
    hints: [
      { text: "Voltage divides proportionally based on resistance values", formula: "E_x = I × R_x" },
      { text: "The larger resistor gets the larger voltage drop" },
      { text: "All voltage drops must equal the source voltage (KVL)", formula: "E_T = E_1 + E_2" },
    ],
    tips: [
      "Larger resistance = larger voltage drop in series",
      "Use the voltage divider formula for quick calculations",
      "KVL: Sum of voltage drops equals source voltage",
    ],
    facts: [
      "Voltage dividers are used in volume controls, dimmer switches, and sensor circuits",
      "The concept of voltage division is crucial in designing transistor biasing circuits",
    ],
    realWorldExample: "A potentiometer (volume knob) works as an adjustable voltage divider to control audio levels.",
    source: {
      id: "supply",
      label: "Supply",
      role: "source",
      givens: { voltage: 12 },
      values: { voltage: 12 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 470 },
        values: { resistance: 470 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 330 },
        values: { resistance: 330 },
      },
    ],
    network: {
      kind: "series",
      id: "series-voltage",
      children: SERIES_IDS_2.map((componentId) => ({ kind: "component", componentId })),
    },
    totalsGivens: {},
    presetHint: "series_voltage_drop",
    steps: [
      ({ components, totals }) => {
        const sumLine = SERIES_IDS_2.map((id) => `${formatNumber(components[id].resistance, 0)}Ω`).join(" + ");
        return {
          title: "Sum the series resistances",
          detail: `R_T = ${sumLine} = ${formatMetricValue(totals.resistance, "resistance")}`,
          formula: "R_T = R_1 + R_2",
        };
      },
      ({ totals }) => ({
        title: "Solve for circuit current",
        detail: `I_T = E / R_T = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.resistance, "resistance")} = ${formatMetricValue(totals.current, "current")}`,
        formula: "I = E / R",
      }),
      ({ components, totals }) => {
        const detailLines = SERIES_IDS_2.map((id) => {
          const voltage = formatMetricValue(components[id].voltage, "voltage");
          const resistance = formatMetricValue(components[id].resistance, "resistance");
          return `${id}: V = I × R = ${formatMetricValue(totals.current, "current")} × ${resistance} = ${voltage}`;
        }).join("\n");
        return {
          title: "Calculate voltage drops (KVL)",
          detail: detailLines,
          formula: "E_x = I_T × R_x",
        };
      },
      ({ components }) => {
        const detailLines = SERIES_IDS_2.map((id) => {
          const volts = formatMetricValue(components[id].voltage, "voltage");
          const amps = formatMetricValue(components[id].current, "current");
          const watts = formatMetricValue(components[id].watts, "watts");
          return `${id}: P = ${volts} × ${amps} = ${watts}`;
        }).join("\n");
        return {
          title: "Calculate power dissipation",
          detail: detailLines,
          formula: "P = E × I",
        };
      },
    ],
  },
  {
    id: "series-power-03",
    title: "Series Circuit · Total Power",
    topology: "series",
    difficulty: "challenge",
    prompt:
      "A series circuit has three resistors (R1 = 100 Ω, R2 = 220 Ω, R3 = 180 Ω) powered by a 36 V source. Calculate all W.I.R.E. values and find the total power consumed.",
    targetQuestion: "What is the total power consumed by this circuit?",
    targetMetric: { componentId: "totals", key: "watts" },
    conceptTags: ["series", "power", "ohms-law"],
    diagram: "seriesRect",
    source: {
      id: "source",
      label: "Source",
      role: "source",
      givens: { voltage: 36 },
      values: { voltage: 36 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 100 },
        values: { resistance: 100 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 220 },
        values: { resistance: 220 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 180 },
        values: { resistance: 180 },
      },
    ],
    network: {
      kind: "series",
      id: "series-power",
      children: SERIES_IDS.map((componentId) => ({ kind: "component", componentId })),
    },
    totalsGivens: {},
    presetHint: "series_power",
    steps: [
      ({ components, totals }) => {
        const sumLine = SERIES_IDS.map((id) => `${formatNumber(components[id].resistance, 0)}Ω`).join(" + ");
        return {
          title: "Sum total resistance",
          detail: `R_T = ${sumLine} = ${formatMetricValue(totals.resistance, "resistance")}`,
          formula: "R_T = R_1 + R_2 + R_3",
        };
      },
      ({ totals }) => ({
        title: "Calculate total current",
        detail: `I_T = E / R_T = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.resistance, "resistance")} = ${formatMetricValue(totals.current, "current")}`,
        formula: "I = E / R",
      }),
      ({ totals }) => ({
        title: "Calculate total power",
        detail: `P_T = E × I = ${formatMetricValue(totals.voltage, "voltage")} × ${formatMetricValue(totals.current, "current")} = ${formatMetricValue(totals.watts, "watts")}`,
        formula: "P = E × I",
      }),
      ({ components }) => {
        const detailLines = SERIES_IDS.map((id) => {
          const volts = formatMetricValue(components[id].voltage, "voltage");
          const amps = formatMetricValue(components[id].current, "current");
          const watts = formatMetricValue(components[id].watts, "watts");
          return `${id}: P = ${volts} × ${amps} = ${watts}`;
        }).join("\n");
        return {
          title: "Verify power per component",
          detail: detailLines,
          formula: "P = E × I",
        };
      },
    ],
  },
  // New Series Problems
  {
    id: "series-four-resistor-04",
    title: "Series Circuit · Four Resistor Chain",
    topology: "series",
    difficulty: "standard",
    prompt:
      "A series circuit has four resistors (R1 = 120 Ω, R2 = 180 Ω, R3 = 220 Ω, R4 = 80 Ω) connected to a 48 V power supply. Calculate all circuit values including current and individual voltage drops.",
    targetQuestion: "What is the voltage drop across R3?",
    targetMetric: { componentId: "R3", key: "voltage" },
    conceptTags: ["series", "ohms-law", "kvl", "voltage-divider"],
    diagram: "seriesRect",
    learningObjective: "Apply Ohm's Law and KVL to analyze a longer series chain with multiple voltage drops.",
    hints: [
      { text: "In series, resistances add directly", formula: "R_T = R_1 + R_2 + R_3 + R_4" },
      { text: "Same current flows through all four resistors", formula: "I_T = I_1 = I_2 = I_3 = I_4" },
      { text: "Voltage drop is proportional to resistance", formula: "V_x = I × R_x" },
    ],
    tips: [
      "The largest resistor (R3 = 220Ω) will have the largest voltage drop",
      "Check your work: all voltage drops should sum to 48V",
      "Current is constant throughout a series circuit",
    ],
    facts: [
      "Long series chains are used in LED strip lights where each LED needs a specific voltage",
      "Series resistance is the basis for voltage sensing in automotive systems",
    ],
    realWorldExample: "String lights with 4 bulbs in series - if one bulb is removed, the circuit opens and all lights go out.",
    source: {
      id: "supply",
      label: "Supply",
      role: "source",
      givens: { voltage: 48 },
      values: { voltage: 48 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 120 },
        values: { resistance: 120 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 180 },
        values: { resistance: 180 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 220 },
        values: { resistance: 220 },
      },
      {
        id: "R4",
        label: "R4",
        role: "load",
        givens: { resistance: 80 },
        values: { resistance: 80 },
      },
    ],
    network: {
      kind: "series",
      id: "series-four",
      children: SERIES_IDS_4.map((componentId) => ({ kind: "component", componentId })),
    },
    totalsGivens: {},
    presetHint: "series_four_resistor",
    steps: [
      ({ components, totals }) => {
        const sumLine = SERIES_IDS_4.map((id) => `${formatNumber(components[id].resistance, 0)}Ω`).join(" + ");
        return {
          title: "Sum all series resistances",
          detail: `R_T = ${sumLine} = ${formatMetricValue(totals.resistance, "resistance")}`,
          formula: "R_T = R_1 + R_2 + R_3 + R_4",
        };
      },
      ({ totals }) => ({
        title: "Calculate circuit current",
        detail: `I_T = E / R_T = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.resistance, "resistance")} = ${formatMetricValue(totals.current, "current")}`,
        formula: "I = E / R",
      }),
      ({ components, totals }) => {
        const detailLines = SERIES_IDS_4.map((id) => {
          const voltage = formatMetricValue(components[id].voltage, "voltage");
          const resistance = formatMetricValue(components[id].resistance, "resistance");
          return `${id}: V = I × R = ${formatMetricValue(totals.current, "current")} × ${resistance} = ${voltage}`;
        }).join("\n");
        return {
          title: "Calculate each voltage drop",
          detail: detailLines,
          formula: "V_x = I_T × R_x",
        };
      },
      ({ components }) => {
        const detailLines = SERIES_IDS_4.map((id) => {
          const volts = formatMetricValue(components[id].voltage, "voltage");
          const amps = formatMetricValue(components[id].current, "current");
          const watts = formatMetricValue(components[id].watts, "watts");
          return `${id}: P = ${volts} × ${amps} = ${watts}`;
        }).join("\n");
        return {
          title: "Verify power per resistor",
          detail: detailLines,
          formula: "P = E × I",
        };
      },
    ],
  },
  {
    id: "series-unknown-resistance-05",
    title: "Series Circuit · Missing Resistor Value",
    topology: "series",
    difficulty: "challenge",
    prompt:
      "A series circuit with two resistors (R1 = 330 Ω, R2 = unknown) is powered by an 18 V source. A meter reads 30 mA of current. Complete the W.I.R.E. table to find R2.",
    targetQuestion: "What is the resistance value of R2?",
    targetMetric: { componentId: "R2", key: "resistance" },
    conceptTags: ["series", "ohms-law", "problem-solving"],
    diagram: "seriesRect",
    learningObjective: "Solve for an unknown resistance using Ohm's Law and given current measurements.",
    hints: [
      { text: "First find total resistance using Ohm's Law", formula: "R_T = E / I" },
      { text: "Then subtract the known resistance", formula: "R_2 = R_T - R_1" },
      { text: "Convert mA to A: 30 mA = 0.030 A" },
    ],
    tips: [
      "Always convert milliamps (mA) to amps (A) before calculating",
      "Work backwards from measured current to find total R",
      "This technique is used for troubleshooting unknown components",
    ],
    facts: [
      "Technicians often measure current to diagnose resistor values in the field",
      "This reverse-engineering approach is fundamental to circuit troubleshooting",
    ],
    realWorldExample: "An HVAC technician measuring current flow to determine if a heating element has the correct resistance.",
    source: {
      id: "source",
      label: "Source",
      role: "source",
      givens: { voltage: 18 },
      values: { voltage: 18 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 330 },
        values: { resistance: 330 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: {},
        values: { resistance: 270 },
      },
    ],
    network: {
      kind: "series",
      id: "series-unknown",
      children: SERIES_IDS_2.map((componentId) => ({ kind: "component", componentId })),
    },
    totalsGivens: { current: 0.03 },
    presetHint: "series_unknown_resistance",
    steps: [
      ({ totals }) => ({
        title: "Calculate total resistance from given current",
        detail: `R_T = E / I = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.current, "current")} = ${formatMetricValue(totals.resistance, "resistance")}`,
        formula: "R = E / I",
      }),
      ({ components, totals }) => ({
        title: "Find R2 by subtracting R1",
        detail: `R_2 = R_T - R_1 = ${formatMetricValue(totals.resistance, "resistance")} - ${formatMetricValue(components.R1.resistance, "resistance")} = ${formatMetricValue(components.R2.resistance, "resistance")}`,
        formula: "R_2 = R_T - R_1",
      }),
      ({ components, totals }) => {
        const detailLines = SERIES_IDS_2.map((id) => {
          const voltage = formatMetricValue(components[id].voltage, "voltage");
          const resistance = formatMetricValue(components[id].resistance, "resistance");
          return `${id}: V = I × R = ${formatMetricValue(totals.current, "current")} × ${resistance} = ${voltage}`;
        }).join("\n");
        return {
          title: "Calculate voltage drops to verify",
          detail: detailLines,
          formula: "V = I × R",
        };
      },
      ({ components }) => {
        const detailLines = SERIES_IDS_2.map((id) => {
          const volts = formatMetricValue(components[id].voltage, "voltage");
          const amps = formatMetricValue(components[id].current, "current");
          const watts = formatMetricValue(components[id].watts, "watts");
          return `${id}: P = ${volts} × ${amps} = ${watts}`;
        }).join("\n");
        return {
          title: "Calculate power dissipation",
          detail: detailLines,
          formula: "P = E × I",
        };
      },
    ],
  },
  {
    id: "series-led-resistor-06",
    title: "Series Circuit · LED Current Limiting",
    topology: "series",
    difficulty: "intro",
    prompt:
      "An LED (which drops 2V when lit) is in series with a current-limiting resistor (R1 = 220 Ω) connected to a 9V battery. Calculate the current flowing through the LED and the power dissipated by the resistor.",
    targetQuestion: "What current flows through the LED and resistor?",
    targetMetric: { componentId: "totals", key: "current" },
    conceptTags: ["series", "ohms-law", "led", "practical"],
    diagram: "seriesRect",
    learningObjective: "Understand how current-limiting resistors protect LEDs in series circuits.",
    hints: [
      { text: "The LED acts like a fixed 2V drop", formula: "V_{resistor} = V_{source} - V_{LED}" },
      { text: "Current through resistor = Current through LED (series circuit)" },
      { text: "Use voltage across resistor to find current", formula: "I = V_{R1} / R_1" },
    ],
    tips: [
      "LEDs have a forward voltage drop (typically 1.8V - 3.3V depending on color)",
      "The resistor protects the LED by limiting current flow",
      "Too much current will burn out the LED instantly",
    ],
    facts: [
      "Red LEDs typically drop 1.8-2V, while blue/white LEDs drop 3-3.3V",
      "This circuit is the basis for nearly every LED indicator light in electronics",
    ],
    realWorldExample: "The power indicator light on your TV or computer monitor uses exactly this circuit - an LED in series with a resistor.",
    source: {
      id: "battery",
      label: "Battery",
      role: "source",
      givens: { voltage: 9 },
      values: { voltage: 9 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 220 },
        values: { resistance: 220 },
      },
      {
        id: "R2",
        label: "LED",
        role: "load",
        givens: { voltage: 2 },
        values: { resistance: 62.86, voltage: 2 },
      },
    ],
    network: {
      kind: "series",
      id: "series-led",
      children: SERIES_IDS_2.map((componentId) => ({ kind: "component", componentId })),
    },
    totalsGivens: {},
    presetHint: "series_led_resistor",
    steps: [
      ({ components, totals }) => ({
        title: "Find voltage across the resistor",
        detail: `V_{R1} = V_{source} - V_{LED} = ${formatMetricValue(totals.voltage, "voltage")} - ${formatMetricValue(components.R2.voltage, "voltage")} = ${formatMetricValue(components.R1.voltage, "voltage")}`,
        formula: "V_{R1} = E_T - V_{LED}",
      }),
      ({ components }) => ({
        title: "Calculate current through circuit",
        detail: `I = V_{R1} / R_1 = ${formatMetricValue(components.R1.voltage, "voltage")} ÷ ${formatMetricValue(components.R1.resistance, "resistance")} = ${formatMetricValue(components.R1.current, "current")}`,
        formula: "I = V / R",
      }),
      ({ components }) => ({
        title: "Power dissipated by resistor",
        detail: `P_{R1} = V_{R1} × I = ${formatMetricValue(components.R1.voltage, "voltage")} × ${formatMetricValue(components.R1.current, "current")} = ${formatMetricValue(components.R1.watts, "watts")}`,
        formula: "P = V × I",
      }),
      ({ components }) => ({
        title: "Power consumed by LED",
        detail: `P_{LED} = V_{LED} × I = ${formatMetricValue(components.R2.voltage, "voltage")} × ${formatMetricValue(components.R2.current, "current")} = ${formatMetricValue(components.R2.watts, "watts")}`,
        formula: "P = V × I",
      }),
    ],
  },
  {
    id: "parallel-square-02",
    title: "Parallel Circuit · Branch Currents",
    topology: "parallel",
    difficulty: "standard",
      prompt:
        "A parallel circuit has three resistors (R1 = 180 Ω, R2 = 90 Ω, R3 = 270 Ω) connected across an 18 V DC power supply. Complete the W.I.R.E. worksheet to solve for all component values and circuit totals.",
    targetQuestion: "What is the total equivalent resistance of the three parallel branches?",
    targetMetric: { componentId: "totals", key: "resistance" },
    conceptTags: ["parallel", "kirchhoff", "ohms-law"],
    diagram: "parallelRect",
    source: {
      id: "supply",
      label: "DC Supply",
      role: "source",
      givens: { voltage: 18 },
      values: { voltage: 18 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 180 },
        values: { resistance: 180 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 90 },
        values: { resistance: 90 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 270 },
        values: { resistance: 270 },
      },
    ],
    network: {
      kind: "parallel",
      id: "parallel-square",
      children: ["R1", "R2", "R3"].map((componentId) => ({ kind: "component", componentId })),
    },
    totalsGivens: {},
    presetHint: "parallel_basic",
    steps: [
      ({ components, totals }) => {
        const recipLine = ["R1", "R2", "R3"].map((id) => `1/${formatNumber(components[id].resistance, 0)}Ω`).join(" + ");
        return {
          title: "Apply the reciprocal formula",
          detail: `1/R_T = ${recipLine} = ${formatNumber(1 / totals.resistance, 4)} Ω⁻¹`,
          formula: "1 / R_T = 1 / R_1 + 1 / R_2 + 1 / R_3",
        };
      },
      ({ totals }) => ({
        title: "Invert to find R_T",
        detail: `R_T = 1 / (1/R_T) = ${formatMetricValue(totals.resistance, "resistance")}`,
        formula: "R_T = 1 / (Σ 1/R)",
      }),
      ({ components }) => {
        const detailLines = ["R1", "R2", "R3"].map((id) => {
          const amps = formatMetricValue(components[id].current, "current");
          const volts = formatMetricValue(components[id].voltage, "voltage");
          const resistance = formatMetricValue(components[id].resistance, "resistance");
          return `${id}: I = E / R = ${volts} ÷ ${resistance} = ${amps}`;
        }).join("\n");
        return {
          title: "Solve each branch current",
          detail: detailLines,
          formula: "I_x = E / R_x",
        };
      },
      ({ components, totals }) => {
        const branchSum = ["R1", "R2", "R3"].map((id) => formatMetricValue(components[id].current, "current")).join(" + ");
        return {
          title: "Apply Kirchhoff's Current Law",
          detail: `I_T = ${branchSum} = ${formatMetricValue(totals.current, "current")}`,
          formula: "I_T = Σ I_{branch}",
        };
      },
    ],
  },
  {
    id: "parallel-total-current-02",
    title: "Parallel Circuit · Total Current",
    topology: "parallel",
    difficulty: "intro",
    prompt:
      "Two resistors (R1 = 100 Ω, R2 = 200 Ω) are connected in parallel across a 24 V supply. Use Kirchhoff's Current Law to find all branch and total currents.",
    targetQuestion: "What is the total current drawn from the supply?",
    targetMetric: { componentId: "totals", key: "current" },
    conceptTags: ["parallel", "kcl", "ohms-law"],
    diagram: "parallelRect",
    learningObjective: "Apply Kirchhoff's Current Law to calculate total current in a parallel circuit.",
    hints: [
      { text: "In parallel, voltage is the same across all branches" },
      { text: "Calculate each branch current using Ohm's Law", formula: "I = E / R" },
      { text: "Total current equals the sum of all branch currents", formula: "I_T = I_1 + I_2" },
    ],
    tips: [
      "Parallel circuits: voltage same, currents add",
      "Lower resistance = higher current (more current takes the 'easier' path)",
      "Total resistance is always less than the smallest branch resistance",
    ],
    facts: [
      "Household electrical outlets are wired in parallel - each device gets full voltage",
      "Parallel circuits provide redundancy: if one branch fails, others continue working",
    ],
    realWorldExample: "Your home's electrical outlets are in parallel. A 100W bulb and a 60W bulb can both operate at full brightness simultaneously.",
    source: {
      id: "supply",
      label: "Supply",
      role: "source",
      givens: { voltage: 24 },
      values: { voltage: 24 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 100 },
        values: { resistance: 100 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 200 },
        values: { resistance: 200 },
      },
    ],
    network: {
      kind: "parallel",
      id: "parallel-current",
      children: SERIES_IDS_2.map((componentId) => ({ kind: "component", componentId })),
    },
    totalsGivens: {},
    presetHint: "parallel_current",
    steps: [
      ({ components }) => {
        const detailLines = SERIES_IDS_2.map((id) => {
          const amps = formatMetricValue(components[id].current, "current");
          const volts = formatMetricValue(components[id].voltage, "voltage");
          const resistance = formatMetricValue(components[id].resistance, "resistance");
          return `${id}: I = E / R = ${volts} ÷ ${resistance} = ${amps}`;
        }).join("\n");
        return {
          title: "Calculate each branch current",
          detail: detailLines,
          formula: "I = E / R",
        };
      },
      ({ components, totals }) => {
        const branchSum = SERIES_IDS_2.map((id) => formatMetricValue(components[id].current, "current")).join(" + ");
        return {
          title: "Apply Kirchhoff's Current Law (KCL)",
          detail: `I_T = ${branchSum} = ${formatMetricValue(totals.current, "current")}`,
          formula: "I_T = I_1 + I_2",
        };
      },
      ({ components, totals }) => {
        const recipLine = SERIES_IDS_2.map((id) => `1/${formatNumber(components[id].resistance, 0)}Ω`).join(" + ");
        return {
          title: "Calculate equivalent resistance",
          detail: `1/R_T = ${recipLine}\nR_T = ${formatMetricValue(totals.resistance, "resistance")}`,
          formula: "1/R_T = 1/R_1 + 1/R_2",
        };
      },
      ({ components }) => {
        const detailLines = SERIES_IDS_2.map((id) => {
          const volts = formatMetricValue(components[id].voltage, "voltage");
          const amps = formatMetricValue(components[id].current, "current");
          const watts = formatMetricValue(components[id].watts, "watts");
          return `${id}: P = ${volts} × ${amps} = ${watts}`;
        }).join("\n");
        return {
          title: "Calculate power per branch",
          detail: detailLines,
          formula: "P = E × I",
        };
      },
    ],
  },
  {
    id: "parallel-voltage-drop-07",
    title: "Parallel Circuit · Voltage Drop (Branches)",
    topology: "parallel",
    difficulty: "intro",
    prompt:
      "Three resistors (R1 = 220 Ω, R2 = 330 Ω, R3 = 470 Ω) are connected in parallel across a 12 V source. Complete the W.I.R.E. table for all branch and total values.",
    targetQuestion: "What is the voltage drop across R2?",
    targetMetric: { componentId: "R2", key: "voltage" },
    conceptTags: ["parallel", "voltage-drop", "kvl", "ohms-law"],
    diagram: "parallelRect",
    learningObjective: "Recognize that voltage is the same across all parallel branches and use it to solve branch currents.",
    hints: [
      { text: "In a parallel circuit, each branch has the same voltage as the source", formula: "E_1 = E_2 = E_3 = E_T" },
      { text: "Use Ohm's Law to find each branch current", formula: "I_x = E / R_x" },
      { text: "Total current is the sum of branch currents (KCL)", formula: "I_T = I_1 + I_2 + I_3" },
    ],
    tips: [
      "Parallel circuits keep voltage constant across each branch",
      "Lower resistance branches draw higher current",
      "Check: equivalent resistance must be less than the smallest branch resistance",
    ],
    facts: [
      "Parallel wiring is used for household circuits so every device receives full line voltage",
    ],
    realWorldExample: "A power strip: each outlet is a parallel branch with the same supply voltage.",
    source: {
      id: "supply",
      label: "Supply",
      role: "source",
      givens: { voltage: 12 },
      values: { voltage: 12 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 220 },
        values: { resistance: 220 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 330 },
        values: { resistance: 330 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 470 },
        values: { resistance: 470 },
      },
    ],
    network: {
      kind: "parallel",
      id: "parallel-voltage-drop",
      children: ["R1", "R2", "R3"].map((componentId) => ({
        kind: "component",
        componentId,
      })),
    },
    totalsGivens: {},
    presetHint: "parallel_voltage_drop",
    steps: [
      ({ components, totals }) => ({
        title: "Set branch voltages (parallel rule)",
        detail: `E_1 = E_2 = E_3 = E_T = ${formatMetricValue(totals.voltage, "voltage")}\nR2 voltage is therefore ${formatMetricValue(components.R2.voltage, "voltage")}`,
        formula: "E_{branch} = E_T",
      }),
      ({ components }) => {
        const detailLines = ["R1", "R2", "R3"]
          .map((id) => {
            const amps = formatMetricValue(components[id].current, "current");
            const volts = formatMetricValue(components[id].voltage, "voltage");
            const resistance = formatMetricValue(
              components[id].resistance,
              "resistance",
            );
            return `${id}: I = E / R = ${volts} ÷ ${resistance} = ${amps}`;
          })
          .join("\n");
        return {
          title: "Solve each branch current",
          detail: detailLines,
          formula: "I_x = E / R_x",
        };
      },
      ({ components, totals }) => {
        const branchSum = ["R1", "R2", "R3"]
          .map((id) => formatMetricValue(components[id].current, "current"))
          .join(" + ");
        return {
          title: "Apply KCL for total current",
          detail: `I_T = ${branchSum} = ${formatMetricValue(totals.current, "current")}`,
          formula: "I_T = Σ I_{branch}",
        };
      },
      ({ totals }) => ({
        title: "Verify equivalent resistance",
        detail: `R_T = E_T / I_T = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.current, "current")} = ${formatMetricValue(totals.resistance, "resistance")}`,
        formula: "R = E / I",
      }),
    ],
  },
  {
    id: "parallel-power-03",
    title: "Parallel Circuit · Power Distribution",
    topology: "parallel",
    difficulty: "challenge",
    prompt:
      "Three resistors (R1 = 120 Ω, R2 = 240 Ω, R3 = 60 Ω) are connected in parallel to a 30 V source. Determine the power dissipated by each resistor and the total circuit power.",
    targetQuestion: "What is the total power consumed by the circuit?",
    targetMetric: { componentId: "totals", key: "watts" },
    conceptTags: ["parallel", "power", "kcl"],
    diagram: "parallelRect",
    source: {
      id: "source",
      label: "Source",
      role: "source",
      givens: { voltage: 30 },
      values: { voltage: 30 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 120 },
        values: { resistance: 120 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 240 },
        values: { resistance: 240 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 60 },
        values: { resistance: 60 },
      },
    ],
    network: {
      kind: "parallel",
      id: "parallel-power",
      children: SERIES_IDS.map((componentId) => ({ kind: "component", componentId })),
    },
    totalsGivens: {},
    presetHint: "parallel_power",
    steps: [
      ({ components }) => {
        const detailLines = SERIES_IDS.map((id) => {
          const amps = formatMetricValue(components[id].current, "current");
          const volts = formatMetricValue(components[id].voltage, "voltage");
          const resistance = formatMetricValue(components[id].resistance, "resistance");
          return `${id}: I = E / R = ${volts} ÷ ${resistance} = ${amps}`;
        }).join("\n");
        return {
          title: "Calculate branch currents",
          detail: detailLines,
          formula: "I = E / R",
        };
      },
      ({ components }) => {
        const detailLines = SERIES_IDS.map((id) => {
          const volts = formatMetricValue(components[id].voltage, "voltage");
          const amps = formatMetricValue(components[id].current, "current");
          const watts = formatMetricValue(components[id].watts, "watts");
          return `${id}: P = ${volts} × ${amps} = ${watts}`;
        }).join("\n");
        return {
          title: "Calculate power per branch",
          detail: detailLines,
          formula: "P = E × I",
        };
      },
      ({ components, totals }) => {
        const powerSum = SERIES_IDS.map((id) => formatMetricValue(components[id].watts, "watts")).join(" + ");
        return {
          title: "Sum total power",
          detail: `P_T = ${powerSum} = ${formatMetricValue(totals.watts, "watts")}`,
          formula: "P_T = P_1 + P_2 + P_3",
        };
      },
      ({ components, totals }) => {
        const recipLine = SERIES_IDS.map((id) => `1/${formatNumber(components[id].resistance, 0)}Ω`).join(" + ");
        return {
          title: "Verify with equivalent resistance",
          detail: `R_T = 1/(${recipLine}) = ${formatMetricValue(totals.resistance, "resistance")}\nP_T = E²/R_T = ${formatMetricValue(totals.watts, "watts")}`,
          formula: "P = E² / R",
        };
      },
    ],
  },
  // New Parallel Problems
  {
    id: "parallel-four-branch-04",
    title: "Parallel Circuit · Four Branch Network",
    topology: "parallel",
    difficulty: "standard",
    prompt:
      "Four resistors (R1 = 200 Ω, R2 = 400 Ω, R3 = 100 Ω, R4 = 800 Ω) are connected in parallel across a 20 V source. Calculate the equivalent resistance and all branch currents.",
    targetQuestion: "What is the current through R3 (the lowest resistance branch)?",
    targetMetric: { componentId: "R3", key: "current" },
    conceptTags: ["parallel", "kcl", "ohms-law", "equivalent-resistance"],
    diagram: "parallelRect",
    learningObjective: "Apply parallel resistance formulas and KCL to a four-branch parallel network.",
    hints: [
      { text: "Each branch has the same voltage (20V)", formula: "V_1 = V_2 = V_3 = V_4 = E_T" },
      { text: "Lower resistance = higher current", formula: "I = E / R" },
      { text: "For multiple parallel resistors", formula: "1/R_T = 1/R_1 + 1/R_2 + 1/R_3 + 1/R_4" },
    ],
    tips: [
      "R3 at 100Ω is the smallest, so it carries the most current",
      "Equivalent resistance will be less than the smallest individual resistance (100Ω)",
      "Total current equals sum of all branch currents",
    ],
    facts: [
      "Parallel circuits are used in power distribution to provide redundancy",
      "If one branch fails in a parallel circuit, others continue to work",
    ],
    realWorldExample: "A power strip with multiple outlets - each device is a parallel branch, all getting the same 120V.",
    source: {
      id: "supply",
      label: "Supply",
      role: "source",
      givens: { voltage: 20 },
      values: { voltage: 20 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 200 },
        values: { resistance: 200 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 400 },
        values: { resistance: 400 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 100 },
        values: { resistance: 100 },
      },
      {
        id: "R4",
        label: "R4",
        role: "load",
        givens: { resistance: 800 },
        values: { resistance: 800 },
      },
    ],
    network: {
      kind: "parallel",
      id: "parallel-four",
      children: SERIES_IDS_4.map((componentId) => ({ kind: "component", componentId })),
    },
    totalsGivens: {},
    presetHint: "parallel_four_branch",
    steps: [
      ({ components, totals }) => {
        const recipLine = SERIES_IDS_4.map((id) => `1/${formatNumber(components[id].resistance, 0)}Ω`).join(" + ");
        return {
          title: "Apply parallel resistance formula",
          detail: `1/R_T = ${recipLine} = ${formatNumber(1 / totals.resistance, 5)} Ω⁻¹`,
          formula: "1/R_T = 1/R_1 + 1/R_2 + 1/R_3 + 1/R_4",
        };
      },
      ({ totals }) => ({
        title: "Calculate equivalent resistance",
        detail: `R_T = ${formatMetricValue(totals.resistance, "resistance")}`,
        formula: "R_T = 1 / (Σ 1/R)",
      }),
      ({ components }) => {
        const detailLines = SERIES_IDS_4.map((id) => {
          const amps = formatMetricValue(components[id].current, "current");
          const volts = formatMetricValue(components[id].voltage, "voltage");
          const resistance = formatMetricValue(components[id].resistance, "resistance");
          return `${id}: I = E / R = ${volts} ÷ ${resistance} = ${amps}`;
        }).join("\n");
        return {
          title: "Calculate each branch current",
          detail: detailLines,
          formula: "I_x = E / R_x",
        };
      },
      ({ components, totals }) => {
        const branchSum = SERIES_IDS_4.map((id) => formatMetricValue(components[id].current, "current")).join(" + ");
        return {
          title: "Verify total current (KCL)",
          detail: `I_T = ${branchSum} = ${formatMetricValue(totals.current, "current")}`,
          formula: "I_T = Σ I_{branch}",
        };
      },
    ],
  },
  {
    id: "parallel-equal-resistors-05",
    title: "Parallel Circuit · Equal Resistors",
    topology: "parallel",
    difficulty: "intro",
    prompt:
      "Three identical 150 Ω resistors are connected in parallel across a 12 V battery. Find the equivalent resistance, total current, and current through each resistor.",
    targetQuestion: "What is the equivalent resistance of the three parallel resistors?",
    targetMetric: { componentId: "totals", key: "resistance" },
    conceptTags: ["parallel", "equivalent-resistance", "ohms-law"],
    diagram: "parallelRect",
    learningObjective: "Apply the shortcut formula for equal parallel resistors: R_T = R / n",
    hints: [
      { text: "For n equal resistors in parallel", formula: "R_T = R / n" },
      { text: "With 3 equal 150Ω resistors", formula: "R_T = 150Ω / 3 = 50Ω" },
      { text: "Current splits equally through identical resistors" },
    ],
    tips: [
      "Equal resistors make the math easy: divide by the number of branches",
      "Each branch carries exactly 1/3 of the total current",
      "This shortcut only works when ALL resistors are equal",
    ],
    facts: [
      "Parallel equal resistors are common in power resistor banks for heat distribution",
      "Computer cooling fans are often wired in parallel for redundancy",
    ],
    realWorldExample: "Three identical speakers connected in parallel to an amplifier - each gets equal current and produces equal volume.",
    source: {
      id: "battery",
      label: "Battery",
      role: "source",
      givens: { voltage: 12 },
      values: { voltage: 12 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 150 },
        values: { resistance: 150 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 150 },
        values: { resistance: 150 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 150 },
        values: { resistance: 150 },
      },
    ],
    network: {
      kind: "parallel",
      id: "parallel-equal",
      children: SERIES_IDS.map((componentId) => ({ kind: "component", componentId })),
    },
    totalsGivens: {},
    presetHint: "parallel_equal_resistors",
    steps: [
      ({ components, totals }) => ({
        title: "Apply equal resistors shortcut",
        detail: `R_T = R / n = ${formatNumber(components.R1.resistance, 0)}Ω / 3 = ${formatMetricValue(totals.resistance, "resistance")}`,
        formula: "R_T = R / n (for n equal resistors)",
      }),
      ({ totals }) => ({
        title: "Calculate total current",
        detail: `I_T = E / R_T = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.resistance, "resistance")} = ${formatMetricValue(totals.current, "current")}`,
        formula: "I = E / R",
      }),
      ({ components, totals }) => ({
        title: "Current per branch (equal split)",
        detail: `I_{each} = I_T / 3 = ${formatMetricValue(totals.current, "current")} / 3 = ${formatMetricValue(components.R1.current, "current")}`,
        formula: "I_x = I_T / n",
      }),
      ({ components }) => {
        const detailLines = SERIES_IDS.map((id) => {
          const volts = formatMetricValue(components[id].voltage, "voltage");
          const amps = formatMetricValue(components[id].current, "current");
          const watts = formatMetricValue(components[id].watts, "watts");
          return `${id}: P = ${volts} × ${amps} = ${watts}`;
        }).join("\n");
        return {
          title: "Power per resistor",
          detail: detailLines,
          formula: "P = E × I",
        };
      },
    ],
  },
  {
    id: "parallel-product-sum-06",
    title: "Parallel Circuit · Product Over Sum",
    topology: "parallel",
    difficulty: "challenge",
    prompt:
      "Two resistors (R1 = 470 Ω, R2 = 330 Ω) are connected in parallel to a 15 V supply. Use the product-over-sum formula to find equivalent resistance, then calculate all circuit values.",
    targetQuestion: "What is the total power consumed by both resistors?",
    targetMetric: { componentId: "totals", key: "watts" },
    conceptTags: ["parallel", "power", "ohms-law", "product-over-sum"],
    diagram: "parallelRect",
    learningObjective: "Master the product-over-sum shortcut for two parallel resistors.",
    hints: [
      { text: "For exactly two parallel resistors", formula: "R_T = (R_1 × R_2) / (R_1 + R_2)" },
      { text: "Product: 470 × 330 = 155,100" },
      { text: "Sum: 470 + 330 = 800" },
    ],
    tips: [
      "Product-over-sum only works for TWO resistors",
      "For more than two, use the reciprocal formula",
      "The result will be less than either individual resistor",
    ],
    facts: [
      "The product-over-sum formula is derived from the reciprocal formula",
      "This shortcut saves calculation time in exam situations",
    ],
    realWorldExample: "Two heating elements in a toaster wired in parallel - both produce heat simultaneously for faster toasting.",
    source: {
      id: "supply",
      label: "Supply",
      role: "source",
      givens: { voltage: 15 },
      values: { voltage: 15 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 470 },
        values: { resistance: 470 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 330 },
        values: { resistance: 330 },
      },
    ],
    network: {
      kind: "parallel",
      id: "parallel-product-sum",
      children: SERIES_IDS_2.map((componentId) => ({ kind: "component", componentId })),
    },
    totalsGivens: {},
    presetHint: "parallel_product_sum",
    steps: [
      ({ components, totals }) => ({
        title: "Apply product-over-sum formula",
        detail: `R_T = (R_1 × R_2) / (R_1 + R_2) = (${formatNumber(components.R1.resistance, 0)} × ${formatNumber(components.R2.resistance, 0)}) / (${formatNumber(components.R1.resistance, 0)} + ${formatNumber(components.R2.resistance, 0)}) = ${formatMetricValue(totals.resistance, "resistance")}`,
        formula: "R_T = (R_1 × R_2) / (R_1 + R_2)",
      }),
      ({ totals }) => ({
        title: "Calculate total current",
        detail: `I_T = E / R_T = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.resistance, "resistance")} = ${formatMetricValue(totals.current, "current")}`,
        formula: "I = E / R",
      }),
      ({ components }) => {
        const detailLines = SERIES_IDS_2.map((id) => {
          const amps = formatMetricValue(components[id].current, "current");
          const volts = formatMetricValue(components[id].voltage, "voltage");
          const resistance = formatMetricValue(components[id].resistance, "resistance");
          return `${id}: I = E / R = ${volts} ÷ ${resistance} = ${amps}`;
        }).join("\n");
        return {
          title: "Calculate branch currents",
          detail: detailLines,
          formula: "I_x = E / R_x",
        };
      },
      ({ components, totals }) => {
        const powerSum = SERIES_IDS_2.map((id) => formatMetricValue(components[id].watts, "watts")).join(" + ");
        return {
          title: "Calculate total power",
          detail: `P_T = P_1 + P_2 = ${powerSum} = ${formatMetricValue(totals.watts, "watts")}`,
          formula: "P_T = Σ P_{branch}",
        };
      },
    ],
  },
  {
    id: "combo-square-03",
    title: "Combination Circuit · Ladder Solve",
    topology: "combination",
    difficulty: "challenge",
      prompt:
        "A combination circuit is powered by a 30 V source and consists of R1 = 100 Ω in series with a parallel branch (R2 = 150 Ω parallel to R3 = 300 Ω), followed by R4 = 75 Ω returning to the source. Use the W.I.R.E. table method to solve for all component values and circuit totals.",
    targetQuestion: "What current flows through resistor R2?",
    targetMetric: { componentId: "R2", key: "current" },
    conceptTags: ["combination", "series", "parallel", "ohms-law", "kirchhoff"],
    diagram: "comboRect",
    source: {
      id: "source",
      label: "Source",
      role: "source",
      givens: { voltage: 30 },
      values: { voltage: 30 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 100 },
        values: { resistance: 100 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 150 },
        values: { resistance: 150 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 300 },
        values: { resistance: 300 },
      },
      {
        id: "R4",
        label: "R4",
        role: "load",
        givens: { resistance: 75 },
        values: { resistance: 75 },
      },
    ],
    network: {
      kind: "series",
      id: "combo-square",
      children: [
        { kind: "component", componentId: "R1" },
        {
          kind: "parallel",
          id: "combo-parallel",
          children: [
            { kind: "component", componentId: "R2" },
            { kind: "component", componentId: "R3" },
          ],
        },
        { kind: "component", componentId: "R4" },
      ],
    },
    totalsGivens: {},
    presetHint: "mixed_circuit",
    steps: [
      ({ components }) => {
        const reciprocal = 1 / components.R2.resistance + 1 / components.R3.resistance;
        const equivalent = 1 / reciprocal;
        return {
          title: "Collapse the parallel branch",
          detail: `R_{2||3} = 1 / (1/${formatNumber(components.R2.resistance, 0)}Ω + 1/${formatNumber(components.R3.resistance, 0)}Ω) = ${formatNumber(equivalent, 2)} Ω`,
          formula: "R_{eq} = 1 / (1/R_2 + 1/R_3)",
        };
      },
      ({ components, totals }) => {
        const branchResistance = 1 / (1 / components.R2.resistance + 1 / components.R3.resistance);
        return {
          title: "Add the series legs",
          detail: `R_T = ${formatNumber(components.R1.resistance, 0)}Ω + ${formatNumber(branchResistance, 2)}Ω + ${formatNumber(components.R4.resistance, 0)}Ω = ${formatMetricValue(totals.resistance, "resistance")}`,
          formula: "R_T = R1 + R_{branch} + R4",
        };
      },
      ({ totals }) => ({
        title: "Solve for source current",
        detail: `I_T = E / R_T = ${formatMetricValue(totals.current, "current")}`,
        formula: "I = E / R",
      }),
      ({ components, totals }) => {
        const vR1 = formatMetricValue(components.R1.voltage, "voltage");
        const vBranch = formatMetricValue(components.R2.voltage, "voltage");
        const vR4 = formatMetricValue(components.R4.voltage, "voltage");
        return {
          title: "Track voltage drops",
          detail: `E_T = ${formatMetricValue(totals.voltage, "voltage")} = ${vR1} + ${vBranch} + ${vR4}`,
          formula: "KVL around the loop",
        };
      },
      ({ components }) => {
        return {
          title: "Split branch currents",
          detail: `I_{R2} = ${formatMetricValue(components.R2.current, "current")}, I_{R3} = ${formatMetricValue(components.R3.current, "current")}`,
          formula: "I_{branch} = E_{branch} / R_{branch}",
        };
      },
    ],
  },
  {
    id: "combo-series-parallel-02",
    title: "Combination Circuit · Series-Parallel",
    topology: "combination",
    difficulty: "standard",
    prompt:
      "A circuit has R1 = 200 Ω in series with a parallel combination of R2 = 300 Ω and R3 = 600 Ω. The circuit is connected to a 24 V source. Find all circuit values using the W.I.R.E. method.",
    targetQuestion: "What is the voltage drop across the parallel branch (R2 and R3)?",
    targetMetric: { componentId: "R2", key: "voltage" },
    conceptTags: ["combination", "kvl", "voltage-divider"],
    diagram: "comboRect",
    source: {
      id: "source",
      label: "Source",
      role: "source",
      givens: { voltage: 24 },
      values: { voltage: 24 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 200 },
        values: { resistance: 200 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 300 },
        values: { resistance: 300 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 600 },
        values: { resistance: 600 },
      },
    ],
    network: {
      kind: "series",
      id: "combo-sp",
      children: [
        { kind: "component", componentId: "R1" },
        {
          kind: "parallel",
          id: "combo-sp-parallel",
          children: [
            { kind: "component", componentId: "R2" },
            { kind: "component", componentId: "R3" },
          ],
        },
      ],
    },
    totalsGivens: {},
    presetHint: "combo_sp",
    steps: [
      ({ components }) => {
        const reciprocal = 1 / components.R2.resistance + 1 / components.R3.resistance;
        const equivalent = 1 / reciprocal;
        return {
          title: "Find parallel equivalent",
          detail: `R_{2||3} = 1 / (1/${formatNumber(components.R2.resistance, 0)}Ω + 1/${formatNumber(components.R3.resistance, 0)}Ω) = ${formatNumber(equivalent, 2)} Ω`,
          formula: "R_{eq} = 1 / (1/R_2 + 1/R_3)",
        };
      },
      ({ components, totals }) => {
        const branchResistance = 1 / (1 / components.R2.resistance + 1 / components.R3.resistance);
        return {
          title: "Calculate total resistance",
          detail: `R_T = R1 + R_{2||3} = ${formatNumber(components.R1.resistance, 0)}Ω + ${formatNumber(branchResistance, 2)}Ω = ${formatMetricValue(totals.resistance, "resistance")}`,
          formula: "R_T = R1 + R_{eq}",
        };
      },
      ({ totals }) => ({
        title: "Find total current",
        detail: `I_T = E / R_T = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.resistance, "resistance")} = ${formatMetricValue(totals.current, "current")}`,
        formula: "I = E / R",
      }),
      ({ components, totals }) => {
        const vR1 = formatMetricValue(components.R1.voltage, "voltage");
        const vBranch = formatMetricValue(components.R2.voltage, "voltage");
        return {
          title: "Apply KVL for voltage drops",
          detail: `V_{R1} = I_T × R1 = ${vR1}\nV_{branch} = E_T - V_{R1} = ${formatMetricValue(totals.voltage, "voltage")} - ${vR1} = ${vBranch}`,
          formula: "E_T = V_{R1} + V_{branch}",
        };
      },
    ],
  },
  {
    id: "combo-series-voltage-drop-07",
    title: "Combination Circuit · Series Voltage Drop",
    topology: "combination",
    difficulty: "standard",
    prompt:
      "A circuit has R1 = 120 Ω in series with a parallel branch of R2 = 180 Ω and R3 = 360 Ω. The circuit is connected to a 24 V source. Solve for all W.I.R.E. values.",
    targetQuestion: "What is the voltage drop across the series resistor R1?",
    targetMetric: { componentId: "R1", key: "voltage" },
    conceptTags: ["combination", "voltage-drop", "kvl", "ohms-law", "equivalent-resistance"],
    diagram: "comboRect",
    learningObjective: "Collapse a parallel branch to an equivalent resistance, then use KVL to find the series voltage drop.",
    hints: [
      { text: "First replace the parallel branch with an equivalent resistor", formula: "R_{2||3} = 1 / (1/R_2 + 1/R_3)" },
      { text: "Series resistances add", formula: "R_T = R_1 + R_{2||3}" },
      { text: "The same total current flows through R1 (series element)", formula: "I_{R1} = I_T" },
    ],
    tips: [
      "Solve inside-out: collapse parallel first, then treat as series",
      "After you have I_T, compute V_R1 with V = I × R",
    ],
    facts: [
      "Series-parallel reduction is the fastest method for many textbook DC resistor networks.",
    ],
    realWorldExample:
      "A protection resistor in series with multiple parallel sensor elements can drop voltage before the current splits.",
    source: {
      id: "source",
      label: "Source",
      role: "source",
      givens: { voltage: 24 },
      values: { voltage: 24 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 120 },
        values: { resistance: 120 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 180 },
        values: { resistance: 180 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 360 },
        values: { resistance: 360 },
      },
    ],
    network: {
      kind: "series",
      id: "combo-series-vdrop",
      children: [
        { kind: "component", componentId: "R1" },
        {
          kind: "parallel",
          id: "combo-series-vdrop-parallel",
          children: [
            { kind: "component", componentId: "R2" },
            { kind: "component", componentId: "R3" },
          ],
        },
      ],
    },
    totalsGivens: {},
    presetHint: "combo_series_voltage_drop",
    steps: [
      ({ components }) => {
        const reciprocal =
          1 / components.R2.resistance + 1 / components.R3.resistance;
        const equivalent = 1 / reciprocal;
        return {
          title: "Collapse the parallel branch",
          detail: `R_{2||3} = 1 / (1/${formatNumber(
            components.R2.resistance,
            0,
          )}Ω + 1/${formatNumber(components.R3.resistance, 0)}Ω) = ${formatNumber(
            equivalent,
            2,
          )} Ω`,
          formula: "R_{eq} = 1 / (1/R_2 + 1/R_3)",
        };
      },
      ({ totals }) => ({
        title: "Compute total current",
        detail: `I_T = E_T / R_T = ${formatMetricValue(
          totals.voltage,
          "voltage",
        )} ÷ ${formatMetricValue(totals.resistance, "resistance")} = ${formatMetricValue(
          totals.current,
          "current",
        )}`,
        formula: "I = E / R",
      }),
      ({ components, totals }) => ({
        title: "Find the series voltage drop across R1",
        detail: `V_{R1} = I_T × R1 = ${formatMetricValue(
          totals.current,
          "current",
        )} × ${formatMetricValue(components.R1.resistance, "resistance")} = ${formatMetricValue(
          components.R1.voltage,
          "voltage",
        )}`,
        formula: "V = I × R",
      }),
      ({ components, totals }) => ({
        title: "Use KVL to get the parallel-branch voltage",
        detail: `V_{branch} = E_T - V_{R1} = ${formatMetricValue(
          totals.voltage,
          "voltage",
        )} - ${formatMetricValue(components.R1.voltage, "voltage")} = ${formatMetricValue(
          components.R2.voltage,
          "voltage",
        )}\n(In parallel: V_{R2} = V_{R3} = V_{branch})`,
        formula: "E_T = V_{R1} + V_{branch}",
      }),
    ],
  },
  {
    id: "combo-complex-03",
    title: "Combination Circuit · Total Resistance",
    topology: "combination",
    difficulty: "intro",
    prompt:
      "A simple combination circuit has R1 = 50 Ω and R2 = 50 Ω connected in parallel, and this parallel combination is in series with R3 = 75 Ω. A 15 V battery powers the circuit. Solve for all values.",
    targetQuestion: "What is the total equivalent resistance of the circuit?",
    targetMetric: { componentId: "totals", key: "resistance" },
    conceptTags: ["combination", "equivalent-resistance", "ohms-law"],
    diagram: "comboRect",
    source: {
      id: "battery",
      label: "Battery",
      role: "source",
      givens: { voltage: 15 },
      values: { voltage: 15 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 50 },
        values: { resistance: 50 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 50 },
        values: { resistance: 50 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 75 },
        values: { resistance: 75 },
      },
    ],
    network: {
      kind: "series",
      id: "combo-simple",
      children: [
        {
          kind: "parallel",
          id: "combo-simple-parallel",
          children: [
            { kind: "component", componentId: "R1" },
            { kind: "component", componentId: "R2" },
          ],
        },
        { kind: "component", componentId: "R3" },
      ],
    },
    totalsGivens: {},
    presetHint: "combo_simple",
    steps: [
      ({ components }) => {
        const reciprocal = 1 / components.R1.resistance + 1 / components.R2.resistance;
        const equivalent = 1 / reciprocal;
        return {
          title: "Calculate parallel equivalent (R1 || R2)",
          detail: `R_{1||2} = 1 / (1/${formatNumber(components.R1.resistance, 0)}Ω + 1/${formatNumber(components.R2.resistance, 0)}Ω) = ${formatNumber(equivalent, 2)} Ω`,
          formula: "R_{eq} = (R1 × R2) / (R1 + R2)",
        };
      },
      ({ components, totals }) => {
        const branchResistance = 1 / (1 / components.R1.resistance + 1 / components.R2.resistance);
        return {
          title: "Add series resistance",
          detail: `R_T = R_{1||2} + R3 = ${formatNumber(branchResistance, 2)}Ω + ${formatNumber(components.R3.resistance, 0)}Ω = ${formatMetricValue(totals.resistance, "resistance")}`,
          formula: "R_T = R_{eq} + R3",
        };
      },
      ({ totals }) => ({
        title: "Calculate total current",
        detail: `I_T = E / R_T = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.resistance, "resistance")} = ${formatMetricValue(totals.current, "current")}`,
        formula: "I = E / R",
      }),
      ({ components }) => {
        return {
          title: "Find branch currents (equal resistors = equal currents)",
          detail: `I_{R1} = I_{R2} = I_T / 2 = ${formatMetricValue(components.R1.current, "current")}`,
          formula: "I_x = V_{branch} / R_x",
        };
      },
    ],
  },
  // New Combination Problems
  {
    id: "combo-double-parallel-04",
    title: "Combination Circuit · Double Parallel Branch",
    topology: "combination",
    difficulty: "challenge",
    prompt:
      "A complex circuit has two parallel branches in series. The first branch has R1 = 100 Ω and R2 = 100 Ω in parallel. The second branch has R3 = 150 Ω and R4 = 300 Ω in parallel. The circuit is powered by 36 V. Find all values.",
    targetQuestion: "What is the total current drawn from the source?",
    targetMetric: { componentId: "totals", key: "current" },
    conceptTags: ["combination", "series", "parallel", "equivalent-resistance"],
    diagram: "comboRect",
    learningObjective: "Solve a multi-stage combination circuit by collapsing parallel branches step by step.",
    hints: [
      { text: "First collapse each parallel branch separately", formula: "R_{1||2}, then R_{3||4}" },
      { text: "Two equal 100Ω in parallel", formula: "R_{1||2} = 100/2 = 50Ω" },
      { text: "Then add the collapsed branches in series", formula: "R_T = R_{1||2} + R_{3||4}" },
    ],
    tips: [
      "Work from the inside out: collapse parallel branches first",
      "Equal resistors in parallel: R_eq = R/n",
      "Check: total resistance should be between 50Ω and 150Ω",
    ],
    facts: [
      "Multi-stage circuits are common in audio amplifier designs",
      "This topology is used in impedance matching networks",
    ],
    realWorldExample: "Guitar amplifier tone circuits use cascaded RC networks with similar series-parallel topology.",
    source: {
      id: "source",
      label: "Source",
      role: "source",
      givens: { voltage: 36 },
      values: { voltage: 36 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 100 },
        values: { resistance: 100 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 100 },
        values: { resistance: 100 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 150 },
        values: { resistance: 150 },
      },
      {
        id: "R4",
        label: "R4",
        role: "load",
        givens: { resistance: 300 },
        values: { resistance: 300 },
      },
    ],
    network: {
      kind: "series",
      id: "combo-double",
      children: [
        {
          kind: "parallel",
          id: "combo-double-p1",
          children: [
            { kind: "component", componentId: "R1" },
            { kind: "component", componentId: "R2" },
          ],
        },
        {
          kind: "parallel",
          id: "combo-double-p2",
          children: [
            { kind: "component", componentId: "R3" },
            { kind: "component", componentId: "R4" },
          ],
        },
      ],
    },
    totalsGivens: {},
    presetHint: "combo_double_parallel",
    steps: [
      ({ components }) => {
        const eq12 = (components.R1.resistance * components.R2.resistance) / (components.R1.resistance + components.R2.resistance);
        return {
          title: "Collapse first parallel branch (R1 || R2)",
          detail: `R_{1||2} = (${formatNumber(components.R1.resistance, 0)} × ${formatNumber(components.R2.resistance, 0)}) / (${formatNumber(components.R1.resistance, 0)} + ${formatNumber(components.R2.resistance, 0)}) = ${formatNumber(eq12, 2)} Ω`,
          formula: "R_{eq} = (R_1 × R_2) / (R_1 + R_2)",
        };
      },
      ({ components }) => {
        const eq34 = (components.R3.resistance * components.R4.resistance) / (components.R3.resistance + components.R4.resistance);
        return {
          title: "Collapse second parallel branch (R3 || R4)",
          detail: `R_{3||4} = (${formatNumber(components.R3.resistance, 0)} × ${formatNumber(components.R4.resistance, 0)}) / (${formatNumber(components.R3.resistance, 0)} + ${formatNumber(components.R4.resistance, 0)}) = ${formatNumber(eq34, 2)} Ω`,
          formula: "R_{eq} = (R_3 × R_4) / (R_3 + R_4)",
        };
      },
      ({ totals }) => ({
        title: "Sum the series equivalents",
        detail: `R_T = R_{1||2} + R_{3||4} = ${formatMetricValue(totals.resistance, "resistance")}`,
        formula: "R_T = R_{eq1} + R_{eq2}",
      }),
      ({ totals }) => ({
        title: "Calculate total current",
        detail: `I_T = E / R_T = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.resistance, "resistance")} = ${formatMetricValue(totals.current, "current")}`,
        formula: "I = E / R",
      }),
    ],
  },
  {
    id: "combo-nested-05",
    title: "Combination Circuit · Nested Network",
    topology: "combination",
    difficulty: "standard",
    prompt:
      "R1 = 220 Ω is in series with a parallel branch containing R2 = 330 Ω and R3 = 660 Ω. A 27 V source powers the circuit. Calculate all values including the power dissipated by R1.",
    targetQuestion: "What is the power dissipated by resistor R1?",
    targetMetric: { componentId: "R1", key: "watts" },
    conceptTags: ["combination", "power", "kvl", "series"],
    diagram: "comboRect",
    learningObjective: "Calculate power dissipation in a series-parallel combination circuit.",
    hints: [
      { text: "R3 is exactly 2× R2, so the parallel result is easy", formula: "R_{2||3} = (R_2 × R_3)/(R_2 + R_3)" },
      { text: "Power through R1 needs voltage and current", formula: "P = V × I" },
      { text: "All the current flows through R1 (series element)" },
    ],
    tips: [
      "R1 carries the total circuit current since it's in series with the rest",
      "Find total current first, then calculate V_R1 and P_R1",
      "Power = V² ÷ R is another useful formula",
    ],
    facts: [
      "Power calculations help determine required resistor wattage ratings",
      "Exceeding a resistor's power rating causes it to overheat and fail",
    ],
    realWorldExample: "Selecting the right wattage resistor - a 1/4W resistor would burn out if asked to dissipate 1W.",
    source: {
      id: "source",
      label: "Source",
      role: "source",
      givens: { voltage: 27 },
      values: { voltage: 27 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 220 },
        values: { resistance: 220 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 330 },
        values: { resistance: 330 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 660 },
        values: { resistance: 660 },
      },
    ],
    network: {
      kind: "series",
      id: "combo-nested",
      children: [
        { kind: "component", componentId: "R1" },
        {
          kind: "parallel",
          id: "combo-nested-parallel",
          children: [
            { kind: "component", componentId: "R2" },
            { kind: "component", componentId: "R3" },
          ],
        },
      ],
    },
    totalsGivens: {},
    presetHint: "combo_nested",
    steps: [
      ({ components }) => {
        const eq23 = (components.R2.resistance * components.R3.resistance) / (components.R2.resistance + components.R3.resistance);
        return {
          title: "Calculate parallel equivalent",
          detail: `R_{2||3} = (${formatNumber(components.R2.resistance, 0)} × ${formatNumber(components.R3.resistance, 0)}) / (${formatNumber(components.R2.resistance, 0)} + ${formatNumber(components.R3.resistance, 0)}) = ${formatNumber(eq23, 2)} Ω`,
          formula: "R_{eq} = (R_2 × R_3) / (R_2 + R_3)",
        };
      },
      ({ totals }) => ({
        title: "Calculate total resistance",
        detail: `R_T = R_1 + R_{2||3} = ${formatMetricValue(totals.resistance, "resistance")}`,
        formula: "R_T = R_1 + R_{eq}",
      }),
      ({ totals }) => ({
        title: "Calculate total current (flows through R1)",
        detail: `I_T = E / R_T = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.resistance, "resistance")} = ${formatMetricValue(totals.current, "current")}`,
        formula: "I = E / R",
      }),
      ({ components, totals }) => ({
        title: "Calculate voltage across R1",
        detail: `V_{R1} = I_T × R_1 = ${formatMetricValue(totals.current, "current")} × ${formatMetricValue(components.R1.resistance, "resistance")} = ${formatMetricValue(components.R1.voltage, "voltage")}`,
        formula: "V = I × R",
      }),
      ({ components }) => ({
        title: "Calculate power dissipated by R1",
        detail: `P_{R1} = V_{R1} × I_{R1} = ${formatMetricValue(components.R1.voltage, "voltage")} × ${formatMetricValue(components.R1.current, "current")} = ${formatMetricValue(components.R1.watts, "watts")}`,
        formula: "P = V × I",
      }),
    ],
  },
  {
    id: "combo-parallel-first-06",
    title: "Combination Circuit · Parallel-Series Order",
    topology: "combination",
    difficulty: "intro",
    prompt:
      "A parallel combination of R1 = 120 Ω and R2 = 120 Ω is followed by R3 = 40 Ω in series. The circuit is connected to an 8 V battery. Find the total resistance and current distribution.",
    targetQuestion: "What current flows through R3?",
    targetMetric: { componentId: "R3", key: "current" },
    conceptTags: ["combination", "equivalent-resistance", "kcl"],
    diagram: "comboRect",
    learningObjective: "Recognize that total current flows through series elements after parallel branches recombine.",
    hints: [
      { text: "Equal resistors in parallel", formula: "R_{1||2} = 120Ω / 2 = 60Ω" },
      { text: "After the parallel branch, currents recombine" },
      { text: "R3 carries the total current", formula: "I_{R3} = I_T" },
    ],
    tips: [
      "Current from parallel branches adds up before R3",
      "R3 is in series with the parallel equivalent, so it gets full current",
      "This is a common topology in power distribution",
    ],
    facts: [
      "This topology is used when you want to split power among identical loads, then pass current through a common element",
      "Current sensors are often placed in series like R3 to measure total current",
    ],
    realWorldExample: "A current sense resistor placed after parallel LED strings to monitor total current draw.",
    source: {
      id: "battery",
      label: "Battery",
      role: "source",
      givens: { voltage: 8 },
      values: { voltage: 8 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 120 },
        values: { resistance: 120 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 120 },
        values: { resistance: 120 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 40 },
        values: { resistance: 40 },
      },
    ],
    network: {
      kind: "series",
      id: "combo-pf",
      children: [
        {
          kind: "parallel",
          id: "combo-pf-parallel",
          children: [
            { kind: "component", componentId: "R1" },
            { kind: "component", componentId: "R2" },
          ],
        },
        { kind: "component", componentId: "R3" },
      ],
    },
    totalsGivens: {},
    presetHint: "combo_parallel_first",
    steps: [
      ({ components }) => {
        const eq12 = components.R1.resistance / 2;
        return {
          title: "Calculate parallel equivalent (equal resistors)",
          detail: `R_{1||2} = ${formatNumber(components.R1.resistance, 0)}Ω / 2 = ${formatNumber(eq12, 2)} Ω`,
          formula: "R_{eq} = R / n (for n equal resistors)",
        };
      },
      ({ components, totals }) => {
        const eq12 = components.R1.resistance / 2;
        return {
          title: "Add series resistance",
          detail: `R_T = R_{1||2} + R_3 = ${formatNumber(eq12, 2)}Ω + ${formatNumber(components.R3.resistance, 0)}Ω = ${formatMetricValue(totals.resistance, "resistance")}`,
          formula: "R_T = R_{eq} + R_3",
        };
      },
      ({ totals }) => ({
        title: "Calculate total current",
        detail: `I_T = E / R_T = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.resistance, "resistance")} = ${formatMetricValue(totals.current, "current")}`,
        formula: "I = E / R",
      }),
      ({ components, totals }) => ({
        title: "Current through R3 equals total current",
        detail: `I_{R3} = I_T = ${formatMetricValue(totals.current, "current")}\n(Branch currents from R1 and R2 recombine: ${formatMetricValue(components.R1.current, "current")} + ${formatMetricValue(components.R2.current, "current")} = ${formatMetricValue(totals.current, "current")})`,
        formula: "I_{series} = I_T",
      }),
    ],
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // TEXTBOOK-STYLE SERIES PROBLEMS
  // Single continuous path for current - one loop, no branches
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "textbook-series-basic-01",
    title: "Textbook Series · Basic Loop",
    topology: "series",
    difficulty: "intro",
    prompt:
      "A simple series circuit consists of a 9V battery connected to two resistors: R1 = 100 Ω and R2 = 200 Ω. Since there is only ONE path for current, the same current flows through every component. Calculate the circuit current and voltage drops.",
    targetQuestion: "What is the current flowing through this series circuit?",
    targetMetric: { componentId: "totals", key: "current" },
    conceptTags: ["series", "ohms-law", "single-path", "textbook"],
    diagram: "seriesRect",
    learningObjective: "Understand that series circuits have ONE path for current - like beads on a string.",
    hints: [
      { text: "Series circuit = ONE continuous path", formula: "I_{total} = I_{R1} = I_{R2}" },
      { text: "Add resistances in series directly", formula: "R_T = R_1 + R_2" },
      { text: "Use Ohm's Law for current", formula: "I = E / R_T" },
    ],
    tips: [
      "Think of series like a single-lane road - all traffic must go through the same path",
      "Current is the same everywhere in a series circuit",
      "Voltage 'drops' as it passes through each resistor",
    ],
    facts: [
      "Old Christmas lights were wired in series - one bulb out meant ALL bulbs out!",
      "Series circuits are used in voltage dividers for sensors and controls",
    ],
    realWorldExample: "A flashlight: battery → switch → bulb → back to battery. One path, one current.",
    source: {
      id: "battery",
      label: "Battery",
      role: "source",
      givens: { voltage: 9 },
      values: { voltage: 9 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 100 },
        values: { resistance: 100 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 200 },
        values: { resistance: 200 },
      },
    ],
    network: {
      kind: "series",
      id: "textbook-series-basic",
      children: SERIES_IDS_2.map((componentId) => ({ kind: "component", componentId })),
    },
    totalsGivens: {},
    presetHint: "textbook_series_basic",
    steps: [
      ({ components, totals }) => ({
        title: "Add resistances (series = direct sum)",
        detail: `R_T = R_1 + R_2 = ${formatNumber(components.R1.resistance, 0)}Ω + ${formatNumber(components.R2.resistance, 0)}Ω = ${formatMetricValue(totals.resistance, "resistance")}`,
        formula: "R_T = R_1 + R_2",
      }),
      ({ totals }) => ({
        title: "Calculate circuit current (same everywhere)",
        detail: `I_T = E / R_T = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.resistance, "resistance")} = ${formatMetricValue(totals.current, "current")}`,
        formula: "I = E / R",
      }),
      ({ components, totals }) => ({
        title: "Find voltage drops (V = I × R)",
        detail: `V_{R1} = ${formatMetricValue(totals.current, "current")} × ${formatNumber(components.R1.resistance, 0)}Ω = ${formatMetricValue(components.R1.voltage, "voltage")}\nV_{R2} = ${formatMetricValue(totals.current, "current")} × ${formatNumber(components.R2.resistance, 0)}Ω = ${formatMetricValue(components.R2.voltage, "voltage")}`,
        formula: "V = I × R",
      }),
      ({ components, totals }) => ({
        title: "Verify: Voltage drops sum to source (KVL)",
        detail: `${formatMetricValue(components.R1.voltage, "voltage")} + ${formatMetricValue(components.R2.voltage, "voltage")} = ${formatMetricValue(totals.voltage, "voltage")} ✓`,
        formula: "E_T = V_{R1} + V_{R2}",
      }),
    ],
  },
  {
    id: "textbook-series-chain-02",
    title: "Textbook Series · Three Resistor Chain",
    topology: "series",
    difficulty: "standard",
    prompt:
      "Three resistors are connected in series forming a single current path: R1 = 220 Ω, R2 = 330 Ω, R3 = 450 Ω. The circuit is powered by a 12V supply. Find the voltage drop across R2.",
    targetQuestion: "What is the voltage drop across resistor R2?",
    targetMetric: { componentId: "R2", key: "voltage" },
    conceptTags: ["series", "voltage-divider", "kvl", "textbook"],
    diagram: "seriesRect",
    learningObjective: "Apply the voltage divider concept in a series chain - larger resistance gets larger voltage drop.",
    hints: [
      { text: "Total resistance is the sum", formula: "R_T = R_1 + R_2 + R_3" },
      { text: "Same current through all three", formula: "I = E / R_T" },
      { text: "Voltage divides by resistance ratio", formula: "V_x = E × (R_x / R_T)" },
    ],
    tips: [
      "The resistor with the largest value gets the largest voltage drop",
      "Voltage drops always sum to the source voltage (Kirchhoff's Voltage Law)",
      "Check: 220Ω is about 22% of 1000Ω total, so V_R1 should be about 22% of 12V",
    ],
    facts: [
      "Voltage dividers are used in potentiometers (volume knobs)",
      "Many sensors output a voltage that's divided down for microcontroller inputs",
    ],
    realWorldExample: "A volume knob is a variable voltage divider - turning it changes the resistance ratio.",
    source: {
      id: "supply",
      label: "Supply",
      role: "source",
      givens: { voltage: 12 },
      values: { voltage: 12 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 220 },
        values: { resistance: 220 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 330 },
        values: { resistance: 330 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 450 },
        values: { resistance: 450 },
      },
    ],
    network: {
      kind: "series",
      id: "textbook-series-chain",
      children: SERIES_IDS.map((componentId) => ({ kind: "component", componentId })),
    },
    totalsGivens: {},
    presetHint: "textbook_series_chain",
    steps: [
      ({ components, totals }) => ({
        title: "Sum all series resistances",
        detail: `R_T = ${formatNumber(components.R1.resistance, 0)}Ω + ${formatNumber(components.R2.resistance, 0)}Ω + ${formatNumber(components.R3.resistance, 0)}Ω = ${formatMetricValue(totals.resistance, "resistance")}`,
        formula: "R_T = R_1 + R_2 + R_3",
      }),
      ({ totals }) => ({
        title: "Find circuit current",
        detail: `I_T = E / R_T = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.resistance, "resistance")} = ${formatMetricValue(totals.current, "current")}`,
        formula: "I = E / R",
      }),
      ({ components, totals }) => ({
        title: "Calculate voltage drop across R2",
        detail: `V_{R2} = I_T × R_2 = ${formatMetricValue(totals.current, "current")} × ${formatNumber(components.R2.resistance, 0)}Ω = ${formatMetricValue(components.R2.voltage, "voltage")}`,
        formula: "V = I × R",
      }),
      ({ components, totals }) => ({
        title: "Verify with voltage divider formula",
        detail: `V_{R2} = E × (R_2 / R_T) = ${formatMetricValue(totals.voltage, "voltage")} × (${formatNumber(components.R2.resistance, 0)} / ${formatNumber(totals.resistance, 0)}) = ${formatMetricValue(components.R2.voltage, "voltage")} ✓`,
        formula: "V_x = E × (R_x / R_T)",
      }),
    ],
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // TEXTBOOK-STYLE PARALLEL PROBLEMS
  // Multiple paths for current - branches that share voltage
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "textbook-parallel-basic-01",
    title: "Textbook Parallel · Two Branches",
    topology: "parallel",
    difficulty: "intro",
    prompt:
      "Two resistors are connected in PARALLEL across a 10V battery: R1 = 50 Ω and R2 = 100 Ω. In parallel circuits, current has MULTIPLE paths to choose from. Each branch gets the full voltage. Find the current through each branch.",
    targetQuestion: "What is the current through resistor R1?",
    targetMetric: { componentId: "R1", key: "current" },
    conceptTags: ["parallel", "kcl", "branch-currents", "textbook"],
    diagram: "parallelRect",
    learningObjective: "Understand that parallel circuits provide MULTIPLE paths - current divides, voltage stays same.",
    hints: [
      { text: "Parallel = same voltage across all branches" },
      { text: "Current takes BOTH paths simultaneously" },
      { text: "More current flows through LOWER resistance", formula: "I = V / R" },
    ],
    tips: [
      "Think of parallel like a fork in a river - water splits but pressure (voltage) is same",
      "Lower resistance = easier path = MORE current",
      "Total current = sum of all branch currents (KCL)",
    ],
    facts: [
      "Household outlets are wired in parallel - each device gets 120V",
      "If one device fails in parallel, others keep working",
    ],
    realWorldExample: "Your home electrical system: all outlets have the same voltage (120V), but each device draws its own current.",
    source: {
      id: "battery",
      label: "Battery",
      role: "source",
      givens: { voltage: 10 },
      values: { voltage: 10 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 50 },
        values: { resistance: 50 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 100 },
        values: { resistance: 100 },
      },
    ],
    network: {
      kind: "parallel",
      id: "textbook-parallel-basic",
      children: SERIES_IDS_2.map((componentId) => ({ kind: "component", componentId })),
    },
    totalsGivens: {},
    presetHint: "textbook_parallel_basic",
    steps: [
      ({ components }) => ({
        title: "Voltage is SAME across all parallel branches",
        detail: `V_{R1} = V_{R2} = E = ${formatMetricValue(components.R1.voltage, "voltage")}`,
        formula: "V_{branch} = E_T (parallel rule)",
      }),
      ({ components }) => ({
        title: "Calculate current through R1",
        detail: `I_{R1} = V / R_1 = ${formatMetricValue(components.R1.voltage, "voltage")} ÷ ${formatNumber(components.R1.resistance, 0)}Ω = ${formatMetricValue(components.R1.current, "current")}`,
        formula: "I = V / R",
      }),
      ({ components }) => ({
        title: "Calculate current through R2",
        detail: `I_{R2} = V / R_2 = ${formatMetricValue(components.R2.voltage, "voltage")} ÷ ${formatNumber(components.R2.resistance, 0)}Ω = ${formatMetricValue(components.R2.current, "current")}`,
        formula: "I = V / R",
      }),
      ({ components, totals }) => ({
        title: "Total current = sum of branches (KCL)",
        detail: `I_T = I_{R1} + I_{R2} = ${formatMetricValue(components.R1.current, "current")} + ${formatMetricValue(components.R2.current, "current")} = ${formatMetricValue(totals.current, "current")}`,
        formula: "I_T = I_1 + I_2",
      }),
    ],
  },
  {
    id: "textbook-parallel-three-branch-02",
    title: "Textbook Parallel · Three Branch Network",
    topology: "parallel",
    difficulty: "standard",
    prompt:
      "Three resistors form a parallel network across a 24V supply: R1 = 80 Ω, R2 = 120 Ω, R3 = 60 Ω. The current from the source SPLITS into three separate paths at the first junction, then RECOMBINES at the second junction. Find the equivalent resistance.",
    targetQuestion: "What is the total equivalent resistance of the parallel network?",
    targetMetric: { componentId: "totals", key: "resistance" },
    conceptTags: ["parallel", "equivalent-resistance", "kcl", "textbook"],
    diagram: "parallelRect",
    learningObjective: "Calculate equivalent resistance in parallel - it's always LESS than the smallest branch resistance.",
    hints: [
      { text: "Parallel equivalent uses reciprocal formula", formula: "1/R_T = 1/R_1 + 1/R_2 + 1/R_3" },
      { text: "Total R is LESS than the smallest individual R" },
      { text: "More paths = less total resistance (easier for current to flow)" },
    ],
    tips: [
      "Parallel resistance is like adding more lanes to a highway - more flow capacity",
      "R_T will be less than 60Ω (the smallest resistor)",
      "Check your math: if R_T > smallest R, you made an error",
    ],
    facts: [
      "Adding resistors in parallel always DECREASES total resistance",
      "This is why high-current applications use multiple parallel conductors",
    ],
    realWorldExample: "Two garden hoses connected to one faucet - water flows more easily than through one hose alone.",
    source: {
      id: "supply",
      label: "Supply",
      role: "source",
      givens: { voltage: 24 },
      values: { voltage: 24 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 80 },
        values: { resistance: 80 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 120 },
        values: { resistance: 120 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 60 },
        values: { resistance: 60 },
      },
    ],
    network: {
      kind: "parallel",
      id: "textbook-parallel-three",
      children: SERIES_IDS.map((componentId) => ({ kind: "component", componentId })),
    },
    totalsGivens: {},
    presetHint: "textbook_parallel_three",
    steps: [
      ({ components }) => ({
        title: "Set up the reciprocal equation",
        detail: `1/R_T = 1/${formatNumber(components.R1.resistance, 0)}Ω + 1/${formatNumber(components.R2.resistance, 0)}Ω + 1/${formatNumber(components.R3.resistance, 0)}Ω`,
        formula: "1/R_T = 1/R_1 + 1/R_2 + 1/R_3",
      }),
      ({ components, totals }) => {
        const recip = 1/components.R1.resistance + 1/components.R2.resistance + 1/components.R3.resistance;
        return {
          title: "Calculate the sum of reciprocals",
          detail: `1/R_T = ${formatNumber(1/components.R1.resistance, 5)} + ${formatNumber(1/components.R2.resistance, 5)} + ${formatNumber(1/components.R3.resistance, 5)} = ${formatNumber(recip, 5)} Ω⁻¹`,
          formula: "Sum the fractions",
        };
      },
      ({ totals }) => ({
        title: "Invert to find R_T",
        detail: `R_T = 1 / (1/R_T) = ${formatMetricValue(totals.resistance, "resistance")}\n(Note: This is less than 60Ω, the smallest individual resistor ✓)`,
        formula: "R_T = 1 / (Σ 1/R)",
      }),
      ({ totals }) => ({
        title: "Calculate total current",
        detail: `I_T = E / R_T = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.resistance, "resistance")} = ${formatMetricValue(totals.current, "current")}`,
        formula: "I = E / R",
      }),
    ],
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // TEXTBOOK-STYLE COMBINATION PROBLEMS
  // "Boxes within boxes" - nested structures mixing series and parallel
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "textbook-combo-basic-01",
    title: "Textbook Combination · Series-Parallel",
    topology: "combination",
    difficulty: "intro",
    prompt:
      "A combination circuit has R1 = 100 Ω in SERIES with a PARALLEL branch containing R2 = 200 Ω and R3 = 200 Ω. Think of it as a 'box within a box': the parallel section is one 'box' inside the main series 'box'. Power supply is 12V. Find the total resistance.",
    targetQuestion: "What is the total equivalent resistance of this combination circuit?",
    targetMetric: { componentId: "totals", key: "resistance" },
    conceptTags: ["combination", "series-parallel", "equivalent-resistance", "textbook"],
    diagram: "comboRect",
    learningObjective: "Solve combination circuits by collapsing inner 'boxes' first - parallel section becomes one equivalent resistor.",
    hints: [
      { text: "Collapse the parallel 'box' first", formula: "R_{2||3} = R/2 = 100Ω" },
      { text: "Then add in series", formula: "R_T = R_1 + R_{2||3}" },
      { text: "Work from the inside out, like unwrapping nested boxes" },
    ],
    tips: [
      "Draw the circuit as nested boxes to visualize the structure",
      "Two equal resistors in parallel = half of one resistor",
      "The parallel section 'looks like' a single 100Ω resistor to R1",
    ],
    facts: [
      "Combination circuits are everywhere in electronics - audio, power supplies, sensors",
      "Understanding how to collapse networks is essential for circuit analysis",
    ],
    realWorldExample: "A car's headlight circuit: main switch in series with two parallel headlights.",
    source: {
      id: "battery",
      label: "Battery",
      role: "source",
      givens: { voltage: 12 },
      values: { voltage: 12 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 100 },
        values: { resistance: 100 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 200 },
        values: { resistance: 200 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 200 },
        values: { resistance: 200 },
      },
    ],
    network: {
      kind: "series",
      id: "textbook-combo-basic",
      children: [
        { kind: "component", componentId: "R1" },
        {
          kind: "parallel",
          id: "textbook-combo-parallel",
          children: [
            { kind: "component", componentId: "R2" },
            { kind: "component", componentId: "R3" },
          ],
        },
      ],
    },
    totalsGivens: {},
    presetHint: "textbook_combo_basic",
    steps: [
      ({ components }) => {
        const eq23 = components.R2.resistance / 2;
        return {
          title: "Collapse the parallel 'box' (R2 || R3)",
          detail: `R_{2||3} = ${formatNumber(components.R2.resistance, 0)}Ω / 2 = ${formatNumber(eq23, 0)}Ω\n(Equal resistors in parallel: R/n = 200Ω/2)`,
          formula: "R_{eq} = R / n (for n equal resistors)",
        };
      },
      ({ components, totals }) => ({
        title: "Add the series resistances",
        detail: `R_T = R_1 + R_{2||3} = ${formatNumber(components.R1.resistance, 0)}Ω + 100Ω = ${formatMetricValue(totals.resistance, "resistance")}`,
        formula: "R_T = R_1 + R_{parallel}",
      }),
      ({ totals }) => ({
        title: "Calculate total current",
        detail: `I_T = E / R_T = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.resistance, "resistance")} = ${formatMetricValue(totals.current, "current")}`,
        formula: "I = E / R",
      }),
      ({ components, totals }) => ({
        title: "Find voltage drops",
        detail: `V_{R1} = I_T × R_1 = ${formatMetricValue(totals.current, "current")} × ${formatNumber(components.R1.resistance, 0)}Ω = ${formatMetricValue(components.R1.voltage, "voltage")}\nV_{parallel} = E - V_{R1} = ${formatMetricValue(components.R2.voltage, "voltage")}`,
        formula: "V = I × R",
      }),
    ],
  },
  {
    id: "textbook-combo-ladder-02",
    title: "Textbook Combination · Ladder Network",
    topology: "combination",
    difficulty: "standard",
    prompt:
      "A 'ladder' combination circuit: R1 = 150 Ω in series, then a parallel branch with R2 = 300 Ω and R3 = 600 Ω, then R4 = 50 Ω back to series. Visualize it as: [R1]─┬─[R2]─┬─[R4] where R3 is the parallel branch. Power supply is 24V.",
    targetQuestion: "What is the current through the parallel branch (R2 or the R2||R3 section)?",
    targetMetric: { componentId: "R2", key: "voltage" },
    conceptTags: ["combination", "ladder-network", "kvl", "textbook"],
    diagram: "comboRect",
    learningObjective: "Navigate through a ladder circuit by collapsing parallel sections step-by-step.",
    hints: [
      { text: "Collapse R2||R3 first", formula: "R_{2||3} = (R_2 × R_3)/(R_2 + R_3)" },
      { text: "Then add R1 + R_{2||3} + R4" },
      { text: "Current through R1 and R4 = total current (series)" },
    ],
    tips: [
      "The 'ladder' is just series-parallel-series",
      "R2 and R3 share the same voltage but different currents",
      "Total current flows through R1, splits at parallel, recombines at R4",
    ],
    facts: [
      "Ladder networks are used in filters and attenuators",
      "The R-2R ladder is the basis for digital-to-analog converters (DACs)",
    ],
    realWorldExample: "Audio crossover networks use ladder structures to split frequencies between speakers.",
    source: {
      id: "source",
      label: "Source",
      role: "source",
      givens: { voltage: 24 },
      values: { voltage: 24 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 150 },
        values: { resistance: 150 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 300 },
        values: { resistance: 300 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 600 },
        values: { resistance: 600 },
      },
      {
        id: "R4",
        label: "R4",
        role: "load",
        givens: { resistance: 50 },
        values: { resistance: 50 },
      },
    ],
    network: {
      kind: "series",
      id: "textbook-combo-ladder",
      children: [
        { kind: "component", componentId: "R1" },
        {
          kind: "parallel",
          id: "textbook-ladder-parallel",
          children: [
            { kind: "component", componentId: "R2" },
            { kind: "component", componentId: "R3" },
          ],
        },
        { kind: "component", componentId: "R4" },
      ],
    },
    totalsGivens: {},
    presetHint: "textbook_combo_ladder",
    steps: [
      ({ components }) => {
        const eq23 = (components.R2.resistance * components.R3.resistance) / (components.R2.resistance + components.R3.resistance);
        return {
          title: "Collapse the parallel section (R2 || R3)",
          detail: `R_{2||3} = (${formatNumber(components.R2.resistance, 0)} × ${formatNumber(components.R3.resistance, 0)}) / (${formatNumber(components.R2.resistance, 0)} + ${formatNumber(components.R3.resistance, 0)}) = ${formatNumber(eq23, 0)}Ω`,
          formula: "R_{eq} = (R_2 × R_3) / (R_2 + R_3)",
        };
      },
      ({ components, totals }) => {
        const eq23 = (components.R2.resistance * components.R3.resistance) / (components.R2.resistance + components.R3.resistance);
        return {
          title: "Sum the series chain",
          detail: `R_T = R_1 + R_{2||3} + R_4 = ${formatNumber(components.R1.resistance, 0)}Ω + ${formatNumber(eq23, 0)}Ω + ${formatNumber(components.R4.resistance, 0)}Ω = ${formatMetricValue(totals.resistance, "resistance")}`,
          formula: "R_T = R_1 + R_{eq} + R_4",
        };
      },
      ({ totals }) => ({
        title: "Calculate total current (flows through R1 and R4)",
        detail: `I_T = E / R_T = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.resistance, "resistance")} = ${formatMetricValue(totals.current, "current")}`,
        formula: "I = E / R",
      }),
      ({ components, totals }) => ({
        title: "Find voltage across the parallel section",
        detail: `V_{R1} = I_T × R_1 = ${formatMetricValue(components.R1.voltage, "voltage")}\nV_{R4} = I_T × R_4 = ${formatMetricValue(components.R4.voltage, "voltage")}\nV_{parallel} = E - V_{R1} - V_{R4} = ${formatMetricValue(components.R2.voltage, "voltage")}`,
        formula: "KVL: V_{parallel} = E - V_{R1} - V_{R4}",
      }),
    ],
  },
  {
    id: "textbook-combo-nested-03",
    title: "Textbook Combination · Nested Boxes",
    topology: "combination",
    difficulty: "challenge",
    prompt:
      "A complex combination with nested structure: Two parallel branches where one branch contains R1=100Ω and R2=100Ω in series, and the other branch is just R3=100Ω. This whole parallel section is in series with R4=50Ω. Think: [Parallel Box containing [R1─R2] and [R3]] in series with [R4]. Supply is 15V.",
    targetQuestion: "What is the total equivalent resistance?",
    targetMetric: { componentId: "totals", key: "resistance" },
    conceptTags: ["combination", "nested", "equivalent-resistance", "textbook"],
    diagram: "comboRect",
    learningObjective: "Handle nested 'boxes within boxes' - collapse innermost first, work outward.",
    hints: [
      { text: "First: R1+R2 = 200Ω (series in one branch)" },
      { text: "Then: 200Ω || 100Ω (parallel)", formula: "R_{eq} = (200 × 100)/(200 + 100)" },
      { text: "Finally: Add R4 in series" },
    ],
    tips: [
      "Draw nested boxes to visualize the hierarchy",
      "Innermost box first: R1 and R2 are in series within one parallel branch",
      "That 200Ω is then in parallel with the 100Ω of R3",
    ],
    facts: [
      "Nested circuits are common in filter design and impedance matching",
      "Complex electronics often have many levels of nesting",
    ],
    realWorldExample: "A speaker crossover network with nested L-C combinations for different frequency bands.",
    source: {
      id: "supply",
      label: "Supply",
      role: "source",
      givens: { voltage: 15 },
      values: { voltage: 15 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 100 },
        values: { resistance: 100 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 100 },
        values: { resistance: 100 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 100 },
        values: { resistance: 100 },
      },
      {
        id: "R4",
        label: "R4",
        role: "load",
        givens: { resistance: 50 },
        values: { resistance: 50 },
      },
    ],
    network: {
      kind: "series",
      id: "textbook-combo-nested-outer",
      children: [
        {
          kind: "parallel",
          id: "textbook-nested-parallel",
          children: [
            {
              kind: "series",
              id: "textbook-nested-inner-series",
              children: [
                { kind: "component", componentId: "R1" },
                { kind: "component", componentId: "R2" },
              ],
            },
            { kind: "component", componentId: "R3" },
          ],
        },
        { kind: "component", componentId: "R4" },
      ],
    },
    totalsGivens: {},
    presetHint: "textbook_combo_nested",
    steps: [
      ({ components }) => ({
        title: "Step 1: Collapse innermost series (R1 + R2)",
        detail: `R_{12} = R_1 + R_2 = ${formatNumber(components.R1.resistance, 0)}Ω + ${formatNumber(components.R2.resistance, 0)}Ω = 200Ω\n(This is ONE branch of the parallel section)`,
        formula: "R_{series} = R_1 + R_2",
      }),
      ({ components }) => {
        const r12 = components.R1.resistance + components.R2.resistance;
        const parallel = (r12 * components.R3.resistance) / (r12 + components.R3.resistance);
        return {
          title: "Step 2: Collapse the parallel section (R12 || R3)",
          detail: `R_{parallel} = (200Ω × ${formatNumber(components.R3.resistance, 0)}Ω) / (200Ω + ${formatNumber(components.R3.resistance, 0)}Ω) = ${formatNumber(parallel, 2)}Ω`,
          formula: "R_{eq} = (R_{12} × R_3) / (R_{12} + R_3)",
        };
      },
      ({ components, totals }) => {
        const r12 = components.R1.resistance + components.R2.resistance;
        const parallel = (r12 * components.R3.resistance) / (r12 + components.R3.resistance);
        return {
          title: "Step 3: Add the final series element (R4)",
          detail: `R_T = R_{parallel} + R_4 = ${formatNumber(parallel, 2)}Ω + ${formatNumber(components.R4.resistance, 0)}Ω = ${formatMetricValue(totals.resistance, "resistance")}`,
          formula: "R_T = R_{parallel} + R_4",
        };
      },
      ({ totals }) => ({
        title: "Calculate circuit current and verify",
        detail: `I_T = E / R_T = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.resistance, "resistance")} = ${formatMetricValue(totals.current, "current")}`,
        formula: "I = E / R",
      }),
    ],
  },
  {
    id: "textbook-combo-double-parallel-04",
    title: "Textbook Combination · Double Parallel",
    topology: "combination",
    difficulty: "challenge",
    prompt:
      "Two separate parallel 'boxes' in series: First box has R1=120Ω || R2=120Ω. Second box has R3=80Ω || R4=80Ω. These two boxes are connected in series. Supply is 20V. This is like: [Box1] ─── [Box2] where each box contains parallel resistors.",
    targetQuestion: "What is the total current drawn from the supply?",
    targetMetric: { componentId: "totals", key: "current" },
    conceptTags: ["combination", "double-parallel", "equivalent-resistance", "textbook"],
    diagram: "comboRect",
    learningObjective: "Collapse multiple parallel sections independently, then add them in series.",
    hints: [
      { text: "Box 1: Two equal 120Ω in parallel = 60Ω" },
      { text: "Box 2: Two equal 80Ω in parallel = 40Ω" },
      { text: "Total: 60Ω + 40Ω = 100Ω in series" },
    ],
    tips: [
      "Equal resistors in parallel: R/2",
      "Treat each 'box' as a single resistor after collapsing",
      "Series connection of boxes means add their equivalent resistances",
    ],
    facts: [
      "This topology is used in power resistor banks to share load",
      "Audio amplifiers use similar structures for impedance matching",
    ],
    realWorldExample: "Parallel speaker pairs connected in series to match amplifier impedance.",
    source: {
      id: "supply",
      label: "Supply",
      role: "source",
      givens: { voltage: 20 },
      values: { voltage: 20 },
    },
    components: [
      {
        id: "R1",
        label: "R1",
        role: "load",
        givens: { resistance: 120 },
        values: { resistance: 120 },
      },
      {
        id: "R2",
        label: "R2",
        role: "load",
        givens: { resistance: 120 },
        values: { resistance: 120 },
      },
      {
        id: "R3",
        label: "R3",
        role: "load",
        givens: { resistance: 80 },
        values: { resistance: 80 },
      },
      {
        id: "R4",
        label: "R4",
        role: "load",
        givens: { resistance: 80 },
        values: { resistance: 80 },
      },
    ],
    network: {
      kind: "series",
      id: "textbook-combo-double",
      children: [
        {
          kind: "parallel",
          id: "textbook-double-parallel-1",
          children: [
            { kind: "component", componentId: "R1" },
            { kind: "component", componentId: "R2" },
          ],
        },
        {
          kind: "parallel",
          id: "textbook-double-parallel-2",
          children: [
            { kind: "component", componentId: "R3" },
            { kind: "component", componentId: "R4" },
          ],
        },
      ],
    },
    totalsGivens: {},
    presetHint: "textbook_combo_double",
    steps: [
      ({ components }) => ({
        title: "Collapse Box 1 (R1 || R2)",
        detail: `R_{Box1} = ${formatNumber(components.R1.resistance, 0)}Ω / 2 = 60Ω\n(Two equal resistors in parallel = R/2)`,
        formula: "R_{eq} = R / n",
      }),
      ({ components }) => ({
        title: "Collapse Box 2 (R3 || R4)",
        detail: `R_{Box2} = ${formatNumber(components.R3.resistance, 0)}Ω / 2 = 40Ω\n(Two equal resistors in parallel = R/2)`,
        formula: "R_{eq} = R / n",
      }),
      ({ totals }) => ({
        title: "Add the boxes in series",
        detail: `R_T = R_{Box1} + R_{Box2} = 60Ω + 40Ω = ${formatMetricValue(totals.resistance, "resistance")}`,
        formula: "R_T = R_{eq1} + R_{eq2}",
      }),
      ({ totals }) => ({
        title: "Calculate total current",
        detail: `I_T = E / R_T = ${formatMetricValue(totals.voltage, "voltage")} ÷ ${formatMetricValue(totals.resistance, "resistance")} = ${formatMetricValue(totals.current, "current")}`,
        formula: "I = E / R",
      }),
    ],
  },
];

const practiceProblems: PracticeProblem[] = practiceProblemSeeds.map((problem) => ({
  ...problem,
  gamification: {
    xpReward: problem.gamification?.xpReward ?? XP_REWARD_BY_DIFFICULTY[problem.difficulty],
    masteryTags: Array.from(
      new Set(problem.gamification?.masteryTags ?? problem.conceptTags ?? []),
    ),
    featuredBadgeId: problem.gamification?.featuredBadgeId,
    unlocks: problem.gamification?.unlocks ?? [],
  },
}));

const practiceProblemById = new Map<string, PracticeProblem>(
  practiceProblems.map((problem) => [problem.id, problem])
);

const practiceProblemByPreset = new Map<string, PracticeProblem>(
  practiceProblems
    .filter((problem) => typeof problem.presetHint === "string")
    .map((problem) => [problem.presetHint as string, problem])
);

export const DEFAULT_PRACTICE_PROBLEM = practiceProblems[0] ?? null;

export const findPracticeProblemById = (id: string | null | undefined): PracticeProblem | null => {
  if (!id) {
    return DEFAULT_PRACTICE_PROBLEM;
  }
  return practiceProblemById.get(id) ?? DEFAULT_PRACTICE_PROBLEM;
};

export const findPracticeProblemByPreset = (preset: string | null | undefined): PracticeProblem | null => {
  if (!preset) {
    return null;
  }
  return practiceProblemByPreset.get(preset) ?? null;
};

export const getRandomPracticeProblem = (topology?: PracticeProblem["topology"]): PracticeProblem | null => {
  if (!practiceProblems.length) {
    return null;
  }

  const pool = topology
    ? practiceProblems.filter((problem) => problem.topology === topology)
    : practiceProblems;

  if (!pool.length) {
    return DEFAULT_PRACTICE_PROBLEM;
  }

  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex] ?? DEFAULT_PRACTICE_PROBLEM;
};

export default practiceProblems;

