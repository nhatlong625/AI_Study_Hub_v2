import { useEffect, useState } from 'react';
import SubscriptionSettings from '../../components/admin/SubscriptionSettings';
import { adminService } from '../../services/adminService';

export default function AdminPlanManagementPage() {
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');

  const loadMembers = async () => {
    try { const data = await adminService.getPlanSubscriptions(); setMembers(Array.isArray(data) ? data : []); }
    catch (err) { setError(err.message || 'Could not load subscriptions.'); }
  };
  useEffect(() => { loadMembers(); }, []);

  const updatePolicy = async (subscription, policy) => {
    setSaving(subscription.id); setError('');
    try {
      await adminService.updateRenewalPolicy(subscription.id, policy);
      setMembers(prev => prev.map(item => item.id === subscription.id ? { ...item, renewalPolicy: policy } : item));
    } catch (err) { setError(err.message || 'Could not update renewal policy.'); }
    finally { setSaving(''); }
  };

  return <div className="as-page">
    <div><h1 className="as-page-title">Plan Management</h1><p className="as-page-sub">Manage payment pricing, immutable benefit versions, grandfathering and renewal behavior.</p></div>
    <div style={{ background:'#eef2ff', border:'1px solid #c7d2fe', color:'#3730a3', padding:16, borderRadius:12 }}>
      <strong>Paid plans (Plus, Pro):</strong> new purchases use the active version; existing subscriptions keep the version they paid for until their renewal policy moves them forward.
      <div style={{ marginTop:6 }}><strong>Basic:</strong> the free plan every account starts on. It is not grandfathered — all Basic accounts always follow the active version, so editing it takes effect for existing users too.</div>
    </div>
    <SubscriptionSettings />
    <div className="as-section">
      <div className="as-section-header"><div className="as-section-icon">↻</div><div><h2 className="as-section-title">Renewal & Grandfathering Policy</h2><p className="as-section-desc">Choose whether each subscriber keeps the purchased version or adopts the latest active version on renewal.</p></div></div>
      <div className="as-section-body">
        {error && <div style={{ color:'#dc2626', marginBottom:12 }}>{error}</div>}
        <div style={{ overflowX:'auto' }}><table style={{ width:'100%', borderCollapse:'collapse' }}><thead><tr>{['User','Plan / Version','Status','Renewal Policy'].map(label => <th key={label} style={{ textAlign:'left', padding:10, borderBottom:'1px solid #e5e7eb', fontSize:12, color:'#6b7280' }}>{label}</th>)}</tr></thead><tbody>
          {members.map(member => <tr key={member.id}><td style={{ padding:10, borderBottom:'1px solid #f3f4f6' }}><strong>{member.name}</strong><div style={{ fontSize:12, color:'#6b7280' }}>{member.email}</div></td><td style={{ padding:10, borderBottom:'1px solid #f3f4f6' }}>{member.plan} / v{member.versionNo || 1}</td><td style={{ padding:10, borderBottom:'1px solid #f3f4f6' }}>{member.status}</td><td style={{ padding:10, borderBottom:'1px solid #f3f4f6' }}><select className="as-form-input" disabled={saving===member.id} value={member.renewalPolicy || 'KEEP_VERSION'} onChange={e => updatePolicy(member,e.target.value)}><option value="KEEP_VERSION">Keep purchased version</option><option value="LATEST_VERSION">Move to latest on renewal</option></select></td></tr>)}
          {members.length===0 && <tr><td colSpan="4" style={{ padding:18, color:'#6b7280', textAlign:'center' }}>No subscriptions yet.</td></tr>}
        </tbody></table></div>
      </div>
    </div>
  </div>;
}
