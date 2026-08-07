import { useState, useEffect } from "react";
import { documentApi, libraryApi } from "../../services/libraryApi";
import UpgradePricingModal from "./UpgradePricingModal";
import { formatStorageBytes } from "../../utils/formatStorage";

function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return Number(user.userId || user.id || 1);
  } catch {
    return 1;
  }
}

function parseStorageLimitError(message) {
  // Format: "STORAGE_LIMIT_REACHED:usedBytes:maxBytes:fileBytes"
  if (!message || !message.startsWith("STORAGE_LIMIT_REACHED:")) return null;
  const parts = message.split(":");
  const usedBytes = Number(parts[1]);
  const maxBytes = Number(parts[2]);
  const fileBytes = Number(parts[3]);
  return {
    usedBytes,
    maxBytes,
    fileBytes: Number.isFinite(fileBytes) ? fileBytes : 0,
    freeBytes: Math.max(maxBytes - usedBytes, 0),
  };
}

/** Bỏ đuôi mở rộng để đổ vào ô title — người dùng vẫn sửa được. */
function titleFromFileName(fileName = "") {
  return fileName.replace(/\.[^.]+$/, "").trim();
}

/**
 * Modal upload tài liệu vào một môn.
 *
 * Môn luôn đến từ ngữ cảnh trang gọi nó — người dùng đã đi qua các trang chọn
 * trước khi tới đây, nên modal không hỏi lại đích đến.
 */
export default function LibraryUploadModal({ subjectId, onClose, onUploaded }) {
  const userId = getCurrentUserId();

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [quota, setQuota] = useState(null);

  const limitInfo = parseStorageLimitError(error);

  useEffect(() => {
    let cancelled = false;
    libraryApi
      .getOverview(userId)
      .then((overview) => {
        if (cancelled) return;
        setQuota({
          usedBytes: Number(overview?.totalStorageBytes ?? 0),
          maxBytes: Number(overview?.maxStorageBytes ?? 0),
        });
      })
      .catch(() => {
        // Không chặn upload chỉ vì không đọc được hạn mức — server vẫn kiểm lại.
        if (!cancelled) setQuota(null);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const freeBytes = quota ? Math.max(quota.maxBytes - quota.usedBytes, 0) : null;
  // File PDF được lưu nguyên kích thước nên chặn được chắc chắn. Các định dạng khác
  // sẽ convert sang PDF ở server và thường co lại, nên chỉ cảnh báo — chặn ở client
  // sẽ từ chối nhầm file thật ra vẫn vừa chỗ.
  const isExactSize = Boolean(file) && /\.pdf$/i.test(file.name || "");
  const tooBig = Boolean(file) && freeBytes !== null && file.size > freeBytes;
  const blockUpload = tooBig && isExactSize;

  function handlePickFile(picked) {
    if (!picked) return;
    setFile(picked);
    // Chỉ điền khi ô còn trống để không đè lên tiêu đề người dùng đã tự gõ.
    setTitle((prev) => (prev.trim() ? prev : titleFromFileName(picked.name)));
  }

  async function handleUpload() {
    if (!file || !title.trim() || !subjectId) return;
    setUploading(true);
    setUploadPercent(0);
    setError("");
    try {
      // PRIVATE: toggle off.
      const newDoc = await documentApi.upload(
        file,
        title.trim(),
        subjectId,
        userId,
        "PRIVATE",
        setUploadPercent,
      );
      onUploaded?.(newDoc);
      setUploading(false);
    } catch (err) {
      setUploading(false);
      const msg = err?.message || "Upload failed! Please try again.";
      setError(msg);
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
              handlePickFile(e.dataTransfer.files[0]);
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
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2">
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
              onChange={(e) => handlePickFile(e.target.files[0])}
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="text-sm text-gray-500">
              This document will be{" "}
              <span className="font-semibold text-gray-700">Private</span>. You
              can request to make it public after uploading.
            </p>
          </div>

          {/* Hạn mức hiện tại — cho người dùng biết trước khi chọn file, không phải
              đợi upload xong mới nhận lỗi. Chỉ hiện khi chưa có lỗi quota từ server. */}
          {quota && quota.maxBytes > 0 && !limitInfo && (
            <div className="text-xs text-gray-500 px-1">
              <span>
                Storage:{" "}
                <span className="font-semibold text-gray-700">
                  {formatStorageBytes(quota.usedBytes)}
                </span>{" "}
                of {formatStorageBytes(quota.maxBytes)} used
              </span>
            </div>
          )}

          {tooBig && !limitInfo && (
            <div
              className={
                "p-3 rounded-xl border " +
                (blockUpload
                  ? "bg-red-50 border-red-200"
                  : "bg-amber-50 border-amber-200")
              }
            >
              <p
                className={
                  "text-xs font-semibold " +
                  (blockUpload ? "text-red-600" : "text-amber-700")
                }
              >
                {blockUpload
                  ? `This file (${formatStorageBytes(file.size)}) is larger than the ${formatStorageBytes(freeBytes)} you have left.`
                  : `This file (${formatStorageBytes(file.size)}) is larger than the ${formatStorageBytes(freeBytes)} you have left. It is converted to PDF on upload and may still fit — you can try.`}
              </p>
            </div>
          )}

          {/* Storage limit error */}
          {limitInfo ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm font-bold text-amber-800 mb-1">
                Storage Limit Reached
              </p>
              <p className="text-xs text-amber-600 mb-3">
                You've used{" "}
                <span className="font-bold">
                  {formatStorageBytes(limitInfo.usedBytes)}
                </span>{" "}
                of your {formatStorageBytes(limitInfo.maxBytes)} storage quota.
                {limitInfo.fileBytes > 0 && (
                  <>
                    {" "}This file ({formatStorageBytes(limitInfo.fileBytes)})
                    exceeds the {formatStorageBytes(limitInfo.freeBytes)} you have
                    left.
                  </>
                )}{" "}
                Upgrade your plan to get more storage.
              </p>
              <div className="h-1.5 rounded-full bg-amber-200 overflow-hidden mb-3">
                <div
                  className="h-1.5 rounded-full bg-amber-500"
                  style={{
                    width: `${limitInfo.maxBytes > 0 ? Math.min((limitInfo.usedBytes / limitInfo.maxBytes) * 100, 100) : 0}%`,
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Upgrade Plan
              </button>
            </div>
          ) : error ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-xs font-semibold text-red-600">{error}</p>
            </div>
          ) : null}
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
            disabled={!file || !title.trim() || uploading || blockUpload}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-full transition-colors"
          >
            {uploading
              ? uploadPercent >= 100
                ? "Processing..."
                : `Uploading ${uploadPercent}%`
              : "Upload"}
            {!uploading && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <UpgradePricingModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}
