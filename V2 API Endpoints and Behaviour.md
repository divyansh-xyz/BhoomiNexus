# V2 API Endpoints and Behaviour

## Convention
**Base:** `/api/v1`

**Success**
```json
{"data":{},"message":"Success","requestId":"..."}
```

**Error**
```json
{"error":{"code":"ERROR_CODE","message":"Human-readable message"},"requestId":"..."}
```

## Authentication

### `POST /api/v1/auth/login`
Authenticates the government/demo user and returns identity, role, authority/department scope, permissions, and token/session.

### `POST /api/v1/auth/logout`
Ends the authenticated session/token according to the existing authentication layer.

### `GET /api/v1/auth/me`
Returns the current user's identity, role, authority/department, administrative scope, and permissions.

### `POST /api/v1/auth/refresh`
Refreshes the authenticated session/token where supported.

## Requesting Authority — Projects

### `GET /api/v1/dashboard/requesting-authority`
Returns Requesting Authority dashboard data scoped to the authority's own projects.

### `GET /api/v1/projects?mine=true`
Returns projects owned/requested by the authenticated Requesting Authority.

### `POST /api/v1/projects`
Creates a project request in PostgreSQL.

### `GET /api/v1/projects/:projectId`
Returns authorized project details, progress, lifecycle information, documents, actions, and relevant project data.

### `PATCH /api/v1/projects/:projectId`
Updates an editable project request before backend lifecycle locking applies.

### `POST /api/v1/projects/:projectId/geometry`
Stores/updates the project's boundary or corridor geometry.

### `POST /api/v1/projects/:projectId/documents`
Uploads and links an initial project document.

### `POST /api/v1/projects/:projectId/submit`
Submits the project request and places it into the BOSS review/configuration flow.

### `GET /api/v1/projects/:projectId/actions`
Returns Requesting Authority action items, including rejected information requiring correction.

### `POST /api/v1/projects/:projectId/workflow-stages/:stageId/resubmit`
Resubmits a rejected operational stage after correction; the same stage becomes actionable again without BOSS intervention.

### `GET /api/v1/projects/:projectId/grievances`
Returns citizen grievances/objections linked to the authorized project.

## Documents

### `POST /api/v1/documents/upload`
Uploads a document, creates metadata, stores the file, computes its hash, and links it to the relevant project/parcel/workflow context.

### `GET /api/v1/documents/:documentId`
Returns authorized document metadata, status, version, and related context.

### `GET /api/v1/documents/:documentId/versions`
Returns immutable document version history.

### `POST /api/v1/documents/:documentId/versions`
Creates a new document version without overwriting older versions.

### `GET /api/v1/documents/:documentId/download`
Returns/streams the authorized document.

### `POST /api/v1/documents/:documentId/process`
Starts document processing; in normal flow processing is triggered automatically after upload.

### `GET /api/v1/documents/:documentId/processing`
Returns current OCR/document-processing status.

### `GET /api/v1/documents/:documentId/extraction`
Returns OCR/Gemini extraction status, structured fields, confidence, and verification state.

### `POST /api/v1/documents/:documentId/verify`
Records authorized human verification/correction of AI-extracted information. AI output becomes official only after human verification.

## BOSS — Review and Parcel Determination

### `GET /api/v1/boss/dashboard`
Returns BOSS queue and initialization/configuration metrics.

### `GET /api/v1/boss/requests`
Returns incoming project requests requiring BOSS review/configuration.

### `GET /api/v1/boss/projects/:projectId`
Returns authorized project request, initial documents, geometry, required land area, and configuration context.

### `POST /api/v1/boss/projects/:projectId/land-records/fetch`
Invokes the configured land-record provider (mock for the prototype) to obtain candidate parcels.

### `GET /api/v1/boss/projects/:projectId/land-records`
Returns fetched candidate land-record results.

### `POST /api/v1/boss/projects/:projectId/parcels/confirm`
Persists the BOSS-selected parcel set as confirmed project parcels.

## Land-Record Integration

### `POST /api/v1/integrations/land-records/search`
Searches the configured land-record provider through the integration boundary.

### `GET /api/v1/integrations/land-records/requests/:requestId`
Returns a land-record integration request status/result.

# V2 Workflow

### `GET /api/v1/projects/:projectId/workflow`
Returns the V2 workflow graph: nodes, edges, responsibilities, design metadata, and design-time cohort information available to authorized BOSS users before activation.

### `GET /api/v1/projects/:projectId/workflow/stages`
Compatibility/read endpoint for workflow stage information. It must not drive the obsolete V1 linear workflow model.

### `POST /api/v1/projects/:projectId/workflow/initialize`
Initializes the editable V2 workflow graph for the project, including the standard District-level Acquisition, Compensation, and Possession starting structure.

### `PUT /api/v1/projects/:projectId/workflow`
Saves a complete V2 workflow-design update/batch from the visual builder while the workflow remains editable.

### `POST /api/v1/projects/:projectId/workflow/nodes`
Creates a workflow node.

### `PATCH /api/v1/projects/:projectId/workflow/nodes/:nodeId`
Updates editable node properties such as name, responsibility, configuration, and position.

### `DELETE /api/v1/projects/:projectId/workflow/nodes/:nodeId`
Deletes the node and descendant topology according to the V2 node-deletion rule; directly assigned parcels are merged to the deterministic sibling, while descendant parcels are not silently reassigned.

### `POST /api/v1/projects/:projectId/workflow/nodes/:nodeId/split`
Splits a node into new sibling branch/cohort nodes. Newly created branches start empty.

### `GET /api/v1/projects/:projectId/workflow/nodes/:nodeId/parcels`
Returns parcels assigned to the selected workflow node/cohort during design.

### `POST /api/v1/projects/:projectId/workflow/edges`
Creates a directed workflow edge.

### `DELETE /api/v1/projects/:projectId/workflow/edges/:edgeId`
Deletes a workflow edge.

### `POST /api/v1/projects/:projectId/workflow/cohorts/move-parcels`
Moves one or more parcels between valid sibling workflow cohorts during BOSS design. The backend prevents duplicate active cohort membership.

### `POST /api/v1/projects/:projectId/workflow/cohorts/assign`
Assigns parcel membership to a workflow cohort if implemented as a separate operation.

### `DELETE /api/v1/projects/:projectId/workflow/cohorts/:nodeId/parcels/:parcelId`
Removes a parcel from a cohort during editable design if exposed separately.

### `GET /api/v1/workflow-templates`
Returns reusable workflow templates/fragments.

### `GET /api/v1/workflow-templates/:templateId`
Returns one reusable template definition.

### `GET /api/v1/workflow-templates/contextual?projectId=:projectId&nodeId=:nodeId`
Returns templates relevant to the selected node/officer/unit context.

### `POST /api/v1/projects/:projectId/workflow/nodes/:nodeId/templates/preview`
Previews template insertion without changing the saved graph.

### `POST /api/v1/projects/:projectId/workflow/nodes/:nodeId/templates/apply`
Copies the selected template fragment into the project workflow; the inserted fragment remains editable until activation.

### `POST /api/v1/projects/:projectId/workflow/validate`
Validates graph integrity, assignments, parcel allocation, template fragments, and activation readiness without activating.

### `POST /api/v1/projects/:projectId/workflow/activate`
Atomically validates and activates the V2 workflow, freezes the topology, creates runtime execution/tasks, records audit, sends required notifications, and ends BOSS participation.

### `GET /api/v1/projects/:projectId/workflow/execution`
Returns authorized runtime execution records and task state generated from the activated topology.

## Runtime Tasks

### `GET /api/v1/tasks?assignedTo=me`
Returns only tasks assigned to the authenticated operational user.

### `GET /api/v1/tasks/:taskId`
Returns the task plus relevant project, parcel, document, and evidence context.

### `POST /api/v1/tasks/:taskId/start`
Starts an assigned actionable task and records the state transition/timestamp.

### `POST /api/v1/tasks/:taskId/accept`
Completes the task/stage, updates runtime state, creates audit/notifications, and routes the next configured parcel-level execution where applicable.

### `POST /api/v1/tasks/:taskId/reject`
Rejects the task with a mandatory reason, records the rejection, notifies the Requesting Authority, and creates the correction/resubmission action.

### `POST /api/v1/tasks/:taskId/evidence`
Uploads and links evidence such as digital documents, hard-copy scans, or photos.

### `GET /api/v1/tasks/:taskId/evidence`
Returns evidence linked to the authorized task.

## GIS

### `GET /api/v1/gis/projects`
Returns authorized project GIS data.

### `GET /api/v1/gis/projects/:projectId`
Returns project GIS data including project and parcel geometry/status.

### `GET /api/v1/projects/:projectId/parcels`
Returns authorized project parcels.

### `GET /api/v1/parcels/:parcelId`
Returns authorized parcel/Passport data.

### `GET /api/v1/parcels/:parcelId/geometry`
Returns parcel geometry for authorized map rendering.

### `GET /api/v1/gis/national`
Returns nationwide GIS data within the user's national monitoring scope.

### `GET /api/v1/gis/states/:stateId`
Returns state-scoped GIS data subject to authorization.

### `GET /api/v1/gis/districts/:districtId`
Returns district-scoped GIS data subject to authorization.

### `GET /api/v1/gis/parcels/:parcelId`
Returns map-ready geometry and lifecycle properties for an authorized parcel.

**V2 layers:** Project Boundary, Parcel Boundaries, Proposed, Notified, Acquired, Compensation Pending, Compensation Paid, Possession Pending, Possession Completed, Disputed.

**V2 filters:** state, district, project, lifecycle, parcel status, workflow branch/unit.

## Dashboards

### `GET /api/v1/dashboards/national`
Returns national metrics derived from the shared dataset: states, districts, projects, parcels, land, acquisition, compensation, and possession.

### `GET /api/v1/dashboards/state/:stateId`
Returns state-scoped monitoring metrics and district comparison data.

### `GET /api/v1/dashboards/district/:districtId`
Returns district projects, parcels, land, acquisition stages/pending work, compensation, possession, and branch/unit breakdown.

### `GET /api/v1/dashboards/national/states`
Returns state aggregates for national comparison/drilldown.

### `GET /api/v1/dashboards/state/:stateId/districts`
Returns district aggregates for state comparison/drilldown.

### `GET /api/v1/dashboards/district/:districtId/projects`
Returns project-level aggregates for the district dashboard.

## Compensation V2

### `GET /api/v1/compensation/dashboard`
Returns Compensation Officer work metrics and authorized compensation summary.

### `GET /api/v1/compensation/tasks?assignedTo=me`
Returns compensation tasks assigned to the authenticated Compensation Officer.

### `GET /api/v1/compensation/records/:recordId`
Returns an authorized compensation record.

### `POST /api/v1/compensation/records`
Creates a compensation record for an authorized project/parcel/beneficiary.

### `PATCH /api/v1/compensation/records/:recordId`
Updates permitted assessment, approval, payment, pending amount, status, reference, date, or remarks.

### `POST /api/v1/compensation/records/:recordId/mark-paid`
Records tracked compensation as paid and updates permitted payment fields.

### `POST /api/v1/compensation/tasks/:taskId/complete`
Completes an assigned Compensation Officer task after required tracking work is recorded.

## Possession V2

### `GET /api/v1/possession/dashboard`
Returns Possession Officer work metrics and authorized possession summary.

### `GET /api/v1/possession/tasks?assignedTo=me`
Returns possession tasks assigned to the authenticated Possession Officer.

### `GET /api/v1/possession/records/:recordId`
Returns an authorized possession record and its evidence/status context.

### `POST /api/v1/possession/records/:recordId/evidence`
Uploads/links possession evidence, photos, or documents.

### `POST /api/v1/possession/records/:recordId/complete`
Marks possession completed after the officer performs the action and submits evidence; updates possession, audit, notifications, acquisition lifecycle, GIS, dashboard, and Passport views through shared data.

## Grievances

### `GET /api/v1/grievances`
Returns grievances visible to the authenticated user according to project/jurisdiction permissions.

### `GET /api/v1/grievances/:grievanceId`
Returns one authorized grievance with project/parcel context and attachments.

### `POST /api/v1/grievances/:grievanceId/respond`
Records an authorized response.

### `POST /api/v1/grievances/:grievanceId/close`
Closes an authorized grievance and records the lifecycle change.

### `GET /api/v1/projects/:projectId/grievances`
Returns grievances linked to an authorized project. WhatsApp-created grievances use the same PostgreSQL grievance records.

## Notifications

### `GET /api/v1/notifications`
Returns notifications for the authenticated user.

### `PATCH /api/v1/notifications/:notificationId/read`
Marks one notification as read.

### `POST /api/v1/notifications/mark-all-read`
Marks all eligible notifications as read.

### `DELETE /api/v1/notifications/:notificationId`
Removes an eligible notification from the user's notification view.

## WhatsApp

### `POST /api/v1/integrations/whatsapp/webhook`
Receives and validates Meta WhatsApp webhook events and routes text/interactive messages through the WhatsApp conversation service.

### `POST /api/v1/integrations/whatsapp/send`
Internal backend endpoint for sending WhatsApp messages through the configured service.

### `GET /api/v1/integrations/whatsapp/status`
Returns exposed WhatsApp integration status/configuration.

### `POST /api/v1/integrations/whatsapp/simulate`
Development endpoint that simulates incoming WhatsApp text/interactive replies using the same backend conversation and grievance path.

## Audit

### `GET /api/v1/audit/projects/:projectId`
Returns authorized project audit history.

### `GET /api/v1/audit/documents/:documentId`
Returns audit events for an authorized document.

### `GET /api/v1/audit/events/:eventId`
Returns one audit event with actor, action, entity, old/new values, metadata, and timestamp.

### `GET /api/v1/audit/provenance/:eventId`
Returns provenance/Fabric status associated with an audit event.

## Reports / Future-Compatible

### `GET /api/v1/reports/projects`
Returns authorized project report data.

### `GET /api/v1/reports/progress`
Returns authorized workflow/project progress report data.

### `GET /api/v1/reports/risk`
Reserved for later risk functionality; not part of V2 behaviour.

### `GET /api/v1/reports/audit`
Returns authorized audit report data.

## Legacy V1 Workflow Endpoints That Must Not Drive V2

### `PUT /api/v1/projects/:projectId/workflow/stages/:stageId`
V1 linear-stage mutation endpoint. Superseded by V2 node updates.

### `POST /api/v1/projects/:projectId/workflow/stages`
V1 linear-stage creation endpoint. Superseded by V2 node creation.

### `DELETE /api/v1/projects/:projectId/workflow/stages/:stageId`
V1 linear-stage deletion endpoint. Superseded by V2 node deletion.

## Global Behaviour Rules

- All protected endpoints enforce server-side authentication and role/jurisdiction scope.
- National Authority is monitor-only nationwide.
- State Authority is monitor-only inside the user's state.
- District Authority is monitor-only inside the user's district.
- Requesting Authority is limited to projects it requested.
- Operational officers are limited to their assigned tasks/work.
- BOSS may modify the workflow only before activation.
- After activation, BOSS has no normal project access and workflow topology is immutable.
- A parcel cannot belong to more than one active workflow branch at the same point in time.
- Runtime execution state is stored in workflow execution/task records; a continuously updated parcel `current_cohort` field is not the source of truth.
- Dashboard, GIS, Project, Compensation, Possession, and Passport endpoints use the same underlying PostgreSQL data.
- Passport is read-only.
- Gemini output remains non-official until human verification.
- Hyperledger/Fabric provenance is asynchronous and never blocks the core business transaction.
- V2 excludes R&R, Risk, Delay Prediction, Anomaly Detection, and related GIS layers.
