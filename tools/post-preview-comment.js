import {
  buildPreviewUrl,
  detectPrNumber,
  getGitContext,
  getPreviewServerBaseUrl,
} from './preview-common.js';

const COMMENT_MARKER = '<!-- standalone-pr-preview-comment -->';

function getGitHubToken() {
  return process.env.PREVIEW_GITHUB_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
}

function buildCommentBody({ previewUrl, repoName, prNumber }) {
  return `${COMMENT_MARKER}
## 🔍 PR Preview

- Repository: \`${repoName}\`
- Pull Request: #${prNumber}
- Preview: ${previewUrl}

Re-run \`node tools/upload-preview.js\` and then \`node tools/post-preview-comment.js\` any time you refresh the preview.`;
}

async function githubRequest(url, { method = 'GET', token, body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'standalone-pr-preview-tool',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status}): ${await response.text()}`);
  }

  return response.status === 204 ? null : response.json();
}

async function main() {
  const token = getGitHubToken();

  if (!token) {
    throw new Error('Set PREVIEW_GITHUB_TOKEN, GITHUB_TOKEN, or GH_TOKEN before posting preview comments.');
  }

  const context = await getGitContext();
  const prNumber = await detectPrNumber(context);

  if (!context.owner || !context.repoName) {
    throw new Error('Unable to determine the GitHub owner and repository from remote.origin.url.');
  }

  if (!prNumber) {
    throw new Error('Unable to detect the current PR number. Set PREVIEW_PR_NUMBER and try again.');
  }

  const previewUrl = process.env.PREVIEW_URL || buildPreviewUrl(getPreviewServerBaseUrl(), context.repoKey, prNumber);
  const commentsUrl = `https://api.github.com/repos/${context.owner}/${context.repoName}/issues/${prNumber}/comments?per_page=100`;
  const comments = await githubRequest(commentsUrl, { token });
  const existingComment = comments.find((comment) => comment.body?.includes(COMMENT_MARKER));
  const body = buildCommentBody({
    previewUrl,
    repoName: context.repoName,
    prNumber,
  });

  if (existingComment) {
    await githubRequest(existingComment.url, {
      method: 'PATCH',
      token,
      body: { body },
    });
    console.log(`Updated preview comment on PR #${prNumber}.`);
  } else {
    await githubRequest(`https://api.github.com/repos/${context.owner}/${context.repoName}/issues/${prNumber}/comments`, {
      method: 'POST',
      token,
      body: { body },
    });
    console.log(`Posted preview comment on PR #${prNumber}.`);
  }

  console.log(`Preview URL: ${previewUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
