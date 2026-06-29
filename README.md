# The Raga Journal

Zero build step. No `npm install`, no React, no bundler — just HTML, CSS,
and vanilla JavaScript. Push this folder to a GitHub repo, turn on Pages,
and you get two things at once:

1. **A public front page** (`index.html`, styled after the Wall Street
   Journal's broadsheet layout) that any visitor can read — no login.
2. **A private CMS dashboard** (`/cms/`) where you write and publish,
   logged in with your own GitHub token.

Both read and write the same `articles/` folder in your repo. Publish an
article from the CMS, and it appears on the public front page
automatically — no rebuild, no redeploy, no second step.

## One manual step before this works: point the front page at your repo

The public front page (`index.html`, `article.html`) doesn't require
login, which means it needs to be told in advance which repository to
read from. Open **`assets/js/site-config.js`** and fill in:

```js
window.SITE_REPO = {
  owner: 'YOUR_GITHUB_USERNAME',
  repo: 'YOUR_REPO_NAME',
  branch: 'main',
};
```

This is the only required edit. Everything else works out of the box.

**Important:** this only works if the repository is **public**. GitHub has
no concept of an anonymous, unauthenticated read on a private repo, so a
public front page can't pull from one. If you need your source repo
private, see "Private repos" near the bottom of this file.

## Quick start

### 1. Try it locally (optional)

```bash
cd raga-journal-html
python3 -m http.server 8080
# open http://localhost:8080
```
(Some browsers block `fetch()` from `file://` pages, so a tiny local
server avoids that entirely.)

### 2. Get a GitHub token (for the CMS only — visitors never need one)

[github.com/settings/tokens/new](https://github.com/settings/tokens/new?scopes=repo&description=Raga+Journal+CMS) →
classic token, `repo` scope. Stored only in your browser's `localStorage`,
sent only to `api.github.com`.

### 3. Pick a repo and branch in the CMS

Open `cms/login.html`, log in, choose the repo. The CMS reads/writes:

```
articles/    published, scheduled, in-review, and archived posts
drafts/      draft posts
media/       uploaded images, video, audio, PDFs
config/      site.json (settings) and taxonomy.json (categories/tags)
```

## Deploying so your domain auto-updates on every push

1. **Edit `assets/js/site-config.js`** as described above, before pushing.

2. **Push this folder to a GitHub repo:**
   ```bash
   cd raga-journal-html
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```

3. **Turn on GitHub Pages**: repo → **Settings → Pages** → Source:
   **Deploy from a branch** → branch `main`, folder `/(root)` → Save.

4. **Connect your Cloudflare domain**: still in **Settings → Pages**, add
   your custom domain. GitHub shows a value to add as a CNAME record —
   add that in Cloudflare DNS, pointing your domain at
   `YOUR_USERNAME.github.io`.

5. From here on, every `git push` (or edit made directly on github.com)
   republishes automatically within about a minute — no build, no Action.

## Using it day to day

**Readers** go to your domain and see the front page — masthead, lead
story, headline grid, sidebar, photo cards — built from whatever you've
published.

**You** go to `yourdomain.com/cms/login.html`, log in, write, hit **Commit
to GitHub**. That commit is the entire publish step. Refresh the front
page (or just wait — visitors will see it on their next visit) and the
new article is live.

## What's on the front page

- Centered masthead with your wordmark, date line, hairline + heavy rule
  pair (the signature "drone pulse" animates once on load — a nod to the
  CMS's own sync indicator)
- Sticky section nav with smooth-scroll anchors to on-page sections
- Lead story (your most recently published article) with a large
  headline and dek
- Secondary headline list, sidebar "Inside This Issue" rail, and a quote
  box
- A photo-card grid for additional stories
- Category-sorted text rails (Reviews, Interviews, Tabla & Percussion,
  Essays — edit the section list directly in `index.html` to match your
  own categories)
- A newsletter signup strip (currently a static form — wire it to a real
  provider per "Extending this CMS" below)

Before you've published anything, the front page shows clearly-labeled
sample content so it never looks broken — once you publish your first
real article, that takes over automatically.

## What's intentionally not included

OAuth app login, Google Sign-In, AI writing tools, real newsletter
delivery, analytics, comment systems — these need either a backend with
secret keys or a registered OAuth app, which a static, buildless site
can't hold safely. See **Extending this CMS** below.

## Private repos

If your content must live in a private repo, the public front page can't
read it directly (see note above). Two ways around this:

- **Split repos**: keep articles in a private repo for the CMS, and have
  a small scheduled GitHub Action copy *only* published articles into a
  separate public repo that the front page reads from. More setup, fully
  private source.
- **Make the content repo public** but keep drafts genuinely private by
  writing them to a different, private repo and only moving finished
  pieces into the public one when ready to publish.

Either way needs a short GitHub Action — ask if you want one written out.

## Project structure

```
index.html              Public front page (WSJ-style)
article.html             Public single-article view
assets/css/
  front-page.css          Public site design system
  tokens.css               CMS design tokens
  shell.css                 CMS sidebar layout
assets/js/
  site-config.js           <- edit this: which repo the public site reads
  public-content.js         Unauthenticated reads for the public site
  github.js                  Every authenticated GitHub API call (CMS)
  auth.js                     CMS token storage, multi-account, repo/branch
  articles.js, media.js        CMS data layers
  markdown.js                   Shared frontmatter parser (both sides use it)
  shell.js, util.js              CMS UI helpers

cms/                     Private dashboard - everything here requires login
  login.html, select-repo.html, dashboard.html, articles.html,
  editor.html, media.html, categories.html, settings.html
```

## Extending this CMS

- **Real newsletter delivery** - the signup form in `index.html` is
  currently cosmetic. Wire its `onsubmit` to a Buttondown/ConvertKit API
  via a small serverless function (don't put API keys in client code).
- **More front-page sections** - duplicate a `.text-rail-col` block in
  `index.html`'s `renderFrontPage()` function, or add categories there to
  match whatever you create in the CMS's Categories page.
- **RSS/Atom feed** - add a small GitHub Action that runs on push,
  regenerates an `rss.xml` from `articles/*.md`, and commits it back.
- **AI writing assistant** - call an LLM API from `cms/editor.html` and
  insert the result with `document.execCommand('insertHTML', ...)`.

## Security note

Pure client-side app. Your CMS token lives in your browser's
`localStorage` and goes straight to `api.github.com` over HTTPS - nothing
in between. The public front page sends no credentials at all. Revoke
your token any time from GitHub's token settings to cut off CMS access
instantly; it has no effect on the public site, which doesn't use it.
