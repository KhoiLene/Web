// ════════════════════════════════════════════════════════════════════════════
// htmlPasteSanitizer.js
// Dùng chung cho mọi ô contentEditable cần dán nội dung từ Word/Google Docs.
// GIỮ NGUYÊN 100% định dạng gốc (style, position, float, margin, kích thước ảnh,
// Elementor class, iframe YouTube, v.v.) đúng như trong Word/Google Docs.
// Chỉ loại bỏ thẻ <script> vì lý do an toàn (tránh chèn mã độc), không đụng
// vào bất kỳ thuộc tính hay style nào khác.
//
// LƯU Ý: vì không còn lọc position/float/margin âm như trước, nội dung dán từ
// Word có thể vỡ layout (chữ đè lên ảnh, tràn khung...) khi hiển thị ngoài Word.
// Shop ve-techtra-moi đã có CSS phòng thủ (`.prose * { position: static !important;
// float: none !important; max-width: 100% !important; }`) — nên phải dùng đúng
// class `prose` để khớp 100% với trang Về Techtra public.
// ════════════════════════════════════════════════════════════════════════════

function sanitizeNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return;
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const tag = node.tagName.toLowerCase();

  // Chỉ loại bỏ thẻ có thể gây hại. Không xoá attribute/style nào khác.
  if (tag === "script") {
    node.remove();
    return;
  }

  [...node.childNodes].forEach(sanitizeNode);
}

// Làm sạch tối thiểu HTML được dán: chỉ chặn script, giữ nguyên mọi thứ khác
export function sanitizePastedHtml(rawHtml) {
  if (!rawHtml) return "";
  const html = String(rawHtml).trim();
  if (!html) return "";
  const template = document.createElement("template");
  template.innerHTML = html;
  [...template.content.childNodes].forEach(sanitizeNode);
  return template.innerHTML;
}

// Alias ngắn gọn, dùng cho preview render (cả admin + shop đều gọi tên này)
export function sanitizeHtml(rawHtml) {
  return sanitizePastedHtml(rawHtml);
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