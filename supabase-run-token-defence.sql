-- ASTRIXAL Phase 1: server-issued run tokens and server-side score validation.
-- Apply this migration BEFORE deploying the matching game.js client.
-- Existing profiles and scores are preserved. This does not revoke the legacy
-- scores INSERT permission yet; revoke it only after the new client is live.

begin;

create table if not exists public.runs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    started_at timestamptz not null default now(),
    submitted_at timestamptz,
    submitted_score integer,
    constraint runs_submitted_score_range
      check (submitted_score is null or submitted_score between 0 and 1000000)
);

create index if not exists runs_user_started_idx
on public.runs(user_id, started_at desc);

alter table public.runs enable row level security;
revoke all on table public.runs from anon, authenticated;

create or replace function public.start_run()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_run_id uuid;
begin
    if v_user_id is null then
        raise exception 'authentication required' using errcode = '42501';
    end if;

    if exists (
        select 1
        from public.runs r
        where r.user_id = v_user_id
          and r.started_at > now() - interval '3 seconds'
    ) then
        raise exception 'please wait before starting another run' using errcode = 'P0001';
    end if;

    insert into public.runs(user_id)
    values (v_user_id)
    returning id into v_run_id;

    return v_run_id;
end;
$$;

create or replace function public.submit_run(p_run_id uuid, p_score integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_run public.runs%rowtype;
    v_elapsed numeric;
    v_max_score integer;
begin
    if v_user_id is null then
        raise exception 'authentication required' using errcode = '42501';
    end if;

    if p_run_id is null or p_score is null or p_score < 1 or p_score > 1000000 then
        raise exception 'invalid run or score' using errcode = '22023';
    end if;

    select *
      into v_run
      from public.runs r
     where r.id = p_run_id
     for update;

    if not found or v_run.user_id <> v_user_id then
        raise exception 'run not found for this player' using errcode = '42501';
    end if;

    if v_run.submitted_at is not null then
        raise exception 'run has already been submitted' using errcode = 'P0001';
    end if;

    if v_run.started_at < now() - interval '30 minutes' then
        raise exception 'run token expired; start a new run' using errcode = 'P0001';
    end if;

    v_elapsed := greatest(0, extract(epoch from (now() - v_run.started_at)));
    v_max_score := ceil(v_elapsed * 2.5)::integer + 5;

    if p_score > v_max_score then
        raise exception 'score exceeds the maximum allowed for this run duration' using errcode = '22023';
    end if;

    update public.runs
       set submitted_at = now(),
           submitted_score = p_score
     where id = p_run_id;

    insert into public.scores(user_id, score)
    values (v_user_id, p_score);
end;
$$;

revoke all on function public.start_run() from public, anon, authenticated;
revoke all on function public.submit_run(uuid, integer) from public, anon, authenticated;
grant execute on function public.start_run() to authenticated;
grant execute on function public.submit_run(uuid, integer) to authenticated;

commit;
