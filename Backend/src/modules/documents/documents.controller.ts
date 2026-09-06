import { Request, Response, NextFunction } from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { pool } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { createAuditEvent } from "../../utils/audit";

export const uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return next(new ApiError(400, "No file uploaded"));

    let { projectId, taskId, parcelId, title, documentType, workflowStage } = req.body;

    if (!projectId && taskId) {
      const taskRes = await pool.query(`SELECT project_id, stage_name FROM tasks WHERE id = $1`, [taskId]);
      if (taskRes.rows.length > 0) {
        projectId = taskRes.rows[0].project_id;
        if (!workflowStage) {
          workflowStage = taskRes.rows[0].stage_name;
        }
      }
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const result = await pool.query(
      `INSERT INTO documents
       (project_id, task_id, parcel_id, title, document_type, file_path,
        file_size, mime_type, hash, uploader_id, workflow_stage)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        projectId || null, taskId || null, parcelId || null,
        title || req.file.originalname, documentType || "GENERAL",
        req.file.path, req.file.size, req.file.mimetype, hash,
        req.user!.id, workflowStage || null,
      ]
    );

    const doc = result.rows[0];

    await pool.query(
      `INSERT INTO document_versions (document_id, version_number, file_path, file_size, hash, uploader_id)
       VALUES ($1, 1, $2, $3, $4, $5)`,
      [doc.id, req.file.path, req.file.size, hash, req.user!.id]
    );

    await createAuditEvent({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: "DOCUMENT_UPLOADED",
      entityType: "DOCUMENT",
      entityId: doc.id,
      projectId: projectId || null,
      metadata: { title: doc.title, documentType },
    });

    res.status(201).json({
      id: doc.id,
      title: doc.title,
      documentType: doc.document_type,
      fileSize: doc.file_size,
      hash: doc.hash,
      processingStatus: doc.processing_status,
      createdAt: doc.created_at,
    });
  } catch (error) {
    next(error);
  }
};

export const getDocumentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT d.*, u.name AS uploader_name, p.title AS project_title
       FROM documents d
       LEFT JOIN users u ON u.id = d.uploader_id
       LEFT JOIN projects p ON p.id = d.project_id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) return next(new ApiError(404, "Document not found"));

    const d = result.rows[0];
    res.json({
      id: d.id,
      projectId: d.project_id,
      projectTitle: d.project_title,
      taskId: d.task_id,
      title: d.title,
      documentType: d.document_type,
      fileSize: d.file_size,
      mimeType: d.mime_type,
      hash: d.hash,
      uploaderName: d.uploader_name,
      workflowStage: d.workflow_stage,
      processingStatus: d.processing_status,
      verificationStatus: d.verification_status,
      currentVersion: d.current_version,
      createdAt: d.created_at,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`SELECT file_path, title, mime_type FROM documents WHERE id = $1`, [id]);
    if (result.rows.length === 0) return next(new ApiError(404, "Document not found"));
    const doc = result.rows[0];

    if (!fs.existsSync(doc.file_path)) {
      return next(new ApiError(404, "File not found on disk"));
    }

    res.setHeader("Content-Type", doc.mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${doc.title}"`);
    fs.createReadStream(doc.file_path).pipe(res);
  } catch (error) {
    next(error);
  }
};

export const getDocumentVersions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT dv.*, u.name AS uploader_name
       FROM document_versions dv
       LEFT JOIN users u ON u.id = dv.uploader_id
       WHERE dv.document_id = $1
       ORDER BY dv.version_number DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createDocumentVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!req.file) return next(new ApiError(400, "No file uploaded"));

    const fileBuffer = fs.readFileSync(req.file.path);
    const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const docResult = await pool.query(`SELECT current_version FROM documents WHERE id = $1`, [id]);
    if (docResult.rows.length === 0) return next(new ApiError(404, "Document not found"));

    const newVersion = (docResult.rows[0].current_version || 1) + 1;
    const { changeNotes } = req.body;

    await pool.query(
      `INSERT INTO document_versions (document_id, version_number, file_path, file_size, hash, uploader_id, change_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, newVersion, req.file.path, req.file.size, hash, req.user!.id, changeNotes || null]
    );

    await pool.query(
      `UPDATE documents SET file_path = $1, file_size = $2, hash = $3, current_version = $4, updated_at = NOW() WHERE id = $5`,
      [req.file.path, req.file.size, hash, newVersion, id]
    );

    res.json({ success: true, version: newVersion });
  } catch (error) {
    next(error);
  }
};

export const getDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, taskId, parcelId } = req.query;

    let query = `
      SELECT d.*, u.name AS uploader_name, p.code AS project_code, p.title AS project_title
      FROM documents d
      LEFT JOIN users u ON u.id = d.uploader_id
      LEFT JOIN projects p ON p.id = d.project_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (projectId) {
      params.push(projectId);
      query += ` AND d.project_id = $${params.length}`;
    }
    if (taskId) {
      params.push(taskId);
      query += ` AND d.task_id = $${params.length}`;
    }
    if (parcelId) {
      params.push(parcelId);
      query += ` AND d.parcel_id = $${params.length}`;
    }

    query += ` ORDER BY d.created_at DESC`;

    const result = await pool.query(query, params);

    const documents = await Promise.all(result.rows.map(async (d) => {
      // Fetch versions for each document
      const versionsRes = await pool.query(
        `SELECT dv.id, dv.version_number, dv.hash, u.name AS uploaded_by, dv.created_at, dv.file_path, d.processing_status, d.verification_status 
         FROM document_versions dv
         LEFT JOIN users u ON u.id = dv.uploader_id
         LEFT JOIN documents d ON d.id = dv.document_id
         WHERE dv.document_id = $1
         ORDER BY dv.version_number DESC`,
        [d.id]
      );

      return {
        id: d.id,
        documentType: d.document_type || 'OTHER',
        projectRef: d.project_code || 'UNASSIGNED',
        parcelRef: d.parcel_id,
        workflowStage: d.workflow_stage,
        currentVersion: d.current_version,
        latestProcessingStatus: d.processing_status || 'PENDING',
        latestVerificationStatus: d.verification_status || 'PENDING',
        title: d.title,
        versions: versionsRes.rows.map((v) => ({
          id: v.id,
          versionNumber: v.version_number,
          hash: v.hash || 'N/A',
          uploadedBy: v.uploaded_by || 'Unknown',
          uploadedAt: v.created_at,
          fileReference: v.file_path,
          processingStatus: v.processing_status || 'PENDING',
          verificationStatus: v.verification_status || 'PENDING'
        }))
      };
    }));

    res.json(documents);
  } catch (error) {
    next(error);
  }
};
