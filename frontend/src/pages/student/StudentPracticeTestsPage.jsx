import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { practiceTestApi } from "../../services/practiceTestApi";

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

const BADGE_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-slate-100 text-slate-700",
];

const subjectColorCache = {};
let colorIdx = 0;

function getBadgeColor(course) {
  if (!course) return BADGE_COLORS[0];
  if (!subjectColorCache[course]) {
    subjectColorCache[course] = BADGE_COLORS[colorIdx % BADGE_COLORS.length];
    colorIdx += 1;
  }
  return subjectColorCache[course];
}

function IconButton({ label, disabled = false, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="h-11 w-11 rounded-xl border border-violet-200 text-violet-600 transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent"
    >
      <span className="flex h-full w-full items-center justify-center">
        {children}
      </span>
    </button>
  );
}

function StudentPracticeTestsPage() {
  const navigate = useNavigate();
  const currentUserId = getCurrentUserId();
  const [tests, setTests] = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      practiceTestApi.list(currentUserId),
      practiceTestApi.getInProgress(currentUserId),
    ])
      .then(([list, progress]) => {
        setTests(Array.isArray(list) ? list : []);
        setInProgress(Array.isArray(progress) ? progress : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [currentUserId]);

  const stats = useMemo(() => {
    const completed = tests.filter((test) => test.score != null);
    const totalQuestions = tests.reduce(
      (sum, test) =>
        sum + Number(test.questions ?? test.totalQuestions ?? 0),
      0,
    );
    const avgScore = completed.length
      ? completed.reduce((sum, test) => sum + Number(test.score || 0), 0) /
        completed.length
      : 0;

    return [
      { label: "Completed", value: `${completed.length} Quizzes` },
      {
        label: "Avg. Score",
        value: completed.length ? `${avgScore.toFixed(1)}%` : "--",
      },
      { label: "In Progress", value: `${inProgress.length} Active` },
      { label: "Generated", value: `${totalQuestions} Questions` },
    ];
  }, [inProgress.length, tests]);

  const continueLearning = (item) => {
    let savedAnswers = {};
    try {
      savedAnswers = item.answersSnapshot
        ? JSON.parse(item.answersSnapshot)
        : {};
    } catch {
      savedAnswers = {};
    }

    const answers = {};
    Object.entries(savedAnswers).forEach(([key, value]) => {
      answers[Number(key)] = value;
    });

    navigate(`/student/quiz/${item.testId}`, {
      state: {
        resumeData: {
          attemptId: item.attemptId,
          lastQuestionIndex: Number(item.lastQuestionIndex || 0),
          timeSpentSeconds: Number(item.timeSpentSeconds || 0),
          answers,
        },
      },
    });
  };

  const progressPercent = (item) => {
    const total = Number(item.totalQuestions || 0);
    if (!total) return 0;

    try {
      const answers = item.answersSnapshot
        ? Object.keys(JSON.parse(item.answersSnapshot)).length
        : 0;
      return Math.min(100, Math.round((answers / total) * 100));
    } catch {
      return 0;
    }
  };

  const timeLeftLabel = (item) => {
    const totalSec = Number(item.timeLimit || 20) * 60;
    const spentSec = Number(item.timeSpentSeconds || 0);
    const leftSec = Math.max(0, totalSec - spentSec);
    return `${Math.floor(leftSec / 60)}m left`;
  };

  const formatDate = (value) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const scoreTone = (score) => {
    if (score == null) return "text-slate-400";
    if (Number(score) >= 85) return "text-violet-600";
    if (Number(score) >= 70) return "text-blue-600";
    return "text-red-500";
  };

  const statusBadge = (test) => {
    if (test.score == null) {
      return {
        label: "READY",
        className: "bg-slate-100 text-slate-600",
      };
    }

    if (Number(test.score) >= 60) {
      return {
        label: "PASSED",
        className: "bg-emerald-100 text-emerald-700",
      };
    }

    return {
      label: "FAILED",
      className: "bg-rose-100 text-rose-600",
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-7">
      <div className="w-full">
        <header className="mb-6 flex min-h-[64px] flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="m-0 text-[30px] leading-9 font-black tracking-tight text-gray-900">
              Practice Tests
            </h1>
            <p className="mt-1 mb-0 text-sm leading-5 text-gray-500">
              Create AI-generated quizzes from your learning materials.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/student/practice-tests/generate")}
            className="inline-flex h-13 items-center justify-center gap-2 rounded-lg bg-violet-600 px-7 text-sm font-bold text-white shadow-[0_18px_45px_rgba(109,40,217,0.25)] transition-colors hover:bg-violet-700"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Start New Practice Test
          </button>
        </header>

        <section className="mb-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-slate-200 bg-white px-6 py-7 shadow-sm"
            >
              <p className="text-xs font-bold text-slate-500">{item.label}</p>
              <p className="mt-3 text-2xl font-black text-slate-950">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {inProgress.length > 0 && (
          <section className="mb-12">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-950">
                Continue Learning
              </h2>
              <span className="text-sm font-semibold text-slate-400">
                {inProgress.length} active
              </span>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {inProgress.map((item) => {
                const pct = progressPercent(item);
                return (
                  <article
                    key={item.attemptId}
                    className="rounded-xl border border-violet-100 bg-white p-5 shadow-sm"
                  >
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-violet-500">
                          {item.course || "--"}
                        </p>
                        <h3 className="mt-2 text-base font-black text-slate-950">
                          {item.title}
                        </h3>
                      </div>
                      <span className="whitespace-nowrap rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-600">
                        {timeLeftLabel(item)}
                      </span>
                    </div>

                    <div className="mb-4">
                      <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500">
                        <span>Progress</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-violet-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => continueLearning(item)}
                      className="h-10 rounded-lg border border-violet-200 px-4 text-sm font-bold text-violet-600 transition-colors hover:bg-violet-50"
                    >
                      Continue
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-6 text-xl font-black text-slate-950">
            Recent Quizzes
          </h2>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[1.35fr_0.75fr_0.5fr_0.65fr_0.55fr_0.5fr] bg-violet-50/70 px-6 py-5 text-xs font-black uppercase tracking-wider text-slate-900 md:grid">
              <span>Quiz Name</span>
              <span>Subject</span>
              <span>Score</span>
              <span>Date</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            {loading ? (
              <div className="px-6 py-16 text-center text-sm text-slate-400">
                Loading practice tests...
              </div>
            ) : tests.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-slate-400">
                No practice tests yet. Generate your first one!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {tests.map((test) => {
                  const status = statusBadge(test);
                  const score = test.score == null ? null : Number(test.score);
                  const hasResult = test.attemptId && test.score != null;

                  return (
                    <article
                      key={test.id}
                      className="grid gap-4 px-6 py-5 md:grid-cols-[1.35fr_0.75fr_0.5fr_0.65fr_0.55fr_0.5fr] md:items-center"
                    >
                      <div>
                        <p className="text-base font-black text-slate-950">
                          {test.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {test.questions ?? test.totalQuestions ?? 0} questions
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${getBadgeColor(
                          test.course,
                        )}`}
                      >
                        {test.course || "--"}
                      </span>

                      <div>
                        <p className={`text-base font-black ${scoreTone(score)}`}>
                          {score == null ? "--" : `${Math.round(score)}%`}
                        </p>
                        {score != null && (
                          <div className="mt-2 h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full ${
                                score >= 85
                                  ? "bg-violet-600"
                                  : score >= 70
                                    ? "bg-blue-600"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${Math.min(100, score)}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <span className="text-sm font-semibold text-slate-700">
                        {formatDate(test.createdAt)}
                      </span>

                      <span
                        className={`w-fit rounded-full px-4 py-1.5 text-[11px] font-black ${status.className}`}
                      >
                        {status.label}
                      </span>

                      <div className="flex items-center gap-3">
                        <IconButton
                          label={
                            hasResult
                              ? "View result"
                              : "Result is available after submission"
                          }
                          disabled={!hasResult}
                          onClick={() =>
                            navigate(`/student/quiz/${test.id}/result`, {
                              state: { attemptId: test.attemptId },
                            })
                          }
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </IconButton>

                        <IconButton
                          label={test.score == null ? "Start quiz" : "Retake quiz"}
                          onClick={() => navigate(`/student/quiz/${test.id}`)}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M3 12a9 9 0 1 0 3-6.7" />
                            <path d="M3 4v6h6" />
                          </svg>
                        </IconButton>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default StudentPracticeTestsPage;
