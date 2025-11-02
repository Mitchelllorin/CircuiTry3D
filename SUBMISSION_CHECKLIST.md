# CircuiTry3D - Play Store Submission Checklist

Use this checklist to track your progress through the submission process.

## ✅ Prerequisites Completed (Already Done)

- [x] Android project created with Capacitor
- [x] Package name configured: `com.circuitry3d.app`
- [x] AndroidManifest.xml configured with permissions
- [x] build.gradle configured (versionCode: 1, versionName: 1.0.0, targetSdk: 35)
- [x] Release keystore generated and configured
- [x] App icon created (512x512 PNG)
- [x] Feature graphic created (1024x500 PNG)
- [x] Phone screenshots created (4 images, 1080x1920)
- [x] Tablet screenshots created (2 images, 1920x1080)
- [x] App description written (short & full)
- [x] Privacy policy document created
- [x] Data safety documentation prepared
- [x] Build script created (build-android.sh)
- [x] Comprehensive documentation written

## 📋 Your Tasks (To Do Locally)

### Phase 1: Prepare Your Environment

- [ ] Install Node.js 18+ (if not already installed)
- [ ] Install Java JDK 17+ (if not already installed)
- [ ] Install Android Studio (recommended)
- [ ] Install Android SDK Platform 35
- [ ] Clone this repository to your local machine
- [ ] Run `npm install` to install dependencies

### Phase 2: Build the AAB

- [ ] Review the build script: `build-android.sh`
- [ ] Build the web app: `npm run build`
- [ ] Sync Capacitor: `npx cap sync android`
- [ ] Build the AAB: `cd android && ./gradlew bundleRelease`
- [ ] Verify AAB is created at: `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] Verify AAB is signed: `jarsigner -verify -verbose -certs app-release.aab`
- [ ] Copy AAB to a safe location
- [ ] **CRITICAL:** Backup the keystore file: `android/app/keystore/circuitry3d-release.keystore`
- [ ] **CRITICAL:** Store keystore password safely (circuitry3d123)

### Phase 3: Customize Assets (Optional but Recommended)

- [ ] Replace placeholder screenshots with real app screenshots
  - [ ] Capture 4+ phone screenshots (1080x1920 or higher)
  - [ ] Capture 2+ tablet screenshots (1920x1080 or higher)
- [ ] Consider updating the app icon with a custom design
- [ ] Consider updating the feature graphic with custom branding
- [ ] Update email addresses from placeholders to real ones:
  - [ ] In privacy-policy.md
  - [ ] In app-description.md
  - [ ] In data-safety-form.md

### Phase 4: Publish Privacy Policy

- [ ] Upload `play-store-assets/metadata/privacy-policy.md` to your website
- [ ] Or create a public GitHub Pages site for the privacy policy
- [ ] Or use a privacy policy generator/hosting service
- [ ] Note the public URL (e.g., https://yoursite.com/privacy)
- [ ] Test that the privacy policy URL is accessible

### Phase 5: Google Play Console Setup

- [ ] Create a Google Play Developer account ($25 one-time fee)
- [ ] Verify your account email
- [ ] Complete your developer profile
- [ ] Accept the Developer Distribution Agreement

### Phase 6: Create Your App in Play Console

- [ ] Go to Google Play Console: https://play.google.com/console
- [ ] Click "Create app"
- [ ] Enter app name: `CircuiTry3D`
- [ ] Select default language: `English (United States)`
- [ ] Select app type: `App`
- [ ] Select free or paid: `Free` (or Paid if applicable)
- [ ] Accept declarations
- [ ] Click "Create app"

### Phase 7: Complete App Information

#### App Access
- [ ] Navigate to "App access"
- [ ] Select access level (all functionality available or restricted)
- [ ] Save changes

#### Ads Declaration
- [ ] Navigate to "Ads"
- [ ] Declare whether your app contains ads (No for this app)
- [ ] Save changes

#### Content Rating
- [ ] Navigate to "Content rating"
- [ ] Start questionnaire
- [ ] Select category: `Utility, productivity, communication, or other`
- [ ] Answer all questions (all "No" for violence, sexual content, etc.)
- [ ] Submit questionnaire
- [ ] Verify "Everyone" rating is received

#### Target Audience
- [ ] Navigate to "Target audience and content"
- [ ] Select age groups (13+ recommended)
- [ ] Complete all required fields
- [ ] Save changes

#### News Apps (if applicable)
- [ ] Declare if app is a news app (No for this app)

### Phase 8: Complete Store Listing

- [ ] Navigate to "Main store listing"
- [ ] App name: `CircuiTry3D`
- [ ] Short description: Copy from `play-store-assets/metadata/app-description.md`
- [ ] Full description: Copy from `play-store-assets/metadata/app-description.md`
- [ ] Upload app icon: `play-store-assets/icons/app-icon-512.png`
- [ ] Upload feature graphic: `play-store-assets/graphics/feature-graphic.png`
- [ ] Upload phone screenshots: All from `play-store-assets/screenshots/phone-screenshot-*.png`
- [ ] Upload tablet screenshots: All from `play-store-assets/screenshots/tablet-screenshot-*.png`
- [ ] App category: `Education`
- [ ] Tags: Add relevant keywords
- [ ] Email: Your contact email
- [ ] Phone: Optional
- [ ] Website: Your website URL (optional)
- [ ] Save store listing

### Phase 9: Privacy Policy

- [ ] Navigate to "Privacy policy" in store listing
- [ ] Enter your privacy policy URL (from Phase 4)
- [ ] Verify URL is accessible
- [ ] Save changes

### Phase 10: Data Safety

- [ ] Navigate to "Data safety"
- [ ] Click "Start"
- [ ] Follow the guide in `play-store-assets/metadata/data-safety-form.md`
- [ ] Declare collected data:
  - [ ] Email address (for account management)
  - [ ] Purchase history (for subscriptions)
  - [ ] App usage data (for analytics)
  - [ ] Authentication tokens (for login)
- [ ] For each data type, specify:
  - [ ] Collection purpose
  - [ ] Data handling (encrypted in transit and at rest)
  - [ ] User can request deletion
- [ ] Review all answers
- [ ] Submit data safety form

### Phase 11: Set Up Internal Testing

- [ ] Navigate to "Testing" → "Internal testing"
- [ ] Click "Create new release"
- [ ] Upload AAB: `app-release.aab`
- [ ] Wait for processing (may take several minutes)
- [ ] Review any warnings (address critical ones)
- [ ] Add release notes:
  ```
  Initial release of CircuiTry3D
  
  Features:
  - 3D interactive circuit builder
  - Real-time Ohm's law calculations
  - Visual current flow representation
  - Component library
  - Circuit save/load functionality
  - Educational tutorials
  ```
- [ ] Click "Review release"
- [ ] Click "Start rollout to Internal testing"

### Phase 12: Invite Testers

- [ ] Navigate to "Internal testing" → "Testers" tab
- [ ] Create email list: "Internal Testers"
- [ ] Add tester email addresses (must have Google accounts)
- [ ] Save tester list
- [ ] Copy the internal testing opt-in URL
- [ ] Share opt-in URL with testers via email

### Phase 13: Test Your App

- [ ] Testers: Click opt-in link
- [ ] Testers: Accept invitation
- [ ] Testers: Download and install app from Play Store
- [ ] Test all core features:
  - [ ] App launches successfully
  - [ ] No crashes on startup
  - [ ] Circuit building works
  - [ ] UI displays correctly
  - [ ] All features functional
  - [ ] No critical bugs
- [ ] Gather feedback from testers
- [ ] Fix any critical issues
- [ ] Upload new AAB if fixes are needed (increment versionCode)
- [ ] Test for at least 14 days (recommended)

### Phase 14: Prepare for Production

- [ ] Review all store listing information
- [ ] Verify privacy policy URL is working
- [ ] Verify data safety information is accurate
- [ ] Verify all assets are uploaded correctly
- [ ] Check for any warnings in Play Console
- [ ] Address any policy violations
- [ ] Ensure app meets Google Play policies:
  - [ ] No copyright violations
  - [ ] No misleading content
  - [ ] Proper permissions usage
  - [ ] Age-appropriate content
  - [ ] Functional app (not a "fake" or demo)

### Phase 15: Submit for Production

- [ ] Navigate to "Production"
- [ ] Click "Create new release"
- [ ] Upload AAB (same or updated version)
- [ ] Add production release notes
- [ ] Choose rollout strategy:
  - [ ] Staged rollout (20%, 50%, 100%) - Recommended for first release
  - [ ] Or full release (100%)
- [ ] Click "Review release"
- [ ] Review all information one final time
- [ ] Click "Start rollout to Production"
- [ ] Confirm submission

### Phase 16: Wait for Review

- [ ] Monitor email for review updates
- [ ] Check Play Console daily for status changes
- [ ] Review typically takes 1-7 days
- [ ] If rejected:
  - [ ] Read rejection reason carefully
  - [ ] Fix issues
  - [ ] Resubmit
- [ ] If approved:
  - [ ] Celebrate! 🎉
  - [ ] App will be live within 24 hours

### Phase 17: Post-Launch Monitoring

- [ ] Monitor Play Console dashboard:
  - [ ] Check crash rate (keep below 1%)
  - [ ] Check ANR rate (keep below 0.5%)
  - [ ] Monitor ratings (target 4.0+ stars)
  - [ ] Track installation stats
- [ ] Respond to user reviews:
  - [ ] Thank positive reviews
  - [ ] Address negative feedback
  - [ ] Fix reported bugs
- [ ] Plan for updates:
  - [ ] Increment versionCode for each update
  - [ ] Update versionName semantically (1.0.0 → 1.1.0)
  - [ ] Add meaningful release notes
- [ ] Keep dependencies updated
- [ ] Monitor for security vulnerabilities

## 📊 Progress Tracking

Track your overall progress:

**Phases Completed:** ____ / 17

**Current Phase:** _________________________

**Estimated Time to Launch:** _____________

**Blocker Issues:** _______________________

## 🆘 Need Help?

If you get stuck, refer to:

1. **PLAY_STORE_SUBMISSION_GUIDE.md** - Detailed instructions for each step
2. **QUICK_START_AAB.md** - Build troubleshooting
3. **PLAY_STORE_PACKAGE_SUMMARY.md** - Overview and file locations
4. **Google Play Console Help** - https://support.google.com/googleplay/android-developer
5. **Android Developers** - https://developer.android.com/guide

## 🎯 Success Criteria

Your app is ready for launch when:

- ✅ AAB builds successfully and is signed
- ✅ App installs and runs without crashes
- ✅ All core features work as expected
- ✅ Store listing is complete and accurate
- ✅ Privacy policy is published and accessible
- ✅ Data safety form is complete
- ✅ Internal testing completed successfully (14+ days)
- ✅ Tester feedback is positive
- ✅ All Play Console policies are satisfied
- ✅ No critical warnings in Play Console
- ✅ Keystore is backed up securely

## 🚀 Launch Day!

When your app is approved and live:

1. Share the Play Store link with your users
2. Announce on social media
3. Update your website with the app link
4. Monitor initial reviews and ratings
5. Be ready to respond to user feedback
6. Plan your first update

**Play Store Link Format:**
```
https://play.google.com/store/apps/details?id=com.circuitry3d.app
```

---

**Good luck with your submission!** 🎉

If you complete all items on this checklist, you'll have a successfully published Android app on the Google Play Store!

**Last Updated:** October 25, 2025
