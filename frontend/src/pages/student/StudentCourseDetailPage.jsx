import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useHistoryContext } from "../../hooks/useHistory";
import { documentApi, semesterApi } from "../../services/libraryApi";

// ── Inline helper (không phụ thuộc mock) ────────────────────
const AVATAR_COLORS = [
  "bg-indigo-500",
  "bg-blue-500",
  "bg-indigo-400",
  "bg-orange-400",
  "bg-green-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-red-400",
];
function getAvatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const ITEMS_PER_PAGE = 9;

const BackIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

export default function StudentCourseDetailPage() {
  const navigate = useNavigate();
  const params = useParams();
  const courseId = params.courseId || "MAE101";
  const historyCtx = useHistoryContext();
  const [currentPage, setCurrentPage] = useState(1);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  // Tên semester chứa subject này — lấy từ API thật trong useEffect dưới,
  // không còn tham chiếu biến mock "semesters" (đã xóa, gây lỗi runtime).
  const [semester, setSemester] = useState("Loading...");

  useEffect(() => {
    // Tìm subjectId từ tên môn, sau đó lấy documents PUBLIC
    semesterApi.getAll().then((data) => {
      for (const sem of data) {
        const found = sem.subjects.find((s) => s.subjectName === courseId);
        if (found) {
          setSemester(sem.semesterName);
          documentApi
            .getPublicBySubject(found.subjectId)
            .then((publicDocs) => {
              setDocs(Array.isArray(publicDocs) ? publicDocs : []);
            })
            .catch(() => {
              setDocs([]);
            })
            .finally(() => {
              setLoading(false);
            });
          return;
        }
      }
      // Môn chưa có trong DB → không có document
      setSemester("Unknown Semester");
      setDocs([]);
      setLoading(false);
    });
  }, [courseId]);

  useEffect(() => {
    if (courseId && historyCtx?.addToHistory) {
      historyCtx.addToHistory({
        type: "course",
        label: courseId,
        courseId,
        semester: semester !== "Loading..." ? semester : "Semester 1",
      });
    }
  }, [courseId, semester, historyCtx]);

  const totalPages = Math.max(1, Math.ceil(docs.length / ITEMS_PER_PAGE));
  const pagedDocs = docs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  };

  const goToPage = (p) => {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="p-7 bg-gray-50 min-h-screen">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
        <button
          onClick={() => navigate("/student/home")}
          className="hover:text-indigo-600 transition-colors"
        >
          Home
        </button>
        <span>/</span>
        <span>{semester}</span>
        <span>/</span>
        <span className="text-indigo-600 font-medium">{courseId}</span>
      </div>

      <button
        onClick={() => navigate("/student/home")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mb-5 transition-colors"
      >
        <BackIcon />
        Back to All Courses
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          {courseId}
        </h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="grid grid-cols-[1fr_80px] px-5 py-3 border-b border-indigo-100 bg-indigo-50">
          <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
            Files
          </span>
          <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase text-center">
            Size
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading...</div>
        ) : pagedDocs.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            No public documents available for this course.
          </div>
        ) : (
          pagedDocs.map((doc, i) => (
            <div
              key={doc.documentId}
              onClick={() => {
                historyCtx?.addToHistory({
                  type: "file",
                  label: doc.title,
                  file: doc,
                });
                navigate(`/student/documents/${doc.documentId}`, {
                  state: { doc },
                });
              }}
              className={
                "grid grid-cols-[1fr_80px] px-5 py-4 items-center hover:bg-gray-50 transition-colors cursor-pointer " +
                (i < pagedDocs.length - 1 ? "border-b border-gray-100" : "")
              }
            >
              <div className="flex items-center gap-3">
                <div
                  className={
                    "w-9 h-9 rounded-full " +
                    getAvatarColor(doc.documentName) +
                    " flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  }
                >
                  {doc.documentType?.includes("pdf")
                    ? "P"
                    : doc.documentType?.includes("ppt")
                      ? "S"
                      : "D"}
                </div>
                <div>
                  <div className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                    {doc.title}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {doc.documentName}
                  </div>
                </div>
              </div>
              <div className="text-center text-sm text-gray-600 font-medium">
                {doc.documentSize
                  ? (doc.documentSize / 1024 / 1024).toFixed(1) + " MB"
                  : "—"}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => goToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-purple-400 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          {getPageNumbers().map((p, i) =>
            p === "..." ? (
              <span
                key={"dot-" + i}
                className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm"
              >
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => goToPage(p)}
                className={
                  "w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-all " +
                  (currentPage === p
                    ? "bg-indigo-600 text-white border border-indigo-600"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-purple-400 hover:text-indigo-600")
                }
              >
                {p}
              </button>
            ),
          )}
          <button
            onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-purple-400 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
