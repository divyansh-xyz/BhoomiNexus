/**
 * ============================================================
 * Phase 5: Workflow Template & Project Workflow Types
 * Specifications from Phase Implementation.md (Section 12)
 * ============================================================
 */

export interface GovernmentOfficer {
  id: string;
  name: string;
  designation: string;
  department: string;
  cadre: string;
  email: string;
  phone: string;
  officeLocation: string;
}

export interface WorkflowStageTemplate {
  id: string;
  order: number;
  name: string;
  description: string;
  department: string;
  assignedRole: string;
  defaultSlaDays: number;
  isMandatory: boolean;
  requiredDocuments: string[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  category: 'LINEAR_HIGHWAY' | 'METRO_TRANSIT' | 'FREIGHT_CORRIDOR' | 'INDUSTRIAL_ZONE';
  description: string;
  statutoryAct: string;
  defaultStages: WorkflowStageTemplate[];
}

export interface WorkflowStageInstance {
  id: string;
  order: number;
  name: string;
  description: string;
  department: string;
  assignedRole: string;
  assignedOfficer?: GovernmentOfficer;
  assignedOfficerId?: string;
  slaDays: number;
  isMandatory: boolean;
  requiredDocuments: string[];
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'SKIPPED' | 'REJECTED';
}

export interface ProjectWorkflowInstance {
  projectId: string;
  templateId: string;
  templateName: string;
  status: 'DRAFT' | 'ACTIVATED' | 'ACTIVE';
  activatedAt?: string;
  activatedBy?: string;
  stages: WorkflowStageInstance[];
}

export interface WorkflowActivationResponse {
  projectId: string;
  workflowStatus: 'ACTIVATED';
  activeStageId: string;
  firstTaskId: string;
  assignedOfficerName: string;
  auditTimestamp: string;
}
