# Implementation Plan V2
## National Land Acquisition & Management System

---

# 0. Document Status

**Version:** 2.0 — Prototype V2 Build Contract  
**Purpose:** Feature-centric implementation contract for rebuilding the system from the completed Prototype V1 foundation into Prototype V2 and preserving a clean path to the mature national platform.

This document replaces the V1 workflow implementation plan wherever the old linear workflow model conflicts with the V2 decisions.

The key rule is:

> **Prototype V2 is an extension of the working V1 platform, but the V1 workflow engine, workflow state model, workflow designer, and linear routing assumptions are replaced by the V2 workflow architecture.**

V1 capabilities that are already working are retained and integrated. They are not rebuilt merely because the workflow engine changes.

---

# 1. Source Baseline and V1 Capabilities to Preserve

Prototype V1 already established a complete working vertical slice:

```text
Government Sign In
      ↓
Requesting Authority
      ↓
Create Project
      ↓
Project Geometry
      ↓
Initial Documents
      ↓
Submit Request
      ↓
BOSS Review
      ↓
Parcel Determination / Confirmation
      ↓
Existing Linear Workflow
      ↓
Officer Task
      ↓
Hard-Copy / Digital Evidence
      ↓
OCR + Gemini Extraction
      ↓
Human Verification
      ↓
Accept / Reject
      ↓
Requesting Authority Correction
      ↓
Resubmission
      ↓
Final Approval
      ↓
Audit / Provenance
      ↓
WhatsApp Citizen Interaction
```

The V1 documentation explicitly marks the following as completed:

- authentication and RBAC foundation
- Requesting Authority project request flow
- project geometry
- initial document upload
- BOSS project review
- mock land-record integration
- parcel confirmation
- officer dashboard and task execution
- document management and versioning
- hard-copy evidence intake
- OCR + Gemini document intelligence
- human verification of AI output
- Requesting Authority rejection/resubmission flow
- final approval
- in-app notifications
- WhatsApp grievance flow
- PostgreSQL/PostGIS foundation
- audit infrastructure
- Hyperledger provenance infrastructure

The V1 implementation plan also states that the system should not be restarted after the prototype and should instead expand existing modules.

For V2:

```text
RETAIN / EXTEND:
Auth
Projects
Project geometry
Project documents
Land parcels
PostGIS
OCR
Gemini
Evidence
Notifications
WhatsApp
Audit
Provenance
Existing modular Express application
Existing React application

REPLACE:
V1 linear workflow designer
V1 workflow stage-order model
V1 linear routing assumptions
V1 workflow state machine where it assumes one sequential stage chain
V1 workflow configuration UX
V1 workflow execution assumptions tied to one project-wide current stage
```

---

# 2. V2 Product Objective

Prototype V2 must demonstrate a believable operational land-acquisition system rather than a disconnected collection of screens.

The V2 demonstration story is:

```text
Existing V1 Project Request
        ↓
Existing BOSS Parcel Confirmation
        ↓
V2 Visual Workflow Designer
        ↓
BOSS creates complete workflow topology
        ↓
State / District parcel hierarchy
        ↓
Cohort-based parcel grouping
        ↓
Arbitrary branch construction
        ↓
Contextual workflow-template insertion
        ↓
Acquisition / Compensation / Possession paths
        ↓
Workflow activation
        ↓
Topology frozen
        ↓
Parcel-level execution
        ↓
Existing OCR / Gemini / Evidence infrastructure
        ↓
Compensation execution
        ↓
Possession execution
        ↓
V2 National / State / District monitoring
        ↓
Advanced GIS
        ↓
Parcel Passport
```

Prototype V2 is intentionally a **small, coherent demo**. The dataset must be large enough to demonstrate the concepts but no larger than necessary.

---

# 3. V2 Scope

## 3.1 Included

### Workflow
- complete V2 visual branching workflow builder
- n8n-like node/edge interaction model
- parcel cohorts represented by workflow nodes
- arbitrary depth branching
- parcel reassignment between sibling cohorts during BOSS design
- individual parcel movement
- multi-select parcel movement
- contextual reusable workflow templates
- predefined Compensation template
- predefined Possession template
- Acquisition branch
- branch-specific officer/unit assignment
- activation validation
- workflow topology freeze after activation
- activation-time runtime execution generation

### Acquisition
- parcel-by-parcel execution
- willingness stage/process
- officer acceptance/rejection
- rejection reason
- Requesting Authority correction/resubmission
- acquisition status
- automatic overall acquisition status derivation

### Compensation
- separate District-level branch
- predefined standard template
- assessment
- approved amount
- paid amount
- pending amount
- payment reference
- payment date
- payment status
- multiple beneficiaries where required
- no full payment engine
- payment record maintained by authorized Compensation Officer

### Possession
- separate District-level branch
- predefined standard template
- assigned parcel execution
- possession action
- evidence/photo upload
- completion confirmation
- possession record
- no separate District approval step in V2

### GIS
- National GIS
- State GIS
- District GIS
- Requesting Authority project-scoped GIS
- project boundary
- parcel boundaries
- Proposed
- Notified
- Acquired
- Compensation Pending
- Compensation Paid
- Possession Pending
- Possession Completed
- Disputed
- parcel click → compact summary → Parcel Passport

### Dashboards
- National
- State
- District
- drilldown and reuse of existing Project/Parcel views
- synchronized metrics from the same source data

### Parcel Passport
- permanent read-only parcel view
- common layout for all authorized roles
- single overall Acquisition Status
- Compensation status
- Possession status
- core identity/location/project/document information

---

# 4. Explicit V2 Exclusions

Do not build the following into Prototype V2:

- R&R execution
- R&R dashboarding
- Risk scoring
- Risk heatmaps
- Delay prediction
- Anomaly detection
- national risk analytics
- sophisticated payment approval engine
- workflow editing after activation
- officer workflow redesign
- BOSS access to the project after activation
- citizen web account
- live government land-record APIs requiring unavailable keys
- large-scale seed data
- independent mock datasets per dashboard
- a second database for GIS
- a second database for compensation or possession
- direct frontend database access
- Gemini making official decisions without human verification

These remain later-system capabilities.

---

# 5. Locked Technology Architecture

## 5.1 Frontend

```text
React 19
TypeScript
Vite
React Router
TanStack Query
React Hook Form
Zod
Leaflet
React-Leaflet
Vanilla CSS
```

Design system:

> Sovereign Editorial / Statutory Brutalism

Tailwind is not introduced.

The V2 UI should reuse existing layouts, primitives, tables, notices, cards, document components, map components, notification components, and government shell patterns where practical.

---

# 6.2 Backend

```text
Node.js
Express 5
TypeScript
REST API
PostgreSQL pg connection pool
Zod validation
Centralized error handling
Structured logging
RBAC middleware
```

The backend remains the authoritative control point.

Frontend must never directly access:

- PostgreSQL
- Redis
- Gemini
- Hyperledger Fabric
- government land-record services

---

# 6.3 AI Document Parser

Retain the V1 architecture:

```text
Backend
   ↓
AI Document Parser
   ↓
BullMQ
   ↓
Redis
   ↓
OCR / Gemini
   ↓
ExtractionResult
   ↓
Human Verification
   ↓
Official Record
```

The AI result remains a draft until verified.

---

# 6.4 Database

```text
PostgreSQL 16
PostGIS
```

Use one database.

All dashboards, GIS, workflow execution, compensation, possession, and Passport queries ultimately derive from this consistent relational source.

---

# 6.5 Storage

Retain:

```text
/uploads or object storage
+
PostgreSQL metadata
+
SHA-256 hashes
+
document versions
```

Never overwrite an older document version.

---

# 7. Core Architectural Principle: Topology vs Runtime

V2 deliberately separates:

## 7.1 Workflow Topology

The immutable activated process definition:

```text
Workflow
 ├── Nodes
 ├── Edges
 ├── Branches
 ├── Node type
 ├── Responsible unit
 ├── Responsible officer
 ├── Template origin
 ├── Node configuration
 ├── Cohort assignment at design time
 └── Activation/version metadata
```

## 7.2 Workflow Execution

Runtime records generated from the activated topology:

```text
Parcel
   ↓
Workflow Execution Stage / Task
   ↓
Officer / Unit
   ↓
Status
   ↓
Evidence
   ↓
Timestamps
   ↓
Decision
```

Do not make `parcel.current_cohort_id` a permanent mutable source of truth.

At design time, parcels are assigned to cohorts because BOSS must construct routing.

At runtime, the active execution record determines where the parcel is operationally.

---

# 8. Critical V2 Workflow Rules

## 8.1 BOSS owns design, not execution

Before activation BOSS must be able to:

- inspect confirmed parcels
- construct the workflow
- create nodes
- create branches
- assign responsible units
- assign officers
- insert workflow templates
- move parcels between sibling cohorts
- remove nodes
- review resulting topology
- activate

After activation:

```text
BOSS PROJECT ACCESS = CLOSED
```

No normal UI route should permit BOSS to modify the active workflow.

---

## 8.2 Every Node is a Parcel Cohort

A node may contain:

```text
0..N parcels
```

during design.

The node is both:

- a routing definition
- a parcel grouping mechanism

The system must show cohort size directly on the node.

Example:

```text
Document Review
District Revenue Unit
12 Parcels
```

---

## 8.3 New Branches Start Empty

When BOSS splits:

```text
Node A
```

into:

```text
Node A
 ├── Node B
 └── Node C
```

B and C initially contain no parcels.

BOSS then selects parcels from sibling cohorts and moves them into the intended branch.

---

## 8.4 Parcel Movement

Support:

```text
Single parcel selection
Multi-select
Select all visible
Move selected
Move to sibling node
```

Do not permit moving a parcel to an unrelated branch outside the valid sibling context defined by the workflow graph.

---

## 8.5 Node Deletion

When a node is deleted:

1. delete its topology branch and descendants from active design
2. parcels directly assigned to the deleted node are merged into a deterministic sibling
3. descendant parcels from child/descendant nodes are not silently reassigned
4. the user must understand the destructive effect before confirmation
5. every structural mutation is audited

Use the agreed deterministic sibling rule consistently in backend logic.

---

# 9. Workflow Template Model

V2 templates are not the V1 master-stage-list UI.

A V2 template is a reusable workflow fragment.

Examples:

```text
Highway Development
Army Acquisition
Tribal Area
```

The template can represent:

```text
entry context
   ↓
multiple nodes
   ↓
branches
   ↓
end point(s)
```

## 9.1 Contextual Selection

BOSS selects a node.

Then:

```text
Select officer/unit
      ↓
show template indicator
      ↓
click indicator
      ↓
contextual template panel
      ↓
show only templates that fit the selected responsibility/context
```

## 9.2 Template Insertion

Selecting a template:

```text
copies the entire template fragment
from the selected node through the fragment's end
```

Then BOSS may:

- remove nodes
- add nodes
- add branches
- restructure permitted design
- move parcels

Template management UI is not required for V2.

---

# 10. V2 Standard Lifecycle Topology

The conceptual District structure is:

```text
District
├── Acquisition
├── Compensation
└── Possession
```

These are parallel process paths in the topology.

However:

> **A parcel may not be in more than one active workflow branch at the same point in time.**

The topology may contain all three paths, but runtime execution enforces one active branch per parcel.

---

# 11. Acquisition Model

Acquisition is the primary acquisition execution branch.

The exact internal stages are BOSS-configurable.

Minimum V2 capability:

```text
Acquisition
   ↓
Cohort / Branch
   ↓
Assigned Processing / Acquisition Officer
   ↓
Parcel-level willingness / verification
   ↓
Accept
        ↓ next configured task
Reject
        ↓
REJECTED
        ↓
Requesting Authority
        ↓
Correct / Resubmit
        ↓
same stage/task becomes actionable again
```

Overall Acquisition status:

```text
IN_PROGRESS
REJECTED
COMPLETED
```

Possession completion is the lifecycle completion event that changes the overall acquisition lifecycle to `COMPLETED`.

Passport exposes only the single overall Acquisition Status.

It must not become a workflow-history viewer.

---

# 12. Compensation Model

Compensation is an independent District-level branch.

```text
District
   └── Compensation
```

Standard V2 Compensation template is attached automatically at District level.

BOSS may modify it before activation.

Prototype execution:

```text
Compensation Officer
        ↓
Open assigned parcel / beneficiary work
        ↓
Record assessment
        ↓
Record approval
        ↓
Record payment
        ↓
Mark paid / pending
```

Suggested record fields:

```text
id
project_id
parcel_id
beneficiary_id / affected_person reference
assessed_amount
approved_amount
paid_amount
pending_amount
payment_status
payment_reference
payment_date
remarks
created_by
updated_by
created_at
updated_at
```

Multiple compensation records may be linked to one parcel.

Compensation is a tracking system, not a banking/payment engine.

---

# 13. Possession Model

Possession is an independent District-level branch.

```text
District
   └── Possession
```

Standard V2 Possession template is attached automatically.

Execution:

```text
Possession Officer
        ↓
Open assigned parcel
        ↓
Perform possession action
        ↓
Upload evidence/photo
        ↓
Confirm possession taken
        ↓
Mark COMPLETED
```

No separate District approval stage is required in V2.

Record fields:

```text
id
project_id
parcel_id
status
taken_at
taken_by
remarks
created_at
updated_at
```

Evidence remains linked through the existing document/evidence model.

Supported conceptual statuses:

```text
NOT_STARTED
READY
PENDING
PARTIALLY_COMPLETED
COMPLETED
```

The exact legal trigger for `READY` is not hard-coded beyond what is explicitly configured by the workflow/lifecycle logic.

---

# 14. Seed Data Model

The demo dataset must be minimal but structurally convincing.

Do not create hundreds of parcels.

Recommended demonstration shape:

```text
1 State
  ↓
1–2 Districts
  ↓
1 Project
  ↓
a small parcel set
  ↓
2–3 acquisition cohorts
```

The project must demonstrate:

- at least one split
- at least one parcel moved between sibling cohorts
- at least one officer assignment difference
- Acquisition branch
- Compensation branch
- Possession branch
- at least one completed compensation example
- at least one possession-completed example
- at least one rejection/resubmission example
- enough spatial spread to make GIS meaningful

The exact count may be selected during implementation but must stay small.

---

# 15. Seed Hierarchy

Seed data begins already organized.

```text
Project
   ↓
State
   ↓
District
   ↓
Parcel
```

Do not seed raw parcels that must first be discovered and manually organized across states/districts.

The seeded spatial hierarchy is authoritative for the demo.

Where BOSS must demonstrate a land-record operation, the existing mock integration boundary can remain available, but V2 dashboard/GIS consistency must derive from the same project/parcel records.

---

# 16. Consistent Data Rule

All views must derive from the same records.

```text
PostgreSQL
   ├── National Dashboard
   ├── State Dashboard
   ├── District Dashboard
   ├── GIS
   ├── Project View
   ├── Workflow Execution
   ├── Compensation
   ├── Possession
   └── Parcel Passport
```

Never create:

```text
National mock data
State mock data
District mock data
GIS mock data
Passport mock data
```

independently.

A change in one module must be visible wherever the same underlying fact is represented.

---

# 17. Role Model V2

## 17.1 National Authority

Scope:

```text
Nationwide
```

Can:

- view National Dashboard
- view National GIS
- drill down State → District → Project → Parcel Passport
- monitor acquisition/compensation/possession

Cannot:

- edit workflow
- modify compensation
- modify possession
- execute officer work

---

## 17.2 State Authority

Scope:

```text
One State
```

Can:

- view State Dashboard
- view State GIS
- drill into districts
- inspect projects and Passport records

Monitor-only.

---

## 17.3 District Authority

Scope:

```text
One District
```

Can:

- view District Dashboard
- view District GIS
- inspect projects
- inspect parcel cohorts
- see branch/unit breakdown
- monitor acquisition/compensation/possession

Monitor-only.

---

## 17.4 Requesting Authority

Scope:

```text
Projects it requested
```

Retain V1 capabilities.

V2 adds visibility into:

- new lifecycle status
- compensation progress
- possession progress
- relevant notifications
- Passport where authorized
- GIS scoped to its projects

Requesting Authority does not edit the V2 workflow.

---

## 17.5 BOSS

Pre-activation only.

Can:

- receive project
- review
- manage design
- design topology
- assign officers/units
- move parcels in cohorts
- insert templates
- activate

After activation:

```text
No project access
```

---

## 17.6 Processing / Acquisition Officer

Scope:

```text
assigned runtime parcel tasks only
```

Can:

- open assigned task
- see relevant parcel information
- review documents
- upload evidence
- use existing OCR/Gemini flow
- accept
- reject with reason
- resubmit through assigned task cycle where allowed

Cannot:

- edit workflow topology
- browse unrelated parcels
- assign arbitrary parcels
- see unrelated officers' work

---

## 17.7 Compensation Officer

Same operational restrictions as Processing Officer, scoped to Compensation.

---

## 17.8 Possession Officer

Same operational restrictions as Processing Officer, scoped to Possession.

---

# 18. Page Architecture

## 18.1 Retain Existing V1 Pages

Retain and modify where required:

```text
/login
/projects
/projects/new
/projects/:projectId
/grievances
/documents
/documents/:documentId
/notifications
/officer/dashboard
/officer/tasks/:taskId
```

Existing page components should be reused where they do not encode obsolete workflow logic.

---

# 18.2 Replace BOSS Workflow Pages

The V1 pages:

```text
/boss/projects/:id/workflow
/boss/projects/:id/workflow/templates
```

must be replaced by a V2 visual workflow experience.

Recommended route:

```text
/boss/projects/:projectId/workflow-builder
```

Optional supporting views:

```text
/boss/projects/:projectId/workflow-preview
/boss/projects/:projectId/workflow-activate
```

The V2 builder is the main interaction surface.

---

# 19. V2 Workflow Builder UX

The builder should feel like:

```text
n8n / visual automation editor
```

not:

```text
admin form
```

Suggested layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Project Name                    Save        Validate  Activate│
├──────────────┬───────────────────────────────┬───────────────┤
│ Node Library │                              │ Inspector      │
│              │       WORKFLOW CANVAS        │               │
│ Group        │                              │ Node           │
│ Officer      │     ┌──────────┐             │ Officer        │
│ Branch       │     │District  │──────┐      │ Unit           │
│ Template     │     │12 parcels│      │      │ Cohort         │
│              │     └──────────┘      │      │ Documents      │
│              │             ┌────────┴───┐   │ SLA            │
│              │             │ Acquisition│   │ Templates      │
│              │             └──────┬─────┘   │               │
│              │                    │         │               │
│              │        ┌───────────┴─────┐   │               │
│              │        │ Compensation    │   │               │
│              │        └─────────────────┘   │               │
└──────────────┴───────────────────────────────┴───────────────┘
```

Node should show:

- name
- unit/officer
- parcel count
- status/design state
- branch indicator
- template indicator where applicable

---

# 20. Workflow Builder Backend API

Use a new V2 workflow API instead of the V1 stage mutation endpoints.

Recommended endpoints:

```http
GET    /api/v1/projects/:projectId/workflow

POST   /api/v1/projects/:projectId/workflow/initialize

POST   /api/v1/projects/:projectId/workflow/nodes

PATCH  /api/v1/projects/:projectId/workflow/nodes/:nodeId

DELETE /api/v1/projects/:projectId/workflow/nodes/:nodeId

POST   /api/v1/projects/:projectId/workflow/edges

DELETE /api/v1/projects/:projectId/workflow/edges/:edgeId

POST   /api/v1/projects/:projectId/workflow/nodes/:nodeId/split

POST   /api/v1/projects/:projectId/workflow/nodes/:nodeId/templates/preview

POST   /api/v1/projects/:projectId/workflow/nodes/:nodeId/templates/apply

POST   /api/v1/projects/:projectId/workflow/cohorts/move-parcels

POST   /api/v1/projects/:projectId/workflow/validate

POST   /api/v1/projects/:projectId/workflow/activate

GET    /api/v1/projects/:projectId/workflow/execution
```

Backend must reject all mutation endpoints after activation.

---

# 21. Workflow Validation Rules

Before activation, backend validates:

### Graph integrity
- at least one start node
- no orphaned active nodes
- no orphaned edges
- valid edge endpoints
- no invalid cycles unless explicitly supported
- all required branches connect to valid downstream execution paths
- no duplicate node identifiers

### Responsibility
- every executable node has a valid role/unit/officer responsibility
- officer belongs to allowed authority/department
- no unauthorized officer assignment

### Parcel allocation
- every included parcel belongs to exactly one active design cohort
- no parcel appears in multiple sibling active cohorts
- no parcel points to a node outside the project workflow
- no active branch has contradictory parcel membership

### Templates
- all inserted template fragments resolve correctly
- template insertion does not create orphaned topology

### Activation
- no unresolved validation errors
- project state allows activation
- BOSS has authority to activate

---

# 22. Activation Transaction

Activation must be a backend transaction.

Conceptually:

```text
BEGIN

lock project
lock workflow instance

validate graph

freeze topology

persist activation/version

generate runtime execution records
for current parcel assignments

create initial actionable tasks

create audit event
WORKFLOW_ACTIVATED

create notifications

COMMIT
```

Do not create an active workflow through separate frontend calls that can leave half of the system activated.

---

# 23. Runtime Execution Model

At activation:

```text
Activated topology
       +
Design-time parcel cohort assignments
       ↓
runtime execution generation
       ↓
parcel-stage/task records
```

The runtime model must support:

- multiple parcels under the same workflow node
- separate task instances per parcel where required
- one active operational branch per parcel
- branch progression
- rejection
- resubmission
- completion
- evidence
- officer ownership

The graph remains immutable.

Runtime status changes must not alter topology.

---

# 24. Runtime Data Model

Recommended V2 entities:

## workflow_instances

```text
id
project_id
version
status
activated_by
activated_at
created_at
updated_at
```

## workflow_nodes

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
created_at
updated_at
```

## workflow_edges

```text
id
workflow_instance_id
source_node_id
target_node_id
edge_type
condition
created_at
```

## workflow_node_parcels

Design-time association:

```text
id
workflow_node_id
parcel_id
assigned_by
assigned_at
```

This is intentionally a design-time cohort mapping, not a mutable parcel `current_node_id`.

## workflow_executions

```text
id
workflow_instance_id
parcel_id
node_id
status
started_at
completed_at
attempt_number
rejection_reason
created_at
updated_at
```

## workflow_tasks

```text
id
workflow_execution_id
assigned_to
status
assigned_at
started_at
completed_at
last_action_at
created_at
updated_at
```

---

# 25. Compensation Database

Add:

```text
compensation_records
```

Minimum fields:

```text
id UUID PK
project_id UUID FK
parcel_id UUID FK
beneficiary_reference VARCHAR
assessed_amount NUMERIC
approved_amount NUMERIC
paid_amount NUMERIC
pending_amount NUMERIC
payment_status VARCHAR
payment_reference VARCHAR NULL
payment_date DATE NULL
remarks TEXT NULL
created_by UUID FK
updated_by UUID FK
created_at TIMESTAMP
updated_at TIMESTAMP
```

Add indexes:

```text
project_id
parcel_id
payment_status
```

Do not assume one record per parcel.

---

# 26. Possession Database

Add:

```text
possession_records
```

Minimum:

```text
id UUID PK
project_id UUID FK
parcel_id UUID FK UNIQUE
status VARCHAR
taken_at TIMESTAMP NULL
taken_by UUID NULL
remarks TEXT NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

Evidence remains linked through existing document/stage evidence records.

---

# 27. Parcel Lifecycle Status Model

Keep lifecycle facts normalized.

The parcel should expose:

```text
acquisition_status
compensation_status
possession_status
```

but their values must be updated or derived by backend domain services.

Do not allow arbitrary frontend writes to these fields.

---

# 28. Overall Acquisition Status Rules

The backend must define:

```text
IN_PROGRESS
REJECTED
COMPLETED
```

### Rejection

If an active acquisition stage is rejected:

```text
Acquisition status = REJECTED
Requesting Authority notified
Action item created
```

The user can later correct and resubmit.

### Completion

When possession is completed for the parcel/lifecycle condition defined for the V2 demo:

```text
Possession = COMPLETED
        ↓
Acquisition = COMPLETED
```

The exact cross-branch completion check must be implemented centrally rather than in React.

---

# 29. Passport

Route:

```text
/parcels/:parcelId
```

One standard layout.

Suggested sections:

```text
Parcel Identity
Location
Project
Survey / ULPIN
Acquisition Status
Compensation Status
Possession Status
Documents
Recent Authorized Activity
```

V2 Passport does not show:

- complete workflow graph
- all branch history
- R&R
- Risk
- Delay prediction
- internal officer management controls

Passport is read-only.

Data visibility is controlled by backend authorization.

---

# 30. Dashboard Architecture

## National Dashboard

Metrics:

```text
Total States
Total Districts
Total Projects
Total Parcels
Total Land Required
Total Land Acquired
Compensation Assessed
Compensation Approved
Compensation Paid
Compensation Pending
Possession Ready
Possession Pending
Possession Completed
```

Views:

```text
State comparison
State drilldown
National GIS
```

---

## State Dashboard

Same concepts scoped to one State.

Add:

```text
District comparison
District drilldown
State GIS
```

---

## District Dashboard

Metrics:

```text
Projects
Total Parcels
Land Required
Land Acquired
Acquisition stage distribution
Pending officer work
Compensation assessed
Compensation approved
Compensation paid
Compensation pending
Possession ready
Possession pending
Possession completed
```

Operational breakdown:

```text
Acquisition Unit
Compensation Unit
Possession Unit
```

Also show:

```text
parcel cohort → current responsible unit
```

using runtime execution/task data.

---

# 31. Dashboard API

Recommended:

```http
GET /api/v1/dashboards/national
GET /api/v1/dashboards/state/:stateId
GET /api/v1/dashboards/district/:districtId
```

Optional drilldown:

```http
GET /api/v1/dashboards/national/states
GET /api/v1/dashboards/state/:stateId/districts
GET /api/v1/dashboards/district/:districtId/projects
```

Project view remains the existing project module.

Parcel view remains Parcel Passport.

Do not duplicate project and parcel details inside every dashboard screen.

---

# 32. Unified Drilldown Architecture

Preferred navigation:

```text
National Dashboard
      ↓
State Dashboard / State GIS
      ↓
District Dashboard / District GIS
      ↓
Project View
      ↓
Parcel
      ↓
Parcel Passport
```

Do not build separate “dashboard-specific parcel detail” pages.

Use:

```text
Dashboard
  → existing Project View
  → existing Parcel Passport
```

This prevents duplication and ensures a single source of UI truth.

---

# 33. GIS Architecture

## Supported GIS Scopes

```text
National Authority
    → National GIS

State Authority
    → State GIS

District Authority
    → District GIS

Requesting Authority
    → GIS for own projects
```

No GIS workbench for:

```text
Acquisition Officer
Compensation Officer
Possession Officer
```

---

# 34. V2 GIS Layers

Lock the V2 layer set to:

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

Do not add:

```text
Risk
Delayed
Risk Heatmap
Critical Delay
R&R Pending
```

to V2.

---

# 35. GIS Filters

Where applicable:

```text
State
District
Project
Lifecycle stage
Parcel status
Workflow branch / unit
```

Role scope always constrains the available results.

---

# 36. GIS APIs

Recommended:

```http
GET /api/v1/gis/national
GET /api/v1/gis/states/:stateId
GET /api/v1/gis/districts/:districtId
GET /api/v1/gis/projects/:projectId
GET /api/v1/gis/parcels/:parcelId
```

Filter support should use query parameters rather than building one route per filter.

Example:

```http
GET /api/v1/gis/districts/:districtId?projectId=...&lifecycle=...&parcelStatus=...
```

Return GeoJSON for map rendering.

---

# 37. GIS Query Strategy

Use PostGIS for:

- bounding queries
- state/district/project spatial filtering
- parcel GeoJSON
- intersection/containment where required
- spatial summaries

Do not duplicate geometry into dashboard tables.

---

# 38. Requesting Authority V2 Changes

Preserve the V1 Requesting Authority workflow.

Add:

### Dashboard
- compensation summary
- possession summary
- overall acquisition status
- notifications related to rejections and lifecycle milestones

### Project View
Add:

```text
Acquisition Status
Compensation Status
Possession Status
Parcel count by lifecycle state
```

### Existing actions
Continue:

```text
Correction
Resubmission
Citizen issue handling
Document management
Project tracking
```

No workflow editing.

---

# 39. Acquisition Officer Workbench

Reuse the V1 officer task UI structure.

Add V2 parcel execution context:

```text
Parcel ID
Project
State
District
Area
Current acquisition stage
Assigned unit
Assigned officer
Required documents
Evidence
OCR status
Verification status
```

Actions remain task-specific.

The officer must not see:

- visual workflow builder
- unrelated branches
- national/state/district dashboards
- unrelated parcels

---

# 40. Compensation Officer UI

Suggested routes:

```text
/compensation/dashboard
/compensation/tasks/:taskId
```

Dashboard:

```text
Assigned
Due
Pending
Completed
```

Task:

```text
Project
Parcel
Beneficiary
Assessment
Approved Amount
Paid Amount
Pending Amount
Payment Reference
Payment Date
Evidence
Remarks
```

Actions:

```text
Save
Mark Paid
Mark Pending
Complete Task
Reject / return where configured
```

No payment gateway.

---

# 41. Possession Officer UI

Suggested:

```text
/possession/dashboard
/possession/tasks/:taskId
```

Task:

```text
Project
Parcel
Location
Area
Possession state
Evidence uploader
Photo uploader
Remarks
```

Action:

```text
Confirm Possession Taken
```

On completion:

- possession record updates
- evidence is linked
- audit event created
- notifications created
- acquisition lifecycle is recalculated

---

# 42. Notification Rules V2

Retain existing notification service.

Add V2 events:

```text
COMPENSATION_TASK_ASSIGNED
COMPENSATION_UPDATED
COMPENSATION_COMPLETED
POSSESSION_TASK_ASSIGNED
POSSESSION_COMPLETED
ACQUISITION_REJECTED
ACQUISITION_COMPLETED
WILLINGNESS_NOT_SUBMITTED
```

Requesting Authority receives:

- rejection
- willingness non-submission
- grievance
- acquisition completion
- compensation completion
- possession completion

Operational officers receive task-specific notifications.

National/State/District authorities can receive monitoring notifications only if configured; they are not operationally responsible for execution.

---

# 43. Audit Requirements V2

Every important V2 event must create an audit record.

Minimum events:

```text
WORKFLOW_NODE_CREATED
WORKFLOW_NODE_UPDATED
WORKFLOW_NODE_DELETED
WORKFLOW_EDGE_CREATED
WORKFLOW_EDGE_DELETED
PARCEL_COHORT_CREATED
PARCEL_MOVED_BETWEEN_COHORTS
WORKFLOW_TEMPLATE_APPLIED
WORKFLOW_VALIDATED
WORKFLOW_ACTIVATED
TASK_CREATED
STAGE_ACCEPTED
STAGE_REJECTED
STAGE_RESUBMITTED
COMPENSATION_ASSESSED
COMPENSATION_APPROVED
COMPENSATION_PAID
POSSESSION_STARTED
POSSESSION_COMPLETED
ACQUISITION_COMPLETED
```

Audit record should include:

```text
actor
role
entity
entity_id
project
parcel if applicable
old value
new value
timestamp
source
metadata
```

---

# 44. Provenance

Retain the V1 architecture:

```text
PostgreSQL audit event
      ↓
hash
      ↓
BullMQ provenance job
      ↓
Hyperledger Fabric
```

Do not synchronously block business transactions on Fabric.

Important V2 events suitable for anchoring:

```text
WORKFLOW_ACTIVATED
DOCUMENT_VERIFIED
STAGE_ACCEPTED
COMPENSATION_COMPLETED
POSSESSION_COMPLETED
ACQUISITION_COMPLETED
```

The actual documents, personal data, and operational database records remain off-chain.

---

# 45. Existing OCR / Gemini Integration

The V2 officer execution page must reuse V1's existing document pipeline.

Do not rebuild OCR.

Required flow:

```text
Officer uploads document
       ↓
document record
       ↓
BullMQ
       ↓
OCR/Gemini
       ↓
structured extraction
       ↓
field confidence
       ↓
side-by-side verification
       ↓
officer correction
       ↓
verification sign-off
       ↓
task decision
```

The extraction result is never considered official solely because Gemini generated it.

---

# 46. Frontend State Management

Use TanStack Query for:

- dashboard data
- workflow graph
- parcel lists
- officer tasks
- Passport
- compensation
- possession
- GIS metadata where appropriate

Use local React state for transient builder interaction.

Do not persist official workflow state in React.

The builder may maintain an unsaved draft state locally, but the backend remains authoritative whenever saved/validated/activated.

---

# 47. Workflow Builder Save Strategy

Recommended:

```text
User edits
   ↓
local canvas state
   ↓
Save Draft
   ↓
single validated backend mutation / patch batch
   ↓
server graph
```

Provide:

```text
Save
Validate
Discard unsaved changes
Activate
```

No activation from an unvalidated local canvas.

---

# 48. Builder Undo / UX Safety

Implement at least:

- undo
- redo
- confirmation for node deletion
- confirmation for activation
- unsaved changes indication

Undo/redo may be client-side in the builder, but saved results must be persisted through the backend.

---

# 49. BOSS Parcel Cohort Panel

When a node is selected, show:

```text
Cohort name
Officer
Unit
Parcel count
Total area
State
District
```

Parcel table:

```text
Select
Parcel ID
Survey Number
ULPIN
Village
Area
Status
```

Actions:

```text
Move
Select All
Clear
View Passport
```

After activation, this panel is read-only or unavailable to BOSS because BOSS leaves the project.

---

# 50. Project-Level V2 Page

Retain `/projects/:projectId` for Requesting Authority and authorized monitoring roles.

Add:

```text
Project Summary
Lifecycle Summary
Acquisition
Compensation
Possession
Map
Documents
Activity
Citizen Issues
```

Do not embed the full workflow builder here for ordinary roles.

---

# 51. Project View Drilldown

Project view should provide:

```text
Project Overview
Parcel Summary
Workflow Summary
GIS link
Compensation Summary
Possession Summary
Passport access
```

For BOSS before activation:

```text
Open V2 Workflow Builder
```

For BOSS after activation:

```text
No project access
```

---

# 52. Authorization Model

All V2 APIs must perform server-side scope checks.

Examples:

### National
```text
scope = all authorized records
```

### State
```text
state_id = user's state
```

### District
```text
district_id = user's district
```

### Requesting Authority
```text
project.requesting_authority_id = user.authority_id
```

### Officer
```text
task.assigned_to = user.id
```

Do not rely only on frontend route guards.

---

# 53. Backend Modules

Extend the existing modular backend:

```text
modules/
  auth/
  users/
  authorities/

  projects/
  parcels/
  proposals/

  workflows/
  workflow-templates/
  workflow-executions/
  workflow-tasks/

  documents/
  ai-processing/

  gis/

  compensation/
  possession/

  grievances/
  notifications/

  dashboards/
  audit/
  provenance/

  integrations/
    land-records/
    whatsapp/
```

Do not create separate backend microservices for dashboards, compensation, possession, or workflow.

The AI parser remains the existing dedicated service because it already exists in V1 and is deliberately isolated for asynchronous document processing.

---

# 54. Workflow Services

Recommended service responsibilities:

```text
WorkflowDefinitionService
WorkflowGraphService
WorkflowTemplateService
WorkflowCohortService
WorkflowValidationService
WorkflowActivationService
WorkflowExecutionService
WorkflowTaskService
```

Key invariant:

> No service outside the workflow domain should directly mutate graph topology.

Compensation and possession consume workflow execution assignments but do not edit the graph.

---

# 55. Dashboard Services

Implement server-side aggregation services:

```text
NationalDashboardService
StateDashboardService
DistrictDashboardService
```

All three should derive from common query helpers so definitions do not drift.

Example shared metrics:

```text
countProjects()
countParcels()
sumLandRequired()
sumLandAcquired()
sumCompensation()
countPossessionStates()
```

---

# 56. GIS Service

Recommended:

```text
GisScopeService
GisLayerService
GisFilterService
GisGeoJsonService
```

Every GIS query must first establish the user's authorization scope, then apply map filters.

---

# 57. Compensation Service

Recommended:

```text
CompensationAssessmentService
CompensationPaymentTrackingService
CompensationStatusService
```

Payment engine is out of scope.

The service only records and exposes status.

---

# 58. Possession Service

Recommended:

```text
PossessionReadinessService
PossessionEvidenceService
PossessionCompletionService
PossessionStatusService
```

Completion must trigger:

```text
audit
notification
acquisition lifecycle recomputation
Passport recomputation
dashboard consistency
```

---

# 59. Database Migration Strategy

Do not modify V1 tables recklessly.

Use new forward migrations.

Example sequence:

```text
004_v2_workflow_graph.sql
005_v2_workflow_execution.sql
006_v2_compensation.sql
007_v2_possession.sql
008_v2_dashboard_indexes.sql
009_v2_seed_data.sql
```

Actual migration numbering must follow the repository's existing sequence.

---

# 60. V1 Workflow Data Migration / Retirement

Before implementing the new builder:

1. identify V1 workflow tables used only by the old linear flow
2. identify shared tables that remain useful
3. stop new V1 workflow creation
4. preserve old records only if they are needed for audit/demo continuity
5. route all new V2 projects into the new graph model
6. avoid deleting historical V1 data without a migration strategy

The goal is:

```text
V1 historical records
        +
V2 execution engine
```

not:

```text
wipe database
rebuild from zero
```

---

# 61. V2 Seed Users

Keep the seed population minimal.

Minimum roles to demonstrate:

```text
1 Requesting Authority
1 BOSS
1 Processing / Acquisition Officer
1 Compensation Officer
1 Possession Officer
1 National Authority
1 State Authority
1 District Authority
```

Do not create many duplicate users.

Admin may remain as an internal seed role if the existing repository requires it, but it is not necessary for the main V2 story.

---

# 62. V2 Demo Project

Use one primary demo project.

Suggested conceptual name:

```text
Highway Expansion — Phase 2
```

Do not depend on this exact title if the repository already uses a different demo project identifier.

The demo should show:

```text
Project
 ├── State
 │    └── District
 │         └── Small parcel set
```

Then BOSS creates:

```text
District
├── Acquisition
│   ├── Cohort A
│   ├── Cohort B
│   └── Cohort C
├── Compensation
└── Possession
```

During the builder demo, at least one parcel should be moved from one sibling cohort to another.

---

# 63. Demo Data Consistency Rules

Every seeded parcel must have:

```text
state
district
geometry
project relationship
survey number
ULPIN where applicable
area
lifecycle status
```

For any parcel shown on:

- dashboard
- GIS
- Passport
- workflow execution
- compensation
- possession

the values must match.

---

# 64. V2 Demo Sequence

Recommended:

1. Log in as Requesting Authority.
2. Open an existing or newly created V1-style project request.
3. Show its project geometry and documents.
4. BOSS opens the request.
5. Show confirmed project parcels already present in the V2 seed hierarchy.
6. Open V2 Workflow Builder.
7. Show State → District starting structure.
8. Create Acquisition branch.
9. Create 2–3 Acquisition cohorts.
10. Move selected parcels between sibling cohorts.
11. Insert/attach Compensation template.
12. Insert/attach Possession template.
13. Assign minimal officers/units.
14. Validate graph.
15. Activate.
16. Show activation success.
17. Demonstrate that BOSS is out.
18. Log in as Acquisition Officer.
19. Execute an assigned parcel task.
20. Use the retained OCR/Gemini workflow.
21. Reject one task.
22. Requesting Authority sees the rejection.
23. Correct and resubmit.
24. Complete Acquisition execution as configured.
25. Open Compensation Officer.
26. Record assessment/payment.
27. Open Possession Officer.
28. Upload possession evidence.
29. Mark possession completed.
30. Show acquisition lifecycle becomes completed.
31. Open District Dashboard.
32. Show project/parcel/branch metrics.
33. Open District GIS.
34. Click a parcel.
35. Open Parcel Passport.
36. Switch to State / National dashboard views.
37. Show the same underlying totals.

---

# 65. Testing Strategy

## Unit tests

Test:

- graph creation
- graph deletion
- graph validation
- parcel movement
- sibling restrictions
- template insertion
- activation validation
- one-active-branch invariant
- compensation calculations
- possession completion
- acquisition completion
- dashboard metric functions

## Integration tests

Test:

```text
Requesting Authority
→ BOSS
→ Workflow Builder
→ Activate
→ Officer Task
→ Reject
→ Resubmit
→ Complete
→ Compensation
→ Possession
→ Dashboard
→ GIS
→ Passport
```

## Authorization tests

For every V2 role test:

- permitted reads
- prohibited reads
- permitted writes
- prohibited writes
- jurisdiction scope

---

# 66. Critical Invariants to Test

### Invariant 1
An activated workflow cannot be structurally modified.

### Invariant 2
BOSS cannot access an activated project through normal project APIs.

### Invariant 3
A parcel cannot belong to more than one active branch at one point in time.

### Invariant 4
An officer cannot execute another officer's task.

### Invariant 5
A dashboard cannot return data outside the user's jurisdiction.

### Invariant 6
Passport is read-only.

### Invariant 7
Gemini output is not official until human verification.

### Invariant 8
Compensation and possession records must be linked to real project/parcel records.

### Invariant 9
GIS and dashboards use the same underlying data.

### Invariant 10
Fabric failure does not roll back the business transaction.

---

# 67. Performance Requirements for V2

Because the V2 dataset is intentionally small, prioritize correctness and architecture.

Still implement:

- indexed project/parcel foreign keys
- indexed state/district fields
- indexed lifecycle status
- indexed task ownership
- spatial indexes on PostGIS geometry
- dashboard aggregation queries with predictable query plans
- server-side pagination for parcel/task tables
- GeoJSON filtering before sending data to the browser

Do not prematurely introduce distributed caching or extra microservices.

---

# 68. Error Handling

Use standardized API envelopes.

Success:

```json
{
  "data": {},
  "message": "Success",
  "requestId": "..."
}
```

Error:

```json
{
  "error": {
    "code": "WORKFLOW_ALREADY_ACTIVATED",
    "message": "The workflow cannot be modified after activation."
  },
  "requestId": "..."
}
```

Important V2 domain errors:

```text
WORKFLOW_ALREADY_ACTIVATED
WORKFLOW_NOT_VALID
PARCEL_ALREADY_ASSIGNED
INVALID_SIBLING_MOVE
NODE_DELETE_REQUIRES_CONFIRMATION
UNAUTHORIZED_WORKFLOW_EDIT
TASK_NOT_ASSIGNED_TO_USER
COMPENSATION_RECORD_NOT_FOUND
POSSESSION_RECORD_NOT_FOUND
INVALID_POSSESSION_TRANSITION
OUTSIDE_JURISDICTION
```

---

# 69. Frontend Error States

Builder:

- failed save
- failed validation
- activation conflict
- unauthorized mutation
- stale version

Officer:

- task unavailable
- document processing failure
- evidence upload failure
- concurrent task completion

Dashboard:

- partial service failure
- empty scope
- loading
- refresh

GIS:

- geometry load failure
- invalid filters
- unauthorized parcel

---

# 70. V2 Observability

Retain structured backend logging.

Log at minimum:

```text
requestId
userId
role
route
projectId
parcelId where relevant
workflowId where relevant
duration
error code
```

Do not log sensitive document content or raw citizen personal information unnecessarily.

---

# 71. Security

V2 retains the V1 security foundation and extends it.

Required:

- JWT authentication
- bcrypt password hashing for demo seed credentials where used
- server-side RBAC
- administrative scope enforcement
- Zod validation
- protected document access
- input sanitization
- signed/protected WhatsApp webhook handling
- no direct DB access from frontend
- no personal data on blockchain
- no legal ownership decisions by AI

---

# 72. Deferred Enterprise Capabilities

After V2:

```text
Real land-record providers
ULPIN integration
Cadastral integrations
PM Gati Shakti
Government identity federation
Payment integration
R&R
Risk engine
Anomaly detection
Delay prediction
Production reports
Mobile field application
Full national scalability
advanced provenance
```

Do not mix these into the V2 implementation contract unless required as compatibility interfaces.

---

# 73. Definition of Done — V2

V2 is complete only when:

```text
✓ V1 Requesting Authority project flow still works
✓ V1 parcel records remain usable
✓ Existing OCR/Gemini pipeline still works
✓ Existing evidence flow still works
✓ Existing notifications still work
✓ Existing WhatsApp/grievance flow still works
✓ New V2 workflow builder works visually
✓ BOSS can create arbitrary branching topology
✓ Every node can represent a parcel cohort
✓ Parcels can be moved between sibling cohorts
✓ Templates can be inserted contextually
✓ Compensation template is attached at District level
✓ Possession template is attached at District level
✓ Officers are assigned
✓ Workflow validation succeeds
✓ Activation freezes topology
✓ BOSS exits after activation
✓ Runtime tasks are generated
✓ Officer execution is parcel-level
✓ Same parcel cannot be active in multiple branches
✓ Acquisition rejection works
✓ Requesting Authority correction/resubmission works
✓ Compensation assessment/payment tracking works
✓ Possession evidence/completion works
✓ Possession completion updates acquisition lifecycle
✓ National dashboard is data-backed
✓ State dashboard is data-backed
✓ District dashboard is data-backed
✓ GIS layers use the same records
✓ Dashboard → Project → Parcel Passport drilldown works
✓ Passport is read-only
✓ Authorization works by jurisdiction/role
✓ Audit events exist for critical V2 actions
✓ Small seed dataset is internally consistent
✓ No dashboard contains hard-coded contradictory values
✓ V2 demo can be completed without manual DB edits
```

---

# 74. Final V2 Architecture

```text
                    REQUESTING AUTHORITY
                            |
                            v
                    EXISTING V1 PROJECT
                            |
                            v
                    BOSS PARCEL CONFIRMATION
                            |
                            v
                    V2 WORKFLOW BUILDER
                            |
             ┌──────────────┴──────────────┐
             |                             |
       WORKFLOW TOPOLOGY              COHORT ASSIGNMENT
             |                             |
             └──────────────┬──────────────┘
                            |
                      ACTIVATION
                            |
                     TOPOLOGY FROZEN
                            |
                            v
                  RUNTIME EXECUTION
                            |
       ┌────────────────────┼────────────────────┐
       |                    |                    |
  ACQUISITION          COMPENSATION          POSSESSION
       |                    |                    |
       v                    v                    v
  Parcel Tasks        Compensation Tasks   Possession Tasks
       |                    |                    |
       └────────────────────┼────────────────────┘
                            |
                            v
                     COMMON POSTGRESQL
                            |
       ┌────────────┬───────┼────────┬─────────────┐
       |            |       |        |             |
   Dashboards      GIS   Passport  Audit      Notifications
       |            |       |        |
       └────────────┴───────┴────────┴─────────────┘
                            |
                    Existing OCR / Gemini
                            |
                    Existing WhatsApp
                            |
                    Existing Provenance
```

The V2 architecture therefore extends the working V1 platform without throwing away completed infrastructure, while replacing the obsolete linear workflow core with a graph-based, cohort-driven, immutable-after-activation execution model.