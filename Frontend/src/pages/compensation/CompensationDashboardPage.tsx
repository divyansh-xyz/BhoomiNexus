import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { bossService } from '../../services/api/boss.service';
import {
  compensationV2Service,
  type CompensationDossier,
  type ParcelCompensationItem,
} from '../../services/api/compensationV2.service';
import BhoomiLogo from '../../components/common/BhoomiLogo';
import './compensation.css';

interface InboundProjectSummary {
  id: string;
  code: string;
  title: string;
  district: string;
  state: string;
  routedBy: string;
  receivedAt: string;
  parcelCount: number;
  totalAreaAcres: number;
  stageName: string;
  totalEstimate: number;
  status: 'INCOMING_REQUISITION' | 'SUBMITTED_TO_DISTRICT' | 'SANCTIONED';
}

export const CompensationDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [dossier, setDossier] = useState<CompensationDossier>(() => compensationV2Service.getDossier());
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [approvedProjects, setApprovedProjects] = useState<InboundProjectSummary[]>([]);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Project selection state - allows officer to select from inbound project requests
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    return localStorage.getItem('bhoomi_comp_selected_project_id') || null;
  });

  const handleSelectProject = (projId: string | null) => {
    setSelectedProjectId(projId);
    if (projId) {
      localStorage.setItem('bhoomi_comp_selected_project_id', projId);
    } else {
      localStorage.removeItem('bhoomi_comp_selected_project_id');
    }
  };

  // Add Document Modal state
  const activeDocParcelState = useState<ParcelCompensationItem | null>(null);
  const activeDocParcel = activeDocParcelState[0];
  const setActiveDocParcel = activeDocParcelState[1];
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState('Valuation Ledger');
  const [docFile, setDocFile] = useState<File | null>(null);

  // PFMS Proof Modal state
  const activeProofParcelState = useState<ParcelCompensationItem | null>(null);
  const activeProofParcel = activeProofParcelState[0];
  const setActiveProofParcel = activeProofParcelState[1];
  const [proofRef, setProofRef] = useState('');
  const [proofAmount, setProofAmount] = useState<number>(0);
  const [proofDate, setProofDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    refreshDossier();
    loadApprovedProjects();
  }, []);

  const refreshDossier = () => {
    setLoading(true);
    try {
      const data = compensationV2Service.getDossier();
      setDossier(data);
    } catch (err) {
      console.error('Failed to load compensation dossier', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Only projects whose statutory workflow has been SANCTIONED & ACTIVATED by the Boss
   * enter the Compensation Officer's dashboard.
   */
  const loadApprovedProjects = async () => {
    setLoadingProjects(true);
    try {
      const allProjects = await bossService.getProjects();
      // Filter strictly: Only projects whose visual workflow has been APPROVED / SANCTIONED by Boss:
      // (1) Status in database is WORKFLOW_ACTIVE or PROJECT_APPROVED
      // (2) OR locally sanctioned in this demo session in localStorage
      const sanctioned = (allProjects || []).filter((p) => {
        const isDbActive = p.status === 'WORKFLOW_ACTIVE' || p.status === 'PROJECT_APPROVED';
        const isLocalActive =
          localStorage.getItem(`bhoomi_workflow_activated_${p.id}`) === 'true' ||
          localStorage.getItem(`bhoomi_workflow_activated_${p.code}`) === 'true';
        return isDbActive || isLocalActive;
      });

      const currentDossier = compensationV2Service.getDossier();

      const mapped: InboundProjectSummary[] = sanctioned.map((p) => {
        const isRithala = p.code === 'PRJ-DL-7701' || p.id === currentDossier.projectId;

        // Resolve status dynamically across all persistence sources
        const localStatus =
          localStorage.getItem(`bhoomi_comp_status_${p.id}`) ||
          localStorage.getItem(`bhoomi_comp_status_${p.code}`);
        const isLocalApproved =
          localStorage.getItem(`bhoomi_comp_approved_${p.id}`) === 'true' ||
          localStorage.getItem(`bhoomi_comp_approved_${p.code}`) === 'true';
        const isSubmitted =
          localStorage.getItem(`bhoomi_comp_submitted_${p.id}`) === 'true' ||
          localStorage.getItem(`bhoomi_comp_submitted_${p.code}`) === 'true' ||
          localStorage.getItem('bhoomi_comp_estimate_submitted') === 'true';
        const isBranchCompleted =
          localStorage.getItem('bhoomi_comp_branch_completed') === 'true';

        let resolvedStatus: 'INCOMING_REQUISITION' | 'SUBMITTED_TO_DISTRICT' | 'SANCTIONED' = 'INCOMING_REQUISITION';
        if (localStatus === 'SANCTIONED' || localStatus === 'APPROVED' || isLocalApproved || (isRithala && isBranchCompleted)) {
          resolvedStatus = 'SANCTIONED';
        } else if (localStatus === 'SUBMITTED_TO_DISTRICT' || (isRithala && isSubmitted)) {
          resolvedStatus = 'SUBMITTED_TO_DISTRICT';
        } else if (isRithala && currentDossier.status === 'SANCTIONED') {
          resolvedStatus = 'SANCTIONED';
        } else if (isRithala && currentDossier.status === 'SUBMITTED_TO_DISTRICT') {
          resolvedStatus = 'SUBMITTED_TO_DISTRICT';
        }

        return {
          id: p.id,
          code: p.code,
          title: p.title,
          district: p.district || 'North West Delhi',
          state: p.state || 'Delhi',
          routedBy: 'Ananya Patel (District Competent Authority & Acquisition Officer)',
          receivedAt: p.submissionDate || new Date().toISOString(),
          parcelCount: isRithala ? currentDossier.parcels.length : ((p as any).parcelsConfirmedCount || 4),
          totalAreaAcres: Number(p.requestedAreaAcres || 12.10),
          stageName: 'Sec 26–30 Statutory Compensation Award & Disbursal',
          totalEstimate: isRithala
            ? currentDossier.totalCompensationEstimate
            : Math.round(Number(p.estimatedBudgetCr || 1.65) * 10000000),
          status: resolvedStatus,
        };
      });

      setApprovedProjects(mapped);
    } catch (err) {
      console.error('Failed to load approved projects for compensation officer', err);
      setApprovedProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const activeProject = approvedProjects.find(
    (p) => p.id === selectedProjectId || p.code === selectedProjectId
  ) || approvedProjects[0];

  const currentParcels: ParcelCompensationItem[] = dossier.parcels;

  /**
   * Update individual parcel estimate and recalculate total
   */
  const handleEstimateChange = (parcelId: string, val: number) => {
    const updated = compensationV2Service.updateParcelEstimate(parcelId, val);
    setDossier(updated);
  };

  /**
   * Add supporting document to a specific parcel
   */
  const handleAddDocumentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDocParcel || !newDocName.trim()) return;

    const newDoc = {
      id: `doc-${Date.now().toString().slice(-6)}`,
      name: newDocName.trim(),
      type: newDocType,
      size: docFile ? `${(docFile.size / (1024 * 1024)).toFixed(1)} MB` : '1.4 MB',
      fileUrl: docFile ? URL.createObjectURL(docFile) : undefined,
      uploadedAt: new Date().toISOString(),
    };

    const updated = compensationV2Service.addParcelDocument(activeDocParcel.parcelId, newDoc);
    setDossier(updated);
    setActiveDocParcel(null);
    setNewDocName('');
    setDocFile(null);
    setActionSuccess(`✓ Supporting document attached for ${activeDocParcel.khasraNumber}.`);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  /**
   * Update actual compensation given proof (PFMS Mandate / Voucher)
   */
  const handleSaveProofSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProofParcel || !proofRef.trim()) return;

    const proof = {
      referenceNo: proofRef.trim(),
      paidAmount: Number(proofAmount),
      paymentDate: proofDate,
      mode: 'PFMS Direct Benefit Transfer / RTGS',
    };

    const updated = compensationV2Service.addDisbursementProof(activeProofParcel.parcelId, proof);
    setDossier(updated);
    setActiveProofParcel(null);
    setActionSuccess(`✓ PFMS disbursal proof recorded for ${activeProofParcel.khasraNumber}.`);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  /**
   * Approve Statutory Compensation Award for project (Section 28/30 RFCTLARR)
   * Updates state, dossier, and localStorage so dashboard instantly registers approval.
   */
  const handleApproveProject = (projId?: string) => {
    const targetProject = projId
      ? approvedProjects.find((p) => p.id === projId || p.code === projId)
      : activeProject;

    if (!targetProject) return;

    // 1. Update compensation service dossier
    const updated = compensationV2Service.approveProjectAward(targetProject.id, user?.name);
    setDossier(updated);

    // 2. Persist project approval flags in localStorage
    localStorage.setItem(`bhoomi_comp_status_${targetProject.id}`, 'SANCTIONED');
    localStorage.setItem(`bhoomi_comp_status_${targetProject.code}`, 'SANCTIONED');
    localStorage.setItem(`bhoomi_comp_approved_${targetProject.id}`, 'true');
    localStorage.setItem(`bhoomi_comp_approved_${targetProject.code}`, 'true');
    localStorage.setItem('bhoomi_comp_branch_completed', 'true');
    localStorage.setItem('bhoomi_comp_estimate_submitted', 'true');

    // 3. Immediately update approvedProjects state so cards & badges update without refresh
    setApprovedProjects((prev) =>
      prev.map((p) =>
        p.id === targetProject.id || p.code === targetProject.code
          ? { ...p, status: 'SANCTIONED' as const }
          : p
      )
    );

    const inCr = (updated.totalCompensationEstimate / 10000000).toFixed(2);
    setActionSuccess(
      `✓ Compensation Award for ${targetProject.code} (₹${inCr} Cr) successfully APPROVED and sanctioned under RFCTLARR Section 28 & 30! Status registered as "Sanctioned & Approved" on dashboard.`
    );
    setTimeout(() => setActionSuccess(null), 5000);
  };

  /**
   * Forward total compensation estimate & dossier to District Authority (Ananya Patel)
   */
  const handleSubmitToDistrict = () => {
    if (!activeProject) return;

    const updated = compensationV2Service.submitDossierToDistrict(activeProject.id);
    setDossier(updated);

    localStorage.setItem(`bhoomi_comp_status_${activeProject.id}`, 'SUBMITTED_TO_DISTRICT');
    localStorage.setItem(`bhoomi_comp_status_${activeProject.code}`, 'SUBMITTED_TO_DISTRICT');
    localStorage.setItem(`bhoomi_comp_submitted_${activeProject.id}`, 'true');
    localStorage.setItem(`bhoomi_comp_submitted_${activeProject.code}`, 'true');

    // Immediately update approvedProjects state
    setApprovedProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id || p.code === activeProject.code
          ? { ...p, status: p.status === 'SANCTIONED' ? 'SANCTIONED' : ('SUBMITTED_TO_DISTRICT' as const) }
          : p
      )
    );

    const inCr = (updated.totalCompensationEstimate / 10000000).toFixed(2);
    setActionSuccess(
      `✓ Total Compensation Estimate (₹${inCr} Cr) and supporting valuation dossier successfully forwarded to District Authority (Ananya Patel) for Section 28 statutory sanction.`
    );
    setTimeout(() => setActionSuccess(null), 5000);
  };

  const totalEstimate = dossier.totalCompensationEstimate;
  const totalInCr = (totalEstimate / 10000000).toFixed(2);
  const totalInLakhs = (totalEstimate / 100000).toFixed(1);
  const baseValue = Math.round(totalEstimate / 2);
  const solatium = Math.round(totalEstimate / 2);
  const totalDocsCount = currentParcels.reduce((sum, p) => sum + (p.supportingDocuments?.length || 0), 0);

  const totalApprovedParcels = approvedProjects.reduce((sum, p) => sum + p.parcelCount, 0);
  const totalApprovedAcres = approvedProjects.reduce((sum, p) => sum + p.totalAreaAcres, 0);
  const totalApprovedPipelineVal = approvedProjects.reduce((sum, p) => sum + p.totalEstimate, 0);

  return (
    <div className="things-comp-root">
      <div className="things-comp-container">
        {/* Sovereign Editorial Masthead */}
        <header className="things-comp-header">
          <div className="things-comp-header-main">
            <div className="things-comp-eyebrow">
              <BhoomiLogo size={18} strokeWidth={2.4} />
              <span className="things-comp-eyebrow-pill">
                Special Land Acquisition Office (SLAO) &bull; CALA
              </span>
            </div>
            <div className="things-comp-title-row">
              <h1 className="things-comp-title">
                Compensation Determination &amp; Award Preparation
              </h1>
            </div>
            <p className="things-comp-subtitle">
              Statutory valuation, solatium calculation (100%), and supporting document compilation under RFCTLARR Sections 26–30.
            </p>
          </div>

          {/* SLAO Duty Card */}
          <aside className="things-comp-duty-card" aria-label="Officer Profile">
            <div className="things-comp-duty-status">
              <span className="things-comp-duty-dot" />
              <span>Active Statutory Duty</span>
            </div>
            <div className="things-comp-duty-meta">
              <div className="things-comp-duty-row">
                <span className="things-comp-duty-label">Officer</span>
                <span className="things-comp-duty-val">{user?.name || 'Mahesh Patil'}</span>
              </div>
              <div className="things-comp-duty-row">
                <span className="things-comp-duty-label">Designation</span>
                <span className="things-comp-duty-val">Special Land Acquisition Officer (SLAO)</span>
              </div>
              <div className="things-comp-duty-row">
                <span className="things-comp-duty-label">Jurisdiction</span>
                <span className="things-comp-duty-val">CALA &bull; RFCTLARR Authority</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                refreshDossier();
                loadApprovedProjects();
              }}
              disabled={loading || loadingProjects}
              className="things-comp-btn things-comp-btn-outline"
              style={{ width: '100%', marginTop: '4px' }}
            >
              {loading || loadingProjects ? 'Refreshing...' : '↻ Refresh Dossier'}
            </button>
          </aside>
        </header>

        {/* Success Notice */}
        {actionSuccess && (
          <div className="things-comp-notice" role="alert">
            <span>{actionSuccess}</span>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="things-comp-notice-close"
              aria-label="Dismiss notice"
            >
              &times;
            </button>
          </div>
        )}

        {/* Project Requisition Loading & Empty States */}
        {loadingProjects ? (
          <div className="things-comp-empty-card" style={{ padding: '60px 24px' }}>
            <div className="things-comp-empty-icon">⏳</div>
            <h3 className="things-comp-empty-title">Loading Project Requisitions</h3>
            <p className="things-comp-empty-sub">Fetching sanctioned land acquisition projects...</p>
          </div>
        ) : approvedProjects.length === 0 ? (
          <div className="things-comp-empty-card">
            <div className="things-comp-empty-icon">📋</div>
            <h3 className="things-comp-empty-title">No Projects Available</h3>
            <p className="things-comp-empty-sub">
              No project requisitions have been approved for compensation processing yet. Once the Competent Authority sanctions a project requisition, it will appear here for valuation award preparation.
            </p>
          </div>
        ) : !selectedProjectId || !approvedProjects.some((p) => p.id === selectedProjectId || p.code === selectedProjectId) ? (
          /* Inbound Project Selection Grid */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Hub Summary Bar */}
            <div className="things-comp-hub-card">
              <div className="things-comp-hub-header">
                <div>
                  <h2 className="things-comp-hub-title">Inbound Project Requisitions</h2>
                  <p className="things-comp-hub-sub">
                    Select an approved project to review land parcels, compute statutory solatium, and compile compensation determinations.
                  </p>
                </div>
              </div>

              <div className="things-comp-kpi-grid">
                <div className="things-comp-kpi-card">
                  <span className="things-comp-kpi-label">Sanctioned Projects</span>
                  <span className="things-comp-kpi-val text-blue">{approvedProjects.length}</span>
                  <span className="things-comp-kpi-caption">Active statutory requisitions</span>
                </div>
                <div className="things-comp-kpi-card">
                  <span className="things-comp-kpi-label">Total Parcels</span>
                  <span className="things-comp-kpi-val">{totalApprovedParcels}</span>
                  <span className="things-comp-kpi-caption">Across demarcated sectors</span>
                </div>
                <div className="things-comp-kpi-card">
                  <span className="things-comp-kpi-label">Acquisition Area</span>
                  <span className="things-comp-kpi-val text-emerald">{totalApprovedAcres.toFixed(2)} Ac</span>
                  <span className="things-comp-kpi-caption">Demarcated GIS boundary</span>
                </div>
                <div className="things-comp-kpi-card">
                  <span className="things-comp-kpi-label">Pipeline Valuation</span>
                  <span className="things-comp-kpi-val text-amber">₹{(totalApprovedPipelineVal / 10000000).toFixed(2)} Cr</span>
                  <span className="things-comp-kpi-caption">Total compensation liability</span>
                </div>
              </div>
            </div>

            {/* Project Cards Grid */}
            <div className="things-comp-project-grid">
              {approvedProjects.map((proj) => {
                const isSelected = selectedProjectId === proj.id;
                const estCr = (proj.totalEstimate / 10000000).toFixed(2);

                return (
                  <div
                    key={proj.id}
                    className={`things-comp-project-card ${isSelected ? 'is-selected' : ''}`}
                  >
                    <div>
                      <div className="things-comp-project-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="things-comp-code-pill">{proj.code}</span>
                          <span className="things-comp-state-chip">{proj.state}</span>
                        </div>

                        <span
                          className={`things-comp-badge ${
                            proj.status === 'SANCTIONED'
                              ? 'status-sanctioned'
                              : proj.status === 'SUBMITTED_TO_DISTRICT'
                              ? 'status-submitted'
                              : 'status-pending'
                          }`}
                        >
                          {proj.status === 'SANCTIONED'
                            ? '✓ Sanctioned & Approved'
                            : proj.status === 'SUBMITTED_TO_DISTRICT'
                            ? '✓ Submitted to District'
                            : 'Action Required'}
                        </span>
                      </div>

                      <h3 className="things-comp-project-title">{proj.title}</h3>

                      <div className="things-comp-project-meta">
                        <div>
                          <strong>Dispatched By:</strong> {proj.routedBy}
                        </div>
                        <div>
                          <strong>District:</strong> {proj.district}
                        </div>
                      </div>

                      <div className="things-comp-metrics-strip">
                        <div>
                          <div className="things-comp-metric-label">Parcels</div>
                          <div className="things-comp-metric-val">{proj.parcelCount}</div>
                        </div>
                        <div>
                          <div className="things-comp-metric-label">Area</div>
                          <div className="things-comp-metric-val">{proj.totalAreaAcres} Ac</div>
                        </div>
                        <div>
                          <div className="things-comp-metric-label">Estimate</div>
                          <div className="things-comp-metric-val blue">₹{estCr} Cr</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                      <button
                        type="button"
                        onClick={() => handleSelectProject(proj.id)}
                        className="things-comp-btn things-comp-btn-primary"
                        style={{ flex: 1 }}
                      >
                        <span>{proj.status === 'SANCTIONED' ? 'Inspect Sanctioned Award →' : 'Select Project & Inspect Parcels →'}</span>
                      </button>
                      {proj.status !== 'SANCTIONED' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveProject(proj.id);
                          }}
                          className="things-comp-btn things-comp-btn-success"
                          style={{ whiteSpace: 'nowrap', padding: '8px 14px' }}
                          title="Approve compensation award for this project"
                        >
                          ✓ Approve Award
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Selected Project Workspace */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Top Project Switcher & Navigation Bar */}
            <nav className="things-comp-nav-bar" aria-label="Project Navigation">
              <div className="things-comp-nav-left">
                <button
                  type="button"
                  onClick={() => handleSelectProject(null)}
                  className="things-comp-nav-btn"
                >
                  <span>&larr;</span>
                  <span>All Inbound Projects</span>
                </button>

                <span className="things-comp-nav-divider">|</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="things-comp-code-pill">{activeProject.code}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--to-ink)' }}>
                    {activeProject.title}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label
                  htmlFor="comp-project-switcher"
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--to-fog)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Switch Project:
                </label>
                <select
                  id="comp-project-switcher"
                  value={activeProject.id}
                  onChange={(e) => handleSelectProject(e.target.value)}
                  className="things-comp-select"
                >
                  {approvedProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} &mdash; {p.title.slice(0, 36)}... ({p.parcelCount} parcels)
                    </option>
                  ))}
                </select>
              </div>
            </nav>

            {/* Requisition Banner */}
            <div className="things-comp-req-banner">
              <div className="things-comp-req-main">
                <div className="things-comp-req-title-row">
                  <span className="things-comp-code-pill">PROJECT REQUISITION &bull; {activeProject.code}</span>
                  <span className="things-comp-req-title">{activeProject.title}</span>
                </div>
                <div className="things-comp-req-meta">
                  <span><strong>Jurisdiction:</strong> {activeProject.district}, {activeProject.state}</span>
                  <span>&bull;</span>
                  <span><strong>Dispatched By:</strong> {activeProject.routedBy}</span>
                  <span>&bull;</span>
                  <span><strong>Current Stage:</strong> {activeProject.stageName}</span>
                </div>
              </div>

              <div>
                <span
                  className={`things-comp-badge ${
                    activeProject.status === 'SANCTIONED'
                      ? 'status-sanctioned'
                      : activeProject.status === 'SUBMITTED_TO_DISTRICT'
                      ? 'status-submitted'
                      : 'status-pending'
                  }`}
                >
                  {activeProject.status === 'SANCTIONED'
                    ? '✓ Section 28 Sanctioned & Approved'
                    : activeProject.status === 'SUBMITTED_TO_DISTRICT'
                    ? '✓ Submitted to District Authority'
                    : 'Valuations & Estimates Pending'}
                </span>
              </div>
            </div>

            {/* Total Compensation Estimate Hero Card (Things 3 Elevated White Card) */}
            <section className="things-comp-hero-card" aria-label="Valuation Overview">
              <div className="things-comp-hero-top">
                <div>
                  <div className="things-comp-hero-label">
                    Total Compensation Estimate (Section 26–30 Valuation Dossier &bull; {activeProject.code})
                  </div>
                  <div className="things-comp-hero-val-row">
                    <span className="things-comp-hero-val">
                      ₹{totalEstimate.toLocaleString('en-IN')}
                    </span>
                    <span className="things-comp-hero-sub">
                      ({totalInCr} Cr / ₹{totalInLakhs} Lakh)
                    </span>
                  </div>
                </div>

                <div className="things-comp-forward-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => handleApproveProject()}
                      className={`things-comp-btn ${
                        activeProject.status === 'SANCTIONED'
                          ? 'things-comp-btn-success'
                          : 'things-comp-btn-primary'
                      }`}
                      style={{ padding: '12px 20px', fontSize: '13.5px', fontWeight: 700 }}
                    >
                      {activeProject.status === 'SANCTIONED'
                        ? '✓ Award Approved & Sanctioned'
                        : '✓ Approve Compensation Award (Sec 28/30)'}
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitToDistrict}
                      className="things-comp-btn things-comp-btn-outline"
                      style={{ padding: '12px 18px', fontSize: '13px' }}
                    >
                      {activeProject.status === 'SUBMITTED_TO_DISTRICT' || activeProject.status === 'SANCTIONED'
                        ? '✓ Forwarded to District Authority'
                        : 'Forward Dossier to District Authority →'}
                    </button>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--to-fog)', textAlign: 'right', marginTop: '4px' }}>
                    {activeProject.status === 'SANCTIONED'
                      ? 'Statutory compensation award sanctioned under RFCTLARR Section 28 & 30.'
                      : 'Transfers entire valuation dossier for Section 28 Collector Sanction.'}
                  </span>
                </div>
              </div>

              <div className="things-comp-chips-row">
                <div className="things-comp-stat-chip">
                  <span className="chip-label">Base Valuation:</span>
                  <span className="chip-val">₹{baseValue.toLocaleString('en-IN')}</span>
                </div>
                <div className="things-comp-stat-chip emerald">
                  <span className="chip-label">100% Solatium (Sec 30):</span>
                  <span className="chip-val">₹{solatium.toLocaleString('en-IN')}</span>
                </div>
                <div className="things-comp-stat-chip">
                  <span className="chip-label">Demarcated Area:</span>
                  <span className="chip-val">{activeProject.totalAreaAcres} Acres</span>
                </div>
                <div className="things-comp-stat-chip">
                  <span className="chip-label">Received Parcels:</span>
                  <span className="chip-val">{currentParcels.length} Parcels</span>
                </div>
                <div className="things-comp-stat-chip">
                  <span className="chip-label">Valuation Documents:</span>
                  <span className="chip-val">{totalDocsCount} Attached</span>
                </div>
              </div>
            </section>

            {/* Received Land Parcels Section */}
            <section aria-label="Land Parcels">
              <div className="things-comp-section-header" style={{ marginBottom: '16px' }}>
                <div>
                  <h2 className="things-comp-section-title">
                    Received Land Parcels ({currentParcels.length}) &bull; Statutory Valuation &amp; Supporting Documents
                  </h2>
                  <p className="things-comp-section-sub">
                    Set compensation estimate and attach supporting circle rate sheets and solatium schedules for each parcel in {activeProject.code}.
                  </p>
                </div>
              </div>

              {/* Parcels List */}
              <div className="things-comp-parcel-list">
                {currentParcels.map((parcel, idx) => {
                  const parcelEstimate = parcel.compensationEstimate || 0;
                  const parcelBase = Math.round(parcelEstimate / 2);
                  const parcelSolatium = Math.round(parcelEstimate / 2);
                  const hasProof = Boolean(parcel.actualCompensationProof?.referenceNo);

                  return (
                    <article key={parcel.parcelId} className="things-comp-parcel-card">
                      {/* Parcel Head */}
                      <div className="things-comp-parcel-head">
                        <div className="things-comp-parcel-identity">
                          <div className="things-comp-index-circle">{idx + 1}</div>
                          <div>
                            <div className="things-comp-parcel-title">
                              <span>Khasra No. {parcel.khasraNumber} (Survey {parcel.surveyNumber})</span>
                              <span className="things-comp-ulpin-tag">{parcel.ulpin}</span>
                            </div>
                            <div className="things-comp-parcel-sub">
                              Khatedar: <strong>{parcel.khatedar}</strong> &bull; {parcel.village}, {parcel.district} &bull; <strong>{parcel.areaAcres} Acres</strong> ({parcel.landType})
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {hasProof ? (
                            <span className="things-comp-badge status-sanctioned">
                              ✓ PFMS Disbursal Recorded
                            </span>
                          ) : (
                            <span className="things-comp-badge status-pending">
                              Valuation Recorded
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Parcel Inner Grid */}
                      <div className="things-comp-parcel-grid">
                        <div>
                          <label className="things-comp-block-label">
                            Statutory Compensation Estimate (₹)
                          </label>
                          <div className="things-comp-input-row">
                            <span className="things-comp-currency">₹</span>
                            <input
                              type="number"
                              value={parcelEstimate}
                              onChange={(e) => handleEstimateChange(parcel.parcelId, Number(e.target.value))}
                              className="things-comp-input"
                            />
                            <span className="things-comp-lakh-chip">
                              (₹{(parcelEstimate / 100000).toFixed(2)} Lakh)
                            </span>
                          </div>
                          <div className="things-comp-formula-note">
                            Base: ₹{parcelBase.toLocaleString('en-IN')} + 100% Solatium (Sec 30): ₹{parcelSolatium.toLocaleString('en-IN')}
                          </div>
                        </div>

                        <div>
                          <div className="things-comp-block-label">
                            Beneficiary Bank Mandate (PFMS)
                          </div>
                          <div className="things-comp-mandate-info">
                            <strong>{parcel.bankName}</strong><br />
                            A/C: <code>{parcel.accountNumber}</code>
                          </div>
                          <div className="things-comp-mandate-meta">
                            IFSC: <code>{parcel.ifsc}</code> &bull; Aadhaar: <code>{parcel.aadhaarMasked}</code>
                          </div>
                        </div>

                        <div>
                          <div className="things-comp-block-label">
                            Actual Payment Proof
                          </div>
                          {hasProof ? (
                            <div>
                              <div className="things-comp-proof-info">
                                <strong>{parcel.actualCompensationProof?.referenceNo}</strong> &bull; ₹{parcel.actualCompensationProof?.paidAmount.toLocaleString('en-IN')}
                              </div>
                              <div className="things-comp-proof-meta">
                                Date: {parcel.actualCompensationProof?.paymentDate} ({parcel.actualCompensationProof?.mode})
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: '12.5px', color: 'var(--to-fog)' }}>
                              No payment advice attached yet.
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveProofParcel(parcel);
                              setProofRef(parcel.actualCompensationProof?.referenceNo || `PFMS-DL-RIT-${Date.now().toString().slice(-4)}`);
                              setProofAmount(parcel.compensationEstimate);
                              setProofDate(parcel.actualCompensationProof?.paymentDate || new Date().toISOString().split('T')[0]);
                            }}
                            className="things-comp-proof-trigger"
                          >
                            {hasProof ? '✎ Edit PFMS Disbursal Proof' : '+ Attach PFMS Payment Proof'}
                          </button>
                        </div>
                      </div>

                      {/* Supporting Documents Box */}
                      <div className="things-comp-docs-box">
                        <div className="things-comp-docs-header">
                          <div className="things-comp-docs-title">
                            <span>📎 Supporting Valuation Documents ({parcel.supportingDocuments?.length || 0})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveDocParcel(parcel);
                              setNewDocName('');
                              setDocFile(null);
                            }}
                            className="things-comp-btn things-comp-btn-outline"
                            style={{ fontSize: '11.5px', padding: '4px 10px' }}
                          >
                            + Add Supporting Document
                          </button>
                        </div>

                        <div className="things-comp-docs-chips">
                          {parcel.supportingDocuments && parcel.supportingDocuments.length > 0 ? (
                            parcel.supportingDocuments.map((doc) => (
                              <div key={doc.id} className="things-comp-doc-chip">
                                <div style={{ fontSize: '16px' }}>📄</div>
                                <div>
                                  <div className="things-comp-doc-name">{doc.name}</div>
                                  <div className="things-comp-doc-sub">
                                    <span className="things-comp-doc-type">{doc.type}</span> &bull; {doc.size || '1.2 MB'} &bull; {new Date(doc.uploadedAt).toLocaleDateString()}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => alert(`Viewing document: ${doc.name}`)}
                                  className="things-comp-btn things-comp-btn-subtle"
                                  style={{ fontSize: '11px', padding: '3px 8px', marginLeft: '4px' }}
                                >
                                  View
                                </button>
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: '12px', color: 'var(--to-fog)', fontStyle: 'italic' }}>
                              No supporting documents attached yet. Click &quot;+ Add Supporting Document&quot; to attach valuation schedules.
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* ── Modal: Add Supporting Document ── */}
        {activeDocParcel && (
          <div className="things-comp-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="add-doc-title">
            <div className="things-comp-modal-box">
              <div className="things-comp-modal-header">
                <h3 id="add-doc-title" className="things-comp-modal-title">
                  Add Supporting Document
                </h3>
                <p className="things-comp-modal-sub">
                  Attach statutory valuation or title schedule for <strong>Khasra {activeDocParcel.khasraNumber}</strong> ({activeDocParcel.khatedar}).
                </p>
              </div>

              <form onSubmit={handleAddDocumentSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                  <div className="things-comp-form-group">
                    <label className="things-comp-form-label">
                      Document Title / Description
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rohini Circle Rate Valuation Index & Schedule"
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      className="things-comp-form-input"
                    />
                  </div>

                  <div className="things-comp-form-group">
                    <label className="things-comp-form-label">
                      Statutory Document Type
                    </label>
                    <select
                      value={newDocType}
                      onChange={(e) => setNewDocType(e.target.value)}
                      className="things-comp-form-select"
                    >
                      <option value="Valuation Ledger">Valuation Ledger (Form 11)</option>
                      <option value="Solatium Certificate">100% Solatium Determination Sheet</option>
                      <option value="Circle Rate Schedule">Circle Rate Government Schedule</option>
                      <option value="Asset Schedule">Standing Structural &amp; Tree Asset Survey</option>
                      <option value="Title Deed">Title Deed &amp; Khatauni Revenue Extract</option>
                      <option value="Bank Mandate">PFMS Direct Beneficiary Bank Mandate</option>
                    </select>
                  </div>

                  <div className="things-comp-form-group">
                    <label className="things-comp-form-label">
                      Attach PDF / Scanned Copy
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                      style={{ fontSize: '12.5px', color: 'var(--to-ash)' }}
                    />
                  </div>
                </div>

                <div className="things-comp-modal-actions">
                  <button
                    type="button"
                    onClick={() => setActiveDocParcel(null)}
                    className="things-comp-btn things-comp-btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="things-comp-btn things-comp-btn-primary"
                  >
                    Attach Document
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Modal: Record PFMS Disbursal Proof ── */}
        {activeProofParcel && (
          <div className="things-comp-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pfms-proof-title">
            <div className="things-comp-modal-box">
              <div className="things-comp-modal-header">
                <h3 id="pfms-proof-title" className="things-comp-modal-title">
                  Record PFMS Disbursal Proof
                </h3>
                <p className="things-comp-modal-sub">
                  Confirm statutory bank payment advice for <strong>Khasra {activeProofParcel.khasraNumber}</strong> to <strong>{activeProofParcel.khatedar}</strong>.
                </p>
              </div>

              <form onSubmit={handleSaveProofSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                  <div className="things-comp-form-group">
                    <label className="things-comp-form-label">
                      PFMS / RTGS Reference Number
                    </label>
                    <input
                      type="text"
                      required
                      value={proofRef}
                      onChange={(e) => setProofRef(e.target.value)}
                      className="things-comp-form-input"
                    />
                  </div>

                  <div className="things-comp-form-group">
                    <label className="things-comp-form-label">
                      Disbursed Amount (₹)
                    </label>
                    <input
                      type="number"
                      required
                      value={proofAmount}
                      onChange={(e) => setProofAmount(Number(e.target.value))}
                      className="things-comp-form-input"
                    />
                  </div>

                  <div className="things-comp-form-group">
                    <label className="things-comp-form-label">
                      Payment Value Date
                    </label>
                    <input
                      type="date"
                      required
                      value={proofDate}
                      onChange={(e) => setProofDate(e.target.value)}
                      className="things-comp-form-input"
                    />
                  </div>
                </div>

                <div className="things-comp-modal-actions">
                  <button
                    type="button"
                    onClick={() => setActiveProofParcel(null)}
                    className="things-comp-btn things-comp-btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="things-comp-btn things-comp-btn-success"
                  >
                    Save Disbursal Proof
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompensationDashboardPage;
