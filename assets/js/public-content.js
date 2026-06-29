/**
 * public-content.js — reads published articles from GitHub without
 * requiring the visitor to log in. Uses the unauthenticated GitHub
 * Contents API (fine for public repos; rate-limited to 60 req/hour per
 * IP, which is enough for a front page that fetches once and caches in
 * memory for the page's lifetime).
 *
 * If your articles live in a *private* repo, the public front page
 * cannot read them this way — GitHub has no concept of a public,
 * unauthenticated read on a private repo. In that case, either make the
 * content repo public, or set up a small build step that exports
 * published articles to public JSON (see README "Private repos" note).
 */

const PublicContent = {
  _cache: null,

  async _fetchJson(path) {
    const { owner, repo, branch } = window.SITE_REPO;
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers: { Accept: 'application/vnd.github+json' } }
    );
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`GitHub API error (${res.status}) while reading ${path}`);
    }
    return res.json();
  },

  async _fetchRaw(path) {
    const { owner, repo, branch } = window.SITE_REPO;
    const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Could not fetch ${path} (${res.status})`);
    }
    return res.text();
  },

  /** List + parse every published article. Cached for the page's lifetime. */
  async listPublished() {
    if (this._cache) return this._cache;
    const dirData = await this._fetchJson('articles');
    if (!dirData || !Array.isArray(dirData)) {
      this._cache = [];
      return [];
    }
    const mdFiles = dirData.filter((f) => f.type === 'file' && f.name.endsWith('.md'));
    const loaded = await Promise.all(
      mdFiles.map(async (f) => {
        const raw = await this._fetchRaw(f.path);
        if (!raw) return null;
        const { frontmatter, body } = window.MD.parseArticleFile(raw);
        if (frontmatter.status !== 'published') return null;
        return { path: f.path, frontmatter, body };
      })
    );
    const valid = loaded.filter(Boolean);
    valid.sort((a, b) => {
      const aDate = a.frontmatter.publishedAt || a.frontmatter.updatedAt;
      const bDate = b.frontmatter.publishedAt || b.frontmatter.updatedAt;
      return new Date(bDate) - new Date(aDate);
    });
    this._cache = valid;
    return valid;
  },

  async getBySlug(slug) {
    const all = await this.listPublished();
    return all.find((a) => a.frontmatter.slug === slug) || null;
  },

  imageUrlFor(mediaPath) {
    const { owner, repo, branch } = window.SITE_REPO;
    if (!mediaPath) return '';
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${mediaPath}`;
  },
};

window.PublicContent = PublicContent;
