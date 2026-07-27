const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080/api"
).replace(/\/$/, "");

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const normalizedPath = path.startsWith('/api/')
    ? path.slice(4)
    : path.startsWith('/')
      ? path
      : `/${path}`;
  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    let errorBody = {};
    try { errorBody = errorText ? JSON.parse(errorText) : {}; } catch { errorBody = { message: errorText }; }
    throw new Error(
      errorBody.message ||
        errorBody.error ||
        (response.status >= 500
          ? 'Something went wrong. Please try again later.'
          : 'Request failed.'),
    );
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const adminService = {
  getDashboard: async () => request('/api/admin/dashboard'),
  getAiConfigs: async () => request('/api/admin/ai-config'),
  saveAiConfig: async (provider, data) => request(`/api/admin/ai-config/${provider}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  testAiConfig: async (provider, data) => request(`/api/admin/ai-config/${provider}/test`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  clearAiConfigKey: async (provider) => request(`/api/admin/ai-config/${provider}/key`, {
    method: 'DELETE',
  }),
  getStorageSettings: async () => request('/api/admin/storage-settings'),
  saveStorageSettings: async (data) => request('/api/admin/storage-settings', {
    method: 'PUT', body: JSON.stringify(data),
  }),
  getDriveAuthorizationUrl: async () => request('/api/admin/storage-settings/google/authorization-url'),
  getConversations: async () => request('/api/admin/conversations'),
  getConversation: async (id) => request(`/api/admin/conversations/${id}`),
  getUsers: async (searchTerm = '') => {
    const query = searchTerm ? `?q=${encodeURIComponent(searchTerm)}` : '';
    return request(`/api/admin/users${query}`);
  },
  createUser: async (user) => request('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(user),
  }),
  updateUser: async (id, user) => request(`/api/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(user),
  }),
  deleteUser: async (id) => request(`/api/admin/users/${id}`, {
    method: 'DELETE',
  }),
  getLibrarySemesters: async () => request('/api/admin/library/semesters'),
  createLibrarySemester: async (semester) => request('/api/admin/library/semesters', {
    method: 'POST',
    body: JSON.stringify({ name: semester.name }),
  }),
  updateLibrarySemester: async (id, semester) => request(`/api/admin/library/semesters/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name: semester.name }),
  }),
  deleteLibrarySemester: async (id) => request(`/api/admin/library/semesters/${id}`, {
    method: 'DELETE',
  }),
  getLibraryCourses: async (semesterId) => request(`/api/admin/library/semesters/${semesterId}/courses`),
  createLibraryCourse: async (semesterId, course) => request(`/api/admin/library/semesters/${semesterId}/courses`, {
    method: 'POST',
    body: JSON.stringify(course),
  }),
  updateLibraryCourse: async (courseId, course) => request(`/api/admin/library/courses/${courseId}`, {
    method: 'PUT',
    body: JSON.stringify(course),
  }),
  deleteLibraryCourse: async (courseId, deleteDocuments = false) => request(`/api/admin/library/courses/${courseId}?deleteDocuments=${deleteDocuments ? 'true' : 'false'}`, {
    method: 'DELETE',
  }),
  getDocuments: async () => request('/api/admin/document-management'),
  getDocumentsBySubject: async (subjectId) => request(`/api/admin/library/courses/${subjectId}/documents`),
  updateDocumentStatus: async (id, status, rejectReason = '') => request(`/api/admin/document-management/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, rejectReason }),
  }),
  deleteDocument: async (id) => request(`/api/admin/document-management/${id}`, {
    method: 'DELETE',
  }),
  getPracticeTests: async () => request('/api/admin/practice-tests'),
  getPracticeTestQuestions: async (testId) => request(`/api/admin/practice-tests/${testId}/questions`),
  updatePracticeTestQuestion: async (testId, questionId, data) => request(`/api/admin/practice-tests/${testId}/questions/${questionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deletePracticeTest: async (testId) => request(`/api/admin/practice-tests/${testId}`, {
    method: 'DELETE',
  }),
  getPracticeReviewQueue: async () => request('/api/admin/practice-review-queue'),
  updatePracticeReviewQueueItem: async (id, item) => request(`/api/admin/practice-review-queue/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item),
  }),
  resolvePracticeReviewQueueItem: async (id, status) => request(`/api/admin/practice-review-queue/${id}/resolve`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),
  getPayments: async () => request('/api/admin/payments'),
  createPaymentPlan: async (data) => request('/api/admin/plans', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updatePaymentPlan: async (plan, data) => request(`/api/admin/plans/${plan}/versions`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deletePaymentPlan: async (plan) => request(`/api/admin/plans/${plan}`, {
    method: 'DELETE',
  }),
  getPlanVersions: async () => request('/api/admin/plans'),
  getPlanVersionSubscribers: async (versionId) => request(`/api/admin/plans/versions/${versionId}/subscribers`),
  updateRenewalPolicy: async (subscriptionId, policy) => request(`/api/admin/plans/subscriptions/${subscriptionId}/renewal-policy`, {
    method: 'PATCH',
    body: JSON.stringify({ policy }),
  }),
  getNotifications: async () => request('/api/admin/notifications'),
  sendNotification: async (data) => request('/api/admin/notifications', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateNotification: async (id, data) => request(`/api/admin/notifications/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteNotification: async (id) => request(`/api/admin/notifications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }),
  getReviewQueue: async () => Promise.resolve([]),
};
