# AGENTS.md — Task Breakdown

This file lists every feature that still needs to be built, grouped by the team
member responsible. Each task includes the files to create or modify, and clear
acceptance criteria so you know when the task is done.

Read `CLAUDE.md` first for project context, conventions, and what is already built.

---

## How to use this file

- Pick one task at a time. Do not mix tasks across feature areas in a single change.
- After completing a task, mark it `[x]` and note any decisions made.
- When adding backend endpoints, also add the corresponding method to `frontend/lib/api.ts`
  and the type to `frontend/types/index.ts` if not already present.
- Test every backend endpoint via Swagger UI at `http://localhost:8080/swagger`
  before moving on.

---

## Member 1 — Property manager (Maintenance scheduling)

Owner of: maintenance request lifecycle, work assignment, maintenance history.

### Task M1 — Properties controller

**Files to create:** `backend/PropertyApi/Controllers/PropertiesController.cs`

Endpoints:
- `GET /api/properties` — list all properties managed by the current user
- `GET /api/properties/{id}` — single property with its units
- `POST /api/properties` — create a new property
- `GET /api/properties/{id}/units` — list units for a property
- `POST /api/properties/{id}/units` — add a unit to a property

DTOs already exist in `Dtos.cs`: `PropertyResponse`, `CreatePropertyRequest`,
`UnitResponse`, `CreateUnitRequest`.

Acceptance criteria:
- [ ] All five endpoints return correct HTTP status codes (200, 201, 404)
- [ ] `POST /api/properties/{id}/units` sets `unit.Status = "vacant"` by default
- [ ] `GET /api/properties/{id}` includes a `units` array in the response
- [ ] Swagger UI documents all endpoints

---

### Task M2 — Maintenance dashboard page

**Files to create:**
- `frontend/app/dashboard/maintenance/page.tsx`
- `frontend/components/ui/StatusBadge.tsx`
- `frontend/components/ui/PriorityBadge.tsx`

Build a server-rendered page that:
- Lists all maintenance requests fetched via `maintenanceApi.list()`
- Shows each request as a card with: title, unit number, tenant name, priority badge,
  status badge, and created date
- Has filter tabs for status: All / Open / In progress / Resolved
- Clicking a card links to `/dashboard/maintenance/[id]`

`StatusBadge` maps status strings to Tailwind colour classes:
- `open` → `bg-red-100 text-red-700`
- `in_progress` → `bg-amber-100 text-amber-700`
- `resolved` → `bg-green-100 text-green-700`
- `closed` → `bg-gray-100 text-gray-600`

`PriorityBadge` maps priority strings to colours:
- `emergency` → `bg-red-600 text-white`
- `high` → `bg-orange-100 text-orange-700`
- `medium` → `bg-yellow-100 text-yellow-700`
- `low` → `bg-gray-100 text-gray-600`

Acceptance criteria:
- [ ] Page loads without errors when the backend is running
- [ ] All requests returned by the API are displayed
- [ ] Filter tabs correctly filter the visible list (client-side is fine)
- [ ] `StatusBadge` and `PriorityBadge` are exported and usable by other pages

---

### Task M3 — Maintenance request detail page

**Files to create:** `frontend/app/dashboard/maintenance/[id]/page.tsx`

Build a server-rendered detail page that:
- Fetches the request by ID via `maintenanceApi.get(id)`
- Shows all request fields: title, description, category, priority, status, dates
- Shows the assigned staff member (or "Unassigned")
- Shows the full comment thread with author name and timestamp
- Has a client-side form to add a new comment (calls `maintenanceApi.addComment`)
- Has a dropdown to update request status (calls `maintenanceApi.update`)
- Shows the photo if `s3PhotoKey` is set (fetch a download URL from the backend first —
  add `GET /api/maintenance-requests/{id}/photo-url` endpoint that calls
  `IS3Service.GetDownloadUrlAsync`)

Acceptance criteria:
- [ ] All fields from `MaintenanceRequestResponse` are displayed
- [ ] New comment appears in the thread after submission without a full page reload
- [ ] Status dropdown updates the request and reflects the new status immediately
- [ ] Photo is displayed if present

---

## Member 2 — Tenant portal

Owner of: tenant-facing views, issue submission, lease details.

### Task T1 — Leases controller

**Files to create:** `backend/PropertyApi/Controllers/LeasesController.cs`

Endpoints:
- `GET /api/leases` — list leases; supports `?tenantId=` and `?unitId=` query params
- `GET /api/leases/{id}` — single lease with tenant name and unit number
- `POST /api/leases` — create a new lease (sets linked unit status to `occupied`)
- `PATCH /api/leases/{id}/terminate` — set status to `terminated`, unit back to `vacant`

DTO already exists: `LeaseResponse`, `CreateLeaseRequest`.

Acceptance criteria:
- [ ] `POST /api/leases` returns 400 if the unit already has an active lease
- [ ] `POST /api/leases` sets `units.status = "occupied"` as part of the same transaction
- [ ] `PATCH /api/leases/{id}/terminate` sets `units.status = "vacant"`
- [ ] `GET /api/leases/{id}` response includes `tenantName` and the unit number

---

### Task T2 — Tenant portal page

**Files to create:**
- `frontend/app/dashboard/tenant/page.tsx`
- `frontend/app/dashboard/tenant/new-request/page.tsx`

**Tenant portal main page** (`page.tsx`):
- Shows the tenant's active lease: unit number, property name, monthly rent,
  lease start/end dates, status badge
- Lists all maintenance requests submitted by this tenant
- Each request shows: title, status badge, priority badge, created date
- "Submit new request" button links to `/dashboard/tenant/new-request`

**New request page** (`new-request/page.tsx`):
- Form with fields: Title (text), Description (textarea), Category (select:
  plumbing / electrical / hvac / general), Priority (select: low / medium / high / emergency)
- On submit: calls `maintenanceApi.create(...)`, then redirects to the tenant portal
- Optional photo upload: if a file is selected, call `maintenanceApi.getPhotoUploadUrl`
  then `uploadFileToS3` from `lib/api.ts`, then save the key via `maintenanceApi.update`

Acceptance criteria:
- [ ] Lease details are displayed correctly
- [ ] Maintenance request list is displayed
- [ ] New request form submits successfully and redirects
- [ ] Form validates required fields client-side before submitting
- [ ] Category and priority selects show all valid options

---

### Task T3 — Users controller (profile endpoint)

**Files to create:** `backend/PropertyApi/Controllers/UsersController.cs`

Endpoints:
- `GET /api/users/me` — returns the current user's profile (look up by `cognito_sub`
  from a hardcoded dev value for now; replace with JWT claim later)
- `PATCH /api/users/me` — update `full_name` and `phone`

Acceptance criteria:
- [ ] `GET /api/users/me` returns a `UserResponse`
- [ ] `PATCH /api/users/me` only allows updating `full_name` and `phone`, not `role` or `email`
- [ ] Returns 404 if the cognito_sub does not match any user

---

## Member 3 — Finance / admin

Owner of: invoices, budgets, financial reporting.

### Task F1 — Invoices controller

**Files to create:** `backend/PropertyApi/Controllers/InvoicesController.cs`

Endpoints:
- `GET /api/invoices` — list invoices; supports `?leaseId=` and `?status=` query params
- `GET /api/invoices/{id}` — single invoice
- `POST /api/invoices` — create a new invoice
- `PATCH /api/invoices/{id}/mark-paid` — set `status = "paid"` and `paid_date = today`
- `GET /api/invoices/{id}/pdf-url` — returns a pre-signed S3 download URL for the PDF

DTOs already exist: `InvoiceResponse`, `CreateInvoiceRequest`.

Acceptance criteria:
- [ ] `POST /api/invoices` returns 400 if the referenced lease does not exist
- [ ] `PATCH /api/invoices/{id}/mark-paid` is idempotent (calling it twice is safe)
- [ ] `GET /api/invoices/{id}/pdf-url` returns 404 if `s3_pdf_key` is null
- [ ] List endpoint supports combining `?leaseId=` and `?status=` filters

---

### Task F2 — Budgets controller

**Files to create:** `backend/PropertyApi/Controllers/BudgetsController.cs`

Endpoints:
- `GET /api/budgets` — list; supports `?propertyId=`, `?year=`, `?month=` query params
- `PUT /api/budgets` — upsert a budget row (insert or update allocated amount)
- `POST /api/budgets/record-spend` — add an amount to `spent` for a given
  `propertyId`, `year`, `month`, `category` (used internally when an invoice is paid)

DTO already exists: `BudgetResponse`, `UpsertBudgetRequest`.

Acceptance criteria:
- [ ] `PUT /api/budgets` uses `INSERT ... ON CONFLICT DO UPDATE` semantics
  (use EF Core's `AddOrUpdate` pattern or raw SQL via `ExecuteSqlRawAsync`)
- [ ] `POST /api/budgets/record-spend` increments `spent` atomically, does not
  replace it
- [ ] `GET /api/budgets` with all three query params returns exactly the rows
  for that property/year/month

---

### Task F3 — Finance dashboard page

**Files to create:**
- `frontend/app/dashboard/finance/page.tsx`
- `frontend/components/ui/InvoiceTable.tsx`

**Finance dashboard** (`page.tsx`):
- Summary cards at the top: total invoices pending, total overdue, total paid this month
- `InvoiceTable` component below showing recent invoices with columns:
  Type, Amount (MYR), Due date, Status badge, Paid date, Download PDF link
- Budget section: for each category show a progress bar of `spent / allocated`
  with the MYR amounts labeled

**`InvoiceTable`** component:
- Accepts `invoices: InvoiceResponse[]` as a prop
- Renders an HTML table with the columns listed above
- "Download PDF" cell renders a link only when `s3PdfKey` is non-null
  (calls `invoicesApi` to get the signed URL on click)

Acceptance criteria:
- [ ] Summary card numbers match the data returned by the API
- [ ] Progress bars clamp at 100% and turn red when `spent > allocated`
- [ ] PDF download link is absent when `s3PdfKey` is null
- [ ] Table is responsive (horizontally scrollable on small screens)

---

## Member 4 — Maintenance staff (Work orders)

Owner of: staff-facing work order queue, status updates, comments.

### Task W1 — Work orders page

**Files to create:**
- `frontend/app/dashboard/work-orders/page.tsx`
- `frontend/components/ui/WorkOrderCard.tsx`

**Work orders page** (`page.tsx`):
- Fetches requests assigned to the current staff member via
  `maintenanceApi.list({ assignedTo: currentUserId })`
  (add `assignedTo` as an optional query param to `maintenanceApi.list` in `lib/api.ts`
  and a matching `?assignedTo=` filter to `MaintenanceRequestsController.GetAll`)
- Groups cards into two columns: "In progress" and "Open" (unstarted)
- Each `WorkOrderCard` shows: title, unit + property, priority badge, category, age (e.g. "3 days ago")

**`WorkOrderCard`** component:
- Accepts a `MaintenanceRequestResponse` prop
- Shows all fields listed above
- "Start work" button calls `maintenanceApi.update({ status: "in_progress" })`
  when status is `open`
- "Mark resolved" button calls `maintenanceApi.update({ status: "resolved" })`
  when status is `in_progress`
- Buttons update the UI optimistically (update local state before the API call resolves)

Acceptance criteria:
- [ ] Page renders without errors
- [ ] "Start work" button is shown only for `open` requests
- [ ] "Mark resolved" button is shown only for `in_progress` requests
- [ ] Status updates are reflected immediately in the UI (optimistic update)
- [ ] `assignedTo` query param filter works in the backend

---

### Task W2 — Comments on work orders

**Files to create:** `frontend/components/ui/CommentThread.tsx`

A reusable comment thread component (shared between the maintenance detail page
and the work orders detail view):
- Accepts `comments: CommentResponse[]` and `requestId: string` as props
- Renders each comment with author name, body text, and relative timestamp
- Has a textarea + submit button at the bottom
- On submit: calls `maintenanceApi.addComment(requestId, body)` and appends
  the new comment to the local list without a full page reload

Reuse this component in `frontend/app/dashboard/maintenance/[id]/page.tsx`
(Task M3) if that task is already complete, replacing any inline comment form there.

Acceptance criteria:
- [ ] Comments display in chronological order (oldest first)
- [ ] Textarea clears after a successful submission
- [ ] New comment appears in the list immediately after submission
- [ ] Submit button is disabled while the request is in flight
- [ ] Empty submissions are rejected client-side

---

## Shared tasks (any member)

### Task S1 — Shared layout components

**Files to create:**
- `frontend/components/layout/Sidebar.tsx`
- `frontend/components/layout/PageShell.tsx`
- `frontend/app/dashboard/layout.tsx`

`Sidebar` shows navigation links to each of the four section pages, with the
active link highlighted. `PageShell` wraps page content with a consistent
heading and optional back button. `app/dashboard/layout.tsx` composes
`Sidebar` + a main content area, so all dashboard pages get the nav automatically.

Acceptance criteria:
- [ ] All four section links appear in the sidebar
- [ ] Active route link is visually distinct
- [ ] `PageShell` renders `children` inside a `<main>` with consistent padding
- [ ] Layout applies to all pages under `/dashboard/*` without adding it to each page

---

### Task S2 — Reusable UI primitives

**Files to create:**
- `frontend/components/ui/Button.tsx`
- `frontend/components/ui/Input.tsx`
- `frontend/components/ui/Select.tsx`
- `frontend/components/ui/Card.tsx`

Each component should:
- Accept standard HTML props (via `React.ComponentProps<"button">` etc.) and spread them
- Use Tailwind classes for styling
- Export a single default export

`Button` variants: `primary` (indigo filled), `secondary` (gray outline), `danger` (red outline).
`Input` and `Select`: consistent border, focus ring, error state (red border when `error` prop is set).
`Card`: white background, rounded corners, subtle border, optional `title` prop.

These are building blocks for all feature pages — complete this task before
starting any page-level UI work.

Acceptance criteria:
- [ ] All four components exist and are importable from `@/components/ui`
- [ ] `Button` renders correctly for all three variants
- [ ] `Input` and `Select` show a red border when `error` prop is truthy
- [ ] `Card` renders `title` as a heading when provided

---

## Deployment checklist (Task 1 submission)

Complete these after all feature tasks are done:

- [ ] Backend builds successfully with `docker build ./backend`
- [ ] Frontend builds successfully with `npm run build` in `./frontend`
- [ ] RDS instance created via `infra/setup-rds.sh` and migration applied
- [ ] Backend deployed to EC2, accessible at a public URL
- [ ] Frontend deployed to Vercel, `NEXT_PUBLIC_API_URL` set to EC2 URL
- [ ] `GET https://<ec2-url>/api/health` returns `{"status":"ok","database":"connected"}`
- [ ] All CORS origins updated in `appsettings.json` to include the Vercel URL
- [ ] Swagger UI accessible at `https://<ec2-url>/swagger`
- [ ] Screenshots taken for all required PowerPoint slides (see task brief)
