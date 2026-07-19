import React from "react";

export default function ConfirmDialog({
  type,
  fileName,
  onConfirm,
  onCancel,
  title,
}) {
  const [loading, setLoading] = React.useState(false);
  const isDelete = type === "delete";

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm?.();
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
      onClick={() => {}}
    >
      <div className="bg-white rounded-2xl w-full max-w-[420px] mx-4 shadow-2xl overflow-hidden">
        <div className="flex flex-col items-center px-7 pt-8 pb-6 text-center">
          <div
            className={
              "w-14 h-14 rounded-full flex items-center justify-center mb-4 " +
              (isDelete ? "bg-red-100" : "bg-indigo-100")
            }
          >
            {isDelete ? (
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            ) : (
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="2"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            )}
          </div>

          <h3 className="text-lg font-black text-gray-900 mb-2">
            {title || (isDelete ? "Delete ?" : "Edit ?")}
          </h3>

          <p className="text-sm text-gray-500 leading-relaxed">
            {isDelete ? (
              <>
                Are you sure you want to delete{" "}
                <span className="font-semibold text-gray-700">
                  "{fileName}"
                </span>
                ? This action cannot be undone.
              </>
            ) : (
              <>
                You are about to edit{" "}
                <span className="font-semibold text-gray-700">
                  "{fileName}"
                </span>
                . Changes will be saved immediately.
              </>
            )}
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
            className={
              "flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-colors cursor-pointer " +
              (isDelete
                ? "bg-red-500 hover:bg-red-600 disabled:opacity-50"
                : "bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50")
            }
          >
            {loading ? "Processing..." : isDelete ? "Delete" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
