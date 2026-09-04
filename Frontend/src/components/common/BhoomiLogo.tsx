import React from 'react';

interface BhoomiLogoProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export const BhoomiLogo: React.FC<BhoomiLogoProps> = ({
  size = 28,
  className = '',
  strokeWidth = 2.4,
}) => {
  // 16-point sharp starburst matching reference emblem
  const points =
    '24.00,4.00 26.54,11.25 31.65,5.52 31.22,13.19 38.14,9.86 34.81,16.78 42.48,16.35 36.75,21.46 44.00,24.00 36.75,26.54 42.48,31.65 34.81,31.22 38.14,38.14 31.22,34.81 31.65,42.48 26.54,36.75 24.00,44.00 21.46,36.75 16.35,42.48 16.78,34.81 9.86,38.14 13.19,31.22 5.52,31.65 11.25,26.54 4.00,24.00 11.25,21.46 5.52,16.35 13.19,16.78 9.86,9.86 16.78,13.19 16.35,5.52 21.46,11.25';

  return (
    <svg
      className={`bhoomi-starburst-logo ${className}`}
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="miter"
      />
    </svg>
  );
};

export default BhoomiLogo;
