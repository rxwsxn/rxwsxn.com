// Cloudflare Pages Function — GET /api/visit
//
// Returns the visitor number, a MASKED IP, and Cloudflare's country code.
//
// The count needs a KV namespace. In the Pages project: Settings → Functions →
// KV namespace bindings → add a binding named VISITS. Without it, `count` comes
// back as null and the UI just omits the number.
//
// Privacy: the full IP never leaves the edge — it's reduced to a partial
// address here, and it's only ever shown back to the visitor themselves.

export async function onRequestGet({ request, env }) {
  const cf = request.cf || {};
  const country = String(cf.country || 'XX');

  const raw = request.headers.get('CF-Connecting-IP') || '';
  let ip = '';
  if (raw.includes(':')) {
    // IPv6 -> keep the first three groups
    ip = raw.split(':').slice(0, 3).join(':') + '::';
  } else if (raw) {
    const parts = raw.split('.');
    ip = parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.x` : '';
  }

  // one increment per browser, not per pageview
  const cookie = request.headers.get('Cookie') || '';
  const seen = /(?:^|;\s*)rxwsxn_seen=1/.test(cookie);

  let count = null;
  if (env && env.VISITS) {
    let cur = parseInt((await env.VISITS.get('count')) || '0', 10);
    if (!Number.isFinite(cur)) cur = 0;
    if (!seen) {
      cur += 1;
      await env.VISITS.put('count', String(cur));
    }
    count = cur;
  }

  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  if (!seen) {
    headers.append('set-cookie', 'rxwsxn_seen=1; Path=/; Max-Age=31536000; SameSite=Lax; Secure');
  }

  return new Response(JSON.stringify({ count, country, ip }), { headers });
}
