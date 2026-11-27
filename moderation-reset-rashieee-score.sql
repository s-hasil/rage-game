-- ASTRIXAL moderation action: reset the suspicious public leaderboard score.
-- Run manually in Supabase SQL Editor as project owner.
-- This preserves the player's account/profile and all score rows; it changes
-- only that player's recorded scores to zero. Review the preview before UPDATE.

begin;

-- Preview the target and number of score rows that will be reset.
select p.username, count(s.id) as score_rows, max(s.score) as current_best
from public.profiles p
left join public.scores s on s.user_id = p.id
where lower(p.username) = lower('rashieee')
group by p.id, p.username;

-- Reset every recorded score for this exact username so the leaderboard's
-- MAX(score) projection becomes zero. Does not delete the account.
update public.scores s
set score = 0
from public.profiles p
where s.user_id = p.id
  and lower(p.username) = lower('rashieee');

commit;

-- Verify the leaderboard result.
select username, high_score
from public.leaderboard
where lower(username) = lower('rashieee');
