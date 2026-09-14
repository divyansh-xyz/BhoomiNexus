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
  const [activeDocParcel, setActiveDocParcel] = useState<ParcelCompensationItem | null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState('Valuation Ledger');
  const [docFile, setDocFile] = useState<File | null>(null);

  // PFMS Proof Modal state
  const [activeProofParcel, setActiveProofParcel] = useState<ParcelCompensationItem | null>(null);
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
          status: isRithala ? currentDossier.status : 'INCOMING_REQUISITION',
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
   * Forward total compensation estimate & dossier to District Authority (Ananya Patel)
   */
  const handleSubmitToDistrict = () => {
    const updated = compensationV2Service.submitDossierToDistrict();
    setDossier(updated);
    const inCr = (updated.totalCompensationEstimate / 10000000).toFixed(2);
    setActionSuccess(
      `✓ Total Compensation Estimate (₹${inCr} Cr) and supporting valuation dossier successfully forwarded to District Authority (Ananya Patel) for Section 28 statutory sanction.`
    );
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
    <div className="comp-workspace">
      {/* SLAO Masthead */}
      <div className="comp-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <BhoomiLogo size={20} strokeWidth={2.4} />
            <span className="comp-slao-badge">
              Special Land Acquisition Office (SLAO) &bull; Competent Authority for Land Acquisition (CALA)
            </span>
          </div>
          <h1 className="comp-title">
            Compensation Determination &amp; Award Preparation
          </h1>
          <p className="comp-subtitle">
            Statutory valuation, solatium calculation (100%), and supporting document compilation under RFCTLARR Sections 26–30
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>
              Officer: {user?.name || 'Mahesh Patil'} (SLAO)
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              refreshDossier();
              loadApprovedProjects();
            }}
            disabled={loading || loadingProjects}
            className="comp-btn comp-btn-outline"
          >
            {loading || loadingProjects ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccess && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '14px 20px', borderRadius: '10px', marginBottom: '22px', fontSize: '13.5px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(6, 95, 70, 0.06)' }}>
          <span>{actionSuccess}</span>
          <button type="button" onClick={() => setActionSuccess(null)} style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontSize: '18px' }}>&times;</button>
        </div>
      )}

      {/* Prerequisite Check: If no projects have had their visual workflow approved by Boss yet */}
      {loadingProjects ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <div style={{ fontSize: '15px', fontWeight: 600 }}>Loading Project Requisitions...</div>
        </div>
      ) : approvedProjects.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '56px 24px',
            textAlign: 'center',
            maxWidth: '520px',
            margin: '40px auto',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#f1f5f9',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              margin: '0 auto 16px auto',
            }}
          >
            📋
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
            No Projects Available
          </h2>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
            No project requisitions have been approved for compensation processing yet.
          </p>
        </div>
      ) : !selectedProjectId || !approvedProjects.some((p) => p.id === selectedProjectId || p.code === selectedProjectId) ? (
        /* Inbound Project Selection Grid for Approved Projects */
        <div>
          {/* Hub Header & Metrics Banner */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '24px 28px',
              marginBottom: '26px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Inbound Project Requisitions
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Select an approved project to review land parcels and prepare compensation determinations.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#2563eb' }}>{approvedProjects.length}</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Sanctioned Projects</div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{totalApprovedParcels}</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Parcels</div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>{totalApprovedAcres.toFixed(2)}</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Acres</div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#d97706' }}>₹{(totalApprovedPipelineVal / 10000000).toFixed(2)} Cr</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Pipeline Value</div>
                </div>
              </div>
            </div>
          </div>

          {/* Project Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '22px' }}>
            {approvedProjects.map((proj) => {
              const isSelected = selectedProjectId === proj.id;
              const estCr = (proj.totalEstimate / 10000000).toFixed(2);

              return (
                <div
                  key={proj.id}
                  style={{
                    background: '#ffffff',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                  }}
                >
                  <div>
                    {/* Project Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', color: '#1d4ed8', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                          {proj.code}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px' }}>
                          {proj.state}
                        </span>
                      </div>

                      <span
                        className={`comp-badge ${
                          proj.status === 'SANCTIONED'
                            ? 'comp-badge-approved'
                            : proj.status === 'SUBMITTED_TO_DISTRICT'
                            ? 'comp-badge-paid'
                            : 'comp-badge-assessed'
                        }`}
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        {proj.status === 'SANCTIONED'
                          ? '✓ Sanctioned'
                          : proj.status === 'SUBMITTED_TO_DISTRICT'
                          ? '✓ Submitted to District'
                          : 'Action Required'}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 style={{ fontSize: '16.5px', fontWeight: 700, color: '#0f172a', margin: '0 0 10px 0', lineHeight: 1.35 }}>
                      {proj.title}
                    </h3>

                    {/* Route & Jurisdiction */}
                    <div style={{ fontSize: '12.5px', color: '#475569', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>
                        <strong style={{ color: '#334155' }}>Dispatched By:</strong> {proj.routedBy}
                      </div>
                      <div>
                        <strong style={{ color: '#334155' }}>District:</strong> {proj.district}
                      </div>
                    </div>

                    {/* Key Metrics Mini Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '12px',
                        marginBottom: '20px',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Parcels</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{proj.parcelCount}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Area</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{proj.totalAreaAcres} Ac</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Estimate</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#2563eb' }}>₹{estCr} Cr</div>
                      </div>
                    </div>
                  </div>

                  {/* Select Action Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectProject(proj.id)}
                    style={{
                      width: '100%',
                      background: isSelected ? '#1e293b' : '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <span>Select Project &amp; Inspect Parcels →</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Selected Project Workspace */
        <div>
          {/* Top Project Switcher & Breadcrumb Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '20px',
              padding: '12px 18px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleSelectProject(null)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>&larr;</span>
                <span>All Inbound Projects</span>
              </button>

              <span style={{ color: '#cbd5e1' }}>|</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', padding: '3px 8px', borderRadius: '4px', border: '1px solid #bfdbfe', fontFamily: 'monospace' }}>
                  {activeProject.code}
                </span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                  {activeProject.title}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label htmlFor="comp-project-switcher" style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Switch Project:
              </label>
              <select
                id="comp-project-switcher"
                value={activeProject.id}
                onChange={(e) => handleSelectProject(e.target.value)}
                style={{
                  padding: '7px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                {approvedProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} &mdash; {p.title.slice(0, 36)}... ({p.parcelCount} parcels)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 1. Inbound Project Request Banner */}
          <div className="comp-demo-banner" style={{ borderLeft: '4px solid #2563eb', padding: '18px 22px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', marginBottom: '22px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                  PROJECT REQUISITION &bull; {activeProject.code}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                  {activeProject.title}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12.5px', color: '#475569', flexWrap: 'wrap' }}>
                <span>
                  <strong>Jurisdiction:</strong> {activeProject.district}, {activeProject.state}
                </span>
                <span>&bull;</span>
                <span>
                  <strong>Dispatched By:</strong> {activeProject.routedBy}
                </span>
                <span>&bull;</span>
                <span>
                  <strong>Current Stage:</strong> {activeProject.stageName}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                className={`comp-badge ${
                  activeProject.status === 'SANCTIONED'
                    ? 'comp-badge-approved'
                    : activeProject.status === 'SUBMITTED_TO_DISTRICT'
                    ? 'comp-badge-paid'
                    : 'comp-badge-assessed'
                }`}
                style={{ padding: '6px 12px', fontSize: '11.5px' }}
              >
                {activeProject.status === 'SANCTIONED'
                  ? '✓ Section 28 Sanctioned'
                  : activeProject.status === 'SUBMITTED_TO_DISTRICT'
                  ? '✓ Submitted to District Authority'
                  : 'Valuations & Estimates Pending'}
              </span>
            </div>
          </div>

          {/* 2. Total Compensation Estimate Overview Card */}
          <div
            className="comp-card"
            style={{
              marginBottom: '26px',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: '#ffffff',
              borderRadius: '14px',
              padding: '24px 28px',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '8px' }}>
                  Total Compensation Estimate (Section 26–30 Valuation Dossier &bull; {activeProject.code})
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.02em', color: '#38bdf8' }}>
                    ₹{totalEstimate.toLocaleString('en-IN')}
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#e2e8f0' }}>
                    ({totalInCr} Cr / ₹{totalInLakhs} Lakh)
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '14px', fontSize: '13px', color: '#cbd5e1', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Base Valuation:</span>{' '}
                    <strong>₹{baseValue.toLocaleString('en-IN')}</strong>
                  </div>
                  <span>&bull;</span>
                  <div>
                    <span style={{ color: '#94a3b8' }}>100% Statutory Solatium (Sec 30):</span>{' '}
                    <strong style={{ color: '#6ee7b7' }}>₹{solatium.toLocaleString('en-IN')}</strong>
                  </div>
                  <span>&bull;</span>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Received Parcels:</span>{' '}
                    <strong>{currentParcels.length} ({activeProject.totalAreaAcres} Acres)</strong>
                  </div>
                  <span>&bull;</span>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Supporting Documents:</span>{' '}
                    <strong>{totalDocsCount} Attached</strong>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleSubmitToDistrict}
                  style={{
                    background: activeProject.status === 'SUBMITTED_TO_DISTRICT' ? '#059669' : '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '14px 24px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {activeProject.status === 'SUBMITTED_TO_DISTRICT'
                    ? '✓ Re-Submit / Update to District Authority (Ananya Patel)'
                    : 'Submit Total Estimate to District Authority (Ananya Patel) →'}
                </button>
                <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'right', marginTop: '6px' }}>
                  Transfers entire valuation dossier for Section 28 Collector Sanction
                </div>
              </div>
            </div>
          </div>

          {/* 3. Received Parcels Section */}
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                Received Land Parcels ({currentParcels.length}) &bull; Statutory Valuation &amp; Supporting Documents
              </h2>
              <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
                Set compensation estimate and attach supporting circle rate sheets and solatium schedules for each parcel in {activeProject.code}.
              </p>
            </div>
          </div>

          {/* Parcel Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {currentParcels.map((parcel, idx) => {
              const parcelEstimate = parcel.compensationEstimate || 0;
              const parcelBase = Math.round(parcelEstimate / 2);
              const parcelSolatium = Math.round(parcelEstimate / 2);
              const hasProof = Boolean(parcel.actualCompensationProof?.referenceNo);

              return (
                <div
                  key={parcel.parcelId}
                  className="comp-card"
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px 24px',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  {/* Parcel Header Bar */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '8px',
                          background: '#eff6ff',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          fontWeight: 800,
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                            Khasra No. {parcel.khasraNumber} (Survey {parcel.surveyNumber})
                          </span>
                          <span style={{ fontSize: '11.5px', fontFamily: 'monospace', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {parcel.ulpin}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#475569' }}>
                          Khatedar: <strong>{parcel.khatedar}</strong> &bull; {parcel.village}, {parcel.district} &bull; <strong>{parcel.areaAcres} Acres</strong> ({parcel.landType})
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {hasProof ? (
                        <span className="comp-badge comp-badge-paid" style={{ padding: '4px 10px' }}>
                          ✓ PFMS Disbursal Recorded
                        </span>
                      ) : (
                        <span className="comp-badge comp-badge-assessed" style={{ padding: '4px 10px' }}>
                          Valuation Recorded
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Estimate & Calculation Row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '16px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '16px 20px',
                      marginBottom: '18px',
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#334155', marginBottom: '6px' }}>
                        Statutory Compensation Estimate (₹)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: '#64748b' }}>₹</span>
                        <input
                          type="number"
                          value={parcelEstimate}
                          onChange={(e) => handleEstimateChange(parcel.parcelId, Number(e.target.value))}
                          style={{
                            padding: '8px 12px',
                            fontSize: '16px',
                            fontWeight: 700,
                            color: '#0f172a',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            width: '180px',
                            outline: 'none',
                            background: '#ffffff',
                          }}
                        />
                        <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>
                          (₹{(parcelEstimate / 100000).toFixed(2)} Lakh)
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '6px' }}>
                        Base: ₹{parcelBase.toLocaleString()} + 100% Solatium (Sec 30): ₹{parcelSolatium.toLocaleString()}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#334155', marginBottom: '6px' }}>
                        Beneficiary Bank Mandate (PFMS)
                      </div>
                      <div style={{ fontSize: '13px', color: '#1e293b' }}>
                        <strong>{parcel.bankName}</strong> &bull; A/C: <code>{parcel.accountNumber}</code>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                        IFSC: <code>{parcel.ifsc}</code> &bull; Aadhaar: <code>{parcel.aadhaarMasked}</code>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#334155', marginBottom: '6px' }}>
                        Actual Payment Proof
                      </div>
                      {hasProof ? (
                        <div style={{ fontSize: '12.5px', color: '#065f46' }}>
                          <strong>{parcel.actualCompensationProof?.referenceNo}</strong> &bull; ₹{parcel.actualCompensationProof?.paidAmount.toLocaleString()}
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            Date: {parcel.actualCompensationProof?.paymentDate} ({parcel.actualCompensationProof?.mode})
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>
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
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#2563eb',
                          padding: 0,
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          marginTop: '4px',
                          textDecoration: 'underline',
                        }}
                      >
                        {hasProof ? 'Edit PFMS Disbursal Proof' : '+ Attach PFMS Payment Proof'}
                      </button>
                    </div>
                  </div>

                  {/* Supporting Documents Section */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>📎 Supporting Documents ({parcel.supportingDocuments?.length || 0})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDocParcel(parcel);
                          setNewDocName('');
                          setDocFile(null);
                        }}
                        className="comp-btn comp-btn-outline"
                        style={{ fontSize: '11.5px', padding: '4px 10px' }}
                      >
                        + Add Supporting Document
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {parcel.supportingDocuments && parcel.supportingDocuments.length > 0 ? (
                        parcel.supportingDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              fontSize: '12.5px',
                            }}
                          >
                            <div style={{ fontSize: '16px' }}>📄</div>
                            <div>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{doc.name}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                <span style={{ color: '#2563eb', fontWeight: 600 }}>{doc.type}</span> &bull; {doc.size || '1.2 MB'} &bull; {new Date(doc.uploadedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => alert(`Viewing document: ${doc.name}`)}
                              style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#1d4ed8',
                                borderRadius: '4px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                marginLeft: '4px',
                              }}
                            >
                              View
                            </button>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                          No supporting documents attached yet. Click &quot;+ Add Supporting Document&quot; to attach valuation schedules.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal: Add Supporting Document ── */}
      {activeDocParcel && (
        <div className="comp-modal-overlay">
          <div className="comp-modal-card">
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
              Add Supporting Document
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px 0' }}>
              Attach statutory valuation or title schedule for <strong>Khasra {activeDocParcel.khasraNumber}</strong> ({activeDocParcel.khatedar}).
            </p>

            <form onSubmit={handleAddDocumentSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Document Title / Description
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohini Circle Rate Valuation Index & Schedule"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Statutory Document Type
                  </label>
                  <select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                  >
                    <option value="Valuation Ledger">Valuation Ledger (Form 11)</option>
                    <option value="Solatium Certificate">100% Solatium Determination Sheet</option>
                    <option value="Circle Rate Schedule">Circle Rate Government Schedule</option>
                    <option value="Asset Schedule">Standing Structural &amp; Tree Asset Survey</option>
                    <option value="Title Deed">Title Deed &amp; Khatauni Revenue Extract</option>
                    <option value="Bank Mandate">PFMS Direct Beneficiary Bank Mandate</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Attach PDF / Scanned Copy
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                    style={{ fontSize: '12.5px', color: '#475569' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActiveDocParcel(null)}
                  className="comp-btn comp-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="comp-btn comp-btn-primary"
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
        <div className="comp-modal-overlay">
          <div className="comp-modal-card">
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
              Record PFMS Disbursal Proof
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '0 0 16px 0' }}>
              Confirm statutory bank payment advice for <strong>Khasra {activeProofParcel.khasraNumber}</strong> to <strong>{activeProofParcel.khatedar}</strong>.
            </p>

            <form onSubmit={handleSaveProofSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    PFMS / RTGS Reference Number
                  </label>
                  <input
                    type="text"
                    required
                    value={proofRef}
                    onChange={(e) => setProofRef(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Disbursed Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={proofAmount}
                    onChange={(e) => setProofAmount(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Payment Value Date
                  </label>
                  <input
                    type="date"
                    required
                    value={proofDate}
                    onChange={(e) => setProofDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setActiveProofParcel(null)}
                  className="comp-btn comp-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="comp-btn comp-btn-success"
                >
                  Save Disbursal Proof
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompensationDashboardPage;
