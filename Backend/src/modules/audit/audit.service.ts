import { pool } from "../../config/db";
import { verifyAuditHash } from "../../utils/audit";

export interface AuditQueryFilter {
  projectId?: string;
  parcelId?: string;
  action?: string;
  entityType?: string;
  limit?: number;
}

export class AuditService {
  /**
   * Retrieves audit records with cryptographic hashes and provenance status
   */
  static async getAuditLogs(filter: AuditQueryFilter = {}) {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filter.projectId) {
      conditions.push(`project_id = $${idx++}`);
      values.push(filter.projectId);
    }
    if (filter.parcelId) {
      conditions.push(`parcel_id = $${idx++}`);
      values.push(filter.parcelId);
    }
    if (filter.action) {
      conditions.push(`action = $${idx++}`);
      values.push(filter.action);
    }
    if (filter.entityType) {
      conditions.push(`entity_type = $${idx++}`);
      values.push(filter.entityType);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = Math.min(filter.limit || 50, 100);

    try {
      const query = `
        SELECT id, user_id AS "userId", user_role AS "userRole", action,
               entity_type AS "entityType", entity_id AS "entityId",
               old_value AS "oldValue", new_value AS "newValue",
               project_id AS "projectId", parcel_id AS "parcelId",
               source, metadata, timestamp
        FROM audit_logs
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;
      const res = await pool.query(query, values);

      return res.rows.map((r) => {
        const meta = typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata || {};
        return {
          ...r,
          hash: meta.hash || null,
          provenanceStatus: meta.provenanceStatus || "LOCAL_PROVENANCE",
          fabricTxId: meta.fabricTxId || null,
          metadata: meta,
        };
      });
    } catch (err) {
      return [];
    }
  }

  /**
   * Verifies the cryptographic hash integrity of an audit record
   */
  static async verifyAuditLog(id: string) {
    try {
      const res = await pool.query(
        `SELECT id, action, entity_type AS "entityType", entity_id AS "entityId", metadata, timestamp
         FROM audit_logs WHERE id = $1 LIMIT 1`,
        [id]
      );
      if (res.rows.length === 0) {
        return { valid: false, message: "Audit record not found" };
      }
      const row = res.rows[0];
      const meta = typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata || {};
      const claimedHash = meta.hash;

      if (!claimedHash) {
        return { valid: false, message: "No cryptographic hash recorded for this entry" };
      }

      const isValid = verifyAuditHash(
        {
          action: row.action,
          entityType: row.entityType,
          entityId: row.entityId,
          metadata: meta,
          timestamp: row.timestamp.toISOString ? row.timestamp.toISOString() : String(row.timestamp),
        },
        claimedHash
      );

      return {
        valid: isValid,
        id: row.id,
        action: row.action,
        hash: claimedHash,
        provenanceStatus: meta.provenanceStatus || "LOCAL_PROVENANCE",
        fabricTxId: meta.fabricTxId || null,
        message: isValid
          ? "Cryptographic SHA-256 signature verified. Entry is tamper-free."
          : "Cryptographic hash mismatch. Potential tampering detected.",
      };
    } catch (err: any) {
      return { valid: false, message: err.message };
    }
  }
}
