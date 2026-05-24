# NextPlay Task Board

A polished Kanban-style task board for the Next Play Games software development assessment. It supports anonymous guest sessions with Supabase, row-level security, task creation/editing/deletion, drag-and-drop status updates, assignees, labels, search, priority filtering, due-date indicators, and board stats.

Live app: https://np-kanban-assessment.vercel.app

## Features

- Four default lanes: To Do, In Progress, In Review, Done
- Native drag-and-drop between lanes with immediate persistence
- Anonymous Supabase Auth guest sign-in
- RLS policies so each guest only sees their own tasks and team members
- Task fields: title, description, status, priority, due date, assignee, labels
- Team member creation with color-coded avatars
- Task comments with timestamps
- Task activity timeline for creation, movement, assignment, priority, rename, and due-date changes
- Search across title, description, labels, priority, and assignee
- Priority, assignee, and label filters
- Overdue/due-soon indicators and board summary stats
- Local demo fallback when Supabase credentials are not configured

## Supabase Setup

1. Create a free Supabase project.
2. In Supabase, enable anonymous sign-ins:
   Authentication -> Sign In / Providers -> Anonymous sign-ins.
3. Open the SQL editor and run [schema.sql](./schema.sql).
4. Copy your project URL and public anon key.
5. Replace the placeholders at the top of [app.js](./app.js):

```js
const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

Only use the public anon key in this frontend. Do not commit a service role key.

The schema creates `tasks`, `team_members`, `task_comments`, and `task_activity` tables with RLS policies scoped to the anonymous guest user.

## Run Locally

This project has no build step.

```bash
cd "/Users/ethanmoon/Computer Science Projects/np-kanban-assessment"
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

You can also open [index.html](./index.html) directly for demo mode, but a local server is closer to the hosted environment.

## Deploy

Any static host works:

- Vercel: import the GitHub repo, use no build command, output directory `.`
- Netlify: deploy the folder, use no build command, publish directory `.`
- Cloudflare Pages: connect the repo, no build command, output directory `.`

After deploying, create a second browser profile or incognito window to verify that two anonymous guests see separate task sets.

## Submission Checklist

- Add real Supabase URL and public anon key in `app.js`
- Run `schema.sql` in Supabase
- Push this repository to GitHub
- Deploy the static site and paste the live URL into `final-deliverable.md`
- Regenerate the Word document with `python3 build_deliverable_docx.py`
