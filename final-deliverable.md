# Ethan Moon Task Manager Assessment

## Overview

NextPlay Task Board is a responsive Kanban-style task manager built as a static web application with Supabase-backed guest persistence. The interface uses a clean operational layout inspired by Linear and Asana: a compact workspace sidebar, summary stats, clear column hierarchy, and task cards designed for fast scanning.

## Live Frontend App

https://np-kanban-assessment.vercel.app

## GitHub Repository

https://github.com/emoon0108/np-kanban-assessment

## Design Decisions

The board is intentionally dense and work-focused rather than marketing-oriented. Columns stay visually distinct through status color dots, count badges, and contained drop zones. Cards prioritize the task title, priority, labels, due date, comments/activity context, and assignee so users can understand the board at a glance. The app includes responsive behavior for smaller screens by preserving horizontal board scanning while stacking controls and sidebar content.

## Database Schema

```sql
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
```

## Local Setup

1. Clone the GitHub repository.
2. Create a free Supabase project.
3. Enable anonymous sign-ins in Supabase Auth.
4. Run the schema SQL above in the Supabase SQL editor.
5. Add the Supabase project URL and public anon key at the top of `app.js`.
6. Start a local static server:

```bash
python3 -m http.server 4173
```

7. Open `http://localhost:4173`.

## Advanced Features Built

- Team members and assignees: users can add teammates with color-coded avatars and assign one member to each task.
- Labels/tags: task labels appear as compact pills and are included in search.
- Task comments: each task has timestamped comments in its detail modal.
- Task activity log: task creation, movement, assignment, priority, title, due-date changes, and comments are tracked in a timeline.
- Due date indicators: due-soon and overdue tasks are highlighted directly on cards.
- Search and filtering: users can search across task content and filter by priority, assignee, and label.
- Board summary/stats: the sidebar shows total tasks, completed tasks, and overdue tasks.
- Local fallback mode: if Supabase credentials are not configured, the app runs from browser local storage for easy review of the UI.

## Tradeoffs and Future Improvements

The app calls Supabase directly from the frontend, which keeps the project simple and appropriate for the assessment scope. With more time, I would add multi-assignee support, editable/deletable comments, optimistic update rollback for failed drops, keyboard-accessible drag alternatives, and automated end-to-end tests across two anonymous guest sessions.
