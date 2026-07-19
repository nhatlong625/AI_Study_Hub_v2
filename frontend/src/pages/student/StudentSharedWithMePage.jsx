import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { documentApi } from "../../services/libraryApi";
import SharedDocumentActionMenu from "../../components/common/SharedDocumentActionMenu";

// ── Visibility constants — giống StudentLibraryCourseDetailPage ────
const VIS = {
  PRIVATE: "PRIVATE",
  PENDING: "PENDING_REVIEW",
  PUBLIC: "PUBLIC",
};

// Cooldown 1h — phải khớp với DocumentService.updateVisibility() ở BE.
const COOLDOWN_MS = 60 * 60 * 1000;

function getCooldownRemainingMs(item) {
  if (item.visibilityStatus !== VIS.PRIVATE || !item.updatedAt) return 0;
  const cooldownEnd = new Date(item.updatedAt).getTime() + COOLDOWN_MS;
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

// Notice modal — thay alert() thô, dùng cho cooldown/409 (giống Library)
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

// Toggle 3 trạng thái — giống StudentLibraryCourseDetailPage
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
        "relative inline-flex w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 " +
        (isPending ? "bg-amber-400" : isOn ? "bg-indigo-600" : "bg-gray-300") +
        (disabled ? " opacity-50 cursor-not-allowed" : "")
      }
    >
      <span
        className={
          "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform " +
          (isOn ? "translate-x-4" : "translate-x-0")
        }
      />
    </button>
  );
}

function VisibilityLabel({ status }) {
  if (status === VIS.PUBLIC)
    return (
      <span className="text-xs font-semibold text-indigo-600">Public</span>
    );
  if (status === VIS.PENDING)
    return (
      <span className="text-xs font-semibold text-amber-500">Pending</span>
    );
  return <span className="text-xs font-semibold text-gray-500">Private</span>;
}

// Confirm trước khi tự gỡ mình khỏi "Shared with me" — KHÁC delete: chỉ xoá
// quyền truy cập của chính mình (đổi status share → REVOKED), không xoá file
// gốc, không ảnh hưởng owner hay người khác đang được share cùng tài liệu.
function RemoveConfirmModal({ fileName, onConfirm, onCancel }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm?.();
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[420px] mx-4 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center px-7 pt-8 pb-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-2">
            Remove from your list?
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            <span className="font-semibold text-gray-700">"{fileName}"</span>{" "}
            will be removed from your "Shared with me" list. The owner can share
            it with you again anytime.
          </p>
        </div>
        <div className="flex items-center gap-3 px-7 pb-7">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-xl transition-colors"
          >
            {loading ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Đọc userId từ localStorage — fallback về 1 nếu chưa login
function getUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.userId || 1;
  } catch {
    return 1;
  }
}

// ── Icons ──────────────────────────────────────────────────────
const FileIcon = ({ type }) => {
  const color =
    type === "pdf"
      ? "#ef4444"
      : type === "docx"
        ? "#3b82f6"
        : type === "pptx"
          ? "#f97316"
          : "#6b7280";
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
};

function Avatar({ name }) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
      {initials}
    </div>
  );
}

function PermissionBadge({ permission }) {
  const isEdit = permission === "EDIT";
  return (
    <span
      className={`justify-self-start text-xs font-semibold px-2.5 py-1 rounded-full
      ${isEdit ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}
    >
      {isEdit ? "Editor" : "Viewer"}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getExt(name) {
  if (!name) return "";
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

export default function StudentSharedWithMePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  // track shareId đang toggle (tránh double-click) + notice modal cooldown/409
  const [togglingIds, setTogglingIds] = useState(new Set());
  const [notice, setNotice] = useState(null);
  // item đang chờ confirm Remove (null = không hiện modal)
  const [removeTarget, setRemoveTarget] = useState(null);

  useEffect(() => {
    documentApi
      .getSharedWithMe(getUserId())
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Mở document — giống cách Library navigate sang trang viewer, kèm map field
  // (documentTitle → title) vì UserShareResponse và DocumentResponse khác tên field.
  function handleOpenDocument(item) {
    navigate("/student/documents/" + item.documentId, {
      state: {
        doc: {
          documentId: item.documentId,
          title: item.documentTitle,
          documentName: item.documentName,
          documentUrl: item.documentUrl,
        },
      },
    });
  }

  // Tự gỡ mình khỏi danh sách share — gọi đúng API revoke đã có sẵn (owner
  // dùng để revoke trong modal Share), chỉ khác là gọi trên shareId của chính
  // mình nên không ảnh hưởng người khác.
  async function handleRemove() {
    if (!removeTarget) return;
    try {
      await documentApi.revokeUserShare(removeTarget.shareId);
      setItems((prev) =>
        prev.filter((it) => it.shareId !== removeTarget.shareId),
      );
      setRemoveTarget(null);
    } catch (err) {
      setNotice({
        title: "Error",
        message: err.message || "Could not remove. Please try again.",
      });
      setRemoveTarget(null);
    }
  }

  // Toggle visibility (3 trạng thái) — chỉ gọi khi item.permission === 'EDIT'.
  // Logic và cooldown y hệt StudentLibraryCourseDetailPage vì cùng gọi chung
  // BE endpoint PATCH /documents/{id}/visibility.
  async function handleToggleVisibility(item) {
    if (togglingIds.has(item.shareId)) return;

    let newStatus;
    if (item.visibilityStatus === VIS.PUBLIC) {
      newStatus = VIS.PRIVATE;
    } else if (item.visibilityStatus === VIS.PRIVATE) {
      newStatus = VIS.PENDING;
    } else if (item.visibilityStatus === VIS.PENDING) {
      newStatus = VIS.PRIVATE;
    } else {
      return;
    }

    if (newStatus === VIS.PENDING) {
      const remaining = getCooldownRemainingMs(item);
      if (remaining > 0) {
        setNotice({
          title: "Try again later",
          message: `You need to wait ${formatRemaining(remaining)} more before requesting to publish again.`,
        });
        return;
      }
    }

    setTogglingIds((prev) => new Set([...prev, item.shareId]));

    try {
      const updated = await documentApi.updateVisibility(
        item.documentId,
        newStatus,
      );

      setItems((prev) =>
        prev.map((it) =>
          it.shareId === item.shareId
            ? {
                ...it,
                visibilityStatus: newStatus,
                updatedAt: updated?.updatedAt ?? it.updatedAt,
              }
            : it,
        ),
      );
    } catch (err) {
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
        next.delete(item.shareId);
        return next;
      });
    }
  }

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    return (
      (item.documentTitle || "").toLowerCase().includes(q) ||
      (item.ownerName || "").toLowerCase().includes(q) ||
      (item.ownerEmail || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-7" style={{ background: "#f5f6fa", minHeight: "100%" }}>
      {notice && (
        <VisibilityNoticeModal
          title={notice.title}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}
      {removeTarget && (
        <RemoveConfirmModal
          fileName={removeTarget.documentTitle || removeTarget.documentName}
          onConfirm={handleRemove}
          onCancel={() => setRemoveTarget(null)}
        />
      )}
      {/* Header */}
      <div className="flex min-h-[64px] items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="m-0 text-[30px] leading-9 font-black text-gray-900 tracking-tight">
            Shared with me
          </h1>
          <p className="mt-1 mb-0 text-sm leading-5 text-gray-500">
            Documents other students have shared with you.
          </p>
        </div>

        {/* Search */}
        {items.length > 0 && (
          <div className="relative flex-shrink-0">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:border-indigo-400 transition-colors w-52"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            Loading...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-sm text-red-500">
            {error}
          </div>
        ) : items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.5"
              >
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-base font-bold text-gray-900 mb-1">
              No shared documents yet
            </p>
            <p className="text-sm text-gray-400 max-w-xs">
              When someone shares a document with you, it will appear here.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            No results for "{search}"
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_160px_80px_100px_140px_70px] px-6 py-3.5 bg-indigo-50 border-b border-indigo-100">
              {[
                "Document",
                "Shared by",
                "Type",
                "Permission",
                "Visibility",
                "Action",
              ].map((h, i) => (
                <span
                  key={h}
                  className={
                    "text-[11px] font-bold tracking-wider text-gray-400 uppercase" +
                    (i > 0 ? " text-center" : "")
                  }
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            <div>
              {filtered.map((item, i) => {
                const ext = getExt(item.documentName);
                return (
                  <div
                    key={item.shareId}
                    className={
                      "grid grid-cols-[1fr_160px_80px_100px_140px_70px] px-6 py-4 items-center hover:bg-gray-50 transition-colors " +
                      (i < filtered.length - 1
                        ? "border-b border-gray-100"
                        : "")
                    }
                  >
                    {/* Document name */}
                    <div className="flex items-center gap-3 pr-4 min-w-0">
                      <FileIcon type={ext} />
                      <div className="min-w-0">
                        <p
                          className="text-sm font-semibold text-indigo-600 truncate cursor-pointer hover:text-indigo-700"
                          onClick={() => handleOpenDocument(item)}
                        >
                          {item.documentTitle || item.documentName}
                        </p>
                        {item.documentTitle && item.documentName && (
                          <p className="text-xs text-gray-400 truncate">
                            {item.documentName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Shared by */}
                    <div className="flex items-center gap-2 min-w-0 border-l border-gray-200 self-stretch pl-4">
                      <Avatar name={item.ownerName} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">
                          {item.ownerName || "—"}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {item.ownerEmail}
                        </p>
                      </div>
                    </div>

                    {/* Type */}
                    <div className="flex items-center justify-center border-l border-gray-200 self-stretch">
                      <span className="text-xs font-bold text-gray-400 uppercase">
                        {ext || "—"}
                      </span>
                    </div>

                    {/* Permission */}
                    <div className="flex items-center justify-center border-l border-gray-200 self-stretch">
                      <PermissionBadge permission={item.permission} />
                    </div>

                    {/* Visibility — chỉ Editor mới được toggle */}
                    <div className="flex items-center justify-center gap-2 border-l border-gray-200 self-stretch">
                      {item.permission === "EDIT" ? (
                        <>
                          <VisibilityToggle
                            status={item.visibilityStatus}
                            onChange={() => handleToggleVisibility(item)}
                            disabled={togglingIds.has(item.shareId)}
                          />
                          <VisibilityLabel status={item.visibilityStatus} />
                        </>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex justify-center border-l border-gray-200 self-stretch">
                      <SharedDocumentActionMenu
                        onOpen={() => handleOpenDocument(item)}
                        onRemove={() => setRemoveTarget(item)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
