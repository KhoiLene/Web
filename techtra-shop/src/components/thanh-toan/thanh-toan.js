// import { supabase } from "../api-service/api.js";

// (function () {
//   const CART_KEY = "techtra_cart";
//   const BUY_NOW_KEY = "techtra_buynow";

//   const SHIPPING_FREE_THRESHOLD = 500000;
//   const SHIPPING_DEFAULT_FEE = 20000;

//   const $stepPanel1 = document.getElementById("stepPanel1");
//   const $stepPanel2 = document.getElementById("stepPanel2");
//   const $stepPanel3 = document.getElementById("stepPanel3");

//   const $receiverForm = document.getElementById("receiverForm");

//   const $toStep2Btn = document.getElementById("toStep2Btn");
//   const $toStep3Btn = document.getElementById("toStep3Btn");

//   const $backToStep1Btn = document.getElementById("backToStep1Btn");
//   const $backToStep2Btn = document.getElementById("backToStep2Btn");

//   const $placeOrderBtn = document.getElementById("placeOrderBtn");

//   const $receiverMessage = document.getElementById("receiverMessage");
//   const $checkoutMessage = document.getElementById("checkoutMessage");

//   const $voucherCode = document.getElementById("voucherCode");
//   const $applyVoucherBtn = document.getElementById("applyVoucherBtn");
//   const $voucherMessage = document.getElementById("voucherMessage");

//   const $receiverName = document.getElementById("receiverName");
//   const $receiverPhone = document.getElementById("receiverPhone");
//   const $receiverEmail = document.getElementById("receiverEmail");

//   // select-field-v3
//   const $provinceDropdown = document.getElementById("provinceDropdown");
//   const $districtDropdown = document.getElementById("districtDropdown");
//   const $wardDropdown = document.getElementById("wardDropdown");
//   const $receiverAddressLine = document.getElementById("receiverAddressLine");

//   const $receiverProvinceSearch = document.getElementById("receiverProvinceSearch");
//   const $receiverDistrictSearch = document.getElementById("receiverDistrictSearch");
//   const $receiverWardSearch = document.getElementById("receiverWardSearch");

//   const $confirmName = document.getElementById("confirmName");
//   const $confirmPhone = document.getElementById("confirmPhone");
//   const $confirmEmail = document.getElementById("confirmEmail");
//   const $confirmAddress = document.getElementById("confirmAddress");

//   const $sumSubtotal = document.getElementById("sumSubtotal");
//   const $sumShipping = document.getElementById("sumShipping");
//   const $sumDiscount = document.getElementById("sumDiscount");
//   const $sumFinal = document.getElementById("sumFinal");
//   const $sumPayment = document.getElementById("sumPayment");

//   const $asideCartList = document.getElementById("asideCartList");
//   const $asideSubtotal = document.getElementById("asideSubtotal");
//   const $asideShipping = document.getElementById("asideShipping");
//   const $asideDiscount = document.getElementById("asideDiscount");
//   const $asideFinal = document.getElementById("asideFinal");

//   const $ordersMount = document.getElementById("ordersMount");
//   const $ordersEmpty = document.getElementById("ordersEmpty");

//   const $stepper = document.querySelectorAll(".step[data-step]");

//   function formatVND(n) {
//     const num = Number(n || 0);
//     return num.toLocaleString("vi-VN") + " đ";
//   }

//   function getCartFromKeys() {
//     // ưu tiên buynow (Mua ngay) nếu có, fallback cart.
//     const fromBuyNow = (() => {
//       try {
//         return JSON.parse(localStorage.getItem(BUY_NOW_KEY) || "null");
//       } catch {
//         return null;
//       }
//     })();

//     if (Array.isArray(fromBuyNow) && fromBuyNow.length) return fromBuyNow;

//     try {
//       return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
//     } catch {
//       return [];
//     }
//   }

//   function normalizeItem(item) {
//     return {
//       id: item.id,
//       name: item.name,
//       slug: item.slug,
//       image: item.image,
//       price: Number(item.price || 0),
//       quantity: Number(item.quantity || 1),
//     };
//   }

//   function calcTotals(items, voucher) {
//     const normalized = items.map(normalizeItem);
//     const subtotal = normalized.reduce((s, it) => s + it.price * it.quantity, 0);

//     const shipping = subtotal >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_DEFAULT_FEE;

//     let discount = 0;
//     if (voucher && voucher.discount_type) {
//       if (voucher.discount_type === "percent") {
//         discount = Math.round(subtotal * (Number(voucher.discount_value || 0) / 100));
//       } else {
//         discount = Number(voucher.discount_value || 0);
//       }
//       if (voucher.max_discount != null) discount = Math.min(discount, Number(voucher.max_discount));
//       if (voucher.min_order != null && subtotal < Number(voucher.min_order)) discount = 0;
//     }

//     if (discount > subtotal) discount = subtotal;

//     const final = subtotal + shipping - discount;
//     return { subtotal, shipping, discount, final };
//   }

//   const STEP_STORAGE_KEY = "techtra_checkout_step";

//   function setActiveStep(step) {
//     $stepPanel1.style. = step === 1 ? "block" : "none";
//     $stepPanel2.style. = step === 2 ? "block" : "none";
//     $stepPanel3.style. = step === 3 ? "block" : "none";

//     $stepper.forEach((el) => {
//       el.dataset.active = String(el.getAttribute("data-step") === String(step));
//     });
//   }

//   function setCurrentStep(step) {
//     const s = Number(step);
//     if (![1, 2, 3].includes(s)) return;
//     sessionStorage.setItem(STEP_STORAGE_KEY, String(s));
//     setActiveStep(s);
//   }

//   function restoreStepFromStorage() {
//     const raw = sessionStorage.getItem(STEP_STORAGE_KEY);
//     const s = raw ? Number(raw) : 1;
//     if (![1, 2, 3].includes(s)) return 1;
//     return s;
//   }

//   let cart = [];
//   let currentVoucher = null;

//   function renderAsideCart() {
//     if (!cart.length) {
//       $asideCartList.innerHTML = "";
//       $asideSubtotal.textContent = formatVND(0);
//       $asideShipping.textContent = formatVND(0);
//       $asideDiscount.textContent = formatVND(0);
//       $asideFinal.textContent = formatVND(0);
//       return;
//     }

//     $asideCartList.innerHTML = cart
//       .map((it) => {
//         const img = it.image || "https://placehold.co/96x96?text=SP";
//         return `
//           <div class="aside-item">
//             <img src="${img}" alt="${it.name || "SP"}" />
//             <div>
//               <strong>${it.name || "Sản phẩm"}</strong>
//               <span>${it.quantity} x ${formatVND(it.price)}</span>
//             </div>
//           </div>
//         `;
//       })
//       .join("");

//     const totals = calcTotals(cart, currentVoucher);
//     $asideSubtotal.textContent = formatVND(totals.subtotal);
//     $asideShipping.textContent = formatVND(totals.shipping);
//     $asideDiscount.textContent = formatVND(totals.discount);
//     $asideFinal.textContent = formatVND(totals.final);
//   }

//   function renderConfirm() {
//     $confirmName.textContent = $receiverName.value.trim() || "—";
//     $confirmPhone.textContent = $receiverPhone.value.trim() || "—";
//     $confirmEmail.textContent = $receiverEmail.value.trim() || "—";
//     $confirmAddress.textContent = getAddressString() || "—";

//     const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || "COD";
//     $sumPayment.textContent = paymentMethod === "COD" ? "COD" : "Chuyển khoản";

//     const totals = calcTotals(cart, currentVoucher);
//     $sumSubtotal.textContent = formatVND(totals.subtotal);
//     $sumShipping.textContent = formatVND(totals.shipping);
//     $sumDiscount.textContent = formatVND(totals.discount);
//     $sumFinal.textContent = formatVND(totals.final);
//   }

//   async function loadVoucherByCode(code) {
//     if (!code) return null;
//     const trimmed = String(code).trim();
//     if (!trimmed) return null;

//     const { data, error } = await supabase
//       .from("v_active_vouchers")
//       .select("*")
//       .eq("code", trimmed)
//       .maybeSingle();

//     if (error) throw error;
//     return data || null;
//   }

//   async function applyVoucher() {
//     const code = $voucherCode.value;
//     $voucherMessage.textContent = "Đang kiểm tra...";

//     try {
//       const voucher = await loadVoucherByCode(code);
//       if (!voucher) {
//         currentVoucher = null;
//         $voucherMessage.textContent = "Voucher không hợp lệ hoặc đã hết hạn.";
//         renderAsideCart();
//         return;
//       }

//       currentVoucher = {
//         discount_type: voucher.discount_type,
//         discount_value: voucher.discount_value,
//         min_order: voucher.min_order,
//         max_discount: voucher.max_discount,
//       };

//       $voucherMessage.textContent = "Áp dụng thành công.";
//       renderAsideCart();
//     } catch (err) {
//       console.error(err);
//       currentVoucher = null;
//       $voucherMessage.textContent = "Có lỗi khi áp dụng voucher.";
//     }
//   }

//   // Region state (chỉ dùng bộ 3 biến này làm nguồn sự thật; UI thực tế là
//   // select-field-v3 với input tìm kiếm + dropdown, không còn <select> nữa).
//   let regionProvinceCode = null;
//   let regionDistrictCode = null;
//   let regionWardCode = null;

//   function getAddressString() {
//     const provinceName = $receiverProvinceSearch.value.trim();
//     const districtName = $receiverDistrictSearch.value.trim();
//     const wardName = $receiverWardSearch.value.trim();
//     const line = $receiverAddressLine.value.trim();

//     return [line, wardName, districtName, provinceName].filter(Boolean).join(", ");
//   }

//   function validateStep1() {
//     const name = $receiverName.value.trim();
//     const phone = $receiverPhone.value.trim();
//     const line = $receiverAddressLine.value.trim();

//     if (!name) return "Vui lòng nhập họ tên.";
//     if (!phone || phone.length < 8) return "Vui lòng nhập số điện thoại hợp lệ.";
//     if (!regionProvinceCode) return "Vui lòng chọn tỉnh/thành.";
//     if (!regionDistrictCode) return "Vui lòng chọn quận/huyện.";
//     if (!regionWardCode) return "Vui lòng chọn phường/xã.";
//     if (!line) return "Vui lòng nhập số nhà / đường.";
//     return null;
//   }

//   // ─────────────────────────────────────────────
//   // provinces.open-api.vn (cascade endpoints)
//   // ─────────────────────────────────────────────
//   const OPEN_API_BASE = "https://provinces.open-api.vn/api";

//   async function loadAllProvincesSelect() {
//     const res = await fetch(`${OPEN_API_BASE}/p/`);
//     const json = await res.json();
//     return (json || [])
//       .map((p) => ({ code: String(p.code ?? ""), name: String(p.name ?? "") }))
//       .filter((p) => p.code && p.name);
//   }

//   async function loadDistrictsSelect(provinceCode) {
//     const res = await fetch(`${OPEN_API_BASE}/p/${encodeURIComponent(provinceCode)}?depth=2`);
//     const json = await res.json();
//     const districts = json?.districts || json?.data?.districts || json || [];
//     return (districts || [])
//       .map((d) => ({
//         code: String(d.code ?? d.codename ?? ""),
//         name: String(d.name ?? d.district_name ?? d.division_name ?? ""),
//       }))
//       .filter((d) => d.code && d.name);
//   }

//   async function loadWardsSelect(districtCode) {
//     const res = await fetch(`${OPEN_API_BASE}/d/${encodeURIComponent(districtCode)}?depth=2`);
//     const json = await res.json();
//     const wards = json?.wards || json?.data?.wards || json || [];
//     return (wards || [])
//       .map((w) => ({
//         code: String(w.code ?? w.codename ?? ""),
//         name: String(w.name ?? w.ward_name ?? w.division_name ?? ""),
//       }))
//       .filter((w) => w.code && w.name);
//   }

//   let provincesCache = [];
//   let districtsCache = [];
//   let wardsCache = [];

//   async function initRegionSelect() {
//     // UI dùng select-field-v3 (input + dropdown div), chọn item bằng click.

//     function closeAllDropdowns() {
//       $provinceDropdown.style. = "none";
//       $districtDropdown.style. = "none";
//       $wardDropdown.style. = "none";
//     }

//     function openDropdown($dd) {
//       closeAllDropdowns();
//       $dd.style. = "block";
//     }

//     function filterItems(items, q) {
//       const query = String(q || "").toLowerCase().trim();
//       if (!query) return items || [];
//       return (items || []).filter((it) => String(it.name || "").toLowerCase().includes(query));
//     }

//     function renderItems($dd, items, onPick) {
//       const safeItems = items || [];
//       if (!safeItems.length) {
//         $dd.innerHTML = `<div class="select-field-v3__item is-empty">Không có kết quả</div>`;
//         return;
//       }
//       $dd.innerHTML = safeItems
//         .map(
//           (it) => `
//           <div class="select-field-v3__item" data-code="${it.code}">
//             ${String(it.name || "")}
//           </div>
//         `
//         )
//         .join("");

//       $dd.querySelectorAll(".select-field-v3__item").forEach((el) => {
//         el.addEventListener("click", () => {
//           const code = el.getAttribute("data-code");
//           const picked = safeItems.find((x) => String(x.code) === String(code));
//           if (!picked) return;
//           onPick(picked);
//         });
//       });
//     }

//     let localProvinceCode = null;
//     let localDistrictCode = null;
//     let localWardCode = null;

//     $receiverDistrictSearch.disabled = true;
//     $receiverWardSearch.disabled = true;

//     // load provinces
//     provincesCache = await loadAllProvincesSelect();
//     $receiverProvinceSearch.disabled = false;

//     // close khi click ngoài
//     document.addEventListener("click", (e) => {
//       const t = e.target;
//       if (t.closest(".select-field-v3__control")) return;
//       closeAllDropdowns();
//     });

//     // Dùng named handlers + { once:true } / removeEventListener để tránh
//     // đăng ký listener chồng chất mỗi lần đổi tỉnh/quận.
//     let districtFocusHandler = null;
//     let districtInputHandler = null;
//     let wardFocusHandler = null;
//     let wardInputHandler = null;

//     $receiverProvinceSearch.addEventListener("focus", () => {
//       openDropdown($provinceDropdown);
//       renderItems($provinceDropdown, filterItems(provincesCache, $receiverProvinceSearch.value), (picked) => {
//         localProvinceCode = picked.code;
//         regionProvinceCode = picked.code;
//         $receiverProvinceSearch.value = picked.name;
//         closeAllDropdowns();
//         initDistrictFlow();
//       });
//     });

//     $receiverProvinceSearch.addEventListener("input", async () => {
//       openDropdown($provinceDropdown);
//       renderItems($provinceDropdown, filterItems(provincesCache, $receiverProvinceSearch.value), (picked) => {
//         localProvinceCode = picked.code;
//         regionProvinceCode = picked.code;
//         $receiverProvinceSearch.value = picked.name;
//         closeAllDropdowns();
//         initDistrictFlow();
//       });

//       const q = String($receiverProvinceSearch.value || "").toLowerCase().trim();
//       const exact = (provincesCache || []).find((it) => String(it.name || "").toLowerCase() === q);
//       if (exact) {
//         localProvinceCode = exact.code;
//         regionProvinceCode = exact.code;
//         $receiverProvinceSearch.value = exact.name;
//         closeAllDropdowns();
//         await initDistrictFlow();
//       }
//     });

//     async function initDistrictFlow() {
//       if (!localProvinceCode) return;
//       $receiverDistrictSearch.disabled = false;
//       $receiverWardSearch.disabled = true;
//       regionDistrictCode = null;
//       regionWardCode = null;
//       localDistrictCode = null;
//       localWardCode = null;

//       $receiverDistrictSearch.value = "";
//       $receiverWardSearch.value = "";
//       $districtDropdown.style. = "none";
//       $wardDropdown.style. = "none";

//       districtsCache = await loadDistrictsSelect(localProvinceCode);

//       $receiverDistrictSearch.focus();

//       if (districtFocusHandler) $receiverDistrictSearch.removeEventListener("focus", districtFocusHandler);
//       if (districtInputHandler) $receiverDistrictSearch.removeEventListener("input", districtInputHandler);

//       districtFocusHandler = () => {
//         openDropdown($districtDropdown);
//         renderItems($districtDropdown, filterItems(districtsCache, $receiverDistrictSearch.value), (picked) => {
//           localDistrictCode = picked.code;
//           regionDistrictCode = picked.code;
//           $receiverDistrictSearch.value = picked.name;
//           closeAllDropdowns();
//           initWardFlow();
//         });
//       };
//       districtInputHandler = () => {
//         openDropdown($districtDropdown);
//         renderItems($districtDropdown, filterItems(districtsCache, $receiverDistrictSearch.value), (picked) => {
//           localDistrictCode = picked.code;
//           regionDistrictCode = picked.code;
//           $receiverDistrictSearch.value = picked.name;
//           closeAllDropdowns();
//           initWardFlow();
//         });
//       };

//       $receiverDistrictSearch.addEventListener("focus", districtFocusHandler);
//       $receiverDistrictSearch.addEventListener("input", districtInputHandler);

//       const q = String($receiverDistrictSearch.value || "").toLowerCase().trim();
//       const exact = (districtsCache || []).find((it) => String(it.name || "").toLowerCase() === q);
//       if (exact) {
//         localDistrictCode = exact.code;
//         regionDistrictCode = exact.code;
//         $receiverDistrictSearch.value = exact.name;
//         closeAllDropdowns();
//         await initWardFlow();
//       }
//     }

//     async function initWardFlow() {
//       if (!localDistrictCode) return;
//       $receiverWardSearch.disabled = false;
//       $receiverWardSearch.value = "";
//       wardsCache = await loadWardsSelect(localDistrictCode);

//       if (wardFocusHandler) $receiverWardSearch.removeEventListener("focus", wardFocusHandler);
//       if (wardInputHandler) $receiverWardSearch.removeEventListener("input", wardInputHandler);

//       wardFocusHandler = () => {
//         openDropdown($wardDropdown);
//         renderItems($wardDropdown, filterItems(wardsCache, $receiverWardSearch.value), (picked) => {
//           localWardCode = picked.code;
//           regionWardCode = picked.code;
//           $receiverWardSearch.value = picked.name;
//           closeAllDropdowns();
//         });
//       };
//       wardInputHandler = () => {
//         openDropdown($wardDropdown);
//         renderItems($wardDropdown, filterItems(wardsCache, $receiverWardSearch.value), (picked) => {
//           localWardCode = picked.code;
//           regionWardCode = picked.code;
//           $receiverWardSearch.value = picked.name;
//           closeAllDropdowns();
//         });
//       };

//       $receiverWardSearch.addEventListener("focus", wardFocusHandler);
//       $receiverWardSearch.addEventListener("input", wardInputHandler);

//       const q = String($receiverWardSearch.value || "").toLowerCase().trim();
//       const exact = (wardsCache || []).find((it) => String(it.name || "").toLowerCase() === q);
//       if (exact) {
//         localWardCode = exact.code;
//         regionWardCode = exact.code;
//         $receiverWardSearch.value = exact.name;
//         closeAllDropdowns();
//       }
//     }
//   }

//   async function loadCustomerProfileIfLoggedIn() {
//     const customerIdRaw = localStorage.getItem("techtra_customer_id");
//     const customerId = customerIdRaw ? Number(customerIdRaw) : null;
//     if (!customerId) return;

//     const { data, error } = await supabase
//       .from("customers")
//       .select("name,phone,email,address")
//       .eq("id", customerId)
//       .single();

//     if (error) return;
//     if (!data) return;

//     $receiverName.value = data.name || "";
//     $receiverPhone.value = data.phone || "";
//     $receiverEmail.value = data.email || "";
//     // Backward: nếu address đang lưu format tự do, mình nhét vào line address.
//     $receiverAddressLine.value = data.address || "";
//   }

//   async function loadOrdersPreview() {
//     const customerIdRaw = localStorage.getItem("techtra_customer_id");
//     const customerId = customerIdRaw ? Number(customerIdRaw) : null;
//     if (!customerId) {
//       $ordersEmpty.style. = "block";
//       return;
//     }

//     const { data, error } = await supabase
//       .from("v_orders_full")
//       .select("order_code,final_price,status,created_at")
//       .eq("customer_id", customerId)
//       .order("created_at", { ascending: false })
//       .limit(8);

//     if (error) {
//       console.warn("loadOrdersPreview error", error);
//       return;
//     }

//     const list = data || [];
//     if (!list.length) {
//       $ordersEmpty.style. = "block";
//       return;
//     }

//     $ordersEmpty.style. = "none";
//     $ordersMount.innerHTML = list
//       .map(
//         (o) => `
//           <div class="history-item">
//             <strong>${o.order_code}</strong>
//             <span>${o.status} • ${formatVND(o.final_price)} • ${formatDateVN(o.created_at)}</span>
//           </div>
//         `
//       )
//       .join("");
//   }

//   async function placeOrder() {
//     $checkoutMessage.textContent = "";

//     if (!cart.length) {
//       $checkoutMessage.textContent = "Giỏ hàng đang trống.";
//       return;
//     }

//     const receiverValidation = validateStep1();
//     if (receiverValidation) {
//       setActiveStep(1);
//       $checkoutMessage.textContent = receiverValidation;
//       return;
//     }

//     const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || "COD";
//     const voucherCode = ($voucherCode.value || "").trim() || null;

//     const customerIdRaw = localStorage.getItem("techtra_customer_id");
//     const customerId = customerIdRaw ? Number(customerIdRaw) : null;

//     const totals = calcTotals(cart, currentVoucher);

//     try {
//       // Create order
//       // const insertPayload = {
//       //   customer_id: customerId,
//       //   receiver_name: $receiverName.value.trim(),
//       //   receiver_phone: $receiverPhone.value.trim(),
//       //   receiver_email: $receiverEmail.value.trim() || null,
//       //   receiver_address: getAddressString(),
//       //   shipping_fee: totals.shipping,
//       //   subtotal_price: totals.subtotal,
//       //   discount_price: totals.discount,
//       //   final_price: totals.final,
//       //   payment_method: paymentMethod,
//       //   voucher_code: voucherCode,
//       //   status: "PENDING",
//       // };
//       const insertPayload = {
//   customer_id: customerId,
//   receiver_name: $receiverName.value.trim(),
//   receiver_phone: $receiverPhone.value.trim(),
//   receiver_email: $receiverEmail.value.trim() || null,
//   receiver_address: getAddressString(), // giữ lại chuỗi gộp cho tương thích ngược
//   receiver_address_line: $receiverAddressLine.value.trim(),
//   receiver_ward: $receiverWardSearch.value.trim() || null,
//   receiver_district: $receiverDistrictSearch.value.trim() || null,
//   receiver_province: $receiverProvinceSearch.value.trim() || null,
//   shipping_fee: totals.shipping,
//   subtotal_price: totals.subtotal,
//   discount_price: totals.discount,
//   final_price: totals.final,
//   payment_method: paymentMethod,
//   voucher_code: voucherCode,
//   status: "PENDING",
// };

//       // Khi DB chưa khớp schema, supabase insert sẽ fail; nhưng ta vẫn cố gắng theo naming phổ biến.
//       const { data: orderData, error: orderError } = await supabase
//         .from("orders")
//         .insert(insertPayload)
//         .select()
//         .single();

//       if (orderError) throw orderError;

//       const orderId = orderData?.id;
//       const orderCode = orderData?.order_code || orderData?.code || orderData?.id;

//       if (!orderId) throw new Error("Không lấy được id đơn hàng.");

//       // Create order items
//       const itemsPayload = cart.map((it) => ({
//         order_id: orderId,
//         product_id: it.id,
//         product_name: it.name,
//         unit_price: it.price,
//         quantity: it.quantity,
//         line_total: it.price * it.quantity,
//       }));

//       const { error: itemsError } = await supabase.from("order_items").insert(itemsPayload);
//       if (itemsError) throw itemsError;

//       // Clear local buynow/cart
//       localStorage.removeItem(BUY_NOW_KEY);
//       if (localStorage.getItem(CART_KEY)) {
//         // Nếu thanh toán từ giỏ thì xoá giỏ; còn nếu từ buynow thì chỉ xoá buynow.
//         localStorage.removeItem(CART_KEY);
//       }

//       $checkoutMessage.innerHTML = `Đặt hàng thành công. Mã đơn: <strong>${orderCode}</strong>`;
//       setActiveStep(3);

//       // Update history preview
//       await loadOrdersPreview();

//       // Optional redirect to thank-you page could go here.
//     } catch (err) {
//       console.error(err);
//       $checkoutMessage.textContent = err?.message || "Đặt hàng thất bại.";
//     }
//   }

//   // Events
//   $applyVoucherBtn?.addEventListener("click", applyVoucher);
//   $voucherCode?.addEventListener("keydown", (e) => {
//     if (e.key === "Enter") applyVoucher();
//   });

//   $toStep2Btn?.addEventListener("click", () => {
//     const err = validateStep1();
//     if (err) {
//       $receiverMessage.textContent = err;
//       return;
//     }
//     $receiverMessage.textContent = "";
//     setCurrentStep(2);
//     renderAsideCart();
//   });

//   $backToStep1Btn?.addEventListener("click", () => setCurrentStep(1));

//   $toStep3Btn?.addEventListener("click", () => {
//     setCurrentStep(3);
//     renderConfirm();
//   });

//   $backToStep2Btn?.addEventListener("click", () => setCurrentStep(2));

//   $placeOrderBtn?.addEventListener("click", placeOrder);

//   async function syncHeaderCart() {
//     try {
//       const count = Array.isArray(cart) ? cart.reduce((s, it) => s + Number(it.quantity || 0), 0) : 0;
//       // Thường header-cart__count tồn tại sau partials
//       if (typeof window.updateCartCount === "function") window.updateCartCount(count);

//       // Fallback theo id/DOM patterns
//       const badgeEls = document.querySelectorAll(".header-cart__count");
//       badgeEls.forEach((el) => {
//         el.textContent = String(count);
//       });

//       const miniBadge = document.getElementById("cart-badge-count");
//       if (miniBadge) miniBadge.textContent = String(count);
//     } catch (e) {
//       // ignore
//     }
//   }

//   // Init
//   document.addEventListener("DOMContentLoaded", async () => {
//     cart = getCartFromKeys().map(normalizeItem);

//     if (!cart.length) {
//       setActiveStep(1);
//       $checkoutMessage.textContent = "Không có sản phẩm trong giỏ/đặt mua ngay.";
//       return;
//     }

//     // restore step (giữ nguyên khi reload trong cùng tab)
//     const restoredStep = restoreStepFromStorage();
//     setActiveStep(restoredStep);

//     renderAsideCart();

//     // Đợi header partial render xong rồi cập nhật dữ liệu header
//     if (!window.__TECHTRA_PARTIALS_READY__) {
//       document.addEventListener(
//         "partials:loaded",
//         () => {
//           syncHeaderCart();
//         },
//         { once: true }
//       );
//     } else {
//       syncHeaderCart();
//     }

//     await initRegionSelect();

//     await loadCustomerProfileIfLoggedIn();
//     await loadOrdersPreview();
//   });
// })();

import { request } from "../api-service/api.js";

(function () {
  const CART_KEY = "techtra_cart";
  const BUY_NOW_KEY = "techtra_buynow";

  const SHIPPING_FREE_THRESHOLD = 500000;
  const SHIPPING_DEFAULT_FEE = 20000;

  const $stepPanel1 = document.getElementById("stepPanel1");
  const $stepPanel2 = document.getElementById("stepPanel2");
  const $stepPanel3 = document.getElementById("stepPanel3");

  const $receiverForm = document.getElementById("receiverForm");

  const $toStep2Btn = document.getElementById("toStep2Btn");
  const $toStep3Btn = document.getElementById("toStep3Btn");

  const $backToStep1Btn = document.getElementById("backToStep1Btn");
  const $backToStep2Btn = document.getElementById("backToStep2Btn");

  const $placeOrderBtn = document.getElementById("placeOrderBtn");

  const $receiverMessage = document.getElementById("receiverMessage");
  const $checkoutMessage = document.getElementById("checkoutMessage");

  const $voucherCode = document.getElementById("voucherCode");
  const $applyVoucherBtn = document.getElementById("applyVoucherBtn");
  const $voucherMessage = document.getElementById("voucherMessage");

  const $receiverName = document.getElementById("receiverName");
  const $receiverPhone = document.getElementById("receiverPhone");
  const $receiverEmail = document.getElementById("receiverEmail");

  // select-field-v3
  const $provinceDropdown = document.getElementById("provinceDropdown");
  const $districtDropdown = document.getElementById("districtDropdown");
  const $wardDropdown = document.getElementById("wardDropdown");
  const $receiverAddressLine = document.getElementById("receiverAddressLine");

  const $receiverProvinceSearch = document.getElementById("receiverProvinceSearch");
  const $receiverDistrictSearch = document.getElementById("receiverDistrictSearch");
  const $receiverWardSearch = document.getElementById("receiverWardSearch");

  const $confirmName = document.getElementById("confirmName");
  const $confirmPhone = document.getElementById("confirmPhone");
  const $confirmEmail = document.getElementById("confirmEmail");
  const $confirmAddress = document.getElementById("confirmAddress");

  const $sumSubtotal = document.getElementById("sumSubtotal");
  const $sumShipping = document.getElementById("sumShipping");
  const $sumDiscount = document.getElementById("sumDiscount");
  const $sumFinal = document.getElementById("sumFinal");
  const $sumPayment = document.getElementById("sumPayment");

  const $asideCartList = document.getElementById("asideCartList");
  const $asideSubtotal = document.getElementById("asideSubtotal");
  const $asideShipping = document.getElementById("asideShipping");
  const $asideDiscount = document.getElementById("asideDiscount");
  const $asideFinal = document.getElementById("asideFinal");

  const $ordersMount = document.getElementById("ordersMount");
  const $ordersEmpty = document.getElementById("ordersEmpty");

  // Bank transfer modal elements
  const $bankModal = document.getElementById("bankTransferModal");
  const $bankModalClose = document.getElementById("bankModalClose");
  const $bankModalCancel = document.getElementById("bankModalCancel");
  const $bankModalContinue = document.getElementById("bankModalContinue");
  const $bankModalMessage = document.getElementById("bankModalMessage");
  const $bankName = document.getElementById("bankName");
  const $bankAccountNumber = document.getElementById("bankAccountNumber");
  const $bankAccountHolder = document.getElementById("bankAccountHolder");
  const $bankAmount = document.getElementById("bankAmount");
  const $bankTransferContent = document.getElementById("bankTransferContent");
  const $bankTimer = document.getElementById("bankTimer");
  const $vnpayQrContainer = document.getElementById("vnpayQrContainer");
  const $vnpayPayLink = document.getElementById("vnpayPayLink");
  const $vnpayQrCode = document.getElementById("vnpayQrCode");
  const $vnpayNotConfigured = document.getElementById("vnpayNotConfigured");

  const $stepper = document.querySelectorAll(".step[data-step]");

  function formatVND(n) {
    const num = Number(n || 0);
    return num.toLocaleString("vi-VN") + " đ";
  }

  function formatDateVN(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  }

  function getCartFromKeys() {
    // ưu tiên buynow (Mua ngay) nếu có, fallback cart.
    const fromBuyNow = (() => {
      try {
        return JSON.parse(localStorage.getItem(BUY_NOW_KEY) || "null");
      } catch {
        return null;
      }
    })();

    if (Array.isArray(fromBuyNow) && fromBuyNow.length) return fromBuyNow;

    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function normalizeItem(item) {
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      image: item.image,
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
      // Trọng lượng sản phẩm (gram) để lưu vào order_items phục vụ J&T và tồn kho vận chuyển
      weight: Number(item.weight || 0) || 0,
      weight_unit: item.weight_unit || "g",
      weight_grams: Number(item.weight_grams || 0) || 0,
    };
  }

  function calcTotals(items, voucher) {
    const normalized = items.map(normalizeItem);
    const subtotal = normalized.reduce((s, it) => s + it.price * it.quantity, 0);

    const shipping = subtotal >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_DEFAULT_FEE;

    let discount = 0;
    if (voucher && voucher.discount_type) {
      if (voucher.discount_type === "percent") {
        discount = Math.round(subtotal * (Number(voucher.discount_value || 0) / 100));
      } else {
        discount = Number(voucher.discount_value || 0);
      }
      if (voucher.max_discount != null) discount = Math.min(discount, Number(voucher.max_discount));
      if (voucher.min_order != null && subtotal < Number(voucher.min_order)) discount = 0;
    }

    if (discount > subtotal) discount = subtotal;

    const final = subtotal + shipping - discount;
    return { subtotal, shipping, discount, final };
  }

  const STEP_STORAGE_KEY = "techtra_checkout_step";

  function setActiveStep(step) {
    $stepPanel1.style.display = step === 1 ? "block" : "none";
    $stepPanel2.style.display = step === 2 ? "block" : "none";
    $stepPanel3.style.display = step === 3 ? "block" : "none";

    $stepper.forEach((el) => {
      el.dataset.active = String(el.getAttribute("data-step") === String(step));
    });
  }

  function setCurrentStep(step) {
    const s = Number(step);
    if (![1, 2, 3].includes(s)) return;
    sessionStorage.setItem(STEP_STORAGE_KEY, String(s));
    setActiveStep(s);
  }

  function restoreStepFromStorage() {
    const raw = sessionStorage.getItem(STEP_STORAGE_KEY);
    const s = raw ? Number(raw) : 1;
    if (![1, 2, 3].includes(s)) return 1;
    return s;
  }

  let cart = [];
  let currentVoucher = null;

  function renderAsideCart() {
    if (!cart.length) {
      $asideCartList.innerHTML = "";
      $asideSubtotal.textContent = formatVND(0);
      $asideShipping.textContent = formatVND(0);
      $asideDiscount.textContent = formatVND(0);
      $asideFinal.textContent = formatVND(0);
      return;
    }

    $asideCartList.innerHTML = cart
      .map((it) => {
        const img = it.image || "https://placehold.co/96x96?text=SP";
        return `
          <div class="aside-item">
            <img src="${img}" alt="${it.name || "SP"}" />
            <div>
              <strong>${it.name || "Sản phẩm"}</strong>
              <span>${it.quantity} x ${formatVND(it.price)}</span>
            </div>
          </div>
        `;
      })
      .join("");

    const totals = calcTotals(cart, currentVoucher);
    $asideSubtotal.textContent = formatVND(totals.subtotal);
    $asideShipping.textContent = formatVND(totals.shipping);
    $asideDiscount.textContent = formatVND(totals.discount);
    $asideFinal.textContent = formatVND(totals.final);
  }

  function renderConfirm() {
    $confirmName.textContent = $receiverName.value.trim() || "—";
    $confirmPhone.textContent = $receiverPhone.value.trim() || "—";
    $confirmEmail.textContent = $receiverEmail.value.trim() || "—";
    $confirmAddress.textContent = getAddressString() || "—";

    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || "COD";
    $sumPayment.textContent = paymentMethod === "COD" ? "COD" : "VNPay / Chuyển khoản";

    const totals = calcTotals(cart, currentVoucher);
    $sumSubtotal.textContent = formatVND(totals.subtotal);
    $sumShipping.textContent = formatVND(totals.shipping);
    $sumDiscount.textContent = formatVND(totals.discount);
    $sumFinal.textContent = formatVND(totals.final);
  }

  async function loadVoucherByCode(code) {
    if (!code) return null;
    const trimmed = String(code).trim();
    if (!trimmed) return null;

    const r = await request(
      "GET",
      `/db/v_active_vouchers?select=*&code=eq.${encodeURIComponent(trimmed)}&limit=1`
    );
    const list = r.data || [];
    return list[0] || null;
  }

  async function applyVoucher() {
    const code = $voucherCode.value;
    $voucherMessage.textContent = "Đang kiểm tra...";

    try {
      const voucher = await loadVoucherByCode(code);
      if (!voucher) {
        currentVoucher = null;
        $voucherMessage.textContent = "Voucher không hợp lệ hoặc đã hết hạn.";
        renderAsideCart();
        return;
      }

      currentVoucher = {
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
        min_order: voucher.min_order,
        max_discount: voucher.max_discount,
      };

      $voucherMessage.textContent = "Áp dụng thành công.";
      renderAsideCart();
    } catch (err) {
      console.error(err);
      currentVoucher = null;
      $voucherMessage.textContent = "Có lỗi khi áp dụng voucher.";
    }
  }

  // Region state (chỉ dùng bộ 3 biến này làm nguồn sự thật; UI thực tế là
  // select-field-v3 với input tìm kiếm + dropdown, không còn <select> nữa).
  let regionProvinceCode = null;
  let regionDistrictCode = null;
  let regionWardCode = null;

  function getAddressString() {
    const provinceName = $receiverProvinceSearch.value.trim();
    const districtName = $receiverDistrictSearch.value.trim();
    const wardName = $receiverWardSearch.value.trim();
    const line = $receiverAddressLine.value.trim();

    return [line, wardName, districtName, provinceName].filter(Boolean).join(", ");
  }

  function validateStep1() {
    const name = $receiverName.value.trim();
    const phone = $receiverPhone.value.trim();
    const line = $receiverAddressLine.value.trim();

    if (!name) return "Vui lòng nhập họ tên.";
    if (!phone || phone.length < 8) return "Vui lòng nhập số điện thoại hợp lệ.";
    if (!regionProvinceCode) return "Vui lòng chọn tỉnh/thành.";
    if (!regionDistrictCode) return "Vui lòng chọn quận/huyện.";
    if (!regionWardCode) return "Vui lòng chọn phường/xã.";
    if (!line) return "Vui lòng nhập số nhà / đường.";
    return null;
  }

  // ─────────────────────────────────────────────
  // provinces.open-api.vn (cascade endpoints)
  // ─────────────────────────────────────────────
  const OPEN_API_BASE = "https://provinces.open-api.vn/api";

  async function loadAllProvincesSelect() {
    const res = await fetch(`${OPEN_API_BASE}/p/`);
    const json = await res.json();
    return (json || [])
      .map((p) => ({ code: String(p.code ?? ""), name: String(p.name ?? "") }))
      .filter((p) => p.code && p.name);
  }

  async function loadDistrictsSelect(provinceCode) {
    const res = await fetch(`${OPEN_API_BASE}/p/${encodeURIComponent(provinceCode)}?depth=2`);
    const json = await res.json();
    const districts = json?.districts || json?.data?.districts || json || [];
    return (districts || [])
      .map((d) => ({
        code: String(d.code ?? d.codename ?? ""),
        name: String(d.name ?? d.district_name ?? d.division_name ?? ""),
      }))
      .filter((d) => d.code && d.name);
  }

  async function loadWardsSelect(districtCode) {
    const res = await fetch(`${OPEN_API_BASE}/d/${encodeURIComponent(districtCode)}?depth=2`);
    const json = await res.json();
    const wards = json?.wards || json?.data?.wards || json || [];
    return (wards || [])
      .map((w) => ({
        code: String(w.code ?? w.codename ?? ""),
        name: String(w.name ?? w.ward_name ?? w.division_name ?? ""),
      }))
      .filter((w) => w.code && w.name);
  }

  let provincesCache = [];
  let districtsCache = [];
  let wardsCache = [];

  async function initRegionSelect() {
    // UI dùng select-field-v3 (input + dropdown div), chọn item bằng click.

    function closeAllDropdowns() {
      $provinceDropdown.style.display = "none";
      $districtDropdown.style.display = "none";
      $wardDropdown.style.display = "none";
    }

    function openDropdown($dd) {
      closeAllDropdowns();
      $dd.style.display = "block";
    }

    function filterItems(items, q) {
      const query = String(q || "").toLowerCase().trim();
      if (!query) return items || [];
      return (items || []).filter((it) => String(it.name || "").toLowerCase().includes(query));
    }

    function renderItems($dd, items, onPick) {
      const safeItems = items || [];
      if (!safeItems.length) {
        $dd.innerHTML = `<div class="select-field-v3__item is-empty">Không có kết quả</div>`;
        return;
      }
      $dd.innerHTML = safeItems
        .map(
          (it) => `
          <div class="select-field-v3__item" data-code="${it.code}">
            ${String(it.name || "")}
          </div>
        `
        )
        .join("");

      $dd.querySelectorAll(".select-field-v3__item").forEach((el) => {
        el.addEventListener("click", () => {
          const code = el.getAttribute("data-code");
          const picked = safeItems.find((x) => String(x.code) === String(code));
          if (!picked) return;
          onPick(picked);
        });
      });
    }

    let localProvinceCode = null;
    let localDistrictCode = null;
    let localWardCode = null;

    $receiverDistrictSearch.disabled = true;
    $receiverWardSearch.disabled = true;

    // load provinces
    provincesCache = await loadAllProvincesSelect();
    $receiverProvinceSearch.disabled = false;

    // close khi click ngoài
    document.addEventListener("click", (e) => {
      const t = e.target;
      if (t.closest(".select-field-v3__control")) return;
      closeAllDropdowns();
    });

    // Dùng named handlers + { once:true } / removeEventListener để tránh
    // đăng ký listener chồng chất mỗi lần đổi tỉnh/quận.
    let districtFocusHandler = null;
    let districtInputHandler = null;
    let wardFocusHandler = null;
    let wardInputHandler = null;

    $receiverProvinceSearch.addEventListener("focus", () => {
      openDropdown($provinceDropdown);
      renderItems($provinceDropdown, filterItems(provincesCache, $receiverProvinceSearch.value), (picked) => {
        localProvinceCode = picked.code;
        regionProvinceCode = picked.code;
        $receiverProvinceSearch.value = picked.name;
        closeAllDropdowns();
        initDistrictFlow();
      });
    });

    $receiverProvinceSearch.addEventListener("input", async () => {
      openDropdown($provinceDropdown);
      renderItems($provinceDropdown, filterItems(provincesCache, $receiverProvinceSearch.value), (picked) => {
        localProvinceCode = picked.code;
        regionProvinceCode = picked.code;
        $receiverProvinceSearch.value = picked.name;
        closeAllDropdowns();
        initDistrictFlow();
      });

      const q = String($receiverProvinceSearch.value || "").toLowerCase().trim();
      const exact = (provincesCache || []).find((it) => String(it.name || "").toLowerCase() === q);
      if (exact) {
        localProvinceCode = exact.code;
        regionProvinceCode = exact.code;
        $receiverProvinceSearch.value = exact.name;
        closeAllDropdowns();
        await initDistrictFlow();
      }
    });

    async function initDistrictFlow() {
      if (!localProvinceCode) return;
      $receiverDistrictSearch.disabled = false;
      $receiverWardSearch.disabled = true;
      regionDistrictCode = null;
      regionWardCode = null;
      localDistrictCode = null;
      localWardCode = null;

      $receiverDistrictSearch.value = "";
      $receiverWardSearch.value = "";
      $districtDropdown.style.display = "none";
      $wardDropdown.style.display = "none";

      districtsCache = await loadDistrictsSelect(localProvinceCode);

      $receiverDistrictSearch.focus();

      if (districtFocusHandler) $receiverDistrictSearch.removeEventListener("focus", districtFocusHandler);
      if (districtInputHandler) $receiverDistrictSearch.removeEventListener("input", districtInputHandler);

      districtFocusHandler = () => {
        openDropdown($districtDropdown);
        renderItems($districtDropdown, filterItems(districtsCache, $receiverDistrictSearch.value), (picked) => {
          localDistrictCode = picked.code;
          regionDistrictCode = picked.code;
          $receiverDistrictSearch.value = picked.name;
          closeAllDropdowns();
          initWardFlow();
        });
      };
      districtInputHandler = () => {
        openDropdown($districtDropdown);
        renderItems($districtDropdown, filterItems(districtsCache, $receiverDistrictSearch.value), (picked) => {
          localDistrictCode = picked.code;
          regionDistrictCode = picked.code;
          $receiverDistrictSearch.value = picked.name;
          closeAllDropdowns();
          initWardFlow();
        });
      };

      $receiverDistrictSearch.addEventListener("focus", districtFocusHandler);
      $receiverDistrictSearch.addEventListener("input", districtInputHandler);

      const q = String($receiverDistrictSearch.value || "").toLowerCase().trim();
      const exact = (districtsCache || []).find((it) => String(it.name || "").toLowerCase() === q);
      if (exact) {
        localDistrictCode = exact.code;
        regionDistrictCode = exact.code;
        $receiverDistrictSearch.value = exact.name;
        closeAllDropdowns();
        await initWardFlow();
      }
    }

    async function initWardFlow() {
      if (!localDistrictCode) return;
      $receiverWardSearch.disabled = false;
      $receiverWardSearch.value = "";
      wardsCache = await loadWardsSelect(localDistrictCode);

      if (wardFocusHandler) $receiverWardSearch.removeEventListener("focus", wardFocusHandler);
      if (wardInputHandler) $receiverWardSearch.removeEventListener("input", wardInputHandler);

      wardFocusHandler = () => {
        openDropdown($wardDropdown);
        renderItems($wardDropdown, filterItems(wardsCache, $receiverWardSearch.value), (picked) => {
          localWardCode = picked.code;
          regionWardCode = picked.code;
          $receiverWardSearch.value = picked.name;
          closeAllDropdowns();
        });
      };
      wardInputHandler = () => {
        openDropdown($wardDropdown);
        renderItems($wardDropdown, filterItems(wardsCache, $receiverWardSearch.value), (picked) => {
          localWardCode = picked.code;
          regionWardCode = picked.code;
          $receiverWardSearch.value = picked.name;
          closeAllDropdowns();
        });
      };

      $receiverWardSearch.addEventListener("focus", wardFocusHandler);
      $receiverWardSearch.addEventListener("input", wardInputHandler);

      const q = String($receiverWardSearch.value || "").toLowerCase().trim();
      const exact = (wardsCache || []).find((it) => String(it.name || "").toLowerCase() === q);
      if (exact) {
        localWardCode = exact.code;
        regionWardCode = exact.code;
        $receiverWardSearch.value = exact.name;
        closeAllDropdowns();
      }
    }
  }

  function getLoggedInUser() {
    try {
      const raw = localStorage.getItem("techtra_user");
      if (!raw || raw === "null") return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function getLoggedInUserId() {
    const user = getLoggedInUser();
    // orders.customer_id is the FK referencing customers.id; backend login returns customer_id.
    return user?.customer_id ? Number(user.customer_id) : null;
  }

  function getLoggedInUserInfo() {
    const user = getLoggedInUser() || {};
    return {
      name: user.full_name || user.name || user.username || '',
      phone: user.phone || '',
      email: user.email || '',
      address: user.address || '',
    };
  }

  async function loadCustomerProfileIfLoggedIn() {
    const userId = getLoggedInUserId();
    if (!userId) return;

    try {
      const r = await request("GET", `/db/customers?select=name,phone,email,address&id=eq.${userId}&limit=1`);
      const data = (r.data || [])[0];
      if (!data) return;

      $receiverName.value = data.name || "";
      $receiverPhone.value = data.phone || "";
      $receiverEmail.value = data.email || "";
      // Backward: nếu address đang lưu format tự do, mình nhét vào line address.
      $receiverAddressLine.value = data.address || "";
    } catch (err) {
      console.warn("loadCustomerProfileIfLoggedIn error", err);
    }
  }

  async function loadOrdersPreview() {
    const userId = getLoggedInUserId();
    const userInfo = getLoggedInUserInfo();
    if (!userId && !userInfo.phone && !userInfo.email) {
      $ordersEmpty.style.display = "block";
      $ordersEmpty.textContent = "Vui lòng đăng nhập để xem lịch sử đơn hàng.";
      $ordersMount.innerHTML = "";
      return;
    }

    try {
      const r = await request(
        "GET",
        `/orders?status=all&limit=50`
      );
      const normalizePhone = (p) => String(p || '').replace(/\D/g, '').replace(/^84/, '0');
      const myPhone = normalizePhone(userInfo.phone);
      const myEmail = String(userInfo.email).toLowerCase();
      const list = (r.data || [])
        .filter((o) => {
          if (userId && Number(o.customer_id) === Number(userId)) return true;
          const orderPhone = normalizePhone(o.customer_phone || o.receiver_phone || o.phone || '');
          if (myPhone && orderPhone === myPhone) return true;
          const orderEmail = String(o.receiver_email || o.email || '').toLowerCase();
          if (myEmail && orderEmail === myEmail) return true;
          return false;
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 8);

      if (!list.length) {
        $ordersEmpty.style.display = "block";
        $ordersEmpty.textContent = "Chưa có đơn.";
        $ordersMount.innerHTML = "";
        return;
      }

      $ordersEmpty.style.display = "none";
      $ordersMount.innerHTML = list
        .map(
          (o) => `
            <div class="history-item">
              <strong>${o.order_code || ('#' + o.id)}</strong>
              <span>${o.status || ''} • ${formatVND(o.final_price)} • ${formatDateVN(o.created_at)}</span>
            </div>
          `
        )
        .join("");
    } catch (err) {
      console.warn("loadOrdersPreview error", err);
      $ordersEmpty.style.display = "block";
      $ordersEmpty.textContent = "Không tải được lịch sử đơn hàng.";
      $ordersMount.innerHTML = "";
    }
  }

  // ─── Bank transfer modal logic ──────────────────────────────────
  let bankTimerInterval = null;
  let bankTimeLeftSeconds = 0;
  let bankConfigCache = null;

  async function loadBankConfig() {
    if (bankConfigCache) return bankConfigCache;
    try {
      const keys = ["bank_name", "bank_account_number", "bank_account_holder"];
      const inVal = `(${keys.map((k) => `"${k}"`).join(",")})`;
      const r = await request("GET", `/db/site_settings?select=key,value&key=in.${inVal}`);
      const cfg = {};
      (r.data || []).forEach((row) => { cfg[row.key] = row.value; });
      bankConfigCache = cfg;
      return cfg;
    } catch (err) {
      console.warn("loadBankConfig error", err);
      return {};
    }
  }

  function generateTempOrderId() {
    return `TMP${Date.now()}`;
  }

  async function createVnpayPaymentUrl(amount, orderId) {
    try {
      const r = await request("POST", "/payment/vnpay/create", {
        amount,
        orderId,
        orderDesc: `Thanh toan don hang ${orderId}`,
      });
      return r?.data?.paymentUrl || null;
    } catch (err) {
      console.warn("createVnpayPaymentUrl error", err);
      return null;
    }
  }

  function renderVnpayQr(paymentUrl) {
    if (!paymentUrl) {
      $vnpayQrContainer.style.display = "none";
      $vnpayNotConfigured.style.display = "block";
      return;
    }
    $vnpayPayLink.href = paymentUrl;
    $vnpayQrContainer.style.display = "block";
    $vnpayNotConfigured.style.display = "none";
    $vnpayQrCode.innerHTML = "";
    // Simple QR via Google Chart API (no extra lib needed)
    const size = 200;
    const encoded = encodeURIComponent(paymentUrl);
    const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encoded}&choe=UTF-8`;
    const img = document.createElement("img");
    img.src = qrUrl;
    img.alt = "QR VNPay";
    img.width = size;
    img.height = size;
    $vnpayQrCode.appendChild(img);
  }

  function openBankModal() {
    const tempOrderId = generateTempOrderId();
    loadBankConfig().then(async (cfg) => {
      $bankName.textContent = cfg.bank_name || "Chưa cấu hình";
      $bankAccountNumber.textContent = cfg.bank_account_number || "—";
      $bankAccountHolder.textContent = cfg.bank_account_holder || "—";
      const totals = calcTotals(cart, currentVoucher);
      $bankAmount.textContent = formatVND(totals.final);
      $bankTransferContent.textContent = `Thanh toan don hang Techtra ${tempOrderId}`;
      $bankModalMessage.textContent = "";
      $bankModal.style.display = "flex";
      startBankTimer(5 * 60);

      const vnpayUrl = await createVnpayPaymentUrl(totals.final, tempOrderId);
      renderVnpayQr(vnpayUrl);
    });
  }

  function closeBankModal() {
    $bankModal.style.display = "none";
    stopBankTimer();
  }

  function startBankTimer(seconds) {
    stopBankTimer();
    bankTimeLeftSeconds = seconds;
    updateBankTimerDisplay();
    bankTimerInterval = setInterval(() => {
      bankTimeLeftSeconds -= 1;
      updateBankTimerDisplay();
      if (bankTimeLeftSeconds <= 0) {
        stopBankTimer();
        // Hết hạn: chuyển sang COD và đóng modal
        const codRadio = document.querySelector('input[name="paymentMethod"][value="COD"]');
        if (codRadio) codRadio.checked = true;
        closeBankModal();
        $bankModalMessage.textContent = "";
        if ($checkoutMessage) {
          $checkoutMessage.textContent = "Hết thờigian chuyển khoản. Đã chuyển sang thanh toán khi nhận (COD).";
        }
      }
    }, 1000);
  }

  function stopBankTimer() {
    if (bankTimerInterval) {
      clearInterval(bankTimerInterval);
      bankTimerInterval = null;
    }
  }

  function updateBankTimerDisplay() {
    const m = Math.floor(Math.max(0, bankTimeLeftSeconds) / 60);
    const s = Math.max(0, bankTimeLeftSeconds) % 60;
    $bankTimer.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  async function placeOrder() {
    $checkoutMessage.textContent = "";

    if (!cart.length) {
      $checkoutMessage.textContent = "Giỏ hàng đang trống.";
      return;
    }

    const receiverValidation = validateStep1();
    if (receiverValidation) {
      setActiveStep(1);
      $checkoutMessage.textContent = receiverValidation;
      return;
    }

    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || "COD";
    const voucherCode = ($voucherCode.value || "").trim() || null;

    const userId = getLoggedInUserId();

    const totals = calcTotals(cart, currentVoucher);

    try {
      // Create order
      const receiverName  = $receiverName.value.trim();
      const receiverPhone = $receiverPhone.value.trim();
      const receiverAddr  = getAddressString();

      // Nếu KH chưa đăng nhập → tra cứu hoặc tạo customer theo SĐT/email
      // để đơn hàng luôn gắn với customer_id → khi admin xác nhận done
      // sẽ tự cộng LTV / rank / voucher cho KH đó.
      // Nếu đã đăng nhập thì bỏ qua: gán thẳng userId, không quan tâm
      // tên/SĐT người nhận.
      const receiverEmail = $receiverEmail.value.trim() || null;
      let resolvedCustomerId = userId;
      if (!resolvedCustomerId) {
        const lookupRes = await request("POST", "/customers/lookup-or-create", {
          phone: receiverPhone || null,
          email: receiverEmail,
          name:  receiverName || null,
        });
        resolvedCustomerId = lookupRes?.data?.customer_id;
        if (!resolvedCustomerId) {
          throw new Error("Không xác định được khách hàng. Vui lòng kiểm tra SĐT/Email.");
        }
      }

      const insertPayload = {
        customer_id: resolvedCustomerId,
        // Cột mới (FE đang đọc)
        receiver_name:    receiverName,
        receiver_phone:   receiverPhone,
        receiver_email:   receiverEmail,
        receiver_address: receiverAddr,
        // Cột cũ (admin view v_orders_full + các trang admin dùng customer_name / customer_phone / address)
        // Ghi song song để admin hiển thị tên KH mà không cần sửa view.
        customer_name:    receiverName,
        customer_phone:   receiverPhone,
        address:          receiverAddr,
        // Tiền / voucher
        shipping_fee:  totals.shipping,
        subtotal_price: totals.subtotal,
        discount_price: totals.discount,
        final_price:    totals.final,
        payment_method: paymentMethod,
        voucher_code:   voucherCode,
        // status lowercase để khớp DB default + admin filter "Chờ xác nhận"
        status: "pending",
      };

      // Khi DB chưa khớp schema, insert sẽ fail; nhưng ta vẫn cố gắng theo naming phổ biến.
      const resp = await request("POST", "/db/orders", insertPayload);
      const orderData = resp?.data || resp;

      const orderId = orderData?.id;
      const orderCode = orderData?.order_code || orderData?.code || orderData?.id;

      if (!orderId) throw new Error("Không lấy được id đơn hàng.");

      // Create order items
      // Lấy trọng lượng (gram) từ product snapshot; nếu thiếu thì backend sẽ tự bổ sung.
      const itemsPayload = cart.map((it) => {
        let grams = it.weight_grams || 0;
        if (!grams && it.weight) {
          grams = (it.weight_unit || "g").toLowerCase() === "kg" ? it.weight * 1000 : it.weight;
        }
        return {
          order_id: orderId,
          product_id: it.id,
          product_name: it.name,
          unit_price: it.price,
          quantity: it.quantity,
          line_total: it.price * it.quantity,
          weight_grams: grams,
        };
      });

      // Generic POST chỉ insert 1 row — loop từng item
      for (const row of itemsPayload) {
        await request("POST", "/db/order_items", row);
      }

      // Clear local buynow/cart
      localStorage.removeItem(BUY_NOW_KEY);
      if (localStorage.getItem(CART_KEY)) {
        // Nếu thanh toán từ giỏ thì xoá giỏ; còn nếu từ buynow thì chỉ xoá buynow.
        localStorage.removeItem(CART_KEY);
      }

      $checkoutMessage.innerHTML = `Đặt hàng thành công. Mã đơn: <strong>${orderCode}</strong>`;
      setActiveStep(3);

      // Update history preview
      await loadOrdersPreview();

      // Optional redirect to thank-you page could go here.
    } catch (err) {
      console.error(err);
      $checkoutMessage.textContent = err?.message || "Đặt hàng thất bại.";
    }
  }

  // Events
  $applyVoucherBtn?.addEventListener("click", applyVoucher);
  $voucherCode?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyVoucher();
  });

  $toStep2Btn?.addEventListener("click", () => {
    const err = validateStep1();
    if (err) {
      $receiverMessage.textContent = err;
      return;
    }
    $receiverMessage.textContent = "";
    setCurrentStep(2);
    renderAsideCart();
  });

  $backToStep1Btn?.addEventListener("click", () => setCurrentStep(1));

  $toStep3Btn?.addEventListener("click", () => {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || "COD";
    if (paymentMethod === "vnpay") {
      openBankModal();
    } else {
      setCurrentStep(3);
      renderConfirm();
    }
  });

  $backToStep2Btn?.addEventListener("click", () => setCurrentStep(2));

  $placeOrderBtn?.addEventListener("click", placeOrder);

  // Bank modal events
  $bankModalClose?.addEventListener("click", closeBankModal);
  $bankModalCancel?.addEventListener("click", closeBankModal);
  $bankModalContinue?.addEventListener("click", () => {
    closeBankModal();
    setCurrentStep(3);
    renderConfirm();
  });
  $bankModal?.addEventListener("click", (e) => {
    if (e.target === $bankModal || e.target.classList.contains("bank-modal__overlay")) {
      // không đóng khi click overlay, chỉ đóng khi bấm nút
    }
  });

  async function syncHeaderCart() {
    try {
      const count = Array.isArray(cart) ? cart.reduce((s, it) => s + Number(it.quantity || 0), 0) : 0;
      // Thường header-cart__count tồn tại sau partials
      if (typeof window.updateCartCount === "function") window.updateCartCount(count);

      // Fallback theo id/DOM patterns
      const badgeEls = document.querySelectorAll(".header-cart__count");
      badgeEls.forEach((el) => {
        el.textContent = String(count);
      });

      const miniBadge = document.getElementById("cart-badge-count");
      if (miniBadge) miniBadge.textContent = String(count);
    } catch (e) {
      // ignore
    }
  }

  // Init
  document.addEventListener("DOMContentLoaded", async () => {
    cart = getCartFromKeys().map(normalizeItem);

    if (!cart.length) {
      setActiveStep(1);
      $checkoutMessage.textContent = "Không có sản phẩm trong giỏ/đặt mua ngay.";
      return;
    }

    // restore step (giữ nguyên khi reload trong cùng tab)
    const restoredStep = restoreStepFromStorage();
    setActiveStep(restoredStep);

    renderAsideCart();

    // Đợi header partial render xong rồi cập nhật dữ liệu header
    if (!window.__TECHTRA_PARTIALS_READY__) {
      document.addEventListener(
        "partials:loaded",
        () => {
          syncHeaderCart();
        },
        { once: true }
      );
    } else {
      syncHeaderCart();
    }

    await initRegionSelect();

    await loadCustomerProfileIfLoggedIn();
    await loadOrdersPreview();
  });
})();