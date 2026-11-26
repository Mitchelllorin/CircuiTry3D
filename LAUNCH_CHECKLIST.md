CircuiTry3D Launch Checklist (Quick Path)
========================================

Purpose
-------
Use this checklist to prepare the app for a fast Play Store launch.
Detailed steps live in:
- SUBMISSION_CHECKLIST.md
- PLAY_STORE_SUBMISSION_GUIDE.md
- QUICK_START_AAB.md


1) Business and Accounts
------------------------
[ ] Confirm legal business name and contact info for listings.
[ ] Create Google Play Developer account ($25 one-time fee).
[ ] Complete developer profile and payment profile.
[ ] Decide if Google Play App Signing will be enabled.
[ ] Confirm support and privacy emails.
[ ] Confirm website domain and privacy policy URL.


2) Compliance and Policy
------------------------
[ ] Publish privacy policy at a public URL.
[ ] Complete Data Safety form using play-store-assets/metadata/data-safety-form.md.
[ ] Complete Content Rating questionnaire.
[ ] Set Target Audience and Content settings.
[ ] Declare Ads status (No).
[ ] Verify child safety / COPPA statements are accurate.


3) Build and Release Readiness
------------------------------
[ ] Install Node.js 18+, Java JDK 17+, Android SDK 35.
[ ] Generate release keystore (local only; never commit).
[ ] Configure android/key.properties with keystore info.
[ ] Bump versionCode and versionName in android/app/build.gradle.
[ ] Build signed AAB (recommended): ./build-android.sh
[ ] Verify AAB path: android/app/build/outputs/bundle/release/app-release.aab
[ ] Verify signing: jarsigner -verify -verbose -certs app-release.aab
[ ] Backup keystore and store passwords in a manager.


4) Store Listing Assets
-----------------------
[ ] Replace placeholder screenshots with real in-app screens.
[ ] Verify icon (512x512) and feature graphic (1024x500).
[ ] Finalize short and full descriptions in play-store-assets/metadata/app-description.md.
[ ] Confirm app name, category, and tags.
[ ] Confirm contact email, phone (optional), and website URL.


5) Internal Testing
-------------------
[ ] Create Internal Testing release in Play Console.
[ ] Upload signed AAB and add release notes.
[ ] Add testers and share the opt-in link.
[ ] Test core flows: launch, builder, save/load, tutorials.
[ ] Fix critical issues and rebuild (increment versionCode).


6) Production Release
---------------------
[ ] Final review of store listing and policy items.
[ ] Create Production release and upload AAB.
[ ] Use staged rollout (20% -> 100%) or full rollout.
[ ] Submit for review and monitor status.


7) Launch and Post-Launch
-------------------------
[ ] Monitor crash and ANR rates after launch.
[ ] Respond to reviews and user feedback.
[ ] Plan first patch update with version bump.
[ ] Keep dependencies and Android target SDK updated.


Contact and URL Review
----------------------
Confirm these files contain the correct business info, emails, and URLs:
[ ] play-store-assets/metadata/privacy-policy.md
[ ] play-store-assets/metadata/data-safety-form.md
[ ] play-store-assets/metadata/app-description.md
[ ] README.md

