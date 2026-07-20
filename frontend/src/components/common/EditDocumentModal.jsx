import { useState } from "react";

export default function EditDocumentModal({ doc, onClose, onSave }) {
  const [title, setTitle] = useState(doc.name || doc.title || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // onSave là async (gọi documentApi.updateTitle thật) — chỉ đóng modal khi
  // thành công; nếu lỗi thì hiện inline, giữ modal mở để user sửa/thử lại
  // (giống pattern Approve/Reject ở AdminDocumentManagementPage).
  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave?.({ ...doc, name: title.trim() });
      onClose();
    } catch (err) {
      setError(err?.message || "Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
      onClick={() => {}}
    >
      <div className="bg-white rounded-2xl w-full max-w-[480px] mx-4 shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between px-7 pt-7 pb-5 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black text-gray-900 mb-1">
              Edit Document
            </h2>
            <p className="text-sm text-gray-400 truncate max-w-[320px]">
              {doc.documentName || doc.name}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-gray-400 hover:text-gray-700 transition-colors mt-1 disabled:opacity-50"
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
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-800">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-all disabled:opacity-60"
            />
          </div>

          {error && <p className="text-sm text-red-600 -mt-1">{error}</p>}

          <div className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6b7280"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-xs text-gray-500">
              File:{" "}
              <span className="font-semibold">
                {doc.documentName || doc.name}
              </span>
              {doc.documentSize
                ? " · " + (doc.documentSize / 1024 / 1024).toFixed(1) + " MB"
                : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-7 pb-7">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
