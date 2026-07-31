/**
 * san-pham.js — Techtra Product Page (Original — không có parent/cha logic)
 *
 * 🐛 Bugs fixed:
 *    1. Cart badge: lazy ref (read at call-time, after header loads)
 *    2. Description toggle button display managed by JS
 *    3. cleanInlineStyle() called in sanitizeDescriptionHtml()
 *
 * ✨ Features:
 *    Toast, Lightbox, Sticky bar, Back-to-top, Share btn,
 *    Swipe gesture, Gallery dots, Lazy loading
 */

import { productsApi, productGroupsApi, request } from "../api-service/api.js";

// ═══════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════

function getSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("slug")) return params.get("slug");
  const match = window.location.pathname.match(/^\/san-pham\/([^/]+)\/?$/);
  if (match) return decodeURIComponent(match[1]);
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  if (pathParts[0] === "san-pham" && pathParts[1]) return decodeURIComponent(pathParts[1]);
  return "";
}

function formatVND(n) {
  return Number(n || 0).toLocaleString("vi-VN") + "đ";
}

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ═══════════════════════════════════════════════════════════════════
// TOAST SYSTEM
// ═══════════════════════════════════════════════════════════════════

function showToast(message, type = "info", duration = 3500) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  if (duration === 0) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const icon = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-msg">${escapeHtml(message)}</span>
    <button class="toast-close" type="button" aria-label="Đóng" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("show")));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ═══════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════

let product = null;
let quantity = 1;
let reviews  = [];
const galleryState = { slides: [], index: 0 };

// ═══════════════════════════════════════════════════════════════════
// DOM REFS
// ═══════════════════════════════════════════════════════════════════

const $loading       = document.getElementById("loadingState");
const $skeleton      = document.getElementById("skeletonLoader");
const $error         = document.getElementById("errorState");
const $wrapper       = document.getElementById("productWrapper");
const $breadcrumb    = document.getElementById("breadcrumb");

const $mainImage     = document.getElementById("mainImage");
const $mainVideo     = document.getElementById("mainVideo");
const $thumbnails    = document.getElementById("thumbnails");
const $galleryDots   = document.getElementById("galleryDots");
const $galleryPrev   = document.getElementById("galleryPrev");
const $galleryNext   = document.getElementById("galleryNext");

const $name          = document.getElementById("productName");
const $sku           = document.getElementById("productSku");
const $ratingStars   = document.getElementById("ratingStars");
const $finalPrice    = document.getElementById("finalPrice");
const $oldPrice      = document.getElementById("oldPrice");
const $discountBadge = document.getElementById("discountBadge");
const $stockInfo     = document.getElementById("stockInfo");
const $codInfo       = document.getElementById("codInfo");

const $qtyValue      = document.getElementById("qtyValue");
const $qtyMinus      = document.getElementById("qtyMinus");
const $qtyPlus       = document.getElementById("qtyPlus");

const $btnAddCart    = document.getElementById("btnAddCart");
const $btnBuyNow     = document.getElementById("btnBuyNow");

const $descriptionContent      = document.getElementById("descriptionContent");
const $descriptionBox          = document.getElementById("descriptionBox");
const $toggleDescriptionButton = document.getElementById("toggleDescriptionButton");

const $reviewSummary    = document.getElementById("reviewSummary");
const $reviewList       = document.getElementById("reviewList");
const $reviewForm       = document.getElementById("reviewForm");
const $reviewRating     = document.getElementById("reviewRating");
const $reviewText       = document.getElementById("reviewText");
const $submitReview     = document.getElementById("submitReview");
const $toggleReviewForm = document.getElementById("toggleReviewForm");
const $reviewFormWrapper = document.getElementById("reviewFormWrapper");
const $reviewerName     = document.getElementById("reviewerName");

const $relatedSection  = document.getElementById("relatedSection");
const $relatedGrid     = document.getElementById("relatedGrid");
const $relatedPrev     = document.getElementById("relatedPrev");
const $relatedNext     = document.getElementById("relatedNext");

const $lightbox        = document.getElementById("lightboxOverlay");
const $lightboxImg     = document.getElementById("lightboxImg");
const $lightboxClose   = document.getElementById("lightboxClose");
const $lightboxPrev    = document.getElementById("lightboxPrev");
const $lightboxNext    = document.getElementById("lightboxNext");

const $stickyBar       = document.getElementById("stickyBar");
const $stickyName      = document.getElementById("stickyName");
const $stickyPrice     = document.getElementById("stickyPrice");
const $stickyAddCart   = document.getElementById("stickyAddCart");
const $stickyBuyNow    = document.getElementById("stickyBuyNow");

const $backToTop       = document.getElementById("backToTop");
const $shareBtn        = document.getElementById("shareBtn");

const DESCRIPTION_COLLAPSED_HEIGHT = 260;



// ═══════════════════════════════════════════════════════════════════
// CART  (lazy badge refs — read AFTER header partial loads)
// ═══════════════════════════════════════════════════════════════════

function getCart() {
  try { return JSON.parse(localStorage.getItem("techtra_cart") || "[]"); } catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem("techtra_cart", JSON.stringify(cart));
  if (typeof window.updateCartCount === "function") window.updateCartCount();
  else updateCartBadge(cart);
}
function updateCartBadge(cart) {
  const badge  = document.getElementById("cart-badge-count");
  const hPrice = document.getElementById("cart-header-price");
  const c = cart || getCart();
  const totalQty   = c.reduce((s, i) => s + (i.qty || i.quantity || 0), 0);
  const totalPrice = c.reduce((s, i) => s + (i.price || 0) * (i.qty || i.quantity || 0), 0);
  if (badge) {
    badge.textContent = totalQty;
    badge.style.display = totalQty > 0 ? "flex" : "none";
  }
  if (hPrice) hPrice.textContent = formatVND(totalPrice);
}
function addToCartLocal(prod, qty, variant) {
  const cart = getCart();
  // Key dedupe: nếu có variant thì (id,size,color), nếu không thì chỉ id
  const variantKey = (v) => v ? `${v.size || ""}|${v.color || ""}` : "";
  const idx = cart.findIndex((c) => c.id === prod.id && variantKey(c.variant) === variantKey(variant));
  if (idx >= 0) {
    const newQty = (cart[idx].qty || cart[idx].quantity || 0) + qty;
    cart[idx].qty = newQty;
    cart[idx].quantity = newQty;
  }
  else cart.push({
    id:    prod.id,
    name:  prod.name,
    price: prod.final_price,
    qty,
    quantity: qty, // backward-compat
    image: normalizeProductImages(prod)[0] || "",
    variant: variant || null,
  });
  saveCart(cart);
}

// ═══════════════════════════════════════════════════════════════════
// QUANTITY CONTROLS
// ═══════════════════════════════════════════════════════════════════

function updateQtyUI() {
  if ($qtyValue) $qtyValue.textContent = quantity;
  if ($qtyMinus) $qtyMinus.disabled = quantity <= 1;
  const max = product?.stock || Infinity;
  if ($qtyPlus)  $qtyPlus.disabled  = !(quantity < max);
}

$qtyMinus?.addEventListener("click", () => {
  if (quantity > 1) { quantity--; updateQtyUI(); }
});
$qtyPlus?.addEventListener("click", () => {
  const max = product?.stock || Infinity;
  if (quantity < max) { quantity++; updateQtyUI(); }
});

// ═══════════════════════════════════════════════════════════════════
// ADD TO CART / BUY NOW
// ═══════════════════════════════════════════════════════════════════

function handleAddCart(btn) {
  if (!product || product.stock <= 0) return;
  addToCartLocal(product, quantity, null);
  showToast(`Đã thêm ${quantity} sản phẩm vào giỏ hàng 🛒`, "success", 0);
}
function handleBuyNow() {
  if (!product || product.stock <= 0) return;
  addToCartLocal(product, quantity, null);
  window.location.href = "/components/gio-hang/gio-hang.html";
}

$btnAddCart?.addEventListener("click", handleAddCart);
$btnBuyNow?.addEventListener("click", handleBuyNow);
$stickyAddCart?.addEventListener("click", handleAddCart);
$stickyBuyNow?.addEventListener("click", handleBuyNow);

// ═══════════════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════════════

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
    btn.setAttribute("aria-selected", btn.dataset.tab === tabName ? "true" : "false");
  });
  document.querySelectorAll(".tab-content").forEach((pane) => {
    pane.style.display = "none";
  });
  const pane = document.getElementById(
    `tab${tabName.charAt(0).toUpperCase()}${tabName.slice(1)}`
  );
  if (pane) pane.style.display = "block";

  if (tabName === "danhgia") {
    if ($reviewFormWrapper) $reviewFormWrapper.style.display = "block";
    loadReviews();
  }
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});
switchTab("mota");

// ═══════════════════════════════════════════════════════════════════
// DESCRIPTION TOGGLE
// ═══════════════════════════════════════════════════════════════════

function scheduleDescriptionToggle() {
  if (!$descriptionBox || !$toggleDescriptionButton) return;
  $descriptionBox.classList.remove("collapsed");
  $toggleDescriptionButton.style.display = "none";
  $toggleDescriptionButton.textContent = "Xem thêm ▾";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const contentH = $descriptionContent?.scrollHeight || 0;
      if (contentH > DESCRIPTION_COLLAPSED_HEIGHT) {
        $descriptionBox.classList.add("collapsed");
        $toggleDescriptionButton.style.display = "inline-flex";
      }
    });
  });
}

$toggleDescriptionButton?.addEventListener("click", () => {
  if (!$descriptionBox) return;
  const nowCollapsed = $descriptionBox.classList.toggle("collapsed");
  $toggleDescriptionButton.textContent = nowCollapsed ? "Xem thêm ▾" : "Ẩn bớt ▴";
});

// ═══════════════════════════════════════════════════════════════════
// GALLERY
// ═══════════════════════════════════════════════════════════════════

function updateGalleryDots(index) {
  if (!$galleryDots) return;
  $galleryDots.querySelectorAll(".gallery-dot").forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });
}

function showSlide(index) {
  const slide = galleryState.slides[index];
  if (!slide) return;
  galleryState.index = index;

  if (slide.type === "video") {
    $mainImage.style.display = "none";
    $mainVideo.style.display = "block";
    $mainVideo.src = slide.src;
    if ($mainImage.parentElement) $mainImage.parentElement.style.cursor = "default";
  } else {
    $mainVideo.style.display = "none";
    $mainVideo.src = "";
    $mainImage.style.display = "block";
    $mainImage.src = slide.src;
    $mainImage.alt = product?.name || "Ảnh sản phẩm";
    if ($mainImage.parentElement) $mainImage.parentElement.style.cursor = "zoom-in";
  }

  document.querySelectorAll(".thumb-btn").forEach((btn, i) => {
    btn.classList.toggle("active", i === index);
  });

  const total = galleryState.slides.length;
  if ($galleryPrev) $galleryPrev.style.display = total > 1 ? "flex" : "none";
  if ($galleryNext) $galleryNext.style.display = total > 1 ? "flex" : "none";

  updateGalleryDots(index);
}

function goToSlide(idx) {
  const total = galleryState.slides.length;
  if (!total) return;
  showSlide((idx + total) % total);
}

$galleryPrev?.addEventListener("click", () => goToSlide(galleryState.index - 1));
$galleryNext?.addEventListener("click", () => goToSlide(galleryState.index + 1));

// ─── Swipe gesture ────────────────────────────────────────────────
(function setupSwipe() {
  const box = document.querySelector(".main-image-box");
  if (!box) return;
  let startX = 0;
  box.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", (e) => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) goToSlide(galleryState.index + (diff > 0 ? 1 : -1));
  }, { passive: true });
})();

// ─── Gallery render ───────────────────────────────────────────────
function renderGallery(images, videoUrl) {
  const slides = [];
  if (videoUrl) slides.push({ type: "video", src: videoUrl, thumb: images[0] || "/placeholder.png" });
  images.forEach((img) => slides.push({ type: "image", src: img, thumb: img }));

  galleryState.slides = slides;
  galleryState.index  = 0;
  showSlide(0);

  $thumbnails.innerHTML = "";
  if (slides.length > 1) {
    slides.forEach((slide, idx) => {
      const btn = document.createElement("button");
      btn.type      = "button";
      btn.className = "thumb-btn" + (idx === 0 ? " active" : "") + (slide.type === "video" ? " video-thumb" : "");
      btn.setAttribute("aria-label", slide.type === "video" ? "Xem video" : `Ảnh ${idx + 1}`);
      btn.innerHTML = `<img src="${slide.thumb}" alt="Ảnh ${idx + 1}" loading="lazy">`;
      btn.addEventListener("click", () => goToSlide(idx));
      $thumbnails.appendChild(btn);
    });
  }

  if ($galleryDots) {
    $galleryDots.innerHTML = "";
    if (slides.length > 1) {
      slides.forEach((_, i) => {
        const dot = document.createElement("span");
        dot.className = "gallery-dot" + (i === 0 ? " active" : "");
        $galleryDots.appendChild(dot);
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// LIGHTBOX
// ═══════════════════════════════════════════════════════════════════

function openLightbox(index) {
  const slide = galleryState.slides[index];
  if (!slide || slide.type === "video" || !$lightbox) return;
  $lightboxImg.src  = slide.src;
  $lightbox.dataset.index = index;
  $lightbox.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  if (!$lightbox) return;
  $lightbox.classList.remove("open");
  document.body.style.overflow = "";
}

function lightboxGoTo(direction) {
  const slides = galleryState.slides;
  let idx  = parseInt($lightbox.dataset.index || "0");
  let next = (idx + direction + slides.length) % slides.length;
  let guard = 0;
  while (slides[next]?.type === "video" && guard++ < slides.length) {
    next = (next + direction + slides.length) % slides.length;
  }
  $lightbox.dataset.index = next;
  if ($lightboxImg) $lightboxImg.src = slides[next]?.src || "";
}

$mainImage?.addEventListener("click", () => openLightbox(galleryState.index));
$lightboxClose?.addEventListener("click", closeLightbox);
$lightbox?.addEventListener("click", (e) => { if (e.target === $lightbox) closeLightbox(); });
$lightboxPrev?.addEventListener("click", () => lightboxGoTo(-1));
$lightboxNext?.addEventListener("click", () => lightboxGoTo(1));
document.addEventListener("keydown", (e) => {
  if (!$lightbox?.classList.contains("open")) return;
  if (e.key === "Escape")     closeLightbox();
  if (e.key === "ArrowLeft")  lightboxGoTo(-1);
  if (e.key === "ArrowRight") lightboxGoTo(1);
});

// ═══════════════════════════════════════════════════════════════════
// STICKY BUY BAR
// ═══════════════════════════════════════════════════════════════════

(function setupStickyBar() {
  const ctaRow = document.querySelector(".cta-row");
  if (!$stickyBar || !ctaRow) return;
  const observer = new IntersectionObserver(
    ([entry]) => $stickyBar.classList.toggle("visible", !entry.isIntersecting),
    { threshold: 0, rootMargin: "0px 0px -10px 0px" }
  );
  observer.observe(ctaRow);
})();

// ═══════════════════════════════════════════════════════════════════
// BACK TO TOP
// ═══════════════════════════════════════════════════════════════════

window.addEventListener("scroll", debounce(() => {
  if ($backToTop) $backToTop.classList.toggle("visible", window.scrollY > 400);
}, 100), { passive: true });

$backToTop?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ═══════════════════════════════════════════════════════════════════
// SHARE BUTTON
// ═══════════════════════════════════════════════════════════════════

$shareBtn?.addEventListener("click", async () => {
  const shareData = {
    title: product?.name || document.title,
    text:  product?.name || "",
    url:   window.location.href,
  };
  if (navigator.share) {
    try { await navigator.share(shareData); }
    catch (e) { if (e.name !== "AbortError") showToast("Không thể chia sẻ.", "error"); }
  } else {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Đã sao chép link sản phẩm! 🔗", "success");
    } catch {
      showToast("Không sao chép được link.", "error");
    }
  }
});

// ═══════════════════════════════════════════════════════════════════
// INTERACTIVE STAR PICKER
// ═══════════════════════════════════════════════════════════════════

(function setupStarPicker() {
  const picker = document.getElementById("starPicker");
  if (!picker || !$reviewRating) return;

  let selectedStar = 5;
  $reviewRating.value = "5";

  function renderStars(hovered) {
    const active = hovered || selectedStar;
    picker.innerHTML = [5, 4, 3, 2, 1].reverse().map((val) => `
      <span class="star-pick ${val <= active ? "lit" : ""}" data-val="${val}" role="button"
            tabindex="0" aria-label="${val} sao">★</span>
    `).join("");
  }

  renderStars(0);

  picker.addEventListener("mouseover", (e) => {
    const star = e.target.closest(".star-pick");
    if (star) renderStars(parseInt(star.dataset.val));
  });
  picker.addEventListener("mouseleave", () => renderStars(0));
  picker.addEventListener("click", (e) => {
    const star = e.target.closest(".star-pick");
    if (!star) return;
    selectedStar = parseInt(star.dataset.val);
    $reviewRating.value = selectedStar;
    renderStars(0);
  });
  picker.addEventListener("keydown", (e) => {
    const star = e.target.closest(".star-pick");
    if (!star) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectedStar = parseInt(star.dataset.val);
      $reviewRating.value = selectedStar;
      renderStars(0);
    }
  });
})();

// ═══════════════════════════════════════════════════════════════════
// REVIEW FORM TOGGLE
// ═══════════════════════════════════════════════════════════════════

$toggleReviewForm?.addEventListener("click", () => {
  if (!$reviewForm) return;
  const isHidden = $reviewForm.style.display === "none" || !$reviewForm.style.display;
  $reviewForm.style.display = isHidden ? "block" : "none";
  $toggleReviewForm.innerHTML = isHidden
    ? '<i class="fas fa-times"></i> Đóng'
    : '<i class="fas fa-pen"></i> Viết đánh giá của bạn';
});

// ═══════════════════════════════════════════════════════════════════
// SUBMIT REVIEW
// ═══════════════════════════════════════════════════════════════════

$submitReview?.addEventListener("click", async () => {
  const rating   = Number($reviewRating?.value || 5);
  const text     = ($reviewText?.value || "").trim();
  const nameVal  = ($reviewerName?.value || "").trim() || "Khách hàng";
  const phoneVal = ($reviewerPhone?.value || "").trim();

  if (!text) {
    showToast("Vui lòng nhập bình luận trước khi gửi.", "error");
    $reviewText?.focus();
    return;
  }
  if (!phoneVal) {
    showToast("Vui lòng nhập số điện thoại để xác thực.", "error");
    $reviewerPhone?.focus();
    return;
  }
  if (!reviewOtpVerified) {
    showToast("Vui lòng xác thực SĐT bằng mã OTP trước khi gửi.", "error");
    return;
  }

  $submitReview.disabled    = true;
  $submitReview.textContent = "Đang gửi...";

  const ok = await addReview(rating, text, nameVal, phoneVal);
  if (ok) {
    if ($reviewText)     $reviewText.value = "";
    if ($reviewerName)   $reviewerName.value = "";
    if ($reviewForm)     $reviewForm.style.display = "none";
    if ($toggleReviewForm) {
      $toggleReviewForm.innerHTML = '<i class="fas fa-pen"></i> Viết đánh giá của bạn';
    }
  }

  $submitReview.disabled    = false;
  $submitReview.textContent = "Gửi đánh giá";
});

// ─── Review OTP flow ─────────────────────────────────────────────
let reviewOtpVerified = false;

const $reviewerPhone    = document.getElementById("reviewerPhone");
const $sendReviewOtpBtn = document.getElementById("sendReviewOtpBtn");
const $verifyReviewOtpBtn = document.getElementById("verifyReviewOtpBtn");
const $reviewOtpCode    = document.getElementById("reviewOtpCode");
const $reviewOtpWrap    = document.getElementById("reviewOtpWrap");
const $reviewOtpHint    = document.getElementById("reviewOtpHint");
const $phoneReviewVerifiedBadge = document.getElementById("phoneReviewVerifiedBadge");

function tryAutoFillReviewerPhone() {
  try {
    const u = JSON.parse(localStorage.getItem("techtra_user") || "null");
    if (u && u.phone && $reviewerPhone) {
      $reviewerPhone.value = u.phone;
      $reviewerPhone.readOnly = true;
      reviewOtpVerified = true;
      if ($phoneReviewVerifiedBadge) $phoneReviewVerifiedBadge.hidden = false;
      if ($sendReviewOtpBtn) $sendReviewOtpBtn.disabled = true;
    }
  } catch (_) {}
}
tryAutoFillReviewerPhone();

async function handleReviewSendOtp() {
  const phone = ($reviewerPhone?.value || "").trim();
  if (!phone) {
    showToast("Vui lòng nhập số điện thoại.", "error");
    $reviewerPhone?.focus();
    return;
  }
  const re = /^(0|\+84)?\d{9,10}$/;
  if (!re.test(phone.replace(/\s/g, ""))) {
    showToast("Số điện thoại không đúng định dạng.", "error");
    return;
  }
  if (typeof window.TechnoraOtp?.send !== "function") {
    showToast("sendCode.js chưa load. Hãy F5 trang.", "error");
    return;
  }
  if ($sendReviewOtpBtn) $sendReviewOtpBtn.disabled = true;
  if ($reviewOtpHint) $reviewOtpHint.textContent = "Đang gửi mã...";
  try {
    await window.TechnoraOtp.send(phone, "zalo", "review");
    if ($reviewOtpWrap) $reviewOtpWrap.hidden = false;
    if ($reviewOtpHint) $reviewOtpHint.textContent = "Mã đã được gửi. Có hiệu lực 5 phút.";
    if ($sendReviewOtpBtn) $sendReviewOtpBtn.textContent = "Gửi lại (60s)";
    let remaining = 60;
    const t = setInterval(() => {
      remaining -= 1;
      if ($sendReviewOtpBtn) $sendReviewOtpBtn.textContent = `Gửi lại (${remaining}s)`;
      if (remaining <= 0) {
        clearInterval(t);
        if ($sendReviewOtpBtn) {
          $sendReviewOtpBtn.disabled = false;
          $sendReviewOtpBtn.textContent = "Gửi mã";
        }
      }
    }, 1000);
  } catch (err) {
    if ($sendReviewOtpBtn) $sendReviewOtpBtn.disabled = false;
    if ($reviewOtpHint) $reviewOtpHint.textContent = err.message || "Không gửi được mã.";
  }
}

async function handleReviewVerifyOtp() {
  const phone = ($reviewerPhone?.value || "").trim();
  const code  = ($reviewOtpCode?.value || "").trim();
  if (!code || code.length !== 6) {
    if ($reviewOtpHint) $reviewOtpHint.textContent = "Vui lòng nhập mã 6 số.";
    return;
  }
  if ($reviewOtpHint) $reviewOtpHint.textContent = "Đang xác nhận...";
  try {
    await window.TechnoraOtp.verify(phone, "zalo", "review", code);
    reviewOtpVerified = true;
    if ($reviewOtpHint) $reviewOtpHint.textContent = "✓ Xác nhận thành công";
    if ($reviewOtpHint) $reviewOtpHint.style.color = "#16a34a";
    if ($phoneReviewVerifiedBadge) $phoneReviewVerifiedBadge.hidden = false;
    setTimeout(() => {
      if ($reviewOtpWrap) $reviewOtpWrap.hidden = true;
      if ($reviewOtpCode) $reviewOtpCode.value = "";
      if ($reviewOtpHint) $reviewOtpHint.style.color = "";
    }, 1200);
  } catch (err) {
    if ($reviewOtpHint) $reviewOtpHint.textContent = err.message || "Mã không đúng hoặc đã hết hạn.";
    if ($reviewOtpHint) $reviewOtpHint.style.color = "#dc2626";
    setTimeout(() => { if ($reviewOtpHint) $reviewOtpHint.style.color = ""; }, 2000);
  }
}

$sendReviewOtpBtn?.addEventListener("click", handleReviewSendOtp);
$verifyReviewOtpBtn?.addEventListener("click", handleReviewVerifyOtp);
$reviewOtpCode?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); handleReviewVerifyOtp(); }
});
$reviewerPhone?.addEventListener("input", () => {
  reviewOtpVerified = false;
  if ($phoneReviewVerifiedBadge) $phoneReviewVerifiedBadge.hidden = true;
});

// ═══════════════════════════════════════════════════════════════════
// RELATED PRODUCTS SLIDER  (chỉ SP cha)
// ═══════════════════════════════════════════════════════════════════

function hasHorizontalOverflow(el) {
  if (!el) return false;
  return el.scrollWidth > el.clientWidth + 4;
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
$relatedGrid?.addEventListener("scroll", debounce(updateRelatedNavButtons, 80));
window.addEventListener("resize", debounce(updateRelatedNavButtons, 150));

// ═══════════════════════════════════════════════════════════════════
// ERROR STATE
// ═══════════════════════════════════════════════════════════════════

function showError(message) {
  if ($skeleton)    $skeleton.style.display  = "none";
  if ($loading)     $loading.style.display   = "none";
  if ($error)       { $error.style.display   = "block"; $error.textContent = "⚠️ " + message; }
}

// ═══════════════════════════════════════════════════════════════════
// HTML SANITIZATION
// ═══════════════════════════════════════════════════════════════════

function cleanInlineStyle(style) {
  const ALLOWED = new Set([
    "float","clear","margin","margin-top","margin-right","margin-bottom","margin-left",
    "padding","padding-top","padding-right","padding-bottom","padding-left",
    "width","height","max-width","min-width","max-height","min-height",
    "line-height","text-align","vertical-align","display","font-size",
    "font-weight","font-style","color","background-color","border-radius","object-fit",
  ]);
  return style.split(";").map((r) => r.trim()).filter(Boolean)
    .filter((rule) => ALLOWED.has(rule.split(":")[0]?.trim().toLowerCase()))
    .join("; ");
}

const SAFE_ATTRS = new Set([
  "src","alt","href","title","target","rel","colspan","rowspan",
  "scope","style","class","align","width","height","size","color","face","id",
]);

function sanitizeDescriptionHtml(html) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(html, "text/html");
  ["script","style","iframe","object","embed","form","link","meta"].forEach((tag) => {
    doc.body.querySelectorAll(tag).forEach((el) => el.remove());
  });
  doc.body.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name  = attr.name.toLowerCase();
      const value = attr.value || "";
      if (name.startsWith("on")) { el.removeAttribute(attr.name); return; }
      if ((name === "href" || name === "src") && /^\s*javascript:/i.test(value)) {
        el.removeAttribute(attr.name); return;
      }
      if (name === "style") {
        const cleaned = cleanInlineStyle(value);
        if (cleaned) el.setAttribute("style", cleaned);
        else el.removeAttribute("style");
        return;
      }
      if (!SAFE_ATTRS.has(name)) el.removeAttribute(attr.name);
    });
    if (el.tagName === "A" && el.getAttribute("target") === "_blank") {
      el.setAttribute("rel", "noopener noreferrer");
    }
  });
  return doc.body.innerHTML;
}

function decodeHtmlEntities(value) {
  const ta = document.createElement("textarea");
  ta.innerHTML = value;
  return ta.value;
}

function formatDescription(description) {
  if (!description) return "";
  const text = description.toString().trim();
  if (!text) return "";
  let decoded = decodeHtmlEntities(text);
  decoded = decoded.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => `<img src="${src}" alt="${escapeHtml(alt)}">`);
  if (/<[a-z][\s\S]*>/i.test(decoded)) return sanitizeDescriptionHtml(decoded);
  return decoded.replace(/\r?\n/g, "<br>");
}

// ═══════════════════════════════════════════════════════════════════
// PRODUCT IMAGES HELPER
// ═══════════════════════════════════════════════════════════════════

function normalizeProductImages(prod) {
  if (!prod) return [];
  if (Array.isArray(prod.images) && prod.images.length)
    return prod.images.map((img) => (typeof img === "string" ? img.trim() : img)).filter(Boolean);
  if (typeof prod.images === "string" && prod.images.trim()) {
    const trimmed = prod.images.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length)
        return parsed.map((img) => (typeof img === "string" ? img.trim() : img)).filter(Boolean);
    } catch {
      if (trimmed.includes(",")) return trimmed.split(",").map((i) => i.trim()).filter(Boolean);
      if (trimmed.includes(";")) return trimmed.split(";").map((i) => i.trim()).filter(Boolean);
      return [trimmed];
    }
  }
  if (typeof prod.image_url === "string" && prod.image_url.trim()) return [prod.image_url.trim()];
  if (typeof prod.image    === "string" && prod.image.trim())     return [prod.image.trim()];
  return [];
}

// ═══════════════════════════════════════════════════════════════════
// API CALLS
// ═══════════════════════════════════════════════════════════════════

async function fetchProductBySlug(slug) {
  const res   = await productsApi.getBySlug(slug);
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
    final_price:   found.price * (1 - (found.discount || 0) / 100),
    sold_count:    Number(found.sold_count    || 0),
    reviews_count: Number(found.reviews_count || 0),
    reviews_sum:   Number(found.reviews_sum   || 0),
  };
}

async function fetchRelatedProducts(groupId, excludeId) {
  if (!groupId) return [];
  try {
    // Fetch more products to have better selection for filtering
    const res = await productsApi.getAll({ group_id: groupId, limit: 20 });
    const allProducts = res.data || [];

    // Filter out the current product
    const filteredProducts = allProducts.filter((p) => p.id !== excludeId);

    // Sort by relevance:
    // 1. Products with discounts (more attractive)
    // 2. Products with higher ratings
    // 3. Products with more reviews
    // 4. Recently added products
    const sortedProducts = filteredProducts.sort((a, b) => {
      const aHasDiscount = Number(a.discount) > 0;
      const bHasDiscount = Number(b.discount) > 0;
      if (aHasDiscount !== bHasDiscount) return bHasDiscount ? -1 : 1;

      const aRating = Number(a.rating || 0);
      const bRating = Number(b.rating || 0);
      if (aRating !== bRating) return bRating - aRating;

      const aReviews = Number(a.reviews_count || a.reviews || 0);
      const bReviews = Number(b.reviews_count || b.reviews || 0);
      if (aReviews !== bReviews) return bReviews - aReviews;

      // Newer products first (assuming higher ID means newer)
      return (b.id || 0) - (a.id || 0);
    });

    // Return top 6 products for better slider experience
    return sortedProducts.slice(0, 6);
  } catch { return []; }
}

// ═══════════════════════════════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════════════════════════════

function loadReviews() {
  if (!product) { reviews = []; renderReviews(); return; }
  request(
    "GET",
    `/db/product_reviews?product_id=eq.${product.id}&is_approved=eq.true&select=id,rating,comment,reviewer_name,created_at&order=created_at.desc&limit=50`
  )
    .then((r) => {
      reviews = r.data || [];
      renderReviews();
    })
    .catch((err) => {
      console.warn("[reviews] load failed/crashed:", err?.message || err);
      if ($reviewSummary)
        $reviewSummary.innerHTML = `<p class="empty-note" style="color:#b00020;">Không tải được đánh giá: ${escapeHtml(err?.message || String(err))}</p>`;
      reviews = [];
      renderReviews();
    });
}

function renderReviews() {
  const reviewCount = product?.reviews_count ?? reviews.length;
  const avgRating   = reviewCount > 0
    ? (Number(product?.reviews_sum || 0) / Math.max(reviewCount, 1))
    : 0;

  const breakdown = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => Math.round(Number(r.rating) || 0) === star).length;
    const pct   = reviewCount > 0 ? Math.round((count / Math.max(reviews.length, 1)) * 100) : 0;
    return { star, count, pct };
  });

  if ($reviewSummary) {
    if (reviewCount > 0) {
      const ratingPct = (avgRating / 5) * 100;
      const avgText   = avgRating.toFixed(1);
      const totalReviews = reviewCount;
      const visibleReviews = reviews.length;
      const showingHint = visibleReviews < totalReviews
        ? `, hiển thị ${visibleReviews} mới nhất`
        : "";
      $reviewSummary.innerHTML = `
        <div class="review-summary-box">
          <div class="review-summary-score">
            <div class="big-rating">${avgText}<span class="out-of">/5</span></div>
            <div class="rating-bar-wrap">
              <div class="rating-bar"><div class="rating-bar-fill" style="width:${ratingPct.toFixed(1)}%"></div></div>
              <span class="rating-count">${totalReviews} đánh giá${showingHint}</span>
            </div>
          </div>
          <div class="review-summary-breakdown">
            ${breakdown.map(({ star, count, pct }) => `
              <div class="breakdown-row">
                <span class="breakdown-label">${star} ★</span>
                <div class="breakdown-bar"><div class="breakdown-bar-fill" style="width:${pct}%"></div></div>
                <span class="breakdown-count">${count}</span>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    } else {
      $reviewSummary.innerHTML = `<p class="empty-note">Chưa có đánh giá nào cho sản phẩm này.</p>`;
    }
  }

  if (!$reviewList) return;
  if (!reviews.length) {
    $reviewList.innerHTML = '<p class="empty-note">Chưa có đánh giá nào cho sản phẩm này.</p>';
    return;
  }
  $reviewList.innerHTML = reviews.map((review) => {
    const name   = escapeHtml(review.reviewer_name || "Khách hàng");
    const filled = Math.max(0, Math.min(5, Number(review.rating) || 0));
    const stars  = "★".repeat(filled) + "☆".repeat(5 - filled);
    const text   = review.comment ? escapeHtml(review.comment) : "<em>Không có bình luận thêm</em>";
    const date   = review.created_at ? new Date(review.created_at).toLocaleDateString("vi-VN") : "";
    const initial = (name || "K").trim().charAt(0).toUpperCase();
    return `
      <article class="review-item">
        <div class="review-item-head">
          <div class="review-avatar">${initial}</div>
          <div class="review-item-meta">
            <strong>${name}</strong>
            <div class="review-item-sub">
              <span class="review-rating">${stars}</span>
              <span class="review-date">${date}</span>
            </div>
          </div>
        </div>
        <p class="review-text">${text}</p>
      </article>`;
  }).join("");
}

async function addReview(rating, text, reviewerName, phone) {
  if (!product) {
    showToast("Hệ thống chưa sẵn sàng, vui lòng thử lại sau.", "error");
    return false;
  }
  let customerId = null;
  try {
    customerId = Number(localStorage.getItem("techtra_customer_id") || 0) || null;
    if (!customerId) {
      const u = JSON.parse(localStorage.getItem("techtra_user") || "null");
      if (u && u.id) customerId = Number(u.id);
    }
  } catch (_) {}
  const payload = {
    product_id:    product.id,
    rating:        Number(rating) || 5,
    comment:       (text || "").trim() || null,
    reviewer_name: reviewerName || "Khách hàng",
    phone:         phone || null,
    customer_id:   customerId,
  };
  try {
    const r = await request("POST", "/reviews", payload);
    if (!r || !r.success) throw new Error((r && r.error) || "Không gửi được đánh giá");
    showToast("Đã gửi đánh giá. Đang chờ admin duyệt ✨", "success");
    return true;
  } catch (err) {
    console.warn("[reviews] insert failed:", err.message);
    showToast("Không gửi được đánh giá: " + err.message, "error");
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// RELATED PRODUCTS RENDER
// ═══════════════════════════════════════════════════════════════════

async function loadRelated() {
  const related = await fetchRelatedProducts(product.group_id, product.id);

  if ($relatedSection) $relatedSection.style.display = related.length ? "block" : "none";
  if (!related.length) { if ($relatedGrid) $relatedGrid.innerHTML = ""; return; }

  $relatedGrid.innerHTML = related.map((p) => {
    const price       = p.price * (1 - (p.discount || 0) / 100);
    const images      = normalizeProductImages(p);
    const img         = images.length ? images[0] : "/placeholder.png";
    const hasDiscount = Number(p.discount) > 0;
    const reviewCount = Number(p.reviews_count || p.reviews || 0);
    const reviewAvg   = reviewCount > 0 && Number(p.reviews_sum) > 0
      ? (Number(p.reviews_sum) / reviewCount).toFixed(1)
      : Number(p.rating || 5).toFixed(1);
    const soldCount = Number(p.sold_count || 0);
    const isNew = !!p.is_new;

    return `
      <a class="related-card" href="/san-pham/${p.slug}" role="listitem">
        <div class="related-card__media">
          <img src="${img}" alt="${escapeHtml(p.name)}" loading="lazy">
          ${hasDiscount ? `<span class="related-card__badge">-${Number(p.discount).toFixed(0)}%</span>` : ""}
          ${isNew ? `<span class="related-card__badge new-badge">MỚI</span>` : ""}
          ${soldCount > 0 ? `<span class="related-card__sold">Đã bán ${soldCount}</span>` : ""}
        </div>
        <div class="related-card__details">
          <div class="name">${escapeHtml(p.name)}</div>
          <div class="price-row">
            <span class="current-price">${formatVND(price)}</span>
            ${hasDiscount ? `<span class="old-price">${formatVND(p.price)}</span>` : ""}
          </div>
          <div class="rating-row related-rating">
            <span class="stars">${"★".repeat(Math.floor(Number(reviewAvg)))}☆${"☆".repeat(5 - Math.floor(Number(reviewAvg)))}</span>
            <span class="review-count">${reviewAvg} / 5 · ${reviewCount} ${reviewCount === 1 ? "đánh giá" : "đánh giá"}</span>
          </div>
        </div>
      </a>`;
  }).join("");

  updateRelatedNavButtons();
}

// ═══════════════════════════════════════════════════════════════════
// RENDER PRODUCT
// ═══════════════════════════════════════════════════════════════════

function renderProduct() {
  if ($skeleton) $skeleton.style.display = "none";
  if ($loading)  $loading.style.display  = "none";
  if ($wrapper)  $wrapper.style.display  = "block";

  document.title = `${product.name} | Techtra`;

  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) { metaDesc = document.createElement("meta"); metaDesc.name = "description"; document.head.appendChild(metaDesc); }
  metaDesc.content = (product.description || product.name || "").replace(/<[^>]*>/g, "").slice(0, 160);

  // Breadcrumb
  $breadcrumb.innerHTML = `
    <a href="/"><i class="fas fa-home"></i> Trang chủ</a>
    ${product.group_name ? `
      <span class="sep">/</span>
      <a href="/components/nhom-san-pham/nhom-san-pham.html?slug=${encodeURIComponent(product.group_name)}">${escapeHtml(product.group_name)}</a>
    ` : `
      <span class="sep">/</span>
      <a href="/components/tat-ca-san-pham/tat-ca-san-pham.html">Sản phẩm</a>
    `}
    <span class="sep">/</span>
    <span class="current">${escapeHtml(product.name)}</span>
  `;

  // Gallery
  const images = normalizeProductImages(product);
  renderGallery(images.length ? images : ["/placeholder.png"], product.video_url);

  // Name + SKU
  if ($name) $name.textContent = product.name;
  if ($sku)  $sku.textContent  = product.sku ? `SKU: ${product.sku}` : "";

  // Rating
  const avgRating = product.reviews_count > 0
    ? (product.reviews_sum / product.reviews_count).toFixed(1) : "0.0";
  if ($ratingStars)
    $ratingStars.textContent = `★★★★★ (${avgRating}/5 · ${product.reviews_count} đánh giá)`;

  // Price
  if ($finalPrice) $finalPrice.textContent = formatVND(product.final_price);
  if (product.discount > 0) {
    if ($oldPrice)      { $oldPrice.textContent = formatVND(product.price); $oldPrice.style.display = "inline"; }
    if ($discountBadge) { $discountBadge.textContent = `-${product.discount}%`; $discountBadge.style.display = "inline-block"; }
  }

  // Stock
  if (product.stock > 0) {
    const lowStock = product.stock <= 5;
    $stockInfo.innerHTML =
      (lowStock ? `⚠️ Sắp hết hàng! ` : `✅ Còn hàng `) +
      `(<strong>${product.stock}</strong> sản phẩm)` +
      (product.sold_count > 0 ? ` · <span style="color:#16a34a;font-weight:600;">Đã bán ${product.sold_count}</span>` : "");
    $stockInfo.className = `stock-info ${lowStock ? "low-stock" : "in-stock"}`;
  } else {
    $stockInfo.innerHTML = "❌ Hết hàng" +
      (product.sold_count > 0 ? ` · <span style="color:#6b7280;">Đã bán ${product.sold_count}</span>` : "");
    $stockInfo.className = "stock-info out-stock";
    [$btnAddCart, $btnBuyNow, $stickyAddCart, $stickyBuyNow].forEach((b) => { if (b) b.disabled = true; });
  }

  // COD
  if (product.cod_enabled && $codInfo) $codInfo.style.display = "flex";

  // Sticky bar info
  if ($stickyName)  $stickyName.textContent  = product.name;
  if ($stickyPrice) $stickyPrice.textContent = formatVND(product.final_price);

  // Description
  const descHtml = formatDescription(product.description);
  if ($descriptionContent) {
    $descriptionContent.innerHTML = descHtml || "Sản phẩm chưa có mô tả.";
  }
  scheduleDescriptionToggle();

  // Quantity UI
  updateQtyUI();

  // Cart badge
  updateCartBadge();

  // Preload hero image
  if (images[0]) {
    const link = document.createElement("link");
    link.rel = "preload"; link.as = "image"; link.href = images[0];
    document.head.appendChild(link);
  }
}

// ═══════════════════════════════════════════════════════════════════
// BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════

async function loadProduct() {
  const slug = getSlugFromUrl();
  if (!slug) { showError("Không tìm thấy sản phẩm trong URL."); return; }

  // Show skeleton, hide text spinner
  if ($skeleton) $skeleton.style.display = "block";
  if ($loading)  $loading.style.display  = "none";

  try {
    product = await fetchProductBySlug(slug);
    renderProduct();
    loadRelated();
  } catch (err) {
    showError(err.message || "Đã xảy ra lỗi, vui lòng thử lại.");
  }
}

loadProduct();