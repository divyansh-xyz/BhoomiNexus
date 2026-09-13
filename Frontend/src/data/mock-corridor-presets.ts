import type { CorridorPreset } from '../types/proponent.types';

/**
 * Alignment corridor presets repository.
 * Initialized empty; can be populated from backend spatial presets.
 */
export const CORRIDOR_PRESETS: CorridorPreset[] = [
  {
    id: 'preset-rithala-metro',
    name: 'Delhi Metro Phase-IV Rithala Rapid Transit Corridor',
    agency: 'DMRC',
    type: 'METRO_RAIL',
    state: 'Delhi',
    district: 'Rithala',
    rfctlarrSection: 'Section 2(1)(b) — Urban Infrastructure & Rapid Transit',
    estimatedKm: 12.5,
    suggestedWidthM: 35,
    suggestedAcres: 108,
    coordinates: [
      [28.7208, 77.1071],
      [28.7350, 77.1020],
      [28.7520, 77.0980],
      [28.7700, 77.0910],
      [28.7850, 77.0850]
    ],
    description: 'Mass Rapid Transit link spanning Rithala Urban Sector 5, Metro Viaduct corridor, and industrial terminal interchange.',
  },
];
