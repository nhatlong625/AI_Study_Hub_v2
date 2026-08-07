import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { userService } from "../../services/userService";
import MajorSelector from "../../components/student/MajorSelector";
import PlanBadge from "../../components/common/PlanBadge";
import { libraryApi, userSubjectApi } from "../../services/libraryApi";
import {
  formatStorageBytes,
  storagePercentOf,
} from "../../utils/formatStorage";
import UserAvatar from "../../components/common/UserAvatar";
import EditProfileModal from "../../components/student/EditProfileModal";

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function formatStudyTime(minutes) {
  if (!minutes || minutes === 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Icon + màu theo loại hoạt động UserActivityService trả về.
const ACTIVITY_STYLES = {
  upload: {
    bg: "bg-blue-50",
    stroke: "#3b82f6",
    icon: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </>
    ),
  },
  read: {
    bg: "bg-amber-50",
    stroke: "#f59e0b",
    icon: (
      <>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </>
    ),
  },
  read_done: {
    bg: "bg-green-50",
    stroke: "#22c55e",
    icon: (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </>
    ),
  },
  quiz: {
    bg: "bg-purple-50",
    stroke: "#a855f7",
    icon: (
      <>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>
    ),
  },
  chat: {
    bg: "bg-indigo-50",
    stroke: "#6366f1",
    icon: (
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    ),
  },
};

function activityLabel(activity) {
  const title = activity.title || "Untitled";
  switch (activity.type) {
    case "read":
      return `Read "${title}"`;
    case "read_done":
      return `Finished reading "${title}"`;
    case "quiz":
      return activity.detail
        ? `Completed quiz "${title}" — ${activity.detail}`
        : `Completed quiz "${title}"`;
    case "chat":
      return `Asked AI about "${title}"`;
    default:
      return `Uploaded "${title}"`;
  }
}

/**
 * Xác nhận trước khi đổi ngành. Nêu rõ ngành cũ → ngành mới và hệ quả, vì đây là
 * thay đổi lâu dài chứ không phải bộ lọc: nó thay toàn bộ nội dung trang Home.
 */
function MajorChangeConfirmModal({ fromName, toName, saving, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
      onClick={saving ? undefined : onCancel}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[440px] mx-4 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center px-7 pt-8 pb-6 text-center">
          <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-2">
            Change your major?
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            From <span className="font-semibold text-gray-700">{fromName || "no major"}</span>{" "}
            to <span className="font-semibold text-gray-700">{toName}</span>.
          </p>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Home will show the semesters and courses of the new major. Courses
            already in your Library stay where they are.
          </p>
        </div>

        <div className="flex items-center gap-3 px-7 pb-7">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors"
          >
            {saving ? "Saving..." : "Change major"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StudentProfilePage() {
  const navigate = useNavigate();
  const localUser = getCurrentUser();
  const userId = localUser.userId || localUser.id;

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [userSubjects, setUserSubjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [majorSaving, setMajorSaving] = useState(false);
  const [majorError, setMajorError] = useState("");
  const [majors, setMajors] = useState([]);
  // Ngành người dùng vừa chọn, đang chờ xác nhận trong modal.
  const [pendingMajorId, setPendingMajorId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const outletCtx = useOutletContext() || {};

  // Fallback khi danh sách ngành tải lỗi: vẫn xác nhận được, chỉ không nêu được tên.
  const pendingMajorName =
    majors.find((m) => m.majorId === pendingMajorId)?.majorName ||
    "the selected major";

  /**
   * Đổi ngành thật (ghi DB), khác dropdown lọc ở Home vốn chỉ đổi danh sách đang xem.
   * Chỉ chạy sau khi người dùng xác nhận: đổi ngành thay toàn bộ nội dung Home, và
   * nếu sau này có cooldown thì một cú bấm nhầm sẽ khoá lại rất lâu.
   * Bỏ qua "All Majors" (majorId null) vì ngành là bắt buộc — BE cũng từ chối null.
   */
  async function handleChangeMajor(majorId) {
    if (!majorId || majorId === profile?.majorId) return;
    setMajorSaving(true);
    setMajorError("");
    try {
      const res = await userService.updateMyMajor(majorId);
      setProfile((prev) =>
        prev ? { ...prev, majorId, majorName: res.majorName } : prev,
      );
      // Đồng bộ luôn bộ lọc đang dùng ở Home.
      outletCtx.setSelectedMajorId?.(majorId);
      setPendingMajorId(null);
    } catch (err) {
      setMajorError(err.message || "Could not change your major.");
      setPendingMajorId(null);
    } finally {
      setMajorSaving(false);
    }
  }

  useEffect(() => {
    if (!userId) return;

    Promise.all([
      userService.getProfile(userId).catch(() => null),
      userService.getStats(userId).catch(() => null),
      userSubjectApi.getByUser(userId).catch(() => []),
      userService.getActivity(userId, 8).catch(() => []),
      // Cần danh sách ngành để hộp xác nhận nêu được tên ngành sắp đổi sang.
      libraryApi.getMajors().catch(() => []),
    ]).then(([prof, st, subjects, acts, majorList]) => {
      setProfile(prof);
      setStats(st);
      setMajors(Array.isArray(majorList) ? majorList : []);
      setUserSubjects(Array.isArray(subjects) ? subjects : []);
      setActivities(Array.isArray(acts) ? acts : []);
      setLoading(false);
    });
  }, [userId]);

  if (loading) {
    return (
      <div className="p-10 text-center text-gray-400 text-sm bg-gray-50">
        Loading profile...
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
  const usedBytes = stats?.usedStorageBytes ?? 0;
  // Khớp với PlanQuotaService.DEFAULT_MAX_STORAGE_MB (1024 MB) khi API stats lỗi.
  const totalBytes = stats?.totalStorageBytes ?? 1024 * 1024 * 1024;
  const storagePercent = storagePercentOf(usedBytes, totalBytes);

  // userSubjects đã được backend sắp mới-add-trước, nên 3 phần tử đầu là 3 môn gần đây nhất.
  const coursesInProgress = userSubjects.slice(0, 3).map((us) => {
    const total = us.documentCount ?? 0;
    const studied = us.studiedDocumentCount ?? 0;
    return {
      subjectId: us.subjectId,
      name: us.subjectCode || us.subjectName || `Subject ${us.subjectId}`,
      fullName: us.subjectName,
      total,
      studied,
      progress: total > 0 ? Math.round((studied / total) * 100) : 0,
      lastStudiedAt: us.lastStudiedAt,
    };
  });

  const COURSE_COLORS = [
    "bg-indigo-100 text-indigo-600",
    "bg-green-100 text-green-600",
    "bg-orange-100 text-orange-600",
  ];
  const PROGRESS_COLORS = ["bg-indigo-500", "bg-green-500", "bg-orange-400"];

  function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.round(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.round(diff / 86400)} days ago`;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="p-7 bg-gray-50">
      {/* ── Header card ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          {/* Avatar + info */}
          <div className="flex items-center gap-4 flex-1">
            {/* Bút chì nằm đè lên avatar: nơi người dùng tìm khi muốn sửa thông tin
                của mình chính là ảnh và tên, không phải một trang Settings khác. */}
            <div className="relative shrink-0">
              <UserAvatar
                name={displayName}
                avatarUrl={profile?.avatarUrl}
                size={80}
                fontSize={24}
              />
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                title="Edit profile"
                aria-label="Edit profile"
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-gray-900">
                  {displayName}
                </h1>
                <PlanBadge plan={displayPlan} />
              </div>
              {/* Ba dòng meta dùng chung một gap để nhịp dòng đều nhau; đặt margin
                  riêng cho từng dòng là lý do trước đây dòng ngành bị thưa hơn. */}
              <div className="mt-1.5 flex flex-col gap-1">
              <p className="text-sm text-gray-500">{displayEmail}</p>
              {joinedAt && (
                <p className="text-sm text-gray-400 flex items-center gap-1">
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

              {/* Ngành nằm cùng khối nhận dạng (tên, email, gói, ngày tham gia) vì
                  nó là thuộc tính của người dùng, không phải số liệu học tập. Dùng
                  biến thể ghost để cùng nhịp "icon + chữ" với dòng Joined bên trên;
                  bước xác nhận nằm ở modal nên không cần nút Change riêng. */}
              <div>
                <MajorSelector
                  variant="ghost"
                  allowAll={false}
                  currentLabel={profile?.majorName || ""}
                  selectedMajorId={profile?.majorId ?? null}
                  onSelectMajor={(majorId) => {
                    // Chọn lại đúng ngành đang học thì không phải một thay đổi.
                    if (!majorId || majorId === profile?.majorId) return;
                    setMajorError("");
                    setPendingMajorId(majorId);
                  }}
                />
              </div>
              {majorError && (
                <p className="text-xs font-semibold text-red-500">
                  {majorError}
                </p>
              )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex lg:justify-end">
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
          </div>
        </div>
      </div>

      {/* ── Main grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
            <div className="mb-2">
              <span className="text-sm font-bold text-gray-900">
                {formatStorageBytes(usedBytes)}{" "}
                <span className="text-indigo-500">
                  / {formatStorageBytes(totalBytes)}
                </span>
              </span>
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
            <h2 className="text-lg font-black text-gray-900 mb-5">
              Courses In Progress
            </h2>

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
                            {course.total === 0
                              ? "—"
                              : `${course.studied}/${course.total}`}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {course.total === 0
                            ? "No documents yet"
                            : course.lastStudiedAt
                              ? `Last studied ${timeAgo(course.lastStudiedAt)}`
                              : "Not started yet"}
                        </p>
                      </div>
                    </div>
                    {course.total > 0 && (
                      <div
                        className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden"
                        style={{ marginLeft: "52px" }}
                      >
                        <div
                          className={`h-full rounded-full ${PROGRESS_COLORS[i % PROGRESS_COLORS.length]}`}
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-black text-gray-900 mb-4">
              Recent Activity
            </h2>

            {activities.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No activity yet.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {activities.map((activity, i) => {
                  const style =
                    ACTIVITY_STYLES[activity.type] || ACTIVITY_STYLES.upload;
                  return (
                    <div
                      key={`${activity.type}-${activity.documentId ?? "none"}-${activity.occurredAt}-${i}`}
                      className="flex items-center gap-3"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.bg}`}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={style.stroke}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {style.icon}
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {activityLabel(activity)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {timeAgo(activity.occurredAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditProfileModal
          profile={profile}
          userId={userId}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) =>
            setProfile((prev) => ({ ...(prev || {}), ...updated }))
          }
        />
      )}

      {pendingMajorId && (
        <MajorChangeConfirmModal
          fromName={profile?.majorName}
          toName={pendingMajorName}
          saving={majorSaving}
          onConfirm={() => handleChangeMajor(pendingMajorId)}
          onCancel={() => setPendingMajorId(null)}
        />
      )}
    </div>
  );
}
