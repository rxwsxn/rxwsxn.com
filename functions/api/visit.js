// Cloudflare Pages Function — GET /api/visit
//
// Returns the visitor number, the visitor's IP, and Cloudflare's country code.
//
// The count needs a KV namespace. In the Pages project: Settings → Functions →
// KV namespace bindings → add a binding named VISITS. Without it, `count` comes
// back as null and the UI just omits the number.
//
// Privacy: the IP is read at the edge from CF-Connecting-IP and handed straight
// back to the same visitor — it is never stored, logged or sent anywhere else.

export async function onRequestGet({ request, env }) {
  const cf = request.cf || {};
  const country = String(cf.country || 'XX');

  // the full address, shown only back to the visitor it belongs to
  const ip = (request.headers.get('CF-Connecting-IP') || '').trim();

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
