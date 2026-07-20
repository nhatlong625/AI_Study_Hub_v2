function SubmitQuizModal({
  answeredCount,
  totalCount,
  timeSpentSeconds,
  onSubmit,
  onClose,
  submitting,
}) {
  const minutes = Math.floor(timeSpentSeconds / 60);
  const secs = String(timeSpentSeconds % 60).padStart(2, "0");
  const unanswered = totalCount - answeredCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden"
        style={{ border: "1px solid #e5e7eb" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-xl font-black" style={{ color: "#111827" }}>
              Submit Quiz?
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "#6b7280" }}>
              {unanswered === 0
                ? "You have completed all questions."
                : `You still have ${unanswered} unanswered question${unanswered > 1 ? "s" : ""}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors ml-4 flex-shrink-0"
            style={{ color: "#9ca3af" }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "#f3f4f6" }} />

        {/* Stats */}
        <div className="px-6 py-5">
          <div
            className="flex rounded-xl overflow-hidden"
            style={{ border: "1px solid #e5e7eb" }}
          >
            <div
              className="flex-1 px-4 py-3 text-center"
              style={{ borderRight: "1px solid #e5e7eb" }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-1"
                style={{ color: "#9ca3af" }}
              >
                Answered
              </p>
              <p className="text-lg font-black" style={{ color: "#10b981" }}>
                {answeredCount}/{totalCount}
              </p>
            </div>
            <div
              className="flex-1 px-4 py-3 text-center"
              style={{ borderRight: "1px solid #e5e7eb" }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-1"
                style={{ color: "#9ca3af" }}
              >
                Unanswered
              </p>
              <p className="text-lg font-black" style={{ color: "#111827" }}>
                {unanswered}
              </p>
            </div>
            <div className="flex-1 px-4 py-3 text-center">
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-1"
                style={{ color: "#9ca3af" }}
              >
                Time Used
              </p>
              <p className="text-lg font-black" style={{ color: "#111827" }}>
                {minutes}m {secs}s
              </p>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 mt-4">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2"
              className="flex-shrink-0 mt-0.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-sm" style={{ color: "#6b7280" }}>
              You have answered all questions. Once submitted, your answers
              cannot be changed.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="w-full py-3.5 text-sm font-bold text-white rounded-xl transition-colors"
            style={{ background: submitting ? "#a5b4fc" : "#6366f1" }}
          >
            {submitting ? "Submitting..." : "Submit Quiz"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-sm font-semibold transition-colors"
            style={{ color: "#6b7280" }}
          >
            Back to Review
          </button>
        </div>
      </div>
    </div>
  );
}

export default SubmitQuizModal;
