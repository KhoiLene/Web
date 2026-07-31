// src/api.js — Backend Express version
// Toàn bộ admin (React/Vite) gọi Backend Express qua Vite proxy (/api → localhost:5050).
// KHÔNG còn dùng Supabase createClient ở đây.

const API_BASE = import.meta.env.VITE_API_URL || "/api";

// ─────────────────────────────────────────────
// HTTP helper
// ─────────────────────────────────────────────
export async function request(method, path, body) {
  const init = { method, headers: {} };
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined && body !== null) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}${path}`, init);
  const ct = res.headers.get("content-type") || "";
  const payload = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok || (payload && payload.success === false)) {
    throw new Error((payload && payload.error) || `HTTP ${res.status}`);
  }
  return payload && "data" in payload ? payload : { data: payload, total: payload?.length || 0 };
}

// GET kèm query string (PostgREST-style: col=eq.value, col=ilike.%foo%, col=in.(1,2,3), col=is.null)
function qs(params) {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === "") continue;
    sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// Helper wrap response theo shape Supabase cũ: { success, data, total }
function handleResponse(data) {
  return { success: true, data: data ?? null, total: Array.isArray(data) ? data.length : 1 };
}

// ─────────────────────────────────────────────
// Upload (multipart) — thay thế Supabase Storage
// ─────────────────────────────────────────────
export async function uploadImage(file, folder = "products") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("bucket", "product-images");
  fd.append("subfolder", folder);
  const r = await request("POST", "/upload", fd);
  return r.data.url;
}

async function uploadHomepageFile(file, subfolder = "misc") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("bucket", "homepage-assets");
  fd.append("subfolder", subfolder);
  const r = await request("POST", "/upload", fd);
  return r.data;
}

async function uploadManagerFile(file, subfolder = "videos") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("bucket", "upload-manager-assets");
  fd.append("subfolder", subfolder);
  const r = await request("POST", "/upload", fd);
  return r.data;
}

// ─────────────────────────────────────────────
// Product Groups API
// ─────────────────────────────────────────────
export const productGroupsApi = {
  async getAll() {
    const r = await request("GET", `/db/product_groups?order=sort_order.asc`);
    return handleResponse(r.data);
  },
  async getRoots() {
    const r = await request("GET", `/db/product_groups?parent_id=is.null&order=sort_order.asc`);
    return handleResponse(r.data);
  },
  async getChildren(parentId) {
    const r = await request("GET", `/db/product_groups?parent_id=eq.${parentId}&order=sort_order.asc`);
    return handleResponse(r.data);
  },
  async getOne(id) {
    const r = await request("GET", `/db/product_groups?id=eq.${id}`);
    const data = (r.data && r.data[0]) || null;
    return { success: true, data, total: data ? 1 : 0 };
  },
  async create(body) {
    const r = await request("POST", "/db/product_groups", body);
    return handleResponse(r.data);
  },
  async update(id, body) {
    const r = await request("PATCH", "/db/product_groups", { set: body, where: { id } });
    return handleResponse((r.data && r.data[0]) || null);
  },
  async remove(id) {
    const r = await request("DELETE", `/db/product_groups?id=eq.${id}`);
    return handleResponse(r.data);
  },
};

// ─────────────────────────────────────────────
// Products API
// ─────────────────────────────────────────────
export const productsApi = {
  async getAll(params = {}) {
    const query = {};
    if (params.group_id) query.group_id = `eq.${params.group_id}`;
    if (params.status) query.status = `eq.${params.status}`;
    if (params.includeDeleted !== true) query.status = `neq.deleted`;
    if (params.search) query.name = `ilike.%${params.search}%`;
    if (params.page && params.limit) {
      query.page = params.page;
      query.limit = params.limit;
    }
    const baseQs = qs(query);
    const sep = baseQs ? "&" : "?";
    const r = await request("GET", `/db/products${baseQs}${sep}order=created_at.desc`);
    return handleResponse(r.data);
  },
  async getOne(id) {
    const r = await request("GET", `/db/products?id=eq.${id}`);
    return handleResponse((r.data && r.data[0]) || null);
  },
  async getBySku(sku) {
    if (!sku) return null;
    const r = await request("GET", `/db/products?sku=eq.${encodeURIComponent(sku)}`);
    return (r.data && r.data[0]) || null;
  },
  async getManyBySku(skus = []) {
    const uniqueSkus = [...new Set(skus.filter(Boolean))];
    if (!uniqueSkus.length) return [];
    const inVal = `(${uniqueSkus.map((s) => `"${String(s).replace(/"/g, '\\"')}"`).join(",")})`;
    const r = await request("GET", `/db/products?sku=in.${inVal}`);
    return r.data || [];
  },
  async getAllSlugs() {
    const r = await request("GET", `/db/products?select=slug&slug=not.is.null`);
    return (r.data || []).map((row) => row.slug).filter(Boolean);
  },
  async create(body) {
    const r = await request("POST", "/db/products", body);
    return handleResponse(r.data);
  },
  async update(id, body) {
    const r = await request("PATCH", "/db/products", { set: body, where: { id } });
    return handleResponse((r.data && r.data[0]) || null);
  },
  async updateBySku(sku, body) {
    const r = await request("PATCH", "/db/products", { set: body, where: { sku } });
    return handleResponse((r.data && r.data[0]) || null);
  },
  async softDelete(id) {
    const r = await request("PATCH", "/db/products", {
      set: { status: "deleted", is_active: false },
      where: { id },
    });
    return handleResponse((r.data && r.data[0]) || null);
  },
  async restore(id) {
    const r = await request("PATCH", "/db/products", {
      set: { status: "active", is_active: true },
      where: { id },
    });
    return handleResponse((r.data && r.data[0]) || null);
  },
  async remove(id) {
    const r = await request("DELETE", `/db/products?id=eq.${id}`);
    return handleResponse(r.data);
  },
  async bulkSoftDelete(ids) {
    if (!ids.length) return { success: true, data: [] };
    const results = [];
    for (const id of ids) {
      const r = await request("PATCH", "/db/products", {
        set: { status: "deleted", is_active: false },
        where: { id },
      });
      if (r.data) results.push(...r.data);
    }
    return { success: true, data: results };
  },
  async bulkRestore(ids) {
    if (!ids.length) return { success: true, data: [] };
    const results = [];
    for (const id of ids) {
      const r = await request("PATCH", "/db/products", {
        set: { status: "active", is_active: true },
        where: { id },
      });
      if (r.data) results.push(...r.data);
    }
    return { success: true, data: results };
  },
};

// ─────────────────────────────────────────────
// Price List API
// ─────────────────────────────────────────────
export const priceListApi = {
  async getAll(params = {}) {
    const query = { order: "sort_order.asc" };
    if (params.search) query.name = `ilike.%${params.search}%`;
    if (params.sku) query.sku = `eq.${encodeURIComponent(params.sku)}`;
    if (params.group_id) query.group_id = `eq.${params.group_id}`;
    if (typeof params.is_active === "boolean") query.is_active = `eq.${params.is_active}`;
    if (params.page && params.limit) {
      query.page = params.page;
      query.limit = params.limit;
    }
    const r = await request("GET", `/db/price_list${qs(query)}`);
    return handleResponse(r.data);
  },
  async getPendingImport(params = {}) {
    // Lấy SKU đã có trong products
    const existingRes = await request("GET", `/db/products?select=sku&sku=not.is.null`);
    const existingSkus = (existingRes.data || []).map((r) => r.sku).filter(Boolean);

    const query = { order: "sort_order.asc" };
    if (params.search) query.name = `ilike.%${params.search}%`;
    if (params.group_id) query.group_id = `eq.${params.group_id}`;
    if (existingSkus.length) {
      const inVal = `(${existingSkus.map((s) => `"${String(s).replace(/"/g, '\\"')}"`).join(",")})`;
      query.sku = `not.in.${inVal}`;
    }
    if (params.page && params.limit) {
      query.page = params.page;
      query.limit = params.limit;
    }
    const r = await request("GET", `/db/price_list${qs(query)}`);
    return handleResponse(r.data);
  },
  async getOne(id) {
    const r = await request("GET", `/db/price_list?id=eq.${id}`);
    return handleResponse((r.data && r.data[0]) || null);
  },
  async create(body) {
    const r = await request("POST", "/db/price_list", body);
    return handleResponse(r.data);
  },
  async update(id, body) {
    const r = await request("PATCH", "/db/price_list", { set: body, where: { id } });
    return handleResponse((r.data && r.data[0]) || null);
  },
  async remove(id) {
    const r = await request("DELETE", `/db/price_list?id=eq.${id}`);
    return handleResponse(r.data);
  },
  async bulkUpsert(rows) {
    // Backend chưa hỗ trợ native upsert qua generic endpoint.
    // Loop theo từng row: tồn tại (theo sku) → PATCH, chưa có → POST.
    if (!rows.length) return { success: true, data: [] };
    const out = [];
    for (const row of rows) {
      if (!row.sku) continue;
      const exist = await request("GET", `/db/price_list?sku=eq.${encodeURIComponent(row.sku)}`);
      const found = exist.data && exist.data[0];
      if (found) {
        const r = await request("PATCH", "/db/price_list", { set: row, where: { id: found.id } });
        if (r.data) out.push(...r.data);
      } else {
        const r = await request("POST", "/db/price_list", row);
        if (r.data) out.push(r.data);
      }
    }
    return { success: true, data: out };
  },
};

// ─────────────────────────────────────────────
// Homepage API
// ─────────────────────────────────────────────
export const homepageApi = {
  async getConfig() {
    const r = await request("GET", `/db/homepage_config?id=eq.1`);
    const data = (r.data && r.data[0]) || null;
    return {
      background: data?.background ?? null,
      hero: data?.hero ?? null,
      sections: data?.sections ?? null,
      flashSale: data?.flash_sale ?? null,
      popup: data?.popup ?? null,
      updated_at: data?.updated_at ?? null,
    };
  },
  async updateConfig({ background, hero, sections, flashSale, popup }) {
    const payload = {
      id: 1,
      background,
      hero,
      sections,
      flash_sale: flashSale,
      popup,
      updated_at: new Date().toISOString(),
    };
    // Generic endpoint POST không có onConflict → upsert thủ công
    const exist = await request("GET", `/db/homepage_config?id=eq.1`);
    let r;
    if (exist.data && exist.data[0]) {
      r = await request("PATCH", "/db/homepage_config", { set: payload, where: { id: 1 } });
      r = { data: (r.data && r.data[0]) || payload };
    } else {
      r = await request("POST", "/db/homepage_config", payload);
    }
    const row = r.data;
    return {
      background: row.background,
      hero: row.hero,
      sections: row.sections,
      flashSale: row.flash_sale,
      popup: row.popup,
      updated_at: row.updated_at,
    };
  },
  async getArticles() {
    const r = await request("GET", `/db/homepage_articles?order=created_at.desc`);
    return { data: r.data || [] };
  },
  async createArticle(article) {
    const row = {
      type: article.type,
      title: article.title,
      url: article.url || null,
      file_url: article.fileUrl || null,
      file_name: article.fileName || null,
      file_size: article.fileSize || null,
    };
    const r = await request("POST", "/db/homepage_articles", row);
    return r.data;
  },
  async deleteArticle(id) {
    await request("DELETE", `/db/homepage_articles?id=eq.${id}`);
    return { success: true };
  },
  async uploadFile(file, subfolder = "misc") {
    return await uploadHomepageFile(file, subfolder);
  },
  async getAll() {
    const [cfgRaw, valuesRes, promosRes, blogRes, productsRes] = await Promise.all([
      this.getConfig(),
      homepageValuesApi.getAll(),
      homepagePromoBannersApi.getAll(),
      homepageBlogApi.getAll(),
      request("GET", `/db/products?status=neq.deleted&order=created_at.desc`),
    ]);

    const products = productsRes.data || [];

    const now = Date.now();
    const mapProduct = (p) => {
      const disc = Number(p.flash_sale_discount) || Number(p.discount) || 0;
      const basePrice = Number(p.final_price ?? p.price) || 0;
      const originalPrice = Number(p.price) || basePrice;
      const isExpired = !!(p.flash_sale_end_at && new Date(p.flash_sale_end_at).getTime() <= now);
      const hasDiscount = disc > 0 && !isExpired;
      return {
        id: p.id,
        title: p.name,
        name: p.name,
        category: p.group_name || "",
        price: hasDiscount ? Math.round(originalPrice * (1 - disc / 100)) : originalPrice,
        oldPrice: hasDiscount ? originalPrice : null,
        image: p.image_url || "",
        imageUrl: p.image_url || "",
        rating: p.rating ?? 5,
        reviews: p.reviews ?? 0,
        isNew: false,
        percentSold: 0,
        isExpired,
        flash_sale_discount: p.flash_sale_discount,
        flash_sale_end_at: p.flash_sale_end_at,
      };
    };

    const flashSaleProducts = products.filter((p) => Number(p.flash_sale_discount) > 0).map(mapProduct);

    const categoriesFromGroups = [
      ...new Map(
        products
          .filter((p) => p.group_name)
          .map((p) => [
            p.group_id ?? p.group_name,
            {
              id: p.group_id ?? p.group_name,
              name: p.group_name,
              image: p.image_url || "",
              imageUrl: p.image_url || "",
              link: "#",
            },
          ])
      ).values(),
    ];

    return {
      config: {
        background: cfgRaw.background,
        hero: cfgRaw.hero,
        sections: cfgRaw.sections,
        flashSale: cfgRaw.flashSale,
        popup: cfgRaw.popup,
      },
      slides: [],
      values: (valuesRes.data || []).map((r) => ({ id: r.id, icon: r.icon, title: r.title, desc: r.description || "" })),
      categories: categoriesFromGroups,
      promos: (promosRes.data || []).map((r) => ({
        id: r.id, position: r.position, tag: r.tag, title: r.title,
        imageUrl: r.image_url, ctaText: r.cta_text, ctaLink: r.cta_link,
      })),
      flashSale: { products: flashSaleProducts },
      blogs: (blogRes.data || []).map((r) => ({
        id: r.id, title: r.title, desc: r.description || "",
        author: r.author, image: r.image_url, imageUrl: r.image_url, link: r.link,
      })),
    };
  },
};

// ─────────────────────────────────────────────
// Posts API
// ─────────────────────────────────────────────
export const postsApi = {
  async getAll(params = {}) {
    const query = {};
    if (params.status) query.status = `eq.${params.status}`;
    if (params.category_id) query.category_id = `eq.${params.category_id}`;
    if (params.post_type) query.post_type = `eq.${params.post_type}`;
    if (params.search) query.title = `ilike.%${params.search}%`;
    if (params.page && params.limit) {
      query.page = params.page;
      query.limit = params.limit;
    }
    const baseQs = qs(query);
    const sep = baseQs ? "&" : "?";
    const r = await request("GET", `/db/posts${baseQs}${sep}order=published_at.desc`);
    return handleResponse(r.data);
  },
  async getOne(id) {
    const r = await request("GET", `/db/posts?id=eq.${id}`);
    return handleResponse((r.data && r.data[0]) || null);
  },
  async getBySlug(slug) {
    const r = await request("GET", `/db/posts?slug=eq.${encodeURIComponent(slug)}&status=eq.published`);
    return { data: (r.data && r.data[0]) || null };
  },
  async create(body) {
    const r = await request("POST", "/db/posts", body);
    return handleResponse(r.data);
  },
  async update(id, body) {
    const r = await request("PATCH", "/db/posts", { set: body, where: { id } });
    return handleResponse((r.data && r.data[0]) || null);
  },
  async remove(id) {
    const r = await request("DELETE", `/db/posts?id=eq.${id}`);
    return handleResponse(r.data);
  },
};

// ─────────────────────────────────────────────
// News Categories API
// ─────────────────────────────────────────────
export const newsCategoriesApi = {
  async getAll() {
    const r = await request("GET", `/db/news_categories?order=sort_order.asc`);
    return handleResponse(r.data);
  },
  async getRoots() {
    const r = await request("GET", `/db/news_categories?parent_id=is.null&order=sort_order.asc`);
    return handleResponse(r.data);
  },
  async getChildren(parentId) {
    const r = await request("GET", `/db/news_categories?parent_id=eq.${parentId}&order=sort_order.asc`);
    return handleResponse(r.data);
  },
  async getOne(id) {
    const r = await request("GET", `/db/news_categories?id=eq.${id}`);
    return handleResponse((r.data && r.data[0]) || null);
  },
  async getBySlug(slug) {
    const r = await request("GET", `/db/news_categories?slug=eq.${encodeURIComponent(slug)}`);
    return handleResponse((r.data && r.data[0]) || null);
  },
  async create(body) {
    const r = await request("POST", "/db/news_categories", body);
    return handleResponse(r.data);
  },
  async update(id, body) {
    const r = await request("PATCH", "/db/news_categories", { set: body, where: { id } });
    return handleResponse((r.data && r.data[0]) || null);
  },
  async remove(id) {
    const r = await request("DELETE", `/db/news_categories?id=eq.${id}`);
    return handleResponse(r.data);
  },
  async getTree() {
    const all = await this.getAll();
    const list = all.data || [];
    return list
      .filter((r) => !r.parent_id)
      .map((r) => ({ ...r, children: list.filter((c) => c.parent_id === r.id) }));
  },
  async countPosts(categoryId) {
    const r = await request("GET", `/db/posts?category_id=eq.${categoryId}&select=id&limit=1`);
    return (r.total != null) ? r.total : (r.data ? r.data.length : 0);
  },
};

// ─────────────────────────────────────────────
// News Scrape API — dùng backend Express /api/news/scrape để tránh CORS proxy bên ngoài
// ─────────────────────────────────────────────
export const newsScrapeApi = {
  async scrapeOne(url) {
    const r = await request("POST", "/news/scrape", { url });
    return r.data;
  },
  async scrapeBatch(urls) {
    const r = await request("POST", "/news/scrape-batch", { urls });
    return r.results || [];
  },
};

// ─────────────────────────────────────────────
// Homepage Values API
// ─────────────────────────────────────────────
export const homepageValuesApi = {
  async getAll() {
    const r = await request("GET", `/db/homepage_values?order=sort_order.asc`);
    return { data: r.data || [] };
  },
  async create(v) {
    const r = await request("POST", "/db/homepage_values", {
      icon: v.icon || "fas fa-seedling",
      title: v.title,
      description: v.desc || null,
      sort_order: v.sortOrder || 0,
      enabled: v.enabled !== false,
    });
    return r.data;
  },
  async update(id, v) {
    const r = await request("PATCH", "/db/homepage_values", {
      set: {
        icon: v.icon, title: v.title, description: v.desc || null,
        sort_order: v.sortOrder || 0, enabled: v.enabled !== false,
      },
      where: { id },
    });
    return (r.data && r.data[0]) || null;
  },
  async remove(id) {
    await request("DELETE", `/db/homepage_values?id=eq.${id}`);
    return { success: true };
  },
};

// ─────────────────────────────────────────────
// Homepage Promo Banners API
// ─────────────────────────────────────────────
export const homepagePromoBannersApi = {
  async getAll() {
    const r = await request("GET", `/db/homepage_promo_banners?order=sort_order.asc`);
    return { data: r.data || [] };
  },
  async upsert(b) {
    const exist = await request("GET", `/db/homepage_promo_banners?position=eq.${b.position}`);
    const payload = {
      position: b.position,
      tag: b.tag || null,
      title: b.title,
      image_url: b.imageUrl || null,
      cta_text: b.ctaText || "Mua ngay",
      cta_link: b.ctaLink || "#",
      sort_order: b.sortOrder || 0,
      enabled: b.enabled !== false,
    };
    if (exist.data && exist.data[0]) {
      const r = await request("PATCH", "/db/homepage_promo_banners", { set: payload, where: { id: exist.data[0].id } });
      return (r.data && r.data[0]) || null;
    }
    const r = await request("POST", "/db/homepage_promo_banners", payload);
    return r.data;
  },
};

// ─────────────────────────────────────────────
// Homepage Picks API
// ─────────────────────────────────────────────
export const homepagePicksApi = {
  async getAll() {
    const r = await request("GET", `/db/homepage_picks?order=sort_order.asc`);
    return { data: r.data || [] };
  },
  async getByKind(kind) {
    const r = await request("GET", `/db/homepage_picks?kind=eq.${kind}&order=sort_order.asc`);
    return { data: r.data || [] };
  },
  async create(p) {
    const payload = {
      kind: p.kind,
      target_id: String(p.targetId),
      target_kind: p.targetKind,
      custom_title: p.customTitle || null,
      custom_image: p.customImage || null,
      sort_order: p.sortOrder || 0,
      enabled: p.enabled !== false,
    };
    // Upsert thủ công: check trước
    const exist = await request("GET", `/db/homepage_picks?kind=eq.${p.kind}&target_id=eq.${String(p.targetId)}`);
    if (exist.data && exist.data[0]) {
      const r = await request("PATCH", "/db/homepage_picks", {
        set: {
          custom_title: payload.custom_title, custom_image: payload.custom_image,
          sort_order: payload.sort_order, enabled: payload.enabled,
        },
        where: { id: exist.data[0].id },
      });
      return (r.data && r.data[0]) || null;
    }
    const r = await request("POST", "/db/homepage_picks", payload);
    return r.data;
  },
  async update(id, p) {
    const r = await request("PATCH", "/db/homepage_picks", {
      set: {
        custom_title: p.customTitle || null,
        custom_image: p.customImage || null,
        sort_order: p.sortOrder || 0,
        enabled: p.enabled !== false,
      },
      where: { id },
    });
    return (r.data && r.data[0]) || null;
  },
  async remove(id) {
    await request("DELETE", `/db/homepage_picks?id=eq.${id}`);
    return { success: true };
  },
  async removeByKindAndTarget(kind, targetId) {
    await request("DELETE", `/db/homepage_picks?kind=eq.${kind}&target_id=eq.${String(targetId)}`);
    return { success: true };
  },
};

// ─────────────────────────────────────────────
// Homepage Blog API
// ─────────────────────────────────────────────
export const homepageBlogApi = {
  async getAll() {
    const r = await request("GET", `/db/homepage_blog?order=sort_order.asc,created_at.desc`);
    return { data: r.data || [] };
  },
  async create(b) {
    const r = await request("POST", "/db/homepage_blog", {
      title: b.title,
      description: b.desc || null,
      author: b.author || "Admin",
      image_url: b.imageUrl || null,
      link: b.link || "#",
      sort_order: b.sortOrder || 0,
      enabled: b.enabled !== false,
    });
    return r.data;
  },
  async update(id, b) {
    const r = await request("PATCH", "/db/homepage_blog", {
      set: {
        title: b.title, description: b.desc || null, author: b.author || "Admin",
        image_url: b.imageUrl || null, link: b.link || "#",
        sort_order: b.sortOrder || 0, enabled: b.enabled !== false,
      },
      where: { id },
    });
    return (r.data && r.data[0]) || null;
  },
  async remove(id) {
    await request("DELETE", `/db/homepage_blog?id=eq.${id}`);
    return { success: true };
  },
};

// ─────────────────────────────────────────────
// Upload Groups API
// ─────────────────────────────────────────────
export const uploadGroupsApi = {
  async getAll() {
    const r = await request("GET", `/db/upload_groups?order=sort_order.asc`);
    return handleResponse(r.data);
  },
  async getRoots() {
    const r = await request("GET", `/db/upload_groups?parent_id=is.null&order=sort_order.asc`);
    return handleResponse(r.data);
  },
  async getChildren(parentId) {
    const r = await request("GET", `/db/upload_groups?parent_id=eq.${parentId}&order=sort_order.asc`);
    return handleResponse(r.data);
  },
  async getOne(id) {
    const r = await request("GET", `/db/upload_groups?id=eq.${id}`);
    return handleResponse((r.data && r.data[0]) || null);
  },
  async getBySlug(slug) {
    const r = await request("GET", `/db/upload_groups?slug=eq.${encodeURIComponent(slug)}`);
    return handleResponse((r.data && r.data[0]) || null);
  },
  async create(body) {
    const r = await request("POST", "/db/upload_groups", body);
    return handleResponse(r.data);
  },
  async update(id, body) {
    const r = await request("PATCH", "/db/upload_groups", { set: body, where: { id } });
    return handleResponse((r.data && r.data[0]) || null);
  },
  async remove(id) {
    const r = await request("DELETE", `/db/upload_groups?id=eq.${id}`);
    return handleResponse(r.data);
  },
  async getTree() {
    const all = await this.getAll();
    const list = all.data || [];
    return list
      .filter((r) => !r.parent_id)
      .map((r) => ({ ...r, children: list.filter((c) => c.parent_id === r.id) }));
  },
  async countPosts(categoryId) {
    const r = await request("GET", `/db/videos?group_id=eq.${categoryId}&select=id&limit=1`);
    return (r.total != null) ? r.total : (r.data ? r.data.length : 0);
  },
};

// ─────────────────────────────────────────────
// About Content API
// ─────────────────────────────────────────────
export const aboutContentApi = {
  async get(groupId) {
    const r = await request("GET", `/db/about_content?group_id=eq.${groupId}`);
    return { content: (r.data && r.data[0]?.content) || "" };
  },
  async save(groupId, { content }) {
    const exist = await request("GET", `/db/about_content?group_id=eq.${groupId}`);
    const payload = { group_id: groupId, content, updated_at: new Date().toISOString() };
    if (exist.data && exist.data[0]) {
      const r = await request("PATCH", "/db/about_content", { set: payload, where: { id: exist.data[0].id } });
      return (r.data && r.data[0]) || null;
    }
    const r = await request("POST", "/db/about_content", payload);
    return r.data;
  },
};

// ─────────────────────────────────────────────
// Video API
// ─────────────────────────────────────────────
export const videoApi = {
  async getAll(params = {}) {
    const query = { order: "created_at.desc" };
    if (params.group_id === null) query.group_id = "is.null";
    else if (params.group_id) query.group_id = `eq.${params.group_id}`;
    const r = await request("GET", `/db/videos${qs(query)}`);
    return handleResponse(r.data);
  },
  async upload(form) {
    const file = form.get("video");
    const groupId = form.get("group_id");
    const title = form.get("title");
    if (!file) throw new Error("Thiếu file video");

    const up = await uploadManagerFile(file, "videos");

    const r = await request("POST", "/db/videos", {
      group_id: groupId || null,
      title: title || file.name,
      url: up.url,
      file_name: file.name,
      file_size: file.size,
    });
    return r.data;
  },
  async remove(id) {
    const r = await request("DELETE", `/db/videos?id=eq.${id}`);
    return handleResponse(r.data);
  },
};

// ─────────────────────────────────────────────
// Site Settings API (bảng site_settings key-value)
// ─────────────────────────────────────────────
export const siteSettingsApi = {
  async getAll() {
    const r = await request("GET", `/db/site_settings`);
    return handleResponse(r.data);
  },
  async get(key) {
    const r = await request("GET", `/db/site_settings?key=eq.${encodeURIComponent(key)}`);
    return (r.data && r.data[0]) || null;
  },
  async set(key, value) {
    const exist = await request("GET", `/db/site_settings?key=eq.${encodeURIComponent(key)}`);
    if (exist.data && exist.data[0]) {
      const r = await request("PATCH", "/db/site_settings", { set: { value }, where: { key } });
      return (r.data && r.data[0]) || null;
    }
    const r = await request("POST", "/db/site_settings", { key, value });
    return r.data;
  },
  // Lưu object dưới dạng JSON (value_json). Dùng cho jt_config, loyalty_tier_thresholds, v.v.
  async setJson(key, valueJson, description = null) {
    const exist = await request("GET", `/db/site_settings?key=eq.${encodeURIComponent(key)}`);
    const payload = {
      value_json: valueJson,
      updated_at: new Date().toISOString(),
    };
    if (description != null) payload.description = description;
    if (exist.data && exist.data[0]) {
      const r = await request("PATCH", "/db/site_settings", { set: payload, where: { key } });
      return (r.data && r.data[0]) || null;
    }
    const r = await request("POST", "/db/site_settings", { key, ...payload });
    return r.data;
  },
  // Đọc cấu hình dạng JSON — tự động lấy value_json hoặc parse value (text).
  // Dùng cho jt_config, loyalty_tier_thresholds, v.v.
  async getJson(key) {
    const row = await this.get(key);
    if (!row) return null;
    if (row.value_json != null) {
      if (typeof row.value_json === "object") return row.value_json;
      try { return JSON.parse(row.value_json); } catch { return null; }
    }
    if (typeof row.value === "string") {
      try { return JSON.parse(row.value); } catch { return row.value; }
    }
    return row.value ?? null;
  },
};

// ─────────────────────────────────────────────
// Orders / Customers / Dashboard (business endpoints)
// ─────────────────────────────────────────────
export const ordersApi = {
  async getAll(params = {}) {
    const r = await request("GET", `/orders${params.status ? `?status=${encodeURIComponent(params.status)}` : ""}`);
    return handleResponse(r.data);
  },
  async update(id, body) {
    const r = await request("PATCH", `/orders/${id}`, body);
    return r.data;
  },
  async bulkConfirm(ids) {
    const r = await request("POST", `/orders/bulk-confirm`, { ids });
    return r.data || [];
  },
  // Lấy danh sách items của 1 order (qua generic endpoint /api/db/order_items)
  async getItems(orderId) {
    const r = await request(
      "GET",
      `/db/order_items?order_id=eq.${orderId}&select=id,product_id,product_name,product_sku,image_url,quantity,unit_price,discount,subtotal,weight_grams&order=id.asc`
    );
    return r.data || [];
  },
  // Lấy items cho nhiều orders (in phiếu PDF)
  async getItemsByOrders(orderIds) {
    if (!orderIds || !orderIds.length) return [];
    const inVal = `(${orderIds.join(",")})`;
    const r = await request(
      "GET",
      `/db/order_items?order_id=in.${inVal}&select=order_id,product_name,product_sku,image_url,quantity,unit_price,discount,subtotal`
    );
    return r.data || [];
  },
};

export const customersApi = {
  async getAll() {
    const r = await request("GET", `/customers`);
    return handleResponse(r.data);
  },
  async update(id, body) {
    const r = await request("PATCH", `/customers/${id}`, body);
    return r.data;
  },
  async issueLoyaltyVoucher(id) {
    const r = await request("POST", `/customers/${id}/issue-loyalty-voucher`);
    return r.data;
  },
};

export const dashboardApi = {
  async getStats() {
    const r = await request("GET", `/dashboard/stats`);
    return r.data;
  },
  async getTransactions() {
    const r = await request("GET", `/dashboard/transactions`);
    return handleResponse(r.data);
  },
};

// ─────────────────────────────────────────────
// Reviews API
// ─────────────────────────────────────────────
export const reviewsApi = {
  async getAll(params = {}) {
    // Lấy tất cả reviews (cả pending + approved) cho admin
    const query = { order: "created_at.desc" };
    if (params.product_id) query.product_id = `eq.${params.product_id}`;
    if (params.rating)     query.rating     = `eq.${params.rating}`;
    if (params.status)     query.status     = `eq.${params.status}`;
    if (params.is_approved !== undefined && params.is_approved !== null) {
      query.is_approved = `eq.${params.is_approved}`;
    }
    if (params.search)     query.reviewer_name = `ilike.%${params.search}%`;
    if (params.page && params.limit) {
      query.page = params.page;
      query.limit = params.limit;
    }
    const r = await request("GET", `/db/product_reviews${qs(query)}`);
    return handleResponse(r.data);
  },
  async getOne(id) {
    const r = await request("GET", `/db/product_reviews?id=eq.${id}`);
    return handleResponse((r.data && r.data[0]) || null);
  },
  async approve(id) {
    const r = await request("PATCH", `/reviews/${id}/approve`);
    return r;
  },
  async reject(id) {
    // Reject = set is_approved=false, status=rejected
    const r = await request("PATCH", `/db/product_reviews`, {
      set: { is_approved: false, status: "rejected" },
      where: { id },
    });
    return handleResponse((r.data && r.data[0]) || null);
  },
  async remove(id) {
    const r = await request("DELETE", `/reviews/${id}`);
    return r;
  },
  // Stats
  async getStats() {
    const r = await request("GET", `/db/product_reviews?select=id,product_id,rating,is_approved,status&limit=1000`);
    const list = r.data || [];
    const total       = list.length;
    const pending     = list.filter((x) => !x.is_approved && x.status !== "rejected").length;
    const approved    = list.filter((x) => x.is_approved).length;
    const rejected    = list.filter((x) => x.status === "rejected").length;
    const sumRating   = list.filter((x) => x.is_approved).reduce((s, x) => s + (Number(x.rating) || 0), 0);
    const countRating = list.filter((x) => x.is_approved).length;
    const avgRating   = countRating > 0 ? sumRating / countRating : 0;
    return { total, pending, approved, rejected, avgRating, countRating };
  },
};

// ─────────────────────────────────────────────
// Products min-API (cho admin reviews dropdown search)
// ─────────────────────────────────────────────
export const productSearchApi = {
  async getAll() {
    const r = await request("GET", `/db/products?status=neq.deleted&select=id,name,slug&order=name.asc&limit=500`);
    return handleResponse(r.data);
  },
};

// ─────────────────────────────────────────────
// Legacy export: `supabase` (giữ để component cũ không import phải sửa ngay)
// Component nào dùng supabase.from(...).select/.insert/.update/.delete sẽ
// được refactor ở task #3 — đổi sang gọi `*Api` tương ứng.
// ─────────────────────────────────────────────
export const supabase = {
  from() {
    throw new Error("supabase.from() đã bị gỡ. Dùng các *Api trong src/api.js (productGroupsApi, productsApi, ...).");
  },
  storage: {
    from() {
      throw new Error("supabase.storage đã bị gỡ. Dùng uploadImage() hoặc homepageApi.uploadFile().");
    },
  },
};
