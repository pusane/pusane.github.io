/* Shared behaviour for every page: theme, menu, header, reveal, e-mail. */
(function () {
  const root = document.documentElement;

  // ---- theme -------------------------------------------------------------
  const stored = (() => { try { return localStorage.getItem('theme'); } catch (e) { return null; } })();
  root.dataset.theme = stored || 'light';           // light by default, dark only on request
  const isDark = () => root.dataset.theme === 'dark';
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
      document.dispatchEvent(new CustomEvent('themechange'));
    });
  });

  // ---- mobile menu -------------------------------------------------------
  const menuBtn = document.querySelector('.menu-btn');
  const nav = document.querySelector('.nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open);
    });
  }

  // ---- header border on scroll -------------------------------------------
  const header = document.querySelector('.site-header');
  const onScroll = () => header && header.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // ---- reveal on scroll --------------------------------------------------
  const els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
  } else els.forEach(el => el.classList.add('in'));

  // ---- e-mail (assembled to keep it away from simple scrapers) -----------
  const mail = ['ali.pusane', 'bogazici.edu.tr'].join('@');
  document.querySelectorAll('[data-email]').forEach(a => {
    a.href = 'mailto:' + mail;
    if (!a.dataset.keepText) a.textContent = mail;
  });

  // ---- footer year -------------------------------------------------------
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();

/* Helper for pages that draw with canvas/SVG and need theme colours. */
window.cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
