# launch-mobile.ps1 — one-shot mobile dev launcher for CircuiTry3D.
#
# Why this exists: the app decides "mobile" from the user-agent / touch
# (legacy.html `isMobile`), NOT window width. A skinny desktop window gives the
# desktop layout squeezed. And DevTools Device Mode needs sighted clicks. So this
# launches a SEPARATE Chrome instance with an Android UA + a phone-sized window,
# which flips isMobile true with zero DevTools fiddling.
#
# What it does:
#   1. Kills stray node procs (they keep grabbing :3000).
#   2. Starts `npm run dev -- --host` in the background.
#   3. Waits for :3000 to answer.
#   4. Opens Chrome (isolated profile) at /#/app with an Android UA + touch,
#      sized like a Pixel, so you see the REAL mobile build.
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\launch-mobile.ps1
# The phone URL is printed too, in case you'd rather use a real device.

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$port = 3000
$appPath = '/#/app'

Write-Host '==> Clearing stray node processes...'
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host '==> Starting Vite dev server (npm run dev -- --host)...'
Push-Location $projectRoot
Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev','--','--host' -WindowStyle Hidden
Pop-Location

Write-Host "==> Waiting for http://localhost:$port ..."
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$port/" -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -ge 200) { $ready = $true; break }
    } catch { Start-Sleep -Milliseconds 500 }
}
if (-not $ready) {
    Write-Host 'Dev server did not come up in time. Check the npm output and retry.' -ForegroundColor Red
    exit 1
}

# LAN URL for a real phone (same Wi-Fi), in case you want it.
$lan = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.254\.' } |
    Select-Object -First 1 -ExpandProperty IPAddress)

$localUrl = "http://localhost:$port$appPath"
Write-Host ''
Write-Host "==> Dev server ready." -ForegroundColor Green
Write-Host "    Emulated (this machine): $localUrl"
if ($lan) { Write-Host "    Real phone (same Wi-Fi):  http://${lan}:$port$appPath" }
Write-Host ''

# Launch Chrome as a separate, isolated instance so the Android UA flag actually
# takes effect (a UA flag is ignored if it just attaches to your normal Chrome).
$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) { $chrome = "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe" }
if (-not (Test-Path $chrome)) {
    Write-Host "Chrome not found; open this URL in your browser's device mode:`n  $localUrl" -ForegroundColor Yellow
    exit 0
}

$profileDir = Join-Path $env:TEMP 'circuitry3d-mobile-profile'
# Pixel-8-ish Android UA -> isAndroid -> isMobile === true.
$ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'

Write-Host '==> Opening Chrome in mobile mode (Android UA + touch + phone window)...'
$chromeArgs = @(
    "--user-data-dir=$profileDir",
    "--user-agent=$ua",
    '--window-size=412,915',
    '--window-position=60,40',
    '--touch-events=enabled',
    '--no-first-run',
    '--no-default-browser-check',
    "--app=$localUrl"
)
# Start-Process so this script returns immediately instead of blocking on Chrome.
Start-Process -FilePath $chrome -ArgumentList $chromeArgs

Write-Host 'Done. Close that Chrome window when finished; the dev server keeps running.'
