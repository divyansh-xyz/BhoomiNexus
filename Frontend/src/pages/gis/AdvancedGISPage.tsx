import React, { useMemo } from 'react';
import { useParams, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AdvancedGISMap from '../../components/map/AdvancedGISMap';
import BhoomiLogo from '../../components/common/BhoomiLogo';
import type { GISScope, GISFilterState, ParcelPopupData } from '../../types/gisV2.types';

/**
 * AdvancedGISPage — shared page for all 4 GIS scopes.
 *
 * Scopes:
 *   - National: /dashboard/national/gis or /national-dashboard/gis
 *   - State:    /dashboard/state/gis or /state-dashboard/:stateId/gis
 *   - District: /dashboard/district/gis or /district-dashboard/:districtId/gis
 *   - Project:  /projects/:projectId/gis
 */

function resolveScopeFromPath(pathname: string): GISScope {
  if (pathname.includes('national')) return 'national';
  if (pathname.includes('state')) return 'state';
  if (pathname.includes('district')) return 'district';
  return 'project';
}

const SCOPE_META: Record<
  GISScope,
  { title: string; subtitle: string; ministry: string; backPath: string; backLabel: string }
> = {
  national: {
    title: 'National Geospatial Intelligence System',
    subtitle: 'Cross-state parcel monitoring and land acquisition surveillance',
    ministry: 'Ministry of Rural Development • DoLR',
    backPath: '/dashboard/national',
    backLabel: '← National Dashboard',
  },
  state: {
    title: 'State Geospatial Intelligence System',
    subtitle: 'Inter-district parcel monitoring and cadastral surveillance',
    ministry: 'State Revenue & Land Reforms Directorate',
    backPath: '/dashboard/state',
    backLabel: '← State Dashboard',
  },
  district: {
    title: 'District Geospatial Intelligence System',
    subtitle: 'Project-level parcel monitoring and ground-truth surveillance',
    ministry: 'Office of the District Collector & Magistrate',
    backPath: '/dashboard/district',
    backLabel: '← District Dashboard',
  },
  project: {
    title: 'Project Geospatial Intelligence System',
    subtitle: 'Parcel-level boundary and acquisition status mapping',
    ministry: 'Proponent Project GIS View',
    backPath: '/projects',
    backLabel: '← Projects',
  },
};

export const AdvancedGISPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { projectId, stateId: paramStateId, districtId: paramDistrictId } = useParams<{
    projectId?: string;
    stateId?: string;
    districtId?: string;
  }>();

  const stateId = paramStateId || searchParams.get('stateId') || undefined;
  const districtId = paramDistrictId || searchParams.get('districtId') || undefined;

  const scope = useMemo(() => resolveScopeFromPath(location.pathname), [location.pathname]);
  const meta = SCOPE_META[scope];

  const initialFilters: Partial<GISFilterState> = useMemo(() => {
    const init: Partial<GISFilterState> = {};
    if (scope === 'project' && projectId) {
      init.projectId = projectId;
    }
    if (stateId) {
      init.stateId = stateId;
    }
    if (districtId) {
      init.districtId = districtId;
    }
    return init;
  }, [scope, projectId, stateId, districtId]);

  const handleViewPassport = (_parcelId: string, parcelData: ParcelPopupData) => {
    navigate(
      `/parcels/${parcelData.ulpin || parcelData.parcelId}?stateId=${parcelData.state || 'MH'}&districtId=${parcelData.district || 'pune'}&projectId=${initialFilters.projectId || 'p-nhai-ringroad-2026'}`
    );
  };

  return (
    <div className="gis-v2-page-wrapper">
      {/* Page Header with Breadcrumb */}
      <div className="gis-v2-page-header">
        <div className="gis-v2-page-header-left">
          <button
            type="button"
            className="gis-v2-back-btn"
            onClick={() => navigate(meta.backPath)}
          >
            {meta.backLabel}
          </button>
          <div className="gis-v2-page-title-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BhoomiLogo size={18} strokeWidth={2.4} />
              <span className="gis-v2-ministry-label">{meta.ministry}</span>
            </div>
            <h1 className="gis-v2-page-title">{meta.title}</h1>
            <p className="gis-v2-page-subtitle">{meta.subtitle}</p>
          </div>
        </div>
      </div>

      {/* GIS Map */}
      <AdvancedGISMap
        scope={scope}
        initialFilters={initialFilters}
        onViewPassport={handleViewPassport}
      />
    </div>
  );
};

export default AdvancedGISPage;

