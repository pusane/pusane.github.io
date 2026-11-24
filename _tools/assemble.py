# Assembles page bodies into the site folder, in two languages.
#   _tools/pages/*.html     -> English pages in the site root
#   _tools/pages-tr/*.html  -> Turkish pages in tr/
# First line of every page body: title|description|active-nav|extra-scripts
# Every change should be made in BOTH folders so the two sites stay parallel.
import os, re
SP = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(SP) + '/'

L = {
  'en': dict(src='pages', out='', base='', other='tr/', other_label='TR', other_name='Türkçe',
    navl=['Home', 'Research', 'Publications', 'Teaching', 'People', 'Genealogy', 'Personal'],
    skip='Skip to content', dark='Toggle dark mode', menu='Menu', main_nav='Main',
    brand='BOĞAZİÇİ · EE',
    footer_big='Questions about research, theses, or courses? Write to me.',
    footer_btn='Send an e-mail',
    footer_addr='Department of Electrical &amp; Electronics Engineering<br>Boğaziçi University, Bebek 34342 İstanbul',
    pages='Pages', elsewhere='Elsewhere', cv='Curriculum vitae (PDF)', dept='EE @ Boğaziçi',),
  'tr': dict(src='pages-tr', out='tr/', base='../', other='../', other_label='EN', other_name='English',
    navl=['Ana sayfa', 'Araştırma', 'Yayınlar', 'Dersler', 'Öğrenciler', 'Soyağacı', 'Kişisel'],
    skip='İçeriğe geç', dark='Karanlık modu aç/kapat', menu='Menü', main_nav='Ana menü',
    brand='BOĞAZİÇİ · EE',
    footer_big='Araştırma, tezler ya da derslerle ilgili sorularınız için yazabilirsiniz.',
    footer_btn='E-posta gönder',
    footer_addr='Elektrik-Elektronik Mühendisliği Bölümü<br>Boğaziçi Üniversitesi, Bebek 34342 İstanbul',
    pages='Sayfalar', elsewhere='Bağlantılar', cv='Özgeçmiş (PDF)', dept='Boğaziçi EE',),
}
FILES = ['index.html', 'research.html', 'publications.html', 'teaching.html', 'people.html', 'genealogy.html', 'life.html']

HEAD = '''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{base}assets/img/portrait.jpg">
<meta name="theme-color" content="#ffffff">
<link rel="alternate" hreflang="en" href="{en_href}">
<link rel="alternate" hreflang="tr" href="{tr_href}">
<link rel="icon" href="{base}assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Inter:wght@300;400;450;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{base}assets/css/site.css">
<link rel="stylesheet" href="{base}assets/css/skin-swiss.css">
<script>window.BASE='{base}';try{{document.documentElement.dataset.theme=localStorage.getItem('theme')||'light'}}catch(e){{document.documentElement.dataset.theme='light'}}</script>
</head>
<body>
<a class="skip" href="#main">{skip}</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="index.html"><b>Ali Emre Pusane</b><span>{brand}</span></a>
    <div style="display:flex;align-items:center;gap:8px">
      <nav class="nav" id="nav" aria-label="{main_nav}">
{nav}
      </nav>
      <a class="icon-btn lang-btn" href="{other_href}" hreflang="{other_lang}" lang="{other_lang}" title="{other_name}" aria-label="{other_name}">{other_label}</a>
      <button class="icon-btn" data-theme-toggle aria-label="{dark}" title="{dark}"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="6"/><path d="M8 2a6 6 0 0 0 0 12z" fill="currentColor"/></svg></button>
      <button class="icon-btn menu-btn" aria-label="{menu}" aria-expanded="false" aria-controls="nav"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M2 5h12M2 11h12"/></svg></button>
    </div>
  </div>
</header>
<main id="main">
'''
FOOT = '''</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <p class="footer-big">{footer_big}</p>
        <a class="btn" data-email data-keep-text="1" href="#">{footer_btn} <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 12 12 4M5 4h7v7"/></svg></a>
        <p class="muted mt-s" style="font-size:14px">{footer_addr}</p>
      </div>
      <div>
        <h4>{pages}</h4>
        <ul>
{fnav}
        </ul>
      </div>
      <div>
        <h4>{elsewhere}</h4>
        <ul>
          <li><a href="https://scholar.google.com/citations?user=kb9sJBYAAAAJ" rel="noopener">Google Scholar</a></li>
          <li><a href="{base}assets/cv-pusane.pdf">{cv}</a></li>
          <li><a href="https://ee.bogazici.edu.tr" rel="noopener">{dept}</a></li>
          <li><a data-email href="#">ali.pusane [at] bogazici.edu.tr</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-base"><span>© <span data-year>2026</span> Ali Emre Pusane</span></div>
  </div>
</footer>
<script src="{base}assets/js/site.js"></script>
{scripts}
</body>
</html>
'''

def rebase(body, base):
    """Point relative asset paths at ../assets/ for pages that live in a subfolder."""
    if not base: return body
    return re.sub(r'''(["'(])assets/''', lambda m: m.group(1) + base + 'assets/', body)

for lang, c in L.items():
    os.makedirs(ROOT + c['out'], exist_ok=True)
    for name in FILES:
        f = f"{SP}/{c['src']}/{name}"
        if not os.path.exists(f):
            print('missing', lang, name); continue
        first, body = open(f).read().split('\n', 1)
        title, desc, active, scripts = (first.split('|') + ['', ''])[:4]
        nav = '\n'.join(f'        <a href="{h}"' + (' aria-current="page"' if h == name else '') + f'>{t}</a>' for h, t in zip(FILES, c['navl']))
        fnav = '\n'.join(f'          <li><a href="{h}">{t}</a></li>' for h, t in zip(FILES, c['navl']))
        sc = '\n'.join(f'<script src="{c["base"]}{s.strip()}"></script>' for s in scripts.split(',') if s.strip())
        en_href = ('' if lang == 'en' else '../') + name
        tr_href = ('tr/' if lang == 'en' else '') + name
        page = HEAD.format(lang=lang, title=title, desc=desc, nav=nav, en_href=en_href, tr_href=tr_href,
                           other_href=c['other'] + name, other_lang='tr' if lang == 'en' else 'en', **c) \
             + rebase(body.rstrip(), c['base']) + '\n' + FOOT.format(fnav=fnav, scripts=sc, **c)
        open(ROOT + c['out'] + name, 'w').write(page)
        print('wrote', c['out'] + name)
