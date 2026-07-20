import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import logoImg from "../../assets/logos/logo.png";
import logoIcon from "../../assets/logos/logo-icon.png";
import { useSidebarContext } from "../../hooks/useSidebar";
import UpgradePricingModal from "../student/UpgradePricingModal";




const mainItems = [
  {
    slug: "home",
    label: "Home",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    slug: "ai-tutor",
    label: "AI Tutor",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    slug: "library",
    label: "Library",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    slug: "shared-with-me",
    label: "Shared with me",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    slug: "practice-tests",
    label: "Practice Tests",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="M9 14h6" />
        <path d="M9 18h6" />
        <path d="M9 10h.01" />
      </svg>
    ),
  },
];

function StudentSidebar({ history = [], onHistoryClick, onClearHistory }) {
  const { collapsed, toggle } = useSidebarContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // Auto-open upgrade modal when redirected from PricingPage → Login with ?upgrade=1
  useEffect(() => {
    if (searchParams.get("upgrade") === "1") {
      setShowUpgradeModal(true);
      // Remove the query param to avoid re-opening on future navigations
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("upgrade");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [userInfo, setUserInfo] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      return { fullName: stored.fullName || stored.name || "Student", avatarUrl: stored.avatarUrl || null };
    } catch { return { fullName: "Student", avatarUrl: null }; }
  });

  useEffect(() => {
    const handler = (e) => {
      setUserInfo((prev) => ({
        ...prev,
        ...(e.detail.avatarUrl ? { avatarUrl: e.detail.avatarUrl } : {}),
        ...(e.detail.fullName ? { fullName: e.detail.fullName } : {}),
      }));
    };
    window.addEventListener("user-profile-updated", handler);
    return () => window.removeEventListener("user-profile-updated", handler);
  }, []);

  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("rememberMe");
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  const homeRelatedPaths = ["/student/home", "/student/courses/"];
  const isHomeActive = homeRelatedPaths.some((p) =>
    location.pathname.startsWith(p),
  );

  return (
    <>
    <aside
      style={{
        width: "100%",
        height: "100%",
        background: "#ffffff",
        borderRight: "1px solid #f1eff5",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: collapsed ? "12px 4px 16px" : "8px 16px 20px",
          display: "flex",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <NavLink
          to="/student/home"
          aria-label="Go to Home"
          title="Home"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          {collapsed ? (
            <img
              src={logoIcon}
              alt="F"
              style={{ height: "48px", width: "48px", objectFit: "contain" }}
            />
          ) : (
            <img
              src={logoImg}
              alt="StudyHub"
              style={{ height: "52px", objectFit: "contain" }}
            />
          )}
        </NavLink>
      </div>

      {/* Main label + toggle */}
      <div
        style={{
          padding: "0 16px 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {!collapsed && (
          <span
            style={{
              fontSize: "12px",
              fontWeight: "800",
              color: "#6366f1",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
            }}
          >
            Main
          </span>
        )}
        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            borderRadius: "6px",
            color: "#4f46e5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginLeft: collapsed ? "auto" : "0",
            marginRight: collapsed ? "auto" : "0",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#ede9fe")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
      </div>

      {/* Nav items */}
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          padding: "0 8px",
        }}
      >
        {mainItems.map((item) => (
          <NavLink
            key={item.slug}
            to={"/student/" + item.slug}
            title={collapsed ? item.label : undefined}
            className={() => {
              const active =
                item.slug === "home"
                  ? isHomeActive
                  : location.pathname.startsWith("/student/" + item.slug);
              return active ? "nav-active" : "nav-inactive";
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: collapsed ? "10px" : "10px 12px",
              borderRadius: "8px",
              minHeight: "39px",
              textDecoration: "none",
              fontSize: "13.5px",
              fontWeight: "500",
              lineHeight: "1.25",
              transition: "all 0.2s ease",
              justifyContent: collapsed ? "center" : "flex-start",
              color: "#474554",
            }}
          >
            <span
              style={{
                width: "19px",
                height: "19px",
                minWidth: "19px",
                borderRadius: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                color: "currentColor",
                flexShrink: 0,
              }}
            >
              {item.icon}
            </span>
            {!collapsed && (
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* History */}
      {!collapsed && (
        <div
          style={{
            marginTop: "24px",
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "0 16px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: "800",
                color: "#6366f1",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
              }}
            >
              History
            </span>
            {history?.length > 0 && (
              <button
                onClick={onClearHistory}
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#fff",
                  background: "#ef4444",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  padding: "2px 8px",
                }}
              >
                Clear
              </button>
            )}
          </div>
          <div style={{ padding: "0 8px", flex: 1, overflowY: "auto" }}>
            {!history?.length ? (
              <span
                style={{
                  fontSize: "12px",
                  color: "#c4c2ce",
                  paddingLeft: "12px",
                }}
              >
                No recent activity
              </span>
            ) : (
              history.map((item, i) => (
                <button
                  key={i}
                  onClick={() => onHistoryClick?.(item)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    width: "100%",
                    minWidth: 0,
                    textAlign: "left",
                    color: "#474554",
                    fontSize: "13px",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f4f0ff")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  <span style={{ color: "#8c8a9e", flexShrink: 0 }}>
                    {item.type === "course" ? (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    ) : (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    )}
                  </span>
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: "12px 8px", marginTop: "auto" }}>
        <div style={{ borderTop: "1px solid #efedf4", margin: "0 8px 12px" }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            gap: "8px",
          }}
        >
          <div ref={userMenuRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowUserMenu((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "8px",
                color: "#1a1926",
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  border: "1px solid #efedf4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {userInfo.avatarUrl ? (
                  <img src={userInfo.avatarUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
                ) : (
                  <img src={logoImg} alt="Profile" style={{ width: "80%", height: "80%", objectFit: "contain" }} />
                )}
              </div>
              {!collapsed && (
                <span style={{ fontSize: "12px", fontWeight: "600" }}>
                  {userInfo.fullName}
                </span>
              )}
            </button>

            {showUserMenu && (
              <div
                style={{
                  position: "absolute",
                  bottom: "calc(100% + 8px)",
                  left: "0",
                  width: "180px",
                  background: "#ffffff",
                  border: "1px solid #ece7f5",
                  borderRadius: "14px",
                  boxShadow: "0 18px 45px rgba(35,31,64,0.14)",
                  padding: "8px",
                  zIndex: 50,
                }}
              >
                {[
                  { label: "Profile", path: "/student/profile", icon: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />, icon2: <circle cx="12" cy="7" r="4" /> },
                  { label: "Settings", path: "/student/settings", icon: <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />, icon2: <circle cx="12" cy="12" r="3" /> },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => { setShowUserMenu(false); navigate(item.path); }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "9px 12px",
                      border: "none",
                      borderRadius: "10px",
                      background: "transparent",
                      color: "#1a1926",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f0ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {item.icon}{item.icon2}
                    </svg>
                    {item.label}
                  </button>
                ))}
                <div style={{ borderTop: "1px solid #f0edf8", margin: "4px 0" }} />
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "9px 12px",
                    border: "none",
                    borderRadius: "10px",
                    background: "transparent",
                    color: "#dc2626",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fff1f2")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setShowUpgradeModal(true)}
              style={{
                background: "#eef1f8",
                color: "#5046e5",
                border: "none",
                borderRadius: "12px",
                padding: "6px 10px",
                fontSize: "11px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Upgrade
            </button>
          )}
        </div>
      </div>
    </aside>
    <UpgradePricingModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
    </>
  );
}

export default StudentSidebar;
