"""Generate engravings locally with FLUX.2 [klein] 4B (fallback for the Nano Banana API).

Usage (from the image-gen venv):
  python art/generate_local.py hero-engineer@2:3 card-athena@4:5 --seeds 1 2 [--ref extra.png]

Same prompt files and house template as generate.py; preview.png is always
attached as the style reference. Writes art/raw/<name>-s<seed>.png.
"""
import argparse
import pathlib
import sys
import time

import torch
from diffusers import Flux2KleinPipeline
from PIL import Image

from generate import ROOT, TEMPLATE, BASE_REF

MODEL = "black-forest-labs/FLUX.2-klein-4B"
SIZES = {  # ~1.5 MP, multiples of 16
    "2:3": (1024, 1536),
    "4:5": (1104, 1376),
    "1:1": (1248, 1248),
    "16:9": (1664, 928),
    "3:2": (1536, 1024),
}


def load():
    pipe = Flux2KleinPipeline.from_pretrained(MODEL, torch_dtype=torch.bfloat16)
    cuda, cpu = torch.device("cuda"), torch.device("cpu")
    # 8 GB card: stream transformer + text encoder blocks from pinned RAM.
    pipe.transformer.enable_group_offload(
        onload_device=cuda, offload_device=cpu, offload_type="block_level",
        num_blocks_per_group=1, use_stream=True,
    )
    from diffusers.hooks import apply_group_offloading
    apply_group_offloading(
        pipe.text_encoder, onload_device=cuda, offload_device=cpu,
        offload_type="block_level", num_blocks_per_group=2, use_stream=True,
    )
    pipe.vae.to(cuda)
    return pipe


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("jobs", nargs="+", help="name@ratio")
    ap.add_argument("--seeds", type=int, nargs="+", default=[1])
    ap.add_argument("--steps", type=int, default=4)
    ap.add_argument("--ref", action="append", default=[])
    ap.add_argument("--suffix", default="")
    a = ap.parse_args()

    refs = [Image.open(p).convert("RGB") for p in [BASE_REF, *a.ref]]
    pipe = load()
    for job in a.jobs:
        name, ratio = job.split("@")
        w, h = SIZES[ratio]
        body = (ROOT / "art" / "prompts" / f"{name}.txt").read_text(encoding="utf-8").strip()
        prompt = TEMPLATE.format(body=body, ratio=ratio)
        for seed in a.seeds:
            t = time.time()
            img = pipe(
                image=refs, prompt=prompt, width=w, height=h,
                num_inference_steps=a.steps, guidance_scale=1.0,
                generator=torch.Generator("cuda").manual_seed(seed),
            ).images[0]
            dest = ROOT / "art" / "raw" / f"{name}{a.suffix}-s{seed}.png"
            img.save(dest)
            print(f"{dest.name}  {w}x{h}  {time.time() - t:.0f}s", flush=True)


if __name__ == "__main__":
    sys.exit(main())
