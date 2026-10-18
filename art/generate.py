"""Generate an engraving with Nano Banana (art.md section 5).

Usage:
  GEMINI_API_KEY=... python art/generate.py <name> <ratio> [-n 2] [--ref extra.png ...]

Reads art/prompts/<name>.txt, wraps it in the house template and always
attaches preview.png as the style reference. Writes art/raw/<name>-<i>.png.
"""
import argparse
import base64
import json
import os
import pathlib
import sys
from concurrent.futures import ThreadPoolExecutor

import requests

ROOT = pathlib.Path(__file__).resolve().parent.parent
MODEL = os.environ.get("NANO_BANANA_MODEL", "gemini-nano-banana-2.1")
ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"
BASE_REF = ROOT / "preview.png"

TEMPLATE = """Use the attached image as the exact style reference: same dense fine cross-hatching, same high contrast, same deep blue and pale lavender duotone, same grainy print texture, same dramatic Mannerist engraving feel.

Create a new engraving:
{body}

Style: copperplate engraving, extremely dense and fine cross-hatching, stippling in shadows, visible burin lines, anatomically correct hands with five fingers, darkest areas almost solid blue.

Color: strict duotone, deep blue ink (#0e3ad1) on pale lavender paper (#cdbbf1). No gray, no other colors, no soft shading.

Avoid: text, letters, watermark, signature, winged helmet, wings on ankles or sandals, caduceus, sunburst, radiating string lines, border.

Format: {ratio}, extremely detailed."""


def image_part(path):
    data = base64.b64encode(pathlib.Path(path).read_bytes()).decode()
    return {"inline_data": {"mime_type": "image/png", "data": data}}


def generate(name, ratio, refs, i):
    body = (ROOT / "art" / "prompts" / f"{name}.txt").read_text(encoding="utf-8").strip()
    prompt = TEMPLATE.format(body=body, ratio=ratio)
    parts = [{"text": prompt}] + [image_part(p) for p in refs]
    payload = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": ratio, "imageSize": "2K"},
        },
    }
    r = requests.post(
        ENDPOINT,
        headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"]},
        json=payload,
        timeout=300,
    )
    if r.status_code != 200:
        return f"{name}-{i}: HTTP {r.status_code} {r.text[:400]}"
    out = []
    for cand in r.json().get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            blob = part.get("inline_data") or part.get("inlineData")
            if blob:
                dest = ROOT / "art" / "raw" / f"{name}-{i}.png"
                dest.write_bytes(base64.b64decode(blob["data"]))
                out.append(str(dest))
            elif part.get("text"):
                out.append("text: " + part["text"][:200])
    return f"{name}-{i}: " + (", ".join(out) or json.dumps(r.json())[:400])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("ratio")
    ap.add_argument("-n", type=int, default=1)
    ap.add_argument("--start", type=int, default=1)
    ap.add_argument("--ref", action="append", default=[])
    a = ap.parse_args()
    refs = [BASE_REF] + a.ref
    with ThreadPoolExecutor(a.n) as pool:
        jobs = [pool.submit(generate, a.name, a.ratio, refs, a.start + k) for k in range(a.n)]
        for j in jobs:
            print(j.result(), flush=True)


if __name__ == "__main__":
    sys.exit(main())
