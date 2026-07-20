import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import logoIcon from "../../assets/logos/logo-icon.png";
import { documentApi, semesterApi } from "../../services/libraryApi";
import { practiceTestApi } from "../../services/practiceTestApi";
import UpgradePricingModal from "../../components/student/UpgradePricingModal";

function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const value =
      user.userId ?? user.id ?? localStorage.getItem("aiStudyUserId");
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  } catch {
    return 1;
  }
}

function parseQuizLimitError(message) {
  // Format: "QUIZ_LIMIT_REACHED:used:max"
  if (!message || !message.startsWith("QUIZ_LIMIT_REACHED:")) return null;
  const parts = message.split(":");
  return { used: Number(parts[1]), max: Number(parts[2]) };
}

// ── Icons ──────────────────────────────────────────────────────────────────────
const ChevronIcon = ({ open }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    className={`transition-transform duration-150 flex-shrink-0 ${open ? "rotate-90" : ""}`}
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);
const FolderIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#f97316"
    strokeWidth="1.8"
    className="flex-shrink-0"
  >
    <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
);
const FileIcon = ({ active }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke={active ? "#6366f1" : "#9ca3af"}
    strokeWidth="1.8"
    className="flex-shrink-0"
  >
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);
const BoltIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

// ── Checkbox ──────────────────────────────────────────────────────────────────
function Checkbox({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={!disabled ? onChange : undefined}
      className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-colors
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
        ${checked ? "bg-indigo-600 border-indigo-600" : "bg-white border-gray-300 hover:border-indigo-400"}`}
    >
      {checked && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <polyline
            points="1 3.5 3.5 6 8 1"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? "bg-indigo-600" : "bg-gray-200"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

// ── PillSelector ──────────────────────────────────────────────────────────────
function PillSelector({ options, value, onChange }) {
  return (
    <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
      {options.map((opt) => {
        const v = opt.value ?? opt;
        const active = String(v) === String(value);
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-r border-gray-200 last:border-r-0
              ${active ? "bg-indigo-50 text-indigo-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
          >
            {opt.label ?? opt}
          </button>
        );
      })}
    </div>
  );
}

// ── SubjectGroup ──────────────────────────────────────────────────────────────
function SubjectGroup({ subjectName, docs, selectedId, onSelect }) {
  const [open, setOpen] = useState(true);
  const isChecked = docs.some(
    (d) => String(d.documentId) === String(selectedId),
  );
  return (
    <div>
      <div
        className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-gray-400">
          <ChevronIcon open={open} />
        </span>
        <Checkbox checked={isChecked} disabled />
        <FolderIcon />
        <span className="text-sm font-semibold text-gray-800">
          {subjectName}
        </span>
      </div>
      {open && (
        <div className="ml-10">
          {docs.map((doc) => {
            const sel = String(doc.documentId) === String(selectedId);
            return (
              <div
                key={doc.documentId}
                onClick={() => onSelect(doc)}
                className={`flex items-center gap-2 px-4 py-2 cursor-pointer rounded-r select-none transition-colors
                  ${sel ? "bg-indigo-50" : "hover:bg-gray-50"}`}
              >
                <Checkbox checked={sel} onChange={() => onSelect(doc)} />
                <FileIcon active={sel} />
                <span
                  className={`text-sm truncate ${sel ? "text-indigo-700 font-medium" : "text-gray-700"}`}
                >
                  {doc.title || doc.documentName}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Loading Screen ────────────────────────────────────────────────────────────
const STEPS = [
  "Reading Learning Materials",
  "Extracting Key Concepts",
  "Generating Questions",
  "Generating Answer Choices",
  "Finalizing Quiz",
];

function LoadingScreen({
  selectedDoc,
  subjectName,
  questionCount,
  difficulty,
  questionType,
  timeLimit,
}) {
  const [stepIdx, setStepIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const stepTimer = setInterval(
      () => setStepIdx((i) => Math.min(i + 1, STEPS.length - 1)),
      1800,
    );
    const progTimer = setInterval(
      () => setProgress((p) => Math.min(p + 1.2, 92)),
      80,
    );
    return () => {
      clearInterval(stepTimer);
      clearInterval(progTimer);
    };
  }, []);
  const timeLimitLabel = timeLimit === 0 ? "No Limit" : `${timeLimit}m`;
  return (
    <div
      className="flex items-center justify-center p-7"
      style={{ height: "calc(100vh - 64px)", background: "#f5f6fa" }}
    >
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-3xl p-10">
        <div className="flex flex-col items-center mb-10">
          <img
            src={logoIcon}
            alt="FSTUDY"
            className="w-16 h-16 object-contain"
          />
          <p className="mt-2 text-xs font-black tracking-[3px] text-indigo-600 uppercase">
            FSTUDY
          </p>
          <p className="mt-5 text-lg font-semibold text-gray-700 text-center leading-snug">
            AI is analyzing your learning materials and preparing
            <br />a personalized quiz.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-5 mb-8">
          <div className="border border-gray-200 rounded-2xl p-6">
            <p className="text-base font-bold text-gray-900 mb-4">Process</p>
            <div className="h-px bg-gray-100 mb-5" />
            <div className="flex flex-col gap-3.5">
              {STEPS.map((step, i) => {
                const done = i < stepIdx;
                const active = i === stepIdx;
                return (
                  <div key={step} className="flex items-center gap-3">
                    {done ? (
                      <span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                        <svg
                          width="10"
                          height="8"
                          viewBox="0 0 10 8"
                          fill="none"
                        >
                          <polyline
                            points="1 4 3.5 6.5 9 1"
                            stroke="white"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    ) : active ? (
                      <span className="w-5 h-5 rounded-full border-2 border-indigo-600 flex items-center justify-center flex-shrink-0">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full border-2 border-gray-200 flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm ${active ? "text-indigo-600 font-bold" : done ? "text-gray-700 font-medium" : "text-gray-400"}`}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-5">
            <div className="border border-gray-200 rounded-2xl p-5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Sources
              </p>
              <div className="flex items-center gap-2">
                <FileIcon active />
                <span className="text-sm text-gray-700 truncate">
                  {selectedDoc?.documentName || selectedDoc?.title || "—"}
                </span>
              </div>
            </div>
            <div className="border border-gray-200 rounded-2xl p-5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Configuration
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Questions", value: questionCount },
                  { label: "Difficulty", value: difficulty },
                  { label: "Type", value: questionType },
                  { label: "Est. Time", value: timeLimitLabel },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-500">{label}</span>
                    <span className="font-bold text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: "#e5e7eb" }}
        >
          <div
            className="h-1.5 bg-indigo-600 rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Quiz Limit Banner ─────────────────────────────────────────────────────────
function QuizLimitBanner({ used, max, onUpgrade }) {
  const percent = Math.min((used / max) * 100, 100);
  return (
    <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-bold text-amber-800">
            Quiz Generation Limit Reached
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            You've used {used}/{max} quiz generations this month.
          </p>
        </div>
        <button
          type="button"
          onClick={onUpgrade}
          className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors"
        >
          Upgrade
        </button>
      </div>
      <div className="h-1.5 rounded-full bg-amber-200 overflow-hidden">
        <div
          className="h-1.5 rounded-full bg-amber-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ── Error Screen ──────────────────────────────────────────────────────────────
function ErrorScreen({
  selectedDoc,
  errorMessage,
  onRetry,
  onBack,
  onUpgrade,
}) {
  const limitInfo = parseQuizLimitError(errorMessage);
  if (limitInfo) {
    return (
      <div
        className="flex items-center justify-center p-7"
        style={{ height: "calc(100vh - 64px)", background: "#f5f6fa" }}
      >
        <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-lg px-10 py-12 text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-3">
            Quiz Limit Reached
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-2">
            You've used{" "}
            <span className="font-bold text-gray-700">
              {limitInfo.used}/{limitInfo.max}
            </span>{" "}
            quiz generations this month.
          </p>
          <p className="text-sm text-gray-500 leading-relaxed mb-8">
            Upgrade your plan to get more quiz generations per month.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Basic</span>
              <span className="font-bold">10/month</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-indigo-600 font-semibold">Plus</span>
              <span className="font-bold text-indigo-600">30/month</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-purple-600 font-semibold">Pro</span>
              <span className="font-bold text-purple-600">Unlimited</span>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={onUpgrade}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Upgrade Plan
            </button>
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-xl transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center p-7"
      style={{ height: "calc(100vh - 64px)", background: "#f5f6fa" }}
    >
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl px-10 py-12">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.5"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </span>
          </div>
        </div>
        <h2 className="text-2xl font-black text-gray-900 text-center mb-3">
          Unable to Generate Quiz
        </h2>
        <p className="text-sm text-gray-500 text-center leading-relaxed mb-8 max-w-md mx-auto">
          {errorMessage ||
            "The selected learning materials do not contain enough information to create meaningful quiz questions."}
        </p>
        <div className="flex items-center gap-3 justify-center">
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            Select Other Materials
          </button>
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-xl transition-colors"
          >
            Back to Practice Test
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const QUIZ_DOCUMENT_TYPES = new Set([
  "txt",
  "md",
  "csv",
  "pdf",
  "docx",
  "pptx",
]);

function canGenerateQuizFromDocument(doc) {
  return QUIZ_DOCUMENT_TYPES.has(String(doc.documentType || "").toLowerCase());
}

function StudentGeneratePracticeTestPage() {
  const navigate = useNavigate();
  const currentUserId = getCurrentUserId();

  const [screen, setScreen] = useState("form");
  const [documents, setDocuments] = useState([]);
  const [subjectMap, setSubjectMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [questionCount, setQuestionCount] = useState(20);
  const [difficulty, setDifficulty] = useState("Medium");
  const [questionType, setQuestionType] = useState("Multiple Choice");
  const [timeLimit, setTimeLimit] = useState(30);
  const [shuffle, setShuffle] = useState(true);
  const [instantFeedback, setInstantFeedback] = useState(false);
  const [formError, setFormError] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    Promise.all([documentApi.getByUser(currentUserId), semesterApi.getAll()])
      .then(([docs, semesters]) => {
        const map = {};
        for (const sem of semesters)
          for (const sub of sem.subjects ?? [])
            map[sub.subjectId] = sub.subjectName;
        setSubjectMap(map);
        const quizDocs = docs
          .filter(
            (doc) =>
              Number(doc.userId ?? currentUserId) === Number(currentUserId),
          )
          .filter(canGenerateQuizFromDocument);
        setDocuments(quizDocs);
        if (quizDocs[0]) setSelectedDocId(quizDocs[0].documentId);
      })
      .catch((err) => setFormError(err.message))
      .finally(() => setLoading(false));
  }, [currentUserId]);

  const tree = useMemo(() => {
    const groups = {};
    for (const doc of documents) {
      const sid = doc.subjectId ?? "unknown";
      if (!groups[sid])
        groups[sid] = {
          subjectName: subjectMap[sid] ?? `Subject ${sid}`,
          docs: [],
        };
      groups[sid].docs.push(doc);
    }
    return Object.entries(groups).sort(([, a], [, b]) =>
      a.subjectName.localeCompare(b.subjectName),
    );
  }, [documents, subjectMap]);

  const selectedDoc = documents.find(
    (d) => String(d.documentId) === String(selectedDocId),
  );
  const selectedSubjectName = selectedDoc
    ? (subjectMap[selectedDoc.subjectId] ?? "")
    : "";
  const timeLimitMinutes = timeLimit === 0 ? 120 : timeLimit;

  const handleGenerate = async () => {
    if (!selectedDocId) {
      setFormError("Please select a document.");
      return;
    }
    setFormError("");
    setGenerationError("");
    setScreen("loading");
    try {
      const test = await practiceTestApi.generate({
        userId: currentUserId,
        documentId: Number(selectedDocId),
        title: selectedDoc
          ? `${selectedDoc.title || selectedDoc.documentName} Practice Test`
          : "Practice Test",
        totalQuestions: Math.min(Number(questionCount), 30),
        timeLimit: timeLimitMinutes,
        difficulty,
        questionType,
      });
      navigate(`/student/quiz/${test.id}`);
    } catch (err) {
      setGenerationError(
        err.message || "Could not generate quiz from this document.",
      );
      setScreen("error");
    }
  };

  if (screen === "loading") {
    return (
      <LoadingScreen
        selectedDoc={selectedDoc}
        subjectName={selectedSubjectName}
        questionCount={questionCount}
        difficulty={difficulty}
        questionType={questionType}
        timeLimit={timeLimit}
      />
    );
  }

  if (screen === "error") {
    return (
      <>
        <ErrorScreen
          selectedDoc={selectedDoc}
          errorMessage={generationError}
          onRetry={() => setScreen("form")}
          onBack={() => navigate("/student/practice-tests")}
          onUpgrade={() => {
            setScreen("form");
            setShowUpgradeModal(true);
          }}
        />
        <UpgradePricingModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      </>
    );
  }

  const limitInfo = parseQuizLimitError(generationError);

  return (
    <>
      <div
        className="flex gap-5 p-5"
        style={{
          height: "calc(100vh - 64px)",
          background: "#f5f6fa",
          boxSizing: "border-box",
        }}
      >
        {/* LEFT: File tree */}
        <div
          className="flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden"
          style={{ flex: "0 0 50%" }}
        >
          <div className="flex-1 overflow-y-auto py-3">
            {loading ? (
              <div className="px-6 py-10 text-sm text-gray-400 text-center">
                Loading documents...
              </div>
            ) : tree.length === 0 ? (
              <div className="px-6 py-10 text-sm text-gray-400 text-center">
                No supported text documents found. Upload a PDF, DOCX, PPTX,
                TXT, MD, or CSV file first.
              </div>
            ) : (
              tree.map(([sid, { subjectName, docs }]) => (
                <SubjectGroup
                  key={sid}
                  subjectName={subjectName}
                  docs={docs}
                  selectedId={selectedDocId}
                  onSelect={(doc) => setSelectedDocId(doc.documentId)}
                />
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Config */}
        <div
          className="flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden"
          style={{ flex: "0 0 50%" }}
        >
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-gray-200 mb-7">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-indigo-600">
                  {selectedDoc ? "1 File Selected" : "No file selected"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedDoc
                    ? `Selected from ${selectedSubjectName || "your library"}`
                    : "Select a document from the tree on the left"}
                </p>
              </div>
            </div>

            {/* Quiz limit banner — hiện khi vừa bị chặn lần trước */}
            {limitInfo && (
              <QuizLimitBanner
                used={limitInfo.used}
                max={limitInfo.max}
                onUpgrade={() => setShowUpgradeModal(true)}
              />
            )}

            {formError && (
              <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {formError}
              </div>
            )}

            <div className="mb-6">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Question Count
              </p>
              <PillSelector
                options={[
                  { label: "10", value: 10 },
                  { label: "20", value: 20 },
                  { label: "30", value: 30 },
                ]}
                value={questionCount}
                onChange={setQuestionCount}
              />
            </div>
            <div className="mb-6">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Difficulty
              </p>
              <PillSelector
                options={["Easy", "Medium", "Hard", "Mixed"]}
                value={difficulty}
                onChange={setDifficulty}
              />
            </div>
            <div className="mb-6">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Question Type
              </p>
              <PillSelector
                options={["Multiple Choice", "True/False", "Mixed"]}
                value={questionType}
                onChange={setQuestionType}
              />
            </div>
            <div className="mb-7">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Time Limit
              </p>
              <PillSelector
                options={[
                  { label: "No Limit", value: 0 },
                  { label: "15m", value: 15 },
                  { label: "30m", value: 30 },
                  { label: "45m", value: 45 },
                ]}
                value={timeLimit}
                onChange={setTimeLimit}
              />
            </div>
            <div className="border-t border-gray-100 pt-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Shuffle Questions</span>
                <Toggle
                  checked={shuffle}
                  onChange={() => setShuffle((v) => !v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Instant Feedback</span>
                <Toggle
                  checked={instantFeedback}
                  onChange={() => setInstantFeedback((v) => !v)}
                />
              </div>
            </div>
          </div>

          <div className="px-8 py-5 border-t border-gray-100">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!selectedDocId || loading || !!limitInfo}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-base font-bold rounded-2xl transition-colors flex items-center justify-center gap-2.5"
            >
              <BoltIcon />
              Generate Practice Quiz
            </button>
          </div>
        </div>
      </div>

      <UpgradePricingModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  );
}

export default StudentGeneratePracticeTestPage;
