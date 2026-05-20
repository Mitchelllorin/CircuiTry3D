import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

import { describe, expect, it } from 'vitest';

import { extractTarBuffer, extractZipBuffer } from '../preview-server/utils/archive.js';
import {
  normalizePreviewSegment,
  sanitizeRelativePath,
} from '../preview-server/utils/files.js';
import {
  buildPreviewUrl,
  extractPrNumberFromBranch,
  parseGitHubRemoteUrl,
} from '../tools/preview-common.js';

function createStoredZip(files: Array<{ name: string; content: string }>) {
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const fileName = Buffer.from(file.name, 'utf8');
    const content = Buffer.from(file.content, 'utf8');

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(0, 14);
    localHeader.writeUInt32LE(content.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(fileName.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(0, 16);
    centralHeader.writeUInt32LE(content.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(fileName.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    localChunks.push(localHeader, fileName, content);
    centralChunks.push(centralHeader, fileName);
    offset += localHeader.length + fileName.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralChunks);
  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(files.length, 8);
  endOfCentralDirectory.writeUInt16LE(files.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectory.length, 12);
  endOfCentralDirectory.writeUInt32LE(offset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, centralDirectory, endOfCentralDirectory]);
}

function createTarGzBuffer(files: Array<{ name: string; content: string }>) {
  const chunks: Buffer[] = [];

  for (const file of files) {
    const content = Buffer.from(file.content, 'utf8');
    const header = Buffer.alloc(512, 0);
    header.write(file.name, 0, 'utf8');
    header.write('0000644\0', 100, 'ascii');
    header.write('0000000\0', 108, 'ascii');
    header.write('0000000\0', 116, 'ascii');
    header.write(content.length.toString(8).padStart(11, '0') + '\0', 124, 'ascii');
    header.write('00000000000\0', 136, 'ascii');
    header.fill(' ', 148, 156);
    header.write('0', 156, 'ascii');
    header.write('ustar\0', 257, 'ascii');
    header.write('00', 263, 'ascii');

    let checksum = 0;
    for (const byte of header) {
      checksum += byte;
    }
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 'ascii');

    chunks.push(header, content);

    const padding = (512 - (content.length % 512)) % 512;
    if (padding) {
      chunks.push(Buffer.alloc(padding, 0));
    }
  }

  chunks.push(Buffer.alloc(1024, 0));
  return zlib.gzipSync(Buffer.concat(chunks));
}

describe('preview server utilities', () => {
  it('normalizes preview path segments safely', () => {
    expect(normalizePreviewSegment(' Mitchell/CircuiTry3D ')).toBe('Mitchell-CircuiTry3D');
    expect(sanitizeRelativePath('../escape')).toBeNull();
    expect(sanitizeRelativePath('dist/assets/index.js')).toBe('dist/assets/index.js');
  });

  it('extracts ZIP uploads without dependencies', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'preview-zip-'));
    const archive = createStoredZip([{ name: 'index.html', content: '<h1>ok</h1>' }]);

    await extractZipBuffer(archive, tempDirectory);

    expect(await fs.readFile(path.join(tempDirectory, 'index.html'), 'utf8')).toBe('<h1>ok</h1>');
  });

  it('extracts tar.gz uploads without dependencies', async () => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'preview-tar-'));
    const archive = createTarGzBuffer([{ name: 'assets/app.js', content: 'console.log("ok");' }]);

    await extractTarBuffer(zlib.gunzipSync(archive), tempDirectory);

    expect(await fs.readFile(path.join(tempDirectory, 'assets', 'app.js'), 'utf8')).toBe('console.log("ok");');
  });
});

describe('preview CLI helpers', () => {
  it('parses GitHub remotes and PR branch names', () => {
    expect(parseGitHubRemoteUrl('https://github.com/Mitchelllorin/CircuiTry3D.git')).toEqual({
      owner: 'Mitchelllorin',
      repo: 'CircuiTry3D',
    });
    expect(extractPrNumberFromBranch('feature/pr-321-preview')).toBe('321');
    expect(buildPreviewUrl('http://localhost:5050/', 'CircuiTry3D', '321')).toBe(
      'http://localhost:5050/previews/CircuiTry3D/321/',
    );
  });
});
