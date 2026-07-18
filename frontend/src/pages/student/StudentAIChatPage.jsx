import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ChatSidebar from '../../components/student/chat/ChatSidebar';
import ChatMessage from '../../components/student/chat/ChatMessage';
import ChatInput from '../../components/student/chat/ChatInput';
import Modal from '../../components/common/Modal';
import { askAiChat, deleteAiChatSession, getDefaultAiUserId, listAiChatMessages, listAiChatSessions } from '../../services/aiChatService';
import { documentApi, libraryApi } from '../../services/libraryApi';
import { mergeLibraryCourses } from '../../utils/libraryCourses';

function documentFileUrl(documentId, action) {
  if (!documentId) return '';
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
  return `${apiBase.replace(/\/$/, '')}/documents/${documentId}/${action}`;
}

async function fetchDocumentFile(documentId, action) {
  const token = localStorage.getItem('token');
  const response = await fetch(documentFileUrl(documentId, action), {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Could not ${action} this document.`);
  }
  return response.blob();
}

function getSourceName(source) {
  return typeof source === 'string'
    ? source
    : source?.documentName || source?.document_name || source?.title || 'Source document';
}

function getSourceDocumentId(source) {
  return source?.documentId || source?.document_id || null;
}

function getSourceSubjectName(source) {
  const code = source?.subjectCode || source?.subject_code || '';
  const name = source?.subjectName || source?.subject_name || '';
  return [code, name].filter(Boolean).join(' - ');
}

function normalizeSourceName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function documentToSource(doc, fallbackSource = {}) {
  return {
    ...fallbackSource,
    documentId: doc.documentId ?? doc.document_id,
    documentName: doc.documentName ?? doc.document_name ?? doc.title,
    title: doc.title,
    subjectId: doc.subjectId ?? doc.subject_id,
    subjectName: doc.subjectName ?? doc.subject_name,
    documentUrl: doc.documentUrl ?? doc.document_url
  };
}

function createPendingAiMessage(id) {
  return {
    id,
    role: 'assistant',
    content: 'Sending your question to AI...',
    sources: [],
    isPending: true
  };
}

function createLoadingHistoryMessage(sessionId) {
  return {
    id: `loading-history-${sessionId}`,
    role: 'assistant',
    content: 'Loading saved chat history...',
    sources: [],
    isPending: true
  };
}

function createEmptyHistoryMessage(sessionId) {
  return {
    id: `empty-history-${sessionId}`,
    role: 'assistant',
    content: 'This chat exists in the backend, but it has no saved messages yet.',
    sources: [],
    isError: true
  };
}


function getBackendSessionId(response) {
  return response?.sessionId ?? response?.session_id ?? null;
}

function getPrimarySources(sources = []) {
  if (!Array.isArray(sources) || sources.length === 0) return [];

  const primarySource = sources.find(source => {
    if (!source || typeof source === 'string') return false;
    return Boolean(source.primary || source.isPrimary || source.is_primary)
      || Number(source.rank) === 1
      || Number(source.sourceRank) === 1
      || Number(source.source_rank) === 1;
  });

  return [primarySource || sources[0]];
}

function getBackendSources(response) {
  return getPrimarySources(Array.isArray(response?.sources) ? response.sources : []);
}

function isReferencedDocumentQuestion(text = '') {
  const normalized = String(text).toLowerCase();
  return /\b(this|that|it)\s+(document|file)\b/.test(normalized)
    || /\b(document|file)\b/.test(normalized) && /\b(this|that|it)\b/.test(normalized)
    || normalized.includes('tài liệu này')
    || normalized.includes('tai lieu nay')
    || normalized.includes('tài liệu đó')
    || normalized.includes('tai lieu do');
}

function getLatestSourceDocumentId(messages = []) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const sources = messages[index]?.sources || messages[index]?.backendSources || [];
    const documentId = getSourceDocumentId(Array.isArray(sources) ? sources[0] : null);
    if (documentId) return documentId;
  }
  return null;
}

function parseMessageSources(message) {
  const rawSources = message?.sources || message?.backendSources || message?.backend_sources;
  if (Array.isArray(rawSources)) {
    return rawSources;
  }

  const rawJson = message?.sourcesJson || message?.sources_json;
  if (!rawJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getMessageSourceNames(message) {
  return parseMessageSources(message)
    .map(getSourceName)
    .filter(Boolean);
}

function createBackendAiMessage(id, response) {
  const sources = getBackendSources(response);
  return {
    id,
    role: 'assistant',
    content: response?.answer || 'AI service did not return an answer.',
    sources,
    backendSources: sources,
    usedMockAi: response?.usedMockAi ?? response?.used_mock_ai ?? false
  };
}

function getSelectedSubjectId(courses = []) {
  const selected = courses.find(course => Number.isFinite(Number(course.subjectId)));
  return selected ? Number(selected.subjectId) : null;
}

function getSelectedDocumentIds(documents = []) {
  return documents
    .map(document => Number(document.documentId ?? document.document_id))
    .filter(Number.isFinite);
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

function createErrorAiMessage(id, error) {
  const rawMessage = error?.message || '';
  const isTimeout = rawMessage.includes('AI service did not respond in time');
  if (isTimeout) {
    return {
      id,
      role: 'assistant',
      content: 'AI is still processing this answer. I will refresh this chat shortly; you can also reopen the chat in a moment.',
      sources: [],
      isPending: true
    };
  }

  const shouldHideRawMessage = rawMessage.includes('Python AI service request failed')
    || rawMessage.includes('422 Unprocessable Entity')
    || rawMessage.includes('"loc":["body"]');

  return {
    id,
    role: 'assistant',
    content: shouldHideRawMessage
      ? 'Cannot reach AI service right now. Please refresh the page and try again.'
      : `Cannot reach AI service right now.\n\n${rawMessage || 'Please make sure Spring Boot, Python AI service, and SQL Server are running.'}`,
    sources: [],
    isError: true
  };
}

function isAiTimeoutError(error) {
  return (error?.message || '').includes('AI service did not respond in time');
}

function hasAssistantAnswerAfterQuestion(messages = [], questionText = '') {
  const normalizedQuestion = String(questionText || '').trim();
  if (!normalizedQuestion) return messages.some(message => message.role === 'assistant');

  let sawQuestion = false;
  for (const message of messages) {
    if (message.role === 'user' && String(message.content || '').trim() === normalizedQuestion) {
      sawQuestion = true;
      continue;
    }
    if (sawQuestion && message.role === 'assistant' && String(message.content || '').trim()) {
      return true;
    }
  }
  return false;
}

function mapBackendSessionToThread(session) {
  const id = session?.sessionId ?? session?.session_id;
  const title = session?.sessionTitle ?? session?.session_title ?? 'New AI Chat';
  const documentId = session?.documentId ?? session?.document_id ?? null;

  return {
    id,
    title,
    documentId,
    topic: 'Saved chat',
    updatedAt: session?.updatedAt || session?.updated_at || session?.createdAt || session?.created_at || ''
  };
}

function mapBackendMessageToMessage(message) {
  const backendSources = getPrimarySources(parseMessageSources(message));
  return {
    id: message?.messageId ?? message?.message_id ?? `${message?.session_id || 'session'}-${message?.created_at || Date.now()}`,
    role: message?.role || 'assistant',
    content: message?.content || '',
    sources: backendSources,
    backendSources
  };
}

function StudentAIChatPage() {
  const params = useParams();
  const chatId = params.chatId || params.threadId;
  const location = useLocation();
  const navigate = useNavigate();
  const initialMessage = !chatId ? location.state?.initialMessage : null;
  const initialCourses = !chatId ? location.state?.selectedCourses || [] : [];
  const initialMessageIdRef = useRef(Date.now());
  const handledInitialMessageKeyRef = useRef(null);
  const localThreadMessagesRef = useRef(null);
  const historyLoadRequestIdRef = useRef(0);
  const chatRequestIdRef = useRef(0);
  const [messages, setMessages] = useState(() => {
    if (initialMessage) {
      return [{
        id: initialMessageIdRef.current,
        role: 'user',
        content: initialMessage
      }];
    }
    return [];
  });
  const [localThreads, setLocalThreads] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const numericChatId = Number(chatId);
    return Number.isFinite(numericChatId) && numericChatId > 0 ? numericChatId : null;
  });
  const [recentError, setRecentError] = useState('');
  const [libraryCourses, setLibraryCourses] = useState([]);
  const [libraryCoursesError, setLibraryCoursesError] = useState('');
  const [libraryDocuments, setLibraryDocuments] = useState([]);
  const [selectedSubjectDocuments, setSelectedSubjectDocuments] = useState([]);
  const [libraryDocumentsLoading, setLibraryDocumentsLoading] = useState(false);
  const [libraryDocumentsError, setLibraryDocumentsError] = useState('');
  const [selectedCourses, setSelectedCourses] = useState(initialCourses);
  const [selectedDocuments, setSelectedDocuments] = useState(() => !chatId ? location.state?.selectedDocuments || [] : []);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [selectedSource, setSelectedSource] = useState(null);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState('');
  const [sourcePreviewError, setSourcePreviewError] = useState('');
  const [sourcePreviewLoading, setSourcePreviewLoading] = useState(false);
  const refreshRecentThreads = useCallback(() => {
    listAiChatSessions(getDefaultAiUserId())
      .then(sessions => {
        setRecentError('');
        if (Array.isArray(sessions)) {
          setLocalThreads(sessions.map(mapBackendSessionToThread).filter(thread => thread.id));
        }
      })
      .catch(error => {
        setRecentError(error?.message || 'Cannot load recent chats from backend.');
      });
  }, []);

  const loadSessionMessages = useCallback((sessionId) => {
    const numericSessionId = Number(sessionId);
    if (!Number.isFinite(numericSessionId) || numericSessionId <= 0) return;

    const requestId = historyLoadRequestIdRef.current + 1;
    historyLoadRequestIdRef.current = requestId;

    window.scrollTo({ top: 0, left: 0 });
    setActiveSessionId(numericSessionId);
    setSelectedCourses([]);
    setSelectedDocuments([]);
    setHighlightedMessageId(null);
    setSelectedSource(null);
    setMessages([createLoadingHistoryMessage(numericSessionId)]);

    listAiChatMessages(numericSessionId, getDefaultAiUserId())
      .then(history => {
        if (historyLoadRequestIdRef.current !== requestId) return;

        const nextMessages = (Array.isArray(history) ? history : [])
          .map(mapBackendMessageToMessage)
          .filter(message => message.content.trim());

        setMessages(nextMessages.length > 0 ? nextMessages : [createEmptyHistoryMessage(numericSessionId)]);
        localThreadMessagesRef.current = nextMessages;
      })
      .catch(error => {
        if (historyLoadRequestIdRef.current !== requestId) return;

        setMessages([{
          id: `load-error-${numericSessionId}`,
          role: 'assistant',
          content: `Could not load this chat history from backend.\n\n${error?.message || 'Please try again.'}`,
          sources: [],
          isError: true
        }]);
      });
  }, []);

  const scheduleHistoryRefresh = useCallback((sessionId, expectedQuestion = '', attempts = 3) => {
    const numericSessionId = Number(sessionId);
    if (!Number.isFinite(numericSessionId) || numericSessionId <= 0 || attempts <= 0) return;

    const delayMs = (4 - attempts) * 4000 + 4000;
    window.setTimeout(() => {
      listAiChatMessages(numericSessionId, getDefaultAiUserId())
        .then(history => {
          const nextMessages = (Array.isArray(history) ? history : [])
            .map(mapBackendMessageToMessage)
            .filter(message => message.content.trim());

          const hasAssistantAnswer = hasAssistantAnswerAfterQuestion(nextMessages, expectedQuestion);
          if (hasAssistantAnswer) {
            setMessages(nextMessages);
            localThreadMessagesRef.current = nextMessages;
            refreshRecentThreads();
            return;
          }

          scheduleHistoryRefresh(numericSessionId, expectedQuestion, attempts - 1);
        })
        .catch(() => {
          scheduleHistoryRefresh(numericSessionId, expectedQuestion, attempts - 1);
        });
    }, delayMs);
  }, [refreshRecentThreads]);

  const startInitialChat = useCallback((text, courses, documents, messageKey) => {
    const cleanText = String(text || '').trim();
    if (!cleanText || handledInitialMessageKeyRef.current === messageKey) return;

    handledInitialMessageKeyRef.current = messageKey;
    historyLoadRequestIdRef.current += 1;
    const requestId = chatRequestIdRef.current + 1;
    chatRequestIdRef.current = requestId;

    const userMessageId = Date.now();
    const pendingResponseId = userMessageId + 1;
    const userMessage = {
      id: userMessageId,
      role: 'user',
      content: cleanText
    };
    const pendingResponse = createPendingAiMessage(pendingResponseId);
    const nextMessages = [userMessage, pendingResponse];

    window.scrollTo({ top: 0, left: 0 });
    setActiveSessionId(null);
    setSelectedCourses(courses || []);
    setSelectedDocuments(documents || []);
    setHighlightedMessageId(null);
    setSelectedSource(null);
    setMessages(nextMessages);
    localThreadMessagesRef.current = nextMessages;

    const targetDocumentIds = getSelectedDocumentIds(documents || []);
    const targetDocumentId = targetDocumentIds.length === 1 ? targetDocumentIds[0] : null;

    askAiChat({
      userId: getDefaultAiUserId(),
      sessionId: null,
      subjectId: getSelectedSubjectId(courses),
      documentId: targetDocumentId,
      documentIds: targetDocumentIds,
      message: cleanText,
      topK: documents && documents.length > 0 ? 1 : 3
    })
      .then(response => {
        if (chatRequestIdRef.current !== requestId) return;

        const backendSessionId = getBackendSessionId(response);
        if (backendSessionId) setActiveSessionId(backendSessionId);
        refreshRecentThreads();
        const aiResponse = createBackendAiMessage(pendingResponseId, response);
        setMessages(prev => {
          const updatedMessages = prev.map(message => (
            message.id === pendingResponseId ? aiResponse : message
          ));
          localThreadMessagesRef.current = updatedMessages;
          return updatedMessages;
        });
      })
      .catch(error => {
        if (chatRequestIdRef.current !== requestId) return;

        const aiResponse = createErrorAiMessage(pendingResponseId, error);
        setMessages(prev => {
          const updatedMessages = prev.map(message => (
            message.id === pendingResponseId ? aiResponse : message
          ));
          localThreadMessagesRef.current = updatedMessages;
          return updatedMessages;
        });
        if (isAiTimeoutError(error)) {
          refreshRecentThreads();
        }
      });
  }, [refreshRecentThreads]);

  useEffect(() => {
    refreshRecentThreads();
  }, [refreshRecentThreads]);

  useEffect(() => {
    const userId = getDefaultAiUserId();
    libraryApi.getOverview(userId)
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
        setLibraryCourses(mergeLibraryCourses(courses));
        setLibraryCoursesError('');
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

  // Auto-restore selected document and course for the active session
  useEffect(() => {
    if (!activeSessionId) return;
    const thread = localThreads.find(t => Number(t.id) === Number(activeSessionId));
    if (!thread || !thread.documentId) return;

    const documentId = Number(thread.documentId);
    const document = libraryDocuments.find(d => Number(d.documentId ?? d.document_id) === documentId);
    if (document) {
      setSelectedDocuments(prev => {
        const hasDoc = prev.some(d => Number(d.documentId ?? d.document_id) === documentId);
        return hasDoc ? prev : [document];
      });
      const courseSubjectId = Number(document.subjectId ?? document.subject_id);
      const course = libraryCourses.find(c => Number(c.subjectId ?? c.id) === courseSubjectId);
      if (course) {
        setSelectedCourses(prev => {
          const hasCourse = prev.some(c => c.code === course.code);
          return hasCourse ? prev : [course];
        });
      }
    }
  }, [activeSessionId, localThreads, libraryDocuments, libraryCourses]);

  useEffect(() => {
    const documentId = getSourceDocumentId(selectedSource);
    if (!documentId) {
      setSourcePreviewUrl('');
      setSourcePreviewError('');
      setSourcePreviewLoading(false);
      return undefined;
    }

    let objectUrl = '';
    let cancelled = false;
    setSourcePreviewUrl('');
    setSourcePreviewError('');
    setSourcePreviewLoading(true);

    fetchDocumentFile(documentId, 'preview')
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSourcePreviewUrl(objectUrl);
      })
      .catch(error => {
        if (!cancelled) {
          setSourcePreviewError(error.message || 'Could not load document preview.');
        }
      })
      .finally(() => {
        if (!cancelled) setSourcePreviewLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedSource]);

  useEffect(() => {
    if (!chatId && !initialMessage) {
      navigate('/student/ai-tutor', { replace: true });
    }
  }, [chatId, initialMessage, navigate]);

  useEffect(() => {
    const numericChatId = Number(chatId);
    const nextSessionId = Number.isFinite(numericChatId) && numericChatId > 0 ? numericChatId : null;

    if (nextSessionId) {
      loadSessionMessages(nextSessionId);
    } else if (initialMessage) {
      const initialDocs = location.state?.selectedDocuments || [];
      startInitialChat(initialMessage, initialCourses, initialDocs, `${location.key || 'initial'}:${initialMessage}`);
    } else {
      setActiveSessionId(null);
      setMessages([]);
    }
    setHighlightedMessageId(null);
  }, [chatId, initialMessage, loadSessionMessages, location.key, startInitialChat]);

  const citedSources = messages.reduce((acc, msg) => {
    if (msg.sources && msg.sources.length > 0) {
      msg.sources.forEach(src => {
        const sourceKey = getSourceDocumentId(src) || getSourceName(src);
        if (!acc.find(item => (getSourceDocumentId(item.source) || getSourceName(item.source)) === sourceKey)) {
          acc.push({ source: src, messageId: msg.id });
        }
      });
    }
    return acc;
  }, []);
  const swrCourseFiles = citedSources
    .map(item => item.source)
    .filter(source => getSourceName(source).startsWith('COS '))
    .map(getSourceName);
  const courseFolder = swrCourseFiles.length > 0
    ? { name: 'SWR', files: swrCourseFiles }
    : null;

  const handleSourceClick = (sourceOrItem) => {
    const source = sourceOrItem?.source ? sourceOrItem.source : sourceOrItem;
    const messageId = typeof sourceOrItem === 'string' ? null : sourceOrItem.messageId;
    const sourceName = getSourceName(source);
    const sourceKey = normalizeSourceName(sourceName);
    const resolvedDocument = getSourceDocumentId(source)
      ? null
      : libraryDocuments.find(doc => {
          const names = [
            doc.documentName,
            doc.document_name,
            doc.title,
            doc.name
          ].map(normalizeSourceName);
          return names.includes(sourceKey);
        });

    setSelectedSource(resolvedDocument ? documentToSource(resolvedDocument, typeof source === 'object' ? source : {}) : source);

    if (!messageId) return;

    setHighlightedMessageId(messageId);
    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 3000);
  };

  const handleSourceDownload = async () => {
    const documentId = getSourceDocumentId(selectedSource);
    if (!documentId) return;

    try {
      setSourcePreviewError('');
      const blob = await fetchDocumentFile(documentId, 'download');
      const objectUrl = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = objectUrl;
      link.download = getSourceName(selectedSource);
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setSourcePreviewError(error.message || 'Could not download this document.');
    }
  };

  const handleSendMessage = (text) => {
    const userMessageId = Date.now();
    const pendingResponseId = userMessageId + 1;
    const currentMessages = localThreadMessagesRef.current || messages;
    const referencedDocumentId = isReferencedDocumentQuestion(text)
      ? getLatestSourceDocumentId(currentMessages)
      : null;
    const newMessage = {
      id: userMessageId,
      role: 'user',
      content: text
    };
    const pendingResponse = createPendingAiMessage(pendingResponseId);
    
    setMessages(prev => {
      const nextMessages = [...prev, newMessage, pendingResponse];
      localThreadMessagesRef.current = nextMessages;
      return nextMessages;
    });

    const targetDocumentIds = referencedDocumentId ? [referencedDocumentId] : getSelectedDocumentIds(selectedDocuments);
    const targetDocumentId = targetDocumentIds.length === 1 ? targetDocumentIds[0] : null;

    askAiChat({
      userId: getDefaultAiUserId(),
      sessionId: activeSessionId,
      subjectId: getSelectedSubjectId(selectedCourses),
      documentId: targetDocumentId,
      documentIds: targetDocumentIds,
      message: text,
      topK: referencedDocumentId || selectedDocuments.length > 0 ? 1 : 3
    })
      .then(response => {
        const backendSessionId = getBackendSessionId(response);
        if (backendSessionId) setActiveSessionId(backendSessionId);
        refreshRecentThreads();
        const aiResponse = createBackendAiMessage(pendingResponseId, response);
        setMessages(prev => {
          const nextMessages = prev.map(message => (
            message.id === pendingResponseId ? aiResponse : message
          ));
          localThreadMessagesRef.current = nextMessages;
          return nextMessages;
        });
      })
      .catch(error => {
        const aiResponse = createErrorAiMessage(pendingResponseId, error);
        const sessionIdForRefresh = activeSessionId;
        setMessages(prev => {
          const nextMessages = prev.map(message => (
            message.id === pendingResponseId ? aiResponse : message
          ));
          localThreadMessagesRef.current = nextMessages;
          return nextMessages;
        });
        if (isAiTimeoutError(error)) {
          scheduleHistoryRefresh(sessionIdForRefresh, text);
        }
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

  const handleNewChat = () => {
    window.scrollTo({ top: 0, left: 0 });
    localThreadMessagesRef.current = null;
    handledInitialMessageKeyRef.current = null;
    chatRequestIdRef.current += 1;
    historyLoadRequestIdRef.current += 1;
    setMessages([]);
    setActiveSessionId(null);
    setSelectedCourses([]);
    setSelectedDocuments([]);
    setHighlightedMessageId(null);
    setSelectedSource(null);
    refreshRecentThreads();
  };

  const handleThreadSelect = useCallback((thread) => {
    if (!thread?.id) return;
    loadSessionMessages(thread.id);
  }, [loadSessionMessages]);

  const handleDeleteThread = useCallback((thread) => {
    if (!thread?.id) return;
    const confirmed = window.confirm(`Delete chat history "${thread.title}"?`);
    if (!confirmed) return;

    deleteAiChatSession({ ...thread, userId: getDefaultAiUserId() })
      .then(() => {
        refreshRecentThreads();
        const deletedSessionId = Number(thread.id);
        const currentSessionId = Number(activeSessionId ?? chatId);
        if (Number.isFinite(deletedSessionId) && deletedSessionId === currentSessionId) {
          localThreadMessagesRef.current = null;
          setMessages([]);
          setActiveSessionId(null);
          setSelectedCourses([]);
          setSelectedDocuments([]);
          setHighlightedMessageId(null);
          setSelectedSource(null);
          navigate('/student/ai-tutor', { replace: true });
        }
      })
      .catch(error => {
        window.alert(error?.message || 'Could not delete this chat history.');
      });
  }, [activeSessionId, chatId, navigate, refreshRecentThreads]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 78px)', width: '100%', minWidth: 0, overflow: 'hidden', background: '#fafafa' }}>
      <ChatSidebar
        threads={localThreads}
        citedSources={citedSources}
        onSourceClick={handleSourceClick}
        onNewChat={handleNewChat}
        onThreadSelect={handleThreadSelect}
        onDeleteThread={handleDeleteThread}
        recentError={recentError}
        variant={courseFolder ? 'newChat' : 'sources'}
        showCourseFolders={Boolean(courseFolder)}
        courseFolder={courseFolder}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 40px', overflow: 'hidden' }}>
        <main style={{ flex: 1, overflowY: 'auto', padding: '40px 0' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isHighlighted={msg.id === highlightedMessageId}
                onSourceClick={handleSourceClick}
              />
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
      <Modal
        isOpen={Boolean(selectedSource)}
        title={selectedSource ? getSourceName(selectedSource) : 'Source preview'}
        onClose={() => setSelectedSource(null)}
        contentClassName="modal-content-wide"
      >
        {selectedSource && (
          <div className="source-preview-modal" style={{ display: 'grid', gap: '14px', color: '#1f2937', width: '100%' }}>
            {(() => {
              const sourceName = getSourceName(selectedSource);
              const documentId = getSourceDocumentId(selectedSource);
              const fileExt = sourceName.split('.').pop()?.toUpperCase() || 'FILE';

              if (documentId) {
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          Document Preview
                        </div>
                        {getSourceSubjectName(selectedSource) && (
                          <div style={{ marginTop: '3px', color: '#64748b', fontSize: '0.82rem', fontWeight: 650 }}>
                            {getSourceSubjectName(selectedSource)}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span style={{ borderRadius: '999px', background: '#eef2ff', color: '#4338ca', padding: '6px 10px', fontSize: '0.78rem', fontWeight: 800 }}>
                          {fileExt}
                        </span>
                        <button
                          type="button"
                          onClick={handleSourceDownload}
                          style={{ borderRadius: '10px', background: '#4f46e5', color: '#fff', padding: '8px 12px', fontSize: '0.82rem', fontWeight: 800, textDecoration: 'none' }}
                        >
                          Download
                        </button>
                      </div>
                    </div>

                    {selectedSource.summaryPreview || selectedSource.summary_preview ? (
                      <div style={{ borderRadius: '10px', background: '#f8fafc', border: '1px solid #e5e7eb', padding: '12px', color: '#475569', fontSize: '0.85rem', lineHeight: 1.6 }}>
                        <strong style={{ color: '#312e81' }}>Matched summary: </strong>
                        {selectedSource.summaryPreview || selectedSource.summary_preview}
                      </div>
                    ) : null}

                    <div className="source-preview-scroll" style={{ height: '68vh', overflow: 'hidden', background: '#f1f5f9', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                      {sourcePreviewLoading ? (
                        <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#64748b', fontWeight: 700 }}>
                          Loading preview...
                        </div>
                      ) : sourcePreviewUrl ? (
                        <iframe
                          src={sourcePreviewUrl}
                          title={sourceName}
                          style={{ width: '100%', height: '100%', border: 0, background: '#ffffff' }}
                        />
                      ) : (
                        <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#ef4444', padding: '24px', textAlign: 'center', fontWeight: 700 }}>
                          {sourcePreviewError || 'Could not load document preview.'}
                        </div>
                      )}
                    </div>
                  </>
                );
              }

              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Document Preview
                      </div>
                      <div style={{ marginTop: '4px', fontSize: '1.05rem', fontWeight: 850, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sourceName}
                      </div>
                    </div>
                    <span style={{ borderRadius: '999px', background: '#f1f5f9', color: '#475569', padding: '6px 10px', fontSize: '0.78rem', fontWeight: 800 }}>
                      Not linked
                    </span>
                  </div>

                  <div style={{ minHeight: '360px', display: 'grid', placeItems: 'center', borderRadius: '12px', border: '1px dashed #cbd5e1', background: '#f8fafc', padding: '32px', textAlign: 'center' }}>
                    <div style={{ maxWidth: '520px' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#eef2ff', color: '#4f46e5', display: 'grid', placeItems: 'center', margin: '0 auto 14px', fontWeight: 900 }}>
                        PDF
                      </div>
                      <h3 style={{ margin: '0 0 8px', fontSize: '1.05rem', color: '#111827' }}>
                        Could not find this document in your Library
                      </h3>
                      <p style={{ margin: 0, color: '#64748b', lineHeight: 1.65 }}>
                        This citation only contains the file name, so AI Chat cannot open the real preview yet. Ask a new question after the latest backend source format is saved, or make sure a document with this exact name exists in your Library.
                      </p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default StudentAIChatPage;

