import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSidebar, SidebarContext } from "../../hooks/useSidebar";
import ErrorBoundary from "../common/ErrorBoundary";
import StudentSidebar from "./StudentSidebar";
import StudentTopbar from "./StudentTopbar";
import MajorOnboardingModal from "../student/MajorOnboardingModal";
import { useHistory, HistoryContext } from "../../hooks/useHistory";
import { userService } from "../../services/userService";

function StudentLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { history, addToHistory, clearHistory } = useHistory();
  const sidebar = useSidebar();

  // Bộ lọc xem của trang Home, không phải ngành thật trong DB: Home đổi nó qua
  // setSelectedMajorId nên chọn "All Majors" chỉ mở rộng danh sách đang xem.
  // Đổi ngành thật chỉ diễn ra ở Profile và ở modal onboarding.
  const [selectedMajorId, setSelectedMajorId] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  // Chưa biết user có ngành hay chưa thì không render gì: render trước rồi mới bật
  // modal sẽ để lọt một nhịp mà toàn bộ trang đã fetch xong và bấm được.
  const [majorChecked, setMajorChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchUser = async () => {
      try {
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        const userId = stored.userId || stored.id;
        const profile = await userService.getProfile(userId || "me");
        if (isMounted && profile) {
          setUserProfile(profile);
          if (profile.majorId) {
            setSelectedMajorId(profile.majorId);
          } else {
            // Show onboarding modal if user has no major set
            setShowOnboarding(true);
          }
        }
      } catch (err) {
        console.warn("Could not fetch user profile for major check:", err);
      } finally {
        if (isMounted) setMajorChecked(true);
      }
    };
    fetchUser();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCourseClick = (courseId, semester) => {
    addToHistory({ type: "course", label: courseId, courseId, semester });
    navigate(`/student/courses/${courseId}`);
  };

  const handleFileClick = (file) => {
    addToHistory({ type: "file", label: file.name, file });
    navigate(`/student/documents/${file.id}`);
  };

  const handleHistoryClick = (item) => {
    if (item.type === "course") {
      navigate(`/student/courses/${item.courseId}`);
    } else {
      const docId = item.file?.documentId || item.file?.id || item.documentId || item.id;
      if (docId) {
        navigate(`/student/documents/${docId}`);
      }
    }
  };

  // Chờ biết kết quả kiểm tra ngành trước khi dựng khung app.
  if (!majorChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-400">
        Loading...
      </div>
    );
  }

  // Chưa chọn ngành thì không dựng sidebar/topbar/Outlet — chặn truy cập thật sự,
  // chứ không chỉ phủ một lớp overlay lên trang đã tải xong.
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MajorOnboardingModal
          isOpen
          onClose={() => setShowOnboarding(false)}
          onMajorSelected={(majorId) => {
            setSelectedMajorId(majorId);
            setShowOnboarding(false);
          }}
        />
      </div>
    );
  }

  return (
    <SidebarContext.Provider value={sidebar}>
      <HistoryContext.Provider value={{ addToHistory }}>
        <div
          className="min-h-screen grid bg-gray-50"
          style={{
            gridTemplateColumns: sidebar.collapsed ? "60px 1fr" : "234px 1fr",
          }}
        >
          <div
            className="sticky top-0 h-screen overflow-hidden transition-[width] duration-200"
            style={{ padding: 0, background: "transparent", border: "none" }}
          >
            {/* Truyền profile đã fetch xuống: localStorage không có avatarUrl (login
                không trả về field này) nên nếu để sidebar/topbar tự đọc localStorage
                thì avatar ở đó không bao giờ khớp với trang Profile. */}
            <StudentSidebar
              history={history}
              onHistoryClick={handleHistoryClick}
              onClearHistory={clearHistory}
              userProfile={userProfile}
            />
          </div>
          <div className="min-w-0 flex flex-col">
            <StudentTopbar
              onCourseClick={handleCourseClick}
              onFileClick={handleFileClick}
              userProfile={userProfile}
            />
            {/* flex-1 để main luôn phủ hết chiều cao còn lại; thiếu nó thì trang
                nội dung ngắn sẽ lộ nền của div ngoài cùng thành 2 mảng màu. */}
            <main className="p-0 bg-gray-50 flex-1 flex flex-col">
              {/* Bọc quanh Outlet để trang lỗi chỉ chết vùng nội dung,
                  sidebar và topbar vẫn dùng được. */}
              <ErrorBoundary resetKey={pathname}>
                <Outlet context={{ selectedMajorId, setSelectedMajorId, userProfile }} />
              </ErrorBoundary>
            </main>
          </div>
        </div>

      </HistoryContext.Provider>
    </SidebarContext.Provider>
  );
}

export default StudentLayout;
