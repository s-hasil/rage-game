-- ASTRIXAL privacy hardening (safe leaderboard projection).
-- Run after confirming the deployed game still loads the leaderboard and profiles.
-- Preserves users, profile rows, avatars, and every score row.
-- This migration does not revoke score INSERT; use the separate finalizer only
-- after a successful end-to-end run has been confirmed.

begin;

-- Remove public access to every raw score row. Signed-in players can read only
-- their own rows. The validated submit_run() SECURITY DEFINER RPC writes scores.
drop policy if exists "Scores are publicly readable" on public.scores;
drop policy if exists "Players can read their own scores" on public.scores;
create policy "Players can read their own scores"
on public.scores for select
to authenticated
using (auth.uid() = user_id);

revoke all on table public.scores from anon;
grant select on table public.scores to authenticated;

-- Keep profile editing and own-profile reads, but stop anonymous enumeration
-- of profile IDs and rows. Public avatars/names are served through leaderboard.
drop policy if exists "Profiles are publicly readable" on public.profiles;
drop policy if exists "Players can read their own profile" on public.profiles;
create policy "Players can read their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

revoke all on table public.profiles from anon;
grant select, insert, update on table public.profiles to authenticated;

-- The frontend uses public.leaderboard. Keep its public fields only:
-- username, avatar_url, high_score, last_played. No UUIDs or raw run rows.
drop view if exists public.leaderboard;
create view public.leaderboard
with (security_invoker = false)
as
select
  p.username,
  p.avatar_url,
  max(s.score)::integer as high_score,
  max(s.created_at) as last_played
from public.profiles p
join public.scores s on s.user_id = p.id
group by p.id, p.username, p.avatar_url;

revoke all on public.leaderboard from public;
grant select on public.leaderboard to anon, authenticated;

commit;

-- Optional schema cache refresh:
-- notify pgrst, 'reload schema';
