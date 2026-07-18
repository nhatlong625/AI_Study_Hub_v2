import { lazy, Suspense } from "react";
import { Navigate, useRoutes } from "react-router-dom";
import ScrollToTop from "./ScrollToTop";

function normalizeRole(role) {
  const normalized = String(role || "")
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, "");
  return normalized;
}

function getCurrentAuthUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function RoleGate({ allow, fallback, children }) {
  const token = localStorage.getItem("token");
  const user = getCurrentAuthUser();
  const role = normalizeRole(user?.role);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allow.includes(role)) {
    return <Navigate to={fallback} replace />;
  }

  return children;
}

const PublicLayout = lazy(() => import("../components/layout/PublicLayout"));
const StudentLayout = lazy(() => import("../components/layout/StudentLayout"));
const AdminLayout = lazy(() => import("../components/layout/AdminLayout"));
const ShareLayout = lazy(() => import("../components/layout/ShareLayout"));

const FeaturesPage = lazy(() => import("../pages/landing/FeaturesPage"));
const GuidePage = lazy(() => import("../pages/landing/GuidePage"));
const PricingPage = lazy(() => import("../pages/landing/PricingPage"));

const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("../pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("../pages/auth/ForgotPasswordPage"));
const VerifyEmailPage = lazy(() => import("../pages/auth/VerifyEmailPage"));
const ResetPasswordPage = lazy(() => import("../pages/auth/ResetPasswordPage"));
const ResetSuccessPage = lazy(() => import("../pages/auth/ResetSuccessPage"));

const StudentProfilePage = lazy(() => import("../pages/student/StudentProfilePage"));
const StudentSettingsPage = lazy(() => import("../pages/student/StudentSettingsPage"));
const StudentHomePage = lazy(() => import("../pages/student/StudentHomePage"));
const StudentCoursesPage = lazy(() => import("../pages/student/StudentCoursesPage"));
const StudentCourseDetailPage = lazy(() => import("../pages/student/StudentCourseDetailPage"));
const StudentMyCoursesPage = lazy(() => import("../pages/student/StudentMyCoursesPage"));
const StudentLibraryPage = lazy(() => import("../pages/student/StudentLibraryPage"));
const StudentLibraryCourseDetailPage = lazy(() => import("../pages/student/StudentLibraryCourseDetailPage"));
const StudentDocumentViewPage = lazy(() => import("../pages/student/StudentDocumentViewPage"));
const StudentUploadDocumentPage = lazy(() => import("../pages/student/StudentUploadDocumentPage"));
const StudentAITutorPage = lazy(() => import("../pages/student/StudentAITutorPage"));
const StudentAIChatPage = lazy(() => import("../pages/student/StudentAIChatPage"));
const StudentPracticeTestsPage = lazy(() => import("../pages/student/StudentPracticeTestsPage"));
const StudentGeneratePracticeTestPage = lazy(() => import("../pages/student/StudentGeneratePracticeTestPage"));
const StudentQuizTakingPage = lazy(() => import("../pages/student/StudentQuizTakingPage"));
const StudentQuizResultPage = lazy(() => import("../pages/student/StudentQuizResultPage"));
const StudentSharedWithMePage = lazy(() => import("../pages/student/StudentSharedWithMePage"));

const AdminDashboardPage = lazy(() => import("../pages/admin/AdminDashboardPage"));
const AdminUserManagementPage = lazy(() => import("../pages/admin/AdminUserManagementPage"));
const AdminLibraryManagementPage = lazy(() => import("../pages/admin/AdminLibraryManagementPage"));
const AdminPracticeTestManagementPage = lazy(() => import("../pages/admin/AdminPracticeTestManagementPage"));
const AdminQuestionReviewQueuePage = lazy(() => import("../pages/admin/AdminQuestionReviewQueuePage"));
const AdminDocumentManagementPage = lazy(() => import("../pages/admin/AdminDocumentManagementPage"));
const AdminPaymentManagementPage = lazy(() => import("../pages/admin/AdminPaymentManagementPage"));
const AdminSettingsPage = lazy(() => import("../pages/admin/AdminSettingsPage"));
const AdminPlanManagementPage = lazy(() => import("../pages/admin/AdminPlanManagementPage"));
const AdminConversationHistoryPage = lazy(() => import("../pages/admin/AdminConversationHistoryPage"));
const SharedDocumentViewPage = lazy(() => import("../pages/share/SharedDocumentViewPage"));
const PaymentResultPage = lazy(() => import("../pages/PaymentResultPage"));

const RouteLoading = () => (
  <div className="flex min-h-screen items-center justify-center bg-white text-sm font-bold text-gray-400">
    Loading...
  </div>
);
// ── Landing ──────────────────────────────────────────────────

// ── Auth ─────────────────────────────────────────────────────

// ── Student ───────────────────────────────────────────────────

// ── Admin ─────────────────────────────────────────────────────

// ── Placeholder cho tính năng chưa làm ───────────────────────
const ComingSoon = () => (
  <div className="flex flex-col items-center justify-center min-h-screen text-gray-400">
    <p className="text-lg font-semibold">Coming Soon</p>
    <p className="text-sm mt-1">This feature is under development.</p>
  </div>
);

function AppRouter() {
  const routes = useRoutes([
    // ── Public / Landing ─────────────────────────────────────
    {
      path: "/",
      element: <PublicLayout />,
      children: [
        { index: true, element: <Navigate to="/features" replace /> },
        { path: "features", element: <FeaturesPage /> },
        { path: "guide", element: <GuidePage /> },
        { path: "pricing", element: <PricingPage /> },
        { path: "login", element: <LoginPage /> },
        { path: "register", element: <RegisterPage /> },
        { path: "forgot-password", element: <ForgotPasswordPage /> },
        { path: "verify-email", element: <VerifyEmailPage /> },
        { path: "reset-password", element: <ResetPasswordPage /> },
        { path: "reset-success", element: <ResetSuccessPage /> },
      ],
    },

    // ── Student ──────────────────────────────────────────────
    {
      path: "/student",
      element: (
        <RoleGate allow={["STUDENT"]} fallback="/admin/dashboard">
          <StudentLayout />
        </RoleGate>
      ),
      children: [
        { index: true, element: <Navigate to="/student/home" replace /> },

        // Home & Courses
        { path: "home", element: <StudentHomePage /> },
        { path: "courses", element: <StudentCoursesPage /> },
        { path: "courses/:courseId", element: <StudentCourseDetailPage /> },
        { path: "my-courses", element: <StudentMyCoursesPage /> },

        // Library
        { path: "library", element: <StudentLibraryPage /> },
        {
          path: "library/:courseId",
          element: <StudentLibraryCourseDetailPage />,
        },

        // Documents
        { path: "documents/:documentId", element: <StudentDocumentViewPage /> },
        { path: "upload-document", element: <StudentUploadDocumentPage /> },
        { path: "shared-with-me", element: <StudentSharedWithMePage /> },

        // AI Tutor & Chat
        { path: "ai-tutor", element: <StudentAITutorPage /> },
        { path: "ai-tutor/chat", element: <StudentAIChatPage /> },
        { path: "ai-tutor/chat/:threadId", element: <StudentAIChatPage /> },
        { path: "ai-tutor/select-context", element: <ComingSoon /> },

        // Practice Tests & Quiz — chưa làm
        { path: "practice-tests", element: <StudentPracticeTestsPage /> },
        { path: "practice-tests/generate", element: <StudentGeneratePracticeTestPage /> },
        { path: "quiz/:quizId", element: <StudentQuizTakingPage /> },
        { path: "quiz/:quizId/result", element: <StudentQuizResultPage /> },

        // Profile & Settings
        { path: "profile", element: <StudentProfilePage /> },
        { path: "settings", element: <StudentSettingsPage /> },
      ],
    },

    // ── Admin ────────────────────────────────────────────────
    {
      path: "/admin",
      element: (
        <RoleGate allow={["ADMIN"]} fallback="/login">
          <AdminLayout />
        </RoleGate>
      ),
      children: [
        { index: true, element: <Navigate to="/admin/dashboard" replace /> },
        { path: "dashboard", element: <AdminDashboardPage /> },
        { path: "users", element: <AdminUserManagementPage /> },
        { path: "library", element: <AdminLibraryManagementPage /> },
        {
          path: "practice-tests",
          element: <AdminPracticeTestManagementPage />,
        },
        { path: "question-review", element: <AdminQuestionReviewQueuePage /> },
        { path: "documents", element: <AdminDocumentManagementPage /> },
        { path: "payments", element: <AdminPaymentManagementPage /> },
        { path: "plans", element: <AdminPlanManagementPage /> },
        { path: "settings", element: <AdminSettingsPage /> },
        { path: "conversations", element: <AdminConversationHistoryPage /> },
      ],
    },

    // ── Share (public — ngoài /student/* để tránh auth guard sau B1) ──
    {
      path: "/share",
      element: <ShareLayout />,
      children: [{ path: ":shareId", element: <SharedDocumentViewPage /> }],
    },

    { path: "/payment/result", element: <PaymentResultPage /> },

    { path: "*", element: <Navigate to="/" replace /> },
  ]);

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<RouteLoading />}>{routes}</Suspense>
    </>
  );
}

export default AppRouter;
