export interface OfficerTask {
  id: string;
  projectId: string;
  projectName: string;
  stageName: string;
  dueDate: string;
  status: 'PENDING' | 'OVERDUE' | 'COMPLETED';
  assignedDate: string;
  department: string;
}

export interface TaskDetail extends OfficerTask {
  projectType: string;
  state: string;
  district: string;
  requiredArea: string;
  requiredDocuments: Array<{
    id: string;
    name: string;
    type: string;
    status: 'MISSING' | 'UPLOADED' | 'VERIFIED';
  }>;
  relevantParcels: Array<{
    id: string;
    surveyNumber: string;
    village: string;
    area: string;
  }>;
  previousStageNotes: string;
}

const mockTasks: OfficerTask[] = [
  {
    id: 'TASK-2026-001',
    projectId: 'PRJ-MH-4421',
    projectName: 'Mumbai-Pune Expressway Expansion - Phase 3',
    stageName: 'Initial Document Verification',
    dueDate: '2026-09-10',
    status: 'PENDING',
    assignedDate: '2026-09-01',
    department: 'Revenue Department'
  },
  {
    id: 'TASK-2026-002',
    projectId: 'PRJ-KA-8890',
    projectName: 'Bengaluru Suburban Rail Corridor',
    stageName: 'Cadastral Parcel Verification',
    dueDate: '2026-09-02',
    status: 'OVERDUE',
    assignedDate: '2026-08-25',
    department: 'Survey Settlement'
  },
  {
    id: 'TASK-2026-003',
    projectId: 'PRJ-UP-1102',
    projectName: 'Agra Solar Power Park',
    stageName: 'Departmental Scrutiny',
    dueDate: '2026-09-15',
    status: 'PENDING',
    assignedDate: '2026-09-04',
    department: 'Energy Department'
  }
];

const mockTaskDetails: Record<string, TaskDetail> = {
  'TASK-2026-001': {
    ...mockTasks[0],
    projectType: 'Highway Infrastructure',
    state: 'Maharashtra',
    district: 'Pune',
    requiredArea: '150.5 Acres',
    requiredDocuments: [
      { id: 'DOC-1', name: 'Original Request Proposal.pdf', type: 'Proposal', status: 'VERIFIED' },
      { id: 'DOC-2', name: 'Land Schedule Form.pdf', type: 'Land Schedule', status: 'UPLOADED' },
      { id: 'DOC-3', name: 'Physical Verification Sign-off', type: 'Hard-Copy Evidence', status: 'MISSING' }
    ],
    relevantParcels: [
      { id: 'PCL-01', surveyNumber: '45/A', village: 'Hinjewadi', area: '12.4 Acres' },
      { id: 'PCL-02', surveyNumber: '45/B', village: 'Hinjewadi', area: '8.1 Acres' },
      { id: 'PCL-03', surveyNumber: '112', village: 'Wakad', area: '22.0 Acres' }
    ],
    previousStageNotes: 'BOSS Note: Ensure that the land schedule matches the newly uploaded ULPIN records.'
  },
  'TASK-2026-002': {
    ...mockTasks[1],
    projectType: 'Rail Infrastructure',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    requiredArea: '45.0 Acres',
    requiredDocuments: [
      { id: 'DOC-4', name: 'Survey Alignment Map.pdf', type: 'Map', status: 'UPLOADED' }
    ],
    relevantParcels: [
      { id: 'PCL-04', surveyNumber: '18', village: 'Yeshwanthpur', area: '15.0 Acres' }
    ],
    previousStageNotes: 'BOSS Note: Delay expected due to incomplete cadastral mapping in Yeshwanthpur sector.'
  }
};

export interface OcrExtractionResult {
  docId: string;
  status: 'PENDING' | 'OCR_PROCESSING' | 'GEMINI_EXTRACTING' | 'COMPLETED';
  extractedData?: {
    surveyNumber: string;
    area: string;
    village: string;
    district: string;
    notificationNo: string;
    notificationDate: string;
  };
  confidenceScores?: {
    surveyNumber: number;
    area: number;
    village: number;
  };
}

export const OfficerService = {
  getAssignedTasks: async (): Promise<OfficerTask[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockTasks), 600);
    });
  },

  getTaskDetail: async (taskId: string): Promise<TaskDetail | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockTaskDetails[taskId] || null);
      }, 800);
    });
  },

  acceptTask: async (_taskId: string): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ success: true }), 1000);
    });
  },

  rejectTask: async (_taskId: string, _reason: string): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ success: true }), 1000);
    });
  },
  
  uploadEvidence: async (_taskId: string, _file: File): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ success: true }), 1500);
    });
  },

  // Phase 9 Mock Methods
  getOcrExtractionStatus: async (_taskId: string, docId: string): Promise<OcrExtractionResult> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          docId,
          status: 'COMPLETED',
          extractedData: {
            surveyNumber: 'MH-PN-004821',
            area: '2.41 acres',
            village: 'ABC',
            district: 'Pune',
            notificationNo: 'N-2026-182',
            notificationDate: '2026-09-01'
          },
          confidenceScores: {
            surveyNumber: 97,
            area: 94,
            village: 99
          }
        });
      }, 500);
    });
  },

  submitOcrVerification: async (_taskId: string, _docId: string, _verifiedData: any): Promise<{ success: boolean }> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ success: true }), 1000);
    });
  }
};
