import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { useState, useMemo, useEffect } from "react";
import { semesterApi } from "../../services/libraryApi";

// ── Badge config per semester ────────────────────────────────
const SEMESTER_BADGE = {
  "Semester 0": { bg: "bg-yellow-100", text: "text-yellow-700", id: "S0" },
  "Semester 1": { bg: "bg-cyan-100",   text: "text-cyan-600",   id: "S1" },
  "Semester 2": { bg: "bg-orange-100", text: "text-orange-500", id: "S2" },
  "Semester 3": { bg: "bg-green-100",  text: "text-green-600",  id: "S3" },
  "Semester 4": { bg: "bg-purple-100", text: "text-purple-600", id: "S4" },
  "Semester 5": { bg: "bg-blue-100",   text: "text-blue-600",   id: "S5" },
  "Semester 6": { bg: "bg-pink-100",   text: "text-pink-600",   id: "S6" },
  "Semester 7": { bg: "bg-indigo-100", text: "text-indigo-600", id: "S7" },
  "Semester 8": { bg: "bg-red-100",    text: "text-red-600",    id: "S8" },
  "Semester 9": { bg: "bg-teal-100",   text: "text-teal-600",   id: "S9" },
};

const getSemesterNumber = (semester) => {
  const match = String(semester?.semesterName ?? "").match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
};

const FolderIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" fill="currentColor" opacity="0.6" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

export default function StudentHomePage() {
  const navigate = useNavigate();
  const [selectedSemester, setSelectedSemester] = useState("All Semesters");

  // semesters: [{ semesterName, semesterId, subjects: [{ subjectId, subjectName, subjectCode }] }]
  const [semesters, setSemesters] = useState([]);
  // publicDocsBySemester: { semesterId: { totalFiles, recentDoc } }
  const [statsMap, setStatsMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    semesterApi.getAll().then((data) => {
      const sortedSemesters = [...data].sort(
        (a, b) => getSemesterNumber(a) - getSemesterNumber(b),
      );
      const nextStatsMap = {};

      sortedSemesters.forEach((sem) => {
        const subjects = Array.isArray(sem.subjects) ? sem.subjects : [];
        let totalFiles = 0;
        let recentDoc = null;

        subjects.forEach((sub) => {
          totalFiles += Number(sub.documentCount || 0);
          if (!sub.recentDocId) return;

          const candidate = {
            documentId: sub.recentDocId,
            subjectId: sub.subjectId,
            title: sub.recentDocTitle || sub.recentDocName || "Untitled document",
            documentName: sub.recentDocName,
            documentType: sub.recentDocType,
            uploadedAt: sub.recentDocUploadedAt,
            visibilityStatus: "PUBLIC",
          };

          if (
            !recentDoc ||
            new Date(candidate.uploadedAt || 0) > new Date(recentDoc.uploadedAt || 0)
          ) {
            recentDoc = candidate;
          }
        });

        nextStatsMap[sem.semesterId] = { totalFiles, recentDoc };
      });

      setSemesters(sortedSemesters);
      setStatsMap(nextStatsMap);
      setLoading(false);
      return;

      // Load public docs count + recent doc cho từng semester
      // Gọi getPublicBySubject cho từng subject rồi gộp lại theo semester
      sortedSemesters.forEach((sem) => {
        if (!sem.subjects || sem.subjects.length === 0) return;

        Promise.all(
          sem.subjects.map((sub) =>
            documentApi
              .getPublicBySubject(sub.subjectId)
              .catch(() => [])
          )
        ).then((results) => {
          let totalFiles = 0;
          let recentDoc = null;

          results.forEach((docs) => {
            totalFiles += docs.length;
            docs.forEach((doc) => {
              if (
                !recentDoc ||
                new Date(doc.uploadedAt) > new Date(recentDoc.uploadedAt)
              ) {
                recentDoc = doc;
              }
            });
          });

          setStatsMap((prev) => ({
            ...prev,
            [sem.semesterId]: { totalFiles, recentDoc },
          }));
        });
      });
    });
  }, []);

  const filtered = useMemo(() => {
    const visibleSemesters = selectedSemester === "All Semesters"
      ? semesters
      : semesters.filter((s) => s.semesterName === selectedSemester);

    return [...visibleSemesters].sort(
      (a, b) => getSemesterNumber(a) - getSemesterNumber(b),
    );
  }, [selectedSemester, semesters]);

  return (
    <div className="p-7 bg-gray-50 min-h-screen">
      <PageHeader
        title="Home"
        description="Browse all courses organized by semester"
        action={
          <div className="relative">
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 outline-none cursor-pointer focus:border-indigo-400 transition-all"
            >
              <option>All Semesters</option>
              {semesters.map((s) => (
                <option key={s.semesterId}>{s.semesterName}</option>
              ))}
            </select>
            <svg
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        }
      />

      <div className="bg-white border border-gray-200 rounded-xl">
        {/* Header row */}
        <div className="grid grid-cols-[1fr_130px_130px_350px] px-5 py-3 border-b border-indigo-100 bg-indigo-50">
          <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
            Semester &amp; Courses
          </span>
          <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase text-center block">
            Courses
          </span>
          <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase text-center block">
            Files
          </span>
          <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase pl-8">
            Recent File
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" className="mb-3 opacity-40">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <p className="text-sm font-medium">No courses found</p>
            <button
              onClick={() => setSelectedSemester("All Semesters")}
              className="mt-3 text-xs text-indigo-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filtered.map((sem, i) => {
            const badge = SEMESTER_BADGE[sem.semesterName] ?? {
              bg: "bg-gray-100", text: "text-gray-600",
              id: "S" + i,
            };
            const stats = statsMap[sem.semesterId];
            const subjects = sem.subjects ?? [];

            return (
              <div
                key={sem.semesterId}
                className={
                  "grid grid-cols-[1fr_130px_130px_350px] px-5 py-5 items-center hover:bg-gray-50 transition-colors" +
                  (i < filtered.length - 1 ? " border-b border-gray-200" : "")
                }
              >
                {/* Col 1 — Semester label + course list */}
                <div className="flex gap-4 items-start pr-12 text-left">
                  <div className={`w-11 h-11 rounded-xl ${badge.bg} ${badge.text} flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5`}>
                    {badge.id}
                  </div>
                  <div>
                    <div className="text-base font-black text-indigo-600 mb-2">
                      {sem.semesterName}
                    </div>
                    {subjects.length === 0 ? (
                      <span className="text-xs text-gray-400">No courses yet</span>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, max-content)", gap: "6px 20px" }}>
                        {subjects.map((sub) => (
                          <a
                            key={sub.subjectId}
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              navigate(`/student/courses/${sub.subjectName}`);
                            }}
                            title={sub.subjectName}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline transition-colors"
                          >
                            <span className="text-indigo-400"><FolderIcon /></span>
                            {sub.subjectCode || sub.subjectName}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Col 2 — Số courses */}
                <div className="w-full flex justify-center items-center border-l border-gray-200 self-stretch py-2">
                  <span className="text-xl font-black text-red-500">
                    {subjects.length}
                  </span>
                </div>

                {/* Col 3 — Số files PUBLIC */}
                <div className="w-full flex justify-center items-center border-l border-gray-200 self-stretch py-2">
                  <span className="text-xl font-black text-red-500">
                    {stats ? stats.totalFiles.toLocaleString() : "—"}
                  </span>
                </div>

                {/* Col 4 — Recent file */}
                <div className="flex items-center gap-2.5 pl-8 border-l border-gray-200 self-stretch py-2">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center flex-shrink-0">
                    <UserIcon />
                  </div>
                  {stats?.recentDoc ? (
                    <button
                      onClick={() =>
                        navigate("/student/documents/" + stats.recentDoc.documentId, {
                          state: { doc: stats.recentDoc },
                        })
                      }
                      className="flex flex-col text-left hover:opacity-70 transition-opacity"
                    >
                      <span className="text-sm font-bold text-indigo-600 leading-snug break-all hover:underline">
                        {stats.recentDoc.title}
                      </span>
                      <span className="text-xs text-gray-400 mt-0.5">
                        {new Date(stats.recentDoc.uploadedAt).toLocaleDateString("vi-VN")}
                      </span>
                    </button>
                  ) : (
                    <span className="text-sm font-bold text-gray-400 leading-snug">
                      No files yet
                    </span>
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
