import { Request, Response } from 'express';
import { pool } from '../../config/db';
import { logger } from '../../utils/logger';

export const getProjectGrievances = async (req: Request, res: Response): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;

    // Resolve project ID (in case a project code like PRJ-MH-4421 is passed)
    let actualProjectId = projectId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);
    if (!isUuid) {
      const projLookup = await pool.query('SELECT id FROM projects WHERE code = $1', [projectId]);
      if (projLookup.rows.length === 0) {
        res.status(404).json({ success: false, error: { message: 'Project not found' } });
        return;
      }
      actualProjectId = projLookup.rows[0].id;
    }

    const result = await pool.query(
      `SELECT id, reference_number, project_id, parcel_id, citizen_name,
              citizen_reference, survey_number, grievance_type, subject,
              description, status, resolution_notes, sla_days, source, citizen_phone, metadata,
              created_at, updated_at, resolved_at
       FROM grievances
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [actualProjectId]
    );

    const grievances = result.rows.map(row => ({
      id: row.id,
      referenceNumber: row.reference_number,
      projectId: row.project_id,
      parcelId: row.parcel_id,
      citizenName: row.citizen_name || 'Anonymous Landowner',
      citizenReference: row.citizen_reference || '',
      surveyNumber: row.survey_number || '',
      grievanceType: row.grievance_type,
      subject: row.subject,
      description: row.description,
      status: row.status,
      resolutionNotes: row.resolution_notes,
      slaDays: row.sla_days || 15,
      source: row.source || 'PORTAL',
      citizenPhone: row.citizen_phone || null,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at,
    }));

    const total = grievances.length;
    const open = grievances.filter(g => g.status === 'OPEN').length;
    const underReview = grievances.filter(g => g.status === 'UNDER_REVIEW').length;
    const resolved = grievances.filter(g => g.status === 'RESOLVED' || g.status === 'CLOSED').length;

    res.json({
      success: true,
      data: {
        grievances,
        summary: {
          total,
          open,
          underReview,
          resolved,
        },
      },
    });
  } catch (error: any) {
    logger.error('Error in getProjectGrievances', error);
    res.status(500).json({ success: false, error: { message: 'Failed to retrieve grievances record' } });
  }
};

export const createGrievance = async (req: Request, res: Response): Promise<void> => {
  try {
    const projectId = req.params.projectId as string;
    const {
      citizenName,
      citizenReference,
      surveyNumber,
      grievanceType,
      subject,
      description,
      slaDays = 15,
    } = req.body;

    if (!subject || !description || !grievanceType) {
      res.status(400).json({
        success: false,
        error: { message: 'Subject, description, and grievance type are required.' },
      });
      return;
    }

    // Resolve project ID
    let actualProjectId: string = projectId;
    let projectCode: string = projectId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);
    const projLookup = await pool.query(
      isUuid ? 'SELECT id, code FROM projects WHERE id = $1' : 'SELECT id, code FROM projects WHERE code = $1',
      [projectId]
    );

    if (projLookup.rows.length === 0) {
      res.status(404).json({ success: false, error: { message: 'Project not found' } });
      return;
    }
    actualProjectId = projLookup.rows[0].id;
    projectCode = projLookup.rows[0].code;

    // Generate reference number
    const seqResult = await pool.query(
      'SELECT COUNT(*) FROM grievances WHERE project_id = $1',
      [actualProjectId]
    );
    const nextNum = parseInt(seqResult.rows[0].count, 10) + 1;
    const refYear = new Date().getFullYear();
    const referenceNumber = `GRV-${refYear}-${projectCode.replace(/[^A-Za-z0-9]/g, '')}-${String(nextNum).padStart(2, '0')}`;

    const insertResult = await pool.query(
      `INSERT INTO grievances
       (reference_number, project_id, citizen_name, citizen_reference, survey_number,
        grievance_type, subject, description, status, sla_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'OPEN', $9)
       RETURNING *`,
      [
        referenceNumber,
        actualProjectId,
        citizenName || 'Aggrieved Landowner',
        citizenReference || null,
        surveyNumber || null,
        grievanceType,
        subject,
        description,
        slaDays,
      ]
    );

    const row = insertResult.rows[0];

    // Log to audit trail
    const user = (req as any).user;
    await pool.query(
      `INSERT INTO audit_logs (project_id, action, entity_type, entity_id, user_id, user_role, metadata)
       VALUES ($1, 'GRIEVANCE_RECORDED', 'GRIEVANCE', $2, $3, $4, $5)`,
      [
        actualProjectId,
        row.id,
        user?.id || null,
        user?.role || 'REQUESTING_AUTHORITY',
        JSON.stringify({
          referenceNumber,
          citizenName: row.citizen_name,
          grievanceType,
          subject,
        }),
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        id: row.id,
        referenceNumber: row.reference_number,
        projectId: row.project_id,
        citizenName: row.citizen_name,
        citizenReference: row.citizen_reference,
        surveyNumber: row.survey_number,
        grievanceType: row.grievance_type,
        subject: row.subject,
        description: row.description,
        status: row.status,
        resolutionNotes: row.resolution_notes,
        slaDays: row.sla_days,
        createdAt: row.created_at,
      },
    });
  } catch (error: any) {
    logger.error('Error in createGrievance', error);
    res.status(500).json({ success: false, error: { message: 'Failed to record grievance' } });
  }
};

export const respondGrievance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { grievanceId } = req.params;
    const { resolutionNotes, status = 'RESOLVED' } = req.body;

    if (!resolutionNotes) {
      res.status(400).json({
        success: false,
        error: { message: 'Resolution notes are required.' },
      });
      return;
    }

    const resolvedAt = (status === 'RESOLVED' || status === 'CLOSED') ? new Date() : null;

    const result = await pool.query(
      `UPDATE grievances
       SET resolution_notes = $1, status = $2, resolved_at = $3, updated_at = NOW()
       WHERE id = $1::uuid OR reference_number = $4
       RETURNING *`,
      [resolutionNotes, status, resolvedAt, grievanceId]
    ).catch(async () => {
      // Fallback if grievanceId is not UUID
      return await pool.query(
        `UPDATE grievances
         SET resolution_notes = $1, status = $2, resolved_at = $3, updated_at = NOW()
         WHERE reference_number = $4
         RETURNING *`,
        [resolutionNotes, status, resolvedAt, grievanceId]
      );
    });

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: { message: 'Grievance record not found' } });
      return;
    }

    const row = result.rows[0];

    // Log to audit
    const user = (req as any).user;
    await pool.query(
      `INSERT INTO audit_logs (project_id, action, entity_type, entity_id, user_id, user_role, metadata)
       VALUES ($1, 'GRIEVANCE_RESOLVED', 'GRIEVANCE', $2, $3, $4, $5)`,
      [
        row.project_id,
        row.id,
        user?.id || null,
        user?.role || 'PROCESSING_OFFICER',
        JSON.stringify({
          referenceNumber: row.reference_number,
          status: row.status,
          resolutionNotes,
        }),
      ]
    );

    res.json({
      success: true,
      data: row,
    });
  } catch (error: any) {
    logger.error('Error in respondGrievance', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update grievance record' } });
  }
};
