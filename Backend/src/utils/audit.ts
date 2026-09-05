import { pool } from "../config/db";

interface AuditEventPayload {
  userId?: string;
  userRole?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  projectId?: string;
  parcelId?: string;
  metadata?: any;
  source?: string;
}

export const createAuditEvent = async (payload: AuditEventPayload) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_role, action, entity_type, entity_id, old_value, new_value, project_id, parcel_id, metadata, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        payload.userId || null,
        payload.userRole || null,
        payload.action,
        payload.entityType,
        payload.entityId,
        payload.oldValue ? JSON.stringify(payload.oldValue) : null,
        payload.newValue ? JSON.stringify(payload.newValue) : null,
        payload.projectId || null,
        payload.parcelId || null,
        payload.metadata ? JSON.stringify(payload.metadata) : null,
        payload.source || "SYSTEM",
      ]
    );
  } catch (error) {
    console.error("Failed to create audit event:", error);
  }
};
