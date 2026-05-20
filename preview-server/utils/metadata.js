import fs from 'node:fs/promises';
import path from 'node:path';

import { METADATA_FILE } from './constants.js';
import { ensureDir, normalizePreviewSegment, pathExists } from './files.js';

async function readMetadataFile() {
  if (!(await pathExists(METADATA_FILE))) {
    return { previews: [] };
  }

  const content = await fs.readFile(METADATA_FILE, 'utf8');
  return JSON.parse(content);
}

async function writeMetadataFile(metadata) {
  await ensureDir(path.dirname(METADATA_FILE));
  const tempFile = `${METADATA_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(metadata, null, 2));
  await fs.rename(tempFile, METADATA_FILE);
}

export async function listPreviewMetadata() {
  const metadata = await readMetadataFile();
  return [...(metadata.previews || [])].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export async function upsertPreviewMetadata(entry) {
  const metadata = await readMetadataFile();
  const previews = [...(metadata.previews || [])];
  const repoKey = normalizePreviewSegment(entry.repoKey || entry.repo);
  const prNumber = String(entry.prNumber);
  const index = previews.findIndex(
    (preview) => normalizePreviewSegment(preview.repoKey || preview.repo) === repoKey && String(preview.prNumber) === prNumber,
  );

  if (index === -1) {
    previews.push({ ...entry, repoKey, prNumber });
  } else {
    previews[index] = { ...previews[index], ...entry, repoKey, prNumber };
  }

  await writeMetadataFile({ previews });
  return previews.find(
    (preview) => normalizePreviewSegment(preview.repoKey || preview.repo) === repoKey && String(preview.prNumber) === prNumber,
  );
}

export async function removePreviewMetadata(predicate) {
  const metadata = await readMetadataFile();
  const previews = [...(metadata.previews || [])];
  const kept = previews.filter((entry) => !predicate(entry));
  await writeMetadataFile({ previews: kept });
  return previews.length - kept.length;
}
