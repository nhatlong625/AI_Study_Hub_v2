import { NavLink } from 'react-router-dom';
import logoImg from '../../assets/logos/logo.png';

function PublicNavbar() {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <NavLink className="brand" to="/" style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src={logoImg}
            alt="FSTUDY"
            style={{
              height: '46px',
              objectFit: 'contain',
              mixBlendMode: 'multiply',
              transition: 'transform 0.2s ease',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          />
        </NavLink>
        <nav className="nav-links">
          <NavLink className="nav-link" to="/">Home</NavLink>
          <NavLink className="nav-link" to="/guide">Guide</NavLink>
          <NavLink className="nav-link" to="/pricing">Pricing</NavLink>
        </nav>
        <div className="inline-actions">
          <NavLink className="btn btn-ghost" to="/login">Log in</NavLink>
          <NavLink className="btn btn-primary" to="/register">Get started</NavLink>
        </div>
      </div>
    </header>
  );
}

export default PublicNavbar;