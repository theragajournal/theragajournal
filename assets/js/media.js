/**
 * media.js — list/upload/delete media files, stored under media/ in the repo.
 */

const MEDIA_DIR = 'media';

function inferMediaType(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (['png','jpg','jpeg','gif','webp','svg','avif'].includes(ext)) return 'image';
  if (['mp4','webm','mov'].includes(ext)) return 'video';
  if (['mp3','wav','ogg','m4a'].includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  if (['doc','docx','txt','zip'].includes(ext)) return 'document';
  return 'other';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const Media = {
  inferMediaType,

  async list(token, owner, repo, branch, folder = MEDIA_DIR) {
    const files = await window.GitHubAPI.listDir(token, owner, repo, branch, folder);
    const mediaFiles = files.filter((f) => f.type === 'file');
    let repoInfo = null;
    try { repoInfo = await window.GitHubAPI.getRepoInfo(token, owner, repo); } catch { /* ignore */ }
    return mediaFiles.map((f) => ({
      path: f.path,
      sha: f.sha,
      name: f.name,
      url: (repoInfo && !repoInfo.private)
        ? `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${f.path}`
        : (f.download_url || ''),
      size: f.size || 0,
      type: inferMediaType(f.name),
    }));
  },

  async upload(token, owner, repo, branch, file, folder = MEDIA_DIR) {
    const base64 = await fileToBase64(file);
    const safeName = file.name.replace(/\s+/g, '-').toLowerCase();
    const path = `${folder}/${Date.now()}-${safeName}`;
    const result = await window.GitHubAPI.putFileBase64(
      token, owner, repo, branch, path, base64, `Upload media: ${file.name}`
    );
    let repoInfo = null;
    try { repoInfo = await window.GitHubAPI.getRepoInfo(token, owner, repo); } catch { /* ignore */ }
    const url = (repoInfo && !repoInfo.private)
      ? `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
      : (result.content.download_url || '');
    return { path, sha: result.content.sha, url };
  },

  async remove(token, owner, repo, branch, item) {
    await window.GitHubAPI.deleteFile(token, owner, repo, branch, item.path, `Delete media: ${item.name}`, item.sha);
  },
};

window.Media = Media;
