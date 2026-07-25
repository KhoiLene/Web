import { productsApi, productGroupsApi } from "../api-service/api.js";

// ─── Lấy slug từ URL ────────────────────────────────────────────────────────
// Hỗ trợ 2 dạng:
//   1) /san-pham.html?slug=xink  (query string, dùng khi dev local / Live Server)
//   2) /san-pham/xink            (URL đẹp, Nginx rewrite về ?slug=xink)
function getSlugFromUrl() {
  // Ưu tiên 1: query string ?slug=
  const params = new URLSearchParams(window.location.search);
  if (params.has("slug")) return params.get("slug");

  // Ưu tiên 2: lấy slug từ path /san-pham/<slug>
  const match = window.location.pathname.match(/^\/san-pham\/([^/]+)\/?$/);
  if (match) return decodeURIComponent(match[1]);

  // Trường hợp dùng Live Server hay serve tĩnh với đường dẫn /san-pham/slug
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  if (pathParts[0] === "san-pham" && pathParts[1]) {
    return decodeURIComponent(pathParts[1]);
  }

  return "";
}

function formatVND(n) {
  return Number(n || 0).toLocaleString("vi-VN") + "đ";
}

// ─── State ──────────────────────────────────────────────────────────────────
let product = null;
let activeImageIndex = 0;
let quantity = 1;
let reviews = [];
// ─── DOM refs ───────────────────────────────────────────────────────────────
const $loading      = document.getElementById("loadingState");
const $error        = document.getElementById("errorState");
const $wrapper       = document.getElementById("productWrapper");
const $breadcrumb    = document.getElementById("breadcrumb");

const $mainImage     = document.getElementById("mainImage");
const $mainVideo     = document.getElementById("mainVideo");
const $thumbnails     = document.getElementById("thumbnails");

const $name           = document.getElementById("productName");
const $sku            = document.getElementById("productSku");
const $finalPrice     = document.getElementById("finalPrice");
const $oldPrice       = document.getElementById("oldPrice");
const $discountBadge  = document.getElementById("discountBadge");
const $stockInfo      = document.getElementById("stockInfo");
const $codInfo        = document.getElementById("codInfo");

const $qtyValue        = document.getElementById("qtyValue");
const $qtyMinus        = document.getElementById("qtyMinus");
const $qtyPlus          = document.getElementById("qtyPlus");

const $btnAddCart       = document.getElementById("btnAddCart");
const $btnBuyNow        = document.getElementById("btnBuyNow");

const $descriptionContent = document.getElementById("descriptionContent");
const $descriptionBox = document.querySelector(".description-box");
const $toggleDescriptionButton = document.getElementById("toggleDescriptionButton");
const $reviewSummary = document.getElementById("reviewSummary");
const $reviewList = document.getElementById("reviewList");
const $reviewForm = document.getElementById("reviewForm");
const $reviewRating = document.getElementById("reviewRating");
const $reviewText = document.getElementById("reviewText");
const $submitReview = document.getElementById("submitReview");

const DESCRIPTION_COLLAPSED_HEIGHT = 260;

const $relatedSection = document.getElementById("relatedSection");
const $relatedGrid     = document.getElementById("relatedGrid");
const $relatedPrev     = document.getElementById("relatedPrev");
const $relatedNext     = document.getElementById("relatedNext");

// Cart badge được render từ partial Header/heafer.html (id="cart-badge-count")
let $cartBadge         = document.getElementById("cart-badge-count");
let $cartHeaderPrice   = document.getElementById("cart-header-price");

// ─── Fetch sản phẩm theo slug ─────────────────────────────────────────────────
async function fetchProductBySlug(slug) {
  const res = await productsApi.getBySlug(slug);
  const found = res.data;

  let group_name = null;
  if (found.group_id) {
    try {
      const groupRes = await productGroupsApi.getOne(found.group_id);
      group_name = groupRes.data?.name || null;
    } catch {}
  }

  return {
    ...found,
    group_name,
    final_price: found.price * (1 - (found.discount || 0) / 100),
  };
}

// ─── Fetch sản phẩm tương tự (cùng nhóm) ─────────────────────────────────────
function normalizeProductImages(product) {
  if (!product) return [];
  if (Array.isArray(product.images) && product.images.length) {
    return product.images
      .map((img) => (typeof img === "string" ? img.trim() : img))
      .filter(Boolean);
  }
  if (typeof product.images === "string" && product.images.trim()) {
    const trimmed = product.images.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((img) => (typeof img === "string" ? img.trim() : img)).filter(Boolean);
      }
    } catch {
      if (trimmed.includes(",")) {
        return trimmed.split(",").map((img) => img.trim()).filter(Boolean);
      }
      if (trimmed.includes(";")) {
        return trimmed.split(";").map((img) => img.trim()).filter(Boolean);
      }
      return [trimmed];
    }
  }
  if (typeof product.image_url === "string" && product.image_url.trim()) return [product.image_url.trim()];
  if (typeof product.image === "string" && product.image.trim()) return [product.image.trim()];
  return [];
}

function decodeHtmlEntities(value) {
  const textArea = document.createElement("textarea");
  textArea.innerHTML = value;
  return textArea.value;
}

async function fetchRelatedProducts(groupId, excludeId) {
  if (!groupId) return [];
  try {
    const res = await productsApi.getAll({ group_id: groupId, limit: 5 });
    return (res.data || []).filter((p) => p.id !== excludeId).slice(0, 4);
  } catch {
    return [];
  }
}

// ─── Load sản phẩm ────────────────────────────────────────────────────────────
async function loadProduct() {
  const slug = getSlugFromUrl();
  if (!slug) {
    showError("Không tìm thấy sản phẩm trong URL");
    return;
  }
  try {
    product = await fetchProductBySlug(slug);
    renderProduct();
    loadRelated();
  } catch (err) {
    showError(err.message);
  }
}

async function loadRelated() {
  const related = await fetchRelatedProducts(product.group_id, product.id);

  if ($relatedSection) $relatedSection.style.display = "block";
  if (!related.length) {
    $relatedGrid.innerHTML = `
      <div class="empty-note">Hiện chưa có gợi ý sản phẩm phù hợp.</div>
    `;
    return;
  }

  $relatedGrid.innerHTML = related.map((p) => {
    const price = p.price * (1 - (p.discount || 0) / 100);
    const images = normalizeProductImages(p);
    const img = images.length ? images[0] : "/placeholder.png";
    const hasDiscount = Number(p.discount) > 0;
    const rating = Number(p.rating || 5).toFixed(1);
    const reviewCount = Number(p.reviews || 0);

    return `
      <a class="related-card" href="/san-pham/${p.slug}">
        <div class="related-card__media">
          <img src="${img}" alt="${p.name}">
          ${hasDiscount ? `<span class="related-card__badge">-${Number(p.discount).toFixed(0)}%</span>` : ""}
        </div>
        <div class="related-card__details">
          <div class="name">${p.name}</div>
          <div class="price-row">
            <span class="current-price">${formatVND(price)}</span>
            ${hasDiscount ? `<span class="old-price">${formatVND(p.price)}</span>` : ""}
          </div>
          <div class="rating-row related-rating">
            <span class="stars">★★★★★</span>
            <span class="review-count">${rating} / 5 · ${reviewCount} đánh giá</span>
          </div>
        </div>
      </a>
    `;
  }).join("");

  updateRelatedNavButtons();
}

function hasHorizontalOverflow(element) {
  if (!element) return false;
  return element.scrollWidth > element.clientWidth + 4;
}

function updateRelatedNavButtons() {
  if (!$relatedPrev || !$relatedNext || !$relatedGrid) return;
  const overflow = hasHorizontalOverflow($relatedGrid);
  $relatedPrev.disabled = !overflow;
  $relatedNext.disabled = !overflow;
  $relatedPrev.classList.toggle("disabled", !overflow);
  $relatedNext.classList.toggle("disabled", !overflow);
}

function scrollRelated(direction = 1) {
  if (!$relatedGrid) return;
  const card = $relatedGrid.querySelector(".related-card");
  const step = card ? card.offsetWidth + 18 : $relatedGrid.clientWidth * 0.8;
  $relatedGrid.scrollBy({ left: step * direction, behavior: "smooth" });
  setTimeout(updateRelatedNavButtons, 250);
}

$relatedPrev?.addEventListener("click", () => scrollRelated(-1));
$relatedNext?.addEventListener("click", () => scrollRelated(1));
$relatedGrid?.addEventListener("scroll", updateRelatedNavButtons);
window.addEventListener("resize", updateRelatedNavButtons);

function showError(message) {
  $loading.style.display = "none";
  $error.style.display = "block";
  $error.textContent = "⚠️ " + message;
}

function cleanInlineStyle(style) {
  return style
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .filter((rule) => {
      const prop = rule.split(":")[0]?.trim().toLowerCase();
      return [
        "float",
        "clear",
        "margin",
        "margin-top",
        "margin-right",
        "margin-bottom",
        "margin-left",
        "padding",
        "padding-top",
        "padding-right",
        "padding-bottom",
        "padding-left",
        "width",
        "height",
        "max-width",
        "min-width",
        "max-height",
        "min-height",
        "line-height",
        "text-align",
        "vertical-align",
        "display",
        "font-size",
        "font-weight",
        "font-style",
        "color",
        "background-color",
        "border-radius",
        "object-fit",
        "float",
      ].includes(prop);
    })
    .join("; ");
}

// Cho phép giữ lại style="..." để giữ định dạng Word (in đậm/nghiêng/màu/font-size).
// Vẫn lọc bỏ các thuộc tính nguy hiểm (on*, script...).
const SAFE_ATTRS = new Set([
  "src", "alt", "href", "title", "target", "rel", "colspan", "rowspan",
  "scope", "style", "class", "align", "width", "height", "size", "color",
  "face", "id",
]);

function sanitizeDescriptionHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Loại bỏ toàn bộ <script>/<style>/<iframe>/<object>/<embed>/<form>...
  ["script", "style", "iframe", "object", "embed", "form", "link", "meta"].forEach((tag) => {
    doc.body.querySelectorAll(tag).forEach((el) => el.remove());
  });

  const elements = doc.body.querySelectorAll("*");
  elements.forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value || "";
      // Bỏ mọi thuộc tính sự kiện on* (onclick, onload, onerror...)
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
        return;
      }
      // Bỏ javascript: trong href/src
      if ((name === "href" || name === "src") && /^\s*javascript:/i.test(value)) {
        el.removeAttribute(attr.name);
        return;
      }
      if (!SAFE_ATTRS.has(name)) {
        el.removeAttribute(attr.name);
      }
    });
    // Đảm bảo link mở ra tab mới an toàn
    if (el.tagName === "A" && el.getAttribute("target") === "_blank") {
      el.setAttribute("rel", "noopener noreferrer");
    }
  });

  return doc.body.innerHTML;
}

function formatDescription(description) {
  if (!description) return "";
  const text = description.toString().trim();
  if (!text) return "";

  let decoded = decodeHtmlEntities(text);

  // Chuyển Markdown ảnh thành thẻ <img> để không hiển thị raw markdown text.
  decoded = decoded.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    return `<img src="${src}" alt="${alt}">`;
  });

  // KHÔNG xóa style="..." ở đây nữa — để format Word được giữ nguyên.
  // Việc lọc style nguy hiểm đã làm trong sanitizeDescriptionHtml().

  if (/<[a-z][\s\S]*>/i.test(decoded)) {
    return sanitizeDescriptionHtml(decoded);
  }
  return decoded.replace(/\r?\n/g, "<br>");
}

function getReviewStorageKey() {
  return `techtra_product_reviews_${product?.slug || getSlugFromUrl()}`;
}

function loadReviews() {
  try {
    reviews = JSON.parse(localStorage.getItem(getReviewStorageKey()) || "[]");
  } catch {
    reviews = [];
  }
}

function saveReviews() {
  localStorage.setItem(getReviewStorageKey(), JSON.stringify(reviews));
}

function renderReviews() {
  const rowCount = reviews.length;
  if (rowCount > 0) {
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / rowCount;
    $reviewSummary.innerHTML = `
      <div class="review-score">
        <strong>${avgRating.toFixed(1)}</strong> / 5
        <span>(${rowCount} đánh giá)</span>
      </div>
    `;
  } else if (product?.reviews) {
    $reviewSummary.innerHTML = `
      <div class="review-score">
        <strong>${Number(product.reviews || 0) > 0 ? Number(product.rating || 0).toFixed(1) : 0}</strong> / 5
        <span>(${product.reviews || 0} đánh giá từ hệ thống)</span>
      </div>
    `;
  } else {
    $reviewSummary.innerHTML = `<p class="empty-note">Chưa có đánh giá nào cho sản phẩm này.</p>`;
  }

  if (rowCount === 0) {
    $reviewList.innerHTML = '<p class="empty-note">Chưa có đánh giá nào cho sản phẩm này.</p>';
    return;
  }

  $reviewList.innerHTML = reviews
    .slice()
    .reverse()
    .map((review) => `
      <article class="review-item">
        <div class="review-header">
          <strong>Khách hàng</strong>
          <span class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
        </div>
        <p class="review-text">${review.text ? review.text.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '<em>Không có bình luận thêm</em>'}</p>
        <div class="review-meta">${new Date(review.created_at).toLocaleDateString('vi-VN')}</div>
      </article>
    `)
    .join("");
}

function addReview(rating, text) {
  const newReview = {
    rating: Number(rating) || 5,
    text: (text || "").trim(),
    created_at: new Date().toISOString(),
  };
  reviews.push(newReview);
  saveReviews();
  renderReviews();
}

function renderProduct() {
  $loading.style.display = "none";
  $wrapper.style.display = "block";
  document.title = `${product.name} | Techtra`;

  $breadcrumb.innerHTML = `
    <a href="/">Trang chủ</a>
    ${product.group_name ? ` / ${product.group_name}` : ""}
    / <span style="color:#111827">${product.name}</span>
  `;

  const images = normalizeProductImages(product);
  renderGallery(images.length ? images : ["/placeholder.png"], product.video_url);

  $name.textContent = product.name;
  $sku.textContent = product.sku ? `SKU: ${product.sku}` : "";

  $finalPrice.textContent = formatVND(product.final_price);

  if (product.discount > 0) {
    $oldPrice.textContent = formatVND(product.price);
    $oldPrice.style.display = "inline";
    $discountBadge.textContent = `-${product.discount}%`;
    $discountBadge.style.display = "inline-block";
  }

  if (product.stock > 0) {
    $stockInfo.textContent = `✅ Còn hàng (${product.stock} sản phẩm)`;
    $stockInfo.className = "stock-info in-stock";
  } else {
    $stockInfo.textContent = "❌ Hết hàng";
    $stockInfo.className = "stock-info out-stock";
    $btnAddCart.disabled = true;
    $btnBuyNow.disabled = true;
  }

  if (product.cod_enabled) $codInfo.style.display = "flex";

  // SUẨ DOAN này: Đổi từ .textContent sang .innerHTML để biên dịch mã HTML và ảnh của Word
  const descHtml = formatDescription(product.description);
  if (descHtml) {
    $descriptionContent.innerHTML = descHtml;
  } else {
    $descriptionContent.textContent = "Sản phẩm chưa có mô tả.";
  }

  scheduleDescriptionToggle();
  loadReviews();
  renderReviews();
}

function scheduleDescriptionToggle() {
  if (!$descriptionBox || !$toggleDescriptionButton) return;
  $descriptionBox.classList.remove("collapsed", "show-more");
  $toggleDescriptionButton.textContent = "Xem thêm";
  $descriptionBox.style.maxHeight = "none";

  requestAnimationFrame(() => {
    const contentHeight = $descriptionContent.scrollHeight;
    if (contentHeight > DESCRIPTION_COLLAPSED_HEIGHT) {
      $descriptionBox.classList.add("collapsed", "show-more");
      $descriptionBox.style.maxHeight = `${DESCRIPTION_COLLAPSED_HEIGHT}px`;
    } else {
      $descriptionBox.classList.remove("collapsed", "show-more");
      $descriptionBox.style.maxHeight = "none";
    }
  });
}

$toggleDescriptionButton?.addEventListener("click", () => {
  if (!$descriptionBox) return;
  const expanded = $descriptionBox.classList.toggle("collapsed");
  if (expanded) {
    $descriptionBox.style.maxHeight = `${DESCRIPTION_COLLAPSED_HEIGHT}px`;
    $toggleDescriptionButton.textContent = "Xem thêm";
  } else {
    $descriptionBox.style.maxHeight = "none";
    $toggleDescriptionButton.textContent = "Ẩn bớt";
  }
});

function renderGallery(images, videoUrl) {
  // Gộp ảnh + video thành 1 mảng slide chung, video luôn đứng đầu (giống mockup)
  const slides = [];
  if (videoUrl) slides.push({ type: "video", src: videoUrl, thumb: images[0] || "/placeholder.png" });
  images.forEach((img) => slides.push({ type: "image", src: img, thumb: img }));

  galleryState.slides = slides;
  galleryState.index = 0;
  showSlide(0);

  $thumbnails.innerHTML = "";
  if (slides.length <= 1) return;

  slides.forEach((slide, idx) => {
    const btn = document.createElement("button");
    btn.className = "thumb-btn" + (idx === 0 ? " active" : "") + (slide.type === "video" ? " video-thumb" : "");
    btn.innerHTML = `<img src="${slide.thumb}" alt="slide ${idx + 1}">`;
    btn.addEventListener("click", () => goToSlide(idx));
    $thumbnails.appendChild(btn);
  });
}

const galleryState = { slides: [], index: 0 };

function showSlide(index) {
  const slide = galleryState.slides[index];
  if (!slide) return;
  galleryState.index = index;

  if (slide.type === "video") {
    $mainVideo.src = slide.src;
    $mainVideo.style.display = "block";
    $mainImage.style.display = "none";
  } else {
    $mainVideo.pause();
    $mainVideo.style.display = "none";
    $mainImage.src = slide.src;
    $mainImage.alt = product.name;
    $mainImage.style.display = "block";
  }
}

function goToSlide(index) {
  showSlide(index);
  document.querySelectorAll(".thumb-btn").forEach((b, i) => b.classList.toggle("active", i === index));
}

// ─── Nút mũi tên chuyển ảnh/video ─────────────────────────────────────────────
document.getElementById("galleryPrev").addEventListener("click", () => {
  const { slides, index } = galleryState;
  if (!slides.length) return;
  const newIndex = (index - 1 + slides.length) % slides.length;
  goToSlide(newIndex);
});

document.getElementById("galleryNext").addEventListener("click", () => {
  const { slides, index } = galleryState;
  if (!slides.length) return;
  const newIndex = (index + 1) % slides.length;
  goToSlide(newIndex);
});

$submitReview?.addEventListener("click", (event) => {
  event.preventDefault();
  if (!product) return;
  addReview($reviewRating.value, $reviewText.value);
  $reviewText.value = "";
  alert("Cảm ơn bạn đã gửi đánh giá!");
});

// ─── Tab switching (Mô tả / Đánh giá) ────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tabMota").style.display = btn.dataset.tab === "mota" ? "block" : "none";
    document.getElementById("tabDanhgia").style.display = btn.dataset.tab === "danhgia" ? "block" : "none";
  });
});

// ─── Số lượng ───────────────────────────────────────────────────────────────
$qtyMinus.addEventListener("click", () => {
  if (quantity > 1) { quantity--; $qtyValue.textContent = quantity; }
});
$qtyPlus.addEventListener("click", () => {
  if (!product || quantity < product.stock) { quantity++; $qtyValue.textContent = quantity; }
});

// ─── Giỏ hàng ─────────────────────────────────────────────────────────────────
function getCart() {
  return JSON.parse(localStorage.getItem("techtra_cart") || "[]");
}
function updateCartBadge() {
  const cart = getCart();
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
  if ($cartBadge) $cartBadge.textContent = totalQty;
  if ($cartHeaderPrice) $cartHeaderPrice.textContent = formatVND(totalPrice);
}

$btnAddCart.addEventListener("click", () => {
  if (!product) return;
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);
  if (existing) existing.quantity += quantity;
  else cart.push({ id: product.id, name: product.name, slug: product.slug, image: normalizeProductImages(product)[0] || "", price: product.final_price, quantity });
  localStorage.setItem("techtra_cart", JSON.stringify(cart));
  updateCartBadge();
  alert(`Đã thêm ${quantity} "${product.name}" vào giỏ hàng!`);
});

$btnBuyNow.addEventListener("click", () => {
  if (!product) return;
  const cart = [{ id: product.id, name: product.name, slug: product.slug, image: normalizeProductImages(product)[0] || "", price: product.final_price, quantity }];
  localStorage.setItem("techtra_buynow", JSON.stringify(cart));
  window.location.href = "/components/thanh-toan/thanh-toan.html";
});

// ─── Khởi chạy ───────────────────────────────────────────────────────────────
// Lần đầu: header có thể chưa được partials.js inject xong, nên gọi trực tiếp
// là an toàn (đã có guard if ($cartBadge)).
updateCartBadge();
// Sau khi header partial load xong, lấy lại DOM ref và cập nhật badge.
document.addEventListener("partials:loaded", () => {
  const badge = document.getElementById("cart-badge-count");
  const price = document.getElementById("cart-header-price");
  if (badge) $cartBadge = badge;
  if (price) $cartHeaderPrice = price;
  updateCartBadge();
});
loadProduct();