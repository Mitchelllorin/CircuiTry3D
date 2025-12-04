# CircuiTry3D

3D, Interactive, Electric Circuit Builder that utilizes Ohm's law and visualizes current flow and behavior in an electric circuit down to the atomic level - creating a new way to understand the abstract concepts - Illuminating Electricity. CircuiTry3D is founded and led by **Mitchell Lorin McKnight**, who built the platform to give visual learners a more intuitive path into circuit theory.

## 🚀 Available Platforms

- **Web Application** - Built with React + Vite, deployed on Netlify
- **Android Application** - Native Android app using Capacitor (ready for Google Play Store)

## 📱 Android App Setup

This project is now configured as an Android application ready for Google Play Store submission!

### Quick Links

- **📋 [Play Store Submission Guide](PLAY_STORE_SUBMISSION_GUIDE.md)** - Complete step-by-step instructions
- **📦 [Package Summary](PLAY_STORE_PACKAGE_SUMMARY.md)** - Overview of all prepared materials
- **🎨 Play Store Assets** - Located in `play-store-assets/` directory

### Building the Android App

```bash
# Option 1: Use the automated build script
./build-android.sh

# Option 2: Manual build
npm install
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
```

The signed AAB will be generated at: `android/app/build/outputs/bundle/release/app-release.aab`

### What's Included

✅ Complete Android project setup with Capacitor  
✅ Signed keystore for release builds  
✅ Configured AndroidManifest.xml with proper permissions  
✅ App icons (512x512 PNG)  
✅ Feature graphic (1024x500 PNG)  
✅ Phone and tablet screenshots  
✅ Complete metadata and descriptions  
✅ Privacy policy  
✅ Data safety documentation  
✅ Build scripts and comprehensive guides  

## 🌐 Web Development

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## 📦 Project Structure

```
CircuiTry3D/
├── android/              # Android app (Capacitor)
├── play-store-assets/    # Google Play Store assets
├── src/                  # React source code
├── public/               # Static assets
├── dist/                 # Built web app
└── docs/                 # Documentation
```

## 👤 Founder

- **Founder & Lead Developer:** Mitchell Lorin McKnight  
- **Mission:** Replace abstract circuit lectures with immersive, feedback-rich practice spaces.  
- **Dev Story:** Mitchell began CircuiTry3D after seeing students struggle to connect textbook schematics to physical behavior. The project focuses on letting learners inspect atomic-level current flow and reinforce W.I.R.E. habits inside a safe 3D sandbox.

## 🔧 Technology Stack

- **Frontend:** React 19 + TypeScript
- **Build Tool:** Vite 7
- **Mobile:** Capacitor
- **Routing:** React Router DOM
- **Deployment:** Netlify (web), Google Play Store (Android)

## 🎯 Adaptive Practice Paths

- The Practice workspace now tracks your recent W.I.R.E. misses and highlights the concepts and metrics that need reinforcement.
- An adaptive queue surfaces the next three problems that best target those gaps, and helper shortcuts jump directly to the circuit diagram or Ohm's Law wheel you need most.
- Recommendations update automatically as you solve worksheets, so progressing through the curated list keeps the challenge aligned with your current understanding.

## 🏅 Challenge Mode Gamification

- Every completed worksheet now awards XP based on difficulty, with bonuses for first-time clears and daily streaks.
- A new Challenge Mode card inside the Practice workspace tracks your level, streak, unique clears, and recently unlocked badges.
- Achievement tiers such as Series Specialist, Challenge Conqueror, and Streak Legend unlock extra XP and provide clear learning milestones for students.
- Progress is stored locally, so learners can leave and return without losing their mastery path.

## 🧪 Community Hub

- Visit `/community` to swap quick lab notes, post Arena exports, and capture product feedback from other builders.
- The Circuit Gallery and Lab Chat panels persist locally, so you can keep iterating on ideas even when you're offline.
- Member profiles now live alongside the feed—sign in via `/account`, set a bio + accent color, and your contributions (chats, circuit shares, reviews) automatically roll up into your profile card.
- Community stats highlight active members, shared circuits, and the real-time rating pulled from the Feedback Wall.

## 📄 License

ISC

## 🤝 Contributing



## 📞 Support

- GitHub Issues: https://github.com/Mitchelllorin/CircuiTry3D/issues
- Email: Mitchell Lorin McKnight — support@circuitry3d.app

