import React from 'react';
import BhoomiLogo from './BhoomiLogo';

export const StatutoryArchitectureWheel: React.FC = () => {
  return (
    <div className="statutory-wheel-container">
      {/* Centered Large Editorial Headline matching user reference image */}
      <div className="statutory-wheel-header">
        <h2 className="statutory-wheel-title">
          Sovereign land governance, synchronized end-to-end.
        </h2>
      </div>

      {/* The Circular Lifecycle Architecture Diagram */}
      <div className="statutory-diagram-stage">
        {/* Node: Top */}
        <div className="wheel-node node-top">
          <span className="node-title">Cadastral Georeferencing</span>
          <span className="node-subtitle">Bhu-Aadhaar 14-Digit ULPIN</span>
        </div>

        {/* Node: Top Right */}
        <div className="wheel-node node-top-right">
          <span className="node-title">Preliminary Gazette (§11)</span>
          <span className="node-subtitle">Public Hearings &amp; Boundary Notices</span>
        </div>

        {/* Node: Bottom Right */}
        <div className="wheel-node node-bottom-right">
          <span className="node-title">Social Impact Assessment</span>
          <span className="node-subtitle">Multi-Stakeholder SIA Clearance</span>
        </div>

        {/* Node: Bottom */}
        <div className="wheel-node node-bottom">
          <span className="node-title">Declaration &amp; Award (§19)</span>
          <span className="node-subtitle">Statutory 100% Solatium Matrix</span>
        </div>

        {/* Node: Bottom Left */}
        <div className="wheel-node node-bottom-left">
          <span className="node-title">Direct Benefit Transfer</span>
          <span className="node-subtitle">Aadhaar-Linked Treasury Escrow</span>
        </div>

        {/* Node: Top Left */}
        <div className="wheel-node node-top-left">
          <span className="node-title">Encroachment Sentinel</span>
          <span className="node-subtitle">Satellite Radar &amp; RoR Integrity</span>
        </div>

        {/* Central Graphic Wheel */}
        <div className="wheel-center-graphic">
          <svg
            className="wheel-svg"
            viewBox="0 0 420 420"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer dashed track with clockwise direction */}
            <circle
              cx="210"
              cy="210"
              r="144"
              stroke="#000000"
              strokeWidth="1.2"
              strokeDasharray="5 6"
              fill="none"
            />

            {/* Directional arrow chevrons orbiting clockwise (>, v, <, ^) */}
            {/* Top chevron: pointing right (>) */}
            <path
              d="M 205,62 L 213,66 L 205,70"
              fill="none"
              stroke="#000000"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Right chevron: pointing down (v) */}
            <path
              d="M 350,205 L 354,213 L 358,205"
              fill="none"
              stroke="#000000"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Bottom chevron: pointing left (<) */}
            <path
              d="M 215,350 L 207,354 L 215,358"
              fill="none"
              stroke="#000000"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Left chevron: pointing up (^) */}
            <path
              d="M 70,215 L 66,207 L 62,215"
              fill="none"
              stroke="#000000"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Inner solid Signal Blue circle ring */}
            <circle
              cx="210"
              cy="210"
              r="112"
              stroke="#0058fe"
              strokeWidth="2.2"
              fill="none"
            />
          </svg>

          {/* Black starburst logo in the exact center */}
          <div className="wheel-center-logo">
            <BhoomiLogo size={70} strokeWidth={2.4} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatutoryArchitectureWheel;
