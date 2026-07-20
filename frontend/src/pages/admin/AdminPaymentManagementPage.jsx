import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';

const PLAN_CFG = {
  PRO:  { bg: '#ede9fe', color: '#7c3aed' },
  PLUS: { bg: '#dbeafe', color: '#1d4ed8' },
};

function Avatar({ member }) {
  if (member.avatar) {
    return <img src={member.avatar} alt={member.name} className="pm-avatar-img" />;
  }
  return (
    <div className="pm-avatar-init" style={{ background: member.avatarBg, color: member.avatarColor }}>
      {member.initials}
    </div>
  );
}

function TabToggle({ tab, setTab }) {
  return (
    <div style={{ display: 'flex', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden', height: 34, flexShrink: 0 }}>
      {['monthly', 'yearly'].map(t => (
        <button key={t} onClick={() => setTab(t)} style={{
          padding: '0 18px', fontSize: 13,
          fontWeight: tab === t ? 600 : 400,
          background: tab === t ? '#4f46e5' : '#fff',
          color: tab === t ? '#fff' : '#6b7280',
          border: 'none', cursor: 'pointer', transition: 'all 0.15s',
          textTransform: 'capitalize',
        }}>{t}</button>
      ))}
    </div>
  );
}

function PlanRow({ planKey, tab, setTab, price, setPrice, discount, setDiscount, saved, title, desc, isSaving, onSave }) {
  return (
    <div className="pm-plan-row">
      <div className="pm-plan-info">
        <div className="pm-plan-name">{title}</div>
        <div className="pm-plan-desc">{desc}</div>
      </div>
      <div className="pm-plan-controls">
        <TabToggle tab={tab} setTab={setTab} />
        <div className="pm-field-group">
          <label className="pm-field-label">PRICE (VND)</label>
          <input type="number" className="pm-price-input" value={price} onChange={e => setPrice(e.target.value)} />
        </div>
        <div className="pm-field-group">
          <label className="pm-field-label">DISCOUNT (%)</label>
          <input type="number" min="0" max="100" className="pm-price-input" value={discount} onChange={e => setDiscount(e.target.value)} />
        </div>
        <button
          className={`pm-save-btn${saved ? ' pm-save-btn-done' : ''}`}
          disabled={isSaving === planKey}
          onClick={() => onSave(planKey)}
        >
          {isSaving === planKey ? 'Saving...' : saved ? 'Saved' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

function PaymentManagementPage() {
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({ totalRevenue: 0, activeSubscriptions: 0, pendingInvoices: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState('');
  const [error, setError] = useState('');

  const [plusMonthly,         setPlusMonthly]         = useState('999');
  const [plusMonthlyDiscount, setPlusMonthlyDiscount] = useState('0');
  const [plusYearly,          setPlusYearly]          = useState('9990');
  const [plusYearlyDiscount,  setPlusYearlyDiscount]  = useState('0');
  const [plusTab,             setPlusTab]             = useState('monthly');
  const [savedPlus,           setSavedPlus]           = useState(false);

  const [proMonthly,         setProMonthly]         = useState('9999');
  const [proMonthlyDiscount, setProMonthlyDiscount] = useState('0');
  const [proYearly,          setProYearly]          = useState('99990');
  const [proYearlyDiscount,  setProYearlyDiscount]  = useState('0');
  const [proTab,             setProTab]             = useState('monthly');
  const [savedPro,           setSavedPro]           = useState(false);

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await adminService.getPayments();
      setMembers(data.members || []);
      setStats(data.stats || { totalRevenue: 0, activeSubscriptions: 0, pendingInvoices: 0 });

      const plus = data.plans?.find(p => p.plan === 'PLUS');
      const pro  = data.plans?.find(p => p.plan === 'PRO');
      if (plus) {
        const isYearly = plus.billing === 'Yearly';
        setPlusMonthly(isYearly ? '999' : String(plus.price ?? 999));
        setPlusMonthlyDiscount('0');
        setPlusYearly(isYearly ? String(plus.price ?? 9990) : '9990');
        setPlusYearlyDiscount('0');
        setPlusTab(isYearly ? 'yearly' : 'monthly');
      }
      if (pro) {
        const isYearly = pro.billing === 'Yearly';
        setProMonthly(isYearly ? '9999' : String(pro.price ?? 9999));
        setProMonthlyDiscount('0');
        setProYearly(isYearly ? String(pro.price ?? 99990) : '99990');
        setProYearlyDiscount('0');
        setProTab(isYearly ? 'yearly' : 'monthly');
      }
    } catch (err) {
      setError(err.message || 'Could not load payments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
    const onVisible = () => { if (document.visibilityState === 'visible') loadPayments(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const handleSave = async (plan) => {
    const isPlus = plan === 'PLUS';
    try {
      setIsSaving(plan);
      setError('');
      const payload = {
        price: isPlus ? (plusTab === 'monthly' ? plusMonthly : plusYearly) : (proTab === 'monthly' ? proMonthly : proYearly),
        billing: isPlus ? (plusTab === 'monthly' ? 'Monthly' : 'Yearly') : (proTab === 'monthly' ? 'Monthly' : 'Yearly'),
      };
      const updatedPlan = await adminService.updatePaymentPlan(plan, payload);
      
      const isYearly = updatedPlan.billing === 'Yearly';
      if (isPlus) {
        setPlusMonthly(isYearly ? plusMonthly : String(updatedPlan.price ?? plusMonthly));
        setPlusYearly(isYearly ? String(updatedPlan.price ?? plusYearly) : plusYearly);
        setSavedPlus(true);
        setTimeout(() => setSavedPlus(false), 1800);
      } else {
        setProMonthly(isYearly ? proMonthly : String(updatedPlan.price ?? proMonthly));
        setProYearly(isYearly ? String(updatedPlan.price ?? proYearly) : proYearly);
        setSavedPro(true);
        setTimeout(() => setSavedPro(false), 1800);
      }
    } catch (err) {
      setError(err.message || 'Could not save plan pricing.');
    } finally {
      setIsSaving('');
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(amount || 0);

  return (
    <div className="pm-page">

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 }}>
        <h1 className="pm-page-title" style={{ margin: 0 }}>Payment Management</h1>
        <button
          onClick={loadPayments}
          disabled={isLoading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb',
            background: '#fff', cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: 13, color: '#374151', opacity: isLoading ? 0.6 : 1,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }}>
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div className="pm-stats-row">
        <div className="pm-stat-card">
          <div className="pm-stat-label">TOTAL REVENUE</div>
          <div className="pm-stat-value">{formatCurrency(stats.totalRevenue)}</div>
        </div>
        <div className="pm-stat-card">
          <div className="pm-stat-label">ACTIVE SUBSCRIPTIONS</div>
          <div className="pm-stat-value">{stats.activeSubscriptions}</div>
        </div>
        <div className="pm-stat-card">
          <div className="pm-stat-label">PENDING INVOICES</div>
          <div className="pm-stat-value">{stats.pendingInvoices}</div>
        </div>
      </div>

      {error && <div className="dm-empty" style={{ color: '#dc2626' }}>{error}</div>}

      <div className="pm-section-card">
        <div className="pm-members-header">
          <h2 className="pm-section-title" style={{ margin: 0 }}>Subscribed Members</h2>
          <button className="pm-export-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Export List
          </button>
        </div>

        {isLoading && <div className="dm-empty">Loading payments...</div>}
        {!isLoading && (
        <table className="pm-table">
          <thead>
            <tr>
              <th>MEMBER</th><th>PLAN</th><th>STATUS</th><th>BILLING CYCLE</th><th>PAYMENT DATE</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => {
              const pc = PLAN_CFG[m.plan] || {};
              return (
                <tr key={m.id} className="pm-row">
                  <td>
                    <div className="pm-member-cell">
                      <Avatar member={m} />
                      <div>
                        <div className="pm-member-name">{m.name}</div>
                        <div className="pm-member-email">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="pm-plan-badge" style={{ background: pc.bg, color: pc.color }}>{m.plan}</span>
                  </td>
                  <td>
                    <span className={`pm-status${m.status === 'Active' ? ' pm-status-active' : ' pm-status-expired'}`}>
                      <span className="pm-status-dot" />{m.status}
                    </span>
                  </td>
                  <td className="pm-cell-muted">{m.billing}</td>
                  <td className="pm-cell-muted">{m.paymentDate}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}

export default PaymentManagementPage;
