// src/api.js — Supabase version (KHÔNG dùng Express backend)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://pbuqcvlcqrxdammvbwvs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBidXFjdmxjcXJ4ZGFtbXZid3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTA0NDAsImV4cCI6MjA5NzA4NjQ0MH0.YmRjW__dNqhhO0E8GUqoon6hqpA4k6rXYIFeV_PuVnY";


export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
// ─── Product Groups API
// ─────────────────────────────────────────────
export const productGroupsApi = {
  async getAll() {
    const { data, error } = await supabase.from("product_groups").select("*");
    if (error) handleError(error, "Không lấy được danh sách nhóm sản phẩm");
    return handleResponse(data);
  },

  async getOne(id) {
    const { data, error } = await supabase
      .from("product_groups")
      .select("*")
      .eq("id", id)
      .single();
    if (error) handleError(error, "Không tìm thấy nhóm sản phẩm");
    return handleResponse(data);
  },

  async create(body) {
    const { data, error } = await supabase
      .from("product_groups")
      .insert(body)
      .select()
      .single();
    if (error) handleError(error, "Tạo nhóm sản phẩm thất bại");
    return handleResponse(data);
  },

  async update(id, body) {
    const { data, error } = await supabase
      .from("product_groups")
      .update(body)
      .eq("id", id)
      .select()
      .single();
    if (error) handleError(error, "Cập nhật nhóm sản phẩm thất bại");
    return handleResponse(data);
  },

  async remove(id) {
    const { data, error } = await supabase
      .from("product_groups")
      .delete()
      .eq("id", id);
    if (error) handleError(error, "Xóa nhóm sản phẩm thất bại");
    return handleResponse(data);
  },
};

// ─────────────────────────────────────────────
// ─── Products API
// ─────────────────────────────────────────────
export const productsApi = {
  async getAll(params = {}) {
    let query = supabase.from("products").select("*", { count: "exact" });

    if (params.group_id) query = query.eq("group_id", params.group_id);
    if (params.status !== undefined) query = query.eq("status", params.status);
    if (params.search) query = query.ilike("name", `%${params.search}%`);

    if (params.page && params.limit) {
      const from = (params.page - 1) * params.limit;
      const to = from + params.limit - 1;
      query = query.range(from, to);
    } else if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;
    if (error) handleError(error, "Không lấy được danh sách sản phẩm");
    return handleResponse(data);
  },

  async getOne(id) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();
    if (error) handleError(error, "Không tìm thấy sản phẩm");
    return handleResponse(data);
  },

  async getBySlug(slug) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .single();
    if (error) handleError(error, "Không tìm thấy sản phẩm với slug này");
    return handleResponse(data);
  },

  async create(body) {
    const { data, error } = await supabase
      .from("products")
      .insert(body)
      .select()
      .single();
    if (error) handleError(error, "Tạo sản phẩm thất bại");
    return handleResponse(data);
  },

  async update(id, body) {
    const { data, error } = await supabase
      .from("products")
      .update(body)
      .eq("id", id)
      .select()
      .single();
    if (error) handleError(error, "Cập nhật sản phẩm thất bại");
    return handleResponse(data);
  },

  async remove(id) {
    const { data, error } = await supabase.from("products").delete().eq("id", id);
    if (error) handleError(error, "Xóa sản phẩm thất bại");
    return handleResponse(data);
  },
};

// ─────────────────────────────────────────────
// ─── Homepage API (shop đọc cấu hình từ Supabase)
// - Slider         ← product_groups có is_slider = true
// - Danh mục nổi bật ← TẤT CẢ sản phẩm (không lọc cờ, sắp theo created_at desc)
// - Flash sale      ← TẤT CẢ sản phẩm, lọc theo flash_sale_discount
//                      và flash_sale_end_at (hết hạn sẽ tự trả giá gốc)
// - Promo / Blog / Articles / Values ← bảng riêng
// ─────────────────────────────────────────────

export const homepageApi = {
  async getAll() {
    const [
      cfgRes, valuesRes, promosRes, blogRes, articlesRes,
      groupsSliderRes, productsAllRes,
    ] = await Promise.all([
      supabase.from("homepage_config").select("background, hero, sections, flash_sale, updated_at").eq("id", 1).maybeSingle(),
      supabase.from("homepage_values").select("*").eq("enabled", true).order("sort_order"),
      supabase.from("homepage_promo_banners").select("*").eq("enabled", true).order("sort_order"),
      supabase.from("homepage_blog").select("*").eq("enabled", true).order("sort_order"),
      supabase.from("homepage_articles").select("*").order("created_at", { ascending: false }),
      // Slider: lấy từ product_groups có cờ is_slider
      supabase.from("product_groups").select("*").eq("is_slider", true).order("sort_order"),
      // Lấy TẤT CẢ sản phẩm — dùng chung cho cả Danh mục lẫn Flash sale
      supabase
        .from("products")
        .select("id, name, slug, category, price, old_price, image, image_url, rating, reviews, is_new, percent_sold, flash_sale_discount, flash_sale_end_at, created_at")
        .order("created_at", { ascending: false }),
    ]);

    const safe = (r) => (r?.error ? { data: [] } : r);
    const cfg = cfgRes?.data;

    // Map product_groups → slide format
    const slides = (safe(groupsSliderRes).data || []).map((g) => ({
      id: g.id,
      badge: g.badge || "Bộ sưu tập",
      title: g.name,
      desc: g.description || "",
      imageUrl: g.image_url || g.image || "",
      link: g.link || `/san-pham?group=${g.id}`,
    }));

    const allProducts = safe(productsAllRes).data || [];
    const now = Date.now();

    // Map TẤT CẢ sản phẩm → category card (không lọc cờ)
    const categories = allProducts.map((p) => ({
      id: p.id,
      name: p.name,
      imageUrl: p.image_url || p.image || "",
      link: `/san-pham/${p.slug || p.id}`,
    }));

    // Map sản phẩm → flash sale item, lọc theo flash_sale_discount
    // Quy tắc:
    //   - SP có flash_sale_discount > 0
    //   - Nếu còn hạn (flash_sale_end_at null hoặc > now):
    //       price  = round(price * (1 - discount/100))   ← giá sale
    //       oldPrice = price gốc
    //       isExpired = false
    //   - Nếu đã hết hạn:
    //       price = oldPrice = price gốc                 ← tự trả về giá gốc
    //       isExpired = true                             ← FE hiển thị badge "Hết hạn"
    //   - Nếu không có discount: bỏ qua.
    const flashProducts = allProducts
      .filter((p) => {
        const discount = Number(p.flash_sale_discount);
        return discount && discount > 0;
      })
      .map((p) => {
        const originalPrice = Number(p.price) || 0;
        const discount = Number(p.flash_sale_discount) || 0;
        const endTs = p.flash_sale_end_at ? new Date(p.flash_sale_end_at).getTime() : null;
        const isExpired = endTs !== null && endTs <= now;
        const newPrice = isExpired
          ? originalPrice
          : Math.round(originalPrice * (1 - discount / 100));
        return {
          id: p.id,
          title: p.name,
          category: p.category || "",
          price: newPrice,
          oldPrice: originalPrice,
          rating: Number(p.rating) || 5,
          reviews: Number(p.reviews) || 0,
          imageUrl: p.image_url || p.image || "",
          isNew: !!p.is_new,
          percentSold: Number(p.percent_sold) || 50,
          discount,
          endAt: p.flash_sale_end_at || null,
          isExpired,
        };
      });

    return {
      config: {
        background: cfg?.background || { type: "color", color: "#6a11cb", imageUrl: "", videoUrl: "" },
        hero:       cfg?.hero       || { enabled: true, imageUrl: "", title: "", subtitle: "", ctaText: "", ctaLink: "#" },
        sections:   cfg?.sections   || {
          heroSlider: true, brandValues: true, categories: true,
          flashSale: true, bestSellers: true, promoBanners: true,
          blog: true, newsletter: true,
        },
        flashSale: cfg?.flash_sale || { title: "Giờ Vàng Deal Xịn", countdownSeconds: 10800, enabled: true },
      },
      slides,
      values:   (safe(valuesRes).data || []).map((r) => ({ id: r.id, icon: r.icon, title: r.title, desc: r.desc })),
      categories,
      promos:   (safe(promosRes).data || []).map((r) => ({
        id: r.id, position: r.position, tag: r.tag, title: r.title,
        imageUrl: r.image_url, ctaText: r.cta_text, ctaLink: r.cta_link,
      })),
      flashSale: {
        ...(cfg?.flash_sale || { title: "Giờ Vàng Deal Xịn", countdownSeconds: 10800, enabled: true }),
        products: flashProducts,
      },
      blogs: (safe(blogRes).data || []).map((r) => ({
        id: r.id, title: r.title, desc: r.desc, author: r.author, imageUrl: r.image_url, link: r.link,
      })),
      articles: (safe(articlesRes).data || []).map((r) => ({
        id: r.id, type: r.type, title: r.title, url: r.url,
        fileUrl: r.file_url, fileName: r.file_name, fileSize: r.file_size,
        createdAt: r.created_at,
      })),
    };
  },
};