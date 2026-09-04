import type { WorkflowTemplate, GovernmentOfficer } from '../types/workflow.types';

/**
 * Master workflow templates and government officers are populated via:
 * - GET /api/v1/workflow-templates (Section 15.1)
 * - GET /api/v1/users?role=PROCESSING_OFFICER (Section 8.1)
 * 
 * Initial state is empty; the backend developer will populate templates and officers in the database.
 */
export const GOVERNMENT_OFFICERS: GovernmentOfficer[] = [];
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [];
