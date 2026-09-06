import { apiClient } from './client';

export interface NotificationItem {
  id: string;
  userId: string | null;
  role: string | null;
  projectId: string | null;
  taskId: string | null;
  type:
    | 'BOSS_APPROVED'
    | 'STAGE_REJECTED'
    | 'STAGE_ACCEPTED'
    | 'TASK_ASSIGNED'
    | 'STAGE_RESUBMITTED'
    | 'PROCESS_COMPLETED'
    | string;
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

export interface NotificationListResponse {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
}

export class NotificationService {
  /**
   * Fetch in-app notifications
   */
  static async getNotifications(options: { unreadOnly?: boolean; limit?: number; offset?: number } = {}): Promise<NotificationListResponse> {
    const params: Record<string, any> = {};
    if (options.unreadOnly) params.unreadOnly = true;
    if (options.limit) params.limit = options.limit;
    if (options.offset) params.offset = options.offset;

    const res = await apiClient.get<{ success: boolean; data: NotificationListResponse }>('/notifications', { params });
    return res.data.data;
  }

  /**
   * Mark a specific notification as read
   */
  static async markAsRead(id: string): Promise<NotificationItem> {
    const res = await apiClient.patch<{ success: boolean; data: NotificationItem }>(`/notifications/${id}/read`);
    return res.data.data;
  }

  /**
   * Mark all notifications as read for current user
   */
  static async markAllAsRead(): Promise<number> {
    const res = await apiClient.post<{ success: boolean; count: number }>('/notifications/mark-all-read');
    return res.data.count;
  }

  /**
   * Delete / dismiss a notification
   */
  static async deleteNotification(id: string): Promise<boolean> {
    const res = await apiClient.delete<{ success: boolean }>(`/notifications/${id}`);
    return res.data.success;
  }
}

export default NotificationService;
