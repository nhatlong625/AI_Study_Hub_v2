import { Link } from "react-router-dom";
import logoFull from "../../assets/logos/logo.png";

const footerLinks = {
  PRODUCT: ["AI Features", "Pricing", "Enterprise"],
  SUPPORT: ["Help Center", "API Docs", "Community"],
  COMPANY: ["About Us", "Blog", "Careers"],
};

export default function Footer() {
  return (
    <footer
      style={{
        background: "#fff",
        padding: "60px 48px 32px",
        borderTop: "1px solid #ece8f5",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: "40px",
          marginBottom: "48px",
        }}
      >
        <div>
          <Link to="/" style={{ display: "inline-block", marginLeft: "-20px" }}>
            <img
              src={logoFull}
              alt="FStudy"
              style={{
                height: "56px",
                marginBottom: "16px",
                objectFit: "contain",
              }}
            />
          </Link>
          <p
            style={{
              fontSize: "15px",
              color: "#6b6880",
              lineHeight: "1.7",
              margin: "0 0 24px",
            }}
          >
            The leading AI document management
            <br />
            platform for the modern student.
          </p></div>

        {Object.entries(footerLinks).map(([group, links]) => (
          <div key={group}>
            <div
              style={{
                fontSize: "17px",
                fontWeight: "800",
                color: "#1a1637",
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: "24px",
              }}
            >
              {group}
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {links.map((link) => (
                <a
                  key={link}
                  href="#"
                  style={{
                    fontSize: "15px",
                    color: "#474554",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => (e.target.style.color = "#5046e5")}
                  onMouseLeave={(e) => (e.target.style.color = "#474554")}
                >
                  {link}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "24px",
          borderTop: "1px solid #ece8f5",
          fontSize: "14px",
          color: "#6b6880",
        }}
      >
        <span>© 2026 FSTUDY. All rights reserved.</span>
        <div style={{ display: "flex", gap: "32px" }}>
          {["Terms", "Privacy", "Security"].map((l) => (
            <a
              key={l}
              href="#"
              style={{ color: "#6b6880", textDecoration: "none" }}
              onMouseEnter={(e) => (e.target.style.color = "#5046e5")}
              onMouseLeave={(e) => (e.target.style.color = "#6b6880")}
            >
              {l}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
