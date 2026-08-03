// // // =====================================================================
// // // jstService.js — Service gọi J&T Express Open API
// // // Docs: https://open.jtexpress.vn/apiDoc/orderserve/create
// // // Hỗ trợ: tạo vận đơn, huỷ vận đơn, tra cứu, tính phí, lấy danh sách pickup
// // //
// // // Cấu trúc request chuẩn J&T Open Platform:
// // //   URL:    https://openapi.jtexpress.vn/api/<endpoint>
// // //   Method: POST
// // //   Headers: { "Content-Type": "application/json", "apiAccount": "..." }
// // //   Body:    { customerCode, digest (HMAC-SHA256), sign (MD5), ...params }
// // //
// // // Cách ký:
// // //   - sign = MD5(jsonBody + apiKey)               — ký body
// // //   - digest = base64(HMAC-SHA256(paramsSorted, apiKey))  — ký tham số theo thứ tự alphabet
// // // =====================================================================

// // // ─── CONFIG ──────────────────────────────────────────────────────────
// // const JT_CONFIG = {
// //   // VN: dùng sub-domain theo docs của bạn
// //   BASE_URL:  "https://openapi.jtexpress.vn/api",
// //   // Sau khi đăng ký tài khoản developer trên open.jtexpress.vn, lấy 3 giá trị này:
// //   apiAccount:  "",  // Header gửi kèm
// //   apiKey:      "",  // Dùng để ký sign + digest
// //   customerCode: "", // Mã khách hàng (do J&T cấp khi ký hợp đồng)

// //   // Thông tin shop (gửi làm sender)
// //   sender: {
// //     name:    "TECHTRA",
// //     phone:   "0901234567",
// //     address: "Số 1, đường ABC",
// //     city:    "Hồ Chí Minh",
// //     province:"HCM",
// //     area:    "VN",
// //   },

// //   // Mặc định
// //   defaultServiceCode: "01",       // '01' = EZ, '02' = Standard... tuỳ J&T
// //   defaultItemType:    "ITN1",     // loại hàng
// //   countryCode:        "VN",
// // };

// // // ─── Hằng số hữu ích ────────────────────────────────────────────────
// // export const JT_SERVICE = {
// //   EZ:     "01",  // tiết kiệm
// //   STD:    "02",  // tiêu chuẩn
// //   FAST:   "03",  // nhanh
// // };

// // export const JT_PAYER = {
// //   SENDER:    "1",
// //   RECEIVER:  "2",
// //   THIRD_PARTY: "3",
// // };

// // // ─── Helpers: Crypto cho signature ───────────────────────────────────
// // // MD5 thuần JS (RFC 1321) — vì Web Crypto API KHÔNG hỗ trợ MD5
// // // (MD5 bị coi là yếu, chỉ SHA-1/256/384/512 được cung cấp).
// // // J&T API yêu cầu chữ ký MD5 nên cần fallback này.
// // function md5(str) {
// //   function rh(n) {
// //     let j, s = "";
// //     for (j = 0; j <= 3; j++) s += ((n >> (j * 8 + 4)) & 0x0f).toString(16) + ((n >> (j * 8)) & 0x0f).toString(16);
// //     return s;
// //   }
// //   function ad(x, y) {
// //     const l = (x & 0xffff) + (y & 0xffff);
// //     const m = (x >> 16) + (y >> 16) + (l >> 16);
// //     return (m << 16) | (l & 0xffff);
// //   }
// //   function rl(n, c) { return (n << c) | (n >>> (32 - c)); }
// //   function cm(q, a, b, x, s, t) { return ad(rl(ad(ad(a, q), ad(x, t)), s), b); }
// //   function ff(a, b, c, d, x, s, t) { return cm((b & c) | ((~b) & d), a, b, x, s, t); }
// //   function gg(a, b, c, d, x, s, t) { return cm((b & d) | (c & (~d)), a, b, x, s, t); }
// //   function hh(a, b, c, d, x, s, t) { return cm(b ^ c ^ d, a, b, x, s, t); }
// //   function ii(a, b, c, d, x, s, t) { return cm(c ^ (b | (~d)), a, b, x, s, t); }
// //   function sb(s) {
// //     const nblk = ((s.length + 8) >> 6) + 1;
// //     const blks = new Array(nblk * 16);
// //     let i;
// //     for (i = 0; i < nblk * 16; i++) blks[i] = 0;
// //     for (i = 0; i < s.length; i++) blks[i >> 2] |= s.charCodeAt(i) << ((i % 4) * 8);
// //     blks[i >> 2] |= 0x80 << ((i % 4) * 8);
// //     blks[nblk * 16 - 2] = s.length * 8;
// //     return blks;
// //   }
// //   const x = sb(str);
// //   let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
// //   for (let i = 0; i < x.length; i += 16) {
// //     const oa = a, ob = b, oc = c, od = d;
// //     a = ff(a, b, c, d, x[i + 0], 7, -680876936);
// //     d = ff(d, a, b, c, x[i + 1], 12, -389564586);
// //     c = ff(c, d, a, b, x[i + 2], 17, 606105819);
// //     b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
// //     a = ff(a, b, c, d, x[i + 4], 7, -176418897);
// //     d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
// //     c = ff(c, d, a, b, x[i + 6], 17, -1473231341);
// //     b = ff(b, c, d, a, x[i + 7], 22, -45705983);
// //     a = ff(a, b, c, d, x[i + 8], 7, 1770035416);
// //     d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
// //     c = ff(c, d, a, b, x[i + 10], 17, -42063);
// //     b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
// //     a = ff(a, b, c, d, x[i + 12], 7, 1804603682);
// //     d = ff(d, a, b, c, x[i + 13], 12, -40341101);
// //     c = ff(c, d, a, b, x[i + 14], 17, -1502002290);
// //     b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
// //     a = gg(a, b, c, d, x[i + 1], 5, -165796510);
// //     d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
// //     c = gg(c, d, a, b, x[i + 11], 14, 643717713);
// //     b = gg(b, c, d, a, x[i + 0], 20, -373897302);
// //     a = gg(a, b, c, d, x[i + 5], 5, -701558691);
// //     d = gg(d, a, b, c, x[i + 10], 9, 38016083);
// //     c = gg(c, d, a, b, x[i + 15], 14, -660478335);
// //     b = gg(b, c, d, a, x[i + 4], 20, -405537848);
// //     a = gg(a, b, c, d, x[i + 9], 5, 568446438);
// //     d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
// //     c = gg(c, d, a, b, x[i + 3], 14, -187363961);
// //     b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
// //     a = gg(a, b, c, d, x[i + 13], 5, -1444681467);
// //     d = gg(d, a, b, c, x[i + 2], 9, -51403784);
// //     c = gg(c, d, a, b, x[i + 7], 14, 1735328473);
// //     b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
// //     a = hh(a, b, c, d, x[i + 5], 4, -378558);
// //     d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
// //     c = hh(c, d, a, b, x[i + 11], 16, 1839030562);
// //     b = hh(b, c, d, a, x[i + 14], 23, -35309556);
// //     a = hh(a, b, c, d, x[i + 1], 4, -1530992060);
// //     d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
// //     c = hh(c, d, a, b, x[i + 7], 16, -155497632);
// //     b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
// //     a = hh(a, b, c, d, x[i + 13], 4, 681279174);
// //     d = hh(d, a, b, c, x[i + 0], 11, -358537222);
// //     c = hh(c, d, a, b, x[i + 3], 16, -722521979);
// //     b = hh(b, c, d, a, x[i + 6], 23, 76029189);
// //     a = hh(a, b, c, d, x[i + 9], 4, -640364487);
// //     d = hh(d, a, b, c, x[i + 12], 11, -421815835);
// //     c = hh(c, d, a, b, x[i + 15], 16, 530742520);
// //     b = hh(b, c, d, a, x[i + 2], 23, -995338651);
// //     a = ii(a, b, c, d, x[i + 0], 6, -198630844);
// //     d = ii(d, a, b, c, x[i + 7], 10, 1126891415);
// //     c = ii(c, d, a, b, x[i + 14], 15, -1416354905);
// //     b = ii(b, c, d, a, x[i + 5], 21, -57434055);
// //     a = ii(a, b, c, d, x[i + 12], 6, 1700485571);
// //     d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
// //     c = ii(c, d, a, b, x[i + 10], 15, -1051523);
// //     b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
// //     a = ii(a, b, c, d, x[i + 8], 6, 1873313359);
// //     d = ii(d, a, b, c, x[i + 15], 10, -30611744);
// //     c = ii(c, d, a, b, x[i + 6], 15, -1560198380);
// //     b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
// //     a = ii(a, b, c, d, x[i + 4], 6, -145523070);
// //     d = ii(d, a, b, c, x[i + 11], 10, -1120210379);
// //     c = ii(c, d, a, b, x[i + 2], 15, 718787259);
// //     b = ii(b, c, d, a, x[i + 9], 21, -343485551);
// //     a = ad(a, oa); b = ad(b, ob); c = ad(c, oc); d = ad(d, od);
// //   }
// //   return rh(a) + rh(b) + rh(c) + rh(d);
// // }

// // function md5Hex(str) {
// //   return md5(unescape(encodeURIComponent(str)));
// // }

// // async function hmacSha256Base64(message, secret) {
// //   const enc = new TextEncoder();
// //   const keyData = enc.encode(secret);
// //   const key = await crypto.subtle.importKey(
// //     "raw", keyData,
// //     { name: "HMAC", hash: "SHA-256" },
// //     false, ["sign"]
// //   );
// //   const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
// //   // base64
// //   const bytes = new Uint8Array(sig);
// //   let bin = "";
// //   bytes.forEach((b) => (bin += String.fromCharCode(b)));
// //   return btoa(bin);
// // }

// // // ─── Sort object theo key alphabet (cho digest) ──────────────────────
// // function sortedJSONStringify(obj) {
// //   const sorted = {};
// //   Object.keys(obj).sort().forEach((k) => (sorted[k] = obj[k]));
// //   return JSON.stringify(sorted);
// // }

// // // ─── Build signed body theo chuẩn J&T ───────────────────────────────
// // // Quy ước:
// // //   - body.customerCode = JT_CONFIG.customerCode
// // //   - body.digest       = base64(HMAC-SHA256(sortedJSON_no_digest_no_sign, apiKey))
// // //   - body.sign         = MD5(JSON.stringify(body_with_digest) + apiKey)
// // async function buildSignedBody(params) {
// //   const now = new Date().toISOString();

// //   // 1. Tính digest trên tập param đã sort (KHÔNG bao gồm digest & sign)
// //   const sortedStr = sortedJSONStringify(params);
// //   const digest = await hmacSha256Base64(sortedStr, JT_CONFIG.apiKey);

// //   const bodyWithDigest = {
// //     ...params,
// //     digest,
// //   };

// //   // 2. Tính sign = MD5(jsonBody + apiKey)
// //   const sign = await md5Hex(JSON.stringify(bodyWithDigest) + JT_CONFIG.apiKey);

// //   return {
// //     ...bodyWithDigest,
// //     sign,
// //     timestamp: now,
// //   };
// // }

// // // ─── HTTP wrapper ────────────────────────────────────────────────────
// // async function jtFetch(endpoint, body) {
// //   const url = `${JT_CONFIG.BASE_URL}/${endpoint}`;
// //   const res = await fetch(url, {
// //     method: "POST",
// //     headers: {
// //       "Content-Type": "application/json",
// //       "apiAccount": JT_CONFIG.apiAccount,
// //     },
// //     body: JSON.stringify(body),
// //   });

// //   const text = await res.text();
// //   let data;
// //   try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

// //   if (!res.ok || (data.code && data.code !== "1" && data.code !== 1 && data.code !== 200)) {
// //     const msg = data.msg || data.message || data.error || `HTTP ${res.status}`;
// //     throw new Error(`J&T API lỗi [${data.code || res.status}]: ${msg}`);
// //   }
// //   return data;
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // 1. TÍNH PHÍ VẬN CHUYỂN
// // //    Endpoint: price.calculate (hoặc /order/priceCalc tuỳ docs)
// // // ════════════════════════════════════════════════════════════════════════
// // export async function jtCalculatePrice({
// //   weight,        // gram
// //   senderCity,    // "HCM"
// //   receiverCity,  // "HAN"
// //   serviceCode,   // "01" = EZ...
// //   length = 0,    // cm
// //   width  = 0,
// //   height = 0,
// //   isBulky = false,
// // }) {
// //   const params = {
// //     customerCode: JT_CONFIG.customerCode,
// //     serviceType:  serviceCode || JT_CONFIG.defaultServiceCode,
// //     weight:       Math.max(1, Math.round(Number(weight) || 0)),
// //     length, width, height,
// //     senderCity:   senderCity   || JT_CONFIG.sender.province,
// //     receiverCity: receiverCity || "HN",
// //     isBulky: !!isBulky,
// //   };
// //   const body = await buildSignedBody(params);
// //   const res = await jtFetch("price/calculate", body);

// //   // Response: { code, msg, data: { fee, totalFee, ... } }
// //   const fee = res.data?.totalFee || res.data?.fee || res.data?.amount || 0;
// //   return { fee, raw: res };
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // 2. TẠO VẬN ĐƠN (đơn trong nước)
// // //    Endpoint: order.create
// // // ════════════════════════════════════════════════════════════════════════
// // export async function jtCreateOrder({
// //   // Mã nội bộ của bạn (mapping sau này): thường là order_code của Techtra
// //   txlogisticId,         // bill code nội bộ, unique
// //   orderType = 1,        // 1 = bình thường, 2 = đổi, 3 = trả
// //   serviceCode,          // 01/02/03

// //   // Người gửi (mặc định = SHOP)
// //   senderName, senderPhone, senderAddress, senderCity, senderProvince, senderArea = "VN",
// //   // Người nhận
// //   receiverName, receiverPhone, receiverAddress, receiverCity, receiverProvince, receiverArea = "VN",

// //   // Hàng hoá
// //   items = [],           // [{ name, quantity, unitValue, weight? }]
// //   // Khối lượng + kích thước kiện
// //   weight,               // gram
// //   length = 0, width = 0, height = 0,

// //   // Thanh toán
// //   payer = JT_PAYER.RECEIVER,  // 1 sender / 2 receiver / 3 third party
// //   // COD
// //   codAmount = 0,        // số tiền thu hộ (0 = không COD)
// //   // Khác
// //   remark = "",
// //   customerCode,         // optional override
// // }) {
// //   if (!txlogisticId) throw new Error("Thiếu txlogisticId (mã vận đơn nội bộ).");
// //   if (!receiverName || !receiverPhone) throw new Error("Thiếu thông tin người nhận.");

// //   const totalQty = items.reduce((s, it) => s + (parseInt(it.quantity) || 1), 0) || 1;
// //   const totalValue = items.reduce(
// //     (s, it) => s + (Number(it.unitValue) || 0) * (parseInt(it.quantity) || 1),
// //     0
// //   );

// //   const params = {
// //     customerCode: customerCode || JT_CONFIG.customerCode,

// //     // IDs
// //     txlogisticId,
// //     orderType,
// //     serviceType: serviceCode || JT_CONFIG.defaultServiceCode,

// //     // Sender
// //     senderName:    senderName    || JT_CONFIG.sender.name,
// //     senderPhone:   senderPhone   || JT_CONFIG.sender.phone,
// //     senderAddress: senderAddress || JT_CONFIG.sender.address,
// //     senderCity:    senderCity    || JT_CONFIG.sender.city,
// //     senderProvince: senderProvince || JT_CONFIG.sender.province,
// //     senderArea:    senderArea    || JT_CONFIG.sender.area,

// //     // Receiver
// //     receiverName,
// //     receiverPhone,
// //     receiverMobile: receiverPhone,
// //     receiverAddress,
// //     receiverCity,
// //     receiverProvince,
// //     receiverArea,

// //     // Package
// //     weight: Math.max(1, Math.round(Number(weight) || 0)),
// //     length, width, height,
// //     itemType:    JT_CONFIG.defaultItemType,
// //     itemName:    items[0]?.name || "Hàng hóa",
// //     itemQuantity: totalQty,
// //     itemValue:   totalValue || codAmount,
// //     itemsDescription: items.map((i) => `${i.name} x${i.quantity || 1}`).join(", "),

// //     // Money
// //     payer:        String(payer),
// //     codAmount:    Number(codAmount) || 0,
// //     monthlyAccount: JT_CONFIG.customerCode, // số tài khoản cod

// //     remark,
// //     countryCode: JT_CONFIG.countryCode,
// //   };

// //   const body = await buildSignedBody(params);
// //   const res = await jtFetch("order/create", body);

// //   // Response thường: { code: "1", data: { billCode, waybillNo, ... } }
// //   return {
// //     success: true,
// //     billCode: res.data?.billCode || res.data?.waybillNo,
// //     waybillNo: res.data?.waybillNo || res.data?.billCode,
// //     trackingUrl: res.data?.traceUrl || `https://jtexpress.vn/tracking?billcode=${res.data?.billCode || ""}`,
// //     raw: res,
// //   };
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // 2.5. HUỶ VẬN ĐƠN
// // //     Endpoint: order.cancel
// // // ════════════════════════════════════════════════════════════════════════
// // export async function jtCancelOrder({ txlogisticId, reason = "Khách hàng yêu cầu huỷ", customerCode }) {
// //   if (!txlogisticId) throw new Error("Thiếu txlogisticId.");
// //   const params = {
// //     customerCode: customerCode || JT_CONFIG.customerCode,
// //     txlogisticId,
// //     reason,
// //     orderType: 1,
// //   };
// //   const body = await buildSignedBody(params);
// //   const res = await jtFetch("order/cancel", body);
// //   return { success: true, raw: res };
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // 6. SỬA VẬN ĐƠN (đổi địa chỉ / thông tin)
// // //    Endpoint: order.update
// // // ════════════════════════════════════════════════════════════════════════
// // export async function jtUpdateOrder({
// //   txlogisticId,
// //   receiverName, receiverPhone, receiverAddress, receiverCity, receiverProvince,
// //   weight, length, width, height, remark,
// //   customerCode,
// // }) {
// //   if (!txlogisticId) throw new Error("Thiếu txlogisticId.");
// //   const params = {
// //     customerCode: customerCode || JT_CONFIG.customerCode,
// //     txlogisticId,
// //     ...(receiverName    && { receiverName }),
// //     ...(receiverPhone   && { receiverPhone, receiverMobile: receiverPhone }),
// //     ...(receiverAddress && { receiverAddress }),
// //     ...(receiverCity    && { receiverCity }),
// //     ...(receiverProvince && { receiverProvince }),
// //     ...(weight          != null && { weight: Math.max(1, Math.round(Number(weight) || 0)) }),
// //     ...(length != null && { length }),
// //     ...(width  != null && { width }),
// //     ...(height != null && { height }),
// //     ...(remark != null && { remark }),
// //   };
// //   const body = await buildSignedBody(params);
// //   const res = await jtFetch("order/update", body);
// //   return { success: true, raw: res };
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // 7. TRA CỨU VẬN ĐƠN (chi tiết 1 mã)
// // //    Endpoint: order.trace
// // // ════════════════════════════════════════════════════════════════════════
// // export async function jtTraceOrder({ txlogisticId, customerCode }) {
// //   if (!txlogisticId) throw new Error("Thiếu txlogisticId.");
// //   const params = {
// //     customerCode: customerCode || JT_CONFIG.customerCode,
// //     txlogisticId,
// //   };
// //   const body = await buildSignedBody(params);
// //   const res = await jtFetch("order/trace", body);
// //   return res.data || res;
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // 8. IN VẬN ĐƠN J&T (lấy link PDF nhãn vận chuyển)
// // //    Endpoint: order.print
// // // ════════════════════════════════════════════════════════════════════════
// // export async function jtPrintOrder({ txlogisticIds = [], customerCode }) {
// //   if (!txlogisticIds.length) throw new Error("Thiếu danh sách txlogisticIds.");
// //   const params = {
// //     customerCode: customerCode || JT_CONFIG.customerCode,
// //     txlogisticId: txlogisticIds.join(","),
// //   };
// //   const body = await buildSignedBody(params);
// //   const res = await jtFetch("order/print", body);
// //   return {
// //     pdfUrl: res.data?.url || res.data?.pdfUrl,
// //     raw: res,
// //   };
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // 9. LẤY DANH SÁCH ĐƠN (phân trang + lọc theo ngày)
// // //    Endpoint: order.list (hoặc /order/getList tuỳ docs)
// // // ════════════════════════════════════════════════════════════════════════
// // export async function jtListOrders({
// //   startDate,   // "2025-01-01"
// //   endDate,     // "2025-01-31"
// //   status,      // "" | "1" pickup | "2" transit | ...
// //   page = 1,
// //   pageSize = 50,
// //   customerCode,
// // }) {
// //   const params = {
// //     customerCode: customerCode || JT_CONFIG.customerCode,
// //     startDate, endDate,
// //     ...(status && { orderStatus: status }),
// //     page, pageSize,
// //   };
// //   const body = await buildSignedBody(params);
// //   const res = await jtFetch("order/list", body);
// //   return {
// //     list: res.data?.list || res.data?.orders || [],
// //     total: res.data?.total || 0,
// //     raw: res,
// //   };
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // 10. LẤY DANH SÁCH ĐIỂM PICKUP (kho lấy hàng gần shop)
// // //     Endpoint: pickup.list
// // // ════════════════════════════════════════════════════════════════════════
// // export async function jtListPickup({ city, customerCode }) {
// //   const params = {
// //     customerCode: customerCode || JT_CONFIG.customerCode,
// //     ...(city && { city }),
// //   };
// //   const body = await buildSignedBody(params);
// //   const res = await jtFetch("pickup/list", body);
// //   return res.data?.list || res.data || [];
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // 11. ĐĂNG KÝ LỊCH LẤY HÀNG (tạo pickup request)
// // //     Endpoint: pickup.create
// // // ════════════════════════════════════════════════════════════════════════
// // export async function jtCreatePickup({
// //   pickupAddressId,  // ID điểm pickup (lấy từ jtListPickup)
// //   pickupDate,       // "2025-01-15"
// //   pickupTimeFrom,   // "09:00"
// //   pickupTimeTo,     // "12:00"
// //   totalQuantity = 1,
// //   weight = 0,
// //   remark = "",
// //   customerCode,
// // }) {
// //   const params = {
// //     customerCode: customerCode || JT_CONFIG.customerCode,
// //     pickupAddressId,
// //     pickupDate,
// //     pickupTimeFrom,
// //     pickupTimeTo,
// //     totalQuantity,
// //     weight,
// //     remark,
// //   };
// //   const body = await buildSignedBody(params);
// //   const res = await jtFetch("pickup/create", body);
// //   return {
// //     pickupId: res.data?.pickupId,
// //     raw: res,
// //   };
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // 12. HUỶ LỊCH PICKUP
// // //     Endpoint: pickup.cancel
// // // ════════════════════════════════════════════════════════════════════════
// // export async function jtCancelPickup({ pickupId, reason = "", customerCode }) {
// //   const params = {
// //     customerCode: customerCode || JT_CONFIG.customerCode,
// //     pickupId,
// //     reason,
// //   };
// //   const body = await buildSignedBody(params);
// //   const res = await jtFetch("pickup/cancel", body);
// //   return { success: true, raw: res };
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // 13. LẤY DANH SÁCH TỈNH/THÀNH PHỐ
// // //     Endpoint: address.province (hoặc /area/province)
// // // ════════════════════════════════════════════════════════════════════════
// // export async function jtListProvinces({ countryCode = "VN", customerCode }) {
// //   const params = {
// //     customerCode: customerCode || JT_CONFIG.customerCode,
// //     countryCode,
// //   };
// //   const body = await buildSignedBody(params);
// //   const res = await jtFetch("address/province", body);
// //   return res.data?.list || res.data || [];
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // 14. LẤY DANH SÁCH QUẬN/HUYỆN THEO TỈNH
// // //     Endpoint: address.city
// // // ════════════════════════════════════════════════════════════════════════
// // export async function jtListCities({ provinceCode, countryCode = "VN", customerCode }) {
// //   const params = {
// //     customerCode: customerCode || JT_CONFIG.customerCode,
// //     countryCode,
// //     provinceCode,
// //   };
// //   const body = await buildSignedBody(params);
// //   const res = await jtFetch("address/city", body);
// //   return res.data?.list || res.data || [];
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // 15. LẤY DANH SÁCH PHƯỜNG/XÃ THEO QUẬN
// // //     Endpoint: address.area
// // // ════════════════════════════════════════════════════════════════════════
// // export async function jtListAreas({ cityCode, customerCode }) {
// //   const params = {
// //     customerCode: customerCode || JT_CONFIG.customerCode,
// //     cityCode,
// //   };
// //   const body = await buildSignedBody(params);
// //   const res = await jtFetch("address/area", body);
// //   return res.data?.list || res.data || [];
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // 16. ĐĂNG KÝ / CẬP NHẬT ĐỊA CHỈ GỬI (sender address)
// // //     Endpoint: address.create
// // // ════════════════════════════════════════════════════════════════════════
// // export async function jtCreateAddress({
// //   name, phone, address, city, province, area = "VN",
// //   isDefault = false,
// //   customerCode,
// // }) {
// //   const params = {
// //     customerCode: customerCode || JT_CONFIG.customerCode,
// //     name, phone, address, city, province, area,
// //     isDefault: isDefault ? 1 : 0,
// //   };
// //   const body = await buildSignedBody(params);
// //   const res = await jtFetch("address/create", body);
// //   return { addressId: res.data?.addressId, raw: res };
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // 17. XÁC NHẬN ĐÃ THU COD (gọi khi shipper đã thu tiền)
// // //     Endpoint: cod.confirm
// // // ════════════════════════════════════════════════════════════════════════
// // export async function jtConfirmCOD({ txlogisticId, codAmount, customerCode }) {
// //   const params = {
// //     customerCode: customerCode || JT_CONFIG.customerCode,
// //     txlogisticId,
// //     codAmount: Number(codAmount) || 0,
// //   };
// //   const body = await buildSignedBody(params);
// //   const res = await jtFetch("cod/confirm", body);
// //   return { success: true, raw: res };
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // 18. LẤY SỐ DƯ TÀI KHOẢN COD
// // //     Endpoint: account.balance
// // // ════════════════════════════════════════════════════════════════════════
// // export async function jtGetBalance({ customerCode }) {
// //   const params = {
// //     customerCode: customerCode || JT_CONFIG.customerCode,
// //   };
// //   const body = await buildSignedBody(params);
// //   const res = await jtFetch("account/balance", body);
// //   return {
// //     balance: res.data?.balance || 0,
// //     raw: res,
// //   };
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // 19. WEBHOOK: parse payload từ J&T callback
// // //     Hàm này chỉ verify signature (nếu J&T có) và chuẩn hoá data
// // // ════════════════════════════════════════════════════════════════════════
// // export function parseJTWebhook(payload) {
// //   // J&T sẽ POST callback về URL bạn đăng ký khi trạng thái đơn thay đổi
// //   // payload thường: { txlogisticId, status, weight, time, ... }
// //   if (!payload) return null;
// //   return {
// //     billCode:    payload.txlogisticId || payload.billCode,
// //     status:      payload.status,
// //     statusName:  payload.statusName,
// //     scanTime:    payload.time,
// //     weight:      payload.weight,
// //     raw: payload,
// //   };
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // 20. TÍNH PHÍ MOCK (dùng khi chưa có API key — để test UI)
// // // ════════════════════════════════════════════════════════════════════════
// // export async function jtCalculatePriceMock({ weight, serviceCode, isBulky }) {
// //   await new Promise((r) => setTimeout(r, 600));
// //   const base = { "01": 22000, "02": 28000, "03": 35000 };
// //   const w = Number(weight) || 0;
// //   const fee = (base[serviceCode] || 22000) + Math.floor(w / 500) * 3000 + (isBulky ? 15000 : 0);
// //   return { fee, mock: true };
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // 21. SET / GET CONFIG
// // // ════════════════════════════════════════════════════════════════════════
// // export function setJTConfig({ apiAccount, apiKey, customerCode, sender, baseUrl }) {
// //   if (apiAccount)  JT_CONFIG.apiAccount  = apiAccount;
// //   if (apiKey)      JT_CONFIG.apiKey      = apiKey;
// //   if (customerCode) JT_CONFIG.customerCode = customerCode;
// //   if (baseUrl)     JT_CONFIG.BASE_URL    = baseUrl;
// //   if (sender)      JT_CONFIG.sender = { ...JT_CONFIG.sender, ...sender };
// // }

// // export function getJTConfig() {
// //   return { ...JT_CONFIG, apiKey: "***" };
// // }

// // // ─── Backward-compat alias cho code cũ ──────────────────────────────
// // // Code cũ dùng: fetchJTFee / fetchJTFeeMock
// // export const fetchJTFee      = jtCalculatePrice;
// // export const fetchJTFeeMock  = jtCalculatePriceMock;

// // // ─── Helper: dựng tracking URL công khai (không cần API) ──────────────
// // export function buildJTTrackingURL(order) {
// //   const bill = order.order_code || order.billCode || String(order.id || "");
// //   const phone = (order.customer_phone || "").replace(/\D/g, "");
// //   return `https://jtexpress.vn/tracking?billcode=${encodeURIComponent(bill)}&phone=${encodeURIComponent(phone)}`;
// // }

// // // ════════════════════════════════════════════════════════════════════════
// // // DEFAULT EXPORT — gom tất cả
// // // ════════════════════════════════════════════════════════════════════════
// // export default {
// //   // ─── Config ───────────────────────────────────────────────────────
// //   setJTConfig,
// //   getJTConfig,

// //   // ─── Đơn hàng (orders) — 1, 2.5, 6, 7, 8, 9 ──────────────────────
// //   jtCalculatePrice,   // 1
// //   jtCreateOrder,      // 1
// //   jtCancelOrder,      // 2.5
// //   jtUpdateOrder,      // 6
// //   jtTraceOrder,       // 7
// //   jtPrintOrder,       // 8
// //   jtListOrders,       // 9

// //   // ─── Pickup (lấy hàng) — 10, 11, 12 ─────────────────────────────
// //   jtListPickup,       // 10
// //   jtCreatePickup,     // 11
// //   jtCancelPickup,     // 12

// //   // ─── Địa chỉ / vùng — 13, 14, 15, 16 ───────────────────────────
// //   jtListProvinces,    // 13
// //   jtListCities,       // 14
// //   jtListAreas,        // 15
// //   jtCreateAddress,    // 16

// //   // ─── Thanh toán COD & số dư — 17, 18 ───────────────────────────
// //   jtConfirmCOD,       // 17
// //   jtGetBalance,       // 18

// //   // ─── Webhook (đồng bộ trạng thái) — sync ─────────────────────────
// //   parseJTWebhook,

// //   // ─── Mock & tiện ích ─────────────────────────────────────────────
// //   jtCalculatePriceMock,
// //   buildJTTrackingURL,

// //   // ─── Backward-compat (code cũ) ───────────────────────────────────
// //   fetchJTFee,
// //   fetchJTFeeMock,

// //   // ─── Enums / hằng số ─────────────────────────────────────────────
// //   JT_SERVICE,
// //   JT_PAYER,
// // };


// // =====================================================================
// // jstService.js — Service gọi J&T Express VN API (yuenan-interface-web)
// // Docs: https://api-docs.jtexpress.vn/
// //
// // CHUẨN THẬT của J&T VN (KHÁC hoàn toàn bản REST/JSON trước đây):
// //   - Method: POST, Content-Type: multipart/form-data
// //   - 4 field bắt buộc mọi API: logistics_interface, data_digest, msg_type, eccompanyid
// //   - logistics_interface: JSON stringify các tham số nghiệp vụ
// //   - data_digest = base64( md5_hex( logistics_interface + key ) )
// //   - key: do J&T cấp riêng cho từng tài khoản (KHÔNG phải apiKey kiểu HMAC)
// //   - Base URL TEST: http://47.57.106.86/yuenan-interface-web
// //     (URL production sẽ do J&T cấp sau khi test xong — hỏi account rep)
// // =====================================================================

// // ─── CONFIG ──────────────────────────────────────────────────────────
// const JT_CONFIG = {
//   // Test theo docs. Khi lên production, J&T sẽ cấp domain/IP khác — thay ở đây.
//   BASE_URL: "http://47.57.106.86/yuenan-interface-web",

//   // Lấy 3 giá trị này từ J&T khi ký hợp đồng / đăng ký test:
//   eccompanyid: "",       // Tên nguồn khách (VD: "CUSMODEL")
//   customerid: "",        // Mã khách hàng (VD: "084LC012345")
//   key: "",                // Key dùng để tạo data_digest (MD5+Base64)

//   logisticproviderid: "JNT",

//   // Thông tin shop (gửi làm sender mặc định)
//   sender: {
//     name: "TECHTRA",
//     phone: "0901234567",
//     mobile: "0901234567",
//     prov: "Hồ Chí Minh",
//     city: "",
//     area: "",
//     address: "Số 1, đường ABC",
//   },
// };

// export const JT_PRODUCT_TYPE = {
//   EZ: "EZ",
// };

// // ─── MD5 thuần JS (RFC 1321) ─────────────────────────────────────────
// // Web Crypto API không hỗ trợ MD5, nhưng J&T bắt buộc dùng MD5 nên cần fallback.
// function md5(str) {
//   function rh(n){let j,s="";for(j=0;j<=3;j++)s+=((n>>(j*8+4))&0x0f).toString(16)+((n>>(j*8))&0x0f).toString(16);return s;}
//   function ad(x,y){const l=(x&0xffff)+(y&0xffff);const m=(x>>16)+(y>>16)+(l>>16);return(m<<16)|(l&0xffff);}
//   function rl(n,c){return(n<<c)|(n>>>(32-c));}
//   function cm(q,a,b,x,s,t){return ad(rl(ad(ad(a,q),ad(x,t)),s),b);}
//   function ff(a,b,c,d,x,s,t){return cm((b&c)|((~b)&d),a,b,x,s,t);}
//   function gg(a,b,c,d,x,s,t){return cm((b&d)|(c&(~d)),a,b,x,s,t);}
//   function hh(a,b,c,d,x,s,t){return cm(b^c^d,a,b,x,s,t);}
//   function ii(a,b,c,d,x,s,t){return cm(c^(b|(~d)),a,b,x,s,t);}
//   function sb(s){const nblk=((s.length+8)>>6)+1;const blks=new Array(nblk*16);let i;for(i=0;i<nblk*16;i++)blks[i]=0;for(i=0;i<s.length;i++)blks[i>>2]|=s.charCodeAt(i)<<((i%4)*8);blks[i>>2]|=0x80<<((i%4)*8);blks[nblk*16-2]=s.length*8;return blks;}
//   const x=sb(str);let a=1732584193,b=-271733879,c=-1732584194,d=271733878;
//   for(let i=0;i<x.length;i+=16){const oa=a,ob=b,oc=c,od=d;
//     a=ff(a,b,c,d,x[i+0],7,-680876936);d=ff(d,a,b,c,x[i+1],12,-389564586);c=ff(c,d,a,b,x[i+2],17,606105819);b=ff(b,c,d,a,x[i+3],22,-1044525330);
//     a=ff(a,b,c,d,x[i+4],7,-176418897);d=ff(d,a,b,c,x[i+5],12,1200080426);c=ff(c,d,a,b,x[i+6],17,-1473231341);b=ff(b,c,d,a,x[i+7],22,-45705983);
//     a=ff(a,b,c,d,x[i+8],7,1770035416);d=ff(d,a,b,c,x[i+9],12,-1958414417);c=ff(c,d,a,b,x[i+10],17,-42063);b=ff(b,c,d,a,x[i+11],22,-1990404162);
//     a=ff(a,b,c,d,x[i+12],7,1804603682);d=ff(d,a,b,c,x[i+13],12,-40341101);c=ff(c,d,a,b,x[i+14],17,-1502002290);b=ff(b,c,d,a,x[i+15],22,1236535329);
//     a=gg(a,b,c,d,x[i+1],5,-165796510);d=gg(d,a,b,c,x[i+6],9,-1069501632);c=gg(c,d,a,b,x[i+11],14,643717713);b=gg(b,c,d,a,x[i+0],20,-373897302);
//     a=gg(a,b,c,d,x[i+5],5,-701558691);d=gg(d,a,b,c,x[i+10],9,38016083);c=gg(c,d,a,b,x[i+15],14,-660478335);b=gg(b,c,d,a,x[i+4],20,-405537848);
//     a=gg(a,b,c,d,x[i+9],5,568446438);d=gg(d,a,b,c,x[i+14],9,-1019803690);c=gg(c,d,a,b,x[i+3],14,-187363961);b=gg(b,c,d,a,x[i+8],20,1163531501);
//     a=gg(a,b,c,d,x[i+13],5,-1444681467);d=gg(d,a,b,c,x[i+2],9,-51403784);c=gg(c,d,a,b,x[i+7],14,1735328473);b=gg(b,c,d,a,x[i+12],20,-1926607734);
//     a=hh(a,b,c,d,x[i+5],4,-378558);d=hh(d,a,b,c,x[i+8],11,-2022574463);c=hh(c,d,a,b,x[i+11],16,1839030562);b=hh(b,c,d,a,x[i+14],23,-35309556);
//     a=hh(a,b,c,d,x[i+1],4,-1530992060);d=hh(d,a,b,c,x[i+4],11,1272893353);c=hh(c,d,a,b,x[i+7],16,-155497632);b=hh(b,c,d,a,x[i+10],23,-1094730640);
//     a=hh(a,b,c,d,x[i+13],4,681279174);d=hh(d,a,b,c,x[i+0],11,-358537222);c=hh(c,d,a,b,x[i+3],16,-722521979);b=hh(b,c,d,a,x[i+6],23,76029189);
//     a=hh(a,b,c,d,x[i+9],4,-640364487);d=hh(d,a,b,c,x[i+12],11,-421815835);c=hh(c,d,a,b,x[i+15],16,530742520);b=hh(b,c,d,a,x[i+2],23,-995338651);
//     a=ii(a,b,c,d,x[i+0],6,-198630844);d=ii(d,a,b,c,x[i+7],10,1126891415);c=ii(c,d,a,b,x[i+14],15,-1416354905);b=ii(b,c,d,a,x[i+5],21,-57434055);
//     a=ii(a,b,c,d,x[i+12],6,1700485571);d=ii(d,a,b,c,x[i+3],10,-1894986606);c=ii(c,d,a,b,x[i+10],15,-1051523);b=ii(b,c,d,a,x[i+1],21,-2054922799);
//     a=ii(a,b,c,d,x[i+8],6,1873313359);d=ii(d,a,b,c,x[i+15],10,-30611744);c=ii(c,d,a,b,x[i+6],15,-1560198380);b=ii(b,c,d,a,x[i+13],21,1309151649);
//     a=ii(a,b,c,d,x[i+4],6,-145523070);d=ii(d,a,b,c,x[i+11],10,-1120210379);c=ii(c,d,a,b,x[i+2],15,718787259);b=ii(b,c,d,a,x[i+9],21,-343485551);
//     a=ad(a,oa);b=ad(b,ob);c=ad(c,oc);d=ad(d,od);}
//   return rh(a)+rh(b)+rh(c)+rh(d);
// }
// function md5Hex(str) { return md5(unescape(encodeURIComponent(str))); }

// // base64 an toàn cho chuỗi UTF-8 (vd. tiếng Việt có dấu trong logistics_interface)
// function base64FromString(str) {
//   return btoa(unescape(encodeURIComponent(str)));
// }

// // ─── Tạo data_digest: base64( md5_hex(logistics_interface + key) ) ──
// function buildDataDigest(logisticsInterfaceStr) {
//   const hex = md5Hex(logisticsInterfaceStr + JT_CONFIG.key);
//   return base64FromString(hex);
// }

// // ─── HTTP wrapper: gửi multipart/form-data ──────────────────────────
// async function jtFetch(path, payload, msgType) {
//   if (!JT_CONFIG.key || !JT_CONFIG.eccompanyid) {
//     throw new Error("Chưa cấu hình JT_CONFIG (eccompanyid/customerid/key) — gọi setJTConfig() trước.");
//   }
//   const logisticsInterface = JSON.stringify(payload);
//   const dataDigest = buildDataDigest(logisticsInterface);

//   const form = new FormData();
//   form.append("logistics_interface", logisticsInterface);
//   form.append("data_digest", dataDigest);
//   form.append("msg_type", msgType);
//   form.append("eccompanyid", JT_CONFIG.eccompanyid);

//   const url = `${JT_CONFIG.BASE_URL}${path}`;
//   const res = await fetch(url, { method: "POST", body: form });
//   const text = await res.text();
//   let data;
//   try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

//   const item = data?.responseitems?.[0];
//   if (item && item.success === "false") {
//     throw new Error(`J&T API lỗi [${item.reason || "?"}]`);
//   }
//   if (!res.ok) throw new Error(`HTTP ${res.status}`);
//   return data;
// }

// // ════════════════════════════════════════════════════════════════════
// // 1. TẠO VẬN ĐƠN — msg_type: ORDERCREATE
// //    Endpoint: /order/orderAction!createOrder.action
// // ════════════════════════════════════════════════════════════════════
// export async function jtCreateOrder({
//   txlogisticId,           // mã đơn nội bộ, unique — BẮT BUỘC
//   ordertype = 1,
//   servicetype = 1,
//   senderName, senderPhone, senderProv, senderCity, senderArea, senderAddress,
//   receiverName, receiverPhone, receiverProv, receiverCity, receiverArea, receiverAddress,
//   paytype = "PP_PM",      // PP_PM: người gửi trả trước; đổi tuỳ chính sách COD
//   itemsvalue = 0,          // giá trị COD thu hộ
//   goodsvalue = 0,          // giá trị hàng hoá khai báo
//   isInsured = "0",
//   items = [],              // [{ itemname, englishName, number, itemvalue, desc }]
//   weight,                  // kg
//   volume = 0,
//   remark = "",
// }) {
//   if (!txlogisticId) throw new Error("Thiếu txlogisticId.");
//   if (!receiverName || !receiverPhone) throw new Error("Thiếu thông tin người nhận.");

//   const now = new Date().toISOString().slice(0, 19).replace("T", " ");

//   const payload = {
//     eccompanyid: JT_CONFIG.eccompanyid,
//     customerid: JT_CONFIG.customerid,
//     txlogisticid: txlogisticId,
//     ordertype,
//     servicetype,
//     partsign: "0",
//     sender: {
//       name: senderName || JT_CONFIG.sender.name,
//       phone: senderPhone || JT_CONFIG.sender.phone,
//       mobile: senderPhone || JT_CONFIG.sender.mobile,
//       prov: senderProv || JT_CONFIG.sender.prov,
//       city: senderCity || JT_CONFIG.sender.city,
//       area: senderArea || JT_CONFIG.sender.area,
//       address: senderAddress || JT_CONFIG.sender.address,
//     },
//     receiver: {
//       name: receiverName,
//       phone: receiverPhone,
//       mobile: receiverPhone,
//       prov: receiverProv,
//       city: receiverCity,
//       area: receiverArea,
//       address: receiverAddress,
//     },
//     createordertime: now,
//     sendstarttime: now,
//     sendendtime: now,
//     paytype,
//     itemsvalue: String(itemsvalue),
//     goodsvalue: String(goodsvalue),
//     isInsured: String(isInsured),
//     items: items.length
//       ? items
//       : [{ itemname: "Hàng hóa", englishName: "Goods", number: "1", itemvalue: String(goodsvalue || 1000), desc: "" }],
//     weight: String(weight ?? 1),
//     volume: String(volume),
//     remark,
//   };

//   const res = await jtFetch("/order/orderAction!createOrder.action", payload, "ORDERCREATE");
//   const item = res?.responseitems?.[0] || {};
//   return {
//     success: item.success === "true",
//     billCode: item.billcode,
//     dispatchSite: item.dispatchSite,
//     raw: res,
//   };
// }

// // ════════════════════════════════════════════════════════════════════
// // 2. HUỶ VẬN ĐƠN — msg_type: UPDATE, fieldname="status", fieldvalue="WITHDRAW"
// //    Endpoint: /order/orderAction!createOrder.action (dùng chung với tạo đơn)
// // ════════════════════════════════════════════════════════════════════
// export async function jtCancelOrder({ txlogisticId, reason = "Khách hàng yêu cầu huỷ" }) {
//   if (!txlogisticId) throw new Error("Thiếu txlogisticId.");
//   const payload = {
//     eccompanyid: JT_CONFIG.eccompanyid,
//     customerid: JT_CONFIG.customerid,
//     logisticproviderid: JT_CONFIG.logisticproviderid,
//     txlogisticid: txlogisticId,
//     fieldlist: [{ txlogisticid: txlogisticId, fieldname: "status", fieldvalue: "WITHDRAW", remark: reason }],
//   };
//   const res = await jtFetch("/order/orderAction!createOrder.action", payload, "UPDATE");
//   return { success: true, raw: res };
// }

// // ════════════════════════════════════════════════════════════════════
// // 3. SỬA VẬN ĐƠN (vd. đổi cân nặng) — msg_type: UPDATE
// // ════════════════════════════════════════════════════════════════════
// export async function jtUpdateOrder({ txlogisticId, weight, remark = "" }) {
//   if (!txlogisticId) throw new Error("Thiếu txlogisticId.");
//   const fieldlist = [];
//   if (weight != null) fieldlist.push({ txlogisticid: txlogisticId, fieldname: "weight", fieldvalue: String(weight), remark });
//   const payload = {
//     eccompanyid: JT_CONFIG.eccompanyid,
//     customerid: JT_CONFIG.customerid,
//     logisticproviderid: JT_CONFIG.logisticproviderid,
//     txlogisticid: txlogisticId,
//     fieldlist,
//   };
//   const res = await jtFetch("/order/orderAction!createOrder.action", payload, "UPDATE");
//   return { success: true, raw: res };
// }

// // ════════════════════════════════════════════════════════════════════
// // 4. TRA CỨU HÀNH TRÌNH — msg_type: TRACKQUERY
// //    Endpoint: /standart/trackAction!trackForJson.action
// // ════════════════════════════════════════════════════════════════════
// export async function jtTraceOrder({ billCode, lang = "vn" }) {
//   if (!billCode) throw new Error("Thiếu billCode.");
//   const payload = {
//     eccompanyid: JT_CONFIG.eccompanyid,
//     billcode: billCode,
//     lang,
//   };
//   const res = await jtFetch("/standart/trackAction!trackForJson.action", payload, "TRACKQUERY");
//   return res;
// }

// // ════════════════════════════════════════════════════════════════════
// // 5. TÍNH PHÍ VẬN CHUYỂN — msg_type: FREIGHTQUERY
// //    Endpoint: /jtpos/inquiry!freight.action
// // ════════════════════════════════════════════════════════════════════
// export async function jtCalculatePrice({
//   weight,               // kg
//   senderProvId, senderCityId, senderAreaId,     // ID vùng theo J&T (KHÔNG phải tên)
//   receiverProvId, receiverCityId, receiverAreaId,
//   goodsvalue = 0,
//   itemsvalue = 0,
//   producttype = JT_PRODUCT_TYPE.EZ,
// }) {
//   const payload = {
//     selfAddress: 1,
//     cusname: JT_CONFIG.customerid,
//     goodsvalue: String(goodsvalue),
//     itemsvalue: String(itemsvalue),
//     weight: String(weight ?? 1),
//     sender: { prov: String(senderProvId), city: String(senderCityId), area: String(senderAreaId) },
//     receiver: { prov: String(receiverProvId), city: String(receiverCityId), area: String(receiverAreaId) },
//     feetype: "CHARGE",
//     producttype,
//   };
//   const res = await jtFetch("/jtpos/inquiry!freight.action", payload, "FREIGHTQUERY");
//   return { fee: res?.fee ?? res, raw: res };
// }

// // ════════════════════════════════════════════════════════════════════
// // 6. TRA SỐ DƯ TÀI KHOẢN — J&T VN hiện KHÔNG công bố API này trong docs
// //    Đây là bản MOCK để dùng tạm cho UI. Khi J&T cấp endpoint thật,
// //    thay logic bên trong bằng lời gọi jtFetch(...) tương tự các hàm trên.
// // ════════════════════════════════════════════════════════════════════
// export async function jtGetBalance() {
//   await new Promise((r) => setTimeout(r, 400));
//   return {
//     balance: 0,
//     currency: "VND",
//     mock: true,
//     note: "J&T chưa cung cấp API tra số dư công khai — cần liên hệ bộ phận kỹ thuật J&T để có endpoint thật.",
//   };
// }
// // ════════════════════════════════════════════════════════════════════
// // MOCK — dùng khi chưa có tài khoản/key thật để test UI
// // ════════════════════════════════════════════════════════════════════
// export async function jtCalculatePriceMock({ weight, isBulky }) {
//   await new Promise((r) => setTimeout(r, 500));
//   const w = Number(weight) || 1;
//   const fee = 22000 + Math.floor(w) * 3000 + (isBulky ? 15000 : 0);
//   return { fee, mock: true };
// }

// // ─── CONFIG SETTERS ──────────────────────────────────────────────────
// export function setJTConfig({ eccompanyid, customerid, key, sender, baseUrl, logisticproviderid }) {
//   if (eccompanyid) JT_CONFIG.eccompanyid = eccompanyid;
//   if (customerid) JT_CONFIG.customerid = customerid;
//   if (key) JT_CONFIG.key = key;
//   if (baseUrl) JT_CONFIG.BASE_URL = baseUrl;
//   if (logisticproviderid) JT_CONFIG.logisticproviderid = logisticproviderid;
//   if (sender) JT_CONFIG.sender = { ...JT_CONFIG.sender, ...sender };
// }
// export function getJTConfig() {
//   return { ...JT_CONFIG, key: "***" };
// }

// // ─── Backward-compat alias ───────────────────────────────────────────
// export const fetchJTFee = jtCalculatePrice;
// export const fetchJTFeeMock = jtCalculatePriceMock;

// // export default {
// //   setJTConfig, getJTConfig,
// //   jtCreateOrder, jtCancelOrder, jtUpdateOrder, jtTraceOrder, jtCalculatePrice,
// //   jtCalculatePriceMock, fetchJTFee, fetchJTFeeMock,
// //   JT_PRODUCT_TYPE,
// // };
// export default {
//   setJTConfig, getJTConfig,
//   jtCreateOrder, jtCancelOrder, jtUpdateOrder, jtTraceOrder, jtCalculatePrice,
//   jtCalculatePriceMock, jtGetBalance, fetchJTFee, fetchJTFeeMock,
//   JT_PRODUCT_TYPE,
// };

// =====================================================================
// jstService.js — Service gọi J&T Express VN API (yuenan-interface-web)
// Docs chính thức: https://api-docs.jtexpress.vn/
//
// Chuẩn J&T VN:
//   - Method: POST, Content-Type: multipart/form-data
//   - 4 field bắt buộc mọi API: logistics_interface, data_digest, msg_type, eccompanyid
//   - logistics_interface: JSON.stringify() các tham số nghiệp vụ
//   - data_digest = base64( md5_hex( logistics_interface + key ) )
//   - key: J&T cấp riêng cho từng tài khoản (KHÔNG phải kiểu HMAC/apiKey)
//   - Base URL TEST: http://47.57.106.86/yuenan-interface-web
//     (URL production do J&T cấp sau khi test xong — hỏi account rep)
// =====================================================================

// ─── CONFIG ──────────────────────────────────────────────────────────
const JT_CONFIG = {
  // Test theo docs. Khi lên production, J&T sẽ cấp domain/IP khác — thay ở đây.
  BASE_URL: "http://47.57.106.86/yuenan-interface-web",

  // Lấy 3 giá trị này từ J&T khi ký hợp đồng / đăng ký test:
  eccompanyid: "", // Tên nguồn khách (VD: "CUSMODEL")
  customerid: "", // Mã khách hàng (VD: "084LC012345")
  key: "", // Key dùng để tạo data_digest (MD5+Base64)

  logisticproviderid: "JNT",

  // Thông tin shop (gửi làm sender mặc định)
  sender: {
    name: "TECHTRA",
    phone: "0901234567",
    mobile: "0901234567",
    prov: "Hồ Chí Minh",
    city: "",
    area: "",
    address: "Số 1, đường ABC",
  },
};

// Loại dịch vụ (producttype) dùng trong API tính phí (FREIGHTQUERY).
// XÁC NHẬN LẠI với J&T account rep các mã dịch vụ khác ngoài EZ nếu cần
// (VD: bản UI của bạn có "J&T Fast", "J&T Super" — cần map đúng mã J&T cấp).
export const JT_PRODUCT_TYPE = {
  EZ: "EZ",
};

// Alias để tương thích ngược với code cũ dùng tên JT_SERVICE (Settings.jsx)
export const JT_SERVICE = JT_PRODUCT_TYPE;

// ─── MD5 thuần JS (RFC 1321) ─────────────────────────────────────────
// Web Crypto API không hỗ trợ MD5, nhưng J&T bắt buộc dùng MD5 nên cần fallback.
function md5(str) {
  function rh(n) { let j, s = ""; for (j = 0; j <= 3; j++) s += ((n >> (j * 8 + 4)) & 0x0f).toString(16) + ((n >> (j * 8)) & 0x0f).toString(16); return s; }
  function ad(x, y) { const l = (x & 0xffff) + (y & 0xffff); const m = (x >> 16) + (y >> 16) + (l >> 16); return (m << 16) | (l & 0xffff); }
  function rl(n, c) { return (n << c) | (n >>> (32 - c)); }
  function cm(q, a, b, x, s, t) { return ad(rl(ad(ad(a, q), ad(x, t)), s), b); }
  function ff(a, b, c, d, x, s, t) { return cm((b & c) | ((~b) & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cm((b & d) | (c & (~d)), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cm(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cm(c ^ (b | (~d)), a, b, x, s, t); }
  function sb(s) {
    const nblk = ((s.length + 8) >> 6) + 1;
    const blks = new Array(nblk * 16);
    let i;
    for (i = 0; i < nblk * 16; i++) blks[i] = 0;
    for (i = 0; i < s.length; i++) blks[i >> 2] |= s.charCodeAt(i) << ((i % 4) * 8);
    blks[i >> 2] |= 0x80 << ((i % 4) * 8);
    blks[nblk * 16 - 2] = s.length * 8;
    return blks;
  }
  const x = sb(str);
  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < x.length; i += 16) {
    const oa = a, ob = b, oc = c, od = d;
    a = ff(a, b, c, d, x[i + 0], 7, -680876936); d = ff(d, a, b, c, x[i + 1], 12, -389564586); c = ff(c, d, a, b, x[i + 2], 17, 606105819); b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = ff(a, b, c, d, x[i + 4], 7, -176418897); d = ff(d, a, b, c, x[i + 5], 12, 1200080426); c = ff(c, d, a, b, x[i + 6], 17, -1473231341); b = ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = ff(a, b, c, d, x[i + 8], 7, 1770035416); d = ff(d, a, b, c, x[i + 9], 12, -1958414417); c = ff(c, d, a, b, x[i + 10], 17, -42063); b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = ff(a, b, c, d, x[i + 12], 7, 1804603682); d = ff(d, a, b, c, x[i + 13], 12, -40341101); c = ff(c, d, a, b, x[i + 14], 17, -1502002290); b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
    a = gg(a, b, c, d, x[i + 1], 5, -165796510); d = gg(d, a, b, c, x[i + 6], 9, -1069501632); c = gg(c, d, a, b, x[i + 11], 14, 643717713); b = gg(b, c, d, a, x[i + 0], 20, -373897302);
    a = gg(a, b, c, d, x[i + 5], 5, -701558691); d = gg(d, a, b, c, x[i + 10], 9, 38016083); c = gg(c, d, a, b, x[i + 15], 14, -660478335); b = gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = gg(a, b, c, d, x[i + 9], 5, 568446438); d = gg(d, a, b, c, x[i + 14], 9, -1019803690); c = gg(c, d, a, b, x[i + 3], 14, -187363961); b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = gg(a, b, c, d, x[i + 13], 5, -1444681467); d = gg(d, a, b, c, x[i + 2], 9, -51403784); c = gg(c, d, a, b, x[i + 7], 14, 1735328473); b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
    a = hh(a, b, c, d, x[i + 5], 4, -378558); d = hh(d, a, b, c, x[i + 8], 11, -2022574463); c = hh(c, d, a, b, x[i + 11], 16, 1839030562); b = hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = hh(a, b, c, d, x[i + 1], 4, -1530992060); d = hh(d, a, b, c, x[i + 4], 11, 1272893353); c = hh(c, d, a, b, x[i + 7], 16, -155497632); b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = hh(a, b, c, d, x[i + 13], 4, 681279174); d = hh(d, a, b, c, x[i + 0], 11, -358537222); c = hh(c, d, a, b, x[i + 3], 16, -722521979); b = hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = hh(a, b, c, d, x[i + 9], 4, -640364487); d = hh(d, a, b, c, x[i + 12], 11, -421815835); c = hh(c, d, a, b, x[i + 15], 16, 530742520); b = hh(b, c, d, a, x[i + 2], 23, -995338651);
    a = ii(a, b, c, d, x[i + 0], 6, -198630844); d = ii(d, a, b, c, x[i + 7], 10, 1126891415); c = ii(c, d, a, b, x[i + 14], 15, -1416354905); b = ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = ii(a, b, c, d, x[i + 12], 6, 1700485571); d = ii(d, a, b, c, x[i + 3], 10, -1894986606); c = ii(c, d, a, b, x[i + 10], 15, -1051523); b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = ii(a, b, c, d, x[i + 8], 6, 1873313359); d = ii(d, a, b, c, x[i + 15], 10, -30611744); c = ii(c, d, a, b, x[i + 6], 15, -1560198380); b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = ii(a, b, c, d, x[i + 4], 6, -145523070); d = ii(d, a, b, c, x[i + 11], 10, -1120210379); c = ii(c, d, a, b, x[i + 2], 15, 718787259); b = ii(b, c, d, a, x[i + 9], 21, -343485551);
    a = ad(a, oa); b = ad(b, ob); c = ad(c, oc); d = ad(d, od);
  }
  return rh(a) + rh(b) + rh(c) + rh(d);
}
function md5Hex(str) { return md5(unescape(encodeURIComponent(str))); }

// base64 an toàn cho chuỗi UTF-8 (vd. tiếng Việt có dấu trong logistics_interface)
function base64FromString(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

// ─── Tạo data_digest: base64( md5_hex(logistics_interface + key) ) ──
function buildDataDigest(logisticsInterfaceStr) {
  const hex = md5Hex(logisticsInterfaceStr + JT_CONFIG.key);
  return base64FromString(hex);
}

// ─── HTTP wrapper: gửi multipart/form-data ──────────────────────────
async function jtFetch(path, payload, msgType) {
  if (!JT_CONFIG.key || !JT_CONFIG.eccompanyid) {
    throw new Error("Chưa cấu hình JT_CONFIG (eccompanyid/customerid/key) — gọi setJTConfig() trước.");
  }
  const logisticsInterface = JSON.stringify(payload);
  const dataDigest = buildDataDigest(logisticsInterface);

  const form = new FormData();
  form.append("logistics_interface", logisticsInterface);
  form.append("data_digest", dataDigest);
  form.append("msg_type", msgType);
  form.append("eccompanyid", JT_CONFIG.eccompanyid);

  const url = `${JT_CONFIG.BASE_URL}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  let res;
  try {
    res = await fetch(url, { method: "POST", body: form, signal: controller.signal });
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    if (fetchErr.name === 'AbortError') {
      throw new Error('Kết nối đến J&T hết thời gian chờ (10s). Vui lòng kiểm tra cấu hình môi trường test hoặc mạng.');
    }
    throw new Error('Lỗi kết nối J&T: ' + fetchErr.message);
  }
  clearTimeout(timeoutId);

  // Check lỗi HTTP/network TRƯỚC khi đọc nội dung response,
  // tránh trường hợp res.ok=false nhưng vẫn cố đọc responseitems.
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  const item = data?.responseitems?.[0];
  if (item && item.success === "false") {
    throw new Error(`J&T API lỗi [${item.reason || "?"}]`);
  }
  return data;
}

// ════════════════════════════════════════════════════════════════════
// 1. TẠO VẬN ĐƠN — msg_type: ORDERCREATE
//    Endpoint: /order/orderAction!createOrder.action
// ════════════════════════════════════════════════════════════════════
export async function jtCreateOrder({
  txlogisticId, // mã đơn nội bộ, unique — BẮT BUỘC
  ordertype = 1,
  servicetype = 1,
  senderName, senderPhone, senderProv, senderCity, senderArea, senderAddress,
  receiverName, receiverPhone, receiverProv, receiverCity, receiverArea, receiverAddress,
  paytype = "PP_PM", // PP_PM: người gửi trả trước; đổi tuỳ chính sách COD
  itemsvalue = 0, // giá trị COD thu hộ
  goodsvalue = 0, // giá trị hàng hoá khai báo
  isInsured = "0",
  items = [], // [{ itemname, englishName, number, itemvalue, desc }]
  weight, // kg
  volume = 0,
  remark = "",
}) {
  if (!txlogisticId) throw new Error("Thiếu txlogisticId.");
  if (!receiverName || !receiverPhone) throw new Error("Thiếu thông tin người nhận.");

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  const payload = {
    eccompanyid: JT_CONFIG.eccompanyid,
    customerid: JT_CONFIG.customerid,
    logisticproviderid: JT_CONFIG.logisticproviderid,
    txlogisticid: txlogisticId,
    ordertype,
    servicetype,
    partsign: "0",
    sender: {
      name: senderName || JT_CONFIG.sender.name,
      phone: senderPhone || JT_CONFIG.sender.phone,
      mobile: senderPhone || JT_CONFIG.sender.mobile,
      prov: senderProv || JT_CONFIG.sender.prov,
      city: senderCity || JT_CONFIG.sender.city,
      area: senderArea || JT_CONFIG.sender.area,
      address: senderAddress || JT_CONFIG.sender.address,
    },
    receiver: {
      name: receiverName,
      phone: receiverPhone,
      mobile: receiverPhone,
      prov: receiverProv,
      city: receiverCity,
      area: receiverArea,
      address: receiverAddress,
    },
    createordertime: now,
    sendstarttime: now,
    sendendtime: now,
    paytype,
    itemsvalue: String(itemsvalue),
    goodsvalue: String(goodsvalue),
    isInsured: String(isInsured),
    items: items.length
      ? items
      : [{ itemname: "Hàng hóa", englishName: "Goods", number: "1", itemvalue: String(goodsvalue || 1000), desc: "" }],
    weight: String(weight ?? 1),
    volume: String(volume),
    remark,
  };

  const res = await jtFetch("/order/orderAction!createOrder.action", payload, "ORDERCREATE");
  const item = res?.responseitems?.[0] || {};
  return {
    success: item.success === "true",
    billCode: item.billcode,
    dispatchSite: item.dispatchSite,
    raw: res,
  };
}

// ════════════════════════════════════════════════════════════════════
// 2. HUỶ VẬN ĐƠN — msg_type: UPDATE, fieldname="status", fieldvalue="WITHDRAW"
//    Endpoint: /order/orderAction!createOrder.action (dùng chung với tạo đơn)
// ════════════════════════════════════════════════════════════════════
export async function jtCancelOrder({ txlogisticId, reason = "Khách hàng yêu cầu huỷ" }) {
  if (!txlogisticId) throw new Error("Thiếu txlogisticId.");
  const payload = {
    eccompanyid: JT_CONFIG.eccompanyid,
    customerid: JT_CONFIG.customerid,
    logisticproviderid: JT_CONFIG.logisticproviderid,
    txlogisticid: txlogisticId,
    fieldlist: [{ txlogisticid: txlogisticId, fieldname: "status", fieldvalue: "WITHDRAW", remark: reason }],
  };
  const res = await jtFetch("/order/orderAction!createOrder.action", payload, "UPDATE");
  return { success: true, raw: res };
}

// ════════════════════════════════════════════════════════════════════
// 3. SỬA VẬN ĐƠN (vd. đổi cân nặng) — msg_type: UPDATE
// ════════════════════════════════════════════════════════════════════
export async function jtUpdateOrder({ txlogisticId, weight, remark = "" }) {
  if (!txlogisticId) throw new Error("Thiếu txlogisticId.");
  const fieldlist = [];
  if (weight != null) fieldlist.push({ txlogisticid: txlogisticId, fieldname: "weight", fieldvalue: String(weight), remark });
  const payload = {
    eccompanyid: JT_CONFIG.eccompanyid,
    customerid: JT_CONFIG.customerid,
    logisticproviderid: JT_CONFIG.logisticproviderid,
    txlogisticid: txlogisticId,
    fieldlist,
  };
  const res = await jtFetch("/order/orderAction!createOrder.action", payload, "UPDATE");
  return { success: true, raw: res };
}

// ════════════════════════════════════════════════════════════════════
// 4. TRA CỨU HÀNH TRÌNH — msg_type: TRACKQUERY
//    Endpoint: /standart/trackAction!trackForJson.action
// ════════════════════════════════════════════════════════════════════
export async function jtTraceOrder({ billCode, lang = "vn" }) {
  if (!billCode) throw new Error("Thiếu billCode.");
  const payload = {
    eccompanyid: JT_CONFIG.eccompanyid,
    billcode: billCode,
    lang,
  };
  const res = await jtFetch("/standart/trackAction!trackForJson.action", payload, "TRACKQUERY");
  return res;
}

// ════════════════════════════════════════════════════════════════════
// 5. TÍNH PHÍ VẬN CHUYỂN — msg_type: FREIGHTQUERY
//    Endpoint: /jtpos/inquiry!freight.action
// ════════════════════════════════════════════════════════════════════
export async function jtCalculatePrice({
  weight, // kg
  senderProvId, senderCityId, senderAreaId, // ID vùng theo J&T (KHÔNG phải tên)
  receiverProvId, receiverCityId, receiverAreaId,
  goodsvalue = 0,
  itemsvalue = 0,
  producttype = JT_PRODUCT_TYPE.EZ,
}) {
  const payload = {
    selfAddress: 1,
    cusname: JT_CONFIG.customerid,
    goodsvalue: String(goodsvalue),
    itemsvalue: String(itemsvalue),
    weight: String(weight ?? 1),
    sender: { prov: String(senderProvId), city: String(senderCityId), area: String(senderAreaId) },
    receiver: { prov: String(receiverProvId), city: String(receiverCityId), area: String(receiverAreaId) },
    feetype: "CHARGE",
    producttype,
  };
  const res = await jtFetch("/jtpos/inquiry!freight.action", payload, "FREIGHTQUERY");

  // SỬA BUG: trước đây `fee: res?.fee ?? res` — nếu response không có field `fee`
  // ở top-level thì trả nguyên object làm fee → UI render ra "[object Object]".
  // Giờ thử các vị trí field phổ biến, luôn trả về number, không bao giờ trả object.
  const item = res?.responseitems?.[0];
  const rawFee = res?.fee ?? item?.fee ?? item?.freight ?? item?.total ?? 0;
  const fee = Number(rawFee) || 0;

  return { fee, raw: res };
}

// ════════════════════════════════════════════════════════════════════
// 6. TRA SỐ DƯ TÀI KHOẢN — J&T VN hiện KHÔNG công bố API này trong docs công khai.
//    Đây là bản MOCK để dùng tạm cho UI ("Test kết nối"). Khi J&T cấp endpoint
//    thật, thay logic bên trong bằng lời gọi jtFetch(...) tương tự các hàm trên.
//    LƯU Ý: vì là mock, nút "Test kết nối" hiện không thực sự xác minh apiKey/key
//    đúng hay sai — nó luôn trả về thành công. Cân nhắc test bằng jtCalculatePrice
//    với dữ liệu mẫu nếu cần verify key thật.
// ════════════════════════════════════════════════════════════════════
export async function jtGetBalance() {
  await new Promise((r) => setTimeout(r, 400));
  return {
    balance: 0,
    currency: "VND",
    mock: true,
    note: "J&T chưa cung cấp API tra số dư công khai — cần liên hệ bộ phận kỹ thuật J&T để có endpoint thật.",
  };
}

// ════════════════════════════════════════════════════════════════════
// MOCK — dùng khi chưa có tài khoản/key thật để test UI
// ════════════════════════════════════════════════════════════════════
export async function jtCalculatePriceMock({ weight, isBulky }) {
  await new Promise((r) => setTimeout(r, 500));
  const w = Number(weight) || 1;
  const fee = 22000 + Math.floor(w) * 3000 + (isBulky ? 15000 : 0);
  return { fee, mock: true };
}

// ─── CONFIG SETTERS ──────────────────────────────────────────────────
export function setJTConfig({ eccompanyid, customerid, key, sender, baseUrl, logisticproviderid }) {
  if (eccompanyid) JT_CONFIG.eccompanyid = eccompanyid;
  if (customerid) JT_CONFIG.customerid = customerid;
  if (key) JT_CONFIG.key = key;
  if (baseUrl) JT_CONFIG.BASE_URL = baseUrl;
  if (logisticproviderid) JT_CONFIG.logisticproviderid = logisticproviderid;
  if (sender) JT_CONFIG.sender = { ...JT_CONFIG.sender, ...sender };
}
export function getJTConfig() {
  return { ...JT_CONFIG, key: "***" };
}

// ─── Backward-compat alias ───────────────────────────────────────────
export const fetchJTFee = jtCalculatePrice;
export const fetchJTFeeMock = jtCalculatePriceMock;

export default {
  setJTConfig, getJTConfig,
  jtCreateOrder, jtCancelOrder, jtUpdateOrder, jtTraceOrder, jtCalculatePrice,
  jtCalculatePriceMock, jtGetBalance, fetchJTFee, fetchJTFeeMock,
  JT_PRODUCT_TYPE, JT_SERVICE,
};