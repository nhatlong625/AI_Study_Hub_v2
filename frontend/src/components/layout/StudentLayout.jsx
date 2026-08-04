import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useSidebar, SidebarContext } from "../../hooks/useSidebar";
import StudentSidebar from "./StudentSidebar";
import StudentTopbar from "./StudentTopbar";
import MajorOnboardingModal from "../student/MajorOnboardingModal";
import { useHistory, HistoryContext } from "../../hooks/useHistory";
import { userService } from "../../services/userService";

function StudentLayout() {
  const navigate = useNavigate();
  const { history, addToHistory, clearHistory } = useHistory();
  const sidebar = useSidebar();

  const [selectedMajorId, setSelectedMajorId] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

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
      }
    };
    fetchUser();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectMajor = async (majorId) => {
    setSelectedMajorId(majorId);
    try {
      await userService.updateMyMajor(majorId);
    } catch (err) {
      console.error("Failed to update major:", err);
    }
  };

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

  return (
    <SidebarContext.Provider value={sidebar}>
      <HistoryContext.Provider value={{ addToHistory }}>
        <div
          className="min-h-screen grid bg-[#f7f5fc]"
          style={{
            gridTemplateColumns: sidebar.collapsed ? "60px 1fr" : "234px 1fr",
          }}
        >
          <div
            className="sticky top-0 h-screen overflow-hidden transition-[width] duration-200"
            style={{ padding: 0, background: "transparent", border: "none" }}
          >
            <StudentSidebar
              history={history}
              onHistoryClick={handleHistoryClick}
              onClearHistory={clearHistory}
            />
          </div>
          <div className="min-w-0 flex flex-col">
            <StudentTopbar
              onCourseClick={handleCourseClick}
              onFileClick={handleFileClick}
              selectedMajorId={selectedMajorId}
              onSelectMajor={handleSelectMajor}
            />
            <main className="p-0 bg-gradient-to-br from-[#f7f5fc] via-[#f1edfb] to-[#f5f3ff]">
              <Outlet context={{ selectedMajorId, setSelectedMajorId, handleSelectMajor, userProfile }} />
            </main>
          </div>
        </div>

        {/* Onboarding modal when major_id is missing */}
        <MajorOnboardingModal
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onMajorSelected={(majorId) => {
            setSelectedMajorId(majorId);
            setShowOnboarding(false);
          }}
        />
      </HistoryContext.Provider>
    </SidebarContext.Provider>
  );
}

export default StudentLayout;
