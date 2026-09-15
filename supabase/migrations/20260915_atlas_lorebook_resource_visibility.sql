-- Already applied to the connected Forgeworks Supabase project.

alter table public.atlas_lorebooks
  add column if not exists visibility text not null default 'private';

update public.atlas_lorebooks lb
set visibility = 'public'
where lb.deleted_at is null
  and exists (
    select 1
    from public.creator_page_sections cps
    join public.creator_pages cp on cp.id = cps.page_id
    where cps.kind = 'lorebook_gallery'
      and cps.deleted_at is null
      and cp.deleted_at is null
      and cp.is_published = true
      and cp.user_id = lb.user_id
      and (
        coalesce(jsonb_array_length(coalesce(cps.config -> 'lorebookIds', '[]'::jsonb)), 0) = 0
        or coalesce(cps.config -> 'lorebookIds', '[]'::jsonb) ? lb.id::text
      )
  );

alter table public.atlas_lorebooks
  drop constraint if exists atlas_lorebooks_visibility_check;
alter table public.atlas_lorebooks
  add constraint atlas_lorebooks_visibility_check
  check (visibility in ('public', 'followers', 'private'));

drop policy if exists "Published creator pages can view linked lorebooks"
  on public.atlas_lorebooks;

create policy "Atlas lorebooks respect resource visibility"
on public.atlas_lorebooks
for select
to public
using (
  deleted_at is null
  and public.can_view_resource(user_id, visibility)
);
