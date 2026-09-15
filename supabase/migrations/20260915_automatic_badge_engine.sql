-- Already applied to the connected Forgeworks Supabase project.
-- Automatic badge rules are stored in badge_definitions.metadata->automation.

create or replace function public.badge_metric_value(
  p_profile_id uuid,
  p_metric text
)
returns numeric
language plpgsql
stable
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_value numeric := 0;
begin
  case p_metric
    when 'profile_completeness' then
      select coalesce(profile_completeness, 0)::numeric
      into v_value
      from public.profiles
      where id = p_profile_id;
    when 'active_bots' then
      select count(*)::numeric into v_value
      from public.bots
      where user_id = p_profile_id and deleted_at is null;
    when 'active_forms' then
      select count(*)::numeric into v_value
      from public.request_forms
      where user_id = p_profile_id and deleted_at is null;
    when 'active_creator_pages' then
      select count(*)::numeric into v_value
      from public.creator_pages
      where user_id = p_profile_id and deleted_at is null;
    when 'atlas_worlds' then
      select count(*)::numeric into v_value
      from public.atlas_worlds
      where user_id = p_profile_id and deleted_at is null;
    when 'atlas_lorebooks' then
      select count(*)::numeric into v_value
      from public.atlas_lorebooks
      where user_id = p_profile_id and deleted_at is null;
    when 'atlas_entries' then
      select count(*)::numeric into v_value
      from public.atlas_entries
      where user_id = p_profile_id and deleted_at is null;
    when 'atlas_collections' then
      select count(*)::numeric into v_value
      from public.atlas_collections
      where user_id = p_profile_id and deleted_at is null;
    when 'atlas_resources' then
      select (
        (select count(*) from public.atlas_worlds where user_id = p_profile_id and deleted_at is null)
        + (select count(*) from public.atlas_lorebooks where user_id = p_profile_id and deleted_at is null)
        + (select count(*) from public.atlas_entries where user_id = p_profile_id and deleted_at is null)
        + (select count(*) from public.atlas_collections where user_id = p_profile_id and deleted_at is null)
      )::numeric into v_value;
    when 'account_age_days' then
      select greatest(0, extract(epoch from (now() - created_at)) / 86400)::numeric
      into v_value
      from public.profiles
      where id = p_profile_id;
    else
      v_value := 0;
  end case;

  return coalesce(v_value, 0);
end;
$$;

create or replace function public.badge_rule_matches(
  p_profile_id uuid,
  p_rule jsonb
)
returns boolean
language plpgsql
stable
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_type text;
  v_metric text;
  v_threshold numeric;
  v_before timestamptz;
  v_created_at timestamptz;
begin
  if p_rule is null or coalesce((p_rule->>'enabled')::boolean, false) = false then
    return false;
  end if;

  v_type := coalesce(p_rule->>'type', 'metric_threshold');

  if v_type = 'metric_threshold' then
    v_metric := nullif(trim(p_rule->>'metric'), '');
    v_threshold := coalesce(nullif(p_rule->>'threshold', '')::numeric, 1);

    if v_metric is null then
      return false;
    end if;

    return public.badge_metric_value(p_profile_id, v_metric) >= v_threshold;
  end if;

  if v_type = 'created_before' then
    if nullif(trim(p_rule->>'before'), '') is null then
      return false;
    end if;

    begin
      v_before := (p_rule->>'before')::timestamptz;
    exception when others then
      return false;
    end;

    select created_at into v_created_at
    from public.profiles
    where id = p_profile_id;

    return v_created_at is not null and v_created_at < v_before;
  end if;

  return false;
end;
$$;

create or replace function public.evaluate_profile_badges(p_profile_id uuid)
returns integer
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_badge record;
  v_inserted integer := 0;
  v_rows integer := 0;
  v_rule jsonb;
begin
  if p_profile_id is null then
    return 0;
  end if;

  for v_badge in
    select slug, metadata
    from public.badge_definitions
    where is_active = true
      and is_manual_only = false
      and coalesce((metadata #>> '{automation,enabled}')::boolean, false) = true
  loop
    v_rule := v_badge.metadata->'automation';

    if public.badge_rule_matches(p_profile_id, v_rule) then
      insert into public.profile_badge_awards (
        profile_id,
        badge_slug,
        awarded_by,
        awarded_at,
        note,
        metadata
      )
      values (
        p_profile_id,
        v_badge.slug,
        null,
        now(),
        'Awarded automatically',
        jsonb_build_object('source', 'automatic', 'rule', v_rule)
      )
      on conflict (profile_id, badge_slug) do nothing;

      get diagnostics v_rows = row_count;
      v_inserted := v_inserted + v_rows;
    end if;
  end loop;

  return v_inserted;
end;
$$;

create or replace function public.reconcile_all_profile_badges()
returns integer
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_profile record;
  v_total integer := 0;
begin
  if not public.is_current_user_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  for v_profile in select id from public.profiles loop
    v_total := v_total + public.evaluate_profile_badges(v_profile.id);
  end loop;

  return v_total;
end;
$$;

create or replace function public.handle_profile_badge_automation()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
  perform public.evaluate_profile_badges(new.id);
  return new;
end;
$$;

create or replace function public.handle_owned_resource_badge_automation()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
  perform public.evaluate_profile_badges(new.user_id);
  return new;
end;
$$;

drop trigger if exists tr_badge_automation_profile on public.profiles;
create trigger tr_badge_automation_profile
after insert or update of profile_completeness on public.profiles
for each row execute function public.handle_profile_badge_automation();

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'bots',
    'request_forms',
    'creator_pages',
    'atlas_worlds',
    'atlas_lorebooks',
    'atlas_entries',
    'atlas_collections'
  ] loop
    execute format('drop trigger if exists tr_badge_automation_resource on public.%I', v_table);
    execute format(
      'create trigger tr_badge_automation_resource after insert or update of deleted_at on public.%I for each row execute function public.handle_owned_resource_badge_automation()',
      v_table
    );
  end loop;
end $$;

update public.badge_definitions
set
  is_system = true,
  is_manual_only = false,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'automation', jsonb_build_object(
      'enabled', true,
      'type', 'metric_threshold',
      'metric', 'profile_completeness',
      'threshold', 100,
      'sticky', true
    )
  )
where slug = 'profile_complete';

update public.badge_definitions
set
  is_system = true,
  is_manual_only = false,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'automation', jsonb_build_object(
      'enabled', true,
      'type', 'metric_threshold',
      'metric', 'active_bots',
      'threshold', 1,
      'sticky', true
    )
  )
where slug = 'bot_creator';

update public.badge_definitions
set
  is_system = true,
  is_manual_only = false,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'automation', jsonb_build_object(
      'enabled', true,
      'type', 'metric_threshold',
      'metric', 'atlas_resources',
      'threshold', 1,
      'sticky', true
    )
  )
where slug = 'atlas_curator';

update public.badge_definitions
set
  is_manual_only = true,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'automation', jsonb_build_object('enabled', false)
  )
where slug in ('community_helper', 'early_adopter');

do $$
declare
  v_profile record;
begin
  for v_profile in select id from public.profiles loop
    perform public.evaluate_profile_badges(v_profile.id);
  end loop;
end $$;
