import { productsApi, productGroupsApi } from "./api.js";

// ─── Lấy slug từ URL ────────────────────────────────────────────────────────
function getSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("slug")) return params.get("slug");
  const path = window.location.pathname;
  const parts = path.split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "";
  if (last.endsWith(".html")) return "";
  return last;
}

function formatVND(n) {
  return Number(n || 0).toLocaleString("vi-VN") + "đ";
}

// ─── State ──────────────────────────────────────────────────────────────────
let product = null;
let activeImageIndex = 0;
let quantity = 1;

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

const $relatedSection = document.getElementById("relatedSection");
const $relatedGrid     = document.getElementById("relatedGrid");

const $cartBadge       = document.getElementById("cartBadge");

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
  if (!related.length) return;

  $relatedSection.style.display = "block";
  $relatedGrid.innerHTML = related.map((p) => {
    const price = p.price * (1 - (p.discount || 0) / 100);
    const img = p.images?.[0] || "/placeholder.png";
    return `
      <a class="related-card" href="/san-pham/${p.slug}/">
        <img src="${img}" alt="${p.name}">
        <div class="name">${p.name}</div>
        <div class="price">${formatVND(price)}</div>
      </a>
    `;
  }).join("");
}

function showError(message) {
  $loading.style.display = "none";
  $error.style.display = "block";
  $error.textContent = "⚠️ " + message;
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

  const images = product.images?.length ? product.images : ["/placeholder.png"];
  renderGallery(images, product.video_url);

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
  if (product.description) {
    $descriptionContent.innerHTML = product.description;
  } else {
    $descriptionContent.textContent = "Sản phẩm chưa có mô tả.";
  }
}

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
  $cartBadge.textContent = totalQty;
}

$btnAddCart.addEventListener("click", () => {
  if (!product) return;
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);
  if (existing) existing.quantity += quantity;
  else cart.push({ id: product.id, name: product.name, slug: product.slug, image: product.images?.[0] || "", price: product.final_price, quantity });
  localStorage.setItem("techtra_cart", JSON.stringify(cart));
  updateCartBadge();
  alert(`Đã thêm ${quantity} "${product.name}" vào giỏ hàng!`);
});

$btnBuyNow.addEventListener("click", () => {
  if (!product) return;
  const cart = [{ id: product.id, name: product.name, slug: product.slug, image: product.images?.[0] || "", price: product.final_price, quantity }];
  localStorage.setItem("techtra_buynow", JSON.stringify(cart));
  window.location.href = "/thanh-toan";
});

// ─── Khởi chạy ───────────────────────────────────────────────────────────────
updateCartBadge();
loadProduct();