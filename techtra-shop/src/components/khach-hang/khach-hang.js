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
  const original = { name: "", phone: "", email: "", address: "" };

  // State OTP: đã verify hay chưa
  const verification = {
    phone: { verified: false, cooldownTimer: null, pendingValue: "" },
    email: { verified: false, cooldownTimer: null, pendingValue: "" },
  };

  const COOLDOWN_SECS = 60;

  // Click trực tiếp vào input → vào chế độ chỉnh sửa (xoá readonly, select-all).
  // Khi blur → tự lưu field đó (nếu đã verify phone/email).
  function enableEdit(inputId, selectAll = true) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.removeAttribute("readonly");
    if (selectAll) {
      // Select-all để user gõ đè nhanh; nếu trống thì chỉ focus.
      const v = input.value || "";
      input.focus();
      try { input.setSelectionRange(0, v.length); } catch (_) { /* type không hỗ trợ */ }
    }
    if (inputId === "customerPhone" || inputId === "customerEmail") {
      const field = inputId === "customerPhone" ? "phone" : "email";
      // Nếu user click vào field đã có value khác DB → reset verified
      const current = String(input.value || "").trim();
      if (current !== original[field]) {
        verification[field].verified = false;
        verification[field].pendingValue = current;
      }
      const sendBtn = document.getElementById(inputId === "customerPhone" ? "sendPhoneOtpBtn" : "sendEmailOtpBtn");
      if (sendBtn) sendBtn.hidden = false;
      updateUiForVerification();
    }
    // Đổi nhãn nút "Đổi" → "Hủy" để user có exit có chủ đích
    const btn = document.querySelector(`.btn-edit[data-target="${inputId}"]`);
    if (btn) {
      btn.textContent = "Hủy";
      btn.classList.add("btn-edit-cancel");
    }
  }

  function revertToOriginal(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.setAttribute("readonly", "true");
    const key = inputId === "customerName" ? "name"
      : inputId === "customerPhone" ? "phone"
      : inputId === "customerEmail" ? "email"
      : "address";
    input.value = original[key] || "";
    if (inputId === "customerPhone" || inputId === "customerEmail") {
      const field = inputId === "customerPhone" ? "phone" : "email";
      const sendBtn = document.getElementById(inputId === "customerPhone" ? "sendPhoneOtpBtn" : "sendEmailOtpBtn");
      if (sendBtn) sendBtn.hidden = true;
      verification[field].verified = !!original[field];
      verification[field].pendingValue = original[field];
      const wrap = document.getElementById(inputId === "customerPhone" ? "phoneOtpWrap" : "emailOtpWrap");
      if (wrap) wrap.hidden = true;
      updateUiForVerification();
    }
  }

  // Click trực tiếp vào input (readonly) → vào edit mode (clear-and-type).
  [$name, $phone, $email, $address].forEach((inp) => {
    inp.addEventListener("click", () => {
      if (inp.hasAttribute("readonly")) {
        enableEdit(inp.id, true);
      }
    });
  });

  // Nút "Đổi" / "Hủy" vẫn giữ như phương án dự phòng (accessibility).
  document.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-target");
      if (!target) return;
      if (btn.classList.contains("btn-edit-cancel")) {
        revertToOriginal(target);
        btn.textContent = "Đổi";
        btn.classList.remove("btn-edit-cancel");
      } else {
        enableEdit(target, true);
      }
    });
  });

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

    // Fallback 1: đọc từ techtra_user localStorage (luôn có sau khi đăng nhập).
    let cachedUser = null;
    try { cachedUser = JSON.parse(localStorage.getItem("techtra_user") || "null"); } catch (_) {}

    let data = null;
    try {
      const r = await request(
        "GET",
        `/db/customers?select=id,name,phone,email,address&id=eq.${customerId}&limit=1`
      );
      data = (r.data || [])[0];
    } catch (err) {
      console.warn("[loadCustomer] DB fetch failed, dùng cache localStorage", err);
    }

    // Ưu tiên data từ DB; nếu thiếu trường nào thì lấy từ cachedUser.
    const name    = (data?.name    ?? cachedUser?.name  ?? "") || "";
    const phone   = (data?.phone   ?? cachedUser?.phone ?? "") || "";
    const email   = (data?.email   ?? cachedUser?.email ?? "") || "";
    const address = (data?.address ?? "") || "";

    $name.value = name;
    $phone.value = phone;
    $email.value = email;
    $address.value = address;

    // Lưu giá trị ban đầu để so sánh isDirty
    original.name = String(name).trim();
    original.phone = String(phone).trim();
    original.email = String(email).trim();
    original.address = String(address).trim();

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

    // Backend không có view v_orders_full → query trực tiếp /api/orders rồi filter phía client.
    // Fallback theo phone/email để hiện cả đơn cũ chưa liên kết customer_id.
    const r = await request("GET", `/orders?status=all&limit=500`);
    const normalizePhone = (p) => String(p || '').replace(/\D/g, '').replace(/^84/, '0');

    let userPhone = '';
    let userEmail = '';
    try {
      const u = JSON.parse(localStorage.getItem("techtra_user") || "null");
      userPhone = u?.phone || '';
      userEmail = u?.email || '';
    } catch (_) {}

    const myPhone = normalizePhone(userPhone);
    const myEmail = String(userEmail).toLowerCase();
    const list = (r.data || [])
      .filter((o) => {
        if (Number(o.customer_id) === Number(customerId)) return true;
        const orderPhone = normalizePhone(o.customer_phone || o.receiver_phone || o.phone || '');
        if (myPhone && orderPhone === myPhone) return true;
        const orderEmail = String(o.receiver_email || o.email || '').toLowerCase();
        if (myEmail && orderEmail === myEmail) return true;
        return false;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    $ordersMount.innerHTML = "";

    if (!list.length) {
      $ordersEmpty.style.display = "block";
      return;
    }

    // Lấy danh sách sản phẩm trong các đơn (order_items) + slug của product để click.
    // list đã slice 10 → orderIds ≤ 10 và productIds cũng nhỏ → không cần chunk.
    const orderIds = list.map((o) => o.id).filter(Boolean);
    let itemsByOrder = {};
    let slugByProduct = {};

    if (orderIds.length) {
      try {
        const itemsRes = await request(
          "GET",
          `/db/order_items?select=order_id,product_id,product_name,image_url,quantity&order_id=in.(${orderIds.join(",")})&limit=100`
        );
        const allItems = itemsRes.data || [];
        itemsByOrder = allItems.reduce((acc, it) => {
          (acc[it.order_id] = acc[it.order_id] || []).push(it);
          return acc;
        }, {});

        const productIds = Array.from(
          new Set(allItems.map((it) => it.product_id).filter(Boolean))
        );
        if (productIds.length) {
          const productsRes = await request(
            "GET",
            `/db/products?select=id,slug&id=in.(${productIds.join(",")})&limit=200`
          );
          (productsRes.data || []).forEach((p) => {
            slugByProduct[p.id] = p.slug;
          });
        }
      } catch (err) {
        console.warn("[loadOrders] items fetch failed", err);
      }
    }

    $ordersEmpty.style.display = "none";
    $ordersMount.innerHTML = list
      .map((o) => {
        const items = itemsByOrder[o.id] || [];
        const productsHtml = items.length
          ? `<ul class="history-products">${items
              .map((it) => {
                const slug = slugByProduct[it.product_id];
                const href = slug
                  ? `/components/san-pham/san-pham.html?slug=${encodeURIComponent(slug)}`
                  : "#";
                const img = it.image_url
                  ? `<img class="history-thumb" src="${it.image_url}" alt="" loading="lazy" />`
                  : `<span class="history-thumb history-thumb--placeholder"></span>`;
                return `
                  <li>
                    <a href="${href}"${slug ? '' : ' onclick="event.preventDefault()"'}>
                      ${img}
                      <span class="history-product-name">${escapeHtml(it.product_name || "Sản phẩm")}</span>
                      <em class="history-qty">x${Number(it.quantity || 1)}</em>
                    </a>
                  </li>
                `;
              })
              .join("")}</ul>`
          : `<div class="history-products-empty">Không có sản phẩm trong đơn.</div>`;
        return `
          <div class="history-item">
            <div class="history-head">
              <strong>${escapeHtml(o.order_code || ("#" + o.id))}</strong>
              <span>${escapeHtml(o.status || "")} • ${formatVND(o.final_price)} • ${new Date(o.created_at).toLocaleDateString("vi-VN")}</span>
            </div>
            ${productsHtml}
          </div>
        `;
      })
      .join("");
  }

  // Escape HTML an toàn cho string user/DB render ra DOM
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

    // request() trả về { success, data } hoặc { data }
    const loyaltyRows = loyaltyRes?.data || loyaltyRes || [];
    const loyalty = (Array.isArray(loyaltyRows) ? loyaltyRows : [loyaltyRows])[0];
    if (loyalty) {
      $rank.textContent = loyalty.rank || "—";
      $ltv.textContent = formatVND(loyalty.ltv);
      $orders.textContent = String(loyalty.total_orders || 0);
    }

    const vouchersRaw = vouchersRes?.data || vouchersRes || [];
    const vouchers = Array.isArray(vouchersRaw) ? vouchersRaw : [vouchersRaw];
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
      original.name = $name.value.trim();
      original.phone = newPhone;
      original.email = newEmail;
      original.address = $address.value.trim();
      verification.phone.verified = !!newPhone;
      verification.email.verified = !!newEmail;

      // Khóa lại các input và đổi nút "Hủy" → "Đổi"
      [$name, $phone, $email, $address].forEach((input) => input.setAttribute("readonly", "true"));
      document.querySelectorAll(".btn-edit").forEach((btn) => {
        btn.textContent = "Đổi";
        btn.classList.remove("btn-edit-cancel");
      });
      $sendPhoneOtpBtn.hidden = true;
      $sendEmailOtpBtn.hidden = true;
      $phoneOtpWrap.hidden = true;
      $emailOtpWrap.hidden = true;

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

  // Auto-save đơn giản: name/address (không cần OTP) → lưu ngay khi blur
  // nếu giá trị thay đổi so với ban đầu. Phone/email vẫn phải bấm "Lưu".
  function autoSaveSimpleField(field) {
    if (!customerId) return;
    const inp = field === "name" ? $name : $address;
    const v = inp.value.trim();
    if (v === (original[field] || "")) return;
    request("PATCH", "/db/customers", {
      set: { [field]: v || null },
      where: { id: customerId },
    })
      .then(() => {
        original[field] = v;
        inp.setAttribute("readonly", "true");
        const btn = document.querySelector(`.btn-edit[data-target="customer${field[0].toUpperCase() + field.slice(1)}"]`);
        if (btn) { btn.textContent = "Đổi"; btn.classList.remove("btn-edit-cancel"); }
        flashMsg("Đã lưu.");
      })
      .catch((err) => {
        console.error(`[autoSave ${field}]`, err);
        flashMsg(`Lỗi: ${err.message}`, true);
        // Revert
        inp.value = original[field] || "";
      });
  }
  function flashMsg(text, isError = false) {
    $msg.textContent = text;
    $msg.style.color = isError ? "#dc2626" : "#16a34a";
    setTimeout(() => {
      $msg.textContent = "";
      $msg.style.color = "";
    }, 1500);
  }
  $name?.addEventListener("blur", () => autoSaveSimpleField("name"));
  $address?.addEventListener("blur", () => autoSaveSimpleField("address"));

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
