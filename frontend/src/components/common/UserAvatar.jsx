import { getInitials, useAvatarFallback } from "../../utils/userAvatar";

/**
 * Avatar người dùng — dùng chung cho Profile, Topbar và Sidebar.
 *
 * <p>Trước đây ba nơi tự dựng vòng tròn riêng nên nền lệch nhau (indigo-100 /
 * #f0edff / không nền) và fallback cũng khác nhau (chữ cái đầu / logo app).
 * Mọi chỗ hiện avatar nên đi qua component này thay vì tự vẽ lại.
 *
 * @param size     đường kính, px
 * @param fontSize cỡ chữ cái đầu; bỏ trống thì lấy 36% đường kính
 */
export default function UserAvatar({
  name,
  avatarUrl,
  size = 36,
  fontSize,
  className = "",
}) {
  const { showImage, onError } = useAvatarFallback(avatarUrl);

  return (
    <div
      className={`rounded-full bg-indigo-100 text-indigo-600 font-black flex items-center justify-center overflow-hidden select-none shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: fontSize ?? Math.max(10, Math.round(size * 0.36)),
      }}
    >
      {showImage ? (
        <img
          src={avatarUrl}
          alt="Avatar"
          className="w-full h-full object-cover"
          onError={onError}
        />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}
