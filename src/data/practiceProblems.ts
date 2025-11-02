import { formatMetricValue, formatNumber } from "../utils/electrical";
import type { PracticeProblem } from "../model/practice";

const SERIES_IDS = ["R1", "R2", "R3", "R4"] as const;

const practiceProblems: PracticeProblem[] = [
  {
    id: "series-square-01",
    title: "Series Square · Loop Current",
    topology: "series",
    difficulty: "intro",
    prompt:
      "A square loop holds four resistors connected in series around the path. The battery feeds 24 V to the loop. Complete the W.I.R.E. table and determine the loop current.",
    targetQuestion: "What is the total current flowing through the series loop?",
    targetMetric: { componentId: "totals", key: "current" },
    conceptTags: ["series", "ohms-law", "wire-table"],
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
        label: "Top Resistor",
        role: "load",
        givens: { resistance: 120 },
        values: { resistance: 120 },
      },
      {
        id: "R2",
        label: "Right Resistor",
        role: "load",
        givens: { resistance: 150 },
        values: { resistance: 150 },
      },
      {
        id: "R3",
        label: "Bottom Resistor",
        role: "load",
        givens: { resistance: 180 },
        values: { resistance: 180 },
      },
      {
        id: "R4",
        label: "Left Resistor",
        role: "load",
        givens: { resistance: 100 },
        values: { resistance: 100 },
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
          formula: "R_T = R_1 + R_2 + R_3 + R_4",
        };
      },
      ({ totals }) => ({
        title: "Solve for loop current",
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
    id: "parallel-square-02",
    title: "Parallel Square · Branch Currents",
    topology: "parallel",
    difficulty: "standard",
    prompt:
      "Three resistors bridge the opposite nodes of a square bus, all tied across an 18 V source. Complete the W.I.R.E. worksheet and find each branch current along with the equivalent resistance.",
    targetQuestion: "What is the total equivalent resistance of the three parallel branches?",
    targetMetric: { componentId: "totals", key: "resistance" },
    conceptTags: ["parallel", "kirchhoff", "ohms-law"],
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
        label: "Upper Branch",
        role: "load",
        givens: { resistance: 180 },
        values: { resistance: 180 },
      },
      {
        id: "R2",
        label: "Middle Branch",
        role: "load",
        givens: { resistance: 90 },
        values: { resistance: 90 },
      },
      {
        id: "R3",
        label: "Lower Branch",
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
    id: "combo-square-03",
    title: "Combination Square · Ladder Solve",
    topology: "combination",
    difficulty: "challenge",
    prompt:
      "A ladder circuit wraps a square: R1 on the top leg, a parallel pair on the right leg (R2 || R3), and R4 closing the bottom leg back to the source. The supply provides 30 V. Use the table method to solve every component and report the current through R2.",
    targetQuestion: "What current flows through branch R2?",
    targetMetric: { componentId: "R2", key: "current" },
    conceptTags: ["combination", "series", "parallel", "ohms-law", "kirchhoff"],
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
        label: "Entry Resistor",
        role: "load",
        givens: { resistance: 100 },
        values: { resistance: 100 },
      },
      {
        id: "R2",
        label: "Upper Branch",
        role: "load",
        givens: { resistance: 150 },
        values: { resistance: 150 },
      },
      {
        id: "R3",
        label: "Lower Branch",
        role: "load",
        givens: { resistance: 300 },
        values: { resistance: 300 },
      },
      {
        id: "R4",
        label: "Return Resistor",
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
];

export default practiceProblems;

