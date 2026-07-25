// // =====================================================================
// // Settings.jsx — Trang Cấu hình hệ thống
// // Hiện tại gồm: cấu hình J&T Express (apiAccount, apiKey, customerCode, sender)
// //
// // Lưu trong bảng site_settings (key='jt_config', value_json=JSON toàn bộ config)
// //
// // Tính năng:
// //   - Form nhập: API credentials + thông tin shop gửi
// //   - Nút "Lưu cấu hình" → upsert vào site_settings
// //   - Nút "Test kết nối" → gọi jtGetBalance() để verify key
// //   - Nút "Tính phí mẫu" → demo jtCalculatePriceMock
// // =====================================================================

// import React, { useState, useEffect } from "react";
// import "./Settings.css";
// import { supabase } from "../../api";
// import {
//   jtCreateOrder,
//   jtCancelOrder,
//   jtTraceOrder,
//   jtCalculatePrice,
//   jtCalculatePriceMock,   // ← thiếu
//   jtGetBalance,           // ← thiếu, đây là nguyên nhân chính gây lỗi
//   setJTConfig,
//   JT_PRODUCT_TYPE,        // ← thay cho JT_SERVICE
// } from "../../jstService";

// const DEFAULT_SENDER = {
//   name:    "TECHTRA",
//   phone:   "0901234567",
//   address: "Số 1, đường ABC, Quận 1",
//   city:    "Hồ Chí Minh",
//   province:"HCM",
//   area:    "VN",
// };

// const DEFAULT_CONFIG = {
//   apiAccount:   "",
//   apiKey:       "",
//   customerCode: "",
//   baseUrl:      "https://openapi.jtexpress.vn/api",
//   sender:       DEFAULT_SENDER,
// };

// const SETTINGS_KEY = "jt_config";

// export default function Settings() {
//   const [form, setForm] = useState(DEFAULT_CONFIG);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving]   = useState(false);
//   const [testing, setTesting] = useState(false);
//   const [feeDemo, setFeeDemo] = useState(false);
//   const [message, setMessage] = useState({ type: "", text: "" });
//   const [showApiKey, setShowApiKey] = useState(false);
//   const [balance, setBalance] = useState(null);

//   // ─── Load config từ site_settings ────────────────────────────────
//   useEffect(() => {
//     (async () => {
//       setLoading(true);
//       try {
//         const { data, error } = await supabase
//           .from("site_settings")
//           .select("value_json")
//           .eq("key", SETTINGS_KEY)
//           .maybeSingle();
//         if (error) throw error;
//         if (data?.value_json) {
//           // Merge để field mới tự động có default
//           const merged = {
//             ...DEFAULT_CONFIG,
//             ...data.value_json,
//             sender: { ...DEFAULT_SENDER, ...(data.value_json.sender || {}) },
//           };
//           setForm(merged);
//           setJTConfig(merged);
//         }
//       } catch (err) {
//         console.error(err);
//         setMessage({ type: "error", text: "Không tải được cấu hình: " + err.message });
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, []);

//   // ─── Handlers ────────────────────────────────────────────────────
//   const updateField = (field, value) => {
//     setForm((p) => ({ ...p, [field]: value }));
//   };

//   const updateSender = (field, value) => {
//     setForm((p) => ({ ...p, sender: { ...p.sender, [field]: value } }));
//   };

//   const handleSave = async (e) => {
//     e?.preventDefault();
//     setSaving(true);
//     setMessage({ type: "", text: "" });
//     try {
//       // Validate tối thiểu
//       if (!form.apiAccount || !form.apiKey || !form.customerCode) {
//         throw new Error("Vui lòng nhập apiAccount, apiKey và customerCode.");
//       }

//       // Lưu vào site_settings (upsert)
//       const { error } = await supabase
//         .from("site_settings")
//         .upsert(
//           {
//             key: SETTINGS_KEY,
//             value_json: form,
//             description: "Cấu hình J&T Express — lưu bởi trang Settings admin",
//             updated_at: new Date().toISOString(),
//           },
//           { onConflict: "key" }
//         );
//       if (error) throw error;

//       // Apply ngay vào runtime
//       setJTConfig(form);
//       setMessage({ type: "success", text: "✅ Đã lưu cấu hình J&T thành công." });
//     } catch (err) {
//       setMessage({ type: "error", text: "❌ " + err.message });
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handleTestConnection = async () => {
//     setTesting(true);
//     setMessage({ type: "", text: "" });
//     setBalance(null);
//     try {
//       setJTConfig(form);
//       const res = await jtGetBalance({ customerCode: form.customerCode });
//       setBalance(res.balance);
//       setMessage({
//         type: "success",
//         text: `✅ Kết nối thành công! Số dư: ${(res.balance || 0).toLocaleString("vi-VN")}đ`,
//       });
//     } catch (err) {
//       setMessage({ type: "error", text: "❌ Test thất bại: " + err.message });
//     } finally {
//       setTesting(false);
//     }
//   };

//   const handleFeeDemo = async () => {
//     setFeeDemo(true);
//     setMessage({ type: "", text: "" });
//     try {
//       // const res = await jtCalculatePriceMock({
//       //   weight: 500,
//       //   serviceCode: JT_SERVICE.EZ,
//       //   isBulky: false,
//       // });
//       const res = await jtCalculatePriceMock({
//           weight: 500,
//           serviceCode: JT_PRODUCT_TYPE.EZ,   // trước là JT_SERVICE.EZ — không tồn tại
//           isBulky: false,
//         });
//       setMessage({
//         type: "success",
//         text: `💰 Phí mẫu (EZ, 500g, không cồng kềnh): ${(res.fee || 0).toLocaleString("vi-VN")}đ ${res.mock ? "(mock)" : ""}`,
//       });
//     } catch (err) {
//       setMessage({ type: "error", text: "❌ " + err.message });
//     } finally {
//       setFeeDemo(false);
//     }
//   };

//   // ─── Render ──────────────────────────────────────────────────────
//   if (loading) {
//     return (
//       <div className="st-wrapper">
//         <div className="st-loading">⌛ Đang tải cấu hình…</div>
//       </div>
//     );
//   }

//   return (
//     <div className="st-wrapper">
//       <div className="st-header">
//         <h1>⚙️ Cấu hình hệ thống</h1>
//         <p>Quản lý tích hợp J&T Express và các dịch vụ vận chuyển khác.</p>
//       </div>

//       {message.text && (
//         <div className={`st-message st-message-${message.type}`}>
//           {message.text}
//         </div>
//       )}

//       <form className="st-form" onSubmit={handleSave}>
//         {/* ─── Section 1: API Credentials ─────────────────────────── */}
//         <section className="st-card">
//           <h2 className="st-section-title">
//             <i className="fas fa-key"></i> Thông tin API J&T Express
//           </h2>
//           <p className="st-hint">
//             Đăng ký tài khoản developer tại{" "}
//             <a href="https://open.jtexpress.vn" target="_blank" rel="noreferrer">
//               open.jtexpress.vn
//             </a>{" "}
//             để lấy 3 thông số này.
//           </p>

//           <div className="st-row">
//             <label>
//               <span>API Account <em>*</em></span>
//               <input
//                 type="text"
//                 value={form.apiAccount}
//                 onChange={(e) => updateField("apiAccount", e.target.value)}
//                 placeholder="VD: TECHTRA001"
//                 autoComplete="off"
//               />
//             </label>
//             <label>
//               <span>API Key <em>*</em></span>
//               <div className="st-password-wrap">
//                 <input
//                   type={showApiKey ? "text" : "password"}
//                   value={form.apiKey}
//                   onChange={(e) => updateField("apiKey", e.target.value)}
//                   placeholder="Nhập API key từ J&T"
//                   autoComplete="off"
//                 />
//                 <button
//                   type="button"
//                   className="st-toggle-pw"
//                   onClick={() => setShowApiKey((s) => !s)}
//                   title={showApiKey ? "Ẩn" : "Hiện"}
//                 >
//                   <i className={`fas ${showApiKey ? "fa-eye-slash" : "fa-eye"}`}></i>
//                 </button>
//               </div>
//             </label>
//           </div>

//           <div className="st-row">
//             <label>
//               <span>Customer Code <em>*</em></span>
//               <input
//                 type="text"
//                 value={form.customerCode}
//                 onChange={(e) => updateField("customerCode", e.target.value)}
//                 placeholder="Mã khách hàng J&T cấp khi ký hợp đồng"
//                 autoComplete="off"
//               />
//             </label>
//             <label>
//               <span>Base URL</span>
//               <input
//                 type="text"
//                 value={form.baseUrl}
//                 onChange={(e) => updateField("baseUrl", e.target.value)}
//                 placeholder="https://openapi.jtexpress.vn/api"
//                 autoComplete="off"
//               />
//             </label>
//           </div>

//           {balance !== null && (
//             <div className="st-info">
//               <i className="fas fa-wallet"></i>
//               Số dư tài khoản J&T: <strong>{balance.toLocaleString("vi-VN")}đ</strong>
//             </div>
//           )}
//         </section>

//         {/* ─── Section 2: Sender info ─────────────────────────────── */}
//         <section className="st-card">
//           <h2 className="st-section-title">
//             <i className="fas fa-store"></i> Thông tin shop gửi (sender)
//           </h2>
//           <p className="st-hint">
//             Thông tin này sẽ tự động điền khi tạo vận đơn J&T (có thể ghi đè từng đơn).
//           </p>

//           <div className="st-row">
//             <label>
//               <span>Tên shop</span>
//               <input
//                 type="text"
//                 value={form.sender.name}
//                 onChange={(e) => updateSender("name", e.target.value)}
//                 placeholder="TECHTRA"
//               />
//             </label>
//             <label>
//               <span>Số điện thoại</span>
//               <input
//                 type="text"
//                 value={form.sender.phone}
//                 onChange={(e) => updateSender("phone", e.target.value)}
//                 placeholder="0901234567"
//               />
//             </label>
//           </div>

//           <label className="st-block">
//             <span>Địa chỉ</span>
//             <input
//               type="text"
//               value={form.sender.address}
//               onChange={(e) => updateSender("address", e.target.value)}
//               placeholder="Số 1, đường ABC, Quận 1"
//             />
//           </label>

//           <div className="st-row st-row-3">
//             <label>
//               <span>Tỉnh/Thành phố</span>
//               <input
//                 type="text"
//                 value={form.sender.city}
//                 onChange={(e) => updateSender("city", e.target.value)}
//                 placeholder="Hồ Chí Minh"
//               />
//             </label>
//             <label>
//               <span>Mã tỉnh (province)</span>
//               <input
//                 type="text"
//                 value={form.sender.province}
//                 onChange={(e) => updateSender("province", e.target.value)}
//                 placeholder="HCM"
//               />
//             </label>
//             <label>
//               <span>Khu vực</span>
//               <input
//                 type="text"
//                 value={form.sender.area}
//                 onChange={(e) => updateSender("area", e.target.value)}
//                 placeholder="VN"
//               />
//             </label>
//           </div>
//         </section>

//         {/* ─── Actions ────────────────────────────────────────────── */}
//         <div className="st-actions">
//           <button
//             type="button"
//             className="st-btn st-btn-ghost"
//             onClick={handleFeeDemo}
//             disabled={feeDemo}
//           >
//             <i className="fas fa-calculator"></i>
//             {feeDemo ? "Đang tính…" : "Tính phí mẫu (mock)"}
//           </button>

//           <button
//             type="button"
//             className="st-btn st-btn-secondary"
//             onClick={handleTestConnection}
//             disabled={testing || !form.apiKey || !form.customerCode}
//             title="Test bằng cách gọi jtGetBalance"
//           >
//             <i className="fas fa-plug"></i>
//             {testing ? "Đang test…" : "Test kết nối"}
//           </button>

//           <button
//             type="submit"
//             className="st-btn st-btn-primary"
//             disabled={saving}
//           >
//             <i className="fas fa-save"></i>
//             {saving ? "Đang lưu…" : "Lưu cấu hình"}
//           </button>
//         </div>
//       </form>

//       {/* ─── Note ────────────────────────────────────────────────── */}
//       <div className="st-footnote">
//         <i className="fas fa-info-circle"></i>
//         Sau khi lưu, các trang <strong>Tất cả đơn hàng / Đơn hàng nháp / Chưa hoàn tất</strong> sẽ
//         có thêm nút <strong>"Tạo vận đơn J&T"</strong> trong từng đơn và trong thanh bulk action.
//       </div>
//     </div>
//   );
// }


// =====================================================================
// Settings.jsx — Trang Cấu hình hệ thống
// Hiện tại gồm: cấu hình J&T Express (eccompanyid, customerid, key, sender)
//
// Lưu trong bảng site_settings (key='jt_config', value_json=JSON toàn bộ config)
//
// Tính năng:
//   - Form nhập: API credentials (eccompanyid/customerid/key) + thông tin shop gửi
//   - Nút "Lưu cấu hình" → upsert vào site_settings
//   - Nút "Tính phí mẫu" → demo jtCalculatePriceMock
//   - Nút "Test kết nối" → tạm ẩn vì jtGetBalance() hiện là MOCK (J&T chưa
//     công bố API tra số dư công khai) — xem ghi chú trong jstService.js
// =====================================================================

import React, { useState, useEffect } from "react";
import "./Settings.css";
import { supabase } from "../../api";
import {
  jtCalculatePriceMock,
  jtGetBalance,
  setJTConfig,
  JT_PRODUCT_TYPE,
} from "../../jstService";

const DEFAULT_SENDER = {
  name: "TECHTRA",
  phone: "0901234567",
  mobile: "0901234567",
  address: "Số 1, đường ABC, Quận 1",
  prov: "Hồ Chí Minh",
  city: "",
  area: "",
};

const DEFAULT_CONFIG = {
  eccompanyid: "",
  customerid: "",
  key: "",
  logisticproviderid: "JNT",
  baseUrl: "http://47.57.106.86/yuenan-interface-web",
  sender: DEFAULT_SENDER,
};

const SETTINGS_KEY = "jt_config";

export default function Settings() {
  const [form, setForm] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feeDemo, setFeeDemo] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showKey, setShowKey] = useState(false);
  const [balance, setBalance] = useState(null);

  // ─── Load config từ site_settings ────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("value_json")
          .eq("key", SETTINGS_KEY)
          .maybeSingle();
        if (error) throw error;
        if (data?.value_json) {
          // Merge để field mới tự động có default
          const merged = {
            ...DEFAULT_CONFIG,
            ...data.value_json,
            sender: { ...DEFAULT_SENDER, ...(data.value_json.sender || {}) },
          };
          setForm(merged);
          setJTConfig(merged);
        }
      } catch (err) {
        console.error(err);
        setMessage({ type: "error", text: "Không tải được cấu hình: " + err.message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────
  const updateField = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
  };

  const updateSender = (field, value) => {
    setForm((p) => ({ ...p, sender: { ...p.sender, [field]: value } }));
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      // Validate tối thiểu — đúng 3 field bắt buộc theo jstService.js
      if (!form.eccompanyid || !form.customerid || !form.key) {
        throw new Error("Vui lòng nhập eccompanyid, customerid và key.");
      }

      // Lưu vào site_settings (upsert)
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          {
            key: SETTINGS_KEY,
            value_json: form,
            description: "Cấu hình J&T Express — lưu bởi trang Settings admin",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
      if (error) throw error;

      // Apply ngay vào runtime
      setJTConfig(form);
      setMessage({ type: "success", text: "✅ Đã lưu cấu hình J&T thành công." });
    } catch (err) {
      setMessage({ type: "error", text: "❌ " + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage({ type: "", text: "" });
    setBalance(null);
    try {
      setJTConfig(form);
      // Lưu ý: jtGetBalance() hiện là hàm MOCK — J&T VN chưa công bố API
      // tra số dư công khai, nên nút này KHÔNG thực sự xác minh key đúng/sai.
      const res = await jtGetBalance();
      setBalance(res.balance);
      setMessage({
        type: "info",
        text: res.mock
          ? "ℹ️ J&T chưa cung cấp API tra số dư công khai — đây là kết quả mock, chưa xác minh được key thật. Hãy thử tạo 1 vận đơn thật để kiểm tra kết nối."
          : `✅ Kết nối thành công! Số dư: ${(res.balance || 0).toLocaleString("vi-VN")}đ`,
      });
    } catch (err) {
      setMessage({ type: "error", text: "❌ Test thất bại: " + err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleFeeDemo = async () => {
    setFeeDemo(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await jtCalculatePriceMock({
        weight: 0.5, // kg — hàm mock tính theo kg, không phải gram
        isBulky: false,
      });
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
        <p>Quản lý tích hợp J&T Express và các dịch vụ vận chuyển khác.</p>
      </div>

      {message.text && (
        <div className={`st-message st-message-${message.type}`}>
          {message.text}
        </div>
      )}

      <form className="st-form" onSubmit={handleSave}>
        {/* ─── Section 1: API Credentials ─────────────────────────── */}
        <section className="st-card">
          <h2 className="st-section-title">
            <i className="fas fa-key"></i> Thông tin API J&T Express
          </h2>
          <p className="st-hint">
            Liên hệ account rep của J&T (theo{" "}
            <a href="https://api-docs.jtexpress.vn/" target="_blank" rel="noreferrer">
              api-docs.jtexpress.vn
            </a>
            ) để lấy 3 thông số dưới đây và URL production khi test xong.
          </p>

          <div className="st-row">
            <label>
              <span>Eccompanyid <em>*</em></span>
              <input
                type="text"
                value={form.eccompanyid}
                onChange={(e) => updateField("eccompanyid", e.target.value)}
                placeholder="Tên nguồn khách, VD: CUSMODEL"
                autoComplete="off"
              />
            </label>
            <label>
              <span>Customerid <em>*</em></span>
              <input
                type="text"
                value={form.customerid}
                onChange={(e) => updateField("customerid", e.target.value)}
                placeholder="Mã khách hàng J&T cấp, VD: 084LC012345"
                autoComplete="off"
              />
            </label>
          </div>

          <div className="st-row">
            <label>
              <span>Key <em>*</em></span>
              <div className="st-password-wrap">
                <input
                  type={showKey ? "text" : "password"}
                  value={form.key}
                  onChange={(e) => updateField("key", e.target.value)}
                  placeholder="Key dùng để tạo data_digest (MD5+Base64)"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="st-toggle-pw"
                  onClick={() => setShowKey((s) => !s)}
                  title={showKey ? "Ẩn" : "Hiện"}
                >
                  <i className={`fas ${showKey ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </label>
            <label>
              <span>Base URL</span>
              <input
                type="text"
                value={form.baseUrl}
                onChange={(e) => updateField("baseUrl", e.target.value)}
                placeholder="http://47.57.106.86/yuenan-interface-web (test)"
                autoComplete="off"
              />
            </label>
          </div>

          <label className="st-block">
            <span>Logistic Provider ID</span>
            <input
              type="text"
              value={form.logisticproviderid}
              onChange={(e) => updateField("logisticproviderid", e.target.value)}
              placeholder="JNT"
            />
          </label>

          {balance !== null && (
            <div className="st-info">
              <i className="fas fa-wallet"></i>
              Số dư tài khoản J&T (mock): <strong>{balance.toLocaleString("vi-VN")}đ</strong>
            </div>
          )}
        </section>

        {/* ─── Section 2: Sender info ─────────────────────────────── */}
        <section className="st-card">
          <h2 className="st-section-title">
            <i className="fas fa-store"></i> Thông tin shop gửi (sender)
          </h2>
          <p className="st-hint">
            Thông tin này sẽ tự động điền khi tạo vận đơn J&T (có thể ghi đè từng đơn).
          </p>

          <div className="st-row">
            <label>
              <span>Tên shop</span>
              <input
                type="text"
                value={form.sender.name}
                onChange={(e) => updateSender("name", e.target.value)}
                placeholder="TECHTRA"
              />
            </label>
            <label>
              <span>Số điện thoại</span>
              <input
                type="text"
                value={form.sender.phone}
                onChange={(e) => {
                  updateSender("phone", e.target.value);
                  updateSender("mobile", e.target.value);
                }}
                placeholder="0901234567"
              />
            </label>
          </div>

          <label className="st-block">
            <span>Địa chỉ</span>
            <input
              type="text"
              value={form.sender.address}
              onChange={(e) => updateSender("address", e.target.value)}
              placeholder="Số 1, đường ABC, Quận 1"
            />
          </label>

          <div className="st-row st-row-3">
            <label>
              <span>Tỉnh/Thành phố (prov)</span>
              <input
                type="text"
                value={form.sender.prov}
                onChange={(e) => updateSender("prov", e.target.value)}
                placeholder="Hồ Chí Minh"
              />
            </label>
            <label>
              <span>Quận/Huyện (city)</span>
              <input
                type="text"
                value={form.sender.city}
                onChange={(e) => updateSender("city", e.target.value)}
                placeholder="VD: Quận 1"
              />
            </label>
            <label>
              <span>Phường/Xã (area)</span>
              <input
                type="text"
                value={form.sender.area}
                onChange={(e) => updateSender("area", e.target.value)}
                placeholder="VD: Phường Bến Nghé"
              />
            </label>
          </div>
          <p className="st-hint">
            Lưu ý: J&T yêu cầu <strong>ID vùng</strong> (không phải tên) khi gọi API tính phí
            (<code>jtCalculatePrice</code>). Các ô trên chỉ dùng để hiển thị/điền vào vận đơn —
            cần map sang ID vùng riêng khi tích hợp tính phí thật.
          </p>
        </section>

        {/* ─── Actions ────────────────────────────────────────────── */}
        <div className="st-actions">
          <button
            type="button"
            className="st-btn st-btn-ghost"
            onClick={handleFeeDemo}
            disabled={feeDemo}
          >
            <i className="fas fa-calculator"></i>
            {feeDemo ? "Đang tính…" : "Tính phí mẫu (mock)"}
          </button>

          <button
            type="button"
            className="st-btn st-btn-secondary"
            onClick={handleTestConnection}
            disabled={testing || !form.key || !form.customerid}
            title="Lưu ý: hiện dùng hàm mock jtGetBalance(), chưa xác minh key thật"
          >
            <i className="fas fa-plug"></i>
            {testing ? "Đang test…" : "Test kết nối (mock)"}
          </button>

          <button
            type="submit"
            className="st-btn st-btn-primary"
            disabled={saving}
          >
            <i className="fas fa-save"></i>
            {saving ? "Đang lưu…" : "Lưu cấu hình"}
          </button>
        </div>
      </form>

      {/* ─── Note ────────────────────────────────────────────────── */}
      <div className="st-footnote">
        <i className="fas fa-info-circle"></i>
        Sau khi lưu, các trang <strong>Tất cả đơn hàng / Đơn hàng nháp / Chưa hoàn tất</strong> sẽ
        có thêm nút <strong>"Tạo vận đơn J&T"</strong> trong từng đơn và trong thanh bulk action.
      </div>
    </div>
  );
}