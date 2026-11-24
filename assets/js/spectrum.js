/* Spectrum-monitoring scene for the home page.
   A live power spectrum (top) and waterfall (bottom). Emitters come and go;
   each is first detected (dashed box), then classified (label), then
   analysed (centre frequency, bandwidth, SNR in the readout).
   Hover over the display to inspect the nearest signal. */
(function () {
  const box = document.querySelector('[data-scope]');
  if (!box) return;
  const canvas = box.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const countEl = box.querySelector('[data-count]');
  const readEl = box.querySelector('[data-readout]');
  const BG = box.hasAttribute('data-bg');          // quiet background mode: no frame, axes or labels text
  let visible = true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const F0 = 2400, SPAN = 80;                 // MHz, purely illustrative
  const FLOOR = -100;                         // dBm noise floor
  const ROW_MS = 70;                          // one waterfall line every ROW_MS
  const T_DET = 900, T_CLS = 2300, T_ANA = 3600;

  const TYPES = [
    { name: 'OFDM',   shape: 'ofdm', bw: [0.13, 0.19], snr: [13, 20] },
    { name: 'QPSK',   shape: 'rrc',  bw: [0.035, 0.06], snr: [12, 22] },
    { name: '16-QAM', shape: 'rrc',  bw: [0.045, 0.07], snr: [17, 25] },
    { name: 'GFSK',   shape: 'fsk',  bw: [0.025, 0.035], snr: [12, 20] },
    { name: 'FM',     shape: 'fm',   bw: [0.025, 0.035], snr: [14, 22] },
    { name: 'CW',     shape: 'cw',   bw: [0.004, 0.006], snr: [16, 26] },
    { name: 'FHSS',   shape: 'hop',  bw: [0.014, 0.018], snr: [12, 18] }
  ];

  let W = 0, H = 0, dpr = 1, N = 0, colors = {}, rgb = {};
  let wf = document.createElement('canvas'), wctx = wf.getContext('2d');
  let geo = {}, sigs = [], row = 0, lastRow = 0, nextSpawn = 0, psd = null, hoverX = null, focus = null, focusUntil = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const toRGB = c => { const t = document.createElement('canvas').getContext('2d'); t.fillStyle = c; const h = t.fillStyle; if (h[0] === '#') return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const m = h.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : [128, 128, 128]; };
  const mix = (a, b, t) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));

  function readColors() {
    colors = { paper: cssVar('--card'), rule: cssVar('--rule'), soft: cssVar('--rule-soft'), cool: cssVar('--cool'), coolSoft: cssVar('--cool-soft'), accent: cssVar('--accent'), muted: cssVar('--muted'), ink: cssVar('--ink') };
    rgb = { paper: toRGB(colors.paper), cool: toRGB(colors.cool), ink: toRGB(colors.ink) };
    rgb.deep = mix(rgb.cool, rgb.ink, 0.35);
    // precompute a 64-step colour ramp: paper → cool → deep
    rgb.ramp = Array.from({ length: 64 }, (_, i) => { const t = i / 63; const c = t < 0.7 ? mix(rgb.paper, rgb.cool, Math.pow(t / 0.7, 1.1)) : mix(rgb.cool, rgb.deep, (t - 0.7) / 0.3); return `rgb(${c[0]},${c[1]},${c[2]})`; });
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const x0 = BG ? 0 : 16, x1 = BG ? W : W - 16, top = BG ? 0 : 46, bot = BG ? H : H - 44;
    const specH = Math.round((bot - top) * (BG ? 0.3 : 0.34));
    geo = { x0, x1, w: x1 - x0, sTop: top, sBot: top + specH, wTop: top + specH + (BG ? 6 : 22), wBot: bot };
    geo.wH = geo.wBot - geo.wTop;
    N = Math.max(60, Math.round(geo.w / (BG ? 3 : 2)));
    psd = new Float32Array(N).fill(FLOOR);
    // keep the existing waterfall (stretched) so a layout change does not wipe it
    const old = document.createElement('canvas'); old.width = wf.width; old.height = wf.height; old.getContext('2d').drawImage(wf, 0, 0);
    wf.width = Math.max(1, Math.round(geo.w * dpr)); wf.height = Math.max(1, Math.round(geo.wH * dpr));
    readColors();
    wctx.fillStyle = colors.paper; wctx.fillRect(0, 0, wf.width, wf.height);
    if (old.width > 1 && old.height > 1) wctx.drawImage(old, 0, 0, wf.width, wf.height);
  }

  // ---- emitters ----------------------------------------------------------
  function spawn(now, born) {
    const type = TYPES[(Math.random() * TYPES.length) | 0];
    const bw = rand(type.bw[0], type.bw[1]);
    for (let tries = 0; tries < 20; tries++) {
      const fc = rand(0.06 + bw / 2, 0.94 - bw / 2);
      const clash = sigs.some(s => !s.end && Math.abs(s.fc - fc) < (s.bw + bw) / 2 + 0.03 + (s.type.shape === 'hop' || type.shape === 'hop' ? 0.08 : 0));
      if (clash) continue;
      sigs.push({ type, fc, fc0: fc, bw, snr: rand(type.snr[0], type.snr[1]), t0: born ?? now, startRow: row, end: null, endRow: null, life: rand(9000, 17000), phase: Math.random() * 6.28, lo: 0, hi: 0 });
      return;
    }
  }

  function shapeAt(s, f, now) {
    const t = now - s.t0;
    switch (s.type.shape) {
      case 'ofdm': { const x = (f - s.fc) / (s.bw / 2); return 1 / (1 + Math.pow(Math.abs(x), 18)) * (0.85 + 0.15 * Math.random()); }
      case 'rrc': { const x = Math.abs(f - s.fc) / (s.bw / 2); return x < 0.75 ? 1 : x < 1.25 ? 0.5 * (1 + Math.cos(Math.PI * (x - 0.75) / 0.5)) : 0; }
      case 'fsk': { const tone = Math.sin(t / 55 + s.phase * 7) > 0 ? 1 : -1; const x = (f - (s.fc + tone * s.bw / 3)) / (s.bw / 9); return Math.exp(-x * x); }
      case 'fm': { const c = s.fc + (s.bw / 2.6) * Math.sin(t / 380 + s.phase); const x = (f - c) / (s.bw / 6); return Math.exp(-x * x); }
      case 'cw': { const x = (f - s.fc) / (s.bw / 2); return Math.exp(-x * x * 2); }
      case 'hop': { const x = Math.abs(f - s.fc) / (s.bw / 2); return x < 1 ? 1 : 0; }
    }
    return 0;
  }

  function step(now) {
    // hopper retunes every ~300 ms within its sub-band
    for (const s of sigs) if (s.type.shape === 'hop' && !s.end) { const k = Math.floor((now - s.t0) / 300); if (k !== s.k) { s.k = k; s.fc = s.fc0 + rand(-0.05, 0.05); } }
    // one PSD line
    const line = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const f = (i + 0.5) / N;
      let p = Math.pow(10, (FLOOR + 1.6 * gauss()) / 10);
      for (const s of sigs) if (!s.end) { const a = shapeAt(s, f, now); if (a > 0.001) p += a * Math.pow(10, (FLOOR + s.snr + 1.2 * gauss()) / 10); }
      line[i] = 10 * Math.log10(p);
      psd[i] += (line[i] - psd[i]) * 0.35;
    }
    // scroll waterfall down by one line, draw new line on top
    const lh = Math.max(1, Math.round(1.5 * dpr)), bw = wf.width / N;
    wctx.drawImage(wf, 0, lh);
    for (let i = 0; i < N; i++) {
      const t = Math.max(0, Math.min(1, (line[i] - FLOOR - 1.5) / 26));
      wctx.fillStyle = rgb.ramp[Math.round(t * 63)];
      wctx.fillRect(Math.floor(i * bw), 0, Math.ceil(bw), lh);
    }
    row++;
    // lifecycle
    for (const s of sigs) if (!s.end && now - s.t0 > s.life) { s.end = now; s.endRow = row; }
    const rowsVisible = geo.wH / 1.5;
    sigs = sigs.filter(s => !s.end || row - s.endRow < rowsVisible);
  }

  // ---- drawing -----------------------------------------------------------
  const fx = f => geo.x0 + f * geo.w;
  const dbY = d => geo.sBot - Math.max(0, Math.min(1, (d - FLOOR + 6) / 36)) * (geo.sBot - geo.sTop - 6);

  function stage(s, now) { const t = (s.end || now) - s.t0; return t > T_ANA ? 3 : t > T_CLS ? 2 : t > T_DET ? 1 : 0; }

  function draw(now) {
    if (BG) ctx.clearRect(0, 0, W, H); else { ctx.fillStyle = colors.paper; ctx.fillRect(0, 0, W, H); }
    // spectrum grid
    ctx.lineWidth = 1; ctx.strokeStyle = colors.soft;
    if (!BG) {
    for (let k = 1; k < 4; k++) { const y = geo.sTop + k * (geo.sBot - geo.sTop) / 4; ctx.beginPath(); ctx.moveTo(geo.x0, y); ctx.lineTo(geo.x1, y); ctx.stroke(); }
    for (let k = 1; k < 4; k++) { const x = geo.x0 + k * geo.w / 4; ctx.beginPath(); ctx.moveTo(x, geo.sTop); ctx.lineTo(x, geo.sBot); ctx.stroke(); }
    ctx.strokeStyle = colors.rule; ctx.strokeRect(geo.x0 + .5, geo.sTop + .5, geo.w - 1, geo.sBot - geo.sTop - 1);
    }
    // detection threshold
    const thY = dbY(FLOOR + 7);
    ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = colors.accent; ctx.globalAlpha = .55;
    ctx.beginPath(); ctx.moveTo(geo.x0, thY); ctx.lineTo(geo.x1, thY); ctx.stroke(); ctx.restore();
    // PSD trace
    ctx.beginPath();
    for (let i = 0; i < N; i++) { const x = fx((i + .5) / N), y = dbY(psd[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.lineTo(geo.x1, geo.sBot); ctx.lineTo(geo.x0, geo.sBot); ctx.closePath();
    ctx.fillStyle = colors.coolSoft; ctx.globalAlpha = .7; ctx.fill(); ctx.globalAlpha = 1;
    ctx.beginPath();
    for (let i = 0; i < N; i++) { const x = fx((i + .5) / N), y = dbY(psd[i]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.strokeStyle = colors.cool; ctx.lineWidth = 1.2; ctx.stroke();

    // frequency axis
    if (!BG) {
    ctx.fillStyle = colors.muted; ctx.font = '10px ' + cssVar('--mono');
    ctx.textBaseline = 'middle';
    for (let k = 0; k <= 4; k++) { const x = geo.x0 + k * geo.w / 4; ctx.textAlign = k === 0 ? 'left' : k === 4 ? 'right' : 'center'; ctx.fillText(String(F0 + k * SPAN / 4), x, geo.sBot + 11); }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }

    // waterfall
    ctx.drawImage(wf, geo.x0, geo.wTop, geo.w, geo.wH);
    if (!BG) { ctx.strokeStyle = colors.rule; ctx.lineWidth = 1; ctx.strokeRect(geo.x0 + .5, geo.wTop + .5, geo.w - 1, geo.wH - 1); }

    // detections
    const target = pickFocus(now);
    const placed = [];
    ctx.save();
    ctx.beginPath(); ctx.rect(geo.x0, geo.wTop, geo.w, geo.wH); ctx.clip();
    for (const s of sigs) {
      const st = stage(s, now); if (!st) continue;
      const span = s.type.shape === 'hop' ? 0.12 : s.type.shape === 'cw' ? 0.018 : s.bw * 1.15;
      const xa = fx(s.fc0 - span / 2) - 3, xb = fx(s.fc0 + span / 2) + 3;
      const yTop = geo.wTop + (s.endRow ? (row - s.endRow) * 1.5 : 1);
      const yBot = Math.min(geo.wBot - 1, geo.wTop + (row - s.startRow) * 1.5);
      const on = s === target;
      ctx.strokeStyle = colors.accent; ctx.lineWidth = on ? 1.6 : 1;
      ctx.globalAlpha = s.end ? .45 : on ? 1 : .8;
      if (st === 1) { ctx.setLineDash([4, 3]); ctx.lineDashOffset = -now / 60; } else ctx.setLineDash([]);
      ctx.strokeRect(xa + .5, yTop + .5, xb - xa, Math.max(4, yBot - yTop));
      ctx.setLineDash([]);
      // label
      const txt = st === 1 ? (document.documentElement.lang === 'tr' ? 'algılanıyor…' : 'detecting…') : s.type.name;
      ctx.font = (on ? '500 ' : '') + '10px ' + cssVar('--mono');
      const tw = ctx.measureText(txt).width + 8;
      let lx = Math.min(Math.max(xa, geo.x0 + 2), geo.x1 - tw - 2), ly = yTop + 3;
      for (let g = 0; g < 4 && placed.some(r => lx < r[0] + r[2] + 2 && r[0] < lx + tw + 2 && Math.abs(r[1] - ly) < 15); g++) ly += 16;
      placed.push([lx, ly, tw]);
      ctx.globalAlpha = s.end ? .5 : .92; ctx.fillStyle = colors.paper; ctx.fillRect(lx, ly, tw, 14);
      ctx.globalAlpha = s.end ? .6 : 1; ctx.fillStyle = st === 1 ? colors.muted : colors.accent; ctx.fillText(txt, lx + 4, ly + 10.5);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // markers on the spectrum for classified signals
    for (const s of sigs) if (!s.end && stage(s, now) >= 2) {
      const x = fx(s.fc0), y = geo.sTop + 3;
      ctx.fillStyle = colors.accent; ctx.globalAlpha = s === target ? 1 : .6;
      ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 5); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    }

    // readouts
    const live = sigs.filter(s => !s.end && stage(s, now) >= 1).length;
    if (countEl) countEl.textContent = live;
    if (readEl) {
      if (!target) readEl.innerHTML = 'scanning…';
      else {
        const st = stage(target, now);
        const fc = (F0 + target.fc0 * SPAN).toFixed(1), bwm = (target.bw * SPAN).toFixed(target.bw * SPAN < 1 ? 2 : 1);
        readEl.innerHTML = st < 2 ? 'signal detected · classifying…'
          : st < 3 ? `<b>${target.type.name}</b> · estimating parameters…`
          : `<b>${target.type.name}</b> · f<sub>c</sub> ${fc} MHz · BW ${bwm} MHz · SNR ${target.snr.toFixed(0)} dB`;
      }
    }
  }

  function pickFocus(now) {
    const cand = sigs.filter(s => !s.end && stage(s, now) >= 1);
    if (hoverX !== null && cand.length) {
      const f = (hoverX - geo.x0) / geo.w;
      return cand.reduce((a, b) => Math.abs(b.fc0 - f) < Math.abs(a.fc0 - f) ? b : a);
    }
    if (!focus || focus.end || now > focusUntil || !cand.includes(focus)) {
      const ready = cand.filter(s => s !== focus);
      focus = (ready.length ? ready : cand).sort((a, b) => b.t0 - a.t0)[0] || null;
      focusUntil = now + 4200;
    }
    return focus;
  }

  // ---- loop ----------------------------------------------------------------
  function frame(now) {
    if (!W || !visible) { requestAnimationFrame(frame); return; }
    if (now > nextSpawn) { if (sigs.filter(s => !s.end).length < 5) spawn(now); nextSpawn = now + rand(1400, 3200); }
    let guard = 0;
    while (now - lastRow > ROW_MS && guard++ < 6) { lastRow += ROW_MS; step(lastRow); }
    if (now - lastRow > ROW_MS) lastRow = now;
    draw(now);
    requestAnimationFrame(frame);
  }

  canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); hoverX = e.clientX - r.left; });
  canvas.addEventListener('pointerleave', () => { hoverX = null; });

  new IntersectionObserver(es => { const v = es[0].isIntersecting; if (v && !visible) lastRow = performance.now(); visible = v; }).observe(box);
  new ResizeObserver(() => { const r = canvas.getBoundingClientRect(); if (Math.abs(r.width - W) > 1 || Math.abs(r.height - H) > 1) resize(); }).observe(box);
  const recolor = () => { readColors(); wctx.fillStyle = colors.paper; wctx.fillRect(0, 0, wf.width, wf.height); };
  document.addEventListener('themechange', recolor);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', recolor);

  resize();
  // pre-roll so the display is never empty on load
  const t0 = performance.now(), pre = Math.round(geo.wH / 1.5);
  for (let k = 0; k < pre; k++) { const tk = t0 - (pre - k) * ROW_MS; if (k === 0 || k === Math.round(pre * .35) || k === Math.round(pre * .7)) spawn(tk); step(tk); }
  lastRow = t0; nextSpawn = t0 + 1500;
  if (reduce) draw(t0 + T_ANA);
  else requestAnimationFrame(frame);
})();
