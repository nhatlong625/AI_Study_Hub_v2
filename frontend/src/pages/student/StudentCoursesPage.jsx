import { useNavigate, useParams } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import CourseUploadModal from "../../components/common/CourseUploadModal";
import { useHistoryContext } from "../../hooks/useHistory";
import DocumentActionMenu from "../../components/common/DocumentActionMenu";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import EditDocumentModal from "../../components/common/EditDocumentModal";
import { documentApi, semesterApi } from "../../services/libraryApi";

const ITEMS_PER_PAGE = 9;

// ── Inline helpers (không phụ thuộc mock) ────────────────────
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

function formatViews(views) {
  const n = Number(views) || 0;
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

// Map a backend document object to the row shape used by this page.
function toFileRow(doc) {
  const uploader =
    doc?.ownerName || doc?.uploaderName || doc?.uploader || "User";
  return {
    id: doc.documentId,
    name: doc.documentName || doc.title || `document-${doc.documentId}`,
    uploader,
    uploaderInitial:
      typeof uploader === "string" && uploader.length > 0
        ? uploader[0].toUpperCase()
        : "U",
    date: doc?.uploadedAt
      ? new Date(doc.uploadedAt).toLocaleDateString()
      : "-",
    discussion: 0,
    views: 0,
  };
}

const UploadIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

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

export default function StudentCoursesPage() {
  const navigate = useNavigate();
  const params = useParams();
  // courseId may be a numeric subjectId or a subject code/name coming from the
  // URL. We resolve it to a real subject in the load effect below.
  const courseId = params.courseId || "";
  const onBack = () => navigate("/student/home");
  const onGoHome = () => navigate("/student/home");
  const onFileClick = (file) =>
    navigate(`/student/documents/${file.id}`);
  const [currentPage, setCurrentPage] = useState(1);
  const [showUpload, setShowUpload] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [editDoc, setEditDoc] = useState(null);
  const historyCtx = useHistoryContext();

  // Real course data.
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [semesterName, setSemesterName] = useState("");

  // Resolve the course + load its real documents from the backend.
  // Removed the mock `generateCourseFiles` — the page is wired to the real API.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setDocs([]);
    setSemesterName("");

    const load = async () => {
      try {
        const data = await semesterApi.getAll();
        if (cancelled) return;
        const semesters = Array.isArray(data) ? data : [];

        let subjectId = null;
        for (const sem of semesters) {
          if (cancelled) return;
          const found = (sem.subjects ?? []).find(
            (s) =>
              String(s.subjectId) === String(courseId) ||
              s.subjectName === courseId ||
              s.subjectCode === courseId,
          );
          if (found) {
            subjectId = found.subjectId;
            setSemesterName(sem.semesterName || "");
            break;
          }
        }

        if (subjectId === null) {
          // Unknown course → no documents.
          setDocs([]);
          setLoading(false);
          return;
        }

        const courseDocs = await documentApi.getBySubject(subjectId);
        if (cancelled) return;
        setDocs(Array.isArray(courseDocs) ? courseDocs : []);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Could not load documents for this course.");
          setDocs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const allFiles = useMemo(() => docs.map(toFileRow), [docs]);
  const totalPages = Math.ceil(allFiles.length / ITEMS_PER_PAGE);
  const pagedFiles = allFiles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Luôn hiển thị: 1 ... [prev] [current] [next] ... [last]
  const getPageNumbers = () => {
    const pages = [];
    const showAround = 1; // số trang hiển thị xung quanh trang hiện tại

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - showAround && i <= currentPage + showAround)
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

  const courseTitle = courseId || "Course";

  return (
    <div className="p-7 bg-gray-50 min-h-screen">
      {showUpload && (
        <CourseUploadModal
          courseId={courseTitle}
          onClose={() => setShowUpload(false)}
        />
      )}

      {editDoc && (
        <EditDocumentModal
          doc={editDoc}
          onClose={() => setEditDoc(null)}
          onSave={async (updated) => {
            await documentApi.updateTitle(updated.id, updated.name);
            setDocs((prev) =>
              prev.map((d) =>
                d.documentId === updated.id
                  ? { ...d, documentName: updated.name }
                  : d,
              ),
            );
            setEditDoc(null);
          }}
        />
      )}

      {dialog && (
        <ConfirmDialog
          type="delete"
          fileName={dialog.doc.name}
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            await documentApi.delete(dialog.doc.id);
            setDocs((prev) =>
              prev.filter((d) => d.documentId !== dialog.doc.id),
            );
            setDialog(null);
          }}
        />
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
        <button
          onClick={onGoHome}
          className="hover:text-indigo-600 transition-colors"
        >
          Home
        </button>
        <span>/</span>
        <span>{semesterName || (loading ? "Loading..." : "All Courses")}</span>
        <span>/</span>
        <span className="text-indigo-600 font-medium">{courseTitle}</span>
      </div>

      {/* Back link */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mb-5 transition-colors"
      >
        <BackIcon />
        Back to All Courses
      </button>

      {/* Page title + Upload */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          {courseTitle}
        </h1>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <UploadIcon />
          Upload Document
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_120px_80px_60px] px-5 py-3 border-b border-indigo-100 bg-indigo-50">
          <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
            Files
          </span>
          <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase text-center">
            Discussion
          </span>
          <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase text-center">
            View
          </span>
          <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase text-center">
            Actions
          </span>
        </div>

        {/* Empty / loading states */}
        {loading ? (
          <div className="p-10 text-center text-gray-400">
            Loading documents...
          </div>
        ) : pagedFiles.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            No documents yet. Upload your first document!
          </div>
        ) : (
          /* Rows */
          pagedFiles.map((file, i) => (
            <div
              key={file.id}
              onClick={() => {
                historyCtx?.addToHistory({
                  type: "file",
                  label: file.name,
                  file,
                });
                onFileClick?.(file);
              }}
              className={`grid grid-cols-[1fr_120px_80px_60px] px-5 py-4 items-center hover:bg-gray-50 transition-colors cursor-pointer ${i < pagedFiles.length - 1 ? "border-b border-gray-100" : ""}`}
            >
              {/* File info */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full ${getAvatarColor(file.uploader)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
                >
                  {file.uploaderInitial}
                </div>
                <div>
                  <div className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 font-mono">
                    {file.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {file.uploader} · {file.date}
                  </div>
                </div>
              </div>

              {/* Discussion */}
              <div className="text-center">
                <span
                  className={`text-sm font-semibold ${file.discussion > 0 ? "text-indigo-600" : "text-gray-400"}`}
                >
                  {file.discussion}
                </span>
              </div>

              {/* Views */}
              <div className="text-center">
                <span className="text-sm font-semibold text-gray-700">
                  {formatViews(file.views)}
                </span>
              </div>

              {/* Actions */}
              <div
                className="flex justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <DocumentActionMenu
                  onEdit={() => {
                    const real = docs.find((d) => d.documentId === file.id);
                    setEditDoc(real || { id: file.id, name: file.name });
                  }}
                  onDelete={() => setDialog({ doc: file })}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && allFiles.length > 0 && (
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
                key={`dot-${i}`}
                className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm"
              >
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => goToPage(p)}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-all
                    ${
                      currentPage === p
                        ? "bg-indigo-600 text-white border border-indigo-600"
                        : "border border-gray-200 bg-white text-gray-600 hover:border-purple-400 hover:text-indigo-600"
                    }`}
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
