// =====================================================================
//  TETAPAN LAPAR EK?
//  Isi dua nilai di bawah dari Supabase → Project Settings → API.
//  Kalau dibiarkan kosong, website berjalan dalam MOD DEMO
//  (data disimpan dalam pelayar ini sahaja, sesuai untuk cuba-cuba).
// =====================================================================
window.LAPAR_CONFIG = {
  SUPABASE_URL: 'https://mqadixxqmjeyjbgcjbxt.supabase.co',
  // Kunci "anon public": selamat diletak dalam website (database dilindungi RLS). JANGAN letak service_role di sini.
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xYWRpeHhxbWpleWpiZ2NqYnh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzODUzMTcsImV4cCI6MjEwNzk2MTMxN30.6RscZ2ysGwXiXjnbXCe7iRlPVROVf2W6LAekVaIsdKU',

  APP_NAME: 'Segamat Kita',
  CONTACT: '',             // pilihan: cth 'WhatsApp 012-345 6789 · admin@email.com' (dipapar di "Hubungi kami")
  AREAS: ['Bandar Segamat', 'Buloh Kasap', 'Jementah', 'Labis', 'Chaah', 'Batu Anam', 'Bekok', 'Genuang']
};
