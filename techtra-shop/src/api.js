// src/api.js — Backend version (replacing Supabase)

// ─────────────────────────────────────────────
function handleResponse({ data, error }) {
  if (error) throw new Error(error);
  return {
    success: true,
    data,
    total: Array.isArray(data) ? data.length : 1,
  };
}

// ─────────────────────────────────────────────
// ─── Product Groups API
// ─────────────────────────────────────────────
export const productGroupsApi = {
  async getAll() {
    const response = await fetch('/api/product-groups');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Unknown error');
    return handleResponse(result);
  },

  async getOne(id) {
    const response = await fetch(`/api/product-groups/${id}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Unknown error');
    return handleResponse(result);
  },

  async create(body) {
    const response = await fetch('/api/product-groups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Unknown error');
    return handleResponse(result);
  },

  async update(id, body) {
    const response = await fetch(`/api/product-groups/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Unknown error');
    return handleResponse(result);
  },

  async remove(id) {
    const response = await fetch(`/api/product-groups/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Unknown error');
    return handleResponse(result);
  },
};

// ─────────────────────────────────────────────
// ─── Products API
// ─────────────────────────────────────────────
export const productsApi = {
  async getAll(params = {}) {
    // Build query string from params
    const queryParams = new URLSearchParams();
    if (params.group_id) queryParams.append('group_id', params.group_id);
    if (params.status !== undefined) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    const response = await fetch(`/api/products?${queryParams.toString()}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Unknown error');
    return handleResponse(result);
  },

  async getOne(id) {
    const response = await fetch(`/api/products/${id}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Unknown error');
    return handleResponse(result);
  },

  async getBySlug(slug) {
    const response = await fetch(`/api/products/slug/${slug}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Unknown error');
    return handleResponse(result);
  },

  async create(body) {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Unknown error');
    return handleResponse(result);
  },

  async update(id, body) {
    const response = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Unknown error');
    return handleResponse(result);
  },

  async remove(id) {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Unknown error');
    return handleResponse(result);
  },
};