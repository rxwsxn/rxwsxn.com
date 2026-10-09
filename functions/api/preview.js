// Cloudflare Pages Function — GET /api/preview?url=<target>
//
// Fetches a page server-side and pulls out its Open Graph metadata, so the
// editor can show a card without tripping over CORS. Returns
// { url, title, description, image, site }.
//
// Auth-gated: it is an outbound fetch proxy, so it must not be open to the
// world. Same LINKS_TOKEN as /api/links.

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

function authorized(request, env) {
  const want = (env && env.LINKS_TOKEN) || '';
  if (!want) return false;
  const got = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i += 1) diff |= got.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
}

const decode = (s) =>
  String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();

/** og:foo / twitter:foo / description, in either attribute order. */
function meta(html, prop) {
  const esc = prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pats = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${esc}["'][^>]*?content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*?(?:property|name)=["']${esc}["']`, 'i'),
  ];
  for (const p of pats) {
    const m = html.match(p);
    if (m && m[1]) return decode(m[1]);
  }
  return '';
}

/** Keep the proxy from being pointed at the local network. */
function isBlockedHost(hostname) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal')) return true;
  if (!h.includes('.') && !h.includes(':')) return true; // bare hostname
  if (/^127\./.test(h) || /^0\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^::1$/.test(h) || /^f[cd][0-9a-f]{2}:/.test(h) || /^fe80:/.test(h)) return true;
  return false;
}

export async function onRequestGet({ request, env }) {
  if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);

  const target = new URL(request.url).searchParams.get('url') || '';
  let u;
  try {
    u = new URL(target);
  } catch {
    return json({ error: 'invalid url' }, 400);
  }
  if (!/^https?:$/.test(u.protocol)) return json({ error: 'only http(s)' }, 400);
  if (isBlockedHost(u.hostname)) return json({ error: 'blocked host' }, 400);

  let res;
  try {
    res = await fetch(u.href, {
      headers: {
        // some sites only serve OG tags to something that looks like a browser
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en',
      },
    });
  } catch {
    return json({ error: 'could not reach that url' }, 502);
  }

  if (!res.ok) return json({ error: `upstream returned ${res.status}` }, 502);

  const type = res.headers.get('content-type') || '';
  if (type && !/text\/html|application\/xhtml/i.test(type)) {
    return json({ error: 'not an html page' }, 415);
  }

  const html = (await res.text()).slice(0, 500_000);

  const title =
    meta(html, 'og:title') ||
    meta(html, 'twitter:title') ||
    decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');

  const description = meta(html, 'og:description') || meta(html, 'twitter:description') || meta(html, 'description');

  let image = meta(html, 'og:image') || meta(html, 'twitter:image');
  if (image) {
    if (image.startsWith('//')) image = u.protocol + image;
    else if (image.startsWith('/')) image = u.origin + image;
    else if (!/^https?:/i.test(image)) image = u.origin + '/' + image.replace(/^\.?\//, '');
  }

  return json({
    url: u.href,
    title: title.slice(0, 140),
    description: description.slice(0, 300),
    image,
    site: u.hostname.replace(/^www\./, ''),
  });
}
