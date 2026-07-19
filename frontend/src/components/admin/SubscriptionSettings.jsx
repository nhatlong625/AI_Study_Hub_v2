import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';

const SUGGESTED_FEATURES = {
  BASIC: [
    { label: 'Free plan for starter usage.', included: true },
    { label: 'Priority support', included: false },
    { label: 'Advanced AI models', included: false },
  ],
  PLUS: [
    { label: 'Priority email support', included: true },
    { label: 'Smart citation generator', included: true },
  ],
  PRO: [
    { label: 'Advanced AI models', included: true },
    { label: 'Offline mode & sync', included: true },
    { label: '24/7 dedicated support', included: true },
  ],
};

export default function SubscriptionSettings() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
  const [subscriberModal, setSubscriberModal] = useState(null);
  const [subscriberLoading, setSubscriberLoading] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [newPlan, setNewPlan] = useState({
    planName: '',
    price: 0,
    durationMonth: 1,
    monthlyDiscount: 0,
    yearlyDiscount: 0,
    maxStorage: 1024,
    maxQuiz: 10,
    features: [{ label: 'New plan benefit', included: true }],
  });

  const loadPlans = async () => {
    setLoading(true);
    try {
      const rows = await adminService.getPlanVersions();
      const grouped = rows.reduce((acc, row) => {
        acc[row.plan] ||= { code: row.plan, versions: [] };
        if (row.versionId) acc[row.plan].versions.push(row);
        return acc;
      }, {});
      setPlans(Object.values(grouped).map(group => {
        const active = group.versions.find(version => version.isActive) || group.versions[0] || {};
        let features = [];
        try { features = JSON.parse(active.featuresJson || '[]'); } catch { features = []; }
        return { ...group, ...active, features };
      }));
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load plan versions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlans(); }, []);

  const change = (code, field, value) => setPlans(prev => prev.map(plan =>
    plan.code === code ? { ...plan, [field]: value } : plan));
  const changeNewPlan = (field, value) => setNewPlan(prev => ({ ...prev, [field]: value }));
  const featureChange = (code, index, field, value) => setPlans(prev => prev.map(plan => {
    if (plan.code !== code) return plan;
    const features = [...plan.features];
    features[index] = { ...features[index], [field]: value };
    return { ...plan, features };
  }));
  const newPlanFeatureChange = (index, field, value) => setNewPlan(prev => {
    const features = [...(prev.features || [])];
    features[index] = { ...features[index], [field]: value };
    return { ...prev, features };
  });

  const save = async plan => {
    setSaving(plan.code); setError(''); setSuccess('');
    try {
      await adminService.updatePaymentPlan(plan.code, {
        price: Number(plan.price || 0), durationMonth: Number(plan.durationMonth || 1),
        monthlyDiscount: Number(plan.monthlyDiscount || 0), yearlyDiscount: Number(plan.yearlyDiscount || 0),
        maxStorage: Number(plan.maxStorage || 1024), maxQuiz: Number(plan.maxQuiz ?? 10),
        featuresJson: JSON.stringify(plan.features || []),
      });
      await loadPlans();
      setSuccess(`Created a new ${plan.code} version. Existing subscribers keep their purchased benefits.`);
    } catch (err) { setError(err.message || 'Could not create plan version.'); }
    finally { setSaving(''); }
  };

  const createPlan = async () => {
    setSaving('NEW_PLAN'); setError(''); setSuccess('');
    try {
      await adminService.createPaymentPlan({
        planName: newPlan.planName,
        price: Number(newPlan.price || 0),
        durationMonth: Number(newPlan.durationMonth || 1),
        monthlyDiscount: Number(newPlan.monthlyDiscount || 0),
        yearlyDiscount: Number(newPlan.yearlyDiscount || 0),
        maxStorage: Number(newPlan.maxStorage || 1024),
        maxQuiz: Number(newPlan.maxQuiz ?? 10),
        featuresJson: JSON.stringify(newPlan.features || []),
      });
      await loadPlans();
      setSuccess(`Created ${newPlan.planName} plan.`);
      setShowCreatePlan(false);
      setNewPlan({
        planName: '',
        price: 0,
        durationMonth: 1,
        monthlyDiscount: 0,
        yearlyDiscount: 0,
        maxStorage: 1024,
        maxQuiz: 10,
        features: [{ label: 'New plan benefit', included: true }],
      });
    } catch (err) { setError(err.message || 'Could not create plan.'); }
    finally { setSaving(''); }
  };

  const handleDeletePlan = async (planId, planCode) => {
    setSaving(planCode); setError(''); setSuccess('');
    setDeleteConfirmModal(null);
    try {
      await adminService.deletePaymentPlan(planId);
      await loadPlans();
      setSuccess(`Deleted ${planCode} plan successfully.`);
    } catch (err) {
      setError(err.message || `Could not delete ${planCode} plan.`);
    } finally {
      setSaving('');
    }
  };

  const openSubscribers = async (plan, version) => {
    if (!version?.versionId) return;
    const versions = plan.versions || [version];
    setSubscriberModal({ plan: plan.code, versions, version, subscribers: [], error: '' });
    setSubscriberLoading(true);
    try {
      const subscribers = await adminService.getPlanVersionSubscribers(version.versionId);
      setSubscriberModal({ plan: plan.code, versions, version, subscribers: Array.isArray(subscribers) ? subscribers : [], error: '' });
    } catch (err) {
      setSubscriberModal({ plan: plan.code, versions, version, subscribers: [], error: err.message || 'Could not load subscribers.' });
    } finally {
      setSubscriberLoading(false);
    }
  };

  if (loading) return <div className="as-section"><div className="as-section-body">Loading plan versions...</div></div>;
  return <>
  {deleteConfirmModal && <div style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(15,23,42,0.42)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setDeleteConfirmModal(null)}>
    <div style={{ width:'min(440px, 100%)', background:'#fff', borderRadius:14, padding:24, boxShadow:'0 24px 60px rgba(15,23,42,0.24)' }} onClick={event => event.stopPropagation()}>
      <h3 style={{ margin:'0 0 10px', fontSize:18, color:'#111827' }}>Delete {deleteConfirmModal.planCode} Plan?</h3>
      <p style={{ margin:'0 0 20px', fontSize:14, color:'#4b5563', lineHeight:1.5 }}>
        Are you sure you want to delete the <strong>{deleteConfirmModal.planCode}</strong> plan? This will delete all its versions. This action cannot be undone.
      </p>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:12 }}>
        <button
          type="button"
          className="as-test-btn"
          style={{ margin:0 }}
          onClick={() => setDeleteConfirmModal(null)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="as-save-btn"
          style={{ background:'#dc2626', borderColor:'#dc2626', color:'#fff', margin:0 }}
          disabled={saving !== ''}
          onClick={() => handleDeletePlan(deleteConfirmModal.planId, deleteConfirmModal.planCode)}
        >
          {saving !== '' ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  </div>}
  {subscriberModal && <div style={{ position:'fixed', inset:0, zIndex:10000, background:'rgba(15,23,42,0.42)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setSubscriberModal(null)}>
    <div style={{ width:'min(880px, 100%)', maxHeight:'82vh', overflow:'hidden', background:'#fff', borderRadius:14, boxShadow:'0 24px 60px rgba(15,23,42,0.24)' }} onClick={event => event.stopPropagation()}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, padding:'20px 22px', borderBottom:'1px solid #ece8f5' }}>
        <div>
          <h3 style={{ margin:0, fontSize:18, color:'#111827' }}>{subscriberModal.plan} v{subscriberModal.version.versionNo} Subscribers</h3>
          <p style={{ margin:'4px 0 0', fontSize:13, color:'#6b7280' }}>Subscription start and expiry dates for users on this version.</p>
        </div>
        <button type="button" onClick={() => setSubscriberModal(null)} style={{ border:0, background:'transparent', color:'#6b7280', fontSize:24, cursor:'pointer', lineHeight:1 }}>×</button>
      </div>
      <div style={{ padding:22, overflow:'auto', maxHeight:'calc(82vh - 84px)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <label style={{ fontSize:13, fontWeight:700, color:'#374151' }}>Version</label>
          <select
            className="as-form-input"
            style={{ width:220 }}
            value={subscriberModal.version.versionId}
            onChange={event => {
              const nextVersion = (subscriberModal.versions || []).find(version => String(version.versionId) === event.target.value);
              if (nextVersion) openSubscribers({ code: subscriberModal.plan, versions: subscriberModal.versions }, nextVersion);
            }}
          >
            {(subscriberModal.versions || []).map(version => (
              <option key={version.versionId} value={version.versionId}>
                v{version.versionNo}{version.isActive ? ' Active' : ''} - {version.subscriberCount || 0} user(s)
              </option>
            ))}
          </select>
        </div>
        {subscriberLoading && <div style={{ color:'#6b7280' }}>Loading subscribers...</div>}
        {!subscriberLoading && subscriberModal.error && <div style={{ color:'#dc2626', background:'#fee2e2', padding:12, borderRadius:8 }}>{subscriberModal.error}</div>}
        {!subscriberLoading && !subscriberModal.error && <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>{['User','Email','Status','Start Date','End Date','Renewal Policy'].map(label => <th key={label} style={{ textAlign:'left', padding:'10px 8px', borderBottom:'1px solid #e5e7eb', color:'#6b7280', fontSize:12 }}>{label}</th>)}</tr></thead>
          <tbody>
            {subscriberModal.subscribers.map(item => <tr key={item.subscriptionId}>
              <td style={{ padding:'10px 8px', borderBottom:'1px solid #f3f4f6', fontWeight:700, color:'#111827' }}>{item.name || `User ${item.userId}`}</td>
              <td style={{ padding:'10px 8px', borderBottom:'1px solid #f3f4f6', color:'#4b5563' }}>{item.email}</td>
              <td style={{ padding:'10px 8px', borderBottom:'1px solid #f3f4f6', color:item.status === 'Active' ? '#16a34a' : '#f97316', fontWeight:700 }}>{item.status}</td>
              <td style={{ padding:'10px 8px', borderBottom:'1px solid #f3f4f6', color:'#4b5563' }}>{item.startDate || '-'}</td>
              <td style={{ padding:'10px 8px', borderBottom:'1px solid #f3f4f6', color:'#4b5563' }}>{item.endDate || '-'}</td>
              <td style={{ padding:'10px 8px', borderBottom:'1px solid #f3f4f6', color:'#4b5563' }}>{item.renewalPolicy || 'KEEP_VERSION'}</td>
            </tr>)}
            {subscriberModal.subscribers.length === 0 && <tr><td colSpan="6" style={{ padding:18, color:'#6b7280', textAlign:'center' }}>No subscribers on this version.</td></tr>}
          </tbody>
        </table>}
      </div>
    </div>
  </div>}
  <div className="as-section">
    <div className="as-section-header"><div className="as-section-icon">💳</div><div><h2 className="as-section-title">Versioned Subscription Plans</h2><p className="as-section-desc">Saving creates a new immutable version; current subscribers remain grandfathered.</p></div></div>
    <div className="as-section-body">
      {error && <div style={{ color:'#dc2626', background:'#fee2e2', padding:12, borderRadius:8, marginBottom:16 }}>{error}</div>}
      {success && <div style={{ color:'#15803d', background:'#dcfce7', padding:12, borderRadius:8, marginBottom:16 }}>{success}</div>}
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <button type="button" className="as-save-btn" onClick={() => setShowCreatePlan(value => !value)}>{showCreatePlan ? 'Close' : '+ Add Plan'}</button>
      </div>
      {showCreatePlan && <div style={{ border:'1px solid #c7d2fe', background:'#f8faff', borderRadius:12, padding:24, marginBottom:24 }}>
        <h3 style={{ margin:'0 0 6px' }}>Create New Plan</h3>
        <div style={{ color:'#6b7280', fontSize:13, marginBottom:18 }}>New plans use the same versioned structure as existing plans and appear in student upgrade pricing automatically.</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14 }}>
          <div className="as-form-group"><label className="as-form-label">Plan Name</label><input className="as-form-input" value={newPlan.planName} onChange={e => changeNewPlan('planName', e.target.value)} placeholder="Premium"/></div>
          {[['price','Price (VND)',0],['durationMonth','Duration (Months)',1],['maxStorage','Max Storage (MB)',1],['maxQuiz','Max Quizzes/Month',-1]].map(([field,label,min]) => <div className="as-form-group" key={field}><label className="as-form-label">{label}</label><input className="as-form-input" type="number" min={min} value={newPlan[field] ?? 0} onChange={e => changeNewPlan(field, Number(e.target.value))}/></div>)}
          {[['monthlyDiscount','Monthly Discount (%)'],['yearlyDiscount','Yearly Discount (%)']].map(([field,label]) => <div className="as-form-group" key={field}><label className="as-form-label">{label}</label><input className="as-form-input" type="number" min="0" max="100" step="0.01" value={newPlan[field] ?? 0} onChange={e => changeNewPlan(field, Math.min(100, Math.max(0, Number(e.target.value))))}/></div>)}
        </div>
        <div className="as-form-group" style={{ marginTop:18 }}><label className="as-form-label" style={{ display:'flex', justifyContent:'space-between', gap:12 }}>Marketing Features <button type="button" onClick={() => changeNewPlan('features',[...(newPlan.features||[]),{label:'New feature',included:true}])} style={{ border:0, background:'none', color:'#5046e5' }}>+ Add Feature</button></label>
          {(newPlan.features || []).map((feature,index) => <div key={index} style={{ display:'flex', gap:10, marginTop:8 }}><input type="checkbox" checked={feature.included} onChange={e => newPlanFeatureChange(index,'included',e.target.checked)}/><input className="as-form-input" value={feature.label} onChange={e => newPlanFeatureChange(index,'label',e.target.value)}/><button type="button" onClick={() => changeNewPlan('features',newPlan.features.filter((_,i)=>i!==index))}>×</button></div>)}
        </div>
        <div style={{ textAlign:'right', marginTop:18 }}><button className="as-save-btn" disabled={saving==='NEW_PLAN' || !newPlan.planName.trim()} onClick={createPlan}>{saving==='NEW_PLAN'?'Creating Plan...':'Create Plan'}</button></div>
      </div>}
      <div style={{ display:'grid', gap:24 }}>{plans.map(plan => <div key={plan.code} style={{ border:'1px solid #ece8f5', borderRadius:12, padding:24 }}>
        <h3 style={{ margin:'0 0 6px' }}>{plan.code} Plan</h3>
        <button type="button" onClick={() => openSubscribers(plan, plan)} style={{ border:0, background:'transparent', color:'#4f46e5', fontWeight:700, textDecoration:'underline', cursor:'pointer', padding:0, fontSize:13, marginBottom:6 }}>{plan.subscriberCount || 0} subscriber(s) - view expiry dates</button>
        <div style={{ color:'#6b7280', fontSize:13, marginBottom:18 }}>Active <strong>v{plan.versionNo || 1}</strong> · {plan.subscriberCount || 0} subscriber(s) on this version</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14 }}>
          {[['price','Price (VND)',1],['durationMonth','Duration (Months)',1],['maxStorage','Max Storage (MB)',1],['maxQuiz','Max Quizzes/Month',-1]].map(([field,label,min]) => <div className="as-form-group" key={field}><label className="as-form-label">{label}</label><input className="as-form-input" type="number" min={min} value={plan[field] ?? 0} onChange={e => change(plan.code, field, Number(e.target.value))}/></div>)}
          {[['monthlyDiscount','Monthly Discount (%)'],['yearlyDiscount','Yearly Discount (%)']].map(([field,label]) => <div className="as-form-group" key={field}><label className="as-form-label">{label}</label><input className="as-form-input" type="number" min="0" max="100" step="0.01" value={plan[field] ?? 0} onChange={e => change(plan.code, field, Math.min(100, Math.max(0, Number(e.target.value))))}/></div>)}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:12, marginTop:14 }}>
          {[{label:'Monthly customer price', original:Number(plan.price||0), discount:Number(plan.monthlyDiscount||0)}, {label:'Yearly customer price', original:Number(plan.price||0)*12, discount:Number(plan.yearlyDiscount||0)}].map(item => { const finalPrice=Math.round(item.original*(1-item.discount/100)); return <div key={item.label} style={{ background:'#f7f5ff', border:'1px solid #e6e0ff', borderRadius:10, padding:14 }}><div style={{ color:'#6b7280', fontSize:12 }}>{item.label}</div><div style={{ display:'flex', alignItems:'baseline', flexWrap:'wrap', gap:'4px 8px', marginTop:6, lineHeight:1.25 }}>{item.discount>0 && <span style={{ color:'#9ca3af', fontSize:15, fontWeight:500, textDecoration:'line-through' }}>{item.original.toLocaleString('vi-VN')}₫</span>}<strong style={{ color:'#5046e5', fontSize:19, fontWeight:700, letterSpacing:'-0.01em' }}>{finalPrice.toLocaleString('vi-VN')}₫</strong>{item.discount>0 && <span style={{ color:'#15803d', fontSize:12, fontWeight:700 }}>-{item.discount}%</span>}</div></div>; })}
        </div>
        <div className="as-form-group" style={{ marginTop:18 }}><label className="as-form-label" style={{ display:'flex', justifyContent:'space-between', gap:12 }}>Marketing Features <span style={{ display:'flex', gap:12 }}><button type="button" title="Replace the current list with the suggested features for this plan" onClick={() => change(plan.code,'features',(SUGGESTED_FEATURES[plan.code]||[]).map(feature=>({...feature})))} style={{ border:0, background:'none', color:'#7c3aed' }}>Load Suggested Features</button><button type="button" onClick={() => change(plan.code,'features',[...(plan.features||[]),{label:'New feature',included:true}])} style={{ border:0, background:'none', color:'#5046e5' }}>+ Add Feature</button></span></label>
          <div style={{ color:'#6b7280', fontSize:12, marginTop:5 }}>Storage and quiz limits are shown automatically. Add the remaining selling points displayed on Student pricing cards.</div>
          {(plan.features || []).length === 0 && <div style={{ marginTop:10, padding:14, border:'1px dashed #c4b5fd', borderRadius:10, background:'#faf8ff', color:'#6d28d9', fontSize:13 }}>No marketing features configured. Click <strong>Load Suggested Features</strong> or <strong>+ Add Feature</strong>.</div>}
          {(plan.features || []).map((feature,index) => <div key={index} style={{ display:'flex', gap:10, marginTop:8 }}><input type="checkbox" checked={feature.included} onChange={e => featureChange(plan.code,index,'included',e.target.checked)}/><input className="as-form-input" value={feature.label} onChange={e => featureChange(plan.code,index,'label',e.target.value)}/><button type="button" onClick={() => change(plan.code,'features',plan.features.filter((_,i)=>i!==index))}>×</button></div>)}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:18 }}>
          {plan.code !== 'BASIC' ? (
            <button
              type="button"
              className="as-test-btn"
              style={{ background:'#fee2e2', color:'#dc2626', borderColor:'#fca5a5' }}
              disabled={saving === plan.code || plan.subscriberCount > 0}
              onClick={() => setDeleteConfirmModal({ planId: plan.planId, planCode: plan.code })}
              title={plan.subscriberCount > 0 ? "Cannot delete a plan with active or past subscribers" : "Delete this plan and all its versions"}
            >
              Delete Plan
            </button>
          ) : <div />}
          <button className="as-save-btn" disabled={saving===plan.code} onClick={() => save(plan)}>{saving===plan.code?'Creating Version...':'Create New Version'}</button>
        </div>
        <div style={{ borderTop:'1px solid #ece8f5', marginTop:22, paddingTop:14 }}><div className="as-form-label">Version History</div>{plan.versions.map(version => <div key={version.versionId} style={{ display:'grid', gridTemplateColumns:'80px 1fr 1fr 1fr', gap:10, padding:'7px 0', fontSize:12 }}><strong style={{ color:version.isActive?'#16a34a':'#374151' }}>v{version.versionNo}{version.isActive?' Active':''}</strong><span>{Number(version.price).toLocaleString('vi-VN')}₫</span><span>{version.maxStorage}MB</span><span>{version.subscriberCount} subscriber(s)</span></div>)}</div>
      </div>)}</div>
    </div>
  </div>
  </>;
}
