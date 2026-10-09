// Cloudflare Pages Function — /api/links
//
//   GET     /api/links          -> { links: [...] }              (public)
//   POST    /api/links { link } -> adds one, returns the list    (auth)
//   DELETE  /api/links { url }  -> removes one, returns the list (auth)
//
// Storage is a single KV key holding the whole array — the list is tiny, so
// one read/write beats a key-per-link. Needs a KV namespace bound to this
// project as LINKS, and a secret in LINKS_TOKEN for the write paths.

const KEY = 'links';
const MAX_LINKS = 60;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

/** Bearer token check against the LINKS_TOKEN env var. Compared in constant
 *  time so the comparison itself doesn't leak the token's length or prefix. */
function authorized(request, env) {
  const want = (env && env.LINKS_TOKEN) || '';
  if (!want) return false;
  const got = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i += 1) diff |= got.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
}

const store = (env) => env && env.LINKS;

async function read(env) {
  const raw = await store(env).get(KEY);
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function onRequestGet({ env }) {
  if (!store(env)) return json({ links: [], error: 'no LINKS binding' }, 200);
  return json({ links: await read(env) });
}

export async function onRequestPost({ request, env }) {
  if (!store(env)) return json({ error: 'no LINKS binding' }, 503);
  if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }

  const incoming = body && body.link;
  const url = incoming && typeof incoming.url === 'string' ? incoming.url.trim() : '';
  if (!url) return json({ error: 'missing url' }, 400);

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return json({ error: 'invalid url' }, 400);
  }
  if (!/^https?:$/.test(parsed.protocol)) return json({ error: 'only http(s)' }, 400);

  const list = await read(env);
  if (list.some((l) => l.url === parsed.href)) {
    return json({ links: list, error: 'already saved' }, 409);
  }

  const entry = {
    url: parsed.href,
    title: String(incoming.title || '').slice(0, 140),
    description: String(incoming.description || '').slice(0, 300),
    image: String(incoming.image || '').slice(0, 600),
    site: String(incoming.site || parsed.hostname.replace(/^www\./, '')).slice(0, 80),
    addedAt: new Date().toISOString(),
  };

  list.unshift(entry);
  await store(env).put(KEY, JSON.stringify(list.slice(0, MAX_LINKS)));
  return json({ links: list });
}

export async function onRequestDelete({ request, env }) {
  if (!store(env)) return json({ error: 'no LINKS binding' }, 503);
  if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }

  const url = body && typeof body.url === 'string' ? body.url : '';
  if (!url) return json({ error: 'missing url' }, 400);

  const list = (await read(env)).filter((l) => l.url !== url);
  await store(env).put(KEY, JSON.stringify(list));
  return json({ links: list });
}
