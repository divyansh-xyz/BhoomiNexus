# Implementation Plan V1
## National Land Acquisition & Management System

---

# 0. Implementation Rule

This document is the implementation contract for the project.

The system is **not** to be built as a throwaway demo.

The first prototype is the first working slice of the final system. Every important object created in the prototype must use the final database concepts, API structure, permission model, workflow-instance model, document model, and audit approach.

The architecture remains:

```text
React + TypeScript + Vite
        |
        | REST
        v
Node.js + TypeScript + Express
        |
        +-------------------------------+
        |                               |
        v                               v
PostgreSQL + PostGIS              Redis + BullMQ
        |                               |
        |                    OCR / Gemini / Notifications
        |
        +-------------------------------+
        |
        +---------- Integration Layer --------+
        |                                     |
        v                                     v
Mock Government Land Records          WhatsApp Cloud API

        |
        v
Hyperledger Fabric
Provenance / Audit Anchors
```

This follows the locked stack in the TRD: React/Vite, Node/Express, PostgreSQL/PostGIS, Leaflet/OpenStreetMap, Google Cloud Vision, Gemini, Redis/BullMQ, Hyperledger Fabric, government identity + RBAC, and Meta WhatsApp Business Cloud API.

---

# 1. Prototype Objective

The first working prototype must prove this complete story:

```text
Unauthenticated Landing Page
        |
        v
Government Sign In
        |
        v
Requesting Authority Dashboard
        |
        v
Create Project Request
        |
        v
Submit Request
        |
        v
BOSS Dashboard
        |
        +--> Review Request
        |
        +--> Fetch / select land parcels
        |
        +--> Select workflow template
        |
        +--> Tweak workflow
        |
        +--> Activate workflow
        |
        v
BOSS exits the process
        |
        v
Assigned Officer Dashboard
        |
        +--> Receives ONLY current assigned stage
        |
        +--> Reviews supplied documents/data
        |
        +--> OCR-assisted document assertion
        |
        +--> Uploads digital document
        |
        +--> Uploads hard-copy image
        |
        +--> Accept
        |       |
        |       v
        |   Next stage
        |
        +--> Reject
                |
                v
        Requesting Authority Dashboard
                |
                +--> sees rejection reason
                +--> corrects/re-submits
```

At the same time:

```text
Important workflow action
        |
        +--> PostgreSQL audit event
        |
        +--> event/document hash
                  |
                  v
           Hyperledger Fabric
```

And:

```text
Citizen
   |
WhatsApp
   |
Meta WhatsApp Cloud API
   |
Backend
   |
Status query / objection / grievance / document
   |
Requesting Authority dashboard
```

The project therefore demonstrates the central chain:

> **Request → Parcels → Workflow → Officer Action → Documents/OCR → Approval/Rejection → Audit/Provenance → Citizen Communication**

This is consistent with the PRD's stated objective of demonstrating a complete believable workflow rather than disconnected features.

---

# 2. Prototype Roles

Do not create unnecessary roles for the first prototype.

## 2.1 Requesting Authority

This is the project initiator.

Can:

- Sign in
- Create project requests
- Enter project information
- Upload initial documents
- Submit project request
- View own projects
- Track overall project progress
- See current workflow stage
- See whether a project is approved, rejected, pending, or completed
- See rejection reasons
- Correct rejected information
- Re-submit a rejected stage
- View citizen objections/grievances related to its projects
- Respond to citizen issues
- View project documents permitted to it
- View audit history relevant to its projects

Cannot:

- Decide official project parcels after submission
- Edit the BOSS-created workflow
- Perform another officer's stage
- Approve another authority's work
- Change workflow definitions

The PRD already establishes that the project agency creates/submits projects and tracks its projects.

---

# 2.2 BOSS / Higher-Level Officer

The BOSS is a **workflow initialization role**, not an execution role.

Can:

- View incoming project requests
- Review project request information
- Review initial documents
- Fetch candidate land records from the integration layer
- Determine the project's land-parcel set
- Confirm the number of parcels
- View parcels on GIS
- Select a predefined workflow template
- Make permitted project-specific changes to the workflow
- Assign responsible departments/officers to stages
- Set stage deadlines
- Activate the project workflow

After activation:

> **The BOSS is out of the project workflow.**

The BOSS does not:

- Approve downstream officer work
- Track individual workflow stages
- Receive ordinary stage updates
- Handle citizen complaints
- Repair rejected applications
- Act as a bottleneck for every later step

This is an important simplification of the full PRD while remaining compatible with the governed configurable workflow architecture in the TRD.

---

# 2.3 Processing / Middle-Level Officer

This is the officer responsible for executing one assigned workflow stage.

The officer's dashboard shows:

> **Work assigned to me**

not:

> **Complete project management**

The officer can:

- Open assigned task
- View project information needed for that task
- View relevant parcel information
- View required documents
- Upload documents
- Use OCR-assisted extraction
- Review OCR/Gemini output
- Upload hard-copy scan/photo
- Add remarks
- Accept the stage
- Reject the stage
- Provide mandatory rejection reason

The officer cannot:

- Edit the project workflow
- Reassign the project arbitrarily
- See/edit future stages
- Change completed stages
- Modify the official overall project completion status
- Track the project as a whole beyond information necessary to perform the assigned stage

This follows the TRD principle that stage completion is performed by responsible officers and the overall completion/progress is calculated by the system.

---

# 2.4 Citizen

There is **no citizen web-app role**.

Citizen interaction is through WhatsApp.

The citizen can:

- Ask for project/compensation status
- Receive acquisition updates
- Submit objection
- Submit grievance
- Upload supporting document/image
- Receive acknowledgement number
- Track grievance/objection

The submission must be associated with a project/parcel/case where the citizen can be matched to the relevant record.

This matches the locked TRD decision.

---

# 2.5 Administrator

Do not make this part of the main hackathon flow.

Create an internal administrator role in the database from the beginning because the final system needs user, role, permission, master-data, and workflow-template administration. But the prototype UI does not need to expose a full admin portal.

---

# 3. Main State Model

The project has two different kinds of progress.

## Workflow progress

Example:

```text
3 / 5 workflow stages completed
60%
```

## Parcel progress

Example:

```text
180 / 250 parcels acquired
72%
```

These must remain separate because workflow progress and physical acquisition progress represent different things.

For the first prototype, workflow progress is the main visible progress metric.

---

# 4. Project Lifecycle

Use these application-level states:

```text
DRAFT
SUBMITTED
BOSS_REVIEW
PARCELS_DEFINED
WORKFLOW_CONFIGURING
IN_PROGRESS
REJECTED_TO_AUTHORITY
APPROVAL_PENDING
APPROVED
COMPLETED
CANCELLED
```

Do not let frontend code decide state transitions.

Every transition must happen through the backend workflow service.

---

# 5. Workflow Model

This is the most important part of the implementation.

## 5.1 Master Workflow Template

Create a protected template:

```text
Land Acquisition - Prototype
```

Example:

```text
1. BOSS Review
2. Land / Parcel Verification
3. Document Verification
4. Departmental Scrutiny
5. Final Approval
```

The master template is stored separately from individual projects.

---

# 5.2 Project Workflow Instance

When the BOSS activates the workflow:

```text
MASTER TEMPLATE
       |
       | instantiate
       v
PROJECT WORKFLOW INSTANCE
```

The project receives its own copy.

For example:

```text
Project: Highway Expansion Package 01

Stage 1
Land Verification
Responsible: Officer A

Stage 2
Document Verification
Responsible: Officer B

Stage 3
Department Approval
Responsible: Officer C

Stage 4
Final Approval
Responsible: Officer D
```

The BOSS can change the **project instance**, but cannot rewrite the master template during normal project creation.

---

# 5.3 Workflow Permissions

Hard rule:

```text
Requesting Authority
    -> Execute request / track
    -> NO workflow editing

BOSS
    -> Configure project workflow
    -> YES

Processing Officer
    -> Execute assigned stage
    -> NO workflow editing

Administrator
    -> Manage master templates
    -> YES
```

---

# 5.4 Officer Rejection

A rejection must always contain a reason.

Correct flow:

```text
Officer
   |
   | Reject
   v
Workflow stage = REJECTED
   |
   v
Requesting Authority notified
   |
   +--> sees reason
   |
   +--> corrects information/document
   |
   +--> resubmits
   |
   v
Same workflow stage becomes available again
```

The BOSS does not re-enter this loop.

This creates a clean separation:

> **BOSS establishes the process; Requesting Authority manages issues during execution.**

---

# 6. Land Parcel Determination

Do not implement AI-based cadastral parcel discovery in Prototype V1.

Instead implement the future architecture now:

```text
BOSS
  |
  | Fetch Land Records
  v
Integration Service
  |
  v
Mock Government Land Record API
  |
  v
Candidate Parcels
  |
  v
BOSS selects/confirms parcels
  |
  v
Project Parcels
```

The mock API should return realistic records containing:

```text
internal_external_id
ULPIN
survey_number
owner_name
village
taluk
district
state
area
geometry
land_type
```

The PRD explicitly allows mock APIs/sample government data/sandbox responses during the hackathon.

Later:

```text
Mock Land Records API
        |
        | replace adapter
        v
Actual Government Land Records API
```

No core application rewrite should be necessary.

The system must not pretend that our database is the authoritative ownership registry.

---

# 7. Page Architecture

The frontend should be a responsive government web application.

Use a common shell:

```text
+--------------------------------------------------------------+
| Logo | Land Acquisition System       Notifications | User ▼ |
+--------------------------------------------------------------+
| Sidebar                   | Main Content                      |
|                           |                                   |
| Dashboard                 |                                   |
| Projects                  |                                   |
| My Tasks                  |                                   |
| GIS                       |                                   |
| Documents                 |                                   |
| Grievances                |                                   |
| Reports                   |                                   |
+---------------------------+-----------------------------------+
```

The sidebar is role-dependent.

Do not display menu items that a role cannot use.

---

# 8. Public Landing Page

URL:

```text
/
```

This is the page before login.

It should look like a government digital platform, not a startup landing page.

## Header

```text
Government of India
National Land Acquisition & Management System

About
How It Works
Public Information
Help

[Sign In]
```

Do not put sensitive project data here.

## Hero

Headline:

> National Land Acquisition & Management System

Supporting text:

> One secure platform to manage, verify, track and monitor land acquisition from project request to approval, compensation, possession and R&R.

Primary button:

```text
Sign In to Government Portal
```

Secondary:

```text
How the System Works
```

## Feature section

Use four cards:

```text
End-to-End Workflow
GIS Land Intelligence
AI-Assisted Documents
Transparent Audit Trail
```

## Public information section

Only show non-sensitive information.

Example:

```text
Approved Projects
Public Notices
System Information
```

Do not create a public citizen account system.

This follows the PRD's controlled-public-view approach and data-privacy boundary.

---

# 9. Sign-In Page

URL:

```text
/login
```

Prototype:

```text
Government Identity Login

Employee / Government ID
Password

[Sign In]

Use Government Identity Provider
```

For the hackathon, this can be a simulated identity integration.

After authentication, the backend returns:

```text
user
role
department
administrative scope
permissions
token/session
```

The TRD explicitly permits simulated government identity integration for the hackathon while requiring the architecture to support a real provider later.

---

# 10. Requesting Authority Dashboard

URL:

```text
/dashboard
```

Primary purpose:

> **Track the projects I requested.**

## Header

```text
Dashboard
Projects
Create Project
Grievances
Notifications
Help
User
```

## KPI cards

```text
My Projects
Pending
In Progress
Approved
Rejected / Needs Action
```

## Project table

Columns:

```text
Project ID
Project Name
Project Type
Parcel Count
Current Stage
Workflow Progress
Status
Last Updated
Action
```

Example:

```text
Highway Expansion Phase 2
250 parcels
Document Verification
3 / 5 stages
In Progress
[View]
```

## Important design rule

The requesting authority sees:

```text
Where is my project?
What stage is it at?
Is something rejected?
What needs my action?
```

It does not see internal actions that are irrelevant to it.

---

# 11. Create Project Page

URL:

```text
/projects/new
```

Sections:

### Project Details

```text
Project Name
Project Type
Implementing Authority
State
District(s)
Required Land Area
Target Completion Date
Description
```

### Initial Request Documents

```text
Proposal document
Supporting document
Optional reference documents
```

### Submit

Button:

```text
Save Draft
```

then:

```text
Submit Project Request
```

On submission:

```text
DRAFT -> SUBMITTED -> BOSS_REVIEW
```

---

# 12. Requesting Authority Project Page

URL:

```text
/projects/:projectId
```

Header:

```text
Highway Expansion Phase 2

Status: In Progress
Current Stage: Document Verification
```

## Summary cards

```text
Total Parcels
Workflow Progress
Parcel Progress
Days Pending
Risk Score
```

## Workflow tracker

The requesting authority sees:

```text
✓ Request Submitted
✓ BOSS Configuration
✓ Parcel Verification
● Document Verification
○ Department Scrutiny
○ Final Approval
```

But the interface should avoid exposing unnecessary internal details.

## Project timeline

```text
03 Sep
Project submitted

03 Sep
BOSS configured workflow

04 Sep
Parcel verification completed

05 Sep
Document verification started
```

## Action panel

Only appear when required:

```text
ACTION REQUIRED

Document Verification rejected

Reason:
Signature missing on hard-copy document.

[Correct and Resubmit]
```

## Citizen issues

Show:

```text
Open grievances
Open objections
Recent citizen messages
```

---

# 13. BOSS Dashboard

URL:

```text
/boss/dashboard
```

This is a completely different dashboard.

Headline:

> Project Requests Awaiting Configuration

Cards:

```text
New Requests
Pending Parcel Decisions
Workflows to Configure
Projects Activated Today
```

Table:

```text
Request ID
Project
Requesting Authority
Requested Land Area
Requested On
Status
Action
```

The BOSS sees projects requiring initialization.

---

# 14. BOSS Project Configuration Page

URL:

```text
/boss/projects/:projectId
```

This page is a major prototype screen.

Use a stepper:

```text
1 Request
2 Land Parcels
3 Workflow
4 Activate
```

---

# 15. BOSS Land Parcel Screen

URL:

```text
/boss/projects/:projectId/parcels
```

Layout:

```text
+-----------------------------------------------+
| Project Land Requirement                      |
| Required Area: 500 acres                      |
| Candidate Parcels: 312                        |
| Selected Parcels: 250                         |
+-----------------------------------------------+

+----------------------+------------------------+
| Parcel Table         | GIS Map                |
|                      |                        |
| Select □             | polygon markers       |
| Survey No            |                        |
| Village              |                        |
| Owner                |                        |
| Area                 |                        |
| ULPIN                |                        |
+----------------------+------------------------+

[Fetch Land Records]
[Confirm Selected Parcels]
```

The map uses PostGIS geometry and Leaflet.

The TRD says GIS is primarily a monitoring/overview feature and does not require advanced parcel editing for the prototype.

---

# 16. BOSS Workflow Configuration Page

URL:

```text
/boss/projects/:projectId/workflow
```

Show:

```text
Template:
Land Acquisition - Prototype

[Select Template]
```

Then:

```text
Workflow Builder

1. Parcel Verification
   Responsible: Land Department
   SLA: 5 days

2. Document Verification
   Responsible: District Officer
   SLA: 7 days

3. Departmental Scrutiny
   Responsible: Department Officer
   SLA: 5 days

4. Final Approval
   Responsible: Approval Officer
   SLA: 3 days
```

Buttons:

```text
+ Add Stage
Edit
Remove
Move Up
Move Down
```

Warning:

> Changes apply only to this project workflow.

Button:

```text
Save Project Workflow
```

Then:

```text
Activate Project
```

Activation is irreversible from the normal prototype UI.

---

# 17. BOSS Activation

Before activation show a confirmation screen:

```text
PROJECT READY

Project:
Highway Expansion Phase 2

Parcels:
250

Workflow:
4 stages

First responsible officer:
District Document Officer

[Activate Workflow]
```

Once activated:

```text
BOSS workflow responsibility = COMPLETE
Project current_stage = FIRST_EXECUTABLE_STAGE
```

The BOSS dashboard should then move the project out of the “Pending Configuration” queue.

The BOSS should not receive ongoing task notifications.

---

# 18. Officer Dashboard

URL:

```text
/officer/dashboard
```

This is intentionally simple.

Header:

```text
My Tasks
Notifications
Documents
Profile
```

Do not show:

```text
National dashboard
All projects
Workflow builder
Project analytics
Other officers' tasks
```

## KPI cards

```text
Assigned to Me
Due Today
Overdue
Completed
```

## Task table

```text
Task
Project
Stage
Due Date
Status
Action
```

Example:

```text
Document Verification
Highway Expansion Phase 2
Stage 2
06 Sep 2026
Pending
[Open Task]
```

---

# 19. Officer Task Page

URL:

```text
/officer/tasks/:taskId
```

This should be one of the most polished pages.

Header:

```text
Document Verification
Highway Expansion Phase 2

Stage 2 of 4
```

## Project context

```text
Project
Requesting Authority
Parcel Count
Current Status
```

## Required documents

```text
Proposal Document      ✓
Land Record             ✓
Acquisition Document    ✓
Verification Form       Pending
```

## OCR area

```text
Digital Document

[View]
[Download]
```

Then:

```text
OCR-Assisted Verification

Upload / Process
```

After processing:

```text
Extracted Information

Survey Number: MH-PN-004821
Area: 2.41 acres
Village: ABC
District: Pune
Notification No: N-2026-182
Notification Date: 01 Sep 2026

Confidence:
Survey Number    97%
Area             94%
Village          99%
```

The officer can edit the extracted values.

Then:

```text
Officer Verification

[ ] I verified the extracted information.

Remarks
________________________
```

## Hard-copy evidence

```text
Upload signed/stamped hard-copy scan/photo

[Upload Image]
```

This directly demonstrates the intended human-in-the-loop AI model: OCR/Gemini produces structured information, then an authorized officer validates it before official use.

## Decision

```text
[Accept Stage]
[Reject Stage]
```

Reject requires:

```text
Rejection reason *
```

---

# 20. Rejection Flow

When the officer clicks Reject:

```text
POST /workflow/tasks/:taskId/reject
```

Backend must:

1. Validate officer owns the task.
2. Validate task is currently actionable.
3. Require a rejection reason.
4. Update workflow stage.
5. Create audit event.
6. Create notification.
7. Set project status to `REJECTED_TO_AUTHORITY`.
8. Create an action item for the requesting authority.
9. Optionally anchor important event to Fabric.

Requesting authority then sees:

```text
REJECTED — ACTION REQUIRED

Stage:
Document Verification

Reason:
Hard-copy signature could not be verified.

[Correct and Resubmit]
```

No BOSS involvement.

---

# 21. Resubmission Flow

Requesting Authority opens:

```text
/projects/:projectId/actions/:actionId
```

They can:

```text
View rejection
Replace document
Add explanation
Upload corrected document
Submit correction
```

Backend:

```text
POST /projects/:projectId/workflow-stages/:stageId/resubmit
```

Then:

```text
REJECTED_TO_AUTHORITY
        |
        v
IN_PROGRESS
        |
        v
same stage assigned again
```

This allows the process to continue without rebuilding the project workflow.

---

# 22. Approval Page

The final approval officer sees the same task-oriented page.

They can:

```text
Review summary
Review required documents
Review evidence
View OCR verified fields
View project/parcel details
Accept
Reject
```

Upon Accept:

```text
Final stage completed
        |
        v
Project status = APPROVED
        |
        +--> Audit event
        |
        +--> Fabric provenance
        |
        +--> Requesting Authority notification
        |
        +--> Dashboard update
```

---

# 23. Project Progress Page

The requesting authority should have one clear progress visualization.

```text
PROJECT PROGRESS

Workflow Progress
██████████░░░░░  60%

3 / 5 stages completed

Current Stage
Document Verification

Current Responsible Department
District Document Office

Started
03 Sep 2026

Expected Completion
12 Sep 2026
```

The exact current responsible person should only be displayed where the access policy allows it.

The system's real-time meaning is operational: an authorized update should become available to relevant dashboards without manual consolidation.

---

# 24. GIS Page

URL:

```text
/gis
```

For V1, this should be a project-level monitoring map.

Layout:

```text
Filters
------------------------------------------------
State
District
Project
Parcel Status

------------------------------------------------
|                  MAP                         |
|                                              |
|     project boundary                         |
|     parcel polygons                          |
|                                              |
------------------------------------------------

Selected Parcel
Parcel ID
Survey Number
Area
Status
Project
```

Use:

```text
Leaflet
OpenStreetMap
PostGIS
```

Do not build a full GIS editing application.

---

# 25. Parcel Detail Page

URL:

```text
/parcels/:parcelId
```

Display:

```text
Parcel Passport

Parcel ID
ULPIN
Survey Number
Village
District
State
Area
Land Type

Acquisition Status
Notification
Award
Compensation
Possession
R&R
```

Later this becomes the full Parcel Passport described in the PRD. The PRD specifically defines the parcel passport as the single lifecycle view for a parcel.

---

# 26. Documents Page

URL:

```text
/documents
```

Table:

```text
Document
Project
Type
Version
Processing Status
Verification Status
Uploaded By
Date
```

Document statuses:

```text
UPLOADED
PROCESSING
OCR_COMPLETED
AI_EXTRACTED
NEEDS_REVIEW
VERIFIED
FAILED
```

The TRD requires versioned documents, hashes, processing status, verification status, and metadata in PostgreSQL while actual files remain in object storage.

---

# 27. Document Detail Page

URL:

```text
/documents/:documentId
```

Show:

```text
Document Metadata
Current Version
Uploader
Created At
Hash

Versions
v1
v2
v3
```

Actions:

```text
View
Download
Upload New Version
Process OCR
View Extraction
View Verification
View Provenance
```

Do not overwrite previous versions.

---

# 28. OCR Architecture

The frontend must never call Gemini or Google Vision directly.

Correct:

```text
Frontend
    |
POST document
    |
Backend
    |
Create document-processing job
    |
BullMQ
    |
Worker
    |
Google Cloud Vision
    |
Extracted text
    |
Gemini API
    |
Structured JSON
    |
Backend validation
    |
Database
    |
Frontend
```

This matches the TRD's selected OCR/Gemini architecture and asynchronous processing design. 
---

# 29. OCR Data Contract

Gemini should be instructed to return controlled JSON such as:

```json
{
  "documentType": "acquisition_notice",
  "fields": {
    "surveyNumber": "",
    "ulPin": "",
    "village": "",
    "district": "",
    "state": "",
    "area": "",
    "notificationNumber": "",
    "notificationDate": ""
  },
  "confidence": {
    "surveyNumber": 0,
    "area": 0
  }
}
```

Do not allow arbitrary Gemini text to become official database data.

Pipeline:

```text
AI output
   |
schema validation
   |
business validation
   |
human verification
   |
official record
```

---

# 30. Blockchain Demonstration

Do not put business data on blockchain.

When one of these events happens:

```text
Workflow approved
Document verified
Important stage accepted
Final approval
```

create:

```text
PostgreSQL Audit Event
```

Then calculate:

```text
SHA-256(document or event payload)
```

Then submit provenance transaction:

```text
recordId
eventType
documentHash
timestamp
authority
```

to Hyperledger Fabric.

The UI should show:

```text
Audit Trail

✓ Operational audit recorded

✓ Provenance anchored

Fabric Transaction:
a8f3...

Document/Event Hash:
74f1...

Timestamp:
05 Sep 2026 14:32
```

The TRD explicitly defines:

> PostgreSQL = operational audit history  
> Hyperledger Fabric = tamper-evident provenance for important events/documents.

The actual PDF, image, personal information and application data remain off-chain.

---

# 31. Fabric Failure Rule

Never make the core transaction depend synchronously on blockchain availability.

Correct:

```text
Officer accepts
      |
      v
PostgreSQL transaction
      |
      v
Core record saved
      |
      v
Fabric job created
```

If Fabric is down:

```text
Core action = successful

Provenance = Pending
```

Then BullMQ retries.

This prevents blockchain failure from corrupting the main application, as required by the TRD.

---

# 32. WhatsApp Architecture

Use the real Meta WhatsApp Business Cloud API where credentials are available.

```text
Citizen
   |
WhatsApp
   |
Meta Cloud API
   |
Webhook
   |
Express
   |
WhatsApp Service
   |
Project/Parcel/Grievance service
```

Outgoing:

```text
Backend
   |
WhatsApp Service
   |
Meta Cloud API
   |
Citizen
```

---

# 33. WhatsApp Prototype Use Cases

Implement three interactions first.

## Status

Citizen:

```text
STATUS MH-PN-004821
```

System:

```text
Parcel MH-PN-004821

Project:
Highway Expansion Phase 2

Current Stage:
Document Verification

Status:
In Progress
```

## Objection

Citizen:

```text
I want to submit an objection.
```

System asks:

```text
Enter your parcel/project reference.
```

Then:

```text
Please send your objection.
```

System creates:

```text
Grievance / Objection #GRV-1029
```

## Document

Citizen uploads an image.

Backend links it to the grievance and stores document metadata.

This is directly aligned with the TRD's citizen interaction requirements.

---

# 34. Grievance Page

URL:

```text
/grievances
```

Only Requesting Authority needs this in the prototype.

Table:

```text
Reference
Citizen
Project
Parcel
Type
Status
Received
Action
```

Detail:

```text
GRV-1029

Project
Parcel
Citizen identifier/reference
Message
Attachments
Created At

[Mark Received]
[Respond]
[Close]
```

The citizen issue belongs to the requesting authority, not the BOSS.

---

# 35. Notifications

Use a notification abstraction:

```text
Notification Service
        |
        +--> In-App
        +--> Email
        +--> WhatsApp
```

For the basic prototype, implement:

```text
In-App
WhatsApp
```

Email can be integrated through the same interface.

Notifications should be triggered by events such as:

```text
Project submitted
Project activated
Task assigned
Stage accepted
Stage rejected
Correction required
Project approved
New citizen grievance
```

This fits the PRD/TRD alert requirements.

---

# 36. Database Design

Use PostgreSQL from the first commit.

Enable:

```sql
CREATE EXTENSION postgis;
```

Do not use separate databases for prototype modules.

Use one PostgreSQL database with clear domain tables.

---

# 37. Core Database Tables

## users

```text
id UUID PK
government_id VARCHAR UNIQUE
name VARCHAR
email VARCHAR
phone VARCHAR
role_id UUID FK
authority_id UUID FK
department_id UUID FK
administrative_level ENUM
is_active BOOLEAN
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

## roles

```text
id UUID PK
code VARCHAR UNIQUE
name VARCHAR
description TEXT
```

Seed:

```text
REQUESTING_AUTHORITY
BOSS
PROCESSING_OFFICER
ADMIN
```

Citizen is not a web-app role.

---

## permissions

```text
id UUID PK
code VARCHAR UNIQUE
name VARCHAR
description TEXT
```

---

## role_permissions

```text
role_id UUID FK
permission_id UUID FK

PRIMARY KEY(role_id, permission_id)
```

---

## authorities

```text
id UUID PK
name VARCHAR
code VARCHAR UNIQUE
level ENUM
parent_authority_id UUID NULL FK
state_id UUID NULL
district_id UUID NULL
created_at TIMESTAMP
```

---

## departments

```text
id UUID PK
name VARCHAR
code VARCHAR UNIQUE
authority_id UUID FK
```

---

# 38. projects

```text
id UUID PK
project_code VARCHAR UNIQUE
name VARCHAR
project_type VARCHAR
requesting_authority_id UUID FK
boss_id UUID NULL FK
state_id UUID FK
district_id UUID NULL FK
description TEXT
required_land_area NUMERIC
status ENUM
current_stage_id UUID NULL
workflow_progress NUMERIC
parcel_progress NUMERIC
risk_score NUMERIC
target_completion_date DATE
submitted_at TIMESTAMP
activated_at TIMESTAMP
approved_at TIMESTAMP NULL
completed_at TIMESTAMP NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

Important:

`boss_id` is historical ownership of the configuration event, not continuing workflow ownership.

---

# 39. project_members

Do not use this to override workflow responsibility.

Use it only to describe authorized project relationships.

```text
id UUID PK
project_id UUID FK
user_id UUID FK
relationship_type ENUM
created_at TIMESTAMP
```

Possible:

```text
REQUESTING_AUTHORITY
BOSS_CONFIGURER
VIEWER
```

The actual stage owner comes from workflow tasks.

---

# 40. land_parcels

```text
id UUID PK
internal_parcel_id VARCHAR UNIQUE
ulpin VARCHAR NULL
state_parcel_id VARCHAR NULL
survey_number VARCHAR
owner_name VARCHAR
village VARCHAR
taluk VARCHAR
district VARCHAR
state VARCHAR
area NUMERIC
land_type VARCHAR
geometry GEOMETRY(POLYGON, 4326)
acquisition_status ENUM
notification_status ENUM
award_status ENUM
compensation_status ENUM
possession_status ENUM
rr_status ENUM
created_at TIMESTAMP
updated_at TIMESTAMP
```

Sensitive owner data must be protected by authorization.

---

# 41. project_parcels

Use a relationship table.

```text
id UUID PK
project_id UUID FK
parcel_id UUID FK
selection_source ENUM
selected_by UUID FK
selected_at TIMESTAMP
status ENUM
created_at TIMESTAMP

UNIQUE(project_id, parcel_id)
```

`selection_source`:

```text
MOCK_LAND_RECORD
GOVERNMENT_IMPORT
MANUAL
```

This makes future government integration possible.

---

# 42. land_record_imports

This table gives us a clean integration boundary.

```text
id UUID PK
project_id UUID FK
external_system VARCHAR
request_reference VARCHAR
status ENUM
requested_by UUID FK
requested_at TIMESTAMP
completed_at TIMESTAMP NULL
raw_reference JSONB NULL
error_message TEXT NULL
```

Actual external response data should not be treated as authoritative application ownership data.

---

# 43. proposals

```text
id UUID PK
project_id UUID FK
proposal_number VARCHAR UNIQUE
submitted_by UUID FK
submitted_at TIMESTAMP
status ENUM
current_version INT
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

# 44. workflow_templates

```text
id UUID PK
code VARCHAR UNIQUE
name VARCHAR
description TEXT
version INT
status ENUM
is_system_template BOOLEAN
created_by UUID FK
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

# 45. workflow_template_stages

```text
id UUID PK
template_id UUID FK
stage_key VARCHAR
stage_name VARCHAR
stage_order INT
responsible_role VARCHAR
responsible_department_id UUID NULL
sla_days INT
required_documents JSONB
configuration JSONB
created_at TIMESTAMP
```

---

# 46. workflow_instances

```text
id UUID PK
project_id UUID FK UNIQUE
template_id UUID FK
template_version INT
status ENUM
activated_by UUID FK
activated_at TIMESTAMP
created_at TIMESTAMP
updated_at TIMESTAMP
```

This table proves that the project received a specific version of a template.

---

# 47. workflow_instance_stages

This is one of the most important tables.

```text
id UUID PK
workflow_instance_id UUID FK
stage_key VARCHAR
stage_name VARCHAR
stage_order INT
responsible_role VARCHAR
responsible_department_id UUID NULL
responsible_user_id UUID NULL
sla_days INT
planned_start_at TIMESTAMP NULL
planned_due_at TIMESTAMP NULL
started_at TIMESTAMP NULL
completed_at TIMESTAMP NULL
status ENUM
configuration JSONB
rejection_reason TEXT NULL
attempt_number INT DEFAULT 1
created_at TIMESTAMP
updated_at TIMESTAMP
```

The stage belongs to the project workflow instance, not directly to the master template.

---

# 48. workflow_tasks

```text
id UUID PK
workflow_stage_id UUID FK
assigned_to UUID FK
status ENUM
assigned_at TIMESTAMP
started_at TIMESTAMP NULL
completed_at TIMESTAMP NULL
last_action_at TIMESTAMP NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

This is what the Officer Dashboard queries.

---

# 49. documents

```text
id UUID PK
document_code VARCHAR UNIQUE
document_type VARCHAR
project_id UUID NULL FK
parcel_id UUID NULL FK
workflow_stage_id UUID NULL FK
uploaded_by UUID FK
storage_key VARCHAR
mime_type VARCHAR
file_size BIGINT
current_version INT
document_hash VARCHAR
processing_status ENUM
verification_status ENUM
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

# 50. document_versions

```text
id UUID PK
document_id UUID FK
version_number INT
storage_key VARCHAR
hash VARCHAR
uploaded_by UUID FK
uploaded_at TIMESTAMP
ocr_status ENUM
extraction_status ENUM
verification_status ENUM
created_at TIMESTAMP

UNIQUE(document_id, version_number)
```

Never update an old version's file.

---

# 51. document_processing_jobs

```text
id UUID PK
document_id UUID FK
document_version_id UUID FK
job_type ENUM
status ENUM
attempt_count INT
error_message TEXT NULL
queued_at TIMESTAMP
started_at TIMESTAMP NULL
completed_at TIMESTAMP NULL
result_reference JSONB NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

# 52. ai_extractions

```text
id UUID PK
document_version_id UUID FK
model_provider VARCHAR
model_name VARCHAR
raw_text_reference TEXT NULL
structured_output JSONB
confidence JSONB
schema_version VARCHAR
status ENUM
reviewed_by UUID NULL FK
reviewed_at TIMESTAMP NULL
corrections JSONB NULL
created_at TIMESTAMP
```

The AI result remains a draft until human verification.

---

# 53. stage_evidence

Because officers may provide both digital and physical evidence:

```text
id UUID PK
workflow_stage_id UUID FK
document_id UUID FK
evidence_type ENUM
description TEXT
uploaded_by UUID FK
created_at TIMESTAMP
```

`evidence_type`:

```text
DIGITAL_DOCUMENT
HARD_COPY_SCAN
PHOTO
OCR_OUTPUT
OTHER
```

---

# 54. audit_events

```text
id UUID PK
event_id UUID UNIQUE
actor_user_id UUID NULL FK
actor_role VARCHAR
action VARCHAR
entity_type VARCHAR
entity_id UUID
project_id UUID NULL FK
parcel_id UUID NULL FK
old_value JSONB NULL
new_value JSONB NULL
metadata JSONB
source VARCHAR
ip_address VARCHAR NULL
created_at TIMESTAMP
```

This follows the PRD's requirement to record what changed, old value, new value, user, role, time, related record, and source.

---

# 55. provenance_records

```text
id UUID PK
audit_event_id UUID FK
document_id UUID NULL FK
hash VARCHAR
fabric_network VARCHAR
fabric_channel VARCHAR
fabric_transaction_id VARCHAR NULL
status ENUM
submitted_at TIMESTAMP
confirmed_at TIMESTAMP NULL
error_message TEXT NULL
```

---

# 56. grievances

```text
id UUID PK
reference_number VARCHAR UNIQUE
project_id UUID NULL FK
parcel_id UUID NULL FK
citizen_phone_hash VARCHAR
citizen_reference VARCHAR NULL
type ENUM
message TEXT
status ENUM
assigned_to UUID NULL FK
created_at TIMESTAMP
updated_at TIMESTAMP
resolved_at TIMESTAMP NULL
```

Never store more citizen information than actually required.

---

# 57. grievance_documents

```text
id UUID PK
grievance_id UUID FK
document_id UUID FK
created_at TIMESTAMP
```

---

# 58. notifications

```text
id UUID PK
user_id UUID FK
project_id UUID NULL FK
type VARCHAR
title VARCHAR
message TEXT
channel ENUM
status ENUM
read_at TIMESTAMP NULL
sent_at TIMESTAMP NULL
created_at TIMESTAMP
```

---

# 59. risk_assessments

Even though sophisticated risk is later, create the table now.

```text
id UUID PK
project_id UUID NULL FK
parcel_id UUID NULL FK
score NUMERIC
risk_level ENUM
factors JSONB
calculated_at TIMESTAMP
version VARCHAR
```

For Prototype V1 the calculation can be basic:

```text
Rejected stage       +20
Overdue stage        +20
Missing document     +15
Pending grievance    +10
```

Risk scoring is intended to be measurable and explainable rather than an opaque predictive AI model.

---

# 60. External Integration References

```text
id UUID PK
project_id UUID NULL FK
parcel_id UUID NULL FK
document_id UUID NULL FK
system_name VARCHAR
external_record_id VARCHAR
reference_type VARCHAR
direction ENUM
status ENUM
metadata JSONB
last_synced_at TIMESTAMP NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

This prepares the application for real government APIs later.

---

# 61. Database Relationship Summary

```text
USER
 |
 +---- ROLE
 |
 +---- AUTHORITY
 |
 +---- DEPARTMENT


PROJECT
 |
 +---- REQUESTING AUTHORITY
 |
 +---- PROPOSAL
 |
 +---- PROJECT PARCELS -------- LAND PARCEL
 |
 +---- DOCUMENTS
 |
 +---- WORKFLOW INSTANCE
 |          |
 |          +---- WORKFLOW STAGES
 |                       |
 |                       +---- TASK
 |
 +---- GRIEVANCES
 |
 +---- NOTIFICATIONS
 |
 +---- RISK ASSESSMENTS
 |
 +---- AUDIT EVENTS
              |
              +---- PROVENANCE RECORD


DOCUMENT
 |
 +---- DOCUMENT VERSIONS
 |
 +---- AI EXTRACTIONS
 |
 +---- PROCESSING JOBS
```

This implements the project + parcel hybrid model required by the TRD.

---

# 62. REST API Convention

Base:

```text
/api/v1
```

Return:

```json
{
  "data": {},
  "message": "Success",
  "requestId": "..."
}
```

Errors:

```json
{
  "error": {
    "code": "WORKFLOW_STAGE_NOT_ACTIONABLE",
    "message": "This stage cannot be completed by the current user."
  },
  "requestId": "..."
}
```

Never return raw database errors.

---

# 63. Authentication APIs

```http
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/me
POST /api/v1/auth/refresh
```

Prototype login can use seeded government users.

---

# 64. Requesting Authority APIs

## Dashboard

```http
GET /api/v1/dashboard/requesting-authority
GET /api/v1/projects?mine=true
```

## Create project

```http
POST /api/v1/projects
GET  /api/v1/projects/:projectId
PATCH /api/v1/projects/:projectId
POST /api/v1/projects/:projectId/submit
```

## Documents

```http
POST /api/v1/projects/:projectId/documents
GET  /api/v1/projects/:projectId/documents
```

## Corrections

```http
GET  /api/v1/projects/:projectId/actions
POST /api/v1/projects/:projectId/workflow-stages/:stageId/resubmit
```

---

# 65. BOSS APIs

## Dashboard

```http
GET /api/v1/boss/dashboard
GET /api/v1/boss/requests
```

## Project review

```http
GET /api/v1/boss/projects/:projectId
```

## Land records

```http
POST /api/v1/boss/projects/:projectId/land-records/fetch
GET  /api/v1/boss/projects/:projectId/land-records
POST /api/v1/boss/projects/:projectId/parcels/confirm
```

## Workflow

```http
GET  /api/v1/workflow-templates
GET  /api/v1/workflow-templates/:templateId
POST /api/v1/projects/:projectId/workflow/initialize
PUT  /api/v1/projects/:projectId/workflow
POST /api/v1/projects/:projectId/workflow/activate
```

Only BOSS/admin permissions can call the project workflow modification endpoints.

---

# 66. Officer APIs

## Dashboard

```http
GET /api/v1/officer/dashboard
GET /api/v1/tasks?assignedTo=me
```

## Task

```http
GET  /api/v1/tasks/:taskId
POST /api/v1/tasks/:taskId/start
POST /api/v1/tasks/:taskId/accept
POST /api/v1/tasks/:taskId/reject
```

Reject body:

```json
{
  "reason": "Hard-copy signature is missing."
}
```

The backend must verify that the logged-in officer owns the task.

---

# 67. Document APIs

```http
POST /api/v1/documents/upload
GET  /api/v1/documents/:documentId
GET  /api/v1/documents/:documentId/versions
POST /api/v1/documents/:documentId/versions
GET  /api/v1/documents/:documentId/download
POST /api/v1/documents/:documentId/process
GET  /api/v1/documents/:documentId/processing
GET  /api/v1/documents/:documentId/extraction
POST /api/v1/documents/:documentId/verify
```

The `/process` endpoint should normally be called automatically by the upload service rather than requiring the user to click a processing button.

---

# 68. Workflow APIs

```http
GET /api/v1/workflow-templates
GET /api/v1/workflow-templates/:templateId

GET /api/v1/projects/:projectId/workflow
GET /api/v1/projects/:projectId/workflow/stages

PUT /api/v1/projects/:projectId/workflow/stages/:stageId
POST /api/v1/projects/:projectId/workflow/stages
DELETE /api/v1/projects/:projectId/workflow/stages/:stageId

POST /api/v1/projects/:projectId/workflow/activate
```

The backend enforces BOSS permissions.

---

# 69. GIS APIs

```http
GET /api/v1/gis/projects
GET /api/v1/gis/projects/:projectId
GET /api/v1/projects/:projectId/parcels
GET /api/v1/parcels/:parcelId
GET /api/v1/parcels/:parcelId/geometry
```

Where appropriate, return GeoJSON.

Example:

```json
{
  "type": "Feature",
  "geometry": {},
  "properties": {
    "parcelId": "MH-PN-004821",
    "status": "ACQUIRED"
  }
}
```

---

# 70. Grievance APIs

```http
GET  /api/v1/grievances
GET  /api/v1/grievances/:grievanceId
POST /api/v1/grievances/:grievanceId/respond
POST /api/v1/grievances/:grievanceId/close
```

WhatsApp-created grievances use the same database service.

Do not create a separate WhatsApp-only grievance database.

---

# 71. WhatsApp APIs

Internal APIs:

```http
POST /api/v1/integrations/whatsapp/webhook
POST /api/v1/integrations/whatsapp/send
GET  /api/v1/integrations/whatsapp/status
```

The public Meta webhook should be protected using the required verification/signature mechanisms.

---

# 72. Integration APIs

Government land-record adapter:

```http
POST /api/v1/integrations/land-records/search
GET  /api/v1/integrations/land-records/requests/:requestId
```

Later the internal adapter can become:

```text
LandRecordsProvider
    |
    +--> MockLandRecordsProvider
    |
    +--> GovernmentLandRecordsProvider
```

The rest of the backend should not know which provider is active.

---

# 73. Audit APIs

```http
GET /api/v1/audit/projects/:projectId
GET /api/v1/audit/documents/:documentId
GET /api/v1/audit/events/:eventId
GET /api/v1/audit/provenance/:eventId
```

Only authorized roles can access audit information.

---

# 74. Risk APIs

```http
GET /api/v1/projects/:projectId/risk
GET /api/v1/parcels/:parcelId/risk
POST /api/v1/projects/:projectId/risk/recalculate
```

Risk recalculation can initially happen synchronously for simple rule logic.

Later it can become a scheduled/background job.

---

# 75. Reports APIs

Keep the first implementation small but create the route structure:

```http
GET /api/v1/reports/projects
GET /api/v1/reports/progress
GET /api/v1/reports/risk
GET /api/v1/reports/audit
```

Later:

```text
National
State
District
Project
Compensation
Possession
R&R
```

The PRD already requires project/state/district/MIS reporting.

---

# 76. Backend Project Structure

Do NOT create microservices.

Use one modular Express application:

```text
backend/
  src/
    config/
    middleware/
    modules/

      auth/
      users/
      authorities/

      projects/
      parcels/
      proposals/

      workflows/
      workflow-templates/
      workflow-tasks/

      documents/
      ai-processing/

      gis/
      compensation/
      possession/
      rr/

      grievances/
      notifications/

      risks/
      reports/

      integrations/
        land-records/
        whatsapp/

      audit/
      provenance/

    jobs/
      ocr.worker.ts
      notification.worker.ts
      provenance.worker.ts

    database/
      migrations/
      seeds/

    app.ts
    server.ts
```

This follows the TRD's recommendation to keep the application modular without unnecessarily splitting it into microservices.

---

# 77. Frontend Project Structure

```text
frontend/
  src/
    app/
    routes/

    layouts/
      PublicLayout
      GovernmentLayout

    pages/
      public/
      auth/
      requestingAuthority/
      boss/
      officer/
      gis/
      documents/
      grievances/

    components/
      common/
      tables/
      forms/
      workflow/
      documents/
      gis/
      dashboard/
      notifications/

    services/
      api/

    hooks/
    schemas/
    types/
    utils/
```

Use:

```text
TanStack Query
React Hook Form
Zod
```

as locked by the TRD.

---

# 78. Part I — Basic Prototype Implementation

This is the first build milestone.

Do not attempt national analytics or the entire acquisition lifecycle here.

## Phase 1 — Foundation

Build:

```text
Repository
Frontend
Backend
PostgreSQL
PostGIS
Docker environment
Environment configuration
Migration system
Seed system
Authentication middleware
RBAC middleware
```

Deliverable:

```text
User can sign in.
```

---

# 79. Phase 2 — User and Role System

Seed four demo users:

```text
requestor@gov.demo
boss@gov.demo
officer@gov.demo
admin@gov.demo
```

Assign:

```text
REQUESTING_AUTHORITY
BOSS
PROCESSING_OFFICER
ADMIN
```

Create a role-switching test environment only for development; don't implement fake permissions on the frontend.

Backend remains authoritative.

Deliverable:

```text
Login
Correct dashboard
Correct route permissions
Correct API authorization
```

---

# 80. Phase 3 — Project Request

Build:

```text
Requesting Authority Dashboard
Create Project
Project Detail
Project List
```

Implement:

```text
Create
Save
Upload initial document
Submit
```

Deliverable:

```text
Requesting Authority creates a real PostgreSQL project.
```

---

# 81. Phase 4 — BOSS Parcel Determination

Implement mock government land-record service.

Flow:

```text
Project submitted
        |
        v
BOSS opens request
        |
        v
Fetch Land Records
        |
        v
Candidate parcels returned
        |
        v
BOSS selects parcels
        |
        v
Confirm
```

Use sample realistic polygons in PostGIS.

Deliverable:

```text
Project
    |
    +---- 5/10/20 sample parcels
```

visible in GIS and database.

---

# 82. Phase 5 — Workflow Template

Seed one master template:

```text
Land Acquisition - Prototype
```

Suggested stages:

```text
1. Parcel Verification
2. Document Verification
3. Departmental Scrutiny
4. Final Approval
```

The BOSS:

```text
selects template
      |
      v
edits stages if required
      |
      v
activates workflow
```

Deliverable:

```text
Project-specific workflow instance exists in PostgreSQL.
```

---

# 83. Phase 6 — Automatic Task Routing

On activation:

```text
Stage 1
    |
    v
Create workflow task
    |
    v
Assigned officer
```

When accepted:

```text
Stage 1 complete
    |
    v
Stage 2 becomes active
    |
    v
Task assigned to next officer
```

When rejected:

```text
Stage rejected
    |
    v
Requesting Authority action
```

No manual forwarding buttons.

The backend performs routing based on the configured workflow.

---

# 84. Phase 7 — Officer Task UI

Build:

```text
Officer Dashboard
Task Detail
Document viewer
Evidence uploader
Accept
Reject
```

The officer must be able to finish a task without seeing the complete management interface.

Deliverable:

```text
Officer can actually move a project one step forward.
```

---

# 85. Phase 8 — OCR

Add:

```text
Google Cloud Vision
Gemini API
Redis
BullMQ
```

Flow:

```text
Officer uploads document
       |
       v
Document saved
       |
       v
Processing Job
       |
       v
OCR
       |
       v
Gemini structured extraction
       |
       v
Validation
       |
       v
Officer review
```

No local LLM.

This is exactly the locked AI direction in the TRD.

Deliverable:

```text
Upload document
→ extracted fields appear
→ officer edits/confirms
→ verified extraction saved
```

---

# 86. Phase 9 — Hard Copy Evidence

Officer uploads:

```text
1. Digital source document
2. Hard-copy photo/scan
```

Create separate document versions/types or stage evidence records.

Show:

```text
Digital Document
OCR Result
Hard Copy Evidence
Officer Verification
```

This makes the AI feature meaningful in the actual workflow.

---

# 87. Phase 10 — Audit

Every important action must create an audit event.

Examples:

```text
PROJECT_SUBMITTED
PARCELS_CONFIRMED
WORKFLOW_ACTIVATED
TASK_ASSIGNED
DOCUMENT_UPLOADED
OCR_COMPLETED
DOCUMENT_VERIFIED
STAGE_ACCEPTED
STAGE_REJECTED
STAGE_RESUBMITTED
PROJECT_APPROVED
```

This follows the PRD's audit requirement.

---

# 88. Phase 11 — Hyperledger Fabric

For the first blockchain demonstration, do not anchor every database mutation.

Anchor only:

```text
WORKFLOW_ACTIVATED
DOCUMENT_VERIFIED
STAGE_ACCEPTED
PROJECT_APPROVED
```

Recommended first demonstration:

```text
Officer clicks Accept
        |
        v
PostgreSQL audit
        |
        v
Generate event hash
        |
        v
BullMQ provenance job
        |
        v
Hyperledger Fabric
        |
        v
Store transaction ID
```

Deliverable:

```text
Audit page

Database Audit       ✓
Fabric Provenance    ✓
Transaction ID       ...
Hash                 ...
```

---

# 89. Phase 12 — WhatsApp

Implement webhook first.

Then implement:

```text
STATUS
```

Then:

```text
OBJECTION
```

Then:

```text
DOCUMENT
```

The goal is to make one real message successfully enter the backend and produce a real record.

Deliverable:

```text
WhatsApp
   ↓
backend
   ↓
project/parcel lookup
   ↓
response
```

and:

```text
WhatsApp objection
   ↓
grievance record
   ↓
Requesting Authority dashboard
```

---

# 90. Phase 13 — Approval

Complete:

```text
Officer
   |
   v
Final Approval Task
   |
   v
Accept
   |
   +--> Project APPROVED
   +--> Audit
   +--> Fabric provenance
   +--> Notification
   +--> Requesting Authority dashboard
```

Deliverable:

> One complete acquisition request has successfully moved from creation to approval.

---

# 91. Prototype Definition of Done

Prototype V1 is finished only when the following works without manually editing the database:

```text
✓ Sign in
✓ Correct role dashboard
✓ Requesting authority creates project
✓ Project submitted to BOSS
✓ BOSS receives request
✓ BOSS fetches sample land records
✓ BOSS confirms parcels
✓ Parcels appear on GIS
✓ BOSS selects workflow template
✓ BOSS modifies project workflow
✓ BOSS activates workflow
✓ BOSS leaves workflow
✓ Correct officer receives first task
✓ Officer views task
✓ Officer uploads digital document
✓ OCR runs
✓ Gemini extracts structured data
✓ Officer verifies data
✓ Officer uploads hard-copy evidence
✓ Officer accepts
✓ Next officer receives task
✓ Officer can reject
✓ Requesting authority sees rejection
✓ Requesting authority can correct/resubmit
✓ Final officer approves
✓ Project becomes approved
✓ Dashboard updates
✓ Audit event exists
✓ Fabric provenance exists
✓ Citizen can send WhatsApp status request
✓ Citizen can send objection
✓ Objection appears for requesting authority
```

That is the **real first milestone**.

---

# 92. Part II — Full System After Prototype

Once the prototype is stable, do not rewrite it.

Expand each existing module.

---

# 93. Identity Expansion

Replace/mock identity adapter:

```text
MockGovernmentIdentityProvider
```

with:

```text
ActualGovernmentIdentityProvider
```

while keeping:

```text
AuthenticationService
RBACService
```

unchanged.

Add:

```text
Central Authority
State Authority
District Authority
Project Agency
Field Officer
Administrator
```

The TRD already specifies role, administrative-level, project-assignment, action-level and sensitivity-level access checks.

---

# 94. Workflow Expansion

Keep the project workflow-instance model.

Add:

```text
National Workflow Templates
State Templates
Department Templates
Effective Dates
Versioning
SLA Rules
Dependencies
Required Documents
Required Actions
Notification Rules
Validation Rules
```

Workflow hierarchy:

```text
National Framework
      |
Central Authority
      |
State Workflow
      |
Department Workflow
      |
District Execution
```

This comes directly from the TRD's governed workflow structure.

---

# 95. Complete Acquisition Lifecycle

After the initial approval workflow is stable, add:

```text
Notification
     ↓
Award
     ↓
Compensation Assessment
     ↓
Compensation Approval
     ↓
Compensation Payment
     ↓
Possession
     ↓
R&R
     ↓
Acquisition Complete
```

The PRD defines this as the end-to-end lifecycle.

---

# 96. Compensation Module

Add:

```text
compensation_records
```

with:

```text
id
project_id
parcel_id
affected_person_id
assessed_amount
approved_amount
paid_amount
outstanding_amount
payment_reference
payment_status
payment_date
created_at
updated_at
```

The system tracks compensation.

It does not become a complete payment engine.

This is explicitly required by the TRD.

---

# 97. Affected Families

Add:

```text
affected_families
displaced_families
rr_records
rr_milestones
```

Track:

```text
Eligibility
Status
Benefits
Due Dates
Completion
Supporting Documents
```

The system should be able to show:

> Acquisition complete but R&R incomplete.

---

# 98. Possession

Add:

```text
possession_records
```

with:

```text
parcel_id
status
possession_date
evidence_document_id
remarks
verified_by
```

Statuses:

```text
NOT_STARTED
READY
PENDING
PARTIALLY_COMPLETED
COMPLETED
```

---

# 99. Risk Engine

Start from the prototype rule engine.

Expand inputs:

```text
Overdue stages
Approval delays
Missing documents
Compensation delays
Possession delays
R&R delays
Objections
Grievances
Verification failures
```

Return:

```text
score
risk_level
factors[]
```

Never return only:

```text
HIGH
```

Always return reasons.

The TRD explicitly requires explainable risk scoring.

---

# 100. Delay Prediction

Only after enough historical data exists.

Architecture:

```text
Operational database
       |
       v
Analytics data preparation
       |
       v
Feature generation
       |
       v
Statistical / ML model
       |
       v
Expected delay
Confidence
Factors
```

Do not introduce an LLM.

This is consistent with the project's decision that predictive analytics is not part of the core prototype and that risk can be rule-based initially.

---

# 101. Anomaly Detection

Later detect:

```text
duplicate beneficiary
duplicate payment reference
unusual compensation amount
unusual total changes
data mismatch
```

Output:

```text
Possible Anomaly

Reason
Severity
Records involved
```

Never label a record:

> Fraud

automatically.

The PRD specifically defines these as possible anomalies requiring human review.

---

# 102. National Dashboard

Build after project workflow is stable.

URL:

```text
/national-dashboard
```

Cards:

```text
Total Projects
Land Proposed
Land Acquired
Compensation Assessed
Compensation Paid
Affected Families
Displaced Families
R&R Progress
Possession Progress
High-Risk Projects
```

Filters:

```text
State
District
Project
Project Type
Acquisition Status
Date
```

These are directly specified in the PRD.

---

# 103. State Dashboard

URL:

```text
/state-dashboard
```

Compare:

```text
Projects
Districts
Progress
Compensation
Delays
R&R
Risk
```

---

# 104. District Dashboard

URL:

```text
/district-dashboard
```

Show:

```text
Incoming tasks
Pending actions
Projects
Parcel verification
Compensation
Grievances
Delays
Risk
```

---

# 105. Executive Reporting

Add exportable:

```text
Project Report
State Report
District Delay Report
Compensation Report
Possession Report
R&R Report
Pending Approval Report
Notification Report
Risk Report
Audit Report
```

---

# 106. Government Integration Expansion

Keep the adapter pattern.

```text
Integration Gateway
      |
      +---- Land Records
      +---- ULPIN
      +---- Cadastral
      +---- PM Gati Shakti
      +---- Identity
      +---- Payment
      +---- Notifications
```

Each integration gets:

```text
adapter
authentication
request validation
response validation
retry
logging
rate limiting
write-back controls
```

The TRD explicitly requires an isolated integration layer and controlled write-back.

---

# 107. Real Government Land-Record Integration

The prototype's:

```text
MockLandRecordsProvider
```

is replaced or supplemented by:

```text
GovernmentLandRecordsProvider
```

The BOSS flow remains:

```text
Fetch candidate records
      |
      v
Review
      |
      v
Confirm affected parcels
```

Later, the system may calculate candidates using spatial intersection:

```text
Project corridor
       |
       v
Cadastral geometries
       |
       v
Spatial intersection
       |
       v
Candidate parcels
       |
       v
Officer confirmation
```

This is where automated parcel identification can eventually be introduced without making AI responsible for legal ownership decisions.

---

# 108. GIS Expansion

Prototype:

```text
Project + parcel visualization
```

Later add:

```text
Project Boundary
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

The PRD specifically identifies these GIS layers.

---

# 109. Parcel Passport Expansion

Turn:

```text
/parcels/:parcelId
```

into the permanent lifecycle record.

Show:

```text
Parcel Identity
Location
Ownership reference
Project
Notification
Award
Compensation
Possession
R&R
Documents
Workflow history
Risk
Audit
Provenance
QR
```

QR must resolve only to an authorized public/safe view.

Sensitive information must remain protected.

---

# 110. Blockchain Expansion

Prototype:

```text
Small Fabric development network
```

Later:

```text
Central Organization
       |
State Organization
       |
District Organization
```

Anchor:

```text
Important workflow events
Important document versions
Approval events
Compensation events
Possession events
R&R completion
```

Keep:

```text
Actual documents
Personal information
Application records
Operational data
```

off-chain.

This exactly matches the TRD's intended Fabric architecture.

---

# 111. WhatsApp Expansion

Prototype:

```text
Status
Objection
Document
```

Later:

```text
Compensation status
Notification updates
Appointment information
Grievance tracking
Acknowledgements
Project notices
Document requests
```

The citizen should still not need a government web account.

---

# 112. Security Expansion

From the first prototype:

```text
Server-side authorization
Input validation
File validation
Session protection
Secure secrets
Audit logging
```

Later:

```text
Government identity federation
Fine-grained permissions
Encryption
Malware scanning
API gateway controls
Rate limiting
Security monitoring
Backup
Recovery
```

The TRD treats security as a core requirement, not a production-only addition.

---

# 113. Data Protection Rule

Sensitive fields must never be returned simply because they exist in PostgreSQL.

Every API should answer:

```text
Who is requesting?
What role?
What administrative scope?
What project?
What action?
What sensitivity level?
```

before returning sensitive data.

---

# 114. Real-Time Strategy

Do not introduce WebSockets initially.

Use:

```text
TanStack Query
REST
refetch
invalidateQueries
```

The TRD explicitly says WebSockets are not required.

For the prototype, this is sufficient.

---

# 115. Background Jobs

Use BullMQ for:

```text
OCR
Gemini
Document processing
Notifications
WhatsApp sending
Fabric provenance
Retryable integrations
Risk recalculation
Report generation
```

Statuses:

```text
QUEUED
PROCESSING
COMPLETED
NEEDS_REVIEW
FAILED
RETRY_AVAILABLE
```

The external service must never block the core record unnecessarily.

---

# 116. Recommended Build Order

The actual development order should be:

```text
1. Repository + Docker
2. PostgreSQL/PostGIS
3. Database migrations
4. Seed users/roles
5. Authentication
6. RBAC middleware
7. Government shell/layout
8. Requesting Authority dashboard
9. Project creation
10. Project submission
11. BOSS dashboard
12. Mock land-record provider
13. Parcel selection
14. PostGIS/Leaflet
15. Workflow template
16. Workflow instance
17. Workflow task routing
18. Officer dashboard
19. Officer task page
20. Accept/reject
21. Rejection/resubmission
22. Object storage
23. OCR
24. Gemini extraction
25. Human verification
26. Audit service
27. Fabric provenance
28. WhatsApp webhook
29. WhatsApp status query
30. WhatsApp grievance
31. Final approval
32. End-to-end testing
33. Demo dataset
34. Deployment
```

Do **not** build national dashboards before the complete project flow works.

The PRD itself recommends adding advanced features only after the core workflow is stable.

---

# 117. Development Rule: API Before UI Logic

For each feature:

```text
Database model
      ↓
Repository/service
      ↓
REST endpoint
      ↓
Permission checks
      ↓
Validation
      ↓
Frontend API hook
      ↓
Page
```

Do not put business rules such as:

```text
"when accepted, move to next stage"
```

inside React.

That belongs in the backend workflow service.

---

# 118. Development Rule: One Source of Truth for Status

The database owns:

```text
project.status
workflow_stage.status
task.status
document.status
```

Frontend only displays those values.

Never derive official workflow status independently in multiple React components.

---

# 119. Development Rule: Events

Create a central application event system internally:

```text
ProjectSubmitted
ProjectActivated
TaskAssigned
DocumentUploaded
DocumentVerified
StageAccepted
StageRejected
StageResubmitted
ProjectApproved
GrievanceCreated
```

Consumers can later be:

```text
Audit
Notification
Fabric
Analytics
Risk
```

This keeps future expansion easy.

---

# 120. Prototype-to-Production Boundary

At the end of Prototype V1, these must already be real:

```text
PostgreSQL entities
REST APIs
RBAC
Workflow instances
Workflow tasks
Document versions
OCR processing
AI extraction records
Audit events
Fabric provenance records
WhatsApp integration
GIS geometry
Project/parcel relationship
```

These may still be mocked:

```text
Government identity
Government land-record API
ULPIN API
PM Gati Shakti
Payment system
National dataset
Production Fabric organizations
```

The TRD explicitly identifies these integrations as suitable for mocking/simulation during the hackathon.

---

# 121. Things We Must Not Do

Do not:

```text
❌ Build fake static dashboards
❌ Store workflow state only in React
❌ Hard-code officer routing into frontend
❌ Make BOSS responsible for every later step
❌ Allow officers to modify workflows
❌ Put documents on blockchain
❌ Put personal data on blockchain
❌ Let Gemini directly write official records
❌ Build an AI system to decide legal ownership
❌ Build AI cadastral ownership decisions for V1
❌ Create a citizen web portal
❌ Create microservices unnecessarily
❌ Replace PostgreSQL with blockchain
❌ Build national analytics before the core workflow works
❌ Create separate fake databases for integrations
```

These boundaries are consistent with both the PRD and TRD, particularly their explicit exclusions around local LLMs, autonomous legal decisions, ownership registries, blockchain-as-database, and public sensitive information.

---

# 122. The Final Prototype Demo Script

The strongest demo sequence should be exactly:

```text
1. Open public landing page

2. Sign in as Requesting Authority

3. Create:
   "Highway Expansion Phase 2"

4. Upload initial proposal

5. Submit

6. Show:
   "Submitted to Higher-Level Authority"

7. Switch to BOSS

8. Open pending request

9. Click:
   "Fetch Land Records"

10. Show candidate parcels

11. Select 250 parcels

12. Show them on GIS map

13. Select:
   "Land Acquisition - Prototype"

14. Modify one workflow stage

15. Assign officers

16. Activate

17. Show:
   "Workflow Activated"
   
18. Show BOSS dashboard:
   Project has left BOSS queue

19. Switch to Officer

20. Officer sees:
   "Document Verification - Assigned to Me"

21. Open task

22. View digital document

23. Run OCR processing

24. Show extracted:
   Survey number
   Village
   Area
   Notification number

25. Officer verifies extraction

26. Upload signed hard-copy image

27. Click Accept

28. Show:
   Audit event created

29. Show:
   Fabric provenance recorded

30. Switch to Requesting Authority

31. Dashboard now shows:
   Stage 2 complete

32. Switch to next officer

33. Reject a task

34. Switch back to Requesting Authority

35. Show:
   "Action Required"
   with rejection reason

36. Correct/resubmit

37. Next officer accepts

38. Final officer approves

39. Project status:
   APPROVED

40. Show complete project timeline

41. Open WhatsApp

42. Citizen sends status request

43. System responds

44. Citizen submits objection

45. Government dashboard receives grievance

46. End with:
   Project + parcels + workflow + AI + GIS + audit + blockchain + citizen communication
```

This is substantially stronger than presenting separate technology demos because every technology is participating in the same business process.

---

# 123. Final Architecture

```text
                         PUBLIC USER
                             |
                             v
                       Landing Page
                             |
                             v
                         Sign In
                             |
                             v
                    Government Web App
                             |
            +----------------+----------------+
            |                |                |
            v                v                v
       Requesting          BOSS            Officer
       Authority        Configuration       Tasks
            |                |                |
            +----------------+----------------+
                             |
                             v
                      REST API / Express
                             |
      +----------------------+-----------------------+
      |          |            |          |           |
      v          v            v          v           v
  Projects    Workflow     Documents   GIS       Grievances
      |          |            |          |           |
      +----------+------------+----------+-----------+
                             |
                             v
                     PostgreSQL + PostGIS
                             |
             +---------------+----------------+
             |               |                |
             v               v                v
        Redis/BullMQ     Object Storage    Audit Log
             |
       +-----+----------+
       |                |
       v                v
   Google Vision      Gemini
       |                |
       +-------+--------+
               |
               v
        Verified AI Data
               
Audit Event
    |
    v
Hyperledger Fabric
    |
    v
Provenance Record


Citizen
   |
WhatsApp
   |
Meta Cloud API
   |
WhatsApp Webhook
   |
Express Backend
   |
Grievance / Status / Document
```

The final system remains aligned with the TRD's architecture: government web application and WhatsApp citizen channel converge on the backend; operational data lives in PostgreSQL/PostGIS; background work runs through Redis/BullMQ; external systems are isolated through integration services; and Fabric provides provenance.

---

# 124. Non-Negotiable Architectural Decisions

These are locked for implementation:

```text
Frontend:
React + TypeScript + Vite

State/Data:
TanStack Query

Forms:
React Hook Form + Zod

Backend:
Node.js + TypeScript + Express

API:
REST

Database:
PostgreSQL + PostGIS

GIS:
Leaflet + OpenStreetMap

Files:
Object Storage

OCR:
Google Cloud Vision

NLP:
Gemini API

Background Jobs:
Redis + BullMQ

Blockchain:
Hyperledger Fabric

Audit:
PostgreSQL + Fabric provenance

Authentication:
Government Identity Adapter + RBAC

Citizen Channel:
Meta WhatsApp Business Cloud API

Workflow:
Governed configurable workflow instances

Architecture:
Modular monolith, not unnecessary microservices

Local LLM:
NONE
```

These match the locked technical decisions in the TRD.

---

# 125. The Most Important Design Decision

The system should be thought of as three separate responsibilities:

```text
REQUESTING AUTHORITY
"Please acquire this land/project."

        ↓

BOSS
"I determine the land parcels and establish how this request will move."

        ↓

WORKFLOW PIPELINE
"Each responsible officer performs one assigned step."

        ↓

REQUESTING AUTHORITY
"I monitor the project, fix rejected items and handle citizen issues."
```

The BOSS **does not remain in the loop**.

That gives the prototype a very clean governance story:

> **Initiate → Configure → Execute → Track → Resolve → Approve**

The underlying technology remains capable of supporting the broader national, multi-level workflow described in the PRD/TRD. 