# Standalone PR Preview Tool

## Overview

This repository now includes a fully self-hosted PR preview system that does not depend on GitHub Pages, GitHub Actions, Vercel, Netlify, or any hosted CI/CD service.

- Preview server entrypoint: `node server.js`
- Preview uploads: `node tools/upload-preview.js`
- PR comment updates: `node tools/post-preview-comment.js`

Every preview is stored under:

```text
/previews/{repo}/{pr-number}/
```

and served from:

```text
http://localhost:5050/previews/{repo}/{pr-number}/
```

## Folder Structure

```text
/preview-server/
  server.js
  routes/
  utils/
  public-dashboard/

/tools/
  upload-preview.js
  post-preview-comment.js
  preview-common.js

/previews/
PREVIEW.md
server.js
```

## Setup Instructions

1. Install project dependencies if the repository needs a build step:

   ```bash
   npm install
   ```

2. Start the preview server:

   ```bash
   node server.js
   ```

3. Open the dashboard:

   ```text
   http://localhost:5050/
   ```

## How to Run the Preview Server

From the repository root:

```bash
node server.js
```

The server:

- serves the dashboard at `/`
- accepts uploads at `/api/previews/:repo/:pr/upload`
- serves previews at `/previews/:repo/:pr/`
- stores uploaded previews on disk in `/previews`

## How to Upload Previews

### Automatic CLI upload

Run:

```bash
node tools/upload-preview.js
```

What the script does:

1. Detects the current repository from `git remote origin`
2. Detects the PR number from:
   - `PREVIEW_PR_NUMBER`
   - the current branch name (for branches like `pr-123` or `pull/123`)
   - `gh pr view`
   - the GitHub API for the current branch
3. Runs the project build if a `build` script exists
4. Finds preview output automatically (`dist`, `build`, `out`, `public`, `.output/public`, `storybook-static`)
5. Falls back to packaging the repository itself if no build output exists
6. Uploads the packaged preview to the preview server
7. Prints the final preview URL

### Useful environment variables

| Variable | Purpose |
|---|---|
| `PREVIEW_SERVER_URL` | Override the preview server URL. Default: `http://localhost:5050` |
| `PREVIEW_PR_NUMBER` | Force the PR number when auto-detection is not possible |
| `PREVIEW_BUILD_COMMAND` | Override the build command |
| `PREVIEW_OUTPUT_DIR` | Override the directory that should be packaged and uploaded |

### Manual dashboard upload

Use the dashboard upload form at `http://localhost:5050/` to upload:

- a `.zip`, `.tar`, or `.tar.gz` artifact
- a single file
- a full folder / static build directly from your browser

## How to Comment on PRs

Set a personal access token first:

```bash
export PREVIEW_GITHUB_TOKEN=YOUR_TOKEN
```

Then run:

```bash
node tools/post-preview-comment.js
```

The comment script:

- detects the repository and PR automatically
- builds the preview URL from the same repo + PR path
- creates a PR comment if one does not exist
- updates the existing preview comment if it already exists

Optional override:

```bash
export PREVIEW_URL=https://preview.example.com/previews/CircuiTry3D/123/
```

## How to Deploy the Server to a VPS

1. Copy this repository to your server.
2. Install Node.js 20+.
3. Start the server inside a persistent process manager such as `systemd`, `tmux`, or `screen`:

   ```bash
   node server.js
   ```

4. Put a reverse proxy such as Nginx or Caddy in front of port `5050` if you want HTTPS or a public hostname.
5. Point `PREVIEW_SERVER_URL` on your local machine to the public server URL before running uploads.

## Example Preview URLs

```text
http://localhost:5050/previews/CircuiTry3D/123/
http://preview.example.com/previews/my-api/45/
```

## Cleanup Script

Remove previews older than 30 days:

```bash
node preview-server/utils/cleanup.js
```

Dry run:

```bash
node preview-server/utils/cleanup.js --dry-run
```

Delete a specific preview:

```bash
node preview-server/utils/cleanup.js --repo=CircuiTry3D --pr=123 --days=0
```

## Troubleshooting

### The PR number is not detected

- Set `PREVIEW_PR_NUMBER` manually
- Make sure the current branch is connected to a GitHub pull request
- Install GitHub CLI if you want `gh pr view` detection

### The preview uploads but shows a file browser

That means the upload does not contain a root `index.html`. This is expected for backend or non-static projects. The preview server still provides a working artifact browser for the PR.

### The wrong build output is uploaded

Set:

```bash
export PREVIEW_OUTPUT_DIR=path/to/output
```

### The comment script fails

- Verify `PREVIEW_GITHUB_TOKEN`
- Make sure the token can read and write pull request comments
- Make sure the current Git remote points at a GitHub repository
