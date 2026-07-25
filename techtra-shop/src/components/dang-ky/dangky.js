/* ============================================
   TECHTRA - ĐĂNG KÝ
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    const verifySection = document.getElementById('verifySection');
    const verifyBtn = document.getElementById('verifyBtn');
    const messageDiv = document.getElementById('message');

    const methodRadios = document.getElementsByName('verifyMethod');
    const zaloSection = document.getElementById('zaloSection');
    const emailSection = document.getElementById('emailSection');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phoneNumber');

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

        // Update visual state of toggle labels
        document.querySelectorAll('.method-toggle__label').forEach((lbl) => {
            const input = document.getElementById(lbl.getAttribute('for'));
            lbl.classList.toggle('is-active', input && input.checked);
        });

        // Reset verify section khi đổi phương thức
        verifySection.style.display = 'none';
        sendCodeBtn.style.display = '';
    }

    updateMethodUI();

    methodRadios.forEach((radio) => radio.addEventListener('change', updateMethodUI));

    function setSendLoading(loading) {
        sendCodeBtn.disabled = loading;
        sendCodeBtn.innerHTML = loading
            ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Đang gửi mã...</span>'
            : '<i class="fa-solid fa-paper-plane"></i><span>Gửi mã xác nhận</span>';
    }

    function setVerifyLoading(loading) {
        verifyBtn.disabled = loading;
        verifyBtn.innerHTML = loading
            ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Đang xác nhận...</span>'
            : '<i class="fa-solid fa-circle-check"></i><span>Xác nhận &amp; Đăng ký</span>';
    }

    // Gửi mã xác nhận
    sendCodeBtn.addEventListener('click', async () => {
        const fullname = document.getElementById('fullname').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validate
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
            identifier = email;
            tempEmail = email;
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
            identifier = phone;
        }

        // Cache form data
        tempFullname = fullname;
        tempUsername = username;
        tempPassword = password;
        tempIdentifier = identifier;

        setSendLoading(true);
        showMessage('', 'info');

        try {
            await window.sendVerificationCode(identifier, tempMethod);
            verifySection.style.display = '';
            sendCodeBtn.style.display = 'none';
            showMessage(
                `Mã xác nhận đã được gửi qua ${tempMethod === 'email' ? 'email' : 'Zalo'}. Vui lòng kiểm tra.`,
                'success'
            );
            // Focus vào ô nhập mã
            setTimeout(() => document.getElementById('verifyCode')?.focus(), 50);
        } catch (err) {
            console.error('Send verification error:', err);
            showMessage(err.message || 'Có lỗi xảy ra khi gửi mã.', 'error');
        } finally {
            setSendLoading(false);
        }
    });

    // Xác nhận mã + đăng ký
    verifyBtn.addEventListener('click', async () => {
        const code = document.getElementById('verifyCode').value.trim();
        if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
            showMessage('Vui lòng nhập mã xác nhận 6 chữ số.', 'error');
            return;
        }

        setVerifyLoading(true);
        showMessage('', 'info');

        try {
            // 1. Verify code
            const verifyResp = await fetch('/api/auth/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identifier: tempIdentifier,
                    code,
                    type: tempMethod
                })
            });
            const verifyData = await verifyResp.json();

            if (!verifyResp.ok) {
                throw new Error(verifyData.error || 'Mã xác nhận không đúng hoặc đã hết hạn.');
            }

            // 2. Register user
            const regResp = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: tempUsername,
                    email: tempEmail || null,
                    phone: tempMethod === 'zalo' ? tempIdentifier : null,
                    password: tempPassword,
                    full_name: tempFullname || null
                })
            });
            const regData = await regResp.json();

            if (!regResp.ok) {
                throw new Error(regData.error || 'Đăng ký thất bại.');
            }

            showMessage('Đăng ký thành công! Đang chuyển đến trang đăng nhập...', 'success');

            setTimeout(() => {
                window.location.href = '/components/dang-nhap/dangnhap.html';
            }, 1200);
        } catch (err) {
            console.error('Verify/register error:', err);
            showMessage(err.message || 'Có lỗi xảy ra.', 'error');
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
