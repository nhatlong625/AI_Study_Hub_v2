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

/**
 * @param variant      "pill"  — nút viền tím, dùng cho bộ lọc ở Home.
 *                     "ghost" — chữ thường, hover mới hiện nền; dùng ở Profile để
 *                               trông cùng nhịp với dòng "Joined ..." bên trên và
 *                               không nổi hơn tên người dùng.
 * @param allowAll     Cho phép chọn "All Majors". Ở Profile phải tắt: ngành là bắt
 *                     buộc nên "không ngành nào" không phải một lựa chọn hợp lệ.
 * @param currentLabel Tên hiện tạm trong lúc danh sách ngành chưa tải xong, để dòng
 *                     này không biến mất rồi hiện lại làm nhảy layout.
 */
export default function MajorSelector({
  selectedMajorId,
  onSelectMajor,
  className = "",
  variant = "pill",
  allowAll = true,
  currentLabel = "",
}) {
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
  const isGhost = variant === "ghost";
  const label =
    activeMajor?.majorName || currentLabel || (allowAll ? "All Majors" : "Not set");

  if (loading || majors.length === 0) {
    // Ghost giữ chỗ bằng chữ tĩnh để không nhảy layout; pill thì ẩn hẳn như trước.
    if (!isGhost) return null;
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm text-gray-400 ${className}`}>
        <GraduationCapIcon className="w-3.5 h-3.5 shrink-0" />
        {label}
      </span>
    );
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={
          isGhost
            // -mx/-my triệt tiêu padding của nút để hộp của nó cao đúng bằng một
            // dòng chữ, nhờ vậy nhịp dòng khớp với email/Joined ở trên.
            ? "group inline-flex items-center gap-1.5 -mx-1.5 -my-0.5 px-1.5 py-0.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none transition-colors cursor-pointer"
            // Be ngang CO DINH. Nut loc la diem neo tren giao dien: no phai dung
            // yen du dang chon gi. De no no theo ten nganh thi nut ben canh bi day
            // chay ngang moi lan chon, con tro dang o dung cho bong sai cho.
            // 210px: uu tien nut gon, chap nhan cat ten. Nut hoc ky ben canh dung
            // chung con so nay de hai nut can nhau, ma nhan cua no ("All Semesters"
            // la dai nhat) thi 210px la vua dep.
            // Ten nganh dai hon ~18 ky tu se bi cat va dua vao tooltip. De vua han
            // ten dai nhat ("Logistics & Supply Chain Management", 35 ky tu) can
            // toi ~330px - qua rong cho mot nut loc, nen khong theo huong do.
            : "inline-flex items-center justify-between gap-2.5 w-[210px] px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-sm border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/20 hover:border-indigo-500/50 focus:outline-none"
        }
        title={isGhost ? "Change major" : label}
      >
        {/* Icon + nhan phai dinh nhau ben trai; justify-between (pill) chi day
            chevron ve mep phai. Khong gom lai thi chu bi keo ra giua nut. */}
        <span className={`inline-flex items-center min-w-0 ${isGhost ? "gap-1.5" : "gap-2.5"}`}>
          <GraduationCapIcon
            className={isGhost ? "w-3.5 h-3.5 shrink-0" : "w-4 h-4 text-indigo-600 shrink-0"}
          />
          <span className="truncate">{label}</span>
        </span>
        <ChevronDownIcon
          className={
            (isGhost
              ? "w-3 h-3 text-gray-400 group-hover:text-gray-600 "
              : "w-3.5 h-3.5 text-indigo-500 ") +
            "transition-transform duration-200 " +
            (isOpen ? "rotate-180" : "")
          }
        />
      </button>

      {isOpen && (
        <div
          className={
            // Pill: panel rong bang dung nut va cach 6px cho lien mach. Ghost:
            // nut chi la mot dong chu nen panel phai tu dat be ngang.
            (isGhost ? "mt-2 w-64 " : "mt-1.5 w-full ") +
            "absolute right-0 z-50 origin-top-right rounded-2xl bg-white border border-indigo-100 shadow-2xl py-2 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
          }
        >
          <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
            <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
              <SparklesIcon className="w-3 h-3 text-indigo-600" />
              Academic Major
            </p>
          </div>

          <div className="max-h-60 overflow-y-auto custom-scrollbar px-1">
            {/* All Majors option — chỉ có nghĩa khi đang dùng làm bộ lọc */}
            {allowAll && (
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
                <span>All Majors</span>
                {!selectedMajorId && <CheckIcon className="w-3.5 h-3.5 text-indigo-600" />}
              </button>
            )}

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
