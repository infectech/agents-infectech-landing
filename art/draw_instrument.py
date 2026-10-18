"""Draw the engraved instrument for the CTA banner: pure geometry, no AI.

An astrolabe whose plate is a true stereographic projection for Dhaka (23.8° N), a rete
(star map) that turns, a rule on top, and two meshed gears behind it. Each moving part is
its own SVG so the browser can spin it on the GPU without repainting.

Engraved the house way (art.md section 6): ink #0e3ad1 on paper #cdbbf1, hatch shadows
from a light at the upper left. Parts that rotate use only rotation-symmetric shading
(concentric lines, bevels), so their light never appears to swing round.

  python art/draw_instrument.py      ->  assets/svg/instrument/*.svg, prints layer positions
"""
import math
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "svg" / "instrument"
INK, PAPER = "#0e3ad1", "#cdbbf1"
LX, LY = -0.6, -0.8  # toward the light (upper left), screen coordinates

# Design space is 1000 x 1000; the card crops the bottom of it.
CX, CY = 560.0, 590.0  # astrolabe centre
R0 = 372.0             # mater (outer disc)
RPLATE = 318.0         # limb inner edge / plate
LAT = math.radians(23.8)
EPS = math.radians(23.44)
RCAP = 312.0                                      # tropic of Capricorn
RE = RCAP / math.tan((math.pi / 2 + EPS) / 2)     # equator
RCAN = RE * math.tan((math.pi / 2 - EPS) / 2)     # tropic of Cancer


def n(v):
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else s


def P(x, y):
    return f"{n(x)} {n(y)}"


def circ(cx, cy, r):
    return f"M{P(cx - r, cy)}a{n(r)} {n(r)} 0 1 0 {n(2 * r)} 0a{n(r)} {n(r)} 0 1 0 {n(-2 * r)} 0Z"


def poly(pts):
    return "M" + "L".join(P(x, y) for x, y in pts) + "Z"


def polar(cx, cy, r, a):
    return cx + r * math.cos(a), cy + r * math.sin(a)


def arc_pts(cx, cy, r, a0, a1, steps):
    return [polar(cx, cy, r, a0 + (a1 - a0) * i / steps) for i in range(steps + 1)]


PATTERNS = (
    f'<pattern id="h1" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
    f'<path d="M0 3H6" stroke="{INK}" stroke-width=".8"/></pattern>'
    f'<pattern id="h2" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">'
    f'<path d="M0 1.6H3.2" stroke="{INK}" stroke-width=".9"/></pattern>'
    f'<pattern id="h3" width="5" height="5" patternUnits="userSpaceOnUse">'
    f'<path d="M0 2.5H5" stroke="{INK}" stroke-width=".4"/></pattern>'
)
STYLE = (
    f"<style>.p{{fill:{PAPER};stroke:{INK};stroke-width:1.6;stroke-linejoin:round}}"
    f".l{{fill:none;stroke:{INK};stroke-linecap:round}}.k{{fill:{INK}}}</style>"
)


def svg(box, body, defs=""):
    x, y, w, h = box
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{n(x)} {n(y)} {n(w)} {n(h)}">'
            f"<defs>{STYLE}{PATTERNS}{defs}</defs>{body}</svg>")


def crescent(cx, cy, r, shift, pattern, clip, away=False):
    """Hatched crescent on the side away from the light (or toward it when away=True)."""
    sx, sy = (-LX, -LY) if away else (LX, LY)
    d = circ(cx, cy, r) + circ(cx + sx * shift, cy + sy * shift, r)
    return f'<path d="{d}" fill="url(#{pattern})" fill-rule="evenodd" clip-path="url(#{clip})"/>'


# ---------------------------------------------------------------- gears
def gear(name, gx, gy, teeth, rp, phase):
    m = 2 * rp / teeth
    ro, rr = rp + m, rp - 1.25 * m
    ri, rh = rr - 0.16 * rp, 0.3 * rp
    half = math.pi / teeth
    pts = []
    for k in range(teeth):
        a = phase + 2 * math.pi * k / teeth
        for da, r in ((-half, rr), (-0.62 * half, rr), (-0.34 * half, ro), (0.34 * half, ro), (0.62 * half, rr)):
            pts.append(polar(gx, gy, r, a + da))
    d = poly(pts)
    spokes, sw = 5, 0.075 * rp
    rh2 = rh + 0.05 * rp
    for j in range(spokes):
        b0 = phase + 2 * math.pi * j / spokes
        b1 = b0 + 2 * math.pi / spokes
        wo, wi = math.asin(sw / ri), math.asin(sw / rh2)
        hole = arc_pts(gx, gy, ri, b0 + wo, b1 - wo, 16) + arc_pts(gx, gy, rh2, b1 - wi, b0 + wi, 8)
        d += poly(hole)
    d += circ(gx, gy, 0.07 * rp)
    # rotation-symmetric engraving: fine rings on the rim, dense rings on the hub
    rings = "".join(f'<circle class="l" cx="{n(gx)}" cy="{n(gy)}" r="{n(r)}" stroke-width=".55"/>'
                    for r in (rr - 3, rr - 6.5, ri + 3.5))
    rings += "".join(f'<circle class="l" cx="{n(gx)}" cy="{n(gy)}" r="{n(r)}" stroke-width=".7"/>'
                     for r in [rh2 - 2.5 - 3 * i for i in range(int((rh2 - 0.1 * rp) / 3))])
    body = (f'<path class="p" d="{d}" fill-rule="evenodd"/>'
            f'<g clip-path="url(#c)">{rings}</g>'
            f'<circle class="l" cx="{n(gx)}" cy="{n(gy)}" r="{n(rh2)}" stroke-width="1.2"/>')
    defs = f'<clipPath id="c"><path d="{d}" clip-rule="evenodd"/></clipPath>'
    box = (gx - ro - 2, gy - ro - 2, 2 * ro + 4, 2 * ro + 4)
    return name, box, svg(box, body, defs)


# ---------------------------------------------------------------- astrolabe body
def r_dec(dec):
    """Distance from the pole of a point at declination dec (stereographic, from the south pole)."""
    return RE * math.tan((math.pi / 2 - dec) / 2)


def almucantar(h):
    z = math.pi / 2 - h
    ys = r_dec(LAT - z)
    dn = LAT + z
    yn = r_dec(dn) if dn <= math.pi / 2 else -r_dec(math.pi - dn)
    return (ys + yn) / 2, abs(ys - yn) / 2  # centre offset toward the zenith, radius


def body_svg():
    y0 = CY - R0
    boss_y = y0 - 92
    ring_y, ring_r = boss_y - 50, 44.0
    out = []
    defs = []

    # suspension ring
    ring_d = circ(CX, ring_y, ring_r) + circ(CX, ring_y, ring_r - 11)
    defs.append(f'<clipPath id="ring"><path d="{ring_d}" clip-rule="evenodd"/></clipPath>')
    out.append(f'<path class="p" d="{ring_d}" fill-rule="evenodd"/>')
    out.append(crescent(CX, ring_y, ring_r, 12, "h1", "ring"))
    out.append(f'<circle class="l" cx="{n(CX)}" cy="{n(ring_y)}" r="{n(ring_r - 5.5)}" stroke-width=".6"/>')

    # throne
    t = (f"M{P(CX - 124, y0 + 44)}"
         f"C{P(CX - 84, y0 + 12)} {P(CX - 54, y0 - 10)} {P(CX - 38, y0 - 46)}"
         f"C{P(CX - 30, y0 - 64)} {P(CX - 34, y0 - 74)} {P(CX - 20, boss_y + 12)}"
         f"L{P(CX + 20, boss_y + 12)}"
         f"C{P(CX + 34, y0 - 74)} {P(CX + 30, y0 - 64)} {P(CX + 38, y0 - 46)}"
         f"C{P(CX + 54, y0 - 10)} {P(CX + 84, y0 + 12)} {P(CX + 124, y0 + 44)}Z")
    t += circ(CX - 30, y0 - 18, 8) + circ(CX + 30, y0 - 18, 8)
    defs.append(f'<clipPath id="thr"><path d="{t}" clip-rule="evenodd"/></clipPath>')
    out.append(f'<path class="p" d="{t}" fill-rule="evenodd"/>')
    out.append(f'<g clip-path="url(#thr)"><rect x="{n(CX + 4)}" y="{n(boss_y)}" width="130" height="150" fill="url(#h1)"/>'
               f'<rect x="{n(CX + 44)}" y="{n(boss_y)}" width="90" height="150" fill="url(#h2)"/></g>')
    out.append(f'<path class="l" d="M{P(CX, boss_y + 30)}L{P(CX, y0 + 6)}" stroke-width=".8"/>')

    # boss with shackle hole
    boss = circ(CX, boss_y, 25) + circ(CX, boss_y, 10)
    defs.append(f'<clipPath id="boss"><path d="{boss}" clip-rule="evenodd"/></clipPath>')
    out.append(f'<path class="p" d="{boss}" fill-rule="evenodd"/>')
    out.append(crescent(CX, boss_y, 25, 8, "h2", "boss"))

    # mater
    defs.append(f'<clipPath id="mat"><circle cx="{n(CX)}" cy="{n(CY)}" r="{n(R0)}"/></clipPath>')
    defs.append(f'<clipPath id="pl"><circle cx="{n(CX)}" cy="{n(CY)}" r="{n(RPLATE)}"/></clipPath>')
    out.append(f'<circle class="p" cx="{n(CX)}" cy="{n(CY)}" r="{n(R0)}" stroke-width="1.8"/>')
    out.append(crescent(CX, CY, R0, 48, "h1", "mat"))
    out.append(crescent(CX, CY, R0, 15, "h2", "mat"))

    # plate: true projection for Dhaka
    out.append(f'<circle cx="{n(CX)}" cy="{n(CY)}" r="{n(RPLATE)}" fill="{PAPER}"/>')
    plate = [f'<rect x="{n(CX - RPLATE)}" y="{n(CY - RPLATE)}" width="{n(2 * RPLATE)}" height="{n(2 * RPLATE)}" fill="url(#h3)"/>']
    for r, w in ((RCAP, 1.1), (RE, 1.0), (RCAN, 1.0)):
        plate.append(f'<circle class="l" cx="{n(CX)}" cy="{n(CY)}" r="{n(r)}" stroke-width="{w}"/>')
    plate.append(f'<path class="l" d="M{P(CX, CY - RPLATE)}V{n(CY + RPLATE)}M{P(CX - RPLATE, CY)}H{n(CX + RPLATE)}" stroke-width=".7"/>')
    for deg in range(0, 90, 6):
        yc, r = almucantar(math.radians(deg))
        w = 1.1 if deg == 0 else (.8 if deg % 30 == 0 else .5)
        plate.append(f'<circle class="l" cx="{n(CX)}" cy="{n(CY - yc)}" r="{n(r)}" stroke-width="{w}"/>')
    yc, r = almucantar(math.radians(-18))  # twilight
    plate.append(f'<circle class="l" cx="{n(CX)}" cy="{n(CY - yc)}" r="{n(r)}" stroke-width=".6" stroke-dasharray="3 4"/>')
    hz_c, hz_r = almucantar(0)
    defs.append(f'<clipPath id="hz"><circle cx="{n(CX)}" cy="{n(CY - hz_c)}" r="{n(hz_r)}"/></clipPath>')
    yz, yn = r_dec(LAT), -r_dec(-LAT)
    k, ym = (yz - yn) / 2, (yz + yn) / 2
    az = []
    for deg in range(15, 180, 15):
        xc = k / math.tan(math.radians(deg))
        rr = math.hypot(xc, k)
        az.append(f'<circle class="l" cx="{n(CX + xc)}" cy="{n(CY - ym)}" r="{n(rr)}" stroke-width=".45"/>')
    plate.append(f'<g clip-path="url(#hz)">{"".join(az)}</g>')
    plate.append(f'<circle class="k" cx="{n(CX)}" cy="{n(CY - yz)}" r="2.6"/>')  # zenith
    out.append(f'<g clip-path="url(#pl)">{"".join(plate)}</g>')
    # the plate sits below the limb: the rim throws a shadow on its upper left
    out.append(crescent(CX, CY, RPLATE, 22, "h1", "pl", away=True))
    out.append(crescent(CX, CY, RPLATE, 8, "h2", "pl", away=True))

    # limb: rings, degree scale, hour marks
    for r, w in ((R0 - 6, .7), (366, .7), (352, .9), (340, .7), (326, .7), (RPLATE, 1.6)):
        out.append(f'<circle class="l" cx="{n(CX)}" cy="{n(CY)}" r="{n(r)}" stroke-width="{w}"/>')
    ticks = {0.5: [], 0.8: [], 1.2: []}
    for d in range(360):
        a = math.radians(d)
        if d % 10 == 0:
            r1, w = 352, 1.2
        elif d % 5 == 0:
            r1, w = 356, 0.8
        else:
            r1, w = 360, 0.5
        x1, y1 = polar(CX, CY, r1, a)
        x2, y2 = polar(CX, CY, 366, a)
        ticks[w].append(f"M{P(x1, y1)}L{P(x2, y2)}")
    for w, segs in ticks.items():
        out.append(f'<path class="l" d="{"".join(segs)}" stroke-width="{w}"/>')
    hours = []
    for h in range(24):
        a = math.radians(h * 15)
        x1, y1 = polar(CX, CY, 326, a)
        x2, y2 = polar(CX, CY, 340, a)
        hours.append(f"M{P(x1, y1)}L{P(x2, y2)}")
        am = a + math.radians(7.5)
        mx, my = polar(CX, CY, 333, am)
        tx, ty = math.cos(am), math.sin(am)
        ux, uy = -ty, tx
        out.append(f'<path class="k" d="{poly([(mx + tx * 5, my + ty * 5), (mx + ux * 2.4, my + uy * 2.4), (mx - tx * 5, my - ty * 5), (mx - ux * 2.4, my - uy * 2.4)])}"/>')
    out.append(f'<path class="l" d="{"".join(hours)}" stroke-width=".8"/>')

    box = (CX - R0 - 4, ring_y - ring_r - 4, 2 * R0 + 8, CY + R0 + 4 - (ring_y - ring_r - 4))
    return "body", box, svg(box, "".join(out), "".join(defs))


# ---------------------------------------------------------------- rete (turns)
def rete_svg():
    out = []
    o_in = RCAP - 15
    out.append(f'<path class="p" d="{circ(CX, CY, RCAP)}{circ(CX, CY, o_in)}" fill-rule="evenodd"/>')
    out.append(f'<circle class="l" cx="{n(CX)}" cy="{n(CY)}" r="{n(RCAP - 4)}" stroke-width=".6"/>')

    # ecliptic: touches Capricorn at the top and Cancer at the bottom
    e = (RCAP - RCAN) / 2
    ex, ey, rm = CX, CY - e, (RCAP + RCAN) / 2
    band = 24
    # struts first so the rings sit on top of them
    bar = 5.5
    struts = [
        poly([(CX - o_in, CY - bar), (CX + o_in, CY - bar), (CX + o_in, CY + bar), (CX - o_in, CY + bar)]),
        poly([(CX - bar, CY + RCAN - 2), (CX + bar, CY + RCAN - 2), (CX + bar, CY + o_in), (CX - bar, CY + o_in)]),
        poly([(CX - bar, ey - rm + band - 2), (CX + bar, ey - rm + band - 2), (CX + bar, CY - 20), (CX - bar, CY - 20)]),
    ]
    out.append(f'<path class="p" d="{"".join(struts)}"/>')
    out.append(f'<path class="p" d="{circ(ex, ey, rm)}{circ(ex, ey, rm - band)}" fill-rule="evenodd"/>')
    segs = {0.5: [], 0.9: [], 1.3: []}
    for d in range(0, 360, 2):
        a = math.radians(d)
        if d % 30 == 0:
            r1, w = rm - band, 1.3
        elif d % 10 == 0:
            r1, w = rm - band * 0.55, 0.9
        else:
            r1, w = rm - band * 0.3, 0.5
        segs[w].append(f"M{P(*polar(ex, ey, r1, a))}L{P(*polar(ex, ey, rm, a))}")
    for w, s in segs.items():
        out.append(f'<path class="l" d="{"".join(s)}" stroke-width="{w}"/>')
    out.append(f'<circle class="l" cx="{n(ex)}" cy="{n(ey)}" r="{n(rm - band * 0.3)}" stroke-width=".5"/>')

    # star pointers: slim engraved daggers, each with a star at its tip
    stars = [(o_in, 22, 40), (o_in, 68, 34), (o_in, 118, 44), (o_in, 158, 30), (o_in, 205, 38),
             (o_in, 246, 46), (o_in, 292, 32), (o_in, 332, 40), (rm - band, 200, 30, ex, ey), (rm - band, 330, 26, ex, ey)]
    for s in stars:
        r, deg, ln = s[:3]
        ox, oy = (s[3], s[4]) if len(s) > 3 else (CX, CY)
        a = math.radians(deg)
        bx, by = polar(ox, oy, r + 2, a)
        tx, ty = polar(ox, oy, r - ln, a)
        ux, uy = -math.sin(a), math.cos(a)
        mx, my = polar(ox, oy, r - ln * 0.45, a)
        left = [(bx + ux * 6, by + uy * 6), (mx + ux * 4.2, my + uy * 4.2), (tx, ty)]
        right = [(tx, ty), (mx - ux * 4.2, my - uy * 4.2), (bx - ux * 6, by - uy * 6)]
        out.append(f'<path class="p" d="{poly(left + right)}" stroke-width="1.2"/>')
        out.append(f'<path class="k" d="{poly([(bx, by)] + right)}" opacity=".55"/>')
        out.append(f'<circle class="p" cx="{n(tx)}" cy="{n(ty)}" r="3.2" stroke-width="1"/>')

    out.append(f'<path class="p" d="{circ(CX, CY, 22)}{circ(CX, CY, 7)}" fill-rule="evenodd"/>')
    out.append(f'<circle class="l" cx="{n(CX)}" cy="{n(CY)}" r="15" stroke-width=".6"/>')
    box = (CX - RCAP - 3, CY - RCAP - 3, 2 * RCAP + 6, 2 * RCAP + 6)
    return "rete", box, svg(box, "".join(out))


# ---------------------------------------------------------------- rule + pin (static, on top)
def rule_svg():
    a = math.radians(-32)
    ux, uy = math.cos(a), math.sin(a)
    vx, vy = -uy, ux
    L = R0 - 14

    def at(t, s):
        return CX + ux * t + vx * s, CY + uy * t + vy * s

    shape = [at(-L, 0), at(-L + 40, -6), at(-34, -15), at(34, -15), at(L - 40, -6), at(L, 0),
             at(L - 40, 6), at(34, 15), at(-34, 15), at(-L + 40, 6)]
    d = poly(shape)
    lower = poly([at(-L, 0), at(L, 0), at(L - 40, 6), at(34, 15), at(-34, 15), at(-L + 40, 6)])
    body = (f'<path class="p" d="{d}"/>'
            f'<path d="{lower}" fill="url(#h1)"/>'
            f'<path class="l" d="M{P(*at(-L, 0))}L{P(*at(L, 0))}" stroke-width=".9"/>'
            f'<circle class="p" cx="{n(CX)}" cy="{n(CY)}" r="30"/>'
            f'<circle class="l" cx="{n(CX)}" cy="{n(CY)}" r="24" stroke-width=".6"/>'
            f'<path class="p" d="{poly([at(-6, -46), at(6, -46), at(6, 46), at(-6, 46)])}" stroke-width="1.2"/>'
            f'<circle class="k" cx="{n(CX)}" cy="{n(CY)}" r="11"/>'
            f'<circle cx="{n(CX - 3.5)}" cy="{n(CY - 3.5)}" r="3.2" fill="{PAPER}"/>')
    box = (CX - R0, CY - R0, 2 * R0, 2 * R0)
    return "rule", box, svg(box, body)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    # gear 1 drives gear 2 (2:1); phases set so the teeth mesh along the line between centres
    g1x, g1y, n1, rp1 = 250.0, 772.0, 36, 150.0
    n2, rp2 = 18, 75.0
    th = math.radians(-122)
    g2x, g2y = g1x + (rp1 + rp2) * math.cos(th), g1y + (rp1 + rp2) * math.sin(th)
    parts = [
        gear("gear-1", g1x, g1y, n1, rp1, th),
        gear("gear-2", g2x, g2y, n2, rp2, th + math.pi - math.pi / n2),
        body_svg(),
        rete_svg(),
        rule_svg(),
    ]
    for name, box, text in parts:
        (OUT / f"{name}.svg").write_text(text, encoding="utf-8")
        x, y, w, h = box
        print(f'{name:7s} {len(text) / 1024:5.1f} KB  style="left:{x / 10:.2f}%;top:{y / 10:.2f}%;'
              f'width:{w / 10:.2f}%;height:{h / 10:.2f}%"')


if __name__ == "__main__":
    main()
