import { API_ORIGIN as API_BASE_URL } from '../config/api';
const REQUEST_TIMEOUT_MS = 30000;

function readStoredUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = Number(user.userId || user.id);
    if (Number.isFinite(userId) && userId > 0) return userId;
  } catch {
    // Ignore malformed localStorage and fall back below.
  }

  throw new Error('Authentication required: no current user was found.');
}

async function requestJson(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      },
      ...options,
      signal: controller.signal
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.message || payload?.detail || `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return payload;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The AI service did not respond in time. Check that Spring Boot, Python AI, and SQL Server are running.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function getDefaultAiUserId() {
  return readStoredUserId();
}

export function askAiChat({ sessionId, message, subjectId, documentIds, topK = 3 }) {
  return requestJson('/api/chat/ask', {
    method: 'POST',
    body: JSON.stringify({
      sessionId: sessionId || null,
      subjectId: subjectId || null,
      documentIds: documentIds || [],
      message,
      topK
    })
  });
}

export function listAiChatSessions() {
  return requestJson('/api/chat/sessions');
}

export function listAiChatMessages(sessionId) {
  return requestJson(`/api/chat/sessions/${encodeURIComponent(sessionId)}/messages`);
}

export function deleteAiChatSession(sessionOrId) {
  const isSessionObject = typeof sessionOrId === 'object' && sessionOrId !== null;
  const sessionId = isSessionObject ? (sessionOrId.sessionId || sessionOrId.id) : sessionOrId;

  return requestJson(`/api/chat/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    body: JSON.stringify({
      sessionId,
      sessionTitle: isSessionObject ? (sessionOrId.sessionTitle || sessionOrId.title || '') : '',
      deletedAt: new Date().toISOString()
    })
  });
}
