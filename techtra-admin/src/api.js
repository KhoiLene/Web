// // // src/api.js — Supabase version (NO backend)

// // // ─────────────────────────────────────────────
// // import { createClient } from "@supabase/supabase-js";

// // const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
// // const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// // export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// // // Bucket lưu file (ảnh / video / pdf / word) do HomePage upload
// // const HOMEPAGE_BUCKET = "homepage-assets";

// // // ─────────────────────────────────────────────
// // // Upload file lên Supabase Storage, trả về { url, fileName, size }
// // async function uploadHomepageFile(file, subfolder = "misc") {
// //   const ext = (file.name.split(".").pop() || "bin").toLowerCase();
// //   const fileName = `${subfolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

// //   const { error } = await supabase.storage
// //     .from(HOMEPAGE_BUCKET)
// //     .upload(fileName, file, { upsert: true, contentType: file.type });

// //   if (error) throw new Error("Upload thất bại: " + error.message);

// //   const { data: pub } = supabase.storage
// //     .from(HOMEPAGE_BUCKET)
// //     .getPublicUrl(fileName);

// //   return {
// //     url: pub.publicUrl,
// //     fileName: file.name,
// //     size: file.size,
// //     storedName: fileName,
// //   };
// // }

// // // ─────────────────────────────────────────────
// // // Helper
// // function handleResponse({ data, error }) {
// //   if (error) throw new Error(error.message);
// //   return {
// //     success: true,
// //     data,
// //     total: Array.isArray(data) ? data.length : 1,
// //   };
// // }

// // // ─────────────────────────────────────────────
// // // ─── Product Groups API
// // // products / product_groups cần có sẵn các cột boolean:
// // //   product_groups.is_slider   (nhóm nào được phép vào Slider trang chủ)
// // //   products.is_featured       (SP nào được phép vào Danh mục nổi bật)
// // //   products.is_flash_sale     (SP nào được phép vào Flash Sale)
// // // ─────────────────────────────────────────────
// // export const productGroupsApi = {
// //   async getAll() {
// //     // Sắp xếp: cha (parent_id null) lên đầu, sau đó theo sort_order
// //     return handleResponse(
// //       await supabase
// //         .from("product_groups")
// //         .select("*")
// //         .order("sort_order", { ascending: true })
// //     );
// //   },

// //   // MỚI: chỉ lấy Product Group lớn (parent_id IS NULL)
// //   async getRoots() {
// //     return handleResponse(
// //       await supabase
// //         .from("product_groups")
// //         .select("*")
// //         .is("parent_id", null)
// //         .order("sort_order", { ascending: true })
// //     );
// //   },

// //   // MỚI: lấy các Product Group con của 1 root
// //   async getChildren(parentId) {
// //     return handleResponse(
// //       await supabase
// //         .from("product_groups")
// //         .select("*")
// //         .eq("parent_id", parentId)
// //         .order("sort_order", { ascending: true })
// //     );
// //   },

// //   async getOne(id) {
// //     return handleResponse(
// //       await supabase
// //         .from("product_groups")
// //         .select("*")
// //         .eq("id", id)
// //         .single()
// //     );
// //   },

// //   async create(body) {
// //     return handleResponse(
// //       await supabase
// //         .from("product_groups")
// //         .insert([body])
// //         .select()
// //         .single()
// //     );
// //   },

// //   async update(id, body) {
// //     return handleResponse(
// //       await supabase
// //         .from("product_groups")
// //         .update(body)
// //         .eq("id", id)
// //         .select()
// //         .single()
// //     );
// //   },

// //   async remove(id) {
// //     return handleResponse(
// //       await supabase
// //         .from("product_groups")
// //         .delete()
// //         .eq("id", id)
// //     );
// //   },
// // };

// // // ─────────────────────────────────────────────
// // // ─── Products API
// // // ─────────────────────────────────────────────
// // export const productsApi = {
// //   async getAll(params = {}) {
// //     let query = supabase.from("products").select("*");

// //     // filter
// //     if (params.group_id) {
// //       query = query.eq("group_id", params.group_id);
// //     }

// //     if (params.status) {
// //       query = query.eq("status", params.status);
// //     }

// //     // Theo tab "Đã xóa": chỉ lấy status='deleted'
// //     // Theo tab "Tất cả" / "Trên kệ": loại bỏ deleted (trừ khi includeDeleted=true)
// //     if (params.includeDeleted !== true) {
// //       query = query.neq("status", "deleted");
// //     }

// //     // search
// //     if (params.search) {
// //       query = query.ilike("name", `%${params.search}%`);
// //     }

// //     // pagination
// //     if (params.page && params.limit) {
// //       const from = (params.page - 1) * params.limit;
// //       const to = from + params.limit - 1;
// //       query = query.range(from, to);
// //     }

// //     // sort
// //     query = query.order("created_at", { ascending: false });

// //     return handleResponse(await query);
// //   },

// //   async getOne(id) {
// //     return handleResponse(
// //       await supabase
// //         .from("products")
// //         .select("*")
// //         .eq("id", id)
// //         .single()
// //     );
// //   },

// //   // Lấy 1 sản phẩm theo SKU — dùng cho import/cập nhật giá-tồn kho hàng loạt,
// //   // tránh phải tải toàn bộ danh mục về client chỉ để tìm theo SKU.
// //   async getBySku(sku) {
// //     if (!sku) return null;
// //     const { data, error } = await supabase
// //       .from("products")
// //       .select("*")
// //       .eq("sku", sku)
// //       .maybeSingle();
// //     if (error) throw new Error(error.message);
// //     return data || null;
// //   },

// //   // Lấy nhiều sản phẩm theo danh sách SKU cùng lúc — dùng khi import file lớn,
// //   // giảm số lượt gọi API xuống còn 1 lần thay vì N lần getBySku.
// //   async getManyBySku(skus = []) {
// //     const uniqueSkus = [...new Set(skus.filter(Boolean))];
// //     if (!uniqueSkus.length) return [];
// //     const { data, error } = await supabase
// //       .from("products")
// //       .select("*")
// //       .in("sku", uniqueSkus);
// //     if (error) throw new Error(error.message);
// //     return data || [];
// //   },

// //   // Lấy tất cả slug hiện có — dùng khi import nhiều SP để tránh trùng slug
// //   async getAllSlugs() {
// //     const { data, error } = await supabase
// //       .from("products")
// //       .select("slug")
// //       .not("slug", "is", null);
// //     if (error) throw new Error(error.message);
// //     return (data || []).map((r) => r.slug).filter(Boolean);
// //   },

// //   async create(body) {
// //     return handleResponse(
// //       await supabase
// //         .from("products")
// //         .insert([body])
// //         .select()
// //         .single()
// //     );
// //   },

// //   async update(id, body) {
// //     return handleResponse(
// //       await supabase
// //         .from("products")
// //         .update(body)
// //         .eq("id", id)
// //         .select()
// //         .single()
// //     );
// //   },

// //   // Cập nhật theo SKU trực tiếp (không cần biết id trước) — tiện cho import hàng loạt.
// //   async updateBySku(sku, body) {
// //     return handleResponse(
// //       await supabase
// //         .from("products")
// //         .update(body)
// //         .eq("sku", sku)
// //         .select()
// //         .single()
// //     );
// //   },

// //   // Soft delete: chỉ set status='deleted', giữ nguyên bản ghi trong DB
// //   async softDelete(id) {
// //     return handleResponse(
// //       await supabase
// //         .from("products")
// //         .update({ status: "deleted", is_active: false })
// //         .eq("id", id)
// //         .select()
// //         .single()
// //     );
// //   },

// //   // Phục hồi: set lại status='active' + bật is_active
// //   async restore(id) {
// //     return handleResponse(
// //       await supabase
// //         .from("products")
// //         .update({ status: "active", is_active: true })
// //         .eq("id", id)
// //         .select()
// //         .single()
// //     );
// //   },

// //   // Xóa vĩnh viễn: xóa hẳn khỏi DB (không thể phục hồi)
// //   async remove(id) {
// //     return handleResponse(
// //       await supabase
// //         .from("products")
// //         .delete()
// //         .eq("id", id)
// //     );
// //   },

// //   // Bulk soft delete
// //   async bulkSoftDelete(ids) {
// //     if (!ids.length) return { success: true, data: [] };
// //     const { data, error } = await supabase
// //       .from("products")
// //       .update({ status: "deleted", is_active: false })
// //       .in("id", ids)
// //       .select();
// //     if (error) throw new Error(error.message);
// //     return { success: true, data: data || [] };
// //   },

// //   // Bulk restore
// //   async bulkRestore(ids) {
// //     if (!ids.length) return { success: true, data: [] };
// //     const { data, error } = await supabase
// //       .from("products")
// //       .update({ status: "active", is_active: true })
// //       .in("id", ids)
// //       .select();
// //     if (error) throw new Error(error.message);
// //     return { success: true, data: data || [] };
// //   },
// // };

// // // ─────────────────────────────────────────────
// // // ─── Price List API (bảng giá, 1 dòng = 1 SKU)
// // // ─────────────────────────────────────────────
// // export const priceListApi = {
// //   async getAll(params = {}) {
// //     let q = supabase.from("price_list").select("*").order("sort_order", { ascending: true });
// //     if (params.search)    q = q.ilike("name", `%${params.search}%`);
// //     if (params.sku)       q = q.eq("sku", params.sku);
// //     if (params.group_id)  q = q.eq("group_id", params.group_id);
// //     if (typeof params.is_active === "boolean") {
// //       q = q.eq("is_active", params.is_active);
// //     }
// //     if (params.page && params.limit) {
// //       const from = (params.page - 1) * params.limit;
// //       q = q.range(from, from + params.limit - 1);
// //     }
// //     return handleResponse(await q);
// //   },

// //   // Lấy các dòng price_list CHƯA có trong products (theo SKU).
// //   // Dùng 2 truy vấn: (1) lấy tất cả SKU đã tồn tại trong products,
// //   // (2) lấy price_list loại trừ các SKU đó.
// //   // Supabase PostgREST hỗ trợ filter `not.in.(...)` — gọn hơn.
// //   async getPendingImport(params = {}) {
// //     // Lấy tập SKU đã tồn tại trong products
// //     const { data: existing, error: e1 } = await supabase
// //       .from("products")
// //       .select("sku")
// //       .not("sku", "is", null);
// //     if (e1) throw new Error(e1.message);
// //     const existingSkus = (existing || []).map((r) => r.sku).filter(Boolean);

// //     let q = supabase.from("price_list").select("*").order("sort_order", { ascending: true });
// //     if (params.search) q = q.ilike("name", `%${params.search}%`);
// //     if (params.group_id) q = q.eq("group_id", params.group_id);

// //     if (existingSkus.length) {
// //       // Lọc ra các dòng có SKU không nằm trong danh sách đã tồn tại
// //       q = q.not("sku", "in", `(${existingSkus.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(",")})`);
// //     }

// //     if (params.page && params.limit) {
// //       const from = (params.page - 1) * params.limit;
// //       q = q.range(from, from + params.limit - 1);
// //     }
// //     return handleResponse(await q);
// //   },

// //   async getOne(id) {
// //     return handleResponse(
// //       await supabase.from("price_list").select("*").eq("id", id).single()
// //     );
// //   },

// //   async create(body) {
// //     return handleResponse(
// //       await supabase.from("price_list").insert([body]).select().single()
// //     );
// //   },

// //   async update(id, body) {
// //     return handleResponse(
// //       await supabase.from("price_list").update(body).eq("id", id).select().single()
// //     );
// //   },

// //   async remove(id) {
// //     return handleResponse(
// //       await supabase.from("price_list").delete().eq("id", id)
// //     );
// //   },

// //   // Bulk upsert theo SKU: SKU trùng → update, SKU mới → insert.
// //   // Tự chia batch 500 dòng để tránh quá tải request.
// //   async bulkUpsert(rows) {
// //     if (!rows.length) return { success: true, data: [] };
// //     const BATCH = 500;
// //     const allInserted = [];
// //     for (let i = 0; i < rows.length; i += BATCH) {
// //       const slice = rows.slice(i, i + BATCH);
// //       const { data, error } = await supabase
// //         .from("price_list")
// //         .upsert(slice, { onConflict: "sku" })
// //         .select();
// //       if (error) throw new Error(error.message);
// //       if (data) allInserted.push(...data);
// //     }
// //     return { success: true, data: allInserted };
// //   },
// // };


// // // ─────────────────────────────────────────────
// // // ─── Homepage API (background / hero / sections / flashSale / articles)
// // // Cấu trúc bảng Supabase cần tạo sẵn:
// // //   homepage_config (id int PK, background jsonb, hero jsonb, sections jsonb,
// // //                     flash_sale jsonb, updated_at timestamptz)
// // //   homepage_articles (id uuid PK, type text, title text, url text, file_url text,
// // //                      file_name text, file_size bigint, created_at timestamptz)
// // // ─────────────────────────────────────────────
// // export const homepageApi = {
// //   // Lấy toàn bộ cấu hình trang chủ (1 dòng duy nhất, id=1)
// //   async getConfig() {
// //     const { data, error } = await supabase
// //       .from("homepage_config")
// //       .select("background, hero, sections, flash_sale, updated_at")
// //       .eq("id", 1)
// //       .maybeSingle();
// //     if (error) throw new Error(error.message);
// //     // Lần đầu chưa có row → trả null để FE tự fallback về DEFAULT_CONFIG
// //     return {
// //       background: data?.background ?? null,
// //       hero: data?.hero ?? null,
// //       sections: data?.sections ?? null,
// //       flashSale: data?.flash_sale ?? null,
// //       updated_at: data?.updated_at ?? null,
// //     };
// //   },

// //   // Upsert toàn bộ cấu hình (luôn ghi đè row id=1)
// //   async updateConfig({ background, hero, sections, flashSale }) {
// //     const { data, error } = await supabase
// //       .from("homepage_config")
// //       .upsert(
// //         {
// //           id: 1,
// //           background,
// //           hero,
// //           sections,
// //           flash_sale: flashSale,
// //           updated_at: new Date().toISOString(),
// //         },
// //         { onConflict: "id" }
// //       )
// //       .select("background, hero, sections, flash_sale, updated_at")
// //       .single();
// //     if (error) throw new Error(error.message);
// //     return {
// //       background: data.background,
// //       hero: data.hero,
// //       sections: data.sections,
// //       flashSale: data.flash_sale,
// //       updated_at: data.updated_at,
// //     };
// //   },

// //   // Lấy danh sách bài viết
// //   async getArticles() {
// //     const { data, error } = await supabase
// //       .from("homepage_articles")
// //       .select("*")
// //       .order("created_at", { ascending: false });
// //     if (error) throw new Error(error.message);
// //     return { data: data || [] };
// //   },

// //   // Tạo bài viết mới
// //   async createArticle(article) {
// //     const row = {
// //       type: article.type,                // "link" | "file"
// //       title: article.title,
// //       url: article.url || null,
// //       file_url: article.fileUrl || null,
// //       file_name: article.fileName || null,
// //       file_size: article.fileSize || null,
// //     };
// //     const { data, error } = await supabase
// //       .from("homepage_articles")
// //       .insert([row])
// //       .select()
// //       .single();
// //     if (error) throw new Error(error.message);
// //     return data;
// //   },

// //   // Xóa bài viết
// //   async deleteArticle(id) {
// //     const { error } = await supabase
// //       .from("homepage_articles")
// //       .delete()
// //       .eq("id", id);
// //     if (error) throw new Error(error.message);
// //     return { success: true };
// //   },

// //   // Upload file (ảnh/video/pdf/word) lên Supabase Storage
// //   async uploadFile(file, subfolder = "misc") {
// //     return await uploadHomepageFile(file, subfolder);
// //   },
// // };

// // // ─────────────────────────────────────────────
// // // ─── Posts API  (bài viết / trang đọc báo)
// // // ─────────────────────────────────────────────
// // export const postsApi = {
// //   async getAll(params = {}) {
// //     let q = supabase.from("posts").select("*");
// //     if (params.status)      q = q.eq("status", params.status);
// //     if (params.category_id) q = q.eq("category_id", params.category_id);
// //     if (params.post_type)   q = q.eq("post_type", params.post_type);
// //     if (params.search)      q = q.ilike("title", `%${params.search}%`);
// //     if (params.page && params.limit) {
// //       const from = (params.page - 1) * params.limit;
// //       q = q.range(from, from + params.limit - 1);
// //     }
// //     q = q.order("published_at", { ascending: false });
// //     return handleResponse(await q);
// //   },

// //   async getOne(id) {
// //     return handleResponse(
// //       await supabase.from("posts").select("*").eq("id", id).single()
// //     );
// //   },

// //   async getBySlug(slug) {
// //     const { data, error } = await supabase
// //       .from("posts")
// //       .select("*")
// //       .eq("slug", slug)
// //       .eq("status", "published")
// //       .maybeSingle();
// //     if (error) throw new Error(error.message);
// //     return { data };
// //   },

// //   async create(body) {
// //     return handleResponse(
// //       await supabase.from("posts").insert([body]).select().single()
// //     );
// //   },

// //   async update(id, body) {
// //     return handleResponse(
// //       await supabase.from("posts").update(body).eq("id", id).select().single()
// //     );
// //   },

// //   async remove(id) {
// //     return handleResponse(
// //       await supabase.from("posts").delete().eq("id", id)
// //     );
// //   },
// // };

// // // ─────────────────────────────────────────────
// // // ─── News Categories API  (nhóm tin tức cha-con, 2 cấp)
// // // ─────────────────────────────────────────────
// // export const newsCategoriesApi = {
// //   /** Tất cả nhóm (cha + con), sắp theo sort_order */
// //   async getAll() {
// //     return handleResponse(
// //       await supabase
// //         .from("news_categories")
// //         .select("*")
// //         .order("sort_order", { ascending: true })
// //     );
// //   },

// //   /** Chỉ nhóm CHA (parent_id IS NULL) */
// //   async getRoots() {
// //     return handleResponse(
// //       await supabase
// //         .from("news_categories")
// //         .select("*")
// //         .is("parent_id", null)
// //         .order("sort_order", { ascending: true })
// //     );
// //   },

// //   /** Nhóm CON của 1 nhóm cha */
// //   async getChildren(parentId) {
// //     return handleResponse(
// //       await supabase
// //         .from("news_categories")
// //         .select("*")
// //         .eq("parent_id", parentId)
// //         .order("sort_order", { ascending: true })
// //     );
// //   },

// //   /** Lấy 1 nhóm theo id */
// //   async getOne(id) {
// //     return handleResponse(
// //       await supabase.from("news_categories").select("*").eq("id", id).single()
// //     );
// //   },

// //   /** Lấy 1 nhóm theo slug (dùng cho shop routing) */
// //   async getBySlug(slug) {
// //     return handleResponse(
// //       await supabase
// //         .from("news_categories")
// //         .select("*")
// //         .eq("slug", slug)
// //         .maybeSingle()
// //     );
// //   },

// //   async create(body) {
// //     return handleResponse(
// //       await supabase.from("news_categories").insert([body]).select().single()
// //     );
// //   },

// //   async update(id, body) {
// //     return handleResponse(
// //       await supabase.from("news_categories").update(body).eq("id", id).select().single()
// //     );
// //   },

// //   async remove(id) {
// //     return handleResponse(
// //       await supabase.from("news_categories").delete().eq("id", id)
// //     );
// //   },

// //   /** Cây 2 cấp: [{ ...root, children: [...] }, ...] */
// //   async getTree() {
// //     const all = await this.getAll();
// //     const list = all.data || [];
// //     return list
// //       .filter((r) => !r.parent_id)
// //       .map((r) => ({ ...r, children: list.filter((c) => c.parent_id === r.id) }));
// //   },

// //   /** Đếm số bài thuộc 1 nhóm (dùng cảnh báo trước khi xoá) */
// //   async countPosts(categoryId) {
// //     const { count, error } = await supabase
// //       .from("posts")
// //       .select("id", { count: "exact", head: true })
// //       .eq("category_id", categoryId);
// //     if (error) throw new Error(error.message);
// //     return count || 0;
// //   },
// // };

// // // =============================================================
// // // Backend proxy (Express) — gọi /api/news/scrape
// // // =============================================================
// // const API_BASE = import.meta.env.VITE_API_URL || "";

// // export const newsScrapeApi = {
// //   /** Scrape 1 link → { title, content, excerpt, image, siteName, ... } */
// //   async scrapeOne(url) {
// //     const res = await fetch(`${API_BASE}/api/news/scrape`, {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify({ url }),
// //     });
// //     const json = await res.json();
// //     if (!res.ok || !json.success) {
// //       throw new Error(json.error || `HTTP ${res.status}`);
// //     }
// //     return json.data;
// //   },

// //   /** Scrape nhiều link song song */
// //   async scrapeBatch(urls) {
// //     const res = await fetch(`${API_BASE}/api/news/scrape-batch`, {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify({ urls }),
// //     });
// //     const json = await res.json();
// //     if (!res.ok || !json.success) {
// //       throw new Error(json.error || `HTTP ${res.status}`);
// //     }
// //     return json.results; // [{ url, success, data|error }, ...]
// //   },
// // };
// // // ─────────────────────────────────────────────
// // export const homepageValuesApi = {
// //   async getAll() {
// //     const { data, error } = await supabase
// //       .from("homepage_values")
// //       .select("*")
// //       .order("sort_order", { ascending: true });
// //     if (error) throw new Error(error.message);
// //     return { data: data || [] };
// //   },
// //   async create(v) {
// //     const { data, error } = await supabase.from("homepage_values").insert([{
// //       icon: v.icon || "fas fa-seedling",
// //       title: v.title,
// //       description: v.desc || null,
// //       sort_order: v.sortOrder || 0,
// //       enabled: v.enabled !== false,
// //     }]).select().single();
// //     if (error) throw new Error(error.message);
// //     return data;
// //   },
// //   async update(id, v) {
// //     const { data, error } = await supabase.from("homepage_values").update({
// //       icon: v.icon, title: v.title, description: v.desc || null,
// //       sort_order: v.sortOrder || 0, enabled: v.enabled !== false,
// //     }).eq("id", id).select().single();
// //     if (error) throw new Error(error.message);
// //     return data;
// //   },
// //   async remove(id) {
// //     const { error } = await supabase.from("homepage_values").delete().eq("id", id);
// //     if (error) throw new Error(error.message);
// //     return { success: true };
// //   },
// // };

// // // ─────────────────────────────────────────────
// // // ─── Homepage Promo Banners (2 banner quảng cáo)
// // // ─────────────────────────────────────────────
// // export const homepagePromoBannersApi = {
// //   async getAll() {
// //     const { data, error } = await supabase
// //       .from("homepage_promo_banners")
// //       .select("*")
// //       .order("sort_order", { ascending: true });
// //     if (error) throw new Error(error.message);
// //     return { data: data || [] };
// //   },
// //   async upsert(b) {
// //     const { data: existing } = await supabase
// //       .from("homepage_promo_banners")
// //       .select("id")
// //       .eq("position", b.position)
// //       .maybeSingle();

// //     const payload = {
// //       position: b.position,
// //       tag: b.tag || null,
// //       title: b.title,
// //       image_url: b.imageUrl || null,
// //       cta_text: b.ctaText || "Mua ngay",
// //       cta_link: b.ctaLink || "#",
// //       sort_order: b.sortOrder || 0,
// //       enabled: b.enabled !== false,
// //     };

// //     if (existing) {
// //       const { data, error } = await supabase
// //         .from("homepage_promo_banners")
// //         .update(payload)
// //         .eq("id", existing.id)
// //         .select()
// //         .single();
// //       if (error) throw new Error(error.message);
// //       return data;
// //     }
// //     const { data, error } = await supabase
// //       .from("homepage_promo_banners")
// //       .insert([payload])
// //       .select()
// //       .single();
// //     if (error) throw new Error(error.message);
// //     return data;
// //   },
// // };

// // // ─────────────────────────────────────────────
// // // ─── Homepage Picks (slider / featured / flash_sale)
// // // Picks tham chiếu tới product_groups (kind='slider') hoặc products
// // // (kind='featured' | 'flash_sale') đã có sẵn — không lưu dữ liệu riêng.
// // //
// // // Yêu cầu ràng buộc UNIQUE(kind, target_id) trên bảng homepage_picks để
// // // upsert trong create() hoạt động đúng (tránh thêm trùng 1 sản phẩm 2 lần
// // // vào cùng 1 block).
// // // ─────────────────────────────────────────────
// // export const homepagePicksApi = {
// //   // Lấy TẤT CẢ picks (mọi kind) — HomePage.jsx tự lọc theo kind ở FE
// //   async getAll() {
// //     const { data, error } = await supabase
// //       .from("homepage_picks")
// //       .select("*")
// //       .order("sort_order", { ascending: true });
// //     if (error) throw new Error(error.message);
// //     return { data: data || [] };
// //   },
// //   // Lấy picks theo 1 kind cụ thể (tiện dùng riêng lẻ nếu cần)
// //   async getByKind(kind) {
// //     const { data, error } = await supabase
// //       .from("homepage_picks")
// //       .select("*")
// //       .eq("kind", kind)
// //       .order("sort_order", { ascending: true });
// //     if (error) throw new Error(error.message);
// //     return { data: data || [] };
// //   },
// //   // Thêm 1 pick mới (bỏ qua/ghi đè nếu đã tồn tại cùng kind+target_id)
// //   async create(p) {
// //     const { data, error } = await supabase
// //       .from("homepage_picks")
// //       .upsert({
// //         kind: p.kind,
// //         target_id: String(p.targetId),
// //         target_kind: p.targetKind,           // 'product' | 'group'
// //         custom_title: p.customTitle || null,
// //         custom_image: p.customImage || null,
// //         sort_order: p.sortOrder || 0,
// //         enabled: p.enabled !== false,
// //       }, { onConflict: "kind,target_id" })
// //       .select()
// //       .single();
// //     if (error) throw new Error(error.message);
// //     return data;
// //   },
// //   async update(id, p) {
// //     const { data, error } = await supabase
// //       .from("homepage_picks")
// //       .update({
// //         custom_title: p.customTitle || null,
// //         custom_image: p.customImage || null,
// //         sort_order: p.sortOrder || 0,
// //         enabled: p.enabled !== false,
// //       })
// //       .eq("id", id)
// //       .select()
// //       .single();
// //     if (error) throw new Error(error.message);
// //     return data;
// //   },
// //   async remove(id) {
// //     const { error } = await supabase.from("homepage_picks").delete().eq("id", id);
// //     if (error) throw new Error(error.message);
// //     return { success: true };
// //   },
// //   async removeByKindAndTarget(kind, targetId) {
// //     const { error } = await supabase
// //       .from("homepage_picks")
// //       .delete()
// //       .eq("kind", kind)
// //       .eq("target_id", String(targetId));
// //     if (error) throw new Error(error.message);
// //     return { success: true };
// //   },
// // };

// // // ─────────────────────────────────────────────
// // // ─── Homepage Blog (góc chia sẻ / bài viết)
// // // ─────────────────────────────────────────────
// // export const homepageBlogApi = {
// //   async getAll() {
// //     const { data, error } = await supabase
// //       .from("homepage_blog")
// //       .select("*")
// //       .order("sort_order", { ascending: true })
// //       .order("created_at", { ascending: false });
// //     if (error) throw new Error(error.message);
// //     return { data: data || [] };
// //   },
// //   async create(b) {
// //     const { data, error } = await supabase.from("homepage_blog").insert([{
// //       title: b.title,
// //       description: b.desc || null,
// //       author: b.author || "Admin",
// //       image_url: b.imageUrl || null,
// //       link: b.link || "#",
// //       sort_order: b.sortOrder || 0,
// //       enabled: b.enabled !== false,
// //     }]).select().single();
// //     if (error) throw new Error(error.message);
// //     return data;
// //   },
// //   async update(id, b) {
// //     const { data, error } = await supabase.from("homepage_blog").update({
// //       title: b.title,
// //       description: b.desc || null,
// //       author: b.author || "Admin",
// //       image_url: b.imageUrl || null,
// //       link: b.link || "#",
// //       sort_order: b.sortOrder || 0,
// //       enabled: b.enabled !== false,
// //     }).eq("id", id).select().single();
// //     if (error) throw new Error(error.message);
// //     return data;
// //   },
// //   async remove(id) {
// //     const { error } = await supabase.from("homepage_blog").delete().eq("id", id);
// //     if (error) throw new Error(error.message);
// //     return { success: true };
// //   },
// // };

// // // ─────────────────────────────────────────────
// // // ─── Upload Manager: bucket riêng cho video
// // // ─────────────────────────────────────────────
// // const UPLOAD_MANAGER_BUCKET = "upload-manager-assets";

// // async function uploadManagerFile(file, subfolder = "videos") {
// //   const ext = (file.name.split(".").pop() || "bin").toLowerCase();
// //   const fileName = `${subfolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

// //   const { error } = await supabase.storage
// //     .from(UPLOAD_MANAGER_BUCKET)
// //     .upload(fileName, file, { upsert: true, contentType: file.type });

// //   if (error) throw new Error("Upload thất bại: " + error.message);

// //   const { data: pub } = supabase.storage
// //     .from(UPLOAD_MANAGER_BUCKET)
// //     .getPublicUrl(fileName);

// //   return {
// //     url: pub.publicUrl,
// //     fileName: file.name,
// //     size: file.size,
// //     storedName: fileName,
// //   };
// // }

// // // ─────────────────────────────────────────────
// // // ─── Upload Groups API (nhóm acha/con dùng chung cho content + video)
// // // Bảng cần tạo sẵn trên Supabse:
// // //   upload_groups (id uuid/int PK, name text, parent_id int null,
// // //                   sort_order int default 0, created_at timestamptz default now())
// // // ─────────────────────────────────────────────
// // export const uploadGroupsApi = {
// //   /** Lấy TẤT CẢ nhóm (cha + con), dùng cho GroupsTab tự fetch */
// //   async getAll() {
// //     return handleResponse(
// //       await supabase
// //         .from("upload_groups")
// //         .select("*")
// //         .order("sort_order", { ascending: true })
// //     );
// //   },

// //   async getRoots() {
// //     return handleResponse(
// //       await supabase
// //         .from("upload_groups")
// //         .select("*")
// //         .is("parent_id", null)
// //         .order("sort_order", { ascending: true })
// //     );
// //   },

// //   /** Nhóm CON của 1 nhóm cha */
// //   async getChildren(parentId) {
// //     return handleResponse(
// //       await supabase
// //         .from("upload_groups")
// //         .select("*")
// //         .eq("parent_id", parentId)
// //         .order("sort_order", { ascending: true })
// //     );
// //   },

// //   /** Lấy 1 nhóm theo id */
// //   async getOne(id) {
// //     return handleResponse(
// //       await supabase.from("upload_groups").select("*").eq("id", id).single()
// //     );
// //   },

// //   /** Lấy 1 nhóm theo slug (dùng cho shop routing) */
// //   async getBySlug(slug) {
// //     return handleResponse(
// //       await supabase
// //         .from("upload_groups")
// //         .select("*")
// //         .eq("slug", slug)
// //         .maybeSingle()
// //     );
// //   },

// //   async create(body) {
// //     return handleResponse(
// //       await supabase.from("upload_groups").insert([body]).select().single()
// //     );
// //   },

// //   async update(id, body) {
// //     return handleResponse(
// //       await supabase.from("upload_groups").update(body).eq("id", id).select().single()
// //     );
// //   },

// //   async remove(id) {
// //     return handleResponse(
// //       await supabase.from("upload_groups").delete().eq("id", id)
// //     );
// //   },

// //   /** Cây 2 cấp: [{ ...root, children: [...] }, ...] */
// //   async getTree() {
// //     const all = await this.getAll();
// //     const list = all.data || [];
// //     return list
// //       .filter((r) => !r.parent_id)
// //       .map((r) => ({ ...r, children: list.filter((c) => c.parent_id === r.id) }));
// //   },

// //   /** Đếm số video thuộc 1 nhóm (dùng cảnh báo trước khi xoá) */
// //   async countPosts(categoryId) {
// //     const { count, error } = await supabase
// //       .from("videos")
// //       .select("id", { count: "exact", head: true })
// //       .eq("group_id", categoryId);
// //     if (error) throw new Error(error.message);
// //     return count || 0;
// //   },
// // };

// // // ─────────────────────────────────────────────
// // // ─── About Content API (nội dung "Về Techtra", 1 dòng / group_id)
// // // Bảng cần tạo sẵn trên Supabase:
// // //   about_content (id uuid/int PK, group_id int UNIQUE, content text,
// // //                   updated_at timestamptz default now())
// // // UNIQUE(group_id) bắt buộc để upsert onConflict hoạt động đúng.
// // // ─────────────────────────────────────────────
// // export const aboutContentApi = {
// //   async get(groupId) {
// //     const { data, error } = await supabase
// //       .from("about_content")
// //       .select("content")
// //       .eq("group_id", groupId)
// //       .maybeSingle();
// //     if (error) throw new Error(error.message);
// //     return { content: data?.content ?? "" };
// //   },

// //   async save(groupId, { content }) {
// //     const { data, error } = await supabase
// //       .from("about_content")
// //       .upsert(
// //         { group_id: groupId, content, updated_at: new Date().toISOString() },
// //         { onConflict: "group_id" }
// //       )
// //       .select()
// //       .single();
// //     if (error) throw new Error(error.message);
// //     return data;
// //   },
// // };

// // // ─────────────────────────────────────────────
// // // ─── Video API (video "Giải trí", gắn theo group_id)
// // // Bảng cần tạo sẵn trên Supabase:
// // //   videos (id uuid/int PK, group_id int, title text, url text,
// // //            file_name text, file_size bigint, created_at timestamptz default now())
// // //
// // // Dùng lại bucket HOMEPAGE_BUCKET ("homepage-assets") đã khai báo sẵn ở đầu
// // // file api.js (đang chạy tốt cho upload ảnh/video/pdf trang chủ) — KHÔNG cần
// // // tạo/khai báo bucket riêng cho video, tránh lỗi "Bucket not found".
// // // ─────────────────────────────────────────────
// // export const videoApi = {
// //   async getAll(params = {}) {
// //     let q = supabase.from("videos").select("*").order("created_at", { ascending: false });
// //     if (params.group_id === null) {
// //       q = q.is("group_id", null);       // lọc video KHÔNG thuộc nhóm nào
// //     } else if (params.group_id) {
// //       q = q.eq("group_id", params.group_id);
// //     }
// //     return handleResponse(await q);
// //   },

// //   // form: FormData chứa "video" (File), "group_id", "title"
// //   async upload(form) {
// //     const file = form.get("video");
// //     const groupId = form.get("group_id");
// //     const title = form.get("title");
// //     if (!file) throw new Error("Thiếu file video");

// //     const ext = (file.name.split(".").pop() || "bin").toLowerCase();
// //     const fileName = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

// //     const { error: uploadError } = await supabase.storage
// //       .from(HOMEPAGE_BUCKET)
// //       .upload(fileName, file, { upsert: true, contentType: file.type || undefined });

// //     if (uploadError) {
// //       console.error("Supabase Storage upload error (video):", uploadError);
// //       throw new Error("Upload thất bại: " + uploadError.message);
// //     }

// //     const { data: pub } = supabase.storage
// //       .from(HOMEPAGE_BUCKET)
// //       .getPublicUrl(fileName);

// //     const { data, error } = await supabase
// //       .from("videos")
// //       .insert([{
// //         group_id: groupId || null,
// //         title: title || file.name,
// //         url: pub.publicUrl,
// //         file_name: file.name,
// //         file_size: file.size,
// //       }])
// //       .select()
// //       .single();
// //     if (error) throw new Error(error.message);
// //     return data;
// //   },

// //   async remove(id) {
// //     return handleResponse(
// //       await supabase.from("videos").delete().eq("id", id)
// //     );
// //   },
// // };

// // src/api.js — Supabase version (NO backend)

// // ─────────────────────────────────────────────
// import { createClient } from "@supabase/supabase-js";

// const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
// const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// // Bucket lưu file (ảnh / video / pdf / word) do HomePage upload
// const HOMEPAGE_BUCKET = "homepage-assets";

// // ─────────────────────────────────────────────
// // Upload file lên Supabase Storage, trả về { url, fileName, size }
// async function uploadHomepageFile(file, subfolder = "misc") {
//   const ext = (file.name.split(".").pop() || "bin").toLowerCase();
//   const fileName = `${subfolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

//   const { error } = await supabase.storage
//     .from(HOMEPAGE_BUCKET)
//     .upload(fileName, file, { upsert: true, contentType: file.type });

//   if (error) throw new Error("Upload thất bại: " + error.message);

//   const { data: pub } = supabase.storage
//     .from(HOMEPAGE_BUCKET)
//     .getPublicUrl(fileName);

//   return {
//     url: pub.publicUrl,
//     fileName: file.name,
//     size: file.size,
//     storedName: fileName,
//   };
// }

// // ─────────────────────────────────────────────
// // Helper
// function handleResponse({ data, error }) {
//   if (error) throw new Error(error.message);
//   return {
//     success: true,
//     data,
//     total: Array.isArray(data) ? data.length : 1,
//   };
// }

// // ─────────────────────────────────────────────
// // ─── Product Groups API
// // products / product_groups cần có sẵn các cột boolean:
// //   product_groups.is_slider   (nhóm nào được phép vào Slider trang chủ)
// //   products.is_featured       (SP nào được phép vào Danh mục nổi bật)
// //   products.is_flash_sale     (SP nào được phép vào Flash Sale)
// // ─────────────────────────────────────────────
// export const productGroupsApi = {
//   async getAll() {
//     // Sắp xếp: cha (parent_id null) lên đầu, sau đó theo sort_order
//     return handleResponse(
//       await supabase
//         .from("product_groups")
//         .select("*")
//         .order("sort_order", { ascending: true })
//     );
//   },

//   // MỚI: chỉ lấy Product Group lớn (parent_id IS NULL)
//   async getRoots() {
//     return handleResponse(
//       await supabase
//         .from("product_groups")
//         .select("*")
//         .is("parent_id", null)
//         .order("sort_order", { ascending: true })
//     );
//   },

//   // MỚI: lấy các Product Group con của 1 root
//   async getChildren(parentId) {
//     return handleResponse(
//       await supabase
//         .from("product_groups")
//         .select("*")
//         .eq("parent_id", parentId)
//         .order("sort_order", { ascending: true })
//     );
//   },

//   async getOne(id) {
//     return handleResponse(
//       await supabase
//         .from("product_groups")
//         .select("*")
//         .eq("id", id)
//         .single()
//     );
//   },

//   async create(body) {
//     return handleResponse(
//       await supabase
//         .from("product_groups")
//         .insert([body])
//         .select()
//         .single()
//     );
//   },

//   async update(id, body) {
//     return handleResponse(
//       await supabase
//         .from("product_groups")
//         .update(body)
//         .eq("id", id)
//         .select()
//         .single()
//     );
//   },

//   async remove(id) {
//     return handleResponse(
//       await supabase
//         .from("product_groups")
//         .delete()
//         .eq("id", id)
//     );
//   },
// };

// // ─────────────────────────────────────────────
// // ─── Products API
// // ─────────────────────────────────────────────
// export const productsApi = {
//   async getAll(params = {}) {
//     let query = supabase.from("products").select("*");

//     // filter
//     if (params.group_id) {
//       query = query.eq("group_id", params.group_id);
//     }

//     if (params.status) {
//       query = query.eq("status", params.status);
//     }

//     // Theo tab "Đã xóa": chỉ lấy status='deleted'
//     // Theo tab "Tất cả" / "Trên kệ": loại bỏ deleted (trừ khi includeDeleted=true)
//     if (params.includeDeleted !== true) {
//       query = query.neq("status", "deleted");
//     }

//     // search
//     if (params.search) {
//       query = query.ilike("name", `%${params.search}%`);
//     }

//     // pagination
//     if (params.page && params.limit) {
//       const from = (params.page - 1) * params.limit;
//       const to = from + params.limit - 1;
//       query = query.range(from, to);
//     }

//     // sort
//     query = query.order("created_at", { ascending: false });

//     return handleResponse(await query);
//   },

//   async getOne(id) {
//     return handleResponse(
//       await supabase
//         .from("products")
//         .select("*")
//         .eq("id", id)
//         .single()
//     );
//   },

//   // Lấy 1 sản phẩm theo SKU — dùng cho import/cập nhật giá-tồn kho hàng loạt,
//   // tránh phải tải toàn bộ danh mục về client chỉ để tìm theo SKU.
//   async getBySku(sku) {
//     if (!sku) return null;
//     const { data, error } = await supabase
//       .from("products")
//       .select("*")
//       .eq("sku", sku)
//       .maybeSingle();
//     if (error) throw new Error(error.message);
//     return data || null;
//   },

//   // Lấy nhiều sản phẩm theo danh sách SKU cùng lúc — dùng khi import file lớn,
//   // giảm số lượt gọi API xuống còn 1 lần thay vì N lần getBySku.
//   async getManyBySku(skus = []) {
//     const uniqueSkus = [...new Set(skus.filter(Boolean))];
//     if (!uniqueSkus.length) return [];
//     const { data, error } = await supabase
//       .from("products")
//       .select("*")
//       .in("sku", uniqueSkus);
//     if (error) throw new Error(error.message);
//     return data || [];
//   },

//   // Lấy tất cả slug hiện có — dùng khi import nhiều SP để tránh trùng slug
//   async getAllSlugs() {
//     const { data, error } = await supabase
//       .from("products")
//       .select("slug")
//       .not("slug", "is", null);
//     if (error) throw new Error(error.message);
//     return (data || []).map((r) => r.slug).filter(Boolean);
//   },

//   async create(body) {
//     return handleResponse(
//       await supabase
//         .from("products")
//         .insert([body])
//         .select()
//         .single()
//     );
//   },

//   async update(id, body) {
//     return handleResponse(
//       await supabase
//         .from("products")
//         .update(body)
//         .eq("id", id)
//         .select()
//         .single()
//     );
//   },

//   // Cập nhật theo SKU trực tiếp (không cần biết id trước) — tiện cho import hàng loạt.
//   async updateBySku(sku, body) {
//     return handleResponse(
//       await supabase
//         .from("products")
//         .update(body)
//         .eq("sku", sku)
//         .select()
//         .single()
//     );
//   },

//   // Soft delete: chỉ set status='deleted', giữ nguyên bản ghi trong DB
//   async softDelete(id) {
//     return handleResponse(
//       await supabase
//         .from("products")
//         .update({ status: "deleted", is_active: false })
//         .eq("id", id)
//         .select()
//         .single()
//     );
//   },

//   // Phục hồi: set lại status='active' + bật is_active
//   async restore(id) {
//     return handleResponse(
//       await supabase
//         .from("products")
//         .update({ status: "active", is_active: true })
//         .eq("id", id)
//         .select()
//         .single()
//     );
//   },

//   // Xóa vĩnh viễn: xóa hẳn khỏi DB (không thể phục hồi)
//   async remove(id) {
//     return handleResponse(
//       await supabase
//         .from("products")
//         .delete()
//         .eq("id", id)
//     );
//   },

//   // Bulk soft delete
//   async bulkSoftDelete(ids) {
//     if (!ids.length) return { success: true, data: [] };
//     const { data, error } = await supabase
//       .from("products")
//       .update({ status: "deleted", is_active: false })
//       .in("id", ids)
//       .select();
//     if (error) throw new Error(error.message);
//     return { success: true, data: data || [] };
//   },

//   // Bulk restore
//   async bulkRestore(ids) {
//     if (!ids.length) return { success: true, data: [] };
//     const { data, error } = await supabase
//       .from("products")
//       .update({ status: "active", is_active: true })
//       .in("id", ids)
//       .select();
//     if (error) throw new Error(error.message);
//     return { success: true, data: data || [] };
//   },
// };

// // ─────────────────────────────────────────────
// // ─── Price List API (bảng giá, 1 dòng = 1 SKU)
// // ─────────────────────────────────────────────
// export const priceListApi = {
//   async getAll(params = {}) {
//     let q = supabase.from("price_list").select("*").order("sort_order", { ascending: true });
//     if (params.search)    q = q.ilike("name", `%${params.search}%`);
//     if (params.sku)       q = q.eq("sku", params.sku);
//     if (params.group_id)  q = q.eq("group_id", params.group_id);
//     if (typeof params.is_active === "boolean") {
//       q = q.eq("is_active", params.is_active);
//     }
//     if (params.page && params.limit) {
//       const from = (params.page - 1) * params.limit;
//       q = q.range(from, from + params.limit - 1);
//     }
//     return handleResponse(await q);
//   },

//   // Lấy các dòng price_list CHƯA có trong products (theo SKU).
//   // Dùng 2 truy vấn: (1) lấy tất cả SKU đã tồn tại trong products,
//   // (2) lấy price_list loại trừ các SKU đó.
//   // Supabase PostgREST hỗ trợ filter `not.in.(...)` — gọn hơn.
//   async getPendingImport(params = {}) {
//     // Lấy tập SKU đã tồn tại trong products
//     const { data: existing, error: e1 } = await supabase
//       .from("products")
//       .select("sku")
//       .not("sku", "is", null);
//     if (e1) throw new Error(e1.message);
//     const existingSkus = (existing || []).map((r) => r.sku).filter(Boolean);

//     let q = supabase.from("price_list").select("*").order("sort_order", { ascending: true });
//     if (params.search) q = q.ilike("name", `%${params.search}%`);
//     if (params.group_id) q = q.eq("group_id", params.group_id);

//     if (existingSkus.length) {
//       // Lọc ra các dòng có SKU không nằm trong danh sách đã tồn tại
//       q = q.not("sku", "in", `(${existingSkus.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(",")})`);
//     }

//     if (params.page && params.limit) {
//       const from = (params.page - 1) * params.limit;
//       q = q.range(from, from + params.limit - 1);
//     }
//     return handleResponse(await q);
//   },

//   async getOne(id) {
//     return handleResponse(
//       await supabase.from("price_list").select("*").eq("id", id).single()
//     );
//   },

//   async create(body) {
//     return handleResponse(
//       await supabase.from("price_list").insert([body]).select().single()
//     );
//   },

//   async update(id, body) {
//     return handleResponse(
//       await supabase.from("price_list").update(body).eq("id", id).select().single()
//     );
//   },

//   async remove(id) {
//     return handleResponse(
//       await supabase.from("price_list").delete().eq("id", id)
//     );
//   },

//   // Bulk upsert theo SKU: SKU trùng → update, SKU mới → insert.
//   // Tự chia batch 500 dòng để tránh quá tải request.
//   async bulkUpsert(rows) {
//     if (!rows.length) return { success: true, data: [] };
//     const BATCH = 500;
//     const allInserted = [];
//     for (let i = 0; i < rows.length; i += BATCH) {
//       const slice = rows.slice(i, i + BATCH);
//       const { data, error } = await supabase
//         .from("price_list")
//         .upsert(slice, { onConflict: "sku" })
//         .select();
//       if (error) throw new Error(error.message);
//       if (data) allInserted.push(...data);
//     }
//     return { success: true, data: allInserted };
//   },
// };


// // ─────────────────────────────────────────────
// // ─── Homepage API (background / hero / sections / flashSale / popup / articles)
// // Cấu trúc bảng Supabase cần tạo sẵn:
// //   homepage_config (id int PK, background jsonb, hero jsonb, sections jsonb,
// //                     flash_sale jsonb, popup jsonb, updated_at timestamptz)
// //   homepage_articles (id uuid PK, type text, title text, url text, file_url text,
// //                      file_name text, file_size bigint, created_at timestamptz)
// //
// // LƯU Ý: cột "popup" (jsonb) phải được tạo trên bảng homepage_config trước
// // (xem migration add_popup_config.sql) — nếu cột chưa tồn tại, upsert bên
// // dưới sẽ báo lỗi "column popup does not exist" thay vì lưu ngầm/bỏ qua.
// // ─────────────────────────────────────────────
// export const homepageApi = {
//   // Lấy toàn bộ cấu hình trang chủ (1 dòng duy nhất, id=1)
//   async getConfig() {
//     const { data, error } = await supabase
//       .from("homepage_config")
//       .select("background, hero, sections, flash_sale, popup, updated_at")
//       .eq("id", 1)
//       .maybeSingle();
//     if (error) throw new Error(error.message);
//     // Lần đầu chưa có row → trả null để FE tự fallback về DEFAULT_CONFIG
//     return {
//       background: data?.background ?? null,
//       hero: data?.hero ?? null,
//       sections: data?.sections ?? null,
//       flashSale: data?.flash_sale ?? null,
//       popup: data?.popup ?? null,
//       updated_at: data?.updated_at ?? null,
//     };
//   },

//   // Upsert toàn bộ cấu hình (luôn ghi đè row id=1)
//   async updateConfig({ background, hero, sections, flashSale, popup }) {
//     const { data, error } = await supabase
//       .from("homepage_config")
//       .upsert(
//         {
//           id: 1,
//           background,
//           hero,
//           sections,
//           flash_sale: flashSale,
//           popup,
//           updated_at: new Date().toISOString(),
//         },
//         { onConflict: "id" }
//       )
//       .select("background, hero, sections, flash_sale, popup, updated_at")
//       .single();
//     if (error) throw new Error(error.message);
//     return {
//       background: data.background,
//       hero: data.hero,
//       sections: data.sections,
//       flashSale: data.flash_sale,
//       popup: data.popup,
//       updated_at: data.updated_at,
//     };
//   },

//   // Lấy danh sách bài viết
//   async getArticles() {
//     const { data, error } = await supabase
//       .from("homepage_articles")
//       .select("*")
//       .order("created_at", { ascending: false });
//     if (error) throw new Error(error.message);
//     return { data: data || [] };
//   },

//   // Tạo bài viết mới
//   async createArticle(article) {
//     const row = {
//       type: article.type,                // "link" | "file"
//       title: article.title,
//       url: article.url || null,
//       file_url: article.fileUrl || null,
//       file_name: article.fileName || null,
//       file_size: article.fileSize || null,
//     };
//     const { data, error } = await supabase
//       .from("homepage_articles")
//       .insert([row])
//       .select()
//       .single();
//     if (error) throw new Error(error.message);
//     return data;
//   },

//   // Xóa bài viết
//   async deleteArticle(id) {
//     const { error } = await supabase
//       .from("homepage_articles")
//       .delete()
//       .eq("id", id);
//     if (error) throw new Error(error.message);
//     return { success: true };
//   },

//   // Upload file (ảnh/video/pdf/word) lên Supabase Storage
//   async uploadFile(file, subfolder = "misc") {
//     return await uploadHomepageFile(file, subfolder);
//   },
// };

// // ─────────────────────────────────────────────
// // ─── Posts API  (bài viết / trang đọc báo)
// // ─────────────────────────────────────────────
// export const postsApi = {
//   async getAll(params = {}) {
//     let q = supabase.from("posts").select("*");
//     if (params.status)      q = q.eq("status", params.status);
//     if (params.category_id) q = q.eq("category_id", params.category_id);
//     if (params.post_type)   q = q.eq("post_type", params.post_type);
//     if (params.search)      q = q.ilike("title", `%${params.search}%`);
//     if (params.page && params.limit) {
//       const from = (params.page - 1) * params.limit;
//       q = q.range(from, from + params.limit - 1);
//     }
//     q = q.order("published_at", { ascending: false });
//     return handleResponse(await q);
//   },

//   async getOne(id) {
//     return handleResponse(
//       await supabase.from("posts").select("*").eq("id", id).single()
//     );
//   },

//   async getBySlug(slug) {
//     const { data, error } = await supabase
//       .from("posts")
//       .select("*")
//       .eq("slug", slug)
//       .eq("status", "published")
//       .maybeSingle();
//     if (error) throw new Error(error.message);
//     return { data };
//   },

//   async create(body) {
//     return handleResponse(
//       await supabase.from("posts").insert([body]).select().single()
//     );
//   },

//   async update(id, body) {
//     return handleResponse(
//       await supabase.from("posts").update(body).eq("id", id).select().single()
//     );
//   },

//   async remove(id) {
//     return handleResponse(
//       await supabase.from("posts").delete().eq("id", id)
//     );
//   },
// };

// // ─────────────────────────────────────────────
// // ─── News Categories API  (nhóm tin tức cha-con, 2 cấp)
// // ─────────────────────────────────────────────
// export const newsCategoriesApi = {
//   /** Tất cả nhóm (cha + con), sắp theo sort_order */
//   async getAll() {
//     return handleResponse(
//       await supabase
//         .from("news_categories")
//         .select("*")
//         .order("sort_order", { ascending: true })
//     );
//   },

//   /** Chỉ nhóm CHA (parent_id IS NULL) */
//   async getRoots() {
//     return handleResponse(
//       await supabase
//         .from("news_categories")
//         .select("*")
//         .is("parent_id", null)
//         .order("sort_order", { ascending: true })
//     );
//   },

//   /** Nhóm CON của 1 nhóm cha */
//   async getChildren(parentId) {
//     return handleResponse(
//       await supabase
//         .from("news_categories")
//         .select("*")
//         .eq("parent_id", parentId)
//         .order("sort_order", { ascending: true })
//     );
//   },

//   /** Lấy 1 nhóm theo id */
//   async getOne(id) {
//     return handleResponse(
//       await supabase.from("news_categories").select("*").eq("id", id).single()
//     );
//   },

//   /** Lấy 1 nhóm theo slug (dùng cho shop routing) */
//   async getBySlug(slug) {
//     return handleResponse(
//       await supabase
//         .from("news_categories")
//         .select("*")
//         .eq("slug", slug)
//         .maybeSingle()
//     );
//   },

//   async create(body) {
//     return handleResponse(
//       await supabase.from("news_categories").insert([body]).select().single()
//     );
//   },

//   async update(id, body) {
//     return handleResponse(
//       await supabase.from("news_categories").update(body).eq("id", id).select().single()
//     );
//   },

//   async remove(id) {
//     return handleResponse(
//       await supabase.from("news_categories").delete().eq("id", id)
//     );
//   },

//   /** Cây 2 cấp: [{ ...root, children: [...] }, ...] */
//   async getTree() {
//     const all = await this.getAll();
//     const list = all.data || [];
//     return list
//       .filter((r) => !r.parent_id)
//       .map((r) => ({ ...r, children: list.filter((c) => c.parent_id === r.id) }));
//   },

//   /** Đếm số bài thuộc 1 nhóm (dùng cảnh báo trước khi xoá) */
//   async countPosts(categoryId) {
//     const { count, error } = await supabase
//       .from("posts")
//       .select("id", { count: "exact", head: true })
//       .eq("category_id", categoryId);
//     if (error) throw new Error(error.message);
//     return count || 0;
//   },
// };

// // =============================================================
// // Backend proxy (Express) — gọi /api/news/scrape
// // =============================================================
// const API_BASE = import.meta.env.VITE_API_URL || "";

// export const newsScrapeApi = {
//   /** Scrape 1 link → { title, content, excerpt, image, siteName, ... } */
//   async scrapeOne(url) {
//     const res = await fetch(`${API_BASE}/api/news/scrape`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ url }),
//     });
//     const json = await res.json();
//     if (!res.ok || !json.success) {
//       throw new Error(json.error || `HTTP ${res.status}`);
//     }
//     return json.data;
//   },

//   /** Scrape nhiều link song song */
//   async scrapeBatch(urls) {
//     const res = await fetch(`${API_BASE}/api/news/scrape-batch`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ urls }),
//     });
//     const json = await res.json();
//     if (!res.ok || !json.success) {
//       throw new Error(json.error || `HTTP ${res.status}`);
//     }
//     return json.results; // [{ url, success, data|error }, ...]
//   },
// };
// // ─────────────────────────────────────────────
// export const homepageValuesApi = {
//   async getAll() {
//     const { data, error } = await supabase
//       .from("homepage_values")
//       .select("*")
//       .order("sort_order", { ascending: true });
//     if (error) throw new Error(error.message);
//     return { data: data || [] };
//   },
//   async create(v) {
//     const { data, error } = await supabase.from("homepage_values").insert([{
//       icon: v.icon || "fas fa-seedling",
//       title: v.title,
//       description: v.desc || null,
//       sort_order: v.sortOrder || 0,
//       enabled: v.enabled !== false,
//     }]).select().single();
//     if (error) throw new Error(error.message);
//     return data;
//   },
//   async update(id, v) {
//     const { data, error } = await supabase.from("homepage_values").update({
//       icon: v.icon, title: v.title, description: v.desc || null,
//       sort_order: v.sortOrder || 0, enabled: v.enabled !== false,
//     }).eq("id", id).select().single();
//     if (error) throw new Error(error.message);
//     return data;
//   },
//   async remove(id) {
//     const { error } = await supabase.from("homepage_values").delete().eq("id", id);
//     if (error) throw new Error(error.message);
//     return { success: true };
//   },
// };

// // ─────────────────────────────────────────────
// // ─── Homepage Promo Banners (2 banner quảng cáo)
// // ─────────────────────────────────────────────
// export const homepagePromoBannersApi = {
//   async getAll() {
//     const { data, error } = await supabase
//       .from("homepage_promo_banners")
//       .select("*")
//       .order("sort_order", { ascending: true });
//     if (error) throw new Error(error.message);
//     return { data: data || [] };
//   },
//   async upsert(b) {
//     const { data: existing } = await supabase
//       .from("homepage_promo_banners")
//       .select("id")
//       .eq("position", b.position)
//       .maybeSingle();

//     const payload = {
//       position: b.position,
//       tag: b.tag || null,
//       title: b.title,
//       image_url: b.imageUrl || null,
//       cta_text: b.ctaText || "Mua ngay",
//       cta_link: b.ctaLink || "#",
//       sort_order: b.sortOrder || 0,
//       enabled: b.enabled !== false,
//     };

//     if (existing) {
//       const { data, error } = await supabase
//         .from("homepage_promo_banners")
//         .update(payload)
//         .eq("id", existing.id)
//         .select()
//         .single();
//       if (error) throw new Error(error.message);
//       return data;
//     }
//     const { data, error } = await supabase
//       .from("homepage_promo_banners")
//       .insert([payload])
//       .select()
//       .single();
//     if (error) throw new Error(error.message);
//     return data;
//   },
// };

// // ─────────────────────────────────────────────
// // ─── Homepage Picks (slider / featured / flash_sale)
// // Picks tham chiếu tới product_groups (kind='slider') hoặc products
// // (kind='featured' | 'flash_sale') đã có sẵn — không lưu dữ liệu riêng.
// //
// // Yêu cầu ràng buộc UNIQUE(kind, target_id) trên bảng homepage_picks để
// // upsert trong create() hoạt động đúng (tránh thêm trùng 1 sản phẩm 2 lần
// // vào cùng 1 block).
// // ─────────────────────────────────────────────
// export const homepagePicksApi = {
//   // Lấy TẤT CẢ picks (mọi kind) — HomePage.jsx tự lọc theo kind ở FE
//   async getAll() {
//     const { data, error } = await supabase
//       .from("homepage_picks")
//       .select("*")
//       .order("sort_order", { ascending: true });
//     if (error) throw new Error(error.message);
//     return { data: data || [] };
//   },
//   // Lấy picks theo 1 kind cụ thể (tiện dùng riêng lẻ nếu cần)
//   async getByKind(kind) {
//     const { data, error } = await supabase
//       .from("homepage_picks")
//       .select("*")
//       .eq("kind", kind)
//       .order("sort_order", { ascending: true });
//     if (error) throw new Error(error.message);
//     return { data: data || [] };
//   },
//   // Thêm 1 pick mới (bỏ qua/ghi đè nếu đã tồn tại cùng kind+target_id)
//   async create(p) {
//     const { data, error } = await supabase
//       .from("homepage_picks")
//       .upsert({
//         kind: p.kind,
//         target_id: String(p.targetId),
//         target_kind: p.targetKind,           // 'product' | 'group'
//         custom_title: p.customTitle || null,
//         custom_image: p.customImage || null,
//         sort_order: p.sortOrder || 0,
//         enabled: p.enabled !== false,
//       }, { onConflict: "kind,target_id" })
//       .select()
//       .single();
//     if (error) throw new Error(error.message);
//     return data;
//   },
//   async update(id, p) {
//     const { data, error } = await supabase
//       .from("homepage_picks")
//       .update({
//         custom_title: p.customTitle || null,
//         custom_image: p.customImage || null,
//         sort_order: p.sortOrder || 0,
//         enabled: p.enabled !== false,
//       })
//       .eq("id", id)
//       .select()
//       .single();
//     if (error) throw new Error(error.message);
//     return data;
//   },
//   async remove(id) {
//     const { error } = await supabase.from("homepage_picks").delete().eq("id", id);
//     if (error) throw new Error(error.message);
//     return { success: true };
//   },
//   async removeByKindAndTarget(kind, targetId) {
//     const { error } = await supabase
//       .from("homepage_picks")
//       .delete()
//       .eq("kind", kind)
//       .eq("target_id", String(targetId));
//     if (error) throw new Error(error.message);
//     return { success: true };
//   },
// };

// // ─────────────────────────────────────────────
// // ─── Homepage Blog (góc chia sẻ / bài viết)
// // ─────────────────────────────────────────────
// export const homepageBlogApi = {
//   async getAll() {
//     const { data, error } = await supabase
//       .from("homepage_blog")
//       .select("*")
//       .order("sort_order", { ascending: true })
//       .order("created_at", { ascending: false });
//     if (error) throw new Error(error.message);
//     return { data: data || [] };
//   },
//   async create(b) {
//     const { data, error } = await supabase.from("homepage_blog").insert([{
//       title: b.title,
//       description: b.desc || null,
//       author: b.author || "Admin",
//       image_url: b.imageUrl || null,
//       link: b.link || "#",
//       sort_order: b.sortOrder || 0,
//       enabled: b.enabled !== false,
//     }]).select().single();
//     if (error) throw new Error(error.message);
//     return data;
//   },
//   async update(id, b) {
//     const { data, error } = await supabase.from("homepage_blog").update({
//       title: b.title,
//       description: b.desc || null,
//       author: b.author || "Admin",
//       image_url: b.imageUrl || null,
//       link: b.link || "#",
//       sort_order: b.sortOrder || 0,
//       enabled: b.enabled !== false,
//     }).eq("id", id).select().single();
//     if (error) throw new Error(error.message);
//     return data;
//   },
//   async remove(id) {
//     const { error } = await supabase.from("homepage_blog").delete().eq("id", id);
//     if (error) throw new Error(error.message);
//     return { success: true };
//   },
// };

// // ─────────────────────────────────────────────
// // ─── Upload Manager: bucket riêng cho video
// // ─────────────────────────────────────────────
// const UPLOAD_MANAGER_BUCKET = "upload-manager-assets";

// async function uploadManagerFile(file, subfolder = "videos") {
//   const ext = (file.name.split(".").pop() || "bin").toLowerCase();
//   const fileName = `${subfolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

//   const { error } = await supabase.storage
//     .from(UPLOAD_MANAGER_BUCKET)
//     .upload(fileName, file, { upsert: true, contentType: file.type });

//   if (error) throw new Error("Upload thất bại: " + error.message);

//   const { data: pub } = supabase.storage
//     .from(UPLOAD_MANAGER_BUCKET)
//     .getPublicUrl(fileName);

//   return {
//     url: pub.publicUrl,
//     fileName: file.name,
//     size: file.size,
//     storedName: fileName,
//   };
// }

// // ─────────────────────────────────────────────
// // ─── Upload Groups API (nhóm acha/con dùng chung cho content + video)
// // Bảng cần tạo sẵn trên Supabse:
// //   upload_groups (id uuid/int PK, name text, parent_id int null,
// //                   sort_order int default 0, created_at timestamptz default now())
// // ─────────────────────────────────────────────
// export const uploadGroupsApi = {
//   /** Lấy TẤT CẢ nhóm (cha + con), dùng cho GroupsTab tự fetch */
//   async getAll() {
//     return handleResponse(
//       await supabase
//         .from("upload_groups")
//         .select("*")
//         .order("sort_order", { ascending: true })
//     );
//   },

//   async getRoots() {
//     return handleResponse(
//       await supabase
//         .from("upload_groups")
//         .select("*")
//         .is("parent_id", null)
//         .order("sort_order", { ascending: true })
//     );
//   },

//   /** Nhóm CON của 1 nhóm cha */
//   async getChildren(parentId) {
//     return handleResponse(
//       await supabase
//         .from("upload_groups")
//         .select("*")
//         .eq("parent_id", parentId)
//         .order("sort_order", { ascending: true })
//     );
//   },

//   /** Lấy 1 nhóm theo id */
//   async getOne(id) {
//     return handleResponse(
//       await supabase.from("upload_groups").select("*").eq("id", id).single()
//     );
//   },

//   /** Lấy 1 nhóm theo slug (dùng cho shop routing) */
//   async getBySlug(slug) {
//     return handleResponse(
//       await supabase
//         .from("upload_groups")
//         .select("*")
//         .eq("slug", slug)
//         .maybeSingle()
//     );
//   },

//   async create(body) {
//     return handleResponse(
//       await supabase.from("upload_groups").insert([body]).select().single()
//     );
//   },

//   async update(id, body) {
//     return handleResponse(
//       await supabase.from("upload_groups").update(body).eq("id", id).select().single()
//     );
//   },

//   async remove(id) {
//     return handleResponse(
//       await supabase.from("upload_groups").delete().eq("id", id)
//     );
//   },

//   /** Cây 2 cấp: [{ ...root, children: [...] }, ...] */
//   async getTree() {
//     const all = await this.getAll();
//     const list = all.data || [];
//     return list
//       .filter((r) => !r.parent_id)
//       .map((r) => ({ ...r, children: list.filter((c) => c.parent_id === r.id) }));
//   },

//   /** Đếm số video thuộc 1 nhóm (dùng cảnh báo trước khi xoá) */
//   async countPosts(categoryId) {
//     const { count, error } = await supabase
//       .from("videos")
//       .select("id", { count: "exact", head: true })
//       .eq("group_id", categoryId);
//     if (error) throw new Error(error.message);
//     return count || 0;
//   },
// };

// // ─────────────────────────────────────────────
// // ─── About Content API (nội dung "Về Techtra", 1 dòng / group_id)
// // Bảng cần tạo sẵn trên Supabase:
// //   about_content (id uuid/int PK, group_id int UNIQUE, content text,
// //                   updated_at timestamptz default now())
// // UNIQUE(group_id) bắt buộc để upsert onConflict hoạt động đúng.
// // ─────────────────────────────────────────────
// export const aboutContentApi = {
//   async get(groupId) {
//     const { data, error } = await supabase
//       .from("about_content")
//       .select("content")
//       .eq("group_id", groupId)
//       .maybeSingle();
//     if (error) throw new Error(error.message);
//     return { content: data?.content ?? "" };
//   },

//   async save(groupId, { content }) {
//     const { data, error } = await supabase
//       .from("about_content")
//       .upsert(
//         { group_id: groupId, content, updated_at: new Date().toISOString() },
//         { onConflict: "group_id" }
//       )
//       .select()
//       .single();
//     if (error) throw new Error(error.message);
//     return data;
//   },
// };

// // ─────────────────────────────────────────────
// // ─── Video API (video "Giải trí", gắn theo group_id)
// // Bảng cần tạo sẵn trên Supabase:
// //   videos (id uuid/int PK, group_id int, title text, url text,
// //            file_name text, file_size bigint, created_at timestamptz default now())
// //
// // Dùng lại bucket HOMEPAGE_BUCKET ("homepage-assets") đã khai báo sẵn ở đầu
// // file api.js (đang chạy tốt cho upload ảnh/video/pdf trang chủ) — KHÔNG cần
// // tạo/khai báo bucket riêng cho video, tránh lỗi "Bucket not found".
// // ─────────────────────────────────────────────
// export const videoApi = {
//   async getAll(params = {}) {
//     let q = supabase.from("videos").select("*").order("created_at", { ascending: false });
//     if (params.group_id === null) {
//       q = q.is("group_id", null);       // lọc video KHÔNG thuộc nhóm nào
//     } else if (params.group_id) {
//       q = q.eq("group_id", params.group_id);
//     }
//     return handleResponse(await q);
//   },

//   // form: FormData chứa "video" (File), "group_id", "title"
//   async upload(form) {
//     const file = form.get("video");
//     const groupId = form.get("group_id");
//     const title = form.get("title");
//     if (!file) throw new Error("Thiếu file video");

//     const ext = (file.name.split(".").pop() || "bin").toLowerCase();
//     const fileName = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

//     const { error: uploadError } = await supabase.storage
//       .from(HOMEPAGE_BUCKET)
//       .upload(fileName, file, { upsert: true, contentType: file.type || undefined });

//     if (uploadError) {
//       console.error("Supabase Storage upload error (video):", uploadError);
//       throw new Error("Upload thất bại: " + uploadError.message);
//     }

//     const { data: pub } = supabase.storage
//       .from(HOMEPAGE_BUCKET)
//       .getPublicUrl(fileName);

//     const { data, error } = await supabase
//       .from("videos")
//       .insert([{
//         group_id: groupId || null,
//         title: title || file.name,
//         url: pub.publicUrl,
//         file_name: file.name,
//         file_size: file.size,
//       }])
//       .select()
//       .single();
//     if (error) throw new Error(error.message);
//     return data;
//   },

//   async remove(id) {
//     return handleResponse(
//       await supabase.from("videos").delete().eq("id", id)
//     );
//   },
// };

// src/api.js — Supabase version (NO backend)

// ─────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Bucket lưu file (ảnh / video / pdf / word) do HomePage upload
const HOMEPAGE_BUCKET = "homepage-assets";

// ─────────────────────────────────────────────
// Upload file lên Supabase Storage, trả về { url, fileName, size }
async function uploadHomepageFile(file, subfolder = "misc") {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const fileName = `${subfolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(HOMEPAGE_BUCKET)
    .upload(fileName, file, { upsert: true, contentType: file.type });

  if (error) throw new Error("Upload thất bại: " + error.message);

  const { data: pub } = supabase.storage
    .from(HOMEPAGE_BUCKET)
    .getPublicUrl(fileName);

  return {
    url: pub.publicUrl,
    fileName: file.name,
    size: file.size,
    storedName: fileName,
  };
}

// ─────────────────────────────────────────────
// Upload ảnh sản phẩm/nhóm SP lên bucket "product-images" (public)
// Trả về public URL để lưu vào DB.
export async function uploadImage(file, folder = "products") {
  const ext      = (file.name.split(".").pop() || "bin").toLowerCase();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(fileName, file, { upsert: true, contentType: file.type });

  if (error) throw new Error("Upload ảnh thất bại: " + error.message);

  const { data: pub } = supabase.storage
    .from("product-images")
    .getPublicUrl(fileName);

  return pub.publicUrl;
}

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
// products / product_groups cần có sẵn các cột boolean:
//   product_groups.is_slider   (nhóm nào được phép vào Slider trang chủ)
//   products.is_featured       (SP nào được phép vào Danh mục nổi bật)
//   products.is_flash_sale     (SP nào được phép vào Flash Sale)
// ─────────────────────────────────────────────
export const productGroupsApi = {
  async getAll() {
    // Sắp xếp: cha (parent_id null) lên đầu, sau đó theo sort_order
    return handleResponse(
      await supabase
        .from("product_groups")
        .select("*")
        .order("sort_order", { ascending: true })
    );
  },

  // MỚI: chỉ lấy Product Group lớn (parent_id IS NULL)
  async getRoots() {
    return handleResponse(
      await supabase
        .from("product_groups")
        .select("*")
        .is("parent_id", null)
        .order("sort_order", { ascending: true })
    );
  },

  // MỚI: lấy các Product Group con của 1 root
  async getChildren(parentId) {
    return handleResponse(
      await supabase
        .from("product_groups")
        .select("*")
        .eq("parent_id", parentId)
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

    // Theo tab "Đã xóa": chỉ lấy status='deleted'
    // Theo tab "Tất cả" / "Trên kệ": loại bỏ deleted (trừ khi includeDeleted=true)
    if (params.includeDeleted !== true) {
      query = query.neq("status", "deleted");
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

  // Lấy 1 sản phẩm theo SKU — dùng cho import/cập nhật giá-tồn kho hàng loạt,
  // tránh phải tải toàn bộ danh mục về client chỉ để tìm theo SKU.
  async getBySku(sku) {
    if (!sku) return null;
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("sku", sku)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data || null;
  },

  // Lấy nhiều sản phẩm theo danh sách SKU cùng lúc — dùng khi import file lớn,
  // giảm số lượt gọi API xuống còn 1 lần thay vì N lần getBySku.
  async getManyBySku(skus = []) {
    const uniqueSkus = [...new Set(skus.filter(Boolean))];
    if (!uniqueSkus.length) return [];
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .in("sku", uniqueSkus);
    if (error) throw new Error(error.message);
    return data || [];
  },

  // Lấy tất cả slug hiện có — dùng khi import nhiều SP để tránh trùng slug
  async getAllSlugs() {
    const { data, error } = await supabase
      .from("products")
      .select("slug")
      .not("slug", "is", null);
    if (error) throw new Error(error.message);
    return (data || []).map((r) => r.slug).filter(Boolean);
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

  // Cập nhật theo SKU trực tiếp (không cần biết id trước) — tiện cho import hàng loạt.
  async updateBySku(sku, body) {
    return handleResponse(
      await supabase
        .from("products")
        .update(body)
        .eq("sku", sku)
        .select()
        .single()
    );
  },

  // Soft delete: chỉ set status='deleted', giữ nguyên bản ghi trong DB
  async softDelete(id) {
    return handleResponse(
      await supabase
        .from("products")
        .update({ status: "deleted", is_active: false })
        .eq("id", id)
        .select()
        .single()
    );
  },

  // Phục hồi: set lại status='active' + bật is_active
  async restore(id) {
    return handleResponse(
      await supabase
        .from("products")
        .update({ status: "active", is_active: true })
        .eq("id", id)
        .select()
        .single()
    );
  },

  // Xóa vĩnh viễn: xóa hẳn khỏi DB (không thể phục hồi)
  async remove(id) {
    return handleResponse(
      await supabase
        .from("products")
        .delete()
        .eq("id", id)
    );
  },

  // Bulk soft delete
  async bulkSoftDelete(ids) {
    if (!ids.length) return { success: true, data: [] };
    const { data, error } = await supabase
      .from("products")
      .update({ status: "deleted", is_active: false })
      .in("id", ids)
      .select();
    if (error) throw new Error(error.message);
    return { success: true, data: data || [] };
  },

  // Bulk restore
  async bulkRestore(ids) {
    if (!ids.length) return { success: true, data: [] };
    const { data, error } = await supabase
      .from("products")
      .update({ status: "active", is_active: true })
      .in("id", ids)
      .select();
    if (error) throw new Error(error.message);
    return { success: true, data: data || [] };
  },
};

// ─────────────────────────────────────────────
// ─── Price List API (bảng giá, 1 dòng = 1 SKU)
// ─────────────────────────────────────────────
export const priceListApi = {
  async getAll(params = {}) {
    let q = supabase.from("price_list").select("*").order("sort_order", { ascending: true });
    if (params.search)    q = q.ilike("name", `%${params.search}%`);
    if (params.sku)       q = q.eq("sku", params.sku);
    if (params.group_id)  q = q.eq("group_id", params.group_id);
    if (typeof params.is_active === "boolean") {
      q = q.eq("is_active", params.is_active);
    }
    if (params.page && params.limit) {
      const from = (params.page - 1) * params.limit;
      q = q.range(from, from + params.limit - 1);
    }
    return handleResponse(await q);
  },

  // Lấy các dòng price_list CHƯA có trong products (theo SKU).
  // Dùng 2 truy vấn: (1) lấy tất cả SKU đã tồn tại trong products,
  // (2) lấy price_list loại trừ các SKU đó.
  // Supabase PostgREST hỗ trợ filter `not.in.(...)` — gọn hơn.
  async getPendingImport(params = {}) {
    // Lấy tập SKU đã tồn tại trong products
    const { data: existing, error: e1 } = await supabase
      .from("products")
      .select("sku")
      .not("sku", "is", null);
    if (e1) throw new Error(e1.message);
    const existingSkus = (existing || []).map((r) => r.sku).filter(Boolean);

    let q = supabase.from("price_list").select("*").order("sort_order", { ascending: true });
    if (params.search) q = q.ilike("name", `%${params.search}%`);
    if (params.group_id) q = q.eq("group_id", params.group_id);

    if (existingSkus.length) {
      // Lọc ra các dòng có SKU không nằm trong danh sách đã tồn tại
      q = q.not("sku", "in", `(${existingSkus.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(",")})`);
    }

    if (params.page && params.limit) {
      const from = (params.page - 1) * params.limit;
      q = q.range(from, from + params.limit - 1);
    }
    return handleResponse(await q);
  },

  async getOne(id) {
    return handleResponse(
      await supabase.from("price_list").select("*").eq("id", id).single()
    );
  },

  async create(body) {
    return handleResponse(
      await supabase.from("price_list").insert([body]).select().single()
    );
  },

  async update(id, body) {
    return handleResponse(
      await supabase.from("price_list").update(body).eq("id", id).select().single()
    );
  },

  async remove(id) {
    return handleResponse(
      await supabase.from("price_list").delete().eq("id", id)
    );
  },

  // Bulk upsert theo SKU: SKU trùng → update, SKU mới → insert.
  // Tự chia batch 500 dòng để tránh quá tải request.
  async bulkUpsert(rows) {
    if (!rows.length) return { success: true, data: [] };
    const BATCH = 500;
    const allInserted = [];
    for (let i = 0; i < rows.length; i += BATCH) {
      const slice = rows.slice(i, i + BATCH);
      const { data, error } = await supabase
        .from("price_list")
        .upsert(slice, { onConflict: "sku" })
        .select();
      if (error) throw new Error(error.message);
      if (data) allInserted.push(...data);
    }
    return { success: true, data: allInserted };
  },
};


// ─────────────────────────────────────────────
// ─── Homepage API (background / hero / sections / flashSale / popup / articles)
// Cấu trúc bảng Supabase cần tạo sẵn:
//   homepage_config (id int PK, background jsonb, hero jsonb, sections jsonb,
//                     flash_sale jsonb, popup jsonb, updated_at timestamptz)
//   homepage_articles (id uuid PK, type text, title text, url text, file_url text,
//                      file_name text, file_size bigint, created_at timestamptz)
//
// LƯU Ý: cột "popup" (jsonb) phải được tạo trên bảng homepage_config trước
// (xem migration add_popup_config.sql) — nếu cột chưa tồn tại, upsert bên
// dưới sẽ báo lỗi "column popup does not exist" thay vì lưu ngầm/bỏ qua.
// ─────────────────────────────────────────────
export const homepageApi = {
  // Lấy toàn bộ cấu hình trang chủ (1 dòng duy nhất, id=1)
  async getConfig() {
    const { data, error } = await supabase
      .from("homepage_config")
      .select("background, hero, sections, flash_sale, popup, updated_at")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    // Lần đầu chưa có row → trả null để FE tự fallback về DEFAULT_CONFIG
    return {
      background: data?.background ?? null,
      hero: data?.hero ?? null,
      sections: data?.sections ?? null,
      flashSale: data?.flash_sale ?? null,
      popup: data?.popup ?? null,
      updated_at: data?.updated_at ?? null,
    };
  },

  // Upsert toàn bộ cấu hình (luôn ghi đè row id=1)
  async updateConfig({ background, hero, sections, flashSale, popup }) {
    const { data, error } = await supabase
      .from("homepage_config")
      .upsert(
        {
          id: 1,
          background,
          hero,
          sections,
          flash_sale: flashSale,
          popup,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("background, hero, sections, flash_sale, popup, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return {
      background: data.background,
      hero: data.hero,
      sections: data.sections,
      flashSale: data.flash_sale,
      popup: data.popup,
      updated_at: data.updated_at,
    };
  },

  // Lấy danh sách bài viết
  async getArticles() {
    const { data, error } = await supabase
      .from("homepage_articles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { data: data || [] };
  },

  // Tạo bài viết mới
  async createArticle(article) {
    const row = {
      type: article.type,                // "link" | "file"
      title: article.title,
      url: article.url || null,
      file_url: article.fileUrl || null,
      file_name: article.fileName || null,
      file_size: article.fileSize || null,
    };
    const { data, error } = await supabase
      .from("homepage_articles")
      .insert([row])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  // Xóa bài viết
  async deleteArticle(id) {
    const { error } = await supabase
      .from("homepage_articles")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  // Upload file (ảnh/video/pdf/word) lên Supabase Storage
  async uploadFile(file, subfolder = "misc") {
    return await uploadHomepageFile(file, subfolder);
  },

  // ─────────────────────────────────────────────
  // getAll(): gộp toàn bộ dữ liệu trang chủ trong 1 lần gọi, dùng cho
  // app.js (trang chủ khách, classic script qua window.homepageApi).
  //
  // QUAN TRỌNG: dùng select("*") cho bảng products thay vì liệt kê cột cụ
  // thể (old_price, image, is_new, percent_sold...) vì các cột đó KHÔNG
  // tồn tại trong schema thật — liệt kê cột sai tên sẽ luôn trả lỗi 400.
  // Field nào bảng products không có thì map fallback ở phía dưới.
  // ─────────────────────────────────────────────
  async getAll() {
    const [cfgRaw, valuesRes, promosRes, blogRes, productsRes] = await Promise.all([
      this.getConfig(),
      homepageValuesApi.getAll(),
      homepagePromoBannersApi.getAll(),
      homepageBlogApi.getAll(),
      supabase
        .from("products")
        .select("*")
        .neq("status", "deleted")
        .order("created_at", { ascending: false }),
    ]);

    if (productsRes.error) throw new Error(productsRes.error.message);
    const products = productsRes.data || [];

    // Map 1 sản phẩm DB sang shape app.js mong đợi
    const now = Date.now();
    const mapProduct = (p) => {
      const disc = Number(p.flash_sale_discount) || Number(p.discount) || 0;
      const basePrice = Number(p.final_price ?? p.price) || 0;
      const originalPrice = Number(p.price) || basePrice;
      const isExpired = !!(
        p.flash_sale_end_at && new Date(p.flash_sale_end_at).getTime() <= now
      );
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

    const flashSaleProducts = products
      .filter((p) => Number(p.flash_sale_discount) > 0)
      .map(mapProduct);

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
      values: (valuesRes.data || []).map((r) => ({
        id: r.id, icon: r.icon, title: r.title, desc: r.description || "",
      })),
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
// ─── Posts API  (bài viết / trang đọc báo)
// ─────────────────────────────────────────────
export const postsApi = {
  async getAll(params = {}) {
    let q = supabase.from("posts").select("*");
    if (params.status)      q = q.eq("status", params.status);
    if (params.category_id) q = q.eq("category_id", params.category_id);
    if (params.post_type)   q = q.eq("post_type", params.post_type);
    if (params.search)      q = q.ilike("title", `%${params.search}%`);
    if (params.page && params.limit) {
      const from = (params.page - 1) * params.limit;
      q = q.range(from, from + params.limit - 1);
    }
    q = q.order("published_at", { ascending: false });
    return handleResponse(await q);
  },

  async getOne(id) {
    return handleResponse(
      await supabase.from("posts").select("*").eq("id", id).single()
    );
  },

  async getBySlug(slug) {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { data };
  },

  async create(body) {
    return handleResponse(
      await supabase.from("posts").insert([body]).select().single()
    );
  },

  async update(id, body) {
    return handleResponse(
      await supabase.from("posts").update(body).eq("id", id).select().single()
    );
  },

  async remove(id) {
    return handleResponse(
      await supabase.from("posts").delete().eq("id", id)
    );
  },
};

// ─────────────────────────────────────────────
// ─── News Categories API  (nhóm tin tức cha-con, 2 cấp)
// ─────────────────────────────────────────────
export const newsCategoriesApi = {
  /** Tất cả nhóm (cha + con), sắp theo sort_order */
  async getAll() {
    return handleResponse(
      await supabase
        .from("news_categories")
        .select("*")
        .order("sort_order", { ascending: true })
    );
  },

  /** Chỉ nhóm CHA (parent_id IS NULL) */
  async getRoots() {
    return handleResponse(
      await supabase
        .from("news_categories")
        .select("*")
        .is("parent_id", null)
        .order("sort_order", { ascending: true })
    );
  },

  /** Nhóm CON của 1 nhóm cha */
  async getChildren(parentId) {
    return handleResponse(
      await supabase
        .from("news_categories")
        .select("*")
        .eq("parent_id", parentId)
        .order("sort_order", { ascending: true })
    );
  },

  /** Lấy 1 nhóm theo id */
  async getOne(id) {
    return handleResponse(
      await supabase.from("news_categories").select("*").eq("id", id).single()
    );
  },

  /** Lấy 1 nhóm theo slug (dùng cho shop routing) */
  async getBySlug(slug) {
    return handleResponse(
      await supabase
        .from("news_categories")
        .select("*")
        .eq("slug", slug)
        .maybeSingle()
    );
  },

  async create(body) {
    return handleResponse(
      await supabase.from("news_categories").insert([body]).select().single()
    );
  },

  async update(id, body) {
    return handleResponse(
      await supabase.from("news_categories").update(body).eq("id", id).select().single()
    );
  },

  async remove(id) {
    return handleResponse(
      await supabase.from("news_categories").delete().eq("id", id)
    );
  },

  /** Cây 2 cấp: [{ ...root, children: [...] }, ...] */
  async getTree() {
    const all = await this.getAll();
    const list = all.data || [];
    return list
      .filter((r) => !r.parent_id)
      .map((r) => ({ ...r, children: list.filter((c) => c.parent_id === r.id) }));
  },

  /** Đếm số bài thuộc 1 nhóm (dùng cảnh báo trước khi xoá) */
  async countPosts(categoryId) {
    const { count, error } = await supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("category_id", categoryId);
    if (error) throw new Error(error.message);
    return count || 0;
  },
};

// =============================================================
// Backend proxy (Express) — gọi /api/news/scrape
// =============================================================
const API_BASE = import.meta.env.VITE_API_URL || "";

export const newsScrapeApi = {
  /** Scrape 1 link → { title, content, excerpt, image, siteName, ... } */
  async scrapeOne(url) {
    const res = await fetch(`${API_BASE}/api/news/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    return json.data;
  },

  /** Scrape nhiều link song song */
  async scrapeBatch(urls) {
    const res = await fetch(`${API_BASE}/api/news/scrape-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    return json.results; // [{ url, success, data|error }, ...]
  },
};
// ─────────────────────────────────────────────
export const homepageValuesApi = {
  async getAll() {
    const { data, error } = await supabase
      .from("homepage_values")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { data: data || [] };
  },
  async create(v) {
    const { data, error } = await supabase.from("homepage_values").insert([{
      icon: v.icon || "fas fa-seedling",
      title: v.title,
      description: v.desc || null,
      sort_order: v.sortOrder || 0,
      enabled: v.enabled !== false,
    }]).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
  async update(id, v) {
    const { data, error } = await supabase.from("homepage_values").update({
      icon: v.icon, title: v.title, description: v.desc || null,
      sort_order: v.sortOrder || 0, enabled: v.enabled !== false,
    }).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
  async remove(id) {
    const { error } = await supabase.from("homepage_values").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { success: true };
  },
};

// ─────────────────────────────────────────────
// ─── Homepage Promo Banners (2 banner quảng cáo)
// ─────────────────────────────────────────────
export const homepagePromoBannersApi = {
  async getAll() {
    const { data, error } = await supabase
      .from("homepage_promo_banners")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { data: data || [] };
  },
  async upsert(b) {
    const { data: existing } = await supabase
      .from("homepage_promo_banners")
      .select("id")
      .eq("position", b.position)
      .maybeSingle();

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

    if (existing) {
      const { data, error } = await supabase
        .from("homepage_promo_banners")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    const { data, error } = await supabase
      .from("homepage_promo_banners")
      .insert([payload])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
};

// ─────────────────────────────────────────────
// ─── Homepage Picks (slider / featured / flash_sale)
// Picks tham chiếu tới product_groups (kind='slider') hoặc products
// (kind='featured' | 'flash_sale') đã có sẵn — không lưu dữ liệu riêng.
//
// Yêu cầu ràng buộc UNIQUE(kind, target_id) trên bảng homepage_picks để
// upsert trong create() hoạt động đúng (tránh thêm trùng 1 sản phẩm 2 lần
// vào cùng 1 block).
// ─────────────────────────────────────────────
export const homepagePicksApi = {
  // Lấy TẤT CẢ picks (mọi kind) — HomePage.jsx tự lọc theo kind ở FE
  async getAll() {
    const { data, error } = await supabase
      .from("homepage_picks")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { data: data || [] };
  },
  // Lấy picks theo 1 kind cụ thể (tiện dùng riêng lẻ nếu cần)
  async getByKind(kind) {
    const { data, error } = await supabase
      .from("homepage_picks")
      .select("*")
      .eq("kind", kind)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { data: data || [] };
  },
  // Thêm 1 pick mới (bỏ qua/ghi đè nếu đã tồn tại cùng kind+target_id)
  async create(p) {
    const { data, error } = await supabase
      .from("homepage_picks")
      .upsert({
        kind: p.kind,
        target_id: String(p.targetId),
        target_kind: p.targetKind,           // 'product' | 'group'
        custom_title: p.customTitle || null,
        custom_image: p.customImage || null,
        sort_order: p.sortOrder || 0,
        enabled: p.enabled !== false,
      }, { onConflict: "kind,target_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
  async update(id, p) {
    const { data, error } = await supabase
      .from("homepage_picks")
      .update({
        custom_title: p.customTitle || null,
        custom_image: p.customImage || null,
        sort_order: p.sortOrder || 0,
        enabled: p.enabled !== false,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
  async remove(id) {
    const { error } = await supabase.from("homepage_picks").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { success: true };
  },
  async removeByKindAndTarget(kind, targetId) {
    const { error } = await supabase
      .from("homepage_picks")
      .delete()
      .eq("kind", kind)
      .eq("target_id", String(targetId));
    if (error) throw new Error(error.message);
    return { success: true };
  },
};

// ─────────────────────────────────────────────
// ─── Homepage Blog (góc chia sẻ / bài viết)
// ─────────────────────────────────────────────
export const homepageBlogApi = {
  async getAll() {
    const { data, error } = await supabase
      .from("homepage_blog")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { data: data || [] };
  },
  async create(b) {
    const { data, error } = await supabase.from("homepage_blog").insert([{
      title: b.title,
      description: b.desc || null,
      author: b.author || "Admin",
      image_url: b.imageUrl || null,
      link: b.link || "#",
      sort_order: b.sortOrder || 0,
      enabled: b.enabled !== false,
    }]).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
  async update(id, b) {
    const { data, error } = await supabase.from("homepage_blog").update({
      title: b.title,
      description: b.desc || null,
      author: b.author || "Admin",
      image_url: b.imageUrl || null,
      link: b.link || "#",
      sort_order: b.sortOrder || 0,
      enabled: b.enabled !== false,
    }).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
  async remove(id) {
    const { error } = await supabase.from("homepage_blog").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { success: true };
  },
};

// ─────────────────────────────────────────────
// ─── Upload Manager: bucket riêng cho video
// ─────────────────────────────────────────────
const UPLOAD_MANAGER_BUCKET = "upload-manager-assets";

async function uploadManagerFile(file, subfolder = "videos") {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const fileName = `${subfolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(UPLOAD_MANAGER_BUCKET)
    .upload(fileName, file, { upsert: true, contentType: file.type });

  if (error) throw new Error("Upload thất bại: " + error.message);

  const { data: pub } = supabase.storage
    .from(UPLOAD_MANAGER_BUCKET)
    .getPublicUrl(fileName);

  return {
    url: pub.publicUrl,
    fileName: file.name,
    size: file.size,
    storedName: fileName,
  };
}

// ─────────────────────────────────────────────
// ─── Upload Groups API (nhóm acha/con dùng chung cho content + video)
// Bảng cần tạo sẵn trên Supabse:
//   upload_groups (id uuid/int PK, name text, parent_id int null,
//                   sort_order int default 0, created_at timestamptz default now())
// ─────────────────────────────────────────────
export const uploadGroupsApi = {
  /** Lấy TẤT CẢ nhóm (cha + con), dùng cho GroupsTab tự fetch */
  async getAll() {
    return handleResponse(
      await supabase
        .from("upload_groups")
        .select("*")
        .order("sort_order", { ascending: true })
    );
  },

  async getRoots() {
    return handleResponse(
      await supabase
        .from("upload_groups")
        .select("*")
        .is("parent_id", null)
        .order("sort_order", { ascending: true })
    );
  },

  /** Nhóm CON của 1 nhóm cha */
  async getChildren(parentId) {
    return handleResponse(
      await supabase
        .from("upload_groups")
        .select("*")
        .eq("parent_id", parentId)
        .order("sort_order", { ascending: true })
    );
  },

  /** Lấy 1 nhóm theo id */
  async getOne(id) {
    return handleResponse(
      await supabase.from("upload_groups").select("*").eq("id", id).single()
    );
  },

  /** Lấy 1 nhóm theo slug (dùng cho shop routing) */
  async getBySlug(slug) {
    return handleResponse(
      await supabase
        .from("upload_groups")
        .select("*")
        .eq("slug", slug)
        .maybeSingle()
    );
  },

  async create(body) {
    return handleResponse(
      await supabase.from("upload_groups").insert([body]).select().single()
    );
  },

  async update(id, body) {
    return handleResponse(
      await supabase.from("upload_groups").update(body).eq("id", id).select().single()
    );
  },

  async remove(id) {
    return handleResponse(
      await supabase.from("upload_groups").delete().eq("id", id)
    );
  },

  /** Cây 2 cấp: [{ ...root, children: [...] }, ...] */
  async getTree() {
    const all = await this.getAll();
    const list = all.data || [];
    return list
      .filter((r) => !r.parent_id)
      .map((r) => ({ ...r, children: list.filter((c) => c.parent_id === r.id) }));
  },

  /** Đếm số video thuộc 1 nhóm (dùng cảnh báo trước khi xoá) */
  async countPosts(categoryId) {
    const { count, error } = await supabase
      .from("videos")
      .select("id", { count: "exact", head: true })
      .eq("group_id", categoryId);
    if (error) throw new Error(error.message);
    return count || 0;
  },
};

// ─────────────────────────────────────────────
// ─── About Content API (nội dung "Về Techtra", 1 dòng / group_id)
// Bảng cần tạo sẵn trên Supabase:
//   about_content (id uuid/int PK, group_id int UNIQUE, content text,
//                   updated_at timestamptz default now())
// UNIQUE(group_id) bắt buộc để upsert onConflict hoạt động đúng.
// ─────────────────────────────────────────────
export const aboutContentApi = {
  async get(groupId) {
    const { data, error } = await supabase
      .from("about_content")
      .select("content")
      .eq("group_id", groupId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { content: data?.content ?? "" };
  },

  async save(groupId, { content }) {
    const { data, error } = await supabase
      .from("about_content")
      .upsert(
        { group_id: groupId, content, updated_at: new Date().toISOString() },
        { onConflict: "group_id" }
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
};

// ─────────────────────────────────────────────
// ─── Video API (video "Giải trí", gắn theo group_id)
// Bảng cần tạo sẵn trên Supabase:
//   videos (id uuid/int PK, group_id int, title text, url text,
//            file_name text, file_size bigint, created_at timestamptz default now())
//
// Dùng lại bucket HOMEPAGE_BUCKET ("homepage-assets") đã khai báo sẵn ở đầu
// file api.js (đang chạy tốt cho upload ảnh/video/pdf trang chủ) — KHÔNG cần
// tạo/khai báo bucket riêng cho video, tránh lỗi "Bucket not found".
// ─────────────────────────────────────────────
export const videoApi = {
  async getAll(params = {}) {
    let q = supabase.from("videos").select("*").order("created_at", { ascending: false });
    if (params.group_id === null) {
      q = q.is("group_id", null);       // lọc video KHÔNG thuộc nhóm nào
    } else if (params.group_id) {
      q = q.eq("group_id", params.group_id);
    }
    return handleResponse(await q);
  },

  // form: FormData chứa "video" (File), "group_id", "title"
  async upload(form) {
    const file = form.get("video");
    const groupId = form.get("group_id");
    const title = form.get("title");
    if (!file) throw new Error("Thiếu file video");

    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const fileName = `videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(HOMEPAGE_BUCKET)
      .upload(fileName, file, { upsert: true, contentType: file.type || undefined });

    if (uploadError) {
      console.error("Supabase Storage upload error (video):", uploadError);
      throw new Error("Upload thất bại: " + uploadError.message);
    }

    const { data: pub } = supabase.storage
      .from(HOMEPAGE_BUCKET)
      .getPublicUrl(fileName);

    const { data, error } = await supabase
      .from("videos")
      .insert([{
        group_id: groupId || null,
        title: title || file.name,
        url: pub.publicUrl,
        file_name: file.name,
        file_size: file.size,
      }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async remove(id) {
    return handleResponse(
      await supabase.from("videos").delete().eq("id", id)
    );
  },
};