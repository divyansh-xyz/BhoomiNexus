import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { createAuditEvent } from "../../utils/audit";

export const getTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignedTo, projectId } = req.query;

    let query = `
      SELECT t.id, t.project_id AS "projectId",
             p.code AS "projectCode", p.title AS "projectTitle",
             t.stage_id AS "stageId", t.stage_order AS "stageOrder",
             t.stage_name AS "stageName",
             t.department, t.sla_days AS "slaDays",
             t.due_date AS "dueDate", t.status,
             t.started_at AS "startedAt", t.completed_at AS "completedAt",
             t.rejection_reason AS "rejectionReason",
             t.required_documents AS "requiredDocuments",
             t.evidence_documents AS "evidenceDocuments",
             t.created_at AS "createdAt",
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
      query += ` AND t.assigned_officer_id = $${params.length}`;
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
    const { id } = req.params;

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
    const { id } = req.params;
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
    const { projectId, stageId } = req.params;
    const { explanation } = req.body;

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

    await createAuditEvent({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: "STAGE_RESUBMITTED",
      entityType: "TASK",
      entityId: taskResult.rows[0].id,
      projectId,
      metadata: { stageName: stage.name, explanation },
    });

    res.json({ stage: { id: stageId, status: "ACTIVE", name: stage.name }, task: taskResult.rows[0] });
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
    projectId: row.project_id,
    projectCode: row.project_code || "",
    projectTitle: row.project_title || "",
    stageId: row.stage_id,
    stageOrder: row.stage_order,
    stageName: row.stage_name,
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
    slaDays: row.sla_days,
    dueDate: row.due_date,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    rejectionReason: row.rejection_reason,
    requiredDocuments: (row.required_documents || []).map((doc: any, i: number) => {
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
    evidenceDocuments: row.evidence_documents || [],
    createdAt: row.created_at,
  };
}
