// // src/components/HomePage/HomePage.jsx
// // ─────────────────────────────────────────────────────────────────────────────
// // Quản lý trang chủ shop:
// //   1. Background (đổi màu, hình ảnh, video)
// //   2. Hero banner (ảnh + tiêu đề + CTA)
// //   3. Sections toggle (bật/tắt từng phần trên trang chủ — bao gồm cả
// //      "Slider banner đầu trang", không còn tab riêng để thêm slide)
// //   4. Brand values (4 thẻ giá trị) — CRUD riêng
// //   5. Danh mục nổi bật — tự động lấy TẤT CẢ sản phẩm, không cần cấu hình
// //   6. Flash sale — admin đặt % giảm giá + thời điểm kết thúc cho từng sản phẩm
// //                    (cột flash_sale_discount + flash_sale_end_at trong products).
// //                    Hết thời gian sẽ tự trả về giá gốc.
// //   7. Promo banners (2 banner nhỏ) — CRUD riêng theo vị trí
// //   8. Blog — CRUD riêng
// //   9. Articles (link/file) — CRUD riêng
// //
// // Lưu ý:
// // - Tab "Slider" (thêm/sửa/xóa từng slide) đã được BỎ HẲN. Slider banner đầu
// //   trang giờ chỉ còn nút bật/tắt trong tab "Bật/tắt phần" (key: heroSlider).
// // - Tab "Danh mục" đã bỏ vì danh mục lấy thẳng tất cả sản phẩm (sắp theo
// //   created_at desc).
// // - Tab "Flash sale" không dùng homepage_picks; admin chỉnh trực tiếp
// //   cột flash_sale_discount + flash_sale_end_at trên từng sản phẩm.
// // ─────────────────────────────────────────────────────────────────────────────

// import { useState, useEffect, useRef, useMemo, useCallback } from "react";
// import * as XLSX from "xlsx";
// import "./HomePage.css";
// import {
//   homepageApi,
//   homepageValuesApi,
//   homepagePromoBannersApi,
//   homepageBlogApi,
//   productsApi,
// } from "../../api";

// const CACHE_KEY = "homepage_config_cache";

// const DEFAULT_SECTIONS = {
//   heroSlider: true,
//   brandValues: true,
//   categories: true,
//   flashSale: true,
//   bestSellers: true,
//   promoBanners: true,
//   blog: true,
//   newsletter: true,
// };

// const DEFAULT_FLASH_SALE_CFG = {
//   title: "Giờ Vàng Deal Xịn",
//   enabled: true,
// };

// const DEFAULT_CONFIG = {
//   background: {
//     type: "color",
//     color: "#6a11cb",
//     imageUrl: "",
//     videoUrl: "",
//   },
//   hero: {
//     enabled: true,
//     imageUrl: "",
//     title: "Chào mừng đến với Techtra Shop",
//     subtitle: "Cửa hàng công nghệ — uy tín, chất lượng, giao hàng toàn quốc",
//     ctaText: "Khám phá ngay",
//     ctaLink: "/san-pham",
//   },
//   sections: DEFAULT_SECTIONS,
//   flashSale: DEFAULT_FLASH_SALE_CFG,
// };

// const TABS = [
//   { id: "background", label: "Background",  icon: "fas fa-palette" },
//   { id: "hero",       label: "Hero banner",  icon: "fas fa-image" },
//   { id: "sections",   label: "Bật/tắt phần", icon: "fas fa-toggle-on" },
//   { id: "values",     label: "Giá trị",      icon: "fas fa-seedling" },
//   { id: "flashsale",  label: "Flash sale",   icon: "fas fa-bolt" },
//   { id: "promo",      label: "Promo banner", icon: "fas fa-rectangle-ad" },
//   { id: "blog",       label: "Blog",         icon: "fas fa-newspaper" },
// ];
// // Lưu ý:
// //   - Tab "Slider" (thêm slide riêng lẻ) đã được lược bỏ hoàn toàn.
// //   - Tab "Danh mục" đã được lược bỏ — danh mục nổi bật lấy thẳng tất cả
// //     sản phẩm (created_at desc), không cần cấu hình từ admin.
// //   - Tab "Bài viết" (link/file tài liệu) đã được lược bỏ — quản lý bài viết
// //     chuyển sang trang "Bài viết / Đọc báo" riêng trong sidebar.

// // ─── Helpers ────────────────────────────────────────────────────────────────
// function readCache() {
//   try {
//     const raw = localStorage.getItem(CACHE_KEY);
//     if (!raw) return null;
//     const parsed = JSON.parse(raw);
//     return {
//       background: { ...DEFAULT_CONFIG.background, ...(parsed.background || {}) },
//       hero:       { ...DEFAULT_CONFIG.hero,       ...(parsed.hero || {}) },
//       sections:   { ...DEFAULT_SECTIONS,          ...(parsed.sections || {}) },
//       flashSale:  { ...DEFAULT_FLASH_SALE_CFG,    ...(parsed.flashSale || {}) },
//     };
//   } catch { return null; }
// }
// function writeCache(cfg) {
//   try { localStorage.setItem(CACHE_KEY, JSON.stringify(cfg)); } catch {}
// }

// function isImageFile(file) { return file?.type?.startsWith("image/"); }
// function isVideoFile(file) { return file?.type?.startsWith("video/"); }
// function isDocFile(file) {
//   if (!file) return false;
//   const name = (file.name || "").toLowerCase();
//   return (
//     file.type === "application/pdf" ||
//     file.type.includes("officedocument") ||
//     name.endsWith(".pdf") || name.endsWith(".doc") || name.endsWith(".docx")
//   );
// }

// // Format từ DB → state FE
// const mapValueFromDb = (r) => ({ id: r.id, icon: r.icon, title: r.title, desc: r.desc || "", sortOrder: r.sort_order, enabled: r.enabled });
// const mapPromoFromDb = (r) => ({ id: r.id, position: r.position, tag: r.tag || "", title: r.title, imageUrl: r.image_url, ctaText: r.cta_text, ctaLink: r.cta_link, sortOrder: r.sort_order, enabled: r.enabled });
// const mapBlogFromDb  = (r) => ({ id: r.id, title: r.title, desc: r.desc || "", author: r.author, imageUrl: r.image_url, link: r.link, sortOrder: r.sort_order, enabled: r.enabled });

// // ─── Section: Background ────────────────────────────────────────────────────
// function BackgroundSection({ config, onChange, onUploadFile }) {
//   const bg     = config.background;
//   const fileRef = useRef(null);
//   const [error, setError] = useState("");
//   const [busy,  setBusy]  = useState(false);

//   const handleFile = async (e) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     setError("");
//     if (bg.type === "image" && !isImageFile(file)) { setError("Vui lòng chọn file hình ảnh (JPG, PNG, WebP...)"); return; }
//     if (bg.type === "video" && !isVideoFile(file)) { setError("Vui lòng chọn file video (MP4, WebM...)"); return; }
//     setBusy(true);
//     try {
//       const subfolder = bg.type === "image" ? "background/image" : "background/video";
//       const result = await onUploadFile(file, subfolder);
//       if (bg.type === "image") onChange({ ...bg, imageUrl: result.url });
//       else                     onChange({ ...bg, videoUrl: result.url });
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setBusy(false);
//       if (fileRef.current) fileRef.current.value = "";
//     }
//   };

//   return (
//     <div className="hp-card">
//       <h3 className="hp-card-title">Background trang chủ</h3>
//       <p className="hp-card-desc">Đổi màu nền, dùng hình ảnh hoặc video làm nền cho toàn trang chủ shop.</p>

//       <div className="hp-type-tabs">
//         {[
//           { id: "color", label: "Màu sắc", icon: "fas fa-fill-drip" },
//           { id: "image", label: "Hình ảnh", icon: "fas fa-image" },
//           { id: "video", label: "Video",    icon: "fas fa-video" },
//         ].map((t) => (
//           <button
//             key={t.id}
//             type="button"
//             className={`hp-type-tab ${bg.type === t.id ? "active" : ""}`}
//             onClick={() => onChange({ ...bg, type: t.id })}
//           >
//             <i className={t.icon} /> {t.label}
//           </button>
//         ))}
//       </div>

//       {bg.type === "color" && (
//         <div className="hp-color-row">
//           <input type="color" value={bg.color} onChange={(e) => onChange({ ...bg, color: e.target.value })} />
//           <input type="text" value={bg.color} onChange={(e) => onChange({ ...bg, color: e.target.value })} placeholder="#6a11cb" />
//           <div className="hp-color-presets">
//             {["#6a11cb", "#2575fc", "#0f172a", "#10b981", "#f59e0b", "#dc2626", "#ffffff", "#000000"].map((c) => (
//               <button key={c} type="button" className="hp-preset" style={{ background: c }} onClick={() => onChange({ ...bg, color: c })} title={c} />
//             ))}
//           </div>
//         </div>
//       )}

//       {bg.type === "image" && (
//         <div className="hp-upload-row">
//           <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
//           <button type="button" className="hp-btn hp-btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
//             <i className="fas fa-upload" /> {busy ? "Đang xử lý..." : (bg.imageUrl ? "Đổi hình nền" : "Tải hình nền")}
//           </button>
//           {bg.imageUrl && (
//             <button type="button" className="hp-btn hp-btn-ghost" onClick={() => onChange({ ...bg, imageUrl: "" })}>
//               <i className="fas fa-trash" /> Xóa
//             </button>
//           )}
//           {bg.imageUrl && <div className="hp-preview"><img src={bg.imageUrl} alt="preview" /></div>}
//         </div>
//       )}

//       {bg.type === "video" && (
//         <div className="hp-upload-row">
//           <input ref={fileRef} type="file" accept="video/*" onChange={handleFile} hidden />
//           <button type="button" className="hp-btn hp-btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
//             <i className="fas fa-upload" /> {busy ? "Đang xử lý..." : (bg.videoUrl ? "Đổi video" : "Tải video nền")}
//           </button>
//           {bg.videoUrl && (
//             <button type="button" className="hp-btn hp-btn-ghost" onClick={() => onChange({ ...bg, videoUrl: "" })}>
//               <i className="fas fa-trash" /> Xóa
//             </button>
//           )}
//           {bg.videoUrl && <div className="hp-preview"><video src={bg.videoUrl} autoPlay muted loop playsInline /></div>}
//         </div>
//       )}

//       {error && <div className="hp-alert hp-alert-error">⚠️ {error}</div>}

//       <div className="hp-tips">
//         <strong>Mẹo:</strong> Nên dùng ảnh ngang (1920×1080) cho hình nền; video nên dưới 10s, tắt tiếng, lặp lại.
//       </div>
//     </div>
//   );
// }

// // ─── Section: Hero ──────────────────────────────────────────────────────────
// function HeroSection({ config, onChange, onUploadFile }) {
//   const hero    = config.hero;
//   const fileRef = useRef(null);
//   const [error, setError] = useState("");
//   const [busy,  setBusy]  = useState(false);

//   const handleFile = async (e) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     setError("");
//     if (!isImageFile(file)) { setError("Vui lòng chọn file hình ảnh"); return; }
//     setBusy(true);
//     try {
//       const result = await onUploadFile(file, "hero/image");
//       onChange({ ...hero, imageUrl: result.url });
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setBusy(false);
//       if (fileRef.current) fileRef.current.value = "";
//     }
//   };

//   return (
//     <div className="hp-card">
//       <h3 className="hp-card-title">Hero banner (ảnh đầu trang)</h3>
//       <p className="hp-card-desc">Banner lớn hiện ngay đầu trang chủ shop với tiêu đề và nút bấm.</p>

//       <label className="hp-toggle">
//         <input type="checkbox" checked={hero.enabled} onChange={(e) => onChange({ ...hero, enabled: e.target.checked })} />
//         <span>Hiển thị hero banner</span>
//       </label>

//       <div className="hp-field">
//         <label>Ảnh banner</label>
//         <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
//         <div className="hp-upload-row">
//           <button type="button" className="hp-btn hp-btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
//             <i className="fas fa-upload" /> {busy ? "Đang xử lý..." : (hero.imageUrl ? "Đổi ảnh" : "Tải ảnh banner")}
//           </button>
//           {hero.imageUrl && (
//             <button type="button" className="hp-btn hp-btn-ghost" onClick={() => onChange({ ...hero, imageUrl: "" })}>
//               <i className="fas fa-trash" /> Xóa
//             </button>
//           )}
//         </div>
//         {hero.imageUrl && <div className="hp-preview"><img src={hero.imageUrl} alt="hero preview" /></div>}
//       </div>

//       <div className="hp-field">
//         <label>Tiêu đề</label>
//         <input type="text" value={hero.title} onChange={(e) => onChange({ ...hero, title: e.target.value })} placeholder="VD: Chào mừng đến với Techtra Shop" />
//       </div>

//       <div className="hp-field">
//         <label>Mô tả phụ</label>
//         <textarea rows={2} value={hero.subtitle} onChange={(e) => onChange({ ...hero, subtitle: e.target.value })} placeholder="Mô tả ngắn gọn..." />
//       </div>

//       <div className="hp-grid-2">
//         <div className="hp-field">
//           <label>Chữ trên nút bấm (CTA)</label>
//           <input type="text" value={hero.ctaText} onChange={(e) => onChange({ ...hero, ctaText: e.target.value })} placeholder="VD: Mua ngay" />
//         </div>
//         <div className="hp-field">
//           <label>Liên kết nút bấm</label>
//           <input type="text" value={hero.ctaLink} onChange={(e) => onChange({ ...hero, ctaLink: e.target.value })} placeholder="/san-pham" />
//         </div>
//       </div>

//       {error && <div className="hp-alert hp-alert-error">⚠️ {error}</div>}

//       <div className="hp-hero-preview">
//         <div className="hp-hero-preview-label">Xem trước</div>
//         {hero.imageUrl ? (
//           <div className="hp-hero-preview-image" style={{ backgroundImage: `url(${hero.imageUrl})` }}>
//             <div className="hp-hero-preview-content">
//               <h2>{hero.title || "Tiêu đề hero"}</h2>
//               <p>{hero.subtitle || "Mô tả phụ"}</p>
//               {hero.ctaText && <button type="button">{hero.ctaText}</button>}
//             </div>
//           </div>
//         ) : (
//           <div className="hp-hero-preview-empty">Chưa có ảnh banner — tải ảnh lên để xem trước</div>
//         )}
//       </div>
//     </div>
//   );
// }

// // ─── Section: Sections toggle ───────────────────────────────────────────────
// // Đây là nơi DUY NHẤT còn liên quan tới "slider": chỉ có nút bật/tắt
// // (key: heroSlider), không còn màn hình thêm/sửa/xóa từng slide riêng lẻ.
// const SECTION_LIST = [
//   { key: "heroSlider",   label: "Slider banner đầu trang" },
//   { key: "brandValues",  label: "4 giá trị thương hiệu" },
//   { key: "categories",   label: "Danh mục nổi bật" },
//   { key: "flashSale",    label: "Flash sale" },
//   { key: "bestSellers",  label: "Sản phẩm bán chạy" },
//   { key: "promoBanners", label: "2 banner quảng cáo nhỏ" },
//   { key: "blog",         label: "Góc chia sẻ / Blog" },
//   { key: "newsletter",   label: "Đăng ký nhận tin" },
// ];
// function SectionsToggleSection({ sections, onChange }) {
//   return (
//     <div className="hp-card">
//       <h3 className="hp-card-title">Bật / tắt các phần trên trang chủ</h3>
//       <p className="hp-card-desc">Tắt những phần bạn không muốn hiển thị trên trang chủ shop. Thay đổi được lưu tự động.</p>
//       <div className="hp-sections-grid">
//         {SECTION_LIST.map((s) => (
//           <label key={s.key} className="hp-section-toggle">
//             <input
//               type="checkbox"
//               checked={!!sections[s.key]}
//               onChange={(e) => onChange({ ...sections, [s.key]: e.target.checked })}
//             />
//             <span>{s.label}</span>
//           </label>
//         ))}
//       </div>
//     </div>
//   );
// }

// // ─── Section: Flash Sale (quản lý trực tiếp trên products) ─────────────────
// // Tab này KHÔNG dùng homepage_picks nữa. Admin chỉnh % giảm và thời điểm kết
// // thúc cho từng sản phẩm; SP có flash_sale_discount > 0 sẽ tự hiện trên FE
// // (lọc thêm theo flash_sale_end_at). Hết hạn → tự trả về giá gốc.
// function FlashSaleSection({ cfg, onSaveCfg, allProducts, onUpdateProduct }) {
//   const [draftCfg, setDraftCfg] = useState(DEFAULT_FLASH_SALE_CFG);
//   const [editingId, setEditingId] = useState(null);
//   const [draft, setDraft]       = useState({ flash_sale_discount: "", flash_sale_end_at: "" });
//   const [busy, setBusy]         = useState(false);
//   const [error, setError]       = useState("");
//   const [search, setSearch]     = useState("");
//   const [filter, setFilter]     = useState("all"); // 'all' | 'active' | 'expired' | 'none'

//   // ─── Bulk sale: chọn nhiều SP, set % giảm + thời gian kết thúc chung ─────
//   const [selected, setSelected]           = useState(new Set());     // id SP đang chọn
//   const [bulkEditing, setBulkEditing]     = useState(false);         // bật/tắt panel bulk
//   const [bulkDraft, setBulkDraft]         = useState({ discount: "", endAt: "" });
//   const [bulkError, setBulkError]         = useState("");

//   // ─── Excel import: upload file .xlsx/.csv cột SKU + discount + end_at ─────
//   // rows: mảng các dòng đã parse; mỗi dòng kèm {status, reason, product, isValid}
//   const [excelModal, setExcelModal]       = useState(false);         // mở/đóng modal
//   const [excelRows,  setExcelRows]        = useState([]);            // preview rows
//   const [excelStats, setExcelStats]       = useState({ total: 0, valid: 0, invalid: 0 });
//   const [excelBusy,  setExcelBusy]        = useState(false);
//   const [excelError, setExcelError]       = useState("");
//   const excelFileRef = useRef(null);
//   // Reset selection khi filter/search đổi (tránh chọn nhầm SP ở tab khác)
//   useEffect(() => { setSelected(new Set()); }, [filter, search]);

//   useEffect(() => {
//     if (cfg) setDraftCfg({
//       title: cfg.title || DEFAULT_FLASH_SALE_CFG.title,
//       enabled: cfg.enabled !== false,
//     });
//   }, [cfg]);

//   const saveCfg = async () => {
//     setBusy(true);
//     try { await onSaveCfg(draftCfg); }
//     catch (err) { setError(err.message); }
//     finally { setBusy(false); }
//   };

//   const startEdit = (p) => {
//     setEditingId(p.id);
//     // Chuẩn hoá end_at → input datetime-local (YYYY-MM-DDTHH:mm)
//     let endAtLocal = "";
//     if (p.flash_sale_end_at) {
//       try {
//         const d = new Date(p.flash_sale_end_at);
//         if (!Number.isNaN(d.getTime())) {
//           const pad = (n) => String(n).padStart(2, "0");
//           endAtLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
//         }
//       } catch { /* ignore */ }
//     }
//     setDraft({
//       flash_sale_discount: p.flash_sale_discount != null ? String(p.flash_sale_discount) : "",
//       flash_sale_end_at: endAtLocal,
//     });
//     setError("");
//   };
//   const cancel = () => { setEditingId(null); setError(""); };

//   const save = async () => {
//     setError("");
//     // Validate % giảm
//     let discountNum = null;
//     if (draft.flash_sale_discount !== "" && draft.flash_sale_discount !== null) {
//       const v = Number(draft.flash_sale_discount);
//       if (Number.isNaN(v) || v < 0 || v > 100) {
//         setError("% giảm phải là số từ 0 đến 100");
//         return;
//       }
//       discountNum = v;
//     }
//     // Convert datetime-local → ISO (giữ nguyên múi giờ local của admin)
//     let endAtIso = null;
//     if (draft.flash_sale_end_at) {
//       const d = new Date(draft.flash_sale_end_at);
//       if (Number.isNaN(d.getTime())) { setError("Thời điểm kết thúc không hợp lệ"); return; }
//       endAtIso = d.toISOString();
//     }
//     setBusy(true);
//     try {
//       await onUpdateProduct(editingId, {
//         flash_sale_discount: discountNum, // null = rời khỏi flash sale
//         flash_sale_end_at:   endAtIso,
//       });
//       cancel();
//     } catch (err) { setError(err.message); }
//     finally { setBusy(false); }
//   };

//   const remove = async (p) => {
//     if (!window.confirm(`Bỏ "${p.name}" khỏi Flash Sale?`)) return;
//     setBusy(true);
//     try {
//       await onUpdateProduct(p.id, { flash_sale_discount: null, flash_sale_end_at: null });
//     } catch (err) { setError(err.message); }
//     finally { setBusy(false); }
//   };

//   // ─── Bulk: chọn nhiều SP rồi set % giảm + thời gian kết thúc chung ─────
//   const toggleSelect = (id) => {
//     setSelected((prev) => {
//       const next = new Set(prev);
//       if (next.has(id)) next.delete(id); else next.add(id);
//       return next;
//     });
//   };
//   const toggleSelectAllVisible = () => {
//     setSelected((prev) => {
//       const ids = visible.map((p) => p.id);
//       const allOn = ids.every((id) => prev.has(id));
//       const next = new Set(prev);
//       if (allOn) ids.forEach((id) => next.delete(id));
//       else       ids.forEach((id) => next.add(id));
//       return next;
//     });
//   };
//   const openBulk = () => {
//     if (selected.size === 0) return;
//     setBulkError("");
//     setBulkDraft({ discount: "", endAt: "" });
//     setBulkEditing(true);
//   };
//   const cancelBulk = () => { setBulkEditing(false); setBulkError(""); };
//   const applyBulk = async () => {
//     setBulkError("");
//     let discountNum = null;
//     if (bulkDraft.discount !== "" && bulkDraft.discount !== null) {
//       const v = Number(bulkDraft.discount);
//       if (Number.isNaN(v) || v < 0 || v > 100) {
//         setBulkError("% giảm phải là số từ 0 đến 100");
//         return;
//       }
//       discountNum = v;
//     }
//     let endAtIso = null;
//     if (bulkDraft.endAt) {
//       const d = new Date(bulkDraft.endAt);
//       if (Number.isNaN(d.getTime())) { setBulkError("Thời điểm kết thúc không hợp lệ"); return; }
//       endAtIso = d.toISOString();
//     }
//     if (discountNum === null && endAtIso === null) {
//       setBulkError("Vui lòng nhập ít nhất % giảm hoặc thời điểm kết thúc");
//       return;
//     }
//     setBusy(true);
//     try {
//       const ids = Array.from(selected);
//       // Gọi song song — mỗi SP 1 request update (đơn giản, không phải bulk SQL)
//       await Promise.all(ids.map((id) => onUpdateProduct(id, {
//         ...(discountNum !== null ? { flash_sale_discount: discountNum } : {}),
//         ...(endAtIso    !== null ? { flash_sale_end_at:   endAtIso   } : {}),
//       })));
//       cancelBulk();
//       setSelected(new Set());
//     } catch (err) { setBulkError(err.message); }
//     finally { setBusy(false); }
//   };

//   // ─── Excel import: parse file, validate theo SKU + is_active, preview trước khi lưu ─
//   // Chuẩn hoá key header (loại bỏ dấu, khoảng trắng) để map tên cột linh hoạt
//   const normKey = (s) => String(s || "").toLowerCase().trim()
//     .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
//   const COLUMN_HINTS = {
//     sku:      ["sku", "masp", "productcode", "product_code", "code"],
//     discount: ["discount", "giamgia", "phantramgiam", "sale", "percent", "phantram", "giamphantram"],
//     endAt:    ["endat", "enddate", "ngayketthuc", "thoigianketthuc", "expiresat", "expiry", "hethan"],
//   };
//   const findColumn = (headers, hints) => {
//     for (const h of headers) {
//       const k = normKey(h);
//       if (hints.some((hint) => k === hint || k.includes(hint))) return h;
//     }
//     return null;
//   };
//   // Chuẩn hoá ngày: chấp nhận Date, "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DDTHH:mm", số serial Excel
//   const parseEndAt = (raw) => {
//     if (raw == null || raw === "") return null;
//     if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw.toISOString();
//     if (typeof raw === "number") {
//       // Excel serial date: số ngày từ 1899-12-30
//       const ms = (raw - 25569) * 86400 * 1000;
//       const d = new Date(ms);
//       return Number.isNaN(d.getTime()) ? null : d.toISOString();
//     }
//     const s = String(raw).trim();
//     if (!s) return null;
//     const d = new Date(s);
//     if (!Number.isNaN(d.getTime())) return d.toISOString();
//     // Thử format "YYYY-MM-DD HH:mm:ss" nếu có dấu cách
//     const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
//     if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || "00"}`).toISOString();
//     return null;
//   };

//   const openExcelModal = () => {
//     setExcelModal(true);
//     setExcelRows([]);
//     setExcelStats({ total: 0, valid: 0, invalid: 0 });
//     setExcelError("");
//     if (excelFileRef.current) excelFileRef.current.value = "";
//   };
//   const closeExcelModal = () => {
//     if (excelBusy) return;
//     setExcelModal(false);
//     setExcelRows([]);
//     setExcelError("");
//   };

//   const handleExcelFile = async (e) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     setExcelError("");
//     setExcelBusy(true);
//     setExcelRows([]);
//     try {
//       const buf = await file.arrayBuffer();
//       const wb  = XLSX.read(buf, { type: "array", cellDates: true });
//       const ws  = wb.Sheets[wb.SheetNames[0]];
//       if (!ws) throw new Error("File Excel không có sheet nào");

//       // Lấy dữ liệu dạng object (header row đầu tiên)
//       const raw = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });
//       if (!raw.length) throw new Error("File không có dữ liệu");

//       const headers = Object.keys(raw[0]);
//       const skuCol      = findColumn(headers, COLUMN_HINTS.sku);
//       const discountCol = findColumn(headers, COLUMN_HINTS.discount);
//       const endAtCol    = findColumn(headers, COLUMN_HINTS.endAt);

//       if (!skuCol)      throw new Error("Không tìm thấy cột SKU (tên cột: sku, ma_sp, product_code…)");
//       if (!discountCol) throw new Error("Không tìm thấy cột % giảm (tên cột: discount, giam_gia, phan_tram…)");
//       // endAt là tuỳ chọn — nếu không có thì end_at = null (không giới hạn)

//       // Index products theo SKU để tra nhanh
//       const skuMap = new Map();
//       allProducts.forEach((p) => {
//         if (p.sku) skuMap.set(String(p.sku).trim().toLowerCase(), p);
//       });

//       const rows = raw.map((r, idx) => {
//         const rowNo      = idx + 2; // Excel row (bỏ header)
//         const sku        = String(r[skuCol] ?? "").trim();
//         const discountRaw = r[discountCol];
//         const endAtRaw   = endAtCol ? r[endAtCol] : "";

//         // Validate
//         if (!sku) {
//           return { rowNo, sku, discount: discountRaw, endAt: endAtRaw, product: null,
//                    isValid: false, reason: "Thiếu SKU" };
//         }
//         const product = skuMap.get(sku.toLowerCase());
//         if (!product) {
//           return { rowNo, sku, discount: discountRaw, endAt: endAtRaw, product: null,
//                    isValid: false, reason: "Không tìm thấy SP có SKU này" };
//         }
//         if (!product.is_active) {
//           return { rowNo, sku, discount: discountRaw, endAt: endAtRaw, product,
//                    isValid: false, reason: "SP đang ẩn (không trên kệ) — không thể sale" };
//         }
//         const discNum = Number(discountRaw);
//         if (Number.isNaN(discNum) || discNum < 0 || discNum > 100) {
//           return { rowNo, sku, discount: discountRaw, endAt: endAtRaw, product,
//                    isValid: false, reason: "% giảm phải là số 0–100" };
//         }
//         let endAtIso = null;
//         if (endAtRaw !== "" && endAtRaw !== null) {
//           endAtIso = parseEndAt(endAtRaw);
//           if (endAtRaw !== "" && endAtIso === null) {
//             return { rowNo, sku, discount: discountRaw, endAt: endAtRaw, product,
//                      isValid: false, reason: "Ngày kết thúc không hợp lệ" };
//           }
//         }
//         return { rowNo, sku, discount: discNum, endAt: endAtRaw, endAtIso, product,
//                  isValid: true, reason: "" };
//       });

//       const valid   = rows.filter((r) => r.isValid).length;
//       const invalid = rows.length - valid;
//       setExcelRows(rows);
//       setExcelStats({ total: rows.length, valid, invalid });
//     } catch (err) {
//       setExcelError(err.message || "Không đọc được file Excel");
//     } finally {
//       setExcelBusy(false);
//       if (excelFileRef.current) excelFileRef.current.value = "";
//     }
//   };

//   const downloadExcelTemplate = () => {
//     // Tạo file mẫu gồm 3 cột SKU + % giảm + Ngày kết thúc
//     const sample = [
//       { SKU: "SP-001", "Phan tram giam (%)": 30, "Ngay ket thuc": "2026-12-31 23:59:00" },
//       { SKU: "SP-002", "Phan tram giam (%)": 20, "Ngay ket thuc": "" },
//     ];
//     const ws = XLSX.utils.aoa_to_sheet([
//       ["SKU", "Phan tram giam (%)", "Ngay ket thuc"],
//       ...sample.map((r) => [r.SKU, r["Phan tram giam (%)"], r["Ngay ket thuc"]]),
//     ]);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "FlashSale");
//     XLSX.writeFile(wb, "mau-flash-sale.xlsx");
//   };

//   const applyExcelImport = async () => {
//     const validRows = excelRows.filter((r) => r.isValid);
//     if (!validRows.length) return;
//     if (!window.confirm(`Áp dụng Flash Sale cho ${validRows.length} sản phẩm?`)) return;
//     setExcelBusy(true);
//     try {
//       await Promise.all(validRows.map((r) => onUpdateProduct(r.product.id, {
//         flash_sale_discount: r.discount,
//         flash_sale_end_at:   r.endAtIso || null,
//       })));
//       closeExcelModal();
//     } catch (err) {
//       setExcelError("Lỗi áp dụng: " + err.message);
//     } finally {
//       setExcelBusy(false);
//     }
//   };

//   // Lọc & đánh dấu
//   const now = Date.now();
//   const decorated = allProducts.map((p) => {
//     const disc = Number(p.flash_sale_discount);
//     const hasDiscount = !Number.isNaN(disc) && disc > 0;
//     const endTs = p.flash_sale_end_at ? new Date(p.flash_sale_end_at).getTime() : null;
//     const isExpired = hasDiscount && endTs !== null && endTs <= now;
//     const isActive  = hasDiscount && !isExpired;
//     return { ...p, _hasDiscount: hasDiscount, _isActive: isActive, _isExpired: isExpired };
//   });

//   let visible = decorated;
//   if (filter === "active")   visible = visible.filter((p) => p._isActive);
//   if (filter === "expired")  visible = visible.filter((p) => p._isExpired);
//   if (filter === "none")     visible = visible.filter((p) => !p._hasDiscount);
//   if (search.trim()) {
//     const s = search.toLowerCase();
//     visible = visible.filter((p) => (p.name || "").toLowerCase().includes(s));
//   }
//   // Đưa SP đang active lên đầu
//   visible.sort((a, b) => Number(b._isActive) - Number(a._isActive));

//   const counts = {
//     active:  decorated.filter((p) => p._isActive).length,
//     expired: decorated.filter((p) => p._isExpired).length,
//     none:    decorated.filter((p) => !p._hasDiscount).length,
//   };

//   return (
//     <div className="hp-card">
//       <h3 className="hp-card-title">Flash sale</h3>
//       <p className="hp-card-desc">
//         Chỉnh <strong>% giảm</strong> và <strong>thời điểm kết thúc</strong> trực tiếp trên từng sản phẩm. Sản phẩm có
//         <code> flash_sale_discount &gt; 0</code> sẽ tự hiển thị trên trang chủ (giá hiển thị = <code>price × (1 − discount/100)</code>).
//         Hết thời gian sẽ tự trả về giá gốc.
//       </p>

//       <div className="hp-field" style={{ marginBottom: 16, maxWidth: 480 }}>
//         <label>Tiêu đề</label>
//         <input type="text" value={draftCfg.title} onChange={(e) => setDraftCfg({ ...draftCfg, title: e.target.value })} />
//       </div>
//       <label className="hp-toggle">
//         <input type="checkbox" checked={draftCfg.enabled} onChange={(e) => setDraftCfg({ ...draftCfg, enabled: e.target.checked })} />
//         <span>Hiển thị flash sale</span>
//       </label>
//       <div className="hp-form-actions">
//         <button type="button" className="hp-btn hp-btn-primary" onClick={saveCfg} disabled={busy}>{busy ? "Đang lưu..." : "Lưu cấu hình"}</button>
//       </div>

//       <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #e2e8f0" }} />

//       <div className="hp-card-head">
//         <div>
//           <h3 className="hp-card-title" style={{ fontSize: 14 }}>Sản phẩm trong Flash Sale</h3>
//           <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
//             Đang active: <strong style={{ color: "#dc2626" }}>{counts.active}</strong> ·
//             Hết hạn: <strong>{counts.expired}</strong> ·
//             Chưa tham gia: <strong>{counts.none}</strong>
//           </div>
//         </div>
//       </div>

//       <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap", alignItems: "center" }}>
//         {[
//           { id: "all",     label: `Tất cả (${decorated.length})` },
//           { id: "active",  label: `Đang active (${counts.active})` },
//           { id: "expired", label: `Hết hạn (${counts.expired})` },
//           { id: "none",    label: `Chưa tham gia (${counts.none})` },
//         ].map((t) => (
//           <button
//             key={t.id}
//             type="button"
//             className={`hp-type-tab ${filter === t.id ? "active" : ""}`}
//             onClick={() => setFilter(t.id)}
//           >
//             {t.label}
//           </button>
//         ))}
//         <div style={{ flex: 1 }} />
//         <button type="button" className="hp-btn hp-btn-secondary" onClick={downloadExcelTemplate} title="Tải file Excel mẫu gồm 3 cột: SKU, % giảm, Ngày kết thúc">
//           <i className="fas fa-download" /> Tải mẫu Excel
//         </button>
//         <button type="button" className="hp-btn hp-btn-primary" onClick={openExcelModal}>
//           <i className="fas fa-file-excel" /> Upload bảng giá sale
//         </button>
//       </div>

//       <div className="hp-field">
//         <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên sản phẩm..." />
//       </div>

//       {error && <div className="hp-alert hp-alert-error" style={{ marginTop: 12 }}>⚠️ {error}</div>}

//       {editingId && (
//         <div className="hp-article-form">
//           <div className="hp-grid-2">
//             <div className="hp-field">
//               <label>% giảm (0–100, để trống = rời flash sale)</label>
//               <input
//                 type="number" min={0} max={100} step="0.01"
//                 value={draft.flash_sale_discount}
//                 onChange={(e) => setDraft({ ...draft, flash_sale_discount: e.target.value })}
//                 placeholder="VD: 30"
//               />
//             </div>
//             <div className="hp-field">
//               <label>Thời điểm kết thúc (để trống = không giới hạn)</label>
//               <input
//                 type="datetime-local"
//                 value={draft.flash_sale_end_at}
//                 onChange={(e) => setDraft({ ...draft, flash_sale_end_at: e.target.value })}
//               />
//             </div>
//           </div>
//           <div className="hp-form-actions">
//             <button type="button" className="hp-btn hp-btn-ghost" onClick={cancel}>Hủy</button>
//             <button type="button" className="hp-btn hp-btn-primary" onClick={save} disabled={busy}>{busy ? "Đang lưu..." : "Lưu"}</button>
//           </div>
//         </div>
//       )}

//       {bulkEditing && (
//         <div className="hp-article-form" style={{ borderColor: "#2563eb", background: "#eff6ff" }}>
//           <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "#1d4ed8" }}>
//             <i className="fas fa-bolt" /> Áp dụng Flash Sale cho {selected.size} sản phẩm
//           </h4>
//           <div className="hp-grid-2">
//             <div className="hp-field">
//               <label>% giảm (0–100, để trống = giữ nguyên)</label>
//               <input
//                 type="number" min={0} max={100} step="0.01"
//                 value={bulkDraft.discount}
//                 onChange={(e) => setBulkDraft({ ...bulkDraft, discount: e.target.value })}
//                 placeholder="VD: 30"
//               />
//             </div>
//             <div className="hp-field">
//               <label>Thời điểm kết thúc (để trống = giữ nguyên)</label>
//               <input
//                 type="datetime-local"
//                 value={bulkDraft.endAt}
//                 onChange={(e) => setBulkDraft({ ...bulkDraft, endAt: e.target.value })}
//               />
//             </div>
//           </div>
//           {bulkError && <div className="hp-alert hp-alert-error">⚠️ {bulkError}</div>}
//           <div className="hp-form-actions">
//             <button type="button" className="hp-btn hp-btn-ghost" onClick={cancelBulk} disabled={busy}>Hủy</button>
//             <button type="button" className="hp-btn hp-btn-primary" onClick={applyBulk} disabled={busy || selected.size === 0}>
//               {busy ? "Đang lưu..." : `Áp dụng cho ${selected.size} sản phẩm`}
//             </button>
//           </div>
//         </div>
//       )}

//       {visible.length === 0 ? (
//         <div className="hp-empty"><i className="fas fa-bolt" /><p>Không có sản phẩm nào khớp bộ lọc.</p></div>
//       ) : (
//         <>
//         {/* ─── Bulk action bar (chỉ hiện khi có chọn) ─── */}
//         <div style={{
//           display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
//           padding: "10px 14px", margin: "10px 0",
//           background: selected.size > 0 ? "#eff6ff" : "transparent",
//           border: selected.size > 0 ? "1px solid #93c5fd" : "1px dashed #e2e8f0",
//           borderRadius: 8, transition: "all 0.15s",
//         }}>
//           <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151" }}>
//             <input
//               type="checkbox"
//               checked={visible.length > 0 && visible.every((p) => selected.has(p.id))}
//               onChange={toggleSelectAllVisible}
//             />
//             <span>
//               {selected.size > 0
//                 ? <>Đã chọn <strong style={{ color: "#1d4ed8" }}>{selected.size}</strong> / {visible.length} sản phẩm</>
//                 : "Chọn nhiều sản phẩm để áp dụng Flash Sale hàng loạt"}
//             </span>
//           </label>
//           <div style={{ display: "flex", gap: 6 }}>
//             {selected.size > 0 && (
//               <button type="button" className="hp-btn hp-btn-ghost" onClick={() => setSelected(new Set())}>
//                 Bỏ chọn
//               </button>
//             )}
//             <button
//               type="button"
//               className="hp-btn hp-btn-primary"
//               onClick={openBulk}
//               disabled={selected.size === 0 || bulkEditing}
//             >
//               <i className="fas fa-bolt" /> Áp dụng cho {selected.size} SP
//             </button>
//           </div>
//         </div>

//         <div className="hp-article-list">
//           {visible.map((p) => {
//             const originalPrice = Number(p.price) || 0;
//             const disc = Number(p.flash_sale_discount) || 0;
//             const newPrice = disc > 0 ? Math.round(originalPrice * (1 - disc / 100)) : originalPrice;
//             const isSelected = selected.has(p.id);
//             return (
//               <div key={p.id} className="hp-article-item" style={{ background: isSelected ? "#eff6ff" : undefined, borderColor: isSelected ? "#93c5fd" : undefined }}>
//                 <label style={{ display: "flex", alignItems: "center", padding: "0 8px", cursor: "pointer" }}>
//                   <input
//                     type="checkbox"
//                     checked={isSelected}
//                     onChange={() => toggleSelect(p.id)}
//                   />
//                 </label>
//                 <div style={{ width: 50, height: 50, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#f1f5f9" }}>
//                   {(p.image_url || p.image) && <img src={p.image_url || p.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
//                 </div>
//                 <div className="hp-article-info">
//                   <div className="hp-article-title">{p.name}</div>
//                   <div className="hp-article-meta">
//                     {p._isActive && (
//                       <>
//                         <strong style={{ color: "#dc2626" }}>{newPrice.toLocaleString("vi-VN")} đ</strong>
//                         {disc > 0 && <span style={{ textDecoration: "line-through", marginLeft: 4 }}>{originalPrice.toLocaleString("vi-VN")} đ</span>}
//                         <span style={{ marginLeft: 6, color: "#059669" }}>· -{disc}%</span>
//                         {p.flash_sale_end_at && (
//                           <span style={{ marginLeft: 6, color: "#64748b" }}>
//                             · đến {new Date(p.flash_sale_end_at).toLocaleString("vi-VN")}
//                           </span>
//                         )}
//                       </>
//                     )}
//                     {p._isExpired && (
//                       <span style={{ color: "#94a3b8" }}>Đã hết hạn — sẽ hiển thị giá gốc {originalPrice.toLocaleString("vi-VN")} đ</span>
//                     )}
//                     {!p._hasDiscount && (
//                       <span style={{ color: "#94a3b8" }}>Chưa tham gia flash sale · {originalPrice.toLocaleString("vi-VN")} đ</span>
//                     )}
//                   </div>
//                 </div>
//                 <div className="hp-article-actions">
//                   {p._isActive && <span style={{ alignSelf: "center", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#dcfce7", color: "#16a34a" }}>ĐANG CHẠY</span>}
//                   {p._isExpired && <span style={{ alignSelf: "center", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#fef3c7", color: "#d97706" }}>HẾT HẠN</span>}
//                   <button type="button" className="hp-btn hp-btn-ghost" onClick={() => startEdit(p)}><i className="fas fa-edit" /> Sửa</button>
//                   {p._hasDiscount && (
//                     <button type="button" className="hp-btn hp-btn-danger" onClick={() => remove(p)} disabled={busy}>
//                       <i className="fas fa-trash" /> Bỏ
//                     </button>
//                   )}
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//         </>
//       )}

//       {/* ─── Modal: Upload Excel Flash Sale ─── */}
//       {excelModal && (
//         <div className="hp-modal-overlay" onClick={closeExcelModal}>
//           <div className="hp-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 920, width: "95%" }}>
//             <div className="hp-modal-header">
//               <h3 style={{ margin: 0, fontSize: 17 }}>
//                 <i className="fas fa-file-excel" /> Upload bảng giá Flash Sale
//               </h3>
//               <button type="button" className="hp-modal-close" onClick={closeExcelModal} disabled={excelBusy}>×</button>
//             </div>
//             <div className="hp-modal-body">
//               <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px" }}>
//                 File Excel gồm 3 cột: <strong>SKU</strong>, <strong>% giảm</strong> (0–100), <strong>Ngày kết thúc</strong> (để trống = không giới hạn).
//                 Chỉ chấp nhận <strong>sản phẩm đang trên kệ</strong> (is_active = true).
//                 <a href="#" onClick={(e) => { e.preventDefault(); downloadExcelTemplate(); }} style={{ marginLeft: 8 }}>
//                   Tải file mẫu
//                 </a>
//               </p>

//               <input
//                 ref={excelFileRef}
//                 type="file"
//                 accept=".xlsx,.xls,.csv"
//                 onChange={handleExcelFile}
//                 style={{ display: "none" }}
//               />
//               <button
//                 type="button"
//                 className="hp-btn hp-btn-secondary"
//                 onClick={() => excelFileRef.current?.click()}
//                 disabled={excelBusy}
//                 style={{ marginBottom: 12 }}
//               >
//                 <i className="fas fa-upload" /> {excelBusy ? "Đang đọc file..." : "Chọn file Excel"}
//               </button>

//               {excelError && (
//                 <div className="hp-alert hp-alert-error">⚠️ {excelError}</div>
//               )}

//               {excelRows.length > 0 && (
//                 <>
//                   <div style={{ display: "flex", gap: 12, margin: "12px 0", fontSize: 13 }}>
//                     <span><strong>Tổng:</strong> {excelStats.total}</span>
//                     <span style={{ color: "#16a34a" }}><strong>Hợp lệ:</strong> {excelStats.valid}</span>
//                     <span style={{ color: "#dc2626" }}><strong>Bỏ qua:</strong> {excelStats.invalid}</span>
//                   </div>
//                   <div style={{ maxHeight: 360, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
//                     <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
//                       <thead style={{ position: "sticky", top: 0, background: "#f9fafb" }}>
//                         <tr>
//                           <th style={th}>Dòng</th>
//                           <th style={th}>SKU</th>
//                           <th style={th}>Tên SP</th>
//                           <th style={th}>% giảm</th>
//                           <th style={th}>Ngày kết thúc</th>
//                           <th style={th}>Trạng thái</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {excelRows.map((r) => (
//                           <tr key={r.rowNo} style={{ background: r.isValid ? "#f0fdf4" : "#fef2f2" }}>
//                             <td style={td}>{r.rowNo}</td>
//                             <td style={{ ...td, fontFamily: "monospace" }}>{r.sku || "—"}</td>
//                             <td style={td}>{r.product?.name || <em style={{ color: "#9ca3af" }}>không tìm thấy</em>}</td>
//                             <td style={td}>{String(r.discount ?? "—")}{r.isValid ? "%" : ""}</td>
//                             <td style={td}>{r.endAt ? String(r.endAt) : <em style={{ color: "#9ca3af" }}>không giới hạn</em>}</td>
//                             <td style={td}>
//                               {r.isValid
//                                 ? <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ Sẽ áp dụng</span>
//                                 : <span style={{ color: "#dc2626" }}>✗ {r.reason}</span>}
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 </>
//               )}
//             </div>
//             <div className="hp-modal-footer">
//               <button type="button" className="hp-btn hp-btn-ghost" onClick={closeExcelModal} disabled={excelBusy}>Đóng</button>
//               <button
//                 type="button"
//                 className="hp-btn hp-btn-primary"
//                 onClick={applyExcelImport}
//                 disabled={excelBusy || excelStats.valid === 0}
//               >
//                 {excelBusy ? "Đang áp dụng..." : `Áp dụng cho ${excelStats.valid} sản phẩm`}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // styles phụ cho bảng preview
// const th = { padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #e5e7eb", fontWeight: 600, color: "#374151", fontSize: 12 };
// const td = { padding: "8px 10px", borderBottom: "1px solid #f3f4f6", color: "#1f2937" };

// // ─── Section: Values (CRUD riêng, không liên quan tới products) ────────────
// function ValuesSection({ values, onCreate, onUpdate, onRemove }) {
//   const [editing, setEditing] = useState(null);
//   const [draft, setDraft]     = useState({ icon: "fas fa-seedling", title: "", desc: "", sortOrder: 0, enabled: true });
//   const [error, setError]     = useState("");

//   const startNew = () => { setEditing("new"); setDraft({ icon: "fas fa-seedling", title: "", desc: "", sortOrder: values.length, enabled: true }); setError(""); };
//   const startEdit = (v) => { setEditing(v.id); setDraft({ ...v }); setError(""); };
//   const cancel = () => { setEditing(null); setError(""); };

//   const save = async () => {
//     setError("");
//     if (!draft.title.trim()) { setError("Vui lòng nhập tiêu đề"); return; }
//     try {
//       if (editing === "new") await onCreate(draft);
//       else                   await onUpdate(editing, draft);
//       cancel();
//     } catch (err) { setError(err.message); }
//   };

//   return (
//     <div className="hp-card">
//       <div className="hp-card-head">
//         <div>
//           <h3 className="hp-card-title">Giá trị thương hiệu (Brand values)</h3>
//           <p className="hp-card-desc">4 thẻ giá trị hiển thị ngay dưới hero banner. Icon dùng class FontAwesome.</p>
//         </div>
//         <button type="button" className="hp-btn hp-btn-primary" onClick={startNew}>
//           <i className="fas fa-plus" /> Thêm giá trị
//         </button>
//       </div>

//       {editing && (
//         <div className="hp-article-form">
//           <div className="hp-field">
//             <label>Icon FontAwesome (VD: fas fa-seedling)</label>
//             <input type="text" value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} />
//             <small style={{ color: "#64748b" }}>Tham khảo: <a href="https://fontawesome.com/icons" target="_blank" rel="noreferrer">fontawesome.com/icons</a> (chọn Free, copy class)</small>
//           </div>
//           <div className="hp-field">
//             <label>Tiêu đề</label>
//             <input type="text" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
//           </div>
//           <div className="hp-field">
//             <label>Mô tả</label>
//             <textarea rows={2} value={draft.desc} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} />
//           </div>
//           <div className="hp-grid-2">
//             <div className="hp-field">
//               <label>Thứ tự</label>
//               <input type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })} />
//             </div>
//             <div className="hp-field" style={{ display: "flex", alignItems: "flex-end" }}>
//               <label className="hp-toggle">
//                 <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
//                 <span>Hiển thị</span>
//               </label>
//             </div>
//           </div>
//           {error && <div className="hp-alert hp-alert-error">⚠️ {error}</div>}
//           <div className="hp-form-actions">
//             <button type="button" className="hp-btn hp-btn-ghost" onClick={cancel}>Hủy</button>
//             <button type="button" className="hp-btn hp-btn-primary" onClick={save}>Lưu</button>
//           </div>
//         </div>
//       )}

//       {values.length === 0 ? (
//         <div className="hp-empty">
//           <i className="fas fa-seedling" />
//           <p>Chưa có giá trị nào.</p>
//         </div>
//       ) : (
//         <div className="hp-article-list">
//           {values.map((v) => (
//             <div key={v.id} className="hp-article-item">
//               <div style={{ width: 44, height: 44, borderRadius: 10, background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
//                 <i className={v.icon} />
//               </div>
//               <div className="hp-article-info">
//                 <div className="hp-article-title">{v.title}</div>
//                 <div className="hp-article-meta">{v.desc}</div>
//               </div>
//               <div className="hp-article-actions">
//                 <button type="button" className="hp-btn hp-btn-ghost" onClick={() => startEdit(v)}>
//                   <i className="fas fa-edit" /> Sửa
//                 </button>
//                 <button type="button" className="hp-btn hp-btn-danger" onClick={() => { if (window.confirm("Xóa?")) onRemove(v.id); }}>
//                   <i className="fas fa-trash" /> Xóa
//                 </button>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── Section: Promo Banners ─────────────────────────────────────────────────
// function PromoBannersSection({ items, onSave, onUploadFile }) {
//   const byPos = useMemo(() => {
//     const o = { left: null, right: null };
//     for (const it of items) if (o[it.position] === null) o[it.position] = it;
//     return o;
//   }, [items]);

//   return (
//     <div className="hp-card">
//       <h3 className="hp-card-title">2 banner quảng cáo nhỏ</h3>
//       <p className="hp-card-desc">Hai banner đặt cạnh nhau giữa trang chủ. Mỗi vị trí (trái/phải) chỉ lưu 1 banner.</p>
//       <div className="hp-grid-2">
//         {["left", "right"].map((pos) => (
//           <PromoCard key={pos} position={pos} item={byPos[pos]} onSave={onSave} onUploadFile={onUploadFile} />
//         ))}
//       </div>
//     </div>
//   );
// }

// function PromoCard({ position, item, onSave, onUploadFile }) {
//   const [draft, setDraft] = useState(item || { position, tag: "", title: "", imageUrl: "", ctaText: "Mua ngay", ctaLink: "#", enabled: true });
//   const [busy,  setBusy]  = useState(false);
//   const [error, setError] = useState("");
//   const [saved, setSaved] = useState(false);
//   const fileRef = useRef(null);

//   useEffect(() => {
//     setDraft(item || { position, tag: "", title: "", imageUrl: "", ctaText: "Mua ngay", ctaLink: "#", enabled: true });
//   }, [item, position]);

//   const handleFile = async (e) => {
//     const f = e.target.files?.[0];
//     if (!f) return;
//     if (!isImageFile(f)) { setError("Vui lòng chọn ảnh"); return; }
//     setBusy(true);
//     try { const r = await onUploadFile(f, "promo"); setDraft((d) => ({ ...d, imageUrl: r.url })); }
//     catch (err) { setError(err.message); }
//     finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
//   };

//   const save = async () => {
//     setError("");
//     if (!draft.title.trim()) { setError("Vui lòng nhập tiêu đề"); return; }
//     setBusy(true);
//     try {
//       await onSave(draft);
//       setSaved(true);
//       setTimeout(() => setSaved(false), 1500);
//     } catch (err) { setError(err.message); }
//     finally { setBusy(false); }
//   };

//   return (
//     <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, background: "#f8fafc" }}>
//       <h4 style={{ margin: "0 0 10px", fontSize: 14 }}>Banner {position === "left" ? "trái" : "phải"}</h4>
//       <div className="hp-field">
//         <label>Tag</label>
//         <input type="text" value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })} placeholder="VD: Quà tặng ngọt ngào" />
//       </div>
//       <div className="hp-field">
//         <label>Tiêu đề</label>
//         <input type="text" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
//       </div>
//       <div className="hp-field">
//         <label>Ảnh (tùy chọn)</label>
//         <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
//         <div className="hp-upload-row">
//           <button type="button" className="hp-btn hp-btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
//             <i className="fas fa-upload" /> {busy ? "..." : "Tải ảnh"}
//           </button>
//           {draft.imageUrl && (
//             <button type="button" className="hp-btn hp-btn-ghost" onClick={() => setDraft({ ...draft, imageUrl: "" })}>
//               <i className="fas fa-trash" /> Xóa
//             </button>
//           )}
//         </div>
//         {draft.imageUrl && <div className="hp-preview" style={{ maxWidth: "100%" }}><img src={draft.imageUrl} alt="" /></div>}
//       </div>
//       <div className="hp-grid-2">
//         <div className="hp-field">
//           <label>CTA text</label>
//           <input type="text" value={draft.ctaText} onChange={(e) => setDraft({ ...draft, ctaText: e.target.value })} />
//         </div>
//         <div className="hp-field">
//           <label>CTA link</label>
//           <input type="text" value={draft.ctaLink} onChange={(e) => setDraft({ ...draft, ctaLink: e.target.value })} />
//         </div>
//       </div>
//       <label className="hp-toggle">
//         <input type="checkbox" checked={draft.enabled !== false} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
//         <span>Hiển thị</span>
//       </label>
//       {error && <div className="hp-alert hp-alert-error">⚠️ {error}</div>}
//       {saved && <div className="hp-alert" style={{ background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}>✓ Đã lưu</div>}
//       <div className="hp-form-actions">
//         <button type="button" className="hp-btn hp-btn-primary" onClick={save} disabled={busy}>{busy ? "Đang lưu..." : "Lưu"}</button>
//       </div>
//     </div>
//   );
// }

// // ─── Section: Blog (CRUD riêng) ─────────────────────────────────────────────
// function BlogSection({ blogs, onCreate, onUpdate, onRemove, onUploadFile }) {
//   const [editing, setEditing] = useState(null);
//   const [draft, setDraft]     = useState({ title: "", desc: "", author: "Admin", imageUrl: "", link: "#", sortOrder: 0, enabled: true });
//   const [error, setError]     = useState("");
//   const [busy, setBusy]       = useState(false);
//   const fileRef = useRef(null);

//   const startNew = () => { setEditing("new"); setDraft({ title: "", desc: "", author: "Admin", imageUrl: "", link: "#", sortOrder: blogs.length, enabled: true }); setError(""); };
//   const startEdit = (b) => { setEditing(b.id); setDraft({ ...b }); setError(""); };
//   const cancel = () => { setEditing(null); setError(""); };

//   const handleFile = async (e) => {
//     const f = e.target.files?.[0];
//     if (!f) return;
//     if (!isImageFile(f)) { setError("Vui lòng chọn ảnh"); return; }
//     setBusy(true);
//     try { const r = await onUploadFile(f, "blog"); setDraft((d) => ({ ...d, imageUrl: r.url })); }
//     catch (err) { setError(err.message); }
//     finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
//   };

//   const save = async () => {
//     setError("");
//     if (!draft.title.trim()) { setError("Vui lòng nhập tiêu đề"); return; }
//     try {
//       if (editing === "new") await onCreate(draft);
//       else                   await onUpdate(editing, draft);
//       cancel();
//     } catch (err) { setError(err.message); }
//   };

//   return (
//     <div className="hp-card">
//       <div className="hp-card-head">
//         <div>
//           <h3 className="hp-card-title">Góc chia sẻ (Blog)</h3>
//           <p className="hp-card-desc">Các bài viết hiển thị cuối trang chủ shop.</p>
//         </div>
//         <button type="button" className="hp-btn hp-btn-primary" onClick={startNew}>
//           <i className="fas fa-plus" /> Thêm bài viết
//         </button>
//       </div>

//       {editing && (
//         <div className="hp-article-form">
//           <div className="hp-field">
//             <label>Tiêu đề</label>
//             <input type="text" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
//           </div>
//           <div className="hp-field">
//             <label>Mô tả ngắn</label>
//             <textarea rows={2} value={draft.desc} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} />
//           </div>
//           <div className="hp-field">
//             <label>Tác giả</label>
//             <input type="text" value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} />
//           </div>
//           <div className="hp-field">
//             <label>Ảnh bài viết</label>
//             <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
//             <div className="hp-upload-row">
//               <button type="button" className="hp-btn hp-btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
//                 <i className="fas fa-upload" /> {busy ? "..." : (draft.imageUrl ? "Đổi ảnh" : "Tải ảnh")}
//               </button>
//               {draft.imageUrl && (
//                 <button type="button" className="hp-btn hp-btn-ghost" onClick={() => setDraft({ ...draft, imageUrl: "" })}>
//                   <i className="fas fa-trash" /> Xóa
//                 </button>
//               )}
//             </div>
//             {draft.imageUrl && <div className="hp-preview" style={{ maxWidth: 300 }}><img src={draft.imageUrl} alt="" /></div>}
//           </div>
//           <div className="hp-grid-2">
//             <div className="hp-field">
//               <label>Link</label>
//               <input type="text" value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} />
//             </div>
//             <div className="hp-field">
//               <label>Thứ tự</label>
//               <input type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })} />
//             </div>
//           </div>
//           <label className="hp-toggle">
//             <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
//             <span>Hiển thị</span>
//           </label>
//           {error && <div className="hp-alert hp-alert-error">⚠️ {error}</div>}
//           <div className="hp-form-actions">
//             <button type="button" className="hp-btn hp-btn-ghost" onClick={cancel}>Hủy</button>
//             <button type="button" className="hp-btn hp-btn-primary" onClick={save}>Lưu</button>
//           </div>
//         </div>
//       )}

//       {blogs.length === 0 ? (
//         <div className="hp-empty"><i className="fas fa-newspaper" /><p>Chưa có bài viết blog nào.</p></div>
//       ) : (
//         <div className="hp-article-list">
//           {blogs.map((b) => (
//             <div key={b.id} className="hp-article-item">
//               <div style={{ width: 80, height: 50, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "#f1f5f9" }}>
//                 {b.imageUrl && <img src={b.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
//               </div>
//               <div className="hp-article-info">
//                 <div className="hp-article-title">{b.title}</div>
//                 <div className="hp-article-meta">{b.author} · {b.desc?.slice(0, 80)}…</div>
//               </div>
//               <div className="hp-article-actions">
//                 <button type="button" className="hp-btn hp-btn-ghost" onClick={() => startEdit(b)}><i className="fas fa-edit" /> Sửa</button>
//                 <button type="button" className="hp-btn hp-btn-danger" onClick={() => { if (window.confirm("Xóa?")) onRemove(b.id); }}><i className="fas fa-trash" /> Xóa</button>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── Main ───────────────────────────────────────────────────────────────────
// export default function HomePage() {
//   const [config, setConfig]     = useState(() => readCache() || DEFAULT_CONFIG);
//   const [products, setProducts] = useState([]);      // tất cả products
//   const [values, setValues]     = useState([]);
//   const [promos, setPromos]     = useState([]);
//   const [blogs, setBlogs]       = useState([]);

//   const [activeTab, setActiveTab]     = useState("background");
//   const [loading, setLoading]         = useState(true);
//   const [saving,  setSaving]          = useState(false);
//   const [savedToast, setSavedToast]   = useState(false);
//   const [globalError, setGlobalError] = useState("");

//   const saveTimer = useRef(null);
//   const pendingConfig = useRef(null);
//   const firstLoadDone = useRef(false);

//   const flashSaleProductCount = useMemo(() => {
//     const now = Date.now();
//     return products.filter((p) => {
//       const d = Number(p.flash_sale_discount);
//       if (!d || d <= 0) return false;
//       if (p.flash_sale_end_at && new Date(p.flash_sale_end_at).getTime() <= now) return false;
//       return true;
//     }).length;
//   }, [products]);

//   // ─── Load lần đầu từ API ────────────────────────────────────────────────
//   useEffect(() => {
//     let ignore = false;
//     (async () => {
//       setLoading(true);
//       setGlobalError("");
//       try {
//         const [cfg, vals, promosRes, bg, productsRes] = await Promise.all([
//           homepageApi.getConfig(),
//           homepageValuesApi.getAll(),
//           homepagePromoBannersApi.getAll(),
//           homepageBlogApi.getAll(),
//           productsApi.getAll({}),
//         ]);
//         if (ignore) return;
//         setConfig({
//           background: cfg.background || DEFAULT_CONFIG.background,
//           hero:       cfg.hero       || DEFAULT_CONFIG.hero,
//           sections:   cfg.sections   || DEFAULT_SECTIONS,
//           flashSale:  cfg.flashSale  || DEFAULT_FLASH_SALE_CFG,
//         });
//         setValues((vals.data || []).map(mapValueFromDb));
//         setPromos((promosRes.data || []).map(mapPromoFromDb));
//         setBlogs((bg.data || []).map(mapBlogFromDb));
//         setProducts(productsRes.data || []);
//         writeCache({
//           background: cfg.background || DEFAULT_CONFIG.background,
//           hero:       cfg.hero       || DEFAULT_CONFIG.hero,
//           sections:   cfg.sections   || DEFAULT_SECTIONS,
//           flashSale:  cfg.flashSale  || DEFAULT_FLASH_SALE_CFG,
//         });
//       } catch (err) {
//         if (!ignore) setGlobalError("Không tải được cấu hình từ server, đang hiển thị bản cache. " + err.message);
//       } finally {
//         if (!ignore) { setLoading(false); firstLoadDone.current = true; }
//       }
//     })();
//     return () => { ignore = true; };
//   }, []);

//   // ─── Auto-save config (background + hero + sections + flashSale) ────────
//   useEffect(() => {
//     if (!firstLoadDone.current) return;

//     pendingConfig.current = config;
//     if (saveTimer.current) clearTimeout(saveTimer.current);
//     saveTimer.current = setTimeout(async () => {
//       const toSave = pendingConfig.current;
//       if (!toSave) return;
//       setSaving(true);
//       try {
//         const saved = await homepageApi.updateConfig({
//           background: toSave.background,
//           hero: toSave.hero,
//           sections: toSave.sections,
//           flashSale: toSave.flashSale,
//         });
//         // Chỉ ghi cache + toast; KHÔNG setConfig lại để tránh vòng lặp
//         // (server trả về cùng nội dung, set lại sẽ trigger lại useEffect).
//         writeCache(toSave);
//         setSavedToast(true);
//         setTimeout(() => setSavedToast(false), 1500);
//       } catch (err) {
//         setGlobalError("Lưu cấu hình thất bại: " + err.message);
//       } finally { setSaving(false); }
//     }, 800);
//     return () => clearTimeout(saveTimer.current);
//   }, [config]);

//   // ─── Handlers ────────────────────────────────────────────────────────────
//   const setBackground = (background) => setConfig((c) => ({ ...c, background }));
//   const setHero       = (hero)       => setConfig((c) => ({ ...c, hero }));
//   const setSections   = (sections)   => setConfig((c) => ({ ...c, sections }));
//   const setFlashSaleCfg = useCallback(async (flashSale) => {
//     setConfig((c) => ({ ...c, flashSale }));
//   }, []);

//   const uploadFile = useCallback(async (file, subfolder = "misc") => {
//     return await homepageApi.uploadFile(file, subfolder);
//   }, []);

//   // Values
//   const addValue    = useCallback(async (v) => { const r = await homepageValuesApi.create(v); setValues((p) => [...p, mapValueFromDb(r)]); }, []);
//   const updateValue = useCallback(async (id, v) => { const r = await homepageValuesApi.update(id, v); setValues((p) => p.map((x) => (x.id === id ? mapValueFromDb(r) : x))); }, []);
//   const removeValue = useCallback(async (id) => { await homepageValuesApi.remove(id); setValues((p) => p.filter((x) => x.id !== id)); }, []);

//   // Promo
//   const savePromo = useCallback(async (p) => {
//     const r = await homepagePromoBannersApi.upsert(p);
//     setPromos((prev) => { const filtered = prev.filter((x) => x.position !== p.position); return [...filtered, mapPromoFromDb(r)]; });
//   }, []);

//   // Blog
//   const addBlog    = useCallback(async (b) => { const r = await homepageBlogApi.create(b); setBlogs((p) => [...p, mapBlogFromDb(r)]); }, []);
//   const updateBlog = useCallback(async (id, b) => { const r = await homepageBlogApi.update(id, b); setBlogs((p) => p.map((x) => (x.id === id ? mapBlogFromDb(r) : x))); }, []);
//   const removeBlog = useCallback(async (id) => { await homepageBlogApi.remove(id); setBlogs((p) => p.filter((x) => x.id !== id)); }, []);

//   // Cập nhật cột flash_sale_discount / flash_sale_end_at trực tiếp trên SP
//   // (Admin không qua homepage_picks nữa — chỉnh thẳng trên products)
//   const updateProductFlashSale = useCallback(async (productId, patch) => {
//     const r = await productsApi.update(productId, patch);
//     setProducts((p) => p.map((x) => (String(x.id) === String(productId) ? r : x)));
//     return r;
//   }, []);

//   const resetAll = () => { if (window.confirm("Khôi phục background + hero về mặc định?")) setConfig((c) => ({ ...c, background: DEFAULT_CONFIG.background, hero: DEFAULT_CONFIG.hero })); };

//   const stats = useMemo(() => ({
//     bg:     config.background.type,
//     hero:   config.hero.enabled ? "Bật" : "Tắt",
//     values: values.length,
//     cats:   products.length,                    // danh mục = tổng SP
//     flash:  flashSaleProductCount,              // SP đang active trong flash sale
//     promos: promos.length,
//     blogs:  blogs.length,
//   }), [config, values, products, flashSaleProductCount, promos, blogs]);

//   return (
//     <div className="hp-wrapper">
//       <div className="hp-header">
//         <div>
//           <h1>Quản lý trang chủ shop</h1>
//           <p>Thay đổi toàn bộ nội dung hiển thị trên trang chủ Techtra Shop.</p>
//         </div>
//         <div className="hp-header-actions">
//           {saving && <span className="hp-saving-badge"><i className="fas fa-spinner fa-spin" /> Đang lưu...</span>}
//           <button type="button" className="hp-btn hp-btn-ghost" onClick={resetAll}>
//             <i className="fas fa-undo" /> Mặc định
//           </button>
//         </div>
//       </div>

//       {globalError && (
//         <div className="hp-alert hp-alert-error" style={{ marginBottom: 16 }}>
//           ⚠️ {globalError}
//         </div>
//       )}

//       <div className="hp-stats">
//         <div className="hp-stat"><div className="hp-stat-icon" style={{ background: "#dbeafe", color: "#1d4ed8" }}><i className="fas fa-palette" /></div><div><div className="hp-stat-label">Background</div><div className="hp-stat-value">{stats.bg === "color" ? "Màu sắc" : stats.bg === "image" ? "Hình ảnh" : "Video"}</div></div></div>
//         <div className="hp-stat"><div className="hp-stat-icon" style={{ background: "#dcfce7", color: "#16a34a" }}><i className="fas fa-image" /></div><div><div className="hp-stat-label">Hero</div><div className="hp-stat-value">{stats.hero}</div></div></div>
//         <div className="hp-stat"><div className="hp-stat-icon" style={{ background: "#ede9fe", color: "#7c3aed" }}><i className="fas fa-seedling" /></div><div><div className="hp-stat-label">Values</div><div className="hp-stat-value">{stats.values}</div></div></div>
//         <div className="hp-stat"><div className="hp-stat-icon" style={{ background: "#fce7f3", color: "#be185d" }}><i className="fas fa-th-large" /></div><div><div className="hp-stat-label">Danh mục</div><div className="hp-stat-value">{stats.cats}</div></div></div>
//         <div className="hp-stat"><div className="hp-stat-icon" style={{ background: "#fee2e2", color: "#dc2626" }}><i className="fas fa-bolt" /></div><div><div className="hp-stat-label">Flash sale</div><div className="hp-stat-value">{stats.flash}</div></div></div>
//         <div className="hp-stat"><div className="hp-stat-icon" style={{ background: "#cffafe", color: "#0e7490" }}><i className="fas fa-rectangle-ad" /></div><div><div className="hp-stat-label">Promo</div><div className="hp-stat-value">{stats.promos}</div></div></div>
//         <div className="hp-stat"><div className="hp-stat-icon" style={{ background: "#dbeafe", color: "#1d4ed8" }}><i className="fas fa-newspaper" /></div><div><div className="hp-stat-label">Blog</div><div className="hp-stat-value">{stats.blogs}</div></div></div>
//       </div>

//       <div className="hp-tabs">
//         {TABS.map((t) => (
//           <button key={t.id} type="button" className={`hp-tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
//             <i className={t.icon} /> {t.label}
//           </button>
//         ))}
//       </div>

//       {loading ? (
//         <div className="hp-card" style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
//           <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 8 }} />
//           <p>Đang tải cấu hình từ server...</p>
//         </div>
//       ) : (
//         <>
//           {activeTab === "background" && <BackgroundSection config={config} onChange={setBackground} onUploadFile={uploadFile} />}
//           {activeTab === "hero"       && <HeroSection      config={config} onChange={setHero}       onUploadFile={uploadFile} />}
//           {activeTab === "sections"   && <SectionsToggleSection sections={config.sections} onChange={setSections} />}
//           {activeTab === "values"     && <ValuesSection    values={values} onCreate={addValue} onUpdate={updateValue} onRemove={removeValue} />}
//           {activeTab === "flashsale"  && <FlashSaleSection cfg={config.flashSale} onSaveCfg={setFlashSaleCfg} allProducts={products} onUpdateProduct={updateProductFlashSale} />}
//           {activeTab === "promo"      && <PromoBannersSection items={promos} onSave={savePromo} onUploadFile={uploadFile} />}
//           {activeTab === "blog"       && <BlogSection      blogs={blogs} onCreate={addBlog} onUpdate={updateBlog} onRemove={removeBlog} onUploadFile={uploadFile} />}
//         </>
//       )}

//       {savedToast && (
//         <div className="hp-toast">
//           <i className="fas fa-check-circle" /> Đã lưu cấu hình
//         </div>
//       )}
//     </div>
//   );
// }

// src/components/HomePage/HomePage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Quản lý trang chủ shop:
//   1. Background (đổi màu, hình ảnh, video)
//   2. Hero banner (ảnh + tiêu đề + CTA)
//   3. Sections toggle (bật/tắt từng phần trên trang chủ — bao gồm cả
//      "Slider banner đầu trang", không còn tab riêng để thêm slide)
//   4. Brand values (4 thẻ giá trị) — CRUD riêng
//   5. Danh mục nổi bật — tự động lấy TẤT CẢ sản phẩm, không cần cấu hình
//   6. Flash sale — admin đặt % giảm giá + thời điểm kết thúc cho từng sản phẩm
//                    (cột flash_sale_discount + flash_sale_end_at trong products).
//                    Hết thời gian sẽ tự trả về giá gốc.
//   7. Promo banners (2 banner nhỏ) — CRUD riêng theo vị trí
//   8. Popup thông báo — 1 banner lớn hiện dạng modal ngay khi khách vào trang
//      chủ (VD: thông báo sale/đóng shop). Có nút "Đóng" và "Không hiển thị
//      lại" (khách tắt thì FE lưu localStorage, không hiện lại cho khách đó).
//   9. Blog — CRUD riêng
//  10. Articles (link/file) — CRUD riêng
//
// Lưu ý:
// - Tab "Slider" (thêm/sửa/xóa từng slide) đã được BỎ HẲN. Slider banner đầu
//   trang giờ chỉ còn nút bật/tắt trong tab "Bật/tắt phần" (key: heroSlider).
// - Tab "Danh mục" đã bỏ vì danh mục lấy thẳng tất cả sản phẩm (sắp theo
//   created_at desc).
// - Tab "Flash sale" không dùng homepage_picks; admin chỉnh trực tiếp
//   cột flash_sale_discount + flash_sale_end_at trên từng sản phẩm.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import "./HomePage.css";
import {
  homepageApi,
  homepageValuesApi,
  homepagePromoBannersApi,
  homepageBlogApi,
  productsApi,
} from "../../api";

const CACHE_KEY = "homepage_config_cache";

const DEFAULT_SECTIONS = {
  heroSlider: true,
  brandValues: true,
  categories: true,
  flashSale: true,
  bestSellers: true,
  promoBanners: true,
  blog: true,
  newsletter: true,
};

const DEFAULT_FLASH_SALE_CFG = {
  title: "Giờ Vàng Deal Xịn",
  enabled: true,
};

// Popup thông báo — hiện dạng modal ngay khi khách vào trang chủ.
// dontShowDays: số ngày FE sẽ "nhớ" lựa chọn "Không hiển thị lại" của khách
// (lưu localStorage phía client, không phải cấu hình server-side per-user).
const DEFAULT_POPUP_CFG = {
  enabled: false,
  title: "THÔNG BÁO",
  imageUrl: "",
  link: "",
  dontShowDays: 7,
};

const DEFAULT_CONFIG = {
  background: {
    type: "color",
    color: "#6a11cb",
    imageUrl: "",
    videoUrl: "",
  },
  hero: {
    enabled: true,
    imageUrl: "",
    title: "Chào mừng đến với Techtra Shop",
    subtitle: "Cửa hàng công nghệ — uy tín, chất lượng, giao hàng toàn quốc",
    ctaText: "Khám phá ngay",
    ctaLink: "/san-pham",
  },
  sections: DEFAULT_SECTIONS,
  flashSale: DEFAULT_FLASH_SALE_CFG,
  popup: DEFAULT_POPUP_CFG,
};

const TABS = [
  { id: "background", label: "Background",  icon: "fas fa-palette" },
  { id: "hero",       label: "Hero banner",  icon: "fas fa-image" },
  { id: "sections",   label: "Bật/tắt phần", icon: "fas fa-toggle-on" },
  { id: "values",     label: "Giá trị",      icon: "fas fa-seedling" },
  { id: "flashsale",  label: "Flash sale",   icon: "fas fa-bolt" },
  { id: "promo",      label: "Promo banner", icon: "fas fa-rectangle-ad" },
  { id: "popup",      label: "Banner popup", icon: "fas fa-bullhorn" },
  { id: "blog",       label: "Blog",         icon: "fas fa-newspaper" },
];
// Lưu ý:
//   - Tab "Slider" (thêm slide riêng lẻ) đã được lược bỏ hoàn toàn.
//   - Tab "Danh mục" đã được lược bỏ — danh mục nổi bật lấy thẳng tất cả
//     sản phẩm (created_at desc), không cần cấu hình từ admin.
//   - Tab "Bài viết" (link/file tài liệu) đã được lược bỏ — quản lý bài viết
//     chuyển sang trang "Bài viết / Đọc báo" riêng trong sidebar.
//   - Tab "Banner popup": quản lý 1 modal thông báo hiện khi khách vào trang
//     chủ (ảnh lớn + nút Đóng/Không hiển thị lại).

// ─── Helpers ────────────────────────────────────────────────────────────────
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      background: { ...DEFAULT_CONFIG.background, ...(parsed.background || {}) },
      hero:       { ...DEFAULT_CONFIG.hero,       ...(parsed.hero || {}) },
      sections:   { ...DEFAULT_SECTIONS,          ...(parsed.sections || {}) },
      flashSale:  { ...DEFAULT_FLASH_SALE_CFG,    ...(parsed.flashSale || {}) },
      popup:      { ...DEFAULT_POPUP_CFG,         ...(parsed.popup || {}) },
    };
  } catch { return null; }
}
function writeCache(cfg) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cfg)); } catch {}
}

function isImageFile(file) { return file?.type?.startsWith("image/"); }
function isVideoFile(file) { return file?.type?.startsWith("video/"); }
function isDocFile(file) {
  if (!file) return false;
  const name = (file.name || "").toLowerCase();
  return (
    file.type === "application/pdf" ||
    file.type.includes("officedocument") ||
    name.endsWith(".pdf") || name.endsWith(".doc") || name.endsWith(".docx")
  );
}

// Format từ DB → state FE
const mapValueFromDb = (r) => ({ id: r.id, icon: r.icon, title: r.title, desc: r.desc || "", sortOrder: r.sort_order, enabled: r.enabled });
const mapPromoFromDb = (r) => ({ id: r.id, position: r.position, tag: r.tag || "", title: r.title, imageUrl: r.image_url, ctaText: r.cta_text, ctaLink: r.cta_link, sortOrder: r.sort_order, enabled: r.enabled });
const mapBlogFromDb  = (r) => ({ id: r.id, title: r.title, desc: r.desc || "", author: r.author, imageUrl: r.image_url, link: r.link, sortOrder: r.sort_order, enabled: r.enabled });

// ─── Section: Background ────────────────────────────────────────────────────
function BackgroundSection({ config, onChange, onUploadFile }) {
  const bg     = config.background;
  const fileRef = useRef(null);
  const [error, setError] = useState("");
  const [busy,  setBusy]  = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (bg.type === "image" && !isImageFile(file)) { setError("Vui lòng chọn file hình ảnh (JPG, PNG, WebP...)"); return; }
    if (bg.type === "video" && !isVideoFile(file)) { setError("Vui lòng chọn file video (MP4, WebM...)"); return; }
    setBusy(true);
    try {
      const subfolder = bg.type === "image" ? "background/image" : "background/video";
      const result = await onUploadFile(file, subfolder);
      if (bg.type === "image") onChange({ ...bg, imageUrl: result.url });
      else                     onChange({ ...bg, videoUrl: result.url });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="hp-card">
      <h3 className="hp-card-title">Background trang chủ</h3>
      <p className="hp-card-desc">Đổi màu nền, dùng hình ảnh hoặc video làm nền cho toàn trang chủ shop.</p>

      <div className="hp-type-tabs">
        {[
          { id: "color", label: "Màu sắc", icon: "fas fa-fill-drip" },
          { id: "image", label: "Hình ảnh", icon: "fas fa-image" },
          { id: "video", label: "Video",    icon: "fas fa-video" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={`hp-type-tab ${bg.type === t.id ? "active" : ""}`}
            onClick={() => onChange({ ...bg, type: t.id })}
          >
            <i className={t.icon} /> {t.label}
          </button>
        ))}
      </div>

      {bg.type === "color" && (
        <div className="hp-color-row">
          <input type="color" value={bg.color} onChange={(e) => onChange({ ...bg, color: e.target.value })} />
          <input type="text" value={bg.color} onChange={(e) => onChange({ ...bg, color: e.target.value })} placeholder="#6a11cb" />
          <div className="hp-color-presets">
            {["#6a11cb", "#2575fc", "#0f172a", "#10b981", "#f59e0b", "#dc2626", "#ffffff", "#000000"].map((c) => (
              <button key={c} type="button" className="hp-preset" style={{ background: c }} onClick={() => onChange({ ...bg, color: c })} title={c} />
            ))}
          </div>
        </div>
      )}

      {bg.type === "image" && (
        <div className="hp-upload-row">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
          <button type="button" className="hp-btn hp-btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
            <i className="fas fa-upload" /> {busy ? "Đang xử lý..." : (bg.imageUrl ? "Đổi hình nền" : "Tải hình nền")}
          </button>
          {bg.imageUrl && (
            <button type="button" className="hp-btn hp-btn-ghost" onClick={() => onChange({ ...bg, imageUrl: "" })}>
              <i className="fas fa-trash" /> Xóa
            </button>
          )}
          {bg.imageUrl && <div className="hp-preview"><img src={bg.imageUrl} alt="preview" /></div>}
        </div>
      )}

      {bg.type === "video" && (
        <div className="hp-upload-row">
          <input ref={fileRef} type="file" accept="video/*" onChange={handleFile} hidden />
          <button type="button" className="hp-btn hp-btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
            <i className="fas fa-upload" /> {busy ? "Đang xử lý..." : (bg.videoUrl ? "Đổi video" : "Tải video nền")}
          </button>
          {bg.videoUrl && (
            <button type="button" className="hp-btn hp-btn-ghost" onClick={() => onChange({ ...bg, videoUrl: "" })}>
              <i className="fas fa-trash" /> Xóa
            </button>
          )}
          {bg.videoUrl && <div className="hp-preview"><video src={bg.videoUrl} autoPlay muted loop playsInline /></div>}
        </div>
      )}

      {error && <div className="hp-alert hp-alert-error">⚠️ {error}</div>}

      <div className="hp-tips">
        <strong>Mẹo:</strong> Nên dùng ảnh ngang (1920×1080) cho hình nền; video nên dưới 10s, tắt tiếng, lặp lại.
      </div>
    </div>
  );
}

// ─── Section: Hero ──────────────────────────────────────────────────────────
function HeroSection({ config, onChange, onUploadFile }) {
  const hero    = config.hero;
  const fileRef = useRef(null);
  const [error, setError] = useState("");
  const [busy,  setBusy]  = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (!isImageFile(file)) { setError("Vui lòng chọn file hình ảnh"); return; }
    setBusy(true);
    try {
      const result = await onUploadFile(file, "hero/image");
      onChange({ ...hero, imageUrl: result.url });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="hp-card">
      <h3 className="hp-card-title">Hero banner (ảnh đầu trang)</h3>
      <p className="hp-card-desc">Banner lớn hiện ngay đầu trang chủ shop với tiêu đề và nút bấm.</p>

      <label className="hp-toggle">
        <input type="checkbox" checked={hero.enabled} onChange={(e) => onChange({ ...hero, enabled: e.target.checked })} />
        <span>Hiển thị hero banner</span>
      </label>

      <div className="hp-field">
        <label>Ảnh banner</label>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
        <div className="hp-upload-row">
          <button type="button" className="hp-btn hp-btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
            <i className="fas fa-upload" /> {busy ? "Đang xử lý..." : (hero.imageUrl ? "Đổi ảnh" : "Tải ảnh banner")}
          </button>
          {hero.imageUrl && (
            <button type="button" className="hp-btn hp-btn-ghost" onClick={() => onChange({ ...hero, imageUrl: "" })}>
              <i className="fas fa-trash" /> Xóa
            </button>
          )}
        </div>
        {hero.imageUrl && <div className="hp-preview"><img src={hero.imageUrl} alt="hero preview" /></div>}
      </div>

      <div className="hp-field">
        <label>Tiêu đề</label>
        <input type="text" value={hero.title} onChange={(e) => onChange({ ...hero, title: e.target.value })} placeholder="VD: Chào mừng đến với Techtra Shop" />
      </div>

      <div className="hp-field">
        <label>Mô tả phụ</label>
        <textarea rows={2} value={hero.subtitle} onChange={(e) => onChange({ ...hero, subtitle: e.target.value })} placeholder="Mô tả ngắn gọn..." />
      </div>

      <div className="hp-grid-2">
        <div className="hp-field">
          <label>Chữ trên nút bấm (CTA)</label>
          <input type="text" value={hero.ctaText} onChange={(e) => onChange({ ...hero, ctaText: e.target.value })} placeholder="VD: Mua ngay" />
        </div>
        <div className="hp-field">
          <label>Liên kết nút bấm</label>
          <input type="text" value={hero.ctaLink} onChange={(e) => onChange({ ...hero, ctaLink: e.target.value })} placeholder="/san-pham" />
        </div>
      </div>

      {error && <div className="hp-alert hp-alert-error">⚠️ {error}</div>}

      <div className="hp-hero-preview">
        <div className="hp-hero-preview-label">Xem trước</div>
        {hero.imageUrl ? (
          <div className="hp-hero-preview-image" style={{ backgroundImage: `url(${hero.imageUrl})` }}>
            <div className="hp-hero-preview-content">
              <h2>{hero.title || "Tiêu đề hero"}</h2>
              <p>{hero.subtitle || "Mô tả phụ"}</p>
              {hero.ctaText && <button type="button">{hero.ctaText}</button>}
            </div>
          </div>
        ) : (
          <div className="hp-hero-preview-empty">Chưa có ảnh banner — tải ảnh lên để xem trước</div>
        )}
      </div>
    </div>
  );
}

// ─── Section: Sections toggle ───────────────────────────────────────────────
// Đây là nơi DUY NHẤT còn liên quan tới "slider": chỉ có nút bật/tắt
// (key: heroSlider), không còn màn hình thêm/sửa/xóa từng slide riêng lẻ.
const SECTION_LIST = [
  { key: "heroSlider",   label: "Slider banner đầu trang" },
  { key: "brandValues",  label: "4 giá trị thương hiệu" },
  { key: "categories",   label: "Danh mục nổi bật" },
  { key: "flashSale",    label: "Flash sale" },
  { key: "bestSellers",  label: "Sản phẩm bán chạy" },
  { key: "promoBanners", label: "2 banner quảng cáo nhỏ" },
  { key: "blog",         label: "Góc chia sẻ / Blog" },
  { key: "newsletter",   label: "Đăng ký nhận tin" },
];
function SectionsToggleSection({ sections, onChange }) {
  return (
    <div className="hp-card">
      <h3 className="hp-card-title">Bật / tắt các phần trên trang chủ</h3>
      <p className="hp-card-desc">Tắt những phần bạn không muốn hiển thị trên trang chủ shop. Thay đổi được lưu tự động.</p>
      <div className="hp-sections-grid">
        {SECTION_LIST.map((s) => (
          <label key={s.key} className="hp-section-toggle">
            <input
              type="checkbox"
              checked={!!sections[s.key]}
              onChange={(e) => onChange({ ...sections, [s.key]: e.target.checked })}
            />
            <span>{s.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Section: Popup thông báo ───────────────────────────────────────────────
// Modal lớn hiện ngay khi khách vào trang chủ (ảnh + tiêu đề + nút Đóng /
// Không hiển thị lại). Toàn bộ nội dung (ảnh, link, tiêu đề) do admin cấu
// hình ở đây; phần "Không hiển thị lại" là logic FE (lưu localStorage phía
// khách, dùng dontShowDays để biết bao lâu thì hiện lại).
function PopupAnnouncementSection({ config, onChange, onUploadFile }) {
  const popup = config.popup || DEFAULT_POPUP_CFG;
  const fileRef = useRef(null);
  const [error, setError] = useState("");
  const [busy,  setBusy]  = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (!isImageFile(file)) { setError("Vui lòng chọn file hình ảnh"); return; }
    setBusy(true);
    try {
      const result = await onUploadFile(file, "popup");
      onChange({ ...popup, imageUrl: result.url });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="hp-card">
      <h3 className="hp-card-title">Banner popup thông báo</h3>
      <p className="hp-card-desc">
        Modal lớn hiện ngay khi khách vào trang chủ (VD: thông báo sale, đóng shop...).
        Khách có thể bấm <strong>"Đóng"</strong> để tắt tạm thời, hoặc <strong>"Không hiển thị lại"</strong>
        để không thấy popup này trong vài ngày tới trên thiết bị đó.
      </p>

      <label className="hp-toggle">
        <input type="checkbox" checked={popup.enabled} onChange={(e) => onChange({ ...popup, enabled: e.target.checked })} />
        <span>Bật popup thông báo</span>
      </label>

      <div className="hp-field">
        <label>Tiêu đề (trên cùng modal)</label>
        <input
          type="text"
          value={popup.title}
          onChange={(e) => onChange({ ...popup, title: e.target.value })}
          placeholder="VD: THÔNG BÁO"
        />
      </div>

      <div className="hp-field">
        <label>Ảnh banner</label>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
        <div className="hp-upload-row">
          <button type="button" className="hp-btn hp-btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
            <i className="fas fa-upload" /> {busy ? "Đang xử lý..." : (popup.imageUrl ? "Đổi ảnh" : "Tải ảnh banner")}
          </button>
          {popup.imageUrl && (
            <button type="button" className="hp-btn hp-btn-ghost" onClick={() => onChange({ ...popup, imageUrl: "" })}>
              <i className="fas fa-trash" /> Xóa
            </button>
          )}
        </div>
        {popup.imageUrl && <div className="hp-preview" style={{ maxWidth: 320 }}><img src={popup.imageUrl} alt="popup preview" /></div>}
      </div>

      <div className="hp-grid-2">
        <div className="hp-field">
          <label>Link khi bấm vào ảnh (tùy chọn)</label>
          <input
            type="text"
            value={popup.link}
            onChange={(e) => onChange({ ...popup, link: e.target.value })}
            placeholder="VD: /khuyen-mai"
          />
        </div>
        <div className="hp-field">
          <label>Số ngày ẩn khi khách bấm "Không hiển thị lại"</label>
          <input
            type="number"
            min={1}
            value={popup.dontShowDays}
            onChange={(e) => onChange({ ...popup, dontShowDays: Number(e.target.value) || 1 })}
          />
        </div>
      </div>

      {error && <div className="hp-alert hp-alert-error">⚠️ {error}</div>}

      {/* ─── Preview giống hệt bố cục modal thật trên FE ─── */}
      <div className="hp-hero-preview">
        <div className="hp-hero-preview-label">Xem trước</div>
        {popup.imageUrl ? (
          <div
            style={{
              maxWidth: 420,
              margin: "0 auto",
              background: "#fff",
              borderRadius: 14,
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#dc2626" }}>
                <i className="fas fa-bell" /> {popup.title || "THÔNG BÁO"}
              </span>
              <span style={{ color: "#94a3b8", cursor: "default" }}>✕</span>
            </div>
            <div style={{ maxHeight: 320, overflow: "hidden" }}>
              <img src={popup.imageUrl} alt="popup" style={{ width: "100%", display: "block" }} />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                padding: 14,
                borderTop: "1px solid #f1f5f9",
              }}
            >
              <button type="button" className="hp-btn hp-btn-ghost" disabled>Không hiển thị lại</button>
              <button type="button" className="hp-btn hp-btn-danger" disabled>Đóng</button>
            </div>
          </div>
        ) : (
          <div className="hp-hero-preview-empty">Chưa có ảnh banner — tải ảnh lên để xem trước</div>
        )}
      </div>

      <div className="hp-tips" style={{ marginTop: 16 }}>
        <strong>Mẹo:</strong> Nên dùng ảnh dọc hoặc vuông, dưới 1MB để load nhanh. Popup chỉ hiện 1 lần mỗi
        phiên truy cập (trừ khi khách chưa từng bấm "Không hiển thị lại").
      </div>
    </div>
  );
}

// ─── Section: Flash Sale (quản lý trực tiếp trên products) ─────────────────
// Tab này KHÔNG dùng homepage_picks nữa. Admin chỉnh % giảm và thời điểm kết
// thúc cho từng sản phẩm; SP có flash_sale_discount > 0 sẽ tự hiện trên FE
// (lọc thêm theo flash_sale_end_at). Hết hạn → tự trả về giá gốc.
function FlashSaleSection({ cfg, onSaveCfg, allProducts, onUpdateProduct }) {
  const [draftCfg, setDraftCfg] = useState(DEFAULT_FLASH_SALE_CFG);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft]       = useState({ flash_sale_discount: "", flash_sale_end_at: "" });
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("all"); // 'all' | 'active' | 'expired' | 'none'

  // ─── Bulk sale: chọn nhiều SP, set % giảm + thời gian kết thúc chung ─────
  const [selected, setSelected]           = useState(new Set());     // id SP đang chọn
  const [bulkEditing, setBulkEditing]     = useState(false);         // bật/tắt panel bulk
  const [bulkDraft, setBulkDraft]         = useState({ discount: "", endAt: "" });
  const [bulkError, setBulkError]         = useState("");

  // ─── Excel import: upload file .xlsx/.csv cột SKU + discount + end_at ─────
  // rows: mảng các dòng đã parse; mỗi dòng kèm {status, reason, product, isValid}
  const [excelModal, setExcelModal]       = useState(false);         // mở/đóng modal
  const [excelRows,  setExcelRows]        = useState([]);            // preview rows
  const [excelStats, setExcelStats]       = useState({ total: 0, valid: 0, invalid: 0 });
  const [excelBusy,  setExcelBusy]        = useState(false);
  const [excelError, setExcelError]       = useState("");
  const excelFileRef = useRef(null);
  // Reset selection khi filter/search đổi (tránh chọn nhầm SP ở tab khác)
  useEffect(() => { setSelected(new Set()); }, [filter, search]);

  useEffect(() => {
    if (cfg) setDraftCfg({
      title: cfg.title || DEFAULT_FLASH_SALE_CFG.title,
      enabled: cfg.enabled !== false,
    });
  }, [cfg]);

  const saveCfg = async () => {
    setBusy(true);
    try { await onSaveCfg(draftCfg); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    // Chuẩn hoá end_at → input datetime-local (YYYY-MM-DDTHH:mm)
    let endAtLocal = "";
    if (p.flash_sale_end_at) {
      try {
        const d = new Date(p.flash_sale_end_at);
        if (!Number.isNaN(d.getTime())) {
          const pad = (n) => String(n).padStart(2, "0");
          endAtLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }
      } catch { /* ignore */ }
    }
    setDraft({
      flash_sale_discount: p.flash_sale_discount != null ? String(p.flash_sale_discount) : "",
      flash_sale_end_at: endAtLocal,
    });
    setError("");
  };
  const cancel = () => { setEditingId(null); setError(""); };

  const save = async () => {
    setError("");
    // Validate % giảm
    let discountNum = null;
    if (draft.flash_sale_discount !== "" && draft.flash_sale_discount !== null) {
      const v = Number(draft.flash_sale_discount);
      if (Number.isNaN(v) || v < 0 || v > 100) {
        setError("% giảm phải là số từ 0 đến 100");
        return;
      }
      discountNum = v;
    }
    // Convert datetime-local → ISO (giữ nguyên múi giờ local của admin)
    let endAtIso = null;
    if (draft.flash_sale_end_at) {
      const d = new Date(draft.flash_sale_end_at);
      if (Number.isNaN(d.getTime())) { setError("Thời điểm kết thúc không hợp lệ"); return; }
      endAtIso = d.toISOString();
    }
    setBusy(true);
    try {
      await onUpdateProduct(editingId, {
        flash_sale_discount: discountNum, // null = rời khỏi flash sale
        flash_sale_end_at:   endAtIso,
      });
      cancel();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Bỏ "${p.name}" khỏi Flash Sale?`)) return;
    setBusy(true);
    try {
      await onUpdateProduct(p.id, { flash_sale_discount: null, flash_sale_end_at: null });
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  // ─── Bulk: chọn nhiều SP rồi set % giảm + thời gian kết thúc chung ─────
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAllVisible = () => {
    setSelected((prev) => {
      const ids = visible.map((p) => p.id);
      const allOn = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allOn) ids.forEach((id) => next.delete(id));
      else       ids.forEach((id) => next.add(id));
      return next;
    });
  };
  const openBulk = () => {
    if (selected.size === 0) return;
    setBulkError("");
    setBulkDraft({ discount: "", endAt: "" });
    setBulkEditing(true);
  };
  const cancelBulk = () => { setBulkEditing(false); setBulkError(""); };
  const applyBulk = async () => {
    setBulkError("");
    let discountNum = null;
    if (bulkDraft.discount !== "" && bulkDraft.discount !== null) {
      const v = Number(bulkDraft.discount);
      if (Number.isNaN(v) || v < 0 || v > 100) {
        setBulkError("% giảm phải là số từ 0 đến 100");
        return;
      }
      discountNum = v;
    }
    let endAtIso = null;
    if (bulkDraft.endAt) {
      const d = new Date(bulkDraft.endAt);
      if (Number.isNaN(d.getTime())) { setBulkError("Thời điểm kết thúc không hợp lệ"); return; }
      endAtIso = d.toISOString();
    }
    if (discountNum === null && endAtIso === null) {
      setBulkError("Vui lòng nhập ít nhất % giảm hoặc thời điểm kết thúc");
      return;
    }
    setBusy(true);
    try {
      const ids = Array.from(selected);
      // Gọi song song — mỗi SP 1 request update (đơn giản, không phải bulk SQL)
      await Promise.all(ids.map((id) => onUpdateProduct(id, {
        ...(discountNum !== null ? { flash_sale_discount: discountNum } : {}),
        ...(endAtIso    !== null ? { flash_sale_end_at:   endAtIso   } : {}),
      })));
      cancelBulk();
      setSelected(new Set());
    } catch (err) { setBulkError(err.message); }
    finally { setBusy(false); }
  };

  // ─── Excel import: parse file, validate theo SKU + is_active, preview trước khi lưu ─
  // Chuẩn hoá key header (loại bỏ dấu, khoảng trắng) để map tên cột linh hoạt
  const normKey = (s) => String(s || "").toLowerCase().trim()
    .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
  const COLUMN_HINTS = {
    sku:      ["sku", "masp", "productcode", "product_code", "code"],
    discount: ["discount", "giamgia", "phantramgiam", "sale", "percent", "phantram", "giamphantram"],
    endAt:    ["endat", "enddate", "ngayketthuc", "thoigianketthuc", "expiresat", "expiry", "hethan"],
  };
  const findColumn = (headers, hints) => {
    for (const h of headers) {
      const k = normKey(h);
      if (hints.some((hint) => k === hint || k.includes(hint))) return h;
    }
    return null;
  };
  // Chuẩn hoá ngày: chấp nhận Date, "YYYY-MM-DD HH:mm:ss", "YYYY-MM-DDTHH:mm", số serial Excel
  const parseEndAt = (raw) => {
    if (raw == null || raw === "") return null;
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw.toISOString();
    if (typeof raw === "number") {
      // Excel serial date: số ngày từ 1899-12-30
      const ms = (raw - 25569) * 86400 * 1000;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    const s = String(raw).trim();
    if (!s) return null;
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    // Thử format "YYYY-MM-DD HH:mm:ss" nếu có dấu cách
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || "00"}`).toISOString();
    return null;
  };

  const openExcelModal = () => {
    setExcelModal(true);
    setExcelRows([]);
    setExcelStats({ total: 0, valid: 0, invalid: 0 });
    setExcelError("");
    if (excelFileRef.current) excelFileRef.current.value = "";
  };
  const closeExcelModal = () => {
    if (excelBusy) return;
    setExcelModal(false);
    setExcelRows([]);
    setExcelError("");
  };

  const handleExcelFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelError("");
    setExcelBusy(true);
    setExcelRows([]);
    try {
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type: "array", cellDates: true });
      const ws  = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("File Excel không có sheet nào");

      // Lấy dữ liệu dạng object (header row đầu tiên)
      const raw = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });
      if (!raw.length) throw new Error("File không có dữ liệu");

      const headers = Object.keys(raw[0]);
      const skuCol      = findColumn(headers, COLUMN_HINTS.sku);
      const discountCol = findColumn(headers, COLUMN_HINTS.discount);
      const endAtCol    = findColumn(headers, COLUMN_HINTS.endAt);

      if (!skuCol)      throw new Error("Không tìm thấy cột SKU (tên cột: sku, ma_sp, product_code…)");
      if (!discountCol) throw new Error("Không tìm thấy cột % giảm (tên cột: discount, giam_gia, phan_tram…)");
      // endAt là tuỳ chọn — nếu không có thì end_at = null (không giới hạn)

      // Index products theo SKU để tra nhanh
      const skuMap = new Map();
      allProducts.forEach((p) => {
        if (p.sku) skuMap.set(String(p.sku).trim().toLowerCase(), p);
      });

      const rows = raw.map((r, idx) => {
        const rowNo      = idx + 2; // Excel row (bỏ header)
        const sku        = String(r[skuCol] ?? "").trim();
        const discountRaw = r[discountCol];
        const endAtRaw   = endAtCol ? r[endAtCol] : "";

        // Validate
        if (!sku) {
          return { rowNo, sku, discount: discountRaw, endAt: endAtRaw, product: null,
                   isValid: false, reason: "Thiếu SKU" };
        }
        const product = skuMap.get(sku.toLowerCase());
        if (!product) {
          return { rowNo, sku, discount: discountRaw, endAt: endAtRaw, product: null,
                   isValid: false, reason: "Không tìm thấy SP có SKU này" };
        }
        if (!product.is_active) {
          return { rowNo, sku, discount: discountRaw, endAt: endAtRaw, product,
                   isValid: false, reason: "SP đang ẩn (không trên kệ) — không thể sale" };
        }
        const discNum = Number(discountRaw);
        if (Number.isNaN(discNum) || discNum < 0 || discNum > 100) {
          return { rowNo, sku, discount: discountRaw, endAt: endAtRaw, product,
                   isValid: false, reason: "% giảm phải là số 0–100" };
        }
        let endAtIso = null;
        if (endAtRaw !== "" && endAtRaw !== null) {
          endAtIso = parseEndAt(endAtRaw);
          if (endAtRaw !== "" && endAtIso === null) {
            return { rowNo, sku, discount: discountRaw, endAt: endAtRaw, product,
                     isValid: false, reason: "Ngày kết thúc không hợp lệ" };
          }
        }
        return { rowNo, sku, discount: discNum, endAt: endAtRaw, endAtIso, product,
                 isValid: true, reason: "" };
      });

      const valid   = rows.filter((r) => r.isValid).length;
      const invalid = rows.length - valid;
      setExcelRows(rows);
      setExcelStats({ total: rows.length, valid, invalid });
    } catch (err) {
      setExcelError(err.message || "Không đọc được file Excel");
    } finally {
      setExcelBusy(false);
      if (excelFileRef.current) excelFileRef.current.value = "";
    }
  };

  const downloadExcelTemplate = () => {
    // Tạo file mẫu gồm 3 cột SKU + % giảm + Ngày kết thúc
    const sample = [
      { SKU: "SP-001", "Phan tram giam (%)": 30, "Ngay ket thuc": "2026-12-31 23:59:00" },
      { SKU: "SP-002", "Phan tram giam (%)": 20, "Ngay ket thuc": "" },
    ];
    const ws = XLSX.utils.aoa_to_sheet([
      ["SKU", "Phan tram giam (%)", "Ngay ket thuc"],
      ...sample.map((r) => [r.SKU, r["Phan tram giam (%)"], r["Ngay ket thuc"]]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "FlashSale");
    XLSX.writeFile(wb, "mau-flash-sale.xlsx");
  };

  const applyExcelImport = async () => {
    const validRows = excelRows.filter((r) => r.isValid);
    if (!validRows.length) return;
    if (!window.confirm(`Áp dụng Flash Sale cho ${validRows.length} sản phẩm?`)) return;
    setExcelBusy(true);
    try {
      await Promise.all(validRows.map((r) => onUpdateProduct(r.product.id, {
        flash_sale_discount: r.discount,
        flash_sale_end_at:   r.endAtIso || null,
      })));
      closeExcelModal();
    } catch (err) {
      setExcelError("Lỗi áp dụng: " + err.message);
    } finally {
      setExcelBusy(false);
    }
  };

  // Lọc & đánh dấu
  const now = Date.now();
  const decorated = allProducts.map((p) => {
    const disc = Number(p.flash_sale_discount);
    const hasDiscount = !Number.isNaN(disc) && disc > 0;
    const endTs = p.flash_sale_end_at ? new Date(p.flash_sale_end_at).getTime() : null;
    const isExpired = hasDiscount && endTs !== null && endTs <= now;
    const isActive  = hasDiscount && !isExpired;
    return { ...p, _hasDiscount: hasDiscount, _isActive: isActive, _isExpired: isExpired };
  });

  let visible = decorated;
  if (filter === "active")   visible = visible.filter((p) => p._isActive);
  if (filter === "expired")  visible = visible.filter((p) => p._isExpired);
  if (filter === "none")     visible = visible.filter((p) => !p._hasDiscount);
  if (search.trim()) {
    const s = search.toLowerCase();
    visible = visible.filter((p) => (p.name || "").toLowerCase().includes(s));
  }
  // Đưa SP đang active lên đầu
  visible.sort((a, b) => Number(b._isActive) - Number(a._isActive));

  const counts = {
    active:  decorated.filter((p) => p._isActive).length,
    expired: decorated.filter((p) => p._isExpired).length,
    none:    decorated.filter((p) => !p._hasDiscount).length,
  };

  return (
    <div className="hp-card">
      <h3 className="hp-card-title">Flash sale</h3>
      <p className="hp-card-desc">
        Chỉnh <strong>% giảm</strong> và <strong>thời điểm kết thúc</strong> trực tiếp trên từng sản phẩm. Sản phẩm có
        <code> flash_sale_discount &gt; 0</code> sẽ tự hiển thị trên trang chủ (giá hiển thị = <code>price × (1 − discount/100)</code>).
        Hết thời gian sẽ tự trả về giá gốc.
      </p>

      <div className="hp-field" style={{ marginBottom: 16, maxWidth: 480 }}>
        <label>Tiêu đề</label>
        <input type="text" value={draftCfg.title} onChange={(e) => setDraftCfg({ ...draftCfg, title: e.target.value })} />
      </div>
      <label className="hp-toggle">
        <input type="checkbox" checked={draftCfg.enabled} onChange={(e) => setDraftCfg({ ...draftCfg, enabled: e.target.checked })} />
        <span>Hiển thị flash sale</span>
      </label>
      <div className="hp-form-actions">
        <button type="button" className="hp-btn hp-btn-primary" onClick={saveCfg} disabled={busy}>{busy ? "Đang lưu..." : "Lưu cấu hình"}</button>
      </div>

      <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #e2e8f0" }} />

      <div className="hp-card-head">
        <div>
          <h3 className="hp-card-title" style={{ fontSize: 14 }}>Sản phẩm trong Flash Sale</h3>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Đang active: <strong style={{ color: "#dc2626" }}>{counts.active}</strong> ·
            Hết hạn: <strong>{counts.expired}</strong> ·
            Chưa tham gia: <strong>{counts.none}</strong>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap", alignItems: "center" }}>
        {[
          { id: "all",     label: `Tất cả (${decorated.length})` },
          { id: "active",  label: `Đang active (${counts.active})` },
          { id: "expired", label: `Hết hạn (${counts.expired})` },
          { id: "none",    label: `Chưa tham gia (${counts.none})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={`hp-type-tab ${filter === t.id ? "active" : ""}`}
            onClick={() => setFilter(t.id)}
          >
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button type="button" className="hp-btn hp-btn-secondary" onClick={downloadExcelTemplate} title="Tải file Excel mẫu gồm 3 cột: SKU, % giảm, Ngày kết thúc">
          <i className="fas fa-download" /> Tải mẫu Excel
        </button>
        <button type="button" className="hp-btn hp-btn-primary" onClick={openExcelModal}>
          <i className="fas fa-file-excel" /> Upload bảng giá sale
        </button>
      </div>

      <div className="hp-field">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên sản phẩm..." />
      </div>

      {error && <div className="hp-alert hp-alert-error" style={{ marginTop: 12 }}>⚠️ {error}</div>}

      {editingId && (
        <div className="hp-article-form">
          <div className="hp-grid-2">
            <div className="hp-field">
              <label>% giảm (0–100, để trống = rời flash sale)</label>
              <input
                type="number" min={0} max={100} step="0.01"
                value={draft.flash_sale_discount}
                onChange={(e) => setDraft({ ...draft, flash_sale_discount: e.target.value })}
                placeholder="VD: 30"
              />
            </div>
            <div className="hp-field">
              <label>Thời điểm kết thúc (để trống = không giới hạn)</label>
              <input
                type="datetime-local"
                value={draft.flash_sale_end_at}
                onChange={(e) => setDraft({ ...draft, flash_sale_end_at: e.target.value })}
              />
            </div>
          </div>
          <div className="hp-form-actions">
            <button type="button" className="hp-btn hp-btn-ghost" onClick={cancel}>Hủy</button>
            <button type="button" className="hp-btn hp-btn-primary" onClick={save} disabled={busy}>{busy ? "Đang lưu..." : "Lưu"}</button>
          </div>
        </div>
      )}

      {bulkEditing && (
        <div className="hp-article-form" style={{ borderColor: "#2563eb", background: "#eff6ff" }}>
          <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "#1d4ed8" }}>
            <i className="fas fa-bolt" /> Áp dụng Flash Sale cho {selected.size} sản phẩm
          </h4>
          <div className="hp-grid-2">
            <div className="hp-field">
              <label>% giảm (0–100, để trống = giữ nguyên)</label>
              <input
                type="number" min={0} max={100} step="0.01"
                value={bulkDraft.discount}
                onChange={(e) => setBulkDraft({ ...bulkDraft, discount: e.target.value })}
                placeholder="VD: 30"
              />
            </div>
            <div className="hp-field">
              <label>Thời điểm kết thúc (để trống = giữ nguyên)</label>
              <input
                type="datetime-local"
                value={bulkDraft.endAt}
                onChange={(e) => setBulkDraft({ ...bulkDraft, endAt: e.target.value })}
              />
            </div>
          </div>
          {bulkError && <div className="hp-alert hp-alert-error">⚠️ {bulkError}</div>}
          <div className="hp-form-actions">
            <button type="button" className="hp-btn hp-btn-ghost" onClick={cancelBulk} disabled={busy}>Hủy</button>
            <button type="button" className="hp-btn hp-btn-primary" onClick={applyBulk} disabled={busy || selected.size === 0}>
              {busy ? "Đang lưu..." : `Áp dụng cho ${selected.size} sản phẩm`}
            </button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="hp-empty"><i className="fas fa-bolt" /><p>Không có sản phẩm nào khớp bộ lọc.</p></div>
      ) : (
        <>
        {/* ─── Bulk action bar (chỉ hiện khi có chọn) ─── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          padding: "10px 14px", margin: "10px 0",
          background: selected.size > 0 ? "#eff6ff" : "transparent",
          border: selected.size > 0 ? "1px solid #93c5fd" : "1px dashed #e2e8f0",
          borderRadius: 8, transition: "all 0.15s",
        }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151" }}>
            <input
              type="checkbox"
              checked={visible.length > 0 && visible.every((p) => selected.has(p.id))}
              onChange={toggleSelectAllVisible}
            />
            <span>
              {selected.size > 0
                ? <>Đã chọn <strong style={{ color: "#1d4ed8" }}>{selected.size}</strong> / {visible.length} sản phẩm</>
                : "Chọn nhiều sản phẩm để áp dụng Flash Sale hàng loạt"}
            </span>
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            {selected.size > 0 && (
              <button type="button" className="hp-btn hp-btn-ghost" onClick={() => setSelected(new Set())}>
                Bỏ chọn
              </button>
            )}
            <button
              type="button"
              className="hp-btn hp-btn-primary"
              onClick={openBulk}
              disabled={selected.size === 0 || bulkEditing}
            >
              <i className="fas fa-bolt" /> Áp dụng cho {selected.size} SP
            </button>
          </div>
        </div>

        <div className="hp-article-list">
          {visible.map((p) => {
            const originalPrice = Number(p.price) || 0;
            const disc = Number(p.flash_sale_discount) || 0;
            const newPrice = disc > 0 ? Math.round(originalPrice * (1 - disc / 100)) : originalPrice;
            const isSelected = selected.has(p.id);
            return (
              <div key={p.id} className="hp-article-item" style={{ background: isSelected ? "#eff6ff" : undefined, borderColor: isSelected ? "#93c5fd" : undefined }}>
                <label style={{ display: "flex", alignItems: "center", padding: "0 8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(p.id)}
                  />
                </label>
                <div style={{ width: 50, height: 50, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#f1f5f9" }}>
                  {(p.image_url || p.image) && <img src={p.image_url || p.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <div className="hp-article-info">
                  <div className="hp-article-title">{p.name}</div>
                  <div className="hp-article-meta">
                    {p._isActive && (
                      <>
                        <strong style={{ color: "#dc2626" }}>{newPrice.toLocaleString("vi-VN")} đ</strong>
                        {disc > 0 && <span style={{ textDecoration: "line-through", marginLeft: 4 }}>{originalPrice.toLocaleString("vi-VN")} đ</span>}
                        <span style={{ marginLeft: 6, color: "#059669" }}>· -{disc}%</span>
                        {p.flash_sale_end_at && (
                          <span style={{ marginLeft: 6, color: "#64748b" }}>
                            · đến {new Date(p.flash_sale_end_at).toLocaleString("vi-VN")}
                          </span>
                        )}
                      </>
                    )}
                    {p._isExpired && (
                      <span style={{ color: "#94a3b8" }}>Đã hết hạn — sẽ hiển thị giá gốc {originalPrice.toLocaleString("vi-VN")} đ</span>
                    )}
                    {!p._hasDiscount && (
                      <span style={{ color: "#94a3b8" }}>Chưa tham gia flash sale · {originalPrice.toLocaleString("vi-VN")} đ</span>
                    )}
                  </div>
                </div>
                <div className="hp-article-actions">
                  {p._isActive && <span style={{ alignSelf: "center", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#dcfce7", color: "#16a34a" }}>ĐANG CHẠY</span>}
                  {p._isExpired && <span style={{ alignSelf: "center", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#fef3c7", color: "#d97706" }}>HẾT HẠN</span>}
                  <button type="button" className="hp-btn hp-btn-ghost" onClick={() => startEdit(p)}><i className="fas fa-edit" /> Sửa</button>
                  {p._hasDiscount && (
                    <button type="button" className="hp-btn hp-btn-danger" onClick={() => remove(p)} disabled={busy}>
                      <i className="fas fa-trash" /> Bỏ
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}

      {/* ─── Modal: Upload Excel Flash Sale ─── */}
      {excelModal && (
        <div className="hp-modal-overlay" onClick={closeExcelModal}>
          <div className="hp-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 920, width: "95%" }}>
            <div className="hp-modal-header">
              <h3 style={{ margin: 0, fontSize: 17 }}>
                <i className="fas fa-file-excel" /> Upload bảng giá Flash Sale
              </h3>
              <button type="button" className="hp-modal-close" onClick={closeExcelModal} disabled={excelBusy}>×</button>
            </div>
            <div className="hp-modal-body">
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px" }}>
                File Excel gồm 3 cột: <strong>SKU</strong>, <strong>% giảm</strong> (0–100), <strong>Ngày kết thúc</strong> (để trống = không giới hạn).
                Chỉ chấp nhận <strong>sản phẩm đang trên kệ</strong> (is_active = true).
                <a href="#" onClick={(e) => { e.preventDefault(); downloadExcelTemplate(); }} style={{ marginLeft: 8 }}>
                  Tải file mẫu
                </a>
              </p>

              <input
                ref={excelFileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelFile}
                style={{ display: "none" }}
              />
              <button
                type="button"
                className="hp-btn hp-btn-secondary"
                onClick={() => excelFileRef.current?.click()}
                disabled={excelBusy}
                style={{ marginBottom: 12 }}
              >
                <i className="fas fa-upload" /> {excelBusy ? "Đang đọc file..." : "Chọn file Excel"}
              </button>

              {excelError && (
                <div className="hp-alert hp-alert-error">⚠️ {excelError}</div>
              )}

              {excelRows.length > 0 && (
                <>
                  <div style={{ display: "flex", gap: 12, margin: "12px 0", fontSize: 13 }}>
                    <span><strong>Tổng:</strong> {excelStats.total}</span>
                    <span style={{ color: "#16a34a" }}><strong>Hợp lệ:</strong> {excelStats.valid}</span>
                    <span style={{ color: "#dc2626" }}><strong>Bỏ qua:</strong> {excelStats.invalid}</span>
                  </div>
                  <div style={{ maxHeight: 360, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead style={{ position: "sticky", top: 0, background: "#f9fafb" }}>
                        <tr>
                          <th style={th}>Dòng</th>
                          <th style={th}>SKU</th>
                          <th style={th}>Tên SP</th>
                          <th style={th}>% giảm</th>
                          <th style={th}>Ngày kết thúc</th>
                          <th style={th}>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelRows.map((r) => (
                          <tr key={r.rowNo} style={{ background: r.isValid ? "#f0fdf4" : "#fef2f2" }}>
                            <td style={td}>{r.rowNo}</td>
                            <td style={{ ...td, fontFamily: "monospace" }}>{r.sku || "—"}</td>
                            <td style={td}>{r.product?.name || <em style={{ color: "#9ca3af" }}>không tìm thấy</em>}</td>
                            <td style={td}>{String(r.discount ?? "—")}{r.isValid ? "%" : ""}</td>
                            <td style={td}>{r.endAt ? String(r.endAt) : <em style={{ color: "#9ca3af" }}>không giới hạn</em>}</td>
                            <td style={td}>
                              {r.isValid
                                ? <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ Sẽ áp dụng</span>
                                : <span style={{ color: "#dc2626" }}>✗ {r.reason}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
            <div className="hp-modal-footer">
              <button type="button" className="hp-btn hp-btn-ghost" onClick={closeExcelModal} disabled={excelBusy}>Đóng</button>
              <button
                type="button"
                className="hp-btn hp-btn-primary"
                onClick={applyExcelImport}
                disabled={excelBusy || excelStats.valid === 0}
              >
                {excelBusy ? "Đang áp dụng..." : `Áp dụng cho ${excelStats.valid} sản phẩm`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// styles phụ cho bảng preview
const th = { padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #e5e7eb", fontWeight: 600, color: "#374151", fontSize: 12 };
const td = { padding: "8px 10px", borderBottom: "1px solid #f3f4f6", color: "#1f2937" };

// ─── Section: Values (CRUD riêng, không liên quan tới products) ────────────
function ValuesSection({ values, onCreate, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft]     = useState({ icon: "fas fa-seedling", title: "", desc: "", sortOrder: 0, enabled: true });
  const [error, setError]     = useState("");

  const startNew = () => { setEditing("new"); setDraft({ icon: "fas fa-seedling", title: "", desc: "", sortOrder: values.length, enabled: true }); setError(""); };
  const startEdit = (v) => { setEditing(v.id); setDraft({ ...v }); setError(""); };
  const cancel = () => { setEditing(null); setError(""); };

  const save = async () => {
    setError("");
    if (!draft.title.trim()) { setError("Vui lòng nhập tiêu đề"); return; }
    try {
      if (editing === "new") await onCreate(draft);
      else                   await onUpdate(editing, draft);
      cancel();
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="hp-card">
      <div className="hp-card-head">
        <div>
          <h3 className="hp-card-title">Giá trị thương hiệu (Brand values)</h3>
          <p className="hp-card-desc">4 thẻ giá trị hiển thị ngay dưới hero banner. Icon dùng class FontAwesome.</p>
        </div>
        <button type="button" className="hp-btn hp-btn-primary" onClick={startNew}>
          <i className="fas fa-plus" /> Thêm giá trị
        </button>
      </div>

      {editing && (
        <div className="hp-article-form">
          <div className="hp-field">
            <label>Icon FontAwesome (VD: fas fa-seedling)</label>
            <input type="text" value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} />
            <small style={{ color: "#64748b" }}>Tham khảo: <a href="https://fontawesome.com/icons" target="_blank" rel="noreferrer">fontawesome.com/icons</a> (chọn Free, copy class)</small>
          </div>
          <div className="hp-field">
            <label>Tiêu đề</label>
            <input type="text" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className="hp-field">
            <label>Mô tả</label>
            <textarea rows={2} value={draft.desc} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} />
          </div>
          <div className="hp-grid-2">
            <div className="hp-field">
              <label>Thứ tự</label>
              <input type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })} />
            </div>
            <div className="hp-field" style={{ display: "flex", alignItems: "flex-end" }}>
              <label className="hp-toggle">
                <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
                <span>Hiển thị</span>
              </label>
            </div>
          </div>
          {error && <div className="hp-alert hp-alert-error">⚠️ {error}</div>}
          <div className="hp-form-actions">
            <button type="button" className="hp-btn hp-btn-ghost" onClick={cancel}>Hủy</button>
            <button type="button" className="hp-btn hp-btn-primary" onClick={save}>Lưu</button>
          </div>
        </div>
      )}

      {values.length === 0 ? (
        <div className="hp-empty">
          <i className="fas fa-seedling" />
          <p>Chưa có giá trị nào.</p>
        </div>
      ) : (
        <div className="hp-article-list">
          {values.map((v) => (
            <div key={v.id} className="hp-article-item">
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                <i className={v.icon} />
              </div>
              <div className="hp-article-info">
                <div className="hp-article-title">{v.title}</div>
                <div className="hp-article-meta">{v.desc}</div>
              </div>
              <div className="hp-article-actions">
                <button type="button" className="hp-btn hp-btn-ghost" onClick={() => startEdit(v)}>
                  <i className="fas fa-edit" /> Sửa
                </button>
                <button type="button" className="hp-btn hp-btn-danger" onClick={() => { if (window.confirm("Xóa?")) onRemove(v.id); }}>
                  <i className="fas fa-trash" /> Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section: Promo Banners ─────────────────────────────────────────────────
function PromoBannersSection({ items, onSave, onUploadFile }) {
  const byPos = useMemo(() => {
    const o = { left: null, right: null };
    for (const it of items) if (o[it.position] === null) o[it.position] = it;
    return o;
  }, [items]);

  return (
    <div className="hp-card">
      <h3 className="hp-card-title">2 banner quảng cáo nhỏ</h3>
      <p className="hp-card-desc">Hai banner đặt cạnh nhau giữa trang chủ. Mỗi vị trí (trái/phải) chỉ lưu 1 banner.</p>
      <div className="hp-grid-2">
        {["left", "right"].map((pos) => (
          <PromoCard key={pos} position={pos} item={byPos[pos]} onSave={onSave} onUploadFile={onUploadFile} />
        ))}
      </div>
    </div>
  );
}

function PromoCard({ position, item, onSave, onUploadFile }) {
  const [draft, setDraft] = useState(item || { position, tag: "", title: "", imageUrl: "", ctaText: "Mua ngay", ctaLink: "#", enabled: true });
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setDraft(item || { position, tag: "", title: "", imageUrl: "", ctaText: "Mua ngay", ctaLink: "#", enabled: true });
  }, [item, position]);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!isImageFile(f)) { setError("Vui lòng chọn ảnh"); return; }
    setBusy(true);
    try { const r = await onUploadFile(f, "promo"); setDraft((d) => ({ ...d, imageUrl: r.url })); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const save = async () => {
    setError("");
    if (!draft.title.trim()) { setError("Vui lòng nhập tiêu đề"); return; }
    setBusy(true);
    try {
      await onSave(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, background: "#f8fafc" }}>
      <h4 style={{ margin: "0 0 10px", fontSize: 14 }}>Banner {position === "left" ? "trái" : "phải"}</h4>
      <div className="hp-field">
        <label>Tag</label>
        <input type="text" value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })} placeholder="VD: Quà tặng ngọt ngào" />
      </div>
      <div className="hp-field">
        <label>Tiêu đề</label>
        <input type="text" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
      </div>
      <div className="hp-field">
        <label>Ảnh (tùy chọn)</label>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
        <div className="hp-upload-row">
          <button type="button" className="hp-btn hp-btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
            <i className="fas fa-upload" /> {busy ? "..." : "Tải ảnh"}
          </button>
          {draft.imageUrl && (
            <button type="button" className="hp-btn hp-btn-ghost" onClick={() => setDraft({ ...draft, imageUrl: "" })}>
              <i className="fas fa-trash" /> Xóa
            </button>
          )}
        </div>
        {draft.imageUrl && <div className="hp-preview" style={{ maxWidth: "100%" }}><img src={draft.imageUrl} alt="" /></div>}
      </div>
      <div className="hp-grid-2">
        <div className="hp-field">
          <label>CTA text</label>
          <input type="text" value={draft.ctaText} onChange={(e) => setDraft({ ...draft, ctaText: e.target.value })} />
        </div>
        <div className="hp-field">
          <label>CTA link</label>
          <input type="text" value={draft.ctaLink} onChange={(e) => setDraft({ ...draft, ctaLink: e.target.value })} />
        </div>
      </div>
      <label className="hp-toggle">
        <input type="checkbox" checked={draft.enabled !== false} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
        <span>Hiển thị</span>
      </label>
      {error && <div className="hp-alert hp-alert-error">⚠️ {error}</div>}
      {saved && <div className="hp-alert" style={{ background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}>✓ Đã lưu</div>}
      <div className="hp-form-actions">
        <button type="button" className="hp-btn hp-btn-primary" onClick={save} disabled={busy}>{busy ? "Đang lưu..." : "Lưu"}</button>
      </div>
    </div>
  );
}

// ─── Section: Blog (CRUD riêng) ─────────────────────────────────────────────
function BlogSection({ blogs, onCreate, onUpdate, onRemove, onUploadFile }) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft]     = useState({ title: "", desc: "", author: "Admin", imageUrl: "", link: "#", sortOrder: 0, enabled: true });
  const [error, setError]     = useState("");
  const [busy, setBusy]       = useState(false);
  const fileRef = useRef(null);

  const startNew = () => { setEditing("new"); setDraft({ title: "", desc: "", author: "Admin", imageUrl: "", link: "#", sortOrder: blogs.length, enabled: true }); setError(""); };
  const startEdit = (b) => { setEditing(b.id); setDraft({ ...b }); setError(""); };
  const cancel = () => { setEditing(null); setError(""); };

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!isImageFile(f)) { setError("Vui lòng chọn ảnh"); return; }
    setBusy(true);
    try { const r = await onUploadFile(f, "blog"); setDraft((d) => ({ ...d, imageUrl: r.url })); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const save = async () => {
    setError("");
    if (!draft.title.trim()) { setError("Vui lòng nhập tiêu đề"); return; }
    try {
      if (editing === "new") await onCreate(draft);
      else                   await onUpdate(editing, draft);
      cancel();
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="hp-card">
      <div className="hp-card-head">
        <div>
          <h3 className="hp-card-title">Góc chia sẻ (Blog)</h3>
          <p className="hp-card-desc">Các bài viết hiển thị cuối trang chủ shop.</p>
        </div>
        <button type="button" className="hp-btn hp-btn-primary" onClick={startNew}>
          <i className="fas fa-plus" /> Thêm bài viết
        </button>
      </div>

      {editing && (
        <div className="hp-article-form">
          <div className="hp-field">
            <label>Tiêu đề</label>
            <input type="text" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className="hp-field">
            <label>Mô tả ngắn</label>
            <textarea rows={2} value={draft.desc} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} />
          </div>
          <div className="hp-field">
            <label>Tác giả</label>
            <input type="text" value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} />
          </div>
          <div className="hp-field">
            <label>Ảnh bài viết</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
            <div className="hp-upload-row">
              <button type="button" className="hp-btn hp-btn-secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
                <i className="fas fa-upload" /> {busy ? "..." : (draft.imageUrl ? "Đổi ảnh" : "Tải ảnh")}
              </button>
              {draft.imageUrl && (
                <button type="button" className="hp-btn hp-btn-ghost" onClick={() => setDraft({ ...draft, imageUrl: "" })}>
                  <i className="fas fa-trash" /> Xóa
                </button>
              )}
            </div>
            {draft.imageUrl && <div className="hp-preview" style={{ maxWidth: 300 }}><img src={draft.imageUrl} alt="" /></div>}
          </div>
          <div className="hp-grid-2">
            <div className="hp-field">
              <label>Link</label>
              <input type="text" value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} />
            </div>
            <div className="hp-field">
              <label>Thứ tự</label>
              <input type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) || 0 })} />
            </div>
          </div>
          <label className="hp-toggle">
            <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
            <span>Hiển thị</span>
          </label>
          {error && <div className="hp-alert hp-alert-error">⚠️ {error}</div>}
          <div className="hp-form-actions">
            <button type="button" className="hp-btn hp-btn-ghost" onClick={cancel}>Hủy</button>
            <button type="button" className="hp-btn hp-btn-primary" onClick={save}>Lưu</button>
          </div>
        </div>
      )}

      {blogs.length === 0 ? (
        <div className="hp-empty"><i className="fas fa-newspaper" /><p>Chưa có bài viết blog nào.</p></div>
      ) : (
        <div className="hp-article-list">
          {blogs.map((b) => (
            <div key={b.id} className="hp-article-item">
              <div style={{ width: 80, height: 50, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "#f1f5f9" }}>
                {b.imageUrl && <img src={b.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              </div>
              <div className="hp-article-info">
                <div className="hp-article-title">{b.title}</div>
                <div className="hp-article-meta">{b.author} · {b.desc?.slice(0, 80)}…</div>
              </div>
              <div className="hp-article-actions">
                <button type="button" className="hp-btn hp-btn-ghost" onClick={() => startEdit(b)}><i className="fas fa-edit" /> Sửa</button>
                <button type="button" className="hp-btn hp-btn-danger" onClick={() => { if (window.confirm("Xóa?")) onRemove(b.id); }}><i className="fas fa-trash" /> Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [config, setConfig]     = useState(() => readCache() || DEFAULT_CONFIG);
  const [products, setProducts] = useState([]);      // tất cả products
  const [values, setValues]     = useState([]);
  const [promos, setPromos]     = useState([]);
  const [blogs, setBlogs]       = useState([]);

  const [activeTab, setActiveTab]     = useState("background");
  const [loading, setLoading]         = useState(true);
  const [saving,  setSaving]          = useState(false);
  const [savedToast, setSavedToast]   = useState(false);
  const [globalError, setGlobalError] = useState("");

  const saveTimer = useRef(null);
  const pendingConfig = useRef(null);
  const firstLoadDone = useRef(false);

  const flashSaleProductCount = useMemo(() => {
    const now = Date.now();
    return products.filter((p) => {
      const d = Number(p.flash_sale_discount);
      if (!d || d <= 0) return false;
      if (p.flash_sale_end_at && new Date(p.flash_sale_end_at).getTime() <= now) return false;
      return true;
    }).length;
  }, [products]);

  // ─── Load lần đầu từ API ────────────────────────────────────────────────
  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setGlobalError("");
      try {
        const [cfg, vals, promosRes, bg, productsRes] = await Promise.all([
          homepageApi.getConfig(),
          homepageValuesApi.getAll(),
          homepagePromoBannersApi.getAll(),
          homepageBlogApi.getAll(),
          productsApi.getAll({}),
        ]);
        if (ignore) return;
        setConfig({
          background: cfg.background || DEFAULT_CONFIG.background,
          hero:       cfg.hero       || DEFAULT_CONFIG.hero,
          sections:   cfg.sections   || DEFAULT_SECTIONS,
          flashSale:  cfg.flashSale  || DEFAULT_FLASH_SALE_CFG,
          popup:      cfg.popup      || DEFAULT_POPUP_CFG,
        });
        setValues((vals.data || []).map(mapValueFromDb));
        setPromos((promosRes.data || []).map(mapPromoFromDb));
        setBlogs((bg.data || []).map(mapBlogFromDb));
        setProducts(productsRes.data || []);
        writeCache({
          background: cfg.background || DEFAULT_CONFIG.background,
          hero:       cfg.hero       || DEFAULT_CONFIG.hero,
          sections:   cfg.sections   || DEFAULT_SECTIONS,
          flashSale:  cfg.flashSale  || DEFAULT_FLASH_SALE_CFG,
          popup:      cfg.popup      || DEFAULT_POPUP_CFG,
        });
      } catch (err) {
        if (!ignore) setGlobalError("Không tải được cấu hình từ server, đang hiển thị bản cache. " + err.message);
      } finally {
        if (!ignore) { setLoading(false); firstLoadDone.current = true; }
      }
    })();
    return () => { ignore = true; };
  }, []);

  // ─── Auto-save config (background + hero + sections + flashSale + popup) ─
  useEffect(() => {
    if (!firstLoadDone.current) return;

    pendingConfig.current = config;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const toSave = pendingConfig.current;
      if (!toSave) return;
      setSaving(true);
      try {
        const saved = await homepageApi.updateConfig({
          background: toSave.background,
          hero: toSave.hero,
          sections: toSave.sections,
          flashSale: toSave.flashSale,
          popup: toSave.popup,
        });
        // Chỉ ghi cache + toast; KHÔNG setConfig lại để tránh vòng lặp
        // (server trả về cùng nội dung, set lại sẽ trigger lại useEffect).
        writeCache(toSave);
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 1500);
      } catch (err) {
        setGlobalError("Lưu cấu hình thất bại: " + err.message);
      } finally { setSaving(false); }
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [config]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const setBackground = (background) => setConfig((c) => ({ ...c, background }));
  const setHero       = (hero)       => setConfig((c) => ({ ...c, hero }));
  const setSections   = (sections)   => setConfig((c) => ({ ...c, sections }));
  const setPopup       = (popup)      => setConfig((c) => ({ ...c, popup }));
  const setFlashSaleCfg = useCallback(async (flashSale) => {
    setConfig((c) => ({ ...c, flashSale }));
  }, []);

  const uploadFile = useCallback(async (file, subfolder = "misc") => {
    return await homepageApi.uploadFile(file, subfolder);
  }, []);

  // Values
  const addValue    = useCallback(async (v) => { const r = await homepageValuesApi.create(v); setValues((p) => [...p, mapValueFromDb(r)]); }, []);
  const updateValue = useCallback(async (id, v) => { const r = await homepageValuesApi.update(id, v); setValues((p) => p.map((x) => (x.id === id ? mapValueFromDb(r) : x))); }, []);
  const removeValue = useCallback(async (id) => { await homepageValuesApi.remove(id); setValues((p) => p.filter((x) => x.id !== id)); }, []);

  // Promo
  const savePromo = useCallback(async (p) => {
    const r = await homepagePromoBannersApi.upsert(p);
    setPromos((prev) => { const filtered = prev.filter((x) => x.position !== p.position); return [...filtered, mapPromoFromDb(r)]; });
  }, []);

  // Blog
  const addBlog    = useCallback(async (b) => { const r = await homepageBlogApi.create(b); setBlogs((p) => [...p, mapBlogFromDb(r)]); }, []);
  const updateBlog = useCallback(async (id, b) => { const r = await homepageBlogApi.update(id, b); setBlogs((p) => p.map((x) => (x.id === id ? mapBlogFromDb(r) : x))); }, []);
  const removeBlog = useCallback(async (id) => { await homepageBlogApi.remove(id); setBlogs((p) => p.filter((x) => x.id !== id)); }, []);

  // Cập nhật cột flash_sale_discount / flash_sale_end_at trực tiếp trên SP
  // (Admin không qua homepage_picks nữa — chỉnh thẳng trên products)
  const updateProductFlashSale = useCallback(async (productId, patch) => {
    const r = await productsApi.update(productId, patch);
    setProducts((p) => p.map((x) => (String(x.id) === String(productId) ? r : x)));
    return r;
  }, []);

  const resetAll = () => { if (window.confirm("Khôi phục background + hero về mặc định?")) setConfig((c) => ({ ...c, background: DEFAULT_CONFIG.background, hero: DEFAULT_CONFIG.hero })); };

  const stats = useMemo(() => ({
    bg:     config.background.type,
    hero:   config.hero.enabled ? "Bật" : "Tắt",
    values: values.length,
    cats:   products.length,                    // danh mục = tổng SP
    flash:  flashSaleProductCount,              // SP đang active trong flash sale
    promos: promos.length,
    popup:  config.popup?.enabled ? "Bật" : "Tắt",
    blogs:  blogs.length,
  }), [config, values, products, flashSaleProductCount, promos, blogs]);

  return (
    <div className="hp-wrapper">
      <div className="hp-header">
        <div>
          <h1>Quản lý trang chủ shop</h1>
          <p>Thay đổi toàn bộ nội dung hiển thị trên trang chủ Techtra Shop.</p>
        </div>
        <div className="hp-header-actions">
          {saving && <span className="hp-saving-badge"><i className="fas fa-spinner fa-spin" /> Đang lưu...</span>}
          <button type="button" className="hp-btn hp-btn-ghost" onClick={resetAll}>
            <i className="fas fa-undo" /> Mặc định
          </button>
        </div>
      </div>

      {globalError && (
        <div className="hp-alert hp-alert-error" style={{ marginBottom: 16 }}>
          ⚠️ {globalError}
        </div>
      )}

      <div className="hp-stats">
        <div className="hp-stat"><div className="hp-stat-icon" style={{ background: "#dbeafe", color: "#1d4ed8" }}><i className="fas fa-palette" /></div><div><div className="hp-stat-label">Background</div><div className="hp-stat-value">{stats.bg === "color" ? "Màu sắc" : stats.bg === "image" ? "Hình ảnh" : "Video"}</div></div></div>
        <div className="hp-stat"><div className="hp-stat-icon" style={{ background: "#dcfce7", color: "#16a34a" }}><i className="fas fa-image" /></div><div><div className="hp-stat-label">Hero</div><div className="hp-stat-value">{stats.hero}</div></div></div>
        <div className="hp-stat"><div className="hp-stat-icon" style={{ background: "#ede9fe", color: "#7c3aed" }}><i className="fas fa-seedling" /></div><div><div className="hp-stat-label">Values</div><div className="hp-stat-value">{stats.values}</div></div></div>
        <div className="hp-stat"><div className="hp-stat-icon" style={{ background: "#fce7f3", color: "#be185d" }}><i className="fas fa-th-large" /></div><div><div className="hp-stat-label">Danh mục</div><div className="hp-stat-value">{stats.cats}</div></div></div>
        <div className="hp-stat"><div className="hp-stat-icon" style={{ background: "#fee2e2", color: "#dc2626" }}><i className="fas fa-bolt" /></div><div><div className="hp-stat-label">Flash sale</div><div className="hp-stat-value">{stats.flash}</div></div></div>
        <div className="hp-stat"><div className="hp-stat-icon" style={{ background: "#cffafe", color: "#0e7490" }}><i className="fas fa-rectangle-ad" /></div><div><div className="hp-stat-label">Promo</div><div className="hp-stat-value">{stats.promos}</div></div></div>
        <div className="hp-stat"><div className="hp-stat-icon" style={{ background: "#ffe4e6", color: "#e11d48" }}><i className="fas fa-bullhorn" /></div><div><div className="hp-stat-label">Popup</div><div className="hp-stat-value">{stats.popup}</div></div></div>
        <div className="hp-stat"><div className="hp-stat-icon" style={{ background: "#dbeafe", color: "#1d4ed8" }}><i className="fas fa-newspaper" /></div><div><div className="hp-stat-label">Blog</div><div className="hp-stat-value">{stats.blogs}</div></div></div>
      </div>

      <div className="hp-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`hp-tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
            <i className={t.icon} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="hp-card" style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 8 }} />
          <p>Đang tải cấu hình từ server...</p>
        </div>
      ) : (
        <>
          {activeTab === "background" && <BackgroundSection config={config} onChange={setBackground} onUploadFile={uploadFile} />}
          {activeTab === "hero"       && <HeroSection      config={config} onChange={setHero}       onUploadFile={uploadFile} />}
          {activeTab === "sections"   && <SectionsToggleSection sections={config.sections} onChange={setSections} />}
          {activeTab === "values"     && <ValuesSection    values={values} onCreate={addValue} onUpdate={updateValue} onRemove={removeValue} />}
          {activeTab === "flashsale"  && <FlashSaleSection cfg={config.flashSale} onSaveCfg={setFlashSaleCfg} allProducts={products} onUpdateProduct={updateProductFlashSale} />}
          {activeTab === "promo"      && <PromoBannersSection items={promos} onSave={savePromo} onUploadFile={uploadFile} />}
          {activeTab === "popup"      && <PopupAnnouncementSection config={config} onChange={setPopup} onUploadFile={uploadFile} />}
          {activeTab === "blog"       && <BlogSection      blogs={blogs} onCreate={addBlog} onUpdate={updateBlog} onRemove={removeBlog} onUploadFile={uploadFile} />}
        </>
      )}

      {savedToast && (
        <div className="hp-toast">
          <i className="fas fa-check-circle" /> Đã lưu cấu hình
        </div>
      )}
    </div>
  );
}