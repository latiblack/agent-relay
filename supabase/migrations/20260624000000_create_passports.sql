-- Agent Relay - Passports table
-- Stores user passport data with wallet address and guild assignment

create table if not exists public.passports (
  id            bigint generated always as identity primary key,
  passport_id   text not null unique,
  relay_key     text not null unique,
  wallet_address text not null,
  nametag       text,
  guild         text not null,
  quests_completed integer not null default 0,
  total_xp      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Index for looking up by wallet address
create index if not exists idx_passports_wallet on public.passports(wallet_address);

-- Index for relay key lookups
create index if not exists idx_passports_relay_key on public.passports(relay_key);

-- Index for passport ID lookups
create index if not exists idx_passports_passport_id on public.passports(passport_id);

-- Row level security: service role only (agent backend)
alter table public.passports enable row level security;

-- Only allow the service role (backend) to access
create policy "Service role can manage passports"
  on public.passports
  for all
  to service_role
  using (true)
  with check (true);

-- Auto-update updated_at on row modification
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_passports_updated_at
  before update on public.passports
  for each row
  execute function public.update_updated_at();
