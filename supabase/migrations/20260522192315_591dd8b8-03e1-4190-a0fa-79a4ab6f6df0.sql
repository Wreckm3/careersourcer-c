
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- User progress
create table public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  selected_path text,
  completed_sessions jsonb not null default '[]'::jsonb,
  streak_current integer not null default 0,
  streak_last_date date,
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;

create policy "Users can view their own progress"
  on public.user_progress for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own progress"
  on public.user_progress for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own progress"
  on public.user_progress for update
  to authenticated
  using (auth.uid() = user_id);

create trigger user_progress_set_updated_at
  before update on public.user_progress
  for each row execute function public.set_updated_at();
