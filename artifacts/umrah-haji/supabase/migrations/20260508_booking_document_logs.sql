-- ============================================================
-- booking_document_logs
-- Tracks every document generated from a booking so staff can
-- see a full audit trail of what letters / PDFs have been issued.
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- ============================================================

create table if not exists public.booking_document_logs (
  id               uuid        primary key default gen_random_uuid(),
  booking_id       uuid        not null references public.bookings(id) on delete cascade,
  document_type    text        not null,   -- 'passport' | 'certificate' | 'cuti_jamaah' | 'eticket' | 'general' | 'invoice'
  document_label   text        not null,   -- Human-readable label, e.g. "Surat Paspor"
  jamaah_name      text,                   -- Passenger name for single-doc; null for bulk
  generated_by     uuid        references auth.users(id) on delete set null,
  generated_by_name text,                  -- Denormalised display name
  is_bulk          boolean     not null default false,
  bulk_count       integer,                -- Number of PDFs in a bulk ZIP export
  notes            text,
  created_at       timestamptz not null default now()
);

-- Index for fast lookup per booking
create index if not exists idx_booking_document_logs_booking_id
  on public.booking_document_logs (booking_id, created_at desc);

-- Row Level Security
alter table public.booking_document_logs enable row level security;

-- Authenticated staff can read all logs
create policy "Authenticated users can read document logs"
  on public.booking_document_logs
  for select
  using (auth.role() = 'authenticated');

-- Authenticated staff can insert logs
create policy "Authenticated users can insert document logs"
  on public.booking_document_logs
  for insert
  with check (auth.role() = 'authenticated');
