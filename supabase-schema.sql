-- LangWorld Database Schema
-- Run this in Supabase SQL Editor (https://ydigtdvkyqpzfbkewdrq.supabase.co)

-- 1. Profiles — extends Supabase auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_emoji text not null default '🦊',
  pin_code text, -- 4-digit PIN for kid accounts
  role text not null default 'player' check (role in ('player', 'teacher', 'parent')),
  native_language text not null default 'bg',
  target_language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Progress — synced from Zustand localStorage
create table progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  total_points integer not null default 0,
  coins integer not null default 0,
  energy integer not null default 100,
  max_energy integer not null default 100,
  daily_streak integer not null default 0,
  last_play_date text not null default '',
  today_games_played integer not null default 0,
  daily_goal_target integer not null default 3,
  unlocked_topics text[] not null default '{animals}',
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- 3. Game results — individual game completions
create table game_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  topic_id text not null,
  game_type text not null,
  score integer not null,
  max_score integer not null,
  mistakes integer not null default 0,
  completed_at timestamptz not null default now()
);

-- 4. Word mastery — per-word learning progress
create table word_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  word_id text not null,
  correct integer not null default 0,
  wrong integer not null default 0,
  streak integer not null default 0,
  last_seen timestamptz,
  unique(user_id, word_id)
);

-- 5. Classrooms — for teacher/B2B features (future)
create table classrooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  join_code text not null unique, -- 6-char code for students to join
  target_language text not null default 'en',
  created_at timestamptz not null default now()
);

-- 6. Classroom members
create table classroom_members (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references classrooms(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(classroom_id, user_id)
);

-- Indexes for common queries
create index idx_game_results_user on game_results(user_id);
create index idx_game_results_topic on game_results(user_id, topic_id);
create index idx_word_mastery_user on word_mastery(user_id);
create index idx_classroom_members_user on classroom_members(user_id);
create index idx_classroom_join_code on classrooms(join_code);

-- RLS Policies

-- Profiles: users can read/update their own profile
alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Progress: users can read/write their own progress
alter table progress enable row level security;

create policy "Users can view own progress"
  on progress for select using (auth.uid() = user_id);

create policy "Users can update own progress"
  on progress for update using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on progress for insert with check (auth.uid() = user_id);

-- Game results: users can read/write their own
alter table game_results enable row level security;

create policy "Users can view own game results"
  on game_results for select using (auth.uid() = user_id);

create policy "Users can insert own game results"
  on game_results for insert with check (auth.uid() = user_id);

-- Word mastery: users can read/write their own
alter table word_mastery enable row level security;

create policy "Users can view own word mastery"
  on word_mastery for select using (auth.uid() = user_id);

create policy "Users can upsert own word mastery"
  on word_mastery for insert with check (auth.uid() = user_id);

create policy "Users can update own word mastery"
  on word_mastery for update using (auth.uid() = user_id);

-- Classrooms: teachers can manage, members can view
alter table classrooms enable row level security;

create policy "Teachers can manage own classrooms"
  on classrooms for all using (auth.uid() = teacher_id);

create policy "Members can view their classrooms"
  on classrooms for select using (
    id in (select classroom_id from classroom_members where user_id = auth.uid())
  );

-- Classroom members
alter table classroom_members enable row level security;

create policy "Teachers can manage classroom members"
  on classroom_members for all using (
    classroom_id in (select id from classrooms where teacher_id = auth.uid())
  );

create policy "Users can view own memberships"
  on classroom_members for select using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));

  insert into progress (user_id)
  values (new.id);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
