# Quick Start: Building the Android App Bundle (AAB)

This guide will help you quickly build the signed Android App Bundle for Google Play Store submission.

## Prerequisites

Before you begin, ensure you have:

- [x] Node.js 18+ installed
- [x] npm installed
- [x] Java JDK 17+ installed
- [ ] Android Studio installed (optional but recommended)
- [ ] Android SDK installed

## Method 1: Using the Automated Script (Easiest)

Simply run:

```bash
./build-android.sh
```

This script will:
1. Install npm dependencies
2. Build the web application
3. Sync Capacitor
4. Build the signed Android App Bundle
5. Copy the AAB to the project root

**Output:** `circuitry3d-release.aab`

## Method 2: Manual Build

If the automated script doesn't work, follow these manual steps:

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Build Web Application

```bash
npm run build
```

This creates the `dist/` directory with your web app.

### Step 3: Sync Capacitor

```bash
npx cap sync android
```

This copies the web assets to the Android project.

### Step 4: Build the AAB

```bash
cd android
./gradlew bundleRelease
```

### Step 5: Locate Your AAB

The signed AAB will be at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

Copy it to your desired location or rename it:
```bash
cp android/app/build/outputs/bundle/release/app-release.aab ./circuitry3d-release-v1.0.0.aab
```

## Method 3: Using Android Studio

1. **Open the project:**
   - Launch Android Studio
   - Click "Open an existing project"
   - Navigate to the `android/` directory and open it

2. **Sync Gradle:**
   - Wait for Gradle to sync (may take a few minutes)
   - If prompted, accept any SDK installations

3. **Build the AAB:**
   - Click "Build" → "Generate Signed Bundle / APK"
   - Select "Android App Bundle"
   - Click "Next"

4. **Sign the bundle:**
   - Key store path: your local keystore under `app/keystore/`
   - Key store password: (your value)
   - Key alias: (your value)
   - Key password: (your value)
   - Click "Next"

5. **Choose build variant:**
   - Select "release"
   - Click "Finish"

6. **Locate your AAB:**
   - The AAB will be in: `app/build/outputs/bundle/release/app-release.aab`
   - Android Studio will show you the location in a notification

## Verifying Your AAB

### Check File Size
```bash
ls -lh android/app/build/outputs/bundle/release/app-release.aab
```

Expected size: 5-15 MB (depending on assets)

### Verify Signing
```bash
jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab
```

You should see: "jar verified."

### Check Bundle Contents
```bash
bundletool build-apks --bundle=android/app/build/outputs/bundle/release/app-release.aab --output=test.apks
```

(Requires bundletool: https://github.com/google/bundletool)

## Troubleshooting

### Error: Android SDK Not Found

**Solution:**
1. Install Android Studio from https://developer.android.com/studio
2. Open Android Studio
3. Go to "Tools" → "SDK Manager"
4. Install Android SDK Platform 35 (or latest)
5. Create `android/local.properties` with:
   ```
   sdk.dir=/path/to/your/Android/sdk
   ```

### Error: Java Version Mismatch

**Solution:**
```bash
# Check Java version
java -version

# Should be 17 or higher
# If not, install Java 17+
# Ubuntu/Debian:
sudo apt-get install openjdk-17-jdk

# macOS (using Homebrew):
brew install openjdk@17
```

### Error: Gradle Build Failed

**Solution:**
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew bundleRelease
```

### Error: Cannot Connect to gradle.org or google.com

**Solution:**
- Check your internet connection
- Check if your firewall/VPN is blocking connections
- Try using a different network

### Error: Keystore Not Found

**Solution:**
Ensure the keystore file exists at:
```
android/app/keystore/<your-keystore-file>
```

If missing, regenerate it:
```bash
cd android/app/keystore
keytool -genkey -v -keystore your-upload-keystore.jks \
  -alias your-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

## Next Steps

Once you have your signed AAB:

1. **Test it locally** (optional):
   ```bash
   bundletool build-apks --bundle=app-release.aab --output=test.apks --mode=universal
   bundletool install-apks --apks=test.apks
   ```

2. **Upload to Google Play Console:**
   - Follow the [Play Store Submission Guide](PLAY_STORE_SUBMISSION_GUIDE.md)
   - Start with internal testing
   - Gather feedback
   - Submit for production

3. **Monitor your release:**
   - Check Play Console for review status
   - Respond to any issues
   - Monitor crashes and user feedback

## Important Notes

⚠️ **Keystore Security:**
- The keystore file is essential for all future updates
- Backup `android/app/keystore/circuitry3d-release.keystore` securely
- Never commit it to public repositories
- Store passwords in a password manager

⚠️ **Version Management:**
- Increment `versionCode` for each release in `android/app/build.gradle`
- Update `versionName` to reflect the version (e.g., 1.0.0, 1.1.0, etc.)

## Getting Help

- **Read the full guide:** [PLAY_STORE_SUBMISSION_GUIDE.md](PLAY_STORE_SUBMISSION_GUIDE.md)
- **Check the package summary:** [PLAY_STORE_PACKAGE_SUMMARY.md](PLAY_STORE_PACKAGE_SUMMARY.md)
- **Android Developers:** https://developer.android.com/guide
- **Capacitor Docs:** https://capacitorjs.com/docs
- **GitHub Issues:** https://github.com/Mitchelllorin/CircuiTry3D/issues

---

**Good luck with your build! 🚀**
