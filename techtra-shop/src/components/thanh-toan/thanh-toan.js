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

//   function setActiveStep(step) {
//     $stepPanel1.style.display = step === 1 ? "block" : "none";
//     $stepPanel2.style.display = step === 2 ? "block" : "none";
//     $stepPanel3.style.display = step === 3 ? "block" : "none";

//     $stepper.forEach((el) => {
//       el.dataset.active = String(el.getAttribute("data-step") === String(step));
//     });
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

//   let regionProvinceCode = null;
//   let regionDistrictCode = null;
//   let regionWardCode = null;

//   function getAddressString() {
//     const provinceName = $receiverProvince.options[$receiverProvince.selectedIndex]?.text || "";
//     const districtName = $receiverDistrict.options[$receiverDistrict.selectedIndex]?.text || "";
//     const wardName = $receiverWard.options[$receiverWard.selectedIndex]?.text || "";
//     const line = $receiverAddressLine.value.trim();

//     return [line, wardName, districtName, provinceName].filter(Boolean).join(", ");
//   }

//   function validateStep1() {
//     const name = $receiverName.value.trim();
//     const phone = $receiverPhone.value.trim();
//     const province = $receiverProvince.value;
//     const district = $receiverDistrict.value;
//     const ward = $receiverWard.value;
//     const line = $receiverAddressLine.value.trim();

//     if (!name) return "Vui lòng nhập họ tên.";
//     if (!phone || phone.length < 8) return "Vui lòng nhập số điện thoại hợp lệ.";
//     if (!province) return "Vui lòng chọn tỉnh/thành.";
//     if (!district) return "Vui lòng chọn quận/huyện.";
//     if (!ward) return "Vui lòng chọn phường/xã.";
//     if (!line) return "Vui lòng nhập số nhà / đường.";
//     return null;
//   }

//   // ─────────────────────────────────────────────
//   // VN Region API autocomplete (tỉnh -> quận -> phường)
//   // ─────────────────────────────────────────────
//   const VN_REGION_BASE = "https://huynhminhvangit.github.io/vn-region-api";

//   function parsePreJson(html) {
//     const match = html.match(/<pre>([\s\S]*?)<\/pre>/s);
//     if (!match) return null;
//     try {
//       return JSON.parse(match[1]);
//     } catch {
//       return null;
//     }
//   }

//   function closeAllSuggest() {
//     $provinceSuggest?.classList.remove("is-open");
//     $districtSuggest?.classList.remove("is-open");
//     $wardSuggest?.classList.remove("is-open");
//   }

//   function renderSuggest($el, items, onPick) {
//     if (!$el) return;
//     if (!items?.length) {
//       $el.innerHTML = "";
//       $el.classList.remove("is-open");
//       return;
//     }

//     $el.innerHTML = items
//       .slice(0, 12)
//       .map(
//         (it, idx) => `<div class="region-suggest-item" data-idx="${idx}">${it.name}</div>`
//       )
//       .join("");

//     $el.classList.add("is-open");

//     $el.onclick = (e) => {
//       const itemEl = e.target.closest(".region-suggest-item");
//       if (!itemEl) return;
//       const idx = Number(itemEl.getAttribute("data-idx"));
//       const picked = items[idx];
//       if (!picked) return;
//       onPick(picked);
//       closeAllSuggest();
//     };
//   }

//   async function searchProvinces(q) {
//     const url = `${VN_REGION_BASE}/api/provinces.html?name=${encodeURIComponent(q)}`;
//     const res = await fetch(url);
//     const html = await res.text();
//     return parsePreJson(html) || [];
//   }

//   async function searchDistrictsByProvinceCode(provinceCode, q) {
//     // API wards page có province_code, và thường districts có endpoint tương tự.
//     // Trang hướng dẫn bạn đưa nhấn provinces + wards; với districts ta dùng cấu trúc thường: /api/districts.html?province_code=...
//     const url = `${VN_REGION_BASE}/api/districts.html?province_code=${encodeURIComponent(provinceCode)}`;
//     const res = await fetch(url);
//     const html = await res.text();
//     const districts = parsePreJson(html) || [];
//     const query = String(q || "").toLowerCase().trim();
//     if (!query) return districts;
//     return districts.filter((d) => String(d.name || "").toLowerCase().includes(query));
//   }

//   async function searchWardsByDistrictCode(districtCode, q) {
//     // WARDS endpoint: /api/wards.html?district_code=... (đã được nhắc trong trang)
//     const url = `${VN_REGION_BASE}/api/wards.html?district_code=${encodeURIComponent(districtCode)}`;
//     const res = await fetch(url);
//     const html = await res.text();
//     const wards = parsePreJson(html) || [];
//     const query = String(q || "").toLowerCase().trim();
//     if (!query) return wards;
//     return wards.filter((w) => String(w.name || "").toLowerCase().includes(query));
//   }

//   function enableDistricts(enable) {
//     $receiverDistrict.disabled = !enable;
//     $receiverDistrictSearch.disabled = !enable;
//     if (!enable) {
//       $receiverDistrict.value = "";
//       $receiverWard.value = "";
//       $receiverAddressLine.value = "";
//       regionDistrictCode = null;
//       regionWardCode = null;
//     }
//   }

//   function enableWards(enable) {
//     $receiverWard.disabled = !enable;
//     $receiverWardSearch.disabled = !enable;
//     if (!enable) {
//       $receiverWard.value = "";
//       $receiverAddressLine.value = "";
//       regionWardCode = null;
//     }
//   }

//   function setSelectOptions($select, items, { valueKey = "code", labelKey = "name" } = {}) {
//     const options = (items || []).map((it) => {
//       const value = String(it[valueKey] ?? "");
//       const label = String(it[labelKey] ?? "");
//       return `<option value="${value}">${label}</option>`;
//     });
//     $select.innerHTML = options.join("");
//   }

//   // provinces.open-api.vn (cascade endpoints)
//   const OPEN_API_BASE = "https://provinces.open-api.vn/api";

//   async function loadAllProvincesSelect() {
//     const res = await fetch(`${OPEN_API_BASE}/p/`);
//     const json = await res.json();
//     // assume array with { code, name }
//     return (json || []).map((p) => ({
//       code: String(p.code ?? ""),
//       name: String(p.name ?? ""),
//     })).filter((p) => p.code && p.name);
//   }

//   async function loadDistrictsSelect(provinceCode) {
//     const res = await fetch(`${OPEN_API_BASE}/p/${encodeURIComponent(provinceCode)}?depth=2`);
//     const json = await res.json();
//     // often returns { districts: [...] }
//     const districts = json?.districts || json?.data?.districts || json || [];
//     return (districts || []).map((d) => ({
//       code: String(d.code ?? d.codename ?? ""),
//       name: String(d.name ?? d.district_name ?? d.division_name ?? ""),
//     })).filter((d) => d.code && d.name);
//   }

//   async function loadWardsSelect(districtCode) {
//     const res = await fetch(`${OPEN_API_BASE}/d/${encodeURIComponent(districtCode)}?depth=2`);
//     const json = await res.json();
//     // often returns { wards: [...] }
//     const wards = json?.wards || json?.data?.wards || json || [];
//     return (wards || []).map((w) => ({
//       code: String(w.code ?? w.codename ?? ""),
//       name: String(w.name ?? w.ward_name ?? w.division_name ?? ""),
//     })).filter((w) => w.code && w.name);
//   }

//   let provincesCache = [];
//   let districtsCache = [];
//   let wardsCache = [];

//   function filterAndSetSelect($select, items, q) {
//     const query = String(q || "").toLowerCase().trim();
//     const filtered = query
//       ? (items || []).filter((it) => String(it.name || "").toLowerCase().includes(query))
//       : (items || []);

//     $select.innerHTML = filtered.length
//       ? filtered.map((it) => `<option value="${it.code}">${it.name}</option>`).join("")
//       : `<option value="">Không có kết quả</option>`;
//   }

//   async function initRegionSelect() {
//     // NOTE: UI đã chuyển sang select-field-v3 (dropdown div), nên không còn dùng <select size=...> nữa.
//     // Mở dropdown bằng click/focus và chọn item bằng click.

//     function closeAllDropdowns() {
//       $provinceDropdown.style.display = "none";
//       $districtDropdown.style.display = "none";
//       $wardDropdown.style.display = "none";
//     }

//     function openDropdown($dd) {
//       closeAllDropdowns();
//       $dd.style.display = "block";
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
//       $districtDropdown.style.display = "none";
//       $wardDropdown.style.display = "none";

//       districtsCache = await loadDistrictsSelect(localProvinceCode);

//       $receiverDistrictSearch.focus();

//       $receiverDistrictSearch.addEventListener("focus", () => {
//         openDropdown($districtDropdown);
//         renderItems($districtDropdown, filterItems(districtsCache, $receiverDistrictSearch.value), (picked) => {
//           localDistrictCode = picked.code;
//           regionDistrictCode = picked.code;
//           $receiverDistrictSearch.value = picked.name;
//           closeAllDropdowns();
//           initWardFlow();
//         });
//       }, { once: true });

//       $receiverDistrictSearch.addEventListener("input", () => {
//         openDropdown($districtDropdown);
//         renderItems($districtDropdown, filterItems(districtsCache, $receiverDistrictSearch.value), (picked) => {
//           localDistrictCode = picked.code;
//           regionDistrictCode = picked.code;
//           $receiverDistrictSearch.value = picked.name;
//           closeAllDropdowns();
//           initWardFlow();
//         });
//       });

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
//       wardsCache = await loadWardsSelect(localDistrictCode);

//       $receiverWardSearch.addEventListener("focus", () => {
//         openDropdown($wardDropdown);
//         renderItems($wardDropdown, filterItems(wardsCache, $receiverWardSearch.value), (picked) => {
//           localWardCode = picked.code;
//           regionWardCode = picked.code;
//           $receiverWardSearch.value = picked.name;
//           closeAllDropdowns();
//         });
//       }, { once: true });

//       $receiverWardSearch.addEventListener("input", () => {
//         openDropdown($wardDropdown);
//         renderItems($wardDropdown, filterItems(wardsCache, $receiverWardSearch.value), (picked) => {
//           localWardCode = picked.code;
//           regionWardCode = picked.code;
//           $receiverWardSearch.value = picked.name;
//           closeAllDropdowns();
//         });
//       });

//       const q = String($receiverWardSearch.value || "").toLowerCase().trim();
//       const exact = (wardsCache || []).find((it) => String(it.name || "").toLowerCase() === q);
//       if (exact) {
//         localWardCode = exact.code;
//         regionWardCode = exact.code;
//         $receiverWardSearch.value = exact.name;
//         closeAllDropdowns();
//       }
//     }

//     // TODO: đã chuyển sang select-field-v3, xoá toàn bộ legacy <select> handlers phía dưới.
//     // (Khối code cũ đã được gỡ dần nhưng vẫn còn sót; phần còn sót sẽ bị xoá ở bản tiếp theo.)

//     // Legacy block intentionally removed to fix SyntaxError.

//     return;


//       // reset quận/phường
//       $receiverDistrict.innerHTML = `<option value="">Chọn quận/huyện</option>`;
//       $receiverWard.innerHTML = `<option value="">Chọn phường/xã</option>`;
//       regionDistrictCode = null;
//       regionWardCode = null;

//       if (!regionProvinceCode) {
//         enableDistricts(false);
//         enableWards(false);
//         return;
//       }

//       enableDistricts(true);
//       enableWards(false);
//       $receiverDistrictSearch.disabled = false;

//       try {
//         districtsCache = await loadDistrictsSelect(regionProvinceCode);
//         $receiverDistrict.disabled = false;
//         filterAndSetSelect($receiverDistrict, [{ code: "", name: "Chọn quận/huyện" }, ...districtsCache], $receiverDistrictSearch.value);
//       } catch (e) {
//         $receiverDistrict.innerHTML = `<option value="">Không tải được quận/huyện</option>`;
//         $receiverDistrict.disabled = true;
//       }
//     });

//     $receiverDistrictSearch.addEventListener("focus", () => {
//       $receiverDistrict.size = 8;
//     });
//     $receiverDistrictSearch.addEventListener("blur", () => {
//       setTimeout(() => {
//         if (document.activeElement !== $receiverDistrictSearch) {
//           $receiverDistrict.size = 0;
//         }
//       }, 120);
//     });

//     $receiverDistrictSearch.addEventListener("input", () => {
//       const items = [{ code: "", name: "Chọn quận/huyện" }, ...districtsCache];
//       filterAndSetSelect($receiverDistrict, items, $receiverDistrictSearch.value);
//       // auto-select exact
//       const q = String($receiverDistrictSearch.value || "").toLowerCase().trim();
//       const match = items.find((it) => String(it.name || "").toLowerCase() === q);
//       if (match) $receiverDistrict.value = match.code;
//     });

//     $receiverWardSearch.addEventListener("focus", () => {
//       $receiverWard.size = 8;
//     });
//     $receiverWardSearch.addEventListener("blur", () => {
//       setTimeout(() => {
//         if (document.activeElement !== $receiverWardSearch) {
//           $receiverWard.size = 0;
//         }
//       }, 120);
//     });

//     $receiverWardSearch.addEventListener("input", () => {
//       const items = [{ code: "", name: "Chọn phường/xã" }, ...wardsCache];
//       filterAndSetSelect($receiverWard, items, $receiverWardSearch.value);
//       const q = String($receiverWardSearch.value || "").toLowerCase().trim();
//       const match = items.find((it) => String(it.name || "").toLowerCase() === q);
//       if (match) $receiverWard.value = match.code;
//     });

//     $receiverDistrict.addEventListener("change", async () => {
//       const code = $receiverDistrict.value;
//       regionDistrictCode = code || null;

//       $receiverWard.innerHTML = `<option value="">Chọn phường/xã</option>`;
//       regionWardCode = null;

//       if (!regionDistrictCode) {
//         enableWards(false);
//         return;
//       }

//       enableWards(true);
//       $receiverWardSearch.disabled = false;
//       try {
//         wardsCache = await loadWardsSelect(regionDistrictCode);
//         $receiverWard.disabled = false;
//         filterAndSetSelect($receiverWard, [{ code: "", name: "Chọn phường/xã" }, ...wardsCache], $receiverWardSearch.value);
//       } catch (e) {
//         $receiverWard.innerHTML = `<option value="">Không tải được phường/xã</option>`;
//         $receiverWard.disabled = true;
//       }
//     });
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
//       $ordersEmpty.style.display = "block";
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
//       $ordersEmpty.style.display = "block";
//       return;
//     }

//     $ordersEmpty.style.display = "none";
//     $ordersMount.innerHTML = list
//       .map(
//         (o) => `
//           <div class="history-item">
//             <strong>${o.order_code}</strong>
//             <span>${o.status} • ${formatVND(o.final_price)} • ${new Date(o.created_at).toLocaleDateString("vi-VN")}</span>
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
//       const insertPayload = {
//         customer_id: customerId,
//         receiver_name: $receiverName.value.trim(),
//         receiver_phone: $receiverPhone.value.trim(),
//         receiver_email: $receiverEmail.value.trim() || null,
//         receiver_address: getAddressString(),
//         shipping_fee: totals.shipping,
//         subtotal_price: totals.subtotal,
//         discount_price: totals.discount,
//         final_price: totals.final,
//         payment_method: paymentMethod,
//         voucher_code: voucherCode,
//         status: "PENDING",
//       };

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
//     setActiveStep(2);
//     renderAsideCart();
//   });

//   $backToStep1Btn?.addEventListener("click", () => setActiveStep(1));

//   $toStep3Btn?.addEventListener("click", () => {
//     setActiveStep(3);
//     renderConfirm();
//   });

//   $backToStep2Btn?.addEventListener("click", () => setActiveStep(2));

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

//     // ensure stepper
//     setActiveStep(1);

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


import { supabase } from "../api-service/api.js";

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

  const $stepper = document.querySelectorAll(".step[data-step]");

  function formatVND(n) {
    const num = Number(n || 0);
    return num.toLocaleString("vi-VN") + " đ";
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
  const DRAFT_STORAGE_KEY = "techtra_checkout_draft";

  function setActiveStep(step) {
    $stepPanel1.style.display = step === 1 ? "block" : "none";
    $stepPanel2.style.display = step === 2 ? "block" : "none";
    $stepPanel3.style.display = step === 3 ? "block" : "none";

    $stepper.forEach((el) => {
      el.dataset.active = String(el.getAttribute("data-step") === String(step));
    });
  }

  function setCurrentStep(step, { pushHistory = false } = {}) {
    const s = Number(step);
    if (![1, 2, 3].includes(s)) return;

    sessionStorage.setItem(STEP_STORAGE_KEY, String(s));
    setActiveStep(s);

    if (pushHistory) {
      try {
        history.pushState({ checkoutStep: s }, "", window.location.href);
      } catch {
        // ignore
      }
    }
  }

  function restoreStepFromStorage() {
    const raw = sessionStorage.getItem(STEP_STORAGE_KEY);
    const s = raw ? Number(raw) : 1;
    if (![1, 2, 3].includes(s)) return 1;
    return s;
  }

  function persistDraftFromUI() {
    const receiverAddressLine = $receiverAddressLine?.value?.trim() || "";

    const draft = {
      receiverName: $receiverName?.value?.trim() || "",
      receiverPhone: $receiverPhone?.value?.trim() || "",
      receiverEmail: $receiverEmail?.value?.trim() || "",
      receiverAddressLine,
      voucherCode: $voucherCode?.value?.trim() || "",
      paymentMethod:
        document.querySelector('input[name="paymentMethod"]:checked')?.value || "COD",
      // currentVoucher là object nội bộ (được set khi apply voucher)
      currentVoucher,
    };

    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }

  function restoreDraftToUI() {
    try {
      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);

      if ($receiverName && typeof draft.receiverName === "string") {
        $receiverName.value = draft.receiverName;
      }
      if ($receiverPhone && typeof draft.receiverPhone === "string") {
        $receiverPhone.value = draft.receiverPhone;
      }
      if ($receiverEmail && typeof draft.receiverEmail === "string") {
        $receiverEmail.value = draft.receiverEmail;
      }
      if ($receiverAddressLine && typeof draft.receiverAddressLine === "string") {
        $receiverAddressLine.value = draft.receiverAddressLine;
      }

      if ($voucherCode && typeof draft.voucherCode === "string") {
        $voucherCode.value = draft.voucherCode;
      }

      // payment method
      const pm = draft.paymentMethod;
      if (pm) {
        const checked = document.querySelector(
          `input[name="paymentMethod"][value="${pm}"]`
        );
        if (checked) checked.checked = true;
      }

      if (draft.currentVoucher) {
        currentVoucher = draft.currentVoucher;
      }

      // Sync aside/cart totals with restored voucher
      renderAsideCart();
    } catch {
      // ignore
    }
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
    $sumPayment.textContent = paymentMethod === "COD" ? "COD" : "Chuyển khoản";

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

    const { data, error } = await supabase
      .from("v_active_vouchers")
      .select("*")
      .eq("code", trimmed)
      .maybeSingle();

    if (error) throw error;
    return data || null;
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

  async function loadCustomerProfileIfLoggedIn() {
    const customerIdRaw = localStorage.getItem("techtra_customer_id");
    const customerId = customerIdRaw ? Number(customerIdRaw) : null;
    if (!customerId) return;

    const { data, error } = await supabase
      .from("customers")
      .select("name,phone,email,address")
      .eq("id", customerId)
      .single();

    if (error) return;
    if (!data) return;

    $receiverName.value = data.name || "";
    $receiverPhone.value = data.phone || "";
    $receiverEmail.value = data.email || "";
    // Backward: nếu address đang lưu format tự do, mình nhét vào line address.
    $receiverAddressLine.value = data.address || "";
  }

  async function loadOrdersPreview() {
    const customerIdRaw = localStorage.getItem("techtra_customer_id");
    const customerId = customerIdRaw ? Number(customerIdRaw) : null;
    if (!customerId) {
      $ordersEmpty.style.display = "block";
      return;
    }

    const { data, error } = await supabase
      .from("v_orders_full")
      .select("order_code,final_price,status,created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      console.warn("loadOrdersPreview error", error);
      return;
    }

    const list = data || [];
    if (!list.length) {
      $ordersEmpty.style.display = "block";
      return;
    }

    $ordersEmpty.style.display = "none";
    $ordersMount.innerHTML = list
      .map(
        (o) => `
          <div class="history-item">
            <strong>${o.order_code}</strong>
            <span>${o.status} • ${formatVND(o.final_price)} • ${new Date(o.created_at).toLocaleDateString("vi-VN")}</span>
          </div>
        `
      )
      .join("");
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

    const customerIdRaw = localStorage.getItem("techtra_customer_id");
    const customerId = customerIdRaw ? Number(customerIdRaw) : null;

    const totals = calcTotals(cart, currentVoucher);

    try {
      // Create order
      const insertPayload = {
        customer_id: customerId,
        receiver_name: $receiverName.value.trim(),
        receiver_phone: $receiverPhone.value.trim(),
        receiver_email: $receiverEmail.value.trim() || null,
        receiver_address: getAddressString(),
        shipping_fee: totals.shipping,
        subtotal_price: totals.subtotal,
        discount_price: totals.discount,
        final_price: totals.final,
        payment_method: paymentMethod,
        voucher_code: voucherCode,
        status: "PENDING",
      };

      // Khi DB chưa khớp schema, supabase insert sẽ fail; nhưng ta vẫn cố gắng theo naming phổ biến.
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert(insertPayload)
        .select()
        .single();

      if (orderError) throw orderError;

      const orderId = orderData?.id;
      const orderCode = orderData?.order_code || orderData?.code || orderData?.id;

      if (!orderId) throw new Error("Không lấy được id đơn hàng.");

      // Create order items
      const itemsPayload = cart.map((it) => ({
        order_id: orderId,
        product_id: it.id,
        product_name: it.name,
        unit_price: it.price,
        quantity: it.quantity,
        line_total: it.price * it.quantity,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(itemsPayload);
      if (itemsError) throw itemsError;

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
  $applyVoucherBtn?.addEventListener("click", () => {
    applyVoucher().finally(() => {
      persistDraftFromUI();
    });
  });
  $voucherCode?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyVoucher().finally(() => {
        persistDraftFromUI();
      });
    }
  });

  $toStep2Btn?.addEventListener("click", () => {
    const err = validateStep1();
    if (err) {
      $receiverMessage.textContent = err;
      return;
    }
    persistDraftFromUI();
    $receiverMessage.textContent = "";
    setCurrentStep(2, { pushHistory: true });
    renderAsideCart();
  });

  $backToStep1Btn?.addEventListener("click", () => {
    persistDraftFromUI();
    setCurrentStep(1, { pushHistory: true });
  });

  $toStep3Btn?.addEventListener("click", () => {
    persistDraftFromUI();
    setCurrentStep(3, { pushHistory: true });
    renderConfirm();
  });

  $backToStep2Btn?.addEventListener("click", () => {
    persistDraftFromUI();
    setCurrentStep(2, { pushHistory: true });
  });

  // trình duyệt Back/Forward điều khiển step
  window.addEventListener("popstate", (event) => {
    const stepFromHistory = event?.state?.checkoutStep;
    if (![1, 2, 3].includes(Number(stepFromHistory))) return;

    setActiveStep(Number(stepFromHistory));
    // đồng bộ lại input/voucher/payment
    restoreDraftToUI();
    // đảm bảo confirm hiển thị đúng khi quay về step 3
    if (Number(stepFromHistory) === 3) renderConfirm();
  });

  $placeOrderBtn?.addEventListener("click", placeOrder);

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

    // restore draft fields
    restoreDraftToUI();

    if (restoredStep === 3) {
      renderConfirm();
    } else {
      renderAsideCart();
    }

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