import { apiClient } from './api/client';

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
  projectTitle?: string;
  parcelRef?: string;
  workflowStage?: string;
  currentVersion: number;
  latestProcessingStatus: 'PENDING' | 'PROCESSED' | 'FAILED';
  latestVerificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  title?: string;
  versions: DocumentVersion[];
}

export const DocumentService = {
  getDocuments: async (projectId?: string): Promise<Document[]> => {
    let url = '/documents';
    if (projectId) {
      url += `?projectId=${projectId}`;
    }
    const res = await apiClient.get<Document[]>(url);
    return res.data;
  },

  getDocumentDetail: async (id: string): Promise<Document | null> => {
    try {
      // Use getDocuments to construct everything natively or use /:id and mapping
      // Because /documents already returns the nested 'versions' structure, we can just call that and filter. 
      // But for better performance, we should use the specific document API.
      
      const resSpecific = await apiClient.get(`/documents/${id}`);
      const resVersions = await apiClient.get(`/documents/${id}/versions`);
      
      const d = resSpecific.data;
      const v = resVersions.data;
      
      return {
        id: d.id,
        documentType: d.documentType || 'OTHER',
        projectRef: d.projectId || 'UNASSIGNED',
        projectTitle: d.projectTitle,
        parcelRef: d.parcelId,
        workflowStage: d.workflowStage,
        currentVersion: d.currentVersion,
        latestProcessingStatus: d.processingStatus || 'PENDING',
        latestVerificationStatus: d.verificationStatus || 'PENDING',
        title: d.title,
        versions: v.map((ver: any) => ({
          id: ver.id,
          versionNumber: ver.version_number,
          hash: ver.hash || 'N/A',
          uploadedBy: ver.uploader_name || 'Unknown',
          uploadedAt: ver.created_at,
          fileReference: ver.file_path,
          processingStatus: d.processingStatus || 'PENDING',
          verificationStatus: d.verificationStatus || 'PENDING'
        }))
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  uploadDocumentVersion: async (id: string, file: File, changeNotes?: string): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    if (changeNotes) {
      formData.append('changeNotes', changeNotes);
    }
    
    await apiClient.post(`/documents/${id}/versions`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    const updatedDoc = await DocumentService.getDocumentDetail(id);
    if (!updatedDoc) throw new Error("Failed to retrieve updated document");
    return updatedDoc;
  },

  downloadDocument: async (id: string, filename: string = 'document.pdf') => {
    const res = await apiClient.get(`/documents/${id}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};
