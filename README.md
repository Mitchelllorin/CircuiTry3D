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

### ⚡ 3D Circuit Builder (`/app`)
Build and simulate circuits in a 3D sandbox. Components snap to a grid and the live DC solver updates voltages and currents in real time. Zoom in to inspect atomic-level electron flow and see Ohm's Law at work.

### 🎯 Adaptive Practice (`/practice`)
The practice workspace tracks your recent W.I.R.E. (Write, Identify, Read, Evaluate) misses and surfaces the three problems that best target your current gaps. Recommendations update automatically as you complete worksheets.

### 🏅 Gamification & Challenge Mode
Every worksheet completion awards XP, streak bonuses, and badges via **GamificationContext**. The Challenge Mode dashboard shows XP progress, unique clears, a live leaderboard, and component unlocks (Precision Op-Amp, Sensor Pack, Power Lab, etc.). All progress is persisted to `localStorage` — no account required.

### 🎓 Classroom Mode (`/classroom`)
Teachers can create cohorts, share join codes, and schedule assignments from the problem library. **ClassroomContext** syncs rosters, assignments, and analytics to Vercel KV via `/api/classroom`. Set `KV_REST_API_URL` and `KV_REST_API_TOKEN` in Vercel to enable cloud persistence; the app falls back to local storage without them.

### 🧪 Community Hub (`/community`)
Share circuit exports, post lab notes, and browse the circuit gallery. Member profiles (set via `/account`) roll up contributions automatically. The feed and gallery persist locally for offline use.

### 📐 Schematic Mode
A dedicated schematic view renders the same circuit as a clean 2D schematic diagram alongside the 3D builder, making it easy to compare real-world wiring with standard notation.

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

