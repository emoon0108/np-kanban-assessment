alter table public.tasks
  alter column user_id set default auth.uid();

alter table public.team_members
  alter column user_id set default auth.uid();

alter table public.task_comments
  alter column user_id set default auth.uid();

alter table public.task_activity
  alter column user_id set default auth.uid();
