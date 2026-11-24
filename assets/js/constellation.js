/* Live IQ constellation for the home page.
   Cycles through BPSK → QPSK → 8-PSK → 16-QAM → 64-QAM with AWGN.
   Horizontal pointer position sets the SNR. */
(function () {
  const box = document.querySelector('[data-scope]');
  if (!box) return;
  const canvas = box.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const modLabel = box.querySelector('[data-mod]');
  const snrLabel = box.querySelector('[data-snr]');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- constellations (normalised to unit average energy) ----------------
  const norm = pts => { const e = pts.reduce((s, p) => s + p[0] ** 2 + p[1] ** 2, 0) / pts.length; const k = 1 / Math.sqrt(e); return pts.map(p => [p[0] * k, p[1] * k]); };
  const psk = M => norm(Array.from({ length: M }, (_, i) => { const a = 2 * Math.PI * i / M + (M === 4 ? Math.PI / 4 : M === 8 ? Math.PI / 8 : 0); return [Math.cos(a), Math.sin(a)]; }));
  const qam = M => { const m = Math.sqrt(M), pts = []; for (let i = 0; i < m; i++) for (let q = 0; q < m; q++) pts.push([2 * i - m + 1, 2 * q - m + 1]); return norm(pts); };
  const MODS = [
    { name: 'BPSK', pts: psk(2) }, { name: 'QPSK', pts: psk(4) }, { name: '8-PSK', pts: psk(8) },
    { name: '16-QAM', pts: qam(16) }, { name: '64-QAM', pts: qam(64) }
  ];

  let mi = 3, snr = 20, targetSnr = 20, userSnr = null, last = 0, switchAt = 0, W = 0, H = 0, dpr = 1;
  let colors = {};
  const readColors = () => { colors = { paper: cssVar('--card'), rule: cssVar('--rule'), soft: cssVar('--rule-soft'), cool: cssVar('--cool'), accent: cssVar('--accent'), muted: cssVar('--muted') }; };

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    readColors(); clear();
  }
  function clear() { ctx.fillStyle = colors.paper; ctx.fillRect(0, 0, W, H); }

  // plot area (leave room for the bars)
  const area = () => { const pad = 46, s = Math.min(W, H - 2 * pad) * 0.86; return { cx: W / 2, cy: H / 2, s: s / 2 / 1.4 }; };

  // Box–Muller
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  function drawAxes(a) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.soft;
    for (let k = -3; k <= 3; k++) {
      if (!k) continue;
      const o = k * a.s * 0.5;
      ctx.beginPath(); ctx.moveTo(a.cx + o, a.cy - a.s * 1.55); ctx.lineTo(a.cx + o, a.cy + a.s * 1.55); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(a.cx - a.s * 1.55, a.cy + o); ctx.lineTo(a.cx + a.s * 1.55, a.cy + o); ctx.stroke();
    }
    ctx.strokeStyle = colors.rule;
    ctx.beginPath(); ctx.moveTo(a.cx, a.cy - a.s * 1.6); ctx.lineTo(a.cx, a.cy + a.s * 1.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(a.cx - a.s * 1.6, a.cy); ctx.lineTo(a.cx + a.s * 1.6, a.cy); ctx.stroke();
    ctx.fillStyle = colors.muted; ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillText('I', a.cx + a.s * 1.6 - 8, a.cy - 6);
    ctx.fillText('Q', a.cx + 6, a.cy - a.s * 1.6 + 10);
  }

  function frame(t) {
    if (!W) return;
    const dt = Math.min(50, t - last); last = t;
    // idle SNR drifts slowly; pointer overrides
    if (userSnr === null) targetSnr = 16 + 7 * Math.sin(t / 4200);
    else targetSnr = userSnr;
    snr += (targetSnr - snr) * 0.08;

    if (t > switchAt) { mi = (mi + 1) % MODS.length; switchAt = t + 4800; modLabel.textContent = MODS[mi].name; }

    // fade previous samples
    ctx.globalAlpha = 0.045 * (dt / 16.7); ctx.fillStyle = colors.paper; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    const a = area();
    drawAxes(a);

    const mod = MODS[mi], sigma = Math.sqrt(1 / (2 * Math.pow(10, snr / 10)));
    ctx.fillStyle = colors.cool;
    const n = Math.round(40 * (dt / 16.7));
    for (let k = 0; k < n; k++) {
      const p = mod.pts[(Math.random() * mod.pts.length) | 0];
      const x = a.cx + (p[0] + sigma * gauss()) * a.s, y = a.cy - (p[1] + sigma * gauss()) * a.s;
      ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(x, y, 1.3, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // ideal points
    ctx.strokeStyle = colors.accent; ctx.lineWidth = 1;
    const r = mod.pts.length > 16 ? 1.8 : 2.6;
    for (const p of mod.pts) { ctx.beginPath(); ctx.arc(a.cx + p[0] * a.s, a.cy - p[1] * a.s, r, 0, 7); ctx.stroke(); }

    snrLabel.textContent = snr.toFixed(1).padStart(4, ' ');
    requestAnimationFrame(frame);
  }

  function setFromPointer(e) {
    const r = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    userSnr = 4 + x * 26;
  }
  canvas.addEventListener('pointermove', setFromPointer);
  canvas.addEventListener('pointerdown', setFromPointer);
  canvas.addEventListener('pointerleave', () => { userSnr = null; });
  canvas.addEventListener('click', () => { mi = (mi + 1) % MODS.length; switchAt = performance.now() + 4800; modLabel.textContent = MODS[mi].name; clear(); });

  new ResizeObserver(resize).observe(box);
  document.addEventListener('themechange', () => { readColors(); clear(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColors(); clear(); });

  resize();
  modLabel.textContent = MODS[mi].name;
  if (reduce) {
    // single static exposure
    const a = area(); drawAxes(a); const mod = MODS[mi], sigma = 0.06; ctx.fillStyle = colors.cool; ctx.globalAlpha = .5;
    for (let k = 0; k < 2500; k++) { const p = mod.pts[(Math.random() * mod.pts.length) | 0]; ctx.fillRect(a.cx + (p[0] + sigma * gauss()) * a.s, a.cy - (p[1] + sigma * gauss()) * a.s, 1.6, 1.6); }
  } else {
    switchAt = performance.now() + 4800;
    requestAnimationFrame(t => { last = t; frame(t); });
  }
})();
