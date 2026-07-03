document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = '';
    messageDiv.className = 'message';

    // Disable button while submitting
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang đăng nhập...';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usernameOrEmail: username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Đăng nhập thất bại');
        }

        // Successful login
        messageDiv.textContent = 'Đăng nhập thành công! Đang chuyển hướng...';
        messageDiv.className = 'message success';

        // Determine redirect based on role
        const role = data.data.role || 'user';
        if (role === 'admin') {
            // Redirect to admin panel
            window.location.href = '/admin/';
        } else {
            // Redirect to previous page or home
            const previousPage = document.referrer || '/';
            window.location.href = previousPage;
        }
    } catch (error) {
        console.error('Login error:', error);
        messageDiv.textContent = error.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
        messageDiv.className = 'message error';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Đăng nhập';
    }
});