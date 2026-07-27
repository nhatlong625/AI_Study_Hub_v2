import { useState, useRef } from "react";

import { semesterApi } from "../../services/libraryApi";
// semesters loaded từ API trong component


// TODO: Kết nối API khi backend sẵn sàng:
// import { semesterApi, subjectApi } from "../../services/libraryApi";

const ALL_SEMESTER_NAMES = [
  "Semester 0","Semester 1","Semester 2","Semester 3","Semester 4",
  "Semester 5","Semester 6","Semester 7","Semester 8","Semester 9",
];

export default function CourseUploadModal({
  courseId,
  onClose,
  onUpload,
  onCreated,
  mode = "upload",
}) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(courseId || "");
  const [selectedSemesterForCourse, setSelectedSemesterForCourse] = useState("");
  const [selectedCourseCode, setSelectedCourseCode] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const isLocked = Boolean(courseId && courseId !== "Library");
  const semesterObj = semesters.find((s) => s.label === selectedSemester);
  const courseOptions = semesterObj ? semesterObj.courses : [];

  // Course options cho semester đã chọn trong createCourse mode
  const createCourseSemObj = semesters.find((s) => s.label === selectedSemesterForCourse);
  const createCourseOptions = createCourseSemObj ? createCourseSemObj.courses : [];



  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    onUpload?.({ file: selectedFile, course: selectedCourse, semester: selectedSemester });
    onClose();
  };

  const handleCreateCourse = () => {
    if (!selectedSemesterForCourse) {
      setError("Please select a semester.");
      return;
    }
    if (!selectedCourseCode) {
      setError("Please select a course.");
      return;
    }

    onCreated?.({ semesterName: selectedSemesterForCourse, courseCode: selectedCourseCode });
    onClose();
  };

  const canUpload = selectedFile && (isLocked ? true : selectedCourse);

  // ── Mode: Create course ──────────────────────────────────────────────────
  if (mode === "createCourse") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl w-full max-w-[440px] mx-4 shadow-2xl overflow-hidden">
          <div className="flex items-start justify-between px-7 pt-7 pb-5 border-b border-gray-100">
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Create course</h2>
              <p className="text-sm text-gray-400">Add a course to one of your semesters.</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors mt-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-7 py-6 flex flex-col gap-4">
            {/* Semester picker */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-800">Semester</label>
              <select
                value={selectedSemesterForCourse}
                onChange={(e) => {
                  setSelectedSemesterForCourse(e.target.value);
                  setSelectedCourseCode("");
                  setError("");
                }}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-all bg-white"
              >
                <option value="">Select semester...</option>
                {ALL_SEMESTER_NAMES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Course picker */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-800">Course Code</label>
              <select
                value={selectedCourseCode}
                onChange={(e) => { setSelectedCourseCode(e.target.value); setError(""); }}
                disabled={!selectedSemesterForCourse}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 transition-all bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select course...</option>
                {createCourseOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 px-7 py-5 bg-gray-50 border-t border-gray-100">
            <button onClick={onClose} className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors px-3 py-2">
              Cancel
            </button>
            <button
              onClick={handleCreateCourse}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-full transition-colors"
            >
              Create
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Mode: Upload ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl w-full max-w-[540px] mx-4 shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between px-7 pt-7 pb-5 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">Add Document</h2>
            <p className="text-sm text-gray-400">
              {isLocked ? `Add new resources to ${courseId}` : "Add a document to your library"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors mt-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-7 py-6 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={"border-2 border-dashed rounded-2xl py-9 px-6 flex flex-col items-center gap-3 cursor-pointer transition-all " + (dragOver ? "border-indigo-400 bg-indigo-50" : "border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-300")}
          >
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <polyline points="9 15 12 12 15 15" />
              </svg>
            </div>
            {selectedFile ? (
              <div className="text-center">
                <p className="text-sm font-bold text-indigo-700">{selectedFile.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <>
                <p className="text-[15px] font-semibold text-gray-800 text-center">
                  Drag and drop files here or{" "}
                  <span className="text-indigo-600 underline underline-offset-2">click to browse</span>
                </p>
                <p className="text-sm text-gray-400 text-center">PDF, DOCX, PPTX, PNG, JPG (Max 50MB)</p>
              </>
            )}
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg" onChange={handleFileChange} />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-gray-800">Course Access</label>
            {isLocked ? (
              <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50">
                <span className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-lg">{courseId}</span>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={selectedSemester}
                  onChange={(e) => { setSelectedSemester(e.target.value); setSelectedCourse(""); }}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 bg-white transition-all"
                >
                  <option value="">Select semester...</option>
                  {semesters.map((s) => (
                    <option key={s.id} value={s.label}>{s.label}</option>
                  ))}
                </select>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  disabled={!selectedSemester}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select course...</option>
                  {courseOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3 border-l-4 border-indigo-500 pl-4 py-1">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4338ca" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                </svg>
                <span className="text-xs font-bold tracking-widest text-indigo-700 uppercase">AI Suggestion</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                AI will automatically generate tags and a study summary for this document once uploaded to help other students find it easily.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 px-7 py-5 bg-gray-50 border-t border-gray-100">
          <button onClick={onClose} className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors px-3 py-2">Cancel</button>
          <button
            onClick={handleUpload}
            disabled={!canUpload}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-full transition-colors"
          >
            Upload
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
