import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  NotificationService,
  type NotificationItem,
  type StatutoryLifecycleEventType,
} from '../../services/api/notification.service';
import BhoomiLogo from '../../components/common/BhoomiLogo';
import './notifications.css';

export const NotificationCenterPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();

    const handleEvent = () => {
      loadNotifications(true);
    };
    window.addEventListener('bhoomi-notification-event', handleEvent);

    return () => {
      window.removeEventListener('bhoomi-notification-event', handleEvent);
    };
  }, []);

  const loadNotifications = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Calls GET /api/v1/notifications (Spec Line 325)
      const data = await NotificationService.getNotifications({ limit: 100 });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  /**
   * Action: Mark Single as Read
   * Calls: PATCH /api/v1/notifications/:notificationId/read (Spec Line 328)
   */
  const handleMarkAsRead = async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err: any) {
      alert(err?.message || 'Failed to mark as read');
    }
  };

  /**
   * Action: Mark All as Read
   * Calls: POST /api/v1/notifications/mark-all-read (Spec Line 331)
   */
  const handleMarkAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      setActionSuccess('✓ All notifications marked as read.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Failed to mark all read');
    }
  };

  /**
   * Action: Delete / Dismiss Notification
   * Calls: DELETE /api/v1/notifications/:notificationId (Spec Line 334)
   */
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await NotificationService.deleteNotification(id);
      const target = notifications.find((n) => n.id === id);
      if (target && !target.read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotalCount((t) => Math.max(0, t - 1));
    } catch (err: any) {
      alert(err?.message || 'Failed to dismiss notification');
    }
  };

  /**
   * Simulator Action: Trigger any of the 8 statutory lifecycle events live
   */
  const handleSimulateEvent = (type: StatutoryLifecycleEventType) => {
    let title = '';
    let message = '';
    let link = '/projects/p-nhai-ringroad-2026';
    let parcelId: string | undefined = 'MH-PUN-HAV-084/2A';
    let priority: 'HIGH' | 'MEDIUM' | 'NORMAL' = 'NORMAL';

    switch (type) {
      case 'WORKFLOW_ACTIVATED':
        title = 'V2 Visual Workflow Topology Activated';
        message = 'BOSS certified 3-branch District architecture; execution records created across all 4 cohort parcels.';
        link = '/boss/projects/p-nhai-ringroad-2026/workflow-builder';
        break;
      case 'TASK_ASSIGNED':
        title = 'New Operational Task Dispatched';
        message = 'You have been assigned Joint Panchnama Inspection for Parcel MH-PUN-HAV-084/2A. SLA: 14 Days.';
        link = '/officer/tasks/TASK-ACQ-101-1-A';
        break;
      case 'STAGE_REJECTED':
        title = 'Operational Stage Rejected — Defect Notice';
        message = 'Surveyor rejected Cadastral Demarcation Unit B due to 1.5m northern alignment discrepancy. Proponent resubmission required.';
        link = '/officer/tasks/TASK-ACQ-101-2-B';
        priority = 'HIGH';
        break;
      case 'STAGE_RESUBMITTED':
        title = 'Stage Resubmitted with Rectified Records';
        message = 'Requesting Authority submitted amended cadastral survey maps and revised shapefile for Cohort B.';
        link = '/officer/tasks/TASK-ACQ-101-2-B';
        break;
      case 'COMPENSATION_UPDATED':
        title = 'Statutory Compensation Award Prepared';
        message = 'Special Land Acquisition Officer approved valuation schedule of ₹38,50,000 under RFCTLARR Section 28.';
        link = '/compensation/tasks/TASK-COMP-101-1';
        break;
      case 'COMPENSATION_COMPLETED':
        title = 'PFMS Compensation Disbursal Confirmed';
        message = 'Direct benefit transfer of ₹38,50,000 cleared for Ramesh Balasaheb Shinde on parcel MH-PUN-HAV-084/2A. Ref: PFMS-DBT-2026-94821.';
        link = '/compensation/tasks/TASK-COMP-101-1';
        priority = 'HIGH';
        break;
      case 'POSSESSION_COMPLETED':
        title = 'Statutory Land Possession Vested (Sec 38)';
        message = 'Physical demarcation completed for Parcel MH-PUN-HAV-084/2A (2.45 Acres). Land vested unconditionally in Government under Section 38.';
        link = '/possession/tasks/TASK-POSS-101-1';
        priority = 'HIGH';
        break;
      case 'ACQUISITION_COMPLETED':
        title = 'Section 19 Statutory Acquisition Accepted';
        message = 'Sub-Divisional Magistrate confirmed Section 19 declaration milestone for Cohort A (North Section Corridor).';
        link = '/officer/tasks/TASK-ACQ-101-1-A';
        break;
      case 'WILLINGNESS_NON_SUBMISSION':
        title = 'Notice: Landowner Consent Deadline Expiring';
        message = 'Notice to Requesting Authority: Statutory 30-day period expiring for 2 parcels without signed willingness consent.';
        link = '/projects/p-nhai-ringroad-2026';
        priority = 'HIGH';
        break;
      case 'GRIEVANCE_FILED':
        title = 'Cadastral Grievance Registered';
        message = 'Landowner objection received regarding boundary stone pegging for Parcel MH-PUN-HAV-089/3.';
        link = '/projects/p-nhai-ringroad-2026';
        parcelId = 'MH-PUN-HAV-089/3';
        break;
      default:
        title = 'Statutory Protocol Notice';
        message = 'Sovereign land acquisition lifecycle notification emitted.';
    }

    NotificationService.emitLifecycleNotification({
      type,
      title,
      message,
      link,
      parcelId,
      priority,
      projectId: 'p-nhai-ringroad-2026',
      projectTitle: 'Pune Outer Ring Road - Section IV',
      projectCode: 'NHAI-EXP-2026-04',
    });

    setActionSuccess(`⚡ Simulated Event Emitted: ${type}`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleResetDemo = () => {
    NotificationService.resetDemoNotifications();
    loadNotifications();
    setActionSuccess('↻ Reset to default statutory notification seeds.');
    setTimeout(() => setActionSuccess(null), 3000);
  };

  // Filter logic
  const filteredList = notifications.filter((item) => {
    if (unreadOnly && item.read) return false;

    if (selectedCategory === 'ACQUISITION') {
      if (!['ACQUISITION_COMPLETED', 'STAGE_ACCEPTED', 'TASK_ASSIGNED'].includes(item.type)) return false;
    } else if (selectedCategory === 'COMPENSATION') {
      if (!['COMPENSATION_UPDATED', 'COMPENSATION_COMPLETED'].includes(item.type)) return false;
    } else if (selectedCategory === 'POSSESSION') {
      if (item.type !== 'POSSESSION_COMPLETED') return false;
    } else if (selectedCategory === 'REJECTIONS') {
      if (!['STAGE_REJECTED', 'STAGE_RESUBMITTED', 'WILLINGNESS_NON_SUBMISSION'].includes(item.type)) return false;
    } else if (selectedCategory === 'WORKFLOW') {
      if (!['WORKFLOW_ACTIVATED', 'BOSS_APPROVED'].includes(item.type)) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText =
        item.title.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q) ||
        (item.parcelId && item.parcelId.toLowerCase().includes(q)) ||
        (item.projectCode && item.projectCode.toLowerCase().includes(q));
      if (!matchText) return false;
    }

    return true;
  });

  const getTheme = (type: string) => {
    switch (type) {
      case 'POSSESSION_COMPLETED':
        return { badge: 'POSSESSION VESTED', bg: '#ccfbf1', text: '#0f766e', border: '#14b8a6', icon: '🏛️' };
      case 'COMPENSATION_COMPLETED':
        return { badge: 'COMPENSATION PAID', bg: '#d1fae5', text: '#065f46', border: '#10b981', icon: '💰' };
      case 'COMPENSATION_UPDATED':
        return { badge: 'VALUATION UPDATE', bg: '#fef3c7', text: '#92400e', border: '#f59e0b', icon: '⚖️' };
      case 'ACQUISITION_COMPLETED':
        return { badge: 'ACQUISITION ACCEPTED', bg: '#eff6ff', text: '#1e40af', border: '#3b82f6', icon: '📜' };
      case 'STAGE_REJECTED':
        return { badge: 'DEFECT REJECTED', bg: '#fef2f2', text: '#991b1b', border: '#ef4444', icon: '⛔' };
      case 'STAGE_RESUBMITTED':
        return { badge: 'STAGE RESUBMITTED', bg: '#f0f9ff', text: '#075985', border: '#0284c7', icon: '🔄' };
      case 'TASK_ASSIGNED':
        return { badge: 'TASK ASSIGNED', bg: '#faf5ff', text: '#6b21a8', border: '#a855f7', icon: '📋' };
      case 'WORKFLOW_ACTIVATED':
        return { badge: 'WORKFLOW ACTIVE', bg: '#e0e7ff', text: '#3730a3', border: '#6366f1', icon: '⚡' };
      case 'WILLINGNESS_NON_SUBMISSION':
        return { badge: 'CONSENT NOTICE', bg: '#fff7ed', text: '#9a3412', border: '#f97316', icon: '⏱️' };
      case 'GRIEVANCE_FILED':
        return { badge: 'GRIEVANCE FILED', bg: '#fdf2f8', text: '#9d174d', border: '#ec4899', icon: '📣' };
      default:
        return { badge: 'STATUTORY NOTICE', bg: '#f8fafc', text: '#334155', border: '#64748b', icon: '🔔' };
    }
  };

  return (
    <div className="notif-workspace">
      {/* Top Header */}
      <div className="notif-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <BhoomiLogo size={20} strokeWidth={2.4} />
            <span className="notif-badge-sovereign">
              V2 Statutory Notifications Hub • RFCTLARR Protocol Events
            </span>
          </div>
          <h1 className="notif-title">
            Lifecycle Events &amp; Statutory Notifications
          </h1>
          <p className="notif-subtitle">
            Centralized sovereign event log across Acquisition, Compensation, Possession, and Requesting Authority alert channels
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleResetDemo}
            className="notif-pill-btn"
            title="Reset default notifications"
          >
            ↻ Reset Baseline Seeds
          </button>
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: unreadCount > 0 ? '#0f172a' : '#f1f5f9',
              color: unreadCount > 0 ? '#ffffff' : '#94a3b8',
              cursor: unreadCount > 0 ? 'pointer' : 'default',
            }}
          >
            ✓ Mark All as Read ({unreadCount})
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {actionSuccess && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{actionSuccess}</span>
          <button type="button" onClick={() => setActionSuccess(null)} style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontSize: '16px' }}>&times;</button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="notif-kpi-grid">
        <div className="notif-kpi-card">
          <div className="notif-kpi-label">Total Logged Events</div>
          <div className="notif-kpi-value">{totalCount}</div>
        </div>

        <div className="notif-kpi-card">
          <div className="notif-kpi-label">Unread Action Items</div>
          <div className="notif-kpi-value" style={{ color: unreadCount > 0 ? '#dc2626' : '#059669' }}>
            {unreadCount}
          </div>
        </div>

        <div className="notif-kpi-card">
          <div className="notif-kpi-label">Statutory Milestones</div>
          <div className="notif-kpi-value" style={{ color: '#0d9488' }}>
            {notifications.filter((n) => ['ACQUISITION_COMPLETED', 'COMPENSATION_COMPLETED', 'POSSESSION_COMPLETED'].includes(n.type)).length}
          </div>
        </div>

        <div className="notif-kpi-card">
          <div className="notif-kpi-label">Defects &amp; Consent Alerts</div>
          <div className="notif-kpi-value" style={{ color: '#d97706' }}>
            {notifications.filter((n) => ['STAGE_REJECTED', 'WILLINGNESS_NON_SUBMISSION', 'GRIEVANCE_FILED'].includes(n.type)).length}
          </div>
        </div>
      </div>

      {/* Live Lifecycle Event Simulator (Interactive Demo Panel) */}
      <div className="notif-simulator-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
              ⚡ Phase 15 Live Statutory Lifecycle Event Simulator
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
              Click any statutory event to simulate real-time notification emission into the sovereign log and masthead bell:
            </div>
          </div>
          <span style={{ fontSize: '10.5px', background: '#0f172a', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
            Phase 15 Engine
          </span>
        </div>

        <div className="notif-sim-grid">
          <button type="button" onClick={() => handleSimulateEvent('WORKFLOW_ACTIVATED')} className="notif-sim-btn">
            <span>⚡</span> WORKFLOW_ACTIVATED
          </button>
          <button type="button" onClick={() => handleSimulateEvent('TASK_ASSIGNED')} className="notif-sim-btn">
            <span>📋</span> TASK_ASSIGNED
          </button>
          <button type="button" onClick={() => handleSimulateEvent('STAGE_REJECTED')} className="notif-sim-btn" style={{ borderColor: '#fca5a5' }}>
            <span>⛔</span> STAGE_REJECTED
          </button>
          <button type="button" onClick={() => handleSimulateEvent('STAGE_RESUBMITTED')} className="notif-sim-btn">
            <span>🔄</span> STAGE_RESUBMITTED
          </button>
          <button type="button" onClick={() => handleSimulateEvent('COMPENSATION_UPDATED')} className="notif-sim-btn">
            <span>⚖️</span> COMPENSATION_UPDATED
          </button>
          <button type="button" onClick={() => handleSimulateEvent('COMPENSATION_COMPLETED')} className="notif-sim-btn" style={{ borderColor: '#86efac' }}>
            <span>💰</span> COMPENSATION_COMPLETED
          </button>
          <button type="button" onClick={() => handleSimulateEvent('POSSESSION_COMPLETED')} className="notif-sim-btn" style={{ borderColor: '#99f6e4' }}>
            <span>🏛️</span> POSSESSION_COMPLETED
          </button>
          <button type="button" onClick={() => handleSimulateEvent('ACQUISITION_COMPLETED')} className="notif-sim-btn" style={{ borderColor: '#bfdbfe' }}>
            <span>📜</span> ACQUISITION_COMPLETED
          </button>
          <button type="button" onClick={() => handleSimulateEvent('WILLINGNESS_NON_SUBMISSION')} className="notif-sim-btn" style={{ borderColor: '#fdba74' }}>
            <span>⏱️</span> WILLINGNESS_NON_SUBMISSION
          </button>
          <button type="button" onClick={() => handleSimulateEvent('GRIEVANCE_FILED')} className="notif-sim-btn" style={{ borderColor: '#f9a8d4' }}>
            <span>📣</span> GRIEVANCE_FILED
          </button>
        </div>
      </div>

      {/* Toolbar & Category Filters */}
      <div className="notif-toolbar">
        <div className="notif-filter-pills">
          {(['ALL', 'ACQUISITION', 'COMPENSATION', 'POSSESSION', 'REJECTIONS', 'WORKFLOW'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`notif-pill-btn ${selectedCategory === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
            />
            <span>Unread Only</span>
          </label>

          <input
            type="text"
            placeholder="Search notification / parcel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              width: '210px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading && notifications.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Loading statutory notifications registry...
          </div>
        ) : filteredList.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔔</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>Zero notifications found</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
              Try adjusting your category filter or search query.
            </div>
          </div>
        ) : (
          filteredList.map((item) => {
            const theme = getTheme(item.type);
            return (
              <div
                key={item.id}
                className={`notif-card ${!item.read ? 'unread' : ''}`}
                onClick={() => {
                  if (!item.read) handleMarkAsRead(item.id);
                  if (item.link) navigate(item.link);
                }}
                style={{ cursor: item.link ? 'pointer' : 'default' }}
              >
                {!item.read && <div className="notif-unread-bar" style={{ backgroundColor: theme.border }} />}

                {/* Event Icon */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: theme.bg,
                    border: `1px solid ${theme.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0,
                  }}
                >
                  {theme.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: theme.bg,
                          color: theme.text,
                          border: `1px solid ${theme.border}`,
                          fontFamily: 'monospace',
                        }}
                      >
                        {theme.badge}
                      </span>
                      {item.projectCode && (
                        <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                          [{item.projectCode}]
                        </span>
                      )}
                      {item.parcelId && (
                        <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#334155', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                          Parcel: {item.parcelId}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {new Date(item.createdAt).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {!item.read && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(item.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#2563eb',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Mark Read
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, item.id)}
                        title="Dismiss"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#cbd5e1',
                          cursor: 'pointer',
                          fontSize: '16px',
                          lineHeight: 1,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
                      >
                        &times;
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: '14px', fontWeight: item.read ? 600 : 700, color: '#0f172a', marginBottom: '4px' }}>
                    {item.title}
                  </div>

                  <p style={{ margin: '0 0 8px 0', fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                    {item.message}
                  </p>

                  {item.link && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#2563eb' }}>
                      <span>Open Associated Dossier / Task &rarr;</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationCenterPage;
