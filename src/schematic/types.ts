export type Vec2 = {
  x: number;
  z: number;
};

export type Orientation = "horizontal" | "vertical";

export type ComponentKind =
  | "battery"
  | "resistor"
  | "capacitor"
  | "inductor"
  | "lamp"
  | "switch"
  | "diode"
  | "bjt"
  | "ground"
  | "wire";

export type TwoTerminalComponentKind =
  | "battery"
  | "resistor"
  | "capacitor"
  | "inductor"
  | "lamp"
  | "switch"
  | "diode";

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

export type ThreeTerminalElement = BaseElement & {
  kind: "bjt";
  label: string;
  collector: Vec2;
  base: Vec2;
  emitter: Vec2;
  orientation: Orientation;
  transistorType: "npn" | "pnp";
};

export type SchematicElement = TwoTerminalElement | WireElement | GroundElement | ThreeTerminalElement;

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
