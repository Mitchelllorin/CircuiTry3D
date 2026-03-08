# CircuiTry3D

> **Illuminating Electricity** — a 3D, interactive electrical learning platform that makes circuit theory visual and tangible.
> Explore current flow from the macro scale all the way down to atomic crystal lattices and quantum probability clouds, powered by Ohm's Law and a proprietary component failure simulation engine.

CircuiTry3D is founded and led by **Mitchell Lorin McKnight**, who built the platform to give visual learners a more intuitive path into circuit theory.

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://circuitry3d.app)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node >=20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

---

## 🔭 More Than a Circuit Builder

CircuiTry3D is a **complete electrical education ecosystem.**  The circuit builder is the entry point — but what students, teachers, manufacturers, and curious learners discover inside goes far beyond placing wires on a grid.

| Layer | What you get |
|---|---|
| **3D Circuit Builder** | Build and simulate DC circuits in a real-time 3D sandbox with live W.I.R.E. analysis |
| **Multi-Scale Current Flow Visualization** | Watch electrons move — from macro wire flow all the way to atomic crystal lattices and quantum probability clouds |
| **FUSE™ Failure Engine** | See what actually happens when a component is pushed past its limits — smoke, arcs, explosions, and plain-language explanations of the physics |
| **Component Arena** | Stress-test any component against configurable voltage, temperature, humidity, and duty-cycle parameters without touching real hardware |
| **Integrated Electrical Textbook** | A full two-year post-secondary electrical engineering curriculum built directly into the app — Year 1 fundamentals through Year 2 advanced analysis |
| **Adaptive Practice** | Targeted worksheet generator that identifies your weakest W.I.R.E. concepts and surfaces problems that close those gaps |
| **Classroom Mode** | Teacher dashboard, roster management, assignment scheduling, and real-time analytics for any grade level from Grade 8 through Higher Education |
| **Gamification & Arcade** | XP, badges, leaderboards, and three arcade games keep motivation high without sacrificing depth |
| **Community Hub** | Share circuits, post lab notes, and browse the circuit gallery with other learners and educators |

---

## 👥 Who Is CircuiTry3D For?

### 🎓 Educators & Academic Institutions
Whether you teach middle school science, high school CTE electronics, or first-year college circuits, CircuiTry3D gives you a lab that never runs out of components, never burns down, and never lets a student leave without understanding *why* something failed.

- Replace sacrificial lab hardware with physics-accurate 3D simulations
- Assign worksheets tied directly to W.I.R.E. (Watts, current **I**, Resistance, voltage **E**/electromotive force) and KCL/KVL concepts from the in-app textbook
- Create cohorts, distribute join codes, and track every student's progress from a single dashboard
- Full alignment with NGSS PS3 (Energy) and CTE Electronics pathway standards
- **The complete Year 1 and Year 2 electrical engineering textbook is available in-app at `/textbook` — no external materials required**
- *See the dedicated [Educator Section](#-for-educators) below*

### 🏭 Manufacturers & Component Retailers
CircuiTry3D's **Component Arena** is a unique channel to put your real-world datasheets in front of students and teachers at the exact moment they are learning what your components do — and why they fail if misused.

- Feature your components (resistors, capacitors, ICs, MOSFETs, LEDs, and more) as Named Sponsored Components in the Arena
- Students interact with **your rated specs** — voltage limits, temperature ranges, current capacity — and the FUSE™ engine explains what happens physically when those specs are exceeded
- Every failure card credits the component family and its physical behavior, creating lasting brand and product awareness in the engineering pipeline
- Direct link from Arena components to your product page or datasheet
- *Contact support@circuitry3d.app to discuss featured component placement*

### 🙋 The Average Curious Learner
You don't need an engineering background to use CircuiTry3D.

- **Just curious?** Open the Builder, drop in a battery and an LED, and watch it light up — then crank the voltage and watch it explode in 3D
- **Visual learner?** Zoom all the way in from the wire surface to the atomic crystal lattice to see individual electrons vibrating and drifting through the metal in real time
- **Self-studying?** The in-app textbook starts from "what is electricity?" and walks you through two full years of electrical engineering concepts with worked examples, formulas, and interactive practice
- **No account required** — the Free Sandbox plan lets you build, simulate, and experiment right now at [circuitry3d.app](https://circuitry3d.app)

---

## 🚀 Available Platforms

| Platform | Details |
|---|---|
| **Web App** | React 19 + Vite 7, deployed on Vercel |
| **Android App** | Native app via Capacitor, available on Google Play Store |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Build | Vite 7 |
| 3D Rendering | Three.js |
| Mobile | Capacitor 7 |
| Routing | React Router DOM 7 |
| Backend/API | Vercel Serverless Functions + Vercel KV |
| Deployment | Vercel (web), Google Play Store (Android) |
| Testing | Vitest + Playwright |

---

## 📦 Project Structure

```
CircuiTry3D/
├── src/
│   ├── components/       # Shared UI components
│   ├── context/          # React context providers (Auth, Gamification, Classroom, …)
│   ├── pages/            # Route-level page components
│   ├── routes/           # App.tsx — React Router configuration
│   ├── sim/              # Circuit simulation engine
│   ├── schematic/        # Schematic rendering logic
│   ├── services/         # Data-access & API helpers
│   └── utils/            # Shared utilities
├── public/
│   ├── landing.html      # Landing page
│   ├── legacy.html       # Circuit builder canvas (legacy)
│   └── arena.html        # Component testing arena
├── api/                  # Vercel serverless functions (e.g. /api/classroom)
├── android/              # Capacitor Android project
├── play-store-assets/    # Google Play Store graphics & metadata
├── tests/                # Vitest unit & integration tests
├── docs/                 # Electrical theory & circuit reference docs
├── vite.config.ts
├── vercel.json
└── package.json
```

---

## 🌐 Web Development

### Requirements

- Node.js >= 20

### Getting Started

```bash
# Install dependencies
npm install

# Start the development server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Preview the production build locally
npm run preview
```

### Run Tests

```bash
# Run all unit tests once
npm test

# Run tests in watch mode
npm run test:watch
```

---

## 🔐 Environment Variables

All secrets are set in **Vercel → Project → Settings → Environment Variables** as plain (non-shared) variables.

### Unlocking the full version (owner preview)

The web build runs in **demo mode** by default (limited component library). To preview your full changes:

1. Go to **Vercel → your project → Settings → Environment Variables**
2. Click **Add New**
3. Enter:
   - **Name:** `OWNER_SECRET`
   - **Value:** any password you choose (e.g. `MySecret123`)
   - **Environment:** Production, Preview, and Development
4. Click **Save**
5. Trigger a new deployment (push a commit, or use **Redeploy**)
6. Open the deployed site — tap the 🔑 icon in the demo banner and enter your password

> The password is never exposed in the client bundle — it lives only on the server.

### Optional: Classroom cloud sync

Without these the classroom feature still works but saves to browser localStorage only.

| Variable | Description |
|---|---|
| `CLASSROOM_KV_URL` | REST endpoint URL of your Upstash Redis instance |
| `CLASSROOM_KV_TOKEN` | Bearer token for that instance |

---

## 🗺️ App Routes

| Route | Description |
|---|---|
| `/` | Landing / home page |
| `/app` | 3D circuit builder workspace |
| `/arena` | Component testing arena |
| `/practice` | Adaptive practice worksheets |
| `/classroom` | Teacher dashboard & classroom mode |
| `/community` | Community hub — circuit gallery & chat |
| `/arcade` | Arcade / challenge mode |
| `/account` | User profile & account settings |
| `/pricing` | Pricing page |
| `/textbook` | Integrated electrical theory textbook |
| `/privacy` | Privacy policy |
| `/data-safety` | Android data-safety disclosure |
| `/app-access` | Download & platform links |
| `/delete-account` | Account deletion request |

---

## 🔑 Key Features

### 💥 FUSE™ — Failure Understanding Simulation Engine
> **CircuiTry3D's proprietary, zero-dependency component failure detection and visualization engine.**

FUSE™ is what separates CircuiTry3D from every other circuit simulator.  While other tools only show what happens when a circuit works, FUSE™ shows exactly what happens when it **fails** — in real time, in 3D, with physics-accurate descriptions.

| What FUSE™ delivers | Details |
|---|---|
| **Real-time failure detection** | Runs every simulation tick; evaluates every component against its rated limits |
| **30+ named failure modes** | *Thermal Runaway, Junction Burnout, Avalanche Breakdown, Dielectric Breakdown, Electrolyte Boilover*, and more |
| **18 component families** | Resistors, capacitors, LEDs, diodes, BJTs, MOSFETs, op-amps, regulators, ICs, batteries, switches, relays, fuses, motors, transformers, and more |
| **Severity scoring (0–3)** | 0 = OK · 1 = Stressed · 2 = Critical · 3 = Destroyed |
| **8 visual effect types** | *char, melt, arc, burst, blowout, vent, glow, smoke* — multi-layer Three.js particle systems with physics-accurate gravity and flicker |
| **Physical descriptions** | Plain-language explanation of what is happening inside the component at the material level |
| **Shared across platforms** | The same engine drives both the 3D Builder and the Component Arena — one source of truth |

📖 Full technical spec and marketing guide: [`docs/FUSE_ENGINE.md`](docs/FUSE_ENGINE.md)

### ⚡ 3D Circuit Builder (`/app`)
Build and simulate circuits in a 3D sandbox. Components snap to a grid and the live DC solver updates voltages and currents in real time.

**Components supported:** Battery, Resistor, LED, Switch, Ground, Junction

**W.I.R.E. Analysis Panel** — displays live Watts, Current, Resistance, and Voltage for every node. Each quantity is color-coded (blue = W, orange = I, green = R, red = E) and an Ohm's Law triangle plus power panel update in real time.

**Junctions** — split any wire mid-run to create a branch point. Junctions let you build parallel and series-parallel circuits and apply KCL at every current-split/recombine node. Add via the **⬡ Junct** quick-action button, the `J` keyboard shortcut, or by tapping an existing wire in Wire Mode.

**Multi-scale current flow visualization** — five depth tiers let you zoom from the surface of a wire all the way to quantum-level probability clouds:

| Zoom Tier | Depth Threshold | What You See |
|---|---|---|
| **Macro** | d > 8 | Wire glow and directional current arrows showing overall current direction and magnitude |
| **Close** | d < 8 | Individual charge-carrier particles drifting along the wire, colored by velocity |
| **Atomic** | d < 3 | The copper crystal lattice with FCC (face-centered cubic) unit cells; electrons shown bouncing through the lattice sites |
| **Deep-Atomic** | d < 0.8 | Thermal vibration of individual lattice atoms at the correct FCC basis positions; electron scattering events visible |
| **Quantum** | d < 0.3 | Electron probability clouds (wave-function-inspired halos) surrounding each atom; quantum uncertainty visualized as pulsing orbital rings |

Toggle between **Electron Flow** (negative → positive, conventional physics direction) and **Conventional Current** (positive → negative, textbook circuit convention) from the View menu. All five tiers stay synchronized so zooming in and out gives a seamless, continuous view of the same current.

**Wire Routing Modes** — choose Free-form, Manhattan (right-angles), Offset (parallel detours), or Arc (smooth sweeps) from the Tools menu.

**Layout Modes** — Free, Square (textbook style), and Linear (vertical tree) keep circuits organized automatically.

**Auto-Arrange** — one click re-flows the circuit into a clean textbook layout.

**Schematic overlay** — a companion 2D schematic renders alongside the 3D view so learners can cross-reference real-world wiring with standard notation.

**Interactive Tutorial** — in-app Quick Start Guide (Help → Tutorial) covering all menus, keyboard shortcuts, junction usage, routing modes, and W.I.R.E. concepts.

**Keyboard shortcuts:** `B` Battery · `R` Resistor · `L` LED · `S` Switch · `J` Junction · `W` Wire Mode · `T` Rotate Mode · `Space` Toggle Menu

**Live component failure detection** — every simulation tick the builder runs each component through the shared **FailureEngine** (`component-failure-engine.js`). When a component exceeds its rated limits it immediately triggers:
- A **severity badge** overlaid on the component nameplate (severity scale: 0 = OK → 1 = stressed → 2 = critical → 3 = destroyed)
- **Multi-layer Three.js particle effects** spawned at the component's 3D position — visual types include *char* (fire flicker), *melt* (molten drip), *arc* (blue electrical discharge), *burst* (explosion debris cloud + fire + smoke), *blowout* (white-hot flash), *vent* (pressurised gas), *glow* (thermal), and *smoke*
- **Physics-accurate particle gravity** — sparks and debris fall, fire rises via buoyancy, smoke drifts gently upward, molten drips fall slower than debris
- **Animated flicker** tuned per failure type (arc: 55 ms, burst: 75 ms, melt: 110 ms, char: 95 ms)
- **Camera shake** on explosion events for dramatic emphasis

Failure profiles are defined for all major component families: resistors, thermistors, capacitors, LEDs, diodes, Zener diodes, BJTs, MOSFETs, op-amps, voltage regulators, ICs/microcontrollers, batteries, switches, relays, fuses, lamps, motors, transformers, and crystal oscillators.

### 🧪 Component Arena & FUSE™ Engine (`/arena`)
The **Component Arena** is a dedicated stress-testing environment powered by the **FUSE™ (Failure Understanding Simulation Engine)** — the same underlying `FailureEngine` library that drives real-time failure detection in the 3D Builder.

**Testing Modes:**
- *Single Component* — run a configurable stress test on one component
- *Compare (A vs B)* — side-by-side stress test with a relative delta panel

**Configurable Test Variables:** Voltage, Frequency, Ambient Temperature, Humidity, Duty Cycle, Duration, and Load Impedance

**Analysis Output:**
- Component summary cards (A, B, and delta metrics)
- **FUSE™ failure analysis** — evaluates each component against its physics-based failure profile and reports the failure name (e.g. *Thermal Overload*, *Junction Burnout*, *Avalanche Breakdown*, *Dielectric Breakdown*), severity level (0–3), and a physical description of the failure mechanism
- Animated failure particle effects: smoke, arc, burst, glow, flame, explosion, debris, and shockwave flash
- Status indicators with pass/warn/fail states

**Data Exchange:**
- Export results as JSON
- Load a circuit export directly from the Builder into the Arena
- Import custom JSON test scenarios

### 🎯 Adaptive Practice (`/practice`)
The practice workspace tracks your recent W.I.R.E. (Watts, Current, Resistance, Voltage) misses and surfaces the three problems that best target your current gaps. Recommendations update automatically as you complete worksheets.

**Problem types:** Series, Parallel, Mixed, Combination Challenge, and Random

**Built-in educational tools:** Ohm's Law Triangle Deck, Ohm's Law Wheel calculator, Kirchhoff's Laws reference, Resistor Color Code decoder, Wire Library reference, and step-by-step solution breakdowns

### 🏅 Gamification & Arcade Mode
Every worksheet completion awards XP, streak bonuses, and badges via **GamificationContext**. The Challenge Mode dashboard shows XP progress, unique clears, a live leaderboard, and component unlocks (Precision Op-Amp, Sensor Pack, Power Lab, etc.). All progress is persisted to `localStorage` — no account required.

**Arcade games (`/arcade`):** RetroCircuitMaze, OhmsRacer, VoltFighter — XP-based progression unlocks new components and difficulty tiers.

### 🎓 Classroom Mode (`/classroom`)
Teachers can create cohorts, share join codes, and schedule assignments from the problem library. **ClassroomContext** syncs rosters, assignments, and analytics to an Upstash-compatible KV store via `/api/classroom`. Set `CLASSROOM_KV_URL` and `CLASSROOM_KV_TOKEN` in Vercel to enable cloud persistence; the app falls back to local storage without them.

Supports grade levels: Grade 8, Grades 9–10, Grades 11–12, Higher Education, and CTE programs.

### 🧑‍🤝‍🧑 Community Hub (`/community`)
Share circuit exports, post lab notes, and browse the circuit gallery. Member profiles (set via `/account`) roll up contributions automatically. The feed and gallery persist locally for offline use.

### 📚 Integrated Electrical Textbook (`/textbook`)

CircuiTry3D ships with a **complete, two-year post-secondary electrical engineering curriculum** built directly into the app — no textbook purchases, no external PDFs, no supplementary materials required.

#### Year 1 — Electrical Fundamentals

| Topic | Content |
|---|---|
| **What Is Electricity?** | Atomic structure, electrons, charge carriers, conductors vs insulators |
| **Voltage, Current, Resistance, Power** | Definitions, units, analogies, measurement instruments; the W.I.R.E. framework |
| **Ohm's Law** | V = IR derivations, the Ohm's Law triangle, worked examples |
| **Series Circuits** | Voltage divider rule, total resistance, KVL derivation |
| **Parallel Circuits** | Current divider rule, reciprocal resistance formula, KCL derivation |
| **Series-Parallel Combinations** | Reduction techniques, equivalent resistance, multi-source circuits |
| **Power & Energy** | P = VI = I²R = V²/R, energy calculations, efficiency, heat dissipation |
| **Resistor Color Codes** | 4-band and 5-band decoding, tolerance, preferred value series (E12/E24/E96) |
| **Basic Components** | Resistors, capacitors (charging/discharging), inductors (basics), diodes, LEDs |
| **Circuit Diagrams** | American and IEC schematic symbols, reading and drawing schematics |
| **Measurement & Safety** | Using a multimeter (V/A/Ω), breadboard technique, basic lab safety rules |

#### Year 2 — Advanced Circuit Analysis

| Topic | Content |
|---|---|
| **Kirchhoff's Laws (KVL & KCL)** | Formal proofs, mesh analysis, nodal analysis, superposition theorem |
| **Thevenin & Norton Equivalents** | Maximum power transfer, source transformation, worked examples |
| **AC Circuits Fundamentals** | Sinusoidal waveforms, frequency, period, RMS values, phasors |
| **Capacitors in AC Circuits** | Capacitive reactance (Xc), impedance, phase shift, RC circuits |
| **Inductors in AC Circuits** | Inductive reactance (XL), RL circuits, time constants |
| **RLC Circuits & Resonance** | Series and parallel resonance, Q factor, bandwidth, filter design |
| **Transformers** | Turns ratio, voltage/current transformation, efficiency, isolation |
| **Semiconductor Devices** | BJTs (NPN/PNP bias), MOSFETs (enhancement/depletion), operating regions |
| **Amplifier Fundamentals** | Common-emitter/source configurations, voltage gain, small-signal models |
| **Op-Amp Circuits** | Inverting/non-inverting amplifiers, comparators, integrators, differentiators |
| **Digital Fundamentals** | Binary, hex, logic gates, Boolean algebra, combinational circuits |
| **Power Electronics Intro** | Rectifiers, regulators, switching basics, thermal management |

Each chapter includes:
- **Formula definitions** with variable descriptions and SI units
- **Worked examples** with step-by-step solutions
- **Interactive practice links** that open directly to targeted W.I.R.E. worksheets for that chapter
- **Cross-references** to Component Arena stress tests that demonstrate the theory in 3D

### 📐 Schematic Mode
A dedicated schematic view renders the same circuit as a clean 2D schematic diagram alongside the 3D builder, making it easy to compare real-world wiring with standard notation. Supports both American and IEC symbol standards.

---

## 🎓 For Educators

CircuiTry3D was built from the ground up to solve a problem every electronics teacher knows: **students can follow a textbook procedure without ever understanding what is physically happening inside the components.** The platform closes that gap by making the invisible visible — at every scale from the macro wire down to the quantum level.

### What Makes CircuiTry3D Different in the Classroom

| Challenge | CircuiTry3D Solution |
|---|---|
| Students wire circuits correctly but don't understand *why* they work | Multi-scale current flow visualization zooms from the wire surface into the atomic lattice so students see electron drift, not just current arrows |
| Students don't understand *why* components fail or what failure looks like | FUSE™ Engine triggers real, named failure modes (Thermal Runaway, Avalanche Breakdown, Electrolyte Boilover) with 3D particle effects and plain-language physical explanations |
| Physical lab components are expensive and destroyed by over-voltage experiments | Component Arena lets students push any component past its limits — zero hardware, zero cost, zero risk |
| Coordinating assignments across a class is cumbersome | Classroom Mode with roster management, join codes, and per-student analytics from a single teacher dashboard |
| Sourcing a good textbook is expensive and often incomplete | The full Year 1 + Year 2 electrical curriculum is built into the app with worked examples and interactive practice — no separate purchase required |
| Students disengage from dry formula drills | Gamification, Arcade Mode, and adaptive practice with XP and badges keep students engaged while reinforcing core concepts |

### Supported Grade Levels & Programs

- Grade 8 — Introduction to electricity concepts
- Grades 9–10 — Foundational circuits and components
- Grades 11–12 — Advanced circuit analysis, CTE Electronics pathways
- **Higher Education** — Year 1 and Year 2 post-secondary electrical engineering curricula
- **CTE Programs** — Aligned to NGSS PS3 (Energy) and CTE Electronics pathway standards

### The In-App Textbook as a Primary Resource

The integrated textbook (`/textbook`) covers everything from "what is an electron?" through advanced RLC circuits, op-amp design, and digital fundamentals.  Each chapter links directly to adaptive practice worksheets and Component Arena stress tests so students immediately apply what they read.

**For a first-year college circuits course**, assign:
1. Chapters on Voltage, Current, Resistance, Power (W.I.R.E. framework)
2. Ohm's Law and Series/Parallel circuits — build and verify in the 3D Builder
3. KVL/KCL — use mesh and nodal analysis worksheets
4. Component failures — run Thermal Overload and Avalanche Breakdown scenarios in the Component Arena

**For a second-year course**, the AC, semiconductor, op-amp, and digital chapters provide a complete curriculum supplement with zero external materials required.

### Classroom Mode Quick Start

1. Go to `/classroom` and create your cohort
2. Share the **join code** with your students
3. Assign problems from the **W.I.R.E. problem library**, which maps to specific chapters in the in-app textbook
4. Monitor real-time completion, accuracy, and concept-gap data from the teacher dashboard
5. Enable **cloud sync** by setting `CLASSROOM_KV_URL` and `CLASSROOM_KV_TOKEN` in Vercel to persist rosters and progress across devices

### Educator License Highlights

The **Educator License** ($299/educator/yr) unlocks:
- Unlimited saved circuits
- Full FUSE™ failure names, physical descriptions, and Component Arena access
- Lesson templates and curriculum-aligned assessments
- Advanced W.I.R.E. coaching tools
- Priority support and onboarding

For **Institutional Licenses** (schools and districts), contact support@circuitry3d.app — bulk educator seats, dedicated onboarding, SIS integrations, SSO, and curriculum alignment toolkit are included.

> 📋 For outreach templates, grant funding angles, and a competitive comparison table, see [`docs/ARENA_MARKETING.md`](docs/ARENA_MARKETING.md).

---

## 💳 Pricing

Pricing is available at [`/pricing`](https://circuitry3d.app/#/pricing). Plans are offered on **monthly** or **annual** (save 15%) billing cycles.

| Plan | Price (Annual) | Who it's for | Highlights |
|---|---|---|---|
| **Free Sandbox** | Free | Explorers | 3 active circuits · Core components · W.I.R.E. analysis preview · Community hub · FUSE™ severity badge only |
| **Student Plan** | $92 / student / yr | Students | 10 active circuits · Full component library · W.I.R.E. analysis tools · **Full FUSE™ failure names + visual effects** · Community hub |
| **Educator License** | $299 / educator / yr | Teachers | Unlimited saved circuits · Advanced W.I.R.E. coaching · Lesson templates & assessments · **Full FUSE™ analysis + physical descriptions + Component Arena** · Priority support |
| **Institutional License** | Contact us | Schools & districts | Bulk educator seats · Dedicated onboarding · SIS integrations & SSO · Curriculum alignment toolkit · **Custom FUSE™ component profiles** |

**Add-on — Certification Bundle** *(Coming Soon)* — $99 / yr: Guided certification pathway, accredited PD modules, printable achievement badges.

Volume discounts available for 25+ seats. Custom enterprise packages available — contact support@circuitry3d.app.

---

## 📱 Android App

The project ships as a Capacitor-wrapped Android app ready for Google Play.

### Build the AAB

```bash
# Option 1 — automated script
./build-android.sh

# Option 2 — manual steps
npm install
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
```

The signed AAB is generated at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

### Play Store Resources

| File | Purpose |
|---|---|
| [PLAY_STORE_SUBMISSION_GUIDE.md](PLAY_STORE_SUBMISSION_GUIDE.md) | Step-by-step submission guide |
| [PLAY_CONSOLE_AUTO_PUBLISH_SETUP.md](PLAY_CONSOLE_AUTO_PUBLISH_SETUP.md) | GitHub Actions → Play Console auto-publish |
| [PLAY_STORE_PACKAGE_SUMMARY.md](PLAY_STORE_PACKAGE_SUMMARY.md) | Overview of prepared assets |
| `play-store-assets/` | Icons, feature graphic, screenshots |

---

## 👤 Founder

**Mitchell Lorin McKnight** — Founder & Lead Developer

Mitchell began CircuiTry3D after watching students struggle to connect textbook schematics to the physical reality of what electricity actually does inside a wire — and what happens when it goes wrong. The result is a platform that starts where every other circuit simulator stops: at the moment of failure, at the atomic scale, and with a complete curriculum to back it up.

---

## 📄 License

[ISC](https://opensource.org/licenses/ISC)

## 🤝 Contributing

Pull requests are welcome! Please open an issue first to discuss what you'd like to change.

## 📞 Support

- **GitHub Issues:** https://github.com/Mitchelllorin/CircuiTry3D/issues
- **Email:** support@circuitry3d.app

