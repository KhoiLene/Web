const STORAGE_KEY = "giaitri_content";

async function loadVideos() {
  // Ưu tiên backend/API (nếu dự án có cung cấp endpoint).
  try {
    const res = await fetch("/api/giaitri", { method: "GET" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.videos)) return data.videos;
    }
  } catch (e) {
    // fallback tới localStorage
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function setHidden(el, shouldHide) {
  if (!el) return;
  if (shouldHide) el.setAttribute("hidden", "");
  else el.removeAttribute("hidden");
}

function videoCardHTML(v) {
  const title = v.title ? String(v.title) : "Video";
  const src = v.url || v.src || "";
  return `
    <div class="video-card">
      <video src="${src}" controls preload="metadata"></video>
      <div class="video-card__title">${title}</div>
    </div>
  `;
}

function renderGiaitriContent() {
  const statusEl = document.getElementById("giaitri-status");
  const grid = document.getElementById("video-grid");
  const emptyEl = document.getElementById("empty-state");

  if (statusEl) statusEl.textContent = "Đang tải...";

  loadVideos()
    .then((videos) => {
      const hasContent = Array.isArray(videos) && videos.length > 0;

      setHidden(grid, !hasContent);
      setHidden(emptyEl, hasContent);
      setHidden(statusEl, true);

      if (hasContent) {
        grid.innerHTML = videos.map(videoCardHTML).join("");
      }
    })
    .catch(() => {
      setHidden(grid, true);
      setHidden(statusEl, true);
      setHidden(emptyEl, false);
    });
}

document.addEventListener("DOMContentLoaded", renderGiaitriContent);