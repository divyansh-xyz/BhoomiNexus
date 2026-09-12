-- V2 Graph Foundation Migration: Nodes, Edges, Cohort Assignments, Executions, Tasks, Compensation & Possession
-- Enables graph-based workflow engine, parcel cohorts, compensation tracking, and physical possession records.

-- 1. Extend existing workflow_instances table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_instances' AND column_name = 'version') THEN
    ALTER TABLE workflow_instances ADD COLUMN version INTEGER DEFAULT 2;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_instances' AND column_name = 'activated_by') THEN
    ALTER TABLE workflow_instances ADD COLUMN activated_by UUID REFERENCES users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflow_instances' AND column_name = 'activated_at') THEN
    ALTER TABLE workflow_instances ADD COLUMN activated_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 2. Extend land_parcels table with normalized lifecycle status attributes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'land_parcels' AND column_name = 'acquisition_status') THEN
    ALTER TABLE land_parcels ADD COLUMN acquisition_status VARCHAR(50) DEFAULT 'PROPOSED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'land_parcels' AND column_name = 'compensation_status') THEN
    ALTER TABLE land_parcels ADD COLUMN compensation_status VARCHAR(50) DEFAULT 'NOT_STARTED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'land_parcels' AND column_name = 'possession_status') THEN
    ALTER TABLE land_parcels ADD COLUMN possession_status VARCHAR(50) DEFAULT 'NOT_STARTED';
  END IF;
END $$;

-- 3. Create workflow_nodes table
CREATE TABLE IF NOT EXISTS workflow_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
  node_key VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  node_type VARCHAR(50) NOT NULL DEFAULT 'STAGE',
  responsible_role VARCHAR(100),
  responsible_unit_id UUID,
  responsible_user_id UUID REFERENCES users(id),
  configuration JSONB DEFAULT '{}'::jsonb,
  template_source VARCHAR(255),
  x_position FLOAT DEFAULT 0,
  y_position FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wf_nodes_instance ON workflow_nodes(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_nodes_type ON workflow_nodes(node_type);

-- 4. Create workflow_edges table
CREATE TABLE IF NOT EXISTS workflow_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
  source_node_id UUID REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  edge_type VARCHAR(50) DEFAULT 'STANDARD',
  condition JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wf_edges_instance ON workflow_edges(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_edges_source ON workflow_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_wf_edges_target ON workflow_edges(target_node_id);

-- 5. Create workflow_node_parcels table (design-time cohort assignment)
CREATE TABLE IF NOT EXISTS workflow_node_parcels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_node_id UUID REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES land_parcels(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workflow_node_id, parcel_id)
);

CREATE INDEX IF NOT EXISTS idx_wf_node_parcels_node ON workflow_node_parcels(workflow_node_id);
CREATE INDEX IF NOT EXISTS idx_wf_node_parcels_parcel ON workflow_node_parcels(parcel_id);

-- 6. Create workflow_executions table (runtime execution engine state)
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES land_parcels(id) ON DELETE CASCADE,
  node_id UUID REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'PENDING',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  attempt_number INTEGER DEFAULT 1,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wf_exec_instance ON workflow_executions(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_parcel ON workflow_executions(parcel_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_node ON workflow_executions(node_id);
CREATE INDEX IF NOT EXISTS idx_wf_exec_status ON workflow_executions(status);

-- 7. Create workflow_tasks table (runtime task instances generated from execution)
CREATE TABLE IF NOT EXISTS workflow_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'ASSIGNED',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_action_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wf_tasks_execution ON workflow_tasks(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_wf_tasks_assigned ON workflow_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_wf_tasks_status ON workflow_tasks(status);

-- 8. Create compensation_records table
CREATE TABLE IF NOT EXISTS compensation_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES land_parcels(id) ON DELETE CASCADE,
  beneficiary_reference VARCHAR(255),
  assessed_amount NUMERIC(15,2) DEFAULT 0,
  approved_amount NUMERIC(15,2) DEFAULT 0,
  paid_amount NUMERIC(15,2) DEFAULT 0,
  pending_amount NUMERIC(15,2) DEFAULT 0,
  payment_status VARCHAR(50) DEFAULT 'PENDING',
  payment_reference VARCHAR(255),
  payment_date DATE,
  remarks TEXT,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comp_project ON compensation_records(project_id);
CREATE INDEX IF NOT EXISTS idx_comp_parcel ON compensation_records(parcel_id);
CREATE INDEX IF NOT EXISTS idx_comp_status ON compensation_records(payment_status);

-- 9. Create possession_records table
CREATE TABLE IF NOT EXISTS possession_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  parcel_id UUID UNIQUE REFERENCES land_parcels(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'PENDING',
  taken_at TIMESTAMP WITH TIME ZONE,
  taken_by UUID REFERENCES users(id),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_poss_project ON possession_records(project_id);
CREATE INDEX IF NOT EXISTS idx_poss_parcel ON possession_records(parcel_id);
CREATE INDEX IF NOT EXISTS idx_poss_status ON possession_records(status);
