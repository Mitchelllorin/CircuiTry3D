# CircuiTry3D

> **Illuminating Electricity** — a 3D, interactive electric circuit builder that visualizes current flow and behavior down to the atomic level using Ohm's Law.

CircuiTry3D is founded and led by **Mitchell Lorin McKnight**, who built the platform to give visual learners a more intuitive path into circuit theory.

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://circuitry3d.app)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node >=20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

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

**Multi-zoom current flow visualization** — four depth tiers (macro → close → atomic → deep-atomic) animate electron/conventional current flow as particles. Toggle between Electron Flow (negative→positive) and Conventional Current (positive→negative) from the View menu.

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

### 📚 Integrated Textbook (`/textbook`)
An in-app electrical theory reference with chapters organized by grade/year. Each chapter includes formula definitions, worked examples, variable descriptions, and links to relevant practice problems.

### 📐 Schematic Mode
A dedicated schematic view renders the same circuit as a clean 2D schematic diagram alongside the 3D builder, making it easy to compare real-world wiring with standard notation. Supports both American and IEC symbol standards.

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

Mitchell began CircuiTry3D after seeing students struggle to connect textbook schematics to real physical behavior. The project focuses on letting learners inspect atomic-level current flow and reinforce W.I.R.E. habits inside a safe 3D sandbox.

---

## 📄 License

[ISC](https://opensource.org/licenses/ISC)

## 🤝 Contributing

Pull requests are welcome! Please open an issue first to discuss what you'd like to change.

## 📞 Support

- **GitHub Issues:** https://github.com/Mitchelllorin/CircuiTry3D/issues
- **Email:** support@circuitry3d.app

