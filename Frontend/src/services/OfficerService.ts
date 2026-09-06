import { apiClient } from './api/client';

const API_BASE_URL = 'http://localhost:8000/api/v1';

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
  backendDocId?: string;
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
  
  // Phase 9 & 10: Real AI Document Parser Integration + Document Vault Integration
  uploadEvidence: async (taskId: string, file: File): Promise<{ success: boolean; documentId?: string }> => {
    try {
      // 1. Upload to Node Backend (so it appears in Document Vault)
      const vaultFormData = new FormData();
      vaultFormData.append('file', file);
      vaultFormData.append('taskId', taskId);
      
      try {
        await apiClient.post('/documents/upload', vaultFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } catch (vaultError) {
        console.error('Failed to upload to Document Vault:', vaultError);
        // Continue anyway to not break OCR
      }

      // 2. Upload to AI Document Parser (for OCR extraction)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('taskId', taskId);

      const response = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload to AI Parser failed');
      const data = await response.json();
      
      // Backend returns document_id upon 201 Created or 202 Accepted
      return { success: true, documentId: data.document_id || data.id };
    } catch (error) {
      console.error('Evidence upload error:', error);
      return { success: false };
    }
  },

  getProcessingStatus: async (docId: string): Promise<{ overall_status: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${docId}/processing`);
      if (!response.ok) throw new Error('Failed to fetch processing status');
      return await response.json();
    } catch (error) {
      console.error('Status polling error:', error);
      return { overall_status: 'error' };
    }
  },

  getOcrExtractionStatus: async (_taskId: string, docId: string): Promise<OcrExtractionResult> => {
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${docId}/extraction`);
      if (!response.ok) throw new Error('Failed to fetch extracted data');
      const data = await response.json();

      return {
        docId,
        status: 'COMPLETED',
        extractedData: data.extracted_data || data.fields,
        confidenceScores: data.confidence_scores
      };
    } catch (error) {
      console.error('Extraction fetch error:', error);
      // Fallback for UI resilience if backend structure differs slightly initially
      return {
        docId,
        status: 'COMPLETED',
        extractedData: { error: 'Failed to parse AI response' } as any
      };
    }
  },

  submitOcrVerification: async (taskId: string, docId: string, backendDocId: string | undefined, verifiedData: any): Promise<{ success: boolean }> => {
    try {
      // Use backend doc ID if available, fallback to mock docId
      const targetId = backendDocId || docId;
      const response = await fetch(`${API_BASE_URL}/documents/${targetId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          taskId,
          status: 'approved',
          corrected_fields: verifiedData 
        }),
      });
      
      if (!response.ok) throw new Error('Verification failed');
      return { success: true };
    } catch (error) {
      console.error('Verification submit error:', error);
      return { success: false };
    }
  }
};
