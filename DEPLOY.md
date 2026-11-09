# Deploying rxwsxn.com to Cloudflare Pages

This is a static Astro site: build command `npm run build`, output directory
`dist`. Two ways to ship it — pick one.

---

## Do this now — six steps

1. **Drop this build in and check it locally**

   ```bash
   unzip rxwsxn-mono.zip -d rxwsxn-mono && cd rxwsxn-mono
   nvm use            # or: nvm install 20
   bash scripts/preflight.sh
   ```

   Installs, builds, verifies `dist/` and all five API endpoints. If it stops, it
   says what to fix.

2. **Commit and push** — if the Pages project is Git-connected, this deploys.

   ```bash
   git add -A && git commit -m "studio, live publishing, sunflower field" && git push
   ```

3. **Environment variables** — Workers & Pages → `rxwsxn-com` → Settings →
   Environment variables, in **Production** *and* **Preview**:

   | name | value |
   | --- | --- |
   | `NODE_VERSION` | `20` |
   | `LINKS_TOKEN` | `openssl rand -hex 32` |
   | `STUDIO_TOKEN` | `openssl rand -hex 32` |
   | `GITHUB_TOKEN` | fine-grained PAT → Contents: Read and write |
   | `GITHUB_REPO` | `rxwsxn/rxwsxn.com` |
   | `GITHUB_BRANCH` | `main` |

4. **KV binding** — Settings → Functions → KV namespace bindings: variable name
   `LINKS`, namespace `rxwsxn-links`. The old `VISITS` namespace is unused now.

5. **Redeploy.** Variables only apply to new deployments: *Deployments → Retry
   deployment*, or push an empty commit.

6. **Verify** — `/`, `/work`, `/blog`, `/studio`. In the studio, paste
   `STUDIO_TOKEN` → **Check connection** → should read `connected · N posts`.

**No Git connection?** Build locally, then upload the folder:

```bash
bash scripts/preflight.sh
npx wrangler pages deploy dist --project-name rxwsxn-com
```

Functions in `./functions` go up with it; steps 3 and 4 still apply.


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

### 4c. Enable the /links editor

`/links` is an unlisted link-in-bio page, and `/links/edit` is a live editor for
adding custom link cards to it (paste a URL, it pulls the page's OG image and
title, you hit save). Both are excluded from the sitemap and marked noindex, and
nothing on the site links to either.

It needs two more things:

1. **A KV namespace for the links.** Same as 4b, but bind it as **`LINKS`**
   (a separate namespace, e.g. `rxwsxn-links`).
2. **An access token.** Settings → **Environment variables** → add
   `LINKS_TOKEN` with a long random value (e.g. `openssl rand -hex 32`). Set it
   for Production *and* Preview.

Then redeploy and open **`/links/edit`**, paste the token once, and you're in —
the token is kept in that browser's localStorage.

The token is required for every write and for the preview proxy. Without it the
editor can't save anything and `/api/preview` returns 401. Never commit it.

### 4d. Enable live publishing (the studio)

`/studio` writes posts straight into the repository through the GitHub Contents
API. Cloudflare Pages is already connected to that repo, so each publish is a
commit that triggers a build — the post is live in about a minute. No database,
no SSR.

**1. Make a GitHub token.** github.com → Settings → Developer settings →
Fine-grained tokens → *Generate new token*:

- Repository access: **Only select repositories** → `rxwsxn/rxwsxn.com`
- Permissions → Repository permissions → **Contents: Read and write**
- Expiration: whatever you're comfortable rotating

**2. Add four variables** in Workers & Pages → your project → **Settings** →
**Environment variables**, for **Production** *and* **Preview**:

| Variable        | Value                                   |
| --------------- | --------------------------------------- |
| `STUDIO_TOKEN`  | a long random string (`openssl rand -hex 32`) |
| `GITHUB_TOKEN`  | the fine-grained token from step 1      |
| `GITHUB_REPO`   | `rxwsxn/rxwsxn.com`                     |
| `GITHUB_BRANCH` | `main` (optional)                       |

**3. Redeploy**, open `/studio`, paste the `STUDIO_TOKEN` into the token field
and hit **Use**. *Load from repo* lists what's already there; **Publish** writes
the markdown and the 1200×630 card in one commit.

The token lives in that browser's `localStorage`. It is never in the page, and
every write is rejected without it.

**If it won't publish**, the status line under *Live · repository* names the
cause:

| status line says | what it means | fix |
| --- | --- | --- |
| `no /api route — Functions are not deployed yet` | the deployed build predates the studio API, or you're on `astro dev`, which never runs Functions | deploy this build; test publishing on the live URL |
| `server not configured — add STUDIO_TOKEN…` | the Functions are live but the env vars are missing | add all three, then **redeploy** (vars only apply to new deployments) |
| `token rejected — check STUDIO_TOKEN` | the token in the browser doesn't match the env var | paste it again |
| `github refused the write — …` | the PAT lacks **Contents: Read and write**, or `GITHUB_REPO` is wrong | fix the token/repo |
| `network — the request never left the browser` | offline, or a blocker | retry |

**Social cards** regenerate on every build via `prebuild` →
`images:missing`, which only draws cards that are absent. That needs Python 3
and Pillow on the build image; if they're missing the step exits 0 and the
committed PNGs are used. To force it, set the build command to:

```bash
python3 -m pip install --quiet pillow && npm run build
```

**Images** go through the same token: `/api/upload` commits them to
`public/images/<slug>/` and hands back the path to paste into markdown. Nothing
extra to configure.

**Publishing locally still works** — writing a `.md` in `src/content/blog/` and
pushing to `main` is the same pipeline the studio uses, just with you as the
author of the commit.

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
