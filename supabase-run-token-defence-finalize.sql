-- ASTRIXAL Phase 1 rollout step 2.
-- Run ONLY after the matching run-token game.js has been deployed to GitHub Pages
-- and a real authenticated test run successfully saves through submit_run().
-- This prevents clients from bypassing submit_run() with direct score inserts.

begin;
revoke insert on table public.scores from anon, authenticated;
commit;
