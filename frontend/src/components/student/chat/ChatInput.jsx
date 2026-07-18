import { useMemo, useState } from 'react';

function ChatInput({
  onSendMessage,
  selectedCourses = [],
  selectedDocuments = [],
  onAddCourse,
  onRemoveCourse,
  onAddDocument,
  onRemoveDocument,
  libraryCourses = [],
  libraryDocuments = [],
  libraryCoursesError = '',
  libraryDocumentsLoading = false,
  libraryDocumentsError = ''
}) {
  const [text, setText] = useState('');
  const [isCoursePickerOpen, setIsCoursePickerOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [documentSearch, setDocumentSearch] = useState('');
  const selectedCourseCodes = selectedCourses.map(course => course.code);
  const selectedDocumentIds = selectedDocuments.map(document => Number(document.documentId ?? document.document_id));
  const getCourseKey = (course) => {
    const subjectIds = Array.isArray(course.subjectIds) && course.subjectIds.length
      ? course.subjectIds.join('-')
      : course.subjectId ?? course.id ?? course.code;
    return `${course.code || 'subject'}-${subjectIds}`;
  };
  const filteredCourses = libraryCourses.filter(course => {
    const query = courseSearch.trim().toLowerCase();
    if (!query) return true;

    return `${course.code} ${course.name} ${course.semester}`.toLowerCase().includes(query);
  });
  const activeSubjectIds = selectedCourses
    .flatMap(course => Array.isArray(course.subjectIds) && course.subjectIds.length
      ? course.subjectIds
      : [course.subjectId ?? course.id])
    .map(Number)
    .filter(Number.isFinite);
  const filteredDocuments = useMemo(() => {
    if (activeSubjectIds.length === 0) return [];
    const query = documentSearch.trim().toLowerCase();
    return libraryDocuments.filter(document => {
      if (!query) return true;

      const name = `${document.title || ''} ${document.documentName || document.document_name || ''}`.toLowerCase();
      return name.includes(query);
    });
  }, [activeSubjectIds.join(','), documentSearch, libraryDocuments]);

  const handleSend = () => {
    if (text.trim()) {
      onSendMessage?.(text);
      setText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input" style={{ width: '100%', paddingBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {(selectedCourses.length > 0 || selectedDocuments.length > 0) && (
        <div style={{ width: '100%', maxWidth: '840px', display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {selectedCourses.map(course => (
            <span
              key={course.code}
              className="chat-selected-course-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '999px',
                background: '#f3e8ff',
                color: '#6d28d9',
                border: '1px solid #d8b4fe',
                padding: '5px 12px',
                fontSize: '0.82rem',
                fontWeight: 700,
                boxShadow: '0 1px 2px rgba(109, 40, 217, 0.05)'
              }}
            >
              <span>{course.code}</span>
              {course.name && (
                <span style={{ fontWeight: 500, opacity: 0.85, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  • {course.name}
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemoveCourse?.(course.code)}
                aria-label={`Remove ${course.code}`}
                className="chat-selected-course-remove"
                style={{
                  border: 0,
                  background: '#e9d5ff',
                  color: '#6d28d9',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  marginLeft: '2px',
                  transition: 'background 0.15s ease'
                }}
              >
                ✕
              </button>
            </span>
          ))}
          {selectedDocuments.map(document => {
            const documentId = Number(document.documentId ?? document.document_id);
            const documentName = document.title || document.documentName || document.document_name || 'Selected document';
            return (
              <span
                key={documentId || documentName}
                className="chat-selected-course-chip"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '999px',
                  background: '#ecfdf5',
                  color: '#047857',
                  border: '1px solid #a7f3d0',
                  padding: '5px 12px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  maxWidth: '280px',
                  boxShadow: '0 1px 2px rgba(4, 120, 87, 0.05)'
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {documentName}</span>
                <button
                  type="button"
                  onClick={() => onRemoveDocument?.(documentId)}
                  aria-label={`Remove ${documentName}`}
                  className="chat-selected-course-remove"
                  style={{
                    border: 0,
                    background: '#a7f3d0',
                    color: '#047857',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    marginLeft: '2px',
                    transition: 'background 0.15s ease'
                  }}
                >
                  ✕
                </button>
              </span>
            );
          })}
        </div>
      )}

      <style>{`
        .chat-course-picker-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          transition: all 0.2s ease;
          padding: 0;
        }
        .chat-course-picker-btn:hover,
        .chat-course-picker-btn.active {
          background-color: #f5f3ff;
          color: #4c1d95;
        }
        .chat-course-picker-item:not(.selected):hover .chat-course-picker-circle {
          border-color: #7c3aed !important;
          color: #7c3aed !important;
          background-color: #f5f3ff !important;
          transform: scale(1.1);
        }
        .chat-course-picker-item.selected:hover .chat-course-picker-circle {
          background-color: #6d28d9 !important;
          border-color: #6d28d9 !important;
          color: #ffffff !important;
          transform: scale(1.1);
        }
        .chat-selected-course-remove:hover {
          filter: brightness(0.92);
        }
      `}</style>
      <div style={{ 
        width: '100%', 
        maxWidth: '840px', 
        background: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: '24px', 
        padding: '8px 16px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        position: 'relative'
      }}>
        {isCoursePickerOpen && (
          <div className="chat-course-picker" style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: '58px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            boxShadow: '0 18px 44px rgba(15, 23, 42, 0.14)',
            padding: '14px',
            zIndex: 20
          }}>
            <div className="chat-course-picker-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 850, color: '#111827' }}>Choose library subjects</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>Selected subjects will be used as chat context.</div>
              </div>
              <button
                type="button"
                onClick={() => setIsCoursePickerOpen(false)}
                className="chat-course-picker-close"
                style={{ border: 0, background: '#f1f5f9', borderRadius: '999px', color: '#475569', cursor: 'pointer', padding: '7px 10px', fontWeight: 800 }}
              >
                Close
              </button>
            </div>

            <input
              value={courseSearch}
              onChange={(event) => setCourseSearch(event.target.value)}
              placeholder="Search subject code or name..."
              style={{
                width: '100%',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                outline: 'none',
                padding: '10px 12px',
                fontFamily: 'var(--chat-font-family)',
                fontSize: '0.92rem',
                marginBottom: '10px'
              }}
            />

            <div className="chat-course-picker-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
              {libraryCoursesError && (
                <div style={{ gridColumn: '1 / -1', border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', borderRadius: '12px', padding: '10px 12px', fontSize: '0.82rem', fontWeight: 700 }}>
                  {libraryCoursesError}
                </div>
              )}
              {!libraryCoursesError && filteredCourses.length === 0 && (
                <div style={{ gridColumn: '1 / -1', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', borderRadius: '12px', padding: '14px 12px', fontSize: '0.84rem', fontWeight: 700 }}>
                  No library subjects found.
                </div>
              )}
              {filteredCourses.map(course => {
                const isSelected = selectedCourseCodes.includes(course.code);

                return (
                  <button
                    type="button"
                    key={course.code}
                    onClick={() => {
                      if (isSelected) {
                        onRemoveCourse?.(course.code);
                      } else {
                        onAddCourse?.(course);
                      }
                      setDocumentSearch('');
                    }}
                    aria-label={isSelected ? `Remove ${course.code}` : `Select ${course.code}`}
                    className={`chat-course-picker-item ${isSelected ? 'selected' : ''}`}
                    style={{
                      position: 'relative',
                      textAlign: 'left',
                      border: `1.5px solid ${isSelected ? '#7c3aed' : '#e2e8f0'}`,
                      background: isSelected ? '#f5f3ff' : '#ffffff',
                      borderRadius: '14px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      color: '#111827',
                      fontFamily: 'var(--chat-font-family)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px',
                      minHeight: '94px',
                      transition: 'all 0.18s ease-in-out',
                      boxShadow: isSelected
                        ? '0 4px 12px -2px rgba(124, 58, 237, 0.14)'
                        : '0 1px 3px rgba(0, 0, 0, 0.02)'
                    }}
                  >
                    {/* Header row: Course code + Semester badge + Round circular button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.95rem', fontWeight: 800, color: isSelected ? '#6d28d9' : '#1e293b', letterSpacing: '0.01em' }}>
                          {course.code}
                        </strong>
                        {course.semester && (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 650,
                            color: isSelected ? '#7c3aed' : '#64748b',
                            background: isSelected ? '#ede9fe' : '#f1f5f9',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            whiteSpace: 'nowrap'
                          }}>
                            {course.semester}
                          </span>
                        )}
                      </div>

                      {/* Round Circular Action Button */}
                      <span
                        className="chat-course-picker-circle"
                        title={isSelected ? `Remove ${course.code}` : `Select ${course.code}`}
                        style={{
                          width: '24px',
                          height: '24px',
                          minWidth: '24px',
                          minHeight: '24px',
                          aspectRatio: '1 / 1',
                          borderRadius: '50%',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isSelected ? '#7c3aed' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#64748b',
                          border: `1.5px solid ${isSelected ? '#7c3aed' : '#cbd5e1'}`,
                          fontSize: '0.82rem',
                          fontWeight: 850,
                          lineHeight: 1,
                          flexShrink: 0,
                          transition: 'all 0.18s ease-in-out',
                          boxShadow: isSelected ? '0 2px 8px rgba(124, 58, 237, 0.25)' : 'none',
                          boxSizing: 'border-box'
                        }}
                      >
                        {isSelected ? '✓' : '+'}
                      </span>
                    </div>

                    {/* Middle row: Course full name */}
                    <div style={{
                      fontSize: '0.83rem',
                      lineHeight: '1.4',
                      color: isSelected ? '#374151' : '#475569',
                      fontWeight: 500,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                      flex: 1
                    }}>
                      {course.name}
                    </div>

                    {/* Footer row: Doc count & Status label */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      paddingTop: '6px',
                      borderTop: `1px solid ${isSelected ? '#e9d5ff' : '#f1f5f9'}`,
                      marginTop: '2px'
                    }}>
                      {Number.isFinite(Number(course.documentCount)) ? (
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: isSelected ? '#6d28d9' : '#64748b',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                          </svg>
                          {Number(course.documentCount)} {Number(course.documentCount) === 1 ? 'doc' : 'docs'}
                        </span>
                      ) : <span />}

                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: isSelected ? '#6d28d9' : '#94a3b8'
                      }}>
                        {isSelected ? 'Selected ✓' : 'Select'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedCourses.length > 0 && (
              <div style={{ marginTop: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 850, color: '#111827' }}>Optional document focus</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>Documents appear below as soon as a subject is selected.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      selectedDocuments.forEach(document => onRemoveDocument?.(Number(document.documentId ?? document.document_id)));
                    }}
                    disabled={selectedDocuments.length === 0}
                    style={{ border: 0, background: '#f1f5f9', color: selectedDocuments.length ? '#475569' : '#94a3b8', borderRadius: '999px', padding: '7px 10px', fontWeight: 800, cursor: selectedDocuments.length ? 'pointer' : 'default' }}
                  >
                    All documents
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  {selectedCourses.map(course => (
                    <span
                      key={getCourseKey(course)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        maxWidth: '100%',
                        border: '1px solid #d8b4fe',
                        background: '#f5f3ff',
                        color: '#6d28d9',
                        borderRadius: '999px',
                        padding: '5px 10px 5px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 700
                      }}
                    >
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {course.code} - {course.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveCourse?.(course.code)}
                        aria-label={`Remove ${course.code}`}
                        style={{
                          width: '18px',
                          height: '18px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 0,
                          borderRadius: '50%',
                          background: '#ede9fe',
                          color: '#6d28d9',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '0.72rem',
                          fontWeight: 800
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                <input
                  value={documentSearch}
                  onChange={(event) => setDocumentSearch(event.target.value)}
                  placeholder="Search document title or file name..."
                  style={{
                    width: '100%',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    outline: 'none',
                    padding: '10px 12px',
                    fontFamily: 'var(--chat-font-family)',
                    fontSize: '0.9rem',
                    marginBottom: '10px'
                  }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {libraryDocumentsLoading && (
                    <div style={{ gridColumn: '1 / -1', border: '1px solid #dbeafe', background: '#eff6ff', color: '#1d4ed8', borderRadius: '12px', padding: '12px', fontSize: '0.82rem', fontWeight: 750 }}>
                      Loading documents in the selected subject...
                    </div>
                  )}
                  {!libraryDocumentsLoading && libraryDocumentsError && (
                    <div style={{ gridColumn: '1 / -1', border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', borderRadius: '12px', padding: '12px', fontSize: '0.82rem', fontWeight: 750 }}>
                      {libraryDocumentsError}
                    </div>
                  )}
                  {!libraryDocumentsLoading && !libraryDocumentsError && filteredDocuments.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', borderRadius: '12px', padding: '12px', fontSize: '0.82rem', fontWeight: 700 }}>
                      No documents found in the selected subject.
                    </div>
                  )}
                  {!libraryDocumentsLoading && !libraryDocumentsError && filteredDocuments.map(document => {
                    const documentId = Number(document.documentId ?? document.document_id);
                    const isSelected = selectedDocumentIds.includes(documentId);
                    const documentName = document.title || document.documentName || document.document_name || 'Untitled document';
                    const status = String(document.summaryStatus || document.summary_status || 'PENDING').toUpperCase();
                    const statusLabel = status === 'COMPLETED'
                      ? 'Ready'
                      : status === 'FAILED'
                        ? 'Extraction failed'
                        : 'Extracting';

                    return (
                      <button
                        type="button"
                        key={documentId}
                        onClick={() => {
                          if (isSelected) {
                            onRemoveDocument?.(documentId);
                          } else {
                            onAddDocument?.(document);
                          }
                          setDocumentSearch('');
                        }}
                        className={`chat-document-picker-item ${isSelected ? 'selected' : ''}`}
                        style={{
                          textAlign: 'left',
                          border: `1.5px solid ${isSelected ? '#10b981' : '#e2e8f0'}`,
                          background: isSelected ? '#ecfdf5' : '#ffffff',
                          borderRadius: '14px',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          color: '#111827',
                          fontFamily: 'var(--chat-font-family)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '6px',
                          minHeight: '76px',
                          transition: 'all 0.18s ease-in-out',
                          boxShadow: isSelected
                            ? '0 4px 12px -2px rgba(16, 185, 129, 0.14)'
                            : '0 1px 3px rgba(0, 0, 0, 0.02)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' }}>
                          <strong style={{ color: isSelected ? '#047857' : '#1e293b', fontSize: '0.86rem', fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {documentName}
                          </strong>
                          <span style={{
                            color: isSelected ? '#047857' : status === 'COMPLETED' ? '#059669' : '#b45309',
                            background: isSelected ? '#d1fae5' : status === 'COMPLETED' ? '#ecfdf5' : '#fef3c7',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            flexShrink: 0
                          }}>
                            {isSelected ? 'Selected ✓' : statusLabel}
                          </span>
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.78rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          📄 {document.documentName || document.document_name || 'Document'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsCoursePickerOpen(prev => !prev)}
          aria-label="Choose subjects from library"
          className={`chat-course-picker-btn ${isCoursePickerOpen ? 'active' : ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
        </button>
        
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your question here..."
          style={{ 
            flex: 1, 
            border: 'none', 
            background: 'transparent', 
            outline: 'none', 
            fontFamily: 'var(--chat-font-family)', 
            fontSize: '1rem', 
            color: '#1e293b',
            padding: '8px 0'
          }}
        />
        <button 
          onClick={handleSend} 
          style={{ 
            background: '#6d28d9', 
            color: 'white', 
            border: 'none', 
            borderRadius: '50%', 
            width: '32px', 
            height: '32px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer' 
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5"></line>
            <polyline points="5 12 12 5 19 12"></polyline>
          </svg>
        </button>
      </div>
      
      <div style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: '600', color: '#94a3b8', marginTop: '12px', letterSpacing: '0.5px' }}>
        AI TUTOR CAN MAKE MISTAKES. VERIFY IMPORTANT ACADEMIC INFORMATION.
      </div>
    </div>
  );
}

export default ChatInput;
