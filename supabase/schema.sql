-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Invite codes
create table public.invite_codes (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  created_at timestamptz default now()
);
alter table public.invite_codes enable row level security;
create policy "Anyone can read invite codes" on public.invite_codes for select using (true);
create policy "Auth users can update invite codes" on public.invite_codes for update using (auth.uid() is not null);

-- Sample invite codes (insert 10 default codes)
insert into public.invite_codes (code) values
  ('TSA-2026-ALPHA'), ('TSA-2026-BETA'), ('TSA-2026-GAMMA'),
  ('TSA-2026-DELTA'), ('TSA-2026-EPSILON'), ('TSA-2026-ZETA'),
  ('TSA-2026-ETA'), ('TSA-2026-THETA'), ('TSA-2026-IOTA'),
  ('TSA-2026-KAPPA');

-- Trades
create table public.trades (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  ticker text not null,
  direction text check (direction in ('long', 'short')),
  setup_type text not null,
  catalyst text,
  key_level text,
  strat_setup text,
  risk_amount decimal(10,2),
  entry_price decimal(10,4),
  exit_price decimal(10,4),
  contracts integer,
  premium_paid decimal(10,2),
  pnl decimal(10,2),
  notes text,
  screenshot_urls text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.trades enable row level security;
create policy "Users can CRUD own trades" on public.trades for all using (auth.uid() = user_id);

-- Journal entries
create table public.journal_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  trade_id uuid references public.trades(id) on delete set null,
  date date not null default current_date,
  title text,
  content text not null,
  mood text check (mood in ('confident', 'neutral', 'anxious', 'frustrated')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.journal_entries enable row level security;
create policy "Users can CRUD own journal entries" on public.journal_entries for all using (auth.uid() = user_id);
