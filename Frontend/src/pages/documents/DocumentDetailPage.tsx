import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DocumentService } from '../../services/DocumentService';
import type { Document } from '../../services/DocumentService';
import BhoomiLogo from '../../components/common/BhoomiLogo';

export const DocumentDetailPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchDoc = async () => {
      if (!documentId) return;
      try {
        const data = await DocumentService.getDocumentDetail(documentId);
        setDoc(data);
      } catch (err) {
        console.error('Failed to fetch document', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [documentId]);

  const handleUploadNewVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !documentId) return;

    setUploading(true);
    try {
      const updatedDoc = await DocumentService.uploadDocumentVersion(documentId, file);
      setDoc(updatedDoc);
    } catch (err) {
      console.error('Failed to upload new version', err);
      alert('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="boss-page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="boss-loading-ledger" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <BhoomiLogo size={40} strokeWidth={2.4} />
          <span style={{ fontSize: '18px', fontWeight: 500, color: '#475569' }}>Accessing Document Lineage...</span>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="boss-page-container" style={{ padding: '40px' }}>
        <div className="boss-empty-ledger" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '24px', color: '#0f172a', marginBottom: '12px' }}>Document Not Found</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>The specified document ID does not exist in the repository.</p>
          <Link to="/documents" style={{ 
            display: 'inline-block',
            padding: '10px 20px', 
            borderRadius: '8px', 
            backgroundColor: '#0f172a', 
            color: '#fff', 
            textDecoration: 'none',
            fontWeight: 600 
          }}>&larr; Return to Repository</Link>
        </div>
      </div>
    );
  }

  const sortedVersions = [...doc.versions].sort((a, b) => b.versionNumber - a.versionNumber);

  const premiumCardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
    border: '1px solid #e2e8f0',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  };

  const cardHeaderStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0f172a',
    letterSpacing: '-0.01em',
    paddingBottom: '16px',
    marginBottom: '20px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  return (
    <div className="boss-page-container" style={{ padding: '0 24px 40px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Hidden file input */}
      <input 
        type="file" 
        className="hidden" 
        style={{ display: 'none' }}
        ref={fileInputRef} 
        onChange={handleUploadNewVersion}
      />

      <div style={{ marginBottom: '16px', marginTop: '16px' }}>
        <Link to="/documents" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
          &larr; Back to Repository
        </Link>
      </div>

      {/* Premium Dark Blue Header */}
      <header style={{ 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
        borderRadius: '20px', 
        padding: '32px 40px', 
        color: '#ffffff',
        marginBottom: '32px',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle background accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
        
        <div style={{ flex: 1, zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ 
              background: 'rgba(255,255,255,0.15)', 
              color: '#ffffff',
              padding: '6px 12px', 
              borderRadius: '20px', 
              fontSize: '12px', 
              fontWeight: 700, 
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              ID: {doc.id}
            </span>
            <span style={{ 
              padding: '6px 12px', 
              fontSize: '12px', 
              fontWeight: 700, 
              borderRadius: '20px', 
              textTransform: 'uppercase',
              backgroundColor: doc.latestVerificationStatus === 'VERIFIED' ? '#10b981' : 
                              doc.latestVerificationStatus === 'REJECTED' ? '#ef4444' : '#f59e0b',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.3)'
            }}>
              {doc.latestVerificationStatus}
            </span>
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 700, margin: '0 0 12px 0', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
            {doc.documentType.replace(/_/g, ' ')}
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px' }}>
             Project: <strong style={{ color: '#ffffff' }}>{doc.projectRef}</strong>
             {doc.parcelRef && (
               <>
                 <span style={{ opacity: 0.5 }}>|</span>
                 Parcel: <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{doc.parcelRef}</span>
               </>
             )}
             <span style={{ opacity: 0.5 }}>|</span>
             Stage: <span>{doc.workflowStage || 'N/A'}</span>
          </p>
        </div>

        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)', 
          borderRadius: '16px', 
          padding: '20px',
          minWidth: '240px',
          zIndex: 1
        }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>Current Version</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>v{doc.currentVersion}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>Total Revisions</div>
            <div style={{ fontSize: '15px', fontWeight: 500, color: '#ffffff' }}>{doc.versions.length} versions archived</div>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
        
        {/* Left Column (Lineage Table) */}
        <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          <div style={premiumCardStyle}>
            <h4 style={cardHeaderStyle}>
              <span style={{ color: '#3b82f6' }}>&#128194;</span> Immutable Cryptographic Lineage
            </h4>
            
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '16px', fontSize: '12px', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' }}>Version ID</th>
                    <th style={{ padding: '16px', fontSize: '12px', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' }}>Timestamp & Author</th>
                    <th style={{ padding: '16px', fontSize: '12px', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' }}>Cryptographic Hash (SHA-256)</th>
                    <th style={{ padding: '16px', fontSize: '12px', color: '#64748b', fontWeight: 700, borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedVersions.map((v, idx) => {
                    const isCurrent = v.versionNumber === doc.currentVersion;
                    return (
                      <tr key={v.id} style={{ backgroundColor: isCurrent ? '#eff6ff' : (idx % 2 === 0 ? '#ffffff' : '#fafaf9'), transition: 'background-color 0.2s' }}>
                        <td style={{ padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: 600 }}>{v.id}</span>
                            {isCurrent && <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700, letterSpacing: '0.05em' }}>ACTIVE</span>}
                          </div>
                        </td>
                        <td style={{ padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontWeight: 600, color: '#334155' }}>{new Date(v.uploadedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            <span style={{ color: '#64748b', fontSize: '13px' }}>{v.uploadedBy}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px', borderBottom: '1px solid #f1f5f9' }}>
                          <span style={{ 
                            display: 'inline-block',
                            padding: '4px 8px',
                            backgroundColor: '#f1f5f9',
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            color: '#475569',
                            whiteSpace: 'nowrap'
                          }}>
                            {v.hash.substring(0, 16)}...
                          </span>
                        </td>
                        <td style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                          <button 
                            onClick={() => alert(`Initiating secure download from Object Storage: ${v.fileReference}`)}
                            style={{ 
                              padding: '6px 12px',
                              borderRadius: '6px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              color: '#0f172a',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.backgroundColor = '#f8fafc';
                              e.currentTarget.style.borderColor = '#94a3b8';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.backgroundColor = '#ffffff';
                              e.currentTarget.style.borderColor = '#cbd5e1';
                            }}
                          >
                            Download &darr;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (Actions) */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Action Card */}
          <div style={{
            ...premiumCardStyle,
            background: 'linear-gradient(to bottom, #ffffff, #f8fafc)',
            borderTop: '4px solid #3b82f6'
          }}>
            <h4 style={{ ...cardHeaderStyle, borderBottom: 'none', marginBottom: '8px' }}>
              Append to Lineage
            </h4>
            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '24px', lineHeight: '1.6' }}>
              A new version will be cryptographically hashed and appended without overwriting the existing history of this document.
            </p>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ 
                width: '100%', 
                padding: '16px', 
                borderRadius: '12px',
                backgroundColor: '#3b82f6', 
                color: '#ffffff', 
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                cursor: uploading ? 'wait' : 'pointer',
                boxShadow: uploading ? 'none' : '0 10px 20px rgba(59, 130, 246, 0.2)',
                transition: 'all 0.2s',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={e => !uploading && (e.currentTarget.style.backgroundColor = '#2563eb')}
              onMouseOut={e => !uploading && (e.currentTarget.style.backgroundColor = '#3b82f6')}
            >
              {uploading ? (
                <>Encrypting & Uploading...</>
              ) : (
                <>Select File to Upload &uarr;</>
              )}
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default DocumentDetailPage;
