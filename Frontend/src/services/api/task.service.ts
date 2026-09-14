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
    const params: Record<string, string> = {};
    if (assignedTo) params.assignedTo = assignedTo;
    if (projectId) params.projectId = projectId;
    const res = await apiClient.get<any>('/tasks', { params });
    const data = unwrapData<WorkflowTask[]>(res);
    if (data && Array.isArray(data)) {
      return data;
    }
    return [];
  },

  /**
   * Section 17.2: GET /api/v1/tasks/:taskId
   * Returns task with all statutory dimensions
   */
  async getTaskById(taskId: string): Promise<WorkflowTask | null> {
    const res = await apiClient.get<any>(`/tasks/${taskId}`);
    const data = unwrapData<WorkflowTask>(res);
    if (data && (data.id || (data as any).stageId)) return data;
    return null;
  },

  /**
   * Section 17.3: POST /api/v1/tasks/:taskId/start
   */
  async startTask(taskId: string): Promise<WorkflowTask> {
    const res = await apiClient.post<any>(`/tasks/${taskId}/start`);
    const data = unwrapData<WorkflowTask>(res);
    if (data && (data.id || data.status)) return data;
    throw new Error(`Failed to start task ${taskId}`);
  },

  /**
   * Section 17.4: POST /api/v1/tasks/:taskId/accept
   * Statutory Acceptance Affirmation under RFCTLARR Act 2013
   */
  async acceptTask(taskId: string): Promise<TaskAcceptResponse> {
    const res = await apiClient.post<any>(`/tasks/${taskId}/accept`);
    const data = unwrapData<TaskAcceptResponse>(res);
    if (data && (data.task || data.completedStage || data.success)) return data;
    throw new Error(`Failed to accept task ${taskId}`);
  },

  /**
   * Section 17.5: POST /api/v1/tasks/:taskId/reject
   */
  async rejectTask(taskId: string, rejectionReason: string): Promise<TaskRejectResponse> {
    const res = await apiClient.post<any>(`/tasks/${taskId}/reject`, { rejectionReason });
    const data = unwrapData<TaskRejectResponse>(res);
    if (data && (data.task || data.remittedStage || data.success)) return data;
    throw new Error(`Failed to reject task ${taskId}`);
  },

  /**
   * Section 17.6: POST /api/v1/tasks/:taskId/evidence
   */
  async uploadTaskEvidence(
    taskId: string,
    file: File,
    evidenceType: string
  ): Promise<TaskEvidenceItem> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('evidenceType', evidenceType);
    const res = await apiClient.post<any>(`/tasks/${taskId}/evidence`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const data = unwrapData<TaskEvidenceItem>(res);
    if (data && data.id) return data;
    throw new Error(`Failed to upload evidence for task ${taskId}`);
  },

  /**
   * GET /api/v1/tasks/:taskId/evidence
   */
  async getTaskEvidence(taskId: string): Promise<TaskEvidenceItem[]> {
    try {
      const res = await apiClient.get<any>(`/tasks/${taskId}/evidence`);
      const data = unwrapData<TaskEvidenceItem[]>(res);
      if (Array.isArray(data)) return data;
    } catch (e) {
      console.warn(`[taskService] GET /api/v1/tasks/${taskId}/evidence error:`, e);
    }
    return [];
  },

  /**
   * Section 17.7: GET /api/v1/tasks/:taskId/audit-trail
   */
  async getTaskAuditTrail(taskId: string): Promise<TaskAuditEvent[]> {
    try {
      const res = await apiClient.get<any>(`/tasks/${taskId}/audit-trail`);
      const data = unwrapData<TaskAuditEvent[]>(res);
      if (data && Array.isArray(data)) return data;
    } catch (e) {
      console.warn(`[taskService] GET /api/v1/tasks/${taskId}/audit-trail error:`, e);
    }
    return [];
  },

  /**
   * Section 17.8: POST /api/v1/projects/:projectId/workflow-stages/:stageId/resubmit
   * Requesting Authority (NHAI/Proponent) submits corrected documents after officer rejection
   */
  async resubmitStage(
    projectId: string,
    stageId: string,
    payload: StageResubmitPayload
  ): Promise<StageResubmitResponse> {
    const res = await apiClient.post<any>(
      `/projects/${projectId}/workflow-stages/${stageId}/resubmit`,
      payload
    );
    const data = unwrapData<StageResubmitResponse>(res);
    if (data && data.task) return data;
    throw new Error(`Failed to resubmit stage ${stageId}`);
  },

  /**
   * Section 19.2: GET /api/v1/projects/:projectId/workflow/progress
   */
  async getWorkflowProgress(projectId: string): Promise<WorkflowProgressSummary> {
    try {
      const res = await apiClient.get<any>(`/projects/${projectId}/workflow/progress`);
      const data = unwrapData<WorkflowProgressSummary>(res);
      if (data && typeof data === 'object' && 'totalStages' in data) return data;
    } catch (e) {
      console.warn(`[taskService] GET progress error:`, e);
    }

    // Minimal fallback for projects without workflow progress endpoint
    return {
      projectId,
      totalStages: 0,
      completedStages: 0,
      currentStageIndex: 0,
      currentStageName: '',
      currentStageStatus: 'ACTIVE',
      percentage: 0,
      currentOfficerName: '',
      currentOfficerRole: '',
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
      console.warn(`[taskService] GET /api/v1/projects/${projectId}/timeline error:`, e);
    }
    return [];
  },

  // No-op for backward compat — previously used for in-memory fake cache
  updateCachedTask(_task: WorkflowTask): void {},
};
