import { API_BASE_URL as BASE_URL } from "../config/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      body?.message ||
      body?.error ||
      body?.detail ||
      (typeof body === "string" ? body : "") ||
      (response.status >= 500
        ? "Something went wrong. Please try again later."
        : "Request failed. Please try again.");
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const practiceTestApi = {
  // userId lấy từ JWT ở BE, không truyền từ client.
  list: () => request("/practice-tests"),
  get: (testId) => request(`/practice-tests/${testId}`),
  getInProgress: () => request("/practice-tests/in-progress"),
  generate: (payload) =>
    request("/practice-tests/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  saveProgress: (testId, payload) =>
    request(`/practice-tests/${testId}/progress`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  submit: (testId, payload) =>
    request(`/practice-tests/${testId}/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getResult: (attemptId) =>
    request(`/practice-tests/attempts/${attemptId}/result`),
  delete: (testId) =>
    request(`/practice-tests/${testId}`, {
      method: "DELETE",
    }),
};
