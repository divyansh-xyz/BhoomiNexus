-- ============================================================
-- BhoomiNexus — Schema (Phases 0–8)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Phase 0 — Foundation tables
-- ============================================================

-- Table: roles
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role_id VARCHAR(50) REFERENCES roles(id),
  department VARCHAR(255),
  designation VARCHAR(255),
  cadre VARCHAR(255),
  phone VARCHAR(50),
  office_location VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: states
CREATE TABLE IF NOT EXISTS states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  boundary GEOMETRY(MultiPolygon, 4326),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: districts
CREATE TABLE IF NOT EXISTS districts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_id UUID REFERENCES states(id) ON DELETE CASCADE,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  user_role VARCHAR(50),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  project_id UUID,
  parcel_id UUID,
  source VARCHAR(100) DEFAULT 'SYSTEM',
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_project ON audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ============================================================
-- Phase 3 — Projects
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  project_type VARCHAR(100),
  scope TEXT,
  statutory_purpose TEXT,
  rfctlarr_section VARCHAR(100),
  ministry VARCHAR(255),
  proponent_authority VARCHAR(255),
  nodal_officer_name VARCHAR(255),
  nodal_officer_designation VARCHAR(255),
  nodal_officer_department VARCHAR(255),
  nodal_officer_email VARCHAR(255),
  nodal_officer_phone VARCHAR(100),
  nodal_officer_address TEXT,
  state VARCHAR(100),
  district VARCHAR(100),
  corridor_km NUMERIC(10,2),
  alignment_width_meters NUMERIC(10,2),
  requested_area_acres NUMERIC(12,2),
  requested_area_ha NUMERIC(12,2),
  estimated_budget_cr NUMERIC(12,2),
  target_completion_date DATE,
  description TEXT,
  status VARCHAR(50) DEFAULT 'DRAFT',
  created_by UUID REFERENCES users(id),
  sla_deadline DATE,
  submission_date TIMESTAMP WITH TIME ZONE,
  candidate_parcels_count INTEGER DEFAULT 0,
  selected_parcels_count INTEGER DEFAULT 0,
  confirmed_area_acres NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_state ON projects(state);

-- Table: project_geometry
CREATE TABLE IF NOT EXISTS project_geometry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  geometry GEOMETRY(Geometry, 4326),
  corridor_coordinates JSONB,
  bounds JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_geometry_spatial ON project_geometry USING GIST(geometry);

-- ============================================================
-- Phase 4 — Land Parcels
-- ============================================================

CREATE TABLE IF NOT EXISTS land_parcels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ulpin VARCHAR(50),
  survey_number VARCHAR(100),
  owner_reference VARCHAR(500),
  village VARCHAR(255),
  district VARCHAR(255),
  state VARCHAR(255),
  area_acres NUMERIC(12,4),
  area_ha NUMERIC(12,4),
  land_type VARCHAR(50),
  geometry GEOMETRY(Polygon, 4326),
  market_rate_per_acre NUMERIC(14,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_land_parcels_spatial ON land_parcels USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_land_parcels_ulpin ON land_parcels(ulpin);
CREATE INDEX IF NOT EXISTS idx_land_parcels_survey ON land_parcels(survey_number);

-- Table: project_parcels (join table linking projects to confirmed parcels)
CREATE TABLE IF NOT EXISTS project_parcels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES land_parcels(id) ON DELETE CASCADE,
  status VARCHAR(30) DEFAULT 'CANDIDATE',
  intersect_percent NUMERIC(5,2),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, parcel_id)
);

CREATE INDEX IF NOT EXISTS idx_project_parcels_project ON project_parcels(project_id);

-- Table: land_record_imports
CREATE TABLE IF NOT EXISTS land_record_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  provider VARCHAR(100) DEFAULT 'MOCK',
  status VARCHAR(50) DEFAULT 'PENDING',
  candidate_count INTEGER DEFAULT 0,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

-- ============================================================
-- Phase 5 — Workflow Templates
-- ============================================================

CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  statutory_act VARCHAR(255),
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_template_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES workflow_templates(id) ON DELETE CASCADE,
  stage_order INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  department VARCHAR(255),
  assigned_role VARCHAR(50),
  default_sla_days INTEGER DEFAULT 7,
  is_mandatory BOOLEAN DEFAULT true,
  required_documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wf_template_stages_template ON workflow_template_stages(template_id);

-- ============================================================
-- Phase 5 & 6 — Workflow Instances
-- ============================================================

CREATE TABLE IF NOT EXISTS workflow_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  template_id UUID REFERENCES workflow_templates(id),
  template_name VARCHAR(255),
  status VARCHAR(30) DEFAULT 'DRAFT',
  activated_at TIMESTAMP WITH TIME ZONE,
  activated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_instance_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
  stage_order INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  department VARCHAR(255),
  assigned_role VARCHAR(50),
  assigned_officer_id UUID REFERENCES users(id),
  sla_days INTEGER DEFAULT 7,
  is_mandatory BOOLEAN DEFAULT true,
  required_documents JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(30) DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wf_instance_stages_workflow ON workflow_instance_stages(workflow_id);

-- ============================================================
-- Phase 6 — Tasks
-- ============================================================

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES workflow_instance_stages(id) ON DELETE CASCADE,
  stage_order INTEGER,
  stage_name VARCHAR(255),
  assigned_officer_id UUID REFERENCES users(id),
  department VARCHAR(255),
  sla_days INTEGER DEFAULT 7,
  due_date DATE,
  status VARCHAR(30) DEFAULT 'ASSIGNED',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  required_documents JSONB DEFAULT '[]'::jsonb,
  evidence_documents JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_officer ON tasks(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ============================================================
-- Phase 8 — Documents
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES land_parcels(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  document_type VARCHAR(100),
  file_path VARCHAR(1000) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  hash VARCHAR(128),
  uploader_id UUID REFERENCES users(id),
  workflow_stage VARCHAR(255),
  processing_status VARCHAR(50) DEFAULT 'PENDING',
  verification_status VARCHAR(50) DEFAULT 'UNVERIFIED',
  current_version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_task ON documents(task_id);

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_size BIGINT,
  hash VARCHAR(128),
  uploader_id UUID REFERENCES users(id),
  change_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doc_versions_document ON document_versions(document_id);
