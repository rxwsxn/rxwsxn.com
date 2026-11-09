// Cloudflare Pages Function — POST /api/publish
//
// Publishes a post from the studio: writes the markdown (and optionally the
// social card) straight into the repository through the GitHub Contents API.
// Cloudflare Pages is connected to that repo, so the commit triggers a build
// and the post is live about a minute later — no SSR, no runtime database.
//
// Needs, in the Pages project (Settings → Environment variables):
//   STUDIO_TOKEN   long random string; the studio sends it as a Bearer token
//   GITHUB_TOKEN   fine-grained PAT with "Contents: read and write" on the repo
//   GITHUB_REPO    e.g. rxwsxn/rxwsxn.com
//   GITHUB_BRANCH  optional, defaults to main
//
// Request:  { slug, title, date, summary, tags[], body, draft, og? }
// Response: { ok, path, commit, url }

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

/** Constant-time bearer check. */
function authorized(request, env) {
  const want = (env && env.STUDIO_TOKEN) || '';
  if (!want) return false;
  const got = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i += 1) diff |= got.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
}

const slugify = (input) =>
  String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);

/** UTF-8 safe base64 for the Contents API. */
function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** YAML-safe scalar: JSON strings are valid YAML for the cases we emit. */
const yaml = (s) => JSON.stringify(String(s ?? ''));

function frontmatter(post) {
  const tags = Array.isArray(post.tags) ? post.tags.filter(Boolean) : [];
  const lines = [
    '---',
    `title: ${yaml(post.title || 'untitled')}`,
    `date: ${yaml(post.date || new Date().toISOString().slice(0, 10))}`,
  ];
  if (post.summary) lines.push(`summary: ${yaml(post.summary)}`);
  lines.push(`tags: [${tags.join(', ')}]`);
  lines.push(`draft: ${post.draft ? 'true' : 'false'}`);
  lines.push('---', '', String(post.body || '').trim(), '');
  return lines.join('\n');
}

async function gh(env, path, init = {}) {
  const repo = env.GITHUB_REPO;
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'rxwsxn-studio',
      ...(init.headers || {}),
    },
  });
  return res;
}

/** Existing sha for a path, or null when the file is new. */
async function shaOf(env, path) {
  const res = await gh(env, path, { method: 'GET' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`github ${res.status} reading ${path}`);
  const data = await res.json();
  return data.sha || null;
}

async function put(env, path, base64, message) {
  const sha = await shaOf(env, path);
  const body = {
    message,
    content: base64,
    branch: env.GITHUB_BRANCH || 'main',
    ...(sha ? { sha } : {}),
  };

  const res = await gh(env, path, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`github ${res.status} writing ${path}: ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.commit && data.commit.sha ? data.commit.sha.slice(0, 7) : 'ok';
}

export async function onRequestPost({ request, env }) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return json({ error: 'publishing is not configured (GITHUB_TOKEN / GITHUB_REPO)' }, 503);
  }
  if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);

  let post;
  try {
    post = await request.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }

  const slug = slugify(post.slug || post.title);
  if (!slug) return json({ error: 'missing title or slug' }, 400);
  if (!String(post.body || '').trim()) return json({ error: 'empty body' }, 400);

  const mdPath = `src/content/blog/${slug}.md`;
  const message = `${post.draft ? 'draft' : 'post'}: ${post.title || slug}`;

  try {
    const commit = await put(env, mdPath, toBase64(frontmatter(post)), message);

    // optional social card: the studio renders it and sends base64 PNG
    if (post.og && typeof post.og === 'string' && post.og.length > 100) {
      await put(env, `public/og/${slug}.png`, post.og, `card: ${slug}`);
    }

    return json({
      ok: true,
      slug,
      path: mdPath,
      commit,
      url: `https://rxwsxn.com/blog/${slug}/`,
      draft: Boolean(post.draft),
    });
  } catch (err) {
    return json({ error: String(err.message || err) }, 502);
  }
}

export async function onRequestGet() {
  return json({ error: 'use POST' }, 405);
}
