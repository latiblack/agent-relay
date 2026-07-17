-- Agent Relay - Per-quest completion tracking
-- Replaces the single quests_completed counter with a completed_quests JSONB
-- array so each quest's completion is tracked individually and new quests need
-- no schema change (membership check = questId in the array).
-- quests_completed is retained as a cached count (length of the array) for
-- quick guild-stats aggregation.

alter table if exists public.passports
  add column if not exists completed_quests jsonb not null default '[]'::jsonb;

-- Backfill: any passport that already had quests_completed > 0 gets the legacy
-- quest id recorded so historical completions are not lost.
update public.passports
  set completed_quests = '["signal-hunt-01"]'::jsonb
  where quests_completed > 0
    and (completed_quests is null or completed_quests::text = '[]'::jsonb::text);

-- Index for membership queries (optional, cheap for small arrays).
create index if not exists idx_passports_completed_quests
  on public.passports using gin (completed_quests);
