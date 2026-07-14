/**
 * ============================================================================
 *  F.U.S.E.™ — Failure Understanding Simulation Engine  v2.0.0
 *  Copyright © 2025 Mitchell Lorin / CircuiTry3D.  All Rights Reserved.
 *
 *  FUSE™ is a proprietary, registered trademark of CircuiTry3D.
 *  This software and its associated documentation are the exclusive intellectual
 *  property of CircuiTry3D.  No part of this file may be reproduced, distributed,
 *  sublicensed, or incorporated into another product without the express written
 *  permission of CircuiTry3D.
 *
 *  LICENSING
 *  ---------
 *  Commercial licensing, OEM embedding, and API partnerships are available.
 *  Contact: licensing@circuitry3d.com
 *
 *  PATENT NOTICE
 *  -------------
 *  The component failure-profile system, insulation-class thermal cascade model,
 *  and gauge-accurate wire stress detection described herein are subject to
 *  pending intellectual property protection.
 * ============================================================================
 *
 *  WHAT IS FUSE™?
 *  --------------
 *  FUSE™ is a zero-dependency, physics-based component failure detection and
 *  visualization engine built exclusively for CircuiTry3D.  Every simulation tick
 *  it evaluates every component against hand-crafted failure profiles to produce:
 *
 *    • A failure name   (e.g. "Thermal Runaway", "Insulation Burnthrough")
 *    • A severity score  0 – 3  (OK → Stressed → Critical → Destroyed)
 *    • A visual effect key  driving the Three.js particle renderer
 *    • A physics-accurate description of what is happening inside the part
 *
 *  It has NO Three.js, DOM, or npm dependencies — safe to load in any context:
 *  browser, Node.js test runner, server-side grader, or future native app.
 *
 *  PHYSICAL SPECIFICATION TABLES  (new in v2.0)
 *  ---------------------------------------------
 *  FUSE™ v2.0 ships three canonical physical spec tables that make it the single
 *  source of truth for all component and wire physics in the application:
 *
 *    • WIRE_INSULATION_SPECS   — 11 insulation classes with thermal, visual, and
 *                                electrical ratings (replaces legacy.html inline table)
 *    • WIRE_GAUGE_TABLE        — AWG 30 → 4/0  conductor diameter, cross-section,
 *                                DC resistance, and NEC ampacity per gauge
 *    • COMPONENT_PHYSICAL_SPECS — per-family package type, body dimensions, and
 *                                 absolute maximum temperature for all 21 families
 *
 *  USAGE
 *  -----
 *    const { detectFailure, resolveComponentFamily,
 *            WIRE_INSULATION_SPECS, WIRE_GAUGE_TABLE, COMPONENT_PHYSICAL_SPECS,
 *            FUSE_VERSION } = window.FailureEngine;
 *
 *    const metrics = { powerDissipation: 0.8, currentRms: 0.15, operatingVoltage: 12,
 *                      thermalRise: 45, impedance: 80, storedEnergy: 0 };
 *    const failure = detectFailure(component, metrics);
 *    // { failed: false, severity: 1.2, name: "Thermal Overload", visual: "char", ... }
 *
 *  Powered by FUSE™ — CircuiTry3D's proprietary failure intelligence layer.
 */
(function (global) {
  "use strict";

  // ---------------------------------------------------------------------------
  // FUSE™ Version
  // ---------------------------------------------------------------------------
  const FUSE_VERSION = "2.0.0";

  // ---------------------------------------------------------------------------
  // WIRE_INSULATION_SPECS  (FUSE™ canonical source — v2.0)
  //
  // Physical, visual, and electrical specifications for all 11 supported
  // insulation classes.  This table is the single source of truth shared by
  // the failure-detection engine, the 3D renderer (via jacketRatio / color /
  // opacity), and the wire-stress thermal model.
  //
  // Fields
  // ------
  //   jacketRatio          — outer-radius / conductor-radius (1.0 = bare)
  //   color                — THREE.js hex colour for the jacket mesh
  //   opacity              — jacket mesh transparency (0 = invisible, 1 = opaque)
  //   thermalLimitC        — max continuous operating temperature of the insulation (°C)
  //   maxVoltageV          — insulation voltage rating (V, 0 = not voltage-rated)
  //   densityKgPerM3       — jacket material density (kg/m³)
  //   thermalConductivityWPerMK — jacket thermal conductivity (W/m·K)
  //   dielectricStrengthKVPerMm — short-time dielectric breakdown voltage (kV/mm)
  //   necType              — NEC / industry type designation string
  //   description          — human-readable summary
  // ---------------------------------------------------------------------------
  const WIRE_INSULATION_SPECS = {
    pvc80: {
      jacketRatio: 1.55, color: 0x1a1a1a, opacity: 0.58,
      thermalLimitC: 80, maxVoltageV: 600,
      densityKgPerM3: 1350, thermalConductivityWPerMK: 0.17,
      dielectricStrengthKVPerMm: 15,
      necType: "TW / THHN (60 °C column)",
      description: "Standard PVC insulation, 300–600 V class, easy to strip. Common for building wire and hook-up wiring.",
    },
    pvc105: {
      jacketRatio: 1.65, color: 0x111111, opacity: 0.60,
      thermalLimitC: 105, maxVoltageV: 600,
      densityKgPerM3: 1380, thermalConductivityWPerMK: 0.18,
      dielectricStrengthKVPerMm: 15,
      necType: "MTW / TEW (105 °C)",
      description: "Thicker PVC jacket rated 105 °C for control wiring, welding cable, and battery leads.",
    },
    xlpe125: {
      jacketRatio: 1.60, color: 0xeeeeee, opacity: 0.50,
      thermalLimitC: 125, maxVoltageV: 600,
      densityKgPerM3: 950, thermalConductivityWPerMK: 0.25,
      dielectricStrengthKVPerMm: 25,
      necType: "THHN / THWN-2 / XHHW (75–90 °C column)",
      description: "Cross-linked polyethylene (XLPE) building wire. Superior moisture and heat resistance over PVC.",
    },
    silicone200: {
      jacketRatio: 1.70, color: 0xcc2200, opacity: 0.45,
      thermalLimitC: 200, maxVoltageV: 600,
      densityKgPerM3: 1200, thermalConductivityWPerMK: 0.25,
      dielectricStrengthKVPerMm: 20,
      necType: "SFF-2 / SiRubber",
      description: "High-flex silicone rubber insulation. Stays pliable from −60 °C to +200 °C; used in robotics and test leads.",
    },
    ptfe260: {
      jacketRatio: 1.20, color: 0xf5f5f5, opacity: 0.38,
      thermalLimitC: 260, maxVoltageV: 600,
      densityKgPerM3: 2200, thermalConductivityWPerMK: 0.25,
      dielectricStrengthKVPerMm: 60,
      necType: "PTFE / TFE / Teflon®",
      description: "Thin-wall PTFE fluoropolymer: chemically inert, UV-stable, very low friction. Preferred for aerospace and vacuum.",
    },
    bare1200: {
      jacketRatio: 1.00, color: 0xb87333, opacity: 0.00,
      thermalLimitC: 1200, maxVoltageV: 0,
      densityKgPerM3: 0, thermalConductivityWPerMK: 0,
      dielectricStrengthKVPerMm: 0,
      necType: "Bare / Self-Oxide",
      description: "No insulation jacket. Self-forming oxide film on resistance alloy wire (Nichrome, Kanthal). Designed to glow red-hot.",
    },
    epdm150: {
      jacketRatio: 2.10, color: 0x0d0d0d, opacity: 0.62,
      thermalLimitC: 150, maxVoltageV: 600,
      densityKgPerM3: 860, thermalConductivityWPerMK: 0.25,
      dielectricStrengthKVPerMm: 30,
      necType: "EPR / EPDM welding cable",
      description: "Ethylene propylene rubber: heavy-duty jacket rated 150 °C. Oil, ozone, and cold-weather resistant. Used in welding cable.",
    },
    tpe105: {
      jacketRatio: 1.60, color: 0x333333, opacity: 0.55,
      thermalLimitC: 105, maxVoltageV: 300,
      densityKgPerM3: 1050, thermalConductivityWPerMK: 0.20,
      dielectricStrengthKVPerMm: 18,
      necType: "SPT / SVT thermoplastic elastomer cord",
      description: "Thermoplastic elastomer: flexible, recyclable, 105 °C. Used for appliance cords, power tool leads, and extension cords.",
    },
    fiberglass482: {
      jacketRatio: 1.50, color: 0xd4c070, opacity: 0.52,
      thermalLimitC: 482, maxVoltageV: 600,
      densityKgPerM3: 1100, thermalConductivityWPerMK: 0.04,
      dielectricStrengthKVPerMm: 5,
      necType: "FEP / Fibreglass braid (Type FE)",
      description: "Braided E-glass sleeving over bare conductor. Rated to 482 °C (900 °F). Used in kilns, furnaces, and high-temp appliances.",
    },
    kapton400: {
      jacketRatio: 1.18, color: 0xc87020, opacity: 0.48,
      thermalLimitC: 400, maxVoltageV: 1000,
      densityKgPerM3: 1420, thermalConductivityWPerMK: 0.12,
      dielectricStrengthKVPerMm: 300,
      necType: "Kapton® / Polyimide film (MIL-W-81044)",
      description: "Polyimide film wrap: ultra-thin, extreme dielectric strength (300 kV/mm), cryogenic to +400 °C. Standard for aerospace harnesses.",
    },
    neoprene90: {
      jacketRatio: 1.90, color: 0x1a1a1a, opacity: 0.62,
      thermalLimitC: 90, maxVoltageV: 300,
      densityKgPerM3: 1250, thermalConductivityWPerMK: 0.19,
      dielectricStrengthKVPerMm: 10,
      necType: "S / SO / SOO neoprene portable cord",
      description: "Neoprene rubber: oil-resistant, flame-retardant, rated 90 °C. Standard for industrial portable cords and marine wiring.",
    },
  };

  // ---------------------------------------------------------------------------
  // WIRE_GAUGE_TABLE  (FUSE™ canonical source — v2.0)
  //
  // Physics-accurate per-gauge conductor data for all standard AWG sizes
  // (30 AWG down to 4/0 AWG).  All resistance values assume annealed copper
  // at 20 °C (resistivity 1.724 × 10⁻⁸ Ω·m per IEC 60228 / ASTM B3).
  // Ampacity values are NEC Table 310.16 (75 °C column, single conductor
  // in free air) and a conservative bundled / chassis-wiring derating.
  //
  // Fields
  // ------
  //   awg                  — AWG gauge number (negative = 1/0, 2/0, 3/0, 4/0)
  //   conductorDiameterMm  — nominal conductor diameter (mm)
  //   areaMm2              — conductor cross-sectional area (mm²)
  //   resistanceOhmPerMeter — DC resistance at 20 °C, annealed copper (Ω/m)
  //   ampacityChassisA     — NEC 310.16 chassis / free-air ampacity (A)
  //   ampacityBundleA      — derated bundled / conduit ampacity (A)
  // ---------------------------------------------------------------------------
  const WIRE_GAUGE_TABLE = [
    // AWG  dia(mm)  area(mm²) R(Ω/m)    chassisA  bundleA
    { awg: 30,  conductorDiameterMm: 0.255, areaMm2: 0.0507, resistanceOhmPerMeter: 0.3390, ampacityChassisA: 0.14,  ampacityBundleA: 0.08  },
    { awg: 28,  conductorDiameterMm: 0.321, areaMm2: 0.0804, resistanceOhmPerMeter: 0.2140, ampacityChassisA: 0.23,  ampacityBundleA: 0.15  },
    { awg: 26,  conductorDiameterMm: 0.405, areaMm2: 0.1278, resistanceOhmPerMeter: 0.1350, ampacityChassisA: 0.36,  ampacityBundleA: 0.24  },
    { awg: 24,  conductorDiameterMm: 0.511, areaMm2: 0.2047, resistanceOhmPerMeter: 0.0842, ampacityChassisA: 0.58,  ampacityBundleA: 0.30  },
    { awg: 22,  conductorDiameterMm: 0.644, areaMm2: 0.3243, resistanceOhmPerMeter: 0.0531, ampacityChassisA: 0.92,  ampacityBundleA: 0.60  },
    { awg: 20,  conductorDiameterMm: 0.812, areaMm2: 0.5176, resistanceOhmPerMeter: 0.0333, ampacityChassisA: 1.50,  ampacityBundleA: 1.00  },
    { awg: 18,  conductorDiameterMm: 1.024, areaMm2: 0.8231, resistanceOhmPerMeter: 0.0210, ampacityChassisA: 2.30,  ampacityBundleA: 1.50  },
    { awg: 16,  conductorDiameterMm: 1.291, areaMm2: 1.309,  resistanceOhmPerMeter: 0.0132, ampacityChassisA: 3.70,  ampacityBundleA: 3.00  },
    { awg: 14,  conductorDiameterMm: 1.628, areaMm2: 2.082,  resistanceOhmPerMeter: 0.00829, ampacityChassisA: 5.90,  ampacityBundleA: 15.0  },
    { awg: 12,  conductorDiameterMm: 2.053, areaMm2: 3.309,  resistanceOhmPerMeter: 0.00521, ampacityChassisA: 9.30,  ampacityBundleA: 20.0  },
    { awg: 10,  conductorDiameterMm: 2.588, areaMm2: 5.261,  resistanceOhmPerMeter: 0.00328, ampacityChassisA: 15.0,  ampacityBundleA: 30.0  },
    { awg: 8,   conductorDiameterMm: 3.264, areaMm2: 8.367,  resistanceOhmPerMeter: 0.00206, ampacityChassisA: 24.0,  ampacityBundleA: 40.0  },
    { awg: 6,   conductorDiameterMm: 4.115, areaMm2: 13.30,  resistanceOhmPerMeter: 0.00130, ampacityChassisA: 38.0,  ampacityBundleA: 55.0  },
    { awg: 4,   conductorDiameterMm: 5.189, areaMm2: 21.15,  resistanceOhmPerMeter: 0.000816, ampacityChassisA: 60.0,  ampacityBundleA: 70.0  },
    { awg: 2,   conductorDiameterMm: 6.543, areaMm2: 33.63,  resistanceOhmPerMeter: 0.000514, ampacityChassisA: 95.0,  ampacityBundleA: 90.0  },
    { awg: 1,   conductorDiameterMm: 7.348, areaMm2: 42.41,  resistanceOhmPerMeter: 0.000407, ampacityChassisA: 110.0, ampacityBundleA: 115.0 },
    { awg: 0,   conductorDiameterMm: 8.251, areaMm2: 53.48,  resistanceOhmPerMeter: 0.000323, ampacityChassisA: 150.0, ampacityBundleA: 125.0 },  // 1/0
    { awg: -1,  conductorDiameterMm: 9.266, areaMm2: 67.43,  resistanceOhmPerMeter: 0.000256, ampacityChassisA: 175.0, ampacityBundleA: 145.0 },  // 2/0
    { awg: -2,  conductorDiameterMm: 10.40, areaMm2: 85.01,  resistanceOhmPerMeter: 0.000203, ampacityChassisA: 200.0, ampacityBundleA: 175.0 },  // 3/0
    { awg: -3,  conductorDiameterMm: 11.68, areaMm2: 107.2,  resistanceOhmPerMeter: 0.000161, ampacityChassisA: 230.0, ampacityBundleA: 195.0 },  // 4/0
  ];

  /** Look up a WIRE_GAUGE_TABLE entry by AWG number (returns null if not found). */
  function getWireGaugeData(awg) {
    if (typeof awg !== "number") return null;
    return WIRE_GAUGE_TABLE.find((row) => row.awg === awg) || null;
  }

  // ---------------------------------------------------------------------------
  // COMPONENT_PHYSICAL_SPECS  (FUSE™ canonical source — v2.0)
  //
  // Real-world physical and thermal reference data for each component family.
  // Drives 3D rendering dimensions, thermal shutdown thresholds, and the
  // "what is physically happening" narrative in failure descriptions.
  //
  // Fields
  // ------
  //   commonPackages       — list of typical package names / form factors
  //   typicalBodyMm        — representative body dimensions {length?, diameter?,
  //                          width?, height?, depth?}  in mm
  //   junctionLimitC       — maximum continuous junction / element temperature (°C)
  //   absoluteMaxTempC     — absolute maximum temperature before irreversible damage (°C)
  //   description          — physics-narrative for this family
  // ---------------------------------------------------------------------------
  const COMPONENT_PHYSICAL_SPECS = {
    resistor: {
      commonPackages: ["axial-0204", "axial-0207", "smd-0402", "smd-0603", "smd-0805", "smd-1206"],
      typicalBodyMm: { length: 3.5, diameter: 1.5 },
      junctionLimitC: 155,
      absoluteMaxTempC: 175,
      description: "Carbon film or metal film resistor on alumina ceramic substrate. Carbon-film rated to 155 °C body temp; metal-film to 175 °C. Failure by resistive layer delamination or lead-solder fatigue.",
    },
    capacitor: {
      commonPackages: ["radial-electrolytic-5mm", "radial-electrolytic-8mm", "smd-0402", "smd-0603", "smd-0805", "mlcc-1206"],
      typicalBodyMm: { diameter: 8, height: 12 },
      junctionLimitC: 105,
      absoluteMaxTempC: 125,
      description: "Electrolytic: etched aluminium anode foil + Al₂O₃ dielectric + ethylene-glycol electrolyte in aluminium can. MLCC: BaTiO₃ dielectric in monolithic ceramic chip. Electrolyte boil-over begins ~105 °C.",
    },
    led: {
      commonPackages: ["thru-hole-t1-3/4", "thru-hole-t1", "smd-0805", "smd-3528", "smd-5050"],
      typicalBodyMm: { diameter: 5.0, height: 8.7 },
      junctionLimitC: 125,
      absoluteMaxTempC: 150,
      description: "InGaN (blue/white/green) or AlGaInP (red/amber) p-n junction in epoxy lens package. Junction temperature above 125 °C causes permanent efficiency loss; above 150 °C the bond wire melts.",
    },
    diode: {
      commonPackages: ["do-41", "do-35", "smd-sod-123", "smd-sod-80", "smd-sma"],
      typicalBodyMm: { length: 5.2, diameter: 2.7 },
      junctionLimitC: 150,
      absoluteMaxTempC: 175,
      description: "Silicon p-n rectifier or signal diode. Tj max 150 °C. Failure begins with bond-wire intermetallic growth; at 175 °C the aluminium wire melts open.",
    },
    zener_diode: {
      commonPackages: ["do-35", "do-41", "smd-sod-80", "smd-melf"],
      typicalBodyMm: { length: 3.5, diameter: 1.9 },
      junctionLimitC: 150,
      absoluteMaxTempC: 175,
      description: "Zener (< 5 V) or avalanche (> 6 V) voltage reference. Tj max 150 °C. Sustained reverse-avalanche at excess power ruptures the junction.",
    },
    bjt: {
      commonPackages: ["to-92", "to-18", "to-39", "to-220", "smd-sot-23", "smd-sot-223"],
      typicalBodyMm: { diameter: 4.6, height: 3.6 },
      junctionLimitC: 150,
      absoluteMaxTempC: 175,
      description: "Silicon NPN or PNP bipolar junction transistor. Aluminium bond wires, epoxy or metal-can package. Tj 150 °C max; second breakdown concentrates current in a thermal filament before the die cracks.",
    },
    mosfet: {
      commonPackages: ["to-220", "to-263-d2pak", "dpak-to-252", "smd-sot-23", "smd-sot-223"],
      typicalBodyMm: { width: 10.3, height: 8.7, depth: 4.6 },
      junctionLimitC: 175,
      absoluteMaxTempC: 200,
      description: "Power N-channel or P-channel MOSFET. Al-Si alloy die, thermally grown SiO₂ gate oxide, copper bond wires. Tj max 175 °C; beyond this the gate oxide degrades and drain-source leakage rises sharply.",
    },
    opamp: {
      commonPackages: ["dip-8", "so-8", "soic-8", "msop-8"],
      typicalBodyMm: { length: 9.9, width: 6.3, height: 3.5 },
      junctionLimitC: 150,
      absoluteMaxTempC: 165,
      description: "Bipolar or CMOS op-amp. DIP-8 or SOIC-8 epoxy-mold package, aluminium metallisation on silicon die. Tj 150 °C max; latch-up from ESD or overvoltage permanently ruins the input stage.",
    },
    voltage_regulator: {
      commonPackages: ["to-220", "to-92", "d2pak", "smd-sod-123"],
      typicalBodyMm: { width: 10.3, height: 8.7, depth: 4.6 },
      junctionLimitC: 150,
      absoluteMaxTempC: 165,
      description: "Linear regulator (LM78xx, LM317, LM1117). TO-220 or TO-92 package. Internal thermal shutdown activates ~150 °C Tj; (Vin−Vout)×Iout is entirely dissipated as heat in the pass transistor.",
    },
    ic: {
      commonPackages: ["dip-8", "dip-14", "dip-16", "soic-8", "ssop-16", "qfp-32"],
      typicalBodyMm: { length: 9.9, width: 6.3, height: 3.5 },
      junctionLimitC: 150,
      absoluteMaxTempC: 165,
      description: "General-purpose integrated circuit in plastic DIP or SMD package. Epoxy-mold compound housing, silicon die, gold or aluminium bond wires. Typically Tj max 150 °C; ESD punch-through destroys gate oxides instantly.",
    },
    battery: {
      commonPackages: ["9v-pp3", "aa-lr6", "aaa-lr03", "c-lr14", "d-lr20", "cr2032"],
      typicalBodyMm: { width: 26.5, height: 48.5, depth: 17.5 },
      junctionLimitC: 60,
      absoluteMaxTempC: 75,
      description: "Alkaline (ZnMnO₂) or lithium primary cell. Operating limit 60 °C; above this the electrolyte decomposes and internal gas pressure rises. Thermal venting or rupture possible above 75 °C.",
    },
    switch: {
      commonPackages: ["spst-6mm-tactile", "spdt-6mm", "toggle-1ms1", "rocker-dpdt"],
      typicalBodyMm: { width: 6.0, height: 6.0, depth: 5.0 },
      junctionLimitC: 200,
      absoluteMaxTempC: 200,
      description: "Mechanical contact switch. AgCdO or AgSnO₂ contacts rated to 200 °C contact temperature. Excess current fuses the contacts closed; arcing erodes and oxidises the contact surface.",
    },
    relay: {
      commonPackages: ["signal-g5v-1", "power-g5le", "din-rail-g2r"],
      typicalBodyMm: { width: 14.9, height: 10.2, depth: 12.7 },
      junctionLimitC: 130,
      absoluteMaxTempC: 155,
      description: "Electromagnetic relay with enameled copper coil, iron core, and AgCdO contacts in polyamide housing. Coil Class B insulation 130 °C; contact arcing above rated load welds contacts permanently closed.",
    },
    inductor: {
      commonPackages: ["axial-through-hole", "toroid-t30", "smd-1210", "pot-core-e25"],
      typicalBodyMm: { length: 10, diameter: 5 },
      junctionLimitC: 130,
      absoluteMaxTempC: 155,
      description: "Ferrite-core or air-core coil with enameled copper winding. Class B winding insulation standard (130 °C). Core saturation distorts current waveform; insulation burnthrough creates an interwinding short.",
    },
    heatsink: {
      commonPackages: ["to-220-clip-on", "extruded-fin-80mm", "pcb-mount-pad"],
      typicalBodyMm: { width: 38, height: 30, depth: 18 },
      junctionLimitC: 200,
      absoluteMaxTempC: 200,
      description: "Extruded aluminium alloy 6061 with anodised surface for improved emissivity. Thermally saturates when fin temperature approaches ambient + (Rθ × P). Fin annealing begins above 200 °C.",
    },
    fuse: {
      commonPackages: ["5x20mm-glass", "6.3x32mm-glass", "blade-mini-atm", "blade-ato", "smd-1206-polyfuse"],
      typicalBodyMm: { length: 20, diameter: 5 },
      junctionLimitC: 221,
      absoluteMaxTempC: 221,
      description: "Glass cartridge or blade fuse with Ag-Sn eutectic fuse element (melts at 221 °C). Current-limiting sand filler (HRC types) quenches the arc. I²t characteristic governs blow time vs. overcurrent magnitude.",
    },
    lamp: {
      commonPackages: ["t1-3/4-5mm", "miniature-e10-bayonet", "ba9s"],
      typicalBodyMm: { diameter: 5, height: 9 },
      junctionLimitC: 2500,
      absoluteMaxTempC: 3422,
      description: "Incandescent tungsten-filament lamp. Filament operates at ~2500 °C in a halogen or inert atmosphere. Failure by filament evaporation (hotspot thinning) and fatigue fracture after thermal cycling.",
    },
    motor: {
      commonPackages: ["dc-130", "dc-280", "dc-motor-n20", "stepper-nema17"],
      typicalBodyMm: { diameter: 13, height: 18 },
      junctionLimitC: 130,
      absoluteMaxTempC: 155,
      description: "Brushed or brushless DC motor. Class B winding insulation (130 °C); bearing grease limit 130 °C. Locked-rotor condition saturates the windings with DC heating up to 40× normal running temperature.",
    },
    thermistor: {
      commonPackages: ["disc-5mm", "bead-1mm", "smd-0402", "smd-0603"],
      typicalBodyMm: { diameter: 5, thickness: 1.5 },
      junctionLimitC: 150,
      absoluteMaxTempC: 150,
      description: "NTC or PTC semiconductor bead or disc in epoxy or glass encapsulant. Self-heating above rated power shifts the indicated temperature; above 150 °C the semiconductor doping profile degrades permanently.",
    },
    transformer: {
      commonPackages: ["ei-30", "ei-42", "toroid-30", "smd-ep-7"],
      typicalBodyMm: { width: 30, height: 26, depth: 12 },
      junctionLimitC: 130,
      absoluteMaxTempC: 155,
      description: "Laminated silicon-steel core, Class B enameled copper windings. Core saturates at rated flux density (1.4–1.7 T). Winding insulation Class B 130 °C; inter-winding arc possible above 155 °C.",
    },
    crystal: {
      commonPackages: ["hc-49s", "hc-49u", "smd-3225", "smd-5032"],
      typicalBodyMm: { length: 11.8, width: 5.0, height: 4.3 },
      junctionLimitC: 85,
      absoluteMaxTempC: 125,
      description: "AT-cut quartz crystal in hermetically sealed metal or ceramic can. Drive-level limit ~1 mW; excess drive stress causes electrode delamination and microfracture. Frequency drifts irreversibly before fracture.",
    },
    wire: {
      commonPackages: ["stranded-chassis", "solid-building", "fine-stranded-flexible"],
      typicalBodyMm: { conductorDiameterMm: 1.628 },
      junctionLimitC: 80,
      absoluteMaxTempC: 1200,
      description: "Stranded or solid conductor with polymer insulation jacket. Ampacity per NEC Table 310.16 (75 °C column). Thermal limit is set by the insulation class — see WIRE_INSULATION_SPECS for per-class data.",
    },
    generic: {
      commonPackages: ["through-hole", "smd"],
      typicalBodyMm: { length: 5, width: 5, height: 3 },
      junctionLimitC: 125,
      absoluteMaxTempC: 125,
      description: "Generic electronic component assumed rated to 125 °C maximum operating temperature.",
    },
  };


  // Maps raw type strings (keywords, part-number prefixes, aliases) to the
  // canonical physics-family name.  Used by resolveComponentFamily().
  // ---------------------------------------------------------------------------
  const COMPONENT_FAMILY_MAP = {
    // Resistors
    resistor: "resistor", res: "resistor", r: "resistor",
    thermistor: "thermistor", ntc: "thermistor", ptc: "thermistor", rtd: "thermistor",
    // Capacitors
    capacitor: "capacitor", cap: "capacitor",
    electrolytic: "capacitor", ceramic: "capacitor", tantalum: "capacitor",
    "capacitor-ceramic": "capacitor",
    // Inductors
    inductor: "inductor", coil: "inductor", choke: "inductor", ferrite: "inductor",
    // LEDs / Optoelectronics
    led: "led",
    photodiode: "diode",
    // Diodes
    diode: "diode", rectifier: "diode", schottky: "diode",
    "zener-diode": "zener_diode", zener: "zener_diode",
    // BJT Transistors
    bjt: "bjt", "bjt-npn": "bjt", "bjt-pnp": "bjt", npn: "bjt", pnp: "bjt",
    transistor: "bjt", darlington: "bjt",
    "2n": "bjt", bc: "bjt", bd: "bjt", tip: "bjt",
    // MOSFETs
    mosfet: "mosfet", nmos: "mosfet", pmos: "mosfet", nfet: "mosfet", pfet: "mosfet",
    irf: "mosfet", irfz: "mosfet",
    // Op-Amps
    opamp: "opamp", "op-amp": "opamp", "op_amp": "opamp",
    lm741: "opamp", lm324: "opamp", tl072: "opamp", tl071: "opamp",
    ne5532: "opamp", mcp6002: "opamp",
    // Voltage Regulators
    voltage_regulator: "voltage_regulator", "voltage-regulator": "voltage_regulator",
    regulator: "voltage_regulator", ldo: "voltage_regulator",
    lm7805: "voltage_regulator", lm7812: "voltage_regulator", lm317: "voltage_regulator",
    lm1117: "voltage_regulator",
    // ICs / Microcontrollers
    ic: "ic", chip: "ic", microcontroller: "ic", mcu: "ic",
    ne555: "ic", "555": "ic",
    atmega: "ic", attiny: "ic", pic: "ic",
    stm32: "ic", esp32: "ic", esp8266: "ic", arduino: "ic",
    // Batteries / Power Sources
    battery: "battery", cell: "battery", ac_source: "battery",
    // Switches
    switch: "switch", sw: "switch",
    // Relays
    relay: "relay",
    // Heatsinks
    heatsink: "heatsink", "heat-sink": "heatsink", "heat_sink": "heatsink",
    // Other passives
    fuse: "fuse",
    lamp: "lamp", bulb: "lamp",
    motor: "motor",
    speaker: "motor",
    transformer: "transformer", xfmr: "transformer",
    crystal: "crystal", xtal: "crystal", oscillator: "crystal",
    potentiometer: "resistor",
    // Wires / Conductors
    wire: "wire", conductor: "wire", "hook-up-wire": "wire",
    "wire-awg": "wire", "hookup": "wire", cable: "wire",
  };

  // ---------------------------------------------------------------------------
  // Component Profiles — default electrical / thermal properties per family.
  // These are merged with user-supplied properties in normalizeComponent().
  // ---------------------------------------------------------------------------
  const COMPONENT_PROFILES = {
    battery: {
      defaultProperties: {
        voltage: 9,
        internalResistance: 0.2,
        capacityMah: 1500,
        tempCoeff: 0.0004,
        thermalResistance: 35,
        maxDischargeCurrent: 2,
      },
    },
    resistor: {
      defaultProperties: {
        resistance: 100,
        tempCoeff: 0.0005,
        tolerance: 0.05,
        thermalResistance: 75,
        powerRating: 0.25,
      },
    },
    led: {
      defaultProperties: {
        forwardVoltage: 2,
        seriesResistance: 120,
        efficiency: 0.35,
        thermalResistance: 120,
        maxCurrent: 0.02,
      },
    },
    switch: {
      defaultProperties: {
        onResistance: 0.05,
        offResistance: 1000000,
        transitionTimeMs: 2,
        maxCurrent: 5,
      },
    },
    capacitor: {
      defaultProperties: {
        capacitance: 1e-6,
        esr: 0.1,
        tempCoeff: 0.0002,
        thermalResistance: 40,
        maxVoltage: 50,
      },
    },
    inductor: {
      defaultProperties: {
        inductance: 1e-3,
        resistance: 5,
        thermalResistance: 55,
        powerRating: 0.5,
      },
    },
    mosfet: {
      defaultProperties: {
        vth: 4,
        rds_on: 0.044,
        id_max: 33,
        vds_max: 100,
        vgs_max: 20,
        powerRating: 130,
        thermalResistance: 0.92,
        maxTempC: 175,
      },
    },
    heatsink: {
      defaultProperties: {
        thermalResistanceJA: 10,
        maxTempC: 200,
        thermalResistance: 2,
      },
    },
    bjt: {
      defaultProperties: {
        vce_max: 40,
        ic_max: 0.6,
        hfe: 100,
        vbe: 0.7,
        powerRating: 0.625,
        thermalResistance: 200,
        maxTempC: 150,
      },
    },
    diode: {
      defaultProperties: {
        forwardVoltage: 0.7,
        maxCurrent: 1,
        reverseVoltage: 50,
        thermalResistance: 60,
        powerRating: 1,
      },
    },
    zener_diode: {
      defaultProperties: {
        zenerVoltage: 5.1,
        maxCurrent: 0.05,
        powerRating: 0.5,
        thermalResistance: 150,
      },
    },
    opamp: {
      defaultProperties: {
        supplyVoltage: 15,
        slewRate: 0.5,
        gainBandwidth: 1e6,
        inputOffsetVoltage: 0.001,
        powerRating: 0.5,
        thermalResistance: 100,
      },
    },
    voltage_regulator: {
      defaultProperties: {
        outputVoltage: 5,
        dropoutVoltage: 2,
        maxCurrent: 1.5,
        powerRating: 15,
        thermalResistance: 5,
        maxTempC: 150,
      },
    },
    ic: {
      defaultProperties: {
        supplyVoltage: 5,
        maxCurrent: 0.1,
        powerRating: 1,
        thermalResistance: 70,
      },
    },
    relay: {
      defaultProperties: {
        coilVoltage: 5,
        coilResistance: 72,
        maxSwitchCurrent: 5,
        maxSwitchVoltage: 250,
        thermalResistance: 80,
      },
    },
    fuse: {
      defaultProperties: {
        ratedCurrentA: 1,
        meltingI2t: 1,
        resistance: 0.02,
        thermalResistance: 40,
      },
    },
    lamp: {
      defaultProperties: {
        ratedVoltage: 12,
        ratedWatts: 5,
        thermalResistance: 30,
      },
    },
    motor: {
      defaultProperties: {
        ratedVoltage: 12,
        ratedCurrentA: 0.5,
        ratedRpm: 3000,
        resistance: 8,
        thermalResistance: 15,
      },
    },
    thermistor: {
      defaultProperties: {
        resistance: 10000,
        beta: 3950,
        tempCoeff: -0.04,
        thermalResistance: 120,
      },
    },
    transformer: {
      defaultProperties: {
        turnsRatio: 10,
        primaryResistance: 2,
        secondaryResistance: 0.02,
        powerRating: 50,
        thermalResistance: 8,
      },
    },
    crystal: {
      defaultProperties: {
        frequencyHz: 16e6,
        seriesResistance: 10,
        thermalResistance: 200,
      },
    },
    wire: {
      defaultProperties: {
        // Rated continuous current capacity (A) — default matches 14 AWG THHN chassis ampacity
        ampacityA: 15,
        // Insulation class maximum continuous operating temperature (°C) — default PVC 80 °C
        insulationMaxTempC: 80,
        // Thermal resistance of the insulation jacket (°C/W) — governs how quickly
        // conductor heat conducts outward to the jacket surface
        thermalResistance: 12,
        // DC resistance per metre of conductor (Ω/m) — 14 AWG annealed copper
        resistanceOhmPerMeter: 0.0082,
        // Maximum rated voltage (V) — 600 V for THHN
        maxVoltageV: 600,
      },
    },
    generic: {
      defaultProperties: {
        resistance: 1000,
        thermalResistance: 60,
        powerRating: 0.25,
      },
    },
  };

  // ---------------------------------------------------------------------------
  // Component Failure Profiles
  // Physical failure modes for every known component family.  Each entry has:
  //   name              — human-readable failure mode name
  //   visual            — visual effect key used by the renderer
  //                       ("char" | "blowout" | "melt" | "arc" | "burst" | "vent" | "smoke" | "glow")
  //   physicalDescription — accurate description of what physically happens
  //   trigger(metrics, props) → boolean  — returns true when failure condition met
  //   severity(metrics, props) → 0-3     — 0=none, 1=stressed, 2=critical, 3=destroyed
  // ---------------------------------------------------------------------------
  const COMPONENT_FAILURE_PROFILES = {
    resistor: {
      modes: {
        overpower: {
          name: "Thermal Overload",
          visual: "char",
          physicalDescription:
            "Carbon film ablates from the ceramic substrate. The body chars and darkens, then cracks open. Acrid smoke and carbon particles are emitted. Resistance drifts high before the element opens completely.",
          // Trigger once effective thermal power exceeds the rated dissipation.
          // Real resistors begin accumulating thermal stress above their rated power —
          // not just at 1.5× it — so the warning→failure progression is visible.
          trigger: (metrics, props) => metrics.powerDissipation > (props.powerRating ?? 0.25),
          // Severity scales continuously from 0 (at rated power) → 3 (at 2× rated).
          // severity = 2 (failed) when power = 1.667× rated; severity = 1.5 (warning
          // particles) at 1.5× rated.  Matches physical reality: components degrade
          // progressively rather than jumping straight from OK to destroyed.
          severity: (metrics, props) =>
            Math.min(((metrics.powerDissipation / (props.powerRating ?? 0.25)) - 1) * 3, 3),
        },
        overtemp: {
          name: "Temperature Limit Exceeded",
          visual: "char",
          physicalDescription:
            "Resistive element collapses under sustained heat. Leads pull away from the body and end caps may dislodge. The component is permanently open-circuit.",
          trigger: (metrics) => (metrics.ambientTemperature ?? 25) + metrics.thermalRise > 155,
          severity: (metrics) => Math.min((((metrics.ambientTemperature ?? 25) + metrics.thermalRise) - 130) / 30, 3),
        },
      },
    },
    capacitor: {
      modes: {
        overvoltage: {
          name: "Dielectric Breakdown",
          visual: "burst",
          physicalDescription:
            "The dielectric breaks down under excess voltage. Electrolyte vaporizes rapidly — the pressure relief vent (or the entire can) ruptures. Electrolyte mist sprays outward. A crackling pop is audible.",
          trigger: (metrics, props) => metrics.operatingVoltage > (props.maxVoltage ?? 50) * 1.2,
          severity: (metrics, props) =>
            Math.min((metrics.operatingVoltage / ((props.maxVoltage ?? 50) * 1.5)) * 3, 3),
        },
        overtemp: {
          name: "Electrolyte Boilover",
          visual: "burst",
          physicalDescription:
            "Electrolyte boils inside the sealed can. Gas pressure forces the relief vent open — or the capacitor bursts at the weld seam. The top dome bulges noticeably before rupture.",
          trigger: (metrics) => (metrics.ambientTemperature ?? 25) + metrics.thermalRise > 125,
          severity: (metrics) => Math.min((((metrics.ambientTemperature ?? 25) + metrics.thermalRise) - 100) / 30, 3),
        },
        humidity_leakage: {
          name: "Humidity-Induced Electrolyte Absorption",
          visual: "smoke",
          physicalDescription:
            "High ambient humidity accelerates moisture absorption into the electrolytic capacitor seal. Elevated leakage current degrades capacitance and raises ESR. Prolonged exposure causes the aluminium oxide dielectric to dissolve, ultimately leading to seal failure and electrolyte seepage.",
          trigger: (metrics) => (metrics.humidity ?? 0) > 75,
          severity: (metrics) => Math.min(((metrics.humidity ?? 0) - 75) / 20, 3),
        },
      },
    },
    led: {
      modes: {
        overcurrent: {
          name: "Junction Burnout",
          visual: "blowout",
          physicalDescription:
            "Thermal runaway destroys the semiconductor die. The bond wire vaporizes in a flash, opening the circuit permanently. The epoxy lens discolors yellow-brown. No light is emitted afterward.",
          trigger: (metrics, props) => metrics.currentRms > (props.maxCurrent ?? 0.02) * 1.5,
          severity: (metrics, props) =>
            Math.min((metrics.currentRms / ((props.maxCurrent ?? 0.02) * 2.5)) * 3, 3),
        },
        overtemp: {
          name: "Phosphor Degradation",
          visual: "char",
          physicalDescription:
            "Die temperature exceeds junction limit. Phosphor layer disintegrates and emission drops sharply. The lens yellows and may crack from thermal stress.",
          trigger: (metrics) => (metrics.ambientTemperature ?? 25) + metrics.thermalRise > 125,
          severity: (metrics) => Math.min((((metrics.ambientTemperature ?? 25) + metrics.thermalRise) - 100) / 30, 3),
        },
      },
    },
    mosfet: {
      modes: {
        overcurrent: {
          name: "Drain Current Burnout",
          visual: "melt",
          physicalDescription:
            "Drain current exceeds Id_max — the aluminum bond wires inside the package fuse and vaporize. The silicon die cracks from the thermal shock. Package plastic discolors and may fracture. Drain-source forms a permanent short or open.",
          trigger: (metrics, props) => metrics.currentRms > (props.id_max ?? 10) * 1.2,
          severity: (metrics, props) =>
            Math.min((metrics.currentRms / ((props.id_max ?? 10) * 1.5)) * 3, 3),
        },
        overvoltage: {
          name: "Avalanche Breakdown",
          visual: "arc",
          physicalDescription:
            "Vds exceeds the avalanche rating — hot electrons punch through the drift region. If energy is too high, the junction temperature spikes locally. Gate oxide ruptures from Vgs overshoot. A burn spot forms; drain-source permanently shorts.",
          trigger: (metrics, props) => metrics.operatingVoltage > (props.vds_max ?? 60) * 1.1,
          severity: (metrics, props) =>
            Math.min((metrics.operatingVoltage / ((props.vds_max ?? 60) * 1.3)) * 3, 3),
        },
        overtemp: {
          name: "Thermal Runaway / Second Breakdown",
          visual: "melt",
          physicalDescription:
            "Second breakdown occurs — a current filament concentrates heat in a microscopic region. Silicon melts at 1,414 °C. The package discolors from silver to brown to black. Leads may pull loose. Device opens or shorts permanently.",
          trigger: (metrics, props) => (metrics.ambientTemperature ?? 25) + metrics.thermalRise > (props.maxTempC ?? 175),
          severity: (metrics, props) => Math.min((((metrics.ambientTemperature ?? 25) + metrics.thermalRise) - 150) / 30, 3),
        },
      },
    },
    battery: {
      modes: {
        overload: {
          name: "Thermal Venting",
          visual: "vent",
          physicalDescription:
            "High discharge current heats the electrolyte. The case swells. The safety vent opens, releasing hydrogen gas and electrolyte vapor. In Li-ion cells this can escalate to uncontrolled thermal runaway and fire.",
          trigger: (metrics, props) => metrics.powerDissipation > (props.maxPower ?? 10),
          severity: (metrics, props) =>
            Math.min(metrics.powerDissipation / ((props.maxPower ?? 10) * 1.5), 3),
        },
        overtemp: {
          name: "Electrolyte Decomposition",
          visual: "vent",
          physicalDescription:
            "Separator melts, causing an internal short. Rapid exothermic reaction builds pressure. The cell vents violently — electrolyte spray, intense heat, potential fire or explosion.",
          trigger: (metrics) => (metrics.ambientTemperature ?? 25) + metrics.thermalRise > 60,
          severity: (metrics) => Math.min((((metrics.ambientTemperature ?? 25) + metrics.thermalRise) - 50) / 20, 3),
        },
      },
    },
    switch: {
      modes: {
        arc: {
          name: "Contact Arcing / Welding",
          visual: "arc",
          physicalDescription:
            "During opening, an arc forms between the contacts. Arc plasma reaches 6,000–10,000 °C, vaporizing and eroding contact material. Carbon deposits increase resistance. Repeated arcing may weld the contacts permanently shut.",
          trigger: (metrics, props) => metrics.currentRms > (props.maxCurrent ?? 5) * 1.3,
          severity: (metrics, props) =>
            Math.min((metrics.currentRms / ((props.maxCurrent ?? 5) * 2)) * 3, 3),
        },
        overtemp: {
          name: "Contact Overheating",
          visual: "melt",
          physicalDescription:
            "Excessive current heats the contact mass. Contact material fuses together — the switch is permanently closed. The housing may deform or melt at the contact entry points.",
          trigger: (metrics) => (metrics.ambientTemperature ?? 25) + metrics.thermalRise > 120,
          severity: (metrics) => Math.min((((metrics.ambientTemperature ?? 25) + metrics.thermalRise) - 100) / 30, 3),
        },
      },
    },
    inductor: {
      modes: {
        overpower: {
          name: "Winding Insulation Failure",
          visual: "smoke",
          physicalDescription:
            "Enamel insulation on copper windings softens and carbonizes above ~180 °C. Turn-to-turn shorts develop, inductance collapses, and current spikes. Smoke with a characteristic burnt-plastic odor is emitted.",
          trigger: (metrics) => (metrics.ambientTemperature ?? 25) + metrics.thermalRise > 130,
          severity: (metrics) => Math.min((((metrics.ambientTemperature ?? 25) + metrics.thermalRise) - 100) / 40, 3),
        },
      },
    },
    heatsink: {
      modes: {
        overtemp: {
          name: "Thermal Saturation",
          visual: "glow",
          physicalDescription:
            "Fin temperature exceeds design limits. Aluminum oxidizes — fins discolor from silver to dark gray. Thermal compound between component and sink degrades and dries out, dramatically increasing interface resistance. Attached components overheat.",
          trigger: (metrics) => (metrics.ambientTemperature ?? 25) + metrics.thermalRise > 150,
          severity: (metrics) => Math.min((((metrics.ambientTemperature ?? 25) + metrics.thermalRise) - 100) / 100, 3),
        },
      },
    },
    bjt: {
      modes: {
        overcurrent: {
          name: "Collector Current Burnout",
          visual: "melt",
          physicalDescription:
            "Collector current exceeds Ic_max — aluminum bond wires fuse inside the package. Silicon die cracks from thermal shock. Second breakdown occurs when a conducting filament concentrates current in one spot, melting the junction locally. Package chars and the transistor is permanently open.",
          trigger: (metrics, props) => metrics.currentRms > (props.ic_max ?? 0.5) * 1.3,
          severity: (metrics, props) =>
            Math.min((metrics.currentRms / ((props.ic_max ?? 0.5) * 1.8)) * 3, 3),
        },
        overvoltage: {
          name: "Vce Avalanche Breakdown",
          visual: "arc",
          physicalDescription:
            "Collector-emitter voltage exceeds Vce_max. Avalanche current punches through the base-collector junction — a hot spot forms, junction melts. Characteristic brown scorch mark appears at the die surface. Device shorts collector-to-emitter permanently.",
          trigger: (metrics, props) => metrics.operatingVoltage > (props.vce_max ?? 30) * 1.15,
          severity: (metrics, props) =>
            Math.min((metrics.operatingVoltage / ((props.vce_max ?? 30) * 1.4)) * 3, 3),
        },
        overtemp: {
          name: "Thermal Runaway",
          visual: "melt",
          physicalDescription:
            "Junction temperature rises above 150 °C — leakage current increases, which raises power dissipation further. Positive-feedback loop destroys the junction. Silicon melts at 1,414 °C locally. Device becomes permanently short-circuit.",
          trigger: (metrics, props) => (metrics.ambientTemperature ?? 25) + metrics.thermalRise > (props.maxTempC ?? 150),
          severity: (metrics, props) => Math.min((((metrics.ambientTemperature ?? 25) + metrics.thermalRise) - 120) / 35, 3),
        },
      },
    },
    diode: {
      modes: {
        overcurrent: {
          name: "Forward Current Burnout",
          visual: "blowout",
          physicalDescription:
            "Forward current exceeds rated maximum — the p-n junction overheats and the bond wire melts. The junction fuses open. Epoxy package discolors or cracks. The diode is permanently open-circuit.",
          trigger: (metrics, props) => metrics.currentRms > (props.maxCurrent ?? 1) * 1.5,
          severity: (metrics, props) =>
            Math.min((metrics.currentRms / ((props.maxCurrent ?? 1) * 2.5)) * 3, 3),
        },
        overvoltage: {
          name: "Reverse Avalanche",
          visual: "arc",
          physicalDescription:
            "Reverse voltage exceeds PIV rating — avalanche breakdown occurs. Current spikes through the junction, generating intense local heat. If not current-limited, the junction melts and the diode permanently shorts.",
          trigger: (metrics, props) => metrics.operatingVoltage > (props.reverseVoltage ?? 50) * 1.1,
          severity: (metrics, props) =>
            Math.min((metrics.operatingVoltage / ((props.reverseVoltage ?? 50) * 1.3)) * 3, 3),
        },
      },
    },
    zener_diode: {
      modes: {
        overvoltage: {
          name: "Zener Punch-Through",
          visual: "arc",
          physicalDescription:
            "Exceeding maximum zener power — the regulating avalanche zone becomes non-uniform. Current filaments form in the silicon, melting the junction locally. Zener voltage drifts then collapses to a short.",
          trigger: (metrics, props) => metrics.powerDissipation > (props.powerRating ?? 0.5) * 1.5,
          severity: (metrics, props) =>
            Math.min((metrics.powerDissipation / ((props.powerRating ?? 0.5) * 2)) * 3, 3),
        },
      },
    },
    opamp: {
      modes: {
        overvoltage: {
          name: "Input Stage Latch-Up",
          visual: "melt",
          physicalDescription:
            "Input voltage exceeds supply rails or differential limit. Substrate diodes conduct, triggering parasitic SCR latch-up. Supply current spikes to hundreds of milliamps — the input transistors fuse. Output locks to a rail and the IC may rupture the package.",
          trigger: (metrics, props) => metrics.operatingVoltage > (props.supplyVoltage ?? 15) * 1.2,
          severity: (metrics, props) =>
            Math.min((metrics.operatingVoltage / ((props.supplyVoltage ?? 15) * 1.5)) * 3, 3),
        },
        overtemp: {
          name: "Output Stage Burnout",
          visual: "melt",
          physicalDescription:
            "Output transistors dissipate excess power under short-circuit or overload. Junction temperature climbs past 150 °C — thermal protection may trip or the output stage fails permanently. Package surface discolors and may blister.",
          trigger: (metrics) => (metrics.ambientTemperature ?? 25) + metrics.thermalRise > 130,
          severity: (metrics) => Math.min((((metrics.ambientTemperature ?? 25) + metrics.thermalRise) - 100) / 35, 3),
        },
      },
    },
    voltage_regulator: {
      modes: {
        overtemp: {
          name: "Thermal Shutdown / Burnout",
          visual: "melt",
          physicalDescription:
            "Input-output voltage difference times load current exceeds package rating. Internal thermal shutdown trips repeatedly. If heat sinking is inadequate, junction temperature exceeds 150 °C — the pass transistor melts through. Output voltage collapses and input is shorted to output permanently.",
          trigger: (metrics, props) => (metrics.ambientTemperature ?? 25) + metrics.thermalRise > (props.maxTempC ?? 150),
          severity: (metrics, props) => Math.min((((metrics.ambientTemperature ?? 25) + metrics.thermalRise) - 120) / 35, 3),
        },
        overcurrent: {
          name: "Current Limit Latch-Off",
          visual: "smoke",
          physicalDescription:
            "Output current exceeds device maximum. Current limiting activates, power dissipation spikes inside the package. Repeated trips degrade the junction. Eventually the regulator latches off or the pass element shorts.",
          trigger: (metrics, props) => metrics.currentRms > (props.maxCurrent ?? 1.5) * 1.4,
          severity: (metrics, props) =>
            Math.min((metrics.currentRms / ((props.maxCurrent ?? 1.5) * 2)) * 3, 3),
        },
      },
    },
    ic: {
      modes: {
        overvoltage: {
          name: "Supply Overvoltage / ESD",
          visual: "arc",
          physicalDescription:
            "Supply voltage exceeds Vcc_max or an electrostatic discharge enters an I/O pin. Gate oxide in logic transistors is permanently ruptured — punch-through disables logic cells. The IC may show erratic behavior or complete failure. A small burn mark may be visible on the die under magnification.",
          trigger: (metrics, props) => metrics.operatingVoltage > (props.supplyVoltage ?? 5) * 1.3,
          severity: (metrics, props) =>
            Math.min((metrics.operatingVoltage / ((props.supplyVoltage ?? 5) * 1.6)) * 3, 3),
        },
        overtemp: {
          name: "Thermal Die Failure",
          visual: "melt",
          physicalDescription:
            "Tj exceeds absolute maximum — metal interconnect migrates (electromigration). Aluminum traces thin and open, or copper pillars crack. Logic function fails non-recoverable. Package may blister; die bond pads pull away.",
          trigger: (metrics) => (metrics.ambientTemperature ?? 25) + metrics.thermalRise > 110,
          severity: (metrics) => Math.min((((metrics.ambientTemperature ?? 25) + metrics.thermalRise) - 85) / 35, 3),
        },
        humidity_surface_leakage: {
          name: "Surface Leakage / Dendritic Growth",
          visual: "arc",
          physicalDescription:
            "At very high humidity, condensation forms on the IC package surface. Ionic contamination enables electrochemical migration between adjacent pins — metallic dendrites grow across the substrate and can short I/O pads together. Erratic logic operation precedes permanent failure.",
          trigger: (metrics) => (metrics.humidity ?? 0) > 85,
          severity: (metrics) => Math.min(((metrics.humidity ?? 0) - 85) / 12, 3),
        },
      },
    },
    relay: {
      modes: {
        coil_overload: {
          name: "Coil Burnout",
          visual: "smoke",
          physicalDescription:
            "Excess voltage across the coil drives current far above rated value — enamel insulation on the magnet wire melts and shorts turn-to-turn. I²R heating chars the bobbin. The coil opens permanently; relay will not actuate.",
          trigger: (metrics, props) => {
            const coilR = props.coilResistance ?? 72;
            const coilI = coilR > 0 ? metrics.operatingVoltage / coilR : 0;
            const ratedI = props.coilVoltage != null && coilR > 0 ? props.coilVoltage / coilR : 0.07;
            return coilI > ratedI * 1.8;
          },
          severity: (metrics, props) => {
            const coilR = props.coilResistance ?? 72;
            const coilI = coilR > 0 ? metrics.operatingVoltage / coilR : 0;
            const ratedI = props.coilVoltage != null && coilR > 0 ? props.coilVoltage / coilR : 0.07;
            return Math.min((coilI / (ratedI * 2.5)) * 3, 3);
          },
        },
        contact_overload: {
          name: "Contact Welding",
          visual: "arc",
          physicalDescription:
            "Switched current exceeds contact rating. Arc energy vaporizes and deposits contact material. Pitting accelerates until contacts weld together on closure. The relay is permanently closed; armature cannot open.",
          trigger: (metrics, props) => metrics.currentRms > (props.maxSwitchCurrent ?? 5) * 1.2,
          severity: (metrics, props) =>
            Math.min((metrics.currentRms / ((props.maxSwitchCurrent ?? 5) * 1.8)) * 3, 3),
        },
      },
    },
    fuse: {
      modes: {
        overcurrent: {
          name: "Fuse Element Melts",
          visual: "blowout",
          physicalDescription:
            "Current exceeds rated I²t — the fuse element (silver or copper alloy wire) heats past its melting point in milliseconds. The element vaporizes in a flash, forming an arc that is quenched by the filler sand (in HRC types) or extinguishes naturally (glass cartridge). Circuit is permanently open; fuse must be replaced.",
          trigger: (metrics, props) => metrics.currentRms > (props.ratedCurrentA ?? 1) * 1.1,
          severity: (metrics, props) =>
            Math.min((metrics.currentRms / ((props.ratedCurrentA ?? 1) * 1.5)) * 3, 3),
        },
      },
    },
    lamp: {
      modes: {
        overpower: {
          name: "Filament Burnout",
          visual: "blowout",
          physicalDescription:
            "Tungsten filament temperature exceeds design limit — tungsten migrates from thin hot spots to cooler areas (sublimation). The filament thins progressively until it snaps open. Glass envelope may turn black from tungsten deposits. Bulb flashes brightly for a millisecond before opening.",
          trigger: (metrics, props) => metrics.powerDissipation > (props.ratedWatts ?? 5) * 1.3,
          severity: (metrics, props) =>
            Math.min((metrics.powerDissipation / ((props.ratedWatts ?? 5) * 1.8)) * 3, 3),
        },
      },
    },
    motor: {
      modes: {
        overcurrent: {
          name: "Winding Burnout",
          visual: "smoke",
          physicalDescription:
            "Stall or severe overload drives armature current far above rated value. I²R heating chars the enamel insulation on armature windings — turn-to-turn shorts form, current rises further. Smoke with a distinctive burnt-varnish odor is produced. The motor may seize if molten insulation contacts commutator segments.",
          trigger: (metrics, props) => metrics.currentRms > (props.ratedCurrentA ?? 0.5) * 2.5,
          severity: (metrics, props) =>
            Math.min((metrics.currentRms / ((props.ratedCurrentA ?? 0.5) * 4)) * 3, 3),
        },
        overtemp: {
          name: "Bearing Seizure",
          visual: "char",
          physicalDescription:
            "Sustained overtemperature degrades bearing lubricant. Metal-to-metal contact increases friction, raises temperature further. Bearing races deform and the shaft seizes — rotor locks up. Continuing to apply voltage drives winding burnout.",
          trigger: (metrics) => (metrics.ambientTemperature ?? 25) + metrics.thermalRise > 100,
          severity: (metrics) => Math.min((((metrics.ambientTemperature ?? 25) + metrics.thermalRise) - 80) / 30, 3),
        },
      },
    },
    thermistor: {
      modes: {
        overtemp: {
          name: "Self-Heating Deviation",
          visual: "glow",
          physicalDescription:
            "NTC thermistor body temperature rises significantly above ambient due to self-heating (I²R). Measured resistance now reflects sensor body temperature rather than ambient — readings are inaccurate. At extreme temperatures the ceramic substrate can crack, permanently shifting or opening the element.",
          trigger: (metrics) => (metrics.ambientTemperature ?? 25) + metrics.thermalRise > 80,
          severity: (metrics) => Math.min((((metrics.ambientTemperature ?? 25) + metrics.thermalRise) - 60) / 30, 3),
        },
      },
    },
    transformer: {
      modes: {
        overtemp: {
          name: "Winding Insulation Breakdown",
          visual: "smoke",
          physicalDescription:
            "Sustained overload heats primary or secondary winding past insulation class limit. Class B insulation fails above 130 °C; Class F above 155 °C. Inter-winding arc-over may occur. The transformer hums louder, draws high no-load current, and eventually shorts the supply.",
          trigger: (metrics) => (metrics.ambientTemperature ?? 25) + metrics.thermalRise > 110,
          severity: (metrics) => Math.min((((metrics.ambientTemperature ?? 25) + metrics.thermalRise) - 85) / 35, 3),
        },
      },
    },
    crystal: {
      modes: {
        overpower: {
          name: "Crystal Drive Overdrive",
          visual: "char",
          physicalDescription:
            "Excess drive level from the oscillator circuit stresses the quartz element. AT-cut crystals develop microfractures at the electrode edges. Frequency drifts, aging rate accelerates, and the crystal may fracture completely — permanently stopping oscillation.",
          trigger: (metrics) => metrics.powerDissipation > 0.001,
          severity: (metrics) => Math.min((metrics.powerDissipation / 0.002) * 3, 3),
        },
      },
    },
    wire: {
      modes: {
        overcurrent: {
          name: "Wire Overcurrent / Conductor Heating",
          visual: "smoke",
          physicalDescription:
            "Current exceeds the wire's rated ampacity. I²R heating in the conductor raises its temperature above the design limit. Thermal energy conducts outward through the insulation jacket — the jacket surface becomes hot to the touch, then begins to soften and deform. If overcurrent is sustained, the insulation chars, splits, or melts away.",
          // Trigger whenever current exceeds the wire's rated continuous ampacity.
          // Prefer props.ampacityA (chassis), then look up from WIRE_GAUGE_TABLE if awg is set.
          trigger: (metrics, props) => {
            const ampacity = props.ampacityA ?? props.ampacityChassisA ?? getWireGaugeData(props.awg)?.ampacityChassisA ?? 15;
            return metrics.currentRms > ampacity;
          },
          // Severity scales from 0 (at rated ampacity) to 3 (at 2.33× ampacity).
          severity: (metrics, props) => {
            const ampacity = props.ampacityA ?? props.ampacityChassisA ?? getWireGaugeData(props.awg)?.ampacityChassisA ?? 15;
            return Math.min(((metrics.currentRms / ampacity) - 1) * 3, 3);
          },
        },
        insulation_burnthrough: {
          name: "Insulation Burnthrough — Short-Circuit Risk",
          visual: "arc",
          // Dynamic description built at trigger-time using the insulation class specs.
          physicalDescription:
            "Wire temperature has risen above the insulation class rating. Once this thermal limit is crossed, the polymer matrix breaks down: it softens, flows, then chars. The exposed bare conductor can contact adjacent conductors or a grounded chassis, creating a dead short. Sustained arcing erodes both conductors and can ignite surrounding materials.",
          // Trigger when the conductor has heated the insulation past its class limit.
          // Prefer props.insulationMaxTempC, then look up from WIRE_INSULATION_SPECS if
          // props.insulationClass is set, then fall back to PVC-80 default (80 °C).
          trigger: (metrics, props) => {
            const insulSpec = props.insulationClass ? WIRE_INSULATION_SPECS[props.insulationClass] : null;
            const limitC = props.insulationMaxTempC ?? insulSpec?.thermalLimitC ?? 80;
            return (25 + metrics.thermalRise) > limitC;
          },
          // Severity ramps from 0 at the insulation limit up to 3 at limit+60 °C —
          // matching the narrow window between first degradation (charring, cracking)
          // and total burnthrough / arcing.
          severity: (metrics, props) => {
            const insulSpec = props.insulationClass ? WIRE_INSULATION_SPECS[props.insulationClass] : null;
            const limitC = props.insulationMaxTempC ?? insulSpec?.thermalLimitC ?? 80;
            const temp = 25 + metrics.thermalRise;
            return Math.min((temp - limitC) / 60, 3);
          },
        },
        voltage_overstress: {
          name: "Insulation Dielectric Overstress",
          visual: "arc",
          physicalDescription:
            "Applied voltage exceeds the insulation's rated dielectric withstand level. The polymer jacket undergoes partial discharge (corona) followed by electrical treeing — microscopic carbonised channels propagate through the insulation. Once a channel bridges conductor to outer surface the insulation punctures, creating a dead short or arc fault.",
          // Trigger when operating voltage exceeds the insulation's voltage rating.
          // Only applies when insulationClass is known and maxVoltageV > 0.
          trigger: (metrics, props) => {
            const insulSpec = props.insulationClass ? WIRE_INSULATION_SPECS[props.insulationClass] : null;
            const maxV = props.maxVoltageV ?? insulSpec?.maxVoltageV ?? 600;
            return maxV > 0 && metrics.operatingVoltage > maxV * 1.2;
          },
          severity: (metrics, props) => {
            const insulSpec = props.insulationClass ? WIRE_INSULATION_SPECS[props.insulationClass] : null;
            const maxV = props.maxVoltageV ?? insulSpec?.maxVoltageV ?? 600;
            if (maxV <= 0) return 0;
            return Math.min(((metrics.operatingVoltage / maxV) - 1.0) * 5, 3);
          },
        },
      },
    },
    generic: {
      modes: {
        overtemp: {
          name: "Thermal Overload",
          visual: "char",
          physicalDescription:
            "Component temperature exceeds material limits. Insulation chars, bonding compounds melt, and contacts oxidize. The component may open-circuit, short-circuit, or degrade in performance depending on its construction.",
          trigger: (metrics) => (metrics.ambientTemperature ?? 25) + metrics.thermalRise > 100,
          severity: (metrics) => Math.min((((metrics.ambientTemperature ?? 25) + metrics.thermalRise) - 80) / 30, 3),
        },
        overpower: {
          name: "Power Dissipation Limit",
          visual: "smoke",
          physicalDescription:
            "Dissipated power exceeds rated maximum. Heat cannot be transferred away fast enough — body temperature rises until the most thermally sensitive part fails. Smoke or discoloration may appear. Electrical parameters shift significantly.",
          trigger: (metrics, props) => metrics.powerDissipation > (props.powerRating ?? 0.25) * 1.5,
          severity: (metrics, props) =>
            Math.min((metrics.powerDissipation / ((props.powerRating ?? 0.25) * 2.5)) * 3, 3),
        },
      },
    },
  };

  // ---------------------------------------------------------------------------
  // resolveComponentFamily
  // Resolves any imported type string → canonical physics family.
  //
  // Resolution order:
  //   1. Direct match against COMPONENT_PROFILES keys
  //   2. Exact match in COMPONENT_FAMILY_MAP (handles aliases / abbreviations)
  //   3. Starts-with / contains scan of COMPONENT_FAMILY_MAP keys
  //      (handles branded part numbers: "IRF840", "2N2222", "BC547", "LM741", …)
  //   4. Property-signature heuristic (for completely unknown types)
  //   5. Falls back to "generic"
  // ---------------------------------------------------------------------------
  function resolveComponentFamily(rawType, props) {
    if (!rawType || typeof rawType !== "string") {
      return "generic";
    }
    const t = rawType.toLowerCase().trim().replace(/\s+/g, "-");

    // 1. Exact match in the family map (covers aliases, part-number prefixes, registered types)
    if (COMPONENT_FAMILY_MAP[t]) {
      return COMPONENT_FAMILY_MAP[t];
    }

    // 2. Direct match against known canonical profile keys
    if (COMPONENT_PROFILES[t]) {
      return t;
    }

    // 3. Prefix scan for part-number prefixes (e.g. "irf" → mosfet, "2n" → bjt, "bc" → bjt).
    //    Uses startsWith only — avoids false matches from short keywords appearing mid-string.
    //    Skip single-char keys ("r", "c") as they are too broad.
    for (const [keyword, family] of Object.entries(COMPONENT_FAMILY_MAP)) {
      if (keyword.length < 2) continue;
      if (t.startsWith(keyword)) {
        return family;
      }
    }

    // 4. Property-signature heuristic
    if (props && typeof props === "object") {
      if (typeof props.inductance === "number") return "inductor";
      if (typeof props.capacitance === "number") return "capacitor";
      if (typeof props.forwardVoltage === "number") return "diode";
      if (typeof props.rds_on === "number" || typeof props.vth === "number") return "mosfet";
      if (typeof props.hfe === "number" || typeof props.vce_max === "number") return "bjt";
      if (typeof props.coilVoltage === "number") return "relay";
      if (typeof props.ratedCurrentA === "number" && typeof props.meltingI2t === "number") return "fuse";
      if (typeof props.internalResistance === "number" || typeof props.capacityMah === "number") return "battery";
      if (typeof props.turnsRatio === "number") return "transformer";
      if (typeof props.ampacityA === "number" || typeof props.insulationMaxTempC === "number") return "wire";
      if (typeof props.resistance === "number") return "resistor";
    }

    return "generic";
  }

  // ---------------------------------------------------------------------------
  // detectFailure
  // Evaluates a component's metrics against its failure profile.
  // Returns:
  //   { failed, severity, name, visual, description, mode, family }
  //   where severity 0 = OK, 1 = stressed, 2 = critical, 3 = destroyed.
  // ---------------------------------------------------------------------------
  function detectFailure(component, metrics) {
    const empty = { failed: false, severity: 0, mode: null, description: null, name: null, visual: null, family: null };
    if (!component || !metrics) {
      return empty;
    }

    const family = resolveComponentFamily(component.type, component.properties);

    // Look up profile: exact type first, then resolved family, then generic
    const profile =
      COMPONENT_FAILURE_PROFILES[component.type] ||
      COMPONENT_FAILURE_PROFILES[family] ||
      COMPONENT_FAILURE_PROFILES.generic;

    if (!profile) {
      return empty;
    }

    const props = component.properties || {};
    let worstSeverity = 0;
    let worstMode = null;

    for (const [, modeData] of Object.entries(profile.modes)) {
      try {
        if (modeData.trigger(metrics, props)) {
          const sev = modeData.severity ? Math.max(0, modeData.severity(metrics, props)) : 1;
          if (sev > worstSeverity) {
            worstSeverity = sev;
            worstMode = modeData;
          }
        }
      } catch (_err) {
        // Silently skip malformed trigger functions from third-party registrations
      }
    }

    if (worstSeverity <= 0) {
      return empty;
    }

    return {
      failed: worstSeverity >= 2,
      severity: worstSeverity,
      family,
      mode: worstMode,
      description: worstMode ? worstMode.physicalDescription : null,
      name: worstMode ? worstMode.name : null,
      visual: worstMode ? worstMode.visual : null,
    };
  }

  // ---------------------------------------------------------------------------
  // registerComponentType
  // Register or override a component type profile at runtime.
  // Used when importing branded / third-party components.
  //
  // spec: {
  //   defaultProperties  {Object}  — merged over family defaults
  //   failureModes       {Object}  — mode map (replaces existing modes)
  //   family             {string}  — canonical family for 3D model / physics fallback
  // }
  // ---------------------------------------------------------------------------
  function registerComponentType(type, spec) {
    if (!type || typeof type !== "string" || !spec || typeof spec !== "object") {
      if (typeof console !== "undefined") {
        console.warn("FailureEngine.registerComponentType: invalid arguments", type, spec);
      }
      return;
    }
    const key = type.toLowerCase().trim();

    if (spec.defaultProperties && typeof spec.defaultProperties === "object") {
      COMPONENT_PROFILES[key] = { defaultProperties: Object.assign({}, spec.defaultProperties) };
    }
    // Note: we intentionally do NOT create an empty COMPONENT_PROFILES entry when only
    // a family alias is registered — that would cause resolveComponentFamily to return
    // the raw type instead of the canonical family name.

    if (spec.failureModes && typeof spec.failureModes === "object") {
      COMPONENT_FAILURE_PROFILES[key] = { modes: Object.assign({}, spec.failureModes) };
    }

    if (spec.family && typeof spec.family === "string") {
      COMPONENT_FAMILY_MAP[key] = spec.family;
    }
  }

  // ---------------------------------------------------------------------------
  // registerFailureProfile
  // Merge additional failure modes into an existing or new component type.
  // ---------------------------------------------------------------------------
  function registerFailureProfile(type, modes) {
    if (!type || typeof type !== "string" || !modes || typeof modes !== "object") {
      if (typeof console !== "undefined") {
        console.warn("FailureEngine.registerFailureProfile: invalid arguments", type, modes);
      }
      return;
    }
    const key = type.toLowerCase().trim();
    if (!COMPONENT_FAILURE_PROFILES[key]) {
      COMPONENT_FAILURE_PROFILES[key] = { modes: {} };
    }
    Object.assign(COMPONENT_FAILURE_PROFILES[key].modes, modes);
  }

  // ---------------------------------------------------------------------------
  // Composition-aware physics integration
  //
  // When ComponentCompositions is loaded (via loadCompositions), detectFailure
  // gains access to real material properties and derives tighter, physically
  // accurate failure thresholds for every component type.
  //
  // Internal stores (populated by loadCompositions):
  //   _compositions   — map of componentType → composition object
  //   _materials      — map of materialKey   → material object
  // ---------------------------------------------------------------------------
  let _compositions = {};
  let _materials = {};

  /**
   * Load physical composition data into the failure engine.
   * Called automatically by component-compositions.js if it loads after this
   * file, or manually at application start.
   *
   * @param {Array}  compositions  — COMPONENT_COMPOSITIONS array
   * @param {Object} materials     — MATERIAL_LIBRARY record
   */
  function loadCompositions(compositions, materials) {
    if (!Array.isArray(compositions) || typeof materials !== "object" || !materials) {
      return;
    }
    _materials = materials;
    _compositions = {};
    compositions.forEach((comp) => {
      if (comp && typeof comp.componentType === "string") {
        const key = comp.componentType.toLowerCase();
        _compositions[key] = comp;
        // Also index by aliases so look-ups work for any type string
        if (Array.isArray(comp.aliases)) {
          comp.aliases.forEach((alias) => {
            _compositions[alias.toLowerCase()] = comp;
          });
        }
      }
    });
  }

  /**
   * Return composition-derived failure thresholds for a component type.
   * Returns null when no composition data has been loaded for this type.
   *
   * Returned object:
   *   criticalLimitC  {number|null}  — operating temperature limit of the critical sub-component
   *   meltingPointC   {number|null}  — meltingPoint of the critical material
   *   thermalMass     {number|null}  — estimated thermal mass (J/K) — proportional to mass-weighted
   *                                    sum of density × specificHeat across sub-components
   *   criticalMat     {Object|null}  — raw material record for the critical sub-component
   *   composition     {Object|null}  — full composition record
   */
  function getCompositionThresholds(typeOrAlias) {
    const key = (typeOrAlias || "").toLowerCase().trim();
    const comp = _compositions[key];
    if (!comp) return null;

    const critical = comp.subComponents
      ? comp.subComponents.find((s) => s.isCritical) || comp.subComponents[0]
      : null;

    const criticalMat = critical ? _materials[critical.materialKey] : null;
    const criticalLimitC =
      critical && typeof critical.operatingLimitC === "number"
        ? critical.operatingLimitC
        : criticalMat
        ? criticalMat.meltingPoint
        : null;

    // Estimate relative thermal mass from sub-component density × specificHeat × massFraction
    let thermalMass = null;
    if (comp.subComponents && comp.subComponents.length) {
      let sum = 0;
      comp.subComponents.forEach((sub) => {
        const mat = _materials[sub.materialKey];
        if (mat) {
          sum += mat.density * mat.specificHeat * (sub.massFraction || 0);
        }
      });
      thermalMass = sum > 0 ? sum : null;
    }

    return {
      criticalLimitC,
      meltingPointC: criticalMat ? criticalMat.meltingPoint : null,
      thermalMass,
      criticalMat,
      composition: comp,
    };
  }

  // Wrap detectFailure to incorporate composition-derived thresholds.
  // This enriches the result without changing any existing trigger / severity logic.
  const _detectFailureBase = detectFailure;
  function detectFailureWithComposition(component, metrics) {
    const result = _detectFailureBase(component, metrics);
    if (!component) return result;

    const family = resolveComponentFamily(component.type, component.properties);
    const thresholds = getCompositionThresholds(component.type)
      || getCompositionThresholds(family);

    if (!thresholds) return result;

    const currentTempC = (metrics.ambientTemperature ?? 25) + (metrics.thermalRise || 0);

    // If a critical limit exists from composition and the current temperature
    // exceeds it — even if the base engine did not detect a failure — surface
    // a material-level overheat warning/failure.
    if (typeof thresholds.criticalLimitC === "number" && currentTempC > thresholds.criticalLimitC) {
      const ratio = (currentTempC - thresholds.criticalLimitC) /
                    Math.max(thresholds.criticalLimitC * 0.15, 10);
      const compositeSeverity = Math.min(ratio * 2.5, 3);

      if (compositeSeverity > result.severity) {
        const matName = thresholds.criticalMat ? thresholds.criticalMat.name : "critical element";
        return {
          failed: compositeSeverity >= 2,
          severity: compositeSeverity,
          family,
          mode: null,
          name: "Material Thermal Limit Exceeded",
          visual: compositeSeverity >= 2 ? "melt" : "glow",
          description: `${matName} operating limit of ${thresholds.criticalLimitC} °C exceeded (current: ${currentTempC.toFixed(0)} °C). ` +
            (thresholds.composition ? `Component construction: ${thresholds.composition.constructionNote}` : ""),
          compositionBased: true,
          criticalLimitC: thresholds.criticalLimitC,
        };
      }
    }

    // Annotate result with composition metadata when available
    if (result.severity > 0) {
      result.compositionNote = thresholds.composition
        ? thresholds.composition.constructionNote
        : null;
      result.criticalLimitC = thresholds.criticalLimitC;
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  const FailureEngine = {
    // Version
    FUSE_VERSION,
    // Physical specification tables (FUSE™ canonical source)
    WIRE_INSULATION_SPECS,
    WIRE_GAUGE_TABLE,
    COMPONENT_PHYSICAL_SPECS,
    // Internal data tables (also exposed for extensions / testing)
    COMPONENT_FAMILY_MAP,
    COMPONENT_PROFILES,
    COMPONENT_FAILURE_PROFILES,
    // Core detection & family resolution
    resolveComponentFamily,
    detectFailure: detectFailureWithComposition,
    // Runtime registration API
    registerComponentType,
    registerFailureProfile,
    // Composition / material integration
    loadCompositions,
    getCompositionThresholds,
    // Gauge lookup helper
    getWireGaugeData,
  };

  // Support CommonJS (vitest / Node) and browser globals
  if (typeof module !== "undefined" && module.exports) {
    module.exports = FailureEngine;
  } else {
    global.FailureEngine = FailureEngine;
  }

}(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this));
