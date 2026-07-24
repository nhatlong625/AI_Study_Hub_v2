import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import { documentApi, semesterApi } from "../../services/libraryApi";
import UpgradePricingModal from "../../components/student/UpgradePricingModal";
import { formatStorageMb } from "../../utils/formatStorage";

function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.userId || user.id || 1;
  } catch {
    return 1;
  }
}

function parseStorageLimitError(message) {
  // Format: "STORAGE_LIMIT_REACHED:usedMb:maxMb"
  if (!message || !message.startsWith("STORAGE_LIMIT_REACHED:")) return null;
  const parts = message.split(":");
  return { used: Number(parts[1]), max: Number(parts[2]) };
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
      setError(msg);
      // Tự động mở Upgrade modal nếu bị giới hạn storage
      if (msg.startsWith("STORAGE_LIMIT_REACHED:")) {
        setShowUpgradeModal(true);
      }
    } finally {
      setUploading(false);
    }
  };

  const limitInfo = parseStorageLimitError(error);

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

              {/* Storage limit error */}
              {limitInfo ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm font-bold text-amber-800 mb-1">
                    Storage Limit Reached
                  </p>
                  <p className="text-xs text-amber-600 mb-3">
                    You've used{" "}
                    <span className="font-bold">
                      {formatStorageMb(limitInfo.used)}
                    </span>{" "}
                    of your {formatStorageMb(limitInfo.max)} storage
                    quota. Upgrade your plan to get more storage.
                  </p>
                  <div className="h-1.5 rounded-full bg-amber-200 overflow-hidden mb-3">
                    <div
                      className="h-1.5 rounded-full bg-amber-500"
                      style={{
                        width: `${Math.min((limitInfo.used / limitInfo.max) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowUpgradeModal(true)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      Upgrade Plan
                    </button>
                    <button
                      type="button"
                      onClick={() => setError("")}
                      className="px-3 py-1.5 border border-amber-300 text-amber-700 text-xs font-semibold rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : error ? (
                <p className="text-sm text-red-500">{error}</p>
              ) : null}

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

      <UpgradePricingModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  );
}

export default StudentUploadDocumentPage;
