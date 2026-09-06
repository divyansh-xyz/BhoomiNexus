-- ============================================================
-- Phase 12 — Grievances & Citizen Objections Table
-- Supports Direct Web Requisitions & Meta WhatsApp Cloud API
-- ============================================================

CREATE TABLE IF NOT EXISTS grievances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_number VARCHAR(100) UNIQUE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES land_parcels(id) ON DELETE SET NULL,
  source VARCHAR(50) DEFAULT 'PORTAL', -- 'WHATSAPP', 'PORTAL', 'IN_PERSON'
  citizen_name VARCHAR(255),
  citizen_phone VARCHAR(50),
  citizen_phone_hash VARCHAR(128),
  citizen_reference VARCHAR(255),
  survey_number VARCHAR(100),
  wa_message_id VARCHAR(255),
  grievance_type VARCHAR(100) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'OPEN', -- 'OPEN', 'UNDER_REVIEW', 'RESPONDED', 'RESOLVED', 'CLOSED'
  resolution_notes TEXT,
  assigned_to UUID REFERENCES users(id),
  sla_days INTEGER DEFAULT 15,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_grievances_project ON grievances(project_id);
CREATE INDEX IF NOT EXISTS idx_grievances_status ON grievances(status);
CREATE INDEX IF NOT EXISTS idx_grievances_source ON grievances(source);
CREATE INDEX IF NOT EXISTS idx_grievances_wa_msg ON grievances(wa_message_id);
