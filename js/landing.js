// Render halaman awam peniaga. Dipakai oleh l.html (halaman sebenar) dan
// bina.html (pratonton iframe), jadi kedua-duanya mustahil berbeza.
// Sengaja tiada pergantungan pada common.js: iframe pratonton hanya memuatkan
// css/ui.css + css/landing.css + fungsi ini.
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const digits = (p) => String(p ?? '').replace(/\D/g, '').slice(0, 15);
  // Hanya https atau data URL gambar: elak javascript: dalam logo/produk
  const safeUrl = (u) => { const s = String(u ?? '').trim(); return /^(https:\/\/|data:image\/(png|jpe?g|webp|gif);)/i.test(s) ? s : ''; };
  const IC = {
    wa: '<svg class="lp-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h1M12 10h1M16 10h1"/></svg>',
    pin: '<svg class="lp-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    store: '<svg class="lp-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M10 20v-5h4v5"/></svg>'
  };

  function accent(v) { const s = String(v || '').trim(); return /^#[0-9a-f]{6}$/i.test(s) ? s : '#0e5846'; }
  // Warna teks di atas warna aksen: gelap untuk aksen cerah supaya kekal boleh dibaca
  function onColor(hex) {
    const n = parseInt(hex.slice(1), 16);
    const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const L = 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
    return L > 0.55 ? '#0b1a15' : '#ffffff';
  }
  const mono = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  // "5" / "rm 5" -> "RM 5.00"; teks lain (contoh "Dari RM 8") dibiarkan
  function money(v) {
    const s = String(v ?? '').trim(); if (!s) return '';
    if (/^(rm)?\s*\d+(\.\d{1,2})?$/i.test(s)) {
      const n = parseFloat(s.replace(/[^\d.]/g, ''));
      if (isFinite(n)) return 'RM ' + n.toFixed(2);
    }
    return s;
  }
  const text = (v, max) => String(v ?? '').trim().slice(0, max);
  const productsOf = (p) => (Array.isArray(p.products) ? p.products : [])
    .filter(x => x && typeof x === 'object' && String(x.name || '').trim())
    .slice(0, 60);

  function waHref(page) {
    const phone = digits(page.whatsapp);
    if (!phone) return '';
    const brand = text(page.brand_name, 60) || 'bisnes ini';
    const msg = 'Salam ' + brand + ', saya jumpa halaman anda di Segamat Kita. Boleh saya dapatkan maklumat lanjut?';
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);
  }

  function lpHTML(page) {
    const p = page || {};
    const t = p.template === 'bold' ? 'bold' : 'minimal';
    const a = accent(p.accent);
    const brand = text(p.brand_name, 60) || 'Bisnes anda';
    const tagline = text(p.tagline, 140);
    const about = text(p.about, 1200);
    const area = text(p.area, 60);
    const logo = safeUrl(p.logo_url);
    const href = waHref(p);
    const products = productsOf(p);
    const waBtn = (cls = '') => href
      ? `<a class="lp-btn lp-btn-a ${cls}" href="${esc(href)}" target="_blank" rel="noopener">${IC.wa}<span>WhatsApp</span></a>` : '';

    const card = (it) => {
      const img = safeUrl(it.image_url);
      const name = text(it.name, 70);
      const price = money(it.price);
      const desc = text(it.desc, 200);
      return `<article class="lp-card">
      <div class="lp-thumb">${img ? `<img src="${esc(img)}" alt="${esc(name)}" loading="lazy">` : `<span>${esc(mono(name))}</span>`}</div>
      <div class="lp-card-b">
        <div class="lp-card-top"><h3>${esc(name)}</h3>${price ? `<span class="lp-price">${esc(price)}</span>` : ''}</div>
        ${desc ? `<p class="lp-desc">${esc(desc)}</p>` : ''}
      </div></article>`;
    };

    return `<div class="lp tpl-${t}" style="--lp-a:${a};--lp-on:${onColor(a)}">
  <section class="lp-hero"><div class="lp-wrap lp-hero-in">
    <span class="lp-mark">${logo ? `<img src="${esc(logo)}" alt="Logo ${esc(brand)}">` : esc(mono(brand))}</span>
    <h1 class="lp-brand">${esc(brand)}</h1>
    ${tagline ? `<p class="lp-tagline">${esc(tagline)}</p>` : ''}
    <div class="lp-hero-cta">${waBtn('lp-btn-lg')}${area ? `<span class="lp-area">${IC.pin}${esc(area)}</span>` : ''}</div>
  </div></section>
  ${about ? `<section class="lp-sec lp-about"><div class="lp-wrap stack"><h2>Tentang ${esc(brand)}</h2><p class="lp-body">${esc(about)}</p></div></section>` : ''}
  ${products.length ? `<section class="lp-sec lp-products"><div class="lp-wrap stack"><p class="lp-kicker">Produk</p><h2>Apa yang kami tawarkan</h2>
    <div class="lp-grid">${products.map(card).join('')}</div></div></section>` : ''}
  <section class="lp-cta"><div class="lp-wrap lp-cta-in">
    <h2>Hubungi kami</h2>
    ${href ? waBtn('lp-btn-lg') : `<p class="lp-body">Nombor WhatsApp belum ditetapkan.</p>`}
    <p class="lp-small">${area ? esc(area) + ' · ' : ''}Balasan melalui WhatsApp.</p>
  </div></section>
  <footer class="lp-foot"><div class="lp-wrap lp-foot-in">
    <b>${esc(brand)}</b>${area ? `<span>·</span><span>${esc(area)}</span>` : ''}
    <span class="lp-sp"></span>
    <a href="/index.html">Segamat Kita</a>
  </div></footer>
</div>`;
  }

  // Tajuk + keterangan untuk document.title / meta description l.html
  function lpMeta(page) {
    const p = page || {};
    const brand = text(p.brand_name, 60) || 'Peniaga Segamat';
    const tagline = text(p.tagline, 140);
    const about = text(p.about, 400).replace(/\s+/g, ' ');
    const area = text(p.area, 60);
    const desc = tagline || about.slice(0, 155) || [brand, area, 'Halaman rasmi di Segamat Kita.'].filter(Boolean).join(' · ');
    return { title: brand + ' · Segamat Kita', description: desc.slice(0, 160) };
  }

  // Dokumen penuh untuk iframe pratonton dalam bina.html.
  // Path aset root-absolute supaya dokumen yang sama berfungsi di /l/<slug>
  // (Netlify rewrite 200) dan di /l.html.
  function lpPreviewDoc(page) {
    return `<!doctype html><html lang="ms"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/css/ui.css"><link rel="stylesheet" href="/css/landing.css">
</head><body class="lp-page">${lpHTML(page)}</body></html>`;
  }

  function lp404(slug) {
    return `<div class="lp"><div class="lp-wrap lp-404"><div class="lp-404-in">
      <span class="lp-mark">${IC.store}</span>
      <p class="lp-kicker">404</p>
      <h1>Halaman tidak dijumpai</h1>
      <p class="lp-body">${slug ? `Tiada halaman dengan pautan <code>/l/${esc(slug)}</code>.` : 'Pautan halaman tidak lengkap.'} Halaman mungkin belum diterbitkan oleh pemiliknya, atau pautannya sudah berubah.</p>
      <div class="lp-404-cta">
        <a class="lp-btn lp-btn-a" href="/index.html">Kembali ke Segamat Kita</a>
        <a class="lp-btn lp-btn-ghost" href="/bina.html">Bina halaman bisnes</a>
      </div>
    </div></div></div>`;
  }

  window.lpHTML = lpHTML;
  window.lpMeta = lpMeta;
  window.lpPreviewDoc = lpPreviewDoc;
  window.lp404 = lp404;
})();
