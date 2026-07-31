/* ============================================
   TECHTRA - QUÊN MẬT KHẨU (dùng OTP qua email)
   - Bước 1: TechnoraOtp.send(email, 'email', 'reset_password') → gửi OTP 6 số
   - Bước 2: TechnoraOtp.verify(email, 'email', 'reset_password', code)
   - Bước 3: POST /api/auth/reset-password { email, newPassword }
     (backend tự verify OTP qua cookie/identifier? — không, body giờ chỉ cần email + newPassword
      vì OTP đã verify ở bước 2)
   ============================================ */

document.addEventListener('DOMContentLoaded', async function () {
    const form = document.getElementById('forgotPasswordForm');
    const messageDiv = document.getElementById('message');
    const submitBtn = document.getElementById('submitBtn');

    // Auto-fill email nếu trang được mở từ modal quên mật khẩu với ?email=...
    try {
        const qs = new URLSearchParams(location.search);
        const preEmail = qs.get('email');
        if (preEmail) {
            const emailInput = document.getElementById('email');
            if (emailInput) {
                emailInput.value = preEmail;
                emailInput.setAttribute('readonly', 'readonly');
            }
        }
    } catch (_) {}

    // === Backend helpers ===
    async function apiPost(path, body) {
        const res = await fetch(`/api${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body || {}),
        });
        let json = null;
        try { json = await res.json(); } catch (_) {}
        if (!res.ok || (json && json.success === false)) {
            throw new Error(json?.error || `Lỗi máy chủ (HTTP ${res.status})`);
        }
        return json;
    }

    function showMessage(message, type) {
        messageDiv.className = 'auth-message is-show ' + (type || 'info');
        const icon = type === 'success'
            ? 'fa-circle-check'
            : type === 'error'
                ? 'fa-circle-exclamation'
                : 'fa-circle-info';
        messageDiv.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
    }

    function setLoading(loading) {
        submitBtn.disabled = loading;
        submitBtn.innerHTML = loading
            ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Đang xử lý...</span>'
            : '<i class="fa-solid fa-paper-plane"></i><span>Đặt lại mật khẩu</span>';
    }

    // ─── Render inline UI: nhập OTP 6 số + MK mới ──────────────────
    function ensureResetForm(email) {
        let $reset = document.getElementById('resetInlineWrap');
        if ($reset) return;

        $reset = document.createElement('div');
        $reset.id = 'resetInlineWrap';
        $reset.style.marginTop = '14px';
        $reset.innerHTML = `
          <div style="font-weight:800;margin-bottom:8px;">Đặt lại mật khẩu cho ${email}</div>

          <div class="form-row" style="margin-bottom:10px;">
            <label style="display:block;margin-bottom:6px;">Mã OTP đã gửi về email</label>
            <input id="resetOtpCode" type="text" inputmode="numeric" maxlength="6"
                   placeholder="Nhập mã 6 số"
                   style="width:100%;padding:10px;border-radius:10px;border:1px solid #e5e7eb;letter-spacing:4px;font-size:18px;text-align:center;" />
          </div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <div style="flex:1;min-width:220px;">
              <label style="display:block;margin-bottom:6px;">Mật khẩu mới (tối thiểu 6 ký tự)</label>
              <input id="resetNewPassword" type="password" placeholder="Nhập mật khẩu mới"
                     style="width:100%;padding:10px;border-radius:10px;border:1px solid #e5e7eb;" />
            </div>
            <div style="flex:1;min-width:220px;">
              <label style="display:block;margin-bottom:6px;">Xác nhận mật khẩu</label>
              <input id="resetConfirmPassword" type="password" placeholder="Nhập lại mật khẩu"
                     style="width:100%;padding:10px;border-radius:10px;border:1px solid #e5e7eb;" />
            </div>
          </div>

          <button type="button" id="doResetBtn"
                  style="margin-top:10px;padding:10px 14px;border:none;border-radius:12px;background:#111827;color:#fff;cursor:pointer;">
            Xác nhận đặt lại
          </button>
        `;
        form.appendChild($reset);

        const btn  = document.getElementById('doResetBtn');
        const code = document.getElementById('resetOtpCode');
        const np   = document.getElementById('resetNewPassword');
        const cnp  = document.getElementById('resetConfirmPassword');

        // Auto-submit khi nhập đủ 6 số
        code?.addEventListener('input', () => {
            if (code.value.length === 6) btn.click();
        });

        btn?.addEventListener('click', async () => {
            const otp = (code?.value || '').trim();
            const npw = (np?.value || '').trim();
            const cnpw = (cnp?.value || '').trim();

            if (!/^\d{6}$/.test(otp)) {
                showMessage('Vui lòng nhập mã OTP 6 chữ số.', 'error');
                code?.focus();
                return;
            }
            if (!npw || npw.length < 6) {
                showMessage('Mật khẩu mới phải có tối thiểu 6 ký tự.', 'error');
                np?.focus();
                return;
            }
            if (npw !== cnpw) {
                showMessage('Mật khẩu xác nhận không khớp.', 'error');
                cnp?.focus();
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Đang đặt lại...';

            try {
                // Verify OTP trước
                await window.TechnoraOtp.verify(email, 'email', 'reset_password', otp);

                // Nếu verify OK, gửi yêu cầu reset MK qua backend
                await apiPost('/auth/reset-password', { email, newPassword: npw });

                showMessage('✅ Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.', 'success');
                setTimeout(() => (window.location.href = '/components/dang-nhap/dangnhap.html'), 1200);
            } catch (err) {
                console.error('Reset error:', err);
                showMessage(err.message || 'Đặt lại mật khẩu thất bại.', 'error');
                btn.disabled = false;
                btn.textContent = 'Xác nhận đặt lại';
            }
        });
    }

    // ─── Submit form: gửi OTP qua email ──────────────────────────────
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();

        messageDiv.className = 'auth-message';
        messageDiv.innerHTML = '';

        if (!email) {
            showMessage('Vui lòng nhập email của bạn.', 'error');
            return;
        }
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            showMessage('Email không hợp lệ. Vui lòng kiểm tra lại.', 'error');
            return;
        }

        if (typeof window.TechnoraOtp?.send !== 'function') {
            showMessage('Lỗi hệ thống: sendCode.js chưa load. Hãy F5 trang.', 'error');
            return;
        }

        setLoading(true);

        try {
            await window.TechnoraOtp.send(email, 'email', 'reset_password');
            showMessage(
                `Mã OTP đã được gửi tới <strong>${email}</strong>. Vui lòng kiểm tra email và nhập mã 6 số bên dưới.`,
                'success'
            );
            ensureResetForm(email);
        } catch (err) {
            console.error('Forgot password error:', err);
            showMessage(err.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.', 'error');
        } finally {
            setLoading(false);
        }
    });
});
