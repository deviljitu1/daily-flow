# Work Tracking Expansion Plan

Adding a full client/project layer plus richer task metadata and collaboration on top of the existing task + time system.

## 1. Database changes

New tables (all with RLS, admin-full + team-scoped policies, `service_role` grants):

- `clients` — name, company, contact_email, contact_phone, hourly_rate, notes, is_active
- `projects` — client_id, name, description, status (Active/On Hold/Completed), deadline, budget_hours
- `task_comments` — task_id, user_id, content, mentions (uuid[])
- `task_attachments` — task_id, uploaded_by, file_path, file_name, size
- `recurring_task_templates` — title, description, category, assignee_id, client_id, project_id, priority, target_minutes, cadence (daily/weekly/monthly), next_run_at, is_active
- `report_share_links` — client_id, token, expires_at, created_by

Extend `tasks` with: `client_id`, `project_id`, `priority` (Low/Medium/High/Urgent), `due_date`, `is_billable`, `hourly_rate_override`, `approval_status` (Not Required / Pending / Approved / Rejected), `approved_by`, `approved_at`, `recurring_template_id`.

New storage bucket: `task-attachments` (private, signed URLs, owner-scoped policies).

## 2. Edge functions

- `run-recurring-tasks` — pg_cron job (daily 00:05 UTC) that materializes due templates into real tasks.
- `client-report` — public GET, validates share token, returns aggregated hours + deliverables (no auth).

## 3. UI additions

- **Clients page** (admin) — list, add/edit/archive, hourly rate, per-client totals (hours, billable amount, active projects).
- **Projects page** (admin + team read) — grouped by client, deadline + progress bar, project detail with task list.
- **Task dialogs** — new fields: Client, Project (filtered by client), Priority, Due date, Billable toggle, hourly rate override, Recurring toggle + cadence.
- **TaskCard** — priority chip, due-date badge (red if overdue), client/project tag, billable $ indicator, attachments strip, comment count.
- **Task detail drawer** — full comments thread with @mention autocomplete (team members), attachment upload/list with signed URLs.
- **Approvals** — Admin "Awaiting Approval" queue on dashboard; finishing a task by a team member sets approval_status = Pending; admin approves/rejects with note.
- **Recurring templates** page (admin) — CRUD + preview of next run.
- **Reports** — Client filter + billable totals; "Generate share link" button (7/30/90-day expiry) copies public URL.
- **Public report page** `/report/:token` — read-only, unauthenticated, shows client name, date range, hours by team member, completed deliverables (title + project_link).

## 4. Notifications

- @mention in a comment → in-app toast + notification sound (respects existing preferences).
- Task assigned to you, task approved/rejected, task due tomorrow → same channel.

## 5. Migration order (approval batches)

1. Clients + Projects + task extensions + grants/RLS.
2. Comments + Attachments (bucket via storage tool) + policies.
3. Recurring templates + Approvals + Report share links + pg_cron.

## Technical notes

- Reuse `has_role('admin')` for admin-only policies; team members can only see clients/projects tied to tasks assigned to them.
- Billable revenue = `SUM(session_duration_hours * COALESCE(task.hourly_rate_override, project.hourly_rate?, client.hourly_rate))`.
- Recurring cron: `pg_cron` + `pg_net` calling `run-recurring-tasks` with anon key (per Lovable pattern).
- Public report route bypasses auth via the `client-report` edge function returning JSON; page is a thin fetcher.
- Attachments stored under `task-attachments/{task_id}/{uuid}-{filename}`; RLS allows owner + admin + any user assigned to the task.

This is a large build — I'll ship it in the 3 migration batches above so each is reviewable, then wire UI progressively.
