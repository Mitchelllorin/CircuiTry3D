import http from 'node:http';
import { fileURLToPath } from 'node:url';

import { handleApiRoute } from './routes/api.js';
import { handleDashboardRoute } from './routes/dashboard.js';
import { handlePreviewRoute } from './routes/previews.js';
import { DEFAULT_PORT, DATA_ROOT, PREVIEWS_ROOT } from './utils/constants.js';
import { ensureDir } from './utils/files.js';

export async function startPreviewServer(options = {}) {
  await ensureDir(PREVIEWS_ROOT);
  await ensureDir(DATA_ROOT);

  const port = Number(options.port ?? DEFAULT_PORT);

  const server = http.createServer(async (req, res) => {
    try {
      const handled =
        (await handleApiRoute(req, res)) ||
        (await handlePreviewRoute(req, res)) ||
        (await handleDashboardRoute(req, res));

      if (!handled && !res.writableEnded) {
        res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Not found.' }));
      }
    } catch (error) {
      console.error(error);
      if (!res.writableEnded) {
        res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            error: 'Preview server failed to process the request.',
          }),
        );
      }
    }
  });

  server.listen(port, () => {
    console.log(`Preview dashboard: http://localhost:${port}/`);
    console.log(`Preview root: http://localhost:${port}/previews/{repo}/{pr-number}/`);
    console.log(`Preview storage: ${PREVIEWS_ROOT}`);
  });

  return server;
}

const directRunTarget = process.argv[1];
const currentFile = fileURLToPath(import.meta.url);

if (directRunTarget === currentFile) {
  startPreviewServer();
}
