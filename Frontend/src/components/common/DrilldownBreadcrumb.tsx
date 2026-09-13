import React from 'react';
import { Link } from 'react-router-dom';

export interface DrilldownBreadcrumbProps {
  state?: { id: string; name?: string };
  district?: { id: string; name?: string };
  project?: { id: string; name?: string; code?: string };
  parcel?: { id: string; ulpin?: string; surveyNumber?: string };
  currentLevel: 'national' | 'state' | 'district' | 'project' | 'parcel';
  className?: string;
}

export const DrilldownBreadcrumb: React.FC<DrilldownBreadcrumbProps> = ({
  state,
  district,
  project,
  parcel,
  currentLevel,
  className = '',
}) => {
  const stateLabel = state?.name || (state?.id ? `State (${state.id.toUpperCase()})` : 'State Jurisdiction');
  const districtLabel = district?.name || (district?.id ? `District (${district.id.charAt(0).toUpperCase() + district.id.slice(1)})` : 'District Collectorate');
  const projectLabel = project?.name || (project?.code ? `Project ${project.code}` : project?.id || 'Project Corridor');
  const parcelLabel = parcel?.ulpin || parcel?.surveyNumber || parcel?.id || 'Land Parcel Passport';

  const stateUrl = state?.id ? `/state-dashboard/${state.id}` : '/dashboard/state';
  const districtUrl = district?.id
    ? `/district-dashboard/${district.id}${state?.id ? `?stateId=${state.id}` : ''}`
    : '/dashboard/district';
  const projectUrl = project?.id
    ? `/projects/${project.id}?${new URLSearchParams({
        ...(state?.id ? { stateId: state.id } : {}),
        ...(district?.id ? { districtId: district.id } : {}),
      }).toString()}`
    : '/projects';
  return (
    <nav
      aria-label="Federal Cadastral Hierarchy Breadcrumb"
      className={`dash-breadcrumb-container ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        marginBottom: '20px',
        borderRadius: '10px',
        backgroundColor: '#ffffff',
        border: '1px solid var(--dash-hairline, #dfe3e8)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        fontSize: '13px',
        fontFamily: 'var(--dash-font-stack, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif)',
        flexWrap: 'wrap',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* National Level */}
        {currentLevel === 'national' ? (
          <span style={{ fontWeight: 700, color: 'var(--dash-ink, #303336)' }}>
            🏛 National Dashboard
          </span>
        ) : (
          <Link
            to="/national-dashboard"
            style={{
              color: 'var(--dash-signal-blue, #2576eb)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            National Dashboard
          </Link>
        )}

        {/* State Level */}
        {(state || currentLevel === 'state' || currentLevel === 'district' || currentLevel === 'project' || currentLevel === 'parcel') && (
          <>
            <span style={{ color: 'var(--dash-fog, #838b96)', userSelect: 'none' }}>›</span>
            {currentLevel === 'state' ? (
              <span style={{ fontWeight: 700, color: 'var(--dash-ink, #303336)' }}>
                {stateLabel}
              </span>
            ) : state?.id ? (
              <Link
                to={stateUrl}
                style={{
                  color: 'var(--dash-signal-blue, #2576eb)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                {stateLabel}
              </Link>
            ) : null}
          </>
        )}

        {/* District Level */}
        {(district || currentLevel === 'district' || currentLevel === 'project' || currentLevel === 'parcel') && (
          <>
            <span style={{ color: 'var(--dash-fog, #838b96)', userSelect: 'none' }}>›</span>
            {currentLevel === 'district' ? (
              <span style={{ fontWeight: 700, color: 'var(--dash-ink, #303336)' }}>
                {districtLabel}
              </span>
            ) : district?.id ? (
              <Link
                to={districtUrl}
                style={{
                  color: 'var(--dash-signal-blue, #2576eb)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                {districtLabel}
              </Link>
            ) : null}
          </>
        )}

        {/* Project Level */}
        {(project || currentLevel === 'project' || currentLevel === 'parcel') && (
          <>
            <span style={{ color: 'var(--dash-fog, #838b96)', userSelect: 'none' }}>›</span>
            {currentLevel === 'project' ? (
              <span style={{ fontWeight: 700, color: 'var(--dash-ink, #303336)' }}>
                {projectLabel}
              </span>
            ) : project?.id ? (
              <Link
                to={projectUrl}
                style={{
                  color: 'var(--dash-signal-blue, #2576eb)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                {projectLabel}
              </Link>
            ) : null}
          </>
        )}

        {/* Parcel Level */}
        {currentLevel === 'parcel' && (
          <>
            <span style={{ color: 'var(--dash-fog, #838b96)', userSelect: 'none' }}>›</span>
            <span style={{ fontWeight: 700, color: 'var(--dash-ink, #303336)' }}>
              {parcelLabel}
            </span>
          </>
        )}
      </div>

      {/* Scope Hierarchy Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: '#f1f5f9',
            color: 'var(--dash-ash, #55606e)',
          }}
        >
          Scope: {currentLevel.toUpperCase()}
        </span>
      </div>
    </nav>
  );
};

export default DrilldownBreadcrumb;
