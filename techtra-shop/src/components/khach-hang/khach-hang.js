import { customersApi, request } from "../api-service/api.js";

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
  const $logoutBtn = document.getElementById("logoutBtn");

  // OTP elements
  const $sendPhoneOtpBtn = document.getElementById("sendPhoneOtpBtn");
  const $verifyPhoneOtpBtn = document.getElementById("verifyPhoneOtpBtn");
  const $phoneOtpCode = document.getElementById("phoneOtpCode");
  const $phoneOtpWrap = document.getElementById("phoneOtpWrap");
  const $phoneOtpHint = document.getElementById("phoneOtpHint");
  const $phoneVerifiedBadge = document.getElementById("phoneVerifiedBadge");

  const $sendEmailOtpBtn = document.getElementById("sendEmailOtpBtn");
  const $verifyEmailOtpBtn = document.getElementById("verifyEmailOtpBtn");
  const $emailOtpCode = document.getElementById("emailOtpCode");
  const $emailOtpWrap = document.getElementById("emailOtpWrap");
  const $emailOtpHint = document.getElementById("emailOtpHint");
  const $emailVerifiedBadge = document.getElementById("emailVerifiedBadge");

  // State lưu giá trị phone/email ban đầu (để check isDirty)
  const original = { phone: "", email: "" };

  // State OTP: đã verify hay chưa
  const verification = {
    phone: { verified: false, cooldownTimer: null, pendingValue: "" },
    email: { verified: false, cooldownTimer: null, pendingValue: "" },
  };

  const COOLDOWN_SECS = 60;

  // Convention: sau khi đăng nhập thành công, dang-nhap.js set cả 2 key:
  //   - techtra_customer_id : id dạng số (để query Supabase)
  //   - techtra_user        : JSON { id, name, email, phone, role, loggedInAt }
  // Nếu chưa có, trang sẽ hiển thị CTA đăng nhập.
  function readLoggedInCustomerId() {
    try {
      const raw = localStorage.getItem("techtra_customer_id");
      if (raw && Number(raw)) return Number(raw);
    } catch (_) {}
    try {
      const u = JSON.parse(localStorage.getItem("techtra_user") || "null");
      if (u && (u.id || u.customer_id)) return Number(u.id || u.customer_id);
    } catch (_) {}
    return null;
  }

  const customerId = readLoggedInCustomerId();

  function showLoginCTA() {
    $loginCta.style.display = "flex";
  }

  function logout() {
    try {
      localStorage.removeItem("techtra_customer_id");
      localStorage.removeItem("techtra_user");
      localStorage.removeItem("techtra_cart");
      localStorage.removeItem("techtra_buynow");
    } catch (_) {}
    location.href = "/components/dang-nhap/dangnhap.html";
  }

  async function loadCustomer() {
    if (!customerId) return;

    const r = await request(
      "GET",
      `/db/customers?select=id,name,phone,email,address&id=eq.${customerId}&limit=1`
    );
    const data = (r.data || [])[0];
    if (!data) return;

    $name.value = data.name || "";
    $phone.value = data.phone || "";
    $email.value = data.email || "";
    $address.value = data.address || "";

    // Lưu giá trị ban đầu để so sánh isDirty
    original.phone = String(data.phone || "").trim();
    original.email = String(data.email || "").trim();

    // KH đã có phone/email trong DB → coi như verified (đã xác nhận lúc đăng ký)
    verification.phone.verified = !!original.phone;
    verification.email.verified = !!original.email;
    verification.phone.pendingValue = original.phone;
    verification.email.pendingValue = original.email;
    updateUiForVerification();

    // Khi input thay đổi, nếu khác giá trị ban đầu → reset verified
    $phone.addEventListener("input", onFieldChanged);
    $email.addEventListener("input", onFieldChanged);
  }

  // Khi user sửa phone/email → nếu khác giá trị DB ban đầu → reset verified
  function onFieldChanged(e) {
    const id = e.target.id;
    const field = id === "customerPhone" ? "phone" : id === "customerEmail" ? "email" : null;
    if (!field) return;
    const current = String(e.target.value || "").trim();
    const orig = original[field];
    if (current !== orig) {
      // Giá trị đã đổi → yêu cầu verify lại
      verification[field].verified = false;
      verification[field].pendingValue = current;
    } else {
      // Trở về giá trị ban đầu → giữ nguyên verified
      verification[field].verified = !!orig;
    }
    updateUiForVerification();
  }

  function updateUiForVerification() {
    // Phone
    if (verification.phone.verified) {
      $phoneVerifiedBadge.hidden = false;
      $phoneVerifiedBadge.textContent = "✓ Đã xác thực";
      $phoneVerifiedBadge.classList.remove("is-pending");
      $sendPhoneOtpBtn.disabled = true;
    } else {
      $phoneVerifiedBadge.hidden = true;
      $sendPhoneOtpBtn.disabled = false;
    }
    // Email
    if (verification.email.verified) {
      $emailVerifiedBadge.hidden = false;
      $emailVerifiedBadge.textContent = "✓ Đã xác thực";
      $emailVerifiedBadge.classList.remove("is-pending");
      $sendEmailOtpBtn.disabled = true;
    } else {
      $emailVerifiedBadge.hidden = true;
      $sendEmailOtpBtn.disabled = false;
    }
  }

  async function loadOrders() {
    if (!customerId) return;

    // Backend không có view v_orders_full → query trực tiếp /api/orders rồi filter customer_id phía client.
    const r = await request("GET", `/orders?status=all&limit=500`);
    const list = (r.data || [])
      .filter((o) => Number(o.customer_id) === Number(customerId))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

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
            <strong>${o.order_code || ("#" + o.id)}</strong>
            <span>${o.status || ""} • ${formatVND(o.final_price)} • ${new Date(o.created_at).toLocaleDateString("vi-VN")}</span>
          </div>
        `
      )
      .join("");
  }

  async function loadLoyaltyAndVouchers() {
    if (!customerId) return;

    const [loyaltyRes, vouchersRes] = await Promise.all([
      request(
        "GET",
        `/db/v_customer_loyalty?select=rank,ltv,total_orders&customer_id=eq.${customerId}&limit=1`
      ),
      request(
        "GET",
        `/db/customer_vouchers?select=code,rank,discount_type,discount_value,min_order,max_discount,expires_at,is_active,used_at&customer_id=eq.${customerId}&order=expires_at.asc&limit=8`
      ),
    ]);

    const loyalty = (loyaltyRes.data || [])[0];
    if (loyalty) {
      $rank.textContent = loyalty.rank || "—";
      $ltv.textContent = formatVND(loyalty.ltv);
      $orders.textContent = String(loyalty.total_orders || 0);
    }

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

      const newPhone = $phone.value.trim();
      const newEmail = $email.value.trim();

      // Validate email format nếu có
      if (newEmail) {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(newEmail)) throw new Error("Email không đúng định dạng.");
      }
      // Validate phone format nếu có
      if (newPhone) {
        const phoneRe = /^(0|\+84)?\d{9,10}$/;
        if (!phoneRe.test(newPhone.replace(/\s/g, ""))) {
          throw new Error("Số điện thoại không đúng định dạng.");
        }
      }

      // Nếu phone đổi → yêu cầu verify
      if (newPhone !== original.phone && !verification.phone.verified) {
        throw new Error("Vui lòng xác nhận SĐT bằng mã OTP trước khi lưu.");
      }
      if (newEmail !== original.email && !verification.email.verified) {
        throw new Error("Vui lòng xác nhận Email bằng mã OTP trước khi lưu.");
      }

      // Chỉ set field đã thay đổi (tránh ghi đè verified field không đổi)
      const payload = { name: $name.value.trim() || null, address: $address.value.trim() || null };
      if (newPhone !== original.phone) payload.phone = newPhone || null;
      if (newEmail !== original.email) payload.email = newEmail || null;

      await request("PATCH", "/db/customers", { set: payload, where: { id: customerId } });

      // Cập nhật lại original sau khi lưu thành công
      original.phone = newPhone;
      original.email = newEmail;
      verification.phone.verified = !!newPhone;
      verification.email.verified = !!newEmail;
      updateUiForVerification();

      $msg.textContent = "Lưu thành công.";
      setTimeout(() => ($msg.textContent = ""), 1500);
    } catch (err) {
      console.error(err);
      $msg.textContent = err.message || "Có lỗi khi lưu.";
    }
  }

  // ─── OTP handlers ───────────────────────────────────────────────────────────

  // Đếm ngược cho nút "Gửi mã"
  function startCooldown(field) {
    const btn = field === "phone" ? $sendPhoneOtpBtn : $sendEmailOtpBtn;
    const v = verification[field];
    if (v.cooldownTimer) clearInterval(v.cooldownTimer);
    let remaining = COOLDOWN_SECS;
    btn.disabled = true;
    const label = field === "phone" ? "Gửi mã" : "Gửi mã";
    btn.textContent = `${label} (${remaining}s)`;
    v.cooldownTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(v.cooldownTimer);
        v.cooldownTimer = null;
        btn.disabled = verification[field].verified;
        btn.textContent = label;
      } else {
        btn.textContent = `${label} (${remaining}s)`;
      }
    }, 1000);
  }

  async function handleSendOtp(field) {
    const value = (field === "phone" ? $phone : $email).value.trim();
    if (!value) {
      $msg.textContent = field === "phone" ? "Vui lòng nhập SĐT." : "Vui lòng nhập Email.";
      return;
    }
    const type = field === "phone" ? "zalo" : "email";
    const btn = field === "phone" ? $sendPhoneOtpBtn : $sendEmailOtpBtn;
    const wrap = field === "phone" ? $phoneOtpWrap : $emailOtpWrap;
    const hint = field === "phone" ? $phoneOtpHint : $emailOtpHint;

    btn.disabled = true;
    hint.textContent = "Đang gửi mã...";

    try {
      if (typeof window.sendVerificationCode !== "function") {
        throw new Error("sendCode.js chưa load. Hãy đảm bảo script được nhúng trước.");
      }
      const result = await window.sendVerificationCode(value, type);
      hint.textContent = result?.message || "Mã đã được gửi. Mã có hiệu lực 5 phút.";
      wrap.hidden = false;
      verification[field].pendingValue = value;
      startCooldown(field);
    } catch (err) {
      console.error("[OTP send]", err);
      hint.textContent = err.message || "Không gửi được mã.";
      btn.disabled = false;
    }
  }

  async function handleVerifyOtp(field) {
    const codeInp = field === "phone" ? $phoneOtpCode : $emailOtpCode;
    const wrap = field === "phone" ? $phoneOtpWrap : $emailOtpWrap;
    const hint = field === "phone" ? $phoneOtpHint : $emailOtpHint;
    const value = (field === "phone" ? $phone : $email).value.trim();
    const code = codeInp.value.trim();

    if (!code || code.length !== 6) {
      hint.textContent = "Vui lòng nhập mã 6 số.";
      return;
    }
    const type = field === "phone" ? "zalo" : "email";

    hint.textContent = "Đang xác nhận...";
    try {
      if (typeof window.verifyCode !== "function") {
        throw new Error("sendCode.js chưa load.");
      }
      await window.verifyCode(value, code, type);
      // Verify OK
      verification[field].verified = true;
      verification[field].pendingValue = value;
      hint.textContent = "✓ Xác nhận thành công.";
      hint.style.color = "#16a34a";
      wrap.classList.add("is-success");
      // Ẩn input OTP sau 1s
      setTimeout(() => {
        wrap.hidden = true;
        codeInp.value = "";
        hint.style.color = "";
        wrap.classList.remove("is-success");
      }, 1200);
      updateUiForVerification();
    } catch (err) {
      console.error("[OTP verify]", err);
      hint.textContent = err.message || "Mã không đúng hoặc đã hết hạn.";
      hint.style.color = "#dc2626";
      setTimeout(() => { hint.style.color = ""; }, 2000);
    }
  }

  $sendPhoneOtpBtn?.addEventListener("click", () => handleSendOtp("phone"));
  $sendEmailOtpBtn?.addEventListener("click", () => handleSendOtp("email"));
  $verifyPhoneOtpBtn?.addEventListener("click", () => handleVerifyOtp("phone"));
  $verifyEmailOtpBtn?.addEventListener("click", () => handleVerifyOtp("email"));

  // Enter trên input OTP → trigger verify
  $phoneOtpCode?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleVerifyOtp("phone"); }
  });
  $emailOtpCode?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleVerifyOtp("email"); }
  });

  $form?.addEventListener("submit", saveProfile);
  $logoutBtn?.addEventListener("click", logout);

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
