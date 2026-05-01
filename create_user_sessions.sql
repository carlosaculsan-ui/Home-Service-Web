-- Run this in your Supabase SQL Editor

create table if not exists user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('tasker', 'customer')),
  time_in timestamptz not null,
  time_out timestamptz,
  created_at timestamptz default now()
);

create index if not exists user_sessions_user_id_idx on user_sessions(user_id);
create index if not exists user_sessions_time_in_idx on user_sessions(time_in);

alter table user_sessions enable row level security;

-- Admins can read all sessions
create policy "Admin read sessions" on user_sessions
  for select using (
    exists (
      select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Users can insert their own session
create policy "Users insert own session" on user_sessions
  for insert with check (auth.uid() = user_id);

-- Users can update their own open session (set time_out)
create policy "Users update own session" on user_sessions
  for update using (auth.uid() = user_id);
