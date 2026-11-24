/* Quiet communications scene for the Publications page header.
   A pulse-shaped (raised-cosine) baseband signal scrolls past with noise;
   each symbol is sampled and decided, and its trace is folded into an
   eye diagram on the right that slowly opens and closes with the SNR. */
(function () {
  const box = document.querySelector('[data-eye]');
  if (!box) return;
  const canvas = box.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const eye = document.createElement('canvas'), ectx = eye.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, dpr = 1, T = 44, colors = {}, off = 0, lastK = null, visible = true, last = 0;
  let wf = {}, ey = {};
  const sym = new Map(), nz = new Map();
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const a = k => { if (!sym.has(k)) sym.set(k, Math.random() < .5 ? -1 : 1); return sym.get(k); };
  const n = j => { if (!nz.has(j)) nz.set(j, gauss()); return nz.get(j); };
  // raised-cosine pulse, roll-off 0.5
  const rc = t => { if (Math.abs(t) < 1e-6) return 1; const b = .5, d = 1 - (2 * b * t) ** 2; const s = Math.sin(Math.PI * t) / (Math.PI * t); return Math.abs(d) < 1e-6 ? Math.PI / 4 * s : s * Math.cos(Math.PI * b * t) / d; };
  const clean = t => { let s = 0; const k0 = Math.floor(t); for (let k = k0 - 4; k <= k0 + 5; k++) s += a(k) * rc(t - k); return s; };
  const noise = t => { const q = t * 3, j = Math.floor(q), f = q - j, w = (1 - Math.cos(Math.PI * f)) / 2; return n(j) * (1 - w) + n(j + 1) * w; };
  const sigma = now => 0.16 + 0.12 * Math.sin(now / 5200);
  const rx = (t, now) => clean(t) + sigma(now) * noise(t);

  function readColors() { colors = { rule: cssVar('--rule'), soft: cssVar('--rule-soft'), cool: cssVar('--cool'), accent: cssVar('--accent'), muted: cssVar('--muted'), ink: cssVar('--ink-2') }; }
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const narrow = W < 700;
    T = narrow ? 34 : 44;
    const es = Math.min(narrow ? W * 0.34 : W * 0.22, H * 0.62);
    ey = { x: W - es - (narrow ? 14 : W * 0.06), y: H * 0.5 - es / 2, s: es };
    wf = { x0: narrow ? 0 : W * 0.46, x1: ey.x - (narrow ? 18 : 48), cy: H * 0.52, A: H * 0.15 };
    eye.width = Math.max(1, es * dpr); eye.height = Math.max(1, es * dpr); ectx.setTransform(dpr, 0, 0, dpr, 0, 0);
    readColors();
  }

  function addTrace(k, now) {
    // fade what is there, then add the segment k-1 .. k+1 around symbol k
    ectx.save(); ectx.globalCompositeOperation = 'destination-out'; ectx.globalAlpha = .035; ectx.fillRect(0, 0, ey.s, ey.s); ectx.restore();
    ectx.strokeStyle = colors.cool; ectx.globalAlpha = .55; ectx.lineWidth = 1;
    ectx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const u = -1 + i / 20, v = rx(k + u, now);
      const x = (u + 1) / 2 * ey.s, y = ey.s / 2 - v / 1.7 * ey.s / 2;
      i ? ectx.lineTo(x, y) : ectx.moveTo(x, y);
    }
    ectx.stroke(); ectx.globalAlpha = 1;
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    const { x0, x1, cy, A } = wf;
    // axis
    ctx.strokeStyle = colors.rule; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(x1, cy); ctx.stroke();
    // symbol grid + decisions
    const t0 = (x0 + off) / T, t1 = (x1 + off) / T;
    ctx.font = '10px ' + cssVar('--mono'); ctx.textAlign = 'center';
    for (let k = Math.ceil(t0); k <= Math.floor(t1); k++) {
      const x = k * T - off;
      ctx.strokeStyle = colors.soft; ctx.beginPath(); ctx.moveTo(x, cy - A * 1.6); ctx.lineTo(x, cy + A * 1.6); ctx.stroke();
      const v = rx(k, now), bit = v > 0 ? 1 : 0, ok = (v > 0) === (a(k) > 0);
      ctx.fillStyle = ok ? colors.cool : colors.accent;
      ctx.beginPath(); ctx.arc(x, cy - v * A, 2.4, 0, 7); ctx.fill();
      ctx.fillStyle = ok ? colors.muted : colors.accent; ctx.fillText(bit, x, cy - A * 1.6 - 6);
    }
    // transmitted (clean) and received (noisy) waveforms
    const trace = (f, col, lw, al) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.globalAlpha = al; ctx.beginPath();
      for (let x = x0; x <= x1; x += 2) { const y = cy - f((x + off) / T) * A; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke(); ctx.globalAlpha = 1;
    };
    trace(t => clean(t), colors.muted, 1, .5);
    trace(t => rx(t, now), colors.cool, 1.4, .9);
    // eye diagram
    ctx.strokeStyle = colors.rule; ctx.lineWidth = 1;
    ctx.strokeRect(ey.x + .5, ey.y + .5, ey.s, ey.s);
    ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = colors.accent; ctx.globalAlpha = .6;
    ctx.beginPath(); ctx.moveTo(ey.x, ey.y + ey.s / 2); ctx.lineTo(ey.x + ey.s, ey.y + ey.s / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ey.x + ey.s / 2, ey.y); ctx.lineTo(ey.x + ey.s / 2, ey.y + ey.s); ctx.stroke(); ctx.restore();
    ctx.drawImage(eye, ey.x, ey.y, ey.s, ey.s);
    ctx.fillStyle = colors.muted; ctx.textAlign = 'left';
    ctx.fillText('EYE · 2T', ey.x, ey.y - 8);
    ctx.textAlign = 'right';
    ctx.fillText('Eb/N0 ' + (10 * Math.log10(1 / (2 * sigma(now) ** 2))).toFixed(1) + ' dB', ey.x + ey.s, ey.y + ey.s + 16);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (!W || !visible) { last = now; return; }
    const dt = Math.min(60, now - last); last = now;
    off += dt * 0.045;
    // a symbol is folded into the eye once it has fully passed the right edge of the waveform
    const k = Math.floor((wf.x1 + off) / T) - 2;
    if (lastK === null) lastK = k;
    while (lastK < k) { lastK++; addTrace(lastK, now); }
    if (sym.size > 4000) { [...sym.keys()].filter(x => x < lastK - 200).forEach(x => sym.delete(x)); [...nz.keys()].filter(x => x < (lastK - 200) * 3).forEach(x => nz.delete(x)); }
    draw(now);
  }

  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(box);
  new ResizeObserver(() => { const r = canvas.getBoundingClientRect(); if (Math.abs(r.width - W) > 1 || Math.abs(r.height - H) > 1) resize(); }).observe(box);
  document.addEventListener('themechange', readColors);
  resize();
  for (let k = -120; k < 0; k++) addTrace(k, performance.now());
  if (reduce) draw(performance.now()); else requestAnimationFrame(t => { last = t; frame(t); });
})();
