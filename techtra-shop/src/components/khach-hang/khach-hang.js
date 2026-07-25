import { supabase } from "../api-service/api.js";

(function () {
  function formatVND(n) {
    const num = Number(n || 0);
    return num.toLocaleString("vi-VN") + " đ";
  }

  const $form = document.getElementById("profileForm");
  const $msg = document.getElementById("profileMessage");

  const $name = document.getElementById("customerName");
  const $phone = document.getElementById("customerPhone");
  const $email = document.getElementById("customerEmail");
  const $address = document.getElementById("customerAddress");

  const $ordersMount = document.getElementById("ordersMount");
  const $ordersEmpty = document.getElementById("ordersEmpty");

  const $rank = document.getElementById("loyaltyRank");
  const $ltv = document.getElementById("loyaltyLtv");
  const $orders = document.getElementById("loyaltyOrders");

  const $vouchersMount = document.getElementById("vouchersMount");
  const $vouchersEmpty = document.getElementById("vouchersEmpty");

  const $loginCta = document.getElementById("loginCta");

  // Convention: sau khi đăng nhập thành công, backend cần set customer_id vào localStorage.
  // Nếu chưa có, trang sẽ hiển thị CTA đăng nhập.
  const customerIdRaw = localStorage.getItem("techtra_customer_id");
  const customerId = customerIdRaw ? Number(customerIdRaw) : null;

  function showLoginCTA() {
    $loginCta.style.display = "flex";
  }

  async function loadCustomer() {
    if (!customerId) return;

    const { data, error } = await supabase
      .from("customers")
      .select("id,name,phone,email,address")
      .eq("id", customerId)
      .single();

    if (error) throw error;
    if (!data) return;

    $name.value = data.name || "";
    $phone.value = data.phone || "";
    $email.value = data.email || "";
    $address.value = data.address || "";
  }

  async function loadOrders() {
    if (!customerId) return;

    const { data, error } = await supabase
      .from("v_orders_full")
      .select("order_code,final_price,status,created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    const list = data || [];
    $ordersMount.innerHTML = "";

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

  async function loadLoyaltyAndVouchers() {
    if (!customerId) return;

    const [loyaltyRes, vouchersRes] = await Promise.all([
      supabase
        .from("v_customer_loyalty")
        .select("rank,ltv,total_orders")
        .eq("customer_id", customerId)
        .single(),
      supabase
        .from("customer_vouchers")
        .select("code,rank,discount_type,discount_value,min_order,max_discount,expires_at,is_active,used_at")
        .eq("customer_id", customerId)
        .order("expires_at", { ascending: true })
        .limit(8),
    ]);

    const loyalty = loyaltyRes.data;
    if (loyaltyRes.error) console.warn("loyalty load failed", loyaltyRes.error);

    if (loyalty) {
      $rank.textContent = loyalty.rank || "—";
      $ltv.textContent = formatVND(loyalty.ltv);
      $orders.textContent = String(loyalty.total_orders || 0);
    }

    if (vouchersRes.error) throw vouchersRes.error;

    const vouchers = vouchersRes.data || [];
    $vouchersMount.innerHTML = "";

    if (!vouchers.length) {
      $vouchersEmpty.style.display = "block";
      return;
    }

    $vouchersEmpty.style.display = "none";
    $vouchersMount.innerHTML = vouchers
      .filter((v) => v.is_active)
      .map(
        (v) => `
          <div class="voucher-item">
            <strong>${v.code}</strong>
            <span>
              ${v.rank || ""} • ${v.discount_type || ""} ${v.discount_value || 0}
              • Hạn: ${v.expires_at ? new Date(v.expires_at).toLocaleDateString("vi-VN") : "—"}
            </span>
          </div>
        `
      )
      .join("");

    if (!$vouchersMount.innerHTML) $vouchersEmpty.style.display = "block";
  }

  async function saveProfile(e) {
    e.preventDefault();
    $msg.textContent = "Đang lưu...";

    try {
      if (!customerId) throw new Error("Chưa đăng nhập");

      const payload = {
        name: $name.value.trim() || null,
        phone: $phone.value.trim() || null,
        email: $email.value.trim() || null,
        address: $address.value.trim() || null,
      };

      const { error } = await supabase.from("customers").update(payload).eq("id", customerId);
      if (error) throw error;

      $msg.textContent = "Lưu thành công.";
      setTimeout(() => ($msg.textContent = ""), 1500);
    } catch (err) {
      console.error(err);
      $msg.textContent = err.message || "Có lỗi khi lưu.";
    }
  }

  $form?.addEventListener("submit", saveProfile);

  document.addEventListener("DOMContentLoaded", async () => {
    if (!customerId) {
      showLoginCTA();
      return;
    }

    try {
      await Promise.all([loadCustomer(), loadOrders(), loadLoyaltyAndVouchers()]);
    } catch (err) {
      console.error(err);
      $msg.textContent = "Không thể tải dữ liệu khách hàng.";
    }
  });
})();
