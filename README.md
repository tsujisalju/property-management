# Property Management Platform

A cloud-based property management system built with Next.js, ASP.NET 8, and AWS.

## Tech stack

| Layer    | Technology                       | Hosting          |
| -------- | -------------------------------- | ---------------- |
| Frontend | Next.js 16, TypeScript, Tailwind | Vercel           |
| Backend  | ASP.NET 8, C#                    | AWS EC2 (Docker) |
| Database | PostgreSQL 15                    | AWS RDS          |
| Storage  | Files & PDFs                     | AWS S3           |
| Auth     | JWT                              | AWS Cognito      |

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) or Docker Engine (Linux)
- Git

Docker will handle setting up the environment and start the Postgres database, ASP .NET backend and Next.js frontend locally.

## Getting started

### 1. Clone and configure

```bash
git clone https://github.com/tsujisalju/property-management.git
cd property-management
cp .env.example .env
# Edit .env and add your AWS credentials
```

### 2. Start all services

```bash
docker compose up --build
```

This starts:

- **Frontend** at http://localhost:3000
- **Backend API** at http://localhost:8080
- **PostgreSQL** at localhost:5432 (auto-migrated on first run)

### 3. Verify it's working

```bash
curl http://localhost:8080/api/health
# {"status":"ok","environment":"Development"}
```

Open http://localhost:3000 — you should see the app calling the backend health endpoint.

### Useful commands

```bash
# Start in background
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop everything
docker compose down

# Wipe the database and start fresh
docker compose down -v
docker compose up --build

# Run a one-off backend command
docker compose exec backend dotnet ef migrations list
```

## Project structure

```
property-management/
├── frontend/          # Next.js 16 app
│   ├── app/           # App router pages
│   ├── components/    # Shared React components
│   ├── lib/           # API client and utilities
│   └── types/         # TypeScript type definitions
├── backend/           # ASP.NET 8 Web API
│   └── PropertyApi/
│       ├── Controllers/   # HTTP endpoints
│       ├── Services/      # Business logic & AWS calls
│       ├── Models/        # Database entity models
│       └── DTOs/          # Request/response shapes
├── db/
│   └── migrations/    # SQL files — run in filename order
├── infra/             # AWS CLI / setup scripts
├── docker-compose.yml
└── .env.example
```

## Team workload

| Member     | Role in app       | Feature area            |
| ---------- | ----------------- | ----------------------- |
| Qayyum     | Property manager  | Maintenance scheduling  |
| Ahmed      | Tenant            | Issue reporting, portal |
| Teshwindev | Finance / admin   | Billing, reports        |
| Hayyan     | Maintenance staff | Work order updates      |
