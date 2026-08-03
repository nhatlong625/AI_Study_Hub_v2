import React, { useState, useEffect } from "react";
import { libraryApi } from "../../services/libraryApi";
import { userService } from "../../services/userService";

const GraduationCapIcon = ({ className = "w-7 h-7" }) => (
  <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const CheckCircleIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ArrowRightIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const SparklesIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </svg>
);

const BookOpenIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 1 3-3h7z" />
  </svg>
);

const XIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function MajorOnboardingModal({ isOpen, onClose, onMajorSelected }) {
  const [majors, setMajors] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const fetchMajors = async () => {
      try {
        setLoading(true);
        const data = await libraryApi.getMajors();
        if (isMounted && Array.isArray(data)) {
          const activeList = data.filter((m) => m.isActive !== false);
          setMajors(activeList);
          if (activeList.length > 0) {
            setSelectedId(activeList[0].majorId);
          }
        }
      } catch (err) {
        console.error("Failed to fetch majors for onboarding:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMajors();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId) return;

    try {
      setSubmitting(true);
      const res = await userService.updateMyMajor(selectedId);
      const selectedMajor = majors.find((m) => m.majorId === selectedId);
      if (onMajorSelected) {
        onMajorSelected(selectedId, selectedMajor?.majorName || res.majorName);
      }
      onClose();
    } catch (err) {
      console.error("Failed to set major:", err);
      alert(err.message || "Failed to save major selection.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (onMajorSelected) {
      onMajorSelected(null, null);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-[#13131e] border border-indigo-500/30 shadow-2xl shadow-indigo-950/50 p-6 md:p-8">
        {/* Top Right Close / Skip Button */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-5 right-5 z-20 p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          title="Skip / Close"
        >
          <XIcon className="w-5 h-5" />
        </button>

        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Header Icon */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 mb-5 shadow-lg shadow-indigo-500/10">
            <GraduationCapIcon className="w-7 h-7" />
          </div>

          <div className="flex items-center gap-2 mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            <SparklesIcon className="w-3.5 h-3.5" /> Welcome to AI Study Hub!
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Select Your Academic Major
          </h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Choose your current major so we can personalize your learning path, show relevant courses, and filter semesters automatically.
          </p>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              Loading academic majors...
            </div>
          ) : majors.length === 0 ? (
            <div className="py-6 text-center space-y-4">
              <p className="text-slate-400 text-sm">
                No majors available right now. You can skip this step and explore all courses.
              </p>
              <button
                type="button"
                onClick={handleSkip}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors"
              >
                Skip for now (Browse All Majors)
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                {majors.map((m) => {
                  const isSelected = selectedId === m.majorId;
                  return (
                    <div
                      key={m.majorId}
                      onClick={() => setSelectedId(m.majorId)}
                      className={`group cursor-pointer p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between ${
                        isSelected
                          ? "bg-indigo-600/20 border-indigo-500/80 shadow-md shadow-indigo-500/10 text-white"
                          : "bg-white/5 border-white/10 hover:border-indigo-500/40 text-slate-300 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${isSelected ? "bg-indigo-500/20 text-indigo-300" : "bg-white/5 text-slate-400"}`}>
                          <BookOpenIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{m.majorName}</div>
                          {m.description && (
                            <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{m.description}</div>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircleIcon className="w-5 h-5 text-indigo-400 shrink-0 ml-2" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex items-center justify-between gap-3 border-t border-white/10 mt-6">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors border border-white/10"
                >
                  Skip for now
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedId}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Confirm & Continue"}
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
