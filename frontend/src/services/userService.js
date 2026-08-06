import { API_BASE_URL } from "../config/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed. Please try again.");
  }
  return data;
}

export const userService = {
  // Upload avatar
  uploadAvatar: (userId, file) => {
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE_URL}/users/${userId}/avatar`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then((res) => res.json());
  },

  // Plan
  getPlan: (userId) => request(`/users/${userId}/plan`),

  removeAvatar: (userId) =>
    request(`/users/${userId}/avatar`, { method: "DELETE" }),

  // Profile
  getProfile: (userId) => request(`/users/${userId}`),
  // Nhận object { fullName, email }; email là tuỳ chọn. Vẫn chấp nhận chuỗi để
  // không phá chỗ gọi cũ nào còn truyền thẳng tên.
  updateProfile: (userId, data) =>
    request(`/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify(
        typeof data === "string" ? { fullName: data } : data,
      ),
    }),
  deleteAccount: (userId) => request(`/users/${userId}`, { method: "DELETE" }),

  // Stats — streak, study time, storage
  getStats: (userId) => request(`/users/${userId}/stats`),
  getUserProfileStats: (userId) => request(`/users/${userId}/stats`),

  // Recent activity — upload / read / quiz / chat, mới nhất trước
  getActivity: (userId, limit = 10) =>
    request(`/users/${userId}/activity?limit=${limit}`),

  // Report
  submitReport: (data) =>
    request("/users/report", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Subscription
  getSubscription: (userId) => request(`/users/${userId}/subscription`),
  cancelSubscription: (userId) =>
    request(`/users/${userId}/subscription`, { method: "DELETE" }),
  updateAutoRenewal: (userId, autoRenewal) =>
    request(`/users/${userId}/subscription/auto-renewal`, {
      method: "PUT",
      body: JSON.stringify({ autoRenewal }),
    }),

  // Billing history
  getBillingHistory: (userId) => request(`/users/${userId}/billing-history`),

  // Sessions
  getSessions: (userId) => request(`/users/${userId}/sessions`),
  revokeSession: (userId, tokenId) =>
    request(`/users/${userId}/sessions/${tokenId}`, { method: "DELETE" }),

  // Delete chat history
  deleteChatHistory: (userId) =>
    request(`/users/${userId}/chat-history`, { method: "DELETE" }),

  // Change password
  changePassword: (userId, currentPassword, newPassword) =>
    request(`/users/${userId}/password`, {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Settings
  getSettings: (userId) => request(`/users/${userId}/settings`),
  // Major
  updateMyMajor: (majorId) =>
    request("/users/me/major", {
      method: "PUT",
      body: JSON.stringify({ majorId }),
    }),
};
