// src/api.js — Supabase version (NO backend)

// ─────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─────────────────────────────────────────────
// Helper
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
      await supabase
        .from("product_groups")
        .select("*")
        .order("sort_order", { ascending: true })
    );
  },

  async getOne(id) {
    return handleResponse(
      await supabase
        .from("product_groups")
        .select("*")
        .eq("id", id)
        .single()
    );
  },

  async create(body) {
    return handleResponse(
      await supabase
        .from("product_groups")
        .insert([body])
        .select()
        .single()
    );
  },

  async update(id, body) {
    return handleResponse(
      await supabase
        .from("product_groups")
        .update(body)
        .eq("id", id)
        .select()
        .single()
    );
  },

  async remove(id) {
    return handleResponse(
      await supabase
        .from("product_groups")
        .delete()
        .eq("id", id)
    );
  },
};

// ─────────────────────────────────────────────
// ─── Products API
// ─────────────────────────────────────────────
export const productsApi = {
  async getAll(params = {}) {
    let query = supabase.from("products").select("*");

    // filter
    if (params.group_id) {
      query = query.eq("group_id", params.group_id);
    }

    if (params.status) {
      query = query.eq("status", params.status);
    }

    // search
    if (params.search) {
      query = query.ilike("name", `%${params.search}%`);
    }

    // pagination
    if (params.page && params.limit) {
      const from = (params.page - 1) * params.limit;
      const to = from + params.limit - 1;
      query = query.range(from, to);
    }

    // sort
    query = query.order("created_at", { ascending: false });

    return handleResponse(await query);
  },

  async getOne(id) {
    return handleResponse(
      await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single()
    );
  },

  async create(body) {
    return handleResponse(
      await supabase
        .from("products")
        .insert([body])
        .select()
        .single()
    );
  },

  async update(id, body) {
    return handleResponse(
      await supabase
        .from("products")
        .update(body)
        .eq("id", id)
        .select()
        .single()
    );
  },

  async remove(id) {
    return handleResponse(
      await supabase
        .from("products")
        .delete()
        .eq("id", id)
    );
  },
};