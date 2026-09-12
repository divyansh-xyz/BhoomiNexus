import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pool } from '../../../config/db';
import { startV2Task, acceptV2Task, rejectV2Task } from '../workflowExecution.service';
import { assertWorkflowEditable } from '../../workflows/workflowGraph.service';

vi.mock('../../../config/db', () => {
  const query = vi.fn();
  const connect = vi.fn();
  return {
    pool: {
      query,
      connect,
    },
  };
});

vi.mock('../../../utils/audit', () => ({
  createAuditEvent: vi.fn().mockResolvedValue({ id: 'audit-mock-1' }),
}));

describe('Phases 9, 10, 11 & 15: Workflow Activation, Execution & Task Lifecycle', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    (pool.connect as any).mockResolvedValue(mockClient);
  });

  describe('Phase 9: Workflow Activation & Topological Freezing', () => {
    it('throws 409 Conflict if attempting to mutate an already active workflow', () => {
      const activeWorkflow = {
        id: 'wf-active-1',
        project_id: 'prj-1',
        status: 'ACTIVE',
      };
      expect(() => assertWorkflowEditable(activeWorkflow as any)).toThrowError(
        /WORKFLOW_ALREADY_ACTIVATED/
      );
    });

    it('allows mutation if workflow status is DRAFT', () => {
      const draftWorkflow = {
        id: 'wf-draft-1',
        project_id: 'prj-1',
        status: 'DRAFT',
      };
      expect(() => assertWorkflowEditable(draftWorkflow as any)).not.toThrow();
    });
  });

  describe('Phase 10 & 11: Task Start Lifecycle', () => {
    it('successfully starts an ASSIGNED task and transitions to IN_PROGRESS', async () => {
      const mockTask = {
        id: 'task-101',
        status: 'ASSIGNED',
        workflow_execution_id: 'exec-1',
        parcel_id: 'parcel-1',
        project_id: 'prj-1',
        responsible_role: 'PROCESSING_OFFICER',
      };

      // Mock getV2TaskById
      (pool.query as any)
        .mockResolvedValueOnce({ rows: [mockTask] }) // getV2TaskById query
        .mockResolvedValueOnce({ rows: [] }) // evidence query
        .mockResolvedValueOnce({ rows: [{ ...mockTask, status: 'IN_PROGRESS' }] }); // update query

      const result = await startV2Task('task-101', 'user-officer-1');
      expect(result.status).toBe('IN_PROGRESS');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE workflow_tasks SET status = 'IN_PROGRESS'"),
        ['task-101']
      );
    });

    it('rejects starting a task that is already COMPLETED', async () => {
      const mockTask = {
        id: 'task-102',
        status: 'COMPLETED',
        project_id: 'prj-1',
      };

      (pool.query as any)
        .mockResolvedValueOnce({ rows: [mockTask] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(startV2Task('task-102', 'user-officer-1')).rejects.toThrowError(
        /Task cannot be started from current status 'COMPLETED'/
      );
    });
  });

  describe('Phase 10 & 11: Task Accept Lifecycle and Parcel Advancement', () => {
    it('advances parcel to downstream node when outgoing edge exists', async () => {
      const mockTask = {
        id: 'task-201',
        status: 'IN_PROGRESS',
        execution_id: 'exec-201',
        parcel_id: 'parcel-1',
        node_id: 'node-step-1',
        workflow_instance_id: 'wf-inst-1',
        project_id: 'prj-1',
        ulpin: 'MH-PUN-001',
        responsible_role: 'PROCESSING_OFFICER',
      };

      (pool.query as any)
        .mockResolvedValueOnce({ rows: [mockTask] })
        .mockResolvedValueOnce({ rows: [] });

      // In client transaction:
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // UPDATE workflow_tasks SET status = 'COMPLETED'
        .mockResolvedValueOnce({}) // UPDATE workflow_executions SET status = 'COMPLETED'
        .mockResolvedValueOnce({
          // Downstream edges lookup
          rows: [
            {
              target_node_id: 'node-step-2',
              target_node_name: 'Joint Measurement Survey',
              responsible_role: 'PROCESSING_OFFICER',
              responsible_user_id: 'officer-2',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ id: 'new-exec-2' }] }) // INSERT workflow_executions
        .mockResolvedValueOnce({}) // INSERT workflow_tasks
        .mockResolvedValueOnce({}); // COMMIT

      const res = await acceptV2Task('task-201', 'user-officer-1');
      expect(res.success).toBe(true);
      expect(res.isTerminal).toBe(false);
      expect(res.nextTasksCreated).toBe(1);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('marks parcel as ACQUIRED when terminal node is completed', async () => {
      const mockTask = {
        id: 'task-301',
        status: 'IN_PROGRESS',
        execution_id: 'exec-301',
        parcel_id: 'parcel-1',
        node_id: 'node-terminal-step',
        workflow_instance_id: 'wf-inst-1',
        project_id: 'prj-1',
        ulpin: 'MH-PUN-001',
        responsible_role: 'PROCESSING_OFFICER',
      };

      (pool.query as any)
        .mockResolvedValueOnce({ rows: [mockTask] })
        .mockResolvedValueOnce({ rows: [] });

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // UPDATE workflow_tasks COMPLETED
        .mockResolvedValueOnce({}) // UPDATE workflow_executions COMPLETED
        .mockResolvedValueOnce({ rows: [] }) // No downstream edges -> Terminal!
        .mockResolvedValueOnce({}) // UPDATE land_parcels SET acquisition_status = 'ACQUIRED'
        .mockResolvedValueOnce({}); // COMMIT

      const res = await acceptV2Task('task-301', 'user-officer-1');
      expect(res.success).toBe(true);
      expect(res.isTerminal).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE land_parcels SET acquisition_status = 'ACQUIRED'"),
        ['parcel-1']
      );
    });
  });

  describe('Phase 11 & 15: Task Rejection and Requesting Authority Notification', () => {
    it('requires a mandatory rejection reason', async () => {
      await expect(
        rejectV2Task('task-401', 'user-officer-1', '')
      ).rejects.toThrowError(/Rejection reason is mandatory/);
    });

    it('sets task & execution to REJECTED and creates action item with valid reason', async () => {
      const mockTask = {
        id: 'task-401',
        status: 'IN_PROGRESS',
        execution_id: 'exec-401',
        parcel_id: 'parcel-1',
        node_id: 'node-step-1',
        project_id: 'prj-1',
        ulpin: 'MH-PUN-001',
        responsible_role: 'PROCESSING_OFFICER',
      };

      (pool.query as any)
        .mockResolvedValueOnce({ rows: [mockTask] })
        .mockResolvedValueOnce({ rows: [] });

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // UPDATE workflow_tasks REJECTED
        .mockResolvedValueOnce({}) // UPDATE workflow_executions REJECTED
        .mockResolvedValueOnce({ rows: [{ created_by: 'ra-1' }] }) // SELECT created_by FROM projects
        .mockResolvedValueOnce({}) // INSERT notifications
        .mockResolvedValueOnce({}); // COMMIT

      const res = await rejectV2Task('task-401', 'user-officer-1', 'Cadastral survey boundary discrepancy');
      expect(res.success).toBe(true);
      expect(res.status).toBe('REJECTED');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });
});
