document.addEventListener('DOMContentLoaded', () => {
    // Chờ partials (header/footer) load xong — vì nhiều selector phụ thuộc vào DOM được inject
    if (typeof window.__TECHTRA_PARTIALS_READY__ !== 'undefined' && window.__TECHTRA_PARTIALS_READY__) {
        bootApp();
    } else {
        document.addEventListener('partials:loaded', bootApp, { once: true });
        // Fallback nếu event không bắn (vd: partials.js lỗi) — chạy sau 2s
        setTimeout(() => {
            if (!window.__TECHTRA_BOOTED__) bootApp();
        }, 2000);
    }
});

function bootApp() {
    if (window.__TECHTRA_BOOTED__) return;
    window.__TECHTRA_BOOTED__ = true;
    initUIComponents();
    // Chờ homepageApi từ ESM bridge sẵn sàng (module load async)
    waitForHomepageApi()
        .then(() => loadHomepageData())
        .catch(() => loadHomepageData()); // vẫn gọi, bên trong sẽ fallback
}

// Lấy 6 bài viết "nhóm tin tức" được publish gần nhất từ bảng `posts`
// để đưa lên phần "Góc chia sẻ" trên trang chủ.
// - status = 'published'
// - Sắp xếp theo published_at desc, fallback created_at desc
// - Join với news_categories để biết tên nhóm
// Trả về mảng đã chuẩn hoá đúng shape mà renderBlogs() đang dùng
// (id, title, desc, author, image, imageUrl, date, link).
// Dynamic import api-service (singleton) để không phụ thuộc window.supabase
let __apiServicePromise = null;
function getApiService() {
    if (!__apiServicePromise) {
        __apiServicePromise = import("../api-service/api.js");
    }
    return __apiServicePromise;
}

async function loadLatestBlogPosts(limit = 6) {
    try {
        const { request } = await getApiService();
        // Backend trả về { success: true, data: [...] }
        const fetchPosts = async (orderBy) => {
            const params = new URLSearchParams({
                select: "id,title,slug,summary,excerpt_html,thumbnail,thumbnail_source,author_id,published_at,created_at,category_id",
                status: "eq.published",
                order: orderBy,
                limit: String(limit),
            });
            const res = await request("GET", `/db/posts?${params.toString()}`);
            return Array.isArray(res) ? res : (res?.data || []);
        };

        let list = await fetchPosts("published_at.desc");
        if (!list.length) {
            list = await fetchPosts("created_at.desc");
        }

        // Lấy tên nhóm nếu có category_id
        const catIds = Array.from(new Set(list.map((r) => r.category_id).filter(Boolean)));
        let catMap = {};
        if (catIds.length) {
            const inList = `in.(${catIds.join(",")})`;
            const catsRes = await request(
                "GET",
                `/db/news_categories?select=id,name,slug&id=${inList}`
            );
            const cats = Array.isArray(catsRes) ? catsRes : (catsRes?.data || []);
            catMap = Object.fromEntries(cats.map((c) => [c.id, c]));
        }
        const enriched = list.map((r) => ({ ...r, news_categories: catMap[r.category_id] || null }));
        return mapPostsToBlogShape(enriched);
    } catch (err) {
        console.warn("[blog] loadLatestBlogPosts error:", err);
        return [];
    }
}

// Chuẩn hoá row `posts` → shape renderBlogs() mong đợi
function mapPostsToBlogShape(rows) {
    return rows.map((r) => {
        const d = r.published_at || r.created_at;
        let dateStr = "";
        if (d) {
            const dt = new Date(d);
            dateStr = `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
        }
        // Ảnh: ưu tiên thumbnail upload; nếu rỗng thì dùng thumbnail_source
        const img = r.thumbnail || r.thumbnail_source || "";
        // Link: trỏ về trang chi tiết tin tức (nếu có slug), kèm query category
        const cat = r.news_categories;
        let link = "#";
        if (r.slug) {
            const params = new URLSearchParams();
            params.set("slug", r.slug);
            if (cat?.slug) params.set("cat", cat.slug);
            link = `/components/tin-tuc/tin-tuc.html?${params.toString()}`;
        }
        return {
            id: r.id,
            title: r.title || "",
            desc: r.summary || stripHtml(r.excerpt_html || "").slice(0, 180) || "",
            author: "Admin",
            image: img,
            imageUrl: img,
            date: dateStr,
            link,
            categoryName: cat?.name || "",
        };
    });
}

// Loại bỏ thẻ HTML để lấy text thuần cho đoạn mô tả ngắn
function stripHtml(html) {
    if (!html) return "";
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
}

function waitForHomepageApi(timeoutMs = 3000) {
    return new Promise((resolve) => {
        const start = Date.now();
        (function check() {
            if (window.homepageApi) return resolve();
            if (Date.now() - start > timeoutMs) return resolve();
            setTimeout(check, 50);
        })();
    });
}

/* ==========================================================================
   1. MOCK DATA FALLBACK (chỉ dùng khi API lỗi)
   ========================================================================== */
const FALLBACK = {
    slides: [
        { id: 1, badge: "Sản phẩm mới", title: "Tóc Mây Dược Liệu <span>Bưởi Đỏ</span>", desc: "Giải pháp thuần chay ngăn gãy rụng, kích thích mọc tóc.", image: "https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&w=1200&q=80", link: "#" },
        { id: 2, badge: "Ưu đãi độc quyền", title: "Chăm Da Khỏe Đẹp <span>Mỗi Ngày</span>", desc: "Bộ sản phẩm dưỡng sáng da hoa hồng hữu cơ.", image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80", link: "#" },
        { id: 3, badge: "Đón hè rạng rỡ", title: "Son Ngọc <span>Không Chì</span>", desc: "Bảng màu thời thượng từ khoáng đá thiên nhiên.", image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=1200&q=80", link: "#" },
    ],
    categories: [
        { id: "skincare", name: "Chăm sóc da", image: "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=200&q=80", link: "#" },
        { id: "haircare", name: "Chăm sóc tóc", image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=200&q=80", link: "#" },
        { id: "makeup", name: "Trang điểm môi", image: "https://images.unsplash.com/photo-1625093742435-6fa192b6fb10?auto=format&fit=crop&w=200&q=80", link: "#" },
    ],
    flashSale: { products: [] },
    bestSellers: [],
    blogs: [
        { id: 301, title: "Top 5 Thành Phần Thiên Nhiên Giúp Phục Hồi Tóc Rụng", desc: "Khám phá bí quyết chăm sóc tóc thảo dược an toàn hiệu quả từ tinh dầu bưởi, bồ kết.", image: "" },
    ],
};

/* ==========================================================================
   2. API LOADER (Gọi Supabase qua homepageApi)
   ========================================================================== */

// Cache kết quả trong session để tránh gọi lại nhiều lần
let HOMEPAGE_DATA = null;

async function loadHomepageData() {
    // Đợi 1 chút để thấy skeleton
    const SKELETON_DELAY = 400;
    await new Promise((r) => setTimeout(r, SKELETON_DELAY));

    let data = null;
    try {
        // homepageApi được expose qua window (xem bên dưới)
        if (window.homepageApi && typeof window.homepageApi.getAll === "function") {
            data = await window.homepageApi.getAll();
        } else {
            console.warn("homepageApi chưa sẵn sàng, dùng fallback");
        }
    } catch (err) {
        console.error("Lỗi load homepage:", err);
    }

    if (!data) data = {
        config: {
            background: { type: "color", color: "#6a11cb", imageUrl: "", videoUrl: "" },
            hero: { enabled: false, imageUrl: "", title: "", subtitle: "", ctaText: "", ctaLink: "#" },
            sections: {
                heroSlider: true, brandValues: true, categories: true,
                flashSale: true, bestSellers: true, promoBanners: true,
                blog: true, newsletter: true,
            },
            flashSale: { title: "Giờ Vàng Deal Xịn", countdownSeconds: 10800, enabled: true },
            popup: { enabled: false, title: "THÔNG BÁO", imageUrl: "", link: "", dontShowDays: 7 },
        },
        slides: FALLBACK.slides,
        values: [],
        categories: FALLBACK.categories,
        promos: [],
        flashSale: FALLBACK.flashSale,
        blogs: FALLBACK.blogs,
    };

    // ── "Góc chia sẻ" lấy từ bảng `posts` (nhóm tin tức) — 6 bài mới nhất ──
    // Ghi đè data.blogs bằng kết quả từ posts; nếu lỗi/rỗng → giữ blogs cũ.
    const latestPosts = await loadLatestBlogPosts(6);
    if (latestPosts.length) data.blogs = latestPosts;
    if (!data.config) data.config = {};
    if (!data.config.background) data.config.background = { type: "color", color: "#6a11cb" };
    if (!data.config.hero) data.config.hero = { enabled: false };
    if (!data.config.sections) data.config.sections = { heroSlider: false, brandValues: false, categories: false, flashSale: false, bestSellers: false, promoBanners: false, blog: false, newsletter: false };
    if (!data.config.popup) data.config.popup = { enabled: false, title: "THÔNG BÁO", imageUrl: "", link: "", dontShowDays: 7 };
    HOMEPAGE_DATA = data;

    // 1. Áp background
    applyBackground(data.config.background);

    // 2. Ẩn/hiện section theo cờ
    toggleSections(data.config.sections);

    // 2b. Hero banner tĩnh (admin upload) — hiển thị nếu hero.enabled && có ảnh
    if (data.config.hero && data.config.hero.enabled) {
        renderHero(data.config.hero);
    } else {
        hideSection("hero-banner-section");
    }

    // 3. Render slider (nếu section bật)
    if (data.config.sections.heroSlider) {
        // Debug: log ra số slide nhận được để biết slider lỗi do API hay FE
        console.log("[homepage] slides =", data.slides);
        renderBanners(data.slides);
        if (data.slides && data.slides.length) initSlider();
    } else {
        hideSection("hero-slider-section");
    }

    // 4. Brand values
    if (data.config.sections.brandValues) {
        renderValues(data.values);
    } else {
        hideSection("brand-values");
    }

    // 5. Categories
    if (data.config.sections.categories) {
        renderCategories(data.categories);
    } else {
        hideSection("categories-section-el");
    }

    // 5.1 Slider text (chữ chạy từ product_groups.slider_text)
    if (data.config.sections.sliderText && data.sliderTexts && data.sliderTexts.length) {
        renderSliderText(data.sliderTexts);
    } else {
        hideSection("slider-text-section-el");
    }

    // 5.2 Intro section (giới thiệu product-group)
    if (data.config.sections.intro && data.introItems && data.introItems.length) {
        renderIntroSection(data.introItems);
    } else {
        hideSection("intro-section-el");
    }

    // 6. Flash sale
    console.log("[homepage] flashSale =", data.flashSale);
    if (data.config.sections.flashSale) {
        if (data.flashSale && data.flashSale.products && data.flashSale.products.length) {
            renderFlashSale(data.flashSale.products);
            applyFlashSaleConfig(data.flashSale);
        } else {
            // Section được bật nhưng chưa có SP flash sale
            const c = document.getElementById('flash-sale-products-container');
            if (c) c.innerHTML = `<p style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#64748b;">Chưa có sản phẩm Flash Sale. Vào admin → Trang chủ → tab "Flash sale" để thêm.</p>`;
        }
    } else {
        hideSection("flash-sale-panel");
    }

    // 7. Promo banners
    if (data.config.sections.promoBanners) {
        renderPromoBanners(data.promos || []);
    } else {
        hideSection("promotional-banners-section");
    }

    // 7.5 Best sellers — lấy từ data.bestSellers (đã query trong homepageApi.getAll)
    if (data.config.sections.bestSellers) {
        renderBestSellersSection(data.bestSellers || [], data.categories || []);
    } else {
        hideSection("best-sellers-section-el");
    }

    // 8. Blog
    if (data.config.sections.blog) {
        renderBlogs(data.blogs);
    } else {
        hideSection("blog-posts-section");
    }

    // 9. Newsletter
    if (!data.config.sections.newsletter) {
        hideSection("newsletter-section");
    }

    // 10. Popup thông báo — hiện modal khi vào trang chủ (nếu bật + chưa bị ẩn)
    renderPopupAnnouncement(data.config.popup);
}

function hideSection(selectorOrId) {
    // Thử theo id trước, rồi theo class
    let el = document.getElementById(selectorOrId) || document.querySelector("." + selectorOrId);
    if (el) el.style.display = "none";
}

function toggleSections(sections) {
    if (!sections) return;
    if (!sections.bestSellers) hideSection("best-sellers-section-el");
}

function applyBackground(bg) {
    if (!bg) return;
    const body = document.body;
    // Xóa các style cũ do script thêm
    body.style.background = "";
    body.style.backgroundImage = "";
    body.style.backgroundSize = "";
    body.style.backgroundPosition = "";
    body.style.backgroundAttachment = "";

    if (bg.type === "color" && bg.color) {
        body.style.background = bg.color;
    } else if (bg.type === "image" && bg.imageUrl) {
        body.style.backgroundImage = `url("${bg.imageUrl}")`;
        body.style.backgroundSize = "cover";
        body.style.backgroundPosition = "center";
        body.style.backgroundAttachment = "fixed";
    } else if (bg.type === "video" && bg.videoUrl) {
        // Tạo / lấy <video> background nằm fixed phía sau
        let v = document.getElementById("hp-bg-video");
        if (!v) {
            v = document.createElement("video");
            v.id = "hp-bg-video";
            v.autoplay = true;
            v.muted = true;
            v.loop = true;
            v.playsInline = true;
            v.style.cssText = "position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:-1;";
            document.body.prepend(v);
        }
        v.src = bg.videoUrl;
    }
}

function applyFlashSaleConfig(cfg) {
    if (!cfg) return;
    // Cập nhật tiêu đề
    const titleEl = document.querySelector(".flash-sale-title");
    if (titleEl && cfg.title) {
        // Giữ icon
        titleEl.innerHTML = `<i class="fa-solid fa-bolt"></i> ${cfg.title}`;
    }
    // Cập nhật countdown
    if (cfg.countdown_seconds && typeof startCountdown === "function") {
        startCountdown(cfg.countdown_seconds);
    }
}

/* ==========================================================================
   2b. POPUP THÔNG BÁO (modal lớn hiện khi khách vào trang chủ)
   --------------------------------------------------------------------------
   - Chỉ hiện khi popup.enabled === true VÀ popup.imageUrl có giá trị.
   - Nút "Đóng": chỉ ẩn cho phiên hiện tại (không lưu gì) — lần load trang
     sau (F5 hoặc vào lại) sẽ hiện lại.
   - Nút "Không hiển thị lại": lưu localStorage với hạn = now + dontShowDays
     ngày; trong khoảng đó popup sẽ không tự hiện nữa trên trình duyệt này.
   ========================================================================== */

const POPUP_STORAGE_KEY = "hp_popup_dismissed_until";

function renderPopupAnnouncement(popup) {
    // Dọn popup cũ (nếu load lại data / gọi lại hàm)
    const oldOverlay = document.getElementById("hp-popup-overlay");
    if (oldOverlay) oldOverlay.remove();

    if (!popup || !popup.enabled || !popup.imageUrl) return;

    // Kiểm tra khách đã bấm "Không hiển thị lại" và còn trong hạn hay chưa
    try {
        const dismissedUntil = Number(localStorage.getItem(POPUP_STORAGE_KEY) || 0);
        if (dismissedUntil && Date.now() < dismissedUntil) return;
    } catch { /* localStorage có thể bị chặn (chế độ ẩn danh...) — vẫn cứ hiện popup */ }

    injectPopupStyles();

    const overlay = document.createElement("div");
    overlay.id = "hp-popup-overlay";
    overlay.className = "hp-popup-overlay";

    const imgTag = popup.link
        ? `<a href="${popup.link}" class="hp-popup-img-link"><img src="${escapeAttr(popup.imageUrl)}" alt="Thông báo"></a>`
        : `<img src="${escapeAttr(popup.imageUrl)}" alt="Thông báo">`;

    overlay.innerHTML = `
        <div class="hp-popup-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(popup.title || 'Thông báo')}">
            <div class="hp-popup-header">
                <span class="hp-popup-title"><i class="fa-solid fa-bell"></i> ${escapeHtml(popup.title || 'THÔNG BÁO')}</span>
                <button type="button" class="hp-popup-close-x" aria-label="Đóng">&times;</button>
            </div>
            <div class="hp-popup-body">
                ${imgTag}
            </div>
            <div class="hp-popup-footer">
                <button type="button" class="hp-popup-btn hp-popup-btn-ghost" id="hp-popup-dont-show">Không hiển thị lại</button>
                <button type="button" class="hp-popup-btn hp-popup-btn-primary" id="hp-popup-close">Đóng</button>
            </div>
        </div> 
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    const closePopup = () => {
        overlay.remove();
        document.body.style.overflow = "";
    };

    overlay.querySelector("#hp-popup-close").addEventListener("click", closePopup);
    overlay.querySelector(".hp-popup-close-x").addEventListener("click", closePopup);
    // Bấm ra ngoài modal cũng đóng (giữ nguyên hành vi "Đóng", không lưu gì)
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closePopup(); });

    overlay.querySelector("#hp-popup-dont-show").addEventListener("click", () => {
        try {
            const days = Number(popup.dontShowDays) > 0 ? Number(popup.dontShowDays) : 7;
            const until = Date.now() + days * 24 * 60 * 60 * 1000;
            localStorage.setItem(POPUP_STORAGE_KEY, String(until));
        } catch { /* bỏ qua nếu không lưu được */ }
        closePopup();
    });
}

// Style cho popup — chèn 1 lần duy nhất (nếu đã có thì bỏ qua)
function injectPopupStyles() {
    if (document.getElementById("hp-popup-styles")) return;
    const style = document.createElement("style");
    style.id = "hp-popup-styles";
    style.textContent = `
        .hp-popup-overlay {
            position: fixed; inset: 0; z-index: 9999;
            background: rgba(15, 23, 42, 0.6);
            display: flex; align-items: center; justify-content: center;
            padding: 20px;
            animation: hpPopupFadeIn 0.2s ease-out;
        }
        @keyframes hpPopupFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .hp-popup-modal {
            background: #fff; border-radius: 14px; overflow: hidden;
            width: 100%; max-width: 460px;
            max-height: 90vh;
            display: flex; flex-direction: column;
            box-shadow: 0 20px 50px rgba(0,0,0,0.25);
            animation: hpPopupSlideUp 0.25s ease-out;
        }
        @keyframes hpPopupSlideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .hp-popup-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 14px 18px; border-bottom: 1px solid #f1f5f9; flex-shrink: 0;
        }
        .hp-popup-title { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #dc2626; font-size: 16px; }
        .hp-popup-close-x {
            background: none; border: none; font-size: 22px; line-height: 1; color: #94a3b8;
            cursor: pointer; padding: 4px 8px;
        }
        .hp-popup-close-x:hover { color: #475569; }
        .hp-popup-body { overflow-y: auto; flex: 1 1 auto; }
        .hp-popup-body img { width: 100%; display: block; }
        .hp-popup-footer {
            display: flex; justify-content: flex-end; gap: 10px;
            padding: 14px 18px; border-top: 1px solid #f1f5f9; flex-shrink: 0;
        }
        .hp-popup-btn {
            padding: 9px 16px; border-radius: 8px; font-size: 14px; font-weight: 600;
            cursor: pointer; border: 1px solid transparent;
        }
        .hp-popup-btn-ghost { background: #fff; color: #475569; border-color: #e2e8f0; }
        .hp-popup-btn-ghost:hover { background: #f8fafc; }
        .hp-popup-btn-primary { background: #dc2626; color: #fff; }
        .hp-popup-btn-primary:hover { background: #b91c1c; }
        @media (max-width: 480px) {
            .hp-popup-footer { flex-direction: column-reverse; }
            .hp-popup-btn { width: 100%; }
        }
    `;
    document.head.appendChild(style);
}


/* ==========================================================================
   3. RENDERING FUNCTIONS (Thay thế các Skeleton bằng Dữ liệu thật)
   ========================================================================== */

// Render Hero banner tĩnh (admin upload 1 ảnh + tiêu đề + CTA)
function renderHero(hero) {
    const section = document.getElementById('hero-banner-section');
    const inner   = document.getElementById('hero-banner-inner');
    if (!section || !inner) return;
    if (!hero || !hero.imageUrl) { section.style.display = 'none'; return; }

    section.style.display = '';
    const bgStyle = `background-image: linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.45)), url('${hero.imageUrl}')`;
    const ctaHtml = hero.ctaText
        ? `<a href="${hero.ctaLink || '#'}" class="btn btn-primary">${escapeHtml(hero.ctaText)}</a>`
        : '';
    inner.innerHTML = `
        <div class="hero-banner-bg" style="${bgStyle}">
            <div class="hero-banner-content">
                <h2 class="hero-banner-title">${escapeHtml(hero.title || '')}</h2>
                ${hero.subtitle ? `<p class="hero-banner-subtitle">${escapeHtml(hero.subtitle)}</p>` : ''}
                ${ctaHtml}
            </div>
        </div>
    `;
}

// Render Banner Slider
function renderBanners(banners) {
    const container = document.getElementById('slider-container-el');
    const dotsContainer = document.getElementById('slider-dots-container');

    if (!container) return;
    if (!banners || banners.length === 0) {
        // Không có slide từ admin → hiện thông báo thay vì skeleton mãi
        container.innerHTML = `
            <div class="slide active placeholder-slide" style="display:flex;align-items:center;justify-content:center;background:#f1f5f9;">
                <div style="text-align:center;padding:60px 20px;color:#64748b;">
                    <i class="fa-solid fa-images" style="font-size:48px;opacity:0.4;"></i>
                    <p style="margin-top:12px;font-weight:500;">Chưa có slide nào được cấu hình.</p>
                    <p style="font-size:0.85rem;margin-top:6px;">Vào admin → Trang chủ → tab "Slider" và bật cờ <code>is_slider</code> cho nhóm sản phẩm.</p>
                </div>
            </div>
        `;
        if (dotsContainer) dotsContainer.innerHTML = '';
        return;
    }
    container.innerHTML = '';
    if (dotsContainer) dotsContainer.innerHTML = '';

    banners.forEach((banner, index) => {
        const activeClass = index === 0 ? 'active' : '';
        // imageUrl được map từ API; fallback sang image nếu backend cũ
        const imgUrl = banner.imageUrl || banner.image || "";
        // Nếu không có ảnh nhưng có icon FontAwesome → dùng icon làm visual
        const hasIcon = banner.icon && /^(fas|far|fab|fa)\s+/.test(banner.icon);
        const bgStyle = imgUrl
            ? `background-image: linear-gradient(rgba(255,255,255,0.7), rgba(255,255,255,0.8)), url('${imgUrl}')`
            : (hasIcon
                ? `background: linear-gradient(135deg, #f0f7eb 0%, #e8f0d8 100%);`
                : '');
        const iconHTML = (!imgUrl && hasIcon)
            ? `<div class="slide-icon-fa"><i class="${banner.icon}" aria-hidden="true"></i></div>`
            : '';
        // Title có thể chứa HTML (cho phép in đậm), nên KHÔNG escape title
        const slideHTML = `
            <div class="slide ${activeClass}" data-slide-id="${banner.id}">
                <div class="slide-bg" style="${bgStyle}"></div>
                <div class="container">
                    <div class="slide-content">
                        ${iconHTML}
                        ${banner.badge ? `<span class="slide-badge">${escapeHtml(banner.badge)}</span>` : ''}
                        <h2 class="slide-title">${banner.title || ''}</h2>
                        <p class="slide-desc">${escapeHtml(banner.desc || '')}</p>
                        <a href="${banner.link || '#'}" class="btn btn-primary">Khám Phá Ngay</a>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', slideHTML);

        // Tạo dấu chấm
        if (dotsContainer) {
            const dotHTML = `<span class="slider-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>`;
            dotsContainer.insertAdjacentHTML('beforeend', dotHTML);
        }
    });
}

// Render 4 thẻ giá trị thương hiệu
function renderValues(values) {
    const container = document.querySelector(".brand-values .values-grid");
    if (!container) return;
    if (!values || values.length === 0) return; // Giữ nguyên HTML mặc định
    container.innerHTML = values.map((v) => `
        <div class="value-card">
            <div class="value-icon"><i class="${v.icon}"></i></div>
            <h3 class="value-title">${escapeHtml(v.title)}</h3>
            <p class="value-desc">${escapeHtml(v.desc || "")}</p>
        </div>
    `).join("");
}

// Render 2 banner quảng cáo nhỏ (trái / phải)
function renderPromoBanners(promos) {
    const left  = document.getElementById("promo-banner-left");
    const right = document.getElementById("promo-banner-right");
    const list = { left, right };
    if (!left || !right) return;
    if (!promos || promos.length === 0) return; // giữ placeholder

    for (const p of promos) {
        const el = list[p.position];
        if (!el) continue;
        el.classList.remove("placeholder-banner");
        if (p.imageUrl) {
            const imgWrap = el.querySelector(".promo-banner-img");
            if (imgWrap) imgWrap.style.backgroundImage = `url("${p.imageUrl}")`;
        }
        const tagEl  = el.querySelector(".promo-tag");
        const titleEl = el.querySelector(".promo-title");
        const ctaEl   = el.querySelector(".btn");
        if (tagEl   && p.tag)   tagEl.textContent = p.tag;
        if (titleEl && p.title) titleEl.textContent = p.title;
        if (ctaEl) {
            if (p.ctaText) ctaEl.textContent = p.ctaText;
            if (p.ctaLink) ctaEl.setAttribute("href", p.ctaLink);
        }
    }
}

// Helper escape HTML cơ bản để tránh XSS khi render tiêu đề/mô tả từ DB
function escapeHtml(s) {
    if (s == null) return "";
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// Render Danh mục nổi bật
function renderCategories(categories) {
    const container = document.getElementById('categories-container-el');
    if (!container) return;
    if (!categories || categories.length === 0) return; // giữ nguyên skeleton
    container.innerHTML = '';

    categories.forEach(cat => {
        // imageUrl nếu là URL → render <img>; fallback FontAwesome icon
        let visualHTML;
        if (cat.imageUrl) {
            visualHTML = `<img class="category-img" src="${cat.imageUrl}" alt="${escapeHtml(cat.name)}" loading="lazy" onerror="this.style.display='none'">`;
        } else {
            visualHTML = `<i class="fas fa-folder category-icon-fa" aria-hidden="true"></i>`;
        }
        // Card chữ nhật: ảnh trái + text phải (name + description)
        const catHTML = `
            <a href="${cat.link || '#'}" class="category-card" data-cat-id="${cat.id}">
                <div class="category-img-wrapper">
                    ${visualHTML}
                </div>
                <div class="category-info">
                    <h3 class="category-name">${escapeHtml(cat.name)}</h3>
                    ${cat.description ? `<p class="category-desc">${escapeHtml(cat.description)}</p>` : ''}
                </div>
            </a>
        `;
        container.insertAdjacentHTML('beforeend', catHTML);
    });
}

// Render slider text (chữ chạy ngang — slider_text từ product_groups)
function renderSliderText(texts) {
    const section = document.getElementById('slider-text-section-el');
    const track = document.getElementById('slider-text-track-el');
    if (!section || !track) return;
    if (!texts || !texts.length) return;
    section.style.display = 'block';
    // Lặp lại 2 lần để marquee chạy mượt, tạo vòng lặp liên tục
    const items = [...texts, ...texts];
    track.innerHTML = items.map((t) => `<span class="slider-text-item">${escapeHtml(t)}</span>`).join('');
}

// Render phần giới thiệu product-groups (intro_title + intro_subtitle + intro_image_url)
// Mỗi intro item: text bên trái / ảnh bên phải — đảo chiều cho item chẵn (zigzag)
function renderIntroSection(items) {
    const section = document.getElementById('intro-section-el');
    const list = document.getElementById('intro-list-el');
    if (!section || !list) return;
    if (!items || !items.length) return;
    section.style.display = 'block';
    list.innerHTML = '';
    items.forEach((it) => {
        const mediaHTML = it.imageUrl
            ? `<div class="intro-item__media" style="background-image:url('${escapeHtml(it.imageUrl)}')"></div>`
            : `<div class="intro-item__media intro-item__media--placeholder"><i class="fas fa-image"></i></div>`;
        const itemHTML = `
            <article class="intro-item">
                <div class="intro-item__text">
                    ${it.name ? `<span class="intro-item__eyebrow">${escapeHtml(it.name)}</span>` : ''}
                    ${it.title ? `<h3 class="intro-item__title">${escapeHtml(it.title)}</h3>` : ''}
                    ${it.subtitle ? `<p class="intro-item__subtitle">${escapeHtml(it.subtitle)}</p>` : ''}
                    <a href="${it.link || '#'}" class="intro-item__cta">
                        Khám phá <i class="fa-solid fa-arrow-right"></i>
                    </a>
                </div>
                ${mediaHTML}
            </article>
        `;
        list.insertAdjacentHTML('beforeend', itemHTML);
    });
}

// Helper: Định dạng giá tiền VNĐ
function formatPrice(number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
}

// Render Sản phẩm Flash Sale
function renderFlashSale(products) {
    const container = document.getElementById('flash-sale-products-container');
    if (!container) return;
    if (!products || products.length === 0) return; // giữ skeleton
    container.innerHTML = '';

    products.forEach(prod => {
        const img = prod.imageUrl || prod.image || "";
        // SP hết hạn: không hiện badge % giảm, không có oldPrice (đã là giá gốc), chỉ hiện badge "Hết hạn"
        const isExpired = !!prod.isExpired;
        const discountBadge = (!isExpired && prod.oldPrice && prod.price < prod.oldPrice)
            ? `<span class="product-badge sale">-${Math.round((prod.oldPrice - prod.price) / prod.oldPrice * 100)}%</span>`
            : '';
        const oldPriceHTML = (!isExpired && prod.oldPrice && prod.price < prod.oldPrice)
            ? `<span class="product-old-price">${formatPrice(prod.oldPrice)}</span>`
            : '';
        const expiredBadge = isExpired
            ? '<span class="product-badge expired">Hết hạn</span>'
            : '';

        const prodHTML = `
            <div class="product-card${isExpired ? ' is-expired' : ''}" data-product-id="${prod.id}">
                <div class="product-badge-group">
                    ${discountBadge}
                    ${expiredBadge}
                    ${prod.isNew ? '<span class="product-badge new">Mới</span>' : ''}
                </div>
                <button class="product-wishlist" aria-label="Thêm vào danh sách yêu thích" onclick="toggleWishlist('${prod.id}', this)">
                    <i class="fa-regular fa-heart"></i>
                </button>
                <a href="#" class="product-img-link">
                    <img class="product-img" src="${img}" alt="${escapeHtml(prod.title)}" loading="lazy">
                </a>
                <div class="product-info">
                    <span class="product-category">${escapeHtml(prod.category || '')}</span>
                    <h3 class="product-title"><a href="#">${escapeHtml(prod.title)}</a></h3>
                    <div class="product-rating">
                        <i class="fa-solid fa-star"></i>
                        <span>${prod.rating}</span>
                        <span class="product-rating-count">(${prod.reviews || 0})</span>
                    </div>
                    <div class="product-price-wrapper">
                        <span class="product-price">${formatPrice(prod.price)}</span>
                        ${oldPriceHTML}
                    </div>
                    ${isExpired
                        ? '<div class="flash-sale-expired-note">Đã kết thúc</div>'
                        : `<div class="flash-sale-stock">
                            <div class="stock-bar">
                                <div class="stock-bar-fill" style="width: ${prod.percentSold || 0}%"></div>
                            </div>
                            <div class="stock-text">
                                <span>Đã bán: <strong>${prod.percentSold || 0}%</strong></span>
                                <span>Số lượng có hạn</span>
                            </div>
                        </div>`}
                    <button class="btn btn-primary btn-add-cart" onclick="addToCart('${prod.id}', '${escapeAttr(prod.title)}', ${prod.price}, '${img}', ${prod.weight || 0}, '${escapeAttr(prod.weight_unit || 'g')}')"${isExpired ? ' disabled' : ''}>
                        <i class="fa-solid fa-cart-plus"></i> ${isExpired ? 'Hết hạn' : 'Thêm vào giỏ'}
                    </button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', prodHTML);
    });
}

function escapeAttr(s) {
    return String(s || "").replaceAll("'", "\\'").replaceAll('"', '&quot;');
}

// Render Sản phẩm bán chạy nhất — section wrapper (gồm tabs + grid)
function renderBestSellersSection(products, categories) {
    const section = document.getElementById('best-sellers-section-el');
    if (!section) return;

    const tabsNav = document.getElementById('best-sellers-tabs-nav');
    const gridContainer = document.getElementById('best-sellers-grid-container');

    // Nếu chưa có sản phẩm → ẩn section, không vẽ tab rỗng
    if (!products || products.length === 0) {
        section.style.display = 'none';
        return;
    }

    // Phân biệt nguồn dữ liệu: "sales" (đã có đơn bán) | "fallback" (chưa có → sản phẩm cũ nhất)
    const isFallback = products.every((p) => p.source === "fallback");
    const titleEl = section.querySelector('.section-title');
    const subtitleEl = section.querySelector('.section-subtitle');
    if (isFallback) {
        if (titleEl) titleEl.textContent = 'Sản phẩm nổi bật';
        if (subtitleEl) subtitleEl.textContent = 'Những sản phẩm được hàng triệu người Việt tin dùng';
    } else {
        if (titleEl) titleEl.textContent = 'Sản phẩm bán chạy nhất';
        if (subtitleEl) subtitleEl.textContent = 'Những sản phẩm được hàng triệu người Việt tin dùng';
    }

    // Build tabs: "Tất cả" + các nhóm CHA có sản phẩm bán chạy
    const tabList = [{ id: 'all', name: 'Tất cả' }];
    const usedSlugs = new Set(products.map((p) => p.category));
    for (const cat of (categories || [])) {
        if (usedSlugs.has(cat.name) || usedSlugs.has(cat.slug) || usedSlugs.has(String(cat.id))) {
            tabList.push({ id: cat.slug || cat.name || cat.id, name: cat.name });
        }
    }

    // Render tabs
    if (tabsNav) {
        tabsNav.innerHTML = tabList.map((t, i) =>
            `<button class="tab-btn${i === 0 ? ' active' : ''}" data-tab-id="${escapeAttr(t.id)}">${escapeHtml(t.name)}</button>`
        ).join('');

        tabsNav.querySelectorAll('.tab-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                tabsNav.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                renderBestSellers(products, btn.getAttribute('data-tab-id'));
            });
        });
    }

    // Initial render: tab "Tất cả"
    renderBestSellers(products, 'all');
}

// Render grid sản phẩm cho 1 tab
function renderBestSellers(products, categoryFilter) {
    const container = document.getElementById('best-sellers-grid-container');
    if (!container) return;

    // Tạo cấu trúc Grid
    container.innerHTML = '<div class="products-grid"></div>';
    const gridEl = container.querySelector('.products-grid');

    // Lọc theo danh mục (slug hoặc id)
    const filteredProducts = categoryFilter === 'all'
        ? products
        : products.filter((p) => p.category === categoryFilter);

    if (filteredProducts.length === 0) {
        gridEl.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">Chưa có sản phẩm thuộc danh mục này.</p>`;
        return;
    }

    filteredProducts.forEach((prod) => {
        const discountBadge = prod.oldPrice
            ? `<span class="product-badge sale">-${Math.round((prod.oldPrice - prod.price) / prod.oldPrice * 100)}%</span>`
            : '';
        const oldPriceHTML = prod.oldPrice
            ? `<span class="product-old-price">${formatPrice(prod.oldPrice)}</span>`
            : '';
        const productLink = prod.link || '#';
        const categoryText = prod.categoryName || 'Mỹ phẩm';

        const prodHTML = `
            <div class="product-card" data-product-id="${prod.id}">
                <div class="product-badge-group">
                    ${discountBadge}
                    ${prod.isNew ? '<span class="product-badge new">Mới</span>' : ''}
                </div>
                <button class="product-wishlist" aria-label="Thêm vào yêu thích" onclick="toggleWishlist(${prod.id}, this)">
                    <i class="fa-regular fa-heart"></i>
                </button>
                <a href="${productLink}" class="product-img-link">
                    <img class="product-img" src="${escapeAttr(prod.image)}" alt="${escapeAttr(prod.title)}" loading="lazy">
                </a>
                <div class="product-info">
                    <span class="product-category">${escapeHtml(categoryText)}</span>
                    <h3 class="product-title"><a href="${productLink}">${escapeHtml(prod.title)}</a></h3>
                    <div class="product-rating">
                        <i class="fa-solid fa-star"></i>
                        <span>${prod.rating}</span>
                        <span class="product-rating-count">(${prod.reviews})</span>
                    </div>
                    <div class="product-price-wrapper">
                        <span class="product-price">${formatPrice(prod.price)}</span>
                        ${oldPriceHTML}
                    </div>
                    <button class="btn btn-primary btn-add-cart" onclick="addToCart(${prod.id}, '${escapeAttr(prod.title)}', ${prod.price}, '${escapeAttr(prod.image)}', ${prod.weight || 0}, '${escapeAttr(prod.weight_unit || 'g')}')">
                        <i class="fa-solid fa-cart-plus"></i> Thêm vào giỏ
                    </button>
                </div>
            </div>
        `;
        gridEl.insertAdjacentHTML('beforeend', prodHTML);
    });
}

// Render các bài viết Blog
function renderBlogs(blogs) {
    const container = document.getElementById('blog-container-el');
    if (!container) return;
    if (!blogs || blogs.length === 0) return; // giữ nguyên skeleton cũ
    container.innerHTML = '';

    blogs.forEach(blog => {
        // Sinh date từ created_at nếu không có sẵn
        let dateStr = blog.date;
        if (!dateStr) {
            const now = new Date();
            dateStr = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
        }
        const img = blog.image || blog.imageUrl || "";
        const catBadge = blog.categoryName
            ? `<span class="blog-category-badge"><i class="fa-solid fa-folder-open"></i> ${escapeHtml(blog.categoryName)}</span>`
            : '';
        const blogHTML = `
            <article class="blog-card" data-blog-id="${blog.id}">
                <a href="${blog.link || '#'}" class="blog-img-link">
                    ${img ? `<img src="${img}" alt="${escapeHtml(blog.title)}" loading="lazy">` : ''}
                </a>
                <div class="blog-content">
                    <div class="blog-meta">
                        ${catBadge}
                        <span><i class="fa-regular fa-calendar-days"></i> ${dateStr}</span>
                        <span><i class="fa-regular fa-user"></i> ${escapeHtml(blog.author || 'Admin')}</span>
                    </div>
                    <h3 class="blog-title"><a href="${blog.link || '#'}">${escapeHtml(blog.title)}</a></h3>
                    <p class="blog-desc">${escapeHtml(blog.desc || '')}</p>
                    <a href="${blog.link || '#'}" class="blog-readmore">Đọc chi tiết <i class="fa-solid fa-arrow-right-long"></i></a>
                </div>
            </article>
        `;
        container.insertAdjacentHTML('beforeend', blogHTML);
    });
}


/* ==========================================================================
   4. UI INTERACTIONS & COMPONENTS INITIALIZATION
   ========================================================================== */

let cart = []; // Giỏ hàng lưu trữ các item dạng: { id, title, price, image, qty, weight, weight_unit }
let wishlist = new Set(); // Bộ sưu tập yêu thích

const CART_KEY = "techtra_cart";

function saveCart() {
    try {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {
        // ignore quota errors
    }
}

function loadCart() {
    try {
        const raw = localStorage.getItem(CART_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function initUIComponents() {
    // Khôi phục giỏ hàng từ localStorage khi khởi tạo UI
    cart = loadCart();

    // Header Sticky shrink
    const header = document.getElementById('main-header-el');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('shrink');
            } else {
                header.classList.remove('shrink');
            }
        });
    }

    // Mobile Navigation Drawer
    const menuToggle = document.getElementById('menu-toggle-btn');
    const mobileDrawer = document.getElementById('mobile-menu-drawer-el');
    const mobileOverlay = document.getElementById('mobile-menu-overlay-el');
    const drawerClose = document.getElementById('mobile-drawer-close-btn');

    if (menuToggle && mobileDrawer && mobileOverlay) {
        const toggleMobileMenu = () => {
            mobileDrawer.classList.toggle('active');
            mobileOverlay.classList.toggle('active');
            document.body.style.overflow = mobileDrawer.classList.contains('active') ? 'hidden' : '';
        };

        menuToggle.addEventListener('click', toggleMobileMenu);
        mobileOverlay.addEventListener('click', toggleMobileMenu);
        if (drawerClose) drawerClose.addEventListener('click', toggleMobileMenu);
    }

    // Mini Cart Drawer toggles
    const cartToggle = document.getElementById('cart-drawer-toggle');
    const cartDrawer = document.getElementById('cart-drawer-el');
    const cartOverlay = document.getElementById('cart-drawer-overlay-el');
    const cartClose = document.getElementById('cart-drawer-close-btn');

    if (cartToggle && cartDrawer && cartOverlay) {
        const toggleCart = () => {
            cartDrawer.classList.toggle('active');
            cartOverlay.classList.toggle('active');
            document.body.style.overflow = cartDrawer.classList.contains('active') ? 'hidden' : '';
        };

        cartToggle.addEventListener('click', toggleCart);
        cartOverlay.addEventListener('click', toggleCart);
        if (cartClose) cartClose.addEventListener('click', toggleCart);
    }

    // LƯU Ý: Best Sellers tabs đã được wire trong renderBestSellersSection()
    // khi section được render — không cần handler ở đây nữa.

    // Flash Sale Countdown Timer
    startCountdown();

    // Newsletter submit handler
    const newsletterForm = document.getElementById('newsletter-subscription-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('newsletter-email-field').value;
            alert(`Cảm ơn bạn! Phiếu giảm giá 10% đã được gửi đến email: ${email}`);
            newsletterForm.reset();
        });
    }

    // Search form submit
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const keyword = document.getElementById('search-input').value;
            if (keyword.trim()) {
                alert(`Hệ thống đang tìm kiếm các sản phẩm phù hợp với từ khóa: "${keyword}"`);
            }
        });
    }

    // Checkout button click
    const checkoutBtn = document.getElementById('checkout-button-el');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) {
                alert("Giỏ hàng của bạn đang trống! Hãy thêm sản phẩm trước.");
            } else {
                saveCart();
                window.location.href = '/components/thanh-toan/thanh-toan.html';
            }
        });
    }
}

/* ==========================================================================
   5. DYNAMIC HERO SLIDER CONTROLS (Sau khi render banner)
   ========================================================================== */

function initSlider() {
    const slides = document.querySelectorAll('.hero-slider .slide');
    const dots = document.querySelectorAll('.hero-slider .slider-dot');
    const nextBtn = document.getElementById('slider-next-btn');
    const prevBtn = document.getElementById('slider-prev-btn');
    let currentSlide = 0;
    let slideInterval;

    if (slides.length === 0) return;

    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        currentSlide = (index + slides.length) % slides.length;
        slides[currentSlide].classList.add('active');
        if (dots[currentSlide]) dots[currentSlide].classList.add('active');
    }

    function nextSlide() {
        showSlide(currentSlide + 1);
    }

    function prevSlide() {
        showSlide(currentSlide - 1);
    }

    function startAutoPlay() {
        clearInterval(slideInterval);
        slideInterval = setInterval(nextSlide, 5000); // 5 seconds
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            nextSlide();
            startAutoPlay();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            prevSlide();
            startAutoPlay();
        });
    }

    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const index = parseInt(dot.getAttribute('data-index'));
            showSlide(index);
            startAutoPlay();
        });
    });

    startAutoPlay();
}

/* ==========================================================================
   6. INTERACTIVE CART & WISHLIST LOGIC (Hoạt động độc lập bằng JS)
   ========================================================================== */

// Thêm sản phẩm vào giỏ hàng (có trọng lượng phục vụ J&T / vận chuyển)
window.addToCart = function(id, title, price, image, weight = 0, weightUnit = 'g') {
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.qty += 1;
    } else {
        const grams = String(weightUnit).toLowerCase() === 'kg' ? Number(weight || 0) * 1000 : Number(weight || 0);
        cart.push({ id, title, price, image, qty: 1, weight, weight_unit: weightUnit, weight_grams: grams });
    }

    saveCart();
    updateCartUI();
    
    // Tự động mở Giỏ hàng nhanh để thông báo khách hàng
    const cartDrawer = document.getElementById('cart-drawer-el');
    const cartOverlay = document.getElementById('cart-drawer-overlay-el');
    if (cartDrawer && !cartDrawer.classList.contains('active')) {
        cartDrawer.classList.add('active');
        cartOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

// Cập nhật giao diện giỏ hàng
function updateCartUI() {
    const emptyMsg = document.getElementById('cart-empty-msg');
    const itemsWrapper = document.getElementById('cart-items-wrapper');
    const cartBadge = document.getElementById('cart-badge-count');
    const cartHeaderPrice = document.getElementById('cart-header-price');
    const cartDrawerCount = document.getElementById('cart-drawer-count');
    const cartDrawerTotal = document.getElementById('cart-drawer-total-price');

    // Tính toán số lượng và tổng giá tiền
    const totalItems = cart.reduce((acc, curr) => acc + curr.qty, 0);
    const totalPrice = cart.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);

    // Cập nhật Header indicators
    if (cartBadge) cartBadge.textContent = totalItems;
    if (cartHeaderPrice) cartHeaderPrice.textContent = formatPrice(totalPrice);
    if (cartDrawerCount) cartDrawerCount.textContent = totalItems;
    if (cartDrawerTotal) cartDrawerTotal.textContent = formatPrice(totalPrice);

    if (cart.length === 0) {
        if (emptyMsg) emptyMsg.style.display = 'block';
        if (itemsWrapper) {
            itemsWrapper.style.display = 'none';
            itemsWrapper.innerHTML = '';
        }
    } else {
        if (emptyMsg) emptyMsg.style.display = 'none';
        if (itemsWrapper) {
            itemsWrapper.style.display = 'block';
            itemsWrapper.innerHTML = '';

            cart.forEach(item => {
                const itemHTML = `
                    <div class="cart-item" data-cart-id="${item.id}">
                        <img class="cart-item-img" src="${item.image}" alt="${item.title}">
                        <div class="cart-item-details">
                            <h4 class="cart-item-title">${item.title}</h4>
                            <div class="cart-item-price">${formatPrice(item.price)}</div>
                            <div class="cart-item-qty">
                                <button onclick="changeQty(${item.id}, -1)">-</button>
                                <span>${item.qty}</span>
                                <button onclick="changeQty(${item.id}, 1)">+</button>
                            </div>
                        </div>
                        <button class="cart-item-remove" onclick="removeCartItem(${item.id})" aria-label="Xóa">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
                `;
                itemsWrapper.insertAdjacentHTML('beforeend', itemHTML);
            });
        }
    }
}

// Thay đổi số lượng sản phẩm trong giỏ hàng
window.changeQty = function(id, delta) {
    const item = cart.find(item => item.id === id);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
        removeCartItem(id);
    } else {
        saveCart();
        updateCartUI();
    }
};

// Xóa sản phẩm khỏi giỏ hàng
window.removeCartItem = function(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    updateCartUI();
};

// Yêu thích sản phẩm
window.toggleWishlist = function(id, element) {
    if (wishlist.has(id)) {
        wishlist.delete(id);
        element.classList.remove('active');
        element.querySelector('i').classList.replace('fa-solid', 'fa-regular');
    } else {
        wishlist.add(id);
        element.classList.add('active');
        element.querySelector('i').classList.replace('fa-regular', 'fa-solid');
        
        // Micro-animation tạo cảm giác sống động khi click trái tim
        element.style.transform = 'scale(1.3)';
        setTimeout(() => element.style.transform = '', 200);
    }
    
    // Cập nhật số lượng yêu thích
    const wishlistCount = document.getElementById('wishlist-count');
    if (wishlistCount) wishlistCount.textContent = wishlist.size;
};

/* ==========================================================================
   7. FLASH SALE TIMER (Đếm ngược 3 giờ ngẫu nhiên mỗi phiên)
   ========================================================================== */

function startCountdown(initialSeconds) {
    const hoursEl = document.getElementById('hours-box');
    const minutesEl = document.getElementById('minutes-box');
    const secondsEl = document.getElementById('seconds-box');

    if (!hoursEl || !minutesEl || !secondsEl) return;

    // Mặc định 3 tiếng, hoặc dùng giá trị truyền vào từ config admin
    let totalSeconds = (typeof initialSeconds === "number" && initialSeconds > 0) ? initialSeconds : 3 * 60 * 60;
    if (window.__hpCountdownInterval) clearInterval(window.__hpCountdownInterval);

    function tick() {
        if (totalSeconds <= 0) totalSeconds = 3 * 60 * 60;
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        hoursEl.textContent = String(hrs).padStart(2, '0');
        minutesEl.textContent = String(mins).padStart(2, '0');
        secondsEl.textContent = String(secs).padStart(2, '0');
        totalSeconds--;
    }

    tick();
    window.__hpCountdownInterval = setInterval(tick, 1000);
} 