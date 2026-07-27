import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';

const TYPE_CFG = {
  PDF:  { bg: '#fee2e2', color: '#dc2626' },
  DOCX: { bg: '#dbeafe', color: '#1d4ed8' },
  PPTX: { bg: '#fef3c7', color: '#b45309' },
  XLSX: { bg: '#d1fae5', color: '#047857' },
  MP4:  { bg: '#ede9fe', color: '#7c3aed' },
};

const STATUS_CFG = {
  Pending:  { cls: 'dm-badge-pending',  label: 'Pending Review' },
  Approved: { cls: 'dm-badge-approved', label: 'Approved' },
  Rejected: { cls: 'dm-badge-rejected', label: 'Rejected' },
};

const STATUSES = ['All Status', 'Pending', 'Approved', 'Rejected'];
const TYPES = ['All Types', 'PDF', 'DOCX', 'PPTX', 'XLSX', 'MP4'];
const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/$/, '');

function documentFileUrl(documentId, action) {
  if (!documentId) return '';
  return `${API_BASE}/documents/${documentId}/${action}`;
}

async function fetchDocumentBlob(documentId, action) {
  const token = localStorage.getItem('token');
  const response = await fetch(documentFileUrl(documentId, action), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Could not ${action} this document.`);
  }

  return response.blob();
}

function canEmbedPreview(type) {
  return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'txt', 'md', 'csv', 'mp4'].includes(String(type || '').toLowerCase());
}

function TypeBadge({ type }) {
  const normalized = String(type || '').toUpperCase();
  const c = TYPE_CFG[normalized] || { bg: '#f0edf8', color: '#5e5b73' };
  return (
    <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 5, background: c.bg, color: c.color, fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', flexShrink: 0 }}>
      {normalized || 'FILE'}
    </span>
  );
}

function ChevronIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DocumentManagementPage() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [courseFilter, setCourseFilter] = useState('All Courses');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [approveDoc, setApproveDoc] = useState(null);
  const [rejectDoc, setRejectDoc] = useState(null);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await adminService.getDocuments();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load documents.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (!preview?.id || !canEmbedPreview(preview.type)) {
      setPreviewUrl('');
      setPreviewError('');
      return undefined;
    }

    let objectUrl = '';
    let cancelled = false;
    setPreviewUrl('');
    setPreviewError('');

    fetchDocumentBlob(preview.id, 'preview')
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch((err) => {
        if (!cancelled) setPreviewError(err.message || 'Could not preview this document.');
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [preview?.id, preview?.type]);

  const handleDownloadDocument = async (document) => {
    try {
      setError('');
      const blob = await fetchDocumentBlob(document.id, 'download');
      const objectUrl = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = objectUrl;
      link.download = document.documentName || document.title || `document-${document.id}`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err.message || 'Could not download this document.');
    }
  };

  const updateDocumentInState = (updatedDocument) => {
    setDocuments(current => current.map(doc => doc.id === updatedDocument.id ? updatedDocument : doc));
    setPreview(current => current?.id === updatedDocument.id ? updatedDocument : current);
  };

  const handleStatusChange = async (document, status, reason = '') => {
    try {
      setIsSaving(true);
      setError('');
      const updatedDocument = await adminService.updateDocumentStatus(document.id, status, reason);
      updateDocumentInState(updatedDocument);
      setApproveDoc(null);
      setRejectDoc(null);
      setRejectReason('');
    } catch (err) {
      setError(err.message || 'Could not update document.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteDoc) return;
    try {
      setIsSaving(true);
      setError('');
      await adminService.deleteDocument(deleteDoc.id);
      setDocuments(current => current.filter(doc => doc.id !== deleteDoc.id));
      setPreview(current => current?.id === deleteDoc.id ? null : current);
      setDeleteDoc(null);
    } catch (err) {
      setError(err.message || 'Could not delete document.');
    } finally {
      setIsSaving(false);
    }
  };

  const getCourseLabel = (doc) => [doc.semester, doc.course].filter(Boolean).join(' / ') || 'Unassigned Course';
  const courseOptions = ['All Courses', ...Array.from(new Set(documents.map(getCourseLabel))).sort()];
  const statusPriority = { Pending: 0, Approved: 1, Rejected: 2 };

  const filtered = documents
    .filter(d => {
      if (courseFilter !== 'All Courses' && getCourseLabel(d) !== courseFilter) return false;
      if (statusFilter !== 'All Status' && d.status !== statusFilter) return false;
      if (typeFilter !== 'All Types' && d.type !== typeFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const statusDiff = (statusPriority[a.status] ?? 9) - (statusPriority[b.status] ?? 9);
      if (statusDiff !== 0) return statusDiff;
      return Number(b.id || 0) - Number(a.id || 0);
    });

  const pending = documents.filter(d => d.status === 'Pending').length;
  const approved = documents.filter(d => d.status === 'Approved').length;
  const rejected = documents.filter(d => d.status === 'Rejected').length;
  const totalSize = documents.reduce((sum, doc) => sum + Number(doc.sizeMb || 0), 0);

  return (
    <>
      <div className="dm-page">
        <div>
          <h1 className="dm-title">Document Management</h1>
          <p className="dm-subtitle">Review and approve files uploaded by users. Published documents are accessible to all enrolled students.</p>
        </div>

        <div className="dm-stats-row">
          <div className="dm-stat-card">
            <div className="dm-stat-label">TOTAL DOCUMENTS</div>
            <div className="dm-stat-value">{documents.length}</div>
          </div>
          <div className="dm-stat-card">
            <div className="dm-stat-label">PENDING REVIEW</div>
            <div className="dm-stat-value dm-stat-orange">{pending}</div>
          </div>
          <div className="dm-stat-card">
            <div className="dm-stat-label">APPROVED</div>
            <div className="dm-stat-value dm-stat-green">{approved}</div>
          </div>
          <div className="dm-stat-card">
            <div className="dm-stat-label">REJECTED</div>
            <div className="dm-stat-value dm-stat-red">{rejected}</div>
          </div>
          <div className="dm-stat-card">
            <div className="dm-stat-label">TOTAL SIZE</div>
            <div className="dm-stat-value" style={{ fontSize: 22 }}>{totalSize.toFixed(1)} MB</div>
          </div>
        </div>

        <div className="dm-table-card">
          <div className="dm-filters">
            {[
              { value: courseFilter, options: courseOptions, setter: setCourseFilter },
              { value: statusFilter, options: STATUSES, setter: setStatusFilter },
              { value: typeFilter, options: TYPES, setter: setTypeFilter },
            ].map(({ value, options, setter }) => (
              <div key={value} className="ptm-select-wrap">
                <select className="ptm-select" value={value} onChange={e => setter(e.target.value)}>
                  {options.map(o => <option key={o}>{o}</option>)}
                </select>
                <ChevronIcon />
              </div>
            ))}
            <span className="dm-filter-result">{filtered.length} documents</span>
          </div>

          {error && <div className="dm-empty" style={{ color: '#dc2626' }}>{error}</div>}
          {isLoading && <div className="dm-empty">Loading documents...</div>}

          {!isLoading && (
            <table className="dm-table">
              <thead>
                <tr>
                  <th>DOCUMENT</th>
                  <th>COURSE</th>
                  <th>UPLOADED BY</th>
                  <th>UPLOADED AT</th>
                  <th>SIZE</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(doc => {
                  const s = STATUS_CFG[doc.status] || {};
                  const uploader = doc.uploader || {};
                  return (
                    <tr key={doc.id} className="dm-row">
                      <td>
                        <div className="dm-doc-cell">
                          <div>
                            <div className="dm-doc-name">{doc.title}</div>
                            <div className="dm-doc-meta" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <TypeBadge type={doc.type} />
                              <span>{doc.semester}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="dm-cell-muted">
                        <div style={{ fontWeight: 700, color: '#2f2a3d' }}>{doc.course}</div>
                        <div style={{ marginTop: 3, fontSize: 11, color: '#8b8798' }}>{doc.semester}</div>
                      </td>
                      <td>
                        <div className="dm-uploader">
                          <div className="dm-avatar" style={{ background: uploader.color || '#DBEAFE', color: uploader.text || '#1D4ED8' }}>
                            {uploader.initials || 'U'}
                          </div>
                          <span className="dm-uploader-name">{uploader.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="dm-cell-muted">{doc.uploadedAt}</td>
                      <td className="dm-cell-muted">{doc.size}</td>
                      <td><span className={`dm-status-badge ${s.cls || ''}`}>{s.label || doc.status}</span></td>
                      <td>
                        <div className="dm-actions">
                          <button className="dm-action-btn" title="Preview" onClick={() => setPreview(doc)}><EyeIcon /></button>
                          {doc.status === 'Pending' && (
                            <>
                              <button className="dm-action-btn dm-action-approve" title="Approve" onClick={() => setApproveDoc(doc)}><CheckIcon /></button>
                              <button className="dm-action-btn dm-action-reject" title="Reject" onClick={() => { setRejectDoc(doc); setRejectReason(''); }}><XIcon /></button>
                            </>
                          )}
                          <button className="dm-action-btn dm-action-delete" title="Delete" onClick={() => setDeleteDoc(doc)}><TrashIcon /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!isLoading && filtered.length === 0 && <div className="dm-empty">No documents match the selected filters.</div>}
        </div>
      </div>

      {preview && (
        <div className="lib-modal-overlay" onClick={() => setPreview(null)}>
          <div className="dm-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="dm-preview-header">
              <div className="dm-preview-header-left">
                <div>
                  <h2 className="dm-preview-title">{preview.title}</h2>
                  <p className="dm-preview-meta">
                    <TypeBadge type={preview.type} />&nbsp;&nbsp;{preview.course} &nbsp;&bull;&nbsp; {preview.semester} &nbsp;&bull;&nbsp; {preview.size}
                  </p>
                </div>
              </div>
              <button className="rq-close-btn" aria-label="Close preview" onClick={() => setPreview(null)}>x</button>
            </div>
            <div className="dm-review-layout">
              <div className="dm-preview-body">
                {canEmbedPreview(preview.type) ? (
                  previewUrl ? (
                    <iframe className="dm-preview-frame" title={`Preview ${preview.title}`} src={previewUrl} />
                  ) : (
                    <div className="dm-preview-thumb">
                      <p>{previewError || 'Loading preview...'}</p>
                    </div>
                  )
                ) : (
                  <div className="dm-preview-thumb">
                    <TypeBadge type={preview.type} />
                    <p className="dm-preview-thumb-name">{preview.title}</p>
                    <p className="dm-preview-thumb-size">{preview.size}</p>
                  </div>
                )}
              </div>
              <div className="dm-preview-info">
                <div className="dm-preview-info-row">
                  <span>Uploaded by</span>
                  <strong>{preview.uploader?.name || 'Unknown'}</strong>
                </div>
                <div className="dm-preview-info-row">
                  <span>Upload time</span>
                  <strong>{preview.uploadedAt}</strong>
                </div>
                <div className="dm-preview-info-row">
                  <span>Status</span>
                  <span className={`dm-status-badge ${STATUS_CFG[preview.status]?.cls || ''}`}>{STATUS_CFG[preview.status]?.label || preview.status}</span>
                </div>
                <div className="dm-preview-info-row dm-preview-info-description">
                  <span>Description</span>
                  <strong>{preview.description || 'No description'}</strong>
                </div>
                <div className="dm-preview-info-row">
                  <span>File</span>
                  <button type="button" className="dm-download-link" onClick={() => handleDownloadDocument(preview)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {approveDoc && (
        <div className="lib-modal-overlay" onClick={() => setApproveDoc(null)}>
          <div className="lib-modal-card lib-modal-delete" onClick={e => e.stopPropagation()}>
            <div className="lib-modal-icon-wrap" style={{ background: '#d1fae5', color: '#047857' }}><CheckIcon /></div>
            <h2 className="lib-modal-title">Approve & Publish</h2>
            <p className="lib-modal-subtitle">This document will be published and accessible to enrolled students.</p>
            <div className="dm-confirm-doc">
              <div>
                <div className="dm-confirm-doc-name">{approveDoc.title}</div>
                <div className="dm-confirm-doc-meta"><TypeBadge type={approveDoc.type} />&nbsp;&nbsp;Uploaded by {approveDoc.uploader?.name || 'Unknown'} &nbsp;&bull;&nbsp; {approveDoc.size}</div>
              </div>
            </div>
            <div className="lib-modal-divider" />
            <div className="lib-modal-footer">
              <button className="lib-modal-cancel-btn" onClick={() => setApproveDoc(null)}>Cancel</button>
              <button className="lib-modal-save-btn" disabled={isSaving} onClick={() => handleStatusChange(approveDoc, 'Approved')}>
                {isSaving ? 'Saving...' : 'Approve Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectDoc && (
        <div className="lib-modal-overlay" onClick={() => setRejectDoc(null)}>
          <div className="lib-modal-card lib-modal-delete" onClick={e => e.stopPropagation()}>
            <div className="lib-modal-icon-wrap lib-modal-icon-danger"><XIcon size={20} /></div>
            <h2 className="lib-modal-title">Reject Document</h2>
            <p className="lib-modal-subtitle">This document will be rejected. Please provide a reason for the uploader.</p>
            <div className="dm-confirm-doc">
              <div>
                <div className="dm-confirm-doc-name">{rejectDoc.title}</div>
                <div className="dm-confirm-doc-meta"><TypeBadge type={rejectDoc.type} />&nbsp;&nbsp;Uploaded by {rejectDoc.uploader?.name || 'Unknown'}</div>
              </div>
            </div>
            <div className="lib-form-group" style={{ marginTop: 16 }}>
              <label className="lib-form-label">Reason for rejection</label>
              <textarea className="lib-form-input rq-textarea" placeholder="e.g. Poor quality, incorrect content, copyright issue..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} />
            </div>
            <div className="lib-modal-divider" />
            <div className="lib-modal-footer">
              <button className="lib-modal-cancel-btn" onClick={() => setRejectDoc(null)}>Cancel</button>
              <button className="lib-modal-delete-btn" disabled={isSaving} onClick={() => handleStatusChange(rejectDoc, 'Rejected', rejectReason)}>
                {isSaving ? 'Saving...' : 'Reject Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteDoc && (
        <div className="lib-modal-overlay" onClick={() => setDeleteDoc(null)}>
          <div className="lib-modal-card lib-modal-delete" onClick={e => e.stopPropagation()}>
            <div className="lib-modal-icon-wrap lib-modal-icon-danger"><TrashIcon /></div>
            <h2 className="lib-modal-title">Delete Document</h2>
            <p className="lib-modal-subtitle">This will permanently delete the document from the database and notify the uploader.</p>
            <div className="dm-confirm-doc">
              <div>
                <div className="dm-confirm-doc-name">{deleteDoc.title}</div>
                <div className="dm-confirm-doc-meta"><TypeBadge type={deleteDoc.type} />&nbsp;&nbsp;Uploaded by {deleteDoc.uploader?.name || 'Unknown'}</div>
              </div>
            </div>
            <div className="lib-modal-divider" />
            <div className="lib-modal-footer">
              <button className="lib-modal-cancel-btn" onClick={() => setDeleteDoc(null)}>Cancel</button>
              <button className="lib-modal-delete-btn" disabled={isSaving} onClick={handleDeleteDocument}>
                {isSaving ? 'Deleting...' : 'Delete Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DocumentManagementPage;
