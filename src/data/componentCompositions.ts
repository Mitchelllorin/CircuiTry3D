/**
 * CircuiTry3D — Component Composition Library
 *
 * Physical composition data for each component type: materials, sub-components,
 * and 3D layer geometry for cutaway visualization.  Used by FUSE™ to derive
 * real-world thermal / electrical failure thresholds, and by the 3D viewer to
 * render internal structure.
 *
 * Manufacturer-supplied composition data follows the same schema and can be
 * merged at runtime via FailureEngine.loadCompositions().
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Physical material with real-world properties relevant to thermal/electrical simulation */
export type Material = {
  /** Human-readable name */
  name: string;
  /** g/cm³ */
  density: number;
  /** W/(m·K) — rate of heat conduction */
  thermalConductivity: number;
  /** J/(kg·K) — energy required to raise temperature by 1 °C */
  specificHeat: number;
  /**
   * °C — temperature at which the material melts, catastrophically degrades,
   * or (for insulators / packages) begins to permanently deform/char
   */
  meltingPoint: number;
  /** Ω·m — electrical resistivity at 25 °C (Infinity for insulators) */
  electricalResistivity: number;
  /** ppm/°C — linear coefficient of thermal expansion */
  thermalExpansion?: number;
};

/** A distinct physical sub-component within the component body */
export type SubComponent = {
  /** Human-readable name */
  name: string;
  /** Key into MATERIAL_LIBRARY */
  materialKey: string;
  /** Functional role of this sub-component */
  role: string;
  /** Approximate mass fraction of total component (0–1) */
  massFraction: number;
  /** true if this is the thermally or electrically limiting element */
  isCritical?: boolean;
  /**
   * °C — overrides the material meltingPoint with a tighter operational limit
   * (e.g. Tjmax for a silicon die is 150 °C, well below silicon's melt point of 1414 °C)
   */
  operatingLimitC?: number;
};

/** Internal geometry layer for cutaway / exploded 3D view */
export type InternalLayer = {
  /** Key into MATERIAL_LIBRARY */
  materialKey: string;
  /** Human-readable label shown on UI tooltip */
  label: string;
  /** THREE.js-compatible shape primitive */
  type: 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus';
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: [number, number, number];
  /** Hex colour string */
  color: string;
  /** 0–1; use < 1 for translucent internal layers */
  opacity: number;
};

/** Full physical composition for one component type */
export type ComponentComposition = {
  /** Matches the type string used in arena / Component3DLibrary */
  componentType: string;
  /** Alternative type aliases that map to this composition */
  aliases: string[];
  /** Short description of the physical construction / package style */
  constructionNote: string;
  /** Ordered list of sub-components (typically outermost to innermost/critical) */
  subComponents: SubComponent[];
  /** Layers for 3D internal cutaway view */
  internalLayers: InternalLayer[];
};

/**
 * Manufacturer-supplied component spec — superset of the arena component format.
 * POST or import a JSON document matching this shape to register a manufacturer
 * component with its full physical composition.
 */
export type ManufacturerComponentSpec = {
  /** Must match a CircuiTry3D component type (e.g. "resistor", "mosfet") */
  type: string;
  /** Manufacturer part number (e.g. "IRF540NPBF") */
  partNumber: string;
  /** Manufacturer company name */
  manufacturer: string;
  /** Human-readable component name */
  name: string;
  /** Standard electrical/thermal properties (same keys as arena component properties) */
  properties: Record<string, number | string | boolean>;
  /** Optional: physical composition — omit componentType (inferred from 'type') */
  composition?: Omit<ComponentComposition, 'componentType'>;
  /** Optional: URL to official datasheet PDF */
  datasheetUrl?: string;
  /** ISO 8601 date this spec was created/last updated */
  specDate?: string;
};

// ---------------------------------------------------------------------------
// Material Library
// ---------------------------------------------------------------------------

/**
 * Common materials found in electronic components.
 * Properties sourced from engineering handbooks and manufacturer datasheets.
 */
export const MATERIAL_LIBRARY: Record<string, Material> = {
  // Semiconductors
  silicon: {
    name: 'Silicon (Si)',
    density: 2.33,
    thermalConductivity: 149,
    specificHeat: 705,
    meltingPoint: 1414,
    electricalResistivity: 6.40e2,
    thermalExpansion: 2.6,
  },
  silicon_dioxide: {
    name: 'Silicon Dioxide / Gate Oxide (SiO₂)',
    density: 2.65,
    thermalConductivity: 1.4,
    specificHeat: 740,
    meltingPoint: 1713,
    electricalResistivity: 1e14,
    thermalExpansion: 0.5,
  },
  gan_semiconductor: {
    name: 'Gallium Nitride (GaN)',
    density: 6.15,
    thermalConductivity: 130,
    specificHeat: 490,
    meltingPoint: 2500,
    electricalResistivity: 1e-4,
    thermalExpansion: 5.6,
  },
  gaas_semiconductor: {
    name: 'Gallium Arsenide (GaAs)',
    density: 5.32,
    thermalConductivity: 46,
    specificHeat: 350,
    meltingPoint: 1238,
    electricalResistivity: 1e-3,
    thermalExpansion: 5.7,
  },

  // Metals
  copper: {
    name: 'Copper (Cu)',
    density: 8.96,
    thermalConductivity: 385,
    specificHeat: 384,
    meltingPoint: 1085,
    electricalResistivity: 1.68e-8,
    thermalExpansion: 17,
  },
  gold: {
    name: 'Gold (Au) — Bond Wire',
    density: 19.3,
    thermalConductivity: 314,
    specificHeat: 129,
    meltingPoint: 1064,
    electricalResistivity: 2.44e-8,
    thermalExpansion: 14.2,
  },
  aluminum: {
    name: 'Aluminum (Al)',
    density: 2.70,
    thermalConductivity: 205,
    specificHeat: 897,
    meltingPoint: 660,
    electricalResistivity: 2.65e-8,
    thermalExpansion: 23.1,
  },
  aluminum_alloy_6061: {
    name: 'Aluminum Alloy 6061 (Heat Sink)',
    density: 2.70,
    thermalConductivity: 167,
    specificHeat: 896,
    meltingPoint: 652,
    electricalResistivity: 3.99e-8,
    thermalExpansion: 23.6,
  },
  nickel: {
    name: 'Nickel (Ni) — End Caps',
    density: 8.90,
    thermalConductivity: 90.9,
    specificHeat: 444,
    meltingPoint: 1455,
    electricalResistivity: 6.99e-8,
    thermalExpansion: 13.4,
  },
  tin: {
    name: 'Tin (Sn) — Lead Plating',
    density: 7.26,
    thermalConductivity: 67,
    specificHeat: 227,
    meltingPoint: 232,
    electricalResistivity: 1.09e-7,
    thermalExpansion: 23,
  },
  solder_lead_tin: {
    name: 'Pb-Sn Solder (63/37)',
    density: 9.30,
    thermalConductivity: 50,
    specificHeat: 200,
    meltingPoint: 183,
    electricalResistivity: 1.45e-7,
    thermalExpansion: 24.7,
  },
  silver_tin_eutectic: {
    name: 'Ag-Sn Eutectic Fuse Wire',
    density: 7.40,
    thermalConductivity: 58,
    specificHeat: 235,
    meltingPoint: 221,
    electricalResistivity: 1.2e-7,
    thermalExpansion: 19,
  },
  steel: {
    name: 'Steel (Iron Alloy)',
    density: 7.85,
    thermalConductivity: 50,
    specificHeat: 490,
    meltingPoint: 1370,
    electricalResistivity: 1.43e-7,
    thermalExpansion: 11.7,
  },
  stainless_steel: {
    name: 'Stainless Steel 304',
    density: 8.00,
    thermalConductivity: 16.2,
    specificHeat: 500,
    meltingPoint: 1400,
    electricalResistivity: 7.2e-7,
    thermalExpansion: 17.2,
  },
  brass: {
    name: 'Brass (Cu-Zn Alloy)',
    density: 8.50,
    thermalConductivity: 109,
    specificHeat: 380,
    meltingPoint: 900,
    electricalResistivity: 6.4e-8,
    thermalExpansion: 19,
  },
  zinc: {
    name: 'Zinc (Zn) — Battery Anode',
    density: 7.14,
    thermalConductivity: 116,
    specificHeat: 388,
    meltingPoint: 420,
    electricalResistivity: 5.92e-8,
    thermalExpansion: 30.2,
  },
  ag_cdo: {
    name: 'Silver-Cadmium Oxide (AgCdO) — Contacts',
    density: 9.10,
    thermalConductivity: 38,
    specificHeat: 230,
    meltingPoint: 960,
    electricalResistivity: 1.7e-8,
    thermalExpansion: 13,
  },
  nichrome: {
    name: 'Nichrome (NiCr) — Resistive Alloy',
    density: 8.40,
    thermalConductivity: 11.3,
    specificHeat: 450,
    meltingPoint: 1400,
    electricalResistivity: 1.10e-6,
    thermalExpansion: 14,
  },

  // Non-metals / Ceramics
  alumina: {
    name: 'Alumina / Aluminum Oxide (Al₂O₃)',
    density: 3.95,
    thermalConductivity: 35,
    specificHeat: 880,
    meltingPoint: 2072,
    electricalResistivity: 1e14,
    thermalExpansion: 6.5,
  },
  carbon_film: {
    name: 'Carbon Film (Resistive Layer)',
    density: 2.00,
    thermalConductivity: 1.0,
    specificHeat: 710,
    meltingPoint: 500,   // Film degrades/oxidises well below bulk carbon sublimation
    electricalResistivity: 3.5e-5,
    thermalExpansion: 3,
  },
  ferrite: {
    name: 'Manganese-Zinc Ferrite (MnZn)',
    density: 4.80,
    thermalConductivity: 5,
    specificHeat: 700,
    meltingPoint: 1200,
    electricalResistivity: 1e1,
    thermalExpansion: 10,
  },
  glass: {
    name: 'Borosilicate Glass',
    density: 2.23,
    thermalConductivity: 1.0,
    specificHeat: 840,
    meltingPoint: 820,
    electricalResistivity: 1e12,
    thermalExpansion: 3.3,
  },
  manganese_dioxide: {
    name: 'Manganese Dioxide (MnO₂) — Battery Cathode',
    density: 5.03,
    thermalConductivity: 2.0,
    specificHeat: 540,
    meltingPoint: 535,   // Decomposes releasing oxygen
    electricalResistivity: 5e-3,
    thermalExpansion: 9,
  },

  // Polymers / Organics
  epoxy_resin: {
    name: 'Epoxy Resin (Package / Encapsulant)',
    density: 1.20,
    thermalConductivity: 0.20,
    specificHeat: 1100,
    meltingPoint: 200,   // Tg / char onset
    electricalResistivity: 1e13,
    thermalExpansion: 55,
  },
  epoxy_mold_compound: {
    name: 'Epoxy Mold Compound (IC Package)',
    density: 1.90,
    thermalConductivity: 0.80,
    specificHeat: 900,
    meltingPoint: 240,   // Deformation / char onset
    electricalResistivity: 1e14,
    thermalExpansion: 18,
  },
  polycarbonate: {
    name: 'Polycarbonate (PC) — Housing',
    density: 1.20,
    thermalConductivity: 0.20,
    specificHeat: 1200,
    meltingPoint: 260,   // Melting / deformation onset
    electricalResistivity: 1e14,
    thermalExpansion: 65,
  },
  rubber: {
    name: 'Rubber / Elastomer — Capacitor Seal',
    density: 1.20,
    thermalConductivity: 0.16,
    specificHeat: 2000,
    meltingPoint: 170,   // Deformation onset
    electricalResistivity: 1e13,
    thermalExpansion: 200,
  },
  kraft_paper: {
    name: 'Kraft Paper — Capacitor Separator',
    density: 1.10,
    thermalConductivity: 0.05,
    specificHeat: 1300,
    meltingPoint: 150,   // Char onset
    electricalResistivity: 1e10,
    thermalExpansion: 30,
  },

  // Electrolytes / Fluids
  electrolyte_etg: {
    name: 'Ethylene Glycol + Boric Acid Electrolyte',
    density: 1.11,
    thermalConductivity: 0.25,
    specificHeat: 2400,
    meltingPoint: 125,   // Vapour pressure / boiling onset under seal
    electricalResistivity: 0.01,
    thermalExpansion: 600,
  },
  electrolyte_koh: {
    name: 'KOH Aqueous Electrolyte (Alkaline Battery)',
    density: 1.30,
    thermalConductivity: 0.60,
    specificHeat: 3800,
    meltingPoint: 100,   // Effective boiling point inside sealed cell
    electricalResistivity: 0.004,
    thermalExpansion: 300,
  },
  coil_insulation: {
    name: 'Enamel Wire Insulation (Polyimide)',
    density: 1.40,
    thermalConductivity: 0.20,
    specificHeat: 1090,
    meltingPoint: 220,   // Class-H coil: practical limit ~180 °C; char ~220 °C
    electricalResistivity: 1e14,
    thermalExpansion: 50,
  },
};

// ---------------------------------------------------------------------------
// Component Compositions
// ---------------------------------------------------------------------------

export const COMPONENT_COMPOSITIONS: ComponentComposition[] = [
  // ─── Resistor (Carbon Film, axial) ──────────────────────────────────────
  {
    componentType: 'resistor',
    aliases: ['res', 'r'],
    constructionNote: 'Carbon film deposited on alumina ceramic rod; protective epoxy lacquer coating; axial tin-plated copper leads',
    subComponents: [
      { name: 'Alumina Ceramic Substrate', materialKey: 'alumina',      role: 'Mechanical support / thermal base', massFraction: 0.55 },
      { name: 'Carbon Film',               materialKey: 'carbon_film',  role: 'Resistive element',                 massFraction: 0.01, isCritical: true, operatingLimitC: 155 },
      { name: 'Nickel End Caps',           materialKey: 'nickel',       role: 'Terminal contact / current interface', massFraction: 0.12 },
      { name: 'Tin-Plated Copper Leads',  materialKey: 'copper',       role: 'PCB solder terminals',              massFraction: 0.15 },
      { name: 'Epoxy Lacquer Coating',    materialKey: 'epoxy_resin',  role: 'Environmental protection',          massFraction: 0.17 },
    ],
    internalLayers: [
      { materialKey: 'alumina',     label: 'Al₂O₃ Substrate',  type: 'cylinder', position: [0, 0, 0], rotation: [0, 0, Math.PI / 2], scale: [0.11, 0.90, 0.11], color: '#F5F0DC', opacity: 0.95 },
      { materialKey: 'carbon_film', label: 'Carbon Film',      type: 'cylinder', position: [0, 0, 0], rotation: [0, 0, Math.PI / 2], scale: [0.13, 0.88, 0.13], color: '#1A1A1A', opacity: 0.55 },
      { materialKey: 'nickel',      label: 'Nickel End Cap',   type: 'cylinder', position: [-0.45, 0, 0], rotation: [0, 0, Math.PI / 2], scale: [0.16, 0.07, 0.16], color: '#9A9A9A', opacity: 0.90 },
      { materialKey: 'nickel',      label: 'Nickel End Cap',   type: 'cylinder', position: [ 0.45, 0, 0], rotation: [0, 0, Math.PI / 2], scale: [0.16, 0.07, 0.16], color: '#9A9A9A', opacity: 0.90 },
    ],
  },

  // ─── Capacitor (Electrolytic, aluminium) ────────────────────────────────
  {
    componentType: 'capacitor',
    aliases: ['cap', 'electrolytic'],
    constructionNote: 'Etched aluminium foil anode with anodised Al₂O₃ dielectric; wound with kraft-paper separator soaked in ethylene-glycol electrolyte; aluminium can with rubber vent seal',
    subComponents: [
      { name: 'Aluminium Can',        materialKey: 'aluminum',        role: 'Housing and cathode',              massFraction: 0.20 },
      { name: 'Aluminium Anode Foil + Al₂O₃ Oxide', materialKey: 'alumina', role: 'Dielectric layer',          massFraction: 0.12, isCritical: true, operatingLimitC: 105 },
      { name: 'Ethylene Glycol Electrolyte', materialKey: 'electrolyte_etg', role: 'Ion transport medium',      massFraction: 0.28, isCritical: true, operatingLimitC: 105 },
      { name: 'Kraft Paper Separator', materialKey: 'kraft_paper',    role: 'Isolates anode/cathode foils',    massFraction: 0.10 },
      { name: 'Aluminium Cathode Foil', materialKey: 'aluminum',      role: 'Second electrode',                massFraction: 0.15 },
      { name: 'Rubber Vent Seal',      materialKey: 'rubber',         role: 'Pressure relief / hermetic seal', massFraction: 0.05 },
      { name: 'Aluminium Leads',       materialKey: 'aluminum',       role: 'PCB terminals',                   massFraction: 0.10 },
    ],
    internalLayers: [
      { materialKey: 'aluminum',        label: 'Al Can (shell)',     type: 'cylinder', position: [0, 0, 0],     scale: [0.55, 1.20, 0.55], color: '#C0C0C0', opacity: 0.25 },
      { materialKey: 'aluminum',        label: 'Wound Foil Assembly', type: 'cylinder', position: [0, -0.05, 0], scale: [0.46, 1.05, 0.46], color: '#C8A020', opacity: 0.80 },
      { materialKey: 'electrolyte_etg', label: 'Electrolyte Core',  type: 'cylinder', position: [0, -0.05, 0], scale: [0.22, 1.00, 0.22], color: '#8B6914', opacity: 0.60 },
      { materialKey: 'rubber',          label: 'Vent Seal',         type: 'cylinder', position: [0, -0.58, 0], scale: [0.52, 0.06, 0.52], color: '#111111', opacity: 0.90 },
    ],
  },

  // ─── LED ────────────────────────────────────────────────────────────────
  {
    componentType: 'led',
    aliases: ['led-red', 'led-blue', 'led-green', 'led-white'],
    constructionNote: 'GaN or GaAsP semiconductor die on copper lead frame; gold bond wire; epoxy resin lens with optional phosphor layer',
    subComponents: [
      { name: 'Epoxy Resin Lens',     materialKey: 'epoxy_resin',      role: 'Optical encapsulant / light shaping', massFraction: 0.60 },
      { name: 'GaN/GaAsP Die',        materialKey: 'gan_semiconductor', role: 'Light emitting PN junction',          massFraction: 0.02, isCritical: true, operatingLimitC: 125 },
      { name: 'Gold Bond Wire',       materialKey: 'gold',             role: 'Electrical connection to die',        massFraction: 0.01 },
      { name: 'Copper Lead Frame',    materialKey: 'copper',           role: 'Heat spreader and electrode',         massFraction: 0.30 },
      { name: 'Ag-Sn Solder Attach', materialKey: 'solder_lead_tin',  role: 'Die-to-leadframe attach',             massFraction: 0.07 },
    ],
    internalLayers: [
      { materialKey: 'epoxy_resin',       label: 'Epoxy Lens',       type: 'sphere',   position: [0, 0.15, 0],  scale: [0.38, 0.38, 0.38], color: '#FF6666', opacity: 0.25 },
      { materialKey: 'copper',            label: 'Lead Frame Cup',   type: 'cylinder', position: [0, -0.15, 0], scale: [0.28, 0.10, 0.28], color: '#B87333', opacity: 0.85 },
      { materialKey: 'gan_semiconductor', label: 'GaN Die',          type: 'box',      position: [0, -0.10, 0], scale: [0.09, 0.05, 0.09], color: '#FFE040', opacity: 1.00 },
      { materialKey: 'gold',              label: 'Bond Wire',        type: 'cylinder', position: [0.03, -0.07, 0], rotation: [0, 0, 0.4], scale: [0.01, 0.08, 0.01], color: '#FFD700', opacity: 1.00 },
    ],
  },

  // ─── Diode (rectifier, glass body) ──────────────────────────────────────
  {
    componentType: 'diode',
    aliases: ['diode-1n4007', 'diode-1n4148', 'rectifier', 'schottky'],
    constructionNote: 'Silicon PN-junction die in glass (DO-41) or epoxy body; silver or aluminium bond wire; tin-plated copper leads',
    subComponents: [
      { name: 'Borosilicate Glass Body', materialKey: 'glass',   role: 'Hermetic encapsulant',       massFraction: 0.40 },
      { name: 'Silicon Die (PN junction)', materialKey: 'silicon', role: 'Rectifying junction',      massFraction: 0.05, isCritical: true, operatingLimitC: 150 },
      { name: 'Silver Bond Wire',        materialKey: 'nickel',  role: 'Electrical connection',      massFraction: 0.02 },
      { name: 'Tin-Plated Copper Leads', materialKey: 'copper',  role: 'PCB terminals',              massFraction: 0.53 },
    ],
    internalLayers: [
      { materialKey: 'glass',   label: 'Glass Body',   type: 'cylinder', position: [0, 0, 0], rotation: [0, 0, Math.PI / 2], scale: [0.12, 0.80, 0.12], color: '#DDEEFF', opacity: 0.30 },
      { materialKey: 'silicon', label: 'Silicon Die',  type: 'box',      position: [0, 0, 0], scale: [0.08, 0.10, 0.08],      color: '#606080', opacity: 0.90 },
      { materialKey: 'nickel',  label: 'Bond Wire',    type: 'cylinder', position: [0.04, 0, 0], rotation: [0, 0, Math.PI / 2], scale: [0.01, 0.08, 0.01], color: '#C0C0C0', opacity: 0.90 },
    ],
  },

  // ─── BJT (NPN/PNP, TO-92 or TO-18 package) ──────────────────────────────
  {
    componentType: 'bjt',
    aliases: ['bjt-npn', 'bjt-pnp', 'npn', 'pnp', '2n2222a', 'bc547'],
    constructionNote: 'Bipolar silicon die with triple-diffused NPN/PNP regions; gold bond wires to copper lead frame; epoxy TO-92 or metal TO-18 package',
    subComponents: [
      { name: 'Epoxy Package (TO-92)',   materialKey: 'epoxy_mold_compound', role: 'Structural housing',              massFraction: 0.60 },
      { name: 'Silicon Die',            materialKey: 'silicon',              role: 'Emitter / Base / Collector',      massFraction: 0.05, isCritical: true, operatingLimitC: 150 },
      { name: 'Gold Bond Wires (×3)',   materialKey: 'gold',                 role: 'Die-to-leadframe connections',   massFraction: 0.02 },
      { name: 'Copper Lead Frame',      materialKey: 'copper',               role: 'Current path and heat spreader', massFraction: 0.28 },
      { name: 'Tin-Plated Leads',       materialKey: 'tin',                  role: 'PCB terminals',                  massFraction: 0.05 },
    ],
    internalLayers: [
      { materialKey: 'epoxy_mold_compound', label: 'Epoxy Package',  type: 'cylinder', position: [0, 0.05, 0], scale: [0.35, 0.75, 0.35], color: '#1A1A1A', opacity: 0.20 },
      { materialKey: 'copper',              label: 'Lead Frame',     type: 'box',      position: [0, -0.10, 0], scale: [0.25, 0.04, 0.20], color: '#B87333', opacity: 0.85 },
      { materialKey: 'silicon',             label: 'Silicon Die',    type: 'box',      position: [0, -0.05, 0], scale: [0.12, 0.08, 0.12], color: '#606080', opacity: 0.95 },
      { materialKey: 'gold',                label: 'Bond Wires',     type: 'cylinder', position: [0, 0.00, 0], scale: [0.01, 0.14, 0.01], color: '#FFD700', opacity: 0.90 },
    ],
  },

  // ─── MOSFET (N-channel, TO-220 package) ─────────────────────────────────
  {
    componentType: 'mosfet',
    aliases: ['mosfet-irf540', 'mosfet-2n7000', 'irf540n', 'nmos', 'pmos'],
    constructionNote: 'Planar silicon MOSFET die with SiO₂ gate oxide, aluminium source/drain metallisation; aluminium bond wires; copper lead frame; epoxy mold compound in TO-220 or TO-92 package',
    subComponents: [
      { name: 'Epoxy Mold Compound',    materialKey: 'epoxy_mold_compound', role: 'Package housing',                     massFraction: 0.50 },
      { name: 'Silicon Die',            materialKey: 'silicon',              role: 'MOSFET active region',                massFraction: 0.05, isCritical: true, operatingLimitC: 150 },
      { name: 'SiO₂ Gate Oxide',        materialKey: 'silicon_dioxide',      role: 'Gate insulation / dielectric',        massFraction: 0.005, isCritical: true, operatingLimitC: 150 },
      { name: 'Aluminium Metallisation', materialKey: 'aluminum',            role: 'Source, drain, gate contacts',        massFraction: 0.04 },
      { name: 'Aluminium Bond Wires',   materialKey: 'aluminum',             role: 'Die-to-leadframe connections',        massFraction: 0.02 },
      { name: 'Copper Lead Frame',      materialKey: 'copper',               role: 'Drain tab / heat spreader',           massFraction: 0.25 },
      { name: 'Tin-Plated Leads',       materialKey: 'tin',                  role: 'PCB terminals',                       massFraction: 0.125 },
    ],
    internalLayers: [
      { materialKey: 'epoxy_mold_compound', label: 'Mold Compound',      type: 'box',      position: [0, 0.20, 0], scale: [0.80, 0.80, 0.30], color: '#111111', opacity: 0.20 },
      { materialKey: 'copper',              label: 'Drain Tab',          type: 'box',      position: [0, -0.05, 0], scale: [0.70, 0.60, 0.08], color: '#B87333', opacity: 0.85 },
      { materialKey: 'silicon',             label: 'Silicon Die',        type: 'box',      position: [0,  0.05, 0], scale: [0.45, 0.45, 0.06], color: '#505070', opacity: 0.95 },
      { materialKey: 'aluminum',            label: 'Al Metallisation',   type: 'box',      position: [0,  0.08, 0], scale: [0.44, 0.44, 0.01], color: '#C8C8FF', opacity: 0.80 },
      { materialKey: 'aluminum',            label: 'Bond Wires',         type: 'cylinder', position: [0, 0.12, 0], scale: [0.01, 0.18, 0.01], color: '#D0D0D0', opacity: 0.85 },
    ],
  },

  // ─── Battery (9V, Carbon-Zinc) ───────────────────────────────────────────
  {
    componentType: 'battery',
    aliases: ['battery-9v'],
    constructionNote: '6× AAAA carbon-zinc cells in series; manganese dioxide cathode, carbon collector, zinc anode, NH₄Cl/ZnCl₂ electrolyte; steel outer casing',
    subComponents: [
      { name: 'Steel Outer Casing',       materialKey: 'steel',              role: 'Housing / negative terminal',   massFraction: 0.20 },
      { name: 'Zinc Anode (×6 cells)',    materialKey: 'zinc',               role: 'Negative electrode, oxidises',  massFraction: 0.18, isCritical: false },
      { name: 'MnO₂ Cathode (×6 cells)', materialKey: 'manganese_dioxide',   role: 'Positive electrode, reduces',   massFraction: 0.22, isCritical: false },
      { name: 'NH₄Cl/ZnCl₂ Electrolyte', materialKey: 'electrolyte_koh',    role: 'Ion transport between electrodes', massFraction: 0.15, isCritical: true, operatingLimitC: 60 },
      { name: 'Carbon Rod Collector',     materialKey: 'carbon_film',        role: 'Cathode current collector',     massFraction: 0.10 },
      { name: 'Paper Separator',          materialKey: 'kraft_paper',        role: 'Prevents internal short',       massFraction: 0.10 },
      { name: 'Plastic Top Cap',          materialKey: 'polycarbonate',      role: 'Snap connector / terminal housing', massFraction: 0.05 },
    ],
    internalLayers: [
      { materialKey: 'steel',            label: 'Steel Casing',     type: 'box',      position: [0, 0, 0], scale: [0.80, 1.60, 0.55], color: '#888888', opacity: 0.20 },
      { materialKey: 'zinc',             label: 'Zinc Anode Cells', type: 'cylinder', position: [0, 0.10, 0], scale: [0.32, 1.30, 0.32], color: '#B0C030', opacity: 0.75 },
      { materialKey: 'manganese_dioxide', label: 'MnO₂ Cathode',   type: 'cylinder', position: [0, 0.10, 0], scale: [0.22, 1.28, 0.22], color: '#4A3010', opacity: 0.80 },
      { materialKey: 'carbon_film',      label: 'Carbon Collector', type: 'cylinder', position: [0, 0.10, 0], scale: [0.06, 1.26, 0.06], color: '#222222', opacity: 0.90 },
    ],
  },

  // ─── Switch (Toggle, SPDT) ───────────────────────────────────────────────
  {
    componentType: 'switch',
    aliases: ['switch-basic', 'spdt', 'spst'],
    constructionNote: 'Silver-plated brass contacts on spring-steel actuator; polycarbonate housing; copper PCB terminals',
    subComponents: [
      { name: 'Polycarbonate Housing',    materialKey: 'polycarbonate',  role: 'Structural enclosure / insulation', massFraction: 0.50 },
      { name: 'Brass Contacts (Ag-plated)', materialKey: 'brass',        role: 'Electrical switching contacts',    massFraction: 0.15, isCritical: true, operatingLimitC: 200 },
      { name: 'Spring Steel Actuator',    materialKey: 'stainless_steel', role: 'Mechanical return spring',        massFraction: 0.10 },
      { name: 'Copper Terminals',         materialKey: 'copper',         role: 'PCB solder pins',                  massFraction: 0.20 },
      { name: 'Nickel Actuator Plating',  materialKey: 'nickel',         role: 'Corrosion resistance',             massFraction: 0.05 },
    ],
    internalLayers: [
      { materialKey: 'polycarbonate',   label: 'PC Housing',         type: 'box',      position: [0, 0, 0], scale: [0.70, 0.55, 0.55], color: '#2244AA', opacity: 0.20 },
      { materialKey: 'stainless_steel', label: 'Spring Actuator',    type: 'box',      position: [0, 0.12, 0], scale: [0.55, 0.06, 0.10], color: '#AAAAAA', opacity: 0.85 },
      { materialKey: 'brass',           label: 'Contact Points',     type: 'cylinder', position: [-0.12, -0.05, 0], scale: [0.06, 0.06, 0.06], color: '#C8A020', opacity: 0.95 },
      { materialKey: 'brass',           label: 'Contact Points',     type: 'cylinder', position: [ 0.12, -0.05, 0], scale: [0.06, 0.06, 0.06], color: '#C8A020', opacity: 0.95 },
    ],
  },

  // ─── Fuse (1A, glass cartridge) ─────────────────────────────────────────
  {
    componentType: 'fuse',
    aliases: ['fuse-1a'],
    constructionNote: 'Ag-Sn eutectic fuse wire suspended in glass tube; brass or nickel-plated brass end caps; sand filler for arc suppression in fast-blow types',
    subComponents: [
      { name: 'Borosilicate Glass Tube',   materialKey: 'glass',              role: 'Hermetic housing',           massFraction: 0.30 },
      { name: 'Ag-Sn Eutectic Fuse Wire',  materialKey: 'silver_tin_eutectic', role: 'Overcurrent break element', massFraction: 0.05, isCritical: true, operatingLimitC: 221 },
      { name: 'Brass End Caps',            materialKey: 'brass',              role: 'Terminal contacts',          massFraction: 0.30 },
      { name: 'Tin-Plated Copper Leads',  materialKey: 'copper',             role: 'PCB terminals',              massFraction: 0.35 },
    ],
    internalLayers: [
      { materialKey: 'glass',              label: 'Glass Tube',    type: 'cylinder', position: [0, 0, 0], rotation: [0, 0, Math.PI / 2], scale: [0.10, 0.90, 0.10], color: '#DDEEFF', opacity: 0.30 },
      { materialKey: 'silver_tin_eutectic', label: 'Fuse Wire',   type: 'cylinder', position: [0, 0, 0], rotation: [0, 0, Math.PI / 2], scale: [0.015, 0.85, 0.015], color: '#E8E8E8', opacity: 0.95 },
      { materialKey: 'brass',              label: 'End Cap',       type: 'cylinder', position: [-0.46, 0, 0], rotation: [0, 0, Math.PI / 2], scale: [0.12, 0.06, 0.12], color: '#C8A020', opacity: 0.90 },
      { materialKey: 'brass',              label: 'End Cap',       type: 'cylinder', position: [ 0.46, 0, 0], rotation: [0, 0, Math.PI / 2], scale: [0.12, 0.06, 0.12], color: '#C8A020', opacity: 0.90 },
    ],
  },

  // ─── Heat Sink (TO-220, aluminium extrusion) ─────────────────────────────
  {
    componentType: 'heatsink',
    aliases: ['heatsink-to220'],
    constructionNote: 'Extruded aluminium alloy 6061 with anodised surface for emissivity; fin geometry maximises convective surface area',
    subComponents: [
      { name: 'Aluminium Alloy 6061 Body', materialKey: 'aluminum_alloy_6061', role: 'Primary heat conductor / dissipator', massFraction: 0.90, isCritical: true, operatingLimitC: 150 },
      { name: 'Anodised Al₂O₃ Surface',   materialKey: 'alumina',              role: 'Corrosion protection / IR emissivity', massFraction: 0.10 },
    ],
    internalLayers: [
      { materialKey: 'aluminum_alloy_6061', label: 'Aluminium Fins',    type: 'box',      position: [0, 0.35, 0], scale: [0.80, 0.50, 0.08], color: '#A0A8B0', opacity: 0.85 },
      { materialKey: 'aluminum_alloy_6061', label: 'Aluminium Base',    type: 'box',      position: [0, -0.10, 0], scale: [0.80, 0.15, 0.30], color: '#9098A0', opacity: 0.90 },
      { materialKey: 'alumina',             label: 'Anodised Surface',  type: 'box',      position: [0,  0.35, 0], scale: [0.82, 0.52, 0.10], color: '#5088CC', opacity: 0.25 },
    ],
  },

  // ─── Op-Amp (LM741, DIP-8) ───────────────────────────────────────────────
  {
    componentType: 'opamp',
    aliases: ['opamp-lm741', 'lm741', 'op-amp'],
    constructionNote: 'Bipolar silicon die with linear active region; gold bond wires; copper alloy lead frame; plastic or ceramic DIP-8 package',
    subComponents: [
      { name: 'Plastic DIP-8 Package',    materialKey: 'epoxy_mold_compound', role: 'Structural housing',              massFraction: 0.63 },
      { name: 'Silicon Die',              materialKey: 'silicon',              role: 'Operational amplifier circuit',   massFraction: 0.05, isCritical: true, operatingLimitC: 150 },
      { name: 'SiO₂ Isolation Layers',   materialKey: 'silicon_dioxide',      role: 'Inter-stage isolation',           massFraction: 0.02 },
      { name: 'Aluminium Metallisation', materialKey: 'aluminum',              role: 'Internal circuit wiring',         massFraction: 0.03 },
      { name: 'Gold Bond Wires',         materialKey: 'gold',                  role: 'Die-to-leadframe connections',   massFraction: 0.02 },
      { name: 'Copper Alloy Lead Frame', materialKey: 'copper',                role: 'PCB pins and heat path',          massFraction: 0.25 },
    ],
    internalLayers: [
      { materialKey: 'epoxy_mold_compound', label: 'DIP-8 Package',    type: 'box', position: [0, 0, 0], scale: [1.00, 0.35, 0.45], color: '#0A0A0A', opacity: 0.20 },
      { materialKey: 'copper',              label: 'Lead Frame',       type: 'box', position: [0, -0.05, 0], scale: [0.88, 0.12, 0.35], color: '#B87333', opacity: 0.80 },
      { materialKey: 'silicon',             label: 'Silicon Die',      type: 'box', position: [0,  0.05, 0], scale: [0.40, 0.15, 0.30], color: '#505070', opacity: 0.95 },
      { materialKey: 'gold',                label: 'Bond Wires',       type: 'cylinder', position: [0.12, 0.10, 0], scale: [0.01, 0.14, 0.01], color: '#FFD700', opacity: 0.90 },
    ],
  },

  // ─── Voltage Regulator (LM7805, TO-220) ──────────────────────────────────
  {
    componentType: 'voltage_regulator',
    aliases: ['vreg-lm7805', 'lm7805', 'lm317', 'ldo'],
    constructionNote: 'Same die construction as a BJT/MOSFET power device; TO-220 package with exposed copper drain tab for heat sinking; Tjmax 125 °C for LM7805',
    subComponents: [
      { name: 'Epoxy Mold Compound',    materialKey: 'epoxy_mold_compound', role: 'Package housing',               massFraction: 0.50 },
      { name: 'Silicon Die',            materialKey: 'silicon',              role: 'Regulator active circuit',      massFraction: 0.05, isCritical: true, operatingLimitC: 125 },
      { name: 'Aluminium Metallisation', materialKey: 'aluminum',           role: 'Internal circuit connections',  massFraction: 0.04 },
      { name: 'Copper Lead Frame + Tab', materialKey: 'copper',             role: 'Heat spreader / drain tab',     massFraction: 0.24 },
      { name: 'Tin-Plated Leads',       materialKey: 'tin',                 role: 'PCB terminals',                 massFraction: 0.17 },
    ],
    internalLayers: [
      { materialKey: 'epoxy_mold_compound', label: 'Mold Compound', type: 'box', position: [0, 0.20, 0], scale: [0.80, 0.80, 0.30], color: '#111111', opacity: 0.20 },
      { materialKey: 'copper',              label: 'Copper Tab',    type: 'box', position: [0, -0.05, 0], scale: [0.70, 0.60, 0.08], color: '#B87333', opacity: 0.85 },
      { materialKey: 'silicon',             label: 'Silicon Die',   type: 'box', position: [0,  0.05, 0], scale: [0.45, 0.45, 0.06], color: '#505070', opacity: 0.95 },
    ],
  },

  // ─── IC / NE555 Timer (DIP-8) ────────────────────────────────────────────
  {
    componentType: 'ic',
    aliases: ['ic-ne555', 'ne555', 'ic'],
    constructionNote: 'Bipolar or CMOS silicon die; gold bond wires to copper lead frame; plastic DIP-8 package; Tjmax 70 °C commercial / 125 °C industrial',
    subComponents: [
      { name: 'Plastic DIP-8 Package',   materialKey: 'epoxy_mold_compound', role: 'Structural housing',             massFraction: 0.68 },
      { name: 'Silicon Die (555 circuit)', materialKey: 'silicon',            role: 'Timer/comparator active logic',  massFraction: 0.05, isCritical: true, operatingLimitC: 70 },
      { name: 'SiO₂ Isolation',          materialKey: 'silicon_dioxide',     role: 'Inter-stage insulation',         massFraction: 0.02 },
      { name: 'Gold Bond Wires',         materialKey: 'gold',                role: 'Die-to-leadframe connections',   massFraction: 0.02 },
      { name: 'Copper Lead Frame',       materialKey: 'copper',              role: 'PCB pins',                       massFraction: 0.23 },
    ],
    internalLayers: [
      { materialKey: 'epoxy_mold_compound', label: 'DIP-8 Package', type: 'box', position: [0, 0, 0], scale: [1.00, 0.35, 0.45], color: '#0A0A0A', opacity: 0.20 },
      { materialKey: 'copper',              label: 'Lead Frame',    type: 'box', position: [0, -0.05, 0], scale: [0.88, 0.12, 0.35], color: '#B87333', opacity: 0.80 },
      { materialKey: 'silicon',             label: 'Silicon Die',   type: 'box', position: [0,  0.05, 0], scale: [0.40, 0.15, 0.30], color: '#505070', opacity: 0.95 },
    ],
  },

  // ─── Relay (5V coil, SPDT) ───────────────────────────────────────────────
  {
    componentType: 'relay',
    aliases: ['relay-5v'],
    constructionNote: 'Electromagnetic coil (copper wire on iron core) attracts a steel armature to switch AgCdO contacts; polycarbonate housing; copper PCB terminals',
    subComponents: [
      { name: 'Polycarbonate Housing',        materialKey: 'polycarbonate',  role: 'Structural enclosure',               massFraction: 0.50 },
      { name: 'Copper Coil Winding',          materialKey: 'copper',         role: 'Electromagnetic actuator',            massFraction: 0.12, isCritical: true, operatingLimitC: 130 },
      { name: 'Coil Enamel Insulation',       materialKey: 'coil_insulation', role: 'Wire insulation',                   massFraction: 0.04, isCritical: true, operatingLimitC: 130 },
      { name: 'Iron / Steel Core',            materialKey: 'steel',          role: 'Magnetic flux path',                 massFraction: 0.10 },
      { name: 'Steel Armature (moving part)', materialKey: 'stainless_steel', role: 'Mechanical actuator',               massFraction: 0.08 },
      { name: 'AgCdO Contact Points',         materialKey: 'ag_cdo',         role: 'Switched electrical contacts',       massFraction: 0.06 },
      { name: 'Copper PCB Terminals',         materialKey: 'copper',         role: 'PCB solder pins',                    massFraction: 0.10 },
    ],
    internalLayers: [
      { materialKey: 'polycarbonate',  label: 'Housing',          type: 'box',      position: [0, 0, 0], scale: [1.00, 0.80, 0.65], color: '#223388', opacity: 0.18 },
      { materialKey: 'steel',          label: 'Iron Core',        type: 'box',      position: [-0.10, -0.08, 0], scale: [0.28, 0.55, 0.22], color: '#606060', opacity: 0.85 },
      { materialKey: 'copper',         label: 'Coil Winding',     type: 'torus',    position: [-0.10, -0.08, 0], scale: [0.24, 0.24, 0.24], color: '#B87333', opacity: 0.80 },
      { materialKey: 'stainless_steel', label: 'Armature',        type: 'box',      position: [ 0.10, 0.10, 0], scale: [0.55, 0.06, 0.18], color: '#9A9A9A', opacity: 0.85 },
      { materialKey: 'ag_cdo',          label: 'Contact Points',  type: 'cylinder', position: [ 0.25, -0.05, 0], scale: [0.06, 0.05, 0.06], color: '#E0E0A0', opacity: 0.95 },
    ],
  },

  // ─── Inductor (axial / radial) ───────────────────────────────────────────
  {
    componentType: 'inductor',
    aliases: ['coil', 'choke', 'ferrite'],
    constructionNote: 'Copper wire winding on a manganese-zinc ferrite or iron-powder core; phenolic or epoxy bobbin; axial or radial leads',
    subComponents: [
      { name: 'Copper Winding',           materialKey: 'copper',        role: 'Inductive element',           massFraction: 0.40 },
      { name: 'Enamel Wire Insulation',   materialKey: 'coil_insulation', role: 'Turn-to-turn isolation',   massFraction: 0.05, isCritical: true, operatingLimitC: 130 },
      { name: 'MnZn Ferrite Core',        materialKey: 'ferrite',       role: 'Magnetic flux concentrator', massFraction: 0.45 },
      { name: 'Epoxy/Phenolic Bobbin',    materialKey: 'epoxy_resin',   role: 'Winding support',            massFraction: 0.10 },
    ],
    internalLayers: [
      { materialKey: 'ferrite', label: 'Ferrite Core',  type: 'cylinder', position: [0, 0, 0], scale: [0.18, 0.80, 0.18], color: '#444455', opacity: 0.85 },
      { materialKey: 'copper',  label: 'Cu Winding',    type: 'torus',    position: [0, 0, 0], scale: [0.32, 0.32, 0.32], color: '#B87333', opacity: 0.75 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Return composition data for a component type or alias (case-insensitive) */
export function getComponentComposition(typeOrAlias: string): ComponentComposition | undefined {
  const key = typeOrAlias.toLowerCase().trim();
  return COMPONENT_COMPOSITIONS.find(
    (c) => c.componentType === key || c.aliases.includes(key),
  );
}

/** Return the critical sub-component operating limit (°C) for a given type, or null */
export function getCriticalOperatingLimitC(typeOrAlias: string): number | null {
  const comp = getComponentComposition(typeOrAlias);
  if (!comp) return null;
  const critical = comp.subComponents.find((s) => s.isCritical);
  return critical?.operatingLimitC ?? critical ? (MATERIAL_LIBRARY[critical.materialKey]?.meltingPoint ?? null) : null;
}

/** Return a flat record of material data for all sub-components of the given type */
/** Material record enriched with sub-component context */
export type MaterialWithContext = Material & {
  /** Key in MATERIAL_LIBRARY */
  key: string;
  /** Name of the sub-component that uses this material */
  subComponentName: string;
  /** Whether this is the thermally or electrically limiting sub-component */
  isCritical: boolean;
  /** Mass fraction of this sub-component (0–1) */
  massFraction: number;
  /** Operational limit (°C) if tighter than the material's meltingPoint */
  operatingLimitC?: number;
};

export function getComponentMaterials(typeOrAlias: string): MaterialWithContext[] {
  const comp = getComponentComposition(typeOrAlias);
  if (!comp) return [];
  return comp.subComponents.flatMap((sub) => {
    const mat = MATERIAL_LIBRARY[sub.materialKey];
    if (!mat) return [];
    return [{ ...mat, key: sub.materialKey, subComponentName: sub.name, isCritical: !!sub.isCritical, massFraction: sub.massFraction, operatingLimitC: sub.operatingLimitC }];
  });
}

/**
 * Register a custom or manufacturer-supplied composition at runtime.
 * If a composition for the same componentType already exists, it is replaced.
 * Returns true on success, false if the argument is invalid.
 */
export function registerComposition(composition: Partial<ComponentComposition> & { componentType: string }): boolean {
  if (!composition || typeof composition.componentType !== 'string') return false;
  const key = composition.componentType.toLowerCase();
  const idx = COMPONENT_COMPOSITIONS.findIndex((c) => c.componentType === key);
  const merged: ComponentComposition = {
    aliases: [],
    constructionNote: '',
    subComponents: [],
    internalLayers: [],
    ...COMPONENT_COMPOSITIONS[idx],
    ...composition,
  };
  if (idx >= 0) {
    COMPONENT_COMPOSITIONS[idx] = merged;
  } else {
    COMPONENT_COMPOSITIONS.push(merged);
  }
  return true;
}

/**
 * JSON Schema describing the manufacturer component spec format.
 * Publish this so manufacturers know exactly what format to supply.
 */
export const MANUFACTURER_COMPONENT_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'CircuiTry3D Manufacturer Component Specification',
  description: 'Schema for manufacturer-supplied component data including physical composition for FUSE™ accurate simulation',
  type: 'object',
  required: ['type', 'partNumber', 'manufacturer', 'name', 'properties'],
  properties: {
    type: {
      type: 'string',
      description: 'CircuiTry3D component type (resistor, capacitor, led, diode, bjt, mosfet, battery, switch, fuse, heatsink, opamp, voltage_regulator, ic, relay, inductor)',
    },
    partNumber:   { type: 'string', description: 'Manufacturer part number (e.g. IRF540NPBF)' },
    manufacturer: { type: 'string', description: 'Company name' },
    name:         { type: 'string', description: 'Human-readable component name' },
    datasheetUrl: { type: 'string', format: 'uri', description: 'Official datasheet URL' },
    specDate:     { type: 'string', format: 'date-time', description: 'ISO 8601 spec creation date' },
    properties: {
      type: 'object',
      description: 'Electrical / thermal properties (same keys as arena component properties)',
      additionalProperties: { type: ['number', 'string', 'boolean'] },
    },
    composition: {
      type: 'object',
      description: 'Physical composition (omit componentType — inferred from type field)',
      properties: {
        aliases:          { type: 'array', items: { type: 'string' } },
        constructionNote: { type: 'string' },
        subComponents: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'materialKey', 'role', 'massFraction'],
            properties: {
              name:            { type: 'string' },
              materialKey:     { type: 'string', description: 'Key from MATERIAL_LIBRARY or custom material key' },
              role:            { type: 'string' },
              massFraction:    { type: 'number', minimum: 0, maximum: 1 },
              isCritical:      { type: 'boolean' },
              operatingLimitC: { type: 'number', description: 'Maximum safe operating temperature (°C)' },
            },
          },
        },
        internalLayers: {
          type: 'array',
          items: {
            type: 'object',
            required: ['materialKey', 'label', 'type', 'position', 'scale', 'color', 'opacity'],
            properties: {
              materialKey: { type: 'string' },
              label:       { type: 'string' },
              type:        { type: 'string', enum: ['box', 'cylinder', 'sphere', 'cone', 'torus'] },
              position:    { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              rotation:    { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              scale:       { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 },
              color:       { type: 'string', pattern: '^#[0-9a-fA-F]{3,8}$' },
              opacity:     { type: 'number', minimum: 0, maximum: 1 },
            },
          },
        },
      },
    },
  },
} as const;
