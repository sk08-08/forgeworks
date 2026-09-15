create table if not exists public.changelog_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  version text,
  release_number integer,
  title text not null,
  headline text not null default '',
  summary text not null default '',
  body_markdown text not null default '',
  technical_markdown text not null default '',
  release_type text not null default 'development'
    check (release_type in ('major','minor','patch','development','archive')),
  status text not null default 'draft'
    check (status in ('draft','published')),
  areas text[] not null default '{}',
  change_types text[] not null default '{}',
  is_featured boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists changelog_entries_published_idx
  on public.changelog_entries (published_at desc)
  where status = 'published';

create index if not exists changelog_entries_release_number_idx
  on public.changelog_entries (release_number desc nulls last);

create table if not exists public.changelog_reads (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  last_seen_entry_id uuid references public.changelog_entries(id) on delete set null,
  last_seen_published_at timestamptz,
  seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.changelog_entries enable row level security;
alter table public.changelog_reads enable row level security;

create policy "Published changelog entries are public"
on public.changelog_entries for select to public
using (
  (status = 'published' and published_at is not null and published_at <= now())
  or public.is_current_user_owner()
);

create policy "Owner can create changelog entries"
on public.changelog_entries for insert to authenticated
with check (public.is_current_user_owner());

create policy "Owner can update changelog entries"
on public.changelog_entries for update to authenticated
using (public.is_current_user_owner())
with check (public.is_current_user_owner());

create policy "Owner can delete changelog entries"
on public.changelog_entries for delete to authenticated
using (public.is_current_user_owner());

create policy "Users can read their changelog state"
on public.changelog_reads for select to authenticated
using (auth.uid() = user_id);

create policy "Users can create their changelog state"
on public.changelog_reads for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their changelog state"
on public.changelog_reads for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.touch_changelog_updated_at()
returns trigger
language plpgsql
set search_path = 'public', 'pg_temp'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_changelog_entries_updated_at on public.changelog_entries;
create trigger tr_changelog_entries_updated_at
before update on public.changelog_entries
for each row execute function public.touch_changelog_updated_at();

drop trigger if exists tr_changelog_reads_updated_at on public.changelog_reads;
create trigger tr_changelog_reads_updated_at
before update on public.changelog_reads
for each row execute function public.touch_changelog_updated_at();
