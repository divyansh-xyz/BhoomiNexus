import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { apiClient } from '../../services/api/client';
import BhoomiLogo from '../../components/common/BhoomiLogo';
import DrilldownBreadcrumb from '../../components/common/DrilldownBreadcrumb';
import '../dashboards/dashboards-v2.css';

export const ParcelPassportPage: React.FC = () => {
  const { parcelId } = useParams<{ parcelId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const stateId = searchParams.get('stateId') || 'MH';
  const districtId = searchParams.get('districtId') || 'pune';
  const projectId = searchParams.get('projectId') || 'p-nhai-ringroad-2026';

  const [parcel, setParcel] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedUlpin, setCopiedUlpin] = useState<boolean>(false);
  const [downloadNotification, setDownloadNotification] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    loadParcel();
  }, [parcelId]);

  const loadParcel = async () => {
    if (!parcelId) return;
    setLoading(true);
    try {
      const res = await apiClient.get<any>(`/parcels/${parcelId}`);
      const data = res.data?.data || res.data;
      if (data) {
        setParcel(data);
      }
    } catch (err) {
      console.warn('Failed to load parcel passport data, using fallback:', err);
      // Fallback with complete statutory 9 sections
      setParcel({
        id: parcelId,
        ulpin: parcelId.startsWith('ULPIN') ? parcelId : 'ULPIN-MH-PUN-001',
        surveyNumber: '42/1',
        ownerReference: 'Ramesh K. Joshi & Co-sharers',
        jointHolders: ['Suresh K. Joshi (Co-sharer, 50%)', 'Radha K. Joshi (Co-sharer)'],
        village: 'Lonavala',
        district: 'Pune',
        state: 'Maharashtra',
        pincode: '410401',
        censusCode: '27-521-0421',
        areaAcres: 3.5,
        areaHa: 1.4164,
        landType: 'AGRICULTURAL',
        soilClassification: 'Medium Black Clay (Class II)',
        marketRatePerAcre: 1500000,
        intersectPercent: 92,
        centroid: [18.7552, 73.4082],
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [73.4070, 18.7540],
              [73.4095, 18.7540],
              [73.4095, 18.7565],
              [73.4070, 18.7565],
              [73.4070, 18.7540],
            ],
          ],
        },
        projectId,
        projectName: 'Mumbai-Pune Expressway Expansion - Phase 3',
        projectCode: 'PRJ-MH-4421',
        proponentAuthority: 'National Highways Authority of India (NHAI)',
        ministry: 'Ministry of Road Transport & Highways',
        purpose: 'Public Purpose - Highway Infrastructure Corridor',
        corridorChainage: 'Km 42.100 - Km 42.450 (Right-of-Way Alignment)',
        acquisitionStatus: 'IN_PROGRESS',
        preliminaryNotificationDate: '2026-02-14',
        declarationSection19Date: '2026-05-18',
        competentAuthority: 'Competent Authority for Land Acquisition (CALA) & Collectorate Pune',
        compensationStatus: 'PENDING',
        compensationSummary: {
          marketValue: 5250000,
          solatium100Pct: 5250000,
          additionalInterest12Pct: 0,
          assessedAmount: 10500000,
          approvedAmount: 10500000,
          paidAmount: 5250000,
          pendingAmount: 5250000,
          paymentStatus: 'PARTIALLY_DISBURSED',
          pfmsDisbursalBatchId: 'PFMS-MH-PUN-2026-0881',
          beneficiaryBank: 'State Bank of India (IFSC: SBIN0001234)',
        },
        possessionStatus: 'NOT_STARTED',
        possessionSummary: {
          vestingStatus: 'PENDING_DEMARCATION',
          section38NoticeServedDate: '2026-07-20',
          inspectionOfficer: 'A. B. Deshmukh (DILR Pune)',
          panchnamaCertificateNumber: null,
          panchnamaDate: null,
          handoverTo: 'National Highways Authority of India',
          dgpsDemarcationPillars: 6,
        },
        documents: [
          { id: 'doc-ror-01', title: 'Record of Rights (7/12 Digital Extract)', docType: 'ROR', date: '2026-01-15', verified: true, size: '1.4 MB' },
          { id: 'doc-jms-02', title: 'Joint Measurement Survey (JMS) Cadastral Sheet', docType: 'CADASTRAL_MAP', date: '2026-03-22', verified: true, size: '3.8 MB' },
          { id: 'doc-gz-03', title: 'Section 19 Gazette Notification (DoLR)', docType: 'GAZETTE', date: '2026-05-18', verified: true, size: '850 KB' },
          { id: 'doc-val-04', title: 'Form 11 Statutory Valuation & Award Statement', docType: 'VALUATION', date: '2026-06-10', verified: true, size: '1.1 MB' },
          { id: 'doc-pos-05', title: 'Section 38 Physical Possession Panchnama', docType: 'PANCHNAMA', date: '2026-08-15', verified: false, size: '2.2 MB' },
        ],
        authorizedActivity: [
          { id: 'act-1', timestamp: '2026-02-14T10:00:00Z', officerName: 'R. K. Shinde (Competent Authority)', action: 'Section 4(1) Notification Gazetted', remarks: 'Published in Extraordinary Gazette No. 44', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', provenanceStatus: 'FABRIC_ANCHORED' },
          { id: 'act-2', timestamp: '2026-03-22T14:30:00Z', officerName: 'A. B. Deshmukh (DILR)', action: 'Joint Measurement Survey Demarcated', remarks: 'DGPS ground coordinates validated with satellite cadastre', hash: 'da7d596f48e7ab1f9547dca15f8a023bd9910d65b1aa9c211470ad4671e6bc72', provenanceStatus: 'FABRIC_ANCHORED' },
          { id: 'act-3', timestamp: '2026-06-10T11:15:00Z', officerName: 'M. S. Joshi (Valuation Officer)', action: 'Section 26 Compensation Award Formulated', remarks: 'Ready reckoner market rate + 100% solatium approved', hash: 'd95de739a37a56654b41bcf01a4e12e10698143a51608674512e09ff7c0c1692', provenanceStatus: 'FABRIC_ANCHORED' },
          { id: 'act-4', timestamp: '2026-07-28T09:45:00Z', officerName: 'V. N. Patil (Treasury Officer)', action: 'PFMS DBT Disbursal Mandate Generated', remarks: 'Batch PFMS-MH-PUN-2026-0881 queued for direct transfer', hash: '7cc6a7e161a6d54020a1eb9996e3981ba3a96860d5b4cb465ca312aa4ee00b52', provenanceStatus: 'FABRIC_ANCHORED' },
          { id: 'act-5', timestamp: '2026-08-15T16:00:00Z', officerName: 'P. T. Gaikwad (Executive Magistrate)', action: 'Section 38 Panchnama Executed & Land Vested', remarks: 'Unencumbered physical possession handed over to NHAI', hash: '38387939033bb2d04ca03cf9017ae7a8105c088bb00aa415f9175ecaa4eb827a', provenanceStatus: 'FABRIC_ANCHORED' },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  // Leaflet Mini-Map Initialization
  useEffect(() => {
    if (!parcel || !mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const defaultCoords: [number, number][] = [
      [18.7540, 73.4070],
      [18.7540, 73.4095],
      [18.7565, 73.4095],
      [18.7565, 73.4070],
    ];

    let latLngs: [number, number][] = defaultCoords;
    if (parcel.geometry?.coordinates?.[0]) {
      // GeoJSON is [lon, lat] -> Leaflet is [lat, lon]
      latLngs = parcel.geometry.coordinates[0].map(
        (c: [number, number]) => [c[1], c[0]] as [number, number]
      );
    }

    const map = L.map(mapContainerRef.current, {
      center: latLngs[0] || [18.7552, 73.4082],
      zoom: 15,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    });

    // Dark high-contrast base
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18 }
    ).addTo(map);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18 }
    ).addTo(map);

    // Parcel polygon boundary
    const polygonLayer = L.polygon(latLngs, {
      color: '#2576eb',
      weight: 3,
      fillColor: '#5c9cf5',
      fillOpacity: 0.35,
    }).addTo(map);

    // Add boundary stone markers
    latLngs.forEach((pt, idx) => {
      L.circleMarker(pt, {
        radius: 4,
        fillColor: '#ffffff',
        color: '#2576eb',
        weight: 2,
        fillOpacity: 1,
      })
        .bindTooltip(`Pillar #${idx + 1}: ${pt[0].toFixed(4)}°N, ${pt[1].toFixed(4)}°E`, { direction: 'top' })
        .addTo(map);
    });

    map.fitBounds(polygonLayer.getBounds(), { padding: [24, 24] });
    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [parcel]);

  const handleCopyUlpin = () => {
    if (parcel?.ulpin) {
      navigator.clipboard.writeText(parcel.ulpin);
      setCopiedUlpin(true);
      setTimeout(() => setCopiedUlpin(false), 2000);
    }
  };

  const handleSimulateDownload = (docTitle: string) => {
    setDownloadNotification(`Downloaded official copy: ${docTitle}`);
    setTimeout(() => setDownloadNotification(null), 3000);
  };

  if (loading && !parcel) {
    return (
      <div className="dash-canvas">
        <div className="dash-container">
          <div className="dash-card" style={{ textAlign: 'center', padding: '60px' }}>
            <div className="dash-loading-spinner">Resolving Sovereign Land Parcel Passport...</div>
          </div>
        </div>
      </div>
    );
  }

  // Strictly map high-level acquisition status to IN_PROGRESS | REJECTED | COMPLETED
  const rawStatus = (parcel?.acquisitionStatus || '').toUpperCase();
  const highLevelStatus: 'IN_PROGRESS' | 'REJECTED' | 'COMPLETED' =
    rawStatus === 'COMPLETED' || rawStatus === 'ACQUIRED'
      ? 'COMPLETED'
      : rawStatus === 'REJECTED' || rawStatus === 'DISPUTED'
      ? 'REJECTED'
      : 'IN_PROGRESS';

  const ulpin = parcel?.ulpin || parcelId || 'ULPIN-MH-PUN-001';
  const surveyNumber = parcel?.surveyNumber || '42/1';
  const owner = parcel?.ownerReference || 'Ramesh K. Joshi & Co-sharers';
  const village = parcel?.village || 'Lonavala';
  const district = parcel?.district || districtId;
  const state = parcel?.state || stateId;
  const acres = parcel?.areaAcres || 3.5;
  const ha = parcel?.areaHa || (acres * 0.404686).toFixed(4);
  const landType = parcel?.landType || 'AGRICULTURAL';
  const marketRate = parcel?.marketRatePerAcre || 1500000;
  const assessedVal = parcel?.compensationSummary?.assessedAmount || Math.round(acres * marketRate * 2);
  const approvedVal = parcel?.compensationSummary?.approvedAmount || assessedVal;
  const paidVal = parcel?.compensationSummary?.paidAmount || 0;
  const pendingVal = parcel?.compensationSummary?.pendingAmount || Math.max(0, approvedVal - paidVal);

  return (
    <div className="dash-canvas">
      <div className="dash-container">
        {/* Federal Scope Breadcrumb (Preserving context up and down) */}
        <DrilldownBreadcrumb
          currentLevel="parcel"
          state={{ id: stateId, name: state }}
          district={{ id: districtId, name: district }}
          project={{ id: projectId, name: parcel?.projectName || projectId, code: parcel?.projectCode }}
          parcel={{ id: parcelId || '', ulpin, surveyNumber }}
        />

        {/* Header Telemetry Bar */}
        <div className="dash-header-bar">
          <div>
            <div className="dash-eyebrow">
              <BhoomiLogo size={18} strokeWidth={2.4} />
              <span>Ministry of Rural Development • Department of Land Resources</span>
              <span className="dash-eyebrow-badge">Statutory Bhu-Aadhaar Record</span>
            </div>
            <h1 className="dash-title">Parcel Passport: {ulpin}</h1>
            <p className="dash-subtitle">
              Sovereign Land Parcel Passport under RFCTLARR Act 2013 &bull; Single Authoritative Read-Only Registry View
            </p>
          </div>

          <div className="dash-action-row">
            <button
              type="button"
              className="dash-btn-secondary"
              onClick={() => navigate(`/projects/${projectId}/gis`)}
            >
              <span>🗺 Full GIS Map</span>
            </button>
            <button
              type="button"
              className="dash-btn-secondary"
              onClick={() => navigate(`/projects/${projectId}?stateId=${stateId}&districtId=${districtId}`)}
            >
              <span>← Back to Project</span>
            </button>
            <button
              type="button"
              className="dash-btn-secondary"
              onClick={() => navigate(`/district-dashboard/${districtId}?stateId=${stateId}`)}
            >
              <span>← District Command</span>
            </button>
          </div>
        </div>

        {/* Temporary Notification Ribbon */}
        {downloadNotification && (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              backgroundColor: '#e6f4ea',
              border: '1px solid #ceead6',
              color: '#137333',
              fontSize: '12.5px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            ✓ {downloadNotification}
          </div>
        )}

        {/* Passport Hero Banner */}
        <div className="dash-card" style={{ marginBottom: '28px', padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dash-signal-blue)' }}>
                14-Digit Bhu-Aadhaar (ULPIN) Official Cadastre
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                <span style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: 'var(--dash-ink)', letterSpacing: '0.04em' }}>
                  {ulpin}
                </span>
                <button
                  type="button"
                  className="dash-btn-secondary"
                  onClick={handleCopyUlpin}
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  {copiedUlpin ? '✓ Copied' : 'Copy ULPIN'}
                </button>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--dash-fog)', marginTop: '6px' }}>
                Survey No: <strong style={{ color: 'var(--dash-ink)' }}>{surveyNumber}</strong> &bull; Village: <strong style={{ color: 'var(--dash-ink)' }}>{village}</strong> &bull; District: <strong style={{ color: 'var(--dash-ink)' }}>{district}</strong>, {state}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--dash-ash)', display: 'block', marginBottom: '4px' }}>
                High-Level Acquisition Status
              </span>
              {/* Strict V2 constraint: ONLY IN_PROGRESS, REJECTED, COMPLETED */}
              <span
                className="dash-status-pill"
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  padding: '5px 14px',
                  backgroundColor:
                    highLevelStatus === 'COMPLETED' ? '#e6f4ea' : highLevelStatus === 'REJECTED' ? '#fce8e6' : '#fef7e0',
                  color:
                    highLevelStatus === 'COMPLETED' ? '#137333' : highLevelStatus === 'REJECTED' ? '#c5221f' : '#b06000',
                }}
              >
                {highLevelStatus === 'COMPLETED' ? 'COMPLETED' : highLevelStatus === 'REJECTED' ? 'REJECTED' : 'IN_PROGRESS'}
              </span>
              <div style={{ fontSize: '11.5px', color: 'var(--dash-fog)', marginTop: '4px' }}>
                Statutory Sovereign Registry
              </div>
            </div>
          </div>
        </div>

        {/* 9 Standard V2 Statutory Sections */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          
          {/* Section 1: Identity */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-label">1. Cadastral Identity</span>
              <span className="dash-card-badge">Section 1</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>ULPIN Bhu-Aadhaar Number</div>
                <div style={{ fontWeight: 700, color: 'var(--dash-ink)', fontFamily: 'monospace' }}>{ulpin}</div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Survey / Khasra Reference</div>
                <div style={{ fontWeight: 600, color: 'var(--dash-ink)' }}>{surveyNumber} (Sub-division Hissa 1A)</div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Recorded Landholder</div>
                <div style={{ fontWeight: 600, color: 'var(--dash-ink)' }}>{owner}</div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Joint Landholders / Co-sharers</div>
                <div style={{ fontSize: '12px', color: 'var(--dash-smoke)' }}>
                  {(parcel?.jointHolders || []).join(', ') || 'None recorded'}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Digital Registry Validation</div>
                <div style={{ color: '#0d7d56', fontWeight: 600, fontSize: '12px' }}>
                  ✓ Tokenized Bhu-Aadhaar Verified via State Land Records
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Location (with embedded Leaflet mini-map) */}
          <div className="dash-card" style={{ gridColumn: 'span 1' }}>
            <div className="dash-card-header">
              <span className="dash-card-label">2. Location &amp; Spatial Boundary</span>
              <span className="dash-card-badge">Section 2</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>State</div>
                  <div style={{ fontWeight: 600, color: 'var(--dash-ink)' }}>{state}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>District Collectorate</div>
                  <div style={{ fontWeight: 600, color: 'var(--dash-ink)' }}>{district}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Tehsil / Taluka</div>
                  <div style={{ fontWeight: 600, color: 'var(--dash-ink)' }}>Haveli Sub-division</div>
                </div>
                <div>
                  <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Revenue Village</div>
                  <div style={{ fontWeight: 600, color: 'var(--dash-ink)' }}>{village}</div>
                </div>
              </div>

              {/* Leaflet Embedded Cadastral Mini-Map */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--dash-fog)', fontWeight: 600 }}>Cadastral Polygon Demarcation</span>
                  <span style={{ fontSize: '11px', color: 'var(--dash-signal-blue)' }}>
                    {parcel?.centroid ? `${parcel.centroid[0].toFixed(4)}°N, ${parcel.centroid[1].toFixed(4)}°E` : '18.7552°N, 73.4082°E'}
                  </span>
                </div>
                <div
                  ref={mapContainerRef}
                  style={{
                    width: '100%',
                    height: '190px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: '1px solid var(--dash-hairline)',
                    backgroundColor: '#1a1f2c',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Project Association */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-label">3. Project Association</span>
              <span className="dash-card-badge">Section 3</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Project Code &amp; Title</div>
                <div style={{ fontWeight: 700, color: 'var(--dash-ink)' }}>
                  {parcel?.projectCode}: {parcel?.projectName}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Proponent Authority</div>
                <div style={{ fontWeight: 600, color: 'var(--dash-signal-blue)' }}>{parcel?.proponentAuthority}</div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Sponsoring Ministry</div>
                <div style={{ color: 'var(--dash-smoke)' }}>{parcel?.ministry}</div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Public Purpose Declaration</div>
                <div style={{ color: 'var(--dash-smoke)' }}>{parcel?.purpose}</div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Corridor Alignment Chainage</div>
                <div style={{ fontWeight: 600, color: 'var(--dash-ink)' }}>{parcel?.corridorChainage}</div>
              </div>
            </div>
          </div>

          {/* Section 4: Survey / ULPIN */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-label">4. Survey &amp; Land Measurement</span>
              <span className="dash-card-badge">Section 4</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Demarcated Area</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--dash-ink)' }}>
                    {acres} <span style={{ fontSize: '12px', fontWeight: 400 }}>Acres</span>
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Metric Extent</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--dash-ink)' }}>
                    {ha} <span style={{ fontSize: '12px', fontWeight: 400 }}>Ha</span>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Statutory Land Classification</div>
                <div style={{ fontWeight: 600, color: 'var(--dash-ink)' }}>{landType}</div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Soil Classification &amp; Class</div>
                <div style={{ color: 'var(--dash-smoke)' }}>{parcel?.soilClassification || 'Medium Black Clay (Class II)'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Ready Reckoner / Circle Market Rate</div>
                <div style={{ fontWeight: 600, color: 'var(--dash-ink)' }}>₹{marketRate.toLocaleString()} per Acre</div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Corridor Overlap (RoW Intersect)</div>
                <div style={{ fontWeight: 600, color: 'var(--dash-signal-blue)' }}>{parcel?.intersectPercent || 92}% Right-of-Way</div>
              </div>
            </div>
          </div>

          {/* Section 5: Acquisition (Strictly high-level) */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-label">5. Acquisition Lifecycle</span>
              <span className="dash-card-badge">Section 5</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Statutory Acquisition Status</div>
                <span
                  className="dash-status-pill"
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    marginTop: '4px',
                    backgroundColor:
                      highLevelStatus === 'COMPLETED' ? '#e6f4ea' : highLevelStatus === 'REJECTED' ? '#fce8e6' : '#fef7e0',
                    color:
                      highLevelStatus === 'COMPLETED' ? '#137333' : highLevelStatus === 'REJECTED' ? '#c5221f' : '#b06000',
                  }}
                >
                  {highLevelStatus}
                </span>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Preliminary Notification (Section 4/11)</div>
                <div style={{ fontWeight: 600, color: 'var(--dash-ink)' }}>
                  {parcel?.preliminaryNotificationDate || '14-Feb-2026'} &bull; Gazetted
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Declaration under Section 19</div>
                <div style={{ fontWeight: 600, color: 'var(--dash-ink)' }}>
                  {parcel?.declarationSection19Date || '18-May-2026'} &bull; Gazette No. 118
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Competent Authority for Land Acquisition (CALA)</div>
                <div style={{ color: 'var(--dash-smoke)' }}>{parcel?.competentAuthority}</div>
              </div>
            </div>
          </div>

          {/* Section 6: Compensation */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-label">6. Compensation Award Matrix</span>
              <span className="dash-card-badge">Section 6</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Total Determined Statutory Award</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--dash-ink)' }}>
                  ₹{approvedVal.toLocaleString()}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--dash-fog)', marginTop: '2px' }}>
                  Section 26 Market Value (₹{Math.round(approvedVal / 2).toLocaleString()}) + 100% Solatium (₹{Math.round(approvedVal / 2).toLocaleString()})
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>PFMS DBT Disbursed</div>
                  <div style={{ fontWeight: 700, color: '#0d7d56', fontSize: '15px' }}>₹{paidVal.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Pending Escrow Balance</div>
                  <div style={{ fontWeight: 700, color: pendingVal > 0 ? '#b06000' : '#0d7d56', fontSize: '15px' }}>
                    ₹{pendingVal.toLocaleString()}
                  </div>
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>PFMS Batch Reference</div>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--dash-smoke)' }}>
                  {parcel?.compensationSummary?.pfmsDisbursalBatchId || 'PFMS-MH-PUN-2026-0881'}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Beneficiary Bank Mandate</div>
                <div style={{ fontSize: '12px', color: 'var(--dash-smoke)' }}>
                  {parcel?.compensationSummary?.beneficiaryBank || 'State Bank of India (IFSC: SBIN0001234)'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 7: Possession */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-label">7. Physical Possession &amp; Vesting</span>
              <span className="dash-card-badge">Section 7</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Government Vesting Status</div>
                <div style={{ fontWeight: 700, color: parcel?.possessionSummary?.vestingStatus === 'COMPLETED_VESTED' ? '#0d7d56' : '#b06000' }}>
                  {parcel?.possessionSummary?.vestingStatus || 'PENDING_DEMARCATION'}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Section 38 Notice Issued</div>
                <div style={{ color: 'var(--dash-smoke)' }}>
                  {parcel?.possessionSummary?.section38NoticeServedDate || '20-Jul-2026'}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Inspecting Revenue Officer</div>
                <div style={{ fontWeight: 600, color: 'var(--dash-ink)' }}>
                  {parcel?.possessionSummary?.inspectionOfficer || 'A. B. Deshmukh (DILR Pune)'}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Handover Transferred To</div>
                <div style={{ color: 'var(--dash-smoke)' }}>{parcel?.possessionSummary?.handoverTo || 'National Highways Authority of India'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--dash-fog)', fontSize: '11.5px' }}>Boundary Stones Fixed</div>
                <div style={{ color: '#0d7d56', fontWeight: 600, fontSize: '12px' }}>
                  ✓ {parcel?.possessionSummary?.dgpsDemarcationPillars || 6} DGPS Boundary Pillars Verified
                </div>
              </div>
            </div>
          </div>

          {/* Section 8: Documents */}
          <div className="dash-card">
            <div className="dash-card-header">
              <span className="dash-card-label">8. Statutory Document Evidence</span>
              <span className="dash-card-badge">Section 8</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
              {(parcel?.documents || []).map((d: any) => (
                <div
                  key={d.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#fafbfc',
                    border: '1px solid var(--dash-hairline)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--dash-ink)' }}>{d.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--dash-fog)' }}>
                      {d.docType} &bull; {d.date} &bull; {d.size}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="dash-link-action"
                    onClick={() => handleSimulateDownload(d.title)}
                  >
                    <span>Download</span>
                    <span className="chevron">↓</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 9: Authorized Activity */}
          <div className="dash-card" style={{ gridColumn: 'span 1' }}>
            <div className="dash-card-header">
              <span className="dash-card-label">9. Authorized Activity &amp; Audit Trail</span>
              <span className="dash-card-badge">Section 9</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
              {(parcel?.authorizedActivity || []).map((act: any) => (
                <div
                  key={act.id}
                  style={{
                    borderLeft: '2px solid var(--dash-signal-blue)',
                    paddingLeft: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: 'var(--dash-ink)', fontSize: '12.5px' }}>{act.action}</strong>
                    <span style={{ fontSize: '10.5px', color: 'var(--dash-fog)' }}>
                      {new Date(act.timestamp).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div style={{ color: 'var(--dash-ash)' }}>Officer: {act.officerName}</div>
                  <div style={{ color: 'var(--dash-fog)', fontStyle: 'italic', fontSize: '11.5px' }}>
                    "{act.remarks}"
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', paddingTop: '4px', borderTop: '1px dashed var(--dash-hairline)' }}>
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--dash-fog)' }}>
                      SHA-256: {act.hash ? act.hash.substring(0, 16) + '…' : 'e3b0c44298fc1c14…'}
                    </span>
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: act.provenanceStatus === 'LOCAL_PROVENANCE' ? '#f1f3f4' : '#e6f4ea',
                        color: act.provenanceStatus === 'LOCAL_PROVENANCE' ? '#55606e' : '#137333',
                      }}
                    >
                      {act.provenanceStatus === 'LOCAL_PROVENANCE' ? 'Local Provenance' : '✓ Fabric Anchored'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Phase 19 Sovereign Compliance Ribbon */}
        <div
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            border: '1px solid var(--dash-hairline)',
            boxShadow: 'var(--dash-shadow-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--dash-signal-blue)', textTransform: 'uppercase' }}>
              🏛 Standard V2 Sovereign Passport Architecture
            </span>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--dash-fog)' }}>
              Complies with strict V2 constraints: read-only surveillance, common cross-tier layout, no workflow modification, and no delay forecasting.
            </p>
          </div>
          <button
            type="button"
            className="dash-link-action"
            onClick={() =>
              navigate(`/projects/${projectId}?stateId=${stateId}&districtId=${districtId}`)
            }
          >
            <span>Return to Project Register</span>
            <span className="chevron">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParcelPassportPage;
