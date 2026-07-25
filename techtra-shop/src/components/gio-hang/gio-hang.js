import { supabase } from "../api-service/api.js";

(function () {
  const CART_KEY = "techtra_cart";
  const SHIPPING_FREE_THRESHOLD = 500000;
  const SHIPPING_DEFAULT_FEE = 20000;

  const $mount = document.getElementById("cartItemsMount");
  const $empty = document.getElementById("cartEmptyState");

  const $subtotal = document.getElementById("cartSubtotal");
  const $shipping = document.getElementById("cartShipping");
  const $discount = document.getElementById("cartDiscount");
  const $final = document.getElementById("cartFinal");

  const $voucherCode = document.getElementById("voucherCode");
  const $applyVoucherBtn = document.getElementById("applyVoucherBtn");
  const $voucherMessage = document.getElementById("voucherMessage");

  const $checkoutBtn = document.getElementById("checkoutBtn");
  const $clearCartBtn = document.getElementById("clearCartBtn");

  const $ordersPreviewMount = document.getElementById("ordersPreviewMount");
  const $ordersPreviewList = document.getElementById("ordersPreviewList");

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function setCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function formatVND(n) {
    const num = Number(n || 0);
    return num.toLocaleString("vi-VN") + " đ";
  }

  function normalizeCartItem(item) {
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      image: item.image,
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
    };
  }

  function calcTotals(cart, voucher) {
    const items = cart.map(normalizeCartItem);
    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);

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

  async function loadVoucherByCode(code) {
    if (!code) return null;
    const trimmed = String(code).trim();
    if (!trimmed) return null;

    // NOTE: voucher code validate dùng v_active_vouchers (đã tạo trong SQL)
    const { data, error } = await supabase
      .from("v_active_vouchers")
      .select("*")
      .eq("code", trimmed)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  function renderCart() {
    const cart = getCart();
    const items = cart.map(normalizeCartItem);

    if (!items.length) {
      $mount.innerHTML = "";
      $empty.style.display = "block";
      $ordersPreviewMount.style.display = "none";
      $subtotal.textContent = formatVND(0);
      $shipping.textContent = formatVND(0);
      $discount.textContent = formatVND(0);
      $final.textContent = formatVND(0);
      return;
    }

    $empty.style.display = "none";

    // Render items
    $mount.innerHTML = items
      .map((it) => {
        const img = it.image || "https://placehold.co/96x96?text=SP";
        return `
          <div class="cart-row">
            <div class="col-product">
              <div class="item-product">
                <img src="${img}" alt="${it.name || "SP"}" />
                <div class="item-meta">
                  <a href="/components/san-pham/san-pham.html?slug=${encodeURIComponent(it.slug || it.id)}">${it.name || "Sản phẩm"}</a>
                  <small>${it.slug ? "SKU: " + it.slug : ""}</small>
                </div>
              </div>
            </div>
            <div class="col-price item-total"><strong>${formatVND(it.price)}</strong></div>
            <div class="col-qty">
              <div class="qty-control">
                <button type="button" data-action="minus" data-id="${it.id}">-</button>
                <div class="qty" data-qty="${it.id}">${it.quantity}</div>
                <button type="button" data-action="plus" data-id="${it.id}">+</button>
              </div>
            </div>
            <div class="col-total item-total"><strong>${formatVND(it.price * it.quantity)}</strong></div>
            <div class="col-action">
              <button type="button" class="btn btn-ghost" data-action="remove" data-id="${it.id}">Xoá</button>
            </div>
          </div>
        `;
      })
      .join("");

    // Totals without voucher by default
    const totals = calcTotals(items, null);
    $subtotal.textContent = formatVND(totals.subtotal);
    $shipping.textContent = formatVND(totals.shipping);
    $discount.textContent = formatVND(0);
    $final.textContent = formatVND(totals.final);

    // Bind actions
    $mount.onclick = async (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");
      const id = btn.getAttribute("data-id");

      const cartNow = getCart().map(normalizeCartItem);
      const idx = cartNow.findIndex((x) => String(x.id) === String(id));
      if (idx === -1) return;

      if (action === "minus") {
        cartNow[idx].quantity -= 1;
        if (cartNow[idx].quantity <= 0) cartNow.splice(idx, 1);
      } else if (action === "plus") {
        cartNow[idx].quantity += 1;
      } else if (action === "remove") {
        cartNow.splice(idx, 1);
      }

      setCart(cartNow);
      // After cart change, re-render and reset voucher message
      $voucherMessage.textContent = "";
      $voucherMessage.className = "voucher-message";
      renderCart();
    };
  }

  let lastVoucher = null;

  async function applyVoucher() {
    const code = $voucherCode.value;
    $voucherMessage.textContent = "Đang kiểm tra...";

    try {
      const voucher = await loadVoucherByCode(code);
      if (!voucher) {
        lastVoucher = null;
        $voucherMessage.textContent = "Voucher không hợp lệ hoặc đã hết hạn.";
        renderTotalsWithVoucher();
        return;
      }
      lastVoucher = {
        discount_type: voucher.discount_type,
        discount_value: voucher.discount_value,
        min_order: voucher.min_order,
        max_discount: voucher.max_discount,
      };
      $voucherMessage.textContent = "Áp dụng thành công.";
      renderTotalsWithVoucher();
    } catch (err) {
      console.error(err);
      lastVoucher = null;
      $voucherMessage.textContent = "Có lỗi khi áp dụng voucher.";
    }
  }

  function renderTotalsWithVoucher() {
    const cart = getCart().map(normalizeCartItem);
    const totals = calcTotals(cart, lastVoucher);
    $subtotal.textContent = formatVND(totals.subtotal);
    $shipping.textContent = formatVND(totals.shipping);
    $discount.textContent = formatVND(totals.discount);
    $final.textContent = formatVND(totals.final);
  }

  async function loadOrdersPreviewIfLoggedIn() {
    // Tài khoản shop dùng backend login, nhưng FE đang dùng supabase anon key.
    // Vì vậy ở đây chỉ hiển thị preview nếu localStorage có customer_id.
    const customerId = localStorage.getItem("techtra_customer_id");
    if (!customerId) return;

    const { data, error } = await supabase
      .from("v_orders_full")
      .select("order_code, final_price, status, payment_method, created_at")
      .eq("customer_id", Number(customerId))
      .order("created_at", { ascending: false })
      .limit(4);

    if (error) {
      console.warn("load orders preview failed", error);
      return;
    }

    if (!data?.length) return;

    $ordersPreviewMount.style.display = "block";
    $ordersPreviewList.innerHTML = data
      .map((o) => `
        <div class="history-item">
          <strong>${o.order_code}</strong>
          <span>${o.status} • ${formatVND(o.final_price)} • ${new Date(o.created_at).toLocaleDateString("vi-VN")}</span>
        </div>
      `)
      .join("");
  }

  function clearCart() {
    localStorage.removeItem(CART_KEY);
    lastVoucher = null;
    $voucherCode.value = "";
    $voucherMessage.textContent = "";
    renderCart();
  }

  function checkout() {
    const cart = getCart();
    if (!cart.length) {
      alert("Giỏ hàng đang trống.");
      return;
    }

    // Save to buynow key then redirect to checkout page
    localStorage.setItem("techtra_buynow", JSON.stringify(cart.map(normalizeCartItem)));
    window.location.href = "/components/thanh-toan/thanh-toan.html";
  }

  // Hook events
  $applyVoucherBtn?.addEventListener("click", applyVoucher);
  $voucherCode?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyVoucher();
  });

  $checkoutBtn?.addEventListener("click", checkout);
  $clearCartBtn?.addEventListener("click", clearCart);

  document.addEventListener("DOMContentLoaded", () => {
    renderCart();
    renderTotalsWithVoucher();
    loadOrdersPreviewIfLoggedIn();
  });
})();
