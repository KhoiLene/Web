// src/api.js — Dùng chung cho toàn bộ project
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

function getToken() {
  return localStorage.getItem("admin_token");
}

export async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("admin_token");
    window.location.href = "/login";
    return;
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Lỗi không xác định");
  return data;
}

// ─── Product Groups API ───────────────────────────────────────────────────────
export const productGroupsApi = {
  getAll: ()           => apiFetch("/product-groups"),
  getOne: (id)         => apiFetch(`/product-groups/${id}`),
  create: (body)       => apiFetch("/product-groups", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body)   => apiFetch(`/product-groups/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id)         => apiFetch(`/product-groups/${id}`, { method: "DELETE" }),
};

// ─── Products API ─────────────────────────────────────────────────────────────
export const productsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/products${query ? `?${query}` : ""}`);
  },
  getOne: (id)         => apiFetch(`/products/${id}`),
  create: (body)       => apiFetch("/products", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body)   => apiFetch(`/products/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id)         => apiFetch(`/products/${id}`, { method: "DELETE" }),
};