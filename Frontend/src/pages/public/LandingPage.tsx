import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import IndiaMap from '../../components/map/IndiaMap';
import {
  nationalOverview,
  type StateData,
} from '../../data/india-states';

export const LandingPage: React.FC = () => {
  const [selectedState, setSelectedState] = useState<StateData | null>(null);

  const handleStateSelect = (state: StateData) => {
    setSelectedState(state);
  };

  const handleClosePanel = () => {
    setSelectedState(null);
  };

  return (
    <div className="landing-root">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-eyebrow">
          <span className="badge-green">LIVE</span>
          <span className="badge-blue">GIS REGISTRY</span>
        </div>

        <h1 className="hero-headline">
          National Land Acquisition & Management System
        </h1>

        <p className="hero-subtext">
          Unified spatial intelligence platform tracking land acquisitions, parcel surveys,
          and infrastructure rehabilitation across all Indian states in real time.
        </p>

        <div className="hero-actions">
          <Link to="/login" className="btn-primary">
            Access Officer Portal →
          </Link>
          <a href="#map-explorer" className="btn-outlined">
            Explore National Map
          </a>
        </div>
      </section>

      {/* National Aggregate Overview */}
      <section className="overview-bar">
        <p className="overview-label">National Summary Overview</p>
        <div className="overview-grid">
          <div className="overview-card">
            <div className="overview-value">
              {nationalOverview.totalStatesActive}
            </div>
            <div className="overview-desc">States & UTs Integrated</div>
          </div>

          <div className="overview-card">
            <div className="overview-value">
              {nationalOverview.projectsInProgress}
            </div>
            <div className="overview-desc">Active Infrastructure Projects</div>
          </div>

          <div className="overview-card">
            <div className="overview-value">
              {(nationalOverview.areaUnderAcquisitionHa / 1000).toFixed(1)}
              <span className="unit">k Ha</span>
            </div>
            <div className="overview-desc">Land Area Under Process</div>
          </div>

          <div className="overview-card">
            <div className="overview-value">
              ₹{(nationalOverview.totalPipelineValueCr / 1000).toFixed(1)}
              <span className="unit">k Cr</span>
            </div>
            <div className="overview-desc">Total Capital Pipeline</div>
          </div>
        </div>
      </section>

      {/* Interactive Map & State Inspector Section */}
      <section id="map-explorer" className="map-section">
        <div className="map-section-header">
          <div>
            <h2 className="map-section-title">Interactive Geospatial Cadastral Map</h2>
            <p className="map-section-subtitle">
              Select any state boundary to drill down into district surveys, parcel counts, and live project corridors.
            </p>
          </div>
        </div>

        <div className={`map-container ${selectedState ? '' : 'panel-closed'}`}>
          <IndiaMap
            onStateSelect={handleStateSelect}
            selectedStateId={selectedState ? selectedState.id : null}
          />

          {selectedState && (
            <aside className="state-panel" aria-label="State details panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-state-name">{selectedState.name}</h3>
                  <p className="panel-state-code">State Code: {selectedState.code}</p>
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
                  <div className="panel-stat-value">{selectedState.activeProjects}</div>
                  <div className="panel-stat-label">Active Projects</div>
                </div>

                <div className="panel-stat-card">
                  <div className="panel-stat-value">{selectedState.districtsCovered}</div>
                  <div className="panel-stat-label">Districts Active</div>
                </div>

                <div className="panel-stat-card">
                  <div className="panel-stat-value">
                    {selectedState.totalParcels.toLocaleString()}
                  </div>
                  <div className="panel-stat-label">Parcels Mapped</div>
                </div>

                <div className="panel-stat-card">
                  <div className="panel-stat-value">
                    ₹{selectedState.pipelineValueCr.toLocaleString()}
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-ash)', marginLeft: '4px' }}>
                      Cr
                    </span>
                  </div>
                  <div className="panel-stat-label">Est. Compensation</div>
                </div>
              </div>

              <div className="panel-divider" />

              <div>
                <h4 className="panel-projects-title">Key Infrastructure Projects</h4>
                <div style={{ marginTop: '12px' }}>
                  {selectedState.projects.map((proj) => (
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
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Officer Dossier Access →
                </Link>
              </div>
            </aside>
          )}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
