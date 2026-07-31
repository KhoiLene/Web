/* ============================================
   TECHTRA - ĐĂNG KÝ (dùng backend Express)
   - Bước gửi mã  : TechnoraOtp.send(identifier, channel, 'register')
   - Bước xác nhận: TechnoraOtp.verify(identifier, channel, 'register', code)
   - Bước tạo user: POST /api/auth/register
   - Backend tự hash password bằng bcrypt
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    const verifySection = document.getElementById('verifySection');
    const verifyBtn = document.getElementById('verifyBtn');
    const messageDiv = document.getElementById('message');

    const methodRadios = document.getElementsByName('verifyMethod');
    const zaloSection = document.getElementById('zaloSection');
    const emailSection = document.getElementById('emailSection');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phoneNumber');

    // === Backend helpers ===
    async function apiPost(path, body) {
        const res = await fetch(`/api${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body || {}),
        });
        let json = null;
        try { json = await res.json(); } catch (_) {}
        if (!res.ok || !json?.success) {
            throw new Error(json?.error || `Lỗi máy chủ (HTTP ${res.status})`);
        }
        return json;
    }

    // Toggle show/hide password
    document.querySelectorAll('[data-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-toggle');
            const target = document.getElementById(id);
            if (!target) return;
            const isPassword = target.type === 'password';
            target.type = isPassword ? 'text' : 'password';
            btn.innerHTML = isPassword
                ? '<i class="fa-regular fa-eye-slash"></i>'
                : '<i class="fa-regular fa-eye"></i>';
        });
    });

    let tempEmail = '';
    let tempFullname = '';
    let tempUsername = '';
    let tempPassword = '';
    let tempMethod = 'zalo';
    let tempIdentifier = '';

    function showMessage(text, type = 'error') {
        messageDiv.className = 'auth-message is-show ' + type;
        const icon = type === 'success'
            ? 'fa-circle-check'
            : type === 'error'
                ? 'fa-circle-exclamation'
                : 'fa-circle-info';
        messageDiv.innerHTML = `<i class="fa-solid ${icon}"></i><span>${text}</span>`;
    }

    function updateMethodUI() {
        const selected = document.querySelector('input[name="verifyMethod"]:checked').value;
        if (selected === 'zalo') {
            zaloSection.style.display = '';
            emailSection.style.display = 'none';
            phoneInput.required = true;
            emailInput.required = false;
        } else {
            zaloSection.style.display = 'none';
            emailSection.style.display = '';
            emailInput.required = true;
            phoneInput.required = false;
        }
        tempMethod = selected;

        document.querySelectorAll('.method-toggle__label').forEach((lbl) => {
            const input = document.getElementById(lbl.getAttribute('for'));
            lbl.classList.toggle('is-active', input && input.checked);
        });

        verifySection.style.display = 'none';
        sendCodeBtn.style.display = '';
    }

    updateMethodUI();

    methodRadios.forEach((radio) => radio.addEventListener('change', updateMethodUI));

    function setSendLoading(loading) {
        sendCodeBtn.disabled = loading;
        sendCodeBtn.innerHTML = loading
            ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Đang xử lý...</span>'
            : '<i class="fa-solid fa-paper-plane"></i><span>Gửi mã xác nhận</span>';
    }

    function setVerifyLoading(loading) {
        verifyBtn.disabled = loading;
        verifyBtn.innerHTML = loading
            ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Đang đăng ký...</span>'
            : '<i class="fa-solid fa-circle-check"></i><span>Xác nhận &amp; Đăng ký</span>';
    }

    // Bước "Gửi mã" → gọi backend gửi OTP qua email/Zalo.
    // Backend sinh mã, lưu in-memory cache và gọi service thật.
    sendCodeBtn.addEventListener('click', async () => {
        const fullname = document.getElementById('fullname').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!username || username.length < 4) {
            showMessage('Tên đăng nhập phải có ít nhất 4 ký tự.', 'error');
            return;
        }
        if (!password || password.length < 6) {
            showMessage('Mật khẩu phải có tối thiểu 6 ký tự.', 'error');
            return;
        }
        if (password !== confirmPassword) {
            showMessage('Mật khẩu và xác nhận mật khẩu không khớp.', 'error');
            return;
        }

        let identifier = '';
        let emailVal = '';
        let phoneVal = '';
        if (tempMethod === 'email') {
            const email = emailInput.value.trim();
            if (!email) {
                showMessage('Vui lòng nhập email.', 'error');
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showMessage('Email không hợp lệ.', 'error');
                return;
            }
            emailVal = email;
            identifier = email;
        } else {
            const phone = phoneInput.value.trim();
            if (!phone) {
                showMessage('Vui lòng nhập số điện thoại Zalo.', 'error');
                return;
            }
            const phoneRegex = /^(0|\+84)?(\d{9,10})$/;
            if (!phoneRegex.test(phone)) {
                showMessage('Số điện thoại không hợp lệ.', 'error');
                return;
            }
            phoneVal = phone;
            identifier = phone;
        }

        tempFullname = fullname;
        tempUsername = username;
        tempPassword = password;
        tempIdentifier = identifier;
        tempEmail = emailVal;
        tempPhone = phoneVal;

        // Gọi backend gửi mã xác nhận (email hoặc Zalo) qua TechnoraOtp wrapper
        let otpResult;
        try {
            otpResult = await window.TechnoraOtp.send(identifier, tempMethod, 'register');
        } catch (err) {
            showMessage(err.message || 'Không gửi được mã xác nhận. Vui lòng thử lại.', 'error');
            return;
        }

        verifySection.style.display = '';
        sendCodeBtn.style.display = 'none';
        let msg = `Mã xác nhận đã được gửi tới <strong>${identifier}</strong>. Vui lòng kiểm tra và nhập mã 6 số.`;
        if (otpResult?.code) {
            msg += `<br><small style="color:#2563eb">[Dev mode] Mã của bạn: <strong>${otpResult.code}</strong></small>`;
            // Auto-fill để test nhanh
            const codeEl = document.getElementById('verifyCode');
            if (codeEl) codeEl.value = otpResult.code;
        }
        showMessage(msg, 'success');
        const codeEl = document.getElementById('verifyCode');
        if (codeEl) codeEl.focus();
    });

    // Bước xác nhận mã → gọi /api/auth/verify-code, sau đó /api/auth/register
    verifyBtn.addEventListener('click', async () => {
        const code = document.getElementById('verifyCode').value.trim();
        if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
            showMessage('Vui lòng nhập mã xác nhận 6 chữ số.', 'error');
            return;
        }

        setVerifyLoading(true);
        showMessage('', 'info');

        try {
            // 1) Xác nhận mã qua TechnoraOtp (channel='email'|'zalo', purpose='register')
            await window.TechnoraOtp.verify(tempIdentifier, tempMethod, 'register', code);

            // 2) Tạo tài khoản (backend tự hash password)
            await apiPost('/auth/register', {
                username: tempUsername,
                email: tempEmail || null,
                password: tempPassword,
                full_name: tempFullname || null,
            });

            showMessage('Đăng ký thành công! Đang chuyển đến trang đăng nhập...', 'success');
            setTimeout(() => {
                window.location.href = '/components/dang-nhap/dangnhap.html';
            }, 1200);
        } catch (err) {
            console.error('Register error:', err);
            showMessage(err.message || 'Đăng ký thất bại.', 'error');
        } finally {
            setVerifyLoading(false);
        }
    });

    // Auto-submit khi nhập đủ 6 số
    document.getElementById('verifyCode')?.addEventListener('input', (e) => {
        if (e.target.value.length === 6) {
            verifyBtn.click();
        }
    });
});