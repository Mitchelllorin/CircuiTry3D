# CircuiTry3D Launch Quality Checklist (Ground-Up)

**Last audit:** 2026-02-15  
**Branch:** `cursor/launch-quality-checklist-eab8`  
**Legend:** ✅ Pass · ⚠️ Warning · ❌ Fail · ⛔ Blocked

---

## 1) Build, Packaging, and Environment

| Item | Status | Summary (what was checked) | Solution / Next step |
|---|---:|---|---|
| Dependencies install cleanly | ✅ | `npm install` succeeded. | Keep lockfile committed and use clean install in CI. |
| Web production build | ✅ | `npm run build` succeeded and produced a deployable `dist/`. | Keep as required pre-merge gate. |
| Capacitor-mode web build | ✅ | `npm run build -- --mode capacitor` succeeded. | Keep this as required before Android packaging. |
| Capacitor Android sync | ✅ | `npx cap sync android` succeeded and updated Android plugin wiring files. | Commit synced Gradle settings so Android project stays in sync with JS plugins. |
| Android release bundle build | ⛔ | `./gradlew bundleRelease` failed: Android SDK location not configured (`ANDROID_HOME`/`local.properties`). | Set `ANDROID_HOME` or `ANDROID_SDK_ROOT`, or define `sdk.dir` in `android/local.properties`, then rerun bundle build. |
| Runtime toolchain baseline | ✅ | Node `v22.21.1` and npm `10.9.4` are available (project requires Node >= 20.19). | Pin versions in CI image to avoid drift. |

**Section summary:** Web build pipeline is healthy. Android release packaging is blocked by missing SDK path configuration in the current environment.

---

## 2) Functional Correctness and Regression Safety

| Item | Status | Summary (what was checked) | Solution / Next step |
|---|---:|---|---|
| Unit test suite | ✅ | `npm test` passed: **5 files, 63 tests** (geometry, wire model, connectivity, junction behavior, DC solver). | Keep these green as required gate. |
| TypeScript strict compile | ❌ | `npx tsc --noEmit` failed with **162 errors** across **17 files**. | Make typecheck a required gate and burn down errors by file priority (see triage below). |
| Coverage reporting availability | ❌ | `npm test -- --coverage` failed due missing `@vitest/coverage-v8`. | Add `@vitest/coverage-v8`, enable coverage report + thresholds in CI. |
| UI/E2E flow validation | ⚠️ | No Playwright/Cypress test specs found. Critical user flows are not automated end-to-end. | Add smoke tests for landing → builder → practice → classroom → account flows. |

### TypeScript error triage (highest impact first)

| File | Error count | Why it matters | Suggested fix |
|---|---:|---|---|
| `src/schematic/threeFactory.ts` | 100 | Large concentration of type mismatches hides real regressions in rendering/component factories. | Split into smaller typed helpers; remove overly narrow literal types; stabilize function signatures. |
| `src/components/arena/ArenaView.tsx` | 26 | Many unused/stranded variables indicate dead paths and maintenance risk. | Remove unused code paths or wire them into UI; turn unused checks into lint errors. |
| `src/pages/Builder.tsx` | 8 | Core workspace page has strict-compile debt. | Resolve unused declarations and tighten null guards. |
| `src/pages/Practice.tsx` | 7 | Includes real safety hazards (possible null references and use-before-declaration). | Fix null guards around `findProblem(...)` results and move/reset callback declarations before use. |

**Section summary:** Core simulation tests pass, but strict compile health is currently launch-blocking for long-term stability and hidden runtime faults.

---

## 3) Data Integrity, Persistence, and Recovery

| Item | Status | Summary (what was checked) | Solution / Next step |
|---|---:|---|---|
| Circuit save/load/index/recovery services | ✅ | `src/services/circuitStorage.ts` includes schema migration, quota handling, recovery snapshots, and import/export paths. | Add regression tests for save/recover/import corruption cases. |
| Classroom fallback behavior | ✅ | `src/services/classroomApi.ts` falls back to local storage when network/function errors occur. | Add tests for fallback and conflict-resolution behavior. |
| Cross-device/state consistency | ⚠️ | Local fallback is resilient but can diverge from server state without merge strategy. | Add document versioning + conflict policy (last-write-wins with merge metadata, or server-authoritative merge). |

**Section summary:** Good resilience primitives exist locally; conflict handling and sync guarantees need explicit policy/testing.

---

## 4) Security, Privacy, and Access Control

| Item | Status | Summary (what was checked) | Solution / Next step |
|---|---:|---|---|
| Dependency vulnerability scan | ❌ | `npm audit` reports **7 vulnerabilities** (5 high, 2 moderate), including `react-router`, `vite`, `glob`, and `tar` transitive paths. | Run `npm audit fix`, then rerun full tests/build/typecheck. Upgrade router/vite/capacitor CLI paths as needed. |
| Authentication data handling | ❌ | `src/context/AuthContext.tsx` stores user credentials (including passwords) in localStorage and includes seeded demo credentials. | Replace with server-side auth (hashed passwords + secure sessions/JWT). Remove plaintext credential storage in production builds. |
| Classroom API authorization model | ❌ | `api/classroom.ts` trusts client-supplied `teacherId` and uses permissive `Access-Control-Allow-Origin: *`. | Require authenticated identity, derive teacherId from auth token/session, and restrict CORS to trusted origins. |
| Keystore secret hygiene | ✅ | Build script enforces local-only keystore and warns not to commit secrets. | Keep keystore + key.properties out of git; verify secret backup procedure. |

**Section summary:** Security posture is currently **no-go for broad launch** until auth, access control, and dependency vulnerabilities are remediated.

---

## 5) Mobile (Android) Launch Readiness

| Item | Status | Summary (what was checked) | Solution / Next step |
|---|---:|---|---|
| Capacitor Android config sanity | ✅ | `capacitor.config.json` has HTTPS scheme, mixed-content disabled, splash/status bar configured. | Keep under version control; validate on release device matrix. |
| Android manifest permissions surface | ✅ | Manifest currently requests only `INTERNET` and `ACCESS_NETWORK_STATE` (minimal footprint). | Maintain least-privilege as features evolve. |
| Release build optimization | ⚠️ | `android/app/build.gradle` has `minifyEnabled false` for release. | Enable R8/proguard for production unless a specific blocking issue exists; test thoroughly after enabling. |
| SDK path setup in build environment | ⛔ | Android bundle task blocked by missing SDK configuration. | Add SDK config to local/CI and rerun `bundleRelease`. |

**Section summary:** Configuration is generally clean, but release packaging and optimization are not yet fully launch-ready.

---

## 6) Performance and Frontend Delivery

| Item | Status | Summary (what was checked) | Solution / Next step |
|---|---:|---|---|
| Route-level code splitting | ✅ | `src/routes/App.tsx` uses lazy loading for heavy pages. | Keep lazy boundaries and monitor chunk drift. |
| Bundle size pressure | ⚠️ | Build output includes large chunk (`three-vendor` ~718 kB, gzip ~189 kB). | Budget and monitor: defer non-critical 3D modules, evaluate tree-shaking/component-level lazy imports. |
| Performance budgets in CI | ⚠️ | No automated size/perf threshold enforcement detected. | Add CI budget checks (`vite-bundle-visualizer` or size-limit) and fail on regression. |

**Section summary:** Existing code splitting helps, but bundle budgets are not currently enforced.

---

## 7) Operational Quality Control (Process)

| Item | Status | Summary (what was checked) | Solution / Next step |
|---|---:|---|---|
| CI workflows present | ❌ | No `.github/workflows` pipeline files found. | Add CI for install, tests, build, typecheck, and audit on PRs. |
| Lint/quality scripts | ⚠️ | No lint script in `package.json`; strict checks rely on manual commands. | Add ESLint + `npm run lint` and include in CI gates. |
| Release checklist automation | ⚠️ | Current checks are manually runnable but not consolidated into one command. | Add a single `check:launch` script chaining test/build/typecheck/audit. |

**Section summary:** Quality checks are not yet automated in CI, increasing pre-launch regression risk.

---

## Launch Decision (Current State)

## **NO-GO (until blockers resolved)**

### P0 Blockers
1. Resolve TypeScript strict compile failures (`npx tsc --noEmit` must pass).
2. Remediate high-severity vulnerabilities from `npm audit`.
3. Implement real authentication/authorization for Classroom and account flows.
4. Configure Android SDK path and complete a successful `bundleRelease` build.

### P1 (should complete before public launch)
1. Add coverage package and enforce minimum coverage thresholds.
2. Add Playwright smoke tests for critical user journeys.
3. Enable CI workflows and fail fast on quality gate regressions.
4. Consider release minification/obfuscation path validation.

### P2 (post-launch hardening)
1. Bundle size budget enforcement and progressive performance optimization.
2. Conflict-resolution strategy for classroom local fallback vs cloud state.
3. Expand regression suite for state recovery, import/export, and edge cases.

---

## Quick Re-Run Commands

```bash
npm install
npm test
npm run build
npm run build -- --mode capacitor
npx tsc --noEmit
npm audit
cd android && ./gradlew bundleRelease
```

