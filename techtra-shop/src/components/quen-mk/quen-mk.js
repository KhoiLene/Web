/* ============================================
   TECHTRA - QUÊN MẬT KHẨU
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('forgotPasswordForm');
    const messageDiv = document.getElementById('message');
    const submitBtn = document.getElementById('submitBtn');

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
            ? '<i class="fa-solid fa-spinner fa-spin"></i><span>Đang gửi yêu cầu...</span>'
            : '<i class="fa-solid fa-paper-plane"></i><span>Gửi yêu cầu đặt lại mật khẩu</span>';
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const emailInput = document.getElementById('email');
        const email = emailInput.value.trim();

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

        setLoading(true);

        try {
            // Gọi API backend (nếu có)
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            // Dù backend có endpoint hay không, ta vẫn thông báo chung
            // để tránh lộ thông tin email nào tồn tại trong hệ thống.
            if (!response.ok && response.status !== 404) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || 'Có lỗi xảy ra, vui lòng thử lại sau.');
            }

            showMessage(
                `Yêu cầu đã được gửi tới <strong>${email}</strong>. Vui lòng kiểm tra hộp thư (kể cả thư mục spam) để đặt lại mật khẩu.`,
                'success'
            );
            form.reset();
        } catch (err) {
            console.error('Forgot password error:', err);
            showMessage(err.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.', 'error');
        } finally {
            setLoading(false);
        }
    });
});
