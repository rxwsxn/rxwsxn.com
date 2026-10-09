# Deploying rxwsxn.com to Cloudflare Pages

This is a static Astro site: build command `npm run build`, output directory
`dist`. Two ways to ship it — pick one.

---

## Option A — Git integration (recommended)

Auto-deploys on every push. Best if you'll keep editing.

### 1. Push the project to GitHub

```bash
cd ~/Projects/rxwsxn.com
git init -b main
git add .
git commit -m "rxwsxn.com: initial site"
git remote add origin git@github.com:rxwsxn/rxwsxn.com.git
git push -u origin main
```

(Create the empty repo at github.com/rxwsxn first. Use the HTTPS remote if you
prefer: `https://github.com/rxwsxn/rxwsxn.com.git`.)

### 2. Create the Pages project

Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
**Connect to Git** → pick the repo.

Build settings:

| Setting                | Value           |
| ---------------------- | --------------- |
| Framework preset       | Astro           |
| Build command          | `npm run build` |
| Build output directory | `dist`          |

### 3. Pin the Node version

Astro 5 needs Node 18.17+/20+. The repo ships `.nvmrc` (`20`), but Cloudflare
builds read the **`NODE_VERSION`** environment variable — set it explicitly:

Workers & Pages → your project → **Settings** → **Environment variables** →
Production **and** Preview:

```
NODE_VERSION = 20
```

### 4. Deploy

Save and Deploy. Every push to `main` redeploys; other branches get preview URLs.

### 4b. Enable the visitor counter

The footer counter is served by `functions/api/visit.js` and needs one KV
namespace:

1. Workers & Pages → **KV** → **Create a namespace** (name it e.g. `rxwsxn-visits`).
2. Your Pages project → **Settings** → **Functions** → **KV namespace bindings**
   → **Add binding**. Variable name: **`VISITS`**, namespace: the one you made.
3. Redeploy. The footer then shows `visitor #N · <ip> · 🇮🇳`.

Until this is done the function still returns the IP and country flag — the
number is just omitted, and the browser console logs a warning telling you the
`VISITS` binding is missing.

### 4c. Enable the /links editor

`/links` is an unlisted link-in-bio page, and `/links/edit` is a live editor for
adding custom link cards to it (paste a URL, it pulls the page's OG image and
title, you hit save). Both are excluded from the sitemap and marked noindex, and
nothing on the site links to either.

It needs two more things:

1. **A KV namespace for the links.** Same as 4b, but bind it as **`LINKS`**
   (a separate namespace, e.g. `rxwsxn-links`, so link edits and the visit
   count don't share one).
2. **An access token.** Settings → **Environment variables** → add
   `LINKS_TOKEN` with a long random value (e.g. `openssl rand -hex 32`). Set it
   for Production *and* Preview.

Then redeploy and open **`/links/edit`**, paste the token once, and you're in —
the token is kept in that browser's localStorage.

The token is required for every write and for the preview proxy. Without it the
editor can't save anything and `/api/preview` returns 401. Never commit it.

### 5. Custom domain
Project → **Custom domains** → **Set up a custom domain** → `rxwsxn.com`
(and `www.rxwsxn.com`). If the domain's DNS is already on Cloudflare this wires
up automatically; otherwise add the `CNAME` Cloudflare shows you at your
registrar.

---

## Option B — Direct upload (no repo)

```bash
cd ~/Projects/rxwsxn.com
npm install
npm run build
npx wrangler pages deploy dist --project-name rxwsxn-com
```

First run opens a browser to authorise wrangler with your Cloudflare account.
Re-run the last command to publish a new build. Custom domain is set the same
way (step 5 above).

---

## What's already handled

- **`public/_headers`** — security headers + long-lived caching for `/_astro/*`.
  Pages applies it automatically; no config needed.
- **`404.html`** — Pages serves this automatically for unknown routes.
- **Sitemap + robots** — `astro.config.mjs` sets `site: https://rxwsxn.com`, so
  canonical URLs, `/sitemap-index.xml`, and `/rss.xml` are correct once the
  domain is live.
- **No `_redirects` file needed** — every route is a real static page.

## Sanity check before you deploy

```bash
npm run build && npm run preview   # http://localhost:4321
```
