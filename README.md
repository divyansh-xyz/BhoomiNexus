<div align="center">

# 🏛️ BhoomiNexus

### National Land Acquisition & Management System

*A unified spatial GIS and statutory workflow platform built for the*
***Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement (RFCTLARR) Act, 2013***

[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+PostGIS-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
[![Express](https://img.shields.io/badge/Express-5.2-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![License](https://img.shields.io/badge/License-ISC-blue?style=flat-square)](LICENSE)

**71,800+ lines of code** · **177 source files** · **3 services** · **24 REST endpoints**

---

</div>

## 🎯 What is BhoomiNexus?

BhoomiNexus digitizes India's entire land acquisition lifecycle — from the moment a government project is proposed, through parcel identification via GIS, multi-department statutory approvals, fair compensation determination, physical possession, to rehabilitation & resettlement tracking — all in one secure, role-based platform.

> **One platform. Every stakeholder. Complete transparency.**

### The Problem It Solves

Land acquisition in India is currently fractured across manual paperwork, disconnected software systems, and state-specific processes. This creates:

- **No single source of truth** — data is scattered across offices
- **Approval bottlenecks** — no one knows who holds the next action
- **Zero real-time visibility** — senior officials lack live project status
- **Compensation disputes** — opaque valuation and delayed disbursement
- **Missing audit trails** — no tamper-evident record of decisions
- **Manual document processing** — officers re-enter data from scanned gazettes

BhoomiNexus solves all of this.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Browser Client                      │
│          React 19  ·  TypeScript  ·  Vite  ·  Leaflet      │
│                       Port 5173                             │
└─────────────────────────┬───────────────────────────────────┘
                          │  /api/v1 (Vite Reverse Proxy)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend REST API                          │
│          Express 5  ·  TypeScript  ·  RBAC Engine           │
│                       Port 5000                             │
└────────┬────────────────┬───────────────────┬───────────────┘
         │                │                   │
         ▼                ▼                   ▼
┌──────────────┐  ┌──────────────┐   ┌────────────────────┐
│  PostgreSQL  │  │    Redis     │   │   AI Document      │
│  + PostGIS   │  │  Cache +     │   │   Intelligence     │
│  Port 5432   │  │  Job Queues  │   │   Gemini + OCR     │
│              │  │  Port 6379   │   │   Port 8000        │
└──────────────┘  └──────────────┘   └────────────────────┘
```

---

## ⚡ Quick Start — Run Locally

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| **Docker & Docker Compose** | Latest | `docker --version` |
| **Node.js** | v20+ (tested on v24) | `node -v` |
| **npm** | v10+ | `npm -v` |
| **Git** | Any | `git --version` |

---

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/divyansh-xyz/BhoomiNexus.git
cd BhoomiNexus
```

---

### 2️⃣ Start Database & Cache (Docker)

```bash
cd Backend
docker compose up -d
```

This launches:
- **PostgreSQL 16 + PostGIS 3.4** on `localhost:5432`
- **Redis 7** on `localhost:6379`

Verify they're running:
```bash
docker compose ps
```

---

### 3️⃣ Launch Backend API

Still in the `Backend/` directory:

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Run database migrations (creates tables, PostGIS extensions, indexes)
npm run migrate

# Seed demo users, roles, states, projects & workflow templates
npm run seed

# Start the development server
npm run dev
```

✅ Backend is live at **http://localhost:5000**

---

### 4️⃣ Launch Frontend

Open a **new terminal**:

```bash
cd Frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

✅ Frontend is live at **http://localhost:5173**

All `/api/*` requests are automatically proxied to the Backend.

---

### 5️⃣ Launch AI Document Parser *(Optional)*

Open a **new terminal**:

```bash
cd AI_Document_Parser

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# ⚠️  Edit .env and add your Google Gemini API key to LLM_API_KEY

# Generate Prisma client & sync schema
npm run prisma:generate
npm run prisma:db-push

# Start the AI service
npm run dev
```

✅ AI Document Intelligence is live at **http://localhost:8000**

---

## 🔑 Demo Credentials

All accounts use the password: **`Demo@123`**

| Role | Email | Name | Landing Page |
|------|-------|------|-------------|
| **Requesting Authority** | `requestor@bhoomi.gov.in` | Rajesh Sharma | `/projects` |
| **BOSS (Scrutiny Officer)** | `boss@bhoomi.gov.in` | Dr. Vikramaditya Sen | `/boss/dashboard` |
| **Processing Officer** | `officer@bhoomi.gov.in` | Ananya Patel | `/officer/dashboard` |
| **Compensation Officer** | `comp.officer@bhoomi.gov.in` | Mahesh Patil | `/compensation/dashboard` |
| **Possession Officer** | `possession.officer@bhoomi.gov.in` | Vinayak Kulkarni | `/possession/dashboard` |
| **District Authority** | `district.pune@bhoomi.gov.in` | Dr. Suhas Diwase | `/district/dashboard` |
| **System Admin** | `admin@bhoomi.gov.in` | S. K. Verma | `/dashboard/admin` |

> 💡 Use the **Role Switcher** in the top header bar to instantly switch between roles without logging out.

---

## 🧩 Core Features

### 🗺️ GIS & Spatial Intelligence
- National interactive map of India with Leaflet + PostGIS
- Corridor alignment plotting with waypoints and Right-of-Way buffer computation
- Automated spatial intersection (`ST_Buffer`, `ST_Intersects`) for candidate parcel detection
- Bhu-Aadhaar ULPIN-based parcel confirmation

### 📋 Statutory Workflow Engine
- Visual drag-and-drop workflow builder with DAG topology
- Master template library (Acquisition → Compensation → Possession pipeline)
- Per-stage SLA timers, officer assignment, and department routing
- Boss statutory sanction and formal jurisdiction handover

### 🤖 AI Document Intelligence
- Gemini-powered structured extraction from scanned Gazette notifications and land records
- OCR + multimodal document parsing with confidence scoring
- Side-by-side human verification for officer review
- BullMQ job queue for async processing

### 💰 Compensation & Possession
- RFCTLARR Sections 26–30 statutory valuation with 100% solatium computation
- Per-parcel estimate tracking with supporting document dossiers
- PFMS disbursal proof recording
- Physical possession evidence intake with geo-tagged photographs

### 🔒 Security & Governance
- JWT authentication with role-based access control (RBAC)
- 9 statutory roles with granular permission middleware
- Tamper-evident audit trail on every action
- Helmet security headers + CORS configuration

---

## ⚙️ Environment Variables

### Backend (`Backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Express API port |
| `NODE_ENV` | `development` | Runtime environment |
| `DATABASE_URL` | `postgresql://postgres:postgrespassword@localhost:5432/bhoomi_nexus` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | `super_secret_jwt_key_bhoomi_nexus` | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | Token expiration |

### AI Document Parser (`AI_Document_Parser/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | AI service port |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/land_acquisition` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379` | BullMQ job queue |
| `LLM_PROVIDER` | `google` | AI provider |
| `LLM_API_KEY` | *(your key)* | **Required** — Google Gemini API key |
| `LLM_MODEL` | `gemini-1.5-flash` | Gemini model |
| `STORAGE_PATH` | `./uploads` | Upload directory |

---

## 📦 Tech Stack

<table>
<tr>
<td width="33%">

### Frontend
- **React** 19.2 + TypeScript
- **Vite** 8.2 (build + HMR)
- **React Router** v7
- **TanStack Query** v5
- **React Hook Form** + Zod
- **Leaflet** 1.9 (GIS maps)
- **Lucide React** (icons)
- **Axios** (HTTP client)
- **Oxlint** (linter)

</td>
<td width="33%">

### Backend
- **Express** 5.2 + TypeScript
- **node-postgres** (pg) v8
- **Redis** v6 client
- **Helmet** + CORS
- **JWT** + BCrypt.js (auth)
- **Multer** (file uploads)
- **Pino** (structured logging)
- **Zod** v4 (validation)
- **Vitest** (testing)

</td>
<td width="33%">

### Infrastructure
- **PostgreSQL** 16 + **PostGIS** 3.4
- **Redis** 7 Alpine
- **Docker Compose**
- **Prisma** ORM (AI service)
- **BullMQ** + ioredis (jobs)
- **Google Gemini** API
- **Google Cloud Vision** OCR

</td>
</tr>
</table>

---

## 🗺️ Route Map

| Route | Role | Description |
|-------|------|-------------|
| `/` | Public | National GIS Map, Cadastral Console, Public Inquiry |
| `/login` | Public | Government SSO Authentication |
| `/projects` | Requesting Authority | Project Register, KPI Triage, Progress Tracking |
| `/projects/new` | Requesting Authority | Corridor Alignment Drafter + GIS Plotter |
| `/projects/:id` | Requesting Authority | Live Stage Pipeline, Defect Rectification |
| `/boss/dashboard` | BOSS | Central Scrutiny Worklist, Geospatial Radar |
| `/boss/projects/:id` | BOSS | Pre-Feasibility Dossier, Approval Engine |
| `/boss/projects/:id/parcels` | BOSS | PostGIS Cadastral Determination Workbench |
| `/boss/projects/:id/workflow-builder` | BOSS | Visual DAG Workflow Builder |
| `/officer/dashboard` | Processing Officer | Task Inbox, SLA Timers, Status Filters |
| `/officer/tasks/:id` | Processing Officer | Task Execution, Evidence Intake, Accept/Reject |
| `/compensation/dashboard` | Compensation Officer | Valuation Dossier, PFMS Disbursal |
| `/possession/dashboard` | Possession Officer | Physical Possession & Clearance |
| `/district/dashboard` | District Authority | Compensation Approval, Jurisdiction Overview |

---

## 🔌 API Reference

All endpoints are prefixed with `/api/v1`. Authentication is via `Bearer` JWT token.

<details>
<summary><strong>Authentication</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | Login with email + password, returns JWT |
| `POST` | `/auth/refresh` | Refresh expired token |
| `GET` | `/auth/me` | Get authenticated user profile |

</details>

<details>
<summary><strong>Projects</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/projects` | List projects (with workflow progress) |
| `POST` | `/projects` | Create new project requisition |
| `GET` | `/projects/:id` | Project dossier with stages & audit trail |
| `PATCH` | `/projects/:id` | Update draft project |
| `POST` | `/projects/:id/submit` | Submit for BOSS review |
| `GET` | `/projects/:id/actions` | Pending statutory actions |

</details>

<details>
<summary><strong>BOSS Scrutiny & Parcels</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/boss/projects/:id/land-records/fetch` | PostGIS spatial parcel detection |
| `GET` | `/projects/:id/parcels` | List confirmed parcels |
| `POST` | `/boss/projects/:id/parcels/confirm` | Confirm parcels with ULPIN |

</details>

<details>
<summary><strong>Workflow Engine</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/workflow-templates` | Master statutory templates |
| `POST` | `/projects/:id/workflow/initialize` | Instantiate from template |
| `GET` | `/projects/:id/workflow` | Get active pipeline |
| `POST` | `/projects/:id/workflow/activate` | BOSS statutory sanction |

</details>

<details>
<summary><strong>Tasks</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/tasks` | List tasks (filter by officer/status) |
| `GET` | `/tasks/:id` | Task details + evidence |
| `POST` | `/tasks/:id/start` | Mark IN_PROGRESS |
| `POST` | `/tasks/:id/accept` | Approve and advance pipeline |
| `POST` | `/tasks/:id/reject` | Reject with remarks |

</details>

<details>
<summary><strong>Documents</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/documents` | Search document repository |
| `POST` | `/documents/upload` | Upload with SHA-256 checksum |
| `GET` | `/documents/:id` | Document metadata |
| `GET` | `/documents/:id/download` | Stream file binary |

</details>

---

## 🛑 Git Contribution Policy

> ⚠️ **Do NOT commit directly to `main`.** Always work on a feature branch.

```bash
# Create your branch
git checkout -b feature/your-feature

# Make changes, then commit
git add .
git commit -m "feat(module): description of change"

# Push and create PR
git push origin feature/your-feature
```

If you add new packages, routes, or environment variables — **update this README**.

See [`GIT_INSTRUCTIONS.md`](./GIT_INSTRUCTIONS.md) for the full branching and PR guide.

---

## 📁 Project Structure

```
BhoomiNexus/
├── Frontend/                  # React 19 + Vite SPA
│   ├── src/
│   │   ├── pages/             # Route-level page components
│   │   ├── components/        # Reusable UI components
│   │   ├── services/api/      # API client layer
│   │   ├── hooks/             # Custom React hooks
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Shared utilities
│   ├── package.json
│   └── vite.config.ts
│
├── Backend/                   # Express 5 REST API
│   ├── src/
│   │   ├── modules/           # Feature modules (projects, tasks, workflows...)
│   │   ├── database/          # Migrations, seeds, SQL
│   │   ├── middlewares/       # Auth, RBAC, error handling
│   │   ├── config/            # DB pool, environment
│   │   └── utils/             # Audit, errors, helpers
│   ├── docker-compose.yml     # PostgreSQL + Redis
│   └── package.json
│
├── AI_Document_Parser/        # Gemini + OCR microservice
│   ├── src/
│   │   ├── services/          # OCR, LLM extraction
│   │   ├── jobs/              # BullMQ job processors
│   │   └── routes/            # REST endpoints
│   ├── prisma/                # Prisma schema
│   └── package.json
│
├── PRD_SIH.md                 # Product Requirements Document
├── TRD_SIH.md                 # Technical Requirements Document
├── DESIGN.md                  # UI/UX Design System Reference
└── README.md                  # ← You are here
```

---

<div align="center">

**Built for Smart India Hackathon 🇮🇳**

*Digitizing land acquisition for a transparent, accountable, and efficient India.*

</div>
