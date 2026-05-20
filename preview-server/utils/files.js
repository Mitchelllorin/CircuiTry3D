import fs from 'node:fs/promises';
import path from 'node:path';

export async function ensureDir(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

export async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export function normalizePreviewSegment(value, fallback = 'unknown') {
  const input = String(value ?? '').trim();
  let normalized = '';
  let previousWasDash = false;

  for (const character of input) {
    const isAllowed =
      (character >= 'A' && character <= 'Z') ||
      (character >= 'a' && character <= 'z') ||
      (character >= '0' && character <= '9') ||
      character === '.' ||
      character === '_';
    const nextCharacter = isAllowed ? character : '-';

    if (nextCharacter === '-') {
      if (!normalized || previousWasDash) {
        previousWasDash = true;
        continue;
      }

      normalized += '-';
      previousWasDash = true;
      continue;
    }

    normalized += nextCharacter;
    previousWasDash = false;
  }

  normalized = normalized.replace(/^[-.]+/, '').replace(/[-.]+$/, '');

  return normalized || fallback;
}

export function sanitizeRelativePath(relativePath) {
  const normalized = path.posix.normalize(String(relativePath ?? '').replace(/\\/g, '/'));

  if (!normalized || normalized === '.' || normalized.startsWith('../') || normalized === '..') {
    return null;
  }

  if (normalized.startsWith('/')) {
    return null;
  }

  const segments = normalized.split('/').filter(Boolean);

  if (!segments.length || segments.some((segment) => segment === '..' || /^[A-Za-z]:$/.test(segment))) {
    return null;
  }

  return segments.join('/');
}

export function safeJoin(rootPath, relativePath) {
  const sanitized = sanitizeRelativePath(relativePath);

  if (!sanitized) {
    return null;
  }

  return path.join(rootPath, sanitized);
}

export async function emptyDirectory(directoryPath) {
  await fs.rm(directoryPath, { recursive: true, force: true });
  await ensureDir(directoryPath);
}

export async function walkDirectory(rootDirectory, currentDirectory = rootDirectory) {
  const entries = await fs.readdir(currentDirectory, { withFileTypes: true });
  const results = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolutePath = path.join(currentDirectory, entry.name);
    const relativePath = path.relative(rootDirectory, absolutePath).split(path.sep).join('/');

    if (entry.isDirectory()) {
      results.push({ type: 'directory', name: entry.name, relativePath, absolutePath });
      results.push(...(await walkDirectory(rootDirectory, absolutePath)));
      continue;
    }

    const stats = await fs.stat(absolutePath);
    results.push({
      type: 'file',
      name: entry.name,
      relativePath,
      absolutePath,
      size: stats.size,
      modifiedAt: stats.mtime.toISOString(),
    });
  }

  return results;
}

export async function writeUploadedFiles(destinationDir, files) {
  let fileCount = 0;
  let sizeBytes = 0;

  for (const file of files) {
    const sanitizedPath = sanitizeRelativePath(file.path || file.relativePath || file.name);

    if (!sanitizedPath) {
      throw new Error(`Invalid uploaded path: ${file.path || file.relativePath || file.name}`);
    }

    const targetPath = path.join(destinationDir, sanitizedPath);
    const content = Buffer.from(file.contentBase64, 'base64');

    await ensureDir(path.dirname(targetPath));
    await fs.writeFile(targetPath, content);

    fileCount += 1;
    sizeBytes += content.length;
  }

  return { fileCount, sizeBytes };
}
