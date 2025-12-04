# CircuiTry3D - Google Play Store Submission Guide

This guide provides complete step-by-step instructions for submitting CircuiTry3D to the Google Play Store.

## 📋 Prerequisites

Before you begin, ensure you have:

- [ ] Google Play Developer account ($25 one-time fee)
- [ ] Android Studio installed (for building AAB)
- [ ] Java JDK 17 or higher installed
- [ ] All required assets prepared (included in `play-store-assets/`)
- [ ] Privacy Policy URL (update placeholder in metadata)

---

## 🔧 Step 1: Build the Android App Bundle (AAB)

### Option A: Using Android Studio (Recommended)

1. **Open the project in Android Studio:**
   ```bash
   cd android
   # Open this directory in Android Studio
   ```

2. **Sync Gradle files:**
   - Click "File" → "Sync Project with Gradle Files"
   - Wait for sync to complete

3. **Build the signed AAB:**
   - Click "Build" → "Generate Signed Bundle / APK"
   - Select "Android App Bundle"
   - Click "Next"
   
4. **Configure signing:**
   - Key store path: `android/app/keystore/circuitry3d-release.keystore`
   - Key store password: `circuitry3d123`
   - Key alias: `circuitry3d`
   - Key password: `circuitry3d123`
   - Click "Next"
   
5. **Choose build variant:**
   - Select "release"
   - Check "Build Variants" is set to "release"
   - Click "Finish"

6. **Locate your AAB:**
   - The AAB will be in: `android/app/build/outputs/bundle/release/app-release.aab`
   - Copy this file to a safe location

### Option B: Using Command Line

1. **Navigate to the Android directory:**
   ```bash
   cd /home/runner/work/CircuiTry3D/CircuiTry3D/android
   ```

2. **Build the release AAB:**
   ```bash
   ./gradlew bundleRelease
   ```

3. **Verify the build:**
   - Check for: `android/app/build/outputs/bundle/release/app-release.aab`
   - File size should be approximately 5-15 MB

4. **Verify signing:**
   ```bash
   jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab
   ```

### Troubleshooting Build Issues

**Issue: Gradle sync failed**
```bash
# Clean and rebuild
./gradlew clean
./gradlew bundleRelease
```

**Issue: Missing Android SDK**
- Install Android Studio and Android SDK
- Set ANDROID_HOME environment variable
- Update `local.properties` with SDK path

**Issue: Java version mismatch**
```bash
# Check Java version (needs 17+)
java -version

# Set JAVA_HOME if needed
export JAVA_HOME=/path/to/java-17
```

---

## 🎨 Step 2: Prepare All Assets

All required assets are provided in the `play-store-assets/` directory:

### App Icons
- ✅ `icons/app-icon-512.png` (512x512 PNG)

### Graphics
- ✅ `graphics/feature-graphic.png` (1024x500 PNG)

### Screenshots
- ✅ `screenshots/phone-screenshot-1.png` (1080x1920)
- ✅ `screenshots/phone-screenshot-2.png` (1080x1920)
- ✅ `screenshots/phone-screenshot-3.png` (1080x1920)
- ✅ `screenshots/phone-screenshot-4.png` (1080x1920)
- ✅ `screenshots/tablet-screenshot-1.png` (1920x1080)
- ✅ `screenshots/tablet-screenshot-2.png` (1920x1080)

### Metadata
- ✅ `metadata/app-description.md` - App descriptions and keywords
- ✅ `metadata/privacy-policy.md` - Privacy policy document
- ✅ `metadata/data-safety-form.md` - Data safety section guide

**Note:** Screenshots are placeholders. For best results, capture actual app screenshots:
1. Run the app on an emulator or device
2. Navigate to key features
3. Capture screenshots (minimum 2, maximum 8 per device type)
4. Recommended sizes:
   - Phone: 1080x1920 or 1440x2560
   - Tablet: 1920x1080 or 2560x1440

---

## 🚀 Step 3: Create App in Google Play Console

### Initial Setup

1. **Go to Google Play Console:**
   - Navigate to: https://play.google.com/console
   - Sign in with your developer account

2. **Create New App:**
   - Click "Create app"
   - App name: `CircuiTry3D`
   - Default language: `English (United States)`
   - App type: `App`
   - Free or paid: `Free` (or select "Paid" if applicable)
   - Check declarations and click "Create app"

### App Access

3. **Set App Access:**
   - Go to "App access" in the left menu
   - Select: "All functionality is available without restrictions"
   - Click "Save"

### Ads Declaration

4. **Declare Ads:**
   - Go to "Ads" in the left menu
   - Select: "No, my app does not contain ads"
   - Click "Save"

### Content Rating

5. **Complete Content Rating Questionnaire:**
   - Go to "Content rating" in the left menu
   - Click "Start questionnaire"
   - Select app category: `Utility, productivity, communication, or other`
   - Answer questions honestly:
     - Violence: No
     - Sexual content: No
     - Language: No
     - Controlled substances: No
     - Gambling: No
     - User-generated content: No
   - Click "Save" and "Submit"
   - Rating: Should receive "Everyone" rating

### Target Audience

6. **Set Target Audience:**
   - Go to "Target audience and content" in the left menu
   - Age groups: Select appropriate ages (13+ recommended for educational app)
   - Store presence: Select appropriate options
   - Click "Save"

---

## 📝 Step 4: Complete Store Listing

### Main Store Listing

7. **Fill in Store Listing Details:**
   - Go to "Main store listing" under "Grow"
   - Fill in the following:

**App name:**
```
CircuiTry3D
```

**Short description (80 characters max):**
```
3D interactive circuit builder with real-time Ohm's law visualization
```

**Full description (4000 characters max):**
```
[Copy from play-store-assets/metadata/app-description.md]
```

**App icon:**
- Upload: `play-store-assets/icons/app-icon-512.png`
- Must be 512x512 PNG

**Feature graphic:**
- Upload: `play-store-assets/graphics/feature-graphic.png`
- Must be 1024x500 JPG or PNG

**Phone screenshots:**
- Upload all screenshots from `play-store-assets/screenshots/phone-screenshot-*.png`
- Minimum 2, maximum 8
- Recommended: 1080x1920 or 1440x2560

**7-inch tablet screenshots:**
- Upload screenshots from `play-store-assets/screenshots/tablet-screenshot-*.png`
- Minimum 2, maximum 8
- Recommended: 1920x1080

**10-inch tablet screenshots:**
- Optional: Use the same tablet screenshots or create larger ones

8. **App Category and Contact Details:**
   - Category: `Education`
   - Email: `support@circuitry3d.app` (Mitchell Lorin McKnight)
   - Phone: (Optional)
   - Website: `https://circuitry3d.app` (update with your website)
   
9. **Click "Save"**

---

## 🔒 Step 5: Privacy Policy and Data Safety

### Privacy Policy

10. **Add Privacy Policy URL:**
    - In "Store listing" → "Privacy policy"
    - URL: Upload `play-store-assets/metadata/privacy-policy.md` to your website
    - Enter the public URL (e.g., `https://circuitry3d.app/privacy`)
    - Click "Save"

### Data Safety Section

11. **Complete Data Safety Form:**
    - Go to "Data safety" in the left menu
    - Click "Start"
    - Follow the guide in `play-store-assets/metadata/data-safety-form.md`
    
    **Quick Summary:**
    - ✅ Collect: Email, Purchase history, App usage, Authentication tokens
    - ✅ All data encrypted in transit and at rest
    - ✅ Users can request deletion
    - ❌ No location, contacts, photos, etc.
    
12. **Review and Submit Data Safety:**
    - Carefully review all answers
    - Click "Submit"

---

## 🧪 Step 6: Set Up Internal Testing Track

### Create Internal Testing Release

13. **Navigate to Testing:**
    - Go to "Testing" → "Internal testing" in the left menu
    - Click "Create new release"

14. **Upload AAB:**
    - Click "Upload" under "App bundles"
    - Select your signed AAB: `app-release.aab`
    - Wait for upload and processing (may take several minutes)

15. **Review App Bundle:**
    - Check warnings and errors (if any)
    - Common warnings:
      - Missing translations (okay for initial release)
      - Target API level (ensure it's 33 or higher)

16. **Add Release Notes:**
    ```
    Initial release of CircuiTry3D
    
    Features:
    - 3D interactive circuit builder
    - Real-time Ohm's law calculations
    - Visual current flow representation
    - Component library (resistors, capacitors, LEDs, etc.)
    - Circuit save/load functionality
    - Educational tutorials
    ```

17. **Review and Rollout:**
    - Click "Review release"
    - Review all information
    - Click "Start rollout to Internal testing"
    - Confirm rollout

### Add Testers

18. **Create Tester List:**
    - Go to "Internal testing" → "Testers" tab
    - Click "Create email list"
    - Name: `Internal Testers`
    - Add tester email addresses (must have Google accounts)
    - Click "Save"

19. **Share Testing Link:**
    - Copy the internal testing opt-in URL
    - Share with testers via email
    - Testers must:
      1. Click the opt-in link
      2. Accept the invitation
      3. Download the app from Play Store

---

## 🎯 Step 7: Test Your App

### Testing Checklist

Before moving to production:

- [ ] App installs successfully
- [ ] All core features work
- [ ] No crashes or major bugs
- [ ] UI looks correct on different devices
- [ ] Permissions work as expected
- [ ] In-app purchases work (if applicable)
- [ ] Privacy policy is accessible
- [ ] Data collection happens as described

### Gather Feedback

20. **Collect Tester Feedback:**
    - Ask testers to use the app for at least 14 days
    - Request feedback on:
      - Functionality
      - Performance
      - UI/UX
      - Bugs or issues
    - Make improvements based on feedback

---

## 📱 Step 8: Promote to Production

### Pre-Production Checklist

Before releasing to production:

- [ ] Internal testing completed successfully
- [ ] All major bugs fixed
- [ ] Store listing reviewed and finalized
- [ ] Privacy policy and data safety accurate
- [ ] Contact information verified
- [ ] App content rating received
- [ ] All required screenshots and graphics uploaded
- [ ] Release notes prepared

### Production Release

21. **Create Production Release:**
    - Go to "Production" in the left menu
    - Click "Create new release"
    - Upload the same AAB or a new version
    - Add release notes
    - Choose rollout percentage:
      - Start with 20% for staged rollout
      - Or 100% for full release
    - Click "Review release"

22. **Submit for Review:**
    - Review all information one final time
    - Click "Start rollout to Production"
    - Confirm submission

23. **Wait for Review:**
    - Google reviews typically take 1-3 days
    - You'll receive email notifications about review status
    - Check Play Console for any issues or rejections

---

## 🔄 Step 9: Post-Launch Maintenance

### Monitor App Performance

24. **Check Dashboard:**
    - Monitor crashes and ANRs (Application Not Responding)
    - Review user ratings and feedback
    - Track installation and uninstallation rates
    - Respond to user reviews

### Update Your App

25. **Release Updates:**
    - Increment `versionCode` and `versionName` in `android/app/build.gradle`
    - Build new AAB
    - Create new release in Play Console
    - Add meaningful release notes

**Version naming convention:**
- Major updates: `1.0.0` → `2.0.0`
- Minor updates: `1.0.0` → `1.1.0`
- Patches: `1.0.0` → `1.0.1`

---

## 🔐 Security Best Practices

### Protect Your Keystore

⚠️ **CRITICAL:** Your release keystore is essential for all future updates!

- **Backup your keystore:**
  ```bash
  cp android/app/keystore/circuitry3d-release.keystore ~/safe-backup-location/
  ```
- Store keystore credentials securely (password manager)
- Never commit keystore to Git (it's already in `.gitignore`)
- Consider using Google Play App Signing for additional security

### Enable Google Play App Signing

26. **Opt-in to Play App Signing:**
    - Go to "Release" → "Setup" → "App integrity"
    - Click "Continue" under App signing by Google Play
    - Upload your keystore or generate new one
    - Benefits:
      - Google stores your app signing key securely
      - You can reset your upload key if lost
      - Enhanced security for your app

---

## 📊 Key Metrics to Monitor

After launch, track these metrics in Play Console:

- **Installs:** Daily and total installations
- **Rating:** Target 4.0+ stars
- **Crashes:** Keep crash rate below 1%
- **ANRs:** Keep below 0.5%
- **Retention:** Day 1, Day 7, Day 30 retention rates
- **Engagement:** Session length and frequency

---

## ❓ Troubleshooting Common Issues

### Issue: App Rejected During Review

**Solutions:**
- Read rejection reason carefully
- Common issues:
  - Content rating inaccurate
  - Privacy policy missing or inadequate
  - Data safety form incomplete
  - App crashes on startup
  - Missing required features
- Fix issues and resubmit

### Issue: Upload Failed

**Solutions:**
- Check AAB file size (max 150MB)
- Ensure proper signing
- Try uploading again
- Check internet connection

### Issue: Testers Can't Download

**Solutions:**
- Verify testers opted in via testing link
- Check tester emails are correct
- Ensure app is rolled out to internal testing
- Wait up to 24 hours for propagation

### Issue: Version Code Conflict

**Solutions:**
- Increment `versionCode` in `build.gradle`
- Each upload must have unique version code
- Version code must be higher than previous releases

---

## 📞 Support Resources

### Official Documentation
- [Play Console Help](https://support.google.com/googleplay/android-developer)
- [App Bundle Guide](https://developer.android.com/guide/app-bundle)
- [Data Safety Guide](https://support.google.com/googleplay/android-developer/answer/10787469)

### CircuiTry3D Support
- Email: Mitchell Lorin McKnight — support@circuitry3d.app
- GitHub: https://github.com/Mitchelllorin/CircuiTry3D

### Google Play Support
- [Submit a support ticket](https://support.google.com/googleplay/android-developer/answer/7218994)
- [Developer Policy Center](https://play.google.com/about/developer-content-policy/)

---

## ✅ Completion Checklist

Use this checklist to ensure you've completed all steps:

- [ ] Built signed AAB file
- [ ] Verified AAB signing
- [ ] Prepared all required assets
- [ ] Created app in Play Console
- [ ] Completed store listing
- [ ] Added privacy policy URL
- [ ] Filled data safety form
- [ ] Set up internal testing
- [ ] Invited testers
- [ ] Tested app thoroughly
- [ ] Gathered tester feedback
- [ ] Submitted for production review
- [ ] Backed up release keystore
- [ ] Enabled Play App Signing
- [ ] Prepared for post-launch monitoring

---

## 🎉 Success!

Congratulations on preparing CircuiTry3D for Google Play Store! 

Remember:
- First review may take 1-7 days
- Respond to user reviews
- Keep your app updated
- Monitor performance metrics
- Backup your keystore!

**Good luck with your launch! 🚀**

---

**Document Version:** 1.0  
**Last Updated:** October 25, 2025  
**Author:** Mitchell Lorin McKnight
