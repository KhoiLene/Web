// src/components/api-service/api.js — Backend Express version
// Toàn bộ shop gọi Backend Express qua Angular proxy (/api → localhost:5050).
// KHÔNG còn dùng Supabase createClient.

const API_BASE = (typeof window !== "undefined" && window.__API_BASE__) || "/api";

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
  return payload && "data" in payload ? payload : { data: payload };
}

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

function handleResponse(data) {
  return {
    success: true,
    data,
    total: Array.isArray(data) ? data.length : 1,
  };
}

function handleError(error, fallbackMsg) {
  throw new Error(error?.message || fallbackMsg || "Unknown error");
}

// ─────────────────────────────────────────────
// Product Groups API (menu SALE / SẢN PHẨM trên header)
// Schema: id, name, slug, image_url, parent_id,
//         is_active, is_slider, is_sale, sort_order
// ─────────────────────────────────────────────
export const productGroupsApi = {
  async getAll() {
    const r = await request(
      "GET",
      `/db/product_groups?select=id,name,slug,image_url,parent_id,is_active,is_slider,is_sale,sort_order&order=sort_order.asc`
    );
    return handleResponse(r.data || []);
  },
  async getRoots() {
    const r = await request(
      "GET",
      `/db/product_groups?select=id,name,slug,image_url,parent_id,is_active,is_slider,is_sale,sort_order&parent_id=is.null&order=sort_order.asc`
    );
    return handleResponse(r.data || []);
  },
};

// ─────────────────────────────────────────────
// Upload Groups API (nhóm tin tức/video)
// Schema: id, name, slug, icon, parent_id, is_active, sort_order
// ─────────────────────────────────────────────
export const uploadGroupsApi = {
  async getAll() {
    const r = await request(
      "GET",
      `/db/upload_groups?select=id,name,slug,icon,parent_id,is_active,sort_order&order=sort_order.asc`
    );
    return handleResponse(r.data || []);
  },
  async getTree() {
    const res = await this.getAll();
    const all = res.data || [];
    const roots = all
      .filter((r) => r.parent_id == null && r.is_active !== false)
      .map((r) => ({
        ...r,
        children: all
          .filter((c) => c.parent_id === r.id && c.is_active !== false)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
      }))
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    return { data: roots, total: roots.length };
  },
  async getOne(id) {
    const r = await request("GET", `/db/upload_groups?id=eq.${id}`);
    const row = (r.data && r.data[0]) || null;
    if (!row) handleError({ message: "not found" }, "Không tìm thấy nhóm upload_groups");
    return handleResponse(row);
  },
};

// ─────────────────────────────────────────────
// About Content API
// ─────────────────────────────────────────────
export const aboutContentApi = {
  async get(groupId) {
    if (!groupId) return { content: "" };
    const r = await request("GET", `/db/about_content?group_id=eq.${groupId}&select=content`);
    const row = (r.data && r.data[0]) || null;
    return { content: row?.content ?? "" };
  },
  async save(groupId, { content }) {
    if (!groupId) throw new Error("Thiếu groupId để lưu about_content");
    const exist = await request("GET", `/db/about_content?group_id=eq.${groupId}&select=id`);
    const payload = { group_id: groupId, content, updated_at: new Date().toISOString() };
    if (exist.data && exist.data[0]) {
      const r = await request("PATCH", "/db/about_content", { set: payload, where: { id: exist.data[0].id } });
      return (r.data && r.data[0]) || null;
    }
    const r = await request("POST", "/db/about_content", payload);
    return r.data;
  },
  async submitRequest(payload) {
    const r = await request("POST", "/db/about_requests", {
      group_id: payload.groupId || null,
      title: payload.title,
      body: payload.body,
      link: payload.link || null,
      status: "pending",
      created_at: new Date().toISOString(),
    });
    return handleResponse(r.data);
  },
};

// ─────────────────────────────────────────────
// Products API
// ─────────────────────────────────────────────
export const productsApi = {
  async getAll(params = {}) {
    const query = { order: "created_at.desc" };
    if (params.group_id) query.group_id = `eq.${params.group_id}`;
    if (params.search) query.name = `ilike.%${params.search}%`;
    if (params.page && params.limit) {
      query.page = params.page;
      query.limit = params.limit;
    } else if (params.limit) {
      query.limit = params.limit;
    }
    const r = await request("GET", `/db/products${qs(query)}`);
    // Lọc is_active != false phía client (đơn giản, generic endpoint không có OR phức tạp)
    let list = (r.data || []).filter((p) => p.is_active === undefined || p.is_active !== false);
    if (!params.includeDeleted && !params.status) {
      list = list.filter((p) => !p.status || p.status !== "deleted");
    } else if (params.status) {
      list = list.filter((p) => p.status === params.status);
    }
    return handleResponse(list);
  },
  async getOne(id) {
    const r = await request("GET", `/db/products?id=eq.${id}`);
    const row = (r.data && r.data[0]) || null;
    if (!row) handleError({ message: "not found" }, "Không tìm thấy sản phẩm");
    return handleResponse(row);
  },
  async getBySlug(slug) {
    const r = await request("GET", `/db/products?slug=eq.${encodeURIComponent(slug)}`);
    const row = (r.data && r.data[0]) || null;
    if (!row) handleError({ message: "not found" }, "Không tìm thấy sản phẩm với slug này");
    return handleResponse(row);
  },
};

// ─────────────────────────────────────────────
// News Categories API
// ─────────────────────────────────────────────
export const newsCategoriesApi = {
  async getAll() {
    const r = await request(
      "GET",
      `/db/news_categories?select=id,name,slug,icon,parent_id,is_active,sort_order&order=sort_order.asc`
    );
    return handleResponse(r.data || []);
  },
};

// ─────────────────────────────────────────────
// Homepage API
// - Hero config + sections ← homepage_config
// - Slider / Danh mục nổi bật ← product_groups
// - Brand values / Promo banners / Blog / Articles ← bảng riêng
// - Flash sale ← products
// ─────────────────────────────────────────────
export const homepageApi = {
  async getAll() {
    // Gọi song song tất cả nguồn
    const [
      cfgRes,
      valuesRes,
      promosRes,
      blogRes,
      articlesRes,
      groupsSliderRes,
      groupsActiveRes,
      productsFlashRes,
    ] = await Promise.all([
      request("GET", `/db/homepage_config?id=eq.1&select=background,hero,sections,flash_sale,updated_at`),
      request("GET", `/db/homepage_values?enabled=eq.true&order=sort_order.asc`),
      request("GET", `/db/homepage_promo_banners?enabled=eq.true&order=sort_order.asc`),
      request("GET", `/db/homepage_blog?enabled=eq.true&order=sort_order.asc`),
      request("GET", `/db/homepage_articles?order=created_at.desc`),
      // Slider: product_groups is_slider=true, parent_id null, active
      request(
        "GET",
        `/db/product_groups?select=id,name,slug,image_url,is_sale,is_slider,sort_order,slider_text,intro_title,intro_subtitle,intro_image_url,description&parent_id=is.null&is_slider=eq.true&is_active=eq.true&order=sort_order.asc`
      ),
      // Danh mục nổi bật: TẤT CẢ product_groups CHA đang active
      request(
        "GET",
        `/db/product_groups?select=id,name,slug,image_url,is_sale,is_slider,sort_order,slider_text,intro_title,intro_subtitle,intro_image_url,description&parent_id=is.null&is_active=eq.true&order=sort_order.asc`
      ),
      // Flash sale: sản phẩm active, sắp xếp mới nhất, lấy tối đa 12 SP
      request(
        "GET",
        `/db/products?select=id,name,slug,group_id,price,final_price,discount,image_url,rating,reviews,is_new,stock,created_at&is_active=neq.false&order=created_at.desc&limit=12`
      ),
    ]);

    const cfg = (cfgRes.data && cfgRes.data[0]) || null;

    const categories = (groupsActiveRes.data || []).map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description || "",
      imageUrl: g.image_url || "",
      sliderText: g.slider_text || "",
      introTitle: g.intro_title || "",
      introSubtitle: g.intro_subtitle || "",
      introImageUrl: g.intro_image_url || "",
      link: `/components/nhom-san-pham/nhom-san-pham.html?slug=${encodeURIComponent(g.slug || g.id || "")}`,
    }));

    const introItems = (groupsActiveRes.data || [])
      .filter((g) => g.intro_title || g.intro_subtitle || g.intro_image_url)
      .map((g) => ({
        id: g.id,
        name: g.name,
        title: g.intro_title || "",
        subtitle: g.intro_subtitle || "",
        imageUrl: g.intro_image_url || g.image_url || "",
        link: `/components/nhom-san-pham/nhom-san-pham.html?slug=${encodeURIComponent(g.slug || g.id || "")}`,
      }));

    const sliderTexts = (groupsActiveRes.data || [])
      .filter((g) => g.slider_text && g.slider_text.trim())
      .map((g) => g.slider_text.trim());

    const slides = (groupsSliderRes.data || []).map((g) => ({
      id: g.id,
      badge: g.is_sale ? "SALE" : "Bộ sưu tập",
      title: g.name,
      desc: g.slider_text || "",
      imageUrl: g.image_url || "",
      link: `/components/nhom-san-pham/nhom-san-pham.html?slug=${encodeURIComponent(g.slug || g.id || "")}`,
    }));

    const flashProducts = (productsFlashRes.data || []).map((p) => {
      const originalPrice = Number(p.price) || 0;
      const salePrice = p.final_price != null && Number(p.final_price) > 0
        ? Number(p.final_price)
        : (Number(p.discount) > 0
            ? Math.round(originalPrice * (1 - Number(p.discount) / 100))
            : originalPrice);
      const hasDiscount = salePrice < originalPrice;
      return {
        id: p.id,
        title: p.name,
        category: "",
        price: salePrice,
        oldPrice: originalPrice,
        rating: Number(p.rating) || 5,
        reviews: Number(p.reviews) || 0,
        imageUrl: p.image_url || (Array.isArray(p.images) ? p.images[0] : "") || "",
        isNew: !!p.is_new,
        percentSold: 50,
        discount: hasDiscount ? Math.round((1 - salePrice / originalPrice) * 100) : 0,
        endAt: null,
        isExpired: false,
      };
    });

    return {
      config: {
        background: cfg?.background || { type: "color", color: "#1e3a8a", imageUrl: "", videoUrl: "" },
        hero:       cfg?.hero       || { enabled: true, imageUrl: "", title: "", subtitle: "", ctaText: "", ctaLink: "#" },
        sections:   cfg?.sections   || {
          heroSlider: true, brandValues: true, categories: true,
          flashSale: true, bestSellers: true, promoBanners: true,
          blog: true, newsletter: true, sliderText: true, intro: true,
        },
        flashSale: cfg?.flash_sale || { title: "Giờ Vàng Deal Xịn", countdownSeconds: 10800, enabled: true },
      },
      slides,
      values:   (valuesRes.data || []).map((r) => ({ id: r.id, icon: r.icon, title: r.title, desc: r.description })),
      categories,
      introItems,
      sliderTexts,
      promos:   (promosRes.data || []).map((r) => ({
        id: r.id, position: r.position, tag: r.tag, title: r.title,
        imageUrl: r.image_url, ctaText: r.cta_text, ctaLink: r.cta_link,
      })),
      flashSale: {
        ...(cfg?.flash_sale || { title: "Giờ Vàng Deal Xịn", countdownSeconds: 10800, enabled: true }),
        products: flashProducts,
      },
      blogs: (blogRes.data || []).map((r) => ({
        id: r.id, title: r.title, desc: r.description, author: r.author, imageUrl: r.image_url, link: r.link,
      })),
      articles: (articlesRes.data || []).map((r) => ({
        id: r.id, type: r.type, title: r.title, url: r.url,
        fileUrl: r.file_url, fileName: r.file_name, fileSize: r.file_size,
        createdAt: r.created_at,
      })),
      bestSellers: await loadBestSellersSafe(),
    };
  },
};

// ─────────────────────────────────────────────
// Lấy top sản phẩm bán chạy
// (loại trừ đơn cancelled / deleted_before_ship).
// ─────────────────────────────────────────────
async function loadBestSellersSafe(limit = 12) {
  try {
    const items = await fetchOrderItemsForBestSellers();
    if (items && items.length) {
      const ranked = await aggregateBestSellers(items, limit);
      if (ranked.length) return ranked;
    }
    console.info("[bestSellers] Chưa có dữ liệu bán hàng → fallback sản phẩm active tạo sớm nhất.");
    return await fetchOldestActiveProducts(limit);
  } catch (err) {
    console.warn("[bestSellers] unexpected:", err);
    return [];
  }
}

// Lấy order_items KHÔNG thuộc đơn cancelled/deleted_before_ship
async function fetchOrderItemsForBestSellers() {
  // Backend hiện chưa có endpoint /api/best-sellers — query trực tiếp generic.
  // Lọc đơn cancelled/deleted_before_ship phía client (số lượng đơn nhỏ).
  const r = await request(
    "GET",
    `/db/order_items?select=product_id,product_name,image_url,quantity,unit_price,discount,subtotal,order_id&product_id=not.is.null&limit=5000`
  );
  if (!r.data || !r.data.length) return [];

  // Lấy orders để filter status
  const oRes = await request(
    "GET",
    `/db/orders?select=id,status&limit=5000`
  );
  const orderMap = new Map((oRes.data || []).map((o) => [o.id, o.status]));
  const skipStatuses = new Set(["cancelled", "deleted_before_ship"]);
  return r.data.filter((it) => {
    const s = orderMap.get(it.order_id);
    return !s || !skipStatuses.has(String(s).toLowerCase());
  });
}

async function aggregateBestSellers(items, limit) {
  const agg = new Map();
  for (const it of items) {
    const pid = it.product_id;
    if (!agg.has(pid)) {
      agg.set(pid, {
        product_id: pid,
        product_name: it.product_name,
        image_url: it.image_url,
        sold: 0,
        revenue: 0,
      });
    }
    const a = agg.get(pid);
    a.sold += Number(it.quantity) || 0;
    a.revenue += Number(it.subtotal) || 0;
    if (!a.image_url && it.image_url) a.image_url = it.image_url;
  }

  const ids = [...agg.keys()];
  const inVal = `(${ids.join(",")})`;
  const pRes = await request(
    "GET",
    `/db/products?id=in.${inVal}&select=id,name,slug,image_url,images,price,final_price,discount,old_price,rating,reviews,is_new,category,group_id,is_active,status`
  );
  const prodMap = new Map((pRes.data || []).map((p) => [p.id, p]));

  return [...agg.values()]
    .map((a) => mapProductToBestSeller(prodMap.get(a.product_id), a, "sales"))
    .filter(Boolean)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, limit);
}

async function fetchOldestActiveProducts(limit) {
  const r = await request(
    "GET",
    `/db/products?select=id,name,slug,image_url,images,price,final_price,discount,old_price,rating,reviews,is_new,category,group_id,is_active,status&is_active=neq.false&status=eq.active&order=created_at.asc&limit=${limit}`
  );
  return (r.data || []).map((p) => mapProductToBestSeller(p, null, "fallback")).filter(Boolean);
}

function mapProductToBestSeller(p, soldAgg, source = "sales") {
  if (!p) return null;
  if (p.is_active === false) return null;
  if (p.status && p.status !== "active") return null;

  const originalPrice = Number(p.price) || 0;
  const salePrice = p.final_price != null && Number(p.final_price) > 0
    ? Number(p.final_price)
    : (Number(p.discount) > 0
        ? Math.round(originalPrice * (1 - Number(p.discount) / 100))
        : originalPrice);
  const oldPrice = p.old_price != null && Number(p.old_price) > originalPrice
    ? Number(p.old_price) : null;
  const img = p.image_url || (Array.isArray(p.images) ? p.images[0] : "") || (soldAgg?.image_url) || "";

  return {
    id: p.id,
    title: p.name,
    slug: p.slug,
    price: salePrice,
    oldPrice: oldPrice && oldPrice > salePrice ? oldPrice : null,
    image: img,
    rating: Number(p.rating) || 5,
    reviews: Number(p.reviews) || 0,
    isNew: !!p.is_new,
    category: p.category || "all",
    categoryName: p.category || "Khác",
    groupId: p.group_id,
    sold: soldAgg?.sold || 0,
    source,
    link: `/components/san-pham/san-pham.html?slug=${encodeURIComponent(p.slug || p.id)}`,
  };
}

// ─────────────────────────────────────────────
// Best Sellers API (public)
// ─────────────────────────────────────────────
export const bestSellersApi = {
  async getTop(limit = 12) {
    return await loadBestSellersSafe(limit);
  },
};

// ─────────────────────────────────────────────
// Orders API (gio-hang.js, khach-hang.js dùng)
// Wrapper cho /api/orders (business endpoint) + /db/orders (generic).
// ─────────────────────────────────────────────
export const ordersApi = {
  // Lấy tất cả đơn (status=all) hoặc theo status cụ thể
  async getAll(status = "all") {
    const r = await request("GET", `/orders?status=${encodeURIComponent(status)}`);
    return r.data || [];
  },
  // Lấy theo id
  async getById(id) {
    const r = await request("GET", `/orders/${id}`);
    return r.data;
  },
  // Tạo đơn (insert row mới vào orders)
  async create(payload) {
    const r = await request("POST", `/db/orders`, payload);
    return r.data;
  },
  // Update 1 đơn (vd: status, jt_*)
  async update(id, payload) {
    const r = await request("PATCH", `/db/orders`, { set: payload, where: { id } });
    return r.data;
  },
  // Bulk confirm
  async bulkConfirm(ids) {
    const r = await request("POST", `/orders/bulk-confirm`, { ids });
    return r.data || [];
  },
};

// ─────────────────────────────────────────────
// Customers API (khach-hang.js dùng)
// Wrapper cho /db/customers (generic).
// ─────────────────────────────────────────────
export const customersApi = {
  async getAll(limit = 100) {
    const r = await request("GET", `/db/customers?order=created_at.desc&limit=${limit}`);
    return r.data || [];
  },
  async getById(id) {
    const r = await request("GET", `/db/customers?id=eq.${id}&limit=1`);
    return r.data?.[0] || null;
  },
  async getByEmail(email) {
    const r = await request("GET", `/db/customers?email=eq.${encodeURIComponent(email)}&limit=1`);
    return r.data?.[0] || null;
  },
  async update(id, payload) {
    const r = await request("PATCH", `/db/customers`, { set: payload, where: { id } });
    return r.data;
  },
  async create(payload) {
    const r = await request("POST", `/db/customers`, payload);
    return r.data;
  },
};

// ─────────────────────────────────────────────
// Posts API (tin-tuc.js dùng)
// Wrapper cho /db/posts (generic).
// ─────────────────────────────────────────────
export const postsApi = {
  async getAll(params = {}) {
    const search = new URLSearchParams();
    if (params.status) search.set("status", `eq.${params.status}`);
    if (params.category_id != null) search.set("category_id", `eq.${params.category_id}`);
    if (params.order) search.set("order", params.order);
    if (params.limit) search.set("limit", String(params.limit));
    const q = search.toString();
    const r = await request("GET", `/db/posts${q ? "?" + q : ""}`);
    return r.data || [];
  },
  async getById(id) {
    const r = await request("GET", `/db/posts?id=eq.${id}&limit=1`);
    return r.data?.[0] || null;
  },
  async getBySlug(slug) {
    const r = await request("GET", `/db/posts?slug=eq.${encodeURIComponent(slug)}&limit=1`);
    return r.data?.[0] || null;
  },
  async getPublished(limit = 100) {
    return this.getAll({ status: "published", order: "published_at.desc", limit });
  },
  async create(payload) {
    const r = await request("POST", "/db/posts", payload);
    return r.data;
  },
};

// ─────────────────────────────────────────────
// News Scrape API (dùng backend /api/news/scrape)
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
// Legacy export: `supabase` (giữ để partial import không lỗi ngay)
// Một số file cũ vẫn import supabase.from(...) — sẽ được refactor ở bước sau.
// ─────────────────────────────────────────────
export const supabase = {
  from() {
    throw new Error("supabase đã gỡ — dùng productGroupsApi/productsApi/uploadGroupsApi/aboutContentApi/newsCategoriesApi/homepageApi/bestSellersApi trong api-service/api.js");
  },
};