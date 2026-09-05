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

    const { projectId, taskId, parcelId, title, documentType, workflowStage } = req.body;

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
      `SELECT d.*, u.name AS uploader_name
       FROM documents d
       LEFT JOIN users u ON u.id = d.uploader_id
       WHERE d.id = $1`,
      [id]
    );

    if (result.rows.length === 0) return next(new ApiError(404, "Document not found"));

    const d = result.rows[0];
    res.json({
      id: d.id,
      projectId: d.project_id,
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
