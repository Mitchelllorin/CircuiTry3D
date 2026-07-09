---
description: Launch the CircuiTry3D dev server + open it in a phone-emulated Chrome (Android UA, no DevTools needed)
---

Run the project's mobile dev launcher and report the result. This spares the user
from re-explaining the setup every session.

Steps:
1. Run: `powershell -ExecutionPolicy Bypass -File scripts/launch-mobile.ps1`
   (the Bash tool can invoke it, or use the PowerShell tool directly).
2. The script kills stray node procs, starts `npm run dev -- --host`, waits for
   :3000, then opens a separate Chrome instance with an **Android user-agent +
   touch + a Pixel-sized window** — so the app's `isMobile` check is true and the
   user sees the REAL mobile build without touching DevTools.
3. Report both URLs it prints: the emulated local URL and the LAN URL for a real
   phone. The builder lives at `/#/app` (HashRouter).

Notes:
- The user is blind; the phone / emulated view is ground truth. Co-drive UX/3D one
  testable piece at a time — don't batch-build big changes autonomously.
- If Chrome is already running normally, the isolated `--user-data-dir` profile is
  what makes the Android UA flag actually apply.
