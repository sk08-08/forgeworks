-- Already applied to the connected Forgeworks Supabase project.
-- A readable World must not leak links to Bots the viewer cannot read.

drop policy if exists "Readable Atlas worlds expose bot links"
  on public.atlas_world_bots;

create policy "Readable Atlas worlds expose visible bot links"
on public.atlas_world_bots
for select
to public
using (
  exists (
    select 1
    from public.atlas_worlds w
    join public.bots b on b.id = atlas_world_bots.bot_id
    where w.id = atlas_world_bots.world_id
      and w.deleted_at is null
      and b.deleted_at is null
      and public.can_view_resource(w.user_id, w.visibility)
      and public.can_view_resource(b.user_id, b.visibility)
  )
);
