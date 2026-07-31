// partials.js — Load header/footer partials, inject vào placeholder, và render
// menu động (SALE / SẢN PHẨM / VỀ TECHTRA / BÀI VIẾT) bằng cách gọi API từ
// Backend Express (Vite/Angular proxy → localhost:5050).
//
// Mount points trong header.html:
//   #saleMenuMount      → list nhóm SALE  (is_sale = true):  ảnh trên, chữ dưới
//   #productMenuMount   → list nhóm SẢN PHẨM (is_sale != true): nhóm cha to đen, con bên dưới
//   #aboutMenuMount     → list icon + tên từ about_content
//   #newsMenuMount      → list nhóm bài viết (cha + bài viết con) — giống SẢN PHẨM
//   #mobileNavList      → accordion mobile (SALE, SẢN PHẨM, VỀ TECHTRA, BÀI VIẾT)
//
// Sau khi render xong, bắn `partials:loaded` để các script khác (app.js, ...) biết.

(function () {
  'use strict';

  const headerURL = '../../components/header/header.html';
  const footerURL = '../../components/footer/footer.html';

  const API_BASE = (typeof window !== 'undefined' && window.__API_BASE__) || '/api';

  // Helper gọi Backend Express qua Vite/Angular proxy
  async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`);
    const json = await res.json();
    if (!res.ok || (json && json.success === false)) {
      throw new Error((json && json.error) || `HTTP ${res.status}`);
    }
    return json.data || [];
  }

  // Gọi 3 bảng song song — không còn Supabase
  async function fetchMenuData() {
    const [productGroups, groups, newsCat] = await Promise.all([
      apiGet('/db/product_groups?select=id,name,slug,image_url,parent_id,is_active,is_slider,is_sale,sort_order&order=sort_order.asc'),
      apiGet('/db/upload_groups?select=id,name,slug,icon,parent_id,is_active,sort_order,display_locations&order=sort_order.asc'),
      apiGet('/db/news_categories?select=id,name,slug,icon,description,parent_id,is_active,sort_order&order=sort_order.asc'),
    ]);
    return { productGroups, groups, newsCat };
  }

  // Di chuyển drawer mobile ra khỏi <header> để tránh bị ảnh hưởng bởi
  // containing-block (will-change/transform/filter...) trên site-header hoặc
  // bất kỳ ancestor nào — đảm bảo position:fixed luôn theo viewport thật.
  function detachMobileDrawerFromHeader() {
    const overlay = document.getElementById('mobileMenuOverlay');
    const drawer  = document.getElementById('mobileMenuDrawer');
    if (overlay && overlay.parentElement !== document.body) {
      document.body.appendChild(overlay);
    }
    if (drawer && drawer.parentElement !== document.body) {
      document.body.appendChild(drawer);
    }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function groupHref(slug) {
    // Mọi click vào nhóm sản phẩm (CHA hoặc CON) đều dẫn sang trang "Tất cả sản phẩm"
    // với param ?group=<slug>. Trang tat-ca-san-pham.js xử lý:
    //   - group = CHA → liệt kê SP của cả CHA + CON
    //   - group = CON → chỉ liệt kê SP của CON đó
    return `/components/tat-ca-san-pham/tat-ca-san-pham.html?group=${encodeURIComponent(slug || '')}`;
  }
  function aboutHref(slug) {
    // Trang "Về Techtra" — nhóm about_content. Hỗ trợ cả slug và id.
    return `/components/ve-techtra-moi/ve-techtra-moi.html?slug=${encodeURIComponent(slug || '')}`;
  }
  function productHref(slug) {
    return `/components/san-pham/san-pham.html?slug=${encodeURIComponent(slug || '')}`;
  }
  function newsGroupHref(slug) {
    return `/components/tin-tuc/tin-tuc-theo-nhom.html?slug=${encodeURIComponent(slug || '')}`;
  }
  function newsArticleHref(slug) {
    return `/components/tin-tuc/tin-tuc-chi-tiet.html?slug=${encodeURIComponent(slug || '')}`;
  }

  // Fallback ảnh khi không có image_url → dùng logo Techtra
  const LOGO_FALLBACK = '../../components/header/techtra-logo.png';

  const ARROW_SVG = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M7.99922 1.19922C4.24962 1.19922 1.19922 4.24962 1.19922 7.99922C1.19922 11.7488 4.24962 14.7992 7.99922 14.7992C11.7488 14.7992 14.7992 11.7488 14.7992 7.99922C14.7992 4.24962 11.7488 1.19922 7.99922 1.19922ZM8 16C3.5888 16 0 12.4112 0 8C0 3.5888 3.5888 0 8 0C12.4112 0 16 3.5888 16 8C16 12.4112 12.4112 16 8 16Z" fill="#2563eb"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M6.84559 11.3745C6.69199 11.3745 6.53759 11.3161 6.42079 11.1977C6.18719 10.9625 6.18799 10.5833 6.42239 10.3497L8.78399 7.99769L6.42239 5.64649C6.18799 5.41289 6.18719 5.03289 6.42079 4.79769C6.65439 4.56169 7.03359 4.56329 7.26879 4.79609L10.0576 7.57289C10.1704 7.68569 10.2336 7.83849 10.2336 7.99769C10.2336 8.15769 10.1704 8.31049 10.0576 8.42329L7.26879 11.1993C7.15199 11.3161 6.99839 11.3745 6.84559 11.3745Z" fill="#2563eb"/>
    </svg>`;

  // ─────────────────────────────────────────────────────────────
  // 1. Load partial HTML (giữ nguyên logic cũ)
  // ─────────────────────────────────────────────────────────────
  async function loadPartial(placeholderId, url) {
    const placeholder = document.getElementById(placeholderId);
    if (!placeholder) {
      console.warn(`[partials] Không tìm thấy #${placeholderId} trong trang.`);
      return;
    }

    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status} khi tải ${url}`);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');

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

      const wrapper = document.createElement('div');
      wrapper.className = `partial partial-${placeholderId.replace('-placeholder', '')}`;
      wrapper.innerHTML = doc.body.innerHTML;
      placeholder.replaceWith(wrapper);

      // Execute scripts trong partial
      const scripts = wrapper.querySelectorAll('script');
      scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');
        for (const attr of oldScript.attributes) {
          newScript.setAttribute(attr.name, attr.value);
        }
        if (oldScript.textContent) newScript.textContent = oldScript.textContent;
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

  // ─────────────────────────────────────────────────────────────
  // 2. Fetch dữ liệu thô qua Supabase (dùng chung cho các menu)
  //
  // Schema thực tế trên Supabase:
  //   product_groups   : id, name, slug, image_url, parent_id,
  //                      is_active, is_slider, is_sale, sort_order
  //   upload_groups    : id, name, slug, icon, parent_id, is_active, sort_order
  //   news_categories  : id, name, slug, icon, description, parent_id,
  //                      is_active, sort_order
  // ─────────────────────────────────────────────────────────────
  async function fetchAllData() {
    // Wrapper tương thích ngược — gọi thẳng Backend Express
    return await fetchMenuData();
  }

  // ─────────────────────────────────────────────────────────────
  // 2.1. Build cây nhóm con theo parent_id (dùng chung SALE/SẢN PHẨM/BÀI VIẾT)
  // Trả về: { childrenByParent: { [parentId]: SubGroup[] }, roots: Item[] }
  //   SubGroup = { id, name, slug, image_url, is_slider, ... }
  // ─────────────────────────────────────────────────────────────
  function buildTree(items) {
    const childrenByParent = {};
    (items || []).forEach((it) => {
      // Bỏ các item không active
      if (it.is_active === false) return;
      const key = it.parent_id == null ? '__root__' : it.parent_id;
      if (!childrenByParent[key]) childrenByParent[key] = [];
      childrenByParent[key].push(it);
    });
    Object.keys(childrenByParent).forEach((k) => {
      childrenByParent[k].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    });
    return childrenByParent;
  }

  // ─────────────────────────────────────────────────────────────
  // 2.2. Render slider ngang cho nhóm con (is_slider = true)
  //   - Slider hiển thị cuộn ngang (transform + overflow-x)
  //   - Mỗi item: ảnh + tên nhóm con
  //   - Đặt dưới nhóm cha nếu có nhóm con is_slider=true
  // ─────────────────────────────────────────────────────────────
  function renderSubGroupSliderHTML(subGroups, hrefFn) {
    if (!subGroups || !subGroups.length) return '';
    const items = subGroups
      .map(
        (c) => `
          <a class="menu-child-slider__item" href="${esc(hrefFn(c.slug || c.id))}">
            <span class="menu-child-slider__img">
              <img src="${esc(c.image_url || c.image || c.icon || 'https://placehold.co/80x80?text=SLIDE')}" alt="${esc(c.name)}" loading="lazy" onerror="this.onerror=null;this.src='https://placehold.co/80x80?text=SLIDE'">
            </span>
            <span class="menu-child-slider__name">${esc(c.name)}</span>
          </a>`
      )
      .join('');
    return `
      <div class="menu-child-slider" data-slider>
        <button class="menu-child-slider__nav menu-child-slider__nav--prev" type="button" aria-label="Previous" data-slider-prev>
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        <div class="menu-child-slider__track" data-slider-track>${items}</div>
        <button class="menu-child-slider__nav menu-child-slider__nav--next" type="button" aria-label="Next" data-slider-next>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>`;
  }

  // Bind sự kiện nút prev/next + kéo ngang bằng chuột cho tất cả slider trong scope
  function bindSliders(root) {
    const sliders = (root || document).querySelectorAll('[data-slider]');
    sliders.forEach((slider) => {
      if (slider.dataset.bound === '1') return;
      slider.dataset.bound = '1';
      const track = slider.querySelector('[data-slider-track]');
      const prev = slider.querySelector('[data-slider-prev]');
      const next = slider.querySelector('[data-slider-next]');
      if (!track) return;
      const step = () => Math.max(track.clientWidth * 0.8, 160);
      prev?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        track.scrollBy({ left: -step(), behavior: 'smooth' });
      });
      next?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        track.scrollBy({ left: step(), behavior: 'smooth' });
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Render menu SALE — slider ngang nhóm CON (ảnh trên, chữ dưới)
  //    Hiển thị các NHÓM CHA có is_sale = true.
  //    Mỗi nhóm CHA → 1 slider ngang gồm các NHÓM CON của nó.
  // ─────────────────────────────────────────────────────────────
  function renderSaleMenu(productGroups) {
    const mount = document.getElementById('saleMenuMount');
    if (!mount) return;
    const all = productGroups || [];
    const tree = buildTree(all);
    const saleRoots = (tree['__root__'] || []).filter((g) => g.is_sale && g.is_active !== false);

    if (!saleRoots.length) {
      mount.innerHTML = '<div class="menu-empty">Chưa có nhóm SALE.</div>';
      return;
    }

    // Mỗi nhóm CHA sale → 1 slider gồm các nhóm CON (ảnh + tên)
    const blocks = saleRoots
      .map((root) => {
        const kids = tree[root.id] || [];
        if (!kids.length) return '';
        const items = kids
          .map(
            (c) => `
              <a class="menu-child-slider__item" href="${esc(groupHref(c.slug || c.id))}">
                <span class="menu-child-slider__img">
                  <img src="${esc(c.image_url || LOGO_FALLBACK)}" alt="${esc(c.name)}" loading="lazy" onerror="this.onerror=null;this.src='${LOGO_FALLBACK}'">
                </span>
                <span class="menu-child-slider__name">${esc(c.name)}</span>
              </a>`
          )
          .join('');
        return `
          <div class="menu-type-1__group">
            <a class="menu-type-1__group-title" href="${esc(groupHref(root.slug || root.id))}">
              <span>${esc(root.name)}</span>
              ${ARROW_SVG}
            </a>
            <div class="menu-child-slider" data-slider>
              <button class="menu-child-slider__nav menu-child-slider__nav--prev" type="button" aria-label="Previous" data-slider-prev>
                <i class="fa-solid fa-chevron-left"></i>
              </button>
              <div class="menu-child-slider__track" data-slider-track>${items}</div>
              <button class="menu-child-slider__nav menu-child-slider__nav--next" type="button" aria-label="Next" data-slider-next>
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>`;
      })
      .join('');

    mount.innerHTML = blocks || '<div class="menu-empty">Chưa có nhóm con nào trong SALE.</div>';
    // Gắn handler prev/next cho slider ngang
    if (typeof bindSliders === 'function') bindSliders(mount);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Render menu SẢN PHẨM — nhóm CHA to đen + nhóm CON bên dưới
  //    Nhóm CHA có is_sale != true (mặc định).
  // ─────────────────────────────────────────────────────────────
  function renderProductMenu(productGroups) {
    const mount = document.getElementById('productMenuMount');
    if (!mount) return;
    const all = productGroups || [];
    const tree = buildTree(all);
    const prodRoots = (tree['__root__'] || []).filter((g) => !g.is_sale && g.is_active !== false);

    if (!prodRoots.length) {
      mount.innerHTML = '<div class="menu-empty">Chưa có nhóm sản phẩm.</div>';
      return;
    }

    mount.innerHTML = prodRoots
      .map((root) => {
        const kids = tree[root.id] || [];
        const itemsHtml = kids.length
          ? kids
              .map(
                (c) => `<li><a href="${esc(groupHref(c.slug || c.id))}">${esc(c.name)}</a></li>`
              )
              .join('')
          : '<li><a href="#"><em>Đang cập nhật</em></a></li>';

        return `
          <div class="menu-type-2__list-menu--item">
            <a href="${esc(groupHref(root.slug || root.id))}" class="menu-type-2__list-menu--item__title menu-type-new__title">
              <span>${esc(root.name)}</span>
              ${ARROW_SVG}
            </a>
            <ul>${itemsHtml}</ul>
          </div>`;
      })
      .join('');
  }

  // Helper: filter groups theo 1 location trong mảng display_locations
  // Backward-compat: nếu display_locations là null/undefined → coi như array rỗng.
  // Nếu DB cũ chỉ có display_location (string) → cũng chấp nhận.
  const hasLocation = (g, loc) => {
    if (!g) return false;
    const arr = Array.isArray(g.display_locations) ? g.display_locations : [];
    // Backward-compat với DB cũ dùng display_location (string)
    if (typeof g.display_location === 'string' && g.display_location === loc) return true;
    return arr.includes(loc);
  };

  // ─────────────────────────────────────────────────────────────
  // 5. Render menu VỀ TECHTRA — lấy từ upload_groups (cha làm item, icon + tên)
  //    Filter: nhóm CHA có 'header_about' trong display_locations.
  //    (Backward-compat: null/undefined display_locations cũng hiện để khớp data cũ.)
  // ─────────────────────────────────────────────────────────────
  function renderAboutMenu(groups) {
    const mount = document.getElementById('aboutMenuMount');
    if (!mount) return;
    const all = (groups || []).filter((g) =>
      hasLocation(g, 'header_about') ||
      g.display_locations == null && g.display_location == null
    );
    const tree = buildTree(all);
    const roots = tree['__root__'] || [];
    if (!roots.length) {
      mount.innerHTML = '<div class="menu-empty">Chưa có nội dung giới thiệu.</div>';
      return;
    }
    mount.innerHTML = roots
      .map(
        (g) => `
          <div class="menu-type-3__left--item">
            <a href="${esc(aboutHref(g.slug))}">
              <span class="menu-type-3__left--icon">
                <i class="${esc(g.icon || 'fas fa-folder')}" aria-hidden="true"></i>
              </span>
              <span>${esc(g.name)}</span>
            </a>
          </div>`
      )
      .join('');
  }

  // ─────────────────────────────────────────────────────────────
  // 6. Render menu BÀI VIẾT — lấy từ news_categories (cha + con giống SẢN PHẨM)
  //    Vì chưa có bảng news_articles → list con chính là nhóm con (children).
  // ─────────────────────────────────────────────────────────────
  function renderNewsMenu(newsCategories) {
    const mount = document.getElementById('newsMenuMount');
    if (!mount) return;

    const tree = buildTree(newsCategories);
    const roots = tree['__root__'] || [];

    if (!roots.length) {
      mount.innerHTML = '<div class="menu-empty">Chưa có danh mục bài viết nào.</div>';
      return;
    }

    mount.innerHTML = roots
      .map((root) => {
        const children = (tree[root.id] || []);
        const itemsHtml = children.length
          ? children
              .map(
                (c) => `<li><a href="${esc(newsGroupHref(c.slug))}">${esc(c.name)}</a></li>`
              )
              .join('')
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

  // ─────────────────────────────────────────────────────────────
  // 7. Render mobile menu (accordion) — 4 nhóm: SALE, SẢN PHẨM, VỀ TECHTRA, BÀI VIẾT
  //    SALE / SẢN PHẨM: hiện rỗng (chờ schema)
  //    VỀ TECHTRA: từ upload_groups (cha + con) — filter header_about
  //    BÀI VIẾT: từ news_categories (cha + con)
  // ─────────────────────────────────────────────────────────────
  function renderMobileNav(data) {
    const mount = document.getElementById('mobileNavList');
    if (!mount) return;

    // Filter header_about cho mobile (giống desktop)
    const headerGroups = (data.groups || []).filter((g) =>
      hasLocation(g, 'header_about') ||
      g.display_locations == null && g.display_location == null
    );
    const aboutTree = buildTree(headerGroups);
    const aboutRoots = aboutTree['__root__'] || [];

    const newsTree = buildTree(data.newsCat || []);
    const newsRoots = newsTree['__root__'] || [];

    const productTree = buildTree(data.productGroups || []);
    const saleRoots    = (productTree['__root__'] || []).filter((g) => g.is_sale && g.is_active !== false);
    const productRoots = (productTree['__root__'] || []).filter((g) => !g.is_sale && g.is_active !== false);

    const aboutHTML = `
      <li class="nav-mobile__item has-accordion">
        <div class="nav-mobile__link-header">
          <a href="#">VỀ TECHTRA</a>
          <span class="accordion-toggle"><i class="fa-solid fa-chevron-down"></i></span>
        </div>
        <ul class="nav-mobile__submenu">
          ${
            aboutRoots.length
              ? aboutRoots
                  .map((g) => {
                    const kids = aboutTree[g.id] || [];
                    const sub = kids.length
                      ? kids.map((c) => `<li><a href="${esc(groupHref(c.slug))}">${esc(c.name)}</a></li>`).join('')
                      : '';
                    return `
                        <li class="has-sub-accordion">
                          <div class="submenu-header">
                            <a href="${esc(groupHref(g.slug))}">${esc(g.name)}</a>
                            ${sub ? '<span class="sub-accordion-toggle"><i class="fa-solid fa-plus"></i></span>' : ''}
                          </div>
                          ${sub ? `<ul class="nav-mobile__sub-submenu">${sub}</ul>` : ''}
                        </li>`;
                  })
                  .join('')
              : '<li><a href="#">Chưa có nội dung</a></li>'
          }
        </ul>
      </li>`;

    const newsHTML = `
      <li class="nav-mobile__item has-accordion">
        <div class="nav-mobile__link-header">
          <a href="/components/tin-tuc/tin-tuc.html">BÀI VIẾT</a>
          <span class="accordion-toggle"><i class="fa-solid fa-chevron-down"></i></span>
        </div>
        <ul class="nav-mobile__submenu">
          ${
            newsRoots.length
              ? newsRoots
                  .map((r) => {
                    const kids = newsTree[r.id] || [];
                    const sub = kids.length
                      ? kids.map((c) => `<li><a href="${esc(newsGroupHref(c.slug))}">${esc(c.name)}</a></li>`).join('')
                      : '';
                    return `
                        <li class="has-sub-accordion">
                          <div class="submenu-header">
                            <a href="${esc(newsGroupHref(r.slug))}">${esc(r.name)}</a>
                            ${sub ? '<span class="sub-accordion-toggle"><i class="fa-solid fa-plus"></i></span>' : ''}
                          </div>
                          ${sub ? `<ul class="nav-mobile__sub-submenu">${sub}</ul>` : ''}
                        </li>`;
                  })
                  .join('')
              : '<li><a href="#">Chưa có danh mục bài viết</a></li>'
          }
        </ul>
      </li>`;

    const saleHTML = `
      <li class="nav-mobile__item has-accordion">
        <div class="nav-mobile__link-header">
          <a href="#">SALE</a>
          <span class="accordion-toggle"><i class="fa-solid fa-chevron-down"></i></span>
        </div>
        <ul class="nav-mobile__submenu">
          ${
            saleRoots.length
              ? saleRoots
                  .map((g) => {
                    const kids = productTree[g.id] || [];
                    const sub = kids.length
                      ? kids.map((c) => `<li><a href="${esc(groupHref(c.slug || c.id))}">${esc(c.name)}</a></li>`).join('')
                      : '';
                    return `
                        <li class="has-sub-accordion">
                          <div class="submenu-header">
                            <a href="${esc(groupHref(g.slug || g.id))}">${esc(g.name)}</a>
                            ${sub ? '<span class="sub-accordion-toggle"><i class="fa-solid fa-plus"></i></span>' : ''}
                          </div>
                          ${sub ? `<ul class="nav-mobile__sub-submenu">${sub}</ul>` : ''}
                        </li>`;
                  })
                  .join('')
              : '<li><a href="#">Chưa có dữ liệu SALE</a></li>'
          }
        </ul>
      </li>`;

    const productHTML = `
      <li class="nav-mobile__item has-accordion">
        <div class="nav-mobile__link-header">
          <a href="/components/san-pham/san-pham.html">SẢN PHẨM</a>
          <span class="accordion-toggle"><i class="fa-solid fa-chevron-down"></i></span>
        </div>
        <ul class="nav-mobile__submenu" id="productGroupsContainer">
          ${
            productRoots.length
              ? productRoots
                  .map((g) => {
                    const kids = productTree[g.id] || [];
                    const sub = kids.length
                      ? kids.map((c) => `<li><a href="${esc(groupHref(c.slug || c.id))}">${esc(c.name)}</a></li>`).join('')
                      : '';
                    return `
                        <li class="has-sub-accordion">
                          <div class="submenu-header">
                            <a href="${esc(groupHref(g.slug || g.id))}">${esc(g.name)}</a>
                            ${sub ? '<span class="sub-accordion-toggle"><i class="fa-solid fa-plus"></i></span>' : ''}
                          </div>
                          ${sub ? `<ul class="nav-mobile__sub-submenu">${sub}</ul>` : ''}
                        </li>`;
                  })
                  .join('')
              : '<li><a href="#">Chưa có dữ liệu sản phẩm</a></li>'
          }
        </ul>
      </li>`;

    mount.innerHTML = saleHTML + productHTML + aboutHTML + newsHTML;
  }

  // ─────────────────────────────────────────────────────────────
  // 6b. Render footer "Về chúng tôi" + "Hỗ trợ khách hàng"
  //    Lấy từ upload_groups filter display_location.
  //    Giữ nguyên design footer gốc — chỉ inject link list.
  // ─────────────────────────────────────────────────────────────
  function renderFooterMenu(groups) {
    const aboutMount   = document.getElementById('footerAboutMount');
    const supportMount = document.getElementById('footerSupportMount');
    if (!aboutMount && !supportMount) return;

    const all = groups || [];

    const renderCol = (mount, location, emptyText) => {
      if (!mount) return;
      // Lấy tất cả root group (parent_id IS NULL) có location trong display_locations array
      const items = all.filter((g) =>
        g.is_active !== false &&
        g.parent_id == null &&
        hasLocation(g, location)
      ).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      if (!items.length) {
        mount.innerHTML = `<li><a href="#" style="opacity:.6">${esc(emptyText)}</a></li>`;
        return;
      }

      mount.innerHTML = items
        .map((g) => `<li><a href="${esc(aboutHref(g.slug))}">${esc(g.name)}</a></li>`)
        .join('');
    };

    renderCol(aboutMount,   'footer_about',   'Đang cập nhật');
    renderCol(supportMount, 'footer_support', 'Đang cập nhật');
  }

  // ─────────────────────────────────────────────────────────────
  // 8. Hàm khởi động: load partials + render menu động
  // ─────────────────────────────────────────────────────────────
  async function renderAllMenus() {
    try {
      const data = await fetchAllData();
      renderSaleMenu(data.productGroups);
      renderProductMenu(data.productGroups);
      renderAboutMenu(data.groups);
      renderNewsMenu(data.newsCat);
      renderFooterMenu(data.groups);
      renderMobileNav(data);
      console.log('[partials] header + footer menus rendered ✓');
    } catch (err) {
      console.error('[partials] Lỗi render menu:', err);
    }
  }

  function safeDispatchCartCountEvent() {
    try {
      document.dispatchEvent(new CustomEvent('partials:cart-ready'));
    } catch (_) {
      // ignore
    }
  }

  // ───────────────────────────────────────────────
  // Account Action — chưa đăng nhập → /components/dang-nhap
  //                đã đăng nhập     → /components/khach-hang
  // Tự tính path tương đối dựa trên pathname hiện tại (mọi trang đều nằm
  // trong /components/<page>/, nên cùng lúc 1 cấp — luôn trỏ về ../<page>/file.html)
  // ───────────────────────────────────────────────
  function resolveAccountHref(target) {
    // pathname có dạng: /components/<page>/<file>.html  (root-served) hoặc
    //                   /<page>/<file>.html           (file-served)
    const path = window.location.pathname;
    // Tìm segment "components" để biết server root
    const idx = path.indexOf('/components/');
    if (idx >= 0) {
      // Trang đang ở /components/<page>/...
      return `/components/${target}`;
    }
    // Fallback: path tương đối (1 cấp lên)
    return `../${target}`;
  }

  async function getSessionSafe() {
    // Backend Express không dùng Supabase Auth — dựa vào localStorage.
    // Hàm trả về null để isLoggedIn() dùng fallback getLoggedInFallback().
    return null;
  }
  init

  // Fallback: nếu Supabase SDK không load được (offline, no esm.sh, …)
  // nhưng ta đã set techtra_user khi đăng nhập thành công thì vẫn coi như đã login.
  function getLoggedInFallback() {
    try {
      const raw = localStorage.getItem('techtra_user');
      if (!raw) return false;
      const u = JSON.parse(raw);
      // Check session chưa quá 30 ngày
      const ts = Number(u?.loggedInAt || 0);
      const fresh = !ts || (Date.now() - ts) < 30 * 24 * 60 * 60 * 1000;
      return fresh && (u.id || u.customer_id || u.email);
    } catch (_) {
      return false;
    }
  }

  async function isLoggedIn() {
    const session = await getSessionSafe();
    if (session) return true;
    return getLoggedInFallback();
  }

  function applyAccountLinks(loggedIn) {
    const target = loggedIn ? 'khach-hang/khach-hang.html' : 'dang-nhap/dangnhap.html';
    const href = resolveAccountHref(target);
    document.querySelectorAll('[data-account-link]').forEach((a) => {
      a.setAttribute('href', href);
      a.setAttribute('aria-label', loggedIn ? 'Tài khoản của tôi' : 'Đăng nhập / Đăng ký');
    });
  }

  async function setupAccountAction() {
    const loggedIn = await isLoggedIn();
    applyAccountLinks(!!loggedIn);

    // Lắng nghe thay đổi đăng nhập / đăng xuất để update href ngay
    // Backend Express không có supabase.auth — fallback localStorage được
    // xử lý bằng cách lắng nghe custom event 'techtra:auth-changed'
    document.addEventListener('techtra:auth-changed', () => {
      isLoggedIn().then((ok) => applyAccountLinks(ok));
    });

    // Bắn event để các script khác (khach-hang, ...) đọc được trạng thái
    document.dispatchEvent(new CustomEvent('partials:auth-state', {
      detail: { loggedIn: !!loggedIn },
    }));
  }

  function init() {
    Promise.all([
      loadPartial('header-placeholder', headerURL),
      loadPartial('footer-placeholder', footerURL),
    ])
    
      .then(async () => {

        
        // Set flag sớm để các script load SAU có thể check ngay
        window.__TECHTRA_PARTIALS_READY__ = true;

        detachMobileDrawerFromHeader();
        // Render menu động ngay sau khi header vào DOM
        await renderAllMenus();
        // Account link redirect: check session Supabase và bind
        await setupAccountAction();
        // Bắn event để các script khác (app.js, ...) biết header/footer đã sẵn sàng
        document.dispatchEvent(new CustomEvent('partials:loaded'));
        safeDispatchCartCountEvent();
      })
      .catch((err) => {
        console.error('[partials] Lỗi khi load partials:', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
