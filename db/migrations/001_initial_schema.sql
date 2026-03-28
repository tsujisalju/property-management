-- 001_initial_schema.sql
-- Runs automatically on first `docker compose up` via the postgres entrypoint.
-- For RDS: run this manually once against your RDS instance.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ──────────────────────────────────────────────────────────────────

CREATE TYPE user_role        AS ENUM ('manager', 'tenant', 'maintenance_staff', 'admin');
CREATE TYPE lease_status     AS ENUM ('active', 'expired', 'terminated');
CREATE TYPE unit_status      AS ENUM ('vacant', 'occupied', 'maintenance');
CREATE TYPE request_status   AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE request_priority AS ENUM ('low', 'medium', 'high', 'emergency');
CREATE TYPE invoice_status   AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE invoice_type     AS ENUM ('rent', 'maintenance', 'deposit', 'penalty');

-- ── Tables ─────────────────────────────────────────────────────────────────

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_sub VARCHAR(128) UNIQUE NOT NULL,
    full_name   VARCHAR(255) NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    phone       VARCHAR(20),
    role        user_role NOT NULL DEFAULT 'tenant',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE properties (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id  UUID NOT NULL REFERENCES users(id),
    name        VARCHAR(255) NOT NULL,
    address     TEXT NOT NULL,
    city        VARCHAR(100) NOT NULL,
    total_units INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE units (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_number VARCHAR(20) NOT NULL,
    floor       INT,
    bedrooms    INT NOT NULL DEFAULT 1,
    rent_amount DECIMAL(10,2) NOT NULL,
    status      unit_status NOT NULL DEFAULT 'vacant',
    UNIQUE (property_id, unit_number)
);

CREATE TABLE leases (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id      UUID NOT NULL REFERENCES units(id),
    tenant_id    UUID NOT NULL REFERENCES users(id),
    start_date   DATE NOT NULL,
    end_date     DATE NOT NULL,
    monthly_rent DECIMAL(10,2) NOT NULL,
    status       lease_status NOT NULL DEFAULT 'active',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE maintenance_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id     UUID NOT NULL REFERENCES units(id),
    tenant_id   UUID NOT NULL REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    category    VARCHAR(50) NOT NULL DEFAULT 'general',
    priority    request_priority NOT NULL DEFAULT 'medium',
    status      request_status NOT NULL DEFAULT 'open',
    s3_photo_key VARCHAR(512),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE maintenance_comments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
    author_id  UUID NOT NULL REFERENCES users(id),
    body       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE invoices (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id   UUID NOT NULL REFERENCES leases(id),
    type       invoice_type NOT NULL DEFAULT 'rent',
    amount     DECIMAL(10,2) NOT NULL,
    due_date   DATE NOT NULL,
    paid_date  DATE,
    status     invoice_status NOT NULL DEFAULT 'pending',
    s3_pdf_key VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE budgets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id),
    year        INT NOT NULL,
    month       INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    category    VARCHAR(50) NOT NULL,
    allocated   DECIMAL(10,2) NOT NULL DEFAULT 0,
    spent       DECIMAL(10,2) NOT NULL DEFAULT 0,
    UNIQUE (property_id, year, month, category)
);

-- ── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX idx_units_property        ON units(property_id);
CREATE INDEX idx_leases_unit           ON leases(unit_id);
CREATE INDEX idx_leases_tenant         ON leases(tenant_id);
CREATE INDEX idx_requests_unit         ON maintenance_requests(unit_id);
CREATE INDEX idx_requests_assigned     ON maintenance_requests(assigned_to);
CREATE INDEX idx_requests_status       ON maintenance_requests(status);
CREATE INDEX idx_invoices_lease        ON invoices(lease_id);
CREATE INDEX idx_budgets_property_ym   ON budgets(property_id, year, month);

-- ── Seed data (local dev only) ─────────────────────────────────────────────

INSERT INTO users (cognito_sub, full_name, email, role) VALUES
  ('dev-manager-001',  'Alice Manager',    'manager@dev.local',    'manager'),
  ('dev-tenant-001',   'Bob Tenant',       'tenant@dev.local',     'tenant'),
  ('dev-finance-001',  'Carol Finance',    'finance@dev.local',    'admin'),
  ('dev-staff-001',    'Dave Maintenance', 'staff@dev.local',      'maintenance_staff');
