import { API_BASE_URL as API_ROOT } from "../config/api";
const API_BASE = API_ROOT.endsWith("/auth") ? API_ROOT : `${API_ROOT}/auth`;

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
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

export const authService = {
  register: ({ email, password, fullName }) =>
    request("/register", {
      method: "POST",
      body: JSON.stringify({ email, password, fullName }),
    }),

  verifyEmail: (token) =>
    request(`/verify-email?token=${encodeURIComponent(token)}`),

  login: ({ email, password }) =>
    request("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  forgotPassword: ({ email }) =>
    request("/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: ({ token, newPassword }) =>
    request("/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),

  googleLogin: (credential) =>
    request("/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    }),
};
