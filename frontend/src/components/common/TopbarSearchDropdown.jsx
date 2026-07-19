import { useMemo } from "react";

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

export default function TopbarSearchDropdown({
  query,
  courses = [],
  documents = [],
  onCourseClick,
  onFileClick,
  onClose,
}) {
  const q = normalize(query);

  const courseResults = useMemo(() => {
    if (!q) return [];
    return courses
      .filter((course) => {
        const code = normalize(course.code);
        const name = normalize(course.name);
        const semester = normalize(course.semester);
        return code.includes(q) || name.includes(q) || semester.includes(q);
      })
      .sort((a, b) => {
        const aCode = normalize(a.code);
        const bCode = normalize(b.code);
        const aName = normalize(a.name);
        const bName = normalize(b.name);
        const aScore = aCode.startsWith(q) ? 0 : aName.startsWith(q) ? 1 : 2;
        const bScore = bCode.startsWith(q) ? 0 : bName.startsWith(q) ? 1 : 2;
        return aScore - bScore || aCode.localeCompare(bCode);
      })
      .slice(0, 5);
  }, [courses, q]);

  const docResults = useMemo(() => {
    if (!q) return [];
    return documents
      .filter((document) => {
        const name = normalize(document.name);
        const title = normalize(document.title);
        const courseId = normalize(document.courseId);
        const courseName = normalize(document.courseName);
        return name.includes(q) || title.includes(q) || courseId.includes(q) || courseName.includes(q);
      })
      .sort((a, b) => {
        const aName = normalize(a.name || a.title);
        const bName = normalize(b.name || b.title);
        const aScore = aName.startsWith(q) ? 0 : 1;
        const bScore = bName.startsWith(q) ? 0 : 1;
        return aScore - bScore || aName.localeCompare(bName);
      })
      .slice(0, 5);
  }, [documents, q]);

  const hasResults = courseResults.length > 0 || docResults.length > 0;

  if (!q) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute left-0 top-12 z-50 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {!hasResults ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No results for <span className="font-semibold text-gray-600">"{query}"</span>
          </div>
        ) : (
          <>
            {courseResults.length > 0 && (
              <div className="px-5 pt-4 pb-2">
                <p className="text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">
                  Courses
                </p>
                {courseResults.map((course) => (
                  <button
                    key={`${course.code}-${course.semesterId}-${course.subjectId}`}
                    onClick={() => {
                      onCourseClick(course.routeValue || course.name || course.code, course.semester);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <FolderIcon />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {course.code}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {[course.name, course.semester].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {courseResults.length > 0 && docResults.length > 0 && (
              <div className="h-px bg-gray-100 mx-5" />
            )}

            {docResults.length > 0 && (
              <div className="px-5 pt-3 pb-4">
                <p className="text-[11px] font-black tracking-widest text-gray-400 uppercase mb-2">
                  Documents
                </p>
                {docResults.map((document) => (
                  <button
                    key={document.id}
                    onClick={() => {
                      onFileClick(document);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                      <DocumentIcon />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {document.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {[document.courseId || document.courseName, document.uploader].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
