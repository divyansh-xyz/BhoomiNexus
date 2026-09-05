import React from 'react';

interface Agency {
  name: string;
  sub: string;
  id: string;
}

const ROW_ONE: Agency[] = [
  { id: 'gati', name: 'PM GatiShakti', sub: 'National Master Plan' },
  { id: 'morth', name: 'MoRTH', sub: 'Road Transport & Highways' },
  { id: 'nhai', name: 'NHAI', sub: 'National Highways Authority' },
  { id: 'rail', name: 'Indian Railways', sub: 'Ministry of Railways' },
  { id: 'isro', name: 'ISRO Bhuvan', sub: 'Geo-Spatial Data Portal' },
  { id: 'soi', name: 'Survey of India', sub: 'National Mapping Agency' },
];

const ROW_TWO: Agency[] = [
  { id: 'dolr', name: 'DoLR', sub: 'Dept. of Land Resources' },
  { id: 'dilrmp', name: 'DILRMP', sub: 'Digital Land Records' },
  { id: 'dfcc', name: 'DFCCIL', sub: 'Freight Corridor Corp' },
  { id: 'nic', name: 'NIC', sub: 'National Informatics Centre' },
  { id: 'rev', name: 'State Revenue', sub: 'Collectorates & Tehsils' },
  { id: 'cpwd', name: 'CPWD', sub: 'Central Public Works' },
];

// Tripled to ensure mathematically seamless infinite marquee loop
const ROW_ONE_TRIPLED = [...ROW_ONE, ...ROW_ONE, ...ROW_ONE];
const ROW_TWO_TRIPLED = [...ROW_TWO, ...ROW_TWO, ...ROW_TWO];

export const AgencyProofRail: React.FC = () => {
  return (
    <section className="agency-rail-section">
      <h3 className="agency-rail-eyebrow">
        INTEGRATED ACROSS NATIONAL INFRASTRUCTURE & REVENUE BODIES
      </h3>

      <div className="agency-marquee-container">
        {/* Row 1 — Marquee scrolling Left */}
        <div className="agency-marquee-track-wrapper">
          <div className="agency-marquee-track marquee-scroll-left">
            {ROW_ONE_TRIPLED.map((agency, index) => (
              <div
                key={`row1-${agency.id}-${index}`}
                className="agency-badge-item"
                title={`${agency.name} — ${agency.sub}`}
              >
                <div className="agency-text">
                  <span className="agency-name">{agency.name}</span>
                  <span className="agency-sub">{agency.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 — Marquee scrolling Right */}
        <div className="agency-marquee-track-wrapper">
          <div className="agency-marquee-track marquee-scroll-right">
            {ROW_TWO_TRIPLED.map((agency, index) => (
              <div
                key={`row2-${agency.id}-${index}`}
                className="agency-badge-item"
                title={`${agency.name} — ${agency.sub}`}
              >
                <div className="agency-text">
                  <span className="agency-name">{agency.name}</span>
                  <span className="agency-sub">{agency.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AgencyProofRail;
