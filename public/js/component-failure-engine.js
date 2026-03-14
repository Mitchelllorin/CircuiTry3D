/**
 * CircuiTry3D — Component Failure Engine  v1.0
 *
 * Shared, zero-dependency library for component failure detection, family
 * resolution, and runtime profile registration.  Has NO THREE.js or DOM
 * dependencies — safe to load in any context (arena, builder workspace, tests).
 *
 * Exported as window.FailureEngine so both arena.html and legacy.html can share
 * the exact same physics data and detection logic without duplication.
 *
 * Usage
 * -----
 *   const { detectFailure, resolveComponentFamily, registerComponentType } = window.FailureEngine;
 *
 *   const metrics = { powerDissipation: 0.8, currentRms: 0.15, operatingVoltage: 12,
 *                      thermalRise: 45, impedance: 80, storedEnergy: 0 };
 *   const failure = detectFailure(component, metrics);
 *   // { failed: false, severity: 1.2, name: "Thermal Overload", visual: "char", description: "..." }
 */
(function (global) {
  "use strict";

  // ---------------------------------------------------------------------------
  // Component Family Map
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
          trigger: (metrics) => 25 + metrics.thermalRise > 155,
          severity: (metrics) => Math.min(((25 + metrics.thermalRise) - 130) / 30, 3),
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
          trigger: (metrics) => 25 + metrics.thermalRise > 125,
          severity: (metrics) => Math.min(((25 + metrics.thermalRise) - 100) / 30, 3),
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
          trigger: (metrics) => 25 + metrics.thermalRise > 125,
          severity: (metrics) => Math.min(((25 + metrics.thermalRise) - 100) / 30, 3),
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
          trigger: (metrics, props) => 25 + metrics.thermalRise > (props.maxTempC ?? 175),
          severity: (metrics, props) => Math.min(((25 + metrics.thermalRise) - 150) / 30, 3),
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
          trigger: (metrics) => 25 + metrics.thermalRise > 60,
          severity: (metrics) => Math.min(((25 + metrics.thermalRise) - 50) / 20, 3),
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
          trigger: (metrics) => 25 + metrics.thermalRise > 120,
          severity: (metrics) => Math.min(((25 + metrics.thermalRise) - 100) / 30, 3),
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
          trigger: (metrics) => 25 + metrics.thermalRise > 130,
          severity: (metrics) => Math.min(((25 + metrics.thermalRise) - 100) / 40, 3),
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
          trigger: (metrics) => 25 + metrics.thermalRise > 150,
          severity: (metrics) => Math.min(((25 + metrics.thermalRise) - 100) / 100, 3),
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
          trigger: (metrics, props) => 25 + metrics.thermalRise > (props.maxTempC ?? 150),
          severity: (metrics, props) => Math.min(((25 + metrics.thermalRise) - 120) / 35, 3),
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
          trigger: (metrics) => 25 + metrics.thermalRise > 130,
          severity: (metrics) => Math.min(((25 + metrics.thermalRise) - 100) / 35, 3),
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
          trigger: (metrics, props) => 25 + metrics.thermalRise > (props.maxTempC ?? 150),
          severity: (metrics, props) => Math.min(((25 + metrics.thermalRise) - 120) / 35, 3),
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
          trigger: (metrics) => 25 + metrics.thermalRise > 110,
          severity: (metrics) => Math.min(((25 + metrics.thermalRise) - 85) / 35, 3),
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
          trigger: (metrics) => 25 + metrics.thermalRise > 100,
          severity: (metrics) => Math.min(((25 + metrics.thermalRise) - 80) / 30, 3),
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
          trigger: (metrics) => 25 + metrics.thermalRise > 80,
          severity: (metrics) => Math.min(((25 + metrics.thermalRise) - 60) / 30, 3),
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
          trigger: (metrics) => 25 + metrics.thermalRise > 110,
          severity: (metrics) => Math.min(((25 + metrics.thermalRise) - 85) / 35, 3),
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
    generic: {
      modes: {
        overtemp: {
          name: "Thermal Overload",
          visual: "char",
          physicalDescription:
            "Component temperature exceeds material limits. Insulation chars, bonding compounds melt, and contacts oxidize. The component may open-circuit, short-circuit, or degrade in performance depending on its construction.",
          trigger: (metrics) => 25 + metrics.thermalRise > 100,
          severity: (metrics) => Math.min(((25 + metrics.thermalRise) - 80) / 30, 3),
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

    const currentTempC = 25 + (metrics.thermalRise || 0);

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
    COMPONENT_FAMILY_MAP,
    COMPONENT_PROFILES,
    COMPONENT_FAILURE_PROFILES,
    resolveComponentFamily,
    detectFailure: detectFailureWithComposition,
    registerComponentType,
    registerFailureProfile,
    loadCompositions,
    getCompositionThresholds,
  };

  // Support CommonJS (vitest / Node) and browser globals
  if (typeof module !== "undefined" && module.exports) {
    module.exports = FailureEngine;
  } else {
    global.FailureEngine = FailureEngine;
  }

}(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this));
