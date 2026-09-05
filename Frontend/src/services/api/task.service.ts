/**
 * ============================================================
 * Phase 6: Workflow Task Engine & Resubmissions Service
 * Strictly adheres to API Contract & Ownership Document.md
 * (Sections 17, 18, 19)
 * 100% REST API Driven - No local mock/sample data
 * ============================================================
 */

import { apiClient } from './client';
import type {
  WorkflowTask,
  TaskAuditEvent,
  WorkflowProgressSummary,
  TaskAcceptResponse,
  TaskRejectResponse,
  StageResubmitPayload,
  StageResubmitResponse,
} from '../../types/task.types';

export const taskService = {
  /**
   * Section 17.1: GET /api/v1/tasks?assignedTo=me OR ?projectId=:projectId
   */
  async getTasks(assignedTo?: string, projectId?: string): Promise<WorkflowTask[]> {
    try {
      const params: Record<string, string> = {};
      if (assignedTo) params.assignedTo = assignedTo;
      if (projectId) params.projectId = projectId;
      const res = await apiClient.get<WorkflowTask[]>('/tasks', { params });
      if (res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (e) {
      console.warn('[taskService] GET /api/v1/tasks pending:', e);
    }
    return [];
  },

  /**
   * Section 17.2: GET /api/v1/tasks/:taskId
   */
  async getTaskById(taskId: string): Promise<WorkflowTask | null> {
    try {
      const res = await apiClient.get<WorkflowTask>(`/tasks/${taskId}`);
      if (res.data) return res.data;
    } catch (e) {
      console.warn(`[taskService] GET /api/v1/tasks/${taskId} pending:`, e);
    }
    return null;
  },

  /**
   * Section 17.3: POST /api/v1/tasks/:taskId/start
   */
  async startTask(taskId: string): Promise<WorkflowTask> {
    const res = await apiClient.post<WorkflowTask>(`/tasks/${taskId}/start`);
    return res.data;
  },

  /**
   * Section 17.4: POST /api/v1/tasks/:taskId/accept
   */
  async acceptTask(taskId: string): Promise<TaskAcceptResponse> {
    const res = await apiClient.post<TaskAcceptResponse>(`/tasks/${taskId}/accept`);
    return res.data;
  },

  /**
   * Section 17.5: POST /api/v1/tasks/:taskId/reject
   * Body: { reason: string }
   */
  async rejectTask(taskId: string, reason: string): Promise<TaskRejectResponse> {
    if (!reason || !reason.trim()) {
      throw new Error('Statutory rejection reason is required.');
    }
    const res = await apiClient.post<TaskRejectResponse>(`/tasks/${taskId}/reject`, {
      reason: reason.trim(),
    });
    return res.data;
  },

  /**
   * Section 18.1: POST /api/v1/projects/:projectId/workflow-stages/:stageId/resubmit
   * Requesting Authority corrects defects and resubmits
   */
  async resubmitStage(
    projectId: string,
    stageId: string,
    payload: StageResubmitPayload
  ): Promise<StageResubmitResponse> {
    const res = await apiClient.post<StageResubmitResponse>(
      `/projects/${projectId}/workflow-stages/${stageId}/resubmit`,
      payload
    );
    return res.data;
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
      totalStages: 0,
      completedStages: 0,
      currentStageIndex: 0,
      currentStageName: 'Unconfigured',
      currentStageStatus: 'PENDING',
      percentage: 0,
      currentOfficerName: 'None',
      currentOfficerRole: 'None',
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
