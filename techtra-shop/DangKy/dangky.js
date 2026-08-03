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

    let tempEmail = '';
    let tempFullname = '';
    let tempUsername = '';
    let tempPassword = '';
    let tempMethod = 'zalo'; // default
    let tempIdentifier = ''; // email or phone

    // Helper to show message
    function showMessage(text, type = 'error') {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
    }

    // Update method selection UI
    function updateMethodUI() {
        const selected = document.querySelector('input[name="verifyMethod"]:checked').value;
        if (selected === 'zalo') {
            zaloSection.style.display = 'block';
            emailSection.style.display = 'none';
        } else {
            zaloSection.style.display = 'none';
            emailSection.style.display = 'block';
        }
        tempMethod = selected;
    }

    // Initialize UI
    updateMethodUI();

    // Method change listener
    methodRadios.forEach(radio => {
        radio.addEventListener('change', updateMethodUI);
    });

    // Send verification code
    sendCodeBtn.addEventListener('click', async () => {
        // Validate password match
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        if (!password || password.length < 6) {
            showMessage('Mật khẩu phải có tối thiểu 6 ký tự', 'error');
            return;
        }
        if (password !== confirmPassword) {
            showMessage('Mật khẩu và xác nhận mật khẩu không khớp', 'error');
            return;
        }

        // Determine identifier based on method
        let identifier = '';
        if (tempMethod === 'email') {
            // Email method: validate email
            const email = emailInput.value.trim();
            if (!email) {
                showMessage('Vui lòng nhập email', 'error');
                return;
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showMessage('Email không hợp lệ', 'error');
                return;
            }
            identifier = email;
            tempEmail = email;
        } else {
            // Zalo method: validate phone number
            const phone = phoneInput.value.trim();
            if (!phone) {
                showMessage('Vui lòng nhập số điện thoại Zalo', 'error');
                return;
            }
            const phoneRegex = /^(0|\+84)?(\d{9,10})$/;
            if (!phoneRegex.test(phone)) {
                showMessage('Số điện thoại không hợp lệ', 'error');
                return;
            }
            identifier = phone;
        }

        // Store temp data for later registration
        tempFullname = document.getElementById('fullname').value.trim();
        tempUsername = document.getElementById('username').value.trim();
        if (!tempUsername) {
            showMessage('Vui lòng nhập tên đăng nhập', 'error');
            return;
        }
        tempPassword = password;
        tempIdentifier = identifier;

        // Disable button and show loading
        sendCodeBtn.disabled = true;
        sendCodeBtn.textContent = 'Đang gửi...';
        showMessage('');

        try {
            await window.sendVerificationCode(identifier, tempMethod);
            // Show verification section
            verifySection.style.display = 'block';
            sendCodeBtn.style.display = 'none';
            showMessage(`Mã xác nhận đã được gửi qua ${tempMethod === 'email' ? 'email' : 'Zalo'}. Vui lòng kiểm tra.`, 'success');
        } catch (err) {
            console.error('Send verification error:', err);
            showMessage(err.message || 'Có lỗi xảy ra khi gửi mã', 'error');
        } finally {
            sendCodeBtn.disabled = false;
            sendCodeBtn.textContent = 'Gửi mã xác nhận';
        }
    });

    // Verify code and register
    verifyBtn.addEventListener('click', async () => {
        const code = document.getElementById('verifyCode').value.trim();
        if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
            showMessage('Vui lòng nhập mã xác nhận 6 chữ số', 'error');
            return;
        }

        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Đang xác nhận...';
        showMessage('');

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
                throw new Error(verifyData.error || 'Mã xác nhận không đúng hoặc đã hết hạn');
            }

            // 2. Register user — for Zalo users, fall back to phone as email placeholder if no email provided
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
                throw new Error(regData.error || 'Đăng ký thất bại');
            }

            showMessage('Đăng ký thành công! Bạn có thể đăng nhập ngay.', 'success');
            // Redirect to login page after 2 seconds
            setTimeout(() => {
                window.location.href = '/DangNhap/dangnhap.html';
            }, 2000);
        } catch (err) {
            console.error('Verify/register error:', err);
            showMessage(err.message || 'Có lỗi xảy ra', 'error');
        } finally {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Xác nhận & Đăng ký';
        }
    });
});
