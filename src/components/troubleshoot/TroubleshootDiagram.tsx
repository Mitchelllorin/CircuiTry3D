import type { JSX } from "react";
import type { TroubleshootSchematic, TroubleshootSchematicComponent } from "../../data/troubleshootingProblems";
import { ResistorSymbol, BatterySymbol, SwitchSymbol, LEDSymbol } from "../circuit/SchematicSymbols";
import {
  SCHEMATIC_COLORS,
  STROKE_WIDTHS,
  NODE_DIMENSIONS,
  RESISTOR_SPECS,
  CIRCUIT_LAYOUT_2D,
  LABEL_SPECS,
} from "../../schematic/visualConstants";

type TroubleshootDiagramProps = {
  schematic: TroubleshootSchematic;
};

// Visual constants
const WIRE_COLOR = SCHEMATIC_COLORS.wire;
const COMPONENT_STROKE = SCHEMATIC_COLORS.componentStroke;
const LABEL_COLOR = SCHEMATIC_COLORS.labelPrimary;
const NODE_FILL = SCHEMATIC_COLORS.nodeFill;
const NODE_STROKE = SCHEMATIC_COLORS.nodeStroke;
const WIRE_STROKE_WIDTH = STROKE_WIDTHS.wire;
const NODE_RADIUS = NODE_DIMENSIONS.radius2D;

// Fault colors
const FAULT_COLOR = "#FF6B6B";
const WARNING_COLOR = "#FFB347";

type Point = { x: number; y: number };

// Draw a junction node
const drawNode = ({ x, y }: Point, key?: string) => (
  <circle
    key={key}
    cx={x}
    cy={y}
    r={NODE_RADIUS}
    fill={NODE_FILL}
    stroke={NODE_STROKE}
    strokeWidth={STROKE_WIDTHS.nodeStroke}
  />
);

// Draw a wire segment
const drawWire = (start: Point, end: Point, key: string, dashed = false, color: string = WIRE_COLOR) => (
  <line
    key={key}
    x1={start.x}
    y1={start.y}
    x2={end.x}
    y2={end.y}
    stroke={color}
    strokeWidth={WIRE_STROKE_WIDTH}
    strokeDasharray={dashed ? "6,4" : undefined}
  />
);

/**
 * Draw a battery using the standard BatterySymbol component (CircuiTry3D standard).
 *
 * Uses the centralized BatterySymbol with proper ANSI/IEEE plates and polarity
 * markers, rotated -90° for vertical orientation on the left side of the square loop.
 * Matches the practice section and logo rendering.
 */
const BATTERY_SCALE = 0.85;
const BATTERY_HALF_SPAN = 30 * BATTERY_SCALE; // Lead wire extent after scaling

const drawBatteryStandard = (x: number, y: number, label: string, key: string) => {
  return (
    <g key={key}>
      <BatterySymbol
        x={x}
        y={y}
        rotation={-90}
        scale={BATTERY_SCALE}
        label=""
        showLabel={false}
        color={SCHEMATIC_COLORS.wire}
        strokeWidth={STROKE_WIDTHS.componentDetail}
      />
      {/* Label to the left of the battery */}
      <text
        x={x - 28}
        y={y + 4}
        textAnchor="middle"
        fontSize={LABEL_SPECS.componentLabelSize}
        fontWeight={LABEL_SPECS.labelWeight}
        fill={LABEL_COLOR}
      >
        {label}
      </text>
    </g>
  );
};

/**
 * Draw a resistor using the standard ResistorSymbol component (CircuiTry3D standard).
 *
 * Uses the centralized ResistorSymbol with the standard 3-peak zigzag pattern
 * and lead wires, matching all other circuit diagrams in the app.
 */
const drawResistor = (x: number, y: number, label: string, key: string, orientation: "horizontal" | "vertical", fault?: string) => {
  const color = fault ? FAULT_COLOR : COMPONENT_STROKE;
  const rotation = orientation === "vertical" ? 90 : 0;

  return (
    <g key={key}>
      <ResistorSymbol
        x={x}
        y={y}
        rotation={rotation}
        scale={1}
        label={label}
        showLabel={true}
        labelOffset={-18}
        color={color}
        strokeWidth={STROKE_WIDTHS.wireSvgSymbol}
      />
      {fault && (
        <text
          x={orientation === "vertical" ? x + RESISTOR_SPECS.totalHalfSpan + 4 : x}
          y={orientation === "vertical" ? y + 4 : y + 24}
          textAnchor={orientation === "vertical" ? "start" : "middle"}
          fontSize="9"
          fill={FAULT_COLOR}
        >
          ({fault})
        </text>
      )}
    </g>
  );
};

/**
 * Draw a switch using the standard SwitchSymbol component (CircuiTry3D standard).
 *
 * Uses the centralized SwitchSymbol with proper contact circles, lead wires,
 * and blade position (open/closed), matching all other circuit diagrams in the app.
 */
const drawSwitch = (x: number, y: number, label: string, key: string, isOpen = false, orientation: "horizontal" | "vertical" = "horizontal") => {
  const color = isOpen ? FAULT_COLOR : COMPONENT_STROKE;
  const rotation = orientation === "vertical" ? 90 : 0;

  return (
    <g key={key}>
      <SwitchSymbol
        x={x}
        y={y}
        rotation={rotation}
        scale={1}
        label={label}
        showLabel={true}
        labelOffset={-18}
        color={color}
        strokeWidth={STROKE_WIDTHS.wireSvgSymbol}
        {...{ isOpen }}
      />
      {isOpen && (
        <text
          x={orientation === "vertical" ? x + RESISTOR_SPECS.totalHalfSpan + 4 : x}
          y={orientation === "vertical" ? y + 4 : y + 18}
          textAnchor={orientation === "vertical" ? "start" : "middle"}
          fontSize="9"
          fill={FAULT_COLOR}
        >
          (open)
        </text>
      )}
    </g>
  );
};

/**
 * Draw an LED using the standard LEDSymbol component (CircuiTry3D standard).
 *
 * Uses the centralized LEDSymbol with proper diode body (filled triangle),
 * cathode bar, and light emission arrows, matching all other circuit diagrams.
 * A reversed LED is rendered with 180° rotation to indicate wrong polarity.
 */
const drawLED = (x: number, y: number, label: string, key: string, reversed = false, orientation: "horizontal" | "vertical" = "horizontal") => {
  const color = reversed ? FAULT_COLOR : COMPONENT_STROKE;
  // Base rotation for orientation; add 180° if reversed
  const baseRotation = orientation === "vertical" ? 90 : 0;
  const rotation = reversed ? baseRotation + 180 : baseRotation;

  return (
    <g key={key}>
      <LEDSymbol
        x={x}
        y={y}
        rotation={rotation}
        scale={1}
        label={label}
        showLabel={!reversed}
        labelOffset={-26}
        color={color}
        strokeWidth={STROKE_WIDTHS.wireSvgSymbol}
      />
      {reversed && (
        <>
          {/* Show label manually since the rotated label would be upside down */}
          <text
            x={orientation === "vertical" ? x + RESISTOR_SPECS.totalHalfSpan + 4 : x}
            y={orientation === "vertical" ? y - 8 : y - 26}
            textAnchor={orientation === "vertical" ? "start" : "middle"}
            fontSize={LABEL_SPECS.componentLabelSize}
            fontWeight={LABEL_SPECS.labelWeight}
            fill={LABEL_COLOR}
          >
            {label}
          </text>
          <text
            x={orientation === "vertical" ? x + RESISTOR_SPECS.totalHalfSpan + 4 : x}
            y={orientation === "vertical" ? y + 8 : y + 24}
            textAnchor={orientation === "vertical" ? "start" : "middle"}
            fontSize="9"
            fill={FAULT_COLOR}
          >
            (reversed)
          </text>
        </>
      )}
    </g>
  );
};

// Draw missing wire indicator
const drawMissingWire = (x: number, y: number, key: string) => (
  <g key={key}>
    {/* Dashed line indicating missing connection */}
    <line
      x1={x - 20}
      y1={y}
      x2={x + 20}
      y2={y}
      stroke={FAULT_COLOR}
      strokeWidth={2}
      strokeDasharray="6,4"
    />
    {/* X mark */}
    <line x1={x - 6} y1={y - 6} x2={x + 6} y2={y + 6} stroke={FAULT_COLOR} strokeWidth={2} />
    <line x1={x + 6} y1={y - 6} x2={x - 6} y2={y + 6} stroke={FAULT_COLOR} strokeWidth={2} />
    <text x={x} y={y + 18} textAnchor="middle" fontSize="9" fill={FAULT_COLOR}>
      (missing)
    </text>
  </g>
);

// Draw short circuit indicator
const drawShortCircuit = (x: number, y: number, key: string) => (
  <g key={key}>
    {/* Thick warning wire */}
    <line
      x1={x - 25}
      y1={y}
      x2={x + 25}
      y2={y}
      stroke={WARNING_COLOR}
      strokeWidth={4}
    />
    {/* Warning symbol */}
    <polygon
      points={`${x},${y - 18} ${x - 10},${y - 2} ${x + 10},${y - 2}`}
      fill="none"
      stroke={WARNING_COLOR}
      strokeWidth={2}
    />
    <text x={x} y={y - 6} textAnchor="middle" fontSize="10" fontWeight="bold" fill={WARNING_COLOR}>
      !
    </text>
    <text x={x} y={y + 18} textAnchor="middle" fontSize="9" fill={WARNING_COLOR}>
      (short)
    </text>
  </g>
);

/**
 * Render a series circuit using the standard educational square loop layout:
 * - Battery on LEFT (plates perpendicular to wire path)
 * - Component(s) on TOP, RIGHT, BOTTOM (following current flow)
 * - Wire connections along the square loop
 *
 * CircuiTry3D Standard: All circuits have 4 components (battery + 3 others).
 */
const renderSeriesCircuit = (components: TroubleshootSchematicComponent[]) => {
  const elements: JSX.Element[] = [];
  const layout = CIRCUIT_LAYOUT_2D;
  const { corners, positions, viewBox } = layout;

  // Separate battery from other components
  const battery = components.find(c => c.type === "battery");
  const otherComponents = components.filter(c => c.type !== "battery" && c.type !== "wire");
  const wireComponents = components.filter(c => c.type === "wire");

  // Draw battery on the LEFT side using the standard BatterySymbol
  if (battery) {
    elements.push(drawBatteryStandard(positions.battery.x, positions.battery.y, battery.label, `battery-${battery.id}`));
  }

  // Build a map of which positions have components
  const positionMap: Record<string, { comp: TroubleshootSchematicComponent; orientation: "horizontal" | "vertical" }> = {};

  // First, assign components that have explicit positions
  otherComponents.forEach((comp) => {
    if (comp.position && comp.position !== "left") {
      const orientation = comp.position === "right" ? "vertical" : "horizontal";
      positionMap[comp.position] = { comp, orientation };
    }
  });

  // Then, assign remaining components to available positions
  const availablePositions = ["top", "right", "bottom"];
  let posIndex = 0;
  otherComponents.forEach((comp) => {
    if (!comp.position || comp.position === "left") {
      // Find next available position
      while (posIndex < availablePositions.length && positionMap[availablePositions[posIndex]]) {
        posIndex++;
      }
      if (posIndex < availablePositions.length) {
        const pos = availablePositions[posIndex];
        const orientation = pos === "right" ? "vertical" : "horizontal";
        positionMap[pos] = { comp, orientation };
        posIndex++;
      }
    }
  });

  // Track which positions have components and their fault status for wire routing
  const hasTop = !!positionMap["top"];
  const hasRight = !!positionMap["right"];
  const hasBottom = !!positionMap["bottom"];

  // Check for missing/short faults in any position
  const bottomFault = positionMap["bottom"]?.comp.fault;

  // Draw components at their assigned positions
  Object.entries(positionMap).forEach(([posKey, { comp, orientation }]) => {
    const pos = positions[posKey as keyof typeof positions];
    if (!pos) return;

    // Skip drawing if component is "missing" (show missing wire indicator instead)
    if (comp.fault === "missing") {
      elements.push(drawMissingWire(pos.x, pos.y, `comp-${comp.id}`));
      return;
    }

    switch (comp.type) {
      case "resistor":
        // Handle short fault - draw resistor with warning indicator
        if (comp.fault === "short") {
          elements.push(drawShortCircuit(pos.x, pos.y, `comp-${comp.id}`));
        } else {
          elements.push(drawResistor(pos.x, pos.y, comp.label, `comp-${comp.id}`, orientation, comp.fault));
        }
        break;
      case "switch":
        elements.push(drawSwitch(pos.x, pos.y, comp.label, `comp-${comp.id}`, comp.fault === "open", orientation));
        break;
      case "led":
        elements.push(drawLED(pos.x, pos.y, comp.label, `comp-${comp.id}`, comp.fault === "reversed", orientation));
        break;
    }
  });

  // Handle wire fault indicators (missing, short) - legacy support
  wireComponents.forEach((comp) => {
    if (comp.fault === "missing") {
      // For missing wire, show at bottom rail (return path)
      const missingPos = { x: (corners.bottomLeft.x + corners.bottomRight.x) / 2, y: corners.bottomLeft.y };
      elements.push(drawMissingWire(missingPos.x, missingPos.y, `comp-${comp.id}`));
    } else if (comp.fault === "short") {
      // For short circuit, show direct connection across battery
      elements.push(drawShortCircuit(positions.battery.x, positions.battery.y, `comp-${comp.id}`));
    }
  });

  // Draw wires connecting the square loop
  // The wire path follows: Battery+ → TL → TOP → TR → RIGHT → BR → BOTTOM → BL → Battery-

  // Standard BatterySymbol with rotation=-90 and scale=0.85 has lead tips at y ± BATTERY_HALF_SPAN from center
  const batteryLeadExtent = BATTERY_HALF_SPAN;

  // All standard symbols have lead wires extending to ±totalHalfSpan (30) from center.
  // This is the CircuiTry3D standard: every component symbol uses the same span.
  const getComponentOffset = (_posKey: string): number => {
    return RESISTOR_SPECS.totalHalfSpan; // 30 for all standard symbols
  };

  // Wire from battery positive lead tip (top) to top-left corner
  elements.push(drawWire(
    { x: positions.battery.x, y: positions.battery.y - batteryLeadExtent },
    { x: positions.battery.x, y: corners.topLeft.y },
    "wire-battery-to-tl-v"
  ));
  elements.push(drawWire(
    { x: positions.battery.x, y: corners.topLeft.y },
    corners.topLeft,
    "wire-battery-to-tl-h"
  ));

  // Wire from TL corner to top component (or directly to TR if no top component)
  if (hasTop) {
    const topOffset = getComponentOffset("top");
    elements.push(drawWire(
      corners.topLeft,
      { x: positions.top.x - topOffset, y: corners.topLeft.y },
      "wire-tl-to-top"
    ));
    elements.push(drawWire(
      { x: positions.top.x + topOffset, y: corners.topRight.y },
      corners.topRight,
      "wire-top-to-tr"
    ));
  } else {
    elements.push(drawWire(corners.topLeft, corners.topRight, "wire-tl-to-tr"));
  }

  // Wire from TR corner to right component (or directly to BR if no right component)
  if (hasRight) {
    const rightOffset = getComponentOffset("right");
    elements.push(drawWire(
      corners.topRight,
      { x: corners.topRight.x, y: positions.right.y - rightOffset },
      "wire-tr-to-right"
    ));
    elements.push(drawWire(
      { x: corners.bottomRight.x, y: positions.right.y + rightOffset },
      corners.bottomRight,
      "wire-right-to-br"
    ));
  } else {
    elements.push(drawWire(corners.topRight, corners.bottomRight, "wire-tr-to-br"));
  }

  // Wire from BR corner to bottom component (or directly to BL if no bottom component)
  if (hasBottom) {
    const bottomOffset = getComponentOffset("bottom");
    elements.push(drawWire(
      corners.bottomRight,
      { x: positions.bottom.x + bottomOffset, y: corners.bottomRight.y },
      "wire-br-to-bottom"
    ));
    elements.push(drawWire(
      { x: positions.bottom.x - bottomOffset, y: corners.bottomLeft.y },
      corners.bottomLeft,
      "wire-bottom-to-bl"
    ));
  } else {
    elements.push(drawWire(corners.bottomRight, corners.bottomLeft, "wire-br-to-bl"));
  }

  // Wire from BL corner to battery negative lead tip (check for missing component faults)
  const hasMissingWire = wireComponents.some(c => c.fault === "missing");
  const hasMissingComponent = bottomFault === "missing";

  if (!hasMissingWire && !hasMissingComponent) {
    elements.push(drawWire(
      corners.bottomLeft,
      { x: positions.battery.x, y: corners.bottomLeft.y },
      "wire-bl-to-battery-h"
    ));
    elements.push(drawWire(
      { x: positions.battery.x, y: corners.bottomLeft.y },
      { x: positions.battery.x, y: positions.battery.y + batteryLeadExtent },
      "wire-bl-to-battery-v"
    ));
  } else {
    // Draw dashed wire to indicate missing connection
    elements.push(drawWire(
      corners.bottomLeft,
      { x: positions.battery.x, y: corners.bottomLeft.y },
      "wire-bl-to-battery-missing-h",
      true,
      FAULT_COLOR
    ));
    elements.push(drawWire(
      { x: positions.battery.x, y: corners.bottomLeft.y },
      { x: positions.battery.x, y: positions.battery.y + batteryLeadExtent },
      "wire-bl-to-battery-missing-v",
      true,
      FAULT_COLOR
    ));
  }

  // Draw corner nodes
  elements.push(drawNode(corners.topLeft, "node-tl"));
  elements.push(drawNode(corners.topRight, "node-tr"));
  elements.push(drawNode(corners.bottomRight, "node-br"));
  elements.push(drawNode(corners.bottomLeft, "node-bl"));

  return (
    <svg
      viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
      className="troubleshoot-diagram"
      role="img"
      aria-label="Circuit schematic diagram showing the troubleshooting problem"
    >
      <defs>
        <filter id="ts-glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {elements}
    </svg>
  );
};

export function TroubleshootDiagram({ schematic }: TroubleshootDiagramProps) {
  if (schematic.topology === "series") {
    return renderSeriesCircuit(schematic.components);
  }

  // Fallback for parallel (can be expanded later)
  return renderSeriesCircuit(schematic.components);
}

export default TroubleshootDiagram;
