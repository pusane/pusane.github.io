/* Quiet background for the Teaching page header: equations from the courses
   (radar signal processing, probability, signals, communications, coding)
   fade in, drift slowly, and fade out. Typeset with KaTeX when available. */
(function () {
  const box = document.querySelector('[data-eqs]');
  if (!box) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EQS = [
    // radar signal processing (EE 481)
    String.raw`\mathrm{SNR}=\frac{P_t G^2 \lambda^2 \sigma}{(4\pi)^3 R^4\, k T_0 B F L}`,
    String.raw`\chi(\tau,f_D)=\int_{-\infty}^{\infty} s(t)\,s^*(t-\tau)\,e^{j2\pi f_D t}\,dt`,
    String.raw`s(t)=e^{\,j\pi \frac{B}{\tau_p} t^2},\quad |t|\le \tfrac{\tau_p}{2}`,
    String.raw`\Delta R=\frac{c}{2B}`,
    String.raw`f_D=\frac{2v_r}{\lambda}`,
    String.raw`h(t)=s^*(T-t)`,
    String.raw`P_{FA}=e^{-\eta^2/2\sigma^2}`,
    // probability & random signals (EE 313, EE 372)
    String.raw`P(A\mid B)=\frac{P(B\mid A)\,P(A)}{P(B)}`,
    String.raw`f_X(x)=\frac{1}{\sqrt{2\pi}\,\sigma}\,e^{-(x-\mu)^2/2\sigma^2}`,
    String.raw`Q(x)=\frac{1}{\sqrt{2\pi}}\int_x^{\infty} e^{-u^2/2}\,du`,
    String.raw`S_X(f)=\int_{-\infty}^{\infty} R_X(\tau)\,e^{-j2\pi f\tau}\,d\tau`,
    String.raw`P\big(|X-\mu|\ge k\sigma\big)\le \frac{1}{k^2}`,
    String.raw`E[X]=\int x\,f_X(x)\,dx`,
    // signals & circuits (EE 201, EE 271)
    String.raw`X(f)=\int_{-\infty}^{\infty} x(t)\,e^{-j2\pi f t}\,dt`,
    String.raw`y(t)=\int h(\tau)\,x(t-\tau)\,d\tau`,
    String.raw`v_L=L\,\frac{di_L}{dt}`,
    String.raw`\textstyle\sum_k i_k=0`,
    // communications & coding (EE 371, EE 477, EE 644)
    String.raw`C=B\log_2\!\left(1+\frac{S}{N}\right)`,
    String.raw`P_b=Q\!\left(\sqrt{2E_b/N_0}\right)`,
    String.raw`\mathbf{H}\,\mathbf{c}^{\mathsf T}=\mathbf{0}`,
    String.raw`d_{\min}\le n-k+1`
  ];

  const TONES = ['var(--ink-2)', 'var(--cool)', 'var(--accent)', 'var(--muted)', 'var(--cool)'];
  const layer = document.createElement('div');
  layer.className = 'eq-layer';
  box.appendChild(layer);
  let ready = false, pool = EQS.map((_, i) => i), live = [], visible = true;

  function render(el, tex) {
    if (window.katex) { try { window.katex.render(tex, el, { throwOnError: false, displayMode: false }); return; } catch (e) {} }
    el.textContent = tex.replace(/\\[a-zA-Z]+|[{}]/g, ' ');
  }
  function place(w, h) {
    const W = box.clientWidth, H = box.clientHeight, narrow = W < 700;
    const xmin = (narrow ? 0.30 : 0.46) * W, xmax = W - w - 16;
    if (xmax < xmin) return null;
    for (let tries = 0; tries < 40; tries++) {
      const x = xmin + Math.random() * (xmax - xmin), y = 16 + Math.random() * Math.max(1, H - h - 32);
      // allow a light overlap: boxes shrunk by 18% on each side must not intersect
      const ins = (X, Y, w2, h2) => [X + w2 * .18, Y + h2 * .18, X + w2 * .82, Y + h2 * .82];
      const A = ins(x, y, w, h);
      if (live.every(l => { const B = ins(l.x, l.y, l.w, l.h); return A[2] < B[0] || B[2] < A[0] || A[3] < B[1] || B[3] < A[1]; })) return { x, y };
    }
    return null;
  }
  function spawn() {
    if (!pool.length) pool = EQS.map((_, i) => i).filter(i => !live.some(l => l.i === i));
    const i = pool.splice((Math.random() * pool.length) | 0, 1)[0];
    const el = document.createElement('div');
    el.className = 'eq';
    el.style.fontSize = (12 + Math.random() * 9).toFixed(1) + 'px';
    el.style.color = TONES[(Math.random() * TONES.length) | 0];
    el.style.setProperty('--eq-o', (.45 + Math.random() * .45).toFixed(2));
    render(el, EQS[i]);
    el.style.visibility = 'hidden'; layer.appendChild(el);
    const w = el.offsetWidth, h = el.offsetHeight, p = place(w, h);
    if (!p) { el.remove(); pool.push(i); return; }
    el.style.left = p.x + 'px'; el.style.top = p.y + 'px'; el.style.visibility = '';
    const item = { el, i, x: p.x, y: p.y - 26, w, h: h + 26 };
    live.push(item);
    void el.offsetWidth; el.classList.add('on');
    setTimeout(() => { el.classList.remove('on'); el.classList.add('off'); setTimeout(() => { el.remove(); live = live.filter(l => l !== item); }, 2600); }, 4500 + Math.random() * 6500);
  }
  function tick() {
    if (visible && !document.hidden) {
      const target = box.clientWidth < 700 ? 8 : 18;
      if (live.length < target) spawn();
    }
    setTimeout(tick, 350 + Math.random() * 500);
  }
  function start() {
    if (ready) return; ready = true;
    const n = box.clientWidth < 700 ? 6 : 12;
    for (let k = 0; k < n; k++) spawn();
    if (!reduce) tick();
  }

  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(box);
  // KaTeX from a CDN; fall back to plain text if it does not load
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css'; document.head.appendChild(css);
  const js = document.createElement('script'); js.src = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js';
  js.onload = start; js.onerror = start; document.head.appendChild(js);
  setTimeout(start, 3000);
})();
