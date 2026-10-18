"""Repair one region of a raw engraving with FLUX.2 [klein] and blend it back.

Usage:
  python art/fix_local.py art/raw/hero-engineer-s1.png 180 1020 460 1300 "Remove ..." [--seed 1]

Only the area inside a feathered ellipse of the box changes; every other pixel
stays identical. preview.png rides along as the style reference.
"""
import argparse
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from generate import BASE_REF
from process import tone


def match_colors(patch, crop):
    """Re-ink the patch on the crop's own ink->paper axis, with the crop's tone distribution."""
    t, shape = tone(patch)
    tc, _ = tone(crop)
    q = np.linspace(0, 1, 501)
    t = np.interp(np.interp(t, np.quantile(t, q), q), q, np.quantile(tc, q))
    px = np.asarray(crop, float).reshape(-1, 3)
    lum = px @ [0.299, 0.587, 0.114]
    lo, hi = np.percentile(lum, [2, 98])
    ink, paper = np.median(px[lum <= lo], axis=0), np.median(px[lum >= hi], axis=0)
    out = ink + t[:, None] * (paper - ink)
    return Image.fromarray(out.reshape(shape).round().astype(np.uint8))


def blend(base, box, edited):
    x0, y0, x1, y1 = box
    crop = base.crop(box)
    edited = match_colors(edited.convert("RGB").resize(crop.size, Image.LANCZOS), crop)
    mask = Image.new("L", crop.size, 0)
    m = min(crop.size) // 7
    ImageDraw.Draw(mask).ellipse((m, m, crop.width - m, crop.height - m), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(m * 0.8))
    out = base.copy()
    out.paste(Image.composite(edited, crop, mask), (x0, y0))
    return out

PREFIX = ("Edit the first image. Keep it a copperplate engraving with the same dense fine "
          "cross-hatching, same line spacing, same blue and lavender duotone as the second image. ")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("box", type=int, nargs=4)
    ap.add_argument("prompt")
    ap.add_argument("--seeds", type=int, nargs="+", default=[1], help="one candidate per seed, one model load")
    ap.add_argument("--out", help="output path; with several seeds, -s<seed> is added")
    ap.add_argument("--patch", help="re-blend a saved -patch.png instead of running the model")
    ap.add_argument("--no-ref", action="store_true",
                    help="skip preview.png: for small removals the reference figure leaks into the patch")
    a = ap.parse_args()

    base = Image.open(a.src).convert("RGB")
    dest = a.out or a.src.replace(".png", "-fixed.png")
    if a.patch:
        blend(base, a.box, Image.open(a.patch)).save(dest)
        print(dest)
        return

    import torch
    from generate_local import load
    crop = base.crop(a.box)
    big = crop.resize((crop.width * 2, crop.height * 2), Image.LANCZOS)
    refs = [big] if a.no_ref else [big, Image.open(BASE_REF).convert("RGB")]
    prefix = "Edit this copperplate engraving, keeping its exact line work and hatching. " if a.no_ref else PREFIX
    pipe = load()
    for seed in a.seeds:
        out = dest if len(a.seeds) == 1 else dest.replace(".png", f"-s{seed}.png")
        edited = pipe(
            image=refs,
            prompt=prefix + a.prompt + " Change nothing else.",
            width=big.width, height=big.height, num_inference_steps=4, guidance_scale=1.0,
            generator=torch.Generator("cuda").manual_seed(seed),
        ).images[0].resize(crop.size, Image.LANCZOS)
        edited.save(out.replace(".png", "-patch.png"))
        blend(base, a.box, edited).save(out)
        print(out, flush=True)


if __name__ == "__main__":
    sys.exit(main())
