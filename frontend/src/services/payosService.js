const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080/api"
).replace(/\/$/, "");

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readError(response) {
  try {
    const text = await response.text();
    if (!text) return response.statusText;
    try {
      const json = JSON.parse(text);
      return json.message || json.error || text;
    } catch {
      return text;
    }
  } catch {
    return response.statusText;
  }
}

export const payosService = {
  async createPaymentLink(params) {
    const response = await fetch(`${API_BASE_URL}/payments/payos/create-link`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(await readError(response));
    }

    return response.json();
  },

  generateOrderCode() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return Number(`${timestamp}${String(random).padStart(3, "0")}`);
  },

  openPaymentWindow(checkoutUrl) {
    if (checkoutUrl) {
      window.open(checkoutUrl, "_blank");
    }
  },
};