// sendCode.js
// ─────────────────────────────────────────────────────────────────────────────
// Gọi backend Techtra (Express ở D:/Web/backend) để gửi mã xác nhận qua
// email (services/email.js) hoặc Zalo (services/zalo.js).
//
// Hai endpoint tương ứng trong backend/server.js:
//   POST /api/auth/send-verification        (email – dùng services/email.js)
//   POST /api/auth/send-zalo-verification   (zalo  – dùng services/zalo.js)
//
// Cấu hình đường dẫn gốc của backend qua window.__TECHTRA_API_BASE__
// (mặc định: http://localhost:5000 khi dev, hoặc cùng origin khi reverse-proxy).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    // Cho phép trang chủ override base URL khi cần (vd: khi deploy sau nginx proxy)
    const API_BASE =
        (typeof window !== 'undefined' && window.__TECHTRA_API_BASE__) ||
        // Nếu chạy sau reverse-proxy /api/ thì dùng relative, ngược lại dùng localhost:5000
        (location.protocol === 'http:' || location.protocol === 'https:'
            ? '/api'  // Use relative path when behind nginx proxy
            : 'http://localhost:5000');

    /**
     * Gửi mã xác nhận qua email hoặc Zalo.
     * @param {string} identifier - email (khi method = 'email') hoặc số điện thoại (khi method = 'zalo')
     * @param {'email'|'zalo'} method
     * @returns {Promise<Object>} JSON response từ backend
     */
    function sendVerificationCode(identifier, method) {
        let url = '';
        let payload = {};

        if (method === 'email') {
            url = `${API_BASE}/api/auth/send-verification`;
            payload = { email: identifier };
        } else if (method === 'zalo') {
            url = `${API_BASE}/api/auth/send-zalo-verification`;
            payload = { phoneNumber: identifier };
        } else {
            return Promise.reject(new Error('Phương thức xác nhận không hợp lệ'));
        }

        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then((response) => {
            return response.json().then((data) => {
                if (!response.ok) {
                    throw new Error(data.error || 'Gửi mã xác nhận thất bại');
                }
                return data;
            });
        });
    }

    /**
     * Xác nhận mã 6 số vừa gửi.
     * @param {string} identifier
     * @param {string} code
     * @param {'email'|'zalo'} method
     */
    function verifyCode(identifier, code, method) {
        return fetch(`${API_BASE}/api/auth/verify-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, code, type: method })
        }).then((response) => {
            return response.json().then((data) => {
                if (!response.ok) {
                    throw new Error(data.error || 'Mã xác nhận không đúng hoặc đã hết hạn');
                }
                return data;
            });
        });
    }

    // Expose ra window để dangky.js dùng
    window.sendVerificationCode = sendVerificationCode;
    window.verifyCode = verifyCode;
    window.__TECHTRA_API_BASE__ = API_BASE;
})();
