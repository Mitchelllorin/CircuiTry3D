import fs from 'node:fs/promises';
import path from 'node:path';

import { extractUploadBuffer } from '../utils/archive.js';
import { MAX_UPLOAD_BYTES, PREVIEWS_ROOT } from '../utils/constants.js';
import {
  emptyDirectory,
  normalizePreviewSegment,
  pathExists,
  writeUploadedFiles,
  walkDirectory,
} from '../utils/files.js';
import { getRequestOrigin, readJsonBody, readRequestBody, sendJson } from '../utils/http.js';
import { listPreviewMetadata, upsertPreviewMetadata } from '../utils/metadata.js';

function buildPreviewUrl(origin, repoKey, prNumber) {
  return `${origin}/previews/${encodeURIComponent(repoKey)}/${encodeURIComponent(prNumber)}/`;
}

function toApiEntry(entry, origin) {
  return {
    ...entry,
    previewUrl: buildPreviewUrl(origin, entry.repoKey, entry.prNumber),
  };
}

async function savePreview({ req, repoParam, prParam }) {
  const repoKey = normalizePreviewSegment(repoParam);
  const prNumber = normalizePreviewSegment(prParam);
  const previewDirectory = path.join(PREVIEWS_ROOT, repoKey, prNumber);

  await emptyDirectory(previewDirectory);

  const contentType = String(req.headers['content-type'] || '');
  const uploadedAt = new Date().toISOString();
  let artifactName = 'upload';
  let uploadMode = 'files';
  let writeResult;

  if (contentType.includes('application/json')) {
    const payload = await readJsonBody(req, MAX_UPLOAD_BYTES);
    uploadMode = payload.mode || 'files';

    if (uploadMode === 'folder-copy') {
      if (!payload.sourcePath) {
        throw new Error('sourcePath is required for folder-copy uploads.');
      }

      const sourcePath = path.resolve(String(payload.sourcePath));
      const files = await walkDirectory(sourcePath);
      const filePayload = [];

      for (const file of files.filter((entry) => entry.type === 'file')) {
        const content = await fs.readFile(file.absolutePath);
        filePayload.push({
          path: file.relativePath,
          contentBase64: content.toString('base64'),
        });
      }

      writeResult = await writeUploadedFiles(previewDirectory, filePayload);
      artifactName = path.basename(sourcePath);
    } else {
      if (!Array.isArray(payload.files) || payload.files.length === 0) {
        throw new Error('files uploads require a non-empty files array.');
      }

      artifactName = payload.artifactName || payload.name || 'files-upload';
      writeResult = await writeUploadedFiles(previewDirectory, payload.files);
    }
  } else {
    const body = await readRequestBody(req, MAX_UPLOAD_BYTES);
    const url = new URL(req.url || '/', 'http://localhost');
    artifactName =
      url.searchParams.get('filename') ||
      String(req.headers['x-preview-filename'] || 'artifact.tar.gz');
    uploadMode = 'archive';
    writeResult = await extractUploadBuffer({
      buffer: body,
      filename: artifactName,
      destinationDir: previewDirectory,
    });
  }

  const entries = await walkDirectory(previewDirectory);
  const hasIndex = await pathExists(path.join(previewDirectory, 'index.html'));
  const origin = getRequestOrigin(req);

  const metadataEntry = await upsertPreviewMetadata({
    repo: String(req.headers['x-preview-repo-display'] || repoParam),
    repoKey,
    prNumber,
    artifactName,
    uploadMode,
    uploadedAt,
    updatedAt: uploadedAt,
    hasIndex,
    fileCount: writeResult.fileCount,
    sizeBytes: writeResult.sizeBytes,
    branch: String(req.headers['x-preview-branch'] || ''),
    remoteUrl: String(req.headers['x-preview-remote-url'] || ''),
    extractedType: writeResult.extractedType || uploadMode,
    files: entries.filter((entry) => entry.type === 'file').map((entry) => ({
      relativePath: entry.relativePath,
      size: entry.size,
      modifiedAt: entry.modifiedAt,
    })),
  });

  return toApiEntry(metadataEntry, origin);
}

export async function handleApiRoute(req, res) {
  if (!req.url) {
    return false;
  }

  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/api/previews' && req.method === 'GET') {
    const origin = getRequestOrigin(req);
    const previews = await listPreviewMetadata();
    sendJson(res, 200, { previews: previews.map((entry) => toApiEntry(entry, origin)) });
    return true;
  }

  const uploadMatch = pathname.match(/^\/api\/previews\/([^/]+)\/([^/]+)\/upload$/);

  if (uploadMatch && req.method === 'POST') {
    const preview = await savePreview({
      req,
      repoParam: uploadMatch[1],
      prParam: uploadMatch[2],
    });
    sendJson(res, 201, { preview });
    return true;
  }

  return false;
}
