// =====================================================================
// Settings.jsx — Trang Cấu hình hệ thống
//
// Quản lý các key/value lưu trong bảng `site_settings` (key/value_json):
//   • jt_config            — JSON { eccompanyid, customerid, key, baseUrl, sender }
//   • bank_name/account/holder — tài khoản ngân hàng hiển thị cho khách
//   • zalo_app_id / zalo_secret_key / zalo_access_token — Zalo OA
//   • smtp_host / smtp_port / smtp_user / smtp_pass / smtp_from_email / smtp_from_name
//
// Tính năng:
//   - Form nhập cho 4 nhóm: J&T / Ngân hàng / Zalo OA / SMTP Email
//   - Nút "Lưu cấu hình" → upsert vào site_settings (atomic per group)
//   - Nút "Tính phí mẫu" → demo jtCalculatePriceMock
//   - Nút "Test kết nối J&T" → mock (J&T VN chưa có API tra số dư công khai)
//   - Nút "Test gửi mail" → demo (chỉ verify định dạng, không gửi mail thật
//     vì chưa có backend Express; production cần Edge Function / Express worker)
// =====================================================================

import React, { useState, useEffect } from "react";
import "./Settings.css";
import {
  jtCalculatePriceMock,
  jtGetBalance,
  setJTConfig,
  JT_PRODUCT_TYPE,
} from "../../jstService";
import { siteSettingsApi, request } from "../../api";

const DEFAULT_SENDER = {
  name: "TECHTRA",
  phone: "0901234567",
  mobile: "0901234567",
  address: "Số 1, đường ABC, Quận 1",
  prov: "Hồ Chí Minh",
  city: "",
  area: "",
};

const DEFAULT_JT_CONFIG = {
  eccompanyid: "",
  customerid: "",
  key: "",
  logisticproviderid: "JNT",
  baseUrl: "http://47.57.106.86/yuenan-interface-web",
  sender: DEFAULT_SENDER,
};

const DEFAULT_BANK = {
  bank_name: "",
  bank_account_number: "",
  bank_account_holder: "",
};

const DEFAULT_ZALO = {
  zalo_app_id: "",
  zalo_secret_key: "",
  zalo_access_token: "",
};

const DEFAULT_SMTP = {
  smtp_host: "",
  smtp_port: "587",
  smtp_user: "",
  smtp_pass: "",
  smtp_from_email: "",
  smtp_from_name: "Techtra",
};

const DEFAULT_VNPAY = {
  vnp_TmnCode: "",
  vnp_HashSecret: "",
  vnp_Url: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
};

const KEY_JT_CONFIG = "jt_config";
const KEYS_BANK = ["bank_name", "bank_account_number", "bank_account_holder"];
const KEYS_ZALO = ["zalo_app_id", "zalo_secret_key", "zalo_access_token"];
const KEYS_SMTP = ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from_email", "smtp_from_name"];
const KEYS_VNPAY = ["vnp_TmnCode", "vnp_HashSecret", "vnp_Url"];

export default function Settings() {
  const [jt, setJt] = useState(DEFAULT_JT_CONFIG);
  const [bank, setBank] = useState(DEFAULT_BANK);
  const [zalo, setZalo] = useState(DEFAULT_ZALO);
  const [smtp, setSmtp] = useState(DEFAULT_SMTP);
  const [vnpay, setVnpay] = useState(DEFAULT_VNPAY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feeDemo, setFeeDemo] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showKey, setShowKey] = useState(false);
  const [showZaloSecret, setShowZaloSecret] = useState(false);
  const [showZaloToken, setShowZaloToken] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showVnpayHashSecret, setShowVnpayHashSecret] = useState(false);
  const [balance, setBalance] = useState(null);

  // ─── Load tất cả config từ site_settings (qua backend Express) ─────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const allKeys = [KEY_JT_CONFIG, ...KEYS_BANK, ...KEYS_ZALO, ...KEYS_SMTP, ...KEYS_VNPAY];
        const inVal = `(${allKeys.map((k) => `"${k}"`).join(",")})`;
        const r = await request(
          "GET",
          `/db/site_settings?select=key,value,value_json&key=in.${inVal}`
        );
        const rows = r.data || [];
        const map = {};
        for (const row of rows) map[row.key] = row;

        // jt_config (object)
        if (map[KEY_JT_CONFIG]?.value_json) {
          const merged = {
            ...DEFAULT_JT_CONFIG,
            ...map[KEY_JT_CONFIG].value_json,
            sender: { ...DEFAULT_SENDER, ...(map[KEY_JT_CONFIG].value_json.sender || {}) },
          };
          setJt(merged);
          setJTConfig(merged);
        }

        // scalar keys
        const setScalar = (k, setter) => {
          const row = map[k];
          if (row && (row.value_json !== null && row.value_json !== undefined)) {
            setter(typeof row.value_json === "string" ? row.value_json : JSON.stringify(row.value_json));
          } else if (row?.value !== undefined && row.value !== null) {
            setter(String(row.value));
          }
        };
        setScalar("bank_name",            (v) => setBank((p) => ({ ...p, bank_name: v })));
        setScalar("bank_account_number",  (v) => setBank((p) => ({ ...p, bank_account_number: v })));
        setScalar("bank_account_holder",  (v) => setBank((p) => ({ ...p, bank_account_holder: v })));
        setScalar("zalo_app_id",          (v) => setZalo((p) => ({ ...p, zalo_app_id: v })));
        setScalar("zalo_secret_key",      (v) => setZalo((p) => ({ ...p, zalo_secret_key: v })));
        setScalar("zalo_access_token",    (v) => setZalo((p) => ({ ...p, zalo_access_token: v })));
        setScalar("smtp_host",            (v) => setSmtp((p) => ({ ...p, smtp_host: v })));
        setScalar("smtp_port",            (v) => setSmtp((p) => ({ ...p, smtp_port: v })));
        setScalar("smtp_user",            (v) => setSmtp((p) => ({ ...p, smtp_user: v })));
        setScalar("smtp_pass",            (v) => setSmtp((p) => ({ ...p, smtp_pass: v })));
        setScalar("smtp_from_email",      (v) => setSmtp((p) => ({ ...p, smtp_from_email: v })));
        setScalar("smtp_from_name",       (v) => setSmtp((p) => ({ ...p, smtp_from_name: v })));
        setScalar("vnp_TmnCode",          (v) => setVnpay((p) => ({ ...p, vnp_TmnCode: v })));
        setScalar("vnp_HashSecret",       (v) => setVnpay((p) => ({ ...p, vnp_HashSecret: v })));
        setScalar("vnp_Url",              (v) => setVnpay((p) => ({ ...p, vnp_Url: v })));
      } catch (err) {
        console.error(err);
        setMessage({ type: "error", text: "Không tải được cấu hình: " + err.message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────
  const updateJtSender = (field, value) =>
    setJt((p) => ({ ...p, sender: { ...p.sender, [field]: value } }));

  // ─── Save tất cả 4 nhóm (atomic per group) ──────────────────────
  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      if (!jt.eccompanyid || !jt.customerid || !jt.key) {
        throw new Error("Vui lòng nhập đủ 3 trường J&T: eccompanyid, customerid, key.");
      }

      // J&T: 1 row, value_json = toàn bộ object
      await siteSettingsApi.setJson(KEY_JT_CONFIG, jt, "Cấu hình J&T Express — lưu bởi Settings admin");

      // Bank, Zalo, SMTP: mỗi key 1 row, lưu vào `value`
      const scalarPairs = [
        ["bank_name",            bank.bank_name,            "Tài khoản ngân hàng — tên ngân hàng"],
        ["bank_account_number",  bank.bank_account_number,  "Tài khoản ngân hàng — số tài khoản"],
        ["bank_account_holder",  bank.bank_account_holder,  "Tài khoản ngân hàng — chủ tài khoản"],

        ["zalo_app_id",          zalo.zalo_app_id,          "Zalo OA — App ID"],
        ["zalo_secret_key",      zalo.zalo_secret_key,      "Zalo OA — Secret Key"],
        ["zalo_access_token",    zalo.zalo_access_token,    "Zalo OA — Access Token"],

        ["smtp_host",            smtp.smtp_host,            "SMTP — host (vd: smtp.gmail.com)"],
        ["smtp_port",            smtp.smtp_port,            "SMTP — port (587 TLS, 465 SSL)"],
        ["smtp_user",            smtp.smtp_user,            "SMTP — username (email gửi)"],
        ["smtp_pass",            smtp.smtp_pass,            "SMTP — password / app password"],
        ["smtp_from_email",      smtp.smtp_from_email,      "SMTP — địa chỉ From hiển thị"],
        ["smtp_from_name",       smtp.smtp_from_name,       "SMTP — tên hiển thị"],

        ["vnp_TmnCode",          vnpay.vnp_TmnCode,          "VNPay — Terminal Code"],
        ["vnp_HashSecret",       vnpay.vnp_HashSecret,       "VNPay — Hash Secret"],
        ["vnp_Url",              vnpay.vnp_Url,              "VNPay — Payment URL"],
      ];
      for (const [key, val, desc] of scalarPairs) {
        // Mỗi key lưu vào `value` (text). Nếu không phải JSON, set text.
        await siteSettingsApi.set(key, val == null ? "" : String(val));
      }

      // Apply ngay vào runtime
      setJTConfig(jt);
      setMessage({ type: "success", text: "✅ Đã lưu cấu hình J&T + Ngân hàng + Zalo + SMTP + VNPay." });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "❌ " + err.message });
    } finally {
      setSaving(false);
    }
  };

  // ─── Test kết nối J&T (mock) ────────────────────────────────────
  const handleTestConnection = async () => {
    setTesting(true);
    setMessage({ type: "", text: "" });
    setBalance(null);
    try {
      setJTConfig(jt);
      const res = await jtGetBalance();
      setBalance(res.balance);
      setMessage({
        type: "info",
        text: res.mock
          ? "ℹ️ J&T chưa cung cấp API tra số dư công khai — đây là kết quả mock. Hãy thử tạo 1 vận đơn thật để kiểm tra kết nối."
          : `✅ Kết nối thành công! Số dư: ${(res.balance || 0).toLocaleString("vi-VN")}đ`,
      });
    } catch (err) {
      setMessage({ type: "error", text: "❌ Test thất bại: " + err.message });
    } finally {
      setTesting(false);
    }
  };

  // ─── Tính phí mẫu J&T (mock) ────────────────────────────────────
  const handleFeeDemo = async () => {
    setFeeDemo(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await jtCalculatePriceMock({ weight: 0.5, isBulky: false });
      setMessage({
        type: "success",
        text: `💰 Phí mẫu (${JT_PRODUCT_TYPE.EZ}, 0.5kg, không cồng kềnh): ${(res.fee || 0).toLocaleString("vi-VN")}đ ${res.mock ? "(mock)" : ""}`,
      });
    } catch (err) {
      setMessage({ type: "error", text: "❌ " + err.message });
    } finally {
      setFeeDemo(false);
    }
  };

  // ─── Test gửi mã OTP thật qua backend Express ───────────────────
  const [otpTestTarget, setOtpTestTarget] = useState("");
  const [otpTestChannel, setOtpTestChannel] = useState("email");
  const [otpTesting, setOtpTesting] = useState(false);

  const handleTestOtp = async (channel) => {
    const target = otpTestTarget.trim();
    if (!target) {
      setMessage({ type: "error", text: `❌ Vui lòng nhập ${channel === "email" ? "email" : "số điện thoại"} để test.` });
      return;
    }
    if (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      setMessage({ type: "error", text: "❌ Email không hợp lệ." });
      return;
    }
    if (channel === "zalo" && !/^(0|\+84)?(\d{9,10})$/.test(target)) {
      setMessage({ type: "error", text: "❌ Số điện thoại không hợp lệ." });
      return;
    }
    setOtpTesting(true);
    setOtpTestChannel(channel);
    setMessage({ type: "", text: "" });
    try {
      const res = await request("POST", "/otp/send", {
        identifier: target,
        channel,
        purpose: "register",
      });
      if (res.data?.success) {
        if (res.data?.code) {
          setMessage({ type: "info", text: `ℹ️ Backend dev bypass: mã = ${res.data.code}` });
        } else {
          setMessage({ type: "success", text: `✅ Đã gửi mã OTP qua ${channel === "email" ? "email" : "Zalo OA"} tới ${target}.` });
        }
      } else {
        throw new Error(res.data?.error || "Không gửi được mã.");
      }
    } catch (err) {
      setMessage({ type: "error", text: "❌ Test gửi mã thất bại: " + err.message });
    } finally {
      setOtpTesting(false);
    }
  };

  // ─── Test SMTP — gọi backend gửi email thật nếu cấu hình đủ ──────
  const handleTestSmtp = async () => {
    if (!smtp.smtp_host || !smtp.smtp_user || !smtp.smtp_pass) {
      setMessage({ type: "error", text: "❌ Vui lòng nhập host, user và pass trước khi test." });
      return;
    }
    const port = Number(smtp.smtp_port);
    if (!port || port < 1 || port > 65535) {
      setMessage({ type: "error", text: "❌ Port không hợp lệ (1-65535)." });
      return;
    }
    if (smtp.smtp_from_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtp.smtp_from_email)) {
      setMessage({ type: "error", text: "❌ Email From không hợp lệ." });
      return;
    }
    await handleTestOtp("email");
  };

  // ─── Render ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="st-wrapper">
        <div className="st-loading">⌛ Đang tải cấu hình…</div>
      </div>
    );
  }

  return (
    <div className="st-wrapper">
      <div className="st-header">
        <h1>⚙️ Cấu hình hệ thống</h1>
        <p>J&T Express · Ngân hàng · Zalo OA · SMTP Email · VNPay</p>
      </div>

      {message.text && (
        <div className={`st-message st-message-${message.type}`}>
          {message.text}
        </div>
      )}

      <form className="st-form" onSubmit={handleSave}>
        {/* ═══ 1. J&T Express ═══ */}
        <section className="st-card">
          <h2 className="st-section-title">
            <i className="fas fa-truck"></i> J&T Express
          </h2>
          <p className="st-hint">
            Liên hệ account rep của J&T (theo{" "}
            <a href="https://api-docs.jtexpress.vn/" target="_blank" rel="noreferrer">
              api-docs.jtexpress.vn
            </a>
            ) để lấy 3 thông số dưới đây.
          </p>

          <div className="st-row">
            <label>
              <span>Eccompanyid <em>*</em></span>
              <input type="text" value={jt.eccompanyid}
                onChange={(e) => setJt((p) => ({ ...p, eccompanyid: e.target.value }))}
                placeholder="VD: CUSMODEL" autoComplete="off" />
            </label>
            <label>
              <span>Customerid <em>*</em></span>
              <input type="text" value={jt.customerid}
                onChange={(e) => setJt((p) => ({ ...p, customerid: e.target.value }))}
                placeholder="VD: 084LC012345" autoComplete="off" />
            </label>
          </div>

          <div className="st-row">
            <label>
              <span>Key <em>*</em></span>
              <div className="st-password-wrap">
                <input type={showKey ? "text" : "password"} value={jt.key}
                  onChange={(e) => setJt((p) => ({ ...p, key: e.target.value }))}
                  placeholder="Key dùng để tạo data_digest (MD5+Base64)" autoComplete="off" />
                <button type="button" className="st-toggle-pw" onClick={() => setShowKey((s) => !s)}>
                  <i className={`fas ${showKey ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </label>
            <label>
              <span>Base URL</span>
              <input type="text" value={jt.baseUrl}
                onChange={(e) => setJt((p) => ({ ...p, baseUrl: e.target.value }))}
                placeholder="http://47.57.106.86/yuenan-interface-web (test)" autoComplete="off" />
            </label>
          </div>

          <label className="st-block">
            <span>Logistic Provider ID</span>
            <input type="text" value={jt.logisticproviderid}
              onChange={(e) => setJt((p) => ({ ...p, logisticproviderid: e.target.value }))}
              placeholder="JNT" />
          </label>

          {balance !== null && (
            <div className="st-info">
              <i className="fas fa-wallet"></i>
              Số dư J&T (mock): <strong>{balance.toLocaleString("vi-VN")}đ</strong>
            </div>
          )}

          <h3 className="st-subtitle"><i className="fas fa-store"></i> Thông tin shop gửi (sender)</h3>

          <div className="st-row">
            <label>
              <span>Tên shop</span>
              <input type="text" value={jt.sender.name}
                onChange={(e) => updateJtSender("name", e.target.value)} placeholder="TECHTRA" />
            </label>
            <label>
              <span>Số điện thoại</span>
              <input type="text" value={jt.sender.phone}
                onChange={(e) => {
                  updateJtSender("phone", e.target.value);
                  updateJtSender("mobile", e.target.value);
                }} placeholder="0901234567" />
            </label>
          </div>

          <label className="st-block">
            <span>Địa chỉ</span>
            <input type="text" value={jt.sender.address}
              onChange={(e) => updateJtSender("address", e.target.value)}
              placeholder="Số 1, đường ABC, Quận 1" />
          </label>

          <div className="st-row st-row-3">
            <label>
              <span>Tỉnh/Thành phố (prov)</span>
              <input type="text" value={jt.sender.prov}
                onChange={(e) => updateJtSender("prov", e.target.value)} placeholder="Hồ Chí Minh" />
            </label>
            <label>
              <span>Quận/Huyện (city)</span>
              <input type="text" value={jt.sender.city}
                onChange={(e) => updateJtSender("city", e.target.value)} placeholder="Quận 1" />
            </label>
            <label>
              <span>Phường/Xã (area)</span>
              <input type="text" value={jt.sender.area}
                onChange={(e) => updateJtSender("area", e.target.value)} placeholder="Phường Bến Nghé" />
            </label>
          </div>
        </section>

        {/* ═══ 2. Ngân hàng ═══ */}
        <section className="st-card">
          <h2 className="st-section-title">
            <i className="fas fa-bank"></i> Tài khoản ngân hàng
          </h2>
          <p className="st-hint">
            Hiển thị cho khách khi chọn phương thức chuyển khoản ở trang thanh toán.
          </p>

          <div className="st-row st-row-3">
            <label>
              <span>Tên ngân hàng</span>
              <input type="text" value={bank.bank_name}
                onChange={(e) => setBank((p) => ({ ...p, bank_name: e.target.value }))}
                placeholder="VD: Vietcombank" autoComplete="off" />
            </label>
            <label>
              <span>Số tài khoản</span>
              <input type="text" value={bank.bank_account_number}
                onChange={(e) => setBank((p) => ({ ...p, bank_account_number: e.target.value }))}
                placeholder="VD: 0123456789" autoComplete="off" />
            </label>
            <label>
              <span>Chủ tài khoản</span>
              <input type="text" value={bank.bank_account_holder}
                onChange={(e) => setBank((p) => ({ ...p, bank_account_holder: e.target.value }))}
                placeholder="VD: NGUYEN VAN A" autoComplete="off" />
            </label>
          </div>
        </section>

        {/* ═══ 3. Zalo OA ═══ */}
        <section className="st-card">
          <h2 className="st-section-title">
            <i className="fab fa-rocketchat"></i> Zalo OA (Official Account)
          </h2>
          <p className="st-hint">
            Dùng để gửi mã xác nhận / tin nhắn qua Zalo khi đăng ký tài khoản hoặc đơn hàng.
            Lấy tại <a href="https://developers.zalo.me/" target="_blank" rel="noreferrer">developers.zalo.me</a>.
          </p>

          <div className="st-row">
            <label>
              <span>App ID</span>
              <input type="text" value={zalo.zalo_app_id}
                onChange={(e) => setZalo((p) => ({ ...p, zalo_app_id: e.target.value }))}
                placeholder="ZALO_APP_ID" autoComplete="off" />
            </label>
            <label>
              <span>Secret Key</span>
              <div className="st-password-wrap">
                <input type={showZaloSecret ? "text" : "password"} value={zalo.zalo_secret_key}
                  onChange={(e) => setZalo((p) => ({ ...p, zalo_secret_key: e.target.value }))}
                  placeholder="ZALO_SECRET_KEY" autoComplete="off" />
                <button type="button" className="st-toggle-pw" onClick={() => setShowZaloSecret((s) => !s)}>
                  <i className={`fas ${showZaloSecret ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </label>
          </div>

          <label className="st-block">
            <span>Access Token</span>
            <div className="st-password-wrap">
              <input type={showZaloToken ? "text" : "password"} value={zalo.zalo_access_token}
                onChange={(e) => setZalo((p) => ({ ...p, zalo_access_token: e.target.value }))}
                placeholder="Zalo OA access token (nếu dùng token thay về app secret flow)" autoComplete="off" />
              <button type="button" className="st-toggle-pw" onClick={() => setShowZaloToken((s) => !s)}>
                <i className={`fas ${showZaloToken ? "fa-eye-slash" : "fa-eye"}`}></i>
              </button>
            </div>
          </label>

          <div className="st-actions" style={{ marginTop: 12 }}>
            <div className="st-row" style={{ alignItems: "flex-end", gap: 8 }}>
              <label style={{ flex: 1, marginBottom: 0 }}>
                <span>Số điện thoại test</span>
                <input type="text" value={otpTestChannel === "zalo" ? otpTestTarget : ""}
                  onChange={(e) => { setOtpTestTarget(e.target.value); setOtpTestChannel("zalo"); }}
                  placeholder="09xxxxxxxx" autoComplete="off" />
              </label>
              <button type="button" className="st-btn st-btn-secondary"
                onClick={() => handleTestOtp("zalo")} disabled={otpTesting}>
                <i className="fas fa-paper-plane"></i> Test gửi Zalo
              </button>
            </div>
          </div>

          <p className="st-hint">
            Lưu vào <code>site_settings</code> với key:{" "}
            <code>zalo_app_id</code>, <code>zalo_secret_key</code>, <code>zalo_access_token</code>.
          </p>
        </section>

        {/* ═══ 4. SMTP Email ═══ */}
        <section className="st-card">
          <h2 className="st-section-title">
            <i className="fas fa-envelope"></i> SMTP — Gửi email
          </h2>
          <p className="st-hint">
            Cấu hình máy chủ SMTP để gửi email giao dịch (xác nhận đơn, đặt lại mật khẩu, ...).
            Với Gmail: bật 2FA + tạo <strong>App Password</strong>{" "}
            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">tại đây</a>.
          </p>

          <div className="st-row">
            <label>
              <span>Host</span>
              <input type="text" value={smtp.smtp_host}
                onChange={(e) => setSmtp((p) => ({ ...p, smtp_host: e.target.value }))}
                placeholder="smtp.gmail.com" autoComplete="off" />
            </label>
            <label>
              <span>Port</span>
              <input type="number" value={smtp.smtp_port}
                onChange={(e) => setSmtp((p) => ({ ...p, smtp_port: e.target.value }))}
                placeholder="587" min="1" max="65535" autoComplete="off" />
            </label>
          </div>

          <div className="st-row">
            <label>
              <span>User (username)</span>
              <input type="text" value={smtp.smtp_user}
                onChange={(e) => setSmtp((p) => ({ ...p, smtp_user: e.target.value }))}
                placeholder="VD: no-reply@techtra.vn" autoComplete="off" />
            </label>
            <label>
              <span>Password / App Password</span>
              <div className="st-password-wrap">
                <input type={showSmtpPass ? "text" : "password"} value={smtp.smtp_pass}
                  onChange={(e) => setSmtp((p) => ({ ...p, smtp_pass: e.target.value }))}
                  placeholder="••••••••••" autoComplete="off" />
                <button type="button" className="st-toggle-pw" onClick={() => setShowSmtpPass((s) => !s)}>
                  <i className={`fas ${showSmtpPass ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </label>
          </div>

          <div className="st-row">
            <label>
              <span>From Email (hiển thị)</span>
              <input type="email" value={smtp.smtp_from_email}
                onChange={(e) => setSmtp((p) => ({ ...p, smtp_from_email: e.target.value }))}
                placeholder="no-reply@techtra.vn" autoComplete="off" />
            </label>
            <label>
              <span>From Name</span>
              <input type="text" value={smtp.smtp_from_name}
                onChange={(e) => setSmtp((p) => ({ ...p, smtp_from_name: e.target.value }))}
                placeholder="Techtra Shop" autoComplete="off" />
            </label>
          </div>

          <div className="st-actions" style={{ marginTop: 12 }}>
            <div className="st-row" style={{ alignItems: "flex-end", gap: 8 }}>
              <label style={{ flex: 1, marginBottom: 0 }}>
                <span>Email test</span>
                <input type="email" value={otpTestChannel === "email" ? otpTestTarget : ""}
                  onChange={(e) => { setOtpTestTarget(e.target.value); setOtpTestChannel("email"); }}
                  placeholder="you@example.com" autoComplete="off" />
              </label>
              <button type="button" className="st-btn st-btn-secondary"
                onClick={handleTestSmtp} disabled={otpTesting}>
                <i className="fas fa-paper-plane"></i> Test gửi email
              </button>
            </div>
          </div>

          <p className="st-hint">
            Lưu vào <code>site_settings</code> với key:{" "}
            <code>smtp_host</code>, <code>smtp_port</code>, <code>smtp_user</code>,{" "}
            <code>smtp_pass</code>, <code>smtp_from_email</code>, <code>smtp_from_name</code>.
          </p>
        </section>

        {/* ═══ 5. VNPay ═══ */}
        <section className="st-card">
          <h2 className="st-section-title">
            <i className="fas fa-credit-card"></i> VNPay — Thanh toán online
          </h2>
          <p className="st-hint">
            Cấu hình tích hợp VNPay Sandbox. Lấy <strong>vnp_TmnCode</strong> và <strong>vnp_HashSecret</strong> từ
            tài khoản VNPay merchant.
          </p>

          <div className="st-row">
            <label>
              <span>vnp_TmnCode</span>
              <input type="text" value={vnpay.vnp_TmnCode}
                onChange={(e) => setVnpay((p) => ({ ...p, vnp_TmnCode: e.target.value }))}
                placeholder="VD: ABC12345" autoComplete="off" />
            </label>
            <label>
              <span>vnp_Url</span>
              <input type="text" value={vnpay.vnp_Url}
                onChange={(e) => setVnpay((p) => ({ ...p, vnp_Url: e.target.value }))}
                placeholder="https://sandbox.vnpayment.vn/paymentv2/vpcpay.html" autoComplete="off" />
            </label>
          </div>

          <div className="st-row">
            <label>
              <span>vnp_HashSecret</span>
              <div className="st-password-wrap">
                <input type={showVnpayHashSecret ? "text" : "password"} value={vnpay.vnp_HashSecret}
                  onChange={(e) => setVnpay((p) => ({ ...p, vnp_HashSecret: e.target.value }))}
                  placeholder="••••••••••" autoComplete="off" />
                <button type="button" className="st-toggle-pw" onClick={() => setShowVnpayHashSecret((s) => !s)}>
                  <i className={`fas ${showVnpayHashSecret ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </label>
          </div>

          <p className="st-hint">
            Lưu vào <code>site_settings</code> với key:{" "}
            <code>vnp_TmnCode</code>, <code>vnp_HashSecret</code>, <code>vnp_Url</code>.
          </p>
        </section>

        {/* ═══ Actions ═══ */}
        <div className="st-actions">
          <button type="button" className="st-btn st-btn-ghost"
            onClick={handleFeeDemo} disabled={feeDemo}>
            <i className="fas fa-calculator"></i>
            {feeDemo ? "Đang tính…" : "Tính phí mẫu (mock)"}
          </button>

          <button type="button" className="st-btn st-btn-secondary"
            onClick={handleTestConnection}
            disabled={testing || !jt.key || !jt.customerid}
            title="Lưu ý: hiện dùng hàm mock jtGetBalance(), chưa xác minh key thật">
            <i className="fas fa-plug"></i>
            {testing ? "Đang test…" : "Test kết nối J&T (mock)"}
          </button>

          <button type="submit" className="st-btn st-btn-primary" disabled={saving}>
            <i className="fas fa-save"></i>
            {saving ? "Đang lưu…" : "Lưu cấu hình"}
          </button>
        </div>
      </form>

      <div className="st-footnote">
        <i className="fas fa-info-circle"></i>
        Tất cả cấu hình được lưu vào <code>site_settings</code> (RLS dev-only cho phép anon write).
        Production cần siết policy + chuyển secret sang Edge Function / Secrets manager.
      </div>
    </div>
  );
}