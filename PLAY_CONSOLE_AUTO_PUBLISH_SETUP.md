# Auto-Publish Setup: Connect GitHub → Google Play Console

> 📱 **No computer? You can do this entirely from your Android phone using Chrome.**
>
> The Google Play Console **Android app** does not have the "Setup" or "API access" sections. You must open **https://play.google.com/console** in the **Chrome browser** on your phone instead.
>
> Before you start each website below, tap the **⋮ three-dot menu → "Desktop site"** (or "Request desktop site") in Chrome. This enables all features that would otherwise be hidden on mobile.
>
> The Google Cloud Console and GitHub settings pages also work fine in Chrome on Android with desktop site enabled.

---

## ❓ Common questions before you start

**Q: Is the JSON key file already in this repository?**
No — and it should never be. The JSON key is a private credential that Google generates for you. You have to create it yourself in the Google Cloud Console (Part 3, steps 15–17 below) and it will download to your phone. You then paste it into GitHub Settings as a secret. It never touches this repo.

**Q: Do I need to merge or push this pull request before anything works?**
No. The GitHub Actions workflow that does the publishing already exists on `main`. You just need to add one secret in GitHub Settings (Part 5). You can do that right now without touching any pull request.

**Q: How do I turn on "Desktop site" in Chrome on Android?**
1. Open Chrome and go to the website.
2. Tap the **⋮** (three vertical dots) in the **top-right corner** of Chrome.
3. In the menu that appears, look for **"Desktop site"** — tap it so a ✓ appears next to it.
4. The page will reload. It will look smaller/zoomed-out but all buttons and menus will now be visible.
   - If the page still looks the same, scroll up and try tapping ⋮ again to confirm the checkmark is there.

**Q: I turned on Desktop site but I still can't find "Setup" in Play Console.**
You are probably inside your app's page. You need to be on the **main developer home** — the first screen you see after signing in, before you tap on any app. Look for the **Play Console logo** (top-left) and tap it to go back to the home screen. "Setup" will be in the sidebar near the bottom.

---

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

> **On Android:** Open Chrome → go to **https://play.google.com/console** → tap **⋮ → Desktop site** → sign in.

1. Go to **https://play.google.com/console** and sign in with your Google account.

2. You should see your **developer home page** — a screen that lists your apps (e.g. "CircuiTry3D") and has a left sidebar with menu items.
   - ⚠️ If you're already inside your app (you see sections like "Dashboard", "Release", "Store listing"), tap the **Play Console logo** in the top-left to go back to the home page first.

3. Look in the **left sidebar** for the word **"Setup"** near the bottom of the list.
   - If you see a narrow sidebar with only icons (no text), tap the **≡ three-line icon** at the very top of the sidebar to expand it so the text appears.
   - If you still don't see "Setup", make sure Desktop site is enabled (⋮ → Desktop site ✓ in Chrome).

4. Tap **"Setup"** — a sub-menu will expand showing items like "App signing", "Developer account". Tap **"API access"** from that sub-menu.

✅ **You should now see a page titled "API access"** with text like *"To use the Google Play Developer API, link your account to a Google Cloud project."*
If you see that, you're in the right place. Continue to Part 2.

---

## Part 2 — Link to a Google Cloud Project

On the **API access** page:

5. Scroll down. You will see a section that says **"Google Cloud Project"** or similar, with one of two buttons:
   - **"Link existing project"** — if you already have a Google Cloud project, tap this and select it from the list.
   - **"Create new project"** — if you don't have one (or aren't sure), tap this. Google will create one automatically with a name like "PC API …".
6. Tap **"Save"**.

✅ **After saving, the page will refresh** and show a new section lower down called **"Service accounts"** (it may say "No service accounts" at first — that's fine).

---

## Part 3 — Create a Service Account

Still on **Setup → API access**, scroll down to the **"Service accounts"** section:

7. Tap **"Create new service account"**.
8. A small panel/dialog will appear. It has a blue link that says **"Google Cloud Platform"**. Tap that blue link.
   - This opens the **Google Cloud Console** in a new browser tab.
   - **On Android:** tap **⋮ → Desktop site** again in this new tab before doing anything else.

In the **Google Cloud Console** tab that just opened:

9. You should land on a page titled **"Service accounts"** under **"IAM & Admin"**. Near the top you will see a button **"+ Create service account"**. Tap it.
   - If you don't see that button, make sure Desktop site is on. The URL should contain `console.cloud.google.com`.
10. **Service account name:** type anything you like, e.g. `circuitry3d-publisher`
11. The **"Service account ID"** field will auto-fill. Leave it as-is.
12. Tap **"Create and continue"**.
13. You are now on step 2 of 3: **"Grant this service account access to project"**. Tap the **"Select a role"** dropdown.
    - In the search box that appears, type `Service Account User` and tap it when it appears in the list.
    - Tap **"+ Add another role"**, type `Storage Object Viewer`, and tap it.
    - *(These are minimum required roles. Play Console manages publish permissions separately.)*
14. Tap **"Continue"** → then tap **"Done"**.

✅ You are now back on the **Service accounts list** and should see the account you just created (e.g. `circuitry3d-publisher@…`).

15. On the row for your new service account, tap the **⋮ three-dot menu** on the right side → tap **"Manage keys"**.
16. Tap **"Add key"** → tap **"Create new key"**.
17. Make sure **"JSON"** is selected, then tap **"Create"**.

✅ A JSON file will automatically download to your device. On Android you'll see a **download notification** from Chrome — you can tap it later when you reach Part 5. The file goes to your **Downloads** folder. This is your private key — do not share it.

---

## Part 4 — Grant Play Console Permissions

Switch back to the **Play Console tab** (Setup → API access). If you closed it, go to **https://play.google.com/console** → Setup → API access again.

18. Tap **"Done"** in the small dialog that may still be open, or just refresh the page. Your new service account should now appear in the **"Service accounts"** section.
    - If you don't see it after 30 seconds, tap the browser refresh button.
19. Next to your service account, tap **"Grant access"**.
20. You will land on a **"Invite user"** or **"Add user"** page. Scroll down to **"App permissions"**.
21. Tap **"Add app"** and select **CircuiTry3D** from the list.
22. Under the permissions for CircuiTry3D, set the role to **"Release manager"** (or if you see individual checkboxes under "Releases", tick all of them).
23. Tap **"Apply"** → then tap **"Save changes"** (usually a button at the bottom or top-right).

✅ The service account now has permission to publish to your app.

---

## Part 5 — Add the JSON as a GitHub Secret

> ⚠️ **You do NOT need to merge any pull request to do this step.** Adding the secret goes directly into the repository settings — it takes effect immediately.

24. Open the JSON file you downloaded (it is a text file that starts with `{` and ends with `}`).
    - **On Android:** tap the Chrome download notification, or open your **Files / Downloads** app and tap the `.json` file.
    - If a dialog asks **"Open with"** and the file doesn't open as text, choose **"QuickEdit"**, **"Simple Text Editor"**, **"Gboard"**, or any text editor app you have. If you have none, install **"QuickEdit"** free from the Play Store.
25. Select all the text in the file and copy it.
    - **On Android:** long-press anywhere in the text → tap **"Select all"** (may be under "More") → tap **"Copy"**. The JSON is long — make sure all the text is highlighted (you'll see blue handles at the very top and very bottom of the text).
    - **On a computer:** Ctrl+A then Ctrl+C (Cmd+A / Cmd+C on Mac).
26. Open this direct link to the GitHub Secrets page in Chrome (enable ⋮ → Desktop site):
    **https://github.com/Mitchelllorin/CircuiTry3D/settings/secrets/actions**
    - Alternatively: go to **https://github.com/Mitchelllorin/CircuiTry3D** → tap **"Settings"** (in the row of tabs across the top) → tap **"Secrets and variables"** in the left sidebar → tap **"Actions"**.
27. Tap **"New repository secret"** (green button, top-right area).
28. In the **"Name"** field type exactly: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
29. Tap the large **"Secret"** text box and paste the JSON text you copied (long-press → Paste on Android).
30. Tap **"Add secret"**.

✅ **You're done with setup.** The secret is now saved. No pull request or merge needed.

---

## You're done! ✅

From now on, every time you merge a pull request into `main`, the GitHub Actions workflow will:

1. Build the signed AAB automatically
2. Upload it to your Play Console **internal testing** track automatically

No downloading, no uploading by hand.

### Test it

To trigger a build right now without changing any code:
1. Go to **https://github.com/Mitchelllorin/CircuiTry3D/actions/workflows/build-aab.yml** (enable Desktop site in Chrome if on Android)
2. Tap **"Run workflow"** → make sure the branch is **main** → tap the green **"Run workflow"** button
3. Wait a few minutes, then check **Play Console → Testing → Internal testing** — a new release should appear

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
