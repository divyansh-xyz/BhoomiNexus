import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { NotificationService, type NotificationItem } from '../../services/api/notification.service';

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'STATUTORY' | 'ALERTS'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await NotificationService.getNotifications({ limit: 40 });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('[NotificationBell] Failed to fetch notifications:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // 1. Background polling every 10 seconds
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 10000);

    // 2. Instant reactive listener for programmatic emissions across tabs/pages
    const handleCustomEvent = () => {
      fetchNotifications(true);
    };
    window.addEventListener('bhoomi-notification-event', handleCustomEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('bhoomi-notification-event', handleCustomEvent);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notif: NotificationItem) => {
    try {
      if (!notif.read) {
        await NotificationService.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('[NotificationBell] Error marking as read:', err);
    }

    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[NotificationBell] Error marking all as read:', err);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await NotificationService.deleteNotification(id);
      const target = notifications.find((n) => n.id === id);
      if (target && !target.read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('[NotificationBell] Error dismissing notification:', err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.read;
    if (filter === 'STATUTORY') {
      return [
        'WORKFLOW_ACTIVATED',
        'STAGE_REJECTED',
        'STAGE_RESUBMITTED',
        'COMPENSATION_COMPLETED',
        'POSSESSION_COMPLETED',
        'ACQUISITION_COMPLETED',
      ].includes(n.type);
    }
    if (filter === 'ALERTS') {
      return [
        'WILLINGNESS_NON_SUBMISSION',
        'GRIEVANCE_FILED',
        'TASK_ASSIGNED',
        'STAGE_REJECTED',
      ].includes(n.type);
    }
    return true;
  });

  const formatRelativeTime = (isoString: string): string => {
    try {
      const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diff < 60) return 'Just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
      return new Date(isoString).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  const getTypeTheme = (type: string) => {
    switch (type) {
      case 'POSSESSION_COMPLETED':
        return {
          badge: 'POSSESSION VESTED',
          bgColor: '#ccfbf1',
          borderColor: '#14b8a6',
          textColor: '#0f766e',
          icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          ),
        };
      case 'COMPENSATION_COMPLETED':
        return {
          badge: 'COMPENSATION PAID',
          bgColor: '#d1fae5',
          borderColor: '#10b981',
          textColor: '#065f46',
          icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <path d="M8 10h8a2 2 0 0 1 0 4H8" />
            </svg>
          ),
        };
      case 'COMPENSATION_UPDATED':
        return {
          badge: 'VALUATION UPDATE',
          bgColor: '#fef3c7',
          borderColor: '#f59e0b',
          textColor: '#92400e',
          icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
              <line x1="12" y1="6" x2="12" y2="8" />
              <line x1="12" y1="16" x2="12" y2="18" />
            </svg>
          ),
        };
      case 'ACQUISITION_COMPLETED':
        return {
          badge: 'ACQUISITION ACCEPTED',
          bgColor: '#eff6ff',
          borderColor: '#3b82f6',
          textColor: '#1e40af',
          icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ),
        };
      case 'STAGE_REJECTED':
        return {
          badge: 'DEFECT REJECTED',
          bgColor: '#fef2f2',
          borderColor: '#ef4444',
          textColor: '#991b1b',
          icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ),
        };
      case 'STAGE_RESUBMITTED':
        return {
          badge: 'STAGE RESUBMITTED',
          bgColor: '#f0f9ff',
          borderColor: '#0284c7',
          textColor: '#075985',
          icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          ),
        };
      case 'TASK_ASSIGNED':
        return {
          badge: 'TASK ASSIGNED',
          bgColor: '#faf5ff',
          borderColor: '#a855f7',
          textColor: '#6b21a8',
          icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          ),
        };
      case 'WORKFLOW_ACTIVATED':
        return {
          badge: 'WORKFLOW ACTIVE',
          bgColor: '#e0e7ff',
          borderColor: '#6366f1',
          textColor: '#3730a3',
          icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          ),
        };
      case 'WILLINGNESS_NON_SUBMISSION':
        return {
          badge: 'CONSENT NOTICE',
          bgColor: '#fff7ed',
          borderColor: '#f97316',
          textColor: '#9a3412',
          icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          ),
        };
      case 'GRIEVANCE_FILED':
        return {
          badge: 'GRIEVANCE FILED',
          bgColor: '#fdf2f8',
          borderColor: '#ec4899',
          textColor: '#9d174d',
          icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          ),
        };
      case 'BOSS_APPROVED':
        return {
          badge: 'BOSS APPROVED',
          bgColor: '#ecfdf5',
          borderColor: '#10b981',
          textColor: '#065f46',
          icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          ),
        };
      default:
        return {
          badge: 'STATUTORY NOTICE',
          bgColor: '#f8fafc',
          borderColor: '#64748b',
          textColor: '#334155',
          icon: (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          ),
        };
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Sovereign Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="gov-notification-bell-btn"
        title="Statutory Notifications & Protocol Alerts"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '6px',
          border: '1px solid #dfe3e8',
          backgroundColor: isOpen ? '#1e293b' : '#ffffff',
          color: isOpen ? '#ffffff' : '#1e293b',
          cursor: 'pointer',
          transition: 'all 0.18s ease-in-out',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-5px',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              borderRadius: '9px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontSize: '10.5px',
              fontWeight: 700,
              fontFamily: 'monospace',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #ffffff',
              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.35)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Notification Drawer */}
      {isOpen && (
        <div
          className="gov-notification-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '430px',
            maxWidth: '92vw',
            maxHeight: '560px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 12px 28px -5px rgba(0, 0, 0, 0.18), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #1e293b',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                V2 Statutory Notifications Hub
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontFamily: 'monospace',
                  }}
                >
                  {unreadCount} New
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#93c5fd',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '3px',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Sub-header Filter Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 10px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              gap: '6px',
              overflowX: 'auto',
            }}
          >
            {(['ALL', 'UNREAD', 'STATUTORY', 'ALERTS'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                style={{
                  border: 'none',
                  background: filter === tab ? '#ffffff' : 'transparent',
                  color: filter === tab ? '#0f172a' : '#64748b',
                  fontSize: '11px',
                  fontWeight: filter === tab ? 700 : 500,
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  boxShadow: filter === tab ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab === 'ALL' ? `All (${notifications.length})` : tab === 'UNREAD' ? `Unread (${unreadCount})` : tab}
              </button>
            ))}
          </div>

          {/* Notifications Scrollable List */}
          <div
            style={{
              overflowY: 'auto',
              maxHeight: '410px',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
            }}
          >
            {loading && notifications.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
                Fetching statutory notifications...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#64748b',
                }}
              >
                <div style={{ fontSize: '24px' }}>🔔</div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>
                  {filter === 'UNREAD' ? 'Zero unread notifications' : 'No notifications in this category'}
                </div>
                <div style={{ fontSize: '11.5px', color: '#94a3b8', maxWidth: '260px' }}>
                  All statutory lifecycle transitions will appear here in real time.
                </div>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const theme = getTypeTheme(notif.type);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: notif.read ? '#ffffff' : '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      transition: 'background-color 0.15s ease',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = notif.read ? '#ffffff' : '#f8fafc')
                    }
                  >
                    {/* Unread indicator bar */}
                    {!notif.read && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '3.5px',
                          backgroundColor: theme.borderColor,
                        }}
                      />
                    )}

                    {/* Icon Column */}
                    <div
                      style={{
                        flexShrink: 0,
                        width: '30px',
                        height: '30px',
                        borderRadius: '6px',
                        backgroundColor: theme.bgColor,
                        border: `1px solid ${theme.borderColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '2px',
                      }}
                    >
                      {theme.icon}
                    </div>

                    {/* Content Column */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                          marginBottom: '3px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            backgroundColor: theme.bgColor,
                            color: theme.textColor,
                            border: `1px solid ${theme.borderColor}`,
                            letterSpacing: '0.04em',
                            fontFamily: 'monospace',
                          }}
                        >
                          {theme.badge}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteNotification(e, notif.id)}
                            title="Dismiss"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#cbd5e1',
                              cursor: 'pointer',
                              padding: '2px',
                              fontSize: '13px',
                              lineHeight: 1,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
                          >
                            &times;
                          </button>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '12.5px',
                          fontWeight: notif.read ? 600 : 700,
                          color: '#0f172a',
                          lineHeight: 1.3,
                          marginBottom: '3px',
                        }}
                      >
                        {notif.title}
                      </div>

                      <p
                        style={{
                          fontSize: '11.5px',
                          color: '#475569',
                          lineHeight: 1.4,
                          margin: 0,
                          wordBreak: 'break-word',
                        }}
                      >
                        {notif.message}
                      </p>

                      {notif.link && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#2563eb',
                          }}
                        >
                          <span>Open Statutory Dossier &rarr;</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with link to Sovereign Notification Center */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px',
            }}
          >
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              style={{
                color: '#2563eb',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>📜 Open Notification Center &amp; Event Registry &rarr;</span>
            </Link>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>Auto-Sync: 10s</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
