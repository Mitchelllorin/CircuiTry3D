export type Vec2 = {
  x: number;
  z: number;
};

export type Orientation = "horizontal" | "vertical";

export type SymbolStandard = "ansi-ieee" | "iec";

export type ComponentKind =
  | "battery"
  | "resistor"
  | "capacitor"
  | "inductor"
  | "lamp"
  | "switch"
  | "ground"
  | "wire";

export type TwoTerminalComponentKind =
  | "battery"
  | "resistor"
  | "capacitor"
  | "inductor"
  | "lamp"
  | "switch";

export type SingleNodeComponentKind = "ground";

export type WireComponentKind = "wire";

export type CatalogPlacementMode = "single-point" | "two-point";

export type CatalogEntry = {
  id: string;
  kind: ComponentKind;
  name: string;
  description: string;
  placement: CatalogPlacementMode;
  icon: string;
  defaultLabelPrefix?: string;
  tags?: string[];
};

type BaseElement = {
  id: string;
  kind: ComponentKind;
};

export type TwoTerminalElement = BaseElement & {
  kind: TwoTerminalComponentKind;
  label: string;
  start: Vec2;
  end: Vec2;
  orientation: Orientation;
};

export type WireElement = BaseElement & {
  kind: WireComponentKind;
  path: Vec2[];
};

export type GroundElement = BaseElement & {
  kind: SingleNodeComponentKind;
  position: Vec2;
  orientation: Orientation;
};

export type SchematicElement = TwoTerminalElement | WireElement | GroundElement;

export type ElementTerminal = {
  elementId: string;
  kind: ComponentKind;
  point: Vec2;
};

export type BoardLimits = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};
