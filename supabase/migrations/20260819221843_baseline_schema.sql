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

-- Per-user, per-card progress for Learn mode (multiple-choice -> written
-- graduation, tracked with a simplified SM-2 schedule). No row means the
-- card is "new" (never answered yet).
create table if not exists public.study_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete cascade,
  set_id uuid not null references public.sets (id) on delete cascade,
  phase text not null default 'multiple_choice' check (phase in ('multiple_choice', 'written')),
  status text not null default 'seen' check (status in ('seen', 'review', 'mastered')),
  correct_streak integer not null default 0,
  ease_factor real not null default 2.5,
  interval_days real not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, card_id)
);

create index if not exists study_progress_user_set_idx on public.study_progress (user_id, set_id);

alter table public.study_progress enable row level security;

drop policy if exists "study_progress is owner readable" on public.study_progress;
create policy "study_progress is owner readable"
  on public.study_progress for select
  using (user_id = auth.uid());

drop policy if exists "study_progress is owner writable" on public.study_progress;
create policy "study_progress is owner writable"
  on public.study_progress for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.cards
      join public.sets on sets.id = cards.set_id
      where cards.id = study_progress.card_id and sets.user_id = auth.uid()
    )
  );

drop policy if exists "study_progress is owner updatable" on public.study_progress;
create policy "study_progress is owner updatable"
  on public.study_progress for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.cards
      join public.sets on sets.id = cards.set_id
      where cards.id = study_progress.card_id and sets.user_id = auth.uid()
    )
  );

drop policy if exists "study_progress is owner deletable" on public.study_progress;
create policy "study_progress is owner deletable"
  on public.study_progress for delete
  using (user_id = auth.uid());

-- Migration for databases created before the seen/review/mastered staging:
-- relax the old check, map 'reviewing' onto the new stages, re-add the check.
alter table public.study_progress drop constraint if exists study_progress_status_check;
update public.study_progress set status = 'seen'
  where status = 'reviewing' and phase = 'multiple_choice';
update public.study_progress set status = 'review'
  where status = 'reviewing' and phase = 'written';
alter table public.study_progress add constraint study_progress_status_check
  check (status in ('seen', 'review', 'mastered'));
alter table public.study_progress alter column status set default 'seen';

-- Folders group sets inside a user's library. Deleting a folder keeps its
-- sets (folder_id nulls out via the FK) so no cards are ever lost.
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid references public.folders (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Migration for databases created before nesting existed.
alter table public.folders add column if not exists parent_id uuid references public.folders (id) on delete cascade;

alter table public.sets add column if not exists folder_id uuid references public.folders (id) on delete set null;

create index if not exists folders_user_idx on public.folders (user_id, position);
create index if not exists folders_parent_idx on public.folders (parent_id);

alter table public.folders enable row level security;

drop policy if exists "folders are owner readable" on public.folders;
create policy "folders are owner readable"
  on public.folders for select
  using (auth.uid() = user_id);

drop policy if exists "folders are owner writable" on public.folders;
create policy "folders are owner writable"
  on public.folders for insert
  with check (auth.uid() = user_id);

drop policy if exists "folders are owner updatable" on public.folders;
create policy "folders are owner updatable"
  on public.folders for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "folders are owner deletable" on public.folders;
create policy "folders are owner deletable"
  on public.folders for delete
  using (auth.uid() = user_id);

-- Coin ledger: append-only (no update/delete policy at all, by design —
-- this is what makes earned coins survive Reset Progress / prevents
-- retroactive tampering, not just app-level convention).
create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null,
  reason text not null,
  card_id uuid references public.cards (id) on delete set null,
  set_id uuid references public.sets (id) on delete set null,
  -- Set only for one-time-only awards (the seen/review/mastered stage
  -- bonuses), as `${user_id}:${card_id}:${reason}`; left null for every
  -- other transaction. A plain (non-partial) unique index on this column
  -- gives exactly-once semantics for those rows via upsert+onConflict —
  -- Postgres doesn't match ON CONFLICT against a partial index unless the
  -- same WHERE predicate is repeated in the conflict clause, which the
  -- Supabase client has no way to do, so this column exists specifically
  -- to sidestep that. NULLs never collide in a unique index, so ordinary
  -- (non-deduped) rows are unaffected.
  dedupe_key text,
  created_at timestamptz not null default now()
);

create index if not exists coin_transactions_user_idx on public.coin_transactions (user_id);

-- Migration for databases created before dedupe_key existed.
alter table public.coin_transactions add column if not exists dedupe_key text;
drop index if exists coin_transactions_stage_dedupe;

create unique index if not exists coin_transactions_dedupe_key_idx
  on public.coin_transactions (dedupe_key);

alter table public.coin_transactions enable row level security;

drop policy if exists "coin_transactions are owner readable" on public.coin_transactions;
create policy "coin_transactions are owner readable"
  on public.coin_transactions for select
  using (auth.uid() = user_id);

drop policy if exists "coin_transactions are owner writable" on public.coin_transactions;
create policy "coin_transactions are owner writable"
  on public.coin_transactions for insert
  with check (auth.uid() = user_id);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  equipped_skin text not null default 'default'
);

alter table public.profiles enable row level security;

drop policy if exists "profiles are owner readable" on public.profiles;
create policy "profiles are owner readable"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "profiles are owner writable" on public.profiles;
create policy "profiles are owner writable"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "profiles are owner updatable" on public.profiles;
create policy "profiles are owner updatable"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.unlocked_skins (
  user_id uuid not null references auth.users (id) on delete cascade,
  skin_id text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, skin_id)
);

alter table public.unlocked_skins enable row level security;

drop policy if exists "unlocked_skins are owner readable" on public.unlocked_skins;
create policy "unlocked_skins are owner readable"
  on public.unlocked_skins for select
  using (auth.uid() = user_id);

drop policy if exists "unlocked_skins are owner writable" on public.unlocked_skins;
create policy "unlocked_skins are owner writable"
  on public.unlocked_skins for insert
  with check (auth.uid() = user_id);

-- Optional photo attached to a card, stored as a path inside the
-- `card-images` bucket below (not a full URL) so it can be re-derived if the
-- project URL ever changes.
alter table public.cards add column if not exists image_path text;

-- Card images bucket: public read (photos aren't sensitive, and public URLs
-- avoid a signed-URL round trip on every study/test/learn render), writes
-- restricted to the owning user via their uid as the first path segment
-- (`{user_id}/...`).
insert into storage.buckets (id, name, public)
values ('card-images', 'card-images', true)
on conflict (id) do nothing;

drop policy if exists "card images are publicly readable" on storage.objects;
create policy "card images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'card-images');

drop policy if exists "card images are owner writable" on storage.objects;
create policy "card images are owner writable"
  on storage.objects for insert
  with check (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "card images are owner updatable" on storage.objects;
create policy "card images are owner updatable"
  on storage.objects for update
  using (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "card images are owner deletable" on storage.objects;
create policy "card images are owner deletable"
  on storage.objects for delete
  using (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Author-supplied wrong multiple-choice answers for a card (pasted in
-- alongside the term/definition), used instead of randomly-drawn distractors
-- when present. Null/empty means "fall back to the pooled distractor logic".
alter table public.cards add column if not exists distractors text[];
