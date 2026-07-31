// ve-techtra-moi.js — Trang chi tiết mục giới thiệu.
//
// Pattern lấy từ admin (AboutContentTab → techtra-admin/src/api.js):
//   - aboutContentApi.get(groupId)   → { content }
//   - aboutContentApi.save(groupId, { content }) → upsert
//   - uploadGroupsApi.getAll()       → list groups
//
// URL: /components/ve-techtra-moi/ve-techtra-moi.html?slug=<slug>
//   - Có slug  → tìm group theo slug, lấy content bằng get(groupId), render
//   - Không slug → list các nhóm cha, render grid link

import { uploadGroupsApi, aboutContentApi, request } from "../api-service/api.js";

// ===== Helpers =====
function getSlugFromUrl() {
  return new URLSearchParams(window.location.search).get("slug") || "";
}

function escHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escAttr(s) {
  return escHtml(s);
}

// Sanitize HTML: chỉ loại bỏ <script>, giữ nguyên format 100%
// Pattern lấy từ admin (AboutContentTab.jsx line 1909-1922):
//   "GIỮ NGUYÊN 100% định dạng gốc (style, position, float, margin,
//    kích thước ảnh...) đúng như trong Word/Google Docs. Chỉ loại bỏ thẻ <script>
//    vì lý do an toàn (tránh chèn mã độc), không đụng vào bất kỳ thuộc tính hay
//    style nào khác."
//
// → Giữ <iframe> (cho YouTube embed), <style>, <form>, on* attrs,
//   position/float/margin, custom class (Elementor), tất cả.
function sanitizeHtml(raw) {
  if (!raw) return "";
  const html = String(raw).trim();
  if (!html || html === "<p><br></p>" || html === "<br>") return "";

  const tpl = document.createElement("template");
  tpl.innerHTML = html;

  // 1. CHỈ xóa <script> (giống admin)
  tpl.content.querySelectorAll("script").forEach((el) => el.remove());

  // 2. KHÔNG xóa style, iframe, position, on*, class — để giữ format gốc.
  //    Nếu admin đã duyệt nội dung, ta tin tưởng format đó an toàn để hiển thị.

  return tpl.innerHTML;
}

// ===== DOM refs =====
const $content = document.getElementById("aboutContent");
const $loading = document.getElementById("loadingState");
const $error   = document.getElementById("errorState");
const $empty   = document.getElementById("emptyState");

// ===== State =====
function showLoading() {
  $loading.hidden = false;
  $error.hidden   = true;
  $empty.hidden   = true;
  $content.innerHTML = "";
}
function showError(msg) {
  $loading.hidden = true;
  $error.hidden   = false;
  $error.textContent = "⚠️ " + msg;
  $empty.hidden   = true;
  $content.innerHTML = "";
}
function showEmpty() {
  $loading.hidden = true;
  $error.hidden   = true;
  $empty.hidden   = false;
  $content.innerHTML = "";
}
function showContent(html) {
  $loading.hidden = true;
  $error.hidden   = true;
  $empty.hidden   = true;
  $content.innerHTML = html || "";
}

// ===== Render content theo slug (pattern giống admin loadEditor) =====
async function renderContentBySlug(slug) {
  showLoading();
  try {
    // Bước 1: tìm group theo slug (giống admin loadGroups)
    const groupRes = await uploadGroupsApi.getAll();
    const allGroups = groupRes.data || [];
    const group = allGroups.find((g) => g.slug === slug) || null;

    console.log("[ve-techtra-moi] DEBUG:", {
      slug,
      totalGroups: allGroups.length,
      groupSlugs: allGroups.map(g => g.slug),
      foundGroup: group ? { id: group.id, name: group.name, slug: group.slug } : null,
    });

    if (!group) {
      // Slug không tồn tại → fallback về danh sách
      console.warn(`[ve-techtra-moi] group not found for slug="${slug}"`);
      await renderGroupList();
      return;
    }

    // Bước 2: lấy content bằng aboutContentApi.get(groupId) — pattern admin
    const contentRes = await aboutContentApi.get(group.id);
    const { content } = contentRes || {};

    console.log("[ve-techtra-moi] DEBUG content:", {
      groupId: group.id,
      responseKeys: contentRes ? Object.keys(contentRes) : null,
      contentType: typeof content,
      contentLength: (content || "").length,
      contentPreview: (content || "").slice(0, 120),
    });

    document.title = `${group.name || "Về Techtra"} | Techtra`;

    const safe = sanitizeHtml(content);
    if (safe) {
      showContent(safe);
    } else {
      // Hiển thị debug panel thay vì empty state mù
      showDebugEmpty(group.id, content);
    }
  } catch (err) {
    console.error("[ve-techtra-moi] load error:", err);
    showError(err?.message || "Không tải được nội dung");
  }
}

// Hiện panel debug khi content rỗng — giúp dev kiểm tra nhanh
function showDebugEmpty(groupId, rawContent) {
  $loading.hidden = true;
  $error.hidden   = true;
  $empty.hidden   = true;
  $content.innerHTML = `
    <div class="state-message" style="text-align:left; max-width:720px; margin:0 auto;">
      <h3 style="color: var(--text-primary); margin-bottom: 12px;">
        <i class="fa-solid fa-triangle-exclamation" style="color: var(--accent);"></i>
        Chưa có nội dung cho nhóm này
      </h3>
      <p style="color: var(--text-secondary); font-size: 14px;">
        Mục này chưa được cập nhật trong admin (AboutContentTab).
        Nếu bạn vừa lưu nội dung, có thể do:
      </p>
      <ul style="margin: 12px 0; padding-left: 20px; color: var(--text-secondary); font-size: 13px; line-height: 1.8;">
        <li><b>Sai group_id</b>: bài được lưu với group_id khác <code style="background:var(--bg-secondary); padding:2px 6px; border-radius:4px;">${escHtml(String(groupId))}</code>.</li>
        <li><b>Bảng rỗng</b>: Supabase chưa có row trong <code style="background:var(--bg-secondary); padding:2px 6px; border-radius:4px;">about_content</code>.</li>
        <li><b>RLS policy</b>: Supabase đang chặn SELECT (cần policy cho <code>anon</code>).</li>
        <li><b>Cache trình duyệt</b>: thử <b>Ctrl + Shift + R</b> để tải lại.</li>
      </ul>
      <details style="margin-top: 14px; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
        <summary style="cursor: pointer; font-weight: 600; color: var(--primary);">
          <i class="fa-solid fa-bug"></i> Thông tin debug (click để mở)
        </summary>
        <pre style="margin: 10px 0 0; font-size: 12px; line-height: 1.6; overflow-x: auto; color: var(--text-secondary);">
group_id: ${escHtml(String(groupId))}
raw_content type: ${escHtml(typeof rawContent)}
raw_content value: ${escHtml(JSON.stringify(rawContent)?.slice(0, 400))}
        </pre>
      </details>
      <p style="margin-top: 16px;">
        <a href="./ve-techtra-moi.html"
           style="color: var(--primary); text-decoration: underline;">
          ← Quay lại danh sách
        </a>
      </p>
    </div>
  `;
}

// ===== Render danh sách nhóm (khi không có slug) =====
async function renderGroupList() {
  showLoading();
  try {
    // Gọi uploadGroupsApi.getAll() — đồng bộ với admin AboutContentTab
    const res = await uploadGroupsApi.getAll();
    const all = res.data || [];
    const roots = all
      .filter((g) => g.parent_id == null && g.is_active !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    document.title = "Về Techtra | Techtra Shop";

    if (!roots.length) {
      showEmpty();
      return;
    }

    // Render grid các card — không có gì ngoài link
    const html = `
      <h2 style="font-family: var(--font-heading); font-size: 1.5rem; margin-bottom: 18px;">
        Về Techtra — chọn mục
      </h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px;">
        ${roots.map((g) => `
          <a href="./ve-techtra-moi.html?slug=${encodeURIComponent(g.slug || g.id)}"
             style="display: block; padding: 20px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); text-decoration: none; color: inherit; transition: all 0.2s;">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 12px;">
              <i class="${escAttr(g.icon || "fa-solid fa-folder")}" aria-hidden="true"></i>
            </div>
            <strong style="display: block; font-family: var(--font-heading); font-size: 15px; color: var(--text-primary); margin-bottom: 4px;">${escHtml(g.name)}</strong>
            <span style="font-size: 13px; color: var(--primary);">Xem chi tiết →</span>
          </a>
        `).join("")}
      </div>
    `;
    showContent(html);
  } catch (err) {
    console.error("[ve-techtra-moi] load groups error:", err);
    showError(err?.message || "Không tải được danh sách");
  }
}

// ===== Init =====
(function init() {
  const slug = getSlugFromUrl();
  if (slug) renderContentBySlug(slug);
  else      renderGroupList();

  // Bind nút debug trên empty state
  const $debugBtn = document.getElementById("debugBtn");
  const $debugLog = document.getElementById("debugLog");
  if ($debugBtn) {
    $debugBtn.addEventListener("click", async () => {
      $debugLog.style.display = "block";
      $debugLog.textContent = "Đang gọi API trực tiếp...\n";
      try {
        // Gọi qua Backend Express (Vite/Angular proxy sẽ forward /api → localhost:5050)
        // 1) Lấy groups
        const r1 = await request("GET", "/db/upload_groups?select=id,name,slug&order=sort_order.asc");
        const groups = r1.data || [];
        $debugLog.textContent += `\n[1] upload_groups: ${groups.length} rows`;
        groups.forEach(g => $debugLog.textContent += `\n    - ${g.slug} (id=${g.id}, name="${g.name}")`);

        // 2) Tìm group theo slug hiện tại
        const curSlug = getSlugFromUrl() || "(không có)";
        const group = groups.find(g => g.slug === curSlug);
        $debugLog.textContent += `\n[2] Tìm group theo slug "${curSlug}": ${group ? "TÌM THẤY → " + group.id : "KHÔNG THẤY"}`;

        if (group) {
          // 3) Lấy content — Postgres cột content không có hàm length() qua REST,
          //    đo độ dài chuỗi phía client.
          const r2 = await request("GET", `/db/about_content?group_id=eq.${group.id}&select=id,group_id,content`);
          const arr = r2.data || [];
          $debugLog.textContent += `\n[3] about_content rows: ${arr.length}`;
          arr.forEach(row => {
            const len = (row.content || "").length;
            $debugLog.textContent += `\n    - id=${row.id}, content_length=${len}`;
          });
          if (arr.length > 0 && (!arr[0].content || arr[0].content.length === 0)) {
            $debugLog.textContent += `\n⚠️ Group này có row nhưng content RỖNG — admin chưa save HTML!`;
          }
        }

        $debugLog.textContent += `\n\nURL hiện tại: ${window.location.href}`;
        $debugLog.textContent += `\nUser agent: ${navigator.userAgent.slice(0, 80)}`;
      } catch (err) {
        $debugLog.textContent += `\n\n❌ LỖI: ${err.message}\n${err.stack?.slice(0, 300)}`;
      }
    });
  }
})();