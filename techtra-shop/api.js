// src/api.js — Supabase version (HTML thuần, không qua Vite)
// ─────────────────────────────────────────────────────────────────────────────
// Dùng Supabase qua CDN (script type="module"), không cần npm install

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Điền trực tiếp 2 giá trị này (lấy tại Supabase → Settings → API) ────────
const SUPABASE_URL = "https://pbuqcvlcqrxdammvbwvs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBidXFjdmxjcXJ4ZGFtbXZid3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTA0NDAsImV4cCI6MjA5NzA4NjQ0MH0.YmRjW__dNqhhO0E8GUqoon6hqpA4k6rXYIFeV_PuVnY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─────────────────────────────────────────────
function handleResponse({ data, error }) {
  if (error) throw new Error(error.message);
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
    return handleResponse(
      await supabase.from("product_groups").select("*").order("sort_order", { ascending: true })
    );
  },
  async getOne(id) {
    return handleResponse(
      await supabase.from("product_groups").select("*").eq("id", id).single()
    );
  },
  async create(body) {
    return handleResponse(
      await supabase.from("product_groups").insert([body]).select().single()
    );
  },
  async update(id, body) {
    return handleResponse(
      await supabase.from("product_groups").update(body).eq("id", id).select().single()
    );
  },
  async remove(id) {
    return handleResponse(
      await supabase.from("product_groups").delete().eq("id", id)
    );
  },
};

// ─────────────────────────────────────────────
// ─── Products API
// ─────────────────────────────────────────────
export const productsApi = {
  async getAll(params = {}) {
    let query = supabase.from("products").select("*");

    if (params.group_id) query = query.eq("group_id", params.group_id);
    if (params.status)   query = query.eq("status", params.status);
    if (params.search)   query = query.ilike("name", `%${params.search}%`);
    if (params.slug)     query = query.eq("slug", params.slug); // ← thêm filter theo slug

    if (params.page && params.limit) {
      const from = (params.page - 1) * params.limit;
      const to = from + params.limit - 1;
      query = query.range(from, to);
    }

    query = query.order("created_at", { ascending: false });
    return handleResponse(await query);
  },

  async getOne(id) {
    return handleResponse(
      await supabase.from("products").select("*").eq("id", id).single()
    );
  },

  // ─── Lấy 1 sản phẩm theo slug (dùng cho trang chi tiết) ───────────────────
  async getBySlug(slug) {
    return handleResponse(
      await supabase.from("products").select("*").eq("slug", slug).eq("is_active", true).single()
    );
  },

  async create(body) {
    return handleResponse(
      await supabase.from("products").insert([body]).select().single()
    );
  },

  async update(id, body) {
    return handleResponse(
      await supabase.from("products").update(body).eq("id", id).select().single()
    );
  },

  async remove(id) {
    return handleResponse(
      await supabase.from("products").delete().eq("id", id)
    );
  },
};