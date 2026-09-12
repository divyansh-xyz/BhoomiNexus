import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { createAuditEvent } from "../../utils/audit";
import { NotificationService } from "../notifications/notifications.service";

export const getTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignedTo, projectId } = req.query;

    let query = `
      SELECT t.id, t.project_id,
             p.code AS project_code, p.title AS project_title,
             t.stage_id, t.stage_order,
             t.stage_name,
             t.department, t.sla_days,
             t.due_date, t.status,
             t.started_at, t.completed_at,
             t.rejection_reason,
             t.required_documents,
             t.evidence_documents,
             t.created_at,
             u.id AS officer_id, u.name AS officer_name,
             u.designation AS officer_designation, u.department AS officer_department,
             u.cadre AS officer_cadre, u.email AS officer_email,
             u.phone AS officer_phone, u.office_location AS officer_office
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assigned_officer_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (assignedTo === "me" && req.user) {
      params.push(req.user.id);
      query += ` AND (t.assigned_officer_id = $${params.length} OR t.assigned_officer_id IS NULL)`;
    }

    if (projectId) {
      params.push(projectId);
      query += ` AND t.project_id = $${params.length}`;
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await pool.query(query, params);

    const tasks = result.rows.map(mapTaskRow);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT t.*, p.code AS project_code, p.title AS project_title,
              u.id AS officer_id, u.name AS officer_name,
              u.designation AS officer_designation, u.department AS officer_department,
              u.cadre AS officer_cadre, u.email AS officer_email,
              u.phone AS officer_phone, u.office_location AS officer_office
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assigned_officer_id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) return next(new ApiError(404, "Task not found"));

    const taskRow = result.rows[0];
    const task = mapTaskRow(taskRow);

    // Fetch parcels for this project to attach as relevantParcels
    const parcelsResult = await pool.query(
      `SELECT lp.id, lp.survey_number, lp.village, lp.area_acres
       FROM project_parcels pp
       JOIN land_parcels lp ON lp.id = pp.parcel_id
       WHERE pp.project_id = $1`,
      [taskRow.project_id]
    );

    task.relevantParcels = parcelsResult.rows.map((p: any) => ({
      id: p.id,
      surveyNumber: p.survey_number,
      village: p.village,
      area: `${p.area_acres} Acres`
    }));

    res.json(task);
  } catch (error) {
    next(error);
  }
};

export const startTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [id]);
    if (existing.rows.length === 0) return next(new ApiError(404, "Task not found"));

    const task = existing.rows[0];
    if (task.status !== "ASSIGNED") {
      return next(new ApiError(400, "Task can only be started from ASSIGNED status"));
    }

    const result = await pool.query(
      `UPDATE tasks SET status = 'IN_PROGRESS', started_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    await createAuditEvent({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: "TASK_STARTED",
      entityType: "TASK",
      entityId: id,
      projectId: task.project_id,
    });

    const fullResult = await pool.query(
      `SELECT t.*, p.code AS project_code, p.title AS project_title,
              u.id AS officer_id, u.name AS officer_name,
              u.designation AS officer_designation, u.department AS officer_department,
              u.cadre AS officer_cadre, u.email AS officer_email,
              u.phone AS officer_phone, u.office_location AS officer_office
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assigned_officer_id
       WHERE t.id = $1`,
      [id]
    );

    res.json(mapTaskRow(fullResult.rows[0]));
  } catch (error) {
    next(error);
  }
};

export const acceptTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const existing = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [id]);
    if (existing.rows.length === 0) return next(new ApiError(404, "Task not found"));

    const task = existing.rows[0];
    if (task.status !== "IN_PROGRESS" && task.status !== "ASSIGNED") {
      return next(new ApiError(400, "Task cannot be accepted in current status"));
    }

    await pool.query(`UPDATE tasks SET status = 'ACCEPTED', completed_at = NOW() WHERE id = $1`, [id]);
    await pool.query(`UPDATE workflow_instance_stages SET status = 'COMPLETED' WHERE id = $1`, [task.stage_id]);

    await createAuditEvent({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: "STAGE_ACCEPTED",
      entityType: "TASK",
      entityId: id,
      projectId: task.project_id,
      metadata: { stageName: task.stage_name },
    });

    // Advance workflow
    const nextStage = await pool.query(
      `SELECT * FROM workflow_instance_stages
       WHERE workflow_id = $1 AND stage_order > $2 AND status = 'PENDING'
       ORDER BY stage_order LIMIT 1`,
      [task.workflow_id, task.stage_order]
    );

    let nextTask = null;
    let nextStageData = null;
    let isWorkflowCompleted = false;

    if (nextStage.rows.length > 0) {
      const ns = nextStage.rows[0];
      await pool.query(`UPDATE workflow_instance_stages SET status = 'ACTIVE' WHERE id = $1`, [ns.id]);

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (ns.sla_days || 7));

      const ntResult = await pool.query(
        `INSERT INTO tasks
         (project_id, workflow_id, stage_id, stage_order, stage_name,
          assigned_officer_id, department, sla_days, due_date, status, required_documents)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ASSIGNED',$10) RETURNING *`,
        [task.project_id, task.workflow_id, ns.id, ns.stage_order, ns.name, ns.assigned_officer_id, ns.department, ns.sla_days, dueDate.toISOString(), JSON.stringify(ns.required_documents || [])]
      );

      nextTask = ntResult.rows[0];
      nextStageData = ns;

      await createAuditEvent({
        userId: req.user!.id,
        userRole: req.user!.role,
        action: "TASK_ASSIGNED",
        entityType: "TASK",
        entityId: nextTask.id,
        projectId: task.project_id,
        metadata: { stageName: ns.name, assignedTo: ns.assigned_officer_id },
      });
    } else {
      isWorkflowCompleted = true;
      await pool.query(`UPDATE workflow_instances SET status = 'COMPLETED' WHERE id = $1`, [task.workflow_id]);
      await pool.query(`UPDATE projects SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1`, [task.project_id]);

      await createAuditEvent({
        userId: req.user!.id,
        userRole: req.user!.role,
        action: "PROJECT_APPROVED",
        entityType: "PROJECT",
        entityId: task.project_id,
        projectId: task.project_id,
      });
    }

    const completedTask = await pool.query(
      `SELECT t.*, p.code AS project_code, p.title AS project_title,
              u.id AS officer_id, u.name AS officer_name,
              u.designation AS officer_designation, u.department AS officer_department,
              u.cadre AS officer_cadre, u.email AS officer_email,
              u.phone AS officer_phone, u.office_location AS officer_office
       FROM tasks t JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assigned_officer_id WHERE t.id = $1`, [id]
    );

    // Phase 15: In-App Notifications for Stage Completion / Advance
    try {
      const projQuery = await pool.query(`SELECT id, code, title, created_by FROM projects WHERE id = $1`, [task.project_id]);
      const project = projQuery.rows[0];

      if (isWorkflowCompleted) {
        if (project) {
          await NotificationService.createNotification({
            userId: project.created_by || null,
            role: "REQUESTING_AUTHORITY",
            projectId: task.project_id,
            taskId: id,
            type: "PROCESS_COMPLETED",
            title: `Process Completed: ${project.title}`,
            message: `All statutory officer stages have been completed and approved for project "${project.title}" (${project.code})!`,
            link: `/projects/${task.project_id}`,
            metadata: { projectCode: project.code },
          });
        }
        await NotificationService.createNotification({
          role: "BOSS",
          projectId: task.project_id,
          taskId: id,
          type: "PROCESS_COMPLETED",
          title: `Workflow Completed: ${project?.title || task.project_id}`,
          message: `All statutory stages for project "${project?.title || task.project_id}" have completed statutory clearance.`,
          link: `/boss/projects/${task.project_id}`,
          metadata: { projectCode: project?.code },
        });
      } else if (nextTask && nextStageData) {
        if (project) {
          await NotificationService.createNotification({
            userId: project.created_by || null,
            role: "REQUESTING_AUTHORITY",
            projectId: task.project_id,
            taskId: id,
            type: "STAGE_ACCEPTED",
            title: `Stage Cleared: ${task.stage_name}`,
            message: `Officer approved and cleared stage "${task.stage_name}" for project "${project.title}" (${project.code}). Next stage "${nextStageData.name}" is active.`,
            link: `/projects/${task.project_id}`,
            metadata: {
              completedStage: task.stage_name,
              nextStage: nextStageData.name,
              projectCode: project.code,
            },
          });
        }
        if (nextTask.assigned_officer_id) {
          await NotificationService.createNotification({
            userId: nextTask.assigned_officer_id,
            role: "PROCESSING_OFFICER",
            projectId: task.project_id,
            taskId: nextTask.id,
            type: "TASK_ASSIGNED",
            title: `New Task Assigned: ${nextStageData.name}`,
            message: `You have been assigned to review and complete stage "${nextStageData.name}" for project "${project?.title || task.project_id}".`,
            link: `/officer/dashboard`,
            metadata: {
              stageName: nextStageData.name,
              projectCode: project?.code,
            },
          });
        }
      }
    } catch (notifErr) {
      console.error("[Notification] Error dispatching acceptTask notification:", notifErr);
    }
    res.json({
      task: mapTaskRow(completedTask.rows[0]),
      completedStage: { id: task.stage_id, status: "COMPLETED", name: task.stage_name },
      nextStage: nextStageData ? { id: nextStageData.id, status: "ACTIVE", name: nextStageData.name } : undefined,
      nextTask: nextTask ? { id: nextTask.id, stageName: nextTask.stage_name } : undefined,
      isWorkflowCompleted,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;

    const existing = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [id]);
    if (existing.rows.length === 0) return next(new ApiError(404, "Task not found"));

    const task = existing.rows[0];
    if (task.status !== "IN_PROGRESS" && task.status !== "ASSIGNED") {
      return next(new ApiError(400, "Task cannot be rejected in current status"));
    }

    await pool.query(`UPDATE tasks SET status = 'REJECTED', rejection_reason = $1, completed_at = NOW() WHERE id = $2`, [reason, id]);
    await pool.query(`UPDATE workflow_instance_stages SET status = 'REJECTED' WHERE id = $1`, [task.stage_id]);

    await createAuditEvent({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: "STAGE_REJECTED",
      entityType: "TASK",
      entityId: id,
      projectId: task.project_id,
      metadata: { stageName: task.stage_name, reason },
    });

    const fullResult = await pool.query(
      `SELECT t.*, p.code AS project_code, p.title AS project_title,
              u.id AS officer_id, u.name AS officer_name,
              u.designation AS officer_designation, u.department AS officer_department,
              u.cadre AS officer_cadre, u.email AS officer_email,
              u.phone AS officer_phone, u.office_location AS officer_office
       FROM tasks t JOIN projects p ON p.id = t.project_id
       LEFT JOIN users u ON u.id = t.assigned_officer_id WHERE t.id = $1`, [id]
    );

    // Phase 15: In-App Notifications for Stage Rejection
    try {
      const projQuery = await pool.query(`SELECT id, code, title, created_by FROM projects WHERE id = $1`, [task.project_id]);
      const project = projQuery.rows[0];

      if (project) {
        // 1. Notify Requesting Authority
        await NotificationService.createNotification({
          userId: project.created_by || null,
          role: "REQUESTING_AUTHORITY",
          projectId: task.project_id,
          taskId: id,
          type: "STAGE_REJECTED",
          title: `Stage Rejected: ${task.stage_name}`,
          message: `Processing Officer remitted and rejected stage "${task.stage_name}" for project "${project.title}" (${project.code}). Statutory Reason: "${reason}". Action Required: Please review statutory observations and resubmit corrective documentation.`,
          link: `/projects/${task.project_id}`,
          metadata: {
            stageName: task.stage_name,
            reason,
            projectCode: project.code,
          },
        });

        // 2. Notify BOSS
        await NotificationService.createNotification({
          role: "BOSS",
          projectId: task.project_id,
          taskId: id,
          type: "STAGE_REJECTED",
          title: `Stage Remitted: ${task.stage_name}`,
          message: `Processing Officer remitted stage "${task.stage_name}" on project "${project.title}" (${project.code}). Statutory Reason: "${reason}".`,
          link: `/boss/projects/${task.project_id}`,
          metadata: {
            stageName: task.stage_name,
            reason,
            projectCode: project.code,
          },
        });
      }
    } catch (notifErr) {
      console.error("[Notification] Error dispatching rejection notification:", notifErr);
    }
    res.json({
      task: mapTaskRow(fullResult.rows[0]),
      rejectedStage: { id: task.stage_id, status: "REJECTED", name: task.stage_name },
    });
  } catch (error) {
    next(error);
  }
};

export const resubmitStage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params.projectId as string;
    const stageId = req.params.stageId as string;
    const { explanation, documentIds } = req.body;

    const stageResult = await pool.query(
      `SELECT wis.*, wi.id AS workflow_id FROM workflow_instance_stages wis
       JOIN workflow_instances wi ON wi.id = wis.workflow_id
       WHERE wis.id = $1 AND wi.project_id = $2`, [stageId, projectId]
    );

    if (stageResult.rows.length === 0) return next(new ApiError(404, "Stage not found"));
    const stage = stageResult.rows[0];
    if (stage.status !== "REJECTED") return next(new ApiError(400, "Only rejected stages can be resubmitted"));

    await pool.query(`UPDATE workflow_instance_stages SET status = 'ACTIVE' WHERE id = $1`, [stageId]);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (stage.sla_days || 7));

    const taskResult = await pool.query(
      `INSERT INTO tasks
       (project_id, workflow_id, stage_id, stage_order, stage_name, assigned_officer_id, department, sla_days, due_date, status, required_documents)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ASSIGNED',$10) RETURNING *`,
      [projectId, stage.workflow_id, stageId, stage.stage_order, stage.name, stage.assigned_officer_id, stage.department, stage.sla_days, dueDate.toISOString(), stage.required_documents || "[]"]
    );

    const newTask = taskResult.rows[0];

    // Phase 11: Link optional corrective documents to the new task
    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      await pool.query(
        `UPDATE documents SET task_id = $1, project_id = $2, workflow_stage = $3 WHERE id = ANY($4)`,
        [newTask.id, projectId, stage.name, documentIds]
      );
    }
    await createAuditEvent({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: "STAGE_RESUBMITTED",
      entityType: "TASK",
      entityId: newTask.id,
      projectId,
      metadata: { stageName: stage.name, explanation, documentIds: documentIds || [] },
    });

    // Phase 15: In-App Notification for Stage Resubmission
    try {
      const projQuery = await pool.query(`SELECT id, code, title FROM projects WHERE id = $1`, [projectId]);
      const project = projQuery.rows[0];

      if (newTask.assigned_officer_id) {
        await NotificationService.createNotification({
          userId: newTask.assigned_officer_id,
          role: "PROCESSING_OFFICER",
          projectId,
          taskId: newTask.id,
          type: "STAGE_RESUBMITTED",
          title: `Stage Resubmitted: ${stage.name}`,
          message: `Requesting Authority has resubmitted corrective evidence for stage "${stage.name}" on project "${project?.title || projectId}".`,
          link: `/officer/dashboard`,
          metadata: {
            stageName: stage.name,
            explanation,
            projectCode: project?.code,
          },
        });
      }
    } catch (notifErr) {
      console.error("[Notification] Error dispatching resubmitStage notification:", notifErr);
    }

    res.json({ stage: { id: stageId, status: "ACTIVE", name: stage.name }, task: newTask });
  } catch (error) {
    next(error);
  }
};

export const getTaskDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;
    const result = await pool.query(
      `SELECT id, title, document_type AS type, file_size AS "fileSize",
              created_at AS "uploadedAt", verification_status AS verified, hash
       FROM documents WHERE task_id = $1 ORDER BY created_at`, [taskId]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

function mapTaskRow(row: any): any {
  return {
    id: row.id,
    projectId: row.project_id || row.projectId,
    projectCode: row.project_code || row.projectCode || "",
    projectTitle: row.project_title || row.projectTitle || "",
    stageId: row.stage_id || row.stageId,
    stageOrder: row.stage_order || row.stageOrder,
    stageName: row.stage_name || row.stageName,
    assignedOfficer: row.officer_id ? {
      id: row.officer_id,
      name: row.officer_name || "",
      designation: row.officer_designation || "",
      department: row.officer_department || "",
      cadre: row.officer_cadre || "",
      email: row.officer_email || "",
      phone: row.officer_phone || "",
      officeLocation: row.officer_office || "",
    } : null,
    department: row.department,
    slaDays: row.sla_days ?? row.slaDays,
    dueDate: row.due_date || row.dueDate,
    status: row.status,
    startedAt: row.started_at || row.startedAt,
    completedAt: row.completed_at || row.completedAt,
    rejectionReason: row.rejection_reason || row.rejectionReason,
    requiredDocuments: (row.required_documents || row.requiredDocuments || []).map((doc: any, i: number) => {
      if (typeof doc === 'string') {
        return {
          id: `doc-${i}`,
          name: doc,
          type: 'Statutory Document',
          status: 'MISSING'
        };
      }
      return doc;
    }),
    evidenceDocuments: row.evidence_documents || row.evidenceDocuments || [],
    createdAt: row.created_at || row.createdAt,
  };
}
