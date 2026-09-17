-- ============================================================================
-- Forgeworks - Bio Studio foundation
-- Standalone HTML bio projects with optional Forgeworks Bot/JAI metadata.
-- ============================================================================

create table if not exists public.bio_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null default 'Untitled Bio',

  -- Keep the imported source untouched so users can always compare/recover it.
  original_html text not null default '',
  source_html text not null default '',

  source_kind text not null default 'blank'
    check (source_kind in ('blank', 'paste', 'jai_bridge')),

  -- JAI context is useful to the bridge, but is never required.
  jai_character_id text null,
  jai_character_name text null,

  -- Forgeworks Bots are deliberately optional and secondary.
  bot_id uuid null references public.bots(id) on delete set null,

  source_metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists bio_projects_user_updated_idx
  on public.bio_projects (user_id, updated_at desc)
  where deleted_at is null;

create index if not exists bio_projects_bot_idx
  on public.bio_projects (bot_id)
  where bot_id is not null and deleted_at is null;

create index if not exists bio_projects_jai_character_idx
  on public.bio_projects (user_id, jai_character_id)
  where jai_character_id is not null and deleted_at is null;

alter table public.bio_projects enable row level security;

drop policy if exists "bio_projects_select_own" on public.bio_projects;
create policy "bio_projects_select_own"
  on public.bio_projects
  for select
  using (auth.uid() = user_id);

drop policy if exists "bio_projects_insert_own" on public.bio_projects;
create policy "bio_projects_insert_own"
  on public.bio_projects
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "bio_projects_update_own" on public.bio_projects;
create policy "bio_projects_update_own"
  on public.bio_projects
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "bio_projects_delete_own" on public.bio_projects;
create policy "bio_projects_delete_own"
  on public.bio_projects
  for delete
  using (auth.uid() = user_id);

create or replace function public.touch_bio_projects_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_bio_projects_updated_at on public.bio_projects;
create trigger touch_bio_projects_updated_at
before update on public.bio_projects
for each row
execute function public.touch_bio_projects_updated_at();
