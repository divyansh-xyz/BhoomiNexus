import { apiClient } from './client';
import type {
  WorkflowTask,
  TaskAuditEvent,
  WorkflowProgressSummary,
  TaskAcceptResponse,
  TaskRejectResponse,
  StageResubmitPayload,
  StageResubmitResponse,
  TaskEvidenceItem,
} from '../../types/task.types';

// In-memory runtime task cache for interactive testing across accept/reject/resubmit
let runtimeTasksCache: Record<string, WorkflowTask> | null = null;

function unwrapData<T>(res: any): T {
  if (res && res.data && typeof res.data === 'object' && 'data' in res.data) {
    return res.data.data as T;
  }
  return res.data as T;
}

export const taskService = {
  /**
   * Section 17.1: GET /api/v1/tasks?assignedTo=me OR ?projectId=:projectId
   */
  async getTasks(assignedTo?: string, projectId?: string): Promise<WorkflowTask[]> {
    try {
      const params: Record<string, string> = {};
      if (assignedTo) params.assignedTo = assignedTo;
      if (projectId) params.projectId = projectId;
      const res = await apiClient.get<any>('/tasks', { params });
      const data = unwrapData<WorkflowTask[]>(res);
      if (data && Array.isArray(data) && data.length > 0) {
        // Isolate to the active demo project (Rithala or newly initiated project)
        const activeProjId = localStorage.getItem('bhoomi_demo_active_project_id');
        const activeTitle = localStorage.getItem('bhoomi_demo_active_project_title');
        const filtered = data.filter((t: any) => {
          if (activeProjId && (t.projectId === activeProjId || t.project_id === activeProjId)) return true;
          if (activeTitle && t.projectTitle?.toLowerCase().includes(activeTitle.toLowerCase())) return true;
          if (t.district === 'Rithala' || t.projectCode === 'PRJ-DL-7701' || t.projectTitle?.toLowerCase().includes('rithala')) return true;
          return false;
        });
        if (filtered.length > 0) return filtered;
        return filtered; // If none match, strictly keep isolated (empty or deterministic fallback)
      }
    } catch (e) {
      console.warn('[taskService] GET /api/v1/tasks pending backend:', e);
    }
    return getDeterministicTasks(assignedTo, projectId);
  },

  /**
   * Section 17.2: GET /api/v1/tasks/:taskId
   * Returns task with all 10 statutory dimensions
   */
  async getTaskById(taskId: string): Promise<WorkflowTask | null> {
    try {
      const res = await apiClient.get<any>(`/tasks/${taskId}`);
      const data = unwrapData<WorkflowTask>(res);
      if (data && (data.id || (data as any).stageId)) return data;
    } catch (e) {
      console.warn(`[taskService] GET /api/v1/tasks/${taskId} pending backend:`, e);
    }
    return getDeterministicTask(taskId);
  },

  /**
   * Section 17.3: POST /api/v1/tasks/:taskId/start
   */
  async startTask(taskId: string): Promise<WorkflowTask> {
    try {
      const res = await apiClient.post<any>(`/tasks/${taskId}/start`);
      const data = unwrapData<WorkflowTask>(res);
      if (data && (data.id || data.status)) return data;
    } catch (e) {
      console.warn(`[taskService] POST /api/v1/tasks/${taskId}/start fallback:`, e);
    }
    const t = getDeterministicTask(taskId);
    if (t) {
      t.status = 'IN_PROGRESS';
      t.startedAt = new Date().toISOString();
      updateCachedTask(t);
      return t;
    }
    throw new Error(`Task ${taskId} not found`);
  },

  /**
   * Section 17.4: POST /api/v1/tasks/:taskId/accept
   * Completes task/stage and routes the next configured parcel-level execution
   */
  async acceptTask(taskId: string): Promise<TaskAcceptResponse> {
    try {
      const res = await apiClient.post<any>(`/tasks/${taskId}/accept`);
      const data = unwrapData<TaskAcceptResponse>(res);
      if (data && (data.task || data.completedStage)) return data;
    } catch (e) {
      console.warn(`[taskService] POST /api/v1/tasks/${taskId}/accept fallback:`, e);
    }
    const t = getDeterministicTask(taskId);
    if (t) {
      t.status = 'ACCEPTED';
      t.completedAt = new Date().toISOString();
      if (t.verification) {
        t.verification.status = 'VERIFIED';
        t.verification.verifiedAt = new Date().toISOString();
      }
      updateCachedTask(t);
      return {
        success: true,
        message: `Task ${taskId} affirmed and statutory clearance completed.`,
        task: t,
        completedStage: {
          id: t.stageId,
          name: t.stageName,
          order: t.stageOrder,
          slaDays: t.slaDays,
          assignedRole: t.assignedOfficer.designation,
          department: t.department,
          status: 'COMPLETED',
          requiredDocuments: t.requiredDocuments.map((d) => d.name),
        },
      };
    }
    throw new Error(`Task ${taskId} not found`);
  },

  /**
   * Section 17.5: POST /api/v1/tasks/:taskId/reject
   */
  async rejectTask(taskId: string, rejectionReason: string): Promise<TaskRejectResponse> {
    try {
      const res = await apiClient.post<any>(`/tasks/${taskId}/reject`, { rejectionReason });
      const data = unwrapData<TaskRejectResponse>(res);
      if (data && (data.task || data.remittedStage)) return data;
    } catch (e) {
      console.warn(`[taskService] POST /api/v1/tasks/${taskId}/reject fallback:`, e);
    }
    const t = getDeterministicTask(taskId);
    if (t) {
      t.status = 'REJECTED';
      t.rejectionReason = rejectionReason;
      updateCachedTask(t);
      return {
        success: true,
        message: `Task ${taskId} remitted with statutory objections.`,
        task: t,
        remittedStage: {
          id: t.stageId,
          name: t.stageName,
          order: t.stageOrder,
          slaDays: t.slaDays,
          assignedRole: t.assignedOfficer.designation,
          department: t.department,
          status: 'REJECTED',
          requiredDocuments: t.requiredDocuments.map((d) => d.name),
        },
      };
    }
    throw new Error(`Task ${taskId} not found`);
  },

  /**
   * Section 17.6: POST /api/v1/tasks/:taskId/evidence
   */
  async uploadTaskEvidence(
    taskId: string,
    file: File,
    evidenceType: string
  ): Promise<TaskEvidenceItem> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('evidenceType', evidenceType);
      const res = await apiClient.post<any>(`/tasks/${taskId}/evidence`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = unwrapData<TaskEvidenceItem>(res);
      if (data && data.id) return data;
    } catch (e) {
      console.warn(`[taskService] POST /api/v1/tasks/${taskId}/evidence fallback:`, e);
    }

    const newItem: TaskEvidenceItem = {
      id: `ev-${Date.now()}`,
      taskId,
      fileName: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      fileType: file.type || 'application/pdf',
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'Ananya Patel (Processing Officer)',
      evidenceType: (evidenceType as any) || 'OTHER',
      url: URL.createObjectURL(file),
      hash: `sha256-${Math.random().toString(36).substring(2, 12)}`,
      verified: true,
    };

    const t = getDeterministicTask(taskId);
    if (t) {
      t.evidence = [...(t.evidence || []), newItem];
      updateCachedTask(t);
    }
    return newItem;
  },

  /**
   * Section 17.7: GET /api/v1/tasks/:taskId/evidence
   */
  async getTaskEvidence(taskId: string): Promise<TaskEvidenceItem[]> {
    try {
      const res = await apiClient.get<any>(`/tasks/${taskId}/evidence`);
      const data = unwrapData<TaskEvidenceItem[]>(res);
      if (data && Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      console.warn(`[taskService] GET /api/v1/tasks/${taskId}/evidence fallback:`, e);
    }
    const t = getDeterministicTask(taskId);
    return t?.evidence || [];
  },

  /**
   * Section 18.1: POST /api/v1/projects/:projectId/workflow-stages/:stageId/resubmit
   */
  async resubmitStage(
    projectId: string,
    stageId: string,
    payload: StageResubmitPayload
  ): Promise<StageResubmitResponse> {
    try {
      const res = await apiClient.post<any>(
        `/projects/${projectId}/workflow-stages/${stageId}/resubmit`,
        payload
      );
      const data = unwrapData<StageResubmitResponse>(res);
      if (data && (data.task || data.stage)) return data;
    } catch (e) {
      console.warn(`[taskService] resubmitStage fallback:`, e);
    }

    initCache();
    let matchedTask: WorkflowTask | undefined;
    Object.values(runtimeTasksCache || {}).forEach((task) => {
      if (task.projectId === projectId && (task.stageId === stageId || task.id.includes(stageId))) {
        task.status = 'IN_PROGRESS';
        task.rejectionReason = undefined;
        task.previousStageNotes = `Resubmitted by Proponent with explanation: "${payload.explanation}". Corrected evidence appended.`;
        matchedTask = task;
      }
    });

    const t = matchedTask || getDeterministicTasks()[0];
    return {
      stage: {
        id: stageId,
        name: t.stageName,
        order: t.stageOrder,
        slaDays: t.slaDays,
        assignedRole: t.assignedOfficer.designation,
        department: t.department,
        status: 'ACTIVE',
        requiredDocuments: t.requiredDocuments.map((d) => d.name),
      },
      task: t,
      auditEvent: {
        id: `audit-${Date.now()}`,
        projectId,
        taskId: t.id,
        stageOrder: t.stageOrder,
        stageName: t.stageName,
        eventType: 'STAGE_RESUBMITTED',
        performedBy: 'Requesting Authority',
        details: `Stage resubmitted after correction: ${payload.explanation}`,
        timestamp: new Date().toISOString(),
      },
    };
  },

  /**
   * Section 19.2: GET /api/v1/projects/:projectId/workflow/progress
   */
  async getWorkflowProgress(projectId: string): Promise<WorkflowProgressSummary> {
    try {
      const res = await apiClient.get<WorkflowProgressSummary>(
        `/projects/${projectId}/workflow/progress`
      );
      if (res.data) return res.data;
    } catch (e) {
      console.warn(`[taskService] GET /api/v1/projects/${projectId}/workflow/progress pending:`, e);
    }

    return {
      projectId,
      totalStages: 3,
      completedStages: 0,
      currentStageIndex: 1,
      currentStageName: 'Acquisition Verification & Final Clearance',
      currentStageStatus: 'ACTIVE',
      percentage: 33,
      currentOfficerName: 'Ananya Patel',
      currentOfficerRole: 'Processing & Field Officer',
      status: 'ACTIVE',
    };
  },

  /**
   * Section 11.7 / 19.3: GET /api/v1/projects/:projectId/timeline
   */
  async getAuditTimeline(projectId: string): Promise<TaskAuditEvent[]> {
    try {
      const res = await apiClient.get<TaskAuditEvent[]>(`/projects/${projectId}/timeline`);
      if (res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (e) {
      console.warn(`[taskService] GET /api/v1/projects/${projectId}/timeline pending:`, e);
    }
    return [];
  },
};

// ────────────────────────────────────────────────────────────
// Demonstration Tasks Setup (Rithala Project Isolated)
// ────────────────────────────────────────────────────────────

function getActiveProjectInfo() {
  return {
    id: localStorage.getItem('bhoomi_demo_active_project_id') || '4ed46de6-586e-4459-b011-f090a1c3bafd',
    code: localStorage.getItem('bhoomi_demo_active_project_code') || 'PRJ-DL-7701',
    title: localStorage.getItem('bhoomi_demo_active_project_title') || 'Delhi Metro Phase-IV Rithala Rapid Transit Corridor',
    district: localStorage.getItem('bhoomi_demo_active_district') || 'Rithala',
    state: 'Delhi',
  };
}

function initCache() {
  if (runtimeTasksCache) return;

  const proj = getActiveProjectInfo();

  const taskA: WorkflowTask = {
    id: 'TASK-ACQ-RITHALA-001',
    projectId: proj.id,
    projectCode: proj.code,
    projectTitle: proj.title,
    ministry: 'Ministry of Housing and Urban Affairs',
    statutoryPurpose: 'Mass Rapid Transit & Urban Infrastructure',
    state: proj.state,
    district: proj.district,
    stageId: 'node-acq-1',
    stageOrder: 1,
    stageName: 'Acquisition Verification & Final Clearance',
    assignedOfficer: {
      id: 'usr-officer-01',
      name: 'Ananya Patel',
      designation: 'Processing & Field Officer',
      department: 'Revenue & Land Records Branch',
      role: 'PROCESSING_OFFICER',
      district: 'Rithala',
      state: 'Delhi',
      activeTasksCount: 1,
    },
    department: 'Revenue & Land Records Branch',
    slaDays: 21,
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    status: 'IN_PROGRESS',
    startedAt: new Date(Date.now() - 43200000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    parcel: {
      id: 'parcel-demo-001',
      ulpin: '07-104-5829-1021',
      khasraNumber: '101/A',
      village: 'Rithala Urban',
      areaAcres: 3.45,
      tenureType: 'Private Commercial Freehold',
      disputed: false,
    },
    relevantParcels: [
      { id: 'parcel-demo-001', surveyNumber: 'SV-101/A', village: 'Rithala Urban', area: '3.45 Acres' },
    ],
    workflowNode: {
      id: 'node-acq-1',
      name: 'Acquisition Verification & Final Clearance',
      type: 'STAGE',
      branchType: 'ACQUISITION',
      responsibility: 'REVENUE_BRANCH',
      slaDays: 21,
    },
    cohortContext: {
      unitName: 'Rithala Tehsil Sub-Division',
      cohortBranch: 'Acquisition Final Stage',
      cohortParcelCount: 4,
    },
    requiredDocuments: [
      { id: 'req-doc-1', name: 'Form 11 Statutory Valuation Schedule.pdf', type: 'Valuation Ledger', mandatory: true, status: 'UPLOADED' },
      { id: 'req-doc-2', name: 'Section 19 Final Acquisition Gazette Extract.pdf', type: 'Gazette', mandatory: true, status: 'MISSING' },
      { id: 'req-doc-3', name: 'Jamabandi / Record of Rights (Khatauni).pdf', type: 'Land Schedule', mandatory: true, status: 'VERIFIED' },
    ],
    evidence: [
      {
        id: 'ev-001',
        taskId: 'TASK-ACQ-RITHALA-001',
        fileName: 'Field_Inspection_Panchnama_Signed.pdf',
        fileSize: '1.8 MB',
        fileType: 'application/pdf',
        uploadedAt: new Date(Date.now() - 43200000).toISOString(),
        uploadedBy: 'Ananya Patel (Field Officer)',
        evidenceType: 'PANCHNAMA',
        hash: 'sha256-e9a8f4c2810b42c1',
        verified: true,
      },
      {
        id: 'ev-002',
        taskId: 'TASK-ACQ-101-1-A',
        fileName: 'Boundary_Ground_Demarcation_Photo.jpg',
        fileSize: '3.2 MB',
        fileType: 'image/jpeg',
        uploadedAt: new Date(Date.now() - 40000000).toISOString(),
        uploadedBy: 'Ananya Patel (SDM)',
        evidenceType: 'GROUND_PHOTO',
        hash: 'sha256-88b17c99201f3e7a',
        verified: true,
      },
    ],
    ocrExtraction: {
      status: 'COMPLETED',
      confidenceScore: 0.98,
      extractedFields: {
        khasraNumber: { value: '101/1', confidence: 0.99 },
        khatauniNumber: { value: '00412', confidence: 0.98 },
        recordedOwner: { value: 'Ram Swaroop s/o Hariram', confidence: 0.97 },
        totalLandAreaAcres: { value: '2.45', confidence: 0.99 },
        statutoryEncumbrance: { value: 'Nil / Clear Title', confidence: 0.96 },
      },
    },
    verification: {
      status: 'VERIFIED',
      affirmations: {
        boundaryAffirmed: true,
        khasraSurveyAffirmed: true,
        ownershipLedgerAffirmed: true,
        noEncumbranceAffirmed: true,
        officerRemarks: 'Ground boundary verified with GPS coordinates. Title confirmed in village revenue register.',
        verifiedBy: 'Ananya Patel',
        verifiedAt: new Date(Date.now() - 3600000).toISOString(),
      },
    },
  };

  const taskB: WorkflowTask = {
    id: 'TASK-ACQ-RITHALA-002',
    projectId: proj.id,
    projectCode: proj.code,
    projectTitle: proj.title,
    ministry: 'Ministry of Housing and Urban Affairs',
    statutoryPurpose: 'Mass Rapid Transit & Urban Infrastructure',
    state: proj.state,
    district: proj.district,
    stageId: 'node-acq-1',
    stageOrder: 1,
    stageName: 'Acquisition Verification & Final Clearance',
    assignedOfficer: {
      id: 'usr-officer-01',
      name: 'Ananya Patel',
      designation: 'Processing & Field Officer',
      department: 'Revenue & Land Records Branch',
      role: 'PROCESSING_OFFICER',
      district: 'Rithala',
      state: 'Delhi',
      activeTasksCount: 1,
    },
    department: 'Revenue & Land Records Branch',
    slaDays: 21,
    dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    status: 'IN_PROGRESS',
    startedAt: new Date(Date.now() - 20000000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    parcel: {
      id: 'parcel-demo-002',
      ulpin: '07-104-5829-1022',
      khasraNumber: '102/B',
      village: 'Rithala Extension',
      areaAcres: 1.80,
      tenureType: 'Private Commercial Freehold',
      disputed: false,
    },
    relevantParcels: [
      { id: 'parcel-demo-002', surveyNumber: 'SV-102/B', village: 'Rithala Extension', area: '1.80 Acres' },
    ],
    workflowNode: {
      id: 'node-acq-1',
      name: 'Acquisition Verification & Final Clearance',
      type: 'STAGE',
      branchType: 'ACQUISITION',
      responsibility: 'REVENUE_BRANCH',
      slaDays: 21,
    },
    cohortContext: {
      unitName: 'Rithala Tehsil Sub-Division',
      cohortBranch: 'Acquisition Final Stage',
      cohortParcelCount: 4,
    },
    requiredDocuments: [
      { id: 'req-doc-4', name: 'Cadastral Vector Demarcation Map.pdf', type: 'Map', mandatory: true, status: 'UPLOADED' },
      { id: 'req-doc-5', name: 'Joint Physical Measurement Verification Report.pdf', type: 'Inspection', mandatory: true, status: 'UPLOADED' },
    ],
    evidence: [
      {
        id: 'ev-003',
        taskId: 'TASK-ACQ-RITHALA-002',
        fileName: 'Field_Pillar_Coordinates_Vector.geojson',
        fileSize: '0.9 MB',
        fileType: 'application/geo+json',
        uploadedAt: new Date(Date.now() - 20000000).toISOString(),
        uploadedBy: 'Ananya Patel (Field Officer)',
        evidenceType: 'CADASTRAL_MAP',
        hash: 'sha256-9a2c88f110c7e5d2',
        verified: true,
      },
    ],
    ocrExtraction: {
      status: 'COMPLETED',
      confidenceScore: 0.96,
      extractedFields: {
        khasraNumber: { value: '102/B', confidence: 0.98 },
        measuredCorridorWidth: { value: '35 meters', confidence: 0.95 },
        recordedOwner: { value: 'Shri Rajesh Kumar & Sons', confidence: 0.97 },
      },
    },
    verification: {
      status: 'VERIFIED',
      affirmations: {
        boundaryAffirmed: true,
        khasraSurveyAffirmed: true,
        ownershipLedgerAffirmed: true,
        noEncumbranceAffirmed: true,
        officerRemarks: 'Demarcation vector verified against satellite orthophoto. Clear title affirmed.',
        verifiedBy: 'Ananya Patel',
        verifiedAt: new Date(Date.now() - 2000000).toISOString(),
      },
    },
  };

  runtimeTasksCache = {
    [taskA.id]: taskA,
    [taskB.id]: taskB,
  };
}

function updateCachedTask(task: WorkflowTask) {
  initCache();
  if (runtimeTasksCache) {
    runtimeTasksCache[task.id] = { ...task };
  }
}

function getDeterministicTasks(_assignedTo?: string, projectId?: string): WorkflowTask[] {
  initCache();
  const list = Object.values(runtimeTasksCache || {});
  return list.filter((t) => {
    if (projectId && t.projectId !== projectId) return false;
    return true;
  });
}

function getDeterministicTask(taskId: string): WorkflowTask | null {
  initCache();
  if (runtimeTasksCache && runtimeTasksCache[taskId]) {
    return runtimeTasksCache[taskId];
  }
  // If task ID begins with standard prefixes, return default
  const list = Object.values(runtimeTasksCache || {});
  return list.find((t) => t.id === taskId) || list[0] || null;
}
