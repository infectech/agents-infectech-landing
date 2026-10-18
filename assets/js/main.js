(() => {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Load + nav ---------- */
  requestAnimationFrame(() => document.body.classList.add("is-loaded"));
  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("is-stuck", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Reveal on scroll (staggered per parent) ---------- */
  const reveals = [...document.querySelectorAll(".reveal")];
  const groups = new Map();
  reveals.forEach((el) => {
    const n = groups.get(el.parentElement) || 0;
    el.style.setProperty("--d", `${Math.min(n, 6) * 0.08}s`);
    groups.set(el.parentElement, n + 1);
  });
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- Promo instrument: only turn while on screen ---------- */
  const promo = document.querySelector(".promo");
  if (promo && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => promo.classList.toggle("is-off", !e.isIntersecting)).observe(promo);
  }

  /* ---------- Contact form: no backend, so hand everything to the visitor's email app ---------- */
  const form = document.getElementById("contactForm");
  if (form) {
    const status = document.getElementById("contactStatus");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const f = new FormData(form);
      const v = (k) => (f.get(k) || "").toString().trim();
      const kinds = f.getAll("kind").join(", ") || "Not specified";
      const subject = `New agent: ${v("company") || `${v("first")} ${v("last")}`}`;
      const body = [`Name: ${v("first")} ${v("last")}`, `Email: ${v("email")}`, `Company: ${v("company") || "-"}`,
                    `Agent: ${kinds}`, "", v("message")].join("\n");
      window.location.href = `mailto:infectech.official@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      status.textContent = "Opening your email app with everything filled in. Just press send.";
    });
  }

  /* ---------- Console: a sample run of the pantheon at work ---------- */
  const log = document.getElementById("console");
  const running = document.getElementById("running");
  const lines = [
    ["athena/research", "read 312 supplier filings → risk brief ready"],
    ["atlas/support", "triaged 48 tickets · 6 escalated to humans"],
    ["hephaestus/code", "opened PR #1284 · 212 tests passing"],
    ["daedalus/flow", "invoice → approval → ERP · step 3 of 5"],
    ["echo/voice", "call summarised · follow-up booked Tue 10:00"],
    ["plutus/finance", "reconciled 1,904 transactions · 3 flagged"],
    ["clio/sales", "26 leads enriched · 9 drafts awaiting review"],
    ["mnemosyne/memory", "learned: client prefers PDF over email"],
    ["argus/monitor", "all pipelines nominal · 0 alerts"],
  ];
  if (log) {
    const MAX = 6;
    let i = 0;
    const add = (agent, msg, instant) => {
      log.querySelectorAll("li").forEach((li) => li.classList.add("is-done"));
      const li = document.createElement("li");
      const a = document.createElement("span");
      const m = document.createElement("span");
      a.textContent = agent;
      li.append(a, m);
      log.append(li);
      while (log.children.length > MAX) log.firstElementChild.remove();
      if (instant || reduceMotion) { m.textContent = msg; return Promise.resolve(); }
      const caret = document.createElement("i");
      caret.className = "caret";
      return new Promise((done) => {
        let k = 0;
        const tick = () => {
          m.textContent = msg.slice(0, ++k);
          m.append(caret);
          if (k < msg.length) setTimeout(tick, 14 + Math.random() * 26);
          else { setTimeout(() => caret.remove(), 600); done(); }
        };
        tick();
      });
    };
    for (; i < 3; i++) add(...lines[i], true);
    const loop = async () => {
      await add(...lines[i % lines.length]);
      i++;
      if (running) running.textContent = 5 + Math.floor(Math.random() * 5);
      setTimeout(loop, 1500 + Math.random() * 1200);
    };
    if (!reduceMotion) setTimeout(loop, 1400);
    else for (; i < MAX; i++) add(...lines[i], true);
  }

  /* ---------- Armillary sphere: true 3D rings, engraved with depth ---------- */
  const canvas = document.getElementById("sphere");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const host = canvas.parentElement;
  const label = document.getElementById("ringLabel");
  const arms = [...document.querySelectorAll(".arm")];
  const NAMES = ["I · Perceive", "II · Reason", "III · Remember", "IV · Use tools", "V · Act", "VI · Report"];

  const LAV = "205,187,241", HI = "255,255,255";
  const rad = (d) => (d * Math.PI) / 180;
  const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => mul(a, 1 / Math.hypot(...a));
  const rotAxis = (p, k, t) => { // Rodrigues
    const c = Math.cos(t), s = Math.sin(t), d = p[0] * k[0] + p[1] * k[1] + p[2] * k[2];
    const kx = cross(k, p);
    return [0, 1, 2].map((i) => p[i] * c + kx[i] * s + k[i] * d * (1 - c));
  };
  const basis = (n) => { // two unit vectors spanning the plane with normal n
    const u = norm(cross(n, Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
    return [u, cross(n, u)];
  };

  // The polar axis lies in the meridian plane, tilted like an instrument set for a latitude.
  const POLE = norm(rotAxis([0, 1, 0], [0, 0, 1], rad(-30)));
  const [PU, PV] = basis(POLE);
  const ECL = norm(rotAxis(POLE, PU, rad(23.4)));
  const T = Math.sin(rad(23.4)), A = Math.sin(rad(66.6));
  // n: plane normal, off: offset along n, r: radius, band: width, ticks, major, cap: capability index
  const MOVING = [
    { n: POLE, r: 1, band: 0.07, ticks: 72, major: 6, cap: 2 },              // equator  · Remember
    { n: ECL, r: 1, band: 0.12, ticks: 72, major: 12, cap: 1, zodiac: true }, // ecliptic · Reason
    { n: PU, r: 1, band: 0.055, ticks: 36, major: 4, cap: 3 },               // colure   · Use tools
    { n: PV, r: 1, band: 0.055, ticks: 36, major: 4, cap: 4 },               // colure   · Act
    ...[T, -T, A, -A].map((h) => ({ n: POLE, off: h, r: Math.sqrt(1 - h * h), band: 0.03, ticks: 0, cap: -1 })),
  ];
  const FIXED = [
    { n: [0, 1, 0], r: 1.17, band: 0.085, ticks: 72, major: 4, cap: 0 },     // horizon  · Perceive
    { n: [0, 0, 1], r: 1.1, band: 0.07, ticks: 90, major: 8, cap: 5 },       // meridian · Report
  ];

  let W = 0, H = 0, DPR = 1, R = 0, CX = 0, CY = 0;
  let spin = 0.6, vel = 0.0022, pitch = rad(16);
  const yaw = rad(-22);
  let active = -1, hovered = false, visible = false, raf = 0, grain = null;

  const resize = () => {
    const b = host.getBoundingClientRect();
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = b.width; H = b.height;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    R = Math.min(W * 0.36, H * 0.3);
    CX = W / 2; CY = H * 0.43;
    // printed stipple, denser toward the plate edges
    grain = document.createElement("canvas");
    grain.width = canvas.width; grain.height = canvas.height;
    const g = grain.getContext("2d");
    g.fillStyle = `rgba(${LAV},0.18)`;
    for (let i = 0, n = Math.round((W * H) / 70); i < n; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      const d = Math.hypot(x - CX, y - CY) / Math.hypot(W, H);
      if (Math.random() < 0.15 + d * 1.4) g.fillRect(x * DPR, y * DPR, DPR * 0.9, DPR * 0.9);
    }
    draw();
  };

  // world -> [screenX, screenY, depth]; yaw about Y then pitch about X
  const view = (p) => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x = p[0] * cy + p[2] * sy, z0 = -p[0] * sy + p[2] * cy;
    const y = p[1] * cp - z0 * sp, z = p[1] * sp + z0 * cp;
    return [CX + x * R, CY - y * R, z];
  };

  // Segments collected per pass, then stroked in depth buckets (far = faint, near = full ink).
  const NB = 6;
  let segs = [];
  const seg = (a, b, rgb, lw, k = 1) => segs.push([a, b, rgb, lw, k]);
  const flush = (front) => {
    const groups = new Map();
    for (const s of segs) {
      const z = (s[0][2] + s[1][2]) / 2;
      if ((z >= 0) !== front) continue;
      const t = Math.min(1, Math.max(0, (z + 1.1) / 2.2));
      const key = `${s[2]}|${s[3]}|${s[4]}|${Math.min(NB - 1, Math.floor(t * NB))}`;
      (groups.get(key) || groups.set(key, []).get(key)).push(s);
    }
    for (const [key, list] of groups) {
      const [rgb, lw, k, b] = key.split("|");
      ctx.beginPath();
      for (const [a, c] of list) { ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); }
      ctx.strokeStyle = `rgba(${rgb},${(0.16 + 0.82 * Math.pow((+b + 0.5) / NB, 1.3)) * k})`;
      ctx.lineWidth = +lw;
      ctx.stroke();
    }
  };

  const ring = (rg, rot) => {
    const on = rg.cap >= 0 && rg.cap === active;
    const k = active >= 0 && !on ? 0.6 : 1;
    const rgb = on ? HI : LAV;
    const n = rot(rg.n), [u, w] = basis(n), c = mul(n, rg.off || 0);
    const at = (t, rr) => view(add3(c, add3(mul(u, Math.cos(t) * rr), mul(w, Math.sin(t) * rr))));
    const steps = 144, r0 = rg.r, r1 = rg.r * (1 - rg.band);
    let po = at(0, r0), pi = at(0, r1);
    for (let i = 1; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2, o = at(t, r0), q = at(t, r1);
      seg(po, o, rgb, on ? 1.6 : 1, k);
      seg(pi, q, rgb, on ? 1.2 : 0.7, k);
      po = o; pi = q;
    }
    for (let i = 0; i < rg.ticks; i++) {
      const t = (i / rg.ticks) * Math.PI * 2;
      const major = i % (rg.ticks / rg.major) === 0;
      const inner = major ? r1 : rg.r * (1 - rg.band * (rg.zodiac ? 0.32 : 0.45));
      seg(at(t, inner), at(t, r0), rgb, major ? (on ? 1.5 : 1.1) : 0.5, k);
    }
  };

  const globe = (rot) => {
    const g = 0.2 * R;
    ctx.save();
    ctx.beginPath(); ctx.arc(CX, CY, g, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(CX - g * 0.4, CY - g * 0.45, g * 0.05, CX, CY, g);
    grad.addColorStop(0, "#4a70ec"); grad.addColorStop(0.6, "#1d44c9"); grad.addColorStop(1, "#0e2c9e");
    ctx.fillStyle = grad; ctx.fill(); ctx.clip();
    ctx.strokeStyle = `rgba(${LAV},0.2)`; ctx.lineWidth = 0.55; ctx.beginPath();
    for (let y = -g * 0.2; y <= g * 1.4; y += 2.2) { ctx.moveTo(CX - g, CY + y); ctx.lineTo(CX + g, CY + y - g * 0.5); }
    ctx.stroke(); ctx.restore();
    // graticule of the little earth, turning with the cage
    const p = rot(POLE), [u, w] = basis(p), s = 0.2;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI, m = add3(mul(u, Math.cos(a)), mul(w, Math.sin(a)));
      let pen = false;
      for (let i = 0; i <= 48; i++) {
        const t = (i / 48) * Math.PI * 2, q = view(add3(mul(p, Math.cos(t) * s), mul(m, Math.sin(t) * s)));
        if (q[2] < 0) { pen = false; continue; }
        pen ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); pen = true;
      }
    }
    for (const h of [-0.5, 0, 0.5]) {
      const rr = Math.sqrt(1 - h * h) * s; let pen = false;
      for (let i = 0; i <= 48; i++) {
        const t = (i / 48) * Math.PI * 2, q = view(add3(mul(p, h * s), add3(mul(u, Math.cos(t) * rr), mul(w, Math.sin(t) * rr))));
        if (q[2] < 0) { pen = false; continue; }
        pen ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); pen = true;
      }
    }
    ctx.strokeStyle = `rgba(${LAV},0.55)`; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.beginPath(); ctx.arc(CX, CY, g, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${LAV},0.95)`; ctx.lineWidth = 1; ctx.stroke();
  };

  const stand = () => {
    const top = view([0, -1.1, 0])[1];
    const base = CY + R * 1.66, neck = base - R * 0.12;
    ctx.strokeStyle = `rgba(${LAV},0.85)`; ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(CX - 2.5, top); ctx.lineTo(CX - 4, neck);
    ctx.moveTo(CX + 2.5, top); ctx.lineTo(CX + 4, neck);
    ctx.stroke();
    for (const f of [0.28, 0.6]) {
      const y = top + (neck - top) * f;
      ctx.beginPath(); ctx.ellipse(CX, y, 8, 2.8, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(CX, neck, R * 0.16, R * 0.03, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(CX, base, R * 0.4, R * 0.065, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(CX - R * 0.16, neck); ctx.quadraticCurveTo(CX - R * 0.2, base - R * 0.02, CX - R * 0.4, base);
    ctx.moveTo(CX + R * 0.16, neck); ctx.quadraticCurveTo(CX + R * 0.2, base - R * 0.02, CX + R * 0.4, base);
    ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.rect(CX - R * 0.4, base, R * 0.8, R * 0.08); ctx.clip();
    ctx.beginPath(); ctx.ellipse(CX, base, R * 0.4, R * 0.065, 0, 0, Math.PI); ctx.clip();
    ctx.strokeStyle = `rgba(${LAV},0.4)`; ctx.lineWidth = 0.5; ctx.beginPath();
    for (let x = -R * 0.4; x < R * 0.4; x += 2.6) { ctx.moveTo(CX + x, base); ctx.lineTo(CX + x - 4, base + R * 0.08); }
    ctx.stroke(); ctx.restore();
  };

  const axis = (rot) => {
    const p = rot(POLE), a = view(mul(p, -1.24)), b = view(mul(p, 1.24));
    const steps = 24;
    for (let i = 0; i < steps; i++) {
      const s = view(mul(p, -1.24 + (2.48 * i) / steps)), e = view(mul(p, -1.24 + (2.48 * (i + 1)) / steps));
      seg(s, e, LAV, 1.3);
    }
    for (const q of [a, b]) { ctx.beginPath(); ctx.arc(q[0], q[1], 2.6, 0, Math.PI * 2); ctx.fillStyle = `rgba(${LAV},${q[2] < 0 ? 0.45 : 0.95})`; ctx.fill(); }
  };

  const draw = () => {
    if (!W) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(grain, 0, 0);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.lineCap = "round";
    const rot = (p) => rotAxis(p, POLE, spin);
    const still = (p) => p;
    stand();
    segs = [];
    FIXED.forEach((r) => ring(r, still));
    MOVING.forEach((r) => ring(r, rot));
    axis(rot);
    flush(false);
    globe(rot);
    flush(true);
  };

  // drag to turn, with inertia
  let dragging = false, lastX = 0, lastY = 0;
  const IDLE = 0.0022;
  host.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; host.setPointerCapture(e.pointerId); });
  host.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    vel = dx * 0.0035;
    spin += dx * 0.008;
    pitch = Math.max(rad(2), Math.min(rad(36), pitch + dy * 0.004));
    if (reduceMotion) draw();
  });
  const release = () => { dragging = false; };
  host.addEventListener("pointerup", release);
  host.addEventListener("pointercancel", release);

  const frame = () => {
    raf = 0;
    if (!visible) return;
    if (!dragging) vel += (IDLE - vel) * 0.02;
    spin += vel;
    draw();
    raf = requestAnimationFrame(frame);
  };
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf && !reduceMotion) raf = requestAnimationFrame(frame);
  }).observe(host);

  /* capabilities <-> rings */
  const setActive = (i) => {
    active = i;
    arms.forEach((a, k) => a.classList.toggle("is-active", k === i));
    label.textContent = i >= 0 ? NAMES[i] : "Drag to turn";
    if (reduceMotion) draw();
  };
  let next = 0, timer = 0;
  const cycle = () => {
    clearInterval(timer);
    if (!reduceMotion) timer = setInterval(() => { if (!hovered && visible) setActive(next++ % 6); }, 2600);
  };
  arms.forEach((a, i) => {
    a.addEventListener("pointerenter", () => { hovered = true; setActive(i); });
    a.addEventListener("pointerleave", () => { hovered = false; next = i + 1; cycle(); });
    a.addEventListener("click", () => setActive(active === i ? -1 : i));
  });
  cycle();
})();
