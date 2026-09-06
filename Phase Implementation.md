# Phase Implementation
## National Land Acquisition & Management System

### Version 2 — Prototype to Full System

---

# 1. Purpose of This Plan

This document is the implementation plan for the National Land Acquisition & Management System.

It converts the PRD and TRD into a practical development sequence.

The most important implementation principle is:

> **The prototype must be the first working part of the final system, not a temporary UI that will later be deleted.**

The first milestone will implement a smaller version of the final architecture, database, APIs, workflow engine, GIS model, document system, audit system, and integrations.

After that milestone, new modules will be added to the same foundation.

The PRD describes the overall product as a secure national platform for managing the land-acquisition lifecycle, while the TRD locks the main technology choices and requires the architecture to remain extensible.

---

# 2. Final Technology Foundation

These decisions are locked.

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| Frontend State/Data | TanStack Query |
| Forms | React Hook Form |
| Validation | Zod |
| Backend | Node.js + TypeScript + Express |
| API | REST |
| Database | PostgreSQL |
| Spatial Data | PostGIS |
| Maps | Leaflet + OpenStreetMap |
| File Storage | Object Storage |
| OCR | Google Cloud Vision |
| Structured AI Extraction | Gemini API |
| Background Jobs | Redis + BullMQ |
| Blockchain | Hyperledger Fabric (Deferred to Post-Prototype Expansion) |
| Authentication | Government Identity Integration + RBAC |
| Citizen Channel | Meta WhatsApp Business Cloud API |
| Notifications | In-app + Email + WhatsApp |

These are the locked technical decisions in the TRD.

There will be:

> **No locally hosted LLM.**

AI document processing uses Google Cloud Vision and Gemini, with human verification before AI-extracted information becomes official.

---

# 3. Product Roles

For the first prototype there are four visible actors.

## 3.1 Requesting Authority

Responsible for:

- Creating a project request
- Defining where the project requires land
- Providing the requested land area
- Uploading initial documents
- Submitting the request
- Tracking the project
- Correcting rejected information
- Re-submitting corrections
- Handling citizen complaints/objections

The Requesting Authority does **not** determine the final parcel set after submission.

---

## 3.2 BOSS / Higher-Level Officer

Responsible only for project initialization.

The BOSS:

1. Receives a project request.
2. Reviews it.
3. Fetches candidate land records.
4. Confirms the actual project parcels.
5. Selects a predefined workflow template.
6. Modifies the project-specific workflow if necessary.
7. Assigns the responsible officers/departments.
8. Activates the workflow.

After activation:

> **The BOSS leaves the workflow completely.**

The BOSS does not process ordinary stages, handle complaints, or approve subsequent officer actions.

---

## 3.3 Processing Officer

Receives only the workflow stage assigned to them.

They:

- Open the assigned task
- Read required project/parcel information
- Review required statutory documents & checklist
- Conduct physical verification / field inspection
- Upload hard-copy scan/photo & digital document evidence
- Use OCR + Gemini-assisted auto-fill for soft-copy submission
- Verify and correct extracted data side-by-side
- Accept the stage
- Reject the stage with a reason

They cannot modify the workflow.

---

## 3.4 Citizen

The citizen has no main web-app account.

Citizen interaction happens through WhatsApp.

The citizen can:

- Ask for status
- Receive project/acquisition updates
- Submit objection
- Submit grievance
- Upload a supporting document/image
- Receive acknowledgement/reference number
- Track grievance/objection status

This is consistent with the TRD's decision to remove the citizen from the main web-app role and use WhatsApp as the citizen channel.

---

# 4. Core Business Flow

This is the workflow the entire implementation should be built around.

```text
PUBLIC LANDING PAGE
        |
        v
GOVERNMENT SIGN IN
        |
        v
REQUESTING AUTHORITY
        |
        | Create project request
        | Define project area
        | Enter required land area
        | Upload initial documents
        |
        v
BOSS
        |
        | Fetch land records
        | Identify candidate parcels
        | Confirm project parcels
        | Select workflow template
        | Modify project workflow
        | Assign officers
        | Activate
        |
        v
BOSS IS DONE
        |
        v
WORKFLOW PIPELINE
        |
        +---- Officer 1
        |       |
        |       +---- OCR
        |       +---- Evidence
        |       +---- Accept / Reject
        |
        +---- Officer 2
        |
        +---- Officer 3
        |
        v
FINAL APPROVAL
        |
        +---- Notifications
        |
        v
REQUESTING AUTHORITY
        |
        +---- Track progress
        +---- Handle rejected items
        +---- Handle citizen issues
        |
        v
CITIZEN
        |
      WhatsApp
```

This is a refinement of the PRD/TRD end-to-end demonstration flow.

---

# 5. GIS Business Model

The GIS must distinguish between:

### Project geometry

What the Requesting Authority says:

> “This is where my project needs land.”

### Parcel geometry

What the land-record system says:

> “These are the actual cadastral parcels.”

Therefore:

```text
Requesting Authority
        |
        v
Project Boundary / Corridor
        |
        v
BOSS
        |
        v
Land Records
        |
        v
Candidate Parcels
        |
        v
BOSS Confirmation
        |
        v
Project Parcel Set
```

The Requesting Authority does **not** manually draw hundreds of parcel boundaries.

For the prototype, the land-record system will be simulated.

Later it can be replaced with real government land-record/cadastral APIs.

The PRD explicitly permits mock APIs and sample government data for the hackathon while requiring an architecture that can later connect to real systems.

---

# 6. Public Landing Page

Before authentication, the site is a public national information and visualization layer.

URL:

```text
/
```

## Header

```text
Government of India
National Land Acquisition & Management System

Overview
Public Information
Help

[Government Sign In]
```

## Main visualization

A large interactive India map.

Display national metrics above/below it:

```text
Projects Underway
Projects Completed
Land Proposed
Land Acquired
Compensation Paid
```

Use realistic demo/sample data.

## State interaction

When a user selects a state:

```text
Click Maharashtra
        |
        v
Map zooms to Maharashtra
        |
        v
Right-side panel slides in
        |
        v
State metrics appear
```

Panel:

```text
MAHARASHTRA

Projects              214
Projects Completed     78
Projects In Progress 136

Land Proposed        2.4 Lakh Acres
Land Acquired        1.7 Lakh Acres

Compensation Paid    ₹8,240 Cr

High-Risk Projects     17

[Explore State]
```

The information is aggregate public-safe information only.

No owner details, financial personal records, grievance details, or sensitive legal information are exposed.

This follows the PRD's controlled public-view and privacy requirements.

---

# 7. Phase 0 — Repository, Environment and Architecture

## Objective

Create the real application foundation.

### Frontend

Install:

```text
React
TypeScript
Vite
React Router
TanStack Query
React Hook Form
Zod
Leaflet
```

Create:

```text
PublicLayout
GovernmentLayout
ProtectedRoute
RoleGuard
API client
Query provider
Global error handling
```

### Backend

Create:

```text
Express
TypeScript
REST routing
Authentication middleware
RBAC middleware
Validation
Error handling
Logging
Database access
```

### Infrastructure

Create:

```text
PostgreSQL
PostGIS
Redis
Object storage configuration
Environment-variable handling
Docker Compose for local development
```

### Database migrations

Create migrations from the beginning.

### Definition of Done

The developer can:

```text
start frontend
start backend
connect PostgreSQL
connect PostGIS
connect Redis
run migrations
seed demo data
```

No application feature should bypass this architecture.

The TRD explicitly recommends a modular service-oriented application without unnecessary microservices.

---

# 8. Phase 1 — Public National Map

## Objective

Build the public-facing landing experience before authenticated application screens.

### Pages

```text
/
```

### Backend APIs

```http
GET /api/v1/public/overview
GET /api/v1/public/states
GET /api/v1/public/states/:stateId
GET /api/v1/public/states/:stateId/projects
```

### Database

Add:

```text
states
districts
projects
```

with public-safe aggregate queries.

### GIS

Use:

```text
Leaflet
OpenStreetMap
GeoJSON
```

### User experience

```text
India
   ↓
Click State
   ↓
Map centers/zooms
   ↓
Right panel appears
   ↓
State statistics update
```

### Definition of Done

An unauthenticated person can understand the national status of the land-acquisition system through the map.

---

# 9. Phase 2 — Government Authentication and RBAC

## Objective

Build real application login structure.

### Page

```text
/login
```

### Prototype

Use simulated Government Identity Provider.

Later replace it with actual provider.

### APIs

```http
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
POST /api/v1/auth/refresh
```

### Database

```text
users
roles
permissions
role_permissions
authorities
departments
```

### Seed users

```text
Requesting Authority
BOSS
Processing Officer
Admin
```

### Routing

```text
REQUESTING_AUTHORITY
→ /dashboard

BOSS
→ /boss/dashboard

PROCESSING_OFFICER
→ /officer/dashboard
```

### Important rule

After authentication:

> **The public landing page is completely removed from that user's application experience.**

The authenticated user sees only the government application.

### Definition of Done

User logs in and is routed to the correct dashboard with server-side permission enforcement.

The TRD requires authentication plus application-level RBAC and server-side access checks.

---

# 10. Phase 3 — Requesting Authority Project Request

## Objective

Allow the Requesting Authority to submit a real project request.

### Pages

```text
/dashboard
/projects
/projects/new
/projects/:projectId
```

## Create Project form

### Project information

```text
Project Name
Project Type
Department / Authority
State
District
Required Land Area
Target Completion Date
Description
```

### Project area

Interactive map.

The Requesting Authority can:

```text
Draw Project Boundary
```

or for linear infrastructure:

```text
Draw Project Corridor
+
Specify Corridor Width
```

This produces the `project.geometry` record.

### Documents

Upload:

```text
Project Proposal
Supporting Documents
Reference Documents
```

### Actions

```text
Save Draft
Submit Project Request
```

### APIs

```http
POST /api/v1/projects
GET /api/v1/projects
GET /api/v1/projects/:id
PATCH /api/v1/projects/:id
POST /api/v1/projects/:id/geometry
POST /api/v1/projects/:id/documents
POST /api/v1/projects/:id/submit
```

### Definition of Done

The Requesting Authority can create a project containing:

```text
project details
+
project geometry
+
requested land area
+
documents
```

and submit it to the BOSS queue.

---

# 11. Phase 4 — BOSS Request Review and Land Parcel Determination

## Objective

Turn the project request into an actual project with a confirmed parcel set.

### Pages

```text
/boss/dashboard
/boss/projects/:projectId
/boss/projects/:projectId/parcels
```

### BOSS dashboard

Show:

```text
New Requests
Pending Configuration
Projects Configured Today
```

### Project review

Show:

```text
Request details
Requesting authority
Project geometry
Required area
Initial documents
```

---

## 11.1 Mock Land Records Integration

Create:

```text
MockLandRecordsProvider
```

It returns:

```text
Parcel ID
ULPIN
Survey Number
Owner Reference
Village
District
State
Area
Geometry
Land Type
```

### API

```http
POST /api/v1/boss/projects/:projectId/land-records/fetch
GET  /api/v1/boss/projects/:projectId/land-records
```

The provider performs the conceptual operation:

```text
Project Geometry
        ∩
Parcel Geometry
        ↓
Candidate Parcels
```

PostGIS handles the spatial operation.

No AI is required.

---

## 11.2 Parcel Confirmation

BOSS sees:

```text
Candidate Parcels: 287
Selected Parcels: 250
Requested Area: 500 acres
Selected Area: 497 acres
```

BOSS can inspect:

```text
Map
Parcel table
Survey number
Village
Area
Land type
External identifiers
```

Then:

```text
[Confirm Project Parcels]
```

### API

```http
POST /api/v1/boss/projects/:projectId/parcels/confirm
```

### Database

Use:

```text
land_parcels
project_parcels
land_record_imports
```

### Definition of Done

The project has a persistent `project_parcels` set.

The GIS map shows actual selected parcels.

The BOSS has finished parcel determination.

---

# 12. Phase 5 — Workflow Template and Project Workflow

## Objective

Let the BOSS turn the confirmed project into an executable workflow.

### Master template

Seed:

```text
Land Acquisition — Prototype
```

Example stages:

```text
1. Parcel Verification
2. Document Verification
3. Departmental Scrutiny
4. Final Approval
```

### Pages

```text
/boss/projects/:projectId/workflow
```

### BOSS actions

```text
Select Template
Modify Stage
Add Stage
Remove Stage
Reorder Stage
Assign Department
Assign Officer
Set SLA
```

The master template is not edited.

The BOSS edits the project's workflow instance.

Architecture:

```text
Master Template
       |
       | instantiate
       v
Project Workflow Instance
```

### APIs

```http
GET  /api/v1/workflow-templates
GET  /api/v1/workflow-templates/:id
POST /api/v1/projects/:id/workflow/initialize
GET  /api/v1/projects/:id/workflow
PUT  /api/v1/projects/:id/workflow/stages/:stageId
POST /api/v1/projects/:id/workflow/stages
DELETE /api/v1/projects/:id/workflow/stages/:stageId
POST /api/v1/projects/:id/workflow/activate
```

### Definition of Done

The BOSS creates a project-specific workflow from a template and activates it.

---

# 13. Phase 6 — BOSS Exit and Workflow Task Engine

## Objective

Make the workflow actually move between officers.

When the BOSS clicks:

```text
Activate Workflow
```

the backend:

1. Creates workflow stages.
2. Creates first task.
3. Assign![alt text](image.png)s it to responsible officer.
4. Sets the project's current stage.
5. Creates audit event.
6. Sends notification.
7. Removes project from BOSS active work queue.

Important:

> **BOSS involvement ends here.**

### APIs

```http
GET /api/v1/tasks?assignedTo=me
GET /api/v1/tasks/:id
POST /api/v1/tasks/:id/start
POST /api/v1/tasks/:id/accept
POST /api/v1/tasks/:id/reject
```

### Acceptance

```text
Officer accepts
     ↓
Current stage completed
     ↓
System calculates next stage
     ↓
Next task created
     ↓
Next officer notified
```

### Rejection

```text
Officer rejects
     ↓
Reason required
     ↓
Stage = REJECTED
     ↓
Requesting Authority notified
     ↓
Authority corrects
     ↓
Same stage becomes actionable again
```

There is no BOSS intervention.

### Definition of Done

A project can move from:

```text
Stage 1
→ Stage 2
→ Stage 3
```

without manual database changes.

---

# 14. Phase 7 — Officer Dashboard and Task Execution

## Objective

Build the officer's focused work environment.

### Pages

```text
/officer/dashboard
/officer/tasks/:taskId
```

### Officer Dashboard

Show:

```text
Assigned Tasks
Due Today
Overdue
Completed
```

Main table:

```text
Task
Project
Stage
Due Date
Status
Action
```

The officer should not see the workflow builder.

---

## Task Detail

Show:

```text
Project
Current Stage
Required Documents
Relevant Parcel Information
Previous-stage information allowed for this task
```

Actions:

```text
Start
Upload Evidence
Accept
Reject
```

### Definition of Done

An officer can complete their assigned stage without seeing or manipulating the rest of the workflow.

The TRD requires manual stage completion and automatic overall completion calculation.

---

# 15. Phase 8 — Document Management

## Objective

Build the actual document system before adding AI.

### Pages

```text
/documents
/documents/:documentId
```

### Storage

Actual files:

```text
Object Storage
```

Metadata:

```text
PostgreSQL
```

### APIs

```http
POST /api/v1/documents/upload
GET  /api/v1/documents/:id
GET  /api/v1/documents/:id/versions
POST /api/v1/documents/:id/versions
GET  /api/v1/documents/:id/download
```

### Database

```text
documents
document_versions
stage_evidence
```

### Required metadata

```text
Document type
Project
Parcel
Workflow stage
Uploader
Version
Hash
Processing status
Verification status
Timestamp
```

The TRD explicitly defines object storage plus PostgreSQL metadata, versioning, hashes and processing/verification status.

### Definition of Done

The application can upload, retrieve, version and audit documents without AI.

---

# 16. Phase 9 — Hard-Copy Evidence Intake & Physical Verification

## Objective

Demonstrate realistic human physical verification and ground truth in Indian land administration. The processing officer receives or prints the statutory form, carries it to the field / revenue office, performs physical verification (wet-ink signature, official seal, site inspection), and captures/uploads the hard-copy scan or photo into the system.

### Operational Sequence

```text
Officer receives draft form / revenue record (Tehsil RoR, Deed, Survey Sheet)
                 |
                 v
Prints form / takes physical document to field for scrutiny
                 |
                 v
Performs physical inspection, stamps, & signs with wet-ink endorsement
                 |
                 v
Clicks high-resolution photo / scans physical hard-copy document
                 |
                 v
Uploads to Stage Evidence:
  - HARD_COPY_SCAN (scanned physical document with wet-ink signature & seal)
  - PHOTO (field parcel photos, geo-tagged markers, ground evidence)
  - DIGITAL_DOCUMENT (original digital PDF draft, if available)
                 |
                 v
Evidence cryptographically hashed (SHA-256) & stored in Object Storage + PostgreSQL
                 |
                 v
Physical Evidence Locked & Ingested into AI Pipeline (Phase 10)
```

### UI & Evidence Ingestion

The officer scrutiny workbench provides a dedicated evidence ingestion card:

```text
Evidence Type:
  [●] Hard-Copy Scan (Physical Paper)
  [○] Field Photograph (Ground Reality)
  [○] Digital Source Document (PDF)

[ Drag & drop scanned copy / Click to use device camera ]
Supported: PDF, TIFF, JPG, PNG (Up to 25MB)
```

Features:
- Live scan preview with multi-page support and zoom controls.
- Automatic SHA-256 checksum calculation for evidentiary chain-of-custody.
- Upload tagging with statutory stage, project, and parcel ULPIN.

### APIs

```http
POST /api/v1/documents/upload
POST /api/v1/tasks/:taskId/evidence
GET  /api/v1/tasks/:taskId/evidence
```

### Database

Use:

```text
stage_evidence
```

with evidence types:

```text
DIGITAL_DOCUMENT
HARD_COPY_SCAN
PHOTO
```

### Definition of Done

The stage securely stores both digital documents and physical hard-copy scans/photos with immutable metadata and cryptographic hashes, establishing the verified physical foundation required for AI extraction and auto-filling.

---

# 17. Phase 10 — OCR + Gemini Document Intelligence & Auto-Fill Verification

## Objective

Ingest the hard-copy scan / photo (or uploaded digital document) into an intelligent automated extraction pipeline. The system runs Vision OCR and Gemini Document Intelligence to extract key statutory land attributes and automatically pre-fill the digital soft-copy submission, allowing the officer to review side-by-side against the physical scan, correct anomalies, and officially verify the record.

### Processing Flow

```text
Hard-Copy Scan / Photo uploaded by Officer (from Phase 9)
                 |
                 v
Document saved in Object Storage
                 |
                 v
BullMQ Job triggered automatically
                 |
                 v
Google Cloud Vision OCR (bilingual extraction: Hindi & English)
                 |
                 v
Extracted Raw Text + Bounding Box Layout
                 |
                 v
Gemini Document Intelligence
                 |
                 v
Structured JSON (with schema validation & field confidence scores)
                 |
                 v
Backend Validation (Zod schema checking)
                 |
                 v
Dual-Pane Officer Verification UI:
  [Hard-Copy Scan Preview] <---> [Auto-Filled Soft-Copy Form]
                 |
                 v
Officer Reviews & Corrects AI Suggestions
                 |
                 v
Officer Verification Sign-Off (`POST /api/v1/documents/:id/verify`)
                 |
                 v
Official Verified Record (Ready for Stage Acceptance)
```

The TRD specifies this architecture and explicitly says no local LLM is required (Google Cloud Vision OCR + Gemini API via BullMQ backend worker).

### Backend APIs

```http
GET  /api/v1/documents/:id/processing
GET  /api/v1/documents/:id/extraction
POST /api/v1/documents/:id/verify
```

Processing automatically starts immediately after hard-copy scan upload.

### Example Extracted & Auto-Filled Fields

```text
Survey Number
ULPIN
Village
District
Area / Extent
Notification Number
Notification Date
Award Number
Award Date
Authority / Signatory Officer
```

### Dual-Pane Verification UI

```text
+------------------------------------+------------------------------------+
| PHYSICAL HARD-COPY SCAN (EVIDENCE) | AUTO-FILLED SOFT-COPY SUBMISSION   |
| [ Zoomable High-Res Document View ]|                                    |
| - Shows wet-ink signatures         | Survey Number: [ 104/2           ] |
| - Official seals & revenue stamps  | ULPIN:         [ 27-01-002-1042  ] |
| - Physical endorsements            | Village:       [ Rampur          ] |
|                                    | District:      [ Nagpur          ] |
|                                    | Area:          [ 1.45 Ha         ] |
|                                    | Notification:  [ LA/2026/041     ] |
|                                    | [ Confidence: 98% High ]           |
|                                    |                                    |
|                                    | [✓ Verify & Sign-Off Record]       |
+------------------------------------+------------------------------------+
```

### Database

Use:

```text
stage_evidence
```

with:

```text
OCR_OUTPUT
AI_STRUCTURED_DATA
OFFICER_VERIFICATION_LOG
```

### Definition of Done

The uploaded physical hard-copy scan generates structured fields that auto-fill the digital soft-copy form; the officer reviews side-by-side with the physical scan, corrects any discrepancies, and explicitly verifies the soft-copy record before advancing the stage.

---

# 18. Phase 11 — Requesting Authority Tracking and Rejection Handling

## Objective

Make the Requesting Authority's dashboard the permanent tracking point.

### Dashboard

```text
My Projects

Project
Current Stage
Workflow Progress
Parcel Progress
Status
Pending Action
Last Updated
```

### Project page

Show:

```text
Current Status
Workflow Timeline
Current Stage
Workflow Progress
Parcel Progress
Documents
Recent Activity
Citizen Issues
```

### Rejected action

Example:

```text
ACTION REQUIRED

Document Verification

Reason:
Hard-copy signature missing.

[Correct and Resubmit]
```

### API

```http
GET  /api/v1/projects/:id/actions
POST /api/v1/projects/:id/workflow-stages/:stageId/resubmit
```

### Definition of Done

The requesting authority can follow the project from submission until approval and fix rejected stages without involving the BOSS.

---

# 19. Phase 12 — Final Approval

## Objective

Complete the first real end-to-end project journey.

Final officer:

```text
Review
→ Accept
```

Backend performs:

```text
Stage complete
Project status = APPROVED
Notification
Dashboard update
```

### Definition of Done

A project can travel:

```text
Request
→ BOSS Configuration
→ Parcel Confirmation
→ Workflow
→ Officer Execution
→ OCR
→ Evidence
→ Acceptance/Rejection
→ Correction
→ Final Approval
```

without database manipulation.

---

# 20. Phase 13 — WhatsApp Citizen Integration

## Objective

Connect a citizen to a real project through Meta WhatsApp Business Cloud API.

### Backend webhook

```http
POST /api/v1/integrations/whatsapp/webhook
```

### Internal service

```text
WhatsAppService
```

### First supported interaction

Citizen:

```text
STATUS MH-PN-004821
```

Backend:

```text
Find Parcel
→ Find Project
→ Determine allowed public information
→ Generate response
```

Example response:

```text
Parcel: MH-PN-004821

Project:
Highway Expansion Phase 2

Current Status:
Document Verificati
on

Project Progress:
50%

For assistance, reference:
PRJ-2026-0012
```

---

# 21. Phase 14 — WhatsApp Objection / Grievance

## Objective

Demonstrate two-way citizen communication.

Citizen:

```text
I want to submit an objection.
```

System asks for:

```text
Project / Parcel Reference
```

Then:

```text
Describe your objection
```

Then:

```text
Upload supporting document
```

Backend creates:

```text
grievance
```

and returns:

```text
Your grievance has been registered.

Reference:
GRV-1029
```

The Requesting Authority sees the grievance on:

```text
/grievances
```

### APIs

```http
GET  /api/v1/grievances
GET  /api/v1/grievances/:id
POST /api/v1/grievances/:id/respond
POST /api/v1/grievances/:id/close
```

This follows the TRD's WhatsApp citizen interaction requirements.

---

# 22. Phase 15 — Notifications

## Objective

Make workflow movement visible.

Build a notification abstraction:

```text
Notification Service
       |
       +--- In-App
       +--- Email
       +--- WhatsApp
```

Prototype triggers:

```text
Project Submitted
Workflow Activated
Task Assigned
Stage Accepted
Stage Rejected
Correction Required
Project Approved
Grievance Received
```

### APIs

```http
GET /api/v1/notifications
POST /api/v1/notifications/:id/read
```

Do not implement SMS because it is not currently required by the TRD.

---

# 23. Phase 16 — Prototype Polish and Demonstration Readiness

## Objective

Turn the working vertical slice into a convincing demo.

### Polish:

```text
Loading states
Error states
Empty states
Retry states
Responsive design
Form validation
Permission errors
Document previews
Workflow timeline
GIS performance
Notification indicators
```

### Demo data

Seed:

```text
1 requesting authority
1 BOSS
1 processing officer
1 approval officer

3–5 projects
10–20 parcels/project
1–2 document sets
Sample grievances
```

One project should be specifically prepared as the main demo.

---

# 24. Prototype Completion Gate

At this point Prototype V1 is officially complete.

The test must be:

```text
No manual database edits
No fake UI state
No static workflow transitions
No fake OCR output
No fake WhatsApp backend
```

The complete test:

```text
Public Landing Page
        ↓
Government Sign In
        ↓
Requesting Authority
        ↓
Create Project
        ↓
Draw Project Area
        ↓
Upload Proposal
        ↓
Submit
        ↓
BOSS
        ↓
Fetch Land Records
        ↓
Candidate Parcels
        ↓
Confirm Parcels
        ↓
Select Workflow
        ↓
Modify Workflow
        ↓
Activate
        ↓
BOSS exits
        ↓
Officer Task
        ↓
Print / Physical Intake
        ↓
Hard-Copy Scan & Evidence Upload
        ↓
OCR (Google Cloud Vision)
        ↓
Gemini Document Intelligence
        ↓
Auto-Fill Soft Copy & Dual-Pane Verification
        ↓
Accept
        ↓
Next Officer
        ↓
Reject
        ↓
Requesting Authority sees rejection
        ↓
Correct
        ↓
Resubmit
        ↓
Final Approval
        ↓
Requesting Authority Dashboard
        ↓
Citizen WhatsApp Status
        ↓
Citizen WhatsApp Objection
        ↓
Grievance on Government Dashboard
```

This is the first major demonstration milestone.

---

# 25. Part II — Expansion After Prototype

The prototype is now treated as the permanent foundation.

Do not restart development.

---

# 26. Phase 17 — Full Acquisition Lifecycle

Expand the workflow with:

```text
Notification
        ↓
Award
        ↓
Compensation Assessment
        ↓
Compensation Approval
        ↓
Payment
        ↓
Possession
        ↓
R&R
        ↓
Acquisition Completed
```

The PRD defines the complete lifecycle from project proposal through acquisition, possession, compensation and R&R.

---

# 27. Phase 18 — Compensation

Create full compensation tracking.

Database:

```text
compensation_records
```

Track:

```text
Assessed Amount
Approved Amount
Paid Amount
Outstanding Amount
Payment Reference
Payment Status
Payment Date
Related Parcel
Related Person
```

The system tracks compensation but does not become the payment engine itself.

---

# 28. Phase 19 — Possession

Create:

```text
possession_records
```

Statuses:

```text
NOT_STARTED
READY
PENDING
PARTIALLY_COMPLETED
COMPLETED
```

Connect possession records to parcels and supporting evidence.

---

# 29. Phase 20 — R&R

Create:

```text
affected_families
displaced_families
rr_records
rr_milestones
```

Track:

```text
Eligibility
Benefits
Responsible Authority
Due Date
Completion Date
Status
Supporting Documents
```

The PRD explicitly treats R&R as a full acquisition lifecycle component rather than an afterthought.

---

# 30. Phase 21 — Parcel Passport

Expand:

```text
/parcels/:parcelId
```

into the permanent Parcel Passport.

Show:

```text
Identity
Location
Project
Survey/ULPIN
Notification
Award
Compensation
Possession
R&R
Documents
Workflow History
Risk
Audit
Provenance
```

Later add:

```text
QR Code
```

with only authorized/public-safe information.

---

# 31. Phase 22 — National / State / District Dashboards

Build the hierarchical monitoring system.

## National

```text
Projects
Land
Acquisition
Compensation
Families
Possession
R&R
Timeline
Risk
```

## State

```text
State projects
District comparison
Acquisition progress
Compensation
Delays
R&R
```

## District

```text
Projects
Pending work
Officer actions
Parcels
Compensation
Grievances
Risk
```

These correspond to the PRD's multi-level dashboard requirements.

---

# 32. Phase 23 — Advanced GIS

Move from project monitoring to richer national GIS.

Layers:

```text
Project Boundary
Parcels
Proposed
Notified
Acquired
Pending
Disputed
Compensation Paid
Compensation Pending
R&R Pending
Critical Delay
Risk Heatmap
```

The PRD specifically defines these GIS monitoring layers.

---

# 33. Phase 24 — Real Government Land-Record Integration

Replace:

```text
MockLandRecordsProvider
```

with:

```text
GovernmentLandRecordsProvider
```

without changing the application-level project/parcels workflow.

Possible future flow:

```text
Project Geometry
      ↓
Government Cadastral Data
      ↓
Spatial Intersection
      ↓
Candidate Parcels
      ↓
Rule-Based Matching
      ↓
BOSS Confirmation
```

AI does not become the legal authority deciding ownership.

---

# 34. Phase 25 — Government Integration Gateway

Add connectors for:

```text
Land Records
ULPIN
Cadastral Systems
PM Gati Shakti
Identity
Payment Systems
Government Notification Systems
```

Keep all integrations behind an adapter/gateway layer.

The core application should not directly depend on a particular government system.

The TRD explicitly requires this isolation and controlled write-back model.

---

# 35. Phase 26 — Advanced Risk Engine

Start with rules.

Later add:

```text
Overdue stages
Missing documents
Approval delays
Compensation delays
Possession delays
R&R delays
Objections
Grievances
Verification failures
```

Return:

```text
Score
Risk Level
Reasons
```

The risk model must remain explainable.

---

# 36. Phase 27 — Anomaly Detection

Add detection for:

```text
Duplicate beneficiary
Duplicate payment reference
Unusual compensation value
Sudden compensation changes
Record mismatches
```

Output:

```text
Possible Anomaly
Reason
Severity
Related Records
```

Never automatically label something as fraud.

---

# 37. Phase 28 — Delay Prediction

Only after enough historical data exists.

Architecture:

```text
Historical Project Data
       ↓
Feature Preparation
       ↓
Statistical / ML Model
       ↓
Expected Delay
       ↓
Confidence
       ↓
Contributing Factors
```

No local LLM and no autonomous decision-making.

---

# 38. Phase 29 — Hyperledger Fabric Blockchain & Audit Provenance

Full National Architecture:

```text
Central Ministry Organization
       |
State Revenue Organization
       |
District Organization
```

Note: Skipped for the Prototype V1 demonstration; deployed during full enterprise national expansion to anchor irreversible milestones into a verifiable distributed ledger alongside PostgreSQL operational audit.

Important events/documents continue to be anchored.

PostgreSQL remains the operational database.

This matches the TRD's intended multi-organization provenance structure.

---

# 39. Phase 30 — Production Security

Expand prototype controls into:

```text
Government Identity Federation
Fine-Grained RBAC
Data Encryption
Secure Document Access
Malware Scanning
Secret Management
Rate Limiting
API Security
Audit Monitoring
Backup
Disaster Recovery
```

Sensitive information must not be exposed simply because the database contains it.

The TRD requires server-side authorization, protected storage, input validation, secure document access and least-privilege controls.

---

# 40. Phase 31 — Mobile / Field Experience

Once the workflow is stable:

```text
Responsive field interface
GPS capture
Photos
Parcel lookup
Field remarks
Possession evidence
R&R updates
```

The existing officer workflow APIs should be reused.

Do not create an entirely separate backend for the mobile interface.

---

# 41. Phase 32 — Reports

Add:

```text
Project Report
State Report
District Delay Report
Compensation Report
Possession Report
R&R Report
Pending Approval Report
Risk Report
Audit Report
```

Support:

```text
Filters
CSV
PDF
Excel where appropriate
```

The PRD requires filtered and downloadable reports where appropriate.

---

# 42. Phase 33 — Production WhatsApp Expansion

Expand the WhatsApp channel to:

```text
Compensation Status
Acquisition Updates
Notification Updates
Objections
Grievances
Document Requests
Acknowledgements
Case Tracking
```

Continue using the same WhatsApp service created in the prototype.

---

# 43. Phase 34 — National Scalability

Expand deployment from:

```text
Prototype
   ↓
One State / Sample Dataset
   ↓
Multi-State
   ↓
National
```

Do not change the conceptual database or API architecture just because the dataset becomes larger.

The PRD explicitly defines this scaling path.

---

# 44. Final System Module Tree

At maturity:

```text
AUTH
 ├── Authentication
 ├── RBAC
 └── User Administration

PROJECTS
 ├── Project Requests
 ├── Projects
 └── Project Tracking

PARCELS
 ├── Parcel Records
 ├── GIS
 └── Parcel Passport

WORKFLOW
 ├── Templates
 ├── Project Instances
 ├── Stages
 ├── Tasks
 └── SLA/Rules

DOCUMENTS
 ├── Upload
 ├── Versions
 ├── OCR
 ├── Gemini Extraction
 └── Verification

ACQUISITION
 ├── Notifications
 ├── Awards
 ├── Compensation
 ├── Possession
 └── R&R

CITIZENS
 ├── WhatsApp
 ├── Objections
 └── Grievances

ANALYTICS
 ├── Dashboards
 ├── Risk
 ├── Anomaly Detection
 ├── Delay Prediction
 └── Reports

INTEGRATIONS
 ├── Land Records
 ├── ULPIN
 ├── Cadastral
 ├── PM Gati Shakti
 ├── Identity
 └── Payment

TRUST
 ├── PostgreSQL Audit
 └── Hyperledger Fabric Provenance
```

---

# 45. Final Database Architecture

The database should grow from the prototype toward:

```text
users
roles
permissions
role_permissions

authorities
departments
states
districts

projects
project_members
proposals

land_parcels
project_parcels
land_record_imports
external_integration_references

workflow_templates
workflow_template_stages
workflow_instances
workflow_instance_stages
workflow_tasks

documents
document_versions
document_processing_jobs
ai_extractions
stage_evidence

compensation_records
possession_records

affected_families
displaced_families
rr_records
rr_milestones

grievances
grievance_documents

notifications

risk_assessments

audit_events
provenance_records
```

This directly extends the data domains already defined by the TRD rather than replacing them.

---

# 46. Final Frontend Route Architecture

```text
PUBLIC
/
 /login

REQUESTING AUTHORITY
/dashboard
/projects
/projects/new
/projects/:id
/projects/:id/documents
/projects/:id/actions
/grievances

BOSS
/boss/dashboard
/boss/projects/:id
/boss/projects/:id/parcels
/boss/projects/:id/workflow

OFFICER
/officer/dashboard
/officer/tasks/:id

COMMON AUTHORIZED
/gis
/parcels/:id
/documents
/documents/:id
/notifications

LATER
/national-dashboard
/state-dashboard
/district-dashboard
/reports
```

Routes must be protected server-side and frontend route guards must only improve user experience, not provide the actual security boundary.

---

# 47. Final REST API Architecture

```text
/api/v1/auth
/api/v1/users
/api/v1/authorities

/api/v1/projects
/api/v1/parcels
/api/v1/proposals

/api/v1/workflow-templates
/api/v1/workflows
/api/v1/tasks

/api/v1/documents
/api/v1/document-processing

/api/v1/gis

/api/v1/compensation
/api/v1/possession
/api/v1/rr

/api/v1/grievances
/api/v1/notifications

/api/v1/risks
/api/v1/reports

/api/v1/audit
/api/v1/provenance

/api/v1/integrations
/api/v1/integrations/land-records
/api/v1/integrations/whatsapp

/api/v1/public
```

This follows the TRD's REST resource structure.

---

# 48. Final Architecture Rule

The entire system should maintain this separation:

```text
FRONTEND
    |
    | REST
    v
BACKEND
    |
    +--> Business Logic
    +--> RBAC
    +--> Workflow
    +--> Integrations
    +--> Audit
    |
    v
POSTGRESQL + POSTGIS
    |
    +--> Operational Data
    +--> Spatial Data
    +--> Audit
    |
    +--> Object Storage
    |
    +--> Redis/BullMQ
    |       |
    |       +--> OCR
    |       +--> Gemini
    |       +--> Notifications
    |       +--> Fabric
    |
    +--> Integration Gateway
    |       |
    |       +--> Government APIs
    |       +--> WhatsApp
    |
    +--> Hyperledger Fabric
            |
            +--> Important Provenance
```

No frontend component should directly access PostgreSQL.

No frontend component should directly call Gemini, Google Vision, Fabric, or government APIs.

The backend remains the control point.

The TRD explicitly places authentication, RBAC, workflow, project/parcel management, AI orchestration, integrations, notifications, audit and blockchain interaction in the backend.

---

# 49. What Gets Built First

The actual immediate development target is therefore:

```text
PHASE 0
Foundation
        ↓
PHASE 1
Public India Map
        ↓
PHASE 2
Government Login + RBAC
        ↓
PHASE 3
Requesting Authority Project Creation
        ↓
PHASE 4
BOSS + Land Record Candidates + GIS
        ↓
PHASE 5
BOSS Workflow Builder
        ↓
PHASE 6
Workflow Task Engine
        ↓
PHASE 7
Officer Dashboard + Execution
        ↓
PHASE 8
Documents
        ↓
PHASE 9
Hard-Copy Evidence & Physical Intake
        ↓
PHASE 10
OCR + Gemini Document Intelligence & Auto-Fill
        ↓
PHASE 11
Requesting Authority Tracking/Rejection
        ↓
PHASE 12
Final Approval
        ↓
PHASE 13
WhatsApp Status
        ↓
PHASE 14
WhatsApp Grievance
        ↓
PHASE 15
Notifications
        ↓
PHASE 16
Prototype Polish
```

**Only after Phase 16 do we start the broader national-system expansion.**

That ordering is intentional: the PRD says the prototype should prove a complete believable workflow, and the TRD says the system should be expanded after the core workflow is stable rather than replacing it.