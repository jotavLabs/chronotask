-- ─────────────────────────────────────────────────────────────────────────────
-- Routine App — espelho de sincronização no Supabase (Postgres)
-- Cole este script inteiro no SQL Editor do seu projeto e rode uma vez.
--
-- Modelo: o app é local-first; a nuvem é um ESPELHO. Cada linha pertence a um
-- usuário (user_id). updated_at é TEXT em ISO-8601 (mesmo formato dos gatilhos do
-- SQLite local), permitindo comparação lexicográfica e last-write-wins.
-- A segurança vem do RLS por user_id — a anon key do app é pública por design.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.categories (
  id          bigint primary key,
  name        text not null,
  cut_order   integer,
  tie_group   text,
  protected   integer not null default 0,
  color       text,
  updated_at  text,
  deleted     integer not null default 0,
  user_id     uuid not null default auth.uid()
);

create table if not exists public.routine_blocks (
  id           bigint primary key,
  day_label    text not null,
  start        text not null,
  "end"        text not null,
  duration_min integer not null,
  activity     text not null,
  category_id  bigint,
  note         text,
  sort_order   integer not null default 0,
  topic        text,
  updated_at   text,
  deleted      integer not null default 0,
  user_id      uuid not null default auth.uid()
);

create table if not exists public.monthly_routines (
  id              bigint primary key,
  name            text not null,
  window_start_day integer not null,
  window_end_day  integer not null,
  duration_min    integer not null,
  scheduled_date  text,
  last_done       text,
  suggested_block text,
  category_id     bigint,
  updated_at      text,
  deleted         integer not null default 0,
  user_id         uuid not null default auth.uid()
);

create table if not exists public.events (
  id           bigint primary key,
  date         text not null,
  start        text not null,
  "end"        text not null,
  title        text not null,
  category_id  bigint,
  duration_min integer not null,
  priority     text,
  updated_at   text,
  deleted      integer not null default 0,
  user_id      uuid not null default auth.uid()
);

create table if not exists public.holidays (
  id         bigint primary key,
  date       text not null,
  name       text not null,
  type       text not null,
  updated_at text,
  deleted    integer not null default 0,
  user_id    uuid not null default auth.uid()
);

create table if not exists public.completions (
  id         bigint primary key,
  date       text not null,
  ref_type   text not null,
  ref_id     integer not null,
  done       integer not null default 0,
  value_note text,
  logged_at  text not null,
  updated_at text,
  deleted    integer not null default 0,
  user_id    uuid not null default auth.uid()
);

create table if not exists public.training_days (
  id         bigint primary key,
  label      text not null,
  weekday    text not null,
  updated_at text,
  deleted    integer not null default 0,
  user_id    uuid not null default auth.uid()
);

create table if not exists public.exercises (
  id              bigint primary key,
  training_day_id bigint not null,
  name            text not null,
  pattern         text,
  type            text,
  sets            text,
  reps            text,
  rest            text,
  ladder          text,
  note            text,
  sort_order      integer not null default 0,
  updated_at      text,
  deleted         integer not null default 0,
  user_id         uuid not null default auth.uid()
);

create table if not exists public.exercise_logs (
  id           bigint primary key,
  exercise_id  bigint not null,
  date         text not null,
  set_number   integer not null,
  reps         integer,
  hold_seconds integer,
  note         text,
  logged_at    text not null,
  updated_at   text,
  deleted      integer not null default 0,
  user_id      uuid not null default auth.uid()
);

-- ─── RLS: cada usuário só enxerga e grava as próprias linhas ──────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'categories','routine_blocks','monthly_routines','events','holidays',
    'completions','training_days','exercises','exercise_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists owner_all on public.%I;', t);
    execute format(
      'create policy owner_all on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t
    );
    -- índice para o pull incremental por updated_at
    execute format('create index if not exists %I on public.%I (user_id, updated_at);', t || '_user_updated_idx', t);
  end loop;
end $$;
