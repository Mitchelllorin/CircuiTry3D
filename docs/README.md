# CircuiTry3D Documentation Index

Welcome to the CircuiTry3D documentation. This index provides quick access to all reference materials for electrical theory, circuit simulation, and platform implementation.

---

## Getting Started

| Document | Description |
|----------|-------------|
| **[ELECTRICAL_THEORY_FUNDAMENTALS.md](./ELECTRICAL_THEORY_FUNDAMENTALS.md)** | **Start here.** Complete electrical theory foundation — Ohm's Law, Kirchhoff's Laws, power formulas, series/parallel circuits |
| [FORMULAS_QUICK_REFERENCE.md](./FORMULAS_QUICK_REFERENCE.md) | Quick lookup table for all electrical formulas |

---

## Electrical Theory (Source of Truth)

These documents establish the **authoritative source of truth** for electrical knowledge in CircuiTry3D:

| Document | Description |
|----------|-------------|
| [ELECTRICAL_THEORY_FUNDAMENTALS.md](./ELECTRICAL_THEORY_FUNDAMENTALS.md) | Core electrical concepts, Ohm's Law, Kirchhoff's Laws, power, series/parallel |
| [CIRCUIT_ANALYSIS_METHODS.md](./CIRCUIT_ANALYSIS_METHODS.md) | MNA solver, superposition, Thévenin/Norton, mesh/node analysis |
| [COMPONENT_REFERENCE.md](./COMPONENT_REFERENCE.md) | Resistors, capacitors, inductors, diodes, transistors, batteries |
| [FORMULAS_QUICK_REFERENCE.md](./FORMULAS_QUICK_REFERENCE.md) | All formulas in one place for quick lookup |

---

## Platform Implementation

These documents define how CircuiTry3D implements electrical simulation:

| Document | Description |
|----------|-------------|
| [CIRCUIT_RULES.md](./CIRCUIT_RULES.md) | Platform-specific rules (C3D-001 through C3D-010), validation logic |
| [CIRCUIT_SIMULATION_REFERENCE.md](./CIRCUIT_SIMULATION_REFERENCE.md) | DC solver technical details, MNA implementation, visualization |
| [circuit-error-outcomes.md](./circuit-error-outcomes.md) | Error handling, open/short circuit detection, validation feedback |

---

## Visual Standards

These documents define schematic appearance and layout:

| Document | Description |
|----------|-------------|
| [schematic-style-guidelines.md](./schematic-style-guidelines.md) | ANSI/IEEE symbols, component rendering, 3D presentation |
| [circuit-topology-reference.md](./circuit-topology-reference.md) | Series, parallel, combination circuit layouts |

---

## Source Code References

| Location | Description |
|----------|-------------|
| `src/sim/dcSolver.ts` | Modified Nodal Analysis (MNA) circuit solver |
| `src/sim/circuitValidator.ts` | Circuit validation and error detection |
| `src/sim/connectivity.ts` | Graph connectivity analysis |
| `src/utils/electrical.ts` | Metric formatting and electrical calculations |
| `src/data/wireLibrary.ts` | Wire material properties and resistivity |
| `src/data/practiceProblems.ts` | Practice problem templates with solutions |
| `src/components/practice/OhmsLawWheel.tsx` | Interactive W.I.R.E. wheel (12 formulas) |
| `src/components/practice/KirchhoffLaws.tsx` | KCL/KVL visual reference |
| `src/components/practice/ResistorColorCode.tsx` | Color code lookup |
| `src/components/builder/constants.ts` | Component metadata and ANSI/IEEE symbols |
| `src/schematic/catalog.ts` | 3D component catalog |
| `src/schematic/threeFactory.ts` | Three.js 3D model generation |

---

## Documentation Hierarchy

```
docs/
├── README.md                           ← This index file
│
├── ELECTRICAL_THEORY_FUNDAMENTALS.md   ← Primary theory reference
├── CIRCUIT_ANALYSIS_METHODS.md         ← Analysis techniques
├── COMPONENT_REFERENCE.md              ← Component specifications
├── FORMULAS_QUICK_REFERENCE.md         ← Formula lookup
│
├── CIRCUIT_RULES.md                    ← Platform implementation rules
├── CIRCUIT_SIMULATION_REFERENCE.md     ← Solver technical details
├── circuit-error-outcomes.md           ← Error handling
│
├── schematic-style-guidelines.md       ← Visual standards
└── circuit-topology-reference.md       ← Layout conventions
```

---

## For Educational Content Development

When creating educational content, practice problems, or tutorials:

1. **Verify theory** against [ELECTRICAL_THEORY_FUNDAMENTALS.md](./ELECTRICAL_THEORY_FUNDAMENTALS.md)
2. **Use correct formulas** from [FORMULAS_QUICK_REFERENCE.md](./FORMULAS_QUICK_REFERENCE.md)
3. **Follow visual standards** in [schematic-style-guidelines.md](./schematic-style-guidelines.md)
4. **Reference existing patterns** in `src/data/practiceProblems.ts`

---

## For Platform Development

When implementing new features or modifying simulation:

1. **Understand theory** in [ELECTRICAL_THEORY_FUNDAMENTALS.md](./ELECTRICAL_THEORY_FUNDAMENTALS.md)
2. **Follow platform rules** in [CIRCUIT_RULES.md](./CIRCUIT_RULES.md)
3. **Reference solver details** in [CIRCUIT_SIMULATION_REFERENCE.md](./CIRCUIT_SIMULATION_REFERENCE.md)
4. **Match component behavior** in [COMPONENT_REFERENCE.md](./COMPONENT_REFERENCE.md)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01 | Initial documentation index with integrated theory references |
