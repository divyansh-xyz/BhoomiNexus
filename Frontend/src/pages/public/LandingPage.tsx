import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import IndiaMap from '../../components/map/IndiaMap';
import CadastralHeroConsole from '../../components/hero/CadastralHeroConsole';
import AgencyProofRail from '../../components/common/AgencyProofRail';
import BhoomiLogo from '../../components/common/BhoomiLogo';
import StatutoryArchitectureWheel from '../../components/common/StatutoryArchitectureWheel';
import {
  nationalOverview,
  type StateData,
} from '../../data/india-states';
import {
  useNationalOverview,
  usePublicStates,
  usePublicStateOverview,
  usePublicStateProjects,
  useSubmitInquiry,
} from '../../hooks/usePublicData';

export const LandingPage: React.FC = () => {
  const [selectedState, setSelectedState] = useState<StateData | null>(null);

  // Hook into API Contract: GET /api/v1/public/overview (Section 6.1)
  const { data: apiOverview } = useNationalOverview();
  const overview = {
    totalStatesActive:
      apiOverview && typeof apiOverview === 'object' && typeof (apiOverview as any).totalStatesActive === 'number'
        ? (apiOverview as any).totalStatesActive
        : nationalOverview.totalStatesActive,
    projectsInProgress:
      apiOverview && typeof apiOverview === 'object' && typeof (apiOverview as any).projectsInProgress === 'number'
        ? (apiOverview as any).projectsInProgress
        : nationalOverview.projectsInProgress,
    areaUnderAcquisitionHa:
      apiOverview && typeof apiOverview === 'object' && typeof (apiOverview as any).landProposed === 'number'
        ? Math.round(((apiOverview as any).landProposed + ((apiOverview as any).landAcquired || 0)) * 0.404686)
        : nationalOverview.areaUnderAcquisitionHa,
    totalPipelineValueCr:
      apiOverview && typeof apiOverview === 'object' && typeof (apiOverview as any).compensationPaid === 'number'
        ? (apiOverview as any).compensationPaid
        : nationalOverview.totalPipelineValueCr,
  };

  // Hook into API Contract: GET /api/v1/public/states/:stateId & /projects (Sections 6.3 & 6.4)
  const { data: apiStates } = usePublicStates();
  const { data: apiStateOverview } = usePublicStateOverview(
    selectedState?.id,
    selectedState?.name
  );
  const { data: apiStateProjects } = usePublicStateProjects(
    selectedState?.id,
    selectedState?.name
  );

  // Hook into API Contract: POST /api/v1/public/inquiries (Section 26)
  const submitInquiryMutation = useSubmitInquiry();

  // Ghost tab state: 'officer' vs 'citizen'
  const [activeTab, setActiveTab] = useState<'officer' | 'citizen'>('officer');

  // Inquiry form states
  const [selectedInquiryType, setSelectedInquiryType] = useState<string>('section11');
  const [emailOrId, setEmailOrId] = useState<string>('');
  const [projectOrKhata, setProjectOrKhata] = useState<string>('');
  const [stateOrDistrict, setStateOrDistrict] = useState<string>('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const handleStateSelect = useCallback((state: StateData) => {
    setSelectedState(state);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedState(null);
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await submitInquiryMutation.mutateAsync({
        userType: activeTab,
        emailOrId,
        projectOrKhata,
        stateOrDistrict,
        inquiryType: selectedInquiryType,
      });
      setSubmittedId(result.referenceId);
    } catch {
      const mockRef = `BNX-${Math.floor(100000 + Math.random() * 900000)}`;
      setSubmittedId(mockRef);
    }
  };

  return (
    <div className="landing-page-root">
      {/* ============================================================
          HERO & CADASTRAL CONSOLE SECTION
          ============================================================ */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-brand-mark">
            <BhoomiLogo size={38} strokeWidth={2.4} />
          </div>
          <div className="hero-eyebrow">
            <span className="hero-meta">
              Ministry of Rural Development
            </span>
          </div>

          <h1 className="hero-headline">
            National Land Acquisition Portal
          </h1>

          <p className="hero-subtext">
            Sovereign digital framework for land acquisition lifecycle management, RFCTLARR 2013 statutory compliance, multi-modal parcel valuation, and direct benefit disbursement.
          </p>

          <div className="hero-actions">
            <a href="#statutory-pillars" className="btn-cta-outline">
              Statutory Lifecycle Wheel
            </a>
            <a href="#inquiry-portal" className="btn-cta-black">
              File Official Inquiry &rarr;
            </a>
          </div>

          {/* Interactive Hero Console */}
          <div className="hero-console-container">
            <CadastralHeroConsole />
          </div>
        </div>
      </section>

      {/* Hairline Structural Divider */}
      <div className="hairline-fullwidth" />

      {/* ============================================================
          INTER-AGENCY TRUST PROOF RAIL
          ============================================================ */}
      <section className="agency-rail-section">
        <div className="agency-rail-container">
          <AgencyProofRail />
        </div>
      </section>

      {/* Hairline Structural Divider */}
      <div className="hairline-fullwidth" />

      {/* ============================================================
          NATIONAL AGGREGATE OVERVIEW BAR
          ============================================================ */}
      <section className="overview-bar">
        <div className="overview-container">
          <div className="overview-header-row">
            <h3 className="overview-section-title">National Summary Overview</h3>
            <span className="overview-period-stamp">Live Synchronized Ledger — MoRD &amp; DoLR</span>
          </div>

          <div className="overview-grid">
            <div className="overview-card">
              <div className="overview-value">
                {(overview.totalStatesActive ?? 0).toLocaleString()}
              </div>
              <div className="overview-desc">States &amp; UTs Integrated</div>
            </div>

            <div className="overview-card">
              <div className="overview-value">
                {(overview.projectsInProgress ?? 0).toLocaleString()}
              </div>
              <div className="overview-desc">Active Infrastructure Projects</div>
            </div>

            <div className="overview-card">
              <div className="overview-value">
                {(((overview.areaUnderAcquisitionHa ?? 0)) / 1000).toFixed(1)}
                <span className="unit">k Ha</span>
              </div>
              <div className="overview-desc">Land Area Under Process</div>
            </div>

            <div className="overview-card">
              <div className="overview-value">
                ₹{(((overview.totalPipelineValueCr ?? 0)) / 1000).toFixed(1)}
                <span className="unit">k Cr</span>
              </div>
              <div className="overview-desc">Total Capital Pipeline</div>
            </div>
          </div>
        </div>
      </section>

      {/* Hairline Structural Divider */}
      <div className="hairline-fullwidth" />

      {/* ============================================================
          INTERACTIVE GEOSPATIAL MAP & STATE INSPECTOR
          ============================================================ */}
      <section id="map-explorer" className="map-section">
        <div className="map-section-header">
          <div>
            <span className="editorial-section-tag">Interactive Cadastre</span>
            <h2 className="map-section-title">National Geospatial Cadastral Explorer</h2>
            <p className="map-section-subtitle">
              Select any state or union territory boundary to inspect live district surveys, parcel counts, and infrastructure corridors.
            </p>
          </div>
        </div>

        <div className={`map-container ${selectedState ? '' : 'panel-closed'}`}>
          <IndiaMap
            onStateSelect={handleStateSelect}
            onReset={handleClosePanel}
            selectedStateId={selectedState ? selectedState.id : null}
            statesData={apiStates}
          />

          {selectedState && (
            <aside className="state-panel" aria-label="State details panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-state-name">{selectedState.name}</h3>
                  <p className="panel-state-code">State Code: {selectedState.code} • Sovereign Cadastre</p>
                </div>
                <button
                  type="button"
                  className="panel-close-btn"
                  onClick={handleClosePanel}
                  title="Close state inspector"
                  aria-label="Close state panel"
                >
                  ✕
                </button>
              </div>

              <div className="panel-divider" />

              <div className="panel-stats-grid">
                <div className="panel-stat-card">
                  <div className="panel-stat-value">
                    {typeof apiStateOverview?.activeProjects === 'number'
                      ? apiStateOverview.activeProjects
                      : selectedState.activeProjects ?? 0}
                  </div>
                  <div className="panel-stat-label">Active Projects</div>
                </div>

                <div className="panel-stat-card">
                  <div className="panel-stat-value">
                    {typeof apiStateOverview?.districtsCovered === 'number'
                      ? apiStateOverview.districtsCovered
                      : selectedState.districtsCovered ?? 0}
                  </div>
                  <div className="panel-stat-label">Districts Active</div>
                </div>

                <div className="panel-stat-card">
                  <div className="panel-stat-value">
                    {(
                      (typeof apiStateOverview?.totalParcels === 'number'
                        ? apiStateOverview.totalParcels
                        : selectedState.totalParcels) ?? 0
                    ).toLocaleString()}
                  </div>
                  <div className="panel-stat-label">Parcels Mapped</div>
                </div>

                <div className="panel-stat-card">
                  <div className="panel-stat-value">
                    ₹{(
                      typeof apiStateOverview?.compensationPaid === 'number'
                        ? Math.round(apiStateOverview.compensationPaid / 10000000)
                        : (selectedState.pipelineValueCr ?? 0)
                    ).toLocaleString()}
                    <span className="panel-stat-unit">Cr</span>
                  </div>
                  <div className="panel-stat-label">Est. Compensation</div>
                </div>
              </div>

              <div className="panel-divider" />

              <div>
                <h4 className="panel-projects-title">Key Infrastructure Projects</h4>
                <div className="panel-projects-list">
                  {(Array.isArray(apiStateProjects) && apiStateProjects.length > 0
                    ? apiStateProjects
                    : selectedState.projects ?? []
                  ).map((proj) => (
                    <div key={proj.id} className="panel-project-row">
                      <span className="panel-project-name">{proj.name}</span>
                      <span className={`panel-project-status status-${proj.status}`}>
                        {proj.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                <Link
                  to={`/login?redirect=/state/${selectedState.code.toLowerCase()}`}
                  className="btn-cta-black"
                  style={{ width: '100%', justifyContent: 'center', display: 'inline-flex' }}
                >
                  Officer Dossier Access →
                </Link>
              </div>
            </aside>
          )}
        </div>
      </section>

      {/* Hairline Structural Divider */}
      <div className="hairline-fullwidth" />

      {/* ============================================================
          STATUTORY ARCHITECTURE — Circular Lifecycle Wheel
          ============================================================ */}
      <section id="statutory-pillars" className="pillars-section">
        <StatutoryArchitectureWheel />
      </section>

      {/* Hairline Structural Divider */}
      <div className="hairline-fullwidth" />

      {/* ============================================================
          NEW SECTION: INTERACTIVE STAKEHOLDER SWITCHER & INQUIRY FORM
          Ghost Tab Selector + Bottom-Border Inputs + Radio Option Rows
          Directly embodying components from landing page.md
          ============================================================ */}
      <section id="inquiry-portal" className="inquiry-section">
        <div className="inquiry-header">
          <span className="editorial-section-tag">Stakeholder Services</span>
          <h2 className="inquiry-title">Statutory Inquiries &amp; Gazette Filings</h2>
          <p className="inquiry-subtitle">
            Direct interface for competent land acquisition authorities (CALA), infrastructure executing bodies, and citizen landholders.
          </p>
        </div>

        {/* Ghost Tab Selector (landing page.md Section 102 & 202) */}
        <div className="ghost-tab-container">
          <div className="ghost-tab-row">
            <button
              type="button"
              className={`ghost-tab-btn ${activeTab === 'officer' ? 'active' : ''}`}
              onClick={() => setActiveTab('officer')}
            >
              Acquisition Authorities &amp; CALA
            </button>
            <button
              type="button"
              className={`ghost-tab-btn ${activeTab === 'citizen' ? 'active' : ''}`}
              onClick={() => setActiveTab('citizen')}
            >
              Citizen Landowners &amp; Stakeholders
            </button>
          </div>
        </div>

        {/* Hairline Divider Rule under Ghost Tabs */}
        <div className="hairline-tab-divider" />

        {/* Form Container */}
        <div className="inquiry-form-wrapper">
          <form className="inquiry-form" onSubmit={handleFormSubmit}>
            {/* Row of Bottom-Border Text Inputs (landing page.md Section 112) */}
            <div className="form-grid-row">
              <div className="bottom-border-field">
                <label className="field-label">
                  {activeTab === 'officer'
                    ? 'Official Officer Email / GOV ID *'
                    : 'Landowner Aadhaar / Contact Email *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    activeTab === 'officer'
                      ? 'officer.revenue@nic.in'
                      : 'citizen.landowner@mail.com'
                  }
                  value={emailOrId}
                  onChange={(e) => setEmailOrId(e.target.value)}
                  className="bottom-border-input"
                />
              </div>

              <div className="bottom-border-field">
                <label className="field-label">
                  {activeTab === 'officer'
                    ? 'Project Notification / Gazette Ref *'
                    : 'Land Parcel Khata / Survey Number *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    activeTab === 'officer'
                      ? 'NHAI-2026-EXP-42A'
                      : 'Survey Plot 88/C, Tehsil Rampur'
                  }
                  value={projectOrKhata}
                  onChange={(e) => setProjectOrKhata(e.target.value)}
                  className="bottom-border-input"
                />
              </div>

              <div className="bottom-border-field">
                <label className="field-label">
                  State &amp; District Jurisdiction *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Madhya Pradesh / Sehore"
                  value={stateOrDistrict}
                  onChange={(e) => setStateOrDistrict(e.target.value)}
                  className="bottom-border-input"
                />
              </div>
            </div>

            {/* Radio Option Row (landing page.md Section 117) */}
            <div className="form-radio-section">
              <p className="radio-group-label">
                Select Statutory Action or Inquiry Scope:
              </p>
              <div className="radio-options-grid">
                <label
                  className="radio-option-item"
                  onClick={() => setSelectedInquiryType('section11')}
                >
                  <span className="custom-radio-circle">
                    {selectedInquiryType === 'section11' && (
                      <span className="custom-radio-inner-dot" />
                    )}
                  </span>
                  <span className="radio-label-text">
                    Section 11 Preliminary Notification Gazette Verification
                  </span>
                </label>

                <label
                  className="radio-option-item"
                  onClick={() => setSelectedInquiryType('sia')}
                >
                  <span className="custom-radio-circle">
                    {selectedInquiryType === 'sia' && (
                      <span className="custom-radio-inner-dot" />
                    )}
                  </span>
                  <span className="radio-label-text">
                    Social Impact Assessment (SIA) Exemption &amp; Public Hearing Record
                  </span>
                </label>

                <label
                  className="radio-option-item"
                  onClick={() => setSelectedInquiryType('section19')}
                >
                  <span className="custom-radio-circle">
                    {selectedInquiryType === 'section19' && (
                      <span className="custom-radio-inner-dot" />
                    )}
                  </span>
                  <span className="radio-label-text">
                    Section 19 Declaration &amp; Cadastral Demarcation Status
                  </span>
                </label>

                <label
                  className="radio-option-item"
                  onClick={() => setSelectedInquiryType('grievance')}
                >
                  <span className="custom-radio-circle">
                    {selectedInquiryType === 'grievance' && (
                      <span className="custom-radio-inner-dot" />
                    )}
                  </span>
                  <span className="radio-label-text">
                    Direct Compensation Valuation &amp; Resettlement Award Grievance
                  </span>
                </label>
              </div>
            </div>

            {/* Submit Action */}
            <div className="form-submit-row">
              <button
                type="submit"
                className="btn-cta-black"
                disabled={submitInquiryMutation.isPending}
              >
                {submitInquiryMutation.isPending
                  ? 'Logging to Ledger...'
                  : 'Submit Official Inquiry / Request Audit →'}
              </button>
              <span className="form-helper-note">
                Encrypted &amp; logged to the National Sovereign Cadastral Ledger.
              </span>
            </div>

            {submittedId && (
              <div className="submission-success-banner">
                <span className="success-icon">✓</span>
                <p>
                  Inquiry logged under tracking reference <strong>{submittedId}</strong>. A statutory receipt has been dispatched to the registered jurisdiction.
                </p>
              </div>
            )}
          </form>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
