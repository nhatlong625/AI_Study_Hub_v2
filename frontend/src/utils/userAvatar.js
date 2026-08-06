// Chữ cái đầu dùng làm avatar mặc định khi user chưa upload ảnh.
// Dùng chung cho Profile, Topbar và Sidebar để 3 nơi không hiện 3 kiểu khác nhau.
import { useCallback, useState } from "react";

/**
 * Theo dõi URL ảnh bị lỗi để component rơi về chữ cái đầu thay vì vòng tròn trống.
 * Bám theo URL chứ không phải cờ boolean, để đổi sang ảnh mới thì thử lại từ đầu.
 */
export function useAvatarFallback(avatarUrl) {
  const [failedUrl, setFailedUrl] = useState(null);
  const onError = useCallback(() => setFailedUrl(avatarUrl), [avatarUrl]);
  return { showImage: Boolean(avatarUrl) && failedUrl !== avatarUrl, onError };
}

export function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
