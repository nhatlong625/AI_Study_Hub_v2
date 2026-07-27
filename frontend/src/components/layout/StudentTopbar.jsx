import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarSearchDropdown from "../common/TopbarSearchDropdown";
import NotificationPanel from "../common/NotificationPanel";
import useUnreadNotifications from "../../hooks/useUnreadNotifications";
import logoImg from "../../assets/logos/logo.png";
import { userService } from "../../services/userService";
import { documentApi, semesterApi } from "../../services/libraryApi";
import { getDefaultAiUserId } from "../../services/aiChatService";

function normalizePlan(plan) {
  const raw = String(plan || "Basic").trim();
  if (!raw) return "Basic";
  const normalized = raw.toLowerCase();
  if (normalized === "basic") return "Basic";
  if (normalized === "plus") return "Plus";
  if (normalized === "pro") return "Pro";
  // Gói admin tự tạo (vd "NQS") giữ nguyên tên đã lưu thay vì ép về "Basic".
  return raw;
}

function getCurrentUser() {
  try {
    const stored = JSON.parse(localStorage.getItem("user") || "{}");
    return {
      userId: stored.userId || stored.id,
      name: stored.fullName || stored.name || "Student",
      role: stored.role === "ADMIN" ? "Super Admin" : normalizePlan(stored.plan),
      streakDays: stored.streakDays || 0,
    };
  } catch {
    return { userId: null, name: "Student", role: "Basic", streakDays: 0 };
  }
}

const SearchWrapper = ({ children }) => (
  <div
    style={{
      position: "relative",
      display: "flex",
      alignItems: "center",
      width: "480px",
    }}
  >
    <svg
      style={{
        position: "absolute",
        left: "20px",
        color: "#8c8a9e",
        pointerEvents: "none",
      }}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
    {children}
  </div>
);

function StudentTopbar({ isAdmin = false, onCourseClick, onFileClick }) {
  const topbarClass =
    "sticky top-0 z-10 flex items-center justify-between gap-5 px-7 py-4 bg-white border-b border-[#f1eff5]";

  const [query, setQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const { hasUnread, setUnreadCount } = useUnreadNotifications();
  const [currentUser, setCurrentUser] = useState(getCurrentUser);
  const [searchCourses, setSearchCourses] = useState([]);
  const [searchDocuments, setSearchDocuments] = useState([]);

  useEffect(() => {
    if (isAdmin || !currentUser.userId) return;

    let cancelled = false;
    userService.getPlan(currentUser.userId)
      .then(({ plan }) => {
        if (cancelled) return;
        const displayPlan = normalizePlan(plan);
        setCurrentUser((user) => ({ ...user, role: displayPlan }));
        try {
          const stored = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem("user", JSON.stringify({ ...stored, plan: displayPlan }));
        } catch {
          // Ignore malformed localStorage; the topbar already has the fetched plan.
        }
      })
      .catch(() => {
        setCurrentUser((user) => ({ ...user, role: normalizePlan(user.role) }));
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser.userId, isAdmin]);

  useEffect(() => {
    if (isAdmin) return;

    let cancelled = false;
    semesterApi.getAll()
      .then((semesters) => {
        if (cancelled) return;
        const courses = Array.isArray(semesters)
          ? semesters.flatMap((semester) => {
              const subjects = Array.isArray(semester.subjects) ? semester.subjects : [];
              return subjects.map((subject) => {
                const subjectName = subject.subjectName || subject.subject_name || "";
                const subjectCode = subject.subjectCode || subject.subject_code || subjectName;
                return {
                  subjectId: subject.subjectId || subject.subject_id,
                  semesterId: semester.semesterId || semester.semester_id,
                  code: subjectCode,
                  name: subjectName,
                  semester: semester.semesterName || semester.semester_name || semester.label || "",
                  routeValue: subjectName || subjectCode,
                };
              });
            })
          : [];
        setSearchCourses(courses);
      })
      .catch(() => {
        if (!cancelled) setSearchCourses([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) return;

    let cancelled = false;
    const userId = currentUser.userId || getDefaultAiUserId();
    documentApi.getByUser(userId)
      .then((documents) => {
        if (cancelled) return;
        const mappedDocuments = Array.isArray(documents)
          ? documents.map((document) => ({
              ...document,
              id: document.documentId || document.document_id,
              name: document.title || document.documentName || document.document_name || "Untitled document",
              title: document.title,
              courseId: document.subjectCode || document.subject_code || document.subjectName || document.subject_name || "",
              courseName: document.subjectName || document.subject_name || "",
              uploader: document.uploaderName || document.uploader_name || document.ownerName || document.owner_name || "",
            }))
          : [];
        setSearchDocuments(mappedDocuments);
      })
      .catch(() => {
        if (!cancelled) setSearchDocuments([]);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser.userId, isAdmin]);

  if (isAdmin) {
    return (
      <header className={topbarClass}>
        <SearchWrapper>
          <input
            type="text"
            placeholder="Search users, documents, or settings..."
            style={{
              width: "100%",
              padding: "12px 20px 12px 48px",
              border: "none",
              borderRadius: "9999px",
              backgroundColor: "#f1f3f9",
              color: "#1a1926",
              fontSize: "13px",
              outline: "none",
              transition: "all 0.2s ease",
            }}
          />
        </SearchWrapper>

        <div className="flex items-center gap-6">
          <NotificationButton />
          <ProfileSection name="Admin" role="Super Admin" />
        </div>
      </header>
    );
  }

  return (
    <header className={topbarClass}>
      <SearchWrapper>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses, documents..."
          style={{
            width: "100%",
            padding: "12px 20px 12px 48px",
            border: "none",
            borderRadius: "9999px",
            backgroundColor: "#f1f3f9",
            color: "#1a1926",
            fontSize: "13px",
            outline: "none",
            transition: "all 0.2s ease",
          }}
        />
        {query.trim().length > 0 && (
          <TopbarSearchDropdown
            query={query}
            courses={searchCourses}
            documents={searchDocuments}
            onCourseClick={onCourseClick}
            onFileClick={onFileClick}
            onClose={() => setQuery("")}
          />
        )}
      </SearchWrapper>

      <div className="flex items-center gap-5" style={{ gap: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)",
            border: "1px solid rgba(251, 140, 0, 0.3)",
            color: "#e65100",
            padding: "6px 14px",
            borderRadius: "24px",
            fontWeight: "800",
            fontSize: "15px",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(251, 140, 0, 0.15)",
            whiteSpace: "nowrap",
            animation: "fire-glow 2s infinite ease-in-out",
            transition:
              "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          }}
        >
          <svg
            style={{
              animation: "fire-flicker 1.2s infinite alternate ease-in-out",
              transformOrigin: "bottom center",
              color: "#ea580c",
              filter: "drop-shadow(0 0 3px rgba(234,88,12,0.6))",
            }}
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
          </svg>
          {currentUser.streakDays} Days
        </div>

        <div className="relative">
          <button
            onClick={() => setShowNotifications((v) => !v)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px",
              borderRadius: "50%",
            }}
            type="button"
            aria-label="Notifications"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#474554"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </button>
          {hasUnread && (
            <span
              style={{
                position: "absolute",
                top: "6px",
                right: "6px",
                width: "8px",
                height: "8px",
                backgroundColor: "#e1261c",
                borderRadius: "50%",
                border: "1.5px solid #ffffff",
                pointerEvents: "none",
              }}
            />
          )}
          {showNotifications && (
            <NotificationPanel
              onClose={() => setShowNotifications(false)}
              onUnreadChange={setUnreadCount}
            />
          )}
        </div>

        <ProfileSection name={currentUser.name} role={currentUser.role} />
      </div>
    </header>
  );
}

function NotificationButton() {
  const [showNotifications, setShowNotifications] = useState(false);
  const { hasUnread, setUnreadCount } = useUnreadNotifications();

  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications((v) => !v)}
        className="relative p-1.5 flex items-center justify-center rounded-full text-[#4a4857] bg-transparent border-none cursor-pointer hover:bg-[#f5f4f8] transition-colors"
        type="button"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full border-[1.5px] border-white" />
        )}
      </button>
      {showNotifications && (
        <NotificationPanel
          onClose={() => setShowNotifications(false)}
          onUnreadChange={setUnreadCount}
        />
      )}
    </div>
  );
}

function ProfileSection({ name, role }) {
  const [showMenu, setShowMenu] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("rememberMe");
    sessionStorage.clear();
    setShowMenu(false);
    navigate("/login", { replace: true });
  };

  return (
    <div ref={profileRef} className="relative">
      <button
        type="button"
        onClick={() => setShowMenu((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={showMenu}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "4px 12px 4px 4px",
          border: "none",
          borderRadius: "999px",
          background: showMenu ? "#f7f5ff" : "transparent",
          cursor: "pointer",
          transition: "background 0.18s ease",
        }}
      >
        <div className="w-9 h-9 rounded-full bg-[#f0edff] border border-[#ece7f5] flex items-center justify-center overflow-hidden">
          <img
            src={logoImg}
            alt="Avatar"
            className="w-4/5 h-4/5 object-contain"
          />
        </div>
        <div className="flex flex-col leading-snug text-left">
          <span className="text-[13px] font-bold text-[#1a1926]">{name}</span>
          <span className="text-[11px] font-medium text-[#8c8a9e]">{role}</span>
        </div>
      </button>

      {showMenu && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: "184px",
            padding: "8px",
            background: "#ffffff",
            border: "1px solid #ece7f5",
            borderRadius: "14px",
            boxShadow: "0 18px 45px rgba(35, 31, 64, 0.14)",
            zIndex: 40,
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              border: "none",
              borderRadius: "10px",
              background: "transparent",
              color: "#dc2626",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default StudentTopbar;
