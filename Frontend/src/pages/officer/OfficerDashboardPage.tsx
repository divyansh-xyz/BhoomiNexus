import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { taskService } from '../../services/api/task.service';
import type { WorkflowTask } from '../../types/task.types';
import BhoomiLogo from '../../components/common/BhoomiLogo';
import './officer-dashboard.css';

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
    <div className="things-officer-root">
      <div className="things-officer-container">

        {/* 1. Sovereign Editorial Masthead */}
        <header className="things-officer-header">
          <div className="things-officer-header-main">
            <div className="things-officer-eyebrow">
              <span className="things-officer-eyebrow-pill">
                Ministry of Rural Development &bull; Field Operations Directorate
              </span>
            </div>
            <div className="things-officer-title-row">
              <BhoomiLogo size={34} strokeWidth={2.4} />
              <h1 className="things-officer-title">
                Officer Workflow Dashboard
              </h1>
            </div>
            <p className="things-officer-subtitle">
              Official statutory scrutiny terminal for executing assigned stages, verifying physical ground evidence, evaluating OCR document intelligence, and appending spatial affirmations to active project workflows under RFCTLARR Act 2013.
            </p>
          </div>

          {/* Officer Duty Stamp Card */}
          <div className="things-officer-duty-card">
            <div className="things-officer-duty-status">
              <span className="things-officer-duty-dot" />
              <span>Statutory Scrutiny Active</span>
            </div>
            <div className="things-officer-duty-meta">
              <div className="things-officer-duty-row">
                <span className="things-officer-duty-label">Officer:</span>
                <span className="things-officer-duty-val">{user?.name || 'Ananya Patel'}</span>
              </div>
              <div className="things-officer-duty-row">
                <span className="things-officer-duty-label">Cadre / Branch:</span>
                <span className="things-officer-duty-val">{user?.department || 'Revenue & Land Records Branch'}</span>
              </div>
            </div>
          </div>
        </header>

        {/* 2. Triage Summary Bar (5 KPI Cards) */}
        <section className="things-officer-kpi-grid">
          <div className="things-officer-kpi-card">
            <span className="things-officer-kpi-label">Assigned Workload</span>
            <div className="things-officer-kpi-val">
              {tasks.length}
            </div>
            <span className="things-officer-kpi-sub">Total Tasks in Queue</span>
          </div>

          <div className="things-officer-kpi-card">
            <span className="things-officer-kpi-label">Pending Action</span>
            <div className="things-officer-kpi-val text-signal-blue">
              {pendingCount}
            </div>
            <span className="things-officer-kpi-sub">Tasks Requiring Scrutiny</span>
          </div>

          <div className="things-officer-kpi-card">
            <span className="things-officer-kpi-label">Rejected / Remitted</span>
            <div className={`things-officer-kpi-val ${rejectedCount > 0 ? 'text-rose' : ''}`}>
              {rejectedCount}
            </div>
            <span className="things-officer-kpi-sub">Remitted to Proponent</span>
          </div>

          <div className="things-officer-kpi-card">
            <span className="things-officer-kpi-label">SLA Overdue</span>
            <div className={`things-officer-kpi-val ${overdueCount > 0 ? 'text-rose' : ''}`}>
              {overdueCount}
            </div>
            <span className="things-officer-kpi-sub">Escalated Priority Items</span>
          </div>

          <div className="things-officer-kpi-card">
            <span className="things-officer-kpi-label">Completed</span>
            <div className={`things-officer-kpi-val ${completedCount > 0 ? 'text-emerald' : ''}`}>
              {completedCount}
            </div>
            <span className="things-officer-kpi-sub">Forwarded in Pipeline</span>
          </div>
        </section>

        {/* 3. Actionable Queue & Statutory Docket Register */}
        <section className="things-officer-queue-card">
          <div className="things-officer-queue-header">
            <div className="things-officer-queue-title-block">
              <span className="things-officer-section-tag">
                OFFICIAL STATUTORY DOCKET REGISTER
              </span>
              <h3 className="things-officer-queue-title">
                Actionable Queue
              </h3>
              <p className="things-officer-queue-desc">
                Chronological ledger of assigned tasks requiring verification and affirmation under RFCTLARR Act 2013.
              </p>
            </div>

            {/* Filter Buttons — PRESERVED EXACTLY */}
            <div className="things-officer-filter-bar">
              <button
                type="button"
                className={`things-officer-filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ALL')}
              >
                All <span className="things-officer-filter-count">{tasks.length}</span>
              </button>
              <button
                type="button"
                className={`things-officer-filter-pill ${statusFilter === 'PENDING' ? 'active' : ''}`}
                onClick={() => setStatusFilter('PENDING')}
              >
                Pending <span className="things-officer-filter-count">{pendingCount}</span>
              </button>
              <button
                type="button"
                className={`things-officer-filter-pill ${statusFilter === 'REJECTED' ? 'active' : ''}`}
                onClick={() => setStatusFilter('REJECTED')}
              >
                Rejected <span className="things-officer-filter-count">{rejectedCount}</span>
              </button>
              <button
                type="button"
                className={`things-officer-filter-pill ${statusFilter === 'OVERDUE' ? 'active' : ''}`}
                onClick={() => setStatusFilter('OVERDUE')}
              >
                Overdue <span className="things-officer-filter-count">{overdueCount}</span>
              </button>
              <button
                type="button"
                className={`things-officer-filter-pill ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
                onClick={() => setStatusFilter('COMPLETED')}
              >
                Completed <span className="things-officer-filter-count">{completedCount}</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="things-officer-loading-state">
              <BhoomiLogo size={34} strokeWidth={2.4} />
              <span className="things-officer-loading-text">
                Synchronizing Statutory Task Ledger...
              </span>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="things-officer-empty-state">
              <p className="things-officer-empty-text">
                No assigned statutory tasks match the selected docket filter.
              </p>
            </div>
          ) : (
            <div className="things-officer-table-wrap">
              <table className="things-officer-table">
                <thead>
                  <tr>
                    <th>Task Docket</th>
                    <th>Project &amp; Jurisdiction</th>
                    <th>Workflow Stage &amp; Cohort</th>
                    <th>Parcel Reference</th>
                    <th>SLA Target</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => {
                    const mappedStatus = getMappedStatus(task);
                    const isTaskOverdue = mappedStatus === 'OVERDUE';
                    const branchType = task.workflowNode?.branchType || 'ACQUISITION';
                    const cohortLabel = task.cohortContext?.cohortBranch || (task.id.includes('-A') ? 'Cohort A' : task.id.includes('-B') ? 'Cohort B' : 'Cohort C');
                    const khasraLabel = task.parcel?.khasraNumber || task.relevantParcels?.[0]?.surveyNumber || '101/1';
                    const villageLabel = task.parcel?.village || task.relevantParcels?.[0]?.village || 'Rampur Kalan';

                    return (
                      <tr key={task.id}>
                        <td>
                          <div className="things-officer-id-block">
                            <span className="things-officer-task-id">
                              #{task.id.split('-').pop()}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                              <span className={`things-branch-pill branch-${branchType.toLowerCase()}`}>
                                {branchType}
                              </span>
                            </div>
                            <span className="things-officer-meta-date" style={{ marginTop: '3px' }}>
                              Assigned: {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="things-officer-proj-block">
                            <span className="things-officer-proj-title">
                              {task.projectTitle}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                              <span className="things-officer-proj-code">
                                {task.projectCode}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--to-fog)' }}>•</span>
                              <span style={{ fontSize: '11.5px', color: 'var(--to-ash)', fontWeight: 500 }}>
                                {task.district || 'Meerut'}, {task.state || 'Uttar Pradesh'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="things-officer-stage-block">
                            <span className="things-officer-stage-name">
                              {task.stageName}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                              <span className="things-cohort-pill">
                                {cohortLabel}
                              </span>
                              <span className="things-officer-department" style={{ margin: 0 }}>
                                {task.department}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--to-ink)' }}>
                              Khasra {khasraLabel}
                            </span>
                            <span style={{ fontSize: '11.5px', color: 'var(--to-fog)' }}>
                              {villageLabel} {task.parcel?.areaAcres ? `(${task.parcel.areaAcres} Ac)` : ''}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`things-officer-sla-date ${isTaskOverdue ? 'is-overdue' : ''}`}>
                            {isTaskOverdue && '⚠️ '}
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`things-officer-pill status-${mappedStatus.toLowerCase()}`}>
                            {mappedStatus}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link
                            to={`/officer/tasks/${task.id}`}
                            className="things-officer-inspect-btn"
                          >
                            Inspect Task &rarr;
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
