import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import ChatSidebar from '../../components/student/chat/ChatSidebar';
import ChatInput from '../../components/student/chat/ChatInput';
import { deleteAiChatSession, getDefaultAiUserId, listAiChatSessions } from '../../services/aiChatService';
import { documentApi, libraryApi } from '../../services/libraryApi';
import { mergeLibraryCourses } from '../../utils/libraryCourses';

function getCourseSubjectIds(courses = []) {
  return courses
    .flatMap(course => Array.isArray(course.subjectIds) && course.subjectIds.length
      ? course.subjectIds
      : [course.subjectId ?? course.id])
    .map(Number)
    .filter(Number.isFinite);
}

function filterDocumentsBySubjectIds(documents = [], subjectIds = []) {
  const subjectIdSet = new Set(subjectIds.map(Number).filter(Number.isFinite));
  if (subjectIdSet.size === 0) return [];
  return documents.filter(document => subjectIdSet.has(Number(document.subjectId ?? document.subject_id)));
}

function getCourseDocuments(courses = []) {
  return mergeDocuments(...courses.map(course => {
    const subjectId = course.subjectId ?? course.id;
    return Array.isArray(course.documents)
      ? course.documents.map(document => ({
          ...document,
          subjectId: document.subjectId ?? document.subject_id ?? subjectId
        }))
      : [];
  }));
}

function mergeDocuments(...documentLists) {
  const documentsById = new Map();
  documentLists.flat().forEach(doc => {
    const documentId = Number(doc?.documentId ?? doc?.document_id ?? doc?.id);
    if (Number.isFinite(documentId)) {
      documentsById.set(documentId, {
        ...doc,
        documentId,
        subjectId: doc.subjectId ?? doc.subject_id ?? doc.documentSubjectId ?? doc.document_subject_id,
        documentName: doc.documentName ?? doc.document_name ?? doc.name ?? doc.fileName
      });
    }
  });
  return [...documentsById.values()];
}

function mapBackendSessionToThread(session) {
  const id = session?.sessionId ?? session?.session_id;
  const title = session?.sessionTitle ?? session?.session_title ?? 'New AI Chat';

  return {
    id,
    title,
    topic: 'Saved chat',
    updatedAt: session?.updatedAt || session?.updated_at || session?.createdAt || session?.created_at || ''
  };
}

function StudentAITutorPage() {
  const navigate = useNavigate();
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [recentThreads, setRecentThreads] = useState([]);
  const [recentError, setRecentError] = useState('');
  const [libraryCourses, setLibraryCourses] = useState([]);
  const [libraryCoursesError, setLibraryCoursesError] = useState('');
  const [libraryDocuments, setLibraryDocuments] = useState([]);
  const [selectedSubjectDocuments, setSelectedSubjectDocuments] = useState([]);
  const [libraryDocumentsLoading, setLibraryDocumentsLoading] = useState(false);
  const [libraryDocumentsError, setLibraryDocumentsError] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const refreshRecentThreads = useCallback(() => {
    listAiChatSessions(getDefaultAiUserId())
      .then(sessions => {
        setRecentError('');
        if (Array.isArray(sessions)) {
          setRecentThreads(sessions.map(mapBackendSessionToThread).filter(thread => thread.id));
        }
      })
      .catch(error => {
        setRecentError(error?.message || 'Cannot load recent chats from backend.');
        setRecentThreads([]);
      });
  }, []);

  useEffect(() => {
    refreshRecentThreads();
  }, [refreshRecentThreads]);

  useEffect(() => {
    libraryApi.getOverview(getDefaultAiUserId())
      .then(overview => {
        const semesters = Array.isArray(overview?.semesters) ? overview.semesters : [];
        const courses = semesters.flatMap(semester => {
              const subjects = Array.isArray(semester.subjects) ? semester.subjects : [];
              return subjects
                .map(subject => {
                  const documents = Array.isArray(subject.documents) ? subject.documents : [];
                  const documentCount = Math.max(Number(subject.documentCount || 0), documents.length);
                  return {
                    id: subject.subjectId,
                    subjectId: subject.subjectId,
                    code: subject.subjectCode || subject.subjectName,
                    name: subject.subjectName,
                    semester: semester.semesterName,
                    documentCount,
                    documents
                  };
                })
                .filter(subject => subject.documentCount > 0);
            });
        setLibraryCoursesError('');
        setLibraryCourses(mergeLibraryCourses(courses));
      })
      .catch(error => {
        setLibraryCourses([]);
        setLibraryCoursesError(error?.message || 'Cannot load subjects from library.');
      });
  }, []);

  useEffect(() => {
    const userId = getDefaultAiUserId();
    Promise.all([
      documentApi.getByUser(userId).catch(() => []),
      documentApi.getSharedWithMe(userId).catch(() => [])
    ])
      .then(([ownDocuments, sharedDocuments]) => {
        const normalizedShared = (Array.isArray(sharedDocuments) ? sharedDocuments : []).map(item => ({
          ...item,
          documentId: item.documentId,
          subjectId: item.subjectId ?? item.subject_id ?? item.documentSubjectId ?? item.document_subject_id,
          documentName: item.documentName,
          title: item.documentTitle || item.title || item.documentName
        }));
        setLibraryDocuments(mergeDocuments(
          Array.isArray(ownDocuments) ? ownDocuments : [],
          normalizedShared
        ));
      })
      .catch(() => {
        setLibraryDocuments([]);
      });
  }, []);

  useEffect(() => {
    const subjectIds = getCourseSubjectIds(selectedCourses);
    if (subjectIds.length === 0) {
      setSelectedSubjectDocuments([]);
      setLibraryDocumentsLoading(false);
      setLibraryDocumentsError('');
      return;
    }

    let cancelled = false;
    const embeddedCourseDocuments = getCourseDocuments(selectedCourses);
    setSelectedSubjectDocuments(mergeDocuments(
      embeddedCourseDocuments,
      filterDocumentsBySubjectIds(libraryDocuments, subjectIds)
    ));
    setLibraryDocumentsLoading(true);
    setLibraryDocumentsError('');

    const userId = getDefaultAiUserId();
    Promise.all([
      documentApi.getByUser(userId).catch(error => ({ error })),
      documentApi.getSharedWithMe(userId).catch(() => []),
      ...subjectIds.map(subjectId => documentApi.getBySubject(subjectId).catch(error => ({ error })))
    ])
      .then(([ownDocumentsResult, sharedDocumentsResult, ...subjectResults]) => {
        if (cancelled) return;
        const results = [ownDocumentsResult, sharedDocumentsResult, ...subjectResults];
        const failed = results.find(result => result && !Array.isArray(result) && result.error);
        const ownSubjectDocuments = Array.isArray(ownDocumentsResult)
          ? filterDocumentsBySubjectIds(ownDocumentsResult, subjectIds)
          : [];
        const sharedSubjectDocuments = Array.isArray(sharedDocumentsResult)
          ? filterDocumentsBySubjectIds(sharedDocumentsResult, subjectIds)
          : [];
        const subjectDocuments = subjectResults.flatMap(result => Array.isArray(result) ? result : []);
        const nextSubjectDocuments = mergeDocuments(
          embeddedCourseDocuments,
          ownSubjectDocuments,
          sharedSubjectDocuments,
          subjectDocuments
        );
        setSelectedSubjectDocuments(nextSubjectDocuments);
        setLibraryDocuments(prev => mergeDocuments(prev, nextSubjectDocuments));
        setLibraryDocumentsError(failed ? 'Could not load some documents for the selected subject.' : '');
      })
      .catch(error => {
        if (cancelled) return;
        setLibraryDocumentsError(error?.message || 'Could not load documents for the selected subject.');
      })
      .finally(() => {
        if (!cancelled) setLibraryDocumentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCourses]);

  useEffect(() => {
    const subjectIds = getCourseSubjectIds(selectedCourses);
    if (subjectIds.length === 0) return;

    const knownSubjectDocuments = filterDocumentsBySubjectIds(libraryDocuments, subjectIds);
    if (knownSubjectDocuments.length > 0) {
      setSelectedSubjectDocuments(prev => mergeDocuments(prev, knownSubjectDocuments));
    }
  }, [libraryDocuments, selectedCourses]);

  const handleDeleteThread = useCallback((thread) => {
    if (!thread?.id) return;
    const confirmed = window.confirm(`Delete chat history "${thread.title}"?`);
    if (!confirmed) return;

    deleteAiChatSession({ ...thread, userId: getDefaultAiUserId() })
      .then(() => refreshRecentThreads())
      .catch(error => {
        window.alert(error?.message || 'Could not delete this chat history.');
      });
  }, [refreshRecentThreads]);

  const actionCards = [
    {
      title: 'Summarize notes',
      description: 'Extract key points from uploaded PDF',
      tone: '#ede9fe',
      stroke: '#6d28d9',
      icon: (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </>
      )
    },
    {
      title: 'Practice Exam',
      description: 'Create a 10-question Bio test',
      tone: '#f1ebff',
      stroke: '#7c3aed',
      icon: (
        <>
          <path d="M9 11l3 3L22 4"></path>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
        </>
      )
    },
    {
      title: 'Explain concepts',
      description: 'Break down difficult theories simply',
      tone: '#f4eee6',
      stroke: '#8a6a3e',
      icon: (
        <>
          <path d="M12 2a7 7 0 0 0-4 12.75V17h8v-2.25A7 7 0 0 0 12 2z"></path>
          <path d="M9 21h6"></path>
          <path d="M10 17h4"></path>
        </>
      )
    }
  ];

  const handleSendMessage = (text) => {
    navigate('/student/ai-tutor/chat', {
      state: { initialMessage: text, selectedCourses, selectedDocuments }
    });
  };

  const handleAddCourse = (course) => {
    setSelectedCourses(prev => (
      prev.some(item => item.code === course.code) ? prev : [...prev, course]
    ));
  };

  const handleRemoveCourse = (courseCode) => {
    setSelectedCourses(prev => {
      const removedCourse = prev.find(course => course.code === courseCode);
      const nextCourses = prev.filter(course => course.code !== courseCode);
      if (removedCourse) {
        const removedSubjectIds = (Array.isArray(removedCourse.subjectIds) && removedCourse.subjectIds.length
          ? removedCourse.subjectIds
          : [removedCourse.subjectId ?? removedCourse.id]).map(Number);
        setSelectedDocuments(documents => documents.filter(document => (
          !removedSubjectIds.includes(Number(document.subjectId ?? document.subject_id))
        )));
      }
      return nextCourses;
    });
  };

  const handleAddDocument = (document) => {
    const documentId = Number(document.documentId ?? document.document_id);
    if (!Number.isFinite(documentId)) return;
    setSelectedDocuments(prev => (
      prev.some(item => Number(item.documentId ?? item.document_id) === documentId) ? prev : [document]
    ));
  };

  const handleRemoveDocument = (documentId) => {
    setSelectedDocuments(prev => prev.filter(document => Number(document.documentId ?? document.document_id) !== Number(documentId)));
  };

  return (
    <div className="ai-tutor-shell" style={{ display: 'flex', height: 'calc(100vh - 78px)', width: '100%', minWidth: 0, overflow: 'hidden', background: 'linear-gradient(135deg, #ffffff 0%, #fbfaff 62%, #f7f4ff 100%)' }}>
      <ChatSidebar threads={recentThreads} recentError={recentError} onDeleteThread={handleDeleteThread} variant="newChat" showCourseFolders={false} />
      <div className="ai-tutor-main" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '0 40px', overflow: 'hidden' }}>
        <main className="ai-tutor-hero" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '34px 0 28px' }}>
          
          <div style={{ 
            width: '58px', 
            height: '58px', 
            background: 'linear-gradient(135deg, #3526c4, #7c3aed)', 
            borderRadius: '14px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: 'white',
            marginBottom: '42px',
            boxShadow: '0 18px 30px rgba(76, 29, 149, 0.22)',
            transform: 'rotate(3deg)'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="31" height="31" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.912 5.813a2 2 0 0 0 1.272 1.272L21 12l-5.813 1.912a2 2 0 0 0-1.272 1.272L12 21l-1.912-5.813a2 2 0 0 0-1.272-1.272L3 12l5.813-1.912a2 2 0 0 0 1.272-1.272L12 3z"></path>
            </svg>
          </div>

          <h1 className="ai-tutor-title" style={{ fontSize: '2rem', lineHeight: 1.18, fontWeight: '850', color: '#111827', margin: '0 0 18px', textAlign: 'center', maxWidth: '760px', letterSpacing: '-0.01em' }}>
            Hello Alex, what subject would you like to <span style={{ color: '#3329b7', textDecoration: 'underline', textDecorationColor: '#3329b7', textDecorationThickness: '3px', textUnderlineOffset: '6px' }}>study today?</span>
          </h1>
          
          <p className="ai-tutor-subtitle" style={{ fontSize: '1rem', color: '#5f6678', textAlign: 'center', maxWidth: '620px', lineHeight: '1.6', margin: '0 0 62px' }}>
            I can help you summarize notes, solve complex equations, or practice for your upcoming midterms. Just ask!
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '24px', width: '100%', maxWidth: '760px' }}>
            {actionCards.map((card) => (
              <button
                key={card.title}
                type="button"
                className="ai-action-card"
                style={{ 
                  minHeight: '200px',
                  background: '#ffffff', 
                  border: '1px solid #ddddea', 
                  borderRadius: '24px', 
                  padding: '26px 22px 24px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'flex-start',
                  textAlign: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 16px 34px rgba(31, 41, 55, 0.04)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  color: '#111827'
                }}
              >
                <span style={{ width: '46px', height: '46px', flex: '0 0 46px', borderRadius: '14px', background: card.tone, display: 'grid', placeItems: 'center', marginBottom: '20px' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={card.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {card.icon}
                  </svg>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '24px', width: '100%', fontSize: '1rem', lineHeight: 1.2, fontWeight: 850, marginBottom: '10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {card.title}
                </span>
                <span style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', minHeight: '38px', maxWidth: '150px', fontSize: '0.82rem', lineHeight: 1.35, color: '#555b6d', fontWeight: 500 }}>
                  {card.description}
                </span>
              </button>
            ))}
          </div>

        </main>
        
        <ChatInput
          onSendMessage={handleSendMessage}
          selectedCourses={selectedCourses}
          selectedDocuments={selectedDocuments}
          onAddCourse={handleAddCourse}
          onRemoveCourse={handleRemoveCourse}
          onAddDocument={handleAddDocument}
          onRemoveDocument={handleRemoveDocument}
          libraryCourses={libraryCourses}
          libraryDocuments={selectedSubjectDocuments}
          libraryCoursesError={libraryCoursesError}
          libraryDocumentsLoading={libraryDocumentsLoading}
          libraryDocumentsError={libraryDocumentsError}
        />
      </div>
    </div>
  );
}

export default StudentAITutorPage;
