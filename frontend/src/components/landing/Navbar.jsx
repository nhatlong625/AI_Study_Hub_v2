import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logoFull from "../../assets/logos/logo.png";

const NAV_LINKS = [
  { label: "Features", path: "/features" },
  { label: "Guide", path: "/guide" },
  { label: "Pricing", path: "/pricing" },
];

export default function Navbar() {
  const location = useLocation();

  // Map path → label để tự detect active mà không cần state thủ công
  const activeLabel =
    NAV_LINKS.find((l) => l.path === location.pathname)?.label ?? null;

  const [hovered, setHovered] = useState(null);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 48px",
        height: "68px",
        background: "#fff",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(99,82,229,0.08)",
      }}
    >
      <Link to="/">
        <img
          src={logoFull}
          alt="FStudy"
          style={{ height: "52px", objectFit: "contain" }}
        />
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {NAV_LINKS.map(({ label, path }) => {
          const isActive = activeLabel === label;
          return (
            <Link
              key={label}
              to={path}
              style={{
                padding: "8px 16px",
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: isActive ? "700" : "500",
                color: isActive ? "#5046e5" : "#474554",
                borderBottom: isActive
                  ? "2px solid #5046e5"
                  : "2px solid transparent",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <Link
          to="/login"
          style={{
            padding: "10px 22px",
            borderRadius: "99px",
            border: "1.5px solid #d4cdf5",
            fontSize: "15px",
            fontWeight: "600",
            color: "#5046e5",
            textDecoration: "none",
            transition: "opacity 0.15s, transform 0.15s",
            opacity: hovered === "login" ? 0.7 : 1,
            transform: hovered === "login" ? "translateY(-1px)" : "",
          }}
          onMouseEnter={() => setHovered("login")}
          onMouseLeave={() => setHovered(null)}
        >
          Log in
        </Link>
        <Link
          to="/register"
          style={{
            padding: "12px 28px",
            borderRadius: "99px",
            background: "linear-gradient(135deg, #6352e5 0%, #4c45e5 100%)",
            color: "#fff",
            fontSize: "15px",
            fontWeight: "600",
            textDecoration: "none",
            boxShadow: "0 4px 14px rgba(80,70,229,0.3)",
            transition: "opacity 0.15s, transform 0.15s",
            opacity: hovered === "cta" ? 0.9 : 1,
            transform: hovered === "cta" ? "translateY(-1px)" : "",
          }}
          onMouseEnter={() => setHovered("cta")}
          onMouseLeave={() => setHovered(null)}
        >
          Get started
        </Link>
      </div>
    </nav>
  );
}
