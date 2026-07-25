// =====================================================================
// printOrder.js — In phiếu đơn hàng ra PDF (1 trang / đơn)
// Dùng jsPDF + qrcode + font Roboto tiếng Việt.
// Mở tab mới để user in trực tiếp.
// =====================================================================

import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { supabase } from "../../api";

// Vite asset import — trả về URL
import robotoRegularUrl from "./roboto-regular.ttf?url";
import robotoBoldUrl    from "./roboto-bold.ttf?url";

const SHOP_INFO = {
  name:    "TECHTRA",
  address: "Số 1, đường ABC, Quận 1, TP. Hồ Chí Minh",
  phone:   "0901 234 567",
  hotline: "1900 6868",
};

const fmtVND = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

// ─── Cache fonts & QR generator ─────────────────────────────────────
let _fontsLoaded = null;
async function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
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
// Ưu tiên dùng jt_bill_code (mã vận đơn J&T thật) nếu đã tạo,
// fallback về order_code nội bộ Techtra.
// Format URL: https://jtexpress.vn/tracking?billcode=...&phone=...
function buildJTTrackingURL(order) {
  const bill = order.jt_bill_code || order.order_code || String(order.id);
  const phone = (order.customer_phone || "").replace(/\D/g, "");
  return `https://jtexpress.vn/tracking?billcode=${encodeURIComponent(bill)}&phone=${encodeURIComponent(phone)}`;
}

// Tạo QR dataURL (PNG base64) — async
async function makeQRDataURL(text) {
  return await QRCode.toDataURL(text, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

// ════════════════════════════════════════════════════════════════════
// Render 1 trang PDF
// ════════════════════════════════════════════════════════════════════
async function renderOrderPage(doc, order, qrDataURL) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = 15;

  // Font mặc định
  doc.setFont("Roboto", "normal");

  // ─── HEADER: Shop + Tiêu đề ─────────────────────────────────────
  doc.setFontSize(20);
  doc.setFont("Roboto", "bold");
  doc.text(SHOP_INFO.name, margin, y);

  doc.setFontSize(8.5);
  doc.setFont("Roboto", "normal");
  doc.text(`Địa chỉ: ${SHOP_INFO.address}`, margin, y + 5);
  doc.text(`SĐT: ${SHOP_INFO.phone}  |  Hotline: ${SHOP_INFO.hotline}`, margin, y + 9.5);

  // Vạch ngang trên cùng (màu xanh)
  doc.setDrawColor(62, 104, 7);  // #3E6807
  doc.setLineWidth(0.8);
  doc.line(margin, y + 12, pageW - margin, y + 12);

  // Tiêu đề phiếu
  doc.setFontSize(15);
  doc.setFont("Roboto", "bold");
  doc.text("PHIẾU ĐƠN HÀNG", pageW - margin, y, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("Roboto", "normal");
  doc.text(`Mã đơn: ${order.order_code || "#" + order.id}`, pageW - margin, y + 6, { align: "right" });
  doc.text(`Ngày tạo: ${fmtDate(order.created_at)}`, pageW - margin, y + 11, { align: "right" });

  y += 18;

  // ─── QR + KHÁCH HÀNG (2 cột) ──────────────────────────────────
  // QR bên trái
  if (qrDataURL) {
    const qrSize = 32;
    doc.addImage(qrDataURL, "PNG", margin, y, qrSize, qrSize);
    doc.setFontSize(7.5);
    doc.setFont("Roboto", "normal");
    doc.text("Quét để tra cứu vận đơn J&T", margin + qrSize / 2, y + qrSize + 3.5, { align: "center" });
  }

  // Thông tin KH bên phải
  const khX = margin + 38;
  let khY = y + 3;
  doc.setFontSize(10);
  doc.setFont("Roboto", "bold");
  doc.text("THÔNG TIN KHÁCH HÀNG", khX, khY);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(khX, khY + 1.5, pageW - margin, khY + 1.5);

  khY += 6;
  doc.setFont("Roboto", "normal");
  doc.setFontSize(9);
  const khLines = [
    ["Họ tên:",     order.customer_name  || "(không tên)"],
    ["SĐT:",        order.customer_phone || "(chưa có)"],
    ["Email:",      order.customer_email || "(chưa có)"],
    ["Địa chỉ:",    order.address        || "(chưa có)"],
  ];
  if (order.ward || order.district || order.province) {
    khLines.push(["",         [order.ward, order.district, order.province].filter(Boolean).join(", ")]);
  }
  if (order.note) {
    khLines.push(["Ghi chú:", order.note]);
  }
  khLines.forEach(([label, val]) => {
    if (label) doc.setFont("Roboto", "bold");
    else       doc.setFont("Roboto", "normal");
    doc.text(label, khX, khY);
    doc.setFont("Roboto", "normal");
    const valStr = String(val || "");
    // wrap nếu quá dài
    const maxW = pageW - margin - (khX + 22);
    const wrapped = doc.splitTextToSize(valStr, maxW);
    doc.text(wrapped, khX + 22, khY);
    khY += 5 * (wrapped.length || 1);
  });

  y = Math.max(y + 36, khY + 4);

  // ─── THANH TOÁN ───────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("Roboto", "bold");
  doc.text("THANH TOÁN", margin, y);
  doc.line(margin, y + 1.5, pageW - margin, y + 1.5);

  y += 6;
  doc.setFontSize(9);
  doc.setFont("Roboto", "normal");
  const pmLabel = {
    cod:  "COD (Thu hộ)",
    vnpay:"VNPay",
    momo: "MoMo",
    bank: "Chuyển khoản",
  }[order.payment_method] || order.payment_method || "—";
  const psLabel = {
    paid:    "Đã thanh toán",
    pending: "Chờ thanh toán",
    failed:  "Thất bại",
  }[order.payment_status] || order.payment_status || "—";
  doc.text(`Phương thức: ${pmLabel}`, margin, y);
  doc.text(`Trạng thái: ${psLabel}`, margin + 60, y);
  y += 7;

  // ─── DANH SÁCH SẢN PHẨM ──────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont("Roboto", "bold");
  doc.text("DANH SÁCH SẢN PHẨM", margin, y);
  doc.line(margin, y + 1.5, pageW - margin, y + 1.5);

  // Header table
  y += 7;
  doc.setFontSize(8.5);
  doc.setFillColor(62, 104, 7);
  doc.setTextColor(255, 255, 255);
  doc.rect(margin, y - 4.5, pageW - margin * 2, 7, "F");
  doc.setFont("Roboto", "bold");
  doc.text("STT",        margin + 2,        y);
  doc.text("Sản phẩm",   margin + 10,       y);
  doc.text("SKU",        margin + 100,      y);
  doc.text("SL",         pageW - 60,        y, { align: "right" });
  doc.text("Đơn giá",   pageW - 40,        y, { align: "right" });
  doc.text("Thành tiền", pageW - margin,    y, { align: "right" });

  // Rows
  doc.setTextColor(0, 0, 0);
  doc.setFont("Roboto", "normal");
  const items = order._items || [];
  items.forEach((it, i) => {
    y += 6;
    if (y > 265) {
      doc.addPage();
      y = 20;
    }
    // Zebra stripe
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 4, pageW - margin * 2, 6, "F");
    }
    doc.setFont("Roboto", "normal");
    doc.text(String(i + 1), margin + 2, y);
    const name = String(it.product_name || "").slice(0, 42);
    const nameWrap = doc.splitTextToSize(name, 88);
    doc.text(nameWrap, margin + 10, y);
    doc.text(String(it.product_sku || "").slice(0, 12), margin + 100, y);
    doc.text("x" + (it.quantity || 0), pageW - 60, y, { align: "right" });
    doc.text(fmtVND(it.unit_price), pageW - 40, y, { align: "right" });
    doc.setFont("Roboto", "bold");
    doc.text(fmtVND(it.subtotal), pageW - margin, y, { align: "right" });
  });

  // ─── TỔNG TIỀN ────────────────────────────────────────────────
  y += 10;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageW - margin, y);
  y += 6;
  doc.setFont("Roboto", "normal");
  doc.setFontSize(9);
  const totalLines = [
    ["Tổng tiền hàng:",   fmtVND(order.total_price)],
    ["Phí vận chuyển:",   fmtVND(order.shipping_fee)],
  ];
  if (Number(order.discount_amount) > 0) {
    totalLines.push(["Giảm giá:", "-" + fmtVND(order.discount_amount)]);
  }
  totalLines.forEach(([label, val]) => {
    doc.text(label, pageW - 70, y);
    doc.text(val, pageW - margin, y, { align: "right" });
    y += 5;
  });

  y += 2;
  doc.setDrawColor(62, 104, 7);
  doc.setLineWidth(0.5);
  doc.line(pageW - 70, y, pageW - margin, y);
  y += 6;
  doc.setFont("Roboto", "bold");
  doc.setFontSize(12);
  doc.setTextColor(215, 0, 24);
  doc.text("KHÁCH PHẢI TRẢ:", pageW - 70, y);
  doc.text(fmtVND(order.final_price), pageW - margin, y, { align: "right" });
  doc.setTextColor(0, 0, 0);

  // ─── FOOTER ───────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7.5);
  doc.setFont("Roboto", "italic");
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Cảm ơn quý khách! Vui lòng giữ phiếu để đối chiếu. In lúc: ${fmtDate(new Date().toISOString())}`,
    pageW / 2, pageH - 8, { align: "center" }
  );
}

// ─── Lấy order_items cho nhiều đơn ─────────────────────────────────
async function fetchOrderItems(orders) {
  if (!orders.length) return orders;
  const ids = orders.map((o) => o.id);
  const { data, error } = await supabase
    .from("order_items")
    .select("order_id, product_name, product_sku, image_url, quantity, unit_price, discount, subtotal")
    .in("order_id", ids);
  if (error) {
    console.error("Lỗi fetch order_items:", error);
    return orders;
  }
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

  // 1. Lấy items
  const ordersWithItems = await fetchOrderItems(orders);

  // 2. Tạo PDF
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await ensureFontsLoaded(doc);
  doc.setFont("Roboto", "normal");

  // 3. Tạo QR cho từng đơn (parallel)
  const qrDataURLs = await Promise.all(
    ordersWithItems.map((o) => makeQRDataURL(buildJTTrackingURL(o)))
  );

  ordersWithItems.forEach((o, i) => {
    if (i > 0) doc.addPage();
    renderOrderPage(doc, o, qrDataURLs[i]);
  });

  // 4. Mở blob URL trong tab mới
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
