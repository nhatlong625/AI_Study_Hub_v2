import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { practiceTestApi } from "../../services/practiceTestApi";
import SubmitQuizModal from "../../components/student/SubmitQuizModal";

function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const value = user.userId ?? user.id ?? localStorage.getItem("aiStudyUserId");
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  } catch {
    return 1;
  }
}

function StudentQuizTakingPage() {
  const { quizId } = useParams();
  const currentUserId = getCurrentUserId();
  const navigate = useNavigate();
  const location = useLocation();
  const resumeData = location.state?.resumeData;

  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState(resumeData?.answers || {});
  const [flagged, setFlagged] = useState({});
  const [currentIndex, setCurrentIndex] = useState(
    resumeData?.lastQuestionIndex || 0,
  );
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const attemptIdRef = useRef(resumeData?.attemptId || null);

  useEffect(() => {
    practiceTestApi
      .get(quizId)
      .then((data) => {
        setTest(data);
        const totalSec = Number(data.timeLimit || 20) * 60;
        const spent = resumeData?.timeSpentSeconds || 0;
        setSecondsLeft(Math.max(0, totalSec - spent));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [quizId]);

  // Timer
  useEffect(() => {
    if (!test || secondsLeft <= 0 || submitting) return;
    const timer = window.setInterval(
      () => setSecondsLeft((v) => Math.max(0, v - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [secondsLeft, submitting, test]);

  const questions = test?.questions || [];
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const totalSeconds = test ? Number(test.timeLimit || 20) * 60 : 0;
  const timeSpent = useMemo(
    () => Math.max(0, totalSeconds - secondsLeft),
    [secondsLeft, totalSeconds],
  );
  const minutes = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, "0");
  const isUrgent = secondsLeft > 0 && secondsLeft < 120;

  const saveProgress = async (newIndex, newAnswers) => {
    try {
      const result = await practiceTestApi.saveProgress(quizId, {
        userId: currentUserId,
        lastQuestionIndex: newIndex,
        timeSpentSeconds: timeSpent,
        answers: newAnswers,
      });
      if (result?.attemptId) attemptIdRef.current = result.attemptId;
    } catch {
      /* silent */
    }
  };

  const goToQuestion = async (index) => {
    setCurrentIndex(index);
    await saveProgress(index, answers);
  };

  const chooseAnswer = async (questionId, optionId) => {
    const newAnswers = { ...answers, [questionId]: optionId };
    setAnswers(newAnswers);
    await saveProgress(currentIndex, newAnswers);
  };

  const toggleFlag = (questionId) =>
    setFlagged((prev) => ({ ...prev, [questionId]: !prev[questionId] }));

  const submitQuiz = async () => {
    try {
      setSubmitting(true);
      setError("");
      const result = await practiceTestApi.submit(quizId, {
        userId: currentUserId,
        timeSpentSeconds: timeSpent,
        answers,
      });
      navigate(`/student/quiz/${quizId}/result`, {
        state: { attemptId: result.attemptId },
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
      setShowModal(false);
    }
  };

  // â”€â”€ Loading / error â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loading)
    return (
      <div
        className="flex items-center justify-center h-64 text-sm"
        style={{ color: "#9ca3af" }}
      >
        Loading quiz...
      </div>
    );
  if (error && !test)
    return (
      <div className="p-7">
        <div
          className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
          }}
        >
          {error}
        </div>
        <button
          onClick={() => navigate("/student/practice-tests")}
          className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl"
        >
          Back to tests
        </button>
      </div>
    );
  if (!currentQuestion)
    return (
      <div
        className="flex items-center justify-center h-64 text-sm"
        style={{ color: "#9ca3af" }}
      >
        This quiz has no questions.
      </div>
    );

  return (
    <div style={{ background: "#f5f6fa", minHeight: "calc(100vh - 64px)" }}>
      {/* Submit modal */}
      {showModal && (
        <SubmitQuizModal
          answeredCount={answeredCount}
          totalCount={questions.length}
          timeSpentSeconds={timeSpent}
          submitting={submitting}
          onSubmit={submitQuiz}
          onClose={() => !submitting && setShowModal(false)}
        />
      )}

      {/* â”€â”€ Sub-topbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}
        className="px-7 py-3 flex items-center justify-between"
      >
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "#9ca3af" }}
          >
            Practice Test
          </p>
          <h1 className="text-sm font-bold" style={{ color: "#111827" }}>
            {test.title}
          </h1>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 flex-1 mx-8">
          <span
            className="text-sm font-bold flex-shrink-0"
            style={{ color: "#6366f1" }}
          >
            {currentIndex + 1}/{questions.length}
          </span>
          <div
            className="flex-1 h-1 rounded-full overflow-hidden"
            style={{ background: "#e5e7eb" }}
          >
            <div
              className="h-1 rounded-full transition-all duration-300"
              style={{
                background: "#6366f1",
                width: `${Math.round(((currentIndex + 1) / questions.length) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Timer + Finish */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isUrgent ? "#ef4444" : "#6b7280"}
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span
              className="text-sm font-semibold tabular-nums"
              style={{ color: isUrgent ? "#ef4444" : "#374151" }}
            >
              {minutes}:{secs}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-4 py-1.5 text-sm font-semibold rounded-full transition-colors"
            style={{
              background: "#ede9fe",
              color: "#6366f1",
              border: "1px solid #c4b5fd",
            }}
          >
            Finish
          </button>
        </div>
      </div>

      {error && (
        <div
          className="mx-7 mt-4 px-4 py-3 rounded-xl text-sm"
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
          }}
        >
          {error}
        </div>
      )}

      {/* â”€â”€ Main content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex gap-5 p-7" style={{ alignItems: "flex-start" }}>
        {/* Question card */}
        <div
          className="flex-1 bg-white rounded-2xl flex flex-col"
          style={{ border: "1px solid #e5e7eb", minHeight: "520px" }}
        >
          <div className="flex-1 p-8">
            <div className="mb-6">
              <span
                className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{ background: "#ede9fe", color: "#6366f1" }}
              >
                Question {currentIndex + 1}
              </span>
            </div>

            <h2
              className="text-xl font-black leading-snug mb-8"
              style={{ color: "#111827" }}
            >
              {currentQuestion.question}
            </h2>

            <div className="flex flex-col gap-3">
              {currentQuestion.options.map((option) => {
                const selected = answers[currentQuestion.id] === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => chooseAnswer(currentQuestion.id, option.id)}
                    className="flex items-center gap-3 px-5 py-4 rounded-xl text-sm text-left transition-all"
                    style={{
                      border: selected
                        ? "1.5px solid #6366f1"
                        : "1px solid #e5e7eb",
                      background: selected ? "#f5f3ff" : "#fff",
                      color: selected ? "#4f46e5" : "#374151",
                      fontWeight: selected ? 600 : 400,
                    }}
                  >
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full"
                      style={{
                        border: selected
                          ? "5px solid #6366f1"
                          : "1.5px solid #d1d5db",
                        background: "#fff",
                        flexShrink: 0,
                        minWidth: "20px",
                        minHeight: "20px",
                      }}
                    />
                    {selected && flagged[currentQuestion.id] && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="#6366f1"
                        className="flex-shrink-0"
                      >
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                        <line
                          x1="4"
                          y1="22"
                          x2="4"
                          y2="15"
                          stroke="#6366f1"
                          strokeWidth="2"
                        />
                      </svg>
                    )}
                    <span className="flex-1">{option.content}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nav buttons */}
          <div
            className="flex items-center justify-between px-8 py-5"
            style={{ borderTop: "1px solid #f3f4f6" }}
          >
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => goToQuestion(currentIndex - 1)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors"
              style={{
                border: "1px solid #e5e7eb",
                background: "#fff",
                color: currentIndex === 0 ? "#d1d5db" : "#374151",
                cursor: currentIndex === 0 ? "not-allowed" : "pointer",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            {currentIndex === questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl text-white"
                style={{ background: "#6366f1" }}
              >
                Submit Quiz
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goToQuestion(currentIndex + 1)}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl text-white"
                style={{ background: "#6366f1" }}
              >
                Next
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Question Map */}
        <div
          className="flex-shrink-0 bg-white rounded-2xl shadow-sm"
          style={{ width: "310px", border: "1px solid #e9e7f0" }}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-sm font-bold" style={{ color: "#111827" }}>
              Question Map
            </h2>
            <button
              type="button"
              onClick={() => toggleFlag(currentQuestion.id)}
              className="p-1 rounded-lg transition-colors hover:bg-gray-50"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={flagged[currentQuestion.id] ? "#ef4444" : "none"}
                stroke={flagged[currentQuestion.id] ? "#ef4444" : "#9ca3af"}
                strokeWidth="2"
              >
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 px-5 pb-4">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: "#d1d5db" }}
              />
              <span
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: "#9ca3af" }}
              >
                Unanswered
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: "#6ee7b7" }}
              />
              <span
                className="text-[9px] font-bold uppercase tracking-wider"
                style={{ color: "#9ca3af" }}
              >
                Answered
              </span>
            </div>
          </div>

          {/* Grid */}
          <div className="px-5 pb-5 grid grid-cols-5 gap-2">
            {questions.map((q, index) => {
              const isAnswered = !!answers[q.id];
              const isCurrent = index === currentIndex;
              const isFlaggedQ = flagged[q.id];
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => goToQuestion(index)}
                  className="relative aspect-square w-full rounded-lg text-xs font-semibold transition-all hover:-translate-y-0.5 hover:shadow-sm"
                  style={{
                    background: isAnswered ? "#ecfdf5" : "#ffffff",
                    color: isAnswered ? "#059669" : "#5f6070",
                    borderRadius: "10px",
                    border: isCurrent
                      ? "2px solid #7c3aed"
                      : isAnswered
                        ? "1px solid #a7f3d0"
                        : "1px solid #ddd8e8",
                    boxShadow: isCurrent
                      ? "0 0 0 3px rgba(124, 58, 237, 0.12)"
                      : "none",
                  }}
                >
                  {index + 1}
                  {isFlaggedQ && (
                    <span
                      className="absolute"
                      style={{ top: "-3px", right: "-3px" }}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="#ef4444"
                        stroke="none"
                      >
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentQuizTakingPage;
