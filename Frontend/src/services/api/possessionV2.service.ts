/**
 * ============================================================
 * Possession V2 API Client
 * Strictly adheres to: V2 API Endpoints and Behaviour.md
 * (Section: Possession V2 - Lines 289-305)
 * 
 * NO API calls go beyond the scope of V2 API Endpoints and Behaviour.md.
 * Base: /api/v1
 * 
 * Endpoints:
 * 1. GET  /api/v1/possession/dashboard
 * 2. GET  /api/v1/possession/tasks?assignedTo=me
 * 3. GET  /api/v1/possession/records/:recordId
 * 4. POST /api/v1/possession/records/:recordId/evidence
 * 5. POST /api/v1/possession/records/:recordId/complete
 * ============================================================
 */

import { apiClient } from './client';
import type { PossessionRecord, PossessionEvidenceItem } from '../../types/workflowV2.types';
import type { WorkflowTask } from '../../types/task.types';

export interface PossessionDashboardData {
  totalParcels: number;
  possessionTaken: number;
  possessionPending: number;
  inspectionsScheduled: number;
  disputedParcels: number;
}

const STORAGE_KEY_POSS_RECORDS = 'bhoomi_poss_v2_records_rithala';
const STORAGE_KEY_POSS_TASKS = 'bhoomi_poss_v2_tasks_rithala';

// Default deterministic seeds for Phase 14 Direct Execution - Rithala District Corridor
const DEFAULT_POSS_RECORDS: PossessionRecord[] = [
  {
    id: 'poss-rec-101',
    taskId: 'TASK-POSS-101-1',
    projectId: '4ed46de6-586e-4459-b011-f090a1c3bafd',
    parcelId: '07-104-5829-1021',
    status: 'INSPECTION_SCHEDULED',
    possessionDate: '2026-09-18',
    remarks: 'Joint field demarcation scheduled with DMRC Site Engineer and Revenue Field Tehsildar; compensation award cleared under Sec 30.',
    parcelDetails: {
      khasraNumber: '101/A',
      ulpin: '07-104-5829-1021',
      surveyNumber: 'SV-101/A',
      village: 'Rithala Village',
      taluka: 'Rohini Tehsil',
      district: 'Rithala',
      state: 'Delhi',
      areaAcres: 0.85,
      tenureType: 'Occupant Class I (Bhumiswami)',
      boundaryCoordinates: '28.7208° N, 77.1071° E to 28.7225° N, 77.1085° E',
      boundaryPegsCount: 6,
    },
    demarcationDetails: {
      boundaryStonesPegged: true,
      encroachmentCleared: true,
      revenueWitnesses: [
        'Shri Vinayak Kulkarni (Statutory Possession Officer)',
        'Shri O. P. Sharma (Kanungo / Rohini Tehsil)',
        'Er. Ankit Verma (DMRC Site Engineer)',
        'Smt. Lakshmi Devi (Primary Khatedar)',
      ],
      siteEngineerName: 'Er. Ankit Verma (DMRC Phase-IV PIU)',
      talathiName: 'Shri O. P. Sharma (Kanungo)',
      circleInspectorName: 'Shri Vinayak Kulkarni (Executive Tehsildar)',
      panchnamaSummary: 'Physical perimeter verified against Cadastral Sheet No. 101. No unauthorized structures or standing crops found.',
    },
    evidenceItems: [
      {
        id: 'ev-poss-101-1',
        title: 'Form 11 Compensation Award Clearance Certificate',
        type: 'VESTING_CERTIFICATE',
        uploadedAt: '2026-09-12T10:00:00Z',
        size: '1.4 MB',
      },
    ],
    createdAt: '2026-09-08T09:00:00Z',
    updatedAt: '2026-09-12T10:00:00Z',
  },
  {
    id: 'poss-rec-102',
    taskId: 'TASK-POSS-101-2',
    projectId: '4ed46de6-586e-4459-b011-f090a1c3bafd',
    parcelId: '07-104-5829-1022',
    status: 'PENDING',
    remarks: 'Compensation assessment active; pending field demarcation scheduling under Section 38.',
    parcelDetails: {
      khasraNumber: '102/B',
      ulpin: '07-104-5829-1022',
      surveyNumber: 'SV-102/B',
      village: 'Rithala Village',
      taluka: 'Rohini Tehsil',
      district: 'Rithala',
      state: 'Delhi',
      areaAcres: 1.15,
      tenureType: 'Occupant Class I (Bhumiswami)',
      boundaryCoordinates: '28.7230° N, 77.1090° E to 28.7245° N, 77.1105° E',
      boundaryPegsCount: 8,
    },
    demarcationDetails: {
      boundaryStonesPegged: false,
      encroachmentCleared: true,
      revenueWitnesses: [
        'Shri Vinayak Kulkarni (Tehsildar)',
        'Shri Rajesh Kumar (Khatedar)',
      ],
      talathiName: 'Shri O. P. Sharma (Kanungo)',
    },
    evidenceItems: [],
    createdAt: '2026-09-08T09:30:00Z',
    updatedAt: '2026-09-08T09:30:00Z',
  },
  {
    id: 'poss-rec-103',
    projectId: '4ed46de6-586e-4459-b011-f090a1c3bafd',
    parcelId: '07-104-5829-1023',
    status: 'POSSESSION_TAKEN',
    possessionDate: '2026-08-28',
    remarks: 'Physical possession vested unconditionally in Government under Sec 38; handed over to DMRC for civil works.',
    parcelDetails: {
      khasraNumber: '103/C',
      ulpin: '07-104-5829-1023',
      village: 'Rithala Village',
      district: 'Rithala',
      state: 'Delhi',
      areaAcres: 0.65,
    },
    demarcationDetails: {
      boundaryStonesPegged: true,
      encroachmentCleared: true,
      revenueWitnesses: ['Shri Vinayak Kulkarni', 'Mohd. Irfan Ansari'],
      panchnamaSignedAt: '2026-08-28T14:30:00Z',
    },
    evidenceItems: [
      {
        id: 'ev-poss-103-1',
        title: 'Geotagged North-Corner Boundary Photo',
        type: 'GEOTAGGED_PHOTO',
        uploadedAt: '2026-08-28T14:40:00Z',
        size: '3.2 MB',
        coordinates: { lat: 28.7250, lng: 77.1110 },
      },
      {
        id: 'ev-poss-103-2',
        title: 'Joint Panchnama Document (Signed by Tehsildar & DMRC)',
        type: 'PANCHNAMA',
        uploadedAt: '2026-08-28T15:00:00Z',
        size: '2.8 MB',
      },
    ],
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-28T15:00:00Z',
  },
  {
    id: 'poss-rec-104',
    projectId: '4ed46de6-586e-4459-b011-f090a1c3bafd',
    parcelId: '07-104-5829-1024',
    status: 'DISPUTED',
    remarks: 'Encroachment resistance on northern boundary; revenue police protection requisitioned under Sec 38(2).',
    parcelDetails: {
      khasraNumber: '104/D',
      village: 'Rithala Village',
      district: 'Rithala',
      state: 'Delhi',
      areaAcres: 0.90,
    },
    createdAt: '2026-08-22T11:00:00Z',
    updatedAt: '2026-08-22T11:00:00Z',
  },
];

const DEFAULT_POSS_TASKS: WorkflowTask[] = [
  {
    id: 'TASK-POSS-101-1',
    projectId: '4ed46de6-586e-4459-b011-f090a1c3bafd',
    projectCode: 'PRJ-DL-7701',
    projectTitle: 'Delhi Metro Phase-IV Rithala Rapid Transit Corridor',
    ministry: 'Ministry of Housing and Urban Affairs',
    statutoryPurpose: 'Mass Rapid Transit System under Metro Railways Act / RFCTLARR 2013',
    state: 'Delhi',
    district: 'Rithala',
    parcel: {
      id: '07-104-5829-1021',
      ulpin: '07-104-5829-1021',
      khasraNumber: '101/A',
      village: 'Rithala Village',
      areaAcres: 0.85,
      tenureType: 'Occupant Class I (Bhumiswami)',
      disputed: false,
    },
    stageId: 'stage-possession-vesting',
    stageOrder: 3,
    stageName: 'Physical Possession, Spot Panchnama & Handover',
    workflowNode: {
      id: 'node-poss-1',
      name: 'Physical Possession, Spot Panchnama & Handover',
      type: 'POSSESSION_STAGE',
      branchType: 'POSSESSION',
      responsibility: 'Competent Tehsildar / Executive Magistrate (Possession Officer)',
      slaDays: 7,
    },
    assignedOfficer: {
      id: 'possession.officer@bhoomi.gov.in',
      name: 'Vinayak Kulkarni',
      designation: 'Tehsildar & Statutory Possession Officer',
      role: 'POSSESSION_OFFICER',
      department: 'Revenue & Land Records Office (Rohini / Rithala Zone)',
      authority: 'Tehsildar & Competent Land Officer',
      jurisdiction: 'Rithala, Delhi',
      district: 'Rithala',
      state: 'Delhi',
    },
    department: 'Land & Building Department, Delhi',
    slaDays: 7,
    dueDate: '2026-09-22',
    status: 'IN_PROGRESS',
    requiredDocuments: [
      { id: 'doc-poss-01', name: 'Form 11 Compensation Clearance', type: 'VESTING_CERTIFICATE', mandatory: true, status: 'VERIFIED' },
      { id: 'doc-poss-02', name: 'Joint Panchnama with Revenue Witnesses', type: 'PANCHNAMA', mandatory: true, status: 'MISSING' },
      { id: 'doc-poss-03', name: 'Geotagged Boundary Pegging Photos', type: 'GEOTAGGED_PHOTO', mandatory: true, status: 'MISSING' },
    ],
    createdAt: '2026-09-08T09:00:00Z',
  },
  {
    id: 'TASK-POSS-101-2',
    projectId: '4ed46de6-586e-4459-b011-f090a1c3bafd',
    projectCode: 'PRJ-DL-7701',
    projectTitle: 'Delhi Metro Phase-IV Rithala Rapid Transit Corridor',
    ministry: 'Ministry of Housing and Urban Affairs',
    statutoryPurpose: 'Mass Rapid Transit System under Metro Railways Act / RFCTLARR 2013',
    state: 'Delhi',
    district: 'Rithala',
    parcel: {
      id: '07-104-5829-1022',
      ulpin: '07-104-5829-1022',
      khasraNumber: '102/B',
      village: 'Rithala Village',
      areaAcres: 1.15,
      tenureType: 'Occupant Class I (Bhumiswami)',
      disputed: false,
    },
    stageId: 'stage-possession-vesting',
    stageOrder: 3,
    stageName: 'Physical Possession, Spot Panchnama & Handover',
    workflowNode: {
      id: 'node-poss-1',
      name: 'Physical Possession, Spot Panchnama & Handover',
      type: 'POSSESSION_STAGE',
      branchType: 'POSSESSION',
      responsibility: 'Competent Tehsildar / Executive Magistrate (Possession Officer)',
      slaDays: 7,
    },
    assignedOfficer: {
      id: 'possession.officer@bhoomi.gov.in',
      name: 'Vinayak Kulkarni',
      designation: 'Tehsildar & Statutory Possession Officer',
      role: 'POSSESSION_OFFICER',
      department: 'Revenue & Land Records Office (Rohini / Rithala Zone)',
      authority: 'Tehsildar & Competent Land Officer',
      jurisdiction: 'Rithala, Delhi',
      district: 'Rithala',
      state: 'Delhi',
    },
    department: 'Land & Building Department, Delhi',
    slaDays: 7,
    dueDate: '2026-09-24',
    status: 'ASSIGNED',
    requiredDocuments: [
      { id: 'doc-poss-04', name: 'Form 11 Compensation Clearance', type: 'VESTING_CERTIFICATE', mandatory: true, status: 'VERIFIED' },
      { id: 'doc-poss-05', name: 'Joint Panchnama with Revenue Witnesses', type: 'PANCHNAMA', mandatory: true, status: 'MISSING' },
    ],
    createdAt: '2026-09-08T09:30:00Z',
  },
];

function getLocalRecords(): PossessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POSS_RECORDS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[possessionV2Service] Failed to read possession records from localStorage', e);
  }
  return DEFAULT_POSS_RECORDS;
}

function saveLocalRecords(records: PossessionRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY_POSS_RECORDS, JSON.stringify(records));
  } catch (e) {
    console.warn('[possessionV2Service] Failed to save possession records to localStorage', e);
  }
}

function getLocalTasks(): WorkflowTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POSS_TASKS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('[possessionV2Service] Failed to read possession tasks from localStorage', e);
  }
  return DEFAULT_POSS_TASKS;
}

function saveLocalTasks(tasks: WorkflowTask[]) {
  try {
    localStorage.setItem(STORAGE_KEY_POSS_TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.warn('[possessionV2Service] Failed to save possession tasks to localStorage', e);
  }
}

function calculateDashboardMetrics(records: PossessionRecord[]): PossessionDashboardData {
  let possessionTaken = 0;
  let possessionPending = 0;
  let inspectionsScheduled = 0;
  let disputedParcels = 0;

  for (const r of records) {
    if (r.status === 'POSSESSION_TAKEN' || r.status === 'COMPLETED') {
      possessionTaken += 1;
    } else if (r.status === 'INSPECTION_SCHEDULED') {
      inspectionsScheduled += 1;
      possessionPending += 1;
    } else if (r.status === 'DISPUTED') {
      disputedParcels += 1;
      possessionPending += 1;
    } else {
      possessionPending += 1;
    }
  }

  return {
    totalParcels: records.length,
    possessionTaken,
    possessionPending,
    inspectionsScheduled,
    disputedParcels,
  };
}

export const possessionV2Service = {
  /**
   * GET /api/v1/possession/dashboard
   * Spec Line 291: Returns Possession Officer work metrics and authorized possession summary.
   */
  async getDashboard(): Promise<PossessionDashboardData> {
    try {
      const res = await apiClient.get<any>('/possession/dashboard');
      const data = res.data?.data || res.data;
      if (data) {
        const metrics = data.metrics || data;
        return {
          totalParcels: Number(metrics.totalParcels || (data.records ? data.records.length : 0)),
          possessionTaken: Number(metrics.possessionTaken || metrics.completedCount || 0),
          possessionPending: Number(metrics.possessionPending || metrics.pendingCount || 0),
          inspectionsScheduled: Number(metrics.inspectionsScheduled || 0),
          disputedParcels: Number(metrics.disputedParcels || metrics.disputedCount || 0),
        };
      }
    } catch (err) {
      console.warn('[possessionV2Service] GET /api/v1/possession/dashboard using local state:', err);
    }
    const records = getLocalRecords();
    return calculateDashboardMetrics(records);
  },

  /**
   * GET /api/v1/possession/tasks?assignedTo=me
   * Spec Line 294: Returns possession tasks assigned to the authenticated Possession Officer.
   */
  async getMyTasks(): Promise<WorkflowTask[]> {
    const demoProjectId = localStorage.getItem('bhoomi_demo_active_project_id') || '4ed46de6-586e-4459-b011-f090a1c3bafd';
    const demoProjectTitle = localStorage.getItem('bhoomi_demo_active_project_title') || 'Delhi Metro Phase-IV Rithala Rapid Transit Corridor';
    const demoProjectCode = localStorage.getItem('bhoomi_demo_active_project_code') || 'PRJ-DL-7701';

    let list: WorkflowTask[] = [];
    try {
      const res = await apiClient.get<any>('/possession/tasks', {
        params: { assignedTo: 'me' },
      });
      const data = res.data?.data || res.data;
      if (data && Array.isArray(data) && data.length > 0) {
        list = data;
      }
    } catch (err) {
      console.warn('[possessionV2Service] GET /api/v1/possession/tasks using local state:', err);
    }

    if (list.length === 0) {
      list = getLocalTasks();
    }

    // Isolate tasks strictly to the active Rithala/demo project so only this project is visible
    const filtered = list.filter((t) => {
      const pId = t.projectId || '';
      const pCode = t.projectCode || '';
      const dist = (t.district || (t.parcel as any)?.district || '').toLowerCase();
      return (
        pId === demoProjectId ||
        pCode === demoProjectCode ||
        dist === 'rithala' ||
        pCode.includes('7701') ||
        pId === '4ed46de6-586e-4459-b011-f090a1c3bafd'
      );
    });

    const targetList = filtered.length > 0 ? filtered : getLocalTasks();
    return targetList.map((t) => ({
      ...t,
      projectId: demoProjectId,
      projectTitle: demoProjectTitle,
      projectCode: demoProjectCode,
      district: 'Rithala',
      state: 'Delhi',
      assignedOfficer: {
        id: 'possession.officer@bhoomi.gov.in',
        name: 'Vinayak Kulkarni',
        designation: 'Tehsildar & Statutory Possession Officer',
        role: 'POSSESSION_OFFICER',
        department: 'Revenue & Land Records Office (Rohini / Rithala Zone)',
        authority: 'Tehsildar & Competent Land Officer',
        jurisdiction: 'Rithala, Delhi',
        district: 'Rithala',
        state: 'Delhi',
      },
    }));
  },

  /**
   * GET /api/v1/possession/records/:recordId
   * Spec Line 297: Returns an authorized possession record and its evidence/status context.
   */
  async getRecord(recordId: string): Promise<PossessionRecord | null> {
    try {
      const res = await apiClient.get<any>(`/possession/records/${recordId}`);
      const data = res.data?.data || res.data;
      if (data && data.id) return data;
    } catch (err) {
      console.warn(`[possessionV2Service] GET /api/v1/possession/records/${recordId} using local state:`, err);
    }
    const records = getLocalRecords();
    return records.find((r) => r.id === recordId || r.taskId === recordId) || null;
  },

  /**
   * POST /api/v1/possession/records/:recordId/evidence
   * Spec Line 300: Uploads/links possession evidence, photos, or documents.
   */
  async uploadEvidence(
    recordId: string,
    payload: FormData | { title: string; type: string; coordinates?: { lat: number; lng: number } }
  ): Promise<PossessionEvidenceItem> {
    try {
      let res: any;
      if (payload instanceof FormData) {
        res = await apiClient.post(
          `/possession/records/${recordId}/evidence`,
          payload,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
      } else {
        res = await apiClient.post(`/possession/records/${recordId}/evidence`, payload);
      }
      const data = res?.data?.data || res?.data;
      if (data && data.id) return data;
    } catch (err) {
      console.warn(`[possessionV2Service] POST /api/v1/possession/records/${recordId}/evidence using local state:`, err);
    }

    const title = payload instanceof FormData ? (payload.get('title') as string) || 'Geotagged Boundary Peg Photo' : payload.title;
    const type = payload instanceof FormData ? ((payload.get('type') as any) || 'GEOTAGGED_PHOTO') : payload.type;
    const coords = payload instanceof FormData ? { lat: 18.5208, lng: 73.8572 } : payload.coordinates || { lat: 18.5208, lng: 73.8572 };

    const newEvidence: PossessionEvidenceItem = {
      id: `ev-poss-${Date.now()}`,
      title,
      type: type as any,
      uploadedAt: new Date().toISOString(),
      size: '2.6 MB',
      coordinates: coords,
      capturedBy: 'Shri V. R. Kadam (Possession Officer)',
    };

    const records = getLocalRecords();
    const updated = records.map((r) => {
      if (r.id === recordId || r.taskId === recordId) {
        return {
          ...r,
          evidenceItems: [newEvidence, ...(r.evidenceItems || [])],
          updatedAt: new Date().toISOString(),
        };
      }
      return r;
    });
    saveLocalRecords(updated);

    return newEvidence;
  },

  /**
   * POST /api/v1/possession/records/:recordId/complete
   * Spec Line 303: Marks possession completed after the officer performs the action and submits evidence;
   * updates possession, audit, notifications, acquisition lifecycle, GIS, dashboard,
   * and Passport views through shared data.
   * 
   * DIRECT SINGLE-STEP: NO SECOND APPROVAL STEP.
   */
  async completePossession(
    recordId: string,
    payload: { possessionDate: string; remarks?: string; evidenceIds?: string[] }
  ): Promise<PossessionRecord> {
    try {
      const res = await apiClient.post<any>(
        `/possession/records/${recordId}/complete`,
        payload
      );
      const data = res.data?.data || res.data;
      if (data && data.id) {
        const records = getLocalRecords().map((r) => (r.id === recordId ? data : r));
        saveLocalRecords(records);
        return data;
      }
    } catch (err) {
      console.warn(`[possessionV2Service] POST /api/v1/possession/records/${recordId}/complete using local state:`, err);
    }

    const records = getLocalRecords();
    let completedRecord: PossessionRecord | null = null;

    const updated = records.map((r) => {
      if (r.id === recordId || r.taskId === recordId) {
        const vestingCert: PossessionEvidenceItem = {
          id: `ev-vesting-${Date.now()}`,
          title: `Statutory Section 38 Vesting Certificate (Cadastre ${r.parcelId})`,
          type: 'VESTING_CERTIFICATE',
          uploadedAt: new Date().toISOString(),
          size: '1.9 MB',
        };

        completedRecord = {
          ...r,
          status: 'POSSESSION_TAKEN',
          possessionDate: payload.possessionDate || new Date().toISOString().split('T')[0],
          remarks: payload.remarks || 'Physical possession demarcated and vested unconditionally in the Government free from encumbrances under Section 38 RFCTLARR 2013.',
          evidenceItems: [vestingCert, ...(r.evidenceItems || [])],
          demarcationDetails: {
            boundaryStonesPegged: true,
            encroachmentCleared: true,
            revenueWitnesses: r.demarcationDetails?.revenueWitnesses || [
              'Shri S. V. Kulkarni (Talathi)',
              'Shri P. M. Jadhav (Circle Inspector)',
              'Er. Rahul S. Mehta (NHAI Site Engineer)',
            ],
            panchnamaSignedAt: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        };
        return completedRecord;
      }
      return r;
    });

    if (completedRecord) {
      saveLocalRecords(updated);

      // Also update matching task to ACCEPTED
      const tasks = getLocalTasks();
      const updatedTasks = tasks.map((t) => {
        if (t.id === (completedRecord as any).taskId || t.parcel?.id === (completedRecord as any).parcelId) {
          return {
            ...t,
            status: 'ACCEPTED' as const,
            completedAt: new Date().toISOString(),
            previousStageNotes: payload.remarks || 'Statutory land possession vested in Government',
          };
        }
        return t;
      });
      saveLocalTasks(updatedTasks);

      return completedRecord;
    }

    throw new Error(`Possession record ${recordId} not found`);
  },

  /**
   * Helper: Retrieve task by taskId for /possession/tasks/:taskId view
   */
  async getTaskById(taskId: string): Promise<WorkflowTask | null> {
    const tasks = await this.getMyTasks();
    return tasks.find((t) => t.id === taskId) || null;
  },

  /**
   * Helper: Reset demo state for interactive evaluation
   */
  resetDemoState(): void {
    saveLocalRecords(DEFAULT_POSS_RECORDS);
    saveLocalTasks(DEFAULT_POSS_TASKS);
  },
};
