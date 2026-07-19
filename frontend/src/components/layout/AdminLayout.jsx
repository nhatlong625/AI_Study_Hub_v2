import { Outlet } from 'react-router-dom';
import { useSidebar, SidebarContext } from '../../hooks/useSidebar';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';

function AdminLayout() {
  const sidebar = useSidebar();

  return (
    <SidebarContext.Provider value={sidebar}>
      <div
        className="flex h-screen bg-[#f7f5fc] overflow-hidden"
        style={{ '--sidebar-w': sidebar.collapsed ? '60px' : '234px' }}
      >
        <div style={{ width: sidebar.collapsed ? '60px' : '234px', flexShrink: 0, transition: 'width 0.25s ease', height: '100vh', position: 'relative' }}>
          <AdminSidebar />
        </div>
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <AdminTopbar />
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

export default AdminLayout;
