import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

import { ensureDir, sanitizeRelativePath } from './files.js';

function getArchiveType(filename, buffer) {
  const lowerName = String(filename || '').toLowerCase();

  if (lowerName.endsWith('.tar.gz') || lowerName.endsWith('.tgz')) {
    return 'tgz';
  }

  if (lowerName.endsWith('.tar')) {
    return 'tar';
  }

  if (lowerName.endsWith('.zip')) {
    return 'zip';
  }

  if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
    return 'tgz';
  }

  if (buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50) {
    return 'zip';
  }

  if (buffer.length >= 262 && buffer.subarray(257, 262).toString('utf8') === 'ustar') {
    return 'tar';
  }

  return 'file';
}

function parseOctal(value) {
  const trimmed = value.replace(/\0.*$/, '').trim();
  return trimmed ? Number.parseInt(trimmed, 8) : 0;
}

function parsePaxRecords(buffer) {
  const text = buffer.toString('utf8');
  const records = {};
  let index = 0;

  while (index < text.length) {
    const spaceIndex = text.indexOf(' ', index);

    if (spaceIndex === -1) {
      break;
    }

    const recordLength = Number.parseInt(text.slice(index, spaceIndex), 10);

    if (!Number.isFinite(recordLength) || recordLength <= 0) {
      break;
    }

    const record = text.slice(spaceIndex + 1, index + recordLength - 1);
    const equalsIndex = record.indexOf('=');

    if (equalsIndex !== -1) {
      records[record.slice(0, equalsIndex)] = record.slice(equalsIndex + 1);
    }

    index += recordLength;
  }

  return records;
}

async function writeExtractedFile(destinationDir, relativePath, content) {
  const sanitizedPath = sanitizeRelativePath(relativePath);

  if (!sanitizedPath) {
    return { fileCount: 0, sizeBytes: 0 };
  }

  const targetPath = path.join(destinationDir, sanitizedPath);
  await ensureDir(path.dirname(targetPath));
  await fs.writeFile(targetPath, content);
  return { fileCount: 1, sizeBytes: content.length };
}

export async function extractTarBuffer(buffer, destinationDir) {
  let offset = 0;
  let fileCount = 0;
  let sizeBytes = 0;
  let pendingPax = null;
  let pendingLongPath = null;

  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512);

    if (header.every((byte) => byte === 0)) {
      break;
    }

    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/, '');
    const typeFlag = header.subarray(156, 157).toString('utf8') || '0';
    const size = parseOctal(header.subarray(124, 136).toString('utf8'));
    const blockSize = Math.ceil(size / 512) * 512;
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    const content = buffer.subarray(dataStart, dataEnd);

    const headerPath = prefix ? `${prefix}/${name}` : name;
    const finalPath = pendingPax?.path || pendingLongPath || headerPath;

    if (typeFlag === 'x') {
      pendingPax = parsePaxRecords(content);
    } else if (typeFlag === 'L') {
      pendingLongPath = content.toString('utf8').replace(/\0.*$/, '');
    } else if (typeFlag === '5') {
      const sanitizedPath = sanitizeRelativePath(finalPath);

      if (sanitizedPath) {
        await ensureDir(path.join(destinationDir, sanitizedPath));
      }

      pendingPax = null;
      pendingLongPath = null;
    } else if (typeFlag === '0' || typeFlag === '\0' || typeFlag === '7') {
      const result = await writeExtractedFile(destinationDir, finalPath, content);
      fileCount += result.fileCount;
      sizeBytes += result.sizeBytes;
      pendingPax = null;
      pendingLongPath = null;
    }

    offset = dataStart + blockSize;
  }

  return { fileCount, sizeBytes, extractedType: 'tar' };
}

function findEndOfCentralDirectory(buffer) {
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  return -1;
}

export async function extractZipBuffer(buffer, destinationDir) {
  const eocdOffset = findEndOfCentralDirectory(buffer);

  if (eocdOffset === -1) {
    throw new Error('Invalid ZIP archive.');
  }

  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  let offset = centralDirectoryOffset;
  let fileCount = 0;
  let sizeBytes = 0;

  for (let index = 0; index < totalEntries; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error('Corrupt ZIP central directory.');
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const relativePath = buffer
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString('utf8');

    offset += 46 + fileNameLength + extraLength + commentLength;

    if (relativePath.endsWith('/')) {
      const sanitizedDirectory = sanitizeRelativePath(relativePath);

      if (sanitizedDirectory) {
        await ensureDir(path.join(destinationDir, sanitizedDirectory));
      }

      continue;
    }

    if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw new Error('Corrupt ZIP local header.');
    }

    const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const compressedData = buffer.subarray(dataOffset, dataOffset + compressedSize);

    let content;

    if (compressionMethod === 0) {
      content = compressedData;
    } else if (compressionMethod === 8) {
      content = zlib.inflateRawSync(compressedData);
    } else {
      throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`);
    }

    const result = await writeExtractedFile(destinationDir, relativePath, content);
    fileCount += result.fileCount;
    sizeBytes += result.sizeBytes;
  }

  return { fileCount, sizeBytes, extractedType: 'zip' };
}

export async function extractUploadBuffer({ buffer, filename, destinationDir }) {
  const archiveType = getArchiveType(filename, buffer);

  if (archiveType === 'zip') {
    return extractZipBuffer(buffer, destinationDir);
  }

  if (archiveType === 'tar') {
    return extractTarBuffer(buffer, destinationDir);
  }

  if (archiveType === 'tgz') {
    return extractTarBuffer(zlib.gunzipSync(buffer), destinationDir);
  }

  const safeName = path.basename(filename || 'artifact.bin');
  const result = await writeExtractedFile(destinationDir, safeName, buffer);
  return { ...result, extractedType: 'file' };
}
