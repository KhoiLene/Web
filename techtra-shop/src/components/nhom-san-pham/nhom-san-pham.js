// nhom-san-pham.js — Trang danh sách sản phẩm theo nhóm.
// File nằm trong /components/nhom-san-pham/ nên import path là ../api-service/api.js.
// Bảng `product_groups` (cha-con) trong Supabase:
//   id, name, slug, image_url, parent_id, is_active, is_sale, sort_order
import { productsApi, productGroupsApi } from "../api-service/api.js";

// URL trang chi tiết SP (dùng chung với phần product detail ở /san-pham/)
const PRODUCT_DETAIL_PATH = "/components/san-pham/san-pham.html";

function getGroupSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("slug")) return params.get("slug");
  const match = window.location.pathname.match(/\/nhom-san-pham\/([^/]+)\/?$/);
  if (match) return decodeURIComponent(match[1]);
  return "";
}
  
function formatVND(n) { return Number(n || 0).toLocaleString("vi-VN") + "đ"; }

function normalizeProductImages(product) {
  if (!product) return [];
  if (Array.isArray(product.images) && product.images.length) {
    return product.images.map((img) => (typeof img === "string" ? img.trim() : img)).filter(Boolean);
  }
  if (typeof product.images === "string" && product.images.trim()) {
    const trimmed = product.images.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((img) => (typeof img === "string" ? img.trim() : img)).filter(Boolean);
      }
    } catch {
      if (trimmed.includes(",")) return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
      if (trimmed.includes(";")) return trimmed.split(";").map((s) => s.trim()).filter(Boolean);
      return [trimmed];
    }
  }
  if (typeof product.image_url === "string" && product.image_url.trim()) return [product.image_url.trim()];
  if (typeof product.image === "string" && product.image.trim()) return [product.image.trim()];
  return [];
}

let group = null;
let allProducts = [];
let currentSort = "newest";
let currentSearch = "";

const $loading    = document.getElementById("loadingState");
const $error      = document.getElementById("errorState");
const $wrapper    = document.getElementById("groupWrapper");
const $breadcrumb = document.getElementById("breadcrumb");
const $groupName  = document.getElementById("groupName");
const $groupDesc  = document.getElementById("groupDesc");
const $groupCount = document.getElementById("groupCount");
const $groupImg   = document.getElementById("groupImg");
const $sortSelect = document.getElementById("sortSelect");
const $grid       = document.getElementById("productsGrid");
const $empty      = document.getElementById("emptyState");
const $search     = document.getElementById("searchInput");

function productCard(p) {
  const price = Number(p.price || 0) * (1 - (Number(p.discount) || 0) / 100);
  const images = normalizeProductImages(p);
  const img = images[0] || "/placeholder.png";
  const hasDiscount = Number(p.discount) > 0;
  const rating = Number(p.rating || 5).toFixed(1);
  const reviewCount = Number(p.reviews || 0);
  const inStock = Number(p.stock || 0) > 0;

  return `
    <a class="product-card" href="${PRODUCT_DETAIL_PATH}?slug=${encodeURIComponent(p.slug || "")}">
      <div class="product-card__media">
        <img src="${img}" alt="${(p.name || "").replace(/"/g, "&quot;")}">
        ${hasDiscount ? `<span class="product-card__badge">-${Number(p.discount).toFixed(0)}%</span>` : ""}
        ${!inStock ? `<span class="product-card__oos">Hết hàng</span>` : ""}
      </div>
      <div class="product-card__body">
        <div class="product-card__name">${(p.name || "").replace(/</g, "&lt;")}</div>
        <div class="product-card__price">
          <span class="current-price">${formatVND(price)}</span>
          ${hasDiscount ? `<span class="old-price">${formatVND(p.price)}</span>` : ""}
        </div>
        <div class="product-card__rating">
          <span class="stars">★★★★★</span>
          <span class="rating-text">${rating} · ${reviewCount} đánh giá</span>
        </div>
      </div>
    </a>
  `;
}

function applySort(list, sort) {
  const arr = list.slice();
  switch (sort) {
    case "price_asc":  arr.sort((a, b) => Number(a.price || 0) - Number(b.price || 0)); break;
    case "price_desc": arr.sort((a, b) => Number(b.price || 0) - Number(a.price || 0)); break;
    case "name":       arr.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "vi")); break;
    case "newest":
    default:           arr.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }
  return arr;
}

function renderProducts() {
  const filtered = currentSearch
    ? allProducts.filter((p) => String(p.name || "").toLowerCase().includes(currentSearch.toLowerCase()))
    : allProducts;
  const sorted = applySort(filtered, currentSort);

  $groupCount.textContent = filtered.length;
  $grid.innerHTML = sorted.map(productCard).join("");

  if (sorted.length === 0) {
    $empty.style.display = "block";
    $grid.style.display = "none";
  } else {
    $empty.style.display = "none";
    $grid.style.display = "grid";
  }
}

async function loadGroup() {
  const slug = getGroupSlugFromUrl();
  if (!slug) {
    showError("Không tìm thấy nhóm sản phẩm trong URL");
    return;
  }
  try {
    // Tìm nhóm theo slug trên product_groups (cha + con)
    const treeRes = await productGroupsApi.getAll();
    const allGroups = treeRes.data || [];
    group = allGroups.find((g) => g.slug === slug || String(g.id) === slug) || null;
    if (!group) {
      try {
        const one = await productGroupsApi.getOne(slug);
        group = one.data;
      } catch {
        throw new Error("Không tìm thấy nhóm sản phẩm này");
      }
    }
    const productsRes = await productsApi.getAll({ group_id: group.id, limit: 100 });
    allProducts = (productsRes.data || []).filter((p) => p.is_active !== false && p.status !== "deleted");

    $loading.style.display = "none";
    $wrapper.style.display = "block";
    document.title = `${group.name} | Techtra`;

    $breadcrumb.innerHTML = `
      <a href="/components/trang-chu/">Trang chủ</a>
      / <span style="color:#111827">${group.name}</span>
    `;
    $groupName.textContent = group.name;
    $groupDesc.textContent = group.description || "";
    if (group.image_url) {
      $groupImg.innerHTML = `<img src="${group.image_url}" alt="${group.name}" onerror="this.outerHTML='<i class=\\'fas fa-folder\\' style=\\'font-size:96px;color:#2563eb\\' aria-hidden=\\'true\\'></i>'">`;
    } else {
      $groupImg.innerHTML = "";
    }
    renderProducts();
  } catch (err) {
    showError(err.message || "Lỗi tải dữ liệu");
  }
}

function showError(message) {
  $loading.style.display = "none";
  $error.style.display = "block";
  $error.textContent = "⚠️ " + message;
}

$sortSelect?.addEventListener("change", (e) => {
  currentSort = e.target.value;
  renderProducts();
});

let searchTimer = null;
$search?.addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  const value = e.target.value;
  searchTimer = setTimeout(() => {
    currentSearch = value.trim();
    renderProducts();
  }, 200);
});

loadGroup();
