import fs from 'node:fs/promises';
import path from 'node:path';

import { PREVIEWS_ROOT } from '../utils/constants.js';
import { buildPreviewFallbackHtml } from '../utils/preview-fallback.js';
import { normalizePreviewSegment, pathExists, sanitizeRelativePath } from '../utils/files.js';
import { sendText, serveFile } from '../utils/http.js';

function hasFileExtension(targetPath) {
  return path.posix.basename(targetPath).includes('.');
}

export async function handlePreviewRoute(req, res) {
  if (!req.url) {
    return false;
  }

  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  if (!pathname.startsWith('/previews/')) {
    return false;
  }

  const segments = pathname.split('/').filter(Boolean);

  if (segments.length < 3) {
    sendText(res, 400, 'Preview URLs must include a repository and PR number.');
    return true;
  }

  const repoKey = normalizePreviewSegment(segments[1]);
  const prNumber = normalizePreviewSegment(segments[2]);
  const previewRoot = path.join(PREVIEWS_ROOT, repoKey, prNumber);

  if (!(await pathExists(previewRoot))) {
    sendText(res, 404, 'Preview not found.');
    return true;
  }

  const rootIndexPath = path.join(previewRoot, 'index.html');
  const hasRootIndex = await pathExists(rootIndexPath);
  const relativeRequestPath = segments.slice(3).join('/');
  const sanitizedRequestPath = relativeRequestPath ? sanitizeRelativePath(relativeRequestPath) : '';
  const targetPath = sanitizedRequestPath ? path.join(previewRoot, sanitizedRequestPath) : previewRoot;

  if (!sanitizedRequestPath && hasRootIndex) {
    await serveFile(res, rootIndexPath);
    return true;
  }

  if (sanitizedRequestPath && (await pathExists(targetPath))) {
    const stats = await fs.stat(targetPath);

    if (stats.isDirectory()) {
      const directoryIndexPath = path.join(targetPath, 'index.html');

      if (await pathExists(directoryIndexPath)) {
        await serveFile(res, directoryIndexPath);
        return true;
      }

      const html = await buildPreviewFallbackHtml({
        repo: repoKey,
        prNumber,
        requestedPath: `/${sanitizedRequestPath}/`,
        previewRoot,
        currentDirectory: targetPath,
        basePath: `/previews/${repoKey}/${prNumber}`,
      });
      sendText(res, 200, html, 'text/html; charset=utf-8');
      return true;
    }

    await serveFile(res, targetPath);
    return true;
  }

  if (hasRootIndex && (!sanitizedRequestPath || !hasFileExtension(sanitizedRequestPath))) {
    await serveFile(res, rootIndexPath);
    return true;
  }

  const currentDirectory = sanitizedRequestPath && !hasFileExtension(sanitizedRequestPath)
    ? path.join(previewRoot, sanitizedRequestPath)
    : previewRoot;

  const html = await buildPreviewFallbackHtml({
    repo: repoKey,
    prNumber,
    requestedPath: pathname,
    previewRoot,
    currentDirectory: (await pathExists(currentDirectory)) ? currentDirectory : previewRoot,
    basePath: `/previews/${repoKey}/${prNumber}`,
  });
  sendText(res, 200, html, 'text/html; charset=utf-8');
  return true;
}
