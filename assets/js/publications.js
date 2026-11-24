/* Publications page: stats, per-year chart, search & filters, grouped list. */
(function () {
  const TR = document.documentElement.lang === 'tr';
  const PUBS = (window.PUBS || []).map((p, i) => ({ ...p, i }));
  const KINDS = TR ? { journal: 'Dergi', intl: 'Uluslararası konferans', natl: 'Ulusal konferans' } : { journal: 'Journal', intl: 'International conference', natl: 'National conference' };
  const TOPICS = TR ? { molecular: 'Moleküler hab.', coding: 'Kodlama', wireless: 'Kablosuz', optical: 'Görünür ışık', security: 'Güvenlik', ml: 'Makine öğrenmesi' } : { molecular: 'Molecular comm.', coding: 'Coding', wireless: 'Wireless', optical: 'Visible light', security: 'Security', ml: 'Machine learning' };
  const COLORS = { journal: 'var(--ink)', intl: 'var(--cool)', natl: 'var(--muted)' };
  const state = { q: '', kind: null, topic: null, year: null };
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const count = k => PUBS.filter(p => p.k === k).length;
  const years = PUBS.map(p => p.y).filter(Boolean);

  // ---- chart -------------------------------------------------------------
  const svg = $('[data-pub-chart]'), tip = $('[data-pub-tip]'), fig = svg.closest('figure');
  const Y0 = Math.min(...years), Y1 = Math.max(...years);
  const byYear = {};
  for (let y = Y0; y <= Y1; y++) byYear[y] = { journal: 0, intl: 0, natl: 0 };
  PUBS.forEach(p => { if (p.y) byYear[p.y][p.k]++; });
  const maxN = Math.max(...Object.values(byYear).map(o => o.journal + o.intl + o.natl));

  function drawChart() {
    const W = svg.clientWidth || 800, H = 220, padB = 22, n = Y1 - Y0 + 1, bw = W / n, gap = Math.max(2, bw * 0.22);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    let out = '';
    // grid lines every 5 papers
    for (let g = 5; g <= maxN; g += 5) {
      const y = H - padB - g / maxN * (H - padB - 10);
      out += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="var(--rule-soft)"/><text class="ax" x="0" y="${y - 4}">${g}</text>`;
    }
    for (let y = Y0; y <= Y1; y++) {
      const x = (y - Y0) * bw + gap / 2, o = byYear[y];
      let base = H - padB;
      out += `<g class="bar${state.year === y ? ' sel' : ''}" data-y="${y}">`;
      out += `<rect x="${x - gap / 2}" y="0" width="${bw}" height="${H}" fill="transparent"/>`;
      ['journal', 'intl', 'natl'].forEach(k => {
        const h = o[k] / maxN * (H - padB - 10);
        if (h > 0) { base -= h; out += `<rect x="${x}" y="${base}" width="${bw - gap}" height="${h - .5}" rx="1" fill="${COLORS[k]}" ${k === 'natl' ? 'fill-opacity=".45"' : ''}/>`; }
      });
      if ((y - Y0) % (n > 18 && W < 640 ? 5 : 2) === 0 || y === Y1) out += `<text class="ax" x="${x + (bw - gap) / 2}" y="${H - 6}" text-anchor="middle">${W < 640 ? "'" + String(y).slice(2) : y}</text>`;
      out += '</g>';
    }
    svg.innerHTML = out;
    fig.classList.toggle('has-sel', !!state.year);
  }
  svg.addEventListener('click', e => {
    const g = e.target.closest('.bar'); if (!g) return;
    const y = +g.dataset.y; state.year = state.year === y ? null : y; update();
  });
  svg.addEventListener('mousemove', e => {
    const g = e.target.closest('.bar'); if (!g) { tip.hidden = true; return; }
    const y = +g.dataset.y, o = byYear[y], r = fig.getBoundingClientRect(), b = g.getBoundingClientRect();
    tip.innerHTML = `<b>${y}</b> · ${o.journal + o.intl + o.natl} papers<br>${o.journal} journal · ${o.intl} intl · ${o.natl} natl`;
    tip.style.left = (b.left - r.left + b.width / 2) + 'px'; tip.style.top = '-6px'; tip.hidden = false;
  });
  svg.addEventListener('mouseleave', () => tip.hidden = true);
  new ResizeObserver(drawChart).observe(svg);

  // ---- chips -------------------------------------------------------------
  function chips(sel, map, key, counter) {
    const box = $(sel);
    box.innerHTML = Object.entries(map).map(([k, label]) =>
      `<button class="chip" data-k="${k}" aria-pressed="false">${label} <span class="n">${counter(k)}</span></button>`).join('');
    box.addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return;
      state[key] = state[key] === b.dataset.k ? null : b.dataset.k; update();
    });
  }
  chips('[data-pub-kinds]', KINDS, 'kind', k => count(k));
  chips('[data-pub-topics]', TOPICS, 'topic', t => PUBS.filter(p => (p.tp || []).includes(t)).length);

  let qTimer;
  $('[data-pub-search]').addEventListener('input', e => { clearTimeout(qTimer); qTimer = setTimeout(() => { state.q = e.target.value.trim(); update(); }, 120); });

  // ---- list --------------------------------------------------------------
  const highlight = (s, q) => {
    let h = esc(s);
    if (q) { const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'); h = h.replace(re, '<mark>$1</mark>'); }
    return h;
  };
  const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').toLowerCase();

  function update() {
    document.querySelectorAll('[data-pub-kinds] .chip').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === state.kind));
    document.querySelectorAll('[data-pub-topics] .chip').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === state.topic));
    drawChart();
    const q = fold(state.q);
    const list = PUBS.filter(p =>
      (!state.kind || p.k === state.kind) &&
      (!state.topic || (p.tp || []).includes(state.topic)) &&
      (!state.year || p.y === state.year) &&
      (!q || fold(p.t + ' ' + p.a + ' ' + p.v).includes(q)));

    const filtered = state.q || state.kind || state.topic || state.year;
    $('[data-pub-count]').innerHTML = (TR ? `${PUBS.length} yayından ${list.length} tanesi` : `${list.length} of ${PUBS.length} papers`) + (state.year ? ` · ${state.year}` : '') + (filtered ? ` <button data-clear>${TR ? 'Filtreleri temizle' : 'Clear filters'}</button>` : '');

    const groups = new Map();
    list.sort((a, b) => (b.y || 9999) - (a.y || 9999) || ['journal', 'intl', 'natl'].indexOf(a.k) - ['journal', 'intl', 'natl'].indexOf(b.k) || a.i - b.i)
      .forEach(p => { const k = p.y || (TR ? 'Baskıda' : 'In press'); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); });

    let h = '';
    groups.forEach((ps, y) => {
      const j = ps.filter(p => p.k === 'journal').length;
      h += `<section class="pub-year"><h3>${y}<small>${TR ? ps.length + ' yayın' : ps.length + ' paper' + (ps.length > 1 ? 's' : '')}${j ? ` · ${j} ${TR ? 'dergi' : 'journal'}` : ''}</small></h3><div>`;
      ps.forEach(p => {
        const authors = highlight(p.a, state.q).replace(/A\. E\. Pusane/g, '<b>A. E. Pusane</b>');
        const scholar = 'https://scholar.google.com/scholar?q=' + encodeURIComponent('"' + p.t + '"');
        h += `<article class="pub"><h4 class="t">${highlight(p.t, state.q)}</h4><p class="a">${authors}</p><p class="v">${highlight(p.v, state.q)}</p>
          <div class="m"><span class="pill${p.k === 'journal' ? ' cool' : ''}">${p.k === 'journal' ? (TR ? 'Dergi' : 'Journal') : p.k === 'intl' ? (TR ? 'Uluslararası konf.' : 'Intl. conf.') : (TR ? 'Ulusal konf.' : 'Natl. conf.')}</span>
          ${p.doi ? `<a href="https://doi.org/${esc(p.doi)}" rel="noopener">DOI ↗</a>` : ''}
          <a href="${scholar}" rel="noopener">Scholar ↗</a>
          <button data-cite="${p.i}">${TR ? 'Künyeyi kopyala' : 'Copy citation'}</button></div></article>`;
      });
      h += '</div></section>';
    });
    $('[data-pub-list]').innerHTML = h || `<p class="empty">${TR ? 'Bu filtrelere uyan yayın yok.' : 'No papers match these filters.'}</p>`;
  }

  document.addEventListener('click', e => {
    if (e.target.matches('[data-clear]')) {
      Object.assign(state, { q: '', kind: null, topic: null, year: null }); $('[data-pub-search]').value = ''; update();
    }
    const c = e.target.closest('[data-cite]');
    if (c) {
      const p = PUBS[+c.dataset.cite];
      const txt = `${p.a}, “${p.t},” ${p.v}.` + (p.doi ? ` doi: ${p.doi}` : '');
      const done = () => { c.textContent = TR ? 'Kopyalandı' : 'Copied'; setTimeout(() => c.textContent = TR ? 'Künyeyi kopyala' : 'Copy citation', 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, () => prompt('Citation', txt));
      else prompt('Citation', txt);
    }
  });

  update();
})();
