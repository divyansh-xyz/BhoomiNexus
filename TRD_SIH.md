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

| Layer | Selected Technology |
|---|---|
| Web Frontend | React + TypeScript + Vite |
| Frontend Data Fetching / Server State | TanStack Query |
| Form Handling | React Hook Form |
| Validation | Zod |
| Backend | Node.js + TypeScript + Express |
| API Style | REST API |
| Primary Database | PostgreSQL |
| Spatial Database Extension | PostGIS |
| GIS Map | Leaflet + OpenStreetMap |
| Document Storage | Object Storage + external government repository references |
| OCR | Google Cloud Vision |
| NLP / Structured Extraction | Gemini API |
| Background Jobs | Redis + BullMQ |
| Blockchain | Hyperledger Fabric |
| Authentication | Government identity integration + application RBAC |
| Notifications | In-app + Email + WhatsApp where applicable |
| Citizen Channel | Meta WhatsApp Business Cloud API |

Hosting/cloud provider is intentionally not fixed in this document.

---

# 3. System Architecture

The platform should follow a modular service-oriented application structure without unnecessarily splitting everything into independent microservices.

Recommended logical architecture:

```text
                    GOVERNMENT WEB PLATFORM
                             |
                     React + TypeScript
                             |
                        REST API
                             |
                    Node.js + Express
                             |
        ------------------------------------------------
        |              |             |                 |
   Core Workflow   Project/Parcel   Documents      Analytics
        |              |             |                 |
        ------------------------------------------------
                             |
                      PostgreSQL + PostGIS
                             |
       -------------------------------------------------
       |                       |                       |
 Background Jobs        Integration Layer       Blockchain Layer
 Redis + BullMQ          Government APIs         Hyperledger Fabric
       |                       |                       |
 OCR / Gemini /          ULPIN / PM Gati        Audit & Provenance
 Notifications           Shakti / Land Systems
                             |
                     External Systems
                             |
              --------------------------------
              |                              |
       Government Systems              WhatsApp Cloud API
```

The architecture should keep the core application independent from individual external systems.

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

The AI feature is intended to reduce manual data entry from acquisition-related documents.

It must not replace official human approval.

## 13.1 Selected technology

### OCR
Google Cloud Vision

### NLP / structured extraction
Gemini API

No local LLM is required.

---

## 13.2 Processing flow

```text
PDF / Image Upload
        |
        v
Google Cloud Vision OCR
        |
        v
Extracted Text
        |
        v
Gemini API
        |
        v
Structured Fields
        |
        v
Backend Validation
        |
        v
Auto-filled Form
        |
        v
Authorized Officer Review
        |
        v
Official Record
```

---

## 13.3 Possible extracted fields

Depending on document type, the system may extract:

- Owner/affected person name
- Survey/Khasra number
- ULPIN where present
- Village
- District
- State
- Land area
- Notification number
- Notification date
- Award number
- Award date
- Compensation amount
- Authority name
- Project reference
- Other configured fields

The exact fields should depend on document type.

---

## 13.4 Processing behavior

Document processing is automatic after upload.

The user should not have to manually start processing.

The user may manually retry/reprocess a document if:

- OCR failed
- AI extraction failed
- The document was unreadable
- The wrong document type was selected
- A processing service failed

AI results are not automatically considered official.

The authorized officer must review and approve extracted data before it becomes part of the official record.

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

There is no citizen role in the main web application.

Citizens interact with the system through WhatsApp.

## Selected technology

> Meta WhatsApp Business Cloud API

The main web platform remains for government users.

Citizen interaction:

```text
Landowner
   |
WhatsApp
   |
Meta WhatsApp Cloud API
   |
Backend
   |
Project / Parcel / Grievance / Compensation Record
```

## 15.1 Supported citizen interactions

Citizens should be able to:

- Ask for compensation status
- Receive acquisition updates
- Submit objections
- Submit grievances
- Upload documents/images
- Receive notifications
- Receive acknowledgement/reference numbers
- Track submitted objections or grievances

Voice messages are not part of the current requirement.

The system must connect citizen submissions to the appropriate project, parcel, or case where identity and record matching can be established.

---

# 16. Notifications and Alerts

Notifications should be delivered through:

- In-app notifications
- Email
- WhatsApp where appropriate

SMS is not required in the current scope.

## 16.1 Rule-based alerts

The system should generate alerts for events such as:

- Approaching deadline
- SLA exceeded
- Approval pending too long
- Compensation pending beyond configured duration
- R&R milestone overdue
- Required document missing
- Required workflow action not completed

Notifications and alerts should be driven by configurable rules where appropriate.

Predictive AI alerts are not part of the core requirement.

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

## Selected stack

- React
- TypeScript
- Vite
- TanStack Query
- React Hook Form
- Zod

The frontend must support:

- Responsive government dashboard
- Role-based navigation
- Project management
- Parcel management
- Workflow screens
- Document upload
- AI extraction review
- GIS map
- Tables and filters
- Notifications
- Reports
- Risk score views

The frontend should use REST APIs rather than directly accessing the database.

---

# 23. Backend Technical Requirements

## Selected stack

- Node.js
- TypeScript
- Express

The backend is responsible for:

- REST API
- Authentication integration
- RBAC enforcement
- Workflow engine
- Project/parcel management
- Document metadata
- AI processing orchestration
- Government API integration
- WhatsApp integration
- Notifications
- Risk scoring
- Audit logging
- Blockchain interaction

The backend must validate all important input before writing official data.

---

# 24. REST API

The application will use REST APIs.

Example resource groups:

```text
/auth
/users
/projects
/parcels
/workflows
/workflow-stages
/documents
/document-processing
/compensation
/possession
/rr
/grievances
/notifications
/risks
/reports
/integrations
/audit
```

Exact endpoint naming is an implementation detail, but APIs should follow consistent resource-based conventions.

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
                         USERS
                           |
             -----------------------------
             |                           |
       Government Users                Citizens
             |                           |
       React Web App                  WhatsApp
             |                           |
             └──────────────┬────────────┘
                            |
                       REST API
                            |
                   Node.js + Express
                            |
      -------------------------------------------------
      |              |              |                 |
   Workflow       Projects       Documents        Analytics
      |              |              |                 |
      -------------------------------------------------
                            |
                  PostgreSQL + PostGIS
                            |
        ------------------------------------------------
        |                    |                         |
   Redis + BullMQ      Integration Layer       Hyperledger Fabric
        |                    |                         |
  OCR / Gemini       ULPIN / PM Gati Shakti      Provenance
  Notifications      Land / Cadastral APIs       Audit Anchors
                            |
                      External Systems

Document files
        |
        v
Object Storage
        |
PostgreSQL stores metadata, permissions,
versions, references and hashes
```

---

# 38. Locked Decisions

The following decisions are considered final for the current technical plan unless a later requirement forces a change:

- React + TypeScript + Vite
- TanStack Query
- React Hook Form + Zod
- Node.js + TypeScript + Express
- REST API
- PostgreSQL + PostGIS
- Leaflet + OpenStreetMap
- Hybrid object storage + external government document references
- Google Cloud Vision
- Gemini API
- No local LLM
- Redis + BullMQ
- Hyperledger Fabric
- PostgreSQL audit log + Fabric provenance
- Government identity integration + RBAC
- Meta WhatsApp Business Cloud API
- In-app + Email + WhatsApp notifications
- Governed configurable workflow engine
- Hybrid project + parcel data model
- Bidirectional government integrations through an integration/API gateway layer
- Manual stage completion by responsible officers
- Automatic overall project/parcel completion calculation
- Workflow progress + parcel progress shown separately
- Risk scores at project + parcel levels
- Compensation tracking, not compensation calculation
- Citizen web role removed
- Citizen communication through WhatsApp
- GIS used primarily for project-level monitoring, not parcel editing
- No WebSockets required
- Predictive analytics not part of core scope
- Hosting provider intentionally left open
