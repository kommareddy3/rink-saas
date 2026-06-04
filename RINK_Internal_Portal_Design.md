# RINK Internal Portal — Design & Architecture Plan

**Working name:** RINK Internal (employee portal)
**Audience:** RINK Global Services Inc. employees & contractors only
**Status:** Design for approval (v1)
**Owner:** Nikhila Vintha (Founder)

A private, employee-only web app for **timesheet entry**, **leave/PTO requests
& balances**, **manager/admin approvals**, and a **benefits info page**.
Delivered as a **separate private repository**, reusing the proven RINK stack
(React + Vite + Supabase) so it's familiar to maintain but fully isolated from
the public site and the customer product.

---

## 1. Goals & non-goals

**Goals (v1)**
- Employees log daily/weekly hours on a calendar and submit each period.
- Employees request time off, see balances by type, and view a team leave calendar.
- Managers/admins approve or reject submitted timesheets and leave requests.
- Employees can read a benefits & policies page.
- Access is restricted to internal staff only (no customer or public access).

**Non-goals (v1 — candidates for later)**
- Payroll processing or direct payroll-provider integration.
- Invoicing/billing of client hours.
- Performance reviews, expense reports, document e-signing.
- Mobile native apps (the web app will be responsive instead).

---

## 2. Tech stack & why

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React 19 + Vite + Tailwind | Same as the RINK product — fast, familiar, reusable UI patterns. |
| Auth | Supabase Auth | Already used at RINK; gives SSO/passkeys/JWT for free. **Separate Supabase project** from customers so internal accounts never mix. |
| Database | Supabase Postgres + Row-Level Security (RLS) | Employee data is sensitive; RLS enforces "you only see your own rows; managers see their team" at the database layer. |
| API | Supabase client direct + a thin Express gateway for privileged actions | Most reads/writes go straight to Postgres under RLS; admin-only actions (role assignment, approvals on others' rows) go through a small server using the service-role key. |
| Hosting | Vercel (frontend) + Supabase (DB/auth); optional Render for the gateway | Mirrors current RINK deployment. |
| Domain | `internal.rinkglobal.com` (private) | Clearly separated; can be IP-restricted later if desired. |

> **Isolation:** a dedicated Supabase project keeps employee PII (salaries-adjacent
> data, leave records) entirely separate from the customer database.

---

## 3. Access control (employee-only)

Two gates, defense-in-depth:

**Gate 1 — who can authenticate.**
- Sign-in is restricted to an **allowlist**: any `@rinkglobal.com` email, plus an
  explicit `employee_allowlist` table for contractors on other domains.
- A Supabase **Auth Hook / trigger** (or a post-sign-in check) rejects anyone
  not on the allowlist and assigns them an `employee` role on first valid login.
- The founder and designated managers are granted an `admin` / `manager` role.

**Gate 2 — what they can see (RLS).**
- Every table has Row-Level Security. Policies:
  - **employee**: can `select/insert/update` only rows where `user_id = auth.uid()`
    (and only while a timesheet/leave request is still in `draft`/`submitted`).
  - **manager**: can `select` and `approve/reject` rows for employees in their
    `team` (via a `manager_id` link), but cannot edit hours.
  - **admin**: full access; manages roles, balances, holidays, benefits content.

**Roles**

| Role | Can do |
|---|---|
| `employee` | Log/submit own timesheets, request own leave, view own balances, read benefits. |
| `manager` | Everything an employee can, **plus** approve/reject their team's submissions. |
| `admin` (founder) | All of the above, **plus** manage employees, roles, leave balances, holidays, and benefits content. |

Roles live in a `profiles` table (`role` column) and are also mirrored into the
JWT via a custom claim so the frontend and gateway can authorize quickly.

---

## 4. Data model (Postgres)

```
profiles
  id (uuid, = auth.uid())   email   full_name   role            manager_id (uuid, FK profiles)
                                                 employee|manager|admin
  employment_type (w2|c2c)  start_date   weekly_hours_target   active (bool)

employee_allowlist
  email (pk)   note   added_by   created_at        -- contractors not on @rinkglobal.com

projects                                            -- optional tagging for hours
  id   name   client   active

timesheet_periods                                   -- one row per employee per week
  id   user_id   week_start (date)   status         -- draft|submitted|approved|rejected
  submitted_at   approved_by   approved_at   note

timesheet_entries                                   -- the calendar cells
  id   period_id (FK)   user_id   work_date (date)   hours (numeric)
  project_id (FK, nullable)   task   note
  unique(user_id, work_date, project_id)

leave_types
  id   name (PTO|Sick|Unpaid|Bereavement…)   paid (bool)   default_annual_days   color

leave_balances                                      -- per employee per type per year
  id   user_id   leave_type_id   year   allotted_days   used_days   carryover_days

leave_requests
  id   user_id   leave_type_id   start_date   end_date   hours_or_days
  status   reason   approved_by   approved_at   created_at   -- pending|approved|rejected|cancelled

company_holidays
  id   name   holiday_date   region

benefits_content                                    -- admin-editable benefits page
  id   section   title   body (markdown)   order   updated_by   updated_at

audit_log
  id   actor_id   action   entity   entity_id   detail (jsonb)   created_at
```

**Key rules**
- A timesheet is editable only while `draft`; submitting locks entries.
- Approving a leave request decrements the matching `leave_balances.used_days`
  (done in a Postgres function/trigger so balance math is atomic and auditable).
- All approve/reject/role changes write to `audit_log`.

---

## 5. Feature breakdown (v1)

### 5.1 Timesheet calendar
- **Week view** (default) with the 7 days; cells accept hours (e.g. `8`, `4.5`),
  optional project + task + note. Running daily and weekly totals.
- **Month view** for an overview; click a day to edit.
- Target-hours indicator (e.g. 40/week) and over/under highlighting.
- **Submit week** → status `submitted` (locks editing). Manager sees it in their queue.
- Copy-previous-week and "fill standard week" helpers.

### 5.2 Leave / PTO
- **Request leave**: type, date range (half-day supported), reason; shows the
  balance impact before submitting.
- **Balances**: per type (PTO, Sick, Unpaid…), allotted / used / remaining / carryover.
- **Team leave calendar**: who's off and when (respects visibility rules).
- Company holidays surfaced on both calendars.

### 5.3 Approvals (manager/admin)
- **Approvals inbox**: pending timesheets and leave requests for the manager's team.
- Approve / reject with an optional comment; rejection returns the item to the
  employee as `draft`/`rejected` for edits.
- Bulk-approve a week for the whole team.

### 5.4 Benefits info page
- Read-only, admin-editable sections (health, retirement/401k, PTO policy,
  holidays, contacts) rendered from `benefits_content` (markdown).
- Holiday list pulled from `company_holidays`.

### 5.5 Admin
- Manage employees (invite via allowlist, set manager, role, weekly target, active).
- Set annual leave allotments / adjust balances.
- Manage holidays, projects, and benefits content.

---

## 6. App structure (separate repo)

```
rink-internal/
├── src/
│   ├── pages/
│   │   ├── Login.jsx              # employee-only sign-in
│   │   ├── Dashboard.jsx          # my week + my balances + pending items
│   │   ├── Timesheet.jsx          # week/month calendar entry
│   │   ├── Leave.jsx              # request + balances + team calendar
│   │   ├── Approvals.jsx          # manager/admin queue
│   │   ├── Benefits.jsx           # read-only benefits & policies
│   │   └── admin/                 # employees, balances, holidays, benefits editor
│   ├── components/                # Calendar, EntryCell, BalanceCard, ApprovalRow…
│   ├── contexts/AuthContext.jsx   # session + role + allowlist gate
│   ├── lib/supabaseClient.js
│   ├── lib/api.js                 # calls to the privileged gateway
│   └── routes.jsx                 # role-guarded routes
├── server/                        # small Express gateway (service-role actions)
│   └── index.js                   # /approve, /admin/*, role assignment, audit
├── supabase/
│   ├── schema.sql                 # tables above
│   ├── policies.sql               # RLS policies
│   └── functions.sql              # balance + audit triggers
└── README.md / DEPLOYMENT.md
```

Most data access is the Supabase client under RLS; the **gateway** exists only
for actions that must bypass RLS safely (assigning roles, approving others'
rows, editing balances) using the service-role key — never exposed to the browser.

---

## 7. Security & privacy
- RLS on every table; deny-by-default, explicit allow policies per role.
- Service-role key only on the server, never shipped to the client.
- All privileged actions audited in `audit_log`.
- HTTPS only; short-lived JWTs; optional passkeys/SSO (reuse RINK patterns).
- Optional hardening later: IP allowlist / VPN, 2FA enforcement, session timeout
  (mirror the 4-hour idle pattern already used in the product).
- Employee PII isolated in its own Supabase project; least-privilege access.

---

## 8. Phased delivery

**Phase 0 — Foundations (scaffold)**
Repo, Vite app, Supabase project, auth + allowlist gate, roles, `profiles`,
protected routing, app shell/nav.

**Phase 1 — Timesheets**
Schema + RLS for periods/entries, week calendar entry, totals, submit, my-history.

**Phase 2 — Leave & balances**
Leave types/balances/requests schema + RLS, request flow, balance display,
holidays, team leave calendar.

**Phase 3 — Approvals**
Manager queue, approve/reject + comments, balance decrement triggers, audit log.

**Phase 4 — Benefits + Admin**
Benefits content page + editor, employee/role/balance/holiday admin screens.

**Phase 5 — Hardening & launch**
Audit review, RLS test pass, seed real employees, deploy to
`internal.rinkglobal.com`, optional IP/2FA hardening.

---

## 9. Open questions for you
1. **Time unit:** track hours per day (recommended for W2/C2C billing) or just
   present/half/full-day?
2. **Project tagging:** do you want hours tagged to clients/projects in v1, or
   plain daily hours to start?
3. **Approval chain:** single approver (founder) for now, or per-employee
   manager assignment from day one?
4. **Leave types & allotments:** what types and annual day amounts should we seed
   (e.g. PTO 15, Sick 5, Unpaid unlimited)?
5. **Week start:** Monday or Sunday? Time zone for "today" (ET)?
6. **Contractors (C2C):** should they use timesheets only, or leave too?

Once you confirm Section 9, I'll scaffold **Phase 0 + Phase 1** in the new repo.
