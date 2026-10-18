# Infectech Agent — landing page

Static site, no build step. Open `index.html`, or serve the folder:

```
python -m http.server 5173
```

```
index.html
assets/css/style.css     UI (neutral black/white, Geist + Geist Mono)
assets/js/main.js        reveals, agent console, live armillary sphere, contact form
assets/js/activity.js    "At work": autonomous agent runs replayed at speed, call map and
                         call log. The three runs are plain data in RUNS at the top.
assets/js/callmap3d.js   3D call map (Three.js r160 via import map, lazy-loaded); the 2D
                         canvas map in activity.js is the fallback without WebGL
assets/js/solids.js      contact plate: Kepler's nested Platonic solids in hollow engraved
                         frames, hatched live; ticking an agent type lights its solid,
                         writing spins them up, sending flashes them; studio clock
assets/svg/              logo mark, favicon, sphere glyph (true vector)
assets/art/              engravings, WebP (art.md section 7)
art/                     prompts + generation pipeline (art.md)
```

## Contact form

There is no backend: on submit the form opens the visitor's email app with every field filled in, addressed to `infectech.official@gmail.com`. To use a form service instead (Formspree, Basin, your own API), replace the `submit` handler in `assets/js/main.js` with a `fetch` POST to it.

The studio is set to Dhaka (clock time zone in `assets/js/solids.js`, Studio line in `index.html`).

## Art pipeline

Art direction lives in `art.md`. How the models run on this PC (8 GB GPU, RAM use, timings) and how each picture was fixed: [IMAGE-GENERATION.md](IMAGE-GENERATION.md). `preview.png` is attached as the style reference on every generation.

| Script | What it does |
|---|---|
| `art/generate.py` | Nano Banana API. Needs `GEMINI_API_KEY` with billing enabled (the free tier has no image quota). |
| `art/generate_qwen.py` | Same prompts, run locally with Qwen-Image-2.1-Turbo (7B, 8 steps, ~4 MP, research license). Best quality on 8 GB VRAM. |
| `art/generate_local.py` | Same prompts with FLUX.2 [klein] 4B (Apache-2.0). Faster, weaker on hands and feet. |
| `art/fix_local.py` | Repairs one region (e.g. stray ankle wings) and blends it back; the rest stays pixel-identical. |
| `art/draw_instrument.py` | Draws the promo band's astrolabe and gears as SVG layers (no AI). Prints the layer positions to paste into `index.html`. |
| `art/process.py` | Locks the duotone (`#0e3ad1` → `#cdbbf1`), tone-matches ink density to `preview.png`, exports WebP. |

Local generation uses an isolated venv so the global Python stays untouched:

```
C:\Users\offic\.venvs\imagegen\Scripts\python.exe art/generate_qwen.py card-atlas@4:5 --seeds 1 2
python art/process.py art/raw/card-atlas-q-s1.png card-atlas
```

Prompts are in `art/prompts/<name>.txt` and are wrapped in the house template from `art.md`.

Engravings stay raster on purpose: hatching and stipple don't survive vector tracing without
multi-megabyte files (see `art.md` section 7). Everything drawn in code — logo, icons, sphere — is vector.
