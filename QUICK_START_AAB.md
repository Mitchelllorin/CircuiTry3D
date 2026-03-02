# Quick Start: Building the Android App Bundle (AAB)

This guide will help you quickly build the signed Android App Bundle for Google Play Store submission.

## Prerequisites

Before you begin, ensure you have:

- [x] Node.js 18+ installed
- [x] npm installed
- [x] Java JDK 17+ installed
- [ ] Android Studio installed (optional but recommended)
- [ ] Android SDK installed

## Method 1: Download from GitHub Actions (Fastest — No Local Setup Required)

The **Build AAB** GitHub Actions workflow builds and signs the AAB automatically in the cloud. You do **not** need Android Studio or an Android SDK installed locally.

### Do you already have an AAB?

Yes — every successful run of the **Build AAB** workflow uploads the signed bundle as a downloadable artifact. To get it:

1. Go to **Actions → Build AAB** in the GitHub repository:
   `https://github.com/Mitchelllorin/CircuiTry3D/actions/workflows/build-aab.yml`
2. Click the most recent **successful** run (green check ✅).
3. On the run's detail page, click the **Summary** tab to see the **Build Summary** table. This shows the exact commit, branch, and version that was built — confirm it matches your changes before downloading.
4. Scroll down to the **Artifacts** section.
5. Download **`app-release-aab-v<version>-<sha>`** (a ZIP file containing `app-release.aab`). The artifact name includes the version number and the first 7 characters of the commit hash so you always know what code is inside it.

> **Note:** GitHub keeps artifacts for 90 days. If the artifact has expired, re-run the workflow (see below).

### Generate a new AAB

1. Go to **Actions → Build AAB**:
   `https://github.com/Mitchelllorin/CircuiTry3D/actions/workflows/build-aab.yml`
2. Click **Run workflow** (top-right of the run list).
3. Select branch **`main`** and click **Run workflow**.
4. Wait ~3 minutes for the run to complete.
5. Download **`app-release-aab-v<version>-<sha>`** from the **Artifacts** section of the completed run.

### Required GitHub secrets

The workflow signs the bundle using a keystore. You need **at least one password secret** set in
**Settings → Secrets and variables → Actions**. The workflow accepts either name and falls back automatically:

| Secret name              | Notes                                                                  |
|--------------------------|------------------------------------------------------------------------|
| `ANDROID_KEY_PASSWORD`   | Password that protects your upload key inside the keystore             |
| `ANDROID_STORE_PASSWORD` | Password that protects the keystore file itself (can be the same as above) |

You only need to set **one** of these secrets. If only one is provided, the workflow will use that same value for both passwords.

**Keystore:** set `ANDROID_KEYSTORE_BASE64` (base64-encoded `.jks`) if you use your own upload key. Otherwise, the committed `new-upload-key.jks` (alias `circuitry3d-upload-reset`) is used automatically.

---

## Method 2: Using the Automated Script (Local Build)

Before running the script, set up your local signing configuration:

```bash
# 1. Copy the keystore to the android/app/keystore/ directory
#    new-upload-key.jks (repo root) → android/app/keystore/upload-key.jks
cp new-upload-key.jks android/app/keystore/upload-key.jks

# 2. Create android/key.properties from the example
cp android/key.properties.example android/key.properties
# Then edit android/key.properties and set storePassword / keyPassword
```

Then run:

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

## Method 3: Manual Build

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

## Method 4: Using Android Studio

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

1. **→ Follow the upload guide:** [UPLOAD_TO_PLAY_STORE.md](UPLOAD_TO_PLAY_STORE.md)
   - Check if you already uploaded the AAB
   - Step-by-step Play Console upload instructions
   - Store listing checklist (copy-paste ready)
   - How to submit for production

2. **Test it locally** (optional):
   ```bash
   bundletool build-apks --bundle=app-release.aab --output=test.apks --mode=universal
   bundletool install-apks --apks=test.apks
   ```

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
- **Do not manually edit `versionCode` or `versionName` in `build.gradle`.** The workflow sets both automatically on every run.
- `versionCode` = run number + 2 (increments automatically with each build).
- `versionName` = `1.0.<versionCode>` by default, or whatever you type in the **version_name** input when manually dispatching.
- Each new run produces a higher version code than the last — no manual changes needed.

## Getting Help

- **Set up auto-publish to Play Console (one-time):** [PLAY_CONSOLE_AUTO_PUBLISH_SETUP.md](PLAY_CONSOLE_AUTO_PUBLISH_SETUP.md)
- **Upload the AAB to Play Console manually:** [UPLOAD_TO_PLAY_STORE.md](UPLOAD_TO_PLAY_STORE.md)
- **Read the full guide:** [PLAY_STORE_SUBMISSION_GUIDE.md](PLAY_STORE_SUBMISSION_GUIDE.md)
- **Check the package summary:** [PLAY_STORE_PACKAGE_SUMMARY.md](PLAY_STORE_PACKAGE_SUMMARY.md)
- **Android Developers:** https://developer.android.com/guide
- **Capacitor Docs:** https://capacitorjs.com/docs
- **GitHub Issues:** https://github.com/Mitchelllorin/CircuiTry3D/issues

---

**Good luck with your build! 🚀**
