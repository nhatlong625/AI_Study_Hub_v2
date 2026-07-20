import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { practiceTestApi } from "../../services/practiceTestApi";
import logoIcon from "../../assets/logos/logo-icon.png";

// ── Analyzing screen (loading) ─────────────────────────────────────────────
function AnalyzingScreen() {
  const [progress, setProgress] = useState(0);
  const steps = [
    "Checking answers...",
    "Calculating score...",
    "Preparing review...",
  ];
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const prog = setInterval(() => setProgress((p) => Math.min(p + 2, 95)), 60);
    const step = setInterval(
      () => setStepIdx((i) => Math.min(i + 1, steps.length - 1)),
      900,
    );
    return () => {
      clearInterval(prog);
      clearInterval(step);
    };
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ minHeight: "calc(100vh - 64px)" }}
    >
      {/* Icon circle */}
      <div className="mb-8 relative">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ border: "2px solid #6366f1", background: "#f5f3ff" }}
        >
          <img
            src={logoIcon}
            alt="FSTUDY"
            className="w-12 h-12 object-contain"
          />
        </div>
      </div>

      <h1 className="text-3xl font-black mb-2" style={{ color: "#111827" }}>
        Analyzing Your Results
      </h1>
      <p className="text-sm mb-8" style={{ color: "#6b7280" }}>
        {steps[stepIdx]}
      </p>

      {/* Progress bar */}
      <div
        className="w-64 h-1.5 rounded-full overflow-hidden mb-4"
        style={{ background: "#e5e7eb" }}
      >
        <div
          className="h-1.5 rounded-full transition-all duration-100"
          style={{ background: "#6366f1", width: `${progress}%` }}
        />
      </div>

      <p className="text-xs" style={{ color: "#9ca3af" }}>
        Please do not close this window.
      </p>
    </div>
  );
}

// ── Main Result Page ───────────────────────────────────────────────────────
function truthy(value) {
  return value === true || value === 1 || String(value).toLowerCase() === "true";
}

function normalizeAnswer(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getReviewOptions(question) {
  const options = Array.isArray(question.options) ? question.options : [];
  if (options.length > 0) return options;

  const fallback = [];
  if (question.selectedAnswer) {
    fallback.push({ id: "selected", content: question.selectedAnswer, isCorrect: false });
  }
  if (
    question.correctAnswer &&
    normalizeAnswer(question.correctAnswer) !== normalizeAnswer(question.selectedAnswer)
  ) {
    fallback.push({ id: "correct", content: question.correctAnswer, isCorrect: true });
  }
  return fallback;
}

function optionState(question, option) {
  const selectedOptionId = Number(question.selectedOptionId);
  const optionId = Number(option.id);
  const selectedById = Number.isFinite(selectedOptionId) && selectedOptionId === optionId;
  const selectedByText =
    !Number.isFinite(selectedOptionId) &&
    normalizeAnswer(question.selectedAnswer) === normalizeAnswer(option.content);
  const isSelected = selectedById || selectedByText;
  const isCorrect =
    truthy(option.isCorrect) ||
    normalizeAnswer(option.content) === normalizeAnswer(question.correctAnswer);

  if (isCorrect) return { kind: "correct", isSelected, isCorrect };
  if (isSelected) return { kind: "wrong", isSelected, isCorrect };
  return { kind: "neutral", isSelected, isCorrect };
}

function optionStyle(kind) {
  if (kind === "correct") {
    return {
      border: "1px solid #86efac",
      background: "#ecfdf5",
      color: "#065f46",
      labelColor: "#10b981",
    };
  }
  if (kind === "wrong") {
    return {
      border: "1px solid #fca5a5",
      background: "#fff5f5",
      color: "#991b1b",
      labelColor: "#ef4444",
    };
  }
  return {
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#374151",
    labelColor: "#9ca3af",
  };
}

function StudentQuizResultPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const attemptId = location.state?.attemptId;

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showIncorrectOnly, setShowIncorrectOnly] = useState(false);

  useEffect(() => {
    if (!attemptId) {
      setError("No attempt ID found. Please take the quiz first.");
      setLoading(false);
      return;
    }
    // Minimum 2s để user thấy analyzing screen
    const minDelay = new Promise((res) => setTimeout(res, 2000));
    const fetch = practiceTestApi.getResult(attemptId);
    Promise.all([fetch, minDelay])
      .then(([data]) => setResult(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [attemptId]);

  // ── Analyzing screen ──
  if (loading) return <AnalyzingScreen />;

  // ── Error ──
  if (error || !result)
    return (
      <div
        className="flex flex-col items-center justify-center gap-4"
        style={{ minHeight: "calc(100vh - 64px)" }}
      >
        <p className="text-sm" style={{ color: "#ef4444" }}>
          {error || "No result available."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/student/practice-tests")}
          className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl"
        >
          Back to tests
        </button>
      </div>
    );

  // ── Data ──
  const score = Math.round(Number(result.score || 0));
  const total = Number(result.total || 0);
  const correct = Number(result.correct || 0);
  const wrong = Number(result.wrong ?? total - correct);
  const timeSpentSeconds = Number(result.timeSpentSeconds || 0);
  const timeLabel =
    timeSpentSeconds > 0
      ? `${Math.floor(timeSpentSeconds / 60)}m ${String(timeSpentSeconds % 60).padStart(2, "0")}s`
      : "—";

  const questions = result.questions || [];
  const filtered = showIncorrectOnly
    ? questions.filter((q) => !q.isCorrect)
    : questions;

  // AI fields — null nếu BE chưa trả
  const aiAnalysis = result.aiAnalysis ?? null;
  const topicsToReview = result.topicsToReview ?? null; // [{topic, missed}]
  const sourceMaterial = result.sourceMaterial ?? null; // [{name, url}]

  const gradeColor =
    score >= 85 ? "#10b981" : score >= 70 ? "#f59e0b" : "#ef4444";
  const gradeBg = score >= 85 ? "#d1fae5" : score >= 70 ? "#fef3c7" : "#fee2e2";
  const gradeText =
    score >= 85 ? "#065f46" : score >= 70 ? "#92400e" : "#991b1b";

  return (
    <div
      className="p-7"
      style={{ background: "#f5f6fa", minHeight: "calc(100vh - 64px)" }}
    >
      {/* ── Breadcrumb + action buttons ── */}
      <div className="flex items-center justify-between mb-6">
        <div
          className="flex items-center gap-2 text-sm"
          style={{ color: "#6b7280" }}
        >
          <button
            onClick={() => navigate("/student/practice-tests")}
            className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Practice Tests
          </button>
          <span>/</span>
          <span style={{ color: "#111827", fontWeight: 500 }}>Quiz Review</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/student/quiz/${quizId}`)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-colors"
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#374151",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
            </svg>
            Retry Same Quiz
          </button>
          <button
            type="button"
            onClick={() => navigate("/student/practice-tests/generate")}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-colors"
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#374151",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            Generate New Quiz
          </button>
          <button
            type="button"
            onClick={() => navigate("/student/practice-tests/generate")}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl text-white"
            style={{ background: "#6366f1" }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Practice Test
          </button>
        </div>
      </div>

      {/* ── Top row: Score card + AI/Topics/Sources ── */}
      <div
        className="grid gap-5 mb-5"
        style={{ gridTemplateColumns: "1fr 1fr" }}
      >
        {/* Score card */}
        <div
          className="bg-white rounded-2xl p-7"
          style={{ border: "1px solid #e5e7eb" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: "#9ca3af" }}
          >
            Quiz Completed
          </p>
          <h2 className="text-base font-bold mb-5" style={{ color: "#111827" }}>
            {result.title}
          </h2>

          <div className="flex items-end gap-2 mb-6">
            <span className="text-6xl font-black" style={{ color: gradeColor }}>
              {score}
            </span>
            <span
              className="text-2xl font-bold mb-1.5"
              style={{ color: gradeColor }}
            >
              %
            </span>
            <span
              className="mb-2 px-3 py-1 rounded-full text-sm font-bold"
              style={{ background: gradeBg, color: gradeText }}
            >
              {result.grade}
            </span>
          </div>

          <div
            className="grid grid-cols-3 gap-4 text-center pt-4"
            style={{ borderTop: "1px solid #f3f4f6" }}
          >
            {[
              { label: "Correct", value: correct, color: "#10b981" },
              { label: "Incorrect", value: wrong, color: "#ef4444" },
              { label: "Time", value: timeLabel, color: "#374151" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: "#9ca3af" }}
                >
                  {label}
                </p>
                <p className="text-xl font-black" style={{ color }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* AI Performance Analysis */}
          <div
            className="bg-white rounded-2xl p-5"
            style={{ border: "1px solid #e5e7eb" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "#6366f1" }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="white"
                  stroke="none"
                >
                  <path d="M12 2C12 2 13 8 18 9C13 10 12 16 12 16C12 16 11 10 6 9C11 8 12 2 12 2Z" />
                </svg>
              </div>
              <span className="text-sm font-bold" style={{ color: "#111827" }}>
                AI Performance Analysis
              </span>
            </div>
            {aiAnalysis ? (
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#6b7280" }}
              >
                {aiAnalysis}
              </p>
            ) : (
              <p className="text-sm italic" style={{ color: "#9ca3af" }}>
                AI analysis will be available in a future update.
              </p>
            )}
          </div>

          {/* Topics to Review + Source Material */}
          <div className="grid grid-cols-2 gap-4">
            {/* Topics to Review */}
            <div
              className="bg-white rounded-2xl p-4"
              style={{ border: "1px solid #e5e7eb" }}
            >
              <div className="flex items-center gap-1.5 mb-3">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span
                  className="text-xs font-bold"
                  style={{ color: "#111827" }}
                >
                  Topics to Review
                </span>
              </div>
              {topicsToReview ? (
                <div className="flex flex-col gap-2">
                  {topicsToReview.map((t) => (
                    <div
                      key={t.topic}
                      className="flex items-center justify-between"
                    >
                      <span className="text-xs" style={{ color: "#374151" }}>
                        {t.topic}
                      </span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "#fee2e2", color: "#991b1b" }}
                      >
                        {t.missed} missed
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs italic" style={{ color: "#9ca3af" }}>
                  Coming soon
                </p>
              )}
            </div>

            {/* Source Material */}
            <div
              className="bg-white rounded-2xl p-4"
              style={{ border: "1px solid #e5e7eb" }}
            >
              <div className="flex items-center gap-1.5 mb-3">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2"
                >
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                </svg>
                <span
                  className="text-xs font-bold"
                  style={{ color: "#111827" }}
                >
                  Source Material
                </span>
              </div>
              {sourceMaterial ? (
                <div className="flex flex-col gap-2">
                  {sourceMaterial.map((s) => (
                    <a
                      key={s.name}
                      href={s.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs hover:underline"
                      style={{ color: "#6366f1" }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      {s.name}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2"
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span className="text-xs" style={{ color: "#6366f1" }}>
                    {result.source || "—"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Question Review ── */}
      <div
        className="bg-white rounded-2xl overflow-hidden"
        style={{ border: "1px solid #e5e7eb" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid #f3f4f6" }}
        >
          <h2 className="text-sm font-bold" style={{ color: "#111827" }}>
            Question Review
          </h2>
          <div
            className="flex rounded-xl overflow-hidden"
            style={{ border: "1px solid #e5e7eb" }}
          >
            {[
              { label: "Show All Questions", value: false },
              { label: "Show Incorrect Only", value: true },
            ].map(({ label, value }) => (
              <button
                key={label}
                type="button"
                onClick={() => setShowIncorrectOnly(value)}
                className="px-4 py-2 text-xs font-semibold transition-colors"
                style={{
                  background: showIncorrectOnly === value ? "#6366f1" : "#fff",
                  color: showIncorrectOnly === value ? "#fff" : "#6b7280",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <div
            className="px-6 py-10 text-center text-sm"
            style={{ color: "#9ca3af" }}
          >
            {showIncorrectOnly
              ? "No incorrect answers — well done! 🎉"
              : "No questions found."}
          </div>
        )}

        <div className="divide-y" style={{ borderColor: "#f3f4f6" }}>
          {filtered.map((q) => {
            const qNumber = questions.indexOf(q) + 1;
            const isCorrect = Boolean(q.isCorrect);

            return (
              <div key={q.id} className="p-6">
                {/* Question header */}
                <div className="flex items-start gap-3 mb-5">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{
                      background: isCorrect ? "#d1fae5" : "#fee2e2",
                      color: isCorrect ? "#065f46" : "#991b1b",
                    }}
                  >
                    {qNumber}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: isCorrect ? "#10b981" : "#ef4444" }}
                      >
                        {isCorrect ? "Correct" : "Incorrect"}
                      </span>
                    </div>
                    <p
                      className="text-sm font-semibold leading-relaxed"
                      style={{ color: "#111827" }}
                    >
                      {q.question}
                    </p>
                  </div>
                </div>

                <div className="ml-11">
                  <div className="grid grid-cols-2 gap-3">
                    {getReviewOptions(q).map((option, optionIndex) => {
                      const state = optionState(q, option);
                      const style = optionStyle(state.kind);
                      const label = String.fromCharCode(65 + optionIndex);

                      return (
                        <div
                          key={option.id ?? `${q.id}-${optionIndex}`}
                          className="p-4 rounded-xl"
                          style={{
                            border: style.border,
                            background: style.background,
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                              style={{
                                background:
                                  state.kind === "correct"
                                    ? "#bbf7d0"
                                    : state.kind === "wrong"
                                      ? "#fecaca"
                                      : "#f3f4f6",
                                color: style.color,
                              }}
                            >
                              {label}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {state.isCorrect && (
                                  <span
                                    className="text-[10px] font-black uppercase tracking-wider"
                                    style={{ color: "#10b981" }}
                                  >
                                    Correct Answer
                                  </span>
                                )}
                                {state.isSelected && !state.isCorrect && (
                                  <span
                                    className="text-[10px] font-black uppercase tracking-wider"
                                    style={{ color: "#ef4444" }}
                                  >
                                    Your Answer
                                  </span>
                                )}
                                {state.isSelected && state.isCorrect && (
                                  <span
                                    className="text-[10px] font-black uppercase tracking-wider"
                                    style={{ color: "#10b981" }}
                                  >
                                    Your Answer
                                  </span>
                                )}
                              </div>
                              <p className="text-sm font-medium leading-relaxed" style={{ color: style.color }}>
                                {option.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!q.selectedAnswer && (
                    <p className="mt-3 text-xs italic" style={{ color: "#9ca3af" }}>
                      Not answered
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default StudentQuizResultPage;
