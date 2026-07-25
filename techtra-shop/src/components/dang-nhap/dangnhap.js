/* ============================================
   TECHTRA - ĐĂNG NHẬP
   ============================================ */

(function () {
    'use strict';

    const form = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');
    const submitBtn = document.getElementById('loginSubmitBtn');

    // Show/hide password
    document.querySelectorAll('[data-toggle="password"]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = document.getElementById('password');
            if (!target) return;
            const isPassword = target.type === 'password';
            target.type = isPassword ? 'text' : 'password';
            btn.innerHTML = isPassword
                ? '<i class="fa-regular fa-eye-slash"></i>'
                : '<i class="fa-regular fa-eye"></i>';
        });
    });

    function showMessage(text, type) {
        messageDiv.className = 'auth-message is-show ' + (type || 'info');
        const icon = type === 'success'
            ? 'fa-circle-check'
            : type === 'error'
                ? 'fa-circle-exclamation'
                : 'fa-circle-info';
        messageDiv.innerHTML = `<i class="fa-solid ${icon}"></i><span>${text}</span>`;
    }

    function setLoading(loading) {
        submitBtn.disabled = loading;
        submitBtn.innerHTML = loading
            ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Đang đăng nhập...</span>'
            : '<span>Đăng nhập</span><i class="fa-solid fa-arrow-right"></i>';
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        // Reset state
        messageDiv.className = 'auth-message';
        messageDiv.innerHTML = '';

        if (!username || !password) {
            showMessage('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.', 'error');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usernameOrEmail: username, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Đăng nhập thất bại');
            }

            showMessage('Đăng nhập thành công! Đang chuyển hướng...', 'success');

            // Remember me: keep username for convenience
            if (document.getElementById('remember')?.checked) {
                try { localStorage.setItem('techtra_username', username); } catch (_) {}
            }

            const role = data.data?.role || 'user';
            setTimeout(() => {
                if (role === 'admin') {
                    window.location.href = '/admin/';
                } else {
                    const previousPage = document.referrer && !document.referrer.includes('dangnhap')
                        ? document.referrer
                        : '/components/trang-chu/';
                    window.location.href = previousPage;
                }
            }, 700);
        } catch (error) {
            console.error('Login error:', error);
            showMessage(error.message || 'Có lỗi xảy ra. Vui lòng thử lại.', 'error');
        } finally {
            setLoading(false);
        }
    });

    // Restore remembered username (without password)
    try {
        const saved = localStorage.getItem('techtra_username');
        if (saved && document.getElementById('username')) {
            document.getElementById('username').value = saved;
            const remember = document.getElementById('remember');
            if (remember) remember.checked = true;
        }
    } catch (_) {}
})();
