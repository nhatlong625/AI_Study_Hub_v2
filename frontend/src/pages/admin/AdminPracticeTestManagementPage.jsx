import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';

const STATUS_CFG = {
  'Published':      { cls: 'ptm-status-published',  label: 'Published'      },
  'Pending Review': { cls: 'ptm-status-pending',     label: 'Pending Review' },
  'Flagged':        { cls: 'ptm-status-flagged',     label: 'Flagged'        },
};

const DIFF_CFG = {
  Easy:   { cls: 'ptm-diff-easy',   label: 'Easy'   },
  Medium: { cls: 'ptm-diff-medium', label: 'Medium' },
  Hard:   { cls: 'ptm-diff-hard',   label: 'Hard'   },
};

const ITEMS_PER_PAGE = 10;

const ChevronIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function PracticeTestManagementPage() {
  const [subjectFilter,  setSubjectFilter]  = useState('Subject');
  const [statusFilter,   setStatusFilter]   = useState('Status');
  const [diffFilter,     setDiffFilter]     = useState('Difficulty');
  const [typeFilter,     setTypeFilter]     = useState('Created Type');
  const [page,           setPage]           = useState(1);
  const [questionPage,   setQuestionPage]   = useState(1);
  const [selectedTest,   setSelectedTest]   = useState(null);
  const [deleteTest,     setDeleteTest]     = useState(null);
  const [showReviewQueue, setShowReviewQueue] = useState(false);
  const [activeTab,      setActiveTab]      = useState('all');
  const [rqReject,       setRqReject]       = useState(null);
  const [rqEdit,         setRqEdit]         = useState(null);
  const [rqApprove,      setRqApprove]      = useState(null);
  const [rqEditForm, setRqEditForm] = useState({ question: '', answer: '' });
  const [reviewQueue, setReviewQueue] = useState([]);
  const [practiceTests,  setPracticeTests]  = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [editQuestion, setEditQuestion] = useState(null);
  const [editQuestionForm, setEditQuestionForm] = useState({
    question: '',
    type: 'Multiple Choice',
    difficulty: 'Medium',
    options: [],
    correctIndex: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const loadPracticeTests = async () => {
    try {
      setIsLoading(true);
      setError('');
      const tests = await adminService.getPracticeTests();
      setPracticeTests(tests);
    } catch (err) {
      setError(err.message);
      setPracticeTests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPracticeTests();
  }, []);

  const loadReviewQueue = async () => {
    try {
      setError('');
      const items = await adminService.getPracticeReviewQueue();
      setReviewQueue(items);
    } catch (err) {
      setError(err.message);
      setReviewQueue([]);
    }
  };

  const openTestDetail = async (test) => {
    try {
      setError('');
      setSelectedTest(test);
      setQuestionPage(1);
      const questions = await adminService.getPracticeTestQuestions(test.id);
      setSelectedQuestions(questions);
    } catch (err) {
      setError(err.message);
      setSelectedQuestions([]);
    }
  };

  const handleDeleteTest = async () => {
    try {
      setIsSaving(true);
      setError('');
      await adminService.deletePracticeTest(deleteTest.id);
      await loadPracticeTests();
      setDeleteTest(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const openQuestionEditor = (question) => {
    const options = Array.isArray(question.options)
      ? question.options.map(option => ({ ...option }))
      : [];
    if (options.length === 0 && question.answer) {
      options.push({ content: question.answer, isCorrect: true });
    }
    while (options.length < 4) {
      options.push({ content: '', isCorrect: false });
    }
    const markedIndex = options.findIndex(option => option.isCorrect);
    const answerIndex = options.findIndex(option => option.content === question.answer);
    setEditQuestion(question);
    setEditQuestionForm({
      question: question.question || '',
      type: question.type || 'Multiple Choice',
      difficulty: question.difficulty || 'Medium',
      options,
      correctIndex: markedIndex >= 0 ? markedIndex : Math.max(0, answerIndex),
    });
  };

  const handleSaveQuestion = async () => {
    try {
      setIsSaving(true);
      setError('');
      const updated = await adminService.updatePracticeTestQuestion(
        selectedTest.id,
        editQuestion.id,
        editQuestionForm,
      );
      setSelectedQuestions(current => current.map(question =>
        question.id === updated.id ? updated : question,
      ));
      setEditQuestion(null);
    } catch (err) {
      setError(err.message || 'Could not update question.');
    } finally {
      setIsSaving(false);
    }
  };

  const openReviewEdit = (item) => {
    setRqEdit(item);
    setRqEditForm({
      question: item.question,
      answer: item.aiAnswer || item.currentAnswer || '',
    });
  };

  const handleSaveReviewEdit = async () => {
    try {
      setIsSaving(true);
      setError('');
      await adminService.updatePracticeReviewQueueItem(rqEdit.id, {
        ...rqEdit,
        question: rqEditForm.question,
        aiAnswer: rqEdit.type === 'low' ? rqEditForm.answer : rqEdit.aiAnswer,
        currentAnswer: rqEdit.type === 'reported' ? rqEditForm.answer : rqEdit.currentAnswer,
      });
      await loadReviewQueue();
      setRqEdit(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResolveReviewItem = async (item, status) => {
    try {
      setIsSaving(true);
      setError('');
      await adminService.resolvePracticeReviewQueueItem(item.id, status);
      await loadReviewQueue();
      setRqReject(null);
      setRqApprove(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = practiceTests.filter(t => {
    if (statusFilter !== 'Status' && t.status !== statusFilter) return false;
    if (subjectFilter !== 'Subject' && t.subject !== subjectFilter) return false;
    if (typeFilter !== 'Created Type' && t.createdType !== typeFilter) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * ITEMS_PER_PAGE;
  const visibleTests = filtered.slice(pageStart, pageStart + ITEMS_PER_PAGE);
  const totalAttempts = practiceTests.reduce((sum, test) => sum + test.attempts, 0);
  const avgScore = practiceTests.length
    ? Math.round(practiceTests.reduce((sum, test) => sum + test.avg, 0) / practiceTests.length)
    : 0;
  const pendingCount = practiceTests.filter(test => test.status === 'Pending Review').length;
  const publishedCount = practiceTests.filter(test => test.status === 'Published').length;
  const aiGeneratedCount = practiceTests.filter(test => test.createdType === 'AI Generated').length;

  /* ── REVIEW QUEUE PAGE (early return) ── */
  if (showReviewQueue) {
    const pendingReviewQueue = reviewQueue.filter(item => item.status === 'Pending' || item.status === 'Edited');
    const tabs = [
      { key: 'all',      label: 'All Pending', count: pendingReviewQueue.length },
      { key: 'low',      label: 'Low Confidence', count: pendingReviewQueue.filter(q => q.type === 'low').length },
      { key: 'reported', label: 'Reported', count: pendingReviewQueue.filter(q => q.type === 'reported').length, alert: true },
    ];
    const visible = activeTab === 'all' ? pendingReviewQueue : pendingReviewQueue.filter(q => q.type === activeTab);
    return (
      <>
      <div className="ptm-page">
        <button className="ptm-back-btn" type="button" onClick={() => setShowReviewQueue(false)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Practice Tests
        </button>

        <h1 className="ptm-title">Question Review Queue</h1>

        {/* Tabs */}
        <div className="rq-tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`rq-tab${activeTab === t.key ? ' rq-tab-active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label} ({t.count})
              {t.alert && <span className="rq-tab-alert">!</span>}
            </button>
          ))}
        </div>

        {/* Question cards */}
        <div className="rq-cards">
          {visible.map(q => (
            <div key={q.id} className={`rq-card${q.type === 'low' ? ' rq-card-low' : ' rq-card-reported'}`}>
              {/* Card header */}
              <div className="rq-card-header">
                <div className="rq-card-meta">
                  <span className="rq-course">{q.course}</span>
                  <div className="rq-badges">
                    <span className="rq-id">{q.id}</span>
                    {q.type === 'low' && (
                      <span className="rq-badge rq-badge-low">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                          <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        Low Confidence: {q.flagScore}%
                      </span>
                    )}
                    {q.type === 'reported' && (
                      <span className="rq-badge rq-badge-reported">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                          <path d="M4 22v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        User Reported
                      </span>
                    )}
                  </div>
                </div>
                <span className="rq-time">{q.time}</span>
              </div>

              {/* Question */}
              <p className="rq-question">{q.question}</p>

              {/* Answer section */}
              {q.type === 'low' && (
                <>
                  <div className="rq-answer-box">
                    <div className="rq-answer-label">AI Suggested Answer:</div>
                    <div className="rq-answer-text">{q.aiAnswer}</div>
                  </div>
                  <div className="rq-flag-note">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    {q.flagNote}
                  </div>
                </>
              )}
              {q.type === 'reported' && (
                <div className="rq-report-row">
                  <div className="rq-answer-box rq-answer-box-half">
                    <div className="rq-answer-label">Current Answer:</div>
                    <div className="rq-answer-text">{q.currentAnswer}</div>
                  </div>
                  <div className="rq-report-box">
                    <div className="rq-answer-label rq-report-label">User Report ({q.userReport.student}):</div>
                    <div className="rq-report-text">{q.userReport.text}</div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="rq-actions">
                {q.type === 'low' ? (
                  <>
                    <button className="rq-btn rq-btn-reject" onClick={() => setRqReject(q)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Reject
                    </button>
                    <button className="rq-btn rq-btn-edit" onClick={() => openReviewEdit(q)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Edit
                    </button>
                    <button className="rq-btn rq-btn-approve" onClick={() => setRqApprove(q)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Approve
                    </button>
                  </>
                ) : (
                  <>
                    <button className="rq-btn rq-btn-reject" onClick={() => setRqReject(q)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Delete
                    </button>
                    <button className="rq-btn rq-btn-edit" onClick={() => openReviewEdit(q)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Quick Fix
                    </button>
                    <button className="rq-btn rq-btn-approve" onClick={() => setRqApprove(q)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Approve Fix
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── REJECT / DELETE MODAL ── */}
      {rqReject && (
        <div className="lib-modal-overlay" onClick={() => setRqReject(null)}>
          <div className="lib-modal-card lib-modal-delete" onClick={e => e.stopPropagation()}>
            <div className="lib-modal-icon-wrap lib-modal-icon-danger">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="lib-modal-title">{rqReject.type === 'low' ? 'Reject Question' : 'Delete Question'}</h2>
            <p className="lib-modal-subtitle">
              {rqReject.type === 'low'
                ? 'This question will be rejected and removed from the test. This action cannot be undone.'
                : 'This question will be permanently deleted from the system. This action cannot be undone.'}
            </p>
            <div className="rq-reject-note">
              <span className="rq-id">{rqReject.id}</span>
              <span className="rq-reject-q">{rqReject.question}</span>
            </div>
            <div className="lib-modal-divider" />
            <div className="lib-modal-footer">
              <button className="lib-modal-cancel-btn" onClick={() => setRqReject(null)}>Cancel</button>
              <button
                className="lib-modal-delete-btn"
                onClick={() => handleResolveReviewItem(rqReject, rqReject.type === 'low' ? 'Rejected' : 'Deleted')}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : rqReject.type === 'low' ? 'Reject' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT / QUICK FIX MODAL ── */}
      {rqEdit && (
        <div className="lib-modal-overlay" onClick={() => setRqEdit(null)}>
          <div className="lib-modal-card rq-edit-modal" onClick={e => e.stopPropagation()}>
            <div className="rq-edit-header">
              <div>
                <h2 className="lib-modal-title">{rqEdit.type === 'low' ? 'Edit Question' : 'Quick Fix'}</h2>
                <p className="lib-modal-subtitle">{rqEdit.id} &nbsp;•&nbsp; {rqEdit.course}</p>
              </div>
              <button className="rq-close-btn" onClick={() => setRqEdit(null)}>✕</button>
            </div>
            <div className="rq-edit-body">
              <div className="lib-form-group">
                <label className="lib-form-label">Question</label>
                <textarea
                  className="lib-form-input rq-textarea"
                  value={rqEditForm.question}
                  onChange={e => setRqEditForm(form => ({ ...form, question: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="lib-form-group">
                <label className="lib-form-label">{rqEdit.type === 'low' ? 'Corrected Answer' : 'Fixed Answer'}</label>
                <textarea
                  className="lib-form-input rq-textarea"
                  value={rqEditForm.answer}
                  onChange={e => setRqEditForm(form => ({ ...form, answer: e.target.value }))}
                  rows={3}
                />
              </div>
              {rqEdit.flagNote && (
                <div className="rq-flag-note">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {rqEdit.flagNote}
                </div>
              )}
            </div>
            <div className="lib-modal-divider" style={{ margin: '0 -32px' }}/>
            <div className="rq-edit-footer">
              <button className="lib-modal-cancel-btn" onClick={() => setRqEdit(null)}>Cancel</button>
              <button className="rq-btn rq-btn-approve" style={{ padding: '10px 22px' }} onClick={handleSaveReviewEdit} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── APPROVE MODAL ── */}
      {rqApprove && (
        <div className="lib-modal-overlay" onClick={() => setRqApprove(null)}>
          <div className="lib-modal-card lib-modal-delete" onClick={e => e.stopPropagation()}>
            <div className="lib-modal-icon-wrap" style={{ background: '#d1fae5', color: '#047857' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="lib-modal-title">{rqApprove.type === 'reported' ? 'Approve Fix' : 'Approve Question'}</h2>
            <p className="lib-modal-subtitle">
              {rqApprove.type === 'reported'
                ? 'This will apply the fix and mark the question as reviewed. The student report will be closed.'
                : 'This question will be approved and published to students. The AI flag will be cleared.'}
            </p>
            <div className="rq-reject-note rq-approve-note">
              <span className="rq-id">{rqApprove.id}</span>
              <span className="rq-reject-q">{rqApprove.question}</span>
            </div>
            <div className="lib-modal-divider" />
            <div className="lib-modal-footer">
              <button className="lib-modal-cancel-btn" onClick={() => setRqApprove(null)}>Cancel</button>
              <button className="rq-modal-approve-btn" onClick={() => handleResolveReviewItem(rqApprove, 'Approved')} disabled={isSaving}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {isSaving ? 'Saving...' : rqApprove.type === 'reported' ? 'Approve Fix' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
    );
  }

  /* ── TEST DETAIL PAGE (early return) ── */
  if (selectedTest) {
    const questions = selectedQuestions;
    const totalQuestionPages = Math.max(1, Math.ceil(questions.length / ITEMS_PER_PAGE));
    const safeQuestionPage = Math.min(questionPage, totalQuestionPages);
    const questionStart = (safeQuestionPage - 1) * ITEMS_PER_PAGE;
    const visibleQuestions = questions.slice(questionStart, questionStart + ITEMS_PER_PAGE);
    const s = STATUS_CFG[selectedTest.status] || {};
    return (
      <div className="ptm-page">
        {/* Back */}
        <button className="ptm-back-btn" type="button" onClick={() => { setSelectedTest(null); setSelectedQuestions([]); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Practice Tests
        </button>

        {error && (
          <div className="admin-conversations-error">{error}</div>
        )}

        {/* Title row */}
        <div className="ptm-detail-title-row">
          <div>
            <h1 className="ptm-title">{selectedTest.name}</h1>
            <p className="ptm-subtitle">{selectedTest.subject} &nbsp;•&nbsp; {selectedTest.docs} documents &nbsp;•&nbsp; Created by {selectedTest.creator.name}</p>
          </div>
          <span className={`ptm-status-badge ${s.cls}`}>{s.label}</span>
        </div>

        {/* Stat cards */}
        <div className="ptm-stats-row">
          <div className="ptm-stat-card">
            <div className="ptm-stat-label">TOTAL QUESTIONS</div>
            <div className="ptm-stat-value">{selectedTest.questions}</div>
          </div>
          <div className="ptm-stat-card">
            <div className="ptm-stat-label">TOTAL ATTEMPTS</div>
            <div className="ptm-stat-value ptm-stat-blue">{selectedTest.attempts}</div>
          </div>
          <div className="ptm-stat-card">
            <div className="ptm-stat-label">AVERAGE SCORE</div>
            <div className={`ptm-stat-value ${selectedTest.avg < 65 ? 'ptm-stat-red' : 'ptm-stat-blue'}`}>{selectedTest.avg}%</div>
          </div>
          <div className="ptm-stat-card">
            <div className="ptm-stat-label">DOCUMENTS USED</div>
            <div className="ptm-stat-value">{selectedTest.docs}</div>
          </div>
        </div>

        {/* Questions table */}
        <div className="ptm-table-card">
          <div className="ptm-detail-table-header">
            <span className="ptm-detail-table-title">Question List</span>
            <span className="ptm-detail-table-count">{questions.length} questions</span>
          </div>
          <div className="ptm-question-cards">
            {visibleQuestions.map((q, idx) => {
              const d = DIFF_CFG[q.difficulty] || {};
              const isEditing = editQuestion?.id === q.id;
              return (
                <article key={q.id} className={`ptm-question-card${isEditing ? ' editing' : ''}`}>
                  <div className="ptm-question-card-header">
                    <div className="ptm-question-card-meta">
                      <span className="ptm-question-number">Question {questionStart + idx + 1}</span>
                      <span className="ptm-type-badge">{isEditing ? editQuestionForm.type : q.type}</span>
                      <span className={`ptm-diff-badge ${d.cls}`}>{isEditing ? editQuestionForm.difficulty : d.label}</span>
                    </div>
                    {!isEditing && (
                      <button
                        type="button"
                        className="ptm-pencil-btn"
                        aria-label={`Edit question ${questionStart + idx + 1}`}
                        title="Edit question"
                        onClick={() => openQuestionEditor(q)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="ptm-inline-editor">
                      <textarea
                        className="ptm-inline-question-input"
                        rows={3}
                        value={editQuestionForm.question}
                        onChange={event => setEditQuestionForm(form => ({ ...form, question: event.target.value }))}
                      />
                      <div className="ptm-inline-meta-inputs">
                        <select
                          value={editQuestionForm.type}
                          onChange={event => setEditQuestionForm(form => ({ ...form, type: event.target.value }))}
                        >
                          <option>Multiple Choice</option>
                          <option>True/False</option>
                        </select>
                        <select
                          value={editQuestionForm.difficulty}
                          onChange={event => setEditQuestionForm(form => ({ ...form, difficulty: event.target.value }))}
                        >
                          <option>Easy</option>
                          <option>Medium</option>
                          <option>Hard</option>
                        </select>
                      </div>
                      <div className="ptm-inline-options">
                        {editQuestionForm.options.map((option, optionIndex) => (
                          <label
                            key={option.id || optionIndex}
                            className={`ptm-inline-option editable${editQuestionForm.correctIndex === optionIndex ? ' correct' : ''}`}
                          >
                            <input
                              type="radio"
                              name={`correct-answer-${q.id}`}
                              checked={editQuestionForm.correctIndex === optionIndex}
                              onChange={() => setEditQuestionForm(form => ({ ...form, correctIndex: optionIndex }))}
                            />
                            <strong>{String.fromCharCode(65 + optionIndex)}</strong>
                            <input
                              type="text"
                              value={option.content}
                              onChange={event => setEditQuestionForm(form => ({
                                ...form,
                                options: form.options.map((item, currentIndex) =>
                                  currentIndex === optionIndex ? { ...item, content: event.target.value } : item,
                                ),
                              }))}
                            />
                          </label>
                        ))}
                      </div>
                      <div className="ptm-inline-actions">
                        <button type="button" className="lib-modal-cancel-btn" onClick={() => setEditQuestion(null)}>Cancel</button>
                        <button
                          type="button"
                          className="rq-modal-approve-btn"
                          disabled={isSaving || !editQuestionForm.question.trim() || editQuestionForm.options.some(option => !option.content.trim())}
                          onClick={handleSaveQuestion}
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="ptm-question-card-title">{q.question}</h3>
                      <div className="ptm-inline-options">
                        {(q.options || []).map((option, optionIndex) => (
                          <div
                            key={option.id || optionIndex}
                            className={`ptm-inline-option${option.isCorrect ? ' correct' : ''}`}
                          >
                            <span className="ptm-option-radio" />
                            <strong>{String.fromCharCode(65 + optionIndex)}</strong>
                            <span>{option.content}</span>
                            {option.isCorrect && <em>Correct answer</em>}
                          </div>
                        ))}
                        {(q.options || []).length === 0 && (
                          <div className="ptm-inline-option correct">
                            <span className="ptm-option-radio" />
                            <strong>A</strong>
                            <span>{q.answer || 'No answer provided'}</span>
                            <em>Correct answer</em>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="ptm-pagination">
            <span className="ptm-pagination-info">
              Showing {questions.length === 0 ? 0 : questionStart + 1} to {Math.min(questionStart + ITEMS_PER_PAGE, questions.length)} of {questions.length} questions
            </span>
            <div className="ptm-pagination-controls">
              <button
                className="ptm-page-btn"
                disabled={safeQuestionPage === 1}
                onClick={() => setQuestionPage(current => Math.max(1, current - 1))}
              >Prev</button>
              {Array.from({ length: totalQuestionPages }, (_, index) => index + 1).map(p => (
                <button
                  key={p}
                  className={`ptm-page-num${p === safeQuestionPage ? ' active' : ''}`}
                  onClick={() => setQuestionPage(p)}
                >{p}</button>
              ))}
              <button
                className="ptm-page-btn"
                disabled={safeQuestionPage === totalQuestionPages}
                onClick={() => setQuestionPage(current => Math.min(totalQuestionPages, current + 1))}
              >Next</button>
            </div>
          </div>
        </div>

        {false && editQuestion && (
          <div className="lib-modal-overlay" onClick={() => setEditQuestion(null)}>
            <div className="lib-modal-card ptm-question-edit-modal" onClick={event => event.stopPropagation()}>
              <div className="ptm-question-edit-header">
                <div>
                  <h2 className="lib-modal-title">Edit Question</h2>
                  <p className="lib-modal-subtitle">Update the question, answer choices, and correct answer.</p>
                </div>
                <button type="button" className="rq-close-btn" onClick={() => setEditQuestion(null)}>x</button>
              </div>

              <div className="ptm-question-edit-body">
                <label className="lib-form-group">
                  <span className="lib-form-label">Question</span>
                  <textarea
                    className="lib-form-input rq-textarea"
                    rows={4}
                    value={editQuestionForm.question}
                    onChange={event => setEditQuestionForm(form => ({ ...form, question: event.target.value }))}
                  />
                </label>

                <div className="ptm-question-edit-meta">
                  <label className="lib-form-group">
                    <span className="lib-form-label">Type</span>
                    <select
                      className="lib-form-input"
                      value={editQuestionForm.type}
                      onChange={event => setEditQuestionForm(form => ({ ...form, type: event.target.value }))}
                    >
                      <option>Multiple Choice</option>
                      <option>True/False</option>
                    </select>
                  </label>
                  <label className="lib-form-group">
                    <span className="lib-form-label">Difficulty</span>
                    <select
                      className="lib-form-input"
                      value={editQuestionForm.difficulty}
                      onChange={event => setEditQuestionForm(form => ({ ...form, difficulty: event.target.value }))}
                    >
                      <option>Easy</option>
                      <option>Medium</option>
                      <option>Hard</option>
                    </select>
                  </label>
                </div>

                <div className="ptm-question-edit-options">
                  <div className="lib-form-label">Answer options</div>
                  {editQuestionForm.options.map((option, index) => (
                    <label key={option.id || index} className={`ptm-question-edit-option${editQuestionForm.correctIndex === index ? ' selected' : ''}`}>
                      <input
                        type="radio"
                        name="correct-answer"
                        checked={editQuestionForm.correctIndex === index}
                        onChange={() => setEditQuestionForm(form => ({ ...form, correctIndex: index }))}
                      />
                      <strong>{String.fromCharCode(65 + index)}</strong>
                      <input
                        type="text"
                        value={option.content}
                        onChange={event => setEditQuestionForm(form => ({
                          ...form,
                          options: form.options.map((item, optionIndex) =>
                            optionIndex === index ? { ...item, content: event.target.value } : item,
                          ),
                        }))}
                        placeholder={`Answer ${String.fromCharCode(65 + index)}`}
                      />
                    </label>
                  ))}
                  <p className="ptm-question-edit-hint">Select the radio button beside the correct answer.</p>
                </div>
              </div>

              <div className="lib-modal-footer">
                <button type="button" className="lib-modal-cancel-btn" onClick={() => setEditQuestion(null)}>Cancel</button>
                <button
                  type="button"
                  className="rq-modal-approve-btn"
                  disabled={isSaving || !editQuestionForm.question.trim() || editQuestionForm.options.some(option => !option.content.trim())}
                  onClick={handleSaveQuestion}
                >
                  {isSaving ? 'Saving...' : 'Save Question'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
    <div className="ptm-page">
      {/* Header */}
      <div className="ptm-header">
        <h1 className="ptm-title">Practice Test Management</h1>
        <p className="ptm-subtitle">Manage AI-generated quizzes, review question quality, and monitor student performance.</p>
      </div>

      {/* Stat Cards */}
      <div className="ptm-stats-row">
        <div className="ptm-stat-card">
          <div className="ptm-stat-label">TOTAL TESTS</div>
          <div className="ptm-stat-value">{practiceTests.length}</div>
        </div>
        <div className="ptm-stat-card">
          <div className="ptm-stat-label">AI GENERATED TESTS</div>
          <div className="ptm-stat-value ptm-stat-blue">{aiGeneratedCount}</div>
        </div>
        <div className="ptm-stat-card">
          <div className="ptm-stat-label">PENDING REVIEW</div>
          <div className="ptm-stat-value ptm-stat-orange">{pendingCount}</div>
        </div>
        <div className="ptm-stat-card">
          <div className="ptm-stat-label">PUBLISHED TESTS</div>
          <div className="ptm-stat-value">{publishedCount}</div>
        </div>
        <div className="ptm-stat-card">
          <div className="ptm-stat-label">AVERAGE SCORE</div>
          <div className="ptm-stat-value">{avgScore}%</div>
        </div>
      </div>

      {/* Body: Table + Sidebar */}
      <div className="ptm-body">

        {/* Left: Table Card */}
        <div className="ptm-table-card">
          {error && <p style={{ color: '#dc2626', padding: '0 24px' }}>{error}</p>}
          {/* Filters */}
          <div className="ptm-filters">
            {[
              { value: subjectFilter,  options: ['Subject', 'Software Engineering', 'Business Analysis', 'Database', 'Artificial Intelligence'], setter: setSubjectFilter },
              { value: statusFilter,   options: ['Status', 'Published', 'Pending Review', 'Flagged'],    setter: setStatusFilter },
              { value: diffFilter,     options: ['Difficulty', 'Easy', 'Medium', 'Hard'],               setter: setDiffFilter },
              { value: typeFilter,     options: ['Created Type', 'AI Generated', 'Manual'],              setter: setTypeFilter },
            ].map(({ value, options, setter }) => (
              <div key={value} className="ptm-select-wrap">
                <select
                  className="ptm-select"
                  value={value}
                  onChange={e => {
                    setter(e.target.value);
                    setPage(1);
                  }}
                >
                  {options.map(o => <option key={o}>{o}</option>)}
                </select>
                <ChevronIcon />
              </div>
            ))}
          </div>

          {/* Table */}
          <table className="ptm-table">
            <thead>
              <tr>
                <th>TEST NAME</th>
                <th>SUBJECT</th>
                <th>CREATED BY</th>
                <th>STATS</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#8c8a9e' }}>
                    Loading practice tests from database...
                  </td>
                </tr>
              ) : visibleTests.map(test => {
                const s = STATUS_CFG[test.status] || {};
                return (
                  <tr key={test.id} className="ptm-row">
                    <td>
                      <div className="ptm-test-name">{test.name}</div>
                      <div className="ptm-test-meta">{test.docs} documents • {test.questions} questions</div>
                    </td>
                    <td className="ptm-cell-muted">{test.subject}</td>
                    <td>
                      <div className="ptm-creator">
                        <div className="ptm-avatar" style={{ background: test.creator.color, color: test.creator.text }}>
                          {test.creator.initials}
                        </div>
                        <span className="ptm-creator-name">{test.creator.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="ptm-stats-cell">
                        <span>{test.attempts} attempts</span>
                        <span className={`ptm-avg ${test.avg < 65 ? 'ptm-avg-low' : 'ptm-avg-high'}`}>{test.avg}% Avg</span>
                      </div>
                    </td>
                    <td>
                      <span className={`ptm-status-badge ${s.cls}`}>{s.label}</span>
                    </td>
                    <td>
                      <div className="ptm-actions">
                        {/* View */}
                        <button className="ptm-action-btn" aria-label="View" onClick={() => openTestDetail(test)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M1 12C1 12 5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        </button>
                        {/* Delete */}
                        <button className="ptm-action-btn ptm-action-delete" aria-label="Delete" onClick={() => setDeleteTest(test)}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#8c8a9e' }}>
                    No practice tests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="ptm-pagination">
            <span className="ptm-pagination-info">
              Showing {filtered.length === 0 ? 0 : pageStart + 1} to {Math.min(pageStart + ITEMS_PER_PAGE, filtered.length)} of {filtered.length} entries
            </span>
            <div className="ptm-pagination-controls">
              <button
                className="ptm-page-btn"
                disabled={safePage === 1}
                onClick={() => setPage(current => Math.max(1, current - 1))}
              >Prev</button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(p => (
                <button key={p} className={`ptm-page-num${safePage === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button
                className="ptm-page-btn"
                disabled={safePage === totalPages}
                onClick={() => setPage(current => Math.min(totalPages, current + 1))}
              >Next</button>
            </div>
          </div>
        </div>

        {false && (
        <div className="ptm-sidebar">
          <div className="ptm-sidebar-header">
            <div className="ptm-sidebar-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#f97316" strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="ptm-sidebar-title">AI Review Queue</h2>
          </div>

          <div className="ptm-queue-list">
            <div className="ptm-queue-item ptm-queue-blue">
              <div className="ptm-queue-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M4 6h16M4 12h16M4 18h8" stroke="#4648D4" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="ptm-queue-count">{reviewQueue.length} questions</div>
                <div className="ptm-queue-desc">need manual review</div>
              </div>
            </div>

            <div className="ptm-queue-item ptm-queue-red">
              <div className="ptm-queue-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M12 9v4M12 17h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="ptm-queue-count">{reviewQueue.filter(q => q.type === 'low').length} questions</div>
                <div className="ptm-queue-desc">low AI confidence score</div>
              </div>
            </div>

            <div className="ptm-queue-item ptm-queue-purple">
              <div className="ptm-queue-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1Z" stroke="#7C3AED" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M4 22v-7" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="ptm-queue-count">{reviewQueue.filter(q => q.type === 'reported').length} questions</div>
                <div className="ptm-queue-desc">reported by students</div>
              </div>
            </div>
          </div>

          <button className="ptm-open-queue-btn" onClick={() => setShowReviewQueue(true)}>
            Open Review Queue →
          </button>
        </div>
        )}
      </div>
    </div>

    {/* ── DELETE CONFIRM MODAL ── */}
    {deleteTest && (
      <div className="lib-modal-overlay" onClick={() => setDeleteTest(null)}>
        <div className="lib-modal-card lib-modal-delete" onClick={e => e.stopPropagation()}>
          <div className="lib-modal-icon-wrap lib-modal-icon-danger">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="lib-modal-title">Delete Practice Test</h2>
          <p className="lib-modal-subtitle">
            Are you sure you want to delete <strong>"{deleteTest.name}"</strong>?<br/>
            This action cannot be undone.
          </p>
          <div className="lib-modal-divider" />
          <div className="lib-modal-footer">
            <button className="lib-modal-cancel-btn" type="button" onClick={() => setDeleteTest(null)}>Cancel</button>
            <button className="lib-modal-delete-btn" type="button" onClick={handleDeleteTest} disabled={isSaving}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {isSaving ? 'Deleting...' : 'Delete Test'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default PracticeTestManagementPage;
