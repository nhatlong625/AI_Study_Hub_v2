import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import DocumentActionMenu from "../../components/common/DocumentActionMenu";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import EditDocumentModal from "../../components/common/EditDocumentModal";
import { documentApi, semesterApi } from "../../services/libraryApi";
import ShareDocumentModal from "../../components/common/ShareDocumentModal";
import { useHistoryContext } from "../../hooks/useHistory";

const AVATAR_COLORS = [
  "bg-indigo-400",
  "bg-purple-400",
  "bg-blue-400",
  "bg-orange-400",
  "bg-green-400",
  "bg-pink-400",
  "bg-teal-400",
  "bg-gray-500",
];

function getAvatarColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

const ITEMS_PER_PAGE = 9;
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api").replace(/\/$/, "");

function documentFileUrl(documentId, action) {
  if (!documentId) return "";
  return `${API_BASE}/documents/${documentId}/${action}`;
}

async function fetchDocumentBlob(documentId, action) {
  const token = localStorage.getItem("token");
  const response = await fetch(documentFileUrl(documentId, action), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Could not ${action} this document.`);
  }

  return response.blob();
}

function canEmbedPreview(type) {
  return ["pdf", "png", "jpg", "jpeg", "gif", "txt", "md", "csv", "mp4"].includes(
    String(type || "").toLowerCase(),
  );
}

function getDocumentType(doc) {
  return String(doc?.documentType || "").replace(/^\./, "").toUpperCase() || "FILE";
}

function getDocumentSizeLabel(doc) {
  return doc?.documentSize
    ? (doc.documentSize / 1024 / 1024).toFixed(1) + " MB"
    : "-";
}

function isMockSeedDocument(doc) {
  return String(doc?.documentName || "").toLowerCase().startsWith("mock-");
}

function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return Number(user.userId || user.id || 1);
  } catch {
    return 1;
  }
}

// Visibility constants.
const VIS = {
  PRIVATE: "PRIVATE",
  PENDING: "PENDING_REVIEW",
  PUBLIC: "PUBLIC",
};

// Cooldown check mirrors DocumentService.updateVisibility().
// Normalized note.
// Cooldown check mirrors DocumentService.updateVisibility().
// Normalized note.
const COOLDOWN_MS = 60 * 60 * 1000;

function getCooldownRemainingMs(doc) {
  if (doc.visibilityStatus !== VIS.PRIVATE || !doc.updatedAt) return 0;
  const cooldownEnd = new Date(doc.updatedAt).getTime() + COOLDOWN_MS;
  return Math.max(0, cooldownEnd - Date.now());
}

function formatRemaining(ms) {
  const totalMin = Math.ceil(ms / 60000);
  if (totalMin < 60) return `${totalMin} minute${totalMin === 1 ? "" : "s"}`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const hPart = `${h} hour${h === 1 ? "" : "s"}`;
  return m === 0 ? hPart : `${hPart} ${m} minute${m === 1 ? "" : "s"}`;
}

// Cooldown check mirrors DocumentService.updateVisibility().
function VisibilityNoticeModal({ title, message, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[420px] mx-4 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center px-7 pt-8 pb-6 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#d97706"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
        </div>
        <div className="px-7 pb-7">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// Toggle component with three visibility states.
// PRIVATE: toggle off.
// PRIVATE: toggle off.
// PUBLIC: toggle on.
function VisibilityToggle({ status, onChange, disabled }) {
  const isOn = status === VIS.PUBLIC;
  const isPending = status === VIS.PENDING;

  return (
    <button
      onClick={onChange}
      disabled={disabled}
      title={
        isPending
          ? "Click to cancel request"
          : isOn
            ? "Click to set Private"
            : "Click to request Public"
      }
      className={
        "relative inline-flex w-10 h-5 rounded-full transition-colors cursor-pointer " +
        (isPending ? "bg-amber-400" : isOn ? "bg-indigo-600" : "bg-gray-300") +
        (disabled ? " opacity-50 cursor-not-allowed" : "")
      }
    >
      <span
        className={
          "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform " +
          (isOn ? "translate-x-5" : "translate-x-0")
        }
      />
    </button>
  );
}

// Visibility label.
function VisibilityLabel({ status }) {
  if (status === VIS.PUBLIC)
    return (
      <div>
        <p className="text-sm font-semibold text-indigo-600">Public</p>
        <p className="text-xs text-gray-400">Visible in course</p>
      </div>
    );
  if (status === VIS.PENDING)
    return (
      <div>
        <p className="text-sm font-semibold text-amber-500">Pending</p>
        <p className="text-xs text-gray-400">Awaiting approval</p>
      </div>
    );
  return (
    <div>
      <p className="text-sm font-semibold text-gray-500">Private</p>
      <p className="text-xs text-gray-400">Only you</p>
    </div>
  );
}

// Main page.
export default function StudentLibraryCourseDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const routeSubjectName = params.courseId ? decodeURIComponent(params.courseId) : "";
  const stateSubject = location.state || {};
  const subjectName = stateSubject.subjectName || routeSubjectName;
  const stateSubjectId = Number(stateSubject.subjectId);

  const [subjectId, setSubjectId] = useState(null);
  const [semesterName, setSemesterName] = useState(stateSubject.semesterName || "My Library");
  const historyCtx = useHistoryContext();

  useEffect(() => {
    if (subjectName && historyCtx?.addToHistory) {
      historyCtx.addToHistory({
        type: "course",
        label: subjectName,
        courseId: subjectName,
        semester: semesterName !== "My Library" ? semesterName : "Library",
      });
    }
  }, [subjectName, semesterName, historyCtx]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(null);
  const [editDoc, setEditDoc] = useState(null);
  const [shareDoc, setShareDoc] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const userId = getCurrentUserId();
  // Normalized note.
  const [togglingIds, setTogglingIds] = useState(new Set());
  // Cooldown check mirrors DocumentService.updateVisibility().
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    semesterApi.getAll().then((data) => {
      for (const sem of data) {
        const found = sem.subjects?.find((s) => (
          Number.isFinite(stateSubjectId)
            ? Number(s.subjectId) === stateSubjectId
            : s.subjectName === subjectName
        ));
        if (found) {
          setSubjectId(found.subjectId);
          setSemesterName(sem.semesterName);
          documentApi
            .getBySubject(found.subjectId)
            .then((docs) => {
              const currentCourseDocs = (Array.isArray(docs) ? docs : []).filter(
                (doc) => !isMockSeedDocument(doc),
              );
              setDocs(currentCourseDocs);
            })
            .catch(() => {
              setDocs([]);
              setError("Could not load documents for this course.");
            })
            .finally(() => {
              setLoading(false);
            });
          return;
        }
      }
      setDocs([]);
      setLoading(false);
    }).catch(() => {
      setDocs([]);
      setLoading(false);
      setError("Could not load this course.");
    });
  }, [stateSubjectId, subjectName, userId]);

  useEffect(() => {
    if (!previewDoc?.documentId || !canEmbedPreview(previewDoc.documentType)) {
      setPreviewUrl("");
      setPreviewError("");
      return undefined;
    }

    let objectUrl = "";
    let cancelled = false;
    setPreviewUrl("");
    setPreviewError("");

    fetchDocumentBlob(previewDoc.documentId, "preview")
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      })
      .catch((err) => {
        if (!cancelled) setPreviewError(err.message || "Could not preview this document.");
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewDoc?.documentId, previewDoc?.documentType]);

  const totalPages = Math.max(1, Math.ceil(docs.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = docs.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  );

  const pageNums = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= safePage - 1 && i <= safePage + 1)
      )
        arr.push(i);
      else if (arr[arr.length - 1] !== "...") arr.push("...");
    }
    return arr;
  }, [totalPages, safePage]);

  // Normalized note.
  async function handleToggleVisibility(doc) {
    if (togglingIds.has(doc.documentId)) return;

    let newStatus;
    if (doc.visibilityStatus === VIS.PUBLIC) {
      // PRIVATE: toggle off.
      newStatus = VIS.PRIVATE;
    } else if (doc.visibilityStatus === VIS.PRIVATE) {
      // PRIVATE: toggle off.
      newStatus = VIS.PENDING;
    } else if (doc.visibilityStatus === VIS.PENDING) {
      // PRIVATE: toggle off.
      newStatus = VIS.PRIVATE;
    } else {
      return;
    }

    // Cooldown check mirrors DocumentService.updateVisibility().
    // Normalized note.
    // Normalized note.
    if (newStatus === VIS.PENDING) {
      const remaining = getCooldownRemainingMs(doc);
      if (remaining > 0) {
        setNotice({
          title: "Try again later",
          message: `You need to wait ${formatRemaining(remaining)} more before requesting to publish again.`,
        });
        return;
      }
    }

    setTogglingIds((prev) => new Set([...prev, doc.documentId]));

    try {
      const updated = await documentApi.updateVisibility(
        doc.documentId,
        newStatus,
      );

      setDocs((prev) =>
        prev.map((d) =>
          d.documentId === doc.documentId
            ? {
                ...d,
                visibilityStatus: newStatus,
                updatedAt: updated?.updatedAt ?? d.updatedAt,
              }
            : d,
        ),
      );
    } catch (err) {
      // Normalized note.
      // Normalized note.
      // Cooldown check mirrors DocumentService.updateVisibility().
      // Normalized note.
      // Cooldown check mirrors DocumentService.updateVisibility().
      if (err?.status === 429) {
        setNotice({ title: "Try again later", message: err.message });
      } else if (err?.status === 409) {
        setNotice({ title: "Pending review", message: err.message });
      } else {
        setNotice({
          title: "Error",
          message: "Update failed. Please try again.",
        });
      }
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(doc.documentId);
        return next;
      });
    }
  }

  async function handleDelete(doc) {
    try {
      setIsSaving(true);
      setError("");
      await documentApi.delete(doc.documentId);
      setDocs((prev) => prev.filter((d) => d.documentId !== doc.documentId));
      setPreviewDoc((current) => current?.documentId === doc.documentId ? null : current);
      setDialog(null);
    } catch (err) {
      setError(err.message || "Could not delete this document.");
    } finally {
      setIsSaving(false);
    }
  }

  // Normalized note.
  // Normalized note.
  // Normalized note.
  // Normalized note.
  async function handleUpdate(doc, title) {
    const updated = await documentApi.updateTitle(doc.documentId, title);
    setDocs((prev) =>
      prev.map((d) =>
        d.documentId === doc.documentId
          ? { ...d, title: updated?.title ?? title }
          : d,
      ),
    );
  }

  return (
    <div className="p-7 bg-gray-50 min-h-screen">
      {notice && (
        <VisibilityNoticeModal
          title={notice.title}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}

      {showUpload && (
        <LibraryUploadModal
          subjectId={subjectId}
          onClose={() => setShowUpload(false)}
          onUploaded={(newDoc) => {
            setDocs((prev) => [newDoc, ...prev]);
            setShowUpload(false);
          }}
        />
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-2">
        <button
          onClick={() => navigate("/student/library")}
          className="hover:text-indigo-600 transition-colors"
        >
          Library
        </button>
        <span>/</span>
        <span>{semesterName}</span>
        <span>/</span>
        <span className="text-indigo-600 font-medium">{subjectName}</span>
      </div>

      <button
        onClick={() => navigate("/student/library")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mb-5 transition-colors"
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
        Back to All Courses
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          {subjectName}
        </h1>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload Document
        </button>
      </div>

      {/* Document table */}
      <div className="bg-white border border-gray-200 rounded-2xl">
        <div className="grid grid-cols-[1fr_220px_80px_60px] px-6 py-3.5 bg-indigo-50 border-b border-indigo-100">
          {["FILES", "VISIBILITY", "SIZE", ""].map((h, i) => (
            <span
              key={i}
              className="text-[11px] font-bold tracking-wider text-gray-400 uppercase"
            >
              {h}
            </span>
          ))}
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400">Loading...</div>
        ) : docs.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            No documents yet. Upload your first document!
          </div>
        ) : (
          paged.map((doc, i) => (
            <div
              key={doc.documentId}
              className={
                "grid grid-cols-[1fr_220px_80px_60px] px-6 py-4 items-center hover:bg-gray-50 transition-colors " +
                (i < paged.length - 1 ? "border-b border-gray-100" : "")
              }
            >
              {/* File info */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full ${getAvatarColor(doc.documentName)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
                >
                  {doc.documentType?.includes("pdf")
                    ? "P"
                    : doc.documentType?.includes("ppt")
                      ? "S"
                      : "D"}
                </div>
                <div>
                  <p
                    className="text-sm font-semibold text-indigo-600 truncate max-w-[280px] cursor-pointer hover:text-indigo-700"
                     onClick={() =>
                      navigate("/student/documents/" + doc.documentId, {
                        state: {
                          doc,
                          aiSummaryResult: doc.aiSummaryResult,
                          aiSummaryError: doc.aiSummaryError,
                        },
                      })
                    }
                  >
                    {doc.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {doc.documentName}
                  </p>
                </div>
              </div>

              {/* Visibility toggle */}
              <div className="flex items-center gap-2.5">
                <VisibilityToggle
                  status={doc.visibilityStatus}
                  onChange={() => handleToggleVisibility(doc)}
                  disabled={togglingIds.has(doc.documentId)}
                />
                <VisibilityLabel status={doc.visibilityStatus} />
              </div>

              {/* Size */}
              <div className="text-sm text-gray-600 font-medium">
                {doc.documentSize
                  ? (doc.documentSize / 1024 / 1024).toFixed(1) + " MB"
                  : "-"}
              </div>

              {/* Actions */}
              <div>
                <DocumentActionMenu
                  onPreview={() => setPreviewDoc(doc)}
                  onEdit={() => setEditDoc(doc)}
                  onShare={() => setShareDoc(doc)}
                  onDelete={() => setDialog({ type: "delete", doc })}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {shareDoc && (
        <ShareDocumentModal
          doc={shareDoc}
          userId={userId}
          onClose={() => setShareDoc(null)}
        />
      )}

      {previewDoc && (
        <div className="lib-modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="dm-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dm-preview-header">
              <div className="dm-preview-header-left">
                <div>
                  <h2 className="dm-preview-title">{previewDoc.title || previewDoc.documentName}</h2>
                  <p className="dm-preview-meta">
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 8px",
                        borderRadius: 5,
                        background: "#eef2ff",
                        color: "#4f46e5",
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {getDocumentType(previewDoc)}
                    </span>
                    &nbsp;&nbsp;{subjectName} &nbsp;&bull;&nbsp; {semesterName} &nbsp;&bull;&nbsp; {getDocumentSizeLabel(previewDoc)}
                  </p>
                </div>
              </div>
              <button className="rq-close-btn" aria-label="Close preview" onClick={() => setPreviewDoc(null)}>
                x
              </button>
            </div>
            <div className="dm-review-layout">
              <div className="dm-preview-body">
                {canEmbedPreview(previewDoc.documentType) ? (
                  previewUrl ? (
                    <iframe className="dm-preview-frame" title={`Preview ${previewDoc.title || previewDoc.documentName}`} src={previewUrl} />
                  ) : (
                    <div className="dm-preview-thumb">
                      <p>{previewError || "Loading preview..."}</p>
                    </div>
                  )
                ) : (
                  <div className="dm-preview-thumb">
                    <p className="dm-preview-thumb-name">{previewDoc.title || previewDoc.documentName}</p>
                    <p className="dm-preview-thumb-size">Preview is not available for this file type.</p>
                  </div>
                )}
              </div>
              <div className="dm-preview-info">
                <div className="dm-preview-info-row">
                  <span>Course</span>
                  <strong>{subjectName}</strong>
                </div>
                <div className="dm-preview-info-row">
                  <span>Upload time</span>
                  <strong>{previewDoc.uploadedAt ? new Date(previewDoc.uploadedAt).toLocaleString() : "-"}</strong>
                </div>
                <div className="dm-preview-info-row">
                  <span>Status</span>
                  <strong>{previewDoc.visibilityStatus || "PRIVATE"}</strong>
                </div>
                <div className="dm-preview-info-row">
                  <span>File</span>
                  <strong>{previewDoc.documentName || previewDoc.title}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editDoc && (
        <EditDocumentModal
          doc={{ ...editDoc, name: editDoc.title }}
          onClose={() => setEditDoc(null)}
          onSave={(updated) => handleUpdate(editDoc, updated.name)}
        />
      )}

      {dialog && (
        <ConfirmDialog
          type="delete"
          title="Delete document?"
          fileName={dialog.doc.title}
          onCancel={() => setDialog(null)}
          onConfirm={() => handleDelete(dialog.doc)}
          loading={isSaving}
        />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
          {pageNums.map((p, i) =>
            p === "..." ? (
              <span
                key={"d" + i}
                className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm"
              >
                ...
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={
                  "w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-all " +
                  (safePage === p
                    ? "bg-indigo-600 text-white border border-indigo-600"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-indigo-400 hover:text-indigo-600")
                }
              >
                {p}
              </button>
            ),
          )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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

// PRIVATE: toggle off.
function LibraryUploadModal({ subjectId, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const userId = getCurrentUserId();

  async function handleUpload() {
    if (!file || !title.trim() || !subjectId) return;
    setUploading(true);
    try {
      // PRIVATE: toggle off.
      const newDoc = await documentApi.upload(
        file,
        title.trim(),
        subjectId,
        userId,
        "PRIVATE",
      );
      onUploaded?.(newDoc);
      setUploading(false);
    } catch (error) {
      setUploading(false);
      alert(error?.message || "Upload failed! Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-[540px] mx-4 shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between px-7 pt-7 pb-5 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">
              Upload Document
            </h2>
            <p className="text-sm text-gray-400">
              Add a document to this course.{" "}
              <span className="text-gray-500 font-medium">
                Documents are private by default.
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors mt-1"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-7 py-6 flex flex-col gap-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) setFile(f);
            }}
            onClick={() => document.getElementById("lib-file-input").click()}
            className={
              "border-2 border-dashed rounded-2xl py-9 px-6 flex flex-col items-center gap-3 cursor-pointer transition-all " +
              (dragOver
                ? "border-indigo-400 bg-indigo-50"
                : "border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-300")
            }
          >
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 12 15 15" />
              </svg>
            </div>
            {file ? (
              <div className="text-center">
                <p className="text-sm font-bold text-indigo-700">{file.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <>
                <p className="text-[15px] font-semibold text-gray-800 text-center">
                  Drag and drop files here or{" "}
                  <span className="text-indigo-600 underline underline-offset-2">
                    click to browse
                  </span>
                </p>
                <p className="text-sm text-gray-400 text-center">
                  PDF, DOCX, PPTX, PNG, JPG (Max 50MB)
                </p>
              </>
            )}
            <input
              id="lib-file-input"
              type="file"
              className="hidden"
              accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg"
              onChange={(e) => {
                const f = e.target.files[0];
                if (f) setFile(f);
              }}
            />
          </div>

          {/* Title */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-800">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. DBI202 Slide Chapter 1"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-all"
            />
          </div>

          {/* Private notice */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6b7280"
              strokeWidth="2"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-sm text-gray-500">
              This document will be{" "}
              <span className="font-semibold text-gray-700">Private</span>. You
              can request to make it public after uploading.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 px-7 py-5 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors px-3 py-2"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || !title.trim() || uploading}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-full transition-colors"
          >
            {uploading ? "Uploading..." : "Upload"}
            {!uploading && (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}



