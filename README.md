# BhoomiNexus — National Land Acquisition & Management System

Unified spatial GIS and statutory workflow clearinghouse designed for the **Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement (RFCTLARR) Act, 2013**.

---

## 🏗️ System Architecture

BhoomiNexus operates as a multi-service distributed government platform:

```
┌────────────────────────────────────────────────────────┐
│                   Web Browser Client                   │
│         React 19 + TypeScript + Vite + Leaflet         │
│                 (Port: 5173 / Proxy)                   │
└───────────────────────────┬────────────────────────────┘
                            │ /api/v1 (Reverse Proxy)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Backend REST API                     │
│         Express 5 + TypeScript + RBAC Engine           │
│                      (Port: 5000)                      │
└───────┬───────────────────┬────────────────────┬───────┘
        │                   │                    │
        ▼                   ▼                    ▼
┌──────────────┐    ┌──────────────┐     ┌──────────────┐
│  PostgreSQL  │    │ Redis Cache  │     │ AI Document  │
│  + PostGIS   │    │  & Queues    │     │ Intelligence │
│ (Port: 5432) │    │ (Port: 6379) │     │ (Port: 8000) │
└──────────────┘    └──────────────┘     └──────────────┘
```

---

## ⚡ Quick Start: Running the Project Locally

Follow these exact, copy-pasteable steps to install, configure, and launch the complete stack.

### Prerequisites

Ensure you have installed:
- **Docker & Docker Compose** (for PostgreSQL/PostGIS and Redis)
- **Node.js**: `v20.x` or higher (tested on Node `v24.x`)
- **npm**: `v10.x` or higher
- **Git**

Verify your environment:
```bash
docker --version
docker compose version
node -v
npm -v
git --version
```

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/divyansh-xyz/BhoomiNexus.git
cd BhoomiNexus
```

If you already have the repository cloned, pull latest updates on your working branch:
```bash
git checkout divyansh
git pull origin divyansh
```

---

### Step 2: Launch Database & Cache Infrastructure (Docker)

Start the PostgreSQL (with PostGIS spatial extensions) and Redis services:

```bash
# Navigate to Backend directory
cd Backend

# Start PostGIS and Redis containers in the background
docker compose up -d

# Verify containers are healthy
docker compose ps
```

*Default ports exposed:* `5432` (PostgreSQL) and `6379` (Redis).

---

### Step 3: Configure & Launch Backend API

In the same `Backend` directory, configure environment variables, install dependencies, run migrations, seed initial data, and launch the server:

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Install Node dependencies
npm install

# 3. Run database migrations (creates PostGIS extensions, tables & indexes)
npm run migrate

# 4. Seed initial roles, statutory users, states & master workflow templates
npm run seed

# 5. Start the backend development server
npm run dev
```

The Backend server will be active at:
```text
[INFO] Server listening on http://localhost:5000
[INFO] Database connected to postgresql://...:5432/bhoomi_nexus
```

---

### Step 4: Configure & Launch Frontend Application

Open a new terminal window or tab and launch the Vite development server:

```bash
# 1. From the repository root, navigate to Frontend
cd Frontend

# 2. Install dependencies
npm install

# 3. Verify TypeScript build and linting
npm run lint
npm run build

# 4. Start the Vite development server
npm run dev
```

The Vite dev server will output:
```text
  VITE v8.2.2  ready in 250 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open **`http://localhost:5173/`** in your browser. All `/api/*` network requests are automatically proxied to `http://localhost:5000`.

---

### Step 5 (Optional): Launch AI Document Intelligence Service

For automated OCR and Gemini-powered Gazette / Land Record parsing:

```bash
# From repository root
cd AI_Document_Parser

# 1. Configure environment
cp .env.example .env
# Edit .env and set your LLM_API_KEY (Google Gemini API key)

# 2. Install dependencies
npm install

# 3. Generate Prisma client & sync schema
npm run prisma:generate
npm run prisma:db-push

# 4. Start AI Document Parser service
npm run dev
```

Active on: `http://localhost:8000`

---

## 🔑 Demo Government User Credentials

All seeded accounts have the default password: **`Demo@123`**

| Role / Authority | Email Address | Cadre / Department | Default Landing |
| :--- | :--- | :--- | :--- |
| **Requesting Authority** | `requestor@bhoomi.gov.in` | Executive Engineer, MoRTH | `/projects` |
| **BOSS / Scrutiny Officer** | `boss@bhoomi.gov.in` | Bureau Officer & Section Supervisor, NLAA | `/boss/dashboard` |
| **Processing Officer** | `officer@bhoomi.gov.in` | Revenue & Field Officer, Revenue Dept | `/officer/dashboard` |
| **System Administrator** | `admin@bhoomi.gov.in` | NIC System Administrator | `/dashboard/admin` |

> 💡 **Role Switcher**: When logged in, use the top government header's **Role Switcher** dropdown to instantly switch perspectives between roles without logging out.

---

## ⚙️ Environment Variables

### Backend (`Backend/.env`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | HTTP port for the Express REST API |
| `NODE_ENV` | `development` | Runtime environment mode |
| `DATABASE_URL` | `postgresql://postgres:postgrespassword@localhost:5432/bhoomi_nexus` | PostgreSQL + PostGIS connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis cache and queue connection string |
| `JWT_SECRET` | `super_secret_jwt_key_bhoomi_nexus` | Secret key used for signing authentication tokens |
| `JWT_EXPIRES_IN` | `7d` | JSON Web Token expiration period |

### Frontend (`Frontend/.env` - Optional)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `/api/v1` | Backend API base path (proxied by Vite to port `5000`) |

### AI Document Parser (`AI_Document_Parser/.env`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `8000` | HTTP port for AI parser microservice |
| `DATABASE_URL` | `postgresql://postgres:postgrespassword@localhost:5432/bhoomi_nexus` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection for BullMQ jobs |
| `LLM_PROVIDER` | `google` | AI model provider |
| `LLM_API_KEY` | *(your Gemini API key)* | Google Generative AI API Key |
| `LLM_MODEL` | `gemini-1.5-flash` | Gemini model name |
| `STORAGE_PATH` | `./uploads` | Local directory for document uploads |

---

## 🧭 Implemented Modules & Phases (Phases 1–11)

| Phase | Module Name | Primary Routes | Description & Features |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Public Transparency Map** | `/` | National interactive GIS map of India with Leaflet vector boundary rendering, state-level project aggregation, and acquisition metrics. |
| **Phase 2** | **Cadastral Hero & Transparency Console** | `/` | Editorial broadsheet hero, sovereign typography, public inquiry submission, and state-by-state cadastral parcel drilldown. |
| **Phase 3** | **Proponent Requisition Portal** | `/projects`, `/projects/new` | Requesting Authority portal to draft dockets, interactively plot corridor alignment waypoints on Leaflet GIS, compute RoW buffers, and upload statutory annexures. |
| **Phase 4** | **BOSS Scrutiny & Parcel Determination** | `/boss/dashboard`, `/boss/projects/:id/parcels` | Bureau of Sovereign Scrutiny (BOSS) central intake ledger, National Geospatial Radar, and candidate parcel determination with Bhu-Aadhaar ULPIN confirmation. |
| **Phase 5** | **Statutory Workflow Configuration** | `/boss/projects/:id/workflow` | Sovereign statutory workflow engine with master template instantiation (`tmpl-prototype-la`), custom stage additions, SLA days configuration, and officer assignment. |
| **Phase 6** | **BOSS Exit & Workflow Task Engine** | `/boss/projects/:id` | BOSS statutory sanction sign-off ("Approve Project Forward"), formal handover of jurisdiction, multi-departmental task lifecycle (Start, Accept, Reject, Resubmit), and real-time audit ledger. |
| **Phase 7** | **Officer Dashboard & Task Execution** | `/officer/dashboard`, `/officer/tasks/:id` | Processing officer inbox, SLA countdown timers, task status filters (PENDING, IN_PROGRESS, COMPLETED, REJECTED), stage inspection, and approval/rejection actions. |
| **Phase 8** | **Sovereign Document Management** | `/documents`, `/documents/:id` | Central statutory document repository, multi-version tracking, cryptographic checksum hashing, metadata tagging, and direct PDF/file downloads. |
| **Phase 9** | **Hard-Copy Evidence Intake & Verification** | `/officer/tasks/:id` | Field officer physical verification evidence uploader, geo-tagged site photographs, physical inquiry reports, and tamper-evident document linking. |
| **Phase 10** | **AI Document Intelligence & Auto-Fill** | `/officer/tasks/:id` | Document text extraction and OCR integration via Gemini, structured field auto-fill, confidence scoring, and side-by-side human officer verification. |
| **Phase 11** | **RA Tracking & Rejection Handling** | `/projects`, `/projects/:projectId` | Requesting Authority live tracking hub, multi-stage statutory visual progress pipeline, defect rejection alerts, corrective document uploads, and one-click resubmission modal. |

---

## 🗺️ Complete Route Directory

| URL Path | Role / Access Tier | Module / Description |
| :--- | :--- | :--- |
| `/` | Public | National Overview, Republic of India GIS Map, Cadastral Console & Public Inquiry Form |
| `/login` | Public | Government Single Sign-On / Sovereign Authentication Portal |
| `/dashboard` | Authenticated | Redirects to `/projects` |
| `/projects` | `REQUESTING_AUTHORITY`, `ADMIN` | Proponent Project Register, KPI Triage Bar, Workflow Progress Tracking, and Rejection Alerts |
| `/projects/new` | `REQUESTING_AUTHORITY` | Spatial Corridor Alignment Drafter, Waypoint Plotter & Statutory Annexure Uploader |
| `/projects/:projectId` | `REQUESTING_AUTHORITY`, `ADMIN` | Phase 11 Proponent Project Dossier, Live Stage Progress Pipeline, Defect Rectification Modal & Audit Trail |
| `/boss/dashboard` | `BOSS`, `ADMIN` | Central Scrutiny Worklist, National Geospatial Intelligence Radar, and Project Triage |
| `/boss/projects/:projectId` | `BOSS`, `ADMIN` | Pre-Feasibility Scrutiny Dossier, Card 5 Approval Engine & Statutory Sanction Sign-Off |
| `/boss/projects/:projectId/parcels` | `BOSS`, `ADMIN` | Interactive PostGIS Cadastral Determination Workbench (Bhu-Aadhaar ULPIN Selection) |
| `/boss/projects/:projectId/workflow` | `BOSS`, `ADMIN` | Project-Specific Workflow Pipeline Workbench (Stages, SLAs, Officer Assignment) |
| `/boss/projects/:projectId/workflow/templates` | `BOSS`, `ADMIN` | Master Workflow Template Blueprints Selection Gallery |
| `/officer/dashboard` | `PROCESSING_OFFICER`, `ADMIN` | Processing Officer Worklist, Priority Task Queue, SLA Timers & Status Categorization |
| `/officer/tasks/:taskId` | `PROCESSING_OFFICER`, `ADMIN` | Task Execution Console, Evidence Intake, Document Verification, Accept/Reject Action Engine |
| `/documents` | Authenticated | Sovereign Global Document Repository, Category Filtering & Metadata Clearinghouse |
| `/documents/:documentId` | Authenticated | Document Version History, Verification Status, Checksum Details & File Viewer |
| `/dashboard/admin` | `ADMIN` | System Administration & Configuration Module |

---

## 🔌 Complete REST API Directory

All data communication adheres to REST API standards prefixed at `/api/v1`.

### 1. System & Health
* `GET /api/v1/health` — System health check and database connectivity status.
* `GET /api/v1/public/stats` — Public aggregate national statistics (active projects, acquired hectares, compensation disbursed).
* `GET /api/v1/public/states` — State-level acquisition boundaries and project counts.

### 2. Authentication & Identity
* `POST /api/v1/auth/login` — Sovereign login via email and password; returns JWT token and user profile.
* `POST /api/v1/auth/refresh` — Refresh expired JWT authentication session.
* `GET /api/v1/auth/me` — Retrieve active authenticated officer profile and assigned roles.
* `POST /api/v1/auth/logout` — Invalidate current session.
* `GET /api/v1/users?role=PROCESSING_OFFICER` — Fetch eligible officers for task assignment.

### 3. Project Requisitions (Requesting Authority)
* `GET /api/v1/projects` — Enriched project list with workflow progress, active stage, and rejection alerts (`?status=...&search=...&mine=...`).
* `POST /api/v1/projects` — Submit new project requisition docket with corridor geometry and buffer parameters.
* `GET /api/v1/projects/:id` — Comprehensive project dossier with enriched workflow stages, parcel progress, pending actions, and audit timeline.
* `GET /api/v1/projects/:id/actions` — Required statutory actions and pending rectification alerts.
* `GET /api/v1/projects/:id/timeline` — Complete chronological audit trail.

### 4. BOSS Scrutiny & Land Parcel Determination
* `POST /api/v1/boss/projects/:id/land-records/fetch` — Run PostGIS spatial intersection to detect candidate land parcels along alignment buffer.
* `GET /api/v1/projects/:id/parcels` — List confirmed and candidate land parcels.
* `POST /api/v1/boss/projects/:id/parcels/confirm` — Confirm selected parcels with Bhu-Aadhaar ULPINs (`{ parcelIds: string[] }`).

### 5. Workflow Configuration & Activation
* `GET /api/v1/workflow-templates` — Master statutory workflow templates (`tmpl-prototype-la`).
* `POST /api/v1/projects/:id/workflow/initialize` — Instantiate project pipeline from template blueprint.
* `GET /api/v1/projects/:id/workflow` — Fetch active pipeline stages, SLAs, and assigned officers.
* `POST /api/v1/projects/:id/workflow/activate` — BOSS statutory sanction approval and formal handover to task engine.

### 6. Processing Officer Task Engine
* `GET /api/v1/tasks` — List officer tasks filtered by assigned officer or status (`?assignedTo=...&status=...`).
* `GET /api/v1/tasks/:id` — Task details, checklist, associated stage metadata, and attached evidence.
* `POST /api/v1/tasks/:id/start` — Mark task status as `IN_PROGRESS`.
* `POST /api/v1/tasks/:id/accept` — Approve stage task and advance project pipeline.
* `POST /api/v1/tasks/:id/reject` — Reject stage task with statutory remarks, returning it to Requesting Authority.
* `GET /api/v1/tasks/:taskId/documents` — Retrieve documents linked to a specific task.
* `POST /api/v1/projects/:projectId/workflow-stages/:stageId/resubmit` — Requesting Authority defect rectification and resubmission with corrective documents.

### 7. Document Management
* `GET /api/v1/documents` — Global document repository search and filter (`?projectId=...&category=...`).
* `POST /api/v1/documents/upload` — Multipart form-data file upload with automatic SHA-256 checksum generation.
* `GET /api/v1/documents/:id` — Retrieve document record, current version, and metadata.
* `GET /api/v1/documents/:id/download` — Stream document binary file.
* `GET /api/v1/documents/:id/versions` — Audit history of all document revisions.
* `POST /api/v1/documents/:id/versions` — Upload new revision/version for an existing document.

---

## 📦 Complete Tech Stack

### Frontend Application
- **UI Engine**: React 19.2 + TypeScript + Vite 8.2
- **Routing**: React Router DOM v7
- **Server State & Caching**: TanStack Query v5 (React Query)
- **Forms & Validation**: React Hook Form v7 + Zod v4 + `@hookform/resolvers`
- **Spatial GIS & Maps**: Leaflet 1.9 + Esri World Imagery + CARTO Dark Canvas
- **Iconography**: Lucide React
- **HTTP Client**: Axios (Bearer token interceptor & HTML fallback detector)
- **Linter**: Oxlint
- **Design System**: Sovereign Editorial Broadside Palette (0px border-radius, high-contrast statutory typography)

### Backend API Server
- **Runtime**: Node.js (v20+) + TypeScript + TSX
- **Framework**: Express 5.2
- **Database Driver**: `pg` (node-postgres v8) with Connection Pooling
- **Cache & Message Broker**: Redis v6 client
- **Security & Headers**: Helmet + CORS + BCrypt.js
- **Authentication**: JSON Web Tokens (`jsonwebtoken`) with RBAC Middleware
- **File Uploads**: Multer (50MB streaming limit)
- **Logging**: Pino + Pino-Pretty
- **Validation**: Zod v4

### Database & Spatial Infrastructure
- **RDBMS**: PostgreSQL 16
- **Spatial Engine**: PostGIS 3.4 (`ST_Buffer`, `ST_Intersects`, `ST_GeomFromGeoJSON`, `ST_AsGeoJSON`)
- **Cache**: Redis 7 Alpine

### AI Document Intelligence Service
- **Runtime**: Node.js + TypeScript
- **OCR Engine**: Google Cloud Vision API
- **Generative AI / LLM**: Google Gemini API (`@google/generative-ai`)
- **Job Queue**: BullMQ + ioredis
- **ORM / Schema**: Prisma ORM

---

## 🛑 Git Contribution Policy

> ⚠️ **CRITICAL INSTRUCTIONS FOR ALL DEVELOPERS:**
>
> 1. **DO NOT commit directly to `main`**:
>    Always create a dedicated feature or personal branch (`git checkout -b feature/your-feature` or `git checkout -b dev/yourname`).
> 2. **ALWAYS update this `README.md`**:
>    If you add new packages, modify routes, add environment variables, or change launch steps, you **must update this README** in your PR.

For the full step-by-step Git branching, commit convention, and PR guide, please consult:  
👉 **[`GIT_INSTRUCTIONS.md`](./GIT_INSTRUCTIONS.md)**
