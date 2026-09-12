/**
 * ============================================================
 * V2 Workflow & Lifecycle Domain Types (Phase 1 Database Foundation)
 * Strictly adheres to:
 * 1. Phase Implementation.md (Section 4: Phase 1 — V2 Database Foundation)
 * 2. V2 API Endpoints and Behaviour.md (V2 Workflow, Compensation V2, Possession V2)
 * ============================================================
 */

import type { GovernmentOfficer } from './workflow.types';

// Re-export shared identity/officer type
export type { GovernmentOfficer };

/**
 * V2 Workflow Node Types
 * Distinguishes administrative gates, sub-divisions, cohorts, and operational stages
 */
export type WorkflowNodeType =
  | 'DISTRICT_ACQUISITION'
  | 'SUB_DIVISION'
  | 'SPECIAL_UNIT'
  | 'STAGE'
  | 'APPROVAL_GATE'
  | 'BRANCH_GATE';

/**
 * V2 Departmental & Statutory Scope
 */
export type WorkflowNodeResponsibility =
  | 'REVENUE_BRANCH'
  | 'SURVEY_OFFICE'
  | 'FOREST_DEPT'
  | 'ENVIRONMENT_DEPT'
  | 'COMPENSATION_BRANCH'
  | 'POSSESSION_BRANCH'
  | 'LEGAL_CELL';

/**
 * V2 Workflow Node Definition (maps to `workflow_nodes` table)
 */
export interface WorkflowNode {
  id: string;
  workflowId: string;
  name: string;
  description?: string;
  nodeType: WorkflowNodeType;
  responsibility: WorkflowNodeResponsibility;
  assignedOfficerId?: string;
  assignedOfficer?: GovernmentOfficer;
  unitName?: string;
  branchKey?: string;
  slaDays: number;
  requiredDocuments: string[];
  positionX: number;
  positionY: number;
  parcelCount?: number;
  status?: 'DRAFT' | 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'BLOCKED';
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Directed Edge connecting nodes in the V2 graph (maps to `workflow_edges` table)
 */
export interface WorkflowEdge {
  id: string;
  workflowId: string;
  sourceNodeId: string;
  targetNodeId: string;
  conditionExpression?: string;
  edgeLabel?: string;
  isDefault?: boolean;
  createdAt?: string;
}

/**
 * Cohort Parcel Assignment (maps to `workflow_node_parcels` table)
 */
export interface WorkflowNodeParcel {
  nodeId: string;
  parcelId: string;
  status: 'ASSIGNED' | 'TRANSFERRED' | 'CLEARED' | 'REJECTED';
  assignedAt: string;
  assignedBy?: string;
  // Enriched land parcel properties for Phase 6 Cohort Panel & Sovereign Passport
  parcelName?: string;
  ulpin?: string;
  surveyNumber?: string;
  ownerReference?: string;
  village?: string;
  district?: string;
  state?: string;
  areaAcres?: number;
  areaHa?: number;
  landType?: string;
  marketRatePerAcre?: number;
  intersectPercent?: number;
  coordinates?: [number, number][];
}

/**
 * Complete V2 Workflow Graph Payload
 * Returned by GET /api/v1/projects/:projectId/workflow
 */
export interface V2WorkflowGraph {
  projectId: string;
  workflowId: string;
  templateId?: string;
  templateName?: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  unassignedParcelsCount?: number;
  totalParcelsCount?: number;
  activatedAt?: string;
  activatedBy?: string;
}

/**
 * Runtime Execution Record (maps to `workflow_executions` table)
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  projectId: string;
  status: 'NOT_STARTED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt?: string;
  completedAt?: string;
  currentActiveNodeIds: string[];
  executionMetadata?: Record<string, any>;
}

export interface CompensationEvidenceItem {
  id: string;
  title: string;
  type: 'AWARD_NOTICE' | 'PFMS_RECEIPT' | 'INDEMNITY_BOND' | 'REVENUE_EXTRACT' | 'BANK_MANDATE' | 'OTHER';
  fileUrl?: string;
  uploadedAt: string;
  size?: string;
}

export interface CompensationBeneficiaryDetails {
  khatedarName: string;
  bankName: string;
  bankBranch: string;
  accountNumber: string;
  ifsc: string;
  aadhaarMasked: string;
  panMasked: string;
  sharePercentage: number;
  kycStatus: 'VERIFIED' | 'PENDING' | 'DISCREPANCY';
}

export interface CompensationParcelDetails {
  khasraNumber: string;
  ulpin?: string;
  surveyNumber?: string;
  village: string;
  taluka?: string;
  district: string;
  state: string;
  areaAcres: number;
  tenureType?: string;
  landClassification?: string;
  boundaryAffirmed?: boolean;
}

export interface CompensationSolatiumDetails {
  baseMarketValue: number;
  multiplicationFactor: number;
  solatium100Percent: number;
  additionalInterest12Percent: number;
}

/**
 * Compensation Record (maps to `compensation_records` table)
 * Strictly matches V2 API Endpoints and Behaviour.md (Section: Compensation V2)
 * and Phase Implementation.md (Section 16 - 10 Task Content Dimensions)
 */
export interface CompensationRecord {
  id: string;
  projectId: string;
  parcelId: string;
  beneficiaryName: string;
  assessedAmount: number;
  approvedAmount?: number;
  paidAmount?: number;
  pendingAmount?: number;
  status: 'ASSESSED' | 'APPROVED' | 'DISBURSED' | 'DISPUTED';
  paymentDate?: string;
  referenceNo?: string;
  remarks?: string;
  taskId?: string;
  beneficiaryDetails?: CompensationBeneficiaryDetails;
  parcelDetails?: CompensationParcelDetails;
  solatiumDetails?: CompensationSolatiumDetails;
  evidenceItems?: CompensationEvidenceItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CompensationTaskSummary {
  taskId: string;
  recordId: string;
  projectId: string;
  projectCode: string;
  projectTitle: string;
  parcelId: string;
  beneficiaryName: string;
  assessedAmount: number;
  approvedAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: 'ASSESSED' | 'APPROVED' | 'DISBURSED' | 'DISPUTED';
  taskStatus: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  dueDate: string;
  assignedOfficerName: string;
}


export interface PossessionEvidenceItem {
  id: string;
  title: string;
  type: 'GEOTAGGED_PHOTO' | 'PANCHNAMA' | 'DEMARCATION_SKETCH' | 'VESTING_CERTIFICATE' | 'OTHER';
  fileUrl?: string;
  uploadedAt: string;
  size?: string;
  coordinates?: { lat: number; lng: number };
  capturedBy?: string;
}

export interface PossessionParcelDetails {
  khasraNumber: string;
  ulpin?: string;
  surveyNumber?: string;
  village: string;
  taluka?: string;
  district: string;
  state: string;
  areaAcres: number;
  tenureType?: string;
  boundaryCoordinates?: string;
  boundaryPegsCount?: number;
}

export interface PossessionDemarcationDetails {
  boundaryStonesPegged: boolean;
  encroachmentCleared: boolean;
  revenueWitnesses: string[];
  siteEngineerName?: string;
  talathiName?: string;
  circleInspectorName?: string;
  panchnamaSignedAt?: string;
  panchnamaSummary?: string;
}

/**
 * Possession Record (maps to `possession_records` table)
 * Strictly matches V2 API Endpoints and Behaviour.md (Section: Possession V2)
 * and Phase Implementation.md (Section 17: Phase 14)
 */
export interface PossessionRecord {
  id: string;
  projectId: string;
  parcelId: string;
  status: 'PENDING' | 'INSPECTION_SCHEDULED' | 'POSSESSION_TAKEN' | 'COMPLETED' | 'DISPUTED';
  possessionDate?: string;
  officerId?: string;
  evidenceIds?: string[];
  evidenceItems?: PossessionEvidenceItem[];
  parcelDetails?: PossessionParcelDetails;
  demarcationDetails?: PossessionDemarcationDetails;
  remarks?: string;
  taskId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 6 Statutory Pre-Flight Checklist Criteria for Phase 9 Validation
 * Strictly adheres to Phase Implementation.md (Section 12: Phase 9)
 */
export interface WorkflowValidationChecklist {
  validGraph: boolean;
  validNodeAssignments: boolean;
  validParcelAllocation: boolean;
  noDuplicateActiveMembership: boolean;
  noOrphanNodes: boolean;
  validTemplateFragments: boolean;
}

/**
 * Validation Result from POST /api/v1/projects/:projectId/workflow/validate
 */
export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  unassignedParcelsCount: number;
  unassignedNodesCount: number;
  orphanNodesCount: number;
  checklist?: WorkflowValidationChecklist;
  telemetry?: {
    totalNodes: number;
    totalEdges: number;
    totalSlaDays: number;
    allocatedParcelsCount: number;
    estimatedInitialTasks: number;
  };
}

/**
 * Activation Response from POST /api/v1/projects/:projectId/workflow/activate
 */
export interface WorkflowV2ActivationResponse {
  projectId: string;
  workflowId: string;
  status: 'ACTIVE';
  activatedAt: string;
  executionId: string;
  initialTaskCount: number;
  version?: number;
  auditEventId?: string;
  notificationsSent?: number;
}

/**
 * Phase 10: Runtime Node Execution Record
 * Corresponds to each relevant (parcel + workflow node) in the runtime execution engine.
 * Strictly adheres to Phase Implementation.md (Section 13) and V2 API Endpoints and Behaviour.md (Line 187).
 */
export interface NodeExecutionRecord {
  id: string;
  workflowExecutionId: string;
  nodeId: string;
  nodeName: string;
  branchType: 'ACQUISITION' | 'COMPENSATION' | 'POSSESSION' | 'GATE';
  parcelId: string;
  parcelKhasra: string;
  parcelVillage: string;
  parcelAreaAcres: number;
  status: 'PENDING' | 'ACTIONABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'BLOCKED';
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  assignedOfficerRole?: string;
  assignedOfficerDepartment?: string;
  taskId?: string;
  taskStatus?: 'PENDING' | 'IN_PROGRESS' | 'ACCEPTED' | 'REJECTED';
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  rejectionReason?: string;
}

/**
 * Phase 10: Full Runtime Execution Response from GET /api/v1/projects/:projectId/workflow/execution
 */
export interface ProjectExecutionResponse {
  id: string;
  workflowId: string;
  projectId: string;
  status: 'NOT_STARTED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  activatedAt: string;
  activatedBy: string;
  executions: NodeExecutionRecord[];
  summary: {
    totalParcels: number;
    totalNodes: number;
    totalExecutions: number;
    actionableTasksCount: number;
    inProgressTasksCount: number;
    completedTasksCount: number;
  };
}
