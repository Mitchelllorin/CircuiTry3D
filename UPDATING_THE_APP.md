# Updating CircuiTry3D on Google Play

## Do I upload a new AAB every time I update the app?

**Yes** — every time you want users to get a new version, you upload a new AAB.  
That is how Android app updates work on the Play Store.

## Do I have to go through the whole setup process every time?

**No.** The lengthy setup steps only happen **once**:

| Task | One-time or every update? |
|---|---|
| Create the app in Play Console | ✅ One-time |
| Set up the signing key / keystore | ✅ One-time |
| Store listing (name, description, icon, screenshots) | ✅ One-time (edit anytime, but not required) |
| Data safety form | ✅ One-time (update only if data practices change) |
| Privacy policy URL | ✅ One-time |
| Content rating | ✅ One-time |
| GitHub Actions secret (`ANDROID_STORE_PASSWORD`) | ✅ One-time |
| **Upload a new AAB** | 🔁 Every update |
| **Increment `versionCode`** | 🔁 Every update |

---

## The 3-step update checklist

Every time you update the app, do **only** these three things:

### Step 1 — Bump the version number

Open `android/app/build.gradle` and increment `versionCode` by 1.  
Also update `versionName` to reflect the new version.

```
// Before
versionCode 2
versionName "1.0.1"

// After (example)
versionCode 3
versionName "1.0.2"
```

Commit and push this change to the `main` branch.

> ⚠️ **Why you must do this:** Google Play rejects any AAB whose `versionCode` is the same
> as — or lower than — a previously processed bundle. Even a failed upload consumes the number.

### Step 2 — Build the new AAB

1. Go to **Actions → Build AAB** in the GitHub repository:  
   `https://github.com/Mitchelllorin/CircuiTry3D/actions/workflows/build-aab.yml`
2. Click **Run workflow** → select branch **`main`** → click **Run workflow**.
3. Wait ~3 minutes for the workflow to finish.
4. Download **`app-release-aab`** from the **Artifacts** section of the completed run.
5. Unzip it to get `app-release.aab`.

### Step 3 — Upload to Play Console

1. Go to `https://play.google.com/console` and open **CircuiTry3D**.
2. In the left sidebar, choose where to release:
   - **Testing → Internal testing** — for testing before going live
   - **Production** — to release to all users
3. Click **Create new release**.
4. Under **App bundles**, click **Upload** and select your new `app-release.aab`.
5. Write brief **Release notes** (what changed in this version).
6. Click **Save** → **Review release** → **Start rollout**.

That's it. No store listing changes required, no data safety re-submission, no new signing keys.

---

## What about Google's review?

| Release track | Review needed? | Typical wait |
|---|---|---|
| Internal testing | No | Instant (a few minutes to process) |
| Closed / Open testing | No | Instant |
| Production | Yes | 1–3 days |

So if you just want to test a new build yourself, use Internal testing — it shows up in minutes.  
Only production releases go through Google's review queue.

---

## Quick reference

- Current `versionCode`: defined in `android/app/build.gradle`
- Build AAB: `https://github.com/Mitchelllorin/CircuiTry3D/actions/workflows/build-aab.yml`
- Play Console: `https://play.google.com/console`
- Package name: `com.circuitry3d.app`

---

## Related guides

- First-time upload walkthrough: [`UPLOAD_TO_PLAY_STORE.md`](UPLOAD_TO_PLAY_STORE.md)
- Building the AAB in detail: [`QUICK_START_AAB.md`](QUICK_START_AAB.md)
- Full submission guide: [`PLAY_STORE_SUBMISSION_GUIDE.md`](PLAY_STORE_SUBMISSION_GUIDE.md)
