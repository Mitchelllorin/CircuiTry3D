CircuiTry3D iOS Readiness Checklist (Capacitor)
===============================================

Purpose
-------
Use this checklist to make the app iOS friendly and ready for
submission to the Apple App Store using Capacitor.


1) iOS Platform Setup
---------------------
[ ] Install Xcode (latest stable) on macOS.
[ ] Install Apple Developer account (enrolled, paid).
[ ] Add iOS platform: npx cap add ios
[ ] Sync assets: npx cap sync ios
[ ] Open the workspace: ios/App/App.xcworkspace


2) App Identity and Signing
---------------------------
[ ] Set Bundle ID (e.g., com.circuitry3d.app).
[ ] Set Display Name (CircuiTry3D).
[ ] Set Version and Build numbers.
[ ] Select Team and enable automatic signing.
[ ] Configure App ID and provisioning profile in Apple Developer portal.
[ ] Add capabilities only if needed (e.g., IAP, Sign In with Apple).


3) iOS UI and UX Compatibility
------------------------------
[ ] Verify layouts with safe areas (notches, home indicator).
[ ] Test on iPhone and iPad screen sizes.
[ ] Check orientation behavior (portrait/landscape).
[ ] Validate touch targets and gesture conflicts.
[ ] Review iOS keyboard behavior and input focus.
[ ] Confirm performance is acceptable on older devices.


4) Permissions and Privacy
--------------------------
[ ] Add Info.plist usage strings for features actually used.
[ ] Ensure no unused permissions are requested.
[ ] Map data collection to App Store "App Privacy" sections.
[ ] Host and verify a public privacy policy URL.
[ ] Verify account deletion and data request flow works.


5) Build and Archive
--------------------
[ ] Build a release configuration in Xcode.
[ ] Archive the app in Xcode (Product -> Archive).
[ ] Validate the archive in Xcode Organizer.
[ ] Upload build to App Store Connect.


6) TestFlight
------------
[ ] Create internal TestFlight group.
[ ] Invite testers and distribute build.
[ ] Test core flows: launch, builder, save/load, tutorials.
[ ] Fix any critical issues and upload a new build.


7) App Store Listing Assets
---------------------------
[ ] App icon (1024x1024 PNG).
[ ] iPhone screenshots (required).
[ ] iPad screenshots (if supporting iPad).
[ ] App name, subtitle, and description finalized.
[ ] Keywords, support URL, and marketing URL confirmed.


8) App Review Submission
------------------------
[ ] Complete App Store Connect metadata.
[ ] Answer App Review questions and notes.
[ ] Submit for review.
[ ] Monitor review status and respond if rejected.


Where to Update in the Repo
---------------------------
- capacitor.config.json (appId, appName)
- ios/App/App/Info.plist (usage strings, display name)
- ios/App/App.xcodeproj (signing, bundle id, build number)

