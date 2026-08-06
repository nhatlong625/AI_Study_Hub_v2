import { useRef, useState } from "react";
import { userService } from "../../services/userService";
import UserAvatar from "../common/UserAvatar";

// Trước đây modal này nằm trong StudentSettingsPage. Tách ra vì nơi sửa thông tin
// nhận dạng là trang Profile — Settings chỉ còn hiển thị chỉ-đọc.
//
// Cố tình KHÔNG có field ngành: ngành sửa ngay tại Profile bằng dropdown có bước
// xác nhận riêng. Hai nơi cùng sửa một thứ với hai luồng khác nhau là mầm lỗi.

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default function EditProfileModal({ profile, userId, onClose, onSaved }) {
  const [fullName, setFullName] = useState(profile?.fullName || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const originalEmail = (profile?.email || "").trim().toLowerCase();
  const emailChanged = email.trim().toLowerCase() !== originalEmail;

  function handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB");
      return;
    }
    setAvatarFile(file);
    setAvatarRemoved(false);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleRemoveAvatar() {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarRemoved(true);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSave() {
    if (!fullName.trim()) {
      setError("Name cannot be empty");
      return;
    }
    if (!email.trim()) {
      setError("Email cannot be empty");
      return;
    }

    setSaving(true);
    setError("");
    try {
      // avatarChanged tách bạch "không đụng tới avatar" với "vừa gỡ avatar":
      // cả hai đều cho newAvatarUrl = null nên không thể phân biệt bằng giá trị.
      let newAvatarUrl = null;
      let avatarChanged = false;
      if (avatarFile) {
        const avatarRes = await userService.uploadAvatar(userId, avatarFile);
        if (avatarRes.error) throw new Error(avatarRes.error);
        newAvatarUrl = avatarRes.avatarUrl || null;
        avatarChanged = true;
      } else if (avatarRemoved) {
        await userService.removeAvatar(userId);
        avatarChanged = true;
      }

      const updated = await userService.updateProfile(userId, {
        fullName: fullName.trim(),
        email: email.trim(),
      });

      const finalProfile = {
        ...updated,
        ...(avatarChanged ? { avatarUrl: newAvatarUrl } : {}),
      };
      onSaved(finalProfile);

      try {
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        const newData = { ...stored, fullName: fullName.trim(), email: email.trim() };
        if (avatarChanged) newData.avatarUrl = newAvatarUrl;
        localStorage.setItem("user", JSON.stringify(newData));
      } catch { /* ignore */ }

      window.dispatchEvent(new CustomEvent("user-profile-updated", {
        detail: {
          fullName: fullName.trim(),
          ...(avatarChanged ? { avatarUrl: newAvatarUrl } : {}),
        },
      }));

      // Token đăng nhập mang email làm subject (JwtTokenProvider), nên đổi email là
      // token cũ không còn tra ra được user: mọi request sau đó sẽ 401. Buộc đăng
      // nhập lại thay vì để người dùng gặp một chuỗi lỗi không hiểu vì sao.
      if (emailChanged) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("rememberMe");
        window.location.href = "/login?emailChanged=1";
        return;
      }

      onClose();
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={saving ? undefined : onClose}>
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
              <UserAvatar
                name={fullName || profile?.fullName || ""}
                avatarUrl={avatarPreview}
                size={112}
                fontSize={30}
              />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                title="Upload a new photo"
                className="absolute bottom-0 right-0 w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center shadow-md hover:bg-indigo-700 transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </button>
            </div>
            {avatarPreview && (
              <button type="button" onClick={handleRemoveAvatar}
                className="px-3 py-1.5 text-xs font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                Remove
              </button>
            )}
            <p className="text-xs text-gray-400">JPG, PNG · Max 2MB</p>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} className="hidden" />
          </div>

          <Field label="Full Name">
            <input autoFocus value={fullName} onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-2.5 text-sm text-gray-700 border border-gray-200 rounded-xl outline-none focus:border-indigo-400 transition-colors" />
          </Field>

          <Field
            label="Email"
            hint={emailChanged ? "You sign in with this email, so you will be signed out and need to sign in again." : undefined}
          >
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={
                "w-full px-4 py-2.5 text-sm text-gray-700 border rounded-xl outline-none transition-colors " +
                (emailChanged ? "border-amber-300 focus:border-amber-400 bg-amber-50/40" : "border-gray-200 focus:border-indigo-400")
              }
            />
          </Field>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} disabled={saving} className="px-4 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-60 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !fullName.trim() || !email.trim()}
            className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-60">
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
