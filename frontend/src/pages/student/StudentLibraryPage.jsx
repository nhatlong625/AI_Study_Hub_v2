import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { useState, useEffect, useRef } from "react";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import {
  libraryApi,
  userSubjectApi,
} from "../../services/libraryApi";
import { formatStorageBytes } from "../../utils/formatStorage";

// Badge config.
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

const SEMESTER_BADGE = {
  "Semester 0": { bg: "bg-yellow-100", text: "text-yellow-700", id: "S0" },
  "Semester 1": { bg: "bg-cyan-100", text: "text-cyan-600", id: "S1" },
  "Semester 2": { bg: "bg-orange-100", text: "text-orange-500", id: "S2" },
  "Semester 3": { bg: "bg-green-100", text: "text-green-600", id: "S3" },
  "Semester 4": { bg: "bg-purple-100", text: "text-purple-600", id: "S4" },
  "Semester 5": { bg: "bg-blue-100", text: "text-blue-600", id: "S5" },
  "Semester 6": { bg: "bg-pink-100", text: "text-pink-600", id: "S6" },
  "Semester 7": { bg: "bg-indigo-100", text: "text-indigo-600", id: "S7" },
  "Semester 8": { bg: "bg-red-100", text: "text-red-600", id: "S8" },
  "Semester 9": { bg: "bg-teal-100", text: "text-teal-600", id: "S9" },
};

const FolderIcon = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const MoreIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

function semesterOrderValue(semester = {}) {
  const nameNumber = String(semester.semesterName || "").match(/\d+/);
  if (nameNumber) return Number(nameNumber[0]);
  const idNumber = Number(semester.semesterId);
  return Number.isFinite(idNumber) ? idNumber : Number.MAX_SAFE_INTEGER;
}

// CreateCourseModal.
// Normalized note.
function CreateCourseModal({
  allSemesters,
  userSubjectNames,
  onClose,
  onCreated,
}) {
  const [step, setStep] = useState(1);
  const [selectedSem, setSelectedSem] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const searchRef = useRef(null);

  // Normalized note.
  const availableSubjects = selectedSem
    ? (selectedSem.subjects ?? []).filter(
        (sub) => !userSubjectNames.includes(sub.subjectName),
      )
    : [];

  const filtered = availableSubjects.filter((sub) =>
    sub.subjectName.toLowerCase().includes(search.toLowerCase()),
  );

  function handleSelectSemester(sem) {
    setSelectedSem(sem);
    setSelectedSubject(null);
    setStep(2);
    setSearch("");
    setError("");
    setTimeout(() => searchRef.current?.focus(), 50);
  }

  async function handleCreate() {
    if (!selectedSubject) return;
    setError("");
    setCreating(true);
    try {
      // Normalized note.
      // Normalized note.
      await onCreated({
        semesterName: selectedSem.semesterName,
        subject: selectedSubject,
      });
    } catch (err) {
      setError(err.message || "Could not add this course. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-[480px] mx-4 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-gray-100">
          <div>
            {step === 2 && (
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedSem(null);
                }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 mb-1 transition-colors"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </button>
            )}
            <h2 className="text-xl font-black text-gray-900">
              {step === 1 ? "Select Semester" : "Add course"}
            </h2>
            {step === 2 && selectedSem?.semesterName && (
              <p className="text-xl font-black text-gray-900 mt-0.5">
                {selectedSem.semesterName}
              </p>
            )}
            <p className="text-sm text-gray-400 mt-0.5">
              {step === 1
                ? "Which semester does this course belong to?"
                : "Select a course to add to your Library"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors"
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

        {/* Body */}
        <div className="px-7 py-5">
          {step === 1 ? (
            <div className="flex flex-col gap-2">
              {allSemesters.map((sem) => {
                const badge = SEMESTER_BADGE[sem.semesterName] ?? {
                  bg: "bg-gray-100",
                  text: "text-gray-600",
                  id: "S?",
                };
                return (
                  <button
                    key={sem.semesterId}
                    onClick={() => handleSelectSemester(sem)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg ${badge.bg} ${badge.text} flex items-center justify-center text-xs font-bold flex-shrink-0`}
                    >
                      {badge.id}
                    </div>
                    <span className="text-sm font-semibold text-gray-800">
                      {sem.semesterName}
                    </span>
                    <span className="ml-auto text-xs text-gray-400">
                      {(sem.subjects ?? []).length} courses
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search course code..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-all mb-3"
              />
              {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
              <div className="max-h-64 overflow-y-auto flex flex-col gap-1">
                {filtered.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    {availableSubjects.length === 0
                      ? "All courses in this semester are already in your Library."
                      : "No courses match your search."}
                  </p>
                ) : (
                  filtered.map((sub) => {
                    const isSelected =
                      selectedSubject?.subjectId === sub.subjectId;
                    return (
                      <button
                        key={sub.subjectId}
                        onClick={() => setSelectedSubject(sub)}
                        disabled={creating}
                        className={
                          "flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-left transition-colors disabled:opacity-50 " +
                          (isSelected
                            ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-400"
                            : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-600")
                        }
                      >
                        <span
                          className={
                            isSelected ? "text-indigo-500" : "text-indigo-400"
                          }
                        >
                          <FolderIcon />
                        </span>
                        <span className="flex-1">{sub.subjectName}</span>
                        {isSelected && (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {step === 2 && availableSubjects.length > 0 && (
          <div className="flex justify-end gap-2 px-7 py-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!selectedSubject || creating}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Main page.
export default function StudentLibraryPage() {
  const navigate = useNavigate();

  // allSemesters: system semesters and subjects used by Create Course.
  const [allSemesters, setAllSemesters] = useState([]);
  // addedSubjects: subjects the user has added to Library.
  // Normalized note.
  const [addedSubjects, setAddedSubjects] = useState([]); // [{ subjectId, addedAt }]
  // docCounts: file count by subjectId, used for display only.
  const [docCounts, setDocCounts] = useState({});
  // docStorage: total bytes by subjectId, used before removing a subject.
  const [docStorage, setDocStorage] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  // actionMenu stores the active semester and menu step.
  const [actionMenu, setActionMenu] = useState(null);

  // Stats: totalFiles, totalStorage
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalStorageBytes, setTotalStorageBytes] = useState(0);
  const [maxStorageBytes, setMaxStorageBytes] = useState(1024 * 1024 * 1024);
  const userId = getCurrentUserId();

  useEffect(() => {
    // Normalized note.
    libraryApi
      .getOverview(userId)
      .then((overview) => {
        const semesters = Array.isArray(overview?.semesters)
          ? overview.semesters
          : [];
        const links = [];
        const counts = {};
        const storageBySubject = {};
        semesters.forEach((semester) => {
          (semester.subjects ?? []).forEach((subject) => {
            if (!subject.added) return;
            links.push({ subjectId: subject.subjectId });
            counts[subject.subjectId] = Number(subject.documentCount ?? 0);
            storageBySubject[subject.subjectId] = Number(
              subject.totalStorageBytes ?? 0,
            );
          });
        });

        setAllSemesters(semesters);
        setAddedSubjects(links);
        setDocCounts(counts);
        setDocStorage(storageBySubject);
        setTotalFiles(Number(overview?.totalFiles ?? 0));
        setTotalStorageBytes(Number(overview?.totalStorageBytes ?? 0));
        setMaxStorageBytes(Number(overview?.maxStorageBytes ?? 1024 * 1024 * 1024));
      })
      .catch(() => {
        setAllSemesters([]);
        setAddedSubjects([]);
        setDocCounts({});
        setDocStorage({});
        setTotalFiles(0);
        setTotalStorageBytes(0);
        setMaxStorageBytes(1024 * 1024 * 1024);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  // allSemesters: system semesters and subjects used by Create Course.
  const userSubjects = addedSubjects.map((link) => {
    let subjectName = null;
    let subjectCode = null;
    let semesterName = null;
    let semesterId = null;
    for (const sem of allSemesters) {
      const found = (sem.subjects ?? []).find(
        (s) => s.subjectId === link.subjectId,
      );
      if (found) {
        subjectName = found.subjectName;
        subjectCode = found.subjectCode || found.code || `SUB-${link.subjectId}`;
        semesterName = sem.semesterName;
        semesterId = sem.semesterId;
        break;
      }
    }
    return {
      subjectId: link.subjectId,
      subjectName,
      subjectCode: subjectCode || `SUB-${link.subjectId}`,
      semesterName,
      semesterId,
      docCount: docCounts[link.subjectId] ?? 0,
    };
  });

  const grouped = [...allSemesters]
    .map((sem) => {
      const subjects = userSubjects.filter((us) => us.semesterId === sem.semesterId);
      return {
        semesterName: sem.semesterName,
        semesterId: sem.semesterId,
        subjects,
      };
    })
    .filter((sem) => sem.subjects.length > 0)
    .sort((a, b) => semesterOrderValue(a) - semesterOrderValue(b));

  const totalCourses = userSubjects.length;
  const storageLabel = formatStorageBytes(totalStorageBytes);
  const maxStorageLabel = formatStorageBytes(maxStorageBytes);
  const storagePercent = Math.min(
    100,
    maxStorageBytes > 0 ? (totalStorageBytes / maxStorageBytes) * 100 : 0,
  ).toFixed(1);
  const userSubjectNames = userSubjects
    .map((us) => us.subjectName)
    .filter(Boolean);

  async function handleCourseCreated({ subject }) {
    try {
      await userSubjectApi.add(userId, subject.subjectId);
    } catch (err) {
      // 409 means the user already added this subject.
      // Normalized note.
      if (err.status !== 409) throw err;
    }
    setAddedSubjects((prev) =>
      prev.some((a) => a.subjectId === subject.subjectId)
        ? prev
        : [
            ...prev,
            { subjectId: subject.subjectId, addedAt: new Date().toISOString() },
          ],
    );
    setShowCreate(false);
    navigate("/student/library");
  }

  // Normalized note.
  function handleDeleteSubject(subject) {
    setActionMenu(null);
    setConfirmDialog({
      title: `Delete "${subject.subjectName}"?`,
      fileName: subject.subjectName,
      onConfirm: async () => {
        // Normalized note.
        // Normalized note.
        // Normalized note.
        await userSubjectApi.remove(userId, subject.subjectId);

        // Normalized note.
        setAddedSubjects((prev) =>
          prev.filter((a) => a.subjectId !== subject.subjectId),
        );
        setTotalFiles((prev) => prev - (docCounts[subject.subjectId] ?? 0));
        setTotalStorageBytes(
          (prev) => prev - (docStorage[subject.subjectId] ?? 0),
        );
        setDocCounts((prev) => {
          const { [subject.subjectId]: _, ...rest } = prev;
          return rest;
        });
        setDocStorage((prev) => {
          const { [subject.subjectId]: _, ...rest } = prev;
          return rest;
        });

        // Normalized note.
        setConfirmDialog(null);
      },
    });
  }

  return (
    <div className="p-7 bg-gray-50 min-h-screen">
      {actionMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setActionMenu(null)}
        />
      )}

      {confirmDialog && (
        <ConfirmDialog
          type="delete"
          title={confirmDialog.title}
          fileName={confirmDialog.fileName}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {showCreate && (
        <CreateCourseModal
          allSemesters={allSemesters}
          userSubjectNames={userSubjectNames}
          onClose={() => setShowCreate(false)}
          onCreated={handleCourseCreated}
        />
      )}

      <PageHeader
        title="Library"
        description="My courses organized by semester."
        action={
          <button
            onClick={() => setShowCreate(true)}
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create course
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4f46e5"
              strokeWidth="1.8"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div>
            <span className="text-xl font-black text-gray-900">
              {totalFiles}
            </span>
            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              FILES
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7c3aed"
              strokeWidth="1.8"
            >
              <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-gray-900">
                {storageLabel}
              </span>
              <span className="text-xl font-black text-gray-400">/ {maxStorageLabel}</span>
            </div>
            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              STORAGE USED
            </p>
            <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: storagePercent + "%" }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7c3aed"
              strokeWidth="1.8"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <span className="text-xl font-black text-gray-900">
              {totalCourses}
            </span>
            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              COURSES
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#b45309"
              strokeWidth="1.8"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <span className="text-xl font-black text-gray-900">0</span>
            <p className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
              GENERATED
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="grid grid-cols-[1fr_130px_100px_70px] px-5 py-3 bg-indigo-50 border-b border-indigo-100">
          <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
            SEMESTER &amp; COURSES
          </span>
          <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase text-center">
            COURSES
          </span>
          <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase text-center">
            FILES
          </span>
          <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase text-center">
            ACTION
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            Loading...
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mb-3 opacity-40"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-sm font-medium">No courses yet</p>
            <p className="text-xs mt-1">
              Click "Create course" to add your first course.
            </p>
          </div>
        ) : (
          grouped.map(({ semesterName, semesterId, subjects }, i) => {
            const badge = SEMESTER_BADGE[semesterName] ?? {
              bg: "bg-gray-100",
              text: "text-gray-600",
              id: "S?",
            };
            const isMenuOpen = actionMenu?.semesterId === semesterId;
            return (
              <div
                key={semesterName}
                className={
                  "grid grid-cols-[1fr_130px_100px_70px] px-5 py-5 items-center hover:bg-gray-50 transition-colors" +
                  (i < grouped.length - 1 ? " border-b border-gray-200" : "")
                }
              >
                <div className="flex gap-4 items-start pr-8">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${badge.bg} ${badge.text}`}
                  >
                    {badge.id}
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-black text-indigo-600 mb-2">
                      {semesterName}
                    </div>
                    {subjects.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">
                        No courses added yet.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(6, max-content)",
                          gap: "6px 20px",
                        }}
                      >
                        {subjects.map((us) => (
                          <a
                            key={us.subjectId}
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              navigate("/student/library/" + encodeURIComponent(us.subjectName), {
                                state: {
                                  subjectId: us.subjectId,
                                  subjectName: us.subjectName,
                                  subjectCode: us.subjectCode,
                                  semesterName
                                }
                              });
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline transition-colors"
                          >
                            <span className="text-indigo-400">
                              <FolderIcon />
                            </span>
                            {us.subjectCode || us.subjectName}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-center items-center border-l border-gray-200 self-stretch py-2">
                  <span className="text-xl font-black text-red-500">
                    {subjects.length}
                  </span>
                </div>

                <div className="flex justify-center items-center border-l border-gray-200 self-stretch py-2">
                  <span className="text-xl font-black text-red-500">
                    {subjects.reduce((sum, us) => sum + (us.docCount ?? 0), 0)}
                  </span>
                </div>

                <div className="relative flex justify-center items-center border-l border-gray-200 self-stretch py-2">
                  <button
                    onClick={() =>
                      setActionMenu(
                        isMenuOpen ? null : { semesterId, step: "root" },
                      )
                    }
                    disabled={subjects.length === 0}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <MoreIcon />
                  </button>

                  {isMenuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-10 z-50 w-48 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                    >
                      {actionMenu.step === "root" ? (
                        <button
                          onClick={() =>
                            setActionMenu({ semesterId, step: "subjects" })
                          }
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors text-left"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          </svg>
                          Delete
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() =>
                              setActionMenu({ semesterId, step: "root" })
                            }
                            className="w-full flex items-center gap-1 px-4 py-2 text-xs text-gray-400 hover:text-indigo-600 border-b border-gray-100 transition-colors"
                          >
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <polyline points="15 18 9 12 15 6" />
                            </svg>
                            Back
                          </button>
                          <div className="max-h-48 overflow-y-auto">
                            {subjects.map((us) => (
                              <button
                                key={us.subjectId}
                                onClick={() => handleDeleteSubject(us)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors text-left"
                              >
                                <span className="text-gray-400">
                                  <FolderIcon />
                                </span>
                                {us.subjectCode || us.subjectName}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}



