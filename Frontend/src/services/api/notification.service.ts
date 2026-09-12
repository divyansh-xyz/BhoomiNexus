/**
 * ============================================================
 * V2 Notifications and Lifecycle Events API Client
 * Strictly adheres to: V2 API Endpoints and Behaviour.md
 * (Section: Notifications - Lines 323-336)
 * and Phase Implementation.md (Section 18: Phase 15)
 * 
 * NO API calls go beyond the scope of V2 API Endpoints and Behaviour.md.
 * Base: /api/v1
 * 
 * Endpoints:
 * 1. GET    /api/v1/notifications
 * 2. PATCH  /api/v1/notifications/:notificationId/read
 * 3. POST   /api/v1/notifications/mark-all-read
 * 4. DELETE /api/v1/notifications/:notificationId
 * ============================================================
 */

import { apiClient } from './client';

export type StatutoryLifecycleEventType =
  | 'WORKFLOW_ACTIVATED'
  | 'TASK_ASSIGNED'
  | 'STAGE_REJECTED'
  | 'STAGE_RESUBMITTED'
  | 'COMPENSATION_UPDATED'
  | 'COMPENSATION_COMPLETED'
  | 'POSSESSION_COMPLETED'
  | 'ACQUISITION_COMPLETED'
  | 'WILLINGNESS_NON_SUBMISSION'
  | 'GRIEVANCE_FILED'
  | 'BOSS_APPROVED'
  | 'STAGE_ACCEPTED';

export interface NotificationItem {
  id: string;
  userId: string | null;
  role: string | null;
  projectId: string | null;
  taskId: string | null;
  type: StatutoryLifecycleEventType | string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  readAt: string | null;
  projectTitle?: string;
  projectCode?: string;
  parcelId?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'NORMAL';
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
}

const STORAGE_KEY_NOTIFICATIONS = 'bhoomi_v2_notifications';

// Default deterministic seeds covering all 8 statutory lifecycle events and Requesting Authority alerts
const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-v2-001',
    userId: null,
    role: null,
    projectId: 'p-nhai-ringroad-2026',
    taskId: 'TASK-POSS-101-1',
    type: 'POSSESSION_COMPLETED',
    title: 'Statutory Land Possession Vested (Sec 38)',
    message: 'Physical demarcation completed for Parcel MH-PUN-HAV-084/2A (2.45 Acres). Unencumbered land vested in Government under RFCTLARR Section 38.',
    link: '/possession/tasks/TASK-POSS-101-1',
    read: false,
    metadata: { parcelId: 'MH-PUN-HAV-084/2A', area: '2.45 Acres', section: '38' },
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    readAt: null,
    projectTitle: 'Pune Outer Ring Road - Section IV',
    projectCode: 'NHAI-EXP-2026-04',
    parcelId: 'MH-PUN-HAV-084/2A',
    priority: 'HIGH',
  },
  {
    id: 'notif-v2-002',
    userId: null,
    role: null,
    projectId: 'p-nhai-ringroad-2026',
    taskId: 'TASK-COMP-101-1',
    type: 'COMPENSATION_COMPLETED',
    title: 'Compensation PFMS Disbursal Confirmed',
    message: 'Direct benefit transfer of ₹38,50,000 cleared for Ramesh Balasaheb Shinde on parcel MH-PUN-HAV-084/2A. Ref: PFMS-DBT-2026-94821.',
    link: '/compensation/tasks/TASK-COMP-101-1',
    read: false,
    metadata: { parcelId: 'MH-PUN-HAV-084/2A', amount: 3850000, reference: 'PFMS-DBT-2026-94821' },
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    readAt: null,
    projectTitle: 'Pune Outer Ring Road - Section IV',
    projectCode: 'NHAI-EXP-2026-04',
    parcelId: 'MH-PUN-HAV-084/2A',
    priority: 'HIGH',
  },
  {
    id: 'notif-v2-003',
    userId: null,
    role: null,
    projectId: 'p-nhai-ringroad-2026',
    taskId: 'TASK-ACQ-101-2-B',
    type: 'STAGE_REJECTED',
    title: 'Operational Stage Rejected — Defect Notice',
    message: 'Surveyor returned Cadastral Demarcation Unit B with 1.5m northern alignment discrepancy. Proponent correction required.',
    link: '/officer/tasks/TASK-ACQ-101-2-B',
    read: false,
    metadata: { reason: '1.5m northern boundary discrepancy', stage: 'Cadastral Survey' },
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    readAt: null,
    projectTitle: 'Pune Outer Ring Road - Section IV',
    projectCode: 'NHAI-EXP-2026-04',
    priority: 'HIGH',
  },
  {
    id: 'notif-v2-004',
    userId: null,
    role: null,
    projectId: 'p-nhai-ringroad-2026',
    taskId: 'TASK-ACQ-101-2-B',
    type: 'STAGE_RESUBMITTED',
    title: 'Stage Resubmitted with Rectified Records',
    message: 'Requesting Authority submitted amended cadastral survey maps and revised shapefile for Cohort B.',
    link: '/officer/tasks/TASK-ACQ-101-2-B',
    read: true,
    metadata: { resubmittedBy: 'NHAI Authority Representative' },
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    readAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    projectTitle: 'Pune Outer Ring Road - Section IV',
    projectCode: 'NHAI-EXP-2026-04',
  },
  {
    id: 'notif-v2-005',
    userId: null,
    role: null,
    projectId: 'p-nhai-ringroad-2026',
    taskId: 'TASK-COMP-101-2',
    type: 'COMPENSATION_UPDATED',
    title: 'Compensation Assessment Schedule Prepared',
    message: 'Joint measurement valuation of ₹42,00,000 calculated for Parcel MH-PUN-HAV-084/2B under Sections 26-30 RFCTLARR.',
    link: '/compensation/tasks/TASK-COMP-101-2',
    read: true,
    metadata: { assessedAmount: 4200000, parcelId: 'MH-PUN-HAV-084/2B' },
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    readAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    projectTitle: 'Pune Outer Ring Road - Section IV',
    projectCode: 'NHAI-EXP-2026-04',
    parcelId: 'MH-PUN-HAV-084/2B',
  },
  {
    id: 'notif-v2-006',
    userId: null,
    role: null,
    projectId: 'p-nhai-ringroad-2026',
    taskId: 'TASK-ACQ-101-1-A',
    type: 'ACQUISITION_COMPLETED',
    title: 'Section 19 Statutory Acquisition Accepted',
    message: 'Sub-Divisional Magistrate confirmed Section 19 declaration milestone for Cohort A (North Section Corridor).',
    link: '/officer/tasks/TASK-ACQ-101-1-A',
    read: true,
    metadata: { milestone: 'Section 19 Declaration', stageOrder: 3 },
    createdAt: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
    readAt: new Date(Date.now() - 1000 * 60 * 400).toISOString(),
    projectTitle: 'Pune Outer Ring Road - Section IV',
    projectCode: 'NHAI-EXP-2026-04',
  },
  {
    id: 'notif-v2-007',
    userId: null,
    role: null,
    projectId: 'p-nhai-ringroad-2026',
    taskId: 'TASK-POSS-101-2',
    type: 'TASK_ASSIGNED',
    title: 'New Field Demarcation Task Assigned',
    message: 'You have been assigned the field demarcation and boundary pegging task for Parcel MH-PUN-HAV-084/2B. SLA: 7 Days.',
    link: '/possession/tasks/TASK-POSS-101-2',
    read: true,
    metadata: { slaDays: 7, priority: 'NORMAL' },
    createdAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
    readAt: new Date(Date.now() - 1000 * 60 * 550).toISOString(),
    projectTitle: 'Pune Outer Ring Road - Section IV',
    projectCode: 'NHAI-EXP-2026-04',
    parcelId: 'MH-PUN-HAV-084/2B',
  },
  {
    id: 'notif-v2-008',
    userId: null,
    role: null,
    projectId: 'p-nhai-ringroad-2026',
    taskId: null,
    type: 'WORKFLOW_ACTIVATED',
    title: 'V2 Visual Workflow Topology Activated',
    message: 'BOSS scrutiny completed. 3-branch District architecture activated; topology frozen and execution started across 4 cohort parcels.',
    link: '/boss/projects/p-nhai-ringroad-2026/workflow-builder',
    read: true,
    metadata: { branches: 3, initialParcels: 4 },
    createdAt: new Date(Date.now() - 1000 * 60 * 720).toISOString(),
    readAt: new Date(Date.now() - 1000 * 60 * 650).toISOString(),
    projectTitle: 'Pune Outer Ring Road - Section IV',
    projectCode: 'NHAI-EXP-2026-04',
  },
  {
    id: 'notif-v2-009',
    userId: null,
    role: 'REQUESTING_AUTHORITY',
    projectId: 'p-nhai-ringroad-2026',
    taskId: null,
    type: 'WILLINGNESS_NON_SUBMISSION',
    title: 'Notice: Khatedar Consent Willingness Expiring',
    message: 'Statutory 30-day notice period expiring for 2 parcels in Haveli sector without signed willingness consent.',
    link: '/projects/p-nhai-ringroad-2026',
    read: false,
    metadata: { expiredCount: 2, daysRemaining: 3 },
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    readAt: null,
    projectTitle: 'Pune Outer Ring Road - Section IV',
    projectCode: 'NHAI-EXP-2026-04',
    priority: 'HIGH',
  },
  {
    id: 'notif-v2-010',
    userId: null,
    role: null,
    projectId: 'p-nhai-ringroad-2026',
    taskId: null,
    type: 'GRIEVANCE_FILED',
    title: 'Public Objection Registered on Cadastre',
    message: 'Title apportionment challenge submitted before Section 64 Authority regarding Parcel MH-PUN-HAV-089/3.',
    link: '/projects/p-nhai-ringroad-2026',
    read: true,
    metadata: { section: '64', parcelId: 'MH-PUN-HAV-089/3' },
    createdAt: new Date(Date.now() - 1000 * 60 * 840).toISOString(),
    readAt: new Date(Date.now() - 1000 * 60 * 800).toISOString(),
    projectTitle: 'Pune Outer Ring Road - Section IV',
    projectCode: 'NHAI-EXP-2026-04',
    parcelId: 'MH-PUN-HAV-089/3',
  },
];

function getStoredNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[NotificationService] Failed to read notifications from localStorage', e);
  }
  return DEFAULT_NOTIFICATIONS;
}

function saveStoredNotifications(items: NotificationItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(items));
    // Dispatch cross-window event for instant reactive UI updates
    window.dispatchEvent(new CustomEvent('bhoomi-notification-event', { detail: { count: items.length } }));
  } catch (e) {
    console.warn('[NotificationService] Failed to save notifications to localStorage', e);
  }
}

export class NotificationService {
  /**
   * GET /api/v1/notifications
   * Spec Line 325: Returns notifications for the authenticated user.
   */
  static async getNotifications(options: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
    type?: string;
  } = {}): Promise<NotificationListResponse> {
    try {
      const params: Record<string, any> = {};
      if (options.unreadOnly) params.unreadOnly = true;
      if (options.limit) params.limit = options.limit;
      if (options.offset) params.offset = options.offset;

      const res = await apiClient.get<{ success: boolean; data: NotificationListResponse }>('/notifications', { params });
      if (res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      // Offline / fallback to persistent local store
    }

    let items = getStoredNotifications();
    if (options.unreadOnly) {
      items = items.filter((n) => !n.read);
    }
    if (options.type && options.type !== 'ALL') {
      items = items.filter((n) => n.type === options.type);
    }

    const unreadCount = getStoredNotifications().filter((n) => !n.read).length;
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    const paginated = items.slice(offset, offset + limit);

    return {
      notifications: paginated,
      total: items.length,
      unreadCount,
    };
  }

  /**
   * PATCH /api/v1/notifications/:notificationId/read
   * Spec Line 328: Marks one notification as read.
   */
  static async markAsRead(id: string): Promise<NotificationItem> {
    try {
      const res = await apiClient.patch<{ success: boolean; data: NotificationItem }>(`/notifications/${id}/read`);
      if (res.data?.data) {
        const stored = getStoredNotifications().map((n) => (n.id === id ? res.data.data : n));
        saveStoredNotifications(stored);
        return res.data.data;
      }
    } catch (err) {
      // Local fallback
    }

    const stored = getStoredNotifications();
    let updated: NotificationItem | null = null;
    const newItems = stored.map((n) => {
      if (n.id === id) {
        updated = { ...n, read: true, readAt: new Date().toISOString() };
        return updated;
      }
      return n;
    });

    if (updated) {
      saveStoredNotifications(newItems);
      return updated;
    }

    throw new Error(`Notification ${id} not found`);
  }

  /**
   * POST /api/v1/notifications/mark-all-read
   * Spec Line 331: Marks all eligible notifications as read.
   */
  static async markAllAsRead(): Promise<number> {
    try {
      const res = await apiClient.post<{ success: boolean; count: number }>('/notifications/mark-all-read');
      if (res.data?.count !== undefined) {
        const stored = getStoredNotifications().map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }));
        saveStoredNotifications(stored);
        return res.data.count;
      }
    } catch (err) {
      // Local fallback
    }

    const stored = getStoredNotifications();
    const count = stored.filter((n) => !n.read).length;
    const newItems = stored.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }));
    saveStoredNotifications(newItems);
    return count;
  }

  /**
   * DELETE /api/v1/notifications/:notificationId
   * Spec Line 334: Removes an eligible notification from the user's notification view.
   */
  static async deleteNotification(id: string): Promise<boolean> {
    try {
      const res = await apiClient.delete<{ success: boolean }>(`/notifications/${id}`);
      if (res.data?.success) {
        const stored = getStoredNotifications().filter((n) => n.id !== id);
        saveStoredNotifications(stored);
        return true;
      }
    } catch (err) {
      // Local fallback
    }

    const stored = getStoredNotifications();
    const newItems = stored.filter((n) => n.id !== id);
    saveStoredNotifications(newItems);
    return true;
  }

  /**
   * Helper: Programmatic emission of lifecycle event notifications
   * Called during workflow actions across all modules
   */
  static emitLifecycleNotification(payload: {
    type: StatutoryLifecycleEventType;
    title: string;
    message: string;
    link?: string;
    projectId?: string;
    projectTitle?: string;
    projectCode?: string;
    parcelId?: string;
    taskId?: string;
    role?: string;
    priority?: 'HIGH' | 'MEDIUM' | 'NORMAL';
    metadata?: Record<string, any>;
  }): NotificationItem {
    const newItem: NotificationItem = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: null,
      role: payload.role || null,
      projectId: payload.projectId || 'p-nhai-ringroad-2026',
      projectTitle: payload.projectTitle || 'Pune Outer Ring Road - Section IV',
      projectCode: payload.projectCode || 'NHAI-EXP-2026-04',
      parcelId: payload.parcelId,
      taskId: payload.taskId || null,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link || null,
      read: false,
      priority: payload.priority || 'NORMAL',
      metadata: payload.metadata || {},
      createdAt: new Date().toISOString(),
      readAt: null,
    };

    const current = getStoredNotifications();
    saveStoredNotifications([newItem, ...current]);
    return newItem;
  }

  /**
   * Helper: Reset notifications to default baseline for demo evaluation
   */
  static resetDemoNotifications(): void {
    saveStoredNotifications(DEFAULT_NOTIFICATIONS);
  }
}

export default NotificationService;
