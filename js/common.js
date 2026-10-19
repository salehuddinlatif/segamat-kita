// Fungsi kecil yang dikongsi page pelanggan dan dashboard peniaga.
const C = window.LAPAR_CONFIG;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rm = (v) => 'RM ' + Number(v || 0).toFixed(2);
const hue = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const fmtTime = (d) => new Date(d).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (d) => new Date(d).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' });
const mins = (d) => Math.max(0, Math.round((Date.now() - new Date(d)) / 60000));
// Keselamatan: nombor telefon dari database hanya digit (elak kod HTML/skrip diselitkan)
const digits = (p) => String(p ?? '').replace(/\D/g, '').slice(0, 15);
const fmtPhone = (p) => digits(p) ? '+' + digits(p).replace(/^(\d{2})(\d{2})(\d{3})(\d+)/, '$1 $2-$3 $4') : '';
const wa = (p, msg) => `https://wa.me/${digits(p)}?text=${encodeURIComponent(msg)}`;
// Keselamatan: pautan/gambar dari pengguna hanya https (atau gambar tempatan), bukan javascript:
const safeUrl = (u) => { const s = String(u ?? '').trim(); return /^(https:\/\/|blob:|data:image\/(png|jpe?g|webp|gif);)/i.test(s) ? s : ''; };
const slugify = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
const STATUS = { baru: 'Baru', diterima: 'Disediakan', siap: 'Siap', selesai: 'Selesai', batal: 'Dibatalkan' };
const PAY = { cash: 'Tunai', duitnow: 'DuitNow QR' };

const P = {
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M9 7c0-1.2 1-1.2 1-2.4M13 7c0-1.2 1-1.2 1-2.4"/>',
  noodle: '<path d="M3 12h18a9 9 0 0 1-18 0z"/><path d="M14 3l-5 9M19 3l-6 9"/>',
  bread: '<path d="M6 11a4 4 0 0 1 1-8h10a4 4 0 0 1 1 8v9H6z"/><path d="M10 11v5"/>',
  cup: '<path d="M5 8h12v6a6 6 0 0 1-12 0z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 2.5c0 1.5 1 1.5 1 3M12 2.5c0 1.5 1 1.5 1 3"/>',
  dessert: '<path d="M6 11h12l-1.5 9h-9z"/><path d="M7 11a5 5 0 0 1 10 0"/><circle cx="12" cy="5" r="1.2"/>',
  plate: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>',
  store: '<path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M10 20v-5h4v5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  dine: '<path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 1-3 3.5-3 6.5 0 2 1.5 2.5 3 2.5v9"/>',
  bagup: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0M12 17v-5M10 14l2-2 2 2"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h3M21 17v4h-4"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><rect x="7" y="14" width="10" height="7"/>',
  chart: '<path d="M4 20V4M4 20h16"/><rect x="7" y="12" width="3" height="5"/><rect x="12" y="8" width="3" height="9"/><rect x="17" y="5" width="3" height="12"/>',
  logout: '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>',
  fire: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.5 2-5 1 1.5 2 2 2 2s-.5-4 1-7z"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>'
};
const ic = (n, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;
function foodIcon(name, cat = '') {
  const s = (name + ' ' + cat).toLowerCase();
  if (/minum|teh|kopi|milo|limau|bandung|sirap|peng|jus|air /.test(s)) return 'cup';
  if (/mee|kuey|maggi|soto|bihun|laksa/.test(s)) return 'noodle';
  if (/roti|set|bakar|kukus|tosai/.test(s)) return 'bread';
  if (/cendol|pencuci|kuih|aiskrim|abc/.test(s)) return 'dessert';
  if (/nasi|lemak|kandar/.test(s)) return 'bowl';
  return 'plate';
}
const thumb = (name, { img = null, icon = null, cls = '' } = {}) =>
  `<div class="thumb ${cls}" style="--h:${hue(name)}">${safeUrl(img) ? `<img src="${esc(safeUrl(img))}" alt="" loading="lazy">` : ic(icon || foodIcon(name), '')}</div>`;
const userName = (u) => (u && (u.user_metadata?.full_name || u.user_metadata?.name || (u.email || '').split('@')[0])) || '';
const G_LOGO = '<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>';
const googleBtn = (label = 'Teruskan dengan Google') => `<button type="button" class="btn lg block gbtn" data-google>${G_LOGO}<span>${esc(label)}</span></button>`;
const emptyState =(icon, html) => `<div class="empty">${ic(icon)}<div>${html}</div></div>`;
const loading = (text = 'Memuatkan…') => `<div class="loading"><span class="spin"></span>${text}</div>`;

let toastT;
function toast(msg, kind = 'ok') {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.className = 'toast ' + kind;
  el.innerHTML = ic(kind === 'err' ? 'alert' : 'check') + `<span>${esc(msg)}</span>`;
  el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), kind === 'err' ? 4500 : 2600);
}
function buzz() { try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} }

let lastFocus;
function sheet(html, { keepScroll = false, wide = false } = {}) {
  let layer = $('#layer');
  if (!layer) { layer = document.createElement('div'); layer.id = 'layer'; document.body.appendChild(layer); }
  const prev = keepScroll ? $('.sheet', layer)?.scrollTop : 0;
  if (!layer.innerHTML) lastFocus = document.activeElement;
  layer.innerHTML = `<div class="overlay" data-close-overlay><div class="sheet ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
  const sh = $('.sheet', layer);
  if (prev) sh.scrollTop = prev; else $('.x', sh)?.focus({ preventScroll: true });
  document.body.style.overflow = 'hidden';
  return sh;
}
function closeSheet() {
  const layer = $('#layer'); if (!layer || !layer.innerHTML) return;
  layer.innerHTML = ''; document.body.style.overflow = '';
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}
const sheetHead = (title, sub = '') => `<div class="sheet-head"><div>${sub ? `<p class="eyebrow">${esc(sub)}</p>` : ''}<h2>${title}</h2></div><button class="x" data-close aria-label="Tutup">${ic('x')}</button></div>`;
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) closeSheet();
  else if (e.target.matches('[data-close-overlay]')) closeSheet();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

// Kecilkan gambar sebelum muat naik supaya laju dan jimat storan percuma
function imageToBlob(file, max = 900, quality = 0.8) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, max / Math.max(im.width, im.height));
        const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
        c.toBlob((b) => (b ? res(b) : rej(new Error('Gambar tidak dapat diproses'))), 'image/jpeg', quality);
      };
      im.onerror = () => rej(new Error('Fail ini bukan gambar yang sah'));
      im.src = r.result;
    };
    r.onerror = () => rej(new Error('Gambar tidak dapat dibaca'));
    r.readAsDataURL(file);
  });
}

/* =====================================================================
   AKAUN: log masuk Google sahaja, email mesti disahkan. Satu akaun untuk
   semua: setiap orang ialah pengguna (percuma), dan dengan email yang sama
   boleh mohon jadi Partner Lapar Ek? dan/atau Partner Marketplace. Dashboard
   partner hanya dibuka selepas permohonan diluluskan admin.
   ===================================================================== */
P.market = P.market || '<path d="M3 7h18l-1.5 12a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z"/><path d="M8 7a4 4 0 0 1 8 0"/>';
// Jenis partner yang dipaparkan sebagai ikon di tepi profil selepas diluluskan
const VENDORS = {
  lapar:  { label: 'Partner Lapar Ek?', icon: 'bowl', h: 30, page: 'peniaga.html', join: 'Mohon jadi Partner Lapar Ek?', joinDesc: 'Untuk kedai makan. Selepas diluluskan: urus menu, terima order dine-in & pickup, QR meja.' },
  market: { label: 'Partner Marketplace', icon: 'market', h: 200, page: 'penyedia.html', join: 'Mohon jadi Partner Marketplace', joinDesc: 'Untuk ejen & servis. Selepas diluluskan: urus listing dan balas permintaan sebut harga.' }
};
const Auth = {
  user: null, profile: null, admin: false, blocked: null, shop: null, provider: null,
  async load() {
    this.user = await api.getUser();
    if (this.user && !api.emailVerified(this.user)) { this.blocked = this.user.email; await api.signOut(); this.user = null; }
    if (!this.user) { this.profile = null; this.admin = false; this.shop = null; this.provider = null; return this; }
    const soft = (p, d) => p.catch(() => d);
    [this.profile, this.admin, this.shop, this.provider] = await Promise.all([
      soft(api.getProfile(), null), soft(api.isAdmin(), false), soft(api.myShop(), null), soft(api.myProvider(), null)]);
    // Akaun baru: profil dicipta terus sebagai pengguna (tiada langkah pilih jenis akaun)
    if (!this.profile) this.profile = await soft(api.saveProfile({ role: 'user', name: this.name() }), null);
    return this;
  },
  // Partner yang sudah diluluskan: ['lapar', 'market']
  vendors() { return [['lapar', this.shop], ['market', this.provider]].filter(([, r]) => r?.status === 'lulus').map(([key]) => key); },
  name() { return this.profile?.name || this.user?.user_metadata?.full_name || (this.user?.email || '').split('@')[0] || ''; }
};
const authChanged = () => document.dispatchEvent(new CustomEvent('auth-changed'));

// Panggil sekali semasa page dibuka
async function initAuth() {
  await Auth.load();
  if (Auth.blocked) showUnverified(Auth.blocked);
  renderAccountBtn();
  return Auth;
}
const avatarHTML = (cls = 'avatar', style = '') => {
  const pic = Auth.user?.user_metadata?.avatar_url;
  return `<span class="${cls}" style="${style}">${pic ? `<img src="${esc(safeUrl(pic))}" alt="" referrerpolicy="no-referrer">` : esc((Auth.name()[0] || '?').toUpperCase())}</span>`;
};
// Butang profil: avatar pengguna, dengan ikon partner di tepi selepas diluluskan
function renderAccountBtn() {
  const b = $('#accountBtn'); if (!b) return;
  if (Auth.user) {
    const vs = Auth.vendors();
    b.className = 'acct' + (vs.length ? ' has-vendor' : '');
    b.setAttribute('aria-label', 'Akaun: ' + Auth.name() + (vs.length ? ' · ' + vs.map(k => VENDORS[k].label).join(', ') : ''));
    b.innerHTML = vs.map(k => `<span class="vb vb-${k}" title="${esc(VENDORS[k].label)}">${ic(VENDORS[k].icon)}</span>`).join('') + avatarHTML();
  } else { b.className = 'btn sm pri'; b.removeAttribute('aria-label'); b.textContent = 'Log masuk'; }
}
function startGoogle(returnTo) {
  window.beforeGoogle && window.beforeGoogle();
  if (api.mode === 'demo') return openDemoChooser(returnTo);
  api.signInWithGoogle(returnTo || location.href).catch(e => toast(e.message, 'err'));
}
function openLogin(returnTo, title = 'Log masuk') {
  sheet(`${sheetHead(esc(title))}
    <div class="stack" style="justify-items:center;text-align:center;gap:8px">
      <div class="thumb lg" style="--h:150">${ic('store', '')}</div>
      <p class="muted" style="max-width:40ch">Satu akaun Segamat Kita untuk pengguna, kedai makan Lapar Ek? dan penyedia servis Marketplace.</p></div>
    <button class="btn lg block gbtn" data-google ${returnTo ? `data-return="${esc(returnTo)}"` : ''}>${G_LOGO}<span>Teruskan dengan Google</span></button>
    <p class="small muted" style="text-align:center">Hanya akaun Google dengan <b>email yang disahkan</b> boleh log masuk.</p>`);
}
function openDemoChooser(returnTo) {
  sheet(`${sheetHead('Pilih akaun Google', 'Mod demo')}
    <p class="small muted">Simulasi skrin Google. Dalam versi sebenar, skrin Google yang asli dibuka.</p>
    <div class="list">${api.demoAccounts.map((a, i) => `<button class="item gacc" data-demo-acc="${i}" ${returnTo ? `data-return="${esc(returnTo)}"` : ''}><span class="avatar" style="pointer-events:none">${esc(a.name[0])}</span><span class="body" style="text-align:left"><b>${esc(a.name)}</b><span class="small muted">${esc(a.email)}${a.verified ? '' : ' · email belum disahkan'}</span></span></button>`).join('')}</div>`);
}
function showUnverified(email) {
  sheet(`${sheetHead('Email belum disahkan')}
    <div class="err" style="display:grid;gap:4px"><b>${esc(email)}</b><span>Akaun ini belum mengesahkan alamat email. Sahkan email anda di tetapan akaun Google, kemudian cuba log masuk semula.</span></div>
    ${googleBtn('Guna akaun Google lain')}`);
}
function openAccount() {
  if (!Auth.user) return openLogin();
  // Setiap jenis partner: buka dashboard (lulus), lihat permohonan (menunggu/ditolak), atau mohon
  const vendorRow = (key, rec) => {
    const v = VENDORS[key];
    const [title, pill, sub] = !rec ? [v.join, '', v.joinDesc]
      : rec.status === 'lulus' ? [v.label, '<span class="pill ok">Aktif</span>', esc(rec.name) + ' · Buka dashboard']
      : rec.status === 'tolak' ? ['Permohonan ' + v.label, '<span class="pill bad">Ditolak</span>', 'Lihat sebab dan mohon semula']
      : ['Permohonan ' + v.label, '<span class="pill warn">Menunggu kelulusan</span>', esc(rec.name) + ' · Lihat permohonan'];
    return `<a class="item vrow" href="${v.page}"><span class="thumb sm" style="--h:${v.h}">${ic(v.icon, '')}</span>
      <span class="body"><span class="row between nowrap"><b>${title}</b>${pill}</span><span class="small muted">${sub}</span></span>${ic('arrow')}</a>`;
  };
  const vs = Auth.vendors();
  sheet(`${sheetHead('Akaun saya')}
    <div class="row nowrap">${avatarHTML('avatar', 'width:52px;height:52px;font-size:20px')}
      <div class="stack" style="gap:0;min-width:0"><b>${esc(Auth.name())}</b><span class="small muted">${esc(Auth.user.email)}</span><span class="small" style="color:var(--ok);font-weight:700">✓ Email disahkan</span></div></div>
    <div class="stack" style="gap:8px"><span class="small muted">${vs.length ? 'Anda pengguna dan juga ' + vs.map(k => VENDORS[k].label).join(' dan ') + '.' : 'Akaun pengguna adalah percuma. Untuk jual di Lapar Ek? atau Marketplace, mohon jadi partner. Admin akan semak permohonan anda.'}</span>
      <div class="list">${vendorRow('lapar', Auth.shop)}${vendorRow('market', Auth.provider)}</div></div>
    <div class="stack">
      ${Auth.admin ? `<a class="btn acc block" href="admin.html">Panel admin</a>` : ''}
      <a class="btn block" href="lapar.html?orders">Order makan saya</a>
      <a class="btn block" href="index.html#info">Hantaran info saya</a>
      <button class="btn block danger" data-logout>Log keluar</button></div>`);
}
document.addEventListener('click', async (e) => {
  const g = e.target.closest('[data-google]');
  if (g) { e.preventDefault(); startGoogle(g.dataset.return || location.href); return; }
  const da = e.target.closest('[data-demo-acc]');
  if (da) { da.disabled = true; await api.signInWithGoogle(da.dataset.return || location.href, api.demoAccounts[+da.dataset.demoAcc]); return; }
  if (e.target.closest('#accountBtn')) { Auth.user ? openAccount() : openLogin(); return; }
  if (e.target.closest('[data-logout]')) { await api.signOut(); closeSheet(); Object.assign(Auth, { user: null, profile: null, admin: false, shop: null, provider: null }); renderAccountBtn(); toast('Anda telah log keluar'); authChanged(); return; }
});

function demoBanner() {
  if (!window.api) {
    document.body.insertAdjacentHTML('afterbegin', `<div class="banner bad"><div class="wrap">${ic('alert')}<span><b>Tidak dapat sambung ke database.</b> Pustaka Supabase gagal dimuat. Semak sambungan internet dan muat semula page.</span></div></div>`);
    return false;
  }
  if (api.mode === 'demo') {
    document.body.insertAdjacentHTML('afterbegin', `<div class="banner"><div class="wrap"><span><b>Mod demo.</b> Data disimpan dalam pelayar ini sahaja. Isi <code>config.js</code> untuk guna Supabase.</span><button class="btn sm ghost" id="demoReset">Set semula data demo</button></div></div>`);
    $('#demoReset').onclick = () => { api.reset(); Object.keys(localStorage).filter(k => k.startsWith('laparek-')).forEach(store.del); location.reload(); };
  }
  return true;
}
