/* Contact plate: Kepler's nested Platonic solids (Mysterium Cosmographicum, 1596),
   drawn in Leonardo's hollow-frame style and shaded live with engraving hatch.
   Five agent families, five perfect solids: ticking an agent type lights its solid,
   writing spins the assembly up, sending flashes it. Drag to turn. */
(() => {
  const cv = document.getElementById("solids");
  if (!cv) return;
  const panel = cv.parentElement;
  const copy = panel.querySelector(".contact__copy");
  const ctx = cv.getContext("2d");
  const clockEl = document.getElementById("contactClock");
  const infoEl = document.getElementById("solidsInfo");
  const form = document.getElementById("contactForm");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const tick = () => { clockEl.textContent = `Dhaka ${fmt.format(new Date())} · UTC+6`; };
  tick();
  setInterval(tick, 1000);

  /* ---------------- geometry ---------------- */
  const PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI;
  const unit = (vs) => { const r = Math.hypot(...vs[0]); return vs.map((v) => v.map((c) => c / r)); };
  const signs = (pattern) => {
    const out = [];
    const rec = (i, cur) => {
      if (i === pattern.length) return out.push(cur);
      if (pattern[i] === 0) rec(i + 1, [...cur, 0]);
      else { rec(i + 1, [...cur, pattern[i]]); rec(i + 1, [...cur, -pattern[i]]); }
    };
    rec(0, []);
    return out;
  };
  const TET = unit([[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]);
  const CUBE = unit(signs([1, 1, 1]));
  const OCT = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const ICO = unit([...signs([0, 1, PHI]), ...signs([1, PHI, 0]), ...signs([PHI, 0, 1])]);
  const DOD = unit([...signs([1, 1, 1]), ...signs([0, IP, PHI]), ...signs([IP, PHI, 0]), ...signs([PHI, 0, IP])]);

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(...a); return a.map((c) => c / l); };

  // faces of a convex solid: every supporting plane through three vertices
  function facesOf(vs) {
    const faces = [], seen = new Set();
    for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) for (let k = j + 1; k < vs.length; k++) {
      let n = cross(sub(vs[j], vs[i]), sub(vs[k], vs[i]));
      if (Math.hypot(...n) < 1e-9) continue;
      n = norm(n);
      let d = dot(n, vs[i]);
      if (d < 0) { n = n.map((c) => -c); d = -d; }
      if (vs.some((v) => dot(n, v) > d + 1e-6)) continue;
      const on = vs.map((v, q) => [v, q]).filter(([v]) => Math.abs(dot(n, v) - d) < 1e-6).map(([, q]) => q);
      const key = on.join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      const c = on.reduce((s, q) => s.map((x, a) => x + vs[q][a] / on.length), [0, 0, 0]);
      const u = norm(sub(vs[on[0]], c)), w = cross(n, u);
      on.sort((a, b) => Math.atan2(dot(sub(vs[a], c), w), dot(sub(vs[a], c), u)) - Math.atan2(dot(sub(vs[b], c), w), dot(sub(vs[b], c), u)));
      faces.push({ idx: on, n, d });
    }
    return faces;
  }

  const rot = (axis, a) => {
    const [x, y, z] = norm(axis), c = Math.cos(a), s = Math.sin(a), t = 1 - c;
    return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c];
  };
  const mul = (A, B) => [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => A[r * 3] * B[c] + A[r * 3 + 1] * B[3 + c] + A[r * 3 + 2] * B[6 + c]));
  const app = (M, v) => [M[0] * v[0] + M[1] * v[1] + M[2] * v[2], M[3] * v[0] + M[4] * v[1] + M[5] * v[2], M[6] * v[0] + M[7] * v[1] + M[8] * v[2]];

  // outside in: each solid fits inside the sphere inscribed in the one around it (Kepler's rule)
  const SOLIDS = [
    { key: "research", name: "dodecahedron", el: "the cosmos", vs: DOD, k: 0.76, speed: 0.07, axis: [0.3, 1, 0.2], m0: rot([1, 2, 3], 0.6) },
    { key: "support", name: "icosahedron", el: "water", vs: ICO, k: 0.8, speed: -0.11, axis: [1, 0.35, 0.3], m0: rot([2, -1, 1], 1.1) },
    { key: "operations", name: "cube", el: "earth", vs: CUBE, k: 0.8, speed: 0.15, axis: [0.25, 0.8, 1], m0: rot([1, 1, 0], 0.5) },
    { key: "workflows", name: "octahedron", el: "air", vs: OCT, k: 0.72, speed: -0.21, axis: [1, 1, 0.2], m0: rot([0, 1, 2], 0.8) },
    { key: "voice", name: "tetrahedron", el: "fire", vs: TET, k: 0, speed: 0.32, axis: [0.5, -1, 0.6], m0: rot([3, 1, 1], 0.4) },
  ];
  let r = 1;
  for (const s of SOLIDS) {
    s.faces = facesOf(s.vs);
    s.r = r;
    s.inR = r * s.faces[0].d; // its inscribed sphere
    r = s.inR * 0.965;
    s.angle = 0;
    s.pop = -9;
  }

  /* ---------------- layout ---------------- */
  let W = 0, H = 0, DPR = 1, CX = 0, CY = 0, R = 100, stacked = false;
  function resize() {
    const pb = panel.getBoundingClientRect();
    W = pb.width; H = pb.height;
    const wasStacked = stacked;
    stacked = W < 680;
    if (stacked !== wasStacked) { panel.classList.toggle("is-stacked", stacked); return; } // height changes, observer fires again
    DPR = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    const copyBottom = copy.getBoundingClientRect().bottom - pb.top;
    if (stacked) {
      R = Math.max(80, Math.min(W * 0.36, (H - copyBottom) / 2 - 34, 150));
      CX = W / 2; CY = copyBottom + (H - copyBottom) / 2 - 8;
    } else {
      R = Math.min(W * 0.245, H * 0.3, 200);
      CX = W - R - Math.max(28, W * 0.06); CY = H * 0.56;
    }
    draw();
  }

  /* ---------------- state ---------------- */
  const F = 4.4; // camera distance, in outer radii
  const LIGHT = norm([-0.55, 0.65, 0.55]);
  let t = 0, last = 0, raf = 0, visible = false;
  let spin = 1, spinTarget = 1, spinHold = 0, flashT = -9;
  let yaw = 0, pitch = 0, vYaw = 0, dragging = false, px = 0, py = 0;
  let chosen = [], unsure = false, lastIdle = -1;

  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  function active() {
    if (chosen.length) return chosen;
    if (unsure || reduce) return [];
    return [SOLIDS[Math.floor(t / 3.4) % SOLIDS.length].key];
  }
  function describe() {
    const on = active().map((k) => SOLIDS.find((s) => s.key === k));
    if (performance.now() < spinHold && spinTarget > 6) return "Brief sent · engineers notified";
    if (!on.length) return unsure ? "Not sure yet · we'll find its shape" : "5 agent families · 5 regular solids";
    if (on.length === 1) return `${cap(on[0].key)} · ${on[0].name} · ${on[0].el}`;
    return `${on.map((s) => cap(s.key)).join(" + ")} · ${on.map((s) => s.name).join(", ")}`;
  }

  /* ---------------- drawing ---------------- */
  const INK = "14,58,209";
  function project(p) {
    const s = (R * F) / (F - p[2]);
    return [CX + p[0] * s, CY - p[1] * s];
  }
  function hatch(c, x0, y0, x1, y1, gap, ang) {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, half = Math.hypot(x1 - x0, y1 - y0) / 2 + 2;
    for (let s = -half; s <= half; s += gap) {
      c.moveTo(cx - sa * s - ca * half, cy + ca * s - sa * half);
      c.lineTo(cx - sa * s + ca * half, cy + ca * s + sa * half);
    }
  }
  const pathOf = (c, pts) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };

  function draw() {
    if (!W) return;
    const c = ctx;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.clearRect(0, 0, W, H);
    c.lineJoin = "round"; c.lineCap = "round";
    const V = mul(rot([1, 0, 0], 0.32 + pitch + py * 0.12), rot([0, 1, 0], yaw + px * 0.2));
    const on = active();
    const pick = chosen.length > 0;
    const px1 = R / 172;
    const flash = Math.max(0, 1 - (t - flashT) / 0.8);

    // Kepler's spheres between the shells
    for (const s of SOLIDS.slice(0, -1)) {
      c.beginPath(); c.arc(CX, CY, s.inR * R * F / F, 0, Math.PI * 2);
      c.strokeStyle = "rgba(205,187,241,.22)"; c.lineWidth = 0.8; c.stroke();
    }

    // every face of every solid, back to front
    const items = [];
    for (const s of SOLIDS) {
      const M = mul(V, mul(rot(s.axis, s.angle), s.m0));
      const kpop = (t - s.pop) / 0.55;
      const scale = s.r * (kpop >= 0 && kpop < 1 ? 1 + 0.07 * Math.sin(Math.PI * kpop) : 1);
      const P = s.vs.map((v) => app(M, v).map((x) => x * scale));
      const lit = on.includes(s.key);
      for (const f of s.faces) {
        const pts = f.idx.map((q) => P[q]);
        const cen = pts.reduce((a, p) => a.map((x, i) => x + p[i] / pts.length), [0, 0, 0]);
        const n = app(M, f.n);
        const front = dot(n, sub([0, 0, F], cen)) > 0;
        items.push({ s, pts, cen, n, front, lit, z: cen[2] });
      }
    }
    items.sort((a, b) => a.z - b.z);

    for (const it of items) {
      const { s, pts, cen, n, front, lit } = it;
      const outer = pts.map(project);
      const inner = s.k ? pts.map((p) => project(cen.map((x, i) => x + (p[i] - x) * s.k))) : null;
      const b = front ? Math.max(0, dot(n, LIGHT)) : 0.5 * Math.max(0, -dot(n, LIGHT));
      let alpha = front ? 1 : 0.78;
      if (on.length && !lit) alpha *= pick ? 0.38 : 0.7;
      c.globalAlpha = alpha;

      const face = new Path2D();
      pathOf(face, outer);
      if (inner) pathOf(face, inner);
      c.fillStyle = lit ? "#f4f0ff" : "#cdbbf1";
      c.fill(face, "evenodd");
      if (flash > 0) { c.fillStyle = `rgba(255,255,255,${flash * 0.9})`; c.fill(face, "evenodd"); }

      // hatch along the face's first edge; tighter and crossed where the face turns from the light
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of outer) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      const ang = Math.atan2(outer[1][1] - outer[0][1], outer[1][0] - outer[0][0]);
      const dark = 1 - b;
      c.save();
      c.clip(face, "evenodd");
      c.beginPath();
      hatch(c, x0, y0, x1, y1, Math.max(1.4, (1.5 + 5.5 * b) * px1), ang);
      if (dark > 0.55) hatch(c, x0, y0, x1, y1, Math.max(1.6, (2 + 4 * (1 - dark)) * px1), ang + 1.15);
      c.strokeStyle = `rgba(${INK},${lit ? 0.55 : 0.7})`;
      c.lineWidth = 0.55;
      c.stroke();
      c.restore();

      c.beginPath(); pathOf(c, outer);
      c.strokeStyle = `rgb(${INK})`; c.lineWidth = (front ? 1.35 : 0.8) * (lit ? 1.25 : 1); c.stroke();
      if (inner) { c.beginPath(); pathOf(c, inner); c.lineWidth = front ? 0.9 : 0.6; c.stroke(); }
      if (lit && front) {
        for (const [x, y] of outer) {
          c.beginPath(); c.arc(x, y, 2.3, 0, Math.PI * 2);
          c.fillStyle = "#fff"; c.fill(); c.lineWidth = 1; c.stroke();
        }
      }
    }
    c.globalAlpha = 1;

    const text = describe();
    if (infoEl.textContent !== text) infoEl.textContent = text;
  }

  /* ---------------- motion ---------------- */
  function frame(now) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    t += dt;
    if (performance.now() > spinHold) spinTarget = 1;
    spin += (spinTarget - spin) * (spinTarget > spin ? 0.08 : 0.02);
    for (const s of SOLIDS) s.angle += s.speed * spin * dt;
    if (!dragging) { yaw += vYaw; vYaw *= 0.93; }
    const idle = chosen.length || unsure ? -1 : Math.floor(t / 3.4) % SOLIDS.length;
    if (idle !== lastIdle && idle >= 0) SOLIDS[idle].pop = t;
    lastIdle = idle;
    draw();
    if (visible) raf = requestAnimationFrame(frame);
  }
  const redraw = () => { if (reduce) draw(); };

  cv.addEventListener("pointerdown", (e) => { dragging = true; cv.setPointerCapture(e.pointerId); lastX = e.clientX; lastY = e.clientY; });
  let lastX = 0, lastY = 0;
  cv.addEventListener("pointermove", (e) => {
    const b = cv.getBoundingClientRect();
    px = ((e.clientX - b.left - CX) / Math.max(1, R)) * 0.5;
    py = ((e.clientY - b.top - CY) / Math.max(1, R)) * 0.5;
    px = Math.max(-1, Math.min(1, px)); py = Math.max(-1, Math.min(1, py));
    if (dragging) {
      vYaw = (e.clientX - lastX) * 0.008;
      yaw += vYaw;
      pitch = Math.max(-0.7, Math.min(0.7, pitch + (e.clientY - lastY) * 0.006));
      lastX = e.clientX; lastY = e.clientY;
    }
    redraw();
  });
  const release = () => { dragging = false; };
  cv.addEventListener("pointerup", release);
  cv.addEventListener("pointercancel", release);
  cv.addEventListener("pointerleave", () => { px = py = 0; redraw(); });

  if (form) {
    form.addEventListener("change", (e) => {
      if (e.target.name !== "kind") return;
      const vals = [...form.querySelectorAll('input[name="kind"]:checked')].map((x) => x.value.toLowerCase());
      unsure = vals.includes("not sure yet");
      const next = vals.filter((v) => SOLIDS.some((s) => s.key === v));
      next.filter((k) => !chosen.includes(k)).forEach((k) => { SOLIDS.find((s) => s.key === k).pop = t; });
      chosen = next;
      redraw();
    });
    form.addEventListener("input", (e) => {
      if (reduce) return;
      const words = e.target.matches("textarea") ? (e.target.value.trim().match(/\S+/g) || []).length : 0;
      spinTarget = Math.max(spinTarget, Math.min(6, 2 + words / 5));
      spinHold = performance.now() + 1200;
    });
    form.addEventListener("submit", () => {
      if (!form.checkValidity()) return;
      flashT = t;
      if (!reduce) { spinTarget = 14; spinHold = performance.now() + 2600; }
      redraw();
    });
  }

  new ResizeObserver(resize).observe(panel);
  if (reduce) return;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  }).observe(panel);
})();
