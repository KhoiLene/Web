// include.js — Tự động load header/footer dùng chung cho các trang

const headerURL = '/components/header/header.html';
const footerURL = '/components/footer/footer.html';

async function includeHTML(url, targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Không tải được ${url}: ${res.status}`);
    const html = await res.text();
    target.innerHTML = html;
  } catch (err) {
    console.error("Lỗi khi load include:", err);
    target.innerHTML = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  includeHTML(headerURL, "header-placeholder");
  includeHTML(footerURL, "footer-placeholder");
});