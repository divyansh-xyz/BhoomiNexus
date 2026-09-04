import React, { useState } from 'react';

interface CorridorRow {
  id: string;
  surveyNumber: string;
  color: string;
  parcels: number;
  timeOrVal: string;
  name: string;
}

const CORRIDORS: CorridorRow[] = [
  { id: '1', surveyNumber: 'Plot 42-A', color: '#00b4d8', parcels: 4, timeOrVal: '₹14.20 Cr', name: 'Expressway Spur Alignment' },
  { id: '2', surveyNumber: 'Plot 88-C', color: '#ef4444', parcels: 3, timeOrVal: '₹13.15 Cr', name: 'Canal Realignment Corridor' },
  { id: '3', surveyNumber: 'Plot 104-E', color: '#f59e0b', parcels: 4, timeOrVal: '₹12.55 Cr', name: 'Substation Buffer Zone' },
];

export const CadastralHeroConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'location' | 'notices' | 'surveys' | 'valuation'>('valuation');
  const [selectedCorridor, setSelectedCorridor] = useState<string>('1');

  return (
    <div className="console-wrapper">
      {/* Outer ambient glow chassis */}
      <div className="console-chassis">
        {/* Neon corner accents mirroring the reference image */}
        <div className="console-corner-glow-top-right" />
        <div className="console-corner-glow-bottom-left" />

        <div className="console-screen">
          {/* Vector Cadastral Map Canvas */}
          <svg
            className="cadastral-svg-canvas"
            viewBox="0 0 920 520"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="waterwayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#dcebf5" />
                <stop offset="100%" stopColor="#c5dde9" />
              </linearGradient>

              <radialGradient id="parcelGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fecaca" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#fca5a5" stopOpacity="0.5" />
              </radialGradient>
            </defs>

            {/* Base land architectural parchment */}
            <rect width="920" height="520" fill="#f6f0ee" />

            {/* Waterway / River basin */}
            <path
              d="M 330 0 C 340 140, 310 260, 370 380 C 400 440, 390 490, 380 520 L 260 520 C 280 430, 270 320, 240 200 C 220 120, 210 50, 200 0 Z"
              fill="url(#waterwayGrad)"
              stroke="#b5d1e6"
              strokeWidth="1"
            />
            {/* Waterway dock lines */}
            <path d="M 230 110 L 245 115 M 240 180 L 258 184 M 270 310 L 290 312" stroke="#93b7d1" strokeWidth="1.5" />

            {/* Secondary urban / cadastral street grid */}
            <g stroke="#e2d8d5" strokeWidth="1.2">
              <path d="M 350 70 L 920 60" />
              <path d="M 360 130 L 920 115" />
              <path d="M 370 190 L 920 180" />
              <path d="M 380 250 L 920 240" />
              <path d="M 400 310 L 920 300" />
              <path d="M 410 370 L 920 365" />
              <path d="M 420 430 L 920 430" />

              <path d="M 450 0 L 410 520" />
              <path d="M 520 0 L 490 520" />
              <path d="M 590 0 L 570 520" />
              <path d="M 670 0 L 650 520" />
              <path d="M 750 0 L 730 520" />
              <path d="M 830 0 L 820 520" />
            </g>

            {/* Major Arterial / Rail Lines */}
            <g stroke="#1a1e24" strokeWidth="2.2" strokeLinecap="round">
              <path d="M 340 90 Q 550 160 920 130" />
              <path d="M 480 0 Q 570 280 620 520" />
              <path d="M 720 0 Q 750 310 920 480" />
              <path d="M 380 340 C 480 360, 680 440, 880 390" />
            </g>

            {/* Cadastral Acquisition Parcel Zones (Red / Coral shaded RFCTLARR blocks) */}
            {/* Parcel Zone 1 (Upper) */}
            <polygon
              points="455,100 500,105 490,140 450,135"
              fill="url(#parcelGlow)"
              stroke="#ef4444"
              strokeWidth="1.2"
              strokeDasharray="3 2"
            />
            <circle cx="475" cy="120" r="2.5" fill="#ffffff" />

            {/* Parcel Zone 2 (Center large) */}
            <polygon
              points="515,220 595,225 580,300 510,290"
              fill="url(#parcelGlow)"
              stroke="#ef4444"
              strokeWidth="1.2"
              strokeDasharray="4 2"
            />
            <circle cx="550" cy="260" r="3" fill="#ffffff" />

            {/* Parcel Zone 3 (Right triangular) */}
            <polygon
              points="675,150 740,165 720,215 660,195"
              fill="url(#parcelGlow)"
              stroke="#ef4444"
              strokeWidth="1.2"
            />
            <circle cx="700" cy="180" r="2.5" fill="#ffffff" />

            {/* Parcel Zone 4 (Lower Right) */}
            <polygon
              points="660,280 705,295 680,335 645,315"
              fill="url(#parcelGlow)"
              stroke="#ef4444"
              strokeWidth="1"
            />
            <circle cx="680" cy="305" r="2.5" fill="#ffffff" />

            {/* Parcel Zone 5 (Small badge parcels) */}
            <polygon points="740,310 765,325 750,345 730,330" fill="url(#parcelGlow)" stroke="#ef4444" strokeWidth="1" />
            <polygon points="615,295 635,305 625,320 608,312" fill="url(#parcelGlow)" stroke="#ef4444" strokeWidth="1" />
            <polygon points="700,75 720,82 710,95 695,88" fill="url(#parcelGlow)" stroke="#ef4444" strokeWidth="1" />

            {/* Survey Alignment Route Corridors */}
            {/* Route 1: Signal Blue alignment */}
            <path
              d="M 500,190 L 515,120 M 515,120 C 530,125 560,130 585,135 C 600,140 605,155 605,170"
              stroke="#0058fe"
              strokeWidth={selectedCorridor === '1' ? '4.5' : '3.2'}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Route 2: Red / Coral alignment loop */}
            <path
              d="M 590,160 C 605,170 608,210 590,220 C 570,230 635,225 615,175"
              stroke="#ef4444"
              strokeWidth={selectedCorridor === '2' ? '4.5' : '3'}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Route 3: Amber / Gold corridor */}
            <path
              d="M 605,135 C 625,130 660,130 700,150 C 715,160 740,150 745,170"
              stroke="#d97706"
              strokeWidth={selectedCorridor === '3' ? '4.5' : '3.2'}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Waypoint Badges on the Map */}
            {/* Waypoint 1 (Blue) */}
            <g transform="translate(515, 120)">
              <circle cx="0" cy="0" r="11" fill="#ffffff" stroke="#0058fe" strokeWidth="2" />
              <text x="0" y="4" fill="#000000" fontSize="10" fontWeight="bold" textAnchor="middle">1</text>
            </g>

            {/* Waypoint 1 (Amber) */}
            <g transform="translate(735, 145)">
              <circle cx="0" cy="0" r="11" fill="#ffffff" stroke="#d97706" strokeWidth="2" />
              <text x="0" y="4" fill="#000000" fontSize="10" fontWeight="bold" textAnchor="middle">1</text>
            </g>

            {/* Floating Cadastral Vehicle / Survey GPS Pin */}
            <g transform="translate(585, 115)">
              <circle cx="0" cy="0" r="20" fill="#0058fe" opacity="0.18" />
              <circle cx="0" cy="0" r="14" fill="#0058fe" stroke="#ffffff" strokeWidth="2" />
              {/* Cadastral surveying / parcel truck symbol */}
              <path
                d="M -7 -4 L -3 -4 L 0 -1 L 5 -1 L 5 4 L -7 4 Z M -5 4 A 2 2 0 0 0 -1 4 M 1 4 A 2 2 0 0 0 5 4"
                stroke="#ffffff"
                strokeWidth="1.6"
                fill="none"
              />
            </g>

            {/* Notice / Warning Icon Badges */}
            <g transform="translate(710, 85)">
              <circle cx="0" cy="0" r="8" fill="#991b1b" />
              <path d="M -4 0 L 4 0" stroke="#ffffff" strokeWidth="1.5" />
            </g>

            <g transform="translate(635, 305)">
              <circle cx="0" cy="0" r="8" fill="#991b1b" />
              <path d="M -4 0 L 4 0" stroke="#ffffff" strokeWidth="1.5" />
            </g>

            <g transform="translate(750, 330)">
              <circle cx="0" cy="0" r="8" fill="#991b1b" />
              <path d="M -4 0 L 4 0" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          </svg>

          {/* Floating Left Instrument Panel (Cadastral Dispatch) */}
          <aside className="console-instrument-card">
            <div className="instrument-header">
              <h3 className="instrument-title">Cadastral Dispatch</h3>
            </div>

            {/* Tabs matching reference */}
            <div className="instrument-tabs">
              <button
                type="button"
                className={`instrument-tab ${activeTab === 'location' ? 'active' : ''}`}
                onClick={() => setActiveTab('location')}
              >
                1. Location
              </button>
              <button
                type="button"
                className={`instrument-tab ${activeTab === 'notices' ? 'active' : ''}`}
                onClick={() => setActiveTab('notices')}
              >
                2. §11 Notice
              </button>
              <button
                type="button"
                className={`instrument-tab ${activeTab === 'surveys' ? 'active' : ''}`}
                onClick={() => setActiveTab('surveys')}
              >
                3. Survey
              </button>
              <button
                type="button"
                className={`instrument-tab ${activeTab === 'valuation' ? 'active' : ''}`}
                onClick={() => setActiveTab('valuation')}
              >
                4. Solution
              </button>
            </div>

            {/* Table of Corridors */}
            <table className="instrument-table">
              <thead>
                <tr>
                  <th>Vehicle / ID</th>
                  <th>Route</th>
                  <th># of Stops</th>
                  <th>Valuation</th>
                </tr>
              </thead>
              <tbody>
                {CORRIDORS.map((row) => {
                  const isSelected = selectedCorridor === row.id;
                  return (
                    <tr
                      key={row.id}
                      className={isSelected ? 'row-selected' : ''}
                      onClick={() => setSelectedCorridor(row.id)}
                    >
                      <td>
                        <span className="radio-indicator">
                          <span
                            className={`radio-dot ${isSelected ? 'selected' : ''}`}
                          />
                        </span>
                        <span className="row-id">{row.id}</span>
                      </td>
                      <td>
                        <span
                          className="route-line-swatch"
                          style={{ backgroundColor: row.color }}
                        />
                      </td>
                      <td className="center-cell">{row.parcels}</td>
                      <td className="time-val-cell">{row.timeOrVal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer Buttons */}
            <div className="instrument-footer-actions">
              <button
                type="button"
                className="instrument-btn-cancel"
                onClick={() => setSelectedCorridor('1')}
              >
                Reset
              </button>
              <button
                type="button"
                className="instrument-btn-save"
                onClick={() => alert(`Saved alignment edits for Corridor ${selectedCorridor} into RFCTLARR §19 draft.`)}
              >
                Save edits
              </button>
            </div>
          </aside>

          {/* Bottom Right Technical Watermark */}
          <div className="console-watermark">
            BhoomiNexus Cadastral APIs
          </div>
        </div>
      </div>
    </div>
  );
};

export default CadastralHeroConsole;
