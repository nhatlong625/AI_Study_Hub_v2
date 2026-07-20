// components/layout/ShareLayout.jsx
// Layout đơn giản không có sidebar — dùng cho trang /share/:shareId.
// Không sidebar vì sidebar trỏ vào userId=1 hardcode, sẽ lộ data cá nhân
// nếu người lạ bấm vào Library/Profile.

import { Outlet } from "react-router-dom";
import logoFull from "../../assets/logos/logo.png";

export default function ShareLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Topbar tối giản */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 flex-shrink-0">
        <img src={logoFull} alt="FStudy" className="h-8 object-contain" />
        <span className="ml-3 text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          Shared Document
        </span>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
