import { Link } from 'react-router-dom';
import logoImg from '../../assets/logos/logo.png';


function PublicFooter() {
  return (
    <footer className="footer">
      {/* Upper Footer Grid */}
      <div className="landing-footer-grid">
        {/* Brand Summary Column */}
        <div className="landing-footer-brand">
          <div className="login-modal-logo" style={{ justifyContent: 'flex-start', marginBottom: '16px' }}>
            <img
              src={logoImg}
              alt="FSTUDY"
              style={{
                height: '42px',
                objectFit: 'contain',
                mixBlendMode: 'multiply',
                transition: 'transform 0.2s ease',
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            />
          </div>
          <p className="landing-footer-desc">
            The leading AI document management platform for the modern student.
          </p>
        </div>

        {/* Product Column */}
        <div className="landing-footer-column">
          <h4 className="landing-footer-title">Product</h4>
          <div className="landing-footer-links">
            <Link to="/features" className="landing-footer-link">AI Features</Link>
            <Link to="/pricing" className="landing-footer-link">Pricing</Link>
            <Link to="/enterprise" className="landing-footer-link">Enterprise</Link>
          </div>
        </div>

        {/* Support Column */}
        <div className="landing-footer-column">
          <h4 className="landing-footer-title">Support</h4>
          <div className="landing-footer-links">
            <Link to="/guide" className="landing-footer-link">Help Center</Link>
            <Link to="/docs" className="landing-footer-link">API Docs</Link>
            <Link to="/community" className="landing-footer-link">Community</Link>
          </div>
        </div>

        {/* Company Column */}
        <div className="landing-footer-column">
          <h4 className="landing-footer-title">Company</h4>
          <div className="landing-footer-links">
            <Link to="/about" className="landing-footer-link">About Us</Link>
            <Link to="/blog" className="landing-footer-link">Blog</Link>
            <Link to="/careers" className="landing-footer-link">Careers</Link>
          </div>
        </div>
      </div>

      {/* Bottom Copyright and Meta Links */}
      <div className="footer-inner" style={{ borderTop: '1px solid rgba(124, 58, 237, 0.08)', padding: '24px 0' }}>
        <p className="muted" style={{ margin: 0, fontSize: '0.88rem' }}>
          © 2026 FSTUDY. All rights reserved.
        </p>
        <div className="nav-links" style={{ gap: '24px' }}>
          <Link to="/terms" className="nav-link" style={{ fontSize: '0.88rem' }}>Terms</Link>
          <Link to="/privacy" className="nav-link" style={{ fontSize: '0.88rem' }}>Privacy</Link>
          <Link to="/security" className="nav-link" style={{ fontSize: '0.88rem' }}>Security</Link>
        </div>
      </div>
    </footer>
  );
}

export default PublicFooter;
