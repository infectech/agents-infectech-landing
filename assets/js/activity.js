/* "At work": replayed, fully autonomous agent runs (in the spirit of ReUI's agent-activity
   blocks) wired to a call map and a call log. Three scripted runs loop at speed. Every tool
   call flies from the agent core to its server and back on the call map, then lands in the
   log. One clock drives everything and pauses off screen or on Pause. */
(() => {
  const plate = document.getElementById("workPlate");
  if (!plate) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => document.getElementById(id);
  const el = {
    title: $("runTitle"), meta: $("runMeta"), avatar: $("runAvatar"), status: $("runStatus"),
    steps: $("runSteps"), progress: $("runProgress"), pause: $("runPause"), scopes: $("runScopes"),
    tally: $("orbitTally"), name: $("orbitName"), rows: $("auditRows"), foot: $("auditFoot"), canvas: $("orbit"),
  };

  const SERVERS = ["gmail", "slack", "xero", "stripe", "postgres", "sheets", "drive", "zendesk", "hubspot", "web"];
  const MARK = { gmail: "GM", slack: "SL", xero: "XE", stripe: "ST", postgres: "PG", sheets: "SH", drive: "DR", zendesk: "ZD", hubspot: "HS", web: "WB" };

  // call: [server, tool, ms]
  const RUNS = [
    {
      title: "Reconcile March invoices", agent: "plutus · finance agent", mark: "P", byHand: "about 3 h",
      scopes: [["gmail", "read · send"], ["xero", "read · write"], ["postgres", "read"], ["drive", "write"], ["sheets", "write"], ["slack", "post"]],
      steps: [
        { doing: "Searching the inbox", done: "Read 214 emails", detail: 'in:inbox "invoice" after:2026/03/01', ms: 670,
          calls: [["gmail", "search_messages", 410], ["gmail", "get_message ×214", 260]] },
        { doing: "Pulling invoices", done: "Pulled 186 invoices", detail: "invoices?status=AUTHORISED", ms: 380, calls: [["xero", "list_invoices", 380]] },
        { doing: "Querying payments", done: "186 rows in 140ms", detail: "select * from payments where month = '2026-03'", ms: 140, calls: [["postgres", "query", 140]] },
        { doing: "Matching payments", done: "Matched 179 of 186", detail: "amount ±0.5%, date ±3d, reference", ms: 900, think: true, calls: [] },
        { doing: "Drafting reminders", done: "Drafted 7 reminders", detail: "templates/late-payment.md", ms: 640,
          calls: [["drive", "read_file", 120], ["drive", "create_doc ×7", 520]] },
        { doing: "Sending reminders", done: "Sent 7 reminders", detail: "send_message ×7", ms: 430, calls: [["gmail", "send_message ×7", 430]] },
        { doing: "Updating the ledger", done: "Ledger updated", detail: "payments +179 · 3 flagged", ms: 470,
          calls: [["xero", "create_payments", 310], ["sheets", "append_rows", 160]] },
        { doing: "Posting a summary", done: "Posted to #finance", detail: "179 matched · 7 chased · 3 flagged", ms: 110, calls: [["slack", "post_message", 110]] },
      ],
    },
    {
      title: "Clear the overnight support queue", agent: "atlas · support agent", mark: "A", byHand: "about 6 h",
      scopes: [["zendesk", "read · write"], ["hubspot", "read"], ["stripe", "read · refund ≤ $500"], ["slack", "post"]],
      steps: [
        { doing: "Fetching the queue", done: "48 new tickets", detail: "status:new created>yesterday", ms: 260, calls: [["zendesk", "list_tickets", 260]] },
        { doing: "Searching the help centre", done: "48 answers found", detail: "search_articles ×48", ms: 620, calls: [["zendesk", "search_articles ×48", 620]] },
        { doing: "Looking up customers", done: "31 accounts matched", detail: "contacts by email", ms: 620,
          calls: [["hubspot", "get_contact ×31", 440], ["stripe", "list_charges", 180]] },
        { doing: "Drafting replies", done: "Drafted 48 replies", detail: "plain, friendly · cites the help centre", ms: 1100, think: true, calls: [] },
        { doing: "Issuing a refund", done: "Refunded $240", detail: "within the $500 policy", ms: 230, calls: [["stripe", "create_refund", 230]] },
        { doing: "Replying", done: "Replied to 46 tickets", detail: "update_ticket ×46", ms: 540, calls: [["zendesk", "update_ticket ×46", 540]] },
        { doing: "Escalating", done: "Escalated 2 to tier-2", detail: "needs account access", ms: 120, calls: [["zendesk", "assign ×2", 120]] },
        { doing: "Posting a summary", done: "Posted to #support", detail: "46 solved · 2 escalated · 1 refund", ms: 90, calls: [["slack", "post_message", 90]] },
      ],
    },
    {
      title: "Due diligence on 3 suppliers", agent: "athena · research agent", mark: "A", byHand: "about 2 days",
      scopes: [["web", "read"], ["drive", "read · write · share"], ["sheets", "write"], ["hubspot", "read"]],
      steps: [
        { doing: "Searching", done: "Ran 12 searches", detail: '"Acme Metals" OR "Borealis Freight" OR …', ms: 640, calls: [["web", "search ×12", 640]] },
        { doing: "Reading filings", done: "Read 9 filings", detail: "annual reports · 2023–2025", ms: 880, calls: [["web", "fetch ×9", 880]] },
        { doing: "Extracting figures", done: "64 figures extracted", detail: "revenue, debt, liquidity, auditors", ms: 610, calls: [["drive", "extract_pdf ×9", 610]] },
        { doing: "Checking sanctions lists", done: "No matches on 4 lists", detail: "OFAC · UN · EU · UK", ms: 300,
          calls: [["web", "sanctions_check ×4", 210], ["hubspot", "get_company", 90]] },
        { doing: "Building the risk table", done: "Risk table, 3 vendors", detail: "sheets/supplier-risk", ms: 260, calls: [["sheets", "write_rows", 260]] },
        { doing: "Writing the brief", done: "Brief with 23 citations", detail: "confidence: high ×2, medium ×1", ms: 1000, think: true, calls: [["drive", "create_doc", 180]] },
        { doing: "Sharing", done: "Shared with procurement", detail: "share · procurement@", ms: 90, calls: [["drive", "share", 90]] },
      ],
    },
  ];

  const ICON = {
    queued: '<circle cx="9" cy="9" r="7" stroke-dasharray="2.2 2.6"/>',
    running: '<g class="spin-icon"><circle cx="9" cy="9" r="7" opacity=".3"/><path d="M9 2a7 7 0 0 1 7 7"/></g>',
    done: '<circle cx="9" cy="9" r="7"/><path d="m6 9.2 2 2 4-4.2"/>',
    think: '<path d="M9 2.5 10.4 7.6 15.5 9 10.4 10.4 9 15.5 7.6 10.4 2.5 9 7.6 7.6Z"/>',
  };
  const fmtMs = (ms) => (ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`);
  const fmtClock = (ms) => `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(1).padStart(4, "0")}`;
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---- one clock for everything ---- */
  let clock = 0, agentClock = 0, paused = false, visible = false, last = 0, raf = 0, running = false;
  const waiters = [];
  const wait = (ms) => new Promise((ok) => waiters.push({ at: clock + ms, ok }));
  const tickers = new Set();

  function loop(now) {
    raf = 0;
    const dt = last ? Math.min(64, now - last) : 0;
    last = now;
    if (!paused) {
      clock += dt;
      if (running) agentClock += dt;
      for (let i = waiters.length - 1; i >= 0; i--) {
        if (waiters[i].at <= clock) waiters.splice(i, 1)[0].ok();
      }
    }
    tickers.forEach((f) => f());
    if (!window.__callmap3d) drawOrbit();
    if (visible) raf = requestAnimationFrame(loop);
  }
  const resume = () => { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } };

  el.pause.addEventListener("click", () => {
    paused = !paused;
    el.pause.textContent = paused ? "Resume" : "Pause";
    plate.dispatchEvent(new CustomEvent("agent:pause", { detail: { paused } }));
    setStatus(paused ? "Paused" : running ? "Working" : "Done");
  });
  function setStatus(text) {
    el.status.textContent = text;
    el.status.className = "badge" + (text === "Done" ? " badge--done" : "");
  }

  /* ---- run card ---- */
  let items = [], currentRun = RUNS[0];
  function setStep(i, state) {
    const s = currentRun.steps[i], li = items[i];
    const icon = state === "done" && s.think ? ICON.think : ICON[state];
    const srv = s.calls[0] ? `<span class="rstep__srv">${s.calls[0][0]}</span>` : "";
    li.className = `rstep is-${state}`;
    li.innerHTML = `<svg class="rstep__icon" viewBox="0 0 18 18" aria-hidden="true">${icon}</svg>
      <div class="rstep__line"><span class="rstep__title">${esc(state === "done" ? s.done : s.doing)}</span>${srv}<span class="rstep__detail">${esc(s.detail)}</span></div>
      <span class="rstep__time">${state === "done" ? fmtMs(s.ms) : ""}</span>`;
    return li;
  }
  function renderScopes(run) {
    el.scopes.innerHTML = run.scopes.map(([srv, what]) => `<li><b>${srv}</b> ${esc(what)}</li>`).join("");
  }

  /* ---- call log ---- */
  let callCount = 0, durations = [], usedServers = new Set(), inFlight = 0, skel = null;
  function syncSkeleton() {
    if (inFlight > 0 && !skel) {
      skel = document.createElement("li");
      skel.className = "audit__row audit__skel";
      skel.innerHTML = "<span></span><span></span><span></span><span></span>";
      el.rows.prepend(skel);
    } else if (inFlight === 0 && skel) { skel.remove(); skel = null; }
  }
  function addRow(server, tool, ms) {
    const li = document.createElement("li");
    li.className = "audit__row";
    li.innerHTML = `<span class="audit__srv">${server}</span><span>${esc(tool)}</span><span class="res">ok</span><time>${fmtMs(ms)}</time>`;
    el.rows.insertBefore(li, skel ? skel.nextSibling : el.rows.firstChild);
    while (el.rows.children.length > 14) el.rows.lastElementChild.remove();
  }
  function updateLog() {
    const sorted = durations.slice().sort((a, b) => a - b);
    const p50 = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    el.foot.textContent = callCount ? `${callCount} calls · p50 ${fmtMs(p50)} · ${usedServers.size} tools · autonomous` : "Waiting for the first call";
    el.tally.textContent = `${callCount} calls · ${usedServers.size} tools`;
  }

  /* ---- calls: out to the server and back on the call map ---- */
  const packets = [], pulses = {};
  const OUT = 190, BACK = 150;
  async function call(server, tool, ms) {
    inFlight++;
    syncSkeleton();
    usedServers.add(server);
    const p = { server, t0: clock };
    packets.push(p);
    plate.dispatchEvent(new CustomEvent("agent:call", { detail: { server, out: OUT, back: BACK } }));
    await wait(OUT);
    pulses[server] = clock;
    await wait(BACK);
    packets.splice(packets.indexOf(p), 1);
    inFlight--;
    callCount++;
    durations.push(ms);
    addRow(server, tool, ms);
    syncSkeleton();
    updateLog();
  }

  /* ---- playing a run ---- */
  async function play(run) {
    currentRun = run;
    el.title.textContent = run.title;
    el.meta.textContent = run.agent;
    el.avatar.textContent = run.mark;
    el.name.textContent = `Call map · ${run.agent.split(" · ")[0]}`;
    plate.dispatchEvent(new CustomEvent("agent:run", { detail: { name: run.agent.split(" · ")[0] } }));
    el.steps.innerHTML = "";
    el.rows.innerHTML = "";
    skel = null;
    callCount = 0; durations = []; usedServers = new Set();
    updateLog();
    renderScopes(run);
    items = run.steps.map(() => { const li = document.createElement("li"); el.steps.append(li); return li; });
    run.steps.forEach((_, i) => setStep(i, "queued"));
    agentClock = 0;
    running = true;
    setStatus(paused ? "Paused" : "Working");
    const n = run.steps.length;

    for (let i = 0; i < n; i++) {
      const s = run.steps[i];
      const footer = () => { el.progress.textContent = `Step ${i + 1} of ${n} · ${fmtClock(agentClock)}`; };
      tickers.add(footer);
      const li = setStep(i, "running");
      const bar = document.createElement("div");
      bar.className = "rstep__bar";
      bar.innerHTML = "<i></i>";
      li.append(bar);
      const dur = Math.max(260, Math.min(1000, s.ms));
      const t0 = clock;
      const fill = () => { bar.firstChild.style.width = `${Math.min(100, ((clock - t0) / dur) * 100)}%`; };
      tickers.add(fill);
      s.calls.forEach((c, k) => wait(k * 70).then(() => call(...c)));
      await wait(dur);
      tickers.delete(fill);
      tickers.delete(footer);
      setStep(i, "done");
      footer();
    }

    while (inFlight > 0) await wait(50);
    running = false;
    setStatus(paused ? "Paused" : "Done");
    el.progress.textContent = `Done in ${fmtClock(agentClock)} · by hand: ${run.byHand}`;
    await wait(2800);
  }

  /* ---- call map: the agent at the core, tools on two tilted orbits ---- */
  const ctx = el.canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  const INK = "14,58,209", PAPER = "#cdbbf1", LAV = "205,187,241", TAU = Math.PI * 2;
  const inner = SERVERS.slice(0, 4), outer = SERVERS.slice(4);

  function sizeOrbit() {
    const b = el.canvas.getBoundingClientRect();
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = b.width; H = b.height;
    el.canvas.width = Math.round(W * DPR);
    el.canvas.height = Math.round(H * DPR);
    drawOrbit();
  }
  function geometry() {
    const cx = W / 2, cy = H / 2 + 10;
    const ry2 = Math.max(60, Math.min(H / 2 - 48, W / 2 - 46));
    const aspect = Math.max(1, Math.min(1.7, (W - 100) / (2 * ry2)));
    return { cx, cy, rings: [{ rx: ry2 * 0.56 * aspect, ry: ry2 * 0.56, list: inner, dir: 1 }, { rx: ry2 * aspect, ry: ry2, list: outer, dir: -1 }] };
  }
  function positions(g) {
    const spin = reduce ? 0 : clock / 40000;
    const pos = {};
    g.rings.forEach((r, ri) => r.list.forEach((s, k) => {
      const a = (k / r.list.length) * TAU + ri * 0.5 + spin * TAU * r.dir * (ri ? 0.6 : 1) - Math.PI / 2;
      pos[s] = [g.cx + Math.cos(a) * r.rx, g.cy + Math.sin(a) * r.ry];
    }));
    return pos;
  }
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  function drawOrbit() {
    if (!W) return;
    const g = geometry(), pos = positions(g), c = ctx;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.clearRect(0, 0, W, H);
    c.lineCap = "round";

    for (const r of g.rings) {
      c.beginPath(); c.ellipse(g.cx, g.cy, r.rx, r.ry, 0, 0, TAU);
      c.strokeStyle = `rgba(${LAV},.38)`; c.lineWidth = 1; c.stroke();
      c.beginPath();
      for (let d = 0; d < 360; d += 6) {
        const a = (d * Math.PI) / 180, x = g.cx + Math.cos(a) * r.rx, y = g.cy + Math.sin(a) * r.ry;
        const nx = Math.cos(a) / r.rx, ny = Math.sin(a) / r.ry, nl = Math.hypot(nx, ny), len = d % 30 === 0 ? 6 : 3;
        c.moveTo(x, y); c.lineTo(x + (nx / nl) * len, y + (ny / nl) * len);
      }
      c.strokeStyle = `rgba(${LAV},.3)`; c.lineWidth = 0.8; c.stroke();
    }
    c.setLineDash([2, 4]);
    for (const s of SERVERS) {
      const [x, y] = pos[s];
      c.beginPath(); c.moveTo(g.cx, g.cy); c.lineTo(x, y);
      c.strokeStyle = `rgba(${LAV},${usedServers.has(s) ? 0.4 : 0.14})`; c.lineWidth = 1; c.stroke();
    }
    c.setLineDash([]);

    for (const p of packets) {
      const [x1, y1] = pos[p.server];
      const e = clock - p.t0, out = e < OUT;
      const t = out ? ease(e / OUT) : ease(Math.min(1, (e - OUT) / BACK));
      const [ax, ay, bx, by] = out ? [g.cx, g.cy, x1, y1] : [x1, y1, g.cx, g.cy];
      const x = ax + (bx - ax) * t, y = ay + (by - ay) * t, tt = Math.max(0, t - 0.3);
      c.beginPath(); c.moveTo(ax + (bx - ax) * tt, ay + (by - ay) * tt); c.lineTo(x, y);
      c.strokeStyle = out ? "rgba(255,255,255,.9)" : `rgba(${LAV},.85)`; c.lineWidth = out ? 2.2 : 1.6; c.stroke();
      c.beginPath(); c.arc(x, y, out ? 3.4 : 2.6, 0, TAU); c.fillStyle = out ? "#fff" : PAPER; c.fill();
    }

    c.textAlign = "center";
    c.textBaseline = "middle";
    for (const s of SERVERS) {
      const [x, y] = pos[s], used = usedServers.has(s), k = (clock - (pulses[s] ?? -1e9)) / 450;
      if (k < 1) {
        c.beginPath(); c.arc(x, y, 17 + k * 14, 0, TAU);
        c.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k)})`; c.lineWidth = 1.6; c.stroke();
      }
      c.globalAlpha = used ? 1 : 0.45;
      c.beginPath(); c.arc(x, y, 16, 0, TAU); c.fillStyle = PAPER; c.fill();
      c.lineWidth = 1.3; c.strokeStyle = `rgb(${INK})`; c.stroke();
      c.beginPath(); c.arc(x, y, 12.5, 0, TAU); c.lineWidth = 0.6; c.stroke();
      c.font = "700 10px 'Geist Mono', ui-monospace, monospace";
      c.fillStyle = `rgb(${INK})`; c.fillText(MARK[s], x, y + 0.5);
      c.font = "500 9.5px 'Geist Mono', ui-monospace, monospace";
      c.fillStyle = `rgba(236,230,255,${used ? 0.85 : 0.6})`; c.fillText(s, x, y + 27);
      c.globalAlpha = 1;
    }

    const spin = reduce ? 0.6 : clock / 700;
    c.beginPath(); c.arc(g.cx, g.cy, 34, 0, TAU); c.strokeStyle = `rgba(${LAV},.5)`; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.arc(g.cx, g.cy, 26, 0, TAU); c.fillStyle = PAPER; c.fill();
    c.lineWidth = 1.5; c.strokeStyle = `rgb(${INK})`; c.stroke();
    c.save();
    c.beginPath(); c.arc(g.cx, g.cy, 26, 0, TAU); c.clip();
    c.lineWidth = 1;
    c.beginPath(); c.ellipse(g.cx, g.cy, 26, 26 * Math.abs(Math.cos(spin)), 0.35, 0, TAU); c.stroke();
    c.beginPath(); c.ellipse(g.cx, g.cy, 26 * Math.abs(Math.sin(spin * 0.8)), 26, 0, 0, TAU); c.stroke();
    c.beginPath(); c.ellipse(g.cx, g.cy, 26, 7, -0.5, 0, TAU); c.stroke();
    c.restore();
    c.beginPath(); c.arc(g.cx, g.cy, 4.5, 0, TAU); c.fillStyle = `rgb(${INK})`; c.fill();
  }

  /* ---- reduced motion: one finished run, still ---- */
  function still() {
    const run = RUNS[0];
    currentRun = run;
    el.name.textContent = `Call map · ${run.agent.split(" · ")[0]}`;
    items = run.steps.map(() => { const li = document.createElement("li"); el.steps.append(li); return li; });
    run.steps.forEach((_, i) => setStep(i, "done"));
    renderScopes(run);
    run.steps.flatMap((s) => s.calls).forEach(([s, t, ms]) => { usedServers.add(s); callCount++; durations.push(ms); addRow(s, t, ms); });
    updateLog();
    setStatus("Done");
    el.pause.hidden = true;
    el.progress.textContent = `Done · by hand: ${run.byHand}`;
  }

  new ResizeObserver(sizeOrbit).observe(el.canvas);
  if (document.fonts) document.fonts.ready.then(drawOrbit);
  if (reduce) { still(); return; }

  let begun = false;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (!visible) return;
    resume();
    if (!begun) {
      begun = true;
      (async () => { for (let i = 0; ; i++) await play(RUNS[i % RUNS.length]); })();
    }
  }, { threshold: 0.15 }).observe(plate);
})();
