// ─────────────────────────────────────────────────────────────────────────────
// tin-tuc-chi-tiet.js — Trang chi tiết 1 bài viết (public)
// Đọc ?slug=... từ URL, lấy 1 bài published từ Supabase, render + load bài liên quan
// Hỗ trợ 3 loại: link / file (PDF) / manual (HTML)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from "../../components/api-service/api.js";

// ─── DOM refs ────────────────────────────────────────────────────────────────
const $loading     = document.getElementById("tdLoading");
const $error       = document.getElementById("tdError");
const $article     = document.getElementById("tdArticle");
const $site        = document.getElementById("tdSite");
const $date        = document.getElementById("tdDate");
const $title       = document.getElementById("tdTitle");
const $summary     = document.getElementById("tdSummary");
const $byline      = document.getElementById("tdByline");
const $hero        = document.getElementById("tdHero");
const $heroImg     = document.getElementById("tdHeroImg");
const $heroCap     = document.getElementById("tdHeroCap");
const $content     = document.getElementById("tdContent");
const $srcLink     = document.getElementById("tdSourceLink");
const $srcSite     = document.getElementById("tdSourceSite");
const $related     = document.getElementById("tdRelated");
const $relGrid     = document.getElementById("tdRelatedGrid");
const $typeBadge   = document.getElementById("tdTypeBadge");
const $fileBlock   = document.getElementById("tdFileBlock");
const $fileIcon    = document.getElementById("tdFileIcon");
const $fileName    = document.getElementById("tdFileName");
const $fileSize    = document.getElementById("tdFileSize");
const $fileDl      = document.getElementById("tdFileDownload");
const $breadcrumb  = document.getElementById("tdBreadcrumb");

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

function setMeta(name, content) {
  if (!content) return;
  let el = document.querySelector(`meta[property="og:${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", `og:${name}`);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function showState(which) {
  $loading.style.display = which === "loading" ? "block" : "none";
  $error.style.display   = which === "error"   ? "block" : "none";
  $article.style.display = which === "ok"      ? "block" : "none";
}

// ─── Breadcrumb theo nhóm ────────────────────────────────────────────────────
function renderBreadcrumb(category, root) {
  if (!category) { $breadcrumb.innerHTML = ""; return; }
  let html = `<a href="/components/tin-tuc/tin-tuc.html">Bài viết</a>`;
  if (root) {
    html += ` <span class="sep">/</span> <a href="/components/tin-tuc/tin-tuc-theo-nhom.html?slug=${esc(root.slug)}">${esc(root.name)}</a>`;
  }
  html += ` <span class="sep">/</span> <a href="/components/tin-tuc/tin-tuc-theo-nhom.html?slug=${esc(category.slug)}">${esc(category.name)}</a>`;
  $breadcrumb.innerHTML = html;
}

// ─── Sanitize HTML từ Readability ────────────────────────────────────────────
// Readability đã khá sạch (chỉ giữ <p>/<h2>/<img>/<figure>/<a>), nhưng ta vẫn
// lọc thẻ <script>/<style> và on* attributes để chắc chắn an toàn.
function sanitizeHtml(html) {
  if (!html) return "";
  const tpl = document.createElement("template");
  tpl.innerHTML = html;

  // Xoá mọi <script>, <style>, <iframe>, <object>, <embed>
  tpl.content.querySelectorAll("script, style, iframe, object, embed, form, input, button").forEach((el) => el.remove());

  // Xoá on* attributes + javascript: URLs
  const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_ELEMENT, null);
  let node;
  const toClean = [];
  while ((node = walker.nextNode())) toClean.push(node);
  toClean.forEach((el) => {
    [...el.attributes].forEach((attr) => {
      const n = attr.name.toLowerCase();
      if (n.startsWith("on")) el.removeAttribute(attr.name);
      if ((n === "href" || n === "src") && /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
    });
    // ép link mở tab mới
    if (el.tagName === "A") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
    // ép ảnh responsive
    if (el.tagName === "IMG") {
      if (!el.getAttribute("loading")) el.setAttribute("loading", "lazy");
      el.style.maxWidth = "100%";
      el.style.height = "auto";
    }
  });

  return tpl.innerHTML;
}

// ─── Render 1 bài ────────────────────────────────────────────────────────────
function renderArticle(p, category, root) {
  const ptype = p.post_type || "link";
  document.title = `${p.title || "Bài viết"} | Techtra`;

  // SEO meta
  setMeta("title", p.title || "");
  setMeta("description", p.summary || "");
  setMeta("image", p.thumbnail || p.thumbnail_source || "");
  setMeta("url", location.href);

  // Breadcrumb theo nhóm
  renderBreadcrumb(category, root);

  // Type badge
  const typeMap = {
    file:    { label: "File đính kèm", color: "#b91c1c", bg: "#fef2f2" },
    manual:  { label: "Bài viết Techtra", color: "#6d28d9", bg: "#f5f3ff" },
    scraped: { label: "Tin từ báo",      color: "#15803d", bg: "#f0fdf4" },
    link:    { label: "Bài viết ngoài",  color: "#1d4ed8", bg: "#eff6ff" },
  };
  const t = typeMap[ptype];
  if (t) {
    $typeBadge.innerHTML = `<i class="${
      ptype === "file" ? "fas fa-file-pdf" :
      ptype === "manual" ? "fas fa-pen" :
      ptype === "scraped" ? "fas fa-newspaper" : "fas fa-link"
    }"></i> ${esc(t.label)}`;
    $typeBadge.style.background = t.bg;
    $typeBadge.style.color = t.color;
    $typeBadge.style.display = "inline-block";
  }

  // Header
  if (p.site_name) {
    $site.textContent = p.site_name;
    $site.style.display = "inline-block";
  }
  $date.innerHTML = `<i class="far fa-calendar"></i> ${esc(fmtDate(p.published_at || p.created_at))}`;
  $title.textContent = p.title || "Không tiêu đề";

  if (p.summary) {
    $summary.textContent = p.summary;
    $summary.style.display = "block";
  }
  const bylineParts = [];
  if (p.author) bylineParts.push(`<i class="fas fa-user"></i> ${esc(p.author)}`);
  if (p.byline) bylineParts.push(`<i class="fas fa-pen-nib"></i> ${esc(p.byline)}`);
  if (bylineParts.length) {
    $byline.innerHTML = bylineParts.join(" &nbsp;·&nbsp; ");
    $byline.style.display = "block";
  }

  // Hero image (chỉ với bài có ảnh, không dùng cho bài FILE)
  if (ptype === "file") {
    $hero.style.display = "none";
  } else {
    const heroImg = p.thumbnail || p.thumbnail_source || "";
    if (heroImg) {
      $heroImg.src = heroImg;
      $heroImg.alt = p.title || "";
      if (p.site_name) {
        $heroCap.textContent = `Ảnh minh hoạ — Nguồn: ${p.site_name}`;
        $heroCap.style.display = "block";
      }
      $hero.style.display = "block";
    }
  }

  // === Chế độ FILE: hiện block download thay cho content HTML ===
  if (ptype === "file") {
    $fileBlock.style.display = "flex";
    $fileIcon.className = fileIcon(p.file_name);
    $fileName.textContent = p.file_name || "file";
    $fileSize.textContent = fmtSize(p.file_size);
    if (p.file_url) {
      $fileDl.href = p.file_url;
      $fileDl.style.display = "inline-flex";
    } else {
      $fileDl.style.display = "none";
    }
    $content.innerHTML = "";
    $content.style.display = "none";
  } else {
    $fileBlock.style.display = "none";
    // Content HTML
    const html = p.excerpt_html || p.content_html || p.body_html || p.content || "";
    $content.style.display = "block";
    $content.innerHTML = sanitizeHtml(html) || "<p><em>Bài viết chưa có nội dung.</em></p>";
  }

  // Source link (chỉ bài link ngoài / scraped)
  if (ptype === "link" || ptype === "scraped") {
    if (p.source_url) {
      $srcLink.href = p.source_url;
      if (p.site_name) $srcSite.textContent = p.site_name;
      else $srcSite.textContent = "báo gốc";
      $srcLink.style.display = "inline-flex";
    } else {
      $srcLink.style.display = "none";
    }
  } else {
    $srcLink.style.display = "none";
  }

  showState("ok");
}

// ─── Related ─────────────────────────────────────────────────────────────────
function renderRelated(items) {
  if (!items || !items.length) return;
  $relGrid.innerHTML = "";
  items.forEach((p) => {
    const a = document.createElement("a");
    a.className = "td-related-card";
    a.href = `/components/tin-tuc/tin-tuc-chi-tiet.html?slug=${encodeURIComponent(p.slug || "")}`;
    const thumb = p.thumbnail || p.thumbnail_source || "";
    const ptype = p.post_type || "link";

    if (ptype === "file") {
      a.innerHTML = `
        <div class="td-related-thumb td-related-thumb-file">
          <i class="${fileIcon(p.file_name)}"></i>
        </div>
        <div class="td-related-body">
          <h4>${esc(p.title || "Không tiêu đề")}</h4>
          <small><i class="fas fa-file-pdf"></i> ${esc(p.file_name || "File")} · ${esc(fmtSize(p.file_size))}</small>
        </div>
      `;
    } else {
      a.innerHTML = `
        ${thumb
          ? `<img class="td-related-thumb" src="${esc(thumb)}" alt="${esc(p.title || "")}" loading="lazy" onerror="this.outerHTML='<div class=\\'td-related-thumb-empty\\'><i class=\\'far fa-newspaper\\'></i></div>'">`
          : `<div class="td-related-thumb-empty"><i class="far fa-newspaper"></i></div>`}
        <div class="td-related-body">
          <h4>${esc(p.title || "Không tiêu đề")}</h4>
          <small><i class="far fa-calendar"></i> ${esc(fmtDate(p.published_at || p.created_at))}${p.site_name ? " · " + esc(p.site_name) : ""}</small>
        </div>
      `;
    }
    $relGrid.appendChild(a);
  });
  $related.style.display = "block";
}

// ─── Load bài ────────────────────────────────────────────────────────────────
async function loadPost(slug) {
  showState("loading");
  try {
    if (!slug) throw new Error("Thiếu slug trong URL");

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      $error.innerHTML = `<i class="fas fa-exclamation-circle"></i> Không tìm thấy bài viết (slug: <code>${esc(slug)}</code>). Có thể bài đã bị ẩn hoặc slug sai.`;
      showState("error");
      return;
    }

    // Load category + root (best-effort)
    let category = null, root = null;
    if (data.category_id) {
      const { data: cat } = await supabase
        .from("news_categories")
        .select("id, name, slug, parent_id, icon")
        .eq("id", data.category_id)
        .maybeSingle();
      if (cat) {
        category = cat;
        if (cat.parent_id) {
          const { data: r } = await supabase
            .from("news_categories")
            .select("id, name, slug")
            .eq("id", cat.parent_id)
            .maybeSingle();
          root = r;
        }
      }
    }
    renderArticle(data, category, root);

    // Load bài liên quan: ưu tiên cùng category_id, fallback cùng site, fallback random
    let rel = null;
    if (data.category_id) {
      const { data: c1 } = await supabase
        .from("posts")
        .select("id, slug, title, site_name, thumbnail, thumbnail_source, post_type, file_name, file_size, published_at, created_at")
        .eq("status", "published")
        .eq("category_id", data.category_id)
        .neq("slug", slug)
        .order("published_at", { ascending: false })
        .limit(4);
      if (c1 && c1.length) rel = c1;
    }
    if (!rel && data.site_name) {
      const { data: c2 } = await supabase
        .from("posts")
        .select("id, slug, title, site_name, thumbnail, thumbnail_source, post_type, file_name, file_size, published_at, created_at")
        .eq("status", "published")
        .eq("site_name", data.site_name)
        .neq("slug", slug)
        .order("published_at", { ascending: false })
        .limit(4);
      if (c2 && c2.length) rel = c2;
    }
    if (!rel) {
      const { data: c3 } = await supabase
        .from("posts")
        .select("id, slug, title, site_name, thumbnail, thumbnail_source, post_type, file_name, file_size, published_at, created_at")
        .eq("status", "published")
        .neq("slug", slug)
        .order("published_at", { ascending: false })
        .limit(4);
      rel = c3;
    }
    if (rel && rel.length) renderRelated(rel);
  } catch (err) {
    console.error("[tin-tuc-chi-tiet] load error:", err);
    $error.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${esc(err.message || "Lỗi không xác định")}`;
    showState("error");
  }
}

// ─── Boot ────────────────────────────────────────────────────────────────────
const slug = new URLSearchParams(location.search).get("slug") || "";
loadPost(slug);
