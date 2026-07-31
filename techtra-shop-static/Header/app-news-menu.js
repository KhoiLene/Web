/* ============================================
   app-news-menu.js — Render menu BÀI VIẾT động
   ============================================
   - Query bảng `news_categories` (nhóm cha) + `news_articles` (bài viết con) qua Backend Express
   - Gắn vào mount point #newsMenuMount trong header.html
   - Cấu trúc giống SẢN PHẨM: nhóm cha to, đen; bài viết con bên dưới
   - Sau khi partials.js đã render menu chính, file này chỉ enrich thêm
     danh sách bài viết con (nếu cần) — fallback an toàn nếu partials.js lỗi.
   ============================================ */

(function () {
  'use strict';

  const API_BASE = (typeof window !== 'undefined' && window.__API_BASE__) || '/api';

  async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`);
    const json = await res.json();
    if (!res.ok || (json && json.success === false)) {
      throw new Error((json && json.error) || `HTTP ${res.status}`);
    }
    return json.data || [];
  }

  function esc(s = '') {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function newsGroupHref(slug) {
    return `/components/tin-tuc/tin-tuc-theo-nhom.html?slug=${encodeURIComponent(slug || '')}`;
  }
  function newsArticleHref(slug) {
    return `/components/tin-tuc/tin-tuc-chi-tiet.html?slug=${encodeURIComponent(slug || '')}`;
  }

  const ARROW_SVG = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M7.99922 1.19922C4.24962 1.19922 1.19922 4.24962 1.19922 7.99922C1.19922 11.7488 4.24962 14.7992 7.99922 14.7992C11.7488 14.7992 14.7992 11.7488 14.7992 7.99922C14.7992 4.24962 11.7488 1.19922 7.99922 1.19922ZM8 16C3.5888 16 0 12.4112 0 8C0 3.5888 3.5888 0 8 0C12.4112 0 16 3.5888 16 8C16 12.4112 12.4112 16 8 16Z" fill="#2563eb"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M6.84559 11.3745C6.69199 11.3745 6.53759 11.3161 6.42079 11.1977C6.18719 10.9625 6.18799 10.5833 6.42239 10.3497L8.78399 7.99769L6.42239 5.64649C6.18799 5.41289 6.18719 5.03289 6.42079 4.79769C6.65439 4.56169 7.03359 4.56329 7.26879 4.79609L10.0576 7.57289C10.1704 7.68569 10.2336 7.83849 10.2336 7.99769C10.2336 8.15769 10.1704 8.31049 10.0576 8.42329L7.26879 11.1993C7.15199 11.3161 6.99839 11.3745 6.84559 11.3745Z" fill="#2563eb"/>
    </svg>`;

  // Render danh sách nhóm cha + nhóm con giống SẢN PHẨM
  // Vì schema không có news_articles → danh sách con là nhóm CON (children)
  function buildColumnsHTML(roots) {
    if (!roots.length) return '<div class="menu-empty">Chưa có danh mục bài viết nào.</div>';

    return roots
      .map((root) => {
        const kids = root.children || [];
        const itemsHtml = kids.length
          ? kids.map((c) => `<li><a href="${esc(newsGroupHref(c.slug))}">${esc(c.name)}</a></li>`).join('')
          : '<li><a href="#"><em>Đang cập nhật</em></a></li>';

        return `
          <div class="menu-type-2__list-menu--item">
            <a href="${esc(newsGroupHref(root.slug))}" class="menu-type-2__list-menu--item__title menu-type-new__title">
              <span>${esc(root.name)}</span>
              ${ARROW_SVG}
            </a>
            <ul>${itemsHtml}</ul>
          </div>`;
      })
      .join('');
  }

  async function render() {
    const mount = document.getElementById('newsMenuMount');
    if (!mount) return;

    // Nếu partials.js đã render rồi và mount có nội dung, không ghi đè
    if (mount.children.length > 0) {
      // Nhưng vẫn enrich thêm bài viết con nếu nhóm cha đang hiển thị "Đang cập nhật"
      const emptyCells = mount.querySelectorAll('li > a > em');
      if (emptyCells.length === 0) return;
    }

    try {
      // Backend Express — query news_categories qua generic endpoint
      const all = await apiGet(
        '/db/news_categories?select=id,name,slug,icon,parent_id,is_active,sort_order&order=sort_order.asc'
      );
      if (!Array.isArray(all)) throw new Error('Invalid response from backend');
      const roots = all
        .filter((r) => r.is_active !== false && !r.parent_id)
        .map((r) => ({
          ...r,
          children: all
            .filter((c) => c.parent_id === r.id && c.is_active !== false)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
        }))
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      mount.innerHTML = buildColumnsHTML(roots);
      console.log('[news-menu] rendered', roots.length, 'root categories');
    } catch (err) {
      console.error('[news-menu] Lỗi:', err?.message || err);
      if (!mount.children.length) {
        mount.innerHTML = '<div class="menu-empty">Không thể tải menu BÀI VIẾT.</div>';
      }
    }
  }

  // Đợi DOM + header partial ready
  function init() {
    if (document.getElementById('newsMenuMount')) {
      render();
    } else {
      document.addEventListener('partials:loaded', render, { once: true });
      setTimeout(() => {
        if (document.getElementById('newsMenuMount')) render();
      }, 2500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
