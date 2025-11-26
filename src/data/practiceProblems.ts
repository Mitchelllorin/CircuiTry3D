import { formatMetricValue, formatNumber } from "../utils/electrical";
import type { PracticeProblem } from "../model/practice";

const SERIES_IDS = ["R1", "R2", "R3"] as const;
const SERIES_IDS_2 = ["R1", "R2"] as const;

const practiceProblems: PracticeProblem[] = [
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
];

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

