import fs from 'node:fs/promises';
import path from 'node:path';

import { PREVIEWS_ROOT } from './constants.js';
import { normalizePreviewSegment, pathExists } from './files.js';
import { listPreviewMetadata, removePreviewMetadata } from './metadata.js';

function parseArguments(argv) {
  const options = {
    days: 30,
    dryRun: false,
    repo: '',
    pr: '',
  };

  for (const argument of argv) {
    if (argument === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (argument.startsWith('--days=')) {
      options.days = Number(argument.slice('--days='.length));
      continue;
    }

    if (argument.startsWith('--repo=')) {
      options.repo = argument.slice('--repo='.length);
      continue;
    }

    if (argument.startsWith('--pr=')) {
      options.pr = argument.slice('--pr='.length);
    }
  }

  return options;
}

async function removePreviewDirectory(repoKey, prNumber, dryRun) {
  const directoryPath = path.join(PREVIEWS_ROOT, repoKey, String(prNumber));

  if (!(await pathExists(directoryPath))) {
    return false;
  }

  if (!dryRun) {
    await fs.rm(directoryPath, { recursive: true, force: true });
  }

  return true;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const now = Date.now();
  const maxAgeMs = Number.isFinite(options.days) && options.days >= 0 ? options.days * 24 * 60 * 60 * 1000 : 0;
  const repoFilter = options.repo ? normalizePreviewSegment(options.repo) : '';
  const prFilter = options.pr ? String(options.pr) : '';
  const previews = await listPreviewMetadata();
  const targets = previews.filter((entry) => {
    if (repoFilter && normalizePreviewSegment(entry.repoKey || entry.repo) !== repoFilter) {
      return false;
    }

    if (prFilter && String(entry.prNumber) !== prFilter) {
      return false;
    }

    return maxAgeMs === 0 || now - Date.parse(entry.updatedAt) >= maxAgeMs;
  });

  let removedCount = 0;

  for (const entry of targets) {
    const removed = await removePreviewDirectory(entry.repoKey, entry.prNumber, options.dryRun);
    if (removed) {
      removedCount += 1;
    }
  }

  if (!options.dryRun) {
    await removePreviewMetadata((entry) =>
      targets.some(
        (target) => normalizePreviewSegment(target.repoKey || target.repo) === normalizePreviewSegment(entry.repoKey || entry.repo) &&
          String(target.prNumber) === String(entry.prNumber),
      ),
    );
  }

  console.log(
    `${options.dryRun ? 'Would remove' : 'Removed'} ${removedCount} preview${removedCount === 1 ? '' : 's'}.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
