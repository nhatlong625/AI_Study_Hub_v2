import { useOutletContext, useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import { useState, useMemo, useEffect } from "react";
import { semesterApi } from "../../services/libraryApi";
import MajorSelector from "../../components/student/MajorSelector";
import SemesterSelector, { ALL_SEMESTERS } from "../../components/student/SemesterSelector";

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
  const outletCtx = useOutletContext() || {};
  const selectedMajorId = outletCtx.selectedMajorId;
  const [selectedSemester, setSelectedSemester] = useState(ALL_SEMESTERS);

  // semesters: các kỳ đã gộp theo tên — [{ semesterName, subjects: [{ subjectId, subjectName, subjectCode }] }]
  const [semesters, setSemesters] = useState([]);
  // statsMap: { semesterName: { totalFiles, recentDoc } }
  const [statsMap, setStatsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    semesterApi.getAll(selectedMajorId).then((data) => {
      const sortedSemesters = [...(Array.isArray(data) ? data : [])].sort(
        (a, b) => getSemesterNumber(a) - getSemesterNumber(b),
      );
      // Mỗi ngành có bản ghi học kỳ riêng, nên "Semester 1" tồn tại một lần cho
      // mỗi ngành. Ở chế độ All Majors mà đổ thẳng ra thì bảng hiện 7 dòng giống
      // hệt nhau, không phân biệt được. Gộp lại theo TÊN kỳ — đúng với cách bộ lọc
      // Semester bên cạnh vẫn hiểu về học kỳ.
      const groups = [];
      const groupByName = new Map();

      sortedSemesters.forEach((sem) => {
        let group = groupByName.get(sem.semesterName);
        if (!group) {
          group = { semesterName: sem.semesterName, subjects: [], seenSubjectIds: new Set() };
          groupByName.set(sem.semesterName, group);
          groups.push(group);
        }
        // Nhiều môn đại cương dùng chung tới 6 ngành. Không khử trùng thì môn đó
        // hiện 6 lần trong cùng một dòng và cột Files cộng file của nó 6 lượt.
        (Array.isArray(sem.subjects) ? sem.subjects : []).forEach((sub) => {
          if (group.seenSubjectIds.has(sub.subjectId)) return;
          group.seenSubjectIds.add(sub.subjectId);
          group.subjects.push(sub);
        });
      });

      const nextStatsMap = {};
      groups.forEach((group) => {
        let totalFiles = 0;
        let recentDoc = null;

        group.subjects.forEach((sub) => {
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

        nextStatsMap[group.semesterName] = { totalFiles, recentDoc };
      });

      setSemesters(groups);
      setStatsMap(nextStatsMap);
      setLoading(false);
    }).catch((err) => {
      // Không để lỗi (401 hết hạn token, mất mạng...) làm kẹt trạng thái loading,
      // vì khi đó trang chỉ hiện "Loading..." vĩnh viễn trông như bị trắng.
      setSemesters([]);
      setStatsMap({});
      setLoadError(err?.message || "Could not load semesters. Please try again.");
      setLoading(false);
    });
  }, [selectedMajorId]);

  // Không cần lọc Semester 0 ở đây nữa: nó đã là học kỳ của ngành "Preparation"
  // nên dữ liệu tự cho ra đúng hành vi — All Majors thì thấy, lọc một chuyên ngành
  // thì không, lọc Preparation thì chỉ còn nó. Lọc thêm ở đây sẽ làm ngành
  // Preparation ra bảng trống.
  const availableSemesters = useMemo(
    () => [...semesters].sort((a, b) => getSemesterNumber(a) - getSemesterNumber(b)),
    [semesters],
  );

  // Đang chọn Semester 0 rồi mới chuyển sang lọc ngành thì kỳ đó biến mất, bộ lọc
  // treo lại một giá trị không còn tồn tại và bảng trống trơn dù ngành có đầy môn.
  useEffect(() => {
    // availableSemesters rỗng nghĩa là đang tải dở, chưa đủ căn cứ để bỏ lựa chọn.
    if (selectedSemester === ALL_SEMESTERS || availableSemesters.length === 0) return;
    if (!availableSemesters.some((s) => s.semesterName === selectedSemester)) {
      setSelectedSemester(ALL_SEMESTERS);
    }
  }, [availableSemesters, selectedSemester]);

  const filtered = useMemo(() => {
    if (selectedSemester === ALL_SEMESTERS) return availableSemesters;
    return availableSemesters.filter((s) => s.semesterName === selectedSemester);
  }, [selectedSemester, availableSemesters]);

  return (
    <div className="p-7 bg-gray-50">
      <PageHeader
        title="Home"
        description="Browse all courses organized by semester"
        action={
          <div className="flex items-center gap-2.5">
            {/* Bộ lọc ngành nằm ngay tại Home vì nó chỉ ảnh hưởng trang này.
                Đặt ở topbar toàn cục khiến người dùng tưởng nó lọc cả app. */}
            <MajorSelector
              selectedMajorId={selectedMajorId}
              onSelectMajor={(majorId) => outletCtx.setSelectedMajorId?.(majorId)}
            />
            <SemesterSelector
              selectedSemester={selectedSemester}
              onSelectSemester={setSelectedSemester}
              semesters={availableSemesters}
            />
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
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" className="mb-3 opacity-40">
              <circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16h.01" />
            </svg>
            <p className="text-sm font-medium">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 text-xs text-indigo-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" className="mb-3 opacity-40">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <p className="text-sm font-medium">No courses found</p>
            <button
              onClick={() => setSelectedSemester(ALL_SEMESTERS)}
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
            const stats = statsMap[sem.semesterName];
            const subjects = sem.subjects ?? [];

            return (
              <div
                key={sem.semesterName}
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
