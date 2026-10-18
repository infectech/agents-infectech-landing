/* 3D call map for "At work" (Three.js, loaded only when the section comes near).
   The agent is a lit armillary at the centre; its tools ride two tilted orbits; every
   tool call announced by activity.js ("agent:call") arcs out through space to the tool
   and back, with a fading trail and a pulse on arrival. Engraved palette: lavender
   paper, ink outlines, depth fog in the plate's blue. Drag to turn. */
const plate = document.getElementById("workPlate");
const host = plate && plate.querySelector(".orbit");
const fallback = document.getElementById("orbit");

if (host) {
  let started = false;
  new IntersectionObserver((es) => {
    if (!started && es.some((e) => e.isIntersecting)) { started = true; start(); }
  }, { rootMargin: "500px 0px" }).observe(host);
}

async function start() {
  let THREE;
  try {
    THREE = await import("three");
  } catch (err) {
    return; // the 2D call map stays
  }
  const probe = document.createElement("canvas");
  if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) return;
  if (document.fonts) await document.fonts.ready;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PAPER = 0xcdbbf1, INK = 0x0e3ad1, FOG = 0x15349f;
  const SERVERS = ["gmail", "slack", "xero", "stripe", "postgres", "sheets", "drive", "zendesk", "hubspot", "web"];
  const MARK = { gmail: "GM", slack: "SL", xero: "XE", stripe: "ST", postgres: "PG", sheets: "SH", drive: "DR", zendesk: "ZD", hubspot: "HS", web: "WB" };

  /* ---- renderer, scene, camera ---- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = "orbit__gl";
  host.prepend(renderer.domElement);
  fallback.style.display = "none";
  window.__callmap3d = true;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(FOG, 8, 20);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xffffff, 0.95));
  const sun = new THREE.DirectionalLight(0xffffff, 1.35);
  sun.position.set(-4, 7, 6);
  scene.add(sun);

  // three-step toon ramp: lit paper, mid, shadow, like an engraver's three tones
  const ramp = new THREE.DataTexture(new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]), 3, 1);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap: ramp, transparent: true });
  const outline = (r) => new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide, transparent: true }));

  function textTexture(draw, w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  const glowTex = textTexture((g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, "rgba(255,255,255,0.9)"); grd.addColorStop(0.35, "rgba(205,187,241,0.35)"); grd.addColorStop(1, "rgba(205,187,241,0)");
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  }, 128, 128);
  const ringTex = textTexture((g, w) => {
    g.strokeStyle = "#fff"; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 6, 0, Math.PI * 2); g.stroke();
  }, 128, 128);

  const world = new THREE.Group();
  scene.add(world);

  /* ---- the agent: a small armillary with a halo ---- */
  const core = new THREE.Group();
  world.add(core);
  core.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 48, 24), toon(0xe9e1ff)));
  core.add(outline(0.46));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0.5 }));
  halo.scale.set(3.4, 3.4, 1);
  core.add(halo);
  const gimbals = [0.7, 0.82, 0.94].map((r, i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.022, 8, 120), new THREE.MeshBasicMaterial({ color: i === 1 ? 0xffffff : PAPER, transparent: true, opacity: 0.9 }));
    m.rotation.set(i * 1.1 + 0.4, i * 0.7, i * 0.5);
    core.add(m);
    return m;
  });

  /* ---- orbits: engraved double lines with degree ticks ---- */
  const ORBITS = [
    { r: 2.35, tilt: [0.16, 0, 0.12], list: SERVERS.slice(0, 4), speed: 0.11 },
    { r: 3.75, tilt: [-0.1, 0, -0.14], list: SERVERS.slice(4), speed: -0.065 },
  ];
  const lineMat = (opacity) => new THREE.LineBasicMaterial({ color: PAPER, transparent: true, opacity });
  for (const o of ORBITS) {
    o.group = new THREE.Group();
    o.group.rotation.set(...o.tilt);
    world.add(o.group);
    for (const [dr, op] of [[0, 0.62], [0.05, 0.22]]) {
      const pts = [];
      for (let k = 0; k <= 256; k++) { const a = (k / 256) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * (o.r + dr), 0, Math.sin(a) * (o.r + dr))); }
      o.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(op)));
    }
    const ticks = [];
    for (let d = 0; d < 360; d += 5) {
      const a = (d * Math.PI) / 180, len = d % 30 === 0 ? 0.16 : 0.07;
      ticks.push(new THREE.Vector3(Math.cos(a) * o.r, 0, Math.sin(a) * o.r), new THREE.Vector3(Math.cos(a) * (o.r - len), 0, Math.sin(a) * (o.r - len)));
    }
    o.group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), lineMat(0.45)));
  }

  /* ---- engraved polar grid on the orbital plane ---- */
  {
    const grid = [];
    for (const r of [1.2, 3.05, 4.5]) {
      for (let k = 0; k < 160; k++) {
        const a0 = (k / 160) * Math.PI * 2, a1 = ((k + 0.5) / 160) * Math.PI * 2;
        grid.push(new THREE.Vector3(Math.cos(a0) * r, -0.02, Math.sin(a0) * r), new THREE.Vector3(Math.cos(a1) * r, -0.02, Math.sin(a1) * r));
      }
    }
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      grid.push(new THREE.Vector3(Math.cos(a) * 0.9, -0.02, Math.sin(a) * 0.9), new THREE.Vector3(Math.cos(a) * 4.5, -0.02, Math.sin(a) * 4.5));
    }
    world.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(grid), lineMat(0.13)));
  }

  /* ---- tools ---- */
  const nodes = {};
  ORBITS.forEach((o) => o.list.forEach((name, k) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 40, 20), toon(0xdcd0ff));
    const rim = outline(0.345);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textTexture((c, w, h) => {
        c.textAlign = "center"; c.textBaseline = "middle";
        c.font = "700 54px 'Geist Mono', ui-monospace, monospace";
        c.fillStyle = "#ffffff"; c.fillText(MARK[name], w / 2, 44);
        c.font = "500 44px 'Geist Mono', ui-monospace, monospace";
        c.fillStyle = "rgba(236,230,255,0.9)"; c.fillText(name, w / 2, 112);
      }, 384, 144),
      transparent: true, depthWrite: false,
    }));
    label.scale.set(1.5, 0.56, 1);
    label.position.set(0, -0.78, 0);
    const pulse = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, transparent: true, depthWrite: false, opacity: 0 }));
    g.add(body, rim, label, pulse);
    o.group.add(g);
    const tether = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineDashedMaterial({ color: PAPER, transparent: true, opacity: 0.2, dashSize: 0.08, gapSize: 0.12 }));
    world.add(tether);
    nodes[name] = { g, body, rim, label, pulse, tether, orbit: o, a0: (k / o.list.length) * Math.PI * 2 + (o === ORBITS[1] ? 0.5 : 0), hit: -1e9, used: false };
  }));

  /* ---- stipple dust for depth ---- */
  const dustPos = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i++) {
    const r = 4.6 + Math.random() * 4, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    dustPos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.55, r * Math.sin(ph) * Math.sin(th)], i * 3);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: PAPER, size: 0.035, transparent: true, opacity: 0.6, depthWrite: false }));
  world.add(dust);

  /* ---- packets ---- */
  const TRAIL = 26;
  const packets = [];
  const tmp = new THREE.Vector3(), from = new THREE.Vector3(), to = new THREE.Vector3(), ctrl = new THREE.Vector3();
  function addPacket(server, out, back) {
    const n = nodes[server];
    if (!n) return;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
    const trail = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95 }));
    trail.comet = Array.from({ length: 10 }, () => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      trail.add(sp);
      return sp;
    });
    world.add(head, trail);
    packets.push({ n, head, trail, t0: now, out: Math.max(out, 260) * 1.35, back: Math.max(back, 200) * 1.35 });
    if (!n.used) { n.used = true; }
  }
  function curvePoint(p, t, out) {
    p.n.g.getWorldPosition(to);
    from.set(0, 0, 0);
    if (!out) { const s = from.clone(); from.copy(to); to.copy(s); }
    ctrl.addVectors(from, to).multiplyScalar(0.5);
    ctrl.y += 0.9 + from.distanceTo(to) * 0.18;
    const u = 1 - t;
    return tmp.set(
      u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x,
      u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y,
      u * u * from.z + 2 * u * t * ctrl.z + t * t * to.z,
    );
  }
  const white = new THREE.Color(0xffffff), lav = new THREE.Color(PAPER), fogC = new THREE.Color(FOG);
  function stepPacket(p) {
    const e = now - p.t0, out = e < p.out;
    const t = out ? e / p.out : (e - p.out) / p.back;
    if (!out && t >= 1) return false;
    const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const et = ease(Math.min(1, t));
    p.head.position.copy(curvePoint(p, et, out));
    p.head.material.color.copy(out ? white : lav);
    p.head.scale.setScalar(out ? 1 : 0.8);
    const pos = p.trail.geometry.attributes.position, col = p.trail.geometry.attributes.color;
    const tail = Math.max(0, et - 0.35);
    for (let i = 0; i < TRAIL; i++) {
      const k = i / (TRAIL - 1);
      const q = curvePoint(p, tail + (et - tail) * k, out);
      pos.setXYZ(i, q.x, q.y, q.z);
      const c = (out ? white : lav).clone().lerp(fogC, 1 - k);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    pos.needsUpdate = true; col.needsUpdate = true;
    p.trail.comet.forEach((sp, j) => {
      const k = 1 - j / p.trail.comet.length;
      sp.position.copy(curvePoint(p, Math.max(0, et - (1 - k) * 0.3), out));
      sp.scale.setScalar(0.55 * k + 0.08);
      sp.material.opacity = 0.75 * k * k;
      sp.material.color.copy(out ? white : lav);
    });
    if (out && e + 16 >= p.out && !p.hit) { p.hit = true; p.n.hit = now; }
    return true;
  }

  /* ---- events from the run engine ---- */
  plate.addEventListener("agent:call", (e) => addPacket(e.detail.server, e.detail.out, e.detail.back));
  plate.addEventListener("agent:run", () => { for (const k in nodes) nodes[k].used = false; });

  /* ---- camera: slow orbit, drag to turn, a touch of pointer parallax ---- */
  let az = 0.5, el = 0.86, vAz = 0, dragging = false, lx = 0, ly = 0, px = 0, py = 0;
  const canvas = renderer.domElement;
  canvas.style.touchAction = "pan-y";
  canvas.addEventListener("pointerdown", (e) => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => {
    const b = canvas.getBoundingClientRect();
    px = ((e.clientX - b.left) / b.width - 0.5) * 2;
    py = ((e.clientY - b.top) / b.height - 0.5) * 2;
    if (!dragging) return;
    vAz = -(e.clientX - lx) * 0.006;
    az += vAz;
    el = Math.max(0.15, Math.min(1.25, el + (e.clientY - ly) * 0.004));
    lx = e.clientX; ly = e.clientY;
  });
  const release = () => { dragging = false; };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("pointerleave", () => { px = py = 0; });

  let dist = 11;
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the outer orbit (plus labels) inside the frame at any aspect
    const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
    dist = Math.max(7.5, 4.45 / Math.tan(Math.min(vHalf, hHalf)));
    scene.fog.near = dist - 1;
    scene.fog.far = dist + 13;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  /* ---- loop ---- */
  let now = 0, last = 0, raf = 0, visible = false;
  function frame(t) {
    raf = 0;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    now += dt * 1000;
    if (!dragging) { az += vAz + (reduce ? 0 : dt * 0.09); vAz *= 0.93; }
    const a = az + px * 0.12, e2 = el - py * 0.06;
    camera.position.set(Math.sin(a) * Math.cos(e2) * dist, Math.sin(e2) * dist, Math.cos(a) * Math.cos(e2) * dist);
    camera.lookAt(0, -0.35, 0);

    const time = now / 1000;
    gimbals.forEach((g, i) => { g.rotation.x += dt * (0.6 + i * 0.35); g.rotation.y += dt * (0.4 - i * 0.22); });
    halo.material.opacity = 0.42 + Math.sin(time * 2.2) * 0.08;
    dust.rotation.y = time * 0.02;
    for (const name in nodes) {
      const n = nodes[name], o = n.orbit;
      const ang = n.a0 + (reduce ? 0 : time * o.speed);
      n.g.position.set(Math.cos(ang) * o.r, 0, Math.sin(ang) * o.r);
      n.g.updateWorldMatrix(true, false);
      n.g.getWorldPosition(tmp);
      const tp = n.tether.geometry.attributes.position;
      tp.setXYZ(1, tmp.x, tmp.y, tmp.z); tp.needsUpdate = true;
      n.tether.computeLineDistances();
      n.tether.material.opacity = n.used ? 0.42 : 0.12;
      const k = (now - n.hit) / 520;
      n.pulse.material.opacity = k < 1 ? 0.9 * (1 - k) : 0;
      n.pulse.scale.setScalar(0.6 + Math.min(1, k) * 1.2);
      const target = n.used ? 1 : 0.55;
      n.body.material.opacity += (target - n.body.material.opacity) * 0.12;
      n.rim.material.opacity = n.body.material.opacity;
      n.label.material.opacity = 0.45 + n.body.material.opacity * 0.55;
      n.body.material.emissive.setRGB(k < 1 ? 0.35 * (1 - k) : 0, k < 1 ? 0.3 * (1 - k) : 0, k < 1 ? 0.45 * (1 - k) : 0);
    }
    for (let i = packets.length - 1; i >= 0; i--) {
      if (!stepPacket(packets[i])) {
        const p = packets.splice(i, 1)[0];
        world.remove(p.head, p.trail);
        p.head.geometry.dispose(); p.trail.geometry.dispose();
        p.trail.comet.forEach((sp) => sp.material.dispose());
      }
    }
    renderer.render(scene, camera);
    if (visible) raf = requestAnimationFrame(frame);
  }
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  }).observe(host);
}
