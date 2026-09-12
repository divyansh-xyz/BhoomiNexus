/**
 * ============================================================
 * Phase 6: BOSS Exit & Workflow Task Engine Types
 * Aligned with API Contract & Ownership Document.md (Section 17, 18, 19)
 * and Phase Implementation.md (Section 13)
 * ============================================================
 */

import type { GovernmentOfficer, WorkflowStageInstance } from './workflow.types';

export type TaskStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'ACCEPTED' | 'REJECTED';

export type StageExecutionStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'REJECTED' | 'SKIPPED';

export interface TaskEvidenceItem {
  id: string;
  taskId: string;
  fileName: string;
  fileSize?: string;
  fileType?: string;
  uploadedAt: string;
  uploadedBy: string;
  evidenceType: 'GROUND_PHOTO' | 'PANCHNAMA' | 'CADASTRAL_MAP' | 'REVENUE_EXTRACT' | 'OTHER';
  url?: string;
  hash?: string;
  verified?: boolean;
}

export interface TaskVerificationAffirmations {
  boundaryAffirmed: boolean;
  khasraSurveyAffirmed: boolean;
  ownershipLedgerAffirmed: boolean;
  noEncumbranceAffirmed: boolean;
  officerRemarks?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

/**
 * Phase 11: WorkflowTask for V2 Acquisition Execution
 * Includes all 10 statutory items:
 * 1. Parcel, 2. Workflow node, 3. Project, 4. State, 5. District,
 * 6. Cohort context, 7. Required documents, 8. Evidence, 9. OCR, 10. Verification
 */
export interface WorkflowTask {
  id: string;
  projectId: string;
  projectCode: string;
  projectTitle: string;
  ministry?: string;
  statutoryPurpose?: string;
  state?: string;
  district?: string;

  // 1. Parcel Details
  parcel?: {
    id: string;
    ulpin?: string;
    khasraNumber: string;
    village: string;
    areaAcres: number;
    tenureType?: string;
    disputed?: boolean;
  };
  relevantParcels?: Array<{
    id: string;
    surveyNumber: string;
    village: string;
    area: string;
  }>;

  // 2. Workflow Node Details
  stageId: string;
  stageOrder: number;
  stageName: string;
  workflowNode?: {
    id: string;
    name: string;
    type: string;
    branchType: 'ACQUISITION' | 'COMPENSATION' | 'POSSESSION' | 'GATE';
    responsibility: string;
    slaDays: number;
  };

  // 6. Cohort Context
  cohortContext?: {
    unitName: string;
    cohortBranch: string;
    siblingNodes?: { id: string; name: string; branch: string }[];
    cohortParcelCount: number;
  };

  assignedOfficer: GovernmentOfficer;
  department: string;
  slaDays: number;
  dueDate: string;
  status: TaskStatus;
  startedAt?: string;
  completedAt?: string;
  rejectionReason?: string;
  previousStageNotes?: string;

  // 7. Required Documents
  requiredDocuments: Array<{
    id: string;
    name: string;
    type: string;
    mandatory?: boolean;
    status: 'MISSING' | 'UPLOADED' | 'VERIFIED';
    templateUrl?: string;
  }>;

  // 8. Evidence
  evidenceDocuments?: string[];
  evidence?: TaskEvidenceItem[];

  // 9. OCR Intelligence
  ocrExtraction?: {
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    confidenceScore?: number;
    extractedFields?: Record<string, { value: string; confidence: number }>;
    discrepancies?: string[];
  };

  // 10. Human Verification
  verification?: {
    status: 'UNVERIFIED' | 'VERIFIED' | 'DISCREPANCY_NOTED';
    affirmations?: TaskVerificationAffirmations;
    verifiedBy?: string;
    verifiedAt?: string;
  };

  createdAt: string;
}

export type TaskAuditEventType =
  | 'WORKFLOW_ACTIVATED'
  | 'TASK_ASSIGNED'
  | 'TASK_STARTED'
  | 'TASK_ACCEPTED'
  | 'TASK_REJECTED'
  | 'STAGE_RESUBMITTED'
  | 'WORKFLOW_COMPLETED';

export interface TaskAuditEvent {
  id: string;
  projectId: string;
  taskId?: string;
  stageOrder: number;
  stageName: string;
  eventType: TaskAuditEventType;
  performedBy: string;
  officerRole?: string;
  details: string;
  timestamp: string;
  rejectionReason?: string;
}

export interface WorkflowProgressSummary {
  projectId: string;
  totalStages: number;
  completedStages: number;
  currentStageIndex: number;
  currentStageName: string;
  currentStageStatus: StageExecutionStatus;
  percentage: number;
  currentOfficerName: string;
  currentOfficerRole: string;
  status: 'ACTIVE' | 'REJECTED' | 'COMPLETED';
}

export interface TaskAcceptResponse {
  task: WorkflowTask;
  completedStage: WorkflowStageInstance;
  nextStage?: WorkflowStageInstance;
  nextTask?: WorkflowTask;
  isWorkflowCompleted: boolean;
  auditEvent: TaskAuditEvent;
}

export interface TaskRejectResponse {
  task: WorkflowTask;
  rejectedStage: WorkflowStageInstance;
  auditEvent: TaskAuditEvent;
}

export interface StageResubmitPayload {
  explanation: string;
  correctedDocuments?: string[];
}

export interface StageResubmitResponse {
  stage: WorkflowStageInstance;
  task: WorkflowTask;
  auditEvent: TaskAuditEvent;
}
