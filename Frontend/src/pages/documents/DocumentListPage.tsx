import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentService } from '../../services/DocumentService';
import type { Document } from '../../services/DocumentService';
import BhoomiLogo from '../../components/common/BhoomiLogo';

export const DocumentListPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const data = await DocumentService.getDocuments();
        setDocuments(data);
      } catch (err) {
        console.error('Failed to fetch documents', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  const filteredDocs = documents.filter(doc => {
    if (statusFilter === 'ALL') return true;
    return doc.latestVerificationStatus === statusFilter;
  });

  const verifiedCount = documents.filter(d => d.latestVerificationStatus === 'VERIFIED').length;
  const pendingCount = documents.filter(d => d.latestVerificationStatus === 'PENDING').length;
  const rejectedCount = documents.filter(d => d.latestVerificationStatus === 'REJECTED').length;

  const premiumCardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
    border: '1px solid #e2e8f0',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.2s, boxShadow 0.2s',
  };

  return (
    <div className="boss-page-container" style={{ padding: '0 24px 40px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Masthead */}
      <header style={{ 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
        borderRadius: '20px', 
        padding: '32px 40px', 
        color: '#ffffff',
        marginTop: '24px',
        marginBottom: '32px',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />

        <div style={{ flex: 1, zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <BhoomiLogo size={32} strokeWidth={2.4} />
            <span style={{ 
              color: '#94a3b8',
              fontSize: '13px', 
              fontWeight: 700, 
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              Central Repository &bull; Tamper-Evident Storage
            </span>
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 700, margin: '0 0 12px 0', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
            Global Document Vault
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: '#cbd5e1', maxWidth: '600px', lineHeight: '1.5' }}>
            Immutable repository for all statutory infrastructure acquisition documents, including pre-feasibility reports, gazette notifications, awards, and compensation proofs.
          </p>
        </div>
        
        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)', 
          borderRadius: '16px', 
          padding: '20px',
          minWidth: '280px',
          zIndex: 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.3)' }} />
            <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vault Status: Active</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
            <span style={{ color: '#94a3b8' }}>Total Records:</span>
            <span style={{ fontWeight: 600, color: '#ffffff' }}>{documents.length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <span style={{ color: '#94a3b8' }}>Encryption:</span>
            <span style={{ fontWeight: 600, color: '#ffffff', fontFamily: 'monospace' }}>SHA-256</span>
          </div>
        </div>
      </header>

      {/* Triage Bar */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
        <div style={{ ...premiumCardStyle }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>Total Vaulted</div>
          <div style={{ fontSize: '42px', fontWeight: 700, color: '#0f172a', lineHeight: '1', marginBottom: '8px' }}>{documents.length}</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Cryptographically Sealed</div>
        </div>

        <div style={{ ...premiumCardStyle, borderBottom: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>Verified Evidence</div>
          <div style={{ fontSize: '42px', fontWeight: 700, color: '#10b981', lineHeight: '1', marginBottom: '8px' }}>{verifiedCount}</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Authorized by Nodal</div>
        </div>

        <div style={{ ...premiumCardStyle, borderBottom: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>Pending Scrutiny</div>
          <div style={{ fontSize: '42px', fontWeight: 700, color: '#f59e0b', lineHeight: '1', marginBottom: '8px' }}>{pendingCount}</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Awaiting Verification</div>
        </div>

        <div style={{ ...premiumCardStyle, borderBottom: rejectedCount > 0 ? '4px solid #ef4444' : '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>Rejected Revisions</div>
          <div style={{ fontSize: '42px', fontWeight: 700, color: rejectedCount > 0 ? '#ef4444' : '#0f172a', lineHeight: '1', marginBottom: '8px' }}>{rejectedCount}</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>Deficient Submissions</div>
        </div>
      </section>

      {/* Ledger Section */}
      <section style={{ backgroundColor: '#ffffff', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>Repository Register</h3>
            <span style={{ fontSize: '14px', color: '#64748b' }}>
              Secure index of scanned and uploaded dossiers.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f8fafc', padding: '6px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            {['ALL', 'VERIFIED', 'PENDING', 'REJECTED'].map(status => (
              <button
                key={status}
                type="button"
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: statusFilter === status ? '#ffffff' : 'transparent',
                  color: statusFilter === status ? '#0f172a' : '#64748b',
                  boxShadow: statusFilter === status ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s'
                }}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'ALL' ? `All (${documents.length})` : status}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
            <BhoomiLogo size={32} strokeWidth={2.4} />
            <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 500 }}>Accessing Secure Vault...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <p style={{ fontSize: '15px', color: '#64748b', fontWeight: 500 }}>No records match the selected filter.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '16px 20px', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9' }}>Document ID</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9' }}>Document Type & Stage</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9' }}>Linked Reference</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9' }}>Current Version</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9' }}>Status</th>
                  <th style={{ padding: '16px 20px', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', borderBottom: '2px solid #f1f5f9', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => (
                  <tr 
                    key={doc.id} 
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s', cursor: 'pointer' }} 
                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'} 
                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={() => navigate(`/documents/${doc.id}`)}
                  >
                    <td style={{ padding: '20px' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a', fontFamily: 'monospace', fontSize: '14px' }}>{doc.id}</span>
                    </td>
                    <td style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>{doc.title || doc.documentType.replace(/_/g, ' ')}</span>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>{doc.workflowStage || 'N/A'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{doc.projectTitle || doc.projectRef}</span>
                        {doc.parcelRef && <span style={{ fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>{doc.parcelRef}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '20px' }}>
                      <span style={{ display: 'inline-block', padding: '4px 8px', backgroundColor: '#f1f5f9', borderRadius: '6px', fontSize: '13px', fontWeight: 600, color: '#334155', fontFamily: 'monospace' }}>
                        v{doc.currentVersion}
                      </span>
                    </td>
                    <td style={{ padding: '20px' }}>
                      <span style={{ 
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        borderRadius: '20px',
                        ...(doc.latestVerificationStatus === 'VERIFIED' ? { backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' } : 
                            doc.latestVerificationStatus === 'REJECTED' ? { backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' } : 
                            { backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' })
                      }}>
                        {doc.latestVerificationStatus}
                      </span>
                    </td>
                    <td style={{ padding: '20px', textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/documents/${doc.id}`);
                        }}
                        style={{ 
                          display: 'inline-block',
                          padding: '8px 16px', 
                          fontSize: '13px',
                          fontWeight: 600,
                          backgroundColor: '#0f172a',
                          color: '#ffffff',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#1e293b'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = '#0f172a'}
                      >
                        Lineage &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default DocumentListPage;
