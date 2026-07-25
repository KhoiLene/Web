// ─────────────────────────────────────────────────────────────────────────────
// tin-tuc-theo-nhom.js — Trang lọc bài viết theo nhóm con (public)
// Đọc ?slug=... từ URL → tìm news_categories theo slug → query posts filter
// category_id + status=published, có search + filter post_type + phân trang
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "../../components/api-service/api.js";

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  category: null,     // { id, name, slug, parent_id, description, image_url }
  rootCategory: null, // nhóm cha (nếu có)
  all: [],
  search: "",
  ptype: "all",
  page: 1,
  pageSize: 9,
};

// ─── DOM refs ────────────────────────────────────────────────────────────────
const $loading     = document.getElementById("tnLoading");
const $error       = document.getElementById("tnError");
const $empty       = document.getElementById("tnEmpty");
const $grid        = document.getElementById("tnGrid");
const $pager       = document.getElementById("tnPager");
const $prev        = document.getElementById("tnPrevBtn");
const $next        = document.getElementById("tnNextBtn");
const $pageInfo    = document.getElementById("tnPageInfo");
const $search      = document.getElementById("tnSearchInput");
const $ptypeBox    = document.getElementById("tnTypeFilter");
const $groupTitle  = document.getElementById("ttnGroupTitle");
const $groupDesc   = document.getElementById("ttnGroupDesc");
const $breadcrumb  = document.getElementById("ttnBreadcrumb");

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

// ─── Render header nhóm + breadcrumb ─────────────────────────────────────────
function renderHeader() {
  const c = state.category;
  if (!c) return;
  $groupTitle.innerHTML = `<i class="${esc(c.icon || "fas fa-folder")}"></i> ${esc(c.name)}`;
  if (c.description) {
    $groupDesc.textContent = c.description;
  } else {
    $groupDesc.textContent = `Tổng hợp các bài viết thuộc nhóm "${c.name}" trên Techtra.`;
  }

  // Breadcrumb: Trang chủ > Bài viết > {root} > {c}
  let html = `<a href="/components/tin-tuc/tin-tuc.html"><i class="fas fa-newspaper"></i> Bài viết</a>`;
  if (state.rootCategory) {
    html += ` <span class="sep">/</span> <span>${esc(state.rootCategory.name)}</span>`;
  }
  html += ` <span class="sep">/</span> <span class="current">${esc(c.name)}</span>`;
  $breadcrumb.innerHTML = html;

  // Title trang
  document.title = `${c.name} | Bài viết - Techtra`;
}

// ─── Render card (hỗ trợ 3 loại: link / file / manual) ───────────────────────
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
    if (state.ptype !== "all" && (p.post_type || "link") !== state.ptype) return false;
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
    $empty.querySelector("p").textContent  = "Thử đổi từ khóa hoặc bỏ filter loại bài.";
    return;
  }
  showState("ok");
  slice.forEach((p) => $grid.appendChild(renderCard(p)));

  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  $pageInfo.textContent = `Trang ${state.page} / ${totalPages}`;
  $prev.disabled = state.page <= 1;
  $next.disabled = state.page >= totalPages;
}

// ─── Load dữ liệu ───────────────────────────────────────────────────────────
async function loadCategoryAndPosts(slug) {
  showState("loading");
  try {
    if (!slug) throw new Error("Thiếu slug nhóm trong URL");

    // 1) Tìm nhóm theo slug
    const { data: cat, error: catErr } = await supabase
      .from("news_categories")
      .select("id, name, slug, description, icon, parent_id")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (catErr) throw new Error(catErr.message);
    if (!cat) {
      $error.innerHTML = `<i class="fas fa-exclamation-circle"></i> Không tìm thấy nhóm "<code>${esc(slug)}</code>".`;
      showState("error");
      return;
    }
    state.category = cat;

    // 2) Tìm root nếu category là con
    if (cat.parent_id) {
      const { data: root } = await supabase
        .from("news_categories")
        .select("id, name, slug")
        .eq("id", cat.parent_id)
        .maybeSingle();
      state.rootCategory = root;
    }
    renderHeader();

    // 3) Query bài viết thuộc nhóm (nếu là root mà không có con → không có bài nào thuộc root trực tiếp)
    // Cho phép cả root lẫn child: lấy bài có category_id = cat.id
    const { data: posts, error: pErr } = await supabase
      .from("posts")
      .select("id, slug, title, summary, site_name, source_url, thumbnail, thumbnail_source, post_type, file_name, file_size, file_url, published_at, created_at, category_id")
      .eq("status", "published")
      .eq("category_id", cat.id)
      .order("published_at", { ascending: false });

    if (pErr) throw new Error(pErr.message);
    state.all = posts || [];
    render();
  } catch (err) {
    console.error("[tin-tuc-theo-nhom] error:", err);
    $error.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${esc(err.message || "Lỗi không xác định")}`;
    showState("error");
  }
}

// ─── Events ──────────────────────────────────────────────────────────────────
$search.addEventListener("input", (e) => {
  state.search = e.target.value || "";
  state.page = 1;
  render();
});

$ptypeBox.addEventListener("click", (e) => {
  const btn = e.target.closest(".tn-chip");
  if (!btn) return;
  $ptypeBox.querySelectorAll(".tn-chip").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  state.ptype = btn.dataset.ptype || "all";
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
const slug = new URLSearchParams(location.search).get("slug") || "";
loadCategoryAndPosts(slug);
