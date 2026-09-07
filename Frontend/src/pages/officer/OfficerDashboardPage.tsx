import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { taskService } from '../../services/api/task.service';
import type { WorkflowTask } from '../../types/task.types';
import BhoomiLogo from '../../components/common/BhoomiLogo';

export const OfficerDashboardPage: React.FC = () => {
  const { user } = useAuth();
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
    return new Date(task.dueDate) < new Date() && task.status !== 'ACCEPTED' && task.status !== 'REJECTED' && !task.rejectionReason;
  };

  const getMappedStatus = (task: WorkflowTask) => {
    if (task.status === 'ACCEPTED') return 'COMPLETED';
    if (task.status === 'REJECTED' || Boolean(task.rejectionReason)) return 'REJECTED';
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
  const rejectedCount = tasks.filter(t => getMappedStatus(t) === 'REJECTED').length;

  return (
    <div className="landing-page-root" style={{ minHeight: '100vh', backgroundColor: 'var(--color-blush-paper)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 24px 80px 24px' }}>

        {/* 1. Sovereign Editorial Masthead */}
        <header style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
            <div style={{ flex: '1', minWidth: '320px' }}>
              <div className="hero-eyebrow" style={{ marginBottom: '8px' }}>
                <span className="hero-meta" style={{ letterSpacing: '+2px', fontSize: '11px', textTransform: 'uppercase' }}>
                  Ministry of Rural Development &bull; Field Operations Directorate
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                <BhoomiLogo size={34} strokeWidth={2.4} />
                <h1 className="hero-headline" style={{ fontSize: '38px', margin: 0, letterSpacing: '-1.5px', lineHeight: 1.1 }}>
                  Officer Workflow Dashboard
                </h1>
              </div>
              <p className="hero-subtext" style={{ fontSize: '15px', maxWidth: '680px', margin: 0, lineHeight: 1.55 }}>
                Official statutory scrutiny terminal for executing assigned stages, verifying physical ground evidence, evaluating OCR document intelligence, and appending spatial affirmations to active project workflows under RFCTLARR Act 2013.
              </p>
            </div>

            {/* Officer Duty Stamp */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #000000',
              borderRadius: '0px',
              padding: '18px 22px',
              minWidth: '290px',
              boxShadow: 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ width: '8px', height: '8px', backgroundColor: '#0058fe', display: 'inline-block' }} />
                <span style={{ fontSize: '11px', color: '#000000', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '+1.5px' }}>
                  Statutory Scrutiny Active
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                <span style={{ color: 'var(--color-fossil-gray)' }}>Officer:</span>
                <span style={{ fontWeight: 600, color: '#000000' }}>{user?.name || 'Ananya Patel'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--color-fossil-gray)' }}>Cadre / Branch:</span>
                <span style={{ fontWeight: 600, color: '#000000' }}>{user?.department || 'Revenue & Land Records Branch'}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="hairline-fullwidth" style={{ marginBottom: '32px' }} />

        {/* 2. Broadsheet Triage Summary Bar */}
        <section style={{ marginBottom: '36px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            border: '1px solid #000000',
            backgroundColor: '#ffffff'
          }}>
            <div style={{ padding: '24px 20px', borderRight: '1px solid #000000', borderRadius: '0px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-fossil-gray)', fontWeight: 700, letterSpacing: '+1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Assigned Workload
              </div>
              <div style={{ fontFamily: 'var(--font-copernicus)', fontSize: '38px', fontWeight: 400, color: '#000000', lineHeight: 1, marginBottom: '8px' }}>
                {tasks.length}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-fossil-gray)', fontStyle: 'italic' }}>Total Tasks in Queue</div>
            </div>

            <div style={{ padding: '24px 20px', borderRight: '1px solid #000000', backgroundColor: pendingCount > 0 ? 'var(--color-paper-tint)' : '#ffffff' }}>
              <div style={{ fontSize: '11px', color: '#0058fe', fontWeight: 700, letterSpacing: '+1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Pending Action
              </div>
              <div style={{ fontFamily: 'var(--font-copernicus)', fontSize: '38px', fontWeight: 400, color: '#0058fe', lineHeight: 1, marginBottom: '8px' }}>
                {pendingCount}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-fossil-gray)', fontStyle: 'italic' }}>Tasks Requiring Scrutiny</div>
            </div>

            <div style={{ padding: '24px 20px', borderRight: '1px solid #000000' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-fossil-gray)', fontWeight: 700, letterSpacing: '+1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Rejected / Remitted
              </div>
              <div style={{ fontFamily: 'var(--font-copernicus)', fontSize: '38px', fontWeight: 400, color: '#000000', lineHeight: 1, marginBottom: '8px' }}>
                {rejectedCount}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-fossil-gray)', fontStyle: 'italic' }}>Remitted to Proponent</div>
            </div>

            <div style={{ padding: '24px 20px', borderRight: '1px solid #000000' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-fossil-gray)', fontWeight: 700, letterSpacing: '+1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                SLA Overdue
              </div>
              <div style={{ fontFamily: 'var(--font-copernicus)', fontSize: '38px', fontWeight: 400, color: '#000000', lineHeight: 1, marginBottom: '8px' }}>
                {overdueCount}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-fossil-gray)', fontStyle: 'italic' }}>Escalated Priority Items</div>
            </div>

            <div style={{ padding: '24px 20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-fossil-gray)', fontWeight: 700, letterSpacing: '+1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Completed
              </div>
              <div style={{ fontFamily: 'var(--font-copernicus)', fontSize: '38px', fontWeight: 400, color: '#000000', lineHeight: 1, marginBottom: '8px' }}>
                {completedCount}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--color-fossil-gray)', fontStyle: 'italic' }}>Forwarded in Pipeline</div>
            </div>
          </div>
        </section>

        <div className="hairline-fullwidth" style={{ marginBottom: '32px' }} />

        {/* 3. Actionable Queue & Statutory Docket Register */}
        <section style={{ backgroundColor: '#ffffff', border: '1px solid #000000', borderRadius: '0px', padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid #000000' }}>
            <div>
              <span className="editorial-section-tag" style={{ color: 'var(--color-fossil-gray)', display: 'block', marginBottom: '6px' }}>
                OFFICIAL STATUTORY DOCKET REGISTER
              </span>
              <h3 style={{ fontFamily: 'var(--font-copernicus)', fontSize: '24px', fontWeight: 400, color: '#000000', margin: 0 }}>
                Actionable Queue
              </h3>
              <span style={{ fontSize: '14px', color: 'var(--color-fossil-gray)', marginTop: '4px', display: 'block', fontStyle: 'italic' }}>
                Chronological ledger of assigned tasks requiring verification and affirmation under RFCTLARR Act 2013.
              </span>
            </div>

            {/* Filter Buttons — PRESERVED EXACTLY */}
            <div style={{ display: 'flex', gap: '0px', border: '1px solid #000000' }}>
              <button
                type="button"
                style={{
                  padding: '8px 16px',
                  borderRadius: '0px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-copernicus)',
                  fontStyle: 'italic',
                  fontWeight: statusFilter === 'ALL' ? 700 : 400,
                  cursor: 'pointer',
                  border: 'none',
                  borderRight: '1px solid #000000',
                  backgroundColor: statusFilter === 'ALL' ? '#000000' : 'transparent',
                  color: statusFilter === 'ALL' ? '#ffffff' : '#000000',
                  transition: 'background-color 0.15s'
                }}
                onClick={() => setStatusFilter('ALL')}
              >
                All ({tasks.length})
              </button>
              <button
                type="button"
                style={{
                  padding: '8px 16px',
                  borderRadius: '0px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-copernicus)',
                  fontStyle: 'italic',
                  fontWeight: statusFilter === 'PENDING' ? 700 : 400,
                  cursor: 'pointer',
                  border: 'none',
                  borderRight: '1px solid #000000',
                  backgroundColor: statusFilter === 'PENDING' ? '#000000' : 'transparent',
                  color: statusFilter === 'PENDING' ? '#ffffff' : '#000000',
                  transition: 'background-color 0.15s'
                }}
                onClick={() => setStatusFilter('PENDING')}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                style={{
                  padding: '8px 16px',
                  borderRadius: '0px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-copernicus)',
                  fontStyle: 'italic',
                  fontWeight: statusFilter === 'REJECTED' ? 700 : 400,
                  cursor: 'pointer',
                  border: 'none',
                  borderRight: '1px solid #000000',
                  backgroundColor: statusFilter === 'REJECTED' ? '#000000' : 'transparent',
                  color: statusFilter === 'REJECTED' ? '#ffffff' : '#000000',
                  transition: 'background-color 0.15s'
                }}
                onClick={() => setStatusFilter('REJECTED')}
              >
                Rejected ({rejectedCount})
              </button>
              <button
                type="button"
                style={{
                  padding: '8px 16px',
                  borderRadius: '0px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-copernicus)',
                  fontStyle: 'italic',
                  fontWeight: statusFilter === 'OVERDUE' ? 700 : 400,
                  cursor: 'pointer',
                  border: 'none',
                  borderRight: '1px solid #000000',
                  backgroundColor: statusFilter === 'OVERDUE' ? '#000000' : 'transparent',
                  color: statusFilter === 'OVERDUE' ? '#ffffff' : '#000000',
                  transition: 'background-color 0.15s'
                }}
                onClick={() => setStatusFilter('OVERDUE')}
              >
                Overdue ({overdueCount})
              </button>
              <button
                type="button"
                style={{
                  padding: '8px 16px',
                  borderRadius: '0px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-copernicus)',
                  fontStyle: 'italic',
                  fontWeight: statusFilter === 'COMPLETED' ? 700 : 400,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: statusFilter === 'COMPLETED' ? '#000000' : 'transparent',
                  color: statusFilter === 'COMPLETED' ? '#ffffff' : '#000000',
                  transition: 'background-color 0.15s'
                }}
                onClick={() => setStatusFilter('COMPLETED')}
              >
                Completed ({completedCount})
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
              <BhoomiLogo size={34} strokeWidth={2.4} />
              <span style={{ fontSize: '15px', color: 'var(--color-carbon-ink)', fontFamily: 'var(--font-copernicus)', fontStyle: 'italic' }}>
                Synchronizing Statutory Task Ledger...
              </span>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', backgroundColor: 'var(--color-paper-tint)', border: '1px solid #000000', borderRadius: '0px' }}>
              <p style={{ fontSize: '15px', color: '#000000', fontFamily: 'var(--font-copernicus)', fontStyle: 'italic', margin: 0 }}>
                No assigned statutory tasks match the selected docket filter.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-paper-tint)', borderBottom: '2px solid #000000' }}>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: '#000000', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '+1.5px' }}>Task ID / Date</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: '#000000', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '+1.5px' }}>Project Requisition</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: '#000000', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '+1.5px' }}>Workflow Stage</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: '#000000', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '+1.5px' }}>SLA Due Date</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: '#000000', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '+1.5px' }}>Status</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', color: '#000000', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '+1.5px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => {
                    const mappedStatus = getMappedStatus(task);
                    return (
                      <tr
                        key={task.id}
                        style={{ borderBottom: '1px solid rgba(0,0,0,0.15)', transition: 'background-color 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-paper-tint)'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontWeight: 600, color: '#000000', fontFamily: 'monospace', fontSize: '14px' }}>
                              {task.id.split('-').pop()}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--color-fossil-gray)' }}>
                              Assigned: {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontWeight: 600, color: '#000000', fontSize: '14px', fontFamily: 'var(--font-copernicus)' }}>
                              {task.projectTitle}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--color-fossil-gray)', fontFamily: 'monospace' }}>
                              {task.projectCode}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#000000' }}>
                              {task.stageName}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--color-fossil-gray)' }}>
                              {task.department}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            color: mappedStatus === 'OVERDUE' ? '#000000' : '#000000',
                            fontWeight: mappedStatus === 'OVERDUE' ? 700 : 500,
                            fontSize: '13.5px',
                            fontFamily: 'monospace'
                          }}>
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''}
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            borderRadius: '0px',
                            letterSpacing: '+1px',
                            display: 'inline-block',
                            border: '1px solid #000000',
                            backgroundColor: mappedStatus === 'COMPLETED' ? '#000000' : mappedStatus === 'PENDING' ? 'transparent' : 'var(--color-paper-tint)',
                            color: mappedStatus === 'COMPLETED' ? '#ffffff' : mappedStatus === 'PENDING' ? '#0058fe' : '#000000',
                            borderColor: mappedStatus === 'PENDING' ? '#0058fe' : '#000000'
                          }}>
                            {mappedStatus}
                          </span>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <Link
                            to={`/officer/tasks/${task.id}`}
                            className="btn-cta-black"
                            style={{
                              padding: '6px 14px',
                              fontSize: '13px',
                              borderRadius: '0px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
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
    </div>
  );
};

export default OfficerDashboardPage;

