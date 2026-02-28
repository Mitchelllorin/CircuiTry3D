# I Have the AAB — What Do I Do Now?

This is the short version. You downloaded the AAB. Here's exactly what happens next.

---

## Step 0 — Did you already upload it?

Open Play Console and check:

1. Go to **https://play.google.com/console**
2. Click **CircuiTry3D** in your app list
3. In the left sidebar, go to **Testing → Internal testing**

| What you see | What it means |
|---|---|
| A release listed with your AAB | ✅ Already uploaded — skip to [Step 3](#step-3--complete-the-store-listing) |
| "Create new release" button only | ❌ Not uploaded yet — start at [Step 1](#step-1--upload-the-aab) |
| App not in the list at all | ❌ App not created yet — start at [Create the app](#create-the-app-first-if-needed) |

---

## Create the App First (if needed)

If CircuiTry3D doesn't appear in Play Console yet:

1. Click **Create app**
2. App name: `CircuiTry3D`
3. Default language: `English (United States)`
4. App type: `App` | Free or paid: `Free`
5. Check both declarations → **Create app**

Then continue to Step 1.

---

## Step 1 — Upload the AAB

1. In Play Console, go to **Testing → Internal testing**
2. Click **Create new release**
3. Under **App bundles**, click **Upload**
4. Select your `app-release.aab` file
5. Wait for it to process (1–3 minutes)
6. In the **Release notes** box, paste:
   ```
   Initial release of CircuiTry3D — 3D interactive circuit builder with Ohm's law visualization.
   ```
7. Click **Save** → **Review release** → **Start rollout to Internal testing**

> **If you see an error about the version code already being used**, you uploaded this AAB before. Go to Step 3.

---

## Step 2 — Add Testers (for Internal Testing)

1. In Internal testing, click the **Testers** tab
2. Click **Create email list** → name it `Internal Testers`
3. Add your own email (and any others you want to test)
4. Click **Save**
5. Copy the **opt-in URL** and open it on your Android phone to install the test build

---

## Step 3 — Complete the Store Listing

Before submitting for production, these sections must be filled in. Check each one in the left sidebar of Play Console:

| Section | What to do | Status |
|---|---|---|
| **Main store listing** | App name, descriptions, icon, screenshots | Required |
| **App access** | Select "All functionality available" | Required |
| **Ads** | Select "No ads" | Required |
| **Content rating** | Complete the questionnaire (pick "Utility/Productivity") | Required |
| **Target audience** | Set age 13+ | Required |
| **Data safety** | Complete the form (see `play-store-assets/metadata/data-safety-form.md`) | Required |
| **Privacy policy** | Enter a public URL to your privacy policy | Required |

### Store listing content (copy-paste ready)

**App name:** `CircuiTry3D`

**Short description (80 chars):**
```
3D interactive circuit builder with real-time Ohm's law visualization
```

**Full description:** Copy from `play-store-assets/metadata/app-description.md`

**App icon:** `play-store-assets/icons/app-icon-512.png` (512×512 PNG)

**Feature graphic:** `play-store-assets/graphics/feature-graphic.png` (1024×500 PNG)

**Phone screenshots:** `play-store-assets/screenshots/phone-screenshot-1.png` through `phone-screenshot-4.png`

---

## Step 4 — Submit for Production

Once internal testing is done and the store listing is complete:

1. In Play Console, go to **Production** in the left sidebar
2. Click **Create new release**
3. Click **Add from library** (reuse the same AAB you already uploaded, or upload a new one)
4. Add release notes, click **Review release**
5. Click **Start rollout to Production**

> Google's review typically takes **1–3 days**. You'll get an email when it's approved.

---

## Quick Reference: Play Console URL

```
https://play.google.com/console
```

Your app's package name: `com.circuitry3d.app`

After approval, your Play Store listing will be at:
```
https://play.google.com/store/apps/details?id=com.circuitry3d.app
```

---

## Uploading a New AAB Later

Each time you want to update the app:

1. Increment `versionCode` (e.g., `1` → `2`) in `android/app/build.gradle`
2. Re-run the **Build AAB** GitHub Actions workflow (or local build)
3. Upload the new AAB to Play Console as a new release

---

## More Detail

- Full submission walkthrough: [`PLAY_STORE_SUBMISSION_GUIDE.md`](PLAY_STORE_SUBMISSION_GUIDE.md)
- Full checklist with every sub-step: [`SUBMISSION_CHECKLIST.md`](SUBMISSION_CHECKLIST.md)
- Rebuilding the AAB: [`QUICK_START_AAB.md`](QUICK_START_AAB.md)
