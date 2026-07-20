import { useEffect, useRef, useState } from 'react';
import { adminService } from '../../services/adminService';

/* ── Section wrapper ── */
export function SettingSection({ icon, title, description, children }) {
  if (title === 'AI API & Model Configuration') {
    return <AiProviderSettingsPanel />;
  }
  return (
    <div className="as-section">
      <div className="as-section-header">
        <div className="as-section-icon">{icon}</div>
        <div>
          <h2 className="as-section-title">{title}</h2>
          <p className="as-section-desc">{description}</p>
        </div>
      </div>
      <div className="as-section-body">{children}</div>
    </div>
  );
}

/* ── Divider ── */
export const Divider = () => <div className="as-divider" />;

/* ── Sent notification history ── */
const SENT_HISTORY = [
  { id: 1, title: 'System maintenance notice', body: 'The platform will undergo scheduled maintenance on Jun 15 from 2:00–4:00 AM UTC. Please save your work beforehand.', recipients: 'All Users', sentAt: 'Jun 10, 2025 – 09:14', type: 'info' },
  { id: 2, title: 'New course available: AI Fundamentals', body: 'A brand-new course on Artificial Intelligence Fundamentals is now available. Enroll today and get 20% off with code AI2025.', recipients: 'All Users', sentAt: 'Jun 8, 2025 – 14:30', type: 'announcement' },
  { id: 3, title: 'Subscription expiring soon', body: 'Your PLUS subscription expires in 3 days. Renew now to keep your full access to all features.', recipients: 'PLUS Plan', sentAt: 'Jun 5, 2025 – 10:00', type: 'warning' },
];

const TYPE_CFG = {
  info:         { bg: '#dbeafe', color: '#1d4ed8', label: 'Info' },
  announcement: { bg: '#ede9fe', color: '#7c3aed', label: 'Announcement' },
  warning:      { bg: '#fef3c7', color: '#b45309', label: 'Warning' },
  alert:        { bg: '#fee2e2', color: '#dc2626', label: 'Alert' },
};

const AI_MODELS = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'],
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
};

const AI_PROVIDER_LABELS = {
  openai: { name: 'OpenAI', color: '#10a37f' },
  gemini: { name: 'Google Gemini', color: '#4285f4' },
  deepseek: { name: 'DeepSeek', color: '#4d6bfe' },
};

const CONNECTION_STATES = {
  active: { label: 'Active', className: 'active' },
  inactive: { label: 'Inactive', className: 'inactive' },
  unknown: { label: 'Not tested', className: 'unknown' },
  disabled: { label: 'Disabled', className: 'disabled' },
};

function AiProviderSettingsPanel() {
  const [configs, setConfigs] = useState([]);
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [form, setForm] = useState({
    model: 'gpt-4o-mini', enabled: true, priority: 1,
    temperature: 0.3, maxTokens: 2048, topP: 1, systemPrompt: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [clearingKey, setClearingKey] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState('');

  const selectProvider = (name, values = configs) => {
    const current = values.find(item => item.provider === name);
    setProvider(name);
    setApiKey('');
    setShowKey(false);
    setStatus(null);
    setMessage('');
    setForm({
      model: current?.model || AI_MODELS[name][0],
      enabled: current?.enabled ?? true,
      priority: current?.priority ?? ({ openai: 1, gemini: 2, deepseek: 3 }[name] || 100),
      temperature: Number(current?.temperature ?? 0.3),
      maxTokens: Number(current?.maxTokens ?? 2048),
      topP: Number(current?.topP ?? 1),
      systemPrompt: current?.systemPrompt || '',
    });
  };

  useEffect(() => {
    adminService.getAiConfigs()
      .then(data => {
        const values = Array.isArray(data) ? data : [];
        setConfigs(values);
        selectProvider(values[0]?.provider || 'openai', values);
      })
      .catch(error => setMessage(error.message || 'Could not load AI configuration.'))
      .finally(() => setLoading(false));
  }, []);

  const current = configs.find(item => item.provider === provider);

  const testConnection = async () => {
    try {
      setTesting(true);
      setStatus(null);
      setMessage('');
      const result = await adminService.testAiConfig(provider, {
        apiKey,
        model: form.model,
      });
      setStatus(result.valid ? 'ok' : 'fail');
      setMessage(result.message || 'Connection successful.');
      setConfigs(values => values.map(item => item.provider === provider ? {
        ...item,
        connectionStatus: result.valid ? 'active' : 'inactive',
        lastTestMessage: result.message || '',
        lastTestedAt: new Date().toISOString(),
      } : item));
    } catch (error) {
      setStatus('fail');
      setMessage(error.message || 'Connection failed.');
      setConfigs(values => values.map(item => item.provider === provider ? {
        ...item,
        connectionStatus: 'inactive',
        lastTestMessage: error.message || 'Connection failed.',
        lastTestedAt: new Date().toISOString(),
      } : item));
    } finally {
      setTesting(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);
      setMessage('');
      const saved = await adminService.saveAiConfig(provider, { ...form, apiKey });
      setConfigs(values => values.map(item => item.provider === provider ? saved : item));
      setApiKey('');
      setStatus(saved.connectionStatus === 'active' ? 'ok' : 'fail');
      setMessage(saved.connectionStatus === 'active'
        ? 'AI configuration saved.'
        : (saved.lastTestMessage || 'AI configuration saved, but connection is inactive.'));
    } catch (error) {
      setStatus('fail');
      setMessage(error.message || 'Could not save AI configuration.');
    } finally {
      setSaving(false);
    }
  };

  const clearStoredKey = async () => {
    const providerLabel = AI_PROVIDER_LABELS[provider]?.name || provider;
    const confirmed = window.confirm(`Clear the stored ${providerLabel} API key? This provider will be disabled until a new key is saved.`);
    if (!confirmed) return;
    try {
      setClearingKey(true);
      setMessage('');
      const saved = await adminService.clearAiConfigKey(provider);
      setConfigs(values => values.map(item => item.provider === provider ? saved : item));
      setApiKey('');
      setShowKey(false);
      setForm(value => ({ ...value, enabled: false }));
      setStatus(null);
      setMessage(`${providerLabel} API key cleared.`);
    } catch (error) {
      setStatus('fail');
      setMessage(error.message || 'Could not clear API key.');
    } finally {
      setClearingKey(false);
    }
  };

  return (
    <div className="as-section">
      <div className="as-section-header">
        <div className="as-section-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 21h8M12 17v4M7 8h.01M12 8h.01M17 8h.01M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <h2 className="as-section-title">AI API & Model Configuration</h2>
          <p className="as-section-desc">Keys are encrypted by Spring Boot and are never returned to this browser.</p>
        </div>
      </div>

      <div className="as-section-body">
        {loading ? (
          <div className="as-ai-state">Loading AI configuration...</div>
        ) : (
          <>
            {configs.some(item => !item.masterKeyConfigured) && (
              <div className="as-ai-warning">
                Set AI_CONFIG_MASTER_KEY (at least 32 characters) in backend-java/.env before saving a key.
              </div>
            )}

            <div className="as-group">
              <div className="as-group-label">AI Provider</div>
              <div className="as-provider-grid">
                {Object.entries(AI_PROVIDER_LABELS).map(([key, item]) => {
                  const config = configs.find(value => value.provider === key);
                  const connectionState = !config?.configured
                    ? CONNECTION_STATES.unknown
                    : !config.enabled
                      ? CONNECTION_STATES.disabled
                      : CONNECTION_STATES[config.connectionStatus] || CONNECTION_STATES.unknown;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`as-provider-card${provider === key ? ' as-provider-active' : ''}`}
                      style={provider === key ? { borderColor: item.color } : {}}
                      onClick={() => selectProvider(key)}
                    >
                      <span
                        className={`as-provider-dot as-connection-dot ${connectionState.className}`}
                        title={config?.lastTestedAt
                          ? `${connectionState.label} - last tested ${new Date(config.lastTestedAt).toLocaleString()}`
                          : connectionState.label}
                      />
                      <span className="as-provider-name">{item.name}</span>
                      <span className="as-provider-status-wrap">
                        <span className={`as-connection-label ${connectionState.className}`}>{connectionState.label}</span>
                        <span className={`as-ai-config-state${config?.configured ? ' configured' : ''}`}>
                          {config?.configured ? config.keyHint : 'Not configured'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="as-group">
              <div className="as-group-label">API Key</div>
              <div className="as-field-row" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div className="as-form-group" style={{ flex: 1 }}>
                  <label className="as-form-label">New API key</label>
                  <div className="as-key-input-wrap">
                    <input
                      type={showKey ? 'text' : 'password'}
                      className="as-form-input"
                      value={apiKey}
                      onChange={event => setApiKey(event.target.value)}
                      placeholder={current?.configured ? `Stored securely (${current.keyHint}) - leave blank to keep` : 'Enter API key'}
                      autoComplete="new-password"
                    />
                    <button type="button" className="as-key-eye" onClick={() => setShowKey(value => !value)}>
                      {showKey ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M1 12C1 12 5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>}
                    </button>
                  </div>
                  <div className="as-param-hint" style={{ marginTop: '8px' }}>The saved key cannot be viewed again. Entering a value replaces it.</div>
                </div>
                <div className="as-test-wrap">
                  <label className="as-form-label" style={{ opacity: 0 }}>_</label>
                  <button type="button" className={`as-test-btn${status === 'ok' ? ' as-test-ok' : status === 'fail' ? ' as-test-fail' : ''}`} onClick={testConnection} disabled={testing}>
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    type="button"
                    className="as-clear-key-btn"
                    onClick={clearStoredKey}
                    disabled={clearingKey || !current?.configured}
                    title={current?.configured ? 'Clear stored API key' : 'No saved key to clear'}
                  >
                    {clearingKey ? 'Clearing...' : 'Clear key'}
                  </button>
                </div>
              </div>
            </div>

            <div className="as-group">
              <div className="as-group-label">Model</div>
              <div className="as-model-grid">
                {AI_MODELS[provider].map(item => (
                  <button key={item} type="button" className={`as-model-card${form.model === item ? ' as-model-active' : ''}`} onClick={() => setForm(value => ({ ...value, model: item }))}>
                    <span className="as-model-name">{item}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="as-group">
              <div className="as-group-label">Generation Parameters</div>
              <div className="as-params-grid">
                <label className="as-form-group"><span className="as-form-label">Temperature</span><input type="number" className="as-form-input" min="0" max="2" step="0.1" value={form.temperature} onChange={event => setForm(value => ({ ...value, temperature: event.target.value }))}/></label>
                <label className="as-form-group"><span className="as-form-label">Max Tokens</span><input type="number" className="as-form-input" min="1" max="8192" value={form.maxTokens} onChange={event => setForm(value => ({ ...value, maxTokens: event.target.value }))}/></label>
                <label className="as-form-group"><span className="as-form-label">Top P</span><input type="number" className="as-form-input" min="0" max="1" step="0.05" value={form.topP} onChange={event => setForm(value => ({ ...value, topP: event.target.value }))}/></label>
              </div>
            </div>



            {message && <div className={`as-ai-message ${status || ''}`}>{message}</div>}

            <div className="as-section-footer">
              <label className="as-ai-enabled">
                <input type="checkbox" checked={form.enabled} onChange={event => setForm(value => ({ ...value, enabled: event.target.checked }))}/>
                Enabled for automatic failover
              </label>
              <button type="button" className="as-save-btn" onClick={saveConfiguration} disabled={saving}>
                {saving ? 'Saving...' : 'Save AI Configuration'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
function StorageSettingsPanel() {
  const [settings, setSettings] = useState({ provider: 'supabase', r2Configured: false });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    adminService.getStorageSettings().then(setSettings)
      .catch(error => setMessage(error.message || 'Could not load storage settings.'));
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      setMessage('');
      const saved = await adminService.saveStorageSettings({ provider: settings.provider });
      setSettings(saved);
      setMessage('Storage setting saved. It applies to new uploads only.');
    } catch (error) {
      setMessage(error.message || 'Could not save storage setting.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingSection
      title="Document Storage"
      description="Choose where newly uploaded documents are stored."
      icon={
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16v12H4zM8 10h8M8 14h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      }
    >
      <div className="as-group">
        <div className="as-group-label">💾 Storage Provider</div>

        <div className="as-type-tabs" style={{ display: 'flex', gap: '10px', marginTop: '14px', marginBottom: '12px', marginLeft: '12px' }}>
          <button
            type="button"
            aria-pressed={settings.provider === 'supabase'}
            className={`as-type-tab${settings.provider === 'supabase' ? ' as-type-active' : ''}`}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              border: `1.5px solid ${settings.provider === 'supabase' ? '#4f46e5' : '#cbd5e1'}`,
              background: settings.provider === 'supabase' ? '#eef2ff' : '#ffffff',
              color: settings.provider === 'supabase' ? '#3730a3' : '#475569',
              boxShadow: settings.provider === 'supabase' ? '0 2px 6px rgba(79, 70, 229, 0.1)' : 'none'
            }}
            onClick={() => setSettings(value => ({ ...value, provider: 'supabase' }))}
          >
            Supabase Storage
          </button>

          <button
            type="button"
            aria-pressed={settings.provider === 'r2'}
            className={`as-type-tab${settings.provider === 'r2' ? ' as-type-active' : ''}`}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              border: `1.5px solid ${settings.provider === 'r2' ? '#4f46e5' : '#cbd5e1'}`,
              background: settings.provider === 'r2' ? '#eef2ff' : '#ffffff',
              color: settings.provider === 'r2' ? '#3730a3' : '#475569',
              boxShadow: settings.provider === 'r2' ? '0 2px 6px rgba(79, 70, 229, 0.1)' : 'none'
            }}
            onClick={() => setSettings(value => ({ ...value, provider: 'r2' }))}
          >
            Cloudflare R2
          </button>
        </div>

        {settings.provider === 'r2' && !settings.r2Configured && (
          <div className="as-ai-warning" style={{ marginTop: '10px', padding: '10px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.82rem' }}>
            Cloudflare R2 is not configured in the backend environment. Please set CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, and CLOUDFLARE_R2_BUCKET in your `.env` file first.
          </div>
        )}

        <p className="as-param-hint" style={{ marginTop: '10px', color: '#64748b', fontSize: '0.84rem', lineHeight: 1.45 }}>
          Existing files remain in their current location and will continue to work. Newly uploaded files will be stored in the selected provider.
        </p>

        <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#eef2ff', color: '#3730a3', padding: '5px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
          <span>Selected:</span>
          <span>{settings.provider === 'r2' ? 'Cloudflare R2' : 'Supabase Storage'}</span>
        </div>
      </div>

      {message && (
        <div className="as-ai-message" style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: '0.84rem', fontWeight: 600 }}>
          {message}
        </div>
      )}

      <div
        className="as-section-footer"
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          paddingTop: '10px',
          marginTop: '12px'
        }}
      >
        <button
          type="button"
          className="as-save-btn"
          onClick={save}
          disabled={saving || (settings.provider === 'r2' && !settings.r2Configured)}
          style={{
            padding: '9px 18px',
            borderRadius: '8px',
            fontSize: '0.86rem',
            fontWeight: 700,
            background: saving || (settings.provider === 'r2' && !settings.r2Configured) ? '#94a3b8' : '#4f46e5',
            color: '#ffffff',
            border: 'none',
            cursor: saving || (settings.provider === 'r2' && !settings.r2Configured) ? 'not-allowed' : 'pointer',
            boxShadow: saving || (settings.provider === 'r2' && !settings.r2Configured) ? 'none' : '0 2px 8px rgba(79, 70, 229, 0.2)',
            transition: 'all 0.15s ease'
          }}
        >
          {saving ? 'Saving...' : 'Save Storage Setting'}
        </button>
      </div>
    </SettingSection>
  );
}

function AdminSettingsPage() {
  /* ── Notification compose ── */
  const [notifTitle,     setNotifTitle]     = useState('');
  const [notifBody,      setNotifBody]      = useState('');
  const [notifRecipient, setNotifRecipient] = useState('All Users');
  const [notifType,      setNotifType]      = useState('announcement');
  const [sending,        setSending]        = useState(false);
  const [sent,           setSent]           = useState(false);
  const [notifError,     setNotifError]     = useState('');
  const [notifHistory,   setNotifHistory]   = useState([]);
  const [editingNotificationId, setEditingNotificationId] = useState(null);
  const [editNotificationForm, setEditNotificationForm] = useState({ title: '', body: '', type: 'announcement' });
  const [notificationActionId, setNotificationActionId] = useState(null);
  const notifSectionRef = useRef(null);

  const loadNotificationHistory = async () => {
    try {
      setNotifHistory(await adminService.getNotifications());
    } catch {
      setNotifHistory([]);
    }
  };

  useEffect(() => {
    loadNotificationHistory();
  }, []);

  const handleSend = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) return;
    setSending(true);
    setNotifError('');
    try {
      if (editingNotificationId) {
        await adminService.updateNotification(editingNotificationId, {
          title: notifTitle.trim(),
          content: notifBody.trim(),
          type: notifType,
        });
        setEditingNotificationId(null);
      } else {
        await adminService.sendNotification({
          title: notifTitle.trim(),
          content: notifBody.trim(),
          recipients: notifRecipient,
          type: notifType,
        });
      }
      setSent(true);
      setNotifTitle('');
      setNotifBody('');
      await loadNotificationHistory();
      setTimeout(() => setSent(false), 2500);
    } catch (error) {
      setNotifError(error.message || 'Could not send notification.');
    } finally {
      setSending(false);
    }
  };

  /* ── AI config ── */
  const startEditNotification = (notification) => {
    setNotifError('');
    setEditingNotificationId(notification.id);
    setNotifTitle(notification.title || '');
    setNotifBody(notification.body || '');
    setNotifType(notification.type || 'announcement');
    setNotifRecipient(notification.recipients || 'All Users');
    setEditNotificationForm({
      title: notification.title || '',
      body: notification.body || '',
      type: notification.type || 'announcement',
    });
    setTimeout(() => {
      if (notifSectionRef.current) {
        notifSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const cancelEditNotification = () => {
    setEditingNotificationId(null);
    setNotifTitle('');
    setNotifBody('');
    setNotifRecipient('All Users');
    setNotifType('announcement');
    setEditNotificationForm({ title: '', body: '', type: 'announcement' });
  };

  const handleUpdateNotification = async (notificationId) => {
    if (!editNotificationForm.title.trim() || !editNotificationForm.body.trim()) return;
    setNotificationActionId(notificationId);
    setNotifError('');
    try {
      await adminService.updateNotification(notificationId, {
        title: editNotificationForm.title.trim(),
        content: editNotificationForm.body.trim(),
        type: editNotificationForm.type,
      });
      cancelEditNotification();
      await loadNotificationHistory();
    } catch (error) {
      setNotifError(error.message || 'Could not update notification.');
    } finally {
      setNotificationActionId(null);
    }
  };

  const handleDeleteNotification = async (notification) => {
    const confirmed = window.confirm(`Delete notification "${notification.title}"? Users will no longer see it.`);
    if (!confirmed) return;
    setNotificationActionId(notification.id);
    setNotifError('');
    try {
      await adminService.deleteNotification(notification.id);
      if (editingNotificationId === notification.id) cancelEditNotification();
      await loadNotificationHistory();
    } catch (error) {
      setNotifError(error.message || 'Could not delete notification.');
    } finally {
      setNotificationActionId(null);
    }
  };

  const [provider,    setProvider]    = useState('openai');
  const [apiKey,      setApiKey]      = useState('sk-••••••••••••••••••••••••••••••••••');
  const [model,       setModel]       = useState('gpt-4o');
  const [temperature, setTemperature] = useState('0.7');
  const [maxTokens,   setMaxTokens]   = useState('2048');
  const [topP,        setTopP]        = useState('1.0');
  const [showKey,     setShowKey]     = useState(false);
  const [testStatus,  setTestStatus]  = useState(null);
  const [savedAI,     setSavedAI]     = useState(false);

  const MODELS = {
    openai:    ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    google:    ['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro'],
    anthropic: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-3-5'],
    mistral:   ['mistral-large', 'mistral-medium', 'mistral-small'],
  };

  const PROVIDER_LABELS = {
    openai:    { name: 'OpenAI',             color: '#10a37f' },
    google:    { name: 'Google Gemini',      color: '#4285f4' },
    anthropic: { name: 'Anthropic Claude',   color: '#d97706' },
    mistral:   { name: 'Mistral AI',         color: '#7c3aed' },
  };

  const handleTestAPI = () => {
    setTestStatus('testing');
    setTimeout(() => setTestStatus('ok'), 1800);
  };

  const handleSaveAI = () => {
    setSavedAI(true);
    setTimeout(() => setSavedAI(false), 2000);
  };

  const tc = TYPE_CFG[notifType] || TYPE_CFG.announcement;

  return (
    <div className="as-page">

      <div>
        <h1 className="as-page-title">Admin Settings</h1>
        <p className="as-page-sub">Configure platform-wide preferences, send user notifications, and manage AI settings.</p>
      </div>

      <StorageSettingsPanel />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'stretch' }}>
        {/* ══ SECTION 1 — Send Notification to Users ══ */}
      <div ref={notifSectionRef}>
      <SettingSection
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        }
        title="Send Notification to Users"
        description="Compose and broadcast a notification to all or selected groups of users on the platform."
      >
        {notifError && <div className="as-error-message" style={{ color: '#dc2626', marginBottom: '16px', background: '#fee2e2', padding: '12px', borderRadius: '8px' }}>{notifError}</div>}
        {/* Compose form */}
        <div className="as-group">
          <div className="as-group-label">✉️ Compose Message</div>
          <div className="as-notif-form">

            {/* Row 1: Recipients + Type */}
            <div className="as-notif-row2">
              <div className="as-form-group" style={{ flex: 1 }}>
                <label className="as-form-label">Recipients</label>
                <div className="ptm-select-wrap" style={{ width: '100%' }}>
                  <select
                    className="ptm-select"
                    style={{ width: '100%' }}
                    value={notifRecipient}
                    onChange={e => setNotifRecipient(e.target.value)}
                    disabled={Boolean(editingNotificationId)}
                  >
                    <option>All Users</option>
                    <option>PLUS Plan</option>
                    <option>PRO Plan</option>
                    <option>Free Plan</option>
                    <option>Admin Only</option>
                  </select>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              <div className="as-form-group" style={{ flex: 1 }}>
                <label className="as-form-label">Notification Type</label>
                <div className="as-type-tabs">
                  {Object.entries(TYPE_CFG).map(([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      className={`as-type-tab${notifType === key ? ' as-type-active' : ''}`}
                      style={notifType === key ? { background: cfg.bg, color: cfg.color, borderColor: cfg.color } : {}}
                      onClick={() => setNotifType(key)}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="as-form-group as-notif-field">
              <label className="as-form-label">Notification Title</label>
              <input
                type="text"
                className="as-form-input"
                placeholder="e.g. System maintenance scheduled for Jun 15"
                value={notifTitle}
                onChange={e => setNotifTitle(e.target.value)}
              />
            </div>

            {/* Body */}
            <div className="as-form-group as-notif-field">
              <label className="as-form-label">Message Body</label>
              <textarea
                className="as-form-input as-notif-textarea"
                placeholder="Write the notification content here. Be clear and concise — users will see this in their notification panel."
                value={notifBody}
                onChange={e => setNotifBody(e.target.value)}
                rows={4}
              />
            </div>

            {/* Preview */}
            {(notifTitle || notifBody) && (
              <div className="as-notif-preview">
                <div className="as-notif-preview-label">Preview</div>
                <div className="as-notif-preview-card">
                  <div className="as-notif-preview-icon" style={{ background: tc.bg, color: tc.color }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="as-notif-preview-body">
                    <div className="as-notif-preview-title">
                      {notifTitle || 'Notification title'}
                      <span className="as-notif-type-chip" style={{ background: tc.bg, color: tc.color }}>{tc.label}</span>
                    </div>
                    <div className="as-notif-preview-text">{notifBody || 'Message body will appear here…'}</div>
                    <div className="as-notif-preview-meta">To: {notifRecipient} &nbsp;·&nbsp; Just now</div>
                  </div>
                </div>
              </div>
            )}

            {/* Send button */}
            <div className="as-notif-send-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '16px' }}>
              <span className="as-notif-hint">
                {editingNotificationId
                  ? <>Editing an existing notification for <strong>{notifRecipient}</strong>.</>
                  : <>This notification will be sent to <strong>{notifRecipient}</strong>.</>}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {editingNotificationId && (
                  <button
                    type="button"
                    onClick={cancelEditNotification}
                    disabled={sending}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '42px',
                      padding: '0 20px',
                      borderRadius: '10px',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      cursor: sending ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    Cancel edit
                  </button>
                )}
                <button
                  className={`as-save-btn${sent ? ' as-save-done' : ''}`}
                  onClick={handleSend}
                  disabled={sending || !notifTitle.trim() || !notifBody.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    height: '42px',
                    padding: '0 22px',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: sending || (!notifTitle.trim() || !notifBody.trim()) ? 'not-allowed' : 'pointer',
                    opacity: sending || (!notifTitle.trim() || !notifBody.trim()) ? 0.6 : 1,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {sending ? (
                    <><span className="as-spin" /> {editingNotificationId ? 'Saving...' : 'Sending…'}</>
                  ) : sent ? (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> {editingNotificationId ? 'Saved!' : 'Sent!'}</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> {editingNotificationId ? 'Save Changes' : 'Send Notification'}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sent history */}
        <div className="as-group" style={{ marginTop: '24px' }}>
          <div className="as-group-label">🕒 Recent Notifications Sent</div>
          {notifHistory.length === 0 && (
            <div className="as-history-empty">No notifications sent yet.</div>
          )}
          {notifHistory.map((n, i) => {
            const cfg = TYPE_CFG[n.type] || TYPE_CFG.info;
            const isEditing = editingNotificationId === n.id;
            const actionInProgress = notificationActionId === n.id;
            return (
              <div key={n.id}>
                {i > 0 && <Divider />}
                <div className="as-history-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div className="as-history-icon" style={{ background: cfg.bg, color: cfg.color, flexShrink: 0, marginTop: '2px' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="as-history-content" style={{ flex: 1, minWidth: 0 }}>
                      <div className="as-history-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{n.title}</span>
                        <span className="as-notif-type-chip" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      </div>
                      <div className="as-history-body" style={{ marginTop: '4px', color: '#475569', fontSize: '0.86rem' }}>{n.body}</div>
                      <div className="as-history-meta" style={{ marginTop: '6px', fontSize: '0.78rem', color: '#94a3b8' }}>To: {n.recipients} &nbsp;·&nbsp; {n.sentAt}</div>
                    </div>
                  </div>

                  <div className="as-history-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="as-history-icon-btn"
                      title="Edit notification"
                      aria-label="Edit notification"
                      onClick={() => startEditNotification(n)}
                      disabled={actionInProgress}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        background: isEditing ? '#e0e7ff' : '#ffffff',
                        color: isEditing ? '#4f46e5' : '#64748b',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="as-history-icon-btn as-history-icon-btn-danger"
                      title="Delete notification"
                      aria-label="Delete notification"
                      onClick={() => handleDeleteNotification(n)}
                      disabled={actionInProgress}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        border: '1px solid #fee2e2',
                        background: '#fff5f5',
                        color: '#ef4444',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SettingSection>
      </div>

      {/* ══ SECTION 2 — AI API & Model Config ══ */}
      <SettingSection
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M7 8h.01M12 8h.01M17 8h.01M7 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        }
        title="AI API & Model Configuration"
        description="Connect and fine-tune the AI model used for question generation, hints, and content analysis."
      >
        {/* Provider selector */}
        <div className="as-group">
          <div className="as-group-label">🔌 AI Provider</div>
          <div className="as-provider-grid">
            {Object.entries(PROVIDER_LABELS).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                className={`as-provider-card${provider === key ? ' as-provider-active' : ''}`}
                onClick={() => { setProvider(key); setModel(MODELS[key][0]); }}
                style={provider === key ? { borderColor: cfg.color } : {}}
              >
                <div className="as-provider-dot" style={{ background: cfg.color }} />
                <span className="as-provider-name">{cfg.name}</span>
                {provider === key && (
                  <span className="as-provider-check" style={{ color: cfg.color }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* API Key */}
        <div className="as-group">
          <div className="as-group-label">🔑 API Key</div>
          <div className="as-field-row">
            <div className="as-form-group" style={{ flex: 1 }}>
              <label className="as-form-label">API Key</label>
              <div className="as-key-input-wrap">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="as-form-input"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  autoComplete="off"
                />
                <button type="button" className="as-key-eye" onClick={() => setShowKey(v => !v)}>
                  {showKey
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M1 12C1 12 5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                  }
                </button>
              </div>
            </div>
            <div className="as-test-wrap">
              <label className="as-form-label" style={{ opacity: 0 }}>_</label>
              <button
                type="button"
                className={`as-test-btn${testStatus === 'ok' ? ' as-test-ok' : testStatus === 'fail' ? ' as-test-fail' : ''}`}
                onClick={handleTestAPI}
                disabled={testStatus === 'testing'}
              >
                {testStatus === 'testing' && <span className="as-spin" />}
                {testStatus === 'ok'      && <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                {testStatus === 'fail'    && <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
                {testStatus === null      && <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                {testStatus === 'testing' ? 'Testing…'
                  : testStatus === 'ok'  ? 'Connected'
                  : testStatus === 'fail' ? 'Failed'
                  : 'Test Connection'}
              </button>
            </div>
          </div>
        </div>

        {/* Model selector */}
        <div className="as-group">
          <div className="as-group-label">🧠 Select Model</div>
          <div className="as-model-grid">
            {MODELS[provider].map(m => (
              <button
                key={m}
                type="button"
                className={`as-model-card${model === m ? ' as-model-active' : ''}`}
                onClick={() => setModel(m)}
              >
                <span className="as-model-name">{m}</span>
                {model === m && <span className="as-model-check">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Parameters */}
        <div className="as-group">
          <div className="as-group-label">⚙️ Generation Parameters</div>
          <div className="as-params-grid">
            <div className="as-form-group">
              <label className="as-form-label">Temperature</label>
              <div className="as-param-hint">Creativity level (0 = focused, 2 = creative)</div>
              <input type="number" className="as-form-input" min="0" max="2" step="0.1"
                value={temperature} onChange={e => setTemperature(e.target.value)} />
              <input type="range" className="as-range" min="0" max="2" step="0.1"
                value={temperature} onChange={e => setTemperature(e.target.value)} />
            </div>
            <div className="as-form-group">
              <label className="as-form-label">Max Tokens</label>
              <div className="as-param-hint">Maximum response length per request</div>
              <input type="number" className="as-form-input" min="256" max="8192" step="256"
                value={maxTokens} onChange={e => setMaxTokens(e.target.value)} />
              <input type="range" className="as-range" min="256" max="8192" step="256"
                value={maxTokens} onChange={e => setMaxTokens(e.target.value)} />
            </div>
            <div className="as-form-group">
              <label className="as-form-label">Top P</label>
              <div className="as-param-hint">Token diversity via nucleus sampling</div>
              <input type="number" className="as-form-input" min="0" max="1" step="0.05"
                value={topP} onChange={e => setTopP(e.target.value)} />
              <input type="range" className="as-range" min="0" max="1" step="0.05"
                value={topP} onChange={e => setTopP(e.target.value)} />
            </div>
          </div>
        </div>

        {/* System prompt */}
        <div className="as-group">
          <div className="as-group-label">📝 System Prompt</div>
          <div className="as-form-group as-notif-field">
            <label className="as-form-label">Default prompt for AI</label>
            <textarea
              className="as-form-input as-textarea"
              rows={4}
              defaultValue="You are an educational AI assistant for AI StudyHub. Your role is to generate high-quality, accurate exam questions based on the provided course material. Always output in valid JSON format. Be concise, clear, and pedagogically sound."
            />
            <div className="as-param-hint" style={{ marginTop: 6 }}>
              This prompt is prepended to every AI question-generation request to guide model behavior.
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="as-section-footer">
          <div className="as-active-model-tag">
            <div className="as-active-dot" style={{ background: PROVIDER_LABELS[provider].color }} />
            Active: <strong>{PROVIDER_LABELS[provider].name}</strong> / <strong>{model}</strong>
          </div>
          <button
            className={`as-save-btn${savedAI ? ' as-save-done' : ''}`}
            onClick={handleSaveAI}
          >
            {savedAI ? (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> Saved!</>
            ) : 'Save AI Configuration'}
          </button>
        </div>
      </SettingSection>

      </div>
    </div>
  );
}

export default AdminSettingsPage;
