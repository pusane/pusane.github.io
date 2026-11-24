/* Quiet radar scene for the Research page header.
   A PPI display: range rings, a rotating beam with a fading afterglow,
   moving targets painted on each pass, sparse clutter, and track markers
   once a target has been seen on a few consecutive scans. */
(function () {
  const box = document.querySelector('[data-radar]');
  if (!box) return;
  const canvas = box.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const glow = document.createElement('canvas'), gctx = glow.getContext('2d');   // phosphor layer
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2, PERIOD = 6500;                                        // ms per revolution

  let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 0, colors = {}, theta = -Math.PI / 2, last = 0, visible = true;
  let targets = [], nextId = 1;
  const rand = (a, b) => a + Math.random() * (b - a);
  const norm = a => ((a % TAU) + TAU) % TAU;

  function readColors() {
    colors = { rule: cssVar('--rule'), soft: cssVar('--rule-soft'), cool: cssVar('--cool'), accent: cssVar('--accent'), muted: cssVar('--muted') };
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = glow.width = Math.max(1, W * dpr); canvas.height = glow.height = Math.max(1, H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const narrow = W < 700;
    cx = W * (narrow ? 0.78 : 0.74); cy = H * 0.56;
    R = Math.max(H * 0.85, Math.min(W * 0.38, H * 1.15));
    readColors();
    if (!targets.length) for (let i = 0; i < 7; i++) targets.push(spawn(true));
  }

  // targets move in straight lines (a few turn gently); polar position relative to the radar
  function spawn(anywhere) {
    const a = rand(0, TAU), r = anywhere ? rand(0.2, 0.95) * R : R * 1.02;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    const inward = Math.atan2(cy - y, cx - x) + rand(-0.9, 0.9);
    const dir = anywhere ? rand(0, TAU) : inward, v = rand(0.006, 0.02) * R / 1000;   // px per ms
    return { id: nextId++, x, y, vx: Math.cos(dir) * v, vy: Math.sin(dir) * v, turn: Math.random() < 0.3 ? rand(-1, 1) * 1e-4 : 0, hits: 0, lastHit: -1e9, hx: x, hy: y, px: x, py: y };
  }

  function drawScope() {
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = colors.muted; ctx.globalAlpha = 0.45;
    for (let k = 1; k <= 4; k++) { ctx.beginPath(); ctx.arc(cx, cy, R * k / 4, 0, TAU); ctx.stroke(); }
    ctx.strokeStyle = colors.soft;
    for (let k = 0; k < 12; k++) { const a = k * TAU / 12; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.06, cy + Math.sin(a) * R * 0.06); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke(); }
    ctx.strokeStyle = colors.rule;
    for (let k = 0; k < 72; k++) { const a = k * TAU / 72, l = k % 6 ? 6 : 12; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.lineTo(cx + Math.cos(a) * (R - l), cy + Math.sin(a) * (R - l)); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.muted; ctx.font = '10px ' + cssVar('--mono'); ctx.textAlign = 'left';
    for (let k = 1; k <= 3; k++) ctx.fillText((k * 10) + ' km', cx + 4, cy - R * k / 4 - 4);
  }

  function drawBeam() {
    const span = 0.55;
    if (ctx.createConicGradient) {
      const g = ctx.createConicGradient(theta - span, cx, cy);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(span / TAU * 0.999, colors.cool);
      g.addColorStop(span / TAU, 'rgba(0,0,0,0)');
      ctx.save(); ctx.globalAlpha = 0.24; ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, theta - span, theta); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.save(); ctx.strokeStyle = colors.cool; ctx.globalAlpha = 0.9; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(theta) * R, cy + Math.sin(theta) * R); ctx.stroke(); ctx.restore();
  }

  function paint(x, y, r, a, c) { gctx.globalAlpha = a; gctx.fillStyle = c; gctx.beginPath(); gctx.arc(x, y, r, 0, TAU); gctx.fill(); gctx.globalAlpha = 1; }

  function step(now, dt) {
    const prev = theta;
    theta += TAU * dt / PERIOD;
    const a0 = norm(prev), a1 = norm(theta);
    const swept = a => (a0 <= a1 ? a > a0 && a <= a1 : a > a0 || a <= a1);

    // phosphor decay
    gctx.save(); gctx.globalCompositeOperation = 'destination-out'; gctx.globalAlpha = Math.min(1, dt / PERIOD * 1.6);
    gctx.fillRect(0, 0, W, H); gctx.restore();

    // clutter: a few weak returns along the beam, denser close in
    const n = Math.random() < dt / 110 ? 1 : 0;
    for (let k = 0; k < n; k++) { const r = R * (0.08 + 0.92 * Math.pow(Math.random(), 1.15)); paint(cx + Math.cos(theta) * r, cy + Math.sin(theta) * r, rand(0.8, 1.4), rand(0.12, 0.3), colors.cool); }

    // targets
    for (const t of targets) {
      const h = Math.atan2(t.vy, t.vx) + t.turn * dt, v = Math.hypot(t.vx, t.vy);
      t.vx = Math.cos(h) * v; t.vy = Math.sin(h) * v; t.x += t.vx * dt; t.y += t.vy * dt;
      const a = norm(Math.atan2(t.y - cy, t.x - cx));
      if (swept(a)) {
        t.px = t.hx; t.py = t.hy; t.hx = t.x; t.hy = t.y;
        t.hits = now - t.lastHit < PERIOD * 1.5 ? t.hits + 1 : 1; t.lastHit = now;
        paint(t.x, t.y, 3.4, 1, colors.cool);
      }
    }
    targets = targets.map(t => Math.hypot(t.x - cx, t.y - cy) > R * 1.05 ? spawn(false) : t);
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    drawScope();
    ctx.drawImage(glow, 0, 0, W, H);
    drawBeam();
    // tracks: confirmed after three consecutive scans
    ctx.font = '10px ' + cssVar('--mono');
    for (const t of targets) {
      if (t.hits < 3 || now - t.lastHit > PERIOD * 1.2) continue;
      const age = (now - t.lastHit) / PERIOD, a = 1 - age * 0.6;
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = colors.accent; ctx.lineWidth = 1.4;
      const s = 7; ctx.strokeRect(t.hx - s, t.hy - s, 2 * s, 2 * s);
      const dx = t.hx - t.px, dy = t.hy - t.py;
      ctx.beginPath(); ctx.moveTo(t.hx, t.hy); ctx.lineTo(t.hx + dx * 1.6, t.hy + dy * 1.6); ctx.stroke();
      ctx.fillStyle = colors.accent; ctx.fillText('T' + String(t.id).padStart(2, '0'), t.hx + 10, t.hy - 9);
      ctx.restore();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!W || !visible) { last = now; return; }
    const dt = Math.min(60, now - last); last = now;
    step(now, dt); draw(now);
  }

  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(box);
  new ResizeObserver(() => { const r = canvas.getBoundingClientRect(); if (Math.abs(r.width - W) > 1 || Math.abs(r.height - H) > 1) { targets = []; resize(); } }).observe(box);
  document.addEventListener('themechange', readColors);

  resize();
  // pre-roll a few revolutions so tracks exist on first view
  let t = 0; for (; t < PERIOD * 3.2; t += 33) step(t, 33);
  const offset = performance.now() - t;
  targets.forEach(x => { x.lastHit += offset; });
  if (reduce) draw(performance.now());
  else requestAnimationFrame(n => { last = n; frame(n); });
})();
