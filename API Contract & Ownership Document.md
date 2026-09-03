# API Contract & Ownership Document
## National Land Acquisition & Management System

### Version 1

---

# 1. Purpose

This document defines the REST API structure for the National Land Acquisition & Management System.

For every API it defines:

- Endpoint
- HTTP method
- Purpose
- Backend module
- Frontend page or feature using it
- Allowed role
- Whether it is required for Prototype V1 or Post-Prototype
- Important input/output expectations

The API design follows the TRD's REST architecture and resource groups.

---

# 2. API Base URL

All application APIs use:

```text
/api/v1
```

Example:

```text
GET /api/v1/projects
```

Public APIs use:

```text
/api/v1/public
```

External integration APIs are grouped under:

```text
/api/v1/integrations
```

---

# 3. Core API Rules

## 3.1 Frontend never accesses the database directly

```text
React
  |
REST API
  |
Express
  |
Services
  |
PostgreSQL
```

This follows the TRD requirement that the frontend uses REST APIs instead of directly accessing the database.

---

## 3.2 Backend owns business rules

Rules such as:

```text
Officer can only complete assigned task
Officer cannot edit workflow
BOSS can configure workflow
BOSS cannot execute later stages
Rejection returns to requesting authority
Accepting a stage creates the next task
Project approval is calculated by workflow
```

must live in backend services.

They must not be implemented only in React.

---

## 3.3 RBAC is enforced server-side

Every protected endpoint checks:

```text
User
+
Role
+
Administrative Scope
+
Project Assignment
+
Action Permission
+
Data Sensitivity
```

The TRD explicitly requires access checks at these levels.

---

# 4. Role Codes

Use these application role codes.

```text
REQUESTING_AUTHORITY
BOSS
PROCESSING_OFFICER
ADMIN
```

The citizen is not a web application role.

Citizen requests enter through WhatsApp.

---

# 5. API Ownership Map

```text
PUBLIC
  └── Public Overview / National Map

AUTH
  └── Login / Session / Current User

USERS
  └── Users / Roles / Permissions

AUTHORITIES
  └── Authorities / Departments

PROJECTS
  └── Project Requests / Project Tracking

PARCELS
  └── Parcel Records / Project Parcels

LAND RECORDS
  └── Government Land-Record Integration

WORKFLOW TEMPLATES
  └── Master Templates

WORKFLOWS
  └── Project Workflow Instances

TASKS
  └── Officer Work Items

DOCUMENTS
  └── Files / Versions / Evidence

DOCUMENT PROCESSING
  └── OCR / Gemini Processing

GIS
  └── Project and Parcel Geometry

COMPENSATION
  └── Compensation Tracking

POSSESSION
  └── Possession Tracking

R&R
  └── Rehabilitation & Resettlement

GRIEVANCES
  └── Citizen Complaints / Objections

NOTIFICATIONS
  └── In-App / Email / WhatsApp Notifications

RISKS
  └── Risk Calculation

REPORTS
  └── MIS / Executive Reports

AUDIT
  └── Operational Audit

PROVENANCE
  └── Hyperledger Fabric Provenance

INTEGRATIONS
  ├── Land Records
  └── WhatsApp
```

---

# 6. PUBLIC APIs

These APIs require no government login.

---

## 6.1 National Overview

### GET `/api/v1/public/overview`

### Purpose

Returns national aggregate information for the public landing page.

### Used by

```text
Page:
/

Component:
National KPI cards
```

### Returns

```text
totalProjects
projectsInProgress
projectsCompleted
landProposed
landAcquired
compensationPaid
```

### Role

```text
PUBLIC
```

### Status

```text
Prototype V1
```

---

## 6.2 States

### GET `/api/v1/public/states`

Returns all states available on the public map.

### Used by

```text
Public India Map
```

Returns:

```text
stateId
stateName
geometry
projectCount
```

---

## 6.3 State Overview

### GET `/api/v1/public/states/:stateId`

Returns aggregate data for one state.

### Used by

```text
Public map
State side panel
```

Returns:

```text
state
projectCount
completedProjects
activeProjects
landProposed
landAcquired
compensationPaid
highRiskProjects
```

---

## 6.4 State Projects

### GET `/api/v1/public/states/:stateId/projects`

Returns public-safe project-level information.

### Used by

```text
Public state exploration
```

Sensitive owner, citizen, compensation-person, and legal information must not be returned.

### Status

```text
Prototype V1
```

---

# 7. AUTHENTICATION APIs

Backend module:

```text
auth
```

---

## 7.1 Login

### POST `/api/v1/auth/login`

Prototype:

```text
Simulated Government Identity
```

Later:

```text
Government Identity Provider
```

### Input

```json
{
  "governmentId": "..."
}
```

or provider-specific authentication data.

### Output

```text
user
role
authority
department
permissions
session/token
```

### Used by

```text
/login
```

---

## 7.2 Current User

### GET `/api/v1/auth/me`

Returns authenticated user information.

### Used by

```text
GovernmentLayout
RoleGuard
Header
User profile
```

---

## 7.3 Logout

### POST `/api/v1/auth/logout`

Invalidates the current session/token where applicable.

---

## 7.4 Refresh

### POST `/api/v1/auth/refresh`

Refreshes authentication credentials where token-based authentication is used.

---

# 8. USER APIs

Backend module:

```text
users
```

Mostly required for administration and future expansion.

---

## 8.1 List Users

### GET `/api/v1/users`

### Allowed

```text
ADMIN
```

### Later

Support filtering by:

```text
role
authority
department
status
```

---

## 8.2 Get User

### GET `/api/v1/users/:userId`

---

## 8.3 Create User

### POST `/api/v1/users`

### Allowed

```text
ADMIN
```

---

## 8.4 Update User

### PATCH `/api/v1/users/:userId`

---

## 8.5 Activate/Deactivate User

### POST `/api/v1/users/:userId/status`

---

# 9. ROLE AND PERMISSION APIs

Backend module:

```text
authorization
```

---

## 9.1 List Roles

### GET `/api/v1/roles`

---

## 9.2 List Permissions

### GET `/api/v1/permissions`

---

## 9.3 Role Permissions

### GET `/api/v1/roles/:roleId/permissions`

---

## 9.4 Update Role Permissions

### PUT `/api/v1/roles/:roleId/permissions`

Only for controlled administrator use.

---

# 10. AUTHORITY APIs

Backend module:

```text
authorities
departments
```

---

## 10.1 Authorities

### GET `/api/v1/authorities`

---

## 10.2 Authority Detail

### GET `/api/v1/authorities/:authorityId`

---

## 10.3 Departments

### GET `/api/v1/departments`

---

## 10.4 Authority Departments

### GET `/api/v1/authorities/:authorityId/departments`

Used when the BOSS assigns workflow stages to departments.

---

# 11. PROJECT APIs

Backend module:

```text
projects
```

---

## 11.1 Requesting Authority Project List

### GET `/api/v1/projects`

Query:

```text
?mine=true
?status=IN_PROGRESS
?search=highway
```

### Used by

```text
Requesting Authority Dashboard
Projects page
```

---

## 11.2 Create Project

### POST `/api/v1/projects`

### Allowed

```text
REQUESTING_AUTHORITY
```

### Input

```text
name
projectType
state
district
requiredLandArea
targetCompletionDate
description
```

---

## 11.3 Get Project

### GET `/api/v1/projects/:projectId`

Returns project summary and permission-appropriate information.

---

## 11.4 Update Draft Project

### PATCH `/api/v1/projects/:projectId`

Only editable while:

```text
DRAFT
```

or another explicitly editable state.

---

## 11.5 Submit Project

### POST `/api/v1/projects/:projectId/submit`

### Effect

```text
DRAFT
 ↓
SUBMITTED
 ↓
BOSS_REVIEW
```

Creates:

```text
audit event
notification
```

---

## 11.6 Project Actions

### GET `/api/v1/projects/:projectId/actions`

Returns actions requiring the requesting authority's attention.

Example:

```text
Stage rejected
Document correction required
Resubmission required
```

---

## 11.7 Project Timeline

### GET `/api/v1/projects/:projectId/timeline`

Returns:

```text
submission
workflow activation
stage changes
rejections
resubmissions
approval
```

---

## 11.8 Project Summary

### GET `/api/v1/projects/:projectId/summary`

Returns dashboard-friendly aggregate data.

Example:

```text
parcelCount
workflowProgress
parcelProgress
currentStage
daysPending
riskScore
```

---

# 12. PROJECT GEOMETRY APIs

Backend module:

```text
projects + gis
```

---

## 12.1 Save Project Geometry

### POST `/api/v1/projects/:projectId/geometry`

Used when the Requesting Authority draws:

```text
Project boundary
```

or:

```text
Project corridor
```

### Input

GeoJSON geometry.

---

## 12.2 Get Project Geometry

### GET `/api/v1/projects/:projectId/geometry`

---

## 12.3 Update Project Geometry

### PATCH `/api/v1/projects/:projectId/geometry`

Allowed only while the project is still editable.

---

# 13. PARCEL APIs

Backend module:

```text
parcels
```

---

## 13.1 List Project Parcels

### GET `/api/v1/projects/:projectId/parcels`

Used by:

```text
BOSS parcel screen
Project page
GIS
Parcel tables
```

---

## 13.2 Get Parcel

### GET `/api/v1/parcels/:parcelId`

Returns permission-appropriate parcel information.

---

## 13.3 Parcel Geometry

### GET `/api/v1/parcels/:parcelId/geometry`

Returns GeoJSON.

---

## 13.4 Search Parcels

### GET `/api/v1/parcels`

Example:

```text
?surveyNumber=...
?ulpin=...
?village=...
?district=...
```

---

## 13.5 Project Parcel Confirmation

### POST `/api/v1/boss/projects/:projectId/parcels/confirm`

### Allowed

```text
BOSS
```

### Input

```json
{
  "parcelIds": ["...", "..."]
}
```

### Effect

Creates:

```text
project_parcels
```

and:

```text
PARCELS_CONFIRMED
```

audit event.

---

# 14. LAND RECORD INTEGRATION APIs

Backend module:

```text
integrations/land-records
```

These APIs represent the future government integration boundary.

For Prototype V1 they use a mock provider.

---

## 14.1 Fetch Candidate Land Records

### POST `/api/v1/boss/projects/:projectId/land-records/fetch`

### Allowed

```text
BOSS
```

### Operation

```text
Project geometry
      +
land-record dataset
      ↓
candidate parcels
```

---

## 14.2 Land Record Request Status

### GET `/api/v1/boss/projects/:projectId/land-records`

Returns:

```text
request
provider
status
candidateCount
requestedAt
completedAt
```

---

## 14.3 Land Record Import

### GET `/api/v1/land-record-imports/:requestId`

Returns status/details for a specific import request.

---

# 15. WORKFLOW TEMPLATE APIs

Backend module:

```text
workflow-templates
```

The master workflow template is protected.

---

## 15.1 List Templates

### GET `/api/v1/workflow-templates`

Used by:

```text
BOSS Workflow Configuration
Admin
```

---

## 15.2 Get Template

### GET `/api/v1/workflow-templates/:templateId`

Returns:

```text
template
version
stages
responsibilities
SLAs
required documents
rules
```

---

## 15.3 Create Template

### POST `/api/v1/workflow-templates`

### Allowed

```text
ADMIN
```

Post-Prototype.

---

## 15.4 Update Template

### PUT `/api/v1/workflow-templates/:templateId`

### Allowed

```text
ADMIN
```

Not the BOSS.

---

## 15.5 Publish Template Version

### POST `/api/v1/workflow-templates/:templateId/publish`

Post-Prototype.

---

# 16. PROJECT WORKFLOW APIs

Backend module:

```text
workflows
```

This is where BOSS modifies a workflow for an individual project.

---

## 16.1 Initialize Workflow

### POST `/api/v1/projects/:projectId/workflow/initialize`

### Allowed

```text
BOSS
```

### Input

```text
templateId
```

Creates:

```text
workflow_instance
workflow_instance_stages
```

---

## 16.2 Get Project Workflow

### GET `/api/v1/projects/:projectId/workflow`

Returns:

```text
workflow status
template
template version
stages
current stage
progress
```

---

## 16.3 Add Project Stage

### POST `/api/v1/projects/:projectId/workflow/stages`

### Allowed

```text
BOSS
```

---

## 16.4 Update Project Stage

### PUT `/api/v1/projects/:projectId/workflow/stages/:stageId`

### Allowed

```text
BOSS
```

Can change:

```text
stage name
responsible department
responsible officer
SLA
required documents
configuration
```

---

## 16.5 Remove Project Stage

### DELETE `/api/v1/projects/:projectId/workflow/stages/:stageId`

### Allowed

```text
BOSS
```

Only while workflow is not activated.

---

## 16.6 Reorder Workflow

### PUT `/api/v1/projects/:projectId/workflow/order`

Updates the stage order.

---

## 16.7 Activate Workflow

### POST `/api/v1/projects/:projectId/workflow/activate`

### Allowed

```text
BOSS
```

This is the critical transition.

Effect:

```text
Create executable workflow
        ↓
Create first task
        ↓
Assign responsible officer
        ↓
Notify officer
        ↓
Create audit event
        ↓
BOSS exits
```

---

# 17. TASK APIs

Backend module:

```text
workflow-tasks
```

These APIs drive the Officer Dashboard.

---

## 17.1 My Tasks

### GET `/api/v1/tasks?assignedTo=me`

Used by:

```text
Officer Dashboard
```

---

## 17.2 Task Detail

### GET `/api/v1/tasks/:taskId`

Returns only information required by the officer.

---

## 17.3 Start Task

### POST `/api/v1/tasks/:taskId/start`

### Allowed

```text
Assigned Officer
```

---

## 17.4 Accept Task

### POST `/api/v1/tasks/:taskId/accept`

### Effect

```text
Task completed
 ↓
Stage completed
 ↓
Audit event
 ↓
Determine next stage
 ↓
Create next task
 ↓
Notify next officer
```

---

## 17.5 Reject Task

### POST `/api/v1/tasks/:taskId/reject`

### Input

```json
{
  "reason": "Required hard-copy signature is missing."
}
```

### Effect

```text
Stage rejected
 ↓
Requesting Authority notified
 ↓
Action created
```

The BOSS is not involved.

---

# 18. RESUBMISSION APIs

Backend module:

```text
workflow + projects
```

---

## 18.1 Resubmit Rejected Stage

### POST `/api/v1/projects/:projectId/workflow-stages/:stageId/resubmit`

### Allowed

```text
REQUESTING_AUTHORITY
```

### Input

```text
corrected documents
explanation
```

### Effect

```text
Rejected
 ↓
Correction submitted
 ↓
Stage becomes actionable again
 ↓
Responsible officer notified
```

---

# 19. WORKFLOW STATUS APIs

## 19.1 Current Workflow

### GET `/api/v1/projects/:projectId/workflow`

---

## 19.2 Workflow Progress

### GET `/api/v1/projects/:projectId/workflow/progress`

Returns:

```text
completedStages
totalStages
percentage
currentStage
```

---

## 19.3 Stage History

### GET `/api/v1/projects/:projectId/workflow/history`

Returns:

```text
stage
attempt
startedAt
completedAt
status
rejectionReason
responsibleOfficer
```

---

# 20. DOCUMENT APIs

Backend module:

```text
documents
```

---

## 20.1 Upload Document

### POST `/api/v1/documents/upload`

Used by:

```text
Requesting Authority
Officer
```

Actual file:

```text
Object Storage
```

Metadata:

```text
PostgreSQL
```

---

## 20.2 Project Documents

### GET `/api/v1/projects/:projectId/documents`

---

## 20.3 Task Documents

### GET `/api/v1/tasks/:taskId/documents`

---

## 20.4 Document Detail

### GET `/api/v1/documents/:documentId`

---

## 20.5 Download Document

### GET `/api/v1/documents/:documentId/download`

Should return a secure temporary access mechanism rather than exposing unrestricted storage URLs.

---

# 21. DOCUMENT VERSION APIs

## 21.1 List Versions

### GET `/api/v1/documents/:documentId/versions`

---

## 21.2 Upload New Version

### POST `/api/v1/documents/:documentId/versions`

The previous version remains unchanged.

---

## 21.3 Version Detail

### GET `/api/v1/documents/:documentId/versions/:versionId`

---

# 22. DOCUMENT PROCESSING APIs

Backend module:

```text
ai-processing
```

---

## 22.1 Start Processing

### POST `/api/v1/documents/:documentId/process`

This exists as a retry/manual-processing API.

Normal upload automatically creates the processing job.

---

## 22.2 Processing Status

### GET `/api/v1/documents/:documentId/processing`

Returns:

```text
OCR status
Gemini status
overall status
error
retry availability
```

Statuses:

```text
PROCESSING
COMPLETED
NEEDS_REVIEW
FAILED
RETRY_AVAILABLE
```

---

## 22.3 AI Extraction

### GET `/api/v1/documents/:documentId/extraction`

Returns:

```text
structuredFields
confidence
model
schemaVersion
status
```

---

## 22.4 Verify Extraction

### POST `/api/v1/documents/:documentId/verify`

### Allowed

```text
PROCESSING_OFFICER
```

### Input

```json
{
  "verified": true,
  "fields": {
    "surveyNumber": "MH-PN-004821",
    "area": 2.41
  }
}
```

The corrected values must pass normal backend/business validation before becoming official data.

The TRD explicitly states that AI output cannot bypass application validation or workflow rules.

---

# 23. EVIDENCE APIs

Backend module:

```text
documents / workflow
```

---

## 23.1 Add Stage Evidence

### POST `/api/v1/tasks/:taskId/evidence`

Evidence types:

```text
DIGITAL_DOCUMENT
HARD_COPY_SCAN
PHOTO
OCR_OUTPUT
OTHER
```

---

## 23.2 List Stage Evidence

### GET `/api/v1/tasks/:taskId/evidence`

---

# 24. GIS APIs

Backend module:

```text
gis
```

---

## 24.1 Project Map

### GET `/api/v1/gis/projects/:projectId`

Returns:

```text
project geometry
parcel geometries
parcel status
```

---

## 24.2 Projects Map

### GET `/api/v1/gis/projects`

Supports filters:

```text
state
district
status
projectType
risk
```

---

## 24.3 Parcel GeoJSON

### GET `/api/v1/gis/parcels/:parcelId`

Returns GeoJSON.

---

## 24.4 State Map

### GET `/api/v1/gis/states/:stateId`

Post-Prototype.

Used for richer state-level GIS views.

---

# 25. NOTIFICATION APIs

Backend module:

```text
notifications
```

---

## 25.1 User Notifications

### GET `/api/v1/notifications`

---

## 25.2 Mark Notification Read

### POST `/api/v1/notifications/:notificationId/read`

---

## 25.3 Notification Detail

### GET `/api/v1/notifications/:notificationId`

---

## 25.4 Internal Notification Dispatch

### POST `/api/v1/notifications/send`

Internal/admin-controlled service operation.

Normally workflow services should call the notification service internally rather than exposing this directly to normal frontend users.

---

# 26. GRIEVANCE APIs

Backend module:

```text
grievances
```

---

## 26.1 List Grievances

### GET `/api/v1/grievances`

For Prototype V1:

```text
REQUESTING_AUTHORITY
```

sees grievances associated with their projects.

---

## 26.2 Grievance Detail

### GET `/api/v1/grievances/:grievanceId`

---

## 26.3 Respond

### POST `/api/v1/grievances/:grievanceId/respond`

---

## 26.4 Close

### POST `/api/v1/grievances/:grievanceId/close`

---

## 26.5 Grievance Documents

### GET `/api/v1/grievances/:grievanceId/documents`

---

# 27. WHATSAPP APIs

Backend module:

```text
integrations/whatsapp
```

These APIs connect Meta WhatsApp Business Cloud API with the application.

---

## 27.1 Webhook Verification

### GET `/api/v1/integrations/whatsapp/webhook`

Used by Meta verification.

---

## 27.2 Incoming Messages

### POST `/api/v1/integrations/whatsapp/webhook`

Receives:

```text
message
sender
timestamp
message type
media references
```

---

## 27.3 Send WhatsApp Message

### POST `/api/v1/integrations/whatsapp/send`

Internal backend operation.

Payload:

```text
recipient
message
template/media data
```

---

## 27.4 WhatsApp Integration Status

### GET `/api/v1/integrations/whatsapp/status`

Used for administration/health monitoring.

---

# 28. CITIZEN WHATSAPP BUSINESS LOGIC

WhatsApp messages should not directly manipulate project records.

Example:

```text
WhatsApp
   |
Webhook
   |
Message Handler
   |
Intent Detection
   |
Business Service
   |
Database
```

For:

```text
STATUS
```

call:

```text
Project/Parcel service
```

For:

```text
OBJECTION
```

call:

```text
Grievance service
```

For:

```text
DOCUMENT
```

call:

```text
Document service
```

This keeps WhatsApp as a channel rather than a separate application.

---

# 29. COMPENSATION APIs

Backend module:

```text
compensation
```

Post-Prototype.

---

## 29.1 Project Compensation Summary

### GET `/api/v1/projects/:projectId/compensation`

---

## 29.2 Parcel Compensation

### GET `/api/v1/parcels/:parcelId/compensation`

---

## 29.3 Create Compensation Record

### POST `/api/v1/compensation`

---

## 29.4 Update Compensation Record

### PATCH `/api/v1/compensation/:compensationId`

---

# 30. POSSESSION APIs

Backend module:

```text
possession
```

Post-Prototype.

---

## 30.1 Parcel Possession

### GET `/api/v1/parcels/:parcelId/possession`

---

## 30.2 Update Possession

### PATCH `/api/v1/possession/:possessionId`

---

## 30.3 Evidence

### POST `/api/v1/possession/:possessionId/evidence`

---

# 31. R&R APIs

Backend module:

```text
rr
```

Post-Prototype.

---

## 31.1 Project R&R

### GET `/api/v1/projects/:projectId/rr`

---

## 31.2 Affected Families

### GET `/api/v1/projects/:projectId/affected-families`

---

## 31.3 R&R Record

### GET `/api/v1/rr/:rrId`

---

## 31.4 Update R&R

### PATCH `/api/v1/rr/:rrId`

---

## 31.5 R&R Milestones

### GET `/api/v1/rr/:rrId/milestones`

---

# 32. RISK APIs

Backend module:

```text
risks
```

---

## 32.1 Project Risk

### GET `/api/v1/projects/:projectId/risk`

Returns:

```text
score
riskLevel
factors
calculatedAt
```

---

## 32.2 Parcel Risk

### GET `/api/v1/parcels/:parcelId/risk`

---

## 32.3 Recalculate Project Risk

### POST `/api/v1/projects/:projectId/risk/recalculate`

---

## 32.4 Recalculate Parcel Risk

### POST `/api/v1/parcels/:parcelId/risk/recalculate`

The first version uses transparent rule-based scoring.

The TRD requires risk scores at project and parcel levels and recommends measurable, explainable factors.

---

# 33. REPORT APIs

Backend module:

```text
reports
```

---

## 33.1 Project Report

### GET `/api/v1/reports/projects`

Filters:

```text
state
district
project
status
date range
```

---

## 33.2 Progress Report

### GET `/api/v1/reports/progress`

---

## 33.3 Risk Report

### GET `/api/v1/reports/risk`

---

## 33.4 Audit Report

### GET `/api/v1/reports/audit`

---

# 34. NATIONAL DASHBOARD APIs

Post-Prototype.

---

## 34.1 National Dashboard

### GET `/api/v1/dashboard/national`

Returns:

```text
projects
land
compensation
families
possession
R&R
timeline
risk
```

---

# 35. STATE DASHBOARD APIs

## 35.1 State Dashboard

### GET `/api/v1/dashboard/state/:stateId`

---

# 36. DISTRICT DASHBOARD APIs

## 36.1 District Dashboard

### GET `/api/v1/dashboard/district/:districtId`

---

# 37. REQUESTING AUTHORITY DASHBOARD API

### GET `/api/v1/dashboard/requesting-authority`

Returns:

```text
project counts
pending actions
active projects
approved projects
rejected projects
recent activity
```

Used by:

```text
/dashboard
```

---

# 38. BOSS DASHBOARD APIs

### GET `/api/v1/dashboard/boss`

Returns:

```text
new requests
requests awaiting parcel decision
requests awaiting workflow configuration
recently activated projects
```

The API should not return projects already under active execution unless required for historical information.

Once BOSS activates a project, it leaves the BOSS operational queue.

---

# 39. OFFICER DASHBOARD API

### GET `/api/v1/dashboard/officer`

Returns:

```text
assigned tasks
due today
overdue
completed
```

Equivalent detailed task retrieval comes from:

```text
GET /api/v1/tasks?assignedTo=me
```

---

# 40. AUDIT APIs

Backend module:

```text
audit
```

---

## 40.1 Project Audit

### GET `/api/v1/audit/projects/:projectId`

---

## 40.2 Document Audit

### GET `/api/v1/audit/documents/:documentId`

---

## 40.3 Event Detail

### GET `/api/v1/audit/events/:eventId`

Returns:

```text
actor
role
action
entity
oldValue
newValue
timestamp
source
metadata
```

---

# 41. PROVENANCE APIs

Backend module:

```text
provenance
```

---

## 41.1 Event Provenance

### GET `/api/v1/provenance/events/:eventId`

---

## 41.2 Document Provenance

### GET `/api/v1/provenance/documents/:documentId`

Returns:

```text
hash
network
channel
transactionId
status
timestamp
```

---

## 41.3 Retry Provenance

### POST `/api/v1/provenance/:provenanceId/retry`

Admin/internal operation.

The TRD specifies that important document/event hashes and provenance information are recorded in Hyperledger Fabric while actual application data remains off-chain.

---

# 42. INTEGRATION HEALTH APIs

Backend module:

```text
integrations
```

---

## 42.1 Integration Status

### GET `/api/v1/integrations/status`

Returns:

```text
landRecords
whatsapp
fabric
objectStorage
ocr
gemini
```

with:

```text
AVAILABLE
DEGRADED
FAILED
```

---

# 43. PROJECT API → PAGE OWNERSHIP

| Page | APIs |
|---|---|
| `/` | `/public/overview`, `/public/states`, `/public/states/:id` |
| `/login` | `/auth/*` |
| `/dashboard` | `/dashboard/requesting-authority`, `/projects` |
| `/projects` | `/projects`, `/notifications` |
| `/projects/new` | `/projects`, `/projects/:id/geometry`, `/documents`, `/projects/:id/submit` |
| `/projects/:id` | `/projects/:id`, `/summary`, `/timeline`, `/workflow`, `/documents`, `/risk`, `/actions` |
| `/boss/dashboard` | `/dashboard/boss` |
| `/boss/projects/:id` | `/projects/:id` |
| `/boss/projects/:id/parcels` | land-record APIs, `/projects/:id/parcels`, GIS APIs |
| `/boss/projects/:id/workflow` | workflow-template + project-workflow APIs |
| `/officer/dashboard` | `/dashboard/officer`, `/tasks` |
| `/officer/tasks/:id` | `/tasks/:id`, documents, evidence, processing, accept/reject |
| `/gis` | GIS APIs |
| `/parcels/:id` | parcel + GIS + workflow + documents + risk + audit |
| `/documents` | documents APIs |
| `/documents/:id` | documents + versions + processing + extraction + provenance |
| `/grievances` | grievance APIs |
| `/notifications` | notification APIs |
| `/national-dashboard` | national dashboard/report APIs |
| `/state-dashboard` | state dashboard/report APIs |
| `/district-dashboard` | district dashboard/report APIs |
| `/reports` | report APIs |

---

# 44. PAGE → ALLOWED ROLE

| Page | Requesting Authority | BOSS | Processing Officer | Admin |
|---|---:|---:|---:|---:|
| Public Landing | No login | No login | No login | No login |
| Login | Yes | Yes | Yes | Yes |
| Requesting Dashboard | Yes | No | No | Controlled |
| Create Project | Yes | No | No | Controlled |
| BOSS Dashboard | No | Yes | No | Yes |
| Parcel Configuration | No | Yes | No | Yes |
| Workflow Builder | No | Yes | No | Yes |
| Officer Dashboard | No | No | Yes | Yes |
| Officer Task | No | No | Yes | Yes |
| Grievances | Yes | No | No | Yes |
| National Dashboard | Later | Later | Controlled | Yes |
| Reports | Yes/Scope | Yes/Scope | Limited | Yes |

---

# 45. API → DATABASE OWNERSHIP

The backend modules map to these tables.

```text
AUTH
  users
  roles
  permissions
  role_permissions

AUTHORITIES
  authorities
  departments

PROJECTS
  projects
  proposals
  project_members

PARCELS
  land_parcels
  project_parcels
  land_record_imports

WORKFLOW
  workflow_templates
  workflow_template_stages
  workflow_instances
  workflow_instance_stages
  workflow_tasks

DOCUMENTS
  documents
  document_versions
  stage_evidence
  document_processing_jobs
  ai_extractions

ACQUISITION
  compensation_records
  possession_records
  affected_families
  displaced_families
  rr_records
  rr_milestones

CITIZEN
  grievances
  grievance_documents

NOTIFICATIONS
  notifications

RISK
  risk_assessments

AUDIT
  audit_events

PROVENANCE
  provenance_records

INTEGRATION
  external_integration_references
```

This follows the database domains already defined by the TRD.

---

# 46. API → BACKEND MODULE OWNERSHIP

```text
src/modules/

auth/
users/
roles/
authorities/

projects/
proposals/

parcels/
land-records/

workflow-templates/
workflows/
workflow-tasks/

documents/
document-processing/

gis/

compensation/
possession/
rr/

grievances/
notifications/

risks/
reports/

audit/
provenance/

integrations/
  land-records/
  whatsapp/
```

---

# 47. Critical Workflow API Sequence

## Request Creation

```text
POST /projects
        ↓
POST /projects/:id/geometry
        ↓
POST /projects/:id/documents
        ↓
POST /projects/:id/submit
```

---

## BOSS Parcel Determination

```text
POST /boss/projects/:id/land-records/fetch
        ↓
GET /boss/projects/:id/land-records
        ↓
POST /boss/projects/:id/parcels/confirm
```

---

## BOSS Workflow Creation

```text
POST /projects/:id/workflow/initialize
        ↓
PUT /projects/:id/workflow/stages/:stageId
        ↓
POST /projects/:id/workflow/activate
```

---

## Officer Execution

```text
GET /tasks
        ↓
GET /tasks/:id
        ↓
POST /tasks/:id/start
        ↓
POST /documents/upload
        ↓
GET /documents/:id/processing
        ↓
GET /documents/:id/extraction
        ↓
POST /documents/:id/verify
        ↓
POST /tasks/:id/evidence
        ↓
POST /tasks/:id/accept
```

---

## Officer Rejection

```text
POST /tasks/:id/reject
        ↓
Requesting Authority notification
        ↓
GET /projects/:id/actions
        ↓
POST /projects/:id/workflow-stages/:stageId/resubmit
        ↓
Officer receives task again
```

---

## Final Approval

```text
POST /tasks/:id/accept
        ↓
Final stage complete
        ↓
PROJECT = APPROVED
        ↓
Audit event
        ↓
Fabric provenance
        ↓
Notification
        ↓
Requesting Authority dashboard
```

---

## Citizen Status

```text
Citizen
  ↓
WhatsApp
  ↓
POST /integrations/whatsapp/webhook
  ↓
Parcel/Project service
  ↓
WhatsApp response
```

---

## Citizen Objection

```text
Citizen
  ↓
WhatsApp
  ↓
Webhook
  ↓
Grievance service
  ↓
grievance created
  ↓
notification
  ↓
Requesting Authority dashboard
```

---

# 48. Prototype V1 APIs

The first prototype must implement these APIs before anything else.

```text
AUTH
POST   /auth/login
POST   /auth/logout
GET    /auth/me

PUBLIC
GET    /public/overview
GET    /public/states
GET    /public/states/:stateId

PROJECTS
GET    /projects
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
POST   /projects/:id/geometry
POST   /projects/:id/documents
POST   /projects/:id/submit
GET    /projects/:id/actions
GET    /projects/:id/timeline

BOSS
GET    /dashboard/boss
POST   /boss/projects/:id/land-records/fetch
GET    /boss/projects/:id/land-records
POST   /boss/projects/:id/parcels/confirm

WORKFLOW
GET    /workflow-templates
POST   /projects/:id/workflow/initialize
GET    /projects/:id/workflow
PUT    /projects/:id/workflow/stages/:stageId
POST   /projects/:id/workflow/stages
DELETE /projects/:id/workflow/stages/:stageId
POST   /projects/:id/workflow/activate

TASKS
GET    /dashboard/officer
GET    /tasks
GET    /tasks/:id
POST   /tasks/:id/start
POST   /tasks/:id/accept
POST   /tasks/:id/reject

DOCUMENTS
POST   /documents/upload
GET    /documents/:id
GET    /documents/:id/processing
GET    /documents/:id/extraction
POST   /documents/:id/verify
POST   /tasks/:id/evidence

RESUBMISSION
POST   /projects/:id/workflow-stages/:stageId/resubmit

GIS
GET    /gis/projects
GET    /gis/projects/:id
GET    /gis/parcels/:id

AUDIT
GET    /audit/projects/:id
GET    /audit/documents/:id
GET    /audit/events/:id

PROVENANCE
GET    /provenance/events/:id
GET    /provenance/documents/:id

GRIEVANCES
GET    /grievances
GET    /grievances/:id
POST   /grievances/:id/respond
POST   /grievances/:id/close

WHATSAPP
GET    /integrations/whatsapp/webhook
POST   /integrations/whatsapp/webhook
POST   /integrations/whatsapp/send

NOTIFICATIONS
GET    /notifications
POST   /notifications/:id/read

RISKS
GET    /projects/:id/risk
GET    /parcels/:id/risk
POST   /projects/:id/risk/recalculate
```

---

# 49. Post-Prototype APIs

After Prototype V1 is stable, add:

```text
Users
Roles
Permissions
Authority administration

National dashboard
State dashboard
District dashboard

Compensation
Possession
R&R

Advanced reports

Advanced risk

Anomaly detection

Delay prediction

Parcel Passport

QR

Advanced GIS

Government land-record integration

ULPIN integration

PM Gati Shakti integration

Government identity integration

Payment integration

Advanced Fabric network

Advanced notification channels
```

These additions correspond to the broader PRD/TRD feature set rather than the minimum first implementation.

---

# 50. API Error Contract

Every API must return a consistent error structure.

```json
{
  "error": {
    "code": "WORKFLOW_STAGE_NOT_ACTIONABLE",
    "message": "This workflow stage cannot be completed by the current user."
  },
  "requestId": "req_12345"
}
```

Examples:

```text
UNAUTHORIZED
FORBIDDEN
VALIDATION_ERROR
RESOURCE_NOT_FOUND
WORKFLOW_STAGE_NOT_ACTIONABLE
PROJECT_NOT_EDITABLE
DOCUMENT_PROCESSING_FAILED
INTEGRATION_UNAVAILABLE
PROVENANCE_PENDING
```

---

# 51. API Status Codes

Use normal HTTP semantics.

```text
200 OK
201 Created
202 Accepted
204 No Content

400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
502 Bad Gateway
503 Service Unavailable
```

`202 Accepted` is particularly useful for asynchronous operations such as:

```text
OCR processing
Fabric provenance
external integration jobs
```

---

# 52. Asynchronous API Rule

For long-running operations:

```text
API Request
     ↓
Create Job
     ↓
Return Job Status
```

Example:

```http
POST /api/v1/documents/:id/process
```

returns:

```json
{
  "data": {
    "jobId": "job_123",
    "status": "QUEUED"
  }
}
```

The frontend then queries:

```http
GET /api/v1/documents/:id/processing
```

This follows the TRD's Redis + BullMQ architecture for OCR, Gemini, notifications, and other retryable operations.

---

# 53. API Security Rules

Every protected endpoint must:

1. Authenticate the caller.
2. Check role.
3. Check permission.
4. Check project/authority scope.
5. Check object ownership/assignment where applicable.
6. Validate input.
7. Apply data sensitivity rules.
8. Record important actions in audit.

The TRD requires secure authentication, server-side authorization, validation, controlled integration credentials and least privilege.

---

# 54. The Most Important API Ownership Rule

Never let one API become responsible for everything.

For example, do not create:

```text
POST /projects/:id/process
```

that simultaneously:

```text
creates parcels
changes workflow
uploads documents
runs OCR
assigns officers
```

Instead:

```text
Project API
Parcel API
Workflow API
Document API
Task API
```

remain separate.

The backend services may call one another internally, but the public REST boundaries remain clear.

---

# 55. Final API Architecture

```text
                         FRONTEND
                             |
                         REST API
                             |
                     NODE + EXPRESS
                             |
       +----------+----------+----------+----------+
       |          |          |          |          |
    Projects   Parcels    Workflow   Documents   GIS
       |          |          |          |
       +----------+----------+----------+
                             |
                      PostgreSQL/PostGIS
                             |
        +--------------------+-------------------+
        |                    |                   |
    Redis/BullMQ        Integration Layer    Audit
        |                    |                   |
   OCR/Gemini          Land Records          PostgreSQL
   WhatsApp             WhatsApp                 |
   Fabric                APIs                    v
        |                                    Fabric
        v
 External Services
```

The core application remains a modular monolith, which matches the TRD's recommendation not to unnecessarily split the system into microservices.

---

# 56. API Implementation Priority

### Must exist before prototype UI is considered functional

```text
1. Auth
2. Public Overview
3. Projects
4. Project Geometry
5. Mock Land Records
6. Parcels
7. Workflow Templates
8. Workflow Instances
9. Tasks
10. Documents
11. OCR Processing
12. AI Extraction
13. Evidence
14. Audit
15. Provenance
16. Grievances
17. WhatsApp
18. Notifications
19. Risk
20. GIS
```

### Added after the prototype

```text
21. Compensation
22. Possession
23. R&R
24. National Dashboard
25. State Dashboard
26. District Dashboard
27. Advanced Reports
28. Advanced GIS
29. Government Integrations
30. Advanced Analytics
```

---

# 57. Final API Principle

The system's API architecture should ultimately represent this chain:

```text
PROJECT
   |
   +--> PROJECT GEOMETRY
   |
   +--> LAND RECORD CANDIDATES
   |
   +--> PROJECT PARCELS
   |
   +--> WORKFLOW INSTANCE
             |
             +--> TASK
                    |
                    +--> DOCUMENT
                    |      |
                    |      +--> OCR
                    |      +--> GEMINI
                    |      +--> VERIFICATION
                    |
                    +--> EVIDENCE
                    |
                    +--> ACCEPT / REJECT
                              |
                              +--> NEXT TASK
                              |
                              +--> REQUESTING AUTHORITY ACTION

Every important action
        |
        +--> PostgreSQL Audit
        |
        +--> Fabric Provenance

Citizen
   |
 WhatsApp
   |
Grievance / Status
   |
Existing Project / Parcel
```

The API should therefore mirror the business model instead of being designed around individual UI screens. This keeps the prototype compatible with the full project/parcel, workflow, document, audit, integration and citizen-communication architecture defined in the TRD.