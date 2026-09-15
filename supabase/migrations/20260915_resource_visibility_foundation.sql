-- Already applied to the connected Forgeworks Supabase project.
-- Keep this migration in source control so schema history matches production.

create or replace function public.can_view_resource(
  p_owner_id uuid,
  p_visibility text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() = p_owner_id
    or p_visibility = 'public'
    or (
      p_visibility = 'followers'
      and auth.uid() is not null
      and exists (
        select 1
        from public.profile_follows pf
        where pf.follower_id = auth.uid()
          and pf.following_id = p_owner_id
      )
    );
$$;

alter table public.bots add column if not exists visibility text not null default 'public';
update public.bots b
set visibility = case
  when p.visibility in ('public', 'followers', 'private') then p.visibility
  else 'public'
end
from public.profiles p
where p.id = b.user_id;
alter table public.bots drop constraint if exists bots_visibility_check;
alter table public.bots add constraint bots_visibility_check
  check (visibility in ('public', 'followers', 'private'));

alter table public.creator_pages add column if not exists visibility text not null default 'private';
update public.creator_pages
set visibility = case when is_published then 'public' else 'private' end;
alter table public.creator_pages drop constraint if exists creator_pages_visibility_check;
alter table public.creator_pages add constraint creator_pages_visibility_check
  check (visibility in ('public', 'followers', 'private'));

alter table public.request_forms add column if not exists visibility text not null default 'public';
alter table public.request_forms drop constraint if exists request_forms_visibility_check;
alter table public.request_forms add constraint request_forms_visibility_check
  check (visibility in ('public', 'followers', 'private'));

alter table public.atlas_worlds drop constraint if exists atlas_worlds_visibility_check;
alter table public.atlas_worlds add constraint atlas_worlds_visibility_check
  check (visibility in ('public', 'followers', 'private'));

drop policy if exists "Public can view bots on published profiles" on public.bots;
create policy "Bots respect resource visibility"
on public.bots for select to public
using (deleted_at is null and public.can_view_resource(user_id, visibility));

drop policy if exists "Published creator pages are viewable by everyone" on public.creator_pages;
create policy "Creator pages respect publication and visibility"
on public.creator_pages for select to public
using (
  auth.uid() = user_id
  or (
    deleted_at is null
    and is_published = true
    and public.can_view_resource(user_id, visibility)
  )
);

drop policy if exists "Public can select shared Atlas worlds" on public.atlas_worlds;
create policy "Atlas worlds respect resource visibility"
on public.atlas_worlds for select to public
using (deleted_at is null and public.can_view_resource(user_id, visibility));
