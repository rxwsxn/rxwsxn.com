# rxwsxn.com

Personal site for **Raushan Kumar** (`ai + product`, Bangalore / remote).
Fast, always-dark, text-first. Astro static output, one hand-written
stylesheet, markdown content collections.

## Run it

Requires **Node 20+** (Astro 5).

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # -> dist/
npm run preview  # serve the built site
```

## Where things live

```
src/
  site.config.ts        # wordmark, tagline, links, email — edit me first
  styles/global.css     # the only stylesheet (tokens + all layout)
  layouts/Base.astro    # <head>, meta, OG/Twitter, RSS, header + footer
  components/           # Header, Footer, WorkItem, CopyEmail
  content/
    blog/*.md(x)        # dated notes  -> /blog/<slug>
    work/*.md(x)        # work items   -> /work (grouped, sorted)
    now.md              # the /now page body
  pages/
    index.astro         # /
    work.astro          # /work
    blog/index.astro    # /blog
    blog/[slug].astro   # /blog/<slug>
    now.astro           # /now
    about.astro         # /about
    contact.astro       # /contact
    404.astro           # not found, same layout
    rss.xml.ts          # /rss.xml
public/                 # robots.txt, favicon.svg, og.png
```

## Editing content

- **Work items** — add a file to `src/content/work/`. Frontmatter:
  `title`, `summary`, `stack: []`, `status` (`active|shipped|planned|paused|archived`),
  `year`, `group`, `order`, `links: [{ label, href }]`.
- **Blog posts** — add a file to `src/content/blog/`. Frontmatter:
  `title`, `date`, `summary`, `tags: []`, `draft`.
- **Now** — edit `src/content/now.md`. It renders to `/now`.
- **Links / email** — `src/site.config.ts`.

## Deploy

`dist/` is static — drop it on Netlify, Cloudflare Pages, Vercel, or any
static host. `site` in `astro.config.mjs` drives the sitemap and canonical URLs.
