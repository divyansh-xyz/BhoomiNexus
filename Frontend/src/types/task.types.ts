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

export interface WorkflowTask {
  id: string;
  projectId: string;
  projectCode: string;
  projectTitle: string;
  stageId: string;
  stageOrder: number;
  stageName: string;
  assignedOfficer: GovernmentOfficer;
  department: string;
  slaDays: number;
  dueDate: string;
  status: TaskStatus;
  startedAt?: string;
  completedAt?: string;
  rejectionReason?: string;
  requiredDocuments: any[];
  evidenceDocuments?: string[];
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
