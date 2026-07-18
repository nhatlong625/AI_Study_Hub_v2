import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Tự động scroll về đầu trang mỗi khi route thay đổi.
// React Router không làm điều này mặc định (khác với trình duyệt truyền thống).
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
