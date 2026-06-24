-- Enable RLS on passports table
alter table public.passports enable row level security;

-- Create policy for service role access
create policy "Service role can manage passports"
  on public.passports
  for all
  to service_role
  using (true)
  with check (true);

-- Create policy for individual users to read their own passport by wallet
create policy "Users can read their own passport"
  on public.passports
  for select
  using (auth.uid()::text = wallet_address);

-- Add avatar_url column if it doesn't exist
alter table public.passports add column if not exists avatar_url text;
