import React, { useState, useEffect, useRef } from "react";

const CalendarIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
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

export const ALL_SEMESTERS = "All Semesters";

/**
 * Bộ lọc học kỳ ở Home. Dựng lại y hệt MajorSelector (biến thể "pill") thay cho
 * <select> gốc: native select không style được panel nên hai nút cạnh nhau trông
 * lệch hẳn nhau.
 *
 * Semester chọn theo TÊN chứ không theo id: nhiều ngành cùng có "Semester 1" và
 * bộ lọc phải gom hết chúng lại, giống hành vi của select cũ.
 */
export default function SemesterSelector({
  selectedSemester,
  onSelectSemester,
  semesters = [],
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Nhiều ngành dùng chung tên kỳ nên phải khử trùng lặp, không thì danh sách
  // hiện "Semester 1" bảy lần.
  const names = [];
  for (const s of semesters) {
    if (s?.semesterName && !names.includes(s.semesterName)) names.push(s.semesterName);
  }

  const isAll = !selectedSemester || selectedSemester === ALL_SEMESTERS;
  const label = isAll ? ALL_SEMESTERS : selectedSemester;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Be ngang CO DINH: nut khong duoc doi co theo nhan, neu khong nut ben canh
          se bi day chay ngang moi lan chon.
          210px lay theo MajorSelector cho hai nut can nhau. Nhan dai nhat o day chi
          la "All Semesters" nen thoai mai. */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between gap-2.5 w-[210px] px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-sm border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/20 hover:border-indigo-500/50 focus:outline-none"
        title={label}
      >
        {/* Icon + nhan phai dinh nhau ben trai; justify-between chi day chevron
            ve mep phai. Khong gom lai thi chu bi keo ra giua nut. */}
        <span className="inline-flex items-center gap-2.5 min-w-0">
          <CalendarIcon className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        <ChevronDownIcon
          className={
            "w-3.5 h-3.5 text-indigo-500 transition-transform duration-200 " +
            (isOpen ? "rotate-180" : "")
          }
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 w-full origin-top-right rounded-2xl bg-white border border-indigo-100 shadow-2xl py-2 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
            <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
              <SparklesIcon className="w-3 h-3 text-indigo-600" />
              Academic Semester
            </p>
          </div>

          <div className="max-h-60 overflow-y-auto custom-scrollbar px-1">
            <button
              type="button"
              onClick={() => {
                onSelectSemester(ALL_SEMESTERS);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors ${
                isAll ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span>All Semesters</span>
              {isAll && <CheckIcon className="w-3.5 h-3.5 text-indigo-600" />}
            </button>

            {names.map((name) => {
              const isSelected = selectedSemester === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onSelectSemester(name);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors mt-0.5 ${
                    isSelected ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="truncate pr-2">{name}</div>
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
