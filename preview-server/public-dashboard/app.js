
onst tableBody = document.querySelector('#preview-table-body');
const emptyState = document.querySelector('#empty-state');
const refreshButton = document.querySelector('#refresh-button');
const uploadForm = document.querySelector('#upload-form');
const uploadMode = document.querySelector('#upload-mode');
const archiveField = document.querySelector('#archive-field');
const folderField = document.querySelector('#folder-field');
const archiveInput = document.querySelector('#archive-input');
const folderInput = document.querySelector('#folder-input');
const uploadStatus = document.querySelector('#upload-status');

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function setStatus(message, tone = 'neutral') {
  uploadStatus.textContent = message;
  uploadStatus.dataset.tone = tone;
}

async function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

function toggleUploadMode() {
  const isFolder = uploadMode.value === 'folder';
  archiveField.classList.toggle('hidden', isFolder);
  folderField.classList.toggle('hidden', !isFolder);
}

async function loadPreviews() {
  const response = await fetch('/api/previews');
  const payload = await response.json();
  const previews = payload.previews || [];

  emptyState.classList.toggle('hidden', previews.length > 0);
  tableBody.innerHTML = previews
    .map(
      (preview) => `
        <tr>
          <td>${escapeHtml(preview.repo)}</td>
          <td>#${preview.prNumber}</td>
          <td>${escapeHtml(formatDate(preview.updatedAt))}</td>
          <td>${escapeHtml(preview.artifactName)}</td>
          <td>${preview.fileCount}</td>
          <td>
            <a class="button secondary small" href="${escapeHtml(preview.previewUrl)}" target="_blank" rel="noreferrer">Open</a>
          </td>
        </tr>`,
    )
    .join('');
}

async function uploadArchive(repo, pr) {
  const file = archiveInput.files?.[0];

  if (!file) {
    throw new Error('Choose an archive or file to upload.');
  }

  const response = await fetch(
    `/api/previews/${encodeURIComponent(repo)}/${encodeURIComponent(pr)}/upload?filename=${encodeURIComponent(file.name)}`,
    {
      method: 'POST',
      headers: {
        'content-type': file.type || 'application/octet-stream',
        'x-preview-repo-display': repo,
      },
      body: file,
    },
  );

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}.`);
  }

  return response.json();
}

async function uploadFolder(repo, pr) {
  const files = Array.from(folderInput.files || []);

  if (!files.length) {
    throw new Error('Choose a folder to upload.');
  }

  const payload = {
    mode: 'files',
    artifactName: files[0].webkitRelativePath.split('/')[0] || `${repo}-pr-${pr}`,
    files: await Promise.all(
      files.map(async (file) => ({
        path: file.webkitRelativePath || file.name,
        contentBase64: await arrayBufferToBase64(await file.arrayBuffer()),
      })),
    ),
  };

  const response = await fetch(`/api/previews/${encodeURIComponent(repo)}/${encodeURIComponent(pr)}/upload`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-preview-repo-display': repo,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}.`);
  }

  return response.json();
}

uploadMode.addEventListener('change', toggleUploadMode);
refreshButton.addEventListener('click', () => {
  loadPreviews().catch((error) => {
    console.error(error);
  });
});

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(uploadForm);
  const repo = String(formData.get('repo') || '').trim();
  const pr = String(formData.get('pr') || '').trim();

  if (!repo || !pr) {
    setStatus('Repository and PR number are required.', 'error');
    return;
  }

  try {
    setStatus('Uploading preview…', 'neutral');
    const payload =
      uploadMode.value === 'folder' ? await uploadFolder(repo, pr) : await uploadArchive(repo, pr);

    setStatus(`Preview ready: ${payload.preview.previewUrl}`, 'success');
    await loadPreviews();
  } catch (error) {
    console.error(error);
    setStatus(error instanceof Error ? error.message : String(error), 'error');
  }
});

toggleUploadMode();
loadPreviews().catch((error) => {
  console.error(error);
  setStatus('Failed to load previews.', 'error');
});