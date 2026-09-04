/**
 * Mock data for Indian states and their land acquisition statistics.
 * Will be replaced by GET /api/v1/public/states when the backend is ready.
 */

export interface StateProject {
  id: string;
  name: string;
  status: 'active' | 'survey' | 'notification';
}

export interface StateData {
  id: string;
  name: string;
  code: string;
  activeProjects: number;
  totalParcels: number;
  districtsCovered: number;
  pipelineValueCr: number;
  projects: StateProject[];
}

export interface NationalOverview {
  totalStatesActive: number;
  projectsInProgress: number;
  areaUnderAcquisitionHa: number;
  totalPipelineValueCr: number;
}

export const nationalOverview: NationalOverview = {
  totalStatesActive: 36,
  projectsInProgress: 347,
  areaUnderAcquisitionHa: 124500,
  totalPipelineValueCr: 89720,
};

export const statesData: Record<string, StateData> = {
  'Andhra Pradesh': {
    id: 'AP', name: 'Andhra Pradesh', code: 'AP',
    activeProjects: 18, totalParcels: 3420, districtsCovered: 13, pipelineValueCr: 4120,
    projects: [
      { id: 'ap-1', name: 'Amaravati Capital Ring Road', status: 'active' },
      { id: 'ap-2', name: 'Visakhapatnam Port Expansion', status: 'survey' },
      { id: 'ap-3', name: 'Krishna River Canal Ph-II', status: 'notification' },
    ],
  },
  'Arunachal Pradesh': {
    id: 'AR', name: 'Arunachal Pradesh', code: 'AR',
    activeProjects: 4, totalParcels: 580, districtsCovered: 5, pipelineValueCr: 890,
    projects: [
      { id: 'ar-1', name: 'Trans-Arunachal Highway Spur', status: 'active' },
      { id: 'ar-2', name: 'Dibang Dam Access Road', status: 'survey' },
    ],
  },
  'Assam': {
    id: 'AS', name: 'Assam', code: 'AS',
    activeProjects: 11, totalParcels: 2100, districtsCovered: 10, pipelineValueCr: 2340,
    projects: [
      { id: 'as-1', name: 'Guwahati Ring Road', status: 'active' },
      { id: 'as-2', name: 'Brahmaputra Bridge Corridor', status: 'active' },
      { id: 'as-3', name: 'Nagaon Industrial Zone', status: 'notification' },
    ],
  },
  'Bihar': {
    id: 'BR', name: 'Bihar', code: 'BR',
    activeProjects: 14, totalParcels: 4200, districtsCovered: 18, pipelineValueCr: 3450,
    projects: [
      { id: 'br-1', name: 'Patna Metro Phase 1', status: 'active' },
      { id: 'br-2', name: 'Ganga Expressway Extension', status: 'survey' },
      { id: 'br-3', name: 'Bodh Gaya Tourism Corridor', status: 'notification' },
    ],
  },
  'Chhattisgarh': {
    id: 'CT', name: 'Chhattisgarh', code: 'CT',
    activeProjects: 8, totalParcels: 1450, districtsCovered: 7, pipelineValueCr: 1780,
    projects: [
      { id: 'ct-1', name: 'Raipur Industrial Belt', status: 'active' },
      { id: 'ct-2', name: 'Korba Mining Corridor', status: 'survey' },
    ],
  },
  'Goa': {
    id: 'GA', name: 'Goa', code: 'GA',
    activeProjects: 3, totalParcels: 310, districtsCovered: 2, pipelineValueCr: 520,
    projects: [
      { id: 'ga-1', name: 'Mopa Airport Access Road', status: 'active' },
      { id: 'ga-2', name: 'Zuari Bridge Widening', status: 'notification' },
    ],
  },
  'Gujarat': {
    id: 'GJ', name: 'Gujarat', code: 'GJ',
    activeProjects: 22, totalParcels: 5600, districtsCovered: 20, pipelineValueCr: 7890,
    projects: [
      { id: 'gj-1', name: 'GIFT City Phase III', status: 'active' },
      { id: 'gj-2', name: 'Dholera SIR Industrial', status: 'active' },
      { id: 'gj-3', name: 'Kutch Solar Park Expansion', status: 'survey' },
    ],
  },
  'Haryana': {
    id: 'HR', name: 'Haryana', code: 'HR',
    activeProjects: 16, totalParcels: 3100, districtsCovered: 12, pipelineValueCr: 4560,
    projects: [
      { id: 'hr-1', name: 'KMP Expressway Extension', status: 'active' },
      { id: 'hr-2', name: 'Gurugram Metro Phase 2', status: 'survey' },
      { id: 'hr-3', name: 'Hisar Airport Zone', status: 'notification' },
    ],
  },
  'Himachal Pradesh': {
    id: 'HP', name: 'Himachal Pradesh', code: 'HP',
    activeProjects: 5, totalParcels: 720, districtsCovered: 4, pipelineValueCr: 980,
    projects: [
      { id: 'hp-1', name: 'Shimla Bypass Tunnel', status: 'active' },
      { id: 'hp-2', name: 'Kullu Hydro Access', status: 'survey' },
    ],
  },
  'Jharkhand': {
    id: 'JH', name: 'Jharkhand', code: 'JH',
    activeProjects: 9, totalParcels: 1800, districtsCovered: 8, pipelineValueCr: 2100,
    projects: [
      { id: 'jh-1', name: 'Ranchi Ring Road', status: 'active' },
      { id: 'jh-2', name: 'Jamshedpur Smart City', status: 'survey' },
    ],
  },
  'Karnataka': {
    id: 'KA', name: 'Karnataka', code: 'KA',
    activeProjects: 21, totalParcels: 4800, districtsCovered: 17, pipelineValueCr: 6700,
    projects: [
      { id: 'ka-1', name: 'Bengaluru Suburban Rail', status: 'active' },
      { id: 'ka-2', name: 'Mysuru–Bengaluru Expressway', status: 'active' },
      { id: 'ka-3', name: 'Hubli-Dharwad BRT Ph-II', status: 'survey' },
    ],
  },
  'Kerala': {
    id: 'KL', name: 'Kerala', code: 'KL',
    activeProjects: 12, totalParcels: 2600, districtsCovered: 10, pipelineValueCr: 3200,
    projects: [
      { id: 'kl-1', name: 'SilverLine Rail Corridor', status: 'active' },
      { id: 'kl-2', name: 'Kochi Water Metro Extension', status: 'survey' },
      { id: 'kl-3', name: 'Vizhinjam Port Access', status: 'notification' },
    ],
  },
  'Madhya Pradesh': {
    id: 'MP', name: 'Madhya Pradesh', code: 'MP',
    activeProjects: 15, totalParcels: 3800, districtsCovered: 16, pipelineValueCr: 4100,
    projects: [
      { id: 'mp-1', name: 'Bhopal Metro Phase 1', status: 'active' },
      { id: 'mp-2', name: 'Indore Smart City Ring', status: 'active' },
      { id: 'mp-3', name: 'Narmada Canal Extension', status: 'survey' },
    ],
  },
  'Maharashtra': {
    id: 'MH', name: 'Maharashtra', code: 'MH',
    activeProjects: 34, totalParcels: 8200, districtsCovered: 24, pipelineValueCr: 12500,
    projects: [
      { id: 'mh-1', name: 'Mumbai–Ahmedabad HSR', status: 'active' },
      { id: 'mh-2', name: 'Navi Mumbai Airport', status: 'active' },
      { id: 'mh-3', name: 'Nagpur–Mumbai Expressway', status: 'survey' },
    ],
  },
  'Manipur': {
    id: 'MN', name: 'Manipur', code: 'MN',
    activeProjects: 3, totalParcels: 420, districtsCovered: 3, pipelineValueCr: 540,
    projects: [
      { id: 'mn-1', name: 'Imphal Ring Road', status: 'active' },
    ],
  },
  'Meghalaya': {
    id: 'ML', name: 'Meghalaya', code: 'ML',
    activeProjects: 4, totalParcels: 510, districtsCovered: 3, pipelineValueCr: 620,
    projects: [
      { id: 'ml-1', name: 'Shillong Bypass Extension', status: 'active' },
      { id: 'ml-2', name: 'Tura Industrial Area', status: 'notification' },
    ],
  },
  'Mizoram': {
    id: 'MZ', name: 'Mizoram', code: 'MZ',
    activeProjects: 2, totalParcels: 280, districtsCovered: 2, pipelineValueCr: 340,
    projects: [
      { id: 'mz-1', name: 'Aizawl–Tuipang Highway', status: 'survey' },
    ],
  },
  'Nagaland': {
    id: 'NL', name: 'Nagaland', code: 'NL',
    activeProjects: 3, totalParcels: 380, districtsCovered: 3, pipelineValueCr: 410,
    projects: [
      { id: 'nl-1', name: 'Dimapur Smart City', status: 'active' },
    ],
  },
  'Odisha': {
    id: 'OR', name: 'Odisha', code: 'OR',
    activeProjects: 13, totalParcels: 2900, districtsCovered: 12, pipelineValueCr: 3600,
    projects: [
      { id: 'or-1', name: 'Paradip Port Expansion', status: 'active' },
      { id: 'or-2', name: 'Bhubaneswar Metro', status: 'survey' },
      { id: 'or-3', name: 'Jharsuguda Industrial Zone', status: 'notification' },
    ],
  },
  'Punjab': {
    id: 'PB', name: 'Punjab', code: 'PB',
    activeProjects: 10, totalParcels: 2200, districtsCovered: 9, pipelineValueCr: 2800,
    projects: [
      { id: 'pb-1', name: 'Amritsar Smart City', status: 'active' },
      { id: 'pb-2', name: 'Ludhiana–Delhi Expressway', status: 'survey' },
    ],
  },
  'Rajasthan': {
    id: 'RJ', name: 'Rajasthan', code: 'RJ',
    activeProjects: 17, totalParcels: 4100, districtsCovered: 15, pipelineValueCr: 5200,
    projects: [
      { id: 'rj-1', name: 'Jaipur Ring Road Phase 3', status: 'active' },
      { id: 'rj-2', name: 'Barmer Solar Park', status: 'active' },
      { id: 'rj-3', name: 'Udaipur Tourism Corridor', status: 'notification' },
    ],
  },
  'Sikkim': {
    id: 'SK', name: 'Sikkim', code: 'SK',
    activeProjects: 2, totalParcels: 190, districtsCovered: 2, pipelineValueCr: 280,
    projects: [
      { id: 'sk-1', name: 'Gangtok Bypass Road', status: 'active' },
    ],
  },
  'Tamil Nadu': {
    id: 'TN', name: 'Tamil Nadu', code: 'TN',
    activeProjects: 24, totalParcels: 5100, districtsCovered: 19, pipelineValueCr: 7400,
    projects: [
      { id: 'tn-1', name: 'Chennai Metro Phase 2', status: 'active' },
      { id: 'tn-2', name: 'Coimbatore Ring Road', status: 'active' },
      { id: 'tn-3', name: 'Thoothukudi Port Access', status: 'survey' },
    ],
  },
  'Telangana': {
    id: 'TG', name: 'Telangana', code: 'TG',
    activeProjects: 19, totalParcels: 4300, districtsCovered: 14, pipelineValueCr: 5800,
    projects: [
      { id: 'tg-1', name: 'Hyderabad Regional Ring', status: 'active' },
      { id: 'tg-2', name: 'Warangal IT Corridor', status: 'survey' },
      { id: 'tg-3', name: 'Pharma City Phase II', status: 'notification' },
    ],
  },
  'Tripura': {
    id: 'TR', name: 'Tripura', code: 'TR',
    activeProjects: 3, totalParcels: 350, districtsCovered: 2, pipelineValueCr: 420,
    projects: [
      { id: 'tr-1', name: 'Agartala–Sabroom Highway', status: 'active' },
    ],
  },
  'Uttar Pradesh': {
    id: 'UP', name: 'Uttar Pradesh', code: 'UP',
    activeProjects: 28, totalParcels: 7200, districtsCovered: 25, pipelineValueCr: 9800,
    projects: [
      { id: 'up-1', name: 'Jewar Airport Phase 1', status: 'active' },
      { id: 'up-2', name: 'Ganga Expressway', status: 'active' },
      { id: 'up-3', name: 'Ayodhya Development Zone', status: 'survey' },
    ],
  },
  'Uttarakhand': {
    id: 'UK', name: 'Uttarakhand', code: 'UK',
    activeProjects: 6, totalParcels: 820, districtsCovered: 5, pipelineValueCr: 1100,
    projects: [
      { id: 'uk-1', name: 'Char Dham Highway Ph-III', status: 'active' },
      { id: 'uk-2', name: 'Rishikesh Ring Road', status: 'survey' },
    ],
  },
  'West Bengal': {
    id: 'WB', name: 'West Bengal', code: 'WB',
    activeProjects: 16, totalParcels: 3500, districtsCovered: 13, pipelineValueCr: 4200,
    projects: [
      { id: 'wb-1', name: 'Kolkata Metro East-West', status: 'active' },
      { id: 'wb-2', name: 'Durgapur Expressway Upgrade', status: 'survey' },
      { id: 'wb-3', name: 'Haldia Port Expansion', status: 'notification' },
    ],
  },
  'Jammu and Kashmir': {
    id: 'JK', name: 'Jammu and Kashmir', code: 'JK',
    activeProjects: 9, totalParcels: 1650, districtsCovered: 8, pipelineValueCr: 2150,
    projects: [
      { id: 'jk-1', name: 'Udhampur–Srinagar Rail Link', status: 'active' },
      { id: 'jk-2', name: 'Jammu Ring Road Ph-II', status: 'survey' },
    ],
  },
  'Delhi': {
    id: 'DL', name: 'Delhi', code: 'DL',
    activeProjects: 14, totalParcels: 980, districtsCovered: 11, pipelineValueCr: 4800,
    projects: [
      { id: 'dl-1', name: 'Delhi–Dehradun Expressway Corridor', status: 'active' },
      { id: 'dl-2', name: 'RRTS Anand Vihar Junction', status: 'active' },
    ],
  },
  'Chandigarh': {
    id: 'CH', name: 'Chandigarh', code: 'CH',
    activeProjects: 2, totalParcels: 140, districtsCovered: 1, pipelineValueCr: 320,
    projects: [
      { id: 'ch-1', name: 'Tribune Flyover Land Expansion', status: 'active' },
    ],
  },
  'Puducherry': {
    id: 'PY', name: 'Puducherry', code: 'PY',
    activeProjects: 3, totalParcels: 280, districtsCovered: 2, pipelineValueCr: 410,
    projects: [
      { id: 'py-1', name: 'Karaikal Port Rail Connectivity', status: 'active' },
    ],
  },
  'Andaman and Nicobar': {
    id: 'AN', name: 'Andaman and Nicobar', code: 'AN',
    activeProjects: 2, totalParcels: 210, districtsCovered: 2, pipelineValueCr: 650,
    projects: [
      { id: 'an-1', name: 'Great Nicobar Transshipment Port', status: 'survey' },
    ],
  },
  'Dadra and Nagar Haveli': {
    id: 'DN', name: 'Dadra and Nagar Haveli', code: 'DN',
    activeProjects: 4, totalParcels: 350, districtsCovered: 3, pipelineValueCr: 520,
    projects: [
      { id: 'dn-1', name: 'Silvassa Smart Infrastructure Corridor', status: 'active' },
      { id: 'dn-2', name: 'Daman Coastal Highway Spur', status: 'active' },
    ],
  },
  'Ladakh': {
    id: 'LA', name: 'Ladakh', code: 'LA',
    activeProjects: 5, totalParcels: 680, districtsCovered: 2, pipelineValueCr: 1450,
    projects: [
      { id: 'la-1', name: 'Zoji-La Tunnel Access Road', status: 'active' },
      { id: 'la-2', name: 'Leh Smart City Expansion', status: 'survey' },
      { id: 'la-3', name: 'Hanle Solar Observatory Zone', status: 'notification' },
    ],
  },
  'Lakshadweep': {
    id: 'LD', name: 'Lakshadweep', code: 'LD',
    activeProjects: 1, totalParcels: 95, districtsCovered: 1, pipelineValueCr: 150,
    projects: [
      { id: 'ld-1', name: 'Minicoy Airstrip Expansion', status: 'survey' },
    ],
  },
};

const STATE_ALIASES: Record<string, string> = {
  'orissa': 'Odisha',
  'uttaranchal': 'Uttarakhand',
  'jammu & kashmir': 'Jammu and Kashmir',
  'jammu and kashmir': 'Jammu and Kashmir',
  'andaman and nicobar islands': 'Andaman and Nicobar',
  'andaman and nicobar': 'Andaman and Nicobar',
  'andaman & nicobar': 'Andaman and Nicobar',
  'nct of delhi': 'Delhi',
  'delhi': 'Delhi',
  'daman and diu': 'Dadra and Nagar Haveli',
  'daman & diu': 'Dadra and Nagar Haveli',
  'dadra and nagar haveli and daman and diu': 'Dadra and Nagar Haveli',
  'dadra and nagar haveli': 'Dadra and Nagar Haveli',
  'dadra & nagar haveli': 'Dadra and Nagar Haveli',
  'pondicherry': 'Puducherry',
  'puducherry': 'Puducherry',
  'ladakh': 'Ladakh',
};

/**
 * Resolve state data by GeoJSON feature name.
 * Robust matching with alias translation and fallback guarantee.
 */
export function findStateData(geoJsonName: string): StateData {
  const cleanName = geoJsonName.trim();
  const lower = cleanName.toLowerCase();

  // 1. Check direct match
  if (statesData[cleanName]) return statesData[cleanName];

  // 2. Check alias map
  if (STATE_ALIASES[lower] && statesData[STATE_ALIASES[lower]]) {
    return statesData[STATE_ALIASES[lower]];
  }

  // 3. Check case-insensitive / substring match
  const foundKey = Object.keys(statesData).find(
    (k) => k.toLowerCase() === lower || lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)
  );
  if (foundKey) return statesData[foundKey];

  // 4. Default mock fallback so clicking ANY territory always works smoothly
  const code = cleanName.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || 'IN';
  return {
    id: code,
    name: cleanName,
    code,
    activeProjects: 5,
    totalParcels: 1400,
    districtsCovered: 4,
    pipelineValueCr: 1850,
    projects: [
      { id: `${code.toLowerCase()}-1`, name: `${cleanName} Infrastructure Corridor`, status: 'active' },
      { id: `${code.toLowerCase()}-2`, name: `${cleanName} Bypass Realignment`, status: 'survey' },
    ],
  };
}
