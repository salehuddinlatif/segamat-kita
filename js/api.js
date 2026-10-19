// Lapisan data Segamat Kita. Semua page bercakap dengan `api` sahaja.
// Dua pelaksanaan dengan fungsi yang sama:
//   supabaseApi() — data sebenar di Supabase
//   demoApi()     — data dalam localStorage, untuk cuba tanpa akaun
(function () {
  const C = window.LAPAR_CONFIG;
  const TABLE = { post: 'posts', job: 'jobs', shop: 'shops', provider: 'providers', listing: 'listings', verify: 'verify_requests' };
  const today = () => new Date().toISOString().slice(0, 10);
  // Medan yang perlu kelulusan admin bila diubah (sama dengan guard_shop()/guard_menu() dalam schema.sql)
  const SHOP_KEYS = ['name', 'area', 'cuisine', 'hours', 'phone', 'description', 'address', 'duitnow_url'];
  const ITEM_KEYS = ['category', 'name', 'description', 'price', 'image_url', 'options'];
  // Medan semakan yang tidak dihantar oleh pemilik (diurus oleh server)
  const REVIEW_COLS = ['status', 'reason', 'pending', 'pending_at', 'pending_reason'];
  const strip = (o, extra = []) => Object.fromEntries(Object.entries(o).filter(([k]) => !REVIEW_COLS.includes(k) && !extra.includes(k)));

  function friendly(err) {
    const m = (err && (err.message || err.error_description)) || String(err);
    if (/rate limit/i.test(m)) return 'Terlalu banyak cubaan. Tunggu sebentar dan cuba lagi.';
    if (/shops_slug_key|duplicate key.*slug/i.test(m)) return 'Pautan kedai ini sudah diambil. Cuba nama lain.';
    if (/shops_owner_key/i.test(m)) return 'Akaun ini sudah ada kedai.';
    if (/providers_owner_key/i.test(m)) return 'Akaun ini sudah didaftarkan sebagai penyedia servis.';
    if (/row-level security|violates row-level/i.test(m)) return 'Anda tiada kebenaran untuk tindakan ini. Pastikan anda log masuk dengan akaun yang betul.';
    if (/violates check constraint/i.test(m)) return 'Sebahagian maklumat tidak sah atau terlalu panjang. Semak semula dan cuba lagi.';
    if (/mime type|exceeded the maximum allowed size|payload too large/i.test(m)) return 'Gambar tidak diterima. Guna gambar JPEG/PNG bawah 3MB.';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'Tiada sambungan internet. Cuba lagi.';
    return m;
  }
  const emailVerified = (u) => !!u && (u.user_metadata?.email_verified === true || !!u.email_confirmed_at);

  // ==================================================================
  function supabaseApi() {
    const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } });
    const un = ({ data, error }) => { if (error) throw new Error(friendly(error)); return data; };
    // Selepas balik dari Google, buang ?code=... dari alamat supaya tak diproses dua kali
    const ready = sb.auth.getSession().finally(() => {
      const u = new URL(location.href);
      if (u.searchParams.has('code') || u.searchParams.has('error_description')) {
        const e = u.searchParams.get('error_description');
        ['code', 'error', 'error_code', 'error_description'].forEach(k => u.searchParams.delete(k));
        history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
        if (e) setTimeout(() => window.toast && toast('Log masuk Google gagal: ' + e, 'err'), 300);
      }
    });
    const uploadTo = async (bucket, blob, ext = 'jpg') => {
      const u = await api.getUser();
      const path = `${u.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      un(await sb.storage.from(bucket).upload(path, blob, { contentType: blob.type || 'image/jpeg' }));
      return path;
    };
    const emailsFor = async (ids) => {
      ids = [...new Set(ids.filter(Boolean))]; if (!ids.length) return {};
      const rows = un(await sb.from('profiles').select('id,email,name').in('id', ids));
      return Object.fromEntries(rows.map(r => [r.id, r]));
    };

    const api = {
      mode: 'supabase',
      emailVerified,
      // ---------- akaun ----------
      async getUser() { await ready; const { data } = await sb.auth.getSession(); return data.session ? data.session.user : null; },
      async signInWithGoogle(returnTo) {
        un(await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: returnTo || location.href, queryParams: { prompt: 'select_account' } } }));
      },
      async signOut() { await sb.auth.signOut(); },
      async getProfile() {
        const u = await this.getUser(); if (!u) return null;
        return un(await sb.from('profiles').select('*').eq('id', u.id).maybeSingle());
      },
      async saveProfile(d) {
        const u = await this.getUser();
        // Profil hanya dicipta sekali (insert); email dan jenis akaun dikunci di database
        const row = { id: u.id, email: u.email, name: String(d.name ?? (u.user_metadata?.full_name || u.email.split('@')[0])).slice(0, 80), role: d.role };
        return un(await sb.from('profiles').insert(row).select().single());
      },
      async isAdmin() { const u = await this.getUser(); if (!u) return false; return !!un(await sb.rpc('is_admin')); },

      // ---------- Lapar Ek? ----------
      async listShops() {
        return un(await sb.from('shops').select('id,slug,name,area,cuisine,hours,prep_min,is_open,phone').eq('status', 'lulus').order('is_open', { ascending: false }).order('name'));
      },
      async getShopBySlug(slug) { return un(await sb.from('shops').select('*').eq('slug', slug).maybeSingle()); },
      async myShop() {
        const u = await this.getUser(); if (!u) return null;
        return un(await sb.from('shops').select('*').eq('owner', u.id).maybeSingle());
      },
      // Hanya nampak kedai yang dibenarkan RLS; pautan kedai lain yang belum diluluskan
      // ditangkap oleh ralat "unique" semasa createShop (mesej mesra dalam friendly()).
      async slugTaken(slug) { return un(await sb.from('shops').select('id').eq('slug', slug)).length > 0; },
      async createShop(d) { const u = await this.getUser(); return un(await sb.from('shops').insert({ ...d, owner: u.id }).select().single()); },
      async updateShop(id, d) { return un(await sb.from('shops').update(strip(d, ['id', 'owner', 'slug', 'created_at'])).eq('id', id).select().single()); },
      async cancelShopChange(id) { return un(await sb.from('shops').update({ pending: null }).eq('id', id).select().single()); },
      async getMenu(shopId) { return un(await sb.from('menu_items').select('*').eq('shop_id', shopId).order('sort').order('created_at')); },
      async saveItem(it) {
        const { id } = it, rest = strip(it, ['id', 'created_at']);
        if (id) return un(await sb.from('menu_items').update(rest).eq('id', id).select().single());
        return un(await sb.from('menu_items').insert(rest).select().single());
      },
      async cancelItemChange(id) { return un(await sb.from('menu_items').update({ pending: null }).eq('id', id).select().single()); },
      async deleteItem(id) { un(await sb.from('menu_items').delete().eq('id', id)); },
      async uploadImage(blob) { const path = await uploadTo('images', blob); return sb.storage.from('images').getPublicUrl(path).data.publicUrl; },
      async placeOrder(p) {
        const d = un(await sb.rpc('place_order', {
          p_shop: p.shop_id, p_type: p.type, p_table: p.table || null, p_pickup: p.pickup || null,
          p_name: p.name, p_phone: p.phone || null, p_note: p.note || null, p_pay: p.pay, p_items: p.items
        }));
        const r = Array.isArray(d) ? d[0] : d;
        return { id: r.order_id, token: r.order_token };
      },
      async getOrder(token) { return un(await sb.rpc('get_order', { p_token: token })); },
      async myOrders() {
        const u = await this.getUser(); if (!u) return [];
        return un(await sb.from('orders').select('*, shop:shops(name,slug,phone,duitnow_url,prep_min)').eq('customer_id', u.id).order('created_at', { ascending: false }).limit(30));
      },
      async listOrders(shopId, sinceISO) {
        return un(await sb.from('orders').select('*').eq('shop_id', shopId).gte('created_at', sinceISO).order('created_at', { ascending: false }).limit(2000));
      },
      async setOrderStatus(id, status) { un(await sb.from('orders').update({ status }).eq('id', id)); },
      subscribeOrders(shopId, cb) {
        const ch = sb.channel('orders-' + shopId)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: 'shop_id=eq.' + shopId }, (p) => cb(p.eventType))
          .subscribe();
        return () => sb.removeChannel(ch);
      },

      // ---------- Info ----------
      async listPosts() { return un(await sb.from('posts').select('id,tag,title,body,area,image_url,author_name,created_at').eq('status', 'lulus').order('created_at', { ascending: false }).limit(100)); },
      async submitPost(d, imageBlob) {
        const prof = await this.getProfile();
        const image_url = imageBlob ? await this.uploadImage(imageBlob) : null;
        return un(await sb.from('posts').insert({ tag: d.tag, title: d.title, body: d.body, area: d.area, image_url, author_name: prof?.name || '' }).select().single());
      },
      async listJobs() { return un(await sb.from('jobs').select('*').eq('status', 'lulus').gte('close_date', today()).order('created_at', { ascending: false })); },
      async submitJob(d) { return un(await sb.from('jobs').insert(d).select().single()); },
      async mySubmissions() {
        const u = await this.getUser(); if (!u) return [];
        const [p, j] = await Promise.all([
          sb.from('posts').select('id,title,status,reason,created_at').eq('author', u.id).order('created_at', { ascending: false }).limit(20),
          sb.from('jobs').select('id,title,status,reason,created_at').eq('author', u.id).order('created_at', { ascending: false }).limit(20)]);
        return [...un(p).map(x => ({ ...x, kind: 'post' })), ...un(j).map(x => ({ ...x, kind: 'job' }))].sort((a, b) => b.created_at.localeCompare(a.created_at));
      },
      async listDirectory() { return un(await sb.from('directory').select('*').order('name')); },

      // ---------- Marketplace ----------
      async listListings() {
        const rows = un(await sb.from('listings').select('*, provider:providers(id,name,role,phone,area,verified,status)').eq('status', 'lulus').eq('hidden', false).order('created_at', { ascending: false }));
        return rows.filter(l => l.provider && l.provider.status === 'lulus');
      },
      async requestQuote(d) { return un(await sb.from('quotes').insert(d).select().single()); },
      async myProvider() { const u = await this.getUser(); if (!u) return null; return un(await sb.from('providers').select('*').eq('owner', u.id).maybeSingle()); },
      async createProvider(d) { return un(await sb.from('providers').insert(d).select().single()); },
      async updateProvider(id, d) { return un(await sb.from('providers').update(d).eq('id', id).select().single()); },
      async myListings(pid) { return un(await sb.from('listings').select('*').eq('provider_id', pid).order('created_at', { ascending: false })); },
      async saveListing(d) {
        const { id, created_at, status, reason, ...rest } = d;
        if (id) return un(await sb.from('listings').update(rest).eq('id', id).select().single());
        return un(await sb.from('listings').insert(rest).select().single());
      },
      async setListingHidden(id, hidden) { un(await sb.from('listings').update({ hidden }).eq('id', id)); },
      async deleteListing(id) { un(await sb.from('listings').delete().eq('id', id)); },
      async myQuotes(pid) { return un(await sb.from('quotes').select('*, listing:listings(title)').eq('provider_id', pid).order('created_at', { ascending: false }).limit(100)); },
      async setQuoteStatus(id, status) { un(await sb.from('quotes').update({ status }).eq('id', id)); },
      async requestVerify(pid, blobs, note) {
        const docs = []; for (const b of blobs) docs.push(await uploadTo('docs', b));
        return un(await sb.from('verify_requests').insert({ provider_id: pid, docs, note }).select().single());
      },
      async myVerify(pid) { return un(await sb.from('verify_requests').select('id,status,reason,created_at').eq('provider_id', pid).order('created_at', { ascending: false }).limit(1).maybeSingle()); },

      // ---------- Admin ----------
      async adminCounts() {
        const out = {};
        await Promise.all(Object.entries(TABLE).map(async ([k, t]) => {
          let q = sb.from(t).select('id', { count: 'exact', head: true }).eq('status', 'menunggu');
          const { count } = await q; out[k] = count || 0;
        }));
        // post Lapar Ek? dikira berasingan untuk bahagian Lapar Ek?
        const { count } = await sb.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'menunggu').eq('tag', 'Lapar Ek?');
        out.postLapar = count || 0; out.postInfo = (out.post || 0) - out.postLapar;
        // Lapar Ek?: permohonan kemas kini kedai, menu baru (kedai sudah lulus) dan kemas kini menu
        const [se, mn, me] = await Promise.all([
          sb.from('shops').select('id', { count: 'exact', head: true }).not('pending', 'is', null),
          sb.from('menu_items').select('id, shop:shops!inner(status)').eq('status', 'menunggu').eq('shop.status', 'lulus'),
          sb.from('menu_items').select('id', { count: 'exact', head: true }).not('pending', 'is', null)]);
        out.shopEdit = se.count || 0; out.menu = (mn.data || []).length; out.menuEdit = me.count || 0;
        return out;
      },
      async adminLaparStats() {
        const rows = un(await sb.from('shops').select('is_open').eq('status', 'lulus'));
        return { live: rows.length, open: rows.filter(s => s.is_open).length };
      },
      async adminList(kind, group) {
        if (['shopEdit', 'menu', 'menuEdit'].includes(kind)) {
          if (group !== 'menunggu') return [];
          let rows;
          if (kind === 'shopEdit') rows = un(await sb.from('shops').select('*').not('pending', 'is', null).order('pending_at'));
          else {
            let q = sb.from('menu_items').select('*, shop:shops!inner(id,name,slug,owner,status)');
            q = kind === 'menu' ? q.eq('status', 'menunggu').eq('shop.status', 'lulus').order('created_at') : q.not('pending', 'is', null).order('pending_at');
            rows = un(await q);
          }
          const who = await emailsFor(rows.map(r => r.owner || r.shop?.owner));
          rows.forEach(r => { r._email = who[r.owner || r.shop?.owner]?.email || ''; r.created_at = r.pending_at || r.created_at; });
          return rows;
        }
        const t = TABLE[kind];
        if (kind === 'shop') {
          let q = sb.from('shops').select('*, menu:menu_items(name,price,category)').order('created_at', { ascending: false }).limit(200);
          q = group === 'menunggu' ? q.eq('status', 'menunggu') : q.in('status', ['lulus', 'tolak']);
          const rows = un(await q), who = await emailsFor(rows.map(r => r.owner));
          rows.forEach(r => { r._email = who[r.owner]?.email || ''; });
          return rows;
        }
        const sel = kind === 'listing' ? '*, provider:providers(name,role,phone,verified,owner)'
          : kind === 'verify' ? '*, provider:providers(name,role,phone,area,owner)' : '*';
        let q = sb.from(t).select(sel).order('created_at', { ascending: false }).limit(200);
        q = group === 'menunggu' ? q.eq('status', 'menunggu') : q.in('status', ['lulus', 'tolak']);
        const rows = un(await q);
        const ownerOf = (r) => r.author || r.owner || r.provider?.owner;
        const who = await emailsFor(rows.map(ownerOf));
        for (const r of rows) {
          r._email = who[ownerOf(r)]?.email || '';
          if (kind === 'verify' && r.docs?.length) {
            const s = un(await sb.storage.from('docs').createSignedUrls(r.docs, 600));
            r._docUrls = s.map(x => x.signedUrl).filter(Boolean);
          }
        }
        return rows;
      },
      async adminDecide(kind, id, approve, reason) {
        const t = TABLE[kind];
        if (kind === 'shopEdit' || kind === 'menuEdit') {
          const tb = kind === 'shopEdit' ? 'shops' : 'menu_items', keys = kind === 'shopEdit' ? SHOP_KEYS : ITEM_KEYS;
          const row = un(await sb.from(tb).select('pending').eq('id', id).single());
          if (!row.pending) return;
          const apply = approve ? Object.fromEntries(keys.filter(k => k in row.pending).map(k => [k, row.pending[k]])) : {};
          const rk = kind === 'shopEdit' ? 'pending_reason' : 'reason';
          un(await sb.from(tb).update({ ...apply, pending: null, pending_at: null, [rk]: approve ? null : (reason || 'Perubahan tidak diluluskan') }).eq('id', id));
          return;
        }
        if (kind === 'menu') { un(await sb.from('menu_items').update({ status: approve ? 'lulus' : 'tolak', reason: approve ? null : (reason || null) }).eq('id', id)); return; }
        if (kind === 'shop' && approve) {
          // Menu yang ditambah semasa menunggu kelulusan disemak bersama kedai
          un(await sb.from('menu_items').update({ status: 'lulus', reason: null }).eq('shop_id', id).eq('status', 'menunggu'));
        }
        if (kind === 'verify') {
          const vr = un(await sb.from('verify_requests').select('*').eq('id', id).single());
          if (approve) un(await sb.from('providers').update({ verified: true }).eq('id', vr.provider_id));
          if (vr.docs?.length) await sb.storage.from('docs').remove(vr.docs); // dokumen dipadam selepas semakan
          un(await sb.from(t).update({ status: approve ? 'lulus' : 'tolak', reason: approve ? null : reason, docs: [] }).eq('id', id));
          return;
        }
        un(await sb.from(t).update({ status: approve ? 'lulus' : 'tolak', reason: approve ? null : (reason || null) }).eq('id', id));
      }
    };
    return api;
  }

  // ==================================================================
  function demoApi() {
    const KEY = 'segamatkita-demo-v1', UKEY = 'segamatkita-demo-user';
    const uid = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const wait = (ms = 100) => new Promise(r => setTimeout(r, ms));
    const err = (m) => { throw new Error(m); };
    const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
    const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { err('Storan pelayar penuh. Cuba gambar yang lebih kecil.'); } };
    const now = () => new Date().toISOString();
    const idOf = (email) => 'u-' + email.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Akaun Google simulasi (mod demo sahaja)
    const ACCOUNTS = [
      { name: 'Pengguna Demo', email: 'pengguna.demo@gmail.com', verified: true },
      { name: 'Mak Teh (kedai contoh)', email: 'makteh.demo@gmail.com', verified: true },
      { name: 'Siti Aisyah (ejen contoh)', email: 'siti.demo@gmail.com', verified: true },
      { name: 'Admin Demo', email: 'admin.demo@gmail.com', verified: true },
      { name: 'Akaun Belum Sah', email: 'belum.sah@gmail.com', verified: false }
    ];

    function seed() {
      const s1 = 'shop-mak-teh', s2 = 'shop-al-amin', T = now(), d = (n) => new Date(Date.now() - n * 864e5).toISOString();
      const it = (shop_id, category, name, price, extra = {}) => ({ id: uid(), shop_id, category, name, price, description: '', available: true, is_hot: false, image_url: null, options: [], sort: 0, created_at: T, ...extra });
      const suhu = { name: 'Suhu', required: true, multi: false, choices: [{ name: 'Panas', price: 0 }, { name: 'Ais', price: 0.3 }] };
      const manis = { name: 'Manis', required: false, multi: false, choices: [{ name: 'Kurang manis', price: 0 }, { name: 'Kosong', price: 0 }] };
      const pv = (key, name, role, phone, area, verified) => ({ id: 'pv-' + key, owner: key === 'siti' ? idOf('siti.demo@gmail.com') : 'owner-' + key, name, role, phone, area, about: '', verified, status: 'lulus', reason: null, created_at: T });
      const ls = (pid, title, cat, price, unit, descr, inc, area = 'Seluruh Segamat') => ({ id: uid(), provider_id: 'pv-' + pid, title, cat, area, price, unit, descr, inc, hidden: false, status: 'lulus', reason: null, created_at: T });
      return {
        admins: ['admin.demo@gmail.com'],
        profiles: [
          { id: idOf('makteh.demo@gmail.com'), email: 'makteh.demo@gmail.com', name: 'Mak Teh', role: 'lapar' },
          { id: idOf('siti.demo@gmail.com'), email: 'siti.demo@gmail.com', name: 'Siti Aisyah', role: 'market' },
          { id: idOf('admin.demo@gmail.com'), email: 'admin.demo@gmail.com', name: 'Admin Demo', role: 'user' }],
        shops: [
          { id: s1, owner: idOf('makteh.demo@gmail.com'), slug: 'warung-mak-teh', name: 'Warung Mak Teh', area: 'Bandar Segamat', cuisine: 'Nasi lemak & lauk kampung', hours: '6:30 pagi – 2:00 petang', prep_min: 15, phone: '60127000001', description: 'Nasi lemak bungkus daun pisang, sambal masak pagi-pagi.', is_open: true, duitnow_url: null, address: '', status: 'lulus', reason: null },
          { id: s2, owner: 'owner-alamin', slug: 'restoran-al-amin', name: 'Restoran Al-Amin', area: 'Buloh Kasap', cuisine: 'Mamak', hours: '24 jam', prep_min: 12, phone: '60127000003', description: 'Roti canai, nasi kandar dan tempat tengok bola.', is_open: true, duitnow_url: null, address: '', status: 'lulus', reason: null }],
        menu: [
          it(s1, 'Nasi Lemak', 'Nasi Lemak Biasa', 3, { description: 'Sambal, ikan bilis, kacang, timun, telur rebus', is_hot: true, options: [{ name: 'Sambal', required: false, multi: false, choices: [{ name: 'Sambal asing', price: 0 }, { name: 'Tambah sambal', price: 0.5 }] }] }),
          it(s1, 'Nasi Lemak', 'Nasi Lemak Ayam Goreng', 7.5, { description: 'Ayam goreng berempah, rangup', is_hot: true, options: [
            { name: 'Bahagian ayam', required: true, multi: false, choices: [{ name: 'Paha', price: 0 }, { name: 'Dada', price: 0 }] },
            { name: 'Tambahan', required: false, multi: true, choices: [{ name: 'Telur mata', price: 1.5 }, { name: 'Sambal sotong', price: 3 }, { name: 'Rendang', price: 4 }] }] }),
          it(s1, 'Nasi Lemak', 'Nasi Lemak Sotong', 8.5, { available: false }),
          it(s1, 'Lauk Tambahan', 'Rendang Daging', 6, { description: 'Rendang tok, masak 4 jam' }),
          it(s1, 'Minuman', 'Teh Tarik', 2.2, { is_hot: true, options: [suhu, manis] }),
          it(s1, 'Minuman', 'Kopi O', 1.8, { options: [suhu, manis] }),
          it(s2, 'Roti', 'Roti Canai', 1.5, { is_hot: true, options: [{ name: 'Kuah', required: true, multi: false, choices: [{ name: 'Dal', price: 0 }, { name: 'Kari', price: 0 }, { name: 'Banjir', price: 0.5 }] }] }),
          it(s2, 'Nasi & Mee', 'Nasi Kandar Ayam', 9.5, { is_hot: true }),
          it(s2, 'Minuman', 'Teh Tarik', 2.5, { options: [suhu] })],
        orders: [], seq: 1000,
        posts: [
          { id: uid(), author: 'seed', author_name: 'Admin', tag: 'Notis', title: 'Contoh: Gangguan bekalan air dijadualkan di Buloh Kasap', body: 'Kerja penyelenggaraan paip utama dari 9 pagi hingga 5 petang. Simpan air secukupnya.', area: 'Buloh Kasap', image_url: null, status: 'lulus', reason: null, created_at: d(1) },
          { id: uid(), author: 'seed', author_name: 'Admin', tag: 'Event', title: 'Contoh: Pasar malam Jalan Genuang buka semula Khamis ini', body: 'Lebih 80 gerai makanan dan pakaian, dari 5 petang hingga 11 malam.', area: 'Genuang', image_url: null, status: 'lulus', reason: null, created_at: d(2) },
          { id: uid(), author: 'seed', author_name: 'Admin', tag: 'Lapar Ek?', title: 'Contoh: Teh tarik RM1 setiap pagi Isnin di Warung Mak Teh', body: 'Untuk setiap order nasi lemak melalui Lapar Ek?, 7 hingga 9 pagi.', area: 'Bandar Segamat', image_url: null, status: 'lulus', reason: null, created_at: d(0) }],
        jobs: [
          { id: uid(), author: 'seed', title: 'Pembantu Kedai Makan', employer: 'Warung Mak Teh', area: 'Bandar Segamat', job_type: 'Sepenuh masa', pay: 'RM 1,700', pay_unit: '/bulan', close_date: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10), req: 'Contoh iklan. Boleh mula segera, kerja 6 hari seminggu.', phone: '60127000001', status: 'lulus', reason: null, created_at: d(1) }],
        providers: [
          pv('siti', 'Siti Aisyah', 'Ejen Coway', '60127200001', 'Seluruh Segamat', true),
          pv('lim', 'Lim Wei Jie', 'Ejen Cuckoo', '60127200002', 'Bandar Segamat, Buloh Kasap', true),
          pv('nurul', 'Nurul Huda', 'Ejen Takaful Berdaftar', '60127200003', 'Seluruh Segamat', true),
          pv('azman', 'Azman Elektrik', 'Pendawai Bertauliah', '60127200006', 'Bandar Segamat, Jementah', false)],
        listings: [
          ls('siti', 'Penapis Air Coway, sewa bulanan', 'Penapis Air & Peralatan', 'RM 60', '/bulan', 'Contoh listing. Pemasangan percuma dan servis filter berkala.', ['Pemasangan percuma', 'Servis filter setiap 4 bulan']),
          ls('lim', 'Penapis Air & Tilam Cuckoo', 'Penapis Air & Peralatan', 'RM 55', '/bulan', 'Contoh listing. Pakej penapis air dan tilam.', ['Pasang percuma']),
          ls('nurul', 'Insurans & Takaful Kereta', 'Insurans & Takaful', 'Sebut harga', '', 'Contoh listing. Banding beberapa syarikat, roadtax diuruskan sekali.', ['Roadtax diuruskan']),
          ls('azman', 'Wiring rumah & pemasangan lampu', 'Elektrik & Wiring', 'Dari RM 80', '/kerja', 'Contoh listing. Tambah plug, tukar DB, masalah trip.', ['Pemeriksaan percuma'])],
        quotes: [], verify: [],
        directory: [
          { id: uid(), name: 'Contoh: Bengkel Kereta Maju Jaya', cat: 'Kenderaan', area: 'Bandar Segamat', phone: '60127100001', hours: '9:00 pagi – 6:00 petang', descr: 'Servis enjin, brek, tukar minyak hitam.', address: '', map_url: null },
          { id: uid(), name: 'Contoh: Farmasi Segar', cat: 'Kesihatan', area: 'Bandar Segamat', phone: '60127100004', hours: '9:00 pagi – 9:00 malam', descr: 'Ubat, vitamin, semakan tekanan darah.', address: '', map_url: null },
          { id: uid(), name: 'Contoh: Kedai Runcit Pak Mat', cat: 'Runcit & Kedai', area: 'Labis', phone: '60127100005', hours: '7:00 pagi – 10:00 malam', descr: 'Barang dapur, gas memasak.', address: '', map_url: null }]
      };
    }
    // Menu dari data demo lama tiada status: anggap sudah lulus
    const norm = (d) => { d.menu.forEach(m => { if (!m.status) m.status = 'lulus'; }); return d; };
    let db = norm(read(KEY, null) || seed()); write(KEY, db);
    const reload = () => { db = norm(read(KEY, db)); };
    const save = () => write(KEY, db);
    const me = () => read(UKEY, null);
    const isAdminSync = () => { const u = me(); return !!u && db.admins.includes(u.email); };
    const needUser = () => { const u = me(); if (!u) err('Sila log masuk dahulu.'); if (!emailVerified(u)) err('Email akaun belum disahkan.'); return u; };
    const fileToData = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
    const tab = (k) => (k === 'verify' ? db.verify : db[TABLE[k]]);
    const shopView = (s) => ({ name: s.name, slug: s.slug, phone: s.phone, duitnow_url: s.duitnow_url, prep_min: s.prep_min });
    const provVisible = (pid) => db.providers.find(p => p.id === pid)?.status === 'lulus';
    const pick = (o, keys) => Object.fromEntries(keys.map(k => [k, o[k] ?? null]));
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    // Sama dengan guard_shop()/guard_menu() dalam schema.sql
    function guardedUpdate(row, d, keys, rk) {
      const cancel = 'pending' in d && d.pending === null;
      const rest = strip(d, ['id', 'owner', 'slug', 'shop_id', 'created_at']);
      const next = { ...row, ...rest }, changed = !same(pick(next, keys), pick(row, keys));
      if (row.status === 'lulus') {
        if (changed) {
          const live = pick(row, keys);
          Object.assign(row, rest, live, { pending: pick(next, keys), pending_at: now(), [rk]: null });
        } else {
          Object.assign(row, rest);
          if (cancel) { row.pending = null; row.pending_at = null; }
        }
      } else {
        Object.assign(row, rest, { pending: null, pending_at: null });
        if (row.status === 'tolak' && changed) { row.status = 'menunggu'; row.reason = null; }
      }
      return row;
    }

    const api = {
      mode: 'demo',
      emailVerified,
      demoAccounts: ACCOUNTS,
      reset() { db = seed(); save(); try { localStorage.removeItem(UKEY); } catch (e) {} },

      // ---------- akaun ----------
      async getUser() { return me(); },
      async signInWithGoogle(returnTo, acc) {
        await wait(250);
        if (!acc) err('Pilih akaun Google.');
        write(UKEY, { id: idOf(acc.email), email: acc.email, user_metadata: { full_name: acc.name, email_verified: !!acc.verified } });
        if (returnTo && returnTo !== location.href) location.href = returnTo; else location.reload();
      },
      async signOut() { try { localStorage.removeItem(UKEY); } catch (e) {} },
      async getProfile() { reload(); const u = me(); return u ? (db.profiles.find(p => p.id === u.id) || null) : null; },
      async saveProfile(d) {
        await wait(); reload(); const u = needUser();
        let p = db.profiles.find(x => x.id === u.id);
        if (!p) { p = { id: u.id, email: u.email, name: u.user_metadata?.full_name || u.email.split('@')[0], role: 'user' }; db.profiles.push(p); }
        if (d.name) p.name = d.name; if (d.role) p.role = d.role; save(); return p;
      },
      async isAdmin() { reload(); return isAdminSync(); },

      // ---------- Lapar Ek? ----------
      async listShops() { await wait(); reload(); return db.shops.filter(s => s.status === 'lulus').sort((a, b) => (b.is_open - a.is_open) || a.name.localeCompare(b.name)); },
      async getShopBySlug(slug) {
        await wait(); reload(); const s = db.shops.find(x => x.slug === slug); const u = me();
        return s && (s.status === 'lulus' || (u && s.owner === u.id) || isAdminSync()) ? s : null;
      },
      async myShop() { reload(); const u = me(); return u ? (db.shops.find(s => s.owner === u.id) || null) : null; },
      async slugTaken(slug) { reload(); return db.shops.some(s => s.slug === slug); },
      async createShop(d) {
        await wait(); reload(); const u = needUser();
        if (db.shops.some(s => s.slug === d.slug)) err('Pautan kedai ini sudah diambil. Cuba nama lain.');
        if (db.shops.some(s => s.owner === u.id)) err('Akaun ini sudah ada kedai.');
        const s = { is_open: true, duitnow_url: null, prep_min: 15, description: '', address: '', ...d, id: uid(), owner: u.id, status: 'menunggu', reason: null };
        db.shops.push(s); save(); return s;
      },
      async updateShop(id, d) { await wait(); reload(); const s = db.shops.find(x => x.id === id); guardedUpdate(s, d, SHOP_KEYS, 'pending_reason'); save(); return { ...s }; },
      async cancelShopChange(id) { return this.updateShop(id, { pending: null }); },
      async getMenu(shopId) {
        await wait(); reload(); const u = me(), s = db.shops.find(x => x.id === shopId);
        const all = (u && s && s.owner === u.id) || isAdminSync(); // seperti RLS: orang awam nampak menu lulus sahaja
        return db.menu.filter(m => m.shop_id === shopId && (all || m.status === 'lulus')).sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at)).map(m => ({ ...m }));
      },
      async saveItem(it) {
        await wait(); reload();
        // Sama dengan polisi "menu: pemilik urus": hanya partner yang sudah lulus
        if (!isAdminSync() && db.shops.find(s => s.id === (it.shop_id || db.menu.find(m => m.id === it.id)?.shop_id))?.status !== 'lulus') err('Kedai anda belum diluluskan sebagai Partner Lapar Ek?.');
        if (it.id) { const m = db.menu.find(x => x.id === it.id); guardedUpdate(m, it, ITEM_KEYS, 'reason'); save(); return { ...m }; }
        const m = { ...strip(it, ['id', 'created_at']), id: uid(), status: 'menunggu', reason: null, pending: null, pending_at: null, created_at: now() }; db.menu.push(m); save(); return { ...m };
      },
      async cancelItemChange(id) { return this.saveItem({ id, pending: null }); },
      async deleteItem(id) { await wait(); reload(); db.menu = db.menu.filter(m => m.id !== id); save(); },
      async uploadImage(blob) { return fileToData(blob); },
      // Sama dengan fungsi place_order() dalam schema.sql
      async placeOrder(p) {
        await wait(250); reload();
        const u = me(); if (!u) err('Sila log masuk untuk order'); if (!emailVerified(u)) err('Sila log masuk dengan akaun Google yang emailnya disahkan');
        const shop = db.shops.find(s => s.id === p.shop_id);
        if (!shop || shop.status !== 'lulus') err('Kedai tidak dijumpai');
        if (!shop.is_open) err('Kedai tidak terima order sekarang');
        if (!(p.name || '').trim()) err('Sila isi nama');
        if (p.type === 'dine' && !(p.table || '').trim()) err('Sila isi no. meja');
        if (p.type === 'pickup' && !(p.phone || '').trim()) err('Sila isi no. telefon');
        if (!p.items.length) err('Troli kosong');
        let total = 0; const out = [];
        for (const line of p.items) {
          const it = db.menu.find(m => m.id === line.item_id && m.shop_id === shop.id);
          if (!it || it.status !== 'lulus') err('Ada menu yang sudah tiada. Sila muat semula page.');
          if (!it.available) err(it.name + ' sudah habis');
          const qty = Math.max(1, Math.min(99, line.qty | 0 || 1));
          let unit = Number(it.price); const chosen = [];
          for (const g of it.options || []) {
            const sel = (line.choices && line.choices[g.name]) || []; let n = 0;
            for (const c of g.choices) if (sel.includes(c.name)) { unit += Number(c.price) || 0; chosen.push(c.name); n++; }
            if (g.required && !n) err(`Sila pilih ${g.name} untuk ${it.name}`);
            if (!g.multi && n > 1) err('Pilih satu sahaja untuk ' + g.name);
          }
          total += unit * qty;
          out.push({ name: it.name, qty, unit: Math.round(unit * 100) / 100, options: chosen, note: (line.note || '').slice(0, 120) });
        }
        const o = { id: ++db.seq, shop_id: shop.id, customer_id: u.id, token: uid() + uid(), order_type: p.type, table_no: p.table || null, pickup_time: p.pickup || null,
          customer_name: p.name.trim(), customer_phone: p.phone || null, note: p.note || null, pay_method: p.pay, items: out,
          total: Math.round(total * 100) / 100, status: 'baru', created_at: now(), updated_at: now() };
        db.orders.unshift(o); save();
        return { id: o.id, token: o.token };
      },
      async getOrder(token) { await wait(); reload(); const o = db.orders.find(x => x.token === token); if (!o) return null; return { ...o, shop: shopView(db.shops.find(x => x.id === o.shop_id)) }; },
      async myOrders() { await wait(); reload(); const u = me(); if (!u) return []; return db.orders.filter(o => o.customer_id === u.id).slice(0, 30).map(o => ({ ...o, shop: shopView(db.shops.find(x => x.id === o.shop_id)) })); },
      async listOrders(shopId, sinceISO) { await wait(); reload(); return db.orders.filter(o => o.shop_id === shopId && o.created_at >= sinceISO); },
      async setOrderStatus(id, status) { await wait(); reload(); const o = db.orders.find(x => x.id === id); o.status = status; o.updated_at = now(); save(); },
      subscribeOrders(shopId, cb) {
        let last = JSON.stringify(read(KEY, db).orders.filter(o => o.shop_id === shopId).map(o => o.id + o.status));
        const check = () => {
          const cur = read(KEY, db).orders.filter(o => o.shop_id === shopId);
          const sig = JSON.stringify(cur.map(o => o.id + o.status));
          if (sig !== last) { const prev = last; last = sig; cb(cur.some(o => !prev.includes('"' + o.id)) ? 'INSERT' : 'UPDATE'); }
        };
        const onStore = (e) => { if (e.key === KEY) check(); };
        window.addEventListener('storage', onStore); const t = setInterval(check, 3000);
        return () => { window.removeEventListener('storage', onStore); clearInterval(t); };
      },

      // ---------- Info ----------
      async listPosts() { await wait(); reload(); return db.posts.filter(p => p.status === 'lulus').sort((a, b) => b.created_at.localeCompare(a.created_at)); },
      async submitPost(d, imageBlob) {
        await wait(); reload(); const u = needUser(); const prof = db.profiles.find(p => p.id === u.id);
        const image_url = imageBlob ? await fileToData(imageBlob) : null;
        const p = { id: uid(), author: u.id, author_name: prof?.name || '', tag: d.tag, title: d.title, body: d.body, area: d.area, image_url, status: 'menunggu', reason: null, created_at: now() };
        db.posts.unshift(p); save(); return p;
      },
      async listJobs() { await wait(); reload(); return db.jobs.filter(j => j.status === 'lulus' && j.close_date >= today()); },
      async submitJob(d) { await wait(); reload(); const u = needUser(); const j = { ...d, id: uid(), author: u.id, status: 'menunggu', reason: null, created_at: now() }; db.jobs.unshift(j); save(); return j; },
      async mySubmissions() {
        reload(); const u = me(); if (!u) return [];
        return [...db.posts.filter(p => p.author === u.id).map(p => ({ ...p, kind: 'post' })), ...db.jobs.filter(j => j.author === u.id).map(j => ({ ...j, kind: 'job' }))].sort((a, b) => b.created_at.localeCompare(a.created_at));
      },
      async listDirectory() { await wait(); reload(); return [...db.directory]; },

      // ---------- Marketplace ----------
      async listListings() {
        await wait(); reload();
        return db.listings.filter(l => l.status === 'lulus' && !l.hidden && provVisible(l.provider_id)).map(l => ({ ...l, provider: db.providers.find(p => p.id === l.provider_id) }));
      },
      async requestQuote(d) {
        await wait(); reload(); const u = needUser(); const l = db.listings.find(x => x.id === d.listing_id);
        if (!l || l.status !== 'lulus') err('Listing tidak dijumpai');
        const q = { ...d, id: uid(), provider_id: l.provider_id, customer: u.id, status: 'baru', created_at: now() }; db.quotes.unshift(q); save(); return q;
      },
      async myProvider() { reload(); const u = me(); return u ? (db.providers.find(p => p.owner === u.id) || null) : null; },
      async createProvider(d) {
        await wait(); reload(); const u = needUser();
        if (db.providers.some(p => p.owner === u.id)) err('Akaun ini sudah didaftarkan sebagai penyedia servis.');
        const p = { ...d, id: uid(), owner: u.id, verified: false, status: 'menunggu', reason: null, created_at: now() }; db.providers.push(p); save(); return p;
      },
      async updateProvider(id, d) {
        await wait(); reload(); const p = db.providers.find(x => x.id === id); const { status, reason, verified, owner, ...rest } = d;
        const keys = ['name', 'role', 'phone', 'area', 'about'], changed = keys.some(k => k in rest && rest[k] !== p[k]);
        Object.assign(p, rest);
        if (p.status === 'tolak' && changed) { p.status = 'menunggu'; p.reason = null; } // sama dengan guard_provider()
        save(); return { ...p };
      },
      async myListings(pid) { await wait(); reload(); return db.listings.filter(l => l.provider_id === pid).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
      async saveListing(d) {
        await wait(); reload(); const { status, reason, ...rest } = d;
        // Sama dengan polisi "listings: urus": hanya partner yang sudah lulus
        if (!isAdminSync() && db.providers.find(p => p.id === d.provider_id)?.status !== 'lulus') err('Anda belum diluluskan sebagai Partner Marketplace.');
        if (d.id) { const l = db.listings.find(x => x.id === d.id); const keys = ['title', 'cat', 'area', 'price', 'unit', 'descr', 'inc']; const changed = keys.some(k => JSON.stringify(l[k]) !== JSON.stringify(rest[k] ?? l[k])); Object.assign(l, rest); if (changed) { l.status = 'menunggu'; l.reason = null; } save(); return l; }
        const l = { hidden: false, inc: [], unit: '', ...rest, id: uid(), status: 'menunggu', reason: null, created_at: now() }; db.listings.unshift(l); save(); return l;
      },
      async setListingHidden(id, hidden) { await wait(); reload(); db.listings.find(x => x.id === id).hidden = hidden; save(); },
      async deleteListing(id) { await wait(); reload(); db.listings = db.listings.filter(l => l.id !== id); save(); },
      async myQuotes(pid) { await wait(); reload(); return db.quotes.filter(q => q.provider_id === pid).map(q => ({ ...q, listing: { title: db.listings.find(l => l.id === q.listing_id)?.title || '' } })); },
      async setQuoteStatus(id, status) { await wait(); reload(); db.quotes.find(q => q.id === id).status = status; save(); },
      async requestVerify(pid, blobs, note) {
        await wait(); reload(); needUser();
        if (db.providers.find(p => p.id === pid)?.status !== 'lulus') err('Anda belum diluluskan sebagai Partner Marketplace.');
        const docs = await Promise.all(blobs.map(fileToData));
        const v = { id: uid(), provider_id: pid, docs, note, status: 'menunggu', reason: null, created_at: now() }; db.verify.unshift(v); save(); return v;
      },
      async myVerify(pid) { reload(); return db.verify.find(v => v.provider_id === pid) || null; },

      // ---------- Admin ----------
      async adminCounts() {
        reload(); if (!isAdminSync()) err('Bukan admin');
        const out = {}; for (const k of Object.keys(TABLE)) out[k] = tab(k).filter(r => r.status === 'menunggu').length;
        out.postLapar = db.posts.filter(p => p.status === 'menunggu' && p.tag === 'Lapar Ek?').length; out.postInfo = out.post - out.postLapar;
        const liveShop = (id) => db.shops.find(s => s.id === id)?.status === 'lulus';
        out.shopEdit = db.shops.filter(s => s.pending).length;
        out.menu = db.menu.filter(m => m.status === 'menunggu' && liveShop(m.shop_id)).length;
        out.menuEdit = db.menu.filter(m => m.pending).length;
        return out;
      },
      async adminLaparStats() { reload(); const live = db.shops.filter(s => s.status === 'lulus'); return { live: live.length, open: live.filter(s => s.is_open).length }; },
      async adminList(kind, group) {
        await wait(); reload(); if (!isAdminSync()) err('Bukan admin');
        const email = (id) => db.profiles.find(p => p.id === id)?.email || '';
        if (['shopEdit', 'menu', 'menuEdit'].includes(kind)) {
          if (group !== 'menunggu') return [];
          const shopOf = (id) => { const s = db.shops.find(x => x.id === id); return { id: s.id, name: s.name, slug: s.slug, owner: s.owner, status: s.status }; };
          const rows = kind === 'shopEdit' ? db.shops.filter(s => s.pending).map(s => ({ ...s }))
            : db.menu.filter(m => kind === 'menu' ? m.status === 'menunggu' && shopOf(m.shop_id).status === 'lulus' : m.pending).map(m => ({ ...m, shop: shopOf(m.shop_id) }));
          rows.forEach(r => { r._email = email(r.owner || r.shop?.owner); r.created_at = r.pending_at || r.created_at; });
          return rows;
        }
        if (kind === 'shop') {
          return db.shops.filter(s => group === 'menunggu' ? s.status === 'menunggu' : s.status !== 'menunggu')
            .map(s => ({ ...s, _email: email(s.owner), menu: db.menu.filter(m => m.shop_id === s.id).map(m => ({ name: m.name, price: m.price, category: m.category })) }));
        }
        const rows = tab(kind).filter(r => group === 'menunggu' ? r.status === 'menunggu' : r.status !== 'menunggu').map(r => ({ ...r }));
        for (const r of rows) {
          if (kind === 'listing' || kind === 'verify') r.provider = { ...db.providers.find(p => p.id === r.provider_id) };
          r._email = email(r.author || r.owner || r.provider?.owner);
          if (kind === 'verify') r._docUrls = r.docs || [];
        }
        return rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      },
      async adminDecide(kind, id, approve, reason) {
        await wait(); reload(); if (!isAdminSync()) err('Bukan admin');
        if (kind === 'shopEdit' || kind === 'menuEdit') {
          const r = (kind === 'shopEdit' ? db.shops : db.menu).find(x => x.id === id); if (!r.pending) return;
          if (approve) Object.assign(r, r.pending);
          r[kind === 'shopEdit' ? 'pending_reason' : 'reason'] = approve ? null : (reason || 'Perubahan tidak diluluskan');
          r.pending = null; r.pending_at = null; save(); return;
        }
        if (kind === 'menu') { const m = db.menu.find(x => x.id === id); m.status = approve ? 'lulus' : 'tolak'; m.reason = approve ? null : (reason || null); save(); return; }
        if (kind === 'shop' && approve) db.menu.filter(m => m.shop_id === id && m.status === 'menunggu').forEach(m => { m.status = 'lulus'; m.reason = null; });
        const r = tab(kind).find(x => x.id === id);
        r.status = approve ? 'lulus' : 'tolak'; r.reason = approve ? null : (reason || null);
        if (kind === 'verify') { if (approve) db.providers.find(p => p.id === r.provider_id).verified = true; r.docs = []; }
        save();
      }
    };
    return api;
  }

  // Kalau config diisi tapi pustaka Supabase gagal dimuat, jangan diam-diam
  // jatuh ke mod demo. Biar page tunjuk ralat.
  const configured = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY);
  window.api = configured ? (window.supabase ? supabaseApi() : null) : demoApi();
})();
