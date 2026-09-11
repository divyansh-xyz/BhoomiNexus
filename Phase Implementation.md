# Phase Implementation V2
## National Land Acquisition & Management System
### Prototype V2 — Feature-Centric Build Plan

---

# 1. Purpose

This document is the practical execution sequence for Prototype V2.

It is intentionally different from the V1 phase plan:

- V1 completed the initial project/request workflow.
- V2 rebuilds the workflow process around the new graph/cohort model.
- Existing V1 capabilities are reused.
- V2 scope is deliberately small enough for a convincing demo.
- Later enterprise capabilities remain deferred.

The phases below are ordered so that each phase leaves the system in a testable state.

---

# 2. V2 Build Strategy

```text
Phase 0   Baseline / Freeze V1
Phase 1   V2 Database Foundation
Phase 2   V2 Roles and Scope
Phase 3   Seed Hierarchy
Phase 4   Workflow Graph Core
Phase 5   Workflow Builder UI
Phase 6   Cohort / Parcel Assignment
Phase 7   Templates
Phase 8   Workflow Validation + Activation
Phase 9   Runtime Execution Engine
Phase 10  Acquisition Execution
Phase 11  Compensation
Phase 12  Possession
Phase 13  V2 Notifications / Audit Integration
Phase 14  Advanced GIS
Phase 15  National / State / District Dashboards
Phase 16  Parcel Passport
Phase 17  Cross-Module Integration
Phase 18  Demo Hardening / Acceptance
```

The existing V1 document/OCR/Gemini implementation is reused throughout these phases.

---

# 3. Phase 0 — V1 Baseline Freeze and V2 Branching

## Objective

Protect the completed V1 foundation before altering the workflow engine.

## Backend

Inventory:

```text
auth
projects
parcels
documents
workflow
tasks
notifications
grievances
audit
provenance
gis
land-record adapter
```

Identify:

- V1 workflow-only code
- shared services
- shared tables
- shared components
- routes that must remain operational

## Frontend

Identify:

```text
reusable project pages
reusable document pages
reusable task UI
reusable map components
reusable notification UI
reusable shell/layout
```

Mark obsolete:

```text
V1 linear workflow builder
V1 stage reorder assumptions
V1 stage-only routing logic
```

## Acceptance

- V1 branch/tag can be run.
- V2 work starts from the V1 repository, not a new application.
- Existing Requesting Authority flow remains testable.

---

# 4. Phase 1 — V2 Database Foundation

## Objective

Create the schema required by the new workflow model without destroying V1 data.

## Database Migrations

Create forward migrations for:

```text
workflow_nodes
workflow_edges
workflow_node_parcels
workflow_executions
```

Modify/extend:

```text
workflow_instances
workflow_tasks
```

Add:

```text
compensation_records
possession_records
```

Add required indexes.

## Backend

Create repository/data-access functions for:

```text
createWorkflowNode
updateWorkflowNode
deleteWorkflowNode
createWorkflowEdge
deleteWorkflowEdge
assignParcelToNode
removeParcelFromNode
createWorkflowExecution
createWorkflowTask
```

## Acceptance

Database starts cleanly.

Migrations run without manual database edits.

Existing V1 tables remain readable.

---

# 5. Phase 2 — V2 Roles and Authorization

## Objective

Add V2 roles without breaking V1 authentication.

## Roles

Add:

```text
NATIONAL_AUTHORITY
STATE_AUTHORITY
DISTRICT_AUTHORITY
COMPENSATION_OFFICER
POSSESSION_OFFICER
```

Retain:

```text
REQUESTING_AUTHORITY
BOSS
PROCESSING_OFFICER
ADMIN
```

## Backend

Extend user scope:

```text
authority
state
district
department
role
```

Implement policy checks for:

```text
national scope
state scope
district scope
project scope
task scope
```

## APIs

Existing:

```http
GET /api/v1/auth/me
```

must return enough scope information for the frontend.

## Acceptance

A State Authority cannot retrieve another State's records.

A District Authority cannot retrieve another District's records.

Operational officers cannot browse unrelated parcels.

---

# 6. Phase 3 — Minimal Seed Geography and Demo Dataset

## Objective

Create the smallest coherent dataset that demonstrates the whole V2 concept.

## Seed hierarchy

```text
State
  ↓
District
  ↓
Project
  ↓
Parcel
```

Do not seed raw ungrouped parcels.

## Demo data

Use:

- 1 primary project
- 1–2 districts
- a small number of parcels
- minimum officers
- minimum departments/units
- enough parcels to demonstrate 2–3 Acquisition cohorts

Example conceptual distribution:

```text
District North
  Parcel A
  Parcel B
  Parcel C
  Parcel D
  Parcel E

District South
  Parcel F
  Parcel G
```

Exact count is implementation-flexible.

## Spatial data

Each parcel has:

```text
polygon
state
district
area
survey_number
ULPIN
village
land_type
```

Use small realistic polygons.

## Acceptance

Every dashboard/GIS/Passport query against the seed dataset returns consistent values.

---

# 7. Phase 4 — V2 Workflow Graph Core

## Objective

Replace the V1 linear workflow model with a reusable graph topology engine.

## Backend Services

Implement:

```text
WorkflowGraphService
WorkflowNodeService
WorkflowEdgeService
WorkflowCohortService
```

## Node

Properties:

```text
id
workflow_instance_id
node_key
name
node_type
responsible_role
responsible_unit_id
responsible_user_id
configuration
template_source
x_position
y_position
```

## Edge

Properties:

```text
id
workflow_instance_id
source_node_id
target_node_id
edge_type
condition
```

## Operations

Support:

```text
create node
edit node
delete node
create edge
delete edge
split
```

## Rules

- graph belongs to one project workflow instance
- nodes cannot exist across projects
- edges cannot reference different workflow instances
- deletion is transactional
- changes are audited

## Acceptance

A project can have:

```text
District
   ├── Branch A
   ├── Branch B
   └── Branch C
```

without using a stage-order integer to determine execution.

---

# 8. Phase 5 — V2 Visual Workflow Builder

## Objective

Create the main BOSS design experience.

## Route

```text
/boss/projects/:projectId/workflow-builder
```

## Frontend

Build:

```text
Canvas
Node component
Edge component
Node library
Inspector
Mini-map if useful
Zoom controls
Selection state
Undo/redo
Save
Validate
Activate
```

## Node display

Show:

```text
Name
Unit/officer
Parcel count
Template indicator
```

## Inspector

For selected node:

```text
Name
Responsible unit
Responsible officer
Node type
Cohort size
Required documents
SLA/configuration where supported
Template availability
```

## APIs

```http
GET    /api/v1/projects/:projectId/workflow
POST   /api/v1/projects/:projectId/workflow/nodes
PATCH  /api/v1/projects/:projectId/workflow/nodes/:nodeId
DELETE /api/v1/projects/:projectId/workflow/nodes/:nodeId
POST   /api/v1/projects/:projectId/workflow/edges
DELETE /api/v1/projects/:projectId/workflow/edges/:edgeId
```

## Acceptance

BOSS can visually construct a multi-branch workflow without using the old linear stage list.

---

# 9. Phase 6 — Cohort / Parcel Assignment

## Objective

Make every workflow node a parcel cohort during design.

## Backend

Implement:

```http
GET  /api/v1/projects/:projectId/workflow/nodes/:nodeId/parcels
POST /api/v1/projects/:projectId/workflow/cohorts/move-parcels
POST /api/v1/projects/:projectId/workflow/nodes/:nodeId/split
```

## Frontend

Selected node shows a parcel panel:

```text
Parcel
Survey
ULPIN
Village
Area
```

Actions:

```text
Select
Multi-select
Move
View Passport
```

## Rules

When splitting:

```text
new branch = empty
```

Then BOSS manually moves selected parcels.

Only sibling moves are allowed according to the agreed design model.

## Acceptance

Demo:

```text
Cohort A = 4 parcels
Cohort B = 0
Cohort C = 0
```

Then:

```text
Move Parcel B → Cohort B
Move Parcel C + Parcel D → Cohort C
```

Node counts update immediately and persist in backend.

---

# 10. Phase 7 — Contextual Workflow Templates

## Objective

Insert reusable workflow fragments.

## Seed Templates

Minimum:

```text
Highway Development
Army Acquisition
Tribal Area
Compensation Standard
Possession Standard
```

V2 does not need a template management UI.

## Backend APIs

```http
GET /api/v1/workflow-templates/contextual?projectId=...&nodeId=...
POST /api/v1/projects/:projectId/workflow/nodes/:nodeId/templates/preview
POST /api/v1/projects/:projectId/workflow/nodes/:nodeId/templates/apply
```

## Frontend

Selected node shows a small template indicator when contextual templates are available.

Click:

```text
Template panel
```

Selecting:

```text
Copy fragment
```

## Acceptance

BOSS selects a node and inserts a template.

The entire fragment appears in the canvas.

BOSS can still modify the inserted fragment before activation.

---

# 11. Phase 8 — Standard Compensation and Possession Attachments

## Objective

Automatically attach the two standard V2 lifecycle branches at District level.

## Backend

When the V2 workflow is initialized:

```text
District
├── Acquisition
├── Compensation
└── Possession
```

must be created.

Compensation node/fragment uses the standard Compensation template.

Possession node/fragment uses the standard Possession template.

## Frontend

Show them as ordinary editable nodes/branches.

BOSS may:

- rename
- add/remove downstream steps
- change responsible unit/officer
- modify permitted configuration

## Acceptance

A new V2 project opens with the three conceptual branches already present.

---

# 12. Phase 9 — Workflow Validation and Activation

## Objective

Make activation safe and transactional.

## Backend

Implement:

```text
WorkflowValidationService
WorkflowActivationService
```

## Validation

Check:

```text
valid graph
valid node assignments
valid parcel allocation
no duplicate active branch membership
no orphan nodes
valid template fragments
```

## API

```http
POST /api/v1/projects/:projectId/workflow/validate
POST /api/v1/projects/:projectId/workflow/activate
```

## Activation

Transaction:

```text
validate
→ freeze topology
→ persist version
→ generate runtime execution
→ create first tasks
→ audit
→ notifications
→ commit
```

## Acceptance

Before activation:

```text
BOSS can edit
```

After activation:

```text
BOSS cannot edit
```

Attempts to call mutation APIs return:

```text
WORKFLOW_ALREADY_ACTIVATED
```

---

# 13. Phase 10 — Runtime Execution Engine

## Objective

Convert the activated design into executable parcel tasks.

## Backend

Implement:

```text
WorkflowExecutionService
WorkflowTaskService
TaskRoutingService
```

## Runtime record

For each relevant:

```text
parcel + workflow node
```

create:

```text
workflow_execution
```

and when actionable:

```text
workflow_task
```

## Important rule

Do not require a permanent parcel `current_node_id`.

Use runtime execution records to determine active position.

## Acceptance

After activation:

```text
Parcel A → Node A → Task A
Parcel B → Node B → Task B
```

Tasks are visible only to their assigned officers.

---

# 14. Phase 11 — Acquisition Execution

## Objective

Apply the existing V1 officer task experience to V2 acquisition execution.

## Frontend

Retain:

```text
/officer/dashboard
/officer/tasks/:taskId
```

Modify task details to include:

```text
Parcel
Workflow node
Project
State
District
Cohort context
Required documents
Evidence
OCR
Verification
```

## Backend

Reuse V1 task endpoints but update routing to V2 execution records.

Recommended:

```http
GET  /api/v1/tasks?assignedTo=me
GET  /api/v1/tasks/:taskId
POST /api/v1/tasks/:taskId/start
POST /api/v1/tasks/:taskId/accept
POST /api/v1/tasks/:taskId/reject
```

## Rejection

Existing V1 rejection behavior remains:

```text
Reject
→ reason required
→ notification
→ Requesting Authority action
→ resubmit
→ same operational stage/task cycle reopens
```

BOSS does not return to the workflow.

## Acceptance

At least one acquisition cohort reaches:

```text
Accepted
```

and another demonstrates:

```text
Rejected
→ corrected
→ resubmitted
→ accepted
```

---

# 15. Phase 12 — Existing OCR / Gemini Integration Reattachment

## Objective

Prove that the AI document infrastructure survived the workflow rewrite.

## Do not rebuild

Reuse:

```text
documents
document_versions
document_processing_jobs
ai_extractions
stage_evidence
BullMQ
Redis
Gemini
human verification UI
```

## Change

Link V2 runtime task/stage identifiers correctly.

## Acceptance

A V2 Acquisition Officer can:

```text
Upload
→ OCR
→ Gemini extraction
→ View confidence
→ Correct
→ Verify
→ Accept
```

without manual DB editing.

---

# 16. Phase 13 — Compensation Module

## Objective

Implement the V2 Compensation branch end-to-end.

## Database

Create:

```text
compensation_records
```

## Backend

Create:

```text
CompensationController
CompensationService
CompensationRepository
CompensationStatusService
```

## APIs

```http
GET  /api/v1/compensation/dashboard
GET  /api/v1/compensation/records/:id
GET  /api/v1/compensation/tasks?assignedTo=me
POST /api/v1/compensation/records
PATCH /api/v1/compensation/records/:id
POST /api/v1/compensation/records/:id/mark-paid
POST /api/v1/compensation/tasks/:taskId/complete
```

## Frontend

```text
/compensation/dashboard
/compensation/tasks/:taskId
```

## Task content

```text
Parcel
Beneficiary
Assessed
Approved
Paid
Pending
Payment Reference
Payment Date
Evidence
Remarks
```

## Acceptance

Demo parcel:

```text
Assessed
→ Approved
→ Paid
```

and another can remain:

```text
Pending
```

Dashboard totals reflect both.

---

# 17. Phase 14 — Possession Module

## Objective

Implement direct possession execution.

## Database

```text
possession_records
```

## Backend APIs

```http
GET  /api/v1/possession/dashboard
GET  /api/v1/possession/tasks?assignedTo=me
GET  /api/v1/possession/records/:id
POST /api/v1/possession/records/:id/evidence
POST /api/v1/possession/records/:id/complete
```

## Frontend

```text
/possession/dashboard
/possession/tasks/:taskId
```

## Execution

```text
Open parcel
→ perform possession
→ upload evidence/photo
→ confirm
→ completed
```

No second approval step.

## Completion side effects

```text
possession record = COMPLETED
audit
notification
acquisition lifecycle recomputation
Passport update
dashboard update
GIS update
```

## Acceptance

A completed possession immediately appears as:

```text
Possession Completed
```

in authorized monitoring surfaces.

---

# 18. Phase 15 — V2 Notifications and Lifecycle Events

## Objective

Extend the existing notification engine.

## Event mappings

```text
WORKFLOW_ACTIVATED
TASK_ASSIGNED
STAGE_REJECTED
STAGE_RESUBMITTED
COMPENSATION_UPDATED
COMPENSATION_COMPLETED
POSSESSION_COMPLETED
ACQUISITION_COMPLETED
```

## Important Requesting Authority notifications

- rejection
- willingness non-submission
- grievance
- acquisition completion
- compensation completion
- possession completion

## Acceptance

Every required lifecycle action creates the expected in-app notification.

---

# 19. Phase 16 — Advanced GIS

## Objective

Replace V1 project-level GIS with the V2 multi-level monitoring GIS.

## Pages

```text
/national-dashboard/gis
/state-dashboard/:stateId/gis
/district-dashboard/:districtId/gis
/projects/:projectId/gis
```

Or reuse a shared GIS route with scoped permissions if the existing application architecture favors it.

## Layers

```text
Project Boundary
Parcel Boundaries
Proposed
Notified
Acquired
Compensation Pending
Compensation Paid
Possession Pending
Possession Completed
Disputed
```

## Filters

```text
State
District
Project
Lifecycle
Parcel Status
Branch / Unit
```

## Interaction

Click parcel:

```text
compact parcel popup
→ View Passport
```

## Acceptance

The selected parcel on GIS matches the same parcel record shown in Passport and dashboard totals.

---

# 20. Phase 17 — National / State / District Dashboards

## Objective

Build data-backed monitoring views.

## National

Route:

```text
/national-dashboard
```

KPIs:

```text
States
Districts
Projects
Parcels
Land Required
Land Acquired
Compensation Assessed
Compensation Approved
Compensation Paid
Compensation Pending
Possession Ready
Possession Pending
Possession Completed
```

## State

Route:

```text
/state-dashboard/:stateId
```

Add:

```text
District comparison
```

## District

Route:

```text
/district-dashboard/:districtId
```

Add:

```text
project table
branch/unit breakdown
pending officer work
parcel cohort visibility
```

## Acceptance

Changing an underlying compensation or possession record changes dashboard values without manually updating dashboard data.

---

# 21. Phase 18 — Drilldown and Page Reuse

## Objective

Avoid duplicate page implementations.

## Navigation

```text
National
   ↓
State
   ↓
District
   ↓
Project
   ↓
Parcel Passport
```

Reuse:

```text
Project View
Parcel Passport
GIS
```

Do not create:

```text
National Parcel Detail
State Parcel Detail
District Parcel Detail
```

unless there is a real authorization/layout requirement that cannot be represented in the common Passport.

## Acceptance

A user can travel:

```text
National Dashboard
→ State
→ District
→ Project
→ Parcel
```

without losing scope context.

---

# 22. Phase 19 — Parcel Passport

## Objective

Turn the existing parcel detail page into the standard V2 Passport.

## Route

```text
/parcels/:parcelId
```

## Sections

```text
Identity
Location
Project
Survey / ULPIN
Acquisition
Compensation
Possession
Documents
Authorized Activity
```

## V2 rules

- read-only
- common layout
- backend-scoped visibility
- no workflow editing
- no branch-management controls
- no R&R
- no risk
- no delay prediction

## Acquisition status

Only show:

```text
IN_PROGRESS
REJECTED
COMPLETED
```

at high level.

## Acceptance

Passport shows the same lifecycle state that GIS and dashboards derive from the same parcel record.

---

# 23. Phase 20 — Cross-Module Consistency

## Objective

Verify that the system behaves as one product rather than separate features.

## Test matrix

For one demo parcel:

```text
Workflow
→ task
→ rejection
→ resubmission
→ compensation
→ possession
```

Then verify:

```text
Dashboard
GIS
Project View
Passport
Notifications
Audit
```

all reflect the same state.

## Acceptance

No contradictory status is visible between modules.

---

# 24. Phase 21 — Audit and Provenance Verification

## Objective

Ensure all important V2 mutations have trustworthy traceability.

## Required audit tests

```text
Create node
Move parcel
Apply template
Delete node
Activate
Reject
Resubmit
Compensation update
Possession completion
```

## Fabric

Anchor selected important events asynchronously.

## Acceptance

Each important event has:

```text
PostgreSQL audit
optional provenance status
hash
```

No core business action fails because Fabric is unavailable.

---

# 25. Phase 22 — Authorization and Data Isolation Testing

## Objective

Test the complete role matrix.

### National Authority

Can:

```text
all authorized national monitoring
```

Cannot:

```text
modify workflow
execute officer tasks
modify compensation
modify possession
```

### State Authority

Can:

```text
state monitoring only
```

### District Authority

Can:

```text
district monitoring only
```

### Requesting Authority

Can:

```text
own projects
corrections
resubmissions
grievances
own-project GIS
```

### BOSS

Can:

```text
pre-activation design
```

Cannot:

```text
post-activation project access
```

### Processing Officer

Can:

```text
assigned acquisition tasks
```

### Compensation Officer

Can:

```text
assigned compensation tasks
```

### Possession Officer

Can:

```text
assigned possession tasks
```

## Acceptance

Unauthorized API requests fail server-side.

---

# 26. Phase 23 — Demo Polish

## Objective

Make the prototype convincing without adding scope.

Polish:

```text
loading
empty
error
retry
permission denied
success
confirmation
unsaved changes
activation warning
GIS loading
document processing
task completed
```

## Workflow builder

Must be the strongest screen.

Focus on:

- visual hierarchy
- clean node layout
- readable edges
- clear parcel counts
- obvious branch structure
- easy parcel movement
- contextual template indicator

## Officer UI

Focus on:

- task clarity
- document visibility
- OCR confidence
- verification flow
- evidence upload

---

# 27. Phase 24 — V2 Demo Seed Finalization

## Objective

Freeze the final minimal demonstration dataset.

## Minimum users

```text
1 Requesting Authority
1 BOSS
1 Processing Officer
1 Compensation Officer
1 Possession Officer
1 National Authority
1 State Authority
1 District Authority
```

## Minimum primary project

```text
1 project
```

## Small parcel set

Use enough parcels to demonstrate:

```text
2–3 Acquisition cohorts
Compensation pending
Compensation paid
Possession pending
Possession completed
Disputed
```

Do not create a large national dataset.

## Acceptance

The demo can be completed quickly without manual database editing.

---

# 28. Phase 25 — Full End-to-End Acceptance

Run the full scenario:

```text
Requesting Authority
   ↓
existing V1 project
   ↓
BOSS
   ↓
confirmed parcels
   ↓
V2 workflow builder
   ↓
branch creation
   ↓
parcel movement
   ↓
template insertion
   ↓
assignment
   ↓
validation
   ↓
activation
   ↓
BOSS exits
   ↓
Acquisition Officer
   ↓
OCR/Gemini/evidence
   ↓
accept
   ↓
another parcel rejected
   ↓
Requesting Authority correction
   ↓
resubmission
   ↓
accept
   ↓
Compensation Officer
   ↓
assessment
   ↓
payment recording
   ↓
Possession Officer
   ↓
evidence
   ↓
possession completed
   ↓
Acquisition completed
   ↓
District Dashboard
   ↓
District GIS
   ↓
National Dashboard
   ↓
State Dashboard
   ↓
Project View
   ↓
Parcel Passport
```

---

# 29. V2 Definition of Done

Prototype V2 is accepted only if:

```text
✓ Existing V1 project creation still works
✓ Existing V1 documents still work
✓ Existing OCR/Gemini pipeline still works
✓ Existing grievances/WhatsApp remain functional
✓ V2 builder is visual
✓ V2 builder supports arbitrary branching
✓ Nodes represent parcel cohorts
✓ New branches begin empty
✓ Parcel movement works
✓ Multi-select movement works
✓ Contextual templates work
✓ Compensation branch exists at District level
✓ Possession branch exists at District level
✓ Officers can be assigned
✓ Graph validation works
✓ Activation freezes topology
✓ BOSS exits after activation
✓ Runtime tasks are generated
✓ Officer task routing is correct
✓ Same parcel cannot be simultaneously active in multiple branches
✓ Acquisition rejection works
✓ Requesting Authority resubmission works
✓ Compensation tracking works
✓ Possession evidence works
✓ Possession completion works
✓ Acquisition becomes completed at the agreed lifecycle completion point
✓ National dashboard works
✓ State dashboard works
✓ District dashboard works
✓ GIS layers work
✓ GIS filters work
✓ GIS → Passport works
✓ Passport is read-only
✓ Role scope works
✓ Audit works
✓ Seed data is minimal
✓ Seed data is consistent
✓ No manual database edits are required
```

---

# 30. Post-V2 Roadmap

After V2 has passed the acceptance gate, continue the mature platform in separate planned phases:

```text
R&R
Risk Engine
Delay Prediction
Anomaly Detection
Real Government Land Records
ULPIN / Cadastral
PM Gati Shakti
Government Identity
Payments
Mobile Field Experience
Reports
Production WhatsApp Expansion
Full Fabric Provenance
Production Security
National Scalability
```

Do not allow those features to expand V2 beyond its intended demonstration boundary.

---

# 31. Final Implementation Principle

The project should now be understood as:

```text
V1 = working project-request + parcel + document + AI + officer foundation

V2 = complete replacement of the old workflow process
      built on top of that foundation
```

The development team should therefore:

```text
reuse infrastructure
reuse completed modules
reuse proven document/OCR/notification capabilities
replace obsolete workflow assumptions
build one coherent V2 execution model
keep all data in one consistent backend
keep the demo intentionally small
```

The result should look like the beginning of the final national platform, not like a second unrelated prototype.