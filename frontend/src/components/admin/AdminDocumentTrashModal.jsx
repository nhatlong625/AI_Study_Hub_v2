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
            {loading ? <p className="lib-form-hint">Loading Trash...</p> : items.length === 0 ? (
              <p className="lib-form-hint" style={{ textAlign: 'center', paddingTop: 80 }}>Trash is empty.</p>
            ) : items.map(item => (
              <div
                key={item.documentId}
                style={{
                  border: preview?.documentId === item.documentId ? '1px solid #6366f1' : '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 12,
                  background: preview?.documentId === item.documentId ? '#eef2ff' : '#fff',
                }}
              >
                <button
                  type="button"
                  onClick={() => setPreview(item)}
                  style={{ display: 'block', width: '100%', border: 0, padding: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
                >
                  <strong>{item.title || item.documentName}</strong>
                  <div className="lib-form-hint">{item.ownerName || item.ownerEmail} · {item.subjectName || 'Unknown course'}</div>
                  <div className="lib-form-hint" style={{ color: '#d97706' }}>
                    Permanently deleted in {item.remainingDays} day{item.remainingDays === 1 ? '' : 's'}
                  </div>
                </button>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className="lib-create-btn" type="button" disabled={busyId === item.documentId} onClick={() => restore(item)}>Restore</button>
                  <button className="lib-modal-delete-btn" type="button" disabled={busyId === item.documentId} onClick={() => purge(item)}>Delete permanently</button>
                </div>
              </div>
            ))}
          </div>
          <div className="admin-trash-preview">
            {!preview ? <p className="lib-form-hint" style={{ margin: 'auto' }}>Select a document to preview it.</p> : (
              <>
                <div style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 13 }}>
                  This document is in Trash and will be permanently deleted in {preview.remainingDays} day{preview.remainingDays === 1 ? '' : 's'}.
                </div>
                {previewUrl && canEmbedPreview(preview.documentType) ? (
                  <iframe
                    title={`Preview ${preview.title}`}
                    src={previewUrl}
                    style={{ width: '100%', flex: 1, minHeight: 360, border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' }}
                  />
                ) : previewUrl ? (
                  <p className="lib-form-hint" style={{ margin: 'auto' }}>Preview is not supported for this file type.</p>
                ) : (
                  <p className="lib-form-hint" style={{ margin: 'auto' }}>Loading preview...</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
