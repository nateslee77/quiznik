-- Per-answer event log (Test + Learn modes only — the two modes with an
-- explicit "submit an answer" moment). Powers the daily activity heatmap
-- and "today's stats" panel; nothing else derives daily answer history
-- today (study_progress only keeps each card's *latest* state).
--
-- Append-only, same pattern as coin_transactions: no update/delete policy
-- at all, by design.
create table if not exists public.study_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  set_id uuid references public.sets (id) on delete set null,
  card_id uuid references public.cards (id) on delete set null,
  mode text not null check (mode in ('test', 'learn')),
  correct boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists study_events_user_created_idx on public.study_events (user_id, created_at desc);

alter table public.study_events enable row level security;

drop policy if exists "study_events are owner readable" on public.study_events;
create policy "study_events are owner readable"
  on public.study_events for select
  using (auth.uid() = user_id);

drop policy if exists "study_events are owner writable" on public.study_events;
create policy "study_events are owner writable"
  on public.study_events for insert
  with check (auth.uid() = user_id);
