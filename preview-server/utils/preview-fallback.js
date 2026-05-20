import fs from 'node:fs/promises';
import path from 'node:path';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function buildPreviewFallbackHtml({
  repo,
  prNumber,
  requestedPath,
  previewRoot,
  currentDirectory,
  basePath,
}) {
  const entries = await fs.readdir(currentDirectory, { withFileTypes: true });
  const relativeDirectory = path.relative(previewRoot, currentDirectory).split(path.sep).join('/');
  const breadcrumb = relativeDirectory
    ? relativeDirectory.split('/').map((segment, index, segments) => {
        const href = `${basePath}/${segments.slice(0, index + 1).join('/')}/`;
        return `<a href="${escapeHtml(href)}">${escapeHtml(segment)}</a>`;
      })
    : ['<span>root</span>'];

  const listItems = entries
    .sort((left, right) => {
      if (left.isDirectory() !== right.isDirectory()) {
        return left.isDirectory() ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    })
    .map((entry) => {
      const href = `${basePath}${relativeDirectory ? `/${relativeDirectory}` : ''}/${entry.name}${entry.isDirectory() ? '/' : ''}`;
      return `<li class="${entry.isDirectory() ? 'directory' : 'file'}"><a href="${escapeHtml(href)}">${escapeHtml(
        entry.name,
      )}${entry.isDirectory() ? '/' : ''}</a></li>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(repo)} PR #${escapeHtml(prNumber)} Preview</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, system-ui, sans-serif;
      }
      body {
        margin: 0;
        min-height: 100vh;
        background: #020617;
        color: #e2e8f0;
      }
      main {
        max-width: 1080px;
        margin: 0 auto;
        padding: 2rem;
      }
      .panel {
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 18px;
        padding: 1.5rem;
        box-shadow: 0 24px 60px rgba(2, 6, 23, 0.45);
      }
      h1 {
        margin-top: 0;
        font-size: 1.8rem;
      }
      p, li, a {
        line-height: 1.6;
      }
      a {
        color: #7dd3fc;
      }
      code {
        font-family: ui-monospace, SFMono-Regular, monospace;
        background: rgba(15, 118, 110, 0.2);
        padding: 0.15rem 0.4rem;
        border-radius: 6px;
      }
      ul {
        list-style: none;
        padding: 0;
        margin: 1rem 0 0;
      }
      li + li {
        margin-top: 0.4rem;
      }
      .directory a::before {
        content: "📁 ";
      }
      .file a::before {
        content: "📄 ";
      }
      .breadcrumbs {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin: 0.75rem 0 1.25rem;
      }
      .breadcrumbs span,
      .breadcrumbs a {
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        background: rgba(30, 41, 59, 0.7);
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="panel">
        <h1>${escapeHtml(repo)} PR #${escapeHtml(prNumber)}</h1>
        <p>This preview does not contain a root <code>index.html</code>, so the server is showing the uploaded files directly.</p>
        <p>Requested path: <code>${escapeHtml(requestedPath || '/')}</code></p>
        <div class="breadcrumbs">${breadcrumb.join('<span>/</span>')}</div>
        <ul>${listItems || '<li>No files were uploaded.</li>'}</ul>
      </section>
    </main>
  </body>
</html>`;
}
