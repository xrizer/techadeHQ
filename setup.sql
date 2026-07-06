-- Techade HQ — run sekali di SQL Editor Supabase (project BARU, jangan campur sama LifeHack)

-- Papan project (shared: semua founder bisa liat & edit)
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'jalan',   -- jalan | nunggu | stuck | kelar
  progress text,                          -- "udah sampe mana"
  next_step text,                         -- "habis ini ngapain"
  updated_by text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table projects enable row level security;
create policy "team all" on projects
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- Fokus harian per founder (semua bisa baca, cuma pemilik yang bisa edit)
create table focus (
  user_id uuid primary key default auth.uid(),
  name text not null,        -- username buat display
  text text,
  date date
);

alter table focus enable row level security;
create policy "team read focus" on focus
  for select using (auth.uid() is not null);
create policy "own focus write" on focus
  for insert with check (auth.uid() = user_id);
create policy "own focus update" on focus
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
