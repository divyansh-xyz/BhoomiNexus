/**
 * ============================================================
 * Sovereign Statutory Workflow Service
 * Strictly adheres to API Contract & Ownership Document.md
 * (Sections 15 and 16)
 * 100% REST API Driven - No local mock/sample data
 * ============================================================
 */

import { apiClient } from './client';
import type {
  WorkflowTemplate,
  ProjectWorkflowInstance,
  WorkflowStageInstance,
  WorkflowActivationResponse,
  GovernmentOfficer,
} from '../../types/workflow.types';

export const workflowService = {
  /**
   * Section 15.1: GET /api/v1/workflow-templates
   * Lists available master workflow templates
   */
  async getTemplates(): Promise<WorkflowTemplate[]> {
    try {
      const res = await apiClient.get<WorkflowTemplate[]>('/workflow-templates');
      if (res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (e) {
      console.warn('[workflowService] GET /api/v1/workflow-templates pending:', e);
    }
    return [];
  },

  /**
   * Section 15.2: GET /api/v1/workflow-templates/:templateId
   * Retrieves specific master template specification
   */
  async getTemplateById(templateId: string): Promise<WorkflowTemplate | null> {
    try {
      const res = await apiClient.get<WorkflowTemplate>(`/workflow-templates/${templateId}`);
      if (res.data) return res.data;
    } catch (e) {
      console.warn(`[workflowService] GET /api/v1/workflow-templates/${templateId} pending:`, e);
    }
    return null;
  },

  /**
   * Section 8.1: GET /api/v1/users?role=PROCESSING_OFFICER
   * Retrieves designated processing officers for statutory stage assignment
   */
  async getOfficers(): Promise<GovernmentOfficer[]> {
    try {
      const res = await apiClient.get<GovernmentOfficer[]>('/users', {
        params: { role: 'PROCESSING_OFFICER' },
      });
      if (res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (e) {
      console.warn('[workflowService] GET /api/v1/users?role=PROCESSING_OFFICER pending:', e);
    }
    return [];
  },

  /**
   * Section 16.2: GET /api/v1/projects/:projectId/workflow
   * Retrieves active project-specific workflow instance
   */
  async getProjectWorkflow(projectId: string): Promise<ProjectWorkflowInstance | null> {
    try {
      const res = await apiClient.get<ProjectWorkflowInstance>(`/projects/${projectId}/workflow`);
      if (res.data) return res.data;
    } catch (e) {
      console.warn(`[workflowService] GET /api/v1/projects/${projectId}/workflow pending:`, e);
    }
    return null;
  },

  /**
   * Section 16.1: POST /api/v1/projects/:projectId/workflow/initialize
   * Body: { templateId: string }
   * Instantiates project workflow instance from master template
   */
  async instantiateFromTemplate(
    projectId: string,
    templateId: string
  ): Promise<ProjectWorkflowInstance> {
    const res = await apiClient.post<ProjectWorkflowInstance>(
      `/projects/${projectId}/workflow/initialize`,
      { templateId }
    );
    return res.data;
  },

  /**
   * Section 16.3: POST /api/v1/projects/:projectId/workflow/stages
   * Adds custom scrutiny stage to pipeline
   */
  async addStage(projectId: string, stageData: Partial<WorkflowStageInstance>): Promise<void> {
    await apiClient.post(`/projects/${projectId}/workflow/stages`, stageData);
  },

  /**
   * Section 16.4: PUT /api/v1/projects/:projectId/workflow/stages/:stageId
   * Updates stage parameters (officer, SLA, required documents)
   */
  async updateStage(
    projectId: string,
    stageId: string,
    stageData: Partial<WorkflowStageInstance>
  ): Promise<void> {
    await apiClient.put(`/projects/${projectId}/workflow/stages/${stageId}`, stageData);
  },

  /**
   * Section 16.5: DELETE /api/v1/projects/:projectId/workflow/stages/:stageId
   * Removes stage from pipeline
   */
  async removeStage(projectId: string, stageId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/workflow/stages/${stageId}`);
  },

  /**
   * Section 16.6: PUT /api/v1/projects/:projectId/workflow/order
   * Body: { stageIds: string[] }
   * Reorders stages in workflow sequence
   */
  async reorderWorkflow(projectId: string, stageIds: string[]): Promise<void> {
    await apiClient.put(`/projects/${projectId}/workflow/order`, { stageIds });
  },

  /**
   * Section 16.7: POST /api/v1/projects/:projectId/workflow/activate
   * Creates executable workflow, first task, assigns officer, notifies officer, creates audit event, BOSS exits
   */
  async activateWorkflow(projectId: string): Promise<WorkflowActivationResponse> {
    const res = await apiClient.post<WorkflowActivationResponse>(
      `/projects/${projectId}/workflow/activate`
    );
    return res.data;
  },
};
