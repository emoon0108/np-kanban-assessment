create extension if not exists pgcrypto;

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  color text not null default '#2563eb',
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) > 0),
  description text default '',
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'in_review', 'done')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_date date,
  labels jsonb not null default '[]'::jsonb,
  assignee_id uuid references public.team_members(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(trim(message)) > 0),
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;
alter table public.team_members enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_activity enable row level security;

drop policy if exists "Guests can read their own tasks" on public.tasks;
drop policy if exists "Guests can create their own tasks" on public.tasks;
drop policy if exists "Guests can update their own tasks" on public.tasks;
drop policy if exists "Guests can delete their own tasks" on public.tasks;
drop policy if exists "Guests can read their own team members" on public.team_members;
drop policy if exists "Guests can create their own team members" on public.team_members;
drop policy if exists "Guests can update their own team members" on public.team_members;
drop policy if exists "Guests can delete their own team members" on public.team_members;
drop policy if exists "Guests can read comments on their own tasks" on public.task_comments;
drop policy if exists "Guests can create comments on their own tasks" on public.task_comments;
drop policy if exists "Guests can delete their own comments" on public.task_comments;
drop policy if exists "Guests can read activity on their own tasks" on public.task_activity;
drop policy if exists "Guests can create activity on their own tasks" on public.task_activity;

create policy "Guests can read their own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Guests can create their own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Guests can update their own tasks"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Guests can delete their own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

create policy "Guests can read their own team members"
  on public.team_members for select
  using (auth.uid() = user_id);

create policy "Guests can create their own team members"
  on public.team_members for insert
  with check (auth.uid() = user_id);

create policy "Guests can update their own team members"
  on public.team_members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Guests can delete their own team members"
  on public.team_members for delete
  using (auth.uid() = user_id);

create policy "Guests can read comments on their own tasks"
  on public.task_comments for select
  using (auth.uid() = user_id);

create policy "Guests can create comments on their own tasks"
  on public.task_comments for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.tasks
      where tasks.id = task_comments.task_id
      and tasks.user_id = auth.uid()
    )
  );

create policy "Guests can delete their own comments"
  on public.task_comments for delete
  using (auth.uid() = user_id);

create policy "Guests can read activity on their own tasks"
  on public.task_activity for select
  using (auth.uid() = user_id);

create policy "Guests can create activity on their own tasks"
  on public.task_activity for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.tasks
      where tasks.id = task_activity.task_id
      and tasks.user_id = auth.uid()
    )
  );

create index if not exists tasks_user_id_status_idx on public.tasks(user_id, status);
create index if not exists tasks_user_id_due_date_idx on public.tasks(user_id, due_date);
create index if not exists team_members_user_id_idx on public.team_members(user_id);
create index if not exists task_comments_task_id_created_at_idx on public.task_comments(task_id, created_at);
create index if not exists task_activity_task_id_created_at_idx on public.task_activity(task_id, created_at desc);
