import path from 'node:path';

import {
  buildPreviewUrl,
  choosePreviewSource,
  createTarGzBuffer,
  detectPrNumber,
  getGitContext,
  getPreviewServerBaseUrl,
  runBuildIfNeeded,
} from './preview-common.js';

async function main() {
  const context = await getGitContext();
  const prNumber = await detectPrNumber(context);

  if (!prNumber) {
    throw new Error('Unable to detect the current PR number. Set PREVIEW_PR_NUMBER and try again.');
  }

  const { buildCommand, ranBuild } = await runBuildIfNeeded(context.cwd);
  const sourcePath = await choosePreviewSource(context.cwd);
  const archiveBuffer = await createTarGzBuffer(sourcePath);
  const serverBaseUrl = getPreviewServerBaseUrl();
  const artifactName = `${context.repoKey}-pr-${prNumber}.tar.gz`;
  const uploadUrl = `${serverBaseUrl.replace(/\/+$/, '')}/api/previews/${encodeURIComponent(
    context.repoKey,
  )}/${encodeURIComponent(prNumber)}/upload?filename=${encodeURIComponent(artifactName)}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/octet-stream',
      'x-preview-branch': context.branch,
      'x-preview-repo-display': context.repoName,
      'x-preview-remote-url': context.remoteUrl,
    },
    body: archiveBuffer,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Preview upload failed: ${response.status} ${details}`);
  }

  const payload = await response.json();
  const previewUrl = payload.preview?.previewUrl || buildPreviewUrl(serverBaseUrl, context.repoKey, prNumber);

  console.log(`Repository: ${context.repoName}`);
  console.log(`PR: #${prNumber}`);
  console.log(`Source: ${path.relative(context.cwd, sourcePath) || '.'}`);
  if (ranBuild) {
    console.log(`Build: ${buildCommand}`);
  } else {
    console.log('Build: skipped (no build command detected)');
  }
  console.log(`Preview URL: ${previewUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
