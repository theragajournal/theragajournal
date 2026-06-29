/**
 * github.js — every call to GitHub's REST API lives here.
 * No build step, no dependencies: plain fetch() against api.github.com.
 *
 * This is the only file that talks to GitHub directly. Every other file
 * (editor, media, dashboard) goes through the functions exported here.
 */

const GH_API = 'https://api.github.com';

/** Thrown for any non-2xx response, carrying the status code along. */
class GitHubError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function ghFetch(token, path, options = {}) {
  const res = await fetch(`${GH_API}${path}`, {
    ...options,
    headers: { ...authHeaders(token), ...(options.headers || {}) },
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body.message || '';
    } catch {
      /* ignore parse failures */
    }
    throw new GitHubError(detail || `GitHub API error (${res.status})`, res.status);
  }
  if (res.status === 204) return null;
  return res.json();
}

/** Validate a token and return the authenticated user, or throw. */
async function validateToken(token) {
  return ghFetch(token, '/user');
}

/** List repos the user can access, most recently updated first. */
async function listRepos(token) {
  const repos = await ghFetch(
    token,
    '/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member'
  );
  return repos.map((r) => ({
    fullName: r.full_name,
    owner: r.owner.login,
    name: r.name,
    defaultBranch: r.default_branch,
    private: r.private,
    updatedAt: r.updated_at,
  }));
}

async function listBranches(token, owner, repo) {
  const branches = await ghFetch(token, `/repos/${owner}/${repo}/branches?per_page=100`);
  return branches.map((b) => b.name);
}

async function getRepoInfo(token, owner, repo) {
  return ghFetch(token, `/repos/${owner}/${repo}`);
}

/** Base64-encode a UTF-8 string safely (handles non-ASCII characters). */
function b64encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

/** Decode a base64 string back to UTF-8 text. */
function b64decode(str) {
  return decodeURIComponent(escape(atob(str.replace(/\n/g, ''))));
}

/** Get a text file's content + sha. Returns null if the file doesn't exist. */
async function getFile(token, owner, repo, branch, path) {
  try {
    const data = await ghFetch(
      token,
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(
        branch
      )}`
    );
    if (Array.isArray(data) || data.type !== 'file') return null;
    return { content: b64decode(data.content), sha: data.sha };
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

/** Get a binary file's raw base64 content + sha (images, pdfs, etc). */
async function getFileRaw(token, owner, repo, branch, path) {
  try {
    const data = await ghFetch(
      token,
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(
        branch
      )}`
    );
    if (Array.isArray(data) || data.type !== 'file') return null;
    return { base64: data.content, sha: data.sha, size: data.size, downloadUrl: data.download_url };
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

/** List a directory's contents. Returns [] if the directory doesn't exist. */
async function listDir(token, owner, repo, branch, path) {
  try {
    const data = await ghFetch(
      token,
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(
        branch
      )}`
    );
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err.status === 404) return [];
    throw err;
  }
}

/** Create or update a text file. Pass sha when updating an existing file. */
async function putFile(token, owner, repo, branch, path, content, message, sha) {
  const body = {
    message,
    content: b64encode(content),
    branch,
  };
  if (sha) body.sha = sha;
  return ghFetch(
    token,
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`,
    { method: 'PUT', body: JSON.stringify(body) }
  );
}

/** Create or update a binary file from an already-base64-encoded string. */
async function putFileBase64(token, owner, repo, branch, path, base64Content, message, sha) {
  const body = {
    message,
    content: base64Content,
    branch,
  };
  if (sha) body.sha = sha;
  return ghFetch(
    token,
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`,
    { method: 'PUT', body: JSON.stringify(body) }
  );
}

async function deleteFile(token, owner, repo, branch, path, message, sha) {
  return ghFetch(
    token,
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`,
    { method: 'DELETE', body: JSON.stringify({ message, sha, branch }) }
  );
}

async function getCommits(token, owner, repo, branch, path, limit = 20) {
  let url = `/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=${limit}`;
  if (path) url += `&path=${encodeURIComponent(path)}`;
  const commits = await ghFetch(token, url);
  return commits.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    authorName: c.commit.author?.name || 'unknown',
    date: c.commit.author?.date || '',
    url: c.html_url,
  }));
}

/** Fetch a file's content as it existed at a specific commit/ref. */
async function getFileAtRef(token, owner, repo, path, ref) {
  const data = await ghFetch(
    token,
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(ref)}`
  );
  if (Array.isArray(data) || data.type !== 'file') return null;
  return { content: b64decode(data.content), sha: data.sha };
}

window.GitHubAPI = {
  GitHubError,
  validateToken,
  listRepos,
  listBranches,
  getRepoInfo,
  getFile,
  getFileRaw,
  listDir,
  putFile,
  putFileBase64,
  deleteFile,
  getCommits,
  getFileAtRef,
  b64encode,
  b64decode,
};
