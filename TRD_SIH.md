# Technical Requirements Document (TRD) — V1

## National Land Acquisition & Management System

## 1. Purpose

This document defines the technical requirements for building the National Land Acquisition & Management System.

The system is a government-facing digital platform for managing and monitoring the land acquisition lifecycle across projects, parcels, departments, districts, and states.

The technical design must support:

- End-to-end acquisition workflows
- Project and parcel management
- GIS-based project visualization
- AI-assisted document parsing
- Government system integrations
- Citizen communication through WhatsApp
- Compensation and R&R tracking
- Role-based access
- Notifications and alerts
- Risk scoring
- Document storage and versioning
- Tamper-evident audit and provenance using Hyperledger Fabric

The system should be designed so that the prototype can be expanded later without replacing its core architecture.

---

# 2. Locked Technology Stack

| Layer | Selected Technology | Port / Scope |
|---|---|---|
| **Web Frontend** | React 19 + TypeScript + Vite | Port `5173` (with `/api/v1` reverse proxy) |
| **Frontend Styling** | Vanilla CSS Variables / Sovereign Editorial Brutalism (`index.css`), Copernicus / Outfit / IBM Plex Mono fonts | Bespoke statutory brutalist design system; **Tailwind CSS explicitly omitted** |
| **Frontend State & Forms** | TanStack Query + native React Hooks + Zod | Client-side caching and schema validation |
| **Primary Backend API** | Node.js + Express 5 + TypeScript | Port `5000` (REST API with standardized envelopes) |
| **Spatial Database & Driver** | PostgreSQL 16 + PostGIS extension via `pg` connection pool | Port `5432` (`ST_Buffer`, `ST_Intersects`, `ST_Area`) |
| **AI Document Parser Microservice** | Node.js + Express 4 + TypeScript + Prisma ORM + BullMQ | Port `8000` (`sih-ai-document-parser`) |
| **AI Intelligence Models** | Google Gemini 1.5 Flash / Gemini 2.5 Flash via `@google/generative-ai` SDK | Cloud multimodal LLM extraction + local PII redaction |
| **OCR & Layout Analysis** | `pdf-parse`, optional `@google-cloud/vision`, and CV deskew/clahe | Page-level text extraction and layout bounding |
| **Cache & Task Queues** | Redis 7 + BullMQ | Port `6379` (async worker queue for document extraction) |
| **GIS Map Engine** | Leaflet + React-Leaflet | CartoDB Dark Matter & ESRI Dark tile layers + GeoJSON |
| **Document Vault & Storage** | Local filesystem storage (`/uploads`) + SHA-256 cryptographic hashing | Versioned statutory documents and physical evidence scans |
| **Citizen Channel** | Meta WhatsApp Business Cloud API webhooks | Webhook at `/api/v1/integrations/whatsapp` + `grievances` table |
| **Notifications** | In-app notification engine + role-targeted alerts | `notifications` table with live unread indicators |
| **Authentication & RBAC** | JWT (7d expiry), bcryptjs, role-based route middleware | Roles: `REQUESTING_AUTHORITY`, `BOSS`, `PROCESSING_OFFICER`, `ADMIN` |
| **Audit & Provenance** | PostgreSQL `audit_logs` + Hyperledger Fabric (Post-Prototype) | Full operational audit trail with tamper-evident cryptographic anchors |

Hosting/cloud provider is intentionally not fixed in this document.

---

# 3. System Architecture

The platform operates as a robust multi-service distributed architecture:

```text
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
└───────┬──────┘    └──────────────┘     └───────┬──────┘
        │                                        │
        ▼                                        ▼
┌──────────────────────────────┐         ┌──────────────────────────────┐
│  Meta WhatsApp Cloud API     │         │  Google Gemini 1.5/2.5 Flash │
│  (Citizen Grievance Webhook) │         │  (Document Parsing Engine)   │
└──────────────────────────────┘         └──────────────────────────────┘
```

The architecture guarantees strict separation of concerns, ensuring heavy OCR and LLM extraction jobs never block primary HTTP backend operations or frontend interaction.

---

# 4. Application Structure

The system should be organized into the following major functional modules.

## 4.1 Identity and Access Module

Responsible for:

- Government-user authentication
- Role-based access control
- Administrative permissions
- Session/token handling
- User identity mapping
- Access restrictions based on administrative level

The initial government identity integration may be simulated/mocked for the hackathon, but the application architecture must support a real government identity provider later.

---

## 4.2 Project Management Module

Each project is the main operational unit.

A project may span:

- Multiple states
- Multiple districts
- Multiple authorities
- Multiple departments
- Multiple land parcels

The project record should contain:

- Project ID
- Project name
- Project type
- Sponsoring department/agency
- Responsible authority
- States
- Districts
- Project location
- Total parcel count
- Acquisition progress
- Workflow progress
- Compensation status
- Possession status
- R&R status
- Risk score
- Milestones
- Related documents

---

# 5. Project + Parcel Data Model

The platform must use a hybrid model:

> Project is the primary operational unit, while each land parcel has its own lifecycle record.

Conceptually:

```text
Project
 |
 +-- Authority assignments
 |
 +-- States
 |
 +-- Districts
 |
 +-- Parcels
 |     |
 |     +-- Documents
 |     +-- Workflow
 |     +-- Compensation status
 |     +-- Possession status
 |     +-- R&R status
 |     +-- Risk score
 |
 +-- Project-level progress
 +-- Project-level reports
```

A project-level progress view must be calculated from underlying parcel/workflow information wherever possible.

---

# 6. Parcel Requirements

Each parcel should have a unique application-level parcel identifier.

Where authoritative identifiers such as ULPIN are available, they should be stored and mapped to the system parcel record.

The platform should support:

- Internal Parcel ID
- ULPIN, where available
- State parcel/cadastral identifier, where available
- Survey/Khasra number where applicable
- State
- District
- Village
- Area
- Project relationship
- Acquisition status
- Workflow status
- Compensation status
- Possession status
- R&R status
- Documents
- Audit history

The system must not assume that the application itself is the authoritative source for land ownership records.

---

# 7. Workflow Engine

## 7.1 Workflow model

The system must use a:

> Governed, configurable, version-controlled workflow engine.

There should be a common national workflow framework while allowing approved State/Department-level process variations.

The system must not allow ordinary officers to freely change legal workflow definitions.

---

## 7.2 Workflow hierarchy

```text
National Framework
       |
Central Nodal Authority
       |
Approved State Workflow
       |
Approved Department / Authority Process
       |
District Execution
```

Workflow definitions should support:

- Stages
- Responsible role/authority
- Required documents
- Required actions
- Approvals
- Dependencies
- SLA/deadline
- Notifications
- Validation rules
- Effective date
- Version

---

## 7.3 Workflow completion

Each stage is manually completed by its responsible officer.

The officer should provide the required information/documents and explicitly mark that stage complete.

The system records:

- Officer
- Timestamp
- Stage
- Completion action
- Supporting documents
- Version
- Audit event

The overall acquisition/project completion status is calculated by the system.

An officer cannot directly override the overall completion status.

---

## 7.4 Dynamic Officer Auto-Assignment Fallback

To prevent statutory workflow activation from failing when a stage lacks an explicitly pre-assigned officer, the backend implements an automated competency-matching fallback in `workflows.controller.ts`:

1. **Department & Role Matching**: The system queries active users matching role `PROCESSING_OFFICER` within the specific department named in the stage definition.
2. **General Cadre Fallback**: If no officer is found for that department, the system falls back to an active `PROCESSING_OFFICER` within the administrative jurisdiction.
3. **Activation Guarantee**: If a competent officer is identified, the stage's `assigned_officer_id` is updated and persisted automatically, preventing `400 Bad Request` blocking errors and ensuring workflow progress is seamless.

---

## 7.5 Rejection Recovery & Corrective Resubmission Lifecycle

When a statutory defect is detected during officer scrutiny:

1. **Defect Notice**: The Processing Officer rejects the stage with a mandatory statutory reason (`POST /api/v1/tasks/:id/reject`).
2. **Status Propagation**: The task and stage status transition to `REJECTED`, and the Requesting Authority is alerted immediately via in-app notification.
3. **Corrective Docket Resubmission**: The Requesting Authority reviews the defect note, rectifies the annexure, and executes `POST /api/v1/projects/:projectId/workflow-stages/:stageId/resubmit`.
4. **Jurisdictional Continuity**: The resubmission re-opens the task for the *same assigned processing officer* with status `ASSIGNED`, without requiring BOSS re-intervention or workflow re-instantiation.

---

# 8. Progress Calculation

The system must show two separate progress indicators.

## 8.1 Workflow progress

Example:

```text
6 of 8 required stages completed
= 75% workflow progress
```

## 8.2 Parcel acquisition progress

Example:

```text
750 of 1,000 parcels acquired
= 75% parcel progress
```

Both values should be visible together.

The two values must not be treated as the same metric because administrative progress and physical acquisition progress can differ.

---

# 9. GIS Requirements

GIS is an operational overview and monitoring feature, not the primary parcel-editing interface.

## 9.1 Selected technology

> Leaflet + OpenStreetMap

## 9.2 GIS responsibilities

The map should show:

- Project location
- Project boundaries/location where available
- Responsible authority/department
- States and districts associated with the project
- Total parcel count
- Acquired parcel count
- Pending parcel count
- Overall project progress

The map should allow the user to select a project and open its detailed record.

Detailed parcel operations should remain primarily in normal tables, forms, and project screens.

The system should not require advanced GIS editing for the core prototype.

---

# 10. Government API Integration

Government integrations must be isolated through a dedicated integration/API gateway layer.

The core application should not be tightly coupled to individual government systems.

The integration layer should support:

- ULPIN / land-record services where APIs are available
- PM Gati Shakti-related services where APIs are available
- Cadastral/parcel services
- Other relevant government portals
- Future systems

## 10.1 Direction of integration

The system must support bidirectional integration.

### Incoming data

The platform may consume:

- Land records
- Parcel identifiers
- Cadastral information
- Authoritative status information
- Other approved reference data

### Outgoing data

The platform may send approved acquisition-related events or updates, such as:

- Acquisition status
- Award information
- Compensation status
- Possession status
- Other authorized acquisition events

Write-back must be controlled and permission-based.

The system must not assume that it can directly overwrite authoritative ownership/cadastral records.

---

# 11. Document Management

The system must use a hybrid document model.

## 11.1 Documents managed by our platform

Actual files uploaded or generated through the platform are stored in object storage.

PostgreSQL stores:

- Document ID
- File reference
- Document type
- Parcel/project relationship
- Version
- Uploaded by
- Upload time
- Permissions
- Hash
- Processing status
- Verification status

## 11.2 External documents

Where an authoritative government system stores a document, the platform may store:

- External document ID
- External system name
- Secure reference/link
- Document metadata
- Access information required for integration

The external system remains the source of the document.

---

# 12. Document Versioning

Documents must support version control.

Example:

```text
Award_v1
   |
Award_v2
   |
Award_v3
```

Each version must retain:

- Version number
- File reference
- Upload timestamp
- User who uploaded it
- Hash
- Processing result
- Verification status

Older versions must not be silently overwritten.

---

# 13. AI-Powered Document Parsing

The AI feature reduces manual data entry from scanned statutory acquisition records, revenue notices, and physical field evidence. It acts as an automated drafting accelerator without replacing statutory human approval.

## 13.1 Microservice Architecture

The parsing pipeline is deployed as a dedicated standalone service (`AI_Document_Parser` on Port `8000`):

- **Runtime & Framework**: Node.js + Express 4 + TypeScript + Prisma ORM
- **AI Intelligence**: Google Gemini 1.5 Flash / Gemini 2.5 Flash via `@google/generative-ai`
- **OCR & Document Ingestion**: `pdf-parse`, optional `@google-cloud/vision`, and OpenCV image preprocessing
- **Task Queue**: Redis 7 + BullMQ for non-blocking asynchronous processing
- **PII Protection**: Local regex & NLP masking of sensitive citizen identifiers (Aadhaar, PAN, phone numbers, bank accounts) prior to external LLM dispatch

---

## 13.2 Dual-Upload & Ingestion Pipeline

To prevent file upload race conditions and maintain data integrity, the frontend executes a dual-upload synchronization pattern:

```text
               Officer Evidence Upload (PDF / Scanned Image)
                                     |
                -------------------------------------------
                |                                         |
                v                                         v
   AI Document Parser (:8000)                 Backend REST API (:5000)
                |                                         |
   - Stores file in local /uploads            - Stores file in /uploads
   - Creates Prisma document record           - Creates PostgreSQL document record
   - Enqueues BullMQ parsing job              - Links to Task & Project dossier
   - Returns 202 Accepted immediately         - Provides dossier download endpoint
```

---

## 13.3 Asynchronous State Machine & Polling Contract

The AI microservice executes heavy OCR and LLM calls in background workers. The frontend polls `GET /api/v1/documents/:id/extraction` using the following statutory status state machine:

| Status Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `PENDING` | `202 Accepted` | Job enqueued in BullMQ; waiting for worker pickup |
| `GEMINI_EXTRACTING` | `202 Accepted` | OCR layout complete; Gemini multimodal prompt in execution |
| `COMPLETED` | `200 OK` | Structured fields, confidence scores, and metadata ready |
| `EMPTY` | `200 OK` | Document classified (e.g. handwritten/degraded), but no extractable text was found |
| `FAILED` | `500 / Error` | Processing error encountered (3 automated retries permitted) |

---

## 13.4 Extracted Statutory Fields & Confidence Scoring

The microservice supports 20+ Indian land acquisition and revenue document types (Sale Deeds, 7/12 Extracts, RFCTLARR Sec 4/11 Notifications, Award Orders, R&R Forms). Extracted attributes include:

- **Cadastral Identifiers**: Survey / Khasra Number, Bhu-Aadhaar ULPIN, Sub-division
- **Spatial Extents**: Area in Acres / Hectares / Square Meters
- **Administrative Hierarchy**: Village, Tehsil / Taluka, District, State
- **Statutory Metadata**: Gazette Notification Number, Notification Date, Award Number, Award Date
- **Signatory Authorities**: Competent Authority (CALA), Land Acquisition Collector, Revenue Inspector

### Confidence Normalization:
The LLM outputs qualitative confidence ratings, which the officer interface normalizes to numeric percentages:
- `high` -> `95%` (Verified match against standard statutory templates)
- `medium` -> `80%` (Partial ambiguity, review recommended)
- `low` -> `55%` (Degraded text / non-standard font; human audit required)
- Missing required fields are explicitly flagged to direct officer attention.

---

## 13.5 Dual-Pane Human Verification & Sign-Off

AI extractions never bypass official verification. The officer workbench (`OfficerTaskDetailPage.tsx`) renders a synchronized dual-pane inspection interface:
- **Left Pane**: High-resolution zoomable viewer for the physical wet-ink scanned evidence / site photo.
- **Right Pane**: Interactive auto-filled soft-copy form showing extracted values and confidence badges.

The officer reviews, rectifies any OCR misreads, and clicks **Verify & Sign-Off Record** (`POST /api/v1/documents/:id/verify`), which writes an immutable verification audit record before the stage can be formally accepted.

---

# 14. Background Processing

Heavy and external operations should run asynchronously.

## Selected technology

> Redis + BullMQ

Background jobs should handle:

- OCR processing
- Gemini extraction
- Document reprocessing
- Notifications
- Email sending
- WhatsApp message processing where useful
- Other long-running or retryable tasks

Example:

```text
File Upload
    |
    v
Express API
    |
    v
BullMQ Job
    |
    v
Redis
    |
    v
Worker
    |
    +--> OCR
    +--> Gemini
    +--> Validation
    |
    v
PostgreSQL
```

Jobs should support:

- Retries
- Failure states
- Logging
- Safe reprocessing
- Status tracking

---

# 15. WhatsApp Citizen Communication

There is no citizen role in the main web application. Citizens interact with the system through the Meta WhatsApp Business Cloud API.

## Selected technology

> Meta WhatsApp Business Cloud API (Integrated at `/api/v1/integrations/whatsapp`)

The main web platform remains exclusively for authenticated government stakeholders, while WhatsApp serves as the universal citizen channel.

```text
Landowner / Citizen
        |
    WhatsApp
        |
Meta Cloud API Webhook
        |
        v
POST /api/v1/integrations/whatsapp
        |
        v
PostgreSQL `grievances` Record (Linked to Project & Land Parcel)
        |
        v
Rendered in Proponent Project Page & Officer Workbench
```

## 15.1 Implemented Webhook Contracts & Schema

1. **Webhook Verification (Challenge)**:
   - `GET /api/v1/integrations/whatsapp` validates `hub.mode`, `hub.verify_token`, and responds with `hub.challenge`.
2. **Interactive Ingestion**:
   - `POST /api/v1/integrations/whatsapp` parses incoming text messages, interactive button replies, and media attachments.
3. **Database Schema (`grievances` table)**:
   - `id`: UUID primary key
   - `reference_number`: Unique citizen tracking identifier (e.g. `GRV-2026-XXXX`)
   - `project_id`: Foreign key referencing `projects(id)`
   - `parcel_id`: Foreign key referencing `land_parcels(id)` (if matched by survey number)
   - `source`: `'WHATSAPP'`
   - `citizen_name`, `citizen_phone`, `citizen_phone_hash`: Citizen contact information
   - `survey_number`, `subject`, `description`: Grievance details
   - `status`: `'OPEN'`, `'UNDER_REVIEW'`, `'RESOLVED'`, `'CLOSED'`
   - `wa_message_id`: Meta message identifier for delivery tracking

Citizen objections and status queries submitted via WhatsApp appear in real-time on the Requesting Authority's project detail dashboard under **Statutory Grievances & Citizen Objection Record**.

---

# 16. Notifications and Alerts

The platform implements an in-app multi-channel statutory notification engine.

## 16.1 Implemented Database Schema & REST Endpoints

### Table: `notifications`
- `id`: UUID primary key
- `user_id`: Target officer UUID
- `role`: Target statutory role (`REQUESTING_AUTHORITY`, `BOSS`, `PROCESSING_OFFICER`)
- `project_id`: Linked project UUID
- `task_id`: Linked workflow task UUID
- `type`: Notification category (`STAGE_REJECTED`, `STAGE_ASSIGNED`, `WORKFLOW_ACTIVATED`, `SLA_WARNING`)
- `title` & `message`: Statutory alert payload
- `link`: Direct application navigation URL
- `read`: Boolean status flag (defaults to `false`)
- `created_at`: Timestamp

### REST Endpoints:
```http
GET    /api/v1/notifications
PATCH  /api/v1/notifications/:id/read
POST   /api/v1/notifications/mark-all-read
DELETE /api/v1/notifications/:id
```

Trigger rules generate real-time alerts for statutory events such as officer task assignment, stage defect rejections, and corrective resubmissions.

---

# 17. Compensation Tracking

The platform will track compensation rather than calculate it or operate a complete payment engine.

Required fields may include:

- Assessed amount
- Approved amount
- Payment reference
- Payment status
- Paid amount
- Payment date
- Outstanding amount
- Related parcel/person record

The platform may integrate with approved government payment systems where available.

The hackathon prototype may use a mock/sandbox integration for demonstration.

---

# 18. Rehabilitation & Resettlement Tracking

The system must track R&R progress at project and parcel/affected-family levels where applicable.

Possible statuses:

```text
Not Started
In Progress
Completed
Delayed
```

The system should support:

- R&R milestones
- Responsible authority
- Status
- Due date
- Completion date
- Supporting documents
- Related affected families
- Audit history

---

# 19. Risk Scoring

Risk scores are required at:

- Project level
- Parcel level

Risk scoring is not intended to be a fully predictive AI model.

The score should be based on measurable operational conditions.

Possible inputs:

- Overdue workflow stages
- Pending approvals
- Missing documents
- Pending compensation
- Pending possession
- Delayed R&R
- Unresolved objections/grievances
- Other configured risk indicators

Example:

```text
Project Risk Score: 78 / 100

Pending approvals       +20
Compensation delays     +25
R&R delay               +15
Missing documents       +10
Unresolved grievances   +8
```

The exact scoring formula should be configurable.

The system should allow decision-makers to identify the causes behind a risk score rather than showing only a number.

---

# 20. Analytics and Reporting

The analytics layer should focus on standard reporting plus risk scoring.

The system should support:

## National level

- Total projects
- Total land proposed
- Total land acquired
- Total compensation assessed
- Total compensation paid
- Affected families
- Displaced families
- R&R progress
- Overall project progress
- Possession status
- Timeline adherence
- High-risk projects

## State level

Same indicators filtered by state.

## District level

Same indicators filtered by district.

## Project level

- Workflow progress
- Parcel acquisition progress
- Compensation status
- Possession
- R&R
- Timeline
- Risk score
- Pending actions

Reports should be exportable where required.

---

# 21. Authentication and RBAC

The system must use:

> Government identity integration + application-level RBAC.

## Core roles

The system should have predefined core government roles, such as:

- Central authority
- State authority
- District authority
- Project implementing agency
- Field officer
- Authorized system administrator

The citizen is not a web-app role.

Citizen communication is handled through WhatsApp.

## Configurable permissions

Within defined administrative boundaries, authorized administrators may configure limited permissions.

Regular officers must not be able to grant themselves additional authority.

Access must be checked at:

- Role level
- Administrative level
- Project assignment
- Action level
- Data sensitivity level where applicable

---

# 22. Frontend Technical Requirements

## Selected Stack & Design Language

- **Core**: React 19 + TypeScript + Vite (Port `5173`)
- **Styling Architecture**: Strict bespoke **Sovereign Editorial / Statutory Brutalist Design System** via Vanilla CSS variables (`index.css`):
  - Primary Background: Archival blush paper (`#faf8f5` / `--bg-primary`)
  - Crisp Borders: Solid `#000000` statutory boundary strokes (`--border-crisp`)
  - Typography: Serif authority headers (Copernicus / Georgia), clean metadata (Outfit), and monospaced statutory references (IBM Plex Mono)
  - Status Indicators: Pill badges with statutory color tokens (`#2e7d32` verified, `#d32f2f` rejected, `#ed6c02` pending)
  - **Tailwind CSS is explicitly omitted** to avoid generic utility clutter and retain total typographic sovereignty.
- **Client State**: TanStack Query + native React Hooks
- **Form Management**: React Hook Form + Zod schema validation
- **Spatial GIS**: Leaflet + React-Leaflet with CartoDB Dark Matter / ESRI tile layers and PostGIS GeoJSON vector overlays

The frontend provides:
- Sovereign Government Header with instant multi-role switcher (`REQUESTING_AUTHORITY`, `BOSS`, `PROCESSING_OFFICER`, `ADMIN`)
- Responsive public GIS landing page and cadastral transparency console
- Requesting Authority docket creation with interactive corridor alignment and RoW buffer generation
- BOSS Geospatial Radar, candidate parcel determination, and statutory workflow configuration
- Processing Officer task execution workbench with SLA countdowns and dual-pane verification
- Central statutory document repository with cryptographic checksums

---

# 23. Backend Technical Requirements

## Selected Stack & Runtime

- **Runtime & Framework**: Node.js + Express 5 + TypeScript (Port `5000`)
- **Database Engine**: PostgreSQL 16 with PostGIS spatial extension enabled (Port `5432`)
- **Database Access**: Native `pg` connection pool executing parameterized SQL and PostGIS spatial queries (`ST_Buffer`, `ST_Intersects`, `ST_Area`)
- **Cache & Message Broker**: Redis 7 (Port `6379`)

The backend is responsible for:
- Standardized REST response envelopes: `{ success: boolean, data?: any, error?: { message: string, code?: string } }`
- Centralized error handling via custom `ApiError` class and middleware
- JWT authentication with 7-day expiration and server-side RBAC enforcement
- Dynamic workflow engine with automatic officer auto-assignment fallback
- Multi-tier task management (Start, Accept, Defect Reject, and Proponent Resubmit)
- Project & parcel lifecycle management with spatial intersection calculation
- Document vault management with SHA-256 cryptographic checksums and physical evidence tagging
- Meta WhatsApp Business Cloud API webhook processing and citizen grievance tracking
- Multi-channel in-app notification engine
- Structured operational audit logging in PostgreSQL `audit_logs`

---

# 24. Implemented REST API Endpoints

The primary backend exposes versioned REST APIs under `/api/v1`:

```http
# Authentication & Identity
POST   /api/v1/auth/login
GET    /api/v1/auth/me
POST   /api/v1/auth/logout

# User Management & Roles
GET    /api/v1/users
GET    /api/v1/users/:id

# Proponent Projects
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
PATCH  /api/v1/projects/:id
POST   /api/v1/projects/:id/geometry
POST   /api/v1/projects/:id/documents
POST   /api/v1/projects/:id/submit

# BOSS Scrutiny & Parcel Determination
GET    /api/v1/boss/dashboard
GET    /api/v1/boss/projects/:projectId/parcels
POST   /api/v1/boss/projects/:projectId/land-records/fetch
POST   /api/v1/boss/projects/:projectId/parcels/confirm
POST   /api/v1/boss/projects/:projectId/sanction

# Workflow Templates & Instances
GET    /api/v1/workflow-templates
GET    /api/v1/workflow-templates/:id
POST   /api/v1/projects/:projectId/workflow/initialize
GET    /api/v1/projects/:projectId/workflow
PUT    /api/v1/projects/:projectId/workflow/stages/:stageId
POST   /api/v1/projects/:projectId/workflow/stages
DELETE /api/v1/projects/:projectId/workflow/stages/:stageId
POST   /api/v1/projects/:projectId/workflow/activate

# Processing Officer Tasks
GET    /api/v1/tasks
GET    /api/v1/tasks/:id
POST   /api/v1/tasks/:id/start
POST   /api/v1/tasks/:id/accept
POST   /api/v1/tasks/:id/reject
POST   /api/v1/tasks/:id/evidence

# Proponent Rejection Recovery
POST   /api/v1/projects/:projectId/workflow-stages/:stageId/resubmit

# Statutory Document Vault
POST   /api/v1/documents/upload
GET    /api/v1/documents/:id
GET    /api/v1/documents/:id/download
POST   /api/v1/documents/:id/verify

# AI Document Intelligence Microservice (:8000)
POST   http://localhost:8000/api/v1/documents/upload
GET    http://localhost:8000/api/v1/documents/:id/processing
GET    http://localhost:8000/api/v1/documents/:id/extraction
POST   http://localhost:8000/api/v1/documents/:id/verify

# Public GIS & Transparency
GET    /api/v1/public/overview
GET    /api/v1/public/states
POST   /api/v1/public/inquiry

# Citizen Grievances & WhatsApp Cloud API
GET    /api/v1/grievances
GET    /api/v1/grievances/:id
GET    /api/v1/integrations/whatsapp           # Webhook verification
POST   /api/v1/integrations/whatsapp           # Message & objection receiver

# In-App Notifications
GET    /api/v1/notifications
PATCH  /api/v1/notifications/:id/read
POST   /api/v1/notifications/mark-all-read
DELETE /api/v1/notifications/:id
```

---

# 25. Database Requirements

## Selected database

> PostgreSQL + PostGIS

PostgreSQL should store the main application data.

PostGIS should store geographic information required by the GIS layer.

Primary data domains include:

- Users
- Roles
- Permissions
- Projects
- States
- Districts
- Authorities
- Parcels
- Workflow definitions
- Workflow versions
- Workflow instances
- Workflow stages
- Documents
- Document versions
- Compensation
- Affected families
- R&R records
- Grievances
- Notifications
- Risk scores
- Audit events
- External integration references

---

# 26. Blockchain and Provenance

## Selected blockchain

> Hyperledger Fabric

The blockchain is a trust/audit layer.

It should not become the primary application database.

## 26.1 On-chain information

Store important provenance information such as:

- Document hash
- Document version hash
- Important workflow event
- Event timestamp
- Responsible authority
- Relevant record identifier
- Verification/provenance information

## 26.2 Off-chain information

Store in PostgreSQL/object storage:

- Actual PDFs
- Images
- Personal information
- Full land records
- Detailed application data
- Other large or sensitive files

---

# 27. Blockchain Network Structure

For the prototype, use a small Hyperledger Fabric network that represents a realistic multi-organization structure.

Conceptually:

```text
Central Organization
        |
State Organization
        |
District Organization
```

The hackathon implementation may use a small development network while preserving the concept of separate organizational identities.

The system should demonstrate that an important event/document version can produce a verifiable provenance record.

---

# 28. Application Audit Log

Blockchain does not replace the application audit log.

PostgreSQL should contain the detailed operational audit record.

Example:

```text
User
Action
Entity
Old Value
New Value
Timestamp
IP / Request Context where appropriate
```

Important events should also be anchored/proven through the Hyperledger Fabric layer.

Therefore:

> PostgreSQL = operational audit history  
> Hyperledger Fabric = tamper-evident provenance for important events/documents

---

# 29. Security Requirements

The platform handles sensitive government and personal information.

The implementation should support:

- Secure authentication
- Role-based access control
- Server-side authorization checks
- Secure API communication
- Secure document access
- Encryption in transit
- Protected storage
- Audit logging
- Input validation
- File type and size validation
- Malware/security scanning where available
- Secrets kept outside source code
- Least-privilege access
- Controlled integration credentials

Personal information should not be written to public blockchain networks.

---

# 30. API Integration Security

Government integrations should use:

- Strong authentication
- API credentials/secrets management
- Request validation
- Response validation
- Logging
- Retry controls
- Rate limiting where required
- Explicit allowlists/permissions for write-back operations

The integration layer should isolate failures in an external system from the core application.

---

# 31. Data Validation

Validation should happen at multiple levels:

```text
Frontend validation
        ↓
Backend validation
        ↓
Business-rule validation
        ↓
Database constraints
```

AI-extracted values must also pass normal application validation.

AI output must not bypass workflow rules.

---

# 32. Error Handling

The platform must handle failures for:

- Government APIs
- OCR
- Gemini
- WhatsApp API
- Email
- Object storage
- Blockchain network
- Background jobs

The system should show clear status such as:

```text
Processing
Completed
Needs Review
Failed
Retry Available
```

A failure in OCR or blockchain recording should not silently corrupt or lose the primary application record.

---

# 33. Real-Time Requirement

True instant real-time synchronization is not required.

A small delay in map/dashboard rendering is acceptable.

The system may refresh or refetch data through normal REST requests.

WebSockets are not required for the current scope.

---

# 34. Non-Functional Requirements

The system should be:

### Scalable
Able to grow from a hackathon dataset to larger national datasets.

### Maintainable
Modules should be separated clearly.

### Extensible
New government integrations, workflow templates, notification channels, and document types should be addable without major rewrites.

### Auditable
Important actions must be traceable to a user and timestamp.

### Secure
Sensitive data must be protected.

### Reliable
External service failures should not break core records.

### Usable
Government officers should be able to operate the main workflow without technical knowledge.

---

# 35. Hackathon Scope

The prototype should demonstrate the main value of the platform without implementing every possible government integration.

## Must demonstrate

1. Government authentication / simulated identity integration
2. RBAC
3. Project creation
4. Project containing multiple parcels
5. Workflow with responsible officers
6. Manual stage completion
7. Automatic overall progress calculation
8. GIS project visualization
9. Document upload
10. OCR + Gemini extraction
11. Officer verification
12. Compensation tracking
13. R&R tracking
14. Project and parcel risk scores
15. Rule-based alerts
16. Blockchain-backed document/event provenance
17. WhatsApp citizen communication
18. Government API integration through a mocked or sandbox integration layer

## Can be mocked/simulated

- Actual ULPIN production API
- Actual PM Gati Shakti API
- Real government identity provider
- Real payment/DBT system
- Full nationwide dataset
- Production-scale multi-organization blockchain deployment

The architecture must still make these integrations possible later.

---

# 36. Recommended Demonstration Flow

The complete demo should show one acquisition moving through the system.

```text
Government Officer Login
        ↓
Create Project
        ↓
Add / import parcels
        ↓
Upload acquisition document
        ↓
OCR + Gemini extraction
        ↓
Form auto-populated
        ↓
Officer verifies extracted data
        ↓
Parcel linked to project
        ↓
Workflow begins
        ↓
Responsible officers complete stages
        ↓
Progress indicators update
        ↓
Compensation status recorded
        ↓
Possession / R&R updated
        ↓
Risk score changes
        ↓
Audit event recorded in PostgreSQL
        ↓
Important event/document hash recorded in Fabric
        ↓
Government dashboard reflects project status
        ↓
Citizen sends WhatsApp objection/document
        ↓
Request appears in government platform
```

This flow demonstrates the main USP:

> **Document → Parcel → Workflow → Compensation/R&R → Audit → Decision Support**

---

# 37. Final Architecture Summary

```text
┌────────────────────────────────────────────────────────┐
│                   Web Browser Client                   │
│         React 19 + TypeScript + Vite + Leaflet         │
│          Vanilla CSS (Sovereign Editorial System)      │
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
└───────┬──────┘    └──────────────┘     └───────┬──────┘
        │                                        │
        ▼                                        ▼
┌──────────────────────────────┐         ┌──────────────────────────────┐
│  Meta WhatsApp Cloud API     │         │  Google Gemini 1.5/2.5 Flash │
│  (Citizen Grievance Webhook) │         │  (Document Parsing Engine)   │
└──────────────────────────────┘         └──────────────────────────────┘
```

---

# 38. Locked Decisions

The following decisions are final for the platform architecture:

- **React 19 + TypeScript + Vite** for web client performance.
- **Strict Vanilla CSS Variables** for the Sovereign Editorial Brutalist design system (**Tailwind CSS is omitted**).
- **Node.js + Express 5 + TypeScript** for the primary backend REST API (Port `5000`).
- **PostgreSQL 16 + PostGIS** for relational and spatial vector data storage (Port `5432`).
- **AI Document Parser Microservice** on Port `8000` (Node.js + Express 4 + TypeScript + Prisma ORM + BullMQ).
- **Google Gemini 1.5/2.5 Flash** via `@google/generative-ai` for cloud multimodal intelligence with local client-side PII redaction.
- **No local LLM hosted** on resource-constrained servers.
- **Dual-Upload Synchronization** to both AI Parser and Backend project dossier.
- **Asynchronous 202 Polling** for non-blocking document extraction.
- **Qualitative Confidence Scoring** normalized to percentages (`high: 95%`, `medium: 80%`, `low: 55%`).
- **Dual-Pane Verification UI** enabling human officers to inspect physical scans side-by-side with pre-filled forms.
- **Leaflet + CartoDB Dark Matter / ESRI** for GIS corridor plotting and cadastral parcel inspection.
- **Dynamic Officer Auto-Assignment Fallback** ensuring workflow activation never blocks on unassigned stages.
- **Requesting Authority Rejection Recovery** via dedicated `/resubmit` route without BOSS re-intervention.
- **Meta WhatsApp Business Cloud API** webhooks for citizen queries and objection logging to `grievances` table.
- **Multi-Channel In-App Notifications** (`notifications` table) with role-targeted alert dispatching.
- **PostgreSQL Operational Audit Log** for all user actions, with Hyperledger Fabric consortium anchors planned for Post-Prototype Phase 29.
