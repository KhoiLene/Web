// tat-ca-san-pham.js — Trang "Tất cả sản phẩm".
// Liệt kê toàn bộ SP + sidebar lọc theo nhóm (CHA + CON) + search/sort + phân trang.
//
// URL params hỗ trợ:
//   ?group=<slug|id>    Lọc theo nhóm cụ thể (CHA hoặc CON). Bỏ trốn = tất cả.
//   ?search=<keyword>   Lọc theo tên SP.
//   ?sort=<newest|price_asc|price_desc|name>
//   ?page=<n>           Trang hiện tại (1-based).
//
// Bảng Supabase:
//   product_groups  (id, name, slug, image_url, parent_id, is_active, is_sale, sort_order)
//   products        (id, name, slug, group_id, price, discount, final_price, image_url,
//                    images, rating, reviews, stock, is_active, status, created_at, is_new)

import { productsApi, productGroupsApi } from "../api-service/api.js";

const PRODUCT_DETAIL_PATH = "/components/san-pham/san-pham.html";
const PAGE_SIZE = 16;

const $loading    = document.getElementById("loadingState");
const $error      = document.getElementById("errorState");
const $wrapper    = document.getElementById("allWrapper");
const $sidebar    = document.getElementById("sidebar");
const $sidebarTree = document.getElementById("sidebarTree");
const $backdrop   = document.getElementById("sidebarBackdrop");
const $filterBtn  = document.getElementById("filterBtn");
const $sidebarClose = document.getElementById("sidebarClose");
const $sortSelect = document.getElementById("sortSelect");
const $search     = document.getElementById("searchInput");
const $grid       = document.getElementById("productsGrid");
const $empty      = document.getElementById("emptyState");
const $pagination = document.getElementById("pagination");
const $totalCount = document.getElementById("totalCount");
const $countAll   = document.getElementById("countAll");
const $activeFilter = document.getElementById("activeFilter");
const $activeChipText = document.getElementById("activeChipText");
const $clearFilter = document.getElementById("clearFilter");

let allGroups = [];      // product_groups (CHA + CON)
const allProductsCache = []; // cache toàn bộ SP sau khi fetch lần đầu
let allProducts = [];    // products sau khi filter theo group_id
let currentGroup = "__all__";
let currentSort = "newest";
let currentSearch = "";
let currentPage = 1;

/* ─── URL helpers ──────────────────────────────────────────── */
function readUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    group: params.get("group") || "__all__",
    search: params.get("search") || "",
    sort: params.get("sort") || "newest",
    page: Math.max(1, parseInt(params.get("page") || "1", 10) || 1),
  };
}
function writeUrl(replace = false) {
  const params = new URLSearchParams();
  if (currentGroup !== "__all__") params.set("group", currentGroup);
  if (currentSearch) params.set("search", currentSearch);
  if (currentSort !== "newest") params.set("sort", currentSort);
  if (currentPage > 1) params.set("page", String(currentPage));
  const url = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
  if (replace) window.history.replaceState({}, "", url);
  else window.history.pushState({}, "", url);
}

/* ─── Utils ────────────────────────────────────────────────── */
function formatVND(n) { return Number(n || 0).toLocaleString("vi-VN") + "đ"; }
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
function normalizeImages(p) {
  if (!p) return [];
  if (Array.isArray(p.images) && p.images.length) return p.images.filter(Boolean);
  if (typeof p.images === "string" && p.images.trim()) {
    const t = p.images.trim();
    try {
      const arr = JSON.parse(t);
      if (Array.isArray(arr)) return arr.filter(Boolean);
    } catch { /* fallthrough */ }
    return t.split(/[,;]\s*/).filter(Boolean);
  }
  if (p.image_url) return [p.image_url];
  return [];
}
function resolveGroupHref(slugOrId) {
  return `/components/nhom-san-pham/nhom-san-pham.html?slug=${encodeURIComponent(slugOrId)}`;
}

/* ─── Group tree ───────────────────────────────────────────── */
function buildGroupTree() {
  const roots = allGroups
    .filter((g) => g.parent_id == null && g.is_active !== false)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  return roots.map((r) => ({
    ...r,
    children: allGroups
      .filter((c) => c.parent_id === r.id && c.is_active !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
  }));
}

/* ─── Sidebar render ───────────────────────────────────────── */
function renderSidebar(tree) {
  const html = tree.map((root) => {
    const childHtml = root.children.map((c) => `
      <li>
        <label class="sidebar-tree__child">
          <input type="radio" name="group-filter" value="${esc(c.slug || c.id)}">
          <span>${esc(c.name)}</span>
        </label>
      </li>
    `).join("");
    return `
      <li class="sidebar-tree__root" data-group-root="${esc(root.slug || root.id)}">
        <label class="sidebar-tree__root-label">
          <span class="toggle-icon"><i class="fas fa-chevron-right"></i></span>
          <input type="radio" name="group-filter" value="${esc(root.slug || root.id)}">
          <span>${esc(root.name)}</span>
        </label>
        ${childHtml ? `<ul class="sidebar-tree__children">${childHtml}</ul>` : ""}
      </li>
    `;
  }).join("");
  $sidebarTree.innerHTML = html;

  // Toggle expand khi click vào root-label (KHÔNG click vào radio)
  $sidebarTree.querySelectorAll(".sidebar-tree__root-label").forEach((label) => {
    label.addEventListener("click", (e) => {
      // Click vào radio → KHÔNG toggle, để browser xử lý bình thường
      if (e.target.matches('input[type="radio"]')) return;
      const root = label.closest(".sidebar-tree__root");
      root.classList.toggle("is-open");
    });
  });

  // Khi chọn 1 root → tự động mở rộng children để thấy
  $sidebarTree.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const val = e.target.value;
      currentGroup = val;
      currentPage = 1;
      writeUrl();
      applyFilter();
      // Auto-expand nếu chọn nhóm CHA
      const root = e.target.closest(".sidebar-tree__root");
      if (root) root.classList.add("is-open");
      closeSidebar();
    });
  });
}

function highlightSelectedGroup() {
  document.querySelectorAll('input[name="group-filter"]').forEach((r) => {
    r.checked = (r.value === currentGroup);
  });

  if (currentGroup === "__all__") return;

  // Tìm group hiện tại (CHA hoặc CON) để mở rộng CHA của nó trên sidebar
  const g = allGroups.find((x) => x.slug === currentGroup || String(x.id) === currentGroup);
  if (!g) return;

  // Nếu là CON → mở CHA cha
  // Nếu là CHA → mở chính nó (để hiện CON)
  const parentId = g.parent_id ?? g.id;
  const parent = allGroups.find((x) => x.id === parentId);
  if (!parent) return;

  const rootEl = $sidebarTree.querySelector(`[data-group-root="${CSS.escape(parent.slug || String(parent.id))}"]`);
  if (rootEl) rootEl.classList.add("is-open");
}

/* ─── Filter / sort / paginate ─────────────────────────────── */
function applyFilter() {
  // Lọc theo nhóm hiện tại
  const matched = new Set();
  if (currentGroup === "__all__") {
    allGroups.forEach((g) => matched.add(g.id));
  } else {
    // Có thể là slug/id của CHA hoặc CON
    const g = allGroups.find((x) => x.slug === currentGroup || String(x.id) === currentGroup);
    if (g) {
      matched.add(g.id);
      // Nếu là CHA → bao gồm cả CON
      if (g.parent_id == null) {
        allGroups.filter((c) => c.parent_id === g.id).forEach((c) => matched.add(c.id));
      }
    }
  }
  allProducts = allProductsCache.filter((p) => matched.has(p.group_id));
}

function sortProducts(list) {
  const arr = list.slice();
  switch (currentSort) {
    case "price_asc":
      arr.sort((a, b) => effectivePrice(a) - effectivePrice(b)); break;
    case "price_desc":
      arr.sort((a, b) => effectivePrice(b) - effectivePrice(a)); break;
    case "name":
      arr.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "vi")); break;
    case "newest":
    default:
      arr.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }
  return arr;
}
function effectivePrice(p) {
  const base = Number(p.price || 0);
  const disc = Number(p.discount || 0);
  return base * (1 - disc / 100);
}

function productCard(p) {
  const price = effectivePrice(p);
  const hasDiscount = Number(p.discount) > 0 ||
    (p.final_price != null && Number(p.final_price) < Number(p.price));
  const oldPrice = Number(p.old_price || p.price);
  const rating = Number(p.rating || 5).toFixed(1);
  const reviewCount = Number(p.reviews || 0);
  const inStock = Number(p.stock || 0) > 0;
  const images = normalizeImages(p);
  const img = images[0] || "https://placehold.co/400x400?text=NO+IMAGE";

  // Link: tất cả SP đều đi đến san-pham.html
  const detailHref = `${PRODUCT_DETAIL_PATH}?slug=${encodeURIComponent(p.slug || "")}`;

  return `
    <a class="product-card" href="${detailHref}">
      <div class="product-card__media">
        <img src="${esc(img)}" alt="${esc(p.name || "")}" loading="lazy"
             onerror="this.onerror=null;this.src='https://placehold.co/400x400?text=NO+IMAGE'">
        ${hasDiscount ? `<span class="product-card__badge">-${Number(p.discount || 0).toFixed(0)}%</span>` : ""}
        ${!inStock ? `<span class="product-card__oos">Hết hàng</span>` : ""}
      </div>
      <div class="product-card__body">
        <div class="product-card__name">${esc(p.name || "")}</div>
        <div class="product-card__price">
          <span class="current-price">${formatVND(price)}</span>
          ${hasDiscount && oldPrice > price ? `<span class="old-price">${formatVND(oldPrice)}</span>` : ""}
        </div>
        <div class="product-card__rating">
          <span class="stars">★★★★★</span>
          <span class="rating-text">${rating} · ${reviewCount} đánh giá</span>
        </div>
      </div>
    </a>
  `;
}

function renderPagination(totalItems) {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  if (totalPages <= 1) {
    $pagination.innerHTML = "";
    return;
  }

  const cur = currentPage;
  const pages = [];

  // Trang đầu + ellipsis
  if (cur > 3) {
    pages.push({ type: "page", n: 1 });
    if (cur > 4) pages.push({ type: "ellipsis" });
  }
  // Cửa sổ trang hiện tại
  const from = Math.max(1, cur - 1);
  const to = Math.min(totalPages, cur + 1);
  for (let i = from; i <= to; i++) pages.push({ type: "page", n: i });

  // Ellipsis + trang cuối
  if (cur < totalPages - 2) {
    if (cur < totalPages - 3) pages.push({ type: "ellipsis" });
    pages.push({ type: "page", n: totalPages });
  }

  const items = pages.map((p) => {
    if (p.type === "ellipsis") return `<span class="ellipsis">…</span>`;
    const active = p.n === cur ? "is-active" : "";
    return `<button class="page-link ${active}" data-page="${p.n}">${p.n}</button>`;
  }).join("");

  const prevDis = cur === 1 ? "disabled" : "";
  const nextDis = cur === totalPages ? "disabled" : "";
  $pagination.innerHTML = `
    <button data-page="${cur - 1}" ${prevDis}><i class="fas fa-chevron-left"></i></button>
    ${items}
    <button data-page="${cur + 1}" ${nextDis}><i class="fas fa-chevron-right"></i></button>
  `;

  $pagination.querySelectorAll("button[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const n = parseInt(btn.dataset.page, 10);
      if (!n || n === currentPage) return;
      currentPage = n;
      writeUrl();
      renderView();
      window.scrollTo({ top: $wrapper.offsetTop - 80, behavior: "smooth" });
    });
  });
}

function renderActiveChip() {
  if (currentGroup === "__all__") {
    $activeFilter.style.display = "none";
    return;
  }
  const g = allGroups.find((x) => x.slug === currentGroup || String(x.id) === currentGroup);
  $activeFilter.style.display = "flex";
  $activeChipText.textContent = g ? g.name : "Đang lọc";
}

function renderView() {
  // 1. Lọc theo group_id (đã làm ở applyFilter)
  let list = allProducts;

  // 2. Lọc theo search
  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    list = list.filter((p) => String(p.name || "").toLowerCase().includes(q));
  }

  // 3. Sort
  list = sortProducts(list);

  // 4. Paginate
  const totalItems = list.length;
  const start = (currentPage - 1) * PAGE_SIZE;
  const slice = list.slice(start, start + PAGE_SIZE);

  // 5. Update counts
  $totalCount.textContent = totalItems;
  $countAll.textContent = allProductsCache.length;

  // 6. Render grid
  if (slice.length === 0) {
    $grid.innerHTML = "";
    $empty.style.display = "block";
    $grid.style.display = "none";
  } else {
    $empty.style.display = "none";
    $grid.style.display = "grid";
    $grid.innerHTML = slice.map(productCard).join("");
  }

  // 7. Pagination
  renderPagination(totalItems);

  // 8. Active chip
  renderActiveChip();

  // 9. Highlight selected radio
  highlightSelectedGroup();
}

/* ─── Sidebar drawer (mobile) ──────────────────────────────── */
function openSidebar() {
  $sidebar.classList.add("is-open");
  $backdrop.classList.add("is-open");
  document.body.style.overflow = "hidden";
}
function closeSidebar() {
  $sidebar.classList.remove("is-open");
  $backdrop.classList.remove("is-open");
  document.body.style.overflow = "";
}

/* ─── Events ───────────────────────────────────────────────── */
$sortSelect?.addEventListener("change", (e) => {
  currentSort = e.target.value;
  currentPage = 1;
  writeUrl();
  renderView();
});

$search?.addEventListener("input", debounce((e) => {
  currentSearch = e.target.value.trim();
  currentPage = 1;
  writeUrl();
  renderView();
}, 220));

// Nút "Lọc" (mobile) → mở drawer
$filterBtn?.addEventListener("click", openSidebar);
$sidebarClose?.addEventListener("click", closeSidebar);
$backdrop?.addEventListener("click", closeSidebar);

// ESC đóng drawer
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $sidebar.classList.contains("is-open")) closeSidebar();
});

// Click "Tất cả sản phẩm" (radio "__all__") trên sidebar
document.querySelector('input[name="group-filter"][value="__all__"]')?.addEventListener("change", (e) => {
  if (!e.target.checked) return;
  currentGroup = "__all__";
  currentPage = 1;
  writeUrl();
  applyFilter();
  renderView();
  closeSidebar();
});

// Bỏ lọc chip
$clearFilter?.addEventListener("click", () => {
  currentGroup = "__all__";
  currentPage = 1;
  writeUrl();
  applyFilter();
  renderView();
  closeSidebar();
});

// Back/forward navigation (popstate)
window.addEventListener("popstate", () => {
  const u = readUrl();
  currentGroup = u.group;
  currentSort = u.sort;
  currentSearch = u.search;
  currentPage = u.page;
  $sortSelect.value = currentSort;
  $search.value = currentSearch;
  applyFilter();
  renderView();
});

/* ─── Load ─────────────────────────────────────────────────── */
async function load() {
  try {
    const url = readUrl();
    currentGroup = url.group;
    currentSort = url.sort;
    currentSearch = url.search;
    currentPage = url.page;
    $sortSelect.value = currentSort;
    $search.value = currentSearch;

    // Lấy groups + products song song
    const [groupsRes, productsRes] = await Promise.all([
      productGroupsApi.getAll(),
      productsApi.getAll({ limit: 1000 }),
    ]);

    allGroups = (groupsRes.data || []).filter((g) => g.is_active !== false);
    allProductsCache.length = 0;
    (productsRes.data || []).forEach((p) => {
      if (p.is_active !== false && p.status !== "deleted") allProductsCache.push(p);
    });

    renderSidebar(buildGroupTree());
    applyFilter();
    renderView();

    $loading.style.display = "none";
    $wrapper.style.display = "block";
    document.title = "Tất cả sản phẩm | Techtra";
  } catch (err) {
    console.error("[tat-ca-san-pham] Lỗi:", err);
    $loading.style.display = "none";
    $error.style.display = "block";
    $error.textContent = "⚠️ " + (err?.message || "Không tải được dữ liệu");
  }
}

load();