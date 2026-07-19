import { useState, useEffect, useRef } from 'react';
import { adminService } from '../../services/adminService';

const ICON_MAP = {
  code:    (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polyline points="16 18 22 12 16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="8 6 2 12 8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  calc:    (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="2"/><line x1="8" y1="6" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="14" x2="12" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>),
  book:    (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" stroke="currentColor" strokeWidth="2"/></svg>),
  science: (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 3h6M10 3v7L6 19h12l-4-9V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>),
};

const EMPTY_FORM = { name: '' };
const EMPTY_COURSE_FORM = { name: '', code: '', instructor: '', status: 'Active' };
const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/$/, '');

function formatDocumentSize(bytes) {
  const value = Number(bytes || 0);
  if (!value) return '0 KB';
  if (value < 1024 * 1024) return (value / 1024).toFixed(1) + ' KB';
  return (value / 1024 / 1024).toFixed(1) + ' MB';
}

function formatDateTime(value) {
  if (!value) return 'Not updated';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function documentFileUrl(documentId, action) {
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

function LibraryManagementPage() {
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editSemester, setEditSemester]     = useState(null);
  const [deleteSemester, setDeleteSemester] = useState(null);
  const [createModal, setCreateModal]           = useState(false);
  const [createForm, setCreateForm]             = useState(EMPTY_FORM);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedCourseDocuments, setSelectedCourseDocuments] = useState([]);
  const [librarySemesters, setLibrarySemesters] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [createCourseModal, setCreateCourseModal] = useState(false);
  const [createCourseForm, setCreateCourseForm] = useState(EMPTY_COURSE_FORM);
  const [editCourse, setEditCourse] = useState(null);
  const [editCourseForm, setEditCourseForm] = useState(EMPTY_COURSE_FORM);
  const [deleteCourse, setDeleteCourse] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const menuRef = useRef(null);

  const filtered = librarySemesters
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0]);
      const numB = parseInt(b.name.match(/\d+/)?.[0]);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      if (!isNaN(numA)) return -1;
      if (!isNaN(numB)) return 1;
      return a.name.localeCompare(b.name, 'vi');
    });

  const ITEMS_PER_PAGE = 8;
  const totalItems = selectedSemester ? selectedCourses.length : filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  
  const pagedItems = (selectedSemester ? selectedCourses : filtered).slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const getPageNums = () => {
    const arr = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safePage - 1 && i <= safePage + 1)) {
        arr.push(i);
      } else if (arr[arr.length - 1] !== '...') {
        arr.push('...');
      }
    }
    return arr;
  };
  const pageNums = getPageNums();

  const totalCourses = librarySemesters.reduce((sum, semester) => sum + semester.courses, 0);
  const totalDocs = librarySemesters.reduce((sum, semester) => sum + semester.docs, 0);

  const loadSemesters = async () => {
    try {
      setIsLoading(true);
      setError('');
      const semesters = await adminService.getLibrarySemesters();
      setLibrarySemesters(semesters);
      setSelectedSemester(current => {
        if (!current) return current;
        return semesters.find(semester => semester.id === current.id) || null;
      });
    } catch (err) {
      setError(err.message);
      setLibrarySemesters([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourses = async (semester) => {
    try {
      setSelectedSemester(semester);
      setSelectedCourse(null);
      setSelectedCourseDocuments([]);
      setCreateCourseModal(false);
      setError('');
      const courses = await adminService.getLibraryCourses(semester.id);
      setSelectedCourses(courses);
    } catch (err) {
      setError(err.message);
      setSelectedCourses([]);
    }
  };

  const loadCourseDocuments = async (course) => {
    try {
      setSelectedCourse(course);
      setError('');
      const documents = await adminService.getDocumentsBySubject(course.id);
      setSelectedCourseDocuments(Array.isArray(documents) ? documents : []);
    } catch (err) {
      setError(err.message);
      setSelectedCourseDocuments([]);
    }
  };

  useEffect(() => {
    loadSemesters();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  // Prevent body scroll when any modal open
  useEffect(() => {
    if (editSemester || deleteSemester || createModal || createCourseModal || editCourse || deleteCourse || previewDoc || deleteDoc) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [editSemester, deleteSemester, createModal, createCourseModal, editCourse, deleteCourse, previewDoc, deleteDoc]);

  useEffect(() => {
    if (!previewDoc?.id || !canEmbedPreview(previewDoc.type || previewDoc.documentType)) {
      setPreviewUrl('');
      setPreviewError('');
      return undefined;
    }

    let objectUrl = '';
    let cancelled = false;
    setPreviewUrl('');
    setPreviewError('');

    fetchDocumentBlob(previewDoc.id, 'preview')
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
  }, [previewDoc?.id, previewDoc?.type, previewDoc?.documentType]);

  function openCreate() {
    setCreateForm(EMPTY_FORM);
    setCreateModal(true);
  }

  function openEdit(row) {
    setOpenMenuId(null);
    setEditSemester({ ...row });
  }

  function openDelete(row) {
    setOpenMenuId(null);
    setDeleteSemester(row);
  }

  async function handleCreateSemester() {
    try {
      setIsSaving(true);
      setError('');
      await adminService.createLibrarySemester({ name: createForm.name.trim() });
      await loadSemesters();
      setCreateModal(false);
      setCreateForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateSemester() {
    try {
      setIsSaving(true);
      setError('');
      await adminService.updateLibrarySemester(editSemester.id, { name: editSemester.name.trim() });
      await loadSemesters();
      setEditSemester(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteSemester() {
    try {
      setIsSaving(true);
      setError('');
      await adminService.deleteLibrarySemester(deleteSemester.id);
      await loadSemesters();
      setDeleteSemester(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateCourse() {
    try {
      setIsSaving(true);
      setError('');
      await adminService.createLibraryCourse(selectedSemester.id, createCourseForm);
      await loadCourses(selectedSemester);
      await loadSemesters();
      setCreateCourseModal(false);
      setCreateCourseForm(EMPTY_COURSE_FORM);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  function openEditCourse(course) {
    setError('');
    setEditCourse(course);
    setEditCourseForm({
      name: course.name || '',
      code: course.code || '',
      instructor: course.instructor || '',
      status: course.status || 'Active',
    });
  }

  async function handleUpdateCourse() {
    try {
      setIsSaving(true);
      setError('');
      await adminService.updateLibraryCourse(editCourse.id, editCourseForm);
      await loadCourses(selectedSemester);
      await loadSemesters();
      setEditCourse(null);
      setEditCourseForm(EMPTY_COURSE_FORM);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  function openDeleteCourse(course) {
    setError('');
    setDeleteCourse(course);
  }

  async function handleDeleteCourse() {
    if (!deleteCourse) return;
    try {
      setIsSaving(true);
      setError('');
      await adminService.deleteLibraryCourse(deleteCourse.id, true);
      await loadCourses(selectedSemester);
      await loadSemesters();
      setSelectedCourse(current => current?.id === deleteCourse.id ? null : current);
      setSelectedCourseDocuments(current => deleteCourse.id === selectedCourse?.id ? [] : current);
      setDeleteCourse(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDownloadDocument(doc) {
    try {
      setError('');
      const documentId = doc.documentId || doc.id;
      const blob = await fetchDocumentBlob(documentId, 'download');
      const objectUrl = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = objectUrl;
      link.download = doc.documentName || doc.description || doc.title || `document-${documentId}`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err.message || 'Could not download this document.');
    }
  }

  async function handleDeleteCourseDocument() {
    if (!deleteDoc) return;
    try {
      setIsSaving(true);
      setError('');
      const documentId = deleteDoc.documentId || deleteDoc.id;
      await adminService.deleteDocument(documentId);
      setSelectedCourseDocuments(current => current.filter(doc => (doc.documentId || doc.id) !== documentId));
      setPreviewDoc(current => (current?.id === documentId ? null : current));
      setDeleteDoc(null);
      if (selectedSemester) {
        const courses = await adminService.getLibraryCourses(selectedSemester.id);
        setSelectedCourses(courses);
        setSelectedCourse(current => current ? courses.find(course => course.id === current.id) || current : current);
      }
      await loadSemesters();
    } catch (err) {
      setError(err.message || 'Could not delete document.');
    } finally {
      setIsSaving(false);
    }
  }

  // Courses page early return.
  if (selectedSemester) {
    const courses = selectedCourses;
    if (selectedCourse) {
      return (
        <div className="lib-page">
          <button className="lib-courses-back" type="button" onClick={() => { setSelectedCourse(null); setSelectedCourseDocuments([]); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Courses
          </button>

          <div className="lib-header">
            <h1 className="lib-title">{selectedCourse.name} Documents</h1>
            <p className="lib-subtitle">{selectedSemester.name} / {selectedCourse.code}. Review uploaded documents for this course only.</p>
          </div>

          <div className="lib-courses-stat-card" style={{ width: 220 }}>
            <div className="lib-courses-stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="#4648D4" strokeWidth="2" strokeLinejoin="round"/>
                <polyline points="14 2 14 8 20 8" stroke="#4648D4" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div className="lib-courses-stat-label">TOTAL DOCUMENTS</div>
              <div className="lib-courses-stat-value">{selectedCourseDocuments.length}</div>
            </div>
          </div>

          <div className="lib-table-card lib-courses-tbl">
            {error && <p className="lib-form-hint" style={{ color: '#dc2626', padding: '0 24px' }}>{error}</p>}
            <table className="lib-table lib-table--courses">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Uploaded At</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedCourseDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#8c8a9e' }}>
                      No uploaded documents for this course yet.
                    </td>
                  </tr>
                ) : selectedCourseDocuments.map(doc => {
                  const documentId = doc.documentId || doc.id;
                  const documentType = doc.documentType || doc.type;
                  const documentSize = doc.documentSize ?? (Number(doc.sizeMb || 0) * 1024 * 1024);
                  const status = doc.visibilityStatus || doc.status || 'PRIVATE';
                  const normalizedDoc = {
                    ...doc,
                    id: documentId,
                    type: documentType,
                    size: doc.size || formatDocumentSize(documentSize),
                    documentName: doc.documentName || doc.description,
                  };
                  return (
                    <tr
                      key={documentId}
                      className="lib-course-row lib-course-row-clickable"
                      onClick={() => setPreviewDoc(normalizedDoc)}
                    >
                      <td>
                        <div className="lib-course-name-cell">
                          <div>
                            <div className="lib-course-name">{doc.title || doc.documentName || doc.description}</div>
                            <div className="lib-course-code">{doc.documentName || doc.description || doc.uploader?.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="lib-row-muted">{String(documentType || '').toUpperCase() || 'FILE'}</td>
                      <td className="lib-row-muted">{doc.size || formatDocumentSize(documentSize)}</td>
                      <td className="lib-row-muted">{formatDateTime(doc.uploadedAt || doc.createdAt)}</td>
                      <td>
                        <span className={`lib-status-badge ${
                          status === 'PUBLIC' ? 'lib-status-active' :
                          status === 'PENDING_REVIEW' ? 'lib-status-draft' :
                          'lib-status-archived'
                        }`}>{status}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="lib-icon-delete-btn"
                          type="button"
                          aria-label="Preview document"
                          title="Preview"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPreviewDoc(normalizedDoc);
                          }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        </button>
                        <button
                          className="lib-icon-delete-btn"
                          type="button"
                          aria-label="Delete document"
                          title="Delete"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteDoc(normalizedDoc);
                          }}
                          style={{ marginLeft: 8 }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {previewDoc && (
            <div className="lib-modal-overlay" onClick={() => setPreviewDoc(null)}>
              <div className="dm-preview-modal" onClick={e => e.stopPropagation()}>
                <div className="dm-preview-header">
                  <div className="dm-preview-header-left">
                    <div>
                      <h2 className="dm-preview-title">{previewDoc.title || previewDoc.documentName}</h2>
                      <p className="dm-preview-meta">
                        {String(previewDoc.type || '').toUpperCase() || 'FILE'} &nbsp;&bull;&nbsp; {selectedCourse.code} &nbsp;&bull;&nbsp; {previewDoc.size}
                      </p>
                    </div>
                  </div>
                  <button className="rq-close-btn" aria-label="Close preview" onClick={() => setPreviewDoc(null)}>x</button>
                </div>
                <div className="dm-review-layout">
                  <div className="dm-preview-body">
                    {canEmbedPreview(previewDoc.type) ? (
                      previewUrl ? (
                        <iframe className="dm-preview-frame" title={`Preview ${previewDoc.title || previewDoc.documentName}`} src={previewUrl} />
                      ) : (
                        <div className="dm-preview-thumb">
                          <p>{previewError || 'Loading preview...'}</p>
                        </div>
                      )
                    ) : (
                      <div className="dm-preview-thumb">
                        <p className="dm-preview-thumb-name">{previewDoc.title || previewDoc.documentName}</p>
                        <p className="dm-preview-thumb-size">Preview is not available for this file type.</p>
                      </div>
                    )}
                  </div>
                  <div className="dm-preview-info">
                    <div className="dm-preview-info-row">
                      <span>Uploaded by</span>
                      <strong>{previewDoc.uploader?.name || 'Unknown'}</strong>
                    </div>
                    <div className="dm-preview-info-row">
                      <span>Upload time</span>
                      <strong>{previewDoc.uploadedAt || 'Not available'}</strong>
                    </div>
                    <div className="dm-preview-info-row">
                      <span>Status</span>
                      <span className={`lib-status-badge ${
                        previewDoc.visibilityStatus === 'PUBLIC' ? 'lib-status-active' :
                        previewDoc.visibilityStatus === 'PENDING_REVIEW' ? 'lib-status-draft' :
                        'lib-status-archived'
                      }`}>{previewDoc.visibilityStatus || previewDoc.status || 'PRIVATE'}</span>
                    </div>
                    <div className="dm-preview-info-row dm-preview-info-description">
                      <span>Description</span>
                      <strong>{previewDoc.description || previewDoc.documentName || 'No description'}</strong>
                    </div>
                    <div className="dm-preview-info-row">
                      <span>File</span>
                      <button type="button" className="dm-download-link" onClick={() => handleDownloadDocument(previewDoc)}>
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

          {deleteDoc && (
            <div className="lib-modal-overlay" onClick={() => setDeleteDoc(null)}>
              <div className="lib-modal-card lib-modal-delete" onClick={e => e.stopPropagation()}>
                <div className="lib-delete-icon-wrap">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round"/>
                    <line x1="12" y1="9" x2="12" y2="13" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="17" r="1" fill="#ef4444"/>
                  </svg>
                </div>
                <div className="lib-delete-content">
                  <h2 className="lib-delete-title">Delete Document?</h2>
                  <p className="lib-delete-body">
                    Delete <strong>{deleteDoc.title || deleteDoc.documentName}</strong> from <strong>{selectedCourse.name}</strong>.
                    This will also remove related quiz, chat, summary, share, comment, and report data. This action cannot be undone.
                  </p>
                </div>

                <div className="lib-modal-divider" />

                <div className="lib-modal-footer">
                  <button className="lib-modal-cancel-btn" type="button" onClick={() => setDeleteDoc(null)}>
                    Keep Document
                  </button>
                  <button className="lib-modal-delete-btn" type="button" onClick={handleDeleteCourseDocument} disabled={isSaving}>
                    {isSaving ? 'Deleting...' : 'Delete Document'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="lib-page">

        {/* Back link */}
        <button className="lib-courses-back" type="button" onClick={() => { setSelectedSemester(null); setSelectedCourse(null); setSelectedCourseDocuments([]); setSelectedCourses([]); setPage(1); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Semesters
        </button>

        {/* Title */}
        <div className="lib-header">
          <h1 className="lib-title">{selectedSemester.name} Courses</h1>
          <p className="lib-subtitle">Manage and review all courses for the current academic term.</p>
        </div>

        {/* Stat card + Create Course on same row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="lib-courses-stat-card">
            <div className="lib-courses-stat-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="#4648D4" strokeWidth="2" strokeLinecap="round"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" stroke="#4648D4" strokeWidth="2"/>
              </svg>
            </div>
            <div>
              <div className="lib-courses-stat-label">TOTAL COURSES</div>
            <div className="lib-courses-stat-value">{courses.length}</div>
            </div>
          </div>

          <button
            className="lib-create-btn"
            type="button"
            onClick={() => setCreateCourseModal(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            Create Course
          </button>
        </div>

        {/* Courses table */}
        <div className="lib-table-card lib-courses-tbl">
          <table className="lib-table lib-table--courses">
            <thead>
              <tr>
                <th>Course Name</th>
                <th>Documents</th>
                <th>Last Updated</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.map(course => (
                <tr key={course.id} className="lib-course-row">
                  <td>
                    <div className="lib-course-name-cell">
                      <div>
                        <button className="lib-course-name" type="button" onClick={() => loadCourseDocuments(course)} style={{ border: 0, background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left' }}>{course.name}</button>
                        <div className="lib-course-code" style={{ color: course.iconColor }}>{course.code}</div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div className="lib-course-docs">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" stroke="#8c8a9e" strokeWidth="2" strokeLinejoin="round"/>
                        <polyline points="14 2 14 8 20 8" stroke="#8c8a9e" strokeWidth="2" strokeLinejoin="round"/>
                      </svg>
                      {course.docs}
                    </div>
                  </td>
                  <td className="lib-row-muted">{course.updated}</td>
                  <td>
                    <span className={`lib-status-badge ${
                      course.status === 'Active'   ? 'lib-status-active'   :
                      course.status === 'Archived' ? 'lib-status-archived' :
                      'lib-status-draft'
                    }`}>{course.status}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="lib-icon-delete-btn" type="button" aria-label="View course documents" title="View documents" onClick={() => loadCourseDocuments(course)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </button>
                    <button className="lib-icon-delete-btn" type="button" aria-label="Edit course" title="Edit course" onClick={() => openEditCourse(course)} disabled={isSaving} style={{ marginLeft: 8 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button className="lib-icon-delete-btn" type="button" aria-label="Delete course" title="Delete course" onClick={() => openDeleteCourse(course)} disabled={isSaving} style={{ marginLeft: 8 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="lib-pagination">
            <span className="lib-pagination-info">
              Showing {(safePage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(safePage * ITEMS_PER_PAGE, totalItems)} of <strong>{totalItems}</strong> entries
            </span>
            <div className="lib-pagination-controls">
              <button className="lib-page-btn" type="button" disabled={safePage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                Previous
              </button>
              {pageNums.map((p, i) =>
                p === '...' ? (
                  <span key={'ellipsis-'+i} className="lib-page-ellipsis">...</span>
                ) : (
                  <button key={p} className={`lib-page-num${safePage === p ? ' active' : ''}`} type="button" onClick={() => setPage(p)}>
                    {p}
                  </button>
                )
              )}
              <button className="lib-page-btn" type="button" disabled={safePage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Create course modal */}
        {deleteCourse && (
          <div className="lib-modal-overlay" onClick={() => setDeleteCourse(null)}>
            <div className="lib-modal-card lib-modal-delete" onClick={e => e.stopPropagation()}>
              <div className="lib-delete-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round"/>
                  <line x1="12" y1="9" x2="12" y2="13" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="12" cy="17" r="1" fill="#ef4444"/>
                </svg>
              </div>
              <div className="lib-delete-content">
                <h2 className="lib-delete-title">Delete Course?</h2>
                <p className="lib-delete-body">
                  Delete <strong>{deleteCourse.name}</strong> ({deleteCourse.code}) from <strong>{selectedSemester.name}</strong>.
                  {Number(deleteCourse.docs || 0) > 0
                    ? ` This will also permanently delete ${deleteCourse.docs} document${Number(deleteCourse.docs) === 1 ? '' : 's'} in this course and all related quiz, chat, summary, share, comment, and report data.`
                    : ' This course has no documents.'}
                  {' '}This action cannot be undone.
                </p>
              </div>

              <div className="lib-modal-divider" />

              <div className="lib-modal-footer">
                <button className="lib-modal-cancel-btn" type="button" onClick={() => setDeleteCourse(null)}>
                  Keep Course
                </button>
                <button className="lib-modal-delete-btn" type="button" onClick={handleDeleteCourse} disabled={isSaving}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {isSaving ? 'Deleting...' : Number(deleteCourse.docs || 0) > 0 ? 'Delete Course and Documents' : 'Delete Course'}
                </button>
              </div>
            </div>
          </div>
        )}

        {createCourseModal && (
          <div className="lib-modal-overlay" onClick={() => setCreateCourseModal(false)}>
            <div className="lib-modal-card lib-modal-edit" onClick={e => e.stopPropagation()}>
              <h2 className="lib-modal-title">Create Course</h2>
              <p className="lib-modal-subtitle">Add a new course to <strong>{selectedSemester.name}</strong>.</p>

              <div className="lib-modal-divider" />

              {error && <p className="lib-form-hint" style={{ color: '#dc2626' }}>{error}</p>}

              <div className="lib-form-group">
                <label className="lib-form-label">Course Name</label>
                <input
                  className="lib-form-input"
                  type="text"
                  placeholder="e.g. Introduction to Algorithms"
                  value={createCourseForm.name}
                  onChange={e => setCreateCourseForm(form => ({ ...form, name: e.target.value }))}
                />
              </div>

              <div className="lib-form-group">
                <label className="lib-form-label">Course Code</label>
                <input
                  className="lib-form-input"
                  type="text"
                  placeholder="e.g. CS-101"
                  value={createCourseForm.code}
                  onChange={e => setCreateCourseForm(form => ({ ...form, code: e.target.value }))}
                />
              </div>

              <div className="lib-form-group">
                <label className="lib-form-label">Instructor</label>
                <input
                  className="lib-form-input"
                  type="text"
                  placeholder="e.g. Dr. Alan Turing"
                  value={createCourseForm.instructor}
                  onChange={e => setCreateCourseForm(form => ({ ...form, instructor: e.target.value }))}
                />
              </div>

              <div className="lib-form-group">
                <label className="lib-form-label">Description (Optional)</label>
                <textarea className="lib-form-textarea" rows={3} placeholder="Brief description of the course..." />
              </div>

              <div className="lib-form-group">
                <label className="lib-form-label">Status</label>
                <div className="lib-form-radio-row">
                  <label className="lib-radio-label">
                    <input type="radio" name="course-status" checked={createCourseForm.status === 'Active'} onChange={() => setCreateCourseForm(form => ({ ...form, status: 'Active' }))} className="lib-radio-input" /> Active
                  </label>
                  <label className="lib-radio-label">
                    <input type="radio" name="course-status" checked={createCourseForm.status === 'Draft'} onChange={() => setCreateCourseForm(form => ({ ...form, status: 'Draft' }))} className="lib-radio-input" /> Draft
                  </label>
                  <label className="lib-radio-label">
                    <input type="radio" name="course-status" checked={createCourseForm.status === 'Archived'} onChange={() => setCreateCourseForm(form => ({ ...form, status: 'Archived' }))} className="lib-radio-input" /> Archived
                  </label>
                </div>
              </div>

              <div className="lib-modal-divider" />

              <div className="lib-modal-footer">
                <button className="lib-modal-cancel-btn" type="button" onClick={() => setCreateCourseModal(false)}>Cancel</button>
                <button className="lib-modal-save-btn" type="button" onClick={handleCreateCourse} disabled={isSaving}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  {isSaving ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </div>
          </div>
        )}

        {editCourse && (
          <div className="lib-modal-overlay" onClick={() => setEditCourse(null)}>
            <div className="lib-modal-card lib-modal-edit" onClick={e => e.stopPropagation()}>
              <h2 className="lib-modal-title">Edit Course</h2>
              <p className="lib-modal-subtitle">Update information for <strong>{editCourse.name}</strong>.</p>

              <div className="lib-modal-divider" />

              {error && <p className="lib-form-hint" style={{ color: '#dc2626' }}>{error}</p>}

              <div className="lib-form-group">
                <label className="lib-form-label">Course Name</label>
                <input
                  className="lib-form-input"
                  type="text"
                  value={editCourseForm.name}
                  onChange={e => setEditCourseForm(form => ({ ...form, name: e.target.value }))}
                />
              </div>

              <div className="lib-form-group">
                <label className="lib-form-label">Course Code</label>
                <input
                  className="lib-form-input"
                  type="text"
                  value={editCourseForm.code}
                  onChange={e => setEditCourseForm(form => ({ ...form, code: e.target.value }))}
                />
              </div>

              <div className="lib-form-group">
                <label className="lib-form-label">Instructor / Description</label>
                <input
                  className="lib-form-input"
                  type="text"
                  value={editCourseForm.instructor}
                  onChange={e => setEditCourseForm(form => ({ ...form, instructor: e.target.value }))}
                />
              </div>

              <div className="lib-modal-divider" />

              <div className="lib-modal-footer">
                <button className="lib-modal-cancel-btn" type="button" onClick={() => setEditCourse(null)}>Cancel</button>
                <button className="lib-modal-save-btn" type="button" onClick={handleUpdateCourse} disabled={isSaving || !editCourseForm.name.trim()}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="lib-page">
      {/* Header */}
      <div className="lib-header">
        <h1 className="lib-title">Library Management</h1>
        <p className="lib-subtitle">Manage semesters, course folders, user libraries, uploaded documents, and storage usage across the platform.</p>
      </div>

      {/* Stat Cards */}
      <div className="lib-stats-row">
        <div className="lib-stat-card">
          <div className="lib-stat-label">Total Semesters</div>
          <div className="lib-stat-value">{librarySemesters.length}</div>
        </div>
        <div className="lib-stat-card">
          <div className="lib-stat-label">Course Folders</div>
          <div className="lib-stat-value">{totalCourses}</div>
        </div>
        <div className="lib-stat-card">
          <div className="lib-stat-label">Total Documents</div>
          <div className="lib-stat-value">{totalDocs}</div>
        </div>
        <div className="lib-stat-card lib-stat-card--storage">
          <div className="lib-stat-label">Storage Used</div>
          <div className="lib-stat-value lib-stat-value--storage">
            {librarySemesters.reduce((sum, s) => sum + (parseFloat(s.storage) || 0), 0).toFixed(1)} MB <span className="lib-storage-total">/ 1 TB</span>
          </div>
          <div className="lib-storage-bar-bg">
            <div className="lib-storage-bar-fill" style={{ width: `${Math.min(100, (librarySemesters.reduce((sum, s) => sum + (parseFloat(s.storage) || 0), 0) / (1024 * 1024)) * 100)}%` }} />
          </div>
        </div>
        <div className="lib-stat-card">
          <div className="lib-stat-label">Total Items</div>
          <div className="lib-stat-value">{totalCourses + totalDocs}</div>
        </div>
      </div>

      {/* Actions Row */}
      <div className="lib-actions-row">
        <div className="lib-search-wrapper">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="lib-search-icon">
            <circle cx="11" cy="11" r="8" stroke="#8c8a9e" strokeWidth="2"/>
            <path d="m21 21-4.35-4.35" stroke="#8c8a9e" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search semester..."
            className="lib-search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="lib-create-btn" type="button" onClick={openCreate}>Create Semester</button>
      </div>

      {/* Table */}
      <div className="lib-table-card">
        {error && <p className="lib-form-hint" style={{ color: '#dc2626', padding: '0 24px' }}>{error}</p>}
        <table className="lib-table">
          <thead>
            <tr>
              <th>SEMESTER NAME</th>
              <th>CREATED AT</th>
              <th>UPDATED AT</th>
              <th>COURSES</th>
              <th>DOCS</th>
              <th>STORAGE</th>
              <th style={{ textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#8c8a9e' }}>
                  Loading semesters from database...
                </td>
              </tr>
            ) : pagedItems.map(row => (
                <tr
                  key={row.id}
                  className="lib-row-clickable"
                  onClick={() => { loadCourses(row); setPage(1); }}
                >
                <td className="lib-row-name">{row.name}</td>
                <td className="lib-row-muted">{row.createdAt}</td>
                <td className="lib-row-muted">{row.updatedAt || 'Not updated'}</td>
                <td className="lib-row-muted">{row.courses} Courses</td>
                <td className="lib-row-muted">{row.docs}</td>
                <td className="lib-row-muted">{row.storage}</td>
                <td style={{ textAlign: 'right' }}>
                  <div
                    className="lib-action-wrapper"
                    ref={openMenuId === row.id ? menuRef : null}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      className="lib-menu-btn"
                      type="button"
                      aria-label="More actions"
                      onClick={() => setOpenMenuId(openMenuId === row.id ? null : row.id)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="5"  r="2" fill="currentColor"/>
                        <circle cx="12" cy="12" r="2" fill="currentColor"/>
                        <circle cx="12" cy="19" r="2" fill="currentColor"/>
                      </svg>
                    </button>

                    {openMenuId === row.id && (
                      <div className="lib-dropdown">
                        <button className="lib-dropdown-item" type="button" onClick={() => openEdit(row)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Edit
                        </button>
                        <button className="lib-dropdown-item lib-dropdown-item--delete" type="button" onClick={() => openDelete(row)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <polyline points="3 6 5 6 21 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M19 6l-1 14H6L5 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M10 11v6M14 11v6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M9 6V4h6v2" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#8c8a9e' }}>
                  No results found for &quot;{search}&quot;
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="lib-pagination">
          <span className="lib-pagination-info">
            Showing {(safePage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(safePage * ITEMS_PER_PAGE, totalItems)} of <strong>{totalItems}</strong> semesters
          </span>
          <div className="lib-pagination-controls">
            <button className="lib-page-btn" type="button" disabled={safePage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
              Previous
            </button>
            {pageNums.map((p, i) =>
              p === '...' ? (
                <span key={'ellipsis-'+i} className="lib-page-ellipsis">...</span>
              ) : (
                <button key={p} className={`lib-page-num${safePage === p ? ' active' : ''}`} type="button" onClick={() => setPage(p)}>
                  {p}
                </button>
              )
            )}
            <button className="lib-page-btn" type="button" disabled={safePage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
              Next
            </button>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editSemester && (
        <div className="lib-modal-overlay" onClick={() => setEditSemester(null)}>
          <div className="lib-modal-card lib-modal-edit" onClick={e => e.stopPropagation()}>
            <h2 className="lib-modal-title">Edit Semester</h2>
            <p className="lib-modal-subtitle">Update the semester name stored in the SEMESTER table.</p>

            <div className="lib-modal-divider" />

            <div className="lib-form-group">
              <label className="lib-form-label">Semester Name</label>
              <input
                className="lib-form-input"
                type="text"
                value={editSemester.name}
                onChange={e => setEditSemester(s => ({ ...s, name: e.target.value }))}
              />
            </div>

            <div className="lib-modal-divider" />

            <div className="lib-modal-footer">
              <button className="lib-modal-cancel-btn" type="button" onClick={() => setEditSemester(null)}>Cancel</button>
              <button className="lib-modal-save-btn" type="button" onClick={handleUpdateSemester} disabled={isSaving || !editSemester.name?.trim()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete modal */}
      {deleteSemester && (
        <div className="lib-modal-overlay" onClick={() => setDeleteSemester(null)}>
          <div className="lib-modal-card lib-modal-delete" onClick={e => e.stopPropagation()}>
            <div className="lib-delete-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" fill="#fee2e2" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round"/>
                <line x1="12" y1="9" x2="12" y2="13" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="17" r="1" fill="#ef4444"/>
              </svg>
            </div>
            <div className="lib-delete-content">
              <h2 className="lib-delete-title">Delete Semester?</h2>
              <p className="lib-delete-body">
                Are you sure you want to delete <strong>{deleteSemester.name}</strong>?
                This will permanently remove all associated course references and data. This action cannot be undone.
              </p>
            </div>

            <div className="lib-modal-divider" />

            <div className="lib-modal-footer">
              <button className="lib-modal-cancel-btn" type="button" onClick={() => setDeleteSemester(null)}>
                Keep Semester
              </button>
              <button className="lib-modal-delete-btn" type="button" onClick={handleDeleteSemester} disabled={isSaving}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {isSaving ? 'Deleting...' : 'Delete Semester'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {createModal && (
        <div className="lib-modal-overlay" onClick={() => setCreateModal(false)}>
          <div className="lib-modal-card lib-modal-edit" onClick={e => e.stopPropagation()}>
            <h2 className="lib-modal-title">Create Semester</h2>
            <p className="lib-modal-subtitle">Create a semester record in the SEMESTER table.</p>

            <div className="lib-modal-divider" />

            <div className="lib-form-group">
              <label className="lib-form-label">Semester Name</label>
              <input
                className="lib-form-input"
                type="text"
                placeholder="e.g. Spring 2026"
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="lib-modal-divider" />

            <div className="lib-modal-footer">
              <button className="lib-modal-cancel-btn" type="button" onClick={() => setCreateModal(false)}>Cancel</button>
              <button className="lib-modal-save-btn" type="button" onClick={handleCreateSemester} disabled={isSaving || !createForm.name.trim()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                {isSaving ? 'Creating...' : 'Create Semester'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LibraryManagementPage;
