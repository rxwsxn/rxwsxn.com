// Cloudflare Pages Function — POST /api/upload
//
// Commits an image into the repository so the post can reference it:
//   public/images/<slug>/<name>
// Returns { ok, url, path, commit }. The URL is what you paste into markdown.
//
// Same env vars as /api/publish (STUDIO_TOKEN, GITHUB_TOKEN, GITHUB_REPO,
// GITHUB_BRANCH). Request body: { slug, filename, type, data } where data is
// base64 with no data: prefix.

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

function authorized(request, env) {
  const want = (env && env.STUDIO_TOKEN) || '';
  if (!want) return false;
  const got = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i += 1) diff |= got.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
}

const OK_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']);
const MAX_B64 = 8 * 1024 * 1024; // ~6MB of image

const clean = (s, fallback) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || fallback;

const extOf = (type) =>
  ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' })[
    type
  ] || 'png';

async function gh(env, path, init = {}) {
  return fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'rxwsxn-studio',
      ...(init.headers || {}),
    },
  });
}

async function shaOf(env, path) {
  const res = await gh(env, path, { method: 'GET' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`github ${res.status} reading ${path}`);
  const data = await res.json();
  return data.sha || null;
}

export async function onRequestPost({ request, env }) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return json({ error: 'publishing is not configured (GITHUB_TOKEN / GITHUB_REPO)' }, 503);
  }
  if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }

  const type = String(body.type || '').toLowerCase();
  if (!OK_TYPES.has(type)) return json({ error: `unsupported type: ${type || 'none'}` }, 415);

  const data = String(body.data || '').replace(/^data:[^,]+,/, '');
  if (!data) return json({ error: 'missing data' }, 400);
  if (data.length > MAX_B64) return json({ error: 'image too large (max ~6MB)' }, 413);

  const slug = clean(body.slug, 'misc');
  const base = clean(String(body.filename || '').replace(/\.[^.]+$/, ''), 'image');
  const name = `${base}.${extOf(type)}`;
  const path = `public/images/${slug}/${name}`;

  try {
    const sha = await shaOf(env, path);
    const res = await gh(env, path, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: `image: ${slug}/${name}`,
        content: data,
        branch: env.GITHUB_BRANCH || 'main',
        ...(sha ? { sha } : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`github ${res.status}: ${detail.slice(0, 160)}`);
    }

    const out = await res.json();
    return json({
      ok: true,
      path,
      url: `/images/${slug}/${name}`,
      commit: out.commit && out.commit.sha ? out.commit.sha.slice(0, 7) : 'ok',
    });
  } catch (err) {
    return json({ error: String(err.message || err) }, 502);
  }
}
