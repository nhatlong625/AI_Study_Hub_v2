import { NavLink, useLocation } from "react-router-dom";
import logoImg from "../../assets/logos/logo.png";
import logoIcon from "../../assets/logos/logo-icon.png";
import { useSidebarContext } from "../../hooks/useSidebar";

const NAV_ITEMS = [
  {
    slug: "dashboard",
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
    slug: "users",
    label: "User Management",
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
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    slug: "library",
    label: "Library Management",
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
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
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
  {
    slug: "documents",
    label: "Document Management",
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
    slug: "payments",
    label: "Payment",
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
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    slug: "plans",
    label: "Plan Management",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12V8H4v8h8" /><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M16 16h6M19 13v6" />
      </svg>
    ),
  },
  {
    slug: "settings",
    label: "Admin Settings",
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
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

function AdminSidebar() {
  const { collapsed, toggle } = useSidebarContext();
  const location = useLocation();

  return (
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
          to="/admin/dashboard"
          aria-label="Go to Admin Dashboard"
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

      {/* Label + Toggle */}
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
            Admin
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

      {/* Nav */}
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          padding: "0 8px",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            location.pathname === "/admin/" + item.slug ||
            location.pathname.startsWith("/admin/" + item.slug + "/");
          return (
            <NavLink
              key={item.slug}
              to={"/admin/" + item.slug}
              title={collapsed ? item.label : undefined}
              className={() => (isActive ? "nav-active" : "nav-inactive")}
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
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
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
          );
        })}
      </nav>

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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
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
              <img
                src={logoImg}
                alt="Admin"
                style={{ width: "80%", height: "80%", objectFit: "contain" }}
              />
            </div>
            {!collapsed && (
              <span style={{ fontSize: "12px", fontWeight: "600" }}>Admin</span>
            )}
          </div>
          {!collapsed && (
            <button
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
              Super Admin
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

export default AdminSidebar;
