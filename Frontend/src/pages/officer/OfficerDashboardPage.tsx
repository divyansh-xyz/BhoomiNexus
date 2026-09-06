import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { taskService } from '../../services/api/task.service';
import type { WorkflowTask } from '../../types/task.types';
import BhoomiLogo from '../../components/common/BhoomiLogo';

export const OfficerDashboardPage: React.FC = () => {
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  
  useEffect(() => {
    loadTasks();
  }, []);
  
  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await taskService.getTasks('me');
      setTasks(data);
    } catch (err) {
      console.error('Failed to load officer tasks', err);
    } finally {
      setLoading(false);
    }
  };
  
  const isOverdue = (task: WorkflowTask) => {
    return new Date(task.dueDate) < new Date() && task.status !== 'ACCEPTED';
  };

  const getMappedStatus = (task: WorkflowTask) => {
    if (task.status === 'ACCEPTED') return 'COMPLETED';
    if (isOverdue(task)) return 'OVERDUE';
    return 'PENDING';
  };

  const filteredTasks = tasks.filter(task => {
    if (statusFilter === 'ALL') return true;
    return getMappedStatus(task) === statusFilter;
  });

  const pendingCount = tasks.filter(t => getMappedStatus(t) === 'PENDING').length;
  const overdueCount = tasks.filter(t => getMappedStatus(t) === 'OVERDUE').length;
  const completedCount = tasks.filter(t => getMappedStatus(t) === 'COMPLETED').length;

  const premiumCardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
    border: '1px solid #e2e8f0',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.2s, boxShadow 0.2s',
  };

  return (
    <div className="boss-page-container" style={{ padding: '0 24px 40px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Masthead */}
      <header style={{ 
        background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)', 
        borderRadius: '20px', 
        padding: '32px 40px', 
        color: '#ffffff',
        marginTop: '24px',
        marginBottom: '32px',
        boxShadow: '0 10px 30px rgba(30, 58, 138, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #60a5fa, #34d399)' }} />

        <div style={{ flex: 1, zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <BhoomiLogo size={32} strokeWidth={2.4} />
            <span style={{ 
              color: '#93c5fd',
              fontSize: '13px', 
              fontWeight: 700, 
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              Regional Land Acquisition Directorate
            </span>
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 700, margin: '0 0 12px 0', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
            Officer Workflow Dashboard
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: '#bfdbfe', maxWidth: '600px', lineHeight: '1.5' }}>
            Execute assigned statutory stages, verify field evidence, process OCR intelligence, and append spatial affirmations to active project workflows.
          </p>
        </div>
        
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)', 
          borderRadius: '16px', 
          padding: '20px',
          minWidth: '280px',
          zIndex: 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: '#34d399', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 0 3px rgba(52, 211, 153, 0.3)' }} />
            <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Officer Status: Active</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
            <span style={{ color: '#bfdbfe' }}>Officer:</span>
            <span style={{ fontWeight: 600, color: '#ffffff' }}>R. K. Sharma (ID: 88412)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span style={{ color: '#bfdbfe' }}>Department:</span>
            <span style={{ fontWeight: 600, color: '#ffffff' }}>Revenue &amp; Survey</span>
          </div>
        </div>
      </header>

      {/* Triage Bar */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
        <div style={{ ...premiumCardStyle }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>Assigned Workload</div>
          <div style={{ fontSize: '42px', fontWeight: 700, color: '#0f172a', lineHeight: '1', marginBottom: '8px' }}>{tasks.length}</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Total Tasks in Queue</div>
        </div>

        <div style={{ ...premiumCardStyle, borderBottom: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>Pending Action</div>
          <div style={{ fontSize: '42px', fontWeight: 700, color: '#3b82f6', lineHeight: '1', marginBottom: '8px' }}>{pendingCount}</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Tasks Requiring Scrutiny</div>
        </div>

        <div style={{ ...premiumCardStyle, borderBottom: overdueCount > 0 ? '4px solid #ef4444' : '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>SLA Overdue</div>
          <div style={{ fontSize: '42px', fontWeight: 700, color: overdueCount > 0 ? '#ef4444' : '#0f172a', lineHeight: '1', marginBottom: '8px' }}>{overdueCount}</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Escalated Priority Items</div>
        </div>

        <div style={{ ...premiumCardStyle, borderBottom: completedCount > 0 ? '4px solid #10b981' : '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>Completed Today</div>
          <div style={{ fontSize: '42px', fontWeight: 700, color: completedCount > 0 ? '#10b981' : '#0f172a', lineHeight: '1', marginBottom: '8px' }}>{completedCount}</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Stages Forwarded in Pipeline</div>
        </div>
      </section>

      {/* Ledger Section */}
      <section style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>Actionable Queue</h3>
            <span style={{ fontSize: '14px', color: '#64748b' }}>
              Chronological ledger of assigned tasks requiring verification and affirmation.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f8fafc', padding: '6px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: statusFilter === 'ALL' ? '#ffffff' : 'transparent',
                color: statusFilter === 'ALL' ? '#0f172a' : '#64748b',
                boxShadow: statusFilter === 'ALL' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s'
              }}
              onClick={() => setStatusFilter('ALL')}
            >
              All ({tasks.length})
            </button>
            <button
              type="button"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: statusFilter === 'PENDING' ? '#ffffff' : 'transparent',
                color: statusFilter === 'PENDING' ? '#3b82f6' : '#64748b',
                boxShadow: statusFilter === 'PENDING' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s'
              }}
              onClick={() => setStatusFilter('PENDING')}
            >
              Pending
            </button>
            <button
              type="button"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: statusFilter === 'OVERDUE' ? '#ffffff' : 'transparent',
                color: statusFilter === 'OVERDUE' ? '#ef4444' : '#64748b',
                boxShadow: statusFilter === 'OVERDUE' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s'
              }}
              onClick={() => setStatusFilter('OVERDUE')}
            >
              Overdue
            </button>
            <button
              type="button"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                backgroundColor: statusFilter === 'COMPLETED' ? '#ffffff' : 'transparent',
                color: statusFilter === 'COMPLETED' ? '#10b981' : '#64748b',
                boxShadow: statusFilter === 'COMPLETED' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s'
              }}
              onClick={() => setStatusFilter('COMPLETED')}
            >
              Completed
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
            <BhoomiLogo size={32} strokeWidth={2.4} />
            <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 500 }}>Syncing Assigned Tasks...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <p style={{ fontSize: '15px', color: '#64748b', fontWeight: 500 }}>No assigned tasks match the selected filter.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '16px 20px', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9' }}>Task ID / Date</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9' }}>Project Requisition</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9' }}>Workflow Stage</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9' }}>SLA Due Date</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9' }}>Status</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => {
                  const mappedStatus = getMappedStatus(task);
                  return (
                  <tr key={task.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a', fontFamily: 'monospace', fontSize: '14px' }}>{task.id.split('-').pop()}</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Assigned: {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : ''}</span>
                      </div>
                    </td>
                    <td style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>{task.projectTitle}</span>
                        <span style={{ fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>{task.projectCode}</span>
                      </div>
                    </td>
                    <td style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{task.stageName}</span>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>{task.department}</span>
                      </div>
                    </td>
                    <td style={{ padding: '20px' }}>
                       <span style={{ 
                         color: mappedStatus === 'OVERDUE' ? '#ef4444' : '#0f172a', 
                         fontWeight: mappedStatus === 'OVERDUE' ? 700 : 500,
                         fontSize: '14px'
                       }}>
                         {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''}
                       </span>
                    </td>
                    <td style={{ padding: '20px' }}>
                      <span className={`status-pill pill-${mappedStatus.toLowerCase()}`} style={{ 
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        ...(mappedStatus === 'OVERDUE' ? { backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' } : {}) 
                      }}>
                        {mappedStatus}
                      </span>
                    </td>
                    <td style={{ padding: '20px', textAlign: 'right' }}>
                      <Link
                        to={`/officer/tasks/${task.id}`}
                        style={{ 
                          display: 'inline-block',
                          padding: '8px 16px', 
                          fontSize: '13px',
                          fontWeight: 600,
                          backgroundColor: '#1e3a8a',
                          color: '#ffffff',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#312e81'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = '#1e3a8a'}
                      >
                        Inspect &rarr;
                      </Link>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default OfficerDashboardPage;
