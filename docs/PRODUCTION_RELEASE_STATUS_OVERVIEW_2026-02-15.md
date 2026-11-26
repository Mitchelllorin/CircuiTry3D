# Production Release Status Overview (2026-02-15)

Snapshot generated: 2026-02-15 (UTC)

## Executive summary

- `main` is currently deployed to production successfully.
- Latest `main` SHA: `cd04842fdb619bfa1fd8395bede6c5ed7cbe7f93`
- Production signal: GitHub status context `Vercel = success` (updated `2026-02-15T04:57:16Z`)
- Current working branch (`cursor/production-release-status-overview-a219`) is in sync with `origin/main` (`0 ahead / 0 behind`).

In short: production is caught up with `main`. The remaining work is the unmerged backlog.

## What is not in main (and therefore not in production)

### Open PR backlog (base: `main`)

- Total open PRs: **96**
- Draft PRs: **57**
- Ready-for-review PRs: **39**
- Clean merge state: **12**
- Conflicted merge state (`DIRTY`): **84**
- Stale >30 days: **74**
- Stale >90 days: **50**
- Active in last 7 days: **14**

Interpretation:
- The biggest bottleneck is merge conflicts and stale PR accumulation, not deployment.

### Merge-ready PRs now (non-draft + clean)

Only two PRs are immediately mergeable as-is:

1. **#396** `cursor/arena-ui-workspace-integration-638a`  
   Title: *Arena UI workspace integration*  
   - Mergeable: `MERGEABLE`
   - Checks: Vercel + CodeRabbit successful
   - Updated: `2026-02-15T05:11:50Z`

2. **#274** `agent-with-monetization-strategy-d520`  
   Title: *Launch Plan for Circuitry3D on Playstore with Monetization Strategy*  
   - Mergeable: `MERGEABLE`
   - Checks: successful at time of last update
   - Updated: `2025-12-21T01:29:44Z` (stale)

### Ready but blocked by conflicts (non-draft + dirty)

There are **37** non-draft PRs blocked by merge conflicts. Most recently active:

- #387 `cursor/2d-schematic-symbols-alignment-a911`
- #385 `cursor/library-symbol-visual-accuracy-2499`
- #388 `cursor/schematic-symbols-accuracy-58ca`
- #376 `agent-ui-for-seamless-navigation-a125`
- #374 `agent-and-full-mode-specification-009d`
- #368 `agent-and-bb-red-battery-symbol-8a36`
- #360 `agent-netlify-production-build-55ef`
- #359 `agent-green-wire-for-circuit-look-a9b7`
- #347 `cursor/production-deployment-issues-f1b2`

## Branch inventory risk

- Remote branches (excluding `main`): **422**
- Remote branches not merged into `main`: **108**
- Unmerged branches with no open PR: **14**

Unmerged branches without open PR:

- `copilot/create-pull-request`
- `copilot/prepare-app-for-play-store`
- `cursor/3d-thumbnails-appearance-35b4`
- `cursor/battery-edit-menu-question-mark-07ba`
- `cursor/circuitry3d-gamification-1554`
- `cursor/component-card-layout-adjustment-bd72`
- `cursor/enhance-circuit-wiring-and-visualization-c82f`
- `cursor/fix-prototype-code-4bb8`
- `cursor/migrate-circuitry3d-to-react-native-expo-1b75`
- `cursor/refactor-and-deploy-circuitry3d-codebase-eb8c`
- `cursor/ui-and-logo-standardization-9c1f`
- `pr-119`
- `pr-180`
- `pr74`

These should be triaged (open PR, merge, archive, or delete) to reduce hidden backlog.

## What is left to do (priority order)

1. **Merge the only fresh merge-ready PR (`#396`)** and verify post-merge production status on `main`.
2. **Decide on stale merge-ready PR (`#274`)**: merge (if still relevant) or close.
3. **Rebase/resolve conflicts for the top active dirty PRs** (#387, #385, #388 first).
4. **Close or archive stale PRs older than 90 days** that are no longer relevant.
5. **Triage 14 unmerged branches with no open PR** to prevent lost work and branch sprawl.
6. **Adopt a release train cadence** (small batch merges to `main` + immediate deploy verification) to avoid conflict pile-up.

## Verification commands used

- `gh pr list --base main --state open ...`
- `gh pr view <number> --json ...`
- `gh api repos/<owner>/<repo>/branches/main`
- `gh api repos/<owner>/<repo>/commits/<sha>/status`
- `git branch -r --no-merged origin/main`
- `git rev-list --left-right --count origin/main...HEAD`

