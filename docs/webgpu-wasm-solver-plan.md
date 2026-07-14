# WebGPU / WASM Solver Upgrade Plan

_Last updated: 2025-12-04_

## 1. Goals
- **Match & beat Circuitry – 3D claims** of "GPU-accelerated" solves by delivering sub-10 ms evaluations on >500 element nets with verifiable benchmarks.
- **Modernize the simulation core** so it can scale from single resistive loops to multi-source, mixed AC/DC practice problems without blocking the UI thread.
- **Expose performance data** (Profiler overlay + telemetry hooks) for marketing collateral and internal regression tests.
- **Stay cross-platform**: browsers without WebGPU (or low-end Android devices) must still get a fast WASM path with graceful fallbacks.

## 2. Current Implementation Snapshot
- `src/sim/connectivity.ts` builds adjacency graphs + union-find components in plain TypeScript/JS.
- `src/utils/electrical.ts` solves Ohm's Law (W.I.R.E.) algebra and simple AC reactance entirely on the main thread.
- No concept of conductance matrices, sparse solvers, or transient analysis; animation is mostly cosmetic (node-level state).
- No instrumentation/benchmark harness; we cannot currently quantify solve time, node count, or error tolerances.

## 3. Target Capabilities
1. **Topology assembler**
   - Convert builder state (nodes, wires, components) into a canonical netlist (stamp-style) every time the circuit changes.
   - Support resistors, sources, reactive components, switches, and future IC blocks.
2. **Dual solver backends**
   - `wasm-ohm`: Rust-based nodal analysis (sparse LU / iterative) compiled to WASM for universal availability.
   - `webgpu-ohm`: WebGPU compute pipeline for large matrices (>1k unknowns) with float32 math + Kahan compensation; toggled when adapter supports `shader-f16` or `shader-f64`.
3. **Scheduler + worker isolation**
   - Dedicated Web Worker coordinating both backends, pushing results to the UI via postMessage to avoid blocking React.
4. **Profiler overlay**
   - Mini HUD showing nodes, branch count, backend used, solve time, and energy balance error (max |KCL| residual).
5. **Benchmark harness**
   - Deterministic suite (JSON circuits under `tests/perf/`) to capture metrics in CI and produce public charts for marketing.

## 4. Architecture
```
[React Builder] --(netlist payload)--> [Solver Worker]
                                       |-- wasm-ohm (default)
                                       |-- webgpu-ohm (if adapter OK)
                           <-- metrics, meshes, traces --|
```

### 4.1 Data Flow
1. **Topology stage** (`TopologyAssembler`)
   - Consumes existing `rebuildAdjacencyForWires` and augments with component stamps.
   - Emits packed typed arrays:
     - `Float32Array` node coordinates
     - `Float64Array` element parameters (R, L, C, controlled source gains)
     - `Uint32Array` connectivity indices
2. **Solver stage**
   - WASM path uses Rust crates (`nalgebra`, `sprs`, `wasm-bindgen`) to form and solve `G * V = I`.
   - WebGPU path stages the same packed arrays into storage buffers and runs iterative conjugate gradient / Gauss-Seidel kernels.
3. **Post-processing**
   - Currents, voltages, power flows returned as SoA buffers for UI + instrumentation HUD.

### 4.2 Module Layout
- `src/sim/topology/` – builder-to-netlist transforms, invariant checks.
- `src/workers/solver.worker.ts` – message types, dynamic backend selection.
- `wasm/` – Rust crate with `lib.rs`, built via `wasm-pack build --target web` into `pkg/` loaded with dynamic `import()`.
- `src/sim/webgpu/` – adapter manager, pipeline creation, shader WGSL files.
- `src/components/ProfilerOverlay.tsx` – UI readout wired to solver worker messages.

## 5. WebGPU Backend Notes
- Requires feature detection: `navigator.gpu` + adapter `features` containing `shader-f16` (preferred) or `shader-f64` (if available on desktop).
- Buffer schemas:
  - `NodeBuffer`: `{ offsetV: u32, constraints: u32 }`
  - `BranchBuffer`: `{ n1: u32, n2: u32, value: f32, type: u32 }`
- Kernels:
  1. **Stamp kernel** writes conductance values into a sparse CSR stored in structured buffers.
  2. **Solve kernel** runs limited iterations of conjugate gradient with residual tracking; fallback to WASM if diverging.
- Uses `@webgpu/types` (dev dependency) + feature flag `enableWebGPU` (from user settings) with persisted opt-out for flaky drivers.

## 6. WASM Backend Notes
- Rust crate outline:
```rust
#[wasm_bindgen]
pub struct SolveResult { ... }

#[wasm_bindgen]
pub fn solve_nodal(netlist: &[f32], branches: &[Branch], options: &JsValue) -> Result<SolveResult, JsValue> { ... }
```
- Build tooling: add `wasm-pack` step + `npm` script (`npm run build:wasm`). Output checked into repo for now (can later automate via GH Actions artifact).
- Numerical strategy: Sparse LU for small systems (<2k nodes); conjugate gradient with incomplete Cholesky preconditioner for larger.
- Deterministic seeds for randomization (if needed) to keep benchmarks stable.

## 7. Profiler & Telemetry
- Worker emits `SolverPerformanceEvent`:
```ts
type SolverPerformanceEvent = {
  backend: "wasm" | "webgpu";
  nodes: number;
  branches: number;
  iterations: number;
  solveMs: number;
  residual: number;
};
```
- Profiler overlay (bottom-right) subscribes to events and displays sparkline of solve times.
- Optional `window.__CTR3D_PERF__` hook for QA to record CSV; ties into marketing visuals later.

## 8. Benchmark Plan
| Scenario | Size | Target solve (ms) | Max residual |
|----------|------|-------------------|--------------|
| `dc-loop-50` | 50 nodes / 75 branches | ≤ 2 ms | ≤ 1e-6 |
| `ladder-200` | 200 nodes / 400 branches | ≤ 5 ms | ≤ 5e-6 |
| `mesh-1k` | 1k nodes / 2k branches | ≤ 12 ms (WebGPU) / ≤ 35 ms (WASM) | ≤ 1e-5 |
| `ac-mixed-300` | 300 nodes / reactive elements | ≤ 8 ms | ≤ 5e-5 |

Bench harness (`npm run perf:solver`) will:
- Load JSON circuits from `tests/perf/*.json`.
- Execute both backends (if supported) and print solve stats.
- Fail CI if regressions exceed thresholds.

## 9. Delivery Phases
1. **P0 – Instrument & benchmark baseline (1 sprint)**
   - Add topology snapshot + synthetic circuit generator.
   - Implement perf harness measuring current CPU solver (even if incomplete) to capture before metrics.
2. **P1 – WASM backend (2 sprints)**
   - Rust crate, wasm-pack integration, worker scaffolding, API parity for DC nets.
   - Feature flag `solverBackend: "wasm" | "js"`.
3. **P2 – WebGPU backend (2–3 sprints)**
   - Adapter detection, WGSL shaders, iterative solver with fallback and validation against WASM.
4. **P3 – Profiler overlay + marketing hooks (1 sprint)**
   - UI component, telemetry channel, screenshot-ready styling.
5. **P4 – Extended analysis (AC, transient) (future)**
   - Reuse WASM/WebGPU infrastructure to add frequency-domain sweeps + simple timestep integration.

## 10. Risks & Mitigations
- **WebGPU availability on mobile** – keep WASM default, allow manual WebGPU opt-in.
- **Numerical stability** – enforce single source of truth by validating GPU results against WASM within tolerance.
- **Bundle size** – wasm pkg adds ~500 KB gzip; use async `import()` and cache in IndexedDB.
- **Build complexity** – document `wasm-pack` install in README + CI caching.

## 11. Success Criteria
- Demo video showing profiler overlay hitting ≤10 ms solves on the marketing benchmark circuits.
- Automated perf test gating PRs with the thresholds above.
- Marketing copy: “Dual-engine solver (WebGPU + WASM) with live profiler”.
- Telemetry data we can surface in dashboards + Play Store release notes.
