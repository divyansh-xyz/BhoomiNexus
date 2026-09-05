export interface DocumentVersion {
  id: string;
  versionNumber: number;
  hash: string;
  uploadedBy: string;
  uploadedAt: string;
  fileReference: string;
  processingStatus: 'PENDING' | 'PROCESSED' | 'FAILED';
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

export interface Document {
  id: string;
  documentType: 'LAND_RECORD' | 'AWARD_NOTICE' | 'COMPENSATION_RECEIPT' | 'POSSESSION_MEMO' | 'OTHER';
  projectRef: string;
  parcelRef?: string;
  workflowStage?: string;
  currentVersion: number;
  latestProcessingStatus: 'PENDING' | 'PROCESSED' | 'FAILED';
  latestVerificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  versions: DocumentVersion[];
}

// Mock Data
const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'DOC-9021',
    documentType: 'LAND_RECORD',
    projectRef: 'NH-66-EXP',
    parcelRef: 'MH-PN-004821',
    workflowStage: 'Initial Verification',
    currentVersion: 2,
    latestProcessingStatus: 'PROCESSED',
    latestVerificationStatus: 'VERIFIED',
    versions: [
      {
        id: 'VER-9021-1',
        versionNumber: 1,
        hash: '0xabc123...',
        uploadedBy: 'Ananya Patel',
        uploadedAt: '2026-08-30T10:00:00Z',
        fileReference: 's3://bucket/docs/9021-v1.pdf',
        processingStatus: 'PROCESSED',
        verificationStatus: 'REJECTED',
      },
      {
        id: 'VER-9021-2',
        versionNumber: 2,
        hash: '0xdef456...',
        uploadedBy: 'Ananya Patel',
        uploadedAt: '2026-09-01T14:30:00Z',
        fileReference: 's3://bucket/docs/9021-v2.pdf',
        processingStatus: 'PROCESSED',
        verificationStatus: 'VERIFIED',
      }
    ]
  },
  {
    id: 'DOC-4412',
    documentType: 'AWARD_NOTICE',
    projectRef: 'NH-66-EXP',
    parcelRef: 'MH-PN-004821',
    workflowStage: 'Award Declaration',
    currentVersion: 1,
    latestProcessingStatus: 'PENDING',
    latestVerificationStatus: 'PENDING',
    versions: [
      {
        id: 'VER-4412-1',
        versionNumber: 1,
        hash: '0x889fed...',
        uploadedBy: 'Sanjay Kumar',
        uploadedAt: '2026-09-05T08:15:00Z',
        fileReference: 's3://bucket/docs/4412-v1.pdf',
        processingStatus: 'PENDING',
        verificationStatus: 'PENDING',
      }
    ]
  }
];

export const DocumentService = {
  getDocuments: async (): Promise<Document[]> => {
    // Simulate network delay
    return new Promise(resolve => setTimeout(() => resolve([...MOCK_DOCUMENTS]), 800));
  },

  getDocumentDetail: async (id: string): Promise<Document | null> => {
    return new Promise(resolve => {
      setTimeout(() => {
        const doc = MOCK_DOCUMENTS.find(d => d.id === id);
        resolve(doc ? { ...doc } : null);
      }, 500);
    });
  },

  uploadDocumentVersion: async (id: string, _file: File): Promise<Document> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const docIndex = MOCK_DOCUMENTS.findIndex(d => d.id === id);
        if (docIndex === -1) {
          return reject(new Error('Document not found'));
        }

        const doc = MOCK_DOCUMENTS[docIndex];
        const newVersionNumber = doc.currentVersion + 1;
        
        const newVersion: DocumentVersion = {
          id: `VER-${id.split('-')[1]}-${newVersionNumber}`,
          versionNumber: newVersionNumber,
          hash: `0x${Math.random().toString(16).slice(2, 10)}...`,
          uploadedBy: 'Current User', // In real app, fetch from auth context
          uploadedAt: new Date().toISOString(),
          fileReference: `s3://bucket/docs/${id}-v${newVersionNumber}.pdf`,
          processingStatus: 'PENDING',
          verificationStatus: 'PENDING'
        };

        const updatedDoc = {
          ...doc,
          currentVersion: newVersionNumber,
          latestProcessingStatus: 'PENDING' as const,
          latestVerificationStatus: 'PENDING' as const,
          versions: [...doc.versions, newVersion]
        };

        MOCK_DOCUMENTS[docIndex] = updatedDoc;
        resolve(updatedDoc);
      }, 1500);
    });
  }
};
