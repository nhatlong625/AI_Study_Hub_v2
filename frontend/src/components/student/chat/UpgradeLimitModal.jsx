import Button from '../../common/Button';

function UpgradeLimitModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--surface)', borderRadius: '8px', width: '400px', maxWidth: '90vw', padding: '32px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <div style={{ width: '64px', height: '64px', background: 'var(--warning-light, #fff3cd)', color: 'var(--warning, #856404)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </div>
        <h3 style={{ margin: '0 0 12px 0' }}>AI Usage Limit Reached</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
          You've reached your free AI message limit for today. Upgrade your plan to get unlimited AI tutoring and faster response times.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Button style={{ width: '100%' }}>View Upgrade Plans</Button>
          <Button variant="secondary" onClick={onClose} style={{ width: '100%' }}>Maybe Later</Button>
        </div>
      </div>
    </div>
  );
}

export default UpgradeLimitModal;
