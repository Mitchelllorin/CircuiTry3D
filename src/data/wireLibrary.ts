export type WireMaterialId =
  | "annealedCopper"
  | "tinnedCopper"
  | "oxygenFreeCopper"
  | "silverPlatedCopper"
  | "aluminum1350"
  | "aluminumAA8000"
  | "copperCladAluminum"
  | "nichrome80"
  | "constantan"
  | "kanthalA1"
  | "stainlessSteel316"
  | "silverSolid";

export type WireMaterialSpec = {
  id: WireMaterialId;
  label: string;
  conductivityMsPerM: number;
  resistivityOhmMeter: number;
  thermalConductivityWPerMK: number;
  densityKgPerM3: number;
  temperatureCoefficientPerC: number;
  tensileStrengthMPa: number;
  category: "conductor" | "resistance" | "specialty";
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
    temperatureCoefficientPerC: 0.00393,
    tensileStrengthMPa: 220,
    category: "conductor",
    notes: "Reference 100% IACS copper used for most power conductors.",
  },
  tinnedCopper: {
    id: "tinnedCopper",
    label: "Tinned Copper",
    conductivityMsPerM: 55,
    resistivityOhmMeter: 1.82e-8,
    thermalConductivityWPerMK: 320,
    densityKgPerM3: 8930,
    temperatureCoefficientPerC: 0.00393,
    tensileStrengthMPa: 220,
    category: "conductor",
    notes: "Copper strands with tin flash for corrosion resistance and solderability.",
  },
  oxygenFreeCopper: {
    id: "oxygenFreeCopper",
    label: "Oxygen-Free Copper (OFC)",
    conductivityMsPerM: 58.5,
    resistivityOhmMeter: 1.71e-8,
    thermalConductivityWPerMK: 401,
    densityKgPerM3: 8940,
    temperatureCoefficientPerC: 0.00393,
    tensileStrengthMPa: 250,
    category: "conductor",
    notes: "High-purity 99.99% copper for audio, RF, and vacuum applications.",
  },
  silverPlatedCopper: {
    id: "silverPlatedCopper",
    label: "Silver-Plated Copper",
    conductivityMsPerM: 60,
    resistivityOhmMeter: 1.67e-8,
    thermalConductivityWPerMK: 410,
    densityKgPerM3: 9000,
    temperatureCoefficientPerC: 0.0038,
    tensileStrengthMPa: 230,
    category: "conductor",
    notes: "Superior conductivity with oxidation resistance for RF and aerospace.",
  },
  aluminum1350: {
    id: "aluminum1350",
    label: "Aluminum 1350",
    conductivityMsPerM: 36,
    resistivityOhmMeter: 2.826e-8,
    thermalConductivityWPerMK: 237,
    densityKgPerM3: 2700,
    temperatureCoefficientPerC: 0.00403,
    tensileStrengthMPa: 55,
    category: "conductor",
    notes: "Utility-grade AA-1350 aluminum used in feeders and service drops.",
  },
  aluminumAA8000: {
    id: "aluminumAA8000",
    label: "Aluminum AA-8000 Series",
    conductivityMsPerM: 34,
    resistivityOhmMeter: 2.94e-8,
    thermalConductivityWPerMK: 230,
    densityKgPerM3: 2710,
    temperatureCoefficientPerC: 0.00403,
    tensileStrengthMPa: 110,
    category: "conductor",
    notes: "Modern alloy per NEC 310.14 with improved creep resistance for branch circuits.",
  },
  copperCladAluminum: {
    id: "copperCladAluminum",
    label: "Copper-Clad Aluminum (CCA)",
    conductivityMsPerM: 40,
    resistivityOhmMeter: 2.5e-8,
    thermalConductivityWPerMK: 250,
    densityKgPerM3: 3600,
    temperatureCoefficientPerC: 0.004,
    tensileStrengthMPa: 150,
    category: "conductor",
    notes: "Copper-skinned aluminum for weight savings with copper termination compatibility.",
  },
  nichrome80: {
    id: "nichrome80",
    label: "Nichrome 80",
    conductivityMsPerM: 1.1,
    resistivityOhmMeter: 1.1e-6,
    thermalConductivityWPerMK: 11,
    densityKgPerM3: 8400,
    temperatureCoefficientPerC: 0.0001,
    tensileStrengthMPa: 700,
    category: "resistance",
    notes: "High-resistance nickel-chrome alloy for heaters; not for low-loss conductors.",
  },
  constantan: {
    id: "constantan",
    label: "Constantan (Cu55/Ni45)",
    conductivityMsPerM: 2.0,
    resistivityOhmMeter: 4.9e-7,
    thermalConductivityWPerMK: 20,
    densityKgPerM3: 8900,
    temperatureCoefficientPerC: 0.00002,
    tensileStrengthMPa: 450,
    category: "resistance",
    notes: "Near-zero temperature coefficient for precision resistors and thermocouples.",
  },
  kanthalA1: {
    id: "kanthalA1",
    label: "Kanthal A-1 (FeCrAl)",
    conductivityMsPerM: 0.72,
    resistivityOhmMeter: 1.39e-6,
    thermalConductivityWPerMK: 11,
    densityKgPerM3: 7100,
    temperatureCoefficientPerC: 0.00005,
    tensileStrengthMPa: 670,
    category: "resistance",
    notes: "Iron-chrome-aluminum alloy rated to 1400 °C for furnace elements.",
  },
  stainlessSteel316: {
    id: "stainlessSteel316",
    label: "Stainless Steel 316",
    conductivityMsPerM: 1.35,
    resistivityOhmMeter: 7.4e-7,
    thermalConductivityWPerMK: 16,
    densityKgPerM3: 8000,
    temperatureCoefficientPerC: 0.001,
    tensileStrengthMPa: 580,
    category: "specialty",
    notes: "Marine-grade stainless for corrosive environments and structural conductors.",
  },
  silverSolid: {
    id: "silverSolid",
    label: "Fine Silver (Ag 99.9%)",
    conductivityMsPerM: 63,
    resistivityOhmMeter: 1.59e-8,
    thermalConductivityWPerMK: 429,
    densityKgPerM3: 10490,
    temperatureCoefficientPerC: 0.0038,
    tensileStrengthMPa: 140,
    category: "specialty",
    notes: "Highest conductivity metal for RF contacts, fuse elements, and lab reference.",
  },
};

export type WireInsulationId =
  | "pvc80"
  | "pvc105"
  | "xlpe125"
  | "silicone200"
  | "ptfe260"
  | "bare1200"
  | "epdm150"
  | "tpe105"
  | "fiberglass482"
  | "kapton400"
  | "neoprene90";

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
  epdm150: {
    id: "epdm150",
    label: "EPDM 150 °C",
    maxTemperatureC: 150,
    description: "Ethylene propylene rubber for welding cable and outdoor exposure.",
  },
  tpe105: {
    id: "tpe105",
    label: "TPE 105 °C",
    maxTemperatureC: 105,
    description: "Thermoplastic elastomer for flexible cords and appliance wiring.",
  },
  fiberglass482: {
    id: "fiberglass482",
    label: "Fiberglass 482 °C",
    maxTemperatureC: 482,
    description: "Braided glass sleeving for furnace and kiln wiring.",
  },
  kapton400: {
    id: "kapton400",
    label: "Kapton 400 °C",
    maxTemperatureC: 400,
    description: "Polyimide film for aerospace, cryogenic, and extreme environments.",
  },
  neoprene90: {
    id: "neoprene90",
    label: "Neoprene 90 °C",
    maxTemperatureC: 90,
    description: "Oil-resistant rubber for industrial portable cords and mining cable.",
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
  // OFC and silver-plated specialty wires
  {
    id: "awg-18-ofc-silicone",
    gaugeLabel: "18 AWG OFC audio",
    awg: 18,
    material: "oxygenFreeCopper",
    insulationClass: "silicone200",
    maxVoltageV: 300,
    ampacityChassisA: 2.5,
    ampacityBundleA: 1.8,
    recommendedUses: ["Hi-fi speaker leads", "Studio interconnects", "Audiophile builds"],
    notes: "Oxygen-free copper minimizes signal degradation in audio applications.",
  },
  {
    id: "awg-20-silver-ptfe",
    gaugeLabel: "20 AWG silver-plated PTFE",
    awg: 20,
    material: "silverPlatedCopper",
    insulationClass: "ptfe260",
    maxVoltageV: 600,
    ampacityChassisA: 1.6,
    ampacityBundleA: 1.1,
    recommendedUses: ["RF coax center", "Aerospace signal", "Mil-spec harness"],
    notes: "Silver plating reduces skin-effect losses at high frequencies.",
  },
  {
    id: "awg-26-silver-kapton",
    gaugeLabel: "26 AWG silver/Kapton aerospace",
    awg: 26,
    material: "silverPlatedCopper",
    insulationClass: "kapton400",
    maxVoltageV: 600,
    ampacityChassisA: 0.4,
    ampacityBundleA: 0.25,
    recommendedUses: ["Satellite harness", "Space-rated wiring", "Cryogenic systems"],
    notes: "Polyimide insulation survives extreme thermal cycling and radiation.",
  },
  // CCA and AA-8000 modern aluminum wires
  {
    id: "awg-10-cca-xlpe",
    gaugeLabel: "10 AWG CCA building",
    awg: 10,
    material: "copperCladAluminum",
    insulationClass: "xlpe125",
    maxVoltageV: 600,
    ampacityChassisA: 12,
    ampacityBundleA: 25,
    recommendedUses: ["Non-critical circuits", "Cost-sensitive installs", "Temporary power"],
    notes: "Copper-clad aluminum offers cost savings with standard terminations.",
  },
  {
    id: "awg-8-aa8000-xlpe",
    gaugeLabel: "8 AWG AA-8000 branch",
    awg: 8,
    material: "aluminumAA8000",
    insulationClass: "xlpe125",
    maxVoltageV: 600,
    ampacityChassisA: 22,
    ampacityBundleA: 36,
    recommendedUses: ["Branch circuits", "Sub-panel feeds", "NEC-compliant aluminum"],
    notes: "Modern AA-8000 alloy meets NEC 310.14 for general wiring.",
  },
  // Resistance and specialty wires
  {
    id: "awg-26-constantan",
    gaugeLabel: "26 AWG constantan",
    awg: 26,
    material: "constantan",
    insulationClass: "bare1200",
    maxVoltageV: 0,
    ampacityChassisA: 0.8,
    ampacityBundleA: 0.5,
    recommendedUses: ["Precision shunts", "Thermocouple junctions", "Strain gauges"],
    notes: "Near-zero TCR makes constantan ideal for stable reference resistors.",
  },
  {
    id: "awg-20-kanthal-fiberglass",
    gaugeLabel: "20 AWG Kanthal furnace",
    awg: 20,
    material: "kanthalA1",
    insulationClass: "fiberglass482",
    maxVoltageV: 0,
    ampacityChassisA: 4,
    ampacityBundleA: 3,
    recommendedUses: ["Kiln elements", "Tube furnace coils", "Glass annealing"],
    notes: "Iron-chrome-aluminum survives 1400 °C with braided glass sleeve.",
  },
  {
    id: "awg-16-ss316-neoprene",
    gaugeLabel: "16 AWG SS316 marine",
    awg: 16,
    material: "stainlessSteel316",
    insulationClass: "neoprene90",
    maxVoltageV: 300,
    ampacityChassisA: 2.5,
    ampacityBundleA: 1.8,
    recommendedUses: ["Boat grounding", "Salt-spray environments", "Chemical plants"],
    notes: "Marine-grade stainless resists galvanic corrosion in saltwater.",
  },
  {
    id: "awg-14-silver-ptfe",
    gaugeLabel: "14 AWG fine silver RF",
    awg: 14,
    material: "silverSolid",
    insulationClass: "ptfe260",
    maxVoltageV: 1000,
    ampacityChassisA: 8,
    ampacityBundleA: 6,
    recommendedUses: ["High-power RF", "Transmitter finals", "Lab reference"],
    notes: "Pure silver offers lowest resistance for demanding RF applications.",
  },
  // EPDM and TPE insulation variants
  {
    id: "awg-4-cu-epdm",
    gaugeLabel: "4 AWG copper EPDM welding",
    awg: 4,
    material: "annealedCopper",
    insulationClass: "epdm150",
    maxVoltageV: 600,
    ampacityChassisA: 65,
    ampacityBundleA: 75,
    recommendedUses: ["Arc welders", "Battery interconnects", "Cold-weather mobile"],
    notes: "EPDM rubber stays supple below -40 °C for outdoor welding.",
  },
  {
    id: "awg-18-cu-tpe",
    gaugeLabel: "18 AWG TPE appliance cord",
    awg: 18,
    material: "annealedCopper",
    insulationClass: "tpe105",
    maxVoltageV: 300,
    ampacityChassisA: 2.3,
    ampacityBundleA: 1.5,
    recommendedUses: ["Power tool cords", "Appliance leads", "Extension cords"],
    notes: "Thermoplastic elastomer provides flexibility and abrasion resistance.",
  },
  // Additional gauges for more coverage
  {
    id: "awg-30-tc-pvc",
    gaugeLabel: "30 AWG tinned wire wrap",
    awg: 30,
    material: "tinnedCopper",
    insulationClass: "pvc80",
    maxVoltageV: 300,
    ampacityChassisA: 0.14,
    ampacityBundleA: 0.08,
    recommendedUses: ["Wire-wrap prototypes", "Fine PCB rework", "Model electronics"],
    notes: "Kynar-style wire for point-to-point construction.",
  },
  {
    id: "awg-28-ofc-silicone",
    gaugeLabel: "28 AWG OFC hookup",
    awg: 28,
    material: "oxygenFreeCopper",
    insulationClass: "silicone200",
    maxVoltageV: 300,
    ampacityChassisA: 0.23,
    ampacityBundleA: 0.15,
    recommendedUses: ["SMD rework", "Fine signal runs", "Miniature audio"],
    notes: "Ultra-fine stranding for delicate soldering work.",
  },
  {
    id: "mm2-2p5-cu-xlpe",
    gaugeLabel: "2.5 mm² copper (14 AWG eq)",
    metricAreaMm2: 2.5,
    material: "annealedCopper",
    insulationClass: "xlpe125",
    maxVoltageV: 600,
    ampacityChassisA: 6.5,
    ampacityBundleA: 18,
    recommendedUses: ["IEC building wire", "European installs", "Metric conduit"],
    notes: "Standard metric size per IEC 60228 for 16 A circuits.",
  },
  {
    id: "mm2-6-cu-xlpe",
    gaugeLabel: "6 mm² copper (10 AWG eq)",
    metricAreaMm2: 6,
    material: "annealedCopper",
    insulationClass: "xlpe125",
    maxVoltageV: 600,
    ampacityChassisA: 16,
    ampacityBundleA: 36,
    recommendedUses: ["European power", "Metric feeders", "IEC sub-mains"],
    notes: "Common metric feeder size for 32 A circuits.",
  },
];

// =============================================================================
// WIRE MANUFACTURERS & BRANDS
// =============================================================================
// This system enables branded product placement partnerships with wire
// manufacturers. Each manufacturer entry includes company info, specialty
// categories, and placeholder partnership tiers for future monetization.

export type WireManufacturerId =
  | "southwire"
  | "generaCable"
  | "prysmian"
  | "nexans"
  | "alphaWire"
  | "beldenWire"
  | "ancorMarine"
  | "temco"
  | "remington"
  | "wireCableYourWay"
  | "generic";

export type PartnershipTier = "none" | "basic" | "featured" | "premium";

export type WireManufacturer = {
  id: WireManufacturerId;
  name: string;
  shortName: string;
  country: string;
  founded?: number;
  website?: string;
  specialty: string[];
  description: string;
  partnershipTier: PartnershipTier;
  logoUrl?: string;
  featuredProducts?: string[];
};

export const WIRE_MANUFACTURERS: Record<WireManufacturerId, WireManufacturer> = {
  southwire: {
    id: "southwire",
    name: "Southwire Company, LLC",
    shortName: "Southwire",
    country: "USA",
    founded: 1950,
    website: "https://www.southwire.com",
    specialty: ["Building wire", "Utility cable", "OEM wire"],
    description:
      "One of North America's largest wire and cable producers, known for THHN/THWN building wire and SIMpull technology.",
    partnershipTier: "none",
    featuredProducts: ["THHN/THWN-2", "SIMpull Wire", "Romex NM-B"],
  },
  generaCable: {
    id: "generaCable",
    name: "General Cable (Prysmian Group)",
    shortName: "General Cable",
    country: "USA",
    founded: 1927,
    website: "https://www.generalcable.com",
    specialty: ["Energy cables", "Industrial wire", "Communications"],
    description:
      "Global wire and cable manufacturer now part of Prysmian, offering comprehensive conductor solutions.",
    partnershipTier: "none",
    featuredProducts: ["Carol Brand", "BICC General", "Phelps Dodge"],
  },
  prysmian: {
    id: "prysmian",
    name: "Prysmian Group",
    shortName: "Prysmian",
    country: "Italy",
    founded: 1879,
    website: "https://www.prysmiangroup.com",
    specialty: ["Submarine cables", "High voltage", "Telecom fiber"],
    description:
      "World's largest cable manufacturer by revenue, specializing in energy and telecom infrastructure.",
    partnershipTier: "none",
    featuredProducts: ["Draka", "General Cable", "Fiber solutions"],
  },
  nexans: {
    id: "nexans",
    name: "Nexans S.A.",
    shortName: "Nexans",
    country: "France",
    founded: 2000,
    website: "https://www.nexans.com",
    specialty: ["Energy infrastructure", "Data cables", "Automotive"],
    description:
      "French multinational cable manufacturer with strong presence in renewable energy and EV charging.",
    partnershipTier: "none",
    featuredProducts: ["EASYFIL", "ENERGY Marine", "ALSECURE"],
  },
  alphaWire: {
    id: "alphaWire",
    name: "Alpha Wire Company",
    shortName: "Alpha Wire",
    country: "USA",
    founded: 1922,
    website: "https://www.alphawire.com",
    specialty: ["Industrial automation", "Instrumentation", "Military spec"],
    description:
      "Premium wire and cable for demanding industrial and mil-spec applications.",
    partnershipTier: "none",
    featuredProducts: ["EcoWire", "Xtra-Guard", "ThermoThin"],
  },
  beldenWire: {
    id: "beldenWire",
    name: "Belden Inc.",
    shortName: "Belden",
    country: "USA",
    founded: 1902,
    website: "https://www.belden.com",
    specialty: ["Broadcast cable", "Industrial Ethernet", "Audio/Video"],
    description:
      "Industry leader in signal transmission solutions for broadcast, industrial, and enterprise markets.",
    partnershipTier: "none",
    featuredProducts: ["Brilliance AV", "DataTuff", "Media Twist"],
  },
  ancorMarine: {
    id: "ancorMarine",
    name: "Ancor Marine Grade",
    shortName: "Ancor",
    country: "USA",
    website: "https://www.ancorproducts.com",
    specialty: ["Marine wire", "Battery cable", "Tinned copper"],
    description:
      "Specialist in UL-listed marine-grade tinned copper wire for boats and RVs.",
    partnershipTier: "none",
    featuredProducts: ["Primary Wire", "Battery Cable", "Duplex Flat"],
  },
  temco: {
    id: "temco",
    name: "TEMCo Industrial",
    shortName: "TEMCo",
    country: "USA",
    website: "https://www.temcoindustrial.com",
    specialty: ["Welding cable", "Magnet wire", "Transformers"],
    description:
      "Industrial supplier known for welding cable, magnet wire, and DIY electrical supplies.",
    partnershipTier: "none",
    featuredProducts: ["Welding Cable", "Magnet Wire", "Battery Cable"],
  },
  remington: {
    id: "remington",
    name: "Remington Industries",
    shortName: "Remington",
    country: "USA",
    website: "https://www.remingtonindustries.com",
    specialty: ["Magnet wire", "Building wire", "Custom solutions"],
    description:
      "Family-owned manufacturer specializing in magnet wire and custom conductor solutions.",
    partnershipTier: "none",
    featuredProducts: ["Magnet Wire", "Hook-up Wire", "Litz Wire"],
  },
  wireCableYourWay: {
    id: "wireCableYourWay",
    name: "Wire & Cable Your Way",
    shortName: "WCYW",
    country: "USA",
    website: "https://www.wirecableyourway.com",
    specialty: ["Cut-to-length", "Residential wire", "E-commerce"],
    description:
      "Online retailer offering cut-to-length wire and cable for DIY and contractor projects.",
    partnershipTier: "none",
    featuredProducts: ["THHN Singles", "Welding Cable", "Speaker Wire"],
  },
  generic: {
    id: "generic",
    name: "Generic / Unbranded",
    shortName: "Generic",
    country: "Global",
    specialty: ["General purpose", "Educational"],
    description:
      "Unbranded wire specifications for general educational reference and simulation purposes.",
    partnershipTier: "none",
  },
};

export type WireBrandAssociation = {
  wireId: string;
  manufacturerId: WireManufacturerId;
  productName?: string;
  partNumber?: string;
  productUrl?: string;
};

// Default brand associations (can be extended via partnerships)
export const WIRE_BRAND_ASSOCIATIONS: WireBrandAssociation[] = [
  // Building wire associations
  { wireId: "awg-14-cu-thhn", manufacturerId: "southwire", productName: "THHN/THWN-2" },
  { wireId: "awg-12-cu-thhn", manufacturerId: "southwire", productName: "THHN/THWN-2" },
  { wireId: "awg-10-cu-thhn", manufacturerId: "southwire", productName: "THHN/THWN-2" },
  // Welding cable associations
  { wireId: "awg-6-cu-welding", manufacturerId: "temco", productName: "Welding Cable" },
  { wireId: "awg-4-cu-welding", manufacturerId: "temco", productName: "Welding Cable" },
  { wireId: "awg-4-cu-epdm", manufacturerId: "temco", productName: "Premium Welding Cable" },
  // Marine wire associations
  { wireId: "awg-16-ss316-neoprene", manufacturerId: "ancorMarine", productName: "Marine Grade" },
  // Industrial/instrumentation associations
  { wireId: "awg-20-cu-ptfe", manufacturerId: "alphaWire", productName: "PTFE Hookup" },
  { wireId: "awg-20-silver-ptfe", manufacturerId: "alphaWire", productName: "Silver PTFE" },
  // Audio/signal associations
  { wireId: "awg-18-ofc-silicone", manufacturerId: "beldenWire", productName: "Audio Grade" },
];

// Helper functions for manufacturer integration
export function getManufacturerForWire(wireId: string): WireManufacturer | null {
  const association = WIRE_BRAND_ASSOCIATIONS.find((a) => a.wireId === wireId);
  if (association) {
    return WIRE_MANUFACTURERS[association.manufacturerId];
  }
  return null;
}

export function getWiresByManufacturer(manufacturerId: WireManufacturerId): string[] {
  return WIRE_BRAND_ASSOCIATIONS
    .filter((a) => a.manufacturerId === manufacturerId)
    .map((a) => a.wireId);
}

export function getFeaturedManufacturers(): WireManufacturer[] {
  return Object.values(WIRE_MANUFACTURERS).filter(
    (m) => m.partnershipTier === "featured" || m.partnershipTier === "premium"
  );
}

export function getManufacturersBySpecialty(specialty: string): WireManufacturer[] {
  const lowerSpecialty = specialty.toLowerCase();
  return Object.values(WIRE_MANUFACTURERS).filter((m) =>
    m.specialty.some((s) => s.toLowerCase().includes(lowerSpecialty))
  );
}

// =============================================================================
// WIRE GAUGE PRESETS
// =============================================================================

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
