// components/common/ShareDocumentModal.jsx
import { useState, useEffect, useRef } from "react";
import { documentApi } from "../../services/libraryApi";

function getCurrentUserId(fallback) {
  if (fallback) return fallback;
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.userId || user.id || 1;
  } catch {
    return 1;
  }
}

function Avatar({ name, email }) {
  const str = name || email || "?";
  const initials = str
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-indigo-500",
  ];
  const color = colors[(str.charCodeAt(0) || 0) % colors.length];
  return (
    <div
      className={`w-9 h-9 rounded-full ${color} text-white flex items-center justify-center text-sm font-bold flex-shrink-0`}
    >
      {initials}
    </div>
  );
}

export default function ShareDocumentModal({ doc, userId, onClose }) {
  const [inputValue, setInputValue] = useState("");
  const [pendingEmail, setPendingEmail] = useState(null);
  const [permission, setPermission] = useState("VIEW");
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");

  const [sharedList, setSharedList] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const inputRef = useRef(null);

  useEffect(() => {
    documentApi
      .getSharesForDocument(doc.documentId)
      .then(setSharedList)
      .catch(() => {})
      .finally(() => setListLoading(false));
  }, [doc.documentId]);

  function commitEmail() {
    const email = inputValue.trim().replace(/,$/, "");
    if (email) {
      setPendingEmail(email);
      setInputValue("");
      setShareError("");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === "Tab" || e.key === ",") {
      e.preventDefault();
      commitEmail();
    }
    // Xoá tag khi backspace và input rỗng
    if (e.key === "Backspace" && !inputValue && pendingEmail) {
      setInputValue(pendingEmail);
      setPendingEmail(null);
    }
  }

  function handleBlur() {
    if (inputValue.trim()) commitEmail();
  }

  function removePending() {
    setPendingEmail(null);
    setInputValue("");
    setShareError("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleShare() {
    const email = pendingEmail || inputValue.trim();
    if (!email) {
      setShareError("Please enter an email address.");
      return;
    }
    setShareError("");
    setSharing(true);
    try {
      const res = await documentApi.shareWithUser(
        doc.documentId,
        email,
        permission,
        getCurrentUserId(userId),
      );
      setSharedList((prev) => [...prev, res]);
      setPendingEmail(null);
      setInputValue("");
    } catch (err) {
      setShareError(err.message || "Could not share. Please try again.");
    } finally {
      setSharing(false);
    }
  }

  async function handlePermissionChange(shareId, newPermission) {
    if (newPermission === "REMOVE") {
      setUpdatingId(shareId);
      try {
        await documentApi.revokeUserShare(shareId);
        setSharedList((prev) => prev.filter((s) => s.shareId !== shareId));
      } catch (err) {
        alert(err.message);
      } finally {
        setUpdatingId(null);
      }
      return;
    }
    setUpdatingId(shareId);
    try {
      const updated = await documentApi.updateSharePermission(
        shareId,
        newPermission,
      );
      setSharedList((prev) =>
        prev.map((s) =>
          s.shareId === shareId ? { ...s, permission: updated.permission } : s,
        ),
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const canShare = !!(pendingEmail || inputValue.trim());

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-[500px] mx-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-base font-semibold text-gray-900 truncate pr-4">
            Share "{doc.title}"
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
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

        {/* Input row */}
        <div className="px-6 pb-3">
          <div className="flex items-center gap-2">
            {/* Email input box */}
            <div
              className={`flex items-center flex-1 flex-wrap gap-1.5 px-3 py-2 border-2 rounded-xl min-w-0 transition-colors
              ${shareError ? "border-red-300" : "border-gray-200 focus-within:border-blue-400"}`}
            >
              {/* Email tag */}
              {pendingEmail && (
                <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full pl-2 pr-1 py-0.5 flex-shrink-0">
                  <div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">
                    {pendingEmail[0].toUpperCase()}
                  </div>
                  <span className="text-xs text-blue-800 font-medium max-w-[160px] truncate">
                    {pendingEmail}
                  </span>
                  <button
                    onClick={removePending}
                    className="text-blue-400 hover:text-blue-700 ml-0.5"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setShareError("");
                }}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                placeholder={pendingEmail ? "" : "Add people by email..."}
                className="flex-1 min-w-[120px] text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400"
              />
            </div>

            {/* Permission */}
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              className="text-sm border-2 border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 text-gray-700 cursor-pointer flex-shrink-0 transition-colors"
            >
              <option value="VIEW">Viewer</option>
              <option value="EDIT">Editor</option>
            </select>
          </div>

          {shareError && (
            <p className="text-xs text-red-500 mt-1.5">{shareError}</p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 mx-6" />

        {/* People with access */}
        <div className="px-6 pt-4 pb-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            People with access
          </p>

          {listLoading ? (
            <p className="text-sm text-gray-400 py-2">Loading...</p>
          ) : sharedList.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">
              Not shared with anyone yet.
            </p>
          ) : (
            <div className="flex flex-col max-h-48 overflow-y-auto -mx-2">
              {sharedList.map((s) => (
                <div
                  key={s.shareId}
                  className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <Avatar name={s.sharedToName} email={s.sharedToEmail} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {s.sharedToName || s.sharedToEmail}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {s.sharedToEmail}
                    </p>
                  </div>
                  <select
                    value={s.permission}
                    onChange={(e) =>
                      handlePermissionChange(s.shareId, e.target.value)
                    }
                    disabled={updatingId === s.shareId}
                    className="text-sm text-gray-600 outline-none bg-transparent cursor-pointer disabled:opacity-50 flex-shrink-0"
                  >
                    <option value="VIEW">Viewer</option>
                    <option value="EDIT">Editor</option>
                    <option value="REMOVE">Remove access</option>
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* Share button — góc phải dưới cùng */}
          <div className="flex justify-end mt-5">
            <button
              onClick={handleShare}
              disabled={sharing || !canShare}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {sharing ? "Sharing..." : "Share"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
