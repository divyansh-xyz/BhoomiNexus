# BhoomiNexus — National Land Acquisition & Management System

Unified spatial GIS and statutory workflow clearinghouse designed for the **Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement (RFCTLARR) Act, 2013**.

---

## ⚡ Quick Start: Running the Project Locally

Follow these exact steps to clone, install, and run the project on your machine.

### Prerequisites

Ensure you have installed:
- **Node.js**: `v20.x` or higher (tested on Node `v24.x`)
- **npm**: `v10.x` or higher
- **Git**

Verify your environment:
```bash
node -v
npm -v
git --version
```

---

### 1. Clone the Repository

```bash
git clone https://github.com/divyansh-xyz/BhoomiNexus.git
cd BhoomiNexus
```

If you already have the repository cloned, pull the latest updates:
```bash
git checkout main
git pull origin main
```

---

### 2. Frontend Setup & Execution

Navigate to the `Frontend` directory, install all required dependencies, verify the build, and launch the development server:

```bash
# 1. Navigate to Frontend
cd Frontend

# 2. Install all dependencies
npm install

# 3. Verify TypeScript build and linting
npm run lint
npm run build

# 4. Start the Vite local development server
npm run dev
```

Once running, the terminal will output the local URL:
```text
  VITE v8.2.2  ready in 250 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open **`http://localhost:5173/`** in your browser to view the application.

---

## 🧭 Application Modules & Implemented Phases

| Phase | Module Name | Primary Route | Description & Features |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Public Transparency Map** | `/` | National interactive GIS map of India with Leaflet vector boundary rendering, state-level project aggregation, and acquisition metrics. |
| **Phase 2** | **Cadastral Hero & Transparency Console** | `/` | Editorial broadsheet hero, sovereign typography, public inquiry submission, and state-by-state cadastral parcel drilldown. |
| **Phase 3** | **Proponent Requisition Portal** | `/projects`, `/projects/new` | Requesting Authority (RA) portal to draft project dockets, interactively plot corridor alignment waypoints on Leaflet GIS, compute RoW buffers, and attach statutory gazette annexures. |
| **Phase 4** | **BOSS Scrutiny & Parcel Determination** | `/boss/dashboard`, `/boss/projects/:id/parcels` | Bureau of Sovereign Scrutiny (BOSS) central intake ledger, National Geospatial Radar with dark canvas, and candidate parcel determination with Bhu-Aadhaar ULPIN confirmation. |
| **Phase 5** | **Statutory Workflow Configuration** | `/boss/projects/:id/workflow` | Sovereign statutory workflow engine with master template instantiation (`tmpl-prototype-la`), custom stage additions, SLA days configuration, and competent officer assignment. |
| **Phase 6** | **BOSS Exit & Workflow Task Engine** | `/boss/projects/:id` | BOSS statutory sanction sign-off ("Approve Project Forward"), formal handover of operational jurisdiction, multi-departmental task lifecycle (Start, Accept, Reject, Resubmit), and real-time audit ledger. |

---

## 🗺️ Complete Route Directory

| URL Path | Role / Access Tier | Module / Description |
| :--- | :--- | :--- |
| `/` | Public | National Overview, Republic of India Map, Cadastral Console & Public Inquiry Form |
| `/login` | Public | Government Single Sign-On / Role Authentication Portal |
| `/projects` | `REQUESTING_AUTHORITY`, `ADMIN` | Proponent Project Register, KPI Triage Bar, and Active Requisitions |
| `/projects/new` | `REQUESTING_AUTHORITY` | Spatial Corridor Alignment Drafter & Statutory Annexure Uploader |
| `/projects/:projectId` | `REQUESTING_AUTHORITY`, `ADMIN` | Proponent Project Dossier, Corridor Geometry Preview & Multi-Stage Stepper |
| `/boss/dashboard` | `BOSS`, `ADMIN` | Central Scrutiny Worklist, National Geospatial Intelligence Radar, and Project Triage |
| `/boss/projects/:projectId` | `BOSS`, `ADMIN` | Pre-Feasibility Scrutiny Dossier, Card 5 Approval Engine & Task Audit Trail |
| `/boss/projects/:projectId/parcels` | `BOSS`, `ADMIN` | Interactive PostGIS Cadastral Determination Workbench (Bhu-Aadhaar Selection) |
| `/boss/projects/:projectId/workflow` | `BOSS`, `ADMIN` | Project-Specific Workflow Pipeline Workbench (Stages, SLAs, Officer Assignment) |
| `/boss/projects/:projectId/workflow?select=true` | `BOSS`, `ADMIN` | Master Workflow Template Blueprints Selection Gallery |

> 💡 **Role Switcher**: The authenticated government header includes an interactive **Dev Role Switcher** to quickly switch perspectives between `REQUESTING_AUTHORITY`, `BOSS`, `PROCESSING_OFFICER`, and `ADMIN`.

---

## 🔌 API Contract & Backend Developer Guidelines

All data access is designed strictly following REST API contracts defined in **[`API Contract & Ownership Document.md`](./API%20Contract%20&%20Ownership%20Document.md)**.

### Key API Specifications:
- **Base URL**: `/api/v1` (configured in `Frontend/src/services/api/client.ts` via `VITE_API_BASE_URL` or fallback).
- **Zero Local Dummy Data**: The frontend contains zero hardcoded mock dockets or fake projects in storage. All requests query the backend directly:
  - `GET /api/v1/projects`: Project listing & filters (`?status=...&search=...&mine=...`).
  - `POST /api/v1/projects`: Project requisition submission from Proponent Authorities.
  - `GET /api/v1/projects/:id`: Detailed project dossier.
  - `POST /api/v1/boss/projects/:id/land-records/fetch`: Cadastral land-records intersection.
  - `GET /api/v1/projects/:id/parcels`: Confirmed/candidate land parcels.
  - `POST /api/v1/boss/projects/:id/parcels/confirm`: Bhu-Aadhaar ULPIN confirmation payload `{ parcelIds: string[] }`.
  - `GET /api/v1/workflow-templates`: Master statutory workflow templates.
  - `GET /api/v1/users?role=PROCESSING_OFFICER`: Processing officers available for stage assignment.
  - `POST /api/v1/projects/:id/workflow/initialize`: Instantiates pipeline from master template.
  - `POST /api/v1/projects/:id/workflow/activate`: BOSS approval forward & transition to statutory task engine.
  - `GET /api/v1/tasks?assignedTo=...`: Processing officer tasks.
  - `POST /api/v1/tasks/:id/accept` / `reject`: Task progression state machine.
  - `POST /api/v1/projects/:id/workflow-stages/:stageId/resubmit`: Proponent defect rectification.
  - `GET /api/v1/projects/:id/timeline`: Chronological audit log trail.

---

## 🛑 Git Contribution Policy

> ⚠️ **CRITICAL INSTRUCTIONS FOR ALL DEVELOPERS:**
>
> 1. **DO NOT commit directly to `main`**:
>    Always create a dedicated feature or personal branch (`git checkout -b feature/your-feature-name` or `git checkout -b dev/yourname`).
> 2. **ALWAYS update this `README.md`**:
>    If you add new packages, modify terminal commands, add environment variables, or change launch procedures, you **must update this README** in your PR.

For the full step-by-step Git branching, commit convention, and PR guide, please consult:  
👉 **[`GIT_INSTRUCTIONS.md`](./GIT_INSTRUCTIONS.md)**

---

## 📦 Frontend Tech Stack

- **UI Framework**: React 19 + TypeScript + Vite 8
- **Routing**: React Router DOM v7
- **Server State Management**: TanStack Query v5
- **Forms & Validation**: React Hook Form + Zod v4
- **Spatial GIS & Maps**: Leaflet 1.9 (Dark Gray Canvas & Esri World Imagery)
- **HTTP Client**: Axios (with Bearer authorization interceptors & error boundaries)
- **Linter**: Oxlint
- **Design System**: Sovereign Editorial Broadside Palette (0px border-radius, high-contrast typography)
