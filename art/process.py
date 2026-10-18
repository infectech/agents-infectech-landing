"""Lock colors and export (art.md section 7).

Usage:
  python art/process.py art/raw/hero-engineer-s1.png hero-engineer [--crop 0.04]

Gradient-maps every pixel onto the house duotone (ink #0e3ad1 -> paper #cdbbf1)
and writes assets/art/<name>.webp (longest side <= 1600 px, quality 80).
--crop trims that fraction from the bottom-right (Gemini watermark) keeping ratio.
"""
import argparse
import pathlib

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
INK = np.array([0x0E, 0x3A, 0xD1], float)
PAPER = np.array([0xCD, 0xBB, 0xF1], float)


def trim(img, pad=6):
    """Cut flat paper margins / plate frames (art.md: no border), keeping the aspect ratio."""
    a = np.asarray(img.convert("L"), float)
    h, w = a.shape

    def inset(strips):
        for i in range(len(strips) // 12):
            if strips[i].std() > 12:
                return i + pad if i > 2 else i
        return 0

    t, b, l, r = inset(a), inset(a[::-1]), inset(a.T), inset(a.T[::-1])
    if not any((t, b, l, r)):
        return img
    x0, y0, x1, y1 = l, t, w - r, h - b
    ratio = w / h
    cw, ch = x1 - x0, y1 - y0
    if cw / ch > ratio:  # too wide: shave the sides
        d = cw - round(ch * ratio); x0 += d // 2; x1 -= d - d // 2
    else:                # too tall: shave top and bottom
        d = ch - round(cw / ratio); y0 += d // 2; y1 -= d - d // 2
    print(f"  trimmed margins t{t} b{b} l{l} r{r}")
    return img.crop((x0, y0, x1, y1)).resize((w, h), Image.LANCZOS)


def tone(img):
    """Position of every pixel between the image's own ink (0) and paper (1)."""
    a = np.asarray(img.convert("RGB"), float)
    px = a.reshape(-1, 3)
    lum = px @ [0.299, 0.587, 0.114]
    lo, hi = np.percentile(lum, [2, 98])
    ink = np.median(px[lum <= lo], axis=0)
    paper = np.median(px[lum >= hi], axis=0)
    d = paper - ink
    return np.clip(((px - ink) @ d) / (d @ d), 0, 1), a.shape


def duotone(img, match=1.0):
    t, shape = tone(img)
    if match:
        # Monotonic tone match to the reference plate: same lines, same ink density.
        ref, _ = tone(Image.open(ROOT / "preview.png"))
        q = np.linspace(0, 1, 1001)
        ranks = np.interp(t, np.quantile(t, q), q)
        t = (1 - match) * t + match * np.interp(ranks, q, np.quantile(ref, q))
    out = INK + t[:, None] * (PAPER - INK)
    return Image.fromarray(out.reshape(shape).round().astype(np.uint8))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("name")
    ap.add_argument("--crop", type=float, default=0.0)
    ap.add_argument("--max", type=int, default=1600)
    ap.add_argument("--quality", type=int, default=80)
    ap.add_argument("--match", type=float, default=1.0, help="0..1 tone match to preview.png")
    a = ap.parse_args()

    img = Image.open(a.src)
    if a.crop:
        w, h = img.size
        img = img.crop((0, 0, round(w * (1 - a.crop)), round(h * (1 - a.crop))))
    img = duotone(trim(img), a.match)
    if max(img.size) > a.max:
        s = a.max / max(img.size)
        img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    dest = ROOT / "assets" / "art" / f"{a.name}.webp"
    img.save(dest, "WEBP", quality=a.quality, method=6)
    print(f"{dest.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}  {dest.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
