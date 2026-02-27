import type { JSX } from "react";
import type { TroubleshootingProblem } from "../../data/troubleshootingProblems";
import {
  BatterySymbol,
  LEDSymbol,
  ResistorSymbol,
  SwitchSymbol,
} from "../circuit/SchematicSymbols";
import { SCHEMATIC_COLORS, STROKE_WIDTHS } from "../../schematic/visualConstants";

type TroubleshootCircuitDiagramProps = {
  problem: TroubleshootingProblem;
};

const WIRE_COLOR = SCHEMATIC_COLORS.wire;
const COMPONENT_COLOR = SCHEMATIC_COLORS.componentStroke;
const LABEL_COLOR = SCHEMATIC_COLORS.labelPrimary;
const NODE_COLOR = SCHEMATIC_COLORS.nodeFill;
const NODE_STROKE = SCHEMATIC_COLORS.nodeStroke;
const WIRE_STROKE = STROKE_WIDTHS.wire;
const FAULT_COLOR = "#ff9b86";

const LEFT_X = 82;
const RIGHT_X = 518;
const TOP_Y = 58;
const BOTTOM_Y = 162;
const TOP_COMPONENT_X = (LEFT_X + RIGHT_X) / 2;
const RIGHT_COMPONENT_Y = (TOP_Y + BOTTOM_Y) / 2;
const BOTTOM_COMPONENT_X = TOP_COMPONENT_X;
const COMPONENT_HALF_SPAN = 30;
const TOP_COMPONENT_LEFT_X = TOP_COMPONENT_X - COMPONENT_HALF_SPAN;
const TOP_COMPONENT_RIGHT_X = TOP_COMPONENT_X + COMPONENT_HALF_SPAN;
const RIGHT_COMPONENT_TOP_Y = RIGHT_COMPONENT_Y - COMPONENT_HALF_SPAN;
const RIGHT_COMPONENT_BOTTOM_Y = RIGHT_COMPONENT_Y + COMPONENT_HALF_SPAN;
const BOTTOM_COMPONENT_LEFT_X = BOTTOM_COMPONENT_X - COMPONENT_HALF_SPAN;
const BOTTOM_COMPONENT_RIGHT_X = BOTTOM_COMPONENT_X + COMPONENT_HALF_SPAN;
const BATTERY_CENTER_Y = (TOP_Y + BOTTOM_Y) / 2;
const BATTERY_TOP_Y = BATTERY_CENTER_Y - 26;
const BATTERY_BOTTOM_Y = BATTERY_CENTER_Y + 26;

const drawWire = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  key?: string,
) => (
  <line
    key={key}
    x1={x1}
    y1={y1}
    x2={x2}
    y2={y2}
    stroke={WIRE_COLOR}
    strokeWidth={WIRE_STROKE}
    strokeLinecap="round"
  />
);

const drawNode = (x: number, y: number, key: string) => (
  <circle
    key={key}
    cx={x}
    cy={y}
    r={3.2}
    fill={NODE_COLOR}
    stroke={NODE_STROKE}
    strokeWidth={1.1}
  />
);

const baseBattery = (
  <>
    {drawWire(LEFT_X, TOP_Y, LEFT_X, BATTERY_TOP_Y, "battery-top-wire")}
    <BatterySymbol
      x={LEFT_X}
      y={BATTERY_CENTER_Y}
      rotation={-90}
      scale={0.92}
      showLabel={false}
      color={WIRE_COLOR}
      strokeWidth={2.8}
    />
    {drawWire(LEFT_X, BATTERY_BOTTOM_Y, LEFT_X, BOTTOM_Y, "battery-bottom-wire")}
    <text
      x={LEFT_X - 28}
      y={BATTERY_CENTER_Y + 4}
      textAnchor="middle"
      fill={LABEL_COLOR}
      fontSize={11}
    >
      B1
    </text>
  </>
);

const drawRightResistor = (label: string, keyPrefix: string) => (
  <>
    {drawWire(
      RIGHT_X,
      TOP_Y,
      RIGHT_X,
      RIGHT_COMPONENT_TOP_Y,
      `${keyPrefix}-right-wire-top`,
    )}
    <ResistorSymbol
      x={RIGHT_X}
      y={RIGHT_COMPONENT_Y}
      rotation={90}
      scale={1}
      showLabel={false}
      color={COMPONENT_COLOR}
      strokeWidth={2.2}
    />
    {drawWire(
      RIGHT_X,
      RIGHT_COMPONENT_BOTTOM_Y,
      RIGHT_X,
      BOTTOM_Y,
      `${keyPrefix}-right-wire-bottom`,
    )}
    <text
      x={RIGHT_X + 26}
      y={RIGHT_COMPONENT_Y + 4}
      textAnchor="start"
      fill={LABEL_COLOR}
      fontSize={11}
    >
      {label}
    </text>
  </>
);

const drawBottomResistor = (
  label: string,
  keyPrefix: string,
  leftReturnX = LEFT_X,
) => (
  <>
    {drawWire(
      RIGHT_X,
      BOTTOM_Y,
      BOTTOM_COMPONENT_RIGHT_X,
      BOTTOM_Y,
      `${keyPrefix}-bottom-wire-right`,
    )}
    <ResistorSymbol
      x={BOTTOM_COMPONENT_X}
      y={BOTTOM_Y}
      scale={1}
      showLabel={false}
      color={COMPONENT_COLOR}
      strokeWidth={2.2}
    />
    {drawWire(
      BOTTOM_COMPONENT_LEFT_X,
      BOTTOM_Y,
      leftReturnX,
      BOTTOM_Y,
      `${keyPrefix}-bottom-wire-left`,
    )}
    <text
      x={BOTTOM_COMPONENT_X}
      y={186}
      textAnchor="middle"
      fill={LABEL_COLOR}
      fontSize={11}
    >
      {label}
    </text>
  </>
);

const drawCornerNodes = (prefix: string) => (
  <>
    {drawNode(LEFT_X, TOP_Y, `${prefix}-tl`)}
    {drawNode(RIGHT_X, TOP_Y, `${prefix}-tr`)}
    {drawNode(RIGHT_X, BOTTOM_Y, `${prefix}-br`)}
    {drawNode(LEFT_X, BOTTOM_Y, `${prefix}-bl`)}
  </>
);

const OpenSwitchDiagram = () => (
  <>
    {baseBattery}
    {drawWire(LEFT_X, TOP_Y, TOP_COMPONENT_LEFT_X, TOP_Y, "os-top-wire-left")}
    <SwitchSymbol
      x={TOP_COMPONENT_X}
      y={TOP_Y}
      scale={1}
      showLabel={false}
      color={COMPONENT_COLOR}
      strokeWidth={2.2}
      isOpen
    />
    {drawWire(TOP_COMPONENT_RIGHT_X, TOP_Y, RIGHT_X, TOP_Y, "os-top-wire-right")}
    {drawRightResistor("R1", "os")}
    {drawBottomResistor("R2", "os")}
    {drawCornerNodes("os")}

    <rect
      x={256}
      y={24}
      width={88}
      height={52}
      rx={8}
      fill="none"
      stroke={FAULT_COLOR}
      strokeDasharray="6 4"
      strokeWidth={1.6}
    />
    <text x={300} y={20} textAnchor="middle" fill={FAULT_COLOR} fontSize={10}>
      Fault: switch open
    </text>

    <text x={TOP_COMPONENT_X} y={88} textAnchor="middle" fill={LABEL_COLOR} fontSize={11}>
      SW1
    </text>
  </>
);

const MissingWireDiagram = () => (
  <>
    {baseBattery}
    {drawWire(LEFT_X, TOP_Y, TOP_COMPONENT_LEFT_X, TOP_Y, "mw-top-wire-left")}
    <ResistorSymbol
      x={TOP_COMPONENT_X}
      y={TOP_Y}
      scale={1}
      showLabel={false}
      color={COMPONENT_COLOR}
      strokeWidth={2.2}
    />
    {drawWire(TOP_COMPONENT_RIGHT_X, TOP_Y, RIGHT_X, TOP_Y, "mw-top-wire-right")}
    {drawRightResistor("R2", "mw")}
    {drawBottomResistor("R3", "mw", 136)}

    <line
      x1={136}
      y1={BOTTOM_Y}
      x2={LEFT_X}
      y2={BOTTOM_Y}
      stroke={FAULT_COLOR}
      strokeWidth={2}
      strokeDasharray="6 4"
      strokeLinecap="round"
    />
    <text x={108} y={148} textAnchor="middle" fill={FAULT_COLOR} fontSize={10}>
      Missing wire
    </text>

    {drawCornerNodes("mw")}

    <text x={TOP_COMPONENT_X} y={38} textAnchor="middle" fill={LABEL_COLOR} fontSize={11}>
      R1
    </text>
  </>
);

const ShortCircuitDiagram = () => (
  <>
    {baseBattery}
    {drawWire(LEFT_X, TOP_Y, TOP_COMPONENT_LEFT_X, TOP_Y, "sc-top-wire-left")}
    <ResistorSymbol
      x={TOP_COMPONENT_X}
      y={TOP_Y}
      scale={1}
      showLabel={false}
      color={COMPONENT_COLOR}
      strokeWidth={2.2}
    />
    {drawWire(TOP_COMPONENT_RIGHT_X, TOP_Y, RIGHT_X, TOP_Y, "sc-top-wire-right")}
    {drawRightResistor("R2", "sc")}
    {drawBottomResistor("R3", "sc")}

    <line
      x1={LEFT_X + 18}
      y1={TOP_Y + 10}
      x2={LEFT_X + 18}
      y2={BOTTOM_Y - 10}
      stroke={FAULT_COLOR}
      strokeWidth={3}
      strokeLinecap="round"
    />
    <text
      x={LEFT_X + 34}
      y={BATTERY_CENTER_Y + 2}
      fill={FAULT_COLOR}
      fontSize={10}
    >
      Short path
    </text>

    {drawCornerNodes("sc")}

    <text x={TOP_COMPONENT_X} y={38} textAnchor="middle" fill={LABEL_COLOR} fontSize={11}>
      R1
    </text>
  </>
);

const ReversedLedDiagram = () => (
  <>
    {baseBattery}
    {drawWire(LEFT_X, TOP_Y, TOP_COMPONENT_LEFT_X, TOP_Y, "rl-top-wire-left")}

    <LEDSymbol
      x={TOP_COMPONENT_X}
      y={TOP_Y}
      rotation={180}
      scale={0.95}
      showLabel={false}
      color={COMPONENT_COLOR}
      strokeWidth={2.2}
    />
    {drawWire(TOP_COMPONENT_RIGHT_X, TOP_Y, RIGHT_X, TOP_Y, "rl-top-wire-right")}
    {drawRightResistor("R1", "rl")}
    {drawBottomResistor("R2", "rl")}

    <rect
      x={256}
      y={22}
      width={88}
      height={56}
      rx={8}
      fill="none"
      stroke={FAULT_COLOR}
      strokeDasharray="6 4"
      strokeWidth={1.6}
    />
    <text x={TOP_COMPONENT_X} y={16} textAnchor="middle" fill={FAULT_COLOR} fontSize={10}>
      Fault: LED reversed
    </text>

    {drawCornerNodes("rl")}

    <text x={TOP_COMPONENT_X} y={90} textAnchor="middle" fill={LABEL_COLOR} fontSize={11}>
      LED1
    </text>
  </>
);

// ─── Parallel open-branch diagram ──────────────────────────────────────────
// Textbook-style parallel circuit: battery on left, two vertical branches
// sharing top/bottom rails.  R2's bottom lead is disconnected (open fault).
const PARALLEL_OPEN_LEFT_X = 70;
const PARALLEL_OPEN_RIGHT_X = 530;
const PARALLEL_OPEN_TOP_Y = 48;
const PARALLEL_OPEN_BOTTOM_Y = 172;
const PARALLEL_OPEN_BATTERY_CENTER_Y = (PARALLEL_OPEN_TOP_Y + PARALLEL_OPEN_BOTTOM_Y) / 2;
const PARALLEL_OPEN_BATTERY_TOP_Y = PARALLEL_OPEN_BATTERY_CENTER_Y - 26;
const PARALLEL_OPEN_BATTERY_BOTTOM_Y = PARALLEL_OPEN_BATTERY_CENTER_Y + 26;
const PARALLEL_OPEN_BRANCH_1_X = 260;
const PARALLEL_OPEN_BRANCH_2_X = 390;
// Vertical lead inset from rail to resistor body edge
const PARALLEL_OPEN_LEAD_INSET = 28;
// Half-span of resistor symbol body (used to locate exact wire connection points)
const PARALLEL_OPEN_RES_HALF_SPAN = 30;
const PARALLEL_OPEN_RES_TOP_Y = PARALLEL_OPEN_TOP_Y + PARALLEL_OPEN_LEAD_INSET;
const PARALLEL_OPEN_RES_BOTTOM_Y = PARALLEL_OPEN_BOTTOM_Y - PARALLEL_OPEN_LEAD_INSET;
const PARALLEL_OPEN_RES_TOP_EDGE = PARALLEL_OPEN_RES_TOP_Y + PARALLEL_OPEN_RES_HALF_SPAN;
const PARALLEL_OPEN_RES_BOT_EDGE = PARALLEL_OPEN_RES_BOTTOM_Y - PARALLEL_OPEN_RES_HALF_SPAN;

const ParallelOpenBranchDiagram = () => (
  <>
    {/* Battery on left */}
    {drawWire(PARALLEL_OPEN_LEFT_X, PARALLEL_OPEN_TOP_Y, PARALLEL_OPEN_LEFT_X, PARALLEL_OPEN_BATTERY_TOP_Y, "pb-bat-top")}
    <BatterySymbol
      x={PARALLEL_OPEN_LEFT_X}
      y={PARALLEL_OPEN_BATTERY_CENTER_Y}
      rotation={-90}
      scale={0.92}
      showLabel={false}
      color={WIRE_COLOR}
      strokeWidth={2.8}
    />
    {drawWire(PARALLEL_OPEN_LEFT_X, PARALLEL_OPEN_BATTERY_BOTTOM_Y, PARALLEL_OPEN_LEFT_X, PARALLEL_OPEN_BOTTOM_Y, "pb-bat-bot")}
    <text x={PARALLEL_OPEN_LEFT_X - 26} y={PARALLEL_OPEN_BATTERY_CENTER_Y + 4} textAnchor="middle" fill={LABEL_COLOR} fontSize={11}>B1</text>

    {/* Top rail */}
    {drawWire(PARALLEL_OPEN_LEFT_X, PARALLEL_OPEN_TOP_Y, PARALLEL_OPEN_RIGHT_X, PARALLEL_OPEN_TOP_Y, "pb-top-rail")}
    {/* Bottom rail */}
    {drawWire(PARALLEL_OPEN_LEFT_X, PARALLEL_OPEN_BOTTOM_Y, PARALLEL_OPEN_RIGHT_X, PARALLEL_OPEN_BOTTOM_Y, "pb-bot-rail")}
    {/* Right end cap */}
    {drawWire(PARALLEL_OPEN_RIGHT_X, PARALLEL_OPEN_TOP_Y, PARALLEL_OPEN_RIGHT_X, PARALLEL_OPEN_BOTTOM_Y, "pb-right-cap")}

    {/* Branch 1 (R1) – intact */}
    {drawWire(PARALLEL_OPEN_BRANCH_1_X, PARALLEL_OPEN_TOP_Y, PARALLEL_OPEN_BRANCH_1_X, PARALLEL_OPEN_RES_TOP_Y, "pb-b1-top")}
    <ResistorSymbol x={PARALLEL_OPEN_BRANCH_1_X} y={(PARALLEL_OPEN_RES_TOP_Y + PARALLEL_OPEN_RES_BOTTOM_Y) / 2} rotation={90} scale={1} showLabel={false} color={COMPONENT_COLOR} strokeWidth={2.2} />
    {drawWire(PARALLEL_OPEN_BRANCH_1_X, PARALLEL_OPEN_RES_BOTTOM_Y, PARALLEL_OPEN_BRANCH_1_X, PARALLEL_OPEN_BOTTOM_Y, "pb-b1-bot")}
    {drawNode(PARALLEL_OPEN_BRANCH_1_X, PARALLEL_OPEN_TOP_Y, "pb-node-b1-top")}
    {drawNode(PARALLEL_OPEN_BRANCH_1_X, PARALLEL_OPEN_BOTTOM_Y, "pb-node-b1-bot")}
    <text x={PARALLEL_OPEN_BRANCH_1_X + 22} y={(PARALLEL_OPEN_RES_TOP_Y + PARALLEL_OPEN_RES_BOTTOM_Y) / 2 + 4} textAnchor="start" fill={LABEL_COLOR} fontSize={11}>R1</text>

    {/* Branch 2 (R2) – open fault: bottom lead disconnected */}
    {drawWire(PARALLEL_OPEN_BRANCH_2_X, PARALLEL_OPEN_TOP_Y, PARALLEL_OPEN_BRANCH_2_X, PARALLEL_OPEN_RES_TOP_Y, "pb-b2-top")}
    <ResistorSymbol x={PARALLEL_OPEN_BRANCH_2_X} y={(PARALLEL_OPEN_RES_TOP_Y + PARALLEL_OPEN_RES_BOTTOM_Y) / 2} rotation={90} scale={1} showLabel={false} color={COMPONENT_COLOR} strokeWidth={2.2} />
    {/* Bottom wire stops short – open branch */}
    {drawWire(PARALLEL_OPEN_BRANCH_2_X, PARALLEL_OPEN_RES_BOTTOM_Y, PARALLEL_OPEN_BRANCH_2_X, PARALLEL_OPEN_RES_BOT_EDGE + 18, "pb-b2-partial")}
    {drawNode(PARALLEL_OPEN_BRANCH_2_X, PARALLEL_OPEN_TOP_Y, "pb-node-b2-top")}
    <text x={PARALLEL_OPEN_BRANCH_2_X + 22} y={(PARALLEL_OPEN_RES_TOP_Y + PARALLEL_OPEN_RES_BOTTOM_Y) / 2 + 4} textAnchor="start" fill={LABEL_COLOR} fontSize={11}>R2</text>

    {/* Fault highlight on R2 open bottom */}
    <line
      x1={PARALLEL_OPEN_BRANCH_2_X - 10}
      y1={PARALLEL_OPEN_RES_BOT_EDGE + 20}
      x2={PARALLEL_OPEN_BRANCH_2_X + 10}
      y2={PARALLEL_OPEN_RES_BOT_EDGE + 20}
      stroke={FAULT_COLOR}
      strokeWidth={2.5}
      strokeLinecap="round"
    />
    <text x={PARALLEL_OPEN_BRANCH_2_X + 14} y={PARALLEL_OPEN_RES_BOT_EDGE + 24} fill={FAULT_COLOR} fontSize={10}>open</text>
    <rect x={PARALLEL_OPEN_BRANCH_2_X - 20} y={PARALLEL_OPEN_TOP_Y - 24} width={72} height={PARALLEL_OPEN_BOTTOM_Y - PARALLEL_OPEN_TOP_Y + 32} rx={6} fill="none" stroke={FAULT_COLOR} strokeDasharray="6 4" strokeWidth={1.4} />
    <text x={PARALLEL_OPEN_BRANCH_2_X + 16} y={PARALLEL_OPEN_TOP_Y - 14} fill={FAULT_COLOR} fontSize={10}>Fault: open branch</text>

    {/* Source corner nodes */}
    {drawNode(PARALLEL_OPEN_LEFT_X, PARALLEL_OPEN_TOP_Y, "pb-node-src-top")}
    {drawNode(PARALLEL_OPEN_LEFT_X, PARALLEL_OPEN_BOTTOM_Y, "pb-node-src-bot")}
    {drawNode(PARALLEL_OPEN_RIGHT_X, PARALLEL_OPEN_TOP_Y, "pb-node-right-top")}
    {drawNode(PARALLEL_OPEN_RIGHT_X, PARALLEL_OPEN_BOTTOM_Y, "pb-node-right-bot")}
  </>
);

// ─── Combination circuit open-branch diagram ────────────────────────────────
// Textbook ladder: battery → R1(series) → parallel section (R2 ∥ R3) → back.
// R3 branch has no return wire (open fault in parallel section).
const COMBO_LEFT_X = 70;
const COMBO_RIGHT_X = 530;
const COMBO_TOP_Y = 44;
const COMBO_BOTTOM_Y = 176;
const COMBO_BAT_CENTER_Y = (COMBO_TOP_Y + COMBO_BOTTOM_Y) / 2;
const COMBO_BAT_TOP_Y = COMBO_BAT_CENTER_Y - 26;
const COMBO_BAT_BOT_Y = COMBO_BAT_CENTER_Y + 26;
// Wire inset from corner to start of R1 resistor body
const COMBO_R1_WIRE_INSET = 14;
const COMBO_R1_LEFT_X = COMBO_LEFT_X + COMBO_R1_WIRE_INSET;
const COMBO_R1_CENTER_X = 190;
// Half-span of horizontal resistor symbol body
const COMBO_RES_HALF_SPAN = 30;
const COMBO_R1_RIGHT_X = COMBO_R1_CENTER_X + COMBO_RES_HALF_SPAN;
const COMBO_JUNCTION_LEFT_X = 290;
const COMBO_JUNCTION_RIGHT_X = 430;
const COMBO_BRANCH_R2_X = 310;
const COMBO_BRANCH_R3_X = 410;
// Vertical lead inset from rail to parallel branch resistor body edge
const COMBO_BRANCH_LEAD_INSET = 28;
const COMBO_BRANCH_RES_TOP_Y = COMBO_TOP_Y + COMBO_BRANCH_LEAD_INSET;
const COMBO_BRANCH_RES_BOT_Y = COMBO_BOTTOM_Y - COMBO_BRANCH_LEAD_INSET;

const CombinationOpenBranchDiagram = () => (
  <>
    {/* Battery on left */}
    {drawWire(COMBO_LEFT_X, COMBO_TOP_Y, COMBO_LEFT_X, COMBO_BAT_TOP_Y, "cb-bat-top")}
    <BatterySymbol
      x={COMBO_LEFT_X}
      y={COMBO_BAT_CENTER_Y}
      rotation={-90}
      scale={0.92}
      showLabel={false}
      color={WIRE_COLOR}
      strokeWidth={2.8}
    />
    {drawWire(COMBO_LEFT_X, COMBO_BAT_BOT_Y, COMBO_LEFT_X, COMBO_BOTTOM_Y, "cb-bat-bot")}
    <text x={COMBO_LEFT_X - 26} y={COMBO_BAT_CENTER_Y + 4} textAnchor="middle" fill={LABEL_COLOR} fontSize={11}>B1</text>

    {/* Top rail: battery → R1 → parallel junction left */}
    {drawWire(COMBO_LEFT_X, COMBO_TOP_Y, COMBO_R1_LEFT_X, COMBO_TOP_Y, "cb-top-left")}
    <ResistorSymbol x={COMBO_R1_CENTER_X} y={COMBO_TOP_Y} rotation={0} scale={1} showLabel={false} color={COMPONENT_COLOR} strokeWidth={2.2} />
    {drawWire(COMBO_R1_RIGHT_X, COMBO_TOP_Y, COMBO_JUNCTION_LEFT_X, COMBO_TOP_Y, "cb-top-mid")}
    <text x={COMBO_R1_CENTER_X} y={COMBO_TOP_Y - 14} textAnchor="middle" fill={LABEL_COLOR} fontSize={11}>R1</text>

    {/* Top rail across parallel section */}
    {drawWire(COMBO_JUNCTION_LEFT_X, COMBO_TOP_Y, COMBO_JUNCTION_RIGHT_X, COMBO_TOP_Y, "cb-top-parallel-rail")}
    {/* Bottom rail across parallel section */}
    {drawWire(COMBO_JUNCTION_LEFT_X, COMBO_BOTTOM_Y, COMBO_JUNCTION_RIGHT_X, COMBO_BOTTOM_Y, "cb-bot-parallel-rail")}
    {/* Return wire: right end of parallel → right wall → bottom */}
    {drawWire(COMBO_JUNCTION_RIGHT_X, COMBO_TOP_Y, COMBO_RIGHT_X, COMBO_TOP_Y, "cb-top-right")}
    {drawWire(COMBO_RIGHT_X, COMBO_TOP_Y, COMBO_RIGHT_X, COMBO_BOTTOM_Y, "cb-right-cap")}
    {drawWire(COMBO_RIGHT_X, COMBO_BOTTOM_Y, COMBO_JUNCTION_RIGHT_X, COMBO_BOTTOM_Y, "cb-bot-right")}
    {drawWire(COMBO_JUNCTION_LEFT_X, COMBO_BOTTOM_Y, COMBO_LEFT_X, COMBO_BOTTOM_Y, "cb-bot-left")}

    {/* Branch R2 – intact */}
    {drawWire(COMBO_BRANCH_R2_X, COMBO_TOP_Y, COMBO_BRANCH_R2_X, COMBO_BRANCH_RES_TOP_Y, "cb-r2-top")}
    <ResistorSymbol x={COMBO_BRANCH_R2_X} y={(COMBO_BRANCH_RES_TOP_Y + COMBO_BRANCH_RES_BOT_Y) / 2} rotation={90} scale={1} showLabel={false} color={COMPONENT_COLOR} strokeWidth={2.2} />
    {drawWire(COMBO_BRANCH_R2_X, COMBO_BRANCH_RES_BOT_Y, COMBO_BRANCH_R2_X, COMBO_BOTTOM_Y, "cb-r2-bot")}
    {drawNode(COMBO_BRANCH_R2_X, COMBO_TOP_Y, "cb-node-r2-top")}
    {drawNode(COMBO_BRANCH_R2_X, COMBO_BOTTOM_Y, "cb-node-r2-bot")}
    <text x={COMBO_BRANCH_R2_X - 22} y={(COMBO_BRANCH_RES_TOP_Y + COMBO_BRANCH_RES_BOT_Y) / 2 + 4} textAnchor="end" fill={LABEL_COLOR} fontSize={11}>R2</text>

    {/* Branch R3 – open fault: bottom return wire missing */}
    {drawWire(COMBO_BRANCH_R3_X, COMBO_TOP_Y, COMBO_BRANCH_R3_X, COMBO_BRANCH_RES_TOP_Y, "cb-r3-top")}
    <ResistorSymbol x={COMBO_BRANCH_R3_X} y={(COMBO_BRANCH_RES_TOP_Y + COMBO_BRANCH_RES_BOT_Y) / 2} rotation={90} scale={1} showLabel={false} color={COMPONENT_COLOR} strokeWidth={2.2} />
    {/* Partial bottom wire – deliberately stops short */}
    {drawWire(COMBO_BRANCH_R3_X, COMBO_BRANCH_RES_BOT_Y, COMBO_BRANCH_R3_X, COMBO_BRANCH_RES_BOT_Y + 20, "cb-r3-partial")}
    {drawNode(COMBO_BRANCH_R3_X, COMBO_TOP_Y, "cb-node-r3-top")}
    <text x={COMBO_BRANCH_R3_X + 22} y={(COMBO_BRANCH_RES_TOP_Y + COMBO_BRANCH_RES_BOT_Y) / 2 + 4} textAnchor="start" fill={LABEL_COLOR} fontSize={11}>R3</text>

    {/* Fault highlight */}
    <line x1={COMBO_BRANCH_R3_X - 10} y1={COMBO_BRANCH_RES_BOT_Y + 22} x2={COMBO_BRANCH_R3_X + 10} y2={COMBO_BRANCH_RES_BOT_Y + 22} stroke={FAULT_COLOR} strokeWidth={2.5} strokeLinecap="round" />
    <text x={COMBO_BRANCH_R3_X + 14} y={COMBO_BRANCH_RES_BOT_Y + 26} fill={FAULT_COLOR} fontSize={10}>open</text>
    <rect x={COMBO_BRANCH_R3_X - 20} y={COMBO_TOP_Y - 22} width={72} height={COMBO_BOTTOM_Y - COMBO_TOP_Y + 30} rx={6} fill="none" stroke={FAULT_COLOR} strokeDasharray="6 4" strokeWidth={1.4} />
    <text x={COMBO_BRANCH_R3_X + 16} y={COMBO_TOP_Y - 12} fill={FAULT_COLOR} fontSize={10}>Fault: open R3 branch</text>

    {/* Junction nodes */}
    {drawNode(COMBO_LEFT_X, COMBO_TOP_Y, "cb-src-top")}
    {drawNode(COMBO_LEFT_X, COMBO_BOTTOM_Y, "cb-src-bot")}
    {drawNode(COMBO_JUNCTION_LEFT_X, COMBO_TOP_Y, "cb-jct-top-left")}
    {drawNode(COMBO_JUNCTION_LEFT_X, COMBO_BOTTOM_Y, "cb-jct-bot-left")}
    {drawNode(COMBO_JUNCTION_RIGHT_X, COMBO_TOP_Y, "cb-jct-top-right")}
    {drawNode(COMBO_JUNCTION_RIGHT_X, COMBO_BOTTOM_Y, "cb-jct-bot-right")}
    {drawNode(COMBO_RIGHT_X, COMBO_TOP_Y, "cb-end-top")}
    {drawNode(COMBO_RIGHT_X, COMBO_BOTTOM_Y, "cb-end-bot")}
  </>
);

function renderProblemDiagram(problem: TroubleshootingProblem): JSX.Element {
  switch (problem.diagram) {
    case "switchOpenRect":
      return <OpenSwitchDiagram />;
    case "missingWireRect":
      return <MissingWireDiagram />;
    case "shortCircuitRect":
      return <ShortCircuitDiagram />;
    case "parallelOpenBranch":
      return <ParallelOpenBranchDiagram />;
    case "comboOpenBranch":
      return <CombinationOpenBranchDiagram />;
    case "reversedLedRect":
    default:
      return <ReversedLedDiagram />;
  }
}

export default function TroubleshootCircuitDiagram({
  problem,
}: TroubleshootCircuitDiagramProps) {
  return (
    <div className="troubleshoot-diagram-card" aria-label="Troubleshooting schematic">
      <svg
        className="troubleshoot-diagram-svg"
        viewBox="0 0 600 220"
        role="img"
        aria-label={`${problem.title} diagram`}
        preserveAspectRatio="xMidYMid meet"
      >
        {renderProblemDiagram(problem)}
      </svg>
    </div>
  );
}

