# Auto-Publish Setup: Connect GitHub → Google Play Console

> 📱 **No computer? You can do this entirely from your Android phone using Chrome.**
>
> The Google Play Console **Android app** does not have the "Setup" or "API access" sections. You must open **https://play.google.com/console** in the **Chrome browser** on your phone instead.
>
> Before you start each website below, tap the **⋮ three-dot menu → "Desktop site"** (or "Request desktop site") in Chrome. This enables all features that would otherwise be hidden on mobile.
>
> The Google Cloud Console and GitHub settings pages also work fine in Chrome on Android with desktop site enabled.

This is a one-time setup. After completing these steps, every merge to `main` will automatically build a signed AAB **and** upload it to your Play Console internal testing track — no manual steps required.

---

## Prerequisites checklist

Before starting, confirm these two things:

- [x] **The app exists in Play Console.** The Google Play API can only publish to an app that already has at least one release uploaded (even a draft). If your app is already in internal testing, this is satisfied ✅
- [x] **You have a browser that can request desktop site.** Chrome on Android works perfectly — tap ⋮ → "Desktop site" before opening each page below. No computer needed.

---

## What you need to do (overview)

1. Link Play Console to a Google Cloud project
2. Create a service account in that project
3. Download its JSON key
4. Grant the service account permission in Play Console
5. Add the JSON as a GitHub secret

Total time: ~10 minutes

---

## Part 1 — Open API Access in Play Console

> **On Android:** Open Chrome, go to **https://play.google.com/console**, then tap **⋮ → Desktop site** before signing in. This shows the full sidebar including "Setup".
>
> **Tip:** "Setup" in Play Console is *outside* your app, on the main developer home page.

1. Go to **https://play.google.com/console** and sign in.
2. In the **left sidebar** (the very first screen, not inside any app), look for **"Setup"** near the bottom of the sidebar.
   - If you don't see "Setup", tap the **≡ hamburger / three-line menu** at the top-left to expand the sidebar.
3. Tap **Setup → API access**.

You should now be on a page titled **"API access"** that says something like *"To use the Google Play Developer API, link your account to a Google Cloud project."*

---

## Part 2 — Link to a Google Cloud Project

On the **API access** page:

4. If you already have a Google Cloud project you want to use, click **Link existing project** and select it.  
   If not, click **Create a new project** — Google will create one automatically.
5. Click **Save**.

The page will refresh and show a section called **"Service accounts"**.

---

## Part 3 — Create a Service Account

Still on **Setup → API access**, scroll down to the **"Service accounts"** section:

6. Click **"Create new service account"**.
7. A panel opens. Click the blue **"Google Cloud Platform"** link inside it — this opens the Google Cloud Console in a new tab. (Keep the Play Console tab open.)
   - **On Android:** when the new tab opens in Chrome, tap **⋮ → Desktop site** again before proceeding.

In the **Google Cloud Console** tab that just opened:

8. You should land on **IAM & Admin → Service accounts**. Click **"+ Create service account"** near the top.
9. **Service account name:** type anything recognisable, e.g. `circuitry3d-github-publisher`
10. Click **"Create and continue"**.
11. In the **"Grant this service account access to project"** step, click the **"Select a role"** dropdown.
    - Search for **"Service Account User"** and select it.
    - Click **"+ Add another role"**, search for **"Storage Object Viewer"** and select it.
    - *(These are minimum required roles. Play Console manages publish permissions separately in the next step.)*
12. Click **"Continue"** → **"Done"**.

You are now back on the **Service accounts** list. You should see the account you just created.

13. Click the **three-dot menu (⋮)** to the right of the new service account → **"Manage keys"**.
14. Click **"Add key" → "Create new key"**.
15. Select **"JSON"** and click **"Create"**.

A JSON file is **automatically downloaded** to your device. On Android it goes to your **Downloads** folder — you'll also see a notification from Chrome. This is your key — keep it safe.

---

## Part 4 — Grant Play Console Permissions

Go back to the **Play Console tab** (Setup → API access).

16. Click **"Done"** (or refresh the page) — your new service account should now appear in the list.
17. Click **"Grant access"** next to the service account.
18. On the permissions page, under **"App permissions"**, find **CircuiTry3D** and click **"Add app"** if it isn't already listed.
19. Set the permission to **"Release manager"** (or "Releases" → tick all options if shown).
20. Click **"Apply"** → **"Save changes"**.

---

## Part 5 — Add the JSON as a GitHub Secret

21. Open the JSON file you downloaded (it looks like a long block of text starting with `{`).
    - **On Android:** tap the download notification, or open your **Files / Downloads** app and tap the `.json` file. If it doesn't open as text, tap **"Open with…"** and choose a text editor app (e.g. **Gboard**, **QuickEdit**, or any plain-text editor you have installed).
22. Select all the text and copy it.
    - **On Android:** long-press anywhere in the text → tap **"Select all"** → tap **"Copy"**. If "Select all" doesn't appear, try tapping **"More"** in the toolbar. The JSON can be long — make sure you see all of it highlighted before copying.
    - **On a computer:** Ctrl+A then Ctrl+C (Cmd+A / Cmd+C on Mac).
23. Go to your GitHub repository: **https://github.com/Mitchelllorin/CircuiTry3D**
    - **On Android:** open Chrome, enable **⋮ → Desktop site**, then navigate to the URL above.
24. Tap/click **Settings** (top tab row) → **Secrets and variables** (left sidebar) → **Actions**.
25. Tap/click **"New repository secret"**.
26. **Name:** `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
27. **Secret:** paste the entire JSON text you copied (long-press the field → Paste on Android).
28. Tap/click **"Add secret"**.

---

## You're done! ✅

From now on, every time you merge a pull request into `main`, the GitHub Actions workflow will:

1. Build the signed AAB automatically
2. Upload it to your Play Console **internal testing** track automatically

No downloading, no uploading by hand.

### Test it

Merge any change to `main` (or go to **Actions → Build AAB → Run workflow** and select `main`), then open **Play Console → Testing → Internal testing** — a new release should appear within a few minutes.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Using the Play Console **Android app** and can't find "Setup" | The Android app does not have this feature. Open **https://play.google.com/console** in **Chrome on your phone**, then tap **⋮ → Desktop site** to get the full interface including "Setup". |
| Can't find "Setup" in Play Console sidebar | You may be inside an app, or desktop site mode may be off. Tap the Play Console logo top-left to return to the developer home. On Android, confirm **⋮ → Desktop site** is ticked in Chrome. |
| "Service accounts" section is empty after linking | Refresh the API access page — it sometimes takes 30 seconds to populate. |
| GitHub Actions step shows "permission denied" error | Go back to Play Console → Setup → API access → Grant access, and make sure the service account has "Release manager" on your app. |
| GitHub Actions step shows "package not found" error | The app must already have at least one release in Play Console (any track) before the API can publish new ones. If your app is already in internal testing, you're fine — this error won't apply to you. |
| Can't find the downloaded JSON on Android | Open your **Files** app → **Downloads**, or pull down the notification shade — Chrome shows a download notification you can tap to open it. |
| Downloaded JSON is empty or very small | You may have downloaded the wrong key type. Delete it, and repeat step 14 selecting **JSON**. |

---

## Related guides

- **Build the AAB:** [QUICK_START_AAB.md](QUICK_START_AAB.md)
- **Upload to Play Store manually:** [UPLOAD_TO_PLAY_STORE.md](UPLOAD_TO_PLAY_STORE.md)
- **Full submission walkthrough:** [PLAY_STORE_SUBMISSION_GUIDE.md](PLAY_STORE_SUBMISSION_GUIDE.md)
