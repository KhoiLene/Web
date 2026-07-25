// /* ============================================
//    app-news-menu.js — Render menu BÀI VIẾT động
//    ============================================
//    - Query bảng `news_categories` từ Supabase
//    - Build cây 2 cấp (root → children)
//    - Gắn vào <div id="news-menu-mount"> trong heafer.html
//    - Sub-items click → Tin_tuc/tin-tuc-theo-nhom.html?slug=...
//    ============================================ */

// (function () {
//   "use strict";

//   const SUPABASE_URL = "https://pbuqcvlcqrxdammvbwvs.supabase.co";
//   const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBidXFjdmxjcXJ4ZGFtbXZid3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTA0NDAsImV4cCI6MjA5NzA4NjQ0MH0.YmRjW__dNqhhO0E8GUqoon6hqpA4k6rXYIFeV_PuVnY";

//   async function loadSupabase() {
//     if (window.supabase) return window.supabase;
//     const mod = await import("https://esm.sh/@supabase/supabase-js@2");
//     window.supabase = mod.createClient(SUPABASE_URL, SUPABASE_KEY);
//     return window.supabase;
//   }

//   function esc(s = "") {
//     return String(s)
//       .replaceAll("&", "&amp;")
//       .replaceAll("<", "&lt;")
//       .replaceAll(">", "&gt;")
//       .replaceAll('"', "&quot;");
//   }

//   function resolveBasePath() {
//     // Dùng đường dẫn gốc từ techtra-shop root để không bị sai khi link này được render
//     // trên trang con nằm trong Tin_tuc/ hoặc các thư mục khác.
//     return "/components/tin-tuc/tin-tuc-theo-nhom.html?slug=";
//   }

//   function buildMenuHTML(tree) {
//     if (!tree || !tree.length) return "";
//     return tree
//       .filter((r) => r.is_active !== false)
//       .map((root) => {
//         const children = (root.children || []).filter((c) => c.is_active !== false);
//         const basePath = resolveBasePath();
//         if (!children.length) {
//           // Không có con → chỉ 1 dòng link
//           return `
//             <li>
//               <a href="${esc(basePath + root.slug)}">
//                 <i class="${esc(root.icon || "fas fa-folder")}"></i> ${esc(root.name)}
//               </a>
//             </li>`;
//         }
//         return `
//           <li class="has-sub">
//             <a href="${esc(basePath + root.slug)}">
//               <i class="${esc(root.icon || "fas fa-folder")}"></i> ${esc(root.name)}
//             </a>
//             <ul>
//               ${children
//                 .map(
//                   (c) => `
//                 <li>
//                   <a href="${esc(basePath + c.slug)}">${esc(c.name)}</a>
//                 </li>`
//                 )
//                 .join("")}
//             </ul>
//           </li>`;
//       })
//       .join("");
//   }

//   async function render() {
//     const mount = document.getElementById("news-menu-mount");
//     if (!mount) return;

//     // Lưu lại <ul> cũ (chứa "Tất cả bài viết")
//     const baseUl = mount.querySelector("ul");
//     if (!baseUl) return;

//     try {
//       const client = await loadSupabase();
//       const { data, error } = await client
//         .from("news_categories")
//         .select("id, name, slug, icon, parent_id, is_active, sort_order")
//         .order("sort_order", { ascending: true });
//       if (error) throw error;

//       const all = data || [];
//       const roots = all
//         .filter((r) => !r.parent_id)
//         .map((r) => ({
//           ...r,
//           children: all
//             .filter((c) => c.parent_id === r.id)
//             .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
//         }))
//         .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

//       // Xoá các <li> cũ trừ "Tất cả bài viết" (li đầu tiên)
//       const allItem = baseUl.querySelector("li");
//       baseUl.innerHTML = "";
//       if (allItem) baseUl.appendChild(allItem);
//       // Thêm divider
//       if (roots.length) {
//         const sep = document.createElement("li");
//         sep.style.cssText = "border-top:1px solid #f1f5f9;margin:4px 0;list-style:none;height:0;padding:0;";
//         baseUl.appendChild(sep);
//       }
//       // Inject HTML động
//       const tmp = document.createElement("div");
//       tmp.innerHTML = buildMenuHTML(roots);
//       while (tmp.firstChild) baseUl.appendChild(tmp.firstChild);

//       console.log("[news-menu] rendered", roots.length, "root categories");
//     } catch (err) {
//       console.error("[news-menu] Lỗi:", err.message);
//       // Giữ menu mặc định nếu lỗi
//     }
//   }

//   // Đợi DOM + header partial ready
//   function init() {
//     // partials.js bắn event 'partials:loaded' khi header đã vào DOM
//     if (document.getElementById("news-menu-mount")) {
//       render();
//     } else {
//       document.addEventListener("partials:loaded", render, { once: true });
//       // fallback: timeout 2s nếu event không bắn
//       setTimeout(() => {
//         if (document.getElementById("news-menu-mount")) render();
//       }, 2000);
//     }
//   }

//   if (document.readyState === "loading") {
//     document.addEventListener("DOMContentLoaded", init);
//   } else {
//     init();
//   }
// })();

/* ============================================
   app-news-menu.js — Render menu BÀI VIẾT động
   ============================================
   - Query bảng `news_categories` từ Supabase
   - Build cây 2 cấp (root → children)
   - Gắn vào <div id="news-menu-mount"> trong heafer.html
   - Sub-items click → Tin_tuc/tin-tuc-theo-nhom.html?slug=...
   ============================================ */

(function () {
  "use strict";

  const SUPABASE_URL = "https://pbuqcvlcqrxdammvbwvs.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBidXFjdmxjcXJ4ZGFtbXZid3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTA0NDAsImV4cCI6MjA5NzA4NjQ0MH0.YmRjW__dNqhhO0E8GUqoon6hqpA4k6rXYIFeV_PuVnY";

  async function loadSupabase() {
    if (window.supabase) return window.supabase;
    const mod = await import("https://esm.sh/@supabase/supabase-js@2");
    window.supabase = mod.createClient(SUPABASE_URL, SUPABASE_KEY);
    return window.supabase;
  }

  function esc(s = "") {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function resolveBasePath() {
    // Dùng đường dẫn gốc từ techtra-shop root để không bị sai khi link này được render
    // trên trang con nằm trong Tin_tuc/ hoặc các thư mục khác.
    return "/components/tin-tuc/tin-tuc-theo-nhom.html?slug=";
  }

  function buildMenuHTML(tree) {
    if (!tree || !tree.length) return "";
    return tree
      .filter((r) => r.is_active !== false)
      .map((root) => {
        const children = (root.children || []).filter((c) => c.is_active !== false);
        const basePath = resolveBasePath();
        if (!children.length) {
          // Không có con → chỉ 1 dòng link
          return `
            <li class="news-menu__item">
              <a href="${esc(basePath + root.slug)}">
                <i class="${esc(root.icon || "fas fa-folder")}"></i> ${esc(root.name)}
              </a>
            </li>`;
        }
        return `
          <li class="news-menu__item has-sub">
            <a href="${esc(basePath + root.slug)}">
              <i class="${esc(root.icon || "fas fa-folder")}"></i> ${esc(root.name)}
            </a>
            <span class="news-menu__arrow"><i class="fa-solid fa-chevron-right"></i></span>
            <ul class="news-menu__submenu">
              ${children
                .map(
                  (c) => `
                <li>
                  <a href="${esc(basePath + c.slug)}">${esc(c.name)}</a>
                </li>`
                )
                .join("")}
            </ul>
          </li>`;
      })
      .join("");
  }

  async function render() {
    const mount = document.getElementById("news-menu-mount");
    if (!mount) return;

    // Lưu lại <ul> cũ (chứa "Tất cả bài viết")
    const baseUl = mount.querySelector("ul");
    if (!baseUl) return;
    baseUl.classList.add("news-menu__list");

    try {
      const client = await loadSupabase();
      const { data, error } = await client
        .from("news_categories")
        .select("id, name, slug, icon, parent_id, is_active, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;

      const all = data || [];
      const roots = all
        .filter((r) => !r.parent_id)
        .map((r) => ({
          ...r,
          children: all
            .filter((c) => c.parent_id === r.id)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
        }))
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      // Xoá các <li> cũ trừ "Tất cả bài viết" (li đầu tiên)
      const allItem = baseUl.querySelector("li");
      if (allItem) allItem.classList.add("news-menu__item");
      baseUl.innerHTML = "";
      if (allItem) baseUl.appendChild(allItem);

      // Inject HTML động
      const tmp = document.createElement("div");
      tmp.innerHTML = buildMenuHTML(roots);
      while (tmp.firstChild) baseUl.appendChild(tmp.firstChild);

      console.log("[news-menu] rendered", roots.length, "root categories");
    } catch (err) {
      console.error("[news-menu] Lỗi:", err.message);
      // Giữ menu mặc định nếu lỗi
    }
  }

  // Đợi DOM + header partial ready
  function init() {
    // partials.js bắn event 'partials:loaded' khi header đã vào DOM
    if (document.getElementById("news-menu-mount")) {
      render();
    } else {
      document.addEventListener("partials:loaded", render, { once: true });
      // fallback: timeout 2s nếu event không bắn
      setTimeout(() => {
        if (document.getElementById("news-menu-mount")) render();
      }, 2000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();