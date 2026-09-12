import { pool } from "../../config/db";
import { logger } from "../../utils/logger";

export interface CreateNotificationDTO {
  userId?: string | null;
  role?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  type:
    | "BOSS_APPROVED"
    | "STAGE_REJECTED"
    | "STAGE_ACCEPTED"
    | "TASK_ASSIGNED"
    | "STAGE_RESUBMITTED"
    | "PROCESS_COMPLETED"
    | "SYSTEM"
    | "WORKFLOW_ACTIVATED"
    | "COMPENSATION_UPDATED"
    | "COMPENSATION_COMPLETED"
    | "POSSESSION_COMPLETED"
    | "ACQUISITION_COMPLETED";
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, any>;
}

export interface NotificationRecord {
  id: string;
  userId: string | null;
  role: string | null;
  projectId: string | null;
  taskId: string | null;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  readAt: string | null;
  projectTitle?: string;
  projectCode?: string;
}

export class NotificationService {
  /**
   * Create an in-app notification
   */
  static async createNotification(dto: CreateNotificationDTO): Promise<NotificationRecord> {
    try {
      const result = await pool.query(
        `INSERT INTO notifications (
          user_id, role, project_id, task_id, type, title, message, link, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        RETURNING *`,
        [
          dto.userId || null,
          dto.role || null,
          dto.projectId || null,
          dto.taskId || null,
          dto.type,
          dto.title,
          dto.message,
          dto.link || null,
          JSON.stringify(dto.metadata || {}),
        ]
      );

      const row = result.rows[0];
      logger.info(`[Notification] Created notification "${row.title}" for role=${row.role || "ALL"} user=${row.user_id || "ALL"}`);
      return this.mapRow(row);
    } catch (error) {
      logger.error({ err: error }, "[Notification] Failed to create notification");
      throw error;
    }
  }

  /**
   * Fetch notifications relevant to the authenticated user and their role
   */
  static async getNotifications(
    userId: string,
    role: string,
    options: { unreadOnly?: boolean; limit?: number; offset?: number } = {}
  ): Promise<{ notifications: NotificationRecord[]; total: number; unreadCount: number }> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    let filterClause = `(n.user_id = $1 OR n.role = $2 OR (n.user_id IS NULL AND n.role IS NULL))`;
    const params: any[] = [userId, role];

    if (options.unreadOnly) {
      filterClause += ` AND n.read = false`;
    }

    const countResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN n.read = false THEN 1 END) as unread_count
       FROM notifications n
       WHERE (n.user_id = $1 OR n.role = $2 OR (n.user_id IS NULL AND n.role IS NULL))`,
      [userId, role]
    );

    const total = parseInt(countResult.rows[0]?.total || "0", 10);
    const unreadCount = parseInt(countResult.rows[0]?.unread_count || "0", 10);

    const listQuery = `
      SELECT n.*, p.title as project_title, p.code as project_code
      FROM notifications n
      LEFT JOIN projects p ON p.id = n.project_id
      WHERE ${filterClause}
      ORDER BY n.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const result = await pool.query(listQuery, params);

    const notifications = result.rows.map(this.mapRow);
    return { notifications, total, unreadCount };
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(notificationId: string, userId: string, role: string): Promise<NotificationRecord | null> {
    const result = await pool.query(
      `UPDATE notifications
       SET read = true, read_at = NOW()
       WHERE id = $1 AND (user_id = $2 OR role = $3 OR (user_id IS NULL AND role IS NULL))
       RETURNING *`,
      [notificationId, userId, role]
    );

    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  /**
   * Mark all unread notifications as read for this user/role
   */
  static async markAllAsRead(userId: string, role: string): Promise<number> {
    const result = await pool.query(
      `UPDATE notifications
       SET read = true, read_at = NOW()
       WHERE read = false AND (user_id = $1 OR role = $2 OR (user_id IS NULL AND role IS NULL))`,
      [userId, role]
    );
    return result.rowCount || 0;
  }

  /**
   * Delete / dismiss a notification
   */
  static async deleteNotification(notificationId: string, userId: string, role: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM notifications
       WHERE id = $1 AND (user_id = $2 OR role = $3 OR (user_id IS NULL AND role IS NULL))`,
      [notificationId, userId, role]
    );
    return (result.rowCount || 0) > 0;
  }

  private static mapRow(row: any): NotificationRecord {
    return {
      id: row.id,
      userId: row.user_id,
      role: row.role,
      projectId: row.project_id,
      taskId: row.task_id,
      type: row.type,
      title: row.title,
      message: row.message,
      link: row.link,
      read: row.read,
      metadata: typeof row.metadata === "string" ? JSON.parse(row.metadata) : (row.metadata || {}),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
      projectTitle: row.project_title,
      projectCode: row.project_code,
    };
  }
}
