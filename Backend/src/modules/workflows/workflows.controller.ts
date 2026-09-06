import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { createAuditEvent } from "../../utils/audit";

export const getTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      `SELECT id, name, category, description, statutory_act AS "statutoryAct"
       FROM workflow_templates WHERE is_published = true ORDER BY name`
    );
    
    const templates = result.rows;
    const templateIds = templates.map(t => t.id);
    
    if (templateIds.length > 0) {
      const stagesRes = await pool.query(
        `SELECT id, template_id, stage_order AS "order", name, description, department, assigned_role AS "assignedRole",
                default_sla_days AS "defaultSlaDays", required_documents AS "requiredDocuments"
         FROM workflow_template_stages WHERE template_id = ANY($1) ORDER BY template_id, stage_order`, 
        [templateIds]
      );
      
      const stagesMap: Record<string, any[]> = {};
      stagesRes.rows.forEach(s => {
         if (!stagesMap[s.template_id]) stagesMap[s.template_id] = [];
         stagesMap[s.template_id].push(s);
      });
      
      templates.forEach(t => {
         t.defaultStages = stagesMap[t.id] || [];
      });
    }

    res.json(templates);
  } catch (error) {
    next(error);
  }
};

export const getTemplateById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const templateRes = await pool.query(
      `SELECT id, name, category, description, statutory_act AS "statutoryAct"
       FROM workflow_templates WHERE id = $1`, [id]
    );
    
    if (templateRes.rows.length === 0) return next(new ApiError(404, "Template not found"));
    
    const stagesRes = await pool.query(
      `SELECT id, stage_order AS "order", name, description, department, assigned_role AS "assignedRole",
              default_sla_days AS "defaultSlaDays", required_documents AS "requiredDocuments"
       FROM workflow_template_stages WHERE template_id = $1 ORDER BY stage_order`, [id]
    );

    res.json({
      ...templateRes.rows[0],
      defaultStages: stagesRes.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const initializeWorkflow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { templateId } = req.body;
    
    console.log(`[DEBUG] initializeWorkflow -> projectId: ${projectId}, templateId: ${templateId}`);

    const templateRes = await pool.query(`SELECT * FROM workflow_templates WHERE id = $1`, [templateId]);
    if (templateRes.rows.length === 0) return next(new ApiError(404, "Template not found"));

    const existingWf = await pool.query(`SELECT id FROM workflow_instances WHERE project_id = $1`, [projectId]);
    if (existingWf.rows.length > 0) return next(new ApiError(400, "Workflow already initialized for this project"));

    const wfRes = await pool.query(
      `INSERT INTO workflow_instances (project_id, template_id, template_name, status)
       VALUES ($1, $2, $3, 'DRAFT') RETURNING id`,
      [projectId, templateId, templateRes.rows[0].name]
    );
    
    const wfId = wfRes.rows[0].id;

    const stagesRes = await pool.query(`SELECT * FROM workflow_template_stages WHERE template_id = $1 ORDER BY stage_order`, [templateId]);
    
    for (const stage of stagesRes.rows) {
      await pool.query(
        `INSERT INTO workflow_instance_stages
         (workflow_id, stage_order, name, description, department, assigned_role, sla_days, is_mandatory, required_documents)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [wfId, stage.stage_order, stage.name, stage.description, stage.department, stage.assigned_role, stage.default_sla_days, stage.is_mandatory, JSON.stringify(stage.required_documents)]
      );
    }

    await pool.query(`UPDATE projects SET status = 'WORKFLOW_CONFIG' WHERE id = $1`, [projectId]);

    await createAuditEvent({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: "WORKFLOW_INITIALIZED",
      entityType: "PROJECT",
      entityId: projectId,
      projectId: projectId,
      metadata: { templateId, templateName: templateRes.rows[0].name },
    });

    // Fetch the newly created workflow to return a full ProjectWorkflowInstance
    const newWfRes = await pool.query(
      `SELECT id, template_id AS "templateId", template_name AS "templateName", status, activated_at AS "activatedAt"
       FROM workflow_instances WHERE id = $1`, [wfId]
    );
    const newWf = newWfRes.rows[0];

    const newStagesRes = await pool.query(
      `SELECT wis.id, wis.stage_order AS "order", wis.name, wis.description, wis.department,
              wis.assigned_role AS "assignedRole", wis.assigned_officer_id AS "assignedOfficerId",
              u.name AS "assignedOfficerName", u.designation AS "assignedOfficerDesignation",
              wis.sla_days AS "slaDays", wis.is_mandatory AS "isMandatory",
              wis.required_documents AS "requiredDocuments", wis.status
       FROM workflow_instance_stages wis
       LEFT JOIN users u ON u.id = wis.assigned_officer_id
       WHERE wis.workflow_id = $1
       ORDER BY wis.stage_order`, [wfId]
    );

    const formattedStages = newStagesRes.rows.map(stage => {
      let assignedOfficer = undefined;
      if (stage.assignedOfficerId) {
        assignedOfficer = {
          id: stage.assignedOfficerId,
          name: stage.assignedOfficerName,
          designation: stage.assignedOfficerDesignation
        };
      }
      return {
        ...stage,
        assignedOfficer
      };
    });

    res.json({
      ...newWf,
      projectId,
      stages: formattedStages,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectWorkflow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    const wfRes = await pool.query(
      `SELECT id, template_id AS "templateId", template_name AS "templateName", status, activated_at AS "activatedAt"
       FROM workflow_instances WHERE project_id = $1`, [projectId]
    );

    if (wfRes.rows.length === 0) return next(new ApiError(404, "Workflow not found"));
    const wf = wfRes.rows[0];

    const stagesRes = await pool.query(
      `SELECT wis.id, wis.stage_order AS "order", wis.name, wis.description, wis.department,
              wis.assigned_role AS "assignedRole", wis.assigned_officer_id AS "assignedOfficerId",
              u.name AS "assignedOfficerName", u.designation AS "assignedOfficerDesignation",
              wis.sla_days AS "slaDays", wis.is_mandatory AS "isMandatory",
              wis.required_documents AS "requiredDocuments", wis.status
       FROM workflow_instance_stages wis
       LEFT JOIN users u ON u.id = wis.assigned_officer_id
       WHERE wis.workflow_id = $1
       ORDER BY wis.stage_order`, [wf.id]
    );

    const formattedStages = stagesRes.rows.map(stage => {
      let assignedOfficer = undefined;
      if (stage.assignedOfficerId) {
        assignedOfficer = {
          id: stage.assignedOfficerId,
          name: stage.assignedOfficerName,
          designation: stage.assignedOfficerDesignation
        };
      }
      return {
        ...stage,
        assignedOfficer
      };
    });

    res.json({
      ...wf,
      projectId,
      stages: formattedStages,
    });
  } catch (error) {
    next(error);
  }
};

export const addStage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { name, description, department, assignedRole, slaDays, requiredDocuments } = req.body;
    let { assignedOfficerId } = req.body;
    
    if (!assignedOfficerId && req.body.assignedOfficer?.id) {
      assignedOfficerId = req.body.assignedOfficer.id;
    }

    const wfRes = await pool.query(`SELECT id, status FROM workflow_instances WHERE project_id = $1`, [projectId]);
    if (wfRes.rows.length === 0) return next(new ApiError(404, "Workflow not found"));
    if (wfRes.rows[0].status !== 'DRAFT') return next(new ApiError(400, "Cannot modify active workflow"));

    const maxOrderRes = await pool.query(`SELECT MAX(stage_order) as max_order FROM workflow_instance_stages WHERE workflow_id = $1`, [wfRes.rows[0].id]);
    const nextOrder = (maxOrderRes.rows[0].max_order || 0) + 1;

    const newStage = await pool.query(
      `INSERT INTO workflow_instance_stages
       (workflow_id, stage_order, name, description, department, assigned_role, assigned_officer_id, sla_days, required_documents)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [wfRes.rows[0].id, nextOrder, name, description, department, assignedRole, assignedOfficerId || null, slaDays || 7, requiredDocuments ? JSON.stringify(requiredDocuments) : '[]']
    );

    res.json(newStage.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateStage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, stageId } = req.params;
    const { name, description, department, assignedRole, slaDays, requiredDocuments } = req.body;
    let { assignedOfficerId } = req.body;
    
    if (!assignedOfficerId && req.body.assignedOfficer?.id) {
      assignedOfficerId = req.body.assignedOfficer.id;
    }

    const wfRes = await pool.query(`SELECT id, status FROM workflow_instances WHERE project_id = $1`, [projectId]);
    if (wfRes.rows.length === 0) return next(new ApiError(404, "Workflow not found"));
    if (wfRes.rows[0].status !== 'DRAFT') return next(new ApiError(400, "Cannot modify active workflow"));

    await pool.query(
      `UPDATE workflow_instance_stages SET
       name = COALESCE($1, name), description = COALESCE($2, description), department = COALESCE($3, department),
       assigned_role = COALESCE($4, assigned_role), assigned_officer_id = $5, sla_days = COALESCE($6, sla_days),
       required_documents = COALESCE($7, required_documents)
       WHERE id = $8 AND workflow_id = $9`,
      [name, description, department, assignedRole, assignedOfficerId, slaDays, requiredDocuments ? JSON.stringify(requiredDocuments) : null, stageId, wfRes.rows[0].id]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const removeStage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, stageId } = req.params;

    const wfRes = await pool.query(`SELECT id, status FROM workflow_instances WHERE project_id = $1`, [projectId]);
    if (wfRes.rows.length === 0) return next(new ApiError(404, "Workflow not found"));
    if (wfRes.rows[0].status !== 'DRAFT') return next(new ApiError(400, "Cannot modify active workflow"));

    await pool.query(`DELETE FROM workflow_instance_stages WHERE id = $1 AND workflow_id = $2`, [stageId, wfRes.rows[0].id]);
    
    // Reorder remaining
    const stages = await pool.query(`SELECT id FROM workflow_instance_stages WHERE workflow_id = $1 ORDER BY stage_order`, [wfRes.rows[0].id]);
    for (let i = 0; i < stages.rows.length; i++) {
      await pool.query(`UPDATE workflow_instance_stages SET stage_order = $1 WHERE id = $2`, [i + 1, stages.rows[i].id]);
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const reorderWorkflow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { stageIds } = req.body;

    if (!Array.isArray(stageIds)) return next(new ApiError(400, "stageIds must be an array"));

    const wfRes = await pool.query(`SELECT id, status FROM workflow_instances WHERE project_id = $1`, [projectId]);
    if (wfRes.rows.length === 0) return next(new ApiError(404, "Workflow not found"));
    if (wfRes.rows[0].status !== 'DRAFT') return next(new ApiError(400, "Cannot modify active workflow"));

    for (let i = 0; i < stageIds.length; i++) {
      await pool.query(`UPDATE workflow_instance_stages SET stage_order = $1 WHERE id = $2 AND workflow_id = $3`, [i + 1, stageIds[i], wfRes.rows[0].id]);
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const activateWorkflow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    const wfRes = await pool.query(`SELECT id, status FROM workflow_instances WHERE project_id = $1`, [projectId]);
    if (wfRes.rows.length === 0) return next(new ApiError(404, "Workflow not found"));
    if (wfRes.rows[0].status !== 'DRAFT') return next(new ApiError(400, "Workflow already active"));
    const wfId = wfRes.rows[0].id;

    // Verify all stages have officers
    const stages = await pool.query(`SELECT id, assigned_officer_id FROM workflow_instance_stages WHERE workflow_id = $1`, [wfId]);
    for (const s of stages.rows) {
      if (!s.assigned_officer_id) return next(new ApiError(400, "All stages must have an assigned officer before activation"));
    }

    // Activate workflow
    await pool.query(`UPDATE workflow_instances SET status = 'ACTIVE', activated_at = NOW(), activated_by = $1 WHERE id = $2`, [req.user!.id, wfId]);
    await pool.query(`UPDATE projects SET status = 'WORKFLOW_ACTIVE', updated_at = NOW() WHERE id = $1`, [projectId]);

    // Set first stage to ACTIVE
    const firstStage = await pool.query(`SELECT * FROM workflow_instance_stages WHERE workflow_id = $1 ORDER BY stage_order LIMIT 1`, [wfId]);
    if (firstStage.rows.length > 0) {
      const fs = firstStage.rows[0];
      await pool.query(`UPDATE workflow_instance_stages SET status = 'ACTIVE' WHERE id = $1`, [fs.id]);

      // Create first task
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (fs.sla_days || 7));

      await pool.query(
        `INSERT INTO tasks
         (project_id, workflow_id, stage_id, stage_order, stage_name, assigned_officer_id, department, sla_days, due_date, status, required_documents)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ASSIGNED', $10)`,
        [projectId, wfId, fs.id, fs.stage_order, fs.name, fs.assigned_officer_id, fs.department, fs.sla_days, dueDate.toISOString(), JSON.stringify(fs.required_documents || [])]
      );
    }

    await createAuditEvent({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: "WORKFLOW_ACTIVATED",
      entityType: "PROJECT",
      entityId: projectId,
      projectId: projectId,
    });

    res.json({ success: true, message: "Workflow activated" });
  } catch (error) {
    next(error);
  }
};
