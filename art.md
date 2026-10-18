# Art direction: Engraved Minimal

Instructions for Claude. When the user asks for any artwork (hero, banner, card, illustration, icon, background), follow this file.

---

## 1. The workflow

**Figures (people, gods, bodies, faces)** → generate with the **Nano Banana 2.1 API**, always with the reference image attached (section 5).

**Everything else** → Claude draws it directly in code, no API call (section 6).

1. User asks for art, e.g. "art for the pricing section".
2. Claude decides: figure → API; object / ornament / texture → draw it.
3. For the API: Claude writes the prompt from the template, calls the API (or gives the user the call to run) **with the reference image attached every time**.
4. Claude checks, fixes and places the result (section 7).

---

## 2. The look

**Classical copperplate engraving art, set inside a minimal black-and-white tech UI.** All color and personality lives in the artwork; the UI stays neutral.

### Art style
- Mannerist / Renaissance copperplate engraving, 16th–17th century master-engraver feel
- Extremely fine, dense cross-hatching and contour hatching, stippling in shadows, visible burin lines
- High contrast: darkest areas almost solid blue
- Dynamic, twisting, monumental poses; billowing clouds, flaring drapery, sky, light
- Grainy print texture
- Duotone only — never full color, never gray

### Art palette (duotone)
| Role | Hex | Use |
|---|---|---|
| Ink | `#0e3ad1` | Lines, shadows (deep blue) |
| Paper | `#cdbbf1` | Highlights (pale lavender) |
| Art card fill | `#1b43c7` | Background behind art, edges |
| Labels on art | `#ece6ff` on `rgba(14,48,180,0.7)` | Small mono chips over art |

### UI palette (around the art)
| Role | Hex |
|---|---|
| Page background | `#fafafa` |
| Text | `#0a0a0a` |
| Secondary text | `#52525b` |
| Borders | `#e4e4e7` |
| Accent (small labels only) | `#1d3fd0` |

### Type
- Headlines: **Geist** Bold, large, tight letter-spacing (−0.035em)
- Labels: **Geist Mono**, uppercase, wide letter-spacing (0.2em)

### UI placement
- Art sits in **rounded cards, 24px corners**, filled `#1b43c7`
- Optional small mono labels in the card corners
- Buttons stay black/white pills; never color the UI to match the art

---

## 3. Originality rules

Keep every artwork recognizably ours, not a copy of Nous Research's Hermes Agent art.

- **Subjects from our story:** the six-armed Engineer (our hero), Daedalus, Hephaestus, Athena, Prometheus, Atlas, Renaissance machines (armillary spheres, astrolabes, gears, compasses).
- **Never include:** winged helmets, **wings on ankles or sandals**, caduceus, a sunburst with bundles of radiating string-like lines.
- **Our signature motif:** the armillary sphere (as halo, object, or ornament).
- **Two-strike test:** if a piece shares two or more of (subject, composition device, color, type style) with Hermes Agent's art, change one.

---

## 4. Asset types and sizes

| Asset | Ratio | Made by |
|---|---|---|
| Hero art | 2:3 portrait | API |
| Wide banner with a figure | 16:9 | API |
| Section / card art with a figure, hand or face | 1:1 or 4:5 | API |
| Objects (sphere, gear, compass, astrolabe) | 1:1 | Claude draws |
| Ornaments, borders, dividers, frames | any | Claude draws (SVG) |
| Icons | 1:1 | Claude draws (SVG) |
| Background textures (hatching, cloud lines) | any | Claude draws, or crops from existing art |

---

## 5. Nano Banana 2.1 API

### Reference image — attach it on EVERY call
- File: `art/reference/hero-engineer.png` (the approved six-armed Engineer hero).
- Add more approved pieces to `art/reference/` as the set grows; attach 1–3 of them.
- The reference is what keeps the style, contrast and blue consistent. Never generate without it.

### Prompt template
Fill the brackets. Keep the Style, Color and Avoid blocks word for word.

```
Use the attached image as the exact style reference: same dense fine cross-hatching, same high contrast, same deep blue and pale lavender duotone, same grainy print texture, same dramatic Mannerist engraving feel.

Create a new engraving:
Subject: [who or what, from section 3].
Pose / action: [dynamic, twisting; what they are doing; direction of motion].
Details: [objects held, drapery, setting].
Composition: [placement, crop, empty space for text if needed].
Background: [billowing engraved clouds / sky / workshop].

Style: copperplate engraving, extremely dense and fine cross-hatching, stippling in shadows, visible burin lines, anatomically correct hands with five fingers, darkest areas almost solid blue.

Color: strict duotone, deep blue ink (#0e3ad1) on pale lavender paper (#cdbbf1). No gray, no other colors, no soft shading.

Avoid: text, letters, watermark, signature, winged helmet, wings on ankles or sandals, caduceus, sunburst, radiating string lines, border.

Format: [ratio from section 4], extremely detailed.
```

### Fix-up prompts (send with the result as the new reference)
- Too stiff: "Make the pose dynamic: twisted torso, arms at different heights, strong upward motion. Change nothing else."
- Too soft: "Make the line work finer and denser, like a real copperplate engraving, with no smooth shading. Change nothing else."
- Hermes leftovers: "Remove the wings from the ankles and sandals; bare feet. Change nothing else."

### Example call (Python, `google-genai`; check the current Gemini docs for exact model name and options)
```python
from google import genai
from PIL import Image

client = genai.Client()  # reads GEMINI_API_KEY
ref = Image.open("art/reference/hero-engineer.png")
resp = client.models.generate_content(
    model="gemini-nano-banana-2.1",
    contents=[PROMPT, ref],
)
for part in resp.candidates[0].content.parts:
    if part.inline_data:
        open("art/raw/new-piece.png", "wb").write(part.inline_data.data)
```

Cost: about $0.034 per 1K image. Budget 2–4 tries per keeper.

---

## 6. What Claude draws itself

Claude draws these in code (Python/PIL or SVG) using the engraving technique: shapes shaded with hatch lines whose spacing and thickness follow the light, ink `#0e3ad1` on paper `#cdbbf1`, plus print grain.

- Instruments and objects: armillary spheres, gears, compasses, astrolabes, clockwork, columns, arches
- Ornaments: plate borders, dividers, corner flourishes, frames
- Icons: simple engraved-line icons, as SVG under 50 KB
- Textures: hatched backgrounds, cloud-line patterns
- Derived art: crops of hands, faces or clouds from approved pieces, recolors

Claude does NOT attempt realistic people, faces or animals in code — those always go to the API.

---

## 7. Processing every result

1. **Remove the Gemini watermark** (sparkle, bottom-right corner): crop it out or inpaint it.
2. **Check originality** against section 3 (especially ankle wings).
3. **Lock the colors** with a gradient map: project each pixel onto the line from the image's own ink color to its paper color (t = 0 ink, 1 paper), then map t to `#0e3ad1` → `#cdbbf1`. Keeps every line, only swaps color.
4. **Compress** to WebP, quality ~80, longest side ≤ 1600 px, under 1 MB. Detailed engravings stay raster; never trace them to SVG (a traced hero was 6.5 MB).
5. **Name** by place and subject: `hero-engineer.webp`, `card-daedalus.webp`, `icon-gear.svg`.
6. **Alt text** describing what's shown.
7. **Place** per section 2. Match any background behind the art to its edge color.
8. **Promote** strong results into `art/reference/` so future generations stay consistent.
