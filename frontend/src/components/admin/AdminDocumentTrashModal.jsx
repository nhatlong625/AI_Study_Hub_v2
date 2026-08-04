import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { API_BASE_URL as API_BASE } from '../../config/api';

function canEmbedPreview(type) {
  return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'txt', 'md', 'csv', 'mp4']
    .includes(String(type || '').toLowerCase());
}

async function fetchTrashBlob(documentId) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/admin/documents/trash/${documentId}/preview`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Could not preview this trashed document.');
  }
  return response.blob();
}

export default function AdminDocumentTrashModal({ onClose, onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    adminService.getDocumentTrash()
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(err => setError(err.message || 'Could not load Trash.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!preview) {
      setPreviewUrl('');
      return undefined;
    }
    let url = '';
    let cancelled = false;
    setError('');
    fetchTrashBlob(preview.documentId)
      .then(blob => {
        if (!cancelled) {
          url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
      })
      .catch(err => setError(err.message));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview]);

  async function restore(item) {
    setBusyId(item.documentId);
    setError('');
    try {
      await adminService.restoreDocumentFromTrash(item.documentId);
      const next = items.filter(entry => entry.documentId !== item.documentId);
      setItems(next);
      setPreview(null);
      onChanged?.(next.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function purge(item) {
    if (!window.confirm(`Permanently delete "${item.title || item.documentName}"? This cannot be undone.`)) return;
    setBusyId(item.documentId);
    setError('');
    try {
      await adminService.purgeDocumentFromTrash(item.documentId);
      const next = items.filter(entry => entry.documentId !== item.documentId);
      setItems(next);
      setPreview(null);
      onChanged?.(next.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="lib-modal-overlay admin-trash-overlay" onMouseDown={onClose}>
      <div
        className="lib-modal-card admin-trash-modal"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="admin-trash-header">
          <div>
            <h2 className="lib-modal-title">Document Trash</h2>
            <p className="admin-trash-subtitle">Preview, restore, or permanently delete documents. Items expire after 30 days.</p>
          </div>
          <button className="admin-trash-close" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>
        {error && <p className="lib-form-hint" style={{ color: '#dc2626', padding: '0 24px' }}>{error}</p>}
        <div className="admin-trash-content">
          <div className="admin-trash-list">
            {loading ? <p className="lib-form-hint" style={{ padding: 20 }}>Loading Trash...</p> : items.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 100, color: '#94a3b8' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px', display: 'block', opacity: 0.5 }}>
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p style={{ fontSize: 14, fontWeight: 600 }}>Trash is empty.</p>
              </div>
            ) : items.map(item => {
              const isSelected = preview?.documentId === item.documentId;
              const type = String(item.documentType || 'PDF').toUpperCase();
              return (
                <div
                  key={item.documentId}
                  style={{
                    border: isSelected ? '2px solid #6366f1' : '1px solid #e2e8f0',
                    borderRadius: 14,
                    padding: 16,
                    marginBottom: 14,
                    background: isSelected ? '#f5f3ff' : '#ffffff',
                    boxShadow: isSelected ? '0 4px 12px rgba(99, 102, 241, 0.12)' : '0 2px 4px rgba(0,0,0,0.02)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setPreview(item)}
                    style={{ display: 'block', width: '100%', border: 0, padding: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{
                        padding: '2px 7px',
                        borderRadius: 6,
                        background: type === 'PDF' ? '#fee2e2' : '#dbeafe',
                        color: type === 'PDF' ? '#dc2626' : '#1d4ed8',
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: '0.04em'
                      }}>
                        {type}
                      </span>
                      <strong style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.title || item.documentName}
                      </strong>
                    </div>

                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginBottom: 8 }}>
                      <span>{item.ownerName || item.ownerEmail || 'Unknown uploader'}</span>
                      {item.subjectName && <span> &bull; {item.subjectName}</span>}
                    </div>

                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#d97706', background: '#fffbeb', padding: '3px 8px', borderRadius: 6, border: '1px solid #fef3c7' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      Deletes in {item.remainingDays} day{item.remainingDays === 1 ? '' : 's'}
                    </div>
                  </button>

                  <div style={{ display: 'flex', gap: 10, marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                    <button
                      type="button"
                      disabled={busyId === item.documentId}
                      onClick={() => restore(item)}
                      style={{
                        flex: 1,
                        padding: '8px 14px',
                        background: '#ffffff',
                        border: '1px solid #6366f1',
                        color: '#4f46e5',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {busyId === item.documentId ? 'Restoring...' : 'Restore'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.documentId}
                      onClick={() => purge(item)}
                      style={{
                        flex: 1,
                        padding: '8px 14px',
                        background: '#ef4444',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {busyId === item.documentId ? 'Deleting...' : 'Delete permanently'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="admin-trash-preview">
            {!preview ? (
              <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 10px', display: 'block', opacity: 0.4 }}>
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <p style={{ fontSize: 13, fontWeight: 500 }}>Select a document from the left list to preview it here.</p>
              </div>
            ) : (
              <>
                <div style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>This document is in Trash and will be permanently deleted in <strong>{preview.remainingDays} days</strong>.</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" disabled={busyId === preview.documentId} onClick={() => restore(preview)} style={{ padding: '4px 12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Restore</button>
                    <button type="button" disabled={busyId === preview.documentId} onClick={() => purge(preview)} style={{ padding: '4px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
                {previewUrl && canEmbedPreview(preview.documentType) ? (
                  <iframe
                    title={`Preview ${preview.title}`}
                    src={previewUrl}
                    style={{ width: '100%', flex: 1, minHeight: 480, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }}
                  />
                ) : previewUrl ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b' }}>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>Preview is not supported for this file type.</p>
                    <p style={{ fontSize: 12, marginTop: 4 }}>File: {preview.title || preview.documentName}</p>
                  </div>
                ) : (
                  <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b' }}>
                    <p style={{ fontSize: 13 }}>Loading preview...</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
