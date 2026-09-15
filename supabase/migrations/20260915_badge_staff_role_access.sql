-- Already applied to the connected Forgeworks Supabase project.
-- Keeps legacy badge/admin RPCs compatible with the modern staff_role system.

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = 'public', 'pg_temp'
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.is_blocked, false) = false
      and (
        p.is_admin = true
        or p.staff_role in ('owner', 'moderator')
      )
  );
$$;

comment on function public.is_current_user_admin() is
  'Compatibility helper for administrative RPCs. Accepts legacy is_admin or modern owner/moderator staff roles, while blocking suspended accounts.';
