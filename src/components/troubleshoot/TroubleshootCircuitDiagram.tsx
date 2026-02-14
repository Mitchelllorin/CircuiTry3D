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

function renderProblemDiagram(problem: TroubleshootingProblem): JSX.Element {
  switch (problem.diagram) {
    case "switchOpenRect":
      return <OpenSwitchDiagram />;
    case "missingWireRect":
      return <MissingWireDiagram />;
    case "shortCircuitRect":
      return <ShortCircuitDiagram />;
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

