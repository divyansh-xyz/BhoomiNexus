# Project Requirement Documents

## Real-Time National Land Acquisition & Management System

**Document purpose:** This document explains the complete project in simple English so that a developer, designer, judge, teammate, or new team member can understand what we are building, why we are building it, who will use it, and what the system must do.

---

# 1. Project Overview

We are building a **web-based National Land Acquisition & Management System** for the Government and public authorities in India.

The system will digitally manage and monitor the land acquisition process from the time a project is proposed until the land is acquired, possession is taken, compensation is paid, and Rehabilitation & Resettlement (R&R) is completed.

The system is designed for projects such as:

- Highways
- Railways
- Irrigation projects
- Industrial corridors
- Urban development
- Renewable energy projects
- Other public infrastructure and strategic projects

The main idea is simple:

> **Bring the complete land acquisition process into one secure platform where authorities can submit, verify, approve, track, map, monitor, and analyze land acquisition work.**

---

# 2. Problem We Are Solving

Land acquisition is currently handled through a mix of manual work, documents, different software systems, and state-specific processes.

This creates problems such as:

- Data is spread across different offices and systems.
- The same information may be entered more than once.
- Approvals can take too long.
- It is difficult to know who is responsible for the next step.
- Officers may not have a single view of project progress.
- Senior officials may not have real-time information.
- Land parcel information may not be easy to view on a map.
- Compensation and possession status can be difficult to track.
- R&R progress can be missed or delayed.
- Important documents may be difficult to find and compare.
- Changes to records need a clear audit trail.
- There is limited transparency across agencies.

The platform should solve these issues by creating **one common digital system** for land acquisition monitoring and decision support.

---

# 3. Main Goal

The goal is to create a system that provides:

1. **One end-to-end digital workflow** for land acquisition.
2. **One common data view** for projects, land parcels, compensation, possession, and R&R.
3. **GIS maps** to show exactly where acquired and pending land is located.
4. **Role-based access** so each stakeholder sees and does only what they are allowed to do.
5. **Real-time dashboards** for project, state, and national monitoring.
6. **Secure document management** with version history and audit records.
7. **Automated alerts** for delays, missing actions, and important deadlines.
8. **AI-powered document parsing** using OCR and NLP to reduce manual data entry.
9. **Risk and analytics features** to identify delays, anomalies, and problem areas.
10. **A tamper-evident audit layer** to improve trust and accountability.
11. **APIs and integration** so the platform can work with existing government systems.
12. **Mobile-friendly field tools** for verification and data collection.

---

# 4. Who We Are Building It For

The system is a multi-stakeholder government platform.

## 4.1 Project Implementing Agencies

Examples:

- Highway project agencies
- Railway project agencies
- Infrastructure departments
- Public sector project bodies

They will use the system to:

- Create projects
- Submit land acquisition proposals
- Upload project documents
- Track land requirements
- Monitor acquisition progress
- View compensation and possession status
- View project-level dashboards

## 4.2 District Authorities

They will use the system to:

- Verify project and land information
- Verify land parcels
- Review documents
- Update field status
- Manage notifications and local actions
- Track affected and displaced families
- Update possession and R&R progress

## 4.3 State Authorities

They will use the system to:

- Review proposals from districts
- Monitor projects across the state
- Track state-level progress
- Compare districts and projects
- Monitor delays and bottlenecks
- Prepare reports

## 4.4 Central Ministries / Central Authorities

They will use the system for:

- National monitoring
- Project comparison
- State comparison
- Policy and decision support
- Monitoring major delays
- Viewing national dashboards and reports

## 4.5 System Administrators

They will manage:

- Users
- Roles
- Permissions
- Workflow rules
- Master data
- System configuration
- Audit access

## 4.6 Field Officers

They will use mobile-friendly tools to:

- Verify land parcels
- Capture field information
- Add photos and evidence
- Record location data
- Update possession and R&R information
- Submit field verification for approval

## 4.7 Citizens / Landowners (Controlled Public View)

A future or limited public-facing view may show approved non-sensitive information such as:

- Project name
- General project location
- Acquisition stage
- Notification status
- General progress
- Public notices

Sensitive personal and legal information must not be exposed publicly.

---

# 5. High-Level System Idea

The system has four main parts:

```text
                    NATIONAL LAND PLATFORM
                             |
        +--------------------+--------------------+
        |                    |                    |
     WORKFLOW               GIS                ANALYTICS
        |                    |                    |
   Submission           Land parcels        Risk scores
   Verification         Project maps        Delay prediction
   Approval             Status layers       Anomaly detection
   Compensation                             Reports
   Possession
   R&R
        |                    |                    |
        +--------------------+--------------------+
                             |
                     COMMON DATA LAYER
                             |
                APIs / Land Records / Other Systems
```

A simple way to understand the platform is:

> **Workflow manages the process. GIS shows where it is happening. Analytics shows what is happening and what may go wrong. The audit layer shows what changed and who changed it.**

---

# 6. End-to-End Land Acquisition Workflow

The platform should support an end-to-end lifecycle.

A practical workflow for the prototype is:

```text
Project Created
      |
Land Requirement Defined
      |
Land Parcels Identified
      |
Proposal Submitted
      |
Document Verification
      |
District Scrutiny
      |
State Review / Approval
      |
Notification Issued
      |
Award Declared
      |
Compensation Assessed
      |
Compensation Disbursed
      |
Possession Taken
      |
R&R Progress Updated
      |
Acquisition Completed
```

The exact legal workflow can vary by process and authority. Therefore, the software must use a **configurable workflow** rather than assuming that every state or project follows exactly the same steps.

---

# 7. Core Feature 1: Project Management

Users with permission can create and manage projects.

Each project should contain information such as:

- Project ID
- Project name
- Project type
- Project implementing agency
- State
- District(s)
- Project location
- Required land area
- Current stage
- Start date
- Target completion date
- Key milestones
- Responsible authority

The project page should show the complete current status of the project in one place.

---

# 8. Core Feature 2: Land Parcel Management

Each land parcel should have a unique ID.

The system should track information such as:

- Parcel ID
- Survey / plot number
- Village
- Taluk / Tehsil
- District
- State
- Area
- Land type
- Current acquisition status
- Project linked to the parcel
- Notification status
- Award status
- Compensation status
- Possession status
- R&R status
- Geographic coordinates / polygon

Possible parcel statuses:

- Proposed
- Under verification
- Notified
- Award declared
- Compensation pending
- Compensation paid
- Possession pending
- Possession completed
- R&R pending
- Completed
- Disputed / under review

---

# 9. Core Feature 3: GIS and Map View

GIS is an important part of the system.

The map should not be only a location marker. It should show **actual land parcels and their acquisition status**.

The map should support layers such as:

- Project boundary
- Land parcels
- Proposed parcels
- Acquired parcels
- Pending parcels
- Disputed parcels
- Compensation paid
- Compensation pending
- R&R pending
- Critical delay areas

Users should be able to click a parcel and open its details.

Example:

```text
Parcel: MH-PN-004821
Area: 2.41 acres
Status: Acquired
Compensation: Paid
Possession: Completed
R&R: Pending
```

The purpose of GIS is to help authorities quickly understand **where the problem is**, not only how much land is involved.

---

# 10. Core Feature 4: Role-Based Access Control (RBAC)

Different users must have different permissions.

Examples:

| Role | Main Access |
|---|---|
| Project Agency | Create projects, submit proposals, track own projects |
| Field Officer | Field verification and field updates |
| District Authority | Scrutiny, verification, local approvals, updates |
| State Authority | State-level review and monitoring |
| Central Authority | National monitoring and decision support |
| Administrator | Users, roles, workflow and system settings |

Every important action should be linked to the logged-in user.

---

# 11. Core Feature 5: Online Proposal Submission and Approval

The system should allow authorized users to:

1. Create a proposal.
2. Enter project and land details.
3. Upload supporting documents.
4. Add or select land parcels.
5. Submit the proposal.
6. Send it automatically to the correct authority.
7. Verify the submitted information.
8. Approve, reject, or send it back for correction.
9. Track every status change.

The user should always be able to see:

- Current status
- Current responsible authority
- Next required action
- Submission date
- Pending time
- Reason for rejection / return, where applicable

---

# 12. Core Feature 6: Automated Workflow Routing

The system should automatically route a proposal or task to the correct officer or authority based on configurable rules.

Example:

```text
Proposal submitted
        |
        v
District Authority
        |
        v
State Authority
        |
        v
Central Authority / Final Review
```

The exact routing should be configurable.

This reduces manual forwarding of files and makes responsibility clear.

---

# 13. Core Feature 7: Milestones and Timeline Monitoring

Each project should have milestones.

Example:

| Milestone | Target | Status |
|---|---:|---|
| Proposal submission | Day 0 | Completed |
| Scrutiny | Day 15 | Completed |
| Notification | Day 30 | Completed |
| Award | Day 90 | Delayed |
| Compensation | Day 120 | Pending |
| Possession | Day 150 | Pending |
| R&R | Day 180 | Pending |

The system should calculate:

- Planned date
- Actual date
- Delay in days
- Current responsible authority
- Next action

---

# 14. Core Feature 8: Automated Alerts and Notifications

The system should automatically send alerts when action is required.

Examples:

- Approval pending for too long
- Document missing
- Milestone approaching
- Milestone overdue
- Compensation pending
- Possession pending
- R&R action pending
- Verification rejected
- Important workflow status changed

Notifications may appear through:

- In-app alerts
- Email
- SMS or other government-approved notification channels, if integrated

---

# 15. Core Feature 9: Document Management

The platform needs a secure document repository.

Users should be able to:

- Upload documents
- View documents
- Download documents where permitted
- Replace documents through a new version
- See document version history
- Track who uploaded or changed a document
- Link documents to a project, parcel, notification, award, compensation record, etc.

The system should keep an audit history for document actions.

---

# 16. Advanced Feature: AI-Powered Document Parsing (OCR + NLP)

This is one of the useful AI features for this project.

The goal is to reduce manual entry from scanned documents and PDFs.

Basic flow:

```text
PDF / Scanned Document
          |
          v
         OCR
          |
          v
     Extracted Text
          |
          v
     NLP / AI Parsing
          |
          v
   Structured Information
          |
          v
 Human Verification
          |
          v
      Database
```

The system may extract fields such as:

- Survey / parcel number
- Village
- District
- State
- Land area
- Project name / ID
- Notification number
- Notification date
- Award number
- Award date
- Compensation amount
- Affected family information
- Authority name

The AI should create a **draft**, not make final legal decisions.

A human officer must be able to verify and correct extracted fields before the information becomes an official record.

### Implemented Architecture & Production Decisions

1. **Dedicated AI Microservice (`AI_Document_Parser` on port 8000)**:
   - Built on **Node.js, TypeScript, Express 4, Prisma ORM, BullMQ, Redis**, and **Google Gemini AI (`@google/generative-ai`)**.
   - No heavyweight or resource-constrained local LLM is hosted; modern Google Gemini 1.5/2.5 Flash cloud intelligence is utilized with local PII redaction (masking Aadhaar, PAN, phone, and account numbers prior to LLM submission).
2. **Dual-Upload & Resilient Synchronization**:
   - Ingests scanned hard-copies and PDF dockets directly to the AI service for extraction (`POST /api/v1/documents/upload`), while simultaneously synchronizing the file with the primary Node.js backend (port 5000) to keep the project docket immutable.
3. **Non-Blocking Async Processing & Granular Polling**:
   - Upload returns `202 Accepted` (`status: PROCESSING` / `status: GEMINI_EXTRACTING`).
   - Dedicated extraction polling endpoint (`GET /api/v1/documents/:id/extraction`) returns extraction status until completed.
4. **Qualitative Confidence Scoring & Human Verification**:
   - Extracts 15+ statutory land attributes (Survey Number, ULPIN, Village, District, Area, Notification Number/Date, Award Number/Date).
   - Generates normalized confidence ratings (`high: 95%`, `medium: 80%`, `low: 55%`) and alerts officers to missing statutory fields.
   - Dual-pane verification UI enables officers to inspect physical wet-ink scans side-by-side with auto-filled soft-copy forms and execute statutory sign-off (`POST /api/v1/documents/:id/verify`).

---

# 17. Core Feature 10: Compensation Tracking

The system should track compensation at project and parcel level.

Important fields can include:

- Assessed amount
- Approved amount
- Amount paid
- Payment date
- Payment status
- Pending amount
- Related parcel / affected family
- Payment reference, where appropriate

Dashboards should show:

- Total compensation assessed
- Total compensation paid
- Total pending
- Number of affected families
- Number of displaced families

Sensitive financial and personal information must follow access controls.

---

# 18. Core Feature 11: Possession Tracking

The system should clearly show whether possession has been taken.

Possible states:

- Not started
- Ready for possession
- Pending
- Partially completed
- Completed

Possession information should be linked to the parcel and project.

Field officers may update possession status through the mobile-friendly interface with supporting evidence where required.

---

# 19. Core Feature 12: Rehabilitation and Resettlement (R&R)

R&R should be treated as a full part of the acquisition lifecycle, not as an afterthought.

The system should track:

- Affected families
- Displaced families
- R&R eligibility/status
- Support or benefits status
- Pending R&R actions
- Completion status

The dashboard should make it easy to find projects where:

> Land acquisition is complete but R&R is still incomplete.

---

# 20. Advanced Feature: Parcel Passport

Each land parcel can have a unique digital **Parcel Passport**.

The Parcel Passport provides a single view of the parcel's lifecycle.

Example:

```text
PARCEL ID: MH-PN-004821

Project: Highway XYZ
Village: ABC
Area: 2.41 acres

Notification: Issued
Award: Declared
Compensation: Paid
Possession: Completed
R&R: Pending

Last Updated: 01 Sep 2026
```

A QR code can be linked to the parcel's authorized view.

The QR code should not expose sensitive information to unauthorized users.

This feature gives the project a simple and practical way to connect physical field work with the digital record.

---

# 21. Advanced Feature: Risk Score for Acquisition Delay

The platform should not only report current status. It should help identify projects or parcels that are likely to face delays.

The system can produce a simple risk score such as:

```text
Acquisition Risk: HIGH
Score: 78 / 100

Reasons:
- Compensation pending
- Multiple objections
- Approval overdue
- R&R incomplete
```

The first version can use a transparent rule-based score.

A later version can replace or improve this with machine learning using historical project data.

The important point is that the reason for the score should be visible.

---

# 22. Advanced Feature: Delay Prediction

The system can estimate the likely delay of a project or milestone.

Example:

```text
Expected delay: 47 days
Confidence: Medium

Main factors:
- Approval pending for 18 days
- Compensation pending for 23 parcels
- 7 active disputes
```

This is intended to support early action by officials.

For the hackathon, a lightweight statistical or machine-learning approach is enough. We do not need a large AI model for this.

---

# 23. Advanced Feature: Compensation Anomaly Detection

The system can identify unusual records for further checking.

Examples:

- Same beneficiary appearing multiple times unexpectedly
- Duplicate payment references
- Compensation values far outside the normal range for similar parcels
- Sudden unusual changes in compensation totals
- Data entry mismatches

The system should mark these as **possible anomalies**, not automatically declare fraud.

A human officer should review them.

---

# 24. Advanced Feature: GIS Risk Heatmap

The map can show areas where acquisition work is facing problems.

Example layers:

- High delay areas
- High dispute areas
- Compensation pending areas
- R&R pending areas
- Verification failures

This allows officials to see where intervention is needed.

Example idea:

```text
Project Corridor

[Normal] [Normal] [High Risk] [High Risk]
[Normal] [Disputed] [Delayed]  [Normal]
[Paid]   [Paid]    [R&R]      [Pending]
```

---

# 25. Core Feature 13: Inter-Agency Audit Trail

Every important change should have an audit record.

The audit record should capture at least:

- What changed
- Previous value
- New value
- Who changed it
- Which role they had
- Date and time
- Related project / parcel / document
- Source of the change

Example:

```text
Parcel status changed

Old: Compensation Pending
New: Compensation Paid

Changed by: District Officer
Time: 01 Sep 2026, 14:22
Parcel: MH-PN-004821
```

---

# 26. Advanced Feature: Tamper-Evident Audit Ledger / Blockchain

Blockchain is **not required for the entire database**.

Instead, a permissioned ledger or tamper-evident event ledger can be used for important events such as:

- Proposal approval
- Notification issued
- Award approved
- Compensation approved
- Compensation payment recorded
- Possession recorded
- R&R completion

The idea is to make important events difficult to alter silently and easier to verify later.

A suitable description for this feature is:

> **Immutable inter-agency audit and provenance layer**

The blockchain/ledger should store proofs or event records, while the main application database stores normal operational data.

Do not claim that blockchain replaces official land records or legally proves ownership by itself.

---

# 27. Core Feature 14: National Dashboard

The platform must provide a national-level dashboard.

Important indicators include:

- Area proposed
- Area notified
- Area acquired
- Compensation assessed
- Compensation paid
- Number of affected families
- Number of displaced families
- R&R status
- Possession status
- Project progress
- Timeline adherence

Users should be able to filter by:

- State
- District
- Project
- Project type
- Acquisition status
- Date range

---

# 28. State and Project Dashboards

The same data should support different levels of monitoring.

## State Dashboard

A state authority should be able to compare:

- Projects
- Districts
- Acquisition progress
- Compensation status
- Delays
- R&R progress

## Project Dashboard

A project authority should be able to view:

- Total required land
- Land acquired
- Remaining land
- Parcel status
- Compensation progress
- Possession status
- R&R status
- Upcoming milestones
- Delayed tasks
- High-risk parcels

---

# 29. MIS Reports and Executive Reports

The platform should generate reports for different users.

Examples:

- Project-wise progress report
- State-wise progress report
- District-wise delay report
- Compensation report
- Possession report
- R&R report
- Pending approval report
- Notification report
- High-risk project report
- Audit report

Reports should support filtering and, where appropriate, download/export.

---

# 30. Mobile-Responsive Field Interface

The field interface must work well on mobile devices.

Field officers should be able to:

- Search a parcel
- Open parcel details
- Capture GPS/location
- Upload photos
- Verify parcel information
- Add remarks
- Update field status
- Submit verification

The interface should be simple because field users may work with limited screen size and poor connectivity.

---

# 31. API Integration

The system should be designed to integrate with existing government systems.

Potential integration areas include:

- Land records
- Cadastral maps
- GIS sources
- Government portals
- Identity or beneficiary verification systems, where officially permitted
- Notification systems
- Payment-related systems, where officially permitted

The exact external APIs depend on what is available and legally permitted.

For the hackathon, these integrations can be demonstrated using:

- Mock APIs
- Sample government data
- Sandbox APIs
- Simulated responses

The architecture should still be designed so real APIs can be connected later.

---

# 32. Data Model / Main Objects

The main entities in the system are:

```text
User
Role
Department / Authority
Project
Land Parcel
Proposal
Notification
Award
Compensation Record
Affected Family
Displaced Family
R&R Record
Possession Record
Document
Workflow Task
Milestone
Audit Event
Risk Assessment
Alert
```

Relationships should connect these objects.

For example:

```text
Project
  |
  +-- Land Parcels
  |      +-- Notification
  |      +-- Award
  |      +-- Compensation
  |      +-- Possession
  |      +-- R&R
  |
  +-- Documents
  +-- Milestones
  +-- Workflow Tasks
  +-- Risk Score
  +-- Audit Events
```

---

# 33. Real-Time Meaning in This Project

“Real-time” does not mean that the system needs sensors or live physical tracking for every parcel.

For this project, real-time mainly means:

> When an authorized user updates a record, the current status should become available to the relevant dashboards and users without waiting for manual consolidation.

Example:

```text
Officer marks compensation as paid
          |
          v
Application database updated
          |
          +--> Project dashboard updated
          |
          +--> State dashboard updated
          |
          +--> National dashboard updated
          |
          +--> Audit event created
```

---

# 34. Security Requirements

The system will contain sensitive government, land, family, and financial information. Security is therefore a core requirement.

The system should include:

- Secure login
- Role-based access
- Strong permission checks
- Encryption in transit
- Encryption for sensitive stored data where required
- Secure document storage
- Audit logging
- Session management
- API authentication and authorization
- Input validation
- Protection against common web attacks
- Backup and recovery

Only authorized users should access sensitive landowner, compensation, family, and legal information.

---

# 35. Data Privacy

The system should follow applicable government rules and data protection requirements.

Public dashboards should show only information that is approved for public access.

Sensitive fields should be protected by role and purpose.

The system should support data minimization: store and expose only the information that is actually needed.

---

# 36. Scalability Requirement

The final vision is nationwide usage across all States and Union Territories.

The architecture should therefore be designed so it can scale from:

```text
Hackathon Demo
      |
      v
One State / Sample Dataset
      |
      v
Multi-State Deployment
      |
      v
National Platform
```

The hackathon prototype does not need to contain real nationwide data.

It must instead show that the architecture can support nationwide expansion.

---

# 37. Suggested Technical Architecture

A practical multi-service architecture is implemented as follows:

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
└──────────────┘    └──────────────┘     └──────────────┘
        │                                        │
        ▼                                        ▼
┌──────────────────────────────┐         ┌──────────────────────────────┐
│  Meta WhatsApp Cloud API     │         │  Google Gemini 1.5/2.5 Flash │
│  (Citizen Grievance Webhook) │         │  (Document Parsing Engine)   │
└──────────────────────────────┘         └──────────────────────────────┘
```

The system strictly enforces separation of concerns across service boundaries.

---

# 38. Locked Technology Stack & Architecture Decisions

The system architecture is standardized on the following stack:

## Frontend

- **Framework**: React 19 + TypeScript + Vite (Port 5173)
- **Styling**: Strict bespoke **Sovereign Editorial / Statutory Brutalist Design System** with pure CSS variables (`index.css`), archival blush paper background (`#faf8f5`), crisp `#000000` boundaries, pill status badges, and typography (Copernicus / Outfit / IBM Plex Mono). *Tailwind CSS is explicitly omitted to ensure total typographic control and avoid generic aesthetics.*
- **State & Data Fetching**: TanStack Query + native React Hooks
- **Forms & Validation**: React Hook Form + Zod

## Primary Backend REST API

- **Runtime & Framework**: Node.js + Express 5 + TypeScript (Port 5000)
- **Database Driver**: `pg` pool with raw parameterized SQL queries and spatial PostGIS functions (`ST_Buffer`, `ST_GeomFromGeoJSON`, `ST_Intersects`, `ST_Area`)
- **Security & RBAC**: JWT authentication (7d expiry), bcryptjs password hashing, Helmet HTTP headers, CORS, server-side role enforcement (`REQUESTING_AUTHORITY`, `BOSS`, `PROCESSING_OFFICER`, `ADMIN`)
- **Response Format**: Standardized JSON envelopes `{ success: boolean, data?: any, error?: { message: string, code?: string } }`

## AI Document Intelligence Microservice

- **Service**: Standalone Node.js / TypeScript microservice (`sih-ai-document-parser` on Port 8000)
- **Framework**: Express 4 + TypeScript + Prisma ORM
- **AI Models**: Google Gemini 1.5 Flash / Gemini 2.5 Flash via `@google/generative-ai` SDK
- **OCR & Document Ingestion**: `pdf-parse`, optional `@google-cloud/vision`, and custom computer-vision preprocessing
- **Task Queues**: Redis + BullMQ for non-blocking asynchronous OCR and extraction workers
- **Security**: Local client-side PII redaction (Aadhaar, PAN, phone numbers, bank accounts) prior to LLM submission

## Database & Cache

- **Primary Database**: PostgreSQL 16 + PostGIS extension enabled (Port 5432)
- **Cache & Message Broker**: Redis 7 (Port 6379)

## GIS & Spatial Engine

- **Library**: Leaflet + React-Leaflet
- **Base Layers**: CartoDB Dark Matter and ESRI Satellite/Dark tile layers
- **Spatial Features**: GeoJSON cadastral parcel boundaries, corridor alignment waypoint drafting, dynamic Right-of-Way (RoW) buffer generation, Bhu-Aadhaar ULPIN interactive hover inspections, and spatial intersections

## Citizen Communication & In-App Alerts

- **WhatsApp Bot**: Meta WhatsApp Business Cloud API webhooks (`/api/v1/integrations/whatsapp`) for citizen queries, status checks, and objection intake logged into the statutory `grievances` table
- **In-App Notifications**: Multi-channel statutory alerts engine (`notifications` table) with unread counters and role-targeted routing

## Audit & Provenance

- **Application Audit Log**: PostgreSQL `audit_logs` capturing user, role, entity, old/new values, and timestamp
- **Future Provenance**: Hyperledger Fabric consortium blockchain anchors (planned for post-prototype Phase 29)

---

# 39. What We Should NOT Build

To keep the project realistic, the prototype should not attempt to do all of the following:

- Replace official land ownership registries
- Replace every government land system
- Build a new national payment system
- Run a large local LLM
- Train a large AI model from scratch
- Store the whole application database on blockchain
- Build a fully autonomous legal decision system
- Predict legal outcomes automatically
- Expose sensitive citizen information publicly

These are outside the realistic scope of a hackathon prototype.

---

# 40. Implemented MVP Prototype Workflow

The prototype demonstrates a complete, working statutory land acquisition journey under the RFCTLARR Act, 2013:

## Verified Prototype Flow

```text
1. Public Transparency Map & Republic of India GIS Console (National aggregation, cadastral parcel overlays)
2. Sovereign Government SSO Login (Instant role switcher across all tiers)
3. Requesting Authority Requisition:
   - Create project docket
   - Plot interactive corridor alignment waypoints on Leaflet GIS
   - Generate dynamic Right-of-Way (RoW) spatial buffer
   - Upload statutory project annexures and submit to BOSS queue
4. BOSS Scrutiny & Geospatial Radar:
   - Review incoming proponent requisition
   - Fetch candidate land parcels via PostGIS spatial intersection
   - Confirm project parcel boundaries and Bhu-Aadhaar ULPINs
5. Statutory Workflow Configuration:
   - Instantiate master workflow template (tmpl-prototype-la)
   - Add/reorder statutory stages, configure SLA turnaround days
   - Assign competent departments & processing officers (with automatic fallback)
6. BOSS Statutory Sanction ("Approve Project Forward"):
   - Activates workflow, creates initial task for Stage 1
   - Formal jurisdiction handover — BOSS permanently exits active execution
7. Processing Officer Workbench:
   - View assigned tasks with live SLA countdown timers
   - Inspect required documents and associated parcel land schedules
8. Hard-Copy Evidence Intake (Ground Verification):
   - Perform physical field verification, wet-ink stamp/seal, and photo capture
   - Upload high-resolution hard-copy scans, field photos, and digital dockets
9. AI Document Intelligence (Node.js Microservice on Port 8000):
   - Google Gemini 1.5/2.5 Flash async extraction via BullMQ queue
   - Local client-side PII redaction (Aadhaar, PAN, phone numbers, accounts)
   - 15+ statutory land fields parsed with normalized confidence ratings (95%, 80%, 55%)
10. Dual-Pane Human Officer Verification:
    - Side-by-side inspection: Physical hard-copy scan vs. Auto-filled soft copy form
    - Officer verifies, corrects field anomalies, and executes statutory sign-off
11. Acceptance, Rejection & Correction Recovery:
    - If rejected: Officer enters statutory defect notes; stage marked REJECTED
    - Requesting Authority alerted; opens Resubmission Modal, uploads fixes, and resubmits
    - Stage re-opens directly for officer without BOSS re-intervention
    - Officer accepts stage -> Next task automatically instantiated and routed
12. Citizen WhatsApp Integration (Meta Cloud API):
    - Public status queries and statutory objections submitted via WhatsApp
    - Objections automatically logged into PostgreSQL grievances table and visible in project tracking
13. In-App Notifications & Audit Trail:
    - Role-targeted notifications for stage updates, rejections, and approvals
    - Immutable audit logs capturing all user actions and timestamps
```

This journey proves an end-to-end, functional system built on real database records and real AI intelligence.

---

# 41. Recommended Advanced Demo Features

After the main workflow works, the strongest additions are:

### Priority 1

- GIS parcel map
- AI document parsing using OCR + NLP
- Role-based workflow
- Real-time dashboards
- Automated alerts
- Audit trail

### Priority 2

- Parcel Passport with QR code
- Acquisition Risk Score
- GIS risk heatmap
- Compensation anomaly detection

### Priority 3

- Permissioned blockchain / immutable audit ledger
- Advanced delay prediction
- More external API integrations
- Offline field mode

The team should only add advanced features after the core workflow is stable.

---

# 42. Example User Journey

## Step 1: Project Agency

The agency creates:

> “Highway XYZ Expansion Project”

It enters the land requirement and uploads the project proposal.

## Step 2: Land Parcels

The agency adds 250 required parcels.

The system gives each parcel a unique Parcel ID and displays them on the map.

## Step 3: Document Parsing

The agency uploads scanned notification documents.

OCR reads the document. NLP extracts parcel numbers, dates, area, and other useful fields.

The officer verifies the extracted data.

## Step 4: District Review

The district officer receives the proposal automatically.

The officer checks the documents and parcel information.

## Step 5: Approval

The proposal moves to the next authority based on workflow rules.

## Step 6: Acquisition Progress

The system updates:

- Notification count
- Award count
- Compensation paid
- Possession completed
- R&R status

## Step 7: Dashboard

Senior officials can immediately see:

> 250 parcels required
> 180 acquired
> 150 compensated
> 120 possession completed
> 35 R&R completed
> 20 high-risk parcels

## Step 8: Risk Detection

The system identifies that one village has many pending compensation cases and marks the area as high risk.

Officials can investigate before the project becomes more delayed.

---

# 43. Key Dashboard Metrics

At minimum, the dashboard should contain:

### Land

- Total land proposed
- Total land notified
- Total land acquired
- Remaining land

### Notifications

- Notifications issued
- Pending notifications

### Awards

- Awards declared
- Awards pending

### Compensation

- Total assessed
- Total paid
- Total pending

### Families

- Affected families
- Displaced families
- R&R completed
- R&R pending

### Possession

- Possession completed
- Possession pending

### Timeline

- On-time projects
- Delayed projects
- Average delay

### Risk

- High-risk projects
- High-risk parcels
- Critical pending actions

---

# 44. Key Design Principles

The system should follow these principles:

## Simple

Users should understand what to do without needing technical knowledge.

## Transparent

Users should be able to see the current status and responsible authority where permitted.

## Traceable

Important actions should be linked to the person and time of the action.

## Map-first for land information

Land is geographic, so parcel information should be easy to view on a map.

## Human-in-the-loop for AI

AI should assist officers, not replace legal or administrative decisions.

## Configurable

Different authorities may use different workflows, so workflow rules should be configurable.

## Secure by design

Sensitive information must not be exposed simply because it exists in the database.

## Scalable

The system should be capable of growing from a hackathon demo to a national platform.

---

# 45. What Makes Our Solution Different

The project should not be presented as just another government dashboard.

Its main value is the combination of:

**1. End-to-end workflow**

The platform follows the complete acquisition lifecycle.

**2. GIS parcel intelligence**

Officials can see where acquisition is happening and where problems are concentrated.

**3. AI document intelligence**

Documents can be converted into structured data with OCR + NLP, reducing manual entry.

**4. Real-time monitoring**

Changes in operational records flow into dashboards quickly.

**5. Predictive support**

The platform can highlight risk and possible delays before they become major problems.

**6. Strong accountability**

Audit records show what changed, who changed it, and when.

**7. Parcel-level lifecycle view**

The Parcel Passport connects every important event to one land parcel.

**8. Multi-level governance**

The same platform supports district, state, central, and project-level monitoring.

---

# 46. Final Product Definition

The final prototype should be described as:

> **A secure, GIS-enabled, end-to-end national land acquisition management and decision-support platform that connects project agencies, district authorities, state governments, and central authorities through a common digital workflow. It tracks land parcels, notifications, awards, compensation, possession, and R&R; supports AI-assisted document parsing; provides real-time dashboards and alerts; and adds analytics, risk detection, and a tamper-evident audit layer for stronger transparency and accountability.**

In simpler words:

> **We are building one digital system that lets the government see, manage, verify, and monitor the complete land acquisition process—from proposal to possession and R&R—in one place.**

---

# 47. One-Line Hackathon Pitch

> **“One platform to track every land parcel, every approval, every rupee of compensation, and every delay—from proposal to possession.”**

---

# 48. Prototype Status & National Scaling Boundary

The **Prototype V1** has been fully implemented, integrated, and verified across Phases 0 through 11, Phase 13 (WhatsApp Citizen Bot), and Phase 14/15 (In-App Notifications & Prototype Polish).

The completed prototype proves the end-to-end statutory journey:
```text
Can a project requisition be drafted with interactive GIS corridor alignment?     ✅ YES (Phase 3)
Can candidate land parcels be determined via PostGIS spatial intersection?        ✅ YES (Phase 4)
Can statutory workflow templates be configured with dynamic officer assignment?   ✅ YES (Phase 5)
Can BOSS execute statutory sanction and hand over jurisdiction?                   ✅ YES (Phase 6)
Can processing officers manage stage tasks with SLA countdowns?                   ✅ YES (Phase 7)
Can statutory dockets be securely managed with cryptographic checksums?          ✅ YES (Phase 8)
Can physical field evidence and hard-copy scans be ingested?                      ✅ YES (Phase 9)
Can Google Gemini AI extract land attributes with confidence ratings?             ✅ YES (Phase 10)
Can officers inspect dual-pane physical scans vs auto-filled soft copies?         ✅ YES (Phase 10)
Can requesting authorities track live progress and resubmit rejected stages?      ✅ YES (Phase 11)
Can citizens check status and file objections via Meta WhatsApp Cloud API?        ✅ YES (Phase 13)
Can role-targeted in-app notifications and immutable audit logs be generated?     ✅ YES (Phase 14 & 15)
                                        =
                   Fully Verified Working Sovereign Prototype
```

Subsequent phases (Phases 16 through 34 in the roadmap) represent the **Post-Prototype National Expansion**, including full statutory award declaration, compensation direct benefit transfer (DBT), land title mutation, parcel passport QR codes, Hyperledger Fabric consortium blockchain anchors, and national-scale API gateways.
