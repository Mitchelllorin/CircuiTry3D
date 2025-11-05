import type { SymbolStandard } from "./types";

export type SymbolStandardMeta = {
  value: SymbolStandard;
  label: string;
  description: string;
  references: string[];
};

export const DEFAULT_SYMBOL_STANDARD: SymbolStandard = "ansi-ieee";

export const SYMBOL_STANDARD_OPTIONS: SymbolStandardMeta[] = [
  {
    value: "ansi-ieee",
    label: "ANSI / IEEE Std 315",
    description: "North American zig-zag resistor profile with classic plate, coil, and switch shapes.",
    references: ["ANSI Y32.2", "IEEE Std 315"],
  },
  {
    value: "iec",
    label: "IEC 60617",
    description: "International rectangular resistor profile aligned with IEC graphical symbol library.",
    references: ["IEC 60617"],
  },
];

export const isSymbolStandard = (candidate: string | null | undefined): candidate is SymbolStandard =>
  candidate === "ansi-ieee" || candidate === "iec";
