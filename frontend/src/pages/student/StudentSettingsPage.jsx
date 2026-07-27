import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { userService } from "../../services/userService";
import { formatStorageMb } from "../../utils/formatStorage";
import PageHeader from "../../components/common/PageHeader";

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
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
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${cls}`}
    >
      ★ {(plan || "Basic").toUpperCase()}
    </span>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        checked ? "bg-indigo-500" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
      <h2 className="text-lg font-black text-gray-900 mb-5">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  {
    id: "account",
    label: "Account",
    desc: "Profile and account info",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: "preferences",
    label: "Preferences",
    desc: "Language, timezone and display",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
      </svg>
    ),
  },
  {
    id: "notifications",
    label: "Notifications",
    desc: "Manage your notifications",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    id: "privacy",
    label: "Privacy & Security",
    desc: "Password, sessions and privacy",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    id: "billing",
    label: "Billing & Subscription",
    desc: "Plan, billing and subscription",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    id: "report",
    label: "Report",
    desc: "Report issues or send feedback",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    ),
  },
];

// ── Edit Profile Modal ───────────────────────────────────────────────────────
function EditProfileModal({ profile, userId, onClose, onSaved }) {
  const [fullName, setFullName] = useState(profile?.fullName || "");
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB");
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!fullName.trim()) {
      setError("Name cannot be empty");
      return;
    }
    setSaving(true);
    setError("");
    try {
      let newAvatarUrl = null;
      if (avatarFile) {
        const avatarRes = await userService.uploadAvatar(userId, avatarFile);
        if (avatarRes.error) throw new Error(avatarRes.error);
        newAvatarUrl = avatarRes.avatarUrl || null;
      }
      const updated = await userService.updateProfile(userId, fullName.trim());
      onSaved(newAvatarUrl ? { ...updated, avatarUrl: newAvatarUrl } : updated);
      try {
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        const newData = { ...stored, fullName: fullName.trim() };
        if (newAvatarUrl) newData.avatarUrl = newAvatarUrl;
        localStorage.setItem("user", JSON.stringify(newData));
      } catch { /* ignore */ }
      window.dispatchEvent(new CustomEvent("user-profile-updated", {
        detail: { fullName: fullName.trim(), ...(newAvatarUrl ? { avatarUrl: newAvatarUrl } : {}) }
      }));
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  const initials = getInitials(fullName || profile?.fullName || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h3 className="text-lg font-black text-gray-900">Edit Profile</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-indigo-100 flex items-center justify-center text-3xl font-black text-indigo-600 select-none overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar preview" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
                ) : initials}
              </div>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center shadow-md hover:bg-indigo-700 transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-400">JPG, PNG · Max 2MB</p>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} className="hidden" />
          </div>
          <Field label="Full Name">
            <input autoFocus value={fullName} onChange={(e) => setFullName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="Enter your full name"
              className="w-full px-4 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 transition-colors" />
          </Field>
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || !fullName.trim()} className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-60">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Account Modal ─────────────────────────────────────────────────────
function DeleteAccountModal({ userId, onClose }) {
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const canDelete = confirmText === "DELETE";

  async function handleDelete() {
    if (!canDelete) return;
    setDeleting(true);
    setError("");
    try {
      await userService.deleteAccount(userId);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("rememberMe");
      sessionStorage.clear();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to delete account. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" /><path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-gray-900">Delete Account</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="px-6 pb-2">
          <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete your account? This action cannot be undone.</p>
          <div className="bg-red-50 rounded-xl p-4 mb-4 border border-red-100">
            <p className="text-xs font-black text-red-600 uppercase tracking-wider mb-3">What happens when you delete your account?</p>
            <ul className="flex flex-col gap-2">
              {[
                "All your data, including courses, progress, documents, and settings will be permanently deleted after 30 days.",
                "Your account will be deactivated immediately.",
                "If you change your mind, you can log in within 30 days to reactivate your account.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-red-500">
                  <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <Field label={<span>Please type <span className="text-red-600 font-black">DELETE</span> to confirm</span>}>
            <input autoFocus value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE"
              className="w-full px-4 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-xl outline-none focus:border-red-400 transition-colors" />
          </Field>
        </div>
        <div className="flex justify-end gap-3 px-6 py-5">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
          {error && <p className="text-sm text-red-500 font-medium px-6 pb-2">{error}</p>}
          <button onClick={handleDelete} disabled={!canDelete || deleting}
            className="px-6 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {deleting ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Account Tab ──────────────────────────────────────────────────────────────
function AccountTab({ profile, userId, onProfileUpdated }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const displayName = profile?.fullName || "";
  const displayEmail = profile?.email || "";
  const displayPlan = profile?.plan || "Basic";
  const joinedAt = profile?.joinedAt || "";

  return (
    <>
      {showEditModal && (
        <EditProfileModal profile={profile} userId={userId} onClose={() => setShowEditModal(false)} onSaved={onProfileUpdated} />
      )}
      {showDeleteModal && (
        <DeleteAccountModal userId={userId} onClose={() => setShowDeleteModal(false)} />
      )}

      <SectionCard title="Account Information">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-black text-indigo-600 select-none shrink-0 overflow-hidden">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
            ) : getInitials(displayName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-black text-gray-900">{displayName}</span>
              <PlanBadge plan={displayPlan} />
            </div>
            <p className="text-sm text-gray-500">{displayEmail}</p>
            {joinedAt && (
              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Joined {joinedAt}
              </p>
            )}
          </div>
          <button onClick={() => setShowEditModal(true)}
            className="px-4 py-2 text-sm font-bold text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors shrink-0">
            Edit Profile
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Personal Information">
        <div className="flex flex-col gap-4">
          <Field label="Full Name">
            <input readOnly value={displayName} className="w-full px-4 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
          </Field>
          <Field label="Email">
            <input readOnly value={displayEmail} className="w-full px-4 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
          </Field>
        </div>
      </SectionCard>

      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
        <h2 className="text-lg font-black text-red-600 mb-1">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Once you delete your account, there is no going back. Please be certain.</p>
          <button onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 text-sm font-bold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors ml-4 shrink-0">
            Delete Account
          </button>
        </div>
      </div>
    </>
  );
}

// ── Preferences Tab ──────────────────────────────────────────────────────────
function PreferencesTab({ userId }) {
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("Asia/Ho_Chi_Minh");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("pref_dark_mode") === "true");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    userService.getSettings(userId).then((s) => {
      if (s.language) setLanguage(s.language);
      if (s.timezone) setTimezone(s.timezone);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  async function save() {
    localStorage.setItem("pref_dark_mode", darkMode);
    await userService.updateSettings(userId, { language, timezone });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const prefItems = [
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
      label: "Language", desc: "Choose your preferred language",
      control: (
        <select value={language} onChange={(e) => setLanguage(e.target.value)}
          className="w-52 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-400 transition-colors appearance-none cursor-pointer">
          <option value="en">English</option>
          <option value="vi">Tiếng Việt</option>
        </select>
      ),
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
      label: "Timezone", desc: "Set your current timezone",
      control: (
        <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
          className="w-52 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-400 transition-colors appearance-none cursor-pointer">
          <option value="Asia/Ho_Chi_Minh">(GMT+07:00) Bangkok, Hanoi, Jakarta</option>
          <option value="Asia/Singapore">(GMT+08:00) Singapore, Kuala Lumpur</option>
          <option value="Asia/Tokyo">(GMT+09:00) Tokyo, Seoul</option>
          <option value="Europe/London">(GMT+00:00) London</option>
          <option value="America/New_York">(GMT-05:00) New York</option>
          <option value="America/Los_Angeles">(GMT-08:00) Los Angeles</option>
        </select>
      ),
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>,
      label: "Dark Mode", desc: "Switch between light and dark theme",
      control: (
        <select value={darkMode ? "dark" : "light"} onChange={(e) => setDarkMode(e.target.value === "dark")}
          className="w-52 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-400 transition-colors appearance-none cursor-pointer">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      ),
    },
  ];

  return (
    <SectionCard title="Preferences">
      <div className="flex flex-col divide-y divide-gray-100">
        {prefItems.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">{item.icon}</div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            </div>
            {item.control}
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-5 mt-2 border-t border-gray-100">
        <button onClick={save} className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors">
          {saved ? "Saved ✓" : "Save Preferences"}
        </button>
      </div>
    </SectionCard>
  );
}

// ── Notifications Tab ────────────────────────────────────────────────────────
function NotificationsTab({ userId }) {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!userId) return;
    userService.getSettings(userId).then(setSettings).catch(() => {});
  }, [userId]);

  async function save() {
    if (!settings || !userId) return;
    setSaving(true);
    try {
      await userService.updateSettings(userId, {
        emailNotifications: settings.emailNotifications,
        pushNotifications: settings.pushNotifications,
        learningNotifications: settings.learningNotifications,
        aiNotifications: settings.aiNotifications,
        achievementNotifications: settings.achievementNotifications,
        securityNotifications: settings.securityNotifications,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <div className="text-sm text-gray-400 py-8 text-center">Loading...</div>;

  const items = [
    { key: "learningNotifications", label: "Learning Notifications", desc: "Get notified about your study progress and upcoming tasks" },
    { key: "aiNotifications", label: "AI Assistant Notifications", desc: "Receive tips and insights from your personal AI tutor" },
    { key: "emailNotifications", label: "Email Notifications", desc: "Manage the emails you receive about your account activity" },
    { key: "pushNotifications", label: "Push Notifications", desc: "Allow notifications on your browser or desktop" },
    { key: "achievementNotifications", label: "Achievement Notifications", desc: "Get alerts when you earn badges or hit study milestones" },
    { key: "securityNotifications", label: "Security Notifications", desc: "Important alerts about your account login and security" },
  ];

  return (
    <SectionCard title="Notifications">
      <div className="flex flex-col divide-y divide-gray-100">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
            <div>
              <p className="text-sm font-semibold text-gray-800">{item.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
            </div>
            <Toggle checked={!!settings[item.key]} onChange={(val) => setSettings((s) => ({ ...s, [item.key]: val }))} />
          </div>
        ))}
      </div>
      <div className="flex justify-end pt-5 mt-2 border-t border-gray-100">
        <button onClick={save} disabled={saving}
          className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-60">
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save Changes"}
        </button>
      </div>
    </SectionCard>
  );
}

// ── Change Password Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ userId, onClose }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (form.newPassword !== form.confirmPassword) { setError("Passwords do not match"); return; }
    if (form.newPassword.length < 6) { setError("Must be at least 6 characters long"); return; }
    setSaving(true);
    try {
      await userService.changePassword(userId, form.currentPassword, form.newPassword);
      setSuccess("Password updated successfully!");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.message || "Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-black text-gray-900">Change Password</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSave} className="px-6 py-5 flex flex-col gap-4">
          <p className="text-sm text-gray-500">Please enter your current password and choose a strong new one to keep your account secure.</p>
          <Field label="Current Password">
            <input type="password" value={form.currentPassword} onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
              placeholder="••••••••" className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-indigo-400 transition-colors" />
          </Field>
          <Field label="New Password">
            <input type="password" value={form.newPassword} onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
              placeholder="••••••••" className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-indigo-400 transition-colors" />
            <p className="text-xs text-gray-400 mt-1">Must be at least 6 characters long.</p>
          </Field>
          <Field label="Confirm New Password">
            <input type="password" value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              placeholder="••••••••" className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-indigo-400 transition-colors" />
          </Field>
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          {success && <p className="text-sm text-green-600 font-medium">{success}</p>}
          <button type="submit" disabled={saving || !form.currentPassword || !form.newPassword}
            className="w-full py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-60">
            {saving ? "Updating..." : "Update Password"}
          </button>
          <button type="button" onClick={onClose} className="w-full py-2 text-sm font-semibold text-gray-500 hover:text-gray-700">Cancel</button>
        </form>
      </div>
    </div>
  );
}

// ── Privacy Tab ──────────────────────────────────────────────────────────────
function PrivacyTab({ userId }) {
  const [settings, setSettings] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [showPwModal, setShowPwModal] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [privacySaved, setPrivacySaved] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const [showDeleteChatConfirm, setShowDeleteChatConfirm] = useState(false);

  useEffect(() => {
    if (!userId) return;
    userService.getSettings(userId).then(setSettings).catch(() => {});
    userService.getSessions(userId).then(setSessions).catch(() => {});
  }, [userId]);

  async function savePrivacy() {
    if (!settings || !userId) return;
    setSavingPrivacy(true);
    try {
      await userService.updateSettings(userId, { profileVisibility: settings.profileVisibility, showStreak: settings.showStreak });
      setPrivacySaved(true);
      setTimeout(() => setPrivacySaved(false), 2000);
    } finally {
      setSavingPrivacy(false);
    }
  }

  async function revokeSession(tokenId) {
    await userService.revokeSession(userId, tokenId);
    setSessions((s) => s.filter((s) => s.token_id !== tokenId));
  }

  async function deleteChatHistory() {
    setDeletingChat(true);
    try {
      await userService.deleteChatHistory(userId);
      setShowDeleteChatConfirm(false);
    } finally {
      setDeletingChat(false);
    }
  }

  function formatTime(dateStr) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <>
      {showPwModal && <ChangePasswordModal userId={userId} onClose={() => setShowPwModal(false)} />}

      {showDeleteChatConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDeleteChatConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4 shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-gray-900 mb-2">Delete AI Chat History</h3>
            <p className="text-sm text-gray-500 mb-5">All your AI chat sessions and messages will be permanently deleted. This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteChatConfirm(false)} className="px-4 py-2 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={deleteChatHistory} disabled={deletingChat} className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-60">
                {deletingChat ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SectionCard title="Password & Authentication">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-800">Password</p>
            <p className="text-xs text-gray-400 mt-0.5">Change your account password</p>
          </div>
          <button onClick={() => setShowPwModal(true)} className="px-4 py-2 text-sm font-bold text-gray-700 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition-colors">
            Change Password
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Login Sessions">
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No active sessions found.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Device & Browser</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">IP Address</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map((s, i) => (
                  <tr key={s.token_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{s.device_info || "Unknown Device"}</td>
                    <td className="px-4 py-3 text-gray-500">{s.ip_address || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatTime(s.last_used_at || s.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {i === 0 ? (
                        <span className="px-2.5 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">CURRENT</span>
                      ) : (
                        <button onClick={() => revokeSession(s.token_id)} className="text-xs font-bold text-red-500 hover:text-red-700">Revoke</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {settings && (
        <SectionCard title="Privacy Preferences">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Show profile publicly</p>
                <p className="text-xs text-gray-400">Allow others to view your profile</p>
              </div>
              <Toggle
                checked={settings.profileVisibility === "Public"}
                onChange={(val) => setSettings((s) => ({ ...s, profileVisibility: val ? "Public" : "Private" }))}
              />
            </div>
            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button onClick={savePrivacy} disabled={savingPrivacy}
                className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-60">
                {savingPrivacy ? "Saving..." : privacySaved ? "Saved ✓" : "Save Changes"}
              </button>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Data & Permissions">
        <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
          <div>
            <p className="text-sm font-semibold text-red-700">Delete AI Chat History</p>
            <p className="text-xs text-red-400 mt-0.5">Permanently delete all your AI conversations</p>
          </div>
          <button onClick={() => setShowDeleteChatConfirm(true)}
            className="px-4 py-2 text-sm font-bold text-red-600 border border-red-200 bg-white rounded-xl hover:bg-red-50 transition-colors">
            Delete
          </button>
        </div>
      </SectionCard>
    </>
  );
}

// ── Billing Tab ──────────────────────────────────────────────────────────────
function BillingTab({ userId }) {
  const [subscription, setSubscription] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      userService.getSubscription(userId).catch(() => null),
      userService.getBillingHistory(userId).catch(() => []),
    ]).then(([sub, history]) => {
      setSubscription(sub);
      setBillingHistory(Array.isArray(history) ? history : []);
      setLoading(false);
    });
  }, [userId]);

  async function handleCancel() {
    setCancelling(true);
    try {
      await userService.cancelSubscription(userId);
      setSubscription((s) => ({ ...s, status: "Cancelled" }));
      setShowCancelModal(false);
    } catch (err) {
      alert(err.message || "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  function formatAmount(amount) {
    if (!amount) return "—";
    return new Intl.NumberFormat("vi-VN").format(amount) + " ₫";
  }

  function formatStorage(mb) {
    const value = Number(mb || 0);
    if (!value) return "N/A";
    return `${formatStorageMb(value)} storage`;
  }

  function formatQuizLimit(value) {
    const numberValue = Number(value);
    if (numberValue === -1) return "Unlimited quizzes/month";
    if (!Number.isFinite(numberValue) || numberValue <= 0) return "N/A";
    return `${numberValue} quizzes/month`;
  }

  const planName = subscription?.planName || "Basic";
  const isBasic = planName === "Basic";
  const isCancelled = subscription?.status === "Cancelled";
  const versionLabel = subscription?.versionNo ? `v${subscription.versionNo}` : "";

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Loading...</div>;

  return (
    <>
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCancelModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4 shadow-2xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">Cancel Subscription?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to cancel your {planName} Plan? You will lose access to all premium features
              {subscription?.endDate ? ` at the end of your current billing cycle on ${formatDate(subscription.endDate)}` : ""}.
            </p>
            <button onClick={handleCancel} disabled={cancelling}
              className="w-full py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors mb-3 disabled:opacity-60">
              {cancelling ? "Cancelling..." : "Yes, Cancel Subscription"}
            </button>
            <button onClick={() => setShowCancelModal(false)} className="w-full py-3 text-sm font-bold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Keep My Plan
            </button>
          </div>
        </div>
      )}

      <SectionCard title="Billing & Subscription">
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-full">Current Plan</span>
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xl font-black text-gray-900">{planName} Plan</p>
              {versionLabel && (
                <span className="text-xs font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-100">
                  {versionLabel}
                </span>
              )}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-white/80 border border-indigo-100 px-3 py-2">
                <p className="text-[11px] font-bold text-indigo-400 uppercase">Locked price</p>
                <p className="text-sm font-black text-gray-900">{formatAmount(subscription?.price)}</p>
              </div>
              <div className="rounded-lg bg-white/80 border border-indigo-100 px-3 py-2">
                <p className="text-[11px] font-bold text-indigo-400 uppercase">Storage</p>
                <p className="text-sm font-black text-gray-900">{formatStorage(subscription?.maxStorage)}</p>
              </div>
              <div className="rounded-lg bg-white/80 border border-indigo-100 px-3 py-2">
                <p className="text-[11px] font-bold text-indigo-400 uppercase">Quiz limit</p>
                <p className="text-sm font-black text-gray-900">{formatQuizLimit(subscription?.maxQuiz)}</p>
              </div>
            </div>
            {subscription?.endDate && !isBasic && (
              <p className="text-sm text-gray-500 mt-0.5">{isCancelled ? "Cancelled · Access until" : "Expires:"} {formatDate(subscription.endDate)}</p>
            )}
            {isBasic && <p className="text-sm text-gray-400 mt-0.5">Free plan — no expiry</p>}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Billing History">
        {billingHistory.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No billing history yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {billingHistory.map((item) => (
                  <tr key={item.payment_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(item.paid_at || item.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{item.plan_code} · {item.billing_cycle}</td>
                    <td className="px-4 py-3 text-gray-700 font-semibold">{formatAmount(item.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${item.status === "PAID" ? "bg-green-100 text-green-700" : item.status === "PENDING" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {!isBasic && !isCancelled && (
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
          <h2 className="text-lg font-black text-red-600 mb-4">Dangerous Territory</h2>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-800">Auto-Renewal</p>
                <p className="text-xs text-gray-400">Your subscription will renew automatically</p>
              </div>
              <Toggle
                checked={!!subscription?.autoRenewal}
                onChange={async (val) => {
                  setSubscription((s) => ({ ...s, autoRenewal: val }));
                  try { await userService.updateAutoRenewal(userId, val); }
                  catch { setSubscription((s) => ({ ...s, autoRenewal: !val })); }
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Cancel Subscription</p>
                <p className="text-xs text-gray-400">You will immediately lose access to all premium benefits</p>
              </div>
              <button onClick={() => setShowCancelModal(true)}
                className="px-4 py-2 text-sm font-bold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors ml-4 shrink-0">
                Cancel Subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Report Tab ───────────────────────────────────────────────────────────────
function ReportTab({ userId }) {
  const [form, setForm] = useState({ category: "", rating: 0, description: "", contactEmail: "", isAnonymous: false });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState("");

  const categories = ["Bug Report", "Content Issue", "AI Issue", "Practice Test Issue", "Payment Issue", "Other"];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.category) { setError("Please select a category"); return; }
    if (!form.description.trim()) { setError("Please describe the issue"); return; }
    setSubmitting(true);
    try {
      await userService.submitReport({ ...form, userId });
      setShowSuccess(true);
      setForm({ category: "", rating: 0, description: "", contactEmail: "", isAnonymous: false });
    } catch (err) {
      setError(err.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-sm mx-4 shadow-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Report Submitted!</h3>
            <p className="text-sm text-gray-500 mb-6">Thank you for your feedback! We appreciate your time and will use your input to improve AI Study Hub.</p>
            <button onClick={() => setShowSuccess(false)} className="w-full py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors">Done</button>
          </div>
        </div>
      )}

      <SectionCard title="Report">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Field label="1. Issue Category">
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full px-4 py-2.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-400 transition-colors appearance-none cursor-pointer">
              <option value="">Select a category</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="2. Describe the Issue">
            <div className="relative">
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 1000) }))}
                placeholder="Tell us your feedback, suggestion, or report a problem..." rows={5}
                className="w-full px-4 py-3 text-sm text-gray-700 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 transition-colors resize-none" />
              <span className="absolute bottom-3 right-3 text-xs text-gray-400">{form.description.length}/1000</span>
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="3. Contact Email (optional)">
              <input type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                placeholder="Enter your email if you want us to reply" disabled={form.isAnonymous}
                className="w-full px-4 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 transition-colors disabled:bg-gray-50 disabled:text-gray-400" />
            </Field>
            <Field label="4. Send Anonymously">
              <div className="flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-xl">
                <span className="text-sm text-gray-500">Your feedback will be sent anonymously</span>
                <Toggle checked={form.isAnonymous} onChange={(val) => setForm((f) => ({ ...f, isAnonymous: val, contactEmail: val ? "" : f.contactEmail }))} />
              </div>
            </Field>
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

          <button type="submit" disabled={submitting}
            className="w-full py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
        </form>
      </SectionCard>
    </>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function StudentSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "account";

  const localUser = getCurrentUser();
  const userId = localUser.userId || localUser.id;

  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!userId) return;
    userService.getProfile(userId).then(setProfile).catch(() => {});
  }, [userId]);

  function setTab(id) {
    setSearchParams({ tab: id });
  }

  return (
    <div className="p-7 bg-gray-50 min-h-screen">
      <PageHeader title="Settings" description="Manage your account, preferences, and app settings." />

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="w-60 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setTab(tab.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors border-l-2 ${isActive ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-transparent text-gray-600 hover:bg-gray-50"}`}>
                  <span className={`mt-0.5 shrink-0 ${isActive ? "text-indigo-600" : "text-gray-400"}`}>{tab.icon}</span>
                  <div>
                    <p className={`text-sm font-bold ${isActive ? "text-indigo-700" : "text-gray-700"}`}>{tab.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{tab.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "account" && <AccountTab profile={profile} userId={userId} onProfileUpdated={(updated) => setProfile(updated)} />}
          {activeTab === "preferences" && <PreferencesTab userId={userId} />}
          {activeTab === "notifications" && <NotificationsTab userId={userId} />}
          {activeTab === "privacy" && <PrivacyTab userId={userId} />}
          {activeTab === "billing" && <BillingTab userId={userId} />}
          {activeTab === "report" && <ReportTab userId={userId} />}
        </div>
      </div>
    </div>
  );
}
