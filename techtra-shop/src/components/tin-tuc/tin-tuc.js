// ─────────────────────────────────────────────────────────────────────────────
// tin-tuc.js — Trang danh sách bài viết (public)
// Load bài viết đã xuất bản từ Supabase, có search + filter site + filter nhóm + phân trang
// ─────────────────────────────────────────────────────────────────────────────

import { postsApi, newsCategoriesApi, request } from "../../components/api-service/api.js";

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  all: [],          // toàn bộ bài published, lấy 1 lần
  site: "all",      // filter site hiện tại
  categoryId: "",   // filter theo news_categories.id
  search: "",       // keyword search
  page: 1,
  pageSize: 9,
};

// ─── DOM refs ────────────────────────────────────────────────────────────────
const $loading = document.getElementById("tnLoading");
const $error   = document.getElementById("tnError");
const $empty   = document.getElementById("tnEmpty");
const $grid    = document.getElementById("tnGrid");
const $pager   = document.getElementById("tnPager");
const $prev    = document.getElementById("tnPrevBtn");
const $next    = document.getElementById("tnNextBtn");
const $pageInfo= document.getElementById("tnPageInfo");
const $search  = document.getElementById("tnSearchInput");
const $catBox  = document.getElementById("tnCategoryFilter");
const $siteBox = document.getElementById("tnSiteFilter");

// ─── Utils ───────────────────────────────────────────────────────────────────
function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fmtDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return ""; }
}

function fmtSize(b) {
  if (!b && b !== 0) return "";
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
  return (b / 1024 / 1024).toFixed(2) + " MB";
}

function fileIcon(name = "") {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return "fas fa-file-pdf";
  if (["doc", "docx"].includes(ext)) return "fas fa-file-word";
  if (["xls", "xlsx"].includes(ext)) return "fas fa-file-excel";
  if (["ppt", "pptx"].includes(ext)) return "fas fa-file-powerpoint";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "fas fa-file-image";
  return "fas fa-file";
}

function showState(which) {
  $loading.style.display = which === "loading" ? "block" : "none";
  $error.style.display   = which === "error"   ? "block" : "none";
  $empty.style.display   = which === "empty"   ? "block" : "none";
  $grid.style.display    = which === "ok"      ? "grid"  : "none";
  $pager.style.display   = which === "ok"      ? "flex"  : "none";
}

// ─── Render site chips ───────────────────────────────────────────────────────
function renderSiteChips(sites) {
  // giữ nút "Mọi nguồn"
  const allBtn = $siteBox.querySelector('[data-site="all"]');
  $siteBox.innerHTML = "";
  $siteBox.appendChild(allBtn);
  sites.forEach((s) => {
    const btn = document.createElement("button");
    btn.className = "tn-chip";
    btn.dataset.site = s;
    btn.textContent = s;
    $siteBox.appendChild(btn);
  });
}

// ─── Render category chips (lấy các nhóm con có bài viết) ───────────────────
function renderCategoryChips(tree, posts) {
  // Đếm bài theo category_id
  const counts = new Map();
  posts.forEach((p) => {
    if (p.category_id != null) counts.set(p.category_id, (counts.get(p.category_id) || 0) + 1);
  });

  // Lấy children có bài
  const seen = new Set();
  const items = [];
  tree.forEach((root) => {
    (root.children || []).forEach((c) => {
      const n = counts.get(c.id) || 0;
      if (n > 0) {
        items.push({ id: c.id, name: c.name, parentName: root.name, count: n });
        seen.add(c.id);
      }
    });
  });

  const allBtn = $catBox.querySelector('[data-cat=""]');
  $catBox.innerHTML = "";
  $catBox.appendChild(allBtn);
  items.forEach((it) => {
    const btn = document.createElement("button");
    btn.className = "tn-chip";
    btn.dataset.cat = String(it.id);
    btn.title = `${it.parentName} › ${it.name}`;
    btn.innerHTML = `<i class="fas fa-folder"></i> ${esc(it.name)} <small>(${it.count})</small>`;
    $catBox.appendChild(btn);
  });
}

// ─── Render card ─────────────────────────────────────────────────────────────
function renderCard(p) {
  const a = document.createElement("a");
  a.className = "tn-card";
  a.href = `/components/tin-tuc/tin-tuc-chi-tiet.html?slug=${encodeURIComponent(p.slug || "")}`;

  const ptype = p.post_type || "link";
  const date  = fmtDate(p.published_at || p.created_at);
  const summary = p.summary || "";

  // Card cho FILE
  if (ptype === "file") {
    const ext = (p.file_name || "").split(".").pop() || "";
    a.innerHTML = `
      <div class="tn-thumb-wrap tn-file-thumb">
        <i class="${fileIcon(p.file_name)}"></i>
        <span class="tn-file-ext">${esc(ext.toUpperCase() || "FILE")}</span>
      </div>
      <div class="tn-body">
        <h3 class="tn-card-title">${esc(p.title || "Không tiêu đề")}</h3>
        ${summary ? `<p class="tn-summary">${esc(summary)}</p>` : ""}
        <div class="tn-meta">
          <span class="tn-date"><i class="far fa-calendar"></i> ${esc(date)}</span>
          <span class="tn-size">${esc(fmtSize(p.file_size))}</span>
        </div>
        <div class="tn-file-action">
          <i class="fas fa-download"></i> Tải về (${esc(p.file_name || "file")})
        </div>
      </div>
    `;
    return a;
  }

  // Card cho LINK / MANUAL / SCRAPED
  const thumb = p.thumbnail || p.thumbnail_source || "";
  const site  = p.site_name || p.source_site || "";
  a.innerHTML = `
    <div class="tn-thumb-wrap">
      ${thumb
        ? `<img class="tn-thumb" src="${esc(thumb)}" alt="${esc(p.title || "")}" loading="lazy" onerror="this.outerHTML='<div class=\\'tn-thumb-empty\\'><i class=\\'far fa-newspaper\\'></i></div>'">`
        : `<div class="tn-thumb-empty"><i class="far fa-newspaper"></i></div>`}
      ${site ? `<span class="tn-site-badge">${esc(site)}</span>` : ""}
      ${ptype === "manual" ? `<span class="tn-type-badge"><i class="fas fa-pen"></i> Bài viết</span>` : ""}
    </div>
    <div class="tn-body">
      <h3 class="tn-card-title">${esc(p.title || "Không tiêu đề")}</h3>
      ${summary ? `<p class="tn-summary">${esc(summary)}</p>` : ""}
      <div class="tn-meta">
        <span class="tn-date"><i class="far fa-calendar"></i> ${esc(date)}</span>
        <span class="tn-readmore">Đọc tiếp →</span>
      </div>
    </div>
  `;
  return a;
}

// ─── Filter + paginate ───────────────────────────────────────────────────────
function getFiltered() {
  const kw = state.search.trim().toLowerCase();
  return state.all.filter((p) => {
    if (state.site !== "all" && (p.site_name || p.source_site) !== state.site) return false;
    if (state.categoryId && String(p.category_id) !== String(state.categoryId)) return false;
    if (kw) {
      const hay = `${p.title || ""} ${p.summary || ""}`.toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    return true;
  });
}

function render() {
  const filtered = getFiltered();
  const total = filtered.length;
  const start = (state.page - 1) * state.pageSize;
  const slice = filtered.slice(start, start + state.pageSize);

  $grid.innerHTML = "";
  if (!state.all.length) {
    showState("empty");
    return;
  }
  if (!slice.length) {
    showState("empty");
    $empty.querySelector("h3").textContent = "Không có bài phù hợp";
    $empty.querySelector("p").textContent  = "Thử đổi từ khóa hoặc bỏ filter.";
    return;
  }
  showState("ok");
  slice.forEach((p) => $grid.appendChild(renderCard(p)));

  // pager
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  $pageInfo.textContent = `Trang ${state.page} / ${totalPages}`;
  $prev.disabled = state.page <= 1;
  $next.disabled = state.page >= totalPages;
}

// ─── Load bài từ Supabase ────────────────────────────────────────────────────
async function loadPosts() {
  showState("loading");
  try {
    const r = await request(
      "GET",
      `/db/posts?status=eq.published&select=id,slug,title,summary,site_name,source_url,thumbnail,thumbnail_source,post_type,file_name,file_size,file_url,published_at,created_at,category_id&order=published_at.desc`
    );

    state.all = r.data || [];

    // build site chips
    const sites = Array.from(
      new Set(state.all.map((p) => p.site_name || p.source_site).filter(Boolean))
    ).sort();
    renderSiteChips(sites);

    // Load cây nhóm tin tức (best-effort, không chặn nếu lỗi)
    try {
      const catsRes = await newsCategoriesApi.getAll();
      const cats = catsRes.data || [];
      if (cats && cats.length) {
        const roots = cats
          .filter((r) => !r.parent_id)
          .map((r) => ({
            ...r,
            children: cats
              .filter((c) => c.parent_id === r.id)
              .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
          }));
        renderCategoryChips(roots, state.all);
      }
    } catch (catErr) {
      console.warn("[tin-tuc] load categories lỗi (không chặn):", catErr.message);
    }

    render();
  } catch (err) {
    console.error("[tin-tuc] load error:", err);
    $error.textContent = "Không tải được danh sách bài viết. " + (err.message || "");
    showState("error");
  }
}

// ─── Events ──────────────────────────────────────────────────────────────────
$search.addEventListener("input", (e) => {
  state.search = e.target.value || "";
  state.page = 1;
  render();
});

$siteBox.addEventListener("click", (e) => {
  const btn = e.target.closest(".tn-chip");
  if (!btn) return;
  $siteBox.querySelectorAll(".tn-chip").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  state.site = btn.dataset.site;
  state.page = 1;
  render();
});

$catBox.addEventListener("click", (e) => {
  const btn = e.target.closest(".tn-chip");
  if (!btn) return;
  $catBox.querySelectorAll(".tn-chip").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  state.categoryId = btn.dataset.cat || "";
  state.page = 1;
  render();
});

$prev.addEventListener("click", () => {
  if (state.page > 1) { state.page--; render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
});
$next.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(getFiltered().length / state.pageSize));
  if (state.page < totalPages) { state.page++; render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
});

// ─── Boot ────────────────────────────────────────────────────────────────────
loadPosts();
