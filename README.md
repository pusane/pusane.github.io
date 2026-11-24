# Ali Emre Pusane — kişisel web sitesi

Düz HTML + CSS + biraz JavaScript. Framework yok, derleme adımı zorunlu değil, harici bağımlılık sadece Google Fonts.
Klasörü olduğu gibi herhangi bir statik sunucuya koymak yeterli.

## Yerel önizleme

```bash
python3 -m http.server 8765 --directory pusane-site
```

Ardından http://localhost:8765 adresini açın.

## Yapı

| Dosya | İçerik |
|---|---|
| `index.html` | Hero (canlı IQ konstelasyonu), hakkında, eğitim, hizmet ve ödüller |
| `research.html` | Araştırma alanları, Tanner grafiği / peeling decoder demosu, proje zaman çizelgesi, BUSARG |
| `publications.html` | Yayın listesi: yıllara göre grafik, arama, tür/konu filtreleri, DOI / Scholar / atıf kopyalama |
| `teaching.html` | Dersler, öğrenci değerlendirmeleri (pencerede açılır), öğretim ödülleri |
| `people.html` | Mevcut öğrenciler, mezunların gittiği yerler, lisans projeleri |
| `genealogy.html` | Etkileşimli akademik soyağacı (Erasmus → … → Euler → … → Massey → Costello → Pusane) |
| `life.html` | Maratonlar ve fotoğraf albümleri |
| `assets/data/publications.js` | **Yayınlar.** Satır başına bir kayıt; yeni yayını buraya ekleyin |
| `assets/data/feedback.js` | Ders → dönem → değerlendirme görselleri |
| `assets/css/site.css` | Bütün tasarım; renkler ve yazı tipleri en üstteki değişkenlerde |
| `assets/js/*.js` | Ortak davranış (`site.js`) ve sayfa bazlı etkileşimler |

## İki dil (EN / TR)

İngilizce sayfalar kökte, Türkçe sayfalar `tr/` klasöründe. Kaynaklar:
`_tools/pages/*.html` (EN) ve `_tools/pages-tr/*.html` (TR). **Her değişiklik iki klasörde de yapılmalı**, ardından:

```bash
python3 _tools/assemble.py
```

Bu komut her iki dili de üretir; `tr/` sayfalarındaki `assets/` yollarını otomatik olarak `../assets/` yapar.
JS dosyalarındaki ekran metinleri `document.documentElement.lang === 'tr'` kontrolüyle iki dilli.

## Sık yapılan düzenlemeler

**Yeni yayın eklemek** — `assets/data/publications.js` içine bir satır ekleyin:

```js
{"k": "journal", "a": "A. Yazar, and A. E. Pusane", "t": "Başlık", "v": "IEEE Trans. ..., vol. 1, no. 1, pp. 1-10, Month 2026", "y": 2026, "doi": "10.1109/...", "tp": ["coding"]},
```

`k`: `journal` / `intl` / `natl` · `y: null` → "In press" altında görünür · `tp` konu etiketleri: `molecular`, `coding`, `wireless`, `optical`, `security`, `ml`.
Sayılar, grafik ve ana sayfadaki toplam otomatik güncellenir.

**Öğrenci / ders / proje listeleri** — ilgili sayfanın altındaki küçük `<script>` bloğunda dizi olarak duruyor.

**Menü, üst bilgi veya alt bilgi** — her sayfada aynı blok tekrarlanıyor. Tek yerden değiştirmek isterseniz
`_tools/pages/*.html` (sayfa gövdeleri) ve `_tools/assemble.py` (ortak üst/alt bilgi) kullanılabilir:

```bash
python3 _tools/assemble.py
```

Bu komut kökteki `.html` dosyalarını yeniden üretir; o durumda düzenlemeleri `_tools/pages/` içinde yapın.
`_tools/` klasörünü yayınlamanıza gerek yok.

## Yayına alma

Herhangi bir statik barındırma işe yarar:

- **GitHub Pages** — klasörü bir depoya koyup Settings → Pages → "Deploy from branch".
- **Netlify / Cloudflare Pages** — klasörü sürükle-bırak; özel alan adı (ör. `pusane.net`) bağlanabilir.

## Notlar

- E-posta adresi sayfaya JavaScript ile yazılıyor (basit tarayıcılara karşı).
- Karanlık mod sistem ayarını izler; sağ üstteki düğme ile elle değiştirilebilir.
- Hareket azaltma (`prefers-reduced-motion`) açık olan ziyaretçilerde animasyonlar durur.
