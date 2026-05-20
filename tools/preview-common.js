import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { promisify } from 'node:util';
import { execFile as execFileCallback, spawn } from 'node:child_process';

import { normalizePreviewSegment } from '../preview-server/utils/files.js';

const execFile = promisify(execFileCallback);

const DEFAULT_OUTPUT_CANDIDATES = [
  'dist',
  'build',
  'out',
  'public',
  '.output/public',
  'storybook-static',
];

const DEFAULT_EXCLUDES = new Set([
  '.git',
  '.github',
  '.idea',
  '.vscode',
  'android/build',
  'android/app/build',
  'coverage',
  'dist',
  'node_modules',
  'previews',
  'preview-server/data',
]);

function shellForPackageManager(packageManager) {
  switch (packageManager) {
    case 'pnpm':
      return ['pnpm', ['build']];
    case 'yarn':
      return ['yarn', ['build']];
    case 'bun':
      return ['bun', ['run', 'build']];
    default:
      return ['npm', ['run', 'build']];
  }
}

export async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export function parseGitHubRemoteUrl(remoteUrl) {
  const trimmed = String(remoteUrl || '').trim();
  const match =
    trimmed.match(/github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/.]+)(?:\.git)?$/i) ||
    trimmed.match(/^git@github\.com:(?<owner>[^/]+)\/(?<repo>[^/.]+)(?:\.git)?$/i);

  if (!match?.groups) {
    return null;
  }

  return {
    owner: match.groups.owner,
    repo: match.groups.repo,
  };
}

export function extractPrNumberFromBranch(branchName) {
  const branch = String(branchName || '').trim();
  const patterns = [
    /(?:^|[/_-])pr[/_-]?(\d+)(?:$|[/_-])/i,
    /(?:^|[/_-])pull[/_-]?(\d+)(?:$|[/_-])/i,
    /^(\d+)(?:$|[-_])/,
  ];

  for (const pattern of patterns) {
    const match = branch.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return '';
}

export async function runCommand(command, args, cwd) {
  const result = await execFile(command, args, {
    cwd,
    encoding: 'utf8',
    env: process.env,
  });
  return result.stdout.trim();
}

export async function getGitContext(cwd = process.cwd()) {
  const [remoteUrl, branch] = await Promise.all([
    runCommand('git', ['config', '--get', 'remote.origin.url'], cwd),
    runCommand('git', ['branch', '--show-current'], cwd),
  ]);

  const parsedRemote = parseGitHubRemoteUrl(remoteUrl);
  const repoName = parsedRemote?.repo || path.basename(cwd);

  return {
    cwd,
    branch,
    remoteUrl,
    owner: parsedRemote?.owner || '',
    repoName,
    repoKey: normalizePreviewSegment(repoName),
  };
}

export async function detectPackageManager(cwd) {
  if (await pathExists(path.join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }

  if (await pathExists(path.join(cwd, 'yarn.lock'))) {
    return 'yarn';
  }

  if ((await pathExists(path.join(cwd, 'bun.lock'))) || (await pathExists(path.join(cwd, 'bun.lockb')))) {
    return 'bun';
  }

  return 'npm';
}

export async function loadPackageJson(cwd) {
  const packageJsonPath = path.join(cwd, 'package.json');

  if (!(await pathExists(packageJsonPath))) {
    return null;
  }

  return JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
}

export async function inferBuildCommand(cwd) {
  if (process.env.PREVIEW_BUILD_COMMAND) {
    return process.env.PREVIEW_BUILD_COMMAND;
  }

  const packageJson = await loadPackageJson(cwd);

  if (packageJson?.scripts?.build) {
    const packageManager = await detectPackageManager(cwd);
    const [command, args] = shellForPackageManager(packageManager);
    return `${command} ${args.join(' ')}`;
  }

  return '';
}

export async function runBuildIfNeeded(cwd) {
  const buildCommand = await inferBuildCommand(cwd);

  if (!buildCommand) {
    return { buildCommand: '', ranBuild: false };
  }

  await new Promise((resolve, reject) => {
    const child = spawn(buildCommand, {
      cwd,
      env: process.env,
      shell: true,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`Build command failed with exit code ${code}.`));
    });
  });
  return { buildCommand, ranBuild: true };
}

export async function choosePreviewSource(cwd) {
  if (process.env.PREVIEW_OUTPUT_DIR) {
    const configuredPath = path.resolve(cwd, process.env.PREVIEW_OUTPUT_DIR);
    if (!(await pathExists(configuredPath))) {
      throw new Error(`PREVIEW_OUTPUT_DIR does not exist: ${configuredPath}`);
    }
    return configuredPath;
  }

  for (const candidate of DEFAULT_OUTPUT_CANDIDATES) {
    const absoluteCandidate = path.join(cwd, candidate);
    if (await pathExists(absoluteCandidate)) {
      return absoluteCandidate;
    }
  }

  return cwd;
}

function shouldExclude(relativePath) {
  const normalized = relativePath.split(path.sep).join('/');
  return [...DEFAULT_EXCLUDES].some((entry) => normalized === entry || normalized.startsWith(`${entry}/`));
}

async function collectFiles(rootPath, currentPath = rootPath) {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(currentPath, entry.name);
    const relativePath = path.relative(rootPath, absolutePath);

    if (shouldExclude(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(rootPath, absolutePath)));
      continue;
    }

    const stats = await fs.stat(absolutePath);
    files.push({
      absolutePath,
      relativePath: relativePath.split(path.sep).join('/'),
      size: stats.size,
      mode: stats.mode & 0o777,
      modifiedTime: Math.floor(stats.mtimeMs / 1000),
    });
  }

  return files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function encodeTarHeader({ name, size, mode = 0o644, modifiedTime = Math.floor(Date.now() / 1000) }) {
  const header = Buffer.alloc(512, 0);
  const normalizedName = name.replace(/\\/g, '/');
  const prefix = normalizedName.length > 100 ? normalizedName.slice(0, normalizedName.lastIndexOf('/')) : '';
  const shortName = prefix ? normalizedName.slice(prefix.length + 1) : normalizedName;

  header.write(shortName.slice(0, 100), 0, 'utf8');
  header.write(mode.toString(8).padStart(7, '0') + '\0', 100, 'ascii');
  header.write('0000000\0', 108, 'ascii');
  header.write('0000000\0', 116, 'ascii');
  header.write(size.toString(8).padStart(11, '0') + '\0', 124, 'ascii');
  header.write(modifiedTime.toString(8).padStart(11, '0') + '\0', 136, 'ascii');
  header.fill(' ', 148, 156);
  header.write('0', 156, 'ascii');
  header.write('ustar\0', 257, 'ascii');
  header.write('00', 263, 'ascii');

  if (prefix) {
    header.write(prefix.slice(0, 155), 345, 'utf8');
  }

  let checksum = 0;
  for (const byte of header) {
    checksum += byte;
  }
  header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 'ascii');
  return header;
}

export async function createTarGzBuffer(sourcePath) {
  const sourceStat = await fs.stat(sourcePath);
  const files = sourceStat.isDirectory()
    ? await collectFiles(sourcePath)
    : [
        {
          absolutePath: sourcePath,
          relativePath: path.basename(sourcePath),
          size: sourceStat.size,
          mode: sourceStat.mode & 0o777,
          modifiedTime: Math.floor(sourceStat.mtimeMs / 1000),
        },
      ];

  const chunks = [];

  for (const file of files) {
    const content = await fs.readFile(file.absolutePath);
    const header = encodeTarHeader({
      name: file.relativePath,
      size: content.length,
      mode: file.mode,
      modifiedTime: file.modifiedTime,
    });

    chunks.push(header);
    chunks.push(content);

    const padding = (512 - (content.length % 512)) % 512;
    if (padding) {
      chunks.push(Buffer.alloc(padding, 0));
    }
  }

  chunks.push(Buffer.alloc(1024, 0));
  return zlib.gzipSync(Buffer.concat(chunks));
}

export async function detectPrNumber(context) {
  if (process.env.PREVIEW_PR_NUMBER) {
    return String(process.env.PREVIEW_PR_NUMBER);
  }

  const branchMatch = extractPrNumberFromBranch(context.branch);
  if (branchMatch) {
    return branchMatch;
  }

  try {
    const ghValue = await runCommand('gh', ['pr', 'view', '--json', 'number', '--jq', '.number'], context.cwd);
    if (ghValue) {
      return ghValue;
    }
  } catch {}

  if (!context.owner || !context.repoName || !context.branch) {
    return '';
  }

  const token = process.env.PREVIEW_GITHUB_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  const url = new URL(`https://api.github.com/repos/${context.owner}/${context.repoName}/pulls`);
  url.searchParams.set('head', `${context.owner}:${context.branch}`);
  url.searchParams.set('state', 'open');
  url.searchParams.set('per_page', '1');

  const response = await fetch(url, {
    headers: {
      accept: 'application/vnd.github+json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'user-agent': 'standalone-pr-preview-tool',
    },
  });

  if (!response.ok) {
    return '';
  }

  const pulls = await response.json();
  return pulls[0]?.number ? String(pulls[0].number) : '';
}

export function getPreviewServerBaseUrl() {
  return process.env.PREVIEW_SERVER_URL || 'http://localhost:5050';
}

export function buildPreviewUrl(serverBaseUrl, repoKey, prNumber) {
  const baseUrl = serverBaseUrl.replace(/\/+$/, '');
  return `${baseUrl}/previews/${encodeURIComponent(repoKey)}/${encodeURIComponent(prNumber)}/`;
}
