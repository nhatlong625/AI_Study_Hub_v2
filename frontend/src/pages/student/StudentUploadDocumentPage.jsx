import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import { documentApi, semesterApi } from "../../services/libraryApi";
import UpgradePricingModal from "../../components/student/UpgradePricingModal";
import { formatStorageBytes } from "../../utils/formatStorage";

function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.userId || user.id || 1;
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

function StudentUploadDocumentPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [storageLimit, setStorageLimit] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    semesterApi
      .getAll()
      .then((data) => {
        if (!cancelled) setSemesters(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setError("Cannot load courses. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoadingSubjects(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const subjects = useMemo(
    () =>
      semesters.flatMap((semester) =>
        (semester.subjects || []).map((subject) => ({
          ...subject,
          semesterName: semester.semesterName,
        })),
      ),
    [semesters],
  );

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    if (!title.trim()) setTitle(selectedFile.name.replace(/\.[^.]+$/, ""));
  };

  const handleUpload = async () => {
    if (!file || !title.trim() || !subjectId) {
      setError("Please choose a file, title, and course before uploading.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const newDoc = await documentApi.upload(
        file,
        title.trim(),
        Number(subjectId),
        getCurrentUserId(),
        "PRIVATE",
      );
      navigate("/student/documents/" + newDoc.documentId, {
        state: { doc: newDoc },
      });
    } catch (err) {
      const msg = err.message || "Upload failed. Please try again.";
      // Vượt dung lượng: hiện popup báo lỗi, để người dùng tự bấm Upgrade Plan.
      const limitInfo = parseStorageLimitError(msg);
      if (limitInfo) {
        setStorageLimit(limitInfo);
        setError("");
      } else {
        setError(msg);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="page-shell">
        <PageHeader
          eyebrow="Upload"
          title="Add new study documents"
          description="Prepare files for summaries, AI tutoring, and quiz generation."
        />
        <section className="split-panel">
          <Card
            title="Document details"
            description="Choose a course and save this file to your library."
          >
            <div className="section-stack">
              <Input
                label="Title"
                placeholder="Neural Networks Revision Pack"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <label className="input-group">
                <span className="input-label">Course</span>
                <select
                  className="input"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={loadingSubjects}
                >
                  <option value="">
                    {loadingSubjects ? "Loading courses..." : "Select a course"}
                  </option>
                  {subjects.map((subject) => (
                    <option key={subject.subjectId} value={subject.subjectId}>
                      {subject.subjectName} - {subject.semesterName}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Description"
                as="textarea"
                placeholder="Add a short summary of the material"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              {error ? <p className="text-sm text-red-500">{error}</p> : null}

              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? "Uploading..." : "Upload document"}
              </Button>
            </div>
          </Card>
          <Card
            title="Drop zone"
            description="Upload notes, PDFs, slide decks, and study summaries."
          >
            <div
              className="upload-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileSelect(e.dataTransfer.files?.[0]);
              }}
            >
              <div className="empty-illustration">UP</div>
              <h3 className="card-title">
                {file ? file.name : "Drag and drop files here"}
              </h3>
              <p className="card-description">
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB selected`
                  : "Supports notes, PDFs, slide decks, and study summaries."}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.txt"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />
              <Button
                variant="secondary"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose files
              </Button>
            </div>
          </Card>
        </section>
      </div>

      {storageLimit && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Storage limit reached"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setStorageLimit(null)}
        >
          <div
            style={{
              width: "min(420px, 100%)",
              background: "#fff",
              borderRadius: 16,
              padding: 28,
              boxShadow: "0 24px 60px rgba(15,23,42,0.24)",
              textAlign: "center",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                width: 56,
                height: 56,
                margin: "0 auto 16px",
                borderRadius: "50%",
                background: "#fef3c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
              }}
            >
              ⚠️
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 19, color: "#111827" }}>
              Đã vượt quá dung lượng
            </h3>
            <p
              style={{
                margin: "0 0 18px",
                fontSize: 14,
                color: "#4b5563",
                lineHeight: 1.5,
              }}
            >
              Bạn đã dùng{" "}
              <strong>{formatStorageBytes(storageLimit.usedBytes)}</strong> trên
              tổng <strong>{formatStorageBytes(storageLimit.maxBytes)}</strong>{" "}
              dung lượng của gói hiện tại.
              {storageLimit.fileBytes > 0 && (
                <>
                  {" "}
                  File này (
                  <strong>{formatStorageBytes(storageLimit.fileBytes)}</strong>)
                  vượt quá{" "}
                  <strong>{formatStorageBytes(storageLimit.freeBytes)}</strong>{" "}
                  còn trống.
                </>
              )}{" "}
              Nâng cấp gói để có thêm dung lượng lưu trữ.
            </p>
            <div
              style={{
                height: 6,
                borderRadius: 999,
                background: "#fde68a",
                overflow: "hidden",
                marginBottom: 22,
              }}
            >
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: "#f59e0b",
                  width: `${storageLimit.maxBytes > 0 ? Math.min((storageLimit.usedBytes / storageLimit.maxBytes) * 100, 100) : 0}%`,
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setStorageLimit(null)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={() => {
                  setStorageLimit(null);
                  setShowUpgradeModal(true);
                }}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: "#5046e5",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      )}

      <UpgradePricingModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  );
}

export default StudentUploadDocumentPage;
