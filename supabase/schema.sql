-- Quiznik schema: flashcard sets + cards, owned per-user via auth.uid()
-- Run this in the Supabase SQL editor (or `supabase db push` if using the CLI).

create extension if not exists "pgcrypto";

create table if not exists public.sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.sets (id) on delete cascade,
  term text not null,
  definition text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists cards_set_id_idx on public.cards (set_id, position);
create index if not exists sets_user_id_idx on public.sets (user_id, updated_at desc);

-- Keep updated_at fresh whenever a set's cards change indirectly via the set row itself.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sets_set_updated_at on public.sets;
create trigger sets_set_updated_at
  before update on public.sets
  for each row
  execute function public.set_updated_at();

-- Row Level Security: every row is scoped to its owning user.
alter table public.sets enable row level security;
alter table public.cards enable row level security;

drop policy if exists "sets are owner readable" on public.sets;
create policy "sets are owner readable"
  on public.sets for select
  using (auth.uid() = user_id);

drop policy if exists "sets are owner writable" on public.sets;
create policy "sets are owner writable"
  on public.sets for insert
  with check (auth.uid() = user_id);

drop policy if exists "sets are owner updatable" on public.sets;
create policy "sets are owner updatable"
  on public.sets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "sets are owner deletable" on public.sets;
create policy "sets are owner deletable"
  on public.sets for delete
  using (auth.uid() = user_id);

-- Cards inherit ownership through their parent set.
drop policy if exists "cards are owner readable" on public.cards;
create policy "cards are owner readable"
  on public.cards for select
  using (exists (
    select 1 from public.sets
    where sets.id = cards.set_id and sets.user_id = auth.uid()
  ));

drop policy if exists "cards are owner writable" on public.cards;
create policy "cards are owner writable"
  on public.cards for insert
  with check (exists (
    select 1 from public.sets
    where sets.id = cards.set_id and sets.user_id = auth.uid()
  ));

drop policy if exists "cards are owner updatable" on public.cards;
create policy "cards are owner updatable"
  on public.cards for update
  using (exists (
    select 1 from public.sets
    where sets.id = cards.set_id and sets.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.sets
    where sets.id = cards.set_id and sets.user_id = auth.uid()
  ));

drop policy if exists "cards are owner deletable" on public.cards;
create policy "cards are owner deletable"
  on public.cards for delete
  using (exists (
    select 1 from public.sets
    where sets.id = cards.set_id and sets.user_id = auth.uid()
  ));
