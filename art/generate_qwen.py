"""Generate engravings locally with Qwen-Image-2.1-Turbo (7B DiT + Qwen3-VL 8B encoder).

Usage (from the image-gen venv):
  python art/generate_qwen.py banner-prometheus@16:9 card-atlas@4:5 --seeds 1 2

Same prompt files and house template as generate.py; preview.png is always
attached as the style reference. Writes art/raw/<name>-q-s<seed>.png.

Fits 8 GB VRAM / 32 GB RAM: weights live in system RAM and stream to the GPU one
block at a time. Prompts are encoded in a separate process first (so its 17 GB
are fully returned to the OS), then the transformer generates in this one.
"""
import argparse
import pathlib
import subprocess
import sys
import tempfile
import time

import torch
from diffusers import QwenImage21Pipeline
from diffusers.hooks import apply_group_offloading
from diffusers.pipelines.qwenimage21.pipeline_qwenimage21 import calculate_dimensions
from PIL import Image

from generate import ROOT, TEMPLATE, BASE_REF

MODEL = "Qwen/Qwen-Image-2.1-Turbo"
SIZES = {  # Qwen-Image-2.1 presets (~4 MP), multiples of 32
    "2:3": (1696, 2528),
    "4:5": (1792, 2240),
    "1:1": (2048, 2048),
    "16:9": (2752, 1536),
    "3:2": (2528, 1696),
}
REF_RES = 1024  # condition images are resized to ~1 MP
CUDA, CPU = torch.device("cuda"), torch.device("cpu")

# Edit models lean on the input picture; say plainly that only the technique carries over.
STYLE_ONLY = ("Picture 1 is the attached style reference. Take only its engraving technique, line work, grain "
              "and duotone colors. The composition is entirely new: do not reuse its figure, pose, wings, "
              "helmet, halo, sunburst or layout. Everything is physically solid: rings, rods, tools and "
              "drapery pass in front of or behind bodies and limbs, never through them.\n"
              "Render it as a real 17th-century copperplate engraving printed in ink, exactly like picture 1: "
              "every tone is built only from engraved parallel lines, cross-hatching and stipple dots. The sky "
              "is flat, even horizontal line hatching with no gradient and no glow. Clouds are drawn with "
              "contour lines and curved hatching, never airbrushed. No smooth shading, no soft blur, no "
              "digital painting.")


def build_prompt(name, ratio):
    body = (ROOT / "art" / "prompts" / f"{name}.txt").read_text(encoding="utf-8").strip()
    return STYLE_ONLY + "\n\n" + TEMPLATE.format(body=body, ratio=ratio)


def stream(module):
    # Pin each block only while it is in flight: Windows refuses to page-lock a whole 14-17 GB model
    # (CUDA "out of memory" from pin_memory), even in a fresh process.
    apply_group_offloading(module, onload_device=CUDA, offload_device=CPU, offload_type="block_level",
                           num_blocks_per_group=1, use_stream=True, low_cpu_mem_usage=True)


def encode_all(jobs, refs):
    pipe = QwenImage21Pipeline.from_pretrained(MODEL, transformer=None, vae=None, dtype=torch.bfloat16)
    stream(pipe.text_encoder)
    sized = []
    for img in refs:
        w, h, _ = calculate_dimensions(REF_RES * REF_RES, img.width / img.height)
        sized.append(pipe.image_processor.resize(img.convert("RGBA"), width=w, height=h))
    out = {}
    with torch.no_grad():
        for name, ratio in jobs:
            pe, pm, ipm = pipe.encode_prompt(build_prompt(name, ratio), image=sized, device=CUDA)
            out[name] = tuple(None if t is None else t.to(CPU) for t in (pe, pm, ipm))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("jobs", nargs="+", help="name@ratio")
    ap.add_argument("--seeds", type=int, nargs="+", default=[1])
    ap.add_argument("--ref", action="append", default=[])
    ap.add_argument("--tag", default="q", help="filename tag: <name>-<tag>-s<seed>.png")
    ap.add_argument("--encode-to", help=argparse.SUPPRESS)  # internal: stage 1 in a child process
    a = ap.parse_args()

    jobs = [tuple(j.split("@")) for j in a.jobs]
    refs = [Image.open(p).convert("RGB") for p in [BASE_REF, *a.ref]]

    if a.encode_to:
        torch.save(encode_all(jobs, refs), a.encode_to)
        return 0

    t = time.time()
    cache = pathlib.Path(tempfile.gettempdir()) / "qwen-embeds.pt"
    cmd = [sys.executable, __file__, *a.jobs, "--encode-to", str(cache)] + [f"--ref={r}" for r in a.ref]
    subprocess.run(cmd, check=True)
    embeds = torch.load(cache)
    cache.unlink()
    print(f"encoded {len(jobs)} prompt(s) in {time.time() - t:.0f}s", flush=True)

    pipe = QwenImage21Pipeline.from_pretrained(MODEL, text_encoder=None, dtype=torch.bfloat16)
    stream(pipe.transformer)
    pipe.vae.to(CUDA)
    if hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()

    for name, ratio in jobs:
        w, h = SIZES[ratio]
        pe, pm, ipm = (None if x is None else x.to(CUDA) for x in embeds[name])
        pipe.encode_prompt = lambda *_, **__: (pe, pm, ipm)
        for seed in a.seeds:
            t = time.time()
            img = pipe(
                prompt=" ", image=refs, width=w, height=h, output_resolution=REF_RES,
                use_kv_cache=True, generator=torch.Generator("cpu").manual_seed(seed),
            ).images[0]
            dest = ROOT / "art" / "raw" / f"{name}-{a.tag}-s{seed}.png"
            img.convert("RGB").save(dest)
            print(f"{dest.name}  {w}x{h}  {time.time() - t:.0f}s", flush=True)


if __name__ == "__main__":
    sys.exit(main())
