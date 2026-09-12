/**
 * ============================================================
 * Phase 7: Contextual Workflow Templates & Reusable Fragments
 * Strictly adheres to Phase Implementation.md (Section 10)
 * ============================================================
 */

import type { WorkflowTemplate } from '../types/workflow.types';
import type { WorkflowNode, WorkflowEdge, WorkflowNodeType, WorkflowNodeResponsibility } from '../types/workflowV2.types';

export const SEED_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'tpl-highway-dev',
    name: 'Highway Development',
    category: 'LINEAR_HIGHWAY',
    description: 'Statutory 3-stage fragment for national highway corridors, expressway bypasses, and linear arterial expansion.',
    statutoryAct: 'National Highways Act, 1956 & RFCTLARR Act, 2013',
    totalSlaDays: 46,
    fragmentNodes: [
      {
        name: 'NHAI Alignment & ROW Verification',
        nodeType: 'STAGE',
        responsibility: 'SURVEY_OFFICE',
        slaDays: 10,
        requiredDocuments: ['Alignment GeoJSON', 'Right of Way (ROW) Demarcation', 'Cadastral Overlay'],
      },
      {
        name: 'Section 3A/3D Statutory Notification',
        nodeType: 'STAGE',
        responsibility: 'REVENUE_BRANCH',
        slaDays: 21,
        requiredDocuments: ['Draft 3A/3D Gazette Extract', 'Public Hearing Notices', 'Objection Disposal Records'],
      },
      {
        name: 'Joint Measurement Survey (JMS)',
        nodeType: 'STAGE',
        responsibility: 'SURVEY_OFFICE',
        slaDays: 15,
        requiredDocuments: ['JMS Field Sheets', 'Boundary Pillar Coordinates', 'Landowner Panchnama'],
      },
    ],
  },
  {
    id: 'tpl-army-acquisition',
    name: 'Army Acquisition',
    category: 'DEFENSE_CORRIDOR',
    description: 'High-security defense corridor protocol for military installations, cantonments, and tactical buffer zones.',
    statutoryAct: 'Defense Land Acquisition & Strategic Installations Guidelines (MoD)',
    totalSlaDays: 45,
    fragmentNodes: [
      {
        name: 'Defense Estate Officer (DEO) Inspection',
        nodeType: 'SPECIAL_UNIT',
        responsibility: 'REVENUE_BRANCH',
        slaDays: 14,
        requiredDocuments: ['DEO Requisition Order', 'Strategic Security Assessment', 'Site Feasibility Clearance'],
      },
      {
        name: 'Security Clearance & Perimeter Demarcation',
        nodeType: 'STAGE',
        responsibility: 'SURVEY_OFFICE',
        slaDays: 10,
        requiredDocuments: ['Restricted Buffer Plan', 'Perimeter Coordinates', 'Survey Pillar Ledger'],
      },
      {
        name: 'MoD Strategic Acquisition Award',
        nodeType: 'STAGE',
        responsibility: 'REVENUE_BRANCH',
        slaDays: 21,
        requiredDocuments: ['Ministry of Defense Sanction', 'Statutory Award Declaration', 'Clearance Certificate'],
      },
    ],
  },
  {
    id: 'tpl-tribal-area',
    name: 'Tribal Area',
    category: 'TRIBAL_SCHEDULE_V',
    description: 'Mandatory statutory fragment for Scheduled V areas requiring Gram Sabha consent and Tribal Advisory Council clearance.',
    statutoryAct: 'Panchayats (Extension to Scheduled Areas) Act, 1996 (PESA) & Fifth Schedule',
    totalSlaDays: 66,
    fragmentNodes: [
      {
        name: 'Gram Sabha PESA Statutory Resolution',
        nodeType: 'APPROVAL_GATE',
        responsibility: 'REVENUE_BRANCH',
        slaDays: 30,
        requiredDocuments: ['Gram Sabha Notice & Quorum Certificate', 'Formal PESA Consent Resolution', 'Video Recording of Assembly'],
      },
      {
        name: 'Tribal Advisory Council (TAC) Scrutiny',
        nodeType: 'SPECIAL_UNIT',
        responsibility: 'REVENUE_BRANCH',
        slaDays: 21,
        requiredDocuments: ['TAC Scrutiny Report', 'Indigenous Livelihood Assessment', 'Resettlement & Rehabilitation Plan'],
      },
      {
        name: 'SIA & Cultural Impact Review',
        nodeType: 'STAGE',
        responsibility: 'REVENUE_BRANCH',
        slaDays: 15,
        requiredDocuments: ['Social Impact Assessment (SIA) Clearance', 'Cultural Heritage Protection Plan'],
      },
    ],
  },
  {
    id: 'tpl-compensation-std',
    name: 'Compensation Standard',
    category: 'COMPENSATION_STANDARD',
    description: 'Statutory compensation determination and disbursal protocol under Sections 26–30 of RFCTLARR.',
    statutoryAct: 'RFCTLARR Act, 2013 (Sections 26 to 30)',
    totalSlaDays: 42,
    fragmentNodes: [
      {
        name: 'Valuation of Trees, Crops & Structures',
        nodeType: 'STAGE',
        responsibility: 'COMPENSATION_BRANCH',
        slaDays: 14,
        requiredDocuments: ['Forest Dept Tree Valuation', 'PWD Structure Valuation', 'Horticulture Assessment'],
      },
      {
        name: 'Sec 26-30 Statutory Award Determination',
        nodeType: 'STAGE',
        responsibility: 'COMPENSATION_BRANCH',
        slaDays: 21,
        requiredDocuments: ['Circle Rate Computation Sheet', '100% Solatium Certificate', '12% Additional Market Value'],
      },
      {
        name: 'Direct Benefit Transfer (DBT) Disbursal',
        nodeType: 'STAGE',
        responsibility: 'COMPENSATION_BRANCH',
        slaDays: 7,
        requiredDocuments: ['Public Financial Management System (PFMS) Mandate', 'Aadhaar-Linked Account Verification', 'Disbursal Receipts'],
      },
    ],
  },
  {
    id: 'tpl-possession-std',
    name: 'Possession Standard',
    category: 'POSSESSION_STANDARD',
    description: 'Statutory physical possession, spot panchnama, and sovereign mutation in Land Records.',
    statutoryAct: 'RFCTLARR Act, 2013 (Sections 38 to 40) & State Revenue Code',
    totalSlaDays: 77,
    fragmentNodes: [
      {
        name: 'Statutory 60-Day Notice to Vacate',
        nodeType: 'STAGE',
        responsibility: 'POSSESSION_BRANCH',
        slaDays: 60,
        requiredDocuments: ['Notice under Section 38', 'Postal Delivery Proof / Personal Service', 'Public Beat of Drum Record'],
      },
      {
        name: 'Physical Panchnama & Handover',
        nodeType: 'STAGE',
        responsibility: 'POSSESSION_BRANCH',
        slaDays: 10,
        requiredDocuments: ['Spot Panchnama Signed by Witnesses', 'Handover & Takeover Certificate', 'Geotagged Handover Photos'],
      },
      {
        name: 'Mutation in Sovereign Revenue Records',
        nodeType: 'STAGE',
        responsibility: 'REVENUE_BRANCH',
        slaDays: 7,
        requiredDocuments: ['Tehsildar Mutation Order', 'Updated Record of Rights (Khatauni)', 'Sovereign Vesting Endorsement'],
      },
    ],
  },
];

/**
 * Returns contextual templates matching a node's profile or department
 */
export function getContextualTemplatesForNode(
  node?: WorkflowNode | null
): WorkflowTemplate[] {
  if (!node) return SEED_WORKFLOW_TEMPLATES;

  // Boost relevant templates to the top based on responsibility
  return [...SEED_WORKFLOW_TEMPLATES].sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    if (node.responsibility === 'COMPENSATION_BRANCH' && a.category === 'COMPENSATION_STANDARD') scoreA += 10;
    if (node.responsibility === 'COMPENSATION_BRANCH' && b.category === 'COMPENSATION_STANDARD') scoreB += 10;

    if (node.responsibility === 'POSSESSION_BRANCH' && a.category === 'POSSESSION_STANDARD') scoreA += 10;
    if (node.responsibility === 'POSSESSION_BRANCH' && b.category === 'POSSESSION_STANDARD') scoreB += 10;

    if (node.responsibility === 'SURVEY_OFFICE' && a.category === 'LINEAR_HIGHWAY') scoreA += 10;
    if (node.responsibility === 'SURVEY_OFFICE' && b.category === 'LINEAR_HIGHWAY') scoreB += 10;

    return scoreB - scoreA;
  });
}

/**
 * Builds new nodes and connecting edges for a template fragment attached to targetNodeId
 */
export function buildFragmentGraph(
  template: WorkflowTemplate,
  sourceNodeId: string,
  currentNodes: WorkflowNode[],
  _currentEdges: WorkflowEdge[]
): {
  newNodes: WorkflowNode[];
  newEdges: WorkflowEdge[];
} {
  const sourceNode = currentNodes.find((n) => n.id === sourceNodeId);
  const startX = (sourceNode?.positionX ?? 100) + 320;
  const startY = (sourceNode?.positionY ?? 100);

  const fragmentNodes = template.fragmentNodes || [];
  const createdNodes: WorkflowNode[] = [];
  const createdEdges: WorkflowEdge[] = [];

  const timestamp = Date.now();

  fragmentNodes.forEach((frag, idx) => {
    const newNodeId = `node-frag-${timestamp}-${idx}`;
    const newNode: WorkflowNode = {
      id: newNodeId,
      workflowId: sourceNode?.workflowId || 'wf-current',
      name: frag.name,
      nodeType: frag.nodeType as WorkflowNodeType,
      responsibility: frag.responsibility as WorkflowNodeResponsibility,
      slaDays: frag.slaDays,
      requiredDocuments: frag.requiredDocuments,
      positionX: startX + idx * 320,
      positionY: startY + (idx % 2 === 1 ? 40 : 0),
      parcelCount: 0, // Newly added fragment nodes start empty per V2 cohort rules
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    };
    createdNodes.push(newNode);

    if (idx === 0) {
      // Connect source node to first fragment node
      createdEdges.push({
        id: `edge-frag-${timestamp}-0`,
        workflowId: sourceNode?.workflowId || 'wf-current',
        sourceNodeId: sourceNodeId,
        targetNodeId: newNodeId,
        edgeLabel: `${template.name} Start`,
        createdAt: new Date().toISOString(),
      });
    } else {
      // Connect preceding fragment node to current fragment node
      createdEdges.push({
        id: `edge-frag-${timestamp}-${idx}`,
        workflowId: sourceNode?.workflowId || 'wf-current',
        sourceNodeId: createdNodes[idx - 1].id,
        targetNodeId: newNodeId,
        createdAt: new Date().toISOString(),
      });
    }
  });

  return {
    newNodes: createdNodes,
    newEdges: createdEdges,
  };
}

/**
 * Determines the conceptual branch category for a node.
 * Strictly supports Phase 8 3-Branch Architecture:
 * District ├── Acquisition ├── Compensation └── Possession
 */
export function getNodeBranchType(node: WorkflowNode): 'DISTRICT' | 'ACQUISITION' | 'COMPENSATION' | 'POSSESSION' {
  if (node.nodeType === 'DISTRICT_ACQUISITION' || node.branchKey === 'DISTRICT' || node.id === 'node-district-root') {
    return 'DISTRICT';
  }
  if (
    node.branchKey === 'COMPENSATION' ||
    node.responsibility === 'COMPENSATION_BRANCH' ||
    node.name.toLowerCase().includes('compensat') ||
    node.name.toLowerCase().includes('solatium') ||
    node.name.toLowerCase().includes('dbt') ||
    node.name.toLowerCase().includes('valuation')
  ) {
    return 'COMPENSATION';
  }
  if (
    node.branchKey === 'POSSESSION' ||
    node.responsibility === 'POSSESSION_BRANCH' ||
    node.name.toLowerCase().includes('possess') ||
    node.name.toLowerCase().includes('vacate') ||
    node.name.toLowerCase().includes('panchnama') ||
    node.name.toLowerCase().includes('vesting')
  ) {
    return 'POSSESSION';
  }
  return 'ACQUISITION';
}

/**
 * Synthesizes the standard Phase 8 District Starting Graph.
 * Strictly adheres to Phase Implementation.md (Section 11: Phase 8):
 * District
 * ├── Acquisition
 * ├── Compensation (from Compensation Standard Template)
 * └── Possession (from Possession Standard Template)
 * 
 * All nodes and branches are ordinary editable nodes.
 */
export function createStandardDistrictStartingGraph(projectId: string): import('../types/workflowV2.types').V2WorkflowGraph {
  const wfId = `wf-${projectId || 'default'}`;
  const now = new Date().toISOString();

  const rootNode: WorkflowNode = {
    id: 'node-district-root',
    workflowId: wfId,
    name: 'District Land Acquisition & Management',
    description: 'Statutory district administrative root coordinating acquisition, compensation, and possession branches.',
    nodeType: 'DISTRICT_ACQUISITION',
    responsibility: 'REVENUE_BRANCH',
    unitName: 'District Collectorate / SLAO',
    branchKey: 'DISTRICT',
    slaDays: 0,
    requiredDocuments: ['Administrative Sanction Order', 'Project Boundary GeoJSON'],
    positionX: 100,
    positionY: 80,
    parcelCount: 4,
    status: 'DRAFT',
    createdAt: now,
  };

  // 1. Acquisition Branch
  const acqNode1: WorkflowNode = {
    id: 'node-acq-1',
    workflowId: wfId,
    name: 'Field Survey & Sec 11 Notification',
    description: 'Ground cadastral boundary pegging and preliminary notification under Section 11 RFCTLARR.',
    nodeType: 'STAGE',
    responsibility: 'SURVEY_OFFICE',
    unitName: 'Land Survey & Acquisition Wing',
    branchKey: 'ACQUISITION',
    slaDays: 21,
    requiredDocuments: ['Joint Measurement Survey (JMS)', 'Section 11 Gazette Publication'],
    positionX: 420,
    positionY: 80,
    parcelCount: 0,
    status: 'DRAFT',
    createdAt: now,
  };

  const acqNode2: WorkflowNode = {
    id: 'node-acq-2',
    workflowId: wfId,
    name: 'Hearing of Objections (Sec 15)',
    description: 'Adjudication of landowner objections and public claim hearings by Competent Authority.',
    nodeType: 'STAGE',
    responsibility: 'REVENUE_BRANCH',
    unitName: 'Competent Authority Land Acquisition (CALA)',
    branchKey: 'ACQUISITION',
    slaDays: 30,
    requiredDocuments: ['Public Hearing Minutes', 'Section 15 Claim Disposal Report'],
    positionX: 740,
    positionY: 80,
    parcelCount: 0,
    status: 'DRAFT',
    createdAt: now,
  };

  const acqNode3: WorkflowNode = {
    id: 'node-acq-3',
    workflowId: wfId,
    name: 'Section 19 Declaration of Acquisition',
    description: 'Final declaration of land acquisition with published resettlement and rehabilitation scheme.',
    nodeType: 'STAGE',
    responsibility: 'REVENUE_BRANCH',
    unitName: 'Special Land Acquisition Office',
    branchKey: 'ACQUISITION',
    slaDays: 14,
    requiredDocuments: ['Sec 19 Final Gazette Declaration', 'R&R Summary Scheme'],
    positionX: 1060,
    positionY: 80,
    parcelCount: 0,
    status: 'DRAFT',
    createdAt: now,
  };

  // 2. Compensation Branch (uses Standard Compensation Template)
  const compNode1: WorkflowNode = {
    id: 'node-comp-1',
    workflowId: wfId,
    name: 'Valuation of Trees, Crops & Structures',
    description: 'Cross-departmental assessment of immovable assets, standing crops, and tree capital values.',
    nodeType: 'STAGE',
    responsibility: 'COMPENSATION_BRANCH',
    unitName: 'Valuation & Accounts Wing',
    branchKey: 'COMPENSATION',
    slaDays: 14,
    requiredDocuments: ['Forest Dept Tree Valuation', 'PWD Structure Valuation', 'Horticulture Assessment'],
    positionX: 420,
    positionY: 260,
    parcelCount: 0,
    status: 'DRAFT',
    createdAt: now,
  };

  const compNode2: WorkflowNode = {
    id: 'node-comp-2',
    workflowId: wfId,
    name: 'Sec 26-30 Statutory Award Determination',
    description: 'Market value computation, 100% statutory solatium, and 12% additional compensation calculation.',
    nodeType: 'STAGE',
    responsibility: 'COMPENSATION_BRANCH',
    unitName: 'CALA Finance Wing',
    branchKey: 'COMPENSATION',
    slaDays: 21,
    requiredDocuments: ['Circle Rate Computation Sheet', '100% Solatium Certificate', '12% Additional Market Value'],
    positionX: 740,
    positionY: 260,
    parcelCount: 0,
    status: 'DRAFT',
    createdAt: now,
  };

  const compNode3: WorkflowNode = {
    id: 'node-comp-3',
    workflowId: wfId,
    name: 'Direct Benefit Transfer (DBT) Disbursal',
    description: 'Direct compensation electronic fund disbursal into authenticated Aadhaar-linked beneficiary accounts.',
    nodeType: 'STAGE',
    responsibility: 'COMPENSATION_BRANCH',
    unitName: 'PFMS Treasury Escrow',
    branchKey: 'COMPENSATION',
    slaDays: 7,
    requiredDocuments: ['PFMS Mandate', 'Aadhaar-Linked Account Verification', 'Disbursal Receipts'],
    positionX: 1060,
    positionY: 260,
    parcelCount: 0,
    status: 'DRAFT',
    createdAt: now,
  };

  // 3. Possession Branch (uses Standard Possession Template)
  const possNode1: WorkflowNode = {
    id: 'node-poss-1',
    workflowId: wfId,
    name: 'Statutory 60-Day Notice to Vacate',
    description: 'Formal legal notice under Section 38 directing occupants to deliver peaceful possession.',
    nodeType: 'STAGE',
    responsibility: 'POSSESSION_BRANCH',
    unitName: 'Field Enforcement Directorate',
    branchKey: 'POSSESSION',
    slaDays: 60,
    requiredDocuments: ['Sec 38 Notice to Landowners', 'Proof of Notice Service'],
    positionX: 420,
    positionY: 440,
    parcelCount: 0,
    status: 'DRAFT',
    createdAt: now,
  };

  const possNode2: WorkflowNode = {
    id: 'node-poss-2',
    workflowId: wfId,
    name: 'Spot Panchnama & Physical Possession',
    description: 'On-site physical takeover witnessed by independent panchas with geo-tagged video evidence.',
    nodeType: 'STAGE',
    responsibility: 'POSSESSION_BRANCH',
    unitName: 'Revenue & Police Liaison',
    branchKey: 'POSSESSION',
    slaDays: 10,
    requiredDocuments: ['Spot Panchnama with 2 Witnesses', 'Geo-tagged Site Photographs', 'Police Bandobast Certificate'],
    positionX: 740,
    positionY: 440,
    parcelCount: 0,
    status: 'DRAFT',
    createdAt: now,
  };

  const possNode3: WorkflowNode = {
    id: 'node-poss-3',
    workflowId: wfId,
    name: 'RoR Sovereign Mutation & Handover',
    description: 'Sovereign land record mutation vesting title with the State and final possession certificate.',
    nodeType: 'STAGE',
    responsibility: 'POSSESSION_BRANCH',
    unitName: 'Land Records Registry',
    branchKey: 'POSSESSION',
    slaDays: 7,
    requiredDocuments: ['Form 16 Certificate of Vesting', 'Tehsildar Mutation Order', 'Updated Record of Rights (RoR)'],
    positionX: 1060,
    positionY: 440,
    parcelCount: 0,
    status: 'DRAFT',
    createdAt: now,
  };

  const nodes: WorkflowNode[] = [
    rootNode,
    acqNode1,
    acqNode2,
    acqNode3,
    compNode1,
    compNode2,
    compNode3,
    possNode1,
    possNode2,
    possNode3,
  ];

  const edges: WorkflowEdge[] = [
    // Acquisition chain
    {
      id: 'edge-dist-to-acq-1',
      workflowId: wfId,
      sourceNodeId: 'node-district-root',
      targetNodeId: 'node-acq-1',
      edgeLabel: 'Acquisition',
      createdAt: now,
    },
    {
      id: 'edge-acq-1-to-2',
      workflowId: wfId,
      sourceNodeId: 'node-acq-1',
      targetNodeId: 'node-acq-2',
      createdAt: now,
    },
    {
      id: 'edge-acq-2-to-3',
      workflowId: wfId,
      sourceNodeId: 'node-acq-2',
      targetNodeId: 'node-acq-3',
      createdAt: now,
    },

    // Compensation chain
    {
      id: 'edge-dist-to-comp-1',
      workflowId: wfId,
      sourceNodeId: 'node-district-root',
      targetNodeId: 'node-comp-1',
      edgeLabel: 'Compensation',
      createdAt: now,
    },
    {
      id: 'edge-comp-1-to-2',
      workflowId: wfId,
      sourceNodeId: 'node-comp-1',
      targetNodeId: 'node-comp-2',
      createdAt: now,
    },
    {
      id: 'edge-comp-2-to-3',
      workflowId: wfId,
      sourceNodeId: 'node-comp-2',
      targetNodeId: 'node-comp-3',
      createdAt: now,
    },

    // Possession chain
    {
      id: 'edge-dist-to-poss-1',
      workflowId: wfId,
      sourceNodeId: 'node-district-root',
      targetNodeId: 'node-poss-1',
      edgeLabel: 'Possession',
      createdAt: now,
    },
    {
      id: 'edge-poss-1-to-2',
      workflowId: wfId,
      sourceNodeId: 'node-poss-1',
      targetNodeId: 'node-poss-2',
      createdAt: now,
    },
    {
      id: 'edge-poss-2-to-3',
      workflowId: wfId,
      sourceNodeId: 'node-poss-2',
      targetNodeId: 'node-poss-3',
      createdAt: now,
    },
  ];

  return {
    projectId,
    workflowId: wfId,
    templateId: 'tpl-district-standard',
    templateName: 'Standard District Lifecycle (Acquisition, Compensation, Possession)',
    status: 'DRAFT',
    nodes,
    edges,
    totalParcelsCount: 4,
    unassignedParcelsCount: 0,
  };
}
