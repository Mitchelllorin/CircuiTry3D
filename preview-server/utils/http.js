import fs from 'node:fs';
import path from 'node:path';

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
};

export function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload, null, 2));
}

export function sendText(res, statusCode, message, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, { 'content-type': contentType });
  res.end(message);
}

export function getRequestOrigin(req) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = typeof forwardedProto === 'string' && forwardedProto ? forwardedProto : 'http';
  return `${protocol}://${req.headers.host || 'localhost:5050'}`;
}

export async function readRequestBody(req, limitBytes) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bufferChunk.length;

    if (size > limitBytes) {
      throw new Error(`Request body exceeded ${limitBytes} bytes.`);
    }

    chunks.push(bufferChunk);
  }

  return Buffer.concat(chunks);
}

export async function readJsonBody(req, limitBytes) {
  const buffer = await readRequestBody(req, limitBytes);

  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}

export async function serveFile(res, absolutePath, headers = {}) {
  const extension = path.extname(absolutePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || 'application/octet-stream';

  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(absolutePath);

    stream.on('error', reject);
    stream.on('open', () => {
      res.writeHead(200, {
        'content-type': contentType,
        'cache-control': 'no-cache',
        ...headers,
      });
    });
    stream.on('end', resolve);
    stream.pipe(res);
  });
}
