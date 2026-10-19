// E2E pembina halaman bisnes (bina.html → l.html) — MOD DEMO sahaja.
//
//   node scripts/e2e-landing.mjs
//
// config.js tidak diubah: ujian ini memintas permintaan config.js dengan
// konfigurasi kosong, jadi api.js memilih demoApi() (localStorage) dan Supabase
// langsung tidak diperlukan. CDN Supabase dan Google Fonts juga distub supaya
// ujian bersih daripada ralat rangkaian.
//
// Playwright diambil dari projek ini, atau dari projek jiran (../lepakmamak).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'artifacts');
const require = createRequire(import.meta.url);

function loadPlaywright() {
  for (const t of ['playwright', path.join(ROOT, 'node_modules', 'playwright'), path.join(ROOT, '..', 'lepakmamak', 'node_modules', 'playwright')]) {
    try { return require(t); } catch (e) { /* cuba lokasi seterusnya */ }
  }
  throw new Error('Playwright tidak dijumpai. Jalankan: npm i -D playwright && npx playwright install chromium');
}

const DEMO_CONFIG = `window.LAPAR_CONFIG = {
  SUPABASE_URL: '', SUPABASE_ANON_KEY: '',
  APP_NAME: 'Segamat Kita', CONTACT: '',
  AREAS: ['Bandar Segamat','Buloh Kasap','Jementah','Labis','Chaah','Batu Anam','Bekok','Genuang']
};`;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

// Laluan cantik yang dihidangkan oleh l.html (sama dengan netlify.toml)
const PRETTY = /^\/l(?:\/[^/?#]+)?\/?$/;

function serve() {
  // Emulasi netlify.toml: /l/* → /l.html (status 200, URL tidak berubah)
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/favicon.ico') return res.writeHead(204).end();
    const target = PRETTY.test(p) ? '/l.html' : (p.endsWith('/') ? p + 'index.html' : p);
    const file = path.join(ROOT, target);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      return res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found');
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

const checks = [];
function ok(cond, msg) {
  checks.push({ ok: !!cond, msg });
  if (!cond) throw new Error('GAGAL: ' + msg);
}

const problems = [];
function watch(page, label) {
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${label}] console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[${label}] pageerror: ${e.message}`));
}

async function stub(ctx) {
  // Atribut integrity pada CDN Supabase dibuang dalam ujian supaya stub di bawah
  // boleh dimuatkan; dalam produksi fail CDN sebenar digunakan dengan hash asal.
  await ctx.route((u) => u.pathname.endsWith('.html') || u.pathname === '/' || PRETTY.test(u.pathname), async (route) => {
    const res = await route.fetch();
    const body = (await res.text()).replace(/\s+integrity="[^"]*"/g, '');
    const headers = { ...res.headers() };
    delete headers['content-length'];
    headers['content-type'] = 'text/html; charset=utf-8';
    await route.fulfill({ status: res.status(), headers, body });
  });
  await ctx.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: DEMO_CONFIG }));
  await ctx.route('**/supabase.min.js', (r) => r.fulfill({ contentType: 'text/javascript', body: '/* stubbed dalam e2e */' }));
  await ctx.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: '' }));
  await ctx.route('**/fonts.gstatic.com/**', (r) => r.fulfill({ status: 204, body: '' }));
}

const shot = async (page, name) => {
  const p = path.join(OUT, name);
  await page.screenshot({ path: p, fullPage: true });
  return p;
};

async function text(page, sel) {
  const el = await page.$(sel);
  return el ? (await el.innerText()) : '';
}
const overflow = (page) => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));

// 1x1 PNG untuk ujian muat naik
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const { chromium } = loadPlaywright();
  const server = await serve();
  const BASE = 'http://127.0.0.1:' + server.address().port;
  const shots = [];
  let browser;

  try {
    browser = await chromium.launch();
    // Konteks pemilik: 1440px desktop
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await stub(ctx);
    const page = await ctx.newPage();
    watch(page, 'bina');

    // ---------- 1. Gerbang log masuk ----------
    await page.goto(BASE + '/bina.html', { waitUntil: 'load' });
    await page.waitForSelector('[data-google]', { timeout: 15000 });
    ok((await text(page, 'h1')).includes('Bina halaman bisnes'), 'bina.html wajib log masuk dahulu');
    await page.click('[data-google]');
    await page.waitForSelector('.gacc');
    await page.click('.gacc >> nth=0'); // Pengguna Demo
    await page.waitForSelector('#bBrand', { timeout: 20000 });
    ok(await page.isVisible('#pvIframe'), 'borang + panel pratonton dibuka selepas log masuk');

    // ---------- 2. Isi borang ----------
    await page.fill('#bBrand', 'Kedai Kopi Segamat');
    await page.fill('#bTagline', 'Kopi kampung, dibancuh segar setiap pagi');
    await page.fill('#bAbout', 'Kami membancuh kopi tempatan sejak 2009.\nBuka setiap hari 7 pagi hingga 11 malam.');
    await page.fill('#bWa', '012-700 1234');
    await page.selectOption('#bArea', 'Bandar Segamat');
    await page.$eval('#bAccent', (el) => { el.value = '#b45309'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.$eval('input[name="tpl"][value="bold"]', (el) => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
    ok((await page.inputValue('#bSlug')) === 'kedai-kopi-segamat', 'slug dibina automatik daripada nama bisnes');

    // Logo
    await page.setInputFiles('#bLogo', { name: 'logo.png', mimeType: 'image/png', buffer: PNG });
    await page.waitForSelector('#logoClear:visible', { timeout: 15000 });
    ok(true, 'logo dimuat naik (mod demo: data URL)');

    // ---------- 3. Dua produk ----------
    await page.click('#addProd');
    await page.fill('[data-pi="0"] [data-f="name"]', 'Kopi Kampung');
    await page.fill('[data-pi="0"] [data-f="price"]', '3.50');
    await page.fill('[data-pi="0"] [data-f="desc"]', 'Kopi hitam pekat, ais atau panas.');
    await page.setInputFiles('[data-pi="0"] input[data-f="file"]', { name: 'kopi.png', mimeType: 'image/png', buffer: PNG });
    await page.waitForFunction(() => !!document.querySelector('[data-pi="0"] .pthumb img'), null, { timeout: 15000 });
    await page.click('#addProd');
    await page.fill('[data-pi="1"] [data-f="name"]', 'Roti Bakar');
    await page.fill('[data-pi="1"] [data-f="price"]', 'RM 2');
    await page.fill('[data-pi="1"] [data-f="desc"]', 'Roti bakar kaya dan mentega.');
    ok((await page.$$('[data-pi]')).length === 2, 'dua produk ditambah');

    // ---------- 4. Pratonton hidup ----------
    await page.waitForFunction(() => {
      const f = document.querySelector('#pvIframe'); const d = f && f.contentDocument;
      return !!(d && d.querySelector('.lp-brand') && d.querySelector('.lp-brand').textContent.includes('Kedai Kopi Segamat'));
    }, null, { timeout: 15000 });
    let pv = await page.frameLocator('#pvIframe').locator('.lp').innerText();
    ok(pv.includes('Kedai Kopi Segamat'), 'pratonton: nama bisnes');
    ok(pv.includes('Kopi kampung'), 'pratonton: tagline');
    ok(pv.includes('Kopi Kampung') && pv.includes('Roti Bakar'), 'pratonton: dua produk');
    ok(pv.includes('RM 3.50'), 'pratonton: harga diformat');
    ok(pv.includes('Bandar Segamat'), 'pratonton: kawasan');
    ok((await page.frameLocator('#pvIframe').locator('.lp').getAttribute('class')).includes('tpl-bold'), 'pratonton: template bold dipilih');
    ok((await page.frameLocator('#pvIframe').locator('.lp-mark img').count()) === 1, 'pratonton: logo dipaparkan');

    // Toggle desktop / telefon
    await page.click('[data-dev="desktop"]');
    await page.waitForFunction(() => document.querySelector('#pvIframe').style.width === '1024px', null, { timeout: 10000 });
    ok((await page.$eval('#pvFrame', (el) => el.dataset.dev)) === 'desktop', 'pratonton: mod desktop 1024px');
    await page.waitForTimeout(350);
    shots.push(await shot(page, 'bina-1440.png'));
    await page.click('[data-dev="mobile"]');
    await page.waitForFunction(() => document.querySelector('#pvIframe').style.width === '390px', null, { timeout: 10000 });
    ok(true, 'pratonton: mod telefon 390px');

    // ---------- 5. Simpan draf ----------
    await page.click('#saveDraft');
    await page.waitForFunction(() => !document.querySelector('#viewBtn').disabled, null, { timeout: 15000 });
    ok((await text(page, '#statusPill')).trim() === 'Draf', 'Simpan draf: status kekal draf');
    const slug = await page.inputValue('#bSlug');

    // Draf: pemilik nampak, orang awam tidak (mirror RLS). Demo mode menyimpan
    // data dalam localStorage konteks ini, jadi "orang awam" = sesi log keluar.
    const pub = await ctx.newPage(); watch(pub, 'awam');
    await pub.goto(BASE + '/l.html?s=' + slug, { waitUntil: 'load' });
    await pub.waitForSelector('.lp-note', { timeout: 15000 });
    ok((await text(pub, '.lp-note')).includes('belum diterbitkan'), 'pemilik nampak draf dengan notis pratonton');

    const ukey = await pub.evaluate(() => localStorage.getItem('segamatkita-demo-user'));
    ok(!!ukey, 'sesi demo disimpan dalam localStorage');
    await pub.evaluate(() => localStorage.removeItem('segamatkita-demo-user'));
    await pub.reload({ waitUntil: 'load' });
    await pub.waitForSelector('.lp-404', { timeout: 15000 });
    ok(true, 'orang awam tidak nampak draf (404) — mirror RLS');
    await pub.evaluate((v) => localStorage.setItem('segamatkita-demo-user', v), ukey);

    // ---------- 6. Terbitkan ----------
    await page.click('#publishBtn');
    await page.waitForFunction(() => (document.querySelector('#statusPill') || {}).textContent === 'Diterbitkan', null, { timeout: 15000 });
    ok(true, 'Terbitkan: status jadi Diterbitkan');
    ok((await text(page, '#liveUrl')).includes(slug), 'pautan awam dipaparkan selepas terbit');
    ok(!(await page.isDisabled('#viewBtn')) && !(await page.isDisabled('#copyBtn')), 'butang Lihat + Salin pautan aktif');

    // ---------- 7. Halaman awam ----------
    const landing = await ctx.newPage(); watch(landing, 'l');
    await landing.setViewportSize({ width: 1440, height: 900 });
    await landing.goto(BASE + '/l.html?s=' + slug, { waitUntil: 'load' });
    await landing.waitForSelector('.lp-brand', { timeout: 15000 });
    const lp = await landing.locator('.lp').innerText();
    ok(lp.includes('Kedai Kopi Segamat'), 'l.html: hero nama bisnes');
    ok(lp.includes('Kopi kampung'), 'l.html: tagline');
    ok(lp.toLowerCase().includes('tentang'), 'l.html: seksyen tentang');
    ok(lp.includes('Kopi Kampung') && lp.includes('Roti Bakar'), 'l.html: grid produk');
    ok(lp.includes('RM 3.50') && lp.includes('RM 2.00'), 'l.html: harga produk');
    ok(lp.includes('Segamat Kita'), 'l.html: footer');
    ok(!lp.includes('Pratonton draf'), 'l.html: tiada notis draf untuk halaman terbit');
    ok((await landing.title()).includes('Kedai Kopi Segamat'), 'l.html: document.title');
    const desc = await landing.getAttribute('meta[name="description"]', 'content');
    ok(!!desc && desc.length > 10, 'l.html: meta description diisi');
    ok((await landing.$('meta[name="robots"]')) === null, 'l.html: tiada noindex untuk halaman terbit');
    const waHref = await landing.getAttribute('.lp-hero a.lp-btn-a', 'href');
    ok(waHref.startsWith('https://wa.me/60127001234'), 'l.html: butang WhatsApp ke nombor betul');
    ok(decodeURIComponent(waHref).includes('Kedai Kopi Segamat'), 'l.html: mesej WhatsApp ada nama bisnes');
    ok((await landing.locator('.lp-hero .lp-mark img').count()) === 1, 'l.html: logo dipaparkan');
    ok((await landing.getAttribute('.lp', 'class')).includes('tpl-bold'), 'l.html: template bold');
    const accent = await landing.evaluate(() => getComputedStyle(document.querySelector('.lp')).getPropertyValue('--lp-a').trim());
    ok(accent.toLowerCase() === '#b45309', 'l.html: warna aksen digunakan');

    // Screenshot + overflow template bold
    await landing.setViewportSize({ width: 390, height: 844 });
    await landing.waitForTimeout(300);
    let ov = await overflow(landing);
    ok(ov.sw <= ov.iw + 1, `l.html (bold) tiada overflow pada 390px (${ov.sw} <= ${ov.iw})`);
    shots.push(await shot(landing, 'landing-bold-390.png'));
    await landing.setViewportSize({ width: 1440, height: 900 });
    await landing.waitForTimeout(300);
    shots.push(await shot(landing, 'landing-bold-1440.png'));

    // ---------- 7b. Template minimal ----------
    await page.$eval('input[name="tpl"][value="minimal"]', (el) => { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForTimeout(400);
    ok((await page.frameLocator('#pvIframe').locator('.lp').getAttribute('class')).includes('tpl-minimal'), 'pratonton: tukar ke template minimal');
    await page.click('#publishBtn');
    await page.waitForFunction((s) => {
      try {
        const d = JSON.parse(localStorage.getItem('segamatkita-demo-v1'));
        return (d.landing || []).some((r) => r.slug === s && r.template === 'minimal' && r.status === 'published');
      } catch (e) { return false; }
    }, slug, { timeout: 15000 });
    await landing.reload({ waitUntil: 'load' });
    await landing.waitForSelector('.lp-brand', { timeout: 15000 });
    ok((await landing.getAttribute('.lp', 'class')).includes('tpl-minimal'), 'l.html: template minimal selepas terbit semula');
    ok((await landing.getAttribute('.lp', 'class')).includes('tpl-bold') === false, 'l.html: template lama tidak tertinggal');
    await landing.setViewportSize({ width: 1440, height: 900 });
    await landing.waitForTimeout(300);
    shots.push(await shot(landing, 'landing-minimal-1440.png'));

    // Orang awam (log keluar) kini nampak halaman terbit
    await pub.evaluate(() => localStorage.removeItem('segamatkita-demo-user'));
    await pub.reload({ waitUntil: 'load' });
    await pub.waitForSelector('.lp-brand', { timeout: 15000 });
    ok(true, 'halaman terbit kelihatan tanpa log masuk');

    // Overflow 390 (template minimal)
    await landing.setViewportSize({ width: 390, height: 844 });
    await landing.waitForTimeout(300);
    ov = await overflow(landing);
    ok(ov.sw <= ov.iw + 1, `l.html (minimal) tiada overflow pada 390px (${ov.sw} <= ${ov.iw})`);
    shots.push(await shot(landing, 'landing-minimal-390.png'));

    // ---------- 8. 404 ----------
    const miss = pub;
    await miss.setViewportSize({ width: 390, height: 844 });
    await miss.goto(BASE + '/l.html?s=slug-yang-tiada', { waitUntil: 'load' });
    await miss.waitForSelector('.lp-404', { timeout: 15000 });
    ok((await text(miss, 'h1')).includes('tidak dijumpai'), '404: mesej jelas untuk slug tiada');
    ok((await miss.textContent('.lp-404')).includes('/l/slug-yang-tiada'), '404: pautan yang diminta dipaparkan');
    ok((await miss.title()).includes('tidak dijumpai'), '404: document.title');
    ov = await overflow(miss);
    ok(ov.sw <= ov.iw + 1, `404 tiada overflow pada 390px (${ov.sw} <= ${ov.iw})`);
    shots.push(await shot(miss, '404-390.png'));

    // ---------- 8b. Laluan cantik /l/<slug> (netlify.toml rewrite) ----------
    await pub.goto(BASE + '/l/' + slug, { waitUntil: 'load' });
    await pub.waitForSelector('.lp-brand', { timeout: 15000 });
    ok((await text(pub, '.lp-brand')).includes('Kedai Kopi Segamat'), 'rewrite /l/<slug>: slug dibaca daripada laluan');
    const prettyAccent = await pub.locator('.lp').evaluate((el) => getComputedStyle(el).getPropertyValue('--lp-a').trim());
    ok(prettyAccent.toLowerCase() === '#b45309', 'rewrite /l/<slug>: CSS dimuatkan (aset path root-absolute)');

    // ---------- 9. bina.html pada 390px ----------
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    ov = await overflow(page);
    ok(ov.sw <= ov.iw + 1, `bina.html tiada overflow pada 390px (${ov.sw} <= ${ov.iw})`);
    shots.push(await shot(page, 'bina-390.png'));

    // ---------- 10. Tiada ralat konsol ----------
    ok(problems.length === 0, 'tiada ralat konsol / pageerror' + (problems.length ? ': ' + problems.join(' | ') : ''));

    // ---------- Laporan ----------
    console.log('\n=== E2E halaman bisnes (mod demo) ===');
    for (const c of checks) console.log((c.ok ? 'PASS' : 'FAIL') + ' · ' + c.msg);
    console.log(`\n${checks.filter(c => c.ok).length}/${checks.length} semakan lulus`);
    console.log('Screenshot:');
    for (const s of shots) console.log('  ' + s);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error('\n' + (e && e.message ? e.message : e));
  for (const c of checks) console.log((c.ok ? 'PASS' : 'FAIL') + ' · ' + c.msg);
  if (problems.length) { console.error('\nRalat konsol:'); problems.forEach((p) => console.error('  ' + p)); }
  process.exit(1);
});
