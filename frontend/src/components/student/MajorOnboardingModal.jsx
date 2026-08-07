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

// Mỗi mục trong danh sách chỉ có tên ngành + mô tả, không kèm icon: icon dùng
// chung một hình cho mọi ngành thì không giúp phân biệt, còn viết tắt theo tên
// thì lặp lại đúng thứ đã nằm ngay cạnh nó.

// Ngành dành cho sinh viên chưa được chọn chuyên ngành: trường bắt học xong kỳ
// chuẩn bị mới cho chọn. Trước đây màn này chỉ liệt kê chuyên ngành, nên sinh viên
// mới buộc phải khai bừa một ngành rồi lại không thấy chính môn mình đang học.
const PREPARATION_MAJOR = "Preparation";

const isPreparation = (major) => major?.majorName === PREPARATION_MAJOR;

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
          // Preparation lên đầu và được chọn sẵn: đây là đáp án đúng cho phần lớn
          // người gặp màn này, vì họ vừa tạo tài khoản và chưa có chuyên ngành.
          const ordered = [
            ...activeList.filter(isPreparation),
            ...activeList.filter((m) => !isPreparation(m)),
          ];
          setMajors(ordered);
          if (ordered.length > 0) {
            setSelectedId(ordered[0].majorId);
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

  // Không có đường "để sau": chọn ngành là bắt buộc trước khi vào app. Lối ra duy
  // nhất khi hệ thống chưa có ngành nào là đăng xuất, chứ không phải đi tiếp.
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("rememberMe");
    window.location.href = "/login";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-[#13131e] border border-indigo-500/30 shadow-2xl shadow-indigo-950/50 p-6 md:p-8">
        {/* Không có nút đóng: modal chặn cứng cho tới khi chọn xong ngành. */}

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
            Still in the preparation semester? Pick <span className="text-slate-200 font-medium">Preparation</span> — you can switch to your
            specialization from your profile once you finish it.
          </p>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              Loading academic majors...
            </div>
          ) : majors.length === 0 ? (
            <div className="py-6 text-center space-y-4">
              <p className="text-slate-400 text-sm">
                No academic majors have been set up yet. Please contact your
                administrator — you need a major before you can start studying.
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Mỗi mục cao hơn từ khi mô tả được xuống dòng đầy đủ, nới vùng cuộn
                  để vẫn thấy được vài lựa chọn cùng lúc thay vì mỗi lần một cái. */}
              <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
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
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{m.majorName}</span>
                          {/* Nhãn để người mới nhận ra ngay đâu là lựa chọn dành cho mình,
                              thay vì phải đọc hết danh sách chuyên ngành rồi đoán. */}
                          {isPreparation(m) && (
                            <span className="shrink-0 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-300">
                              Start here
                            </span>
                          )}
                        </div>
                        {/* Không cắt một dòng nữa: đây là màn bắt buộc chọn ngành mà
                            không có chỗ nào khác xem mô tả, cắt đi thì người dùng phải
                            quyết định trên thông tin dở dang. Danh sách vốn đã cuộn được. */}
                        {m.description && (
                          <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                            {m.description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircleIcon className="w-5 h-5 text-indigo-400 shrink-0 ml-2" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10 mt-6">
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
