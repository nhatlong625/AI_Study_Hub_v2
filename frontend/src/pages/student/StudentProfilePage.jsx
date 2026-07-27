import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { userService } from "../../services/userService";
import { documentApi, semesterApi } from "../../services/libraryApi";
import { userSubjectApi } from "../../services/libraryApi";

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 MB";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

function formatStudyTime(minutes) {
  if (!minutes || minutes === 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function PlanBadge({ plan }) {
  const colors = {
    Pro: "bg-purple-100 text-purple-700 border-purple-200",
    Plus: "bg-indigo-100 text-indigo-700 border-indigo-200",
    Basic: "bg-gray-100 text-gray-600 border-gray-200",
  };
  const cls = colors[plan] || colors.Basic;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${cls}`}
    >
      ★ {(plan || "Basic").toUpperCase()}
    </span>
  );
}

const ACHIEVEMENT_DEFS = [
  {
    id: "quick_learner",
    icon: "⭐",
    bg: "bg-purple-100",
    title: "Quick Learner",
    desc: "Complete 5 courses",
    check: ({ coursesCompleted }) => coursesCompleted >= 5,
  },
  {
    id: "quiz_master",
    icon: "🏆",
    bg: "bg-orange-100",
    title: "Quiz Master",
    desc: "Submit 10 practice tests",
    check: ({ attemptCount }) => attemptCount >= 10,
  },
  {
    id: "ai_explorer",
    icon: "🤖",
    bg: "bg-teal-100",
    title: "AI Explorer",
    desc: "Ask 20 AI questions",
    check: ({ chatMessageCount }) => chatMessageCount >= 20,
  },
  {
    id: "streak_7",
    icon: "🔥",
    bg: "bg-red-100",
    title: "7-Day Streak",
    desc: "Study 7 days in a row",
    check: ({ streakDays }) => streakDays >= 7,
  },
  {
    id: "uploader",
    icon: "📄",
    bg: "bg-blue-100",
    title: "Document Pro",
    desc: "Upload 10 documents",
    check: ({ docCount }) => docCount >= 10,
  },
];

export default function StudentProfilePage() {
  const navigate = useNavigate();
  const localUser = getCurrentUser();
  const userId = localUser.userId || localUser.id;

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [userSubjects, setUserSubjects] = useState([]);
  const [allSubjects, setAllSubjects] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    Promise.all([
      userService.getProfile(userId).catch(() => null),
      userService.getStats(userId).catch(() => null),
      documentApi.getByUser(userId).catch(() => []),
      userSubjectApi.getByUser(userId).catch(() => []),
      semesterApi.getAll().catch(() => []),
    ]).then(([prof, st, docs, subjects, semesters]) => {
      setProfile(prof);
      setStats(st);
      setDocuments(Array.isArray(docs) ? docs : []);
      setUserSubjects(Array.isArray(subjects) ? subjects : []);

      const map = {};
      if (Array.isArray(semesters)) {
        semesters.forEach((sem) => {
          (sem.subjects || []).forEach((sub) => {
            map[sub.subjectId] = { ...sub, semesterName: sem.semesterName };
          });
        });
      }
      setAllSubjects(map);
      setLoading(false);
    });
  }, [userId]);

  if (loading) {
    return (
      <div className="p-7 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading profile...</div>
      </div>
    );
  }

  const displayName =
    profile?.fullName || localUser.fullName || localUser.name || "Student";
  const displayEmail = profile?.email || localUser.email || "";
  const displayPlan = profile?.plan || localUser.plan || "Basic";
  const joinedAt = profile?.joinedAt || "";

  const streakDays = stats?.streakDays ?? 0;
  const studyTimeMinutes = stats?.studyTimeMinutes ?? 0;
  const coursesCompleted = stats?.coursesCompleted ?? 0;
  const xp = stats?.xp ?? 0;
  const level = stats?.level ?? 1;
  const xpForCurrentLevel = stats?.xpForCurrentLevel ?? 0;
  const xpForNextLevel = stats?.xpForNextLevel ?? 250;
  const usedBytes = stats?.usedStorageBytes ?? 0;
  const totalBytes = stats?.totalStorageBytes ?? 10 * 1024 * 1024 * 1024;
  const storagePercent =
    totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;

  const recentDocs = [...documents]
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    .slice(0, 4);

  const achievementData = {
    coursesCompleted,
    attemptCount: Math.round(
      (xp - documents.length * 50 - ((stats?.studyTimeMinutes ?? 0) / 3) * 20) /
        100,
    ),
    chatMessageCount: Math.round((stats?.studyTimeMinutes ?? 0) / 3),
    docCount: documents.length,
    streakDays,
  };
  const earned = ACHIEVEMENT_DEFS.filter((a) => a.check(achievementData));

  const coursesInProgress = userSubjects
    .map((us) => {
      const sub = allSubjects[us.subjectId];
      if (!sub) return null;
      const subDocs = documents.filter((d) => d.subjectId === us.subjectId);
      const progress = Math.min(100, subDocs.length * 15);
      return {
        subjectId: us.subjectId,
        name: sub.subjectCode || sub.subjectName || `Subject ${us.subjectId}`,
        fullName: sub.subjectName,
        progress,
        lastDoc: subDocs.sort(
          (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt),
        )[0],
      };
    })
    .filter(Boolean)
    .slice(0, 3);

  const COURSE_COLORS = [
    "bg-indigo-100 text-indigo-600",
    "bg-green-100 text-green-600",
    "bg-orange-100 text-orange-600",
  ];
  const PROGRESS_COLORS = ["bg-indigo-500", "bg-green-500", "bg-orange-400"];

  function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 3600) return `${Math.round(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.round(diff / 86400)} days ago`;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="p-7 bg-gray-50 min-h-screen">
      {/* ── Header card ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          {/* Avatar + info */}
          <div className="flex items-center gap-4 flex-1">
            <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-black text-indigo-600 select-none overflow-hidden">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                getInitials(displayName)
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-gray-900">
                  {displayName}
                </h1>
                <PlanBadge plan={displayPlan} />
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{displayEmail}</p>
              {joinedAt && (
                <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Joined {joinedAt}
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center">
                  <span className="text-2xl font-black text-gray-900">
                    {streakDays}
                  </span>
                  <span className="text-lg">🔥</span>
                </div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mt-0.5">
                  Days Streak
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center">
                  <span className="text-lg">⏱</span>
                  <span className="text-2xl font-black text-gray-900">
                    {formatStudyTime(studyTimeMinutes)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mt-0.5">
                  Study Time
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center">
                  <span className="text-lg">📚</span>
                  <span className="text-2xl font-black text-gray-900">
                    {coursesCompleted}
                  </span>
                </div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mt-0.5">
                  Courses
                </p>
              </div>
            </div>

            {/* XP bar */}
            <div className="flex items-center gap-3 w-full lg:w-72">
              <span className="text-sm font-bold text-gray-700 shrink-0">
                Lv. {level}
              </span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {xp} / {xpForNextLevel} XP
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* Storage */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900">
                Storage Capacity
              </h2>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${storagePercent >= 80 ? "bg-red-100 text-red-600" : "bg-indigo-100 text-indigo-600"}`}
              >
                {storagePercent}% Used
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-900">
                {formatBytes(usedBytes)}{" "}
                <span className="text-indigo-500">
                  / {formatBytes(totalBytes)}
                </span>
              </span>
              <button
                onClick={() => navigate("/student/settings?tab=billing")}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                Upgradable to 50 GB
              </button>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${storagePercent >= 80 ? "bg-red-400" : "bg-indigo-500"}`}
                style={{ width: `${storagePercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Your storage is used for uploaded documents and study materials.
            </p>
          </div>

          {/* Courses In Progress */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900">
                Courses In Progress
              </h2>
              <button
                onClick={() => navigate("/student/library")}
                className="text-sm font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                See all courses →
              </button>
            </div>

            {coursesInProgress.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No courses yet.{" "}
                <button
                  onClick={() => navigate("/student/library")}
                  className="text-indigo-500 hover:underline font-semibold"
                >
                  Browse library
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {coursesInProgress.map((course, i) => (
                  <div key={course.subjectId}>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${COURSE_COLORS[i % COURSE_COLORS.length]}`}
                      >
                        {course.name.slice(0, 3)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-900 truncate">
                            {course.name}
                          </span>
                          <span className="text-sm font-bold text-gray-500 ml-2 shrink-0">
                            {course.progress}%
                          </span>
                        </div>
                        {course.lastDoc && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            Last: {course.lastDoc.title}
                          </p>
                        )}
                      </div>
                    </div>
                    <div
                      className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden"
                      style={{ marginLeft: "52px" }}
                    >
                      <div
                        className={`h-full rounded-full ${PROGRESS_COLORS[i % PROGRESS_COLORS.length]}`}
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {/* Achievements */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900">Achievements</h2>
              <button
                onClick={() => navigate("/student/settings")}
                className="text-sm font-bold text-indigo-600 hover:underline"
              >
                View all
              </button>
            </div>

            {earned.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Complete actions to earn achievements!
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {earned.slice(0, 4).map((a) => (
                  <div key={a.id} className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${a.bg}`}
                    >
                      {a.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">
                        {a.title}
                      </p>
                      <p className="text-xs text-gray-400">{a.desc}</p>
                    </div>
                    <span className="text-xs text-indigo-500 font-semibold shrink-0">
                      ✓
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900">
                Recent Activity
              </h2>
              <button
                onClick={() => navigate("/student/library")}
                className="text-sm font-bold text-indigo-600 hover:underline"
              >
                View all
              </button>
            </div>

            {recentDocs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No activity yet.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {recentDocs.map((doc) => (
                  <div key={doc.documentId} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        Uploaded "{doc.title}"
                      </p>
                      <p className="text-xs text-gray-400">
                        {timeAgo(doc.uploadedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
