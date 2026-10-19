// Bahagian portal yang dikongsi: ikon tambahan, header, footer, kad listing, terma.
Object.assign(P, {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  news: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2"/><path d="M7 9h7M7 12h7M7 15h4"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  market: '<path d="M3 7h18l-1.5 12a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z"/><path d="M8 7a4 4 0 0 1 8 0"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 12h18"/>',
  tick: '<path d="M12 2l2.6 1.9 3.2.1 1 3 2.6 1.9-1 3.1 1 3-2.6 1.9-1 3-3.2.1L12 22l-2.6-1.9-3.2-.1-1-3-2.6-1.9 1-3-1-3.1L5.2 7l1-3 3.2-.1z" fill="currentColor" stroke="none"/><path d="M8.5 12.2l2.3 2.3 4.7-4.7" stroke="var(--surface)" stroke-width="2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z"/>',
  rain: '<path d="M7 15h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 6.5 4.3 4.3 0 0 0 7 15z"/><path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3"/>',
  storm: '<path d="M7 14h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 5.5 4.3 4.3 0 0 0 7 14z"/><path d="M13 14l-3 4h4l-3 4"/>',
  haze: '<circle cx="12" cy="9" r="3.5"/><path d="M3 15h18M5 18.5h14M7 22h10M12 2.5v1.5M5.5 5.5l1 1M18.5 5.5l-1 1"/>',
  drop: '<path d="M12 3s6 7 6 11.5a6 6 0 0 1-12 0C6 10 12 3 12 3z"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  battery: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M7 7V5h3v2M14 7V5h3v2M6.5 13h3M14.5 13h3M16 11.5v3"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  snow: '<path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10"/>',
  car: '<path d="M3 16v-3l2.2-5.2A2 2 0 0 1 7 6.5h10a2 2 0 0 1 1.8 1.3L21 13v3a1 1 0 0 1-1 1h-1.5M3 16a1 1 0 0 0 1 1h1.5M8.5 17h7"/><circle cx="7" cy="17" r="1.8"/><circle cx="17" cy="17" r="1.8"/>',
  bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  cross: '<path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z"/>'
});
const AREAS = C.AREAS;
const MK_CATS = ['Penapis Air & Peralatan', 'Insurans & Takaful', 'Kenderaan', 'Elektrik & Wiring', 'Aircond', 'Rumah & Lain-lain'];
const MK_IC = { 'Penapis Air & Peralatan': 'drop', 'Insurans & Takaful': 'shield', 'Kenderaan': 'battery', 'Elektrik & Wiring': 'bolt', 'Aircond': 'snow', 'Rumah & Lain-lain': 'home' };
const DIR_CATS = ['Kedai Makan', 'Tempat Menarik', 'Servis Rumah', 'Kenderaan', 'Runcit & Kedai', 'Kesihatan', 'Ejen & Agensi'];
const DIR_IC = { 'Kedai Makan': 'bowl', 'Tempat Menarik': 'pin', 'Servis Rumah': 'home', 'Kenderaan': 'car', 'Runcit & Kedai': 'bag', 'Kesihatan': 'cross', 'Ejen & Agensi': 'brief' };
const NAV = [['index.html#utama', 'utama', 'Utama', 'home'], ['index.html#info', 'info', 'Info', 'news'], ['index.html#direktori', 'direktori', 'Direktori', 'list'], ['lapar.html', 'lapar', 'Lapar Ek?', 'bowl'], ['index.html#market', 'market', 'Market', 'market']];
const normPh = (p) => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '6' + d; return d; };
const ago = (d) => { const m = mins(d); if (m < 1) return 'baru tadi'; if (m < 60) return m + ' min lalu'; const h = Math.round(m / 60); return h < 24 ? h + ' jam lalu' : Math.round(h / 24) + ' hari lalu'; };
const statusPill = (s) => s === 'lulus' ? '<span class="pill ok">Diluluskan</span>' : s === 'tolak' ? '<span class="pill bad">Ditolak</span>' : '<span class="pill warn">Menunggu kelulusan</span>';
const LOGO = `<span class="mark brand"><svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px;position:relative;z-index:1"><path d="M3 15c3-3 5 1 9-2s5-6 9-4"/><path d="M3 19c3-3 5 1 9-2s5-6 9-4"/></svg></span>`;

function renderPortalNav(active) {
  const top = $('#topnav'), tabs = $('#tabs');
  if (top) top.innerHTML = NAV.map(([h, k, l]) => `<a href="${h}" class="${active === k ? 'on' : ''}">${l === 'Market' ? 'Marketplace' : l}</a>`).join('');
  if (tabs) tabs.innerHTML = NAV.map(([h, k, l, i]) => `<a href="${h}" class="${active === k ? 'on' : ''}"><span class="ic">${ic(i)}</span>${l}</a>`).join('');
}
function footerHTML() {
  return `<footer class="site-foot"><div class="wrap">
    <div class="foot-grid">
      <div class="foot-brand"><a class="logo" href="index.html">${LOGO}Segamat Kita</a>
        <p>Portal komuniti untuk warga daerah Segamat. Berita tempatan, direktori bisnes, marketplace servis dan order makan, semua di satu tempat.</p></div>
      <nav class="foot-col" aria-label="Bantuan"><h3>Bantuan</h3>
        <a href="index.html#info" data-submit-info>Hantar info</a><a href="#" data-legal="hubungi">Hubungi kami</a><a href="#" data-legal="terma">Terma penggunaan</a><a href="#" data-legal="privasi">Dasar privasi</a></nav>
    </div>
    <div class="foot-bar"><span>© ${new Date().getFullYear()} Segamat Kita · Dibina untuk warga Segamat</span></div>
  </div></footer>`;
}
function openLegal(k) {
  const draft = '<p class="small muted">Draf ringkas. Versi penuh akan diterbitkan sebelum pelancaran.</p>';
  const L = {
    hubungi: ['Hubungi kami', `<p>Ada soalan, aduan atau nak bekerjasama dengan Segamat Kita?</p>
      <div class="card" style="background:var(--soft);border-color:transparent"><b>WhatsApp & email admin</b><span class="small muted">${C.CONTACT ? esc(C.CONTACT) : 'Butiran hubungan akan dipaparkan di sini sebelum pelancaran.'}</span></div>
      <p class="small muted">Untuk kecemasan, jangan hubungi kami. Terus dail <b>999</b>.</p>`],
    terma: ['Terma penggunaan', `${draft}
      <h3>1. Tentang Segamat Kita</h3><p>Segamat Kita menghubungkan warga Segamat dengan bisnes, peniaga dan penyedia servis tempatan. Kami bukan penjual makanan atau penyedia servis.</p>
      <h3>2. Order & bayaran</h3><p>Order Lapar Ek? dibuat terus dengan kedai. Harga, kualiti makanan dan bayaran adalah tanggungjawab kedai. Segamat Kita tidak mengenakan caj kepada pelanggan.</p>
      <h3>3. Servis & iklan</h3><p>Penyedia servis bertanggungjawab atas servis dan sebut harga mereka. Lencana "Disahkan" bermaksud identiti penyedia telah disemak, bukan jaminan kualiti kerja.</p>
      <h3>4. Kandungan pengguna</h3><p>Post, iklan dan listing disemak oleh admin. Kami boleh membuang kandungan palsu, mengelirukan, menyalahi undang-undang atau menyinggung perasaan.</p>
      <h3>5. Maklumat cuaca & kualiti udara</h3><p>Data cuaca dari MET Malaysia dan bacaan IPU dari Jabatan Alam Sekitar dipaparkan sebagai panduan sahaja.</p>`],
    privasi: ['Dasar privasi', `${draft}
      <h3>Data yang kami kumpul</h3><p>Nama dan email akaun Google, nombor telefon (jika diberi), butiran order, post dan listing anda.</p>
      <h3>Kenapa</h3><p>Untuk memproses order, membolehkan kedai dan penyedia servis menghubungi anda, dan memaparkan sejarah anda.</p>
      <h3>Dokumen pengesahan</h3><p>Gambar IC dan kad ejen untuk lencana Disahkan hanya dilihat oleh admin dan dipadam selepas semakan.</p>
      <h3>Hak anda</h3><p>Di bawah Akta Perlindungan Data Peribadi 2010, anda boleh minta untuk melihat, membetulkan atau memadam data anda melalui halaman Hubungi kami.</p>`]
  }[k];
  if (L) sheet(`${sheetHead(L[0])}<div class="legal">${L[1]}</div>`);
}
function listingCard(l) {
  const p = l.provider || {};
  return `<div class="card">
    <div class="row nowrap between"><div class="row nowrap" style="min-width:0">${thumb(p.name || '?', { cls: 'sm', icon: 'store' })}<div class="stack" style="gap:0;min-width:0"><b>${esc(p.name)}</b><span class="small muted">${esc(p.role)} ${p.verified ? `<span class="verified">${ic('tick')}Disahkan</span>` : ''}</span></div></div>
      <div class="thumb sm" style="--h:${hue(l.cat)}">${ic(MK_IC[l.cat] || 'home', '')}</div></div>
    <h3>${esc(l.title)}</h3><p class="small muted clamp">${esc(l.descr)}</p>
    <div class="row between"><span class="price">${esc(l.price)}<span class="small muted" style="font-family:var(--f-body);font-weight:500">${esc(l.unit)}</span></span>
      <div class="row" style="gap:6px"><button class="btn sm" data-listing="${l.id}">Butiran</button><a class="btn wa sm" target="_blank" rel="noopener" href="${wa(p.phone, 'Salam, saya nampak "' + l.title + '" di Segamat Kita. Boleh dapatkan maklumat lanjut?')}">${ic('chat')}WhatsApp</a></div></div></div>`;
}
document.addEventListener('click', (e) => {
  const lg = e.target.closest('[data-legal]'); if (lg) { e.preventDefault(); openLegal(lg.dataset.legal); }
});
