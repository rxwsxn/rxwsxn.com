# rxwsxn.com — monochrome pass

Rebuilt on the design language of ggdesign.it: flat, dark, monochrome, large
type, numbered sections. No glass, no gradients, no accent hue — contrast and
scale do all the work.

Drop over the project root, `npm install && npm run build`, deploy.

## What changed

**Theme.** Dark by default, with a switch in the header that flips the whole
page to a paper light theme (`#f2efe9` ground, `#121212` ink, greys re-tuned).
The choice persists in `localStorage`, is applied before first paint by an
inline script in `Base.astro`, and the canvases re-read it every frame so the
attractor strokes invert too.

**Palette.** `#0b0b0b` ground, `#f4f1ea` text, `#8b8b86` / `#5c5c58` for the two
greys, hairlines at 16% and 9%. No colour anywhere — links, hovers and the
active nav state are pure white-on-black. The light theme and its toggle are
gone; the reference is dark-only.

**Type.** Archivo (400–900) for everything structural, Instrument Serif italic
for the asides and captions. Display sizes run to 128px on the hero with
−0.055em tracking, and the hero mixes the two faces inside one sentence.

**Structure.** Numbered sections — `(01) Work`, `(02) Capabilities`,
`(03) Writing` — with the counter in its own left column, the heading in the
second, and an italic serif line right-aligned in the third. Work and writing
are hairline rows with an index, a title, a summary and a period, separated by
1px rules. Capabilities is a three-column band divided by hairlines, no boxes.
The footer closes on a large statement, three flat columns and a micro meta
row.

**Texture.** One addition the reference earns: a 4.5% film grain over the page,
so the flat black doesn't band on large displays.

**Figures.** The backdrop still cycles six systems, now in monochrome at 10–22%
white, and the hero carries a small Rössler knot drawn in the same white.

**Carried over.** Visitor counter and location stay removed. Social cards,
favicon, code theme and the `/links` page are all re-cut in monochrome.

## Files

Rewritten: `src/styles/global.css`, `src/components/{Header,Hero,Footer}.astro`,
`src/pages/{index,about,contact,links}.astro`, `src/pages/blog/index.astro`.
Adjusted: `Base.astro` (Archivo, theme bootstrap removed),
`Backdrop.astro` (monochrome, no light-theme rule), `astro.config.mjs` (shiki),
`public/favicon.svg`, `scripts/generate-og.py` + regenerated PNGs.

## Caveat

I could not load ggdesign.it — the sandbox can't reach that host. The language
here is read from the site's own page structure (numbered sections, "Featured
works", "Creative lab") and two design directories that classify it as *flat,
dark, large type, monochromatic, retro*. If the real site leans somewhere else
— a different typeface, an accent colour, image-led case-study cards — send a
screenshot and I'll correct it.

Previews in `preview/` are harness renders of the real stylesheet and
components, not `astro build` output.
