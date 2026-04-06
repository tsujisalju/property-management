-- 001_initial_schema.sql
-- Runs automatically on first `docker compose up` via the postgres entrypoint.
-- For RDS: run this manually once against your RDS instance.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum types removed — columns use TEXT with CHECK constraints instead.
-- PostgreSQL custom enums require explicit casts on writes which conflicts
-- with how EF Core / Npgsql sends string parameters.

-- ── Tables ─────────────────────────────────────────────────────────────────

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cognito_sub VARCHAR(128) UNIQUE NOT NULL,
    full_name   VARCHAR(255) NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    phone       VARCHAR(20),
    role        TEXT NOT NULL DEFAULT 'tenant' CHECK (role IN ('manager', 'tenant', 'maintenance_staff', 'admin')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE properties (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id  UUID NOT NULL REFERENCES users(id),
    name        VARCHAR(255) NOT NULL,
    address     TEXT NOT NULL,
    city        VARCHAR(100) NOT NULL,
    total_units  INT NOT NULL DEFAULT 0,
    s3_photo_key VARCHAR(512),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE units (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_number VARCHAR(20) NOT NULL,
    floor       INT,
    bedrooms    INT NOT NULL DEFAULT 1,
    rent_amount DECIMAL(10,2) NOT NULL,
    status      TEXT NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'maintenance')),
    UNIQUE (property_id, unit_number)
);

CREATE TABLE leases (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id      UUID NOT NULL REFERENCES units(id),
    tenant_id    UUID NOT NULL REFERENCES users(id),
    start_date   DATE NOT NULL,
    end_date     DATE NOT NULL,
    monthly_rent DECIMAL(10,2) NOT NULL,
    status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated')),
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
    priority    TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'emergency')),
    status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
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
    type       TEXT NOT NULL DEFAULT 'rent' CHECK (type IN ('rent', 'maintenance', 'deposit', 'penalty')),
    amount     DECIMAL(10,2) NOT NULL,
    due_date   DATE NOT NULL,
    paid_date  DATE,
    status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
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
  ('690af55c-a001-709a-7c0c-347bccdae400',  'Qayyum Yazid', 'manager@dev.local',    'manager'),
  ('39aa75bc-20a1-70bb-4572-59b72f856ccf',  'Ahmed Saleh',  'tenant@dev.local',     'tenant'),
  ('491aa56c-0071-70d4-0847-a424c47aae21',  'Teshwindev',   'finance@dev.local',    'admin'),
  ('c96ac52c-f011-7097-f15c-ae69c75bfe6d',  'Hayyan',       'staff@dev.local',      'maintenance_staff');
