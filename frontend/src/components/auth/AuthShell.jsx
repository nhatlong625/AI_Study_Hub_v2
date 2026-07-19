import Card from '../common/Card';

function AuthShell({ title, description, children, footer }) {
  return (
    <div className="auth-shell">
      <Card className="auth-card" title={title} description={description}>
        <div className="section-stack">{children}</div>
        {footer && <div style={{ marginTop: 18 }}>{footer}</div>}
      </Card>
    </div>
  );
}

export default AuthShell;
