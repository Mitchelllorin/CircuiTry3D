# Auto-Publish Setup: Connect GitHub → Google Play Console

> ⚠️ **You must do this on a desktop or laptop computer using a web browser.**
>
> The Google Play Console **Android app** does not include the "Setup" or "API access" sections — they are only available at **https://play.google.com/console** in a desktop browser (Chrome, Firefox, Safari, Edge, etc.).
> If you are currently on your phone, bookmark this page and come back when you're at a computer.

This is a one-time setup. After completing these steps, every merge to `main` will automatically build a signed AAB **and** upload it to your Play Console internal testing track — no manual steps required.

---

## Prerequisites checklist

Before starting, confirm these two things:

- [x] **The app exists in Play Console.** The Google Play API can only publish to an app that already has at least one release uploaded (even a draft). If your app is already in internal testing, this is satisfied ✅
- [ ] **You are on a computer with a web browser.** (See the note above — this cannot be done from the Android app.)

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

> **Tip:** "Setup" in Play Console is *outside* your app, on the main developer home page.

1. Go to **https://play.google.com/console** and sign in.
2. In the **left sidebar** (the very first screen, not inside any app), look for **"Setup"** near the bottom of the sidebar.
   - If you don't see "Setup", click the **≡ hamburger / three-line menu** at the top-left to expand the sidebar.
3. Click **Setup → API access**.

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

A JSON file is **automatically downloaded** to your computer. This is your key — keep it safe.

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
22. Select all the text inside it and copy it (Ctrl+A then Ctrl+C).
23. Go to your GitHub repository: **https://github.com/Mitchelllorin/CircuiTry3D**
24. Click **Settings** (top tab row) → **Secrets and variables** (left sidebar) → **Actions**.
25. Click **"New repository secret"**.
26. **Name:** `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
27. **Secret:** paste the entire JSON text you copied.
28. Click **"Add secret"**.

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
| Using the Play Console **Android app** and can't find "Setup" | The Android app does not have this feature. Open **https://play.google.com/console** in a **desktop browser** on a computer instead. |
| Can't find "Setup" in Play Console sidebar on desktop | You may be inside an app. Click the Play Console logo top-left to go back to the developer home, then look for Setup in the sidebar. |
| "Service accounts" section is empty after linking | Refresh the API access page — it sometimes takes 30 seconds to populate. |
| GitHub Actions step shows "permission denied" error | Go back to Play Console → Setup → API access → Grant access, and make sure the service account has "Release manager" on your app. |
| GitHub Actions step shows "package not found" error | The app must already have at least one release in Play Console (any track) before the API can publish new ones. If your app is already in internal testing, you're fine — this error won't apply to you. |
| Downloaded JSON is empty or very small | You may have downloaded the wrong key type. Delete it, and repeat step 14 selecting **JSON**. |

---

## Related guides

- **Build the AAB:** [QUICK_START_AAB.md](QUICK_START_AAB.md)
- **Upload to Play Store manually:** [UPLOAD_TO_PLAY_STORE.md](UPLOAD_TO_PLAY_STORE.md)
- **Full submission walkthrough:** [PLAY_STORE_SUBMISSION_GUIDE.md](PLAY_STORE_SUBMISSION_GUIDE.md)
