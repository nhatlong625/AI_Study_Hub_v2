import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationPanel from '../common/NotificationPanel';
import useUnreadNotifications from '../../hooks/useUnreadNotifications';
import logoImg from '../../assets/logos/logo.png';

export default function AdminTopbar() {
  const [showNotifications, setShowNotifications] = useState(false);
  const { hasUnread, setUnreadCount } = useUnreadNotifications();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('rememberMe');
    sessionStorage.clear();
    setShowProfileMenu(false);
    navigate('/login', { replace: true });
  };

  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between gap-5 px-7 py-4 bg-white border-b border-[#f1eff5]"
    >
      {/* Search */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '480px' }}>
        <svg
          style={{ position: 'absolute', left: '20px', color: '#8c8a9e', pointerEvents: 'none' }}
          xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <input
          type="text"
          placeholder="Search users, documents, or settings..."
          style={{
            width: '100%',
            padding: '12px 20px 12px 48px',
            border: 'none',
            borderRadius: '9999px',
            backgroundColor: '#f1f3f9',
            color: '#1a1926',
            fontSize: '13px',
            outline: 'none',
            transition: 'all 0.2s ease',
          }}
        />
      </div>

      {/* Right */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <button
            onClick={() => setShowNotifications(v => !v)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '6px', borderRadius: '50%',
            }}
            type="button"
            aria-label="Notifications"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="#474554" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
          </button>
          {hasUnread && (
            <span style={{
              position: 'absolute', top: '6px', right: '6px',
              width: '8px', height: '8px',
              backgroundColor: '#e1261c', borderRadius: '50%',
              border: '1.5px solid #ffffff', pointerEvents: 'none',
            }}/>
          )}
          {showNotifications && (
            <NotificationPanel
              onClose={() => setShowNotifications(false)}
              onUnreadChange={setUnreadCount}
            />
          )}
        </div>

        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(v => !v)}
            aria-haspopup="menu"
            aria-expanded={showProfileMenu}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '4px 8px 4px 4px',
              border: 'none',
              borderRadius: '999px',
              background: showProfileMenu ? '#f7f5ff' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.18s ease',
            }}
          >
            <div className="w-9 h-9 rounded-full bg-[#f0edff] border border-[#ece7f5] flex items-center justify-center overflow-hidden">
              <img src={logoImg} alt="Avatar" className="w-4/5 h-4/5 object-contain"/>
            </div>
            <div className="flex flex-col leading-snug text-left">
              <span className="text-[13px] font-bold text-[#1a1926]">Admin</span>
              <span className="text-[11px] font-medium text-[#8c8a9e]">Super Admin</span>
            </div>
          </button>

          {showProfileMenu && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: '184px',
                padding: '8px',
                background: '#ffffff',
                border: '1px solid #ece7f5',
                borderRadius: '14px',
                boxShadow: '0 18px 45px rgba(35, 31, 64, 0.14)',
                zIndex: 40,
              }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  border: 'none',
                  borderRadius: '10px',
                  background: 'transparent',
                  color: '#dc2626',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}