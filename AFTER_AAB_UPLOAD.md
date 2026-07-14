# ✅ You Uploaded the AAB — Here's What to Do Next

You've uploaded the AAB to Google Play Console. Below are the exact steps to get CircuiTry3D live on the Play Store.

---

## 1 — Add Testers (Internal Testing)

Your AAB is sitting in the **Internal testing** track. Before you can submit to production, you should test it.

1. In Play Console, go to **Testing → Internal testing**
2. Click the **Testers** tab
3. Click **Create email list** → name it `Internal Testers`
4. Add your own email address (plus anyone else who'll test)
5. Click **Save**
6. Copy the **opt-in URL** shown on that page
7. Open the opt-in URL on an Android phone → accept the invitation → install from Play Store

> 💡 You can skip formal 14-day testing and go straight to production if you're confident the app works. Just complete the store listing first (Step 2).

---

## 2 — Complete the Store Listing

Play Console will block production submission until these sections are filled in. Check each one in the left sidebar:

| Section | What to enter | Status |
|---|---|---|
| **Main store listing** | App name, descriptions, icon, screenshots | ⬜ Required |
| **App access** | Select "All functionality available" | ⬜ Required |
| **Ads** | Select "No ads" | ⬜ Required |
| **Content rating** | Complete questionnaire → choose "Utility/Productivity" → all No's → submit | ⬜ Required |
| **Target audience** | Age 13+ | ⬜ Required |
| **Data safety** | Complete the form (guide: `play-store-assets/metadata/data-safety-form.md`) | ⬜ Required |
| **Privacy policy** | Paste in a public URL pointing to your privacy policy | ⬜ Required |

### Copy-paste content for the store listing

**App name:**
```
CircuiTry3D
```

**Short description (80 chars max):**
```
3D interactive circuit builder with real-time Ohm's law visualization
```

**Full description:** copy from `play-store-assets/metadata/app-description.md`

**App icon:** `play-store-assets/icons/app-icon-512.png` (512×512 PNG)

**Feature graphic:** `play-store-assets/graphics/feature-graphic.png` (1024×500 PNG)

**Phone screenshots:** `play-store-assets/screenshots/phone-screenshot-1.png` → `phone-screenshot-4.png`

---

## 3 — Publish Your Privacy Policy

Google requires a publicly accessible privacy policy URL.

**Quickest option — GitHub Pages:**

1. Go to your repository **Settings → Pages**
2. Set source to branch `main`, folder `/docs`
3. Create `docs/privacy-policy.md` (copy content from `play-store-assets/metadata/privacy-policy.md`)
4. Your URL will be: `https://YOUR_GITHUB_USERNAME.github.io/CircuiTry3D/privacy-policy`
   (replace `YOUR_GITHUB_USERNAME` with your actual GitHub username)

Enter that URL in Play Console under **Store listing → Privacy policy**.

---

## 4 — Submit for Production

Once every section in Step 2 shows a green check mark in Play Console:

1. In Play Console, go to **Production** in the left sidebar
2. Click **Create new release**
3. Click **Add from library** (reuses the AAB you already uploaded — no re-upload needed)
4. Paste release notes:
   ```
   Initial release of CircuiTry3D — 3D interactive circuit builder with Ohm's law visualization.
   ```
5. Click **Save** → **Review release** → **Start rollout to Production**

> 📬 Google's review typically takes **1–3 days**. You'll receive an email when approved.

---

## 5 — After Approval

Once Google approves the app:

- Your Play Store listing will be live at:
  ```
  https://play.google.com/store/apps/details?id=com.circuitry3d.app
  ```
  (The package name `com.circuitry3d.app` is set in `capacitor.config.json` — verify it matches what Play Console shows.)
- Share the link with users, post it on social media, and add it to your website.
- Monitor **Android vitals** in Play Console (crashes, ANRs, ratings).
- Respond to user reviews promptly.

---

## Releasing Future Updates

For each new version:

1. Increment `versionCode` (e.g., `1` → `2`) and `versionName` (e.g., `"1.0.0"` → `"1.1.0"`) in `android/app/build.gradle`
2. Re-run the **Build AAB** GitHub Actions workflow to get a new signed AAB
3. In Play Console, create a new release in the **Production** track and upload the new AAB

---

## Need More Detail?

| Document | Contents |
|---|---|
| [`UPLOAD_TO_PLAY_STORE.md`](UPLOAD_TO_PLAY_STORE.md) | Upload walkthrough & store listing copy-paste |
| [`PLAY_STORE_SUBMISSION_GUIDE.md`](PLAY_STORE_SUBMISSION_GUIDE.md) | Detailed step-by-step for every Play Console section |
| [`SUBMISSION_CHECKLIST.md`](SUBMISSION_CHECKLIST.md) | Full checklist with every sub-step |
| [`QUICK_START_AAB.md`](QUICK_START_AAB.md) | Rebuilding the AAB |
