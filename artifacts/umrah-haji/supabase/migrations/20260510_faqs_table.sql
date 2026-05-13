-- FAQ Manager: unified table for all FAQ entries
-- Replaces the localStorage-based FAQEditor in AdminAppearance

create table if not exists public.faqs (
  id            uuid primary key default gen_random_uuid(),
  question      text not null,
  answer        text not null,
  category      text not null default 'Umum',
  is_published  boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.update_faqs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_faqs_updated_at on public.faqs;
create trigger set_faqs_updated_at
  before update on public.faqs
  for each row execute function public.update_faqs_updated_at();

-- RLS
alter table public.faqs enable row level security;

-- Public: anyone can read published FAQs
create policy "faqs_public_read" on public.faqs
  for select using (is_published = true);

-- Staff (authenticated): full CRUD
create policy "faqs_staff_all" on public.faqs
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Seed default FAQs (only if table is empty)
insert into public.faqs (question, answer, category, sort_order)
select * from (values
  ('Bagaimana cara mendaftar umroh?',
   'Anda dapat mendaftar melalui website kami di halaman Paket Umroh, kemudian pilih paket yang sesuai dan ikuti langkah pendaftaran online.',
   'Pendaftaran', 1),
  ('Apa saja persyaratan dokumen umroh?',
   E'Persyaratan dokumen umroh meliputi:\n1. Paspor yang masih berlaku minimal 7 bulan\n2. Pas foto terbaru ukuran 4x6 (latar putih)\n3. Surat keterangan sehat dari dokter\n4. Bukti vaksinasi meningitis\n5. Kartu Keluarga dan KTP',
   'Dokumen', 2),
  ('Berapa lama proses visa umroh?',
   'Proses visa umroh biasanya memakan waktu 5–7 hari kerja setelah semua dokumen lengkap dan dinyatakan memenuhi syarat oleh Kedutaan Saudi.',
   'Visa', 3),
  ('Apakah bisa membayar dengan cicilan?',
   'Ya, kami menyediakan program cicilan tanpa bunga. Hubungi tim kami untuk informasi lebih lanjut tentang skema cicilan yang tersedia.',
   'Pembayaran', 4),
  ('Apa yang termasuk dalam paket umroh?',
   E'Paket umroh kami mencakup:\n- Tiket pesawat PP\n- Hotel bintang 4/5 di Makkah dan Madinah\n- Transportasi lokal\n- Muthawwif/pembimbing ibadah\n- Asuransi perjalanan\n- Konsultasi persiapan pra-keberangkatan',
   'Paket', 5),
  ('Bagaimana jika saya harus membatalkan keberangkatan?',
   'Kebijakan pembatalan bergantung pada waktu pembatalan dan paket yang dipilih. Silakan hubungi tim kami segera untuk mengetahui ketentuan dan proses refund yang berlaku.',
   'Pembatalan', 6)
) as v(question, answer, category, sort_order)
where not exists (select 1 from public.faqs limit 1);
