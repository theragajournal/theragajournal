/**
 * markdown.js — frontmatter parsing/serialization, slugify, word count.
 * Frontmatter is a restricted YAML subset (strings, numbers, booleans,
 * flat arrays, one level of nested object for `seo`) — enough for this
 * CMS's own data, written and read only by this CMS, so we don't need a
 * full YAML parser.
 */

const DEFAULT_FRONTMATTER = () => ({
  title: 'Untitled',
  slug: '',
  status: 'draft',
  excerpt: '',
  coverImage: '',
  authorId: '',
  categories: [],
  tags: [],
  publishedAt: '',
  scheduledFor: '',
  updatedAt: new Date().toISOString(),
  featured: false,
  pinned: false,
  passwordProtected: false,
  seo: { metaDescription: '', canonicalUrl: '', noindex: false },
});

function yamlScalar(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  const str = String(value);
  // Quote if it contains characters that would otherwise confuse a simple parser.
  if (/^$|[:#\[\]{}\n]|^[-?!&*]| $/.test(str) || str === '') {
    return `'${str.replace(/'/g, "''")}'`;
  }
  return str;
}

function parseScalar(raw) {
  let v = raw.trim();
  if (v === '') return '';
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (
    (v.startsWith("'") && v.endsWith("'")) ||
    (v.startsWith('"') && v.endsWith('"'))
  ) {
    return v.slice(1, -1).replace(/''/g, "'");
  }
  return v;
}

/** Serialize frontmatter (a flat-ish object) + body into a `---` delimited markdown file. */
function serializeArticleFile(frontmatter, body) {
  const lines = ['---'];
  const fm = { ...frontmatter, updatedAt: new Date().toISOString() };
  for (const key of Object.keys(fm)) {
    const value = fm[key];
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        value.forEach((item) => lines.push(`  - ${yamlScalar(item)}`));
      }
    } else if (value && typeof value === 'object') {
      lines.push(`${key}:`);
      for (const subKey of Object.keys(value)) {
        lines.push(`  ${subKey}: ${yamlScalar(value[subKey])}`);
      }
    } else {
      lines.push(`${key}: ${yamlScalar(value)}`);
    }
  }
  lines.push('---', '', body.trim(), '');
  return lines.join('\n');
}

/** Parse a markdown file with `---` frontmatter into { frontmatter, body }. */
function parseArticleFile(raw) {
  const fm = DEFAULT_FRONTMATTER();
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: fm, body: raw.trim() };
  }
  const [, yamlBlock, body] = match;
  const lines = yamlBlock.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const topMatch = line.match(/^(\w+):\s*(.*)$/);
    if (!topMatch) {
      i++;
      continue;
    }
    const [, key, inlineValue] = topMatch;
    if (inlineValue.trim() === '' ) {
      // Could be a list or nested object on following indented lines.
      const children = [];
      let j = i + 1;
      while (j < lines.length && /^\s+/.test(lines[j]) && lines[j].trim() !== '') {
        children.push(lines[j]);
        j++;
      }
      if (children.length && children[0].trim().startsWith('-')) {
        fm[key] = children.map((c) => parseScalar(c.replace(/^\s*-\s*/, '')));
      } else if (children.length) {
        const obj = {};
        children.forEach((c) => {
          const m = c.match(/^\s+(\w+):\s*(.*)$/);
          if (m) obj[m[1]] = parseScalar(m[2]);
        });
        fm[key] = obj;
      } else {
        fm[key] = key === 'seo' ? {} : [];
      }
      i = j;
    } else if (inlineValue.trim() === '[]') {
      fm[key] = [];
      i++;
    } else {
      fm[key] = parseScalar(inlineValue);
      i++;
    }
  }
  return { frontmatter: { ...fm }, body: body.trim() };
}

function slugify(input) {
  return (input || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function countWords(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function estimateReadingTime(text) {
  return Math.max(1, Math.round(countWords(text) / 200));
}

function stripHtmlForPreview(html, maxLen = 160) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  const text = (div.textContent || '').replace(/\s+/g, ' ').trim();
  return text.slice(0, maxLen);
}

window.MD = {
  DEFAULT_FRONTMATTER,
  serializeArticleFile,
  parseArticleFile,
  slugify,
  countWords,
  estimateReadingTime,
  stripHtmlForPreview,
};
