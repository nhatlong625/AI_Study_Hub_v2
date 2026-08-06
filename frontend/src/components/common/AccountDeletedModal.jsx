import React from "react";

// Hai lý do khiến phiên làm việc không dùng được nữa. Nội dung khác nhau vì
// hết hạn token là chuyện bình thường (đăng nhập lại là xong), còn tài khoản
// bị xóa thì đăng nhập lại cũng vô ích.
const REASON_CONTENT = {
  expired: {
    title: "Your session has expired.",
    body: "You have been signed out for security reasons. Please sign in again to continue.",
    action: "Sign in again",
  },
  deleted: {
    title: "The account does not exist.",
    body: "Your account has been removed or is no longer available in the system. Please sign out to continue.",
    action: "Logout",
  },
};

export default function AccountDeletedModal({ onLogout, reason = "deleted" }) {
  const content = REASON_CONTENT[reason] ?? REASON_CONTENT.deleted;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 text-center animate-in fade-in zoom-in duration-200">
        {/* Warning Icon */}
        <div className="mx-auto w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Modal Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {content.title}
        </h3>

        <p className="text-sm text-gray-600 mb-6">{content.body}</p>

        {/* Logout Button */}
        <button
          type="button"
          onClick={onLogout}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-200 cursor-pointer"
        >
          {content.action}
        </button>
      </div>
    </div>
  );
}
