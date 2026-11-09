#!/usr/bin/env python3
"""
Generate images for rxwsxn.com — mathematically.

Outputs:
  public/og.png                home card                   (1200x630)
  public/og/blog.png           blog index card
  public/og/about.png          about card
  public/og/contact.png        contact card
  public/og/<slug>.png         one card per post
  public/apple-touch-icon.png  geometric app icon          (180x180)

Every card is a Liquid Glass panel over the drifting colour field, carrying its
own mathematical figure and a nav line with that page highlighted.

The framed figure on each card comes from a set of deterministic constructions
(phyllotaxis, interference fields, moire, Lissajous curves, superformula,
lattices, Hilbert curves, rings), seeded so a given page always draws the same
figure.

Run after adding or editing content:
    python3 scripts/generate-og.py     # or: npm run images
Requires Pillow:  pip3 install pillow
"""
from __future__ import annotations

import glob
import hashlib
import math
import os
import random
import re
import sys

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except ImportError:
    sys.exit("Pillow is required:  pip3 install pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOG_DIR = os.path.join(ROOT, "src", "content", "blog")
WORK_DIR = os.path.join(ROOT, "src", "content", "work")
PUBLIC = os.path.join(ROOT, "public")
OG_DIR = os.path.join(PUBLIC, "og")
WORK_OUT = os.path.join(PUBLIC, "work")

W, H = 1200, 630
INK = (11, 11, 11)
BG = "#0b0b0b"
FG = "#f4f1ea"
MUTED = "#8b8b86"
MUTED2 = "#5c5c58"
ACCENT = "#f4f1ea"
ACCENT_RGB = (244, 241, 234)
BORDER = "#2a2a2a"


# ---- fonts -----------------------------------------------------------------

def _candidates() -> list[str]:
    c = [
        "/System/Library/Fonts/SFNSMono.ttf",
        "/System/Library/Fonts/Menlo.ttc",
        "/Library/Fonts/JetBrainsMono-Regular.ttf",
    ]
    try:
        import matplotlib

        base = os.path.join(os.path.dirname(matplotlib.__file__), "mpl-data", "fonts", "ttf")
        c += glob.glob(os.path.join(base, "DejaVuSansMono*.ttf"))
    except Exception:
        pass
    c += glob.glob("/usr/share/fonts/**/*Mono*.ttf", recursive=True)
    c += glob.glob("/usr/share/fonts/**/DejaVuSans*.ttf", recursive=True)
    return c


_FONT_CACHE: dict[tuple[int, bool], ImageFont.FreeTypeFont] = {}


def font(size: int, bold: bool = False):
    key = (size, bold)
    if key in _FONT_CACHE:
        return _FONT_CACHE[key]
    cands = _candidates()
    if bold:
        cands = [p for p in cands if "Bold" in p or "bold" in p] + cands
    for path in cands:
        try:
            f = ImageFont.truetype(path, size, index=0)
            _FONT_CACHE[key] = f
            return f
        except Exception:
            continue
    f = ImageFont.load_default()
    _FONT_CACHE[key] = f
    return f


def text_w(draw, s, f) -> int:
    return int(draw.textlength(s, font=f))


def wrap(draw, text, f, max_w) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if text_w(draw, trial, f) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def fit_title(draw, text, max_w, max_lines, sizes):
    for size in sizes:
        f = font(size, bold=True)
        lines = wrap(draw, text, f, max_w)
        if len(lines) <= max_lines:
            return f, lines
    f = font(sizes[-1], bold=True)
    return f, wrap(draw, text, f, max_w)[:max_lines]


# ---- shared geometry helpers ----------------------------------------------

def _grid(d, w, h, step=40, alpha=7):
    for x in range(0, w + 1, step):
        d.line([(x, 0), (x, h)], fill=(243, 235, 221, alpha))
    for y in range(0, h + 1, step):
        d.line([(0, y), (w, y)], fill=(243, 235, 221, alpha))


def _ticks(d, w, h, m=22, ln=18, alpha=90):
    for px, py, dx, dy in [(m, m, 1, 1), (w - m, m, -1, 1), (m, h - m, 1, -1), (w - m, h - m, -1, -1)]:
        d.line([(px, py), (px + dx * ln, py)], fill=(*ACCENT_RGB, alpha), width=2)
        d.line([(px, py), (px, py + dy * ln)], fill=(*ACCENT_RGB, alpha), width=2)


def _phyllotaxis(d, cx, cy, R, n, base_alpha=90, golden=137.507764):
    ga = math.radians(golden)
    for i in range(n):
        r = R * math.sqrt(i / n)
        a = i * ga
        x, y = cx + r * math.cos(a), cy + r * math.sin(a)
        s = 0.6 + 1.8 * (i / n)
        al = int(base_alpha * (0.3 + 0.7 * (i / n)))
        d.ellipse([x - s, y - s, x + s, y + s], fill=(*ACCENT_RGB, al))


# ---- mathematical constructions (800x500) ----------------------------------

def art_phyllotaxis(w, h, rnd):
    img = Image.new("RGB", (w, h), INK)
    d = ImageDraw.Draw(img, "RGBA")
    _grid(d, w, h)
    _phyllotaxis(d, w / 2, h / 2, min(w, h) / 2 - 18, 760, base_alpha=150)
    _ticks(d, w, h)
    return img


def art_field(w, h, rnd):
    """Interference lattice rendered as pixels."""
    img = Image.new("RGB", (w, h), INK)
    d = ImageDraw.Draw(img, "RGBA")
    c = 10
    fx, fy, fp = rnd.uniform(.03, .06), rnd.uniform(.03, .06), rnd.uniform(.015, .03)
    for x in range(0, w, c):
        for y in range(0, h, c):
            v = (math.sin(x * fx) + math.sin(y * fy) + math.sin((x + y) * fp)) / 3
            if v > 0.12:
                al = int(30 + 200 * min(1.0, (v + 1) / 2))
                d.rectangle([x, y, x + c - 3, y + c - 3], fill=(*ACCENT_RGB, al))
    _ticks(d, w, h)
    return img


def art_moire(w, h, rnd):
    img = Image.new("RGB", (w, h), INK)
    d = ImageDraw.Draw(img, "RGBA")
    cx, cy = w / 2, h / 2
    for k in range(-h, h, 6):
        d.line([(0, cy + k), (w, cy + k)], fill=(*ACCENT_RGB, 78))
    ang = math.radians(rnd.uniform(5, 9))
    L = max(w, h)
    ux, uy = math.cos(ang), math.sin(ang)
    nx, ny = -uy, ux
    for k in range(-L, L, 6):
        d.line(
            [(cx + nx * k - ux * L, cy + ny * k - uy * L), (cx + nx * k + ux * L, cy + ny * k + uy * L)],
            fill=(*ACCENT_RGB, 78),
        )
    _ticks(d, w, h)
    return img


def art_lissajous(w, h, rnd):
    img = Image.new("RGB", (w, h), INK)
    d = ImageDraw.Draw(img, "RGBA")
    _grid(d, w, h)
    a, b = rnd.choice([(3, 2), (5, 4), (4, 3), (5, 3)])
    delta = rnd.choice([math.pi / 2, math.pi / 3, math.pi / 4])
    A, B, cx, cy = w * 0.42, h * 0.42, w / 2, h / 2
    pts = [
        (cx + A * math.sin(a * (t := 2 * math.pi * i / 1800) + delta), cy + B * math.sin(b * t))
        for i in range(1801)
    ]
    d.line(pts, fill=(*ACCENT_RGB, 120), width=1)
    _ticks(d, w, h)
    return img


def art_superformula(w, h, rnd):
    img = Image.new("RGB", (w, h), INK)
    d = ImageDraw.Draw(img, "RGBA")

    def sf(phi, m, n1, n2, n3):
        t1 = abs(math.cos(m * phi / 4)) ** n2
        t2 = abs(math.sin(m * phi / 4)) ** n3
        try:
            return (t1 + t2) ** (-1 / n1)
        except (ZeroDivisionError, OverflowError):
            return 0.0

    cx, cy = w / 2, h / 2
    for k in range(6):
        m = rnd.choice([5, 6, 7, 8])
        n1 = rnd.uniform(0.3, 1.6)
        n2 = n3 = rnd.uniform(0.3, 1.6)
        R = (min(w, h) / 2 - 30) * (1 - k * 0.13)
        pts = []
        for i in range(0, 721, 3):
            phi = math.radians(i)
            r = sf(phi, m, n1, n2, n3)
            if not math.isfinite(r) or r > 50:
                r = 0.0
            pts.append((cx + R * r * math.cos(phi), cy + R * r * math.sin(phi)))
        d.line(pts, fill=(*ACCENT_RGB, max(90 - k * 10, 30)), width=2)
    _ticks(d, w, h)
    return img


def art_lattice(w, h, rnd):
    img = Image.new("RGB", (w, h), INK)
    d = ImageDraw.Draw(img, "RGBA")
    step = rnd.choice([42, 48, 54])
    pts = []
    for gx in range(step, w, step):
        for gy in range(step, h, step):
            off = step // 2 if (gy // step) % 2 else 0
            pts.append((gx + off, gy))
    for i, p in enumerate(pts):
        near = sorted(range(len(pts)), key=lambda j: (pts[j][0] - p[0]) ** 2 + (pts[j][1] - p[1]) ** 2)[1:3]
        for j in near:
            d.line([p, pts[j]], fill=(*ACCENT_RGB, 42), width=1)
    for p in pts:
        d.ellipse([p[0] - 2, p[1] - 2, p[0] + 2, p[1] + 2], fill=(*ACCENT_RGB, 180))
    _ticks(d, w, h)
    return img


def art_hilbert(w, h, rnd):
    img = Image.new("RGB", (w, h), INK)
    d = ImageDraw.Draw(img, "RGBA")
    pts: list[tuple[float, float]] = []

    def hilbert(x0, y0, xi, xj, yi, yj, n):
        if n <= 0:
            pts.append((x0 + (xi + yi) / 2, y0 + (xj + yj) / 2))
            return
        hilbert(x0, y0, yi / 2, yj / 2, xi / 2, xj / 2, n - 1)
        hilbert(x0 + xi / 2, y0 + xj / 2, xi / 2, xj / 2, yi / 2, yj / 2, n - 1)
        hilbert(x0 + xi / 2 + yi / 2, y0 + xj / 2 + yj / 2, xi / 2, xj / 2, yi / 2, yj / 2, n - 1)
        hilbert(x0 + xi / 2 + yi, y0 + xj / 2 + yj, -yi / 2, -yj / 2, -xi / 2, -xj / 2, n - 1)

    size = min(w, h) - 44
    hilbert(22, 22, size, 0, 0, size, rnd.choice([4, 5]))
    if len(pts) > 1:
        d.line(pts, fill=(*ACCENT_RGB, 120), width=2)
    _ticks(d, w, h)
    return img


def art_rings(w, h, rnd):
    img = Image.new("RGB", (w, h), INK)
    d = ImageDraw.Draw(img, "RGBA")
    _grid(d, w, h)
    cx = w * (0.30 + 0.40 * rnd.random())
    cy = h * (0.30 + 0.40 * rnd.random())
    for i in range(15):
        r = 18 + i * 26
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(*ACCENT_RGB, max(150 - i * 10, 14)), width=2)
    d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=(*ACCENT_RGB, 255))
    _ticks(d, w, h)
    return img


# Mathematical constructions, kept for reuse (e.g. project thumbnails).
# Not currently rendered anywhere — the work entries are text-only in /about.
ALGOS = [
    art_phyllotaxis,
    art_field,
    art_moire,
    art_lissajous,
    art_superformula,
    art_lattice,
    art_hilbert,
    art_rings,
]


def make_art(slug: str, index: int = 0, w: int = 800, h: int = 500) -> Image.Image:
    # spread the construction across the set so neighbours differ;
    # seed its parameters from the slug so each figure is unique and stable.
    seed = int(hashlib.md5(slug.encode("utf-8")).hexdigest(), 16) % (2 ** 32)
    rnd = random.Random(seed)
    return ALGOS[index % len(ALGOS)](w, h, rnd)


# ---- social cards ----------------------------------------------------------

def _rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return m


def _aurora_bg(w, h):
    """Soft monochrome glow field, matching the site's flat backdrop."""
    glow = Image.new("RGB", (w, h), BG)
    gd = ImageDraw.Draw(glow, "RGBA")
    for cx, cy, R, col in [
        (w * 0.10, h * 0.10, max(w, h) * 0.26, (244, 241, 234, 26)),
        (w * 0.92, h * 0.14, max(w, h) * 0.22, (244, 241, 234, 16)),
        (w * 0.90, h * 0.92, max(w, h) * 0.26, (244, 241, 234, 20)),
    ]:
        gd.ellipse([cx - R, cy - R, cx + R, cy + R], fill=col)
    return glow.filter(ImageFilter.GaussianBlur(90))


def base_canvas():
    img = _aurora_bg(W, H)
    d = ImageDraw.Draw(img, "RGBA")
    _grid(d, W, H, step=48, alpha=6)
    d.rectangle([24, 24, W - 25, H - 25], outline=BORDER, width=2)
    _ticks(d, W, H, m=24, ln=20, alpha=120)
    return img, d


def _glass_panel(img, box, radius=28, tint=20, blur=24):
    """Frosted-glass panel: blur the backdrop, tint it, then add a lit edge."""
    x0, y0, x1, y1 = box
    pw, ph = x1 - x0, y1 - y0
    mask = _rounded_mask((pw, ph), radius)
    img.paste(img.crop(box).filter(ImageFilter.GaussianBlur(blur)), (x0, y0), mask)

    rgba = img.convert("RGBA")
    overlay = Image.new("RGBA", (pw, ph), (243, 235, 221, 0))
    overlay.putalpha(mask.point(lambda v: tint if v > 0 else 0))
    rgba.alpha_composite(overlay, (x0, y0))
    img = rgba.convert("RGB")

    d = ImageDraw.Draw(img, "RGBA")
    d.rounded_rectangle([x0, y0, x1 - 1, y1 - 1], radius=radius, outline=(243, 235, 221, 64), width=2)
    d.line([(x0 + radius + 6, y0 + 4), (x1 - radius - 6, y0 + 4)], fill=(243, 235, 221, 58), width=2)
    return img


NAV = ["home", "blog", "about", "contact"]


def card_page(title: str, subtitle: str, motif: int, current: str, seed_key: str):
    """A Liquid Glass card carrying a distinct mathematical figure per page."""
    img, _ = base_canvas()
    box = (56, 120, W - 56, H - 104)
    img = _glass_panel(img, box, radius=30, tint=14, blur=26)
    d = ImageDraw.Draw(img, "RGBA")

    # framed figure, right side
    msize, mx0, my0 = 300, 804, 173
    seed = int(hashlib.md5(seed_key.encode("utf-8")).hexdigest(), 16) % (2 ** 32)
    fig = ALGOS[motif % len(ALGOS)](msize, msize, random.Random(seed))
    img.paste(fig, (mx0, my0), _rounded_mask((msize, msize), 20))
    d.rounded_rectangle(
        [mx0, my0, mx0 + msize - 1, my0 + msize - 1], radius=20, outline=(255, 255, 255, 55), width=1
    )

    # text, left side
    d.text((98, 152), "rxwsxn.com", font=font(24), fill=MUTED2)
    f, lines = fit_title(d, title, 660, 2, [66, 58, 50, 44, 38])
    lh = int(f.size * 1.26)
    ty = 200
    for line in lines:
        d.text((98, ty), line, font=f, fill=ACCENT)
        ty += lh
    sy = ty + 14
    for line in wrap(d, subtitle, font(26), 660)[:2]:
        d.text((98, sy), line, font=font(26), fill=MUTED)
        sy += 34

    # nav, with the current page highlighted
    nx = 98
    for item in NAV:
        label = f"[ {item} ]"
        d.text((nx, 486), label, font=font(22), fill=(ACCENT if item == current else MUTED2))
        nx += text_w(d, label, font(22)) + 18
    return img


def apple_touch_icon():
    s = 180
    img = Image.new("RGB", (s, s), BG)
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle([0, 0, s - 1, s - 1], outline=BORDER, width=2)
    d.rectangle([38, 38, s - 38, s - 38], outline=(*ACCENT_RGB, 230), width=4)
    d.ellipse([56, 56, s - 56, s - 56], outline=(*ACCENT_RGB, 120), width=4)
    d.ellipse([s / 2 - 9, s / 2 - 9, s / 2 + 9, s / 2 + 9], fill=(*ACCENT_RGB, 255))
    _ticks(d, s, s, m=12, ln=14, alpha=150)
    return img


# ---- frontmatter -----------------------------------------------------------

def frontmatter(path: str) -> dict:
    with open(path, encoding="utf-8") as fh:
        txt = fh.read()
    m = re.match(r"^---\s*\n(.*?)\n---\s*(\n|$)", txt, re.S)
    if not m:
        return {}
    data: dict = {}
    for line in m.group(1).splitlines():
        line = line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        k, v = line.split(":", 1)
        k, v = k.strip(), v.strip()
        if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
            v = v[1:-1]
        if v.startswith("[") and v.endswith("]"):
            v = [x.strip().strip("\"'") for x in v[1:-1].split(",") if x.strip()]
        data[k] = v
    return data


def _md_files(folder: str) -> list[str]:
    return sorted(glob.glob(os.path.join(folder, "*.md")) + glob.glob(os.path.join(folder, "*.mdx")))


def main() -> None:
    os.makedirs(OG_DIR, exist_ok=True)

    pages = [
        ("og.png", "raushan kumar", "ai product engineer  ·  bangalore / remote", 0, "home"),
        ("og/blog.png", "blog", "dated notes — mostly ai, product, and building.", 3, "blog"),
        ("og/about.png", "about", "the longer version — who i am and how i work.", 4, "about"),
        ("og/contact.png", "contact", "email, github, and the fastest way to reach me.", 5, "contact"),
    ]
    for name, title, sub, motif, current in pages:
        card_page(title, sub, motif, current, name).save(os.path.join(PUBLIC, name), "PNG")
        print(f"wrote public/{name}")

    posts = 0
    for i, md in enumerate(_md_files(BLOG_DIR)):
        slug = os.path.splitext(os.path.basename(md))[0]
        fm = frontmatter(md)
        title = str(fm.get("title") or slug)
        date = str(fm.get("date") or "")[:10]
        tags = fm.get("tags") or []
        if isinstance(tags, str):
            tags = [tags]
        meta = " · ".join([p for p in [date, " ".join(f"#{t}" for t in tags)] if p])
        card_page(title, meta, 6 + i, "blog", slug).save(os.path.join(OG_DIR, f"{slug}.png"), "PNG")
        print(f"wrote public/og/{slug}.png")
        posts += 1

    apple_touch_icon().save(os.path.join(PUBLIC, "apple-touch-icon.png"), "PNG")
    print("wrote public/apple-touch-icon.png")

    print(f"\ndone — 4 page cards, {posts} post card(s), 1 icon")


if __name__ == "__main__":
    main()
