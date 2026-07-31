const STORAGE_KEY = "about_us_content";

function normalizeHtml(html) {
  if (!html) return "";
  const trimmed = String(html).trim();
  if (!trimmed) return "";
  if (trimmed === "<p><br></p>" || trimmed === "<br>" || trimmed === "<div><br></div>") return "";
  return html;
}

async function loadAboutUsContent() {
  // Ưu tiên backend/API (nếu dự án có cung cấp endpoint).
  try {
    const res = await fetch("/api/about-us", { method: "GET" });
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.content === "string") return data.content;
    }
  } catch (e) {
    // fallback tới localStorage
  }

  return localStorage.getItem(STORAGE_KEY);
}

function setHidden(el, shouldHide) {
  if (!el) return;
  if (shouldHide) el.setAttribute("hidden", "");
  else el.removeAttribute("hidden");
}

function renderAboutContent() {
  const statusEl = document.getElementById("ve-techtra-status");
  const container = document.getElementById("about-content");
  const emptyEl = document.getElementById("empty-state");

  if (statusEl) statusEl.textContent = "Đang tải...";

  loadAboutUsContent()
    .then((raw) => {
      const html = normalizeHtml(raw);
      const hasContent = !!html;

      setHidden(container, !hasContent);
      setHidden(emptyEl, hasContent);
      setHidden(statusEl, true);

      if (hasContent) container.innerHTML = html;
    })
    .catch(() => {
      setHidden(container, true);
      setHidden(statusEl, true);
      setHidden(emptyEl, false);
    });
}

document.addEventListener("DOMContentLoaded", renderAboutContent);