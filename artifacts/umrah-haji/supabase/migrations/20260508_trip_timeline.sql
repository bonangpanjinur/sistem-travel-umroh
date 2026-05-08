create table if not exists public.trip_timeline (
  id uuid default gen_random_uuid() primary key,
  departure_id uuid not null references public.departures(id) on delete cascade,
  day_number integer not null default 1,
  activity_type text not null default 'other',
  title text not null,
  description text,
  location text,
  time_start text,
  is_completed boolean not null default false,
  completed_at timestamptz,
  completed_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.trip_timeline enable row level security;

create policy "Authenticated users can manage trip_timeline"
  on public.trip_timeline
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create index if not exists trip_timeline_departure_id_idx on public.trip_timeline(departure_id);
create index if not exists trip_timeline_day_number_idx on public.trip_timeline(day_number);
