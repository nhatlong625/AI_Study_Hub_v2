const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

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
  list: (userId = 1) => request(`/practice-tests?userId=${userId}`),
  get: (testId) => request(`/practice-tests/${testId}`),
  getInProgress: (userId = 1) =>
    request(`/practice-tests/in-progress?userId=${userId}`),
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
};
