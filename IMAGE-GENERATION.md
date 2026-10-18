# How the art is made and fixed

How the engravings on this landing page were generated on this PC, how the models run on an 8 GB graphics card, and how each problem in the pictures was fixed. Art direction itself (palette, subjects, what to avoid) lives in [art.md](art.md).

---

## 1. Where each picture came from

| On the page | File | Made with | Fixes applied |
|---|---|---|---|
| Hero (PL. I) | `assets/art/hero-preview.webp` | `preview.png`, unchanged (lossless WebP, identical pixels) | none |
| Athena (PL. II) | `assets/art/card-athena.webp` | FLUX.2 klein 4B, seed 4 | extra third hand painted out |
| Hephaestus (PL. III) | `assets/art/card-hephaestus.webp` | FLUX.2 klein 4B, seed 2 | cord hanging from his mouth painted out; apron bib and shoulder straps (read as a vest) painted out in three patches; border trimmed |
| Atlas (PL. IV) | `assets/art/card-atlas.webp` | FLUX.2 klein 4B, seed 1 | side margins trimmed |
| Daedalus (PL. V) | `assets/art/card-daedalus.webp` | FLUX.2 klein 4B, seed 21, half-length prompt | regenerated: the first had three hands and three legs; border trimmed |
| Astrolabe and gears (PL. VII, promo band) | `assets/svg/instrument/*.svg` | drawn in code by `art/draw_instrument.py`: a true stereographic plate for Dhaka (23.8° N), turning rete, two meshed gears (36 and 18 teeth) | none; 41 KB in total |
| Kepler's nested solids (PL. IX, contact) | drawn live on a canvas by `assets/js/solids.js`: dodecahedron ⊃ icosahedron ⊃ cube ⊃ octahedron ⊃ tetrahedron, each inside the sphere inscribed in the one around it, hollow frames hatched by the light | none |
| Logo, favicon, icons, armillary sphere | `assets/svg/`, `assets/js/main.js` | drawn in code | true vector, no fixes needed |

Every generated picture had `preview.png` attached as its style reference, and went through `art/process.py` to lock the exact duotone (`#0e3ad1` ink on `#cdbbf1` paper).

---

## 2. This PC

| Part | Spec | What it limits |
|---|---|---|
| GPU | NVIDIA GeForce RTX 3060 Ti, **8 GB VRAM**, driver 617.42 | Neither model fits whole, so both stream from RAM (section 4) |
| RAM | **31.8 GB** | Holds the model weights while the GPU works on one slice at a time |
| CPU | Intel Core i7-12700 | Not a bottleneck |
| OS | Windows 11 Home | Caps how much RAM can be page-locked for fast GPU transfers (section 4) |
| Disk | C: with 137 GB free after setup | Models and the Python environment take about 59 GB |

---

## 3. What is installed and where

### Why not the Nano Banana API

art.md asks for Nano Banana. The key works, but every image model on it returns `429 quota exceeded` with a free-tier image limit of **0**, and Vertex AI is disabled on that Google Cloud project. Nothing can be generated until billing is enabled on the key. `art/generate.py` is ready for when it is.

### Python environment (isolated)

`C:\Users\offic\.venvs\imagegen` — **4.6 GB**

| Package | Version in the venv | Your global Python 3.12 (left untouched) |
|---|---|---|
| torch | 2.9.1 + CUDA 12.8 | 2.5.1 + CUDA 12.1 |
| diffusers | 0.41.0 | — |
| transformers | 5.20.1 | 4.46.3 |
| peft | 0.21.2 | older |
| accelerate | 1.14.0 | — |
| huggingface_hub | 1.33.0 | — |

Why a separate venv: diffusers 0.41 needs torch 2.6 or newer, and upgrading the global torch and transformers could break your other projects (the Bangla ASR and Whisper work in the same Python). The venv was created with `--system-site-packages`, so anything not installed in it falls back to the global copy. That is why an old global `peft` broke the first import; a current `peft` was installed inside the venv to shadow it.

### Models (Hugging Face cache)

`C:\Users\offic\.cache\huggingface\hub\`

| Model | On disk | Parts | License |
|---|---|---|---|
| `black-forest-labs/FLUX.2-klein-4B` | 23 GB | 4B image transformer (7.75 GB) + Qwen3 4B text encoder (8.05 GB) + VAE (0.17 GB) | Apache-2.0 (commercial use OK) |
| `Qwen/Qwen-Image-2.1-Turbo` | 31 GB | 7B image transformer (14.2 GB) + Qwen3-VL 8B vision-language encoder (17.5 GB) + VAE (0.7 GB) | Qwen Research License (**non-commercial**) |

The FLUX folder also holds a 7.75 GB single-file copy of the transformer (`flux-2-klein-4b.safetensors`) that the scripts never read. It can be deleted to save space.

No picture on the page uses Qwen now (it made the Prometheus banner, since removed), so the whole site is clear for commercial use. Qwen's research license is fine for experiments; anything it makes for a client's commercial site should be redone with FLUX.2 klein 4B or Nano Banana.

### Models considered and not used

| Model | Why not |
|---|---|
| FLUX.2 klein 9B | Non-commercial license and about 24 GB VRAM recommended |
| Qwen-Image-Edit-2511 | Needs 20 GB (fp8) or a 13 GB GGUF build meant for ComfyUI; Qwen-Image-2.1 is newer and runs in diffusers directly |

---

## 4. How the models run on an 8 GB card

### What a generation does

1. **Encoder** reads the prompt and looks at `preview.png`, turning both into numbers the image model understands.
2. **Transformer** starts from random noise and removes it step by step (4 steps for FLUX, 8 for Qwen), steered by those numbers.
3. **VAE** turns the result into pixels.

### Streaming from RAM

The weights are far bigger than the graphics card's memory, so they stay in system RAM and are copied to the GPU one block at a time, just before that block is needed (diffusers *group offloading*, block level, on a separate CUDA stream so copying overlaps with computing).

```
System RAM (31.8 GB)                         GPU (8 GB)
┌──────────────────────────────┐            ┌──────────────────────┐
│ transformer block 1          │──copy──▶   │ block n  (computing) │
│ transformer block 2          │            │ block n+1 (arriving) │
│ ...                          │            │ latents, activations │
│ transformer block 32         │            │ VAE                  │
└──────────────────────────────┘            └──────────────────────┘
```

### FLUX.2 klein 4B — `art/generate_local.py`

- One process. Encoder and transformer both stream block by block; the VAE sits on the GPU.
- Output about 1.5 megapixels (1024×1536 for 2:3, 1104×1376 for 4:5, 1664×928 for 16:9).
- **85–127 seconds per image** (measured).

### Qwen-Image-2.1-Turbo — `art/generate_qwen.py`

Qwen is twice the size, so it runs in two stages:

| Stage | What happens | Measured |
|---|---|---|
| 1. Encode | A child process loads only the 17.5 GB encoder, reads every prompt plus `preview.png`, saves the result to a temp file and exits, handing all its RAM back to Windows | 110 s for one prompt; RAM peaks at about 22.6 GB |
| 2. Generate | The main process loads only the 14.2 GB transformer and VAE and streams the transformer through the GPU for 8 steps | 7 min 17 s for 2752×1536; GPU 7.8 of 8 GB, 100 % busy; RAM about 21 GB |
| After | Everything is released | RAM back to about 5 GB |

So one Qwen picture takes **about 9 minutes**, at about 4.2 megapixels (2.8× the pixels of FLUX).

### Two memory problems hit along the way

1. **Running both stages in one process** ran out of memory. PyTorch does not reliably hand freed RAM back to Windows, so the encoder's 17 GB was still held when the transformer loaded. Fix: stage 1 runs in its own process.
2. **Page-locking the whole model** failed with `CUDA error: out of memory` even in a fresh process. Fast GPU copies need *pinned* (page-locked) RAM, and Windows refuses to pin 14–17 GB in one go. Fix: pin each block only while it is being copied (`low_cpu_mem_usage=True`). It is slower, about 55 seconds per step instead of about 30, but it runs.

### How the two models compare here

| | FLUX.2 klein 4B | Qwen-Image-2.1-Turbo |
|---|---|---|
| Time per picture | ~1.5–2 min | ~9 min |
| Resolution | ~1.5 MP | ~4.2 MP |
| Engraving look | Closer to `preview.png`: dense hatching, grain | Smoother and more painterly, softer sky |
| Anatomy | Weak: extra arms and hands, fused fingers, lumpy feet, rings through bodies | Clean hands, feet and faces |

---

## 5. How problems in the pictures are found and fixed

### Review checklist (every picture, at full zoom)

1. Count arms, hands and feet on every figure. Only the hero has six arms.
2. Hands: five separate fingers each. Feet: toes, not hooves or lumps.
3. Nothing passes *through* a body: rings, rods, tools and cloth go in front of or behind it.
4. No leftovers from the reference: wings on ankles or helmets, sunbursts (art.md forbids them on new art).
5. No printed border or flat margin around the picture.
6. No text, letters or watermark.

`preview.png` is a six-armed winged figure, and some of it bleeds into results: the 3-armed Prometheus and the 3-handed Athena both came from this. Every prompt now states the exact anatomy (for example "exactly two arms, two hands with five fingers each").

### Fixes, from smallest to largest

**1. Patch one spot** — `art/fix_local.py`

Used for: Athena's extra hand, Hephaestus's mouth cord and vest-like straps, a wing on an ankle.

1. Cut out a box around the problem and enlarge it 2×.
2. FLUX.2 klein edits just that box from a short instruction ("remove the hand at the left edge…").
3. Shrink it back and re-ink it with the picture's own ink and paper colors and tone, so it matches the rest.
4. Blend it in through a soft oval mask. Every pixel outside the box stays identical.

Add `--no-ref` for small removals. With `preview.png` attached, the reference figure sometimes appeared inside the patch.

**2. Redraw by hand in code** — used once, for a ring passing through the hero's thigh. AI patches left ghost lines, so a real section of that engraved ring band was copied and laid along a new curve joining its two ends, so the ring wrapped in front of the thigh. That hero was later replaced by `preview.png`.

**3. Regenerate** — when the composition itself is wrong. Used for the 3-armed Prometheus (first with a FLUX re-prompt, finally with Qwen), the first Athena, which came out undressed, and Daedalus, whose third arm ran from his chest to a third hand. Patching would have left a stump, so he was recomposed half-length with the board hiding his legs, and the cleanest of four renders was kept.

### Finishing — `art/process.py` (every picture)

1. **Trim** flat margins or printed frames, keeping the aspect ratio.
2. **Lock colors:** place every pixel on the line from the picture's darkest ink to its lightest paper, match the spread of tones to `preview.png`, then paint that onto `#0e3ad1` → `#cdbbf1`. Lines stay exactly where they were; only colors change.
3. **Export** WebP, quality 80, longest side at most 1600 px. Each plate is 0.5–0.6 MB.

### Why the engravings are not SVG

The hero was traced to SVG as a test: 27.6 MB at full detail, 19 MB balanced, and still 3 MB in two tones with visibly blotchy dots, against 0.69 MB as WebP. Hatching and stipple are millions of tiny marks, so they stay raster. Everything drawn in code is real vector.

---

## 6. Commands

```bash
# Python for generation (use this one, not the global python)
PY=C:\Users\offic\.venvs\imagegen\Scripts\python.exe

# Generate (prompts live in art/prompts/<name>.txt)
$PY art/generate_local.py card-atlas@4:5 --seeds 1 2          # FLUX: ~2 min each
$PY art/generate_qwen.py card-daedalus@4:5 --seeds 1          # Qwen: ~9 min each

# Patch one area: x0 y0 x1 y1 in pixels of the raw image
# --seeds gives one candidate per seed from a single model load; pick the cleanest
$PY art/fix_local.py art/raw/card-athena-s4.png 0 520 260 780 "Remove the hand at the left edge." --no-ref --seeds 1 2 3

# Color-lock and export to assets/art/<name>.webp (global python is fine)
python art/process.py art/raw/card-athena-s4-fixed.png card-athena
```

Ratios: `2:3`, `4:5`, `1:1`, `16:9`, `3:2`. Raw outputs land in `art/raw/`, which is kept out of git (drafts run to ~100 MB).

Before running anything heavy, close other GPU apps. Qwen needs the whole 8 GB and about 23 GB of free RAM.

---

## 7. Site fixes made in review

| Reported | Fix |
|---|---|
| Prometheus banner wrong (three arms) | Regenerated with two-arm anatomy, later removed from the page |
| Footer wordmark clipped, "/agent" outline glitching | Solid type, "/agent" in light gray, sized to fit the column exactly |
| "Yours to keep" tenet | Replaced with "Measured in outcomes" |
| Ring passing through the hero's leg | Hero replaced with `preview.png` |
| Hero magnifier | Removed: `preview.png` is 512×768, so zooming only showed blur |
| Daedalus had three hands and three legs | Regenerated half-length, exactly two hands |
| Hephaestus's apron bib and straps looked like a sando genji (vest) | Bib and straps painted out; bare chest, apron at the waist |
