import type { JSX } from "react";
import type { TroubleshootingProblem } from "../../data/troubleshootingProblems";
import {
  BatterySymbol,
  LEDSymbol,
  ResistorSymbol,
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
const BATTERY_CENTER_Y = (TOP_Y + BOTTOM_Y) / 2;
const BATTERY_TOP_Y = BATTERY_CENTER_Y - 26;
const BATTERY_BOTTOM_Y = BATTERY_CENTER_Y + 26;

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
    <line
      x1={LEFT_X}
      y1={TOP_Y}
      x2={LEFT_X}
      y2={BATTERY_TOP_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />
    <BatterySymbol
      x={LEFT_X}
      y={BATTERY_CENTER_Y}
      rotation={-90}
      scale={0.92}
      showLabel={false}
      color={WIRE_COLOR}
      strokeWidth={2.8}
    />
    <line
      x1={LEFT_X}
      y1={BATTERY_BOTTOM_Y}
      x2={LEFT_X}
      y2={BOTTOM_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />
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

const OpenSwitchDiagram = () => (
  <>
    {baseBattery}

    <line
      x1={LEFT_X}
      y1={TOP_Y}
      x2={188}
      y2={TOP_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />

    <circle cx={190} cy={TOP_Y} r={3} fill={COMPONENT_COLOR} />
    <circle cx={236} cy={TOP_Y} r={3} fill={COMPONENT_COLOR} />
    <line
      x1={190}
      y1={TOP_Y}
      x2={226}
      y2={TOP_Y - 18}
      stroke={COMPONENT_COLOR}
      strokeWidth={2.4}
      strokeLinecap="round"
    />

    <line
      x1={236}
      y1={TOP_Y}
      x2={322}
      y2={TOP_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />
    <ResistorSymbol
      x={352}
      y={TOP_Y}
      scale={1}
      showLabel={false}
      color={COMPONENT_COLOR}
      strokeWidth={2.2}
    />
    <line
      x1={382}
      y1={TOP_Y}
      x2={RIGHT_X}
      y2={TOP_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />

    <line
      x1={RIGHT_X}
      y1={TOP_Y}
      x2={RIGHT_X}
      y2={BOTTOM_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />
    <line
      x1={RIGHT_X}
      y1={BOTTOM_Y}
      x2={LEFT_X}
      y2={BOTTOM_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />

    {drawNode(LEFT_X, TOP_Y, "os-tl")}
    {drawNode(RIGHT_X, TOP_Y, "os-tr")}
    {drawNode(RIGHT_X, BOTTOM_Y, "os-br")}
    {drawNode(LEFT_X, BOTTOM_Y, "os-bl")}

    <rect
      x={176}
      y={26}
      width={74}
      height={52}
      rx={8}
      fill="none"
      stroke={FAULT_COLOR}
      strokeDasharray="6 4"
      strokeWidth={1.6}
    />
    <text x={213} y={21} textAnchor="middle" fill={FAULT_COLOR} fontSize={10}>
      Fault: switch open
    </text>

    <text x={213} y={88} textAnchor="middle" fill={LABEL_COLOR} fontSize={11}>
      SW1
    </text>
    <text x={352} y={38} textAnchor="middle" fill={LABEL_COLOR} fontSize={11}>
      R1
    </text>
  </>
);

const MissingWireDiagram = () => (
  <>
    {baseBattery}

    <line
      x1={LEFT_X}
      y1={TOP_Y}
      x2={270}
      y2={TOP_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />
    <ResistorSymbol
      x={300}
      y={TOP_Y}
      scale={1}
      showLabel={false}
      color={COMPONENT_COLOR}
      strokeWidth={2.2}
    />
    <line
      x1={330}
      y1={TOP_Y}
      x2={RIGHT_X}
      y2={TOP_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />

    <line
      x1={RIGHT_X}
      y1={TOP_Y}
      x2={RIGHT_X}
      y2={BOTTOM_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />

    <line
      x1={RIGHT_X}
      y1={BOTTOM_Y}
      x2={330}
      y2={BOTTOM_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />
    <ResistorSymbol
      x={300}
      y={BOTTOM_Y}
      scale={1}
      showLabel={false}
      color={COMPONENT_COLOR}
      strokeWidth={2.2}
    />
    <line
      x1={270}
      y1={BOTTOM_Y}
      x2={150}
      y2={BOTTOM_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />
    <line
      x1={100}
      y1={BOTTOM_Y}
      x2={LEFT_X}
      y2={BOTTOM_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />
    <line
      x1={100}
      y1={BOTTOM_Y}
      x2={150}
      y2={BOTTOM_Y}
      stroke={FAULT_COLOR}
      strokeWidth={2}
      strokeDasharray="6 4"
      strokeLinecap="round"
    />
    <text x={124} y={147} textAnchor="middle" fill={FAULT_COLOR} fontSize={10}>
      Missing wire
    </text>

    {drawNode(LEFT_X, TOP_Y, "mw-tl")}
    {drawNode(RIGHT_X, TOP_Y, "mw-tr")}
    {drawNode(RIGHT_X, BOTTOM_Y, "mw-br")}
    {drawNode(LEFT_X, BOTTOM_Y, "mw-bl")}

    <text x={300} y={38} textAnchor="middle" fill={LABEL_COLOR} fontSize={11}>
      R1
    </text>
    <text x={300} y={186} textAnchor="middle" fill={LABEL_COLOR} fontSize={11}>
      R2
    </text>
  </>
);

const ShortCircuitDiagram = () => (
  <>
    {baseBattery}

    <line
      x1={LEFT_X}
      y1={TOP_Y}
      x2={286}
      y2={TOP_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />
    <ResistorSymbol
      x={316}
      y={TOP_Y}
      scale={1}
      showLabel={false}
      color={COMPONENT_COLOR}
      strokeWidth={2.2}
    />
    <line
      x1={346}
      y1={TOP_Y}
      x2={RIGHT_X}
      y2={TOP_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />
    <line
      x1={RIGHT_X}
      y1={TOP_Y}
      x2={RIGHT_X}
      y2={BOTTOM_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />
    <line
      x1={RIGHT_X}
      y1={BOTTOM_Y}
      x2={LEFT_X}
      y2={BOTTOM_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />

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
      x={LEFT_X + 32}
      y={BATTERY_CENTER_Y}
      fill={FAULT_COLOR}
      fontSize={10}
    >
      Short path
    </text>

    {drawNode(LEFT_X, TOP_Y, "sc-tl")}
    {drawNode(RIGHT_X, TOP_Y, "sc-tr")}
    {drawNode(RIGHT_X, BOTTOM_Y, "sc-br")}
    {drawNode(LEFT_X, BOTTOM_Y, "sc-bl")}

    <text x={316} y={38} textAnchor="middle" fill={LABEL_COLOR} fontSize={11}>
      R1
    </text>
  </>
);

const ReversedLedDiagram = () => (
  <>
    {baseBattery}

    <line
      x1={LEFT_X}
      y1={TOP_Y}
      x2={210}
      y2={TOP_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />

    <LEDSymbol
      x={240}
      y={TOP_Y}
      rotation={180}
      scale={0.95}
      showLabel={false}
      color={COMPONENT_COLOR}
      strokeWidth={2.2}
    />
    <line
      x1={270}
      y1={TOP_Y}
      x2={340}
      y2={TOP_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />
    <ResistorSymbol
      x={370}
      y={TOP_Y}
      scale={1}
      showLabel={false}
      color={COMPONENT_COLOR}
      strokeWidth={2.2}
    />
    <line
      x1={400}
      y1={TOP_Y}
      x2={RIGHT_X}
      y2={TOP_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />

    <line
      x1={RIGHT_X}
      y1={TOP_Y}
      x2={RIGHT_X}
      y2={BOTTOM_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />
    <line
      x1={RIGHT_X}
      y1={BOTTOM_Y}
      x2={LEFT_X}
      y2={BOTTOM_Y}
      stroke={WIRE_COLOR}
      strokeWidth={WIRE_STROKE}
      strokeLinecap="round"
    />

    <rect
      x={205}
      y={22}
      width={70}
      height={56}
      rx={8}
      fill="none"
      stroke={FAULT_COLOR}
      strokeDasharray="6 4"
      strokeWidth={1.6}
    />
    <text x={240} y={16} textAnchor="middle" fill={FAULT_COLOR} fontSize={10}>
      Fault: LED reversed
    </text>

    {drawNode(LEFT_X, TOP_Y, "rl-tl")}
    {drawNode(RIGHT_X, TOP_Y, "rl-tr")}
    {drawNode(RIGHT_X, BOTTOM_Y, "rl-br")}
    {drawNode(LEFT_X, BOTTOM_Y, "rl-bl")}

    <text x={240} y={90} textAnchor="middle" fill={LABEL_COLOR} fontSize={11}>
      LED1
    </text>
    <text x={370} y={38} textAnchor="middle" fill={LABEL_COLOR} fontSize={11}>
      R1
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

