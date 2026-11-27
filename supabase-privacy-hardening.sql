-- ASTRIXAL privacy hardening.
-- Run this once in Supabase Dashboard > SQL Editor.
-- Keeps the public Top 10 leaderboard, but removes direct public access to raw
-- score rows and profile UUIDs. Existing users and score rows are preserved.

begin;

-- Raw scores: only authenticated players may read their own rows.
drop policy if exists "Scores are publicly readable" on public.scores;
drop policy if exists "Players can read their own scores" on public.scores;
create policy "Players can read their own scores"
on public.scores for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Players can submit their own scores" on public.scores;
create policy "Players can submit their own scores"
on public.scores for insert
to authenticated
with check (auth.uid() = user_id);

revoke all on table public.scores from anon;
grant select, insert on table public.scores to authenticated;

-- Profiles: no anonymous table access; signed-in users can access only their own row.
drop policy if exists "Profiles are publicly readable" on public.profiles;
drop policy if exists "Players can read their own profile" on public.profiles;
create policy "Players can read their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

revoke all on table public.profiles from anon;
grant select, insert, update on table public.profiles to authenticated;

-- Rebuild the public leaderboard as a safe projection. It deliberately omits
-- user_id and exposes only public player names, avatars, and best scores.
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

grant select on public.leaderboard to anon, authenticated;

commit;
