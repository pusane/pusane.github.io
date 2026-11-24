/* Soft background of slowly cross-fading, blurred portraits.
   <div data-portraits='["a.jpg","b.jpg"]' data-blur="3">  real images (paths relative to the site root)
   <div data-portraits data-silhouettes="14" data-blur="9"> generated, anonymous head-and-shoulder silhouettes */
(function () {
  const box = document.querySelector('[data-portraits]');
  if (!box) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const base = window.BASE || '';
  const blur = +(box.dataset.blur || 3);

  function silhouette(seed) {
    let s = seed * 9301 + 49297; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const hx = 50 + (r() - .5) * 6, hy = 40 + r() * 6, rx = 15 + r() * 5, ry = 19 + r() * 5;
    const sw = 34 + r() * 12, neck = hy + ry - 2;
    const hair = r();
    let hairPath = '';
    if (hair < .35) hairPath = `<ellipse cx="${hx}" cy="${hy - ry * .45}" rx="${rx * 1.12}" ry="${ry * .7}"/>`;
    else if (hair < .65) hairPath = `<path d="M${hx - rx * 1.15},${hy} Q${hx - rx * 1.2},${hy - ry * 1.25} ${hx},${hy - ry * 1.2} Q${hx + rx * 1.2},${hy - ry * 1.25} ${hx + rx * 1.15},${hy} L${hx + rx * 1.2},${hy + ry * 1.4} L${hx - rx * 1.2},${hy + ry * 1.4} Z"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 125"><g fill="#3a4250">${hairPath}<ellipse cx="${hx}" cy="${hy}" rx="${rx}" ry="${ry}"/><rect x="${hx - 7}" y="${neck - 4}" width="14" height="14"/><path d="M${50 - sw},126 Q${50 - sw + 4},${neck + 16} 50,${neck + 8} Q${50 + sw - 4},${neck + 16} ${50 + sw},126 Z"/></g></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  let srcs;
  if (box.dataset.silhouettes) srcs = Array.from({ length: +box.dataset.silhouettes }, (_, i) => silhouette(i + 3));
  else { try { srcs = JSON.parse(box.dataset.portraits).map(p => base + p); } catch (e) { return; } }
  // drop images that fail to load
  srcs = srcs.slice();

  const layer = document.createElement('div');
  layer.className = 'pt-layer';
  layer.style.setProperty('--pt-blur', blur + 'px');
  if (box.dataset.silhouettes) layer.classList.add('pt-sil');
  box.appendChild(layer);

  let tiles = [], shown = new Set(), visible = true;
  const pick = () => { const free = srcs.filter(s => !shown.has(s)); const pool = free.length ? free : srcs; return pool[(Math.random() * pool.length) | 0]; };

  function build() {
    layer.innerHTML = ''; tiles = []; shown.clear();
    const W = box.clientWidth, H = box.clientHeight, narrow = W < 700;
    const n = narrow ? 3 : 5, h = H * (narrow ? .62 : .74), w = h * .78;
    const x0 = W * (narrow ? .36 : .42), span = W - x0 - w * .6;
    for (let i = 0; i < n; i++) {
      const t = document.createElement('div');
      t.className = 'pt-tile';
      const x = x0 + span * (i / (n - 1 || 1)), y = (H - h) / 2 + (i % 2 ? .08 : -.06) * H;
      Object.assign(t.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      const a = document.createElement('img'), b = document.createElement('img');
      a.alt = b.alt = ''; a.decoding = b.decoding = 'async';
      const src = pick(); shown.add(src); a.src = src; a.className = 'on';
      t.append(a, b); layer.appendChild(t);
      tiles.push({ t, a, b, src });
    }
  }
  function swap() {
    if (visible && !document.hidden && tiles.length) {
      const tile = tiles[(Math.random() * tiles.length) | 0];
      const next = pick();
      const [front, back] = tile.a.classList.contains('on') ? [tile.a, tile.b] : [tile.b, tile.a];
      back.onload = () => { back.classList.add('on'); front.classList.remove('on'); shown.delete(tile.src); tile.src = next; shown.add(next); };
      back.src = next;
    }
    setTimeout(swap, 2600 + Math.random() * 2200);
  }

  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(box);
  let lastW = 0;
  new ResizeObserver(() => { if (Math.abs(box.clientWidth - lastW) > 40) { lastW = box.clientWidth; build(); } }).observe(box);
  lastW = box.clientWidth; build();
  if (!reduce) setTimeout(swap, 2000);
})();
