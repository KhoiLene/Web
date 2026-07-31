// =====================================================================
// printOrder.js — In phiếu vận đơn đẹp chuẩn giao hàng thật
// Dùng jsPDF + qrcode + font Roboto tiếng Việt.
// Mở tab mới để user in trực tiếp.
// =====================================================================

import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { ordersApi } from "../../api";

// Vite asset import — trả về URL
import robotoRegularUrl from "./roboto-regular.ttf?url";
import robotoBoldUrl    from "./roboto-bold.ttf?url";

// ─── Thông tin shop (lấy từ shop_info có thể override sau) ───────────
const SHOP_INFO = {
  name:    "TECHTRA",
  address: "Số 1, đường ABC, Quận 1, TP. Hồ Chí Minh",
  phone:   "0901 234 567",
  hotline: "1900 6868",
  website: "techtra.vn",
};

// ─── Bảng màu theo brand Techtra (#2563eb xanh dương + accent đỏ) ──
const C = {
  primary:    [37, 99, 235],     // #2563eb
  primaryDk:  [29, 78, 216],     // #1d4ed8
  accent:     [215, 0, 24],      // #d70018 — final price
  text:       [17, 24, 39],      // #111827
  textMuted:  [107, 114, 128],   // #6b7280
  border:     [220, 220, 220],
  bgLight:    [248, 250, 252],   // zebra stripe
  bgHeader:   [37, 99, 235],
  white:      [255, 255, 255],
  green:      [22, 163, 74],
  yellow:     [202, 138, 4],
  red:        [220, 38, 38],
};

const fmtVND = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";
const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};
const fmtDateShort = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

// ─── Cache fonts & QR generator ─────────────────────────────────────
let _fontsLoaded = null;
async function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
async function loadFontAsBase64(url) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return arrayBufferToBase64(buf);
}
async function ensureFontsLoaded(doc) {
  if (_fontsLoaded) return _fontsLoaded;
  _fontsLoaded = (async () => {
    const [regularB64, boldB64] = await Promise.all([
      loadFontAsBase64(robotoRegularUrl),
      loadFontAsBase64(robotoBoldUrl),
    ]);
    doc.addFileToVFS("Roboto-Regular.ttf", regularB64);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.addFileToVFS("Roboto-Bold.ttf", boldB64);
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  })();
  return _fontsLoaded;
}

// ─── QR theo chuẩn J&T Express ──────────────────────────────────────
function buildJTTrackingURL(order) {
  const bill = order.jt_bill_code || order.order_code || String(order.id);
  const phone = (order.customer_phone || "").replace(/\D/g, "");
  return `https://jtexpress.vn/tracking?billcode=${encodeURIComponent(bill)}&phone=${encodeURIComponent(phone)}`;
}
async function makeQRDataURL(text) {
  return await QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

// ─── Helpers đặc biệt cho vận đơn ──────────────────────────────────
function getPaymentLabel(method, status) {
  const pm = {
    cod:  "COD (Thu hộ)",
    vnpay:"VNPay",
    momo: "MoMo",
    bank: "Chuyển khoản",
  }[method] || method || "—";
  const ps = {
    paid:    "Đã thanh toán",
    pending: "Chờ thanh toán",
    failed:  "Thất bại",
  }[status] || status || "";
  return ps ? `${pm} • ${ps}` : pm;
}
function getStatusMeta(status) {
  return {
    pending:   { label: "CHỜ XÁC NHẬN", color: C.yellow,  bg: [254, 243, 199] },
    confirmed: { label: "ĐÃ XÁC NHẬN",  color: C.primary, bg: [219, 234, 254] },
    shipping:  { label: "ĐANG GIAO",    color: [124, 58, 237], bg: [237, 233, 254] },
    done:      { label: "HOÀN TẤT",     color: C.green,   bg: [220, 252, 231] },
    cancelled: { label: "ĐÃ HỦY",       color: C.red,     bg: [254, 226, 226] },
  }[status] || { label: (status || "—").toUpperCase(), color: C.textMuted, bg: C.bgLight };
}

function setFill(doc, c) { doc.setFillColor(c[0], c[1], c[2]); }
function setText(doc, c) { doc.setTextColor(c[0], c[1], c[2]); }
function setDraw(doc, c) { doc.setDrawColor(c[0], c[1], c[2]); }

// ════════════════════════════════════════════════════════════════════
// Render 1 trang PDF — CHUẨN VẬN ĐƠN
// ════════════════════════════════════════════════════════════════════
async function renderOrderPage(doc, order, qrDataURL) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 8;
  const contentW = pageW - margin * 2;
  let y = 0;

  doc.setFont("Roboto", "normal");

  // ═══ HEADER BAR (màu brand) ════════════════════════════════════
  setFill(doc, C.primary);
  doc.rect(0, y, pageW, 22, "F");
  setText(doc, C.white);

  doc.setFont("Roboto", "bold");
  doc.setFontSize(22);
  doc.text(SHOP_INFO.name, margin + 2, y + 11);

  doc.setFont("Roboto", "normal");
  doc.setFontSize(8);
  doc.text(`Hotline: ${SHOP_INFO.hotline}  |  ${SHOP_INFO.website}`, margin + 2, y + 17);

  // Phần phải header
  doc.setFont("Roboto", "bold");
  doc.setFontSize(11);
  doc.text("PHIẾU GIAO HÀNG", pageW - margin - 2, y + 8, { align: "right" });
  doc.setFont("Roboto", "normal");
  doc.setFontSize(8);
  doc.text("Mẫu A5 - Vận đơn giao nhận nhanh", pageW - margin - 2, y + 13, { align: "right" });
  doc.text(`In lúc: ${fmtDate(new Date().toISOString())}`, pageW - margin - 2, y + 18, { align: "right" });

  y += 22;

  // ═══ MÃ ĐƠN + QR + BARCODE-LIKE ═════════════════════════════════
  // Khối trắng với border, chiếm nửa trái
  setFill(doc, C.white);
  setDraw(doc, C.border);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentW, 38, "FD");

  // Mã đơn (font lớn, nổi bật)
  doc.setFont("Roboto", "bold");
  doc.setFontSize(8);
  setText(doc, C.textMuted);
  doc.text("MÃ ĐƠN HÀNG / MÃ VẬN ĐƠN", margin + 4, y + 6);

  doc.setFontSize(20);
  setText(doc, C.primary);
  doc.text(order.order_code || ("#" + order.id), margin + 4, y + 17);

  // Ngày tạo + status badge
  const statusMeta = getStatusMeta(order.status);
  setFill(doc, statusMeta.bg);
  setDraw(doc, statusMeta.color);
  doc.roundedRect(margin + 4, y + 22, 40, 6, 1.2, 1.2, "FD");
  doc.setFont("Roboto", "bold");
  doc.setFontSize(8);
  setText(doc, statusMeta.color);
  doc.text(statusMeta.label, margin + 24, y + 26, { align: "center" });

  doc.setFont("Roboto", "normal");
  doc.setFontSize(8);
  setText(doc, C.textMuted);
  doc.text(`Ngày tạo: ${fmtDateShort(order.created_at)}`, margin + 4, y + 33);

  // QR bên phải
  if (qrDataURL) {
    const qrSize = 30;
    doc.addImage(qrDataURL, "PNG", pageW - margin - qrSize - 4, y + 4, qrSize, qrSize);
    doc.setFontSize(7);
    setText(doc, C.textMuted);
    doc.text("Quét QR tra cứu vận đơn J&T",
      pageW - margin - qrSize / 2 - 4, y + qrSize + 7, { align: "center" });
  }

  y += 42;

  // ═══ KHỐI NGƯỜI NHẬN (nổi bật) ═══════════════════════════════════
  // Label header ngắn
  setFill(doc, C.primary);
  doc.rect(margin, y, contentW, 7, "F");
  doc.setFont("Roboto", "bold");
  doc.setFontSize(9);
  setText(doc, C.white);
  doc.text("▼  NGƯỜI NHẬN  (ĐIỀN ĐẦY ĐỦ THÔNG TIN)", margin + 3, y + 5);

  y += 7;

  // Khối thông tin người nhận
  setFill(doc, [254, 249, 195]); // vàng nhạt — nổi bật như phiếu gửi hàng
  doc.rect(margin, y, contentW, 38, "F");
  setDraw(doc, [202, 138, 4]);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentW, 38);

  // Tên người nhận (TO)
  doc.setFont("Roboto", "bold");
  doc.setFontSize(14);
  setText(doc, C.text);
  doc.text("TO:", margin + 4, y + 8);
  doc.setFontSize(16);
  setText(doc, C.primary);
  doc.text(order.customer_name || "(không tên)", margin + 16, y + 8);

  // Số điện thoại
  doc.setFont("Roboto", "bold");
  doc.setFontSize(9);
  setText(doc, C.textMuted);
  doc.text("SĐT:", margin + 4, y + 14);
  doc.setFont("Roboto", "normal");
  doc.setFontSize(11);
  setText(doc, C.text);
  doc.text(order.customer_phone || "(chưa có)", margin + 14, y + 14);

  // Địa chỉ
  doc.setFont("Roboto", "bold");
  doc.setFontSize(9);
  setText(doc, C.textMuted);
  doc.text("ĐC:", margin + 4, y + 20);
  doc.setFont("Roboto", "normal");
  doc.setFontSize(10);
  setText(doc, C.text);
  const addrFull = [
    order.address,
    order.ward, order.district, order.province,
  ].filter(Boolean).join(", ");
  const addrWrap = doc.splitTextToSize(addrFull || "(chưa có địa chỉ)", contentW - 16);
  doc.text(addrWrap, margin + 14, y + 20);

  // Ghi chú (nếu có)
  if (order.note) {
    const noteY = y + 20 + addrWrap.length * 4 + 1;
    doc.setFont("Roboto", "bold");
    doc.setFontSize(8);
    setText(doc, C.textMuted);
    doc.text("Ghi chú:", margin + 4, noteY);
    doc.setFont("Roboto", "italic");
    doc.setFontSize(9);
    setText(doc, C.text);
    const noteWrap = doc.splitTextToSize(order.note, contentW - 18);
    doc.text(noteWrap, margin + 14, noteY);
  }

  y += 41;

  // ═══ KHỐI NGƯỜI GỬI ═══════════════════════════════════════════════
  setFill(doc, C.primary);
  doc.rect(margin, y, contentW, 6, "F");
  doc.setFont("Roboto", "bold");
  doc.setFontSize(8.5);
  setText(doc, C.white);
  doc.text("▲  NGƯỜI GỬI", margin + 3, y + 4.3);

  y += 6;
  setFill(doc, [241, 245, 249]);
  setDraw(doc, C.border);
  doc.rect(margin, y, contentW, 18, "FD");

  doc.setFont("Roboto", "bold");
  doc.setFontSize(12);
  setText(doc, C.text);
  doc.text("FROM: " + SHOP_INFO.name, margin + 4, y + 6);

  doc.setFont("Roboto", "normal");
  doc.setFontSize(9);
  setText(doc, C.textMuted);
  doc.text(SHOP_INFO.address, margin + 4, y + 11);
  doc.text(`SĐT: ${SHOP_INFO.phone}  |  Hotline: ${SHOP_INFO.hotline}`, margin + 4, y + 15);

  y += 22;

  // ═══ THANH TOÁN (compact) ═════════════════════════════════════════
  setFill(doc, [239, 246, 255]); // blue nhạt
  doc.rect(margin, y, contentW, 9, "F");

  doc.setFont("Roboto", "bold");
  doc.setFontSize(8);
  setText(doc, C.textMuted);
  doc.text("THANH TOÁN:", margin + 3, y + 5.7);

  doc.setFontSize(9);
  setText(doc, C.text);
  doc.text(getPaymentLabel(order.payment_method, order.payment_status),
    margin + 30, y + 5.7);

  // COD thì highlight
  if ((order.payment_method || "").toLowerCase() === "cod"
      && (order.payment_status || "").toLowerCase() !== "paid") {
    doc.setFont("Roboto", "bold");
    setText(doc, C.accent);
    doc.text(`(THU HỘ: ${fmtVND(order.final_price)})`,
      pageW - margin - 3, y + 5.7, { align: "right" });
  }

  y += 12;

  // ═══ DANH SÁCH SẢN PHẨM ═════════════════════════════════════════
  doc.setFont("Roboto", "bold");
  doc.setFontSize(9);
  setText(doc, C.text);
  doc.text("DANH SÁCH SẢN PHẨM", margin, y);
  doc.setFont("Roboto", "normal");
  doc.setFontSize(8);
  setText(doc, C.textMuted);
  doc.text(`${(order._items || []).length} sản phẩm`,
    pageW - margin, y, { align: "right" });

  y += 3;
  // Header table
  setFill(doc, C.primary);
  doc.rect(margin, y, contentW, 7, "F");

  doc.setFont("Roboto", "bold");
  doc.setFontSize(8.5);
  setText(doc, C.white);
  doc.text("#",         margin + 3,         y + 5);
  doc.text("Sản phẩm", margin + 10,        y + 5);
  doc.text("SL",        margin + contentW * 0.62, y + 5, { align: "right" });
  doc.text("Đơn giá",   margin + contentW * 0.78, y + 5, { align: "right" });
  doc.text("T.Tiền",    pageW - margin - 3, y + 5, { align: "right" });

  y += 7;

  // Rows
  doc.setFont("Roboto", "normal");
  doc.setFontSize(8.5);
  setText(doc, C.text);
  const items = order._items || [];
  let rowY = y;
  const rowH = 6.5;

  items.forEach((it, i) => {
    if (rowY + rowH > pageH - 50) {
      // Nếu hết chỗ → thêm page
      doc.addPage();
      rowY = 15;
    }
    // Zebra
    if (i % 2 === 0) {
      setFill(doc, C.bgLight);
      doc.rect(margin, rowY, contentW, rowH, "F");
    }
    doc.text(String(i + 1), margin + 3, rowY + 4.5);

    // Tên SP (cắt ngắn + wrap)
    const nameStr = String(it.product_name || "");
    const nameMax = contentW * 0.5;
    const nameWrap = doc.splitTextToSize(nameStr, nameMax);
    doc.text(nameWrap.slice(0, 2), margin + 10, rowY + 4.5);

    // SL
    doc.text("x" + (it.quantity || 0), margin + contentW * 0.62, rowY + 4.5, { align: "right" });

    // Đơn giá
    doc.text(fmtVND(it.unit_price), margin + contentW * 0.78, rowY + 4.5, { align: "right" });

    // Thành tiền (bold)
    doc.setFont("Roboto", "bold");
    doc.text(fmtVND(it.subtotal || it.unit_price * it.quantity),
      pageW - margin - 3, rowY + 4.5, { align: "right" });
    doc.setFont("Roboto", "normal");

    rowY += rowH;
  });

  y = rowY + 2;

  // ═══ TỔNG TIỀN (right-aligned) ═══════════════════════════════════
  const totalX = pageW - margin - 75;
  doc.setFont("Roboto", "normal");
  doc.setFontSize(9);
  setText(doc, C.text);

  const totalLines = [
    ["Tổng tiền hàng:", fmtVND(order.total_price)],
  ];
  if (Number(order.shipping_fee) > 0) {
    totalLines.push(["Phí vận chuyển:", fmtVND(order.shipping_fee)]);
  }
  if (Number(order.discount_amount) > 0) {
    totalLines.push(["Giảm giá (voucher):", "-" + fmtVND(order.discount_amount)]);
  }

  totalLines.forEach(([label, val]) => {
    doc.text(label, totalX, y);
    doc.text(val, pageW - margin - 3, y, { align: "right" });
    y += 5;
  });

  // Vạch ngang trên tổng cuối
  setDraw(doc, C.primary);
  doc.setLineWidth(0.5);
  doc.line(totalX, y, pageW - margin, y);
  y += 6;

  // TỔNG CUỐI - highlight
  setFill(doc, [254, 226, 226]); // đỏ nhạt
  doc.rect(totalX - 3, y - 5, 78, 11, "F");
  setDraw(doc, C.accent);
  doc.setLineWidth(0.6);
  doc.rect(totalX - 3, y - 5, 78, 11);

  doc.setFont("Roboto", "bold");
  doc.setFontSize(10);
  setText(doc, C.text);
  doc.text("KHÁCH PHẢI TRẢ:", totalX, y + 1);

  doc.setFontSize(14);
  setText(doc, C.accent);
  doc.text(fmtVND(order.final_price), pageW - margin - 3, y + 2, { align: "right" });

  y += 12;

  // ═══ CHỮ KÝ (2 cột: Người gửi / Người nhận) ═══════════════════════
  const sigY = Math.max(y + 5, pageH - 38);
  const sigColW = contentW / 2 - 4;

  // Người gửi
  doc.setFont("Roboto", "bold");
  doc.setFontSize(9);
  setText(doc, C.text);
  doc.text("Người gửi (Ký, ghi rõ họ tên)", margin + sigColW / 2, sigY, { align: "center" });
  setDraw(doc, C.border);
  doc.setLineWidth(0.3);
  doc.line(margin + 6, sigY + 22, margin + sigColW - 6, sigY + 22);

  // Người nhận
  doc.setFont("Roboto", "bold");
  doc.text("Người nhận (Ký, ghi rõ họ tên)",
    margin + sigColW + 8 + sigColW / 2, sigY, { align: "center" });
  doc.line(margin + sigColW + 14, sigY + 22, pageW - margin - 6, sigY + 22);

  doc.setFont("Roboto", "italic");
  doc.setFontSize(8);
  setText(doc, C.textMuted);
  doc.text("(Đã kiểm tra hàng đầy đủ)", margin + sigColW / 2, sigY + 26, { align: "center" });

  // ═══ FOOTER ═══════════════════════════════════════════════════════
  const footY = pageH - 7;
  setFill(doc, C.primary);
  doc.rect(0, footY - 4, pageW, 11, "F");

  doc.setFont("Roboto", "normal");
  doc.setFontSize(7.5);
  setText(doc, C.white);
  doc.text(
    `TECHTRA - Cảm ơn quý khách! Vui lòng giữ phiếu để đối chiếu khi cần thiết. Hotline hỗ trợ: ${SHOP_INFO.hotline}`,
    pageW / 2, footY + 1, { align: "center" }
  );
}

// ─── Lấy order_items cho nhiều đơn ─────────────────────────────────
async function fetchOrderItems(orders) {
  if (!orders.length) return orders;
  const ids = orders.map((o) => o.id);
  const data = await ordersApi.getItemsByOrders(ids).catch((err) => {
    console.error("Lỗi fetch order_items:", err);
    return [];
  });
  const byOrder = {};
  (data || []).forEach((it) => {
    (byOrder[it.order_id] = byOrder[it.order_id] || []).push(it);
  });
  return orders.map((o) => ({ ...o, _items: byOrder[o.id] || [] }));
}

// ════════════════════════════════════════════════════════════════════
// PUBLIC: In nhiều đơn
// ════════════════════════════════════════════════════════════════════
export async function printOrdersAsPDF(orders) {
  if (!orders || !orders.length) {
    alert("Không có đơn nào để in.");
    return;
  }

  const ordersWithItems = await fetchOrderItems(orders);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await ensureFontsLoaded(doc);
  doc.setFont("Roboto", "normal");

  const qrDataURLs = await Promise.all(
    ordersWithItems.map((o) => makeQRDataURL(buildJTTrackingURL(o)))
  );

  ordersWithItems.forEach((o, i) => {
    if (i > 0) doc.addPage();
    renderOrderPage(doc, o, qrDataURLs[i]);
  });

  const blobUrl = doc.output("bloburl");
  const win = window.open(blobUrl, "_blank");
  if (!win) {
    alert("Trình duyệt chặn popup. Vui lòng cho phép popup để xem phiếu in.");
    return;
  }
  setTimeout(() => {
    try { win.print(); } catch { /* user Ctrl+P */ }
  }, 1000);
}

export async function printSingleOrder(order) {
  return printOrdersAsPDF([order]);
}
