/**
 * articles.js — list/load/save/delete articles, backed directly by
 * GitHub content files under articles/ (published+) and drafts/.
 */

const ARTICLES_DIR = 'articles';
const DRAFTS_DIR = 'drafts';

const Articles = {
  /** List every article across articles/ and drafts/, newest-updated first. */
  async list(token, owner, repo, branch) {
    const [articleFiles, draftFiles] = await Promise.all([
      window.GitHubAPI.listDir(token, owner, repo, branch, ARTICLES_DIR),
      window.GitHubAPI.listDir(token, owner, repo, branch, DRAFTS_DIR),
    ]);
    const all = [...articleFiles, ...draftFiles].filter(
      (f) => f.type === 'file' && f.name.endsWith('.md')
    );
    const loaded = await Promise.all(
      all.map(async (f) => {
        const file = await window.GitHubAPI.getFile(token, owner, repo, branch, f.path);
        if (!file) return null;
        const { frontmatter, body } = window.MD.parseArticleFile(file.content);
        return {
          path: f.path,
          sha: file.sha,
          frontmatter,
          preview: window.MD.stripHtmlForPreview(body, 160),
        };
      })
    );
    const valid = loaded.filter(Boolean);
    valid.sort((a, b) => new Date(b.frontmatter.updatedAt) - new Date(a.frontmatter.updatedAt));
    return valid;
  },

  /** Load one article's full content by path. */
  async load(token, owner, repo, branch, path) {
    const file = await window.GitHubAPI.getFile(token, owner, repo, branch, path);
    if (!file) return null;
    const { frontmatter, body } = window.MD.parseArticleFile(file.content);
    return { path, sha: file.sha, frontmatter, body };
  },

  pathFor(slug, status) {
    const dir = status === 'draft' ? DRAFTS_DIR : ARTICLES_DIR;
    return `${dir}/${slug}.md`;
  },

  /**
   * Save an article. Creates a new file, or updates in place if the path
   * hasn't changed. If the slug or status changed such that the file
   * should live at a new path, writes the new file then deletes the old
   * one as a second commit.
   */
  async save(token, owner, repo, branch, { existingPath, existingSha, frontmatter, body, commitMessage }) {
    const newPath = this.pathFor(frontmatter.slug, frontmatter.status);
    const content = window.MD.serializeArticleFile(frontmatter, body);
    const message =
      commitMessage ||
      (existingPath ? `Update article: ${frontmatter.title}` : `Create article: ${frontmatter.title}`);

    if (existingPath && existingPath === newPath && existingSha) {
      const result = await window.GitHubAPI.putFile(
        token, owner, repo, branch, newPath, content, message, existingSha
      );
      return { path: newPath, sha: result.content.sha };
    }

    const result = await window.GitHubAPI.putFile(token, owner, repo, branch, newPath, content, message);
    if (existingPath && existingSha) {
      await window.GitHubAPI.deleteFile(
        token, owner, repo, branch, existingPath, `${message} (moved from ${existingPath})`, existingSha
      );
    }
    return { path: newPath, sha: result.content.sha };
  },

  async remove(token, owner, repo, branch, article) {
    await window.GitHubAPI.deleteFile(
      token, owner, repo, branch, article.path, `Delete article: ${article.frontmatter.title}`, article.sha
    );
  },
};

window.Articles = Articles;
