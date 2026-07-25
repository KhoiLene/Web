// ════════════════════════════════════════════════════════════════════════════
// htmlPasteSanitizer.js
// Dùng chung cho mọi ô contentEditable cần dán nội dung từ Word/Google Docs
// (giữ chữ/màu/in đậm/nghiêng/ảnh, bỏ các thuộc tính CSS gây vỡ layout).
// Tách ra từ AboutContentTab.jsx để tái sử dụng ở các form khác (VD: mô tả sản phẩm).
// ════════════════════════════════════════════════════════════════════════════

// Các thuộc tính CSS gây vỡ bố cục khi dán từ Word/Google Docs
// (Word hay dùng position/float/margin âm để dàn cột — nếu giữ nguyên,
// nội dung sẽ đè lên nhau khi hiển thị ngoài Word).
const LAYOUT_BREAKING_PROPS = [
  "position",
  "top",
  "left",
  "right",
  "bottom",
  "float",
  "z-index",
  "transform",
  "clip",
  "clip-path",
  "min-height",
  "max-height",
];

// Các thuộc tính CSS được PHÉP giữ lại (định dạng chữ)
const ALLOWED_STYLE_PROPS = [
  "color",
  "background-color",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-decoration",
  "text-align",
  "line-height",
];

function sanitizeStyleAttr(styleText) {
  if (!styleText) return "";
  const kept = [];
  styleText.split(";").forEach((decl) => {
    const [rawProp, ...rest] = decl.split(":");
    if (!rawProp || !rest.length) return;
    const prop = rawProp.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (!value) return;
    if (prop === "width" || prop === "height") return; // ảnh xử lý riêng bên dưới
    if (LAYOUT_BREAKING_PROPS.includes(prop)) return;
    if (prop.startsWith("margin") && value.includes("-")) return; // margin âm
    if (ALLOWED_STYLE_PROPS.includes(prop) || prop.startsWith("margin") || prop.startsWith("padding")) {
      kept.push(`${prop}: ${value}`);
    }
  });
  return kept.join("; ");
}

function sanitizeNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return;
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const tag = node.tagName.toLowerCase();

  if (tag === "style" || tag === "script" || tag === "meta" || tag === "link") {
    node.remove();
    return;
  }

  [...node.attributes].forEach((attr) => {
    const name = attr.name.toLowerCase();
    if (name === "style") return;
    if (name === "src" || name === "href" || name === "alt" || name === "colspan" || name === "rowspan") return;
    node.removeAttribute(attr.name);
  });

  if (node.hasAttribute("style")) {
    const cleanStyle = sanitizeStyleAttr(node.getAttribute("style"));
    if (cleanStyle) node.setAttribute("style", cleanStyle);
    else node.removeAttribute("style");
  }

  if (tag === "img") {
    node.style.maxWidth = "100%";
    node.style.height = "auto";
    node.removeAttribute("width");
    node.removeAttribute("height");
  }

  [...node.childNodes].forEach(sanitizeNode);
}

// Làm sạch toàn bộ HTML được dán: giữ chữ/màu/in đậm/nghiêng/ảnh,
// bỏ position/float/margin âm/kích thước cố định gây đè chữ lên ảnh
export function sanitizePastedHtml(rawHtml) {
  const template = document.createElement("template");
  template.innerHTML = rawHtml;
  [...template.content.childNodes].forEach(sanitizeNode);
  return template.innerHTML;
}

// Handler dùng thẳng cho onPaste của bất kỳ contentEditable nào:
// chặn dán mặc định của trình duyệt, tự lọc HTML rồi insert vào đúng vị trí con trỏ.
export function handleSanitizedPaste(e) {
  e.preventDefault();
  const rawHtml = e.clipboardData.getData("text/html");
  const rawText = e.clipboardData.getData("text/plain");

  const contentToInsert = rawHtml ? sanitizePastedHtml(rawHtml) : rawText.replace(/\n/g, "<br>");
  document.execCommand("insertHTML", false, contentToInsert);
}