// sendCode.js — Frontend wrapper cho hệ thống OTP (Techtra).
// ─────────────────────────────────────────────────────────────────────────────
// Gọi backend Express (D:/Web1/backend) để gửi / xác thực mã OTP.
// Dùng 2 endpoint thống nhất:
//   POST /api/otp/send    { identifier, channel, purpose } → { success, expiresAt }
//   POST /api/otp/verify  { identifier, channel, purpose, code } → { success }
//
// Channel: 'email' | 'zalo'
// Purpose: 'register' | 'review' | 'reset_password'
//
// KHÔNG hiển thị mã OTP ra UI. Nếu gửi thất bại sẽ throw với message từ backend.
// Cấu hình đường dẫn gốc qua window.__TECHTRA_API_BASE__ (mặc định '/api').
// ─────────────────────────────────────────────────────────────────────────────

(function () {
    'use strict';

    const API_BASE =
        (typeof window !== 'undefined' && window.__TECHTRA_API_BASE__) ||
        (location.protocol === 'http:' || location.protocol === 'https:'
            ? '/api'
            : 'http://localhost:5000');

    async function handleResp(response) {
        let data = null;
        try { data = await response.json(); } catch (_) {}
        if (!response.ok || (data && data.success === false)) {
            const err = new Error((data && data.error) || `Lỗi máy chủ (HTTP ${response.status})`);
            err.status = response.status;
            throw err;
        }
        return data || { success: true };
    }

    /**
     * Gửi mã OTP qua email hoặc Zalo.
     * @param {string} identifier    email (channel='email') hoặc SĐT (channel='zalo')
     * @param {'email'|'zalo'} channel
     * @param {'register'|'review'|'reset_password'} purpose
     * @returns {Promise<{success: true, message: string, expiresAt: string}>}
     */
    async function sendOtp(identifier, channel, purpose) {
        if (!identifier || !channel || !purpose) {
            throw new Error('Thiếu identifier / channel / purpose');
        }
        const resp = await fetch(`${API_BASE}/otp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, channel, purpose }),
        });
        return handleResp(resp);
    }

    /**
     * Xác thực mã OTP vừa gửi.
     * @param {string} identifier
     * @param {'email'|'zalo'} channel
     * @param {'register'|'review'|'reset_password'} purpose
     * @param {string} code  Mã 6 số
     */
    async function verifyOtp(identifier, channel, purpose, code) {
        if (!identifier || !channel || !purpose || !code) {
            throw new Error('Thiếu identifier / channel / purpose / code');
        }
        const resp = await fetch(`${API_BASE}/otp/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, channel, purpose, code }),
        });
        return handleResp(resp);
    }

    // Expose ra window — đổi tên từ sendVerificationCode/verifyCode cũ sang
    // namespace TechnoraOtp cho rõ ràng, đồng thời giữ alias cũ để code cũ
    // (san-pham.js chưa refactor) không vỡ ngay.
    window.TechnoraOtp = { send: sendOtp, verify: verifyOtp };
    window.__TECHTRA_API_BASE__ = API_BASE;

    // Backward-compat alias (deprecated, sẽ xoá sau khi FE refactor xong)
    window.sendVerificationCode = function (identifier, method) {
        // method 'email'|'zalo' → channel tương ứng, purpose mặc định 'register'
        return sendOtp(identifier, method, 'register');
    };
    window.verifyCode = function (identifier, code, method) {
        return verifyOtp(identifier, method, 'register', code);
    };
})();
