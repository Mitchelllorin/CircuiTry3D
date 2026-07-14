import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

export const PREVIEW_SERVER_ROOT = path.resolve(MODULE_DIR, '..');
export const REPOSITORY_ROOT = path.resolve(PREVIEW_SERVER_ROOT, '..');
export const PREVIEWS_ROOT = path.join(REPOSITORY_ROOT, 'previews');
export const DATA_ROOT = path.join(PREVIEW_SERVER_ROOT, 'data');
export const METADATA_FILE = path.join(DATA_ROOT, 'previews.json');
export const DASHBOARD_ROOT = path.join(PREVIEW_SERVER_ROOT, 'public-dashboard');
export const DEFAULT_PORT = Number(process.env.PREVIEW_PORT || 5050);
export const MAX_UPLOAD_BYTES = Number(process.env.PREVIEW_MAX_UPLOAD_BYTES || 500 * 1024 * 1024);
