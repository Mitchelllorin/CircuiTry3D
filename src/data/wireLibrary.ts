export type WireMaterialId = "annealedCopper" | "tinnedCopper" | "aluminum1350" | "nichrome80";

export type WireMaterialSpec = {
  id: WireMaterialId;
  label: string;
  conductivityMsPerM: number;
  resistivityOhmMeter: number;
  thermalConductivityWPerMK: number;
  densityKgPerM3: number;
  notes: string;
};

export const WIRE_MATERIALS: Record<WireMaterialId, WireMaterialSpec> = {
  annealedCopper: {
    id: "annealedCopper",
    label: "Annealed Copper (Cu-ETP)",
    conductivityMsPerM: 58,
    resistivityOhmMeter: 1.724e-8,
    thermalConductivityWPerMK: 401,
    densityKgPerM3: 8960,
    notes: "Reference 100% IACS copper used for most power conductors.",
  },
  tinnedCopper: {
    id: "tinnedCopper",
    label: "Tinned Copper",
    conductivityMsPerM: 55,
    resistivityOhmMeter: 1.82e-8,
    thermalConductivityWPerMK: 320,
    densityKgPerM3: 8930,
    notes: "Copper strands with tin flash for corrosion resistance and solderability.",
  },
  aluminum1350: {
    id: "aluminum1350",
    label: "Aluminum 1350",
    conductivityMsPerM: 36,
    resistivityOhmMeter: 2.826e-8,
    thermalConductivityWPerMK: 237,
    densityKgPerM3: 2700,
    notes: "Utility-grade AA-1350 aluminum used in feeders and service drops.",
  },
  nichrome80: {
    id: "nichrome80",
    label: "Nichrome 80",
    conductivityMsPerM: 1.1,
    resistivityOhmMeter: 1.1e-6,
    thermalConductivityWPerMK: 11,
    densityKgPerM3: 8400,
    notes: "High-resistance nickel-chrome alloy for heaters; not for low-loss conductors.",
  },
};

export type WireInsulationId = "pvc80" | "pvc105" | "xlpe125" | "silicone200" | "ptfe260" | "bare1200";

export type WireInsulationClass = {
  id: WireInsulationId;
  label: string;
  maxTemperatureC: number;
  description: string;
};

export const WIRE_INSULATION_CLASSES: Record<WireInsulationId, WireInsulationClass> = {
  pvc80: {
    id: "pvc80",
    label: "PVC 80 °C",
    maxTemperatureC: 80,
    description: "Economical hook-up insulation, 300 V class, easy to strip.",
  },
  pvc105: {
    id: "pvc105",
    label: "PVC 105 °C",
    maxTemperatureC: 105,
    description: "Thicker jacket used on control, welding, and battery cable.",
  },
  xlpe125: {
    id: "xlpe125",
    label: "XLPE 125 °C",
    maxTemperatureC: 125,
    description: "Cross-linked polyethylene (THHN/THWN-2, XHHW) for building wire.",
  },
  silicone200: {
    id: "silicone200",
    label: "Silicone 200 °C",
    maxTemperatureC: 200,
    description: "High-flex, high-temperature insulation for robotics and test leads.",
  },
  ptfe260: {
    id: "ptfe260",
    label: "PTFE 260 °C",
    maxTemperatureC: 260,
    description: "Thin-wall fluoropolymer for aerospace, chemical, and vacuum environments.",
  },
  bare1200: {
    id: "bare1200",
    label: "Bare / Oxide 1200 °C",
    maxTemperatureC: 1200,
    description: "Self-oxide film used on resistance wire that glows red-hot in air.",
  },
};

export type WireSpec = {
  id: string;
  gaugeLabel: string;
  awg: number | null;
  metricAreaMm2: number;
  diameterMm: number;
  material: WireMaterialId;
  materialLabel: string;
  insulationClass: WireInsulationId;
  insulationLabel: string;
  maxTemperatureC: number;
  conductivityMsPerM: number;
  thermalConductivityWPerMK: number;
  resistanceOhmPerKm: number;
  resistanceOhmPerMeter: number;
  massPerKmKg: number;
  ampacityChassisA: number;
  ampacityBundleA: number;
  maxVoltageV: number;
  recommendedUses: string[];
  notes?: string;
};

type WirePreset = {
  id: string;
  gaugeLabel: string;
  awg?: number;
  metricAreaMm2?: number;
  diameterOverrideMm?: number;
  material: WireMaterialId;
  insulationClass: WireInsulationId;
  maxVoltageV: number;
  ampacityChassisA: number;
  ampacityBundleA: number;
  recommendedUses: string[];
  notes?: string;
};

const PRESET_WIRES: WirePreset[] = [
  {
    id: "awg-24-tc-pvc",
    gaugeLabel: "24 AWG (7×32) tinned Cu",
    awg: 24,
    material: "tinnedCopper",
    insulationClass: "pvc80",
    maxVoltageV: 300,
    ampacityChassisA: 0.58,
    ampacityBundleA: 0.3,
    recommendedUses: ["Sensor leads", "Breadboard jumpers", "Low-power signal harnesses"],
    notes: "Ultra-flexible hook-up wire for instrumentation and data lines.",
  },
  {
    id: "awg-22-cu-silicone",
    gaugeLabel: "22 AWG silicone test lead",
    awg: 22,
    material: "annealedCopper",
    insulationClass: "silicone200",
    maxVoltageV: 600,
    ampacityChassisA: 0.92,
    ampacityBundleA: 0.6,
    recommendedUses: ["Test probes", "Robotics harness", "High-cycle drag chains"],
    notes: "Fine-strand copper with a limp 200 °C silicone jacket for lab gear.",
  },
  {
    id: "awg-20-cu-ptfe",
    gaugeLabel: "20 AWG PTFE instrumentation",
    awg: 20,
    material: "annealedCopper",
    insulationClass: "ptfe260",
    maxVoltageV: 600,
    ampacityChassisA: 1.5,
    ampacityBundleA: 1.0,
    recommendedUses: ["Aerospace harness", "Thermocouple extension", "Chemical plants"],
    notes: "Thin-wall PTFE survives solvents, UV, and vacuum bake-outs.",
  },
  {
    id: "awg-18-cu-pvc105",
    gaugeLabel: "18 AWG control wire",
    awg: 18,
    material: "annealedCopper",
    insulationClass: "pvc105",
    maxVoltageV: 300,
    ampacityChassisA: 2.3,
    ampacityBundleA: 1.5,
    recommendedUses: ["PLC I/O", "Lighting leads", "Panel builds"],
    notes: "Stranded MTW/TEW style wire rated 105 °C for cabinets.",
  },
  {
    id: "awg-16-cu-txl",
    gaugeLabel: "16 AWG TXL automotive",
    awg: 16,
    material: "annealedCopper",
    insulationClass: "xlpe125",
    maxVoltageV: 60,
    ampacityChassisA: 3.7,
    ampacityBundleA: 3.0,
    recommendedUses: ["Automotive harness", "LED strings", "Low-voltage DC buses"],
    notes: "Thin-wall cross-linked polyethylene jacket resists fluids under hood.",
  },
  {
    id: "awg-14-cu-thhn",
    gaugeLabel: "14 AWG THHN building",
    awg: 14,
    material: "annealedCopper",
    insulationClass: "xlpe125",
    maxVoltageV: 600,
    ampacityChassisA: 5.9,
    ampacityBundleA: 15,
    recommendedUses: ["Branch circuits", "Lighting runs", "Small appliance feeds"],
    notes: "75/90 °C THHN/THWN-2 conductor, common in conduit.",
  },
  {
    id: "awg-12-cu-thhn",
    gaugeLabel: "12 AWG THHN building",
    awg: 12,
    material: "annealedCopper",
    insulationClass: "xlpe125",
    maxVoltageV: 600,
    ampacityChassisA: 9.3,
    ampacityBundleA: 20,
    recommendedUses: ["20 A branch circuits", "Long lighting homeruns", "Motor control"],
    notes: "Staple feeder size with generous current margin.",
  },
  {
    id: "awg-10-cu-thhn",
    gaugeLabel: "10 AWG THHN building",
    awg: 10,
    material: "annealedCopper",
    insulationClass: "xlpe125",
    maxVoltageV: 600,
    ampacityChassisA: 15,
    ampacityBundleA: 30,
    recommendedUses: ["Water heater feeds", "Long DC buses", "Solar strings"],
    notes: "Lower resistance for long runs and 30 A breakers.",
  },
  {
    id: "awg-8-al-xhhw",
    gaugeLabel: "8 AWG aluminum XHHW",
    awg: 8,
    material: "aluminum1350",
    insulationClass: "xlpe125",
    maxVoltageV: 600,
    ampacityChassisA: 24,
    ampacityBundleA: 40,
    recommendedUses: ["Service feeders", "Load centers", "Solar combiner outputs"],
    notes: "Cost-effective feeder when lugs support aluminum.",
  },
  {
    id: "awg-6-cu-welding",
    gaugeLabel: "6 AWG copper welding cable",
    awg: 6,
    material: "annealedCopper",
    insulationClass: "pvc105",
    maxVoltageV: 600,
    ampacityChassisA: 38,
    ampacityBundleA: 55,
    recommendedUses: ["Battery banks", "Inverters", "Mobile welders"],
    notes: "Fine-strand EPDM/PVC jacket stays flexible in the cold.",
  },
  {
    id: "awg-4-cu-welding",
    gaugeLabel: "4 AWG copper welding cable",
    awg: 4,
    material: "annealedCopper",
    insulationClass: "pvc105",
    maxVoltageV: 600,
    ampacityChassisA: 60,
    ampacityBundleA: 70,
    recommendedUses: ["Starter leads", "DC busbars", "High-current chargers"],
    notes: "Low resistance jumper for <100 A drop-sensitive loads.",
  },
  {
    id: "awg-2-al-battery",
    gaugeLabel: "2 AWG aluminum battery cable",
    awg: 2,
    material: "aluminum1350",
    insulationClass: "pvc105",
    maxVoltageV: 600,
    ampacityChassisA: 95,
    ampacityBundleA: 90,
    recommendedUses: ["EV packs", "Marine DC feeders", "Backup power ties"],
    notes: "Lightweight alternative where lugs accept aluminum.",
  },
  {
    id: "awg-0-cu-bus",
    gaugeLabel: "1/0 AWG copper bus",
    awg: 0,
    material: "annealedCopper",
    insulationClass: "xlpe125",
    maxVoltageV: 600,
    ampacityChassisA: 150,
    ampacityBundleA: 125,
    recommendedUses: ["Battery cabinets", "Large inverters", "Panelboard mains"],
    notes: "Common battery interconnect with low voltage drop.",
  },
  {
    id: "awg-2-0-cu-solar",
    gaugeLabel: "2/0 AWG copper solar feeder",
    awg: -1,
    material: "annealedCopper",
    insulationClass: "xlpe125",
    maxVoltageV: 1000,
    ampacityChassisA: 190,
    ampacityBundleA: 145,
    recommendedUses: ["PV combiner to inverter", "Large UPS feeds"],
    notes: "Often specified for long 100 A+ renewable feeders.",
  },
  {
    id: "awg-4-0-cu-utility",
    gaugeLabel: "4/0 AWG copper utility",
    awg: -3,
    material: "annealedCopper",
    insulationClass: "xlpe125",
    maxVoltageV: 1000,
    ampacityChassisA: 260,
    ampacityBundleA: 195,
    recommendedUses: ["Service-entrance conductors", "High-power DC links"],
    notes: "Largest single-conductor size before transitioning to bus bars.",
  },
  {
    id: "awg-22-nichrome",
    gaugeLabel: "22 AWG nichrome heater",
    awg: 22,
    material: "nichrome80",
    insulationClass: "bare1200",
    maxVoltageV: 0,
    ampacityChassisA: 6,
    ampacityBundleA: 6,
    recommendedUses: ["Foam cutters", "Heating coils", "Load banks"],
    notes: "Designed for red-hot service; expect significant resistive heating.",
  },
];

const round = (value: number, digits = 2): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const awgDiameterMm = (awg: number): number => 0.127 * Math.pow(92, (36 - awg) / 39);

const awgAreaMm2 = (awg: number): number => {
  const diameter = awgDiameterMm(awg);
  return Math.PI * (diameter / 2) ** 2;
};

const computeResistanceOhmPerKm = (areaMm2: number, resistivity: number): number => {
  const areaM2 = areaMm2 * 1e-6;
  if (areaM2 === 0) {
    return 0;
  }
  return resistivity * 1000 / areaM2;
};

const computeMassPerKm = (areaMm2: number, density: number): number => {
  const areaM2 = areaMm2 * 1e-6;
  return density * areaM2 * 1000;
};

const buildWireSpec = (preset: WirePreset): WireSpec => {
  const material = WIRE_MATERIALS[preset.material];
  const insulation = WIRE_INSULATION_CLASSES[preset.insulationClass];

  const metricAreaMm2 =
    typeof preset.metricAreaMm2 === "number"
      ? preset.metricAreaMm2
      : typeof preset.awg === "number"
        ? awgAreaMm2(preset.awg)
        : 0;

  if (metricAreaMm2 <= 0) {
    throw new Error(`Wire preset "${preset.id}" is missing a valid area.`);
  }

  const diameterMm =
    typeof preset.diameterOverrideMm === "number"
      ? preset.diameterOverrideMm
      : typeof preset.awg === "number"
        ? awgDiameterMm(preset.awg)
        : Math.sqrt((metricAreaMm2 * 4) / Math.PI);

  const resistanceOhmPerKm = computeResistanceOhmPerKm(metricAreaMm2, material.resistivityOhmMeter);
  const massPerKmKg = computeMassPerKm(metricAreaMm2, material.densityKgPerM3);

  return {
    id: preset.id,
    gaugeLabel: preset.gaugeLabel,
    awg: typeof preset.awg === "number" ? preset.awg : null,
    metricAreaMm2: round(metricAreaMm2, 3),
    diameterMm: round(diameterMm, 3),
    material: material.id,
    materialLabel: material.label,
    insulationClass: insulation.id,
    insulationLabel: insulation.label,
    maxTemperatureC: insulation.maxTemperatureC,
    conductivityMsPerM: material.conductivityMsPerM,
    thermalConductivityWPerMK: material.thermalConductivityWPerMK,
    resistanceOhmPerKm: round(resistanceOhmPerKm, 3),
    resistanceOhmPerMeter: round(resistanceOhmPerKm / 1000, 5),
    massPerKmKg: round(massPerKmKg, 2),
    ampacityChassisA: preset.ampacityChassisA,
    ampacityBundleA: preset.ampacityBundleA,
    maxVoltageV: preset.maxVoltageV,
    recommendedUses: preset.recommendedUses,
    notes: preset.notes,
  };
};

export const WIRE_LIBRARY: WireSpec[] = PRESET_WIRES.map(buildWireSpec).sort(
  (a, b) => a.metricAreaMm2 - b.metricAreaMm2,
);

export type WireLibraryFilter = {
  material?: WireMaterialId | "any";
  insulationClass?: WireInsulationId | "any";
  minAmpacity?: number;
  search?: string;
};

export function filterWireLibrary(
  { material = "any", insulationClass = "any", minAmpacity = 0, search = "" }: WireLibraryFilter = {},
  library: WireSpec[] = WIRE_LIBRARY,
): WireSpec[] {
  const loweredSearch = search.trim().toLowerCase();

  return library.filter((spec) => {
    if (material !== "any" && spec.material !== material) {
      return false;
    }
    if (insulationClass !== "any" && spec.insulationClass !== insulationClass) {
      return false;
    }
    if (spec.ampacityBundleA < minAmpacity && spec.ampacityChassisA < minAmpacity) {
      return false;
    }
    if (loweredSearch) {
      const haystack = `${spec.gaugeLabel} ${spec.materialLabel} ${spec.notes ?? ""} ${spec.recommendedUses.join(" ")}`.toLowerCase();
      if (!haystack.includes(loweredSearch)) {
        return false;
      }
    }
    return true;
  });
}

export const WIRE_LIBRARY_SUMMARY = {
  minAmpacity: Math.min(...WIRE_LIBRARY.map((spec) => spec.ampacityBundleA)),
  maxAmpacity: Math.max(...WIRE_LIBRARY.map((spec) => spec.ampacityChassisA)),
  minResistance: Math.min(...WIRE_LIBRARY.map((spec) => spec.resistanceOhmPerKm)),
  maxResistance: Math.max(...WIRE_LIBRARY.map((spec) => spec.resistanceOhmPerKm)),
};
