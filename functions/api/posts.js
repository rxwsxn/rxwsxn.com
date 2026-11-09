// Cloudflare Pages Function — /api/posts
//
//   GET  /api/posts            -> { posts: [{ slug, title, date, draft, summary, tags }] }
//   GET  /api/posts?slug=foo   -> { post: { slug, title, date, draft, summary, tags, body } }
//   DELETE /api/posts { slug } -> removes the markdown from the repo
//
// Reads the content directory through the GitHub Contents API so the studio
// can list and reopen what's already in the repository. Same env vars as
// /api/publish (GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH, STUDIO_TOKEN).

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

const DIR = 'src/content/blog';

async function gh(env, path, init = {}) {
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.GITHUB_TOKEN}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'rxwsxn-studio',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`github ${res.status} ${path}`);
  return res.json();
}

/** Minimal frontmatter reader — enough for the fields the studio writes. */
function parse(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: md };

  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, raw] = kv;
    let value = raw.trim();

    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((t) => t.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else if (value === 'true' || value === 'false') {
      value = value === 'true';
    } else {
      value = value.replace(/^["']|["']$/g, '');
    }
    data[key] = value;
  }
  return { data, body: m[2] };
}

export async function onRequestGet({ request, env }) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return json({ error: 'not configured (GITHUB_TOKEN / GITHUB_REPO)' }, 503);
  }
  if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);

  const slug = new URL(request.url).searchParams.get('slug');

  try {
    if (slug) {
      const file = await gh(env, `${DIR}/${slug}.md`);
      const md = atob(file.content.replace(/\n/g, ''));
      const text = decodeURIComponent(escape(md));
      const { data, body } = parse(text);
      return json({ post: { slug, ...data, body } });
    }

    const list = await gh(env, DIR);
    const files = (Array.isArray(list) ? list : []).filter((f) => /\.mdx?$/.test(f.name));

    const posts = await Promise.all(
      files.slice(0, 60).map(async (f) => {
        const item = await gh(env, f.path);
        const text = decodeURIComponent(escape(atob(item.content.replace(/\n/g, ''))));
        const { data } = parse(text);
        return {
          slug: f.name.replace(/\.mdx?$/, ''),
          title: data.title || f.name,
          date: data.date || '',
          draft: data.draft === true,
          summary: data.summary || '',
          tags: Array.isArray(data.tags) ? data.tags : [],
        };
      }),
    );

    posts.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return json({ posts });
  } catch (err) {
    return json({ error: String(err.message || err) }, 502);
  }
}

export async function onRequestDelete({ request, env }) {
  if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }

  const slug = String(body && body.slug ? body.slug : '').replace(/[^a-z0-9-]/gi, '');
  if (!slug) return json({ error: 'missing slug' }, 400);

  try {
    const file = await gh(env, `${DIR}/${slug}.md`);
    const res = await fetch(
      `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${DIR}/${slug}.md`,
      {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${env.GITHUB_TOKEN}`,
          accept: 'application/vnd.github+json',
          'x-github-api-version': '2022-11-28',
          'user-agent': 'rxwsxn-studio',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ message: `delete post: ${slug}`, sha: file.sha }),
      },
    );
    if (!res.ok) throw new Error(`github ${res.status}`);
    return json({ ok: true });
  } catch (err) {
    return json({ error: String(err.message || err) }, 502);
  }
}
