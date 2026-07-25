// partials.js — Load header/footer partials và inject vào placeholder.
// Hoạt động cho mọi trang trong techtra-shop/ (vd: TrangChu/index.html, san-pham/san-pham.html).
//
// Cách dùng trong HTML:
//   <div id="header-placeholder"></div>
//   ...nội dung trang...
//   <div id="footer-placeholder"></div>
//   <script src="../partials.js"></script>

(function () {
  'use strict';

  // Dùng đường dẫn gốc tuyệt đối để mọi trang Tin_tuc và trang techtra-shop khác đều load chính xác.
  const headerURL = '../../components/header/header.html';
  const footerURL = '../../components/footer/footer.html';

  /**
   * Load 1 partial HTML, lấy nội dung <body> + các <link> CSS trong <head>,
   * rồi inject vào placeholder.
   */
  async function loadPartial(placeholderId, url) {
    const placeholder = document.getElementById(placeholderId);
    if (!placeholder) {
      console.warn(`[partials] Không tìm thấy #${placeholderId} trong trang.`);
      return;
    }

    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} khi tải ${url}`);
      }
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');

      // 1) Gắn các <link rel="stylesheet"> từ partial vào <head> trang hiện tại
      //    (tránh trùng lặp bằng cách check href đã tồn tại hay chưa).
      const partialBase = new URL(url, window.location.href);
      doc.head.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
        const absoluteHref = new URL(link.getAttribute('href'), partialBase).href;
        const exists = Array.from(document.head.querySelectorAll('link[rel="stylesheet"]'))
          .some((existing) => existing.href === absoluteHref);
        if (!exists) {
          const newLink = document.createElement('link');
          newLink.rel = 'stylesheet';
          newLink.href = absoluteHref;
          document.head.appendChild(newLink);
        }
      });

      // 2) Inject nội dung <body> của partial vào placeholder.
      const wrapper = document.createElement('div');
      wrapper.className = `partial partial-${placeholderId.replace('-placeholder', '')}`;
      wrapper.innerHTML = doc.body.innerHTML;
      placeholder.replaceWith(wrapper);

      // 3) Execute các <script> trong partial — vì innerHTML không tự chạy script.
      //    Tạo <script> mới để browser evaluate (giữ nguyên src/type/inline).
      const scripts = wrapper.querySelectorAll('script');
      scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');
        // Copy thuộc tính
        for (const attr of oldScript.attributes) {
          newScript.setAttribute(attr.name, attr.value);
        }
        // Copy inline content nếu có
        if (oldScript.textContent) {
          newScript.textContent = oldScript.textContent;
        }
        // Thay thế script cũ bằng script mới (script mới sẽ được execute)
        oldScript.replaceWith(newScript);
      });
    } catch (err) {
      console.error(`[partials] Lỗi khi load ${url}:`, err);
      placeholder.innerHTML =
        `<div style="padding:16px;color:#b00020;text-align:center;">
          Không tải được ${placeholderId}. Vui lòng thử lại.
        </div>`;
    }
  }

  function safeDispatchCartCountEvent() {
    try {
      // Nếu các trang khác muốn đồng bộ header cart ngay sau khi partial sẵn sàng
      // thì chúng ta bắn 1 event để script header/app.js và trang con lắng nghe.
      document.dispatchEvent(new CustomEvent('partials:cart-ready'));
    } catch (_) {
      // ignore
    }
  }

  // Chạy khi DOM đã sẵn sàng.
  function init() {
    Promise.all([
      loadPartial('header-placeholder', headerURL),
      loadPartial('footer-placeholder', footerURL),
    ]).then(() => {
      // Set flag sớm để các script load SAU có thể check ngay (không bị miss event)
      window.__TECHTRA_PARTIALS_READY__ = true;
      // Bắn event để các script khác (vd: app.js, san-pham.js) biết header/footer đã sẵn sàng
      // và có thể gắn handler cho cart-drawer, search, mobile menu...
      document.dispatchEvent(new CustomEvent('partials:loaded'));
      safeDispatchCartCountEvent();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
