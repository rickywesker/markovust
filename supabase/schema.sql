-- profiles table (extends Supabase Auth)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  student_id text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- questions table
create table questions (
  id serial primary key,
  code text not null,
  category integer not null,
  problem text not null,
  choices_a text,
  choices_b text,
  choices_c text,
  choices_d text,
  choices_e text,
  choices_f text,
  answer text not null,
  solutions text,
  difficulty integer not null default 1,
  problem_images text[] default '{}',
  solution_images text[] default '{}'
);

alter table questions enable row level security;
create policy "Authenticated users can read questions" on questions for select to authenticated using (true);

-- user_answers table
create table user_answers (
  id serial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id integer not null references questions(id) on delete cascade,
  answer text not null,
  is_correct boolean not null,
  created_at timestamptz default now()
);

alter table user_answers enable row level security;
create policy "Users can insert own answers" on user_answers for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can view own answers" on user_answers for select to authenticated using (auth.uid() = user_id);

-- Note: Profile creation is handled in AuthContext.jsx on SIGNED_IN event
-- (the trigger approach caused "Database error saving new user" during signup)
