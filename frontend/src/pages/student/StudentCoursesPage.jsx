import { useNavigate, useParams } from "react-router-dom";
import { useState, useMemo } from "react";
import CourseUploadModal from "../../components/common/CourseUploadModal";
import { useHistoryContext } from "../../hooks/useHistory";
import DocumentActionMenu from "../../components/common/DocumentActionMenu";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import EditDocumentModal from "../../components/common/EditDocumentModal";

const ITEMS_PER_PAGE = 9;

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
  const courseId = params.courseId || "MAE101";
  const semester = "Semester 1";
  const onBack = () => navigate("/student/home");
  const onGoHome = () => navigate("/student/home");
  const onFileClick = (file) => navigate(`/student/documents/${file.id}`);
  const [currentPage, setCurrentPage] = useState(1);
  const [showUpload, setShowUpload] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [editDoc, setEditDoc] = useState(null);
  const [localFiles, setLocalFiles] = useState(null);
  const historyCtx = useHistoryContext();

  const allFiles = useMemo(
    () => (localFiles !== null ? localFiles : generateCourseFiles(courseId)),
    [courseId, localFiles],
  );
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

  return (
    <div className="p-7 bg-gray-50 min-h-screen">
      {showUpload && (
        <CourseUploadModal
          courseId={courseId}
          onClose={() => setShowUpload(false)}
        />
      )}

      {editDoc && (
        <EditDocumentModal
          doc={editDoc}
          onClose={() => setEditDoc(null)}
          onSave={(updated) => {
            const source =
              localFiles !== null ? localFiles : generateCourseFiles(courseId);
            setLocalFiles(
              source.map((f) => (f.id === updated.id ? updated : f)),
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
          onConfirm={() => {
            const source =
              localFiles !== null ? localFiles : generateCourseFiles(courseId);
            setLocalFiles(source.filter((f) => f.id !== dialog.doc.id));
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
        <span>{semester}</span>
        <span>/</span>
        <span className="text-indigo-600 font-medium">{courseId}</span>
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
          {courseId}
        </h1>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <UploadIcon />
          Upload Document
        </button>
      </div>

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

        {/* Rows */}
        {pagedFiles.map((file, i) => (
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
                {file.uploader[0].toUpperCase()}
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
                onEdit={() => setEditDoc(file)}
                onDelete={() => setDialog({ doc: file })}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
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
    </div>
  );
}
