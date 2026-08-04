import React, { useState, useEffect, useRef } from "react";
import { libraryApi } from "../../services/libraryApi";

const GraduationCapIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const ChevronDownIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const CheckIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const SparklesIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </svg>
);

export default function MajorSelector({ selectedMajorId, onSelectMajor, className = "" }) {
  const [majors, setMajors] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchMajors = async () => {
      try {
        const data = await libraryApi.getMajors();
        if (isMounted && Array.isArray(data)) {
          setMajors(data.filter((m) => m.isActive !== false));
        }
      } catch (err) {
        console.warn("Could not load majors list:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMajors();
    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeMajor = majors.find((m) => m.majorId === Number(selectedMajorId));

  if (loading || majors.length === 0) {
    return null; // Don't show selector if no majors configured or loading
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-sm border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/20 hover:border-indigo-500/50 focus:outline-none"
        title="Select Major"
      >
        <GraduationCapIcon className="w-4 h-4 text-indigo-600 shrink-0" />
        <span className="truncate max-w-[160px]">
          {activeMajor ? activeMajor.majorName : "All Majors"}
        </span>
        <ChevronDownIcon className={`w-3.5 h-3.5 text-indigo-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-2xl bg-white border border-indigo-100 shadow-2xl py-2 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
            <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
              <SparklesIcon className="w-3 h-3 text-indigo-600" />
              Academic Major
            </p>
          </div>

          <div className="max-h-60 overflow-y-auto custom-scrollbar px-1">
            {/* All Majors option */}
            <button
              type="button"
              onClick={() => {
                onSelectMajor(null);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                !selectedMajorId
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span>All Majors (Browse Everything)</span>
              {!selectedMajorId && <CheckIcon className="w-3.5 h-3.5 text-indigo-600" />}
            </button>

            {/* List of majors */}
            {majors.map((m) => {
              const isSelected = Number(selectedMajorId) === m.majorId;
              return (
                <button
                  key={m.majorId}
                  type="button"
                  onClick={() => {
                    onSelectMajor(m.majorId);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors mt-0.5 ${
                    isSelected
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="truncate pr-2">
                    <div>{m.majorName}</div>
                    {m.majorCode && (
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{m.majorCode}</div>
                    )}
                  </div>
                  {isSelected && <CheckIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
