import React, { useState } from "react";
import "./Login.css";

const API_BASE = "/api";

// Lưu admin đã login để Sidebar đọc
const ADMIN_STORAGE_KEY = "techtra_admin";

export function saveAdminToStorage(admin) {
  try {
    if (admin) localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admin));
    else localStorage.removeItem(ADMIN_STORAGE_KEY);
  } catch {
    /* localStorage có thể bị chặn */
  }
}

export function getAdminFromStorage() {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return null;
    const a = JSON.parse(raw);
    return a && a.id ? a : null;
  } catch {
    return null;
  }
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch (_) {
    /* not json */
  }
  if (!res.ok || !json?.success) {
    throw new Error(json?.error || `Lỗi máy chủ (HTTP ${res.status})`);
  }
  return json;
}

export default function Login({ onLoggedIn }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!identifier.trim() || !password) {
      setError("Vui lòng nhập tên đăng nhập và mật khẩu.");
      return;
    }
    setBusy(true);
    try {
      const json = await apiPost("/auth/admin/login", {
        identifier: identifier.trim(),
        password,
      });
      const admin = json?.data || null;
      if (!admin || !admin.id) throw new Error("Phản hồi không hợp lệ.");
      saveAdminToStorage(admin);
      onLoggedIn?.(admin);
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <i className="fas fa-laugh-wink login-brand-icon" aria-hidden="true" />
          <h1>Techtra Admin</h1>
          <p>Đăng nhập để quản trị hệ thống</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} autoComplete="on">
          <label className="login-field">
            <span>Tên đăng nhập hoặc Email</span>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="vd: admin.khoi hoặc admin@example.com"
              autoFocus
              autoComplete="username"
              disabled={busy}
            />
          </label>

          <label className="login-field">
            <span>Mật khẩu</span>
            <div className="login-pwd-wrap">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                disabled={busy}
              />
              <button
                type="button"
                className="login-pwd-toggle"
                onClick={() => setShowPwd((p) => !p)}
                tabIndex={-1}
                aria-label={showPwd ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                <i className={`fas ${showPwd ? "fa-eye-slash" : "fa-eye"}`} aria-hidden="true" />
              </button>
            </div>
          </label>

          {error ? <div className="login-error">{error}</div> : null}

          <button type="submit" className="login-submit" disabled={busy}>
            {busy ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p className="login-foot">© {new Date().getFullYear()} Techtra. All rights reserved.</p>
      </div>
    </div>
  );
}
