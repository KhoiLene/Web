// // =====================================================================
// // jtHelpers.js — Helper gọi J&T Express + update orders trong DonHang/
// // Gom logic chung để OrderTable / AllOrders / OrderDetailModal cùng dùng.
// //
// // Luồng:
// //   1. loadJTConfig()  — fetch site_settings.jt_config → setJTConfig
// //   2. createJTOrder() — jtCreateOrder + UPDATE orders.jt_*
// //   3. cancelJTOrder() — jtCancelOrder + UPDATE orders.jt_status='cancelled'
// //   4. traceJTOrder()  — jtTraceOrder + UPDATE orders.jt_status, jt_last_trace
// //   5. printJTLabel()  — jtPrintOrder → mở URL PDF nhãn J&T
// //   6. formatJTStatus() — decode jt_status code sang text VN
// // =====================================================================

// import { supabase } from "../../api";
// import {
//   jtCreateOrder,
//   jtCancelOrder,
//   jtTraceOrder,
//   jtPrintOrder,
//   setJTConfig,
//   jtGetBalance,
//   jtCalculatePrice,
//   JT_PAYER,
// } from "../../jstService";

// const SETTINGS_KEY = "jt_config";

// // ─── Cache config trong session để khỏi fetch lại nhiều lần ──────────
// let _configCache = null;
// let _configLoading = null;

// export async function loadJTConfig({ force = false } = {}) {
//   if (!force && _configCache) return _configCache;
//   if (_configLoading) return _configLoading;

//   _configLoading = (async () => {
//     const { data, error } = await supabase
//       .from("site_settings")
//       .select("value_json")
//       .eq("key", SETTINGS_KEY)
//       .maybeSingle();
//     if (error) throw error;
//     if (data?.value_json) {
//       setJTConfig(data.value_json);
//       _configCache = data.value_json;
//       return data.value_json;
//     }
//     _configCache = null;
//     return null;
//   })();

//   try {
//     return await _configLoading;
//   } finally {
//     _configLoading = null;
//   }
// }

// export function clearJTConfigCache() {
//   _configCache = null;
// }

// // ─── Tính tổng trọng lượng từ order_items (mock 500g/SP) ─────────────
// function calcTotalWeight(items, fallbackQty = 1) {
//   if (!items?.length) return fallbackQty * 500;
//   const total = items.reduce((s, it) => {
//     const w = Number(it.weight_grams) || 500; // mặc định 500g/SP
//     return s + w * (Number(it.quantity) || 1);
//   }, 0);
//   return Math.max(500, total);
// }

// // ─── Lấy items cho 1 order (nếu chưa có) ────────────────────────────
// export async function fetchOrderItems(orderId) {
//   const { data, error } = await supabase
//     .from("order_items")
//     .select("id, product_name, quantity, unit_price, weight_grams")
//     .eq("order_id", orderId);
//   if (error) throw error;
//   return data || [];
// }

// // ════════════════════════════════════════════════════════════════════
// // TẠO VẬN ĐƠN J&T
// // ════════════════════════════════════════════════════════════════════
// export async function createJTOrder(techtraOrder, items = null, opts = {}) {
//   // 1. Load config (nếu chưa có)
//   const cfg = await loadJTConfig();
//   if (!cfg) {
//     throw new Error(
//       "Chưa cấu hình J&T. Vào Cấu hình → J&T Express để nhập API key trước."
//     );
//   }

//   // 2. Lấy items nếu chưa có
//   if (!items) items = await fetchOrderItems(techtraOrder.id);

//   // 3. Tính trọng lượng
//   const totalWeight = opts.weight || calcTotalWeight(items, techtraOrder.total_qty || 1);

//   // 4. Tính phí (optional — không bắt buộc)
//   let shippingFee = 0;
//   if (opts.calculateFee) {
//     try {
//       const priceRes = await jtCalculatePrice({
//         weight: totalWeight,
//         senderCity: cfg.sender?.province || "HCM",
//         receiverCity: techtraOrder.province || "HN",
//         serviceCode: opts.serviceCode || "01",
//       });
//       shippingFee = priceRes.fee || 0;
//     } catch (err) {
//       console.warn("Không tính được phí J&T:", err.message);
//     }
//   }

//   // 5. Gọi J&T tạo vận đơn
//   const result = await jtCreateOrder({
//     txlogisticId: techtraOrder.order_code || `TC${Date.now()}`,
//     serviceCode:  opts.serviceCode || techtraOrder.jt_service_code || "01",
//     orderType:    1,

//     // Receiver
//     receiverName:     techtraOrder.customer_name,
//     receiverPhone:    techtraOrder.customer_phone,
//     receiverAddress:  techtraOrder.address,
//     receiverCity:     techtraOrder.district || techtraOrder.province,
//     receiverProvince: techtraOrder.province,
//     receiverArea:     "VN",

//     // Items
//     items: items.map((it) => ({
//       name: it.product_name,
//       quantity: it.quantity || 1,
//       unitValue: it.unit_price || 0,
//     })),

//     // Package
//     weight: totalWeight,

//     // Money
//     codAmount: techtraOrder.payment_method === "cod" ? Number(techtraOrder.final_price) || 0 : 0,
//     payer: techtraOrder.payment_method === "cod" ? JT_PAYER.RECEIVER : JT_PAYER.SENDER,

//     remark: opts.remark || techtraOrder.note || "",
//   });

//   if (!result.success) {
//     throw new Error("J&T trả về lỗi — không có billCode.");
//   }

//   // 6. UPDATE orders với billCode + tracking
//   const { error: upErr } = await supabase
//     .from("orders")
//     .update({
//       jt_bill_code:     result.billCode || null,
//       jt_waybill_no:    result.waybillNo || null,
//       jt_tracking_url:  result.trackingUrl || `https://jtexpress.vn/tracking?billcode=${result.billCode}`,
//       jt_service_code:  opts.serviceCode || "01",
//       jt_weight_grams:  totalWeight,
//       jt_shipping_fee:  shippingFee,
//       jt_status:        "created",
//       jt_created_at:    new Date().toISOString(),
//       updated_at:       new Date().toISOString(),
//     })
//     .eq("id", techtraOrder.id);

//   if (upErr) throw new Error(`Đã tạo vận đơn J&T ${result.billCode} nhưng lỗi cập nhật DB: ${upErr.message}`);

//   return {
//     billCode: result.billCode,
//     waybillNo: result.waybillNo,
//     trackingUrl: result.trackingUrl,
//     weight: totalWeight,
//     fee: shippingFee,
//   };
// }

// // ════════════════════════════════════════════════════════════════════
// // HUỶ VẬN ĐƠN J&T
// // ════════════════════════════════════════════════════════════════════
// export async function cancelJTOrder(techtraOrder, reason = "Khách hàng yêu cầu huỷ") {
//   if (!techtraOrder.jt_bill_code) {
//     throw new Error("Đơn này chưa có mã vận đơn J&T.");
//   }
//   await loadJTConfig();

//   await jtCancelOrder({
//     txlogisticId: techtraOrder.jt_bill_code,
//     reason,
//   });

//   const { error } = await supabase
//     .from("orders")
//     .update({
//       jt_status:        "cancelled",
//       jt_cancel_reason: reason,
//       jt_last_trace:    { cancelledAt: new Date().toISOString(), reason },
//       updated_at:       new Date().toISOString(),
//     })
//     .eq("id", techtraOrder.id);

//   if (error) throw error;
//   return { success: true };
// }

// // ════════════════════════════════════════════════════════════════════
// // TRA CỨU TRẠNG THÁI VẬN ĐƠN
// // ════════════════════════════════════════════════════════════════════
// export async function traceJTOrder(techtraOrder) {
//   if (!techtraOrder.jt_bill_code) {
//     throw new Error("Đơn này chưa có mã vận đơn J&T.");
//   }
//   await loadJTConfig();

//   const trace = await jtTraceOrder({ txlogisticId: techtraOrder.jt_bill_code });

//   // Map J&T status sang key ngắn
//   const statusKey = mapJTStatusKey(trace?.status || trace?.orderStatus);

//   const { error } = await supabase
//     .from("orders")
//     .update({
//       jt_status:     statusKey,
//       jt_last_trace: trace,
//       updated_at:    new Date().toISOString(),
//     })
//     .eq("id", techtraOrder.id);

//   if (error) throw error;
//   return { status: statusKey, raw: trace };
// }

// // ════════════════════════════════════════════════════════════════════
// // IN NHÃN VẬN ĐƠN J&T (mở PDF nhãn)
// // ════════════════════════════════════════════════════════════════════
// export async function printJTLabel(techtraOrder) {
//   if (!techtraOrder.jt_bill_code) {
//     throw new Error("Đơn này chưa có mã vận đơn J&T.");
//   }
//   await loadJTConfig();

//   const res = await jtPrintOrder({ txlogisticIds: [techtraOrder.jt_bill_code] });

//   if (res.pdfUrl) {
//     window.open(res.pdfUrl, "_blank", "noopener");
//     return { success: true, url: res.pdfUrl };
//   }
//   throw new Error("J&T không trả về URL PDF nhãn.");
// }

// // ════════════════════════════════════════════════════════════════════
// // DECODE jt_status → text VN
// // ════════════════════════════════════════════════════════════════════
// export function formatJTStatus(jtStatus) {
//   const map = {
//     created:   { label: "Đã tạo vận đơn", color: "#1d4ed8", bg: "#dbeafe", icon: "fa-box" },
//     pickup:    { label: "Đã lấy hàng",   color: "#7c3aed", bg: "#ede9fe", icon: "fa-truck-pickup" },
//     transit:   { label: "Đang vận chuyển",color: "#a16207", bg: "#fef3c7", icon: "fa-truck" },
//     delivered: { label: "Đã giao hàng",   color: "#15803d", bg: "#dcfce7", icon: "fa-circle-check" },
//     cancelled: { label: "Đã huỷ",         color: "#b91c1c", bg: "#fee2e2", icon: "fa-ban" },
//     returned:  { label: "Hoàn hàng",      color: "#6b7280", bg: "#f3f4f6", icon: "fa-rotate-left" },
//   };
//   return map[jtStatus] || { label: jtStatus || "Chưa rõ", color: "#6b7280", bg: "#f3f4f6", icon: "fa-circle-question" };
// }

// function mapJTStatusKey(rawStatus) {
//   if (!rawStatus) return "created";
//   const s = String(rawStatus).toLowerCase();
//   if (s.includes("cancel")) return "cancelled";
//   if (s.includes("deliver") || s.includes("complete")) return "delivered";
//   if (s.includes("return")) return "returned";
//   if (s.includes("transit") || s.includes("shipping")) return "transit";
//   if (s.includes("pickup") || s.includes("pick")) return "pickup";
//   if (s.includes("create") || s.includes("accept")) return "created";
//   return "transit"; // mặc định coi như đang vận chuyển
// }

// // ─── Helper: copy text vào clipboard ─────────────────────────────────
// export async function copyToClipboard(text) {
//   try {
//     await navigator.clipboard.writeText(text);
//     return true;
//   } catch {
//     // Fallback cho browser cũ
//     const ta = document.createElement("textarea");
//     ta.value = text;
//     document.body.appendChild(ta);
//     ta.select();
//     try { document.execCommand("copy"); } catch { /* noop */ }
//     document.body.removeChild(ta);
//     return false;
//   }
// }

// =====================================================================
// jtHelpers.js — Helper gọi J&T Express + update orders trong DonHang/
// Gom logic chung để OrderTable / AllOrders / OrderDetailModal cùng dùng.
//
// Luồng:
//   1. loadJTConfig()   — fetch site_settings.jt_config → setJTConfig
//   2. createJTOrder()  — jtCreateOrder + UPDATE orders.jt_*
//   3. cancelJTOrder()  — jtCancelOrder (dùng jt_txlogisticid) + UPDATE jt_status='cancelled'
//   4. traceJTOrder()   — jtTraceOrder (dùng jt_bill_code) + UPDATE jt_status, jt_last_trace
//   5. formatJTStatus() — decode jt_status code sang text VN
//
// LƯU Ý: jstService.js hiện KHÔNG có in nhãn / xem số dư COD (API thật
// J&T VN không công bố các endpoint này trong docs công khai). Nếu J&T
// cấp thêm endpoint, bổ sung vào jstService.js rồi nối lại ở đây.
// =====================================================================

import { supabase } from "../../api";
import {
  jtCreateOrder,
  jtCancelOrder,
  jtTraceOrder,
  jtCalculatePrice,
  setJTConfig,
} from "../../jstService";

const SETTINGS_KEY = "jt_config";

// ─── Cache config trong session để khỏi fetch lại nhiều lần ──────────
let _configCache = null;
let _configLoading = null;

export async function loadJTConfig({ force = false } = {}) {
  if (!force && _configCache) return _configCache;
  if (_configLoading) return _configLoading;

  _configLoading = (async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("value_json")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    if (error) throw error;
    if (data?.value_json) {
      setJTConfig(data.value_json);
      _configCache = data.value_json;
      return data.value_json;
    }
    _configCache = null;
    return null;
  })();

  try {
    return await _configLoading;
  } finally {
    _configLoading = null;
  }
}

export function clearJTConfigCache() {
  _configCache = null;
}

// ─── Tính tổng trọng lượng (kg) từ order_items — API J&T nhận kg ─────
function calcTotalWeightKg(items, fallbackQty = 1) {
  if (!items?.length) return Math.max(0.1, (fallbackQty * 500) / 1000);
  const totalGrams = items.reduce((s, it) => {
    const w = Number(it.weight_grams) || 500; // mặc định 500g/SP
    return s + w * (Number(it.quantity) || 1);
  }, 0);
  return Math.max(0.1, totalGrams / 1000); // tối thiểu 0.1kg
}

// ─── Lấy items cho 1 order (nếu chưa có) ────────────────────────────
export async function fetchOrderItems(orderId) {
  const { data, error } = await supabase
    .from("order_items")
    .select("id, product_name, quantity, unit_price, weight_grams")
    .eq("order_id", orderId);
  if (error) throw error;
  return data || [];
}

// ════════════════════════════════════════════════════════════════════
// TẠO VẬN ĐƠN J&T
// ════════════════════════════════════════════════════════════════════
export async function createJTOrder(techtraOrder, items = null, opts = {}) {
  // 1. Load config (nếu chưa có)
  const cfg = await loadJTConfig();
  if (!cfg) {
    throw new Error(
      "Chưa cấu hình J&T. Vào Cấu hình → J&T Express để nhập eccompanyid/customerid/key trước."
    );
  }

  // 2. Lấy items nếu chưa có
  if (!items) items = await fetchOrderItems(techtraOrder.id);

  // 3. Tính trọng lượng (kg)
  const totalWeightKg = opts.weight || calcTotalWeightKg(items, techtraOrder.total_qty || 1);

  // 4. Tính phí (optional — CẦN ID vùng J&T, không phải tên tỉnh)
  let shippingFee = 0;
  if (opts.calculateFee && opts.regionIds) {
    try {
      const priceRes = await jtCalculatePrice({
        weight: totalWeightKg,
        senderProvId: opts.regionIds.senderProvId,
        senderCityId: opts.regionIds.senderCityId,
        senderAreaId: opts.regionIds.senderAreaId,
        receiverProvId: opts.regionIds.receiverProvId,
        receiverCityId: opts.regionIds.receiverCityId,
        receiverAreaId: opts.regionIds.receiverAreaId,
        goodsvalue: techtraOrder.final_price || 0,
        itemsvalue: techtraOrder.payment_method === "cod" ? techtraOrder.final_price || 0 : 0,
      });
      shippingFee = priceRes.fee || 0;
    } catch (err) {
      console.warn("Không tính được phí J&T:", err.message);
    }
  }

  // 5. Gọi J&T tạo vận đơn
  const txlogisticId = techtraOrder.order_code || `TC${Date.now()}`;
  const isCod = techtraOrder.payment_method === "cod";

  const result = await jtCreateOrder({
    txlogisticId,
    ordertype: 1,

    // Receiver — LƯU Ý: prov/city/area ở đây theo docs J&T là TÊN, không phải ID
    // (chỉ jtCalculatePrice mới cần ID vùng)
    receiverName: techtraOrder.customer_name,
    receiverPhone: techtraOrder.customer_phone,
    receiverAddress: techtraOrder.address,
    receiverProv: techtraOrder.province,
    receiverCity: techtraOrder.district || techtraOrder.province,
    receiverArea: techtraOrder.ward || techtraOrder.district || "",

    paytype: isCod ? "CC_CM" : "PP_PM", // CC_CM: người nhận trả (COD) — XÁC NHẬN LẠI mã đúng với J&T
    itemsvalue: isCod ? Number(techtraOrder.final_price) || 0 : 0,
    goodsvalue: Number(techtraOrder.final_price) || 0,

    items: items.map((it) => ({
      itemname: it.product_name,
      englishName: it.product_name,
      number: String(it.quantity || 1),
      itemvalue: String(it.unit_price || 0),
      desc: "",
    })),

    weight: totalWeightKg,
    remark: opts.remark || techtraOrder.note || "",
  });

  if (!result.success || !result.billCode) {
    throw new Error("J&T trả về lỗi — không có billCode.");
  }

  // 6. UPDATE orders với billCode + txlogisticid + tracking
  const { error: upErr } = await supabase
    .from("orders")
    .update({
      jt_bill_code: result.billCode,
      jt_txlogisticid: txlogisticId, // BẮT BUỘC lưu để dùng cho cancel/update sau này
      jt_tracking_url: `https://jtexpress.vn/tracking?billcode=${result.billCode}`,
      jt_weight_kg: totalWeightKg,
      jt_shipping_fee: shippingFee,
      jt_status: "created",
      jt_created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", techtraOrder.id);

  if (upErr)
    throw new Error(`Đã tạo vận đơn J&T ${result.billCode} nhưng lỗi cập nhật DB: ${upErr.message}`);

  return {
    billCode: result.billCode,
    trackingUrl: `https://jtexpress.vn/tracking?billcode=${result.billCode}`,
    weight: totalWeightKg,
    fee: shippingFee,
  };
}

// ════════════════════════════════════════════════════════════════════
// HUỶ VẬN ĐƠN J&T — cần jt_txlogisticid (mã tự đặt lúc tạo đơn)
// ════════════════════════════════════════════════════════════════════
export async function cancelJTOrder(techtraOrder, reason = "Khách hàng yêu cầu huỷ") {
  if (!techtraOrder.jt_txlogisticid) {
    throw new Error("Đơn này chưa có mã txlogisticid J&T (chưa từng tạo vận đơn qua hệ thống này).");
  }
  await loadJTConfig();

  await jtCancelOrder({
    txlogisticId: techtraOrder.jt_txlogisticid,
    reason,
  });

  const { error } = await supabase
    .from("orders")
    .update({
      jt_status: "cancelled",
      jt_cancel_reason: reason,
      jt_last_trace: { cancelledAt: new Date().toISOString(), reason },
      updated_at: new Date().toISOString(),
    })
    .eq("id", techtraOrder.id);

  if (error) throw error;
  return { success: true };
}

// ════════════════════════════════════════════════════════════════════
// TRA CỨU TRẠNG THÁI VẬN ĐƠN — cần jt_bill_code (mã J&T trả về khi tạo)
// ════════════════════════════════════════════════════════════════════
export async function traceJTOrder(techtraOrder) {
  if (!techtraOrder.jt_bill_code) {
    throw new Error("Đơn này chưa có mã vận đơn (billcode) J&T.");
  }
  await loadJTConfig();

  const trace = await jtTraceOrder({ billCode: techtraOrder.jt_bill_code });

  // Map trạng thái J&T trả về sang key ngắn — CẦN đối chiếu lại với
  // response thật của API TRACKQUERY để map đúng field (vd. trace.status
  // có thể nằm trong trace.data[...] tuỳ cấu trúc response thật)
  const statusKey = mapJTStatusKey(trace?.status || trace?.orderStatus);

  const { error } = await supabase
    .from("orders")
    .update({
      jt_status: statusKey,
      jt_last_trace: trace,
      updated_at: new Date().toISOString(),
    })
    .eq("id", techtraOrder.id);

  if (error) throw error;
  return { status: statusKey, raw: trace };
}

// ════════════════════════════════════════════════════════════════════
// IN NHÃN VẬN ĐƠN — CHƯA CÓ endpoint chính thức trong docs J&T VN
// ════════════════════════════════════════════════════════════════════
export async function printJTLabel(_techtraOrder) {
  throw new Error(
    "Tính năng in nhãn J&T chưa được hỗ trợ — API J&T VN công khai không có endpoint in nhãn. Liên hệ account rep J&T để xin endpoint/print template nếu cần."
  );
}

// ════════════════════════════════════════════════════════════════════
// DECODE jt_status → text VN
// ════════════════════════════════════════════════════════════════════
export function formatJTStatus(jtStatus) {
  const map = {
    created: { label: "Đã tạo vận đơn", color: "#1d4ed8", bg: "#dbeafe", icon: "fa-box" },
    pickup: { label: "Đã lấy hàng", color: "#7c3aed", bg: "#ede9fe", icon: "fa-truck-pickup" },
    transit: { label: "Đang vận chuyển", color: "#a16207", bg: "#fef3c7", icon: "fa-truck" },
    delivered: { label: "Đã giao hàng", color: "#15803d", bg: "#dcfce7", icon: "fa-circle-check" },
    cancelled: { label: "Đã huỷ", color: "#b91c1c", bg: "#fee2e2", icon: "fa-ban" },
    returned: { label: "Hoàn hàng", color: "#6b7280", bg: "#f3f4f6", icon: "fa-rotate-left" },
  };
  return map[jtStatus] || { label: jtStatus || "Chưa rõ", color: "#6b7280", bg: "#f3f4f6", icon: "fa-circle-question" };
}

function mapJTStatusKey(rawStatus) {
  if (!rawStatus) return "created";
  const s = String(rawStatus).toLowerCase();
  if (s.includes("cancel") || s.includes("withdraw")) return "cancelled";
  if (s.includes("deliver") || s.includes("complete")) return "delivered";
  if (s.includes("return")) return "returned";
  if (s.includes("transit") || s.includes("shipping")) return "transit";
  if (s.includes("pickup") || s.includes("pick")) return "pickup";
  if (s.includes("create") || s.includes("accept")) return "created";
  return "transit"; // mặc định coi như đang vận chuyển
}

// ─── Helper: copy text vào clipboard ─────────────────────────────────
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch { /* noop */ }
    document.body.removeChild(ta);
    return false;
  }
}