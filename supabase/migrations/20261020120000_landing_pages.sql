-- =====================================================================
--  Halaman landing peniaga (bina.html → l.html)
--  Belum diapply. Jalankan dalam Supabase → SQL Editor, atau
--  `supabase db push` jika projek ini diurus dengan Supabase CLI.
-- =====================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()

create table if not exists public.landing_pages (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users (id) on delete cascade,
  slug        text not null unique,
  brand_name  text not null,
  tagline     text,
  about       text,
  logo_url    text,
  whatsapp    text,
  area        text,
  accent      text not null default '#0e5846',
  template    text not null default 'minimal',
  products    jsonb not null default '[]'::jsonb,
  status      text not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Pautan awam mesti boleh dibaca dalam URL: huruf kecil, nombor, sengkang
  constraint landing_pages_slug_fmt check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 60),
  constraint landing_pages_template_chk check (template in ('minimal', 'bold')),
  constraint landing_pages_status_chk check (status in ('draft', 'published')),
  constraint landing_pages_accent_chk check (accent ~* '^#[0-9a-f]{6}$'),
  constraint landing_pages_products_chk check (jsonb_typeof(products) = 'array')
);

-- Senarai halaman pemilik dan carian halaman terbit
create index if not exists landing_pages_owner_idx on public.landing_pages (owner);
create index if not exists landing_pages_published_idx on public.landing_pages (status) where status = 'published';

-- updated_at dikemas kini oleh server, bukan oleh pelayar
create or replace function public.landing_pages_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists landing_pages_touch on public.landing_pages;
create trigger landing_pages_touch
  before update on public.landing_pages
  for each row execute function public.landing_pages_touch();

-- =====================================================================
--  RLS
-- =====================================================================
alter table public.landing_pages enable row level security;

-- 1) Awam (anon + authenticated): baca halaman yang sudah diterbitkan sahaja.
drop policy if exists "landing: awam baca terbit" on public.landing_pages;
create policy "landing: awam baca terbit"
  on public.landing_pages for select
  to anon, authenticated
  using (status = 'published');

-- 2) Pemilik: penuh pada baris sendiri (draf, kemas kini, terbit, padam).
drop policy if exists "landing: pemilik penuh" on public.landing_pages;
create policy "landing: pemilik penuh"
  on public.landing_pages for all
  to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- =====================================================================
--  GRANT
--  anon hanya diberi SELECT pada lajur awam. Lajur `owner` (dan apa-apa
--  lajur dalaman yang ditambah kemudian) tidak terdedah kepada pelayar.
--  Senarai ini mesti sepadan dengan LANDING_PUBLIC dalam js/api.js —
--  itulah sebab api.landingBySlug() tidak menggunakan select('*').
-- =====================================================================
revoke all on public.landing_pages from anon, authenticated;

grant select (
  id, slug, brand_name, tagline, about, logo_url, whatsapp, area,
  accent, template, products, status, created_at, updated_at
) on public.landing_pages to anon;

-- Pengguna log masuk: akses penuh pada lajur, tetapi RLS tetap mengehadkan baris.
grant select, insert, update, delete on public.landing_pages to authenticated;

-- =====================================================================
--  Nota operasi
--   * Imej (logo + gambar produk) guna bucket `images` sedia ada melalui
--     api.uploadImage(); tiada polisi storage baru diperlukan kerana laluan
--     fail sentiasa bermula dengan uid pemilik.
--   * Satu pemilik boleh ada lebih daripada satu baris; bina.html memuatkan
--     baris terbaru (landingMine). Jika mahu satu halaman sahaja per akaun,
--     tambah: alter table public.landing_pages add constraint landing_pages_owner_key unique (owner);
-- =====================================================================
