import path from 'node:path';

import { DASHBOARD_ROOT } from '../utils/constants.js';
import { pathExists, sanitizeRelativePath } from '../utils/files.js';
import { serveFile } from '../utils/http.js';

export async function handleDashboardRoute(req, res) {
  if (!req.url) {
    return false;
  }

  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/') {
    await serveFile(res, path.join(DASHBOARD_ROOT, 'index.html'));
    return true;
  }

  if (!pathname.startsWith('/dashboard/')) {
    return false;
  }

  const relativePath = sanitizeRelativePath(pathname.slice('/dashboard/'.length));

  if (!relativePath) {
    return false;
  }

  const targetPath = path.join(DASHBOARD_ROOT, relativePath);

  if (!(await pathExists(targetPath))) {
    return false;
  }

  await serveFile(res, targetPath);
  return true;
}
