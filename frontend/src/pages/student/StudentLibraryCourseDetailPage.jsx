import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import DocumentActionMenu from "../../components/common/DocumentActionMenu";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import EditDocumentModal from "../../components/common/EditDocumentModal";
import { documentApi, semesterApi } from "../../services/libraryApi";
import ShareDocumentModal from "../../components/common/ShareDocumentModal";
import LibraryUploadModal from "../../components/student/LibraryUploadModal";
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
import { API_BASE_URL as API_BASE } from "../../config/api";

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

// Tài liệu trong thùng rác dùng endpoint preview riêng: bản ghi đã bị đánh dấu xoá
// nên /documents/{id}/preview thông thường không trả về nữa.
async function fetchTrashDocumentBlob(documentId) {
  const token = localStorage.getItem("token");
  const response = await fetch(
    `${API_BASE}/documents/trash/${documentId}/preview`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Could not preview this trashed document.");
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

function TrashModal({ onClose, onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [purgeTarget, setPurgeTarget] = useState(null);

  useEffect(() => {
    documentApi
      .getTrash()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || "Could not load Trash."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!preview) {
      setPreviewUrl("");
      return undefined;
    }
    let url = "";
    let cancelled = false;
    setError("");
    // Xoá URL cũ trước khi tải cái mới: cleanup đã revoke nó, giữ lại thì iframe trỏ
    // vào blob không còn tồn tại và hiện khung trắng thay vì "Loading preview...".
    setPreviewUrl("");
    fetchTrashDocumentBlob(preview.documentId)
      .then((blob) => {
        if (!cancelled) {
          url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    // Thu hồi object URL khi đổi tài liệu, nếu không mỗi lần xem là rò một blob.
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview]);

  async function restore(item) {
    setBusyId(item.documentId);
    setError("");
    try {
      await documentApi.restoreFromTrash(item.documentId);
      const next = items.filter((entry) => entry.documentId !== item.documentId);
      setItems(next);
      setPreview(null);
      onChanged?.(next.length, item);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function purge(item) {
    setBusyId(item.documentId);
    setError("");
    try {
      await documentApi.purgeFromTrash(item.documentId);
      const next = items.filter((entry) => entry.documentId !== item.documentId);
      setItems(next);
      setPreview(null);
      onChanged?.(next.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
      setPurgeTarget(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-2xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-xl font-black text-gray-900">Trash</h2>
            <p className="text-sm text-gray-500">
              Documents are permanently deleted after 30 days.
            </p>
          </div>
          <button
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="grid min-h-[420px] grid-cols-1 md:grid-cols-[1fr_1.1fr]">
          <div className="max-h-[68vh] overflow-y-auto border-r border-gray-100 p-4">
            {loading ? (
              <p className="py-12 text-center text-sm text-gray-400">
                Loading Trash...
              </p>
            ) : items.length === 0 ? (
              <div className="py-16 text-center">
                <div className="mb-3 text-4xl">🗑️</div>
                <p className="font-bold text-gray-700">Trash is empty</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.documentId}
                  className={
                    "mb-3 rounded-xl border p-4 " +
                    (preview?.documentId === item.documentId
                      ? "border-indigo-300 bg-indigo-50"
                      : "border-gray-200")
                  }
                >
                  <button
                    className="block w-full text-left"
                    onClick={() => setPreview(item)}
                  >
                    <div className="truncate text-sm font-bold text-gray-900">
                      {item.title || item.documentName}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {item.subjectName || "Unknown course"} ·{" "}
                      {getDocumentType(item)}
                    </div>
                    <div className="mt-2 text-xs font-semibold text-amber-600">
                      Permanently deleted in {item.remainingDays} day
                      {item.remainingDays === 1 ? "" : "s"}
                    </div>
                  </button>
                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={busyId === item.documentId}
                      onClick={() => restore(item)}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Restore
                    </button>
                    <button
                      disabled={busyId === item.documentId}
                      onClick={() => setPurgeTarget(item)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete permanently
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex min-h-[420px] flex-col bg-gray-50 p-4">
            {!preview ? (
              <div className="m-auto text-center text-sm text-gray-400">
                Select a document to preview it.
              </div>
            ) : (
              <>
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
                  This document is in Trash and will be permanently deleted in{" "}
                  {preview.remainingDays} day
                  {preview.remainingDays === 1 ? "" : "s"}.
                </div>
                {previewUrl && canEmbedPreview(preview.documentType) ? (
                  <iframe
                    className="min-h-0 flex-1 rounded-xl border border-gray-200 bg-white"
                    title={`Preview ${preview.title}`}
                    src={previewUrl}
                  />
                ) : previewUrl ? (
                  <div className="m-auto text-center text-sm text-gray-500">
                    Preview is not supported for this file type.
                  </div>
                ) : (
                  <div className="m-auto text-sm text-gray-400">
                    Loading preview...
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {purgeTarget && (
        <ConfirmDialog
          type="delete"
          title="Delete permanently?"
          fileName={purgeTarget.title || purgeTarget.documentName}
          onCancel={() => setPurgeTarget(null)}
          onConfirm={() => purge(purgeTarget)}
        />
      )}
    </div>
  );
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
  const [showTrash, setShowTrash] = useState(false);
  const [trashCount, setTrashCount] = useState(0);
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

  // Đếm riêng, không gộp vào effect tải tài liệu: thùng rác gồm cả tài liệu của môn
  // khác, và lỗi ở đây không được làm hỏng danh sách chính.
  useEffect(() => {
    documentApi
      .getTrash()
      .then((items) => setTrashCount(Array.isArray(items) ? items.length : 0))
      .catch(() => setTrashCount(0));
  }, []);

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
      setTrashCount((count) => count + 1);
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
    <div className="p-7 bg-gray-50">
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

      {showTrash && (
        <TrashModal
          onClose={() => setShowTrash(false)}
          onChanged={(count, restoredItem) => {
            setTrashCount(count);
            // Chỉ tải lại danh sách khi tài liệu khôi phục thuộc đúng môn đang mở.
            if (
              restoredItem &&
              Number(restoredItem.subjectId) === Number(subjectId)
            ) {
              documentApi
                .getBySubject(subjectId)
                .then((data) => {
                  setDocs(
                    (Array.isArray(data) ? data : []).filter(
                      (doc) => !isMockSeedDocument(doc),
                    ),
                  );
                })
                .catch((err) =>
                  setError(
                    err.message ||
                      "Restored, but the document list could not be refreshed.",
                  ),
                );
            }
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
        <div className="flex items-center gap-3">
        <button
          onClick={() => setShowTrash(true)}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
          </svg>
          Trash
          {trashCount > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-black text-gray-600">
              {trashCount}
            </span>
          )}
        </button>
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

