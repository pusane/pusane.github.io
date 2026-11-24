/* Academic genealogy as an SVG DAG. Click a node to highlight its paths to the bottom. */
(function () {
  const svg = document.querySelector('[data-gen]');
  if (!svg) return;
  // id: [name, institution, year, row, x]
  const N = {
    hegius: ['Alexander Hegius', '', '', 0, 707],
    standonck: ['Jan Standonck', 'Collège Sainte-Barbe / Collège de Montaigu', '', 0, 915],
    zasius: ['Ulrich Zasius', 'Universität Freiburg im Breisgau', 1501, 1, 520],
    erasmus: ['Desiderius Erasmus', 'Collège de Montaigu', 1497, 1, 820],
    milich: ['Jakob Milich', 'Freiburg im Breisgau / Universität Wien', '', 2, 678],
    reinhold: ['Erasmus Reinhold', 'Universität Halle-Wittenberg', 1535, 3, 678],
    tremellius: ['Immanuel Tremellius', '', '', 4, 420],
    naibod: ['Valentine Naibod', 'Halle-Wittenberg / Universität Erfurt', '', 4, 690],
    rsnellius: ['Rudolph Snellius', 'Universität zu Köln / Heidelberg', 1572, 5, 540],
    ceulen: ['Ludolph van Ceulen', '', '', 5, 840],
    erpenius: ['Thomas Erpenius', '', '', 6, 450],
    wsnellius: ['Willebrord Snellius', 'Universiteit Leiden', 1607, 6, 690],
    mersenne: ['Marin Mersenne', 'Université Paris IV-Sorbonne', 1611, 7, 370],
    golius: ['Jacobus Golius', 'Universiteit Leiden', '', 7, 590],
    stampioen: ['Jan Jansz Stampioen, Jr.', '', '', 8, 300],
    schooten: ['Frans van Schooten, Jr.', 'Universiteit Leiden', 1635, 8, 500],
    huygens: ['Christiaan Huygens', 'Universiteit Leiden / Université d’Angers', '', 9, 400],
    weigel: ['Erhard Weigel', 'Universität Leipzig', 1650, 9, 640],
    leibniz: ['Gottfried Wilhelm Leibniz', 'Universität Altdorf', 1666, 10, 513],
    mencke: ['Otto Mencke', 'Universität Leipzig', '', 10, 840],
    jbernoulli: ['Jacob Bernoulli', 'Universität Basel', 1684, 11, 513],
    wichmann: ['J. C. Wichmannshausen', 'Universität Leipzig', 1685, 11, 840],
    johbernoulli: ['Johann Bernoulli', 'Universität Basel', 1694, 12, 513],
    hausen: ['Christian August Hausen', 'Universität Halle-Wittenberg', 1713, 12, 840],
    euler: ['Leonhard Euler', 'Universität Basel', 1726, 13, 513],
    kastner: ['Abraham Gotthelf Kästner', 'Universität Leipzig', 1739, 13, 840],
    lagrange: ['Joseph Louis Lagrange', '', '', 14, 513],
    pfaff: ['Johann Friedrich Pfaff', 'Universität Göttingen', 1786, 14, 840],
    langsdorf: ['Karl Christian von Langsdorf', 'Universität Erfurt', 1781, 15, 165],
    fourier: ['Jean-Baptiste Joseph Fourier', '', '', 15, 410],
    poisson: ['Siméon Denis Poisson', 'École Polytechnique', '', 15, 625],
    gauss: ['Carl Friedrich Gauß', 'Universität Helmstedt', 1799, 15, 860],
    ohm: ['Martin Ohm', 'Universität Erlangen-Nürnberg', 1811, 16, 165],
    dirichlet: ['Gustav Peter Lejeune Dirichlet', 'Universität Bonn', 1827, 16, 520],
    gerling: ['Christian Ludwig Gerling', 'Universität Göttingen', 1812, 16, 860],
    lipschitz: ['Rudolf Lipschitz', 'Universität Berlin', 1853, 17, 520],
    plucker: ['Julius Plücker', 'Universität Marburg', 1823, 17, 820],
    klein: ['Felix Klein', 'Universität Bonn', 1868, 18, 670],
    lindemann: ['Ferdinand von Lindemann', 'Universität Erlangen-Nürnberg', 1873, 19, 670],
    sommerfeld: ['Arnold Sommerfeld', 'Universität Königsberg', 1891, 20, 670],
    guillemin: ['Ernst Guillemin', 'LMU München', 1926, 21, 670],
    fano: ['Robert M. Fano', 'Massachusetts Institute of Technology', 1947, 22, 670],
    wozencraft: ['John M. Wozencraft', 'Massachusetts Institute of Technology', 1957, 23, 670],
    massey: ['James L. Massey', 'Massachusetts Institute of Technology', 1962, 24, 670],
    costello: ['Daniel J. Costello, Jr.', 'University of Notre Dame', 1969, 25, 670],
    pusane: ['Ali Emre Pusane', 'University of Notre Dame', 2008, 26, 670]
  };
  const E = `hegius>erasmus standonck>erasmus zasius>milich erasmus>milich milich>reinhold reinhold>naibod tremellius>rsnellius naibod>rsnellius
    rsnellius>wsnellius ceulen>wsnellius erpenius>golius wsnellius>golius mersenne>schooten golius>schooten stampioen>huygens schooten>huygens
    huygens>leibniz weigel>leibniz leibniz>jbernoulli jbernoulli>johbernoulli johbernoulli>euler euler>lagrange lagrange>fourier lagrange>poisson
    fourier>dirichlet poisson>dirichlet mencke>wichmann wichmann>hausen hausen>kastner kastner>pfaff pfaff>gauss gauss>gerling gerling>plucker
    langsdorf>ohm ohm>lipschitz dirichlet>lipschitz lipschitz>klein plucker>klein klein>lindemann lindemann>sommerfeld sommerfeld>guillemin
    guillemin>fano fano>wozencraft wozencraft>massey massey>costello costello>pusane`.trim().split(/\s+/).map(s => s.split('>'));

  // Doctoral graduates, oldest first: [given names, surname, year, note]
  const KIDS = [
    ['Giray', 'Kömürcü', 2014, 'co-advised with Günhan Dündar'],
    ['Ülkühan', 'Güler', 2014, 'co-advised with Günhan Dündar'],
    ['Bayram Cevdet', 'Akdeniz', 2018],
    ['Reza', 'Ashrafi', 2018],
    ['Yağmur', 'Sabucu Sandal', 2019, 'co-advised with Güneş Zeynep Karabulut Kurt'],
    ['Abdullah', 'Sarıduman', 2020, 'co-advised with Z. Caner Taşkın'],
    ['Görkem', 'Ülkar', 2020],
    ['Mehmet Özgün', 'Demir', 2023, 'co-advised with Güneş Zeynep Karabulut Kurt'],
    ['Massoud', 'Pourmandi', 2023, 'co-advised with Şefik Şuayb Arslan'],
    ['Muhammet Yaser', 'Yağan', 2026, 'co-advised with İbrahim Hökelek']
  ];
  const RH = 72, TOP = 30, W = 1060, ME_Y = TOP + 26 * RH, BUS = ME_Y + 58, KID_Y = ME_Y + 86, H = KID_Y + 70;
  const kx = i => 62 + i * (936 / (KIDS.length - 1));
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const y = id => TOP + N[id][3] * RH;
  let out = '<g class="edges">';
  E.forEach(([a, b]) => {
    const x1 = N[a][4], y1 = y(a) + (N[a][1] ? 24 : 10), x2 = N[b][4], y2 = y(b) - 20, m = (y1 + y2) / 2;
    out += `<path class="g-edge" data-e="${a}>${b}" d="M${x1},${y1} C${x1},${m} ${x2},${m} ${x2},${y2}"/>`;
  });
  out += '</g>';
  for (const id in N) {
    const [nm, inst, yr] = N[id], x = N[id][4], yy = y(id);
    const sub = [inst, yr].filter(Boolean).join(' · ');
    out += `<g class="g-node${id === 'pusane' ? ' g-me' : ''}" data-id="${id}" tabindex="0" role="button" aria-label="${nm}${sub ? ', ' + sub : ''}">
      <rect class="hit" x="${x - 150}" y="${yy - 24}" width="300" height="52"/>
      <circle class="dot" cx="${x}" cy="${yy - 14}" r="3.2"/>
      <text class="nm" x="${x}" y="${yy + 6}">${nm}</text>
      ${sub ? `<text class="in" x="${x}" y="${yy + 21}">${sub}</text>` : ''}</g>`;
  }
  // students: trunk, bus, drops, labels
  out += `<g class="kids-edges"><path class="g-edge k-trunk" d="M${N.pusane[4]},${ME_Y + 30} V${BUS}"/>`;
  out += `<path class="g-edge k-bus" d="M${kx(0)},${BUS} H${kx(KIDS.length - 1)}"/>`;
  KIDS.forEach((k, i) => { out += `<path class="g-edge k-drop" data-e="pusane>k${i}" d="M${kx(i)},${BUS} V${KID_Y - 12}"/>`; });
  out += '</g>';
  KIDS.forEach((k, i) => {
    const x = kx(i), label = k[0] + ' ' + k[1];
    out += `<g class="g-node g-kid" data-id="k${i}" tabindex="0" role="button" aria-label="${label}, PhD ${k[2]}">
      <rect class="hit" x="${x - 50}" y="${KID_Y - 14}" width="100" height="74"/>
      <circle class="dot" cx="${x}" cy="${KID_Y - 8}" r="3.2"/>
      <text class="nm" x="${x}" y="${KID_Y + 12}">${k[0]}</text>
      <text class="nm" x="${x}" y="${KID_Y + 29}">${k[1]}</text>
      <text class="in" x="${x}" y="${KID_Y + 45}">${k[2]}</text></g>`;
  });
  svg.innerHTML = out;
  const lineage = () => svg.querySelectorAll('.g-kid, .kids-edges .g-edge').forEach(e => e.classList.add('on'));

  // children map → descendants & shortest distance to pusane
  const kids = {}; E.forEach(([a, b]) => (kids[a] = kids[a] || []).push(b));
  function paths(from) {
    // nodes/edges on any path from `from` to pusane
    const onNodes = new Set(), onEdges = new Set();
    const reach = {};
    const canReach = id => {
      if (id in reach) return reach[id];
      if (id === 'pusane') return (reach[id] = true);
      return (reach[id] = (kids[id] || []).map(canReach).some(Boolean));
    };
    const walk = id => { onNodes.add(id); (kids[id] || []).forEach(k => { if (canReach(k)) { onEdges.add(id + '>' + k); walk(k); } }); };
    walk(from);
    return { onNodes, onEdges };
  }
  function dist(from) {
    const q = [[from, 0]], seen = new Set([from]);
    while (q.length) { const [id, d] = q.shift(); if (id === 'pusane') return d; (kids[id] || []).forEach(k => { if (!seen.has(k)) { seen.add(k); q.push([k, d + 1]); } }); }
    return null;
  }
  const readout = document.querySelector('[data-gen-readout]');
  const TR = document.documentElement.lang === 'tr';

  function select(id) {
    svg.querySelectorAll('.on, .root').forEach(e => e.classList.remove('on', 'root'));
    if (!id) { svg.classList.remove('sel'); readout.innerHTML = ''; return; }
    if (id[0] === 'k' && id !== 'kastner' && id !== 'klein') {
      const i = +id.slice(1), k = KIDS[i];
      svg.classList.add('sel');
      [`[data-id="${id}"]`, `[data-e="pusane>k${i}"]`, '.k-trunk', '.k-bus', '[data-id="pusane"]'].forEach(q => svg.querySelector(q).classList.add('on'));
      svg.querySelector(`[data-id="${id}"]`).classList.add('root');
      readout.innerHTML = TR ? `<b>${k[0]} ${k[1]}</b> — doktora öğrencim, doktora ${k[2]}${k[3] ? ' (' + k[3].replace(/^co-advised with (.*)$/, '$1 ile ortak danışmanlık') + ')' : ''}.` : `<b>${k[0]} ${k[1]}</b> — my doctoral student, Ph.D. ${k[2]}${k[3] ? ' (' + k[3] + ')' : ''}.`;
      return;
    }
    const { onNodes, onEdges } = paths(id);
    svg.classList.add('sel');
    onNodes.forEach(n => svg.querySelector(`[data-id="${n}"]`).classList.add('on'));
    onEdges.forEach(e => svg.querySelector(`[data-e="${e}"]`).classList.add('on'));
    svg.querySelector(`[data-id="${id}"]`).classList.add('root');
    lineage();
    const d = dist(id), nm = N[id][0];
    readout.innerHTML = TR ? (id === 'pusane' ? `Bu benim. Altta ${KIDS.length} doktora mezunum yer alıyor; soy ağacı devam ediyor.` : `<b>${nm}</b>, benden ${d} kuşak geride: akademik ${d === 1 ? 'babam' : d === 2 ? 'dedem' : d === 3 ? 'büyük dedem' : (d - 2) + '. kuşaktan büyük dedem'}.`) : id === 'pusane' ? `That’s me. Below are my ${KIDS.length} doctoral graduates — the line continues.`
      : `<b>${nm}</b> is my academic ${d === 1 ? 'parent' : d === 2 ? 'grandparent' : d === 3 ? 'great-grandparent' : (d - 2) + '× great-grandparent'} — ${d} generation${d > 1 ? 's' : ''} back.`;
  }
  svg.addEventListener('click', e => { const g = e.target.closest('.g-node'); select(g ? g.dataset.id : null); });
  svg.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('.g-node')) { e.preventDefault(); select(e.target.closest('.g-node').dataset.id); } });
  document.querySelectorAll('[data-jump]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.jump; select(id);
    if (id) svg.querySelector(`[data-id="${id}"]`).scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
})();
