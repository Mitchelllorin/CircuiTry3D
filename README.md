# CircuiTry3D

3D, Interactive, Electric Circuit Builder that utilizes Ohm's law and visualizes current flow and behavior in an electric circuit down to the atomic level - creating a new way to understand the abstract concepts - Illuminating Electricity

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

## 🔧 Technology Stack

- **Frontend:** React 19 + TypeScript
- **Build Tool:** Vite 7
- **Mobile:** Capacitor
- **Routing:** React Router DOM
- **Deployment:** Netlify (web), Google Play Store (Android)

## 📄 License

ISC

## 🤝 Contributing



## 📞 Support

- GitHub Issues: https://github.com/Mitchelllorin/CircuiTry3D/issues
- Email: support@circuitry3d.app (placeholder)

